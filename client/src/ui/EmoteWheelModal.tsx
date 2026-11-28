import React, { useState } from 'react';
import {
  KHMER_EMOTE_LIST,
  isEmoteUnlocked,
  type KhmerEmoteDef,
  type KhmerEmoteId,
} from '@shared/emotes';
import type { PlayerState } from '@shared/types';
import { Lock, Sparkles, X } from 'lucide-react';

interface EmoteWheelModalProps {
  open: boolean;
  player: PlayerState;
  activeEmoteId?: KhmerEmoteId | null;
  onSelectEmote: (emote: KhmerEmoteDef) => void;
  onOpenDiamondStore: () => void;
  onOpenSeasonPass: () => void;
  onClose: () => void;
}

/**
 * Update 3.1 — Crisp Radial Khmer Emote & Dance Wheel (`Z` key & HUD/Mobile Lotus Button).
 * Displays 6 free Khmer cultural emotes + 2 prestige animated emotes arranged radially around
 * a golden lotus center hub, synced in real time across PlazaRoom.
 */
export const EmoteWheelModal: React.FC<EmoteWheelModalProps> = ({
  open,
  player,
  activeEmoteId,
  onSelectEmote,
  onOpenDiamondStore,
  onOpenSeasonPass,
  onClose,
}) => {
  const [hovered, setHovered] = useState<KhmerEmoteDef>(KHMER_EMOTE_LIST[0]);

  if (!open) return null;

  const radius = 128;
  const center = 178;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-3"
      onClick={onClose}
    >
      <div
        className="relative w-[min(95vw,420px)] rounded-3xl bg-gradient-to-b from-amber-950/95 via-stone-950/95 to-slate-950/95 border-[3px] border-amber-400/80 shadow-[0_0_45px_rgba(250,204,21,0.28)] p-4 text-amber-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div>
            <div className="font-display font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
              <span>🪷</span> Khmer Emote &amp; Dance Wheel
              <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] text-amber-200">
                [Z]
              </span>
            </div>
            <div className="text-[10px] text-amber-200/80">
              Synced live across Plaza · Looping dances stop automatically when you walk
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Emote Wheel"
            className="w-8 h-8 rounded-full bg-amber-900/70 hover:bg-amber-800 border border-amber-400/50 flex items-center justify-center text-amber-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Radial Wheel Container */}
        <div className="relative mx-auto my-2" style={{ width: 356, height: 356 }}>
          {/* Decorative Sacred Angkor Rings */}
          <div className="absolute inset-[24px] rounded-full border-2 border-dashed border-amber-400/35 pointer-events-none" />
          <div className="absolute inset-[62px] rounded-full border border-amber-300/20 bg-amber-500/5 pointer-events-none" />

          {/* Center Golden Lotus Preview Hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[124px] h-[124px] rounded-full bg-gradient-to-b from-amber-900/95 to-stone-950 border-2 border-amber-400/85 flex flex-col items-center justify-center text-center px-2 shadow-inner">
            <span className="text-2xl leading-none mb-1">{hovered.icon}</span>
            <div className="font-display font-bold text-[11px] text-amber-200 leading-tight">
              {hovered.name}
            </div>
            <div className="text-[10px] text-amber-300/90 leading-tight">{hovered.khmerName}</div>
            {hovered.looping && (
              <span className="mt-1 px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-[8px] font-bold text-emerald-200">
                LOOPING
              </span>
            )}
          </div>

          {/* 8 Radial Emote Nodes */}
          {KHMER_EMOTE_LIST.map((emote, idx) => {
            const angle = (idx / KHMER_EMOTE_LIST.length) * Math.PI * 2 - Math.PI / 2;
            const nx = center + Math.cos(angle) * radius;
            const ny = center + Math.sin(angle) * radius;
            const unlocked = isEmoteUnlocked(player.ownedEmotes, emote.id);
            const isActive = activeEmoteId === emote.id;

            return (
              <button
                key={emote.id}
                type="button"
                onMouseEnter={() => setHovered(emote)}
                onFocus={() => setHovered(emote)}
                onClick={() => {
                  setHovered(emote);
                  if (unlocked) {
                    onSelectEmote(emote);
                    onClose();
                  }
                }}
                style={{
                  left: nx,
                  top: ny,
                  borderColor: isActive ? '#34d399' : unlocked ? emote.accentColor : '#64748b',
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-[78px] h-[78px] rounded-2xl border-2 flex flex-col items-center justify-center p-1 transition transform hover:scale-110 cursor-pointer shadow-lg ${
                  unlocked
                    ? emote.prestige
                      ? 'bg-gradient-to-b from-indigo-900/95 to-purple-950/95 text-amber-50'
                      : 'bg-gradient-to-b from-stone-800/95 to-amber-950/95 text-amber-50'
                    : 'bg-slate-900/90 text-slate-400 opacity-80'
                }`}
              >
                <div className="relative text-xl leading-none">
                  <span>{emote.icon}</span>
                  {!unlocked && (
                    <Lock className="w-3 h-3 text-amber-300 absolute -right-2.5 -top-1 drop-shadow" />
                  )}
                  {unlocked && emote.prestige && (
                    <Sparkles className="w-3 h-3 text-yellow-300 absolute -right-2.5 -top-1 drop-shadow" />
                  )}
                </div>
                <span className="mt-1 font-display font-bold text-[9px] leading-tight text-center line-clamp-2">
                  {emote.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected / Hovered Emote Description & Prestige Unlock Shortcuts */}
        <div className="p-2.5 rounded-xl bg-amber-900/40 border border-amber-400/35 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-bold text-amber-200">
              {hovered.icon} {hovered.name} ({hovered.khmerName})
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                isEmoteUnlocked(player.ownedEmotes, hovered.id)
                  ? 'bg-emerald-500/25 text-emerald-200'
                  : 'bg-purple-500/30 text-purple-200'
              }`}
            >
              {isEmoteUnlocked(player.ownedEmotes, hovered.id) ? 'UNLOCKED' : 'PRESTIGE'}
            </span>
          </div>
          <p className="text-amber-100/90 leading-snug">{hovered.description}</p>
          {!isEmoteUnlocked(player.ownedEmotes, hovered.id) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDiamondStore();
                }}
                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-[10px] cursor-pointer"
              >
                💎 Diamond Store ({hovered.diamondCost ?? 120} 💎)
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSeasonPass();
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-bold text-[10px] cursor-pointer"
              >
                👑 Season Pass Tier {hovered.seasonPassTier ?? 6}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
