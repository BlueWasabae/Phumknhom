import type { PlayerState } from './types';

/**
 * Update 2.1 — Account Achievement Badges (12 Milestones across all pillars of ភូមិខ្ញុំ)
 * Unlocking awards 10–50 Diamonds and unlocks a wearable Badge Icon displayed next to
 * the player's overhead name in the Plaza & Farm!
 */

export type AchievementId =
  | 'first_harvest'
  | 'master_angler'
  | 'cavern_delver'
  | 'fashion_icon'
  | 'krom_founder'
  | 'boss_rush_sovereign'
  | 'museum_curator'
  | 'village_cheerleader'
  | 'pagoda_climber'
  | 'khmer_chef'
  | 'bounty_hunter'
  | 'lotus_bonded'
  | 'party_host';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  khmerName: string;
  icon: string;
  category: 'Village' | 'Combat' | 'Social' | 'Collection';
  description: string;
  rewardDiamonds: number;
}

export const ACHIEVEMENT_LIST: AchievementDef[] = [
  {
    id: 'first_harvest',
    name: 'First Harvest',
    khmerName: 'ផលដំណាំដំបូង',
    icon: '🌾',
    category: 'Village',
    description: 'Harvest your first crop on your Khmer Homestead or Shared Co-op Farm.',
    rewardDiamonds: 15,
  },
  {
    id: 'master_angler',
    name: 'Master Angler',
    khmerName: 'អ្នកនេសាទជំនាញ',
    icon: '🎣',
    category: 'Village',
    description: 'Reel in a fresh catch at the Mekong Pier or reach Fishing Lv. 2.',
    rewardDiamonds: 20,
  },
  {
    id: 'cavern_delver',
    name: 'Cavern Delver',
    khmerName: 'អ្នករុករកល្អាងអង្គរ',
    icon: '⛏️',
    category: 'Village',
    description: 'Shatter an ancient ore vein inside the Explorable Caverns or reach Mining Lv. 2.',
    rewardDiamonds: 20,
  },
  {
    id: 'khmer_chef',
    name: 'Khmer Street Chef',
    khmerName: 'ចុងភៅម្ហូបខ្មែរ',
    icon: '🍜',
    category: 'Village',
    description: 'Cook or enjoy a Khmer street snack for a combat & speed boost.',
    rewardDiamonds: 15,
  },
  {
    id: 'fashion_icon',
    name: 'Fashion Icon',
    khmerName: 'តារាម៉ូដភូមិខ្ញុំ',
    icon: '👑',
    category: 'Collection',
    description: 'Strut the Weekly Fashion Runway or reach 250+ Stylish Score.',
    rewardDiamonds: 25,
  },
  {
    id: 'museum_curator',
    name: 'Museum Curator',
    khmerName: 'អ្នកថែរក្សាសារមន្ទីរ',
    icon: '🏛️',
    category: 'Collection',
    description: 'Donate at least 1 ancient relic to the Angkor Relic Museum.',
    rewardDiamonds: 30,
  },
  {
    id: 'bounty_hunter',
    name: 'Bounty Hunter',
    khmerName: 'អ្នកប្រមាញ់ភារកិច្ច',
    icon: '📋',
    category: 'Collection',
    description: 'Claim your first Daily or Weekly Bounty reward from the Plaza Bounty Board.',
    rewardDiamonds: 20,
  },
  {
    id: 'krom_founder',
    name: 'Krom Founder',
    khmerName: 'សមាជិកក្រុមភូមិ',
    icon: '🛡️',
    category: 'Social',
    description: 'Create or join a Khmer Krom Guild/Clan with a custom [TAG].',
    rewardDiamonds: 25,
  },
  {
    id: 'village_cheerleader',
    name: 'Village Cheerleader',
    khmerName: 'អ្នកលើកទឹកចិត្តភូមិ',
    icon: '🥖',
    category: 'Social',
    description: 'Drop a Hot Num Pang Village Cheer care package via the Scrying Mirror.',
    rewardDiamonds: 20,
  },
  {
    id: 'lotus_bonded',
    name: 'Lotus Bonded',
    khmerName: 'ចំណងផ្កាឈូកមិត្តភាព',
    icon: '💖',
    category: 'Social',
    description: 'Seal a Lotus Bond Ring with a Best Friend or Partner.',
    rewardDiamonds: 30,
  },
  {
    id: 'pagoda_climber',
    name: 'Pagoda Climber',
    khmerName: 'អ្នកឡើងប្រាសាទសាកល្បង',
    icon: '🗼',
    category: 'Combat',
    description: 'Clear at least Floor 1 of the Endless 50-Floor Pagoda Tower.',
    rewardDiamonds: 30,
  },
  {
    id: 'boss_rush_sovereign',
    name: 'Boss Rush Sovereign',
    khmerName: 'អធិរាជសង្គ្រាមអង្គរ',
    icon: '⚡',
    category: 'Combat',
    description: 'Conquer the 6-Boss Mythic Boss Rush Gauntlet or defeat Krong Reap.',
    rewardDiamonds: 50,
  },
  {
    id: 'party_host',
    name: 'Party Host',
    khmerName: 'ម្ចាស់ពិធីជប់លៀងភូមិ',
    icon: '🎆',
    category: 'Social',
    description: 'Host a Village Lantern or Angkor Grand Firework Party with Shared Feast snacks!',
    rewardDiamonds: 25,
  },
];

export const ACHIEVEMENTS_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_LIST.map((a) => [a.id, a])
) as Record<AchievementId, AchievementDef>;

export function getAchievementBadgeIcon(badgeId?: string | null): string {
  if (!badgeId) return '';
  const def = ACHIEVEMENTS_BY_ID[badgeId as AchievementId];
  return def ? def.icon : '';
}

/**
 * Evaluates both passive state-based achievements and explicit trigger IDs,
 * awarding Diamonds automatically for any newly unlocked achievements.
 */
export function evaluateAchievements(
  state: PlayerState,
  explicitTriggers: AchievementId[] = []
): { state: PlayerState; newlyUnlocked: AchievementDef[] } {
  const unlocked = new Set<string>(state.unlockedAchievements ?? []);
  const candidates = new Set<AchievementId>(explicitTriggers);

  if (state.lifeStats.stylish >= 250 || state.runwayIconBadge) candidates.add('fashion_icon');
  if ((state.museumDonations ?? []).length >= 1) candidates.add('museum_curator');
  if (state.kromTag || state.kromId) candidates.add('krom_founder');
  if (state.bondPartner?.status === 'accepted') candidates.add('lotus_bonded');
  if ((state.highestTowerFloor ?? 0) >= 1) candidates.add('pagoda_climber');
  if (
    Boolean(state.bestBossRushTimeMs && state.bestBossRushTimeMs > 0) ||
    state.clearedBosses.includes('krong_reap')
  ) {
    candidates.add('boss_rush_sovereign');
  }
  if ((state.bountyProgress?.claimed ?? []).length >= 1) candidates.add('bounty_hunter');
  if ((state.skills?.skills?.fishing?.level ?? 1) >= 2) candidates.add('master_angler');
  if ((state.skills?.skills?.mining?.level ?? 1) >= 2) candidates.add('cavern_delver');

  const newlyUnlocked: AchievementDef[] = [];
  let bonusDiamonds = 0;

  for (const id of candidates) {
    if (!unlocked.has(id) && ACHIEVEMENTS_BY_ID[id]) {
      const def = ACHIEVEMENTS_BY_ID[id];
      unlocked.add(id);
      newlyUnlocked.push(def);
      bonusDiamonds += def.rewardDiamonds;
    }
  }

  if (newlyUnlocked.length === 0) {
    return { state, newlyUnlocked: [] };
  }

  return {
    state: {
      ...state,
      currencies: {
        ...state.currencies,
        diamonds: state.currencies.diamonds + bonusDiamonds,
      },
      unlockedAchievements: Array.from(unlocked),
      equippedBadgeId: state.equippedBadgeId ?? newlyUnlocked[0].id,
    },
    newlyUnlocked,
  };
}
