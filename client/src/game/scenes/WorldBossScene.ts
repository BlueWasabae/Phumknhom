import Phaser from 'phaser';
import {
  DEFAULT_LOADOUT,
  INITIAL_PLAYER_STATE,
  type EquippedLoadout,
  type PlayerState,
} from '@shared/types';
import { calculatePlayerDamage } from '@shared/balanceFormulas';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { getAwakenedWeaponById } from '@shared/weaponAwakening';
import {
  COLOSSUS_SLAYER_TITLE,
  WORLD_BOSS_KHMER_NAME,
  WORLD_BOSS_MAX_PLAYERS,
  WORLD_BOSS_NAME,
  WORLD_BOSS_SOLO_PREVIEW_HP,
  rollColossusRaidChest,
  type ColossusRaidChestReward,
  type WorldBossLeaderboardRow,
} from '@shared/worldBossData';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { PaperDoll } from '../entities/PaperDoll';
import {
  ClassCombatVFX,
  type SpawnedProjectile,
} from '../animations/ClassCombatVFX';
import { vfxManager } from '../animations/VFXManager';
import { soundManager } from '../systems/SoundManager';
import { getCursorAimAngle } from '../systems/CombatAimHelper';
import { worldBossManager } from '../systems/WorldBossManager';
import { roomClient, type RemoteWorldBossPlayer } from '../network/RoomClient';

const ARENA_W = 1920;
const ARENA_H = 760;
const FLOOR_Y = 635;
const BOSS_HOME_X = 960;
const BOSS_HOME_Y = 435;

interface GrapplePillar {
  x: number;
  y: number;
  w: number;
  latchY: number;
}

const GRAPPLE_PILLARS: GrapplePillar[] = [
  { x: 300, y: 420, w: 120, latchY: 392 },
  { x: 610, y: 365, w: 120, latchY: 337 },
  { x: 960, y: 310, w: 150, latchY: 282 },
  { x: 1310, y: 365, w: 120, latchY: 337 },
  { x: 1620, y: 420, w: 120, latchY: 392 },
];

interface VenomPuddle {
  x: number;
  y: number;
  radius: number;
  node: Phaser.GameObjects.Ellipse;
  expiresAt: number;
}

interface RemotePeerSprite {
  doll: PaperDoll;
  nameText: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
}

/**
 * Update 2.5 — Server-Wide 20-Player World Boss Raid Arena:
 * Flooded Angkor Temple Ruins hosting the colossal multi-segmented Ancient Naga Colossus.
 */
export class WorldBossScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private vfx!: ClassCombatVFX;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'Q' | 'E' | 'J' | 'R' | 'SHIFT', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };

  // Ancient Naga Colossus multi-segment visuals
  private bossContainer!: Phaser.GameObjects.Container;
  private bossSegments: Phaser.GameObjects.Arc[] = [];
  private bossHead!: Phaser.GameObjects.Container;
  private bossHeartCore!: Phaser.GameObjects.Arc;
  private bossHeartRing!: Phaser.GameObjects.Arc;
  private bossX = BOSS_HOME_X;
  private bossY = BOSS_HOME_Y;

  // Shared HP & Raid State
  private onlineMode = false;
  private bossHp = WORLD_BOSS_SOLO_PREVIEW_HP;
  private bossMaxHp = WORLD_BOSS_SOLO_PREVIEW_HP;
  private bossAlive = true;
  private exposedHeartActive = false;
  private exposedHeartEndsAt = 0;
  private triggered50 = false;
  private triggered20 = false;
  private localDamageDealt = 0;
  private joinedAt = 0;
  private raidEnded = false;
  private lbokatorCombo = 0;
  private lastAttackAt = 0;
  private lastGrappleAt = 0;
  private grappleActiveUntil = 0;
  private jumpsRemaining = 2;
  private lastHurtAt = 0;
  private nextLocalMechanicAt = 0;
  private mechanicCycle = 0;

  // Active projectiles & hazards
  private projectiles: SpawnedProjectile[] = [];
  private venomPuddles: VenomPuddle[] = [];
  private activeTidalWave: { node: Phaser.GameObjects.Container; x: number; dir: number; active: boolean } | null = null;
  private remotePeers = new Map<string, RemotePeerSprite>();
  private npcTeammates: Array<{ name: string; damage: number; doll: PaperDoll; baseX: number }> = [];

  // Floating World Boss Banner & Shared HP HUD (in-canvas high-visibility + React HUD sync)
  private hudBannerText!: Phaser.GameObjects.Text;
  private grappleHintText!: Phaser.GameObjects.Text;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('WorldBossScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'world_boss',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'world_boss' };

    this.bossSegments = [];
    this.projectiles = [];
    this.venomPuddles = [];
    this.activeTidalWave = null;
    this.remotePeers.clear();
    this.npcTeammates = [];
    this.onlineMode = false;
    this.bossMaxHp = WORLD_BOSS_SOLO_PREVIEW_HP;
    this.bossHp = WORLD_BOSS_SOLO_PREVIEW_HP;
    this.bossAlive = true;
    this.exposedHeartActive = false;
    this.exposedHeartEndsAt = 0;
    this.triggered50 = false;
    this.triggered20 = false;
    this.localDamageDealt = 0;
    this.joinedAt = Date.now();
    this.raidEnded = false;
    this.lbokatorCombo = 0;
    this.lastAttackAt = 0;
    this.lastGrappleAt = 0;
    this.grappleActiveUntil = 0;
    this.jumpsRemaining = 2;
    this.lastHurtAt = 0;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.physics.world.gravity.y = 1080;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);
    soundManager.playBgm('boss');

    this.vfx = new ClassCombatVFX(this);
    this.buildFloodedAngkorArena();
    this.buildAncientNagaColossus();

    this.player = new Player(this, 360, FLOOR_Y - 38, this.initialState, 'dungeon');
    this.player.sprite.setDepth(45);
    this.physics.add.collider(this.player.sprite, this.platforms);

    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(280, 4, 24, 34);

    // Floating mechanics alert & pillar grapple hint
    this.hudBannerText = this.add
      .text(this.scale.width / 2, 118, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        stroke: '#020617',
        strokeThickness: 4,
        padding: { x: 14, y: 6 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(1800)
      .setVisible(false);

    this.grappleHintText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 26,
        '⚔️ Click / Space: Attack · [Q]: Bamboo Grapple onto Stone Pillars (dodge Tidal Wave!) · Double-Jump: W/Up · Exit: [Esc]',
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#a5f3fc',
          backgroundColor: 'rgba(2, 6, 23, 0.78)',
          padding: { x: 10, y: 4 },
        }
      )
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(1700);

    // Keyboard & Pointer Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,Q,E,J,R,SHIFT', false) as Record<
      'W' | 'A' | 'S' | 'D' | 'SPACE' | 'Q' | 'E' | 'J' | 'R' | 'SHIFT',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.clearCaptures();
    this.input.keyboard!.on('keydown-ESC', () => this.exitToSunkenRuins());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.triggerBambooGrapple(pointer.worldX, pointer.worldY);
        return;
      }
      this.performPlayerAttack(pointer.worldX, pointer.worldY);
    });

    this.nextLocalMechanicAt = this.time.now + 4500;

    // Connect to Colyseus WorldBossRoom (20 players shared HP), or run seamless local preview with allied Angkor heroes
    void this.connectWorldBossRoom();

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('input:attack', () => this.performPlayerAttack()),
      EventBus.on('input:signatureSkill', () => {
        if (!this.bossAlive || this.raidEnded) return;
        soundManager.playSfx('signature_skill');
        vfxManager.radialShockwave(this, this.bossX, this.bossY, 0xfacc15, 130, 320, 74);
        vfxManager.additiveSparkBurst(this, this.bossX, this.bossY, 0x22d3ee, 16, 90, 75);
        this.applyDamageToColossus(2.6);
      }),
      EventBus.on('input:jump', () => this.performJump()),
      EventBus.on('input:grapple', () => this.triggerBambooGrapple()),
      EventBus.on('input:exitDungeon', () => this.exitToSunkenRuins()),
      EventBus.on('player:stateSync', (next) => {
        this.player.syncPlayerState(next);
      }),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
      })
    );

    EventBus.emit('scene:ready', { zone: 'world_boss' });
    this.syncBossHudToReact();
  }

  private buildFloodedAngkorArena(): void {
    // Deep nocturnal Sunken Ruins sky & temple silhouette
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x04131c, 0x04131c, 0x0b3a4a, 0x0b3a4a, 1);
    bg.fillRect(0, 0, ARENA_W, ARENA_H);

    // Distant Angkor prasat towers
    bg.fillStyle(0x08232e, 0.85);
    for (const tx of [220, 560, 960, 1360, 1700]) {
      bg.fillRect(tx - 46, 170, 92, 470);
      bg.fillTriangle(tx - 58, 170, tx, 82, tx + 58, 170);
    }

    // Central Temple Pillar (where Colossus coils during Exposed Heart phase!)
    const spire = this.add.graphics().setDepth(6);
    spire.fillStyle(0x1e293b, 0.95);
    spire.fillRect(BOSS_HOME_X - 42, 130, 84, FLOOR_Y - 130);
    spire.lineStyle(3, 0x22d3ee, 0.65);
    spire.strokeRect(BOSS_HOME_X - 42, 130, 84, FLOOR_Y - 130);
    spire.fillStyle(0xfacc15, 0.35);
    spire.fillRect(BOSS_HOME_X - 10, 170, 20, FLOOR_Y - 210);

    // Flooded temple sandstone floor + glowing emerald water sheen
    this.platforms = this.physics.add.staticGroup();
    const floorRect = this.add
      .rectangle(ARENA_W / 2, FLOOR_Y + 62, ARENA_W, 124, 0x164e63, 0.96)
      .setStrokeStyle(3, 0x22d3ee, 0.75)
      .setDepth(12);
    this.physics.add.existing(floorRect, true);
    this.platforms.add(floorRect);

    // Water shimmer line across floor
    const waterTop = this.add
      .rectangle(ARENA_W / 2, FLOOR_Y + 4, ARENA_W, 12, 0x06b6d4, 0.42)
      .setDepth(52);
    this.tweens.add({
      targets: waterTop,
      alpha: 0.22,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });

    // 5 Overhead Stone Grapple Pillars (for Q Bamboo Grapple / Double Jump above Tidal Wave!)
    for (const p of GRAPPLE_PILLARS) {
      const col = this.add
        .rectangle(p.x, p.y + (FLOOR_Y - p.y) / 2, 26, FLOOR_Y - p.y, 0x334155, 0.6)
        .setDepth(8);
      col.setStrokeStyle(1, 0x0e7490, 0.5);

      const plat = this.add
        .rectangle(p.x, p.y, p.w, 20, 0x475569, 1)
        .setStrokeStyle(2.5, 0xfacc15, 0.9)
        .setDepth(16);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);

      // Glowing Q Grapple ring indicator on each overhead stone pillar
      const ring = this.add
        .circle(p.x, p.latchY, 9, 0x22d3ee, 0.35)
        .setStrokeStyle(2, 0xfef08a, 0.95)
        .setDepth(18);
      vfxManager.applyGlow(this, ring, 0x22d3ee, 2.2, 0.3);
      this.add
        .text(p.x, p.latchY - 14, '[Q] PILLAR', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
        })
        .setOrigin(0.5)
        .setDepth(19);
    }
  }

  private buildAncientNagaColossus(): void {
    this.bossContainer = this.add.container(this.bossX, this.bossY).setDepth(32);

    // 14 colossal undulating emerald-cyan-gold serpent body segments
    for (let i = 13; i >= 0; i--) {
      const radius = Math.max(18, 48 - i * 2.1);
      const fill = i % 3 === 0 ? 0x059669 : i % 3 === 1 ? 0x0891b2 : 0x047857;
      const seg = this.add
        .circle(i * 22, Math.sin(i * 0.65) * 42, radius, fill, 0.96)
        .setStrokeStyle(3.5, i % 2 === 0 ? 0xfacc15 : 0x22d3ee, 0.95);
      this.bossSegments.push(seg);
      this.bossContainer.add(seg);
    }

    // 7-Hooded Royal Naga Colossus Head
    this.bossHead = this.add.container(-28, -32);
    for (let h = -3; h <= 3; h++) {
      const hood = this.add
        .ellipse(h * 16, -24 + Math.abs(h) * 6, 22, 46, 0x0f766e, 0.95)
        .setStrokeStyle(2.5, 0xfacc15, 0.95)
        .setAngle(h * 14);
      this.bossHead.add(hood);
    }
    const skull = this.add
      .circle(0, 0, 44, 0x065f46, 1)
      .setStrokeStyle(4, 0xfacc15, 1);
    const eyeL = this.add.circle(-16, -8, 8, 0x22d3ee, 1).setStrokeStyle(2, 0xffffff);
    const eyeR = this.add.circle(16, -8, 8, 0x22d3ee, 1).setStrokeStyle(2, 0xffffff);
    const crown = this.add
      .triangle(0, -56, -24, 18, 0, -28, 24, 18, 0xfacc15, 1)
      .setStrokeStyle(2.5, 0xffffff);
    this.bossHead.add([skull, eyeL, eyeR, crown]);
    this.bossContainer.add(this.bossHead);

    // Exposed Golden Heart Core (blazes brightly during 50% & 20% HP phases!)
    this.bossHeartRing = this.add
      .circle(0, 26, 36, 0xfacc15, 0.25)
      .setStrokeStyle(4, 0x22d3ee, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.bossHeartCore = this.add
      .circle(0, 26, 22, 0xfef08a, 0.98)
      .setStrokeStyle(3, 0xffffff, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.bossContainer.add([this.bossHeartRing, this.bossHeartCore]);

    vfxManager.applyBloom(this, this.bossHead, { color: 0x22d3ee, strength: 1.4 });
    vfxManager.applyBloom(this, this.bossHeartCore, { color: 0xfacc15, strength: 2.0 });
  }

  private async connectWorldBossRoom(): Promise<void> {
    const joined = await roomClient.joinWorldBoss(
      {
        playerId: '',
        name: this.player.state.name,
        hp: this.player.state.hp,
        maxHp: this.player.state.maxHp,
        loadout: this.player.state.loadout,
        activeClass: this.player.state.activeClass,
      },
      {
        onStateSync: (snap) => {
          this.bossHp = snap.hp;
          this.bossMaxHp = snap.maxHp;
          this.bossAlive = snap.alive;
          this.exposedHeartActive = snap.exposedHeartActive;
          this.exposedHeartEndsAt = snap.exposedHeartEndsAt;
          this.updateHeartVisuals();
          this.syncBossHudToReact(snap.topDamagers, snap.playerCount);
        },
        onRemoteAdd: (p) => this.upsertRemotePeer(p),
        onRemoteChange: (p) => this.upsertRemotePeer(p),
        onRemoteRemove: (sid) => {
          const peer = this.remotePeers.get(sid);
          if (peer) {
            peer.doll.destroy();
            peer.nameText.destroy();
            this.remotePeers.delete(sid);
          }
        },
        onMechanic: ({ mechanic, direction }) => {
          if (mechanic === 'tidal_wave') this.launchTidalWaveSweep(direction);
          else if (mechanic === 'venom_rain') this.launchEmeraldVenomRain();
        },
        onExposedHeart: ({ durationMs, endsAt, thresholdPct }) => {
          this.activateExposedHeart(durationMs, endsAt, thresholdPct);
        },
        onColossusDefeated: (payload) => {
          this.finishWorldBossRaid(payload.rankings, payload.top3, payload.bossMaxHp);
        },
      }
    );

    if (joined) {
      this.onlineMode = true;
      this.showRaidBanner('🐉 Connected to 20-Player Server-Wide World Boss Raid!', '#67e8f9', 2600);
    } else {
      // Offline / solo preview fallback: spawn 2 allied Angkor Vanguard heroes so the arena feels alive!
      this.onlineMode = false;
      this.spawnPreviewAllies();
      this.showRaidBanner(
        `🐉 ${WORLD_BOSS_NAME} (${WORLD_BOSS_KHMER_NAME}) Awakened! Dodge Tidal Waves with [Q] Pillar Grapple!`,
        '#fde047',
        3200
      );
    }
  }

  private spawnPreviewAllies(): void {
    const specs: Array<{ name: string; x: number; hat: string; shirt: string }> = [
      { name: 'Sovann_Angkor', x: 690, hat: 'hat_royal_crown', shirt: 'shirt_apsara_gold' },
      { name: 'Bopha_Lotus', x: 1230, hat: 'hat_bopha_lotus_hairpin', shirt: 'shirt_royal_silk' },
    ];
    for (const s of specs) {
      const loadout: EquippedLoadout = { ...DEFAULT_LOADOUT, hat: s.hat, shirt: s.shirt };
      const doll = new PaperDoll(this, s.x, FLOOR_Y - 38, loadout);
      doll.setDepth(42);
      const label = this.add
        .text(s.x, FLOOR_Y - 82, s.name, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fde68a',
          backgroundColor: 'rgba(15,23,42,0.72)',
          padding: { x: 5, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(43);
      doll.add(label.setPosition(0, -48));
      this.npcTeammates.push({ name: s.name, damage: 0, doll, baseX: s.x });
    }
  }

  private upsertRemotePeer(p: RemoteWorldBossPlayer): void {
    let peer = this.remotePeers.get(p.sessionId);
    if (!peer) {
      const doll = new PaperDoll(this, p.x, p.y, p.loadout);
      doll.setDepth(41);
      const nameText = this.add
        .text(p.x, p.y - 46, p.name, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#a5f3fc',
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          padding: { x: 5, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(42);
      peer = { doll, nameText, targetX: p.x, targetY: p.y };
      this.remotePeers.set(p.sessionId, peer);
    }
    peer.targetX = p.x;
    peer.targetY = p.y;
    peer.doll.setPoseAndFacing('idle', p.facing === 'left' ? 'left' : 'right', this.time.now);
  }

  private showRaidBanner(text: string, color = '#fef08a', durationMs = 2800): void {
    if (!this.hudBannerText) return;
    this.hudBannerText.setText(text).setColor(color).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.hudBannerText);
    this.tweens.add({
      targets: this.hudBannerText,
      alpha: 0,
      delay: durationMs,
      duration: 450,
      onComplete: () => this.hudBannerText?.setVisible(false),
    });
  }

  private performJump(): void {
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      this.jumpsRemaining = 2;
    }
    if (this.jumpsRemaining <= 0) return;
    this.jumpsRemaining -= 1;
    body.setVelocityY(-540);
    soundManager.playSfx('swing');
    if (this.jumpsRemaining === 0) {
      // Lotus Double-Jump ring VFX!
      vfxManager.radialShockwave(this, this.player.x, this.player.y + 18, 0xf472b6, 44, 220, 44);
    }
  }

  /**
   * Q Bamboo Grapple: Latches onto the nearest overhead stone pillar (or cursor pillar)
   * so players cleanly dodge the floor-sweeping Tidal Wave!
   */
  private triggerBambooGrapple(targetX?: number, targetY?: number): void {
    const now = this.time.now;
    if (now - this.lastGrappleAt < 650) return;
    this.lastGrappleAt = now;

    // Pick closest overhead stone pillar (favoring cursor location if provided)
    const refX = targetX ?? this.player.x;
    const refY = targetY ?? this.player.y - 160;
    let best = GRAPPLE_PILLARS[0];
    let bestDist = Infinity;
    for (const p of GRAPPLE_PILLARS) {
      const d = Phaser.Math.Distance.Between(refX, refY, p.x, p.latchY);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }

    // Draw snappy green bamboo grapple line from player to overhead stone pillar
    const line = this.add.graphics().setDepth(68);
    line.lineStyle(4, 0x4ade80, 0.95);
    line.lineBetween(this.player.x, this.player.y - 10, best.x, best.latchY);
    line.lineStyle(2, 0xfef08a, 0.9);
    line.lineBetween(this.player.x, this.player.y - 10, best.x, best.latchY);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 240,
      onComplete: () => line.destroy(),
    });

    soundManager.playSfx('swing');
    this.grappleActiveUntil = now + 260;
    this.jumpsRemaining = 2;

    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.tweens.add({
      targets: this.player.sprite,
      x: best.x,
      y: best.y - 34,
      duration: 210,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        body.setVelocity(0, 0);
        vfxManager.radialShockwave(this, best.x, best.y - 8, 0x22d3ee, 42, 200, 44);
      },
    });
  }

  private performPlayerAttack(worldX?: number, worldY?: number): void {
    if (!this.bossAlive || this.raidEnded) return;
    const now = this.time.now;
    const cd = Math.max(140, this.player.state.weapon.attackCooldownMs || 260);
    if (now - this.lastAttackAt < cd) return;
    this.lastAttackAt = now;

    const aim =
      worldX !== undefined && worldY !== undefined
        ? {
            angle: Phaser.Math.Angle.Between(this.player.x, this.player.y, worldX, worldY),
            dir: worldX >= this.player.x ? 1 : -1,
          }
        : getCursorAimAngle(this, this.player.x, this.player.y, this.player.facing === 'left' ? -1 : 1);
    const aimAngle = aim.angle;
    const dir = aim.dir;
    this.player.facing = dir > 0 ? 'right' : 'left';
    this.player.setAimAngle(aimAngle);
    this.player.triggerSquash(1.12, 0.92);
    this.player.playStateAnimation('attack');

    const awakened = getAwakenedWeaponById(this.player.state.weapon.id);
    const cls = this.player.state.activeClass;
    const distToBoss = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossX, this.bossY);

    // 1. Awakened Weapon Prismatic Cyan/Gold VFX & Projectiles!
    if (awakened) {
      soundManager.playSfx('magic');
      if (awakened.id === 'weapon_awakened_hanuman_vajra') {
        this.lbokatorCombo = (this.lbokatorCombo % 3) + 1;
        this.vfx.playLbokatorSlash(this.player.x, this.player.y, dir, this.lbokatorCombo, aimAngle);
        if (this.lbokatorCombo === 3) {
          this.vfx.playAwakenedVajraShockwave(this.player.x, this.player.y, aimAngle);
          if (distToBoss <= 420) this.applyDamageToColossus(1.45);
        } else if (distToBoss <= 280) {
          this.applyDamageToColossus(1.0);
        }
        return;
      }
      if (awakened.id === 'weapon_awakened_angkor_sunbow') {
        this.projectiles.push(
          this.vfx.spawnAwakenedSunbowArrow(this.player.x, this.player.y, dir, 1.2, aimAngle)
        );
        return;
      }
      if (awakened.id === 'weapon_awakened_celestial_yant') {
        this.projectiles.push(
          this.vfx.spawnAwakenedYantLotusOrb(this.player.x, this.player.y, dir, aimAngle)
        );
        return;
      }
      if (awakened.id === 'weapon_awakened_naga_scepter') {
        this.vfx.playKramaWhipSnap(this.player.x, this.player.y, dir, aimAngle);
        this.vfx.playAwakenedSpectralNagaLash(
          this.player.x,
          this.player.y,
          this.bossX,
          this.bossY,
          () => this.applyDamageToColossus(1.25)
        );
        return;
      }
      if (awakened.id === 'weapon_awakened_eclipse_blades') {
        this.vfx.playShadowTwinSlash(this.player.x, this.player.y, dir, true, aimAngle);
        this.projectiles.push(
          this.vfx.spawnAwakenedEclipseCrescent(this.player.x, this.player.y, dir, aimAngle)
        );
        return;
      }
    }

    // 2. Standard 5-Class Attacks
    soundManager.playSfx('swing');
    if (cls === 'archer') {
      this.projectiles.push(this.vfx.spawnArcherArrow(this.player.x, this.player.y, dir, 1, aimAngle));
    } else if (cls === 'mystic') {
      this.projectiles.push(this.vfx.spawnMysticOrb(this.player.x, this.player.y, dir, aimAngle));
    } else if (cls === 'tamer') {
      this.vfx.playKramaWhipSnap(this.player.x, this.player.y, dir, aimAngle);
      if (distToBoss <= 300) this.applyDamageToColossus(1.05);
    } else if (cls === 'shadow') {
      this.vfx.playShadowTwinSlash(this.player.x, this.player.y, dir, false, aimAngle);
      if (distToBoss <= 260) this.applyDamageToColossus(1.05);
    } else {
      this.lbokatorCombo = (this.lbokatorCombo % 3) + 1;
      this.vfx.playLbokatorSlash(this.player.x, this.player.y, dir, this.lbokatorCombo, aimAngle);
      if (distToBoss <= 270) this.applyDamageToColossus(this.lbokatorCombo === 3 ? 1.3 : 1.0);
    }
  }

  private applyDamageToColossus(scale = 1): void {
    if (!this.bossAlive || this.raidEnded) return;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const hit = calculatePlayerDamage({
      weaponBase: this.player.state.weapon.baseDamage,
      upgradeLevel: this.player.state.weapon.upgradeLevel,
      flatBonuses: bridge.flatDamageBonus,
      skillPct: bridge.classSkillDamagePct,
      armorPct: this.player.state.armorDamagePct,
      snackBuffPct: bridge.snackAttackPct,
      enemyDefense: this.exposedHeartActive ? 0 : 12,
      armorPen: this.player.state.weapon.armorPen,
      critChance: this.exposedHeartActive ? 1.0 : bridge.effectiveCritChance,
      critMultiplier: bridge.critMultiplier,
    });

    // Exposed Heart Phase grants 2x Critical Damage!
    const rawDamage = Math.max(12, Math.round(hit.finalDamage * scale * (this.exposedHeartActive ? 2.0 : 1.0)));
    this.localDamageDealt += rawDamage;

    // Floating crisp damage number
    const col = this.exposedHeartActive ? '#fde047' : hit.isCrit ? '#67e8f9' : '#ffffff';
    const label = this.add
      .text(
        this.bossX + (Math.random() - 0.5) * 90,
        this.bossY - 30 + (Math.random() - 0.5) * 55,
        `${this.exposedHeartActive ? '💎 2× ' : ''}${rawDamage.toLocaleString()}${hit.isCrit ? '!' : ''}`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: this.exposedHeartActive ? '22px' : '17px',
          fontStyle: 'bold',
          color: col,
          stroke: '#020617',
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: label,
      y: label.y - 44,
      alpha: 0,
      duration: 620,
      onComplete: () => label.destroy(),
    });

    if (this.onlineMode) {
      roomClient.sendWorldBossHit(rawDamage, hit.isCrit || this.exposedHeartActive);
    } else {
      this.bossHp = Math.max(0, this.bossHp - rawDamage);
      this.checkLocalPhaseTransitions();
      this.syncBossHudToReact();
      if (this.bossHp <= 0) {
        this.finishLocalPreviewRaid();
      }
    }
  }

  private checkLocalPhaseTransitions(): void {
    const pct = this.bossHp / Math.max(1, this.bossMaxHp);
    if (!this.triggered50 && pct <= 0.5 && pct > 0) {
      this.triggered50 = true;
      this.activateExposedHeart(10_000, Date.now() + 10_000, 50);
    } else if (!this.triggered20 && pct <= 0.2 && pct > 0) {
      this.triggered20 = true;
      this.activateExposedHeart(10_000, Date.now() + 10_000, 20);
    }
  }

  private activateExposedHeart(durationMs: number, endsAt: number, thresholdPct: number): void {
    this.exposedHeartActive = true;
    this.exposedHeartEndsAt = endsAt;
    this.updateHeartVisuals();
    soundManager.playSfx('level_up');
    this.cameras.main.flash(220, 250, 204, 21);
    this.cameras.main.shake(220, 0.008);
    this.showRaidBanner(
      `💎 EXPOSED HEART PHASE (${thresholdPct}% HP)! Golden Core Exposed — 2× CRITICAL DAMAGE for ${Math.round(
        durationMs / 1000
      )}s!`,
      '#fde047',
      4500
    );
  }

  private updateHeartVisuals(): void {
    if (!this.bossHeartCore || !this.bossHeartRing) return;
    this.bossHeartCore.setVisible(this.exposedHeartActive);
    this.bossHeartRing.setVisible(this.exposedHeartActive);
  }

  /**
   * Mechanic 1: Tidal Wave Sweep — Telegraphed water wall across the temple floor!
   * Dodge with [Q] Bamboo Grapple onto overhead stone pillars or Lotus Double-Jump!
   */
  private launchTidalWaveSweep(direction: number): void {
    if (!this.bossAlive || this.raidEnded) return;
    const startX = direction > 0 ? 40 : ARENA_W - 40;
    this.showRaidBanner(
      '🌊 TIDAL WAVE SWEEP! Press [Q] to Bamboo Grapple onto overhead Stone Pillars!',
      '#67e8f9',
      2600
    );

    // 1.1s Floor Telegraph line
    const tele = this.add
      .rectangle(ARENA_W / 2, FLOOR_Y - 46, ARENA_W, 92, 0x06b6d4, 0.22)
      .setStrokeStyle(3, 0x22d3ee, 0.9)
      .setDepth(50);
    this.tweens.add({
      targets: tele,
      alpha: 0.42,
      duration: 240,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        tele.destroy();
        if (!this.sys?.isActive() || !this.bossAlive) return;
        const wave = this.add.container(startX, FLOOR_Y - 58).setDepth(58);
        const wall = this.add
          .rectangle(0, 0, 120, 128, 0x0891b2, 0.86)
          .setStrokeStyle(4, 0x67e8f9, 1);
        const crest = this.add
          .ellipse(direction * 24, -56, 94, 34, 0xe0f2fe, 0.92)
          .setBlendMode(Phaser.BlendModes.ADD);
        wave.add([wall, crest]);
        vfxManager.applyBloom(this, wave, { color: 0x22d3ee, strength: 1.5 });
        this.activeTidalWave = { node: wave, x: startX, dir: direction, active: true };
        soundManager.playSfx('magic');
      },
    });
  }

  /**
   * Mechanic 2: Emerald Venom Rain — Glowing puddles players kite away from teammates!
   */
  private launchEmeraldVenomRain(): void {
    if (!this.bossAlive || this.raidEnded) return;
    this.showRaidBanner('☠️ EMERALD VENOM RAIN! Kite glowing venom puddles away from teammates!', '#4ade80', 2400);

    const targets = [
      this.player.x,
      Math.max(140, this.player.x - 240),
      Math.min(ARENA_W - 140, this.player.x + 240),
      BOSS_HOME_X + (Math.random() - 0.5) * 420,
    ];

    targets.forEach((tx, idx) => {
      this.time.delayedCall(idx * 220, () => {
        if (!this.sys?.isActive() || !this.bossAlive) return;
        const warn = this.add
          .ellipse(tx, FLOOR_Y - 2, 110, 26, 0x22c55e, 0.25)
          .setStrokeStyle(2.5, 0x4ade80, 0.95)
          .setDepth(51);
        this.time.delayedCall(780, () => {
          warn.destroy();
          if (!this.sys?.isActive() || !this.bossAlive) return;
          const puddle = this.add
            .ellipse(tx, FLOOR_Y - 2, 118, 28, 0x10b981, 0.65)
            .setStrokeStyle(3, 0x86efac, 0.95)
            .setDepth(51);
          vfxManager.applyGlow(this, puddle, 0x10b981, 2.0, 0.25);
          this.venomPuddles.push({
            x: tx,
            y: FLOOR_Y - 2,
            radius: 56,
            node: puddle,
            expiresAt: this.time.now + 5200,
          });
        });
      });
    });
  }

  private damageLocalPlayer(amount: number, reason: string): void {
    const now = this.time.now;
    if (now - this.lastHurtAt < 700 || this.raidEnded) return;
    this.lastHurtAt = now;
    soundManager.playSfx('hit');
    this.cameras.main.shake(120, 0.007);

    const nextHp = Math.max(1, this.player.state.hp - amount);
    this.player.state.hp = nextHp;
    EventBus.emit('player:state', { ...this.player.state });

    const txt = this.add
      .text(this.player.x, this.player.y - 44, `-${amount} (${reason})`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fda4af',
        stroke: '#020617',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(130);
    this.tweens.add({
      targets: txt,
      y: txt.y - 34,
      alpha: 0,
      duration: 680,
      onComplete: () => txt.destroy(),
    });
  }

  private buildLocalLeaderboard(): WorldBossLeaderboardRow[] {
    const rows = [
      { sessionId: 'local', name: this.player.state.name, damage: this.localDamageDealt },
      ...this.npcTeammates.map((n, i) => ({ sessionId: `ally_${i}`, name: n.name, damage: n.damage })),
    ];
    rows.sort((a, b) => b.damage - a.damage);
    return rows.map((r, idx) => ({
      ...r,
      damagePct: Math.round((r.damage / Math.max(1, this.bossMaxHp)) * 10000) / 100,
      rank: idx + 1,
    }));
  }

  private finishLocalPreviewRaid(): void {
    const lb = this.buildLocalLeaderboard();
    const survivedSec = Math.max(1, Math.floor((Date.now() - this.joinedAt) / 1000));
    this.finishWorldBossRaid(
      lb.map((r) => ({ ...r, survivedSec })),
      lb.slice(0, 3),
      this.bossMaxHp
    );
  }

  private finishWorldBossRaid(
    rankings: Array<WorldBossLeaderboardRow & { survivedSec?: number }>,
    top3: WorldBossLeaderboardRow[],
    bossMaxHp: number
  ): void {
    if (this.raidEnded) return;
    this.raidEnded = true;
    this.bossAlive = false;
    worldBossManager.markDefeated();
    soundManager.playSfx('victory');
    this.cameras.main.flash(350, 250, 204, 21);

    // Colossus dramatic shatter burst
    vfxManager.radialShockwave(this, this.bossX, this.bossY, 0x22d3ee, 240, 620, 95);
    vfxManager.radialShockwave(this, this.bossX, this.bossY, 0xfacc15, 190, 520, 96);
    vfxManager.additiveSparkBurst(this, this.bossX, this.bossY, 0xfef08a, 28, 160, 97);
    this.tweens.add({
      targets: this.bossContainer,
      alpha: 0,
      scale: 0.5,
      duration: 650,
    });

    const mySid = roomClient.worldBossSessionId ?? 'local';
    const myRow =
      rankings.find((r) => r.sessionId === mySid) ??
      rankings.find((r) => r.name === this.player.state.name);
    const survivedSec = Math.max(1, Math.floor((Date.now() - this.joinedAt) / 1000));
    const reward: ColossusRaidChestReward = rollColossusRaidChest({
      damageDealt: myRow?.damage ?? this.localDamageDealt,
      bossMaxHp,
      survivedSec,
      rank: myRow?.rank ?? 1,
    });

    EventBus.emit('worldBoss:completed', {
      reward,
      top3,
      colossusSlayerTitle: reward.colossusSlayerTitleGranted ? COLOSSUS_SLAYER_TITLE : null,
    });

    this.syncBossHudToReact(top3, Math.max(1, rankings.length));
  }

  private syncBossHudToReact(
    overrideTop?: WorldBossLeaderboardRow[],
    overridePlayers?: number
  ): void {
    const topDamagers = overrideTop ?? this.buildLocalLeaderboard().slice(0, 3);
    const playerCount =
      overridePlayers ?? (this.onlineMode ? Math.max(1, this.remotePeers.size + 1) : 1 + this.npcTeammates.length);

    worldBossManager.updateLiveRaidProgress({
      active: this.bossAlive,
      hp: this.bossHp,
      maxHp: this.bossMaxHp,
      playerCount,
      maxPlayers: WORLD_BOSS_MAX_PLAYERS,
      exposedHeartActive: this.exposedHeartActive,
      exposedHeartRemainingMs: this.exposedHeartActive
        ? Math.max(0, this.exposedHeartEndsAt - Date.now())
        : 0,
      topDamagers,
    });

    EventBus.emit('boss:hudUpdate', {
      active: this.bossAlive,
      bossId: 'neak_reach',
      khmerName: `${WORLD_BOSS_KHMER_NAME} · ${playerCount}/${WORLD_BOSS_MAX_PLAYERS} Heroes`,
      englishName: this.exposedHeartActive
        ? `${WORLD_BOSS_NAME} — 💎 EXPOSED HEART (2× CRIT!)`
        : `${WORLD_BOSS_NAME} (Shared Server HP)`,
      hp: this.bossHp,
      maxHp: this.bossMaxHp,
      phase: this.exposedHeartActive ? 3 : this.bossHp / Math.max(1, this.bossMaxHp) <= 0.5 ? 2 : 1,
      difficulty: 'mythic',
      partySize: playerCount,
      stageLabel: this.exposedHeartActive
        ? `💎 EXPOSED HEART! 2× CRIT (${Math.ceil(Math.max(0, this.exposedHeartEndsAt - Date.now()) / 1000)}s)`
        : `Your Dmg: ${this.localDamageDealt.toLocaleString()} (${(
            (this.localDamageDealt / Math.max(1, this.bossMaxHp)) *
            100
          ).toFixed(1)}%)`,
      focusPct: 100,
      focusActive: this.exposedHeartActive,
      furyPct: 0,
      furyActive: false,
      defenseCracked: this.exposedHeartActive,
      damageTakenThisFight: 0,
    });
  }

  private exitToSunkenRuins(): void {
    void roomClient.leaveWorldBoss();
    EventBus.emit('boss:hudUpdate', {
      active: false,
      bossId: 'neak_reach',
      khmerName: '',
      englishName: '',
      hp: 0,
      maxHp: 1,
      phase: 1,
      difficulty: 'normal',
      stageLabel: '',
      focusPct: 0,
      focusActive: false,
      furyPct: 0,
      furyActive: false,
      defenseCracked: false,
      damageTakenThisFight: 0,
    });
    this.scene.start('OverworldScene', {
      playerState: { ...this.player.state, zone: 'overworld' },
      mapId: 'sunken_ruins',
    });
  }

  update(time: number, delta: number): void {
    if (!this.player) return;
    const dt = delta / 1000;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;

    // 1. Movement + Jump + Grapple
    if (time > this.grappleActiveUntil) {
      let vx = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown || this.joystick.x < -0.25) vx = -335;
      else if (this.cursors.right.isDown || this.keys.D.isDown || this.joystick.x > 0.25) vx = 335;
      body.setVelocityX(vx);
      if (vx !== 0) this.player.facing = vx > 0 ? 'right' : 'left';
    }

    const onGround = Boolean(body.blocked.down || body.touching.down);
    if (onGround) {
      this.jumpsRemaining = 2;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W)
    ) {
      this.performJump();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
      this.triggerBambooGrapple();
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.J)
    ) {
      this.performPlayerAttack();
    }

    if (time - this.lastAttackAt > 190) {
      this.player.playStateAnimation(!onGround ? 'jump' : Math.abs(body.velocity.x) > 12 ? 'walk' : 'idle');
    }
    this.player.syncVisuals(time, onGround);

    // 2. Sync local player to WorldBossRoom if online
    if (this.onlineMode) {
      roomClient.sendWorldBossMove({
        x: this.player.x,
        y: this.player.y,
        facing: this.player.facing === 'left' ? 'left' : 'right',
        pose: Math.abs(body.velocity.x) > 10 ? 'walk1' : 'idle',
        hp: this.player.state.hp,
        maxHp: this.player.state.maxHp,
      });
    }

    // 3. Interpolate remote players
    this.remotePeers.forEach((peer) => {
      peer.doll.x = Phaser.Math.Linear(peer.doll.x, peer.targetX, 0.22);
      peer.doll.y = Phaser.Math.Linear(peer.doll.y, peer.targetY, 0.22);
      peer.nameText.setPosition(peer.doll.x, peer.doll.y - 46);
    });

    // 4. Animate Colossal Multi-Segmented Ancient Naga Colossus
    if (this.bossAlive) {
      if (this.exposedHeartActive && Date.now() >= this.exposedHeartEndsAt) {
        this.exposedHeartActive = false;
        this.updateHeartVisuals();
      }
      const targetX = this.exposedHeartActive ? BOSS_HOME_X : BOSS_HOME_X + Math.sin(time / 1100) * 260;
      const targetY = this.exposedHeartActive ? 390 : BOSS_HOME_Y + Math.cos(time / 850) * 58;
      this.bossX = Phaser.Math.Linear(this.bossX, targetX, 0.05);
      this.bossY = Phaser.Math.Linear(this.bossY, targetY, 0.05);
      this.bossContainer.setPosition(this.bossX, this.bossY);

      this.bossSegments.forEach((seg, idx) => {
        if (this.exposedHeartActive) {
          // Coiled tightly around the central Angkor pillar!
          const a = idx * 0.58 + time / 450;
          seg.setPosition(Math.cos(a) * 76, Math.sin(a) * 95);
        } else {
          seg.setPosition(idx * 22 - 40, Math.sin(time / 340 + idx * 0.55) * 44);
        }
      });

      if (this.exposedHeartActive) {
        const pulse = 1 + Math.sin(time / 110) * 0.16;
        this.bossHeartCore.setScale(pulse);
        this.bossHeartRing.setScale(1 + Math.cos(time / 150) * 0.22);
      }

      // Offline solo preview mechanics & friendly ally chip damage
      if (!this.onlineMode) {
        if (time >= this.nextLocalMechanicAt && !this.exposedHeartActive) {
          this.nextLocalMechanicAt = time + 7200;
          this.mechanicCycle += 1;
          if (this.mechanicCycle % 2 === 1) {
            this.launchTidalWaveSweep(this.mechanicCycle % 4 < 2 ? 1 : -1);
          } else {
            this.launchEmeraldVenomRain();
          }
        }
        // Subtle allied hero visuals + light chip damage so leaderboard feels alive
        if (Math.random() < 0.03) {
          const ally = this.npcTeammates[Math.floor(Math.random() * this.npcTeammates.length)];
          if (ally) {
            const chip = 35 + Math.floor(Math.random() * 45);
            ally.damage += chip;
            this.bossHp = Math.max(1, this.bossHp - chip);
            this.checkLocalPhaseTransitions();
            this.vfx.playImpactSparks(this.bossX + (Math.random() - 0.5) * 60, this.bossY, 0x22d3ee);
            this.syncBossHudToReact();
          }
        }
      }
    }

    // 5. Update Player Projectiles (including Awakened Sunbow Comet Trail, Homing Lotus Orb, Eclipse Wave!)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.node.active || time >= p.expiresAt) {
        p.node.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Homing Lotus-Rune Orb curves smoothly toward Colossus!
      if (p.homing && this.bossAlive) {
        const desired = Phaser.Math.Angle.Between(p.node.x, p.node.y, this.bossX, this.bossY);
        const speed = Math.hypot(p.vx, p.vy) || 440;
        p.vx = Phaser.Math.Linear(p.vx, Math.cos(desired) * speed, 0.14);
        p.vy = Phaser.Math.Linear(p.vy, Math.sin(desired) * speed, 0.14);
      }

      p.node.x += p.vx * dt;
      p.node.y += p.vy * dt;

      // Glowing prismatic trails behind Awakened projectiles!
      if (p.kind === 'sunbow_arrow') {
        this.vfx.emitProjectileTrailParticle(p.node.x, p.node.y, 0x22d3ee, 0xfacc15);
      } else if (p.kind === 'lotus_homing') {
        this.vfx.emitProjectileTrailParticle(p.node.x, p.node.y, 0x38bdf8, 0xfef08a);
      } else if (p.kind === 'eclipse_wave') {
        this.vfx.emitProjectileTrailParticle(p.node.x, p.node.y, 0xa855f7, 0xfacc15);
      }

      const d = Phaser.Math.Distance.Between(p.node.x, p.node.y, this.bossX, this.bossY);
      if (this.bossAlive && d <= 108) {
        if (p.piercing) {
          if (!p.hitIds?.has('colossus')) {
            p.hitIds?.add('colossus');
            this.applyDamageToColossus(p.damageScale);
            this.vfx.playImpactSparks(p.node.x, p.node.y, p.colorHex);
          }
        } else {
          this.applyDamageToColossus(p.damageScale);
          if (p.kind === 'lotus_homing') {
            this.vfx.playAwakenedLotusRingBurst(p.node.x, p.node.y);
          } else {
            this.vfx.playImpactSparks(p.node.x, p.node.y, p.colorHex);
          }
          p.node.destroy();
          this.projectiles.splice(i, 1);
        }
      }
    }

    // 6. Update Tidal Wave Sweep hazard
    if (this.activeTidalWave?.active) {
      this.activeTidalWave.x += this.activeTidalWave.dir * 580 * dt;
      this.activeTidalWave.node.x = this.activeTidalWave.x;
      if (
        Math.abs(this.player.x - this.activeTidalWave.x) < 62 &&
        this.player.y > FLOOR_Y - 125
      ) {
        this.damageLocalPlayer(28, 'Tidal Wave — Grapple [Q]!');
      }
      if (this.activeTidalWave.x < -120 || this.activeTidalWave.x > ARENA_W + 120) {
        this.activeTidalWave.node.destroy();
        this.activeTidalWave = null;
      }
    }

    // 7. Update Emerald Venom Rain puddles
    for (let i = this.venomPuddles.length - 1; i >= 0; i--) {
      const vp = this.venomPuddles[i];
      if (time >= vp.expiresAt) {
        vp.node.destroy();
        this.venomPuddles.splice(i, 1);
        continue;
      }
      if (
        Math.abs(this.player.x - vp.x) < vp.radius &&
        Math.abs(this.player.y - (FLOOR_Y - 30)) < 36
      ) {
        this.damageLocalPlayer(14, 'Emerald Venom');
      }
    }
  }

  shutdown(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    void roomClient.leaveWorldBoss();
  }
}
