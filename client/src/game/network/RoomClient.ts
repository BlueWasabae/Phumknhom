import { Client, type Room } from 'colyseus.js';
import { DEFAULT_LOADOUT, type EquippedLoadout } from '@shared/types';
import { EventBus } from '../EventBus';

export interface RemotePlayerSnapshot {
  sessionId: string;
  playerId: string;
  name: string;
  level: number;
  stylish: number;
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  appearanceJson: string;
  areaId: string;
}

export interface AreaChannelInfo {
  areaId: string;
  channel: number;
  players: number;
  maxPlayers: number;
}

export interface PlazaRoomHandlers {
  onRemoteAdd: (player: RemotePlayerSnapshot) => void;
  onRemoteChange: (player: RemotePlayerSnapshot) => void;
  onRemoteRemove: (sessionId: string) => void;
  onChat: (msg: { sessionId: string; name: string; text: string; timestamp: number }) => void;
  onEmote: (msg: { sessionId: string; emoji: string }) => void;
}

interface RawRemotePlayerSchema {
  sessionId: string;
  playerId: string;
  name: string;
  level: number;
  stylish: number;
  x: number;
  y: number;
  facing: string;
  isMoving: boolean;
  appearanceJson: string;
  areaId: string;
  onChange?: (cb: () => void) => void;
}

interface RawPlazaStateSchema {
  areaId: string;
  players: {
    size: number;
    forEach: (cb: (val: RawRemotePlayerSchema, key: string) => void) => void;
    onAdd: (cb: (val: RawRemotePlayerSchema, key: string) => void, triggerImmediately?: boolean) => void;
    onRemove: (cb: (val: RawRemotePlayerSchema, key: string) => void) => void;
  };
}

export function serializeAppearance(loadout: EquippedLoadout): string {
  return JSON.stringify({
    skinColor: loadout.skinColor,
    eyeStyle: loadout.eyeStyle,
    hairStyle: loadout.hairStyle,
    hairColor: loadout.hairColor,
    hat: loadout.hat,
    hair: loadout.hair,
    shirt: loadout.shirt,
    pants: loadout.pants,
    wings: loadout.wings,
    pet: loadout.pet,
    weapon: loadout.weapon,
    armor: loadout.armor,
  });
}

export function parseAppearance(json: string): EquippedLoadout {
  try {
    const parsed = JSON.parse(json) as Partial<EquippedLoadout>;
    return {
      ...DEFAULT_LOADOUT,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_LOADOUT };
  }
}

export function areaIdToChannel(areaId: string): number {
  const m = /(\d+)/.exec(areaId);
  return m ? Number(m[1]) : 0;
}

export function channelToAreaId(channel: number): string {
  const safe = Math.max(0, Math.min(2, Math.floor(channel)));
  return `AREA ${safe}`;
}

function getServerEndpoints(): { wsUrl: string; httpUrl: string } {
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsProto = isHttps ? 'wss' : 'ws';
  const httpProto = isHttps ? 'https' : 'http';
  return {
    wsUrl: `${wsProto}://${host}:2567`,
    httpUrl: `${httpProto}://${host}:2567`,
  };
}

function toSnapshot(raw: RawRemotePlayerSchema, key: string): RemotePlayerSnapshot {
  const facing =
    raw.facing === 'up' || raw.facing === 'left' || raw.facing === 'right' ? raw.facing : 'down';
  return {
    sessionId: raw.sessionId || key,
    playerId: raw.playerId || '',
    name: raw.name || 'Villager',
    level: Number.isFinite(raw.level) ? raw.level : 1,
    stylish: Number.isFinite(raw.stylish) ? raw.stylish : 168,
    x: Number.isFinite(raw.x) ? raw.x : 480,
    y: Number.isFinite(raw.y) ? raw.y : 405,
    facing,
    isMoving: Boolean(raw.isMoving),
    appearanceJson: raw.appearanceJson || '{}',
    areaId: raw.areaId || 'AREA 0',
  };
}

/**
 * Colyseus Multiplayer Bridge for Phum Khnhom Village Plaza.
 * Automatically resolves ws://<current-hostname>:2567 (works on PC localhost & LAN mobile)
 * and falls back gracefully to Offline Mode if the server is unreachable.
 */
class PlazaRoomClient {
  private client: Client | null = null;
  private room: Room<RawPlazaStateSchema> | null = null;
  private currentAreaId = 'AREA 0';
  private online = false;
  private connecting = false;
  private connectToken = 0;

  // Outgoing move throttle (~18 Hz = 55ms)
  private lastMoveSentAt = 0;
  private lastSentX = NaN;
  private lastSentY = NaN;
  private lastSentFacing = '';
  private lastSentMoving = false;

  public get sessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  public get isOnline(): boolean {
    return this.online && Boolean(this.room);
  }

  public get areaId(): string {
    return this.currentAreaId;
  }

  private emitStatus(playerCount: number): void {
    EventBus.emit('network:status', {
      online: this.online,
      areaId: this.currentAreaId,
      areaChannel: areaIdToChannel(this.currentAreaId),
      playerCount,
    });
  }

  public async joinPlaza(
    areaId: string,
    initial: {
      playerId?: string;
      name: string;
      level?: number;
      stylish?: number;
      x: number;
      y: number;
      facing: string;
      loadout: EquippedLoadout;
    },
    handlers: PlazaRoomHandlers
  ): Promise<boolean> {
    this.currentAreaId = areaId;
    const myToken = ++this.connectToken;

    await this.leavePlaza(false);

    this.connecting = true;
    const { wsUrl } = getServerEndpoints();
    if (!this.client) {
      this.client = new Client(wsUrl);
    }

    try {
      const room = await this.client.joinOrCreate<RawPlazaStateSchema>('plaza', {
        areaId,
        playerId: initial.playerId || '',
        name: initial.name,
        level: initial.level ?? 1,
        stylish: initial.stylish ?? 168,
        x: Math.round(initial.x),
        y: Math.round(initial.y),
        facing: initial.facing,
        appearanceJson: serializeAppearance(initial.loadout),
      });

      // If another leave/join happened while awaiting connection, close stale room cleanly
      if (myToken !== this.connectToken) {
        await room.leave().catch(() => {});
        return false;
      }

      this.room = room;
      this.online = true;
      this.connecting = false;
      this.lastSentX = Math.round(initial.x);
      this.lastSentY = Math.round(initial.y);
      this.lastSentFacing = initial.facing;
      this.lastSentMoving = false;

      const syncCount = () => {
        const count = room.state?.players?.size ?? 1;
        this.emitStatus(Math.max(1, count));
      };

      room.state.players.onAdd((player, key) => {
        syncCount();
        if (key === room.sessionId) return;
        handlers.onRemoteAdd(toSnapshot(player, key));
        player.onChange?.(() => {
          if (key === room.sessionId) return;
          handlers.onRemoteChange(toSnapshot(player, key));
        });
      });

      room.state.players.onRemove((_player, key) => {
        syncCount();
        if (key === room.sessionId) return;
        handlers.onRemoteRemove(key);
      });

      room.onMessage(
        'chat',
        (msg: { sessionId: string; name: string; text: string; timestamp: number }) => {
          handlers.onChat(msg);
        }
      );

      room.onMessage('emote', (msg: { sessionId: string; emoji: string }) => {
        handlers.onEmote(msg);
      });

      room.onMessage(
        'whisper',
        (msg: { fromSessionId: string; fromName: string; toName: string; text: string; timestamp: number }) => {
          EventBus.emit('social:whisper', msg);
        }
      );

      room.onMessage(
        'friendRequest',
        (msg: {
          friendshipId: string;
          fromSessionId?: string;
          fromPlayerId: string;
          fromName: string;
          status?: 'pending' | 'accepted';
          timestamp: number;
        }) => {
          EventBus.emit('social:friendRequest', msg);
        }
      );

      room.onMessage(
        'dungeonInvite',
        (msg: {
          inviteId: string;
          fromSessionId: string;
          fromPlayerId: string;
          fromName: string;
          areaId: string;
          bossId: string;
          timestamp: number;
        }) => {
          EventBus.emit('social:dungeonInvite', msg);
        }
      );

      room.onMessage('socialNotice', (msg: { text: string }) => {
        EventBus.emit('social:notice', msg);
      });

      room.onLeave(() => {
        if (this.room === room) {
          this.room = null;
          this.online = false;
          this.emitStatus(1);
        }
      });

      syncCount();
      return true;
    } catch {
      if (myToken === this.connectToken) {
        this.room = null;
        this.online = false;
        this.connecting = false;
        this.emitStatus(1);
      }
      return false;
    }
  }

  public async leavePlaza(emitOffline = true): Promise<void> {
    this.connectToken += 1;
    const active = this.room;
    this.room = null;
    this.online = false;
    this.connecting = false;
    if (active) {
      try {
        await active.leave();
      } catch {
        // Ignore disconnect errors during scene shutdown
      }
    }
    if (emitOffline) {
      this.emitStatus(1);
    }
  }

  public sendMove(x: number, y: number, facing: string, isMoving: boolean, nowMs: number): void {
    if (!this.room || !this.online) return;
    if (nowMs - this.lastMoveSentAt < 55) return; // ~18 updates/sec throttle

    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;
    if (
      rx === this.lastSentX &&
      ry === this.lastSentY &&
      facing === this.lastSentFacing &&
      isMoving === this.lastSentMoving
    ) {
      return;
    }

    this.lastMoveSentAt = nowMs;
    this.lastSentX = rx;
    this.lastSentY = ry;
    this.lastSentFacing = facing;
    this.lastSentMoving = isMoving;

    this.room.send('move', { x: rx, y: ry, facing, isMoving });
  }

  public sendAppearance(
    loadout: EquippedLoadout,
    meta?: { name?: string; level?: number; stylish?: number } | string
  ): void {
    if (!this.room || !this.online) return;
    const payload: Record<string, unknown> = {
      appearanceJson: serializeAppearance(loadout),
    };
    if (typeof meta === 'string') {
      payload.name = meta;
    } else if (meta) {
      if (meta.name) payload.name = meta.name;
      if (typeof meta.level === 'number') payload.level = meta.level;
      if (typeof meta.stylish === 'number') payload.stylish = meta.stylish;
    }
    this.room.send('updateAppearance', payload);
  }

  public sendChat(text: string): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('chat', { text });
    return true;
  }

  public sendEmote(emoji: string): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('emote', { emoji });
    return true;
  }

  public sendWhisper(targetName: string, text: string, targetSessionId?: string): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('whisper', { targetName, targetSessionId, text });
    return true;
  }

  public sendFriendRequestPing(target: {
    targetSessionId?: string;
    targetPlayerId?: string;
    targetName?: string;
    friendshipId?: string;
  }): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('friendRequest', target);
    return true;
  }

  public sendDungeonInvite(target: {
    targetSessionId?: string;
    targetPlayerId?: string;
    targetName?: string;
    bossId?: string;
  }): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('dungeonInvite', target);
    return true;
  }

  public async fetchAreas(): Promise<{ online: boolean; areas: AreaChannelInfo[]; totalPlayers: number }> {
    const { httpUrl } = getServerEndpoints();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(`${httpUrl}/api/areas`, { signal: controller.signal });
      window.clearTimeout(timeout);
      if (!res.ok) throw new Error('Bad status');
      const data = (await res.json()) as { areas: AreaChannelInfo[]; totalPlayers: number };
      return { online: true, areas: data.areas, totalPlayers: data.totalPlayers };
    } catch {
      window.clearTimeout(timeout);
      return {
        online: false,
        totalPlayers: 1,
        areas: [
          { areaId: 'AREA 0', channel: 0, players: this.currentAreaId === 'AREA 0' ? 1 : 0, maxPlayers: 40 },
          { areaId: 'AREA 1', channel: 1, players: this.currentAreaId === 'AREA 1' ? 1 : 0, maxPlayers: 40 },
          { areaId: 'AREA 2', channel: 2, players: this.currentAreaId === 'AREA 2' ? 1 : 0, maxPlayers: 40 },
        ],
      };
    }
  }

  public get isConnecting(): boolean {
    return this.connecting;
  }
}

export const roomClient = new PlazaRoomClient();
