/**
 * Update 2.0 — Launch Gift Code Redemption & Friend Invite Referral Service
 * Pre-seeded Launch Codes:
 * - PHUM2026   -> 500 Coins + 2 Reforge Stones
 * - ANGKOR100  -> 100 Diamonds
 * - KHMERHERO  -> Exclusive Launch Cape (wings_launch_cape)
 * Friend Invite Link:
 * - https://www.bluexacedamy.space/?ref=<Username>
 * - Awards 300 Bonus Coins to both the new player and the inviting friend!
 */

export interface PromoRewardSpec {
  code: string;
  title: string;
  coins: number;
  gold: number;
  diamonds: number;
  items: Array<{ itemId: string; quantity: number; label: string }>;
  summary: string;
}

export const LAUNCH_GIFT_CODES: Record<string, PromoRewardSpec> = {
  PHUM2026: {
    code: 'PHUM2026',
    title: 'Phum Khnhom 2026 Launch Pack',
    coins: 500,
    gold: 0,
    diamonds: 0,
    items: [{ itemId: 'mat_reforge_stone', quantity: 2, label: 'Reforge Stone' }],
    summary: '+500 Coins & 2× Reforge Stones',
  },
  ANGKOR100: {
    code: 'ANGKOR100',
    title: 'Angkor Diamond Celebration',
    coins: 0,
    gold: 0,
    diamonds: 100,
    items: [],
    summary: '+100 Diamonds',
  },
  KHMERHERO: {
    code: 'KHMERHERO',
    title: 'Founder Hero Launch Cape',
    coins: 0,
    gold: 0,
    diamonds: 0,
    items: [{ itemId: 'wings_launch_cape', quantity: 1, label: 'Exclusive Launch Cape' }],
    summary: 'Exclusive Launch Cape (Vanity Back)',
  },
};

export interface ReferralRewardRecord {
  referrerUsername: string;
  referredUsername: string;
  bonusCoins: number;
  claimedAt: number;
}

// Track redeemed codes per playerId/username in-memory on top of player profile persistence
const redeemedByAccount = new Map<string, Set<string>>();
// Track pending friend-invite bonuses waiting for the referrer to claim/receive
const pendingReferralCoinsByUsername = new Map<string, number>();
const referralLog: ReferralRewardRecord[] = [];

export function redeemPromoCode(input: {
  accountKey: string;
  rawCode: string;
  alreadyRedeemed?: string[];
}): { ok: true; reward: PromoRewardSpec; redeemedCodes: string[] } | { ok: false; error: string } {
  const code = (input.rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!code) {
    return { ok: false, error: 'Please enter a Gift Code (e.g. PHUM2026).' };
  }

  const reward = LAUNCH_GIFT_CODES[code];
  if (!reward) {
    return { ok: false, error: `Invalid or expired gift code "${code}".` };
  }

  const key = (input.accountKey || 'guest').trim().toLowerCase();
  let set = redeemedByAccount.get(key);
  if (!set) {
    set = new Set<string>();
    redeemedByAccount.set(key, set);
  }
  for (const prev of input.alreadyRedeemed ?? []) {
    set.add(prev.toUpperCase());
  }

  if (set.has(code)) {
    return { ok: false, error: `Gift code "${code}" has already been redeemed on this account!` };
  }

  set.add(code);
  return {
    ok: true,
    reward,
    redeemedCodes: Array.from(set),
  };
}

export function recordFriendReferralBonus(input: {
  referrerUsername: string;
  newPlayerUsername: string;
}): { ok: true; bonusCoins: number; referrerUsername: string } | { ok: false; error: string } {
  const ref = (input.referrerUsername || '').trim().slice(0, 24);
  const joined = (input.newPlayerUsername || '').trim().slice(0, 24);
  if (!ref || !joined) {
    return { ok: false, error: 'Missing referrer or new player username.' };
  }
  if (ref.toLowerCase() === joined.toLowerCase()) {
    return { ok: false, error: 'Cannot use your own referral link.' };
  }

  const alreadyClaimed = referralLog.some(
    (r) => r.referredUsername.toLowerCase() === joined.toLowerCase()
  );
  if (alreadyClaimed) {
    return { ok: false, error: 'Referral welcome bonus already claimed.' };
  }

  const bonusCoins = 300;
  const refKey = ref.toLowerCase();
  pendingReferralCoinsByUsername.set(
    refKey,
    (pendingReferralCoinsByUsername.get(refKey) ?? 0) + bonusCoins
  );
  referralLog.push({
    referrerUsername: ref,
    referredUsername: joined,
    bonusCoins,
    claimedAt: Date.now(),
  });

  return { ok: true, bonusCoins, referrerUsername: ref };
}

export function popPendingReferralCoins(username: string): number {
  const key = (username || '').trim().toLowerCase();
  if (!key) return 0;
  const amt = pendingReferralCoinsByUsername.get(key) ?? 0;
  if (amt > 0) pendingReferralCoinsByUsername.delete(key);
  return amt;
}
