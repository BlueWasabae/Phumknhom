import type { WeaponAuraId } from './types';

export type ReliquaryTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'ancient';

export interface ReliquaryTierMeta {
  tier: ReliquaryTier;
  label: string;
  khmerLabel: string;
  ratePct: number;
  color: string;
  glowHex: number;
  badgeClass: string;
  borderClass: string;
  duplicateShards: number;
}

export const RELIQUARY_TIERS: Record<ReliquaryTier, ReliquaryTierMeta> = {
  common: {
    tier: 'common',
    label: 'Common',
    khmerLabel: 'ធម្មតា',
    ratePct: 55.0,
    color: '#cbd5e1',
    glowHex: 0x94a3b8,
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-500/40',
    borderClass: 'border-slate-400',
    duplicateShards: 5,
  },
  rare: {
    tier: 'rare',
    label: 'Rare',
    khmerLabel: 'កម្រ',
    ratePct: 28.0,
    color: '#38bdf8',
    glowHex: 0x38bdf8,
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-500/50',
    borderClass: 'border-sky-400',
    duplicateShards: 12,
  },
  epic: {
    tier: 'epic',
    label: 'Epic',
    khmerLabel: 'អស្ចារ្យ',
    ratePct: 12.0,
    color: '#c084fc',
    glowHex: 0xa855f7,
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-500/50',
    borderClass: 'border-purple-400',
    duplicateShards: 25,
  },
  legendary: {
    tier: 'legendary',
    label: 'Legendary',
    khmerLabel: 'រឿងព្រេង',
    ratePct: 4.2,
    color: '#facc15',
    glowHex: 0xfacc15,
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-500',
    borderClass: 'border-amber-400',
    duplicateShards: 60,
  },
  mythic: {
    tier: 'mythic',
    label: 'Mythic',
    khmerLabel: 'ទេវកថា',
    ratePct: 0.65,
    color: '#fb7185',
    glowHex: 0xf43f5e,
    badgeClass: 'bg-rose-100 text-rose-950 border-rose-500',
    borderClass: 'border-rose-500',
    duplicateShards: 150,
  },
  ancient: {
    tier: 'ancient',
    label: 'Ancient',
    khmerLabel: 'បុរាណអង្គរ',
    ratePct: 0.15,
    color: '#fef08a',
    glowHex: 0xfef08a,
    badgeClass: 'bg-gradient-to-r from-amber-200 via-yellow-100 to-rose-200 text-amber-950 border-yellow-500',
    borderClass: 'border-yellow-300',
    duplicateShards: 300,
  },
};

export const RELIQUARY_TIER_ORDER: ReliquaryTier[] = [
  'ancient',
  'mythic',
  'legendary',
  'epic',
  'rare',
  'common',
];

export interface ReliquaryRewardEntry {
  id: string;
  tier: ReliquaryTier;
  name: string;
  khmerName: string;
  icon: string;
  category: 'consumable' | 'furniture' | 'cosmetic' | 'pet' | 'wings' | 'set' | 'aura';
  isUniqueCosmetic: boolean;
  /** Primary itemId (or bundle itemIds) granted to inventory */
  itemIds?: Array<{ itemId: string; quantity: number }>;
  /** Furniture grant */
  furnitureId?: string;
  /** Weapon Aura unlock */
  weaponAuraId?: WeaponAuraId;
  /** Bonus coins (optional) */
  coins?: number;
}

export const RELIQUARY_POOL: ReliquaryRewardEntry[] = [
  // ---- COMMON (55%) ----
  {
    id: 'rel_reforge_pack',
    tier: 'common',
    name: '2× Angkor Reforge Stones',
    khmerName: 'ថ្មលត់អាវុធ ×២',
    icon: '🪨',
    category: 'consumable',
    isUniqueCosmetic: false,
    itemIds: [{ itemId: 'mat_reforge_stone', quantity: 2 }],
  },
  {
    id: 'rel_exotic_seeds',
    tier: 'common',
    name: 'Exotic Spirit Seed Pack',
    khmerName: 'កញ្ចប់គ្រាប់ពូជពិសេស',
    icon: '🌱',
    category: 'consumable',
    isUniqueCosmetic: false,
    itemIds: [
      { itemId: 'seed_phka_rumduol', quantity: 3 },
      { itemId: 'fertilizer', quantity: 3 },
    ],
  },
  {
    id: 'rel_lotus_lamp',
    tier: 'common',
    name: 'Carved Lotus Floor Lamp',
    khmerName: 'ចង្កៀងផ្កាឈូកផ្ទះឈើ',
    icon: '🏮',
    category: 'furniture',
    isUniqueCosmetic: false,
    furnitureId: 'furn_lotus_lamp',
  },
  {
    id: 'rel_krama_tapestry',
    tier: 'common',
    name: 'Woven Krama Wall Tapestry',
    khmerName: 'ផ្ទាំងក្រមាប្រពៃណី',
    icon: '🧣',
    category: 'furniture',
    isUniqueCosmetic: false,
    furnitureId: 'furn_krama_tapestry',
  },

  // ---- RARE (28%) ----
  {
    id: 'rel_boss_essence_pack',
    tier: 'rare',
    name: 'Tri-Boss Spirit Essence Pack',
    khmerName: 'កញ្ចប់បារមីមេបិសាចទាំង៣',
    icon: '🧪',
    category: 'consumable',
    isUniqueCosmetic: false,
    itemIds: [
      { itemId: 'essence_slime', quantity: 2 },
      { itemId: 'essence_stone', quantity: 2 },
      { itemId: 'essence_naga', quantity: 1 },
    ],
  },
  {
    id: 'rel_starry_eyes',
    tier: 'rare',
    name: 'Starry Glow Salon Eyes',
    khmerName: 'ភ្នែកពន្លឺផ្កាយ',
    icon: '✨',
    category: 'cosmetic',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'salon_starry_glow_eyes', quantity: 1 }],
  },
  {
    id: 'rel_dragon_eyes',
    tier: 'rare',
    name: 'Dragon Slit Salon Eyes',
    khmerName: 'ភ្នែកនាគរាជ',
    icon: '👁️',
    category: 'cosmetic',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'salon_dragon_slit_eyes', quantity: 1 }],
  },
  {
    id: 'rel_apsara_waves',
    tier: 'rare',
    name: 'Flowing Apsara Waves Hair',
    khmerName: 'សក់រលកអប្សរា',
    icon: '💇',
    category: 'cosmetic',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'hair_flowing_apsara_waves', quantity: 1 }],
  },

  // ---- EPIC (12%) ----
  {
    id: 'rel_cyber_apsara_outfit',
    tier: 'epic',
    name: 'Cyber-Apsara Neon Prestige Set',
    khmerName: 'ឈុតអប្សរាអនាគតនីអុង',
    icon: '💠',
    category: 'set',
    isUniqueCosmetic: true,
    itemIds: [
      { itemId: 'hat_cyber_apsara', quantity: 1 },
      { itemId: 'shirt_cyber_apsara', quantity: 1 },
      { itemId: 'pants_cyber_apsara', quantity: 1 },
    ],
  },
  {
    id: 'rel_royal_angkor_outfit',
    tier: 'epic',
    name: 'Royal Golden Angkor Prestige Set',
    khmerName: 'ឈុតគ្រឿងក្រោះមាសអង្គរ',
    icon: '👑',
    category: 'set',
    isUniqueCosmetic: true,
    itemIds: [
      { itemId: 'hat_royal_angkor', quantity: 1 },
      { itemId: 'shirt_royal_angkor', quantity: 1 },
      { itemId: 'pants_royal_angkor', quantity: 1 },
    ],
  },
  {
    id: 'rel_royal_braided_crown',
    tier: 'epic',
    name: 'Royal Braided Crown & Lotus Aura',
    khmerName: 'មកុដសក់ក្រង និងផ្កាឈូក',
    icon: '🪷',
    category: 'cosmetic',
    isUniqueCosmetic: true,
    itemIds: [
      { itemId: 'hair_royal_braided_crown', quantity: 1 },
      { itemId: 'salon_floating_lotus_petals', quantity: 1 },
    ],
  },
  {
    id: 'rel_golden_krama_cape',
    tier: 'epic',
    name: 'Golden Krama Royal Cape',
    khmerName: 'អាវឃ្លុំក្រមាមាសរាជវង្ស',
    icon: '🧣',
    category: 'wings',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'wings_golden_krama_cape', quantity: 1 }],
  },

  // ---- LEGENDARY (4.2%) ----
  {
    id: 'rel_pet_kitsune',
    tier: 'legendary',
    name: 'Celestial Lotus Kitsune (Animated Pet)',
    khmerName: 'កញ្ជ្រោងផ្កាឈូកកន្ទុយបី',
    icon: '🦊',
    category: 'pet',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'pet_celestial_lotus_kitsune', quantity: 1 }],
  },
  {
    id: 'rel_pet_singha',
    tier: 'legendary',
    name: 'Baby Angkor Lion Singha (Animated Pet)',
    khmerName: 'កូនតោសិង្ហអង្គរ',
    icon: '🦁',
    category: 'pet',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'pet_baby_angkor_singha', quantity: 1 }],
  },
  {
    id: 'rel_pet_golden_naga',
    tier: 'legendary',
    name: 'Mini Golden Naga (Auto-Loot Pet)',
    khmerName: 'កូននាគមាសរើសកាក់អូតូ',
    icon: '🐲',
    category: 'pet',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'pet_mini_golden_naga', quantity: 1 }],
  },
  {
    id: 'rel_aura_celestial',
    tier: 'legendary',
    name: 'Celestial Angkor Weapon Aura',
    khmerName: 'រស្មីអាវុធទេវតាអង្គរ',
    icon: '⚔️',
    category: 'aura',
    isUniqueCosmetic: true,
    weaponAuraId: 'celestial_angkor',
  },

  // ---- MYTHIC (0.65%) ----
  {
    id: 'rel_wings_solar_seraph',
    tier: 'mythic',
    name: 'Solar Angkor Seraph Wings (6-Wing Bloom)',
    khmerName: 'ស្លាបទេវតាព្រះអាទិត្យប្រាំមួយ',
    icon: '☀️',
    category: 'wings',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'wings_solar_angkor_seraph', quantity: 1 }],
  },
  {
    id: 'rel_wings_void_butterfly',
    tier: 'mythic',
    name: 'Void Phantom Butterfly Wings (4-Frame Bloom)',
    khmerName: 'ស្លាបមេអំបៅស្រមោលអវកាស',
    icon: '🦋',
    category: 'wings',
    isUniqueCosmetic: true,
    itemIds: [{ itemId: 'wings_void_phantom_butterfly', quantity: 1 }],
  },

  // ---- ANCIENT (0.15%) ----
  {
    id: 'rel_ancient_celestial_naga_set',
    tier: 'ancient',
    name: 'Celestial Naga Sovereign Set (Crown + Wings + Aura)',
    khmerName: 'ឈុតស្តេចនាគទេពអមតៈ',
    icon: '🐉',
    category: 'set',
    isUniqueCosmetic: true,
    itemIds: [
      { itemId: 'hat_celestial_naga', quantity: 1 },
      { itemId: 'shirt_celestial_naga', quantity: 1 },
      { itemId: 'wings_celestial_naga_dragon', quantity: 1 },
    ],
    weaponAuraId: 'emerald_naga',
  },
];

export interface ShardExchangeOffer {
  id: string;
  name: string;
  khmerName: string;
  icon: string;
  tier: ReliquaryTier;
  shardCost: number;
  description: string;
  itemIds: string[];
  weaponAuraId?: WeaponAuraId;
}

/**
 * Duplicate Protection Shard Exchange:
 * Both F2P and paying players can convert duplicate Angkor Shards directly into their favorite Wings, Pets, or Sets with ZERO RNG!
 */
export const SHARD_EXCHANGE_OFFERS: ShardExchangeOffer[] = [
  {
    id: 'ex_solar_seraph',
    name: 'Solar Angkor Seraph Wings',
    khmerName: 'ស្លាបទេវតាព្រះអាទិត្យប្រាំមួយ',
    icon: '☀️',
    tier: 'mythic',
    shardCost: 260,
    description: '6-wing animated golden seraphim spread with radiant Angkor bloom (0 combat stats).',
    itemIds: ['wings_solar_angkor_seraph'],
  },
  {
    id: 'ex_void_butterfly',
    name: 'Void Phantom Butterfly Wings',
    khmerName: 'ស្លាបមេអំបៅស្រមោលអវកាស',
    icon: '🦋',
    tier: 'mythic',
    shardCost: 240,
    description: '4-frame animated violet & cyan phantom butterfly wings (0 combat stats).',
    itemIds: ['wings_void_phantom_butterfly'],
  },
  {
    id: 'ex_celestial_naga_set',
    name: 'Celestial Naga Sovereign Set',
    khmerName: 'ឈុតស្តេចនាគទេពអមតៈ',
    icon: '🐉',
    tier: 'ancient',
    shardCost: 420,
    description: 'Complete Ancient Sovereign Crown + Vestments + 4-Frame Naga Dragon Wings + Emerald Aura.',
    itemIds: ['hat_celestial_naga', 'shirt_celestial_naga', 'wings_celestial_naga_dragon'],
    weaponAuraId: 'emerald_naga',
  },
  {
    id: 'ex_mini_golden_naga',
    name: 'Mini Golden Naga (Auto-Loot Pet)',
    khmerName: 'កូននាគមាសរើសកាក់អូតូ',
    icon: '🐲',
    tier: 'legendary',
    shardCost: 160,
    description: 'Animated coiling Golden Naga companion with extended loot auto-collect (0 combat damage).',
    itemIds: ['pet_mini_golden_naga'],
  },
  {
    id: 'ex_lotus_kitsune',
    name: 'Celestial Lotus Kitsune Pet',
    khmerName: 'កញ្ជ្រោងផ្កាឈូកកន្ទុយបី',
    icon: '🦊',
    tier: 'legendary',
    shardCost: 130,
    description: '4-frame animated snow-white 3-tailed lotus fox spirit (0 combat damage).',
    itemIds: ['pet_celestial_lotus_kitsune'],
  },
  {
    id: 'ex_angkor_singha',
    name: 'Baby Angkor Lion (Singha) Pet',
    khmerName: 'កូនតោសិង្ហអង្គរ',
    icon: '🦁',
    tier: 'legendary',
    shardCost: 130,
    description: '4-frame animated golden-and-crimson royal Singha cub (0 combat damage).',
    itemIds: ['pet_baby_angkor_singha'],
  },
  {
    id: 'ex_golden_krama_cape',
    name: 'Golden Krama Royal Cape',
    khmerName: 'អាវឃ្លុំក្រមាមាសរាជវង្ស',
    icon: '🧣',
    tier: 'epic',
    shardCost: 75,
    description: 'Royal crimson-and-gold Khmer Krama cloak with warm plaza glow.',
    itemIds: ['wings_golden_krama_cape'],
  },
  {
    id: 'ex_reliquary_key',
    name: '1× Angkor Reliquary Key',
    khmerName: 'កូនសោប្រអប់អង្គរ ×១',
    icon: '🗝️',
    tier: 'rare',
    shardCost: 35,
    description: 'Exchange Angkor Shards for another Reliquary Chest pull!',
    itemIds: ['item_reliquary_key'],
  },
];

export const RELIQUARY_OPEN_DIAMOND_COST = 50;
export const RELIQUARY_OPEN_10_DIAMOND_COST = 450; // 10% discount on 10x pull
export const RELIQUARY_LEGENDARY_PITY = 30;
export const RELIQUARY_MYTHIC_PITY = 100;

export interface ReliquaryRollResult {
  reward: ReliquaryRewardEntry;
  tier: ReliquaryTier;
  nextPity30: number;
  nextPity100: number;
  wasPityTriggered: 'none' | 'legendary_30' | 'mythic_100';
}

/**
 * Rolls 1 Angkor Reliquary Chest with exact legal drop rates and dual pity guarantees:
 *  - Every 30 opens: guaranteed Legendary+ (Legendary / Mythic / Ancient)
 *  - Every 100 opens: guaranteed Mythic+ (Mythic / Ancient)
 */
export function rollSingleReliquary(
  currentPity30: number,
  currentPity100: number,
  rng: () => number = Math.random
): ReliquaryRollResult {
  const next30 = currentPity30 + 1;
  const next100 = currentPity100 + 1;

  let tier: ReliquaryTier;
  let wasPityTriggered: 'none' | 'legendary_30' | 'mythic_100' = 'none';

  if (next100 >= RELIQUARY_MYTHIC_PITY) {
    // 100-open Mythic+ Pity Guarantee (proportional 0.65 vs 0.15 -> ~81.25% Mythic / 18.75% Ancient)
    tier = rng() < 0.15 / (0.65 + 0.15) ? 'ancient' : 'mythic';
    wasPityTriggered = 'mythic_100';
  } else if (next30 >= RELIQUARY_LEGENDARY_PITY) {
    // 30-open Legendary+ Pity Guarantee
    const r = rng() * (4.2 + 0.65 + 0.15);
    if (r < 0.15) tier = 'ancient';
    else if (r < 0.8) tier = 'mythic';
    else tier = 'legendary';
    wasPityTriggered = 'legendary_30';
  } else {
    // Standard exact weighted roll summing cleanly to 100.00%
    const roll = rng() * 100;
    if (roll < 0.15) tier = 'ancient';
    else if (roll < 0.8) tier = 'mythic';
    else if (roll < 5.0) tier = 'legendary';
    else if (roll < 17.0) tier = 'epic';
    else if (roll < 45.0) tier = 'rare';
    else tier = 'common';
  }

  const candidates = RELIQUARY_POOL.filter((entry) => entry.tier === tier);
  const picked = candidates[Math.floor(rng() * candidates.length)] ?? RELIQUARY_POOL[0];

  const isLegendaryPlus = tier === 'legendary' || tier === 'mythic' || tier === 'ancient';
  const isMythicPlus = tier === 'mythic' || tier === 'ancient';

  return {
    reward: picked,
    tier,
    nextPity30: isLegendaryPlus ? 0 : next30,
    nextPity100: isMythicPlus ? 0 : next100,
    wasPityTriggered,
  };
}
