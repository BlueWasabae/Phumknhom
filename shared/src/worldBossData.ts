import { rollChaseDropForSource } from './raritySystem';

export type ColossusRarityDrop = NonNullable<ReturnType<typeof rollChaseDropForSource>>;

export const WORLD_BOSS_ID = 'ancient_naga_colossus' as const;
export const WORLD_BOSS_NAME = 'Ancient Naga Colossus';
export const WORLD_BOSS_KHMER_NAME = 'មហានាគរាជបុរាណអង្គរ';
export const WORLD_BOSS_INTERVAL_MS = 2 * 60 * 60 * 1000; // Every 2 hours
export const WORLD_BOSS_DURATION_MS = 15 * 60 * 1000;     // 15-minute raid window
export const WORLD_BOSS_SERVER_MAX_HP = 1_200_000;        // Shared server HP pool (20 players)
export const WORLD_BOSS_SOLO_PREVIEW_HP = 28_000;         // Solo/offline preview HP so single tester can finish raid
export const WORLD_BOSS_MAX_PLAYERS = 20;

export const WORLD_BOSS_ALERT_BANNER =
  '⚠️ WORLD BOSS ALERT: The Ancient Naga Colossus has awakened in the Sunken Ruins! All heroes unite!';

export const COLOSSUS_SLAYER_TITLE = 'Colossus Slayer';
export const COLOSSUS_SLAYER_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface WorldBossLeaderboardRow {
  sessionId: string;
  name: string;
  damage: number;
  damagePct: number;
  rank: number;
}

export interface WorldBossStatusSnapshot {
  active: boolean;
  raidId: string;
  hp: number;
  maxHp: number;
  playerCount: number;
  maxPlayers: number;
  exposedHeartActive: boolean;
  exposedHeartRemainingMs: number;
  startedAt: number;
  endsAt: number;
  remainingMs: number;
  nextScheduledAt: number;
  topDamagers: WorldBossLeaderboardRow[];
}

export interface ColossusRaidChestReward {
  qualified: boolean;
  rank: number | null; // 1, 2, 3 for Top 3
  isTop3: boolean;
  damageDealt: number;
  damagePct: number;
  survivedSec: number;
  coins: number;
  gold: number;
  reforgeStones: number;
  bossEssenceQty: number;
  colossusSlayerTitleGranted: boolean;
  exclusiveDrop: {
    itemId: 'hat_ancient_naga_sovereign_crown' | 'wings_mythic_naga_scale';
    name: string;
    rarity: 'ancient' | 'mythic';
    icon: string;
  } | null;
  rarityRollDrop: ColossusRarityDrop | null;
  summary: string;
}

/**
 * Fair Damage & Participation Rewards for the Ancient Naga Colossus Raid:
 * - Qualified if player dealt >= 1% of boss HP OR survived >= 60 seconds in the arena.
 * - Grants Coins, Gold, Naga Boss Essence, Reforge Stones (2x bonus for Top 3!),
 *   temporary "Colossus Slayer" overhead title for Top 3, and exclusive rare rolls:
 *   0.15% Ancient Naga Sovereign Crown & 0.50% Mythic Naga Scale Wings + 7-Tier Rarity roll.
 */
export function rollColossusRaidChest(input: {
  damageDealt: number;
  bossMaxHp: number;
  survivedSec: number;
  rank: number | null;
  rng?: () => number;
}): ColossusRaidChestReward {
  const rng = input.rng ?? Math.random;
  const maxHp = Math.max(1, input.bossMaxHp);
  const damagePct = Math.min(100, (Math.max(0, input.damageDealt) / maxHp) * 100);
  const qualified = damagePct >= 1.0 || input.survivedSec >= 60;
  const isTop3 = qualified && input.rank !== null && input.rank >= 1 && input.rank <= 3;

  if (!qualified) {
    return {
      qualified: false,
      rank: input.rank,
      isTop3: false,
      damageDealt: Math.floor(input.damageDealt),
      damagePct: Math.round(damagePct * 100) / 100,
      survivedSec: Math.floor(input.survivedSec),
      coins: 150,
      gold: 0,
      reforgeStones: 0,
      bossEssenceQty: 0,
      colossusSlayerTitleGranted: false,
      exclusiveDrop: null,
      rarityRollDrop: null,
      summary: 'Participated in Colossus Raid (+150 Coins consolation — deal 1%+ dmg or survive 60s for full Colossus Chest!).',
    };
  }

  const baseCoins = 1400 + Math.floor(rng() * 600) + (isTop3 ? 600 : 0);
  const gold = isTop3 ? 5 : 3;
  const baseReforgeStones = 2;
  const reforgeStones = isTop3 ? baseReforgeStones * 2 : baseReforgeStones; // 2x bonus Reforge Stones for Top 3!
  const bossEssenceQty = isTop3 ? 2 : 1;

  // Exclusive Colossus chase roll: 0.15% Ancient Naga Sovereign Crown, 0.50% Mythic Naga Scale Wings
  const chaseRoll = rng() * 100;
  let exclusiveDrop: ColossusRaidChestReward['exclusiveDrop'] = null;
  if (chaseRoll < 0.15) {
    exclusiveDrop = {
      itemId: 'hat_ancient_naga_sovereign_crown',
      name: 'Ancient Naga Sovereign Crown',
      rarity: 'ancient',
      icon: '👑',
    };
  } else if (chaseRoll < 0.65) {
    exclusiveDrop = {
      itemId: 'wings_mythic_naga_scale',
      name: 'Mythic Naga Scale Wings',
      rarity: 'mythic',
      icon: '🐉',
    };
  }

  // Standard 7-Tier Rarity bonus drop roll
  const rarityRollDrop = rollChaseDropForSource('boss', 1.4, rng);

  const extraParts: string[] = [];
  if (exclusiveDrop) extraParts.push(`${exclusiveDrop.icon} ${exclusiveDrop.name} (${exclusiveDrop.rarity.toUpperCase()}!)`);
  if (rarityRollDrop) extraParts.push(`${rarityRollDrop.icon} ${rarityRollDrop.name}`);
  if (isTop3) extraParts.push(`🏆 Top #${input.rank} Bonus: 2× Reforge Stones & "${COLOSSUS_SLAYER_TITLE}" Title!`);

  return {
    qualified: true,
    rank: input.rank,
    isTop3,
    damageDealt: Math.floor(input.damageDealt),
    damagePct: Math.round(damagePct * 100) / 100,
    survivedSec: Math.floor(input.survivedSec),
    coins: baseCoins,
    gold,
    reforgeStones,
    bossEssenceQty,
    colossusSlayerTitleGranted: isTop3,
    exclusiveDrop,
    rarityRollDrop,
    summary: `🏺 Colossus Raid Chest: +${baseCoins.toLocaleString()}c · +${gold} Gold · +${bossEssenceQty}× Naga Essence · +${reforgeStones}× Reforge Stones${
      extraParts.length > 0 ? ` · ${extraParts.join(' · ')}` : ''
    }`,
  };
}
