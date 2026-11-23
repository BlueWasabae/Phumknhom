import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@shared/types';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';
import { EventBus } from '../game/EventBus';
import { roomClient } from '../game/network/RoomClient';

interface ChatOverlayProps {
  open: boolean;
  playerName: string;
  messages: ChatMessage[];
  draftPrefill?: { text: string; nonce: number } | null;
  onAddMessage: (msg: ChatMessage) => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  open,
  playerName,
  messages,
  draftPrefill,
  onAddMessage,
}) => {
  const [input, setInput] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historyExpanded]);

  useEffect(() => {
    if (open && draftPrefill) {
      setInput(draftPrefill.text);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, draftPrefill]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim().slice(0, 140);
    if (!clean) return;

    // Support private direct messages: /w <username> <message>
    const whisperMatch = /^\/w\s+(\S+)\s+(.+)$/i.exec(clean);
    if (whisperMatch) {
      const targetName = whisperMatch[1];
      const body = whisperMatch[2].trim().slice(0, 120);
      if (!body) return;
      const sent = roomClient.sendWhisper(targetName, body);
      onAddMessage({
        id: `w-out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: `Whisper → ${targetName}`,
        text: sent ? body : `${body} (offline)`,
        timestamp: Date.now(),
      });
      setInput('');
      return;
    }

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: playerName,
      text: clean.slice(0, 120),
      timestamp: Date.now(),
    };
    onAddMessage(msg);
    EventBus.emit('player:chat', { text: clean.slice(0, 120) });
    setInput('');
  };

  return (
    <div className="fixed left-3 bottom-3 sm:bottom-4 z-30 w-[min(88vw,340px)] phum-panel rounded-2xl overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => setHistoryExpanded((v) => !v)}
        className="px-3 py-1.5 phum-wood flex items-center justify-between text-[11px] font-display font-bold"
      >
        <span>Area & Whisper Chat ({messages.length})</span>
        {historyExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {historyExpanded && (
        <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-1 text-xs bg-amber-50/75">
          {messages.map((m) => {
            const isWhisper = m.sender.startsWith('Whisper ');
            return (
              <div
                key={m.id}
                className={`leading-snug ${isWhisper ? 'text-purple-900 italic' : ''}`}
              >
                <span className={`font-bold mr-1 ${isWhisper ? 'text-purple-700' : 'text-amber-900'}`}>
                  {m.sender}:
                </span>
                <span className={isWhisper ? 'text-purple-950' : 'text-amber-950'}>{m.text}</span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-2 bg-amber-100/90 border-t-2 border-amber-900/25 flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          maxLength={140}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chat or /w <name> <msg>..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border-2 border-amber-900/35 text-xs text-amber-950 placeholder:text-amber-800/50 focus:outline-none focus:border-amber-700"
        />
        <button
          type="submit"
          aria-label="Send chat message"
          className="phum-btn px-2.5 py-1.5 rounded-lg"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
