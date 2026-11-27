import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  ROYAL_PASS_DIAMOND_COST,
  SEASON_MAX_TIER,
  SEASON_PASS_KHMER_NAME,
  SEASON_PASS_NAME,
  SEASON_PASS_TIERS,
  countClaimablePassRewards,
  getSeasonPassTierFromXp,
  passRewardKey,
  type SeasonPassTrack,
} from '@shared/seasonPass';
import { CheckCircle2, Crown, Gem, Lock, Sparkles, Trophy } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface SeasonPassModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onUnlockRoyalPass: () => void;
  onClaimTier: (tier: number, track: SeasonPassTrack) => void;
  onClaimAllReady: () => void;
}

export const SeasonPassModal: React.FC<SeasonPassModalProps> = ({
  open,
  player,
  onClose,
  onUnlockRoyalPass,
  onClaimTier,
  onClaimAllReady,
}) => {
  const passXp = player.seasonPassXp ?? 0;
  const { tier: currentTier, xpInTier, xpForNext, progressPct } = getSeasonPassTierFromXp(passXp);
  const hasRoyal = Boolean(player.hasRoyalPass);
  const claimed = new Set(player.claimedPassTiers ?? []);
  const claimableCount = countClaimablePassRewards(player);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={`🎟️ Angkor Season Pass — ${SEASON_PASS_NAME}`}
      subtitle={`${SEASON_PASS_KHMER_NAME} · Tier ${currentTier}/${SEASON_MAX_TIER} · Earn Season XP from Bounties, Pagoda Tower, Spirit Crops & Bosses!`}
      maxWidthClass="w-[min(97vw,840px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Top Progress + Royal Pass CTA */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-amber-950 text-amber-50 border-2 border-amber-400/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <span>
                  Tier {currentTier} / {SEASON_MAX_TIER} · {passXp.toLocaleString()} Season XP
                </span>
              </div>
              <div className="text-[10.5px] text-amber-100/85">
                Tier 20 Free: <strong>Angkor Dawn Champion Title</strong> · Tier 10/20 Royal:{' '}
                <strong>Royal Lotus Pet &amp; Celestial Angkor Armor Set!</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {claimableCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSfx('victory');
                    onClaimAllReady();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-display font-bold text-xs shadow cursor-pointer"
                >
                  ✨ Claim All ({claimableCount})
                </button>
              )}

              {hasRoyal ? (
                <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300 text-amber-200 font-display font-bold text-xs inline-flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-yellow-300" /> Royal Track Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSfx('level_up');
                    onUnlockRoyalPass();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-amber-950 border border-amber-950 font-display font-bold text-xs inline-flex items-center gap-1 shadow cursor-pointer"
                >
                  <Gem className="w-3.5 h-3.5 text-sky-900" /> Unlock Royal ({ROYAL_PASS_DIAMOND_COST} 💎)
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-amber-200">
              <span>Next Tier Progress</span>
              <span>
                {xpInTier} / {xpForNext} XP ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900/90 border border-amber-400/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 20-Tier Dual Track Table */}
        <div className="space-y-2 max-h-[54dvh] overflow-y-auto pr-1">
          {SEASON_PASS_TIERS.map((row) => {
            const unlocked = row.tier <= currentTier;
            const freeClaimed = claimed.has(passRewardKey(row.tier, 'free'));
            const royalClaimed = claimed.has(passRewardKey(row.tier, 'royal'));

            return (
              <div
                key={row.tier}
                className={`p-2 rounded-2xl border-2 grid grid-cols-1 sm:grid-cols-[72px_1fr_1fr] gap-2 items-center ${
                  unlocked
                    ? 'bg-amber-50 border-amber-700/45'
                    : 'bg-stone-100/80 border-stone-300/80 opacity-85'
                }`}
              >
                {/* Tier Badge */}
                <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-1 px-2 py-1 rounded-xl bg-amber-950 text-amber-100 text-center">
                  <span className="font-display font-bold text-xs">Tier {row.tier}</span>
                  <span className="text-[9px] font-mono text-amber-300">{row.xpRequired} XP</span>
                </div>

                {/* Free Track Cell */}
                <div className="p-2 rounded-xl bg-white border border-amber-900/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{row.free.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase text-emerald-700">Free Track</div>
                      <div className="font-display font-bold text-[11px] text-amber-950 truncate">
                        {row.free.label}
                      </div>
                    </div>
                  </div>
                  {freeClaimed ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : unlocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('coin');
                        onClaimTier(row.tier, 'free');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[10px] shrink-0 cursor-pointer"
                    >
                      Claim
                    </button>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  )}
                </div>

                {/* Royal Track Cell */}
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                    hasRoyal
                      ? 'bg-gradient-to-r from-amber-100/80 to-purple-50 border-amber-500/70'
                      : 'bg-purple-50/40 border-purple-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{row.royal.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase text-purple-800 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Royal Track
                      </div>
                      <div className="font-display font-bold text-[11px] text-purple-950 truncate">
                        {row.royal.label}
                      </div>
                    </div>
                  </div>
                  {royalClaimed ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : unlocked && hasRoyal ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('level_up');
                        onClaimTier(row.tier, 'royal');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-amber-100 font-display font-bold text-[10px] shrink-0 cursor-pointer"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold text-purple-700/75 flex items-center gap-0.5 shrink-0">
                      <Lock className="w-3 h-3" /> {hasRoyal ? `T${row.tier}` : 'Royal'}
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
