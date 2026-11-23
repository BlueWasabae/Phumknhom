import React, { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';
import { fetchTickerEventsApi } from '../game/network/ApiClient';
import { Megaphone, X } from 'lucide-react';

interface TickerItem {
  id: string;
  text: string;
}

const DEFAULT_EVENTS: TickerItem[] = [
  {
    id: 'def-1',
    text: '🌏 Phnom Penh, Siem Reap & Kampot Servers LIVE · Press [M] to explore all 8 Fog-of-War Biomes & Pylons!',
  },
  {
    id: 'def-2',
    text: '🔨 Visit the Village Blacksmith for Legendary/Warding Reforges & dip relics into the Dungeon Apsara Shimmer Spring!',
  },
  {
    id: 'def-3',
    text: '🃏 Phum Night Club open in East Plaza — play Tien Len & Ouk Chaktrang with friends!',
  },
];

export const ServerTickerBanner: React.FC = () => {
  const [events, setEvents] = useState<TickerItem[]>(DEFAULT_EVENTS);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void fetchTickerEventsApi().then((list) => {
      if (list.length > 0) setEvents(list);
    });

    const unsub = EventBus.on('ticker:push', ({ text }) => {
      setDismissed(false);
      setEvents((prev) => [{ id: `live_${Date.now()}`, text }, ...prev.slice(0, 11)]);
      setIndex(0);
    });

    const timer = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, 6500);

    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, []);

  if (dismissed || events.length === 0) return null;
  const active = events[index % events.length];

  return (
    <div className="pointer-events-auto fixed bottom-1 left-2 z-20 hidden md:flex items-center gap-2 max-w-[420px] px-2.5 py-1 rounded-full bg-slate-950/85 border border-amber-500/50 text-[10px] font-display font-bold text-amber-100 shadow-lg">
      <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="truncate">{active.text}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hide Ticker"
        className="text-amber-300/80 hover:text-white shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
