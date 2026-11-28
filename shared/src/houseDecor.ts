import type { BossId, PlacedHouseDecor, PlacedYardDecor, PlayerState } from './types';

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
  furn_firefly_garden_lantern: {
    id: 'furn_firefly_garden_lantern',
    name: 'Firefly Garden Lantern',
    khmerName: 'ចង្កៀងអំពិលអំពែកពន្លឺយប់',
    category: 'starter',
    icon: '✨',
    primaryColor: '#84cc16',
    accentColor: '#fef08a',
    widthPx: 40,
    heightPx: 54,
    description:
      'Handcrafted glass-and-bamboo lantern housing live glowing fireflies caught during Firefly Night! (Craft from 3× Jarred Fireflies)',
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

// ==================== UPDATE 2.9: CUSTOM STILT HOUSE OUTDOOR GARDEN YARD ====================

export interface YardDecorDef {
  id: string;
  name: string;
  khmerName: string;
  tier: 'coins' | 'prestige';
  icon: string;
  primaryColor: string;
  accentColor: string;
  widthPx: number;
  heightPx: number;
  buyCoins?: number;
  buyDiamonds?: number;
  animatedKind?: 'koi_pond' | 'campfire' | 'lanterns' | 'spirit_tree' | 'naga_fountain';
  description: string;
}

export const YARD_DECOR_CATALOG: Record<string, YardDecorDef> = {
  yard_stone_lantern: {
    id: 'yard_stone_lantern',
    name: 'Stone Lantern',
    khmerName: 'ចង្កៀងថ្មភក់អង្គរ',
    tier: 'coins',
    icon: '🏮',
    primaryColor: '#78716c',
    accentColor: '#fde047',
    widthPx: 34,
    heightPx: 44,
    buyCoins: 140,
    animatedKind: 'lanterns',
    description: 'Carved Angkor sandstone garden lantern glowing warmly along your front path.',
  },
  yard_teak_bench: {
    id: 'yard_teak_bench',
    name: 'Carved Teak Bench',
    khmerName: 'កៅអីឈើបេងឆ្លាក់',
    tier: 'coins',
    icon: '🪑',
    primaryColor: '#78350f',
    accentColor: '#d97706',
    widthPx: 54,
    heightPx: 28,
    buyCoins: 180,
    description: 'Hand-carved Cambodian teak garden bench for resting beneath the sugar palms.',
  },
  yard_lotus_koi_pond: {
    id: 'yard_lotus_koi_pond',
    name: 'Lotus Koi Pond',
    khmerName: 'ស្រះផ្កាឈូកត្រីខយ',
    tier: 'coins',
    icon: '🪷',
    primaryColor: '#0284c7',
    accentColor: '#f472b6',
    widthPx: 74,
    heightPx: 50,
    buyCoins: 280,
    animatedKind: 'koi_pond',
    description: 'Tranquil sandstone-rimmed lotus pond with animated swimming golden koi and rippling water.',
  },
  yard_bamboo_archway: {
    id: 'yard_bamboo_archway',
    name: 'Bamboo Archway',
    khmerName: 'ខ្លោងទ្វារឫស្សី',
    tier: 'coins',
    icon: '🎍',
    primaryColor: '#15803d',
    accentColor: '#86efac',
    widthPx: 66,
    heightPx: 56,
    buyCoins: 240,
    description: 'Festive arched Khmer village bamboo gate draped with fresh green leaves.',
  },
  yard_paper_lanterns: {
    id: 'yard_paper_lanterns',
    name: 'Hanging Paper Lanterns',
    khmerName: 'គោមក្រដាសព្យួរសួន',
    tier: 'coins',
    icon: '🎐',
    primaryColor: '#ea580c',
    accentColor: '#fef08a',
    widthPx: 62,
    heightPx: 42,
    buyCoins: 210,
    animatedKind: 'lanterns',
    description: 'Swaying string of warm crimson-and-gold Khmer festival paper lanterns.',
  },
  yard_campfire_pit: {
    id: 'yard_campfire_pit',
    name: 'Campfire Pit',
    khmerName: 'ភ្លើងជំរុំសួនផ្ទះ',
    tier: 'coins',
    icon: '🔥',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    widthPx: 46,
    heightPx: 38,
    buyCoins: 220,
    animatedKind: 'campfire',
    description: 'Stone-ringed outdoor campfire pit crackling with cozy amber sparks at night.',
  },
  yard_blooming_spirit_tree: {
    id: 'yard_blooming_spirit_tree',
    name: 'Blooming Spirit Tree',
    khmerName: 'ដើមផ្កាព្រលឹងភ្លឺចែងចាំង',
    tier: 'prestige',
    icon: '🌸',
    primaryColor: '#ec4899',
    accentColor: '#fbcfe8',
    widthPx: 72,
    heightPx: 84,
    buyDiamonds: 140,
    animatedKind: 'spirit_tree',
    description: 'Enchanted luminous Khmer sakura-lotus spirit tree that continuously drops glowing pink petals!',
  },
  yard_golden_naga_fountain: {
    id: 'yard_golden_naga_fountain',
    name: 'Golden Naga Fountain',
    khmerName: 'ប្រភពទឹកនាគមាសអង្គរ',
    tier: 'prestige',
    icon: '🐉',
    primaryColor: '#f59e0b',
    accentColor: '#38bdf8',
    widthPx: 74,
    heightPx: 64,
    buyDiamonds: 180,
    animatedKind: 'naga_fountain',
    description: 'Majestic gilded Naga water fountain shooting animated turquoise water arcs with radiant WebGL Bloom!',
  },
  yard_firefly_garden_lantern: {
    id: 'yard_firefly_garden_lantern',
    name: 'Firefly Garden Lantern',
    khmerName: 'ចង្កៀងអំពិលអំពែកសួនផ្ទះ',
    tier: 'coins',
    icon: '✨',
    primaryColor: '#65a30d',
    accentColor: '#fef08a',
    widthPx: 38,
    heightPx: 48,
    animatedKind: 'lanterns',
    description:
      'Glowing emerald-gold firefly lantern crafted from 3× Jarred Fireflies — attracts orbiting firefly motes in your Stilt House Yard!',
  },
};

export const YARD_DECOR_LIST: YardDecorDef[] = Object.values(YARD_DECOR_CATALOG);

export const DEFAULT_OWNED_YARD_DECOR: Record<string, number> = {
  yard_stone_lantern: 2,
  yard_teak_bench: 1,
  yard_lotus_koi_pond: 1,
};

export const DEFAULT_YARD_DECOR: PlacedYardDecor[] = [
  { uid: 'starter_yard_lantern', itemId: 'yard_stone_lantern', x: 256, y: 176 },
];

export function getOwnedYardDecorCount(state: PlayerState, itemId: string): number {
  const map = state.ownedYardDecor ?? DEFAULT_OWNED_YARD_DECOR;
  return map[itemId] ?? DEFAULT_OWNED_YARD_DECOR[itemId] ?? 0;
}

export function getPlacedYardDecorCount(state: PlayerState, itemId: string): number {
  const list = state.yardDecor ?? DEFAULT_YARD_DECOR;
  return list.filter((d) => d.itemId === itemId).length;
}

export function buyYardDecorItem(
  state: PlayerState,
  itemId: string,
  discountPct = 0
): { state: PlayerState; ok: boolean; message: string } {
  const def = YARD_DECOR_CATALOG[itemId];
  if (!def) return { state, ok: false, message: 'Unknown garden yard item.' };
  const curOwned = { ...DEFAULT_OWNED_YARD_DECOR, ...(state.ownedYardDecor ?? {}) };

  if (def.tier === 'prestige' && def.buyDiamonds) {
    if (state.currencies.diamonds < def.buyDiamonds) {
      return {
        state,
        ok: false,
        message: `Need 💎 ${def.buyDiamonds} Diamonds for ${def.name}.`,
      };
    }
    curOwned[itemId] = (curOwned[itemId] ?? 0) + 1;
    return {
      state: {
        ...state,
        currencies: { ...state.currencies, diamonds: state.currencies.diamonds - def.buyDiamonds },
        ownedYardDecor: curOwned,
      },
      ok: true,
      message: `✨ Unlocked Prestige Yard Piece: ${def.icon} ${def.name} (-${def.buyDiamonds} 💎)!`,
    };
  }

  const finalCost = Math.max(1, Math.round((def.buyCoins ?? 150) * (1 - discountPct)));
  if (state.currencies.coins < finalCost) {
    return { state, ok: false, message: `Need ${finalCost.toLocaleString()} Coins for ${def.name}.` };
  }
  curOwned[itemId] = (curOwned[itemId] ?? 0) + 1;
  const nextCoins = state.currencies.coins - finalCost;
  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      ownedYardDecor: curOwned,
    },
    ok: true,
    message: `🌺 Purchased ${def.icon} ${def.name} (-${finalCost}c)! Place it in your Stilt House Yard!`,
  };
}

export const FIREFLY_LANTERN_CRAFT_COST = 3;

/**
 * Update 3.1 — Crafts glowing Firefly Garden Lanterns from Jarred Fireflies caught during Firefly Night.
 * Unlocks 1× Interior Firefly Garden Lantern + 1× Outdoor Yard Firefly Garden Lantern per craft!
 */
export function craftFireflyGardenLantern(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string } {
  const available = state.inventory
    .filter((i) => i.itemId === 'item_jarred_firefly' && i.quantity > 0)
    .reduce((sum, i) => sum + i.quantity, 0);

  if (available < FIREFLY_LANTERN_CRAFT_COST) {
    return {
      state,
      ok: false,
      message: `Need ${FIREFLY_LANTERN_CRAFT_COST}× Jarred Fireflies (you have ${available}). Catch glowing Fireflies in Green Park or Bamboo Forest during Firefly Night!`,
    };
  }

  let rem = FIREFLY_LANTERN_CRAFT_COST;
  const nextInv = state.inventory
    .map((slot) => {
      if (slot.itemId === 'item_jarred_firefly' && rem > 0) {
        const take = Math.min(slot.quantity, rem);
        rem -= take;
        return { ...slot, quantity: slot.quantity - take };
      }
      return { ...slot };
    })
    .filter((slot) => slot.quantity > 0);

  const curFurn = { ...DEFAULT_OWNED_FURNITURE, ...(state.ownedFurniture ?? {}) };
  curFurn.furn_firefly_garden_lantern = (curFurn.furn_firefly_garden_lantern ?? 0) + 1;

  const curYard = { ...DEFAULT_OWNED_YARD_DECOR, ...(state.ownedYardDecor ?? {}) };
  curYard.yard_firefly_garden_lantern = (curYard.yard_firefly_garden_lantern ?? 0) + 1;

  return {
    state: {
      ...state,
      inventory: nextInv,
      ownedFurniture: curFurn,
      ownedYardDecor: curYard,
    },
    ok: true,
    message:
      '✨ Crafted Firefly Garden Lantern (-3 Jarred Fireflies)! Added 1× Interior & 1× Outdoor Yard Lantern!',
  };
}
