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
 */
export function drawPetToCanvas(
  ctx: CanvasRenderingContext2D,
  petId: string,
  cx: number,
  cy: number,
  scale = 1,
  timeMs = 0
): void {
  if (!ITEM_CATALOG[petId]) return;
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
 * Companion Pet entity rendered using REAL animated Ninja Adventure animal & spirit sprites
 * (CatWhite, Frog, LionCub, Spirit, LanternRed) with smooth bobbing follow and
 * Barami Spirit Tamer auto-attacks in Dungeon.
 */
export class Pet {
  private scene: Phaser.Scene;
  private zone: ZoneType;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private petId: string | null;
  private lastAttackAt = 0;
  private curX: number;
  private curY: number;

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
    this.petId = petId;
    this.curX = x;
    this.curY = y;

    const scale = zone === 'overworld' ? 0.82 : 2.05;

    this.shadow = scene.add
      .image(x, y + (zone === 'overworld' ? 6 : 16), 'soft_shadow')
      .setScale(zone === 'overworld' ? 0.2 : 0.48)
      .setAlpha(0.7);

    this.sprite = scene.add
      .sprite(x, y, 'pet_cat_white', 0)
      .setScale(scale)
      .setOrigin(0.5, 0.85);
    this.setPet(petId);
  }

  public setPet(petId: string | null): void {
    this.petId = petId;
    const visible = Boolean(petId && ITEM_CATALOG[petId]);
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    if (!visible || !petId) return;

    const map = resolvePetSprite(petId);
    if (this.scene.textures.exists(map.texKey)) {
      this.sprite.setTexture(map.texKey, 0);
      if (map.tint) this.sprite.setTint(map.tint);
      else this.sprite.clearTint();
      if (this.scene.anims.exists(map.animKey)) {
        this.sprite.play(map.animKey, true);
      }
    }
  }

  public update(
    time: number,
    ownerX: number,
    ownerY: number,
    ownerFacingRight: boolean
  ): void {
    if (!this.petId) return;

    const offsetX = (ownerFacingRight ? -1 : 1) * (this.zone === 'overworld' ? 16 : 40);
    const offsetY = this.zone === 'overworld' ? 2 : -10;

    this.curX = Phaser.Math.Linear(this.curX, ownerX + offsetX, 0.11);
    this.curY = Phaser.Math.Linear(this.curY, ownerY + offsetY, 0.13);

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

  public trySpiritAutoAttack(
    time: number,
    targetX: number,
    targetY: number,
    onImpact: () => void,
    forced = false,
    speedMultiplier = 1
  ): boolean {
    if (!this.petId) return false;
    const baseCooldown = forced ? 320 : 1250;
    const cooldown = Math.round(baseCooldown / Math.max(0.5, speedMultiplier));
    if (time - this.lastAttackAt < cooldown) return false;
    if (Phaser.Math.Distance.Between(this.curX, this.curY, targetX, targetY) > 540) return false;

    this.lastAttackAt = time;
    const def = ITEM_CATALOG[this.petId];
    const colorHex = Number((def?.primaryColor || '#10b981').replace('#', '0x'));

    const orb = this.scene.add
      .circle(this.curX, this.curY - 6, forced ? 8 : 6, colorHex, 0.95)
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
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
