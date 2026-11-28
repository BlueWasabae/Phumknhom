import React, { useEffect, useMemo, useState } from 'react';
import type { ItemRarity, PlayerState, TradeSessionSnapshot, TradeSlotItem } from '@shared/types';
import { getRarityTierDef, formatDropRatePct } from '@shared/raritySystem';
import { ITEM_CATALOG } from '../data/items';
import { FARM_ITEMS } from '../data/cropsAndArtisan';
import { Lock, ShieldCheck, Unlock, AlertTriangle, Plus, X, Coins } from 'lucide-react';

interface TradeWindowModalProps {
  snapshot: TradeSessionSnapshot | null;
  mySessionId: string;
  player: PlayerState;
  onUpdateOffer: (items: TradeSlotItem[], coins: number) => void;
  onToggleLock: () => void;
  onConfirmTrade: () => void;
  onCancelTrade: () => void;
}

const RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-stone-400/70 bg-stone-900/60',
  uncommon: 'border-emerald-400/80 bg-emerald-950/60',
  rare: 'border-sky-400/85 bg-sky-950/65',
  epic: 'border-purple-400/90 bg-purple-950/65',
  legendary: 'border-amber-400 bg-amber-950/70',
  mythic: 'border-fuchsia-400 bg-fuchsia-950/70 shadow-[0_0_12px_rgba(232,121,249,0.45)]',
  ancient: 'border-cyan-300 bg-cyan-950/75 shadow-[0_0_14px_rgba(34,211,238,0.55)]',
};

const RARITY_DROP_HINT: Record<ItemRarity, number> = {
  common: 45,
  uncommon: 24,
  rare: 10,
  epic: 4,
  legendary: 1.5,
  mythic: 0.4,
  ancient: 0.15,
};

function resolveItemMeta(itemId: string): { name: string; rarity: ItemRarity; dropRatePct: number } {
  const eq = ITEM_CATALOG[itemId];
  if (eq) {
    const r = (eq.rarity ?? 'common') as ItemRarity;
    return { name: eq.name, rarity: r, dropRatePct: RARITY_DROP_HINT[r] };
  }
  const farm = FARM_ITEMS[itemId];
  if (farm) {
    const r = (farm.rarity ?? 'common') as ItemRarity;
    return { name: farm.name, rarity: r, dropRatePct: RARITY_DROP_HINT[r] };
  }
  return { name: itemId.replace(/_/g, ' '), rarity: 'common', dropRatePct: 25 };
}

export const TradeWindowModal: React.FC<TradeWindowModalProps> = ({
  snapshot,
  mySessionId,
  player,
  onUpdateOffer,
  onToggleLock,
  onConfirmTrade,
  onCancelTrade,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [coinsDraft, setCoinsDraft] = useState('0');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!snapshot) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [snapshot?.tradeId]);

  const isSideA = snapshot ? snapshot.sideA.sessionId === mySessionId : true;
  const mySide = snapshot ? (isSideA ? snapshot.sideA : snapshot.sideB) : null;
  const partnerSide = snapshot ? (isSideA ? snapshot.sideB : snapshot.sideA) : null;

  useEffect(() => {
    if (mySide) {
      setCoinsDraft(String(mySide.coins));
    }
  }, [mySide?.coins, snapshot?.tradeId]);

  const equippedIds = useMemo(() => {
    const l = player.loadout;
    const s = new Set<string>();
    for (const v of [l.hat, l.hair, l.shirt, l.pants, l.wings, l.pet, l.weapon, l.armor, l.mount]) {
      if (v) s.add(v);
    }
    for (const a of l.accessories ?? []) {
      if (a) s.add(a);
    }
    return s;
  }, [player.loadout]);

  const tradeableInventory = useMemo(() => {
    if (!mySide) return [];
    const offeredCounts = new Map<string, number>();
    for (const it of mySide.items) {
      const k = `${it.itemId}::${it.quality ?? 'normal'}`;
      offeredCounts.set(k, (offeredCounts.get(k) ?? 0) + it.quantity);
    }
    return player.inventory
      .filter((inv) => inv.quantity > 0 && inv.itemId !== 'tool_magic_mirror')
      .map((inv) => {
        const qual = inv.quality ?? 'normal';
        const k = `${inv.itemId}::${qual}`;
        const used = offeredCounts.get(k) ?? 0;
        // Keep 1 copy if currently equipped so player doesn't trade away active gear
        const reserve = equippedIds.has(inv.itemId) ? 1 : 0;
        const available = Math.max(0, inv.quantity - used - reserve);
        const meta = resolveItemMeta(inv.itemId);
        return {
          ...inv,
          available,
          itemName: meta.name,
          rarity: meta.rarity,
          dropRatePct: meta.dropRatePct,
        };
      })
      .filter((x) => x.available > 0);
  }, [player.inventory, mySide, equippedIds]);

  if (!snapshot || !mySide || !partnerSide) return null;

  if (snapshot.status === 'pending') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
        <div className="w-full max-w-sm rounded-2xl border-2 border-amber-400 bg-slate-950 p-5 text-center text-amber-50 shadow-2xl space-y-3">
          <div className="text-3xl">🤝</div>
          <h3 className="font-display text-lg font-black text-amber-300">
            Waiting for {partnerSide.name}...
          </h3>
          <p className="text-xs text-amber-100/80">
            Sent a secure 2-Step P2P Trade Request (0% Tax). Waiting for them to accept.
          </p>
          <button
            type="button"
            onClick={onCancelTrade}
            className="w-full rounded-xl border border-rose-400/70 bg-rose-900/80 py-2 text-xs font-black text-rose-100 hover:bg-rose-800 cursor-pointer"
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  const bothLocked = mySide.locked && partnerSide.locked;
  const countdownRemainingMs =
    bothLocked && snapshot.bothLockedAt ? Math.max(0, 3000 - (now - snapshot.bothLockedAt)) : 3000;
  const countdownSec = Math.ceil(countdownRemainingMs / 1000);
  const canConfirmNow = bothLocked && countdownRemainingMs <= 0 && !mySide.confirmed;

  const handleAddItem = (item: (typeof tradeableInventory)[number]) => {
    if (mySide.items.length >= 6) return;
    const next = [...mySide.items];
    const ex = next.find(
      (i) => i.itemId === item.itemId && (i.quality ?? 'normal') === (item.quality ?? 'normal')
    );
    if (ex) {
      ex.quantity += 1;
    } else {
      next.push({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: 1,
        quality: item.quality ?? 'normal',
        itemLevel: item.itemLevel ?? 1,
        rarity: item.rarity,
        dropRatePct: item.dropRatePct,
      });
    }
    onUpdateOffer(next, mySide.coins);
  };

  const handleRemoveSlot = (idx: number) => {
    const next = mySide.items.filter((_, i) => i !== idx);
    onUpdateOffer(next, mySide.coins);
  };

  const handleApplyCoins = (raw: string) => {
    setCoinsDraft(raw);
    const parsed = Math.max(0, Math.min(player.currencies.coins, Math.floor(Number(raw) || 0)));
    if (parsed !== mySide.coins) {
      onUpdateOffer(mySide.items, parsed);
    }
  };

  const renderSlotGrid = (side: typeof mySide, editable: boolean) => (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }, (_, idx) => {
        const slot = side.items[idx];
        if (!slot) {
          return (
            <button
              key={idx}
              type="button"
              disabled={!editable}
              onClick={() => editable && setPickerOpen(true)}
              className={`h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-[10px] font-bold transition ${
                editable
                  ? 'border-amber-500/45 bg-slate-900/50 text-amber-200/75 hover:border-amber-300 hover:bg-slate-800/70 cursor-pointer'
                  : 'border-slate-700/60 bg-slate-900/30 text-slate-500'
              }`}
            >
              {editable ? (
                <>
                  <Plus className="w-4 h-4 mb-0.5" /> Add Item
                </>
              ) : (
                'Empty'
              )}
            </button>
          );
        }
        const tier = getRarityTierDef(slot.rarity);
        const dropTip =
          typeof slot.dropRatePct === 'number'
            ? `${tier.label} · Est. Drop ${formatDropRatePct(slot.dropRatePct)}`
            : tier.label;
        return (
          <div
            key={`${slot.itemId}_${idx}`}
            title={`${slot.itemName} (${dropTip})`}
            className={`relative h-20 rounded-xl border-2 p-1.5 flex flex-col justify-between text-left ${RARITY_BORDER[slot.rarity]}`}
          >
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveSlot(idx)}
                title="Remove from trade"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-700 hover:bg-rose-600 text-white flex items-center justify-center border border-rose-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="flex items-center justify-between gap-1 text-[9px] font-black uppercase">
              <span style={{ color: tier.colorHex }}>{tier.label}</span>
              <span className="text-white bg-black/60 px-1 rounded">×{slot.quantity}</span>
            </div>
            <div className="text-[11px] font-bold text-white leading-tight line-clamp-2">
              {slot.itemName}
            </div>
            <div className="text-[9px] text-amber-200/80 truncate">
              {typeof slot.dropRatePct === 'number' ? `Drop ${formatDropRatePct(slot.dropRatePct)}` : 'Verified'}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-amber-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/35 bg-black/50 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🤝</span>
              <h2 className="font-display text-base sm:text-lg font-black text-amber-300">
                Secure 2-Step P2P Trade · ការដោះដូរដោយផ្ទាល់
              </h2>
              <span className="rounded-full border border-emerald-400/70 bg-emerald-950/90 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                0% Direct Tax
              </span>
            </div>
            <p className="text-[11px] text-amber-100/75">
              Anti-Scam Guard: Modifying any item or Coins automatically resets BOTH locks!
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelTrade}
            className="rounded-lg border border-rose-400/60 bg-rose-950/80 px-3 py-1.5 text-xs font-black text-rose-200 hover:bg-rose-900 cursor-pointer"
          >
            ✕ Cancel Trade
          </button>
        </div>

        {/* Anti-Scam Warning Flash Banner */}
        {snapshot.warningText && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-rose-950/90 px-4 py-2 text-xs font-black text-amber-200 animate-pulse shadow-lg">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{snapshot.warningText}</span>
          </div>
        )}

        {/* Side-by-Side Trade Panes */}
        <div className="grid flex-1 grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto p-5">
          {/* YOUR SIDE */}
          <div
            className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${
              mySide.locked
                ? 'border-emerald-400 bg-emerald-950/30'
                : 'border-amber-500/40 bg-black/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-display font-black text-sm text-amber-200">
                Your Offer ({mySide.name})
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                  mySide.confirmed
                    ? 'border-cyan-300 bg-cyan-900/90 text-cyan-100'
                    : mySide.locked
                      ? 'border-emerald-400 bg-emerald-900/80 text-emerald-200'
                      : 'border-amber-500/50 bg-slate-900 text-amber-200'
                }`}
              >
                {mySide.confirmed ? '✓ CONFIRMED' : mySide.locked ? '🔒 LOCKED' : 'Editing...'}
              </span>
            </div>

            {renderSlotGrid(mySide, true)}

            <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-slate-950/80 px-3 py-2">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-200">Coins (C):</span>
              <input
                type="number"
                min={0}
                max={player.currencies.coins}
                value={coinsDraft}
                onChange={(e) => handleApplyCoins(e.target.value)}
                aria-label="Trade Coins Amount"
                className="flex-1 rounded-lg border border-amber-500/40 bg-slate-900 px-2.5 py-1 text-right font-mono text-xs font-black text-amber-100"
              />
              <span className="text-[10px] text-amber-300/80">
                / {player.currencies.coins.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="w-full rounded-xl border border-amber-400/50 bg-amber-900/40 hover:bg-amber-800/50 py-1.5 text-xs font-black text-amber-100 cursor-pointer"
            >
              {pickerOpen ? 'Hide Backpack Picker' : `🎒 Pick Items from Backpack (${tradeableInventory.length})`}
            </button>

            {pickerOpen && (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-amber-500/35 bg-slate-950/90 p-2 grid grid-cols-2 gap-1.5">
                {tradeableInventory.length === 0 ? (
                  <div className="col-span-2 text-center py-3 text-[11px] text-slate-400">
                    No unequipped tradeable items available.
                  </div>
                ) : (
                  tradeableInventory.map((inv) => {
                    const tier = getRarityTierDef(inv.rarity);
                    return (
                      <button
                        key={`${inv.itemId}_${inv.quality ?? 'normal'}`}
                        type="button"
                        onClick={() => handleAddItem(inv)}
                        className="rounded-lg border border-slate-700 hover:border-amber-400 bg-slate-900 px-2 py-1.5 text-left transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[9px] font-black">
                          <span style={{ color: tier.colorHex }}>{tier.label}</span>
                          <span className="text-amber-200">Avail: {inv.available}</span>
                        </div>
                        <div className="text-[11px] font-bold text-white truncate">{inv.itemName}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* PARTNER SIDE */}
          <div
            className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${
              partnerSide.locked
                ? 'border-emerald-400 bg-emerald-950/30'
                : 'border-sky-500/40 bg-black/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-display font-black text-sm text-sky-200">
                {partnerSide.name}&apos;s Offer
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                  partnerSide.confirmed
                    ? 'border-cyan-300 bg-cyan-900/90 text-cyan-100'
                    : partnerSide.locked
                      ? 'border-emerald-400 bg-emerald-900/80 text-emerald-200'
                      : 'border-sky-500/50 bg-slate-900 text-sky-200'
                }`}
              >
                {partnerSide.confirmed ? '✓ CONFIRMED' : partnerSide.locked ? '🔒 LOCKED' : 'Selecting...'}
              </span>
            </div>

            {renderSlotGrid(partnerSide, false)}

            <div className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-slate-950/80 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-sky-200">
                <Coins className="w-4 h-4 text-amber-400" /> Partner Coins Offered:
              </span>
              <span className="font-mono text-sm font-black text-amber-300">
                {partnerSide.coins.toLocaleString()} C
              </span>
            </div>

            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-[11px] text-slate-300 space-y-1">
              <div className="font-bold text-amber-200">🛡️ 2-Step Verification Checklist</div>
              <div>1. Hover any item slot to inspect its Rarity Tier &amp; Drop Rate %.</div>
              <div>2. Both traders click <strong>Lock Offer</strong> (any edit resets both locks).</div>
              <div>3. After the 3s safety countdown, both click <strong>Confirm Trade</strong> for an atomic swap!</div>
            </div>
          </div>
        </div>

        {/* Bottom 2-Step Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-500/35 bg-black/60 px-5 py-3.5">
          <div className="text-xs font-bold text-amber-200/90">
            {bothLocked
              ? countdownRemainingMs > 0
                ? `⏳ Safety countdown: ${countdownSec}s — verify both offers carefully!`
                : mySide.confirmed
                  ? `✓ Waiting for ${partnerSide.name} to click Confirm Trade...`
                  : '✅ Both offers locked! Ready for Final Confirmation.'
              : 'Step 1: Add items/Coins and click Lock Offer.'}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleLock}
              className={`rounded-xl border-2 px-4 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
                mySide.locked
                  ? 'border-amber-400 bg-amber-800/80 text-amber-100 hover:bg-amber-700'
                  : 'border-emerald-400 bg-emerald-700 text-white hover:bg-emerald-600'
              }`}
            >
              {mySide.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {mySide.locked ? 'Unlock Offer' : 'Step 1: Lock Offer'}
            </button>

            <button
              type="button"
              disabled={!canConfirmNow}
              onClick={onConfirmTrade}
              className="rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-xs font-black text-white flex items-center gap-1.5 shadow-lg cursor-pointer transition"
            >
              <ShieldCheck className="w-4 h-4" />
              {mySide.confirmed
                ? 'Confirmed ✓'
                : bothLocked && countdownRemainingMs > 0
                  ? `Confirm Trade (${countdownSec}s)`
                  : 'Step 2: Confirm Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
