import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@shared/types';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';
import { EventBus } from '../game/EventBus';

interface ChatOverlayProps {
  open: boolean;
  playerName: string;
  messages: ChatMessage[];
  onAddMessage: (msg: ChatMessage) => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  open,
  playerName,
  messages,
  onAddMessage,
}) => {
  const [input, setInput] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historyExpanded]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim().slice(0, 120);
    if (!clean) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: playerName,
      text: clean,
      timestamp: Date.now(),
    };
    onAddMessage(msg);
    EventBus.emit('player:chat', { text: clean });
    setInput('');
  };

  return (
    <div className="fixed left-3 bottom-3 sm:bottom-4 z-30 w-[min(88vw,340px)] hud-dark rounded-2xl overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => setHistoryExpanded((v) => !v)}
        className="px-3 py-1.5 bg-slate-950/80 border-b border-amber-400/30 flex items-center justify-between text-[11px] font-display font-bold text-amber-200"
      >
        <span>Area Chat ({messages.length})</span>
        {historyExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {historyExpanded && (
        <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-1 text-xs">
          {messages.map((m) => (
            <div key={m.id} className="leading-snug">
              <span className="font-bold text-amber-300 mr-1">{m.sender}:</span>
              <span className="text-slate-100">{m.text}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-2 bg-slate-950/80 border-t border-slate-700/80 flex gap-1.5">
        <input
          type="text"
          maxLength={120}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type message & press Enter..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          aria-label="Send chat message"
          className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
