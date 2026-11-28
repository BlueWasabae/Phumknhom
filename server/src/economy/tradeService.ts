import crypto from 'crypto';
import { executeAtomicTradeInDb } from '../db/supabase';

export const MAX_P2P_TRADE_RANGE_PX = 150;
export const MAX_P2P_TRADE_SLOTS = 6;
export const TRADE_CONFIRM_DELAY_MS = 3000;

export interface ServerTradeSlotItem {
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: 'normal' | 'gold_star';
  itemLevel?: number;
  rarity: string;
  dropRatePct?: number;
}

export interface ServerTradeOfferSide {
  sessionId: string;
  playerId: string;
  name: string;
  items: ServerTradeSlotItem[];
  coins: number;
  locked: boolean;
  confirmed: boolean;
  verifiedInventory?: Array<{ itemId: string; quantity: number; quality?: string }>;
  verifiedCoins?: number;
}

export interface ServerTradeSession {
  tradeId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  sideA: ServerTradeOfferSide;
  sideB: ServerTradeOfferSide;
  bothLockedAt: number | null;
  warningText: string | null;
  updatedAt: number;
}

export interface TradeReceiptPair {
  tradeId: string;
  forA: {
    tradeId: string;
    partnerName: string;
    gaveItems: ServerTradeSlotItem[];
    receivedItems: ServerTradeSlotItem[];
    gaveCoins: number;
    receivedCoins: number;
    taxCoins: 0;
    timestamp: number;
  };
  forB: {
    tradeId: string;
    partnerName: string;
    gaveItems: ServerTradeSlotItem[];
    receivedItems: ServerTradeSlotItem[];
    gaveCoins: number;
    receivedCoins: number;
    taxCoins: 0;
    timestamp: number;
  };
}

class LiveTradeService {
  private sessions = new Map<string, ServerTradeSession>();
  private sessionToTrade = new Map<string, string>();

  public toPublicSnapshot(sess: ServerTradeSession) {
    const cleanSide = (s: ServerTradeOfferSide) => ({
      sessionId: s.sessionId,
      playerId: s.playerId,
      name: s.name,
      items: s.items,
      coins: s.coins,
      locked: s.locked,
      confirmed: s.confirmed,
    });
    return {
      tradeId: sess.tradeId,
      status: sess.status,
      sideA: cleanSide(sess.sideA),
      sideB: cleanSide(sess.sideB),
      bothLockedAt: sess.bothLockedAt,
      warningText: sess.warningText,
      updatedAt: sess.updatedAt,
    };
  }

  public getSession(tradeId: string): ServerTradeSession | undefined {
    return this.sessions.get(tradeId);
  }

  public getSessionForClient(sessionId: string): ServerTradeSession | undefined {
    const tid = this.sessionToTrade.get(sessionId);
    return tid ? this.sessions.get(tid) : undefined;
  }

  public createRequest(
    requester: { sessionId: string; playerId: string; name: string; x: number; y: number },
    target: { sessionId: string; playerId: string; name: string; x: number; y: number },
    enforceDistance = true
  ): { ok: true; session: ServerTradeSession } | { ok: false; error: string } {
    if (requester.sessionId === target.sessionId) {
      return { ok: false, error: 'Cannot trade with yourself.' };
    }
    if (enforceDistance) {
      const dist = Math.hypot(requester.x - target.x, requester.y - target.y);
      if (dist > MAX_P2P_TRADE_RANGE_PX) {
        return {
          ok: false,
          error: `Move closer to ${target.name} to trade (must be within ${MAX_P2P_TRADE_RANGE_PX}px).`,
        };
      }
    }
    if (this.sessionToTrade.has(requester.sessionId)) {
      return { ok: false, error: 'Finish or cancel your current trade first.' };
    }
    if (this.sessionToTrade.has(target.sessionId)) {
      return { ok: false, error: `${target.name} is already busy in another trade.` };
    }

    const tradeId = `tr_${crypto.randomBytes(6).toString('hex')}`;
    const session: ServerTradeSession = {
      tradeId,
      status: 'pending',
      sideA: {
        sessionId: requester.sessionId,
        playerId: requester.playerId,
        name: requester.name,
        items: [],
        coins: 0,
        locked: false,
        confirmed: false,
      },
      sideB: {
        sessionId: target.sessionId,
        playerId: target.playerId,
        name: target.name,
        items: [],
        coins: 0,
        locked: false,
        confirmed: false,
      },
      bothLockedAt: null,
      warningText: null,
      updatedAt: Date.now(),
    };
    this.sessions.set(tradeId, session);
    this.sessionToTrade.set(requester.sessionId, tradeId);
    this.sessionToTrade.set(target.sessionId, tradeId);
    return { ok: true, session };
  }

  public acceptRequest(
    tradeId: string,
    accepterSessionId: string
  ): { ok: true; session: ServerTradeSession } | { ok: false; error: string } {
    const sess = this.sessions.get(tradeId);
    if (!sess || sess.status !== 'pending') {
      return { ok: false, error: 'Trade request expired or cancelled.' };
    }
    if (sess.sideB.sessionId !== accepterSessionId) {
      return { ok: false, error: 'Only the invited player can accept this trade.' };
    }
    sess.status = 'active';
    sess.warningText = null;
    sess.updatedAt = Date.now();
    return { ok: true, session: sess };
  }

  public updateOffer(
    tradeId: string,
    sessionId: string,
    payload: {
      items?: ServerTradeSlotItem[];
      coins?: number;
      walletCoins?: number;
      inventorySnapshot?: Array<{ itemId: string; quantity: number; quality?: string }>;
    }
  ): { ok: true; session: ServerTradeSession; resetLocks: boolean } | { ok: false; error: string } {
    const sess = this.sessions.get(tradeId);
    if (!sess || sess.status !== 'active') {
      return { ok: false, error: 'Trade window is not active.' };
    }
    const side =
      sess.sideA.sessionId === sessionId
        ? sess.sideA
        : sess.sideB.sessionId === sessionId
          ? sess.sideB
          : null;
    if (!side) return { ok: false, error: 'Not a participant in this trade.' };

    const safeItems: ServerTradeSlotItem[] = Array.isArray(payload.items)
      ? payload.items
          .filter((it) => it && typeof it.itemId === 'string' && it.itemId.length > 0 && Number(it.quantity) > 0)
          .slice(0, MAX_P2P_TRADE_SLOTS)
          .map((it) => ({
            itemId: it.itemId.slice(0, 64),
            itemName: String(it.itemName || it.itemId).slice(0, 64),
            quantity: Math.max(1, Math.min(999, Math.floor(Number(it.quantity)))),
            quality: it.quality === 'gold_star' ? 'gold_star' : 'normal',
            itemLevel: typeof it.itemLevel === 'number' ? Math.max(1, Math.floor(it.itemLevel)) : 1,
            rarity: String(it.rarity || 'common'),
            dropRatePct: typeof it.dropRatePct === 'number' ? it.dropRatePct : undefined,
          }))
      : side.items;

    const safeCoins =
      typeof payload.coins === 'number' && Number.isFinite(payload.coins)
        ? Math.max(0, Math.min(100_000_000, Math.floor(payload.coins)))
        : side.coins;

    const wasAnyLocked = sess.sideA.locked || sess.sideB.locked;
    side.items = safeItems;
    side.coins = safeCoins;
    if (typeof payload.walletCoins === 'number' && Number.isFinite(payload.walletCoins)) {
      side.verifiedCoins = Math.max(0, Math.floor(payload.walletCoins));
    }
    if (Array.isArray(payload.inventorySnapshot)) {
      side.verifiedInventory = payload.inventorySnapshot.map((i) => ({
        itemId: String(i.itemId),
        quantity: Math.max(0, Math.floor(Number(i.quantity ?? 0))),
        quality: i.quality === 'gold_star' ? 'gold_star' : 'normal',
      }));
    }

    let resetLocks = false;
    if (wasAnyLocked) {
      sess.sideA.locked = false;
      sess.sideB.locked = false;
      sess.sideA.confirmed = false;
      sess.sideB.confirmed = false;
      sess.bothLockedAt = null;
      sess.warningText = 'Offer changed — please re-verify!';
      resetLocks = true;
    }
    sess.updatedAt = Date.now();
    return { ok: true, session: sess, resetLocks };
  }

  public toggleLock(
    tradeId: string,
    sessionId: string,
    snapshot?: {
      walletCoins?: number;
      inventorySnapshot?: Array<{ itemId: string; quantity: number; quality?: string }>;
    }
  ): { ok: true; session: ServerTradeSession } | { ok: false; error: string } {
    const sess = this.sessions.get(tradeId);
    if (!sess || sess.status !== 'active') {
      return { ok: false, error: 'Trade is not active.' };
    }
    const side =
      sess.sideA.sessionId === sessionId
        ? sess.sideA
        : sess.sideB.sessionId === sessionId
          ? sess.sideB
          : null;
    if (!side) return { ok: false, error: 'Not a participant in this trade.' };

    if (snapshot) {
      if (typeof snapshot.walletCoins === 'number' && Number.isFinite(snapshot.walletCoins)) {
        side.verifiedCoins = Math.max(0, Math.floor(snapshot.walletCoins));
      }
      if (Array.isArray(snapshot.inventorySnapshot)) {
        side.verifiedInventory = snapshot.inventorySnapshot.map((i) => ({
          itemId: String(i.itemId),
          quantity: Math.max(0, Math.floor(Number(i.quantity ?? 0))),
          quality: i.quality === 'gold_star' ? 'gold_star' : 'normal',
        }));
      }
    }

    side.locked = !side.locked;
    if (!side.locked) {
      sess.sideA.confirmed = false;
      sess.sideB.confirmed = false;
      sess.bothLockedAt = null;
      sess.warningText = `${side.name} unlocked their offer — review before locking.`;
    } else {
      sess.warningText = null;
      if (sess.sideA.locked && sess.sideB.locked) {
        sess.bothLockedAt = Date.now();
      }
    }
    sess.updatedAt = Date.now();
    return { ok: true, session: sess };
  }

  private validateSideAgainstSnapshot(side: ServerTradeOfferSide): string | null {
    if (typeof side.verifiedCoins === 'number' && side.coins > side.verifiedCoins) {
      return `${side.name} does not have ${side.coins.toLocaleString()} Coins.`;
    }
    if (Array.isArray(side.verifiedInventory)) {
      const counts = new Map<string, number>();
      for (const it of side.verifiedInventory) {
        const key = `${it.itemId}::${it.quality === 'gold_star' ? 'gold_star' : 'normal'}`;
        counts.set(key, (counts.get(key) ?? 0) + it.quantity);
      }
      for (const offer of side.items) {
        const key = `${offer.itemId}::${offer.quality === 'gold_star' ? 'gold_star' : 'normal'}`;
        const have = counts.get(key) ?? 0;
        if (have < offer.quantity) {
          return `${side.name} no longer owns ${offer.quantity}× ${offer.itemName}.`;
        }
        counts.set(key, have - offer.quantity);
      }
    }
    return null;
  }

  public async confirmTrade(
    tradeId: string,
    sessionId: string
  ): Promise<
    | { ok: true; session: ServerTradeSession; completed: boolean; receipts?: TradeReceiptPair }
    | { ok: false; error: string }
  > {
    const sess = this.sessions.get(tradeId);
    if (!sess || sess.status !== 'active') {
      return { ok: false, error: 'Trade is not active.' };
    }
    if (!sess.sideA.locked || !sess.sideB.locked || !sess.bothLockedAt) {
      return { ok: false, error: 'Both traders must Lock Offer before confirming!' };
    }
    const elapsed = Date.now() - sess.bothLockedAt;
    if (elapsed < TRADE_CONFIRM_DELAY_MS - 150) {
      const rem = Math.ceil((TRADE_CONFIRM_DELAY_MS - elapsed) / 1000);
      return { ok: false, error: `Safety countdown active — wait ${rem}s before confirming.` };
    }

    const side =
      sess.sideA.sessionId === sessionId
        ? sess.sideA
        : sess.sideB.sessionId === sessionId
          ? sess.sideB
          : null;
    if (!side) return { ok: false, error: 'Not a participant in this trade.' };

    side.confirmed = true;
    sess.updatedAt = Date.now();

    if (!sess.sideA.confirmed || !sess.sideB.confirmed) {
      return { ok: true, session: sess, completed: false };
    }

    // Verify both sides' live snapshots before atomic DB swap
    const errA = this.validateSideAgainstSnapshot(sess.sideA);
    if (errA) return { ok: false, error: errA };
    const errB = this.validateSideAgainstSnapshot(sess.sideB);
    if (errB) return { ok: false, error: errB };

    const dbSwap = await executeAtomicTradeInDb(
      {
        playerId: sess.sideA.playerId,
        giveCoins: sess.sideA.coins,
        receiveCoins: sess.sideB.coins,
        giveItems: sess.sideA.items,
        receiveItems: sess.sideB.items,
      },
      {
        playerId: sess.sideB.playerId,
        giveCoins: sess.sideB.coins,
        receiveCoins: sess.sideA.coins,
        giveItems: sess.sideB.items,
        receiveItems: sess.sideA.items,
      }
    );
    if (!dbSwap.ok) {
      sess.sideA.confirmed = false;
      sess.sideB.confirmed = false;
      return { ok: false, error: dbSwap.error };
    }

    sess.status = 'completed';
    sess.updatedAt = Date.now();
    this.cleanup(sess);

    const now = Date.now();
    const receipts: TradeReceiptPair = {
      tradeId: sess.tradeId,
      forA: {
        tradeId: sess.tradeId,
        partnerName: sess.sideB.name,
        gaveItems: sess.sideA.items,
        receivedItems: sess.sideB.items,
        gaveCoins: sess.sideA.coins,
        receivedCoins: sess.sideB.coins,
        taxCoins: 0,
        timestamp: now,
      },
      forB: {
        tradeId: sess.tradeId,
        partnerName: sess.sideA.name,
        gaveItems: sess.sideB.items,
        receivedItems: sess.sideA.items,
        gaveCoins: sess.sideB.coins,
        receivedCoins: sess.sideA.coins,
        taxCoins: 0,
        timestamp: now,
      },
    };
    return { ok: true, session: sess, completed: true, receipts };
  }

  public cancelTrade(
    tradeId: string,
    bySessionId?: string
  ): { ok: true; session: ServerTradeSession } | { ok: false; error: string } {
    const sess = this.sessions.get(tradeId);
    if (!sess) return { ok: false, error: 'Trade not found.' };
    if (bySessionId && sess.sideA.sessionId !== bySessionId && sess.sideB.sessionId !== bySessionId) {
      return { ok: false, error: 'Not a participant.' };
    }
    sess.status = 'cancelled';
    sess.updatedAt = Date.now();
    this.cleanup(sess);
    return { ok: true, session: sess };
  }

  public handleDisconnect(sessionId: string): ServerTradeSession | null {
    const sess = this.getSessionForClient(sessionId);
    if (!sess) return null;
    sess.status = 'cancelled';
    sess.updatedAt = Date.now();
    this.cleanup(sess);
    return sess;
  }

  private cleanup(sess: ServerTradeSession): void {
    this.sessions.delete(sess.tradeId);
    if (this.sessionToTrade.get(sess.sideA.sessionId) === sess.tradeId) {
      this.sessionToTrade.delete(sess.sideA.sessionId);
    }
    if (this.sessionToTrade.get(sess.sideB.sessionId) === sess.tradeId) {
      this.sessionToTrade.delete(sess.sideB.sessionId);
    }
  }
}

export const tradeService = new LiveTradeService();
