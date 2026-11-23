import { Client, type Room } from 'colyseus.js';
import { DEFAULT_LOADOUT, type EquippedLoadout } from '@shared/types';
import { EventBus } from '../EventBus';

export interface RemotePlayerSnapshot {
  sessionId: string;
  name: string;
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
  name: string;
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
    name: raw.name || 'Villager',
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
    initial: { name: string; x: number; y: number; facing: string; loadout: EquippedLoadout },
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
        name: initial.name,
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

  public sendAppearance(loadout: EquippedLoadout, name?: string): void {
    if (!this.room || !this.online) return;
    this.room.send('updateAppearance', {
      appearanceJson: serializeAppearance(loadout),
      ...(name ? { name } : {}),
    });
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
