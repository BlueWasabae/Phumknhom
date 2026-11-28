import React from 'react';
import type { DiveHudPayload } from '../game/EventBus';

interface DiveHudOverlayProps {
  dive: DiveHudPayload | null;
  onSurface: () => void;
}

export const DiveHudOverlay: React.FC<DiveHudOverlayProps> = ({ dive, onSurface }) => {
  if (!dive || !dive.active) return null;

  const pct = Math.max(0, Math.min(100, (dive.oxygenSec / Math.max(1, dive.maxOxygenSec)) * 100));
  const lowAir = dive.oxygenSec <= 10;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex flex-col items-center px-3">
      <div
        className={`pointer-events-auto w-full max-w-lg rounded-2xl border-2 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-colors ${
          lowAir
            ? 'border-rose-400 bg-rose-950/90 animate-pulse'
            : 'border-cyan-400/80 bg-slate-950/88'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
          <div className="flex items-center gap-2 text-cyan-100">
            <span>🫧 OXYGEN TANK</span>
            {dive.nagaScaleBonus && (
              <span className="rounded-full border border-emerald-400/60 bg-emerald-950/80 px-2 py-0.5 text-[10px] text-emerald-200">
                🐍 Naga Scale +20s
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-cyan-300">Depth {dive.depthMeters}m</span>
            <span className={`font-mono text-sm font-black ${lowAir ? 'text-rose-200' : 'text-cyan-200'}`}>
              {dive.oxygenSec.toFixed(1)}s / {dive.maxOxygenSec}s
            </span>
          </div>
        </div>

        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border border-cyan-500/40 bg-slate-900">
          <div
            className={`h-full transition-all duration-100 ${
              lowAir
                ? 'bg-gradient-to-r from-rose-600 via-rose-400 to-amber-300'
                : 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-300'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-cyan-100">
            <span className="rounded-lg border border-cyan-500/40 bg-cyan-950/70 px-2 py-0.5">
              🫧 Pearls: <strong className="text-white">{dive.seaPearls}</strong>
            </span>
            <span className="rounded-lg border border-rose-400/40 bg-rose-950/50 px-2 py-0.5">
              🪸 Coral: <strong className="text-white">{dive.coralShards}</strong>
            </span>
            {dive.treasureMaps > 0 && (
              <span className="rounded-lg border border-amber-400/50 bg-amber-950/60 px-2 py-0.5 text-amber-200">
                🗺️ Maps: {dive.treasureMaps}
              </span>
            )}
            {dive.ancientPearls > 0 && (
              <span className="rounded-lg border border-cyan-300 bg-cyan-900/80 px-2 py-0.5 text-cyan-100 shadow">
                ✨ Ancient Pearl: {dive.ancientPearls}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onSurface}
            className={`rounded-lg border px-3 py-1 text-[11px] font-black shadow transition active:scale-95 ${
              dive.nearSurfaceBuoy
                ? 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-500'
                : 'border-cyan-300/70 bg-cyan-800/90 text-cyan-50 hover:bg-cyan-700'
            }`}
          >
            ⬆️ Surface at Buoy (Keep 100%)
          </button>
        </div>
      </div>
    </div>
  );
};
