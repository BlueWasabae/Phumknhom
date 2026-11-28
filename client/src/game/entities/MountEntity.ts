import Phaser from 'phaser';
import { seasonClock } from '../systems/SeasonClock';
import { soundManager } from '../systems/SoundManager';

export type KhmerMountId =
  | 'mount_village_bicycle'
  | 'mount_water_buffalo'
  | 'mount_golden_cloud'
  | 'mount_royal_elephant'
  | 'mount_shadow_singha'
  | 'mount_celestial_garuda'
  | 'mount_spirit_dragon'
  | 'mount_bamboo_hoverboard';

export interface MountSpec {
  id: KhmerMountId;
  name: string;
  khmerName: string;
  icon: string;
  archetype: string;
  speedBonusPct: number;
  seatOffsetY: number;
  hasHeadlights: boolean;
  hasDustTrail: boolean;
  trailColor: number;
  floats: boolean;
  allowsPassenger: boolean;
  /** Optional custom transparent PNG sprite scale & anchor for high-detail mount art */
  pngScale?: number;
  pngOriginY?: number;
  pngOffsetY?: number;
}

export const KHMER_MOUNT_SPECS: Record<KhmerMountId, MountSpec> = {
  mount_village_bicycle: {
    id: 'mount_village_bicycle',
    name: 'Village Bicycle',
    khmerName: 'កង់ភូមិខ្មែរ',
    icon: '🚲',
    archetype: 'Classic Town Bike',
    speedBonusPct: 0.35,
    seatOffsetY: -6,
    hasHeadlights: false,
    hasDustTrail: false,
    trailColor: 0xd6d3d1,
    floats: false,
    allowsPassenger: false,
  },
  mount_water_buffalo: {
    id: 'mount_water_buffalo',
    name: 'Water Buffalo',
    khmerName: 'ក្របីស្រែខ្មែរ',
    icon: '🐃',
    archetype: 'Classic Beast Mount',
    speedBonusPct: 0.45,
    seatOffsetY: -10,
    hasHeadlights: false,
    hasDustTrail: true,
    trailColor: 0xd6d3d1,
    floats: false,
    allowsPassenger: false,
  },
  mount_bamboo_hoverboard: {
    id: 'mount_bamboo_hoverboard',
    name: 'Enchanted Bamboo Hoverboard',
    khmerName: 'ក្តារហោះឫស្សីទេព',
    icon: '🛹',
    archetype: 'Hoverboard / Glider',
    speedBonusPct: 0.54,
    seatOffsetY: -7,
    hasHeadlights: true,
    hasDustTrail: true,
    trailColor: 0x38bdf8,
    floats: true,
    allowsPassenger: false,
    pngScale: 0.62,
    pngOriginY: 0.62,
    pngOffsetY: 3,
  },
  mount_royal_elephant: {
    id: 'mount_royal_elephant',
    name: 'Royal White Elephant',
    khmerName: 'ដំរីសរាជវង្សអង្គរ',
    icon: '🐘',
    archetype: '2-Seat War Elephant',
    speedBonusPct: 0.56,
    seatOffsetY: -17,
    hasHeadlights: true,
    hasDustTrail: true,
    trailColor: 0xfde047,
    floats: false,
    allowsPassenger: true,
    pngScale: 0.66,
    pngOriginY: 0.82,
    pngOffsetY: 6,
  },
  mount_shadow_singha: {
    id: 'mount_shadow_singha',
    name: 'Shadow Singha Lion',
    khmerName: 'សិង្ហស្រមោលអង្គរ',
    icon: '🦁',
    archetype: 'MMO Armored Dire Lion',
    speedBonusPct: 0.58,
    seatOffsetY: -13,
    hasHeadlights: true,
    hasDustTrail: true,
    trailColor: 0xc084fc,
    floats: false,
    allowsPassenger: false,
    pngScale: 0.64,
    pngOriginY: 0.80,
    pngOffsetY: 5,
  },
  mount_golden_cloud: {
    id: 'mount_golden_cloud',
    name: 'Golden Naga Cloud',
    khmerName: 'ពពកនាគមាសទេវតា',
    icon: '☁️',
    archetype: '2-Seat Flying Nimbus',
    speedBonusPct: 0.6,
    seatOffsetY: -11,
    hasHeadlights: true,
    hasDustTrail: true,
    trailColor: 0xfacc15,
    floats: true,
    allowsPassenger: true,
    pngScale: 0.66,
    pngOriginY: 0.68,
    pngOffsetY: 2,
  },
  mount_celestial_garuda: {
    id: 'mount_celestial_garuda',
    name: 'Celestial Garuda Strider',
    khmerName: 'គ្រុឌមាសទេវតា',
    icon: '🦅',
    archetype: 'RPG Chocobo / Phoenix Bird',
    speedBonusPct: 0.62,
    seatOffsetY: -12,
    hasHeadlights: true,
    hasDustTrail: true,
    trailColor: 0xfb923c,
    floats: false,
    allowsPassenger: false,
    pngScale: 0.64,
    pngOriginY: 0.80,
    pngOffsetY: 5,
  },
  mount_spirit_dragon: {
    id: 'mount_spirit_dragon',
    name: 'Emerald Mekong Dragon',
    khmerName: 'នាគព្រលឹងមេគង្គ',
    icon: '🐉',
    archetype: '2-Seat Eastern Dragon',
    speedBonusPct: 0.65,
    seatOffsetY: -13,
    hasHeadlights: true,
    hasDustTrail: true,
    trailColor: 0x34d399,
    floats: true,
    allowsPassenger: true,
    pngScale: 0.68,
    pngOriginY: 0.74,
    pngOffsetY: 3,
  },
};

export const COOP_TWO_SEAT_MOUNT_IDS = new Set<string>([
  'mount_golden_cloud',
  'mount_royal_elephant',
  'mount_spirit_dragon',
]);

export function normalizeLegacyMountId(mountId: string | null | undefined): KhmerMountId | null {
  if (!mountId) return null;
  // Auto-migrate removed Mini Tuk-Tuk mount into the iconic 2-Seat Golden Naga Cloud!
  if (mountId === 'mount_mini_tuk_tuk') return 'mount_golden_cloud';
  if (mountId in KHMER_MOUNT_SPECS) return mountId as KhmerMountId;
  return null;
}

export function getMountSpec(mountId: string | null | undefined): MountSpec | null {
  const norm = normalizeLegacyMountId(mountId);
  if (!norm) return null;
  return KHMER_MOUNT_SPECS[norm] ?? null;
}

/**
 * Crisp 16-bit pixel-art Rideable Mounts inspired by iconic gaming history archetypes
 * (Flying Nimbus Cloud, Royal War Elephant, Armored Lion, Chocobo/Garuda Strider,
 * Eastern Spirit Dragon, Enchanted Hoverboard, Water Buffalo & Village Bicycle).
 */
export class MountEntity {
  public readonly container: Phaser.GameObjects.Container;
  public mountId: KhmerMountId | null = null;

  private scene: Phaser.Scene;
  private shadow: Phaser.GameObjects.Image;
  private sprite: Phaser.GameObjects.Image;
  private auraGlow: Phaser.GameObjects.Image;
  private baseScale = 1;
  private baseOffsetY = 0;
  private lastDustAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.ensureMountTextures(scene);

    this.shadow = scene.add
      .image(0, 7, 'soft_shadow')
      .setScale(0.75, 0.52)
      .setAlpha(0.5);

    this.auraGlow = scene.add
      .image(0, 2, 'torch_glow')
      .setTint(0xfacc15)
      .setScale(0.68)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.sprite = scene.add.image(0, 0, 'mount_tex_mount_village_bicycle').setOrigin(0.5, 0.72);
    this.container = scene.add.container(x, y, [this.shadow, this.auraGlow, this.sprite]);
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

    // 1. Village Bicycle
    mk('mount_tex_mount_village_bicycle', 42, 28, (ctx) => {
      for (const wx of [4, 28]) {
        ctx.fillStyle = O;
        ctx.fillRect(wx, 14, 10, 10);
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx + 1, 15, 8, 8);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(wx + 3, 17, 4, 4);
      }
      ctx.fillStyle = O;
      ctx.fillRect(9, 10, 22, 6);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(10, 11, 20, 4);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(11, 7, 7, 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(28, 6, 4, 7);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(32, 7, 7, 6);
    });

    // 2. Water Buffalo
    mk('mount_tex_mount_water_buffalo', 48, 32, (ctx) => {
      for (const lx of [8, 16, 28, 34]) {
        ctx.fillStyle = O;
        ctx.fillRect(lx, 20, 5, 10);
        ctx.fillStyle = '#475569';
        ctx.fillRect(lx + 1, 20, 3, 8);
      }
      ctx.fillStyle = O;
      ctx.fillRect(6, 9, 32, 14);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(7, 10, 30, 12);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(15, 9, 12, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(16, 15, 10, 2);
      ctx.fillStyle = O;
      ctx.fillRect(35, 8, 11, 11);
      ctx.fillStyle = '#475569';
      ctx.fillRect(36, 9, 9, 9);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(38, 4, 3, 5);
      ctx.fillRect(42, 5, 3, 4);
    });

    // 3. Golden Naga Cloud (Flying Nimbus 2-Seat Cloud Mount)
    mk('mount_tex_mount_golden_cloud', 56, 30, (ctx) => {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(6, 14, 44, 12);
      ctx.fillRect(12, 8, 32, 16);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(8, 13, 40, 10);
      ctx.fillRect(14, 9, 28, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(14, 10, 12, 6);
      ctx.fillRect(28, 11, 14, 6);
      // Swirling trailing golden cloud curls
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(2, 17, 7, 5);
      ctx.fillRect(47, 16, 7, 5);
      // Lotus crest emblem
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(25, 14, 6, 4);
    });

    // 4. Royal White Elephant (2-Seat War Elephant with Crimson-Gold Howdah)
    mk('mount_tex_mount_royal_elephant', 58, 40, (ctx) => {
      for (const lx of [10, 19, 31, 39]) {
        ctx.fillStyle = O;
        ctx.fillRect(lx, 25, 7, 13);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(lx + 1, 25, 5, 11);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lx + 1, 33, 5, 2);
      }
      ctx.fillStyle = O;
      ctx.fillRect(8, 10, 38, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(9, 11, 36, 16);
      // Crimson-and-Gold Royal Howdah Saddle
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(15, 9, 22, 13);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(15, 9, 22, 3);
      ctx.fillRect(15, 19, 22, 2);
      // Head, Royal Crown, Ear, Tusks & Trunk
      ctx.fillStyle = O;
      ctx.fillRect(42, 8, 13, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(43, 9, 11, 12);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(39, 11, 6, 9);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(44, 6, 8, 3);
      // Trunk
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(51, 18, 5, 11);
      ctx.fillRect(53, 26, 4, 4);
      // Ivory Tusk
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(49, 21, 7, 2);
    });

    // 5. Shadow Singha Lion (Armored Dire Lion Mount)
    mk('mount_tex_mount_shadow_singha', 54, 34, (ctx) => {
      for (const lx of [8, 16, 30, 38]) {
        ctx.fillStyle = O;
        ctx.fillRect(lx, 21, 5, 11);
        ctx.fillStyle = '#312e81';
        ctx.fillRect(lx + 1, 21, 3, 9);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lx + 1, 28, 3, 2);
      }
      ctx.fillStyle = O;
      ctx.fillRect(8, 10, 34, 14);
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(9, 11, 32, 12);
      // Golden Angkor Saddle Plate
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(18, 10, 12, 8);
      // Glowing Violet Mane & Head
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(34, 5, 14, 15);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(36, 7, 10, 11);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(43, 10, 2, 2);
      // Flowing tail
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(2, 10, 7, 4);
    });

    // 6. Celestial Garuda Strider (Classic RPG Chocobo / Golden Phoenix Bird)
    mk('mount_tex_mount_celestial_garuda', 52, 36, (ctx) => {
      // Taloned bird legs
      for (const lx of [19, 28]) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(lx, 23, 4, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lx - 1, 31, 7, 3);
      }
      // Feathered Golden Body & Wing
      ctx.fillStyle = O;
      ctx.fillRect(10, 11, 28, 14);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(11, 12, 26, 12);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(14, 13, 18, 6);
      // Tail feathers
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(3, 10, 9, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 14, 8, 4);
      // Neck, Crest & Beak
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(33, 5, 9, 12);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(32, 2, 8, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(42, 8, 7, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(38, 8, 2, 2);
    });

    // 7. Emerald Mekong Spirit Dragon (2-Seat Floating Eastern Dragon)
    mk('mount_tex_mount_spirit_dragon', 62, 34, (ctx) => {
      // Undulating emerald serpentine body
      ctx.fillStyle = '#065f46';
      ctx.fillRect(4, 14, 46, 11);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(6, 15, 42, 9);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(8, 21, 38, 3);
      // Dorsal golden spines
      for (let sx = 10; sx <= 40; sx += 8) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sx, 11, 4, 4);
      }
      // Dragon Head, Antlers & Whiskers
      ctx.fillStyle = '#047857';
      ctx.fillRect(45, 9, 13, 12);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(46, 10, 11, 9);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(46, 5, 3, 5);
      ctx.fillRect(51, 6, 3, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(54, 12, 2, 2);
      ctx.fillRect(57, 16, 4, 2);
    });

    // 8. Enchanted Bamboo Hoverboard (Classic Hoverboard / Glider Mount)
    mk('mount_tex_mount_bamboo_hoverboard', 48, 22, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(4, 8, 40, 9);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(5, 9, 38, 7);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(8, 10, 32, 3);
      // Glowing cyan wind-rune thrusters
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(2, 11, 5, 4);
      ctx.fillRect(14, 15, 20, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(21, 10, 6, 4);
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
    const pngKey = `mount_png_${spec.id}`;
    const fallbackKey = `mount_tex_${spec.id}`;
    if (spec.pngScale && this.scene.textures.exists(pngKey)) {
      this.sprite.setTexture(pngKey);
      this.baseScale = spec.pngScale;
      this.baseOffsetY = spec.pngOffsetY ?? 3;
      this.sprite.setOrigin(0.5, spec.pngOriginY ?? 0.76);
      this.sprite.setScale(this.baseScale);
      this.sprite.setPosition(0, this.baseOffsetY);
    } else if (this.scene.textures.exists(fallbackKey)) {
      this.sprite.setTexture(fallbackKey);
      this.baseScale = 1;
      this.baseOffsetY = 0;
      this.sprite.setOrigin(0.5, 0.72);
      this.sprite.setScale(1);
      this.sprite.setPosition(0, 0);
    }
    this.auraGlow.setTint(spec.trailColor);
    this.shadow.setScale(spec.floats ? 0.68 : 0.85, spec.floats ? 0.42 : 0.56);
    this.container.setVisible(true);
  }

  public honkHorn(): void {
    const spec = getMountSpec(this.mountId);
    if (!spec) return;
    soundManager.playSfx(spec.floats ? 'magic' : 'coin');
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * 1.15,
      scaleX: this.baseScale * 0.92,
      duration: 90,
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
    const floatBob = spec.floats
      ? Math.sin(time * 0.0062) * 3.2
      : isMoving
        ? Math.abs(Math.sin(time * 0.018)) * -2.6
        : Math.sin(time * 0.0045) * 0.6;
    this.container.setPosition(x, y + 6);
    this.container.setDepth(y + 8);
    this.sprite.setFlipX(flipLeft);
    this.sprite.setPosition(0, this.baseOffsetY + floatBob);
    // Keep ground shadow planted on terrain while floating/galloping mounts bob above it
    this.shadow.setPosition(0, 6);
    this.shadow.setAlpha(spec.floats ? 0.36 - floatBob * 0.018 : 0.48);
    // Dynamic stride/hover tilt & subtle idle breathing
    const moveTilt = isMoving
      ? (spec.floats ? (flipLeft ? -0.065 : 0.065) : Math.sin(time * 0.018) * 0.055)
      : 0;
    this.sprite.setRotation(moveTilt);
    const breath = isMoving ? 1 : 1 + Math.sin(time * 0.0045) * 0.018;
    this.sprite.setScale(this.baseScale, this.baseScale * breath);

    const snap = seasonClock.getSnapshot();
    const glowVisible = spec.floats || (spec.hasHeadlights && (snap.nightIntensity > 0.2 || snap.sunsetIntensity > 0.3));
    this.auraGlow.setVisible(glowVisible);
    if (glowVisible) {
      this.auraGlow.setPosition(0, floatBob + 1);
      this.auraGlow.setAlpha(0.32 + Math.sin(time / 240) * 0.14);
    }

    if (spec.hasDustTrail && (isMoving || spec.floats) && time - this.lastDustAt > 165) {
      this.lastDustAt = time;
      const dir = flipLeft ? 1 : -1;
      const puff = this.scene.add
        .circle(x + dir * 20, y + (spec.floats ? 4 : 9), Phaser.Math.FloatBetween(2.2, 4.2), spec.trailColor, 0.58)
        .setBlendMode(spec.floats ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL)
        .setDepth(y + 5);
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + dir * 13,
        y: puff.y - 6,
        scale: 1.85,
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
