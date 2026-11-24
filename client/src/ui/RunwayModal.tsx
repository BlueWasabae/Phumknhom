import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Award, Crown, Flame, Heart, Sparkles } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface RunwayModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onCompleteStrut: (payload: {
    coins: number;
    stylishGain: number;
    applauseScore: number;
    unlockBadge: boolean;
  }) => void;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  leftPct: number;
}

const REACTIONS: Array<{ emoji: string; label: string; pts: number; bg: string }> = [
  { emoji: '✨', label: 'Radiant', pts: 12, bg: 'from-amber-400 to-yellow-500 text-amber-950' },
  { emoji: '🔥', label: 'Fire Look', pts: 15, bg: 'from-orange-500 to-rose-600 text-white' },
  { emoji: '👑', label: 'Royal Icon', pts: 20, bg: 'from-purple-600 to-fuchsia-600 text-white' },
  { emoji: '💖', label: 'Loved It', pts: 14, bg: 'from-pink-500 to-rose-500 text-white' },
];

export const RunwayModal: React.FC<RunwayModalProps> = ({
  open,
  player,
  onClose,
  onCompleteStrut,
}) => {
  const [strutting, setStrutting] = useState(false);
  const [strutStage, setStrutStage] = useState<'idle' | 'walk_in' | 'pose' | 'walk_out'>('idle');
  const [applause, setApplause] = useState(0);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [claimedThisVisit, setClaimedThisVisit] = useState(false);

  useEffect(() => {
    if (open) {
      setStrutting(false);
      setStrutStage('idle');
      setApplause(0);
      setReactions([]);
      setClaimedThisVisit(false);
    }
  }, [open]);

  const emitReaction = (emoji: string, pts: number) => {
    soundManager.playSfx('click');
    const id = Date.now() + Math.random();
    const leftPct = 18 + Math.round(Math.random() * 64);
    setReactions((prev) => [...prev.slice(-14), { id, emoji, leftPct }]);
    setApplause((prev) => prev + pts);
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1150);
  };

  const handleStartStrut = () => {
    if (strutting) return;
    setStrutting(true);
    setStrutStage('walk_in');
    soundManager.playSfx('level_up');

    // Auto-burst crowd cheer reactions during the catwalk strut!
    window.setTimeout(() => {
      setStrutStage('pose');
      emitReaction('✨', 18);
      emitReaction('👑', 22);
    }, 950);

    window.setTimeout(() => {
      emitReaction('🔥', 16);
      emitReaction('💖', 18);
      setStrutStage('walk_out');
    }, 2200);

    window.setTimeout(() => {
      setStrutting(false);
      setStrutStage('idle');
      const finalScore = Math.max(85, applause + 74 + Math.round(player.lifeStats.stylish * 0.25));
      const coins = Math.min(350, 150 + Math.round(finalScore * 0.8));
      const stylishGain = 8;
      const unlockBadge = !player.runwayIconBadge;
      setClaimedThisVisit(true);
      onCompleteStrut({
        coins,
        stylishGain,
        applauseScore: finalScore,
        unlockBadge,
      });
    }, 3150);
  };

  const dollOffsetClass =
    strutStage === 'walk_in'
      ? '-translate-x-28 scale-95'
      : strutStage === 'pose'
      ? 'translate-x-0 scale-110'
      : strutStage === 'walk_out'
      ? 'translate-x-28 scale-95'
      : 'translate-x-0 scale-100';

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="👑 Weekly Khmer Fashion Runway · ឆាកដើរម៉ូដភូមិខ្ញុំ"
      subtitle={`Weekly Theme: Royal Angkor Gold & Lotus Couture · Your Stylish Score: ${player.lifeStats.stylish}${
        player.runwayIconBadge ? ' · 👑 Runway Icon Badge Earned!' : ''
      }`}
      maxWidthClass="w-[min(96vw,680px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Live Spotlight-Lit Runway Catwalk Stage */}
        <div className="relative h-60 rounded-2xl border-2 border-amber-400/75 bg-gradient-to-b from-[#1e1038] via-[#3b1557] to-[#4c0519] overflow-hidden shadow-2xl flex flex-col items-center justify-end pb-4">
          {/* Blooming Overhead Stage Spotlights */}
          <div
            className={`pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-2xl transition-all duration-700 ${
              strutStage === 'pose'
                ? 'bg-yellow-300/45 scale-125'
                : strutting
                ? 'bg-amber-400/35 scale-110'
                : 'bg-pink-400/20 scale-95'
            }`}
          />
          <div className="pointer-events-none absolute top-2 left-8 w-20 h-44 bg-gradient-to-b from-amber-200/30 to-transparent -rotate-12 blur-md" />
          <div className="pointer-events-none absolute top-2 right-8 w-20 h-44 bg-gradient-to-b from-pink-200/30 to-transparent rotate-12 blur-md" />

          {/* Floating Blooming Reactions */}
          {reactions.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute bottom-16 text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.9)] animate-bounce"
              style={{ left: `${r.leftPct}%` }}
            >
              {r.emoji}
            </span>
          ))}

          {/* Top Stage Marquee */}
          <div className="absolute top-3 inset-x-4 flex items-center justify-between text-[11px] font-display font-bold">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/90 text-amber-950 shadow">
              ✨ MARKET STREET CATWALK
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-yellow-200 border border-amber-400/50">
              Applause Score: {applause + Math.round(player.lifeStats.stylish * 0.25)} pts
            </span>
          </div>

          {/* Live Customized Human Paper-Doll walking the spotlight catwalk */}
          <div className={`relative z-10 transition-all duration-700 ease-in-out ${dollOffsetClass}`}>
            <PaperDollPreview loadout={player.loadout} width={144} height={144} includePet />
            <div className="text-center -mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/85 text-amber-200 border border-amber-400/60 font-display font-bold text-[11px]">
                {player.runwayIconBadge ? '👑 ' : ''}
                {player.kromTag ? `[${player.kromTag}] ` : ''}
                {player.name}
              </span>
            </div>
          </div>

          {/* Red-and-Gold Velvet Catwalk Floor */}
          <div className="w-[88%] h-7 mt-1 rounded-full bg-gradient-to-r from-amber-700 via-rose-700 to-amber-700 border-2 border-yellow-300/80 shadow-[0_0_24px_rgba(250,204,21,0.45)] flex items-center justify-center text-[10px] font-display font-bold text-amber-100 tracking-widest">
            {strutStage === 'pose'
              ? '📸 CENTER STAGE POSE! STRIKE A LOOK!'
              : strutting
              ? '✨ STRUTTING THE RUNWAY...'
              : 'ROYAL ANGKOR RUNWAY STAGE'}
          </div>
        </div>

        {/* Spectator Blooming Reaction Bar */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-amber-950">
              🎉 Spectator Reactions (Tap to Cheer &amp; Boost Runway Score!)
            </span>
            <span className="text-[10px] font-bold text-pink-800">
              Best Weekly Score: {Math.max(player.runwayScore ?? 0, applause)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {REACTIONS.map((rx) => (
              <button
                key={rx.emoji}
                type="button"
                onClick={() => emitReaction(rx.emoji, rx.pts)}
                className={`py-2 px-2 rounded-xl bg-gradient-to-b ${rx.bg} border border-amber-950/30 font-display font-bold text-xs shadow hover:scale-[1.03] active:scale-95 transition flex items-center justify-center gap-1`}
              >
                <span className="text-base">{rx.emoji}</span>
                <span>{rx.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Strut Action & Rewards Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-amber-950 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Rewards: <strong>+150–350 Coins</strong> · <strong>+8 Stylish</strong> · Weekly{' '}
              <strong>👑 Runway Icon</strong> badge!
            </span>
          </div>

          <button
            type="button"
            disabled={strutting}
            onClick={handleStartStrut}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-amber-500 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-2 border-amber-950 font-display font-bold text-sm shadow-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {strutting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" /> Strutting Stage...
              </>
            ) : claimedThisVisit ? (
              <>
                <Crown className="w-4 h-4" /> Strut Again!
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" /> Strut the Runway!
              </>
            )}
          </button>
        </div>

        {player.runwayIconBadge && (
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-100 to-pink-100 border border-amber-600/40 text-amber-950 font-display font-bold text-[11px] flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-pink-600" />
            Weekly Badge Active: 👑 Runway Icon — displayed on your Runway Stage marquee &amp; Profile!
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
