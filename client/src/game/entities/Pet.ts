import Phaser from 'phaser';
import type { ZoneType } from '@shared/types';
import { ITEM_CATALOG } from '../../data/items';

export function drawPetToCanvas(
  ctx: CanvasRenderingContext2D,
  petId: string,
  cx: number,
  cy: number,
  scale = 1,
  timeMs = 0
): void {
  const def = ITEM_CATALOG[petId];
  if (!def) return;
  const bob = Math.sin(timeMs / 220) * 2.5;
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(scale, scale);

  if (def.styleVariant === 'mini_naga') {
    // Hovering emerald Mini-Naga spirit with golden crest
    ctx.fillStyle = def.primaryColor;
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 1.6;
    // Coiled tail
    ctx.beginPath();
    ctx.arc(-6, 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Hooded Naga head
    ctx.beginPath();
    ctx.arc(0, -4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Golden Angkor crown spire
    ctx.fillStyle = def.accentColor;
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.lineTo(0, -20);
    ctx.lineTo(5, -12);
    ctx.closePath();
    ctx.fill();
    // Bright eyes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-4, -6, 2.5, 3);
    ctx.fillRect(2, -6, 2.5, 3);
  } else if (def.styleVariant === 'firefly_lantern') {
    // Glowing Mekong Firefly Lantern jar
    ctx.fillStyle = 'rgba(253, 224, 71, 0.32)';
    ctx.beginPath();
    ctx.arc(0, -4, 14 + Math.sin(timeMs / 150) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5, -14, 10, 4);
    ctx.fillStyle = def.primaryColor;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-7, -10, 14, 15, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -6, 4, 4);
  } else {
    // Lucky White Kitten wearing tiny red Krama scarf
    ctx.fillStyle = def.primaryColor;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-9, -11, 18, 14, 6);
    ctx.fill();
    ctx.stroke();
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(-10, -16);
    ctx.lineTo(-3, -11);
    ctx.moveTo(8, -9);
    ctx.lineTo(10, -16);
    ctx.lineTo(3, -11);
    ctx.fill();
    ctx.stroke();
    // Red Krama scarf
    ctx.fillStyle = def.accentColor;
    ctx.fillRect(-8, -1, 16, 3.5);
    // Cute eyes & nose
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-5, -7, 2.5, 3);
    ctx.fillRect(2.5, -7, 2.5, 3);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-1, -4, 2, 1.5);
  }

  ctx.restore();
}

/**
 * Companion Pet entity smoothly floating/following behind the player
 * with bobbing idle animation and optional Barami Spirit Tamer auto-attacks in Dungeon.
 */
export class Pet {
  private scene: Phaser.Scene;
  private zone: ZoneType;
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private petId: string | null;
  private texKey: string;
  private lastAttackAt = 0;
  private curX: number;
  private curY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    petId: string | null,
    zone: ZoneType,
    texKey = 'active_pet_tex'
  ) {
    this.scene = scene;
    this.zone = zone;
    this.petId = petId;
    this.texKey = texKey;
    this.curX = x;
    this.curY = y;

    this.ensureTexture();
    const scale = zone === 'overworld' ? 0.42 : 0.95;

    this.shadow = scene.add
      .image(x, y + (zone === 'overworld' ? 7 : 18), 'soft_shadow')
      .setScale(zone === 'overworld' ? 0.22 : 0.46)
      .setAlpha(0.75);

    this.sprite = scene.add.image(x, y, this.texKey).setScale(scale).setOrigin(0.5, 0.8);
    this.setPet(petId);
  }

  private ensureTexture(): Phaser.Textures.CanvasTexture | null {
    if (this.scene.textures.exists(this.texKey)) {
      return this.scene.textures.get(this.texKey) as Phaser.Textures.CanvasTexture;
    }
    return this.scene.textures.createCanvas(this.texKey, 48, 48);
  }

  public setPet(petId: string | null): void {
    this.petId = petId;
    const visible = Boolean(petId && ITEM_CATALOG[petId]);
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    if (!visible || !petId) return;

    const tex = this.ensureTexture();
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 48, 48);
    drawPetToCanvas(ctx, petId, 24, 30, 1.25, 0);
    tex.refresh();
  }

  public update(
    time: number,
    ownerX: number,
    ownerY: number,
    ownerFacingRight: boolean
  ): void {
    if (!this.petId) return;

    const offsetX = (ownerFacingRight ? -1 : 1) * (this.zone === 'overworld' ? 17 : 38);
    const offsetY = this.zone === 'overworld' ? -3 : -14;

    this.curX = Phaser.Math.Linear(this.curX, ownerX + offsetX, 0.1);
    this.curY = Phaser.Math.Linear(this.curY, ownerY + offsetY, 0.12);

    const bob = Math.sin(time / 220) * (this.zone === 'overworld' ? 2.2 : 5);
    this.sprite.setPosition(this.curX, this.curY + bob);
    this.sprite.setFlipX(!ownerFacingRight);

    if (this.zone === 'overworld') {
      const depth = this.curY + 8;
      this.sprite.setDepth(depth);
      this.shadow.setPosition(this.curX, this.curY + 7).setDepth(depth - 1);
    } else {
      this.sprite.setDepth(49);
      this.shadow.setPosition(this.curX, ownerY + 20).setDepth(47);
    }
  }

  /**
   * Barami Spirit Tamer auto-attack helper inside DungeonBossScene:
   * Launches a glowing spirit orb from the pet toward the boss target on a cooldown.
   */
  public trySpiritAutoAttack(
    time: number,
    targetX: number,
    targetY: number,
    onImpact: () => void,
    forced = false
  ): boolean {
    if (!this.petId) return false;
    const cooldown = forced ? 320 : 1250;
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
        // Impact spirit ring burst
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
