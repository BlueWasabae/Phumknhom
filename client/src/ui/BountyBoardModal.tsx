import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  countClaimableBounties,
  getActiveBounties,
  normalizeBountyProgress,
  type BountyDef,
} from '@shared/bounties';
import { CheckCircle2, ClipboardList, Coins, Gift, Sparkles } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface BountyBoardModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onClaimBounty: (bountyId: string) => void;
  onClaimAllReady: () => void;
}

export const BountyBoardModal: React.FC<BountyBoardModalProps> = ({
  open,
  player,
  onClose,
  onClaimBounty,
  onClaimAllReady,
}) => {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const active = getActiveBounties();
  const bp = normalizeBountyProgress(player.bountyProgress);
  const claimableCount = countClaimableBounties(player);

  const list: BountyDef[] = tab === 'daily' ? active.daily : active.weekly;

  const renderCard = (b: BountyDef) => {
    const cur = Math.min(b.goal, bp.progress[b.id] ?? 0);
    const pct = Math.min(100, Math.round((cur / Math.max(1, b.goal)) * 100));
    const claimed = bp.claimed.includes(b.id);
    const ready = !claimed && cur >= b.goal;

    return (
      <div
        key={b.id}
        className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2.5 transition ${
          claimed
            ? 'bg-emerald-50/75 border-emerald-500/50 opacity-80'
            : ready
              ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-emerald-50 border-amber-500 ring-2 ring-amber-400/60 shadow'
              : 'bg-amber-50/90 border-amber-900/25'
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-900/30 flex items-center justify-center text-xl shrink-0">
                {b.icon}
              </span>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs text-amber-950 truncate">{b.title}</div>
                <div className="text-[10px] font-semibold text-amber-800 truncate">{b.khmerTitle}</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                claimed
                  ? 'bg-emerald-700 text-white'
                  : ready
                    ? 'bg-amber-500 text-amber-950 animate-pulse'
                    : 'bg-amber-900/15 text-amber-950'
              }`}
            >
              {claimed ? 'Claimed' : ready ? 'Ready!' : `${cur}/${b.goal}`}
            </span>
          </div>

          <p className="text-[10px] text-amber-900/85 leading-snug">{b.hint}</p>

          {/* Live Progress Bar */}
          <div className="space-y-0.5">
            <div className="w-full h-2.5 rounded-full bg-amber-950/15 border border-amber-900/30 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  claimed || ready
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-amber-900">
              <span>
                Progress: {cur} / {b.goal}
              </span>
              <span>{pct}%</span>
            </div>
          </div>
        </div>

        {/* Rewards + 1-Click Claim */}
        <div className="pt-2 border-t border-amber-900/15 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-amber-950">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-200/75">
              <Coins className="w-3 h-3 text-amber-700" /> {b.rewardCoins}c
            </span>
            <span className="px-1.5 py-0.5 rounded bg-yellow-200/85">✨ +{b.rewardGold} Gold</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-950">
              💎 ×{b.rewardReforgeStones} Stone
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-950">+{b.rewardXp} XP</span>
          </div>

          {claimed ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Done
            </span>
          ) : (
            <button
              type="button"
              disabled={!ready}
              onClick={() => onClaimBounty(b.id)}
              className={`px-3 py-1 rounded-xl font-display font-bold text-[11px] flex items-center gap-1 transition ${
                ready
                  ? 'phum-btn cursor-pointer ring-2 ring-emerald-500'
                  : 'bg-stone-200 text-stone-500 border border-stone-300 cursor-not-allowed'
              }`}
            >
              <Gift className="w-3.5 h-3.5" /> {ready ? 'Claim Reward' : 'In Progress'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="📋 Adventurer’s Bounty Board · តារាងបេសកកម្មភូមិខ្ញុំ"
      subtitle={`Daily Reset: ${active.dailyKey} · Weekly Reset: ${active.weeklyKey} · Tracked live across all zones!`}
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs max-h-[74dvh] overflow-y-auto pr-1">
        {/* Top Wooden Board Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" />
              <span>Central Plaza Adventurer’s Bounties</span>
            </div>
            <p className="text-[11px] text-amber-100/90">
              Complete 4 Daily &amp; 2 Weekly contracts across Farming, Fishing, Caverns, Cooking, Pagoda Tower &amp; Boss Raids.
            </p>
          </div>
          {claimableCount > 0 && (
            <button
              type="button"
              onClick={onClaimAllReady}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white border-2 border-emerald-200 font-display font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Claim All Ready ({claimableCount})
            </button>
          )}
        </div>

        {/* Daily (4) vs Weekly (2) Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('daily')}
            className={`py-2 px-3 rounded-xl border-2 font-display font-bold text-xs transition cursor-pointer ${
              tab === 'daily'
                ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            ☀️ Daily Bounties ({active.daily.filter((b) => bp.claimed.includes(b.id)).length}/{active.daily.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('weekly')}
            className={`py-2 px-3 rounded-xl border-2 font-display font-bold text-xs transition cursor-pointer ${
              tab === 'weekly'
                ? 'bg-purple-800 text-amber-50 border-purple-950 shadow'
                : 'bg-purple-50 text-purple-950 border-purple-700/35 hover:bg-purple-100'
            }`}
          >
            👑 Weekly Bounties ({active.weekly.filter((b) => bp.claimed.includes(b.id)).length}/{active.weekly.length})
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-2.5">{list.map(renderCard)}</div>
      </div>
    </NativeDialog>
  );
};
