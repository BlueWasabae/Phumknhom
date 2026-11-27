import Phaser from 'phaser';
import type { KhmerClassId } from '@shared/types';
import { vfxManager } from './VFXManager';

export interface SignatureSkillMeta {
  classId: KhmerClassId;
  name: string;
  khmerName: string;
  icon: string;
  accentColor: string;
  cooldownMs: number;
  damageMult: number;
}

export const KHMER_SIGNATURE_SKILLS: Record<KhmerClassId, SignatureSkillMeta> = {
  lbokator: {
    classId: 'lbokator',
    name: 'Hanuman Ground-Shatter',
    khmerName: 'ហនុមានញ័រធរណី',
    icon: '💥',
    accentColor: '#f59e0b',
    cooldownMs: 6500,
    damageMult: 2.65,
  },
  archer: {
    classId: 'archer',
    name: 'Rain of Golden Arrows',
    khmerName: 'ភ្លៀងព្រួញមាសរាមកេរ្តិ៍',
    icon: '🏹',
    accentColor: '#eab308',
    cooldownMs: 6500,
    damageMult: 2.55,
  },
  mystic: {
    classId: 'mystic',
    name: 'Sacred Yant Mandala',
    khmerName: 'មណ្ឌលយ័ន្តសក្តិសិទ្ធិ',
    icon: '☸️',
    accentColor: '#22d3ee',
    cooldownMs: 7000,
    damageMult: 2.8,
  },
  tamer: {
    classId: 'tamer',
    name: 'Naga Spirit Surge',
    khmerName: 'នាគរាជបារមីភ្លោះ',
    icon: '🐉',
    accentColor: '#10b981',
    cooldownMs: 7000,
    damageMult: 2.6,
  },
  shadow: {
    classId: 'shadow',
    name: 'Phantom Lotus Barrage',
    khmerName: 'ផ្កាឈូកស្រមោលពន្លឺ',
    icon: '🌸',
    accentColor: '#a855f7',
    cooldownMs: 6000,
    damageMult: 2.75,
  },
};

export interface SpawnedProjectile {
  node: Phaser.GameObjects.Container;
  vx: number;
  vy: number;
  damageScale: number;
  colorHex: number;
  kind: 'arrow' | 'mystic_orb' | 'riel_coin' | 'evolving_wave';
  ricochetsLeft?: number;
  expiresAt: number;
}

export interface TossedGoldCoin {
  node: Phaser.GameObjects.Container;
  vx: number;
  vy: number;
  expiresAt: number;
}

/**
 * Distinct 5-Class Khmer Combat Animations & VFX Library
 * Aligned with docs/GDD_KHMER_LORE_AND_ANIMATION.md §1
 */
export class ClassCombatVFX {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 1. Lbokator Warrior: 3-Hit Animal-Stance Crescent Melee Smear (Lion -> Crocodile -> Hanuman)
   * Supports true 360° cursor aiming via optional `aimAngle`.
   */
  public playLbokatorSlash(x: number, y: number, dir: number, stance: number, aimAngle?: number): void {
    const color = stance === 3 ? 0xfacc15 : stance === 2 ? 0xf97316 : 0xfef08a;
    const scale = stance === 3 ? 3.2 : 2.6;
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const sx = x + Math.cos(ang) * 48;
    const sy = y - 6 + Math.sin(ang) * 44;

    // Real Ninja Adventure curved slash tinted by Animal Stance & rotated along aimAngle
    const slash = this.scene.add
      .sprite(sx, sy, 'fx_slash', 0)
      .setScale(scale)
      .setTint(color)
      .setRotation(ang)
      .setFlipY(Math.cos(ang) < 0)
      .setDepth(62);
    slash.play('slash_curved');
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());

    // Hanuman 3rd-hit overhead slam dust burst
    if (stance === 3) {
      const ring = this.scene.add
        .ellipse(x + Math.cos(ang) * 56, y + 10 + Math.sin(ang) * 36, 96, 26, 0xfacc15, 0.55)
        .setStrokeStyle(3, 0xffffff)
        .setDepth(61);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 1.7,
        scaleY: 1.5,
        alpha: 0,
        duration: 240,
        onComplete: () => ring.destroy(),
      });
    }
  }

  /**
   * Lbokator forward shoulder-roll golden dust trail
   */
  public playLbokatorDashDust(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const puff = this.scene.add
        .circle(x + (Math.random() - 0.5) * 24, y + 14 + (Math.random() - 0.5) * 10, 5 + Math.random() * 4, 0xfde047, 0.85)
        .setDepth(55);
      this.scene.tweens.add({
        targets: puff,
        y: puff.y - 16,
        alpha: 0,
        scale: 1.8,
        duration: 280 + i * 35,
        onComplete: () => puff.destroy(),
      });
    }
  }

  /**
   * 2. Divine Archer: Fast Glowing Reamker Arrow Projectile (True 360° Cursor Aim)
   */
  public spawnArcherArrow(x: number, y: number, dir: number, damageScale = 1, aimAngle?: number): SpawnedProjectile {
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const container = this.scene.add
      .container(x + Math.cos(ang) * 24, y - 6 + Math.sin(ang) * 24)
      .setRotation(ang)
      .setDepth(62);
    const shaft = this.scene.add.rectangle(0, 0, 26, 3.5, 0xfef08a);
    const tip = this.scene.add.triangle(14, 0, 0, -5, 10, 0, 0, 5, 0x22c55e);
    const feather = this.scene.add.rectangle(-12, 0, 7, 6, 0xf97316);
    container.add([shaft, tip, feather]);
    vfxManager.applyGlow(this.scene, container, 0xfacc15, 2.5, 0.3);

    const speed = 640;
    return {
      node: container,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      damageScale,
      colorHex: 0x22c55e,
      kind: 'arrow',
      expiresAt: this.scene.time.now + 1350,
    };
  }

  /**
   * Impact spark burst for Arrows & Mystic Orbs
   */
  public playImpactSparks(x: number, y: number, colorHex: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
      const spark = this.scene.add.circle(x, y, 3.5, colorHex, 0.95).setDepth(66);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 32,
        y: y + Math.sin(angle) * 32,
        alpha: 0,
        duration: 210,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * 3. Achar Mystic: Glowing Sacred Orb Projectile (True 360° Cursor Aim)
   */
  public spawnMysticOrb(x: number, y: number, dir: number, aimAngle?: number): SpawnedProjectile {
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const container = this.scene.add
      .container(x + Math.cos(ang) * 24, y - 8 + Math.sin(ang) * 24)
      .setDepth(62);
    const halo = this.scene.add.circle(0, 0, 13, 0xfacc15, 0.35);
    const core = this.scene.add.circle(0, 0, 7, 0xfef08a, 1).setStrokeStyle(2, 0xf59e0b);
    container.add([halo, core]);
    vfxManager.applyBloom(this.scene, container, { color: 0xfacc15, strength: 1.4 });

    const speed = 490;
    return {
      node: container,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      damageScale: 1,
      colorHex: 0xfacc15,
      kind: 'mystic_orb',
      expiresAt: this.scene.time.now + 1450,
    };
  }

  /**
   * Spawns a floating golden geometric Khmer Yant rune ring around the target
   */
  public createFloatingYantSigil(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const offsets = [
      [-48, -110],
      [48, -110],
      [0, -165],
    ];
    const [ox, oy] = offsets[index % 3];
    const sigil = this.scene.add.container(x + ox, y + oy).setDepth(65);

    const g = this.scene.add.graphics();
    g.lineStyle(2.5, 0xfacc15, 0.95);
    g.strokeCircle(0, 0, 18);
    g.lineStyle(1.8, 0xfef9c3, 0.9);
    // Inscribed sacred Khmer diamond geometry
    g.strokePoints(
      [
        new Phaser.Geom.Point(0, -16),
        new Phaser.Geom.Point(16, 0),
        new Phaser.Geom.Point(0, 16),
        new Phaser.Geom.Point(-16, 0),
      ],
      true
    );
    sigil.add(g);

    this.scene.tweens.add({
      targets: sigil,
      angle: 360,
      duration: 2800,
      repeat: -1,
    });
    return sigil;
  }

  /**
   * 3-Stack Yant Sacred Detonation Beam
   */
  public playYantDetonationBeam(x: number, floorY: number): void {
    const beam = this.scene.add
      .rectangle(x, floorY - 240, 88, 500, 0xfef08a, 0.78)
      .setStrokeStyle(5, 0xf59e0b)
      .setDepth(68);
    const ring = this.scene.add
      .circle(x, floorY - 70, 22, 0xfacc15, 0.65)
      .setStrokeStyle(4, 0xffffff)
      .setDepth(69);

    this.scene.cameras.main.shake(180, 0.009);
    this.scene.tweens.add({
      targets: beam,
      scaleX: 0.1,
      alpha: 0,
      duration: 380,
      onComplete: () => beam.destroy(),
    });
    this.scene.tweens.add({
      targets: ring,
      scale: 4.2,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Mystic Lotus-Petal Blink Dash burst
   */
  public playMysticLotusBlink(fromX: number, fromY: number, toX: number, toY: number): void {
    for (const [px, py] of [
      [fromX, fromY],
      [toX, toY],
    ]) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const petal = this.scene.add
          .ellipse(px, py, 10, 5, i % 2 === 0 ? 0xf472b6 : 0xfef08a, 0.9)
          .setRotation(a)
          .setDepth(64);
        this.scene.tweens.add({
          targets: petal,
          x: px + Math.cos(a) * 38,
          y: py + Math.sin(a) * 28,
          alpha: 0,
          duration: 320,
          onComplete: () => petal.destroy(),
        });
      }
    }
  }

  /**
   * 4. Barami Spirit Tamer: Wide Checkered Red-and-White Krama Whip Ribbon Snap (360° Aim)
   */
  public playKramaWhipSnap(x: number, y: number, dir: number, aimAngle?: number): void {
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const container = this.scene.add
      .container(x + Math.cos(ang) * 18, y - 6 + Math.sin(ang) * 18)
      .setRotation(ang)
      .setDepth(63);
    const segments = 9;
    for (let i = 0; i < segments; i++) {
      const sx = i * 11;
      const sy = Math.sin((i / segments) * Math.PI) * -20;
      const cell = this.scene.add
        .rectangle(sx, sy, 12, 8, i % 2 === 0 ? 0xdc2626 : 0xffffff)
        .setStrokeStyle(1, 0x450a0a)
        .setAngle(i * 5 - 15);
      container.add(cell);
    }

    this.scene.tweens.add({
      targets: container,
      scaleX: 1.18,
      alpha: 0,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => container.destroy(),
    });
  }

  /**
   * 5. Shadow Hunter: Twin-Blade Crisscross Slash + Optional Purple Shadow Strike Burst (360° Aim)
   */
  public playShadowTwinSlash(x: number, y: number, dir: number, isShadowStrike: boolean, aimAngle?: number): void {
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const cx = x + Math.cos(ang) * 48;
    const cy = y - 6 + Math.sin(ang) * 44;
    const g = this.scene.add.graphics().setPosition(cx, cy).setRotation(ang).setDepth(64);
    const col = isShadowStrike ? 0xc084fc : 0xe2e8f0;
    const lw = isShadowStrike ? 7 : 4;

    g.lineStyle(lw, col, 0.95);
    g.beginPath();
    g.moveTo(-28, -26);
    g.lineTo(28, 26);
    g.moveTo(28, -26);
    g.lineTo(-28, 26);
    g.strokePath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: isShadowStrike ? 260 : 170,
      onComplete: () => g.destroy(),
    });

    if (isShadowStrike) {
      const burst = this.scene.add
        .circle(cx, cy, 18, 0x9333ea, 0.55)
        .setStrokeStyle(4, 0xf0abfc)
        .setDepth(66);
      this.scene.tweens.add({
        targets: burst,
        scale: 3.4,
        alpha: 0,
        duration: 300,
        onComplete: () => burst.destroy(),
      });
    }
  }

  /**
   * Shadow Hunter Smoke-Puff Dash leaving a 0.4s Shadow Afterimage Decoy
   */
  public playShadowDecoyDash(x: number, y: number): void {
    const decoy = this.scene.add
      .ellipse(x, y, 30, 48, 0x7e22ce, 0.55)
      .setStrokeStyle(2, 0xe879f9)
      .setDepth(49);
    for (let i = 0; i < 6; i++) {
      const smoke = this.scene.add
        .circle(x + (Math.random() - 0.5) * 28, y + (Math.random() - 0.5) * 28, 7, 0x3b0764, 0.7)
        .setDepth(51);
      this.scene.tweens.add({
        targets: smoke,
        scale: 2.1,
        alpha: 0,
        duration: 320,
        onComplete: () => smoke.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: decoy,
      alpha: 0,
      duration: 400,
      onComplete: () => decoy.destroy(),
    });
  }

  // ==================== KHMER MYTHIC ARSENAL VFX ====================

  /**
   * 8-Biome Preah Khan elemental crescent wave tinted by active World Map Biome (360° Aim)
   */
  public playPreahKhanBiomeSlash(x: number, y: number, dir: number, biomeColorHex: number, aimAngle?: number): void {
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const sx = x + Math.cos(ang) * 56;
    const sy = y - 6 + Math.sin(ang) * 48;
    const slash = this.scene.add
      .sprite(sx, sy, 'fx_slash', 0)
      .setScale(3.4)
      .setTint(biomeColorHex)
      .setRotation(ang)
      .setFlipY(Math.cos(ang) < 0)
      .setDepth(64);
    slash.play('slash_curved');
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());

    const aura = this.scene.add
      .arc(sx, sy, 42, -55, 55, false, biomeColorHex, 0.35)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setRotation(ang)
      .setDepth(63);
    this.scene.tweens.add({
      targets: aura,
      x: x + Math.cos(ang) * 96,
      y: y - 6 + Math.sin(ang) * 86,
      scaleX: 1.45,
      scaleY: 1.45,
      alpha: 0,
      duration: 240,
      onComplete: () => aura.destroy(),
    });
  }

  /**
   * Golden Riel Coin-Shot: spinning golden coin that ricochets off bosses for escalating crit damage! (360° Aim)
   */
  public spawnGoldenRielCoin(
    x: number,
    y: number,
    dir: number,
    damageScale = 1,
    ricochetsLeft = 2,
    aimAngle?: number
  ): SpawnedProjectile {
    const ang = aimAngle !== undefined ? aimAngle : dir < 0 ? Math.PI : 0;
    const container = this.scene.add
      .container(x + Math.cos(ang) * 24, y - 6 + Math.sin(ang) * 24)
      .setDepth(63);
    const outer = this.scene.add.circle(0, 0, 9, 0xfacc15, 1).setStrokeStyle(2, 0x92400e);
    const inner = this.scene.add.rectangle(0, 0, 5, 5, 0xfef9c3, 1);
    container.add([outer, inner]);
    this.scene.tweens.add({
      targets: outer,
      scaleX: 0.35,
      duration: 90,
      yoyo: true,
      repeat: -1,
    });

    const speed = 680;
    return {
      node: container,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - (aimAngle === undefined ? 35 : 0),
      damageScale,
      colorHex: 0xfacc15,
      kind: 'riel_coin',
      ricochetsLeft,
      expiresAt: this.scene.time.now + 1500,
    };
  }

  /**
   * Parry Reality-Rip: diagonal cyan & magenta dimensional tear cutting across the boss!
   */
  public playParryRealityRip(cx: number, cy: number): void {
    const tearOuter = this.scene.add
      .rectangle(cx, cy, 460, 26, 0xc026d3, 0.75)
      .setAngle(-24)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(72);
    const tearCore = this.scene.add
      .rectangle(cx, cy, 480, 9, 0x67e8f9, 0.98)
      .setAngle(-24)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(73);
    const flash = this.scene.add
      .circle(cx, cy, 34, 0xffffff, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(74);

    this.scene.cameras.main.shake(150, 0.008);
    this.scene.tweens.add({
      targets: [tearOuter, tearCore],
      scaleX: 1.45,
      scaleY: 0.1,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        tearOuter.destroy();
        tearCore.destroy();
      },
    });
    this.scene.tweens.add({
      targets: flash,
      scale: 3.2,
      alpha: 0,
      duration: 280,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Off-Screen Yant Beams: 3 converging sacred golden Khmer Yant pillars descending from above!
   */
  public playOffscreenYantBeams(targetX: number, floorY: number): void {
    const offsets = [-115, 0, 115];
    const angles = [14, 0, -14];
    this.scene.cameras.main.shake(170, 0.007);

    offsets.forEach((ox, idx) => {
      const bx = targetX + ox;
      const beam = this.scene.add
        .rectangle(bx, floorY - 320, 44, 720, 0xfacc15, 0.68)
        .setAngle(angles[idx])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(70);
      const core = this.scene.add
        .rectangle(bx, floorY - 320, 14, 720, 0xffffff, 0.95)
        .setAngle(angles[idx])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(71);

      this.scene.tweens.add({
        targets: [beam, core],
        scaleX: 0.12,
        alpha: 0,
        delay: idx * 70,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => {
          beam.destroy();
          core.destroy();
        },
      });
    });
  }

  /**
   * 1. Preah Khan 0.35s Golden Parry Guard Dome & Successful Counter Shockwave
   */
  public playPreahKhanParryGuard(x: number, y: number, dir: number): void {
    const shield = this.scene.add
      .arc(x + dir * 24, y - 4, 34, -75, 75, false, 0xfacc15, 0.42)
      .setStrokeStyle(4, 0xfef9c3, 1)
      .setScale(dir, 1)
      .setDepth(70);
    this.scene.tweens.add({
      targets: shield,
      alpha: 0.15,
      scaleX: dir * 1.15,
      scaleY: 1.15,
      duration: 350,
      onComplete: () => shield.destroy(),
    });
  }

  public playPreahKhanParrySuccess(x: number, y: number): void {
    const ring = this.scene.add
      .circle(x, y - 6, 20, 0xfacc15, 0.5)
      .setStrokeStyle(5, 0xffffff, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(75);
    this.scene.cameras.main.flash(140, 250, 204, 21);
    this.scene.cameras.main.shake(120, 0.007);
    this.scene.tweens.add({
      targets: ring,
      scale: 4.5,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * 2. Crossbow of the Golden Riel: Flicked Gold Coin Arc + Blinding Golden Lightning Ricochet Chain
   */
  public spawnTossedGoldCoin(x: number, y: number, dir: number): TossedGoldCoin {
    const container = this.scene.add.container(x + dir * 22, y - 24).setDepth(68);
    const halo = this.scene.add.circle(0, 0, 15, 0xfacc15, 0.32).setBlendMode(Phaser.BlendModes.ADD);
    const coin = this.scene.add.circle(0, 0, 9, 0xfacc15, 1).setStrokeStyle(2.5, 0x78350f);
    const gleam = this.scene.add.rectangle(0, 0, 5, 5, 0xffffff, 1);
    container.add([halo, coin, gleam]);
    this.scene.tweens.add({
      targets: coin,
      scaleX: 0.28,
      duration: 85,
      yoyo: true,
      repeat: -1,
    });
    return {
      node: container,
      vx: dir * 195 + (Math.random() - 0.5) * 40,
      vy: -365,
      expiresAt: this.scene.time.now + 2400,
    };
  }

  public playCoinRicochetLightning(points: Array<{ x: number; y: number }>): void {
    if (points.length < 2) return;
    const gOuter = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(74);
    const gCore = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(75);
    gOuter.lineStyle(12, 0xfacc15, 0.85);
    gCore.lineStyle(4, 0xffffff, 1);

    gOuter.beginPath();
    gCore.beginPath();
    gOuter.moveTo(points[0].x, points[0].y);
    gCore.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 18;
      const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 18;
      gOuter.lineTo(mx, my);
      gCore.lineTo(mx, my);
      gOuter.lineTo(p1.x, p1.y);
      gCore.lineTo(p1.x, p1.y);

      const flash = this.scene.add
        .circle(p1.x, p1.y, 18, 0xfef08a, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(76);
      this.scene.tweens.add({
        targets: flash,
        scale: 2.8,
        alpha: 0,
        duration: 240,
        onComplete: () => flash.destroy(),
      });
    }
    gOuter.strokePath();
    gCore.strokePath();

    this.scene.cameras.main.flash(110, 254, 240, 138);
    this.scene.cameras.main.shake(150, 0.008);
    this.scene.tweens.add({
      targets: [gOuter, gCore],
      alpha: 0,
      duration: 290,
      onComplete: () => {
        gOuter.destroy();
        gCore.destroy();
      },
    });
  }

  /**
   * 3. Evolving Blade of Angkor: Golden Yant Wave Projectile scaled by unique Bestiary clears
   */
  public spawnEvolvingYantWave(x: number, y: number, dir: number, scaleMult = 1): SpawnedProjectile {
    const container = this.scene.add.container(x + dir * 32, y - 6).setDepth(64);
    const arc = this.scene.add
      .arc(0, 0, 22 * scaleMult, -65, 65, false, 0xfacc15, 0.72)
      .setStrokeStyle(3, 0xffffff, 0.95)
      .setScale(dir, 1);
    const rune = this.scene.add.rectangle(-dir * 6, 0, 10, 10, 0xfef08a, 0.9).setAngle(45);
    container.add([arc, rune]);

    return {
      node: container,
      vx: dir * 560,
      vy: 0,
      damageScale: 0.65 * scaleMult,
      colorHex: 0xfacc15,
      kind: 'evolving_wave',
      expiresAt: this.scene.time.now + 1050,
    };
  }

  /**
   * 4. Tome of Fractured Yant: 3 Off-Screen Golden Light-Blades slashing in at crisscrossing angles!
   */
  public playFracturedYantCrisscross(targetX: number, targetY: number): void {
    const angles = [-36, 32, -8];
    angles.forEach((deg, idx) => {
      const blade = this.scene.add
        .rectangle(targetX, targetY, 540, 14, 0xfacc15, 0.85)
        .setStrokeStyle(3, 0xffffff, 1)
        .setAngle(deg)
        .setScale(0.15, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(72);
      this.scene.tweens.add({
        targets: blade,
        scaleX: 1.35,
        scaleY: 0.12,
        alpha: 0,
        delay: idx * 65,
        duration: 280,
        ease: 'Cubic.easeOut',
        onComplete: () => blade.destroy(),
      });
    });
  }

  /**
   * 5. Frost Fang of Singha: Glacial Stealth Strike X-Slice + Ice Shards
   */
  public playFrostFangStealthSlice(x: number, y: number, dir: number): void {
    const cx = x + dir * 52;
    const cy = y - 6;
    const g = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(70);
    g.lineStyle(8, 0x38bdf8, 0.95);
    g.beginPath();
    g.moveTo(cx - 42, cy - 36);
    g.lineTo(cx + 42, cy + 36);
    g.moveTo(cx + 42, cy - 36);
    g.lineTo(cx - 42, cy + 36);
    g.strokePath();
    g.lineStyle(3, 0xe0f2fe, 1);
    g.strokePath();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const shard = this.scene.add.rectangle(cx, cy, 10, 4, 0xbae6fd, 0.95).setRotation(a).setDepth(71);
      this.scene.tweens.add({
        targets: shard,
        x: cx + Math.cos(a) * 58,
        y: cy + Math.sin(a) * 58,
        alpha: 0,
        duration: 280,
        onComplete: () => shard.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 260,
      onComplete: () => g.destroy(),
    });
  }

  /**
   * 6. Hanuman Spirit Banner: 3 Fast Golden Monkey-Warrior Spirits Dash-Slashing in V-Formation!
   */
  public playHanumanSpiritFormation(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    onEachStrike: (index: number) => void
  ): void {
    const offsets = [
      { ox: -22, oy: -42 },
      { ox: 0, oy: 0 },
      { ox: -22, oy: 42 },
    ];
    offsets.forEach((off, idx) => {
      const spirit = this.scene.add.container(fromX + off.ox, fromY + off.oy).setDepth(68);
      const aura = this.scene.add.circle(0, 0, 14, 0xfacc15, 0.42).setBlendMode(Phaser.BlendModes.ADD);
      const body = this.scene.add.rectangle(0, 0, 14, 16, 0xfde047, 0.95).setStrokeStyle(2, 0xb45309);
      const crown = this.scene.add.triangle(0, -11, -6, 4, 0, -6, 6, 4, 0xdc2626);
      spirit.add([aura, body, crown]);

      const dashDir = targetX >= fromX ? 1 : -1;
      this.scene.tweens.add({
        targets: spirit,
        x: targetX + dashDir * 72,
        y: targetY + off.oy * 0.45,
        delay: idx * 75,
        duration: 240,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          onEachStrike(idx);
          this.playImpactSparks(targetX, targetY + off.oy * 0.35, 0xfacc15);
          spirit.destroy();
        },
      });
    });
  }

  // ============================================================================
  // UPDATE 1.7: 5 CINEMATIC KHMER CLASS SIGNATURE ACTIVE SKILLS ([Q] / SKILL)
  // ============================================================================

  /**
   * 1. Lbokator Warrior — Hanuman Ground-Shatter
   * Leaps up with golden aura -> slams down with expanding shockwave rings, flying stone debris & hit-stop!
   */
  public playSignatureHanumanShatter(
    x: number,
    floorY: number,
    onImpact: () => void
  ): void {
    const aura = this.scene.add
      .circle(x, floorY - 52, 30, 0xfacc15, 0.42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(68);
    vfxManager.applyBloom(this.scene, aura, { color: 0xfacc15, strength: 1.6 });

    this.scene.tweens.add({
      targets: aura,
      y: floorY - 120,
      scale: 1.4,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: aura,
          y: floorY - 10,
          scale: 2.2,
          alpha: 0,
          duration: 130,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            aura.destroy();
            vfxManager.hitStop(this.scene, 45);
            vfxManager.directionalShake(this.scene, 0.4, 1, 0.013, 210);
            vfxManager.radialShockwave(this.scene, x, floorY - 8, 0xfacc15, 175, 360, 70);
            vfxManager.radialShockwave(this.scene, x, floorY - 8, 0xf97316, 130, 280, 71);
            vfxManager.additiveSparkBurst(this.scene, x, floorY - 14, 0xfef08a, 18, 120, 72);

            // Flying laterite sandstone debris chunks
            for (let i = 0; i < 12; i++) {
              const chunk = this.scene.add
                .rectangle(
                  x + (Math.random() - 0.5) * 90,
                  floorY - 6,
                  6 + Math.random() * 7,
                  6 + Math.random() * 6,
                  i % 2 === 0 ? 0xa8a29e : 0xd97706
                )
                .setStrokeStyle(1, 0x292524)
                .setDepth(72);
              const vx = (Math.random() - 0.5) * 190;
              const vy = -(70 + Math.random() * 110);
              this.scene.tweens.add({
                targets: chunk,
                x: chunk.x + vx,
                y: chunk.y + vy,
                angle: Phaser.Math.Between(-240, 240),
                alpha: 0,
                duration: 420 + Math.random() * 140,
                ease: 'Quad.easeOut',
                onComplete: () => chunk.destroy(),
              });
            }
            onImpact();
          },
        });
      },
    });
  }

  /**
   * 2. Divine Archer — Rain of Golden Arrows
   * Fires a glowing arrow skyward -> rains down 12 blooming golden light-arrows across the boss zone!
   */
  public playSignatureGoldenArrowRain(
    casterX: number,
    casterY: number,
    targetX: number,
    floorY: number,
    onVolleyHit: (waveIndex: number) => void
  ): void {
    // Rising skyward beacon arrow
    const beacon = this.scene.add
      .rectangle(casterX, casterY - 24, 5, 40, 0xfef08a, 0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(70);
    vfxManager.applyGlow(this.scene, beacon, 0xfacc15, 3.8, 0.5);
    this.scene.tweens.add({
      targets: beacon,
      y: 60,
      alpha: 0,
      duration: 240,
      ease: 'Cubic.easeIn',
      onComplete: () => beacon.destroy(),
    });

    // 12 blooming golden light-arrows raining down across target zone
    for (let i = 0; i < 12; i++) {
      const delay = 170 + i * 52;
      const dropX = targetX + (i - 5.5) * 28 + (Math.random() - 0.5) * 16;
      this.scene.time.delayedCall(delay, () => {
        if (!this.scene?.sys?.isActive()) return;
        const arrow = this.scene.add.container(dropX + 32, 75).setDepth(71).setAngle(14);
        const outerAura = this.scene.add
          .rectangle(0, 0, 12, 52, 0xfacc15, 0.38)
          .setBlendMode(Phaser.BlendModes.ADD);
        const shaft = this.scene.add
          .rectangle(0, 0, 4, 44, 0xfef08a, 0.96)
          .setBlendMode(Phaser.BlendModes.ADD);
        const head = this.scene.add.triangle(0, 24, -6, 0, 6, 0, 0, 12, 0xfacc15);
        arrow.add([outerAura, shaft, head]);

        this.scene.tweens.add({
          targets: arrow,
          x: dropX,
          y: floorY - 18,
          duration: 200,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            vfxManager.additiveSparkBurst(this.scene, dropX, floorY - 14, 0xfde047, 6, 36, 72);
            arrow.destroy();
            if (i === 3 || i === 7 || i === 11) {
              vfxManager.directionalShake(this.scene, 0.2, 0.7, 0.006, 90);
              onVolleyHit(i);
            }
          },
        });
      });
    }
  }

  /**
   * 3. Achar Mystic — Sacred Yant Mandala
   * Draws a giant spinning, blooming golden Khmer geometric rune circle that pulses twice & erupts in cyan-gold light pillars!
   */
  public playSignatureSacredMandala(
    targetX: number,
    floorY: number,
    onPulseHit: (erupted: boolean) => void
  ): void {
    const mandala = this.scene.add.container(targetX, floorY - 16).setDepth(66).setScale(0.2);
    const g = this.scene.add.graphics();
    g.lineStyle(4, 0xfacc15, 0.96);
    g.strokeCircle(0, 0, 96);
    g.lineStyle(2.5, 0x22d3ee, 0.92);
    g.strokeCircle(0, 0, 72);
    // Inscribed Khmer sacred 8-point star geometry
    for (let rot = 0; rot < 2; rot++) {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + (rot * Math.PI) / 4;
        pts.push(new Phaser.Geom.Point(Math.cos(ang) * 90, Math.sin(ang) * 90));
      }
      g.lineStyle(2.5, rot === 0 ? 0xfef08a : 0x38bdf8, 0.95);
      g.strokePoints(pts, true);
    }
    mandala.add(g);
    mandala.setScale(1, 0.34);
    vfxManager.applyBloom(this.scene, mandala, { color: 0xfacc15, strength: 1.5 });

    this.scene.tweens.add({
      targets: mandala,
      angle: 220,
      duration: 920,
      ease: 'Sine.easeInOut',
    });

    // Pulse 1
    this.scene.time.delayedCall(260, () => {
      if (!this.scene?.sys?.isActive()) return;
      vfxManager.radialShockwave(this.scene, targetX, floorY - 16, 0x22d3ee, 115, 240, 68);
      onPulseHit(false);
    });

    // Pulse 2 + Cyan-Gold Light Pillars Eruption
    this.scene.time.delayedCall(580, () => {
      if (!this.scene?.sys?.isActive()) return;
      vfxManager.hitStop(this.scene, 45);
      vfxManager.directionalShake(this.scene, 0.5, 1, 0.011, 200);
      for (const ox of [-58, 0, 58]) {
        const pillar = this.scene.add
          .rectangle(targetX + ox, floorY - 220, ox === 0 ? 54 : 30, 440, ox === 0 ? 0x22d3ee : 0xfef08a, 0.8)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(71);
        vfxManager.applyBloom(this.scene, pillar, { color: 0x38bdf8, strength: 1.7 });
        this.scene.tweens.add({
          targets: pillar,
          scaleX: 0.08,
          alpha: 0,
          duration: 420,
          ease: 'Cubic.easeOut',
          onComplete: () => pillar.destroy(),
        });
      }
      vfxManager.additiveSparkBurst(this.scene, targetX, floorY - 80, 0x67e8f9, 20, 115, 73);
      onPulseHit(true);
    });

    this.scene.time.delayedCall(980, () => {
      if (mandala.active) mandala.destroy();
    });
  }

  /**
   * 4. Barami Spirit Tamer — Naga Spirit Surge
   * Summons twin glowing emerald-and-gold spectral serpents weaving in a blooming figure-8 across the arena!
   */
  public playSignatureNagaSurge(
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    onWeaveHit: (passIndex: number) => void
  ): void {
    const colors = [0x10b981, 0xfacc15];
    const centerX = (casterX + targetX) * 0.5;
    const centerY = Math.min(casterY, targetY) - 24;
    const spanX = Math.max(180, Math.abs(targetX - casterX) * 0.85);

    colors.forEach((col, sIdx) => {
      const serpent = this.scene.add.container(casterX, casterY).setDepth(70);
      const segs: Phaser.GameObjects.Arc[] = [];
      for (let k = 0; k < 7; k++) {
        const seg = this.scene.add
          .circle(-k * 10, 0, Math.max(4, 12 - k * 1.1), col, 0.9 - k * 0.08)
          .setBlendMode(Phaser.BlendModes.ADD);
        segs.push(seg);
      }
      const eye = this.scene.add.circle(4, -3, 2.5, 0xffffff, 1);
      serpent.add([...segs, eye]);
      vfxManager.applyGlow(this.scene, serpent, col, 3.6, 0.5);

      const prog = { t: 0 };
      this.scene.tweens.add({
        targets: prog,
        t: Math.PI * 2,
        duration: 820,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const phase = prog.t + sIdx * Math.PI;
          const x = centerX + Math.sin(phase) * spanX;
          const y = centerY + Math.sin(phase * 2) * 76;
          serpent.setPosition(x, y);
          // Trailing glow mote
          if (Math.random() < 0.45) {
            const m = this.scene.add.circle(x, y, 3.5, col, 0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(68);
            this.scene.tweens.add({ targets: m, alpha: 0, scale: 0.2, duration: 200, onComplete: () => m.destroy() });
          }
        },
        onComplete: () => {
          vfxManager.additiveSparkBurst(this.scene, targetX, targetY - 24, col, 12, 74, 72);
          serpent.destroy();
        },
      });
    });

    this.scene.time.delayedCall(260, () => {
      if (!this.scene?.sys?.isActive()) return;
      vfxManager.directionalShake(this.scene, 0.8, 0.4, 0.008, 120);
      onWeaveHit(0);
    });
    this.scene.time.delayedCall(620, () => {
      if (!this.scene?.sys?.isActive()) return;
      vfxManager.hitStop(this.scene, 45);
      vfxManager.radialShockwave(this.scene, targetX, targetY - 24, 0x10b981, 130, 300, 71);
      onWeaveHit(1);
    });
  }

  /**
   * 5. Shadow Hunter — Phantom Lotus Barrage
   * Dashes through target leaving 4 glowing purple afterimage clones + crisscrossing violet slash webs + dark vignette flash!
   */
  public playSignaturePhantomLotus(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    onBarrageComplete: () => void
  ): void {
    // Brief dark violet vignette flash
    const camW = this.scene.scale.width;
    const camH = this.scene.scale.height;
    const vignette = this.scene.add
      .rectangle(camW / 2, camH / 2, camW, camH, 0x1e0836, 0.42)
      .setScrollFactor(0)
      .setDepth(2150);
    this.scene.tweens.add({
      targets: vignette,
      alpha: 0,
      duration: 460,
      onComplete: () => vignette.destroy(),
    });

    // 4 glowing purple afterimage dash clones leading into & past target
    for (let i = 0; i < 4; i++) {
      const frac = (i + 1) / 4;
      const gx = Phaser.Math.Linear(fromX, targetX + (targetX >= fromX ? 64 : -64), frac);
      const gy = Phaser.Math.Linear(fromY, targetY, frac);
      this.scene.time.delayedCall(i * 55, () => {
        if (!this.scene?.sys?.isActive()) return;
        vfxManager.spawnAfterimage(this.scene, gx, gy, 0xa855f7, 1.08, 360, 66);
      });
    }

    // Crisscrossing violet slash webs across the target
    this.scene.time.delayedCall(210, () => {
      if (!this.scene?.sys?.isActive()) return;
      vfxManager.hitStop(this.scene, 45);
      vfxManager.directionalShake(this.scene, 1, 0.6, 0.011, 180);

      const web = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(72);
      const slashes = [
        [-88, -66, 88, 66],
        [88, -66, -88, 66],
        [-98, 6, 98, -14],
        [-54, -84, 54, 84],
        [54, -84, -54, 84],
      ];
      for (const [x1, y1, x2, y2] of slashes) {
        web.lineStyle(7, 0xa855f7, 0.92);
        web.lineBetween(targetX + x1, targetY - 24 + y1, targetX + x2, targetY - 24 + y2);
        web.lineStyle(2.5, 0xf5d0fe, 1);
        web.lineBetween(targetX + x1, targetY - 24 + y1, targetX + x2, targetY - 24 + y2);
      }
      vfxManager.applyBloom(this.scene, web, { color: 0xc084fc, strength: 1.6 });
      vfxManager.radialShockwave(this.scene, targetX, targetY - 24, 0xc084fc, 135, 320, 71);
      vfxManager.additiveSparkBurst(this.scene, targetX, targetY - 24, 0xe879f9, 18, 96, 73);

      this.scene.tweens.add({
        targets: web,
        alpha: 0,
        duration: 340,
        onComplete: () => web.destroy(),
      });
      onBarrageComplete();
    });
  }
}
