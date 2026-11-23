import Phaser from 'phaser';
import type { BossId, DifficultyMode } from '@shared/types';
import {
  KHMER_BOSSES,
  getDifficultySpeedMultiplier,
  getScaledBossMaxHp,
  type KhmerBossDef,
} from '@shared/khmerBosses';
import {
  TelegraphRenderer,
  type BossHazard,
  type TelegraphColor,
} from '../animations/TelegraphRenderer';

export type BossStage = 'idle' | 'windup' | 'active' | 'recovery' | 'phase_roar' | 'defeated';

export interface BossControllerCallbacks {
  onHitPlayer: (rawAttack: number, label: string, pullDir?: number) => void;
  onFloatingText: (x: number, y: number, text: string, color: string, fontSize?: string) => void;
  onPhaseChange: (phase: 2) => void;
  onDefeated: () => void;
}

/**
 * Reusable Multi-Phase Khmer Boss Rig Engine supporting:
 * - Boss #1: Sdech Kongkaeb (King Frog — QuadrupedHopperRig)
 * - Boss #5: Yeak Thmor (Stone Yaksha — HumanoidRig)
 * Strictly enforces the 4-Stage Boss Telegraph Rule:
 *   Wind-Up (0.5s–0.8s) -> Active Strike -> Impact Juice -> Recovery Window (0.7s–1.1s)
 */
export class BossController {
  public readonly def: KhmerBossDef;
  public readonly difficulty: DifficultyMode;
  public maxHp: number;
  public hp: number;
  public phase: 1 | 2 = 1;
  public stage: BossStage = 'idle';
  public alive = true;
  public x: number;
  public y: number;
  public hazards: BossHazard[] = [];

  private scene: Phaser.Scene;
  private telegraphs: TelegraphRenderer;
  private callbacks: BossControllerCallbacks;
  private floorY: number;
  private arenaMinX: number;
  private arenaMaxX: number;
  private speedMult: number;

  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private throatGlow?: Phaser.GameObjects.Arc;
  private stageBadge: Phaser.GameObjects.Text;
  private baseScale: number;

  private nextStateAt = 0;
  private attackCounter = 0;
  private pendingAction?: () => void;
  private activeAttackHitApplied = false;
  private dashVelX = 0;
  private dashHitboxActive = false;
  private dashLabel = '';
  private leapTargetX = 0;
  private leapStartX = 0;
  private leapStartAt = 0;
  private leapDurationMs = 520;
  private isLeaping = false;

  constructor(
    scene: Phaser.Scene,
    bossId: BossId,
    difficulty: DifficultyMode,
    spawnX: number,
    floorY: number,
    arenaMinX: number,
    arenaMaxX: number,
    callbacks: BossControllerCallbacks
  ) {
    this.scene = scene;
    this.def = KHMER_BOSSES[bossId];
    this.difficulty = difficulty;
    this.maxHp = getScaledBossMaxHp(bossId, difficulty, 1);
    this.hp = this.maxHp;
    this.floorY = floorY;
    this.arenaMinX = arenaMinX;
    this.arenaMaxX = arenaMaxX;
    this.callbacks = callbacks;
    this.speedMult = getDifficultySpeedMultiplier(difficulty);
    this.telegraphs = new TelegraphRenderer(scene);

    this.x = spawnX;
    this.y = floorY;
    this.baseScale = bossId === 'sdech_kongkaeb' ? 1.55 : 1.45;

    this.shadow = scene.add
      .image(spawnX, floorY - 2, 'soft_shadow')
      .setDisplaySize(bossId === 'sdech_kongkaeb' ? 168 : 176, 30)
      .setDepth(40);

    this.sprite = scene.add
      .image(spawnX, floorY, this.def.textureKey)
      .setOrigin(0.5, 0.96)
      .setScale(this.baseScale)
      .setDepth(42);

    if (bossId === 'sdech_kongkaeb') {
      this.throatGlow = scene.add
        .circle(spawnX, floorY - 36, 26, 0xef4444, 0)
        .setDepth(43);
    }

    this.stageBadge = scene.add
      .text(spawnX, floorY - 175, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(48)
      .setVisible(false);

    // Brief 1.1s intro readiness before first telegraph
    this.nextStateAt = scene.time.now + 1100;
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return this.sprite.getBounds();
  }

  public getStageLabel(): string {
    if (!this.alive) return 'DEFEATED';
    if (this.stage === 'phase_roar') return 'PHASE 2 ROAR!';
    if (this.stage === 'windup') return 'TELEGRAPH!';
    if (this.stage === 'active') return 'STRIKING';
    if (this.stage === 'recovery') return 'PUNISH WINDOW';
    return 'STALKING';
  }

  /**
   * Synchronizes shared Co-op DungeonRoom boss HP, party-scaled Max HP, and Phase.
   */
  public applyCoopBossSync(hp: number, maxHp: number, phase: 1 | 2): void {
    this.maxHp = Math.max(1, maxHp);
    this.hp = Math.max(0, Math.min(this.maxHp, hp));
    if (phase === 2 && this.phase === 1 && this.alive && this.hp > 0) {
      this.triggerPhase2Roar();
    }
    if (this.hp <= 0 && this.alive) {
      this.die();
    }
  }

  public takeDamage(amount: number, knockDir: number, heavy = false): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);

    // Stage 3: White flash + knock shudder
    this.sprite.setTintFill(0xffffff);
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this.sprite,
      x: baseX + knockDir * (heavy ? 12 : 6),
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.scene.time.delayedCall(85, () => {
      if (this.alive) this.sprite.clearTint();
    });

    // Check Phase 2 transition (<50% HP)
    if (this.hp > 0 && this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.triggerPhase2Roar();
    }

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private triggerPhase2Roar(): void {
    this.phase = 2;
    this.stage = 'phase_roar';
    this.pendingAction = undefined;
    this.dashVelX = 0;
    this.dashHitboxActive = false;
    this.isLeaping = false;
    this.y = this.floorY;
    this.telegraphs.clearAll();

    this.sprite.setTint(this.def.id === 'sdech_kongkaeb' ? 0xf87171 : 0xf59e0b);
    this.telegraphs.playImpactJuice(this.x, this.y - 60, 'red', true);
    this.callbacks.onFloatingText(
      this.x,
      this.y - 175,
      this.def.id === 'sdech_kongkaeb'
        ? 'PHASE 2 · KING FROG ENRAGES!'
        : 'PHASE 2 · STONE YAKSHA ROARS!',
      '#f87171',
      '20px'
    );
    this.callbacks.onPhaseChange(2);

    this.scene.time.delayedCall(950, () => {
      if (!this.alive) return;
      this.sprite.clearTint();
      this.stage = 'idle';
      this.nextStateAt = this.scene.time.now + 350;
    });
  }

  private die(): void {
    this.alive = false;
    this.stage = 'defeated';
    this.pendingAction = undefined;
    this.dashVelX = 0;
    this.dashHitboxActive = false;
    this.isLeaping = false;
    this.telegraphs.clearAll();
    this.clearHazards();
    this.stageBadge.setVisible(false);
    if (this.throatGlow) this.throatGlow.setAlpha(0);

    this.telegraphs.playImpactJuice(this.x, this.y - 70, 'yellow', true);
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      scaleX: this.baseScale * 1.25,
      scaleY: 0.2,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.sprite.setVisible(false);
        this.shadow.setVisible(false);
      },
    });
    this.callbacks.onDefeated();
  }

  public clearHazards(): void {
    for (const h of this.hazards) {
      if (h.sprite.active) h.sprite.destroy();
    }
    this.hazards = [];
  }

  private startWindup(
    color: TelegraphColor,
    windupMs: number,
    badgeText: string,
    onExecute: () => void
  ): void {
    const adjustedWindup = Math.max(460, Math.round(windupMs / this.speedMult));
    this.stage = 'windup';
    this.activeAttackHitApplied = false;
    this.pendingAction = onExecute;
    this.nextStateAt = this.scene.time.now + adjustedWindup;

    const tintHex =
      color === 'yellow'
        ? 0xfef08a
        : color === 'red'
        ? 0xfca5a5
        : color === 'green'
        ? 0x86efac
        : 0xe879f9;
    this.sprite.setTint(tintHex);
    this.stageBadge.setText(badgeText).setVisible(true);

    // Subtle crouch/telegraph squash
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * 0.86,
      scaleX: this.baseScale * 1.12,
      duration: Math.min(260, adjustedWindup * 0.5),
      ease: 'Quad.easeOut',
    });
  }

  private enterRecovery(recoveryMs: number): void {
    const adjusted = Math.max(680, Math.round(recoveryMs / this.speedMult));
    this.stage = 'recovery';
    this.dashVelX = 0;
    this.dashHitboxActive = false;
    this.sprite.clearTint();
    if (this.throatGlow) this.throatGlow.setAlpha(0);
    this.sprite.setScale(this.baseScale);
    this.stageBadge.setText('OPENING!').setColor('#86efac').setVisible(true);
    this.nextStateAt = this.scene.time.now + adjusted;
  }

  private chooseNextAttack(playerX: number, now: number): void {
    this.attackCounter += 1;
    this.stageBadge.setColor('#fef08a');
    const dir = playerX < this.x ? -1 : 1;
    this.sprite.setFlipX(dir > 0);

    if (this.def.id === 'sdech_kongkaeb') {
      this.runKingFrogAttack(playerX, dir, now);
    } else {
      this.runStoneYakshaAttack(playerX, dir, now);
    }
  }

  // ==================== BOSS #1: SDECH KONGKAEB (KING FROG) ====================
  private runKingFrogAttack(playerX: number, dir: number, now: number): void {
    if (this.phase === 1) {
      if (this.attackCounter % 2 === 1) {
        // Phase 1A: High Jump Slam toward player
        const targetX = Phaser.Math.Clamp(playerX, this.arenaMinX + 120, this.arenaMaxX - 120);
        const windup = 640;
        this.telegraphs.showGroundZone(targetX, this.floorY, 170, 26, 'red', windup + 420);
        this.startWindup('yellow', windup, 'LEAP SLAM!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          this.sprite.setScale(this.baseScale);
          this.isLeaping = true;
          this.leapStartX = this.x;
          this.leapTargetX = targetX;
          this.leapStartAt = this.scene.time.now;
          this.leapDurationMs = Math.round(520 / this.speedMult);
          this.nextStateAt = this.leapStartAt + this.leapDurationMs;
          this.pendingAction = () => {
            this.isLeaping = false;
            this.x = targetX;
            this.y = this.floorY;
            this.telegraphs.playImpactJuice(this.x, this.floorY - 12, 'red', true);
            this.checkAreaHit(this.x, 105, this.def.baseAttack * 1.15, 'Frog Jump Slam', playerX);
            this.enterRecovery(900);
          };
        });
      } else {
        // Phase 1B: Sticky Tongue Lash Telegraph (Yellow line)
        const reach = 320;
        const tipX = Phaser.Math.Clamp(this.x + dir * reach, this.arenaMinX, this.arenaMaxX);
        const windup = 620;
        this.telegraphs.showLineTelegraph(this.x, this.floorY - 56, tipX, 24, 'yellow', windup);
        this.startWindup('yellow', windup, 'TONGUE LASH!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          const len = Math.abs(tipX - this.x);
          const midX = (this.x + tipX) / 2;
          const tongueRect = this.scene.add
            .rectangle(midX, this.floorY - 56, len, 18, 0xf472b6, 0.95)
            .setStrokeStyle(2, 0xbe185d)
            .setDepth(60);

          this.hazards.push({
            kind: 'tongue',
            sprite: tongueRect,
            x: midX,
            y: this.floorY - 56,
            vx: 0,
            vy: 0,
            width: len,
            height: 24,
            damage: Math.round(this.def.baseAttack * 0.9),
            expiresAt: this.scene.time.now + 240,
            alive: true,
            label: 'Sticky Tongue Lash',
          });

          this.nextStateAt = this.scene.time.now + 280;
          this.pendingAction = () => this.enterRecovery(820);
        });
      }
      return;
    }

    // Phase 2 (<50% HP): Throat-Inflate Double Belly-Flop Shockwaves + 2 Mini Tadpoles!
    if (this.attackCounter % 2 === 1) {
      const windup = 760;
      if (this.throatGlow) {
        this.throatGlow.setPosition(this.x, this.floorY - 40).setAlpha(0.75);
        this.scene.tweens.add({
          targets: this.throatGlow,
          scale: 1.75,
          duration: Math.round(windup / this.speedMult),
          ease: 'Sine.easeInOut',
        });
      }
      this.telegraphs.showGroundZone(this.x, this.floorY, 260, 28, 'red', windup);
      this.startWindup('red', windup, 'DOUBLE BELLY-FLOP!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        if (this.throatGlow) this.throatGlow.setAlpha(0).setScale(1);

        const doFlop = (waveIdx: number) => {
          if (!this.alive) return;
          this.telegraphs.playImpactJuice(this.x, this.floorY - 10, 'red', true);
          const waveSpeed = (320 + waveIdx * 60) * this.speedMult;
          this.hazards.push(
            this.telegraphs.createGroundShockwave(
              this.x - 36,
              this.floorY,
              -1,
              waveSpeed,
              this.def.baseAttack,
              'red',
              this.scene.time.now,
              'Belly-Flop Shockwave'
            ),
            this.telegraphs.createGroundShockwave(
              this.x + 36,
              this.floorY,
              1,
              waveSpeed,
              this.def.baseAttack,
              'red',
              this.scene.time.now,
              'Belly-Flop Shockwave'
            )
          );
        };

        doFlop(0);
        this.scene.time.delayedCall(Math.round(420 / this.speedMult), () => doFlop(1));
        this.nextStateAt = this.scene.time.now + Math.round(700 / this.speedMult);
        this.pendingAction = () => this.enterRecovery(950);
      });
    } else {
      // Phase 2B: Spawn 2 Bouncing Mini Tadpoles (Green telegraph)
      const windup = 580;
      this.startWindup('green', windup, 'TADPOLE SWARM!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        const activeTads = this.hazards.filter((h) => h.kind === 'tadpole' && h.alive).length;
        const toSpawn = Math.max(0, 2 - activeTads);
        for (let i = 0; i < toSpawn; i++) {
          const spawnDir = i === 0 ? dir : -dir;
          const tad = this.scene.add.container(this.x + spawnDir * 44, this.floorY - 38).setDepth(56);
          const body = this.scene.add.circle(0, 0, 14, 0x22c55e, 1).setStrokeStyle(2, 0x052e16);
          const eye = this.scene.add.circle(spawnDir * 5, -4, 3.5, 0xfef08a, 1);
          const tail = this.scene.add.triangle(-spawnDir * 14, 2, -6, -6, 6, 0, -6, 6, 0x15803d, 1);
          tad.add([tail, body, eye]);

          this.hazards.push({
            kind: 'tadpole',
            sprite: tad,
            x: this.x + spawnDir * 44,
            y: this.floorY - 38,
            vx: spawnDir * (145 + i * 35) * this.speedMult,
            vy: -280,
            width: 28,
            height: 28,
            damage: Math.round(this.def.baseAttack * 0.7),
            expiresAt: now + 9500,
            hp: 120,
            alive: true,
            label: 'Mini Tadpole',
          });
        }
        this.callbacks.onFloatingText(this.x, this.floorY - 130, 'Mini Tadpoles Spawned!', '#4ade80', '14px');
        this.nextStateAt = this.scene.time.now + 300;
        this.pendingAction = () => this.enterRecovery(880);
      });
    }
  }

  // ==================== BOSS #5: YEAK THMOR (STONE YAKSHA) ====================
  private runStoneYakshaAttack(playerX: number, dir: number, _now: number): void {
    if (this.phase === 1) {
      if (this.attackCounter % 2 === 1) {
        // Phase 1A: Heavy Club Slam (Red zone) + Rolling Ground Shockwave
        const slamX = Phaser.Math.Clamp(this.x + dir * 92, this.arenaMinX + 80, this.arenaMaxX - 80);
        const windup = 720;
        this.telegraphs.showGroundZone(slamX, this.floorY, 190, 32, 'red', windup);
        this.startWindup('red', windup, 'CLUB SLAM!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          this.sprite.setScale(this.baseScale);
          this.telegraphs.playImpactJuice(slamX, this.floorY - 12, 'red', true);
          this.checkAreaHit(slamX, 115, this.def.baseAttack * 1.1, 'Yaksha Club Slam', playerX);
          this.hazards.push(
            this.telegraphs.createGroundShockwave(
              slamX,
              this.floorY,
              dir,
              340 * this.speedMult,
              Math.round(this.def.baseAttack * 0.85),
              'red',
              this.scene.time.now,
              'Rolling Stone Shockwave'
            )
          );
          this.nextStateAt = this.scene.time.now + 320;
          this.pendingAction = () => this.enterRecovery(960);
        });
      } else {
        // Phase 1B: Sandstone Charge (Yellow lane)
        const chargeEnd = Phaser.Math.Clamp(this.x + dir * 340, this.arenaMinX + 120, this.arenaMaxX - 120);
        const windup = 640;
        this.telegraphs.showLineTelegraph(this.x, this.floorY - 56, chargeEnd, 54, 'yellow', windup);
        this.startWindup('yellow', windup, 'STONE CHARGE!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          this.dashVelX = dir * 470 * this.speedMult;
          this.dashHitboxActive = true;
          this.dashLabel = 'Stone Yaksha Charge';
          this.nextStateAt = this.scene.time.now + Math.round(620 / this.speedMult);
          this.pendingAction = () => this.enterRecovery(920);
        });
      }
      return;
    }

    // Phase 2 (<50% HP): Ceiling Boulders (3-4 falling rocks) + Faster Armored Dash Charge
    if (this.attackCounter % 2 === 1) {
      const windup = 750;
      const count = this.difficulty === 'calamity' ? 4 : 3;
      const dropXs: number[] = [];
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 165 + (Math.random() - 0.5) * 45;
        const bx = Phaser.Math.Clamp(playerX + offset, this.arenaMinX + 90, this.arenaMaxX - 90);
        dropXs.push(bx);
        this.telegraphs.showFallingShadow(bx, this.floorY, 34, windup + 320);
      }

      this.startWindup('red', windup, 'CEILING BOULDERS!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        this.scene.cameras.main.shake(150, 0.007);
        for (const bx of dropXs) {
          const rock = this.scene.add.circle(bx, 110, 22, 0x78716c, 1).setStrokeStyle(3, 0xf59e0b).setDepth(60);
          this.hazards.push({
            kind: 'boulder',
            sprite: rock,
            x: bx,
            y: 110,
            vx: 0,
            vy: 640 * this.speedMult,
            width: 44,
            height: 44,
            damage: Math.round(this.def.baseAttack * 0.95),
            expiresAt: this.scene.time.now + 2400,
            alive: true,
            label: 'Falling Ceiling Boulder',
          });
        }
        this.nextStateAt = this.scene.time.now + 450;
        this.pendingAction = () => this.enterRecovery(950);
      });
    } else {
      const chargeEnd = Phaser.Math.Clamp(this.x + dir * 440, this.arenaMinX + 110, this.arenaMaxX - 110);
      const windup = 540;
      this.telegraphs.showLineTelegraph(this.x, this.floorY - 60, chargeEnd, 62, 'yellow', windup);
      this.startWindup('yellow', windup, 'ARMORED DASH!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        this.dashVelX = dir * 610 * this.speedMult;
        this.dashHitboxActive = true;
        this.dashLabel = 'Armored Yaksha Rush';
        this.nextStateAt = this.scene.time.now + Math.round(620 / this.speedMult);
        this.pendingAction = () => {
          this.telegraphs.playImpactJuice(this.x, this.floorY - 12, 'red', true);
          this.hazards.push(
            this.telegraphs.createGroundShockwave(
              this.x,
              this.floorY,
              dir,
              380 * this.speedMult,
              Math.round(this.def.baseAttack * 0.85),
              'red',
              this.scene.time.now,
              'Armored Dash Shockwave'
            )
          );
          this.enterRecovery(980);
        };
      });
    }
  }

  private checkAreaHit(
    cx: number,
    radius: number,
    damage: number,
    label: string,
    playerX: number
  ): void {
    if (Math.abs(playerX - cx) <= radius) {
      this.callbacks.onHitPlayer(Math.round(damage), label);
    }
  }

  public update(
    time: number,
    delta: number,
    playerX: number,
    _playerY: number,
    playerBounds: Phaser.Geom.Rectangle
  ): void {
    const dt = delta / 1000;

    if (this.alive) {
      // Handle Leap Arc (QuadrupedHopperRig)
      if (this.isLeaping) {
        const t = Math.min(1, (time - this.leapStartAt) / Math.max(1, this.leapDurationMs));
        this.x = Phaser.Math.Linear(this.leapStartX, this.leapTargetX, t);
        const arcH = Math.sin(t * Math.PI) * 235;
        this.y = this.floorY - arcH;
      }

      // Handle Dash Charge (HumanoidRig)
      if (this.dashVelX !== 0) {
        this.x = Phaser.Math.Clamp(
          this.x + this.dashVelX * dt,
          this.arenaMinX + 90,
          this.arenaMaxX - 90
        );
        if (this.dashHitboxActive && !this.activeAttackHitApplied) {
          if (Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), playerBounds)) {
            this.activeAttackHitApplied = true;
            this.callbacks.onHitPlayer(this.def.baseAttack, this.dashLabel);
          }
        }
      }

      // Idle subtle breathing / stalking step toward player
      if (this.stage === 'idle' && !this.isLeaping) {
        const dist = playerX - this.x;
        this.sprite.setFlipX(dist > 0);
        if (Math.abs(dist) > 220) {
          const stepSpeed = (this.def.id === 'sdech_kongkaeb' ? 56 : 44) * this.speedMult;
          this.x = Phaser.Math.Clamp(
            this.x + Math.sign(dist) * stepSpeed * dt,
            this.arenaMinX + 95,
            this.arenaMaxX - 95
          );
        }
      }

      // State Machine Tick
      if (this.stage !== 'phase_roar' && time >= this.nextStateAt) {
        if (this.stage === 'idle') {
          this.chooseNextAttack(playerX, time);
        } else if (this.stage === 'windup' || this.stage === 'active') {
          const fn = this.pendingAction;
          this.pendingAction = undefined;
          if (fn) fn();
        } else if (this.stage === 'recovery') {
          this.stage = 'idle';
          this.stageBadge.setVisible(false);
          this.nextStateAt = time + Math.round(420 / this.speedMult);
        }
      }

      // Sync Boss Visual Position
      const breathe = this.stage === 'idle' || this.stage === 'recovery' ? Math.sin(time / 320) * 3 : 0;
      this.sprite.setPosition(this.x, this.y + breathe);
      this.shadow.setPosition(this.x, this.floorY - 2);
      const heightFactor = Math.max(0.4, 1 - (this.floorY - this.y) / 360);
      this.shadow.setScale(heightFactor, heightFactor);
      if (this.throatGlow) {
        this.throatGlow.setPosition(this.x, this.y - 42);
      }
      this.stageBadge.setPosition(this.x, this.y - 175);
    }

    // Update Active Boss Hazards (Shockwaves, Boulders, Mini Tadpoles, Tongue)
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h.alive || time >= h.expiresAt) {
        if (h.sprite.active) h.sprite.destroy();
        this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'tadpole') {
        h.vy += 760 * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.y >= this.floorY - 14) {
          h.y = this.floorY - 14;
          h.vy = -340;
          // Hop toward player
          h.vx = Math.sign(playerX - h.x || 1) * (150 * this.speedMult);
        }
        if (h.x < this.arenaMinX + 30 || h.x > this.arenaMaxX - 30) {
          h.vx *= -1;
        }
      } else {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
      }

      h.sprite.setPosition(h.x, h.y);

      // Boulder floor impact
      if (h.kind === 'boulder' && h.y >= this.floorY - 18) {
        this.telegraphs.playImpactJuice(h.x, this.floorY - 10, 'red', false);
        h.alive = false;
        h.sprite.destroy();
        this.hazards.splice(i, 1);
        continue;
      }

      // Check collision with Player
      const hRect = new Phaser.Geom.Rectangle(
        h.x - h.width / 2,
        h.y - h.height / 2,
        h.width,
        h.height
      );
      if (Phaser.Geom.Intersects.RectangleToRectangle(hRect, playerBounds)) {
        const pullDir = h.kind === 'tongue' ? Math.sign(this.x - playerX) : undefined;
        this.callbacks.onHitPlayer(h.damage, h.label, pullDir);
        if (h.kind !== 'tadpole') {
          h.alive = false;
          h.sprite.destroy();
          this.hazards.splice(i, 1);
        }
      }
    }
  }

  public destroy(): void {
    this.telegraphs.clearAll();
    this.clearHazards();
    this.sprite.destroy();
    this.shadow.destroy();
    this.throatGlow?.destroy();
    this.stageBadge.destroy();
  }
}
