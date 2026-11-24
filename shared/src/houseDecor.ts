import type { BossId, PlacedHouseDecor, PlayerState } from './types';

export interface HouseFurnitureDef {
  id: string;
  name: string;
  khmerName: string;
  category: 'starter' | 'trophy';
  icon: string;
  primaryColor: string;
  accentColor: string;
  widthPx: number;
  heightPx: number;
  buyCoins?: number;
  requiredBossId?: BossId;
  requiredBossLabel?: string;
  restoresEnergy?: boolean;
  description: string;
}

export const HOUSE_FURNITURE_CATALOG: Record<string, HouseFurnitureDef> = {
  // ==================== 6 STARTER KHMER FURNITURE ITEMS ====================
  furn_reed_mat: {
    id: 'furn_reed_mat',
    name: 'Woven Reed Mat',
    khmerName: 'កន្ទេលកក់ខ្មែរ',
    category: 'starter',
    icon: '🧶',
    primaryColor: '#d97706',
    accentColor: '#dc2626',
    widthPx: 96,
    heightPx: 64,
    buyCoins: 140,
    description: 'Traditional handwoven crimson-bordered reed mat for cozy family tea gatherings.',
  },
  furn_teak_table: {
    id: 'furn_teak_table',
    name: 'Teak Low Table',
    khmerName: 'តុឈើបេងទាប',
    category: 'starter',
    icon: '🪑',
    primaryColor: '#78350f',
    accentColor: '#f59e0b',
    widthPx: 64,
    heightPx: 40,
    buyCoins: 220,
    description: 'Polished Cambodian teak low tea table with porcelain teacup set.',
  },
  furn_lotus_lamp: {
    id: 'furn_lotus_lamp',
    name: 'Pink Lotus Lamp',
    khmerName: 'ចង្កៀងផ្កាឈូក',
    category: 'starter',
    icon: '🪷',
    primaryColor: '#ec4899',
    accentColor: '#fde047',
    widthPx: 36,
    heightPx: 48,
    buyCoins: 260,
    description: 'Warm glowing carved pink lotus floor lantern that casts soft golden candlelight.',
  },
  furn_hammock: {
    id: 'furn_hammock',
    name: 'Indoor Hammock',
    khmerName: 'អង្រឹងផ្ទះខ្មែរ',
    category: 'starter',
    icon: '🛏️',
    primaryColor: '#0284c7',
    accentColor: '#fef3c7',
    widthPx: 96,
    heightPx: 46,
    buyCoins: 320,
    restoresEnergy: true,
    description: 'Breezy slung cotton hammock — click anytime to nap and restore 100% HP & Energy!',
  },
  furn_krama_tapestry: {
    id: 'furn_krama_tapestry',
    name: 'Krama Wall Tapestry',
    khmerName: 'ផ្ទាំងក្រមាព្យួរជញ្ជាំង',
    category: 'starter',
    icon: '🧣',
    primaryColor: '#dc2626',
    accentColor: '#ffffff',
    widthPx: 64,
    heightPx: 44,
    buyCoins: 240,
    description: 'Framed checkered red-and-white Khmer Krama silk tapestry hung with golden tassels.',
  },
  furn_banana_plant: {
    id: 'furn_banana_plant',
    name: 'Potted Banana Plant',
    khmerName: 'ដើមចេកក្នុងផើង',
    category: 'starter',
    icon: '🪴',
    primaryColor: '#16a34a',
    accentColor: '#b45309',
    widthPx: 40,
    heightPx: 54,
    buyCoins: 180,
    description: 'Lush tropical Cambodian banana plant thriving inside a hand-glazed clay pot.',
  },

  // ==================== 4 BOSS TROPHY PEDESTALS (BESTIARY UNLOCKS) ====================
  trophy_king_frog: {
    id: 'trophy_king_frog',
    name: 'King Frog Crown Pedestal',
    khmerName: 'ជើងទម្រមកុដស្តេចកង្កែប',
    category: 'trophy',
    icon: '👑',
    primaryColor: '#16a34a',
    accentColor: '#facc15',
    widthPx: 48,
    heightPx: 56,
    requiredBossId: 'sdech_kongkaeb',
    requiredBossLabel: 'Sdech Kongkaeb (King Frog)',
    description: 'Carved laterite trophy pedestal showcasing the gleaming royal crown of King Frog.',
  },
  trophy_yeak_thmor: {
    id: 'trophy_yeak_thmor',
    name: 'Yeak Thmor Club Rack',
    khmerName: 'ទម្រដំបងថ្មយក្ស',
    category: 'trophy',
    icon: '🪨',
    primaryColor: '#57534e',
    accentColor: '#f59e0b',
    widthPx: 56,
    heightPx: 56,
    requiredBossId: 'yeak_thmor',
    requiredBossLabel: 'Yeak Thmor (Stone Yaksha)',
    description: 'Reinforced sandstone weapon rack holding a miniature trophy replica of Yeak Thmor’s War Club.',
  },
  trophy_arp_spirit: {
    id: 'trophy_arp_spirit',
    name: 'Arp Spirit Lantern',
    khmerName: 'ចង្កៀងព្រលឹងអាប',
    category: 'trophy',
    icon: '🏮',
    primaryColor: '#10b981',
    accentColor: '#a7f3d0',
    widthPx: 44,
    heightPx: 56,
    requiredBossId: 'arp_prey_chrov',
    requiredBossLabel: 'Arp Prey Chrov (Forest Spirit)',
    description: 'Enchanted emerald lantern containing a tamed bioluminescent wisp from the Dark Bamboo Woods.',
  },
  trophy_neak_reach: {
    id: 'trophy_neak_reach',
    name: 'Neak Reach Scale Banner',
    khmerName: 'ទង់ស្រកានាគរាជ',
    category: 'trophy',
    icon: '🐉',
    primaryColor: '#7c3aed',
    accentColor: '#38bdf8',
    widthPx: 52,
    heightPx: 64,
    requiredBossId: 'neak_reach',
    requiredBossLabel: 'Neak Reach (Shadow Naga)',
    description: 'Shimmering ceremonial banner woven with iridescent Shadow Naga scales.',
  },
};

export const HOUSE_FURNITURE_LIST: HouseFurnitureDef[] = Object.values(HOUSE_FURNITURE_CATALOG);

export const DEFAULT_OWNED_FURNITURE: Record<string, number> = {
  furn_reed_mat: 2,
  furn_teak_table: 2,
  furn_lotus_lamp: 2,
  furn_hammock: 1,
  furn_krama_tapestry: 2,
  furn_banana_plant: 2,
};

export const DEFAULT_HOUSE_DECOR: PlacedHouseDecor[] = [
  { uid: 'starter_mat', itemId: 'furn_reed_mat', x: 400, y: 368, rotation: 0 },
  { uid: 'starter_table', itemId: 'furn_teak_table', x: 400, y: 348, rotation: 0 },
  { uid: 'starter_hammock', itemId: 'furn_hammock', x: 208, y: 248, rotation: 0 },
];

export function isBossTrophyUnlocked(state: PlayerState, def: HouseFurnitureDef): boolean {
  if (def.category !== 'trophy' || !def.requiredBossId) return true;
  if ((state.clearedBosses ?? []).includes(def.requiredBossId)) return true;
  return (state.bossDefeats?.[def.requiredBossId] ?? 0) > 0;
}

export function getOwnedFurnitureCount(state: PlayerState, itemId: string): number {
  const def = HOUSE_FURNITURE_CATALOG[itemId];
  if (!def) return 0;
  if (def.category === 'trophy') {
    return isBossTrophyUnlocked(state, def) ? 2 : 0;
  }
  const ownedMap = state.ownedFurniture ?? DEFAULT_OWNED_FURNITURE;
  return ownedMap[itemId] ?? DEFAULT_OWNED_FURNITURE[itemId] ?? 0;
}

export function getPlacedFurnitureCount(state: PlayerState, itemId: string): number {
  const decor = state.houseDecor ?? DEFAULT_HOUSE_DECOR;
  return decor.filter((d) => d.itemId === itemId).length;
}

export function buyHouseFurniture(
  state: PlayerState,
  itemId: string,
  discountPct = 0
): { state: PlayerState; ok: boolean; message: string } {
  const def = HOUSE_FURNITURE_CATALOG[itemId];
  if (!def || def.category !== 'starter' || !def.buyCoins) {
    return { state, ok: false, message: 'This item cannot be purchased with Coins.' };
  }
  const finalCost = Math.max(1, Math.round(def.buyCoins * (1 - discountPct)));
  if (state.currencies.coins < finalCost) {
    return { state, ok: false, message: `Need ${finalCost.toLocaleString()} Coins to buy ${def.name}.` };
  }
  const curOwned = { ...DEFAULT_OWNED_FURNITURE, ...(state.ownedFurniture ?? {}) };
  curOwned[itemId] = (curOwned[itemId] ?? 0) + 1;
  const nextCoins = state.currencies.coins - finalCost;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      ownedFurniture: curOwned,
    },
    ok: true,
    message: `🛋️ Purchased ${def.icon} ${def.name} (-${finalCost}c)! Place it inside your Khmer Stilt House!`,
  };
}
