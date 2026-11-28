import type { KhmerEmoteId, PlayerState, WeaponAuraId } from '@shared/types';
import {
  RELIQUARY_OPEN_10_DIAMOND_COST,
  RELIQUARY_OPEN_DIAMOND_COST,
  RELIQUARY_TIERS,
  SHARD_EXCHANGE_OFFERS,
  rollSingleReliquary,
  type ReliquaryRewardEntry,
  type ReliquaryTier,
} from '@shared/reliquaryPool';

export type PaymentSkuId =
  | 'welcome_bundle'
  | 'pack_60'
  | 'pack_320'
  | 'pack_700'
  | 'pack_1600'
  | 'vip_pass_30d'
  | 'pack_100'
  | 'pack_500'
  | 'pack_1200'
  | 'monthly_village_pass';

export interface DiamondPackDef {
  sku: 'pack_60' | 'pack_320' | 'pack_700' | 'pack_1600';
  name: string;
  diamonds: number;
  priceUsd: string;
  priceNum: number;
  badge?: string;
  desc: string;
}

export interface DiamondShopItemDef {
  id: string;
  name: string;
  khmerName: string;
  category: 'wings' | 'pet' | 'cosmetic' | 'salon' | 'mount' | 'account';
  diamondCost: number;
  icon: string;
  badge: string;
  description: string;
  itemId?: string;
  itemIds?: string[];
  mountId?: string;
  bagSlotsBonus?: number;
  instrumentSkinId?: 'golden_angkor' | 'celestial_apsara';
  yardDecorId?: string;
  emoteId?: KhmerEmoteId;
}

export const PHUM_WELCOME_BUNDLE = {
  sku: 'welcome_bundle' as const,
  name: 'Phum Welcome Bundle',
  khmerName: 'កញ្ចប់ស្វាគមន៍ភូមិខ្ញុំ (ម្ដងគត់)',
  priceUsd: '$1.99',
  priceNum: 1.99,
  diamonds: 120,
  oneTimeOnly: true,
  badge: 'ONE-TIME ONLY · 5× VALUE',
  contents: [
    { icon: '💎', label: '120 Diamonds' },
    { icon: '🧣', label: 'Golden Krama Cape (Cosmetic)' },
    { icon: '🐶', label: 'Mini Village Puppy Pet (4-Frame PNG)' },
    { icon: '🪨', label: '3× Reforge Stones' },
  ],
  bonusItems: [
    { itemId: 'wings_golden_krama_cape', quantity: 1 },
    { itemId: 'pet_village_puppy', quantity: 1 },
    { itemId: 'mat_reforge_stone', quantity: 3 },
  ],
};

export const DIAMOND_PACKS: DiamondPackDef[] = [
  {
    sku: 'pack_60',
    name: '60 Diamonds Pouch',
    diamonds: 60,
    priceUsd: '$0.99',
    priceNum: 0.99,
    desc: 'Quick starter crystal pouch for Reliquary keys or Salon styles.',
  },
  {
    sku: 'pack_320',
    name: '320 Diamonds Chest',
    diamonds: 320,
    priceUsd: '$4.99',
    priceNum: 4.99,
    badge: 'POPULAR',
    desc: 'Perfect for animated 4-frame Pets, VIP Pass, or Prestige Sets.',
  },
  {
    sku: 'pack_700',
    name: '700 Diamonds Angkor Vault',
    diamonds: 700,
    priceUsd: '$9.99',
    priceNum: 9.99,
    badge: '+16% BONUS',
    desc: 'Unlock animated 6-Wing Seraph Wings, Auto-Loot Naga, or 10× Reliquary.',
  },
  {
    sku: 'pack_1600',
    name: '1,600 Diamonds Sovereign Treasury',
    diamonds: 1600,
    priceUsd: '$19.99',
    priceNum: 19.99,
    badge: 'BEST VALUE',
    desc: 'Royal treasury bundle for a complete Angkor fashion & pet collection.',
  },
];

export const MONTHLY_VILLAGE_PASS = {
  sku: 'vip_pass_30d' as const,
  name: 'VIP Convenience Pass',
  khmerName: 'ប័ណ្ណ VIP ងាយស្រួលប្រចាំខែ (គ្មាន P2W)',
  priceUsd: '$4.99 / 30 Days',
  priceNum: 4.99,
  diamondPrice: 350,
  instantDiamonds: 0,
  durationDays: 30,
  perks: [
    {
      icon: '🌾',
      title: '+6 Extra Farm Plots',
      desc: 'Unlocks Row 5 golden VIP plots (30 total plots) in your Stilt Homestead Farm!',
    },
    {
      icon: '🏪',
      title: '0% Village Market Tax',
      desc: 'Waives the 5% Village Market coin tax — keep 100% of every player trade payout!',
    },
    {
      icon: '🏦',
      title: 'Portable Bank Vault',
      desc: 'Instant Vault button right on your top HUD to deposit/withdraw coins anywhere!',
    },
    {
      icon: '👑',
      title: 'Golden [VIP] Chat Badge + 1 Free Daily Reliquary Key',
      desc: 'Shining [VIP] chat tag + claim 1 free Angkor Reliquary Key every single day!',
    },
  ],
};

/**
 * Fair, Zero Pay-to-Win Diamond Store Catalog:
 * Strictly Animated 4-Frame PNG Wings, Auto-Loot Pets, Prestige Sets, Luxury Salon, Plaza Mounts & Bag Space.
 */
export const DIAMOND_SHOP_ITEMS: DiamondShopItemDef[] = [
  // ---- ANIMATED 4-FRAME PNG WINGS ----
  {
    id: 'shop_solar_angkor_seraph_wings',
    name: 'Solar Angkor Seraph Wings',
    khmerName: 'ស្លាបទេវតាព្រះអាទិត្យប្រាំមួយ',
    category: 'wings',
    diamondCost: 480,
    icon: '☀️',
    badge: '6-Wing Ancient Bloom',
    description:
      'Majestic 6-wing animated golden seraphim spread with radiant Angkor sunburst aura (+220 Stylish, 0 combat stats).',
    itemId: 'wings_solar_angkor_seraph',
  },
  {
    id: 'shop_void_phantom_butterfly_wings',
    name: 'Void Phantom Butterfly Wings',
    khmerName: 'ស្លាបមេអំបៅស្រមោលអវកាស',
    category: 'wings',
    diamondCost: 420,
    icon: '🦋',
    badge: '4-Frame Animated Bloom',
    description:
      'Iridescent violet & cyan star-eyed phantom butterfly wings with fluttering glow (+195 Stylish, 0 combat stats).',
    itemId: 'wings_void_phantom_butterfly',
  },
  {
    id: 'shop_celestial_naga_dragon_wings',
    name: 'Celestial Naga Dragon Wings',
    khmerName: 'ស្លាបនាគរាជទេវតា (4-Frame PNG)',
    category: 'wings',
    diamondCost: 380,
    icon: '🐉',
    badge: '4-Frame Animated Bloom',
    description:
      'High-detail 4-frame animated emerald & gold Naga dragon wings with WebGL Bloom (+185 Stylish, 0 combat stats).',
    itemId: 'wings_celestial_naga_dragon',
  },
  {
    id: 'shop_angel_demon_wings',
    name: 'Animated Angel/Demon Wings',
    khmerName: 'ស្លាបទេវតា និងយក្ស',
    category: 'wings',
    diamondCost: 340,
    icon: '🪽',
    badge: 'Mythic Cosmetic',
    description: 'Radiant celestial & shadow dual wings (+145 Stylish, 0 combat stats).',
    itemId: 'wings_angel_demon',
  },
  // ---- UPDATE 2.9: ORNATE INSTRUMENT SKINS & PRESTIGE YARD DECOR ----
  {
    id: 'shop_skin_golden_angkor_inst',
    name: 'Ornate Golden Angkor Instrument Skin',
    khmerName: 'ស្បែកឧបករណ៍ភ្លេងមាសអង្គរ',
    category: 'cosmetic',
    diamondCost: 120,
    icon: '🎹',
    badge: 'Golden Bloom Notes',
    description:
      'Gilds all 5 playable Khmer instruments with Angkor gold trim and radiant blooming golden musical notes (0 combat stats).',
    instrumentSkinId: 'golden_angkor',
  },
  {
    id: 'shop_skin_celestial_apsara_inst',
    name: 'Celestial Apsara Instrument Skin',
    khmerName: 'ស្បែកឧបករណ៍ភ្លេងអប្សរាទេវតា',
    category: 'cosmetic',
    diamondCost: 160,
    icon: '🎶',
    badge: 'Celestial Bloom Notes',
    description:
      'Enchants all 5 playable Khmer instruments with cyan-gold Celestial Apsara WebGL Bloom musical note trails.',
    instrumentSkinId: 'celestial_apsara',
  },
  {
    id: 'shop_yard_blooming_spirit_tree',
    name: 'Blooming Spirit Tree (Yard Decor)',
    khmerName: 'ដើមផ្កាព្រលឹងសួនផ្ទះ',
    category: 'cosmetic',
    diamondCost: 140,
    icon: '🌸',
    badge: 'Animated Yard Piece',
    description:
      'Luxury Stilt House Front Yard tree that continuously drops glowing pink spirit petals visible to visiting friends!',
    yardDecorId: 'yard_blooming_spirit_tree',
  },
  {
    id: 'shop_yard_golden_naga_fountain',
    name: 'Golden Naga Fountain (Yard Decor)',
    khmerName: 'ប្រភពទឹកនាគមាសសួនផ្ទះ',
    category: 'cosmetic',
    diamondCost: 180,
    icon: '🐉',
    badge: 'WebGL Bloom Fountain',
    description:
      'Grand gilded Angkor Naga garden fountain shooting animated turquoise water arcs with WebGL Bloom!',
    yardDecorId: 'yard_golden_naga_fountain',
  },
  // ---- UPDATE 3.1: PRESTIGE ANIMATED KHMER EMOTES ----
  {
    id: 'shop_emote_naga_spirit_roar',
    name: 'Naga Spirit Roar (Animated Emote)',
    khmerName: 'សម្រែកនាគទេព (កាយវិការពិសេស)',
    category: 'cosmetic',
    diamondCost: 120,
    icon: '🐉',
    badge: 'Prestige Animated Emote',
    description:
      'Unlocks the Naga Spirit Roar emote on your [Z] Radial Emote Wheel — unleashes an emerald-gold Naga shockwave aura synced across the Plaza! (Also in Royal Season Pass Tier 6)',
    emoteId: 'naga_spirit_roar',
  },
  {
    id: 'shop_emote_golden_rain_dance',
    name: 'Golden Rain Dance (Animated Emote)',
    khmerName: 'របាំភ្លៀងមាសអង្គរ (កាយវិការពិសេស)',
    category: 'cosmetic',
    diamondCost: 150,
    icon: '✨',
    badge: 'Prestige Looping Dance',
    description:
      'Unlocks the looping Golden Rain Dance on your [Z] Radial Emote Wheel — summons shimmering golden Angkor lotus petals while dancing! (Also in Royal Season Pass Tier 14)',
    emoteId: 'golden_rain_dance',
  },
  // ---- ANIMATED 4-FRAME AUTO-LOOT & COMPANION PETS ----
  {
    id: 'shop_mini_golden_naga_pet',
    name: 'Mini Golden Naga (Auto-Loot Pet)',
    khmerName: 'កូននាគមាសរើសកាក់អូតូ',
    category: 'pet',
    diamondCost: 340,
    icon: '🐲',
    badge: '4-Frame QoL Auto-Collect',
    description:
      'Animated coiling Golden Naga that floats beside you & auto-collects nearby loot/coins (0 combat damage).',
    itemId: 'pet_mini_golden_naga',
  },
  {
    id: 'shop_celestial_lotus_kitsune_pet',
    name: 'Celestial Lotus Kitsune Pet',
    khmerName: 'កញ្ជ្រោងផ្កាឈូកកន្ទុយបី',
    category: 'pet',
    diamondCost: 290,
    icon: '🦊',
    badge: '4-Frame Animated Pet',
    description:
      'Snow-white 3-tailed mystical lotus fox companion (+145 Stylish, 0 combat damage).',
    itemId: 'pet_celestial_lotus_kitsune',
  },
  {
    id: 'shop_baby_angkor_singha_pet',
    name: 'Baby Angkor Lion (Singha) Pet',
    khmerName: 'កូនតោសិង្ហអង្គរ',
    category: 'pet',
    diamondCost: 290,
    icon: '🦁',
    badge: '4-Frame Animated Pet',
    description:
      'Proud golden-and-crimson royal Singha temple guardian cub (+150 Stylish, 0 combat damage).',
    itemId: 'pet_baby_angkor_singha',
  },
  {
    id: 'shop_auto_loot_kitten',
    name: 'Lucky White Kitten (Auto-Loot Pet)',
    khmerName: 'កូនឆ្មាសំណាងរើសរបស់អូតូ',
    category: 'pet',
    diamondCost: 220,
    icon: '🐱',
    badge: 'QoL Auto-Loot',
    description:
      'Cute village companion that auto-collects Dungeon chests & treasure bags from extended range (0 extra damage).',
    itemId: 'pet_lucky_kitten',
  },
  // ---- PRESTIGE SETS & LUXURY SALON ----
  {
    id: 'shop_celestial_naga_set',
    name: 'Celestial Naga Sovereign Set',
    khmerName: 'ឈុតស្តេចនាគទេព',
    category: 'cosmetic',
    diamondCost: 360,
    icon: '👑',
    badge: 'Mythic 3-Piece Set',
    description:
      'Sovereign Naga Crown, Emerald Vestments & Sacred Back Halo (+385 Stylish, 0 combat stats).',
    itemId: 'shirt_celestial_naga',
    itemIds: ['hat_celestial_naga', 'shirt_celestial_naga', 'wings_celestial_naga'],
  },
  {
    id: 'shop_royal_angkor_set',
    name: 'Royal Golden Angkor Armor Set',
    khmerName: 'ឈុតគ្រឿងក្រោះមាសអង្គររាជវង្ស',
    category: 'cosmetic',
    diamondCost: 280,
    icon: '🛡️',
    badge: '3-Piece Prestige Set',
    description:
      'Full Royal Golden Angkor Crown, Gilded Armor & Greaves (+300 Stylish, 0 combat stats).',
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
    description:
      'Neon-cyan & gold Cyber-Apsara Crown, Suit & Leggings (+295 Stylish, 0 combat stats).',
    itemId: 'shirt_cyber_apsara',
    itemIds: ['hat_cyber_apsara', 'shirt_cyber_apsara', 'pants_cyber_apsara'],
  },
  {
    id: 'shop_luxury_salon_eyes',
    name: 'Mystic Heterochromia & Sacred Third-Eye',
    khmerName: 'ភ្នែកពីរពណ៌ និងត្បូងភ្នែកទីបី',
    category: 'salon',
    diamondCost: 160,
    icon: '👁️',
    badge: 'Luxury Salon Pack',
    description:
      'Unlocks Mystic Heterochromia Eyes, Lightning Eyes Aura & Sacred Third-Eye Gem in Magic Mirror!',
    itemId: 'salon_heterochromia_eyes',
    itemIds: ['salon_heterochromia_eyes', 'salon_lightning_eyes', 'salon_sacred_third_eye'],
  },
  {
    id: 'shop_luxury_salon_hair',
    name: 'Royal Apsara Hair & Lotus Petals Pack',
    khmerName: 'ម៉ូតសក់អប្សរា និងស្រទាប់ផ្កាឈូក',
    category: 'salon',
    diamondCost: 140,
    icon: '🪷',
    badge: 'Luxury Salon Pack',
    description:
      'Unlocks Royal Braided Crown Hair, Flowing Apsara Waves & Floating Lotus Petals face aura!',
    itemId: 'hair_royal_braided_crown',
    itemIds: ['hair_royal_braided_crown', 'hair_flowing_apsara_waves', 'salon_floating_lotus_petals'],
  },
  // ---- POPULAR GAMING-HISTORY MOUNTS & ACCOUNT QoL ----
  {
    id: 'shop_mount_golden_cloud',
    name: 'Golden Naga Cloud (2-Seat Nimbus)',
    khmerName: 'ពពកនាគមាសទេវតា (២កៅអី)',
    category: 'mount',
    diamondCost: 260,
    icon: '☁️',
    badge: '2-Seat Flying Nimbus',
    description:
      'Iconic floating golden cloud mount (+60% Village Speed, glowing golden mist & friends can Hop On for Co-op Delivery runs!).',
    mountId: 'mount_golden_cloud',
  },
  {
    id: 'shop_mount_shadow_singha',
    name: 'Shadow Singha Lion (MMO Dire Mount)',
    khmerName: 'សិង្ហស្រមោលអង្គរ',
    category: 'mount',
    diamondCost: 280,
    icon: '🦁',
    badge: 'Armored Dire Lion',
    description:
      'Classic MMO armored lion mount with glowing violet mane & golden saddle (+58% Village Speed, 0 combat P2W).',
    mountId: 'mount_shadow_singha',
  },
  {
    id: 'shop_mount_celestial_garuda',
    name: 'Celestial Garuda Strider (RPG Bird)',
    khmerName: 'គ្រុឌមាសទេវតា',
    category: 'mount',
    diamondCost: 310,
    icon: '🦅',
    badge: 'Chocobo / Phoenix Bird',
    description:
      'Swift golden-feathered Khmer Garuda strider bird leaving fiery plumage trails (+62% Village Speed, 0 combat P2W).',
    mountId: 'mount_celestial_garuda',
  },
  {
    id: 'shop_mount_spirit_dragon',
    name: 'Emerald Mekong Dragon (2-Seat Dragon)',
    khmerName: 'នាគព្រលឹងមេគង្គ (២កៅអី)',
    category: 'mount',
    diamondCost: 380,
    icon: '🐉',
    badge: '2-Seat Eastern Dragon',
    description:
      'Legendary floating emerald Mekong spirit dragon with golden spines (+65% Village Speed & carries a Co-op passenger!).',
    mountId: 'mount_spirit_dragon',
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

export function hasFreeDailyReliquaryKey(player: PlayerState, now = Date.now()): boolean {
  if (!isVillagePassActive(player, now)) return false;
  return player.lastDailyReliquaryKeyDate !== getTodayDateKey(now);
}

export function hasFirstTimeBonusForPack(player: PlayerState, sku: string): boolean {
  return !(player.purchasedDiamondPacks ?? []).includes(sku);
}

function addItemsToInventory(
  inv: PlayerState['inventory'],
  grants: Array<{ itemId: string; quantity: number }>
): PlayerState['inventory'] {
  const next = inv.map((i) => ({ ...i }));
  for (const grant of grants) {
    const existing = next.find((i) => i.itemId === grant.itemId && (i.quality ?? 'normal') === 'normal');
    if (existing) {
      existing.quantity += grant.quantity;
    } else {
      next.push({ itemId: grant.itemId, quantity: grant.quantity, itemLevel: 1, quality: 'normal' });
    }
  }
  return next;
}

/**
 * Applies a real-money or sandbox SKU fulfillment cleanly to local PlayerState
 * (handles Welcome Bundle 1-time rewards, First-Time 2x Diamond Pack bonuses, and 30-day VIP Pass).
 */
export function applyRealMoneySkuPurchase(
  state: PlayerState,
  sku: string,
  serverOverride?: {
    diamondsGranted?: number;
    villagePassUntil?: number | null;
    firstTimeDoubled?: boolean;
  }
): { state: PlayerState; ok: boolean; message: string } {
  const now = Date.now();
  const nextPacks = new Set(state.purchasedDiamondPacks ?? []);

  if (sku === 'welcome_bundle') {
    if (state.welcomeBundleClaimed) {
      return { state, ok: false, message: 'Phum Welcome Bundle can only be claimed once per account!' };
    }
    const diamondsGain = serverOverride?.diamondsGranted ?? PHUM_WELCOME_BUNDLE.diamonds;
    const nextInv = addItemsToInventory(state.inventory, PHUM_WELCOME_BUNDLE.bonusItems);
    return {
      state: {
        ...state,
        currencies: {
          ...state.currencies,
          diamonds: state.currencies.diamonds + diamondsGain,
        },
        inventory: nextInv,
        welcomeBundleClaimed: true,
      },
      ok: true,
      message: `🎁 Welcome Bundle Unlocked! +${diamondsGain} 💎, Golden Krama Cape, Village Puppy Pet & 3× Reforge Stones!`,
    };
  }

  if (sku === 'vip_pass_30d' || sku === 'monthly_village_pass') {
    const baseUntil = state.villagePassUntil && state.villagePassUntil > now ? state.villagePassUntil : now;
    const nextUntil =
      serverOverride?.villagePassUntil && serverOverride.villagePassUntil > baseUntil
        ? serverOverride.villagePassUntil
        : baseUntil + MONTHLY_VILLAGE_PASS.durationDays * 24 * 60 * 60 * 1000;
    const bonusDiamonds =
      typeof serverOverride?.diamondsGranted === 'number'
        ? serverOverride.diamondsGranted
        : sku === 'monthly_village_pass'
        ? 300
        : 0;
    // Also grant 1 immediate welcome Reliquary Key upon activating VIP if not claimed today
    const today = getTodayDateKey(now);
    const shouldGrantTodayKey = state.lastDailyReliquaryKeyDate !== today;
    return {
      state: {
        ...state,
        currencies: {
          ...state.currencies,
          diamonds: state.currencies.diamonds + bonusDiamonds,
        },
        villagePassUntil: nextUntil,
        reliquaryKeys: (state.reliquaryKeys ?? 0) + (shouldGrantTodayKey ? 1 : 0),
        lastDailyReliquaryKeyDate: shouldGrantTodayKey ? today : state.lastDailyReliquaryKeyDate ?? null,
      },
      ok: true,
      message: `👑 VIP Convenience Pass Active (30 Days)! +6 Farm Plots, 0% Market Tax, Portable Bank Vault${
        shouldGrantTodayKey ? ' & +1 Free Daily Reliquary Key 🗝️!' : '!'
      }`,
    };
  }

  const packDef = DIAMOND_PACKS.find((p) => p.sku === sku);
  if (packDef) {
    const isFirstTime = !nextPacks.has(packDef.sku);
    const doubled = serverOverride?.firstTimeDoubled ?? isFirstTime;
    const gain =
      typeof serverOverride?.diamondsGranted === 'number' && serverOverride.diamondsGranted > 0
        ? serverOverride.diamondsGranted
        : doubled
        ? packDef.diamonds * 2
        : packDef.diamonds;
    nextPacks.add(packDef.sku);
    return {
      state: {
        ...state,
        currencies: {
          ...state.currencies,
          diamonds: state.currencies.diamonds + gain,
        },
        purchasedDiamondPacks: Array.from(nextPacks),
      },
      ok: true,
      message: doubled
        ? `💎 FIRST-TIME 2× BONUS! Received +${gain.toLocaleString()} Diamonds (${packDef.name})!`
        : `💎 Received +${gain.toLocaleString()} Diamonds (${packDef.name})!`,
    };
  }

  // Legacy SKU fallback
  const legacyMap: Record<string, number> = { pack_100: 100, pack_500: 500, pack_1200: 1200 };
  const legacyGain = serverOverride?.diamondsGranted ?? legacyMap[sku] ?? 0;
  if (legacyGain > 0) {
    return {
      state: {
        ...state,
        currencies: { ...state.currencies, diamonds: state.currencies.diamonds + legacyGain },
      },
      ok: true,
      message: `💎 Received +${legacyGain.toLocaleString()} Diamonds!`,
    };
  }

  return { state, ok: false, message: `Unknown store SKU: ${sku}` };
}

export function purchaseVipPassWithDiamonds(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string } {
  const cost = MONTHLY_VILLAGE_PASS.diamondPrice;
  if (state.currencies.diamonds < cost) {
    return {
      state,
      ok: false,
      message: `Need 💎 ${cost} Diamonds for 30-Day VIP Pass (you have ${state.currencies.diamonds}).`,
    };
  }
  const now = Date.now();
  const baseUntil = state.villagePassUntil && state.villagePassUntil > now ? state.villagePassUntil : now;
  const nextUntil = baseUntil + MONTHLY_VILLAGE_PASS.durationDays * 24 * 60 * 60 * 1000;
  const today = getTodayDateKey(now);
  const grantKey = state.lastDailyReliquaryKeyDate !== today;

  return {
    state: {
      ...state,
      currencies: {
        ...state.currencies,
        diamonds: state.currencies.diamonds - cost,
      },
      villagePassUntil: nextUntil,
      reliquaryKeys: (state.reliquaryKeys ?? 0) + (grantKey ? 1 : 0),
      lastDailyReliquaryKeyDate: grantKey ? today : state.lastDailyReliquaryKeyDate ?? null,
    },
    ok: true,
    message: `👑 Activated 30-Day VIP Convenience Pass (-${cost} 💎)! Portable Vault, 0% Market Tax & +6 Farm Plots unlocked!`,
  };
}

export function claimDailyVipReliquaryKey(
  state: PlayerState,
  now = Date.now()
): { state: PlayerState; ok: boolean; message: string } {
  if (!isVillagePassActive(state, now)) {
    return { state, ok: false, message: 'Activate VIP Convenience Pass to claim 1 Free Daily Reliquary Key!' };
  }
  const today = getTodayDateKey(now);
  if (state.lastDailyReliquaryKeyDate === today) {
    return { state, ok: false, message: 'Already claimed today’s free VIP Reliquary Key — come back tomorrow!' };
  }
  return {
    state: {
      ...state,
      reliquaryKeys: (state.reliquaryKeys ?? 0) + 1,
      lastDailyReliquaryKeyDate: today,
    },
    ok: true,
    message: '🗝️ Claimed +1 Free Daily VIP Angkor Reliquary Key!',
  };
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

  if (def.itemId && state.inventory.some((i) => i.itemId === def.itemId && i.quantity > 0)) {
    return { state, ok: false, message: `You already own ${def.name}! Equip it in Inventory.` };
  }
  if (def.mountId && (state.ownedMounts ?? []).includes(def.mountId)) {
    return { state, ok: false, message: `You already own ${def.name}! Toggle it anytime in the store.` };
  }
  if (def.instrumentSkinId && (state.ownedInstrumentSkins ?? []).includes(def.instrumentSkinId)) {
    return { state, ok: false, message: `You already own ${def.name}! Select it in the Khmer Instrument bar.` };
  }
  if (def.emoteId && (state.ownedEmotes ?? []).includes(def.emoteId)) {
    return { state, ok: false, message: `You already own ${def.name}! Press [Z] to perform it from the Emote Wheel.` };
  }

  const nextDiamonds = state.currencies.diamonds - def.diamondCost;
  const nextInv = state.inventory.map((i) => ({ ...i }));
  const nextMounts = [...(state.ownedMounts ?? [])];
  let nextActiveMount = state.activeMount ?? null;
  let nextBagSlots = state.extraBagSlots ?? 0;
  const nextSkins = [...(state.ownedInstrumentSkins ?? ['classic'])];
  let nextActiveSkin = state.equippedInstrumentSkin ?? 'classic';
  const nextOwnedYard = { ...(state.ownedYardDecor ?? {}) };
  const nextOwnedEmotes = [...(state.ownedEmotes ?? [])];

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
  if (def.instrumentSkinId) {
    if (!nextSkins.includes(def.instrumentSkinId)) nextSkins.push(def.instrumentSkinId);
    nextActiveSkin = def.instrumentSkinId;
  }
  if (def.yardDecorId) {
    nextOwnedYard[def.yardDecorId] = (nextOwnedYard[def.yardDecorId] ?? 0) + 1;
  }
  if (def.emoteId && !nextOwnedEmotes.includes(def.emoteId)) {
    nextOwnedEmotes.push(def.emoteId);
  }

  return {
    state: {
      ...state,
      currencies: { ...state.currencies, diamonds: nextDiamonds },
      inventory: nextInv,
      ownedMounts: nextMounts,
      activeMount: nextActiveMount,
      extraBagSlots: nextBagSlots,
      ownedInstrumentSkins: nextSkins,
      equippedInstrumentSkin: nextActiveSkin,
      ownedYardDecor: nextOwnedYard,
      ownedEmotes: nextOwnedEmotes,
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
      ? `✨ Mounted ${nextActive.replace(/^mount_/, '').replace(/_/g, ' ')}! Press [V] to dismount or [H] to call.`
      : '🐾 Dismounted — back on foot.',
  };
}

// ==================== MYSTERY RELIQUARY GACHA & SHARD EXCHANGE ====================

export interface ReliquaryOpenEntry {
  reward: ReliquaryRewardEntry;
  tier: ReliquaryTier;
  isDuplicate: boolean;
  shardsGained: number;
  wasPityTriggered: 'none' | 'legendary_30' | 'mythic_100';
}

export interface ReliquaryOpenBatchResult {
  state: PlayerState;
  ok: boolean;
  message: string;
  entries: ReliquaryOpenEntry[];
  keysUsed: number;
  diamondsUsed: number;
  totalShardsGained: number;
  topTier: ReliquaryTier;
  mythicOrAncientPulled: ReliquaryOpenEntry[];
}

const TIER_RANK: Record<ReliquaryTier, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  mythic: 4,
  ancient: 5,
};

export function openReliquaryChests(
  state: PlayerState,
  count: 1 | 10
): ReliquaryOpenBatchResult {
  const availableKeys = Math.max(0, state.reliquaryKeys ?? 0);
  const keysUsed = Math.min(count, availableKeys);
  const remainingOpens = count - keysUsed;
  const diamondsNeeded =
    remainingOpens === 0
      ? 0
      : remainingOpens === 10
      ? RELIQUARY_OPEN_10_DIAMOND_COST
      : remainingOpens * RELIQUARY_OPEN_DIAMOND_COST;

  if (state.currencies.diamonds < diamondsNeeded) {
    return {
      state,
      ok: false,
      message: `Need ${diamondsNeeded} 💎 Diamonds (or earn free Reliquary Keys from Bounties / VIP Daily)!`,
      entries: [],
      keysUsed: 0,
      diamondsUsed: 0,
      totalShardsGained: 0,
      topTier: 'common',
      mythicOrAncientPulled: [],
    };
  }

  let nextInv = state.inventory.map((i) => ({ ...i }));
  const nextFurniture: Record<string, number> = { ...(state.ownedFurniture ?? {}) };
  const nextAuras = new Set<WeaponAuraId>(state.unlockedWeaponAuras ?? []);
  let pity30 = state.reliquaryPityCount ?? 0;
  let pity100 = state.reliquaryMythicPityCount ?? 0;
  let totalShardsGained = 0;
  let topTier: ReliquaryTier = 'common';
  const entries: ReliquaryOpenEntry[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rollSingleReliquary(pity30, pity100);
    pity30 = roll.nextPity30;
    pity100 = roll.nextPity100;

    if (TIER_RANK[roll.tier] > TIER_RANK[topTier]) {
      topTier = roll.tier;
    }

    const r = roll.reward;
    let isDuplicate = false;

    if (r.isUniqueCosmetic) {
      const ownsAllItems =
        !r.itemIds ||
        r.itemIds.every((it) => nextInv.some((inv) => inv.itemId === it.itemId && inv.quantity > 0));
      const ownsAura = !r.weaponAuraId || nextAuras.has(r.weaponAuraId);
      isDuplicate = ownsAllItems && ownsAura;
    }

    let shardsGained = 0;
    if (isDuplicate) {
      shardsGained = RELIQUARY_TIERS[roll.tier].duplicateShards;
      totalShardsGained += shardsGained;
    } else {
      if (r.itemIds && r.itemIds.length > 0) {
        nextInv = addItemsToInventory(nextInv, r.itemIds);
      }
      if (r.furnitureId) {
        nextFurniture[r.furnitureId] = (nextFurniture[r.furnitureId] ?? 0) + 1;
      }
      if (r.weaponAuraId) {
        nextAuras.add(r.weaponAuraId);
      }
    }

    entries.push({
      reward: r,
      tier: roll.tier,
      isDuplicate,
      shardsGained,
      wasPityTriggered: roll.wasPityTriggered,
    });
  }

  const nextState: PlayerState = {
    ...state,
    currencies: {
      ...state.currencies,
      diamonds: state.currencies.diamonds - diamondsNeeded,
    },
    inventory: nextInv,
    ownedFurniture: nextFurniture,
    unlockedWeaponAuras: Array.from(nextAuras),
    reliquaryKeys: availableKeys - keysUsed,
    reliquaryPityCount: pity30,
    reliquaryMythicPityCount: pity100,
    angkorShards: (state.angkorShards ?? 0) + totalShardsGained,
  };

  const mythicOrAncientPulled = entries.filter(
    (e) => e.tier === 'mythic' || e.tier === 'ancient'
  );

  return {
    state: nextState,
    ok: true,
    message:
      count === 1
        ? `🗝️ Opened Angkor Reliquary: ${entries[0].reward.name}${
            entries[0].isDuplicate ? ` (Duplicate → +${entries[0].shardsGained} 💠 Shards)` : '!'
          }`
        : `🗝️ Opened 10× Angkor Reliquary Chests! Highest: ${RELIQUARY_TIERS[topTier].label}${
            totalShardsGained > 0 ? ` (+${totalShardsGained} 💠 Shards)` : ''
          }`,
    entries,
    keysUsed,
    diamondsUsed: diamondsNeeded,
    totalShardsGained,
    topTier,
    mythicOrAncientPulled,
  };
}

export function redeemAngkorShards(
  state: PlayerState,
  offerId: string
): { state: PlayerState; ok: boolean; message: string } {
  const offer = SHARD_EXCHANGE_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    return { state, ok: false, message: 'Shard Exchange offer not found.' };
  }

  const currentShards = state.angkorShards ?? 0;
  if (currentShards < offer.shardCost) {
    return {
      state,
      ok: false,
      message: `Need 💠 ${offer.shardCost} Angkor Shards (you have ${currentShards}).`,
    };
  }

  // Special case: Reliquary Key exchange is stackable!
  if (offer.itemIds.length === 1 && offer.itemIds[0] === 'item_reliquary_key') {
    return {
      state: {
        ...state,
        angkorShards: currentShards - offer.shardCost,
        reliquaryKeys: (state.reliquaryKeys ?? 0) + 1,
      },
      ok: true,
      message: `💠 Exchanged ${offer.shardCost} Shards for +1 🗝️ Angkor Reliquary Key!`,
    };
  }

  // Unique cosmetic exchange check
  const alreadyOwned =
    offer.itemIds.every((id) => state.inventory.some((i) => i.itemId === id && i.quantity > 0)) &&
    (!offer.weaponAuraId || (state.unlockedWeaponAuras ?? []).includes(offer.weaponAuraId));
  if (alreadyOwned) {
    return { state, ok: false, message: `You already own ${offer.name}!` };
  }

  const nextInv = addItemsToInventory(
    state.inventory,
    offer.itemIds.map((itemId) => ({ itemId, quantity: 1 }))
  );
  const nextAuras = new Set<WeaponAuraId>(state.unlockedWeaponAuras ?? []);
  if (offer.weaponAuraId) nextAuras.add(offer.weaponAuraId);

  return {
    state: {
      ...state,
      angkorShards: currentShards - offer.shardCost,
      inventory: nextInv,
      unlockedWeaponAuras: Array.from(nextAuras),
    },
    ok: true,
    message: `💠 Redeemed ${offer.name} (-${offer.shardCost} Angkor Shards)!`,
  };
}
