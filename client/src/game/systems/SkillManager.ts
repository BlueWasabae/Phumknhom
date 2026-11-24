import type { PlayerState, SkillEntry, SkillId } from '@shared/types';
import { getXpForNextLevel } from '@shared/balanceFormulas';
import {
  ALL_SKILL_IDS,
  MAX_SKILL_LEVEL,
  RESPEC_COST_COINS,
  SKILL_DEFINITIONS,
  computeVillageToDungeonBridge,
  getAvailableTalentPoints,
  getEarnedTalentPoints,
} from '@shared/skillTrees';
import { getMuseumScholarPerks } from '@shared/museumCatalog';
import { EventBus } from '../EventBus';

export interface SkillXpResult {
  state: PlayerState;
  skillId: SkillId;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  talentPointGained: boolean;
}

export interface SkillActionResult {
  state: PlayerState;
  ok: boolean;
  message: string;
}

/**
 * Awards XP to one of the 12 independent skills (Lv. 1–100) using getXpForNextLevel(level).
 * Syncs lifeStats.farmLevel when skillId === 'farming' and recalculates derived bridge stats.
 */
export function awardSkillXp(
  state: PlayerState,
  skillId: SkillId,
  amount: number,
  emitToast = true
): SkillXpResult {
  const museumPerks = getMuseumScholarPerks(state.museumDonations);
  const safeXp = Math.max(0, Math.round(amount * (1 + museumPerks.skillXpBonusPct)));
  const curEntry = state.skills.skills[skillId];
  if (!curEntry || safeXp <= 0) {
    return {
      state,
      skillId,
      xpGained: 0,
      leveledUp: false,
      newLevel: curEntry?.level ?? 1,
      talentPointGained: false,
    };
  }

  let level = curEntry.level;
  let xp = curEntry.xp + safeXp;
  const prevPoints = getEarnedTalentPoints(level);

  while (level < MAX_SKILL_LEVEL && xp >= getXpForNextLevel(level)) {
    xp -= getXpForNextLevel(level);
    level += 1;
  }
  if (level >= MAX_SKILL_LEVEL) {
    level = MAX_SKILL_LEVEL;
    xp = Math.min(xp, getXpForNextLevel(MAX_SKILL_LEVEL));
  }

  const leveledUp = level > curEntry.level;
  const talentPointGained = getEarnedTalentPoints(level) > prevPoints;

  const nextSkills: Record<SkillId, SkillEntry> = {
    ...state.skills.skills,
    [skillId]: {
      ...curEntry,
      level,
      xp,
    },
  };

  let nextState: PlayerState = {
    ...state,
    skills: { skills: nextSkills },
    lifeStats:
      skillId === 'farming'
        ? { ...state.lifeStats, farmLevel: level, farmXp: xp }
        : { ...state.lifeStats },
  };

  // Sync live derived skillDamagePct & snackBuffPct for HUD previews
  const bridge = computeVillageToDungeonBridge(nextState);
  nextState = {
    ...nextState,
    skillDamagePct: bridge.classSkillDamagePct,
    snackBuffPct: bridge.snackAttackPct,
  };

  if (emitToast) {
    const def = SKILL_DEFINITIONS[skillId];
    EventBus.emit('skill:xpGained', {
      skillId,
      skillName: def.name,
      icon: def.icon,
      xp: safeXp,
      level,
      leveledUp,
      talentPointGained,
    });
  }

  return {
    state: nextState,
    skillId,
    xpGained: safeXp,
    leveledUp,
    newLevel: level,
    talentPointGained,
  };
}

export function unlockSkillTalent(
  state: PlayerState,
  skillId: SkillId,
  talentId: string
): SkillActionResult {
  const def = SKILL_DEFINITIONS[skillId];
  const entry = state.skills.skills[skillId];
  const talent = def?.talents.find((t) => t.id === talentId);
  if (!def || !entry || !talent) {
    return { state, ok: false, message: 'Unknown skill talent.' };
  }
  if (entry.unlockedTalents.includes(talentId)) {
    return { state, ok: false, message: `${talent.name} is already unlocked!` };
  }
  if (entry.level < talent.minLevel) {
    return {
      state,
      ok: false,
      message: `Requires ${def.name} Lv.${talent.minLevel} (currently Lv.${entry.level}).`,
    };
  }
  const available = getAvailableTalentPoints(entry);
  if (available < 1) {
    return { state, ok: false, message: `No available Talent Points for ${def.name}.` };
  }

  const nextSkills: Record<SkillId, SkillEntry> = {
    ...state.skills.skills,
    [skillId]: {
      ...entry,
      unlockedTalents: [...entry.unlockedTalents, talentId],
    },
  };

  const nextStateBase: PlayerState = {
    ...state,
    skills: { skills: nextSkills },
  };
  const bridge = computeVillageToDungeonBridge(nextStateBase);
  const nextState: PlayerState = {
    ...nextStateBase,
    skillDamagePct: bridge.classSkillDamagePct,
    snackBuffPct: bridge.snackAttackPct,
  };

  return {
    state: nextState,
    ok: true,
    message: `Unlocked ${def.icon} ${talent.name} (${def.name})!`,
  };
}

export function respecAllSkills(state: PlayerState): SkillActionResult {
  let totalUnlocked = 0;
  for (const id of ALL_SKILL_IDS) {
    totalUnlocked += state.skills.skills[id]?.unlockedTalents.length ?? 0;
  }
  if (totalUnlocked === 0) {
    return { state, ok: false, message: 'No talents are currently unlocked to respec.' };
  }
  if (state.currencies.coins < RESPEC_COST_COINS) {
    return {
      state,
      ok: false,
      message: `Need ${RESPEC_COST_COINS.toLocaleString()} Coins to respec all talents.`,
    };
  }

  const nextCoins = state.currencies.coins - RESPEC_COST_COINS;
  const resetSkills = { ...state.skills.skills };
  for (const id of ALL_SKILL_IDS) {
    resetSkills[id] = {
      ...resetSkills[id],
      unlockedTalents: [],
    };
  }

  const nextStateBase: PlayerState = {
    ...state,
    coins: nextCoins,
    currencies: { ...state.currencies, coins: nextCoins },
    skills: { skills: resetSkills },
  };
  const bridge = computeVillageToDungeonBridge(nextStateBase);

  return {
    state: {
      ...nextStateBase,
      skillDamagePct: bridge.classSkillDamagePct,
      snackBuffPct: bridge.snackAttackPct,
    },
    ok: true,
    message: `Refunded ${totalUnlocked} Talent Point${totalUnlocked === 1 ? '' : 's'} for ${RESPEC_COST_COINS} Coins!`,
  };
}
