import React, { useState } from 'react';
import type { PlayerState, SkillId } from '@shared/types';
import { getXpForNextLevel } from '@shared/balanceFormulas';
import {
  ALL_SKILL_IDS,
  RESPEC_COST_COINS,
  SKILL_LIST,
  getAvailableTalentPoints,
  getEarnedTalentPoints,
  type SkillCategory,
} from '@shared/skillTrees';
import { CheckCircle2, Coins, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface SkillTreeModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onUnlockTalent: (skillId: SkillId, talentId: string) => void;
  onRespecAll: () => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  open,
  player,
  onClose,
  onUnlockTalent,
  onRespecAll,
}) => {
  const [filter, setFilter] = useState<'all' | SkillCategory>('all');

  const totalLevels = ALL_SKILL_IDS.reduce(
    (sum, id) => sum + (player.skills.skills[id]?.level ?? 1),
    0
  );
  const totalUnlocked = ALL_SKILL_IDS.reduce(
    (sum, id) => sum + (player.skills.skills[id]?.unlockedTalents.length ?? 0),
    0
  );
  const totalAvailable = ALL_SKILL_IDS.reduce(
    (sum, id) => sum + getAvailableTalentPoints(player.skills.skills[id]),
    0
  );

  const visibleSkills = SKILL_LIST.filter(
    (skill) => filter === 'all' || skill.category === filter
  );

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="12-Skill RPG Mastery & Talents (K)"
      subtitle={`Total Skill Lv.${totalLevels} · Unspent Talent Points: ${totalAvailable} · Unlocked: ${totalUnlocked}`}
      maxWidthClass="w-[min(96vw,840px)]"
    >
      {/* Filter & Respec Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'All 12 Skills'],
              ['life', 'Life-Sim (6)'],
              ['combat', 'Combat (6)'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 transition ${
                filter === key
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-900/30 text-amber-950 font-display font-bold text-xs inline-flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            {player.currencies.coins.toLocaleString()}
          </span>
          <button
            type="button"
            disabled={totalUnlocked === 0 || player.currencies.coins < RESPEC_COST_COINS}
            onClick={onRespecAll}
            className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white border-2 border-rose-950 font-display font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-45 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Respec ({RESPEC_COST_COINS} Coins)
          </button>
        </div>
      </div>

      {/* Scrollable 12-Skill Grid (Mobile Friendly) */}
      <div className="grid md:grid-cols-2 gap-2.5 max-h-[60dvh] overflow-y-auto pr-1">
        {visibleSkills.map((def) => {
          const entry = player.skills.skills[def.id];
          const neededXp = getXpForNextLevel(entry.level);
          const xpPct = Math.min(100, Math.round((entry.xp / Math.max(1, neededXp)) * 100));
          const earnedPts = getEarnedTalentPoints(entry.level);
          const availPts = getAvailableTalentPoints(entry);

          return (
            <div
              key={def.id}
              className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 flex flex-col gap-2"
            >
              {/* Skill Title & Level */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl border-2 border-amber-950/30 flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${def.accentColor}22` }}
                  >
                    {def.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1.5 flex-wrap">
                      <span>{def.name}</span>
                      <span className="text-[10px] font-normal text-amber-800">({def.khmerName})</span>
                    </div>
                    <div className="text-[10px] text-amber-800/90 leading-snug">{def.perLevelSummary}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-xs text-amber-950">Lv.{entry.level}</div>
                  {availPts > 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" /> {availPts} PT
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-amber-800">
                      {entry.unlockedTalents.length}/{earnedPts} PT
                    </span>
                  )}
                </div>
              </div>

              {/* XP Bar */}
              <div className="space-y-0.5">
                <div className="w-full h-2 rounded-full bg-amber-950/20 border border-amber-950/30 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${xpPct}%`, backgroundColor: def.accentColor }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-semibold text-amber-900/80">
                  <span className="truncate pr-2">{def.howItLevels}</span>
                  <span className="shrink-0">
                    {entry.xp.toLocaleString()} / {neededXp.toLocaleString()} XP
                  </span>
                </div>
              </div>

              {/* 3 Starter Talent Nodes */}
              <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-amber-900/15">
                {def.talents.map((talent) => {
                  const unlocked = entry.unlockedTalents.includes(talent.id);
                  const canUnlock = !unlocked && entry.level >= talent.minLevel && availPts >= 1;
                  const levelLocked = entry.level < talent.minLevel;

                  return (
                    <button
                      key={talent.id}
                      type="button"
                      disabled={unlocked || !canUnlock}
                      onClick={() => onUnlockTalent(def.id, talent.id)}
                      className={`text-left p-2 rounded-lg border transition flex items-start justify-between gap-2 ${
                        unlocked
                          ? 'bg-emerald-100/90 border-emerald-700/60 text-emerald-950'
                          : canUnlock
                          ? 'bg-amber-100 hover:bg-amber-200 border-amber-700 text-amber-950 cursor-pointer ring-1 ring-amber-500/60'
                          : 'bg-amber-50/60 border-amber-900/20 text-amber-900/75 opacity-80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-[11px] flex items-center gap-1.5 flex-wrap">
                          <span>{talent.name}</span>
                          {talent.synergyTag && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-400/50 text-[9px]">
                              {talent.synergyTag}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] leading-snug opacity-90">{talent.description}</div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {unlocked ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : canUnlock ? (
                          <span className="px-2 py-0.5 rounded bg-amber-800 text-amber-50 text-[9px] font-bold whitespace-nowrap">
                            Unlock (1 PT)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-stone-300/80 text-stone-700 text-[9px] font-bold whitespace-nowrap">
                            <Lock className="w-2.5 h-2.5" /> {levelLocked ? `Lv.${talent.minLevel}` : '0 PT'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </NativeDialog>
  );
};
