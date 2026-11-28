import React, { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  KHMER_ARTISAN_RECIPES,
  KHMER_ARTISAN_STATIONS,
  KHMER_ARTISAN_STATION_LIST,
  type ArtisanStationId,
  type ArtisanStationRecipe,
} from '@shared/artisanCrafts';
import { Coins, Hammer, Sparkles, CheckCircle2, Home, Zap } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ArtisanWorkshopModalProps {
  open: boolean;
  initialStationId?: ArtisanStationId;
  player: PlayerState;
  onClose: () => void;
  onBuyStation: (stationId: ArtisanStationId) => void;
  onCompleteCraft: (recipe: ArtisanStationRecipe) => void;
  onSellCraftedItem: (itemId: string, sellCoins: number, label: string) => void;
  onConsumeCraftedBuff: (recipe: ArtisanStationRecipe) => void;
}

export const ArtisanWorkshopModal: React.FC<ArtisanWorkshopModalProps> = ({
  open,
  initialStationId,
  player,
  onClose,
  onBuyStation,
  onCompleteCraft,
  onSellCraftedItem,
  onConsumeCraftedBuff,
}) => {
  const [activeStation, setActiveStation] = useState<ArtisanStationId>(
    initialStationId ?? 'kampong_pottery_stump'
  );
  const [craftingRecipe, setCraftingRecipe] = useState<ArtisanStationRecipe | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [sparkTick, setSparkTick] = useState(0);
  const onCompleteCraftRef = useRef(onCompleteCraft);
  onCompleteCraftRef.current = onCompleteCraft;

  useEffect(() => {
    if (open && initialStationId) {
      setActiveStation(initialStationId);
    }
    if (!open) {
      setCraftingRecipe(null);
      setProgressPct(0);
    }
  }, [open, initialStationId]);

  useEffect(() => {
    if (!craftingRecipe) return;
    const startedAt = Date.now();
    const duration = craftingRecipe.durationMs;
    const activeRecipe = craftingRecipe;
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgressPct(pct);
      setSparkTick((t) => t + 1);
      if (elapsed >= duration) {
        window.clearInterval(interval);
        setCraftingRecipe(null);
        setProgressPct(0);
        onCompleteCraftRef.current(activeRecipe);
      }
    }, 60);
    return () => window.clearInterval(interval);
  }, [craftingRecipe]);

  const ownedStations = player.ownedArtisanStations ?? [];
  const stationDef = KHMER_ARTISAN_STATIONS[activeStation];
  const isOwned = ownedStations.includes(activeStation);
  const recipes = KHMER_ARTISAN_RECIPES.filter((r) => r.stationId === activeStation);

  const countItem = (itemId: string) =>
    player.inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);

  const canCraftRecipe = (rec: ArtisanStationRecipe) =>
    isOwned &&
    !craftingRecipe &&
    rec.ingredients.every((ing) => countItem(ing.itemId) >= ing.qty);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏺 Authentic Khmer Artisan Workshops"
      subtitle={`Process Livestock Produce & Clay into Luxury Goods & Stilt House Decor · Wallet: ${player.currencies.coins.toLocaleString()} C`}
      maxWidthClass="w-[min(95vw,820px)]"
    >
      {/* 3 Station Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {KHMER_ARTISAN_STATION_LIST.map((st) => {
          const owned = ownedStations.includes(st.id);
          const selected = activeStation === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => !craftingRecipe && setActiveStation(st.id)}
              className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer ${
                selected
                  ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-md'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-900/35'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-display font-bold text-xs flex items-center gap-1.5">
                  <span className="text-base">{st.icon}</span>
                  <span>{st.name}</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                    owned
                      ? 'bg-emerald-500 text-white'
                      : selected
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {owned ? '✓ Placed' : `${st.costCoins.toLocaleString()} C`}
                </span>
              </div>
              <div className={`text-[10px] mt-0.5 ${selected ? 'text-amber-200' : 'text-amber-700'}`}>
                {st.khmerName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Station Heritage Header & Purchase Gate */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-2 border-amber-900/35 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
              <span className="text-lg">{stationDef.icon}</span>
              <span>{stationDef.name}</span>
              <span className="text-[11px] font-normal text-amber-800">({stationDef.khmerName})</span>
            </div>
            <div className="text-[11px] font-semibold text-orange-900 mt-0.5">
              ✨ {stationDef.heritageNote}
            </div>
            <div className="text-[11px] text-amber-900/85 mt-0.5">{stationDef.description}</div>
          </div>

          {!isOwned ? (
            <button
              type="button"
              disabled={player.currencies.coins < stationDef.costCoins}
              onClick={() => onBuyStation(stationDef.id)}
              className={`px-3.5 py-2 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                player.currencies.coins >= stationDef.costCoins
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-950 shadow'
                  : 'bg-stone-300 text-stone-600 border-stone-400 cursor-not-allowed'
              }`}
            >
              <Coins className="w-4 h-4" />
              Buy & Place on Farm ({stationDef.costCoins.toLocaleString()} C)
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs border border-emerald-950">
              <CheckCircle2 className="w-4 h-4" /> Active on Homestead Yard
            </span>
          )}
        </div>

        {/* Live Animated Crafting Progress Bar + Station Particles */}
        {craftingRecipe && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/90 text-amber-50 border border-amber-400/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-display font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                Crafting {craftingRecipe.icon} {craftingRecipe.outputName}...
              </span>
              <span className="text-amber-300">{progressPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-amber-900/80 border border-amber-400/40 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-400 transition-all duration-75"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-amber-200/90">
              <span>
                {activeStation === 'kampong_pottery_stump'
                  ? '🔥 Hand-paddling Andong Russei clay & firing in wood ash...'
                  : activeStation === 'khmer_weaving_loom'
                  ? '🧵 Clack-clack! Passing silk shuttle across Khmer treadle loom...'
                  : '🍮 Slow-simmering golden custard & whipping village cream...'}
              </span>
              <span>{sparkTick % 2 === 0 ? '✨ ✦ ✨' : '✦ ✨ ✦'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Station Recipes Grid */}
      <div className="grid sm:grid-cols-3 gap-2.5">
        {recipes.map((rec) => {
          const ready = canCraftRecipe(rec);
          const ownedOutput = countItem(rec.outputItemId);
          return (
            <div
              key={rec.id}
              className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1">
                      <span className="text-base">{rec.icon}</span>
                      <span>{rec.outputName}</span>
                    </div>
                    <div className="text-[10px] text-amber-800">{rec.khmerName}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-lg bg-amber-200 text-amber-950 font-bold text-[10px] shrink-0">
                    Bag: {ownedOutput}
                  </span>
                </div>

                <p className="text-[10px] text-amber-900/85 leading-snug">{rec.description}</p>

                {/* Ingredients */}
                <div className="space-y-1 pt-1 border-t border-amber-900/15">
                  {rec.ingredients.map((ing) => {
                    const have = countItem(ing.itemId);
                    const ok = have >= ing.qty;
                    return (
                      <div
                        key={ing.itemId}
                        className={`flex items-center justify-between text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        <span>{ing.label}</span>
                        <span>
                          {have}/{ing.qty}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Output Value & Badges */}
                <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                    💰 {rec.sellCoins.toLocaleString()} C
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                    +{rec.craftingXp} Crafting XP
                  </span>
                  {rec.decorItemId && (
                    <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-900 inline-flex items-center gap-0.5">
                      <Home className="w-2.5 h-2.5" /> Home Decor
                    </span>
                  )}
                  {rec.combatBuff && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 inline-flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> Buff Food
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => setCraftingRecipe(rec)}
                  className={`w-full py-1.5 px-2.5 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                    ready
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-950 cursor-pointer shadow-sm'
                      : 'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5" />
                  {!isOwned ? 'Buy Station First' : craftingRecipe ? 'Crafting...' : `Craft (${(rec.durationMs / 1000).toFixed(1)}s)`}
                </button>

                {ownedOutput > 0 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onSellCraftedItem(rec.outputItemId, rec.sellCoins, rec.outputName)}
                      className="flex-1 py-1 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[10px] cursor-pointer"
                    >
                      Sell 1 (+{rec.sellCoins} C)
                    </button>
                    {rec.combatBuff && (
                      <button
                        type="button"
                        onClick={() => onConsumeCraftedBuff(rec)}
                        className="flex-1 py-1 px-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-display font-bold text-[10px] cursor-pointer"
                      >
                        Eat Buff
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </NativeDialog>
  );
};
