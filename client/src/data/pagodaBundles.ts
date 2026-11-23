import type { PlayerState } from '@shared/types';
import { awardSkillXp } from '../game/systems/SkillManager';
import { FARM_ITEMS } from './cropsAndArtisan';
import { STREET_SNACKS, countInventoryAnyQuality } from './recipes';

export interface PagodaOfferingReq {
  itemId: string;
  label: string;
}

export interface PagodaAltarDef {
  id: string;
  name: string;
  khmerName: string;
  icon: string;
  accentColor: string;
  unlockTitle: string;
  unlockEffect: string;
  completionCoins: number;
  completionGold: number;
  requirements: [PagodaOfferingReq, PagodaOfferingReq, PagodaOfferingReq];
}

/**
 * The 6 Ancient Pagoda Restoration Offering Altars from docs/GDD_OPEN_WORLD_EXPANSION.md §3.3
 */
export const PAGODA_ALTARS: PagodaAltarDef[] = [
  {
    id: 'altar_harvest',
    name: 'Harvest Altar',
    khmerName: 'អាសនៈកសិផល',
    icon: '🌾',
    accentColor: '#16a34a',
    unlockTitle: 'Glass Greenhouse Bonus',
    unlockEffect: '+20% permanent Farm crop growth speed across all plots!',
    completionCoins: 450,
    completionGold: 2,
    requirements: [
      { itemId: 'crop_trakuon', label: 'Fresh Trakuon' },
      { itemId: 'crop_phka_rumduol', label: 'Phka Rumduol Rice' },
      { itemId: 'artisan_rice_noodles', label: 'Fine Rice Noodles' },
    ],
  },
  {
    id: 'altar_river',
    name: 'River Altar',
    khmerName: 'អាសនៈទន្លេ',
    icon: '🐟',
    accentColor: '#0284c7',
    unlockTitle: 'Sapphire Coast Ferry',
    unlockEffect: 'Repairs the Coast Ferry boat & grants +20% Fishing XP!',
    completionCoins: 550,
    completionGold: 2,
    requirements: [
      { itemId: 'fish_mekong_catfish', label: 'Mekong Catfish' },
      { itemId: 'fish_silver_carp', label: 'Silver Carp' },
      { itemId: 'fish_golden_lotus_koi', label: 'Golden Lotus Koi' },
    ],
  },
  {
    id: 'altar_forage',
    name: 'Forage Altar',
    khmerName: 'អាសនៈព្រៃឈើ',
    icon: '🌿',
    accentColor: '#65a30d',
    unlockTitle: 'Jungle Suspension Bridge',
    unlockEffect: 'Repairs the Whispering Palm Jungle bridge & grants +10% Village Speed!',
    completionCoins: 500,
    completionGold: 2,
    requirements: [
      { itemId: 'crop_slek_krey', label: 'Slek Krey Stalk' },
      { itemId: 'fruit_coconut', label: 'Fresh Coconut' },
      { itemId: 'fruit_mango', label: 'Sweet Mango' },
    ],
  },
  {
    id: 'altar_blacksmith',
    name: 'Blacksmith Altar',
    khmerName: 'អាសនៈជាងដែក',
    icon: '⚒️',
    accentColor: '#b45309',
    unlockTitle: 'Fast-Travel & Cheaper Upgrades',
    unlockEffect: 'Repairs Mine Carts & reduces weapon upgrade fees!',
    completionCoins: 700,
    completionGold: 3,
    requirements: [
      { itemId: 'drop_slime_core', label: 'Slime Core' },
      { itemId: 'drop_stone_core', label: 'Stone Core' },
      { itemId: 'drop_stone_key', label: 'Ancient Stone Key' },
    ],
  },
  {
    id: 'altar_kitchen',
    name: 'Kitchen Altar',
    khmerName: 'អាសនៈចង្ក្រានបាយ',
    icon: '🍜',
    accentColor: '#ea580c',
    unlockTitle: 'Master Chef Cart (-20% Discount)',
    unlockEffect: 'Permanent 20% Coin discount at the Street Snack Cart!',
    completionCoins: 600,
    completionGold: 2,
    requirements: [
      { itemId: 'snack_num_pang', label: 'Num Pang' },
      { itemId: 'snack_kafe', label: 'Kafé Tek Dos Ko' },
      { itemId: 'snack_pepper_skewer', label: 'Kampot Pepper Skewers' },
    ],
  },
  {
    id: 'altar_spirit',
    name: 'Spirit Altar',
    khmerName: 'អាសនៈបារមី',
    icon: '✨',
    accentColor: '#9333ea',
    unlockTitle: 'Shrine of Daily Blessings',
    unlockEffect: 'Grants +10% Luck for Gold-Star harvests & rare boss drops!',
    completionCoins: 1000,
    completionGold: 5,
    requirements: [
      { itemId: 'crop_pink_lotus', label: 'Pink Lotus Blossom' },
      { itemId: 'artisan_spirit_elixir', label: 'Lotus Spirit Elixir' },
      { itemId: 'seed_spirit_bamboo', label: 'Spirit Bamboo Seed' },
    ],
  },
];

export function isAltarCompleted(state: PlayerState, altarId: string): boolean {
  const altar = PAGODA_ALTARS.find((a) => a.id === altarId);
  if (!altar) return false;
  const donated = state.pagodaBundles?.[altarId] ?? [];
  return altar.requirements.every((r) => donated.includes(r.itemId));
}

export function getCompletedAltarCount(state: PlayerState): number {
  return PAGODA_ALTARS.filter((a) => isAltarCompleted(state, a.id)).length;
}

export function getOfferingItemLabel(itemId: string): string {
  return FARM_ITEMS[itemId]?.name ?? STREET_SNACKS[itemId]?.name ?? itemId;
}

export function donateToPagodaAltar(
  state: PlayerState,
  altarId: string,
  itemId: string
): { state: PlayerState; ok: boolean; message: string; altarCompleted?: boolean } {
  const altar = PAGODA_ALTARS.find((a) => a.id === altarId);
  if (!altar) return { state, ok: false, message: 'Unknown Pagoda Altar.' };
  const req = altar.requirements.find((r) => r.itemId === itemId);
  if (!req) return { state, ok: false, message: 'That item does not belong to this altar.' };

  const currentDonated = state.pagodaBundles?.[altarId] ?? [];
  if (currentDonated.includes(itemId)) {
    return { state, ok: false, message: `${req.label} has already been offered!` };
  }

  if (countInventoryAnyQuality(state.inventory, itemId) < 1) {
    return { state, ok: false, message: `You need 1× ${req.label} in your Container to offer.` };
  }

  // Consume 1× matching item
  const nextInv = state.inventory.map((i) => ({ ...i }));
  const idx = nextInv.findIndex((i) => i.itemId === itemId && i.quantity > 0);
  if (idx < 0) return { state, ok: false, message: `Missing ${req.label}.` };
  nextInv[idx].quantity -= 1;
  const cleanedInv = nextInv.filter((i) => i.quantity > 0);

  const nextDonated = [...currentDonated, itemId];
  const nextBundles = {
    ...(state.pagodaBundles ?? {}),
    [altarId]: nextDonated,
  };

  const completedNow = altar.requirements.every((r) => nextDonated.includes(r.itemId));
  const coinReward = completedNow ? altar.completionCoins : 45;
  const goldReward = completedNow ? altar.completionGold : 0;

  let nextState: PlayerState = {
    ...state,
    coins: state.currencies.coins + coinReward,
    currencies: {
      ...state.currencies,
      coins: state.currencies.coins + coinReward,
      gold: state.currencies.gold + goldReward,
    },
    inventory: cleanedInv,
    pagodaBundles: nextBundles,
  };

  nextState = awardSkillXp(nextState, 'crafting', completedNow ? 60 : 20, true).state;

  return {
    state: nextState,
    ok: true,
    altarCompleted: completedNow,
    message: completedNow
      ? `🏯 ${altar.name} RESTORED! Unlocked ${altar.unlockTitle} (+${coinReward}c, +${goldReward} Gold)!`
      : `Offered ${req.label} to ${altar.name} (+${coinReward} Coins)!`,
  };
}
