import { Client, Room } from 'colyseus';
import { PlazaState, RemotePlayer } from '../schema/PlazaState';

export const ALLOWED_AREAS = ['AREA 0', 'AREA 1', 'AREA 2'] as const;
export type AreaId = (typeof ALLOWED_AREAS)[number];

const ALLOWED_FACINGS = new Set(['down', 'up', 'left', 'right']);
const MAP_MIN_X = 20;
const MAP_MAX_X = 940;
const MAP_MIN_Y = 86;
const MAP_MAX_Y = 656;
const CHAT_COOLDOWN_MS = 650;
const EMOTE_COOLDOWN_MS = 500;

export function normalizeAreaId(raw: unknown): AreaId {
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toUpperCase();
    if ((ALLOWED_AREAS as readonly string[]).includes(trimmed)) {
      return trimmed as AreaId;
    }
  }
  return 'AREA 0';
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const clean = raw.replace(/\s+/g, ' ').trim().slice(0, 20);
  return clean.length > 0 ? clean : fallback;
}

function sanitizeAppearance(raw: unknown): string {
  if (typeof raw !== 'string') return '{}';
  if (raw.length > 2048) return '{}';
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    return '{}';
  }
}

export class PlazaRoom extends Room<PlazaState> {
  maxClients = 40;
  private lastChatAt = new Map<string, number>();
  private lastEmoteAt = new Map<string, number>();

  onCreate(options: { areaId?: string }): void {
    const areaId = normalizeAreaId(options?.areaId);
    const state = new PlazaState();
    state.areaId = areaId;
    this.setState(state);
    this.setMetadata({ areaId });

    this.onMessage('move', (client, payload: { x?: number; y?: number; facing?: string; isMoving?: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !payload || typeof payload !== 'object') return;

      if (typeof payload.x === 'number') {
        player.x = Math.round(clamp(payload.x, MAP_MIN_X, MAP_MAX_X) * 10) / 10;
      }
      if (typeof payload.y === 'number') {
        player.y = Math.round(clamp(payload.y, MAP_MIN_Y, MAP_MAX_Y) * 10) / 10;
      }
      if (typeof payload.facing === 'string' && ALLOWED_FACINGS.has(payload.facing)) {
        player.facing = payload.facing;
      }
      if (typeof payload.isMoving === 'boolean') {
        player.isMoving = payload.isMoving;
      }
    });

    this.onMessage('updateAppearance', (client, payload: { appearanceJson?: string; name?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !payload || typeof payload !== 'object') return;

      if (typeof payload.appearanceJson === 'string') {
        player.appearanceJson = sanitizeAppearance(payload.appearanceJson);
      }
      if (typeof payload.name === 'string') {
        player.name = sanitizeName(payload.name, player.name);
      }
    });

    this.onMessage('chat', (client, payload: { text?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof payload?.text !== 'string') return;

      const now = Date.now();
      const prev = this.lastChatAt.get(client.sessionId) ?? 0;
      if (now - prev < CHAT_COOLDOWN_MS) return;

      const text = payload.text.replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) return;

      this.lastChatAt.set(client.sessionId, now);
      this.broadcast('chat', {
        sessionId: client.sessionId,
        name: player.name,
        text,
        timestamp: now,
      });
    });

    this.onMessage('emote', (client, payload: { emoji?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof payload?.emoji !== 'string') return;

      const now = Date.now();
      const prev = this.lastEmoteAt.get(client.sessionId) ?? 0;
      if (now - prev < EMOTE_COOLDOWN_MS) return;

      const emoji = payload.emoji.trim().slice(0, 8);
      if (!emoji) return;

      this.lastEmoteAt.set(client.sessionId, now);
      this.broadcast('emote', {
        sessionId: client.sessionId,
        emoji,
      });
    });
  }

  onJoin(
    client: Client,
    options?: {
      name?: string;
      x?: number;
      y?: number;
      facing?: string;
      appearanceJson?: string;
      areaId?: string;
    }
  ): void {
    const player = new RemotePlayer();
    player.sessionId = client.sessionId;
    player.name = sanitizeName(options?.name, `Villager_${client.sessionId.slice(0, 4)}`);
    player.x = clamp(typeof options?.x === 'number' ? options.x : 480, MAP_MIN_X, MAP_MAX_X);
    player.y = clamp(typeof options?.y === 'number' ? options.y : 405, MAP_MIN_Y, MAP_MAX_Y);
    player.facing =
      typeof options?.facing === 'string' && ALLOWED_FACINGS.has(options.facing)
        ? options.facing
        : 'down';
    player.isMoving = false;
    player.appearanceJson = sanitizeAppearance(options?.appearanceJson);
    player.areaId = this.state.areaId;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
    this.lastEmoteAt.delete(client.sessionId);
  }
}
