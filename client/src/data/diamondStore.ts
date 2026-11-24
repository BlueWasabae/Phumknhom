import type { PlayerState } from '@shared/types';

export interface DiamondPackDef {
  sku: 'pack_100' | 'pack_500' | 'pack_1200';
  name: string;
  diamonds: number;
  priceUsd: string;
  badge?: string;
  desc: string;
}

export interface DiamondShopItemDef {
  id: string;
  name: string;
  khmerName: string;
  category: 'cosmetic' | 'qol' | 'mount' | 'account';
  diamondCost: number;
  icon: string;
  badge: string;
  description: string;
  itemId?: string;
  itemIds?: string[];
  mountId?: string;
  bagSlotsBonus?: number;
}

export const DIAMOND_PACKS: DiamondPackDef[] = [
  {
    sku: 'pack_100',
    name: '100 Diamonds Pouch',
    diamonds: 100,
    priceUsd: '$0.99',
    desc: 'Starter crystal pouch for cosmetics or extra bag slots.',
  },
  {
    sku: 'pack_500',
    name: '500 Diamonds Chest',
    diamonds: 500,
    priceUsd: '$4.49',
    badge: 'POPULAR · +10% VALUE',
    desc: 'Great for Plaza mounts, QoL Auto-Loot pet, or Royal outfits.',
  },
  {
    sku: 'pack_1200',
    name: '1,200 Diamonds Royal Vault',
    diamonds: 1200,
    priceUsd: '$9.99',
    badge: 'BEST VALUE',
    desc: 'Unlock a full prestige fashion wardrobe & Plaza Tuk-Tuk.',
  },
];

export const MONTHLY_VILLAGE_PASS = {
  sku: 'monthly_village_pass' as const,
  name: 'Monthly Village Pass',
  khmerName: 'ប័ណ្ណភូមិប្រចាំខែ (VIP)',
  priceUsd: '$2.99 / mo',
  instantDiamonds: 300,
  durationDays: 30,
  perks: [
    'Instant 300 Diamonds upon activation',
    'VIP Golden Name Badge in Village Plaza & Chat',
    '+15% Farm XP on every crop, tree & livestock harvest',
    '+1 Free Daily Coin Lucky Wheel Spin (saves 1,500 Coins/day)',
  ],
};

/**
 * Fair, Non-Pay-to-Win Diamond Store Catalog (docs/GDD_CONTENT_AND_ECONOMY.md §6):
 * Strictly Prestige Cosmetics, Quality-of-Life Pets, Village-Only Mounts, and Bag Space.
 */
export const DIAMOND_SHOP_ITEMS: DiamondShopItemDef[] = [
  {
    id: 'shop_royal_angkor_set',
    name: 'Royal Golden Angkor Armor Set',
    khmerName: 'ឈុតគ្រឿងក្រោះមាសអង្គររាជវង្ស',
    category: 'cosmetic',
    diamondCost: 280,
    icon: '👑',
    badge: '3-Piece Prestige Set',
    description: 'Full Royal Golden Angkor Crown, Gilded Armor & Greaves (+300 Stylish, 0 combat stats).',
    itemId: 'shirt_royal_angkor',
    itemIds: ['hat_royal_angkor', 'shirt_royal_angkor', 'pants_royal_angkor'],
  },
  {
    id: 'shop_cyber_apsara',
    name: 'Cyber-Apsara Neon Set',
    khmerName: 'ឈុតអប្សរាអនាគតនីអុង',
    category: 'cosmetic',
    diamondCost: 300,
    icon: '✨',
    badge: '3-Piece Prestige Set',
    description: 'Neon-cyan & gold Cyber-Apsara Crown, Suit & Leggings (+295 Stylish, 0 combat stats).',
    itemId: 'shirt_cyber_apsara',
    itemIds: ['hat_cyber_apsara', 'shirt_cyber_apsara', 'pants_cyber_apsara'],
  },
  {
    id: 'shop_celestial_naga_set',
    name: 'Celestial Naga Sovereign Set',
    khmerName: 'ឈុតស្តេចនាគទេព',
    category: 'cosmetic',
    diamondCost: 360,
    icon: '🐉',
    badge: 'Mythic 3-Piece Set',
    description: 'Sovereign Naga Crown, Emerald Vestments & Sacred Back Halo (+385 Stylish, 0 combat stats).',
    itemId: 'shirt_celestial_naga',
    itemIds: ['hat_celestial_naga', 'shirt_celestial_naga', 'wings_celestial_naga'],
  },
  {
    id: 'shop_angel_demon_wings',
    name: 'Animated Angel/Demon Wings',
    khmerName: 'ស្លាបទេវតា និងយក្ស',
    category: 'cosmetic',
    diamondCost: 400,
    icon: '🪽',
    badge: 'Mythic Cosmetic',
    description: 'Radiant celestial & shadow dual wings (+145 Stylish, 0 combat stats).',
    itemId: 'wings_angel_demon',
  },
  {
    id: 'shop_auto_loot_kitten',
    name: 'Lucky White Kitten (Auto-Loot Pet)',
    khmerName: 'កូនឆ្មាសំណាងរើសរបស់អូតូ',
    category: 'qol',
    diamondCost: 220,
    icon: '🐱',
    badge: 'QoL Auto-Loot',
    description: 'Cute village companion that auto-collects Dungeon chests & treasure bags from extended range (0 extra damage).',
    itemId: 'pet_lucky_kitten',
  },
  {
    id: 'shop_mini_tuk_tuk',
    name: 'Mini Tuk-Tuk (Plaza Mount)',
    khmerName: 'រ៉ឺម៉កតុក្កតាភូមិ',
    category: 'mount',
    diamondCost: 350,
    icon: '🛺',
    badge: '+40% Village Speed',
    description: 'Cruises across Phum Village & Plaza at +40% speed (automatically parked outside Dungeon combat).',
    mountId: 'mount_mini_tuk_tuk',
  },
  {
    id: 'shop_extra_bag_slots',
    name: 'Extra Bag Slots (+12)',
    khmerName: 'បន្ថែមកាបូប +១២ ប្រអប់',
    category: 'account',
    diamondCost: 150,
    icon: '🎒',
    badge: 'Account QoL',
    description: 'Permanently expands your Container backpack capacity by +12 slots (stackable!).',
    bagSlotsBonus: 12,
  },
];

export function isVillagePassActive(player: PlayerState, now = Date.now()): boolean {
  return Boolean(player.villagePassUntil && player.villagePassUntil > now);
}

export function getTodayDateKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function hasFreeDailyCoinSpin(player: PlayerState, now = Date.now()): boolean {
  if (!isVillagePassActive(player, now)) return false;
  return player.dailyFreeCoinSpinDate !== getTodayDateKey(now);
}

export function purchaseDiamondShopItem(
  state: PlayerState,
  shopId: string
): { state: PlayerState; ok: boolean; message: string } {
  const def = DIAMOND_SHOP_ITEMS.find((i) => i.id === shopId);
  if (!def) {
    return { state, ok: false, message: 'Item not found in Diamond Store.' };
  }

  if (state.currencies.diamonds < def.diamondCost) {
    return {
      state,
      ok: false,
      message: `Need 💎 ${def.diamondCost} Diamonds (you have ${state.currencies.diamonds}).`,
    };
  }

  // Check duplicate ownership for non-stackables
  if (def.itemId && state.inventory.some((i) => i.itemId === def.itemId && i.quantity > 0)) {
    return { state, ok: false, message: `You already own ${def.name}! Equip it in Inventory.` };
  }
  if (def.mountId && (state.ownedMounts ?? []).includes(def.mountId)) {
    return { state, ok: false, message: `You already own ${def.name}! Toggle it anytime in the store.` };
  }

  const nextDiamonds = state.currencies.diamonds - def.diamondCost;
  const nextInv = state.inventory.map((i) => ({ ...i }));
  let nextMounts = [...(state.ownedMounts ?? [])];
  let nextActiveMount = state.activeMount ?? null;
  let nextBagSlots = state.extraBagSlots ?? 0;

  const grantIds = def.itemIds && def.itemIds.length > 0 ? def.itemIds : def.itemId ? [def.itemId] : [];
  if (grantIds.length > 0) {
    for (const id of grantIds) {
      if (!nextInv.some((i) => i.itemId === id && i.quantity > 0)) {
        nextInv.push({ itemId: id, quantity: 1, itemLevel: 1 });
      }
    }
  }
  if (def.mountId) {
    nextMounts.push(def.mountId);
    nextActiveMount = def.mountId;
  }
  if (def.bagSlotsBonus) {
    nextBagSlots += def.bagSlotsBonus;
  }

  return {
    state: {
      ...state,
      currencies: { ...state.currencies, diamonds: nextDiamonds },
      inventory: nextInv,
      ownedMounts: nextMounts,
      activeMount: nextActiveMount,
      extraBagSlots: nextBagSlots,
    },
    ok: true,
    message: `💎 Purchased ${def.name} (-${def.diamondCost} Diamonds)!`,
  };
}

export function togglePlazaMount(
  state: PlayerState,
  mountId: string
): { state: PlayerState; ok: boolean; message: string } {
  if (!(state.ownedMounts ?? []).includes(mountId)) {
    return { state, ok: false, message: 'You do not own this Plaza mount yet.' };
  }
  const nextActive = state.activeMount === mountId ? null : mountId;
  return {
    state: { ...state, activeMount: nextActive },
    ok: true,
    message: nextActive
      ? '🛺 Mounted Mini Tuk-Tuk (+40% Village/Plaza Speed)!'
      : '🛺 Parked Mini Tuk-Tuk (on foot).',
  };
}
