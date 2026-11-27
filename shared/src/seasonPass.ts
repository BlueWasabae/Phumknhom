import type { PlayerState } from './types';

/**
 * Update 2.1 — Angkor Season Pass (20 Tiers: Free Track & Royal Track)
 * - Season XP earned automatically from Bounties, Pagoda Tower floors, Spirit Crops & Mythic Bosses.
 * - Free Track (All Players): Coins, Reforge Stones, Treasure Maps, Furniture & Tier 20 Angkor Season Title.
 * - Royal Track (300 Diamonds): Bonus Diamonds, Boss Essence packs, Tier 10 Royal Lotus Pet,
 *   and Tier 20 Celestial Angkor Armor Vanity Set!
 */

export const SEASON_PASS_NAME = 'Season 1: Dawn of Angkor';
export const SEASON_PASS_KHMER_NAME = 'រដូវកាលទី ១: អរុណរះអង្គរ';
export const SEASON_XP_PER_TIER = 200;
export const SEASON_MAX_TIER = 20;
export const ROYAL_PASS_DIAMOND_COST = 300;

export type SeasonPassTrack = 'free' | 'royal';

export interface SeasonPassReward {
  label: string;
  icon: string;
  coins?: number;
  gold?: number;
  diamonds?: number;
  items?: Array<{ itemId: string; quantity: number }>;
  furniture?: Array<{ itemId: string; quantity: number }>;
  titleUnlock?: string;
}

export interface SeasonPassTierDef {
  tier: number;
  xpRequired: number;
  free: SeasonPassReward;
  royal: SeasonPassReward;
}

export const SEASON_PASS_TIERS: SeasonPassTierDef[] = [
  {
    tier: 1,
    xpRequired: 0,
    free: { label: '200 Coins', icon: '🪙', coins: 200 },
    royal: { label: '30 Diamonds', icon: '💎', diamonds: 30 },
  },
  {
    tier: 2,
    xpRequired: 200,
    free: { label: '1× Reforge Stone', icon: '🔨', items: [{ itemId: 'mat_reforge_stone', quantity: 1 }] },
    royal: { label: '2× Slime Essence', icon: '✨', items: [{ itemId: 'essence_slime', quantity: 2 }] },
  },
  {
    tier: 3,
    xpRequired: 400,
    free: { label: '250 Coins', icon: '🪙', coins: 250 },
    royal: { label: '35 Diamonds', icon: '💎', diamonds: 35 },
  },
  {
    tier: 4,
    xpRequired: 600,
    free: { label: '1× Torn Treasure Map', icon: '🗺️', items: [{ itemId: 'item_torn_treasure_map', quantity: 1 }] },
    royal: { label: '2× Reforge Stones', icon: '🔨', items: [{ itemId: 'mat_reforge_stone', quantity: 2 }] },
  },
  {
    tier: 5,
    xpRequired: 800,
    free: { label: 'Khmer Silk Floor Rug', icon: '🧶', furniture: [{ itemId: 'furn_silk_rug', quantity: 1 }] },
    royal: { label: '50 Diamonds + 2× Stone Essence', icon: '💎', diamonds: 50, items: [{ itemId: 'essence_stone', quantity: 2 }] },
  },
  {
    tier: 6,
    xpRequired: 1000,
    free: { label: '300 Coins', icon: '🪙', coins: 300 },
    royal: { label: '3× Reforge Stones', icon: '🔨', items: [{ itemId: 'mat_reforge_stone', quantity: 3 }] },
  },
  {
    tier: 7,
    xpRequired: 1200,
    free: { label: '2× Reforge Stones', icon: '🔨', items: [{ itemId: 'mat_reforge_stone', quantity: 2 }] },
    royal: { label: '40 Diamonds', icon: '💎', diamonds: 40 },
  },
  {
    tier: 8,
    xpRequired: 1400,
    free: { label: '400 Coins', icon: '🪙', coins: 400 },
    royal: { label: '2× Naga Essence', icon: '🐉', items: [{ itemId: 'essence_naga', quantity: 2 }] },
  },
  {
    tier: 9,
    xpRequired: 1600,
    free: { label: '1× Torn Treasure Map', icon: '🗺️', items: [{ itemId: 'item_torn_treasure_map', quantity: 1 }] },
    royal: { label: '45 Diamonds', icon: '💎', diamonds: 45 },
  },
  {
    tier: 10,
    xpRequired: 1800,
    free: { label: '500 Coins + 2× Reforge Stones', icon: '🎁', coins: 500, items: [{ itemId: 'mat_reforge_stone', quantity: 2 }] },
    royal: {
      label: 'Exclusive Royal Lotus Pet',
      icon: '🪷',
      items: [{ itemId: 'pet_royal_lotus', quantity: 1 }],
    },
  },
  {
    tier: 11,
    xpRequired: 2000,
    free: { label: '450 Coins', icon: '🪙', coins: 450 },
    royal: { label: '40 Diamonds', icon: '💎', diamonds: 40 },
  },
  {
    tier: 12,
    xpRequired: 2200,
    free: { label: 'Angkor Lantern Lamp', icon: '🏮', furniture: [{ itemId: 'furn_lantern_lamp', quantity: 1 }] },
    royal: { label: '3× Boss Essence Trio', icon: '✨', items: [{ itemId: 'essence_slime', quantity: 1 }, { itemId: 'essence_stone', quantity: 1 }, { itemId: 'essence_naga', quantity: 1 }] },
  },
  {
    tier: 13,
    xpRequired: 2400,
    free: { label: '3× Reforge Stones', icon: '🔨', items: [{ itemId: 'mat_reforge_stone', quantity: 3 }] },
    royal: { label: '50 Diamonds', icon: '💎', diamonds: 50 },
  },
  {
    tier: 14,
    xpRequired: 2600,
    free: { label: '600 Coins', icon: '🪙', coins: 600 },
    royal: { label: '2× Torn Treasure Maps', icon: '🗺️', items: [{ itemId: 'item_torn_treasure_map', quantity: 2 }] },
  },
  {
    tier: 15,
    xpRequired: 2800,
    free: { label: '750 Coins + 3 Gold', icon: '💰', coins: 750, gold: 3 },
    royal: { label: '60 Diamonds + 4× Reforge Stones', icon: '💎', diamonds: 60, items: [{ itemId: 'mat_reforge_stone', quantity: 4 }] },
  },
  {
    tier: 16,
    xpRequired: 3000,
    free: { label: '3× Reforge Stones', icon: '🔨', items: [{ itemId: 'mat_reforge_stone', quantity: 3 }] },
    royal: { label: '50 Diamonds', icon: '💎', diamonds: 50 },
  },
  {
    tier: 17,
    xpRequired: 3200,
    free: { label: '800 Coins', icon: '🪙', coins: 800 },
    royal: { label: '3× Naga Essence', icon: '🐉', items: [{ itemId: 'essence_naga', quantity: 3 }] },
  },
  {
    tier: 18,
    xpRequired: 3400,
    free: { label: '2× Torn Treasure Maps', icon: '🗺️', items: [{ itemId: 'item_torn_treasure_map', quantity: 2 }] },
    royal: { label: '70 Diamonds', icon: '💎', diamonds: 70 },
  },
  {
    tier: 19,
    xpRequired: 3600,
    free: { label: '1,000 Coins + 5 Gold', icon: '💰', coins: 1000, gold: 5 },
    royal: { label: '80 Diamonds + 5× Reforge Stones', icon: '💎', diamonds: 80, items: [{ itemId: 'mat_reforge_stone', quantity: 5 }] },
  },
  {
    tier: 20,
    xpRequired: 3800,
    free: {
      label: 'Title: Angkor Dawn Champion + 1,500c',
      icon: '👑',
      coins: 1500,
      titleUnlock: 'Angkor Dawn Champion',
    },
    royal: {
      label: 'Celestial Angkor Armor Vanity Set + 120 💎',
      icon: '🌟',
      diamonds: 120,
      items: [
        { itemId: 'hat_celestial_angkor_set', quantity: 1 },
        { itemId: 'shirt_celestial_angkor_set', quantity: 1 },
        { itemId: 'pants_celestial_angkor_set', quantity: 1 },
        { itemId: 'wings_celestial_angkor_set', quantity: 1 },
      ],
    },
  },
];

export function getSeasonPassTierFromXp(xp = 0): {
  tier: number;
  xpInTier: number;
  xpForNext: number;
  progressPct: number;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  const tier = Math.min(SEASON_MAX_TIER, Math.floor(safeXp / SEASON_XP_PER_TIER) + 1);
  if (tier >= SEASON_MAX_TIER) {
    return { tier: SEASON_MAX_TIER, xpInTier: SEASON_XP_PER_TIER, xpForNext: SEASON_XP_PER_TIER, progressPct: 100 };
  }
  const xpInTier = safeXp % SEASON_XP_PER_TIER;
  return {
    tier,
    xpInTier,
    xpForNext: SEASON_XP_PER_TIER,
    progressPct: Math.round((xpInTier / SEASON_XP_PER_TIER) * 100),
  };
}

export function passRewardKey(tier: number, track: SeasonPassTrack): string {
  return `${track}_${tier}`;
}

export function countClaimablePassRewards(state: PlayerState): number {
  const { tier: currentTier } = getSeasonPassTierFromXp(state.seasonPassXp ?? 0);
  const claimed = new Set(state.claimedPassTiers ?? []);
  const hasRoyal = Boolean(state.hasRoyalPass);
  let count = 0;
  for (const def of SEASON_PASS_TIERS) {
    if (def.tier > currentTier) break;
    if (!claimed.has(passRewardKey(def.tier, 'free'))) count += 1;
    if (hasRoyal && !claimed.has(passRewardKey(def.tier, 'royal'))) count += 1;
  }
  return count;
}

export function awardSeasonPassXp(
  state: PlayerState,
  deltaXp: number
): { state: PlayerState; tieredUp: boolean; newTier: number } {
  const add = Math.max(0, Math.floor(deltaXp));
  if (add <= 0) {
    return { state, tieredUp: false, newTier: getSeasonPassTierFromXp(state.seasonPassXp ?? 0).tier };
  }
  const prevTier = getSeasonPassTierFromXp(state.seasonPassXp ?? 0).tier;
  const nextXp = (state.seasonPassXp ?? 0) + add;
  const newTier = getSeasonPassTierFromXp(nextXp).tier;
  return {
    state: {
      ...state,
      seasonPassXp: nextXp,
    },
    tieredUp: newTier > prevTier,
    newTier,
  };
}

export function unlockRoyalSeasonPass(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string } {
  if (state.hasRoyalPass) {
    return { state, ok: false, message: 'Royal Angkor Season Pass is already unlocked!' };
  }
  if (state.currencies.diamonds < ROYAL_PASS_DIAMOND_COST) {
    return {
      state,
      ok: false,
      message: `Need ${ROYAL_PASS_DIAMOND_COST} Diamonds to unlock the Royal Track (you have ${state.currencies.diamonds}).`,
    };
  }
  return {
    state: {
      ...state,
      currencies: {
        ...state.currencies,
        diamonds: state.currencies.diamonds - ROYAL_PASS_DIAMOND_COST,
      },
      hasRoyalPass: true,
    },
    ok: true,
    message: `👑 Unlocked Royal Track (${SEASON_PASS_NAME})! Claim all unlocked Royal rewards now!`,
  };
}

export function claimSeasonPassTier(
  state: PlayerState,
  tier: number,
  track: SeasonPassTrack
): { state: PlayerState; ok: boolean; message: string } {
  const def = SEASON_PASS_TIERS.find((t) => t.tier === tier);
  if (!def) return { state, ok: false, message: 'Invalid Season Pass tier.' };

  const { tier: currentTier } = getSeasonPassTierFromXp(state.seasonPassXp ?? 0);
  if (tier > currentTier) {
    return { state, ok: false, message: `Reach Tier ${tier} to claim this reward.` };
  }
  if (track === 'royal' && !state.hasRoyalPass) {
    return { state, ok: false, message: 'Unlock the Royal Track (300 Diamonds) to claim Royal rewards.' };
  }

  const key = passRewardKey(tier, track);
  const claimed = new Set(state.claimedPassTiers ?? []);
  if (claimed.has(key)) {
    return { state, ok: false, message: `Tier ${tier} (${track}) reward already claimed.` };
  }

  const reward = track === 'free' ? def.free : def.royal;
  const nextCoins = state.currencies.coins + (reward.coins ?? 0);
  const nextGold = state.currencies.gold + (reward.gold ?? 0);
  const nextDiamonds = state.currencies.diamonds + (reward.diamonds ?? 0);
  const nextInv = state.inventory.map((i) => ({ ...i }));
  const nextFurn = { ...(state.ownedFurniture ?? {}) };
  const nextTitles = new Set(state.unlockedTitles ?? []);
  let nextActiveTitle = state.activeTitle ?? null;

  for (const drop of reward.items ?? []) {
    const existing = nextInv.find(
      (i) => i.itemId === drop.itemId && (i.quality ?? 'normal') === 'normal'
    );
    if (existing) existing.quantity += drop.quantity;
    else {
      nextInv.push({
        itemId: drop.itemId,
        quantity: drop.quantity,
        itemLevel: 1,
        quality: 'normal',
      });
    }
  }

  for (const f of reward.furniture ?? []) {
    nextFurn[f.itemId] = (nextFurn[f.itemId] ?? 0) + f.quantity;
  }

  if (reward.titleUnlock) {
    nextTitles.add(reward.titleUnlock);
    if (!nextActiveTitle) nextActiveTitle = reward.titleUnlock;
  }

  claimed.add(key);

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: {
        ...state.currencies,
        coins: nextCoins,
        gold: nextGold,
        diamonds: nextDiamonds,
      },
      inventory: nextInv,
      ownedFurniture: nextFurn,
      unlockedTitles: Array.from(nextTitles),
      activeTitle: nextActiveTitle,
      claimedPassTiers: Array.from(claimed),
    },
    ok: true,
    message: `🎟️ Season Pass Tier ${tier} (${track.toUpperCase()}): Claimed ${reward.icon} ${reward.label}!`,
  };
}
