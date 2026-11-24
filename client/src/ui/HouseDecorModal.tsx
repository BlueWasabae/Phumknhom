import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  DEFAULT_HOUSE_DECOR,
  HOUSE_FURNITURE_CATALOG,
  HOUSE_FURNITURE_LIST,
  getOwnedFurnitureCount,
  getPlacedFurnitureCount,
  isBossTrophyUnlocked,
} from '@shared/houseDecor';
import { EventBus } from '../game/EventBus';
import { Armchair, Lock, RotateCw, Trash2, Trophy, Users } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface HouseDecorModalProps {
  open: boolean;
  player: PlayerState;
  decorateMode: boolean;
  onToggleDecorateMode: (active: boolean, itemId?: string | null) => void;
  onBuyFurniture: (itemId: string) => void;
  onInviteFriendsHome: () => void;
  onClose: () => void;
}

export const HouseDecorModal: React.FC<HouseDecorModalProps> = ({
  open,
  player,
  decorateMode,
  onToggleDecorateMode,
  onBuyFurniture,
  onInviteFriendsHome,
  onClose,
}) => {
  const [tab, setTab] = useState<'starter' | 'trophies' | 'placed'>('starter');
  const placedDecor = player.houseDecor ?? DEFAULT_HOUSE_DECOR;

  const starterItems = HOUSE_FURNITURE_LIST.filter((f) => f.category === 'starter');
  const trophyItems = HOUSE_FURNITURE_LIST.filter((f) => f.category === 'trophy');

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏡 Decorate My Khmer Stilt House"
      subtitle={`Coins: ${player.currencies.coins.toLocaleString()}c · Placed Items: ${placedDecor.length} · Auto-Saved to Cloud`}
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Top Action Bar: Grid Mode Toggle + Invite Friends */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-100/90 border-2 border-amber-900/30">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleDecorateMode(!decorateMode, null)}
              className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 transition ${
                decorateMode
                  ? 'bg-emerald-700 text-white border-emerald-950'
                  : 'bg-amber-800 text-amber-50 border-amber-950'
              }`}
            >
              {decorateMode ? '✓ Grid Edit Mode: ON (Click Floor to Move)' : '📐 Enable Grid Edit Mode'}
            </button>
            <button
              type="button"
              onClick={onInviteFriendsHome}
              className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white border-2 border-sky-950 font-display font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5" />
              Invite Friends to Home
            </button>
          </div>
          <span className="text-[10px] font-semibold text-amber-900">
            Click <strong>Place Now</strong> to add immediately, or enable Grid Mode to drag/rotate!
          </span>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['starter', 'Khmer Furniture (6)', Armchair],
              ['trophies', 'Boss Trophies (4)', Trophy],
              ['placed', `In Room (${placedDecor.length})`, RotateCw],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                tab === id
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[52dvh] overflow-y-auto pr-1">
          {tab === 'starter' && (
            <div className="grid sm:grid-cols-2 gap-2">
              {starterItems.map((item) => {
                const owned = getOwnedFurnitureCount(player, item.id);
                const placed = getPlacedFurnitureCount(player, item.id);
                const available = Math.max(0, owned - placed);
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-amber-50/95 border-2 border-amber-900/30 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-amber-950">
                          {item.icon} {item.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                          {available} Ready ({placed}/{owned})
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-amber-700">{item.khmerName}</div>
                      <p className="text-[10px] text-amber-900/85 mt-1 leading-snug">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={available <= 0}
                        onClick={() => {
                          EventBus.emit('house:placeQuick', { itemId: item.id });
                          onClose();
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[11px] disabled:opacity-45"
                      >
                        ✨ Place Now
                      </button>
                      <button
                        type="button"
                        disabled={available <= 0}
                        onClick={() => {
                          onToggleDecorateMode(true, item.id);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-display font-bold text-[11px] disabled:opacity-45"
                      >
                        Grid
                      </button>
                      {item.buyCoins && (
                        <button
                          type="button"
                          disabled={player.currencies.coins < item.buyCoins}
                          onClick={() => onBuyFurniture(item.id)}
                          className="px-2 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-display font-bold text-[10px] disabled:opacity-45"
                        >
                          +{item.buyCoins}c
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'trophies' && (
            <div className="grid sm:grid-cols-2 gap-2">
              {trophyItems.map((item) => {
                const unlocked = isBossTrophyUnlocked(player, item);
                const placed = getPlacedFurnitureCount(player, item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                      unlocked
                        ? 'bg-slate-900 text-amber-50 border-amber-500/60'
                        : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs">
                          {item.icon} {item.name}
                        </span>
                        {unlocked ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                            ✓ UNLOCKED ({placed}/2)
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-500 text-white font-bold inline-flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-amber-500">{item.khmerName}</div>
                      <p className="text-[10px] opacity-85 mt-1 leading-snug">{item.description}</p>
                      {!unlocked && item.requiredBossLabel && (
                        <div className="text-[10px] font-bold text-rose-700 mt-1">
                          Defeat {item.requiredBossLabel} in Boss Caverns to unlock!
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!unlocked || placed >= 2}
                      onClick={() => {
                        EventBus.emit('house:placeQuick', { itemId: item.id });
                        onClose();
                      }}
                      className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-[11px] disabled:opacity-45"
                    >
                      {unlocked ? '🏆 Place Boss Trophy in Room' : '🔒 Defeat Boss to Unlock'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'placed' && (
            <div className="space-y-1.5">
              {placedDecor.length === 0 ? (
                <div className="p-4 text-center text-amber-900/75">
                  No furniture placed yet. Switch to Khmer Furniture or Boss Trophies to decorate!
                </div>
              ) : (
                placedDecor.map((entry) => {
                  const def = HOUSE_FURNITURE_CATALOG[entry.itemId];
                  return (
                    <div
                      key={entry.uid}
                      className="p-2 rounded-xl bg-amber-50 border border-amber-900/30 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-display font-bold text-xs text-amber-950">
                          {def?.icon ?? '🪑'} {def?.name ?? entry.itemId}
                        </div>
                        <div className="text-[10px] text-amber-800">
                          Grid ({entry.x}, {entry.y}) · Rotation {entry.rotation ?? 0}°
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => EventBus.emit('house:rotateDecor', { uid: entry.uid })}
                          className="px-2 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" /> Rotate
                        </button>
                        <button
                          type="button"
                          onClick={() => EventBus.emit('house:removeDecor', { uid: entry.uid })}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Pick Up
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
