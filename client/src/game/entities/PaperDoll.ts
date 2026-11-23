import Phaser from 'phaser';
import type { EquippedLoadout } from '@shared/types';
import { ITEM_CATALOG } from '../../data/items';

export type PaperDollPose = 'idle' | 'walk1' | 'walk2' | 'jump' | 'attack';
export type PaperDollFacing = 'down' | 'up' | 'left' | 'right';

export type LayerName =
  | 'wings'
  | 'body'
  | 'face'
  | 'pants'
  | 'shirt'
  | 'hair'
  | 'hat'
  | 'weapon';

const LAYER_ORDER: LayerName[] = [
  'wings',
  'body',
  'face',
  'pants',
  'shirt',
  'hair',
  'hat',
  'weapon',
];

const CANVAS_W = 64;
const CANVAS_H = 68;
const OX = 32;
const OY = 58;

/**
 * Draws a single modular layer onto any CanvasRenderingContext2D.
 * Shared by both Phaser's layered PaperDoll Container and React Profile/Wardrobe previews.
 */
export function drawSinglePaperDollLayer(
  ctx: CanvasRenderingContext2D,
  layer: LayerName,
  loadout: EquippedLoadout,
  pose: PaperDollPose,
  facing: PaperDollFacing,
  timeMs = 0
): void {
  const bob =
    pose === 'walk1'
      ? -2
      : pose === 'walk2'
      ? -1
      : pose === 'jump'
      ? -4
      : Math.round(Math.sin(timeMs / 280) * 1);
  const leftLeg = pose === 'walk1' ? -3 : pose === 'walk2' ? 3 : pose === 'jump' ? -2 : 0;
  const rightLeg = pose === 'walk1' ? 3 : pose === 'walk2' ? -3 : pose === 'jump' ? 2 : 0;
  const outline = '#26140c';
  const skin = loadout.skinColor || '#f4c29f';

  ctx.save();
  ctx.translate(OX, OY);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // ---- LAYER 1: WINGS / BACK ----
  if (layer === 'wings' && loadout.wings) {
    const def = ITEM_CATALOG[loadout.wings];
    if (def) {
      ctx.save();
      ctx.translate(0, -23 + bob);
      const flap = Math.sin(timeMs / 170) * 3;
      if (def.styleVariant === 'basket') {
        ctx.fillStyle = def.primaryColor;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-11, -7, 22, 16, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = def.accentColor;
        ctx.fillRect(-10, -2, 20, 3);
        ctx.fillRect(-10, 3, 20, 2);
      } else if (def.styleVariant === 'yant_halo') {
        ctx.save();
        ctx.rotate(timeMs / 950);
        ctx.strokeStyle = def.primaryColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, -10, 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = def.accentColor;
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 10, -10 + Math.sin(a) * 10);
          ctx.lineTo(Math.cos(a) * 19, -10 + Math.sin(a) * 19);
          ctx.stroke();
        }
        ctx.restore();
      } else if (def.styleVariant === 'lotus_aura') {
        ctx.save();
        for (let i = 0; i < 6; i++) {
          const a = timeMs / 700 + (i / 6) * Math.PI * 2;
          const px = Math.cos(a) * 18;
          const py = -8 + Math.sin(a) * 12;
          ctx.fillStyle = i % 2 === 0 ? def.primaryColor : def.accentColor;
          ctx.beginPath();
          ctx.ellipse(px, py, 4.5, 2.6, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // Ember Wings or Radiant Garuda Wings
        ctx.fillStyle = def.primaryColor;
        ctx.strokeStyle = def.accentColor;
        ctx.lineWidth = 1.8;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 5, 0);
          ctx.quadraticCurveTo(side * 26, -16 + flap, side * 24, 4 + flap * 0.6);
          ctx.quadraticCurveTo(side * 16, 13, side * 5, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Secondary inner plumage accent
          ctx.fillStyle = def.accentColor;
          ctx.beginPath();
          ctx.moveTo(side * 7, 1);
          ctx.quadraticCurveTo(side * 19, -7 + flap * 0.7, side * 16, 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = def.primaryColor;
        }
      }
      ctx.restore();
    }
  }

  // ---- LAYER 2: BODY ----
  if (layer === 'body') {
    // Boots & base legs
    ctx.fillStyle = outline;
    ctx.fillRect(-7 + leftLeg, -10 + bob, 6, 10);
    ctx.fillRect(1 + rightLeg, -10 + bob, 6, 10);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-6 + leftLeg, -4 + bob, 4, 4);
    ctx.fillRect(2 + rightLeg, -4 + bob, 4, 4);

    // Base torso
    ctx.fillStyle = outline;
    ctx.fillRect(-9, -26 + bob, 18, 15);
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -25 + bob, 16, 13);

    // Arms
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = skin;
    ctx.fillRect(-12, -24 + bob, 4, 10);
    ctx.strokeRect(-12, -24 + bob, 4, 10);
    const armY = pose === 'attack' ? -28 + bob : -24 + bob;
    ctx.fillRect(8, armY, 4, 10);
    ctx.strokeRect(8, armY, 4, 10);

    // Chibi Head
    ctx.fillStyle = skin;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.roundRect(-12, -47 + bob, 24, 22, 9);
    ctx.fill();
    ctx.stroke();
  }

  // ---- LAYER 3: FACE / EYES ----
  if (layer === 'face' && facing !== 'up') {
    const shiftX = facing === 'right' || facing === 'left' ? 2 : 0;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.48)';
    ctx.fillRect(-9 + shiftX, -32 + bob, 4, 2);
    ctx.fillRect(5 + shiftX, -32 + bob, 4, 2);

    ctx.fillStyle = '#18181b';
    if (loadout.eyeStyle === 'cheerful') {
      ctx.fillRect(-7 + shiftX, -38 + bob, 4, 5);
      ctx.fillRect(3 + shiftX, -38 + bob, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6 + shiftX, -37 + bob, 2, 2);
      ctx.fillRect(4 + shiftX, -37 + bob, 2, 2);
    } else if (loadout.eyeStyle === 'cool') {
      ctx.fillRect(-8 + shiftX, -37 + bob, 5, 3);
      ctx.fillRect(3 + shiftX, -37 + bob, 5, 3);
    } else if (loadout.eyeStyle === 'starry') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-7 + shiftX, -38 + bob, 4, 5);
      ctx.fillRect(3 + shiftX, -38 + bob, 4, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-6 + shiftX, -37 + bob, 2, 2);
      ctx.fillRect(4 + shiftX, -37 + bob, 2, 2);
    } else {
      ctx.fillRect(-6 + shiftX, -37 + bob, 3, 4);
      ctx.fillRect(3 + shiftX, -37 + bob, 3, 4);
    }
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(-2 + shiftX, -30 + bob, 4, 2);
  }

  // ---- LAYER 4: PANTS ----
  if (layer === 'pants') {
    const def = loadout.pants ? ITEM_CATALOG[loadout.pants] : null;
    ctx.fillStyle = def?.primaryColor || '#334155';
    ctx.fillRect(-6 + leftLeg, -12 + bob, 5, 8);
    ctx.fillRect(1 + rightLeg, -12 + bob, 5, 8);
    ctx.fillRect(-7, -14 + bob, 14, 5);
    if (def?.accentColor) {
      ctx.fillStyle = def.accentColor;
      ctx.fillRect(-7, -14 + bob, 14, 2);
    }
  }

  // ---- LAYER 5: SHIRT / ARMOR ----
  if (layer === 'shirt') {
    const shirt = loadout.shirt ? ITEM_CATALOG[loadout.shirt] : null;
    const armor = loadout.armor ? ITEM_CATALOG[loadout.armor] : null;
    if (shirt) {
      ctx.fillStyle = shirt.primaryColor;
      ctx.fillRect(-8, -25 + bob, 16, 13);
      if (shirt.styleVariant === 'krama_set') {
        // Checkered Krama scarf across shoulders
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -25 + bob, 16, 4);
        ctx.fillStyle = '#dc2626';
        for (let sx = -8; sx < 8; sx += 4) {
          ctx.fillRect(sx, -25 + bob, 2, 4);
        }
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-7, -21 + bob, 14, 9);
      } else if (shirt.styleVariant === 'lbokator_gi') {
        // Diagonal sash + golden armbands
        ctx.fillStyle = shirt.accentColor;
        ctx.fillRect(-8, -25 + bob, 5, 12);
        ctx.fillRect(-12, -21 + bob, 4, 2);
        ctx.fillRect(8, -21 + bob, 4, 2);
      } else if (shirt.styleVariant === 'achar_robe') {
        ctx.fillStyle = shirt.accentColor;
        ctx.fillRect(-2, -25 + bob, 4, 13);
        ctx.fillRect(-8, -15 + bob, 16, 2);
      } else if (shirt.styleVariant === 'shadow_cloak') {
        ctx.fillStyle = shirt.accentColor;
        ctx.fillRect(-8, -25 + bob, 16, 2);
        ctx.fillRect(-3, -23 + bob, 6, 10);
      } else {
        ctx.fillStyle = shirt.accentColor;
        ctx.fillRect(-8, -24 + bob, 16, 3);
      }
    }

    // Shoulder armor pauldrons layered over shirt
    if (armor) {
      ctx.fillStyle = armor.primaryColor;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.2;
      ctx.fillRect(-12, -26 + bob, 6, 5);
      ctx.strokeRect(-12, -26 + bob, 6, 5);
      ctx.fillRect(6, -26 + bob, 6, 5);
      ctx.strokeRect(6, -26 + bob, 6, 5);
      ctx.fillStyle = armor.accentColor;
      ctx.fillRect(-11, -25 + bob, 4, 2);
      ctx.fillRect(7, -25 + bob, 4, 2);
    }
  }

  // ---- LAYER 6: HAIR ----
  if (layer === 'hair') {
    const hairItem = loadout.hair ? ITEM_CATALOG[loadout.hair] : null;
    const style = hairItem?.hairStyleOverride ?? loadout.hairStyle;
    ctx.fillStyle = loadout.hairColor || '#1e1b24';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-13, -50 + bob, 26, 11, 6);
    ctx.fill();
    ctx.stroke();

    if (style === 'hair_spiky') {
      ctx.beginPath();
      ctx.moveTo(-10, -48 + bob);
      ctx.lineTo(-6, -56 + bob);
      ctx.lineTo(0, -49 + bob);
      ctx.lineTo(6, -57 + bob);
      ctx.lineTo(10, -48 + bob);
      ctx.fill();
    } else if (style === 'hair_long' || style === 'hair_bob') {
      const h = style === 'hair_long' ? 21 : 12;
      ctx.fillRect(-13, -43 + bob, 4, h);
      ctx.fillRect(9, -43 + bob, 4, h);
    }
  }

  // ---- LAYER 7: HAT ----
  if (layer === 'hat' && loadout.hat) {
    const hat = ITEM_CATALOG[loadout.hat];
    if (hat) {
      ctx.save();
      ctx.translate(0, -47 + bob);
      if (hat.styleVariant === 'doun') {
        ctx.fillStyle = hat.primaryColor;
        ctx.strokeStyle = hat.accentColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-18, 2);
        ctx.lineTo(0, -13);
        ctx.lineTo(18, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (hat.styleVariant === 'yaksha_mask') {
        ctx.fillStyle = hat.primaryColor;
        ctx.strokeStyle = '#064e3b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-12, -8, 24, 14, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-8, -4, 5, 3);
        ctx.fillRect(3, -4, 5, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, 3, 3, 4);
        ctx.fillRect(3, 3, 3, 4);
      } else if (hat.styleVariant === 'frog_crown') {
        ctx.fillStyle = hat.primaryColor;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(-11, -7, 22, 9, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-9, -11, 5, 5);
        ctx.fillRect(4, -11, 5, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-7, -10, 2, 3);
        ctx.fillRect(6, -10, 2, 3);
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-3, -12, 6, 4);
      } else if (hat.styleVariant === 'royal_crown' || hat.styleVariant === 'apsara_crown') {
        ctx.fillStyle = hat.primaryColor;
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-10, 1);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-4, -3);
        ctx.lineTo(0, hat.styleVariant === 'apsara_crown' ? -17 : -14);
        ctx.lineTo(4, -3);
        ctx.lineTo(10, -8);
        ctx.lineTo(10, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-2, -6, 4, 4);
      } else if (hat.styleVariant === 'krama_bandana') {
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-13, 0, 26, 5);
        ctx.fillStyle = hat.primaryColor;
        for (let bx = -13; bx < 13; bx += 5) {
          ctx.fillRect(bx, 0, 3, 5);
        }
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-13, 0, 26, 5);
      } else if (hat.styleVariant === 'sun_straw') {
        ctx.fillStyle = hat.primaryColor;
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 1, 19, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(-10, -8, 20, 9, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-10, -2, 20, 2.5);
      }
      ctx.restore();
    }
  }

  // ---- LAYER 8: HELD WEAPON ----
  if (layer === 'weapon' && loadout.weapon) {
    const w = ITEM_CATALOG[loadout.weapon];
    if (w) {
      ctx.save();
      ctx.translate(11, -17 + bob);
      ctx.rotate(pose === 'attack' ? 0.95 : -0.32);

      if (w.styleVariant === 'phkak') {
        // Curved Khmer Phkak battle pole-axe
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-1.5, -18, 3, 26);
        ctx.fillStyle = w.primaryColor;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(1, -18);
        ctx.quadraticCurveTo(12, -20, 10, -9);
        ctx.lineTo(1, -12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-2, -12, 5, 3);
      } else if (w.styleVariant === 'thnu') {
        // Golden Reamker Longbow
        ctx.strokeStyle = w.primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(1, 0, 12, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(3, -11);
        ctx.lineTo(3, 11);
        ctx.stroke();
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-2, -1, 11, 2);
      } else if (w.styleVariant === 'sastra') {
        // Floating Sacred Palm-Leaf Tome
        const floatY = Math.sin(timeMs / 200) * 2;
        ctx.fillStyle = w.primaryColor;
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 1.4;
        ctx.fillRect(-5, -12 + floatY, 12, 8);
        ctx.strokeRect(-5, -12 + floatY, 12, 8);
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-3, -10 + floatY, 8, 4);
      } else if (w.styleVariant === 'krama_whip') {
        // Checkered Krama Whip Ribbon
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#ffffff';
          ctx.fillRect(0, -14 + i * 5, 6, 5);
        }
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -14, 6, 20);
      } else if (w.styleVariant === 'golden_pan') {
        // Secret No-Hit Relic: The Golden Frying Pan!
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-1.5, -6, 3, 12);
        ctx.fillStyle = w.primaryColor;
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -13, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = w.accentColor;
        ctx.beginPath();
        ctx.arc(-2, -15, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.styleVariant === 'stone_club') {
        // Heavy Stone Club (Dambong Thmor)
        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-2, 6);
        ctx.lineTo(-5, -18);
        ctx.lineTo(5, -18);
        ctx.lineTo(2, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-4, -14, 8, 3);
        ctx.fillRect(-3.5, -7, 7, 2.5);
      } else if (w.styleVariant === 'kambet') {
        // Curved Shadow Hunter Knife
        ctx.fillStyle = w.primaryColor;
        ctx.strokeStyle = w.accentColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2, 2);
        ctx.quadraticCurveTo(6, -8, 2, -17);
        ctx.lineTo(-2, -11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

export function drawFullPaperDollToCanvas(
  ctx: CanvasRenderingContext2D,
  loadout: EquippedLoadout,
  pose: PaperDollPose = 'idle',
  facing: PaperDollFacing = 'down',
  timeMs = 0
): void {
  for (const layer of LAYER_ORDER) {
    drawSinglePaperDollLayer(ctx, layer, loadout, pose, facing, timeMs);
  }
}

/**
 * Modular 8-Layer Phaser Container Paper-Doll.
 * Render Order Bottom -> Top:
 *   Wings/Back -> Body -> Face/Eyes -> Pants -> Shirt/Armor -> Hair -> Hat -> Held Weapon
 */
export class PaperDoll extends Phaser.GameObjects.Container {
  private layerImages = new Map<LayerName, Phaser.GameObjects.Image>();
  private keyPrefix: string;
  private loadout: EquippedLoadout;
  private currentPose: PaperDollPose = 'idle';
  private currentFacing: PaperDollFacing = 'down';
  private lastAnimTick = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    loadout: EquippedLoadout,
    keyPrefix = 'paperdoll'
  ) {
    super(scene, x, y);
    this.keyPrefix = keyPrefix;
    this.loadout = { ...loadout };

    // Create 8 distinct stacked Phaser Image layers in strict bottom-to-top order
    for (const layer of LAYER_ORDER) {
      const texKey = this.textureKeyFor(layer);
      this.ensureCanvasTexture(texKey);
      const img = scene.add.image(0, 0, texKey).setOrigin(0.5, 0.86);
      this.layerImages.set(layer, img);
      this.add(img);
    }

    this.redrawAllLayers(0);
    scene.add.existing(this);
  }

  private textureKeyFor(layer: LayerName): string {
    return `${this.keyPrefix}_${layer}`;
  }

  private ensureCanvasTexture(texKey: string): Phaser.Textures.CanvasTexture | null {
    if (this.scene.textures.exists(texKey)) {
      return this.scene.textures.get(texKey) as Phaser.Textures.CanvasTexture;
    }
    return this.scene.textures.createCanvas(texKey, CANVAS_W, CANVAS_H);
  }

  public setLoadout(next: EquippedLoadout): void {
    this.loadout = { ...next };
    this.redrawAllLayers(this.scene.time.now);
  }

  public setPoseAndFacing(pose: PaperDollPose, facing: PaperDollFacing, time: number): void {
    const changed = pose !== this.currentPose || facing !== this.currentFacing;
    this.currentPose = pose;
    this.currentFacing = facing;

    // Redraw immediately on pose/facing transition, or smoothly animate wings/halo/bob every ~110ms
    if (changed || time - this.lastAnimTick > 110) {
      this.lastAnimTick = time;
      this.redrawAllLayers(time);
    }
  }

  public setStealthTint(stealthFull: boolean): void {
    for (const img of this.layerImages.values()) {
      if (stealthFull) {
        img.setTint(0xc084fc);
      } else {
        img.clearTint();
      }
    }
    this.setAlpha(stealthFull ? 0.45 : 1);
  }

  public flashWhite(durationMs = 110): void {
    for (const img of this.layerImages.values()) {
      img.setTintFill(0xffffff);
    }
    this.scene.time.delayedCall(durationMs, () => {
      for (const img of this.layerImages.values()) {
        img.clearTint();
      }
    });
  }

  private redrawAllLayers(timeMs: number): void {
    for (const layer of LAYER_ORDER) {
      const texKey = this.textureKeyFor(layer);
      const canvasTex = this.ensureCanvasTexture(texKey);
      if (!canvasTex) continue;
      const ctx = canvasTex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawSinglePaperDollLayer(ctx, layer, this.loadout, this.currentPose, this.currentFacing, timeMs);
      canvasTex.refresh();
    }
  }
}
