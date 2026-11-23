import React, { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';
import { fetchTickerEventsApi } from '../game/network/ApiClient';
import { Megaphone, X } from 'lucide-react';

interface TickerItem {
  id: string;
  text: string;
}

const DEFAULT_WORLD_EVENTS: TickerItem[] = [
  {
    id: 'evt-monsoon',
    text: '🌧️ Monsoon Rain has begun — all farms auto-watered!',
  },
  {
    id: 'evt-yeak',
    text: '⚔️ A hero just defeated Yeak Thmor on Calamity Mode!',
  },
  {
    id: 'evt-shrine',
    text: '⛩️ Visit the Golden Blessing Shrine in Green Park for your daily Coins & +10% Luck!',
  },
  {
    id: 'evt-bus',
    text: '🚌 The Green Village Bus stops every 25s at Downtown Plaza — press [M] for the Fullscreen World Map!',
  },
];

/**
 * Sleek, semi-transparent top-of-screen scrolling world event ticker banner.
 */
export const ServerTickerBanner: React.FC = () => {
  const [events, setEvents] = useState<TickerItem[]>(DEFAULT_WORLD_EVENTS);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void fetchTickerEventsApi().then((list) => {
      if (list.length > 0) {
        const merged = [...list, ...DEFAULT_WORLD_EVENTS];
        const unique = merged.filter((item, idx, arr) => arr.findIndex((x) => x.text === item.text) === idx);
        setEvents(unique.slice(0, 12));
      }
    });

    const unsub = EventBus.on('ticker:push', ({ text }) => {
      setDismissed(false);
      setEvents((prev) => [
        { id: `live_${Date.now()}`, text },
        ...prev.filter((e) => e.text !== text).slice(0, 11),
      ]);
    });

    return unsub;
  }, []);

  if (dismissed || events.length === 0) return null;

  const tickerLine = events.map((e) => e.text).join('   ✦   ');

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-0 z-30 h-6 bg-slate-950/75 backdrop-blur-sm border-b border-amber-500/35 flex items-center px-2 gap-2 overflow-hidden">
      <style>{`
        @keyframes phumTickerScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .phum-ticker-track {
          display: inline-flex;
          white-space: nowrap;
          animation: phumTickerScroll 36s linear infinite;
        }
        .phum-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-display font-bold text-[9px] uppercase shrink-0">
        <Megaphone className="w-3 h-3" /> LIVE
      </span>

      <div className="flex-1 overflow-hidden relative">
        <div className="phum-ticker-track text-[10px] font-display font-bold text-amber-100/95">
          <span className="pr-12">{tickerLine}</span>
          <span className="pr-12" aria-hidden="true">
            {tickerLine}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hide Server Ticker"
        className="text-amber-300/75 hover:text-white shrink-0 p-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
