import Phaser from 'phaser';

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

  // ==================== KHMER MYTHIC ARSENAL VFX ====================

  /**
   * 8-Biome Preah Khan elemental crescent wave tinted by active World Map Biome
   */
  public playPreahKhanBiomeSlash(x: number, y: number, dir: number, biomeColorHex: number): void {
    const slash = this.scene.add
      .sprite(x + dir * 56, y - 6, 'fx_slash', 0)
      .setScale(3.4)
      .setTint(biomeColorHex)
      .setFlipX(dir < 0)
      .setDepth(64);
    slash.play('slash_curved');
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());

    const aura = this.scene.add
      .arc(x + dir * 56, y - 4, 42, -55, 55, false, biomeColorHex, 0.35)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setScale(dir, 1)
      .setDepth(63);
    this.scene.tweens.add({
      targets: aura,
      x: x + dir * 92,
      scaleX: dir * 1.45,
      scaleY: 1.45,
      alpha: 0,
      duration: 240,
      onComplete: () => aura.destroy(),
    });
  }

  /**
   * Golden Riel Coin-Shot: spinning golden coin that ricochets off bosses for escalating crit damage!
   */
  public spawnGoldenRielCoin(
    x: number,
    y: number,
    dir: number,
    damageScale = 1,
    ricochetsLeft = 2
  ): SpawnedProjectile {
    const container = this.scene.add.container(x + dir * 24, y - 6).setDepth(63);
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

    return {
      node: container,
      vx: dir * 680,
      vy: -35,
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
}
