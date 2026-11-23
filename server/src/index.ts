import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ALLOWED_AREAS, PlazaRoom } from './rooms/PlazaRoom';

const PORT = Number(process.env.PORT ?? 2567);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'phum-khnhom-plaza',
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
    res.json({ areas, totalPlayers });
  } catch (err) {
    console.error('[Phum Server] /api/areas failed:', err);
    res.status(500).json({ error: 'Failed to query areas' });
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
  console.log(`[ភូមិខ្ញុំ Colyseus] Areas REST endpoint: http://localhost:${PORT}/api/areas`);
});
