import React, { useCallback, useEffect, useState } from 'react';
import type { PlayerState, QualityTier } from '@shared/types';
import { Coins, RefreshCw, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { FARM_ITEMS } from '../data/cropsAndArtisan';
import { STREET_SNACKS } from '../data/recipes';
import {
  fetchMarketListings,
  type AuthSession,
  type MarketListingClient,
} from '../game/network/ApiClient';
import { NativeDialog } from './NativeDialog';

interface MarketModalProps {
  open: boolean;
  player: PlayerState;
  authSession: AuthSession | null;
  onClose: () => void;
  onBuyListing: (listing: MarketListingClient) => Promise<boolean>;
  onCreateListing: (payload: {
    itemId: string;
    itemName: string;
    quantity: number;
    quality: QualityTier;
    priceCoins: number;
  }) => Promise<boolean>;
  onCancelListing: (listing: MarketListingClient) => Promise<boolean>;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  open,
  player,
  authSession,
  onClose,
  onBuyListing,
  onCreateListing,
  onCancelListing,
}) => {
  const [tab, setTab] = useState<'browse' | 'sell'>('browse');
  const [listings, setListings] = useState<MarketListingClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [selectedStackKey, setSelectedStackKey] = useState('');
  const [listQty, setListQty] = useState(1);
  const [listPrice, setListPrice] = useState(120);

  const refreshMarket = useCallback(async () => {
    setLoading(true);
    const data = await fetchMarketListings();
    setListings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      void refreshMarket();
    }
  }, [open, refreshMarket]);

  // Tradeable stackable goods: Crops, Fish, Artisan, Boss Materials, Snacks
  const sellableStacks = player.inventory.filter(
    (entry) => entry.quantity > 0 && (Boolean(FARM_ITEMS[entry.itemId]) || Boolean(STREET_SNACKS[entry.itemId]))
  );

  const mySellerId = authSession?.playerId ?? 'guest';
  const myListings = listings.filter(
    (l) => l.sellerId === mySellerId && (mySellerId !== 'guest' || l.sellerName === player.name)
  );

  const activeStack =
    sellableStacks.find((s) => `${s.itemId}::${s.quality ?? 'normal'}` === selectedStackKey) ??
    sellableStacks[0];

  const getItemName = (itemId: string) =>
    FARM_ITEMS[itemId]?.name ?? STREET_SNACKS[itemId]?.name ?? itemId;

  const taxPreview = Math.max(1, Math.floor(Math.max(10, listPrice) * 0.05));
  const payoutPreview = Math.max(0, Math.max(10, listPrice) - taxPreview);

  const handleListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStack) return;
    const qty = Math.max(1, Math.min(activeStack.quantity, Math.floor(listQty)));
    const price = Math.max(10, Math.floor(listPrice));
    setBusyId('create');
    const ok = await onCreateListing({
      itemId: activeStack.itemId,
      itemName: getItemName(activeStack.itemId),
      quantity: qty,
      quality: activeStack.quality ?? 'normal',
      priceCoins: price,
    });
    setBusyId(null);
    if (ok) {
      setListQty(1);
      await refreshMarket();
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Phum Village Market · Player Trading Board"
      subtitle={`Coins: ${player.currencies.coins.toLocaleString()} · 5% Village Coin Tax Sink (Seller receives 95%)`}
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('browse')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
                tab === 'browse'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Browse Market ({listings.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('sell')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
                tab === 'sell'
                  ? 'bg-emerald-800 text-amber-50 border-emerald-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Sell / My Listings ({myListings.length})
            </button>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void refreshMarket()}
            className="stardew-btn px-2.5 py-1 rounded-lg font-display font-bold text-[11px] inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* ==================== BROWSE & BUY ==================== */}
        {tab === 'browse' && (
          <div className="space-y-2 max-h-[56dvh] overflow-y-auto pr-1">
            {listings.length === 0 ? (
              <div className="p-5 rounded-xl bg-amber-50 border border-amber-900/20 text-center text-amber-800">
                No listings on the Market Board right now — switch to Sell to post your crops, fish, or snacks!
              </div>
            ) : (
              listings.map((l) => {
                const isOwn =
                  l.sellerId === mySellerId && (mySellerId !== 'guest' || l.sellerName === player.name);
                const tax = Math.max(1, Math.floor(l.priceCoins * 0.05));
                const canAfford = player.currencies.coins >= l.priceCoins;

                return (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/25 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1.5">
                        <span>
                          {l.quality === 'gold_star' ? '★ ' : ''}
                          {l.quantity}× {l.itemName}
                        </span>
                        {l.quality === 'gold_star' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 text-[9px]">
                            GOLD STAR
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-800">
                        Seller: <strong>{l.sellerName}</strong> · 5% Tax: {tax}c (Seller gets {(l.priceCoins - tax).toLocaleString()}c)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-display font-bold text-amber-900 inline-flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        {l.priceCoins.toLocaleString()}c
                      </span>
                      {isOwn ? (
                        <button
                          type="button"
                          disabled={busyId === l.id}
                          onClick={async () => {
                            setBusyId(l.id);
                            await onCancelListing(l);
                            setBusyId(null);
                            await refreshMarket();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-display font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || busyId === l.id}
                          onClick={async () => {
                            setBusyId(l.id);
                            await onBuyListing(l);
                            setBusyId(null);
                            await refreshMarket();
                          }}
                          className="stardew-btn px-3 py-1.5 rounded-lg font-display font-bold text-[11px] disabled:opacity-45"
                        >
                          Buy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==================== SELL / CREATE LISTING ==================== */}
        {tab === 'sell' && (
          <div className="space-y-3">
            {sellableStacks.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-900/20 text-center text-amber-800">
                No crops, fish, snacks, or boss cores in your Container to list right now.
              </div>
            ) : (
              <form
                onSubmit={(e) => void handleListSubmit(e)}
                className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/30 space-y-2.5"
              >
                <div className="grid sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block font-display font-bold text-[10px] uppercase text-amber-900 mb-1">
                      Item From Container
                    </label>
                    <select
                      value={
                        activeStack ? `${activeStack.itemId}::${activeStack.quality ?? 'normal'}` : ''
                      }
                      onChange={(e) => {
                        setSelectedStackKey(e.target.value);
                        setListQty(1);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950"
                    >
                      {sellableStacks.map((s) => {
                        const key = `${s.itemId}::${s.quality ?? 'normal'}`;
                        return (
                          <option key={key} value={key}>
                            {s.quality === 'gold_star' ? '★ ' : ''}
                            {getItemName(s.itemId)} (×{s.quantity})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-display font-bold text-[10px] uppercase text-amber-900 mb-1">
                      Quantity (Max {activeStack?.quantity ?? 1})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={activeStack?.quantity ?? 1}
                      value={listQty}
                      onChange={(e) => setListQty(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950"
                    />
                  </div>

                  <div>
                    <label className="block font-display font-bold text-[10px] uppercase text-amber-900 mb-1">
                      Total Price (Coins)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1000000}
                      value={listPrice}
                      onChange={(e) => setListPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-900/15">
                  <div className="text-[11px] font-semibold text-amber-900">
                    5% Village Tax: <strong className="text-rose-700">-{taxPreview.toLocaleString()}c</strong> · You Receive (95%):{' '}
                    <strong className="text-emerald-800">+{payoutPreview.toLocaleString()} Coins</strong>
                  </div>
                  <button
                    type="submit"
                    disabled={busyId === 'create'}
                    className="stardew-btn px-4 py-1.5 rounded-xl font-display font-bold text-xs"
                  >
                    Post Listing
                  </button>
                </div>
              </form>
            )}

            {myListings.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-display font-bold text-[10px] uppercase text-amber-900">
                  Your Active Market Listings
                </div>
                {myListings.map((l) => (
                  <div
                    key={l.id}
                    className="px-3 py-2 rounded-xl bg-amber-100/75 border border-amber-900/25 flex items-center justify-between gap-2"
                  >
                    <span className="font-bold text-amber-950">
                      {l.quantity}× {l.itemName} — {l.priceCoins.toLocaleString()}c
                    </span>
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={async () => {
                        setBusyId(l.id);
                        await onCancelListing(l);
                        setBusyId(null);
                        await refreshMarket();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px]"
                    >
                      Cancel & Return Item
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
