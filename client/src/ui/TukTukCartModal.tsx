import React, { useEffect, useState } from 'react';
import type { PlayerState, QualityTier, TukTukCartItem, TukTukCartListing } from '@shared/types';
import { ChefHat, Coins, MapPin, Plus, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { STREET_SNACKS } from '../data/recipes';
import {
  buyFromTukTukCartApi,
  closeTukTukCartApi,
  fetchTukTukCartsApi,
  openTukTukCartApi,
  type AuthSession,
} from '../game/network/ApiClient';
import { NativeDialog } from './NativeDialog';

interface TukTukCartModalProps {
  open: boolean;
  player: PlayerState;
  authSession: AuthSession | null;
  focusedCartId?: string | null;
  onClose: () => void;
  onCartsChanged: (carts: TukTukCartListing[]) => void;
  onStockCartConsume: (
    cart: TukTukCartListing,
    stockedItems: TukTukCartItem[],
    toastMsg: string
  ) => void;
  onBuyCartItemComplete: (
    item: TukTukCartItem,
    quantity: number,
    totalPrice: number,
    cartOwnerName: string
  ) => void;
  onCloseCartReturn: (
    returnedItems: TukTukCartItem[],
    revenueCoins: number,
    toastMsg: string
  ) => void;
}

interface DraftSlot {
  itemId: string;
  quality: QualityTier;
  quantity: number;
  priceCoins: number;
}

export const TukTukCartModal: React.FC<TukTukCartModalProps> = ({
  open,
  player,
  authSession,
  focusedCartId,
  onClose,
  onCartsChanged,
  onStockCartConsume,
  onBuyCartItemComplete,
  onCloseCartReturn,
}) => {
  const [carts, setCarts] = useState<TukTukCartListing[]>([]);
  const [tab, setTab] = useState<'browse' | 'manage'>('manage');
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [parkMapId, setParkMapId] = useState<'temple_district' | 'central_plaza'>('temple_district');
  const [signTitle, setSignTitle] = useState(`${player.name}'s Hot Snacks`);
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const cookingLv = player.skills.skills.cooking?.level ?? 1;
  const snackStacks = player.inventory.filter(
    (i) => i.quantity > 0 && Boolean(STREET_SNACKS[i.itemId])
  );
  const canPark = cookingLv >= 5 || snackStacks.length > 0;

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setSignTitle(`${player.name}'s Hot Snacks`);
    setParkMapId(player.currentMapId === 'central_plaza' ? 'central_plaza' : 'temple_district');
    void (async () => {
      const list = await fetchTukTukCartsApi();
      setCarts(list);
      onCartsChanged(list);
      if (focusedCartId) {
        setSelectedCartId(focusedCartId);
        const match = list.find((c) => c.cartId === focusedCartId);
        const isMine =
          match &&
          !match.isDemo &&
          (match.ownerId === (authSession?.playerId ?? 'guest') && match.ownerName === player.name);
        setTab(isMine ? 'manage' : 'browse');
      } else {
        setSelectedCartId(list[0]?.cartId ?? null);
        setTab('manage');
      }
    })();
  }, [open, focusedCartId, player.name, player.currentMapId, authSession?.playerId]);

  // Pre-seed up to 3 cooked snacks from Container into draft slots when opening Manage tab
  useEffect(() => {
    if (!open || draftSlots.length > 0 || snackStacks.length === 0) return;
    const seeded: DraftSlot[] = snackStacks.slice(0, 3).map((entry) => {
      const def = STREET_SNACKS[entry.itemId];
      return {
        itemId: entry.itemId,
        quality: entry.quality ?? 'normal',
        quantity: Math.min(entry.quantity, 2),
        priceCoins: def?.buyCoins ?? 80,
      };
    });
    setDraftSlots(seeded);
  }, [open, snackStacks.length]);

  const myOwnerId = authSession?.playerId ?? 'guest';
  const myActiveCart = carts.find(
    (c) =>
      !c.isDemo &&
      (c.ownerId === myOwnerId && (myOwnerId !== 'guest' || c.ownerName === player.name))
  );

  const activeBrowseCart =
    carts.find((c) => c.cartId === selectedCartId) ?? carts[0] ?? null;

  const addSnackToDraft = (itemId: string, quality: QualityTier) => {
    if (draftSlots.length >= 6) {
      setFeedback('Maximum 6 snack/elixir stacks per Tuk-Tuk Food Cart.');
      return;
    }
    if (draftSlots.some((s) => s.itemId === itemId && s.quality === quality)) {
      setFeedback('That snack stack is already on your cart tray.');
      return;
    }
    const def = STREET_SNACKS[itemId];
    setDraftSlots((prev) => [
      ...prev,
      {
        itemId,
        quality,
        quantity: 1,
        priceCoins: def?.buyCoins ?? 90,
      },
    ]);
    setFeedback(null);
  };

  const handleParkCart = async () => {
    if (!canPark) {
      setFeedback('Reach Cooking Lv. 5+ or carry cooked snacks/elixirs in your bag to park a Food Cart!');
      return;
    }
    if (draftSlots.length === 0) {
      setFeedback('Add at least 1 cooked snack or Spirit Elixir from your bag first.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    const itemsPayload: TukTukCartItem[] = draftSlots
      .map((slot) => {
        const def = STREET_SNACKS[slot.itemId];
        const owned = player.inventory.find(
          (i) => i.itemId === slot.itemId && (i.quality ?? 'normal') === slot.quality
        );
        const safeQty = Math.max(1, Math.min(owned?.quantity ?? 1, Math.floor(slot.quantity)));
        return {
          itemId: slot.itemId,
          name: def?.name ?? slot.itemId,
          icon: def?.icon ?? '🥖',
          quantity: safeQty,
          priceCoins: Math.max(10, Math.floor(slot.priceCoins)),
          quality: slot.quality,
          summary: def?.dungeonSummary ?? 'Hot Combat Buff',
        };
      })
      .filter((i) => i.quantity > 0);

    const res = await openTukTukCartApi(authSession?.token, {
      ownerId: myOwnerId,
      ownerName: player.name,
      ownerKromTag: player.kromTag ?? undefined,
      mapId: parkMapId,
      signTitle: signTitle.trim() || `${player.name}'s Hot Snacks`,
      items: itemsPayload,
    });
    setBusy(false);

    if (!res.ok || !res.cart) {
      setFeedback(res.error ?? 'Could not park Food Cart.');
      return;
    }
    setCarts(res.carts);
    onCartsChanged(res.carts);
    setSelectedCartId(res.cart.cartId);
    setDraftSlots([]);
    const locLabel =
      parkMapId === 'temple_district'
        ? 'Temple District (Outside Angkor Dungeon Portal)'
        : 'Central Plaza Courtyard';
    onStockCartConsume(
      res.cart,
      itemsPayload,
      `🚕 Parked "${res.cart.signTitle}" in ${locLabel}! Players can now buy your hot combat buffs!`
    );
    setFeedback(`✅ Live! "${res.cart.signTitle}" is parked in ${locLabel}.`);
  };

  const handleCloseMyCart = async () => {
    if (!myActiveCart) return;
    setBusy(true);
    const res = await closeTukTukCartApi(authSession?.token, {
      cartId: myActiveCart.cartId,
      ownerId: myOwnerId,
      ownerName: player.name,
    });
    setBusy(false);
    if (!res.ok) {
      setFeedback(res.error ?? 'Failed to close cart.');
      return;
    }
    setCarts(res.carts);
    onCartsChanged(res.carts);
    onCloseCartReturn(
      res.returnedItems,
      res.revenueCoins,
      `🚕 Packed up Food Cart! Returned ${res.returnedItems.length} unsold stack(s) & collected ${res.revenueCoins.toLocaleString()}c revenue.`
    );
    setFeedback('Packed up cart and returned unsold snacks to your Container.');
  };

  const handleBuyItem = async (cart: TukTukCartListing, item: TukTukCartItem) => {
    if (player.currencies.coins < item.priceCoins) {
      setFeedback(`Need ${item.priceCoins.toLocaleString()} Coins to buy ${item.name}.`);
      return;
    }
    setBusy(true);
    setFeedback(null);
    const res = await buyFromTukTukCartApi(authSession?.token, {
      cartId: cart.cartId,
      itemId: item.itemId,
      quantity: 1,
      buyerName: player.name,
    });
    setBusy(false);
    if (!res.ok || !res.purchasedItem) {
      setFeedback(res.error ?? 'Purchase failed.');
      return;
    }
    setCarts(res.carts);
    onCartsChanged(res.carts);
    onBuyCartItemComplete(
      res.purchasedItem,
      res.quantityBought ?? 1,
      res.totalPrice ?? item.priceCoins,
      cart.ownerName
    );
    setFeedback(
      `🥖 Bought 1× ${item.icon} ${item.name} from ${cart.signTitle} (-${(res.totalPrice ?? item.priceCoins).toLocaleString()}c)!`
    );
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🚕 Player-Run Tuk-Tuk Food Carts · រទេះអាហារទូកៗ"
      subtitle={`Cooking Lv.${cookingLv} · Wallet: ${player.currencies.coins.toLocaleString()}c · Park outside Dungeon Portal or Central Plaza!`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('manage')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold border-2 flex items-center gap-1.5 transition ${
                tab === 'manage'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" /> Park / Manage My Cart
            </button>
            <button
              type="button"
              onClick={() => setTab('browse')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold border-2 flex items-center gap-1.5 transition ${
                tab === 'browse'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Browse Parked Carts ({carts.length})
            </button>
          </div>
          {myActiveCart && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-600/40 font-bold text-[11px]">
              🟢 Parked in {myActiveCart.mapId === 'temple_district' ? 'Temple District' : 'Central Plaza'} · Sales:{' '}
              {myActiveCart.totalSalesCoins.toLocaleString()}c
            </span>
          )}
        </div>

        {feedback && (
          <div className="px-3 py-2 rounded-xl bg-amber-100 border border-amber-700/40 text-amber-950 font-semibold">
            {feedback}
          </div>
        )}

        {tab === 'manage' && (
          <div className="space-y-3 max-h-[58dvh] overflow-y-auto pr-1">
            {myActiveCart ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50 border-2 border-emerald-700/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-base text-emerald-950">
                      🚕 {myActiveCart.signTitle}
                    </div>
                    <div className="text-[11px] text-emerald-900/90 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Parked in{' '}
                      <strong>
                        {myActiveCart.mapId === 'temple_district'
                          ? 'Temple District (Outside Angkor Dungeon Portal)'
                          : 'Central Plaza Courtyard'}
                      </strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-amber-800">Revenue Earned</div>
                    <div className="font-display font-bold text-base text-amber-950 flex items-center justify-end gap-1">
                      <Coins className="w-4 h-4 text-amber-600" /> {myActiveCart.totalSalesCoins.toLocaleString()}c
                    </div>
                    <div className="text-[10px] text-emerald-800 font-semibold">
                      {myActiveCart.totalItemsSold} sold (+{myActiveCart.totalItemsSold * 18} Cooking XP)
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {myActiveCart.items.map((item) => (
                    <div
                      key={`${item.itemId}_${item.quality ?? 'normal'}`}
                      className="p-2.5 rounded-xl bg-white/90 border border-amber-900/25 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-amber-950 truncate">
                          {item.icon} {item.quality === 'gold_star' ? '★ ' : ''}
                          {item.name} ×{item.quantity}
                        </div>
                        <div className="text-[10px] text-amber-800 truncate">{item.summary}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 font-bold shrink-0">
                        {item.priceCoins.toLocaleString()}c
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCloseMyCart()}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-display font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Close Cart &amp; Collect Unsold
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-900/25">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-amber-900 mb-1">
                      Parking Spot (Synced Live in Overworld)
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setParkMapId('temple_district')}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg font-display font-bold text-[11px] border ${
                          parkMapId === 'temple_district'
                            ? 'bg-purple-800 text-white border-purple-950'
                            : 'bg-white text-amber-950 border-amber-900/30'
                        }`}
                      >
                        🛕 Temple District (Dungeon Portal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setParkMapId('central_plaza')}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg font-display font-bold text-[11px] border ${
                          parkMapId === 'central_plaza'
                            ? 'bg-emerald-700 text-white border-emerald-950'
                            : 'bg-white text-amber-950 border-amber-900/30'
                        }`}
                      >
                        🏛️ Central Plaza
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-amber-900 mb-1">
                      Glowing Tuk-Tuk Signboard
                    </label>
                    <input
                      type="text"
                      maxLength={36}
                      value={signTitle}
                      onChange={(e) => setSignTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-900/35 bg-white text-amber-950 font-semibold"
                    />
                  </div>
                </div>

                {/* Stocked Cart Tray (up to 6 stacks) */}
                <div className="space-y-1.5">
                  <div className="font-display font-bold text-amber-950">
                    Cart Serving Tray ({draftSlots.length}/6 Stacks) — Set Custom Coin Prices:
                  </div>
                  {draftSlots.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-dashed border-amber-900/35 text-amber-900 text-center">
                      Click any cooked snack or Spirit Elixir below to stock your Tuk-Tuk Cart!
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {draftSlots.map((slot, idx) => {
                        const def = STREET_SNACKS[slot.itemId];
                        const maxQty =
                          player.inventory.find(
                            (i) => i.itemId === slot.itemId && (i.quality ?? 'normal') === slot.quality
                          )?.quantity ?? 1;
                        return (
                          <div
                            key={`${slot.itemId}_${slot.quality}`}
                            className="p-2 rounded-xl bg-white border border-amber-900/25 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-display font-bold text-amber-950">
                                {def?.icon} {slot.quality === 'gold_star' ? '★ ' : ''}
                                {def?.name ?? slot.itemId}
                              </div>
                              <div className="text-[10px] text-amber-800">{def?.dungeonSummary}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                                Qty
                                <input
                                  type="number"
                                  min={1}
                                  max={maxQty}
                                  value={slot.quantity}
                                  onChange={(e) => {
                                    const q = Math.max(1, Math.min(maxQty, Number(e.target.value) || 1));
                                    setDraftSlots((prev) =>
                                      prev.map((s, i) => (i === idx ? { ...s, quantity: q } : s))
                                    );
                                  }}
                                  className="w-12 px-1.5 py-0.5 rounded border border-amber-900/35 bg-amber-50 text-center font-bold"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                                Price
                                <input
                                  type="number"
                                  min={10}
                                  max={50000}
                                  step={5}
                                  value={slot.priceCoins}
                                  onChange={(e) => {
                                    const p = Math.max(10, Number(e.target.value) || 10);
                                    setDraftSlots((prev) =>
                                      prev.map((s, i) => (i === idx ? { ...s, priceCoins: p } : s))
                                    );
                                  }}
                                  className="w-20 px-1.5 py-0.5 rounded border border-amber-900/35 bg-amber-50 text-center font-bold"
                                />
                                c
                              </label>
                              <button
                                type="button"
                                onClick={() => setDraftSlots((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Available Cooked Snacks & Spirit Elixirs in Container */}
                <div className="space-y-1.5">
                  <div className="font-display font-bold text-amber-950">
                    Your Cooked Snacks &amp; Raid Spirit Elixirs ({snackStacks.length} Stacks):
                  </div>
                  {snackStacks.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 text-amber-900">
                      No cooked snacks in Container yet — cook at the Num Pang Cart or brew Spirit Elixirs at your Farm!
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-3 gap-1.5">
                      {snackStacks.map((entry) => {
                        const def = STREET_SNACKS[entry.itemId];
                        if (!def) return null;
                        const qual: QualityTier = entry.quality ?? 'normal';
                        const inDraft = draftSlots.some(
                          (s) => s.itemId === entry.itemId && s.quality === qual
                        );
                        return (
                          <button
                            key={`${entry.itemId}_${qual}`}
                            type="button"
                            disabled={inDraft || draftSlots.length >= 6}
                            onClick={() => addSnackToDraft(entry.itemId, qual)}
                            className={`p-2 rounded-xl border text-left transition flex items-center justify-between gap-1.5 ${
                              inDraft
                                ? 'bg-emerald-50 border-emerald-600/40 opacity-65'
                                : 'bg-amber-50 hover:bg-white border-amber-900/30'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-display font-bold text-amber-950 truncate">
                                {def.icon} {qual === 'gold_star' ? '★ ' : ''}
                                {def.name}
                              </div>
                              <div className="text-[10px] text-amber-800">
                                Bag ×{entry.quantity} · ~{def.buyCoins}c
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-emerald-700 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busy || !canPark || draftSlots.length === 0}
                  onClick={() => void handleParkCart()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white border-2 border-amber-950 font-display font-bold text-sm shadow-md disabled:opacity-45"
                >
                  {busy
                    ? 'Parking Tuk-Tuk Food Cart...'
                    : `🚕 Park Food Cart in ${
                        parkMapId === 'temple_district' ? 'Temple District (Dungeon Portal)' : 'Central Plaza'
                      }!`}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'browse' && (
          <div className="grid md:grid-cols-[220px_1fr] gap-3 max-h-[56dvh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              {carts.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 text-amber-900">
                  No parked Tuk-Tuk Food Carts right now. Park yours in the Manage tab!
                </div>
              ) : (
                carts.map((cart) => (
                  <button
                    key={cart.cartId}
                    type="button"
                    onClick={() => setSelectedCartId(cart.cartId)}
                    className={`w-full text-left p-2.5 rounded-xl border-2 transition ${
                      activeBrowseCart?.cartId === cart.cartId
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-white'
                    }`}
                  >
                    <div className="font-display font-bold truncate">🚕 {cart.signTitle}</div>
                    <div className="text-[10px] opacity-85">
                      {cart.mapId === 'temple_district' ? '🛕 Temple District' : '🏛️ Central Plaza'} ·{' '}
                      {cart.items.length} menu item(s)
                    </div>
                  </button>
                ))
              )}
            </div>

            {activeBrowseCart && (
              <div className="p-3 rounded-2xl bg-amber-50/95 border-2 border-amber-900/35 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-orange-700" />
                      {activeBrowseCart.ownerKromTag ? `[${activeBrowseCart.ownerKromTag}] ` : ''}
                      {activeBrowseCart.signTitle}
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Chef: <strong>{activeBrowseCart.ownerName}</strong> · Hot Combat Buffs &amp; Raid Elixirs
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-bold">
                    {activeBrowseCart.totalItemsSold} sold
                  </span>
                </div>

                <div className="space-y-1.5">
                  {activeBrowseCart.items.map((item) => (
                    <div
                      key={`${item.itemId}_${item.quality ?? 'normal'}`}
                      className="p-2.5 rounded-xl bg-white border border-amber-900/25 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-amber-950">
                          {item.icon} {item.quality === 'gold_star' ? '★ ' : ''}
                          {item.name}{' '}
                          <span className="text-[10px] text-amber-700 font-normal">
                            (Stock ×{item.quantity})
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-800 font-semibold">{item.summary}</div>
                      </div>
                      <button
                        type="button"
                        disabled={busy || player.currencies.coins < item.priceCoins}
                        onClick={() => void handleBuyItem(activeBrowseCart, item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[11px] shrink-0 disabled:opacity-45"
                      >
                        Buy · {item.priceCoins.toLocaleString()}c
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
