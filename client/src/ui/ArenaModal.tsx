import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Award, Eye, Shield, Sparkles, Swords, Trophy } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ArenaModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onEnterArena: (opts: { mode: 'normalized' | 'open'; spectate?: boolean }) => void;
  onOpenPvpLeaderboard: () => void;
}

export function getKunKhmerRankTier(elo: number): { label: string; khmer: string; color: string } {
  if (elo >= 1600) return { label: 'Grandmaster of Angkor', khmer: 'ព្រឹទ្ធាចារ្យគុនខ្មែរ', color: 'text-yellow-300' };
  if (elo >= 1400) return { label: 'Golden Nak Muay', khmer: 'អ្នកប្រដាល់មាស', color: 'text-amber-300' };
  if (elo >= 1250) return { label: 'Ring Champion', khmer: 'ជើងឯកសង្វៀន', color: 'text-emerald-300' };
  if (elo >= 1150) return { label: 'Temple Striker', khmer: 'អ្នកប្រយុទ្ធប្រាសាទ', color: 'text-sky-300' };
  return { label: 'Village Challenger', khmer: 'អ្នកប្រកួតភូមិខ្ញុំ', color: 'text-stone-300' };
}

export const ArenaModal: React.FC<ArenaModalProps> = ({
  open,
  player,
  onClose,
  onEnterArena,
  onOpenPvpLeaderboard,
}) => {
  const [mode, setMode] = useState<'normalized' | 'open'>('normalized');
  const elo = player.pvpElo ?? 1200;
  const wins = player.pvpWins ?? 0;
  const losses = player.pvpLosses ?? 0;
  const hasSash = Boolean(player.kunKhmerChampionSash);
  const rank = getKunKhmerRankTier(elo);
  const awakenedCount = (player.awakenedWeapons ?? []).length;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🥊 Kun Khmer 1v1 Sparring Ring (សង្វៀនគុនខ្មែរ)"
      subtitle="Best-of-3 Skill Duels · Temple District Sandstone Ring · Pure Dodging, Grapple & Timing!"
      maxWidthClass="w-[min(96vw,680px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Fighter Rating & Champion Sash Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-stone-950 via-red-950/90 to-amber-950 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 text-[10px] font-bold text-amber-200">
              <Shield className="w-3 h-3" /> {rank.khmer}
            </div>
            <div className={`font-display font-bold text-lg ${rank.color}`}>{rank.label}</div>
            <div className="text-[11px] text-amber-100/90 font-semibold">
              Record: <strong className="text-emerald-300">{wins}W</strong> –{' '}
              <strong className="text-rose-300">{losses}L</strong> · Best-of-3 Sparring Format
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
              Sparring Rating (ELO)
            </div>
            <div className="font-display font-extrabold text-3xl text-yellow-300 leading-none">
              {elo}
            </div>
            <div className="text-[10px] font-bold">
              {hasSash ? (
                <span className="text-emerald-300 inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> 🎗️ Champion Sash Unlocked!
                </span>
              ) : (
                <span className="text-amber-200/85">
                  Win a Ranked Match or reach 1,250 ELO for 🎗️ Champion Sash!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Selector: Normalized 1v1 vs Open Gear */}
        <div className="grid sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setMode('normalized')}
            className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
              mode === 'normalized'
                ? 'bg-emerald-950 text-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-display font-bold text-sm flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" /> Normalized 1v1
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-emerald-950 text-[9px] font-extrabold">
                0% P2W · RANKED
              </span>
            </div>
            <p className="text-[11px] opacity-90 leading-snug">
              Equalized <strong>1,000 HP</strong> &amp; <strong>85 ATK</strong> for both fighters! Pure{' '}
              <code>Shift</code> Dash i-frames, <code>Q</code> Grapple, 360° cursor aim &amp;{' '}
              <code>R</code> Signature Skill timing decide the victor.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('open')}
            className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
              mode === 'open'
                ? 'bg-purple-950 text-purple-50 border-purple-400 shadow-md ring-2 ring-purple-400/40'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-display font-bold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" /> Open Gear Duel
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[9px] font-extrabold">
                AWAKENED GEAR
              </span>
            </div>
            <p className="text-[11px] opacity-90 leading-snug">
              Friendly full-power sparring bringing your equipped armor, Accessories &amp;{' '}
              <strong>Awakened Ancient Weapons</strong> ({awakenedCount} owned) straight into the ring!
            </p>
          </button>
        </div>

        {/* Combat Controls Quick Reference */}
        <div className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-900/25 text-[11px] text-amber-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Controls:</strong> <code>WASD</code> Move · <code>Click / Space</code> Aimed Attack ·{' '}
            <code>Shift</code> Dash (i-frames) · <code>Q</code> Bamboo Grapple · <code>R</code> Class Skill
          </span>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onEnterArena({ mode, spectate: false });
              onClose();
            }}
            className="sm:col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white border-2 border-amber-950 font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            Enter Sparring Ring ({mode === 'normalized' ? 'Normalized 1v1' : 'Open Gear'})
          </button>

          <button
            type="button"
            onClick={() => {
              onEnterArena({ mode, spectate: true });
              onClose();
            }}
            className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-100 border-2 border-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-sky-300" /> Spectate Ring
          </button>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-amber-900/20">
          <span className="text-[10px] text-amber-900/80 font-semibold">
            Tip: Right-click or tap any player in Plaza to Challenge them directly to a live 1v1 Duel!
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPvpLeaderboard();
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 font-display font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-300" /> Kun Khmer Champions
          </button>
        </div>
      </div>
    </NativeDialog>
  );
};
