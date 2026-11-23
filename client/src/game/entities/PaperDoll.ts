import Phaser from 'phaser';
import type { EquippedLoadout } from '@shared/types';
import { ITEM_CATALOG } from '../../data/items';

export type PaperDollPose =
  | 'idle'
  | 'walk1'
  | 'walk2'
  | 'walk3'
  | 'walk4'
  | 'jump'
  | 'attack'
  | 'parry';
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
const CANVAS_H = 72;
const OX = 32;
const OY = 62;
const PIXEL_OUTLINE = '#2b1b17';

/**
 * Lightens or darkens a #RRGGBB hex color for crisp 16-bit Stardew/Terraria pixel shading.
 */
function shadeHex(hex: string, delta: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + delta));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + delta));
  const b = Math.max(0, Math.min(255, (num & 0xff) + delta));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Draws a crisp 1px pixel-snapped outlined rectangle with optional top highlight & bottom shade.
 */
function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = PIXEL_OUTLINE
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = outline;
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(rx, ry, rw, rh);
}

/**
 * Draws a single modular 16-bit pixel-snapped layer onto any CanvasRenderingContext2D.
 * Crisp dark-brown (#2b1b17) 1px outlines, shaded skin/hair/tunic highlights, 4-frame walk cycle,
 * subtle 1px idle breathing bob, and directional Khmer weapon hold/swing/parry poses.
 */
export function drawSinglePaperDollLayer(
  ctx: CanvasRenderingContext2D,
  layer: LayerName,
  loadout: EquippedLoadout,
  pose: PaperDollPose,
  facing: PaperDollFacing,
  timeMs = 0
): void {
  const idleBob = Math.sin(timeMs / 340) > 0.25 ? -1 : 0;
  const bob =
    pose === 'walk1' || pose === 'walk3'
      ? -2
      : pose === 'walk2' || pose === 'walk4'
      ? 0
      : pose === 'jump'
      ? -3
      : pose === 'parry'
      ? -1
      : idleBob;

  // Crisp 4-frame walk cycle leg & arm offsets
  const leftLegY = pose === 'walk1' ? -2 : pose === 'jump' ? -2 : 0;
  const rightLegY = pose === 'walk3' ? -2 : pose === 'jump' ? -1 : 0;
  const leftLegX = pose === 'walk1' ? -2 : pose === 'walk3' ? 2 : pose === 'jump' ? -1 : 0;
  const rightLegX = pose === 'walk1' ? 2 : pose === 'walk3' ? -2 : pose === 'jump' ? 1 : 0;

  const leftArmSwing =
    pose === 'walk1' ? 2 : pose === 'walk3' ? -2 : pose === 'jump' ? -3 : pose === 'parry' ? -2 : 0;
  const rightArmSwing =
    pose === 'attack'
      ? -4
      : pose === 'parry'
      ? -5
      : pose === 'walk1'
      ? -2
      : pose === 'walk3'
      ? 2
      : pose === 'jump'
      ? -3
      : 0;

  const skin = loadout.skinColor || '#f4c29f';
  const skinLight = shadeHex(skin, 20);
  const skinShade = shadeHex(skin, -24);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(OX, OY);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // Anchor coordinates (pixel-snapped 24x32 chibi silhouette scaled 1.5x inside 64x72 canvas)
  // Feet at y = 0, Torso y = -22..-9, Head y = -45..-22
  const headY = -45 + bob;
  const torsoY = -22 + bob;

  // ---- LAYER 1: WINGS / BACK (Anchored cleanly at shoulder blades y = torsoY + 3) ----
  if (layer === 'wings' && loadout.wings) {
    const def = ITEM_CATALOG[loadout.wings];
    if (def) {
      ctx.save();
      ctx.translate(0, torsoY + 4);
      const flap = Math.round(Math.sin(timeMs / 170) * 2.5);
      if (def.styleVariant === 'basket') {
        pxRect(ctx, -9, -6, 18, 13, def.primaryColor);
        ctx.fillStyle = shadeHex(def.primaryColor, 18);
        ctx.fillRect(-9, -6, 18, 3);
        ctx.fillStyle = def.accentColor;
        ctx.fillRect(-9, -2, 18, 2);
        ctx.fillRect(-9, 2, 18, 2);
        // Woven bamboo vertical ribs
        ctx.fillStyle = shadeHex(def.primaryColor, -22);
        for (let bx = -6; bx <= 6; bx += 4) {
          ctx.fillRect(bx, -6, 1, 13);
        }
      } else if (def.styleVariant === 'yant_halo') {
        ctx.save();
        ctx.translate(0, -14);
        ctx.rotate(timeMs / 950);
        ctx.strokeStyle = PIXEL_OUTLINE;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = def.primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = def.accentColor;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
          ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
          ctx.stroke();
        }
        ctx.restore();
      } else if (def.styleVariant === 'lotus_aura') {
        for (let i = 0; i < 6; i++) {
          const a = timeMs / 700 + (i / 6) * Math.PI * 2;
          const px = Math.round(Math.cos(a) * 17);
          const py = Math.round(-8 + Math.sin(a) * 10);
          ctx.fillStyle = PIXEL_OUTLINE;
          ctx.fillRect(px - 3, py - 2, 7, 5);
          ctx.fillStyle = i % 2 === 0 ? def.primaryColor : def.accentColor;
          ctx.fillRect(px - 2, py - 1, 5, 3);
        }
      } else {
        // Shaded 16-bit Garuda / Ember / Angel-Demon feathered wings snapped to shoulders
        const primary = def.primaryColor;
        const shade = shadeHex(primary, -28);
        const accent = def.accentColor;
        for (const side of [-1, 1]) {
          // Outer dark-brown pixel outline
          ctx.fillStyle = PIXEL_OUTLINE;
          ctx.fillRect(side > 0 ? 5 : -22, -7 + flap, 17, 13);
          ctx.fillRect(side > 0 ? 11 : -26, -11 + flap, 15, 9);
          // Main wing feathers
          ctx.fillStyle = primary;
          ctx.fillRect(side > 0 ? 6 : -21, -6 + flap, 15, 11);
          ctx.fillRect(side > 0 ? 12 : -25, -10 + flap, 13, 7);
          // Lower wing shadow
          ctx.fillStyle = shade;
          ctx.fillRect(side > 0 ? 6 : -19, 1 + flap, 13, 4);
          // Bright feathered tips
          ctx.fillStyle = accent;
          ctx.fillRect(side > 0 ? 14 : -24, -9 + flap, 10, 3);
          ctx.fillRect(side > 0 ? 16 : -21, -3 + flap, 5, 2);
          ctx.fillRect(side > 0 ? 13 : -18, 0 + flap, 5, 2);
        }
      }
      ctx.restore();
    }
  }

  // ---- LAYER 2: BODY (Crisp 16-bit chibi head, torso, limbs & leather boots with 1px #2b1b17 outline) ----
  if (layer === 'body') {
    // Grounded leather boots & legs
    pxRect(ctx, -6 + leftLegX, -9 + leftLegY + bob, 5, 8, skinShade);
    pxRect(ctx, 1 + rightLegX, -9 + rightLegY + bob, 5, 8, skinShade);
    // Crisp boots with toe highlight
    pxRect(ctx, -6 + leftLegX, -4 + leftLegY + bob, 5, 4, '#5c3317');
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-5 + leftLegX, -4 + leftLegY + bob, 3, 1);
    pxRect(ctx, 1 + rightLegX, -4 + rightLegY + bob, 5, 4, '#5c3317');
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(2 + rightLegX, -4 + rightLegY + bob, 3, 1);

    // Shaded torso base
    pxRect(ctx, -7, torsoY, 14, 13, skin);
    ctx.fillStyle = skinShade;
    ctx.fillRect(-7, torsoY + 10, 14, 3);

    // Back / Left arm (swings naturally)
    pxRect(ctx, -11, torsoY + 1 + leftArmSwing, 4, 9, skin);
    ctx.fillStyle = skinShade;
    ctx.fillRect(-11, torsoY + 7 + leftArmSwing, 4, 3);

    // Front / Right weapon hand arm (raises during attack/parry)
    const rArmY = torsoY + 1 + rightArmSwing;
    pxRect(ctx, 7, rArmY, 4, 9, skin);
    ctx.fillStyle = skinLight;
    ctx.fillRect(8, rArmY, 2, 4);
    ctx.fillStyle = skinShade;
    ctx.fillRect(7, rArmY + 7, 4, 2);

    // Neck shadow connecting head & collar
    ctx.fillStyle = skinShade;
    ctx.fillRect(-3, torsoY - 1, 6, 2);

    // Expressive pixel-snapped Chibi Head (22x21px rounded-pixel silhouette)
    ctx.fillStyle = PIXEL_OUTLINE;
    ctx.fillRect(-10, headY - 1, 20, 23);
    ctx.fillRect(-12, headY + 1, 24, 19);
    ctx.fillRect(-11, headY, 22, 21);

    // Main skin fill
    ctx.fillStyle = skin;
    ctx.fillRect(-10, headY, 20, 21);
    ctx.fillRect(-11, headY + 2, 22, 17);

    // Top-left forehead highlight + chin shadow for 16-bit depth
    ctx.fillStyle = skinLight;
    ctx.fillRect(-9, headY + 1, 14, 3);
    ctx.fillRect(-10, headY + 3, 4, 4);
    ctx.fillStyle = skinShade;
    ctx.fillRect(-9, headY + 18, 18, 3);
    ctx.fillRect(8, headY + 5, 3, 13);
  }

  // ---- LAYER 3: FACE / EXPRESSIVE EYES ----
  if (layer === 'face' && facing !== 'up') {
    const sx = facing === 'right' || facing === 'left' ? 2 : 0;
    // Soft rosy pixel cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
    ctx.fillRect(-9 + sx, headY + 14, 3, 2);
    ctx.fillRect(6 + sx, headY + 14, 3, 2);

    // Crisp expressive pixel eyes
    if (loadout.eyeStyle === 'cheerful') {
      ctx.fillStyle = '#1e1b24';
      ctx.fillRect(-7 + sx, headY + 9, 4, 5);
      ctx.fillRect(3 + sx, headY + 9, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6 + sx, headY + 10, 2, 2);
      ctx.fillRect(4 + sx, headY + 10, 2, 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-5 + sx, headY + 13, 1, 1);
      ctx.fillRect(5 + sx, headY + 13, 1, 1);
    } else if (loadout.eyeStyle === 'cool') {
      ctx.fillStyle = '#1e1b24';
      ctx.fillRect(-8 + sx, headY + 10, 5, 3);
      ctx.fillRect(3 + sx, headY + 10, 5, 3);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-7 + sx, headY + 10, 2, 1);
      ctx.fillRect(4 + sx, headY + 10, 2, 1);
    } else if (loadout.eyeStyle === 'starry') {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-7 + sx, headY + 9, 4, 5);
      ctx.fillRect(3 + sx, headY + 9, 4, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-6 + sx, headY + 10, 2, 2);
      ctx.fillRect(4 + sx, headY + 10, 2, 2);
    } else {
      ctx.fillStyle = '#1e1b24';
      ctx.fillRect(-6 + sx, headY + 10, 3, 4);
      ctx.fillRect(3 + sx, headY + 10, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6 + sx, headY + 10, 1, 1);
      ctx.fillRect(3 + sx, headY + 10, 1, 1);
    }

    // Subtle smile / fierce mouth on attack
    ctx.fillStyle = '#7c2d12';
    if (pose === 'attack' || pose === 'parry') {
      ctx.fillRect(-2 + sx, headY + 16, 4, 2);
    } else {
      ctx.fillRect(-2 + sx, headY + 16, 4, 1);
      ctx.fillRect(-1 + sx, headY + 17, 2, 1);
    }
  }

  // ---- LAYER 4: PANTS / SAMPOT ----
  if (layer === 'pants') {
    const def = loadout.pants ? ITEM_CATALOG[loadout.pants] : null;
    const base = def?.primaryColor || '#334155';
    const shade = shadeHex(base, -26);
    const light = shadeHex(base, 18);

    // Waistband + pixel-shaded pant legs
    pxRect(ctx, -7, torsoY + 11, 14, 4, base);
    pxRect(ctx, -6 + leftLegX, -10 + leftLegY + bob, 5, 6, base);
    pxRect(ctx, 1 + rightLegX, -10 + rightLegY + bob, 5, 6, base);

    ctx.fillStyle = light;
    ctx.fillRect(-6 + leftLegX, -10 + leftLegY + bob, 2, 4);
    ctx.fillRect(2 + rightLegX, -10 + rightLegY + bob, 2, 4);
    ctx.fillStyle = shade;
    ctx.fillRect(-3 + leftLegX, -8 + leftLegY + bob, 2, 4);
    ctx.fillRect(4 + rightLegX, -8 + rightLegY + bob, 2, 4);

    if (def?.accentColor) {
      ctx.fillStyle = def.accentColor;
      ctx.fillRect(-7, torsoY + 11, 14, 2);
      if (def.styleVariant === 'sampot') {
        ctx.fillRect(-6 + leftLegX, -6 + leftLegY + bob, 5, 1);
        ctx.fillRect(1 + rightLegX, -6 + rightLegY + bob, 5, 1);
      }
    }
  }

  // ---- LAYER 5: SHIRT / KRAMA / ARMOR (Shaded tunic + anchored Krama scarf + pauldrons) ----
  if (layer === 'shirt') {
    const shirt = loadout.shirt ? ITEM_CATALOG[loadout.shirt] : null;
    const armor = loadout.armor ? ITEM_CATALOG[loadout.armor] : null;
    const base = shirt?.primaryColor || '#3b82f6';
    const light = shadeHex(base, 24);
    const dark = shadeHex(base, -28);

    // Tunic core with crisp dark-brown outline & pixel folds
    pxRect(ctx, -7, torsoY, 14, 12, base);
    ctx.fillStyle = light;
    ctx.fillRect(-6, torsoY + 1, 5, 8);
    ctx.fillStyle = dark;
    ctx.fillRect(3, torsoY + 1, 4, 10);
    ctx.fillRect(-7, torsoY + 10, 14, 2);

    // Sleeves snapped to arms
    pxRect(ctx, -11, torsoY + 1 + leftArmSwing, 4, 5, base);
    pxRect(ctx, 7, torsoY + 1 + rightArmSwing, 4, 5, base);

    if (shirt?.styleVariant === 'krama_set') {
      // Iconic checkered red/white Khmer Krama scarf snapped cleanly around neck & collar
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-7, torsoY + 4, 14, 8);
      ctx.fillStyle = '#e7d5a8';
      ctx.fillRect(3, torsoY + 4, 4, 8);
      // Krama checkered wrap
      pxRect(ctx, -8, torsoY - 1, 16, 4, '#ffffff');
      ctx.fillStyle = '#dc2626';
      for (let kx = -8; kx < 8; kx += 4) {
        ctx.fillRect(kx, torsoY - 1, 2, 2);
        ctx.fillRect(kx + 2, torsoY + 1, 2, 2);
      }
      // Hanging Krama scarf tail
      pxRect(ctx, 3, torsoY + 3, 4, 6, '#dc2626');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, torsoY + 5, 2, 2);
      ctx.fillRect(5, torsoY + 7, 2, 2);
    } else if (shirt?.styleVariant === 'lbokator_gi') {
      ctx.fillStyle = shirt.accentColor;
      ctx.fillRect(-7, torsoY, 4, 12);
      ctx.fillRect(-11, torsoY + 4 + leftArmSwing, 4, 2);
      ctx.fillRect(7, torsoY + 4 + rightArmSwing, 4, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-6, torsoY + 1, 2, 10);
    } else if (shirt?.styleVariant === 'achar_robe') {
      ctx.fillStyle = shirt.accentColor;
      ctx.fillRect(-2, torsoY, 4, 12);
      ctx.fillRect(-7, torsoY + 9, 14, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-1, torsoY + 1, 2, 9);
    } else if (shirt?.styleVariant === 'shadow_cloak') {
      ctx.fillStyle = shirt.accentColor;
      ctx.fillRect(-7, torsoY, 14, 2);
      ctx.fillRect(-2, torsoY + 2, 4, 10);
    } else if (shirt) {
      // Classic Stardew collar trim + belt buckle
      ctx.fillStyle = shirt.accentColor;
      ctx.fillRect(-4, torsoY, 8, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-7, torsoY + 9, 14, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-2, torsoY + 9, 4, 2);
    }

    // Shoulder armor pauldrons cleanly seated on shoulder anchors
    if (armor) {
      pxRect(ctx, -12, torsoY - 1 + Math.round(leftArmSwing * 0.4), 6, 5, armor.primaryColor);
      pxRect(ctx, 6, torsoY - 1 + Math.round(rightArmSwing * 0.4), 6, 5, armor.primaryColor);
      ctx.fillStyle = armor.accentColor;
      ctx.fillRect(-11, torsoY + Math.round(leftArmSwing * 0.4), 4, 2);
      ctx.fillRect(7, torsoY + Math.round(rightArmSwing * 0.4), 4, 2);
    }
  }

  // ---- LAYER 6: HAIR (Pixel-snapped crown & specular highlight band) ----
  if (layer === 'hair') {
    const hairItem = loadout.hair ? ITEM_CATALOG[loadout.hair] : null;
    const style = hairItem?.hairStyleOverride ?? loadout.hairStyle;
    const hairCol = loadout.hairColor || '#1e1b24';
    const hairHi = shadeHex(hairCol, 34);
    const hairSh = shadeHex(hairCol, -24);

    // Main hair cap locked to top of head (headY - 3)
    ctx.fillStyle = PIXEL_OUTLINE;
    ctx.fillRect(-11, headY - 4, 22, 11);
    ctx.fillRect(-13, headY - 2, 26, 9);

    ctx.fillStyle = hairCol;
    ctx.fillRect(-10, headY - 3, 20, 9);
    ctx.fillRect(-12, headY - 1, 24, 7);

    // Front bangs & shading
    ctx.fillStyle = hairSh;
    ctx.fillRect(-11, headY + 4, 22, 2);
    ctx.fillRect(-4, headY + 5, 3, 2);
    ctx.fillRect(3, headY + 5, 3, 2);

    // Pixel specular shine across hair crown
    ctx.fillStyle = hairHi;
    ctx.fillRect(-8, headY - 2, 6, 2);
    ctx.fillRect(1, headY - 2, 4, 2);

    if (style === 'hair_spiky') {
      pxRect(ctx, -9, headY - 7, 4, 4, hairCol);
      pxRect(ctx, -2, headY - 9, 5, 6, hairCol);
      pxRect(ctx, 5, headY - 7, 4, 4, hairCol);
      ctx.fillStyle = hairHi;
      ctx.fillRect(-1, headY - 8, 2, 3);
    } else if (style === 'hair_long' || style === 'hair_bob') {
      const h = style === 'hair_long' ? 18 : 11;
      pxRect(ctx, -12, headY + 5, 3, h, hairCol);
      pxRect(ctx, 9, headY + 5, 3, h, hairCol);
      ctx.fillStyle = hairHi;
      ctx.fillRect(-11, headY + 7, 1, Math.min(8, h - 2));
      ctx.fillRect(10, headY + 7, 1, Math.min(8, h - 2));
    }
  }

  // ---- LAYER 7: HAT (Snapped directly to head crown anchor headY - 2 with zero floating) ----
  if (layer === 'hat' && loadout.hat) {
    const hat = ITEM_CATALOG[loadout.hat];
    if (hat) {
      ctx.save();
      ctx.translate(0, headY - 1);
      if (hat.styleVariant === 'doun') {
        // Traditional conical Khmer palm-leaf Doun hat with woven ridges
        ctx.fillStyle = PIXEL_OUTLINE;
        ctx.beginPath();
        ctx.moveTo(-18, 4);
        ctx.lineTo(0, -12);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hat.primaryColor;
        ctx.beginPath();
        ctx.moveTo(-16, 3);
        ctx.lineTo(0, -10);
        ctx.lineTo(16, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shadeHex(hat.primaryColor, 22);
        ctx.beginPath();
        ctx.moveTo(-12, 2);
        ctx.lineTo(0, -9);
        ctx.lineTo(-2, 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-15, 2, 30, 2);
      } else if (hat.styleVariant === 'yaksha_mask') {
        pxRect(ctx, -11, -7, 22, 13, hat.primaryColor);
        ctx.fillStyle = shadeHex(hat.primaryColor, 22);
        ctx.fillRect(-10, -6, 20, 3);
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-8, -3, 5, 3);
        ctx.fillRect(3, -3, 5, 3);
        ctx.fillRect(-2, -6, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, 3, 3, 4);
        ctx.fillRect(3, 3, 3, 4);
      } else if (hat.styleVariant === 'frog_crown') {
        pxRect(ctx, -10, -5, 20, 8, hat.primaryColor);
        ctx.fillStyle = shadeHex(hat.primaryColor, 24);
        ctx.fillRect(-9, -4, 18, 2);
        pxRect(ctx, -9, -10, 5, 5, '#ffffff');
        pxRect(ctx, 4, -10, 5, 5, '#ffffff');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-7, -9, 2, 3);
        ctx.fillRect(6, -9, 2, 3);
        pxRect(ctx, -3, -11, 6, 4, hat.accentColor);
      } else if (hat.styleVariant === 'royal_crown' || hat.styleVariant === 'apsara_crown') {
        const spireH = hat.styleVariant === 'apsara_crown' ? 16 : 13;
        pxRect(ctx, -10, -5, 20, 7, hat.primaryColor);
        pxRect(ctx, -6, -9, 12, 4, hat.primaryColor);
        pxRect(ctx, -2, -spireH, 4, spireH - 8, '#fef08a');
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-2, -4, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -spireH + 1, 2, 3);
      } else if (hat.styleVariant === 'krama_bandana') {
        pxRect(ctx, -12, 1, 24, 5, hat.accentColor);
        ctx.fillStyle = hat.primaryColor;
        for (let bx = -12; bx < 12; bx += 4) {
          ctx.fillRect(bx, 1, 2, 3);
          ctx.fillRect(bx + 2, 3, 2, 3);
        }
      } else if (hat.styleVariant === 'spirit_veil') {
        pxRect(ctx, -11, -3, 22, 6, hat.primaryColor);
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-9, -2, 18, 2);
        pxRect(ctx, -2, -7, 4, 4, '#facc15');
      } else if (hat.styleVariant === 'sun_straw') {
        pxRect(ctx, -16, 1, 32, 3, hat.primaryColor);
        pxRect(ctx, -10, -6, 20, 7, hat.primaryColor);
        ctx.fillStyle = shadeHex(hat.primaryColor, 20);
        ctx.fillRect(-9, -5, 18, 2);
        ctx.fillStyle = hat.accentColor;
        ctx.fillRect(-10, -1, 20, 2);
      }
      ctx.restore();
    }
  }

  // ---- LAYER 8: HELD KHMER WEAPON (Snapped directly into right hand grip!) ----
  if (layer === 'weapon' && loadout.weapon) {
    const w = ITEM_CATALOG[loadout.weapon];
    if (w) {
      ctx.save();
      const handX = 10;
      const handY = torsoY + 6 + rightArmSwing;
      ctx.translate(handX, handY);

      if (pose === 'parry') {
        ctx.rotate(-0.18);
        // Glowing golden Angkor parry guard arc
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(3, -6, 15, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(4, -6, 13, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      } else if (pose === 'attack') {
        ctx.rotate(1.18);
        // Subtle crisp weapon swing motion trail
        ctx.strokeStyle = w.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-2, -4, 18, -1.3, 0.25);
        ctx.stroke();
      } else {
        ctx.rotate(-0.34);
      }

      if (w.styleVariant === 'preah_khan' || w.styleVariant === 'evolving_blade') {
        // Ornate Khmer Sacred Sword (Preah Khan / Evolving Blade of Angkor)
        pxRect(ctx, -1, -2, 3, 9, '#78350f'); // grip
        pxRect(ctx, -5, -4, 11, 3, '#facc15'); // Angkor crossguard
        pxRect(ctx, -2, -23, 5, 19, w.primaryColor); // gleaming blade
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -22, 2, 16); // edge gleam
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(0, -18, 2, 11); // elemental rune channel
        pxRect(ctx, -1, -25, 3, 2, '#fef9c3'); // tip
      } else if (w.styleVariant === 'golden_crossbow') {
        // Ornate Crossbow of the Golden Riel
        pxRect(ctx, -4, -3, 16, 4, '#92400e'); // stock
        pxRect(ctx, 2, -10, 4, 18, w.primaryColor); // golden bow arms
        ctx.fillStyle = '#fef9c3';
        ctx.fillRect(-2, -2, 14, 2); // rail
        pxRect(ctx, 10, -4, 5, 5, '#facc15'); // chambered Golden Riel coin
      } else if (w.styleVariant === 'phkak') {
        // Curved Khmer Phkak pole-axe
        pxRect(ctx, -1, -18, 3, 25, '#78350f');
        pxRect(ctx, 2, -19, 9, 8, w.primaryColor);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, -19, 3, 7);
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-2, -12, 5, 3);
      } else if (w.styleVariant === 'thnu') {
        // Golden Reamker Longbow
        ctx.strokeStyle = PIXEL_OUTLINE;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, -2, 12, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.strokeStyle = w.primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -2, 12, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, -13);
        ctx.lineTo(2, 9);
        ctx.stroke();
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-2, -3, 12, 2);
      } else if (w.styleVariant === 'sastra' || w.styleVariant === 'fractured_tome') {
        const floatY = Math.round(Math.sin(timeMs / 200) * 2);
        pxRect(ctx, -4, -14 + floatY, 12, 9, w.primaryColor);
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-2, -12 + floatY, 8, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -11 + floatY, 4, 2);
      } else if (w.styleVariant === 'hanuman_banner') {
        // Hanuman Spirit Banner pole + flowing royal crimson/gold pennant
        pxRect(ctx, -1, -22, 3, 29, '#92400e');
        pxRect(ctx, 2, -21, 11, 9, '#dc2626');
        ctx.fillStyle = '#facc15';
        ctx.fillRect(3, -19, 8, 2);
        ctx.fillRect(5, -16, 4, 3);
        pxRect(ctx, -2, -25, 5, 3, '#facc15');
      } else if (w.styleVariant === 'krama_whip') {
        for (let i = 0; i < 4; i++) {
          pxRect(ctx, 0, -15 + i * 5, 5, 5, i % 2 === 0 ? '#dc2626' : '#ffffff');
        }
      } else if (w.styleVariant === 'golden_pan') {
        pxRect(ctx, -1, -5, 3, 11, '#78350f');
        pxRect(ctx, -6, -18, 13, 12, w.primaryColor);
        ctx.fillStyle = '#fef9c3';
        ctx.fillRect(-4, -16, 4, 4);
      } else if (w.styleVariant === 'stone_club') {
        pxRect(ctx, -3, -18, 7, 23, '#57534e');
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(-3, -14, 7, 3);
        ctx.fillRect(-2, -7, 5, 2);
      } else if (w.styleVariant === 'kambet' || w.styleVariant === 'frost_fang') {
        pxRect(ctx, -1, -1, 3, 7, '#334155');
        pxRect(ctx, -2, -15, 5, 14, w.primaryColor);
        ctx.fillStyle = w.accentColor;
        ctx.fillRect(1, -14, 2, 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -16, 3, 2);
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

    if (changed || time - this.lastAnimTick > 95) {
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
