import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type DifficultyMode,
  type KromTerritoryId,
  type KromWarSnapshot,
  type PlayerState,
  type TukTukCartListing,
} from '@shared/types';
import { getPetProgress } from '@shared/petEvolution';
import { INSTRUMENT_SKINS } from '@shared/khmerInstruments';
import { KHMER_EMOTES } from '@shared/emotes';
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
import { fetchKromWarStatusApi, fetchLeaderboard, fetchTukTukCartsApi } from '../network/ApiClient';
import { areaIdToChannel, channelToAreaId, roomClient } from '../network/RoomClient';
import { soundManager } from '../systems/SoundManager';
import { SeasonAtmosphereOverlay, seasonClock } from '../systems/SeasonClock';
import { travelManager, type TravelRequestPayload } from '../systems/TravelAndPylons';
import { worldEventManager } from '../systems/WorldEventManager';
import { worldBossManager } from '../systems/WorldBossManager';
import { vfxManager } from '../animations/VFXManager';
import { ClassCombatVFX } from '../animations/ClassCombatVFX';
import { getAwakenedWeaponById } from '@shared/weaponAwakening';
import { FishingSystem } from '../systems/FishingSystem';
import { deliveryJobManager } from '../systems/DeliveryJobManager';
import { MAX_FISHING_DISTANCE, MAX_INTERACT_DISTANCE, enforceInteractRange } from '../systems/CombatAimHelper';
import type { ActiveWorldEventSnapshot } from '@shared/worldEvents';
import type { FestivalId } from '@shared/festivals';

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
  private festivalObjects: Phaser.GameObjects.GameObject[] = [];
  private festivalLandmarks: LandmarkZone[] = [];
  private lastSyncedFestival: FestivalId | null = null;
  private tukTukCartObjects: Phaser.GameObjects.GameObject[] = [];
  private tukTukCartLandmarks: LandmarkZone[] = [];
  private bondAuraContainer?: Phaser.GameObjects.Container;
  private bondAuraRing?: Phaser.GameObjects.Arc;
  private lastBondHeartAt = 0;
  private treasureDigObjects: Phaser.GameObjects.GameObject[] = [];
  private treasureDigLandmark: LandmarkZone | null = null;
  private lastTreasureSpotId: string | null = null;
  private treasureGuardians: Array<{
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    hpBg: Phaser.GameObjects.Rectangle;
    hpFill: Phaser.GameObjects.Rectangle;
    nameText: Phaser.GameObjects.Text;
    homeX: number;
    homeY: number;
    dir: number;
    hp: number;
    maxHp: number;
    alive: boolean;
  }> = [];
  private activeTreasureChest: {
    x: number;
    y: number;
    spotId: string;
    sprite: Phaser.GameObjects.Image;
    glow: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    opened: boolean;
  } | null = null;
  private gateLockUntil = 0;
  private nearPortalSent = false;
  private transitioning = false;
  private spawnX = 800;
  private spawnY = 660;
  private arrivalGoldenFlash = false;
  private busActive = false;
  private busTimer?: Phaser.Time.TimerEvent;
  private fishingSystem?: FishingSystem;
  private isSittingOnChair = false;
  private lastWaveRippleAt = 0;
  /** Update 3.3 — Phnom Kulen Spirit Meditation Pool, Golden Blessing Halo & Village Party Feast Table */
  private kulenMeditationMs = 0;
  private kulenMeditationGfx?: Phaser.GameObjects.Graphics;
  private kulenMeditationText?: Phaser.GameObjects.Text;
  private kulenBlessingHalo?: Phaser.GameObjects.Arc;
  private lastKulenMistAt = 0;
  private activePartyObjects: Phaser.GameObjects.GameObject[] = [];
  private activePartyLandmark: LandmarkZone | null = null;
  private blackMarketObjects: Phaser.GameObjects.GameObject[] = [];
  private blackMarketLandmark: LandmarkZone | null = null;
  private territoryBannerObjects: Phaser.GameObjects.GameObject[] = [];
  private lastPetRegenAt = 0;
  private lastFootstepAt = 0;
  private lastSunsetPulseAt = 0;
  private fireflies: Array<{
    id: number;
    homeX: number;
    homeY: number;
    phase: number;
    caught: boolean;
    respawnAt: number;
    orb: Phaser.GameObjects.Arc;
    halo: Phaser.GameObjects.Arc;
  }> = [];
  private firefliesActive = false;
  private deliveryCompassGfx?: Phaser.GameObjects.Graphics;
  private deliveryDropBeacon?: Phaser.GameObjects.Container;
  private deliveryDropOrderId: string | null = null;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('OverworldScene');
  }

  private guardInteractRange(
    targetX: number,
    targetY: number,
    maxDist = MAX_INTERACT_DISTANCE,
    msg = '🚶 Move closer'
  ): boolean {
    if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return false;
    return enforceInteractRange(this, this.player.x, this.player.y, targetX, targetY, maxDist, msg);
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
    this.isSittingOnChair = false;
    this.lastWaveRippleAt = 0;
    this.blackMarketObjects = [];
    this.blackMarketLandmark = null;
    this.territoryBannerObjects = [];
    this.lastPetRegenAt = 0;
    this.lastSunsetPulseAt = 0;
    this.fireflies = [];
    this.firefliesActive = false;
    this.deliveryCompassGfx = undefined;
    this.deliveryDropOrderId = null;
    this.deliveryDropBeacon = undefined;
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
    this.input.mouse?.disableContextMenu();
    this.physics.world.gravity.y = 0;
    const activeMapW = this.mapId === 'phnom_kulen' ? 1400 : MAP_W;
    const activeMapH = this.mapId === 'phnom_kulen' ? 1000 : MAP_H;
    this.physics.world.setBounds(24, HORIZON_H, activeMapW - 48, activeMapH - HORIZON_H - 18);
    this.glowLights = [];
    this.areaSignText = undefined;
    this.syncDynamicBgm();

    // 1. Map-Specific Rich Ground Theme & Environmental Design (distinct palette & architectural character per place!)
    if (this.mapId !== 'koh_rong_island' && this.mapId !== 'phnom_kulen') {
      const groundTintMap: Partial<Record<VillageMapId, number>> = {
        central_plaza: 0xffffff,
        market_street: 0xe6d4a8, // Warm sandstone-amber bazaar district
        temple_district: 0xadb89a, // Ancient mossy Angkor temple stone terrace
        green_park: 0x9cf0a6, // Deep lush tropical riverside emerald
        wild_frontier: 0xd9c579, // Sun-baked highland ochre savanna
        mining_quarry: 0xc27c5a, // Red Cambodian laterite canyon earth
        bamboo_forest: 0x5fb88f, // Cool misty jade bamboo grove
        sunken_ruins: 0x4ca6ba, // Flooded turquoise-teal ancient temple sanctuary
      };
      const baseTile = this.mapId === 'mining_quarry' ? 'sv_path' : 'sv_grass';
      this.add
        .tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, baseTile)
        .setTint(groundTintMap[this.mapId] ?? 0xffffff)
        .setDepth(0);

      // 2. Cohesive 16-bit Pixel-Art Top Canopy Treeline (opening cleanly for North Road Portals!)
      this.buildCohesiveHorizonTreeline();

      // 3. Clean Spacious Cobblestone & Dirt Road Network + Rich Environmental Theme Props!
      this.buildRoadsAndCourtyards();
      this.buildMapThemeEnvironmentProps();
    }

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
    } else if (this.mapId === 'mining_quarry') {
      this.buildMiningQuarryMap();
    } else if (this.mapId === 'bamboo_forest') {
      this.buildBambooForestMap();
    } else if (this.mapId === 'sunken_ruins') {
      this.buildSunkenRuinsMap();
    } else if (this.mapId === 'koh_rong_island') {
      this.buildKohRongIslandMap();
    } else if (this.mapId === 'phnom_kulen') {
      this.buildPhnomKulenSanctuaryMap();
    }

    // 5. Walk-Through Glowing Road Portals & Wooden Signposts at Map Edges
    this.buildWalkThroughRoadPortals();

    // 6. Perimeter Trees & Natural Framing
    if (this.mapId !== 'koh_rong_island' && this.mapId !== 'phnom_kulen') {
      this.buildPerimeterTrees();
    }

    // 7. 4-Season Weather Particles & Day/Night Atmosphere Overlay
    this.atmosphere = new SeasonAtmosphereOverlay(this, activeMapW, activeMapH);
    this.glowLights.forEach((g) => this.atmosphere?.registerGlowLight(g));

    // 8. 10-Layer Human Chibi Player + Soft Ground Shadow
    this.player = new Player(this, this.spawnX, this.spawnY, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);

    // Update 3.3 — Subtle Golden Lotus Halo while Kulen Sacred Blessing is active!
    this.kulenBlessingHalo = this.add
      .circle(this.spawnX, this.spawnY + 6, 22, 0xfacc15, 0.14)
      .setStrokeStyle(1.8, 0xfef08a, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.spawnY - 4)
      .setVisible(false);
    this.gateLockUntil = this.time.now + 850;

    // 8B. Living Khmer Villager NPCs patrolling this map!
    this.npcs = getNpcsForMap(this.mapId).map((npcDef) => {
      const entity = new NpcVillager(this, npcDef, (npcId) => {
        if (!this.guardInteractRange(entity.x, entity.y)) return;
        soundManager.playSfx('click');
        EventBus.emit('npc:openDialogue', { npcId });
      });
      return entity;
    });

    // 8C. Full 4-Stage Animated Mekong River Fishing System (Green Park pier & water edge)
    this.fishingSystem = new FishingSystem(this);

    // Update 2.5 — Fire Awakened Ancient Weapon Prismatic Projectile Trails in Overworld on left-click!
    const overworldVfx = new ClassCombatVFX(this);
    let overworldLbokatorCombo = 0;
    let lastOverworldFireAt = 0;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (pointer.rightButtonDown() || currentlyOver.length > 0) return;
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      const awakened = getAwakenedWeaponById(this.player?.state?.weapon?.id);
      if (!awakened) return;
      const now = this.time.now;
      if (now - lastOverworldFireAt < 260) return;
      lastOverworldFireAt = now;

      const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
      const dir = Math.cos(ang) >= 0 ? 1 : -1;
      this.player.facing = dir > 0 ? 'right' : 'left';
      this.player.setAimAngle(ang);
      this.player.triggerSquash(1.1, 0.92);
      soundManager.playSfx('magic');

      const launchTempProjectile = (
        proj: ReturnType<ClassCombatVFX['spawnAwakenedSunbowArrow']>,
        c1: number,
        c2: number,
        burstLotus = false
      ) => {
        const travelMs = 520;
        const endX = proj.node.x + proj.vx * (travelMs / 1000);
        const endY = proj.node.y + proj.vy * (travelMs / 1000);
        const trailEv = this.time.addEvent({
          delay: 35,
          repeat: 13,
          callback: () => {
            if (proj.node.active) overworldVfx.emitProjectileTrailParticle(proj.node.x, proj.node.y, c1, c2);
          },
        });
        this.tweens.add({
          targets: proj.node,
          x: endX,
          y: endY,
          duration: travelMs,
          onComplete: () => {
            trailEv.remove(false);
            if (burstLotus) overworldVfx.playAwakenedLotusRingBurst(endX, endY);
            proj.node.destroy();
          },
        });
      };

      if (awakened.id === 'weapon_awakened_hanuman_vajra') {
        overworldLbokatorCombo = (overworldLbokatorCombo % 3) + 1;
        overworldVfx.playLbokatorSlash(this.player.x, this.player.y, dir, overworldLbokatorCombo, ang);
        if (overworldLbokatorCombo === 3) {
          overworldVfx.playAwakenedVajraShockwave(this.player.x, this.player.y, ang);
        }
      } else if (awakened.id === 'weapon_awakened_angkor_sunbow') {
        launchTempProjectile(
          overworldVfx.spawnAwakenedSunbowArrow(this.player.x, this.player.y, dir, 1, ang),
          0x22d3ee,
          0xfacc15
        );
      } else if (awakened.id === 'weapon_awakened_celestial_yant') {
        launchTempProjectile(
          overworldVfx.spawnAwakenedYantLotusOrb(this.player.x, this.player.y, dir, ang),
          0x38bdf8,
          0xfef08a,
          true
        );
      } else if (awakened.id === 'weapon_awakened_naga_scepter') {
        overworldVfx.playKramaWhipSnap(this.player.x, this.player.y, dir, ang);
        overworldVfx.playAwakenedSpectralNagaLash(
          this.player.x,
          this.player.y,
          this.player.x + Math.cos(ang) * 180,
          this.player.y + Math.sin(ang) * 180
        );
      } else if (awakened.id === 'weapon_awakened_eclipse_blades') {
        overworldVfx.playShadowTwinSlash(this.player.x, this.player.y, dir, true, ang);
        launchTempProjectile(
          overworldVfx.spawnAwakenedEclipseCrescent(this.player.x, this.player.y, dir, ang),
          0xa855f7,
          0xfacc15
        );
      }
    });

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
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,V,H', false) as Record<
      'W' | 'A' | 'S' | 'D' | 'E' | 'V' | 'H',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.clearCaptures();

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
      EventBus.on('player:khmerEmote', ({ emoteId }) => {
        const def = KHMER_EMOTES[emoteId];
        if (!def) return;
        this.player.playKhmerEmote(emoteId);
        roomClient.sendEmote(def.icon, emoteId);
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
          this.player.state.lifeStats.stylish !== nextState.lifeStats.stylish ||
          this.player.state.kromTag !== nextState.kromTag;
        const nextSpotId = nextState.activeTreasureMap?.spotId ?? null;
        this.player.syncPlayerState({ ...nextState, currentMapId: this.mapId });
        if (nextSpotId !== this.lastTreasureSpotId && !this.activeTreasureChest) {
          this.syncTreasureMapDigSpot();
        }
        if (metaChanged) {
          roomClient.sendAppearance(this.player.state.loadout, {
            name: nextState.name,
            level: nextState.level,
            stylish: nextState.lifeStats.stylish,
            kromTag: nextState.kromTag ?? '',
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
      EventBus.on('bossRush:enterRequest', ({ difficulty }) => {
        this.enterBossRush(difficulty);
      }),
      EventBus.on('worldBoss:enterRequest', () => {
        this.enterWorldBossRaid();
      }),
      EventBus.on('dive:enterRequest', () => {
        this.enterPearlDive();
      }),
      EventBus.on('kromHall:enterRequest', () => {
        this.enterKromHall();
      }),
      EventBus.on('kromWar:updated', (snap) => {
        this.syncTerritoryWarBanners(snap);
      }),
      EventBus.on('pet:evolved', ({ newStage }) => {
        this.player.pet?.playEvolutionBurst(newStage);
      }),
      EventBus.on('music:localNote', ({ instrumentId, skin, noteIndex }) => {
        this.spawnFloatingMusicNote(this.player.x, this.player.y - 18, skin, noteIndex);
        roomClient.sendMusicNote(instrumentId, skin, noteIndex, this.player.x, this.player.y);
      }),
      EventBus.on('music:remoteNote', ({ sessionId, instrumentId, skin, noteIndex, x, y }) => {
        const remote = this.remotePlayers.get(sessionId);
        const nx = remote ? remote.x : x;
        const ny = remote ? remote.y : y;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nx, ny);
        if (dist < 620) {
          const vol = Math.max(0.2, 1 - dist / 650);
          soundManager.playInstrumentNote(instrumentId, noteIndex, vol);
          this.spawnFloatingMusicNote(nx, ny - 18, skin, noteIndex);
        }
      }),
      EventBus.on('petRace:enterRequest', ({ petId }) => {
        this.enterPetRace(petId);
      }),
      EventBus.on('arena:enterRequest', ({ mode, duelId, spectate, opponentName }) => {
        this.enterArenaPvP({ mode, duelId, spectate, opponentName });
      }),
      EventBus.on('delivery:startRequest', ({ hasCoopPassenger }) => {
        const autoCoop =
          Boolean(hasCoopPassenger) ||
          Array.from(this.remotePlayers.values()).some(
            (rp) => Phaser.Math.Distance.Between(this.player.x, this.player.y, rp.x, rp.y) <= 180
          );
        const run = deliveryJobManager.startRun(autoCoop);
        soundManager.playSfx('coin');
        EventBus.emit('ui:toast', {
          text: `📦 Express Delivery Run Started! Deliver 3 hot orders in 90s (${run.orders.map((o) => o.mapLabel).join(' → ')})!`,
        });
      }),
      EventBus.on('kite:launchRequest', ({ kiteId, returnMapId, returnX, returnY }) => {
        if (this.transitioning) return;
        this.transitioning = true;
        soundManager.playSfx('magic');
        this.cameras.main.fadeOut(220, 40, 20, 10);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('KiteFlyScene', {
            playerState: { ...this.player.state, zone: 'overworld', currentMapId: this.mapId },
            kiteId,
            returnMapId: returnMapId ?? this.mapId,
            returnX: returnX ?? this.player.x,
            returnY: returnY ?? this.player.y,
          });
        });
      }),
      EventBus.on('folkGame:launchRequest', ({ game, returnX, returnY }) => {
        if (this.transitioning) return;
        this.transitioning = true;
        soundManager.playSfx('magic');
        this.cameras.main.fadeOut(220, 30, 16, 8);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('FolkGamesScene', {
            playerState: { ...this.player.state, zone: 'overworld', currentMapId: 'green_park' },
            game,
            returnX: returnX ?? this.player.x,
            returnY: returnY ?? this.player.y,
          });
        });
      }),
      EventBus.on('party:hostBroadcast', (evt) => {
        if (evt.mapId !== this.mapId) return;
        this.spawnSharedPartyFeastTable(evt);
      }),
      EventBus.on('blackMarket:changed', () => {
        this.syncBlackMarketPortal();
      }),
      EventBus.on('cavern:enterRequest', ({ returnMapId }) => {
        this.enterCavernExplore(returnMapId);
      }),
      EventBus.on('tower:enterRequest', ({ floor, partyMode }) => {
        this.enterPagodaTower(floor, partyMode);
      }),
      EventBus.on('festival:startRace', () => {
        this.enterFestivalRace();
      }),
      EventBus.on('worldEvent:changed', (snap) => {
        this.syncWorldEventVisuals(snap);
        this.syncDynamicBgm();
      }),
      EventBus.on('cart:listUpdated', ({ carts }) => {
        this.syncTukTukCarts(carts);
      }),
      seasonClock.subscribe((snap) => {
        if (snap.activeFestival !== this.lastSyncedFestival) {
          this.syncFestivalVisuals(snap.activeFestival);
          this.syncDynamicBgm();
        }
      }),
      EventBus.on('travel:execute', (req) => {
        this.handleTravelRequest(req);
      }),
      EventBus.on('input:interact', () => {
        this.tryInteractNearest();
      }),
      EventBus.on('fishing:reelComplete', ({ success }) => {
        this.fishingSystem?.resolveReelResult(success);
      })
    );

    EventBus.emit('scene:ready', { zone: 'overworld' });
    EventBus.emit('player:state', { ...this.player.state, zone: 'overworld', currentMapId: this.mapId });
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'dungeon' });

    const initialArea = channelToAreaId(this.player.state.areaChannel);
    void this.connectToPlazaArea(initialArea, false);
    this.syncWorldEventVisuals(worldEventManager.getActiveEvent());
    this.syncFestivalVisuals(seasonClock.getSnapshot().activeFestival);
    this.syncBlackMarketPortal();
    // Apply WebGL Bloom to glow lights (Campfires, Portals, Shimmer Spring) when VFX Quality === High
    this.glowLights.slice(0, 3).forEach((gl) => vfxManager.applyBloom(this, gl, { color: 0xfacc15, strength: 1.25 }));

    // Update 1.7 — Pink Lotus Heart Aura container for Bonded Partners
    this.bondAuraContainer = this.add.container(this.player.x, this.player.y).setDepth(this.player.y - 6).setVisible(false);
    this.bondAuraRing = this.add
      .circle(0, 6, 22, 0xf472b6, 0.16)
      .setStrokeStyle(2, 0xf9a8d4, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.bondAuraContainer.add(this.bondAuraRing);
    vfxManager.applyGlow(this, this.bondAuraRing, 0xec4899, 3.0, 0.4);
    if (this.mapId === 'central_plaza' || this.mapId === 'temple_district') {
      void fetchTukTukCartsApi(this.mapId).then((carts) => {
        if (this.scene && this.scene.isActive('OverworldScene')) {
          this.syncTukTukCarts(carts);
        }
      });
    }
    this.syncTreasureMapDigSpot();
    if (
      this.mapId === 'market_street' ||
      this.mapId === 'wild_frontier' ||
      this.mapId === 'koh_rong_island'
    ) {
      void fetchKromWarStatusApi().then((war) => {
        if (this.scene && this.scene.isActive('OverworldScene')) {
          this.syncTerritoryWarBanners(war);
        }
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      vfxManager.cleanupScene(this);
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.clearWorldEventVisuals();
      this.clearFestivalVisuals();
      this.clearBlackMarketPortal();
      this.clearTerritoryWarBanners();
      this.clearTukTukCarts();
      this.clearTreasureDigVisuals();
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
      this.fishingSystem?.destroy();
      this.fishingSystem = undefined;
      void roomClient.leavePlaza(false);
      this.player.destroy();
    });
  }

  private syncDynamicBgm(): void {
    if (
      this.mapId === 'wild_frontier' ||
      this.mapId === 'mining_quarry' ||
      this.mapId === 'bamboo_forest' ||
      this.mapId === 'sunken_ruins'
    ) {
      soundManager.playBgm('cavern');
      return;
    }
    const activeEvent = worldEventManager.getActiveEvent();
    const activeFestival = seasonClock.getSnapshot().activeFestival;
    if (
      activeEvent?.eventId === 'khmer_night_market' ||
      (activeFestival && (this.mapId === 'central_plaza' || this.mapId === 'green_park' || this.mapId === 'market_street'))
    ) {
      soundManager.playBgm('festival');
      return;
    }
    soundManager.playBgm('village');
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
          const ent = new RemotePlayerEntity(this, snap, () => ({
            x: this.player.x,
            y: this.player.y,
          }));
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
          this.remotePlayers.get(msg.sessionId)?.showEmote(msg.emoji, 3000, msg.emoteId);
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
      // Straight grid-aligned crossroad connecting West Market, North Quarry, East Bamboo Forest & South Sunken Ruins
      borderGfx.fillStyle(0x7c5b3b, 0.85);
      borderGfx.fillRoundedRect(710, 520, 180, 160, 14);
      this.add.tileSprite(800, 600, 168, 148, 'sv_plaza_tile').setDepth(3);
    } else if (this.mapId === 'mining_quarry') {
      // Terraced red-laterite excavation courtyard
      borderGfx.fillStyle(0x7c2d12, 0.88);
      borderGfx.fillRoundedRect(320, 320, 960, 560, 18);
      this.add.tileSprite(800, 600, 944, 544, 'sv_path').setTint(0xd97757).setDepth(3);
      const qFrame = this.add.graphics().setDepth(4);
      qFrame.lineStyle(2, 0xf97316, 0.55);
      qFrame.strokeRoundedRect(336, 336, 928, 528, 14);
    } else if (this.mapId === 'bamboo_forest') {
      // Misty emerald forest glade & clearing
      borderGfx.fillStyle(0x14532d, 0.78);
      borderGfx.fillRoundedRect(300, 310, 1020, 580, 22);
      this.add.tileSprite(810, 600, 1004, 564, 'sv_path').setTint(0x86efac).setAlpha(0.55).setDepth(3);
    } else if (this.mapId === 'sunken_ruins') {
      // Flooded ancient Angkor sandstone temple courtyard surrounded by luminous shallow pools
      const poolGfx = this.add.graphics().setDepth(1);
      poolGfx.fillStyle(0x0c4a6e, 0.92);
      poolGfx.fillRoundedRect(210, 250, 1180, 740, 24);
      poolGfx.lineStyle(3, 0x38bdf8, 0.65);
      poolGfx.strokeRoundedRect(216, 256, 1168, 728, 22);
      borderGfx.fillStyle(0x78716c, 0.95);
      borderGfx.fillRoundedRect(350, 340, 900, 560, 14);
      this.add.tileSprite(800, 620, 886, 546, 'sv_plaza_tile').setTint(0xbae6fd).setDepth(3);
    }
  }

  private buildMapThemeEnvironmentProps(): void {
    const g = this.add.graphics().setDepth(5);

    if (this.mapId === 'central_plaza') {
      // Royal Pink Lotus Flowerbeds flanking the courtyard + festive Khmer bunting garlands
      for (const [fx, fy] of [[520, 445], [1080, 445], [520, 755], [1080, 755]]) {
        g.fillStyle(0x78350f, 0.9);
        g.fillRoundedRect(fx - 26, fy - 14, 52, 28, 8);
        g.fillStyle(0x16a34a, 0.92);
        g.fillRoundedRect(fx - 22, fy - 10, 44, 20, 6);
        for (let i = -14; i <= 14; i += 14) {
          g.fillStyle(i === 0 ? 0xfacc15 : 0xf472b6, 0.96);
          g.fillCircle(fx + i, fy, 4.5);
          g.fillStyle(0xfef9c3, 0.9);
          g.fillCircle(fx + i, fy, 1.8);
        }
      }
      // Decorative sandstone stepping stones along diagonal plaza corners
      g.fillStyle(0xd6d3d1, 0.55);
      for (const [sx, sy] of [[420, 320], [1180, 320], [420, 880], [1180, 880]]) {
        g.fillCircle(sx, sy, 14);
        g.fillCircle(sx + 20, sy + 14, 10);
      }
    } else if (this.mapId === 'market_street') {
      // Festive crimson-and-gold Khmer Bazaar lantern garlands overhead across Market Boulevard
      for (const gx of [360, 580, 800, 1020, 1240]) {
        g.lineStyle(1.5, 0x78350f, 0.7);
        g.lineBetween(gx - 55, 515, gx + 55, 515);
        for (const ox of [-36, 0, 36]) {
          g.fillStyle(ox === 0 ? 0xfacc15 : 0xdc2626, 0.95);
          g.fillCircle(gx + ox, 519, 5);
          const lg = this.add
            .image(gx + ox, 519, 'torch_glow')
            .setTint(0xf59e0b)
            .setScale(0.32)
            .setAlpha(0.36)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(520);
          this.glowLights.push(lg);
        }
      }
      // Colorful silk bazaar floor rugs along the promenade
      for (const rx of [440, 800, 1160]) {
        g.fillStyle(0xb91c1c, 0.45);
        g.fillRoundedRect(rx - 44, 578, 88, 44, 6);
        g.lineStyle(1.5, 0xfacc15, 0.7);
        g.strokeRoundedRect(rx - 40, 582, 80, 36, 4);
      }
    } else if (this.mapId === 'temple_district') {
      // Sacred carved Angkor sandstone mandala rings & ancient mossy ruins
      g.lineStyle(2.5, 0xfacc15, 0.45);
      g.strokeCircle(800, 550, 130);
      g.lineStyle(1.5, 0xd6d3d1, 0.4);
      g.strokeCircle(800, 550, 95);
      for (const [rx, ry] of [[250, 340], [1350, 340], [250, 920], [1350, 920]]) {
        g.fillStyle(0x57534e, 0.9);
        g.fillRoundedRect(rx - 22, ry - 12, 44, 24, 4);
        g.fillStyle(0x4d7c0f, 0.65);
        g.fillCircle(rx - 10, ry - 4, 8);
        g.fillCircle(rx + 12, ry + 4, 6);
      }
    } else if (this.mapId === 'green_park') {
      // Blooming tropical hibiscus/lotus gardens & shady park benches
      for (const [px, py] of [[410, 350], [1190, 350], [420, 740], [1180, 720]]) {
        g.fillStyle(0x15803d, 0.55);
        g.fillEllipse(px, py, 74, 42);
        for (let k = 0; k < 5; k++) {
          const ang = (k * Math.PI * 2) / 5;
          g.fillStyle(k % 2 === 0 ? 0xf472b6 : 0xfef08a, 0.92);
          g.fillCircle(px + Math.cos(ang) * 20, py + Math.sin(ang) * 10, 4);
        }
      }
    } else if (this.mapId === 'wild_frontier') {
      // Highland laterite boulders & rustic explorer campfires
      for (const [bx, by] of [[340, 360], [1260, 360], [340, 860], [1260, 860]]) {
        g.fillStyle(0x9a3412, 0.9);
        g.fillEllipse(bx, by, 48, 28);
        g.fillStyle(0xc2410c, 0.85);
        g.fillEllipse(bx - 6, by - 5, 30, 18);
      }
    } else if (this.mapId === 'mining_quarry') {
      // Iron minecart rails & glowing turquoise crystal outcrops across the red-laterite canyon
      g.lineStyle(3, 0x334155, 0.85);
      g.lineBetween(240, 588, 1360, 588);
      g.lineBetween(240, 612, 1360, 612);
      g.lineStyle(2, 0x78350f, 0.75);
      for (let x = 256; x <= 1344; x += 28) {
        g.lineBetween(x, 584, x, 616);
      }
      for (const [cx, cy] of [[380, 380], [1220, 380], [380, 840], [1220, 840]]) {
        g.fillStyle(0x22d3ee, 0.85);
        g.fillTriangle(cx, cy - 16, cx - 9, cy + 6, cx + 9, cy + 6);
        g.fillStyle(0xa5f3fc, 0.9);
        g.fillTriangle(cx + 8, cy - 10, cx + 2, cy + 6, cx + 14, cy + 6);
      }
    } else if (this.mapId === 'bamboo_forest') {
      // Swaying emerald bamboo clusters & drifting misty spirit wisps
      for (const [bx, by] of [[280, 320], [520, 290], [1080, 290], [1320, 340], [320, 880], [1280, 860]]) {
        for (let i = -10; i <= 10; i += 10) {
          g.fillStyle(0x166534, 0.92);
          g.fillRect(bx + i - 3, by - 46, 6, 48);
          g.fillStyle(0x4ade80, 0.85);
          g.fillRect(bx + i - 3, by - 32, 6, 2);
          g.fillRect(bx + i - 3, by - 16, 6, 2);
        }
        g.fillStyle(0x6ee7b7, 0.16);
        g.fillEllipse(bx, by + 4, 68, 26);
      }
    } else if (this.mapId === 'sunken_ruins') {
      // Bioluminescent turquoise temple water ripples & submerged carved stone ruins
      for (const [wx, wy] of [[310, 310], [1290, 310], [310, 910], [1290, 910]]) {
        g.fillStyle(0x06b6d4, 0.3);
        g.fillEllipse(wx, wy, 92, 46);
        g.lineStyle(1.5, 0x67e8f9, 0.7);
        g.strokeEllipse(wx, wy, 72, 34);
        g.fillStyle(0x78716c, 0.9);
        g.fillRoundedRect(wx - 14, wy - 10, 28, 16, 3);
      }
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
      if (!this.guardInteractRange(642, 600)) return;
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
      if (!this.guardInteractRange(642, 600)) return;
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

    // 1B. UPDATE 1.8: WOODEN ADVENTURER'S BOUNTY BOARD (East of Central Fountain)
    const bountyBoard = this.addBuildingOrProp({
      texture: 'sv_sign_wood',
      x: 958,
      y: 600,
      scale: 1.48,
      shadowW: 36,
      shadowH: 11,
      bodyW: 26,
      bodyH: 12,
      label: "ADVENTURER'S BOUNTY BOARD",
      joinArrowY: 550,
    });
    // Wooden notice board backdrop + pinned parchment bounty flyers
    const boardPanel = this.add
      .rectangle(958, 588, 36, 22, 0x78350f, 0.96)
      .setStrokeStyle(2, 0xfacc15, 0.95)
      .setDepth(605);
    const flyer1 = this.add.rectangle(949, 586, 9, 11, 0xfef3c7, 1).setDepth(606);
    const flyer2 = this.add.rectangle(959, 589, 9, 11, 0xfde68a, 1).setDepth(606);
    const flyer3 = this.add.rectangle(968, 586, 8, 10, 0xfecdd3, 1).setDepth(606);
    const bountyBadge = this.add
      .text(958, 567, '📋 BOUNTIES', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#7c2d12',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5)
      .setDepth(614)
      .setInteractive({ useHandCursor: true });
    const openBounties = () => {
      if (!this.guardInteractRange(958, 600)) return;
      EventBus.emit('ui:openModal', { modal: 'bounties' });
    };
    bountyBoard.setInteractive({ useHandCursor: true }).on('pointerdown', openBounties);
    boardPanel.setInteractive({ useHandCursor: true }).on('pointerdown', openBounties);
    flyer1.setInteractive({ useHandCursor: true }).on('pointerdown', openBounties);
    flyer2.setInteractive({ useHandCursor: true }).on('pointerdown', openBounties);
    flyer3.setInteractive({ useHandCursor: true }).on('pointerdown', openBounties);
    bountyBadge.on('pointerdown', openBounties);
    this.landmarks.push({
      x: 958,
      y: 604,
      radius: 54,
      label: "Press [E] or Click → Open Adventurer's Bounty Board (Daily & Weekly Quests)",
      isDungeonPortal: false,
      onInteract: openBounties,
    });

    // 2. EXPRESS BUS STOP + ROOFED WAITING SHELTER & ROUTE MAP (West-Center Avenue)
    const shelterGfx = this.add.graphics().setDepth(652);
    // Concrete sidewalk pad
    shelterGfx.fillStyle(0x94a3b8, 0.92);
    shelterGfx.fillRoundedRect(378, 636, 116, 36, 6);
    shelterGfx.lineStyle(2, 0x475569, 0.9);
    shelterGfx.strokeRoundedRect(378, 636, 116, 36, 6);
    // Wooden waiting shelter back wall & glass panel
    shelterGfx.fillStyle(0x78350f, 1);
    shelterGfx.fillRect(388, 610, 68, 34);
    shelterGfx.fillStyle(0xbae6fd, 0.75);
    shelterGfx.fillRect(394, 616, 26, 20);
    // Illuminated Phnom Penh Express Route Map inside shelter
    shelterGfx.fillStyle(0x0f172a, 0.95);
    shelterGfx.fillRect(424, 615, 28, 22);
    shelterGfx.lineStyle(1.5, 0xfacc15, 0.95);
    shelterGfx.lineBetween(428, 626, 448, 626);
    shelterGfx.fillStyle(0x22c55e, 1);
    shelterGfx.fillCircle(430, 626, 2.5);
    shelterGfx.fillStyle(0x38bdf8, 1);
    shelterGfx.fillCircle(438, 626, 2.5);
    shelterGfx.fillStyle(0xf97316, 1);
    shelterGfx.fillCircle(446, 626, 2.5);
    // Shelter roof & pillars
    const shelterRoof = this.add.graphics().setDepth(666);
    shelterRoof.fillStyle(0x14532d, 1);
    shelterRoof.fillRoundedRect(380, 598, 84, 15, 5);
    shelterRoof.fillStyle(0xfacc15, 0.95);
    shelterRoof.fillRect(384, 608, 76, 3);
    shelterRoof.fillStyle(0x57534e, 1);
    shelterRoof.fillRect(386, 613, 4, 42);
    shelterRoof.fillRect(454, 613, 4, 42);

    const busStop = this.addBuildingOrProp({
      texture: 'bus_stop_sign',
      x: 476,
      y: 660,
      scale: 1.2,
      shadowW: 28,
      shadowH: 9,
      label: 'PHUM EXPRESS TERMINAL',
      joinArrowY: 604,
    });
    this.add.image(422, 656, 'soft_shadow').setDisplaySize(44, 10).setDepth(655);
    this.add.image(422, 653, 'na_bench').setScale(0.9).setDepth(659);
    const busZoneHit = this.add
      .rectangle(432, 636, 118, 64, 0x000000, 0)
      .setDepth(670)
      .setInteractive({ useHandCursor: true });
    const openExpressMap = () => {
      if (!this.guardInteractRange(446, 656)) return;
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'worldMap' });
    };
    busStop.setInteractive({ useHandCursor: true }).on('pointerdown', openExpressMap);
    busZoneHit.on('pointerdown', openExpressMap);
    this.landmarks.push({
      x: 446,
      y: 656,
      radius: 62,
      label: 'Press [E] or Click → Board Phnom Penh Express Bus & World Map [M]',
      isDungeonPortal: false,
      onInteract: openExpressMap,
    });

    // 2B. UPDATE 3.2 — TUK-TUK EXPRESS DISPATCH BOARD (Right next to Express Bus Stop!)
    const dispX = 548;
    const dispY = 656;
    const dispBoard = this.add.graphics().setDepth(dispY);
    dispBoard.fillStyle(0x78350f, 0.96);
    dispBoard.fillRoundedRect(dispX - 24, dispY - 34, 48, 32, 6);
    dispBoard.lineStyle(2, 0xfacc15, 0.95);
    dispBoard.strokeRoundedRect(dispX - 24, dispY - 34, 48, 32, 6);
    dispBoard.fillStyle(0xfef3c7, 0.95);
    dispBoard.fillRect(dispX - 18, dispY - 28, 15, 16);
    dispBoard.fillStyle(0xfde047, 0.95);
    dispBoard.fillRect(dispX + 2, dispY - 28, 16, 12);
    dispBoard.fillStyle(0x451a03, 1);
    dispBoard.fillRect(dispX - 4, dispY - 2, 8, 14);
    const dispHit = this.add
      .rectangle(dispX, dispY - 12, 58, 52, 0xffffff, 0)
      .setDepth(dispY + 12)
      .setInteractive({ useHandCursor: true });
    const dispArrow = this.add.image(dispX, dispY - 46, 'join_arrow').setScale(0.48).setDepth(dispY + 18);
    this.tweens.add({ targets: dispArrow, y: dispY - 52, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(dispX, dispY + 16, '📦 TUK-TUK DISPATCH BOARD', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(120, 53, 15, 0.92)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.42)
      .setOrigin(0.5, 0)
      .setDepth(dispY + 20);
    const triggerDelivery = () => {
      if (!this.guardInteractRange(dispX, dispY, 125)) return;
      if (deliveryJobManager.getActiveRun()) {
        EventBus.emit('ui:toast', {
          text: '📦 Delivery Run already active! Follow the glowing golden compass arrow to deliver your 3 hot orders!',
        });
        return;
      }
      EventBus.emit('delivery:startRequest', {});
    };
    dispHit.on('pointerdown', triggerDelivery);
    this.landmarks.push({
      x: dispX,
      y: dispY,
      radius: 56,
      label: 'Press [E] or Click → 📦 Start 90s Express Delivery Run (250–600c + Friendly XP!)',
      isDungeonPortal: false,
      onInteract: triggerDelivery,
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
      if (!this.guardInteractRange(520, 355)) return;
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
    const openWheel = () => {
      if (!this.guardInteractRange(1080, 362)) return;
      EventBus.emit('ui:openModal', { modal: 'luckyWheel' });
    };
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

    // 4B. UPDATE 1.5 + 2.8: ENTERABLE KROM GUILD HALL BANNER (West Courtyard) & TEMPLE SCRYING MIRROR (East Courtyard)
    const kromBanner = this.addBuildingOrProp({
      texture: 'sv_sign_wood',
      x: 560,
      y: 485,
      scale: 1.55,
      shadowW: 44,
      shadowH: 14,
      label: '🏛️ KROM GUILD HALL · ENTER',
      joinArrowY: 438,
    });
    kromBanner.setTint(0xfde047);
    const openKrom = () => {
      if (!this.guardInteractRange(560, 485)) return;
      if (this.player.state.kromId || this.player.state.kromTag) {
        this.enterKromHall();
      } else {
        EventBus.emit('ui:openModal', { modal: 'krom' });
      }
    };
    kromBanner.setInteractive({ useHandCursor: true }).on('pointerdown', openKrom);
    this.landmarks.push({
      x: 560,
      y: 492,
      radius: 56,
      label: 'Press [E] or Click → Enter Krom Guild Hall (or Create/Join a Krom)',
      isDungeonPortal: false,
      onInteract: openKrom,
    });

    const mirrorGlow = this.add
      .image(1040, 472, 'portal_vortex')
      .setTint(0x38bdf8)
      .setScale(0.75)
      .setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(478);
    this.tweens.add({ targets: mirrorGlow, alpha: 0.3, scale: 0.88, duration: 920, yoyo: true, repeat: -1 });
    const scryingMirror = this.addBuildingOrProp({
      texture: 'na_singha_statue',
      x: 1040,
      y: 485,
      scale: 1.05,
      shadowW: 42,
      shadowH: 14,
      label: '🔮 TEMPLE SCRYING MIRROR',
      joinArrowY: 435,
    });
    scryingMirror.setTint(0x7dd3fc);
    const openMirror = () => {
      if (!this.guardInteractRange(1040, 485)) return;
      EventBus.emit('ui:openModal', { modal: 'scryingMirror' });
    };
    scryingMirror.setInteractive({ useHandCursor: true }).on('pointerdown', openMirror);
    this.landmarks.push({
      x: 1040,
      y: 492,
      radius: 54,
      label: 'Press [E] or Click → Gaze into Scrying Mirror (Send Village Cheer Drops!)',
      isDungeonPortal: false,
      onInteract: openMirror,
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
    homeImg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.guardInteractRange(280, 485)) return;
      this.enterHouseInterior();
    });
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

    // 7. UPDATE 2.9: PLAZA AMPHITHEATER STAGE (South-Center Courtyard — Live Pinpeat & Chapei Jamming!)
    const stageX = 800;
    const stageY = 748;
    const stageDeck = this.add
      .rectangle(stageX, stageY, 152, 54, 0x78350f, 0.96)
      .setStrokeStyle(3, 0xfacc15)
      .setDepth(700)
      .setInteractive({ useHandCursor: true });
    this.add
      .rectangle(stageX, stageY, 134, 38, 0x991b1b, 0.92)
      .setStrokeStyle(1.5, 0xfde047)
      .setDepth(701);
    const stageGlow = this.add
      .image(stageX, stageY - 12, 'torch_glow')
      .setTint(0xfde047)
      .setScale(0.95)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(702);
    vfxManager.applyBloom(this, stageGlow, { color: 0xfacc15, strength: 1.35 });
    this.glowLights.push(stageGlow);
    this.add
      .text(stageX, stageY - 4, '🎶 🎹 🎸 🥁', { fontSize: '14px' })
      .setOrigin(0.5)
      .setDepth(705);
    this.add
      .text(stageX, stageY - 34, '🎵 PLAZA AMPHITHEATER STAGE · PLAY MUSIC', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(120, 53, 15, 0.94)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(710);
    const openJamStage = () => {
      if (!this.guardInteractRange(stageX, stageY, 135)) return;
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'instrumentJam' });
    };
    stageDeck.on('pointerdown', openJamStage);
    this.landmarks.push({
      x: stageX,
      y: stageY,
      radius: 82,
      label: 'Press [E] or Click → 🎵 Play Live Khmer Instruments (Roneat Aek, Chapei, Khim, Skor Thom, Chhing)',
      isDungeonPortal: false,
      onInteract: openJamStage,
    });
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
        if (!this.guardInteractRange(p.x, p.y)) return;
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
      if (!this.guardInteractRange(400, 445)) return;
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
      if (!this.guardInteractRange(800, 438)) return;
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
      .on('pointerdown', () => {
        if (!this.guardInteractRange(1185, 442)) return;
        EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' });
      });

    this.add.image(1222, 444, 'soft_shadow').setDisplaySize(24, 8).setDepth(440);
    const masterNpc = this.add
      .sprite(1222, 444, 'char_master', 0)
      .setOrigin(0.5, 0.92)
      .setScale(1.3)
      .setDepth(445)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: masterNpc, y: 442, duration: 520, yoyo: true, repeat: -1 });
    const openForge = () => {
      if (!this.guardInteractRange(1185, 442)) return;
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'reforge' });
    };
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
      if (!this.guardInteractRange(560, 816)) return;
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

    // 4B. UPDATE 2.7 — GRAND ANGKOR AUCTION HALL PODIUM (Right beside Village Market Board!)
    const aucGlow = this.add
      .image(445, 735, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(1.15)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(740);
    vfxManager.applyBloom(this, aucGlow, { color: 0xfacc15, strength: 1.5 });
    this.glowLights.push(aucGlow);
    const auctionHall = this.addBuildingOrProp({
      texture: 'ancient_pagoda',
      x: 445,
      y: 762,
      scale: 1.12,
      shadowW: 76,
      shadowH: 18,
      bodyW: 52,
      bodyH: 22,
      label: '🏛️ ANGKOR AUCTION HALL · RARE+',
      joinArrowY: 684,
    });
    auctionHall.setTint(0xfde68a);
    const openAuctionHall = () => {
      if (!this.guardInteractRange(445, 762, 130)) return;
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'auctionHouse' });
    };
    auctionHall.setInteractive({ useHandCursor: true }).on('pointerdown', openAuctionHall);
    this.landmarks.push({
      x: 445,
      y: 772,
      radius: 68,
      label: 'Press [E] or Click → 🏛️ Enter Angkor Auction Hall (Rare/Mythic/Ancient Timed Bids)',
      isDungeonPortal: false,
      onInteract: openAuctionHall,
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
    club.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.guardInteractRange(1060, 820)) return;
      this.enterClub();
    });
    this.landmarks.push({
      x: 1060,
      y: 830,
      radius: 62,
      label: 'Press [E] or Click → Enter Phum Club (Kla Klok, Ouk Chaktrang & Tien Len)',
      isDungeonPortal: true,
      onInteract: () => this.enterClub(),
    });

    // 6. WEEKLY FASHION RUNWAY STAGE (South-Center, spacious spotlight catwalk between Market & Club!)
    const rx = 800;
    const ry = 852;
    const stageBase = this.add
      .rectangle(rx, ry, 178, 56, 0x4c0519, 0.96)
      .setStrokeStyle(3, 0xfacc15, 0.95)
      .setDepth(ry - 16)
      .setInteractive({ useHandCursor: true });
    const stageCarpet = this.add
      .rectangle(rx, ry, 162, 34, 0x9f1239, 0.92)
      .setStrokeStyle(1.5, 0xfde047, 0.8)
      .setDepth(ry - 15)
      .setInteractive({ useHandCursor: true });

    // 4 Blooming Warm Stage Spotlights + Floating Confetti Motes
    for (const [sx, sy, tint] of [
      [rx - 74, ry - 26, 0xfacc15],
      [rx + 74, ry - 26, 0xf472b6],
      [rx - 74, ry + 26, 0xf472b6],
      [rx + 74, ry + 26, 0xfacc15],
    ]) {
      const bulb = this.add.circle(sx, sy, 5, tint, 0.95).setStrokeStyle(1.5, 0xffffff).setDepth(ry + 2);
      const beam = this.add
        .image(sx, sy, 'torch_glow')
        .setTint(tint)
        .setScale(0.85)
        .setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(ry + 1);
      vfxManager.applyBloom(this, beam, { color: tint, strength: 1.4 });
      this.glowLights.push(beam);
      this.tweens.add({ targets: [bulb, beam], alpha: 0.35, duration: 760, yoyo: true, repeat: -1 });
    }
    for (let i = 0; i < 10; i++) {
      const cx = rx + Phaser.Math.Between(-72, 72);
      const cy = ry + Phaser.Math.Between(-24, 14);
      const confetti = this.add
        .rectangle(cx, cy, 4, 4, [0xfacc15, 0xf472b6, 0x38bdf8, 0x4ade80][i % 4], 0.9)
        .setDepth(ry + 6);
      this.tweens.add({
        targets: confetti,
        y: cy - 18,
        angle: 180,
        alpha: 0.25,
        duration: 1300 + i * 110,
        yoyo: true,
        repeat: -1,
      });
    }

    const runwayArrow = this.add.image(rx, ry - 48, 'join_arrow').setScale(0.56).setDepth(ry + 18);
    this.tweens.add({ targets: runwayArrow, y: ry - 56, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(rx, ry - 34, '👑 WEEKLY FASHION RUNWAY STAGE', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(88, 28, 135, 0.94)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5, 1)
      .setDepth(ry + 16);

    const openRunway = () => {
      if (!this.guardInteractRange(rx, ry)) return;
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'runway' });
    };
    stageBase.on('pointerdown', openRunway);
    stageCarpet.on('pointerdown', openRunway);
    this.landmarks.push({
      x: rx,
      y: ry,
      radius: 86,
      label: 'Press [E] or Click → 👑 Strut the Weekly Fashion Runway Stage!',
      isDungeonPortal: false,
      onInteract: openRunway,
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
      if (!this.guardInteractRange(455, 635)) return;
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
      if (!this.guardInteractRange(1145, 642)) return;
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

    // 3. SPACED SACRED PORTAL PAVILIONS (Wide 640px breathing room on North Terrace — zero crowding!)
    const portalHallEntries: Array<{
      x: number;
      y: number;
      tint: number;
      title: string;
      prompt: string;
      onEnter: () => void;
    }> = [
      {
        x: 470,
        y: 330,
        tint: 0xc084fc,
        title: 'ENDLESS PAGODA TOWER',
        prompt: 'Press [E] or Click → Endless 50-Floor Pagoda Tower (Checkpoints & Weapon Auras)',
        onEnter: () => {
          EventBus.emit('ui:openModal', { modal: 'pagodaTower' });
        },
      },
      {
        x: 1130,
        y: 330,
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
      gate.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (!this.guardInteractRange(arch.x, arch.y)) return;
        arch.onEnter();
      });
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
      if (!this.guardInteractRange(800, 635)) return;
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

    // 5. TEMPLE SCRYING MIRROR (South-West Terrace) — Plaza-to-Dungeon Village Cheer Drops
    const tmGlow = this.add
      .image(625, 795, 'portal_vortex')
      .setTint(0x38bdf8)
      .setScale(0.75)
      .setAlpha(0.58)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(798);
    this.tweens.add({ targets: tmGlow, alpha: 0.28, scale: 0.9, duration: 920, yoyo: true, repeat: -1 });
    const tmMirror = this.addBuildingOrProp({
      texture: 'na_singha_statue',
      x: 625,
      y: 808,
      scale: 1.05,
      shadowW: 42,
      shadowH: 14,
      label: '🔮 TEMPLE SCRYING MIRROR',
      joinArrowY: 758,
    });
    tmMirror.setTint(0x7dd3fc);
    tmMirror.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.guardInteractRange(625, 808)) return;
      EventBus.emit('ui:openModal', { modal: 'scryingMirror' });
    });
    this.landmarks.push({
      x: 625,
      y: 816,
      radius: 56,
      label: 'Press [E] or Click → Temple Scrying Mirror (Send Hot Num Pang Cheer Drops!)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'scryingMirror' }),
    });

    // 6. UPDATE 3.1 — KUN KHMER 1v1 SPARRING RING (South-East Sandstone Arena Terrace)
    const ringX = 1045;
    const ringY = 825;
    const ringGfx = this.add.graphics().setDepth(14);
    ringGfx.fillStyle(0x573b26, 0.95);
    ringGfx.fillRoundedRect(ringX - 92, ringY - 58, 184, 116, 14);
    ringGfx.fillStyle(0xc2955b, 0.96);
    ringGfx.fillRoundedRect(ringX - 78, ringY - 46, 156, 92, 10);
    ringGfx.lineStyle(2.5, 0xdc2626, 0.92);
    ringGfx.strokeRoundedRect(ringX - 78, ringY - 46, 156, 92, 10);
    ringGfx.lineStyle(2, 0xfacc15, 0.9);
    ringGfx.strokeRoundedRect(ringX - 72, ringY - 40, 144, 80, 8);
    ringGfx.strokeCircle(ringX, ringY, 22);
    for (const [cx, cy, col] of [
      [ringX - 78, ringY - 46, 0xdc2626],
      [ringX + 78, ringY - 46, 0x2563eb],
      [ringX - 78, ringY + 46, 0xdc2626],
      [ringX + 78, ringY + 46, 0x2563eb],
    ] as Array<[number, number, number]>) {
      this.add.circle(cx, cy, 7, col, 1).setStrokeStyle(2, 0xfef08a).setDepth(ringY + 20);
    }
    const ringZone = this.add
      .rectangle(ringX, ringY, 176, 108, 0xffffff, 0)
      .setDepth(ringY + 22)
      .setInteractive({ useHandCursor: true });
    ringZone.on('pointerdown', () => {
      if (!this.guardInteractRange(ringX, ringY, 160)) return;
      EventBus.emit('ui:openModal', { modal: 'arena' });
    });
    const ringArrow = this.add.image(ringX, ringY - 62, 'join_arrow').setScale(0.55).setDepth(ringY + 40);
    this.tweens.add({ targets: ringArrow, y: ringY - 68, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(ringX, ringY + 60, '🥊 KUN KHMER 1v1 SPARRING RING', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(127, 29, 29, 0.92)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5, 0)
      .setDepth(ringY + 45);
    this.landmarks.push({
      x: ringX,
      y: ringY,
      radius: 96,
      label: 'Press [E] or Click → Enter Kun Khmer 1v1 Sparring Ring (Normalized / Open Gear / Spectate)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:openModal', { modal: 'arena' }),
    });

    // 7. UPDATE 3.2 — SBEK THOM SHADOW PUPPET THEATER STAGE (South-West Sacred Terrace)
    const stX = 345;
    const stY = 815;
    const stGfx = this.add.graphics().setDepth(stY - 6);
    // Dark teak theater frame + warm backlit parchment screen
    stGfx.fillStyle(0x3b1808, 0.98);
    stGfx.fillRoundedRect(stX - 68, stY - 58, 136, 74, 10);
    stGfx.lineStyle(2.5, 0xf59e0b, 0.95);
    stGfx.strokeRoundedRect(stX - 68, stY - 58, 136, 74, 10);
    // Warm glowing parchment projection screen
    stGfx.fillStyle(0xfef08a, 0.9);
    stGfx.fillRoundedRect(stX - 56, stY - 48, 112, 50, 6);
    // Stylized Hanuman & Preah Ream shadow silhouettes on the screen
    stGfx.fillStyle(0x1c0a03, 0.92);
    stGfx.fillRect(stX - 30, stY - 36, 12, 26);
    stGfx.fillTriangle(stX - 24, stY - 44, stX - 30, stY - 34, stX - 18, stY - 34);
    stGfx.fillRect(stX + 14, stY - 34, 14, 24);
    stGfx.fillCircle(stX + 21, stY - 38, 6);
    // Flickering coconut-husk firelight bloom behind screen
    const stGlow = this.add
      .image(stX, stY - 22, 'torch_glow')
      .setTint(0xf97316)
      .setScale(1.15)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(stY + 12);
    this.glowLights.push(stGlow);
    this.tweens.add({ targets: stGlow, alpha: 0.34, scale: 1.32, duration: 760, yoyo: true, repeat: -1 });
    const stHit = this.add
      .rectangle(stX, stY - 18, 142, 86, 0xffffff, 0)
      .setDepth(stY + 18)
      .setInteractive({ useHandCursor: true });
    const stArrow = this.add.image(stX, stY - 70, 'join_arrow').setScale(0.54).setDepth(stY + 25);
    this.tweens.add({ targets: stArrow, y: stY - 76, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(stX, stY + 22, '🎭 SBEK THOM SHADOW THEATER · REAMKER', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(124, 45, 18, 0.94)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 0)
      .setDepth(stY + 30);
    const openTheater = () => {
      if (!this.guardInteractRange(stX, stY, 145)) return;
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'sbekThom' });
    };
    stHit.on('pointerdown', openTheater);
    this.landmarks.push({
      x: stX,
      y: stY,
      radius: 86,
      label: 'Press [E] or Click → 🎭 Sbek Thom Shadow Puppet Theater & 5-Part Reamker Questline',
      isDungeonPortal: false,
      onInteract: openTheater,
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
      if (!this.guardInteractRange(490, 445)) return;
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
      if (!this.guardInteractRange(1110, 445)) return;
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
    const castFishingLine = () => {
      const fishingLv = this.player.state.skills?.skills?.fishing?.level ?? 1;
      this.fishingSystem?.startCast(this.player.x, this.player.y, fishingLv, (facing) => {
        this.player.facing = facing;
      });
    };
    const riverHit = this.add
      .rectangle(440, 840, 260, 155, 0x000000, 0)
      .setDepth(14)
      .setInteractive({ useHandCursor: true });
    riverHit.on('pointerdown', () => {
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      castFishingLine();
    });
    pier.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      castFishingLine();
    });
    this.landmarks.push({
      x: 535,
      y: 815,
      radius: MAX_FISHING_DISTANCE,
      label: 'Press [E] or Click River → Cast Bamboo Fishing Rod (4-Stage Animated Fishing!)',
      isDungeonPortal: false,
      onInteract: castFishingLine,
    });

    // 5. UPDATE 2.6 — CAPTAIN RITHY'S KOH RONG ISLAND BOAT FERRY DOCK (South-East Coast)
    this.add.image(1320, 875, 'sv_pond').setDisplaySize(290, 180).setTint(0x67e8f9).setDepth(3);
    const ferryWaterCol = this.add.rectangle(1355, 895, 190, 110, 0x000000, 0);
    this.colliders.add(ferryWaterCol);
    const ferryBoat = this.add.image(1345, 865, 'na_boat').setScale(0.95).setTint(0xfef08a).setDepth(14);
    this.tweens.add({ targets: ferryBoat, y: 873, duration: 1550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const ferryPier = this.addBuildingOrProp({
      texture: 'fishing_pier',
      x: 1245,
      y: 830,
      scale: 1.32,
      shadowW: 58,
      shadowH: 15,
      label: '⛵ FERRY TO KOH RONG ISLAND · CAPT. RITHY',
      joinArrowY: 758,
    });
    const rithyCap = this.add
      .sprite(1210, 815, 'char_master', 0)
      .setOrigin(0.5, 0.92)
      .setScale(1.22)
      .setTint(0xbae6fd)
      .setDepth(820)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: rithyCap, y: 812, duration: 640, yoyo: true, repeat: -1 });

    const sailToKohRong = () => {
      if (!this.guardInteractRange(1245, 825, 135)) return;
      soundManager.playSfx('splash');
      EventBus.emit('ui:toast', {
        text: '⛵ Captain Rithy sets sail! Crossing turquoise waters to Koh Rong Mythic Island...',
      });
      this.sailToMap('koh_rong_island', 360, 740);
    };
    ferryPier.setInteractive({ useHandCursor: true }).on('pointerdown', sailToKohRong);
    ferryBoat.setInteractive({ useHandCursor: true }).on('pointerdown', sailToKohRong);
    rithyCap.on('pointerdown', sailToKohRong);
    this.landmarks.push({
      x: 1245,
      y: 825,
      radius: 78,
      label: 'Press [E] or Click → ⛵ Sail to Koh Rong Mythic Island (Captain Rithy Ferry)',
      isDungeonPortal: false,
      onInteract: sailToKohRong,
    });

    // 6. UPDATE 2.9 — VILLAGE PET RACING ARENA ENTRANCE (North-Center Lawn — Track Announcer Sophat!)
    const trackX = 800;
    const trackY = 485;
    const gateArch = this.add
      .rectangle(trackX, trackY, 118, 42, 0x92400e, 0.96)
      .setStrokeStyle(3, 0xfacc15)
      .setDepth(482)
      .setInteractive({ useHandCursor: true });
    this.add
      .rectangle(trackX, trackY + 12, 108, 12, 0xffffff, 0.92)
      .setStrokeStyle(1, 0x0f172a)
      .setDepth(483);
    const trackGlow = this.add
      .image(trackX, trackY - 14, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(0.82)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(481);
    this.glowLights.push(trackGlow);
    const announcerNpc = this.add
      .sprite(trackX - 66, trackY + 8, 'char_master', 0)
      .setOrigin(0.5, 0.92)
      .setScale(1.18)
      .setTint(0xfef08a)
      .setDepth(492)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: announcerNpc, y: trackY + 5, duration: 580, yoyo: true, repeat: -1 });
    const trackArrow = this.add.image(trackX, trackY - 46, 'join_arrow').setScale(0.56).setDepth(500);
    this.tweens.add({ targets: trackArrow, y: trackY - 54, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(trackX, trackY - 26, '🏁 VILLAGE PET RACING TRACK · ANNOUNCER SOPHAT', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(120, 53, 15, 0.94)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(498);

    const openPetTrack = () => {
      if (!this.guardInteractRange(trackX, trackY, 135)) return;
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'petRace' });
    };
    gateArch.on('pointerdown', openPetTrack);
    announcerNpc.on('pointerdown', openPetTrack);
    this.landmarks.push({
      x: trackX,
      y: trackY + 12,
      radius: 82,
      label: 'Press [E] or Click → 🏁 Enter Village Pet Racing Arena (Win Coins, Pet XP Treats & Champion Ribbon!)',
      isDungeonPortal: false,
      onInteract: openPetTrack,
    });

    // UPDATE 3.4 — FESTIVE KHMER VILLAGE FOLK GAMES COURTYARD (Open North-East Lawn of Green Park!)
    const fgX = 1195;
    const fgY = 390;
    const fgGfx = this.add.graphics().setDepth(fgY - 20);
    // Woven pandan courtyard mat with krama border
    fgGfx.fillStyle(0x92400e, 0.94);
    fgGfx.fillRoundedRect(fgX - 78, fgY - 42, 156, 84, 10);
    fgGfx.fillStyle(0xd97706, 0.92);
    fgGfx.fillRoundedRect(fgX - 72, fgY - 36, 144, 72, 8);
    fgGfx.lineStyle(2, 0xfef08a, 0.9);
    fgGfx.strokeRoundedRect(fgX - 72, fgY - 36, 144, 72, 8);
    // Hanging colorful Krama pennant banner above courtyard
    const fgCols = [0xdc2626, 0xfacc15, 0x2563eb, 0x16a34a, 0xec4899];
    for (let i = 0; i < 8; i++) {
      const px = fgX - 64 + i * 18;
      fgGfx.fillStyle(fgCols[i % fgCols.length], 0.95);
      fgGfx.fillTriangle(px - 6, fgY - 46, px + 6, fgY - 46, px, fgY - 36);
    }
    // Decorative Bos Angkunh seeds + Clay Pot + Tug Rope motif on the mat
    fgGfx.fillStyle(0x451a03, 1);
    for (let i = -2; i <= 2; i++) fgGfx.fillCircle(fgX - 38 + i * 8, fgY + 12, 3.2);
    fgGfx.fillStyle(0xc2410c, 1);
    fgGfx.fillCircle(fgX + 4, fgY - 4, 9);
    fgGfx.lineStyle(3, 0xfef3c7, 0.9);
    fgGfx.lineBetween(fgX + 24, fgY + 10, fgX + 62, fgY + 10);
    fgGfx.fillStyle(0xdc2626, 1);
    fgGfx.fillRect(fgX + 41, fgY + 4, 4, 12);

    const fgArrow = this.add.image(fgX, fgY - 62, 'join_arrow').setScale(0.55).setDepth(fgY + 22);
    this.tweens.add({ targets: fgArrow, y: fgY - 70, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(fgX, fgY + 48, '🏮 KHMER FOLK GAMES COURTYARD · បោះអង្គញ់ · វាយក្អម · ទាញព្រ័ត្រ', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(120, 53, 15, 0.94)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 0)
      .setDepth(fgY + 25);

    const fgHit = this.add
      .rectangle(fgX, fgY, 160, 96, 0x000000, 0)
      .setDepth(fgY + 18)
      .setInteractive({ useHandCursor: true });
    const openFolkCourtyard = () => {
      if (!this.guardInteractRange(fgX, fgY, 145)) return;
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'folkGames' });
    };
    fgHit.on('pointerdown', openFolkCourtyard);
    this.landmarks.push({
      x: fgX,
      y: fgY + 12,
      radius: 86,
      label: "Press [E] or Click → 🏮 Play Khmer Folk Games (Bos Angkunh, Veay K'aom & Teanh Prot!)",
      isDungeonPortal: false,
      onInteract: openFolkCourtyard,
    });

    // UPDATE 3.2 — FLOATING MEKONG RIVER MARKET DOCK & BOBBING SAMPAN BOATS (Spacious South-Center Shoreline — wide clearance from Pier & Ferry!)
    const fmX = 830;
    const fmY = 905;
    const dockGfx = this.add.graphics().setDepth(fmY - 12);
    // Warm timber riverside jetty planks + lantern posts
    dockGfx.fillStyle(0x78350f, 0.96);
    dockGfx.fillRoundedRect(fmX - 74, fmY - 22, 148, 34, 6);
    dockGfx.lineStyle(2, 0xf59e0b, 0.9);
    dockGfx.strokeRoundedRect(fmX - 74, fmY - 22, 148, 34, 6);
    for (let px = fmX - 64; px <= fmX + 64; px += 16) {
      dockGfx.lineStyle(1, 0x451a03, 0.65);
      dockGfx.lineBetween(px, fmY - 22, px, fmY + 12);
    }
    // 3 Bobbing Wooden Sampan Trade Boats loaded with tropical fruit, Angkor silk & Kampot spices
    const boatSpecs: Array<{ bx: number; by: number; cargoCol: number; accent: number; phase: number }> = [
      { bx: fmX - 48, by: fmY + 34, cargoCol: 0xef4444, accent: 0xfacc15, phase: 0 },
      { bx: fmX, by: fmY + 42, cargoCol: 0xec4899, accent: 0xfef08a, phase: 1.2 },
      { bx: fmX + 50, by: fmY + 34, cargoCol: 0x22c55e, accent: 0xf97316, phase: 2.4 },
    ];
    for (const b of boatSpecs) {
      const boatCont = this.add.container(b.bx, b.by).setDepth(b.by);
      const hull = this.add.ellipse(0, 4, 42, 16, 0x78350f, 0.98).setStrokeStyle(1.5, 0x451a03);
      const crate1 = this.add.rectangle(-8, -2, 12, 9, b.cargoCol).setStrokeStyle(1, 0x2b1b17);
      const crate2 = this.add.rectangle(6, -1, 12, 8, b.accent).setStrokeStyle(1, 0x2b1b17);
      const lantern = this.add.circle(16, -8, 3.5, 0xfef08a, 0.95);
      boatCont.add([hull, crate1, crate2, lantern]);
      this.tweens.add({
        targets: boatCont,
        y: b.by - 4,
        angle: 2.2,
        duration: 1150 + b.phase * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    const fmGlow = this.add
      .image(fmX, fmY - 12, 'torch_glow')
      .setTint(0xf59e0b)
      .setScale(0.95)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(fmY + 12);
    this.glowLights.push(fmGlow);
    const fmArrow = this.add.image(fmX, fmY - 44, 'join_arrow').setScale(0.52).setDepth(fmY + 25);
    this.tweens.add({ targets: fmArrow, y: fmY - 50, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(fmX, fmY - 26, '🛶 FLOATING MEKONG RIVER MARKET', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(13, 148, 136, 0.94)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(fmY + 28);
    const fmHit = this.add
      .rectangle(fmX, fmY + 10, 158, 96, 0xffffff, 0)
      .setDepth(fmY + 30)
      .setInteractive({ useHandCursor: true });
    const openFloatingMarket = () => {
      if (!this.guardInteractRange(fmX, fmY, 155)) return;
      soundManager.playSfx('coin');
      EventBus.emit('ui:openModal', { modal: 'floatingMarket' });
    };
    fmHit.on('pointerdown', openFloatingMarket);
    this.landmarks.push({
      x: fmX,
      y: fmY,
      radius: 96,
      label: 'Press [E] or Click → 🛶 Floating Mekong River Market (Buy Low / Sell High Regional Trade!)',
      isDungeonPortal: false,
      onInteract: openFloatingMarket,
    });

    // Update 3.3 — Kite Master Stall in Green Park (Craft & Launch Khleng Ek Singing Kites!)
    this.buildKiteMasterStall(1140, 445);
  }

  private buildKiteMasterStall(kx: number, ky: number): void {
    const stallGfx = this.add.graphics().setDepth(ky - 4);
    stallGfx.fillStyle(0x78350f, 1);
    stallGfx.fillRoundedRect(kx - 28, ky - 22, 56, 32, 5);
    stallGfx.fillStyle(0xf59e0b, 1);
    stallGfx.fillRoundedRect(kx - 32, ky - 32, 64, 14, 4);
    stallGfx.lineStyle(1.8, 0x451a03, 1);
    stallGfx.strokeRoundedRect(kx - 32, ky - 32, 64, 14, 4);
    // Display colorful miniature Khleng Ek kite hanging above stall
    stallGfx.fillStyle(0xdc2626, 1);
    stallGfx.fillTriangle(kx, ky - 46, kx - 12, ky - 36, kx + 12, ky - 36);
    stallGfx.lineStyle(1.4, 0xfef08a, 1);
    stallGfx.lineBetween(kx - 4, ky - 36, kx - 8, ky - 24);
    stallGfx.lineBetween(kx + 4, ky - 36, kx + 8, ky - 24);

    this.add
      .text(kx, ky + 14, '🪁 KHLENG EK KITE MASTER', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(120, 53, 15, 0.92)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.42)
      .setOrigin(0.5, 0)
      .setDepth(ky + 16);

    const kHit = this.add.rectangle(kx, ky - 8, 74, 56, 0x000000, 0).setDepth(ky + 20).setInteractive({ useHandCursor: true });
    const openKiteWorkshop = () => {
      if (!this.guardInteractRange(kx, ky, 140)) return;
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'kiteWorkshop' });
    };
    kHit.on('pointerdown', openKiteWorkshop);
    this.landmarks.push({
      x: kx,
      y: ky,
      radius: 82,
      label: 'Press [E] or Click → 🪁 Khleng Ek Singing Kite Workshop (Craft & Fly Sunset Kites!)',
      isDungeonPortal: false,
      onInteract: openKiteWorkshop,
    });
  }

  // ==================== MAP 10 (UPDATE 3.3): PHNOM KULEN SACRED WATERFALL SANCTUARY ====================
  private buildPhnomKulenSanctuaryMap(): void {
    const W = 1400;
    const H = 1000;
    this.cameras.main.setBounds(0, 0, W, H);

    // 1. Serene Mountain Plateau Emerald-Jade Ground + Elevated Northern Sandstone Cliff Ledge
    this.add
      .tileSprite(W / 2, H / 2, W, H, 'sv_grass')
      .setTint(0x6ee7b7)
      .setDepth(0);

    const g = this.add.graphics().setDepth(2);
    // Northern mountain sandstone cliff wall behind the Sacred Waterfall
    g.fillStyle(0x57534e, 1);
    g.fillRoundedRect(24, 40, W - 48, 175, 16);
    g.fillStyle(0x78716c, 0.92);
    g.fillRoundedRect(38, 52, W - 76, 132, 12);
    // Mossy stone ledge trim
    g.fillStyle(0x15803d, 0.82);
    g.fillRoundedRect(38, 48, W - 76, 26, 10);

    // 2. Shallow Turquoise "River of a Thousand Lingas" + Submerged Carved Angkor Linga Stone Reliefs!
    g.fillStyle(0x0891b2, 0.72);
    g.fillRoundedRect(540, 195, 320, 340, 68);
    g.fillStyle(0x22d3ee, 0.48);
    g.fillRoundedRect(570, 220, 260, 290, 56);
    // Submerged carved sandstone Linga reliefs visible beneath the turquoise water!
    for (let ly = 248; ly <= 395; ly += 28) {
      for (let lx = 602; lx <= 798; lx += 32) {
        g.fillStyle(0x92400e, 0.34);
        g.fillRoundedRect(lx - 8, ly - 8, 16, 16, 3);
        g.lineStyle(1, 0xfef3c7, 0.25);
        g.strokeCircle(lx, ly, 4.5);
      }
    }

    // 3. Peaceful Spirit Meditation Pool (x: 700, y: 470) with Golden Lotus Glow!
    g.fillStyle(0x67e8f9, 0.45);
    g.fillCircle(700, 470, 74);
    g.lineStyle(2.5, 0xfef08a, 0.72);
    g.strokeCircle(700, 470, 76);

    // Stepping-stone footpath from South Stairway -> Meditation Pool -> Cliff Overlook
    this.add.tileSprite(700, 710, 64, 340, 'sv_path').setTint(0xd6d3d1).setDepth(3);
    this.add.tileSprite(900, 520, 380, 44, 'sv_path').setTint(0xd6d3d1).setDepth(3);

    // 4. Multi-Tier Animated Cascading Sacred Waterfall (x: 640..760, y: 80..225)
    for (let wx = 644; wx <= 756; wx += 28) {
      if (this.textures.exists('na_wf_top') && this.anims.exists('wf_top')) {
        this.add.sprite(wx, 108, 'na_wf_top').setScale(2.0).setDepth(12).play('wf_top');
      }
      if (this.textures.exists('na_wf_mid') && this.anims.exists('wf_mid')) {
        this.add.sprite(wx, 148, 'na_wf_mid').setScale(2.0).setDepth(12).play('wf_mid');
        this.add.sprite(wx, 184, 'na_wf_mid').setScale(2.0).setDepth(12).play('wf_mid');
      }
      if (this.textures.exists('na_wf_bot') && this.anims.exists('wf_bot')) {
        this.add.sprite(wx, 218, 'na_wf_bot').setScale(2.1).setDepth(13).play('wf_bot');
      }
    }
    // Soft Animated Water Shimmer Ripples across River of a Thousand Lingas (smooth translucent rings, zero boxy sprite seams)
    const kulenRipples: Array<[number, number, number]> = [
      [630, 290, 0],
      [770, 305, 450],
      [660, 365, 900],
      [745, 385, 1350],
      [700, 445, 300],
      [645, 480, 750],
      [755, 480, 1150],
    ];
    for (const [rx, ry, delayMs] of kulenRipples) {
      const ring = this.add
        .ellipse(rx, ry, 34, 12, 0x99f6e4, 0.14)
        .setStrokeStyle(1.6, 0xe0f2fe, 0.58)
        .setDepth(8);
      this.tweens.add({
        targets: ring,
        scaleX: 1.85,
        scaleY: 1.65,
        alpha: 0,
        duration: 2100,
        delay: delayMs,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }
    // Blooming Waterfall Mist & Rainbow Halo
    const waterfallGlow = this.add
      .image(700, 224, 'torch_glow')
      .setTint(0x67e8f9)
      .setScale(2.2, 1.1)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.glowLights.push(waterfallGlow);

    // Sanctuary Landmarks Titles
    this.add
      .text(700, 232, '⛰️ PHNOM KULEN SACRED WATERFALL · RIVER OF A THOUSAND LINGAS', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#cffafe',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5)
      .setDepth(260);

    this.add
      .text(700, 554, '🪷 SPIRIT MEDITATION POOL — Wade here 5s for Kulen Sacred Blessing (+10% XP & Boss DEF)', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(6, 78, 59, 0.9)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5)
      .setDepth(260);

    // Meditation Pool live 5s ring UI
    this.kulenMeditationGfx = this.add.graphics().setDepth(2400);
    this.kulenMeditationText = this.add
      .text(700, 404, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setResolution(2)
      .setScale(0.48)
      .setOrigin(0.5)
      .setDepth(2405)
      .setVisible(false);

    // 5. Windy Cliff Overlook Kite Master Stall (East cliff overlook)
    this.buildKiteMasterStall(1110, 445);

    // 6. Mountain Foraging Nodes: Rare Kulen Wild Orchids & Sacred Sandstone Shards!
    const kulenNodes: Array<{ x: number; y: number; kind: 'orchid' | 'sandstone' }> = [
      { x: 255, y: 340, kind: 'orchid' },
      { x: 365, y: 540, kind: 'orchid' },
      { x: 1030, y: 690, kind: 'orchid' },
      { x: 295, y: 710, kind: 'sandstone' },
      { x: 465, y: 315, kind: 'sandstone' },
      { x: 965, y: 315, kind: 'sandstone' },
    ];
    kulenNodes.forEach((n, idx) => {
      const isOrchid = n.kind === 'orchid';
      const nodeGfx = this.add.graphics().setDepth(n.y);
      if (isOrchid) {
        nodeGfx.fillStyle(0x16a34a, 1);
        nodeGfx.fillEllipse(n.x, n.y + 4, 18, 9);
        nodeGfx.fillStyle(0xe879f9, 1);
        nodeGfx.fillCircle(n.x - 4, n.y - 3, 4.5);
        nodeGfx.fillCircle(n.x + 4, n.y - 3, 4.5);
        nodeGfx.fillCircle(n.x, n.y - 7, 5);
        nodeGfx.fillStyle(0xfef08a, 1);
        nodeGfx.fillCircle(n.x, n.y - 5, 2);
      } else {
        nodeGfx.fillStyle(0xb45309, 1);
        nodeGfx.fillRoundedRect(n.x - 10, n.y - 8, 20, 14, 4);
        nodeGfx.lineStyle(1.4, 0xfef08a, 0.9);
        nodeGfx.strokeRoundedRect(n.x - 10, n.y - 8, 20, 14, 4);
      }
      const lbl = this.add
        .text(n.x, n.y + 12, isOrchid ? '🌺 Kulen Wild Orchid' : '🪨 Sacred Sandstone', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: isOrchid ? '#f5d0fe' : '#fde68a',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: { x: 4, y: 1 },
        })
        .setResolution(2)
        .setScale(0.38)
        .setOrigin(0.5, 0)
        .setDepth(n.y + 4);
      let cooldownUntil = 0;
      const hit = this.add.rectangle(n.x, n.y, 34, 34, 0x000000, 0).setDepth(n.y + 8).setInteractive({ useHandCursor: true });
      const harvest = () => {
        if (!this.guardInteractRange(n.x, n.y, 125)) return;
        const now = Date.now();
        if (now < cooldownUntil) {
          EventBus.emit('ui:toast', { text: `⏳ Respawning in ${Math.ceil((cooldownUntil - now) / 1000)}s...` });
          return;
        }
        cooldownUntil = now + 22_000;
        nodeGfx.setAlpha(0.35);
        this.time.delayedCall(22_000, () => {
          if (nodeGfx.active) nodeGfx.setAlpha(1);
        });
        soundManager.playSfx('harvest');
        vfxManager.playSpriteVfx(this, isOrchid ? 'vfx_sparkle_blue' : 'vfx_sparkle_green', n.x, n.y - 6, {
          scale: 1.4,
          tint: isOrchid ? 0xe879f9 : 0xfacc15,
          additive: true,
          depth: n.y + 20,
        });
        EventBus.emit('frontier:gather', {
          skillId: isOrchid ? 'foraging' : 'mining',
          xp: 48,
          coins: 35,
          itemId: isOrchid ? 'item_kulen_wild_orchid' : 'item_sacred_sandstone_shard',
          label: isOrchid
            ? `🌺 Foraged Kulen Wild Orchid (+48 Foraging XP, +35c)!`
            : `🪨 Gathered Sacred Sandstone Shard (+48 Mining XP, +35c)!`,
        });
      };
      hit.on('pointerdown', harvest);
      this.landmarks.push({
        x: n.x,
        y: n.y,
        radius: 64,
        label: `Press [E] or Click → ${isOrchid ? '🌺 Forage Kulen Wild Orchid' : '🪨 Gather Sacred Sandstone Shard'}`,
        isDungeonPortal: false,
        onInteract: harvest,
      });
      void idx;
      void lbl;
    });

    // Framing Mountain Pines & Ancient Angkor Ruins along borders
    for (const [tx, ty] of [[120, 260], [160, 480], [130, 740], [1260, 260], [1240, 560], [1250, 780], [420, 220], [990, 220]]) {
      this.add.image(tx, ty, 'sv_tree_teal').setOrigin(0.5, 0.92).setScale(1.45).setDepth(ty);
    }
    if (this.textures.exists('na_ruin_statue')) {
      this.add.image(520, 455, 'na_ruin_statue').setOrigin(0.5, 0.9).setScale(1.4).setDepth(455);
      this.add.image(880, 455, 'na_ruin_statue').setOrigin(0.5, 0.9).setScale(1.4).setDepth(455);
    }
  }

  private spawnSharedPartyFeastTable(evt: {
    partyId: string;
    hostName: string;
    kitId: string;
    mapId: string;
    mapLabel: string;
    x: number;
    y: number;
    fireworkShells: number;
    palette: number[];
    expiresAt: number;
  }): void {
    // Clean previous party table if any
    this.activePartyObjects.forEach((o) => {
      if (o?.scene) o.destroy();
    });
    this.activePartyObjects = [];
    if (this.activePartyLandmark) {
      this.landmarks = this.landmarks.filter((l) => l !== this.activePartyLandmark);
      this.activePartyLandmark = null;
    }

    const px = Phaser.Math.Clamp(evt.x, 180, 1220);
    const py = Phaser.Math.Clamp(evt.y + 42, 240, 880);

    // Launch Synchronized Blooming Fireworks Overhead!
    soundManager.playFireworkBurst();
    vfxManager.playSynchronizedFireworkShow(this, px, py - 40, evt.palette, evt.fireworkShells, 2380);

    // Spawn 5-minute Shared Party Feast Table!
    const tblGfx = this.add.graphics().setDepth(py);
    tblGfx.fillStyle(0x78350f, 1);
    tblGfx.fillRoundedRect(px - 42, py - 16, 84, 30, 6);
    tblGfx.fillStyle(0xdc2626, 0.95);
    tblGfx.fillRoundedRect(px - 38, py - 14, 76, 20, 4);
    tblGfx.lineStyle(1.8, 0xfacc15, 1);
    tblGfx.strokeRoundedRect(px - 38, py - 14, 76, 20, 4);
    // Khmer Feast dishes & glowing golden lanterns on the table
    for (const dx of [-24, -8, 8, 24]) {
      tblGfx.fillStyle(0xfef9c3, 1);
      tblGfx.fillCircle(px + dx, py - 5, 5);
      tblGfx.fillStyle(dx % 16 === 0 ? 0xf97316 : 0x22c55e, 1);
      tblGfx.fillCircle(px + dx, py - 6, 3);
    }
    const glow = this.add
      .image(px, py - 8, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(1.1)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(py - 2);
    const banner = this.add
      .text(px, py - 26, `🎉 ${evt.hostName.toUpperCase()}'S PARTY FEAST TABLE! [E] Free Buff Snack`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(131, 24, 67, 0.92)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.42)
      .setOrigin(0.5, 1)
      .setDepth(py + 16);

    const hit = this.add.rectangle(px, py, 94, 46, 0x000000, 0).setDepth(py + 18).setInteractive({ useHandCursor: true });
    const grabSnack = () => {
      if (!this.guardInteractRange(px, py, 145)) return;
      soundManager.playSfx('coin');
      vfxManager.playHealSpellVfx(this, this.player.x, this.player.y, 2400);
      vfxManager.playHeartBurstVfx(this, px, py - 14, 2405);
      EventBus.emit('party:feastSnack', { hostName: evt.hostName });
    };
    hit.on('pointerdown', grabSnack);

    const lm: LandmarkZone = {
      x: px,
      y: py,
      radius: 86,
      label: `Press [E] or Click → 🎉 Grab Free Party Feast Snack (+15% Speed & +15% Luck!)`,
      isDungeonPortal: false,
      onInteract: grabSnack,
    };
    this.landmarks.push(lm);
    this.activePartyLandmark = lm;
    this.activePartyObjects = [tblGfx, glow, banner, hit];

    // Despawn feast table cleanly after 5 minutes
    const ttl = Math.max(15_000, evt.expiresAt - Date.now());
    this.time.delayedCall(ttl, () => {
      if (this.activePartyLandmark === lm) {
        this.activePartyObjects.forEach((o) => {
          if (o?.scene) o.destroy();
        });
        this.activePartyObjects = [];
        this.landmarks = this.landmarks.filter((l) => l !== lm);
        this.activePartyLandmark = null;
      }
    });
  }

  // ==================== MAP 9 (UPDATE 2.6): KOH RONG MYTHIC ISLAND ====================
  private buildKohRongIslandMap(): void {
    // Tropical turquoise sea backdrop + gleaming white-gold sand beach + lush palm ridge
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x0891b2, 1);
    bg.fillRect(0, 0, MAP_W, MAP_H);
    bg.fillStyle(0x06b6d4, 0.85);
    bg.fillRect(0, 740, MAP_W, 180);
    // Tropical northern palm grass ridge
    bg.fillStyle(0x16a34a, 0.95);
    bg.fillRoundedRect(60, 64, MAP_W - 120, 290, 48);
    bg.fillStyle(0x22c55e, 0.5);
    bg.fillRoundedRect(100, 96, MAP_W - 200, 220, 40);
    // Warm white-gold Koh Rong sand beach
    bg.fillStyle(0xfef3c7, 1);
    bg.fillRoundedRect(88, 280, MAP_W - 176, 515, 76);
    bg.fillStyle(0xfde68a, 0.72);
    bg.fillRoundedRect(118, 325, MAP_W - 236, 445, 62);
    // Wet shoreline sand strip
    bg.fillStyle(0xfcd34d, 0.75);
    bg.fillRoundedRect(110, 755, MAP_W - 220, 46, 22);

    // Animated white ocean wave foam along turquoise shoreline
    for (let i = 0; i < 11; i++) {
      const wx = 175 + i * 124;
      const wy = 804 + (i % 2) * 8;
      const foam = this.add.ellipse(wx, wy, 108, 14, 0xe0f2fe, 0.78).setDepth(4);
      this.tweens.add({
        targets: foam,
        y: wy - 10,
        alpha: 0.28,
        scaleX: 1.12,
        duration: 1850 + (i % 4) * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    for (let i = 0; i < 8; i++) {
      const rx = 240 + i * 165;
      const ry = 920 + (i % 2) * 60;
      const rip = this.add.sprite(rx, ry, 'na_ripples', 0).setScale(1.35).setDepth(5).setAlpha(0.65);
      if (this.anims.exists('water_ripples_blue')) rip.play('water_ripples_blue');
    }

    // Invisible shoreline colliders (keep player on beach/piers, leaving ocean buoy & piers reachable!)
    this.colliders.add(this.add.rectangle(800, 940, MAP_W, 140, 0x000000, 0));
    this.colliders.add(this.add.rectangle(42, 600, 84, MAP_H, 0x000000, 0));
    this.colliders.add(this.add.rectangle(MAP_W - 42, 600, 84, MAP_H, 0x000000, 0));

    // Island welcome sign
    this.add
      .text(800, 292, '🏝️ KOH RONG MYTHIC ISLAND · កោះរ៉ុងទេព\nTropical Beach Hangout · Deep-Sea Fishing Pier · Coral Reef Pearl Diving', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef9c3',
        backgroundColor: 'rgba(8, 51, 68, 0.9)',
        align: 'center',
        padding: { x: 12, y: 5 },
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(295);

    // Coconut palms framing the northern tropical ridge
    for (const [tx, ty, tex] of [
      [210, 250, 'na_palm_tree'],
      [360, 215, 'sugar_palm_tree'],
      [560, 235, 'na_palm_tree'],
      [780, 210, 'sugar_palm_tree'],
      [1010, 230, 'na_palm_tree'],
      [1210, 215, 'sugar_palm_tree'],
      [1380, 255, 'na_palm_tree'],
      [205, 510, 'na_palm_tree'],
      [1395, 520, 'na_palm_tree'],
    ] as Array<[number, number, string]>) {
      const palm = this.addBuildingOrProp({
        texture: tex,
        x: tx,
        y: ty,
        scale: 1.12,
        shadowW: 42,
        shadowH: 13,
        bodyW: 16,
        bodyH: 12,
      });
      this.tweens.add({
        targets: palm,
        angle: tx % 2 === 0 ? 2.2 : -2.2,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 1. TWO GLOWING EVENING BEACH BONFIRES (WebGL Bloom + crackling glow)
    for (const [bx, by] of [[505, 495], [755, 495]]) {
      const glow = this.add
        .image(bx, by - 4, 'torch_glow')
        .setTint(0xfb923c)
        .setScale(1.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2140)
        .setAlpha(0.6);
      this.glowLights.push(glow);
      vfxManager.applyBloom(this, glow, { color: 0xfb923c, strength: 1.45 });
      const fire = this.add.sprite(bx, by, 'sv_campfire_16', 0).setScale(1.35).setDepth(by);
      if (this.anims.exists('campfire_burn')) fire.play('campfire_burn');
    }

    // 2. THREE INTERACTIVE BEACH LOUNGE CHAIRS (Click or [E] to actually sit & relax!)
    const chairCoords: Array<[number, number, number]> = [
      [530, 610, 0x38bdf8],
      [625, 610, 0xf472b6],
      [720, 610, 0x34d399],
    ];
    chairCoords.forEach(([cx, cy, stripeColor], idx) => {
      const chair = this.add.container(cx, cy).setDepth(cy - 2);
      const shadow = this.add.ellipse(0, 10, 44, 14, 0x0f172a, 0.25);
      const frame = this.add.rectangle(0, 2, 34, 20, 0x92400e, 1).setStrokeStyle(1.5, 0x78350f);
      const cushion = this.add.rectangle(0, 0, 28, 16, 0xffffff, 1);
      const stripe = this.add.rectangle(0, 0, 28, 6, stripeColor, 0.9);
      const pillow = this.add.rectangle(0, -6, 22, 5, 0xfef3c7, 1);
      const umbrella = this.add.circle(18, -14, 15, stripeColor, 0.88).setStrokeStyle(2, 0xffffff, 0.9);
      chair.add([shadow, frame, cushion, stripe, pillow, umbrella]);
      chair.setSize(48, 42);
      chair.setInteractive({ useHandCursor: true });

      const sitOnLoungeChair = () => {
        if (!this.guardInteractRange(cx, cy, 125)) return;
        this.isSittingOnChair = true;
        this.player.sprite.setPosition(cx, cy - 4);
        this.player.body.setVelocity(0, 0);
        this.player.facing = 'down';
        this.player.playStateAnimation('idle');
        soundManager.playSfx('heal');
        this.spawnFloatingText(cx, cy - 26, '🌴 Relaxing on Koh Rong Beach! (+15 HP)', '#67e8f9');
        EventBus.emit('house:restHeal');
        EventBus.emit('ui:toast', {
          text: `🏖️ Lounging on Beach Chair #${idx + 1}! Enjoy the Koh Rong ocean breeze (move WASD to stand up).`,
        });
      };
      chair.on('pointerdown', sitOnLoungeChair);
      this.landmarks.push({
        x: cx,
        y: cy,
        radius: 50,
        label: 'Press [E] or Click → 🏖️ Sit & Relax on Koh Rong Beach Lounge Chair',
        isDungeonPortal: false,
        onInteract: sitOnLoungeChair,
      });
    });

    // 3. BEACH COCONUT BAR (Sells tropical Khmer snacks & fresh coconut drinks)
    const cocoBar = this.addBuildingOrProp({
      texture: 'stall_snack',
      x: 1030,
      y: 495,
      scale: 1.42,
      shadowW: 78,
      shadowH: 18,
      bodyW: 58,
      bodyH: 22,
      label: '🥥 BEACH COCONUT BAR · DRINKS & SNACKS',
      joinArrowY: 425,
    });
    const openCocoBar = () => {
      if (!this.guardInteractRange(1030, 495, 130)) return;
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'snackShop' });
    };
    cocoBar.setInteractive({ useHandCursor: true }).on('pointerdown', openCocoBar);
    this.landmarks.push({
      x: 1030,
      y: 508,
      radius: 72,
      label: 'Press [E] or Click → 🥥 Beach Coconut Bar (Tropical Drinks & Khmer Snacks)',
      isDungeonPortal: false,
      onInteract: openCocoBar,
    });

    // 4. RETURN FERRY DOCK TO GREEN PARK (West Beach Pier)
    const returnBoat = this.add.image(255, 845, 'na_boat').setScale(0.95).setTint(0xfef08a).setDepth(846);
    this.tweens.add({ targets: returnBoat, y: 853, duration: 1550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const returnPier = this.addBuildingOrProp({
      texture: 'fishing_pier',
      x: 345,
      y: 805,
      scale: 1.32,
      shadowW: 58,
      shadowH: 15,
      label: '⛵ RETURN FERRY → GREEN PARK',
      joinArrowY: 735,
    });
    const sailHome = () => {
      if (!this.guardInteractRange(345, 805, 135)) return;
      soundManager.playSfx('splash');
      EventBus.emit('ui:toast', { text: '⛵ Sailing back across the waves to Green Park Dock...' });
      this.sailToMap('green_park', 1200, 770);
    };
    returnPier.setInteractive({ useHandCursor: true }).on('pointerdown', sailHome);
    returnBoat.setInteractive({ useHandCursor: true }).on('pointerdown', sailHome);
    this.landmarks.push({
      x: 345,
      y: 800,
      radius: 78,
      label: 'Press [E] or Click → ⛵ Sail Back to Green Park Pier',
      isDungeonPortal: false,
      onInteract: sailHome,
    });

    // 5. SHIMMERING CORAL REEF BUOY (South-Center Beach -> Launches PearlDiveScene!)
    const buoyX = 800;
    const buoyY = 825;
    const buoyHalo = this.add
      .image(buoyX, buoyY, 'portal_vortex')
      .setTint(0x22d3ee)
      .setScale(1.05)
      .setAlpha(0.68)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(820);
    vfxManager.applyBloom(this, buoyHalo, { color: 0x22d3ee, strength: 1.55 });
    this.tweens.add({ targets: buoyHalo, scale: 1.24, alpha: 0.35, duration: 1050, yoyo: true, repeat: -1 });
    const buoyNode = this.add.container(buoyX, buoyY).setDepth(826);
    const buoyRing = this.add.ellipse(0, 6, 36, 14, 0xf97316, 1).setStrokeStyle(2.5, 0xffffff, 0.95);
    const buoyMast = this.add.rectangle(0, -6, 6, 20, 0xfef3c7, 1);
    const buoyLight = this.add.circle(0, -17, 5, 0x67e8f9, 1);
    buoyNode.add([buoyRing, buoyMast, buoyLight]);
    buoyNode.setSize(52, 48);
    buoyNode.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: buoyNode, y: buoyY - 5, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .text(buoyX, buoyY + 20, '🫧 CORAL REEF BUOY · PEARL DIVING', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#cffafe',
        backgroundColor: 'rgba(8, 51, 68, 0.92)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5, 0)
      .setDepth(840);
    const diveIntoReef = () => {
      if (!this.guardInteractRange(buoyX, buoyY, 135)) return;
      this.enterPearlDive();
    };
    buoyNode.on('pointerdown', diveIntoReef);
    this.landmarks.push({
      x: buoyX,
      y: buoyY - 12,
      radius: 82,
      label: 'Press [E] or Click → 🫧 Dive In! Koh Rong Deep-Sea Pearl Diving Mini-Game',
      isDungeonPortal: false,
      onInteract: diveIntoReef,
    });

    // 6. DEEP-SEA FISHING PIER (East Beach — Exclusive 7-Tier Koh Rong Tropical Catch Table!)
    const deepPier = this.addBuildingOrProp({
      texture: 'fishing_pier',
      x: 1235,
      y: 805,
      scale: 1.38,
      shadowW: 62,
      shadowH: 15,
      label: '🎣 DEEP-SEA FISHING PIER (MYTHIC / ANCIENT)',
      joinArrowY: 735,
    });
    const castDeepSeaLine = () => {
      const fishingLv = this.player.state.skills?.skills?.fishing?.level ?? 1;
      this.fishingSystem?.startCast(
        this.player.x,
        this.player.y,
        fishingLv,
        (facing) => {
          this.player.facing = facing;
        },
        'koh_rong'
      );
    };
    const oceanHit = this.add
      .rectangle(1255, 860, 220, 145, 0x000000, 0)
      .setDepth(14)
      .setInteractive({ useHandCursor: true });
    oceanHit.on('pointerdown', () => {
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      castDeepSeaLine();
    });
    deepPier.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      castDeepSeaLine();
    });
    this.landmarks.push({
      x: 1235,
      y: 792,
      radius: MAX_FISHING_DISTANCE,
      label: 'Press [E] or Click Pier → 🎣 Cast Deep-Sea Line (Koh Rong 7-Tier Tropical Drop Table!)',
      isDungeonPortal: false,
      onInteract: castDeepSeaLine,
    });
  }

  private clearBlackMarketPortal(): void {
    this.blackMarketObjects.forEach((o) => {
      if (o && o.active) o.destroy();
    });
    this.blackMarketObjects = [];
    if (this.blackMarketLandmark) {
      const idx = this.landmarks.indexOf(this.blackMarketLandmark);
      if (idx >= 0) this.landmarks.splice(idx, 1);
      this.blackMarketLandmark = null;
    }
  }

  private syncBlackMarketPortal(): void {
    this.clearBlackMarketPortal();
    if (this.mapId !== 'bamboo_forest') return;
    if (!worldEventManager.isBlackMarketActive()) return;

    const sx = 1345;
    const sy = 320;
    const vortex = this.add
      .image(sx, sy - 16, 'portal_vortex')
      .setTint(0x10b981)
      .setScale(1.18)
      .setAlpha(0.76)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(sy - 4);
    vfxManager.applyBloom(this, vortex, { color: 0x10b981, strength: 1.65 });
    this.tweens.add({ targets: vortex, angle: 360, duration: 5400, repeat: -1 });

    const lanternGlow = this.add
      .image(sx, sy - 30, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(0.92)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(sy + 4);

    const arch = this.add
      .image(sx, sy, 'angkor_arch_gate')
      .setOrigin(0.5, 0.92)
      .setScale(1.24)
      .setTint(0x065f46)
      .setDepth(sy)
      .setInteractive({ useHandCursor: true });
    const smuggler = this.add
      .sprite(sx + 28, sy + 4, 'char_master', 0)
      .setOrigin(0.5, 0.92)
      .setScale(1.2)
      .setTint(0x34d399)
      .setDepth(sy + 2)
      .setInteractive({ useHandCursor: true });
    const badge = this.add
      .text(sx, sy + 12, "🏮 SMUGGLER'S BLACK MARKET\nផ្សារងងឹតរដូវវស្សា", {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: 'rgba(6, 78, 59, 0.94)',
        align: 'center',
        padding: { x: 8, y: 3 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5, 0)
      .setDepth(sy + 14)
      .setInteractive({ useHandCursor: true });

    const openSmuggler = () => {
      if (!this.guardInteractRange(sx, sy, 135)) return;
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'blackMarket' });
    };
    arch.on('pointerdown', openSmuggler);
    smuggler.on('pointerdown', openSmuggler);
    badge.on('pointerdown', openSmuggler);

    this.blackMarketObjects.push(vortex, lanternGlow, arch, smuggler, badge);
    this.blackMarketLandmark = {
      x: sx,
      y: sy + 8,
      radius: 82,
      label: "Press [E] or Click → 🏮 Enter Monsoon Night Black Market Smuggler's Shop!",
      isDungeonPortal: false,
      onInteract: openSmuggler,
    };
    this.landmarks.push(this.blackMarketLandmark);
  }

  private sailToMap(targetMapId: VillageMapId, spawnX: number, spawnY: number): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 6, 95, 115);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: targetMapId,
        spawnX,
        spawnY,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: targetMapId,
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  private enterPearlDive(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('splash');
    this.cameras.main.fadeOut(300, 6, 95, 115);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PearlDiveScene', {
        playerState: {
          ...this.player.state,
          zone: 'pearl_dive',
          activeMount: null,
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
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
        if (!this.guardInteractRange(hx, hy)) return;
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
      sprite.on('pointerdown', () => {
        if (!this.guardInteractRange(rx, ry)) return;
        mineRock();
      });
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
    shimmerGate.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.guardInteractRange(1310, 300)) return;
      openShimmer();
    });
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
    cavGate.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.guardInteractRange(285, 315)) return;
      enterFrontierCavern();
    });
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

    const strikeMiniBoss = () => {
      if (!this.miniBoss || !this.guardInteractRange(this.miniBoss.sprite.x, this.miniBoss.sprite.y)) return;
      this.damageFrontierMiniBoss();
    };
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

  // ==================== MAP 6: LATERITE QUARRY (COPPER, IRON, LATERITE & RARE JADE VEINS) ====================
  private buildMiningQuarryMap(): void {
    this.add
      .text(800, 290, '⛏️ LATERITE QUARRY · អណ្តូងរ៉ែថ្មបាយក្រៀម\nMine Copper, Iron, Red Laterite & Rare Imperial Jade Veins', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fed7aa',
        backgroundColor: 'rgba(67, 20, 7, 0.9)',
        align: 'center',
        padding: { x: 10, y: 4 },
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(295);

    const veins: Array<[number, number, string, string, number, number, number]> = [
      [440, 440, 'Copper Vein', 'ore_copper', 0xfb923c, 28, 22],
      [620, 420, 'Iron Vein', 'ore_iron', 0x94a3b8, 32, 26],
      [980, 430, 'Red Laterite Vein', 'ore_laterite', 0xef4444, 36, 30],
      [1160, 460, 'Copper Vein', 'ore_copper', 0xfb923c, 28, 22],
      [420, 680, 'Iron Vein', 'ore_iron', 0x94a3b8, 32, 26],
      [640, 760, 'Red Laterite Vein', 'ore_laterite', 0xef4444, 36, 30],
      [980, 750, 'Rare Imperial Jade Vein', 'ore_jade_crystal', 0x10b981, 52, 48],
      [1180, 690, 'Rare Imperial Jade Vein', 'ore_jade_crystal', 0x10b981, 52, 48],
    ];

    veins.forEach(([vx, vy, vName, itemId, tint, xp, coins], idx) => {
      this.add.image(vx, vy + 6, 'soft_shadow').setDisplaySize(48, 14).setDepth(vy - 2);
      const sprite = this.add
        .image(vx, vy, 'lf_boulder')
        .setScale(itemId === 'ore_jade_crystal' ? 0.88 : 0.78)
        .setTint(tint)
        .setDepth(vy)
        .setInteractive({ useHandCursor: true });
      const labelText = this.add
        .text(vx, vy + 18, `⛏️ ${vName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: itemId === 'ore_jade_crystal' ? '#6ee7b7' : '#fed7aa',
          backgroundColor: 'rgba(15, 23, 42, 0.86)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(vy + 6);

      const node: GatherNode = { id: `quarry_${idx}`, kind: 'rock', x: vx, y: vy, sprite, labelText, ready: true };
      this.gatherNodes.push(node);

      const mineVein = () => {
        if (!node.ready) return;
        if (!this.guardInteractRange(vx, vy)) return;
        node.ready = false;
        soundManager.playSfx('ore_shatter');
        this.cameras.main.shake(100, 0.0045);
        sprite.setAlpha(0.28).setScale(0.55);
        labelText.setText('Respawning...');
        this.spawnFloatingText(vx, vy - 16, `+${xp} Mining XP · +${coins}c`, '#fbbf24');
        EventBus.emit('frontier:gather', {
          skillId: 'mining',
          xp,
          coins,
          itemId,
          label: `Mined ${vName} (+${xp} Mining XP & +${coins}c)!`,
        });
        // Update 2.5 — Rare 8% Golden Laterite Core drop from Mining Quarry!
        if (Math.random() < 0.08) {
          soundManager.playSfx('level_up');
          this.spawnFloatingText(vx, vy - 34, '🔶 GOLDEN LATERITE CORE!', '#22d3ee');
          EventBus.emit('frontier:gather', {
            skillId: 'mining',
            xp: 45,
            itemId: 'mat_golden_laterite_core',
            label: '🔶 ULTRA-RARE CATALYST! Found 1× Golden Laterite Core (Awakening Forge)!',
          });
        }
        this.time.delayedCall(19000, () => {
          if (!sprite.active) return;
          node.ready = true;
          sprite.setAlpha(1).setScale(itemId === 'ore_jade_crystal' ? 0.88 : 0.78);
          labelText.setText(`⛏️ ${vName}`);
        });
      };
      sprite.on('pointerdown', mineVein);
      this.landmarks.push({
        x: vx,
        y: vy,
        radius: 52,
        label: `Press [E] or Click → Mine ${vName} (+${xp} Mining XP)`,
        isDungeonPortal: false,
        onInteract: mineVein,
      });
    });

    // Quarry Cavern Shaft shortcut right inside the Quarry!
    const shaft = this.addBuildingOrProp({
      texture: 'angkor_portal',
      x: 800,
      y: 520,
      scale: 0.72,
      shadowW: 84,
      shadowH: 18,
      bodyW: 54,
      bodyH: 20,
      label: 'DEEP CAVERN SHAFT',
      joinArrowY: 455,
    });
    const enterShaft = () => {
      soundManager.playSfx('magic');
      EventBus.emit('cavern:enterRequest', { returnMapId: 'wild_frontier' });
    };
    shaft.setInteractive({ useHandCursor: true }).on('pointerdown', enterShaft);
    this.landmarks.push({
      x: 800,
      y: 530,
      radius: 64,
      label: 'Press [E] or Click → Descend into Ancient Laterite Cavern',
      isDungeonPortal: true,
      onInteract: enterShaft,
    });
  }

  // ==================== MAP 7: MISTY BAMBOO FOREST (RARE HERBS, ANCIENT WOOD & FOREST SPIRITS) ====================
  private buildBambooForestMap(): void {
    this.add
      .text(800, 290, '🎋 MISTY BAMBOO FOREST · ព្រៃឫស្សីអ័ព្ទ\nGather Rare Herbs, Ancient Bamboo Wood & Commune with Forest Spirits', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(6, 78, 59, 0.9)',
        align: 'center',
        padding: { x: 10, y: 4 },
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(295);

    // Bamboo grove pillars & floating cyan forest spirit wisps
    for (const [bx, by] of [
      [420, 390], [620, 360], [1020, 380], [1220, 410],
      [460, 820], [820, 860], [1160, 810],
    ]) {
      this.addBuildingOrProp({
        texture: 'sugar_palm_tree',
        x: bx,
        y: by,
        scale: 1.05,
        shadowW: 36,
        shadowH: 11,
        bodyW: 16,
        bodyH: 12,
      });
    }

    const herbs: Array<[number, number, string, string, number, number]> = [
      [480, 480, 'Sacred Pink Lotus Herb', 'crop_pink_lotus', 38, 24],
      [720, 430, 'Ancient Spirit Bamboo', 'seed_spirit_bamboo', 45, 32],
      [980, 490, 'Wild Kampot Pepper', 'crop_kampot_pepper', 42, 30],
      [1180, 580, 'Ancient Bamboo Wood', 'crop_slek_krey', 32, 22],
      [560, 730, 'Dewy Jasmine Blossom', 'crop_phka_rumduol', 34, 24],
      [880, 760, 'Sacred Pink Lotus Herb', 'crop_pink_lotus', 38, 24],
      [1120, 730, 'Wild Forest Spirit Essence', 'drop_spirit_orb', 50, 40],
    ];
    herbs.forEach(([hx, hy, hName, itemId, xp, coins], idx) => {
      const sprite = this.add
        .image(hx, hy, idx % 2 === 0 ? 'sv_blossoms' : 'sv_flowers')
        .setScale(1.18)
        .setTint(itemId === 'drop_spirit_orb' ? 0x67e8f9 : 0xffffff)
        .setDepth(hy)
        .setInteractive({ useHandCursor: true });
      const labelText = this.add
        .text(hx, hy + 15, `🎋 ${hName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#a7f3d0',
          backgroundColor: 'rgba(15, 23, 42, 0.84)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(hy + 6);

      const node: GatherNode = { id: `bamboo_${idx}`, kind: 'herb', x: hx, y: hy, sprite, labelText, ready: true };
      this.gatherNodes.push(node);

      const gather = () => {
        if (!node.ready) return;
        if (!this.guardInteractRange(hx, hy)) return;
        node.ready = false;
        soundManager.playSfx('harvest');
        sprite.setAlpha(0.28).setScale(0.8);
        labelText.setText('Regrowing...');
        this.spawnFloatingText(hx, hy - 14, `+${xp} Foraging XP · +${coins}c`, '#34d399');
        EventBus.emit('frontier:gather', {
          skillId: 'foraging',
          xp,
          coins,
          itemId,
          label: `Gathered ${hName} (+${xp} Foraging XP & +${coins}c)!`,
        });
        // Update 2.5 — Rare 8% Spirit Bamboo Heart drop from Bamboo Forest!
        if (Math.random() < 0.08) {
          soundManager.playSfx('level_up');
          this.spawnFloatingText(hx, hy - 32, '🎋 SPIRIT BAMBOO HEART!', '#22d3ee');
          EventBus.emit('frontier:gather', {
            skillId: 'foraging',
            xp: 45,
            itemId: 'mat_spirit_bamboo_heart',
            label: '🎋 ULTRA-RARE CATALYST! Found 1× Spirit Bamboo Heart (Awakening Forge)!',
          });
        }
        this.time.delayedCall(18000, () => {
          if (!sprite.active) return;
          node.ready = true;
          sprite.setAlpha(1).setScale(1.18);
          labelText.setText(`🎋 ${hName}`);
        });
      };
      sprite.on('pointerdown', gather);
      this.landmarks.push({
        x: hx,
        y: hy,
        radius: 50,
        label: `Press [E] or Click → Gather ${hName} (+${xp} Foraging XP)`,
        isDungeonPortal: false,
        onInteract: gather,
      });
    });

    // Wandering cyan forest spirits
    for (let i = 0; i < 6; i++) {
      const sx = 450 + i * 145;
      const sy = 520 + (i % 2 === 0 ? -70 : 90);
      const wisp = this.add
        .circle(sx, sy, 7, 0x67e8f9, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(sy + 40);
      this.tweens.add({
        targets: wisp,
        y: sy - 22,
        x: sx + (i % 2 === 0 ? 28 : -28),
        alpha: 0.28,
        duration: 1800 + i * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ==================== MAP 8: SUNKEN ANGKOR RUINS (MYTHIC ORE, RELIC CHESTS & ELITE GUARDIANS) ====================
  private buildSunkenRuinsMap(): void {
    this.add
      .text(800, 290, '🏺 SUNKEN ANGKOR RUINS · ប្រាសាទលិចទឹកអង្គរ\nMine Mythic Angkor Gold, Open Sunken Relic Chests & Challenge Elite Guardians', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#67e8f9',
        backgroundColor: 'rgba(12, 74, 110, 0.92)',
        align: 'center',
        padding: { x: 10, y: 4 },
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(295);

    // Sunken temple columns
    for (const [rx, ry, tex] of [
      [420, 410, 'na_ruin_pillar'],
      [1180, 410, 'na_ruin_pillar'],
      [420, 810, 'na_ruin_statue'],
      [1180, 810, 'na_ruin_statue'],
    ] as Array<[number, number, string]>) {
      this.addBuildingOrProp({
        texture: tex,
        x: rx,
        y: ry,
        scale: 1.25,
        shadowW: 56,
        shadowH: 15,
        bodyW: 36,
        bodyH: 20,
      });
    }

    // 4 Mythic Angkor Gold & Sunken Relic Ore Veins
    const mythicVeins: Array<[number, number, string, string]> = [
      [520, 520, 'Mythic Angkor Gold Vein', 'ore_angkor_gold'],
      [1080, 520, 'Mythic Angkor Gold Vein', 'ore_angkor_gold'],
      [520, 720, 'Sunken Jade Relic Vein', 'ore_jade_crystal'],
      [1080, 720, 'Sunken Jade Relic Vein', 'ore_jade_crystal'],
    ];
    mythicVeins.forEach(([vx, vy, vName, itemId], idx) => {
      this.add.image(vx, vy + 6, 'soft_shadow').setDisplaySize(50, 14).setDepth(vy - 2);
      const sprite = this.add
        .image(vx, vy, 'lf_boulder')
        .setScale(0.88)
        .setTint(itemId === 'ore_angkor_gold' ? 0xfacc15 : 0x22d3ee)
        .setDepth(vy)
        .setInteractive({ useHandCursor: true });
      const labelText = this.add
        .text(vx, vy + 18, `✨ ${vName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(vy + 6);

      const node: GatherNode = { id: `sunken_vein_${idx}`, kind: 'rock', x: vx, y: vy, sprite, labelText, ready: true };
      this.gatherNodes.push(node);

      const mineMythic = () => {
        if (!node.ready) return;
        if (!this.guardInteractRange(vx, vy)) return;
        node.ready = false;
        soundManager.playSfx('ore_shatter');
        this.cameras.main.shake(110, 0.005);
        sprite.setAlpha(0.28).setScale(0.55);
        labelText.setText('Recharging...');
        this.spawnFloatingText(vx, vy - 18, '+65 Mining XP · +60c', '#22d3ee');
        EventBus.emit('frontier:gather', {
          skillId: 'mining',
          xp: 65,
          coins: 60,
          itemId,
          label: `Mined ${vName} (+65 Mining XP & +60c)!`,
        });
        this.time.delayedCall(24000, () => {
          if (!sprite.active) return;
          node.ready = true;
          sprite.setAlpha(1).setScale(0.88);
          labelText.setText(`✨ ${vName}`);
        });
      };
      sprite.on('pointerdown', mineMythic);
      this.landmarks.push({
        x: vx,
        y: vy,
        radius: 54,
        label: `Press [E] or Click → Mine ${vName} (+65 Mining XP)`,
        isDungeonPortal: false,
        onInteract: mineMythic,
      });
    });

    // 2 Sunken Relic Chests (Respawn every 45s — grants Reforge Stones + Coins + Chase Roll!)
    const chests: Array<[number, number, string]> = [
      [680, 620, 'Sunken Angkor Relic Chest'],
      [920, 620, 'Ancient Naga Vault Chest'],
    ];
    chests.forEach(([cx, cy, cName], idx) => {
      const sprite = this.add
        .image(cx, cy, 'na_chest')
        .setScale(1.35)
        .setTint(0x67e8f9)
        .setDepth(cy)
        .setInteractive({ useHandCursor: true });
      const labelText = this.add
        .text(cx, cy + 16, `🏺 ${cName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fde047',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: { x: 5, y: 2 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(cy + 6);

      const node: GatherNode = { id: `sunken_chest_${idx}`, kind: 'rock', x: cx, y: cy, sprite, labelText, ready: true };
      this.gatherNodes.push(node);

      const openRelicChest = () => {
        if (!node.ready) return;
        if (!this.guardInteractRange(cx, cy)) return;
        node.ready = false;
        soundManager.playSfx('coin');
        sprite.setAlpha(0.35);
        labelText.setText('Refilling...');
        this.spawnFloatingText(cx, cy - 18, '+110c · Reforge Stone', '#facc15');
        EventBus.emit('frontier:gather', {
          skillId: 'mining',
          xp: 55,
          coins: 110,
          itemId: 'mat_reforge_stone',
          label: `Opened ${cName} (+110 Coins & +1 Reforge Stone)!`,
        });
        // Update 2.5 — Rare 12% Sunken Angkor Relic drop from Sunken Ruins chests!
        if (Math.random() < 0.12) {
          soundManager.playSfx('level_up');
          this.spawnFloatingText(cx, cy - 36, '🏺 SUNKEN ANGKOR RELIC!', '#22d3ee');
          EventBus.emit('frontier:gather', {
            skillId: 'mining',
            xp: 60,
            itemId: 'mat_sunken_angkor_relic',
            label: '🏺 ULTRA-RARE CATALYST! Found 1× Sunken Angkor Relic (Awakening Forge)!',
          });
        }
        this.time.delayedCall(45000, () => {
          if (!sprite.active) return;
          node.ready = true;
          sprite.setAlpha(1);
          labelText.setText(`🏺 ${cName}`);
        });
      };
      sprite.on('pointerdown', openRelicChest);
      this.landmarks.push({
        x: cx,
        y: cy,
        radius: 50,
        label: `Press [E] or Click → Open ${cName}`,
        isDungeonPortal: false,
        onInteract: openRelicChest,
      });
    });

    // Elite Sunken Guardian Altar → Direct Mythic Raid Shortcut to Neak Reach / Krong Reap
    const guardianStatue = this.addBuildingOrProp({
      texture: 'angkor_portal',
      x: 800,
      y: 455,
      scale: 0.72,
      shadowW: 84,
      shadowH: 18,
      bodyW: 54,
      bodyH: 20,
      label: 'ELITE GUARDIAN SANCTUM',
      joinArrowY: 390,
    });
    const openGuardian = () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'modeSelector' });
    };
    guardianStatue.setInteractive({ useHandCursor: true }).on('pointerdown', openGuardian);
    this.landmarks.push({
      x: 800,
      y: 465,
      radius: 62,
      label: 'Press [E] or Click → Challenge Sunken Elite Guardian (Boss Portal)',
      isDungeonPortal: true,
      onInteract: openGuardian,
    });

    // Update 2.5 — Massive Glowing Colossus Raid Portal inside Sunken Ruins!
    const colossusGlow = this.add
      .image(800, 748, 'portal_vortex')
      .setTint(0x22d3ee)
      .setScale(1.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(740)
      .setAlpha(0.75);
    this.glowLights.push(colossusGlow);
    this.tweens.add({
      targets: colossusGlow,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });
    vfxManager.applyBloom(this, colossusGlow, { color: 0x22d3ee, strength: 1.65 });

    const colossusPortal = this.addBuildingOrProp({
      texture: 'angkor_portal',
      x: 800,
      y: 760,
      scale: 0.92,
      shadowW: 108,
      shadowH: 22,
      bodyW: 66,
      bodyH: 22,
      label: '🐉 ANCIENT NAGA COLOSSUS RAID PORTAL',
      joinArrowY: 682,
    });
    const enterColossusPortal = () => {
      if (!worldBossManager.getStatus().active) {
        EventBus.emit('ui:toast', {
          text: '🐉 Ancient Naga Colossus sleeps (spawns every 2h, or summon instantly in MENU → Settings)!',
        });
        return;
      }
      soundManager.playSfx('victory');
      this.enterWorldBossRaid();
    };
    colossusPortal.setInteractive({ useHandCursor: true }).on('pointerdown', enterColossusPortal);
    this.landmarks.push({
      x: 800,
      y: 765,
      radius: 78,
      label: 'Press [E] or Click → Enter Ancient Naga Colossus 20-Player World Boss Raid!',
      isDungeonPortal: true,
      onInteract: enterColossusPortal,
    });
  }

  // ==================== WALK-THROUGH GLOWING ROAD PORTALS (STRICTLY GRID-ALIGNED) ====================
  private buildWalkThroughRoadPortals(): void {
    for (const portal of this.mapPortals) {
      const isNorthOrSouth = portal.edge === 'north' || portal.edge === 'south';
      const archTex = isNorthOrSouth ? 'angkor_arch_gate' : 'wood_fence_gate';
      const padColor =
        portal.targetType === 'farm'
          ? 0x4ade80
          : portal.targetMapId === 'mining_quarry'
            ? 0xf97316
            : portal.targetMapId === 'bamboo_forest'
              ? 0x10b981
              : portal.targetMapId === 'sunken_ruins'
                ? 0x06b6d4
                : 0x38bdf8;

      // Crisp axis-aligned glowing threshold pad flush with the road grid
      const padW = isNorthOrSouth ? 74 : 26;
      const padH = isNorthOrSouth ? 26 : 74;
      const thresholdPad = this.add.graphics().setDepth(portal.y - 6);
      thresholdPad.fillStyle(padColor, 0.24);
      thresholdPad.fillRoundedRect(portal.x - padW / 2, portal.y - padH / 2, padW, padH, 6);
      thresholdPad.lineStyle(2, padColor, 0.85);
      thresholdPad.strokeRoundedRect(portal.x - padW / 2, portal.y - padH / 2, padW, padH, 6);
      this.tweens.add({
        targets: thresholdPad,
        alpha: 0.45,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Glowing animated portal aura strictly centered on road coordinates (zero tilt/rotation)
      const aura = this.add
        .image(portal.x, portal.y - (isNorthOrSouth ? 18 : 12), 'portal_vortex')
        .setTint(padColor)
        .setScale(0.78)
        .setAlpha(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(portal.y - 2);
      this.tweens.add({
        targets: aura,
        alpha: 0.2,
        scale: 0.96,
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Proper foot shadow + setOrigin(0.5, 1) grounded depth sorting
      this.add
        .image(portal.x, portal.y + 4, 'soft_shadow')
        .setDisplaySize(isNorthOrSouth ? 76 : 56, 14)
        .setDepth(portal.y - 4);
      const gateImg = this.add
        .image(portal.x, portal.y + 4, archTex)
        .setOrigin(0.5, 1)
        .setRotation(0)
        .setScale(isNorthOrSouth ? 1.24 : 1.14)
        .setDepth(portal.y + 4)
        .setInteractive({ useHandCursor: true });
      gateImg.on('pointerdown', () => {
        if (!this.guardInteractRange(portal.x, portal.y)) return;
        this.enterRoadPortal(portal);
      });

      // Symmetrical flanking Khmer lanterns / flags strictly aligned horizontally or vertically
      const flagTex = isNorthOrSouth ? 'na_flag_yellow' : 'na_flag_red';
      const flagAnim = isNorthOrSouth ? 'flag_yellow_wave' : 'flag_red_wave';
      const offsets: Array<[number, number]> = isNorthOrSouth
        ? [[-38, -6], [38, -6]]
        : [[0, -40], [0, 32]];
      for (const [fx, fy] of offsets) {
        const fl = this.add
          .sprite(portal.x + fx, portal.y + fy, flagTex, 0)
          .setOrigin(0.5, 1)
          .setScale(1.0)
          .setDepth(portal.y + fy + 8);
        if (this.anims.exists(flagAnim)) fl.play(flagAnim);
      }

      // Signpost neatly aligned to road edge
      const signX = isNorthOrSouth ? portal.x + 54 : portal.x;
      const signY = isNorthOrSouth ? portal.y + 4 : portal.y - 52;
      this.add
        .image(signX, signY, 'sv_sign_wood')
        .setOrigin(0.5, 1)
        .setScale(1.0)
        .setDepth(signY + 6);

      const labelY = isNorthOrSouth ? portal.y + 12 : portal.y + 40;
      this.add
        .text(portal.x, labelY, `${portal.signLabel}\n${portal.khmerLabel}`, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          align: 'center',
          padding: { x: 8, y: 3 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 0)
        .setDepth(portal.y + 46);

      this.landmarks.push({
        x: portal.x,
        y: portal.y,
        radius: 52,
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

    const busY = 598;
    const stopX = 442;
    const shadow = this.add
      .image(-120, busY + 24, 'soft_shadow')
      .setDisplaySize(134, 22)
      .setDepth(606);

    // Detailed Layered Pixel-Art Phnom Penh Express Bus Container
    const bus = this.add.container(-120, busY).setDepth(612);
    const bodyGfx = this.add.graphics();
    // Roof luggage rack & AC unit
    bodyGfx.fillStyle(0x334155, 1);
    bodyGfx.fillRoundedRect(-46, -34, 72, 6, 2);
    bodyGfx.fillStyle(0xe2e8f0, 1);
    bodyGfx.fillRoundedRect(-24, -37, 28, 7, 3);
    bodyGfx.lineStyle(1.5, 0x0f172a, 0.9);
    bodyGfx.strokeRect(-42, -35, 62, 5);
    // Main two-tone Cambodian Emerald & Gold coach chassis
    bodyGfx.fillStyle(0x15803d, 1);
    bodyGfx.fillRoundedRect(-58, -28, 118, 42, 8);
    bodyGfx.fillStyle(0x166534, 1);
    bodyGfx.fillRoundedRect(-58, -4, 118, 18, 5);
    // Gold & cream Angkor livery stripes
    bodyGfx.fillStyle(0xfacc15, 1);
    bodyGfx.fillRect(-56, -4, 114, 4);
    bodyGfx.fillStyle(0xfef9c3, 0.95);
    bodyGfx.fillRect(-56, -26, 114, 4);
    bodyGfx.lineStyle(2, 0x052e16, 1);
    bodyGfx.strokeRoundedRect(-58, -28, 118, 42, 8);
    // Tinted panoramic passenger windows + windshield
    bodyGfx.fillStyle(0x0f172a, 0.88);
    for (const wx of [-48, -28, -8, 12]) {
      bodyGfx.fillRoundedRect(wx, -21, 16, 13, 3);
      bodyGfx.fillStyle(0x38bdf8, 0.36);
      bodyGfx.fillRect(wx + 2, -19, 12, 4);
      bodyGfx.fillStyle(0x0f172a, 0.88);
    }
    // Front panoramic windshield
    bodyGfx.fillStyle(0x1e293b, 0.95);
    bodyGfx.fillRoundedRect(42, -22, 15, 17, 3);
    bodyGfx.fillStyle(0x7dd3fc, 0.48);
    bodyGfx.fillRect(45, -20, 10, 6);
    // Warm LED destination signboard "PHUM EXPRESS"
    bodyGfx.fillStyle(0x090d16, 1);
    bodyGfx.fillRoundedRect(-30, -29, 64, 8, 2);
    // Chrome bumper, tail light & warm glowing headlights
    bodyGfx.fillStyle(0xcbd5e1, 1);
    bodyGfx.fillRect(-60, 8, 6, 6);
    bodyGfx.fillRect(56, 8, 6, 6);
    bodyGfx.fillStyle(0xef4444, 1);
    bodyGfx.fillRect(-59, 0, 4, 7);
    bodyGfx.fillStyle(0xfef08a, 1);
    bodyGfx.fillCircle(58, 3, 3.5);
    // Headlight beam cone
    const headlightCone = this.add
      .triangle(82, 5, 0, -4, 46, -16, 46, 14, 0xfef08a, 0.24)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Animated boarding door (slides open at stop!)
    const doorFrame = this.add.rectangle(34, -4, 12, 24, 0x052e16, 0.95).setStrokeStyle(1, 0xfacc15);
    const doorLeaf = this.add.rectangle(34, -4, 10, 22, 0x16a34a, 0.95).setStrokeStyle(1, 0xbae6fd);

    // Destination LED sign text
    const signText = this.add
      .text(2, -25, 'PHUM EXPRESS', {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fde047',
      })
      .setResolution(2)
      .setScale(0.42)
      .setOrigin(0.5);

    // Spinning pixel wheels (rims + lug cross)
    const makeWheel = (wx: number) => {
      const wCont = this.add.container(wx, 15);
      const tire = this.add.circle(0, 0, 8.5, 0x0f172a).setStrokeStyle(1.5, 0x334155);
      const hub = this.add.circle(0, 0, 4, 0xe2e8f0);
      const spoke = this.add.rectangle(0, 0, 7, 1.5, 0x475569);
      const spoke2 = this.add.rectangle(0, 0, 1.5, 7, 0x475569);
      wCont.add([tire, hub, spoke, spoke2]);
      return wCont;
    };
    const wheelRear = makeWheel(-34);
    const wheelFront = makeWheel(32);

    bus.add([headlightCone, bodyGfx, doorFrame, doorLeaf, signText, wheelRear, wheelFront]);
    bus.setSize(124, 52);
    bus.setInteractive({ useHandCursor: true });

    const wheelSpin = this.tweens.add({
      targets: [wheelRear, wheelFront],
      angle: 360,
      duration: 420,
      repeat: -1,
      ease: 'Linear',
    });

    const joinArrow = this.add
      .image(stopX, busY - 46, 'join_arrow')
      .setScale(0.62)
      .setDepth(650)
      .setVisible(false);
    const busBadge = this.add
      .text(stopX, busY - 62, '🚌 PHUM EXPRESS · TAP TO BOARD', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(20, 83, 45, 0.94)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5)
      .setDepth(651)
      .setVisible(false);

    bus.on('pointerdown', () => {
      if (!this.guardInteractRange(bus.x, bus.y)) return;
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
        wheelSpin.pause();
        // Slide boarding door open cleanly
        this.tweens.add({
          targets: doorLeaf,
          x: 26,
          scaleX: 0.3,
          duration: 260,
          ease: 'Quad.easeOut',
        });
        joinArrow.setVisible(true);
        busBadge.setVisible(true);
        const arrowBounce = this.tweens.add({
          targets: joinArrow,
          y: busY - 54,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.time.delayedCall(6200, () => {
          arrowBounce.stop();
          joinArrow.destroy();
          busBadge.destroy();
          if (!bus.active) {
            this.busActive = false;
            return;
          }
          // Close boarding door & resume wheel spin
          this.tweens.add({
            targets: doorLeaf,
            x: 34,
            scaleX: 1,
            duration: 220,
            ease: 'Quad.easeIn',
          });
          wheelSpin.resume();
          this.tweens.add({
            targets: [bus, shadow],
            x: MAP_W + 140,
            duration: 3600,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              wheelSpin.stop();
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

  private enterKromHall(): void {
    if (this.transitioning) return;
    if (!this.player.state.kromId && !this.player.state.kromTag) {
      EventBus.emit('ui:toast', { text: '🛡️ Join or create a Krom first to enter your Krom Guild Hall!' });
      EventBus.emit('ui:openModal', { modal: 'krom' });
      return;
    }
    this.transitioning = true;
    soundManager.playSfx('magic');
    this.cameras.main.fadeOut(220, 20, 14, 6);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('KromHallScene', {
        returnMapId: this.mapId,
        playerState: {
          ...this.player.state,
          zone: 'krom_hall',
          currentMapId: this.mapId,
        },
      });
    });
  }

  private enterPetRace(petId?: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('victory');
    this.cameras.main.fadeOut(220, 12, 22, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PetRaceScene', {
        petId,
        playerState: {
          ...this.player.state,
          zone: 'pet_race',
          currentMapId: 'green_park',
        },
      });
    });
  }

  private spawnFloatingMusicNote(
    x: number,
    y: number,
    skin: 'classic' | 'golden_angkor' | 'celestial_apsara',
    noteIndex: number
  ): void {
    const skinDef = INSTRUMENT_SKINS[skin] ?? INSTRUMENT_SKINS.classic;
    const symbols = ['♪', '♫', '♬', '🎵'];
    const sym = symbols[noteIndex % symbols.length];
    const halo = this.add
      .circle(x, y, 8, skinDef.noteColorNum, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2500);
    vfxManager.applyBloom(this, halo, { color: skinDef.noteColorNum, strength: skinDef.glowStrength });
    const note = this.add
      .text(x + Phaser.Math.Between(-8, 8), y, sym, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: skinDef.noteColorHex,
        stroke: '#1c1917',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2505);
    const driftX = Phaser.Math.Between(-18, 18);
    this.tweens.add({
      targets: [note, halo],
      x: x + driftX,
      y: y - 42,
      alpha: 0,
      scale: 1.35,
      duration: 950,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        note.destroy();
        halo.destroy();
      },
    });
  }

  private clearTerritoryWarBanners(): void {
    for (const obj of this.territoryBannerObjects) {
      obj.destroy();
    }
    this.territoryBannerObjects = [];
  }

  private syncTerritoryWarBanners(war: KromWarSnapshot): void {
    this.clearTerritoryWarBanners();
    if (
      this.mapId !== 'market_street' &&
      this.mapId !== 'wild_frontier' &&
      this.mapId !== 'koh_rong_island'
    ) {
      return;
    }

    const terr = war.territories.find((t) => t.id === (this.mapId as KromTerritoryId));
    if (!terr || !terr.owner) return;

    const tag = terr.owner.kromTag;
    // Place ONE sleek, compact Territory Standard in a clean dedicated corner plaza (ZERO blocking of roads/stalls/NPCs!)
    const spots: Array<{ x: number; y: number }> =
      this.mapId === 'market_street'
        ? [{ x: 245, y: 455 }]
        : this.mapId === 'wild_frontier'
          ? [{ x: 615, y: 455 }]
          : [{ x: 615, y: 315 }];

    for (const sp of spots) {
      const base = this.add
        .ellipse(sp.x, sp.y + 2, 24, 10, 0x57534e, 0.95)
        .setStrokeStyle(1.2, 0xd6d3d1)
        .setDepth(sp.y - 1);
      const pole = this.add
        .rectangle(sp.x, sp.y - 18, 4, 38, 0x78350f)
        .setStrokeStyle(1, 0xfacc15)
        .setDepth(sp.y);
      const pennant = this.add
        .rectangle(sp.x, sp.y - 31, 66, 20, 0x991b1b, 0.96)
        .setStrokeStyle(1.8, 0xfacc15)
        .setDepth(sp.y + 1)
        .setInteractive({ useHandCursor: true });
      const glow = this.add
        .circle(sp.x, sp.y - 31, 16, 0xfacc15, 0.2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(sp.y - 1);

      const tagLabel = this.add
        .text(sp.x, sp.y - 31, `👑 [${tag}]`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fef08a',
          stroke: '#451a03',
          strokeThickness: 3,
        })
        .setResolution(2)
        .setScale(0.44)
        .setOrigin(0.5)
        .setDepth(sp.y + 3);

      const subLabel = this.add
        .text(sp.x, sp.y + 10, `TERRITORY · ${terr.owner.kromName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(120, 53, 15, 0.9)',
          padding: { x: 5, y: 1 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(sp.y + 4);

      pennant.on('pointerdown', () => {
        if (!this.guardInteractRange(sp.x, sp.y, 150)) return;
        EventBus.emit('ui:openModal', { modal: 'kromWar' });
      });

      this.territoryBannerObjects.push(base, pole, pennant, glow, tagLabel, subLabel);
    }
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

  private enterFestivalRace(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('splash');
    this.cameras.main.fadeOut(220, 8, 22, 48);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('FestivalRaceScene', {
        playerState: {
          ...this.player.state,
          zone: 'festival_race',
          activeMount: null,
        },
      });
    });
  }

  // ==================== UPDATE 1.5: KHMER SEASONAL FESTIVALS ====================
  private clearFestivalVisuals(): void {
    for (const obj of this.festivalObjects) {
      if (obj && obj.active) obj.destroy();
    }
    this.festivalObjects = [];
    if (this.festivalLandmarks.length > 0) {
      const rem = new Set(this.festivalLandmarks);
      this.landmarks = this.landmarks.filter((lm) => !rem.has(lm));
      this.festivalLandmarks = [];
    }
  }

  private syncFestivalVisuals(festival: FestivalId | null): void {
    if (!this.scene || !this.scene.isActive('OverworldScene')) return;
    this.lastSyncedFestival = festival;
    this.clearFestivalVisuals();
    if (!festival) return;

    // 1. BON OM TOUK (Water Festival — Longboat Race Pier in Green Park)
    if (festival === 'bon_om_touk' && this.mapId === 'green_park') {
      const bx = 630;
      const by = 785;
      const glow = this.add
        .image(bx, by - 10, 'portal_vortex')
        .setTint(0x0284c7)
        .setScale(0.95)
        .setAlpha(0.65)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(by - 2);
      const boatProp = this.add
        .image(bx, by, 'na_boat')
        .setScale(0.95)
        .setTint(0xfde047)
        .setDepth(by + 4)
        .setInteractive({ useHandCursor: true });
      const arrow = this.add.image(bx, by - 46, 'join_arrow').setScale(0.62).setDepth(by + 16);
      this.tweens.add({ targets: arrow, y: by - 54, duration: 500, yoyo: true, repeat: -1 });
      const label = this.add
        .text(bx, by + 22, '🛶 BON OM TOUK · LONGBOAT RACE [E]', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(2, 132, 199, 0.92)',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 0)
        .setDepth(by + 20);
      const startRace = () => {
        if (!this.guardInteractRange(bx, by)) return;
        this.enterFestivalRace();
      };
      boatProp.on('pointerdown', startRace);
      this.festivalObjects.push(glow, boatProp, arrow, label);

      const lm: LandmarkZone = {
        x: bx,
        y: by,
        radius: 68,
        label: 'Press [E] or Click → Launch Bon Om Touk Longboat Race!',
        isDungeonPortal: false,
        onInteract: startRace,
      };
      this.festivalLandmarks.push(lm);
      this.landmarks.push(lm);
    }

    // 2. CHOL CHNAM THMEY (Khmer New Year — Water Splash Tag Buckets in Central Plaza)
    if (festival === 'chol_chnam_thmey' && this.mapId === 'central_plaza') {
      const bucketSpots: Array<[number, number, string]> = [
        [635, 625, 'West Water Bucket'],
        [965, 625, 'East Water Bucket'],
        [800, 790, 'South Splash Fountain'],
      ];
      bucketSpots.forEach(([sx, sy, title]) => {
        const ring = this.add
          .circle(sx, sy, 18, 0x38bdf8, 0.25)
          .setStrokeStyle(2, 0x7dd3fc, 0.85)
          .setDepth(sy - 2);
        const bucket = this.add
          .rectangle(sx, sy, 22, 18, 0x0284c7, 0.95)
          .setStrokeStyle(2, 0xfacc15)
          .setDepth(sy + 4)
          .setInteractive({ useHandCursor: true });
        const lbl = this.add
          .text(sx, sy + 14, `💦 ${title}`, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#e0f2fe',
            backgroundColor: 'rgba(12, 74, 110, 0.88)',
            padding: { x: 5, y: 1 },
          })
          .setResolution(2)
          .setScale(0.44)
          .setOrigin(0.5, 0)
          .setDepth(sy + 14);

        const doSplash = () => {
          if (!this.guardInteractRange(sx, sy)) return;
          soundManager.playSfx('splash');
          for (let i = 0; i < 10; i++) {
            const ang = (Math.PI * 2 * i) / 10;
            const drop = this.add.circle(this.player.x, this.player.y - 10, 4, 0x7dd3fc, 0.92).setDepth(2400);
            this.tweens.add({
              targets: drop,
              x: this.player.x + Math.cos(ang) * 44,
              y: this.player.y - 10 + Math.sin(ang) * 34,
              alpha: 0,
              duration: 420,
              onComplete: () => drop.destroy(),
            });
          }
          const nearNpc = this.npcs[0]?.def.name ?? 'Festival Villagers';
          this.spawnFloatingText(this.player.x, this.player.y - 26, '💦 SPLASH! +45 Coins!', '#7dd3fc');
          EventBus.emit('festival:waterSplash', { targetName: nearNpc });
        };

        bucket.on('pointerdown', doSplash);
        this.festivalObjects.push(ring, bucket, lbl);
        const lm: LandmarkZone = {
          x: sx,
          y: sy,
          radius: 56,
          label: `Press [E] or Click → 💦 Splash Water Tag! (+45 New Year Coins)`,
          isDungeonPortal: false,
          onInteract: doSplash,
        };
        this.festivalLandmarks.push(lm);
        this.landmarks.push(lm);
      });
    }

    // 3. PCHUM BEN (Floating Pink Lotus Lanterns on Green Park Twilight River)
    if (festival === 'pchum_ben' && this.mapId === 'green_park') {
      const twilight = this.add
        .rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x312e81, 0.24)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(2115);
      this.festivalObjects.push(twilight);

      // Drifting glowing Pink Lotus Lanterns on Duck Pond & Mekong Pier
      for (const [lx, ly] of [[420, 825], [470, 860], [920, 815], [990, 835], [950, 855]]) {
        const halo = this.add
          .image(lx, ly, 'torch_glow')
          .setTint(0xf472b6)
          .setScale(0.55)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(ly + 8);
        const petal = this.add.circle(lx, ly, 6, 0xf472b6, 0.95).setStrokeStyle(1.5, 0xfef08a).setDepth(ly + 9);
        this.tweens.add({ targets: [halo, petal], y: ly - 5, duration: 1400, yoyo: true, repeat: -1 });
        this.festivalObjects.push(halo, petal);
      }

      const rx = 595;
      const ry = 785;
      const shrine = this.add
        .circle(rx, ry, 14, 0xec4899, 0.92)
        .setStrokeStyle(2.5, 0xfef08a)
        .setDepth(ry + 6)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .text(rx, ry + 18, '🪷 RELEASE PINK LOTUS LANTERN (50c) [E]', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fbcfe8',
          backgroundColor: 'rgba(80, 7, 36, 0.9)',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.44)
        .setOrigin(0.5, 0)
        .setDepth(ry + 18);
      const releaseLantern = () => {
        if (!this.guardInteractRange(rx, ry)) return;
        soundManager.playSfx('magic');
        const drifted = this.add.circle(rx - 40, ry + 35, 7, 0xf472b6, 0.95).setStrokeStyle(2, 0xfef08a).setDepth(ry + 22);
        this.tweens.add({
          targets: drifted,
          x: rx - 140,
          y: ry + 48,
          alpha: 0,
          duration: 3200,
          onComplete: () => drifted.destroy(),
        });
        EventBus.emit('festival:releaseLantern');
      };
      shrine.on('pointerdown', releaseLantern);
      this.festivalObjects.push(shrine, lbl);

      const lm: LandmarkZone = {
        x: rx,
        y: ry,
        radius: 62,
        label: 'Press [E] or Click → 🪷 Release Pink Lotus Lantern (50c → +20% XP & +15% Luck 10m!)',
        isDungeonPortal: false,
        onInteract: releaseLantern,
      };
      this.festivalLandmarks.push(lm);
      this.landmarks.push(lm);
    }
  }

  // ==================== UPDATE 1.6: PLAYER-RUN TUK-TUK FOOD CARTS ====================
  private clearTukTukCarts(): void {
    for (const obj of this.tukTukCartObjects) {
      if (obj && obj.active) obj.destroy();
    }
    this.tukTukCartObjects = [];
    if (this.tukTukCartLandmarks.length > 0) {
      const rm = new Set(this.tukTukCartLandmarks);
      this.landmarks = this.landmarks.filter((lm) => !rm.has(lm));
      this.tukTukCartLandmarks = [];
    }
  }

  private syncTukTukCarts(allCarts: TukTukCartListing[]): void {
    if (!this.scene || !this.scene.isActive('OverworldScene')) return;
    this.clearTukTukCarts();
    if (this.mapId !== 'central_plaza' && this.mapId !== 'temple_district') return;

    const mapCarts = allCarts.filter((c) => c.mapId === this.mapId && c.items.length > 0);
    for (const cart of mapCarts) {
      const cx = cart.x;
      const cy = cart.y;

      const glow = this.add
        .image(cx, cy - 8, 'torch_glow')
        .setTint(0xf59e0b)
        .setScale(1.05)
        .setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(cy - 6);
      this.tweens.add({ targets: glow, alpha: 0.28, scale: 1.22, duration: 840, yoyo: true, repeat: -1 });

      const shadow = this.add.image(cx, cy + 4, 'soft_shadow').setDisplaySize(64, 20).setDepth(cy - 5);
      const texKey = this.textures.exists('num_pang_cart') ? 'num_pang_cart' : 'mount_mini_tuk_tuk';
      const sprite = this.add
        .image(cx, cy, texKey)
        .setOrigin(0.5, 0.88)
        .setScale(texKey === 'num_pang_cart' ? 0.62 : 0.7)
        .setTint(0xfffbeb)
        .setDepth(cy)
        .setInteractive({ useHandCursor: true });

      // Glowing canopy badge + floating signboard
      const sign = this.add
        .text(cx, cy - 48, `🚕 ${cart.signTitle}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(124, 45, 18, 0.94)',
          padding: { x: 7, y: 2 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 1)
        .setDepth(cy + 14);
      const sub = this.add
        .text(cx, cy + 8, `🔥 ${cart.items.length} Hot Buffs · Click / [E] to Buy`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#a7f3d0',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          padding: { x: 5, y: 1 },
        })
        .setResolution(2)
        .setScale(0.4)
        .setOrigin(0.5, 0)
        .setDepth(cy + 14);

      const openCart = () => {
        if (!this.guardInteractRange(cx, cy)) return;
        soundManager.playSfx('click');
        EventBus.emit('ui:openModal', { modal: 'tukTukCart', cartId: cart.cartId });
      };
      sprite.on('pointerdown', openCart);

      const lm: LandmarkZone = {
        x: cx,
        y: cy,
        radius: 68,
        label: `Press [E] or Click → 🚕 ${cart.signTitle} (Buy Hot Combat Buffs!)`,
        isDungeonPortal: false,
        onInteract: openCart,
      };
      this.tukTukCartObjects.push(glow, shadow, sprite, sign, sub);
      this.tukTukCartLandmarks.push(lm);
      this.landmarks.push(lm);
    }
  }

  // ==================== UPDATE 1.6: TORN ANGKOR TREASURE MAP DIG SPOT ====================
  private clearTreasureDigVisuals(): void {
    for (const obj of this.treasureDigObjects) {
      if (obj && obj.active) obj.destroy();
    }
    this.treasureDigObjects = [];
    if (this.treasureDigLandmark) {
      this.landmarks = this.landmarks.filter((lm) => lm !== this.treasureDigLandmark);
      this.treasureDigLandmark = null;
    }
    for (const g of this.treasureGuardians) {
      g.sprite.destroy();
      g.hpBg.destroy();
      g.hpFill.destroy();
      g.nameText.destroy();
    }
    this.treasureGuardians = [];
    if (this.activeTreasureChest) {
      this.activeTreasureChest.sprite.destroy();
      this.activeTreasureChest.glow.destroy();
      this.activeTreasureChest.label.destroy();
      this.activeTreasureChest = null;
    }
  }

  private syncTreasureMapDigSpot(): void {
    if (!this.scene || !this.scene.isActive('OverworldScene')) return;
    this.clearTreasureDigVisuals();

    const mapClue = this.player.state.activeTreasureMap;
    this.lastTreasureSpotId = mapClue?.spotId ?? null;
    if (!mapClue || mapClue.mapId !== this.mapId) return;

    const tx = mapClue.x;
    const ty = mapClue.y;

    const ringOuter = this.add
      .circle(tx, ty, 24, 0xfacc15, 0.2)
      .setStrokeStyle(3, 0xfde047, 0.95)
      .setDepth(ty - 12)
      .setInteractive({ useHandCursor: true });
    const ringInner = this.add
      .circle(tx, ty, 13, 0xf59e0b, 0.32)
      .setStrokeStyle(2, 0xef4444, 0.95)
      .setDepth(ty - 11);
    const xMark = this.add
      .text(tx, ty, '✕', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ef4444',
        stroke: '#fef08a',
        strokeThickness: 4,
      })
      .setResolution(2)
      .setScale(0.65)
      .setOrigin(0.5)
      .setDepth(ty - 10);

    const lbl = this.add
      .text(tx, ty - 26, '🗺️ X MARKS THE SPOT — Press [E] / Click to Dig!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(124, 45, 18, 0.94)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(ty + 15);

    this.tweens.add({
      targets: [ringOuter, ringInner],
      scale: 1.24,
      alpha: 0.45,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const digNow = () => {
      if (!this.guardInteractRange(tx, ty)) return;
      this.digTreasureSpot(tx, ty, mapClue.spotId);
    };
    ringOuter.on('pointerdown', digNow);
    xMark.setInteractive({ useHandCursor: true }).on('pointerdown', digNow);

    const lm: LandmarkZone = {
      x: tx,
      y: ty,
      radius: 78,
      label: 'Press [E] or Click → ⛏️ Dig Ancient Relic Chest!',
      isDungeonPortal: false,
      onInteract: digNow,
    };

    this.treasureDigObjects.push(ringOuter, ringInner, xMark, lbl);
    this.treasureDigLandmark = lm;
    this.landmarks.push(lm);
  }

  private digTreasureSpot(tx: number, ty: number, spotId: string): void {
    if (this.activeTreasureChest) return;

    // Remove pulsing X ring & landmark while guarded Relic Chest is active
    for (const obj of this.treasureDigObjects) {
      if (obj && obj.active) obj.destroy();
    }
    this.treasureDigObjects = [];
    if (this.treasureDigLandmark) {
      this.landmarks = this.landmarks.filter((lm) => lm !== this.treasureDigLandmark);
      this.treasureDigLandmark = null;
    }

    soundManager.playSfx('harvest');
    this.cameras.main.shake(120, 0.005);

    const glow = this.add
      .image(tx, ty - 8, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(1.2)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ty - 3);
    const chestSprite = this.add
      .image(tx, ty, 'lf_chest')
      .setScale(1.35)
      .setDepth(ty)
      .setInteractive({ useHandCursor: true });
    const chestLbl = this.add
      .text(tx, ty - 28, '🔒 ANCIENT RELIC CHEST (Defeat 2 Shadow Guardians!)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(ty + 18);

    this.activeTreasureChest = {
      x: tx,
      y: ty,
      spotId,
      sprite: chestSprite,
      glow,
      label: chestLbl,
      opened: false,
    };

    // Spawn 2 quick Shadow Guardian mobs guarding the unearthed chest
    const offsets: Array<[number, number, string]> = [
      [-48, 8, 'Shadow Relic Guard'],
      [48, 8, 'Angkor Shade Sentinel'],
    ];
    offsets.forEach(([ox, oy, name], idx) => {
      const gx = tx + ox;
      const gy = ty + oy;
      const spr = this.add
        .sprite(gx, gy, 'pet_spirit', 0)
        .setScale(1.65)
        .setTint(0xc084fc)
        .setDepth(gy + 4)
        .setInteractive({ useHandCursor: true });
      if (this.anims.exists('pet_spirit_idle')) {
        spr.play('pet_spirit_idle');
      }
      const hpBg = this.add.rectangle(gx, gy - 26, 40, 5, 0x0f172a).setDepth(gy + 12);
      const hpFill = this.add.rectangle(gx - 19, gy - 26, 38, 3, 0xc084fc).setOrigin(0, 0.5).setDepth(gy + 13);
      const nameText = this.add
        .text(gx, gy - 32, `👻 ${name} (Click / [E])`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#e9d5ff',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          padding: { x: 4, y: 1 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 1)
        .setDepth(gy + 14);

      const guard = {
        sprite: spr,
        hpBg,
        hpFill,
        nameText,
        homeX: gx,
        homeY: gy,
        dir: idx === 0 ? -1 : 1,
        hp: 2,
        maxHp: 2,
        alive: true,
      };
      spr.on('pointerdown', () => this.damageTreasureGuardian(guard));
      this.treasureGuardians.push(guard);
    });

    chestSprite.on('pointerdown', () => {
      const aliveGuard = this.treasureGuardians.find((g) => g.alive);
      if (aliveGuard) {
        this.damageTreasureGuardian(aliveGuard);
      } else {
        this.burstOpenTreasureChest();
      }
    });

    EventBus.emit('ui:toast', {
      text: '⛏️ Unearthed an Ancient Relic Chest! Defeat the 2 Shadow Guardians (Click or press [E]) to claim it!',
    });
  }

  private damageTreasureGuardian(guard: OverworldScene['treasureGuardians'][number]): void {
    if (!guard.alive) return;
    guard.hp -= 1;
    soundManager.playSfx('hit');
    guard.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (guard.sprite.active && guard.alive) guard.sprite.setTint(0xa855f7);
    });
    guard.hpFill.width = Math.max(0, Math.round(38 * (guard.hp / guard.maxHp)));
    this.spawnFloatingText(guard.sprite.x, guard.sprite.y - 24, 'STRIKE! -50%', '#fde047');

    if (guard.hp <= 0) {
      guard.alive = false;
      guard.sprite.destroy();
      guard.hpBg.destroy();
      guard.hpFill.destroy();
      guard.nameText.destroy();
      soundManager.playSfx('crit');

      const remaining = this.treasureGuardians.filter((g) => g.alive).length;
      if (remaining === 0) {
        this.burstOpenTreasureChest();
      } else if (this.activeTreasureChest) {
        this.activeTreasureChest.label.setText('🔒 ANCIENT RELIC CHEST (1 Shadow Guardian left!)');
      }
    }
  }

  private burstOpenTreasureChest(): void {
    const chest = this.activeTreasureChest;
    if (!chest || chest.opened) return;
    chest.opened = true;

    soundManager.playSfx('victory');
    this.cameras.main.flash(260, 250, 204, 21);

    // Golden relic burst particles
    for (let i = 0; i < 16; i++) {
      const ang = (Math.PI * 2 * i) / 16;
      const p = this.add.circle(chest.x, chest.y - 8, 3.5, i % 2 === 0 ? 0xfacc15 : 0x38bdf8, 0.95).setDepth(2400);
      this.tweens.add({
        targets: p,
        x: chest.x + Math.cos(ang) * Phaser.Math.Between(34, 72),
        y: chest.y - 8 + Math.sin(ang) * Phaser.Math.Between(24, 58),
        alpha: 0,
        duration: 620,
        onComplete: () => p.destroy(),
      });
    }

    const coins = Phaser.Math.Between(500, 1500);
    const gold = Phaser.Math.Between(1, 3);
    const reforgeStones = Phaser.Math.Between(1, 2);

    const ownsCompass = this.player.state.inventory.some((i) => i.itemId === 'acc_angkor_explorer_compass');
    const ownsCape = this.player.state.inventory.some((i) => i.itemId === 'wings_golden_krama_cape');
    let cosmeticItemId: string | null = null;
    let cosmeticLabel: string | null = null;
    if (Math.random() < 0.72) {
      if (!ownsCompass && (!ownsCape ? Math.random() < 0.55 : true)) {
        cosmeticItemId = 'acc_angkor_explorer_compass';
        cosmeticLabel = '🧭 Angkor Explorer Compass';
      } else if (!ownsCape) {
        cosmeticItemId = 'wings_golden_krama_cape';
        cosmeticLabel = '🧣 Golden Krama Cape';
      }
    }

    this.spawnFloatingText(
      chest.x,
      chest.y - 32,
      `🏆 +${coins}c · +${gold} Gold · +${reforgeStones} Reforge Stone${cosmeticLabel ? ` · ${cosmeticLabel}` : ''}!`,
      '#fde047'
    );

    EventBus.emit('treasure:dugChest', {
      spotId: chest.spotId,
      coins,
      gold,
      reforgeStones,
      cosmeticItemId,
      cosmeticLabel,
    });

    chest.sprite.destroy();
    chest.glow.destroy();
    chest.label.destroy();
    this.activeTreasureChest = null;
    this.treasureGuardians = [];
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
        if (!this.guardInteractRange(mx, my)) return;
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
      if (!this.guardInteractRange(mob.sprite.x, mob.sprite.y)) return;
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

  private enterBossRush(difficulty: DifficultyMode = 'normal'): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 14, 6, 22);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('BossRushScene', {
        difficulty,
        playerState: {
          ...this.player.state,
          zone: 'dungeon',
          difficulty,
          activeMount: null,
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

  private enterWorldBossRaid(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(240, 4, 24, 34);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('WorldBossScene', {
        playerState: {
          ...this.player.state,
          zone: 'world_boss',
          activeMount: null,
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
    // Update 3.2 — Deliver active Express Delivery order if standing at the golden drop-off beacon!
    if (this.tryDeliverNearbyOrder()) {
      return;
    }

    // Update 3.1 — Catch nearby glowing Firefly during Firefly Night (Green Park / Bamboo Forest)
    if (this.tryCatchNearbyFirefly()) {
      return;
    }

    // Update 1.6 — Strike Shadow Guardians guarding an unearthed Ancient Relic Chest with [E]
    for (const tg of this.treasureGuardians) {
      if (
        tg.alive &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, tg.sprite.x, tg.sprite.y) <= 115
      ) {
        this.damageTreasureGuardian(tg);
        return;
      }
    }

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
    vfxManager.tickPerformanceMonitor(this, delta);
    const isMoving = len > 0.1;
    if (isMoving) {
      if (this.isSittingOnChair) {
        this.isSittingOnChair = false;
      }
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

      // Update 3.0 — Subtle footstep dust puffs on dirt/sand & shoreline water-ripple rings (Green Park & Koh Rong)
      if (time - this.lastFootstepAt > 240) {
        this.lastFootstepAt = time;
        const nearKohRongShore = this.mapId === 'koh_rong_island' && (this.player.y > 760 || this.player.x > 1180 || this.player.x < 320);
        const nearGreenParkWater =
          this.mapId === 'green_park' &&
          (Phaser.Math.Distance.Between(this.player.x, this.player.y, 960, 825) < 175 ||
            Phaser.Math.Distance.Between(this.player.x, this.player.y, 440, 840) < 165 ||
            Phaser.Math.Distance.Between(this.player.x, this.player.y, 1320, 875) < 175);

        if (nearKohRongShore || nearGreenParkWater) {
          const ring = this.add
            .ellipse(this.player.x, this.player.y + 8, 12, 5, 0x38bdf8, 0.25)
            .setStrokeStyle(1.3, 0xbae6fd, 0.85)
            .setDepth(this.player.y - 4);
          this.tweens.add({
            targets: ring,
            scaleX: 2.1,
            scaleY: 1.9,
            alpha: 0,
            duration: 460,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy(),
          });
        } else {
          const dustColor = this.mapId === 'koh_rong_island' ? 0xfef3c7 : 0xd6d3d1;
          const puff = this.add
            .circle(this.player.x + Phaser.Math.Between(-4, 4), this.player.y + 8, 2.8, dustColor, 0.55)
            .setDepth(this.player.y - 4);
          this.tweens.add({
            targets: puff,
            y: puff.y - 7,
            scale: 1.7,
            alpha: 0,
            duration: 360,
            ease: 'Quad.easeOut',
            onComplete: () => puff.destroy(),
          });
        }
      }

      // Update 2.6 — Bioluminescent Wave Aura animated cyan water-ripple trail around player's feet!
      if (
        (this.player.state.hasBioluminescentWaveAura ||
          this.player.state.loadout.wings === 'wings_bioluminescent_wave_aura') &&
        time - this.lastWaveRippleAt > 185
      ) {
        this.lastWaveRippleAt = time;
        const ripple = this.add
          .ellipse(this.player.x, this.player.y + 8, 18, 8, 0x22d3ee, 0.35)
          .setStrokeStyle(1.6, 0x67e8f9, 0.92)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(this.player.y - 5);
        this.tweens.add({
          targets: ripple,
          scaleX: 2.3,
          scaleY: 2.0,
          alpha: 0,
          duration: 540,
          ease: 'Quad.easeOut',
          onComplete: () => ripple.destroy(),
        });
      }
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, true);

    // Update 3.3 — Phnom Kulen Spirit Meditation Pool (5s wade -> 100% HP & 15-min Kulen Sacred Blessing!) + Golden Halo
    const nowMs = Date.now();
    const blessingActive = (this.player.state.kulenBlessingUntil ?? 0) > nowMs;
    if (this.kulenBlessingHalo) {
      this.kulenBlessingHalo.setVisible(blessingActive);
      if (blessingActive) {
        const pulse = 0.94 + Math.sin(time / 320) * 0.1;
        this.kulenBlessingHalo
          .setPosition(this.player.x, this.player.y + 4)
          .setScale(pulse)
          .setDepth(this.player.y - 4);
      }
    }
    if (this.mapId === 'phnom_kulen') {
      // Gentle waterfall mist particles rising from the Sacred Waterfall basin
      if (time - this.lastKulenMistAt > 240) {
        this.lastKulenMistAt = time;
        const mist = this.add
          .circle(700 + Phaser.Math.Between(-56, 56), 224 + Phaser.Math.Between(-8, 12), Phaser.Math.FloatBetween(3.5, 7), 0xe0f2fe, 0.42)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(16);
        this.tweens.add({
          targets: mist,
          y: mist.y - 24,
          scale: 1.9,
          alpha: 0,
          duration: 780,
          onComplete: () => mist.destroy(),
        });
      }
      const inMeditationPool = Phaser.Math.Distance.Between(this.player.x, this.player.y, 700, 470) <= 78;
      if (inMeditationPool) {
        this.kulenMeditationMs += Math.min(80, delta);
        const isPostBlessingCooldown = this.kulenMeditationMs < 0;
        const pct = isPostBlessingCooldown ? 1 : Math.min(1, this.kulenMeditationMs / 5000);
        if (this.kulenMeditationGfx) {
          this.kulenMeditationGfx.clear();
          this.kulenMeditationGfx.lineStyle(3.5, isPostBlessingCooldown ? 0xfacc15 : 0xfef08a, isPostBlessingCooldown ? 0.9 : 0.95);
          this.kulenMeditationGfx.beginPath();
          this.kulenMeditationGfx.arc(this.player.x, this.player.y + 4, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
          this.kulenMeditationGfx.strokePath();
        }
        if (this.kulenMeditationText) {
          if (isPostBlessingCooldown) {
            this.kulenMeditationText
              .setPosition(this.player.x, this.player.y - 38)
              .setText('🪷 SACRED BLESSING ACTIVE!')
              .setVisible(true);
          } else {
            const secLeft = Math.max(0, Math.ceil((5000 - this.kulenMeditationMs) / 1000));
            this.kulenMeditationText
              .setPosition(this.player.x, this.player.y - 38)
              .setText(secLeft > 0 ? `🪷 Meditating... ${secLeft}s` : '🪷 SACRED BLESSING GRANTED!')
              .setVisible(true);
          }
        }
        if (this.kulenMeditationMs >= 5000) {
          this.kulenMeditationMs = -8000; // 8s quiet grace period while remaining in pool
          soundManager.playSfx('level_up');
          vfxManager.playHealSpellVfx(this, this.player.x, this.player.y, 2410);
          vfxManager.playLevelUpLightPillar(this, this.player.x, this.player.y, 2405);
          EventBus.emit('kulen:blessingGranted', { durationMs: 15 * 60_000 });
        }
      } else {
        if (this.kulenMeditationMs > 0) this.kulenMeditationMs = Math.max(0, this.kulenMeditationMs - delta * 2);
        else if (this.kulenMeditationMs < 0) this.kulenMeditationMs = 0;
        this.kulenMeditationGfx?.clear();
        this.kulenMeditationText?.setVisible(false);
      }
    }

    // Update 2.8 — Stage 3 Mythic Pet QoL Convenience Perk: +10% passive Overworld HP/vitality regen pulse (zero combat P2W)
    if (this.player.state.loadout.pet && time - this.lastPetRegenAt > 4500) {
      const petProg = getPetProgress(this.player.state, this.player.state.loadout.pet);
      if (petProg.stage === 3 && this.player.state.hp < this.player.state.maxHp) {
        this.lastPetRegenAt = time;
        const heal = Math.max(4, Math.round(this.player.state.maxHp * 0.1));
        this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + heal);
        const pop = this.add
          .text(this.player.x, this.player.y - 24, `+${heal} HP ✨`, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#6ee7b7',
            stroke: '#064e3b',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(this.player.y + 20);
        this.tweens.add({
          targets: pop,
          y: pop.y - 16,
          alpha: 0,
          duration: 850,
          onComplete: () => pop.destroy(),
        });
      }
    }

    // Update 1.7 — Pink Lotus Heart Aura when bonded (intensifies near bonded partner!)
    if (this.bondAuraContainer && this.bondAuraRing) {
      const bond = this.player.state.bondPartner;
      const isBonded = bond?.status === 'accepted';
      this.bondAuraContainer.setVisible(isBonded);
      if (isBonded) {
        this.bondAuraContainer.setPosition(this.player.x, this.player.y).setDepth(this.player.y - 6);
        let partnerNearby = false;
        this.remotePlayers.forEach((rp) => {
          if (
            rp.name.toLowerCase() === bond.partnerName.toLowerCase() &&
            Phaser.Math.Distance.Between(this.player.x, this.player.y, rp.x, rp.y) <= 240
          ) {
            partnerNearby = true;
          }
        });
        const pulseScale = (partnerNearby ? 1.15 : 0.92) + Math.sin(time / 340) * 0.1;
        this.bondAuraRing.setScale(pulseScale).setAlpha(partnerNearby ? 0.95 : 0.52);
        if (time - this.lastBondHeartAt > (partnerNearby ? 620 : 1450)) {
          this.lastBondHeartAt = time;
          const heart = this.add
            .text(this.player.x + Phaser.Math.Between(-14, 14), this.player.y - 16, partnerNearby ? '💖' : '🪷', {
              fontSize: '12px',
            })
            .setScale(0.55)
            .setOrigin(0.5)
            .setDepth(this.player.y + 18);
          this.tweens.add({
            targets: heart,
            y: heart.y - 22,
            alpha: 0,
            duration: 950,
            onComplete: () => heart.destroy(),
          });
        }
      }
    }

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

    // Animate unearthed Ancient Relic Chest Shadow Guardians
    for (const tg of this.treasureGuardians) {
      if (!tg.alive) continue;
      tg.sprite.x += tg.dir * delta * 0.036;
      if (tg.sprite.x > tg.homeX + 26) tg.dir = -1;
      if (tg.sprite.x < tg.homeX - 26) tg.dir = 1;
      tg.sprite.y = tg.homeY + Math.sin(time / 240 + tg.homeX) * 5;
      tg.hpBg.setPosition(tg.sprite.x, tg.sprite.y - 26);
      tg.hpFill.setPosition(tg.sprite.x - 19, tg.sprite.y - 26);
      tg.nameText.setPosition(tg.sprite.x, tg.sprite.y - 32);
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
    const clockSnap = this.atmosphere?.update(time, delta) ?? seasonClock.getSnapshot();
    this.updateFirefliesAndSunset(time, clockSnap);
    this.updateDeliveryCompassAndBeacon(time);
    if (this.fishingSystem) {
      this.fishingSystem.cancelIfMoved(this.player.x, this.player.y);
      this.fishingSystem.update(time, this.player.x, this.player.y);
    }

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
      const nearFirefly = this.findNearestFirefly();
      const nearNpc = this.findNearestNpc();
      const nearest = this.findNearestLandmark();
      if (nearFirefly) {
        this.promptText.setPosition(nearFirefly.orb.x, nearFirefly.orb.y - 22);
        this.promptText.setText('Press [E] or Click → ✨ Catch Glowing Firefly (+1 Jarred Firefly)').setVisible(true);
      } else if (nearNpc) {
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

  // ==================== UPDATE 3.1: KUN KHMER ARENA & FIREFLY NIGHT SYNERGIES ====================

  private enterArenaPvP(opts: {
    mode: 'normalized' | 'open';
    duelId?: string;
    spectate?: boolean;
    opponentName?: string;
  }): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 18, 12, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      void roomClient.leavePlaza(false);
      this.scene.start('ArenaPvPScene', {
        playerState: { ...this.player.state, zone: 'arena', currentMapId: 'temple_district' },
        mode: opts.mode,
        duelId: opts.duelId,
        spectate: Boolean(opts.spectate),
        opponentName: opts.opponentName,
      });
    });
  }

  private ensureFirefliesSpawned(): void {
    if (this.fireflies.length > 0) return;
    const spots: Array<[number, number]> =
      this.mapId === 'green_park'
        ? [
            [740, 480],
            [860, 520],
            [620, 620],
            [980, 610],
            [510, 740],
            [1120, 710],
            [780, 660],
            [390, 480],
            [1210, 490],
          ]
        : [
            [310, 540],
            [450, 620],
            [620, 480],
            [780, 610],
            [940, 510],
            [1100, 640],
            [680, 760],
            [860, 790],
            [520, 740],
          ];

    spots.forEach(([fx, fy], idx) => {
      const halo = this.add
        .circle(fx, fy, 11, 0xa3e635, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(fy + 35);
      const orb = this.add
        .circle(fx, fy, 4.2, 0xfef08a, 0.98)
        .setStrokeStyle(1.4, 0x84cc16, 0.95)
        .setDepth(fy + 36)
        .setInteractive({ useHandCursor: true });
      vfxManager.applyBloom(this, halo, { color: 0xa3e635, strength: 1.5 });

      const node = {
        id: idx,
        homeX: fx,
        homeY: fy,
        phase: idx * 1.15,
        caught: false,
        respawnAt: 0,
        orb,
        halo,
      };
      orb.on('pointerdown', () => {
        if (node.caught) return;
        if (!this.guardInteractRange(node.orb.x, node.orb.y, 115, '✨ Move closer to catch Firefly')) return;
        this.catchFireflyNode(node);
      });
      this.fireflies.push(node);
    });
  }

  private findNearestFirefly(): (typeof this.fireflies)[number] | null {
    if (!this.firefliesActive) return null;
    let best: (typeof this.fireflies)[number] | null = null;
    let bestDist = 95;
    for (const ff of this.fireflies) {
      if (ff.caught || !ff.orb.visible) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, ff.orb.x, ff.orb.y);
      if (d <= bestDist) {
        bestDist = d;
        best = ff;
      }
    }
    return best;
  }

  private catchFireflyNode(ff: (typeof this.fireflies)[number]): void {
    if (ff.caught) return;
    ff.caught = true;
    ff.respawnAt = this.time.now + 14_000;
    ff.orb.setVisible(false);
    ff.halo.setVisible(false);
    soundManager.playSfx('harvest');

    const burst = this.add
      .circle(ff.orb.x, ff.orb.y, 8, 0xbef264, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2400);
    this.tweens.add({ targets: burst, scale: 3.1, alpha: 0, duration: 380, onComplete: () => burst.destroy() });

    const txt = this.add
      .text(ff.orb.x, ff.orb.y - 10, '✨ +1 Jarred Firefly!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#bef264',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5)
      .setDepth(2450);
    this.tweens.add({ targets: txt, y: txt.y - 24, alpha: 0, duration: 900, onComplete: () => txt.destroy() });

    EventBus.emit('firefly:caught', { mapId: this.mapId, foragingXp: 18 });
  }

  private tryCatchNearbyFirefly(): boolean {
    const ff = this.findNearestFirefly();
    if (!ff) return false;
    this.catchFireflyNode(ff);
    return true;
  }

  private updateFirefliesAndSunset(
    time: number,
    snap: ReturnType<typeof seasonClock.getSnapshot>
  ): void {
    // 1. Firefly Night spawning & gentle drifting animation in Green Park & Bamboo Forest
    const canHaveFireflies =
      (this.mapId === 'green_park' || this.mapId === 'bamboo_forest') &&
      snap.synergy.fireflyNightActive;

    if (canHaveFireflies) {
      if (!this.firefliesActive) {
        this.firefliesActive = true;
        this.ensureFirefliesSpawned();
      }
      for (const ff of this.fireflies) {
        if (ff.caught) {
          if (time >= ff.respawnAt) {
            ff.caught = false;
            ff.orb.setVisible(true);
            ff.halo.setVisible(true);
          }
          continue;
        }
        const fx = ff.homeX + Math.sin(time / 900 + ff.phase) * 26;
        const fy = ff.homeY + Math.cos(time / 720 + ff.phase * 1.4) * 18;
        const pulse = 0.65 + Math.sin(time / 240 + ff.phase) * 0.35;
        ff.orb.setPosition(fx, fy).setAlpha(pulse).setVisible(true);
        ff.halo.setPosition(fx, fy).setScale(0.85 + pulse * 0.4).setAlpha(0.18 + pulse * 0.24).setVisible(true);
      }
    } else if (this.firefliesActive) {
      this.firefliesActive = false;
      for (const ff of this.fireflies) {
        ff.orb.setVisible(false);
        ff.halo.setVisible(false);
      }
    }

    // 2. Golden Sunset Synergy in Central Plaza: cozy 2x Friendly XP hangout aura every 20s!
    if (this.mapId === 'central_plaza' && snap.synergy.goldenSunsetActive) {
      if (time - this.lastSunsetPulseAt > 20_000) {
        this.lastSunsetPulseAt = time;
        EventBus.emit('weather:sunsetPulse', { friendlyXp: 8 });
      }
    }
  }

  // ==================== UPDATE 3.2: EXPRESS DELIVERY GOLDEN COMPASS & DROP BEACON ====================

  private tryDeliverNearbyOrder(): boolean {
    const order = deliveryJobManager.getNextPendingOrder(this.mapId);
    if (!order || order.mapId !== this.mapId) return false;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, order.x, order.y);
    if (dist > 105) return false;
    const res = deliveryJobManager.deliverOrder(order.id);
    if (!res.delivered) return false;
    soundManager.playSfx(res.allDone ? 'victory' : 'coin');
    vfxManager.playCoinJackpotVfx(this, this.player.x, this.player.y, 2400);
    if (res.allDone && res.reward) {
      vfxManager.playHeartBurstVfx(this, this.player.x, this.player.y - 26, 2405);
      EventBus.emit('delivery:completed', res.reward);
    } else {
      const next = deliveryJobManager.getNextPendingOrder();
      EventBus.emit('ui:toast', {
        text: `✅ Delivered ${res.delivered.icon} ${res.delivered.itemName}!${next ? ` Next stop: ${next.icon} ${next.mapLabel}!` : ''}`,
      });
    }
    return true;
  }

  private updateDeliveryCompassAndBeacon(time: number): void {
    const tick = deliveryJobManager.tick();
    if (tick.expired) {
      EventBus.emit('ui:toast', { text: '⏰ Express Delivery time expired! Visit Tuk-Tuk Dispatch Board in Central Plaza to try again!' });
    }
    const order = deliveryJobManager.getNextPendingOrder(this.mapId);
    if (!order) {
      this.deliveryCompassGfx?.clear();
      if (this.deliveryDropBeacon) {
        this.deliveryDropBeacon.destroy();
        this.deliveryDropBeacon = undefined;
        this.deliveryDropOrderId = null;
      }
      return;
    }

    if (!this.deliveryCompassGfx || !this.deliveryCompassGfx.scene) {
      this.deliveryCompassGfx = this.add.graphics().setDepth(2480);
    }

    // Target either exact drop-off coordinates on this map, or the portal heading toward the destination map!
    let targetX = order.x;
    let targetY = order.y;
    if (order.mapId !== this.mapId) {
      const portal = this.mapPortals.find((p) => p.targetMapId === order.mapId) ?? this.mapPortals[0];
      if (portal) {
        targetX = portal.x;
        targetY = portal.y;
      }
    }

    // Glowing Golden Compass Arrow orbiting cleanly around the player pointing straight to target
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
    const orbitR = 26 + Math.sin(time / 180) * 2.5;
    const ax = this.player.x + Math.cos(ang) * orbitR;
    const ay = this.player.y + Math.sin(ang) * orbitR;
    const tipX = ax + Math.cos(ang) * 10;
    const tipY = ay + Math.sin(ang) * 10;
    const leftX = ax + Math.cos(ang + 2.4) * 7;
    const leftY = ay + Math.sin(ang + 2.4) * 7;
    const rightX = ax + Math.cos(ang - 2.4) * 7;
    const rightY = ay + Math.sin(ang - 2.4) * 7;

    this.deliveryCompassGfx.clear();
    this.deliveryCompassGfx.fillStyle(0xfacc15, 0.96);
    this.deliveryCompassGfx.lineStyle(1.6, 0x78350f, 1);
    this.deliveryCompassGfx.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
    this.deliveryCompassGfx.strokeTriangle(tipX, tipY, leftX, leftY, rightX, rightY);

    // Render glowing golden drop-off beacon when on the order's destination map
    if (order.mapId === this.mapId) {
      if (this.deliveryDropOrderId !== order.id || !this.deliveryDropBeacon) {
        this.deliveryDropBeacon?.destroy();
        const cont = this.add.container(order.x, order.y).setDepth(order.y + 45);
        const ring = this.add.ellipse(0, 4, 48, 22, 0xfacc15, 0.32).setStrokeStyle(2.5, 0xfef08a);
        const arrow = this.add.image(0, -34, 'join_arrow').setScale(0.6);
        const tag = this.add
          .text(0, -52, `📦 DELIVER: ${order.itemName} [E]`, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fef08a',
            backgroundColor: 'rgba(180, 83, 9, 0.95)',
            padding: { x: 7, y: 2 },
          })
          .setResolution(2)
          .setScale(0.45)
          .setOrigin(0.5, 1);
        const hit = this.add.circle(0, 0, 34, 0xffffff, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          if (!this.guardInteractRange(order.x, order.y, 125)) return;
          this.tryDeliverNearbyOrder();
        });
        this.tweens.add({ targets: arrow, y: -42, duration: 480, yoyo: true, repeat: -1 });
        cont.add([ring, arrow, tag, hit]);
        this.deliveryDropBeacon = cont;
        this.deliveryDropOrderId = order.id;
      }
    } else if (this.deliveryDropBeacon) {
      this.deliveryDropBeacon.destroy();
      this.deliveryDropBeacon = undefined;
      this.deliveryDropOrderId = null;
    }
  }
}
