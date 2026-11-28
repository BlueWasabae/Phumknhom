import React, { useMemo, useState } from 'react';
import type { BossId, PlayerState } from '@shared/types';
import { KHMER_BOSS_LIST } from '@shared/khmerBosses';
import {
  BOSS_HUNT_MISSIONS,
  GRAND_CHRONICLER_AURA,
  GRAND_CHRONICLER_DIAMONDS,
  GRAND_CHRONICLER_TITLE,
  getBossJournalCondition,
} from '@shared/artisanCrafts';
import { RARITY_TIERS, getRarityTierDef, formatDropRatePct } from '@shared/raritySystem';
import { BookOpen, Compass, Crown, MapPin, Shield, Sparkles, Target, Trophy } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ExplorerJournalModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onTrackBoss: (bossId: BossId | null, hintText: string) => void;
  onClaimGrandReward: () => void;
}

const CONDITION_STYLES: Record<'Night' | 'Monsoon' | 'Rare Shrine' | 'Mission', string> = {
  Night: 'bg-indigo-900 text-indigo-100 border-indigo-500/60',
  Monsoon: 'bg-cyan-900 text-cyan-100 border-cyan-500/60',
  'Rare Shrine': 'bg-amber-800 text-amber-100 border-amber-400/60',
  Mission: 'bg-rose-900 text-rose-100 border-rose-400/60',
};

function inferDropRarity(chanceNormal: number): keyof typeof RARITY_TIERS {
  if (chanceNormal <= 0.0025) return 'ancient';
  if (chanceNormal <= 0.015) return 'mythic';
  if (chanceNormal <= 0.06) return 'legendary';
  if (chanceNormal <= 0.16) return 'epic';
  if (chanceNormal <= 0.35) return 'rare';
  if (chanceNormal < 1) return 'uncommon';
  return 'common';
}

export const ExplorerJournalModal: React.FC<ExplorerJournalModalProps> = ({
  open,
  player,
  onClose,
  onTrackBoss,
  onClaimGrandReward,
}) => {
  const [tab, setTab] = useState<'compendium' | 'missions'>('compendium');
  const [filter, setFilter] = useState<'all' | 'discovered' | 'undiscovered'>('all');

  const sortedBosses = useMemo(
    () => [...KHMER_BOSS_LIST].sort((a, b) => a.rosterNumber - b.rosterNumber),
    []
  );

  const discoveredSet = useMemo(() => {
    const set = new Set<string>(player.discoveredBosses ?? ['sdech_kongkaeb']);
    (player.clearedBosses ?? []).forEach((id) => set.add(id));
    Object.keys(player.bossDefeats ?? {}).forEach((id) => {
      if ((player.bossDefeats[id] ?? 0) > 0) set.add(id);
    });
    return set;
  }, [player.discoveredBosses, player.clearedBosses, player.bossDefeats]);

  const defeatedCount = useMemo(
    () =>
      sortedBosses.filter(
        (b) => (player.clearedBosses ?? []).includes(b.id) || (player.bossDefeats?.[b.id] ?? 0) > 0
      ).length,
    [sortedBosses, player.clearedBosses, player.bossDefeats]
  );

  const discoveredCount = discoveredSet.size;
  const totalBosses = sortedBosses.length;
  const allComplete = discoveredCount >= totalBosses && defeatedCount >= totalBosses;
  const grandClaimed = Boolean(player.grandChroniclerClaimed);

  const visibleBosses = useMemo(() => {
    return sortedBosses.filter((b) => {
      const isDisc = discoveredSet.has(b.id);
      if (filter === 'discovered') return isDisc;
      if (filter === 'undiscovered') return !isDisc;
      return true;
    });
  }, [sortedBosses, discoveredSet, filter]);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="📖 24-Boss Explorer's Journal & Hunt Tracker [J]"
      subtitle={`Discovered ${discoveredCount}/${totalBosses} · Defeated ${defeatedCount}/${totalBosses} · Track World Shrines, Weather Encounters & Boss Missions`}
      maxWidthClass="w-[min(96vw,900px)]"
    >
      {/* Grand 24/24 Completion Milestone Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-amber-50 border-2 border-amber-400/70 mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="font-display font-bold text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-yellow-300" />
            Grand 24/24 Chronicler Milestone — {discoveredCount}/{totalBosses} Found · {defeatedCount}/{totalBosses} Defeated
          </div>
          <div className="text-[10px] sm:text-[11px] text-amber-100/90">
            Reward: Title <strong>“{GRAND_CHRONICLER_TITLE}”</strong> · 💎{' '}
            <strong>{GRAND_CHRONICLER_DIAMONDS} Diamonds</strong> · Blooming{' '}
            <strong>{GRAND_CHRONICLER_AURA}</strong>
          </div>
        </div>
        {grandClaimed ? (
          <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-display font-bold text-xs border border-emerald-300/60">
            ✓ Grand Chronicler Unlocked!
          </span>
        ) : (
          <button
            type="button"
            disabled={!allComplete}
            onClick={onClaimGrandReward}
            className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 ${
              allComplete
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-yellow-100 animate-pulse cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-600 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {allComplete ? 'Claim 24/24 Grand Reward!' : `${totalBosses - defeatedCount} Left to Defeat`}
          </button>
        )}
      </div>

      {/* Top Tabs & Compendium Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setTab('compendium')}
            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'compendium'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> 24-Boss Compendium
          </button>
          <button
            type="button"
            onClick={() => setTab('missions')}
            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'missions'
                ? 'bg-rose-800 text-rose-50 border-rose-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <Target className="w-3.5 h-3.5" /> Active Boss Hunt Missions ({BOSS_HUNT_MISSIONS.length})
          </button>
        </div>

        {tab === 'compendium' && (
          <div className="flex gap-1 text-[10px] font-display font-bold">
            {(['all', 'discovered', 'undiscovered'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer capitalize ${
                  filter === f
                    ? 'bg-amber-900 text-amber-50 border-amber-950'
                    : 'bg-amber-50 text-amber-900 border-amber-900/30 hover:bg-amber-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: 24-BOSS COMPENDIUM */}
      {tab === 'compendium' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[54vh] overflow-y-auto pr-1">
          {visibleBosses.map((boss) => {
            const isDiscovered = discoveredSet.has(boss.id);
            const kills = player.bossDefeats?.[boss.id] ?? ((player.clearedBosses ?? []).includes(boss.id) ? 1 : 0);
            const isDefeated = kills > 0;
            const isTracked = player.trackedBossId === boss.id;
            const meta = getBossJournalCondition(boss);

            if (!isDiscovered) {
              return (
                <div
                  key={boss.id}
                  className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2 transition ${
                    isTracked
                      ? 'bg-slate-950 text-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/60'
                      : 'bg-slate-900 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Mysterious Dark Silhouette Portrait */}
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 relative overflow-hidden">
                      <span
                        className="text-2xl select-none"
                        style={{ filter: 'brightness(0) contrast(200%)', opacity: 0.72 }}
                        aria-hidden="true"
                      >
                        {boss.trophyIcon}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center font-display font-black text-xs text-amber-300/80">
                        ?
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-slate-100">
                          ??? · Boss #{boss.rosterNumber}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${CONDITION_STYLES[meta.conditionBadge]}`}>
                          {meta.conditionBadge}
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-200/90 mt-1 flex items-center gap-1">
                        <Compass className="w-3 h-3 shrink-0 text-amber-400" />
                        <span>{meta.biomeHint}</span>
                      </div>
                      {boss.discoveryHint && (
                        <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">
                          {boss.discoveryHint}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onTrackBoss(
                        isTracked ? null : boss.id,
                        isTracked
                          ? 'Cleared boss hint pin.'
                          : `🧭 Pinned Hint for Boss #${boss.rosterNumber}: ${meta.biomeHint} (${meta.conditionBadge})`
                      )
                    }
                    className={`w-full py-1.5 px-2 rounded-lg font-display font-bold text-[10px] border flex items-center justify-center gap-1 cursor-pointer ${
                      isTracked
                        ? 'bg-amber-400 text-slate-950 border-amber-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-600'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {isTracked ? 'Pinned to Compass (Unpin)' : 'Track Hint'}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={boss.id}
                className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/40 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl shrink-0 shadow-inner"
                      style={{
                        borderColor: boss.accentColor,
                        backgroundColor: `${boss.accentColor}22`,
                      }}
                    >
                      {boss.trophyIcon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-amber-950 truncate">
                          #{boss.rosterNumber} {boss.khmerName}
                        </span>
                        {isDefeated && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 text-[9px] font-black inline-flex items-center gap-0.5 shrink-0">
                            <Trophy className="w-2.5 h-2.5" /> Trophy Claimed
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold text-amber-800 truncate">
                        {boss.englishName}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-amber-900">
                        <span className="inline-flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5 text-emerald-700" /> Tier {boss.tier}
                        </span>
                        <span>Kills: {kills}</span>
                        <span className="text-amber-700">{boss.biomeName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Exact 7-Tier Rarity Drop % Table */}
                  <div className="mt-2 pt-1.5 border-t border-amber-900/15 space-y-1">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-amber-800">
                      7-Tier Drop Table (Normal / Expert+)
                    </div>
                    {boss.drops.map((d, idx) => {
                      const rarity = inferDropRarity(d.chanceNormal);
                      const tier = getRarityTierDef(rarity);
                      return (
                        <div
                          key={`${boss.id}_d_${idx}`}
                          className="flex items-center justify-between gap-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-amber-900/35"
                        >
                          <span className="truncate font-semibold" style={{ color: tier.colorHex }}>
                            [{tier.label}] {d.label}
                          </span>
                          <span className="font-mono font-bold text-amber-200 shrink-0">
                            {formatDropRatePct(d.chanceNormal * 100)} / {formatDropRatePct(d.chanceExpert * 100)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ACTIVE BOSS HUNT MISSIONS */}
      {tab === 'missions' && (
        <div className="space-y-2.5 max-h-[54vh] overflow-y-auto pr-1">
          {BOSS_HUNT_MISSIONS.map((m) => {
            const prog = Math.min(m.targetCount, player.bossMissionProgress?.[m.id] ?? 0);
            const pct = Math.round((prog / m.targetCount) * 100);
            const completed = prog >= m.targetCount || discoveredSet.has(m.bossId);
            const isTracked = player.trackedBossId === m.bossId;
            return (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-bold text-sm text-amber-950">{m.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-bold">
                      📍 {m.mapLabel}
                    </span>
                    {completed && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        ✓ Boss Revealed
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-amber-900">
                    {m.stepLabel} — <strong>{completed ? m.targetCount : prog}/{m.targetCount}</strong>
                  </div>
                  <div className="h-2.5 rounded-full bg-amber-950/15 border border-amber-900/25 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all"
                      style={{ width: `${completed ? 100 : pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-amber-800">🎁 {m.rewardHint}</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onTrackBoss(
                      isTracked ? null : m.bossId,
                      isTracked
                        ? 'Unpinned Boss Hunt Mission.'
                        : `🎯 Tracking Mission: ${m.stepLabel} (${m.mapLabel})`
                    )
                  }
                  className={`px-3 py-2 rounded-xl font-display font-bold text-xs border-2 shrink-0 cursor-pointer ${
                    isTracked
                      ? 'bg-amber-400 text-amber-950 border-amber-950'
                      : 'bg-amber-800 hover:bg-amber-700 text-amber-50 border-amber-950'
                  }`}
                >
                  {isTracked ? '📍 Pinned' : 'Pin Mission'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </NativeDialog>
  );
};
