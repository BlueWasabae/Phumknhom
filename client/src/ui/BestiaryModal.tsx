import React from 'react';
import type { BossId, PlayerState } from '@shared/types';
import { KHMER_BOSS_LIST } from '@shared/khmerBosses';
import { BookOpen, Lock, Shield, Skull, Sparkles, Swords, Trophy } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface BestiaryModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onChallengeBoss: (bossId: BossId) => void;
}

export const BestiaryModal: React.FC<BestiaryModalProps> = ({
  open,
  player,
  onClose,
  onChallengeBoss,
}) => {
  const totalDefeats = Object.values(player.bossDefeats ?? {}).reduce((a, b) => a + b, 0);
  const unlockedTrophies = KHMER_BOSS_LIST.filter(
    (b) => (player.bossDefeats?.[b.id] ?? 0) > 0 || player.clearedBosses.includes(b.id)
  ).length;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Khmer Bestiary · Boss Log & Trophies"
      subtitle={`Trophies Unlocked: ${unlockedTrophies}/${KHMER_BOSS_LIST.length} · Total Boss Kills: ${totalDefeats}`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 max-h-[68dvh] overflow-y-auto pr-1 text-xs">
        <div className="p-2.5 rounded-xl bg-amber-950/10 border border-amber-900/25 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-950">
          <div className="flex items-center gap-1.5 font-display font-bold">
            <BookOpen className="w-4 h-4 text-amber-800" />
            All 6 Khmer Bosses Live: 4 Classic Rigs + Storm &amp; Crystal Duo + Ten-Headed Yaksha Sovereign
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-amber-800 text-amber-50 font-bold text-[10px]">
            🏆 {unlockedTrophies}/{KHMER_BOSS_LIST.length} Trophies
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {KHMER_BOSS_LIST.map((boss) => {
            const kills = Math.max(
              player.bossDefeats?.[boss.id] ?? 0,
              player.clearedBosses.includes(boss.id) ? 1 : 0
            );
            const cleared = kills > 0;

            return (
              <div
                key={boss.id}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-2.5 ${
                  cleared
                    ? 'bg-gradient-to-b from-amber-50 to-emerald-50/60 border-emerald-700/60 shadow-sm'
                    : 'bg-amber-50/85 border-amber-900/30'
                }`}
              >
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                        <span>{boss.trophyIcon}</span>
                        <span>{boss.khmerName}</span>
                      </div>
                      <div className="text-[11px] font-bold text-amber-800">{boss.englishName}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 font-display font-bold text-[10px]">
                        Boss #{boss.rosterNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-display font-bold text-[10px] ${
                          cleared
                            ? 'bg-emerald-700 text-white'
                            : 'bg-stone-300 text-stone-700'
                        }`}
                      >
                        Defeated: {kills}×
                      </span>
                    </div>
                  </div>

                  {/* Lore */}
                  <p className="text-[11px] text-amber-950/90 leading-snug italic">
                    “{boss.lore}”
                  </p>

                  {/* Stats & Rig */}
                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-400/40">
                      Rig: {boss.rig}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-400/40 inline-flex items-center gap-0.5">
                      <Skull className="w-2.5 h-2.5" /> {boss.soloNormalHp.toLocaleString()} HP
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-400/40 inline-flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> DEF {boss.defense} · ATK {boss.baseAttack}
                    </span>
                  </div>

                  {/* Trophy Unlock */}
                  <div
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-display font-bold flex items-center justify-between gap-2 ${
                      cleared
                        ? 'bg-yellow-100/90 border-amber-500 text-amber-950'
                        : 'bg-stone-200/70 border-stone-400/50 text-stone-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {cleared ? (
                        <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      )}
                      <span>{boss.trophyName}</span>
                    </span>
                    <span className="text-[10px] uppercase">
                      {cleared ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>

                  {/* Drop Table */}
                  <div className="space-y-1 pt-1 border-t border-amber-900/15">
                    <div className="font-display font-bold text-[10px] uppercase text-amber-900">
                      Drop Table (Normal / Expert+)
                    </div>
                    <div className="space-y-1">
                      {boss.drops.map((d) => (
                        <div
                          key={d.itemId}
                          className="flex items-center justify-between gap-2 px-2 py-0.5 rounded bg-white/80 border border-amber-900/15 text-[10px]"
                        >
                          <span className="font-bold text-amber-950">
                            {d.quantity > 1 ? `${d.quantity}× ` : ''}
                            {d.label}
                          </span>
                          <span className="font-mono font-bold text-amber-800">
                            {Math.round(d.chanceNormal * 100)}% / {Math.round(d.chanceExpert * 100)}%
                          </span>
                        </div>
                      ))}
                      {boss.noHitEasterEggHint && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 border border-yellow-500/60 text-[10px] font-bold text-amber-900">
                          <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{boss.noHitEasterEggHint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Challenge */}
                <button
                  type="button"
                  onClick={() => onChallengeBoss(boss.id)}
                  className="w-full py-1.5 rounded-xl bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-amber-50 border border-purple-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
                >
                  <Swords className="w-3.5 h-3.5" />
                  Open Portal for {boss.khmerName}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
