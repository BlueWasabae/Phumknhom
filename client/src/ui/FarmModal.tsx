import React, { useEffect, useState } from 'react';
import type { PlayerState, QualityTier } from '@shared/types';
import {
  ARTISAN_MACHINE_LIST,
  ARTISAN_MACHINES,
  ARTISAN_RECIPES,
  FARM_ITEMS,
  FERTILIZER_COST,
  FRUIT_TREE_LIST,
  FRUIT_TREES,
  LIVESTOCK,
  LIVESTOCK_LIST,
  ROW_CROP_LIST,
  WOODEN_FENCE_COST,
  getNextPastureLandCost,
} from '../data/cropsAndArtisan';
import {
  formatRemainingTime,
  getLivestockProgress,
  getMachineProgress,
  getTreeProgress,
} from '../game/systems/FarmingEngine';
import { Coins, FastForward, Factory, Sprout, Trees, Sparkles } from 'lucide-react';
import { EventBus } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';

export type FarmModalTab = 'seeds' | 'livestock' | 'artisan';

interface FarmModalProps {
  open: boolean;
  initialTab: FarmModalTab;
  player: PlayerState;
  onClose: () => void;
  onBuySupply: (itemId: string, qty?: number) => void;
  onSellProduce: (itemId: string, quality: QualityTier, qty?: number) => void;
  onBuyTree: (treeId: string) => void;
  onHarvestTree: (slotIndex: number) => void;
  onBuyLivestock: (animalId: string) => void;
  onBuyPastureLand?: () => void;
  onBuyFence?: () => void;
  onCollectLivestock: (slotIndex: number) => void;
  onBuyMachine: (machineId: string) => void;
  onStartMachine: (slotIndex: number, recipeId: string) => void;
  onCollectMachine: (slotIndex: number) => void;
  onFastForward: (seconds?: number) => void;
}

export const FarmModal: React.FC<FarmModalProps> = ({
  open,
  initialTab,
  player,
  onClose,
  onBuySupply,
  onSellProduce,
  onBuyTree,
  onHarvestTree,
  onBuyLivestock,
  onBuyPastureLand,
  onBuyFence,
  onCollectLivestock,
  onBuyMachine,
  onStartMachine,
  onCollectMachine,
  onFastForward,
}) => {
  const [tab, setTab] = useState<FarmModalTab>(initialTab);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // Live 1-second clock tick for Artisan, Tree & Livestock progress bars
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const countItem = (itemId: string) =>
    player.inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);

  const sellableProduce = player.inventory.filter((i) => {
    const meta = FARM_ITEMS[i.itemId];
    return meta && meta.kind !== 'seed' && meta.kind !== 'fertilizer' && meta.sellCoins && i.quantity > 0;
  });

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Homestead Farm · Seeds, Livestock & Artisan"
      subtitle={`Farm Lv.${player.lifeStats.farmLevel} · Wallet: ${player.currencies.coins.toLocaleString()} Coins`}
      maxWidthClass="w-[min(95vw,780px)]"
    >
      {/* Top Tabs + Fast-Forward Dev Boost */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['seeds', 'Seed Shop & Sell', Sprout],
              ['livestock', 'Livestock & Trees', Trees],
              ['artisan', 'Artisan Machines', Factory],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 ${
                tab === id
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            onFastForward(60);
            setNow(Date.now());
          }}
          className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white border-2 border-sky-950 font-display font-bold text-xs flex items-center gap-1.5"
          title="Dev Boost: Advance all farm, tree, livestock & artisan timers by 60 seconds"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>+60s Fast-Forward</span>
        </button>
      </div>

      {/* TAB 1: SEED SHOP, FERTILIZER & PRODUCE SHIPPING */}
      {tab === 'seeds' && (
        <div className="space-y-4 text-xs">
          {/* Fertilizer Card */}
          <div className="p-3 rounded-xl bg-amber-100/90 border-2 border-amber-900/40 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-sm text-amber-950">
                ★ Rich Fertilizer (Owned: {countItem('fertilizer')})
              </div>
              <div className="text-[11px] text-amber-900">
                Apply to any planted crop for a <strong>20% Gold-Star chance</strong> (sells for <strong>1.5× Coins</strong> & +60s buff).
              </div>
            </div>
            <button
              type="button"
              onClick={() => onBuySupply('fertilizer', 1)}
              className="phum-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs inline-flex items-center gap-1"
            >
              <Coins className="w-3.5 h-3.5 text-amber-700" /> Buy ({FERTILIZER_COST}c)
            </button>
          </div>

          {/* 6 Row Crops Grid */}
          <div className="grid sm:grid-cols-2 gap-2.5">
            {ROW_CROP_LIST.map((crop) => {
              const owned = countItem(crop.seedItemId);
              return (
                <div
                  key={crop.id}
                  className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span
                        className="w-8 h-8 rounded-lg border-2 border-amber-950/40 shrink-0 mt-0.5"
                        style={{ backgroundColor: crop.stageColors[3] }}
                      />
                      <div>
                        <div className="font-display font-bold text-sm text-amber-950">
                          {crop.name}{' '}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                            {crop.tier}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-800">{crop.khmerName}</div>
                        <div className="text-[10px] text-amber-900/80 mt-0.5">
                          Grow: <strong>{formatRemainingTime(crop.growSeconds * 1000)}</strong> · Sell:{' '}
                          <strong>{crop.sellPrice}c</strong> (★{Math.round(crop.sellPrice * 1.5)}c)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 shrink-0">Bag: {owned}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-amber-800/90 truncate">{crop.primaryUse}</span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onBuySupply(crop.seedItemId, 1)}
                        className="phum-btn px-2.5 py-1 rounded-lg font-bold text-[11px]"
                      >
                        +1 ({crop.seedCost}c)
                      </button>
                      <button
                        type="button"
                        onClick={() => onBuySupply(crop.seedItemId, 5)}
                        className="phum-btn px-2.5 py-1 rounded-lg font-bold text-[11px]"
                      >
                        +5 ({crop.seedCost * 5}c)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct Harvest Shipping Bin */}
          <div className="pt-2 border-t-2 border-amber-900/20 space-y-2">
            <div className="font-display font-bold text-sm text-amber-950">
              Harvest Shipping Bin (Sell Crops, Fruits, Drops & Artisan Goods)
            </div>
            {sellableProduce.length === 0 ? (
              <p className="text-amber-800/80">Harvest crops or collect Artisan goods to ship them for Coins.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sellableProduce.map((entry) => {
                  const meta = FARM_ITEMS[entry.itemId];
                  if (!meta?.sellCoins) return null;
                  const qual: QualityTier = entry.quality ?? 'normal';
                  const unit = qual === 'gold_star' ? Math.round(meta.sellCoins * 1.5) : meta.sellCoins;
                  return (
                    <button
                      key={`${entry.itemId}_${qual}`}
                      type="button"
                      onClick={() => onSellProduce(entry.itemId, qual, entry.quantity)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs border-2 border-emerald-950"
                    >
                      Sell {entry.quantity}× {qual === 'gold_star' ? '★ ' : ''}
                      {meta.name} (+{(unit * entry.quantity).toLocaleString()}c)
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVESTOCK & PERENNIAL FRUIT TREES */}
      {tab === 'livestock' && (
        <div className="space-y-4 text-xs">
          {/* Update 3.6 — Hardcore 3-Step Livestock Infrastructure: 1. Pasture Land -> 2. Wooden Fence/Pen -> 3. Animals */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-100 via-emerald-50 to-amber-100 border-2 border-amber-800/50 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display font-bold text-sm text-amber-950">
                🪵 Livestock Pasture Expansion &amp; Wooden Fence Pens
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                Land Lv.{player.pastureLandLevel ?? 0}/3 · Fenced Pens: {player.ownedFences ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-amber-900">
              Raise livestock in order: <strong>1. Buy Pasture Land</strong> → <strong>2. Build Wooden Fence Pen (800 C)</strong> → <strong>3. Buy Animals</strong> (Max per Pen: 🐓 4 Chickens · 🐑 3 Sheep · 🐄 2 Cows).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onBuyPastureLand}
                disabled={(player.pastureLandLevel ?? 0) >= 3}
                className="phum-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs cursor-pointer disabled:opacity-45"
              >
                🌾 {(player.pastureLandLevel ?? 0) >= 3
                  ? 'Pasture Maxed (Lv.3)'
                  : `Expand Pasture Land Lv.${(player.pastureLandLevel ?? 0) + 1} (${getNextPastureLandCost(player.pastureLandLevel ?? 0).toLocaleString()} C)`}
              </button>
              <button
                type="button"
                onClick={onBuyFence}
                disabled={(player.ownedFences ?? 0) >= (player.pastureLandLevel ?? 0)}
                className="phum-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs cursor-pointer disabled:opacity-45"
              >
                🪵 Build Wooden Fence Pen ({WOODEN_FENCE_COST.toLocaleString()} C)
              </button>
            </div>
          </div>

          {/* Owned Trees & Livestock Status */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 space-y-2">
              <div className="font-display font-bold text-sm text-amber-950">
                Your Orchard ({player.farm.trees.length}/4 Trees)
              </div>
              {player.farm.trees.map((t, idx) => {
                const def = FRUIT_TREES[t.treeId];
                const prog = getTreeProgress(t, now);
                if (!def) return null;
                return (
                  <div key={idx} className="p-2 rounded-lg bg-amber-100/80 border border-amber-900/25 space-y-1">
                    <div className="flex justify-between font-bold text-amber-950">
                      <span>{def.name}</span>
                      <span>{prog.ready ? '★ READY!' : formatRemainingTime(prog.remainingMs)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-amber-950/20 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${Math.round(prog.pct * 100)}%` }}
                      />
                    </div>
                    {prog.ready && (
                      <button
                        type="button"
                        onClick={() => onHarvestTree(idx)}
                        className="w-full phum-btn py-1 rounded-lg font-bold text-[11px]"
                      >
                        Harvest {def.outputQuantity}× {FARM_ITEMS[def.outputItemId]?.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 space-y-2">
              <div className="font-display font-bold text-sm text-amber-950">
                🐄🐓 Cows &amp; Chickens Pasture ({player.farm.livestock.length}/6)
              </div>
              {player.farm.livestock.length === 0 && (
                <p className="text-[11px] text-amber-800/85">
                  Adopt Village Hens &amp; Khmer Dairy Cows below to collect Fresh Eggs, Golden Eggs, and Royal Milk!
                </p>
              )}
              {player.farm.livestock.map((pen, idx) => {
                const def = LIVESTOCK[pen.animalId];
                const prog = getLivestockProgress(pen, now);
                if (!def) return null;
                return (
                  <div key={idx} className="p-2 rounded-lg bg-amber-100/80 border border-amber-900/25 space-y-1">
                    <div className="flex justify-between font-bold text-amber-950">
                      <span>
                        {pen.animalId.includes('chicken') || pen.animalId.includes('hen') ? '🐓 ' : pen.animalId.includes('cow') ? '🐄 ' : pen.animalId.includes('buffalo') ? '🐃 ' : '🦋 '}
                        {def.name}
                      </span>
                      <span>{prog.ready ? '★ READY!' : formatRemainingTime(prog.remainingMs)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-amber-950/20 overflow-hidden">
                      <div
                        className="h-full bg-amber-600 transition-all"
                        style={{ width: `${Math.round(prog.pct * 100)}%` }}
                      />
                    </div>
                    {prog.ready && (
                      <button
                        type="button"
                        onClick={() => onCollectLivestock(idx)}
                        className="w-full phum-btn py-1 rounded-lg font-bold text-[11px]"
                      >
                        Collect {FARM_ITEMS[def.outputItemId]?.name}
                        {def.bonusItemId ? ` + ${FARM_ITEMS[def.bonusItemId]?.name ?? 'Bonus'}` : ''}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shop for New Trees & Livestock */}
          <div className="grid sm:grid-cols-2 gap-2.5 pt-2 border-t-2 border-amber-900/20">
            {FRUIT_TREE_LIST.map((t) => (
              <div key={t.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/30 flex items-center justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-amber-950">
                    🌴 {t.name} <span className="text-amber-800 font-normal">({t.khmerName})</span>
                  </div>
                  <div className="text-[10px] text-amber-800">{t.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onBuyTree(t.id)}
                  className="phum-btn px-2.5 py-1.5 rounded-lg font-bold text-[11px] shrink-0"
                >
                  {t.costCoins.toLocaleString()}c
                </button>
              </div>
            ))}
            {LIVESTOCK_LIST.map((l) => (
              <div key={l.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/30 flex items-center justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-amber-950">
                    🐾 {l.name} <span className="text-amber-800 font-normal">({l.khmerName})</span>
                  </div>
                  <div className="text-[10px] text-amber-800">{l.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onBuyLivestock(l.id)}
                  className="phum-btn px-2.5 py-1.5 rounded-lg font-bold text-[11px] shrink-0"
                >
                  {l.costCoins.toLocaleString()}c
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ARTISAN PROCESSING MACHINES */}
      {tab === 'artisan' && (
        <div className="space-y-4 text-xs">
          <div className="grid sm:grid-cols-2 gap-3">
            {player.farm.machines.map((m, idx) => {
              const def = ARTISAN_MACHINES[m.machineId];
              if (!def) return null;
              const prog = getMachineProgress(m, now);
              const recipes = ARTISAN_RECIPES.filter((r) => r.machineId === m.machineId);
              const busy = Boolean(m.recipeId);
              const outMeta = m.outputItemId ? FARM_ITEMS[m.outputItemId] : null;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-amber-950">{def.name}</div>
                      <div className="text-[10px] text-amber-800">{def.khmerName}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prog.ready
                          ? 'bg-amber-500 text-amber-950'
                          : busy
                          ? 'bg-sky-700 text-white'
                          : 'bg-stone-300 text-stone-800'
                      }`}
                    >
                      {prog.ready ? '★ READY' : busy ? formatRemainingTime(prog.remainingMs) : 'Idle'}
                    </span>
                  </div>

                  {busy ? (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-amber-900">
                        Crafting: {m.quality === 'gold_star' ? '★ ' : ''}
                        {outMeta?.name}
                      </div>
                      <div className="h-2.5 rounded-full bg-amber-950/20 border border-amber-900/35 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                          style={{ width: `${Math.round(prog.pct * 100)}%` }}
                        />
                      </div>
                      {prog.ready && (
                        <button
                          type="button"
                          onClick={() => onCollectMachine(idx)}
                          className="w-full phum-btn py-1.5 rounded-xl font-display font-bold text-xs"
                        >
                          Collect {outMeta?.name} → Container
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {recipes.map((rec) => {
                        const have = countItem(rec.inputItemId);
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            disabled={have <= 0}
                            onClick={() => onStartMachine(idx, rec.id)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-left border flex items-center justify-between gap-2 ${
                              have > 0
                                ? 'bg-amber-100 hover:bg-amber-200 border-amber-900/40 text-amber-950 font-bold'
                                : 'bg-stone-100 border-stone-300 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <span className="truncate">{rec.label}</span>
                            <span className="text-[10px] shrink-0">Have: {have}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Update 3.7 — Direct Gateway to Authentic Khmer Artisan Workshops (Pottery Stump, Weaving Loom, Dairy Churn) */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-xs sm:text-sm text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-300" /> Authentic Khmer Artisan Workshops (New!)
              </div>
              <div className="text-[10px] text-amber-100/90">
                Buy &amp; craft on Kampong Chhnang Pottery Stump (1,200 C), Khmer Weaving Loom (1,500 C) &amp; Village Dairy Churn (1,000 C)!
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                EventBus.emit('ui:openModal', { modal: 'artisanWorkshop' });
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-bold text-xs border border-amber-200 cursor-pointer shrink-0"
            >
              🏺 Open Artisan Workshops →
            </button>
          </div>

          {/* Craft / Buy Additional Artisan Machines */}
          <div className="pt-2 border-t-2 border-amber-900/20 space-y-2">
            <div className="font-display font-bold text-sm text-amber-950">
              Build More Artisan Machines ({player.farm.machines.length}/6 Slots)
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {ARTISAN_MACHINE_LIST.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/30 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-amber-950">{m.name}</div>
                    <div className="text-[10px] text-amber-800">{m.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBuyMachine(m.id)}
                    className="phum-btn px-2.5 py-1.5 rounded-lg font-bold text-[11px] shrink-0"
                  >
                    {m.costCoins}c
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
