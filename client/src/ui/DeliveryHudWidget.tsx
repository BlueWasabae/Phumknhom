import React, { useEffect, useState } from 'react';
import {
  deliveryJobManager,
  type ActiveDeliveryRun,
} from '../game/systems/DeliveryJobManager';
import type { VillageMapId } from '@shared/worldMapData';
import { CheckCircle2, Compass, Timer, Users, X } from 'lucide-react';

interface DeliveryHudWidgetProps {
  currentMapId: VillageMapId;
  onQuickTravelToMap: (mapId: VillageMapId) => void;
}

/**
 * Update 3.2 — Live 90-second Express Delivery Run Tracker HUD Widget
 * Shows remaining timer, Co-op +25% passenger bonus, and 3 hot village orders with 1-click route jump.
 */
export const DeliveryHudWidget: React.FC<DeliveryHudWidgetProps> = ({
  currentMapId,
  onQuickTravelToMap,
}) => {
  const [run, setRun] = useState<ActiveDeliveryRun | null>(() => deliveryJobManager.getActiveRun());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = deliveryJobManager.subscribe((next) => setRun(next));
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, []);

  if (!run) return null;

  const remSec = Math.max(0, Math.ceil((run.expiresAt - now) / 1000));
  const deliveredCount = run.orders.filter((o) => o.delivered).length;
  const nextOrder = run.orders.find((o) => !o.delivered);

  return (
    <div className="pointer-events-auto fixed right-3 top-24 z-30 w-[min(90vw,285px)] rounded-2xl bg-gradient-to-b from-amber-950/95 via-stone-950/95 to-slate-950/95 border-2 border-amber-400/85 text-amber-50 p-2.5 shadow-2xl text-xs">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-400/30">
        <div className="font-display font-extrabold text-amber-300 flex items-center gap-1.5">
          <span>📦</span> Express Delivery ({deliveredCount}/3)
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-display font-extrabold text-[11px] ${
              remSec <= 20
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-amber-400 text-amber-950'
            }`}
          >
            <Timer className="w-3 h-3" /> {remSec}s
          </span>
          <button
            type="button"
            onClick={() => deliveryJobManager.cancelRun()}
            aria-label="Cancel Delivery Run"
            className="p-0.5 rounded hover:bg-amber-800/80 text-amber-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {run.hasCoopPassenger && (
        <div className="mt-1.5 px-2 py-0.5 rounded-lg bg-emerald-700/80 border border-emerald-400/50 text-[10px] font-bold text-emerald-100 inline-flex items-center gap-1">
          <Users className="w-3 h-3" /> Co-op Passenger Active (+25% Speed Bonus!)
        </div>
      )}

      {run.completed ? (
        <div className="mt-2 p-2 rounded-xl bg-emerald-600/90 text-white font-display font-bold text-center">
          🏆 All 3 Hot Orders Delivered! Payout Received!
        </div>
      ) : run.failed ? (
        <div className="mt-2 p-2 rounded-xl bg-rose-700/90 text-white font-display font-bold text-center">
          ⏰ Time Expired! Visit Dispatch Board to retry.
        </div>
      ) : (
        <div className="mt-1.5 space-y-1">
          {run.orders.map((ord) => (
            <div
              key={ord.id}
              className={`px-2 py-1 rounded-xl border flex items-center justify-between gap-1.5 text-[10px] ${
                ord.delivered
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 line-through opacity-75'
                  : ord.mapId === currentMapId
                    ? 'bg-amber-900/75 border-amber-400 text-amber-50'
                    : 'bg-stone-900/80 border-stone-700 text-stone-200'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold truncate">
                  {ord.icon} {ord.itemName}
                </div>
                <div className="text-[9px] opacity-85 truncate">📍 {ord.mapLabel}</div>
              </div>
              {ord.delivered ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : ord.mapId !== currentMapId ? (
                <button
                  type="button"
                  onClick={() => onQuickTravelToMap(ord.mapId)}
                  className="px-1.5 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[9px] shrink-0 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Compass className="w-2.5 h-2.5" /> Go
                </button>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-extrabold text-[9px] shrink-0">
                  Follow Arrow!
                </span>
              )}
            </div>
          ))}
          {nextOrder && (
            <div className="text-[9px] text-amber-300/90 text-center pt-0.5">
              Follow the glowing golden compass arrow &amp; press <strong>[E]</strong> at the drop-off beacon!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
