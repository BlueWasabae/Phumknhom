import Phaser from 'phaser';
import type { ZoneType } from '@shared/types';
import { ITEM_CATALOG } from '../../data/items';

const NA_BASE = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';

interface PetSpriteMapping {
  texKey: string;
  animKey: string;
  url: string;
  frameW: number;
  frameH: number;
  tint?: number;
}

function resolvePetSprite(petId: string): PetSpriteMapping {
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
  timeMs = 0
): void {
  if (!petId || !ITEM_CATALOG[petId]) return;
  const map = resolvePetSprite(petId);
  const img = getCachedPetImg(map.url);
  const bob = Math.sin(timeMs / 240) * 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy + bob);
  if (img) {
    const w = map.frameW * scale * 1.35;
    const h = map.frameH * scale * 1.35;
    ctx.drawImage(img, 0, 0, map.frameW, map.frameH, -w / 2, -h / 2, w, h);
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

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    petId: string | null,
    zone: ZoneType,
    _texKey = 'active_pet_tex'
  ) {
    this.scene = scene;
    this.zone = zone;
    this.curX = x;
    this.curY = y;
    this.lastOwnerX = x;
    this.lastOwnerY = y;

    // Only spawn Phaser objects if a real bought/equipped petId is present!
    this.setPet(petId);
  }

  private destroySprites(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.shadow?.destroy();
    this.shadow = null;
  }

  public setPet(petId: string | null): void {
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

    const scale = this.zone === 'overworld' ? 0.82 : 2.05;
    if (!this.shadow) {
      this.shadow = this.scene.add
        .image(this.curX, this.curY + (this.zone === 'overworld' ? 6 : 16), 'soft_shadow')
        .setScale(this.zone === 'overworld' ? 0.2 : 0.48)
        .setAlpha(0.7);
    }
    if (!this.sprite) {
      this.sprite = this.scene.add
        .sprite(this.curX, this.curY, map.texKey, 0)
        .setScale(scale)
        .setOrigin(0.5, 0.85);
    } else {
      this.sprite.setTexture(map.texKey, 0);
    }

    if (map.tint) this.sprite.setTint(map.tint);
    else this.sprite.clearTint();
    if (this.scene.anims.exists(map.animKey)) {
      this.sprite.play(map.animKey, true);
    }
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

    const offsetX = (ownerFacingRight ? -1 : 1) * (this.zone === 'overworld' ? 16 : 40);
    const offsetY = this.zone === 'overworld' ? 2 : -10;
    this.curX = Phaser.Math.Linear(this.curX, ownerX + offsetX, 0.11);
    this.curY = Phaser.Math.Linear(this.curY, ownerY + offsetY, 0.13);

    // No pet equipped -> no sprite to render or follow
    if (!this.petId || !this.sprite || !this.shadow) return;

    const bob = Math.sin(time / 220) * (this.zone === 'overworld' ? 1.8 : 4.5);
    this.sprite.setPosition(this.curX, this.curY + bob);
    this.sprite.setFlipX(!ownerFacingRight);

    if (this.zone === 'overworld') {
      const depth = this.curY + 8;
      this.sprite.setDepth(depth);
      this.shadow.setPosition(this.curX, this.curY + 5).setDepth(depth - 1);
    } else {
      this.sprite.setDepth(49);
      this.shadow.setPosition(this.curX, ownerY + 21).setDepth(47);
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
