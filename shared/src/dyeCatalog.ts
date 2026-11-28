export type DyeCategory = 'botanical' | 'prismatic';
export type DyeSlot = 'shirt' | 'pants' | 'krama' | 'wings';

export interface OutfitDyeDef {
  id: string;
  name: string;
  khmerName: string;
  category: DyeCategory;
  primaryHex: string;
  accentHex: string;
  shimmerGlowHex?: number;
  coinCost: number;
  diamondCost: number;
  requiredForageItemId?: string;
  requiredForageQty?: number;
  description: string;
}

/**
 * Update 3.4 — Botanical & Prismatic Outfit Dye Studio Catalog (Bopha's Fashion Boutique).
 * - 5 Botanical Dyes (Craftable with Coins + Foraged Khmer Plants)
 * - 4 Prismatic & Metallic Dyes (Diamond Store / Reliquary — adds shimmering WebGL bloom tint on PaperDoll!)
 */
export const OUTFIT_DYE_CATALOG: Record<string, OutfitDyeDef> = {
  // === BOTANICAL DYES (Coins + Foraged Plants) ===
  dye_lotus_pink: {
    id: 'dye_lotus_pink',
    name: 'Lotus Pink',
    khmerName: 'ពណ៌ផ្កាឈូក',
    category: 'botanical',
    primaryHex: '#f472b6',
    accentHex: '#fbcfe8',
    coinCost: 150,
    diamondCost: 0,
    requiredForageItemId: 'forage_lotus_blossom',
    requiredForageQty: 1,
    description: 'Soft sunrise pink steeped from fresh Mekong lotus petals.',
  },
  dye_pandan_green: {
    id: 'dye_pandan_green',
    name: 'Pandan Green',
    khmerName: 'ពណ៌ស្លឹកតើយ',
    category: 'botanical',
    primaryHex: '#10b981',
    accentHex: '#a7f3d0',
    coinCost: 150,
    diamondCost: 0,
    requiredForageItemId: 'forage_wild_herb',
    requiredForageQty: 1,
    description: 'Vibrant emerald botanical dye crushed from aromatic Khmer pandan leaves.',
  },
  dye_turmeric_gold: {
    id: 'dye_turmeric_gold',
    name: 'Turmeric Gold',
    khmerName: 'ពណ៌លឿងរមៀត',
    category: 'botanical',
    primaryHex: '#f59e0b',
    accentHex: '#fef08a',
    coinCost: 180,
    diamondCost: 0,
    description: 'Warm saffron-gold woven by Kampot silk dyers.',
  },
  dye_indigo_krama: {
    id: 'dye_indigo_krama',
    name: 'Indigo Krama',
    khmerName: 'ពណ៌ខៀវក្រមា',
    category: 'botanical',
    primaryHex: '#3730a3',
    accentHex: '#93c5fd',
    coinCost: 180,
    diamondCost: 0,
    description: 'Deep traditional village indigo dyed in stoneware vats.',
  },
  dye_laterite_terracotta: {
    id: 'dye_laterite_terracotta',
    name: 'Laterite Terracotta',
    khmerName: 'ពណ៌ដីក្រហមបុរាណ',
    category: 'botanical',
    primaryHex: '#c2410c',
    accentHex: '#fed7aa',
    coinCost: 200,
    diamondCost: 0,
    description: 'Earthy red-ochre pigment ground from ancient Angkor sandstone.',
  },

  // === PRISMATIC & METALLIC DYES (Diamond Store / Reliquary — Shimmering Tint & Bloom!) ===
  dye_angkor_liquid_gold: {
    id: 'dye_angkor_liquid_gold',
    name: 'Angkor Liquid Gold',
    khmerName: 'មាសទឹកអង្គរ',
    category: 'prismatic',
    primaryHex: '#facc15',
    accentHex: '#fef9c3',
    shimmerGlowHex: 0xfacc15,
    coinCost: 0,
    diamondCost: 22,
    description: 'Molten temple-gilding luster with a radiant golden aura shimmer.',
  },
  dye_bioluminescent_cyan: {
    id: 'dye_bioluminescent_cyan',
    name: 'Bioluminescent Cyan',
    khmerName: 'ពន្លឺខៀវកោះរ៉ុង',
    category: 'prismatic',
    primaryHex: '#06b6d4',
    accentHex: '#a5f3fc',
    shimmerGlowHex: 0x22d3ee,
    coinCost: 0,
    diamondCost: 22,
    description: 'Glowing Koh Rong midnight-tide plankton shimmer.',
  },
  dye_void_amethyst: {
    id: 'dye_void_amethyst',
    name: 'Void Amethyst',
    khmerName: 'ត្បូងស្វាយអមតៈ',
    category: 'prismatic',
    primaryHex: '#9333ea',
    accentHex: '#e9d5ff',
    shimmerGlowHex: 0xc084fc,
    coinCost: 0,
    diamondCost: 25,
    description: 'Imperial shadow-violet dye infused with shimmering astral crystal dust.',
  },
  dye_solar_rose: {
    id: 'dye_solar_rose',
    name: 'Solar Rose',
    khmerName: 'ផ្កាកុលាបព្រះអាទិត្យ',
    category: 'prismatic',
    primaryHex: '#f43f5e',
    accentHex: '#fecdd3',
    shimmerGlowHex: 0xfb7185,
    coinCost: 0,
    diamondCost: 25,
    description: 'Luminous sunset-rose sheen pulsing with warm Phnom Kulen light.',
  },
};

export const OUTFIT_DYE_LIST: OutfitDyeDef[] = Object.values(OUTFIT_DYE_CATALOG);

export function getOutfitDye(dyeId: string | undefined | null): OutfitDyeDef | undefined {
  if (!dyeId) return undefined;
  return OUTFIT_DYE_CATALOG[dyeId];
}
