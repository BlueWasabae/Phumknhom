import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ALLOWED_AREAS, PlazaRoom } from './rooms/PlazaRoom';
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

const PORT = Number(process.env.PORT ?? 2567);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = express();
app.use(cors({ origin: true, credentials: true }));
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

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define('plaza', PlazaRoom).filterBy(['areaId']);

httpServer.listen(PORT, HOST, () => {
  console.log(`[ភូមិខ្ញុំ Colyseus] Village Plaza Server listening on ws://${HOST}:${PORT}`);
  console.log(`[ភូមិខ្ញុំ Colyseus] Persistence backend: ${getStorageMode().toUpperCase()}`);
  console.log(`[ភូមិខ្ញុំ Colyseus] REST API ready: /api/areas, /api/auth/*, /api/save, /api/friends/*`);
});
