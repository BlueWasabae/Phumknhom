import React, { useEffect, useMemo, useState } from 'react';
import type {
  AuctionCategory,
  AuctionCurrency,
  AuctionListingRecord,
  ItemRarity,
  PlayerState,
} from '@shared/types';
import { getRarityTierDef } from '@shared/raritySystem';
import { ITEM_CATALOG } from '../data/items';
import { FARM_ITEMS } from '../data/cropsAndArtisan';
import { isVillagePassActive } from '../data/diamondStore';
import { Gavel, RefreshCw, Search, Shield, Sparkles, Timer, Zap } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface AuctionHouseModalProps {
  open: boolean;
  player: PlayerState;
  listings: AuctionListingRecord[];
  loading: boolean;
  onRefresh: (filters?: { rarity?: string; category?: string; search?: string }) => void;
  onCreateAuction: (payload: {
    itemId: string;
    itemName: string;
    quantity: number;
    quality: 'normal' | 'gold_star';
    itemLevel: number;
    rarity: ItemRarity;
    category: AuctionCategory;
    currency: AuctionCurrency;
    startingBid: number;
    buyoutPrice: number | null;
    durationHours: 1 | 6 | 24;
  }) => Promise<{ ok: boolean; message: string }>;
  onBid: (auction: AuctionListingRecord, bidAmount: number) => Promise<{ ok: boolean; message: string }>;
  onBuyout: (auction: AuctionListingRecord) => Promise<{ ok: boolean; message: string }>;
  onOpenMailbox: () => void;
  onClose: () => void;
}

const RARE_PLUS = new Set<ItemRarity>(['rare', 'epic', 'legendary', 'mythic', 'ancient']);

function inferItemDetails(itemId: string): {
  name: string;
  rarity: ItemRarity;
  category: AuctionCategory;
} {
  const eq = ITEM_CATALOG[itemId];
  if (eq) {
    const slot = eq.slot;
    const category: AuctionCategory =
      slot === 'weapon'
        ? 'weapon'
        : slot === 'wings'
          ? 'wings'
          : slot === 'pet'
            ? 'pet'
            : slot === 'armor' || slot === 'hat' || slot === 'shirt' || slot === 'pants'
              ? 'armor'
              : 'relic';
    return { name: eq.name, rarity: (eq.rarity ?? 'common') as ItemRarity, category };
  }
  const farm = FARM_ITEMS[itemId];
  if (farm) {
    const category: AuctionCategory =
      itemId.startsWith('pearl_') || itemId.startsWith('relic_') || itemId.startsWith('fish_')
        ? 'relic'
        : 'material';
    return { name: farm.name, rarity: (farm.rarity ?? 'common') as ItemRarity, category };
  }
  return { name: itemId.replace(/_/g, ' '), rarity: 'common', category: 'material' };
}

function formatRemaining(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const AuctionHouseModal: React.FC<AuctionHouseModalProps> = ({
  open,
  player,
  listings,
  loading,
  onRefresh,
  onCreateAuction,
  onBid,
  onBuyout,
  onOpenMailbox,
  onClose,
}) => {
  const [tab, setTab] = useState<'browse' | 'list'>('browse');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Listing form state
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [currency, setCurrency] = useState<AuctionCurrency>('coins');
  const [startingBid, setStartingBid] = useState<string>('500');
  const [buyoutPrice, setBuyoutPrice] = useState<string>('1500');
  const [durationHours, setDurationHours] = useState<1 | 6 | 24>(6);

  const isVip = isVillagePassActive(player, now);

  useEffect(() => {
    if (!open) return;
    onRefresh({ rarity: rarityFilter, category: categoryFilter, search });
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open]);

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

  const eligibleRareItems = useMemo(() => {
    return player.inventory
      .filter((inv) => inv.quantity > 0 && inv.itemId !== 'tool_magic_mirror')
      .map((inv) => {
        const info = inferItemDetails(inv.itemId);
        const reserve = equippedIds.has(inv.itemId) ? 1 : 0;
        const available = Math.max(0, inv.quantity - reserve);
        return {
          key: `${inv.itemId}::${inv.quality ?? 'normal'}`,
          itemId: inv.itemId,
          quality: (inv.quality ?? 'normal') as 'normal' | 'gold_star',
          itemLevel: inv.itemLevel ?? 1,
          available,
          ...info,
        };
      })
      .filter((x) => x.available > 0 && RARE_PLUS.has(x.rarity));
  }, [player.inventory, equippedIds]);

  useEffect(() => {
    if (eligibleRareItems.length > 0 && !eligibleRareItems.some((x) => x.key === selectedKey)) {
      setSelectedKey(eligibleRareItems[0].key);
    }
  }, [eligibleRareItems, selectedKey]);

  const filteredListings = useMemo(() => {
    return listings.filter((a) => {
      if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !a.itemName.toLowerCase().includes(q) &&
          !a.sellerName.toLowerCase().includes(q) &&
          !a.rarity.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [listings, rarityFilter, categoryFilter, search]);

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = eligibleRareItems.find((x) => x.key === selectedKey);
    if (!chosen) {
      setFeedback({ ok: false, text: 'Select an unequipped Rare+ item to place in Auction Escrow.' });
      return;
    }
    const startNum = Math.floor(Number(startingBid) || 0);
    const buyNum = buyoutPrice.trim() ? Math.floor(Number(buyoutPrice) || 0) : null;
    if (buyNum !== null && buyNum <= startNum) {
      setFeedback({ ok: false, text: 'Instant Buyout price must be higher than Starting Bid.' });
      return;
    }
    setBusy(true);
    const res = await onCreateAuction({
      itemId: chosen.itemId,
      itemName: chosen.name,
      quantity: 1,
      quality: chosen.quality,
      itemLevel: chosen.itemLevel,
      rarity: chosen.rarity,
      category: chosen.category,
      currency,
      startingBid: startNum,
      buyoutPrice: buyNum,
      durationHours,
    });
    setBusy(false);
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setTab('browse');
      onRefresh({ rarity: rarityFilter, category: categoryFilter, search });
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏛️ Angkor Auction Hall · សាលដេញថ្លៃអង្គរ"
      subtitle={`Rare, Epic, Legendary, Mythic & Ancient Drops · Escrow Protected · Anti-Snipe (+60s) · ${
        isVip ? '👑 0% VIP Tax' : '5% Standard Tax'
      }`}
      maxWidthClass="w-[min(96vw,880px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Top Bar: Tabs + Balances + Mailbox Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('browse')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold border-2 cursor-pointer transition ${
                tab === 'browse'
                  ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-900/25'
              }`}
            >
              🔨 Browse &amp; Bid ({filteredListings.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold border-2 cursor-pointer transition ${
                tab === 'list'
                  ? 'bg-emerald-800 text-emerald-50 border-emerald-950 shadow'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-900/25'
              }`}
            >
              📜 List Rare+ Item ({eligibleRareItems.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-800/30 text-amber-950">
              🪙 {player.currencies.coins.toLocaleString()} C
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-yellow-100 border border-yellow-700/40 text-amber-950">
              🥇 {player.currencies.gold.toLocaleString()} Gold
            </span>
            <button
              type="button"
              onClick={onOpenMailbox}
              className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white border border-sky-950 cursor-pointer"
            >
              📬 Mailbox
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onRefresh({ rarity: rarityFilter, category: categoryFilter, search })}
              className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-900/30 text-amber-950 cursor-pointer"
              title="Refresh Auctions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`px-3.5 py-2 rounded-xl border-2 font-bold ${
              feedback.ok
                ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                : 'bg-rose-50 border-rose-600 text-rose-950'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {tab === 'browse' ? (
          <div className="space-y-2.5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-900/20">
              <div className="relative flex-1 min-w-[170px]">
                <Search className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Ancient Pearl, Wings, Seller..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white border border-amber-900/30 text-amber-950 text-xs"
                />
              </div>

              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                aria-label="Filter by Rarity"
                className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-900/30 text-amber-950 font-bold text-xs"
              >
                <option value="all">All Rarities (Rare+)</option>
                <option value="ancient">✨ Ancient</option>
                <option value="mythic">🌟 Mythic</option>
                <option value="legendary">👑 Legendary</option>
                <option value="epic">💜 Epic</option>
                <option value="rare">💠 Rare</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by Category"
                className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-900/30 text-amber-950 font-bold text-xs"
              >
                <option value="all">All Categories</option>
                <option value="weapon">⚔️ Weapons</option>
                <option value="wings">🪽 Wings / Auras</option>
                <option value="pet">🐾 Pets</option>
                <option value="armor">🛡️ Armor &amp; Fashion</option>
                <option value="relic">🏺 Relics &amp; Pearls</option>
                <option value="material">💎 Materials</option>
              </select>
            </div>

            {/* Active Auction Cards */}
            <div className="max-h-[52vh] overflow-y-auto space-y-2 pr-1">
              {filteredListings.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-amber-50 border border-amber-900/20 text-amber-900/80 font-bold">
                  No active auctions match your filter. Switch to &ldquo;List Rare+ Item&rdquo; to post one!
                </div>
              ) : (
                filteredListings.map((a) => {
                  const tier = getRarityTierDef(a.rarity);
                  const remMs = Math.max(0, a.endsAt - now);
                  const curIcon = a.currency === 'gold' ? '🥇' : '🪙';
                  const curUnit = a.currency === 'gold' ? 'Gold' : 'C';
                  const minNextBid =
                    a.bidCount === 0
                      ? a.startingBid
                      : Math.max(a.currentBid + 1, Math.ceil(a.currentBid * 1.05));
                  const bidDraft = bidInputs[a.id] ?? String(minNextBid);
                  const isOwn = a.sellerName.toLowerCase() === player.name.toLowerCase();

                  return (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-950 text-amber-50 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{ borderColor: tier.colorHex }}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-black/70 border"
                            style={{ color: tier.colorHex, borderColor: tier.colorHex }}
                          >
                            {tier.label}
                          </span>
                          <span className="font-display font-black text-sm text-white truncate">
                            {a.itemName} {a.quantity > 1 ? `×${a.quantity}` : ''}
                          </span>
                          {a.antiSnipeExtensions > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-900/80 border border-cyan-400/60 text-[9px] font-black text-cyan-200 inline-flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Anti-Snipe +{a.antiSnipeExtensions * 60}s
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-100/80">
                          <span>Seller: <strong className="text-amber-200">{a.sellerName}</strong></span>
                          <span className="inline-flex items-center gap-1 text-sky-300 font-bold">
                            <Timer className="w-3 h-3" /> {formatRemaining(remMs)}
                          </span>
                          <span>
                            Bids: <strong className="text-white">{a.bidCount}</strong>
                            {a.highestBidderName ? ` (Leader: ${a.highestBidderName})` : ' (No bids yet)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        <div className="text-right mr-1">
                          <div className="text-[10px] text-amber-300/80 uppercase font-bold">
                            {a.bidCount > 0 ? 'Current Bid' : 'Starting Bid'}
                          </div>
                          <div className="font-mono font-black text-sm text-amber-300">
                            {curIcon} {a.currentBid.toLocaleString()} {curUnit}
                          </div>
                        </div>

                        {!isOwn ? (
                          <>
                            <input
                              type="number"
                              min={minNextBid}
                              value={bidDraft}
                              onChange={(e) =>
                                setBidInputs((prev) => ({ ...prev, [a.id]: e.target.value }))
                              }
                              aria-label={`Bid for ${a.itemName}`}
                              className="w-24 px-2 py-1.5 rounded-lg bg-slate-900 border border-amber-500/50 text-right font-mono text-xs font-bold text-white"
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                const res = await onBid(a, Math.floor(Number(bidDraft) || minNextBid));
                                setBusy(false);
                                setFeedback({ ok: res.ok, text: res.message });
                                if (res.ok) onRefresh({ rarity: rarityFilter, category: categoryFilter, search });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-300 font-display font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Gavel className="w-3.5 h-3.5" /> Bid
                            </button>

                            {a.buyoutPrice && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true);
                                  const res = await onBuyout(a);
                                  setBusy(false);
                                  setFeedback({ ok: res.ok, text: res.message });
                                  if (res.ok) onRefresh({ rarity: rarityFilter, category: categoryFilter, search });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:brightness-110 text-white border border-cyan-300 font-display font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" /> Buy {curIcon}
                                {a.buyoutPrice.toLocaleString()}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-400/60 text-[10px] font-black text-emerald-200">
                            Your Escrow Listing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* LIST RARE+ ITEM TAB */
          <form onSubmit={handleSubmitListing} className="space-y-3 p-4 rounded-xl bg-amber-50 border border-amber-900/25">
            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                Place Rare+ Item into Server Auction Escrow
              </div>
              <span className="text-[11px] font-bold text-emerald-800">
                {isVip ? '👑 VIP Active: 0% Auction Tax!' : 'Standard Fee: 5% on Sale'}
              </span>
            </div>

            {eligibleRareItems.length === 0 ? (
              <div className="p-5 rounded-xl bg-white border border-amber-900/20 text-center text-amber-900 font-bold">
                No unequipped Rare, Epic, Legendary, Mythic, or Ancient items in your bag.
                <br />
                <span className="text-[11px] font-normal text-amber-800">
                  (Currently equipped gear is protected — unequip it in Inventory first to auction.)
                </span>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-bold text-amber-900">Select Rare+ Item (Escrow)</span>
                    <select
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-amber-900/30 text-amber-950 font-bold text-xs"
                    >
                      {eligibleRareItems.map((it) => (
                        <option key={it.key} value={it.key}>
                          [{it.rarity.toUpperCase()}] {it.name} (Avail: {it.available})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[11px] font-bold text-amber-900">Bidding Currency</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['coins', 'gold'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCurrency(c);
                            setStartingBid(c === 'gold' ? '5' : '500');
                            setBuyoutPrice(c === 'gold' ? '15' : '1500');
                          }}
                          className={`py-2 rounded-xl border-2 font-display font-bold text-xs cursor-pointer ${
                            currency === c
                              ? 'bg-amber-800 text-amber-50 border-amber-950'
                              : 'bg-white text-amber-950 border-amber-900/25'
                          }`}
                        >
                          {c === 'coins' ? '🪙 Coins (C)' : '🥇 Gold'}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[11px] font-bold text-amber-900">
                      Starting Bid ({currency === 'gold' ? 'Gold' : 'Coins'})
                    </span>
                    <input
                      type="number"
                      min={currency === 'gold' ? 1 : 50}
                      required
                      value={startingBid}
                      onChange={(e) => setStartingBid(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-amber-900/30 text-amber-950 font-mono font-bold text-xs"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[11px] font-bold text-amber-900">
                      Instant Buyout Price (Optional)
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Leave blank for bids only"
                      value={buyoutPrice}
                      onChange={(e) => setBuyoutPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-amber-900/30 text-amber-950 font-mono font-bold text-xs"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-900">Duration:</span>
                    {([1, 6, 24] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDurationHours(h)}
                        className={`px-3 py-1 rounded-lg border font-bold text-xs cursor-pointer ${
                          durationHours === h
                            ? 'bg-emerald-700 text-white border-emerald-950'
                            : 'bg-white text-amber-950 border-amber-900/30'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white border-2 border-amber-950 font-display font-black text-xs shadow-md cursor-pointer"
                  >
                    🏛️ Lock in Escrow &amp; Create Auction
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </NativeDialog>
  );
};
