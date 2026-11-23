import Phaser from 'phaser';

export interface SpawnedProjectile {
  node: Phaser.GameObjects.Container;
  vx: number;
  vy: number;
  damageScale: number;
  colorHex: number;
  kind: 'arrow' | 'mystic_orb';
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
   */
  public playLbokatorSlash(x: number, y: number, dir: number, stance: number): void {
    const color = stance === 3 ? 0xfacc15 : stance === 2 ? 0xf97316 : 0xfef08a;
    const scale = stance === 3 ? 3.2 : 2.6;

    // Real Ninja Adventure curved slash tinted by Animal Stance
    const slash = this.scene.add
      .sprite(x + dir * 48, y - 4, 'fx_slash', 0)
      .setScale(scale)
      .setTint(color)
      .setFlipX(dir < 0)
      .setDepth(62);
    slash.play('slash_curved');
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());

    // Hanuman 3rd-hit overhead slam dust burst
    if (stance === 3) {
      const ring = this.scene.add
        .ellipse(x + dir * 56, y + 18, 96, 26, 0xfacc15, 0.55)
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
   * 2. Divine Archer: Fast Glowing Reamker Arrow Projectile
   */
  public spawnArcherArrow(x: number, y: number, dir: number, damageScale = 1): SpawnedProjectile {
    const container = this.scene.add.container(x + dir * 24, y - 4).setDepth(62);
    const shaft = this.scene.add.rectangle(0, 0, 26, 3.5, 0xfef08a);
    const tip = this.scene.add.triangle(dir * 14, 0, 0, -5, 10, 0, 0, 5, 0x22c55e).setScale(dir, 1);
    const feather = this.scene.add.rectangle(-dir * 12, 0, 7, 6, 0xf97316);
    container.add([shaft, tip, feather]);

    return {
      node: container,
      vx: dir * 640,
      vy: 0,
      damageScale,
      colorHex: 0x22c55e,
      kind: 'arrow',
      expiresAt: this.scene.time.now + 1200,
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
   * 3. Achar Mystic: Glowing Sacred Orb Projectile
   */
  public spawnMysticOrb(x: number, y: number, dir: number): SpawnedProjectile {
    const container = this.scene.add.container(x + dir * 24, y - 8).setDepth(62);
    const halo = this.scene.add.circle(0, 0, 13, 0xfacc15, 0.35);
    const core = this.scene.add.circle(0, 0, 7, 0xfef08a, 1).setStrokeStyle(2, 0xf59e0b);
    container.add([halo, core]);

    return {
      node: container,
      vx: dir * 480,
      vy: 0,
      damageScale: 1,
      colorHex: 0xfacc15,
      kind: 'mystic_orb',
      expiresAt: this.scene.time.now + 1400,
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
   * 4. Barami Spirit Tamer: Wide Checkered Red-and-White Krama Whip Ribbon Snap
   */
  public playKramaWhipSnap(x: number, y: number, dir: number): void {
    const container = this.scene.add.container(x + dir * 18, y - 4).setDepth(63);
    const segments = 9;
    for (let i = 0; i < segments; i++) {
      const sx = dir * (i * 11);
      const sy = Math.sin((i / segments) * Math.PI) * -22;
      const cell = this.scene.add
        .rectangle(sx, sy, 12, 8, i % 2 === 0 ? 0xdc2626 : 0xffffff)
        .setStrokeStyle(1, 0x450a0a)
        .setAngle(dir * (i * 5 - 15));
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
   * 5. Shadow Hunter: Twin-Blade Crisscross Slash + Optional Purple Shadow Strike Burst
   */
  public playShadowTwinSlash(x: number, y: number, dir: number, isShadowStrike: boolean): void {
    const cx = x + dir * 48;
    const cy = y - 4;
    const g = this.scene.add.graphics().setDepth(64);
    const col = isShadowStrike ? 0xc084fc : 0xe2e8f0;
    const lw = isShadowStrike ? 7 : 4;

    g.lineStyle(lw, col, 0.95);
    g.beginPath();
    g.moveTo(cx - 28, cy - 26);
    g.lineTo(cx + 28, cy + 26);
    g.moveTo(cx + 28, cy - 26);
    g.lineTo(cx - 28, cy + 26);
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
}
