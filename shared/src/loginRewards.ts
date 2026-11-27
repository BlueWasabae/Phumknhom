import type { PlayerState } from './types';

/**
 * Update 2.1 — 7-Day Login Streak Calendar for ភូមិខ្ញុំ (Phum Khnhom)
 * Day 1: 250 Coins
 * Day 2: 3x Pink Lotus Seeds + 1x Boss Essence
 * Day 3: 2x Reforge Stones
 * Day 4: 500 Coins + 1x Torn Angkor Treasure Map
 * Day 5: 25 Diamonds
 * Day 6: 5x Golden Durian Seeds + 3x Reforge Stones
 * Day 7 (Grand Streak): 100 Diamonds + Golden Krama Scarf vanity item
 */

export interface DailyLoginRewardDef {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  khmerTitle: string;
  icon: string;
  coins: number;
  diamonds: number;
  items: Array<{ itemId: string; quantity: number; label: string }>;
  summary: string;
  isGrand?: boolean;
}

export const DAILY_LOGIN_REWARDS: DailyLoginRewardDef[] = [
  {
    day: 1,
    title: 'Village Welcome',
    khmerTitle: 'ស្វាគមន៍ថ្ងៃទី ១',
    icon: '🪙',
    coins: 250,
    diamonds: 0,
    items: [],
    summary: '250 Coins',
  },
  {
    day: 2,
    title: 'Spirit Seed Pouch',
    khmerTitle: 'គ្រាប់ផ្កាឈូក និងធាតុបិសាច',
    icon: '🪷',
    coins: 0,
    diamonds: 0,
    items: [
      { itemId: 'seed_pink_lotus', quantity: 3, label: 'Pink Lotus Seeds' },
      { itemId: 'essence_slime', quantity: 1, label: 'Boss Essence' },
    ],
    summary: '3× Pink Lotus Seeds + 1× Boss Essence',
  },
  {
    day: 3,
    title: 'Blacksmith Stones',
    khmerTitle: 'ថ្មកែច្នៃអាវុធ',
    icon: '🔨',
    coins: 0,
    diamonds: 0,
    items: [{ itemId: 'mat_reforge_stone', quantity: 2, label: 'Reforge Stones' }],
    summary: '2× Reforge Stones',
  },
  {
    day: 4,
    title: 'Explorer Stash',
    khmerTitle: 'ផែនទីកំណប់អង្គរ',
    icon: '🗺️',
    coins: 500,
    diamonds: 0,
    items: [{ itemId: 'item_torn_treasure_map', quantity: 1, label: 'Torn Angkor Treasure Map' }],
    summary: '500 Coins + 1× Torn Angkor Treasure Map',
  },
  {
    day: 5,
    title: 'Royal Gem Gift',
    khmerTitle: 'ពេជ្រសំណាង',
    icon: '💎',
    coins: 0,
    diamonds: 25,
    items: [],
    summary: '25 Diamonds',
  },
  {
    day: 6,
    title: 'Golden Orchard Pack',
    khmerTitle: 'គ្រាប់ធុរេនមាស និងថ្មកែច្នៃ',
    icon: '🍈',
    coins: 0,
    diamonds: 0,
    items: [
      { itemId: 'seed_kampot_pepper', quantity: 5, label: 'Golden Durian & Kampot Seeds' },
      { itemId: 'mat_reforge_stone', quantity: 3, label: 'Reforge Stones' },
    ],
    summary: '5× Golden Durian Seeds + 3× Reforge Stones',
  },
  {
    day: 7,
    title: 'Grand 7-Day Streak',
    khmerTitle: 'ក្រមាមាសអង្គរ',
    icon: '🧣',
    coins: 0,
    diamonds: 100,
    items: [{ itemId: 'wings_golden_krama_scarf', quantity: 1, label: 'Golden Krama Scarf' }],
    summary: '100 Diamonds + Golden Krama Scarf (Vanity)',
    isGrand: true,
  },
];

export function getCalendarDateKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyLoginStatus(state: PlayerState, now = Date.now()): {
  todayKey: string;
  claimedToday: boolean;
  claimedDays: number[];
  nextClaimDay: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  streak: number;
} {
  const todayKey = getCalendarDateKey(now);
  const rawClaimed = Array.isArray(state.claimedLoginDays) ? [...state.claimedLoginDays] : [];
  const claimedToday = state.lastLoginDate === todayKey;

  // After claiming all 7 days, start a fresh 7-day cycle the next day
  const cycleClaimed = !claimedToday && rawClaimed.length >= 7 ? [] : rawClaimed;
  const nextDayNum = Math.min(7, cycleClaimed.length + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  const streak = Math.max(state.loginStreak ?? 0, cycleClaimed.length);

  return {
    todayKey,
    claimedToday,
    claimedDays: cycleClaimed,
    nextClaimDay: nextDayNum,
    streak,
  };
}

export function claimDailyLoginReward(
  state: PlayerState,
  now = Date.now()
): { state: PlayerState; ok: boolean; message: string; reward?: DailyLoginRewardDef } {
  const status = getDailyLoginStatus(state, now);
  if (status.claimedToday) {
    return {
      state,
      ok: false,
      message: '✓ You already claimed today’s Daily Login Reward! Return tomorrow to keep your streak!',
    };
  }

  const reward = DAILY_LOGIN_REWARDS.find((r) => r.day === status.nextClaimDay) ?? DAILY_LOGIN_REWARDS[0];
  const nextCoins = state.currencies.coins + reward.coins;
  const nextDiamonds = state.currencies.diamonds + reward.diamonds;
  const nextInv = state.inventory.map((i) => ({ ...i }));

  for (const drop of reward.items) {
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

  const nextClaimedDays = [...status.claimedDays, reward.day];
  const nextStreak = (state.loginStreak ?? 0) + 1;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: {
        ...state.currencies,
        coins: nextCoins,
        diamonds: nextDiamonds,
      },
      inventory: nextInv,
      loginStreak: nextStreak,
      lastLoginDate: status.todayKey,
      claimedLoginDays: nextClaimedDays,
    },
    ok: true,
    reward,
    message: `📅 Day ${reward.day} Login Claimed! ${reward.icon} ${reward.summary}!`,
  };
}
