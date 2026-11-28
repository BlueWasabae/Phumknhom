import Phaser from 'phaser';
import type { PetEvolutionStage, ZoneType } from '@shared/types';
import { PET_STAGE_META } from '@shared/petEvolution';
import { ITEM_CATALOG } from '../../data/items';
import { vfxManager } from '../animations/VFXManager';

const NA_BASE = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';

interface PetSpriteMapping {
  texKey: string;
  animKey: string;
  url: string;
  frameW: number;
  frameH: number;
  frames?: number;
  scaleMult?: number;
  tint?: number;
}

const CUSTOM_PNG_PETS: Record<string, PetSpriteMapping> = {
  pet_village_puppy: {
    texKey: 'pet_village_puppy',
    animKey: 'pet_village_puppy_anim',
    url: '/assets/khmer/pets/pet_village_puppy.png',
    frameW: 32,
    frameH: 32,
    frames: 4,
    scaleMult: 0.65,
  },
  pet_baby_water_buffalo: {
    texKey: 'pet_baby_water_buffalo',
    animKey: 'pet_baby_water_buffalo_anim',
    url: '/assets/khmer/pets/pet_baby_water_buffalo.png',
    frameW: 32,
    frameH: 32,
    frames: 4,
    scaleMult: 0.68,
  },
  pet_mini_golden_naga: {
    texKey: 'pet_mini_golden_naga',
    animKey: 'pet_mini_golden_naga_anim',
    url: '/assets/khmer/pets/pet_mini_golden_naga.png',
    frameW: 32,
    frameH: 32,
    frames: 4,
    scaleMult: 0.72,
  },
  pet_celestial_lotus_kitsune: {
    texKey: 'pet_celestial_lotus_kitsune',
    animKey: 'pet_celestial_lotus_kitsune_anim',
    url: '/assets/khmer/pets/pet_celestial_lotus_kitsune.png',
    frameW: 32,
    frameH: 32,
    frames: 4,
    scaleMult: 0.68,
  },
  pet_baby_angkor_singha: {
    texKey: 'pet_baby_angkor_singha',
    animKey: 'pet_baby_angkor_singha_anim',
    url: '/assets/khmer/pets/pet_baby_angkor_singha.png',
    frameW: 32,
    frameH: 32,
    frames: 4,
    scaleMult: 0.68,
  },
};

function resolvePetSprite(petId: string): PetSpriteMapping {
  if (CUSTOM_PNG_PETS[petId]) {
    return CUSTOM_PNG_PETS[petId];
  }
  const variant = ITEM_CATALOG[petId]?.styleVariant;
  if (variant === 'golden_frog') {
    return {
      texKey: 'pet_frog',
      animKey: 'pet_frog_idle',
      url: `${NA_BASE}/Actor/Animal/Frog/SpriteSheet.png`,
      frameW: 16,
      frameH: 16,
      tint: 0xfde047,
    };
  }
  if (variant === 'baby_elephant') {
    return {
      texKey: 'pet_lioncub',
      animKey: 'pet_lioncub_idle',
      url: `${NA_BASE}/Actor/Animal/LionCub/SpriteSheet.png`,
      frameW: 16,
      frameH: 16,
    };
  }
  if (variant === 'firefly_lantern') {
    return {
      texKey: 'pet_lantern',
      animKey: 'pet_lantern_idle',
      url: `${NA_BASE}/Actor/Monster/LanternRed/SpriteSheet.png`,
      frameW: 16,
      frameH: 16,
      tint: 0xfef08a,
    };
  }
  if (variant === 'mini_naga') {
    return {
      texKey: 'pet_spirit',
      animKey: 'pet_spirit_idle',
      url: `${NA_BASE}/Actor/Monster/Spirit/SpriteSheet.png`,
      frameW: 16,
      frameH: 16,
      tint: 0x34d399,
    };
  }
  return {
    texKey: 'pet_cat_white',
    animKey: 'pet_cat_idle',
    url: `${NA_BASE}/Actor/Animal/CatWhite/SpriteSheet.png`,
    frameW: 17,
    frameH: 15,
  };
}

const petPreviewCache = new Map<string, HTMLImageElement>();
function getCachedPetImg(url: string): HTMLImageElement | null {
  let img = petPreviewCache.get(url);
  if (!img && typeof Image !== 'undefined') {
    img = new Image();
    img.src = url;
    petPreviewCache.set(url, img);
  }
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Draws the REAL Ninja Adventure animal/spirit Pet sprite onto React preview canvases.
 * Renders nothing when petId is empty or unequipped.
 */
export function drawPetToCanvas(
  ctx: CanvasRenderingContext2D,
  petId: string | null | undefined,
  cx: number,
  cy: number,
  scale = 1,
  timeMs = 0,
  stage: PetEvolutionStage = 1
): void {
  if (!petId || !ITEM_CATALOG[petId]) return;
  const map = resolvePetSprite(petId);
  const img = getCachedPetImg(map.url);
  const stageMeta = PET_STAGE_META[stage] ?? PET_STAGE_META[1];
  const bob = Math.sin(timeMs / 240) * 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy + bob);

  // Stage 2 subtle sparkle halo / Stage 3 Mythic bloom aura + orbiting runes
  if (stage === 2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = Math.max(1.5, scale * 0.8);
    ctx.beginPath();
    ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
    ctx.stroke();
    const ang = timeMs / 450;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * 16 * scale, Math.sin(ang) * 12 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (stage === 3) {
    ctx.save();
    const grad = ctx.createRadialGradient(0, 0, 3 * scale, 0, 0, 24 * scale);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
    grad.addColorStop(0.55, 'rgba(34, 211, 238, 0.32)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 3 orbiting Mythic runes/petals
    for (let i = 0; i < 3; i++) {
      const a = timeMs / 380 + (i * Math.PI * 2) / 3;
      const rx = Math.cos(a) * 19 * scale;
      const ry = Math.sin(a) * 12 * scale;
      ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(rx, ry, 2.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (img) {
    const frameCount = map.frames ?? 1;
    const frameIdx = frameCount > 1 ? Math.floor(timeMs / 170) % frameCount : 0;
    const mult = (map.scaleMult ?? 1) * 1.35 * stageMeta.scaleMult;
    const w = map.frameW * scale * mult;
    const h = map.frameH * scale * mult;
    ctx.drawImage(img, frameIdx * map.frameW, 0, map.frameW, map.frameH, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

/**
 * Summons a temporary Barami Spirit Tamer combat spirit strike when the player has
 * NO equipped cosmetic pet (`equipped.pet === null`), keeping Krama Whip 100% playable
 * without ever spawning or instantiating a permanent default Pet entity.
 */
export function summonTemporaryCombatSpirit(
  scene: Phaser.Scene,
  ownerX: number,
  ownerY: number,
  ownerFacingRight: boolean,
  targetX: number,
  targetY: number,
  onImpact: () => void
): boolean {
  const originX = ownerX + (ownerFacingRight ? 28 : -28);
  const originY = ownerY - 20;
  if (Phaser.Math.Distance.Between(originX, originY, targetX, targetY) > 540) return false;

  if (scene.textures.exists('pet_spirit')) {
    const tempSpirit = scene.add
      .sprite(originX, originY, 'pet_spirit', 0)
      .setScale(2.0)
      .setTint(0x34d399)
      .setAlpha(0.92)
      .setFlipX(!ownerFacingRight)
      .setDepth(63);
    if (scene.anims.exists('pet_spirit_idle')) {
      tempSpirit.play('pet_spirit_idle');
    }
    scene.tweens.add({
      targets: tempSpirit,
      y: originY - 14,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => tempSpirit.destroy(),
    });
  }

  const orb = scene.add
    .circle(originX, originY - 6, 8, 0x10b981, 0.95)
    .setStrokeStyle(2, 0xfef08a)
    .setDepth(64);

  scene.tweens.add({
    targets: orb,
    x: targetX,
    y: targetY,
    duration: 240,
    ease: 'Quad.easeIn',
    onComplete: () => {
      const ring = scene.add.circle(targetX, targetY, 10, 0x10b981, 0.45).setDepth(65);
      scene.tweens.add({
        targets: ring,
        scale: 2.6,
        alpha: 0,
        duration: 200,
        onComplete: () => ring.destroy(),
      });
      orb.destroy();
      onImpact();
    },
  });

  return true;
}

/**
 * Companion Pet entity rendered using REAL animated Ninja Adventure animal & spirit sprites.
 * Only instantiated when the player has bought & equipped a pet (`equipped.pet !== null`).
 */
export class Pet {
  private scene: Phaser.Scene;
  private zone: ZoneType;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private petId: string | null = null;
  private lastAttackAt = 0;
  private curX: number;
  private curY: number;
  private lastOwnerX: number;
  private lastOwnerY: number;
  private lastOwnerFacingRight = true;
  private evolutionStage: PetEvolutionStage = 1;
  private mythicAura: Phaser.GameObjects.Arc | null = null;
  private orbitingRunes: Phaser.GameObjects.Arc[] = [];
  private lastSparkleAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    petId: string | null,
    zone: ZoneType,
    _texKey = 'active_pet_tex',
    stage: PetEvolutionStage = 1
  ) {
    this.scene = scene;
    this.zone = zone;
    this.curX = x;
    this.curY = y;
    this.lastOwnerX = x;
    this.lastOwnerY = y;
    this.evolutionStage = stage;

    // Only spawn Phaser objects if a real bought/equipped petId is present!
    this.setPet(petId, stage);
  }

  private destroyStageVfx(): void {
    this.mythicAura?.destroy();
    this.mythicAura = null;
    for (const r of this.orbitingRunes) r.destroy();
    this.orbitingRunes = [];
  }

  private destroySprites(): void {
    this.destroyStageVfx();
    this.sprite?.destroy();
    this.sprite = null;
    this.shadow?.destroy();
    this.shadow = null;
  }

  private isCompactZone(): boolean {
    return this.zone === 'overworld' || this.zone === 'house' || this.zone === 'krom_hall' || this.zone === 'club' || this.zone === 'farm';
  }

  private rebuildStageVisuals(): void {
    this.destroyStageVfx();
    if (!this.petId || !this.sprite) return;
    const map = resolvePetSprite(this.petId);
    const stageMeta = PET_STAGE_META[this.evolutionStage] ?? PET_STAGE_META[1];
    const baseScale = (this.isCompactZone() ? 0.82 : 2.05) * (map.scaleMult ?? 1);
    this.sprite.setScale(baseScale * stageMeta.scaleMult);
    if (this.shadow) {
      const shBase = this.isCompactZone() ? 0.2 : 0.48;
      this.shadow.setScale(shBase * stageMeta.scaleMult);
    }

    if (this.evolutionStage === 3) {
      const auraRadius = this.isCompactZone() ? 13 : 30;
      this.mythicAura = this.scene.add
        .circle(this.curX, this.curY - (this.isCompactZone() ? 5 : 14), auraRadius, 0xfacc15, 0.22)
        .setStrokeStyle(this.isCompactZone() ? 1.5 : 2.5, 0x38bdf8, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD);
      vfxManager.applyBloom(this.scene, this.mythicAura, { color: 0xfde047, strength: 1.5 });

      const runeRadius = this.isCompactZone() ? 2.4 : 5;
      const runeColors = [0xfde047, 0x38bdf8, 0xf472b6];
      for (let i = 0; i < 3; i++) {
        const rune = this.scene.add
          .circle(this.curX, this.curY, runeRadius, runeColors[i], 0.95)
          .setStrokeStyle(1, 0xffffff, 0.85)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.orbitingRunes.push(rune);
      }
    }
  }

  public setEvolutionStage(stage: PetEvolutionStage): void {
    const normalized: PetEvolutionStage = stage === 3 ? 3 : stage === 2 ? 2 : 1;
    if (this.evolutionStage === normalized && (normalized !== 3 || this.mythicAura)) return;
    const prev = this.evolutionStage;
    this.evolutionStage = normalized;
    this.rebuildStageVisuals();
    if (normalized > prev && this.sprite) {
      this.playEvolutionBurst(normalized);
    }
  }

  public getEvolutionStage(): PetEvolutionStage {
    return this.evolutionStage;
  }

  public playEvolutionBurst(stage: PetEvolutionStage = this.evolutionStage): void {
    if (!this.sprite) return;
    const color = stage === 3 ? 0xfacc15 : 0x38bdf8;
    const ring = this.scene.add
      .circle(this.curX, this.curY - 6, this.isCompactZone() ? 10 : 22, color, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.sprite.depth + 5);
    vfxManager.applyBloom(this.scene, ring, { color, strength: 2.0 });
    this.scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI * 2 * i) / 10;
      const dist = this.isCompactZone() ? 28 : 60;
      const spark = this.scene.add
        .circle(this.curX, this.curY - 6, this.isCompactZone() ? 2.5 : 4.5, i % 2 === 0 ? 0xfde047 : 0x38bdf8, 0.95)
        .setDepth(this.sprite.depth + 6);
      this.scene.tweens.add({
        targets: spark,
        x: this.curX + Math.cos(ang) * dist,
        y: this.curY - 6 + Math.sin(ang) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 540,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  public setPet(petId: string | null, stage?: PetEvolutionStage): void {
    if (stage) this.evolutionStage = stage;
    this.petId = petId && ITEM_CATALOG[petId] ? petId : null;
    if (!this.petId) {
      this.destroySprites();
      return;
    }

    const map = resolvePetSprite(this.petId);
    if (!this.scene.textures.exists(map.texKey)) {
      this.destroySprites();
      return;
    }

    const stageMeta = PET_STAGE_META[this.evolutionStage] ?? PET_STAGE_META[1];
    const scale = (this.isCompactZone() ? 0.82 : 2.05) * (map.scaleMult ?? 1) * stageMeta.scaleMult;
    if (!this.shadow) {
      this.shadow = this.scene.add
        .image(this.curX, this.curY + (this.isCompactZone() ? 6 : 16), 'soft_shadow')
        .setScale((this.isCompactZone() ? 0.2 : 0.48) * stageMeta.scaleMult)
        .setAlpha(0.7);
    }
    if (!this.sprite) {
      this.sprite = this.scene.add
        .sprite(this.curX, this.curY, map.texKey, 0)
        .setScale(scale)
        .setOrigin(0.5, 0.85);
    } else {
      this.sprite.setTexture(map.texKey, 0).setScale(scale);
    }

    if (map.tint) this.sprite.setTint(map.tint);
    else this.sprite.clearTint();
    if (this.scene.anims.exists(map.animKey)) {
      this.sprite.play(map.animKey, true);
    }
    this.rebuildStageVisuals();
  }

  public update(
    time: number,
    ownerX: number,
    ownerY: number,
    ownerFacingRight: boolean
  ): void {
    this.lastOwnerX = ownerX;
    this.lastOwnerY = ownerY;
    this.lastOwnerFacingRight = ownerFacingRight;

    const stageMeta = PET_STAGE_META[this.evolutionStage] ?? PET_STAGE_META[1];
    const compact = this.isCompactZone();
    const offsetX = (ownerFacingRight ? -1 : 1) * (compact ? 18 : 44);
    const offsetY = compact ? 2 : -10;
    this.curX = Phaser.Math.Linear(this.curX, ownerX + offsetX, stageMeta.followLerp);
    this.curY = Phaser.Math.Linear(this.curY, ownerY + offsetY, Math.min(0.24, stageMeta.followLerp + 0.02));

    // No pet equipped -> no sprite to render or follow
    if (!this.petId || !this.sprite || !this.shadow) return;

    const bob = Math.sin(time / 220) * (compact ? 1.8 : 4.5);
    this.sprite.setPosition(this.curX, this.curY + bob);
    this.sprite.setFlipX(!ownerFacingRight);

    const depth = compact ? this.curY + 8 : 49;
    if (compact) {
      this.sprite.setDepth(depth);
      this.shadow.setPosition(this.curX, this.curY + 5).setDepth(depth - 1);
    } else {
      this.sprite.setDepth(49);
      this.shadow.setPosition(this.curX, ownerY + 21).setDepth(47);
    }

    // Stage 2+: subtle sparkle trail while following
    if (this.evolutionStage >= 2 && time - this.lastSparkleAt > (this.evolutionStage === 3 ? 210 : 380)) {
      this.lastSparkleAt = time;
      const sx = this.curX + Phaser.Math.Between(-6, 6);
      const sy = this.curY - (compact ? 4 : 10) + Phaser.Math.Between(-4, 4);
      const spark = this.scene.add
        .circle(
          sx,
          sy,
          compact ? (this.evolutionStage === 3 ? 2.1 : 1.6) : 3.2,
          this.evolutionStage === 3 ? 0xfde047 : 0x7dd3fc,
          0.85
        )
        .setDepth(depth - 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: spark,
        y: sy - (compact ? 10 : 18),
        alpha: 0,
        scale: 0.25,
        duration: 420,
        onComplete: () => spark.destroy(),
      });
    }

    // Stage 3: pulsing WebGL Bloom Aura + orbiting floating runes/petals
    if (this.evolutionStage === 3 && this.mythicAura) {
      const pulse = 1 + Math.sin(time / 280) * 0.1;
      this.mythicAura
        .setPosition(this.curX, this.curY + bob - (compact ? 6 : 16))
        .setScale(pulse)
        .setDepth(depth - 0.8);

      const orbitX = compact ? 15 : 34;
      const orbitY = compact ? 7.5 : 16;
      for (let i = 0; i < this.orbitingRunes.length; i++) {
        const ang = time / 460 + (i * Math.PI * 2) / this.orbitingRunes.length;
        const rx = this.curX + Math.cos(ang) * orbitX;
        const ry = this.curY + bob - (compact ? 6 : 16) + Math.sin(ang) * orbitY;
        this.orbitingRunes[i]
          .setPosition(rx, ry)
          .setDepth(Math.sin(ang) >= 0 ? depth + 1 : depth - 0.9);
      }
    }
  }

  /**
   * Barami Spirit Tamer combat spirit strike inside DungeonBossScene:
   * - If the player has an equipped Pet, fires from the Pet.
   * - If the player has NO cosmetic pet equipped (`petId === null`) and `allowTemporarySpirit` is true,
   *   briefly summons an ethereal combat spirit beside the player while attacking so Krama Whip stays 100% playable!
   */
  public trySpiritAutoAttack(
    time: number,
    targetX: number,
    targetY: number,
    onImpact: () => void,
    forced = false,
    speedMultiplier = 1,
    allowTemporarySpirit = false
  ): boolean {
    if (!this.petId && !allowTemporarySpirit) return false;
    const baseCooldown = forced ? 320 : 1250;
    const cooldown = Math.round(baseCooldown / Math.max(0.5, speedMultiplier));
    if (time - this.lastAttackAt < cooldown) return false;

    const originX = this.petId
      ? this.curX
      : this.lastOwnerX + (this.lastOwnerFacingRight ? 28 : -28);
    const originY = this.petId ? this.curY : this.lastOwnerY - 20;

    if (Phaser.Math.Distance.Between(originX, originY, targetX, targetY) > 540) return false;

    this.lastAttackAt = time;
    const def = this.petId ? ITEM_CATALOG[this.petId] : undefined;
    const colorHex = Number((def?.primaryColor || '#10b981').replace('#', '0x'));

    // Summon a temporary glowing combat spirit if no permanent cosmetic pet is equipped
    if (!this.petId && this.scene.textures.exists('pet_spirit')) {
      const tempSpirit = this.scene.add
        .sprite(originX, originY, 'pet_spirit', 0)
        .setScale(2.0)
        .setTint(0x34d399)
        .setAlpha(0.92)
        .setFlipX(!this.lastOwnerFacingRight)
        .setDepth(63);
      if (this.scene.anims.exists('pet_spirit_idle')) {
        tempSpirit.play('pet_spirit_idle');
      }
      this.scene.tweens.add({
        targets: tempSpirit,
        y: originY - 14,
        alpha: 0,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => tempSpirit.destroy(),
      });
    }

    const orb = this.scene.add
      .circle(originX, originY - 6, forced ? 8 : 6, colorHex, 0.95)
      .setStrokeStyle(2, 0xfef08a)
      .setDepth(64);

    this.scene.tweens.add({
      targets: orb,
      x: targetX,
      y: targetY,
      duration: 240,
      ease: 'Quad.easeIn',
      onComplete: () => {
        const ring = this.scene.add.circle(targetX, targetY, 10, colorHex, 0.45).setDepth(65);
        this.scene.tweens.add({
          targets: ring,
          scale: 2.6,
          alpha: 0,
          duration: 200,
          onComplete: () => ring.destroy(),
        });
        orb.destroy();
        onImpact();
      },
    });

    return true;
  }

  public destroy(): void {
    this.destroySprites();
  }
}
