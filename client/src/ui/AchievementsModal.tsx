import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { ACHIEVEMENT_LIST, type AchievementDef } from '@shared/achievements';
import { Award, CheckCircle2, Gem, Lock, Sparkles } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface AchievementsModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onEquipBadge: (badgeId: string | null) => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  open,
  player,
  onClose,
  onEquipBadge,
}) => {
  const [filter, setFilter] = useState<'All' | AchievementDef['category']>('All');
  const unlockedSet = new Set(player.unlockedAchievements ?? []);
  const unlockedCount = ACHIEVEMENT_LIST.filter((a) => unlockedSet.has(a.id)).length;
  const totalDiamondsEarned = ACHIEVEMENT_LIST.filter((a) => unlockedSet.has(a.id)).reduce(
    (sum, a) => sum + a.rewardDiamonds,
    0
  );

  const visible =
    filter === 'All' ? ACHIEVEMENT_LIST : ACHIEVEMENT_LIST.filter((a) => a.category === filter);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏅 Account Achievement Badges · ផ្លាកសញ្ញាសមិទ្ធផល"
      subtitle={`Unlocked: ${unlockedCount}/${ACHIEVEMENT_LIST.length} · Earned: ${totalDiamondsEarned} 💎 · Equip 1 favorite Badge Icon next to your overhead name!`}
      maxWidthClass="w-[min(96vw,760px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Filter Bar + Unequip */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-900/25">
          <div className="flex flex-wrap gap-1">
            {(['All', 'Village', 'Combat', 'Social', 'Collection'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  soundManager.playSfx('click');
                  setFilter(cat);
                }}
                className={`px-2.5 py-1 rounded-lg font-display font-bold text-[11px] border cursor-pointer transition ${
                  filter === cat
                    ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                    : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-900/25'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {player.equippedBadgeId && (
            <button
              type="button"
              onClick={() => {
                soundManager.playSfx('click');
                onEquipBadge(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[10px] cursor-pointer"
            >
              Hide Overhead Badge
            </button>
          )}
        </div>

        {/* 12-Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[58dvh] overflow-y-auto pr-1">
          {visible.map((ach) => {
            const isUnlocked = unlockedSet.has(ach.id);
            const isEquipped = player.equippedBadgeId === ach.id;

            return (
              <div
                key={ach.id}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-2 transition ${
                  isEquipped
                    ? 'bg-gradient-to-br from-yellow-100 via-amber-50 to-emerald-50 border-amber-600 ring-2 ring-amber-400/70'
                    : isUnlocked
                      ? 'bg-gradient-to-b from-amber-50 to-emerald-50/50 border-emerald-600/60'
                      : 'bg-stone-100/80 border-stone-300 text-stone-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 shrink-0 ${
                        isUnlocked
                          ? 'bg-amber-100 border-amber-500 shadow-sm'
                          : 'bg-stone-200 border-stone-400 grayscale opacity-60'
                      }`}
                    >
                      {ach.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1">
                        <span>{ach.name}</span>
                        {isUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-[10px] font-bold text-amber-800/85">{ach.khmerName}</div>
                      <p className="text-[10.5px] text-amber-950/85 leading-snug mt-0.5">
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-sky-100 border border-sky-400/50 text-sky-900 font-display font-bold text-[10px] inline-flex items-center gap-0.5 shrink-0">
                    <Gem className="w-2.5 h-2.5" /> +{ach.rewardDiamonds}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-900/10">
                  <span className="text-[9.5px] font-bold uppercase text-amber-800/80 flex items-center gap-1">
                    <Award className="w-3 h-3" /> {ach.category}
                  </span>

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('click');
                        onEquipBadge(isEquipped ? null : ach.id);
                      }}
                      className={`px-3 py-1 rounded-lg font-display font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition ${
                        isEquipped
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-800 hover:bg-amber-700 text-amber-50'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      {isEquipped ? '✓ Equipped on Name' : 'Equip Badge'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-500 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
