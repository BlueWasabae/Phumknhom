import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type DifficultyMode,
  type PlayerState,
} from '@shared/types';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  getKhmerWorldOrDefault,
  type KhmerWorldDef,
  type KhmerWorldId,
  type WorldGatewayDef,
} from '@shared/khmerWorlds';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';
import { SeasonAtmosphereOverlay } from '../systems/SeasonClock';
import type { TravelRequestPayload } from '../systems/TravelAndPylons';

const MAP_W = 960;
const MAP_H = 672;
const HORIZON_H = 82;

interface InteractZone {
  x: number;
  y: number;
  radius: number;
  label: string;
  isGateway?: boolean;
  onInteract: () => void;
}

export interface KhmerWorldSceneData {
  worldId: KhmerWorldId;
  playerState?: PlayerState;
  spawnX?: number;
  spawnY?: number;
  goldenFlash?: boolean;
}

/**
 * Playable 2.5D Khmer Cultural World Explorer Scene:
 * Hosts Srok Battambang (Bamboo Railway), Nokor Angkor Thom (Ta Prohm Ruins),
 * Tonlé Sap Kampong Phluk (Floating Village), Chhner Kampot (Pepper Coast),
 * and Phnom Kulen (Sacred Waterfall & 1,000 Lingas) — all connected via physical
 * walk-through Wooden Fence Doors, Angkor Stone Archways, Bamboo Railways & Piers!
 */
export class KhmerWorldScene extends Phaser.Scene {
  private worldDef!: KhmerWorldDef;
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private promptText!: Phaser.GameObjects.Text;
  private atmosphere?: SeasonAtmosphereOverlay;
  private glowLights: Phaser.GameObjects.Image[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private interactZones: InteractZone[] = [];
  private gateways: WorldGatewayDef[] = [];
  private spawnX = 480;
  private spawnY = 380;
  private arrivalGoldenFlash = false;
  private transitioning = false;
  private gateLockUntil = 0;
  private norryActive = false;
  private norryTimer?: Phaser.Time.TimerEvent;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('KhmerWorldScene');
  }

  init(data?: KhmerWorldSceneData): void {
    this.worldDef = getKhmerWorldOrDefault(data?.worldId ?? 'battambang_norry');
    const rawState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'khmer_world' as const,
          currentWorldId: this.worldDef.id,
          activeBiome: this.worldDef.biomeAttunement,
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
        }
      : {
          ...INITIAL_PLAYER_STATE,
          zone: 'khmer_world' as const,
          currentWorldId: this.worldDef.id,
          activeBiome: this.worldDef.biomeAttunement,
          weapon: { ...INITIAL_PLAYER_STATE.weapon },
          loadout: { ...INITIAL_PLAYER_STATE.loadout },
        };
    if (rawState.loadout.pet) {
      const ownsPet = rawState.inventory.some(
        (i) => i.itemId === rawState.loadout.pet && i.quantity > 0
      );
      if (!ownsPet || rawState.loadout.pet === 'mini_naga') {
        rawState.loadout.pet = null;
      }
    }
    this.initialState = rawState;
    this.spawnX = typeof data?.spawnX === 'number' ? data.spawnX : 480;
    this.spawnY = typeof data?.spawnY === 'number' ? data.spawnY : 380;
    this.arrivalGoldenFlash = Boolean(data?.goldenFlash);
    this.interactZones = [];
    this.gateways = [...this.worldDef.gateways];
    this.transitioning = false;
    this.norryActive = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(18, HORIZON_H, MAP_W - 36, MAP_H - HORIZON_H - 14);
    this.glowLights = [];
    this.colliders = this.physics.add.staticGroup();
    soundManager.playBgm('village');

    // 1. Cohesive 16-bit Pixel-Art Ground, Roads, Waterfalls, Lake Boardwalks & Railways
    this.buildBiomeGroundAndAtmosphere();

    // 2. Cohesive 16-bit Perimeter Treeline & Fence Canopy (NO mismatched legacy forest strip!)
    this.buildCohesiveTreelineBorder();

    // 3. Physical Walk-Through World Gateways (Fence Doors, Stone Archways, Bamboo Railway, Piers)
    this.buildPhysicalGateways();

    // 4. Cultural Landmarks & Interactive Activities
    this.buildCulturalLandmarks();

    // 5. Animated Battambang Norry Bamboo Train (if in Srok Battambang)
    if (this.worldDef.hasBambooTrain) {
      this.time.delayedCall(1800, () => {
        if (this.scene.isActive('KhmerWorldScene')) this.spawnNorryBambooTrain();
      });
      this.norryTimer = this.time.addEvent({
        delay: 16000,
        loop: true,
        callback: () => {
          if (this.scene.isActive('KhmerWorldScene')) this.spawnNorryBambooTrain();
        },
      });
    }

    // 6. 4-Season Atmosphere & Night Lights
    this.atmosphere = new SeasonAtmosphereOverlay(this, MAP_W, MAP_H);
    this.glowLights.forEach((g) => this.atmosphere?.registerGlowLight(g));

    // 7. 10-Layer Human Chibi Player
    this.player = new Player(this, this.spawnX, this.spawnY, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);
    this.gateLockUntil = this.time.now + 950;

    // 8. World Banner Prompt & Interaction Tooltip
    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: { x: 10, y: 5 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(2600)
      .setVisible(false);

    // 9. Camera Zoom & Follow
    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    if (this.arrivalGoldenFlash) {
      this.cameras.main.flash(260, 250, 204, 21);
      soundManager.playSfx('magic');
    } else {
      this.cameras.main.fadeIn(220, 10, 14, 24);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E', false) as Record<
      'W' | 'A' | 'S' | 'D' | 'E',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.clearCaptures();

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('player:chat', ({ text }) => {
        this.player.showSpeechBubble(text, 4500);
      }),
      EventBus.on('player:emote', ({ emoji }) => {
        this.player.showEmote(emoji, 3000);
      }),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, {
          ...playerState,
          zone: 'khmer_world',
          currentWorldId: this.worldDef.id,
        });
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState({
          ...nextState,
          zone: 'khmer_world',
          currentWorldId: this.worldDef.id,
        });
      }),
      EventBus.on('dungeon:enterRequest', ({ bossId, difficulty, partyMode, partyId }) => {
        this.enterDungeon(bossId, difficulty, partyMode ?? 'solo', partyId);
      }),
      EventBus.on('travel:execute', (req) => {
        this.handleTravelRequest(req);
      }),
      EventBus.on('input:interact', () => {
        this.tryInteractNearest();
      })
    );

    EventBus.emit('scene:ready', { zone: 'khmer_world' });
    EventBus.emit('player:state', {
      ...this.player.state,
      zone: 'khmer_world',
      currentWorldId: this.worldDef.id,
      activeBiome: this.worldDef.biomeAttunement,
    });
    EventBus.emit('ui:toast', {
      text: `${this.worldDef.icon} Entered ${this.worldDef.name} (${this.worldDef.khmerName})!`,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.norryTimer?.remove(false);
      this.norryTimer = undefined;
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.atmosphere?.destroy();
      this.atmosphere = undefined;
      this.player.destroy();
    });
  }

  private applyResponsiveZoom = (): void => {
    const w = this.scale.width;
    const zoom = w < 640 ? 2.4 : w < 1100 ? 2.65 : 2.95;
    this.cameras.main.setZoom(zoom);
  };

  private buildBiomeGroundAndAtmosphere(): void {
    const theme = this.worldDef.groundTheme;
    const groundTex =
      theme === 'rice_paddy'
        ? 'rice_paddy_tile'
        : theme === 'angkor_stone'
        ? 'sv_plaza_tile'
        : theme === 'lake_water'
        ? 'na_water_tile'
        : theme === 'coastal_sand'
        ? 'coastal_sand_tile'
        : 'sv_grass';

    this.add
      .tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, this.textures.exists(groundTex) ? groundTex : 'sv_grass')
      .setDepth(0);

    if (theme === 'lake_water') {
      // Tonlé Sap Floating Village: Animated turquoise water ripples + Elevated Timber Boardwalks!
      for (const [rx, ry] of [
        [150, 210], [810, 220], [160, 520], [815, 515], [340, 560], [630, 195],
      ]) {
        const rip = this.add.sprite(rx, ry, 'na_ripples', 0).setScale(1.4).setDepth(2).setAlpha(0.75);
        if (this.anims.exists('water_ripples_blue')) rip.play('water_ripples_blue');
      }

      // Elevated floating timber boardwalk network connecting North Pier, East Ferry Dock & Platforms
      const deckBorder = this.add.graphics().setDepth(2);
      deckBorder.fillStyle(0x451a03, 0.85);
      deckBorder.fillRoundedRect(442, 118, 76, 430, 6);
      deckBorder.fillRoundedRect(240, 336, 668, 74, 6);
      deckBorder.fillRoundedRect(220, 200, 130, 150, 8);
      deckBorder.fillRoundedRect(595, 455, 136, 98, 8);

      this.add.tileSprite(480, 333, 66, 420, 'na_boardwalk_tile').setDepth(3);
      this.add.tileSprite(574, 373, 658, 64, 'na_boardwalk_tile').setDepth(3);
      this.add.tileSprite(285, 275, 120, 140, 'na_boardwalk_tile').setDepth(3);
      this.add.tileSprite(663, 504, 126, 88, 'na_boardwalk_tile').setDepth(3);

      // Bobbing wooden Tonlé Sap longtail boats
      for (const [bx, by, flip] of [
        [145, 310, false],
        [170, 465, false],
        [795, 255, true],
        [815, 470, true],
      ] as Array<[number, number, boolean]>) {
        const boat = this.add.image(bx, by, 'na_boat').setScale(0.78).setFlipX(flip).setDepth(by);
        this.tweens.add({
          targets: boat,
          y: by + 4,
          duration: 1650 + (bx % 5) * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      return;
    }

    // Standard land roads connecting cardinal gateways
    const roadGfx = this.add.graphics().setDepth(1);
    roadGfx.fillStyle(0x7c5b3b, 0.85);
    roadGfx.fillRoundedRect(38, 344, MAP_W - 76, 56, 8);
    roadGfx.fillRoundedRect(450, 108, 60, MAP_H - 134, 8);
    roadGfx.fillRoundedRect(390, 306, 180, 128, 10);

    const pathTex = theme === 'angkor_stone' ? 'sv_path' : 'sv_path';
    this.add.tileSprite(MAP_W / 2, 372, MAP_W - 84, 48, pathTex).setDepth(2);
    this.add.tileSprite(480, 372, 52, MAP_H - 142, pathTex).setDepth(2);
    this.add.tileSprite(480, 370, 172, 120, 'sv_plaza_tile').setDepth(3);

    // Biome-specific iconic Khmer environmental set-pieces
    if (theme === 'rice_paddy') {
      // Battambang Iron & Timber Bamboo Railway Track running East-West + Branching North to Phnom Kulen!
      this.add.tileSprite(MAP_W / 2, 354, MAP_W - 60, 24, 'railway_track_h').setDepth(4);
      this.add.tileSprite(480, 232, 24, 240, 'railway_track_v').setDepth(4);
      for (const [fx, fy] of [[180, 445], [375, 455], [600, 450], [790, 285]]) {
        this.add.image(fx, fy, 'sv_flowers').setDepth(4);
      }
    } else if (theme === 'angkor_stone') {
      // Angkor Thom South Gate Causeway: Twin Carved Singha Lion Guardians & Mossy Ta Prohm Ruins!
      for (const [sx, sy] of [[422, 540], [538, 540], [422, 465], [538, 465]]) {
        this.add.image(sx, sy + 2, 'soft_shadow').setDisplaySize(34, 12).setDepth(sy - 2);
        this.add.image(sx, sy, 'na_singha_statue').setOrigin(0.5, 0.9).setScale(1.05).setDepth(sy);
      }
      for (const [rx, ry, tex] of [
        [185, 225, 'na_ruin_wall'],
        [775, 225, 'na_ruin_wall'],
        [205, 515, 'na_ruin_frog'],
        [765, 525, 'na_ruin_statue'],
        [355, 230, 'na_ruin_pillar'],
        [605, 230, 'na_ruin_pillar'],
      ] as Array<[number, number, string]>) {
        this.add.image(rx, ry, 'soft_shadow').setDisplaySize(48, 14).setDepth(ry - 2);
        this.add.image(rx, ry, tex).setOrigin(0.5, 0.9).setScale(1.15).setDepth(ry);
      }
      // Flickering Angkor courtyard braziers
      for (const [fx, fy] of [[408, 322], [552, 322], [408, 418], [552, 418]]) {
        const fire = this.add.sprite(fx, fy, 'sv_campfire_16', 0).setScale(1.1).setDepth(fy);
        if (this.anims.exists('campfire_burn')) fire.play('campfire_burn');
        const g = this.add
          .image(fx, fy - 4, 'torch_glow')
          .setScale(0.65)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(2140)
          .setAlpha(0.45);
        this.glowLights.push(g);
      }
    } else if (theme === 'coastal_sand') {
      // Kampot Pepper Coast: Lush emerald pepper-garden terraces (North) + Turquoise Kep Shoreline (South)!
      this.add.tileSprite(255, 220, 290, 150, 'sv_grass').setDepth(1);
      this.add.tileSprite(705, 220, 290, 150, 'sv_grass').setDepth(1);
      this.add.tileSprite(MAP_W / 2, 622, MAP_W, 96, 'na_water_tile').setDepth(1);
      for (const rx of [160, 320, 640, 800]) {
        const rip = this.add.sprite(rx, 614, 'na_ripples', 0).setScale(1.3).setDepth(2);
        if (this.anims.exists('water_ripples_blue')) rip.play('water_ripples_blue');
      }
      this.add.image(425, 265, 'na_coastal_stall_b').setOrigin(0.5, 0.9).setScale(1.35).setDepth(265);
      this.add.image(790, 588, 'na_boat').setScale(0.75).setFlipX(true).setDepth(588);
    } else if (theme === 'kulen_mountain') {
      // Phnom Kulen: Twin Animated Pixel-Art Waterfalls pouring into the Sacred River of 1,000 Lingas!
      this.add.tileSprite(480, 215, 280, 88, 'na_water_tile').setDepth(2);
      for (const wx of [392, 412, 548, 568]) {
        const t = this.add.sprite(wx, 128, 'na_wf_top', 0).setScale(1.35).setDepth(135);
        const m1 = this.add.sprite(wx, 150, 'na_wf_mid', 0).setScale(1.35).setDepth(135);
        const m2 = this.add.sprite(wx, 172, 'na_wf_mid', 0).setScale(1.35).setDepth(135);
        const b = this.add.sprite(wx, 194, 'na_wf_bot', 0).setScale(1.35).setDepth(136);
        if (this.anims.exists('wf_top')) t.play('wf_top');
        if (this.anims.exists('wf_mid')) {
          m1.play('wf_mid');
          m2.play('wf_mid');
        }
        if (this.anims.exists('wf_bot')) b.play('wf_bot');
      }
      // Glowing Apsara shimmer ripples in the River of 1,000 Lingas
      for (const rx of [430, 530]) {
        const sh = this.add.sprite(rx, 224, 'na_water_purple', 0).setScale(1.35).setDepth(140);
        if (this.anims.exists('shimmer_ripple')) sh.play('shimmer_ripple');
      }
      // Bamboo railway entering from south
      this.add.tileSprite(480, 520, 24, 210, 'railway_track_v').setDepth(4);
      for (const [fx, fy] of [[210, 405], [750, 445], [350, 520], [610, 520]]) {
        this.add.image(fx, fy, 'sv_blossoms').setDepth(4);
      }
    }

    // Central Campfire & Cozy Courtyard Lanterns
    const fire = this.add.sprite(480, 368, 'sv_campfire_16', 0).setScale(1.15).setDepth(368);
    if (this.anims.exists('campfire_burn')) fire.play('campfire_burn');
    const fireGlow = this.add
      .image(480, 368, 'torch_glow')
      .setScale(0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.45);
    this.glowLights.push(fireGlow);
  }

  private buildCohesiveTreelineBorder(): void {
    const isWaterWorld = this.worldDef.groundTheme === 'lake_water';
    const isCoastal = this.worldDef.groundTheme === 'coastal_sand';
    const hasNorthGate = this.gateways.some((g) => g.edge === 'north');

    // Cohesive 16-bit Top Forest Canopy using ONLY Serene Village & Ninja Adventure pixel-art trees!
    if (!isWaterWorld) {
      const topTrees = isCoastal
        ? (['na_palm_tree', 'sugar_palm_tree', 'golden_durian_tree'] as const)
        : (['sv_tree_green', 'sv_tree_teal', 'na_palm_tree', 'sugar_palm_tree'] as const);
      for (let x = 28; x <= MAP_W - 28; x += 44) {
        if (hasNorthGate && Math.abs(x - 480) < 62) continue;
        const tex = topTrees[Math.floor(x / 44) % topTrees.length];
        const y = 78 + ((x / 44) % 2) * 14;
        this.add.image(x, y, 'soft_shadow').setDisplaySize(36, 12).setDepth(y - 2);
        const tr = this.add.image(x, y, tex).setOrigin(0.5, 0.92).setScale(1.05).setDepth(y);
        this.tweens.add({
          targets: tr,
          angle: (x / 44) % 2 === 0 ? 1.8 : -1.8,
          duration: 2400 + (x % 5) * 240,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      // Perimeter framing trees on East & West corners (leaving open clearance for E/W gateways!)
      const sideSpots: Array<[number, number]> = [
        [68, 175], [72, 265], [70, 480], [95, 585],
        [890, 175], [888, 265], [890, 480], [865, 585],
      ];
      sideSpots.forEach(([tx, ty], idx) => {
        const tex = topTrees[idx % topTrees.length];
        this.add.image(tx, ty, 'soft_shadow').setDisplaySize(34, 12).setDepth(ty - 2);
        this.add.image(tx, ty, tex).setOrigin(0.5, 0.92).setScale(1.02).setDepth(ty);
      });
    }
  }

  private buildPhysicalGateways(): void {
    for (const gw of this.gateways) {
      const tex =
        gw.style === 'stone_arch'
          ? 'angkor_arch_gate'
          : gw.style === 'pier_dock'
          ? 'fishing_pier'
          : gw.style === 'bamboo_railway'
          ? 'wood_fence_gate'
          : 'wood_fence_gate';

      const scale =
        gw.style === 'stone_arch' ? 1.25 : gw.style === 'pier_dock' ? 1.18 : 1.15;

      this.add.image(gw.x, gw.y + 2, 'soft_shadow').setDisplaySize(60, 16).setDepth(gw.y - 3);
      const gateImg = this.add
        .image(gw.x, gw.y, tex)
        .setOrigin(0.5, 0.85)
        .setScale(scale)
        .setDepth(gw.y + 18)
        .setInteractive({ useHandCursor: true });

      gateImg.on('pointerdown', () => this.travelThroughGateway(gw));

      // Waving Cambodian festival flags beside every gateway!
      const flagAnim = gw.style === 'stone_arch' ? 'flag_yellow_wave' : 'flag_red_wave';
      const flagTex = gw.style === 'stone_arch' ? 'na_flag_yellow' : 'na_flag_red';
      for (const fx of [-28, 28]) {
        const fl = this.add.sprite(gw.x + fx, gw.y - 12, flagTex, 0).setScale(1.05).setDepth(gw.y + 20);
        if (this.anims.exists(flagAnim)) fl.play(flagAnim);
      }

      // Crisp directional wooden signboard
      this.add
        .text(gw.x, gw.y + 10, `${gw.signTitle}\n${gw.signKhmer}`, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          align: 'center',
          padding: { x: 7, y: 3 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(gw.y + 30);

      this.interactZones.push({
        x: gw.x,
        y: gw.y,
        radius: 48,
        label: gw.promptText,
        isGateway: true,
        onInteract: () => this.travelThroughGateway(gw),
      });
    }
  }

  private buildCulturalLandmarks(): void {
    for (const lm of this.worldDef.landmarks) {
      if (lm.shadowW && lm.shadowH) {
        this.add
          .image(lm.x, lm.y - 2, 'soft_shadow')
          .setDisplaySize(lm.shadowW, lm.shadowH)
          .setDepth(lm.y - 4);
      }

      const img = this.add
        .image(lm.x, lm.y, this.textures.exists(lm.texture) ? lm.texture : 'pylon_shrine')
        .setOrigin(0.5, 0.92)
        .setScale(lm.scale)
        .setDepth(lm.y)
        .setInteractive({ useHandCursor: true });

      if (lm.bodyW && lm.bodyH) {
        const col = this.add.rectangle(lm.x, lm.y - lm.bodyH / 2 - 2, lm.bodyW, lm.bodyH, 0x000000, 0);
        this.colliders.add(col);
      }

      this.add
        .text(lm.x, lm.y + 4, lm.label, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.86)',
          padding: { x: 7, y: 2 },
        })
        .setResolution(2)
        .setScale(0.44)
        .setOrigin(0.5, 0)
        .setDepth(lm.y + 8);

      if (typeof lm.joinArrowOffsetY === 'number') {
        const ay = lm.y + lm.joinArrowOffsetY;
        const arrow = this.add.image(lm.x, ay, 'join_arrow').setScale(0.56).setDepth(lm.y + 50);
        this.tweens.add({
          targets: arrow,
          y: ay - 6,
          duration: 560,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      const runAction = () => {
        soundManager.playSfx('click');
        if (lm.action === 'dungeon') {
          EventBus.emit('ui:openModal', { modal: 'modeSelector' });
        } else if (lm.action === 'fishing') {
          EventBus.emit('ui:openModal', { modal: 'fishing' });
        } else if (lm.action === 'snackShop') {
          EventBus.emit('ui:openModal', { modal: 'snackShop', shopTab: 'primary' });
        } else if (lm.action === 'fashionShop') {
          EventBus.emit('ui:openModal', { modal: 'fashionShop', shopTab: 'primary' });
        } else if (lm.action === 'reforge') {
          EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' });
        } else if (lm.action === 'shimmer') {
          EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'shimmer' });
        } else if (lm.action === 'pagoda') {
          EventBus.emit('ui:openModal', { modal: 'pagoda' });
        } else if (lm.action === 'market') {
          EventBus.emit('ui:openModal', { modal: 'market' });
        } else if (lm.action === 'worldMap') {
          EventBus.emit('ui:openModal', { modal: 'worldMap' });
        } else if (lm.action === 'blessing_heal') {
          soundManager.playSfx('heal');
          this.cameras.main.flash(220, 250, 204, 21);
          const nextState: PlayerState = {
            ...this.player.state,
            hp: this.player.state.maxHp,
          };
          this.player.syncPlayerState(nextState);
          EventBus.emit('player:state', nextState);
          EventBus.emit('ui:toast', {
            text: `✨ ${lm.label}: Restored to Full HP (${nextState.hp}/${nextState.maxHp})!`,
          });
        }
      };

      img.on('pointerdown', runAction);
      this.interactZones.push({
        x: lm.x,
        y: lm.y + 8,
        radius: 54,
        label: lm.prompt,
        onInteract: runAction,
      });
    }
  }

  private spawnNorryBambooTrain(): void {
    if (this.norryActive || !this.scene.isActive('KhmerWorldScene')) return;
    this.norryActive = true;

    const railY = 352;
    const stopX = 340;
    const norry = this.add
      .image(-48, railY, 'norry_bamboo_train')
      .setScale(1.05)
      .setDepth(362)
      .setInteractive({ useHandCursor: true });
    const shadow = this.add.image(-48, railY + 12, 'soft_shadow').setDisplaySize(54, 12).setDepth(358);
    const badge = this.add
      .text(stopX, railY - 30, '🚂 NORRY BAMBOO TRAIN · TAP FOR MAP', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(120, 53, 15, 0.92)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5)
      .setDepth(420)
      .setVisible(false);

    norry.on('pointerdown', () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });

    this.tweens.add({
      targets: [norry, shadow],
      x: stopX,
      duration: 2100,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (!norry.active) return;
        badge.setVisible(true);
        this.time.delayedCall(5200, () => {
          badge.destroy();
          if (!norry.active) {
            this.norryActive = false;
            return;
          }
          this.tweens.add({
            targets: [norry, shadow],
            x: MAP_W + 72,
            duration: 2600,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              norry.destroy();
              shadow.destroy();
              this.norryActive = false;
            },
          });
        });
      },
    });
  }

  private travelThroughGateway(gw: WorldGatewayDef): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('click');
    this.cameras.main.fadeOut(220, 10, 14, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const nextPayload = {
        ...this.player.state,
        weapon: { ...this.player.state.weapon },
        loadout: { ...this.player.state.loadout },
        currencies: { ...this.player.state.currencies },
        lifeStats: { ...this.player.state.lifeStats },
      };
      if (gw.targetWorldId === 'phum_chaktomuk') {
        this.scene.start('OverworldScene', {
          playerState: { ...nextPayload, zone: 'overworld', currentWorldId: 'phum_chaktomuk' },
          spawnX: gw.targetSpawnX,
          spawnY: gw.targetSpawnY,
        });
      } else {
        this.scene.start('KhmerWorldScene', {
          worldId: gw.targetWorldId,
          playerState: { ...nextPayload, zone: 'khmer_world', currentWorldId: gw.targetWorldId },
          spawnX: gw.targetSpawnX,
          spawnY: gw.targetSpawnY,
        });
      }
    });
  }

  private handleTravelRequest(req: TravelRequestPayload): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('magic');
    this.cameras.main.flash(240, 250, 204, 21);
    this.time.delayedCall(220, () => {
      const nextPayload = {
        ...this.player.state,
        weapon: { ...this.player.state.weapon },
        loadout: { ...this.player.state.loadout },
        currencies: { ...this.player.state.currencies },
        lifeStats: { ...this.player.state.lifeStats },
      };
      if (req.targetZone === 'farm') {
        this.scene.start('FarmScene', { playerState: { ...nextPayload, zone: 'farm' } });
      } else if (req.targetZone === 'club') {
        this.scene.start('ClubScene', { playerState: { ...nextPayload, zone: 'club' } });
      } else if (req.targetZone === 'dungeon') {
        this.enterDungeon(req.bossId ?? 'sdech_kongkaeb', req.difficulty ?? 'normal', 'solo');
      } else if (req.targetZone === 'khmer_world' && req.worldId && req.worldId !== 'phum_chaktomuk') {
        this.scene.start('KhmerWorldScene', {
          worldId: req.worldId,
          playerState: { ...nextPayload, zone: 'khmer_world', currentWorldId: req.worldId },
          spawnX: req.spawnX ?? 480,
          spawnY: req.spawnY ?? 380,
          goldenFlash: true,
        });
      } else {
        this.scene.start('OverworldScene', {
          mapId: req.mapId ?? 'central_plaza',
          playerState: {
            ...nextPayload,
            zone: 'overworld',
            currentMapId: req.mapId ?? 'central_plaza',
            currentWorldId: 'phum_chaktomuk',
          },
          spawnX: req.spawnX,
          spawnY: req.spawnY,
          goldenFlash: true,
        });
      }
    });
  }

  private enterDungeon(
    bossId: BossId = 'sdech_kongkaeb',
    difficulty: DifficultyMode = 'normal',
    partyMode: 'solo' | 'coop' = 'solo',
    partyId?: string
  ): void {
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('DungeonBossScene', {
        bossId,
        difficulty,
        partyMode,
        partyId,
        playerState: {
          ...this.player.state,
          zone: 'dungeon',
          difficulty,
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
          activeBuffs: [...this.player.state.activeBuffs],
          quickSnackSlots: [...this.player.state.quickSnackSlots],
          clearedBosses: [...this.player.state.clearedBosses],
          bossDefeats: { ...(this.player.state.bossDefeats ?? {}) },
        },
      });
    });
  }

  private findNearestInteract(): InteractZone | null {
    let best: InteractZone | null = null;
    let bestDist = Infinity;
    for (const z of this.interactZones) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
      if (d <= z.radius && d < bestDist) {
        bestDist = d;
        best = z;
      }
    }
    return best;
  }

  private tryInteractNearest(): void {
    const nearest = this.findNearestInteract();
    if (nearest) {
      nearest.onInteract();
    } else {
      EventBus.emit('ui:toast', { text: 'Walk toward a Gate, Railway, Pier, or Cultural Landmark!' });
    }
  }

  update(time: number, delta: number): void {
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

    let vx = this.joystick.x;
    let vy = this.joystick.y;

    if (!typing && !this.transitioning) {
      if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.tryInteractNearest();
      }
    }

    const len = Math.hypot(vx, vy);
    const isMoving = len > 0.1;
    if (isMoving) {
      const bridge = computeVillageToDungeonBridge(this.player.state);
      const mountMult = this.player.state.activeMount === 'mount_mini_tuk_tuk' ? 1.4 : 1.0;
      const speed = 118 * (1 + Math.min(0.45, bridge.moveSpeedBonusPct)) * mountMult;
      const nx = vx / Math.max(1, len);
      const ny = vy / Math.max(1, len);
      this.player.body.setVelocity(nx * speed, ny * speed);

      if (Math.abs(nx) >= Math.abs(ny)) {
        this.player.facing = nx < 0 ? 'left' : 'right';
      } else {
        this.player.facing = ny < 0 ? 'up' : 'down';
      }
      this.player.playStateAnimation('walk');
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, true);
    this.atmosphere?.update(time, delta);

    // Seamless walk-through trigger on physical Gateways / Railways / Piers!
    if (!this.transitioning && time > this.gateLockUntil) {
      for (const gw of this.gateways) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, gw.x, gw.y) <= 24) {
          this.travelThroughGateway(gw);
          return;
        }
      }
    }

    const nearest = this.findNearestInteract();
    if (nearest) {
      this.promptText.setPosition(nearest.x, nearest.y - 34);
      this.promptText.setText(nearest.label).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }
}
