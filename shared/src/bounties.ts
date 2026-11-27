import type { BountyProgressState, PlayerState } from './types';

/**
 * Update 1.8 — Daily & Weekly Adventurer's Bounty Board for ភូមិខ្ញុំ (Phum Khnhom)
 * Auto-generates 4 Daily Bounties + 2 Weekly Bounties tying Farming, Fishing, Mining,
 * Khmer Cooking/Snacks, Endless Pagoda Tower, and Mythic Boss Combat together.
 */

export type BountyCadence = 'daily' | 'weekly';

export type BountyCategory =
  | 'harvest_crops'
  | 'catch_fish'
  | 'mine_ores'
  | 'eat_or_cook_snack'
  | 'clear_tower_floors'
  | 'defeat_mythic_boss'
  | 'defeat_any_boss';

export interface BountyDef {
  id: string;
  cadence: BountyCadence;
  category: BountyCategory;
  title: string;
  khmerTitle: string;
  icon: string;
  goal: number;
  rewardCoins: number;
  rewardGold: number;
  rewardReforgeStones: number;
  rewardXp: number;
  hint: string;
}

export const DAILY_BOUNTY_POOL: BountyDef[] = [
  {
    id: 'daily_harvest_5',
    cadence: 'daily',
    category: 'harvest_crops',
    title: 'Harvest 5 Crops',
    khmerTitle: 'ប្រមូលផលដំណាំ ៥ ដើម',
    icon: '🌾',
    goal: 5,
    rewardCoins: 240,
    rewardGold: 1,
    rewardReforgeStones: 1,
    rewardXp: 85,
    hint: 'Harvest any mature crop plots at your Homestead Farm.',
  },
  {
    id: 'daily_fish_3',
    cadence: 'daily',
    category: 'catch_fish',
    title: 'Catch 3 Fish at Riverside Pier',
    khmerTitle: 'ស្ទូចត្រី ៣ ក្បាលនៅកំពង់ទឹក',
    icon: '🎣',
    goal: 3,
    rewardCoins: 220,
    rewardGold: 1,
    rewardReforgeStones: 1,
    rewardXp: 80,
    hint: 'Cast your bamboo rod at the Green Park Riverside Pier.',
  },
  {
    id: 'daily_mine_4',
    cadence: 'daily',
    category: 'mine_ores',
    title: 'Mine 4 Ore Veins in the Caverns',
    khmerTitle: 'ជីករ៉ែ ៤ កន្លែងក្នុងល្អាងភ្នំ',
    icon: '⛏️',
    goal: 4,
    rewardCoins: 280,
    rewardGold: 1,
    rewardReforgeStones: 2,
    rewardXp: 95,
    hint: 'Break Laterite, Jade, or Angkor Gold veins in Caverns or Wild Frontier.',
  },
  {
    id: 'daily_snack_2',
    cadence: 'daily',
    category: 'eat_or_cook_snack',
    title: 'Cook or Eat 2 Khmer Snacks',
    khmerTitle: 'ចម្អិន ឬញ៉ាំអាហារសម្រន់ខ្មែរ ២ ដង',
    icon: '🥖',
    goal: 2,
    rewardCoins: 180,
    rewardGold: 1,
    rewardReforgeStones: 1,
    rewardXp: 70,
    hint: 'Eat a Quick-Snack [1/2/3] or cook a street food dish at Grandma Srey’s Cart.',
  },
  {
    id: 'daily_tower_2',
    cadence: 'daily',
    category: 'clear_tower_floors',
    title: 'Clear 2 Pagoda Tower Floors',
    khmerTitle: 'ឈ្នះប្រាសាទសាកល្បង ២ ជាន់',
    icon: '🗼',
    goal: 2,
    rewardCoins: 320,
    rewardGold: 2,
    rewardReforgeStones: 2,
    rewardXp: 110,
    hint: 'Climb floors inside the Endless 50-Floor Pagoda Tower in Temple District.',
  },
  {
    id: 'daily_boss_1',
    cadence: 'daily',
    category: 'defeat_any_boss',
    title: 'Defeat Any Khmer Dungeon Boss',
    khmerTitle: 'ផ្តួលមេទ័ពបិសាចអង្គរ ១ ដង',
    icon: '⚔️',
    goal: 1,
    rewardCoins: 350,
    rewardGold: 2,
    rewardReforgeStones: 2,
    rewardXp: 120,
    hint: 'Clear any boss through the Angkorian Dungeon Portal or Boss Rush.',
  },
];

export const WEEKLY_BOUNTY_POOL: BountyDef[] = [
  {
    id: 'weekly_mythic_boss',
    cadence: 'weekly',
    category: 'defeat_mythic_boss',
    title: 'Defeat Any Mythic Boss',
    khmerTitle: 'ផ្តួលមេទ័ពកម្រិត Mythic ១ ដង',
    icon: '👑',
    goal: 1,
    rewardCoins: 950,
    rewardGold: 6,
    rewardReforgeStones: 5,
    rewardXp: 320,
    hint: 'Conquer any Khmer Boss on Mythic difficulty (or clear a Boss Rush Mythic trial).',
  },
  {
    id: 'weekly_tower_5',
    cadence: 'weekly',
    category: 'clear_tower_floors',
    title: 'Clear 5 Pagoda Tower Floors',
    khmerTitle: 'ឈ្នះប្រាសាទសាកល្បង ៥ ជាន់ក្នុងសប្តាហ៍នេះ',
    icon: '🏛️',
    goal: 5,
    rewardCoins: 820,
    rewardGold: 5,
    rewardReforgeStones: 4,
    rewardXp: 280,
    hint: 'Push higher in the Endless 50-Floor Pagoda Tower in Temple District.',
  },
  {
    id: 'weekly_harvest_15',
    cadence: 'weekly',
    category: 'harvest_crops',
    title: 'Harvest 15 Village Crops',
    khmerTitle: 'ប្រមូលផលដំណាំភូមិ ១៥ ដើម',
    icon: '🪷',
    goal: 15,
    rewardCoins: 760,
    rewardGold: 4,
    rewardReforgeStones: 3,
    rewardXp: 240,
    hint: 'Grow and harvest crops across your Homestead or Shared Co-op Farm.',
  },
];

export function getDailyBountyKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeeklyBountyKey(now = Date.now()): string {
  const d = new Date(now);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000);
  const weekNum = Math.floor((dayOfYear + startOfYear.getDay()) / 7) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Deterministically picks 4 Daily Bounties (always including Snack/Harvest variety for instant engagement)
 * and 2 Weekly Bounties for the current calendar day & week.
 */
export function getActiveBounties(now = Date.now()): {
  dailyKey: string;
  weeklyKey: string;
  daily: BountyDef[];
  weekly: BountyDef[];
  all: BountyDef[];
} {
  const dailyKey = getDailyBountyKey(now);
  const weeklyKey = getWeeklyBountyKey(now);
  const dSeed = hashString(dailyKey);
  const wSeed = hashString(weeklyKey);

  // Always include 4 distinct daily bounties from the 6-item pool (anchored so Harvest, Snack, Fish/Mine/Tower rotate cleanly)
  const daily: BountyDef[] = [];
  const startIdx = dSeed % DAILY_BOUNTY_POOL.length;
  for (let i = 0; i < DAILY_BOUNTY_POOL.length && daily.length < 4; i++) {
    daily.push(DAILY_BOUNTY_POOL[(startIdx + i) % DAILY_BOUNTY_POOL.length]);
  }
  // Ensure `daily_snack_2` is always available in the 4 daily slots so players can verify/complete a bounty immediately
  if (!daily.some((b) => b.id === 'daily_snack_2')) {
    daily[3] = DAILY_BOUNTY_POOL.find((b) => b.id === 'daily_snack_2')!;
  }

  const weekly: BountyDef[] = [
    WEEKLY_BOUNTY_POOL[0], // Always include "Defeat Any Mythic Boss"
    WEEKLY_BOUNTY_POOL[1 + (wSeed % (WEEKLY_BOUNTY_POOL.length - 1))],
  ];

  return {
    dailyKey,
    weeklyKey,
    daily,
    weekly,
    all: [...daily, ...weekly],
  };
}

export function normalizeBountyProgress(
  raw?: BountyProgressState | null,
  now = Date.now()
): BountyProgressState {
  const { dailyKey, weeklyKey, daily, weekly } = getActiveBounties(now);
  if (!raw) {
    return { dailyKey, weeklyKey, progress: {}, claimed: [] };
  }

  const nextProgress: Record<string, number> = {};
  const nextClaimed = new Set<string>();

  if (raw.dailyKey === dailyKey) {
    for (const b of daily) {
      if (typeof raw.progress?.[b.id] === 'number') {
        nextProgress[b.id] = Math.max(0, Math.floor(raw.progress[b.id]));
      }
      if (Array.isArray(raw.claimed) && raw.claimed.includes(b.id)) {
        nextClaimed.add(b.id);
      }
    }
  }

  if (raw.weeklyKey === weeklyKey) {
    for (const b of weekly) {
      if (typeof raw.progress?.[b.id] === 'number') {
        nextProgress[b.id] = Math.max(0, Math.floor(raw.progress[b.id]));
      }
      if (Array.isArray(raw.claimed) && raw.claimed.includes(b.id)) {
        nextClaimed.add(b.id);
      }
    }
  }

  return {
    dailyKey,
    weeklyKey,
    progress: nextProgress,
    claimed: Array.from(nextClaimed),
  };
}

export function countClaimableBounties(state: PlayerState, now = Date.now()): number {
  const active = getActiveBounties(now);
  const bp = normalizeBountyProgress(state.bountyProgress, now);
  let ready = 0;
  for (const b of active.all) {
    if (bp.claimed.includes(b.id)) continue;
    if ((bp.progress[b.id] ?? 0) >= b.goal) {
      ready += 1;
    }
  }
  return ready;
}

export function recordBountyProgress(
  state: PlayerState,
  category: BountyCategory,
  amount = 1,
  now = Date.now()
): { state: PlayerState; newlyCompleted: BountyDef[] } {
  if (amount <= 0) return { state, newlyCompleted: [] };
  const active = getActiveBounties(now);
  const bp = normalizeBountyProgress(state.bountyProgress, now);
  const nextProgress = { ...bp.progress };
  const newlyCompleted: BountyDef[] = [];
  let changed = false;

  for (const b of active.all) {
    const matches =
      b.category === category ||
      (category === 'defeat_mythic_boss' && b.category === 'defeat_any_boss');
    if (!matches || bp.claimed.includes(b.id)) continue;
    const prevVal = nextProgress[b.id] ?? 0;
    if (prevVal >= b.goal) continue;
    const nextVal = Math.min(b.goal, prevVal + amount);
    nextProgress[b.id] = nextVal;
    changed = true;
    if (prevVal < b.goal && nextVal >= b.goal) {
      newlyCompleted.push(b);
    }
  }

  if (!changed) {
    return { state, newlyCompleted: [] };
  }

  return {
    state: {
      ...state,
      bountyProgress: {
        ...bp,
        progress: nextProgress,
      },
    },
    newlyCompleted,
  };
}

export function claimBountyReward(
  state: PlayerState,
  bountyId: string,
  now = Date.now()
): { state: PlayerState; ok: boolean; message: string; bounty?: BountyDef } {
  const active = getActiveBounties(now);
  const bounty = active.all.find((b) => b.id === bountyId);
  if (!bounty) {
    return { state, ok: false, message: 'That bounty is no longer active.' };
  }

  const bp = normalizeBountyProgress(state.bountyProgress, now);
  if (bp.claimed.includes(bounty.id)) {
    return { state, ok: false, message: 'You have already claimed this bounty reward.' };
  }

  const cur = bp.progress[bounty.id] ?? 0;
  if (cur < bounty.goal) {
    return {
      state,
      ok: false,
      message: `${bounty.title}: ${cur}/${bounty.goal} — complete it first to claim!`,
    };
  }

  const nextCoins = state.currencies.coins + bounty.rewardCoins;
  const nextGold = state.currencies.gold + bounty.rewardGold;
  const nextInv = state.inventory.map((i) => ({ ...i }));
  if (bounty.rewardReforgeStones > 0) {
    const existing = nextInv.find((i) => i.itemId === 'mat_reforge_stone');
    if (existing) existing.quantity += bounty.rewardReforgeStones;
    else {
      nextInv.push({
        itemId: 'mat_reforge_stone',
        quantity: bounty.rewardReforgeStones,
        itemLevel: 1,
        quality: 'normal',
      });
    }
  }

  const nextXp = state.xp + bounty.rewardXp;

  return {
    state: {
      ...state,
      xp: nextXp,
      coins: nextCoins,
      currencies: {
        ...state.currencies,
        coins: nextCoins,
        gold: nextGold,
      },
      inventory: nextInv,
      bountyProgress: {
        ...bp,
        claimed: [...bp.claimed, bounty.id],
      },
    },
    ok: true,
    bounty,
    message: `📋 Claimed ${bounty.icon} ${bounty.title}! +${bounty.rewardCoins} Coins · +${bounty.rewardGold} Gold · +${bounty.rewardReforgeStones}× Reforge Stone · +${bounty.rewardXp} XP!`,
  };
}
