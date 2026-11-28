import Phaser from 'phaser';
import { vfxManager } from './VFXManager';

export type TelegraphColor = 'yellow' | 'red' | 'green' | 'purple';

const TELEGRAPH_PALETTE: Record<TelegraphColor, { fill: number; stroke: number; hex: string }> = {
  yellow: { fill: 0xfacc15, stroke: 0xfef08a, hex: '#facc15' },
  red: { fill: 0xef4444, stroke: 0xfca5a5, hex: '#f87171' },
  green: { fill: 0x22c55e, stroke: 0x86efac, hex: '#4ade80' },
  purple: { fill: 0xa855f7, stroke: 0xe879f9, hex: '#c084fc' },
};

export interface BossHazard {
  kind:
    | 'shockwave'
    | 'boulder'
    | 'tadpole'
    | 'tongue'
    | 'orb'
    | 'venom_glob'
    | 'poison_pool'
    | 'boomerang_axe'
    | 'crystal_beam'
    | 'magma_vent'
    | 'chakram';
  sprite:
    | Phaser.GameObjects.Container
    | Phaser.GameObjects.Sprite
    | Phaser.GameObjects.Arc
    | Phaser.GameObjects.Rectangle
    | Phaser.GameObjects.Ellipse;
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
  /** Optional boomerang return timer & origin X for Ream Eyso's Lightning Axe */
  boomerangReturnAt?: number;
  boomerangOriginX?: number;
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
   * Stage 3: Impact Juice — 45ms hit-stop freeze on heavy hits, camera shake, animated pixel-art VFX burst.
   */
  public playImpactJuice(
    x: number,
    y: number,
    color: TelegraphColor,
    heavy = false
  ): void {
    const pal = TELEGRAPH_PALETTE[color];
    const animKey =
      color === 'green'
        ? 'vfx_poison_orb'
        : color === 'purple'
          ? 'vfx_magic_burst'
          : color === 'yellow'
            ? 'vfx_lightning_burst'
            : heavy
              ? 'vfx_explosion_pixel'
              : 'vfx_impact_hit';
    vfxManager.playSpriteVfx(this.scene, animKey, x, y - (heavy ? 18 : 8), {
      scale: heavy ? 2.2 : 1.55,
      additive: true,
      depth: 70,
    });
    if (heavy) {
      vfxManager.playSpriteVfx(this.scene, 'vfx_shockwave', x, y - 6, {
        scale: 2.1,
        tint: pal.fill,
        additive: true,
        depth: 69,
      });
    }

    const ring = this.scene.add
      .ellipse(x, y, heavy ? 44 : 26, heavy ? 16 : 10, pal.fill, 0.35)
      .setStrokeStyle(2.5, pal.stroke, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(68);
    this.scene.tweens.add({
      targets: ring,
      scaleX: heavy ? 2.8 : 1.9,
      scaleY: heavy ? 2.2 : 1.5,
      alpha: 0,
      duration: heavy ? 280 : 190,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.scene.cameras.main.shake(heavy ? 180 : 95, heavy ? 0.0085 : 0.004);

    if (heavy) {
      vfxManager.hitStop(this.scene, 45);
    }
  }

  /**
   * Spawns an animated 16-bit pixel-art ground shockwave traveling horizontally along floorY
   * (zero primitive squares/triangles — uses looping pixel-art energy/flame crests + bloom glow!).
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
    const container = this.scene.add.container(startX, floorY - 22).setDepth(58);

    const glow = this.scene.add
      .ellipse(0, 6, 46, 20, pal.fill, 0.42)
      .setBlendMode(Phaser.BlendModes.ADD);
    container.add(glow);

    // Choose authentic animated pixel-art VFX sheet matching the boss element
    const vfxTex =
      color === 'green'
        ? 'vfx_poison_orb'
        : color === 'purple'
          ? 'vfx_magic_burst'
          : color === 'yellow'
            ? 'vfx_lightning_burst'
            : 'vfx_fire_pillar';
    const vfxAnim = `${vfxTex}_anim`;

    if (this.scene.textures.exists(vfxTex) && this.scene.anims.exists(vfxAnim)) {
      const fxSprite = this.scene.add
        .sprite(0, -6, vfxTex, 0)
        .setScale(color === 'red' ? 1.55 : 1.75)
        .setFlipX(dir < 0)
        .setTint(pal.stroke)
        .setBlendMode(Phaser.BlendModes.ADD)
        .play({ key: vfxAnim, repeat: -1 });
      container.add(fxSprite);
    } else {
      // Crisp curved crescent energy wave fallback (never raw square+triangle)
      const waveGfx = this.scene.add.graphics();
      waveGfx.fillStyle(pal.fill, 0.85);
      waveGfx.fillEllipse(0, 2, 34, 28);
      waveGfx.fillStyle(pal.stroke, 0.95);
      waveGfx.fillEllipse(dir * 4, -2, 22, 18);
      container.add(waveGfx);
    }

    // Subtle secondary ground spark crest
    if (this.scene.textures.exists('vfx_shockwave') && this.scene.anims.exists('vfx_shockwave_anim')) {
      const baseWave = this.scene.add
        .sprite(0, 10, 'vfx_shockwave', 0)
        .setScale(1.1, 0.65)
        .setTint(pal.fill)
        .setBlendMode(Phaser.BlendModes.ADD)
        .play({ key: 'vfx_shockwave_anim', repeat: -1 });
      container.add(baseWave);
    }

    vfxManager.applyGlow(this.scene, container, pal.fill, 2.6, 0.38);

    return {
      kind: 'shockwave',
      sprite: container,
      x: startX,
      y: floorY - 20,
      vx: dir * speed,
      vy: 0,
      width: 38,
      height: 40,
      damage,
      expiresAt: now + 2600,
      alive: true,
      label,
    };
  }
}
