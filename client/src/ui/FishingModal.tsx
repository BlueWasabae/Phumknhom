import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { hasTalent } from '@shared/skillTrees';
import { Fish, Sparkles, Waves } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

export interface FishingCatchReward {
  itemId?: string;
  coins?: number;
  label: string;
  khmerLabel: string;
  rarity: string;
  fishingXp: number;
}

interface FishingModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onCatchReward: (reward: FishingCatchReward) => void;
}

type FishingPhase = 'idle' | 'waiting' | 'splash' | 'result';

const CATCH_TABLE: Array<{ weight: number; reward: FishingCatchReward }> = [
  {
    weight: 40,
    reward: {
      itemId: 'fish_mekong_catfish',
      label: 'Mekong Catfish',
      khmerLabel: 'ត្រីប្រាទន្លេមេគង្គ',
      rarity: 'Common',
      fishingXp: 18,
    },
  },
  {
    weight: 28,
    reward: {
      itemId: 'fish_silver_carp',
      label: 'Silver Carp',
      khmerLabel: 'ត្រីរៀលប្រាក់',
      rarity: 'Uncommon',
      fishingXp: 28,
    },
  },
  {
    weight: 16,
    reward: {
      itemId: 'fish_sunken_coin_pouch',
      coins: 220,
      label: 'Sunken Coin Pouch (+220 Coins)',
      khmerLabel: 'ថង់ប្រាក់លិចទឹក',
      rarity: 'Uncommon',
      fishingXp: 24,
    },
  },
  {
    weight: 11,
    reward: {
      itemId: 'fish_golden_lotus_koi',
      label: 'Golden Lotus Koi',
      khmerLabel: 'ត្រីគល់រាំងមាស',
      rarity: 'Rare',
      fishingXp: 52,
    },
  },
  {
    weight: 5,
    reward: {
      itemId: 'drop_stone_key',
      label: 'Ancient Stone Key',
      khmerLabel: 'សោថ្មប្រាសាទបុរាណ',
      rarity: 'Epic',
      fishingXp: 85,
    },
  },
];

function rollCatch(luckBoost: number): FishingCatchReward {
  const roll = Math.random() * 100;
  // Spirit Altar +10% Luck shifts roll slightly toward rare table tail
  const adjusted = Math.min(99.9, roll + luckBoost * 8);
  let acc = 0;
  for (const row of CATCH_TABLE) {
    acc += row.weight;
    if (adjusted < acc) return row.reward;
  }
  return CATCH_TABLE[0].reward;
}

export const FishingModal: React.FC<FishingModalProps> = ({
  open,
  player,
  onClose,
  onCatchReward,
}) => {
  const [phase, setPhase] = useState<FishingPhase>('idle');
  const [markerPct, setMarkerPct] = useState(50); // 0..100 moving marker
  const [zoneStart, setZoneStart] = useState(34);
  const [zoneWidth, setZoneWidth] = useState(28);
  const [lastOutcome, setLastOutcome] = useState<{ ok: boolean; text: string } | null>(null);

  const waitTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const markerRef = useRef(50);
  const dirRef = useRef(1);
  const lastFrameRef = useRef(0);

  const fishingSkill = player.skills.skills.fishing;
  const fasterBite = hasTalent(player.skills, 'fishing', 'fish_faster_bite');
  const riverAltarDone = (player.pagodaBundles?.altar_river?.length ?? 0) >= 3;
  const spiritAltarDone = (player.pagodaBundles?.altar_spirit?.length ?? 0) >= 3;

  const stopLoops = useCallback(() => {
    if (waitTimerRef.current) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopLoops();
      setPhase('idle');
      setLastOutcome(null);
    }
    return stopLoops;
  }, [open, stopLoops]);

  const startCast = useCallback(() => {
    stopLoops();
    setLastOutcome(null);
    setPhase('waiting');

    // 1.5s - 3.5s bite wait (25% faster with Fishing -> Faster Bite talent!)
    const baseMs = 1500 + Math.random() * 2000;
    const waitMs = Math.round(baseMs * (fasterBite ? 0.75 : 1));
    const width = Math.min(38, 24 + Math.floor(fishingSkill.level / 4));
    const start = Math.round(14 + Math.random() * (72 - width));
    setZoneWidth(width);
    setZoneStart(start);

    waitTimerRef.current = window.setTimeout(() => {
      soundManager.playSfx('splash');
      setPhase('splash');
      markerRef.current = 8;
      dirRef.current = 1;
      lastFrameRef.current = performance.now();

      const step = (now: number) => {
        const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
        lastFrameRef.current = now;
        const speed = 96; // Sweeps smoothly across bar
        markerRef.current += dirRef.current * speed * dt;
        if (markerRef.current >= 98) {
          markerRef.current = 98;
          dirRef.current = -1;
        } else if (markerRef.current <= 2) {
          markerRef.current = 2;
          dirRef.current = 1;
        }
        setMarkerPct(markerRef.current);
        rafRef.current = window.requestAnimationFrame(step);
      };
      rafRef.current = window.requestAnimationFrame(step);
    }, waitMs);
  }, [fasterBite, fishingSkill.level, stopLoops]);

  const attemptReel = useCallback(() => {
    if (phase !== 'splash') return;
    stopLoops();
    const pos = markerRef.current;
    const hit = pos >= zoneStart && pos <= zoneStart + zoneWidth;
    if (hit) {
      const baseReward = rollCatch(spiritAltarDone ? 1 : 0);
      const reward: FishingCatchReward = {
        ...baseReward,
        fishingXp: Math.round(baseReward.fishingXp * (riverAltarDone ? 1.2 : 1)),
      };
      onCatchReward(reward);
      soundManager.playSfx(reward.coins ? 'coin' : 'harvest');
      setLastOutcome({
        ok: true,
        text: `🎣 Caught ${reward.label} (${reward.rarity}) · +${reward.fishingXp} Fishing XP!`,
      });
    } else {
      setLastOutcome({
        ok: false,
        text: '💦 Missed the timing! The fish slipped off the hook — cast again!',
      });
    }
    setPhase('result');
  }, [onCatchReward, phase, riverAltarDone, spiritAltarDone, stopLoops, zoneStart, zoneWidth]);

  // Support Spacebar to Cast / Reel seamlessly on PC!
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'idle' || phase === 'result') startCast();
        else if (phase === 'splash') attemptReel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attemptReel, open, phase, startCast]);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Riverside Pier · Mekong Fishing Pond"
      subtitle={`Fishing Lv.${fishingSkill.level}${fasterBite ? ' · Faster Bite (-25%)' : ''}${riverAltarDone ? ' · River Altar (+20% XP)' : ''}`}
      maxWidthClass="w-[min(94vw,490px)]"
    >
      <div className="space-y-3.5 text-xs">
        {/* Shimmering Pond Stage */}
        <div className="relative h-32 rounded-2xl bg-gradient-to-b from-sky-700 via-cyan-800 to-teal-950 border-2 border-amber-900/50 overflow-hidden flex flex-col items-center justify-center p-3 text-center shadow-inner">
          <Waves className="w-8 h-8 text-cyan-300/60 mb-1" />
          {phase === 'idle' && (
            <div className="font-display font-bold text-sm text-cyan-50">
              Calm Mekong waters shimmer near the wooden pier...
            </div>
          )}
          {phase === 'waiting' && (
            <div className="space-y-1">
              <div className="text-2xl animate-bounce">🎣</div>
              <div className="font-display font-bold text-sm text-amber-200 animate-pulse">
                Bobber floating... wait for SPLASH!
              </div>
            </div>
          )}
          {phase === 'splash' && (
            <div className="space-y-1">
              <div className="font-display font-bold text-2xl text-yellow-300 animate-bounce">
                💦 SPLASH!! REEL NOW!
              </div>
              <div className="text-[11px] font-bold text-cyan-100">
                Press [Space] or tap REEL IN inside the green zone!
              </div>
            </div>
          )}
          {phase === 'result' && lastOutcome && (
            <div
              className={`font-display font-bold text-sm px-3 py-1.5 rounded-xl border ${
                lastOutcome.ok
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-400'
                  : 'bg-rose-950/80 text-rose-200 border-rose-400'
              }`}
            >
              {lastOutcome.text}
            </div>
          )}
        </div>

        {/* Khmer River Timing Catch Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-amber-900 uppercase">
            <span>Catch Timing Bar</span>
            <span>{phase === 'splash' ? 'HIT THE GREEN ZONE!' : 'Ready'}</span>
          </div>
          <div className="relative w-full h-8 rounded-xl bg-slate-900 border-2 border-amber-900/70 overflow-hidden">
            {/* Green Catch Zone */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/85 border-x-2 border-emerald-200 transition-all"
              style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }}
            />
            {/* Moving Fish / Bobber Marker */}
            <div
              className="absolute top-0.5 bottom-0.5 w-3 -ml-1.5 rounded-md bg-yellow-300 border-2 border-amber-950 shadow-lg"
              style={{ left: `${markerPct}%` }}
            />
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex gap-2">
          {phase === 'splash' ? (
            <button
              type="button"
              onClick={attemptReel}
              className="w-full py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-sm shadow-lg active:scale-95 transition"
            >
              🐟 REEL IN! [Space]
            </button>
          ) : (
            <button
              type="button"
              disabled={phase === 'waiting'}
              onClick={startCast}
              className="w-full phum-btn py-3 rounded-xl font-display font-bold text-sm disabled:opacity-55 flex items-center justify-center gap-2"
            >
              <Fish className="w-4 h-4" />
              {phase === 'waiting' ? 'Waiting for a bite...' : 'Cast Line [Space]'}
            </button>
          )}
        </div>

        {/* Catch Table Preview */}
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/25 space-y-1">
          <div className="font-display font-bold text-[10px] uppercase text-amber-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Riverside Pier Catches
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] font-bold">
            {CATCH_TABLE.map((c) => (
              <span
                key={c.reward.label}
                className="px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-900/20"
              >
                {c.reward.label.split(' (')[0]} ({c.weight}%)
              </span>
            ))}
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
