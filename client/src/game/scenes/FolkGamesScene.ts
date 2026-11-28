import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus } from '../EventBus';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../animations/VFXManager';

export type FolkGameMode = 'bos_angkunh' | 'veay_kaom' | 'teanh_prot';

export interface FolkGamesSceneData {
  playerState?: PlayerState;
  game: FolkGameMode;
  returnX?: number;
  returnY?: number;
}

interface AngkunhTargetSeed {
  id: number;
  isCenter: boolean;
  x: number;
  y: number;
  knocked: boolean;
  node: Phaser.GameObjects.Container;
}

/**
 * Update 3.4 — Khmer Village Folk Games Courtyard Mini-Game Scene:
 * 1. Bos Angkunh (បោះអង្គញ់): Cursor-aimed seed tossing; knock outer 4 Kaoy Dam seeds BEFORE center seed!
 * 2. Veay K'aom (វាយក្អម): Swinging Kampong Chhnang clay pot + blindfold vignette + crowd directional cues!
 * 3. Teanh Prot (ទាញព្រ័ត្រ): Rhythm Space/Tap Khmer Tug of War with krama rope marker & Champion badge!
 */
export class FolkGamesScene extends Phaser.Scene {
  private playerState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private mode: FolkGameMode = 'bos_angkunh';
  private returnX = 1195;
  private returnY = 440;

  private hudText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private escKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private finished = false;

  // --- Mode 1: Bos Angkunh ---
  private targetSeeds: AngkunhTargetSeed[] = [];
  private aimGfx?: Phaser.GameObjects.Graphics;
  private powerGfx?: Phaser.GameObjects.Graphics;
  private chargingPower = false;
  private chargePower = 0;
  private shotsLeft = 6;
  private activeSeed?: { node: Phaser.GameObjects.Container; x: number; y: number; vx: number; vy: number };
  private throwOriginX = 480;
  private throwOriginY = 580;

  // --- Mode 2: Veay K'aom ---
  private potNode?: Phaser.GameObjects.Container;
  private stickNode?: Phaser.GameObjects.Container;
  private cueText?: Phaser.GameObjects.Text;
  private potPhase = 0;
  private potStrikesLeft = 3;
  private potSmashed = false;
  private potCenterX = 480;
  private potY = 390;
  private potSwinging = true;
  private lastCueAt = 0;

  // --- Mode 3: Teanh Prot ---
  private ropeMarkerX = 0; // -100 (Player Red Team win) .. +100 (Rival Gold Team win)
  private ropeGfx?: Phaser.GameObjects.Graphics;
  private tugGaugeGfx?: Phaser.GameObjects.Graphics;
  private tugTimeLeft = 22;
  private tugPullCount = 0;
  private tugLastTapAt = 0;

  constructor() {
    super('FolkGamesScene');
  }

  init(data?: FolkGamesSceneData): void {
    this.playerState = data?.playerState ? { ...data.playerState } : { ...INITIAL_PLAYER_STATE };
    this.mode = data?.game ?? 'bos_angkunh';
    this.returnX = data?.returnX ?? 1195;
    this.returnY = data?.returnY ?? 440;
    this.finished = false;
    this.targetSeeds = [];
    this.chargingPower = false;
    this.chargePower = 0;
    this.shotsLeft = 6;
    this.activeSeed = undefined;
    this.potPhase = 0;
    this.potStrikesLeft = 3;
    this.potSmashed = false;
    this.potSwinging = true;
    this.lastCueAt = 0;
    this.ropeMarkerX = 0;
    this.tugTimeLeft = 22;
    this.tugPullCount = 0;
    this.tugLastTapAt = 0;
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.drawFestiveCourtyardBackdrop(w, h);

    // Top HUD bar + Exit button positioned cleanly BELOW the top React HUD bar (y = 156)
    const hudCenterX = w >= 920 ? Math.max(w / 2, 460) : w / 2;
    this.hudText = this.add
      .text(hudCenterX, 156, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef9c3',
        backgroundColor: 'rgba(28, 15, 8, 0.9)',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5, 0)
      .setDepth(120);

    this.bannerText = this.add
      .text(hudCenterX, 194, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde68a',
        backgroundColor: 'rgba(15, 23, 42, 0.84)',
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(120);

    const exitBtn = this.add
      .text(w - 18, 156, '✕ Leave Game', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#b91c1c',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(1, 0)
      .setDepth(130)
      .setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.exitToGreenPark());

    this.escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    if (this.mode === 'bos_angkunh') {
      this.setupBosAngkunh(w, h);
    } else if (this.mode === 'veay_kaom') {
      this.setupVeayKaom(w, h);
    } else {
      this.setupTeanhProt(w, h);
    }

    this.cameras.main.fadeIn(220, 30, 16, 8);
    EventBus.emit('scene:ready', { zone: 'overworld', mapId: 'green_park' });
  }

  private drawFestiveCourtyardBackdrop(w: number, h: number): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x2d4f1e, 1);
    bg.fillRect(0, 0, w, h);

    // Woven Cambodian pandan courtyard mat in the center
    const matW = Math.min(w - 80, 760);
    const matH = Math.min(h - 260, 480);
    const mx = (w - matW) / 2;
    const my = Math.max(228, (h - matH) / 2 + 40);
    bg.fillStyle(0x92400e, 0.94);
    bg.fillRoundedRect(mx - 10, my - 10, matW + 20, matH + 20, 16);
    bg.fillStyle(0xd97706, 0.92);
    bg.fillRoundedRect(mx, my, matW, matH, 12);
    bg.lineStyle(3, 0xfef08a, 0.85);
    bg.strokeRoundedRect(mx, my, matW, matH, 12);

    // Woven checkered krama mat pattern
    bg.lineStyle(1, 0xb45309, 0.4);
    for (let x = mx + 24; x < mx + matW; x += 28) bg.lineBetween(x, my, x, my + matH);
    for (let y = my + 24; y < my + matH; y += 28) bg.lineBetween(mx, y, mx + matW, y);

    // Festive hanging Khmer Krama pennants along upper arena edge
    const pennantColors = [0xdc2626, 0xfacc15, 0x2563eb, 0x16a34a, 0xec4899];
    for (let i = 0; i < 16; i++) {
      const px = mx + (i / 15) * matW;
      bg.fillStyle(pennantColors[i % pennantColors.length], 0.95);
      bg.fillTriangle(px - 14, my - 12, px + 14, my - 12, px, my + 12);
    }
  }

  // ==================== 1. BOS ANGKUNH (SEED TOSSING) ====================
  private setupBosAngkunh(w: number, h: number): void {
    this.throwOriginX = w / 2;
    this.throwOriginY = Math.min(h - 115, 660);
    const pyramidY = Math.max(295, this.throwOriginY - 260);

    // Authentic 5-seed Kaoy Dam pyramid: 4 outer seeds + 1 sacred gold-ringed center seed!
    const offsets: Array<{ dx: number; dy: number; isCenter: boolean }> = [
      { dx: -110, dy: 16, isCenter: false },
      { dx: -56, dy: 4, isCenter: false },
      { dx: 0, dy: -8, isCenter: true },
      { dx: 56, dy: 4, isCenter: false },
      { dx: 110, dy: 16, isCenter: false },
    ];

    offsets.forEach((o, idx) => {
      const sx = w / 2 + o.dx;
      const sy = pyramidY + o.dy;
      const c = this.add.container(sx, sy).setDepth(24);
      const shadow = this.add.ellipse(0, 12, 26, 10, 0x000000, 0.35);
      const seed = this.add
        .ellipse(0, 0, o.isCenter ? 26 : 22, o.isCenter ? 20 : 17, o.isCenter ? 0x7c2d12 : 0x451a03, 1)
        .setStrokeStyle(o.isCenter ? 3 : 2, o.isCenter ? 0xfacc15 : 0xf59e0b);
      const sheen = this.add.ellipse(-4, -4, 8, 5, 0xfef3c7, 0.55);
      const tag = this.add
        .text(0, -20, o.isCenter ? '⭐ CENTER (LAST!)' : `#${idx + 1}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: o.isCenter ? '#fde047' : '#fef3c7',
          stroke: '#1c0f08',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      c.add([shadow, seed, sheen, tag]);
      this.targetSeeds.push({ id: idx, isCenter: o.isCenter, x: sx, y: sy, knocked: false, node: c });
    });

    // Launching Kaoy Bos marker
    this.add.circle(this.throwOriginX, this.throwOriginY, 18, 0xfacc15, 0.2).setStrokeStyle(2, 0xfef08a, 0.9).setDepth(18);
    this.aimGfx = this.add.graphics().setDepth(22);
    this.powerGfx = this.add.graphics().setDepth(28);

    this.bannerText.setText(
      '🌰 BOS ANGKUNH (បោះអង្គញ់): Aim with Mouse, HOLD Click to Charge, RELEASE to Toss! Knock OUTER seeds BEFORE Center!'
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.finished || this.activeSeed || pointer.y < 210) return;
      this.chargingPower = true;
      this.chargePower = 0.15;
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.chargingPower || this.finished) return;
      this.chargingPower = false;
      this.powerGfx?.clear();
      this.launchAngkunhSeed(pointer.x, pointer.y, this.chargePower);
    });
  }

  private launchAngkunhSeed(targetX: number, targetY: number, power: number): void {
    if (this.shotsLeft <= 0 || this.activeSeed) return;
    this.shotsLeft -= 1;
    soundManager.playSfx('swing');

    const angle = Phaser.Math.Angle.Between(this.throwOriginX, this.throwOriginY, targetX, targetY);
    const speed = 320 + power * 520;
    const node = this.add.container(this.throwOriginX, this.throwOriginY).setDepth(26);
    const disc = this.add.ellipse(0, 0, 22, 16, 0x9a3412, 1).setStrokeStyle(2.5, 0xfef08a);
    const glint = this.add.circle(-4, -3, 3.5, 0xffffff, 0.65);
    node.add([disc, glint]);
    this.activeSeed = {
      node,
      x: this.throwOriginX,
      y: this.throwOriginY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }

  // ==================== 2. VEAY K'AOM (SMASH THE CLAY POT) ====================
  private setupVeayKaom(w: number, h: number): void {
    this.potCenterX = w / 2;
    this.potY = Math.max(335, h * 0.48);

    // Blindfold atmospheric twilight vignette
    this.add.rectangle(w / 2, h / 2, w, h, 0x090612, 0.68).setDepth(15);

    // Overhead rope beam
    const ropeGfx = this.add.graphics().setDepth(18);
    ropeGfx.lineStyle(4, 0x78350f, 1);
    ropeGfx.lineBetween(w / 2 - 220, this.potY - 115, w / 2 + 220, this.potY - 115);

    // Swinging Kampong Chhnang Terracotta Clay Pot
    this.potNode = this.add.container(this.potCenterX, this.potY).setDepth(24);
    const stringLine = this.add.rectangle(0, -58, 3, 92, 0xfef3c7, 0.85);
    const potBody = this.add.ellipse(0, 8, 52, 46, 0xc2410c, 1).setStrokeStyle(3, 0x451a03);
    const potRim = this.add.ellipse(0, -14, 34, 12, 0xea580c, 1).setStrokeStyle(2, 0x451a03);
    const potPattern = this.add.rectangle(0, 6, 42, 6, 0xfacc15, 0.78);
    this.potNode.add([stringLine, potBody, potRim, potPattern]);
    // Dim pot subtly to simulate blindfold tension while crowd cues guide you!
    this.potNode.setAlpha(0.26);

    // Strike target zone & bamboo stick below
    this.add.circle(this.potCenterX, this.potY + 8, 34, 0xfacc15, 0.14).setStrokeStyle(2.5, 0xfef08a, 0.7).setDepth(20);
    this.stickNode = this.add.container(this.potCenterX, this.potY + 115).setDepth(28);
    const stick = this.add.rectangle(0, -34, 10, 96, 0x84cc16, 1).setStrokeStyle(2, 0x365314);
    this.stickNode.add(stick);

    this.cueText = this.add
      .text(this.potCenterX, this.potY - 135, '👂 Listen to the Crowd...', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1e1b4b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(125);

    this.bannerText.setText(
      '🏺 VEAY K’AOM (វាយក្អម): Wait for the Crowd Cue "🎯 STRIKE NOW!", then press [SPACE] or CLICK to smash the clay pot!'
    );

    const swingStick = () => {
      if (this.finished || this.potSmashed || !this.potNode) return;
      soundManager.playSfx('swing');
      this.tweens.add({
        targets: this.stickNode,
        angle: -65,
        y: this.potY + 70,
        duration: 110,
        yoyo: true,
        ease: 'Back.easeOut',
      });

      const dist = Math.abs(this.potNode.x - this.potCenterX);
      if (dist <= 44) {
        this.potSmashed = true;
        this.potSwinging = false;
        this.potNode.setAlpha(1);
        soundManager.playSfx('victory');
        vfxManager.playSpriteVfx(this, 'vfx_explosion_pixel', this.potNode.x, this.potY, { scale: 2.0, additive: true, depth: 80 });
        // Burst white rice flour particles + coins!
        for (let i = 0; i < 22; i++) {
          const ang = (i / 22) * Math.PI * 2;
          const distP = 40 + Math.random() * 110;
          const p = this.add
            .circle(this.potNode.x, this.potY, 4 + Math.random() * 5, i % 3 === 0 ? 0xfacc15 : 0xf8fafc, 0.95)
            .setDepth(85);
          this.tweens.add({
            targets: p,
            x: this.potNode.x + Math.cos(ang) * distP,
            y: this.potY + Math.sin(ang) * distP + 25,
            alpha: 0,
            duration: 720,
            onComplete: () => p.destroy(),
          });
        }
        this.potNode.setVisible(false);
        const wonCrown = Math.random() < 0.45;
        this.cueText?.setText(wonCrown ? '👑 SMASHED! RARE CLAY POT CROWN WON!' : '💥 SMASHED! FLOUR & COINS SHOWER!');
        this.finishFolkGame(true, 220, 28, wonCrown ? 'hat_clay_pot_crown' : undefined);
      } else {
        this.potStrikesLeft -= 1;
        soundManager.playSfx('hit');
        vfxManager.spawnFloatingText(this, this.potCenterX, this.potY + 42, '💨 Whiffed! Listen closer!', '#fca5a5', '15px', {
          depth: 90,
        });
        if (this.potStrikesLeft <= 0) {
          this.finishFolkGame(false, 50, 10);
        }
      }
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y >= 210) swingStick();
    });
    this.spaceKey?.on('down', swingStick);
  }

  // ==================== 3. TEANH PROT (KHMER TUG OF WAR) ====================
  private setupTeanhProt(w: number, h: number): void {
    this.ropeGfx = this.add.graphics().setDepth(24);
    this.tugGaugeGfx = this.add.graphics().setDepth(28);

    const cy = Math.max(380, h * 0.54);
    this.add
      .text(w / 2 - 220, cy - 88, '🔴 YOUR TEAM (RED KRAMA)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fecaca',
        backgroundColor: 'rgba(153, 27, 27, 0.88)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.add
      .text(w / 2 + 220, cy - 88, '🟡 RIVAL TEAM (GOLD LOTUS)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(146, 64, 14, 0.88)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.bannerText.setText(
      '🪢 TEANH PROT (ទាញព្រ័ត្រ): Rapidly tap [SPACE] or CLICK in rhythm to pull the red krama ribbon across your line!'
    );

    const doPull = () => {
      if (this.finished) return;
      const now = this.time.now;
      if (now - this.tugLastTapAt < 65) return;
      this.tugLastTapAt = now;
      this.tugPullCount += 1;
      this.ropeMarkerX = Phaser.Math.Clamp(this.ropeMarkerX - 7.8, -100, 100);
      soundManager.playSfx('click');
      this.cameras.main.shake(45, 0.0025);
      if (this.ropeMarkerX <= -100) {
        soundManager.playSfx('victory');
        this.finishFolkGame(true, 260, 32, undefined, 'badge_tug_of_war_champ');
      }
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y >= 210) doPull();
    });
    this.spaceKey?.on('down', doPull);
  }

  update(time: number, delta: number): void {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.exitToGreenPark();
      return;
    }
    if (this.finished) return;
    const dt = Math.min(0.05, delta / 1000);
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.mode === 'bos_angkunh') {
      this.updateBosAngkunh(dt);
    } else if (this.mode === 'veay_kaom') {
      this.updateVeayKaom(time, dt);
    } else {
      this.updateTeanhProt(w, h, dt);
    }
  }

  private updateBosAngkunh(dt: number): void {
    const outerRemaining = this.targetSeeds.filter((s) => !s.isCenter && !s.knocked).length;
    const centerKnocked = this.targetSeeds.some((s) => s.isCenter && s.knocked);
    this.hudText.setText(
      `🌰 Bos Angkunh  ·  Outer Seeds Left: ${outerRemaining}/4  ·  Center: ${centerKnocked ? 'Knocked' : 'Standing'}  ·  Throws Left: ${this.shotsLeft}`
    );

    // Draw cursor aim line & charging bar
    this.aimGfx?.clear();
    if (!this.activeSeed && this.aimGfx) {
      const ptr = this.input.activePointer;
      const ang = Phaser.Math.Angle.Between(this.throwOriginX, this.throwOriginY, ptr.x, ptr.y);
      this.aimGfx.lineStyle(2.5, 0xfef08a, 0.85);
      for (let d = 22; d <= 165; d += 18) {
        this.aimGfx.fillStyle(0xfef08a, 0.9);
        this.aimGfx.fillCircle(this.throwOriginX + Math.cos(ang) * d, this.throwOriginY + Math.sin(ang) * d, 3);
      }
    }

    if (this.chargingPower && this.powerGfx) {
      this.chargePower = Math.min(1, this.chargePower + dt * 1.15);
      this.powerGfx.clear();
      this.powerGfx.fillStyle(0x1e293b, 0.9);
      this.powerGfx.fillRoundedRect(this.throwOriginX - 55, this.throwOriginY + 26, 110, 14, 6);
      this.powerGfx.fillStyle(this.chargePower > 0.78 ? 0xef4444 : 0x22c55e, 1);
      this.powerGfx.fillRoundedRect(this.throwOriginX - 52, this.throwOriginY + 29, 104 * this.chargePower, 8, 4);
    }

    if (this.activeSeed) {
      const s = this.activeSeed;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= Math.pow(0.45, dt);
      s.vy *= Math.pow(0.45, dt);
      s.node.setPosition(s.x, s.y);
      s.node.angle += 540 * dt;

      for (const target of this.targetSeeds) {
        if (target.knocked) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) < 28) {
          target.knocked = true;
          soundManager.playSfx('hit');
          vfxManager.playSpriteVfx(this, 'vfx_impact_hit', target.x, target.y, { scale: 1.4, additive: true, depth: 50 });
          this.tweens.add({
            targets: target.node,
            y: target.y - 32,
            angle: 110,
            alpha: 0.25,
            duration: 320,
          });

          // Authentic Bos Angkunh Rule: hitting Center seed while ANY outer seed stands forfeits the round!
          if (target.isCenter && outerRemaining > 0) {
            vfxManager.spawnFloatingText(this, target.x, target.y - 24, '❌ CENTER HIT FIRST — ROUND FORFEIT!', '#fca5a5', '15px', {
              depth: 90,
            });
            s.node.destroy();
            this.activeSeed = undefined;
            this.finishFolkGame(false, 45, 12);
            return;
          }
          // Win condition: All outer cleared AND center knocked!
          if (target.isCenter && outerRemaining === 0) {
            soundManager.playSfx('victory');
            vfxManager.spawnFloatingText(this, target.x, target.y - 24, '🏆 PERFECT BOS ANGKUNH CLEAR!', '#fde047', '16px', {
              depth: 90,
            });
            s.node.destroy();
            this.activeSeed = undefined;
            this.finishFolkGame(true, 240, 30);
            return;
          }
        }
      }

      if (Math.hypot(s.vx, s.vy) < 40 || s.y < 180 || s.y > this.scale.height) {
        s.node.destroy();
        this.activeSeed = undefined;
        const knockedTotal = this.targetSeeds.filter((t) => t.knocked).length;
        if (this.shotsLeft <= 0) {
          this.finishFolkGame(knockedTotal >= 3, 60 + knockedTotal * 35, 10 + knockedTotal * 4);
        }
      }
    }
  }

  private updateVeayKaom(time: number, dt: number): void {
    this.hudText.setText(
      `🏺 Veay K'aom  ·  Swings Remaining: ${'🎋'.repeat(Math.max(0, this.potStrikesLeft))}  ·  Follow the Crowd Cues!`
    );
    if (!this.potNode || !this.potSwinging) return;

    this.potPhase += dt * 2.15;
    const offsetX = Math.sin(this.potPhase) * 185;
    this.potNode.setPosition(this.potCenterX + offsetX, this.potY + Math.cos(this.potPhase * 2) * 8);

    if (time - this.lastCueAt > 180) {
      this.lastCueAt = time;
      if (Math.abs(offsetX) <= 38) {
        this.cueText?.setText('🎯 CROWD CHEER: STRIKE NOW!!').setColor('#4ade80');
      } else if (offsetX < 0) {
        this.cueText?.setText('⬅️ CROWD: Pot is to the LEFT...').setColor('#fde047');
      } else {
        this.cueText?.setText('➡️ CROWD: Pot is to the RIGHT...').setColor('#fde047');
      }
    }
  }

  private updateTeanhProt(w: number, h: number, dt: number): void {
    this.tugTimeLeft = Math.max(0, this.tugTimeLeft - dt);
    // Rival village team pulls steadily right with rhythmic surges
    const rivalPull = 20 + Math.sin(this.time.now * 0.006) * 7;
    this.ropeMarkerX = Phaser.Math.Clamp(this.ropeMarkerX + rivalPull * dt, -100, 100);

    if (this.ropeMarkerX >= 100) {
      this.finishFolkGame(false, 65, 14);
      return;
    }
    if (this.tugTimeLeft <= 0) {
      const won = this.ropeMarkerX < 0;
      this.finishFolkGame(won, won ? 220 : 70, won ? 28 : 14, undefined, won ? 'badge_tug_of_war_champ' : undefined);
      return;
    }

    const cy = Math.max(380, h * 0.54);
    const span = Math.min(260, w * 0.28);
    const markerPx = w / 2 + (this.ropeMarkerX / 100) * span;

    if (this.ropeGfx) {
      this.ropeGfx.clear();
      // Center line & win thresholds
      this.ropeGfx.lineStyle(3, 0xfef08a, 0.7);
      this.ropeGfx.lineBetween(w / 2, cy - 60, w / 2, cy + 60);
      this.ropeGfx.lineStyle(4, 0xef4444, 0.9);
      this.ropeGfx.lineBetween(w / 2 - span, cy - 50, w / 2 - span, cy + 50);
      this.ropeGfx.lineStyle(4, 0xf59e0b, 0.9);
      this.ropeGfx.lineBetween(w / 2 + span, cy - 50, w / 2 + span, cy + 50);

      // Thick braided Khmer hemp rope
      this.ropeGfx.lineStyle(10, 0x78350f, 1);
      this.ropeGfx.lineBetween(markerPx - 250, cy, markerPx + 250, cy);
      this.ropeGfx.lineStyle(5, 0xfde68a, 0.85);
      this.ropeGfx.lineBetween(markerPx - 250, cy - 1, markerPx + 250, cy - 1);

      // Red Krama center knot marker
      this.ropeGfx.fillStyle(0xdc2626, 1);
      this.ropeGfx.fillRoundedRect(markerPx - 10, cy - 18, 20, 42, 4);
      this.ropeGfx.lineStyle(2, 0xfef08a, 1);
      this.ropeGfx.strokeRoundedRect(markerPx - 10, cy - 18, 20, 42, 4);
    }

    this.hudText.setText(
      `🪢 Teanh Prot  ·  Pulls: ${this.tugPullCount}  ·  Rope Lead: ${Math.round(-this.ropeMarkerX)}%  ·  ⏱ ${Math.ceil(this.tugTimeLeft)}s`
    );
  }

  private finishFolkGame(
    won: boolean,
    coinsEarned: number,
    friendlyXp: number,
    bonusItemId?: string,
    badgeId?: string
  ): void {
    if (this.finished) return;
    this.finished = true;

    EventBus.emit('folkGame:completed', {
      game: this.mode,
      won,
      coinsEarned,
      friendlyXp,
      bonusItemId,
      badgeId,
    });

    this.time.delayedCall(1250, () => {
      this.exitToGreenPark();
    });
  }

  private exitToGreenPark(): void {
    this.cameras.main.fadeOut(220, 12, 16, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: 'green_park',
        spawnX: this.returnX,
        spawnY: this.returnY,
        playerState: { ...this.playerState, zone: 'overworld', currentMapId: 'green_park' },
      });
    });
  }
}
