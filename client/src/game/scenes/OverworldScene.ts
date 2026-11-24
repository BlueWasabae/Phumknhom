import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type DifficultyMode,
  type PlayerState,
} from '@shared/types';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  getVillageMapOrDefault,
  type VillageMapDef,
  type VillageMapId,
  type VillageMapPortalDef,
} from '@shared/worldMapData';
import { getNpcsForMap } from '@shared/npcSchedules';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { PaperDoll } from '../entities/PaperDoll';
import { NpcVillager } from '../entities/NpcVillager';
import { RemotePlayerEntity } from '../entities/RemotePlayerEntity';
import { getMountSpec } from '../entities/MountEntity';
import { fetchLeaderboard } from '../network/ApiClient';
import { areaIdToChannel, channelToAreaId, roomClient } from '../network/RoomClient';
import { soundManager } from '../systems/SoundManager';
import { SeasonAtmosphereOverlay } from '../systems/SeasonClock';
import { travelManager, type TravelRequestPayload } from '../systems/TravelAndPylons';
import { worldEventManager } from '../systems/WorldEventManager';
import type { ActiveWorldEventSnapshot } from '@shared/worldEvents';

// Spacious 1600x1200 connected Phum Khnhom Village & Frontier maps (ZERO overlapping buildings!)
const MAP_W = 1600;
const MAP_H = 1200;
const HORIZON_H = 88;

interface LandmarkZone {
  x: number;
  y: number;
  radius: number;
  label: string;
  isDungeonPortal: boolean;
  onInteract: () => void;
}

interface GatherNode {
  id: string;
  kind: 'herb' | 'rock';
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  labelText: Phaser.GameObjects.Text;
  ready: boolean;
}

interface FrontierMiniBoss {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  homeX: number;
  homeY: number;
  patrolDir: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  lastHitAt: number;
}

interface WorldEventMob {
  id: string;
  kind: 'eclipse_spirit' | 'golden_frog' | 'golden_boss';
  name: string;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  homeX: number;
  homeY: number;
  dir: number;
  alive: boolean;
  lastHitAt: number;
}

export interface OverworldSceneInitData {
  mapId?: VillageMapId;
  playerState?: PlayerState;
  spawnX?: number;
  spawnY?: number;
  goldenFlash?: boolean;
}

export class OverworldScene extends Phaser.Scene {
  private mapDef: VillageMapDef = getVillageMapOrDefault('central_plaza');
  private mapId: VillageMapId = 'central_plaza';
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private promptText!: Phaser.GameObjects.Text;
  private areaSignText?: Phaser.GameObjects.Text;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private remotePlayers = new Map<string, RemotePlayerEntity>();
  private localPlayerId = '';
  private atmosphere?: SeasonAtmosphereOverlay;
  private glowLights: Phaser.GameObjects.Image[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'V' | 'H', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private landmarks: LandmarkZone[] = [];
  private mapPortals: VillageMapPortalDef[] = [];
  private gatherNodes: GatherNode[] = [];
  private npcs: NpcVillager[] = [];
  private statueDolls: PaperDoll[] = [];
  private miniBoss: FrontierMiniBoss | null = null;
  private worldEventObjects: Phaser.GameObjects.GameObject[] = [];
  private worldEventMobs: WorldEventMob[] = [];
  private worldEventMerchantLandmark: LandmarkZone | null = null;
  private gateLockUntil = 0;
  private nearPortalSent = false;
  private transitioning = false;
  private spawnX = 800;
  private spawnY = 660;
  private arrivalGoldenFlash = false;
  private busActive = false;
  private busTimer?: Phaser.Time.TimerEvent;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('OverworldScene');
  }

  init(data?: OverworldSceneInitData): void {
    const requestedMap = data?.mapId ?? data?.playerState?.currentMapId ?? 'central_plaza';
    this.mapDef = getVillageMapOrDefault(requestedMap);
    this.mapId = this.mapDef.id;

    const rawState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'overworld' as const,
          currentMapId: this.mapId,
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
        }
      : {
          ...INITIAL_PLAYER_STATE,
          zone: 'overworld' as const,
          currentMapId: this.mapId,
          weapon: { ...INITIAL_PLAYER_STATE.weapon },
          loadout: { ...INITIAL_PLAYER_STATE.loadout },
        };

    // Never spawn unowned/legacy starter pets unless owned in inventory
    if (rawState.loadout.pet) {
      const ownsPet = rawState.inventory.some(
        (i) => i.itemId === rawState.loadout.pet && i.quantity > 0
      );
      if (!ownsPet || rawState.loadout.pet === 'mini_naga') {
        rawState.loadout.pet = null;
      }
    }

    this.initialState = rawState;
    this.spawnX =
      typeof data?.spawnX === 'number' ? data.spawnX : this.mapDef.defaultSpawnX;
    this.spawnY =
      typeof data?.spawnY === 'number' ? data.spawnY : this.mapDef.defaultSpawnY;
    this.arrivalGoldenFlash = Boolean(data?.goldenFlash);
    this.landmarks = [];
    this.mapPortals = [...this.mapDef.portals];
    this.gatherNodes = [];
    this.miniBoss = null;
    this.nearPortalSent = false;
    this.transitioning = false;
    this.busActive = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    try {
      this.createSceneContent();
    } catch (err) {
      console.error('[OverworldScene] create() runtime error:', err);
      this.showFatalErrorBanner(err);
    }
  }

  private showFatalErrorBanner(err: unknown): void {
    if (typeof document === 'undefined') return;
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    let banner = document.getElementById('phum-scene-error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'phum-scene-error-banner';
      banner.style.cssText =
        'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;max-width:92vw;background:#991b1b;color:#fef2f2;border:2px solid #fca5a5;border-radius:12px;padding:10px 16px;font:bold 12px/1.4 monospace;box-shadow:0 8px 24px rgba(0,0,0,0.45);';
      document.body.appendChild(banner);
    }
    banner.textContent = `[OverworldScene Error] ${message}`;
  }

  private createSceneContent(): void {
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(24, HORIZON_H, MAP_W - 48, MAP_H - HORIZON_H - 18);
    this.glowLights = [];
    this.areaSignText = undefined;
    soundManager.playBgm('village');

    // 1. Lush Textured 16x16 Meadow Grass across full 1600x1200 map
    this.add
      .tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'sv_grass')
      .setDepth(0);

    // 2. Cohesive 16-bit Pixel-Art Top Canopy Treeline (opening cleanly for North Road Portals!)
    this.buildCohesiveHorizonTreeline();

    // 3. Clean Spacious Cobblestone & Dirt Road Network for the Active Map
    this.buildRoadsAndCourtyards();

    this.colliders = this.physics.add.staticGroup();

    // 4. Active Map Specific Spacious Landmarks (ZERO overlap!)
    if (this.mapId === 'central_plaza') {
      this.buildCentralPlazaMap();
    } else if (this.mapId === 'market_street') {
      this.buildMarketStreetMap();
    } else if (this.mapId === 'temple_district') {
      this.buildTempleDistrictMap();
    } else if (this.mapId === 'green_park') {
      this.buildGreenParkMap();
    } else if (this.mapId === 'wild_frontier') {
      this.buildWildFrontierMap();
    }

    // 5. Walk-Through Glowing Road Portals & Wooden Signposts at Map Edges
    this.buildWalkThroughRoadPortals();

    // 6. Perimeter Trees & Natural Framing
    this.buildPerimeterTrees();

    // 7. 4-Season Weather Particles & Day/Night Atmosphere Overlay
    this.atmosphere = new SeasonAtmosphereOverlay(this, MAP_W, MAP_H);
    this.glowLights.forEach((g) => this.atmosphere?.registerGlowLight(g));

    // 8. 10-Layer Human Chibi Player + Soft Ground Shadow
    this.player = new Player(this, this.spawnX, this.spawnY, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);
    this.gateLockUntil = this.time.now + 850;

    // 8B. Living Khmer Villager NPCs patrolling this map!
    this.npcs = getNpcsForMap(this.mapId).map(
      (npcDef) =>
        new NpcVillager(this, npcDef, (npcId) => {
          soundManager.playSfx('click');
          EventBus.emit('npc:openDialogue', { npcId });
        })
    );

    // 9. Scheduled Animated Green Village Bus in Central Plaza
    if (this.mapId === 'central_plaza') {
      this.time.delayedCall(3500, () => {
        if (this.scene.isActive('OverworldScene') && this.mapId === 'central_plaza') {
          this.spawnScheduledGreenBus();
        }
      });
      this.busTimer = this.time.addEvent({
        delay: 25000,
        loop: true,
        callback: () => {
          if (this.scene.isActive('OverworldScene') && this.mapId === 'central_plaza') {
            this.spawnScheduledGreenBus();
          }
        },
      });
    }

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

    // 10. Crisp Responsive Camera Zoom + Smooth Follow
    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    if (this.arrivalGoldenFlash) {
      this.cameras.main.flash(240, 250, 204, 21);
      soundManager.playSfx('magic');
    } else {
      this.cameras.main.fadeIn(200, 10, 14, 24);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,V,H') as Record<
      'W' | 'A' | 'S' | 'D' | 'E' | 'V' | 'H',
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
        this.player.applyLoadoutUpdate(loadout, { ...playerState, currentMapId: this.mapId });
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
        this.player.syncPlayerState({ ...nextState, currentMapId: this.mapId });
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
        this.player.syncPlayerState({ ...playerState, currentMapId: this.mapId });
        const targetArea = channelToAreaId(playerState.areaChannel);
        void this.connectToPlazaArea(targetArea, false);
      }),
      EventBus.on('network:switchArea', ({ areaId }) => {
        void this.connectToPlazaArea(areaId, true);
      }),
      EventBus.on('dungeon:enterRequest', ({ bossId, difficulty, partyMode, partyId }) => {
        this.enterDungeon(bossId, difficulty, partyMode ?? 'solo', partyId);
      }),
      EventBus.on('cavern:enterRequest', ({ returnMapId }) => {
        this.enterCavernExplore(returnMapId);
      }),
      EventBus.on('tower:enterRequest', ({ floor, partyMode }) => {
        this.enterPagodaTower(floor, partyMode);
      }),
      EventBus.on('worldEvent:changed', (snap) => {
        this.syncWorldEventVisuals(snap);
      }),
      EventBus.on('travel:execute', (req) => {
        this.handleTravelRequest(req);
      }),
      EventBus.on('input:interact', () => {
        this.tryInteractNearest();
      })
    );

    EventBus.emit('scene:ready', { zone: 'overworld' });
    EventBus.emit('player:state', { ...this.player.state, zone: 'overworld', currentMapId: this.mapId });
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'dungeon' });

    const initialArea = channelToAreaId(this.player.state.areaChannel);
    void this.connectToPlazaArea(initialArea, false);
    this.syncWorldEventVisuals(worldEventManager.getActiveEvent());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearWorldEventVisuals();
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.busTimer?.remove(false);
      this.busTimer = undefined;
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.clearRemotePlayers();
      this.npcs.forEach((n) => n.destroy());
      this.npcs = [];
      this.statueDolls.forEach((d) => d.destroy());
      this.statueDolls = [];
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
    EventBus.emit('player:state', { ...this.player.state, currentMapId: this.mapId });

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
    const zoom = w < 640 ? 2.25 : w < 1100 ? 2.5 : 2.7;
    this.cameras.main.setZoom(zoom);
  };

  private buildCohesiveHorizonTreeline(): void {
    const hasNorthPortal = this.mapPortals.some((p) => p.edge === 'north');
    const canopyTrees =
      this.mapId === 'green_park'
        ? (['na_palm_tree', 'sugar_palm_tree', 'golden_durian_tree', 'sv_tree_green'] as const)
        : (['sv_tree_green', 'sv_tree_teal', 'na_palm_tree', 'sugar_palm_tree'] as const);

    for (let x = 32; x <= MAP_W - 32; x += 46) {
      if (hasNorthPortal && Math.abs(x - 800) < 76) continue;
      const idx = Math.floor(x / 46);
      const tex = canopyTrees[idx % canopyTrees.length];
      const ty = 74 + (idx % 2) * 14;
      this.add.image(x, ty, 'soft_shadow').setDisplaySize(36, 12).setDepth(ty - 2);
      const tree = this.add.image(x, ty, tex).setOrigin(0.5, 0.92).setScale(1.06).setDepth(ty);
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

  private buildRoadsAndCourtyards(): void {
    const borderGfx = this.add.graphics().setDepth(1);
    borderGfx.fillStyle(0x8d6339, 0.85);

    const hasNorth = this.mapPortals.some((p) => p.edge === 'north');
    const hasSouth = this.mapPortals.some((p) => p.edge === 'south');
    const hasWest = this.mapPortals.some((p) => p.edge === 'west');
    const hasEast = this.mapPortals.some((p) => p.edge === 'east');

    // Horizontal road (y = 600)
    if (hasWest || hasEast) {
      const rx1 = hasWest ? 100 : 480;
      const rx2 = hasEast ? MAP_W - 100 : 1120;
      borderGfx.fillRoundedRect(rx1, 566, rx2 - rx1, 68, 10);
      this.add.tileSprite((rx1 + rx2) / 2, 600, rx2 - rx1 - 8, 58, 'sv_path').setDepth(2);
    }

    // Vertical road (x = 800)
    if (hasNorth || hasSouth) {
      const ry1 = hasNorth ? 115 : 460;
      const ry2 = hasSouth ? MAP_H - 95 : 740;
      borderGfx.fillRoundedRect(766, ry1, 68, ry2 - ry1, 10);
      this.add.tileSprite(800, (ry1 + ry2) / 2, 58, ry2 - ry1 - 8, 'sv_path').setDepth(2);
    }

    // Map-specific central cobblestone plaza / boulevard / sanctuary courtyard
    if (this.mapId === 'central_plaza') {
      borderGfx.fillStyle(0x7c5b3b, 0.9);
      borderGfx.fillRoundedRect(572, 452, 456, 296, 14);
      this.add.tileSprite(800, 600, 444, 284, 'sv_plaza_tile').setDepth(3);
      const frame = this.add.graphics().setDepth(4);
      frame.lineStyle(2, 0xd6b47c, 0.9);
      frame.strokeRoundedRect(584, 464, 432, 272, 10);
    } else if (this.mapId === 'market_street') {
      borderGfx.fillStyle(0x7c5b3b, 0.9);
      borderGfx.fillRoundedRect(260, 520, 1080, 160, 14);
      this.add.tileSprite(800, 600, 1066, 146, 'sv_plaza_tile').setDepth(3);
    } else if (this.mapId === 'temple_district') {
      borderGfx.fillStyle(0x7c5b3b, 0.9);
      borderGfx.fillRoundedRect(350, 270, 900, 560, 16);
      this.add.tileSprite(800, 550, 886, 546, 'sv_plaza_tile').setDepth(3);
      const frame = this.add.graphics().setDepth(4);
      frame.lineStyle(2, 0xfacc15, 0.65);
      frame.strokeRoundedRect(366, 286, 868, 528, 12);
    } else if (this.mapId === 'green_park') {
      borderGfx.fillStyle(0x7c5b3b, 0.85);
      borderGfx.fillRoundedRect(640, 460, 320, 190, 14);
      this.add.tileSprite(800, 555, 308, 178, 'sv_plaza_tile').setDepth(3);
    } else if (this.mapId === 'wild_frontier') {
      // Branching dirt trail into northern Shimmer woods and eastern Mini-Boss clearing
      borderGfx.fillRoundedRect(760, 290, 560, 52, 10);
      this.add.tileSprite(1040, 316, 548, 42, 'sv_path').setDepth(2);
      borderGfx.fillRoundedRect(760, 316, 52, 310, 10);
      this.add.tileSprite(786, 471, 42, 298, 'sv_path').setDepth(2);
      borderGfx.fillRoundedRect(880, 725, 420, 56, 10);
      this.add.tileSprite(1090, 753, 408, 46, 'sv_path').setDepth(2);
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
        .text(opts.x, opts.y + 6, opts.label, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.86)',
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

  private addLanternPost(x: number, y: number): void {
    this.add.image(x, y + 6, 'soft_shadow').setScale(0.28, 0.2).setDepth(y);
    this.add.image(x, y, 'na_lantern').setOrigin(0.5, 0.85).setDepth(y + 1);
    const lGlow = this.add
      .image(x, y - 14, 'torch_glow')
      .setScale(0.54)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.36);
    this.glowLights.push(lGlow);
  }

  // ==================== MAP 1: CENTRAL PLAZA (SPACIOUS HUB) ====================
  private buildCentralPlazaMap(): void {
    // Central Campfire / Fountain Courtyard
    const fireGlow = this.add
      .image(800, 595, 'torch_glow')
      .setScale(0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.52);
    this.glowLights.push(fireGlow);
    const fire = this.add.sprite(800, 595, 'sv_campfire_16', 0).setScale(1.3).setDepth(595);
    if (this.anims.exists('campfire_burn')) fire.play('campfire_burn');

    // Cozy Plaza Benches & Corner Lantern Posts
    for (const [bx, by] of [[700, 540], [900, 540], [700, 665], [900, 665]]) {
      this.add.image(bx, by + 2, 'soft_shadow').setScale(0.75, 0.35).setDepth(by - 1);
      this.add.image(bx, by, 'na_bench').setDepth(by);
    }
    for (const [lx, ly] of [[600, 480], [1000, 480], [600, 720], [1000, 720]]) {
      this.addLanternPost(lx, ly);
    }

    // Wildflowers & pebbles spaced around the wide lawn
    for (const [fx, fy] of [[420, 470], [1180, 470], [420, 790], [1180, 790], [640, 880], [960, 880]]) {
      this.add.image(fx, fy, 'sv_flowers').setDepth(4);
    }
    for (const [px, py] of [[640, 505], [955, 505], [640, 695], [955, 695]]) {
      this.add.image(px, py, 'na_pebbles').setDepth(4);
    }

    // 1. AREA 0 Wooden Street Sign
    const signImg = this.addBuildingOrProp({
      texture: 'sv_sign_wood',
      x: 642,
      y: 600,
      scale: 1.2,
      shadowW: 20,
      shadowH: 7,
      bodyW: 14,
      bodyH: 8,
    });
    signImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'areaSwitcher' });
    });
    this.areaSignText = this.add
      .text(642, 574, channelToAreaId(this.initialState.areaChannel), {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1d4ed8',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5)
      .setDepth(612)
      .setInteractive({ useHandCursor: true });
    this.areaSignText.on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'areaSwitcher' });
    });
    this.landmarks.push({
      x: 642,
      y: 604,
      radius: 46,
      label: 'Press [E] or Click → Switch Multiplayer Area (AREA 0 / 1 / 2)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'areaSwitcher' }),
    });

    // 2. EXPRESS BUS STOP + WAITING BENCH (West-Center Avenue)
    const busStop = this.addBuildingOrProp({
      texture: 'bus_stop_sign',
      x: 455,
      y: 660,
      scale: 1.2,
      shadowW: 28,
      shadowH: 9,
      label: 'EXPRESS BUS STOP',
      joinArrowY: 610,
    });
    this.add.image(420, 660, 'soft_shadow').setDisplaySize(32, 9).setDepth(656);
    this.add.image(420, 658, 'na_bench').setScale(0.78).setDepth(659);
    busStop.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });
    this.landmarks.push({
      x: 455,
      y: 660,
      radius: 52,
      label: 'Press [E] or Click → Express Bus & Fullscreen World Map [M]',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'worldMap' }),
    });

    // 3. ATM BANK VAULT (North-West Lawn — generous spacing!)
    const atmImg = this.addBuildingOrProp({
      texture: 'atm_kiosk',
      x: 520,
      y: 355,
      scale: 1.25,
      shadowW: 62,
      shadowH: 16,
      bodyW: 46,
      bodyH: 22,
      label: 'ATM BANK VAULT',
      joinArrowY: 285,
    });
    this.add.image(552, 355, 'na_chest').setScale(1.12).setOrigin(0.5, 0.9).setDepth(357);
    this.add.image(520, 304, 'na_gold_coin').setScale(1.55).setDepth(360);
    atmImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'bank' });
    });
    this.landmarks.push({
      x: 520,
      y: 365,
      radius: 58,
      label: 'Press [E] or Click → ATM Bank Vault (Safe Coin Storage)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'bank' }),
    });

    // 4. LUCKY WHEEL STALL + ANIMATED WHEEL (North-East Lawn — generous spacing!)
    this.add.image(1080, 358, 'market_goods_b').setScale(1.22).setDepth(359);
    const wheelStall = this.addBuildingOrProp({
      texture: 'lucky_wheel_kiosk',
      x: 1080,
      y: 362,
      scale: 1.32,
      shadowW: 60,
      shadowH: 16,
      bodyW: 46,
      bodyH: 20,
      label: 'LUCKY WHEEL',
      joinArrowY: 292,
    });
    const luckyWheelProp = this.add
      .sprite(1080, 332, 'na_wheel_prop', 0)
      .setScale(0.45)
      .setTint(0xfde047)
      .setDepth(368)
      .setInteractive({ useHandCursor: true });
    if (this.anims.exists('lucky_wheel_spin')) luckyWheelProp.play('lucky_wheel_spin');
    const openWheel = () => EventBus.emit('ui:openModal', { modal: 'luckyWheel' });
    wheelStall.setInteractive({ useHandCursor: true }).on('pointerdown', openWheel);
    luckyWheelProp.on('pointerdown', openWheel);
    this.landmarks.push({
      x: 1080,
      y: 372,
      radius: 56,
      label: 'Press [E] or Click → Spin Royal Lucky Wheel (Coins / Gold)',
      isDungeonPortal: false,
      onInteract: openWheel,
    });

    // 5. KHMER STILT HOUSE (Enterable Customizable Interior! West Road Gate enters FarmScene)
    const homeImg = this.addBuildingOrProp({
      texture: 'khmer_stilt_house',
      x: 280,
      y: 485,
      scale: 0.72,
      shadowW: 94,
      shadowH: 26,
      bodyW: 68,
      bodyH: 30,
      label: 'MY KHMER HOME · ENTER',
      joinArrowY: 375,
    });
    homeImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.enterHouseInterior());
    this.landmarks.push({
      x: 280,
      y: 498,
      radius: 66,
      label: 'Press [E] or Click → Enter My Khmer Stilt House (Decorate & Rest)',
      isDungeonPortal: false,
      onInteract: () => this.enterHouseInterior(),
    });

    // 6. PHYSICAL PLAZA "TOP TEN" HALL OF FAME — 3 LIVE #1 AVATAR STATUES (North Terrace!)
    this.buildPlazaHallOfFameStatues();
  }

  private buildPlazaHallOfFameStatues(): void {
    const podiums: Array<{
      category: 'farmer' | 'stylish' | 'slayer';
      x: number;
      y: number;
      title: string;
      tint: number;
    }> = [
      { category: 'farmer', x: 695, y: 455, title: '🌾 #1 GREATEST FARMER', tint: 0x4ade80 },
      { category: 'stylish', x: 800, y: 440, title: '👑 #1 MOST STYLISH', tint: 0xfacc15 },
      { category: 'slayer', x: 905, y: 455, title: '⚔️ #1 BOSS SLAYER', tint: 0xf43f5e },
    ];

    // Carved stone Hall of Fame banner behind center podium
    this.add
      .text(800, 384, '🏛️ PLAZA HALL OF FAME · TOP TEN STATUES', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 8, y: 3 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5)
      .setDepth(210);

    const nameTexts: Record<'farmer' | 'stylish' | 'slayer', Phaser.GameObjects.Text> = {} as Record<
      'farmer' | 'stylish' | 'slayer',
      Phaser.GameObjects.Text
    >;

    for (const p of podiums) {
      // Glowing sandstone pedestal
      const glow = this.add
        .image(p.x, p.y - 12, 'torch_glow')
        .setTint(p.tint)
        .setScale(0.68)
        .setAlpha(0.52)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(p.y - 4);
      this.glowLights.push(glow);

      const ped = this.add
        .rectangle(p.x, p.y, 44, 18, 0x78716c)
        .setStrokeStyle(2, p.tint)
        .setDepth(p.y - 2)
        .setInteractive({ useHandCursor: true });
      const openBoard = () => {
        if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
        EventBus.emit('ui:openModal', { modal: 'leaderboard', leaderboardCategory: p.category });
      };
      ped.on('pointerdown', openBoard);

      this.add
        .text(p.x, p.y + 11, p.title, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.86)',
          padding: { x: 4, y: 1 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(p.y + 12);

      nameTexts[p.category] = this.add
        .text(p.x, p.y + 21, 'Loading...', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#e2e8f0',
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          padding: { x: 4, y: 1 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(p.y + 12);

      this.landmarks.push({
        x: p.x,
        y: p.y + 8,
        radius: 48,
        label: `Press [E] or Click → View Plaza TOP TEN Leaderboard (${p.title})`,
        isDungeonPortal: false,
        onInteract: openBoard,
      });
    }

    // Fetch live #1 avatars from /api/leaderboard (with offline fallback) & render real Human PaperDolls!
    void fetchLeaderboard(this.initialState).then((board) => {
      if (!this.scene || !this.scene.isActive('OverworldScene') || this.mapId !== 'central_plaza') return;
      for (const p of podiums) {
        const champ = board[p.category]?.[0];
        if (!champ) continue;
        nameTexts[p.category]?.setText(champ.username);
        const doll = new PaperDoll(this, p.x, p.y - 4, champ.loadout, `statue_${p.category}`);
        doll.setScale(0.52);
        doll.setDepth(p.y + 6);
        doll.setPoseAndFacing('idle', 'down', 0);
        this.statueDolls.push(doll);
      }
    });
  }

  // ==================== MAP 2: MARKET STREET (WIDE LANTERN AVENUE) ====================
  private buildMarketStreetMap(): void {
    // Lantern-lined shopping boulevard
    for (const lx of [340, 620, 980, 1260]) {
      this.addLanternPost(lx, 526);
      this.addLanternPost(lx, 676);
    }
    for (const [bx, by] of [[480, 540], [800, 540], [1120, 540]]) {
      this.add.image(bx, by + 2, 'soft_shadow').setScale(0.75, 0.35).setDepth(by - 1);
      this.add.image(bx, by, 'na_bench').setDepth(by);
    }

    // 1. NUM PANG STREET SNACK CART (North-West)
    const cart = this.addBuildingOrProp({
      texture: 'num_pang_cart',
      x: 400,
      y: 445,
      scale: 0.62,
      shadowW: 62,
      shadowH: 18,
      bodyW: 44,
      bodyH: 22,
      label: 'NUM PANG CART · SNACKS',
      joinArrowY: 365,
    });
    cart.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'snackShop', shopTab: 'primary' });
    });
    this.landmarks.push({
      x: 400,
      y: 460,
      radius: 60,
      label: 'Press [E] or Click → Street Snack Cart & Farm Kitchen',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'snackShop', shopTab: 'primary' }),
    });

    // 2. FASHION BOUTIQUE & SALON (North-Center)
    const boutique = this.addBuildingOrProp({
      texture: 'fashion_boutique',
      x: 800,
      y: 438,
      scale: 1.5,
      shadowW: 84,
      shadowH: 24,
      bodyW: 64,
      bodyH: 28,
      label: 'FASHION BOUTIQUE & SALON',
      joinArrowY: 356,
    });
    this.add.image(800, 456, 'sv_flower_box').setScale(0.95).setDepth(456);
    boutique.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'fashionShop', shopTab: 'primary' });
    });
    this.landmarks.push({
      x: 800,
      y: 458,
      radius: 64,
      label: 'Press [E] or Click → Fashion Boutique, Premium Sets & Hair Mirror',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'fashionShop', shopTab: 'primary' }),
    });

    // 3. BLACKSMITH FORGE + ANVIL + MASTER SOMNANG NPC (North-East)
    const forge = this.addBuildingOrProp({
      texture: 'blacksmith_anvil',
      x: 1185,
      y: 442,
      scale: 1.25,
      shadowW: 46,
      shadowH: 14,
      bodyW: 36,
      bodyH: 20,
      label: 'BLACKSMITH · REFORGE',
      joinArrowY: 374,
    });
    this.add.image(1154, 444, 'soft_shadow').setDisplaySize(20, 7).setDepth(440);
    this.add
      .image(1154, 442, 'na_anvil')
      .setScale(1.2)
      .setOrigin(0.5, 0.9)
      .setDepth(444)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' }));

    this.add.image(1222, 444, 'soft_shadow').setDisplaySize(24, 8).setDepth(440);
    const masterNpc = this.add
      .sprite(1222, 444, 'char_master', 0)
      .setOrigin(0.5, 0.92)
      .setScale(1.3)
      .setDepth(445)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: masterNpc, y: 442, duration: 520, yoyo: true, repeat: -1 });
    const openForge = () => EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' });
    forge.setInteractive({ useHandCursor: true }).on('pointerdown', openForge);
    masterNpc.on('pointerdown', openForge);
    this.landmarks.push({
      x: 1195,
      y: 454,
      radius: 62,
      label: 'Press [E] or Click → Master Somnang Blacksmith (Reforge & Khmer Mythic Arsenal)',
      isDungeonPortal: false,
      onInteract: openForge,
    });

    // 4. VILLAGE MARKET (5% TAX) STALL (South-West)
    this.add.image(560, 810, 'market_goods_a').setScale(1.22).setDepth(812);
    const market = this.addBuildingOrProp({
      texture: 'market_board',
      x: 560,
      y: 816,
      scale: 1.34,
      shadowW: 62,
      shadowH: 16,
      bodyW: 46,
      bodyH: 20,
      label: 'VILLAGE MARKET (5% TAX)',
      joinArrowY: 752,
    });
    market.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'market' });
    });
    this.landmarks.push({
      x: 560,
      y: 826,
      radius: 58,
      label: 'Press [E] or Click → Player Trading Market Board (5% Tax)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'market' }),
    });

    // 5. PHUM NIGHT CLUB ENTRANCE (South-East)
    const club = this.addBuildingOrProp({
      texture: 'club_building',
      x: 1060,
      y: 820,
      scale: 1.4,
      shadowW: 86,
      shadowH: 22,
      bodyW: 64,
      bodyH: 28,
      label: 'PHUM CLUB · KLA KLOK & OUK',
      joinArrowY: 742,
    });
    club.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.enterClub());
    this.landmarks.push({
      x: 1060,
      y: 830,
      radius: 62,
      label: 'Press [E] or Click → Enter Phum Club (Kla Klok, Ouk Chaktrang & Tien Len)',
      isDungeonPortal: true,
      onInteract: () => this.enterClub(),
    });
  }

  // ==================== MAP 3: TEMPLE DISTRICT (PAGODA & 3-ARCH PORTAL HALL) ====================
  private buildTempleDistrictMap(): void {
    // Singha Guardian Statues & Flickering Braziers along the sacred terrace
    for (const [sx, sy] of [[700, 880], [900, 880], [700, 740], [900, 740]]) {
      this.add.image(sx, sy + 2, 'soft_shadow').setDisplaySize(36, 12).setDepth(sy - 2);
      this.add.image(sx, sy, 'na_singha_statue').setOrigin(0.5, 0.9).setScale(1.08).setDepth(sy);
    }
    for (const [fx, fy] of [[410, 440], [1190, 440], [410, 770], [1190, 770]]) {
      const fire = this.add.sprite(fx, fy, 'sv_campfire_16', 0).setScale(1.2).setDepth(fy);
      if (this.anims.exists('campfire_burn')) fire.play('campfire_burn');
      const g = this.add
        .image(fx, fy - 4, 'torch_glow')
        .setScale(0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2140)
        .setAlpha(0.45);
      this.glowLights.push(g);
    }

    // 1. ANCIENT PAGODA (6 OFFERING ALTARS / BUNDLES) — West Courtyard
    const pagoda = this.addBuildingOrProp({
      texture: 'ancient_pagoda',
      x: 455,
      y: 635,
      scale: 1.5,
      shadowW: 98,
      shadowH: 24,
      bodyW: 72,
      bodyH: 28,
      label: 'ANCIENT PAGODA · BUNDLES',
      joinArrowY: 545,
    });
    pagoda.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'pagoda' });
    });
    this.landmarks.push({
      x: 455,
      y: 650,
      radius: 66,
      label: 'Press [E] or Click → Ancient Pagoda Restoration (6 Offering Altars)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'pagoda' }),
    });

    // 2. ANGKOR DUNGEON PORTAL — East Courtyard
    const portalGlow = this.add
      .image(1145, 592, 'portal_vortex')
      .setScale(1.25)
      .setAlpha(0.58)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(625);
    this.tweens.add({ targets: portalGlow, alpha: 0.28, scale: 1.4, duration: 900, yoyo: true, repeat: -1 });
    const angkor = this.addBuildingOrProp({
      texture: 'angkor_portal',
      x: 1145,
      y: 642,
      scale: 0.72,
      shadowW: 96,
      shadowH: 24,
      bodyW: 62,
      bodyH: 26,
      label: 'ANGKOR DUNGEON PORTAL',
      joinArrowY: 506,
    });
    angkor.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'modeSelector' });
    });
    this.landmarks.push({
      x: 1145,
      y: 656,
      radius: 68,
      label: 'Press [E] or Click → Choose Khmer Boss & Difficulty (Solo / Co-op)',
      isDungeonPortal: true,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'modeSelector' }),
    });

    // 3. PORTAL HALL (3 GLOWING STONE ARCHWAYS ON NORTH TERRACE)
    const portalHallEntries: Array<{
      x: number;
      y: number;
      tint: number;
      title: string;
      prompt: string;
      onEnter: () => void;
    }> = [
      {
        x: 520,
        y: 345,
        tint: 0x22c55e,
        title: 'CAVERN I · KING FROG',
        prompt: 'Press [E] or Click → Direct Boss Cavern: Sdech Kongkaeb (Muddy Rice Hollow)',
        onEnter: () => this.enterDungeon('sdech_kongkaeb', 'normal', 'solo'),
      },
      {
        x: 800,
        y: 325,
        tint: 0xf59e0b,
        title: 'CAVERN II · YEAK THMOR',
        prompt: 'Press [E] or Click → Direct Boss Cavern: Yeak Thmor (Stone Yaksha Sanctum)',
        onEnter: () => this.enterDungeon('yeak_thmor', 'expert', 'solo'),
      },
      {
        x: 1080,
        y: 345,
        tint: 0xc084fc,
        title: 'ENDLESS PAGODA TOWER',
        prompt: 'Press [E] or Click → Endless 50-Floor Pagoda Tower (Checkpoints & Weapon Auras)',
        onEnter: () => {
          EventBus.emit('ui:openModal', { modal: 'pagodaTower' });
        },
      },
      {
        x: 1335,
        y: 385,
        tint: 0x10b981,
        title: 'MINING CAVERNS · ORES',
        prompt: 'Press [E] or Click → Enter Side-Scrolling Underground Caverns (Ores, Relic Chests & Grapple)',
        onEnter: () => this.enterCavernExplore('temple_district'),
      },
    ];

    for (const arch of portalHallEntries) {
      const aura = this.add
        .image(arch.x, arch.y - 22, 'portal_vortex')
        .setTint(arch.tint)
        .setScale(0.95)
        .setAlpha(0.6)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(arch.y - 2);
      this.tweens.add({ targets: aura, alpha: 0.25, scale: 1.12, duration: 850, yoyo: true, repeat: -1 });

      const gate = this.addBuildingOrProp({
        texture: 'angkor_arch_gate',
        x: arch.x,
        y: arch.y,
        scale: 1.3,
        shadowW: 72,
        shadowH: 18,
        label: arch.title,
        joinArrowY: arch.y - 68,
      });
      gate.setInteractive({ useHandCursor: true }).on('pointerdown', arch.onEnter);
      this.landmarks.push({
        x: arch.x,
        y: arch.y + 8,
        radius: 56,
        label: arch.prompt,
        isDungeonPortal: true,
        onInteract: arch.onEnter,
      });
    }

    // 4. ANGKOR RELIC HALL (MUSEUM) — Center Courtyard with glowing yellow JOIN arrow
    const museumAura = this.add
      .image(800, 598, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(1.25)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(620);
    this.glowLights.push(museumAura);

    const museum = this.addBuildingOrProp({
      texture: 'ancient_pagoda',
      x: 800,
      y: 635,
      scale: 1.38,
      shadowW: 92,
      shadowH: 22,
      bodyW: 66,
      bodyH: 26,
      label: 'ANGKOR RELIC HALL · MUSEUM',
      joinArrowY: 545,
    });
    museum.setTint(0xfef3c7);
    museum.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      EventBus.emit('ui:openModal', { modal: 'museum' });
    });
    this.landmarks.push({
      x: 800,
      y: 652,
      radius: 66,
      label: 'Press [E] or Click → Enter Angkor Relic Hall (Museum & Scholar Perks)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'museum' }),
    });
  }

  // ==================== MAP 4: GREEN PARK & RIVERSIDE PIER ====================
  private buildGreenParkMap(): void {
    // Lush Sugar Palm & Golden Durian Groves + Flower Beds
    for (const [tx, ty, tex] of [
      [270, 340, 'sugar_palm_tree'],
      [350, 260, 'golden_durian_tree'],
      [1260, 280, 'sugar_palm_tree'],
      [1330, 380, 'golden_durian_tree'],
      [280, 620, 'golden_durian_tree'],
      [1310, 660, 'sugar_palm_tree'],
    ] as Array<[number, number, string]>) {
      this.addBuildingOrProp({
        texture: tex,
        x: tx,
        y: ty,
        scale: 1.05,
        shadowW: 40,
        shadowH: 13,
        bodyW: 18,
        bodyH: 12,
      });
    }
    for (const [fx, fy] of [[490, 480], [1110, 480], [670, 560], [930, 560]]) {
      this.add.image(fx, fy, 'sv_blossoms').setScale(1.05).setDepth(4);
    }

    // 1. GOLDEN BLESSING SHRINE (Daily +250c & +10% Luck)
    const shrineGlow = this.add
      .image(490, 420, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(0.86)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.58);
    this.glowLights.push(shrineGlow);
    const goldenShrineImg = this.addBuildingOrProp({
      texture: 'golden_shrine',
      x: 490,
      y: 445,
      scale: 1.35,
      shadowW: 58,
      shadowH: 16,
      bodyW: 36,
      bodyH: 16,
      label: 'GOLDEN SHRINE · DAILY',
      joinArrowY: 386,
    });
    const prayAtShrine = () => {
      this.cameras.main.flash(220, 250, 204, 21);
      EventBus.emit('shrine:pray');
    };
    goldenShrineImg.setInteractive({ useHandCursor: true }).on('pointerdown', prayAtShrine);
    this.landmarks.push({
      x: 490,
      y: 455,
      radius: 58,
      label: 'Press [E] or Click → Pray at Golden Blessing Shrine (+250 Coins & +10% Luck 10m)',
      isDungeonPortal: false,
      onInteract: prayAtShrine,
    });

    // 2. BIOME PYLON SHRINE (World Map & Angkor Pylons)
    const pylonGlow = this.add
      .image(1110, 420, 'torch_glow')
      .setTint(0x38bdf8)
      .setScale(0.76)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.5);
    this.glowLights.push(pylonGlow);
    const pylonImg = this.addBuildingOrProp({
      texture: 'pylon_shrine',
      x: 1110,
      y: 445,
      scale: 1.35,
      shadowW: 48,
      shadowH: 15,
      bodyW: 30,
      bodyH: 18,
      label: 'BIOME PYLON SHRINE',
      joinArrowY: 386,
    });
    pylonImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });
    this.landmarks.push({
      x: 1110,
      y: 455,
      radius: 58,
      label: 'Press [E] or Click → Biome Pylon Network & World Map [M]',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'worldMap' }),
    });

    // Active Dungeon Return Portal beside Pylon Shrine
    const activeReturn = travelManager.getReturnPortal();
    if (activeReturn) {
      const rpGlow = this.add
        .image(1175, 430, 'portal_vortex')
        .setTint(0x38bdf8)
        .setScale(0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(450)
        .setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: rpGlow, scale: 1.12, alpha: 0.55, duration: 750, yoyo: true, repeat: -1 });
      rpGlow.on('pointerdown', () => {
        travelManager.setReturnPortal(null);
        this.enterDungeon(activeReturn.bossId, activeReturn.difficulty, activeReturn.partyMode);
      });
    }

    // 3. DUCK POND (Center-South — real bordered pond + ripples + swimming ducks/frogs!)
    this.add.image(960, 825, 'sv_pond').setDisplaySize(290, 175).setDepth(3);
    const duckPondCol = this.add.rectangle(960, 830, 230, 115, 0x000000, 0);
    this.colliders.add(duckPondCol);
    for (const [rx, ry] of [[910, 810], [1005, 845], [955, 790]]) {
      const rip = this.add.sprite(rx, ry, 'na_ripples', 0).setScale(1.2).setDepth(5).setAlpha(0.75);
      if (this.anims.exists('water_ripples_blue')) rip.play('water_ripples_blue');
    }
    // Cute swimming pond critters gently gliding across the Duck Pond
    const swimmerA = this.add.sprite(915, 825, 'pet_frog', 0).setScale(1.15).setTint(0xfef08a).setDepth(10);
    if (this.anims.exists('pet_frog_idle')) swimmerA.play('pet_frog_idle');
    this.tweens.add({ targets: swimmerA, x: 1015, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .text(960, 916, 'DUCK POND · TRANQUIL SANCTUARY', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#bae6fd',
        backgroundColor: 'rgba(15, 23, 42, 0.84)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5, 0)
      .setDepth(20);

    // 4. RIVERSIDE FISHING PIER (South-West — real bordered pond + wooden pier + fishing boat!)
    this.add.image(440, 840, 'sv_pond').setDisplaySize(270, 165).setDepth(3);
    const fishPondCol = this.add.rectangle(415, 850, 185, 105, 0x000000, 0);
    this.colliders.add(fishPondCol);
    const boat = this.add.image(365, 845, 'na_boat').setScale(0.75).setDepth(12);
    this.tweens.add({ targets: boat, y: 850, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const pier = this.addBuildingOrProp({
      texture: 'fishing_pier',
      x: 525,
      y: 825,
      scale: 1.25,
      shadowW: 52,
      shadowH: 15,
      label: 'RIVERSIDE FISHING PIER',
      joinArrowY: 758,
    });
    pier.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      EventBus.emit('ui:openModal', { modal: 'fishing' });
    });
    this.landmarks.push({
      x: 535,
      y: 815,
      radius: 66,
      label: 'Press [E] or Click → Cast Line at Riverside Fishing Pier',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'fishing' }),
    });
  }

  // ==================== MAP 5: WILD FRONTIER (HERBS, LATERITE, SHIMMER & MINI-BOSS) ====================
  private buildWildFrontierMap(): void {
    // Mossy ancient Khmer ruins & wild palm backdrop
    for (const [rx, ry, tex] of [
      [420, 260, 'na_ruin_wall'],
      [1040, 240, 'na_ruin_wall'],
      [540, 910, 'na_ruin_statue'],
      [1370, 910, 'na_ruin_pillar'],
    ] as Array<[number, number, string]>) {
      this.addBuildingOrProp({
        texture: tex,
        x: rx,
        y: ry,
        scale: 1.2,
        shadowW: 54,
        shadowH: 15,
        bodyW: 40,
        bodyH: 20,
      });
    }

    // 1. 6 FORAGEABLE KHMER HERB NODES (Grants Foraging XP + real herbs!)
    const herbSpots: Array<[number, number, string, string]> = [
      [360, 430, 'crop_phka_rumduol', 'Phka Rumduol Herb'],
      [560, 390, 'crop_slek_krey', 'Wild Lemongrass'],
      [660, 770, 'crop_trakuon', 'Water Morning Glory'],
      [420, 840, 'crop_phka_rumduol', 'Wild Jasmine Blossom'],
      [920, 470, 'crop_slek_krey', 'Kampot Wild Herb'],
      [1240, 560, 'crop_phka_rumduol', 'Sacred Forest Lotus'],
    ];
    herbSpots.forEach(([hx, hy, itemId, herbName], idx) => {
      const sprite = this.add
        .image(hx, hy, idx % 2 === 0 ? 'sv_blossoms' : 'sv_flowers')
        .setScale(1.1)
        .setDepth(hy)
        .setInteractive({ useHandCursor: true });
      const labelText = this.add
        .text(hx, hy + 14, `🌿 ${herbName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#bbf7d0',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(hy + 4);

      const node: GatherNode = { id: `herb_${idx}`, kind: 'herb', x: hx, y: hy, sprite, labelText, ready: true };
      this.gatherNodes.push(node);

      const harvestHerb = () => {
        if (!node.ready) return;
        node.ready = false;
        soundManager.playSfx('harvest');
        sprite.setAlpha(0.28).setScale(0.8);
        labelText.setText('Regrowing...');
        this.spawnFloatingText(hx, hy - 14, '+22 Foraging XP', '#4ade80');
        EventBus.emit('frontier:gather', {
          skillId: 'foraging',
          xp: 22,
          itemId,
          label: `Foraged ${herbName} (+22 Foraging XP)!`,
        });
        this.time.delayedCall(18000, () => {
          if (!sprite.active) return;
          node.ready = true;
          sprite.setAlpha(1).setScale(1.1);
          labelText.setText(`🌿 ${herbName}`);
        });
      };
      sprite.on('pointerdown', harvestHerb);
      this.landmarks.push({
        x: hx,
        y: hy,
        radius: 48,
        label: `Press [E] or Click → Forage ${herbName} (+22 Foraging XP)`,
        isDungeonPortal: false,
        onInteract: harvestHerb,
      });
    });

    // 2. 6 MINEABLE LATERITE ROCK NODES (Grants Mining XP + Coins!)
    const rockSpots: Array<[number, number, string]> = [
      [520, 680, 'Laterite Vein'],
      [740, 880, 'Copper Laterite'],
      [880, 620, 'Iron Laterite'],
      [1040, 390, 'Gold-Flecked Laterite'],
      [1340, 640, 'Deep Laterite Ore'],
      [1180, 920, 'Angkor Sandstone Node'],
    ];
    rockSpots.forEach(([rx, ry, rockName], idx) => {
      this.add.image(rx, ry + 4, 'soft_shadow').setDisplaySize(44, 14).setDepth(ry - 2);
      const sprite = this.add
        .image(rx, ry, 'lf_boulder')
        .setScale(0.76)
        .setTint(idx % 2 === 0 ? 0xfca5a5 : 0xfdba74)
        .setDepth(ry)
        .setInteractive({ useHandCursor: true });
      const labelText = this.add
        .text(rx, ry + 18, `⛏️ ${rockName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fed7aa',
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(ry + 4);

      const node: GatherNode = { id: `rock_${idx}`, kind: 'rock', x: rx, y: ry, sprite, labelText, ready: true };
      this.gatherNodes.push(node);

      const mineRock = () => {
        if (!node.ready) return;
        node.ready = false;
        soundManager.playSfx('hit');
        this.cameras.main.shake(90, 0.004);
        sprite.setAlpha(0.28).setScale(0.55);
        labelText.setText('Respawning...');
        this.spawnFloatingText(rx, ry - 16, '+26 Mining XP · +18c', '#fbbf24');
        EventBus.emit('frontier:gather', {
          skillId: 'mining',
          xp: 26,
          coins: 18,
          label: `Mined ${rockName} (+26 Mining XP & +18 Coins)!`,
        });
        this.time.delayedCall(20000, () => {
          if (!sprite.active) return;
          node.ready = true;
          sprite.setAlpha(1).setScale(0.76);
          labelText.setText(`⛏️ ${rockName}`);
        });
      };
      sprite.on('pointerdown', mineRock);
      this.landmarks.push({
        x: rx,
        y: ry,
        radius: 52,
        label: `Press [E] or Click → Mine ${rockName} (+26 Mining XP & +18c)`,
        isDungeonPortal: false,
        onInteract: mineRock,
      });
    });

    // 3. HIDDEN APSARA SHIMMER SPRING PORTAL (North-East Sacred Glade!)
    const shimmerGlow = this.add
      .image(1310, 300, 'torch_glow')
      .setTint(0xc084fc)
      .setScale(1.0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2140)
      .setAlpha(0.62);
    this.glowLights.push(shimmerGlow);

    for (const dx of [-16, 16]) {
      const spr = this.add.sprite(1310 + dx, 314, 'na_water_purple', 0).setScale(1.5).setDepth(310);
      if (this.anims.exists('shimmer_ripple')) spr.play('shimmer_ripple');
    }
    const shimmerGate = this.addBuildingOrProp({
      texture: 'angkor_arch_gate',
      x: 1310,
      y: 300,
      scale: 1.15,
      label: 'HIDDEN APSARA SHIMMER SPRING',
      joinArrowY: 232,
    });
    const openShimmer = () => {
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'shimmer' });
    };
    shimmerGate.setInteractive({ useHandCursor: true }).on('pointerdown', openShimmer);
    this.landmarks.push({
      x: 1310,
      y: 318,
      radius: 62,
      label: 'Press [E] or Click → Hidden Apsara Shimmer Spring (Permanent Blessings & Relic Cycle)',
      isDungeonPortal: false,
      onInteract: openShimmer,
    });

    // 3B. CAVERN ENTRANCE PORTAL (North-West Cliffside → Side-Scrolling Explorable Caverns!)
    const cavGlow = this.add
      .image(285, 295, 'portal_vortex')
      .setTint(0x10b981)
      .setScale(1.0)
      .setAlpha(0.65)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(292);
    this.tweens.add({ targets: cavGlow, alpha: 0.28, scale: 1.18, duration: 820, yoyo: true, repeat: -1 });
    const cavGate = this.addBuildingOrProp({
      texture: this.textures.exists('lf_cave_entrance') ? 'lf_cave_entrance' : 'angkor_arch_gate',
      x: 285,
      y: 315,
      scale: this.textures.exists('lf_cave_entrance') ? 0.56 : 1.18,
      shadowW: 66,
      shadowH: 18,
      label: 'CAVERN ENTRANCE · ORES & RELICS',
      joinArrowY: 230,
    });
    const enterFrontierCavern = () => this.enterCavernExplore('wild_frontier');
    cavGate.setInteractive({ useHandCursor: true }).on('pointerdown', enterFrontierCavern);
    this.landmarks.push({
      x: 285,
      y: 332,
      radius: 68,
      label: 'Press [E] or Click → Enter Side-Scrolling Underground Caverns (Mine Ores, Grapple & Relic Chests)',
      isDungeonPortal: true,
      onInteract: enterFrontierCavern,
    });

    // 4. WANDERING FRONTIER MINI-BOSS (Laterite Boar Chieftain patrolling eastern clearing!)
    const bx = 1090;
    const by = 755;
    const mbShadow = this.add.image(bx, by + 12, 'soft_shadow').setDisplaySize(54, 15).setDepth(by - 2);
    const mbSprite = this.add
      .sprite(bx, by, 'boar_idle', 0)
      .setScale(1.45)
      .setTint(0xfca5a5)
      .setDepth(by)
      .setInteractive({ useHandCursor: true });
    if (this.anims.exists('boar_idle_anim')) mbSprite.play('boar_idle_anim');

    const hpBg = this.add.rectangle(bx, by - 30, 56, 7, 0x0f172a).setDepth(by + 30);
    const hpFill = this.add.rectangle(bx - 26, by - 30, 52, 5, 0xef4444).setOrigin(0, 0.5).setDepth(by + 31);
    const nameText = this.add
      .text(bx, by - 42, '🐗 LATERITE BOAR CHIEFTAIN (MINI-BOSS)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fecaca',
        backgroundColor: 'rgba(127, 29, 29, 0.88)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.42)
      .setOrigin(0.5)
      .setDepth(by + 32);

    this.miniBoss = {
      sprite: mbSprite,
      shadow: mbShadow,
      hpBg,
      hpFill,
      nameText,
      homeX: bx,
      homeY: by,
      patrolDir: 1,
      hp: 120,
      maxHp: 120,
      alive: true,
      lastHitAt: 0,
    };

    const strikeMiniBoss = () => this.damageFrontierMiniBoss();
    mbSprite.on('pointerdown', strikeMiniBoss);
  }

  private damageFrontierMiniBoss(): void {
    const mb = this.miniBoss;
    if (!mb || !mb.alive) return;
    const now = this.time.now;
    if (now - mb.lastHitAt < 260) return;
    mb.lastHitAt = now;

    const dmg = 34 + Math.floor(Math.random() * 18);
    mb.hp = Math.max(0, mb.hp - dmg);
    soundManager.playSfx('swing');
    soundManager.playSfx('hit');
    this.cameras.main.shake(100, 0.005);
    mb.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (mb.sprite.active && mb.alive) mb.sprite.setTint(0xfca5a5);
    });
    mb.hpFill.width = Math.max(0, Math.round(52 * (mb.hp / mb.maxHp)));
    this.spawnFloatingText(mb.sprite.x, mb.sprite.y - 24, `-${dmg}`, '#fde047');

    if (mb.hp <= 0) {
      mb.alive = false;
      soundManager.playSfx('victory');
      mb.sprite.setVisible(false);
      mb.shadow.setVisible(false);
      mb.hpBg.setVisible(false);
      mb.hpFill.setVisible(false);
      mb.nameText.setVisible(false);
      this.spawnFloatingText(mb.sprite.x, mb.sprite.y - 26, '+120 Coins · +45 Combat XP!', '#facc15');
      EventBus.emit('frontier:gather', {
        skillId: 'melee',
        xp: 45,
        coins: 120,
        label: 'Defeated Wild Laterite Boar Chieftain (+120 Coins & +45 Melee XP)!',
      });
      this.time.delayedCall(25000, () => {
        if (!mb.sprite.active) return;
        mb.hp = mb.maxHp;
        mb.alive = true;
        mb.hpFill.width = 52;
        mb.sprite.setPosition(mb.homeX, mb.homeY).setTint(0xfca5a5).setVisible(true);
        mb.shadow.setVisible(true);
        mb.hpBg.setVisible(true);
        mb.hpFill.setVisible(true);
        mb.nameText.setVisible(true);
      });
    }
  }

  private spawnFloatingText(x: number, y: number, msg: string, color: string): void {
    const t = this.add
      .text(x, y, msg, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(2700);
    this.tweens.add({
      targets: t,
      y: y - 26,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // ==================== WALK-THROUGH GLOWING ROAD PORTALS ====================
  private buildWalkThroughRoadPortals(): void {
    for (const portal of this.mapPortals) {
      const isNorthOrSouth = portal.edge === 'north' || portal.edge === 'south';
      const archTex = isNorthOrSouth ? 'angkor_arch_gate' : 'wood_fence_gate';

      // Glowing animated portal aura nestled inside the road archway
      const aura = this.add
        .image(portal.x, portal.y - 16, 'portal_vortex')
        .setTint(portal.targetType === 'farm' ? 0x4ade80 : 0x38bdf8)
        .setScale(0.85)
        .setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(portal.y - 1);
      this.tweens.add({
        targets: aura,
        alpha: 0.22,
        scale: 1.04,
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.add.image(portal.x, portal.y + 4, 'soft_shadow').setDisplaySize(64, 16).setDepth(portal.y - 3);
      const gateImg = this.add
        .image(portal.x, portal.y, archTex)
        .setOrigin(0.5, 0.85)
        .setScale(isNorthOrSouth ? 1.24 : 1.18)
        .setDepth(portal.y + 16)
        .setInteractive({ useHandCursor: true });
      gateImg.on('pointerdown', () => this.enterRoadPortal(portal));

      // Waving Cambodian flags flanking every road gate
      const flagTex = isNorthOrSouth ? 'na_flag_yellow' : 'na_flag_red';
      const flagAnim = isNorthOrSouth ? 'flag_yellow_wave' : 'flag_red_wave';
      for (const fx of [-32, 32]) {
        const fl = this.add.sprite(portal.x + fx, portal.y - 12, flagTex, 0).setScale(1.05).setDepth(portal.y + 18);
        if (this.anims.exists(flagAnim)) fl.play(flagAnim);
      }

      // Wooden Road Signpost right beside the arch
      this.add.image(portal.x + 42, portal.y + 2, 'sv_sign_wood').setScale(1.05).setDepth(portal.y + 17);

      this.add
        .text(portal.x, portal.y + 10, `${portal.signLabel}\n${portal.khmerLabel}`, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          align: 'center',
          padding: { x: 8, y: 3 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 0)
        .setDepth(portal.y + 24);

      this.landmarks.push({
        x: portal.x,
        y: portal.y,
        radius: 50,
        label: portal.prompt,
        isDungeonPortal: false,
        onInteract: () => this.enterRoadPortal(portal),
      });
    }
  }

  private enterRoadPortal(portal: VillageMapPortalDef): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('click');

    if (portal.targetType === 'farm') {
      this.cameras.main.fadeOut(200, 8, 16, 12);
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
      return;
    }

    const nextMapId = portal.targetMapId ?? 'central_plaza';
    this.cameras.main.fadeOut(200, 10, 14, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: nextMapId,
        spawnX: portal.targetSpawnX,
        spawnY: portal.targetSpawnY,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: nextMapId,
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  private buildPerimeterTrees(): void {
    const hasWest = this.mapPortals.some((p) => p.edge === 'west');
    const hasEast = this.mapPortals.some((p) => p.edge === 'east');
    const hasSouth = this.mapPortals.some((p) => p.edge === 'south');

    const treePool = ['sv_tree_green', 'sv_tree_teal', 'sugar_palm_tree', 'golden_durian_tree'] as const;
    const spots: Array<[number, number]> = [];

    // Left & Right borders (leave clear road gap around y = 600)
    for (let y = 180; y <= MAP_H - 130; y += 110) {
      if (!(hasWest && Math.abs(y - 600) < 110)) spots.push([78, y]);
      if (!(hasEast && Math.abs(y - 600) < 110)) spots.push([MAP_W - 78, y]);
    }
    // South border (leave clear road gap around x = 800)
    for (let x = 180; x <= MAP_W - 180; x += 130) {
      if (!(hasSouth && Math.abs(x - 800) < 120)) spots.push([x, MAP_H - 64]);
    }

    spots.forEach(([tx, ty], idx) => {
      const tex = treePool[idx % treePool.length];
      const treeImg = this.addBuildingOrProp({
        texture: tex,
        x: tx,
        y: ty,
        scale: 1.05,
        shadowW: 36,
        shadowH: 12,
        bodyW: 16,
        bodyH: 12,
      });
      this.tweens.add({
        targets: treeImg,
        angle: idx % 2 === 0 ? 2.0 : -2.0,
        duration: 2200 + (idx % 5) * 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private enterClub(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 14, 8, 22);
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

    const busY = 602;
    const stopX = 455;
    const bus = this.add
      .image(-60, busY, 'village_bus')
      .setScale(1.05)
      .setDepth(610)
      .setInteractive({ useHandCursor: true });
    const shadow = this.add
      .image(-60, busY + 14, 'soft_shadow')
      .setDisplaySize(72, 16)
      .setDepth(606);
    const joinArrow = this.add
      .image(stopX, busY - 36, 'join_arrow')
      .setScale(0.62)
      .setDepth(650)
      .setVisible(false);
    const busBadge = this.add
      .text(stopX, busY - 52, '🚌 EXPRESS BUS · TAP TO BOARD', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(20, 83, 45, 0.92)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5)
      .setDepth(651)
      .setVisible(false);

    bus.on('pointerdown', () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    });

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
          y: busY - 44,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.time.delayedCall(6000, () => {
          arrowBounce.stop();
          joinArrow.destroy();
          busBadge.destroy();
          if (!bus.active) {
            this.busActive = false;
            return;
          }
          this.tweens.add({
            targets: [bus, shadow],
            x: MAP_W + 90,
            duration: 3600,
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
        const destMap: VillageMapId = req.mapId ?? 'central_plaza';
        const destDef = getVillageMapOrDefault(destMap);
        const destX = typeof req.spawnX === 'number' ? req.spawnX : destDef.defaultSpawnX;
        const destY = typeof req.spawnY === 'number' ? req.spawnY : destDef.defaultSpawnY;

        if (destMap !== this.mapId) {
          this.transitioning = true;
          this.scene.start('OverworldScene', {
            mapId: destMap,
            spawnX: destX,
            spawnY: destY,
            goldenFlash: true,
            playerState: {
              ...this.player.state,
              zone: 'overworld',
              currentMapId: destMap,
              weapon: { ...this.player.state.weapon },
              loadout: { ...this.player.state.loadout },
              currencies: { ...this.player.state.currencies },
              lifeStats: { ...this.player.state.lifeStats },
            },
          });
        } else {
          this.player.sprite.setPosition(destX, destY);
          this.cameras.main.flash(240, 250, 204, 21);
          soundManager.playSfx('magic');
        }
      }
    };

    if (req.method === 'bus') {
      soundManager.playSfx('click');
      const bus = this.add.image(this.player.x - 160, this.player.y, 'village_bus').setScale(1.02).setDepth(2400);
      EventBus.emit('ui:toast', { text: `🚌 Express Bus departing for ${req.destinationLabel}...` });
      this.tweens.add({
        targets: bus,
        x: this.player.x + 260,
        duration: 900,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          bus.destroy();
          executeDestination();
        },
      });
      return;
    }

    soundManager.playSfx('magic');
    this.cameras.main.flash(240, 250, 204, 21);
    this.time.delayedCall(200, executeDestination);
  }

  private enterFarm(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 8, 16, 12);
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

  private enterHouseInterior(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 12, 10, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('HouseInteriorScene', {
        returnZone: 'overworld',
        playerState: {
          ...this.player.state,
          zone: 'house',
          currentMapId: this.mapId,
        },
      });
    });
  }

  private enterCavernExplore(returnMapId: 'wild_frontier' | 'temple_district' = 'wild_frontier'): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 8, 12, 22);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CavernExploreScene', {
        returnMapId,
        playerState: {
          ...this.player.state,
          zone: 'cavern',
          currentMapId: returnMapId,
        },
      });
    });
  }

  private enterPagodaTower(floor = 1, partyMode: 'solo' | 'coop' = 'solo'): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('magic');
    this.cameras.main.fadeOut(220, 24, 12, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PagodaTowerScene', {
        floor,
        partyMode,
        playerState: {
          ...this.player.state,
          zone: 'tower',
          activeMount: null,
          currentMapId: 'temple_district',
        },
      });
    });
  }

  // ==================== UPDATE 1.4: DYNAMIC WORLD EVENTS ====================
  private clearWorldEventVisuals(): void {
    for (const obj of this.worldEventObjects) {
      if (obj && obj.active) obj.destroy();
    }
    this.worldEventObjects = [];
    for (const mob of this.worldEventMobs) {
      mob.sprite.destroy();
      mob.hpBg.destroy();
      mob.hpFill.destroy();
      mob.nameText.destroy();
    }
    this.worldEventMobs = [];
    if (this.worldEventMerchantLandmark) {
      this.landmarks = this.landmarks.filter((lm) => lm !== this.worldEventMerchantLandmark);
      this.worldEventMerchantLandmark = null;
    }
  }

  private syncWorldEventVisuals(snap: ActiveWorldEventSnapshot | null): void {
    if (!this.scene || !this.scene.isActive('OverworldScene')) return;
    this.clearWorldEventVisuals();
    if (!snap) return;

    // 1. Crimson Eclipse over Wild Frontier
    if (snap.eventId === 'crimson_eclipse' && this.mapId === 'wild_frontier') {
      const tintOverlay = this.add
        .rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x991b1b, 0.24)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(2120);
      this.worldEventObjects.push(tintOverlay);

      const coords: Array<[number, number]> = [
        [735, 560],
        [885, 570],
        [620, 500],
        [980, 520],
        [820, 690],
      ];
      coords.forEach(([x, y], idx) => this.spawnWorldEventMob('eclipse_spirit', x, y, idx));
    }

    // 2. Golden Frog Rain over Wild Frontier & Green Park
    if (snap.eventId === 'golden_frog_rain' && (this.mapId === 'wild_frontier' || this.mapId === 'green_park')) {
      const frogSpots: Array<[number, number]> =
        this.mapId === 'green_park'
          ? [[740, 565], [875, 575], [640, 515], [960, 535], [700, 665], [920, 665]]
          : [[735, 560], [875, 575], [620, 520], [980, 530], [720, 675], [910, 675]];
      frogSpots.forEach(([x, y], idx) => this.spawnWorldEventMob('golden_frog', x, y, idx));

      if (snap.bossSummoned && !snap.bossDefeated) {
        this.spawnWorldEventMob('golden_boss', 800, 600, 99);
      }
    }

    // 3. Khmer Night Market along Market Street
    if (snap.eventId === 'khmer_night_market' && this.mapId === 'market_street') {
      // Extra festive paper lanterns lighting up Market Street
      for (const lx of [260, 430, 600, 770, 940, 1110, 1280]) {
        const lantern = this.add
          .circle(lx, 504, 7, 0xf97316, 0.95)
          .setStrokeStyle(2, 0xfef08a)
          .setDepth(2145);
        const halo = this.add
          .image(lx, 504, 'torch_glow')
          .setTint(0xf59e0b)
          .setScale(0.92)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(2140);
        this.tweens.add({ targets: [lantern, halo], y: 500, duration: 900, yoyo: true, repeat: -1 });
        this.worldEventObjects.push(lantern, halo);
      }

      // Parked Traveling Tuk-Tuk Merchant right in the center of Market Street!
      const mx = 800;
      const my = 625;
      const merchGlow = this.add
        .image(mx, my - 10, 'torch_glow')
        .setTint(0xf59e0b)
        .setScale(1.15)
        .setAlpha(0.6)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(my - 4);
      const cartTex = this.textures.exists('mount_mini_tuk_tuk')
        ? 'mount_mini_tuk_tuk'
        : 'num_pang_cart';
      const merchant = this.add
        .image(mx, my, cartTex)
        .setScale(cartTex === 'mount_mini_tuk_tuk' ? 1.55 : 0.64)
        .setDepth(my + 2)
        .setInteractive({ useHandCursor: true });
      merchant.on('pointerdown', () => {
        if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
        EventBus.emit('ui:openModal', { modal: 'nightMarket' });
      });
      const merchArrow = this.add.image(mx, my - 46, 'join_arrow').setScale(0.58).setDepth(my + 18);
      this.tweens.add({ targets: merchArrow, y: my - 53, duration: 500, yoyo: true, repeat: -1 });
      const merchLabel = this.add
        .text(mx, my + 24, '🏮 TRAVELING TUK-TUK MERCHANT · NIGHT MARKET', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(124, 45, 18, 0.92)',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 0)
        .setDepth(my + 22);
      this.worldEventObjects.push(merchGlow, merchant, merchArrow, merchLabel);

      const lm: LandmarkZone = {
        x: mx,
        y: my,
        radius: 64,
        label: 'Press [E] or Click → Browse Night Market Tuk-Tuk Merchant (30–40% Off!)',
        isDungeonPortal: false,
        onInteract: () => EventBus.emit('ui:openModal', { modal: 'nightMarket' }),
      };
      this.worldEventMerchantLandmark = lm;
      this.landmarks.push(lm);
    }
  }

  private spawnWorldEventMob(
    kind: 'eclipse_spirit' | 'golden_frog' | 'golden_boss',
    x: number,
    y: number,
    idx: number
  ): void {
    const isBoss = kind === 'golden_boss';
    const tex =
      isBoss && this.textures.exists('boss_sdech_kongkaeb')
        ? 'boss_sdech_kongkaeb'
        : kind === 'eclipse_spirit'
          ? 'pet_spirit'
          : 'pet_frog';
    const sprite = isBoss
      ? this.add.image(x, y, tex).setScale(0.38).setTint(0xfde047).setDepth(y + 8).setInteractive({ useHandCursor: true })
      : this.add
          .sprite(x, y, tex, 0)
          .setScale(kind === 'eclipse_spirit' ? 1.55 : 1.45)
          .setTint(kind === 'eclipse_spirit' ? 0xf87171 : 0xfacc15)
          .setDepth(y + 6)
          .setInteractive({ useHandCursor: true });

    if (!isBoss && 'play' in sprite) {
      const anim = kind === 'eclipse_spirit' ? 'pet_spirit_idle' : 'pet_frog_idle';
      if (this.anims.exists(anim)) sprite.play(anim);
    }

    const maxHp = isBoss ? 420 : kind === 'eclipse_spirit' ? 80 : 45;
    const barW = isBoss ? 80 : 38;
    const hpBg = this.add.rectangle(x, y - (isBoss ? 44 : 24), barW + 4, 6, 0x0f172a).setDepth(y + 12);
    const hpFill = this.add
      .rectangle(x - barW / 2, y - (isBoss ? 44 : 24), barW, 4, isBoss ? 0xfacc15 : kind === 'eclipse_spirit' ? 0xef4444 : 0x22c55e)
      .setOrigin(0, 0.5)
      .setDepth(y + 13);
    const label = isBoss
      ? '👑 GOLDEN SDECH KONGKAEB'
      : kind === 'eclipse_spirit'
        ? '🌑 Shadow Spirit'
        : '🐸 Golden Mini-Frog';
    const nameText = this.add
      .text(x, y - (isBoss ? 52 : 30), label, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: isBoss ? '11px' : '9px',
        fontStyle: 'bold',
        color: isBoss ? '#fde047' : kind === 'eclipse_spirit' ? '#fecaca' : '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 4, y: 1 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5, 1)
      .setDepth(y + 14);

    const mob: WorldEventMob = {
      id: `we_${kind}_${idx}_${Date.now()}`,
      kind,
      name: label,
      sprite,
      hpBg,
      hpFill,
      nameText,
      hp: maxHp,
      maxHp,
      homeX: x,
      homeY: y,
      dir: idx % 2 === 0 ? 1 : -1,
      alive: true,
      lastHitAt: 0,
    };
    this.worldEventMobs.push(mob);
    sprite.on('pointerdown', () => {
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      this.damageWorldEventMob(mob);
    });
  }

  private damageWorldEventMob(mob: WorldEventMob): void {
    if (!mob.alive) return;
    const now = this.time.now;
    if (now - mob.lastHitAt < 200) return;
    mob.lastHitAt = now;

    const dmg = 45 + Math.round(this.player.state.weapon.baseDamage * 0.9);
    mob.hp = Math.max(0, mob.hp - dmg);
    soundManager.playSfx('hit');
    mob.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (mob.sprite.active && mob.alive) {
        mob.sprite.setTint(mob.kind === 'eclipse_spirit' ? 0xf87171 : 0xfacc15);
      }
    });
    const maxW = mob.kind === 'golden_boss' ? 80 : 38;
    mob.hpFill.width = Math.max(0, Math.round(maxW * (mob.hp / mob.maxHp)));
    this.spawnFloatingText(mob.sprite.x, mob.sprite.y - 26, `-${dmg}`, '#fde047');

    if (mob.hp <= 0) {
      mob.alive = false;
      mob.sprite.setVisible(false);
      mob.hpBg.setVisible(false);
      mob.hpFill.setVisible(false);
      mob.nameText.setVisible(false);
      soundManager.playSfx('victory');

      if (mob.kind === 'eclipse_spirit') {
        worldEventManager.recordProgress(1);
        EventBus.emit('worldEvent:reward', {
          skillId: 'melee',
          xp: 30,
          coins: 45,
          items: [{ itemId: 'mat_eclipse_shard', quantity: 1 }],
          label: '🌑 Defeated Shadow Spirit → +1× Eclipse Shard & +45 Coins!',
        });
      } else if (mob.kind === 'golden_frog') {
        const { summonedBossNow } = worldEventManager.recordProgress(1);
        EventBus.emit('worldEvent:reward', {
          skillId: 'melee',
          xp: 18,
          coins: 35,
          label: '🐸 Popped Golden Mini-Frog (+35 Coins)!',
        });
        if (summonedBossNow && !this.worldEventMobs.some((m) => m.kind === 'golden_boss' && m.alive)) {
          this.spawnWorldEventMob('golden_boss', 800, 600, 99);
        }
      } else if (mob.kind === 'golden_boss') {
        worldEventManager.markBossDefeated();
        this.cameras.main.flash(260, 250, 204, 21);
        EventBus.emit('worldEvent:reward', {
          skillId: 'vitality',
          xp: 90,
          coins: 650,
          gold: 3,
          items: [{ itemId: 'wings_rain_caller_umbrella', quantity: 1 }],
          label: '👑 Defeated Golden Sdech Kongkaeb! +650 Coins, +3 Gold & ☂️ Rain-Caller Umbrella!',
        });
      }

      // Respawn normal event wave mob after 5.5s if event is still active
      if (mob.kind !== 'golden_boss') {
        this.time.delayedCall(5500, () => {
          const active = worldEventManager.getActiveEvent();
          if (!active || !mob.sprite.active) return;
          if (
            (mob.kind === 'eclipse_spirit' && active.eventId === 'crimson_eclipse') ||
            (mob.kind === 'golden_frog' && active.eventId === 'golden_frog_rain')
          ) {
            mob.hp = mob.maxHp;
            mob.alive = true;
            mob.hpFill.width = maxW;
            mob.sprite.setPosition(mob.homeX + Phaser.Math.Between(-50, 50), mob.homeY).setVisible(true);
            mob.hpBg.setVisible(true);
            mob.hpFill.setVisible(true);
            mob.nameText.setVisible(true);
          }
        });
      }
    }
  }

  private enterDungeon(
    bossId: BossId = 'sdech_kongkaeb',
    difficulty: DifficultyMode = 'normal',
    partyMode: 'solo' | 'coop' = 'solo',
    partyId?: string
  ): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 8, 10, 20);
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

  private findNearestNpc(): NpcVillager | null {
    let best: NpcVillager | null = null;
    let bestDist = Infinity;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d <= 68 && d < bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  private tryInteractNearest(): void {
    // Allow striking nearby Dynamic World Event mobs/boss with [E]
    for (const em of this.worldEventMobs) {
      if (
        em.alive &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, em.sprite.x, em.sprite.y) <= 105
      ) {
        this.damageWorldEventMob(em);
        return;
      }
    }

    // Allow striking the Wild Frontier mini-boss with [E] when nearby!
    if (
      this.miniBoss &&
      this.miniBoss.alive &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.miniBoss.sprite.x, this.miniBoss.sprite.y) <= 95
    ) {
      this.damageFrontierMiniBoss();
      return;
    }

    const nearNpc = this.findNearestNpc();
    if (nearNpc) {
      soundManager.playSfx('click');
      EventBus.emit('npc:openDialogue', { npcId: nearNpc.def.id });
      return;
    }

    const lm = this.findNearestLandmark();
    if (lm) {
      lm.onInteract();
    } else {
      EventBus.emit('ui:toast', {
        text: `Walk to a glowing Road Portal or Landmark in ${this.mapDef.name}!`,
      });
    }
  }

  update(time: number, delta: number): void {
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (this.input.enabled === modalOpen) {
      this.input.enabled = !modalOpen;
    }
    const typing =
      modalOpen ||
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA';

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
      if (Phaser.Input.Keyboard.JustDown(this.keys.V)) {
        EventBus.emit('input:toggleMount');
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
        this.player.mount?.honkHorn();
        EventBus.emit('input:honkMount');
      }
    }

    const len = Math.hypot(vx, vy);
    const isMoving = len > 0.1;
    if (isMoving) {
      const bridge = computeVillageToDungeonBridge(this.player.state);
      const mountSpec = getMountSpec(this.player.state.activeMount);
      const mountMult = 1 + (mountSpec?.speedBonusPct ?? 0);
      const speed = 135 * (1 + Math.min(0.45, bridge.moveSpeedBonusPct)) * mountMult;
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

    // Patrol animation for Wild Frontier Mini-Boss
    if (this.miniBoss && this.miniBoss.alive) {
      const mb = this.miniBoss;
      mb.sprite.x += mb.patrolDir * (delta * 0.042);
      if (mb.sprite.x > mb.homeX + 125) mb.patrolDir = -1;
      if (mb.sprite.x < mb.homeX - 125) mb.patrolDir = 1;
      mb.sprite.setFlipX(mb.patrolDir > 0);
      mb.shadow.setPosition(mb.sprite.x, mb.sprite.y + 12);
      mb.hpBg.setPosition(mb.sprite.x, mb.sprite.y - 30);
      mb.hpFill.setPosition(mb.sprite.x - 26, mb.sprite.y - 30);
      mb.nameText.setPosition(mb.sprite.x, mb.sprite.y - 42);
    }

    // Animate Dynamic World Event mobs (Shadow Spirits, bouncing Golden Mini-Frogs & Golden Boss)
    for (const em of this.worldEventMobs) {
      if (!em.alive) continue;
      const spd = em.kind === 'golden_boss' ? 0.036 : 0.048;
      em.sprite.x += em.dir * delta * spd;
      if (em.sprite.x > em.homeX + 90) em.dir = -1;
      if (em.sprite.x < em.homeX - 90) em.dir = 1;
      if ('setFlipX' in em.sprite) em.sprite.setFlipX(em.dir < 0);
      const bob =
        em.kind === 'golden_frog'
          ? -Math.abs(Math.sin(time / 210 + em.homeX)) * 12
          : Math.sin(time / 290 + em.homeX) * 6;
      em.sprite.y = em.homeY + bob;
      const isB = em.kind === 'golden_boss';
      em.hpBg.setPosition(em.sprite.x, em.sprite.y - (isB ? 44 : 24));
      em.hpFill.setPosition(em.sprite.x - (isB ? 40 : 19), em.sprite.y - (isB ? 44 : 24));
      em.nameText.setPosition(em.sprite.x, em.sprite.y - (isB ? 52 : 30));
    }

    roomClient.sendMove(
      this.player.x,
      this.player.y,
      this.player.facing,
      isMoving,
      time,
      this.player.state.activeMount ?? ''
    );
    this.remotePlayers.forEach((remote) => remote.update(time, delta));
    this.npcs.forEach((npc) => npc.update(time, delta, this.player.x, this.player.y));
    this.atmosphere?.update(time, delta);

    // Smooth walk-through trigger on Road Portals!
    if (!this.transitioning && time > this.gateLockUntil) {
      for (const portal of this.mapPortals) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y) <= 30) {
          this.enterRoadPortal(portal);
          return;
        }
      }
    }

    // Proximity prompt (Mini-Boss combat prompt takes priority when standing next to it)
    if (
      this.miniBoss &&
      this.miniBoss.alive &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.miniBoss.sprite.x, this.miniBoss.sprite.y) <= 95
    ) {
      this.promptText.setPosition(this.miniBoss.sprite.x, this.miniBoss.sprite.y - 52);
      this.promptText.setText('Press [E] or Click → Strike Laterite Boar Chieftain!').setVisible(true);
    } else {
      const nearNpc = this.findNearestNpc();
      const nearest = this.findNearestLandmark();
      if (nearNpc) {
        this.promptText.setPosition(nearNpc.x, nearNpc.y - 38);
        this.promptText.setText(`Press [E] or Click → Talk to ${nearNpc.def.name} (${nearNpc.def.khmerName}) ❤️`).setVisible(true);
      } else if (nearest) {
        this.promptText.setPosition(nearest.x, nearest.y - 36);
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
}
