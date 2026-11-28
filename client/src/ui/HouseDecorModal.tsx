import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  DEFAULT_HOUSE_DECOR,
  DEFAULT_YARD_DECOR,
  HOUSE_FURNITURE_CATALOG,
  HOUSE_FURNITURE_LIST,
  YARD_DECOR_CATALOG,
  YARD_DECOR_LIST,
  getOwnedFurnitureCount,
  getOwnedYardDecorCount,
  getPlacedFurnitureCount,
  getPlacedYardDecorCount,
  isBossTrophyUnlocked,
} from '@shared/houseDecor';
import { EventBus } from '../game/EventBus';
import { Armchair, Flower2, Lock, RotateCw, Sparkles, Trash2, Trophy, Users } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface HouseDecorModalProps {
  open: boolean;
  initialScope?: 'interior' | 'yard';
  player: PlayerState;
  decorateMode: boolean;
  onToggleDecorateMode: (active: boolean, itemId?: string | null) => void;
  onBuyFurniture: (itemId: string) => void;
  onBuyYardDecor?: (itemId: string) => void;
  onInviteFriendsHome: () => void;
  onClose: () => void;
}

export const HouseDecorModal: React.FC<HouseDecorModalProps> = ({
  open,
  initialScope = 'interior',
  player,
  decorateMode,
  onToggleDecorateMode,
  onBuyFurniture,
  onBuyYardDecor,
  onInviteFriendsHome,
  onClose,
}) => {
  const [scope, setScope] = useState<'interior' | 'yard'>(initialScope);
  const [tab, setTab] = useState<'starter' | 'trophies' | 'placed'>('starter');
  const [yardTab, setYardTab] = useState<'catalog' | 'placed'>('catalog');

  useEffect(() => {
    if (open) {
      setScope(initialScope);
    }
  }, [open, initialScope]);

  const placedDecor = player.houseDecor ?? DEFAULT_HOUSE_DECOR;
  const placedYard = player.yardDecor ?? DEFAULT_YARD_DECOR;

  const starterItems = HOUSE_FURNITURE_LIST.filter((f) => f.category === 'starter');
  const trophyItems = HOUSE_FURNITURE_LIST.filter((f) => f.category === 'trophy');

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={
        scope === 'yard'
          ? '🌺 Custom Stilt House Outdoor Garden Yard'
          : '🏡 Decorate My Khmer Stilt House'
      }
      subtitle={`Coins: ${player.currencies.coins.toLocaleString()}c · Diamonds: ${player.currencies.diamonds} 💎 · Interior: ${placedDecor.length} · Yard: ${placedYard.length}`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Scope Switcher: Interior vs Outdoor Garden Yard */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScope('interior')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
              scope === 'interior'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <Armchair className="w-4 h-4" /> House Interior ({placedDecor.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('yard')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
              scope === 'yard'
                ? 'bg-emerald-700 text-white border-emerald-950'
                : 'bg-emerald-50 text-emerald-950 border-emerald-900/30 hover:bg-emerald-100'
            }`}
          >
            <Flower2 className="w-4 h-4" /> Outdoor Garden Yard ({placedYard.length})
          </button>
        </div>

        {/* ==================== OUTDOOR GARDEN YARD SCOPE (UPDATE 2.9) ==================== */}
        {scope === 'yard' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-100/90 border-2 border-emerald-900/30">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setYardTab('catalog')}
                  className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 cursor-pointer ${
                    yardTab === 'catalog'
                      ? 'bg-emerald-700 text-white border-emerald-950'
                      : 'bg-white text-emerald-950 border-emerald-900/30'
                  }`}
                >
                  🌿 Yard Decor Shop &amp; Storage (8)
                </button>
                <button
                  type="button"
                  onClick={() => setYardTab('placed')}
                  className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 cursor-pointer ${
                    yardTab === 'placed'
                      ? 'bg-emerald-700 text-white border-emerald-950'
                      : 'bg-white text-emerald-950 border-emerald-900/30'
                  }`}
                >
                  📍 Placed in Yard ({placedYard.length})
                </button>
              </div>
              <span className="text-[10px] font-semibold text-emerald-950">
                Decorates the Front Yard of your Stilt House Homestead (auto-saved &amp; visible to friends!).
              </span>
            </div>

            <div className="max-h-[52dvh] overflow-y-auto pr-1">
              {yardTab === 'catalog' && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {YARD_DECOR_LIST.map((item) => {
                    const owned = getOwnedYardDecorCount(player, item.id);
                    const placed = getPlacedYardDecorCount(player, item.id);
                    const available = Math.max(0, owned - placed);
                    const isPrestige = item.tier === 'prestige';
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                          isPrestige
                            ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-amber-50 border-amber-400/70'
                            : 'bg-amber-50/95 text-amber-950 border-amber-900/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display font-bold text-xs flex items-center gap-1">
                              <span>{item.icon}</span>
                              <span>{item.name}</span>
                              {isPrestige && <Sparkles className="w-3 h-3 text-amber-300" />}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isPrestige ? 'bg-amber-400 text-slate-950' : 'bg-amber-200 text-amber-950'
                              }`}
                            >
                              {available} Ready ({placed}/{owned})
                            </span>
                          </div>
                          <div className={`text-[10px] font-bold ${isPrestige ? 'text-amber-300' : 'text-amber-700'}`}>
                            {item.khmerName}
                          </div>
                          <p className="text-[10px] opacity-85 mt-1 leading-snug">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={available <= 0}
                            onClick={() => {
                              EventBus.emit('yard:placeQuick', { itemId: item.id });
                              onClose();
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[11px] disabled:opacity-45 cursor-pointer"
                          >
                            🌺 Place in Yard
                          </button>
                          <button
                            type="button"
                            disabled={available <= 0}
                            onClick={() => {
                              EventBus.emit('yard:setDecorateMode', { active: true, itemId: item.id });
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-display font-bold text-[11px] disabled:opacity-45 cursor-pointer"
                          >
                            Grid
                          </button>
                          {onBuyYardDecor && (
                            <button
                              type="button"
                              disabled={
                                isPrestige
                                  ? player.currencies.diamonds < (item.buyDiamonds ?? 999)
                                  : player.currencies.coins < (item.buyCoins ?? 999)
                              }
                              onClick={() => onBuyYardDecor(item.id)}
                              className={`px-2 py-1.5 rounded-lg font-display font-bold text-[10px] disabled:opacity-45 cursor-pointer ${
                                isPrestige
                                  ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                                  : 'bg-amber-200 hover:bg-amber-300 text-amber-950'
                              }`}
                            >
                              {isPrestige ? `💎 ${item.buyDiamonds}` : `+${item.buyCoins}c`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {yardTab === 'placed' && (
                <div className="space-y-1.5">
                  {placedYard.length === 0 ? (
                    <div className="p-4 text-center text-emerald-950/75">
                      No outdoor garden decor placed yet. Place a Lotus Koi Pond or Stone Lantern!
                    </div>
                  ) : (
                    placedYard.map((entry) => {
                      const def = YARD_DECOR_CATALOG[entry.itemId];
                      return (
                        <div
                          key={entry.uid}
                          className="p-2 rounded-xl bg-amber-50 border border-amber-900/30 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-display font-bold text-xs text-amber-950">
                              {def?.icon ?? '🌺'} {def?.name ?? entry.itemId}
                            </div>
                            <div className="text-[10px] text-amber-800">
                              Yard Tile ({entry.x}, {entry.y})
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => EventBus.emit('yard:removeDecor', { uid: entry.uid })}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Pick Up
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==================== HOUSE INTERIOR SCOPE ==================== */
          <>
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

            <div className="max-h-[50dvh] overflow-y-auto pr-1">
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
          </>
        )}
      </div>
    </NativeDialog>
  );
};
