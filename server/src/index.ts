import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ALLOWED_AREAS, PlazaRoom } from './rooms/PlazaRoom';
import { DungeonRoom } from './rooms/DungeonRoom';
import {
  buyMarketListing,
  cancelMarketListing,
  createMarketListing,
  listMarketListings,
} from './economy/marketService';
import { createPaymentRouter } from './economy/paymentWebhook';
import { presenceRegistry } from './presence';
import {
  createFriendRequest,
  getStorageMode,
  listFriends,
  loginPlayer,
  registerPlayer,
  respondFriendRequest,
  savePlayerProfile,
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

// ==================== PHASE 10 PAYMENTS & DIAMOND STORE WEBHOOKS ====================
app.use('/api/payments', createPaymentRouter());

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define('plaza', PlazaRoom).filterBy(['areaId']);
gameServer.define('dungeon', DungeonRoom).filterBy(['partyId']);

httpServer.listen(PORT, HOST, () => {
  console.log(`[ភូមិខ្ញុំ Colyseus] Village Plaza + Co-op Dungeon Server listening on ws://${HOST}:${PORT}`);
  console.log(`[ភូមិខ្ញុំ Colyseus] Persistence backend: ${getStorageMode().toUpperCase()}`);
  console.log(`[ភូមិខ្ញុំ Colyseus] REST API ready: /health, /api/areas, /api/auth/*, /api/save, /api/friends/*, /api/market/*, /api/payments/*`);
});
