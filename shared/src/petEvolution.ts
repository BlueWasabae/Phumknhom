import type { PetEvolutionStage, PetProgressEntry, PlayerState } from './types';

export const MAX_PET_LEVEL = 25;
export const PET_STAGE_2_LEVEL = 10;
export const PET_STAGE_3_LEVEL = 25;
export const MYTHIC_EVOLVE_ESSENCE_COST = 3;
export const MYTHIC_EVOLVE_PEARL_COST = 1;
export const MYTHIC_EVOLVE_DIAMOND_COST = 100;

export const BOSS_ESSENCE_ITEM_IDS = [
  'essence_slime',
  'essence_stone',
  'essence_naga',
] as const;

export interface PetStageMeta {
  stage: PetEvolutionStage;
  title: string;
  khmerTitle: string;
  levelRange: string;
  scaleMult: number;
  followLerp: number;
  pickupRadiusBonusPct: number;
  passiveOverworldRegenPct: number;
  accentHex: string;
  badgeText: string;
  perkSummary: string;
}

export const PET_STAGE_META: Record<PetEvolutionStage, PetStageMeta> = {
  1: {
    stage: 1,
    title: 'Stage 1 · Baby',
    khmerTitle: 'កូនសត្វចិញ្ចឹម',
    levelRange: 'Lv. 1–9',
    scaleMult: 1.0,
    followLerp: 0.11,
    pickupRadiusBonusPct: 0,
    passiveOverworldRegenPct: 0,
    accentHex: '#94a3b8',
    badgeText: 'BABY',
    perkSummary: 'Loyal companion following your footsteps through Phum Khnhom.',
  },
  2: {
    stage: 2,
    title: 'Stage 2 · Adult',
    khmerTitle: 'ពេញវ័យ',
    levelRange: 'Lv. 10–24',
    scaleMult: 1.2,
    followLerp: 0.16,
    pickupRadiusBonusPct: 25,
    passiveOverworldRegenPct: 0,
    accentHex: '#38bdf8',
    badgeText: 'ADULT · +25% PICKUP',
    perkSummary: '1.2x size, faster follow speed, sparkle trail & +25% Coin/Ore auto-pickup radius.',
  },
  3: {
    stage: 3,
    title: 'Stage 3 · Mythic',
    khmerTitle: 'ទេវកថា',
    levelRange: 'Lv. 25 (Evolved)',
    scaleMult: 1.35,
    followLerp: 0.2,
    pickupRadiusBonusPct: 65,
    passiveOverworldRegenPct: 10,
    accentHex: '#f59e0b',
    badgeText: 'MYTHIC · MAGNET + REGEN',
    perkSummary:
      '1.35x majestic form, WebGL Bloom Aura, orbiting runes, wide auto-loot magnet & +10% passive Overworld regen (0 combat P2W).',
  },
};

export function createDefaultPetProgress(): PetProgressEntry {
  return { level: 1, xp: 0, stage: 1 };
}

export function getPetProgress(state: Pick<PlayerState, 'petProgress'>, petId: string | null | undefined): PetProgressEntry {
  if (!petId) return createDefaultPetProgress();
  const raw = state.petProgress?.[petId];
  if (!raw) return createDefaultPetProgress();
  const level = Math.max(1, Math.min(MAX_PET_LEVEL, Math.floor(raw.level || 1)));
  const xp = Math.max(0, Math.floor(raw.xp || 0));
  const stage: PetEvolutionStage =
    raw.stage === 3 && level >= PET_STAGE_3_LEVEL
      ? 3
      : level >= PET_STAGE_2_LEVEL
        ? 2
        : 1;
  return { level, xp, stage };
}

/**
 * Smooth, gratifying XP curve:
 * Lv.1 -> 2: 50 XP, Lv.2 -> 3: 65 XP ... Lv.9 -> 10: 170 XP (cumulative ~990 XP -> ~8-12 crops/snacks to hit Adult!)
 */
export function xpForNextPetLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_PET_LEVEL, Math.floor(level)));
  if (clamped >= MAX_PET_LEVEL) return 0;
  return 50 + (clamped - 1) * 15;
}

/**
 * Returns Pet XP granted by feeding a crop, snack, fruit, artisan good, or fish.
 * Returns 0 if the item is not pet food.
 */
export function getPetFoodXp(itemId: string): number {
  if (!itemId) return 0;
  // Spirit / Exotic high-tier crops
  if (itemId === 'crop_inferno_kampot_pepper') return 360;
  if (itemId === 'crop_celestial_pink_lotus') return 320;
  if (itemId === 'crop_spirit_jasmine_rice') return 260;
  if (itemId === 'crop_kampot_pepper') return 200;
  if (itemId === 'crop_phka_rumduol') return 145;
  if (itemId === 'crop_slek_krey') return 110;
  if (itemId === 'crop_trakuon') return 85;
  if (itemId.startsWith('crop_')) return 120;

  // Tropical & rare fish
  if (itemId === 'fish_ancient_sea_turtle_egg' || itemId === 'fish_celestial_manta') return 380;
  if (itemId === 'fish_golden_lotus_koi' || itemId === 'fish_rainbow_angelfish') return 260;
  if (itemId === 'fish_mekong_catfish' || itemId === 'fish_giant_barb') return 190;
  if (itemId.startsWith('fish_')) return 135;

  // Cooked Khmer street snacks & elixirs
  if (itemId.startsWith('elixir_')) return 240;
  if (itemId === 'snack_pepper_skewer' || itemId === 'snack_amok') return 175;
  if (itemId === 'snack_kafe' || itemId === 'snack_num_pang') return 130;
  if (itemId.startsWith('snack_')) return 140;

  // Fruits, dairy & artisan ingredients
  if (itemId.startsWith('fruit_')) return 115;
  if (itemId.startsWith('artisan_')) return 150;
  if (itemId === 'drop_fresh_egg' || itemId === 'drop_fresh_milk') return 95;

  return 0;
}

export function countBossEssences(inventory: PlayerState['inventory']): number {
  let total = 0;
  for (const item of inventory) {
    if ((BOSS_ESSENCE_ITEM_IDS as readonly string[]).includes(item.itemId) && item.quantity > 0) {
      total += item.quantity;
    }
  }
  return total;
}

export function countSeaPearls(inventory: PlayerState['inventory']): number {
  let total = 0;
  for (const item of inventory) {
    if ((item.itemId === 'pearl_sea' || item.itemId === 'pearl_ancient_gold') && item.quantity > 0) {
      total += item.quantity;
    }
  }
  return total;
}

export interface FeedPetResult {
  ok: boolean;
  error?: string;
  nextState?: PlayerState;
  xpGained: number;
  levelsGained: number;
  previousStage: PetEvolutionStage;
  newStage: PetEvolutionStage;
  evolvedToStage: 2 | null;
  progress: PetProgressEntry;
}

export function feedPetWithItem(
  state: PlayerState,
  petId: string,
  foodItemId: string,
  quantity = 1
): FeedPetResult {
  const baseXp = getPetFoodXp(foodItemId);
  const current = getPetProgress(state, petId);
  if (baseXp <= 0) {
    return {
      ok: false,
      error: 'That item cannot be fed to pets. Use harvested crops, Khmer snacks, or fish!',
      xpGained: 0,
      levelsGained: 0,
      previousStage: current.stage,
      newStage: current.stage,
      evolvedToStage: null,
      progress: current,
    };
  }
  if (current.level >= MAX_PET_LEVEL) {
    return {
      ok: false,
      error:
        current.stage < 3
          ? 'Your pet is Lv. 25! Use Mythic Evolution below to ascend to Stage 3.'
          : 'Your pet has already reached Mythic Lv. 25!',
      xpGained: 0,
      levelsGained: 0,
      previousStage: current.stage,
      newStage: current.stage,
      evolvedToStage: null,
      progress: current,
    };
  }

  const invIndex = state.inventory.findIndex((i) => i.itemId === foodItemId && i.quantity > 0);
  if (invIndex < 0) {
    return {
      ok: false,
      error: 'You do not have that food item in your Container.',
      xpGained: 0,
      levelsGained: 0,
      previousStage: current.stage,
      newStage: current.stage,
      evolvedToStage: null,
      progress: current,
    };
  }

  const stack = state.inventory[invIndex];
  const useQty = Math.max(1, Math.min(stack.quantity, Math.floor(quantity)));
  const qualityMult = stack.quality === 'gold_star' ? 1.35 : 1.0;
  const totalXpGain = Math.round(baseXp * qualityMult * useQty);

  let level = current.level;
  let xp = current.xp + totalXpGain;
  let levelsGained = 0;

  while (level < MAX_PET_LEVEL) {
    const need = xpForNextPetLevel(level);
    if (xp >= need) {
      xp -= need;
      level += 1;
      levelsGained += 1;
    } else {
      break;
    }
  }
  if (level >= MAX_PET_LEVEL) {
    level = MAX_PET_LEVEL;
    xp = 0;
  }

  const previousStage = current.stage;
  const newStage: PetEvolutionStage =
    previousStage === 3 ? 3 : level >= PET_STAGE_2_LEVEL ? 2 : 1;
  const evolvedToStage: 2 | null = previousStage < 2 && newStage === 2 ? 2 : null;

  const nextInventory = state.inventory
    .map((item, idx) => (idx === invIndex ? { ...item, quantity: item.quantity - useQty } : item))
    .filter((item) => item.quantity > 0);

  const nextProgress: PetProgressEntry = { level, xp, stage: newStage };
  const nextState: PlayerState = {
    ...state,
    inventory: nextInventory,
    petProgress: {
      ...(state.petProgress ?? {}),
      [petId]: nextProgress,
    },
  };

  return {
    ok: true,
    nextState,
    xpGained: totalXpGain,
    levelsGained,
    previousStage,
    newStage,
    evolvedToStage,
    progress: nextProgress,
  };
}

export interface MythicEvolveResult {
  ok: boolean;
  error?: string;
  nextState?: PlayerState;
  progress?: PetProgressEntry;
}

export function evolvePetToMythic(
  state: PlayerState,
  petId: string,
  method: 'materials' | 'diamonds'
): MythicEvolveResult {
  const current = getPetProgress(state, petId);
  if (current.stage >= 3) {
    return { ok: false, error: 'This pet is already Stage 3 Mythic!' };
  }
  if (current.level < PET_STAGE_3_LEVEL) {
    return {
      ok: false,
      error: `Pet must reach Lv. ${PET_STAGE_3_LEVEL} before Mythic Evolution (currently Lv. ${current.level}).`,
    };
  }

  if (method === 'diamonds') {
    if (state.currencies.diamonds < MYTHIC_EVOLVE_DIAMOND_COST) {
      return {
        ok: false,
        error: `Need ${MYTHIC_EVOLVE_DIAMOND_COST} Diamonds (you have ${state.currencies.diamonds}).`,
      };
    }
    const nextProgress: PetProgressEntry = { level: MAX_PET_LEVEL, xp: 0, stage: 3 };
    return {
      ok: true,
      progress: nextProgress,
      nextState: {
        ...state,
        currencies: {
          ...state.currencies,
          diamonds: state.currencies.diamonds - MYTHIC_EVOLVE_DIAMOND_COST,
        },
        petProgress: {
          ...(state.petProgress ?? {}),
          [petId]: nextProgress,
        },
      },
    };
  }

  // Materials path: 3x Boss Essence + 1x Sea Pearl
  const essenceOwned = countBossEssences(state.inventory);
  const pearlOwned = countSeaPearls(state.inventory);
  if (essenceOwned < MYTHIC_EVOLVE_ESSENCE_COST) {
    return {
      ok: false,
      error: `Need ${MYTHIC_EVOLVE_ESSENCE_COST}x Boss Essence (you have ${essenceOwned}).`,
    };
  }
  if (pearlOwned < MYTHIC_EVOLVE_PEARL_COST) {
    return {
      ok: false,
      error: `Need ${MYTHIC_EVOLVE_PEARL_COST}x Sea Pearl from Koh Rong Pearl Diving (you have ${pearlOwned}).`,
    };
  }

  let essLeft = MYTHIC_EVOLVE_ESSENCE_COST;
  let pearlLeft = MYTHIC_EVOLVE_PEARL_COST;
  const nextInventory = state.inventory
    .map((item) => {
      if (essLeft > 0 && (BOSS_ESSENCE_ITEM_IDS as readonly string[]).includes(item.itemId)) {
        const take = Math.min(item.quantity, essLeft);
        essLeft -= take;
        return { ...item, quantity: item.quantity - take };
      }
      if (pearlLeft > 0 && item.itemId === 'pearl_sea') {
        const take = Math.min(item.quantity, pearlLeft);
        pearlLeft -= take;
        return { ...item, quantity: item.quantity - take };
      }
      return item;
    })
    .map((item) => {
      // Fallback to Ancient Gold Pearl only if no normal pearl_sea was consumed
      if (pearlLeft > 0 && item.itemId === 'pearl_ancient_gold') {
        const take = Math.min(item.quantity, pearlLeft);
        pearlLeft -= take;
        return { ...item, quantity: item.quantity - take };
      }
      return item;
    })
    .filter((item) => item.quantity > 0);

  const nextProgress: PetProgressEntry = { level: MAX_PET_LEVEL, xp: 0, stage: 3 };
  return {
    ok: true,
    progress: nextProgress,
    nextState: {
      ...state,
      inventory: nextInventory,
      petProgress: {
        ...(state.petProgress ?? {}),
        [petId]: nextProgress,
      },
    },
  };
}
