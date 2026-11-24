import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  fetchLeaderboard,
  type LeaderboardCategory,
  type LeaderboardResponse,
} from '../game/network/ApiClient';
import { Crown, Sprout, Swords, Trophy } from 'lucide-react';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface LeaderboardModalProps {
  open: boolean;
  initialCategory?: LeaderboardCategory;
  player: PlayerState;
  onClose: () => void;
}

const CATEGORIES: Array<{
  id: LeaderboardCategory;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'farmer', title: 'Greatest Farmer', subtitle: 'Farm Level + Wealth', Icon: Sprout },
  { id: 'stylish', title: 'Most Stylish Icon', subtitle: 'Highest Stylish Score', Icon: Crown },
  { id: 'slayer', title: 'Mythic Boss Slayer', subtitle: 'Unique Bosses & Clears', Icon: Swords },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  initialCategory = 'farmer',
  player,
  onClose,
}) => {
  const [category, setCategory] = useState<LeaderboardCategory>(initialCategory);
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory(initialCategory);
    let active = true;
    void fetchLeaderboard(player).then((res) => {
      if (active) setData(res);
    });
    return () => {
      active = false;
    };
  }, [initialCategory, open, player]);

  const rows = data ? data[category] : [];
  const champion = rows[0];

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏛️ Phum Khnhom · Plaza Hall of Fame (TOP TEN)"
      subtitle="Live #1 Champions stand immortalized as glowing Avatar Statues in Central Plaza!"
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Category Switcher */}
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map(({ id, title, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`py-2 px-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                category === id
                  ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{title}</span>
            </button>
          ))}
        </div>

        {/* #1 Champion Pedestal Card */}
        {champion && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center gap-3">
            <div className="p-1.5 rounded-xl bg-amber-100/95 border-2 border-amber-400">
              <PaperDollPreview loadout={champion.loadout} width={88} height={88} />
            </div>
            <div className="flex-1 min-w-[180px] space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-display font-bold text-[10px]">
                <Trophy className="w-3 h-3" /> #1 PLAZA STATUE CHAMPION
              </div>
              <div className="font-display font-bold text-base text-amber-200">{champion.username}</div>
              <div className="text-[11px] text-amber-100/90 font-semibold">{champion.detailLabel}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-amber-300 font-bold">Hall Score</div>
              <div className="font-display font-bold text-lg text-yellow-300">
                {champion.score.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Full TOP TEN Table */}
        <div className="max-h-[44dvh] overflow-y-auto space-y-1 pr-1">
          {rows.map((row) => {
            const isSelf = row.username.toLowerCase() === player.name.toLowerCase();
            return (
              <div
                key={`${category}_${row.rank}_${row.username}`}
                className={`px-3 py-2 rounded-xl border-2 flex items-center justify-between gap-2 ${
                  isSelf
                    ? 'bg-emerald-50 border-emerald-600'
                    : row.rank === 1
                      ? 'bg-amber-100/90 border-amber-500'
                      : 'bg-amber-50/85 border-amber-900/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 ${
                      row.rank === 1
                        ? 'bg-amber-500 text-amber-950'
                        : row.rank === 2
                          ? 'bg-slate-300 text-slate-900'
                          : row.rank === 3
                            ? 'bg-orange-400 text-orange-950'
                            : 'bg-amber-900/15 text-amber-950'
                    }`}
                  >
                    #{row.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs text-amber-950 truncate">
                      {row.username} {isSelf ? '(You)' : ''}
                    </div>
                    <div className="text-[10px] text-amber-800 truncate">{row.detailLabel}</div>
                  </div>
                </div>
                <div className="font-display font-bold text-xs text-amber-950 shrink-0">
                  {row.score.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
