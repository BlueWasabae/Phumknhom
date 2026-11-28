import React, { useEffect, useRef, useState } from 'react';
import type { FishingBitePayload } from '../game/EventBus';
import { soundManager } from '../game/systems/SoundManager';

interface FishingMiniGameProps {
  bite: FishingBitePayload | null;
  onComplete: (success: boolean, bite: FishingBitePayload) => void;
  onCancel: () => void;
}

const TRACK_HEIGHT = 240;
const BAR_HEIGHT = 76;
const FISH_SIZE = 28;

/**
 * Update 2.3 / 3.4 Polish — Stage 3 Interactive Reeling Mini-Game Overlay:
 * Hold Click, Touch, or Spacebar to raise the buoyant golden Catch Bar over the darting Mekong fish
 * until the catch progress bar fills to 100%!
 * Uses stable callback refs + global pointerup/blur safety so parent state ticks NEVER reset an active reel.
 */
export const FishingMiniGame: React.FC<FishingMiniGameProps> = ({ bite, onComplete, onCancel }) => {
  const [barY, setBarY] = useState(100);
  const [fishY, setFishY] = useState(120);
  const [progress, setProgress] = useState(35);
  const [holding, setHolding] = useState(false);

  const holdingRef = useRef(false);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;

  const stateRef = useRef({
    barY: 100,
    barVel: 0,
    fishY: 120,
    fishTargetY: 90,
    nextDartAt: 0,
    progress: 35,
  });

  useEffect(() => {
    if (!bite) return;
    finishedRef.current = false;
    holdingRef.current = false;
    setHolding(false);
    stateRef.current = {
      barY: 100,
      barVel: 0,
      fishY: 120,
      fishTargetY: 80,
      nextDartAt: performance.now() + 520,
      progress: 35,
    };
    setBarY(100);
    setFishY(120);
    setProgress(35);

    const releaseHold = () => {
      holdingRef.current = false;
      setHolding(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        holdingRef.current = true;
        setHolding(true);
      } else if (e.key === 'Escape') {
        finishedRef.current = true;
        onCancelRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        releaseHold();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('pointerup', releaseHold);
    window.addEventListener('pointercancel', releaseHold);
    window.addEventListener('blur', releaseHold);

    let rafId = 0;
    let lastTs = performance.now();
    const diff = Math.max(1, bite.difficulty);

    const tick = (now: number) => {
      if (finishedRef.current) return;
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const s = stateRef.current;

      // Smooth buoyant catch bar physics (gravity pulls down, holding lifts responsively upward)
      const accel = holdingRef.current ? -720 : 520;
      s.barVel = Math.max(-340, Math.min(320, s.barVel + accel * dt));
      s.barY += s.barVel * dt;
      if (s.barY < 0) {
        s.barY = 0;
        s.barVel = 0;
      } else if (s.barY > TRACK_HEIGHT - BAR_HEIGHT) {
        s.barY = TRACK_HEIGHT - BAR_HEIGHT;
        s.barVel = -s.barVel * 0.22;
      }

      // Fish darting AI scaled by rarity difficulty (smooth & readable!)
      if (now >= s.nextDartAt) {
        const minSpan = Math.max(320, 1150 - diff * 155);
        const maxSpan = Math.max(580, 1750 - diff * 195);
        s.nextDartAt = now + minSpan + Math.random() * (maxSpan - minSpan);
        s.fishTargetY = 10 + Math.random() * (TRACK_HEIGHT - FISH_SIZE - 20);
      }
      const fishSpeed = 68 + diff * 40;
      const fDiff = s.fishTargetY - s.fishY;
      s.fishY += Math.sign(fDiff) * Math.min(Math.abs(fDiff), fishSpeed * dt);

      // Overlap check between fish center and golden Catch Bar
      const fishCenter = s.fishY + FISH_SIZE / 2;
      const inBar = fishCenter >= s.barY - 6 && fishCenter <= s.barY + BAR_HEIGHT + 6;
      if (inBar) {
        s.progress = Math.min(100, s.progress + 44 * dt);
      } else {
        s.progress = Math.max(0, s.progress - (9.5 + diff * 1.8) * dt);
      }

      setBarY(s.barY);
      setFishY(s.fishY);
      setProgress(s.progress);

      if (s.progress >= 100) {
        finishedRef.current = true;
        soundManager.playSfx('coin');
        onCompleteRef.current(true, bite);
        return;
      }
      if (s.progress <= 0) {
        finishedRef.current = true;
        onCompleteRef.current(false, bite);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('pointerup', releaseHold);
      window.removeEventListener('pointercancel', releaseHold);
      window.removeEventListener('blur', releaseHold);
    };
  }, [bite]);

  if (!bite) return null;

  const fishCenter = fishY + FISH_SIZE / 2;
  const isHooked = fishCenter >= barY - 4 && fishCenter <= barY + BAR_HEIGHT + 4;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-end pr-4 sm:pr-10"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="pointer-events-auto phum-panel rounded-3xl p-4 w-64 border-[3px] border-amber-400 shadow-[0_0_32px_rgba(250,204,21,0.4)] select-none touch-none"
        onPointerDown={(e) => {
          e.preventDefault();
          holdingRef.current = true;
          setHolding(true);
        }}
        onPointerUp={() => {
          holdingRef.current = false;
          setHolding(false);
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display font-bold text-xs text-yellow-300 tracking-wide">
              🎣 REELING IN!
            </p>
            <p className="font-khmer text-[11px] font-bold" style={{ color: bite.color }}>
              {bite.rarity.toUpperCase()} BITE
            </p>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onCancel}
            className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 my-2">
          {/* Vertical Mekong River Track */}
          <div
            className="relative w-14 rounded-2xl border-2 border-sky-300/70 bg-gradient-to-b from-sky-900 via-cyan-950 to-slate-950 overflow-hidden shadow-inner"
            style={{ height: TRACK_HEIGHT }}
          >
            {/* Buoyant Golden Catch Bar */}
            <div
              className={`absolute left-1 right-1 rounded-xl border-2 transition-colors ${
                isHooked
                  ? 'bg-emerald-400/55 border-yellow-300 shadow-[0_0_12px_rgba(74,222,128,0.8)]'
                  : 'bg-amber-400/35 border-amber-300/80'
              }`}
              style={{ top: barY, height: BAR_HEIGHT }}
            />
            {/* Swimming Fish Icon */}
            <div
              className="absolute left-0 right-0 flex items-center justify-center text-2xl drop-shadow"
              style={{ top: fishY, height: FISH_SIZE }}
            >
              {bite.emoji}
            </div>
          </div>

          {/* Vertical Catch Progress Bar */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] font-bold text-amber-200">{Math.round(progress)}%</span>
            <div
              className="w-4 rounded-full bg-slate-900 border border-amber-500/60 overflow-hidden flex flex-col justify-end"
              style={{ height: TRACK_HEIGHT - 20 }}
            >
              <div
                className="w-full rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(0, Math.min(100, progress))}%`,
                  background:
                    progress > 70
                      ? 'linear-gradient(to top, #22c55e, #fde047)'
                      : 'linear-gradient(to top, #f97316, #facc15)',
                }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`w-full py-2.5 mt-1 rounded-2xl font-display font-bold text-xs border-2 transition ${
            holding
              ? 'bg-emerald-500 text-slate-950 border-yellow-200 scale-[0.98]'
              : 'bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 border-amber-950'
          }`}
        >
          {holding ? '⬆️ LIFTING HOOK...' : 'HOLD CLICK / SPACE TO REEL'}
        </button>
      </div>
    </div>
  );
};
