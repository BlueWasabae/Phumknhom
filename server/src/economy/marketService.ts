import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { creditPlayerCoins, getSupabaseClient, isPlayerVip } from '../db/supabase';
import { presenceRegistry } from '../presence';

export const MARKET_TAX_RATE = 0.05; // 5% Village Market Coin Sink (docs/GDD_CONTENT_AND_ECONOMY.md §5)

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  quality: 'normal' | 'gold_star';
  priceCoins: number;
  createdAt: string;
}

const LOCAL_MARKET_PATH = path.resolve(__dirname, '../../data/local_market.json');

const STARTER_SAMPLE_LISTINGS: MarketListing[] = [
  {
    id: 'seed_listing_1',
    sellerId: 'npc_village_merchant',
    sellerName: 'Yeay Sophea (Village Stall)',
    itemId: 'crop_kampot_pepper',
    itemName: 'Kampot Peppercorns',
    quantity: 1,
    quality: 'normal',
    priceCoins: 1450,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_listing_2',
    sellerId: 'npc_village_merchant',
    sellerName: 'Ta Sok (Fisherman)',
    itemId: 'fish_golden_lotus_koi',
    itemName: 'Golden Lotus Koi',
    quantity: 1,
    quality: 'normal',
    priceCoins: 390,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_listing_3',
    sellerId: 'npc_village_merchant',
    sellerName: 'Phum Bakery',
    itemId: 'snack_pepper_skewer',
    itemName: 'Kampot Pepper Skewers',
    quantity: 2,
    quality: 'normal',
    priceCoins: 310,
    createdAt: new Date().toISOString(),
  },
];

function readLocalMarket(): MarketListing[] {
  try {
    if (!fs.existsSync(LOCAL_MARKET_PATH)) {
      writeLocalMarket(STARTER_SAMPLE_LISTINGS);
      return [...STARTER_SAMPLE_LISTINGS];
    }
    const raw = fs.readFileSync(LOCAL_MARKET_PATH, 'utf8');
    const parsed = JSON.parse(raw) as MarketListing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...STARTER_SAMPLE_LISTINGS];
  }
}

function writeLocalMarket(listings: MarketListing[]): void {
  const dir = path.dirname(LOCAL_MARKET_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_MARKET_PATH, JSON.stringify(listings, null, 2), 'utf8');
}

export function computeMarketTax(
  priceCoins: number,
  isVip = false
): { taxCoins: number; sellerPayout: number } {
  const safe = Math.max(1, Math.floor(priceCoins));
  if (isVip) {
    return {
      taxCoins: 0,
      sellerPayout: safe,
    };
  }
  const taxCoins = Math.max(1, Math.floor(safe * MARKET_TAX_RATE));
  return {
    taxCoins,
    sellerPayout: Math.max(0, safe - taxCoins),
  };
}

export async function listMarketListings(): Promise<MarketListing[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from('market_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({
        id: r.id,
        sellerId: r.seller_id,
        sellerName: r.seller_name,
        itemId: r.item_id,
        itemName: r.item_name,
        quantity: r.quantity,
        quality: r.quality === 'gold_star' ? 'gold_star' : 'normal',
        priceCoins: r.price_coins,
        createdAt: r.created_at,
      }));
    }
  }
  return readLocalMarket().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createMarketListing(input: {
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: 'normal' | 'gold_star';
  priceCoins: number;
}): Promise<{ ok: true; listing: MarketListing } | { ok: false; error: string }> {
  const qty = Math.max(1, Math.min(99, Math.floor(input.quantity)));
  const priceCoins = Math.max(10, Math.min(1_000_000, Math.floor(input.priceCoins)));
  if (!input.itemId || !input.itemName) {
    return { ok: false, error: 'Invalid item.' };
  }

  const listing: MarketListing = {
    id: crypto.randomUUID(),
    sellerId: input.sellerId,
    sellerName: input.sellerName.slice(0, 24),
    itemId: input.itemId,
    itemName: input.itemName.slice(0, 48),
    quantity: qty,
    quality: input.quality === 'gold_star' ? 'gold_star' : 'normal',
    priceCoins,
    createdAt: new Date().toISOString(),
  };

  const sb = getSupabaseClient();
  if (sb) {
    const { error } = await sb.from('market_listings').insert({
      id: listing.id,
      seller_id: listing.sellerId,
      seller_name: listing.sellerName,
      item_id: listing.itemId,
      item_name: listing.itemName,
      quantity: listing.quantity,
      quality: listing.quality,
      price_coins: listing.priceCoins,
      created_at: listing.createdAt,
    });
    if (!error) return { ok: true, listing };
  }

  const all = readLocalMarket();
  all.unshift(listing);
  writeLocalMarket(all);
  return { ok: true, listing };
}

export async function buyMarketListing(
  listingId: string,
  buyerId: string,
  buyerName: string
): Promise<
  | {
      ok: true;
      listing: MarketListing;
      taxCoins: number;
      sellerPayout: number;
    }
  | { ok: false; error: string }
> {
  const sb = getSupabaseClient();
  let listing: MarketListing | null = null;

  if (sb) {
    const { data: row } = await sb
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();
    if (row) {
      if (row.seller_id === buyerId && buyerId !== 'guest') {
        return { ok: false, error: 'Cannot buy your own listing — cancel it instead!' };
      }
      const { error: delErr } = await sb.from('market_listings').delete().eq('id', listingId);
      if (delErr) return { ok: false, error: 'Listing already sold.' };
      listing = {
        id: row.id,
        sellerId: row.seller_id,
        sellerName: row.seller_name,
        itemId: row.item_id,
        itemName: row.item_name,
        quantity: row.quantity,
        quality: row.quality === 'gold_star' ? 'gold_star' : 'normal',
        priceCoins: row.price_coins,
        createdAt: row.created_at,
      };
    }
  }

  if (!listing) {
    const all = readLocalMarket();
    const idx = all.findIndex((l) => l.id === listingId);
    if (idx < 0) {
      return { ok: false, error: 'Listing is no longer available.' };
    }
    const found = all[idx];
    if (found.sellerId === buyerId && buyerId !== 'guest') {
      return { ok: false, error: 'Cannot buy your own listing — cancel it instead!' };
    }
    all.splice(idx, 1);
    writeLocalMarket(all);
    listing = found;
  }

  const sellerIsVip =
    listing.sellerId && !listing.sellerId.startsWith('npc_') && listing.sellerId !== 'guest'
      ? await isPlayerVip(listing.sellerId)
      : false;
  const { taxCoins, sellerPayout } = computeMarketTax(listing.priceCoins, sellerIsVip);

  // Credit 100% (VIP 0% Tax) or 95% of Coins to seller's account (if registered player, not NPC sample stall)
  if (listing.sellerId && !listing.sellerId.startsWith('npc_') && listing.sellerId !== 'guest') {
    await creditPlayerCoins(listing.sellerId, sellerPayout);
    presenceRegistry.sendToTarget(
      { playerId: listing.sellerId, username: listing.sellerName },
      'marketSale',
      {
        itemName: listing.itemName,
        quantity: listing.quantity,
        buyerName,
        payoutCoins: sellerPayout,
        taxCoins,
      }
    );
  }

  return { ok: true, listing, taxCoins, sellerPayout };
}

export async function cancelMarketListing(
  listingId: string,
  sellerId: string
): Promise<{ ok: true; listing: MarketListing } | { ok: false; error: string }> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data: row } = await sb
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();
    if (row) {
      if (row.seller_id !== sellerId) {
        return { ok: false, error: 'You can only cancel your own listings.' };
      }
      await sb.from('market_listings').delete().eq('id', listingId);
      return {
        ok: true,
        listing: {
          id: row.id,
          sellerId: row.seller_id,
          sellerName: row.seller_name,
          itemId: row.item_id,
          itemName: row.item_name,
          quantity: row.quantity,
          quality: row.quality === 'gold_star' ? 'gold_star' : 'normal',
          priceCoins: row.price_coins,
          createdAt: row.created_at,
        },
      };
    }
  }

  const all = readLocalMarket();
  const idx = all.findIndex((l) => l.id === listingId);
  if (idx < 0) return { ok: false, error: 'Listing not found.' };
  if (all[idx].sellerId !== sellerId) {
    return { ok: false, error: 'You can only cancel your own listings.' };
  }
  const [removed] = all.splice(idx, 1);
  writeLocalMarket(all);
  return { ok: true, listing: removed };
}
