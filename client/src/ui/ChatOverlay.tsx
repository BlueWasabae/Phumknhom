import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@shared/types';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';
import { EventBus } from '../game/EventBus';
import { roomClient } from '../game/network/RoomClient';

interface ChatOverlayProps {
  open: boolean;
  playerName: string;
  kromTag?: string | null;
  isVip?: boolean;
  messages: ChatMessage[];
  draftPrefill?: { text: string; nonce: number } | null;
  onAddMessage: (msg: ChatMessage) => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  open,
  playerName,
  kromTag,
  isVip = false,
  messages,
  draftPrefill,
  onAddMessage,
}) => {
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState<'area' | 'krom'>('area');
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleMessages =
    channel === 'krom'
      ? messages.filter((m) => m.channel === 'krom')
      : messages.filter((m) => m.channel !== 'krom');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length, historyExpanded, channel]);

  useEffect(() => {
    if (open && draftPrefill) {
      setChannel('area');
      setInput(draftPrefill.text);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, draftPrefill]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim().slice(0, 140);
    if (!clean) return;

    if (channel === 'krom') {
      if (!kromTag) {
        onAddMessage({
          id: `krom-sys-${Date.now()}`,
          sender: 'Krom Hall',
          text: 'Join or create a Krom (MENU → Krom Guild) to chat with guildmates!',
          timestamp: Date.now(),
          channel: 'krom',
        });
        setInput('');
        return;
      }
      roomClient.sendKromChat(kromTag, clean.slice(0, 120));
      onAddMessage({
        id: `krom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: `[${kromTag}] ${playerName}`,
        text: clean.slice(0, 120),
        timestamp: Date.now(),
        channel: 'krom',
        kromTag,
        isVip,
      });
      setInput('');
      return;
    }

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
        channel: 'whisper',
      });
      setInput('');
      return;
    }

    const displaySender = kromTag ? `[${kromTag}] ${playerName}` : playerName;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: displaySender,
      text: clean.slice(0, 120),
      timestamp: Date.now(),
      channel: 'area',
      isVip,
    };
    onAddMessage(msg);
    EventBus.emit('player:chat', { text: clean.slice(0, 120) });
    setInput('');
  };

  return (
    <div className="fixed left-3 bottom-3 sm:bottom-4 z-30 w-[min(88vw,350px)] phum-panel rounded-2xl overflow-hidden flex flex-col">
      <div className="px-2.5 py-1.5 phum-wood flex items-center justify-between gap-2 text-[11px] font-display font-bold">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChannel('area')}
            className={`px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer ${
              channel === 'area'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-amber-950/50 text-amber-200 hover:bg-amber-900'
            }`}
          >
            Area Chat
          </button>
          <button
            type="button"
            onClick={() => setChannel('krom')}
            className={`px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer ${
              channel === 'krom'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-amber-950/50 text-amber-200 hover:bg-amber-900'
            }`}
          >
            🛡️ Krom {kromTag ? `[${kromTag}]` : ''}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setHistoryExpanded((v) => !v)}
          className="text-amber-100 hover:text-amber-300 cursor-pointer"
          aria-label="Toggle chat history"
        >
          {historyExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {historyExpanded && (
        <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-1 text-xs bg-amber-50/75">
          {visibleMessages.length === 0 ? (
            <div className="text-[11px] text-amber-800/75 italic">
              {channel === 'krom'
                ? kromTag
                  ? `Krom [${kromTag}] channel ready — say hi to your guildmates!`
                  : 'Create or join a Krom in MENU → Krom Guild to unlock Krom Chat!'
                : 'Say hello to villagers in your Plaza Area!'}
            </div>
          ) : (
            visibleMessages.map((m) => {
              const isWhisper = m.sender.startsWith('Whisper ') || m.channel === 'whisper';
              const isKrom = m.channel === 'krom';
              return (
                <div
                  key={m.id}
                  className={`leading-snug ${isWhisper ? 'text-purple-900 italic' : ''}`}
                >
                  {m.isVip && (
                    <span className="inline-block mr-1 px-1 py-0.2 rounded bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border border-amber-800/50 font-display font-bold text-[9px] align-middle">
                      👑 [VIP]
                    </span>
                  )}
                  <span
                    className={`font-bold mr-1 ${
                      isKrom ? 'text-amber-700' : isWhisper ? 'text-purple-700' : 'text-amber-900'
                    }`}
                  >
                    {m.sender}:
                  </span>
                  <span className={isWhisper ? 'text-purple-950' : 'text-amber-950'}>{m.text}</span>
                </div>
              );
            })
          )}
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
          placeholder={
            channel === 'krom'
              ? kromTag
                ? `Message [${kromTag}] Krom...`
                : 'Join a Krom to chat...'
              : 'Chat or /w <name> <msg>...'
          }
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
