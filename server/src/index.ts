import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ALLOWED_AREAS, PlazaRoom, broadcastTukTukCartsUpdate } from './rooms/PlazaRoom';
import {
  DungeonRoom,
  listActiveDungeonFights,
  sendVillageCheerToDungeon,
} from './rooms/DungeonRoom';
import { ClubRoom } from './rooms/ClubRoom';
import {
  buyFromTukTukCart,
  closeTukTukCart,
  listTukTukCarts,
  openTukTukCart,
  type TukTukCartItemRecord,
} from './economy/tukTukCartService';
import {
  acceptBondRequest,
  createBondRequest,
  getBondStatusForPlayer,
  getSharedCoopFarm,
  syncSharedCoopFarm,
} from './economy/bondService';
import {
  createKrom,
  donateToKrom,
  getKromById,
  joinKrom,
  listKroms,
} from './economy/kromService';
import {
  buyMarketListing,
  cancelMarketListing,
  createMarketListing,
  listMarketListings,
} from './economy/marketService';
import { createReforgeAndBankRouter } from './economy/reforgeService';
import { createBankRouter } from './economy/bankService';
import { createPaymentRouter } from './economy/paymentWebhook';
import { presenceRegistry } from './presence';
import {
  createFriendRequest,
  getStorageMode,
  getTopTenLeaderboards,
  listFriends,
  loginPlayer,
  registerPlayer,
  respondFriendRequest,
  savePlayerProfile,
  syncGooglePlayer,
  verifyAuthToken,
  type SavedPlayerProfile,
} from './db/supabase';

const PORT = Number(process.env.PORT) || 2567;
const HOST = process.env.HOST ?? '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.bluexacedamy.space',
  'https://bluexacedamy.space',
];
const EXTRA_ORIGINS = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const ALLOWED_ORIGIN_SET = new Set([...DEFAULT_ALLOWED_ORIGINS, ...EXTRA_ORIGINS]);

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server health checks, curl, webhooks (no Origin header)
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/+$/, '');
      if (ALLOWED_ORIGIN_SET.has(normalized)) {
        callback(null, true);
        return;
      }
      // Allow local LAN mobile testing during non-production development
      if (!IS_PROD && /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:5173$/.test(normalized)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

function extractBearerToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.body?.token === 'string') {
    return req.body.token;
  }
  return undefined;
}

// Cloud Health Check Endpoint (Railway / Fly.io / Load Balancers)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'phum-khnhom-plaza',
    storageMode: getStorageMode(),
    port: PORT,
    timestamp: Date.now(),
  });
});

app.get('/api/areas', async (_req, res) => {
  try {
    const rooms = await matchMaker.query({ name: 'plaza' });
    const counts = new Map<string, number>();
    for (const areaId of ALLOWED_AREAS) {
      counts.set(areaId, 0);
    }

    for (const room of rooms) {
      const areaId = (room.metadata as { areaId?: string } | undefined)?.areaId ?? 'AREA 0';
      counts.set(areaId, (counts.get(areaId) ?? 0) + (room.clients ?? 0));
    }

    const areas = ALLOWED_AREAS.map((areaId, channel) => ({
      areaId,
      channel,
      players: counts.get(areaId) ?? 0,
      maxPlayers: 40,
    }));

    const totalPlayers = areas.reduce((sum, a) => sum + a.players, 0);
    res.json({ areas, totalPlayers, storageMode: getStorageMode() });
  } catch (err) {
    console.error('[Phum Server] /api/areas failed:', err);
    res.status(500).json({ error: 'Failed to query areas' });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const board = await getTopTenLeaderboards();
    res.json(board);
  } catch (err) {
    console.error('[Phum Server] /api/leaderboard failed:', err);
    res.status(500).json({ error: 'Failed to load Plaza TOP TEN leaderboard' });
  }
});

// ==================== PHASE 7 AUTH & CLOUD SAVE REST API ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, starterProfile } = req.body as {
      username?: string;
      password?: string;
      starterProfile?: SavedPlayerProfile;
    };
    const result = await registerPlayer(username, password, starterProfile);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (err) {
    console.error('[Phum Server] /api/auth/register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    const result = await loginPlayer(username, password);
    if (!result.ok) {
      res.status(401).json({ error: result.error });
      return;
    }
    res.json(result.data);
  } catch (err) {
    console.error('[Phum Server] /api/auth/login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/auth/google-sync', async (req, res) => {
  try {
    const { accessToken, starterProfile } = req.body as {
      accessToken?: string;
      starterProfile?: SavedPlayerProfile;
    };
    const token = accessToken || extractBearerToken(req);
    const result = await syncGooglePlayer(token, starterProfile);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  } catch (err) {
    console.error('[Phum Server] /api/auth/google-sync error:', err);
    res.status(500).json({ error: 'Google account sync failed.' });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const verified = verifyAuthToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Invalid or expired auth token.' });
      return;
    }
    const profile = req.body?.profile as SavedPlayerProfile | undefined;
    if (!profile || typeof profile !== 'object') {
      res.status(400).json({ error: 'Missing profile payload.' });
      return;
    }

    const result = await savePlayerProfile(verified.playerId, profile);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true, savedAt: result.savedAt, storageMode: getStorageMode() });
  } catch (err) {
    console.error('[Phum Server] /api/save error:', err);
    res.status(500).json({ error: 'Save failed.' });
  }
});

// ==================== PHASE 7 FRIENDS REST API ====================

app.get('/api/friends/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const data = await listFriends(playerId);

    const enrich = (item: (typeof data.accepted)[number]) => {
      const onlineRec =
        presenceRegistry.getByPlayerId(item.playerId) ??
        presenceRegistry.getByUsername(item.username);
      return {
        ...item,
        online: Boolean(onlineRec),
        areaId: onlineRec?.areaId ?? null,
      };
    };

    res.json({
      accepted: data.accepted.map(enrich),
      incoming: data.incoming.map(enrich),
      outgoing: data.outgoing.map(enrich),
    });
  } catch (err) {
    console.error('[Phum Server] GET /api/friends error:', err);
    res.status(500).json({ error: 'Failed to load friends list.' });
  }
});

app.post('/api/friends/request', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const verified = verifyAuthToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Sign in with an account to add friends.' });
      return;
    }
    const { targetPlayerId, targetUsername } = req.body as {
      targetPlayerId?: string;
      targetUsername?: string;
    };
    const result = await createFriendRequest(verified.playerId, { targetPlayerId, targetUsername });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Push live Colyseus notification if target player is currently online in any Area!
    presenceRegistry.sendToTarget(
      { playerId: result.targetPlayerId, username: result.targetUsername },
      'friendRequest',
      {
        friendshipId: result.friendshipId,
        fromPlayerId: verified.playerId,
        fromName: verified.username,
        status: result.status,
        timestamp: Date.now(),
      }
    );

    res.json(result);
  } catch (err) {
    console.error('[Phum Server] POST /api/friends/request error:', err);
    res.status(500).json({ error: 'Failed to send friend request.' });
  }
});

app.post('/api/friends/accept', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const verified = verifyAuthToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Sign in required.' });
      return;
    }
    const { friendshipId } = req.body as { friendshipId?: string };
    if (!friendshipId) {
      res.status(400).json({ error: 'Missing friendshipId.' });
      return;
    }
    const result = await respondFriendRequest(verified.playerId, friendshipId, 'accept');
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    presenceRegistry.sendToTarget(
      { playerId: result.requesterId },
      'socialNotice',
      { text: `🎉 ${verified.username} accepted your Friend Request!` }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Phum Server] POST /api/friends/accept error:', err);
    res.status(500).json({ error: 'Failed to accept friend request.' });
  }
});

app.post('/api/friends/decline', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const verified = verifyAuthToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Sign in required.' });
      return;
    }
    const { friendshipId } = req.body as { friendshipId?: string };
    if (!friendshipId) {
      res.status(400).json({ error: 'Missing friendshipId.' });
      return;
    }
    const result = await respondFriendRequest(verified.playerId, friendshipId, 'decline');
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[Phum Server] POST /api/friends/decline error:', err);
    res.status(500).json({ error: 'Failed to decline friend request.' });
  }
});

// ==================== PHASE 8 PLAYER MARKET (5% COIN TAX SINK) ====================

app.get('/api/market', async (_req, res) => {
  try {
    const listings = await listMarketListings();
    res.json({ listings, taxRate: 0.05 });
  } catch (err) {
    console.error('[Phum Server] GET /api/market error:', err);
    res.status(500).json({ error: 'Failed to load market listings.' });
  }
});

app.post('/api/market/list', async (req, res) => {
  try {
    const verified = verifyAuthToken(extractBearerToken(req));
    const body = req.body as {
      sellerName?: string;
      itemId?: string;
      itemName?: string;
      quantity?: number;
      quality?: 'normal' | 'gold_star';
      priceCoins?: number;
    };
    const sellerId = verified?.playerId ?? 'guest';
    const sellerName = verified?.username ?? (body.sellerName || 'GuestVillager');

    const result = await createMarketListing({
      sellerId,
      sellerName,
      itemId: body.itemId || '',
      itemName: body.itemName || '',
      quantity: Number(body.quantity ?? 1),
      quality: body.quality === 'gold_star' ? 'gold_star' : 'normal',
      priceCoins: Number(body.priceCoins ?? 50),
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  } catch (err) {
    console.error('[Phum Server] POST /api/market/list error:', err);
    res.status(500).json({ error: 'Failed to create market listing.' });
  }
});

app.post('/api/market/buy', async (req, res) => {
  try {
    const verified = verifyAuthToken(extractBearerToken(req));
    const { listingId, buyerName } = req.body as { listingId?: string; buyerName?: string };
    if (!listingId) {
      res.status(400).json({ error: 'Missing listingId.' });
      return;
    }
    const result = await buyMarketListing(
      listingId,
      verified?.playerId ?? 'guest',
      verified?.username ?? (buyerName || 'Villager')
    );
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('[Phum Server] POST /api/market/buy error:', err);
    res.status(500).json({ error: 'Failed to purchase listing.' });
  }
});

app.post('/api/market/cancel', async (req, res) => {
  try {
    const verified = verifyAuthToken(extractBearerToken(req));
    const { listingId } = req.body as { listingId?: string };
    if (!listingId) {
      res.status(400).json({ error: 'Missing listingId.' });
      return;
    }
    const result = await cancelMarketListing(listingId, verified?.playerId ?? 'guest');
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('[Phum Server] POST /api/market/cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel listing.' });
  }
});

// ==================== PHASE 10 PAYMENTS & EXPANSION REFORGE / BANK / TICKER ====================
app.use('/api/payments', createPaymentRouter());
app.use('/api/bank', createBankRouter());
app.use('/api', createReforgeAndBankRouter());

// ==================== UPDATE 1.5 KROM (GUILD) & VILLAGE CHEER REST API ====================
app.get('/api/kroms', (_req, res) => {
  res.json({ kroms: listKroms() });
});

app.get('/api/krom/:id', (req, res) => {
  const krom = getKromById(req.params.id);
  if (!krom) {
    res.status(404).json({ error: 'Krom guild not found.' });
    return;
  }
  res.json({ krom });
});

app.post('/api/krom/create', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as { name?: string; tag?: string; username?: string };
  const result = createKrom({
    name: body.name,
    tag: body.tag,
    playerId: verified?.playerId ?? `guest_${Date.now()}`,
    username: verified?.username ?? body.username ?? 'PhumHero',
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(201).json(result);
});

app.post('/api/krom/join', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as { kromId?: string; tag?: string; username?: string };
  const result = joinKrom({
    kromId: body.kromId,
    tag: body.tag,
    playerId: verified?.playerId ?? `guest_${Date.now()}`,
    username: verified?.username ?? body.username ?? 'PhumHero',
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

app.post('/api/krom/donate', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as {
    kromId?: string;
    username?: string;
    coins?: number;
    cropValue?: number;
  };
  if (!body.kromId) {
    res.status(400).json({ error: 'Missing kromId.' });
    return;
  }
  const result = donateToKrom({
    kromId: body.kromId,
    playerId: verified?.playerId ?? `guest_${Date.now()}`,
    username: verified?.username ?? body.username ?? 'PhumHero',
    coins: Number(body.coins ?? 0),
    cropValue: Number(body.cropValue ?? 0),
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

app.get('/api/dungeon/active', (_req, res) => {
  res.json({ fights: listActiveDungeonFights() });
});

app.post('/api/dungeon/cheer', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as { roomId?: string; senderName?: string };
  const sender = verified?.username ?? (body.senderName || 'Kind Villager');
  if (!body.roomId) {
    res.status(400).json({ error: 'Missing roomId.' });
    return;
  }
  const result = sendVillageCheerToDungeon(body.roomId, sender);
  res.json({ ok: true, ...result, senderName: sender });
});

// ==================== UPDATE 1.6 PLAYER-RUN TUK-TUK FOOD CARTS ====================

app.get('/api/cart/list', (req, res) => {
  const mapId = typeof req.query.mapId === 'string' ? req.query.mapId : undefined;
  res.json({ carts: listTukTukCarts(mapId) });
});

app.post('/api/cart/open', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as {
    ownerName?: string;
    ownerKromTag?: string;
    mapId?: 'central_plaza' | 'temple_district';
    signTitle?: string;
    items?: TukTukCartItemRecord[];
  };
  const result = openTukTukCart({
    ownerId: verified?.playerId ?? 'guest',
    ownerName: verified?.username ?? body.ownerName ?? 'PhumHero',
    ownerKromTag: body.ownerKromTag,
    mapId: body.mapId === 'central_plaza' ? 'central_plaza' : 'temple_district',
    signTitle: body.signTitle,
    items: body.items ?? [],
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  broadcastTukTukCartsUpdate(result.carts);
  res.status(201).json(result);
});

app.post('/api/cart/buy', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as {
    cartId?: string;
    itemId?: string;
    quantity?: number;
    buyerName?: string;
  };
  if (!body.cartId || !body.itemId) {
    res.status(400).json({ error: 'Missing cartId or itemId.' });
    return;
  }
  const buyerName = verified?.username ?? body.buyerName ?? 'Villager';
  const result = buyFromTukTukCart({
    cartId: body.cartId,
    itemId: body.itemId,
    quantity: body.quantity ?? 1,
    buyerId: verified?.playerId ?? 'guest',
    buyerName,
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  broadcastTukTukCartsUpdate(result.carts);
  if (result.cart && !result.cart.isDemo && result.purchasedItem) {
    presenceRegistry.sendToTarget(
      { playerId: result.cart.ownerId, username: result.cart.ownerName },
      'cartSaleNotice',
      {
        buyerName,
        itemName: result.purchasedItem.name,
        quantity: result.quantityBought ?? 1,
        revenueCoins: result.totalPrice ?? 0,
        cookingXp: result.chefCookingXp ?? 18,
      }
    );
  }
  res.json(result);
});

app.post('/api/cart/close', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as { cartId?: string; ownerName?: string };
  const result = closeTukTukCart({
    cartId: body.cartId,
    ownerId: verified?.playerId ?? 'guest',
    ownerName: verified?.username ?? body.ownerName ?? 'PhumHero',
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  broadcastTukTukCartsUpdate(result.carts);
  res.json(result);
});

// ==================== UPDATE 1.7 BEST-FRIEND / COUPLE BOND RING & CO-OP FARM ====================

app.get('/api/bond/status', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const playerId = verified?.playerId ?? String(req.query.playerId || 'guest');
  const username = verified?.username ?? String(req.query.username || 'PhumHero');
  res.json(getBondStatusForPlayer(playerId, username));
});

app.post('/api/bond/request', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as {
    requesterName?: string;
    targetId?: string;
    targetName?: string;
    instantAcceptDemo?: boolean;
  };
  const requesterId = verified?.playerId ?? 'guest';
  const requesterName = verified?.username ?? body.requesterName ?? 'PhumHero';
  const result = createBondRequest({
    requesterId,
    requesterName,
    targetId: body.targetId,
    targetName: body.targetName ?? '',
    instantAcceptDemo: Boolean(body.instantAcceptDemo),
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  if (result.bond && !body.instantAcceptDemo) {
    presenceRegistry.sendToTarget(
      { playerId: result.bond.targetId, username: result.bond.targetName },
      'socialNotice',
      { text: `💍 ${requesterName} offered you a Lotus Bond Ring! Open MENU → Bond Ring to accept!` }
    );
  }
  res.status(201).json(result);
});

app.post('/api/bond/accept', (req, res) => {
  const verified = verifyAuthToken(extractBearerToken(req));
  const body = (req.body ?? {}) as { bondId?: string; accepterName?: string };
  if (!body.bondId) {
    res.status(400).json({ error: 'Missing bondId.' });
    return;
  }
  const accepterId = verified?.playerId ?? 'guest';
  const accepterName = verified?.username ?? body.accepterName ?? 'PhumHero';
  const result = acceptBondRequest({
    bondId: body.bondId,
    accepterId,
    accepterName,
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  if (result.bond) {
    presenceRegistry.sendToTarget(
      { playerId: result.bond.requesterId, username: result.bond.requesterName },
      'socialNotice',
      { text: `💖 ${accepterName} accepted your Lotus Bond Ring! Pink Lotus Aura & Co-op Farm unlocked!` }
    );
  }
  res.json(result);
});

app.get('/api/bond/farm/:bondId', (req, res) => {
  res.json({ sharedFarm: getSharedCoopFarm(req.params.bondId) });
});

app.post('/api/bond/farm/sync', (req, res) => {
  const body = (req.body ?? {}) as { bondId?: string; farm?: unknown };
  if (!body.bondId || !body.farm) {
    res.status(400).json({ error: 'Missing bondId or farm.' });
    return;
  }
  res.json(syncSharedCoopFarm(body.bondId, body.farm));
});

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define('plaza', PlazaRoom).filterBy(['areaId']);
gameServer.define('dungeon', DungeonRoom).filterBy(['partyId']);
gameServer.define('club', ClubRoom).filterBy(['cityServer']);

httpServer.listen(PORT, HOST, () => {
  console.log(`[ភូមិខ្ញុំ Colyseus] Village Plaza + Co-op Dungeon Server listening on ws://${HOST}:${PORT}`);
  console.log(`[ភូមិខ្ញុំ Colyseus] Persistence backend: ${getStorageMode().toUpperCase()}`);
  console.log(`[ភូមិខ្ញុំ Colyseus] REST API ready: /health, /api/areas, /api/auth/*, /api/save, /api/friends/*, /api/market/*, /api/payments/*`);
});
