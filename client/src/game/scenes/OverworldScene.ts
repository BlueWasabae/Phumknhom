import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type DifficultyMode,
  type PlayerState,
} from '@shared/types';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { KHMER_WORLDS, type WorldGatewayDef } from '@shared/khmerWorlds';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { RemotePlayerEntity } from '../entities/RemotePlayerEntity';
import { areaIdToChannel, channelToAreaId, roomClient } from '../network/RoomClient';
import { soundManager } from '../systems/SoundManager';
import { SeasonAtmosphereOverlay } from '../systems/SeasonClock';
import { travelManager, type TravelRequestPayload } from '../systems/TravelAndPylons';

// Cozy 16x16 Phum Khnhom village world (60 x 42 tiles) rendered at 2.5x - 2.9x camera zoom
const MAP_W = 960;
const MAP_H = 672;
const HORIZON_H = 82;

interface LandmarkZone {
  x: number;
  y: number;
  radius: number;
  label: string;
  isDungeonPortal: boolean;
  onInteract: () => void;
}

export class OverworldScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private promptText!: Phaser.GameObjects.Text;
  private areaSignText!: Phaser.GameObjects.Text;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private remotePlayers = new Map<string, RemotePlayerEntity>();
  private localPlayerId = '';
  private atmosphere?: SeasonAtmosphereOverlay;
  private glowLights: Phaser.GameObjects.Image[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private landmarks: LandmarkZone[] = [];
  private worldGateways: WorldGatewayDef[] = [];
  private gateLockUntil = 0;
  private nearPortalSent = false;
  private transitioning = false;
  private spawnX = 480;
  private spawnY = 405;
  private arrivalGoldenFlash = false;
  private busActive = false;
  private busTimer?: Phaser.Time.TimerEvent;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('OverworldScene');
  }

  init(data?: { playerState?: PlayerState; spawnX?: number; spawnY?: number; goldenFlash?: boolean }): void {
    const rawState = data?.playerState
      ? { ...data.playerState, zone: 'overworld' as const, weapon: { ...data.playerState.weapon }, loadout: { ...data.playerState.loadout } }
      : { ...INITIAL_PLAYER_STATE, zone: 'overworld' as const, weapon: { ...INITIAL_PLAYER_STATE.weapon }, loadout: { ...INITIAL_PLAYER_STATE.loadout } };
    // Never spawn unowned/legacy starter pets (e.g. mini_naga) unless owned in inventory
    if (rawState.loadout.pet) {
      const ownsPet = rawState.inventory.some((i) => i.itemId === rawState.loadout.pet && i.quantity > 0);
      if (!ownsPet || rawState.loadout.pet === 'mini_naga') {
        rawState.loadout.pet = null;
      }
    }
    this.initialState = rawState;
    this.spawnX = typeof data?.spawnX === 'number' ? data.spawnX : 480;
    this.spawnY = typeof data?.spawnY === 'number' ? data.spawnY : 405;
    this.arrivalGoldenFlash = Boolean(data?.goldenFlash);
    this.landmarks = [];
    this.worldGateways = [...KHMER_WORLDS.phum_chaktomuk.gateways];
    this.nearPortalSent = false;
    this.transitioning = false;
    this.busActive = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    // 2D Social Village RPG Mode: Top-Down 2.5D (gravity = 0)
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(0, HORIZON_H, MAP_W, MAP_H - HORIZON_H);
    this.glowLights = [];
    soundManager.playBgm('village');

    // 1. 2.5D Top Horizon Strip (Sky + Distant Mountain Treeline along north border)
    this.buildTopHorizonStrip();

    // 2. Real Textured 16x16 Serene Village Grass + Wildflower & Pebble Variations
    this.add
      .tileSprite(MAP_W / 2, HORIZON_H + (MAP_H - HORIZON_H) / 2, MAP_W, MAP_H - HORIZON_H, 'sv_grass')
      .setDepth(0);

    // 3. Bordered Dirt/Stone Village Paths + Proper Central Village Plaza Courtyard
    this.buildBorderedPathsAndPlaza();

    this.colliders = this.physics.add.staticGroup();
    this.buildLandmarks();
    this.buildWorldGateways();
    this.buildFencesAndTrees();

    // 4-Season Weather Particles & Day/Night Atmosphere Overlay
    this.atmosphere = new SeasonAtmosphereOverlay(this, MAP_W, MAP_H);
    this.glowLights.forEach((g) => this.atmosphere?.registerGlowLight(g));

    // Gentle expanding water ripples at the Riverside Fishing Pond
    this.time.addEvent({
      delay: 1450,
      loop: true,
      callback: () => {
        if (!this.scene.isActive('OverworldScene')) return;
        const rx = 185 + Math.random() * 68;
        const ry = 496 + Math.random() * 34;
        const ripple = this.add
          .ellipse(rx, ry, 10, 5, 0xbae6fd, 0)
          .setStrokeStyle(1.2, 0xe0f2fe, 0.72)
          .setDepth(5);
        this.tweens.add({
          targets: ripple,
          scaleX: 3.1,
          scaleY: 2.8,
          alpha: 0,
          duration: 1350,
          ease: 'Sine.easeOut',
          onComplete: () => ripple.destroy(),
        });
      },
    });

    // 4. Real 10-Layer Human Chibi Player + Soft Shadow
    this.player = new Player(this, this.spawnX, this.spawnY, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);
    this.gateLockUntil = this.time.now + 950;

    // Scheduled Animated Green Village Bus: drives along road every 25s, pauses at Bus Stop with bouncing yellow JOIN arrow!
    this.time.delayedCall(3500, () => {
      if (this.scene.isActive('OverworldScene')) this.spawnScheduledGreenBus();
    });
    this.busTimer = this.time.addEvent({
      delay: 25000,
      loop: true,
      callback: () => {
        if (this.scene.isActive('OverworldScene')) this.spawnScheduledGreenBus();
      },
    });

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 10, y: 5 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(2600)
      .setVisible(false);

    // 5. Crisp Village Camera Zoom (2.5x - 2.9x based on screen width) + Resize Handler
    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    if (this.arrivalGoldenFlash) {
      this.cameras.main.flash(260, 250, 204, 21);
      soundManager.playSfx('magic');
    } else {
      this.cameras.main.fadeIn(240, 10, 14, 24);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E') as Record<
      'W' | 'A' | 'S' | 'D' | 'E',
      Phaser.Input.Keyboard.Key
    >;

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('player:chat', ({ text }) => {
        this.player.showSpeechBubble(text, 4500);
        roomClient.sendChat(text);
      }),
      EventBus.on('player:emote', ({ emoji }) => {
        this.player.showEmote(emoji, 3000);
        roomClient.sendEmote(emoji);
      }),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
        roomClient.sendAppearance(loadout, {
          name: playerState.name,
          level: playerState.level,
          stylish: playerState.lifeStats.stylish,
        });
      }),
      EventBus.on('player:stateSync', (nextState) => {
        const metaChanged =
          this.player.state.name !== nextState.name ||
          this.player.state.level !== nextState.level ||
          this.player.state.lifeStats.stylish !== nextState.lifeStats.stylish;
        this.player.syncPlayerState(nextState);
        if (metaChanged) {
          roomClient.sendAppearance(this.player.state.loadout, {
            name: nextState.name,
            level: nextState.level,
            stylish: nextState.lifeStats.stylish,
          });
        }
      }),
      EventBus.on('auth:identityChanged', ({ playerId, playerState }) => {
        this.localPlayerId = playerId;
        this.player.syncPlayerState(playerState);
        const targetArea = channelToAreaId(playerState.areaChannel);
        void this.connectToPlazaArea(targetArea, false);
      }),
      EventBus.on('network:switchArea', ({ areaId }) => {
        void this.connectToPlazaArea(areaId, true);
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

    EventBus.emit('scene:ready', { zone: 'overworld' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'dungeon' });

    // Join Colyseus multiplayer Village Plaza room (graceful Offline fallback if server is down)
    const initialArea = channelToAreaId(this.player.state.areaChannel);
    void this.connectToPlazaArea(initialArea, false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.busTimer?.remove(false);
      this.busTimer = undefined;
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.clearRemotePlayers();
      this.atmosphere?.destroy();
      this.atmosphere = undefined;
      void roomClient.leavePlaza(false);
      this.player.destroy();
    });
  }

  private clearRemotePlayers(): void {
    this.remotePlayers.forEach((entity) => entity.destroy());
    this.remotePlayers.clear();
  }

  private async connectToPlazaArea(areaId: string, showToast: boolean): Promise<void> {
    this.clearRemotePlayers();
    const channel = areaIdToChannel(areaId);
    this.player.state.areaChannel = channel;
    this.areaSignText?.setText(areaId);
    EventBus.emit('player:state', { ...this.player.state });

    const ok = await roomClient.joinPlaza(
      areaId,
      {
        playerId: this.localPlayerId,
        name: this.player.state.name,
        level: this.player.state.level,
        stylish: this.player.state.lifeStats.stylish,
        x: this.player.x,
        y: this.player.y,
        facing: this.player.facing,
        loadout: this.player.state.loadout,
      },
      {
        onRemoteAdd: (snap) => {
          if (!this.scene.isActive('OverworldScene')) return;
          if (this.remotePlayers.has(snap.sessionId)) {
            this.remotePlayers.get(snap.sessionId)?.applySnapshot(snap);
            return;
          }
          const ent = new RemotePlayerEntity(this, snap);
          this.remotePlayers.set(snap.sessionId, ent);
        },
        onRemoteChange: (snap) => {
          if (!this.scene.isActive('OverworldScene')) return;
          this.remotePlayers.get(snap.sessionId)?.applySnapshot(snap);
        },
        onRemoteRemove: (sessionId) => {
          const ent = this.remotePlayers.get(sessionId);
          if (ent) {
            ent.destroy();
            this.remotePlayers.delete(sessionId);
          }
        },
        onChat: (msg) => {
          if (!this.scene.isActive('OverworldScene')) return;
          if (msg.sessionId === roomClient.sessionId) return;
          this.remotePlayers.get(msg.sessionId)?.showSpeechBubble(msg.text, 4500);
          EventBus.emit('network:remoteChat', msg);
        },
        onEmote: (msg) => {
          if (!this.scene.isActive('OverworldScene')) return;
          if (msg.sessionId === roomClient.sessionId) return;
          this.remotePlayers.get(msg.sessionId)?.showEmote(msg.emoji, 3000);
        },
      }
    );

    if (showToast) {
      EventBus.emit('ui:toast', {
        text: ok
          ? `Connected to ${areaId} (Multiplayer Plaza live!)`
          : `Switched to ${areaId} (Offline Mode — Colyseus server unreachable)`,
      });
    }
  }

  private applyResponsiveZoom = (): void => {
    const w = this.scale.width;
    const zoom = w < 640 ? 2.4 : w < 1100 ? 2.65 : 2.95;
    this.cameras.main.setZoom(zoom);
  };

  private buildTopHorizonStrip(): void {
    // 100% Cohesive 16-bit Pixel-Art Meadow & Village Canopy Treeline (replaces mismatched dark-forest parallax!)
    this.add
      .tileSprite(MAP_W / 2, HORIZON_H / 2, MAP_W, HORIZON_H, 'sv_grass')
      .setDepth(0);

    // Dense overlapping Serene Village & Ninja Adventure trees framing the north edge
    // Leave an open stone road corridor at x = 480 for the North Angkor Stone Archway!
    const canopyTrees = ['sv_tree_green', 'sv_tree_teal', 'na_palm_tree', 'sugar_palm_tree'] as const;
    for (let x = 24; x <= MAP_W - 24; x += 38) {
      if (Math.abs(x - 480) < 58) continue;
      const idx = Math.floor(x / 38);
      const tex = canopyTrees[idx % canopyTrees.length];
      const ty = 72 + (idx % 2) * 14;
      this.add.image(x, ty, 'soft_shadow').setDisplaySize(34, 11).setDepth(ty - 2);
      const tree = this.add.image(x, ty, tex).setOrigin(0.5, 0.92).setScale(1.04).setDepth(ty);
      this.tweens.add({
        targets: tree,
        angle: idx % 2 === 0 ? 1.6 : -1.6,
        duration: 2300 + (idx % 5) * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildBorderedPathsAndPlaza(): void {
    const borderGfx = this.add.graphics().setDepth(1);

    // Warm dark-earth road trim extending all the way to the 4 cardinal World Gateways!
    borderGfx.fillStyle(0x8d6339, 0.85);
    borderGfx.fillRoundedRect(36, 344, MAP_W - 72, 56, 8);
    borderGfx.fillRoundedRect(450, 106, 60, MAP_H - 130, 8);
    // Cobblestone Central Village Plaza trim
    borderGfx.fillStyle(0x7c5b3b, 0.9);
    borderGfx.fillRoundedRect(388, 304, 184, 132, 10);

    // Textured dirt roads reaching North Archway, South Pier, West Battambang Gate & East Kampot Gate
    this.add.tileSprite(MAP_W / 2, 372, MAP_W - 80, 48, 'sv_path').setDepth(2);
    this.add.tileSprite(480, 370, 52, MAP_H - 138, 'sv_path').setDepth(2);

    // Proper Central Village Plaza Courtyard (sandstone/cobblestone tiles — no flat circle!)
    this.add.tileSprite(480, 370, 176, 124, 'sv_plaza_tile').setDepth(3);

    // Subtle cobblestone plaza inner frame
    const plazaLine = this.add.graphics().setDepth(4);
    plazaLine.lineStyle(1.5, 0xd6b47c, 0.9);
    plazaLine.strokeRoundedRect(394, 310, 172, 118, 6);

    // Scatter wildflower meadows & pebbles across the village grass
    const flowerSpots = [
      [180, 290], [320, 455], [640, 455], [785, 295], [340, 265], [610, 265],
    ];
    for (const [fx, fy] of flowerSpots) {
      this.add.image(fx, fy, 'sv_flowers').setDepth(3).setAlpha(0.92);
    }
    const pebbleSpots = [
      [410, 326], [548, 324], [412, 416], [546, 414], [250, 368], [710, 368],
    ];
    for (const [px, py] of pebbleSpots) {
      this.add.image(px, py, 'na_pebbles').setDepth(4).setAlpha(0.85);
    }

    // Animated Central Plaza Campfire + Warm Flickering Glow + Cozy Benches + Lanterns
    const fireGlow = this.add
      .image(480, 368, 'torch_glow')
      .setScale(0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.5);
    this.glowLights.push(fireGlow);
    const fire = this.add.sprite(480, 365, 'sv_campfire_16', 0).setScale(1.15).setDepth(365);
    fire.play('campfire_burn');

    // Cozy Village Park Benches facing the courtyard
    this.add.image(432, 342, 'soft_shadow').setScale(0.75, 0.35).setDepth(340);
    this.add.image(432, 340, 'na_bench').setDepth(341);
    this.add.image(528, 342, 'soft_shadow').setScale(0.75, 0.35).setDepth(340);
    this.add.image(528, 340, 'na_bench').setDepth(341);

    // Decorative Plaza Lantern Posts with Warm Night-Adaptive Flickering Glow
    for (const [lx, ly] of [[400, 318], [560, 318], [400, 422], [560, 422]]) {
      this.add.image(lx, ly + 6, 'soft_shadow').setScale(0.28, 0.2).setDepth(ly);
      this.add.image(lx, ly, 'na_lantern').setOrigin(0.5, 0.85).setDepth(ly + 1);
      const lGlow = this.add
        .image(lx, ly - 14, 'torch_glow')
        .setScale(0.52)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2140)
        .setAlpha(0.35);
      this.glowLights.push(lGlow);
    }
  }

  private addBuildingOrProp(opts: {
    texture: string;
    x: number;
    y: number;
    scale?: number;
    shadowW?: number;
    shadowH?: number;
    bodyW?: number;
    bodyH?: number;
    label?: string;
    joinArrowY?: number;
  }): Phaser.GameObjects.Image {
    const scale = opts.scale ?? 1;
    // Soft dark oval ground shadow under every prop/house/tree
    if (opts.shadowW && opts.shadowH) {
      this.add
        .image(opts.x, opts.y - 2, 'soft_shadow')
        .setDisplaySize(opts.shadowW, opts.shadowH)
        .setDepth(opts.y - 4);
    }

    const img = this.add.image(opts.x, opts.y, opts.texture).setOrigin(0.5, 0.92).setScale(scale);
    img.setDepth(opts.y);

    if (opts.bodyW && opts.bodyH) {
      const col = this.add.rectangle(opts.x, opts.y - opts.bodyH / 2 - 2, opts.bodyW, opts.bodyH, 0x000000, 0);
      this.colliders.add(col);
    }

    if (opts.label) {
      this.add
        .text(opts.x, opts.y + 4, opts.label, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.84)',
          padding: { x: 7, y: 2 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 0)
        .setDepth(opts.y + 8);
    }

    if (typeof opts.joinArrowY === 'number') {
      const arrow = this.add.image(opts.x, opts.joinArrowY, 'join_arrow').setScale(0.56).setDepth(opts.y + 50);
      this.tweens.add({
        targets: arrow,
        y: opts.joinArrowY - 6,
        duration: 560,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return img;
  }

  private buildLandmarks(): void {
    // 1. AREA 0 Wooden Street Sign at Plaza Entrance (Clickable + Press E to Switch Areas!)
    const signImg = this.addBuildingOrProp({
      texture: 'sv_sign_wood',
      x: 416,
      y: 374,
      scale: 1.15,
      shadowW: 18,
      shadowH: 7,
      bodyW: 14,
      bodyH: 8,
    });
    signImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'areaSwitcher' });
    });
    this.areaSignText = this.add
      .text(416, 349, channelToAreaId(this.initialState.areaChannel), {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1d4ed8',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5)
      .setDepth(390)
      .setInteractive({ useHandCursor: true });
    this.areaSignText.on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'areaSwitcher' });
    });
    this.landmarks.push({
      x: 416,
      y: 378,
      radius: 38,
      label: 'Press [E] or Click → Switch Multiplayer Area (AREA 0 / 1 / 2)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'areaSwitcher' }),
    });

    // 2. PLAYER'S KHMER STILT HOUSE & FARM GATE (Top-Left, Custom Khmer Pixel Art)
    this.addBuildingOrProp({
      texture: 'khmer_stilt_house',
      x: 205,
      y: 242,
      scale: 0.72,
      shadowW: 94,
      shadowH: 26,
      bodyW: 68,
      bodyH: 30,
      label: 'MY KHMER HOME · FARM',
      joinArrowY: 132,
    });
    this.addBuildingOrProp({
      texture: 'sv_fence_pen',
      x: 298,
      y: 240,
      scale: 1.0,
      shadowW: 54,
      shadowH: 16,
      bodyW: 44,
      bodyH: 26,
    });
    this.landmarks.push({
      x: 205,
      y: 250,
      radius: 54,
      label: 'Press [E] or Tap JOIN → Enter Personal Homestead Farm',
      isDungeonPortal: true,
      onInteract: () => this.enterFarm(),
    });

    // 3. KHMER NUM PANG STREET SNACK CART (Center-Left, Custom Khmer Pixel Art)
    this.addBuildingOrProp({
      texture: 'num_pang_cart',
      x: 255,
      y: 364,
      scale: 0.58,
      shadowW: 58,
      shadowH: 18,
      bodyW: 42,
      bodyH: 22,
      label: 'NUM PANG CART',
      joinArrowY: 288,
    });
    this.landmarks.push({
      x: 255,
      y: 372,
      radius: 48,
      label: 'Press [E] or Tap Interact → Street Snack Cart & Farm Kitchen',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'snackShop', shopTab: 'primary' }),
    });

    // 4. FASHION SHOP — Real Ninja Adventure Blue-Roof Boutique (or custom Khmer PNG if present)
    this.addBuildingOrProp({
      texture: 'fashion_boutique',
      x: 705,
      y: 356,
      scale: 1.4,
      shadowW: 78,
      shadowH: 22,
      bodyW: 60,
      bodyH: 28,
      label: 'FASHION SHOP',
      joinArrowY: 284,
    });
    this.add.image(705, 370, 'sv_flower_box').setScale(0.85).setDepth(370);
    this.landmarks.push({
      x: 705,
      y: 368,
      radius: 52,
      label: 'Press [E] or Tap Interact → Fashion Boutique & Wardrobe Mirror',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'fashionShop', shopTab: 'primary' }),
    });

    // 5. ANGKOR DUNGEON PORTAL (Top-Right, Custom Angkor Wat Portal + Glow + Bouncing JOIN Arrow)
    const portalGlow = this.add
      .image(745, 206, 'portal_vortex')
      .setScale(1.15)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(244);
    this.tweens.add({
      targets: portalGlow,
      alpha: 0.25,
      scale: 1.32,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.addBuildingOrProp({
      texture: 'angkor_portal',
      x: 745,
      y: 252,
      scale: 0.68,
      shadowW: 92,
      shadowH: 24,
      bodyW: 60,
      bodyH: 26,
      label: 'ANGKOR DUNGEON PORTAL',
      joinArrowY: 124,
    });

    this.landmarks.push({
      x: 745,
      y: 260,
      radius: 58,
      label: 'Press [E] or Tap JOIN → Choose Khmer Boss & Difficulty (Solo / Co-op)',
      isDungeonPortal: true,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'modeSelector' }),
    });

    // ==================== PHASE 8 VILLAGE LANDMARKS ====================

    // 6. ANCIENT PAGODA RESTORATION (North-Center Hilltop — Real Red-Roofed Pagoda!)
    this.addBuildingOrProp({
      texture: 'ancient_pagoda',
      x: 480,
      y: 206,
      scale: 1.38,
      shadowW: 92,
      shadowH: 22,
      bodyW: 66,
      bodyH: 26,
      label: 'ANCIENT PAGODA · BUNDLES',
      joinArrowY: 132,
    });
    this.landmarks.push({
      x: 480,
      y: 214,
      radius: 54,
      label: 'Press [E] or Tap JOIN → Ancient Pagoda Restoration (6 Altars)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'pagoda' }),
    });

    // 7. CENTRAL PLAZA LUCKY WHEEL STALL (Real Ninja Adventure Festival Stall + Goods + Spinning Wheel!)
    this.add.image(590, 468, 'market_goods_b').setScale(1.15).setDepth(470);
    this.addBuildingOrProp({
      texture: 'lucky_wheel_kiosk',
      x: 590,
      y: 472,
      scale: 1.25,
      shadowW: 54,
      shadowH: 15,
      bodyW: 40,
      bodyH: 18,
      label: 'LUCKY WHEEL',
      joinArrowY: 408,
    });
    const luckyWheelProp = this.add
      .sprite(590, 444, 'na_wheel_prop', 0)
      .setScale(0.42)
      .setTint(0xfde047)
      .setDepth(476)
      .setInteractive({ useHandCursor: true });
    if (this.anims.exists('lucky_wheel_spin')) {
      luckyWheelProp.play('lucky_wheel_spin');
    }
    luckyWheelProp.on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'luckyWheel' }));
    this.landmarks.push({
      x: 590,
      y: 478,
      radius: 46,
      label: 'Press [E] or Tap JOIN → Spin Royal Lucky Wheel (Coins / Gold)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'luckyWheel' }),
    });

    // 8. VILLAGE PLAYER MARKET STALL (Real Ninja Adventure Market Awning Stall + Produce Crates!)
    this.add.image(715, 468, 'market_goods_a').setScale(1.15).setDepth(470);
    this.addBuildingOrProp({
      texture: 'market_board',
      x: 715,
      y: 472,
      scale: 1.25,
      shadowW: 56,
      shadowH: 15,
      bodyW: 42,
      bodyH: 18,
      label: 'VILLAGE MARKET (5% TAX)',
      joinArrowY: 422,
    });
    this.landmarks.push({
      x: 715,
      y: 478,
      radius: 48,
      label: 'Press [E] or Tap JOIN → Player Trading Market Board',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'market' }),
    });

    // 9. RIVERSIDE PIER & FISHING POND (Real Serene Village Pixel-Art Bordered Pond + Wooden Pier!)
    this.add.image(210, 514, 'sv_pond').setDisplaySize(164, 96).setDepth(3);

    const pondCol = this.add.rectangle(195, 522, 110, 52, 0x000000, 0);
    this.colliders.add(pondCol);

    this.addBuildingOrProp({
      texture: 'fishing_pier',
      x: 268,
      y: 506,
      scale: 1.12,
      shadowW: 44,
      shadowH: 14,
      label: 'RIVERSIDE PIER · FISH',
      joinArrowY: 448,
    });
    this.landmarks.push({
      x: 268,
      y: 496,
      radius: 56,
      label: 'Press [E] or Tap JOIN → Cast Line at Riverside Fishing Pier',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'fishing' }),
    });

    // ==================== EXPANSION LANDMARKS: BUS STOP, ATM, CLUB, BLACKSMITH & PYLON SHRINE ====================

    // 10. VILLAGE EXPRESS BUS STOP (Real Ninja Adventure Wooden Shelter Signpost + Waiting Bench!)
    const busStop = this.addBuildingOrProp({
      texture: 'bus_stop_sign',
      x: 342,
      y: 404,
      scale: 1.15,
      shadowW: 26,
      shadowH: 9,
      label: 'EXPRESS BUS STOP',
      joinArrowY: 360,
    });
    this.add.image(314, 404, 'soft_shadow').setDisplaySize(32, 9).setDepth(400);
    this.add.image(314, 402, 'na_bench').setScale(0.76).setDepth(403);
    busStop.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });
    this.landmarks.push({
      x: 342,
      y: 404,
      radius: 44,
      label: 'Press [E] or Click → Board Village Express Bus & Open World Map [M]',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'worldMap' }),
    });

    // 11. VILLAGE ATM BANK VAULT (Real Stone Vault House + Treasure Chest & Gold Coin Emblem!)
    const atmImg = this.addBuildingOrProp({
      texture: 'atm_kiosk',
      x: 368,
      y: 304,
      scale: 1.08,
      shadowW: 54,
      shadowH: 14,
      bodyW: 40,
      bodyH: 20,
      label: 'ATM BANK VAULT',
    });
    this.add.image(392, 304, 'na_chest').setScale(1.05).setOrigin(0.5, 0.9).setDepth(306);
    this.add.image(368, 260, 'na_gold_coin').setScale(1.5).setDepth(310);
    atmImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'bank' });
    });
    this.landmarks.push({
      x: 368,
      y: 308,
      radius: 46,
      label: 'Press [E] or Click → ATM Bank Vault (Safe Coin Storage)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'bank' }),
    });

    // 12. VILLAGE BLACKSMITH FORGE + REAL IRON ANVIL + MASTER SOMNANG NPC!
    const forgeImg = this.addBuildingOrProp({
      texture: 'blacksmith_anvil',
      x: 598,
      y: 288,
      scale: 1.15,
      shadowW: 40,
      shadowH: 12,
      bodyW: 32,
      bodyH: 18,
      label: 'BLACKSMITH · REFORGE',
      joinArrowY: 230,
    });
    this.add.image(574, 290, 'soft_shadow').setDisplaySize(18, 7).setDepth(286);
    this.add
      .image(574, 288, 'na_anvil')
      .setScale(1.15)
      .setOrigin(0.5, 0.9)
      .setDepth(290)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' }));
    forgeImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' });
    });

    this.add.image(628, 290, 'soft_shadow').setDisplaySize(22, 8).setDepth(286);
    const blacksmithNpc = this.add
      .sprite(628, 290, 'char_master', 0)
      .setOrigin(0.5, 0.92)
      .setScale(1.22)
      .setDepth(290)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: blacksmithNpc,
      y: 288,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    blacksmithNpc.on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' });
    });
    this.landmarks.push({
      x: 614,
      y: 292,
      radius: 52,
      label: 'Press [E] or Click → Master Somnang Blacksmith (Reforge & Khmer Mythic Arsenal)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' }),
    });

    // 12B. SACRED APSARA SHIMMER SPRING (Real Animated Purple Water Ripples beside Dungeon Portal!)
    const shimmerGlow = this.add
      .image(822, 248, 'torch_glow')
      .setTint(0xc084fc)
      .setScale(0.76)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.58);
    this.glowLights.push(shimmerGlow);

    const shimmerHit = this.add
      .rectangle(822, 250, 48, 24, 0, 0)
      .setDepth(256)
      .setInteractive({ useHandCursor: true });
    for (const rx of [-10, 10]) {
      const spr = this.add
        .sprite(822 + rx, 250, 'na_water_purple', 0)
        .setScale(1.35)
        .setDepth(252);
      spr.play('shimmer_ripple');
    }
    const shimmerArrow = this.add.image(822, 224, 'join_arrow').setScale(0.52).setDepth(300);
    this.tweens.add({ targets: shimmerArrow, y: 218, duration: 560, yoyo: true, repeat: -1 });
    this.add
      .text(822, 260, 'APSARA SHIMMER', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f0abfc',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5, 0)
      .setDepth(262);
    shimmerHit.on('pointerdown', () => {
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'shimmer' });
    });
    this.landmarks.push({
      x: 822,
      y: 254,
      radius: 46,
      label: 'Press [E] or Click → Sacred Apsara Shimmer Spring (Blessings & Boss Drop Cycle)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'shimmer' }),
    });

    // 13. PHUM NIGHT CLUB (Real Ninja Adventure Tavern Building!)
    const clubImg = this.addBuildingOrProp({
      texture: 'club_building',
      x: 822,
      y: 364,
      scale: 1.32,
      shadowW: 80,
      shadowH: 20,
      bodyW: 60,
      bodyH: 26,
      label: 'PHUM CLUB · TIEN LEN',
      joinArrowY: 294,
    });
    clubImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.enterClub());
    this.landmarks.push({
      x: 822,
      y: 370,
      radius: 52,
      label: 'Press [E] or Tap JOIN → Enter Phum Club (Tien Len & Ouk Chaktrang)',
      isDungeonPortal: true,
      onInteract: () => this.enterClub(),
    });

    // 14. GREEN PARK: REAL GOLDEN SHRINE GATE + REAL CARVED STONE PYLON SHRINE + FLOWER BEDS!
    this.add.image(422, 534, 'sv_blossoms').setScale(0.95).setDepth(4);
    this.add.image(502, 534, 'sv_blossoms').setScale(0.95).setDepth(4);
    this.add.image(462, 480, 'sv_flower_box').setScale(0.95).setDepth(480);

    // 14A. Golden Blessing Shrine Gate (Real Ninja Adventure Red/Gold Torii Shrine!)
    const shrineGlow = this.add
      .image(422, 492, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(0.78)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.58);
    this.glowLights.push(shrineGlow);

    const goldenShrineImg = this.addBuildingOrProp({
      texture: 'golden_shrine',
      x: 422,
      y: 514,
      scale: 1.18,
      shadowW: 48,
      shadowH: 13,
      bodyW: 32,
      bodyH: 14,
      label: 'GOLDEN SHRINE · DAILY',
      joinArrowY: 468,
    });
    const prayAtShrine = () => {
      this.cameras.main.flash(220, 250, 204, 21);
      EventBus.emit('shrine:pray');
    };
    goldenShrineImg.setInteractive({ useHandCursor: true }).on('pointerdown', prayAtShrine);
    this.landmarks.push({
      x: 422,
      y: 516,
      radius: 48,
      label: 'Press [E] or Click → Pray at Golden Blessing Shrine (+250 Coins & +10% Luck 10m)',
      isDungeonPortal: false,
      onInteract: prayAtShrine,
    });

    // 14B. Angkor Biome Pylon Shrine (Real Carved Stone Shrine Statue!)
    const pylonGlow = this.add
      .image(502, 492, 'torch_glow')
      .setTint(0x38bdf8)
      .setScale(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.5);
    this.glowLights.push(pylonGlow);

    const pylonImg = this.addBuildingOrProp({
      texture: 'pylon_shrine',
      x: 502,
      y: 514,
      scale: 1.25,
      shadowW: 42,
      shadowH: 14,
      bodyW: 28,
      bodyH: 16,
      label: 'PYLON SHRINE · MAP',
      joinArrowY: 466,
    });
    pylonImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });
    this.landmarks.push({
      x: 502,
      y: 516,
      radius: 48,
      label: 'Press [E] or Click → Biome Pylon Network & World Map [M]',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'worldMap' }),
    });

    // Active Dungeon Return Portal beside Pylon Shrine (when player recalled via Return Portal!)
    const activeReturn = travelManager.getReturnPortal();
    if (activeReturn) {
      const rpGlow = this.add
        .image(534, 496, 'portal_vortex')
        .setTint(0x38bdf8)
        .setScale(0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(515)
        .setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: rpGlow, scale: 1.08, alpha: 0.55, duration: 750, yoyo: true, repeat: -1 });
      rpGlow.on('pointerdown', () => {
        travelManager.setReturnPortal(null);
        this.enterDungeon(activeReturn.bossId, activeReturn.difficulty, activeReturn.partyMode);
      });
      this.add
        .text(534, 522, 'RETURN PORTAL', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#7dd3fc',
          backgroundColor: 'rgba(15,23,42,0.86)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(520);
    }
  }

  private buildWorldGateways(): void {
    // 4 Physical Walk-Through Gateways connecting Phum Chaktomuk to Cambodia's Cultural Worlds!
    for (const gw of this.worldGateways) {
      const tex =
        gw.style === 'stone_arch'
          ? 'angkor_arch_gate'
          : gw.style === 'pier_dock'
          ? 'fishing_pier'
          : 'wood_fence_gate';
      const scale = gw.style === 'stone_arch' ? 1.2 : gw.style === 'pier_dock' ? 1.15 : 1.1;

      this.add.image(gw.x, gw.y + 2, 'soft_shadow').setDisplaySize(56, 15).setDepth(gw.y - 3);
      const gateImg = this.add
        .image(gw.x, gw.y, tex)
        .setOrigin(0.5, 0.85)
        .setScale(scale)
        .setDepth(gw.y + 16)
        .setInteractive({ useHandCursor: true });

      gateImg.on('pointerdown', () => this.travelThroughGateway(gw));

      // Waving pixel-art Khmer festival flags beside every world gateway
      const flagTex = gw.style === 'stone_arch' ? 'na_flag_yellow' : 'na_flag_red';
      const flagAnim = gw.style === 'stone_arch' ? 'flag_yellow_wave' : 'flag_red_wave';
      for (const fx of [-26, 26]) {
        const flag = this.add.sprite(gw.x + fx, gw.y - 12, flagTex, 0).setScale(1.0).setDepth(gw.y + 18);
        if (this.anims.exists(flagAnim)) flag.play(flagAnim);
      }

      this.add
        .text(gw.x, gw.y + 8, `${gw.signTitle}\n${gw.signKhmer}`, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          align: 'center',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(gw.y + 24);

      this.landmarks.push({
        x: gw.x,
        y: gw.y,
        radius: 44,
        label: gw.promptText,
        isDungeonPortal: false,
        onInteract: () => this.travelThroughGateway(gw),
      });
    }
  }

  private travelThroughGateway(gw: WorldGatewayDef): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('click');
    this.cameras.main.fadeOut(220, 10, 14, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('KhmerWorldScene', {
        worldId: gw.targetWorldId,
        playerState: {
          ...this.player.state,
          zone: 'khmer_world',
          currentWorldId: gw.targetWorldId,
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
        spawnX: gw.targetSpawnX,
        spawnY: gw.targetSpawnY,
      });
    });
  }

  private buildFencesAndTrees(): void {
    // Decorative wooden fences framing the north & south village edges
    for (const fx of [360, 400, 560, 600]) {
      this.addBuildingOrProp({
        texture: 'sv_fence_h',
        x: fx,
        y: 162,
        shadowW: 32,
        shadowH: 8,
        bodyW: 30,
        bodyH: 10,
      });
    }

    // Layered Y-sorted perimeter trees (including Khmer Sugar Palms & Golden Durian) + gentle breeze sway
    const trees: Array<[number, number, 'sv_tree_green' | 'sv_tree_teal' | 'sugar_palm_tree' | 'golden_durian_tree']> = [
      [74, 165, 'sugar_palm_tree'], [118, 195, 'sv_tree_teal'], [72, 315, 'sv_tree_teal'],
      [82, 460, 'sugar_palm_tree'], [138, 565, 'sv_tree_teal'], [285, 560, 'golden_durian_tree'],
      [370, 585, 'sv_tree_teal'], [595, 585, 'sugar_palm_tree'], [695, 560, 'sv_tree_teal'],
      [830, 555, 'golden_durian_tree'], [878, 445, 'sv_tree_teal'], [885, 310, 'sugar_palm_tree'],
      [875, 180, 'sv_tree_teal'], [575, 138, 'sugar_palm_tree'], [390, 136, 'sv_tree_teal'],
    ];
    trees.forEach(([tx, ty, tex], idx) => {
      const isKhmerTree = tex === 'sugar_palm_tree' || tex === 'golden_durian_tree';
      const treeImg = this.addBuildingOrProp({
        texture: tex,
        x: tx,
        y: ty,
        scale: isKhmerTree ? 0.88 : 1.1,
        shadowW: 36,
        shadowH: 12,
        bodyW: 16,
        bodyH: 12,
      });
      this.tweens.add({
        targets: treeImg,
        angle: idx % 2 === 0 ? 2.2 : -2.2,
        duration: 2100 + (idx % 5) * 320,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private enterClub(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 14, 8, 22);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ClubScene', {
        playerState: {
          ...this.player.state,
          zone: 'club',
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  private spawnScheduledGreenBus(): void {
    if (this.busActive || !this.scene.isActive('OverworldScene')) return;
    this.busActive = true;

    const busY = 374;
    const stopX = 342;
    const bus = this.add
      .image(-54, busY, 'village_bus')
      .setScale(0.95)
      .setDepth(382)
      .setInteractive({ useHandCursor: true });
    const shadow = this.add
      .image(-54, busY + 14, 'soft_shadow')
      .setDisplaySize(72, 16)
      .setDepth(378);
    const joinArrow = this.add
      .image(stopX, busY - 34, 'join_arrow')
      .setScale(0.62)
      .setDepth(420)
      .setVisible(false);
    const busBadge = this.add
      .text(stopX, busY - 50, '🚌 GREEN BUS · TAP TO BOARD', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(20, 83, 45, 0.9)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5)
      .setDepth(421)
      .setVisible(false);

    bus.on('pointerdown', () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });

    // Drive into Bus Stop
    this.tweens.add({
      targets: [bus, shadow],
      x: stopX,
      duration: 2400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (!bus.active) return;
        joinArrow.setVisible(true);
        busBadge.setVisible(true);
        const arrowBounce = this.tweens.add({
          targets: joinArrow,
          y: busY - 42,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Pause 6 seconds at the Downtown Bus Stop so players can click JOIN
        this.time.delayedCall(6000, () => {
          arrowBounce.stop();
          joinArrow.destroy();
          busBadge.destroy();
          if (!bus.active) {
            this.busActive = false;
            return;
          }
          // Depart East along village highway
          this.tweens.add({
            targets: [bus, shadow],
            x: MAP_W + 80,
            duration: 3200,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              bus.destroy();
              shadow.destroy();
              this.busActive = false;
            },
          });
        });
      },
    });
  }

  private handleTravelRequest(req: TravelRequestPayload): void {
    if (this.transitioning) return;
    const executeDestination = () => {
      if (req.targetZone === 'farm') {
        this.enterFarm();
      } else if (req.targetZone === 'club') {
        this.enterClub();
      } else if (req.targetZone === 'dungeon') {
        this.enterDungeon(req.bossId ?? 'sdech_kongkaeb', req.difficulty ?? 'normal', 'solo');
      } else if (req.targetZone === 'khmer_world' && req.worldId && req.worldId !== 'phum_chaktomuk') {
        this.transitioning = true;
        this.scene.start('KhmerWorldScene', {
          worldId: req.worldId,
          playerState: {
            ...this.player.state,
            zone: 'khmer_world',
            currentWorldId: req.worldId,
            weapon: { ...this.player.state.weapon },
            loadout: { ...this.player.state.loadout },
            currencies: { ...this.player.state.currencies },
            lifeStats: { ...this.player.state.lifeStats },
          },
          spawnX: req.spawnX ?? 480,
          spawnY: req.spawnY ?? 380,
          goldenFlash: true,
        });
      } else {
        const destX = typeof req.spawnX === 'number' ? req.spawnX : 480;
        const destY = typeof req.spawnY === 'number' ? req.spawnY : 405;
        this.player.sprite.setPosition(destX, destY);
        this.cameras.main.flash(260, 250, 204, 21);
        soundManager.playSfx('magic');
      }
    };

    if (req.method === 'bus') {
      // Animated Green Village Bus gliding across the village road before arrival!
      soundManager.playSfx('click');
      const bus = this.add.image(110, 372, 'village_bus').setScale(0.98).setDepth(2400);
      EventBus.emit('ui:toast', { text: `🚌 Green Village Bus departing for ${req.destinationLabel}...` });
      this.tweens.add({
        targets: bus,
        x: 860,
        duration: 1050,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          bus.destroy();
          executeDestination();
        },
      });
      return;
    }

    // Instant Angkor Pylon / District / Magic Mirror golden teleport flash!
    soundManager.playSfx('magic');
    this.cameras.main.flash(260, 250, 204, 21);
    this.time.delayedCall(220, executeDestination);
  }

  private enterFarm(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 16, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('FarmScene', {
        playerState: {
          ...this.player.state,
          zone: 'farm',
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  private enterDungeon(
    bossId: BossId = 'sdech_kongkaeb',
    difficulty: DifficultyMode = 'normal',
    partyMode: 'solo' | 'coop' = 'solo',
    partyId?: string
  ): void {
    if (this.transitioning) return;
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

  private findNearestLandmark(): LandmarkZone | null {
    let best: LandmarkZone | null = null;
    let bestDist = Infinity;
    for (const lm of this.landmarks) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, lm.x, lm.y);
      if (d <= lm.radius && d < bestDist) {
        bestDist = d;
        best = lm;
      }
    }
    return best;
  }

  private tryInteractNearest(): void {
    const lm = this.findNearestLandmark();
    if (lm) {
      lm.onInteract();
    } else {
      EventBus.emit('ui:toast', { text: 'Walk closer to the Dungeon Portal (top-right) or a Village landmark!' });
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
      const speed = 115 * (1 + Math.min(0.45, bridge.moveSpeedBonusPct)) * mountMult;
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

    // Throttled multiplayer position sync (~18Hz) + smooth remote player lerp
    roomClient.sendMove(this.player.x, this.player.y, this.player.facing, isMoving, time);
    this.remotePlayers.forEach((remote) => remote.update(time, delta));
    this.atmosphere?.update(time, delta);

    // Seamless walk-through transition when stepping through N/S/E/W World Gateways!
    if (!this.transitioning && time > this.gateLockUntil) {
      for (const gw of this.worldGateways) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, gw.x, gw.y) <= 24) {
          this.travelThroughGateway(gw);
          return;
        }
      }
    }

    const nearest = this.findNearestLandmark();
    if (nearest) {
      this.promptText.setPosition(nearest.x, nearest.y - 34);
      this.promptText.setText(nearest.label).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }

    const nearDungeon = Boolean(nearest?.isDungeonPortal);
    if (nearDungeon !== this.nearPortalSent) {
      this.nearPortalSent = nearDungeon;
      EventBus.emit('portal:proximity', {
        nearPortal: nearDungeon,
        label: nearDungeon ? 'JOIN DUNGEON' : '',
        targetZone: 'dungeon',
      });
    }
  }
}
