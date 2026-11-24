/**
 * Update 1.4 — Dynamic World Events for ភូមិខ្ញុំ (Phum Khnhom)
 * 1. Crimson Eclipse (3 min): Deep crimson sky over wild_frontier + Shadow Spirit waves dropping Eclipse Shards.
 * 2. Golden Frog Rain (3 min): Bouncing golden mini-frogs in wild_frontier & green_park; 15 kills summon Golden Sdech Kongkaeb!
 * 3. Khmer Night Market (2 min): Glowing paper lanterns along market_street + Traveling Tuk-Tuk Merchant with 3 discounted rare offers.
 */

export type WorldEventId = 'crimson_eclipse' | 'golden_frog_rain' | 'khmer_night_market';

export interface WorldEventDef {
  id: WorldEventId;
  name: string;
  khmerName: string;
  icon: string;
  durationMs: number;
  targetMaps: Array<'central_plaza' | 'market_street' | 'temple_district' | 'green_park' | 'wild_frontier'>;
  accentColor: string;
  pillBgClass: string;
  bannerText: string;
  description: string;
}

export interface ActiveWorldEventSnapshot {
  eventId: WorldEventId;
  def: WorldEventDef;
  startedAt: number;
  endsAt: number;
  remainingMs: number;
  /** Progress counter (e.g., Golden Frogs defeated out of 15, or Shadow Spirits defeated) */
  progressCount: number;
  progressGoal: number;
  bossSummoned: boolean;
  bossDefeated: boolean;
  merchantRotationSeed: number;
}

export interface NightMarketOffer {
  id: string;
  itemId: string;
  name: string;
  khmerName: string;
  icon: string;
  quantity: number;
  originalCoins: number;
  discountCoins: number;
  discountPct: number;
  rarity: 'rare' | 'epic' | 'legendary';
  description: string;
}

export const WORLD_EVENTS: Record<WorldEventId, WorldEventDef> = {
  crimson_eclipse: {
    id: 'crimson_eclipse',
    name: 'Crimson Eclipse',
    khmerName: 'សូរ្យគ្រាសឈាម',
    icon: '🌑',
    durationMs: 180_000, // 3 minutes
    targetMaps: ['wild_frontier'],
    accentColor: '#dc2626',
    pillBgClass: 'bg-rose-800 hover:bg-rose-700 text-rose-50 border-rose-950',
    bannerText:
      '🌑 CRIMSON ECLIPSE has fallen over Wild Frontier! Defeat Shadow Spirit waves for Eclipse Shards to empower Khmer weapons!',
    description:
      'A crimson sky descends over Wild Frontier for 3 minutes, spawning Shadow Spirit waves that drop Eclipse Shards for Blacksmith weapon empowerment.',
  },
  golden_frog_rain: {
    id: 'golden_frog_rain',
    name: 'Golden Frog Rain',
    khmerName: 'ភ្លៀងកង្កែបមាស',
    icon: '🐸',
    durationMs: 180_000, // 3 minutes
    targetMaps: ['wild_frontier', 'green_park'],
    accentColor: '#eab308',
    pillBgClass: 'bg-amber-500 hover:bg-amber-400 text-amber-950 border-amber-950',
    bannerText:
      '🐸 GOLDEN FROG RAIN! Bouncing golden mini-frogs are falling across Wild Frontier & Green Park — defeat 15 to summon Golden Sdech Kongkaeb!',
    description:
      'Golden mini-frogs rain across Wild Frontier & Green Park for 3 minutes. Defeating 15 summons an empowered Golden Sdech Kongkaeb for Coins, Gold & the rare Rain-Caller Umbrella!',
  },
  khmer_night_market: {
    id: 'khmer_night_market',
    name: 'Khmer Night Market',
    khmerName: 'ផ្សាររាត្រីខ្មែរ',
    icon: '🏮',
    durationMs: 120_000, // 2 minutes
    targetMaps: ['market_street'],
    accentColor: '#f97316',
    pillBgClass: 'bg-orange-600 hover:bg-orange-500 text-amber-50 border-orange-950',
    bannerText:
      '🏮 KHMER NIGHT MARKET is LIVE on Market Street! Paper lanterns are lit & the Traveling Tuk-Tuk Merchant is offering 3 rare discounted items!',
    description:
      'Glowing paper lanterns illuminate Market Street for 2 minutes while the Traveling Tuk-Tuk Merchant parks with 3 rotating rare items at 30–40% off.',
  },
};

export const WORLD_EVENT_LIST: WorldEventDef[] = [
  WORLD_EVENTS.crimson_eclipse,
  WORLD_EVENTS.golden_frog_rain,
  WORLD_EVENTS.khmer_night_market,
];

export const NIGHT_MARKET_POOL: NightMarketOffer[] = [
  {
    id: 'nm_reforge_bundle',
    itemId: 'mat_reforge_stone',
    name: 'Reforge Stone Pouch (×3)',
    khmerName: 'ថ្មលត់ដែកកម្រ (×៣)',
    icon: '💎',
    quantity: 3,
    originalCoins: 450,
    discountCoins: 280,
    discountPct: 38,
    rarity: 'rare',
    description: 'Three gleaming laterite Reforge Stones for Master Somnang Blacksmith.',
  },
  {
    id: 'nm_pink_lotus_seeds',
    itemId: 'seed_pink_lotus',
    name: 'Exotic Pink Lotus Seeds (×2)',
    khmerName: 'គ្រាប់ផ្កាឈូកទេព (×២)',
    icon: '🪷',
    quantity: 2,
    originalCoins: 600,
    discountCoins: 360,
    discountPct: 40,
    rarity: 'epic',
    description: 'Rare sacred lotus seeds prized for Museum displays and Spirit Elixirs.',
  },
  {
    id: 'nm_eclipse_shard',
    itemId: 'mat_eclipse_shard',
    name: 'Eclipse Shard (×2)',
    khmerName: 'បំណែកសូរ្យគ្រាស (×២)',
    icon: '🌑',
    quantity: 2,
    originalCoins: 520,
    discountCoins: 340,
    discountPct: 35,
    rarity: 'epic',
    description: 'Crystallized crimson eclipse energy used to empower Khmer weapons at the Blacksmith.',
  },
  {
    id: 'nm_night_lantern_hat',
    itemId: 'hat_night_market_lantern',
    name: 'Night Market Lantern Hat',
    khmerName: 'មួកចង្កៀងផ្សាររាត្រី',
    icon: '🏮',
    quantity: 1,
    originalCoins: 680,
    discountCoins: 420,
    discountPct: 38,
    rarity: 'epic',
    description: 'Limited Khmer Night Market festive lantern headpiece (+68 Stylish).',
  },
  {
    id: 'nm_rain_umbrella',
    itemId: 'wings_rain_caller_umbrella',
    name: 'Rain-Caller Silk Umbrella',
    khmerName: 'ឆ័ត្រសូត្រហៅភ្លៀង',
    icon: '☂️',
    quantity: 1,
    originalCoins: 950,
    discountCoins: 590,
    discountPct: 38,
    rarity: 'legendary',
    description: 'Ornate royal Cambodian oiled-silk back umbrella radiating monsoon fortune (+96 Stylish).',
  },
  {
    id: 'nm_golden_durian_curio',
    itemId: 'fruit_golden_durian',
    name: 'Fresh Kampot Golden Durian',
    khmerName: 'ធុរេនមាសកំពត',
    icon: '🍈',
    quantity: 1,
    originalCoins: 750,
    discountCoins: 460,
    discountPct: 39,
    rarity: 'legendary',
    description: 'Aromatic Golden Durian coveted for Museum donations and Shimmer rituals.',
  },
];

export function getRotatingNightMarketOffers(rotationSeed: number): NightMarketOffer[] {
  const pool = NIGHT_MARKET_POOL;
  const start = Math.abs(Math.floor(rotationSeed)) % pool.length;
  return [
    pool[start % pool.length],
    pool[(start + 2) % pool.length],
    pool[(start + 4) % pool.length],
  ];
}
