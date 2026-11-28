import React, { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  RELIQUARY_LEGENDARY_PITY,
  RELIQUARY_MYTHIC_PITY,
  RELIQUARY_OPEN_10_DIAMOND_COST,
  RELIQUARY_OPEN_DIAMOND_COST,
  RELIQUARY_POOL,
  RELIQUARY_TIERS,
  RELIQUARY_TIER_ORDER,
  SHARD_EXCHANGE_OFFERS,
  type ReliquaryTier,
} from '@shared/reliquaryPool';
import type { ReliquaryOpenBatchResult } from '../data/diamondStore';
import { Eye, Gem, KeyRound, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ReliquaryModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onOpenChests: (count: 1 | 10) => ReliquaryOpenBatchResult;
  onRedeemShards: (offerId: string) => void;
  onEquipItem: (itemId: string) => void;
}

const TIER_GLOW_STYLE: Record<ReliquaryTier, string> = {
  common: 'shadow-[0_0_24px_rgba(148,163,184,0.45)] border-slate-400 bg-slate-50',
  rare: 'shadow-[0_0_28px_rgba(56,189,248,0.55)] border-sky-400 bg-sky-50',
  epic: 'shadow-[0_0_32px_rgba(168,85,247,0.65)] border-purple-400 bg-purple-50',
  legendary: 'shadow-[0_0_38px_rgba(250,204,21,0.85)] border-amber-400 bg-amber-50',
  mythic: 'shadow-[0_0_46px_rgba(244,63,94,0.9)] border-rose-500 bg-rose-50',
  ancient:
    'shadow-[0_0_54px_rgba(254,240,138,0.95)] border-yellow-400 bg-gradient-to-br from-amber-100 via-yellow-50 to-rose-100',
};

export const ReliquaryModal: React.FC<ReliquaryModalProps> = ({
  open,
  player,
  onClose,
  onOpenChests,
  onRedeemShards,
  onEquipItem,
}) => {
  const [tab, setTab] = useState<'chest' | 'shards'>('chest');
  const [showRates, setShowRates] = useState(false);
  const [animStage, setAnimStage] = useState<'idle' | 'shaking' | 'burst'>('idle');
  const [lastResult, setLastResult] = useState<ReliquaryOpenBatchResult | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const keys = Math.max(0, player.reliquaryKeys ?? 0);
  const diamonds = player.currencies.diamonds;
  const shards = Math.max(0, player.angkorShards ?? 0);
  const pity30 = player.reliquaryPityCount ?? 0;
  const pity100 = player.reliquaryMythicPityCount ?? 0;

  const cost1Diamonds = keys >= 1 ? 0 : RELIQUARY_OPEN_DIAMOND_COST;
  const keysUsed10 = Math.min(10, keys);
  const rem10 = 10 - keysUsed10;
  const cost10Diamonds =
    rem10 === 0 ? 0 : rem10 === 10 ? RELIQUARY_OPEN_10_DIAMOND_COST : rem10 * RELIQUARY_OPEN_DIAMOND_COST;

  const canOpen1 = keys >= 1 || diamonds >= RELIQUARY_OPEN_DIAMOND_COST;
  const canOpen10 = diamonds >= cost10Diamonds;

  const triggerOpen = (count: 1 | 10) => {
    if (animStage === 'shaking') return;
    const res = onOpenChests(count);
    if (!res.ok) return;

    setLastResult(null);
    setAnimStage('shaking');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLastResult(res);
      setAnimStage('burst');
    }, 620);
  };

  const burstTier: ReliquaryTier = lastResult?.topTier ?? 'common';

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏺 Angkor Mystery Reliquary & Shard Exchange"
      subtitle={`🗝️ Keys: ${keys} · 💎 Diamonds: ${diamonds.toLocaleString()} · 💠 Angkor Shards: ${shards.toLocaleString()}`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Zero-P2W Fair Disclosure Banner */}
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-700/35 text-amber-950 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Pure Cosmetic Reliquary (Zero P2W):</strong> Dual Pity Guarantee + Duplicate Protection into{' '}
              <strong>Angkor Shards 💠</strong>!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRates((v) => !v)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-200 font-display font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            {showRates ? 'Hide Exact Drop Rates' : 'View Exact Drop Rates'}
          </button>
        </div>

        {/* Exact Legal Drop Rates Drawer */}
        {showRates && (
          <div className="p-3 rounded-2xl bg-slate-950 text-amber-50 border-2 border-amber-500/60 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display font-bold text-sm text-amber-300">
                📜 Official Angkor Reliquary Probability Table (100.00% Total)
              </div>
              <span className="text-[10px] text-emerald-300 font-bold">
                Pity: 30 Opens = Legendary+ · 100 Opens = Mythic+
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-1.5 text-[11px]">
              {RELIQUARY_TIER_ORDER.map((tierId) => {
                const meta = RELIQUARY_TIERS[tierId];
                const sampleNames = RELIQUARY_POOL.filter((p) => p.tier === tierId)
                  .map((p) => p.name)
                  .slice(0, 2)
                  .join(', ');
                return (
                  <div
                    key={tierId}
                    className="p-2 rounded-xl bg-slate-900/90 border border-white/15 flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-bold" style={{ color: meta.color }}>
                        {meta.label} ({meta.khmerLabel})
                      </span>
                      <span className="font-mono font-bold text-white">{meta.ratePct.toFixed(2)}%</span>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">{sampleNames}</div>
                    <div className="text-[9px] text-amber-300/90">
                      Duplicate → +{meta.duplicateShards} 💠 Angkor Shards
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Tab Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('chest')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === 'chest'
                ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Open Reliquary Chests
          </button>
          <button
            type="button"
            onClick={() => setTab('shards')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === 'shards'
                ? 'bg-indigo-800 text-white border-indigo-950 shadow'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> Shard Exchange (💠 {shards.toLocaleString()})
          </button>
        </div>

        <div className="max-h-[58dvh] overflow-y-auto pr-1">
          {tab === 'chest' && (
            <div className="space-y-3">
              {/* Dual Pity Progress Bars */}
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-500/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                    <span>🌟 Legendary+ Pity Guarantee</span>
                    <span className="text-amber-700">
                      {pity30} / {RELIQUARY_LEGENDARY_PITY}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, (pity30 / RELIQUARY_LEGENDARY_PITY) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-500/45 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-950">
                    <span>🔥 Mythic+ Hard Pity Guarantee</span>
                    <span className="text-rose-700">
                      {pity100} / {RELIQUARY_MYTHIC_PITY}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-rose-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, (pity100 / RELIQUARY_MYTHIC_PITY) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Animated Angkor Reliquary Chest Stage */}
              <div
                className={`relative p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                  animStage === 'burst'
                    ? TIER_GLOW_STYLE[burstTier]
                    : 'bg-gradient-to-b from-slate-900 via-amber-950 to-slate-950 border-amber-500/60 text-amber-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`text-5xl select-none transition-transform duration-150 ${
                      animStage === 'shaking'
                        ? 'animate-bounce scale-125 drop-shadow-[0_0_24px_rgba(250,204,21,0.95)]'
                        : animStage === 'burst'
                        ? 'scale-110'
                        : 'hover:scale-105'
                    }`}
                  >
                    {animStage === 'shaking' ? '✨🏺✨' : animStage === 'burst' ? '🎇' : '🏺'}
                  </div>

                  {animStage === 'idle' && (
                    <>
                      <div className="font-display font-bold text-base text-amber-200">
                        Sacred Angkor Reliquary Chest
                      </div>
                      <p className="text-[11px] text-amber-100/80 max-w-md">
                        Contains 6-Wing Solar Seraph Wings, Void Phantom Butterfly Wings, Celestial Naga Sovereign Set, Auto-Loot Pets &amp; Luxury Salon unlocks!
                      </p>
                    </>
                  )}

                  {animStage === 'shaking' && (
                    <div className="font-display font-bold text-base text-yellow-300 animate-pulse">
                      Unsealing Ancient Angkor Runes...
                    </div>
                  )}

                  {animStage === 'burst' && lastResult && (
                    <div className="w-full space-y-2.5 pt-1">
                      <div className="font-display font-bold text-sm text-amber-950 flex items-center justify-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>
                          {lastResult.entries.length === 1
                            ? `Unsealed ${RELIQUARY_TIERS[lastResult.topTier].label} Treasure!`
                            : `Unsealed 10× Reliquary · Best: ${RELIQUARY_TIERS[lastResult.topTier].label}!`}
                        </span>
                      </div>

                      <div
                        className={`grid gap-2 ${
                          lastResult.entries.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'sm:grid-cols-2'
                        }`}
                      >
                        {lastResult.entries.map((entry, idx) => {
                          const meta = RELIQUARY_TIERS[entry.tier];
                          const equippableId = entry.reward.itemIds?.[0]?.itemId;
                          const canQuickEquip =
                            !entry.isDuplicate &&
                            equippableId &&
                            (entry.reward.category === 'wings' ||
                              entry.reward.category === 'pet' ||
                              entry.reward.category === 'set' ||
                              entry.reward.category === 'cosmetic');
                          return (
                            <div
                              key={`${entry.reward.id}-${idx}`}
                              className={`p-2.5 rounded-xl border-2 text-left flex items-center justify-between gap-2 bg-white/95 ${meta.borderClass}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-2xl shrink-0">{entry.reward.icon}</span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${meta.badgeClass}`}
                                    >
                                      {meta.label.toUpperCase()}
                                    </span>
                                    {entry.wasPityTriggered !== 'none' && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-amber-950 text-[9px] font-bold">
                                        PITY!
                                      </span>
                                    )}
                                    {entry.isDuplicate ? (
                                      <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 text-[9px] font-bold">
                                        DUPLICATE → +{entry.shardsGained} 💠
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 text-[9px] font-bold">
                                        NEW!
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-display font-bold text-xs text-amber-950 truncate">
                                    {entry.reward.name}
                                  </div>
                                  <div className="text-[10px] text-amber-800 truncate">
                                    {entry.reward.khmerName}
                                  </div>
                                </div>
                              </div>
                              {canQuickEquip && equippableId && (
                                <button
                                  type="button"
                                  onClick={() => onEquipItem(equippableId)}
                                  className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[10px] shrink-0 cursor-pointer"
                                >
                                  Equip
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Open 1x & Open 10x */}
                <div className="grid sm:grid-cols-2 gap-2.5 pt-4">
                  <button
                    type="button"
                    disabled={!canOpen1 || animStage === 'shaking'}
                    onClick={() => triggerOpen(1)}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 border-2 border-amber-950 font-display font-bold text-xs shadow-lg active:scale-95 transition disabled:opacity-45 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    {keys >= 1
                      ? `Open 1× Reliquary (1 🗝️ Key)`
                      : `Open 1× Reliquary (💎 ${cost1Diamonds})`}
                  </button>
                  <button
                    type="button"
                    disabled={!canOpen10 || animStage === 'shaking'}
                    onClick={() => triggerOpen(10)}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-b from-fuchsia-600 to-purple-800 hover:from-fuchsia-500 hover:to-purple-700 text-white border-2 border-purple-950 font-display font-bold text-xs shadow-lg active:scale-95 transition disabled:opacity-45 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Gem className="w-4 h-4" />
                    {keysUsed10 > 0
                      ? `Open 10× (${keysUsed10} 🗝️${cost10Diamonds > 0 ? ` + 💎 ${cost10Diamonds}` : ''})`
                      : `Open 10× Reliquary (💎 ${RELIQUARY_OPEN_10_DIAMOND_COST} · -10%)`}
                  </button>
                </div>
              </div>

              {/* Earn Free Keys Tip */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-600/30 text-emerald-950 text-[11px] flex items-center justify-between gap-2">
                <span>
                  <strong>F2P Friendly:</strong> Earn free <strong>🗝️ Reliquary Keys</strong> from Weekly Bounties, Mythic Boss clears, Daily VIP Pass, or Angkor Shard Exchange!
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: SHARD EXCHANGE (ZERO RNG DIRECT PURCHASE) */}
          {tab === 'shards' && (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-500/35 text-indigo-950 text-[11px]">
                <strong>Zero-RNG Duplicate Protection:</strong> Every duplicate pull converts into{' '}
                <strong>💠 Angkor Shards</strong>. Exchange your Shards directly for any Wings, Auto-Loot Pet, or Ancient Set below!
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {SHARD_EXCHANGE_OFFERS.map((offer) => {
                  const meta = RELIQUARY_TIERS[offer.tier];
                  const isKey = offer.itemIds.length === 1 && offer.itemIds[0] === 'item_reliquary_key';
                  const owned =
                    !isKey &&
                    offer.itemIds.every((id) =>
                      player.inventory.some((i) => i.itemId === id && i.quantity > 0)
                    );
                  const canAfford = shards >= offer.shardCost;
                  return (
                    <div
                      key={offer.id}
                      className={`p-3 rounded-2xl bg-amber-50/90 border-2 ${meta.borderClass} flex flex-col justify-between gap-2`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl leading-none">{offer.icon}</span>
                            <div>
                              <div className="font-display font-bold text-xs text-amber-950">
                                {offer.name}
                              </div>
                              <div className="text-[10px] font-bold text-amber-800">{offer.khmerName}</div>
                            </div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-950/85 leading-snug">{offer.description}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-amber-900/15">
                        <span className="font-display font-bold text-xs text-indigo-800">
                          💠 {offer.shardCost} Shards
                        </span>
                        {owned ? (
                          <button
                            type="button"
                            onClick={() => onEquipItem(offer.itemIds[0])}
                            className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[11px] cursor-pointer"
                          >
                            Owned · Equip
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onRedeemShards(offer.id)}
                            className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-950 font-display font-bold text-[11px] disabled:opacity-45 cursor-pointer"
                          >
                            {canAfford ? 'Redeem' : `Need ${offer.shardCost} 💠`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
