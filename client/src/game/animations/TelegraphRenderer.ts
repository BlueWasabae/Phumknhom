import Phaser from 'phaser';

export type TelegraphColor = 'yellow' | 'red' | 'green' | 'purple';

const TELEGRAPH_PALETTE: Record<TelegraphColor, { fill: number; stroke: number; hex: string }> = {
  yellow: { fill: 0xfacc15, stroke: 0xfef08a, hex: '#facc15' },
  red: { fill: 0xef4444, stroke: 0xfca5a5, hex: '#f87171' },
  green: { fill: 0x22c55e, stroke: 0x86efac, hex: '#4ade80' },
  purple: { fill: 0xa855f7, stroke: 0xe879f9, hex: '#c084fc' },
};

export interface BossHazard {
  kind: 'shockwave' | 'boulder' | 'tadpole' | 'tongue' | 'orb' | 'venom_glob' | 'poison_pool';
  sprite: Phaser.GameObjects.Container | Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Ellipse;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  expiresAt: number;
  hp?: number; // Killable mini-mobs like King Frog's tadpoles
  isPoison?: boolean; // Countered by Coconut Water Anti-Venom buff!
  alive: boolean;
  label: string;
}

/**
 * Implements the 4-Stage Boss Telegraph Rule from docs/GDD_KHMER_LORE_AND_ANIMATION.md §3:
 * 1. Wind-Up (0.5s - 0.8s): color flash + translucent ground/line warning marker
 * 2. Active Strike: crisp attack visual & hitbox
 * 3. Impact Juice: 40ms hit-stop freeze on heavy hits, camera shake, white flash, dust burst
 * 4. Recovery Window (0.7s - 1.1s): clear melee punish window
 */
export class TelegraphRenderer {
  private scene: Phaser.Scene;
  private activeGraphics: Set<Phaser.GameObjects.GameObject> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.activeGraphics.add(obj);
    return obj;
  }

  public clearAll(): void {
    this.activeGraphics.forEach((obj) => {
      if (obj.active) obj.destroy();
    });
    this.activeGraphics.clear();
  }

  /**
   * Draws a pulsing translucent ground AOE zone that fills to 100% right at strike execution.
   */
  public showGroundZone(
    cx: number,
    floorY: number,
    width: number,
    height: number,
    color: TelegraphColor,
    durationMs: number
  ): void {
    const pal = TELEGRAPH_PALETTE[color];
    const outer = this.track(
      this.scene.add
        .rectangle(cx, floorY - height / 2, width, height, pal.fill, 0.22)
        .setStrokeStyle(2.5, pal.stroke, 0.92)
        .setDepth(35)
    );
    const innerFill = this.track(
      this.scene.add
        .rectangle(cx, floorY - height / 2, 6, height - 4, pal.fill, 0.48)
        .setDepth(36)
    );

    this.scene.tweens.add({
      targets: innerFill,
      width: Math.max(8, width - 4),
      duration: durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        outer.destroy();
        innerFill.destroy();
        this.activeGraphics.delete(outer);
        this.activeGraphics.delete(innerFill);
      },
    });
  }

  /**
   * Draws a crisp directional lane warning telegraph (for Dash Charge or Sticky Tongue Lash).
   */
  public showLineTelegraph(
    x1: number,
    y: number,
    x2: number,
    thickness: number,
    color: TelegraphColor,
    durationMs: number
  ): void {
    const pal = TELEGRAPH_PALETTE[color];
    const minX = Math.min(x1, x2);
    const w = Math.max(24, Math.abs(x2 - x1));
    const rect = this.track(
      this.scene.add
        .rectangle(minX + w / 2, y, w, thickness, pal.fill, 0.24)
        .setStrokeStyle(2, pal.stroke, 0.95)
        .setDepth(35)
    );

    this.scene.tweens.add({
      targets: rect,
      alpha: 0.65,
      scaleY: 1.15,
      duration: Math.max(120, Math.round(durationMs / 4)),
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        rect.destroy();
        this.activeGraphics.delete(rect);
      },
    });
  }

  /**
   * Draws a growing red ground warning shadow where a ceiling boulder will impact.
   */
  public showFallingShadow(cx: number, floorY: number, radius: number, durationMs: number): void {
    const ring = this.track(
      this.scene.add
        .ellipse(cx, floorY - 4, radius * 2, 16, 0xef4444, 0.28)
        .setStrokeStyle(2, 0xfca5a5, 0.95)
        .setScale(0.3)
        .setDepth(35)
    );
    const marker = this.track(
      this.scene.add
        .text(cx, floorY - 38, '!', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#fca5a5',
          stroke: '#7f1d1d',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(36)
    );

    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0.72,
      duration: durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        ring.destroy();
        marker.destroy();
        this.activeGraphics.delete(ring);
        this.activeGraphics.delete(marker);
      },
    });
  }

  /**
   * Stage 3: Impact Juice — 40ms hit-stop freeze on heavy hits, camera shake, dust burst.
   */
  public playImpactJuice(
    x: number,
    y: number,
    color: TelegraphColor,
    heavy = false
  ): void {
    const pal = TELEGRAPH_PALETTE[color];
    const ring = this.scene.add
      .circle(x, y, heavy ? 22 : 14, pal.fill, 0.45)
      .setStrokeStyle(3, pal.stroke, 0.95)
      .setDepth(68);
    this.scene.tweens.add({
      targets: ring,
      scale: heavy ? 3.2 : 2.1,
      alpha: 0,
      duration: heavy ? 280 : 190,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Ground dust/spark burst
    for (let i = 0; i < (heavy ? 8 : 5); i++) {
      const ang = -Math.PI + (i / (heavy ? 7 : 4)) * Math.PI;
      const dist = (heavy ? 64 : 36) + Math.random() * 24;
      const p = this.scene.add.rectangle(x, y, 6, 6, pal.stroke, 0.95).setDepth(69);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 14,
        alpha: 0,
        scale: 0.2,
        duration: 280,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    this.scene.cameras.main.shake(heavy ? 180 : 95, heavy ? 0.0085 : 0.004);

    if (heavy) {
      this.scene.physics.world.pause();
      window.setTimeout(() => {
        if (this.scene.scene.isActive()) {
          this.scene.physics.world.resume();
        }
      }, 40);
    }
  }

  /**
   * Spawns a visible jumpable ground shockwave traveling horizontally along floorY.
   */
  public createGroundShockwave(
    startX: number,
    floorY: number,
    dir: number,
    speed: number,
    damage: number,
    color: TelegraphColor,
    now: number,
    label: string
  ): BossHazard {
    const pal = TELEGRAPH_PALETTE[color];
    const container = this.scene.add.container(startX, floorY - 20).setDepth(58);
    const waveCore = this.scene.add
      .rectangle(0, 0, 38, 36, pal.fill, 0.85)
      .setStrokeStyle(3, pal.stroke, 1);
    const crest = this.scene.add.triangle(0, -24, -14, 14, 0, -10, 14, 14, pal.stroke, 0.95);
    container.add([waveCore, crest]);

    return {
      kind: 'shockwave',
      sprite: container,
      x: startX,
      y: floorY - 20,
      vx: dir * speed,
      vy: 0,
      width: 36,
      height: 36,
      damage,
      expiresAt: now + 2600,
      alive: true,
      label,
    };
  }
}
