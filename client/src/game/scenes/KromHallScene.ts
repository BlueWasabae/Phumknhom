import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type KromGuild,
  type PlayerState,
} from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { RemotePlayerEntity } from '../entities/RemotePlayerEntity';
import { roomClient, type RemotePlayerSnapshot } from '../network/RoomClient';
import { fetchKromByIdApi, fetchKromWarStatusApi } from '../network/ApiClient';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../animations/VFXManager';

const HALL_W = 1000;
const HALL_H = 700;
const WALK_LEFT = 96;
const WALK_RIGHT = 904;
const WALK_TOP = 166;
const WALK_BOTTOM = 626;
const EXIT_X = 500;
const EXIT_Y = 624;

interface HallLandmark {
  x: number;
  y: number;
  radius: number;
  label: string;
  onInteract: () => void;
}

interface BossTrophySpec {
  id: string;
  name: string;
  icon: string;
  tint: number;
}

const TROPHY_BOSSES: BossTrophySpec[] = [
  { id: 'sdech_kongkaeb', name: 'King Frog', icon: '🐸', tint: 0x4ade80 },
  { id: 'arp_prey_chrov', name: 'Arp Spirit', icon: '👻', tint: 0xc084fc },
  { id: 'yeak_thmor', name: 'Yeak Thmor', icon: '🗿', tint: 0xf59e0b },
  { id: 'neak_reach', name: 'Neak Reach', icon: '🐉', tint: 0x22d3ee },
  { id: 'ream_eyso_moni_mekhala', name: 'Storm Duo', icon: '⚡', tint: 0x60a5fa },
  { id: 'krong_reap', name: 'Krong Reap', icon: '👹', tint: 0xf43f5e },
  { id: 'ancient_naga_colossus', name: 'Naga Colossus', icon: '👑', tint: 0xfde047 },
];

export interface KromHallInitData {
  playerState?: PlayerState;
  returnMapId?: PlayerState['currentMapId'];
}

export class KromHallScene extends Phaser.Scene {
  private player!: Player;
  private initialState: PlayerState = INITIAL_PLAYER_STATE;
  private returnMapId: NonNullable<PlayerState['currentMapId']> = 'central_plaza';
  private kromData: KromGuild | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };

  private landmarks: HallLandmark[] = [];
  private activeLandmark: HallLandmark | null = null;
  private remoteAvatars = new Map<string, RemotePlayerEntity>();
  private trophyNodes: Array<{
    spec: BossTrophySpec;
    pedestal: Phaser.GameObjects.Rectangle;
    badge: Phaser.GameObjects.Text;
    glow: Phaser.GameObjects.Arc;
  }> = [];
  private headerBannerText!: Phaser.GameObjects.Text;
  private warOwnerText!: Phaser.GameObjects.Text;
  private sittingSpot: { x: number; y: number; label: string } | null = null;

  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('KromHallScene');
  }

  init(data?: KromHallInitData): void {
    this.returnMapId = data?.returnMapId ?? 'central_plaza';
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'krom_hall',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : {
          ...INITIAL_PLAYER_STATE,
          zone: 'krom_hall',
        };
    this.kromData = null;
    this.landmarks = [];
    this.activeLandmark = null;
    this.trophyNodes = [];
    this.remoteAvatars.clear();
    this.sittingSpot = null;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(WALK_LEFT, WALK_TOP, WALK_RIGHT - WALK_LEFT, WALK_BOTTOM - WALK_TOP);
    soundManager.playBgm('village');

    this.drawAngkorGuildHall();
    this.buildSharedTrophyWall();
    this.buildInteractiveStations();
    this.buildLoungeSeating();
    this.buildExitArchway();

    // Spawn player inside the southern grand archway
    this.player = new Player(this, EXIT_X, EXIT_Y - 58, this.initialState, 'krom_hall');
    this.player.paperDoll.setScale(0.76);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, HALL_W, HALL_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.applyResponsiveCameraZoom();
    this.scale.on('resize', this.applyResponsiveCameraZoom, this);
    this.cameras.main.fadeIn(240, 18, 12, 6);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,E', false) as Record<
        'W' | 'A' | 'S' | 'D' | 'E',
        Phaser.Input.Keyboard.Key
      >;
      this.input.keyboard.clearCaptures();
    }

    // Load live Krom details (trophies, level, vault) & Territory War summary
    void this.refreshGuildData();
    void this.connectGuildHallRoom();

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('input:interact', () => this.tryInteractNearest()),
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
          kromTag: playerState.kromTag ?? '',
        });
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
        void this.refreshGuildData();
      }),
      EventBus.on('kromWar:updated', () => {
        void this.refreshGuildData();
      }),
      EventBus.on('pet:evolved', ({ newStage }) => {
        this.player.pet?.playEvolutionBurst(newStage);
      }),
      EventBus.on('travel:execute', (req) => {
        if (this.transitioning) return;
        this.transitioning = true;
        this.cameras.main.fadeOut(200, 14, 10, 8);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          if (req.targetZone === 'farm') {
            this.scene.start('FarmScene', {
              playerState: { ...this.player.state, zone: 'farm' },
            });
          } else {
            const targetMap = req.mapId ?? 'central_plaza';
            this.scene.start('OverworldScene', {
              mapId: targetMap,
              spawnX: req.spawnX,
              spawnY: req.spawnY,
              goldenFlash: true,
              playerState: { ...this.player.state, zone: 'overworld', currentMapId: targetMap },
            });
          }
        });
      })
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveCameraZoom, this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.remoteAvatars.forEach((av) => av.destroy());
      this.remoteAvatars.clear();
    });

    EventBus.emit('scene:ready', { zone: 'krom_hall' });
    EventBus.emit('player:state', this.player.state);
  }

  private applyResponsiveCameraZoom(): void {
    const viewW = this.scale.width || window.innerWidth || 1280;
    const viewH = this.scale.height || window.innerHeight || 720;
    const fitW = viewW / HALL_W;
    const fitH = viewH / HALL_H;
    const zoom = Phaser.Math.Clamp(Math.max(fitW, fitH) * 1.04, 1.02, 1.48);
    this.cameras.main.setZoom(zoom);
  }

  private drawAngkorGuildHall(): void {
    const g = this.add.graphics().setDepth(0);

    // Outer dark teak border
    g.fillStyle(0x160e09, 1);
    g.fillRect(0, 0, HALL_W, HALL_H);

    // Grand sandstone outer walls
    g.fillStyle(0x3a2619, 1);
    g.fillRect(46, 36, HALL_W - 92, HALL_H - 72);
    g.lineStyle(5, 0xd97706, 0.9);
    g.strokeRect(50, 40, HALL_W - 100, HALL_H - 80);

    // Northern raised sandstone gallery wall (for Trophy Wall & Crest)
    g.fillStyle(0x2d1e15, 1);
    g.fillRect(68, 50, HALL_W - 136, 108);
    g.lineStyle(2, 0xf59e0b, 0.75);
    g.strokeRect(68, 50, HALL_W - 136, 108);

    // Carved sandstone & warm teak tiled floor
    const tile = 44;
    for (let y = 160; y < HALL_H - 56; y += tile) {
      for (let x = 72; x < HALL_W - 72; x += tile) {
        const even = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
        g.fillStyle(even ? 0x5c412d : 0x523927, 1);
        g.fillRect(x, y, tile - 1, tile - 1);
        g.lineStyle(1, 0x3b281b, 0.35);
        g.strokeRect(x, y, tile - 1, tile - 1);
      }
    }

    // Inner gilded floor inlay border
    g.lineStyle(3, 0xb45309, 0.75);
    g.strokeRect(94, 174, HALL_W - 188, HALL_H - 242);

    // Royal crimson Khmer carpet runner (North Trophy Wall -> War Table -> South Exit)
    g.fillStyle(0x7f1d1d, 0.94);
    g.fillRect(448, 162, 104, 480);
    g.lineStyle(3, 0xfacc15, 0.85);
    g.strokeRect(452, 164, 96, 476);

    // Horizontal cross-carpet (Vault <-> War Table <-> Shrine)
    g.fillStyle(0x7f1d1d, 0.85);
    g.fillRect(156, 336, 688, 60);
    g.lineStyle(2, 0xfacc15, 0.75);
    g.strokeRect(160, 340, 680, 52);

    // Hall title banner at top
    const tag = this.initialState.kromTag || 'KROM';
    const name = this.initialState.kromName || 'Angkor Guild Hall';
    this.headerBannerText = this.add
      .text(HALL_W / 2, 66, `🏛️ [${tag}] ${name.toUpperCase()} — GRAND KROM HALL`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1c1917',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(35);

    this.warOwnerText = this.add
      .text(HALL_W / 2, 86, 'Weekly Territory War Standings Loading...', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fed7aa',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(35);

    // 6 Glowing Golden Angkor Pillars with WebGL Bloom!
    const pillarCoords = [
      { x: 132, y: 215 },
      { x: 868, y: 215 },
      { x: 132, y: 395 },
      { x: 868, y: 395 },
      { x: 132, y: 565 },
      { x: 868, y: 565 },
    ];
    for (const p of pillarCoords) {
      // Base shadow
      this.add.ellipse(p.x, p.y + 20, 46, 16, 0x000000, 0.45).setDepth(p.y - 5);
      // Carved sandstone column
      const col = this.add
        .rectangle(p.x, p.y - 12, 26, 62, 0x78553a)
        .setStrokeStyle(2, 0xf59e0b)
        .setDepth(p.y);
      // Golden lotus capital & flame orb
      this.add.rectangle(p.x, p.y - 42, 34, 10, 0xd97706).setStrokeStyle(1.5, 0xfef08a).setDepth(p.y + 1);
      const orb = this.add
        .circle(p.x, p.y - 52, 8, 0xfde047, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(p.y + 2);
      vfxManager.applyBloom(this, orb, { color: 0xfacc15, strength: 1.6 });
      this.tweens.add({
        targets: orb,
        scale: 1.22,
        alpha: 0.72,
        duration: 1100 + (p.y % 300),
        yoyo: true,
        repeat: -1,
      });
      void col;
    }
  }

  private buildSharedTrophyWall(): void {
    const startX = 185;
    const gap = 105;
    const y = 132;

    this.add
      .text(HALL_W / 2, 105, '🏆 SHARED KROM BOSS TROPHY WALL', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fde047',
      })
      .setOrigin(0.5)
      .setDepth(35);

    TROPHY_BOSSES.forEach((spec, idx) => {
      const x = startX + idx * gap;
      const glow = this.add
        .circle(x, y - 4, 18, spec.tint, 0.08)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(28);
      const pedestal = this.add
        .rectangle(x, y, 76, 36, 0x1e1b18, 0.95)
        .setStrokeStyle(2, 0x57534e)
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      const badge = this.add
        .text(x, y - 5, `${spec.icon} ${spec.name}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#78716c',
        })
        .setOrigin(0.5)
        .setDepth(32);

      pedestal.on('pointerdown', () => {
        const unlocked = this.kromData?.trophyBosses?.includes(spec.id);
        EventBus.emit('ui:toast', {
          text: unlocked
            ? `🏆 Krom Trophy: ${spec.name} defeated by [${this.initialState.kromTag}]!`
            : `🔒 ${spec.name} Trophy — defeat this boss as a Krom member to light up the wall!`,
        });
      });

      this.trophyNodes.push({ spec, pedestal, badge, glow });
    });
  }

  private updateTrophyWallVisuals(): void {
    const cleared = new Set<string>([
      ...(this.kromData?.trophyBosses ?? []),
      ...(this.initialState.clearedBosses ?? []),
    ]);
    for (const node of this.trophyNodes) {
      const has = cleared.has(node.spec.id);
      if (has) {
        node.pedestal.setFillStyle(0x451a03, 0.96).setStrokeStyle(2, 0xfacc15);
        node.badge.setColor('#fef08a');
        node.glow.setAlpha(0.32);
        vfxManager.applyBloom(this, node.glow, { color: node.spec.tint, strength: 1.2 });
      } else {
        node.pedestal.setFillStyle(0x1c1917, 0.92).setStrokeStyle(1.5, 0x44403c);
        node.badge.setColor('#78716c');
        node.glow.setAlpha(0.05);
      }
    }
  }

  private buildInteractiveStations(): void {
    // 1. CENTRAL KROM WAR TABLE (500, 366)
    const tx = 500;
    const ty = 366;
    this.add.ellipse(tx, ty + 24, 152, 46, 0x000000, 0.45).setDepth(ty - 10);
    const warTable = this.add
      .rectangle(tx, ty, 136, 74, 0x451a03, 1)
      .setStrokeStyle(3, 0xf59e0b)
      .setDepth(ty)
      .setInteractive({ useHandCursor: true });
    // Tactical Angkor territory map overlay on top of table
    const mapSurface = this.add
      .rectangle(tx, ty - 2, 114, 52, 0x0f172a, 0.94)
      .setStrokeStyle(1.5, 0x38bdf8)
      .setDepth(ty + 1);
    const mapPins = [
      { x: tx - 34, y: ty - 4, c: 0xfacc15 },
      { x: tx, y: ty - 10, c: 0x4ade80 },
      { x: tx + 34, y: ty + 4, c: 0x38bdf8 },
    ];
    for (const pin of mapPins) {
      const dot = this.add.circle(pin.x, pin.y, 6, pin.c, 0.92).setDepth(ty + 2);
      vfxManager.applyBloom(this, dot, { color: pin.c, strength: 1.4 });
      this.tweens.add({ targets: dot, scale: 1.35, duration: 900, yoyo: true, repeat: -1 });
    }
    this.add
      .text(tx, ty - 48, '⚔️ KROM WAR TABLE · [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(ty + 12);

    const openWarTable = () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'kromWar' });
    };
    warTable.on('pointerdown', openWarTable);
    mapSurface.setInteractive({ useHandCursor: true }).on('pointerdown', openWarTable);
    this.landmarks.push({
      x: tx,
      y: ty + 20,
      radius: 145,
      label: 'Press [E] or Click → Open Weekly Krom Territory Wars Table',
      onInteract: openWarTable,
    });

    // 2. KROM SHARED VAULT CHEST (220, 265)
    const vx = 220;
    const vy = 265;
    this.add.ellipse(vx, vy + 18, 72, 22, 0x000000, 0.4).setDepth(vy - 6);
    const vaultPedestal = this.add
      .rectangle(vx, vy, 66, 44, 0x78350f)
      .setStrokeStyle(3, 0xfacc15)
      .setDepth(vy)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(vx, vy - 2, '📦', { fontSize: '22px' })
      .setOrigin(0.5)
      .setDepth(vy + 2);
    this.add
      .text(vx, vy - 34, '🔐 KROM SHARED VAULT (12)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(vy + 10);

    const openVault = () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'krom', kromTab: 'vault' });
    };
    vaultPedestal.on('pointerdown', openVault);
    this.landmarks.push({
      x: vx,
      y: vy + 18,
      radius: 75,
      label: 'Press [E] or Click → Open Krom Shared Vault (12 Guild Slots)',
      onInteract: openVault,
    });

    // 3. KROM DONATION SHRINE (780, 265)
    const sx = 780;
    const sy = 265;
    this.add.ellipse(sx, sy + 18, 72, 22, 0x000000, 0.4).setDepth(sy - 6);
    const shrinePedestal = this.add
      .rectangle(sx, sy, 66, 44, 0x7c2d12)
      .setStrokeStyle(3, 0xfde047)
      .setDepth(sy)
      .setInteractive({ useHandCursor: true });
    const shrineGlow = this.add
      .circle(sx, sy - 4, 16, 0xf59e0b, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(sy + 1);
    vfxManager.applyBloom(this, shrineGlow, { color: 0xfacc15, strength: 1.5 });
    this.add
      .text(sx, sy - 2, '⛩️', { fontSize: '22px' })
      .setOrigin(0.5)
      .setDepth(sy + 2);
    this.add
      .text(sx, sy - 34, '⛩️ KROM SHRINE & ROSTER', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(sy + 10);

    const openShrine = () => {
      soundManager.playSfx('click');
      EventBus.emit('ui:openModal', { modal: 'krom', kromTab: 'overview' });
    };
    shrinePedestal.on('pointerdown', openShrine);
    this.landmarks.push({
      x: sx,
      y: sy + 18,
      radius: 75,
      label: 'Press [E] or Click → Open Krom Donation Shrine & Roster',
      onInteract: openShrine,
    });
  }

  private buildLoungeSeating(): void {
    const lounges = [
      { x: 255, y: 505, label: 'West Teak Lounge Cushion' },
      { x: 355, y: 505, label: 'West Silk Lounge Cushion' },
      { x: 645, y: 505, label: 'East Silk Lounge Cushion' },
      { x: 745, y: 505, label: 'East Teak Lounge Cushion' },
    ];

    // Cozy low teak tea tables beside lounge areas
    for (const tx of [305, 695]) {
      this.add.rectangle(tx, 548, 86, 26, 0x451a03).setStrokeStyle(2, 0xb45309).setDepth(544);
      this.add.text(tx, 546, '🍵', { fontSize: '14px' }).setOrigin(0.5).setDepth(546);
    }

    for (const seat of lounges) {
      const cushion = this.add
        .rectangle(seat.x, seat.y, 56, 28, 0x991b1b)
        .setStrokeStyle(2, 0xfacc15)
        .setDepth(seat.y - 2)
        .setInteractive({ useHandCursor: true });

      const sitDown = () => {
        this.sittingSpot = seat;
        this.player.sprite.setPosition(seat.x, seat.y - 4);
        this.player.body.setVelocity(0, 0);
        this.player.playStateAnimation('idle');
        this.player.showEmote('😄', 2200);
        roomClient.sendMove(seat.x, seat.y - 4, 'down', false, this.time.now);
        EventBus.emit('ui:toast', {
          text: `🪑 Relaxing on ${seat.label} with your Krom! Move any direction to stand up.`,
        });
      };

      cushion.on('pointerdown', sitDown);
      this.landmarks.push({
        x: seat.x,
        y: seat.y,
        radius: 48,
        label: `Press [E] or Click → Sit & Lounge (${seat.label})`,
        onInteract: sitDown,
      });
    }
  }

  private buildExitArchway(): void {
    const arch = this.add
      .rectangle(EXIT_X, EXIT_Y + 14, 128, 28, 0x78350f)
      .setStrokeStyle(2, 0xfde047)
      .setDepth(640)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(EXIT_X, EXIT_Y + 14, '🚪 EXIT TO CENTRAL PLAZA [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
      })
      .setOrigin(0.5)
      .setDepth(642);

    const exitHall = () => this.leaveKromHall();
    arch.on('pointerdown', exitHall);
    this.landmarks.push({
      x: EXIT_X,
      y: EXIT_Y,
      radius: 68,
      label: 'Press [E] or Click → Exit Krom Guild Hall to Central Plaza',
      onInteract: exitHall,
    });
  }

  private leaveKromHall(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    soundManager.playSfx('click');
    this.cameras.main.fadeOut(200, 12, 10, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: this.returnMapId,
        spawnX: 560,
        spawnY: 530,
        goldenFlash: true,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: this.returnMapId,
        },
      });
    });
  }

  private async refreshGuildData(): Promise<void> {
    const kromKey = this.player?.state.kromId || this.initialState.kromId || this.initialState.kromTag;
    if (kromKey) {
      const guild = await fetchKromByIdApi(kromKey);
      if (guild && this.scene.isActive('KromHallScene')) {
        this.kromData = guild;
        this.headerBannerText?.setText(
          `🏛️ [${guild.tag}] ${guild.name.toUpperCase()} · LV.${guild.level} KROM HALL`
        );
        this.updateTrophyWallVisuals();
      }
    }
    const war = await fetchKromWarStatusApi();
    if (this.scene.isActive('KromHallScene')) {
      const tag = (this.kromData?.tag ?? this.initialState.kromTag ?? '').toUpperCase();
      const owned = war.territories.filter((t) => t.owner?.kromTag.toUpperCase() === tag);
      const summary =
        owned.length > 0
          ? `👑 Holding ${owned.map((t) => t.name).join(' & ')}`
          : `⚔️ Weekly War Active · Visit Central War Table to Contest 3 Territories`;
      this.warOwnerText?.setText(summary);
    }
  }

  private async connectGuildHallRoom(): Promise<void> {
    const tag = (this.initialState.kromTag || 'PHUM').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    const areaId = `KROM_${tag}`;
    await roomClient.joinPlaza(
      areaId,
      {
        playerId: this.initialState.name,
        name: this.initialState.name,
        level: this.initialState.level,
        stylish: this.initialState.lifeStats.stylish,
        x: EXIT_X,
        y: EXIT_Y - 58,
        facing: 'up',
        loadout: this.initialState.loadout,
      },
      {
        onRemoteAdd: (snap) => this.upsertRemoteGuildmate(snap),
        onRemoteChange: (snap) => this.upsertRemoteGuildmate(snap),
        onRemoteRemove: (sessionId) => {
          const av = this.remoteAvatars.get(sessionId);
          av?.destroy();
          this.remoteAvatars.delete(sessionId);
        },
        onChat: (msg) => {
          if (msg.sessionId !== roomClient.sessionId) {
            this.remoteAvatars.get(msg.sessionId)?.showSpeechBubble(msg.text, 4500);
          }
          EventBus.emit('network:remoteChat', {
            sessionId: msg.sessionId,
            name: msg.name,
            text: msg.text,
            timestamp: msg.timestamp,
          });
        },
        onEmote: (msg) => {
          if (msg.sessionId !== roomClient.sessionId) {
            this.remoteAvatars.get(msg.sessionId)?.showEmote(msg.emoji, 3000);
          }
        },
      }
    );
  }

  private upsertRemoteGuildmate(snap: RemotePlayerSnapshot): void {
    if (!this.scene.isActive('KromHallScene')) return;
    let avatar = this.remoteAvatars.get(snap.sessionId);
    if (!avatar) {
      avatar = new RemotePlayerEntity(this, snap, () => ({ x: this.player.x, y: this.player.y }));
      this.remoteAvatars.set(snap.sessionId, avatar);
    } else {
      avatar.applySnapshot(snap);
    }
  }

  private tryInteractNearest(): void {
    if (this.transitioning) return;
    if (this.activeLandmark) {
      this.activeLandmark.onInteract();
    }
  }

  update(time: number, delta: number): void {
    if (!this.player || this.transitioning) return;

    let vx = this.joystick.x;
    let vy = this.joystick.y;
    if (this.cursors && this.keys) {
      if (this.cursors.left.isDown || this.keys.A.isDown) vx = -1;
      else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy = -1;
      else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;
    }

    const len = Math.hypot(vx, vy);
    const speed = 175;
    if (len > 0.12) {
      this.sittingSpot = null;
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
      this.player.body.setVelocity(vx, vy);
      if (Math.abs(vx) > Math.abs(vy)) {
        this.player.facing = vx < 0 ? 'left' : 'right';
      } else {
        this.player.facing = vy < 0 ? 'up' : 'down';
      }
      this.player.playStateAnimation('walk');
      roomClient.sendMove(this.player.sprite.x, this.player.sprite.y, this.player.facing, true, time);
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
      if (!this.sittingSpot) {
        roomClient.sendMove(this.player.sprite.x, this.player.sprite.y, this.player.facing, false, time);
      }
    }

    this.player.syncVisuals(time, true);
    this.remoteAvatars.forEach((av) => av.update(time, delta));

    // Nearest landmark prompt
    let nearest: HallLandmark | null = null;
    let bestDist = Infinity;
    for (const lm of this.landmarks) {
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, lm.x, lm.y);
      if (d <= lm.radius && d < bestDist) {
        bestDist = d;
        nearest = lm;
      }
    }
    if (nearest !== this.activeLandmark) {
      this.activeLandmark = nearest;
      EventBus.emit('portal:proximity', {
        nearPortal: Boolean(nearest),
        label: nearest?.label ?? '',
        targetZone: 'krom_hall',
      });
    }

    if (this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.tryInteractNearest();
    }
  }
}
