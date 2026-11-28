import Phaser from 'phaser';
import { DEFAULT_LOADOUT, type EquippedLoadout, type KhmerEmoteId } from '@shared/types';
import {
  normalizeEyeStyleId,
  normalizeEyebrowStyleId,
  normalizeFaceStyleId,
  normalizeHairStyleId,
  resolveSkinToneDef,
} from '@shared/characterStyles';
import { ITEM_CATALOG } from '../../data/items';
import { COMBAT_ARMOR_SETS } from '../../data/armorSets';
import { vfxManager } from '../animations/VFXManager';

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

const NA_BASE = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';

const WEAPON_URLS: Record<string, string> = {
  wp_axe: `${NA_BASE}/Items/Weapons/Axe/SpriteInHand.png`,
  wp_bigsword: `${NA_BASE}/Items/Weapons/BigSword/SpriteInHand.png`,
  wp_sword2: `${NA_BASE}/Items/Weapons/Sword2/SpriteInHand.png`,
  wp_bow: `${NA_BASE}/Items/Weapons/Bow/Sprite.png`,
  wp_bow2: `${NA_BASE}/Items/Weapons/Bow2/Sprite.png`,
  wp_book: `${NA_BASE}/Items/Weapons/Book/SpriteInHand.png`,
  wp_whip: `${NA_BASE}/Items/Weapons/Whip/SpriteInHand.png`,
  wp_lance2: `${NA_BASE}/Items/Weapons/Lance2/SpriteInHand.png`,
  wp_sai: `${NA_BASE}/Items/Weapons/Sai/SpriteInHand.png`,
  wp_club: `${NA_BASE}/Items/Weapons/Club/SpriteInHand.png`,
};

/**
 * Update 2.3 — High-Detail 4-Frame Animated PNG Wings (192x48 = 4 frames of 48x48)
 */
const ANIMATED_PNG_WINGS: Record<string, { url: string; animKey: string; glowColor: number; bloomStrength: number }> = {
  wings_bamboo_leaf_glider: {
    url: '/assets/khmer/wings/wings_bamboo_leaf_glider.png',
    animKey: 'wings_bamboo_leaf_glider_anim',
    glowColor: 0x4ade80,
    bloomStrength: 1.0,
  },
  wings_golden_apsara_feathers: {
    url: '/assets/khmer/wings/wings_golden_apsara_feathers.png',
    animKey: 'wings_golden_apsara_feathers_anim',
    glowColor: 0xfacc15,
    bloomStrength: 1.4,
  },
  wings_storm_crystal: {
    url: '/assets/khmer/wings/wings_storm_crystal.png',
    animKey: 'wings_storm_crystal_anim',
    glowColor: 0x38bdf8,
    bloomStrength: 1.45,
  },
  wings_celestial_naga_dragon: {
    url: '/assets/khmer/wings/wings_celestial_naga_dragon.png',
    animKey: 'wings_celestial_naga_dragon_anim',
    glowColor: 0x10b981,
    bloomStrength: 1.6,
  },
  wings_solar_angkor_seraph: {
    url: '/assets/khmer/wings/wings_solar_angkor_seraph.png',
    animKey: 'wings_solar_angkor_seraph_anim',
    glowColor: 0xfde047,
    bloomStrength: 1.85,
  },
  wings_void_phantom_butterfly: {
    url: '/assets/khmer/wings/wings_void_phantom_butterfly.png',
    animKey: 'wings_void_phantom_butterfly_anim',
    glowColor: 0xc084fc,
    bloomStrength: 1.65,
  },
};

const OUTLINE = '#2b1b17';
const CANVAS_W = 36;
const CANVAS_H = 40;

const previewImgCache = new Map<string, HTMLImageElement>();
function getCachedHtmlImg(url: string): HTMLImageElement | null {
  let img = previewImgCache.get(url);
  if (!img && typeof Image !== 'undefined') {
    img = new Image();
    img.src = url;
    previewImgCache.set(url, img);
  }
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Maps equipped Khmer weapon to a real pixel-art Ninja Adventure weapon sprite key & elemental tint.
 */
export function resolveWeaponSprite(weaponId: string | null): { key: string; tint?: number } | null {
  if (!weaponId) return null;
  if (weaponId === 'weapon_preah_khan') return { key: 'wp_bigsword', tint: 0xfacc15 };
  if (weaponId === 'weapon_evolving_angkor_blade') return { key: 'wp_sword2', tint: 0xfde047 };
  if (weaponId === 'weapon_golden_riel_shot') return { key: 'wp_bow2', tint: 0xfacc15 };
  if (weaponId === 'weapon_thnu') return { key: 'wp_bow' };
  if (
    weaponId === 'weapon_fractured_yant_tome' ||
    weaponId === 'weapon_celestial_yant_tome' ||
    weaponId === 'weapon_sastra'
  ) {
    return { key: 'wp_book', tint: weaponId === 'weapon_sastra' ? undefined : 0xfde047 };
  }
  if (weaponId === 'weapon_frost_fang_singha') return { key: 'wp_sai', tint: 0x7dd3fc };
  if (weaponId === 'weapon_kambet' || weaponId === 'weapon_naga_fang' || weaponId === 'weapon_reality_rip_blade') {
    return { key: 'wp_sai', tint: weaponId === 'weapon_reality_rip_blade' ? 0xe879f9 : undefined };
  }
  if (weaponId === 'weapon_hanuman_banner') return { key: 'wp_lance2', tint: 0xfacc15 };
  if (weaponId === 'weapon_krama_whip' || weaponId === 'weapon_evolving_angkor_relic') {
    return { key: 'wp_whip' };
  }
  if (weaponId === 'weapon_golden_pan') return { key: 'wp_club', tint: 0xfacc15 };
  if (weaponId === 'weapon_stone_club') return { key: 'wp_club' };
  return { key: 'wp_axe' };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function shiftHex(hex: string | undefined | null, delta: number): string {
  if (typeof hex !== 'string') return '#1e1b24';
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = clampByte(parseInt(clean.slice(0, 2), 16) + delta);
  const g = clampByte(parseInt(clean.slice(2, 4), 16) + delta);
  const b = clampByte(parseInt(clean.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function buildLoadoutSignature(raw: EquippedLoadout | null | undefined): string {
  const loadout = { ...DEFAULT_LOADOUT, ...(raw ?? {}) };
  return [
    loadout.skinTone || loadout.skinColor || '',
    loadout.hairStyle || '',
    loadout.hairColor || '',
    loadout.eyeStyle || '',
    loadout.eyeColor || '',
    loadout.eyebrowStyle || '',
    loadout.faceStyle || '',
    loadout.hat ?? '',
    loadout.hair ?? '',
    loadout.shirt ?? '',
    loadout.pants ?? '',
    loadout.wings ?? '',
    loadout.armor ?? '',
    loadout.showVanityOverArmor === false ? 'armor_vis' : 'vanity_vis',
  ].join('|');
}

/**
 * Renders the 24x32 pixel-art Human Chibi Paper-Doll onto a 36x40 pixel-snapped canvas (layers 1..9).
 * Layer 10 (held Khmer weapon) is drawn separately by the caller for live swing rotation & sprite crispness.
 */
function renderHumanChibiPixels(
  ctx: CanvasRenderingContext2D,
  rawLoadout: EquippedLoadout | null | undefined,
  pose: PaperDollPose,
  facing: PaperDollFacing
): void {
  const loadout: EquippedLoadout = { ...DEFAULT_LOADOUT, ...(rawLoadout ?? {}) };
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Origin: character feet sit at y = 36, horizontal center at x = 18
  const cx = 18;
  const isSide = facing === 'left' || facing === 'right';
  const isUp = facing === 'up';
  const flipSide = facing === 'left';

  const walkStep =
    pose === 'walk1' ? 1 : pose === 'walk2' ? 0 : pose === 'walk3' ? -1 : pose === 'walk4' ? 0 : 0;
  const bodyBob =
    pose === 'walk1' || pose === 'walk3' ? -1 : pose === 'jump' ? -2 : pose === 'attack' ? 0 : 0;

  const skin = resolveSkinToneDef(loadout.skinTone || loadout.skinColor);
  const hairItem = loadout.hair ? ITEM_CATALOG[loadout.hair] : undefined;
  const hairStyle = normalizeHairStyleId(hairItem?.hairStyleOverride ?? loadout.hairStyle);
  const hairMain =
    hairStyle === 'silver_spiky' && loadout.hair === 'hair_silver_spiky'
      ? '#e2e8f0'
      : loadout.hairColor || '#1e1b24';
  const hairShade = shiftHex(hairMain, -40);
  const hairHi = shiftHex(hairMain, 48);

  const eyeStyle = normalizeEyeStyleId(loadout.eyeStyle);
  const eyeColor = eyeStyle === 'glowing_gold' ? '#facc15' : loadout.eyeColor || '#1c1917';
  const browStyle = normalizeEyebrowStyleId(loadout.eyebrowStyle);
  const faceStyle = normalizeFaceStyleId(loadout.faceStyle);

  const showVanity = loadout.showVanityOverArmor !== false;
  const combatArmorSet = loadout.armor ? COMBAT_ARMOR_SETS[loadout.armor] : undefined;

  const shirtDef = loadout.shirt ? ITEM_CATALOG[loadout.shirt] : ITEM_CATALOG.shirt_village_tunic;
  const pantsDef = loadout.pants ? ITEM_CATALOG[loadout.pants] : ITEM_CATALOG.pants_village_shorts;
  const hatDef = loadout.hat ? ITEM_CATALOG[loadout.hat] : undefined;
  const wingsDef = loadout.wings ? ITEM_CATALOG[loadout.wings] : undefined;

  // Vanity items ALWAYS override visual style when showVanity is ON (default).
  // When toggled OFF and a Combat Armor Set is worn, display its combat armor plates!
  const useCombatArmorLook = !showVanity && Boolean(combatArmorSet);
  const shirtMain = useCombatArmorLook ? combatArmorSet!.primaryColor : (shirtDef?.primaryColor ?? '#3b82f6');
  const shirtAccent = useCombatArmorLook ? combatArmorSet!.accentColor : (shirtDef?.accentColor ?? '#fef3c7');
  const shirtShade = shiftHex(shirtMain, -36);
  const shirtHi = shiftHex(shirtMain, 26);

  const pantsMain = useCombatArmorLook ? combatArmorSet!.pantsColor : (pantsDef?.primaryColor ?? '#334155');
  const pantsAccent = useCombatArmorLook ? combatArmorSet!.accentColor : (pantsDef?.accentColor ?? '#64748b');
  const pantsShade = shiftHex(pantsMain, -30);

  ctx.save();
  if (flipSide) {
    ctx.translate(CANVAS_W, 0);
    ctx.scale(-1, 1);
  }

  const headY = 9 + bodyBob;
  const torsoY = 21 + bodyBob;
  const legY = 29 + bodyBob;

  // ==================== LAYER 1: WINGS / BACK ====================
  // Helper so procedural wings draw behind the body normally, AND IN FRONT OF the back when walking upward (isUp)!
  const drawProceduralWings = () => {
    if (!wingsDef || (loadout.wings && ANIMATED_PNG_WINGS[loadout.wings])) return;
    const wMain = wingsDef.primaryColor;
    const wAcc = wingsDef.accentColor;
    const wVar = wingsDef.styleVariant;
    if (wVar === 'basket') {
      px(ctx, cx - 5, torsoY - 1, 10, 8, OUTLINE);
      px(ctx, cx - 4, torsoY, 8, 6, wMain);
      px(ctx, cx - 4, torsoY + 1, 8, 1, wAcc);
      px(ctx, cx - 4, torsoY + 4, 8, 1, wAcc);
    } else if (wVar === 'yant_halo' || wVar === 'lotus_aura' || wVar === 'celestial_naga') {
      px(ctx, cx - 10, headY + 4, 20, 2, wMain);
      px(ctx, cx - 11, headY + 6, 2, 10, wMain);
      px(ctx, cx + 9, headY + 6, 2, 10, wMain);
      px(ctx, cx - 10, headY + 16, 20, 2, wMain);
      px(ctx, cx - 9, headY + 5, 2, 2, wAcc);
      px(ctx, cx + 7, headY + 5, 2, 2, wAcc);
      px(ctx, cx - 9, headY + 15, 2, 2, wAcc);
      px(ctx, cx + 7, headY + 15, 2, 2, wAcc);
    } else {
      const leftColor = wVar === 'angel_demon' ? '#f8fafc' : wMain;
      const rightColor = wVar === 'angel_demon' ? '#e11d48' : wMain;
      // Left wing
      px(ctx, cx - 15, torsoY - 4, 9, 10, OUTLINE);
      px(ctx, cx - 14, torsoY - 3, 7, 7, leftColor);
      px(ctx, cx - 13, torsoY - 2, 5, 2, wAcc);
      px(ctx, cx - 14, torsoY + 4, 4, 2, OUTLINE);
      // Right wing
      px(ctx, cx + 6, torsoY - 4, 9, 10, OUTLINE);
      px(ctx, cx + 7, torsoY - 3, 7, 7, rightColor);
      px(ctx, cx + 8, torsoY - 2, 5, 2, wAcc);
      px(ctx, cx + 10, torsoY + 4, 4, 2, OUTLINE);
      // Center back clasp when facing upward so wings attach cleanly onto the back!
      if (isUp) {
        px(ctx, cx - 5, torsoY - 1, 10, 4, OUTLINE);
        px(ctx, cx - 4, torsoY, 8, 2, wAcc);
      }
    }
  };
  if (!isUp) {
    drawProceduralWings();
  }

  // ==================== BACK HAIR LAYER (behind body/shoulders) ====================
  if (
    hairStyle === 'long_straight' ||
    hairStyle === 'braided_royal' ||
    hairStyle === 'royal_braided_crown' ||
    hairStyle === 'flowing_apsara_waves' ||
    hairStyle === 'wolf_cut' ||
    hairStyle === 'twin_tails' ||
    hairStyle === 'high_ponytail' ||
    hairStyle === 'bob_cut'
  ) {
    if (
      hairStyle === 'long_straight' ||
      hairStyle === 'braided_royal' ||
      hairStyle === 'royal_braided_crown' ||
      hairStyle === 'flowing_apsara_waves'
    ) {
      px(ctx, cx - 8, headY + 4, 16, 16, OUTLINE);
      px(ctx, cx - 7, headY + 5, 14, 14, hairShade);
      px(ctx, cx - 6, headY + 6, 12, 12, hairMain);
      if (hairStyle === 'flowing_apsara_waves') {
        px(ctx, cx - 9, headY + 11, 2, 8, OUTLINE);
        px(ctx, cx - 8, headY + 12, 2, 6, hairMain);
        px(ctx, cx + 7, headY + 11, 2, 8, OUTLINE);
        px(ctx, cx + 6, headY + 12, 2, 6, hairMain);
        px(ctx, cx - 5, headY + 14, 10, 1, hairHi);
      }
      if (hairStyle === 'braided_royal' || hairStyle === 'royal_braided_crown') {
        px(ctx, cx - 7, headY + 13, 2, 6, '#facc15');
        px(ctx, cx + 5, headY + 13, 2, 6, '#facc15');
      }
    } else if (hairStyle === 'wolf_cut') {
      // Shaggy layered wolf-cut mullet back locks
      px(ctx, cx - 9, headY + 6, 18, 10, OUTLINE);
      px(ctx, cx - 8, headY + 7, 16, 8, hairShade);
      px(ctx, cx - 7, headY + 8, 14, 6, hairMain);
      px(ctx, cx - 9, headY + 14, 3, 2, hairMain);
      px(ctx, cx + 6, headY + 14, 3, 2, hairMain);
    } else if (hairStyle === 'twin_tails') {
      // Long bouncy twin tails framing both shoulders
      px(ctx, cx - 12, headY + 3, 5, 14, OUTLINE);
      px(ctx, cx - 11, headY + 4, 3, 12, hairMain);
      px(ctx, cx - 10, headY + 5, 1, 9, hairHi);
      px(ctx, cx - 11, headY + 4, 3, 1, '#f472b6');
      if (!isSide) {
        px(ctx, cx + 7, headY + 3, 5, 14, OUTLINE);
        px(ctx, cx + 8, headY + 4, 3, 12, hairMain);
        px(ctx, cx + 9, headY + 5, 1, 9, hairHi);
        px(ctx, cx + 8, headY + 4, 3, 1, '#f472b6');
      }
    } else if (hairStyle === 'bob_cut') {
      px(ctx, cx - 8, headY + 4, 16, 10, OUTLINE);
      px(ctx, cx - 7, headY + 5, 14, 8, hairShade);
    } else if (hairStyle === 'high_ponytail') {
      const tailX = isSide ? cx - 9 : cx - 3;
      px(ctx, tailX - 1, headY - 1, 7, 13, OUTLINE);
      px(ctx, tailX, headY, 5, 11, hairMain);
      px(ctx, tailX + 1, headY + 1, 2, 8, hairHi);
      px(ctx, tailX, headY + 2, 5, 1, '#facc15');
    }
  }

  // ==================== LAYER 2: HUMAN BODY & SKIN TONE + LAYER 3: PANTS & BOOTS ====================
  // Legs & Boots (animated 4-frame walk cycle)
  const leftLegY = legY + (walkStep === 1 ? -1 : 0);
  const rightLegY = legY + (walkStep === -1 ? -1 : 0);
  const leftLegX = isSide ? cx - 3 + walkStep * 2 : cx - 4;
  const rightLegX = isSide ? cx - 1 - walkStep * 2 : cx + 1;

  const isSampot = pantsDef?.styleVariant === 'sampot';
  if (isSampot && !isSide) {
    // Flowing Khmer Sampot Hol wrap
    px(ctx, cx - 5, legY - 1, 10, 6, OUTLINE);
    px(ctx, cx - 4, legY, 8, 4, pantsMain);
    px(ctx, cx - 4, legY + 3, 8, 1, pantsAccent);
    // Feet below Sampot
    px(ctx, leftLegX, leftLegY + 4, 3, 3, OUTLINE);
    px(ctx, leftLegX + 1, leftLegY + 5, 1, 1, '#5c3a21');
    px(ctx, rightLegX, rightLegY + 4, 3, 3, OUTLINE);
    px(ctx, rightLegX + 1, rightLegY + 5, 1, 1, '#5c3a21');
  } else {
    // Left Leg
    px(ctx, leftLegX - 1, leftLegY - 1, 5, 8, OUTLINE);
    px(ctx, leftLegX, leftLegY, 3, 4, pantsMain);
    px(ctx, leftLegX, leftLegY + 3, 3, 1, pantsShade);
    // Left Shoe / Boot
    px(ctx, leftLegX, leftLegY + 4, 3, 2, '#4a2c1d');
    px(ctx, leftLegX, leftLegY + 4, 2, 1, '#78442a');

    // Right Leg
    px(ctx, rightLegX - 1, rightLegY - 1, 5, 8, OUTLINE);
    px(ctx, rightLegX, rightLegY, 3, 4, pantsMain);
    px(ctx, rightLegX, rightLegY + 3, 3, 1, pantsShade);
    // Right Shoe / Boot
    px(ctx, rightLegX, rightLegY + 4, 3, 2, '#4a2c1d');
    px(ctx, rightLegX, rightLegY + 4, 2, 1, '#78442a');
  }

  // Torso Base (Human Body)
  const torsoW = isSide ? 8 : 10;
  const torsoX = cx - Math.floor(torsoW / 2);
  px(ctx, torsoX - 1, torsoY - 1, torsoW + 2, 10, OUTLINE);
  px(ctx, torsoX, torsoY, torsoW, 8, skin.hex);

  // ==================== LAYER 4: SHIRT / ARMOR / FULL SET ====================
  px(ctx, torsoX, torsoY, torsoW, 8, shirtMain);
  px(ctx, torsoX, torsoY + 6, torsoW, 2, shirtShade);
  px(ctx, torsoX + 1, torsoY + 1, torsoW - 2, 2, shirtHi);

  const sVar = shirtDef?.styleVariant ?? 'tunic';
  if (sVar === 'krama_set') {
    // Cream shirt + iconic red/white checkered Khmer Krama scarf!
    px(ctx, torsoX, torsoY, torsoW, 8, '#fef3c7');
    px(ctx, torsoX, torsoY + 6, torsoW, 2, '#e5d4a6');
    for (let kx = 0; kx < torsoW; kx++) {
      px(ctx, torsoX + kx, torsoY, 1, 2, kx % 2 === 0 ? '#dc2626' : '#ffffff');
      px(ctx, torsoX + kx, torsoY + 1, 1, 1, kx % 2 === 1 ? '#dc2626' : '#ffffff');
    }
    if (!isUp) {
      px(ctx, cx + 1, torsoY + 2, 2, 4, '#dc2626');
      px(ctx, cx + 1, torsoY + 3, 1, 1, '#ffffff');
      px(ctx, cx + 2, torsoY + 5, 1, 1, '#ffffff');
    }
  } else if (sVar === 'lbokator_gi' || sVar === 'crimson_lbokator') {
    // Martial-arts crossed sash + golden belt
    px(ctx, torsoX, torsoY + 5, torsoW, 2, shirtAccent);
    px(ctx, torsoX + 2, torsoY, 2, 6, shirtAccent);
  } else if (sVar === 'angkor_explorer') {
    // Tan explorer jacket + leather cross-strap & brass buckle
    px(ctx, torsoX + 3, torsoY, 4, 7, '#fef3c7');
    px(ctx, torsoX + 1, torsoY + 1, 2, 6, shirtMain);
    px(ctx, torsoX + torsoW - 3, torsoY + 1, 2, 6, shirtMain);
    px(ctx, torsoX, torsoY + 5, torsoW, 1, '#451a03');
    px(ctx, cx - 1, torsoY + 5, 2, 1, '#facc15');
  } else if (sVar === 'neon_hoodie') {
    // Streetwear dark hoodie + glowing neon cyan/pink trim + pocket
    px(ctx, torsoX + 2, torsoY + 1, 1, 4, shirtAccent);
    px(ctx, torsoX + torsoW - 3, torsoY + 1, 1, 4, shirtAccent);
    px(ctx, torsoX + 2, torsoY + 5, torsoW - 4, 2, shirtShade);
    px(ctx, torsoX, torsoY + 7, torsoW, 1, shirtAccent);
  } else if (sVar === 'royal_angkor' || sVar === 'achar_robe' || sVar === 'festive_silk') {
    // Golden royal brocade sash & collar trim
    px(ctx, torsoX, torsoY, torsoW, 2, shirtAccent);
    px(ctx, cx - 1, torsoY + 1, 2, 7, shirtAccent);
    px(ctx, torsoX, torsoY + 6, torsoW, 1, shirtAccent);
  } else if (sVar === 'cyber_apsara') {
    // Futuristic neon-cyan circuit plating & gold core
    px(ctx, torsoX + 1, torsoY + 2, torsoW - 2, 1, '#22d3ee');
    px(ctx, cx - 1, torsoY + 1, 2, 5, '#facc15');
    px(ctx, torsoX, torsoY + 6, torsoW, 1, '#22d3ee');
  } else if (sVar === 'celestial_naga') {
    // Emerald & gold sovereign armor sash
    px(ctx, torsoX, torsoY, torsoW, 2, '#facc15');
    px(ctx, torsoX + 2, torsoY + 2, torsoW - 4, 4, '#34d399');
    px(ctx, cx - 1, torsoY + 3, 2, 2, '#facc15');
  } else if (sVar === 'shadow_cloak' || sVar === 'midnight_cloak') {
    // High twilight collar + purple/silver clasp
    px(ctx, torsoX, torsoY, torsoW, 2, shirtShade);
    px(ctx, cx - 1, torsoY + 1, 2, 2, shirtAccent);
  } else if (sVar === 'traveler_vest') {
    // Cream shirt under warm brown traveler vest
    px(ctx, torsoX + 3, torsoY, torsoW - 6, 7, '#fef3c7');
    px(ctx, torsoX, torsoY + 6, torsoW, 1, '#451a03');
  } else if (sVar === 'casual_tee') {
    // Crisp collar & chest stripe
    px(ctx, torsoX + 2, torsoY, torsoW - 4, 1, '#ffffff');
    px(ctx, torsoX, torsoY + 3, torsoW, 1, shirtAccent);
  } else {
    // Classic collar + belt
    px(ctx, torsoX + 2, torsoY, torsoW - 4, 1, shirtAccent);
    px(ctx, torsoX, torsoY + 6, torsoW, 1, '#5c3a21');
  }

  // Animated Arms (Left & Right)
  const armSwingL = walkStep;
  const armSwingR = pose === 'attack' ? -2 : -walkStep;
  if (!isSide) {
    // Left arm
    px(ctx, torsoX - 3, torsoY + armSwingL, 3, 7, OUTLINE);
    px(ctx, torsoX - 2, torsoY + 1 + armSwingL, 2, 3, shirtMain);
    px(ctx, torsoX - 2, torsoY + 4 + armSwingL, 2, 2, skin.hex);
    // Right arm
    px(ctx, torsoX + torsoW, torsoY + armSwingR, 3, 7, OUTLINE);
    px(ctx, torsoX + torsoW, torsoY + 1 + armSwingR, 2, 3, shirtMain);
    px(ctx, torsoX + torsoW, torsoY + 4 + armSwingR, 2, 2, skin.hex);
  } else {
    // Side profile arm swinging across torso
    const sideArmX = cx - 1 + armSwingR;
    px(ctx, sideArmX - 1, torsoY, 4, 7, OUTLINE);
    px(ctx, sideArmX, torsoY + 1, 2, 3, shirtMain);
    px(ctx, sideArmX, torsoY + 4, 2, 2, skin.hex);
  }

  // Neck
  px(ctx, cx - 2, torsoY - 2, 4, 2, skin.shade);

  // ==================== HUMAN CHIBI HEAD (Crisp 14x12 with 1px dark-brown outline) ====================
  const headW = isSide ? 12 : 14;
  const headX = cx - Math.floor(headW / 2);

  // Rounded pixel-art head outline
  px(ctx, headX + 1, headY - 1, headW - 2, 1, OUTLINE);
  px(ctx, headX, headY, headW, 11, OUTLINE);
  px(ctx, headX + 1, headY + 11, headW - 2, 1, OUTLINE);

  // Head skin fill + subtle shading
  px(ctx, headX + 1, headY, headW - 2, 11, skin.hex);
  px(ctx, headX + 2, headY + 1, headW - 4, 2, skin.highlight);
  px(ctx, headX + 1, headY + 9, headW - 2, 2, skin.shade);

  // Cute pixel ears
  if (!isSide) {
    px(ctx, headX - 1, headY + 5, 2, 3, OUTLINE);
    px(ctx, headX, headY + 6, 1, 1, skin.shade);
    px(ctx, headX + headW - 1, headY + 5, 2, 3, OUTLINE);
    px(ctx, headX + headW - 1, headY + 6, 1, 1, skin.shade);
  } else {
    px(ctx, headX + 2, headY + 5, 2, 3, skin.shade);
  }

  // ==================== LAYERS 5, 6, 7: EYES, EYEBROWS & FACE/MOUTH (Front & Side Views) ====================
  if (!isUp) {
    const faceOffsetX = isSide ? 2 : 0;
    const eyeY = headY + 5;
    const leftEyeX = isSide ? cx + 1 : cx - 4;
    const rightEyeX = cx + 2;

    const drawSingleEye = (ex: number, isRightEye = false) => {
      const activeEyeColor =
        eyeStyle === 'mystic_heterochromia' ? (isRightEye ? '#facc15' : '#0ea5e9') : eyeColor;
      if (eyeStyle === 'happy_curve') {
        px(ctx, ex, eyeY + 1, 3, 1, OUTLINE);
        px(ctx, ex + 1, eyeY, 1, 1, OUTLINE);
      } else if (eyeStyle === 'chill_sleepy') {
        px(ctx, ex, eyeY, 3, 1, OUTLINE);
        px(ctx, ex, eyeY + 1, 3, 1, '#ffffff');
        px(ctx, ex + 1, eyeY + 1, 2, 1, activeEyeColor);
      } else if (eyeStyle === 'sharp_fierce') {
        px(ctx, ex, eyeY, 3, 2, '#ffffff');
        px(ctx, ex + 1, eyeY, 2, 2, activeEyeColor);
        px(ctx, ex, eyeY, 3, 1, OUTLINE);
        px(ctx, ex + 1, eyeY + 1, 1, 1, '#ffffff');
      } else if (eyeStyle === 'bright_big') {
        px(ctx, ex, eyeY - 1, 3, 3, '#ffffff');
        px(ctx, ex, eyeY, 3, 2, activeEyeColor);
        px(ctx, ex + 1, eyeY, 1, 1, '#ffffff');
      } else if (eyeStyle === 'almond') {
        px(ctx, ex, eyeY, 3, 2, '#ffffff');
        px(ctx, ex + 1, eyeY, 2, 2, activeEyeColor);
        px(ctx, ex + 1, eyeY, 1, 1, '#ffffff');
      } else if (eyeStyle === 'glowing_gold') {
        px(ctx, ex, eyeY, 3, 2, '#fef08a');
        px(ctx, ex + 1, eyeY, 2, 2, '#f59e0b');
        px(ctx, ex + 1, eyeY, 1, 1, '#ffffff');
      } else if (eyeStyle === 'starry_glow') {
        px(ctx, ex, eyeY - 1, 3, 3, '#312e81');
        px(ctx, ex, eyeY, 3, 2, '#6366f1');
        px(ctx, ex + 1, eyeY, 1, 1, '#fef08a');
        px(ctx, ex, eyeY + 1, 1, 1, '#ffffff');
      } else if (eyeStyle === 'dragon_slit') {
        px(ctx, ex, eyeY, 3, 2, '#facc15');
        px(ctx, ex + 1, eyeY, 1, 2, '#991b1b');
        px(ctx, ex, eyeY, 1, 1, '#fef9c3');
      } else if (eyeStyle === 'kawaii_sparkle') {
        px(ctx, ex, eyeY - 1, 3, 3, activeEyeColor);
        px(ctx, ex, eyeY - 1, 1, 1, '#ffffff');
        px(ctx, ex + 2, eyeY + 1, 1, 1, '#fbcfe8');
      } else if (eyeStyle === 'mystic_heterochromia') {
        px(ctx, ex, eyeY - 1, 3, 3, '#ffffff');
        px(ctx, ex, eyeY, 3, 2, activeEyeColor);
        px(ctx, ex + 1, eyeY, 1, 1, '#ffffff');
      } else {
        // classic_round
        px(ctx, ex, eyeY, 2, 2, activeEyeColor);
        px(ctx, ex, eyeY, 1, 1, '#ffffff');
      }
    };

    if (isSide) {
      drawSingleEye(leftEyeX, false);
    } else {
      drawSingleEye(leftEyeX, false);
      drawSingleEye(rightEyeX, true);
    }

    // Layer 6: Eyebrows
    const browColor = shiftHex(hairMain, -25);
    const drawBrow = (bx: number, isRight: boolean) => {
      if (browStyle === 'thick') {
        px(ctx, bx, eyeY - 2, 3, 2, browColor);
      } else if (browStyle === 'arched') {
        px(ctx, bx, eyeY - 2, 1, 1, browColor);
        px(ctx, bx + 1, eyeY - 3, 1, 1, browColor);
        px(ctx, bx + 2, eyeY - 2, 1, 1, browColor);
      } else if (browStyle === 'determined') {
        px(ctx, bx, isRight ? eyeY - 2 : eyeY - 3, 2, 1, browColor);
        px(ctx, bx + 1, isRight ? eyeY - 3 : eyeY - 2, 2, 1, browColor);
      } else if (browStyle === 'soft') {
        px(ctx, bx, eyeY - 2, 2, 1, shiftHex(hairMain, 10));
      } else {
        px(ctx, bx, eyeY - 2, 3, 1, browColor);
      }
    };
    if (isSide) {
      drawBrow(leftEyeX, false);
    } else {
      drawBrow(leftEyeX, false);
      drawBrow(rightEyeX, true);
    }

    // Layer 7: Face / Mouth & Blush
    const mouthX = cx - 1 + faceOffsetX;
    const mouthY = headY + 9;
    if (faceStyle === 'rosy_blush') {
      if (!isSide) {
        px(ctx, cx - 5, headY + 7, 2, 1, '#fb7185');
        px(ctx, cx + 3, headY + 7, 2, 1, '#fb7185');
      } else {
        px(ctx, cx + 1, headY + 7, 2, 1, '#fb7185');
      }
      px(ctx, mouthX, mouthY, 2, 1, '#9f4a3c');
    } else if (faceStyle === 'cheerful_open') {
      px(ctx, mouthX - 1, mouthY - 1, 4, 2, '#991b1b');
      px(ctx, mouthX, mouthY, 2, 1, '#fca5a5');
    } else if (faceStyle === 'confident_smirk') {
      px(ctx, mouthX, mouthY, 2, 1, OUTLINE);
      px(ctx, mouthX + 2, mouthY - 1, 1, 1, OUTLINE);
    } else if (faceStyle === 'neutral') {
      px(ctx, mouthX, mouthY, 3, 1, '#7c3f34');
    } else if (faceStyle === 'fierce_scar') {
      // Diagonal battle scar across cheek + determined mouth
      px(ctx, mouthX, mouthY, 3, 1, OUTLINE);
      px(ctx, cx + 2, headY + 6, 1, 1, '#be123c');
      px(ctx, cx + 3, headY + 7, 1, 1, '#be123c');
      px(ctx, cx + 4, headY + 8, 1, 1, '#be123c');
    } else if (faceStyle === 'golden_cheek_marks') {
      // Ornate royal Khmer golden cheek filigree marks
      px(ctx, mouthX, mouthY, 2, 1, '#9f4a3c');
      if (!isSide) {
        px(ctx, cx - 5, headY + 7, 2, 1, '#facc15');
        px(ctx, cx - 4, headY + 8, 1, 1, '#fef08a');
        px(ctx, cx + 3, headY + 7, 2, 1, '#facc15');
        px(ctx, cx + 3, headY + 8, 1, 1, '#fef08a');
      } else {
        px(ctx, cx + 1, headY + 7, 2, 1, '#facc15');
      }
    } else if (faceStyle === 'floating_lotus_petals') {
      // Soft smile + floating luminous pink lotus petals flanking head!
      px(ctx, mouthX, mouthY, 2, 1, '#9f4a3c');
      px(ctx, headX - 3, headY + 1, 2, 2, '#f472b6');
      px(ctx, headX - 2, headY + 1, 1, 1, '#fef08a');
      px(ctx, headX + headW + 1, headY + 4, 2, 2, '#f472b6');
      px(ctx, headX + headW + 1, headY + 4, 1, 1, '#ffffff');
    } else if (faceStyle === 'lightning_eyes') {
      // Electric cyan-gold lightning crackles flaring from the eyes!
      px(ctx, mouthX, mouthY, 3, 1, OUTLINE);
      px(ctx, leftEyeX - 2, eyeY, 2, 1, '#38bdf8');
      px(ctx, leftEyeX - 3, eyeY - 1, 2, 1, '#fef08a');
      if (!isSide) {
        px(ctx, rightEyeX + 3, eyeY, 2, 1, '#38bdf8');
        px(ctx, rightEyeX + 4, eyeY - 1, 2, 1, '#fef08a');
      }
    } else if (faceStyle === 'sacred_third_eye') {
      // Glowing emerald-gold Sacred Third-Eye Gem centered on forehead!
      px(ctx, mouthX, mouthY, 2, 1, '#9f4a3c');
      px(ctx, cx - 1 + faceOffsetX, headY + 2, 2, 2, '#facc15');
      px(ctx, cx - 1 + faceOffsetX, headY + 2, 1, 1, '#22d3ee');
    } else {
      // warm_smile
      px(ctx, mouthX - 1, mouthY - 1, 1, 1, '#9f4a3c');
      px(ctx, mouthX, mouthY, 2, 1, '#9f4a3c');
      px(ctx, mouthX + 2, mouthY - 1, 1, 1, '#9f4a3c');
    }
  }

  // ==================== LAYER 8: HAIR STYLE (8 Free + 2 Premium Salon) ====================
  if (isUp) {
    // Back of head covered completely in hair with glossy highlight band
    px(ctx, headX, headY - 2, headW, 12, OUTLINE);
    px(ctx, headX + 1, headY - 1, headW - 2, 10, hairMain);
    px(ctx, headX + 2, headY + 1, headW - 4, 2, hairHi);
    px(ctx, headX + 1, headY + 7, headW - 2, 2, hairShade);
  } else {
    // Top hair crown & side locks
    px(ctx, headX, headY - 2, headW, 5, OUTLINE);
    px(ctx, headX + 1, headY - 1, headW - 2, 4, hairMain);
    px(ctx, headX + 2, headY, headW - 4, 1, hairHi);
    // Sideburns
    px(ctx, headX, headY + 2, 2, 5, OUTLINE);
    px(ctx, headX + 1, headY + 2, 1, 4, hairMain);
    if (!isSide) {
      px(ctx, headX + headW - 2, headY + 2, 2, 5, OUTLINE);
      px(ctx, headX + headW - 2, headY + 2, 1, 4, hairMain);
    }

    // Style-specific bangs & silhouettes
    if (hairStyle === 'side_part') {
      px(ctx, headX + 2, headY + 2, 6, 2, hairMain);
      px(ctx, headX + 8, headY + 1, 2, 2, skin.hex); // Clean side part notch
    } else if (hairStyle === 'messy_fringe') {
      px(ctx, headX + 2, headY + 2, 2, 2, hairMain);
      px(ctx, headX + 5, headY + 2, 3, 3, hairMain);
      px(ctx, headX + 9, headY + 2, 2, 2, hairMain);
      px(ctx, headX + 4, headY - 3, 2, 2, hairMain);
      px(ctx, headX + 8, headY - 3, 2, 2, hairMain);
    } else if (hairStyle === 'bob_cut') {
      px(ctx, headX - 1, headY + 2, 2, 9, OUTLINE);
      px(ctx, headX, headY + 2, 2, 8, hairMain);
      if (!isSide) {
        px(ctx, headX + headW - 1, headY + 2, 2, 9, OUTLINE);
        px(ctx, headX + headW - 2, headY + 2, 2, 8, hairMain);
      }
      px(ctx, headX + 2, headY + 2, headW - 4, 2, hairMain);
    } else if (hairStyle === 'long_straight' || hairStyle === 'braided_royal') {
      px(ctx, headX + 2, headY + 2, 3, 2, hairMain);
      px(ctx, headX + headW - 5, headY + 2, 3, 2, hairMain);
      if (hairStyle === 'braided_royal') {
        // Golden royal hair ornament band
        px(ctx, headX + 2, headY - 1, headW - 4, 1, '#facc15');
      }
    } else if (hairStyle === 'twin_buns') {
      // Cute double hair buns on top corners
      px(ctx, headX - 2, headY - 4, 5, 5, OUTLINE);
      px(ctx, headX - 1, headY - 3, 3, 3, hairMain);
      px(ctx, headX, headY - 3, 1, 1, hairHi);
      if (!isSide) {
        px(ctx, headX + headW - 3, headY - 4, 5, 5, OUTLINE);
        px(ctx, headX + headW - 2, headY - 3, 3, 3, hairMain);
        px(ctx, headX + headW - 1, headY - 3, 1, 1, hairHi);
      }
    } else if (hairStyle === 'classic_topknot') {
      // Traditional Khmer topknot bun centered on crown
      px(ctx, cx - 3, headY - 6, 6, 5, OUTLINE);
      px(ctx, cx - 2, headY - 5, 4, 3, hairMain);
      px(ctx, cx - 2, headY - 2, 4, 1, '#facc15');
    } else if (hairStyle === 'silver_spiky' || hairStyle === 'spiky_anime_hero') {
      // Dramatic anime spikes
      px(ctx, headX - 1, headY - 4, 4, 4, OUTLINE);
      px(ctx, cx - 2, headY - 6, 5, 5, OUTLINE);
      px(ctx, headX + headW - 3, headY - 4, 4, 4, OUTLINE);
      px(ctx, headX, headY - 3, 3, 3, hairMain);
      px(ctx, cx - 1, headY - 5, 3, 4, hairHi);
      px(ctx, headX + headW - 3, headY - 3, 3, 3, hairMain);
      px(ctx, headX + 3, headY + 2, 3, 3, hairMain);
      px(ctx, headX + 8, headY + 2, 2, 2, hairMain);
      if (hairStyle === 'spiky_anime_hero') {
        px(ctx, cx - 3, headY - 4, 2, 2, hairHi);
        px(ctx, cx + 2, headY - 5, 2, 3, hairMain);
      }
    } else if (hairStyle === 'wolf_cut') {
      // Layered wispy wolf-cut bangs + textured crown tufts
      px(ctx, headX + 1, headY + 2, 3, 3, hairMain);
      px(ctx, headX + 5, headY + 2, 2, 2, hairMain);
      px(ctx, headX + 9, headY + 2, 3, 3, hairMain);
      px(ctx, headX + 2, headY - 3, 3, 2, hairMain);
      px(ctx, headX + 8, headY - 3, 3, 2, hairHi);
    } else if (hairStyle === 'royal_braided_crown') {
      // Woven golden Khmer braided halo crown
      px(ctx, headX + 1, headY - 3, headW - 2, 3, OUTLINE);
      px(ctx, headX + 2, headY - 2, headW - 4, 2, hairMain);
      px(ctx, headX + 2, headY - 2, headW - 4, 1, '#facc15');
      px(ctx, cx - 1, headY - 3, 2, 2, '#fef08a');
      px(ctx, headX + 2, headY + 2, 3, 2, hairMain);
      px(ctx, headX + headW - 5, headY + 2, 3, 2, hairMain);
    } else if (hairStyle === 'flowing_apsara_waves') {
      // Graceful curved Apsara temple-dancer waves + lotus clasp
      px(ctx, headX + 1, headY + 2, 4, 2, hairMain);
      px(ctx, headX + headW - 5, headY + 2, 4, 2, hairMain);
      px(ctx, cx - 2, headY - 3, 4, 2, '#facc15');
      px(ctx, cx - 1, headY - 3, 2, 1, '#f472b6');
    } else if (hairStyle === 'cyber_undercut') {
      // Sharp swept undercut with neon-cyan fade stripe!
      px(ctx, headX, headY + 2, 2, 4, hairShade);
      px(ctx, headX + 2, headY - 3, headW - 4, 3, hairMain);
      px(ctx, headX + 3, headY - 2, headW - 6, 1, '#22d3ee');
      px(ctx, headX + 4, headY + 2, 6, 2, hairMain);
    } else if (hairStyle === 'twin_tails') {
      // Cute center-split bangs matching twin tails
      px(ctx, headX + 2, headY + 2, 4, 2, hairMain);
      px(ctx, headX + headW - 6, headY + 2, 4, 2, hairMain);
    } else {
      // short_neat / high_ponytail front bangs
      px(ctx, headX + 2, headY + 2, headW - 4, 1, hairMain);
    }
  }

  // ==================== LAYER 9: HAT / HEADGEAR (Optional) ====================
  if (hatDef) {
    const hMain = hatDef.primaryColor;
    const hAcc = hatDef.accentColor;
    const hVar = hatDef.styleVariant;

    if (hVar === 'doun' || hVar === 'sun_straw') {
      // Conical Khmer Farmer Hat / Wide Straw Hat
      px(ctx, cx - 9, headY - 2, 18, 3, OUTLINE);
      px(ctx, cx - 8, headY - 1, 16, 1, hMain);
      px(ctx, cx - 6, headY - 4, 12, 3, OUTLINE);
      px(ctx, cx - 5, headY - 3, 10, 2, hMain);
      px(ctx, cx - 3, headY - 6, 6, 3, OUTLINE);
      px(ctx, cx - 2, headY - 5, 4, 2, hMain);
      px(ctx, cx - 5, headY - 2, 10, 1, hAcc);
    } else if (hVar === 'krama_bandana' || hVar === 'crimson_headband') {
      // Martial arts headband tied across forehead
      px(ctx, headX, headY + 1, headW, 3, OUTLINE);
      for (let bx = 0; bx < headW - 2; bx++) {
        px(ctx, headX + 1 + bx, headY + 2, 1, 1, bx % 2 === 0 ? hMain : hAcc);
      }
      // Trailing knot tails on side
      px(ctx, headX + headW, headY + 2, 2, 3, hMain);
    } else if (hVar === 'angkor_explorer') {
      // Wide-brim explorer adventure hat
      px(ctx, cx - 9, headY - 1, 18, 2, OUTLINE);
      px(ctx, cx - 8, headY - 1, 16, 1, hMain);
      px(ctx, cx - 5, headY - 5, 10, 4, OUTLINE);
      px(ctx, cx - 4, headY - 4, 8, 3, hMain);
      px(ctx, cx - 4, headY - 2, 8, 1, hAcc);
    } else if (hVar === 'midnight_hood') {
      // Sleek shadow hood framing head
      px(ctx, headX - 1, headY - 3, headW + 2, 6, OUTLINE);
      px(ctx, headX, headY - 2, headW, 4, hMain);
      px(ctx, headX + 1, headY - 1, headW - 2, 1, hAcc);
    } else if (hVar === 'yaksha_mask') {
      // Ornate carved Yaksha ceremonial crown-mask
      px(ctx, cx - 6, headY - 5, 12, 6, OUTLINE);
      px(ctx, cx - 5, headY - 4, 10, 4, hMain);
      px(ctx, cx - 2, headY - 7, 4, 3, hAcc);
      px(ctx, cx - 4, headY - 2, 2, 1, hAcc);
      px(ctx, cx + 2, headY - 2, 2, 1, hAcc);
    } else {
      // Royal Crown / Angkor Mokot Spire / Apsara Tiara / Cyber Visor / Naga Crest / Frog Crown
      px(ctx, cx - 6, headY - 3, 12, 4, OUTLINE);
      px(ctx, cx - 5, headY - 2, 10, 2, hMain);
      px(ctx, cx - 3, headY - 6, 6, 4, OUTLINE);
      px(ctx, cx - 2, headY - 5, 4, 3, hMain);
      px(ctx, cx - 1, headY - 8, 2, 3, hMain);
      px(ctx, cx - 1, headY - 2, 2, 1, hAcc);
      px(ctx, cx - 4, headY - 2, 1, 1, hAcc);
      px(ctx, cx + 3, headY - 2, 1, 1, hAcc);
    }
  }

  // When walking upward (back facing camera), draw procedural wings IN FRONT OF the back!
  if (isUp) {
    drawProceduralWings();
  }

  ctx.restore();
}

/**
 * Draws the 10-layer pixel-art Human Chibi Paper-Doll + held Khmer weapon onto any React UI canvas
 * (Character Creator, Wardrobe Mirror, Fashion Boutique Try-On, Profile Card, Inventory).
 */
export function drawFullPaperDollToCanvas(
  ctx: CanvasRenderingContext2D,
  loadout: EquippedLoadout,
  pose: PaperDollPose = 'idle',
  facing: PaperDollFacing = 'down',
  timeMs = 0
): void {
  const scratch = document.createElement('canvas');
  scratch.width = CANVAS_W;
  scratch.height = CANVAS_H;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;

  renderHumanChibiPixels(sctx, loadout, pose, facing);

  const bob = pose === 'idle' && Math.sin(timeMs / 340) > 0.25 ? -1 : 0;
  const weaponInfo = resolveWeaponSprite(loadout.weapon);
  const weaponImg = weaponInfo ? getCachedHtmlImg(WEAPON_URLS[weaponInfo.key]) : null;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Draw High-Detail 4-Frame Animated PNG Wings directly behind Human Chibi in React UI Previews!
  const pngWingMeta = loadout.wings ? ANIMATED_PNG_WINGS[loadout.wings] : undefined;
  if (pngWingMeta) {
    const wingImg = getCachedHtmlImg(pngWingMeta.url);
    if (wingImg) {
      const frameIdx = Math.floor(timeMs / 150) % 4;
      ctx.drawImage(wingImg, frameIdx * 48, 0, 48, 48, 2, 4 + bob, 60, 60);
    }
  }

  // Draw crisp 36x40 pixel-art human chibi scaled cleanly into the 64x64 preview coordinate frame
  ctx.drawImage(scratch, 0, 0, CANVAS_W, CANVAS_H, 8, 5 + bob, 48, 53);

  // Layer 10: Held Khmer Class Weapon (crisp proportional RPG hand posture)
  if (weaponImg && facing !== 'up') {
    const dir = facing === 'left' ? -1 : 1;
    const isBook = weaponInfo?.key === 'wp_book';
    const isBow = weaponInfo?.key === 'wp_bow' || weaponInfo?.key === 'wp_bow2';
    const scale = isBook || isBow ? 1.35 : 1.48;
    ctx.save();
    ctx.translate(facing === 'left' ? 14 : 50, 42 + bob);
    ctx.scale(dir, 1);
    ctx.rotate(isBook || isBow ? 0 : 0.22);
    ctx.drawImage(
      weaponImg,
      -weaponImg.width * scale * 0.5,
      -weaponImg.height * scale * 0.78,
      weaponImg.width * scale,
      weaponImg.height * scale
    );
    ctx.restore();
  }
  ctx.restore();
}

/**
 * High-detail 10-layer Pixel-Art Human Chibi Paper-Doll Container for Phaser scenes
 * (OverworldScene, FarmScene, ClubScene, DungeonBossScene, and Multiplayer Remote Players).
 * Caches generated pixel-snapped CanvasTextures per (appearance, pose, facing) for 60 FPS performance.
 */
export class PaperDoll extends Phaser.GameObjects.Container {
  private wingSprite: Phaser.GameObjects.Sprite;
  private bodySprite: Phaser.GameObjects.Image;
  private weaponSprite: Phaser.GameObjects.Image;
  private weaponAuraGlow: Phaser.GameObjects.Image;
  private weaponAuraSparks: Phaser.GameObjects.Arc[] = [];
  private auraGlow: Phaser.GameObjects.Image;
  private parryArc: Phaser.GameObjects.Arc;
  private championSashGfx: Phaser.GameObjects.Graphics;
  private emoteVfxGfx: Phaser.GameObjects.Graphics;
  private emoteBadge: Phaser.GameObjects.Text;

  private loadout: EquippedLoadout;
  private currentPose: PaperDollPose = 'idle';
  private currentFacing: PaperDollFacing = 'down';
  private lastTexKey = '';
  private isStealth = false;
  private aimAngle: number | null = null;
  private activeEmote: KhmerEmoteId | null = null;
  private activeEmoteStartedAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    loadout: EquippedLoadout,
    _keyPrefix = 'paperdoll'
  ) {
    super(scene, x, y);
    this.loadout = { ...loadout };

    this.auraGlow = scene.add
      .image(0, -20, 'torch_glow')
      .setScale(0.38)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    const initKey = this.ensureFrameTexture('idle', 'down');
    this.lastTexKey = initKey;

    this.wingSprite = scene.add
      .sprite(0, -22, 'wings_bamboo_leaf_glider', 0)
      .setOrigin(0.5, 0.5)
      .setScale(1.18)
      .setVisible(false);

    this.bodySprite = scene.add
      .image(0, 0, initKey)
      .setOrigin(0.5, 0.9)
      .setScale(1.38);

    this.weaponSprite = scene.add
      .image(13, -11, 'wp_axe')
      .setOrigin(0.5, 0.78)
      .setScale(1.32)
      .setVisible(false);

    this.weaponAuraGlow = scene.add
      .image(15, -18, 'torch_glow')
      .setScale(0.24)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.weaponAuraSparks = [0, 1, 2].map(() =>
      scene.add.circle(15, -18, 2.2, 0xfacc15, 0.92).setVisible(false)
    );

    this.parryArc = scene.add
      .arc(12, -16, 22, -70, 70, false, 0xfacc15, 0.35)
      .setStrokeStyle(3, 0xfef9c3, 1)
      .setVisible(false);

    this.championSashGfx = scene.add.graphics().setVisible(false);
    this.emoteVfxGfx = scene.add.graphics().setVisible(false);
    this.emoteBadge = scene.add
      .text(0, -44, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.add([
      this.auraGlow,
      this.wingSprite,
      this.bodySprite,
      this.championSashGfx,
      this.weaponAuraGlow,
      this.weaponSprite,
      ...this.weaponAuraSparks,
      this.parryArc,
      this.emoteVfxGfx,
      this.emoteBadge,
    ]);
    this.applyWeaponAndAura();
    scene.add.existing(this);
  }

  private ensureFrameTexture(pose: PaperDollPose, facing: PaperDollFacing): string {
    const normalizedPose: PaperDollPose =
      pose === 'walk1' || pose === 'walk3' || pose === 'jump' || pose === 'attack' ? pose : 'idle';
    const sig = buildLoadoutSignature(this.loadout);
    // Short deterministic hash so texture keys stay compact and cached globally across frames
    let h = 2166136261;
    for (let i = 0; i < sig.length; i++) {
      h ^= sig.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const texKey = `human_chibi_${(h >>> 0).toString(36)}_${normalizedPose}_${facing}`;

    if (!this.scene.textures.exists(texKey)) {
      const canvasTex = this.scene.textures.createCanvas(texKey, CANVAS_W, CANVAS_H);
      if (canvasTex) {
        const ctx = canvasTex.getContext();
        renderHumanChibiPixels(ctx, this.loadout, normalizedPose, facing);
        canvasTex.refresh();
        canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    return texKey;
  }

  private applyWeaponAndAura(): void {
    const wInfo = resolveWeaponSprite(this.loadout.weapon);
    if (wInfo && this.scene.textures.exists(wInfo.key)) {
      const wScale =
        wInfo.key === 'wp_book'
          ? 1.18
          : wInfo.key === 'wp_bow' || wInfo.key === 'wp_bow2'
            ? 1.16
            : wInfo.key === 'wp_sai'
              ? 1.24
              : 1.34;
      this.weaponSprite.setTexture(wInfo.key).setScale(wScale).setVisible(true);
      if (wInfo.tint) this.weaponSprite.setTint(wInfo.tint);
      else this.weaponSprite.clearTint();
    } else {
      this.weaponSprite.setVisible(false);
    }

    // Update 1.4 — Pagoda Tower Milestone Weapon Aura Glow & Orbiting Particles
    const wAura = this.loadout.weaponAura;
    if (wAura && this.weaponSprite.visible) {
      const auraColor =
        wAura === 'krong_reap_ten_head'
          ? 0xe11d48
          : wAura === 'celestial_angkor'
            ? 0xc084fc
            : wAura === 'emerald_naga'
              ? 0x10b981
              : 0xfacc15;
      const sparkAlt =
        wAura === 'krong_reap_ten_head'
          ? 0xfacc15
          : wAura === 'celestial_angkor'
            ? 0xfef08a
            : wAura === 'emerald_naga'
              ? 0x6ee7b7
              : 0xf472b6;
      this.weaponAuraGlow.setTint(auraColor).setAlpha(0.62).setVisible(true);
      this.weaponAuraGlow.postFX?.clear?.();
      vfxManager.applyGlow(this.scene, this.weaponAuraGlow, auraColor, 3.0, 0.4);
      this.weaponAuraSparks.forEach((sp, idx) => {
        sp.setFillStyle(idx % 2 === 0 ? auraColor : sparkAlt, 0.95).setVisible(true);
      });
    } else {
      this.weaponAuraGlow.setVisible(false);
      this.weaponAuraSparks.forEach((sp) => sp.setVisible(false));
    }

    const wingId = this.loadout.wings;
    const pngWing = wingId ? ANIMATED_PNG_WINGS[wingId] : undefined;
    if (pngWing && wingId && this.scene.textures.exists(wingId)) {
      this.wingSprite.setTexture(wingId, 0).setVisible(true);
      this.wingSprite.postFX?.clear?.();
      vfxManager.applyGlow(this.scene, this.wingSprite, pngWing.glowColor, pngWing.bloomStrength * 2.1, 0.35);
      if (this.scene.anims.exists(pngWing.animKey)) {
        this.wingSprite.play(pngWing.animKey, true);
      }
    } else {
      this.wingSprite.stop();
      this.wingSprite.setVisible(false);
    }

    const wingDef = wingId ? ITEM_CATALOG[wingId] : undefined;
    const accList = this.loadout.accessories ?? [];
    const hasApexAcc =
      accList.includes('acc_angkor_phantom_stride') ||
      accList.includes('acc_wind_walker_boots') ||
      accList.includes('acc_sovereign_aegis_charm');

    if (wingDef && wingDef.styleVariant !== 'basket') {
      const tintNum = Number(wingDef.primaryColor.replace('#', '0x'));
      this.auraGlow.setTint(Number.isFinite(tintNum) ? tintNum : 0xfacc15).setAlpha(0.5).setVisible(true);
    } else if (hasApexAcc) {
      const accTint = accList.includes('acc_angkor_phantom_stride')
        ? 0xa855f7
        : accList.includes('acc_wind_walker_boots')
          ? 0xf472b6
          : 0x22c55e;
      this.auraGlow.setTint(accTint).setAlpha(0.42).setVisible(true);
    } else {
      this.auraGlow.setVisible(false);
    }

    // Refresh current body frame immediately
    const nextKey = this.ensureFrameTexture(this.currentPose, this.currentFacing);
    if (nextKey !== this.lastTexKey) {
      this.lastTexKey = nextKey;
      this.bodySprite.setTexture(nextKey);
    }
  }

  public setLoadout(next: EquippedLoadout): void {
    this.loadout = { ...next };
    this.applyWeaponAndAura();
  }

  public setAimAngle(angle: number | null): void {
    this.aimAngle = angle;
  }

  public setActiveEmote(emoteId: KhmerEmoteId | null, startedAt = Date.now()): void {
    this.activeEmote = emoteId;
    this.activeEmoteStartedAt = startedAt;
    if (!emoteId) {
      this.emoteVfxGfx.clear().setVisible(false);
      this.emoteBadge.setVisible(false);
      this.bodySprite.setRotation(0);
    }
  }

  public getActiveEmote(): KhmerEmoteId | null {
    return this.activeEmote;
  }

  public setPoseAndFacing(pose: PaperDollPose, facing: PaperDollFacing, time: number): void {
    this.currentPose = pose;
    this.currentFacing = facing;

    const nextKey = this.ensureFrameTexture(pose, facing);
    if (nextKey !== this.lastTexKey) {
      this.lastTexKey = nextKey;
      this.bodySprite.setTexture(nextKey);
    }

    const isWalking = pose === 'walk1' || pose === 'walk2' || pose === 'walk3' || pose === 'walk4';
    // Update 3.0 — Subtle 2-frame idle breathing + smooth walk-cycle bobbing
    const breathPhase = !isWalking && pose === 'idle' ? (Math.floor(time / 480) % 2 === 0 ? 0 : 1) : 0;
    const idleBob = !isWalking && pose === 'idle' ? (breathPhase === 1 ? -1.1 : 0) : 0;
    const walkBob = isWalking ? -Math.abs(Math.sin(time / 115)) * 1.9 : 0;
    let vertBob = idleBob + walkBob;
    let emoteRot = 0;
    let emoteScaleX = 1.38;
    let emoteScaleY = !isWalking && pose === 'idle' ? (breathPhase === 1 ? 1.418 : 1.38) : 1.38;

    // Update 3.1 — Live Khmer Emote & Dance Wheel animations + VFX overlays
    if (this.activeEmote && !isWalking) {
      const elapsed = Math.max(0, time - this.activeEmoteStartedAt);
      this.emoteVfxGfx.clear().setVisible(true);
      if (this.activeEmote === 'sampeah') {
        const bow = Math.sin(Math.min(1, elapsed / 650) * Math.PI);
        emoteRot = (facing === 'left' ? -1 : 1) * 0.16 * bow;
        vertBob += bow * 2.2;
        this.emoteVfxGfx.lineStyle(1.8, 0xfacc15, 0.85);
        this.emoteVfxGfx.strokeCircle(0, -18, 12 + Math.sin(time / 150) * 3);
        for (let i = 0; i < 4; i++) {
          const a = time / 280 + (i * Math.PI) / 2;
          this.emoteVfxGfx.fillStyle(0xfef08a, 0.95);
          this.emoteVfxGfx.fillCircle(Math.cos(a) * 14, -20 + Math.sin(a) * 9, 2.1);
        }
        this.emoteBadge.setText('🙏 សំពះ').setPosition(0, -40).setVisible(true);
      } else if (this.activeEmote === 'romvong') {
        const sway = Math.sin(time / 220);
        emoteRot = sway * 0.15;
        vertBob += -Math.abs(Math.cos(time / 220)) * 3.2;
        for (let i = 0; i < 4; i++) {
          const a = time / 320 + (i * Math.PI) / 2;
          const col = i % 2 === 0 ? 0xf472b6 : 0xfacc15;
          this.emoteVfxGfx.fillStyle(col, 0.92);
          this.emoteVfxGfx.fillCircle(Math.cos(a) * 17, -18 + Math.sin(a * 1.5) * 10, 2.4);
        }
        this.emoteBadge.setText('💃 រាំវង់ ♪').setPosition(Math.sin(time / 220) * 4, -42).setVisible(true);
      } else if (this.activeEmote === 'apsara_pose') {
        vertBob += -2.8 + Math.sin(time / 260) * 1.4;
        emoteRot = Math.sin(time / 380) * 0.08;
        this.emoteVfxGfx.lineStyle(2, 0xfb7185, 0.85);
        this.emoteVfxGfx.strokeCircle(0, -20, 16 + Math.sin(time / 200) * 2.5);
        for (let i = 0; i < 6; i++) {
          const a = time / 450 + (i * Math.PI) / 3;
          this.emoteVfxGfx.fillStyle(i % 2 === 0 ? 0xfbcfe8 : 0xfde047, 0.92);
          this.emoteVfxGfx.fillEllipse(Math.cos(a) * 18, -20 + Math.sin(a) * 12, 5, 2.5);
        }
        this.emoteBadge.setText('🪷 អប្សរា').setPosition(0, -44).setVisible(true);
      } else if (this.activeEmote === 'sip_kafe') {
        const sip = Math.max(0, Math.sin(time / 550));
        emoteRot = sip * 0.07;
        const cupX = facing === 'left' ? -11 : 11;
        const cupY = -15 - sip * 3.5;
        // Iced Khmer Kafé Tek Dos Ko cup + condensed milk layer + green straw
        this.emoteVfxGfx.fillStyle(0x451a03, 0.98);
        this.emoteVfxGfx.fillRoundedRect(cupX - 3.5, cupY - 5, 7, 10, 1.5);
        this.emoteVfxGfx.fillStyle(0xfef3c7, 0.96);
        this.emoteVfxGfx.fillRect(cupX - 3, cupY + 1, 6, 3.5);
        this.emoteVfxGfx.lineStyle(1.4, 0x22c55e, 1);
        this.emoteVfxGfx.lineBetween(cupX + 1, cupY - 5, cupX + 3, cupY - 10);
        this.emoteBadge.setText('🧋 កាហ្វេ').setPosition(0, -40).setVisible(true);
      } else if (this.activeEmote === 'sit_relax') {
        vertBob += 6.2;
        emoteScaleX = 1.44;
        emoteScaleY = 1.18;
        this.emoteVfxGfx.fillStyle(0x34d399, 0.28);
        this.emoteVfxGfx.fillEllipse(0, 2, 24, 9);
        this.emoteBadge.setText('🧘 Relaxing').setPosition(0, -34).setVisible(true);
      } else if (this.activeEmote === 'victory_cheer') {
        const jump = Math.abs(Math.sin(time / 160));
        vertBob += -jump * 9.5;
        emoteScaleY = 1.38 + jump * 0.12;
        const colors = [0xfacc15, 0x38bdf8, 0xf43f5e, 0x4ade80, 0xc084fc];
        for (let i = 0; i < 6; i++) {
          const p = ((time / 320 + i * 0.37) % 1);
          const cx = Math.cos(i * 1.15) * (8 + p * 18);
          const cy = -18 - p * 22;
          this.emoteVfxGfx.fillStyle(colors[i % colors.length], 1 - p * 0.7);
          this.emoteVfxGfx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
        }
        this.emoteBadge.setText('🎉 CHAIYO!').setPosition(0, -46 - jump * 4).setVisible(true);
      } else if (this.activeEmote === 'naga_spirit_roar') {
        const pulse = Math.sin(time / 130);
        vertBob += -2 + pulse * 1.8;
        this.emoteVfxGfx.lineStyle(2.4, 0x10b981, 0.9);
        this.emoteVfxGfx.strokeCircle(0, -18, 16 + ((time / 18) % 14));
        this.emoteVfxGfx.lineStyle(2, 0xfacc15, 0.85);
        this.emoteVfxGfx.strokeCircle(0, -18, 11 + Math.abs(pulse) * 6);
        for (let i = 0; i < 5; i++) {
          const a = time / 180 + (i * Math.PI * 2) / 5;
          this.emoteVfxGfx.fillStyle(i % 2 === 0 ? 0x34d399 : 0xfde047, 0.95);
          this.emoteVfxGfx.fillCircle(Math.cos(a) * 19, -18 + Math.sin(a) * 13, 2.8);
        }
        this.emoteBadge.setText('🐉 NAGA ROAR!').setPosition(0, -46).setVisible(true);
      } else if (this.activeEmote === 'golden_rain_dance') {
        const sway = Math.sin(time / 240);
        emoteRot = sway * 0.14;
        vertBob += -2.5 + Math.cos(time / 240) * 2.2;
        this.emoteVfxGfx.fillStyle(0xfacc15, 0.2);
        this.emoteVfxGfx.fillCircle(0, -18, 22);
        for (let i = 0; i < 8; i++) {
          const drop = ((time / 480 + i * 0.21) % 1);
          const dx = -18 + (i * 5.2);
          const dy = -38 + drop * 42;
          this.emoteVfxGfx.fillStyle(i % 2 === 0 ? 0xfef08a : 0xf59e0b, 1 - drop * 0.5);
          this.emoteVfxGfx.fillRect(dx, dy, 2.2, 5.5);
        }
        this.emoteBadge.setText('✨ របាំភ្លៀងមាស').setPosition(sway * 3, -46).setVisible(true);
      }
    } else if (this.emoteVfxGfx.visible) {
      this.emoteVfxGfx.clear().setVisible(false);
      this.emoteBadge.setVisible(false);
    }

    this.bodySprite.setY(vertBob);
    this.bodySprite.setRotation(emoteRot);
    this.bodySprite.setScale(emoteScaleX, emoteScaleY);

    // Update 3.1/3.2 — Glowing Kun Khmer Champion Sash, Sbek Thom Shadow Puppet Aura & Golden Abacus!
    const accListNow = this.loadout.accessories ?? [];
    const hasChampionSash = accListNow.includes('acc_kun_khmer_champion_sash');
    const hasGoldenAbacus = accListNow.includes('acc_golden_abacus');
    const hasSbekThomAura = this.loadout.wings === 'wings_sbek_thom_aura';
    if (hasChampionSash || hasGoldenAbacus || hasSbekThomAura) {
      const shimmer = 0.72 + Math.sin(time / 180) * 0.25;
      this.championSashGfx.clear().setVisible(true);
      if (hasSbekThomAura) {
        // Animated backlit Sbek Thom shadow-puppet firelight ring + drifting embers!
        this.championSashGfx.lineStyle(2.2, 0xf97316, 0.55 + Math.sin(time / 160) * 0.25);
        this.championSashGfx.strokeCircle(0, -18 + vertBob, 18 + Math.sin(time / 240) * 1.5);
        for (let i = 0; i < 4; i++) {
          const ang = time * 0.0028 + (Math.PI * 2 * i) / 4;
          const ex = Math.cos(ang) * 18;
          const ey = -18 + vertBob + Math.sin(ang) * 14;
          this.championSashGfx.fillStyle(i % 2 === 0 ? 0xfef08a : 0x1c0a03, 0.85);
          this.championSashGfx.fillCircle(ex, ey, i % 2 === 0 ? 2.2 : 2.8);
        }
      }
      if (hasChampionSash) {
        this.championSashGfx.fillStyle(0xdc2626, 0.95);
        this.championSashGfx.fillRoundedRect(-8, -12 + vertBob, 16, 4.5, 1.5);
        this.championSashGfx.fillStyle(0xfacc15, shimmer);
        this.championSashGfx.fillRect(-3.5, -12.5 + vertBob, 7, 5.5);
        this.championSashGfx.lineStyle(1.2, 0xfef08a, shimmer);
        this.championSashGfx.strokeRoundedRect(-8.5, -12.5 + vertBob, 17, 5.5, 2);
      }
      if (hasGoldenAbacus) {
        // Golden merchant abacus charm bobbing at waist
        this.championSashGfx.fillStyle(0xb45309, 0.95);
        this.championSashGfx.fillRoundedRect(-11, -13 + vertBob, 6, 5, 1);
        this.championSashGfx.lineStyle(1, 0xfacc15, shimmer);
        this.championSashGfx.strokeRoundedRect(-11, -13 + vertBob, 6, 5, 1);
        this.championSashGfx.fillStyle(0xfef08a, 1);
        this.championSashGfx.fillRect(-9.5, -11.5 + vertBob, 1.5, 2);
        this.championSashGfx.fillRect(-7, -11.5 + vertBob, 1.5, 2);
      }
    } else if (this.championSashGfx.visible) {
      this.championSashGfx.clear().setVisible(false);
    }

    if (this.wingSprite.visible) {
      const wingHover = Math.sin(time / 220) * 1.4;
      const wingOffsetX = facing === 'left' ? 4 : facing === 'right' ? -4 : 0;
      this.wingSprite.setPosition(wingOffsetX, -22 + vertBob + wingHover);
      this.wingSprite.setFlipX(facing === 'left');
      // Fix: When walking upward (back faces camera), render animated PNG wings IN FRONT OF bodySprite!
      if (facing === 'up') {
        this.moveAbove(this.wingSprite, this.bodySprite);
      } else {
        this.moveBelow(this.wingSprite, this.bodySprite);
      }
    }

    // Layer 10: Held Khmer Weapon positioned cleanly at character's hand with natural RPG posture
    const dir = facing === 'left' ? -1 : 1;
    const isUp = facing === 'up';
    const curWeaponKey = this.weaponSprite.texture?.key ?? '';
    const isBook = curWeaponKey === 'wp_book';
    const isBow = curWeaponKey === 'wp_bow' || curWeaponKey === 'wp_bow2';

    if (this.aimAngle !== null) {
      const aimDir = Math.cos(this.aimAngle) < 0 ? -1 : 1;
      const handX = Math.cos(this.aimAngle) * 14;
      const handY = -14 + idleBob + Math.sin(this.aimAngle) * 11;
      this.weaponSprite.setPosition(handX, handY);
      this.weaponSprite.setFlipX(aimDir < 0);
      this.moveAbove(this.weaponSprite, this.bodySprite);
      const swingOffset = pose === 'attack' ? aimDir * 0.95 : 0;
      this.weaponSprite.setRotation(this.aimAngle + Math.PI / 2 + swingOffset);
    } else {
      // Natural side-hand placement that NEVER blocks the character's chest or face!
      const handX = facing === 'down' ? 13 : facing === 'up' ? -12 : dir * 13;
      const bookFloat = isBook ? Math.sin(time / 240) * 1.6 - 2 : 0;
      const handY = (pose === 'attack' ? -15 : -11) + vertBob + bookFloat;

      this.weaponSprite.setPosition(handX, handY);
      this.weaponSprite.setFlipX(dir < 0);
      if (isUp) {
        this.moveBelow(this.weaponSprite, this.bodySprite);
      } else {
        this.moveAbove(this.weaponSprite, this.bodySprite);
      }

      if (pose === 'attack') {
        this.weaponSprite.setRotation(dir * 1.12);
      } else if (pose === 'parry') {
        this.weaponSprite.setRotation(dir * -0.18);
      } else if (isBook || isBow) {
        // Keep tomes & longbows upright in hand instead of tilted sideways across torso
        this.weaponSprite.setRotation(isWalking ? Math.sin(time / 140) * 0.06 : 0);
      } else {
        // Angle blades/axes/staves cleanly outward from the hand
        this.weaponSprite.setRotation(dir * 0.24 + (isWalking ? Math.sin(time / 120) * 0.12 : 0));
      }
    }

    if (this.weaponAuraGlow.visible) {
      const wx = this.weaponSprite.x;
      const wy = this.weaponSprite.y;
      this.weaponAuraGlow.setPosition(wx, wy - 6);
      this.weaponAuraGlow.setScale(0.22 + Math.sin(time / 180) * 0.04);
      this.weaponAuraSparks.forEach((sp, idx) => {
        const ang = time / 240 + (idx * Math.PI * 2) / 3;
        sp.setPosition(wx + Math.cos(ang) * 10, wy - 6 + Math.sin(ang) * 8);
      });
    }

    this.parryArc.setVisible(pose === 'parry');
    if (pose === 'parry') {
      this.parryArc.setPosition(dir * 14, -18).setScale(dir, 1);
    }
  }

  public setStealthTint(stealthFull: boolean): void {
    this.isStealth = stealthFull;
    if (stealthFull) {
      this.bodySprite.setTint(0xc084fc);
      this.weaponSprite.setTint(0xc084fc);
      this.setAlpha(0.48);
    } else {
      this.bodySprite.clearTint();
      const wInfo = resolveWeaponSprite(this.loadout.weapon);
      if (wInfo?.tint) this.weaponSprite.setTint(wInfo.tint);
      else this.weaponSprite.clearTint();
      this.setAlpha(1);
    }
  }

  public flashWhite(durationMs = 110): void {
    this.bodySprite.setTintFill(0xffffff);
    this.weaponSprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(durationMs, () => {
      if (!this.scene) return;
      this.setStealthTint(this.isStealth);
    });
  }
}
