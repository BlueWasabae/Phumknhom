import { Client, type Room } from 'colyseus.js';
import {
  DEFAULT_LOADOUT,
  type BossId,
  type DifficultyMode,
  type EquippedLoadout,
  type InstrumentSkinId,
  type KhmerInstrumentId,
  type KromWarSnapshot,
  type PlayerMailEntry,
  type TradeCompletedReceipt,
  type TradeSessionSnapshot,
  type TradeSlotItem,
} from '@shared/types';
import type { WorldBossLeaderboardRow } from '@shared/worldBossData';
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
  activeMountId?: string;
  ridingDriverSessionId?: string;
  kromTag?: string;
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
  activeMountId?: string;
  ridingDriverSessionId?: string;
  kromTag?: string;
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
    skinTone: loadout.skinTone,
    skinColor: loadout.skinColor,
    eyeStyle: loadout.eyeStyle,
    eyeColor: loadout.eyeColor,
    eyebrowStyle: loadout.eyebrowStyle,
    faceStyle: loadout.faceStyle,
    hairStyle: loadout.hairStyle,
    hairColor: loadout.hairColor,
    starterOutfit: loadout.starterOutfit,
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

export function getServerEndpoints(): { wsUrl: string; httpUrl: string } {
  const envApi = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  const envWs = (import.meta.env.VITE_WS_URL || '').trim().replace(/\/+$/, '');

  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const defaultHttp = `${isHttps ? 'https' : 'http'}://${host}:2567`;
  const defaultWs = `${isHttps ? 'wss' : 'ws'}://${host}:2567`;

  const httpUrl = envApi || defaultHttp;
  const derivedWsFromApi = envApi
    ? envApi.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://')
    : defaultWs;
  const wsUrl = envWs || derivedWsFromApi;

  return { wsUrl, httpUrl };
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
    activeMountId: raw.activeMountId || '',
    ridingDriverSessionId: raw.ridingDriverSessionId || '',
    kromTag: raw.kromTag || '',
  };
}

/**
 * Colyseus Multiplayer Bridge for Phum Khnhom Village Plaza.
 * Automatically resolves ws://<current-hostname>:2567 (works on PC localhost & LAN mobile)
 * and falls back gracefully to Offline Mode if the server is unreachable.
 */
export interface RemoteDungeonPlayerSnapshot {
  sessionId: string;
  playerId: string;
  name: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  pose: 'idle' | 'walk1' | 'walk2' | 'jump' | 'attack';
  hp: number;
  maxHp: number;
  appearanceJson: string;
  activeClass: string;
}

export interface DungeonRoomHandlers {
  onPartySizeChange: (partySize: number, maxHp: number, hp: number, phase: 1 | 2) => void;
  onTeammateAdd: (p: RemoteDungeonPlayerSnapshot) => void;
  onTeammateChange: (p: RemoteDungeonPlayerSnapshot) => void;
  onTeammateRemove: (sessionId: string) => void;
  onTeammateAttack: (msg: { sessionId: string; classId: string; x: number; y: number; dir: number }) => void;
  onBossHitRemote: (msg: { amount: number; isCrit: boolean; hp: number; maxHp: number; phase: 1 | 2 }) => void;
  onBossDefeatedRemote: () => void;
}

interface RawDungeonPlayerSchema {
  sessionId: string;
  playerId: string;
  name: string;
  x: number;
  y: number;
  facing: string;
  pose: string;
  hp: number;
  maxHp: number;
  appearanceJson: string;
  activeClass: string;
  onChange?: (cb: () => void) => void;
}

interface RawDungeonStateSchema {
  partyId: string;
  bossId: string;
  difficulty: string;
  partySize: number;
  boss: {
    hp: number;
    maxHp: number;
    phase: number;
    alive: boolean;
    onChange?: (cb: () => void) => void;
  };
  players: {
    size: number;
    onAdd: (cb: (val: RawDungeonPlayerSchema, key: string) => void, triggerImmediately?: boolean) => void;
    onRemove: (cb: (val: RawDungeonPlayerSchema, key: string) => void) => void;
  };
}

class PlazaRoomClient {
  private client: Client | null = null;
  private room: Room<RawPlazaStateSchema> | null = null;
  private dungeonRoom: Room<RawDungeonStateSchema> | null = null;
  private clubRoom: Room | null = null;
  private worldBossRoom: Room | null = null;
  private lastWorldBossMoveAt = 0;
  private lastDungeonMoveAt = 0;
  private currentAreaId = 'AREA 0';
  private online = false;
  private connecting = false;
  private reconnecting = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private manualLeave = false;
  private lastJoinParams: {
    areaId: string;
    initial: {
      playerId?: string;
      name: string;
      level?: number;
      stylish?: number;
      x: number;
      y: number;
      facing: string;
      loadout: EquippedLoadout;
    };
    handlers: PlazaRoomHandlers;
  } | null = null;
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
      reconnecting: this.reconnecting,
      reconnectAttempt: this.reconnectAttempt,
    });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.manualLeave || !this.lastJoinParams || typeof window === 'undefined') return;
    if (this.reconnectAttempt >= 6) {
      this.reconnecting = false;
      this.emitStatus(1);
      return;
    }
    this.reconnectAttempt += 1;
    this.reconnecting = true;
    this.emitStatus(1);
    const delayMs = Math.min(20_000, 1500 * Math.pow(2, this.reconnectAttempt - 1));
    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      if (this.manualLeave || !this.lastJoinParams) return;
      const { areaId, initial, handlers } = this.lastJoinParams;
      void this.joinPlaza(areaId, initial, handlers).then((ok) => {
        if (!ok && !this.manualLeave) {
          this.scheduleReconnect();
        }
      });
    }, delayMs);
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
    this.lastJoinParams = { areaId, initial, handlers };
    this.clearReconnectTimer();
    await this.leavePlaza(false);
    this.manualLeave = false;
    const myToken = ++this.connectToken;

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
      this.reconnecting = false;
      this.reconnectAttempt = 0;
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
          partyId: string;
          fromSessionId: string;
          fromPlayerId: string;
          fromName: string;
          areaId: string;
          bossId: BossId;
          difficulty: DifficultyMode;
          timestamp: number;
        }) => {
          EventBus.emit('social:dungeonInvite', msg);
        }
      );

      room.onMessage(
        'dungeonPartyReady',
        (msg: { partyId: string; bossId: BossId; difficulty: DifficultyMode; partnerName: string }) => {
          EventBus.emit('social:dungeonPartyReady', msg);
        }
      );

      room.onMessage(
        'marketSale',
        (msg: { itemName: string; quantity: number; buyerName: string; payoutCoins: number; taxCoins: number }) => {
          EventBus.emit('social:marketSale', msg);
        }
      );

      room.onMessage('socialNotice', (msg: { text: string }) => {
        EventBus.emit('social:notice', msg);
      });

      room.onMessage(
        'kromChat',
        (msg: { sessionId: string; name: string; kromTag: string; text: string; timestamp: number }) => {
          if (msg.sessionId !== room.sessionId) {
            EventBus.emit('network:kromChat', msg);
          }
        }
      );

      room.onMessage('tukTukCartsUpdated', (msg: { carts?: unknown[] }) => {
        if (Array.isArray(msg?.carts)) {
          EventBus.emit('cart:listUpdated', { carts: msg.carts as never });
        }
      });

      room.onMessage('gmAnnouncement', (msg: { text?: string; actor?: string }) => {
        if (typeof msg?.text === 'string' && msg.text.trim()) {
          EventBus.emit('ticker:push', {
            text: `📣 [GM] ${msg.text.trim()}`,
            category: 'boss',
          });
          EventBus.emit('ui:toast', {
            text: `📣 [SERVER ANNOUNCEMENT] ${msg.text.trim()}`,
          });
        }
      });

      room.onMessage(
        'gmEventTrigger',
        (msg: { worldEventId?: string | null; festivalId?: string | null; actor?: string }) => {
          EventBus.emit('gm:liveEventTriggered', {
            worldEventId: msg?.worldEventId ?? null,
            festivalId: msg?.festivalId ?? null,
          });
        }
      );

      room.onMessage(
        'cartSaleNotice',
        (msg: {
          buyerName?: string;
          itemName?: string;
          quantity?: number;
          revenueCoins?: number;
          cookingXp?: number;
        }) => {
          EventBus.emit('cart:saleNotice', {
            buyerName: msg.buyerName ?? 'Villager',
            itemName: msg.itemName ?? 'Hot Snack',
            quantity: msg.quantity ?? 1,
            revenueCoins: msg.revenueCoins ?? 0,
            cookingXp: msg.cookingXp ?? 18,
          });
        }
      );

      // Update 2.7 — Live 2-Step P2P Trade Window, Auction Ticker & Mailbox Notifications
      room.onMessage(
        'trade:incoming',
        (msg: { tradeId: string; fromSessionId: string; fromName: string; snapshot: TradeSessionSnapshot }) => {
          EventBus.emit('trade:incoming', msg);
        }
      );
      room.onMessage('trade:state', (snap: TradeSessionSnapshot) => {
        EventBus.emit('trade:state', snap);
      });
      room.onMessage('trade:completed', (receipt: TradeCompletedReceipt) => {
        EventBus.emit('trade:completed', receipt);
      });
      room.onMessage('trade:cancelled', (msg: { tradeId: string; reason: string }) => {
        EventBus.emit('trade:cancelled', msg);
      });
      room.onMessage('auctionTicker', (msg: { text?: string }) => {
        if (typeof msg?.text === 'string' && msg.text.trim()) {
          EventBus.emit('ticker:push', { text: msg.text.trim(), category: 'market' });
        }
      });
      room.onMessage('mailNotification', (msg: { mail: PlayerMailEntry; text: string }) => {
        EventBus.emit('mail:notification', msg);
      });
      room.onMessage('kromWarUpdated', (msg: { snapshot?: KromWarSnapshot; bannerText?: string }) => {
        if (msg?.snapshot) {
          EventBus.emit('kromWar:updated', msg.snapshot);
        }
        if (typeof msg?.bannerText === 'string' && msg.bannerText.trim()) {
          EventBus.emit('ticker:push', { text: msg.bannerText.trim(), category: 'boss' });
          EventBus.emit('ui:toast', { text: msg.bannerText.trim() });
        }
      });
      room.onMessage(
        'music:note',
        (msg: {
          sessionId: string;
          name: string;
          instrumentId: KhmerInstrumentId;
          skin: InstrumentSkinId;
          noteIndex: number;
          x: number;
          y: number;
        }) => {
          if (msg.sessionId !== room.sessionId) {
            EventBus.emit('music:remoteNote', msg);
          }
        }
      );
      room.onMessage(
        'music:tipReceived',
        (msg: { fromSessionId: string; fromName: string; amount: number; friendlyXp: number }) => {
          EventBus.emit('music:tipReceived', msg);
        }
      );

      room.onLeave((code?: number) => {
        if (this.room === room) {
          this.room = null;
          this.online = false;
          if (!this.manualLeave && code !== 1000) {
            this.scheduleReconnect();
          } else {
            this.reconnecting = false;
            this.emitStatus(1);
          }
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
    this.manualLeave = true;
    this.clearReconnectTimer();
    this.reconnecting = false;
    this.reconnectAttempt = 0;
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

  public sendMove(
    x: number,
    y: number,
    facing: string,
    isMoving: boolean,
    nowMs: number,
    activeMountId = ''
  ): void {
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

    this.room.send('move', { x: rx, y: ry, facing, isMoving, activeMountId });
  }

  public sendMountState(activeMountId: string | null): void {
    if (!this.room || !this.online) return;
    this.room.send('mountState', { activeMountId: activeMountId ?? '' });
  }

  public sendTukTukHop(driverSessionId: string | null): void {
    if (!this.room || !this.online) return;
    this.room.send('tukTukHop', { driverSessionId });
  }

  public sendMusicNote(
    instrumentId: KhmerInstrumentId,
    skin: InstrumentSkinId,
    noteIndex: number,
    x: number,
    y: number
  ): void {
    if (!this.room || !this.online) return;
    this.room.send('music:note', { instrumentId, skin, noteIndex, x: Math.round(x), y: Math.round(y) });
  }

  public sendMusicTip(targetSessionId: string, amount: 10 | 50): void {
    if (!this.room || !this.online) return;
    this.room.send('music:tip', { targetSessionId, amount });
  }

  public sendAppearance(
    loadout: EquippedLoadout,
    meta?: { name?: string; level?: number; stylish?: number; kromTag?: string | null } | string
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
      if (typeof meta.kromTag === 'string' || meta.kromTag === null) {
        payload.kromTag = meta.kromTag ?? '';
      }
    }
    this.room.send('updateAppearance', payload);
  }

  public sendChat(text: string): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('chat', { text });
    return true;
  }

  public sendKromChat(kromTag: string, text: string): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('kromChat', { kromTag, text });
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
    bossId?: BossId;
    difficulty?: DifficultyMode;
  }): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('dungeonInvite', target);
    return true;
  }

  public sendAcceptDungeonInvite(payload: {
    fromSessionId: string;
    fromName: string;
    partyId: string;
    bossId: BossId;
    difficulty: DifficultyMode;
  }): void {
    if (!this.room || !this.online) return;
    this.room.send('acceptDungeonInvite', payload);
  }

  public sendTradeRequest(targetSessionId: string, enforceDistance = true): boolean {
    if (!this.room || !this.online) return false;
    this.room.send('trade:request', { targetSessionId, enforceDistance });
    return true;
  }

  public sendTradeAccept(tradeId: string): void {
    if (!this.room || !this.online) return;
    this.room.send('trade:accept', { tradeId });
  }

  public sendTradeCancel(tradeId?: string, reason?: string): void {
    if (!this.room || !this.online) return;
    this.room.send('trade:cancel', { tradeId, reason });
  }

  public sendTradeUpdateOffer(payload: {
    tradeId: string;
    items: TradeSlotItem[];
    coins: number;
    walletCoins: number;
    inventorySnapshot: Array<{ itemId: string; quantity: number; quality?: string }>;
  }): void {
    if (!this.room || !this.online) return;
    this.room.send('trade:updateOffer', payload);
  }

  public sendTradeToggleLock(payload: {
    tradeId: string;
    walletCoins: number;
    inventorySnapshot: Array<{ itemId: string; quantity: number; quality?: string }>;
  }): void {
    if (!this.room || !this.online) return;
    this.room.send('trade:toggleLock', payload);
  }

  public sendTradeConfirm(tradeId: string): void {
    if (!this.room || !this.online) return;
    this.room.send('trade:confirm', { tradeId });
  }

  // ==================== PHASE 8 CO-OP DUNGEON ROOM ====================

  public get isInCoopDungeon(): boolean {
    return Boolean(this.dungeonRoom);
  }

  public async joinDungeon(
    opts: {
      partyId: string;
      bossId: BossId;
      difficulty: DifficultyMode;
      playerId?: string;
      name: string;
      loadout: EquippedLoadout;
      activeClass: string;
      hp: number;
      maxHp: number;
    },
    handlers: DungeonRoomHandlers
  ): Promise<boolean> {
    await this.leaveDungeon();
    const { wsUrl } = getServerEndpoints();
    if (!this.client) {
      this.client = new Client(wsUrl);
    }

    const toDungeonSnap = (raw: RawDungeonPlayerSchema, key: string): RemoteDungeonPlayerSnapshot => ({
      sessionId: raw.sessionId || key,
      playerId: raw.playerId || '',
      name: raw.name || 'Raider',
      x: Number.isFinite(raw.x) ? raw.x : 280,
      y: Number.isFinite(raw.y) ? raw.y : 574,
      facing: raw.facing === 'left' ? 'left' : 'right',
      pose:
        raw.pose === 'walk1' || raw.pose === 'walk2' || raw.pose === 'jump' || raw.pose === 'attack'
          ? raw.pose
          : 'idle',
      hp: Number.isFinite(raw.hp) ? raw.hp : 150,
      maxHp: Number.isFinite(raw.maxHp) ? raw.maxHp : 150,
      appearanceJson: raw.appearanceJson || '{}',
      activeClass: raw.activeClass || 'lbokator',
    });

    try {
      const room = await this.client.joinOrCreate<RawDungeonStateSchema>('dungeon', {
        partyId: opts.partyId,
        bossId: opts.bossId,
        difficulty: opts.difficulty,
        playerId: opts.playerId || '',
        name: opts.name,
        appearanceJson: serializeAppearance(opts.loadout),
        activeClass: opts.activeClass,
        hp: opts.hp,
        maxHp: opts.maxHp,
      });

      this.dungeonRoom = room;

      const syncBoss = () => {
        if (!room.state?.boss) return;
        const pSize = Math.max(1, room.state.players?.size ?? room.state.partySize ?? 1);
        handlers.onPartySizeChange(
          pSize,
          room.state.boss.maxHp,
          room.state.boss.hp,
          room.state.boss.phase === 2 ? 2 : 1
        );
      };

      room.state.boss.onChange?.(() => syncBoss());

      room.state.players.onAdd((p, key) => {
        syncBoss();
        if (key === room.sessionId) return;
        handlers.onTeammateAdd(toDungeonSnap(p, key));
        p.onChange?.(() => {
          if (key === room.sessionId) return;
          handlers.onTeammateChange(toDungeonSnap(p, key));
        });
      });

      room.state.players.onRemove((_p, key) => {
        syncBoss();
        if (key === room.sessionId) return;
        handlers.onTeammateRemove(key);
      });

      room.onMessage(
        'playerAttack',
        (msg: { sessionId: string; classId: string; x: number; y: number; dir: number }) => {
          if (msg.sessionId !== room.sessionId) {
            handlers.onTeammateAttack(msg);
          }
        }
      );

      room.onMessage(
        'bossHit',
        (msg: { fromSessionId: string; amount: number; isCrit: boolean; hp: number; maxHp: number; phase: number }) => {
          handlers.onBossHitRemote({
            amount: msg.amount,
            isCrit: msg.isCrit,
            hp: msg.hp,
            maxHp: msg.maxHp,
            phase: msg.phase === 2 ? 2 : 1,
          });
        }
      );

      room.onMessage('bossDefeated', () => {
        handlers.onBossDefeatedRemote();
      });

      room.onMessage(
        'villageCheer',
        (msg: { senderName?: string; healHp?: number; attackBonusPct?: number; durationMs?: number }) => {
          EventBus.emit('dungeon:villageCheer', {
            senderName: msg.senderName || 'Kind Villager',
            healHp: msg.healHp ?? 80,
            attackBonusPct: msg.attackBonusPct ?? 0.2,
            durationMs: msg.durationMs ?? 30_000,
          });
        }
      );

      syncBoss();
      return true;
    } catch {
      this.dungeonRoom = null;
      return false;
    }
  }

  public async leaveDungeon(): Promise<void> {
    const active = this.dungeonRoom;
    this.dungeonRoom = null;
    if (active) {
      try {
        await active.leave();
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  public sendDungeonMove(
    x: number,
    y: number,
    facing: 'left' | 'right',
    pose: string,
    hp: number,
    maxHp: number,
    nowMs: number
  ): void {
    if (!this.dungeonRoom || nowMs - this.lastDungeonMoveAt < 50) return;
    this.lastDungeonMoveAt = nowMs;
    this.dungeonRoom.send('move', {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      facing,
      pose,
      hp,
      maxHp,
    });
  }

  public sendDungeonAttack(classId: string, x: number, y: number, dir: number): void {
    if (!this.dungeonRoom) return;
    this.dungeonRoom.send('attack', { classId, x: Math.round(x), y: Math.round(y), dir });
  }

  public sendDungeonBossDamage(amount: number, isCrit: boolean): void {
    if (!this.dungeonRoom) return;
    this.dungeonRoom.send('bossDamage', { amount: Math.round(amount), isCrit });
  }

  // ==================== MULTIPLAYER CLUB ROOM (PVP TABLES: TIEN LEN & OUK CHAKTRANG) ====================
  public async connectClub(opts: {
    cityServer?: string;
    playerId?: string;
    name: string;
  }): Promise<{ online: boolean; sessionId: string | null }> {
    if (this.clubRoom) {
      this.clubRoom.send('requestTables', {});
      return { online: true, sessionId: this.clubRoom.sessionId };
    }
    const { wsUrl } = getServerEndpoints();
    try {
      const client = this.client ?? new Client(wsUrl);
      this.client = client;
      const room = await client.joinOrCreate('club', {
        cityServer: opts.cityServer ?? 'phnom_penh',
        playerId: opts.playerId ?? '',
        name: opts.name,
      });
      this.clubRoom = room;
      room.onMessage('clubTablesSnapshot', (msg: { tables?: unknown[] }) => {
        EventBus.emit('club:tablesSync', {
          tables: Array.isArray(msg?.tables) ? msg.tables : [],
          sessionId: room.sessionId,
          online: true,
        });
      });
      room.onMessage('clubPrivateHand', (msg: { tableId?: string; hand?: unknown[] }) => {
        if (msg?.tableId && Array.isArray(msg.hand)) {
          EventBus.emit('club:privateHand', { tableId: msg.tableId, hand: msg.hand });
        }
      });
      room.onMessage(
        'clubTablePayout',
        (msg: {
          tableId?: string;
          game?: 'tien_len' | 'ouk_chaktrang';
          winnerSessionId?: string;
          winnerName?: string;
          potCoins?: number;
          stakeCoins?: number;
        }) => {
          if (msg?.tableId && msg.game && msg.winnerSessionId) {
            EventBus.emit('club:payout', {
              tableId: msg.tableId,
              game: msg.game,
              winnerSessionId: msg.winnerSessionId,
              winnerName: msg.winnerName ?? 'Winner',
              potCoins: msg.potCoins ?? 0,
              stakeCoins: msg.stakeCoins ?? 0,
            });
          }
        }
      );
      room.onLeave(() => {
        if (this.clubRoom === room) {
          this.clubRoom = null;
          EventBus.emit('club:tablesSync', { tables: [], sessionId: null, online: false });
        }
      });
      room.send('requestTables', {});
      return { online: true, sessionId: room.sessionId };
    } catch {
      this.clubRoom = null;
      return { online: false, sessionId: null };
    }
  }

  public sendClubMessage(type: string, payload: Record<string, unknown>): boolean {
    if (!this.clubRoom) return false;
    try {
      this.clubRoom.send(type, payload);
      return true;
    } catch {
      return false;
    }
  }

  public getClubSessionId(): string | null {
    return this.clubRoom?.sessionId ?? null;
  }

  public async leaveClub(): Promise<void> {
    const active = this.clubRoom;
    this.clubRoom = null;
    if (active) {
      try {
        active.send('leaveTable', {});
        await active.leave();
      } catch {
        // Ignore cleanup errors
      }
    }
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

  public get worldBossSessionId(): string | null {
    return this.worldBossRoom?.sessionId ?? null;
  }

  public async joinWorldBoss(
    initial: {
      playerId?: string;
      name: string;
      hp: number;
      maxHp: number;
      loadout: EquippedLoadout;
      activeClass: string;
    },
    handlers: {
      onStateSync: (snap: {
        hp: number;
        maxHp: number;
        alive: boolean;
        exposedHeartActive: boolean;
        exposedHeartEndsAt: number;
        playerCount: number;
        topDamagers: WorldBossLeaderboardRow[];
      }) => void;
      onRemoteAdd: (p: RemoteWorldBossPlayer) => void;
      onRemoteChange: (p: RemoteWorldBossPlayer) => void;
      onRemoteRemove: (sessionId: string) => void;
      onMechanic: (msg: { mechanic: string; seed: number; direction: number }) => void;
      onExposedHeart: (msg: { durationMs: number; endsAt: number; thresholdPct: number }) => void;
      onColossusDefeated: (msg: {
        raidId: string;
        bossMaxHp: number;
        top3: WorldBossLeaderboardRow[];
        rankings: Array<WorldBossLeaderboardRow & { survivedSec?: number }>;
      }) => void;
    }
  ): Promise<boolean> {
    await this.leaveWorldBoss();
    const { wsUrl } = getServerEndpoints();
    if (!this.client) this.client = new Client(wsUrl);
    try {
      const room = await this.client.joinOrCreate<any>('world_boss', {
        playerId: initial.playerId || '',
        name: initial.name,
        hp: initial.hp,
        maxHp: initial.maxHp,
        appearanceJson: serializeAppearance(initial.loadout),
        activeClass: initial.activeClass,
      });
      this.worldBossRoom = room;

      const emitSync = () => {
        const st = room.state;
        if (!st?.boss) return;
        const rows: Array<{ sessionId: string; name: string; damage: number }> = [];
        st.players?.forEach((pl: any, sid: string) => {
          rows.push({ sessionId: sid, name: pl.name || 'Hero', damage: Number(pl.damageDealt) || 0 });
        });
        rows.sort((a, b) => b.damage - a.damage);
        const maxHp = Math.max(1, Number(st.boss.maxHp) || 1);
        const topDamagers: WorldBossLeaderboardRow[] = rows.slice(0, 3).map((r, i) => ({
          ...r,
          damagePct: Math.round((r.damage / maxHp) * 10000) / 100,
          rank: i + 1,
        }));
        handlers.onStateSync({
          hp: Number(st.boss.hp) || 0,
          maxHp,
          alive: Boolean(st.boss.alive),
          exposedHeartActive: Boolean(st.boss.exposedHeartActive),
          exposedHeartEndsAt: Number(st.boss.exposedHeartEndsAt) || 0,
          playerCount: st.players?.size ?? 1,
          topDamagers,
        });
      };

      const toRemote = (pl: any, sid: string): RemoteWorldBossPlayer => ({
        sessionId: sid,
        name: pl.name || 'Hero',
        x: Number(pl.x) || 320,
        y: Number(pl.y) || 560,
        facing: pl.facing === 'left' ? 'left' : 'right',
        pose: pl.pose || 'idle',
        hp: Number(pl.hp) || 150,
        maxHp: Number(pl.maxHp) || 150,
        loadout: parseAppearance(pl.appearanceJson || '{}'),
      });

      room.state.boss.onChange?.(() => emitSync());
      room.state.players.onAdd((pl: any, key: string) => {
        emitSync();
        if (key === room.sessionId) return;
        handlers.onRemoteAdd(toRemote(pl, key));
        pl.onChange?.(() => {
          emitSync();
          if (key === room.sessionId) return;
          handlers.onRemoteChange(toRemote(pl, key));
        });
      });
      room.state.players.onRemove((_pl: any, key: string) => {
        emitSync();
        if (key !== room.sessionId) handlers.onRemoteRemove(key);
      });

      room.onMessage('bossMechanic', (msg: { mechanic: string; seed: number; direction: number }) => {
        handlers.onMechanic(msg);
      });
      room.onMessage('exposedHeart', (msg: { durationMs: number; endsAt: number; thresholdPct: number }) => {
        handlers.onExposedHeart(msg);
      });
      room.onMessage('colossusDefeated', (msg: any) => {
        handlers.onColossusDefeated(msg);
      });
      room.onLeave(() => {
        if (this.worldBossRoom === room) this.worldBossRoom = null;
      });
      emitSync();
      return true;
    } catch {
      this.worldBossRoom = null;
      return false;
    }
  }

  public sendWorldBossMove(payload: {
    x: number;
    y: number;
    facing: 'left' | 'right';
    pose: string;
    hp: number;
    maxHp: number;
  }): void {
    if (!this.worldBossRoom) return;
    const now = Date.now();
    if (now - this.lastWorldBossMoveAt < 60) return;
    this.lastWorldBossMoveAt = now;
    try {
      this.worldBossRoom.send('move', payload);
    } catch {
      // ignore
    }
  }

  public sendWorldBossHit(damage: number, isCrit: boolean): void {
    if (!this.worldBossRoom) return;
    try {
      this.worldBossRoom.send('bossHit', { damage, isCrit });
    } catch {
      // ignore
    }
  }

  public async leaveWorldBoss(): Promise<void> {
    const active = this.worldBossRoom;
    this.worldBossRoom = null;
    if (active) {
      try {
        await active.leave();
      } catch {
        // ignore
      }
    }
  }
}

export interface RemoteWorldBossPlayer {
  sessionId: string;
  name: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  pose: string;
  hp: number;
  maxHp: number;
  loadout: EquippedLoadout;
}

export const roomClient = new PlazaRoomClient();
