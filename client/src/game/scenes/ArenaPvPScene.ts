import Phaser from 'phaser';
import {
  DEFAULT_LOADOUT,
  INITIAL_PLAYER_STATE,
  type EquippedLoadout,
  type KhmerClassId,
  type PlayerState,
} from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { PaperDoll, type PaperDollFacing, type PaperDollPose } from '../entities/PaperDoll';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../animations/VFXManager';
import { KHMER_SIGNATURE_SKILLS } from '../animations/ClassCombatVFX';
import { isAwakenedWeaponId } from '@shared/weaponAwakening';

const ARENA_W = 960;
const ARENA_H = 600;
const RING_LEFT = 155;
const RING_RIGHT = 805;
const RING_TOP = 188;
const RING_BOTTOM = 478;

interface ArenaInitData {
  playerState?: PlayerState;
  mode?: 'normalized' | 'open';
  duelId?: string;
  spectate?: boolean;
  opponentName?: string;
}

interface FighterActor {
  name: string;
  classId: KhmerClassId;
  loadout: EquippedLoadout;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: PaperDollFacing;
  pose: PaperDollPose;
  hp: number;
  maxHp: number;
  atk: number;
  defense: number;
  roundsWon: number;
  dashUntil: number;
  dashCooldownUntil: number;
  grappleCooldownUntil: number;
  attackCooldownUntil: number;
  sigCooldownUntil: number;
  poseUntil: number;
  aimAngle: number;
  invulnUntil: number;
  doll: PaperDoll;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  isAwakened: boolean;
}

interface ArenaProjectile {
  owner: 'left' | 'right';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  color: number;
  radius: number;
  expiresAt: number;
  visual: Phaser.GameObjects.Arc;
}

const RIVAL_MASTERS: Array<{ name: string; classId: KhmerClassId; loadout: EquippedLoadout }> = [
  {
    name: 'Kru Vireak (Kun Khmer Master)',
    classId: 'lbokator',
    loadout: {
      ...DEFAULT_LOADOUT,
      hairStyle: 'silver_spiky',
      hat: 'hat_yaksha_mask',
      shirt: 'shirt_lbokator_gi',
      pants: 'pants_sampot_hol',
      wings: 'wings_ember',
      weapon: 'weapon_phkak',
    },
  },
  {
    name: 'Champion Sophea (Angkor Archer)',
    classId: 'archer',
    loadout: {
      ...DEFAULT_LOADOUT,
      hairStyle: 'braided_royal',
      hat: 'hat_bopha_lotus_hairpin',
      shirt: 'shirt_apsara_gold',
      pants: 'pants_sampot_hol',
      wings: 'wings_yant_halo',
      weapon: 'weapon_thnu',
    },
  },
  {
    name: 'Achar Sothea (Mystic Sage)',
    classId: 'mystic',
    loadout: {
      ...DEFAULT_LOADOUT,
      hat: 'hat_royal_crown',
      shirt: 'shirt_achar_robe',
      pants: 'pants_sampot_hol',
      wings: 'wings_garuda',
      weapon: 'weapon_sastra',
    },
  },
];

/**
 * Update 3.1 — Kun Khmer 1v1 Sparring Ring (`ArenaPvPScene`)
 * - Sandstone Angkor Ring in Temple District with Best-of-3 rounds & `3-2-1 FIGHT!` banner.
 * - Normalized 1v1 (equalized 1000 HP / 85 ATK — pure dodging, Shift Dash, Q Grapple, cursor-aimed attacks & R Signature Skill)
 *   and Open Gear Duel (full Awakened Weapons & stats), plus live Spectate mode with cheering!
 */
export class ArenaPvPScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE, zone: 'arena' };
  private mode: 'normalized' | 'open' = 'normalized';
  private spectateMode = false;
  private opponentNameOverride?: string;

  private leftFighter!: FighterActor;
  private rightFighter!: FighterActor;
  private projectiles: ArenaProjectile[] = [];

  private phase: 'countdown' | 'fighting' | 'round_over' | 'match_over' = 'countdown';
  private roundNumber = 1;
  private countdownEndsAt = 0;
  private lastCountdownShown = -1;
  private roundEndAt = 0;
  private transitioning = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'Q' | 'R' | 'SHIFT' | 'SPACE' | 'ESC', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private aiDecisionAt = 0;
  private aiStrafeDir = 1;

  // HUD Graphics
  private leftHpFill!: Phaser.GameObjects.Rectangle;
  private rightHpFill!: Phaser.GameObjects.Rectangle;
  private leftHpText!: Phaser.GameObjects.Text;
  private rightHpText!: Phaser.GameObjects.Text;
  private roundBanner!: Phaser.GameObjects.Text;
  private subBanner!: Phaser.GameObjects.Text;
  private pipsText!: Phaser.GameObjects.Text;
  private cdStatusText!: Phaser.GameObjects.Text;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('ArenaPvPScene');
  }

  init(data?: ArenaInitData): void {
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'arena',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'arena' };
    this.mode = data?.mode === 'open' ? 'open' : 'normalized';
    this.spectateMode = Boolean(data?.spectate);
    this.opponentNameOverride = data?.opponentName;
    this.projectiles = [];
    this.phase = 'countdown';
    this.roundNumber = 1;
    this.lastCountdownShown = -1;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.physics.world.gravity.y = 0;
    soundManager.playBgm('boss');

    this.drawSandstoneRing();
    this.spawnFighters();
    this.buildArenaHud();

    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.centerOn(ARENA_W / 2, ARENA_H / 2);
    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);
    this.cameras.main.fadeIn(220, 18, 12, 8);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,Q,R,SHIFT,SPACE,ESC', false) as Record<
        'W' | 'A' | 'S' | 'D' | 'Q' | 'R' | 'SHIFT' | 'SPACE' | 'ESC',
        Phaser.Input.Keyboard.Key
      >;
      this.input.keyboard.clearCaptures();
    }

    // Left-click cursor-aimed attack inside ring
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length > 0) return;
      if (this.spectateMode || this.phase !== 'fighting') return;
      const aim = Phaser.Math.Angle.Between(this.leftFighter.x, this.leftFighter.y - 12, pointer.worldX, pointer.worldY);
      this.performAttack(this.leftFighter, this.rightFighter, aim, 'left');
    });

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('input:attack', () => {
        if (!this.spectateMode && this.phase === 'fighting') {
          const aim = Phaser.Math.Angle.Between(
            this.leftFighter.x,
            this.leftFighter.y,
            this.rightFighter.x,
            this.rightFighter.y
          );
          this.performAttack(this.leftFighter, this.rightFighter, aim, 'left');
        }
      }),
      EventBus.on('input:dash', () => {
        if (!this.spectateMode && this.phase === 'fighting') this.performDash(this.leftFighter);
      }),
      EventBus.on('input:grapple', () => {
        if (!this.spectateMode && this.phase === 'fighting') {
          this.performGrapple(this.leftFighter, this.rightFighter);
        }
      }),
      EventBus.on('input:signatureSkill', () => {
        if (!this.spectateMode && this.phase === 'fighting') {
          this.performSignatureSkill(this.leftFighter, this.rightFighter, 'left');
        }
      }),
      EventBus.on('travel:execute', () => this.exitToTempleDistrict())
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });

    this.startRoundCountdown();
    EventBus.emit('scene:ready', { zone: 'arena' });
  }

  private applyResponsiveZoom = (): void => {
    const sx = this.scale.width / ARENA_W;
    const sy = this.scale.height / ARENA_H;
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(sx, sy) * 0.98, 0.72, 1.55));
  };

  private drawSandstoneRing(): void {
    const g = this.add.graphics().setDepth(0);
    // Outer Temple District twilight courtyard
    g.fillStyle(0x1f1712, 1);
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Warm carved laterite outer platform
    g.fillStyle(0x573b26, 1);
    g.fillRoundedRect(RING_LEFT - 42, RING_TOP - 36, RING_RIGHT - RING_LEFT + 84, RING_BOTTOM - RING_TOP + 72, 22);
    g.lineStyle(4, 0xf59e0b, 0.85);
    g.strokeRoundedRect(RING_LEFT - 42, RING_TOP - 36, RING_RIGHT - RING_LEFT + 84, RING_BOTTOM - RING_TOP + 72, 22);

    // Main Kun Khmer Sandstone Sparring Mat
    g.fillStyle(0xc2955b, 1);
    g.fillRoundedRect(RING_LEFT, RING_TOP, RING_RIGHT - RING_LEFT, RING_BOTTOM - RING_TOP, 14);
    g.fillStyle(0xb0824a, 0.75);
    g.fillRoundedRect(RING_LEFT + 16, RING_TOP + 16, RING_RIGHT - RING_LEFT - 32, RING_BOTTOM - RING_TOP - 32, 10);

    // Central Khmer Sacred Mandala Circle
    const cx = (RING_LEFT + RING_RIGHT) / 2;
    const cy = (RING_TOP + RING_BOTTOM) / 2;
    g.lineStyle(3, 0xfef08a, 0.55);
    g.strokeCircle(cx, cy, 74);
    g.lineStyle(2, 0xdc2626, 0.55);
    g.strokeCircle(cx, cy, 48);
    g.lineBetween(cx, RING_TOP + 16, cx, RING_BOTTOM - 16);

    // 3 Crimson & Gold Sparring Ring Ropes
    const ropeColors = [0xdc2626, 0xfacc15, 0x2563eb];
    ropeColors.forEach((col, i) => {
      g.lineStyle(3, col, 0.85);
      g.strokeRoundedRect(
        RING_LEFT - 6 + i * 3,
        RING_TOP - 6 + i * 3,
        RING_RIGHT - RING_LEFT + 12 - i * 6,
        RING_BOTTOM - RING_TOP + 12 - i * 6,
        14
      );
    });

    // 4 Golden Angkor Corner Posts + Flickering Braziers
    const corners: Array<[number, number, number]> = [
      [RING_LEFT - 6, RING_TOP - 6, 0xdc2626],
      [RING_RIGHT + 6, RING_TOP - 6, 0x2563eb],
      [RING_LEFT - 6, RING_BOTTOM + 6, 0xdc2626],
      [RING_RIGHT + 6, RING_BOTTOM + 6, 0x2563eb],
    ];
    for (const [px, py, col] of corners) {
      this.add.circle(px, py, 14, col, 0.95).setStrokeStyle(3, 0xfef08a).setDepth(20);
      if (this.textures.exists('torch_glow')) {
        const glow = this.add
          .image(px, py, 'torch_glow')
          .setTint(0xf59e0b)
          .setScale(0.75)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(22);
        this.tweens.add({ targets: glow, alpha: 0.3, scale: 0.88, duration: 900, yoyo: true, repeat: -1 });
      }
    }

    // Cheering Village Spectators lining the outer terrace
    const specSpots: Array<[number, number, string]> = [
      [240, 128, 'Dara'],
      [390, 122, 'Malis'],
      [570, 122, 'Sokha'],
      [720, 128, 'Chann'],
      [250, 535, 'Nita'],
      [710, 535, 'Bopha'],
    ];
    specSpots.forEach(([sx, sy, sName], idx) => {
      const doll = new PaperDoll(this, sx, sy, {
        ...DEFAULT_LOADOUT,
        shirt: idx % 2 === 0 ? 'shirt_krama_set' : 'shirt_village_tunic',
        hat: idx % 3 === 0 ? 'hat_doun' : null,
        weapon: null,
      });
      doll.setScale(0.68).setDepth(sy);
      doll.setPoseAndFacing('idle', sy < 300 ? 'down' : 'up', idx * 300);
      this.tweens.add({
        targets: doll,
        y: sy - 4,
        duration: 420 + (idx % 3) * 110,
        yoyo: true,
        repeat: -1,
      });
      this.add
        .text(sx, sy + 14, sName, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fde68a',
          stroke: '#0f172a',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(sy + 5);
    });
  }

  private spawnFighters(): void {
    const rival = RIVAL_MASTERS[Math.floor(Math.random() * RIVAL_MASTERS.length)];
    const isNorm = this.mode === 'normalized';

    const playerAwakened = isAwakenedWeaponId(this.initialState.loadout.weapon);
    const pMaxHp = isNorm ? 1000 : Math.max(950, Math.round(this.initialState.maxHp * 4.5));
    const pAtk = isNorm
      ? 85
      : Math.round((this.initialState.weapon.baseDamage + 40) * (playerAwakened ? 1.45 : 1.12));
    const pDef = isNorm ? 12 : Math.round(this.initialState.defense * 0.7);

    const oMaxHp = isNorm ? 1000 : Math.round(pMaxHp * 0.98);
    const oAtk = isNorm ? 85 : Math.round(pAtk * 0.94);
    const oDef = isNorm ? 12 : Math.round(pDef * 0.92);

    const makeActor = (
      side: 'left' | 'right',
      name: string,
      classId: KhmerClassId,
      loadout: EquippedLoadout,
      maxHp: number,
      atk: number,
      defense: number,
      isAwakened: boolean
    ): FighterActor => {
      const sx = side === 'left' ? 305 : 655;
      const sy = 335;
      const shadow = this.add.image(sx, sy + 14, 'soft_shadow').setScale(0.65, 0.36).setAlpha(0.75).setDepth(sy - 2);
      const doll = new PaperDoll(this, sx, sy + 12, loadout, `arena_${side}`);
      doll.setScale(1.06).setDepth(sy);
      if (isAwakened) {
        vfxManager.applyGlow(this, doll, 0x38bdf8, 2.2, 0.3);
      }
      const label = this.add
        .text(sx, sy + 20, name, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: side === 'left' ? '#fef08a' : '#fda4af',
          stroke: '#0f172a',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
        .setDepth(900);

      return {
        name,
        classId,
        loadout,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        facing: side === 'left' ? 'right' : 'left',
        pose: 'idle',
        hp: maxHp,
        maxHp,
        atk,
        defense,
        roundsWon: 0,
        dashUntil: 0,
        dashCooldownUntil: 0,
        grappleCooldownUntil: 0,
        attackCooldownUntil: 0,
        sigCooldownUntil: 0,
        poseUntil: 0,
        aimAngle: side === 'left' ? 0 : Math.PI,
        invulnUntil: 0,
        doll,
        shadow,
        label,
        isAwakened,
      };
    };

    const leftName = this.spectateMode
      ? 'Sovann_Angkor (Exhibition)'
      : `${this.initialState.name} (YOU)`;
    const leftLoadout = this.spectateMode
      ? {
          ...DEFAULT_LOADOUT,
          hat: 'hat_royal_crown',
          shirt: 'shirt_apsara_gold',
          pants: 'pants_sampot_hol',
          wings: 'wings_garuda',
          weapon: 'weapon_preah_khan',
        }
      : this.initialState.loadout;

    this.leftFighter = makeActor(
      'left',
      leftName,
      this.spectateMode ? 'lbokator' : this.initialState.activeClass,
      leftLoadout,
      pMaxHp,
      pAtk,
      pDef,
      playerAwakened
    );
    this.rightFighter = makeActor(
      'right',
      this.opponentNameOverride || rival.name,
      rival.classId,
      rival.loadout,
      oMaxHp,
      oAtk,
      oDef,
      this.mode === 'open'
    );
  }

  private buildArenaHud(): void {
    const cx = ARENA_W / 2;

    // Top Fighter HP Bars
    this.add.rectangle(240, 56, 330, 22, 0x0f172a, 0.92).setStrokeStyle(2.5, 0xfacc15).setDepth(1000);
    this.leftHpFill = this.add.rectangle(77, 56, 326, 16, 0x22c55e).setOrigin(0, 0.5).setDepth(1001);
    this.leftHpText = this.add
      .text(240, 56, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1002);

    this.add.rectangle(ARENA_W - 240, 56, 330, 22, 0x0f172a, 0.92).setStrokeStyle(2.5, 0xf43f5e).setDepth(1000);
    this.rightHpFill = this.add
      .rectangle(ARENA_W - 77, 56, 326, 16, 0xef4444)
      .setOrigin(1, 0.5)
      .setDepth(1001);
    this.rightHpText = this.add
      .text(ARENA_W - 240, 56, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1002);

    // Center Mode & Round Pips Badge
    this.pipsText = this.add
      .text(cx, 38, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 10, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(1005);

    this.add
      .text(
        cx,
        74,
        this.spectateMode
          ? '👁️ SPECTATOR MODE · Live Kun Khmer Exhibition Ring'
          : this.mode === 'normalized'
            ? '⚖️ NORMALIZED 1v1 (1000 HP · 85 ATK · 0% P2W)'
            : '⚡ OPEN GEAR DUEL (Full Awakened Weapons Enabled)',
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: this.mode === 'normalized' ? '#6ee7b7' : '#fde047',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: { x: 10, y: 2 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1005);

    // Big Center 3-2-1 FIGHT! Banner
    this.roundBanner = this.add
      .text(cx, 250, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#7c2d12',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(1200);

    this.subBanner = this.add
      .text(cx, 304, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(1200)
      .setVisible(false);

    // Bottom Cooldown / Controls / Exit Strip
    this.cdStatusText = this.add
      .text(cx, ARENA_H - 28, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef3c7',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(1010);

    // Leave Ring button (top-right corner)
    const exitBtn = this.add
      .rectangle(ARENA_W - 84, 24, 148, 28, 0x991b1b, 0.95)
      .setStrokeStyle(2, 0xfef08a)
      .setDepth(1100)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(ARENA_W - 84, 24, '🚪 Exit Ring [ESC]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fffbeb',
      })
      .setOrigin(0.5)
      .setDepth(1101);
    exitBtn.on('pointerdown', () => this.exitToTempleDistrict());

    if (this.spectateMode) {
      const cheerBtn = this.add
        .rectangle(cx, ARENA_H - 64, 210, 34, 0xd97706, 0.96)
        .setStrokeStyle(2, 0xfef08a)
        .setDepth(1100)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(cx, ARENA_H - 64, '📣 Cheer Fighters! (+VFX)', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fffbeb',
        })
        .setOrigin(0.5)
        .setDepth(1101);
      cheerBtn.on('pointerdown', () => {
        soundManager.playSfx('coin');
        this.spawnFloatingText(cx, 175, '🥊 KUN KHMER!! 🎉', '#fde047');
      });
    }

    this.refreshHpHud();
  }

  private startRoundCountdown(): void {
    this.phase = 'countdown';
    this.countdownEndsAt = this.time.now + 2700;
    this.lastCountdownShown = -1;

    this.clearProjectiles();
    this.leftFighter.hp = this.leftFighter.maxHp;
    this.rightFighter.hp = this.rightFighter.maxHp;
    this.leftFighter.x = 305;
    this.leftFighter.y = 335;
    this.leftFighter.facing = 'right';
    this.rightFighter.x = 655;
    this.rightFighter.y = 335;
    this.rightFighter.facing = 'left';
    this.refreshHpHud();
  }

  private clearProjectiles(): void {
    this.projectiles.forEach((p) => p.visual.destroy());
    this.projectiles = [];
  }

  private refreshHpHud(): void {
    const lp = Phaser.Math.Clamp(this.leftFighter.hp / this.leftFighter.maxHp, 0, 1);
    const rp = Phaser.Math.Clamp(this.rightFighter.hp / this.rightFighter.maxHp, 0, 1);
    this.leftHpFill.setDisplaySize(326 * lp, 16);
    this.rightHpFill.setDisplaySize(326 * rp, 16);
    this.leftHpText.setText(`${this.leftFighter.name} · ${this.leftFighter.hp}/${this.leftFighter.maxHp}`);
    this.rightHpText.setText(`${this.rightFighter.name} · ${this.rightFighter.hp}/${this.rightFighter.maxHp}`);

    const lPips = '●'.repeat(this.leftFighter.roundsWon) + '○'.repeat(Math.max(0, 2 - this.leftFighter.roundsWon));
    const rPips = '●'.repeat(this.rightFighter.roundsWon) + '○'.repeat(Math.max(0, 2 - this.rightFighter.roundsWon));
    this.pipsText.setText(`${lPips}   ROUND ${this.roundNumber} / 3   ${rPips}`);
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1150);
    this.tweens.add({
      targets: t,
      y: y - 34,
      alpha: 0,
      duration: 680,
      onComplete: () => t.destroy(),
    });
  }

  private performDash(actor: FighterActor): void {
    const now = this.time.now;
    if (now < actor.dashCooldownUntil) return;
    actor.dashUntil = now + 190;
    actor.invulnUntil = now + 240;
    actor.dashCooldownUntil = now + 1350;
    soundManager.playSfx('krama');

    const ghost = this.add.circle(actor.x, actor.y, 16, 0xfacc15, 0.5).setDepth(actor.y - 5);
    this.tweens.add({ targets: ghost, alpha: 0, scale: 1.7, duration: 240, onComplete: () => ghost.destroy() });
  }

  private performGrapple(actor: FighterActor, target: FighterActor): void {
    const now = this.time.now;
    if (now < actor.grappleCooldownUntil) return;
    actor.grappleCooldownUntil = now + 2800;
    soundManager.playSfx('swing');

    // Bamboo Grapple rope VFX snapping from actor to target, pulling actor rapidly into melee range!
    const rope = this.add.graphics().setDepth(950);
    rope.lineStyle(3.5, 0x4ade80, 0.95);
    rope.lineBetween(actor.x, actor.y - 12, target.x, target.y - 12);
    this.tweens.add({ targets: rope, alpha: 0, duration: 240, onComplete: () => rope.destroy() });

    const ang = Phaser.Math.Angle.Between(actor.x, actor.y, target.x, target.y);
    const destX = Phaser.Math.Clamp(target.x - Math.cos(ang) * 44, RING_LEFT + 22, RING_RIGHT - 22);
    const destY = Phaser.Math.Clamp(target.y - Math.sin(ang) * 44, RING_TOP + 22, RING_BOTTOM - 22);
    this.tweens.add({
      targets: actor,
      x: destX,
      y: destY,
      duration: 180,
      ease: 'Cubic.easeOut',
    });
    this.spawnFloatingText(actor.x, actor.y - 30, '🌿 GRAPPLE!', '#4ade80');
  }

  private performAttack(
    attacker: FighterActor,
    defender: FighterActor,
    aimAngle: number,
    owner: 'left' | 'right'
  ): void {
    const now = this.time.now;
    if (now < attacker.attackCooldownUntil) return;
    attacker.attackCooldownUntil = now + 310;
    attacker.aimAngle = aimAngle;
    attacker.facing = Math.cos(aimAngle) < 0 ? 'left' : 'right';
    attacker.pose = 'attack';
    attacker.poseUntil = now + 180;
    soundManager.playSfx('swing');

    const isRanged = attacker.classId === 'archer' || attacker.classId === 'mystic';
    const isCrit = Math.random() < 0.24;
    const dmg = Math.round(attacker.atk * (isCrit ? 1.45 : 1.0) * (0.92 + Math.random() * 0.16));

    if (isRanged) {
      const col = attacker.isAwakened ? 0x38bdf8 : attacker.classId === 'archer' ? 0xfacc15 : 0xc084fc;
      const orb = this.add.circle(attacker.x + Math.cos(aimAngle) * 18, attacker.y - 12 + Math.sin(aimAngle) * 14, 6.5, col, 0.98)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(960);
      this.projectiles.push({
        owner,
        x: orb.x,
        y: orb.y,
        vx: Math.cos(aimAngle) * 480,
        vy: Math.sin(aimAngle) * 480,
        damage: dmg,
        isCrit,
        color: col,
        radius: 16,
        expiresAt: now + 1200,
        visual: orb,
      });
      return;
    }

    // Melee slash arc along 360° cursor aimAngle!
    const sx = attacker.x + Math.cos(aimAngle) * 30;
    const sy = attacker.y - 10 + Math.sin(aimAngle) * 26;
    const slash = this.add
      .arc(sx, sy, 28, Phaser.Math.RadToDeg(aimAngle) - 55, Phaser.Math.RadToDeg(aimAngle) + 55, false, attacker.isAwakened ? 0x38bdf8 : 0xfacc15, 0.55)
      .setStrokeStyle(3, 0xffffff, 0.95)
      .setDepth(960);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.35, duration: 170, onComplete: () => slash.destroy() });

    const dist = Phaser.Math.Distance.Between(attacker.x, attacker.y, defender.x, defender.y);
    if (dist <= 78) {
      this.applyHit(attacker, defender, dmg, isCrit);
    }
  }

  private performSignatureSkill(
    attacker: FighterActor,
    defender: FighterActor,
    owner: 'left' | 'right'
  ): void {
    const now = this.time.now;
    if (now < attacker.sigCooldownUntil) return;
    attacker.sigCooldownUntil = now + 5200;
    const spec = KHMER_SIGNATURE_SKILLS[attacker.classId];
    soundManager.playSfx('signature_skill');
    this.spawnFloatingText(attacker.x, attacker.y - 36, `${spec.icon} ${spec.name}!`, spec.accentColor);

    const ang = Phaser.Math.Angle.Between(attacker.x, attacker.y, defender.x, defender.y);
    const dmg = Math.round(attacker.atk * 1.95);

    // Radial shockwave + 3-way burst projectile
    const ring = this.add.circle(attacker.x, attacker.y - 10, 18, 0xfacc15, 0.35).setStrokeStyle(3, 0xffffff).setDepth(955);
    this.tweens.add({ targets: ring, scale: 4.2, alpha: 0, duration: 360, onComplete: () => ring.destroy() });

    for (const spread of [-0.22, 0, 0.22]) {
      const a = ang + spread;
      const orb = this.add.circle(attacker.x, attacker.y - 10, 8, 0xfde047, 0.95).setStrokeStyle(2, 0xf97316).setDepth(965);
      this.projectiles.push({
        owner,
        x: attacker.x,
        y: attacker.y - 10,
        vx: Math.cos(a) * 430,
        vy: Math.sin(a) * 430,
        damage: Math.round(dmg * 0.65),
        isCrit: true,
        color: 0xfde047,
        radius: 20,
        expiresAt: now + 1100,
        visual: orb,
      });
    }

    if (Phaser.Math.Distance.Between(attacker.x, attacker.y, defender.x, defender.y) <= 105) {
      this.applyHit(attacker, defender, Math.round(dmg * 0.75), true);
    }
  }

  private applyHit(attacker: FighterActor, defender: FighterActor, rawDmg: number, isCrit: boolean): void {
    if (this.phase !== 'fighting') return;
    if (this.time.now < defender.invulnUntil) {
      this.spawnFloatingText(defender.x, defender.y - 26, '💨 DODGE!', '#38bdf8');
      return;
    }

    const finalDmg = Math.max(12, Math.round(rawDmg - defender.defense * 0.4));
    defender.hp = Math.max(0, defender.hp - finalDmg);
    defender.doll.flashWhite(100);
    soundManager.playSfx(isCrit ? 'crit' : 'hit');
    this.cameras.main.shake(90, isCrit ? 0.005 : 0.0025);

    this.spawnFloatingText(
      defender.x + (Math.random() - 0.5) * 20,
      defender.y - 28,
      `${isCrit ? '💥 ' : ''}-${finalDmg}`,
      isCrit ? '#fde047' : '#fb7185'
    );

    // Slight knockback
    const ang = Phaser.Math.Angle.Between(attacker.x, attacker.y, defender.x, defender.y);
    defender.x = Phaser.Math.Clamp(defender.x + Math.cos(ang) * 18, RING_LEFT + 20, RING_RIGHT - 20);
    defender.y = Phaser.Math.Clamp(defender.y + Math.sin(ang) * 14, RING_TOP + 20, RING_BOTTOM - 20);

    this.refreshHpHud();

    if (defender.hp <= 0) {
      this.handleRoundKo(attacker);
    }
  }

  private handleRoundKo(winner: FighterActor): void {
    winner.roundsWon += 1;
    this.clearProjectiles();
    this.refreshHpHud();
    soundManager.playSfx('victory');

    if (winner.roundsWon >= 2 || this.roundNumber >= 3) {
      this.phase = 'match_over';
      const playerWon = winner === this.leftFighter;
      const eloDelta = this.spectateMode ? 0 : playerWon ? (this.mode === 'normalized' ? 24 : 10) : (this.mode === 'normalized' ? -14 : -6);
      const coinsEarned = this.spectateMode ? 0 : playerWon ? 260 : 75;

      this.roundBanner.setText(
        this.spectateMode
          ? `🏆 ${winner.name.split(' ')[0]} WINS!`
          : playerWon
            ? '🏆 KUN KHMER VICTORY!'
            : '🥊 GOOD SPAR — DEFEAT'
      );
      this.subBanner
        .setText(
          this.spectateMode
            ? `Final Score ${this.leftFighter.roundsWon}–${this.rightFighter.roundsWon} · Click Exit Ring [ESC] to return`
            : `Score ${this.leftFighter.roundsWon}–${this.rightFighter.roundsWon} · ELO ${eloDelta >= 0 ? `+${eloDelta}` : eloDelta} · +${coinsEarned} Coins · Returning in 3.5s...`
        )
        .setVisible(true);

      if (!this.spectateMode) {
        EventBus.emit('arena:matchFinished', {
          won: playerWon,
          mode: this.mode,
          opponentName: this.rightFighter.name,
          eloDelta,
          roundsPlayer: this.leftFighter.roundsWon,
          roundsOpponent: this.rightFighter.roundsWon,
          coinsEarned,
        });
      }

      this.time.delayedCall(3500, () => this.exitToTempleDistrict());
      return;
    }

    this.phase = 'round_over';
    this.roundEndAt = this.time.now + 2100;
    this.roundBanner.setText(`K.O.! ${winner.name.split(' ')[0]} TAKES ROUND ${this.roundNumber}!`);
    this.subBanner.setText('Prepare for the next round...').setVisible(true);
  }

  private updateAiActor(ai: FighterActor, target: FighterActor, owner: 'left' | 'right', time: number, dt: number): void {
    const dist = Phaser.Math.Distance.Between(ai.x, ai.y, target.x, target.y);
    const ang = Phaser.Math.Angle.Between(ai.x, ai.y, target.x, target.y);

    if (time >= this.aiDecisionAt) {
      this.aiDecisionAt = time + 420 + Math.random() * 480;
      this.aiStrafeDir = Math.random() < 0.5 ? -1 : 1;
      if (dist > 165 && Math.random() < 0.25) {
        this.performGrapple(ai, target);
      } else if (dist < 115 && Math.random() < 0.22) {
        this.performDash(ai);
      }
    }

    const preferRange = ai.classId === 'archer' || ai.classId === 'mystic' ? 170 : 58;
    const speed = (time < ai.dashUntil ? 360 : 165) * dt;
    let mx = 0;
    let my = 0;

    if (dist > preferRange + 14) {
      mx = Math.cos(ang);
      my = Math.sin(ang);
    } else if (dist < preferRange - 20) {
      mx = -Math.cos(ang);
      my = -Math.sin(ang);
    } else {
      mx = -Math.sin(ang) * this.aiStrafeDir;
      my = Math.cos(ang) * this.aiStrafeDir;
    }

    ai.x = Phaser.Math.Clamp(ai.x + mx * speed, RING_LEFT + 22, RING_RIGHT - 22);
    ai.y = Phaser.Math.Clamp(ai.y + my * speed, RING_TOP + 22, RING_BOTTOM - 22);
    ai.facing = Math.cos(ang) < 0 ? 'left' : 'right';
    ai.aimAngle = ang;
    if (time >= ai.poseUntil) {
      ai.pose = Math.hypot(mx, my) > 0.1 ? (Math.floor(time / 130) % 2 === 0 ? 'walk1' : 'walk3') : 'idle';
    }

    if (dist <= (preferRange > 100 ? 340 : 76) && Math.random() < 0.08) {
      this.performAttack(ai, target, ang, owner);
    }
    if (dist <= 220 && time >= ai.sigCooldownUntil && Math.random() < 0.025) {
      this.performSignatureSkill(ai, target, owner);
    }
  }

  private syncActorVisual(actor: FighterActor, time: number): void {
    actor.shadow.setPosition(actor.x, actor.y + 14).setDepth(actor.y - 2);
    actor.doll.setPosition(actor.x, actor.y + 12).setDepth(actor.y);
    actor.doll.setAimAngle(actor.aimAngle);
    actor.doll.setPoseAndFacing(actor.pose, actor.facing, time);
    actor.label.setPosition(actor.x, actor.y + 20);
  }

  update(time: number, delta: number): void {
    if (this.transitioning) return;
    if (this.keys?.ESC && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.exitToTempleDistrict();
      return;
    }

    const dt = Math.min(0.05, delta / 1000);

    if (this.phase === 'countdown') {
      const rem = Math.ceil((this.countdownEndsAt - time) / 900);
      if (rem > 0) {
        if (rem !== this.lastCountdownShown) {
          this.lastCountdownShown = rem;
          this.roundBanner.setText(`${rem}`);
          this.subBanner.setText(`ROUND ${this.roundNumber} · READY!`).setVisible(true);
          soundManager.playSfx('coin');
        }
      } else {
        this.phase = 'fighting';
        this.roundBanner.setText('🥊 FIGHT!');
        this.subBanner.setVisible(false);
        soundManager.playSfx('signature_skill');
        this.time.delayedCall(650, () => {
          if (this.phase === 'fighting') this.roundBanner.setText('');
        });
      }
      this.syncActorVisual(this.leftFighter, time);
      this.syncActorVisual(this.rightFighter, time);
      return;
    }

    if (this.phase === 'round_over') {
      if (time >= this.roundEndAt) {
        this.roundNumber += 1;
        this.startRoundCountdown();
      }
      this.syncActorVisual(this.leftFighter, time);
      this.syncActorVisual(this.rightFighter, time);
      return;
    }

    if (this.phase === 'fighting') {
      // Left Fighter (Human Player or Exhibition AI in Spectate Mode)
      if (this.spectateMode) {
        this.updateAiActor(this.leftFighter, this.rightFighter, 'left', time, dt);
      } else {
        let vx = this.joystick.x;
        let vy = this.joystick.y;
        if (this.cursors?.left.isDown || this.keys?.A.isDown) vx = -1;
        else if (this.cursors?.right.isDown || this.keys?.D.isDown) vx = 1;
        if (this.cursors?.up.isDown || this.keys?.W.isDown) vy = -1;
        else if (this.cursors?.down.isDown || this.keys?.S.isDown) vy = 1;

        const mag = Math.hypot(vx, vy);
        if (mag > 0.05) {
          vx /= mag;
          vy /= mag;
        }
        const spd = (time < this.leftFighter.dashUntil ? 410 : 205) * dt;
        this.leftFighter.x = Phaser.Math.Clamp(this.leftFighter.x + vx * spd, RING_LEFT + 22, RING_RIGHT - 22);
        this.leftFighter.y = Phaser.Math.Clamp(this.leftFighter.y + vy * spd, RING_TOP + 22, RING_BOTTOM - 22);

        const ptr = this.input.activePointer;
        const aim = Phaser.Math.Angle.Between(
          this.leftFighter.x,
          this.leftFighter.y - 12,
          ptr.worldX || this.rightFighter.x,
          ptr.worldY || this.rightFighter.y
        );
        this.leftFighter.aimAngle = aim;
        this.leftFighter.facing = Math.cos(aim) < 0 ? 'left' : 'right';
        if (time >= this.leftFighter.poseUntil) {
          this.leftFighter.pose = mag > 0.1 ? (Math.floor(time / 120) % 2 === 0 ? 'walk1' : 'walk3') : 'idle';
        }

        if (this.keys?.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
          this.performAttack(this.leftFighter, this.rightFighter, aim, 'left');
        }
        if (this.keys?.SHIFT && Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
          this.performDash(this.leftFighter);
        }
        if (this.keys?.Q && Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
          this.performGrapple(this.leftFighter, this.rightFighter);
        }
        if (this.keys?.R && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
          this.performSignatureSkill(this.leftFighter, this.rightFighter, 'left');
        }
      }

      // Right Fighter (Rival Master AI)
      this.updateAiActor(this.rightFighter, this.leftFighter, 'right', time, dt);

      // Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.visual.setPosition(p.x, p.y);
        const target = p.owner === 'left' ? this.rightFighter : this.leftFighter;
        const attacker = p.owner === 'left' ? this.leftFighter : this.rightFighter;

        if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y - 8) <= p.radius + 14) {
          this.applyHit(attacker, target, p.damage, p.isCrit);
          p.visual.destroy();
          this.projectiles.splice(i, 1);
        } else if (time >= p.expiresAt || p.x < RING_LEFT - 40 || p.x > RING_RIGHT + 40 || p.y < RING_TOP - 40 || p.y > RING_BOTTOM + 40) {
          p.visual.destroy();
          this.projectiles.splice(i, 1);
        }
      }
    }

    this.syncActorVisual(this.leftFighter, time);
    this.syncActorVisual(this.rightFighter, time);

    const dashReady = time >= this.leftFighter.dashCooldownUntil ? 'READY' : `${((this.leftFighter.dashCooldownUntil - time) / 1000).toFixed(1)}s`;
    const grapReady = time >= this.leftFighter.grappleCooldownUntil ? 'READY' : `${((this.leftFighter.grappleCooldownUntil - time) / 1000).toFixed(1)}s`;
    const sigReady = time >= this.leftFighter.sigCooldownUntil ? 'READY' : `${((this.leftFighter.sigCooldownUntil - time) / 1000).toFixed(1)}s`;
    this.cdStatusText.setText(
      this.spectateMode
        ? '👁️ Spectating Live Kun Khmer Best-of-3 Match · Press [ESC] to Return to Temple District'
        : `⚔️ Click/Space Attack · [Shift] Dash: ${dashReady} · [Q] Grapple: ${grapReady} · [R] Skill: ${sigReady}`
    );
  }

  private exitToTempleDistrict(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.clearProjectiles();
    this.cameras.main.fadeOut(220, 14, 10, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: 'temple_district',
        spawnX: 800,
        spawnY: 810,
        playerState: { ...this.initialState, zone: 'overworld', currentMapId: 'temple_district' },
      });
    });
  }
}
