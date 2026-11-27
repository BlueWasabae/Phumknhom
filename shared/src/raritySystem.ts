import type { ItemRarity } from './types';

export type DropSourceCategory = 'mining' | 'fishing' | 'foraging' | 'treasure_map' | 'boss';

export interface RarityTierDef {
  id: ItemRarity;
  label: string;
  khmerLabel: string;
  dropRatePct: number; // Exact tier drop percentage (totals 100%)
  colorHex: string;
  glowHex: string;
  borderClass: string;
  pillClass: string;
  textClass: string;
  announceGlobal: boolean;
}

export const RARITY_ORDER: ItemRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'ancient',
];

export const RARITY_TIERS: Record<ItemRarity, RarityTierDef> = {
  common: {
    id: 'common',
    label: 'Common',
    khmerLabel: 'ធម្មតា',
    dropRatePct: 58.0,
    colorHex: '#f1f5f9',
    glowHex: '#cbd5e1',
    borderClass: 'border-stone-400/80',
    pillClass: 'bg-stone-600 text-white',
    textClass: 'text-stone-700',
    announceGlobal: false,
  },
  uncommon: {
    id: 'uncommon',
    label: 'Uncommon',
    khmerLabel: 'កម្រមធ្យម',
    dropRatePct: 25.0,
    colorHex: '#22c55e',
    glowHex: '#4ade80',
    borderClass: 'border-emerald-600',
    pillClass: 'bg-emerald-700 text-white',
    textClass: 'text-emerald-700',
    announceGlobal: false,
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    khmerLabel: 'កម្រ',
    dropRatePct: 10.0,
    colorHex: '#38bdf8',
    glowHex: '#0ea5e9',
    borderClass: 'border-sky-600',
    pillClass: 'bg-sky-700 text-white',
    textClass: 'text-sky-700',
    announceGlobal: false,
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    khmerLabel: 'អស្ចារ្យ',
    dropRatePct: 4.5,
    colorHex: '#a855f7',
    glowHex: '#c084fc',
    borderClass: 'border-purple-600',
    pillClass: 'bg-purple-700 text-white',
    textClass: 'text-purple-700',
    announceGlobal: false,
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    khmerLabel: 'ទេវកថា',
    dropRatePct: 1.8,
    colorHex: '#f59e0b',
    glowHex: '#fde047',
    borderClass: 'border-amber-500',
    pillClass: 'bg-amber-600 text-white',
    textClass: 'text-amber-700',
    announceGlobal: false,
  },
  mythic: {
    id: 'mythic',
    label: 'Mythic',
    khmerLabel: 'មហាអស្ចារ្យ',
    dropRatePct: 0.55,
    colorHex: '#ef4444',
    glowHex: '#fb7185',
    borderClass: 'border-rose-600 ring-1 ring-rose-400/60',
    pillClass: 'bg-gradient-to-r from-red-700 to-rose-600 text-amber-50 shadow-sm',
    textClass: 'text-rose-700',
    announceGlobal: true,
  },
  ancient: {
    id: 'ancient',
    label: 'Ancient',
    khmerLabel: 'បុរាណអង្គរ',
    dropRatePct: 0.15,
    colorHex: '#22d3ee',
    glowHex: '#facc15',
    borderClass: 'border-cyan-400 ring-2 ring-amber-300/80',
    pillClass: 'bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 text-slate-950 font-extrabold shadow-md',
    textClass: 'text-cyan-700',
    announceGlobal: true,
  },
};

export const RARITY_TIER_LIST: RarityTierDef[] = RARITY_ORDER.map((id) => RARITY_TIERS[id]);

export interface ChaseDropEntry {
  itemId: string;
  name: string;
  khmerName: string;
  rarity: ItemRarity;
  dropRatePct: number; // Exact roll percentage (e.g. 0.15 = 0.15%)
  sources: DropSourceCategory[];
  sourceLabel: string;
  icon: string;
  summary: string;
}

/**
 * 12 Ultra-Rare Chase Drops spanning Mining, Fishing, Foraging, Treasure Maps & Bosses.
 */
export const CHASE_DROP_TABLE: ChaseDropEntry[] = [
  {
    itemId: 'weapon_ancient_angkor_blade',
    name: 'Ancient Angkor Relic Blade',
    khmerName: 'ដាវបុរាណប្រាសាទអង្គរ',
    rarity: 'ancient',
    dropRatePct: 0.15,
    sources: ['boss', 'treasure_map'],
    sourceLabel: 'Mythic Bosses & Angkor Treasure Maps',
    icon: '🗡️',
    summary: 'Prismatic Angkorian relic greatsword humming with celestial Bayon lightning.',
  },
  {
    itemId: 'wings_ancient_apsara',
    name: 'Ancient Apsara Wings',
    khmerName: 'ស្លាបអប្សរាបុរាណអង្គរ',
    rarity: 'ancient',
    dropRatePct: 0.1,
    sources: ['boss', 'treasure_map'],
    sourceLabel: 'Endgame Bosses & Sunken Ruins Chests',
    icon: '🪽',
    summary: 'Prismatic cyan-and-gold celestial silk wings radiated with Angkorian light.',
  },
  {
    itemId: 'hat_ancient_bayon_crown',
    name: 'Ancient Bayon Crown',
    khmerName: 'មកុដប្រាសាទបាយ័នបុរាណ',
    rarity: 'ancient',
    dropRatePct: 0.15,
    sources: ['treasure_map', 'mining'],
    sourceLabel: 'Sunken Ruins & Treasure Maps',
    icon: '👑',
    summary: 'Four-faced golden sandstone diadem recovered from hidden Angkor vaults.',
  },
  {
    itemId: 'shirt_ancient_celestial_krama',
    name: 'Ancient Celestial Krama Mantle',
    khmerName: 'អាវក្រមាទេពបុរាណ',
    rarity: 'ancient',
    dropRatePct: 0.15,
    sources: ['foraging', 'treasure_map'],
    sourceLabel: 'Misty Bamboo Forest & Ancient Relics',
    icon: '🧣',
    summary: 'Astral-woven royal Krama radiating golden-cyan lotus runes.',
  },
  {
    itemId: 'acc_mythic_mekong_pearl',
    name: 'Mythic Mekong Pearl',
    khmerName: 'គុជមេគង្គមហាអស្ចារ្យ',
    rarity: 'mythic',
    dropRatePct: 0.5,
    sources: ['fishing'],
    sourceLabel: 'Riverside Pier & Sunken Ruins Fishing',
    icon: '🫧',
    summary: 'Luminous crimson-tinted river pearl granting +18% Crit & +35 Max HP.',
  },
  {
    itemId: 'weapon_mythic_jade_fang',
    name: 'Mythic Jade Dragon Fang',
    khmerName: 'ចង្កូមនាគថ្មមរកត',
    rarity: 'mythic',
    dropRatePct: 0.55,
    sources: ['mining', 'boss'],
    sourceLabel: 'Laterite Quarry Jade Veins & Neak Reach',
    icon: '🐉',
    summary: 'Carved imperial jade twin-blade pulsing with abyssal Naga fury.',
  },
  {
    itemId: 'weapon_mythic_bamboo_flute',
    name: 'Mythic Spirit Bamboo Flute',
    khmerName: 'ខ្លុយឫស្សីបារមី',
    rarity: 'mythic',
    dropRatePct: 0.55,
    sources: ['foraging'],
    sourceLabel: 'Misty Bamboo Forest Foraging',
    icon: '🪈',
    summary: 'Resonant sacred flute-tome summoning spirit-wind chimes on every cast.',
  },
  {
    itemId: 'acc_mythic_kampot_ember_ring',
    name: 'Mythic Kampot Ember Ring',
    khmerName: 'ចិញ្ចៀនភ្លើងម្រេចកំពត',
    rarity: 'mythic',
    dropRatePct: 0.55,
    sources: ['boss', 'foraging'],
    sourceLabel: 'Mythic Bosses & Wild Frontier Herbs',
    icon: '💍',
    summary: 'Crimson ember band infusing strikes with +14% ATK & +8% Crit.',
  },
  {
    itemId: 'acc_legendary_laterite_core',
    name: 'Legendary Golden Laterite Core',
    khmerName: 'ស្នូលថ្មបាយក្រៀមមាស',
    rarity: 'legendary',
    dropRatePct: 1.5,
    sources: ['mining'],
    sourceLabel: 'Laterite Quarry & Deep Cavern Veins',
    icon: '🪨',
    summary: 'Condensed golden laterite heart granting +10 DEF & +45 Max HP.',
  },
  {
    itemId: 'hat_legendary_sunken_lotus_halo',
    name: 'Legendary Sunken Lotus Halo',
    khmerName: 'រស្មីផ្កាឈូកប្រាសាទលិចទឹក',
    rarity: 'legendary',
    dropRatePct: 1.8,
    sources: ['fishing', 'treasure_map'],
    sourceLabel: 'Fishing & Sunken Angkor Ruins',
    icon: '🪷',
    summary: 'Floating golden temple lotus circlet worn by river sages.',
  },
  {
    itemId: 'weapon_epic_quarry_pick_axe',
    name: 'Epic Laterite War Pick',
    khmerName: 'ចបជីកថ្មបាយក្រៀម',
    rarity: 'epic',
    dropRatePct: 4.5,
    sources: ['mining'],
    sourceLabel: 'Laterite Quarry & Caverns',
    icon: '⛏️',
    summary: 'Heavy temple quarry pole-pick with high Armor Penetration.',
  },
  {
    itemId: 'hat_rare_bamboo_sage_hood',
    name: 'Rare Misty Bamboo Hood',
    khmerName: 'មួកព្រៃឫស្សីអ័ព្ទ',
    rarity: 'rare',
    dropRatePct: 10.0,
    sources: ['foraging'],
    sourceLabel: 'Misty Bamboo Forest',
    icon: '🎋',
    summary: 'Dew-woven emerald hood favored by Khmer herbalists.',
  },
];

export const CHASE_DROP_BY_ID: Record<string, ChaseDropEntry> = Object.fromEntries(
  CHASE_DROP_TABLE.map((entry) => [entry.itemId, entry])
);

export function getRarityTierDef(rarity?: ItemRarity | null): RarityTierDef {
  if (rarity && rarity in RARITY_TIERS) {
    return RARITY_TIERS[rarity];
  }
  return RARITY_TIERS.common;
}

export function getItemDropRatePct(itemId: string, fallbackRarity?: ItemRarity | null): number {
  const chase = CHASE_DROP_BY_ID[itemId];
  if (chase) return chase.dropRatePct;
  return getRarityTierDef(fallbackRarity).dropRatePct;
}

export function formatDropRatePct(pct: number): string {
  if (pct < 1) return `${pct.toFixed(2).replace(/0$/, '')}%`;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(1)}%`;
}

/**
 * Rolls one weighted rarity tier using exact 7-tier probabilities
 * (58% / 25% / 10% / 4.5% / 1.8% / 0.55% / 0.15%).
 */
export function rollRarityTier(luckMultiplier = 1, rng: () => number = Math.random): ItemRarity {
  const roll = rng() * 100;
  // Higher luck shifts threshold slightly toward rarer tiers from the top down
  const mult = Math.max(1, Math.min(2.5, luckMultiplier));
  const ancientCut = RARITY_TIERS.ancient.dropRatePct * mult;
  if (roll < ancientCut) return 'ancient';
  const mythicCut = ancientCut + RARITY_TIERS.mythic.dropRatePct * mult;
  if (roll < mythicCut) return 'mythic';
  const legendaryCut = mythicCut + RARITY_TIERS.legendary.dropRatePct * mult;
  if (roll < legendaryCut) return 'legendary';
  const epicCut = legendaryCut + RARITY_TIERS.epic.dropRatePct * mult;
  if (roll < epicCut) return 'epic';
  const rareCut = epicCut + RARITY_TIERS.rare.dropRatePct;
  if (roll < rareCut) return 'rare';
  const uncommonCut = rareCut + RARITY_TIERS.uncommon.dropRatePct;
  if (roll < uncommonCut) return 'uncommon';
  return 'common';
}

/**
 * Attempts to roll an ultra-rare Chase Drop for a given activity category
 * (mining, fishing, foraging, treasure_map, or boss).
 */
export function rollChaseDropForSource(
  source: DropSourceCategory,
  luckMultiplier = 1,
  rng: () => number = Math.random
): ChaseDropEntry | null {
  const pool = CHASE_DROP_TABLE.filter((c) => c.sources.includes(source)).sort(
    (a, b) => a.dropRatePct - b.dropRatePct
  );
  const mult = Math.max(1, Math.min(2.5, luckMultiplier));
  const roll = rng() * 100;
  let acc = 0;
  for (const entry of pool) {
    acc += entry.dropRatePct * mult;
    if (roll < acc) {
      return entry;
    }
  }
  return null;
}

export function isAnnouncementRarity(rarity?: ItemRarity | null): boolean {
  return rarity === 'mythic' || rarity === 'ancient';
}
