import React, { useEffect, useRef, useState } from 'react';
import type { InstrumentSkinId, KhmerInstrumentId, PlayerState } from '@shared/types';
import {
  INSTRUMENT_KEYS,
  INSTRUMENT_SKINS,
  KHMER_INSTRUMENTS,
  KHMER_INSTRUMENT_LIST,
  getOwnedInstruments,
} from '@shared/khmerInstruments';
import { Coins, HeartHandshake, Music, Sparkles, X } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';
import { EventBus } from '../game/EventBus';

interface InstrumentJamModalProps {
  open: boolean;
  player: PlayerState;
  nearbyPerformer?: { sessionId: string; name: string; instrumentName: string } | null;
  onClose: () => void;
  onBuyOrEquipInstrument: (id: KhmerInstrumentId) => void;
  onEquipSkin: (skin: InstrumentSkinId) => void;
  onTipPerformer: (sessionId: string, name: string, amount: 10 | 50) => void;
}

export const InstrumentJamModal: React.FC<InstrumentJamModalProps> = ({
  open,
  player,
  nearbyPerformer,
  onClose,
  onBuyOrEquipInstrument,
  onEquipSkin,
  onTipPerformer,
}) => {
  const [activePad, setActivePad] = useState<number | null>(null);
  const [notesPlayed, setNotesPlayed] = useState<number>(0);
  const [showShopDrawer, setShowShopDrawer] = useState(false);
  const padTimeoutRef = useRef<number | null>(null);

  const owned = getOwnedInstruments(player);
  const activeId: KhmerInstrumentId =
    player.equippedInstrument && player.equippedInstrument in KHMER_INSTRUMENTS
      ? player.equippedInstrument
      : 'roneat_aek';
  const activeDef = KHMER_INSTRUMENTS[activeId];
  const ownedSkins: InstrumentSkinId[] =
    player.ownedInstrumentSkins && player.ownedInstrumentSkins.length > 0
      ? player.ownedInstrumentSkins
      : ['classic'];
  const activeSkin: InstrumentSkinId = player.equippedInstrumentSkin ?? 'classic';

  const triggerNote = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(7, idx));
    soundManager.playInstrumentNote(activeId, safeIdx, 1.0);
    setActivePad(safeIdx);
    setNotesPlayed((n) => n + 1);
    if (padTimeoutRef.current) window.clearTimeout(padTimeoutRef.current);
    padTimeoutRef.current = window.setTimeout(() => setActivePad(null), 160);
    EventBus.emit('music:localNote', {
      instrumentId: activeId,
      skin: activeSkin,
      noteIndex: safeIdx,
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const upper = e.key.toUpperCase();
      const idx = INSTRUMENT_KEYS.indexOf(upper as (typeof INSTRUMENT_KEYS)[number]);
      if (idx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        triggerNote(idx);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeId, activeSkin]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-3 z-40 mx-auto w-[min(96vw,780px)] px-2">
      <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-950/95 via-amber-950/92 to-slate-950/96 p-3 shadow-2xl backdrop-blur-md text-amber-50">
        {/* Top Row: Active Instrument + Instrument Switcher + Tip Jar + Close */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/25">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/50 text-lg">
              {activeDef.icon}
            </span>
            <div>
              <div className="flex items-center gap-1.5 font-display text-xs font-black text-amber-200">
                <Music className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {activeDef.name} ({activeDef.khmerName})
                </span>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] text-amber-200">
                  {INSTRUMENT_SKINS[activeSkin].badge}
                </span>
              </div>
              <div className="text-[10px] text-amber-200/75">
                Press <b>A S D F G H J K</b> or tap pads to jam live with nearby villagers! ({notesPlayed} notes)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowShopDrawer((v) => !v)}
              className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 cursor-pointer"
            >
              🎶 {showShopDrawer ? 'Hide Instruments' : 'Switch / Buy (5)'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Instrument Bar"
              className="rounded-lg border border-slate-700 bg-slate-800/90 p-1 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional Instrument Switcher & Skin Selector Drawer */}
        {showShopDrawer && (
          <div className="my-2 space-y-2 rounded-xl border border-amber-500/30 bg-slate-900/90 p-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {KHMER_INSTRUMENT_LIST.map((inst) => {
                const isOwned = owned.includes(inst.id);
                const isEquipped = inst.id === activeId;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => onBuyOrEquipInstrument(inst.id)}
                    className={`rounded-xl border p-2 text-left transition cursor-pointer ${
                      isEquipped
                        ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                        : isOwned
                          ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-amber-400/60'
                          : 'border-amber-700/40 bg-slate-950/80 text-amber-200/90 hover:border-amber-400'
                    }`}
                  >
                    <div className="text-sm font-bold">
                      {inst.icon} {inst.name}
                    </div>
                    <div className="text-[10px] text-amber-300/85">{inst.khmerName}</div>
                    <div className="mt-1 text-[9px] font-black uppercase">
                      {isEquipped ? '✓ Playing' : isOwned ? 'Equip' : `🪙 ${inst.buyCoins}c`}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-bold text-slate-300">Instrument Skin:</span>
                {(['classic', 'golden_angkor', 'celestial_apsara'] as InstrumentSkinId[]).map((sid) => {
                  const has = ownedSkins.includes(sid);
                  return (
                    <button
                      key={sid}
                      type="button"
                      disabled={!has}
                      onClick={() => onEquipSkin(sid)}
                      className={`rounded-md px-2 py-0.5 font-bold ${
                        activeSkin === sid
                          ? 'bg-amber-400 text-slate-950'
                          : has
                            ? 'bg-slate-800 text-amber-200 hover:bg-slate-700'
                            : 'bg-slate-900 text-slate-500 opacity-60'
                      }`}
                    >
                      {INSTRUMENT_SKINS[sid].name} {!has ? '(💎 Store)' : ''}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-amber-300">
                Tips Earned: <b>{(player.instrumentTipsReceived ?? 0).toLocaleString()}c</b>
              </span>
            </div>
          </div>
        )}

        {/* 8-Pad Khmer Pentatonic Keyboard Bar (A S D F G H J K) */}
        <div className="mt-2 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {INSTRUMENT_KEYS.map((keyChar, idx) => {
            const pressed = activePad === idx;
            return (
              <button
                key={keyChar}
                type="button"
                onMouseDown={() => triggerNote(idx)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  triggerNote(idx);
                }}
                className={`flex flex-col items-center justify-center rounded-xl border-2 py-2.5 px-1 transition select-none cursor-pointer ${
                  pressed
                    ? 'scale-95 border-yellow-200 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-400/50'
                    : 'border-amber-500/45 bg-gradient-to-b from-amber-900/70 to-stone-900/90 text-amber-100 hover:border-amber-300 hover:brightness-110'
                }`}
              >
                <span className="text-[10px] font-black opacity-80">[{keyChar}]</span>
                <span className="mt-0.5 font-display text-xs font-black">
                  {activeDef.noteLabels[idx]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tip Jar Strip for Nearby Performers or Street Busking Status */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/80 px-2.5 py-1.5 text-[11px]">
          {nearbyPerformer ? (
            <>
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <HeartHandshake className="h-3.5 w-3.5" />
                Listening to {nearbyPerformer.name} ({nearbyPerformer.instrumentName})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={player.currencies.coins < 10}
                  onClick={() => onTipPerformer(nearbyPerformer.sessionId, nearbyPerformer.name, 10)}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950 hover:bg-amber-400 disabled:opacity-45 cursor-pointer"
                >
                  <Coins className="h-3 w-3" /> Tip 10c (+Friendly)
                </button>
                <button
                  type="button"
                  disabled={player.currencies.coins < 50}
                  onClick={() => onTipPerformer(nearbyPerformer.sessionId, nearbyPerformer.name, 50)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-45 cursor-pointer"
                >
                  <Coins className="h-3 w-3" /> Tip 50c (+15 Friendly)
                </button>
              </div>
            </>
          ) : (
            <span className="text-amber-200/80">
              🏮 Street Musician Tip Jar active! Nearby players who hear your notes can tip <b>10c / 50c</b> for mutual{' '}
              <b>+Friendly XP</b>.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
