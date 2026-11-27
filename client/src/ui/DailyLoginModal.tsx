import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  DAILY_LOGIN_REWARDS,
  getDailyLoginStatus,
} from '@shared/loginRewards';
import { Calendar, CheckCircle2, Flame, Gift, Sparkles } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface DailyLoginModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onClaimToday: () => void;
}

export const DailyLoginModal: React.FC<DailyLoginModalProps> = ({
  open,
  player,
  onClose,
  onClaimToday,
}) => {
  const status = getDailyLoginStatus(player);
  const nextReward =
    DAILY_LOGIN_REWARDS.find((r) => r.day === status.nextClaimDay) ?? DAILY_LOGIN_REWARDS[0];

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="📅 7-Day Login Streak Calendar · រង្វាន់ចូលលេងប្រចាំថ្ងៃ ៧ ថ្ងៃ"
      subtitle={`Current Streak: ${status.streak} Day${status.streak === 1 ? '' : 's'} · Complete 7 Days for 100 💎 + Golden Krama Scarf!`}
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Streak Header */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-900 via-orange-900 to-rose-900 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Login Streak: {status.streak} Day{status.streak === 1 ? '' : 's'}</span>
            </div>
            <div className="text-[11px] text-amber-100/90">
              {status.claimedToday
                ? '✓ Today’s gift has been claimed! Return tomorrow for the next chest.'
                : `Ready to claim Day ${status.nextClaimDay}: ${nextReward.icon} ${nextReward.summary}`}
            </div>
          </div>

          <button
            type="button"
            disabled={status.claimedToday}
            onClick={() => {
              soundManager.playSfx('victory');
              onClaimToday();
            }}
            className={`px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 border-2 shadow transition ${
              status.claimedToday
                ? 'bg-emerald-800/80 text-emerald-100 border-emerald-400/40 cursor-default'
                : 'bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-amber-950 border-amber-950 cursor-pointer animate-pulse'
            }`}
          >
            {status.claimedToday ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Claimed Today
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" /> Claim Day {status.nextClaimDay} Reward
              </>
            )}
          </button>
        </div>

        {/* 7-Day Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DAILY_LOGIN_REWARDS.map((r) => {
            const isClaimed = status.claimedDays.includes(r.day);
            const isCurrent = !status.claimedToday && r.day === status.nextClaimDay;

            return (
              <div
                key={r.day}
                className={`p-2.5 rounded-2xl border-2 flex flex-col justify-between gap-2 transition ${
                  r.isGrand ? 'col-span-2 sm:col-span-2' : ''
                } ${
                  isClaimed
                    ? 'bg-emerald-50 border-emerald-600/60 text-emerald-950'
                    : isCurrent
                      ? 'bg-gradient-to-b from-yellow-100 via-amber-50 to-amber-100 border-amber-600 ring-2 ring-amber-400 shadow-md text-amber-950'
                      : r.isGrand
                        ? 'bg-gradient-to-br from-purple-50 via-amber-50 to-rose-50 border-amber-600/60 text-amber-950'
                        : 'bg-amber-50/85 border-amber-900/25 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-900 text-amber-50 font-display font-bold text-[10px] inline-flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Day {r.day}
                  </span>
                  {isClaimed ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                    </span>
                  ) : isCurrent ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-display font-bold text-[9px] animate-pulse">
                      TODAY!
                    </span>
                  ) : r.isGrand ? (
                    <span className="text-[9px] font-bold text-purple-800 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" /> GRAND STREAK
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 py-1">
                  <span className="text-2xl leading-none">{r.icon}</span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs leading-tight">{r.title}</div>
                    <div className="text-[10px] text-amber-800/90 leading-tight">{r.khmerTitle}</div>
                  </div>
                </div>

                <div className="px-2 py-1 rounded-lg bg-white/85 border border-amber-900/15 font-display font-bold text-[10.5px] text-amber-950">
                  {r.summary}
                </div>

                {isCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSfx('victory');
                      onClaimToday();
                    }}
                    className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[11px] shadow cursor-pointer"
                  >
                    Claim Day {r.day} Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
