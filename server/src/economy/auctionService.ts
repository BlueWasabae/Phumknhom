import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { creditPlayerCoins, creditPlayerGold, isPlayerVip } from '../db/supabase';
import { presenceRegistry } from '../presence';
import { PlazaRoom } from '../rooms/PlazaRoom';

export const AUCTION_TAX_RATE = 0.05; // 5% standard fee, 0% for VIP Pass holders
export const ANTI_SNIPE_WINDOW_MS = 60_000;
export const ANTI_SNIPE_EXTEND_MS = 60_000;

export type ServerAuctionRarity = 'rare' | 'epic' | 'legendary' | 'mythic' | 'ancient';
export type ServerAuctionCategory = 'weapon' | 'wings' | 'pet' | 'armor' | 'relic' | 'material';
export type ServerAuctionCurrency = 'coins' | 'gold';

const ALLOWED_RARITIES = new Set<string>(['rare', 'epic', 'legendary', 'mythic', 'ancient']);
const ALLOWED_CATEGORIES = new Set<string>(['weapon', 'wings', 'pet', 'armor', 'relic', 'material']);

export interface ServerAuctionListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerIsVip: boolean;
  itemId: string;
  itemName: string;
  quantity: number;
  quality: 'normal' | 'gold_star';
  itemLevel: number;
  rarity: ServerAuctionRarity;
  category: ServerAuctionCategory;
  currency: ServerAuctionCurrency;
  startingBid: number;
  currentBid: number;
  buyoutPrice: number | null;
  highestBidderId: string | null;
  highestBidderName: string | null;
  bidCount: number;
  durationHours: 1 | 6 | 24;
  createdAt: number;
  endsAt: number;
  antiSnipeExtensions: number;
  status: 'active' | 'sold' | 'expired' | 'cancelled';
}

export interface ServerMailAttachment {
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: 'normal' | 'gold_star';
  itemLevel?: number;
  rarity?: string;
}

export interface ServerMailEntry {
  id: string;
  recipientKey: string;
  recipientName: string;
  kind: 'auction_won' | 'auction_sold' | 'auction_outbid' | 'auction_expired' | 'trade_receipt' | 'system';
  title: string;
  body: string;
  coins: number;
  gold: number;
  items: ServerMailAttachment[];
  createdAt: number;
  claimed: boolean;
}

const LOCAL_AUCTIONS_PATH = path.resolve(__dirname, '../../data/local_auctions.json');
const LOCAL_MAILBOX_PATH = path.resolve(__dirname, '../../data/local_mailbox.json');

function buildStarterSeedAuctions(): ServerAuctionListing[] {
  const now = Date.now();
  return [
    {
      id: 'auc_seed_ancient_pearl',
      sellerId: 'npc_angkor_curator',
      sellerName: 'Curator Borey (Angkor Hall)',
      sellerIsVip: true,
      itemId: 'pearl_ancient_bioluminescent',
      itemName: 'Ancient Bioluminescent Pearl',
      quantity: 1,
      quality: 'normal',
      itemLevel: 1,
      rarity: 'ancient',
      category: 'relic',
      currency: 'coins',
      startingBid: 2200,
      currentBid: 2200,
      buyoutPrice: 6500,
      highestBidderId: null,
      highestBidderName: null,
      bidCount: 0,
      durationHours: 24,
      createdAt: now - 300_000,
      endsAt: now + 23 * 3600_000,
      antiSnipeExtensions: 0,
      status: 'active',
    },
    {
      id: 'auc_seed_naga_wings',
      sellerId: 'npc_angkor_curator',
      sellerName: 'Master Somnang (Guild Vault)',
      sellerIsVip: true,
      itemId: 'wings_garuda',
      itemName: 'Golden Garuda Wings',
      quantity: 1,
      quality: 'normal',
      itemLevel: 1,
      rarity: 'legendary',
      category: 'wings',
      currency: 'coins',
      startingBid: 1200,
      currentBid: 1200,
      buyoutPrice: 3200,
      highestBidderId: null,
      highestBidderName: null,
      bidCount: 0,
      durationHours: 6,
      createdAt: now - 180_000,
      endsAt: now + 5 * 3600_000,
      antiSnipeExtensions: 0,
      status: 'active',
    },
    {
      id: 'auc_seed_starlight_manta',
      sellerId: 'npc_angkor_curator',
      sellerName: 'Capt. Rithy (Koh Rong)',
      sellerIsVip: false,
      itemId: 'fish_starlight_manta',
      itemName: 'Starlight Manta Ray',
      quantity: 1,
      quality: 'normal',
      itemLevel: 1,
      rarity: 'mythic',
      category: 'relic',
      currency: 'coins',
      startingBid: 1500,
      currentBid: 1500,
      buyoutPrice: 4200,
      highestBidderId: null,
      highestBidderName: null,
      bidCount: 0,
      durationHours: 6,
      createdAt: now - 120_000,
      endsAt: now + 6 * 3600_000,
      antiSnipeExtensions: 0,
      status: 'active',
    },
  ];
}

function readJsonFile<T>(filePath: string, fallback: () => T): T {
  try {
    if (!fs.existsSync(filePath)) {
      const initial = fallback();
      writeJsonFile(filePath, initial);
      return initial;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function broadcastAuctionTicker(text: string): void {
  PlazaRoom.activeRooms.forEach((room) => {
    room.broadcast('auctionTicker', { text, timestamp: Date.now() });
  });
}

function computeAuctionTax(gross: number, sellerIsVip: boolean): { tax: number; net: number } {
  const safe = Math.max(1, Math.floor(gross));
  if (sellerIsVip) return { tax: 0, net: safe };
  const tax = Math.max(1, Math.floor(safe * AUCTION_TAX_RATE));
  return { tax, net: Math.max(0, safe - tax) };
}

function normalizeRecipientKey(idOrName: string): string {
  return String(idOrName || '').trim().toLowerCase();
}

export function pushPlayerMail(entry: Omit<ServerMailEntry, 'id' | 'createdAt' | 'claimed'>): ServerMailEntry {
  const all = readJsonFile<ServerMailEntry[]>(LOCAL_MAILBOX_PATH, () => []);
  const created: ServerMailEntry = {
    ...entry,
    recipientKey: normalizeRecipientKey(entry.recipientKey || entry.recipientName),
    id: `mail_${crypto.randomBytes(6).toString('hex')}`,
    createdAt: Date.now(),
    claimed: false,
  };
  all.unshift(created);
  // Keep latest 400 mail records in local store
  writeJsonFile(LOCAL_MAILBOX_PATH, all.slice(0, 400));

  // Notify live player if online in any PlazaRoom
  presenceRegistry.sendToTarget(
    { playerId: entry.recipientKey, username: entry.recipientName },
    'mailNotification',
    {
      mail: created,
      text: `📬 ${created.title} — Open Mailbox to claim!`,
    }
  );
  return created;
}

export function listPlayerMail(recipientKeys: string[]): ServerMailEntry[] {
  settleExpiredAuctions();
  const keySet = new Set(recipientKeys.map(normalizeRecipientKey).filter(Boolean));
  if (keySet.size === 0) return [];
  const all = readJsonFile<ServerMailEntry[]>(LOCAL_MAILBOX_PATH, () => []);
  return all
    .filter((m) => keySet.has(normalizeRecipientKey(m.recipientKey)) || keySet.has(normalizeRecipientKey(m.recipientName)))
    .sort((a, b) => Number(a.claimed) - Number(b.claimed) || b.createdAt - a.createdAt);
}

export function claimPlayerMail(
  recipientKeys: string[],
  mailId?: string
): {
  ok: true;
  claimedCount: number;
  totalCoins: number;
  totalGold: number;
  items: ServerMailAttachment[];
  remainingMail: ServerMailEntry[];
} {
  settleExpiredAuctions();
  const keySet = new Set(recipientKeys.map(normalizeRecipientKey).filter(Boolean));
  const all = readJsonFile<ServerMailEntry[]>(LOCAL_MAILBOX_PATH, () => []);
  let claimedCount = 0;
  let totalCoins = 0;
  let totalGold = 0;
  const items: ServerMailAttachment[] = [];

  for (const m of all) {
    const matchesUser =
      keySet.has(normalizeRecipientKey(m.recipientKey)) || keySet.has(normalizeRecipientKey(m.recipientName));
    if (!matchesUser || m.claimed) continue;
    if (mailId && m.id !== mailId) continue;

    m.claimed = true;
    claimedCount += 1;
    totalCoins += Math.max(0, Math.floor(m.coins || 0));
    totalGold += Math.max(0, Math.floor(m.gold || 0));
    if (Array.isArray(m.items)) {
      items.push(...m.items);
    }
  }

  if (claimedCount > 0) {
    writeJsonFile(LOCAL_MAILBOX_PATH, all);
  }

  return {
    ok: true,
    claimedCount,
    totalCoins,
    totalGold,
    items,
    remainingMail: listPlayerMail(recipientKeys),
  };
}

function finalizeSoldAuction(auction: ServerAuctionListing, finalPrice: number, winnerId: string, winnerName: string): void {
  auction.status = 'sold';
  auction.currentBid = finalPrice;
  auction.highestBidderId = winnerId;
  auction.highestBidderName = winnerName;

  const { tax, net } = computeAuctionTax(finalPrice, auction.sellerIsVip);
  const currencyLabel = auction.currency === 'gold' ? 'Gold' : 'Coins';

  // Route won item to winner's Mailbox
  pushPlayerMail({
    recipientKey: winnerId && winnerId !== 'guest' ? winnerId : winnerName,
    recipientName: winnerName,
    kind: 'auction_won',
    title: `🏛️ Auction Won: ${auction.itemName}`,
    body: `You won ${auction.quantity}× ${auction.itemName} (${auction.rarity.toUpperCase()}) for ${finalPrice.toLocaleString()} ${currencyLabel}!`,
    coins: 0,
    gold: 0,
    items: [
      {
        itemId: auction.itemId,
        itemName: auction.itemName,
        quantity: auction.quantity,
        quality: auction.quality,
        itemLevel: auction.itemLevel,
        rarity: auction.rarity,
      },
    ],
  });

  // Route net payout to seller's Mailbox (unless NPC seed auction)
  if (!auction.sellerId.startsWith('npc_')) {
    pushPlayerMail({
      recipientKey: auction.sellerId && auction.sellerId !== 'guest' ? auction.sellerId : auction.sellerName,
      recipientName: auction.sellerName,
      kind: 'auction_sold',
      title: `💰 Auction Sold: ${auction.itemName}`,
      body: `${winnerName} won your ${auction.quantity}× ${auction.itemName} for ${finalPrice.toLocaleString()} ${currencyLabel}. Payout: ${net.toLocaleString()} ${currencyLabel} (${
        auction.sellerIsVip ? '0% VIP Tax' : `5% Tax: -${tax.toLocaleString()}`
      }).`,
      coins: auction.currency === 'coins' ? net : 0,
      gold: auction.currency === 'gold' ? net : 0,
      items: [],
    });
  }

  if (auction.rarity === 'ancient' || auction.rarity === 'mythic') {
    broadcastAuctionTicker(
      `🏛️✨ [${auction.rarity.toUpperCase()} SOLD] ${winnerName} won ${auction.itemName} at the Angkor Auction Hall for ${finalPrice.toLocaleString()} ${currencyLabel}!`
    );
  }
}

export function settleExpiredAuctions(): number {
  const all = readJsonFile<ServerAuctionListing[]>(LOCAL_AUCTIONS_PATH, buildStarterSeedAuctions);
  const now = Date.now();
  let changed = 0;

  for (const a of all) {
    if (a.status !== 'active' || a.endsAt > now) continue;
    changed += 1;
    if (a.highestBidderId && a.highestBidderName && a.bidCount > 0) {
      finalizeSoldAuction(a, a.currentBid, a.highestBidderId, a.highestBidderName);
    } else {
      a.status = 'expired';
      if (!a.sellerId.startsWith('npc_')) {
        pushPlayerMail({
          recipientKey: a.sellerId && a.sellerId !== 'guest' ? a.sellerId : a.sellerName,
          recipientName: a.sellerName,
          kind: 'auction_expired',
          title: `📦 Unsold Auction Returned: ${a.itemName}`,
          body: `Your ${a.quantity}× ${a.itemName} listing ended with no bids and has been returned from Escrow.`,
          coins: 0,
          gold: 0,
          items: [
            {
              itemId: a.itemId,
              itemName: a.itemName,
              quantity: a.quantity,
              quality: a.quality,
              itemLevel: a.itemLevel,
              rarity: a.rarity,
            },
          ],
        });
      }
    }
  }

  if (changed > 0) {
    writeJsonFile(LOCAL_AUCTIONS_PATH, all);
  }
  return changed;
}

export function listAuctionListings(filter?: {
  rarity?: string;
  category?: string;
  search?: string;
  includeEnded?: boolean;
}): ServerAuctionListing[] {
  settleExpiredAuctions();
  let all = readJsonFile<ServerAuctionListing[]>(LOCAL_AUCTIONS_PATH, buildStarterSeedAuctions);
  if (!filter?.includeEnded) {
    all = all.filter((a) => a.status === 'active');
  }
  if (filter?.rarity && filter.rarity !== 'all') {
    all = all.filter((a) => a.rarity === filter.rarity);
  }
  if (filter?.category && filter.category !== 'all') {
    all = all.filter((a) => a.category === filter.category);
  }
  if (filter?.search && filter.search.trim()) {
    const q = filter.search.trim().toLowerCase();
    all = all.filter(
      (a) =>
        a.itemName.toLowerCase().includes(q) ||
        a.sellerName.toLowerCase().includes(q) ||
        a.rarity.toLowerCase().includes(q)
    );
  }
  return all.sort((a, b) => a.endsAt - b.endsAt);
}

export async function createAuctionListing(input: {
  sellerId: string;
  sellerName: string;
  sellerIsVipOverride?: boolean;
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: 'normal' | 'gold_star';
  itemLevel?: number;
  rarity: string;
  category: string;
  currency: 'coins' | 'gold';
  startingBid: number;
  buyoutPrice?: number | null;
  durationHours: number;
}): Promise<{ ok: true; listing: ServerAuctionListing } | { ok: false; error: string }> {
  const rarity = String(input.rarity || '').toLowerCase();
  if (!ALLOWED_RARITIES.has(rarity)) {
    return {
      ok: false,
      error: 'Only Rare, Epic, Legendary, Mythic, or Ancient items can be listed on the Auction House.',
    };
  }
  const category: ServerAuctionCategory = ALLOWED_CATEGORIES.has(input.category)
    ? (input.category as ServerAuctionCategory)
    : 'relic';
  const currency: ServerAuctionCurrency = input.currency === 'gold' ? 'gold' : 'coins';
  const minBid = currency === 'gold' ? 1 : 50;
  const startingBid = Math.max(minBid, Math.min(50_000_000, Math.floor(Number(input.startingBid) || 0)));
  const buyoutPrice =
    input.buyoutPrice && Number(input.buyoutPrice) > 0
      ? Math.max(startingBid + 1, Math.min(100_000_000, Math.floor(Number(input.buyoutPrice))))
      : null;
  const durationHours: 1 | 6 | 24 =
    input.durationHours === 1 ? 1 : input.durationHours === 24 ? 24 : 6;
  const quantity = Math.max(1, Math.min(99, Math.floor(Number(input.quantity) || 1)));
  if (!input.itemId || !input.itemName) {
    return { ok: false, error: 'Missing item to auction.' };
  }

  const dbVip = await isPlayerVip(input.sellerId);
  const sellerIsVip = Boolean(dbVip || input.sellerIsVipOverride);
  const now = Date.now();
  const listing: ServerAuctionListing = {
    id: `auc_${crypto.randomBytes(6).toString('hex')}`,
    sellerId: input.sellerId || 'guest',
    sellerName: String(input.sellerName || 'PhumHero').slice(0, 24),
    sellerIsVip,
    itemId: input.itemId.slice(0, 64),
    itemName: input.itemName.slice(0, 64),
    quantity,
    quality: input.quality === 'gold_star' ? 'gold_star' : 'normal',
    itemLevel: typeof input.itemLevel === 'number' ? Math.max(1, Math.floor(input.itemLevel)) : 1,
    rarity: rarity as ServerAuctionRarity,
    category,
    currency,
    startingBid,
    currentBid: startingBid,
    buyoutPrice,
    highestBidderId: null,
    highestBidderName: null,
    bidCount: 0,
    durationHours,
    createdAt: now,
    endsAt: now + durationHours * 3600_000,
    antiSnipeExtensions: 0,
    status: 'active',
  };

  const all = readJsonFile<ServerAuctionListing[]>(LOCAL_AUCTIONS_PATH, buildStarterSeedAuctions);
  all.unshift(listing);
  writeJsonFile(LOCAL_AUCTIONS_PATH, all);

  if (listing.rarity === 'ancient' || listing.rarity === 'mythic') {
    const curLabel = listing.currency === 'gold' ? 'Gold' : 'Coins';
    broadcastAuctionTicker(
      `🏛️✨ [${listing.rarity.toUpperCase()} AUCTION] ${listing.sellerName} listed ${listing.itemName} starting at ${listing.startingBid.toLocaleString()} ${curLabel} in the Angkor Auction Hall!`
    );
  }

  return { ok: true, listing };
}

export async function placeAuctionBid(input: {
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidAmount: number;
}): Promise<
  | {
      ok: true;
      listing: ServerAuctionListing;
      antiSnipeTriggered: boolean;
      instantBuyout: boolean;
      refundedPrevBidderName: string | null;
    }
  | { ok: false; error: string }
> {
  settleExpiredAuctions();
  const all = readJsonFile<ServerAuctionListing[]>(LOCAL_AUCTIONS_PATH, buildStarterSeedAuctions);
  const auction = all.find((a) => a.id === input.auctionId);
  if (!auction || auction.status !== 'active') {
    return { ok: false, error: 'Auction is no longer active.' };
  }
  const now = Date.now();
  if (auction.endsAt <= now) {
    settleExpiredAuctions();
    return { ok: false, error: 'This auction has already ended.' };
  }
  if (
    auction.sellerId === input.bidderId &&
    auction.sellerName.toLowerCase() === input.bidderName.toLowerCase()
  ) {
    return { ok: false, error: 'You cannot bid on your own auction listing.' };
  }

  const bidAmount = Math.floor(Number(input.bidAmount) || 0);
  const minRequired =
    auction.bidCount === 0
      ? auction.startingBid
      : Math.max(auction.currentBid + 1, Math.ceil(auction.currentBid * 1.05));
  if (bidAmount < minRequired) {
    return {
      ok: false,
      error: `Minimum bid is ${minRequired.toLocaleString()} ${auction.currency === 'gold' ? 'Gold' : 'Coins'}.`,
    };
  }

  // Refund previous highest bidder immediately via Escrow refund + Mailbox + live notice!
  let refundedPrevBidderName: string | null = null;
  if (auction.highestBidderId && auction.highestBidderName && auction.bidCount > 0) {
    const prevId = auction.highestBidderId;
    const prevName = auction.highestBidderName;
    const prevAmount = auction.currentBid;
    refundedPrevBidderName = prevName;

    if (auction.currency === 'gold') {
      await creditPlayerGold(prevId, prevAmount);
    } else {
      await creditPlayerCoins(prevId, prevAmount);
    }

    pushPlayerMail({
      recipientKey: prevId && prevId !== 'guest' ? prevId : prevName,
      recipientName: prevName,
      kind: 'auction_outbid',
      title: `🔔 Outbid Refund: ${auction.itemName}`,
      body: `${input.bidderName} outbid you with ${bidAmount.toLocaleString()} ${
        auction.currency === 'gold' ? 'Gold' : 'Coins'
      }. Your escrowed ${prevAmount.toLocaleString()} ${
        auction.currency === 'gold' ? 'Gold' : 'Coins'
      } has been refunded!`,
      coins: auction.currency === 'coins' ? prevAmount : 0,
      gold: auction.currency === 'gold' ? prevAmount : 0,
      items: [],
    });

    presenceRegistry.sendToTarget(
      { playerId: prevId, username: prevName },
      'socialNotice',
      {
        text: `🔔 You were outbid on ${auction.itemName}! ${prevAmount.toLocaleString()} ${
          auction.currency === 'gold' ? 'Gold' : 'Coins'
        } refunded to your Mailbox.`,
      }
    );
  }

  // Instant buyout if bid >= buyoutPrice
  if (auction.buyoutPrice && bidAmount >= auction.buyoutPrice) {
    finalizeSoldAuction(auction, auction.buyoutPrice, input.bidderId, input.bidderName);
    writeJsonFile(LOCAL_AUCTIONS_PATH, all);
    return {
      ok: true,
      listing: auction,
      antiSnipeTriggered: false,
      instantBuyout: true,
      refundedPrevBidderName,
    };
  }

  auction.currentBid = bidAmount;
  auction.highestBidderId = input.bidderId || 'guest';
  auction.highestBidderName = String(input.bidderName || 'PhumHero').slice(0, 24);
  auction.bidCount += 1;

  // Anti-Snipe Protection: any bid in final 60s extends timer by +60s!
  let antiSnipeTriggered = false;
  if (auction.endsAt - now <= ANTI_SNIPE_WINDOW_MS) {
    auction.endsAt += ANTI_SNIPE_EXTEND_MS;
    auction.antiSnipeExtensions += 1;
    antiSnipeTriggered = true;
  }

  writeJsonFile(LOCAL_AUCTIONS_PATH, all);
  return {
    ok: true,
    listing: auction,
    antiSnipeTriggered,
    instantBuyout: false,
    refundedPrevBidderName,
  };
}

export async function buyoutAuctionListing(input: {
  auctionId: string;
  buyerId: string;
  buyerName: string;
}): Promise<{ ok: true; listing: ServerAuctionListing; paidAmount: number } | { ok: false; error: string }> {
  settleExpiredAuctions();
  const all = readJsonFile<ServerAuctionListing[]>(LOCAL_AUCTIONS_PATH, buildStarterSeedAuctions);
  const auction = all.find((a) => a.id === input.auctionId);
  if (!auction || auction.status !== 'active') {
    return { ok: false, error: 'Auction is no longer available.' };
  }
  if (!auction.buyoutPrice) {
    return { ok: false, error: 'This auction does not have an Instant Buyout price.' };
  }
  if (
    auction.sellerId === input.buyerId &&
    auction.sellerName.toLowerCase() === input.buyerName.toLowerCase()
  ) {
    return { ok: false, error: 'You cannot buyout your own auction.' };
  }

  // Refund previous bidder if someone already bid
  if (auction.highestBidderId && auction.highestBidderName && auction.bidCount > 0) {
    const prevId = auction.highestBidderId;
    const prevName = auction.highestBidderName;
    const prevAmount = auction.currentBid;
    if (auction.currency === 'gold') await creditPlayerGold(prevId, prevAmount);
    else await creditPlayerCoins(prevId, prevAmount);

    pushPlayerMail({
      recipientKey: prevId && prevId !== 'guest' ? prevId : prevName,
      recipientName: prevName,
      kind: 'auction_outbid',
      title: `🔔 Outbid (Buyout) Refund: ${auction.itemName}`,
      body: `${input.buyerName} bought out ${auction.itemName}. Your escrowed bid (${prevAmount.toLocaleString()}) has been refunded!`,
      coins: auction.currency === 'coins' ? prevAmount : 0,
      gold: auction.currency === 'gold' ? prevAmount : 0,
      items: [],
    });
  }

  const paidAmount = auction.buyoutPrice;
  finalizeSoldAuction(auction, paidAmount, input.buyerId || 'guest', String(input.buyerName || 'PhumHero').slice(0, 24));
  writeJsonFile(LOCAL_AUCTIONS_PATH, all);
  return { ok: true, listing: auction, paidAmount };
}

let auctionSweeperTimer: NodeJS.Timeout | null = null;
export function startAuctionHouseSweeper(): void {
  if (auctionSweeperTimer) return;
  auctionSweeperTimer = setInterval(() => {
    try {
      settleExpiredAuctions();
    } catch {
      // ignore transient errors
    }
  }, 5000);
}
