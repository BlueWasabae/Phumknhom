import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type DifficultyMode,
  type InventoryItem,
  type PlayerState,
} from '@shared/types';
import {
  calculateDamageTaken,
  calculatePlayerDamage,
  getXpForNextLevel,
} from '@shared/balanceFormulas';
import {
  CLASS_TO_COMBAT_SKILL,
  computeVillageToDungeonBridge,
  hasTalent,
} from '@shared/skillTrees';
import { KHMER_BOSSES, rollBossLoot, type RolledBossLoot } from '@shared/khmerBosses';
import {
  KHMER_ARSENAL_WEAPONS,
  getPreahKhanBiomeBonus,
  getUniqueBossClearsCount,
} from '../../data/khmerArsenal';
import { awardSkillXp } from '../systems/SkillManager';
import { soundManager } from '../systems/SoundManager';
import { travelManager } from '../systems/TravelAndPylons';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { PaperDoll, type PaperDollPose } from '../entities/PaperDoll';
import { Pet, summonTemporaryCombatSpirit } from '../entities/Pet';
import { BossController } from '../entities/BossController';
import {
  ClassCombatVFX,
  type SpawnedProjectile,
  type TossedGoldCoin,
} from '../animations/ClassCombatVFX';
import {
  parseAppearance,
  roomClient,
  type RemoteDungeonPlayerSnapshot,
} from '../network/RoomClient';

const ARENA_W = 1800;
const ARENA_H = 720;
const FLOOR_Y = 620;
const BOSS_SPAWN_X = 1360;
const EXIT_PORTAL_X = 118;
const EXIT_PORTAL_Y = FLOOR_Y - 78;

interface DustMote {
  sprite: Phaser.GameObjects.Image;
  baseY: number;
  speedX: number;
  phase: number;
}

interface SecretWallState {
  x: number;
  y: number;
  hitsRemaining: number;
  broken: boolean;
  chestClaimed: boolean;
  wallRect: Phaser.GameObjects.Image;
  crackLines: Phaser.GameObjects.Graphics;
  shimmer: Phaser.GameObjects.Arc;
  chestSprite?: Phaser.GameObjects.Image;
  chestLabel?: Phaser.GameObjects.Text;
}

interface LootBagDrop {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  rolled: RolledBossLoot;
  claimed: boolean;
}

interface VillageCheerPackage {
  x: number;
  y: number;
  targetY: number;
  senderName: string;
  healHp: number;
  attackBonusPct: number;
  durationMs: number;
  container: Phaser.GameObjects.Container;
  claimed: boolean;
}

interface RemoteDungeonTeammate {
  sessionId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'left' | 'right';
  pose: PaperDollPose;
  appearanceJson: string;
  paperDoll: PaperDoll;
  pet: Pet | null;
  nameTag: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
}

export class DungeonBossScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private bossId: BossId = 'sdech_kongkaeb';
  private difficulty: DifficultyMode = 'normal';
  private partyMode: 'solo' | 'coop' = 'solo';
  private partyId = '';
  private partySize = 1;
  private teammates = new Map<string, RemoteDungeonTeammate>();

  private player!: Player;
  private bossCtrl!: BossController;
  private vfx!: ClassCombatVFX;
  private promptText!: Phaser.GameObjects.Text;

  private solidFloor!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private dustMotes: DustMote[] = [];

  // Cracked Secret Wall, Boss Treasure Bag Drop, Arena Buff Stations & Shimmer Spring
  private secretWall!: SecretWallState;
  private lootBag: LootBagDrop | null = null;
  private arenaStations = {
    heartLantern: true,
    sacredCampfire: true,
    angkorWard: false,
  };
  private lastStationHealAt = 0;

  // 5-Class Combat & Khmer Mythic Arsenal Mechanics
  private projectiles: SpawnedProjectile[] = [];
  private tossedCoins: TossedGoldCoin[] = [];
  private yantSigils: Phaser.GameObjects.Container[] = [];
  private parryActiveUntil = 0;
  private parryCooldownUntil = 0;
  private realityRipCharged = false;
  private lbokatorStance = 1;
  private consecutiveMeleeHits = 0;
  private stealthPct = 0;
  private lastAttackAt = 0;
  private lastMeterBroadcast = 0;
  private lastBossHudBroadcast = 0;

  // Mythic Focus & Fury Gauges + Defense Damage
  private focusPct = 0;
  private focusActiveUntil = 0;
  private furyPct = 0;
  private furyActiveUntil = 0;
  private defenseCrackedUntil = 0;
  private damageTakenThisFight = 0;
  private cheatDeathUsed = false;
  private playerDefeated = false;

  // Platformer & Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<
    'A' | 'D' | 'W' | 'E' | 'G' | 'J' | 'L' | 'F' | 'Q' | 'R' | 'SHIFT' | 'SPACE',
    Phaser.Input.Keyboard.Key
  >;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private jumpsUsed = 0;
  private prevOnGround = true;
  private peakAirVy = 0;
  private dashActiveUntil = 0;
  private dashCooldownUntil = 0;
  private invulnerableUntil = 0;
  private attackCooldownUntil = 0;
  private attackAnimUntil = 0;
  // Bamboo Vine Grapple & Naga Water Shield (Update 1.3A)
  private grappleActive = false;
  private grappleTargetX = 0;
  private grappleTargetY = 0;
  private grappleEndAt = 0;
  private grappleCooldownUntil = 0;
  private grappleGraphics!: Phaser.GameObjects.Graphics;
  private waterShieldReadyAt = 0;
  private waterShieldOrb!: Phaser.GameObjects.Arc;
  private waterShieldRing!: Phaser.GameObjects.Arc;
  private arenaPlatforms: Array<{ x: number; y: number; w: number }> = [
    { x: 460, y: 500, w: 224 },
    { x: 780, y: 395, w: 240 },
    { x: 1120, y: 485, w: 224 },
    { x: 1460, y: 365, w: 240 },
  ];
  private nearExitSent = false;
  private transitioning = false;
  private cheerPackages: VillageCheerPackage[] = [];
  private unsubs: Array<() => void> = [];

  constructor() {
    super('DungeonBossScene');
  }

  init(data?: {
    playerState?: PlayerState;
    bossId?: BossId;
    difficulty?: DifficultyMode;
    partyMode?: 'solo' | 'coop';
    partyId?: string;
  }): void {
    this.bossId = data?.bossId ?? 'sdech_kongkaeb';
    this.difficulty = data?.difficulty ?? data?.playerState?.difficulty ?? 'normal';
    this.partyMode = data?.partyMode ?? 'solo';
    this.partyId = data?.partyId ?? `coop_${this.bossId}_${this.difficulty}`;
    this.partySize = 1;
    this.teammates.clear();
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'dungeon',
          difficulty: this.difficulty,
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
          activeBuffs: [...data.playerState.activeBuffs],
          quickSnackSlots: [...data.playerState.quickSnackSlots],
          clearedBosses: [...data.playerState.clearedBosses],
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'dungeon', difficulty: this.difficulty };

    this.jumpsUsed = 0;
    this.prevOnGround = true;
    this.peakAirVy = 0;
    this.grappleActive = false;
    this.grappleCooldownUntil = 0;
    this.waterShieldReadyAt = 0;
    this.nearExitSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
    this.dustMotes = [];
    this.projectiles = [];
    this.yantSigils = [];
    this.lbokatorStance = 1;
    this.consecutiveMeleeHits = 0;
    this.stealthPct = 0;
    this.focusPct = 0;
    this.focusActiveUntil = 0;
    this.furyPct = 0;
    this.furyActiveUntil = 0;
    this.defenseCrackedUntil = 0;
    this.damageTakenThisFight = 0;
    this.cheatDeathUsed = false;
    this.playerDefeated = false;
    this.lootBag = null;
    this.cheerPackages = [];
  }

  create(): void {
    // Side-Scrolling Boss Cavern Mode: 2D Platformer (gravity = 800)
    this.physics.world.gravity.y = 800;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);
    soundManager.playBgm('boss');

    this.vfx = new ClassCombatVFX(this);
    this.drawParallaxCavernAndAtmosphere();
    this.buildArenaPlatforms();
    this.buildExitPortal();
    this.buildCrackedSecretWall();
    this.buildArenaBuffStationsAndShimmerSpring();

    this.player = new Player(this, 280, FLOOR_Y - 46, this.initialState, 'dungeon');
    // Ensure HP starts clamped cleanly to effectiveMaxHp (or full if coming from defeat)
    const startBridge = computeVillageToDungeonBridge(this.player.state);
    if (this.player.state.hp <= 0) {
      this.player.state.hp = startBridge.effectiveMaxHp;
    }

    this.physics.add.collider(this.player.sprite, this.solidFloor);
    this.physics.add.collider(
      this.player.sprite,
      this.elevatedPlatforms,
      undefined,
      (playerObj, platObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        const plat = platObj as Phaser.GameObjects.Rectangle;
        const body = p.body as Phaser.Physics.Arcade.Body;
        return !this.grappleActive && body.velocity.y >= 0 && body.bottom <= plat.y - plat.height / 2 + 14;
      }
    );

    this.grappleGraphics = this.add.graphics().setDepth(65);
    this.waterShieldOrb = this.add.circle(this.player.x, this.player.y, 7, 0x38bdf8, 0.92).setDepth(62).setVisible(false);
    this.waterShieldRing = this.add
      .circle(this.player.x, this.player.y, 10, 0x7dd3fc, 0)
      .setStrokeStyle(2, 0xbae6fd, 0.85)
      .setDepth(61)
      .setVisible(false);

    this.bossCtrl = new BossController(
      this,
      this.bossId,
      this.difficulty,
      BOSS_SPAWN_X,
      FLOOR_Y,
      200,
      ARENA_W - 110,
      {
        onHitPlayer: (rawAtk, label, pullDir, isPoison) =>
          this.handlePlayerHit(rawAtk, label, pullDir, isPoison),
        onFloatingText: (x, y, text, color, fontSize) =>
          this.spawnFloatingText(x, y, text, color, fontSize ?? '16px'),
        onPhaseChange: () => {
          EventBus.emit('ui:toast', {
            text: `${this.bossCtrl.def.khmerName} entered PHASE 2! Watch the new telegraphs!`,
          });
          this.broadcastBossHud();
        },
        onDefeated: () => this.handleBossDefeated(),
      }
    );

    this.promptText = this.add
      .text(EXIT_PORTAL_X + 20, EXIT_PORTAL_Y - 94, 'Press [E] or Tap EXIT → Return to Phum Village', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(90)
      .setVisible(false);

    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(240, 8, 10, 20);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,E,G,J,L,F,Q,R,SHIFT,SPACE') as Record<
      'A' | 'D' | 'W' | 'E' | 'G' | 'J' | 'L' | 'F' | 'Q' | 'R' | 'SHIFT' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;

    // Enable crisp Right-Click for Preah Khan Parry & Golden Riel Coin Toss without browser menu popup
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.playerDefeated) return;
      if (pointer.rightButtonDown()) {
        this.performSecondaryWeaponAction();
      } else if (pointer.leftButtonDown()) {
        this.performClassAttack();
      }
    });

    this.tossedCoins = [];
    this.parryActiveUntil = 0;
    this.parryCooldownUntil = 0;
    this.realityRipCharged = false;

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
        this.player.applyLoadoutUpdate(loadout, playerState);
        this.stealthPct = 0;
        this.consecutiveMeleeHits = 0;
        this.clearYantSigils();
        this.player.paperDoll.setStealthTint(false);
        this.broadcastClassMeter();
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
      }),
      EventBus.on('input:jump', () => this.performJump()),
      EventBus.on('input:attack', () => this.performClassAttack()),
      EventBus.on('input:secondary', () => this.performSecondaryWeaponAction()),
      EventBus.on('input:dash', () => this.performClassDash()),
      EventBus.on('input:grapple', () => this.performBambooGrapple()),
      EventBus.on('input:focus', () => this.activateFocusBurst()),
      EventBus.on('input:fury', () => this.activateFuryBurst()),
      EventBus.on('input:rematch', () => this.restartCurrentBoss()),
      EventBus.on('input:exitDungeon', () => this.returnToOverworld()),
      EventBus.on('dungeon:enterRequest', (req) => {
        if (this.transitioning) return;
        this.transitioning = true;
        this.scene.restart({
          playerState: this.player.state,
          bossId: req.bossId,
          difficulty: req.difficulty,
          partyMode: req.partyMode,
          partyId: req.partyId,
        });
      }),
      EventBus.on('dungeon:villageCheer', (payload) => {
        this.spawnVillageCheerPackage(
          payload.senderName,
          payload.healHp,
          payload.attackBonusPct,
          payload.durationMs
        );
      }),
      EventBus.on('travel:execute', (req) => {
        if (req.method === 'mirror' || req.targetZone === 'overworld') {
          this.returnToOverworld();
        }
      }),
      EventBus.on('input:interact', () => {
        if (this.lootBag && !this.lootBag.claimed) {
          this.claimBossLootBag();
        } else if (this.secretWall.broken && !this.secretWall.chestClaimed) {
          this.claimSecretRelicChest();
        } else if (this.isNearExitPortal()) {
          this.returnToOverworld();
        }
      })
    );

    EventBus.emit('dungeon:outcome', null);
    EventBus.emit('scene:ready', { zone: 'dungeon' });
    this.emitPlayerState();
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });
    this.broadcastClassMeter();
    this.broadcastBossHud();

    // Connect to Co-op DungeonRoom if partyMode === 'coop'
    if (this.partyMode === 'coop') {
      void this.connectCoopDungeon();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.cheerPackages.forEach((cp) => cp.container.destroy());
      this.cheerPackages = [];
      this.clearYantSigils();
      this.clearTeammates();
      void roomClient.leaveDungeon();
      this.bossCtrl.destroy();
      this.player.destroy();
      EventBus.emit('boss:hudUpdate', {
        active: false,
        bossId: this.bossId,
        khmerName: '',
        englishName: '',
        hp: 0,
        maxHp: 1,
        phase: 1,
        difficulty: this.difficulty,
        stageLabel: '',
        focusPct: 0,
        focusActive: false,
        furyPct: 0,
        furyActive: false,
        defenseCracked: false,
        damageTakenThisFight: 0,
      });
    });
  }

  private drawParallaxCavernAndAtmosphere(): void {
    const skyTint =
      this.bossId === 'sdech_kongkaeb'
        ? 0x16342a
        : this.bossId === 'arp_prey_chrov'
        ? 0x0b1d1b
        : this.bossId === 'neak_reach'
        ? 0x22163b
        : 0x202744;
    const farTint =
      this.bossId === 'sdech_kongkaeb'
        ? 0x1d4235
        : this.bossId === 'arp_prey_chrov'
        ? 0x0f2a22
        : this.bossId === 'neak_reach'
        ? 0x2f1e4f
        : 0x25354f;
    const midTint =
      this.bossId === 'sdech_kongkaeb'
        ? 0x163026
        : this.bossId === 'arp_prey_chrov'
        ? 0x0a1c17
        : this.bossId === 'neak_reach'
        ? 0x211438
        : 0x1a263a;

    this.add
      .tileSprite(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 'lf_sky')
      .setTileScale(2.8, 2.8)
      .setTint(skyTint)
      .setScrollFactor(0.1)
      .setDepth(0);

    this.add
      .tileSprite(ARENA_W / 2, 405, ARENA_W, 256, 'lf_parallax_far')
      .setTileScale(2.2, 2.2)
      .setTint(farTint)
      .setScrollFactor(0.2)
      .setDepth(2);

    this.add
      .tileSprite(ARENA_W / 2, 445, ARENA_W, 256, 'lf_parallax_mid')
      .setTileScale(2.2, 2.2)
      .setTint(midTint)
      .setScrollFactor(0.5)
      .setDepth(4);

    const vineXs = [210, 390, 540, 720, 890, 1080, 1290, 1510, 1680];
    vineXs.forEach((vx, idx) => {
      const tex = idx % 2 === 0 ? 'lf_vine_green' : 'lf_vine_purple';
      const vine = this.add
        .image(vx, 85 + (idx % 3) * 18, tex)
        .setScale(2.3)
        .setOrigin(0.5, 0)
        .setDepth(7);
      this.tweens.add({
        targets: vine,
        angle: idx % 2 === 0 ? 3 : -3,
        duration: 1800 + idx * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    for (const tx of [360, 740, 1140, 1580]) {
      this.add.image(tx, FLOOR_Y - 68, 'lf_pillar').setScale(1.6).setTint(0x64748b).setDepth(6);
      this.add.image(tx, FLOOR_Y - 125, 'lf_torch').setScale(2.2).setDepth(8);
      const glow = this.add
        .image(tx, FLOOR_Y - 134, 'torch_glow')
        .setScale(1.45)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9);
      this.tweens.add({
        targets: glow,
        alpha: 0.58,
        scale: 1.65,
        duration: 360 + Math.random() * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    for (const mx of [310, 620, 970, 1280, 1650]) {
      this.add.image(mx, FLOOR_Y - 16, 'lf_mushroom').setScale(1.7).setDepth(16);
    }
    this.add.image(560, FLOOR_Y - 26, 'lf_boulder').setScale(1.4).setTint(0x64748b).setDepth(8);

    for (let i = 0; i < 28; i++) {
      const dx = Math.random() * ARENA_W;
      const dy = 140 + Math.random() * 430;
      const mote = this.add
        .image(dx, dy, 'dust_mote')
        .setScale(0.8 + Math.random() * 1.1)
        .setAlpha(0.25 + Math.random() * 0.45)
        .setDepth(28);
      this.dustMotes.push({
        sprite: mote,
        baseY: dy,
        speedX: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const bossDef = KHMER_BOSSES[this.bossId];
    this.add
      .text(420, 128, `${bossDef.biomeName.toUpperCase()} · ${this.difficulty.toUpperCase()} MODE`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setDepth(12);
    this.add
      .text(
        420,
        154,
        '[I] Class · [1/2/3] Snacks · Space/W Jump · Shift/L Dash · J/Click Attack' +
          (this.difficulty === 'mythic' ? ' · [F] Focus · [R] Fury' : ''),
        {
          fontFamily: 'Kantumruy Pro, sans-serif',
          fontSize: '12px',
          color: '#cbd5e1',
        }
      )
      .setDepth(12);
  }

  private spawnVillageCheerPackage(
    senderName: string,
    healHp = 80,
    attackBonusPct = 0.2,
    durationMs = 30_000
  ): void {
    const dropX = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-90, 90), 220, ARENA_W - 220);
    const startY = 120;
    const targetY = FLOOR_Y - 26;

    const container = this.add.container(dropX, startY).setDepth(95);
    // Golden silk parachute canopy + strings + glowing Num Pang parcel
    const g = this.add.graphics();
    g.fillStyle(0xfacc15, 0.92);
    g.fillEllipse(0, -34, 48, 22);
    g.lineStyle(2, 0xfef08a, 0.9);
    g.lineBetween(-18, -28, -8, -4);
    g.lineBetween(18, -28, 8, -4);
    g.fillStyle(0xb45309, 1);
    g.fillRoundedRect(-14, -8, 28, 18, 6);
    g.lineStyle(2.5, 0xfde047, 1);
    g.strokeRoundedRect(-14, -8, 28, 18, 6);

    const glow = this.add.circle(0, 0, 22, 0xfacc15, 0.28);
    const icon = this.add.text(0, -1, '🥖', { fontSize: '18px' }).setOrigin(0.5);
    const lbl = this.add
      .text(0, 18, `✨ Hot Num Pang (+${healHp} HP · +20% ATK)`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(124, 45, 18, 0.92)',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 0);
    container.add([glow, g, icon, lbl]);

    this.cheerPackages.push({
      x: dropX,
      y: startY,
      targetY,
      senderName,
      healHp,
      attackBonusPct,
      durationMs,
      container,
      claimed: false,
    });

    // Overhead Arena Banner: "<SenderName> sent a Hot Num Pang!" (positioned cleanly below Boss HP bar)
    soundManager.playSfx('magic');
    const banner = this.add
      .text(this.scale.width / 2, 198, `🥖 ${senderName} sent a Hot Num Pang!`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#451a03',
        strokeThickness: 5,
        backgroundColor: 'rgba(124, 45, 18, 0.96)',
        padding: { x: 16, y: 7 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2300);
    this.tweens.add({
      targets: banner,
      y: 184,
      alpha: 0,
      delay: 3400,
      duration: 700,
      onComplete: () => banner.destroy(),
    });
  }

  private claimVillageCheerPackage(pkg: VillageCheerPackage): void {
    pkg.claimed = true;
    pkg.container.destroy();
    soundManager.playSfx('heal');

    const bridge = computeVillageToDungeonBridge(this.player.state);
    const nextHp = Math.min(bridge.effectiveMaxHp, this.player.state.hp + pkg.healHp);
    const nowMs = Date.now();
    const nextBuffs = [
      ...this.player.state.activeBuffs.filter((b) => b.id !== 'village_cheer_num_pang'),
      {
        id: 'village_cheer_num_pang',
        snackId: 'snack_num_pang',
        name: 'Hot Num Pang Cheer (+20% ATK)',
        khmerName: 'នំប៉័ងក្តៅជួយមិត្ត',
        icon: '🥖',
        color: '#facc15',
        startedAt: nowMs,
        expiresAt: nowMs + pkg.durationMs,
        attackPct: pkg.attackBonusPct,
      },
    ];
    this.player.state = {
      ...this.player.state,
      hp: nextHp,
      activeBuffs: nextBuffs,
    };
    this.emitPlayerState();
    this.spawnFloatingText(
      this.player.x,
      this.player.y - 46,
      `🥖 +${pkg.healHp} HP · +20% ATK (30s)!`,
      '#fde047',
      '16px'
    );
    EventBus.emit('ui:toast', {
      text: `🥖 Picked up ${pkg.senderName}'s Hot Num Pang! +${pkg.healHp} HP & +20% ATK for 30s!`,
    });
  }

  private buildArenaPlatforms(): void {
    this.solidFloor = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();

    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 52, ARENA_W, 108, 'lf_cave_floor').setTileScale(1.8, 1.8).setDepth(10);
    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 10, ARENA_W, 34, 'lf_moss_top').setTileScale(1.8, 1.4).setDepth(11);
    const floorCollider = this.add.rectangle(ARENA_W / 2, FLOOR_Y + 50, ARENA_W, 100, 0x000000, 0);
    this.solidFloor.add(floorCollider);

    const platforms: Array<{ x: number; y: number; w: number; tex: 'lf_plat_stone' | 'lf_plat_wood' }> = [
      { x: 460, y: 500, w: 224, tex: 'lf_plat_stone' },
      { x: 780, y: 395, w: 240, tex: 'lf_plat_wood' },
      { x: 1120, y: 485, w: 224, tex: 'lf_plat_stone' },
      { x: 1460, y: 365, w: 240, tex: 'lf_plat_wood' },
    ];
    for (const p of platforms) {
      this.add.tileSprite(p.x, p.y, p.w, 26, p.tex).setTileScale(1.6, 1.5).setDepth(14);
      const collider = this.add.rectangle(p.x, p.y, p.w, 18, 0x000000, 0);
      this.elevatedPlatforms.add(collider);
    }
  }

  private buildExitPortal(): void {
    this.add.image(EXIT_PORTAL_X, FLOOR_Y - 2, 'soft_shadow').setDisplaySize(130, 26).setDepth(17);
    const glow = this.add
      .image(EXIT_PORTAL_X, EXIT_PORTAL_Y, 'portal_vortex')
      .setScale(1.6)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    this.tweens.add({
      targets: glow,
      alpha: 0.25,
      scale: 1.8,
      duration: 850,
      yoyo: true,
      repeat: -1,
    });
    this.add.image(EXIT_PORTAL_X, FLOOR_Y + 4, 'angkor_portal').setOrigin(0.5, 0.96).setScale(0.92).setDepth(20);

    const arrow = this.add.image(EXIT_PORTAL_X, EXIT_PORTAL_Y - 108, 'join_arrow').setScale(1.2).setDepth(24);
    this.tweens.add({
      targets: arrow,
      y: EXIT_PORTAL_Y - 120,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add
      .text(EXIT_PORTAL_X, FLOOR_Y - 6, 'VILLAGE EXIT', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(24);
  }

  /**
   * Cracked Secret Wall (docs/GDD_CONTENT_AND_ECONOMY.md §4):
   * 1 subtle shimmering cracked sandstone wall; hitting it 3 times reveals a Relic Chest (+Coins & Gold)!
   */
  private buildCrackedSecretWall(): void {
    const wx = 780;
    const wy = 358;
    const hasTracker = hasTalent(this.initialState.skills, 'foraging', 'forage_tracker');

    // Real Legacy Fantasy rock boulder sprite (ZERO procedural grey square!)
    const wallRect = this.add
      .image(wx, wy, 'lf_boulder')
      .setScale(1.18)
      .setTint(hasTracker ? 0xfef08a : 0xcbd5e1)
      .setDepth(18);

    const crackLines = this.add.graphics().setDepth(19);
    crackLines.lineStyle(2, 0x1c1917, 0.9);
    crackLines.beginPath();
    crackLines.moveTo(wx - 12, wy - 14);
    crackLines.lineTo(wx - 1, wy - 2);
    crackLines.lineTo(wx - 8, wy + 12);
    crackLines.moveTo(wx - 1, wy - 2);
    crackLines.lineTo(wx + 12, wy + 7);
    crackLines.strokePath();

    const shimmer = this.add
      .circle(wx, wy, hasTracker ? 24 : 14, 0xfef08a, hasTracker ? 0.36 : 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    this.tweens.add({
      targets: shimmer,
      alpha: hasTracker ? 0.65 : 0.05,
      scale: 1.45,
      duration: 950,
      yoyo: true,
      repeat: -1,
    });

    this.secretWall = {
      x: wx,
      y: wy,
      hitsRemaining: 3,
      broken: false,
      chestClaimed: false,
      wallRect,
      crackLines,
      shimmer,
    };
  }

  private damageSecretWall(): void {
    if (this.secretWall.broken) return;
    this.secretWall.hitsRemaining -= 1;
    this.cameras.main.shake(70, 0.004);
    this.tweens.add({
      targets: this.secretWall.wallRect,
      x: this.secretWall.x + 5,
      duration: 45,
      yoyo: true,
    });

    if (this.secretWall.hitsRemaining > 0) {
      this.spawnFloatingText(
        this.secretWall.x,
        this.secretWall.y - 36,
        `CRACK! (${3 - this.secretWall.hitsRemaining}/3)`,
        '#fde047',
        '14px'
      );
      return;
    }

    // Shatter secret wall -> reveal Relic Chest!
    this.secretWall.broken = true;
    this.secretWall.wallRect.destroy();
    this.secretWall.crackLines.destroy();
    this.secretWall.shimmer.destroy();

    const chest = this.add
      .image(this.secretWall.x, this.secretWall.y + 12, 'lf_chest')
      .setScale(1.8)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    chest.on('pointerdown', () => this.claimSecretRelicChest());

    const label = this.add
      .text(this.secretWall.x, this.secretWall.y - 26, 'SECRET RELIC CHEST!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(24);

    this.secretWall.chestSprite = chest;
    this.secretWall.chestLabel = label;

    this.spawnFloatingText(this.secretWall.x, this.secretWall.y - 46, 'SECRET CHAMBER OPENED!', '#facc15', '17px');
    EventBus.emit('ui:toast', { text: '✨ Cracked Secret Wall shattered! Walk over or click the Relic Chest!' });
  }

  /**
   * Placeable Arena Buff Stations rendered with REAL animated sprites (ZERO colored rectangles!):
   * - Heart Lantern: Animated Ninja Adventure LanternRed + Heart icon + soft warm rose glow
   * - Sacred Campfire: Animated Serene Village 32x32 Campfire + warm flickering torch_glow
   * - Angkor Ward: Real carved stone Guardian Statue + soft cyan glow
   * - Apsara Shimmer Spring: Animated Ninja Adventure Purple Water Ripples + violet glow
   */
  private buildArenaBuffStationsAndShimmerSpring(): void {
    const stations: Array<{
      key: 'heartLantern' | 'sacredCampfire' | 'angkorWard';
      x: number;
      y: number;
      label: string;
      glowTint: number;
    }> = [
      { key: 'heartLantern', x: 460, y: 474, label: '❤️ HEART LANTERN (+3 HP/s)', glowTint: 0xf43f5e },
      { key: 'sacredCampfire', x: 780, y: FLOOR_Y - 12, label: '🔥 CAMPFIRE (+2 HP/s)', glowTint: 0xf97316 },
      { key: 'angkorWard', x: 1120, y: 456, label: '🗿 ANGKOR WARD (+6 DEF)', glowTint: 0x38bdf8 },
    ];

    stations.forEach((st) => {
      const activeInit = this.arenaStations[st.key];
      const aura = this.add
        .image(st.x, st.y - 6, 'torch_glow')
        .setTint(st.glowTint)
        .setScale(activeInit ? 0.95 : 0.45)
        .setAlpha(activeInit ? 0.72 : 0.14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);

      this.tweens.add({
        targets: aura,
        scale: activeInit ? 1.12 : 0.5,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      let visual: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
      let heartBadge: Phaser.GameObjects.Image | null = null;
      if (st.key === 'sacredCampfire') {
        const fire = this.add
          .sprite(st.x, st.y + 8, 'sv_campfire_32', 0)
          .setOrigin(0.5, 0.9)
          .setScale(1.35)
          .setDepth(18)
          .setInteractive({ useHandCursor: true });
        fire.play('campfire_burn_32');
        visual = fire;
      } else if (st.key === 'heartLantern') {
        const lantern = this.add
          .sprite(st.x, st.y + 4, 'pet_lantern', 0)
          .setOrigin(0.5, 0.85)
          .setScale(2.1)
          .setDepth(18)
          .setInteractive({ useHandCursor: true });
        lantern.play('pet_lantern_idle');
        heartBadge = this.add
          .image(st.x, st.y - 26, 'na_heart')
          .setScale(1.6)
          .setDepth(19);
        this.tweens.add({
          targets: heartBadge,
          y: st.y - 31,
          duration: 700,
          yoyo: true,
          repeat: -1,
        });
        visual = lantern;
      } else {
        visual = this.add
          .image(st.x, st.y + 12, 'angkor_ward_statue')
          .setOrigin(0.5, 0.92)
          .setScale(1.35)
          .setDepth(18)
          .setInteractive({ useHandCursor: true });
      }
      visual.setAlpha(activeInit ? 1 : 0.42);

      const txt = this.add
        .text(st.x, st.y - 36, activeInit ? st.label : `Place ${st.label.split(' (')[0]}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: activeInit ? '#fef08a' : '#94a3b8',
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(21);

      visual.on('pointerdown', () => {
        this.arenaStations[st.key] = !this.arenaStations[st.key];
        const on = this.arenaStations[st.key];
        aura.setAlpha(on ? 0.72 : 0.14);
        visual.setAlpha(on ? 1 : 0.42);
        heartBadge?.setAlpha(on ? 1 : 0.35);
        txt.setText(on ? st.label : `Place ${st.label.split(' (')[0]}`).setColor(on ? '#fef08a' : '#94a3b8');
        soundManager.playSfx('magic');
        EventBus.emit('ui:toast', {
          text: on ? `✨ Placed Arena Buff Station: ${st.label}` : `Packed away ${st.label.split(' (')[0]}.`,
        });
      });
    });

    // Real Animated Iridescent Apsara Shimmer Spring (Ninja Adventure Purple Water Ripples!)
    const sx = 250;
    const sy = FLOOR_Y - 4;
    const glow = this.add
      .image(sx, sy - 10, 'torch_glow')
      .setTint(0xc084fc)
      .setScale(1.1)
      .setAlpha(0.65)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);
    this.tweens.add({ targets: glow, alpha: 0.38, scale: 1.25, duration: 950, yoyo: true, repeat: -1 });

    const rippleHit = this.add
      .rectangle(sx, sy - 4, 84, 28, 0, 0)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    for (const rx of [-24, 0, 24]) {
      const spr = this.add
        .sprite(sx + rx, sy - 2, 'na_water_purple', 0)
        .setScale(1.85)
        .setDepth(17);
      spr.play('shimmer_ripple');
    }
    rippleHit.on('pointerdown', () => {
      soundManager.playSfx('magic');
      EventBus.emit('ui:openModal', { modal: 'reforge', reforgeTab: 'shimmer' });
    });
    this.add
      .text(sx, sy - 24, '✨ APSARA SHIMMER SPRING (Click)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f0abfc',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(22);

    // Quick Return Portal Bookmark Button placed cleanly beside Shimmer Spring without label overlap
    const rpBtn = this.add
      .text(362, FLOOR_Y - 10, '🌀 DROP RETURN PORTAL', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#7dd3fc',
        backgroundColor: 'rgba(14, 116, 144, 0.85)',
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    rpBtn.on('pointerdown', () => {
      travelManager.setReturnPortal({
        bossId: this.bossId,
        difficulty: this.difficulty,
        partyMode: this.partyMode,
        createdAt: Date.now(),
      });
      soundManager.playSfx('magic');
      EventBus.emit('ui:toast', {
        text: '🌀 Return Portal linked! Warping to Phum Plaza — click the blue portal by the Pylon Shrine to jump right back!',
      });
      this.returnToOverworld();
    });
  }

  private claimSecretRelicChest(): void {
    if (!this.secretWall.broken || this.secretWall.chestClaimed) return;
    this.secretWall.chestClaimed = true;
    this.secretWall.chestSprite?.destroy();
    this.secretWall.chestLabel?.destroy();

    const bonusCoins = 160;
    const bonusGold = Math.random() < 0.45 ? 2 : 1;
    this.player.state.coins += bonusCoins;
    this.player.state.currencies.coins = this.player.state.coins;
    this.player.state.currencies.gold += bonusGold;

    // Award Mining XP for cracking the secret stone wall!
    const mineRes = awardSkillXp(this.player.state, 'mining', 35, true);
    this.player.state = mineRes.state;
    this.emitPlayerState();

    this.spawnFloatingText(
      this.secretWall.x,
      this.secretWall.y - 24,
      `+${bonusCoins} Coins · +${bonusGold} Gold!`,
      '#fde047',
      '18px'
    );
    EventBus.emit('ui:toast', {
      text: `🏆 Secret Relic Chest looted: +${bonusCoins} Coins & +${bonusGold} Gold (+35 Mining XP)!`,
    });
  }

  // ==================== MYTHIC FOCUS & FURY GAUGES ====================
  private activateFocusBurst(): void {
    if (this.difficulty !== 'mythic' || this.playerDefeated) return;
    const now = this.time.now;
    if (this.focusPct < 100 || now < this.focusActiveUntil) return;
    this.focusPct = 0;
    this.focusActiveUntil = now + 5000;
    this.cameras.main.shake(110, 0.005);
    this.spawnFloatingText(this.player.x, this.player.y - 52, '⚡ FOCUS BURST (+120% DMG)!', '#22d3ee', '18px');
    EventBus.emit('ui:toast', { text: '⚡ MYTHIC FOCUS ACTIVATED! +120% Damage for 5 seconds!' });
    this.broadcastBossHud();
  }

  private activateFuryBurst(): void {
    if (this.difficulty !== 'mythic' || this.playerDefeated) return;
    const now = this.time.now;
    if (this.furyPct < 100 || now < this.furyActiveUntil) return;
    this.furyPct = 0;
    this.furyActiveUntil = now + 7000;
    this.cameras.main.shake(110, 0.005);
    this.spawnFloatingText(this.player.x, this.player.y - 52, '🔥 FURY (+40% SPD / +25% CRIT)!', '#fb7185', '17px');
    EventBus.emit('ui:toast', { text: '🔥 MYTHIC FURY ACTIVATED! +40% Attack Speed & +25% Crit for 7s!' });
    this.broadcastBossHud();
  }

  private clearYantSigils(): void {
    for (const s of this.yantSigils) s.destroy();
    this.yantSigils = [];
  }

  private broadcastClassMeter(): void {
    EventBus.emit('combat:classMeter', {
      classId: this.player.state.activeClass,
      stealthPct: Math.round(this.stealthPct),
      yantStacks: this.yantSigils.length,
      lbokatorStance: this.lbokatorStance,
    });
  }

  private clearTeammates(): void {
    this.teammates.forEach((t) => {
      t.paperDoll.destroy();
      t.pet?.destroy();
      t.nameTag.destroy();
      t.hpBg.destroy();
      t.hpFill.destroy();
    });
    this.teammates.clear();
  }

  private async connectCoopDungeon(): Promise<void> {
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const connected = await roomClient.joinDungeon(
      {
        partyId: this.partyId,
        bossId: this.bossId,
        difficulty: this.difficulty,
        name: this.player.state.name,
        loadout: this.player.state.loadout,
        activeClass: this.player.state.activeClass,
        hp: this.player.state.hp,
        maxHp: bridge.effectiveMaxHp,
      },
      {
        onPartySizeChange: (size, maxHp, hp, phase) => {
          if (!this.scene.isActive('DungeonBossScene')) return;
          this.partySize = size;
          this.bossCtrl.applyCoopBossSync(hp, maxHp, phase);
          this.broadcastBossHud();
        },
        onTeammateAdd: (snap) => this.upsertTeammate(snap),
        onTeammateChange: (snap) => this.upsertTeammate(snap),
        onTeammateRemove: (sessionId) => {
          const t = this.teammates.get(sessionId);
          if (t) {
            t.paperDoll.destroy();
            t.pet?.destroy();
            t.nameTag.destroy();
            t.hpBg.destroy();
            t.hpFill.destroy();
            this.teammates.delete(sessionId);
          }
        },
        onTeammateAttack: ({ classId, x, y, dir }) => {
          if (!this.scene.isActive('DungeonBossScene')) return;
          if (classId === 'tamer') this.vfx.playKramaWhipSnap(x, y, dir);
          else if (classId === 'shadow') this.vfx.playShadowTwinSlash(x, y, dir, false);
          else if (classId === 'archer') this.vfx.playImpactSparks(x + dir * 40, y, 0x4ade80);
          else if (classId === 'mystic') this.vfx.playImpactSparks(x + dir * 40, y, 0xfacc15);
          else this.vfx.playLbokatorSlash(x, y, dir, 1);
        },
        onBossHitRemote: ({ amount, isCrit, hp, maxHp, phase }) => {
          if (!this.scene.isActive('DungeonBossScene')) return;
          this.spawnFloatingText(
            this.bossCtrl.x + (Math.random() - 0.5) * 60,
            this.bossCtrl.y - 120,
            `Ally ${amount}${isCrit ? '!' : ''}`,
            '#93c5fd',
            '15px'
          );
          this.bossCtrl.applyCoopBossSync(hp, maxHp, phase);
          this.broadcastBossHud();
        },
        onBossDefeatedRemote: () => {
          if (!this.scene.isActive('DungeonBossScene')) return;
          if (this.bossCtrl.alive) {
            this.bossCtrl.applyCoopBossSync(0, this.bossCtrl.maxHp, 2);
          }
        },
      }
    );

    if (connected) {
      EventBus.emit('ui:toast', {
        text: `🤝 Joined Co-op Raid (${this.partyId})! Boss HP scales +65% per extra ally.`,
      });
    }
  }

  private upsertTeammate(snap: RemoteDungeonPlayerSnapshot): void {
    if (!this.scene.isActive('DungeonBossScene')) return;
    const existing = this.teammates.get(snap.sessionId);
    if (existing) {
      existing.targetX = snap.x;
      existing.targetY = snap.y;
      existing.facing = snap.facing;
      existing.pose = snap.pose;
      const hpPct = Math.max(0, Math.min(1, snap.hp / Math.max(1, snap.maxHp)));
      existing.hpFill.width = Math.round(38 * hpPct);
      if (snap.appearanceJson !== existing.appearanceJson) {
        existing.appearanceJson = snap.appearanceJson;
        const parsed = parseAppearance(snap.appearanceJson);
        existing.paperDoll.setLoadout(parsed);
        if (!parsed.pet) {
          existing.pet?.destroy();
          existing.pet = null;
        } else if (!existing.pet) {
          const safePrefix = `coop_${snap.sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10)}`;
          existing.pet = new Pet(this, existing.x - 32, existing.y, parsed.pet, 'dungeon', `${safePrefix}_pet`);
        } else {
          existing.pet.setPet(parsed.pet);
        }
      }
      return;
    }

    const loadout = parseAppearance(snap.appearanceJson);
    const safePrefix = `coop_${snap.sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10)}`;
    const paperDoll = new PaperDoll(this, snap.x, snap.y + 20, loadout, `${safePrefix}_pd`);
    paperDoll.setScale(0.92).setDepth(49);
    const pet = loadout.pet
      ? new Pet(this, snap.x - 32, snap.y, loadout.pet, 'dungeon', `${safePrefix}_pet`)
      : null;
    const nameTag = this.add
      .text(snap.x, snap.y + 26, snap.name, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#bae6fd',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(54);
    const hpBg = this.add.rectangle(snap.x, snap.y - 38, 40, 6, 0x0f172a).setDepth(54);
    const hpFill = this.add.rectangle(snap.x - 19, snap.y - 38, 38, 4, 0x22c55e).setOrigin(0, 0.5).setDepth(55);

    this.teammates.set(snap.sessionId, {
      sessionId: snap.sessionId,
      x: snap.x,
      y: snap.y,
      targetX: snap.x,
      targetY: snap.y,
      facing: snap.facing,
      pose: snap.pose,
      appearanceJson: snap.appearanceJson,
      paperDoll,
      pet,
      nameTag,
      hpBg,
      hpFill,
    });
  }

  private broadcastBossHud(): void {
    const now = this.time.now;
    EventBus.emit('boss:hudUpdate', {
      active: this.bossCtrl.alive,
      bossId: this.bossId,
      khmerName: this.bossCtrl.def.khmerName,
      englishName: this.bossCtrl.def.englishName,
      hp: this.bossCtrl.hp,
      maxHp: this.bossCtrl.maxHp,
      phase: this.bossCtrl.phase,
      difficulty: this.difficulty,
      partySize: this.partySize,
      stageLabel: this.bossCtrl.getStageLabel(),
      focusPct: Math.round(this.focusPct),
      focusActive: now < this.focusActiveUntil,
      furyPct: Math.round(this.furyPct),
      furyActive: now < this.furyActiveUntil,
      defenseCracked: now < this.defenseCrackedUntil,
      damageTakenThisFight: this.damageTakenThisFight,
    });
  }

  private emitPlayerState(): void {
    EventBus.emit('player:state', {
      ...this.player.state,
      weapon: { ...this.player.state.weapon },
      loadout: { ...this.player.state.loadout },
      currencies: { ...this.player.state.currencies },
      lifeStats: { ...this.player.state.lifeStats },
      activeBuffs: [...this.player.state.activeBuffs],
      quickSnackSlots: [...this.player.state.quickSnackSlots],
      clearedBosses: [...this.player.state.clearedBosses],
      bossDefeats: { ...(this.player.state.bossDefeats ?? {}) },
    });
  }

  // ==================== PLAYER DAMAGE TAKEN & DEFEAT ====================
  private handlePlayerHit(
    rawBossAttack: number,
    label: string,
    pullDir?: number,
    isPoison = false
  ): void {
    const now = this.time.now;
    if (this.playerDefeated || this.transitioning || now < this.invulnerableUntil || !this.bossCtrl.alive) {
      return;
    }

    // 1. Preah Khan 0.35s Golden Parry Window — Negates ALL damage & charges Reality Rip!
    if (now < this.parryActiveUntil) {
      this.parryActiveUntil = 0;
      this.realityRipCharged = true;
      this.invulnerableUntil = now + 650;
      soundManager.playSfx('level_up');
      this.vfx.playPreahKhanParrySuccess(this.player.x, this.player.y);
      this.spawnFloatingText(this.player.x, this.player.y - 54, '🛡️ PARRY! REALITY RIP CHARGED!', '#fde047', '17px');
      EventBus.emit('ui:toast', { text: '🛡️ PARRIED! Next Preah Khan strike unleashes REALITY RIP!' });
      return;
    }

    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);

    // Naga Scale Set: Orbiting Water Shield blocks 1 hit every 20s!
    if (bridge.hasWaterShield && now >= this.waterShieldReadyAt) {
      this.waterShieldReadyAt = now + 20_000;
      this.invulnerableUntil = now + 900;
      soundManager.playSfx('magic');
      this.spawnFloatingText(this.player.x, this.player.y - 48, '💧 WATER SHIELD BLOCKED HIT!', '#38bdf8', '16px');
      return;
    }

    // Coconut Water / Jade Poison Ward / Sovereign Aegis Anti-Venom Counter
    if (isPoison && bridge.poisonImmune) {
      this.invulnerableUntil = now + 520;
      soundManager.playSfx('magic');
      this.spawnFloatingText(this.player.x, this.player.y - 44, '🟢 POISON IMMUNE!', '#67e8f9', '15px');
      return;
    }
    const wardDef = this.arenaStations.angkorWard ? 6 : 0;
    const totalDefense = bridge.effectiveDefense + wardDef;
    const effectiveDefense =
      now < this.defenseCrackedUntil
        ? Math.max(0, Math.round(totalDefense * 0.75))
        : totalDefense;

    const dmg = calculateDamageTaken({
      bossAttack: rawBossAttack,
      currentDefense: effectiveDefense,
      armorPrefix: this.player.state.armorPrefix,
      rawDR: bridge.rawDRBonus,
      difficulty: this.difficulty,
    });

    this.invulnerableUntil = now + 950;
    this.damageTakenThisFight += dmg;
    this.consecutiveMeleeHits = 0;

    // Mythic rules: taking a hit resets Focus to 0, charges Fury, and cracks Defense for 3s!
    if (this.difficulty === 'mythic') {
      this.focusPct = 0;
      this.focusActiveUntil = 0;
      this.furyPct = Math.min(100, this.furyPct + 26);
      this.defenseCrackedUntil = now + 3000;
    }

    this.player.state.hp = Math.max(0, this.player.state.hp - dmg);
    this.player.paperDoll.flashWhite(150);
    this.cameras.main.shake(120, 0.006);
    soundManager.playSfx('hit');

    if (pullDir) {
      this.player.body.setVelocityX(pullDir * 310);
      this.player.body.setVelocityY(-180);
    } else {
      const knock = this.player.x < this.bossCtrl.x ? -1 : 1;
      this.player.body.setVelocityX(knock * 220);
      this.player.body.setVelocityY(-190);
    }

    this.spawnFloatingText(this.player.x, this.player.y - 38, `-${dmg} (${label})`, '#f87171', '15px');

    // Vitality -> Cheat Death talent (once per boss fight survive lethal hit at 15% HP!)
    if (
      this.player.state.hp <= 0 &&
      !this.cheatDeathUsed &&
      hasTalent(this.player.state.skills, 'vitality', 'vit_cheat_death')
    ) {
      this.cheatDeathUsed = true;
      this.player.state.hp = Math.max(15, Math.round(bridge.effectiveMaxHp * 0.15));
      this.invulnerableUntil = now + 1800;
      this.spawnFloatingText(this.player.x, this.player.y - 62, 'CHEAT DEATH SAVED YOU!', '#fde047', '17px');
      EventBus.emit('ui:toast', { text: '❤️ Vitality Cheat Death triggered — survived at 15% HP!' });
    }

    this.emitPlayerState();
    this.broadcastBossHud();

    if (this.player.state.hp <= 0) {
      this.playerDefeated = true;
      this.player.body.setVelocity(0, 0);
      this.bossCtrl.clearHazards();
      EventBus.emit('dungeon:outcome', {
        outcome: 'defeat',
        bossId: this.bossId,
        bossName: `${this.bossCtrl.def.khmerName} (${this.bossCtrl.def.englishName})`,
        difficulty: this.difficulty,
        noHit: false,
        easterEggUnlocked: false,
        coins: 0,
        gold: 0,
        lootLabels: [],
      });
    }
  }

  // ==================== PLAYER CONTROLS & 5-CLASS COMBAT ====================
  private performJump(): void {
    if (this.transitioning || this.playerDefeated) return;
    if (this.grappleActive) {
      this.grappleActive = false;
      this.grappleGraphics.clear();
    }
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const jumpMult = 1 + bridge.jumpPowerBonusPct;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) {
      this.jumpsUsed = 1;
      this.player.body.setVelocityY(-495 * jumpMult);
    } else if (this.jumpsUsed < 2) {
      this.jumpsUsed = 2;
      const lotusBoost = bridge.hasDoubleJump ? 1.1 : 1;
      this.player.body.setVelocityY(-460 * jumpMult * lotusBoost);
      if (bridge.hasDoubleJump) {
        this.spawnLotusPetalBurst(this.player.x, this.player.y + 12);
        this.spawnFloatingText(this.player.x, this.player.y - 28, '🌸 Lotus Double-Jump!', '#f472b6', '13px');
      } else {
        this.spawnFloatingText(this.player.x, this.player.y - 26, 'Double Jump!', '#38bdf8', '13px');
      }
    }
  }

  private spawnLotusPetalBurst(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const petal = this.add
        .ellipse(x, y, 8, 4, i % 2 === 0 ? 0xf472b6 : 0xfce7f3, 0.95)
        .setRotation(angle)
        .setDepth(60);
      this.tweens.add({
        targets: petal,
        x: x + Math.cos(angle) * 38,
        y: y + Math.sin(angle) * 20 + 10,
        alpha: 0,
        scale: 0.4,
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => petal.destroy(),
      });
    }
  }

  private performBambooGrapple(): void {
    const now = this.time.now;
    if (now < this.grappleCooldownUntil || this.transitioning || this.playerDefeated) return;
    const px = this.player.x;
    const py = this.player.y;
    const dir = this.player.facingRight ? 1 : -1;

    let best: { x: number; y: number; w: number } | null = null;
    let bestScore = Infinity;
    for (const p of this.arenaPlatforms) {
      const anchorX = Phaser.Math.Clamp(px + dir * 48, p.x - p.w / 2 + 18, p.x + p.w / 2 - 18);
      const anchorY = p.y - 10;
      const dy = py - anchorY;
      const dist = Phaser.Math.Distance.Between(px, py, anchorX, anchorY);
      if (dy < 36 || dist > 380) continue;
      const score = dist * (Math.sign(anchorX - px) === dir ? 0.72 : 1.05);
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (!best) {
      this.spawnFloatingText(px, py - 34, '🌿 No overhead ledge in Grapple range!', '#86efac', '11px');
      return;
    }

    this.grappleActive = true;
    this.grappleTargetX = Phaser.Math.Clamp(px + dir * 40, best.x - best.w / 2 + 24, best.x + best.w / 2 - 24);
    this.grappleTargetY = best.y - 34;
    this.grappleEndAt = now + 380;
    this.grappleCooldownUntil = now + 1150;
    this.jumpsUsed = 1;
    soundManager.playSfx('swing');
    this.spawnFloatingText(px, py - 34, '🌿 Bamboo Vine Grapple!', '#4ade80', '13px');
  }

  private triggerGroundSlamShockwave(): void {
    soundManager.playSfx('hit');
    this.cameras.main.shake(140, 0.007);
    const ring = this.add
      .circle(this.player.x, this.player.y + 18, 16, 0xf59e0b, 0.28)
      .setStrokeStyle(4, 0xfde047, 0.95)
      .setDepth(58);
    this.tweens.add({
      targets: ring,
      scaleX: 7.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
    this.spawnFloatingText(this.player.x, this.player.y - 38, '🪨 YAKSHA GROUND-SLAM!', '#fbbf24', '14px');
    if (this.bossCtrl.alive && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossCtrl.x, this.bossCtrl.y) < 240) {
      this.damageBoss(this.player.facingRight ? 1 : -1, { bonusMult: 1.15, tag: 'Ground-Slam' });
    }
  }

  private performClassDash(): void {
    const now = this.time.now;
    if (now < this.dashCooldownUntil || this.transitioning || this.playerDefeated) return;

    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const cls = this.player.state.activeClass;
    const dir = this.player.facingRight ? 1 : -1;
    this.dashCooldownUntil = now + Math.round(920 * bridge.dashCooldownMult);
    this.dashActiveUntil = now + 200;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 420);

    if (cls === 'archer') {
      this.player.body.setVelocityX(-dir * 420);
      this.player.body.setVelocityY(-280);
      this.projectiles.push(this.vfx.spawnArcherArrow(this.player.x, this.player.y - 8, dir, 1.15));
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Backflip Shot!', '#4ade80', '14px');
    } else if (cls === 'mystic') {
      const fromX = this.player.x;
      const fromY = this.player.y;
      const toX = Phaser.Math.Clamp(fromX + dir * 165, 60, ARENA_W - 60);
      this.player.sprite.setPosition(toX, fromY - 6);
      this.vfx.playMysticLotusBlink(fromX, fromY, toX, fromY - 6);
      this.spawnFloatingText(toX, fromY - 36, 'Lotus Blink!', '#facc15', '14px');
    } else if (cls === 'shadow') {
      this.vfx.playShadowDecoyDash(this.player.x, this.player.y);
      this.player.body.setVelocityX(dir * 690);
      this.player.body.setVelocityY(-40);
      this.stealthPct = Math.min(100, this.stealthPct + 35);
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Smoke Vanish!', '#c084fc', '14px');
      this.broadcastClassMeter();
    } else if (cls === 'tamer') {
      this.player.body.setVelocityX(dir * 610);
      this.player.body.setVelocityY(-45);
      this.player.paperDoll.setAlpha(0.5);
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Spirit Phase!', '#34d399', '14px');
    } else {
      this.player.body.setVelocityX(dir * 640);
      this.player.body.setVelocityY(-45);
      this.vfx.playLbokatorDashDust(this.player.x, this.player.y);
      this.player.paperDoll.flashWhite(120);
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Roll Dash!', '#facc15', '14px');
    }
  }

  /**
   * Secondary Khmer Mythic Arsenal Action (Right-Click / [Q] / Touch Secondary Button):
   * - Preah Khan of the 8 Biomes: Raises 0.35s golden Parry Guard -> negates damage & charges Reality Rip!
   * - Crossbow of the Golden Riel: Flicks spinning Gold Coin in an arc (up to 3 airborne coins!).
   */
  private performSecondaryWeaponAction(): void {
    const now = this.time.now;
    if (this.transitioning || this.playerDefeated) return;
    const weaponId = this.player.state.weapon.id;
    const dir = this.player.facingRight ? 1 : -1;

    if (weaponId === 'weapon_preah_khan') {
      if (now < this.parryCooldownUntil) return;
      this.parryActiveUntil = now + 350;
      this.parryCooldownUntil = now + 1050;
      soundManager.playSfx('magic');
      this.player.triggerSquash(0.92, 1.08);
      this.vfx.playPreahKhanParryGuard(this.player.x, this.player.y, dir);
      this.spawnFloatingText(this.player.x, this.player.y - 40, '🛡️ PARRY GUARD', '#fde047', '13px');
      return;
    }

    if (weaponId === 'weapon_golden_riel_shot') {
      if (this.tossedCoins.length >= 3) {
        EventBus.emit('ui:toast', { text: '🪙 Max 3 Golden Riel Coins in the air — SHOOT them now!' });
        return;
      }
      soundManager.playSfx('coin');
      const coin = this.vfx.spawnTossedGoldCoin(this.player.x, this.player.y, dir);
      this.tossedCoins.push(coin);
      this.spawnFloatingText(
        this.player.x + dir * 18,
        this.player.y - 42,
        `🪙 COIN ×${this.tossedCoins.length}`,
        '#facc15',
        '13px'
      );
      return;
    }

    EventBus.emit('ui:toast', {
      text: 'Tip: Right-Click / [Q] triggers Parry (Preah Khan) or Coin Toss (Golden Riel Crossbow)!',
    });
  }

  /**
   * Triggers Golden Riel Coin Trick-Shot chain across all airborne coins straight into the boss!
   */
  private triggerGoldenRielCoinChain(dir: number): boolean {
    if (this.tossedCoins.length === 0 || !this.bossCtrl.alive) return false;
    const count = this.tossedCoins.length;
    const chainPoints: Array<{ x: number; y: number }> = [
      { x: this.player.x + dir * 18, y: this.player.y - 10 },
    ];
    for (const c of this.tossedCoins) {
      chainPoints.push({ x: c.node.x, y: c.node.y });
      c.node.destroy();
    }
    this.tossedCoins = [];
    chainPoints.push({ x: this.bossCtrl.x, y: this.bossCtrl.y - 84 });

    soundManager.playSfx('crit');
    soundManager.playSfx('coin');
    this.vfx.playCoinRicochetLightning(chainPoints);
    const mult = count >= 3 ? 3.4 : count === 2 ? 2.6 : 1.9;
    this.damageBoss(dir, {
      bonusMult: mult,
      guaranteedCrit: true,
      tag: count >= 2 ? `⚡ ${count}× COIN SUPER-CRIT!` : '⚡ COIN TRICK-SHOT!',
    });
    return true;
  }

  private performClassAttack(): void {
    const now = this.time.now;
    if (now < this.attackCooldownUntil || this.transitioning || this.playerDefeated) return;

    const weapon = this.player.state.weapon;
    const cls = this.player.state.activeClass;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const furySpeedMult = now < this.furyActiveUntil ? 1.4 : 1;
    const cooldownMs = Math.round(weapon.attackCooldownMs / Math.max(0.5, bridge.castSpeedMult * furySpeedMult));
    this.attackCooldownUntil = now + cooldownMs;
    this.attackAnimUntil = now + 185;
    this.lastAttackAt = now;
    this.player.triggerSquash(1.12, 0.92);

    const dir = this.player.facingRight ? 1 : -1;
    if (roomClient.isInCoopDungeon) {
      roomClient.sendDungeonAttack(cls, this.player.x, this.player.y, dir);
    }

    if (cls === 'archer') {
      if (weapon.id === 'weapon_golden_riel_shot') {
        // If player flicked Gold Coin(s) mid-air, shooting triggers guaranteed 100% Super-Crit lightning chain!
        if (this.triggerGoldenRielCoinChain(dir)) {
          return;
        }
        soundManager.playSfx('coin');
        this.projectiles.push(this.vfx.spawnGoldenRielCoin(this.player.x, this.player.y, dir, 1.05, 2));
      } else {
        soundManager.playSfx('arrow');
        this.projectiles.push(this.vfx.spawnArcherArrow(this.player.x, this.player.y, dir, 1));
      }
      return;
    }

    if (cls === 'mystic') {
      soundManager.playSfx('magic');
      this.projectiles.push(this.vfx.spawnMysticOrb(this.player.x, this.player.y, dir));
      return;
    }

    if (cls === 'tamer') {
      if (weapon.id === 'weapon_hanuman_banner') {
        soundManager.playSfx('magic');
        const targetX = this.bossCtrl.alive ? this.bossCtrl.x : this.player.x + dir * 240;
        const targetY = this.bossCtrl.alive ? this.bossCtrl.y - 84 : this.player.y - 10;
        this.vfx.playHanumanSpiritFormation(this.player.x, this.player.y - 12, targetX, targetY, (idx) => {
          if (this.bossCtrl.alive) {
            this.damageBoss(dir, {
              bonusMult: 0.56 * (1 + bridge.petDamageBonusPct),
              tag: idx === 1 ? '🐒 HANUMAN FORMATION!' : undefined,
            });
          }
        });
        return;
      }
      soundManager.playSfx('krama');
      this.vfx.playKramaWhipSnap(this.player.x, this.player.y, dir);
      const whipBox = new Phaser.Geom.Rectangle(this.player.x + (dir > 0 ? 0 : -118), this.player.y - 44, 118, 88);
      this.checkMeleeBoxHits(whipBox, dir, { bonusMult: 1, tag: 'Krama Mark!' });
      if (this.bossCtrl.alive) {
        const onSpiritHit = () => {
          if (this.bossCtrl.alive) {
            this.damageBoss(dir, {
              bonusMult: 0.72 * (1 + bridge.petDamageBonusPct),
              tag: this.player.state.loadout.pet ? 'Spirit Bolt' : 'Summoned Spirit!',
            });
          }
        };
        if (this.player.pet) {
          this.player.pet.trySpiritAutoAttack(
            now,
            this.bossCtrl.x,
            this.bossCtrl.y - 90,
            onSpiritHit,
            true,
            bridge.petAttackSpeedMult,
            true
          );
        } else {
          summonTemporaryCombatSpirit(
            this,
            this.player.x,
            this.player.y,
            this.player.facingRight,
            this.bossCtrl.x,
            this.bossCtrl.y - 90,
            onSpiritHit
          );
        }
      }
      return;
    }

    if (cls === 'shadow') {
      const isShadowStrike = this.stealthPct >= 100;
      this.stealthPct = 0;
      this.player.paperDoll.setStealthTint(false);
      this.broadcastClassMeter();

      soundManager.playSfx('swing');
      const isFrostFang = weapon.id === 'weapon_frost_fang_singha';
      if (isShadowStrike && isFrostFang) {
        this.vfx.playFrostFangStealthSlice(this.player.x, this.player.y, dir);
      } else if (isShadowStrike && weapon.id === 'weapon_reality_rip_blade') {
        this.vfx.playParryRealityRip(this.player.x + dir * 80, this.player.y - 12);
      } else {
        this.vfx.playShadowTwinSlash(this.player.x, this.player.y, dir, isShadowStrike);
      }
      const rangeScale = bridge.weaponSizeMult;
      const slashW = Math.round((isFrostFang ? 94 : 104) * rangeScale);
      const slashBox = new Phaser.Geom.Rectangle(this.player.x + dir * 44 - slashW / 2, this.player.y - 46, slashW, 92);
      this.checkMeleeBoxHits(slashBox, dir, {
        bonusMult: isShadowStrike ? (weapon.id === 'weapon_reality_rip_blade' ? 1.9 : 1.55) : 1,
        guaranteedCrit: isShadowStrike,
        frostTruePctHp: isShadowStrike && isFrostFang ? 0.03 : 0,
        tag: isShadowStrike
          ? isFrostFang
            ? '❄️ SINGHA 3% HP SLICE!'
            : weapon.id === 'weapon_reality_rip_blade'
            ? 'REALITY RIP!'
            : 'SHADOW STRIKE!'
          : undefined,
      });
      return;
    }

    // Lbokator Warrior 3-Hit Animal-Stance Combo (Preah Khan Parry Reality-Rip, Evolving Blade of Angkor, Golden Pan!)
    const stance = this.lbokatorStance;
    const isPreahKhan = weapon.id === 'weapon_preah_khan';
    const isEvolvingBlade = weapon.id === 'weapon_evolving_angkor_blade';
    const uniqueClears = getUniqueBossClearsCount(this.player.state);

    // Preah Khan charged Reality Rip counter-slash!
    if (isPreahKhan && this.realityRipCharged) {
      this.realityRipCharged = false;
      soundManager.playSfx('crit');
      const ripX = this.bossCtrl.alive ? this.bossCtrl.x : this.player.x + dir * 130;
      const ripY = this.bossCtrl.alive ? this.bossCtrl.y - 80 : this.player.y - 14;
      this.vfx.playParryRealityRip(ripX, ripY);
      if (this.bossCtrl.alive) {
        this.damageBoss(dir, {
          bonusMult: 2.8,
          guaranteedCrit: true,
          extraArmorPen: 12,
          tag: '⚡ REALITY RIP!',
        });
      }
      return;
    }

    soundManager.playSfx('swing');
    const preahBonus = isPreahKhan ? getPreahKhanBiomeBonus(this.player.state.activeBiome) : null;
    const sizeMult = bridge.weaponSizeMult * (isEvolvingBlade ? 1 + Math.min(0.6, uniqueClears * 0.1) : 1);

    if (isPreahKhan && preahBonus) {
      this.vfx.playPreahKhanBiomeSlash(this.player.x, this.player.y, dir, preahBonus.colorHex);
    } else {
      this.vfx.playLbokatorSlash(this.player.x, this.player.y, dir, stance);
    }

    // Evolving Blade of Angkor fires golden Yant wave projectile once >= 1 Boss is defeated!
    if (isEvolvingBlade) {
      this.projectiles.push(
        this.vfx.spawnEvolvingYantWave(this.player.x, this.player.y, dir, 1 + uniqueClears * 0.1)
      );
    }

    const boxW = Math.round(108 * sizeMult);
    const boxH = Math.round(96 * sizeMult);
    const swingBox = new Phaser.Geom.Rectangle(this.player.x + dir * 50 - boxW / 2, this.player.y - boxH / 2, boxW, boxH);
    const isGoldenPan = weapon.id === 'weapon_golden_pan';
    const stanceLabel = isGoldenPan
      ? 'BONK!'
      : isEvolvingBlade && uniqueClears > 0
      ? `ANGKOR LV.${uniqueClears}`
      : isPreahKhan && preahBonus
      ? `${preahBonus.elementName.toUpperCase()}!`
      : stance === 3
      ? 'HANUMAN SLAM!'
      : stance === 2
      ? 'CROCODILE PIERCE'
      : undefined;
    this.checkMeleeBoxHits(swingBox, dir, {
      bonusMult: (stance === 3 ? 1.35 : 1) * (1 + (preahBonus?.bonusDmgPct ?? 0)),
      extraArmorPen: (stance === 2 ? 6 : 0) + (preahBonus?.passiveKind === 'armor_shred' ? 10 : 0),
      preahPassive: preahBonus?.passiveKind,
      tag: stanceLabel,
    });
    this.lbokatorStance = stance >= 3 ? 1 : stance + 1;
    this.broadcastClassMeter();
  }

  private checkMeleeBoxHits(
    box: Phaser.Geom.Rectangle,
    dir: number,
    opts: {
      bonusMult?: number;
      guaranteedCrit?: boolean;
      extraArmorPen?: number;
      frostTruePctHp?: number;
      preahPassive?: 'healing_wind' | 'explosive_fire' | 'armor_shred' | 'celestial';
      tag?: string;
    }
  ): void {
    // 1. Check Cracked Secret Wall
    if (!this.secretWall.broken) {
      const wallBounds = this.secretWall.wallRect.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, wallBounds)) {
        this.damageSecretWall();
      }
    }

    // 2. Check Killable Boss Mini-Mobs (King Frog Tadpoles)
    for (const h of this.bossCtrl.hazards) {
      if (h.kind === 'tadpole' && h.alive) {
        const hBox = new Phaser.Geom.Rectangle(h.x - 18, h.y - 18, 36, 36);
        if (Phaser.Geom.Intersects.RectangleToRectangle(box, hBox)) {
          this.damageTadpole(h, 65);
        }
      }
    }

    // 3. Check Boss (Head OR any of Neak Reach's 10 serpent body segments!)
    if (this.bossCtrl.alive && this.bossCtrl.intersectsHitbox(box)) {
      this.damageBoss(dir, opts);
    }
  }

  private damageTadpole(h: (typeof this.bossCtrl.hazards)[number], dmg: number): void {
    h.hp = (h.hp ?? 100) - dmg;
    this.spawnFloatingText(h.x, h.y - 16, `${dmg}`, '#86efac', '13px');
    if (h.hp <= 0) {
      h.alive = false;
      h.sprite.destroy();
      this.furyPct = Math.min(100, this.furyPct + 12);
      this.spawnFloatingText(h.x, h.y - 26, 'Tadpole KO!', '#fde047', '14px');
    }
  }

  private damageBoss(
    knockDir: number,
    opts: {
      bonusMult?: number;
      guaranteedCrit?: boolean;
      extraArmorPen?: number;
      frostTruePctHp?: number;
      preahPassive?: 'healing_wind' | 'explosive_fire' | 'armor_shred' | 'celestial';
      tag?: string;
    } = {}
  ): void {
    if (!this.bossCtrl.alive) return;
    if (this.player.state.activeClass === 'lbokator') {
      this.consecutiveMeleeHits = Math.min(10, this.consecutiveMeleeHits + 1);
    }

    const now = this.time.now;
    const { weapon, armorDamagePct } = this.player.state;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const focusActive = now < this.focusActiveUntil;
    const furyActive = now < this.furyActiveUntil;
    const isEvolving =
      weapon.id === 'weapon_evolving_angkor_blade' ||
      weapon.id === 'weapon_evolving_angkor_relic' ||
      KHMER_ARSENAL_WEAPONS[weapon.id]?.specialKind === 'evolving_angkor_blade';
    const evolvingClears = isEvolving ? getUniqueBossClearsCount(this.player.state) : 0;

    // Pass weaponPrefix, armorPrefix & evolvingBossClears directly into @shared/balanceFormulas.ts!
    const hit = calculatePlayerDamage({
      weaponBase: weapon.baseDamage * (opts.bonusMult ?? 1),
      upgradeLevel: weapon.upgradeLevel,
      flatBonuses: bridge.flatDamageBonus,
      skillPct: bridge.classSkillDamagePct,
      armorPct: armorDamagePct + bridge.armorDamagePctBonus,
      snackBuffPct: bridge.snackAttackPct,
      weaponPrefix: this.player.state.weaponPrefix,
      armorPrefix: this.player.state.armorPrefix,
      evolvingBossClears: evolvingClears,
      enemyDefense: this.bossCtrl.def.defense,
      armorPen: weapon.armorPen + (opts.extraArmorPen ?? 0),
      bossDR: this.bossCtrl.def.bossDR,
      critChance: Math.min(0.95, bridge.effectiveCritChance + (furyActive ? 0.25 : 0)),
      critMultiplier: bridge.critMultiplier,
      isCritOverride: opts.guaranteedCrit ? true : undefined,
      focusActive,
    });

    let totalDamage = hit.finalDamage;

    // Frost Fang of Singha Stealth Strike: flat 3% of boss's remaining HP ignoring armor (capped fairly at 450)!
    if (opts.frostTruePctHp && opts.frostTruePctHp > 0) {
      const trueSlice = Math.min(450, Math.max(20, Math.round(this.bossCtrl.hp * opts.frostTruePctHp)));
      totalDamage += trueSlice;
      this.spawnFloatingText(
        this.bossCtrl.x,
        this.bossCtrl.y - 178,
        `❄️ TRUE ICE +${trueSlice}`,
        '#38bdf8',
        '16px'
      );
    }

    // Preah Khan Biome Passives (Healing Wind +4 HP, Explosive Fire sparks)
    if (opts.preahPassive === 'healing_wind') {
      this.player.state.hp = Math.min(bridge.effectiveMaxHp, this.player.state.hp + 4);
      this.spawnFloatingText(this.player.x, this.player.y - 46, '+4 HP 🍃', '#4ade80', '13px');
    } else if (opts.preahPassive === 'explosive_fire') {
      this.vfx.playImpactSparks(this.bossCtrl.x, this.bossCtrl.y - 80, 0xf97316);
    }

    // Cross-world Farming -> Botanical Venom poison proc
    if (bridge.botanicalVenomChance > 0 && Math.random() < bridge.botanicalVenomChance) {
      const venomDmg = Math.max(5, Math.round(hit.finalDamage * bridge.botanicalVenomPowerPct));
      totalDamage += venomDmg;
      this.spawnFloatingText(
        this.bossCtrl.x + (Math.random() - 0.5) * 44,
        this.bossCtrl.y - 168,
        `☠ VENOM +${venomDmg}`,
        '#4ade80',
        '14px'
      );
    }

    // Melee Seething Blade & Elixir of the Naga (+10% Lifesteal) healing
    if (bridge.seethingLifestealChance > 0 && Math.random() < bridge.seethingLifestealChance) {
      const heal = Math.max(3, Math.round(bridge.effectiveMaxHp * 0.03));
      this.player.state.hp = Math.min(bridge.effectiveMaxHp, this.player.state.hp + heal);
      this.spawnFloatingText(this.player.x, this.player.y - 44, `+${heal} HP`, '#34d399', '13px');
    }
    if (bridge.snackLifestealPct > 0) {
      const nagaHeal = Math.max(2, Math.min(28, Math.round(totalDamage * bridge.snackLifestealPct)));
      if (this.player.state.hp < bridge.effectiveMaxHp) {
        this.player.state.hp = Math.min(bridge.effectiveMaxHp, this.player.state.hp + nagaHeal);
        this.spawnFloatingText(this.player.x + 12, this.player.y - 52, `+${nagaHeal} 🧪`, '#22d3ee', '12px');
      }
    }

    // Live Combat Class Skill XP
    const combatSkillId = CLASS_TO_COMBAT_SKILL[this.player.state.activeClass];
    const skillRes = awardSkillXp(this.player.state, combatSkillId, hit.isCrit ? 14 : 9, true);
    this.player.state = skillRes.state;
    if (skillRes.leveledUp) {
      soundManager.playSfx('level_up');
    }

    const isGoldenPan = weapon.id === 'weapon_golden_pan';
    if (isGoldenPan) {
      soundManager.playSfx('bonk');
    } else if (hit.isCrit || focusActive) {
      soundManager.playSfx('crit');
    } else {
      soundManager.playSfx('hit');
    }
    const label = isGoldenPan
      ? `BONK! ${hit.finalDamage}${hit.isCrit ? '!' : ''}`
      : opts.tag
      ? `${opts.tag} ${hit.finalDamage}${hit.isCrit ? '!' : ''}`
      : hit.isCrit
      ? `${hit.finalDamage}! CRIT`
      : `${hit.finalDamage}`;

    this.spawnFloatingText(
      this.bossCtrl.x + (Math.random() - 0.5) * 62,
      this.bossCtrl.y - 140,
      label,
      isGoldenPan
        ? '#fde047'
        : focusActive
        ? '#22d3ee'
        : opts.guaranteedCrit
        ? '#e879f9'
        : hit.isCrit
        ? '#facc15'
        : '#ffffff',
      isGoldenPan || hit.isCrit || opts.tag ? '22px' : '16px'
    );

    if (hit.isCrit || focusActive) {
      this.cameras.main.shake(95, 0.0055);
      this.physics.world.pause();
      window.setTimeout(() => {
        if (this.scene.isActive('DungeonBossScene')) {
          this.physics.world.resume();
        }
      }, 40);
    }

    if (roomClient.isInCoopDungeon) {
      roomClient.sendDungeonBossDamage(totalDamage, hit.isCrit || focusActive);
    }
    this.bossCtrl.takeDamage(totalDamage, knockDir, hit.isCrit || focusActive);
    this.emitPlayerState();
    this.broadcastBossHud();
    EventBus.emit('combat:hit', { hit, dummyHp: this.bossCtrl.hp, dummyMaxHp: this.bossCtrl.maxHp });
  }

  private addMysticYantStack(dir: number): void {
    if (!this.bossCtrl.alive) return;
    const sigil = this.vfx.createFloatingYantSigil(this.bossCtrl.x, this.bossCtrl.y, this.yantSigils.length);
    this.yantSigils.push(sigil);

    if (this.yantSigils.length >= 3) {
      this.clearYantSigils();
      if (this.player.state.weapon.id === 'weapon_celestial_yant_tome') {
        this.vfx.playOffscreenYantBeams(this.bossCtrl.x, FLOOR_Y);
        this.damageBoss(dir, { bonusMult: 2.6, guaranteedCrit: true, tag: 'CELESTIAL YANT BEAMS!' });
      } else {
        this.vfx.playYantDetonationBeam(this.bossCtrl.x, FLOOR_Y);
        this.damageBoss(dir, { bonusMult: 2.2, guaranteedCrit: true, tag: 'YANT DETONATION!' });
      }
    }
    this.broadcastClassMeter();
  }

  // ==================== BOSS DEFEAT, TREASURE BAG & NO-HIT EASTER EGG ====================
  private handleBossDefeated(): void {
    this.clearYantSigils();
    const def = this.bossCtrl.def;
    const isFirstClear = !this.player.state.clearedBosses.includes(def.id);
    const noHitKill = this.damageTakenThisFight === 0;
    const rolled = rollBossLoot(def.id, this.difficulty, isFirstClear, noHitKill);

    if (isFirstClear) {
      this.player.state.clearedBosses = [...this.player.state.clearedBosses, def.id];
    }
    const prevKills = this.player.state.bossDefeats?.[def.id] ?? 0;
    this.player.state.bossDefeats = {
      ...(this.player.state.bossDefeats ?? {}),
      [def.id]: prevKills + 1,
    };

    // Immediate Vitality & Character XP
    this.player.state.xp += def.charXp;
    const vitRes = awardSkillXp(this.player.state, 'vitality', def.vitalityXp, true);
    this.player.state = vitRes.state;
    while (this.player.state.xp >= getXpForNextLevel(this.player.state.level)) {
      this.player.state.xp -= getXpForNextLevel(this.player.state.level);
      this.player.state.level += 1;
      this.player.state.maxHp += 15;
      const nb = computeVillageToDungeonBridge(this.player.state);
      this.player.state.hp = nb.effectiveMaxHp;
    }
    soundManager.playSfx('victory');
    this.emitPlayerState();
    this.broadcastBossHud();

    // Spawn Clickable / Walk-Over Boss Treasure Bag or Loot Chest
    const bagX = Phaser.Math.Clamp(this.bossCtrl.x, 380, ARENA_W - 220);
    const bagY = FLOOR_Y - 26;
    const glow = this.add
      .circle(bagX, bagY, 34, rolled.easterEggUnlocked ? 0xfacc15 : 0xa855f7, 0.32)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(44);
    const bagSprite = this.add
      .image(bagX, bagY, rolled.isTreasureBag ? 'boss_treasure_bag' : 'lf_chest')
      .setScale(rolled.isTreasureBag ? 1.55 : 1.75)
      .setDepth(45)
      .setInteractive({ useHandCursor: true });
    bagSprite.on('pointerdown', () => this.claimBossLootBag());

    this.tweens.add({
      targets: [bagSprite, glow],
      y: bagY - 10,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const bagLabel = this.add
      .text(
        bagX,
        bagY - 40,
        rolled.isTreasureBag ? '★ BOSS TREASURE BAG (Walk / Click)' : 'BOSS LOOT CHEST (Walk / Click)',
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fde047',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: { x: 8, y: 3 },
        }
      )
      .setOrigin(0.5)
      .setDepth(48);

    this.lootBag = {
      x: bagX,
      y: bagY,
      sprite: bagSprite,
      glow,
      label: bagLabel,
      rolled,
      claimed: false,
    };

    if (rolled.easterEggUnlocked) {
      EventBus.emit('ui:toast', {
        text: '🏆 EASTER EGG UNLOCKED! No-Hit King Frog → The Golden Frying Pan is inside the Boss Loot!',
      });
    } else {
      EventBus.emit('ui:toast', {
        text: `🎉 ${def.khmerName} VANQUISHED! Walk over or click the ${rolled.isTreasureBag ? 'Boss Treasure Bag' : 'Loot Chest'}!`,
      });
    }
  }

  private addItemToInventory(
    inv: InventoryItem[],
    itemId: string,
    qty: number,
    isEquipment?: boolean
  ): { nextInv: InventoryItem[]; duplicateBonusCoins: number } {
    const next = inv.map((i) => ({ ...i }));
    const existing = next.find((i) => i.itemId === itemId);
    if (isEquipment && existing) {
      return { nextInv: next, duplicateBonusCoins: 180 };
    }
    if (existing) {
      existing.quantity += qty;
    } else {
      next.push({ itemId, quantity: qty, itemLevel: 1, quality: 'normal' });
    }
    return { nextInv: next, duplicateBonusCoins: 0 };
  }

  private claimBossLootBag(): void {
    if (!this.lootBag || this.lootBag.claimed) return;
    this.lootBag.claimed = true;
    const { rolled, x, y } = this.lootBag;
    this.lootBag.sprite.destroy();
    this.lootBag.glow.destroy();
    this.lootBag.label.destroy();

    let extraDupCoins = 0;
    let nextInv = this.player.state.inventory;
    const lootLabels: string[] = [];

    for (const item of rolled.items) {
      const res = this.addItemToInventory(nextInv, item.itemId, item.quantity, item.isEquipment);
      nextInv = res.nextInv;
      extraDupCoins += res.duplicateBonusCoins;
      lootLabels.push(
        res.duplicateBonusCoins > 0
          ? `${item.label} (Owned → +${res.duplicateBonusCoins}c)`
          : `${item.quantity > 1 ? `${item.quantity}× ` : ''}${item.label}`
      );
    }

    // Update 1.3A Combat Armor Set Boss Drops (Yeak Thmor -> Stone Set, Neak Reach -> Naga Scale Set)
    if (this.bossId === 'yeak_thmor') {
      const armorRes = this.addItemToInventory(nextInv, 'armor_yeak_thmor_stone', 1, true);
      nextInv = armorRes.nextInv;
      if (armorRes.duplicateBonusCoins === 0) {
        lootLabels.push('🛡️ Yeak Thmor Stone Set (Combat Armor)');
      }
    } else if (this.bossId === 'neak_reach') {
      const armorRes = this.addItemToInventory(nextInv, 'armor_naga_scale', 1, true);
      nextInv = armorRes.nextInv;
      if (armorRes.duplicateBonusCoins === 0) {
        lootLabels.push('🛡️ Naga Scale Set (Combat Armor)');
      }
    }

    // Update 1.6 Guaranteed Boss Essence drop for Spirit-Infused Farming!
    const essenceDrop =
      this.bossId === 'sdech_kongkaeb'
        ? { id: 'essence_slime', label: '✨ Slime Essence' }
        : this.bossId === 'yeak_thmor'
        ? { id: 'essence_stone', label: '✨ Stone Essence' }
        : { id: 'essence_naga', label: '✨ Naga Essence' };
    nextInv = this.addItemToInventory(nextInv, essenceDrop.id, 1, false).nextInv;
    lootLabels.push(essenceDrop.label);

    const totalCoins = rolled.coins + extraDupCoins;
    soundManager.playSfx('coin');
    this.player.state.inventory = nextInv;
    this.player.state.coins += totalCoins;
    this.player.state.currencies.coins = this.player.state.coins;
    this.player.state.currencies.gold += rolled.gold;
    this.emitPlayerState();

    this.spawnFloatingText(
      x,
      y - 34,
      `+${totalCoins} Coins${rolled.gold > 0 ? ` · +${rolled.gold} Gold` : ''}`,
      '#fde047',
      '18px'
    );

    EventBus.emit('ticker:push', {
      text: `⚔️ ${this.player.state.name} just defeated ${this.bossCtrl.def.englishName} on ${this.difficulty.toUpperCase()} Mode!`,
      category: 'boss',
    });

    EventBus.emit('dungeon:outcome', {
      outcome: 'victory',
      bossId: this.bossId,
      bossName: `${this.bossCtrl.def.khmerName} (${this.bossCtrl.def.englishName})`,
      difficulty: this.difficulty,
      noHit: this.damageTakenThisFight === 0,
      easterEggUnlocked: rolled.easterEggUnlocked,
      coins: totalCoins,
      gold: rolled.gold,
      lootLabels,
    });
  }

  private restartCurrentBoss(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    this.scene.restart({
      bossId: this.bossId,
      difficulty: this.difficulty,
      playerState: {
        ...this.player.state,
        hp: bridge.effectiveMaxHp,
      },
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, fontSize: string): void {
    const txt = this.add
      .text(x, y, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize,
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: txt,
      y: y - 44,
      alpha: 0,
      duration: 760,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private isNearExitPortal(): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_PORTAL_X, EXIT_PORTAL_Y) < 105;
  }

  private returnToOverworld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    EventBus.emit('dungeon:outcome', null);

    // Restore HP cleanly on defeat or safe return
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const restoredHp = this.playerDefeated ? bridge.effectiveMaxHp : Math.max(1, this.player.state.hp);

    this.cameras.main.fadeOut(220, 8, 12, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: 'temple_district',
        spawnX: 1145,
        spawnY: 700,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: 'temple_district',
          hp: restoredHp,
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

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    if (!onGround) {
      this.peakAirVy = Math.max(this.peakAirVy, this.player.body.velocity.y);
    } else {
      if (!this.prevOnGround && this.peakAirVy > 420 && bridge.hasGroundSlamShockwave && !this.playerDefeated) {
        this.triggerGroundSlamShockwave();
      }
      this.jumpsUsed = 0;
      this.peakAirVy = 0;
    }
    this.prevOnGround = onGround;

    // Naga Scale Set Orbiting Water Shield Visual
    const shieldReady = bridge.hasWaterShield && time >= this.waterShieldReadyAt && !this.playerDefeated;
    this.waterShieldOrb.setVisible(shieldReady);
    this.waterShieldRing.setVisible(shieldReady);
    if (shieldReady) {
      const ang = time * 0.0042;
      const ox = this.player.x + Math.cos(ang) * 34;
      const oy = this.player.y - 6 + Math.sin(ang) * 18;
      this.waterShieldOrb.setPosition(ox, oy);
      this.waterShieldRing.setPosition(ox, oy);
    }

    // Bamboo Vine Grapple Zip Physics
    this.grappleGraphics.clear();
    if (this.grappleActive && !this.playerDefeated) {
      const dx = this.grappleTargetX - this.player.x;
      const dy = this.grappleTargetY - this.player.y;
      const dist = Math.hypot(dx, dy);
      this.grappleGraphics.lineStyle(4, 0x166534, 1);
      this.grappleGraphics.beginPath();
      this.grappleGraphics.moveTo(this.player.x, this.player.y - 8);
      this.grappleGraphics.lineTo(this.grappleTargetX, this.grappleTargetY + 14);
      this.grappleGraphics.strokePath();
      this.grappleGraphics.lineStyle(2, 0x4ade80, 0.95);
      this.grappleGraphics.beginPath();
      this.grappleGraphics.moveTo(this.player.x, this.player.y - 8);
      this.grappleGraphics.lineTo(this.grappleTargetX, this.grappleTargetY + 14);
      this.grappleGraphics.strokePath();
      this.grappleGraphics.fillStyle(0xf472b6, 1);
      this.grappleGraphics.fillCircle(this.grappleTargetX, this.grappleTargetY + 14, 5);

      if (dist < 24 || time >= this.grappleEndAt) {
        this.grappleActive = false;
        this.player.body.setVelocity(dx * 1.4, -220);
      } else {
        this.player.body.setVelocity((dx / dist) * 760, (dy / dist) * 760);
      }
    }

    // Mythic Focus (fills when taking 0 damage) & Fury (fills when fighting close to boss)
    if (this.difficulty === 'mythic' && this.bossCtrl.alive && !this.playerDefeated) {
      if (time >= this.focusActiveUntil && this.focusPct < 100) {
        this.focusPct = Math.min(100, this.focusPct + dt * 5.8);
      }
      const distToBoss = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossCtrl.x, this.bossCtrl.y);
      if (time >= this.furyActiveUntil && distToBoss < 320 && this.furyPct < 100) {
        this.furyPct = Math.min(100, this.furyPct + dt * 5.2);
      }
    }

    // Shadow Hunter Stealth recharge
    const isShadow = this.player.state.activeClass === 'shadow';
    if (isShadow && time - this.lastAttackAt > 450 && this.stealthPct < 100) {
      this.stealthPct = Math.min(100, this.stealthPct + dt * 32 * (1 + bridge.stealthRateBonusPct));
      if (time - this.lastMeterBroadcast > 120) {
        this.lastMeterBroadcast = time;
        this.broadcastClassMeter();
      }
    }

    if (time < this.invulnerableUntil) {
      this.player.paperDoll.setAlpha(Math.floor(time / 55) % 2 === 0 ? 0.55 : 1);
    } else if (isShadow) {
      this.player.paperDoll.setStealthTint(this.stealthPct >= 100);
    } else {
      this.player.paperDoll.setAlpha(1);
    }

    // Barami Spirit Tamer passive companion auto-attack (only when player owns & equips a Pet)
    if (this.player.state.activeClass === 'tamer' && this.player.pet && this.bossCtrl.alive && !this.playerDefeated) {
      this.player.pet.trySpiritAutoAttack(
        time,
        this.bossCtrl.x,
        this.bossCtrl.y - 90,
        () => {
          if (this.bossCtrl.alive) {
            this.damageBoss(this.player.facingRight ? 1 : -1, {
              bonusMult: 0.6 * (1 + bridge.petDamageBonusPct),
              tag: 'Pet Spirit',
            });
          }
        },
        false,
        bridge.petAttackSpeedMult
      );
    }

    if (!this.playerDefeated && time > this.dashActiveUntil && !this.grappleActive && !this.transitioning) {
      let moveX = this.joystick.x;
      if (!typing) {
        if (this.cursors.left.isDown || this.keys.A.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) moveX += 1;

        if (
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
          Phaser.Input.Keyboard.JustDown(this.keys.W) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.up)
        ) {
          this.performJump();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.G)) {
          this.performBambooGrapple();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.L)) {
          this.performClassDash();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
          this.performClassAttack();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
          this.activateFocusBurst();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
          this.performSecondaryWeaponAction();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
          this.activateFuryBurst();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.isNearExitPortal()) {
          this.returnToOverworld();
        }
      }

      if (Math.abs(moveX) > 0.12) {
        const dir = moveX < 0 ? -1 : 1;
        this.player.facing = dir > 0 ? 'right' : 'left';
        this.player.body.setVelocityX(dir * 270 * (1 + bridge.moveSpeedBonusPct));
      } else {
        this.player.body.setVelocityX(0);
      }
    }

    if (time < this.parryActiveUntil) {
      this.player.playStateAnimation('parry');
    } else if (time < this.attackAnimUntil) {
      this.player.playStateAnimation('attack');
    } else if (!onGround) {
      this.player.playStateAnimation('jump');
    } else if (Math.abs(this.player.body.velocity.x) > 15) {
      this.player.playStateAnimation('walk');
    } else {
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, onGround);

    // Update parachuting Golden Num Pang Village Cheer Care Packages
    for (let i = this.cheerPackages.length - 1; i >= 0; i--) {
      const pkg = this.cheerPackages[i];
      if (pkg.claimed) continue;
      if (pkg.y < pkg.targetY) {
        pkg.y = Math.min(pkg.targetY, pkg.y + delta * 0.13);
        pkg.x += Math.sin(time / 240 + i) * 0.55;
      }
      pkg.container.setPosition(pkg.x, pkg.y);
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y - 16, pkg.x, pkg.y);
      if (dist <= 52) {
        this.claimVillageCheerPackage(pkg);
        this.cheerPackages.splice(i, 1);
      }
    }

    // Co-op Dungeon position sync & smooth teammate interpolation
    if (roomClient.isInCoopDungeon) {
      const poseNow =
        time < this.attackAnimUntil
          ? 'attack'
          : !onGround
          ? 'jump'
          : Math.abs(this.player.body.velocity.x) > 15
          ? Math.floor(time / 150) % 2 === 0
            ? 'walk1'
            : 'walk2'
          : 'idle';
      roomClient.sendDungeonMove(
        this.player.x,
        this.player.y,
        this.player.facingRight ? 'right' : 'left',
        poseNow,
        this.player.state.hp,
        bridge.effectiveMaxHp,
        time
      );
    }

    const lerpA = Math.min(1, 1 - Math.exp(-delta * 0.016));
    this.teammates.forEach((t) => {
      t.x = Phaser.Math.Linear(t.x, t.targetX, lerpA);
      t.y = Phaser.Math.Linear(t.y, t.targetY, lerpA);
      t.paperDoll.setPosition(t.x, t.y + 20);
      t.paperDoll.setPoseAndFacing(t.pose, t.facing, time);
      t.pet?.update(time, t.x, t.y, t.facing === 'right');
      t.nameTag.setPosition(t.x, t.y + 26);
      t.hpBg.setPosition(t.x, t.y - 38);
      t.hpFill.setPosition(t.x - 19, t.y - 38);
    });

    // Update Multi-Phase Boss AI & Hazards
    const playerBounds = new Phaser.Geom.Rectangle(this.player.x - 16, this.player.y - 26, 32, 48);
    if (!this.playerDefeated) {
      this.bossCtrl.update(time, delta, this.player.x, this.player.y, playerBounds);
    }

    // Walk-over auto-pickup for Secret Relic Chest & Boss Treasure Bag (extended range with QoL Lucky White Kitten!)
    const hasAutoLootKitten =
      this.player.state.loadout.pet === 'pet_lucky_kitten' ||
      this.player.state.inventory.some((i) => i.itemId === 'pet_lucky_kitten' && i.quantity > 0);
    const lootRadius = hasAutoLootKitten ? 240 : 56;
    if (
      this.secretWall.broken &&
      !this.secretWall.chestClaimed &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.secretWall.x, this.secretWall.y) < lootRadius
    ) {
      this.claimSecretRelicChest();
    }
    if (
      this.lootBag &&
      !this.lootBag.claimed &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lootBag.x, this.lootBag.y) < lootRadius
    ) {
      this.claimBossLootBag();
    }

    // Update Airborne Golden Riel Tossed Coins (gravity arc for Trick-Shot!)
    for (let i = this.tossedCoins.length - 1; i >= 0; i--) {
      const c = this.tossedCoins[i];
      c.vy += 620 * dt;
      c.node.x += c.vx * dt;
      c.node.y += c.vy * dt;
      if (time >= c.expiresAt || c.node.y >= FLOOR_Y - 8) {
        c.node.destroy();
        this.tossedCoins.splice(i, 1);
      }
    }

    // Update Projectiles (Arrows, Riel Coins, Evolving Yant Waves & Fractured Yant Orbs)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.node.x += p.vx * dt;
      p.node.y += p.vy * dt;

      let hitSomething = false;
      const pBox = new Phaser.Geom.Rectangle(p.node.x - 14, p.node.y - 14, 28, 28);

      // Secret Wall hit check
      if (!this.secretWall.broken && Phaser.Geom.Intersects.RectangleToRectangle(pBox, this.secretWall.wallRect.getBounds())) {
        this.damageSecretWall();
        hitSomething = true;
      }

      // Tadpole hit check
      if (!hitSomething) {
        for (const h of this.bossCtrl.hazards) {
          if (h.kind === 'tadpole' && h.alive) {
            const hBox = new Phaser.Geom.Rectangle(h.x - 18, h.y - 18, 36, 36);
            if (Phaser.Geom.Intersects.RectangleToRectangle(pBox, hBox)) {
              this.damageTadpole(h, 65);
              hitSomething = true;
              break;
            }
          }
        }
      }

      // Boss hit check (Head OR any trailing Shadow Naga segment)
      if (!hitSomething && this.bossCtrl.alive && this.bossCtrl.intersectsHitbox(pBox)) {
        const hitDir = p.vx >= 0 ? 1 : -1;
        this.vfx.playImpactSparks(p.node.x, p.node.y, p.colorHex);
        if (p.kind === 'riel_coin') {
          this.damageBoss(hitDir, {
            bonusMult: p.damageScale,
            guaranteedCrit: (p.ricochetsLeft ?? 0) < 2,
            tag: (p.ricochetsLeft ?? 0) < 2 ? 'COIN RICOCHET!' : 'GOLDEN RIEL!',
          });
          if ((p.ricochetsLeft ?? 0) > 0) {
            soundManager.playSfx('coin');
            p.ricochetsLeft = (p.ricochetsLeft ?? 1) - 1;
            p.damageScale *= 1.3;
            p.vx = -p.vx * 0.85;
            p.vy = -210;
            p.node.x += Math.sign(p.vx) * 28;
            p.expiresAt = time + 950;
          } else {
            hitSomething = true;
          }
        } else if (p.kind === 'arrow' || p.kind === 'evolving_wave') {
          this.damageBoss(hitDir, {
            bonusMult: p.damageScale,
            tag: p.kind === 'evolving_wave' ? '✨ YANT WAVE!' : undefined,
          });
          hitSomething = true;
        } else {
          this.damageBoss(hitDir, { bonusMult: p.damageScale });
          // Tome of Fractured Yant: every magic bolt hit triggers 3 extra golden off-screen crisscrossing light-blades!
          if (this.player.state.weapon.id === 'weapon_fractured_yant_tome') {
            this.vfx.playFracturedYantCrisscross(this.bossCtrl.x, this.bossCtrl.y - 84);
            for (let b = 0; b < 3; b++) {
              this.time.delayedCall(75 * (b + 1), () => {
                if (this.bossCtrl.alive) {
                  this.damageBoss(hitDir, {
                    bonusMult: 0.36,
                    tag: b === 2 ? '✨ FRACTURED YANT ×3!' : undefined,
                  });
                }
              });
            }
          }
          this.addMysticYantStack(hitDir);
          hitSomething = true;
        }
      }

      if (hitSomething || time >= p.expiresAt || p.node.x < 0 || p.node.x > ARENA_W) {
        p.node.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // Floating cavern dust motes
    for (const m of this.dustMotes) {
      m.sprite.x += m.speedX * dt;
      m.sprite.y = m.baseY + Math.sin(time / 700 + m.phase) * 14;
      if (m.sprite.x > ARENA_W + 10) m.sprite.x = -10;
    }

    // Passive Arena Buff Station Regen (Heart Lantern +3 HP/s, Sacred Campfire +2 HP/s)
    if (!this.playerDefeated && time - this.lastStationHealAt >= 1000) {
      this.lastStationHealAt = time;
      const regen = (this.arenaStations.heartLantern ? 3 : 0) + (this.arenaStations.sacredCampfire ? 2 : 0);
      const shimmerHp = (this.player.state.shimmerBlessings ?? []).includes('blessing_vital_crystal') ? 25 : 0;
      const capHp = bridge.effectiveMaxHp + shimmerHp;
      if (regen > 0 && this.player.state.hp < capHp) {
        this.player.state.hp = Math.min(capHp, this.player.state.hp + regen);
        this.emitPlayerState();
      }
    }

    // Periodic Boss HUD & Mythic Gauge refresh
    if (time - this.lastBossHudBroadcast > 140) {
      this.lastBossHudBroadcast = time;
      this.broadcastBossHud();
    }

    const nearExit = this.isNearExitPortal();
    this.promptText.setVisible(nearExit);
    if (nearExit !== this.nearExitSent) {
      this.nearExitSent = nearExit;
      EventBus.emit('portal:proximity', {
        nearPortal: nearExit,
        label: nearExit ? 'EXIT TO VILLAGE' : '',
        targetZone: 'overworld',
      });
    }
  }
}
