import Phaser from 'phaser';

export interface WormBossEntityConfig {
  segmentCount?: number; // trailing segments behind head (default 9 => 10 total)
  spacing?: number;
  baseScale?: number;
  bodyTextureKey?: string;
  tailTextureKey?: string;
  waveAmplitude?: number;
}

/**
 * Reusable Multi-Segment Sinusoidal Serpent Entity (MultiSegmentWormRig)
 * Powers Boss #6 (Neak Reach — Shadow Naga) and future Khmer serpent/wyrm bosses.
 */
export class WormBossEntity {
  public readonly segments: Phaser.GameObjects.Image[] = [];
  private trail: Array<{ x: number; y: number }> = [];
  private spacing: number;
  private waveAmplitude: number;

  constructor(
    scene: Phaser.Scene,
    spawnX: number,
    spawnY: number,
    config: WormBossEntityConfig = {}
  ) {
    const count = config.segmentCount ?? 9;
    this.spacing = config.spacing ?? 36;
    this.waveAmplitude = config.waveAmplitude ?? 9;
    const baseScale = config.baseScale ?? 1.3;
    const bodyTex = config.bodyTextureKey ?? 'boss_neak_reach_seg';
    const tailTex = config.tailTextureKey ?? 'boss_neak_reach_tail';

    for (let i = 0; i < 160; i++) {
      this.trail.push({ x: spawnX + i * 3.5, y: spawnY + Math.sin(i * 0.15) * 18 });
    }

    for (let s = 1; s <= count; s++) {
      const isTail = s === count;
      const segScale = baseScale * (isTail ? 0.85 : Math.max(0.74, 1.04 - s * 0.032));
      const seg = scene.add
        .image(spawnX + s * 34, spawnY, isTail ? tailTex : bodyTex)
        .setOrigin(0.5, 0.5)
        .setScale(segScale)
        .setDepth(41 - s * 0.05);
      this.segments.push(seg);
    }
  }

  public update(time: number, headX: number, headY: number): void {
    const first = this.trail[0];
    if (!first || Phaser.Math.Distance.Between(headX, headY, first.x, first.y) >= 3) {
      this.trail.unshift({ x: headX, y: headY });
      if (this.trail.length > 260) {
        this.trail.pop();
      }
    }

    let trailIdx = 0;
    let prevX = headX;
    let prevY = headY;

    for (let s = 0; s < this.segments.length; s++) {
      let accumulated = 0;
      let targetPt = this.trail[Math.min(trailIdx, this.trail.length - 1)] ?? {
        x: prevX,
        y: prevY,
      };

      while (trailIdx < this.trail.length - 1) {
        const a = this.trail[trailIdx];
        const b = this.trail[trailIdx + 1];
        accumulated += Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        trailIdx += 1;
        if (accumulated >= this.spacing) {
          targetPt = b;
          break;
        }
      }

      const wave = Math.sin(time * 0.0085 - s * 0.65) * this.waveAmplitude;
      const sx = targetPt.x;
      const sy = targetPt.y + wave;
      const seg = this.segments[s];
      seg.setPosition(sx, sy);
      seg.setRotation(Math.atan2(prevY - sy, prevX - sx));
      prevX = sx;
      prevY = sy;
    }
  }

  public intersectsRect(rect: Phaser.Geom.Rectangle): boolean {
    for (const seg of this.segments) {
      if (seg.active && Phaser.Geom.Intersects.RectangleToRectangle(rect, seg.getBounds())) {
        return true;
      }
    }
    return false;
  }

  public setTintFill(color: number): void {
    this.segments.forEach((seg) => seg.setTintFill(color));
  }

  public clearTint(): void {
    this.segments.forEach((seg) => seg.clearTint());
  }

  public destroy(): void {
    this.segments.forEach((seg) => seg.destroy());
    this.segments.length = 0;
    this.trail = [];
  }
}
