import Phaser from 'phaser';
import { seasonClock } from '../systems/SeasonClock';
import { soundManager } from '../systems/SoundManager';

export type KhmerMountId = 'mount_village_bicycle' | 'mount_water_buffalo' | 'mount_mini_tuk_tuk';

export interface MountSpec {
  id: KhmerMountId;
  name: string;
  khmerName: string;
  speedBonusPct: number;
  seatOffsetY: number;
  hasHeadlights: boolean;
  hasDustTrail: boolean;
  allowsPassenger: boolean;
}

export const KHMER_MOUNT_SPECS: Record<KhmerMountId, MountSpec> = {
  mount_village_bicycle: {
    id: 'mount_village_bicycle',
    name: 'Village Bicycle',
    khmerName: 'កង់ភូមិខ្មែរ',
    speedBonusPct: 0.35,
    seatOffsetY: -6,
    hasHeadlights: false,
    hasDustTrail: false,
    allowsPassenger: false,
  },
  mount_water_buffalo: {
    id: 'mount_water_buffalo',
    name: 'Water Buffalo',
    khmerName: 'ក្របីស្រែខ្មែរ',
    speedBonusPct: 0.45,
    seatOffsetY: -10,
    hasHeadlights: false,
    hasDustTrail: true,
    allowsPassenger: false,
  },
  mount_mini_tuk_tuk: {
    id: 'mount_mini_tuk_tuk',
    name: 'Mini Tuk-Tuk',
    khmerName: 'រ៉ឺម៉ក់កង់បីខ្មែរ',
    speedBonusPct: 0.6,
    seatOffsetY: -8,
    hasHeadlights: true,
    hasDustTrail: true,
    allowsPassenger: true,
  },
};

export function getMountSpec(mountId: string | null | undefined): MountSpec | null {
  if (!mountId) return null;
  return (KHMER_MOUNT_SPECS as Record<string, MountSpec>)[mountId] ?? null;
}

/**
 * Crisp 16-bit pixel-art Rideable Khmer Mount entity rendered underneath the player:
 * - Village Bicycle (+35% speed, woven basket & spoked wheels)
 * - Water Buffalo (+45% speed, curved horns & gentle dust puffs)
 * - 2-Seat Mini Tuk-Tuk (+60% speed, night headlight beams, [H] horn, passenger seat!)
 */
export class MountEntity {
  public readonly container: Phaser.GameObjects.Container;
  public mountId: KhmerMountId | null = null;

  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private headlightBeam: Phaser.GameObjects.Triangle;
  private headlightGlow: Phaser.GameObjects.Image;
  private lastDustAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.ensureMountTextures(scene);

    this.headlightBeam = scene.add
      .triangle(28, 2, 0, 0, 62, -20, 62, 20, 0xfef08a, 0.24)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.headlightGlow = scene.add
      .image(20, 2, 'torch_glow')
      .setTint(0xfef08a)
      .setScale(0.55)
      .setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.sprite = scene.add.image(0, 0, 'mount_tex_mount_village_bicycle').setOrigin(0.5, 0.72);
    this.container = scene.add.container(x, y, [this.headlightBeam, this.headlightGlow, this.sprite]);
    this.container.setVisible(false);
  }

  private ensureMountTextures(scene: Phaser.Scene): void {
    const mk = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) return;
      const tex = scene.textures.createCanvas(key, w, h);
      if (!tex) return;
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    };

    const O = '#2b1b17';

    // 1. Village Bicycle (mint-teal frame + front woven rattan basket + spoked wheels)
    mk('mount_tex_mount_village_bicycle', 42, 28, (ctx) => {
      // Rear & front wheels
      for (const wx of [4, 28]) {
        ctx.fillStyle = O;
        ctx.fillRect(wx, 14, 10, 10);
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx + 1, 15, 8, 8);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(wx + 3, 17, 4, 4);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(wx + 4, 18, 2, 2);
      }
      // Mint frame
      ctx.fillStyle = O;
      ctx.fillRect(9, 10, 22, 6);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(10, 11, 20, 4);
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(18, 14, 4, 5);
      // Saddle & handlebars
      ctx.fillStyle = '#78350f';
      ctx.fillRect(11, 7, 7, 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(28, 6, 4, 7);
      // Rattan basket on front
      ctx.fillStyle = O;
      ctx.fillRect(32, 7, 8, 7);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(33, 8, 6, 5);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(34, 9, 4, 2);
    });

    // 2. Cambodian Water Buffalo (Krabey — sturdy grey-slate hide, curved horns, red collar)
    mk('mount_tex_mount_water_buffalo', 48, 32, (ctx) => {
      // Legs
      for (const lx of [8, 16, 28, 34]) {
        ctx.fillStyle = O;
        ctx.fillRect(lx, 20, 5, 10);
        ctx.fillStyle = '#475569';
        ctx.fillRect(lx + 1, 20, 3, 8);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lx + 1, 27, 3, 2);
      }
      // Barrel body
      ctx.fillStyle = O;
      ctx.fillRect(6, 9, 32, 14);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(7, 10, 30, 12);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(9, 11, 24, 4);
      // Red Khmer woven saddle cloth
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(15, 9, 12, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(16, 15, 10, 2);
      // Head & curved horns
      ctx.fillStyle = O;
      ctx.fillRect(35, 8, 11, 11);
      ctx.fillStyle = '#475569';
      ctx.fillRect(36, 9, 9, 9);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(38, 4, 3, 5);
      ctx.fillRect(35, 3, 4, 2);
      ctx.fillRect(42, 5, 3, 4);
      // Eye & snout
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(42, 12, 2, 2);
    });

    // 3. 2-Seat Royal Khmer Mini Tuk-Tuk (Emerald-Gold canopy, red seat, headlamp, spoked wheels)
    mk('mount_tex_mount_mini_tuk_tuk', 54, 34, (ctx) => {
      // Overhead royal canopy roof
      ctx.fillStyle = O;
      ctx.fillRect(4, 2, 34, 8);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(5, 3, 32, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 7, 32, 2);
      // Canopy pillars
      ctx.fillStyle = '#facc15';
      ctx.fillRect(6, 9, 2, 11);
      ctx.fillRect(33, 9, 2, 11);
      // Back passenger plush crimson seat & front cabin
      ctx.fillStyle = O;
      ctx.fillRect(4, 15, 44, 13);
      ctx.fillStyle = '#166534';
      ctx.fillRect(5, 16, 42, 11);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(7, 14, 14, 7);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 22, 42, 2);
      // Front windshield & bright yellow headlight
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(35, 11, 7, 7);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(46, 18, 4, 5);
      // Wheels
      for (const wx of [10, 36]) {
        ctx.fillStyle = O;
        ctx.fillRect(wx, 24, 9, 9);
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx + 1, 25, 7, 7);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(wx + 3, 27, 3, 3);
      }
    });
  }

  public setMount(mountId: string | null | undefined): void {
    const spec = getMountSpec(mountId);
    if (!spec) {
      this.mountId = null;
      this.container.setVisible(false);
      return;
    }
    this.mountId = spec.id;
    const key = `mount_tex_${spec.id}`;
    if (this.scene.textures.exists(key)) {
      this.sprite.setTexture(key);
    }
    this.container.setVisible(true);
  }

  public honkHorn(): void {
    if (this.mountId !== 'mount_mini_tuk_tuk') return;
    soundManager.playSfx('coin');
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      repeat: 1,
    });
  }

  public update(x: number, y: number, facing: 'down' | 'up' | 'left' | 'right', isMoving: boolean, time: number): void {
    const spec = getMountSpec(this.mountId);
    if (!spec) {
      this.container.setVisible(false);
      return;
    }
    this.container.setVisible(true);

    const flipLeft = facing === 'left';
    const bounce = isMoving ? Math.sin(time * 0.025) * 1.6 : 0;
    this.container.setPosition(x, y + 6 + bounce);
    this.container.setDepth(y + 8);
    this.sprite.setFlipX(flipLeft);

    // Mini Tuk-Tuk glowing headlights at dusk/night!
    const snap = seasonClock.getSnapshot();
    const lightsOn = spec.hasHeadlights && (snap.nightIntensity > 0.22 || snap.sunsetIntensity > 0.35);
    this.headlightBeam.setVisible(lightsOn);
    this.headlightGlow.setVisible(lightsOn);
    if (lightsOn) {
      const dir = flipLeft ? -1 : 1;
      this.headlightBeam.setScale(dir, 1).setPosition(dir * 26, 2);
      this.headlightGlow.setPosition(dir * 22, 2);
    }

    // Gentle dust trail behind Water Buffalo & Tuk-Tuk when cruising
    if (spec.hasDustTrail && isMoving && time - this.lastDustAt > 175) {
      this.lastDustAt = time;
      const dir = flipLeft ? 1 : -1;
      const puff = this.scene.add
        .circle(x + dir * 18, y + 9, Phaser.Math.FloatBetween(2.2, 4), 0xd6d3d1, 0.52)
        .setDepth(y + 5);
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + dir * 10,
        y: puff.y - 6,
        scale: 1.8,
        alpha: 0,
        duration: 420,
        onComplete: () => puff.destroy(),
      });
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
