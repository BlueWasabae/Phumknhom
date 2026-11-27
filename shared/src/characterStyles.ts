export type SkinToneId =
  | 'fair'
  | 'light_warm'
  | 'medium_tan'
  | 'golden_khmer'
  | 'deep_bronze'
  | 'rich_brown';

export type HairStyleId =
  | 'short_neat'
  | 'side_part'
  | 'messy_fringe'
  | 'bob_cut'
  | 'long_straight'
  | 'high_ponytail'
  | 'twin_buns'
  | 'classic_topknot'
  | 'wolf_cut'
  | 'spiky_anime_hero'
  | 'cyber_undercut'
  | 'twin_tails'
  | 'silver_spiky'
  | 'braided_royal'
  | 'royal_braided_crown'
  | 'flowing_apsara_waves';

export type EyeStyleId =
  | 'classic_round'
  | 'bright_big'
  | 'sharp_fierce'
  | 'chill_sleepy'
  | 'happy_curve'
  | 'almond'
  | 'kawaii_sparkle'
  | 'glowing_gold'
  | 'starry_glow'
  | 'dragon_slit'
  | 'mystic_heterochromia';

export type EyebrowStyleId = 'normal' | 'thick' | 'arched' | 'determined' | 'soft';

export type FaceStyleId =
  | 'warm_smile'
  | 'neutral'
  | 'confident_smirk'
  | 'cheerful_open'
  | 'rosy_blush'
  | 'golden_cheek_marks'
  | 'fierce_scar'
  | 'floating_lotus_petals'
  | 'lightning_eyes'
  | 'sacred_third_eye';

export type StarterOutfitId =
  | 'village_tunic'
  | 'casual_tee'
  | 'krama_shirt'
  | 'traveler_vest';

export interface SkinToneDef {
  id: SkinToneId;
  label: string;
  hex: string;
  shade: string;
  highlight: string;
}

export interface HairStyleDef {
  id: HairStyleId;
  label: string;
  premiumItemId?: string;
}

export interface ColorSwatchDef {
  id: string;
  label: string;
  hex: string;
}

export interface EyeStyleDef {
  id: EyeStyleId;
  label: string;
  premiumItemId?: string;
}

export interface EyebrowStyleDef {
  id: EyebrowStyleId;
  label: string;
}

export interface FaceStyleDef {
  id: FaceStyleId;
  label: string;
  premiumItemId?: string;
}

export interface StarterOutfitDef {
  id: StarterOutfitId;
  label: string;
  khmerLabel: string;
  shirtId: string;
  pantsId: string;
  previewColor: string;
  accentColor: string;
}

export const SKIN_TONES: SkinToneDef[] = [
  { id: 'fair', label: 'Fair', hex: '#fde2c8', shade: '#e2b38c', highlight: '#fff1e0' },
  { id: 'light_warm', label: 'Light Warm', hex: '#f4c29f', shade: '#d4966e', highlight: '#fde0c4' },
  { id: 'medium_tan', label: 'Medium Tan', hex: '#e2a679', shade: '#bc7d51', highlight: '#f2c19b' },
  { id: 'golden_khmer', label: 'Golden Khmer', hex: '#c88858', shade: '#9e6238', highlight: '#dfa476' },
  { id: 'deep_bronze', label: 'Deep Bronze', hex: '#a4663d', shade: '#7c4827', highlight: '#bd8056' },
  { id: 'rich_brown', label: 'Rich Brown', hex: '#774529', shade: '#542e18', highlight: '#925a3a' },
];

export const FREE_HAIR_STYLES: HairStyleDef[] = [
  { id: 'short_neat', label: 'Short Neat' },
  { id: 'side_part', label: 'Side Part' },
  { id: 'messy_fringe', label: 'Messy Fringe' },
  { id: 'bob_cut', label: 'Bob Cut' },
  { id: 'long_straight', label: 'Long Straight' },
  { id: 'high_ponytail', label: 'High Ponytail' },
  { id: 'twin_buns', label: 'Twin Buns' },
  { id: 'classic_topknot', label: 'Classic Topknot' },
  { id: 'wolf_cut', label: 'Wolf Cut' },
  { id: 'spiky_anime_hero', label: 'Spiky Anime Hero' },
  { id: 'cyber_undercut', label: 'Cyber Undercut' },
  { id: 'twin_tails', label: 'Twin Tails' },
];

export const PREMIUM_HAIR_STYLES: HairStyleDef[] = [
  { id: 'silver_spiky', label: 'Silver Spiky', premiumItemId: 'hair_silver_spiky' },
  { id: 'braided_royal', label: 'Braided Royal', premiumItemId: 'hair_braided_royal' },
  { id: 'royal_braided_crown', label: 'Royal Braided Crown', premiumItemId: 'hair_royal_braided_crown' },
  { id: 'flowing_apsara_waves', label: 'Flowing Apsara Waves', premiumItemId: 'hair_flowing_apsara_waves' },
];

export const ALL_HAIR_STYLES: HairStyleDef[] = [...FREE_HAIR_STYLES, ...PREMIUM_HAIR_STYLES];

export const HAIR_COLORS: ColorSwatchDef[] = [
  { id: 'ink_black', label: 'Ink Black', hex: '#1e1b24' },
  { id: 'espresso', label: 'Espresso', hex: '#451a03' },
  { id: 'chestnut', label: 'Chestnut', hex: '#7c2d12' },
  { id: 'auburn', label: 'Auburn', hex: '#b45309' },
  { id: 'sun_gold', label: 'Sun Gold', hex: '#eab308' },
  { id: 'silver_mist', label: 'Silver Mist', hex: '#cbd5e1' },
  { id: 'indigo', label: 'Indigo', hex: '#1d4ed8' },
  { id: 'lotus_pink', label: 'Lotus Pink', hex: '#db2777' },
];

export const FREE_EYE_STYLES: EyeStyleDef[] = [
  { id: 'classic_round', label: 'Classic Round' },
  { id: 'bright_big', label: 'Bright Big' },
  { id: 'sharp_fierce', label: 'Sharp / Fierce' },
  { id: 'chill_sleepy', label: 'Chill / Sleepy' },
  { id: 'happy_curve', label: 'Happy Curve' },
  { id: 'almond', label: 'Almond' },
  { id: 'kawaii_sparkle', label: 'Kawaii Sparkle' },
];

export const PREMIUM_EYE_STYLES: EyeStyleDef[] = [
  { id: 'glowing_gold', label: 'Glowing Golden', premiumItemId: 'salon_glowing_eyes' },
  { id: 'starry_glow', label: 'Starry Glow', premiumItemId: 'salon_starry_glow_eyes' },
  { id: 'dragon_slit', label: 'Dragon Slit', premiumItemId: 'salon_dragon_slit_eyes' },
  { id: 'mystic_heterochromia', label: 'Mystic Heterochromia', premiumItemId: 'salon_heterochromia_eyes' },
];

export const ALL_EYE_STYLES: EyeStyleDef[] = [...FREE_EYE_STYLES, ...PREMIUM_EYE_STYLES];

export const EYE_COLORS: ColorSwatchDef[] = [
  { id: 'obsidian', label: 'Obsidian', hex: '#1c1917' },
  { id: 'warm_brown', label: 'Warm Brown', hex: '#5c3317' },
  { id: 'sapphire', label: 'Sapphire', hex: '#1d4ed8' },
  { id: 'emerald', label: 'Emerald', hex: '#047857' },
  { id: 'amethyst', label: 'Amethyst', hex: '#7e22ce' },
  { id: 'amber_gold', label: 'Amber Gold', hex: '#d97706' },
];

export const EYEBROW_STYLES: EyebrowStyleDef[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'thick', label: 'Thick' },
  { id: 'arched', label: 'Arched' },
  { id: 'determined', label: 'Determined' },
  { id: 'soft', label: 'Soft' },
];

export const FREE_FACE_STYLES: FaceStyleDef[] = [
  { id: 'warm_smile', label: 'Warm Smile' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'confident_smirk', label: 'Confident Smirk' },
  { id: 'cheerful_open', label: 'Cheerful Open' },
  { id: 'rosy_blush', label: 'Rosy Blush' },
  { id: 'golden_cheek_marks', label: 'Golden Cheek Marks' },
];

export const PREMIUM_FACE_STYLES: FaceStyleDef[] = [
  { id: 'fierce_scar', label: 'Fierce Scar', premiumItemId: 'salon_fierce_scar' },
  { id: 'floating_lotus_petals', label: 'Floating Lotus Petals', premiumItemId: 'salon_floating_lotus_petals' },
  { id: 'lightning_eyes', label: 'Lightning Eyes', premiumItemId: 'salon_lightning_eyes' },
  { id: 'sacred_third_eye', label: 'Sacred Third-Eye Gem', premiumItemId: 'salon_sacred_third_eye' },
];

export const ALL_FACE_STYLES: FaceStyleDef[] = [...FREE_FACE_STYLES, ...PREMIUM_FACE_STYLES];

export const STARTER_OUTFITS: StarterOutfitDef[] = [
  {
    id: 'village_tunic',
    label: 'Village Tunic',
    khmerLabel: 'អាវភូមិ',
    shirtId: 'shirt_village_tunic',
    pantsId: 'pants_village_shorts',
    previewColor: '#3b82f6',
    accentColor: '#fef3c7',
  },
  {
    id: 'casual_tee',
    label: 'Casual Tee & Jeans',
    khmerLabel: 'អាវយឺត និងខោខូវប៊យ',
    shirtId: 'shirt_casual_tee',
    pantsId: 'pants_casual_jeans',
    previewColor: '#10b981',
    accentColor: '#1e3a8a',
  },
  {
    id: 'krama_shirt',
    label: 'Traditional Krama Shirt',
    khmerLabel: 'អាវក្រមាប្រពៃណី',
    shirtId: 'shirt_krama_set',
    pantsId: 'pants_village_shorts',
    previewColor: '#dc2626',
    accentColor: '#ffffff',
  },
  {
    id: 'traveler_vest',
    label: 'Simple Traveler Vest',
    khmerLabel: 'អាវកាក់អ្នកដំណើរ',
    shirtId: 'shirt_traveler_vest',
    pantsId: 'pants_village_shorts',
    previewColor: '#92400e',
    accentColor: '#fde68a',
  },
];

export function resolveSkinToneDef(skinToneOrHex?: string): SkinToneDef {
  if (!skinToneOrHex) return SKIN_TONES[1];
  const byId = SKIN_TONES.find((s) => s.id === skinToneOrHex);
  if (byId) return byId;
  const byHex = SKIN_TONES.find((s) => s.hex.toLowerCase() === skinToneOrHex.toLowerCase());
  if (byHex) return byHex;
  return SKIN_TONES[1];
}

export function normalizeHairStyleId(raw?: string | null): HairStyleId {
  if (!raw) return 'short_neat';
  const legacyMap: Record<string, HairStyleId> = {
    hair_short: 'short_neat',
    hair_bob: 'bob_cut',
    hair_spiky: 'messy_fringe',
    hair_long: 'long_straight',
  };
  if (raw in legacyMap) return legacyMap[raw];
  if (ALL_HAIR_STYLES.some((h) => h.id === raw)) return raw as HairStyleId;
  return 'short_neat';
}

export function normalizeEyeStyleId(raw?: string | null): EyeStyleId {
  if (!raw) return 'classic_round';
  const legacyMap: Record<string, EyeStyleId> = {
    cheerful: 'bright_big',
    classic: 'classic_round',
    cool: 'sharp_fierce',
    starry: 'bright_big',
  };
  if (raw in legacyMap) return legacyMap[raw];
  if (ALL_EYE_STYLES.some((e) => e.id === raw)) return raw as EyeStyleId;
  return 'classic_round';
}

export function normalizeEyebrowStyleId(raw?: string | null): EyebrowStyleId {
  if (raw && EYEBROW_STYLES.some((b) => b.id === raw)) return raw as EyebrowStyleId;
  return 'normal';
}

export function normalizeFaceStyleId(raw?: string | null): FaceStyleId {
  if (raw && ALL_FACE_STYLES.some((f) => f.id === raw)) return raw as FaceStyleId;
  return 'warm_smile';
}
