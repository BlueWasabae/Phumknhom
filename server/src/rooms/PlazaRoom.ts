import { Client, Room } from 'colyseus';
import { PlazaState, RemotePlayer } from '../schema/PlazaState';
import { presenceRegistry } from '../presence';
import { tradeService, type ServerTradeSlotItem } from '../economy/tradeService';

export const ALLOWED_AREAS = ['AREA 0', 'AREA 1', 'AREA 2'] as const;
export type AreaId = (typeof ALLOWED_AREAS)[number] | `KROM_${string}`;

const ALLOWED_FACINGS = new Set(['down', 'up', 'left', 'right']);
const MAP_MIN_X = 20;
const MAP_MAX_X = 1580;
const MAP_MIN_Y = 86;
const MAP_MAX_Y = 1180;
const CHAT_COOLDOWN_MS = 650;
const EMOTE_COOLDOWN_MS = 500;

export function normalizeAreaId(raw: unknown): AreaId {
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toUpperCase();
    if ((ALLOWED_AREAS as readonly string[]).includes(trimmed)) {
      return trimmed as AreaId;
    }
    if (/^KROM_[A-Z0-9]{2,6}$/.test(trimmed)) {
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
  static activeRooms = new Set<PlazaRoom>();
  maxClients = 40;
  private lastChatAt = new Map<string, number>();
  private lastEmoteAt = new Map<string, number>();

  onCreate(options: { areaId?: string }): void {
    PlazaRoom.activeRooms.add(this);
    const areaId = normalizeAreaId(options?.areaId);
    const state = new PlazaState();
    state.areaId = areaId;
    this.setState(state);
    this.setMetadata({ areaId });

    this.onMessage('move', (client, payload: { x?: number; y?: number; facing?: string; isMoving?: boolean; activeMountId?: string }) => {
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
      if (typeof payload.activeMountId === 'string') {
        player.activeMountId = payload.activeMountId.slice(0, 36);
      }
    });

    const TWO_SEAT_MOUNTS = new Set([
      'mount_golden_cloud',
      'mount_royal_elephant',
      'mount_spirit_dragon',
    ]);

    this.onMessage('mountState', (client, payload: { activeMountId?: string | null }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.activeMountId = typeof payload?.activeMountId === 'string' ? payload.activeMountId.slice(0, 36) : '';
      if (!TWO_SEAT_MOUNTS.has(player.activeMountId)) {
        // Eject any passenger riding in back seat if driver dismounts from a 2-seat mount
        this.state.players.forEach((other) => {
          if (other.ridingDriverSessionId === client.sessionId) {
            other.ridingDriverSessionId = '';
          }
        });
      }
    });

    this.onMessage('tukTukHop', (client, payload: { driverSessionId?: string | null }) => {
      const rider = this.state.players.get(client.sessionId);
      if (!rider) return;
      const targetDriverId = typeof payload?.driverSessionId === 'string' ? payload.driverSessionId : '';
      if (!targetDriverId) {
        rider.ridingDriverSessionId = '';
        return;
      }
      const driver = this.state.players.get(targetDriverId);
      if (driver && TWO_SEAT_MOUNTS.has(driver.activeMountId)) {
        rider.ridingDriverSessionId = targetDriverId;
        rider.activeMountId = '';
      }
    });

    this.onMessage(
      'updateAppearance',
      (
        client,
        payload: { appearanceJson?: string; name?: string; level?: number; stylish?: number; kromTag?: string }
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player || !payload || typeof payload !== 'object') return;

        if (typeof payload.appearanceJson === 'string') {
          player.appearanceJson = sanitizeAppearance(payload.appearanceJson);
          try {
            const parsed = JSON.parse(player.appearanceJson) as { equippedDyes?: Record<string, string> };
            player.equippedDyesJson = parsed?.equippedDyes ? JSON.stringify(parsed.equippedDyes) : '{}';
          } catch {
            player.equippedDyesJson = '{}';
          }
        }
        if (typeof payload.name === 'string') {
          player.name = sanitizeName(payload.name, player.name);
          presenceRegistry.updateName(client.sessionId, player.name);
        }
        if (typeof payload.level === 'number' && Number.isFinite(payload.level)) {
          player.level = Math.max(1, Math.min(100, Math.floor(payload.level)));
        }
        if (typeof payload.stylish === 'number' && Number.isFinite(payload.stylish)) {
          player.stylish = Math.max(0, Math.floor(payload.stylish));
        }
        if (typeof payload.kromTag === 'string') {
          player.kromTag = payload.kromTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
        }
      }
    );

    this.onMessage('kromChat', (client, payload: { kromTag?: string; text?: string }) => {
      const sender = this.state.players.get(client.sessionId);
      if (!sender || typeof payload?.text !== 'string') return;
      const tag = (payload.kromTag || sender.kromTag || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      const text = payload.text.replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!tag || !text) return;

      const msgPayload = {
        sessionId: client.sessionId,
        name: sender.name,
        kromTag: tag,
        text,
        timestamp: Date.now(),
      };
      for (const peer of this.clients) {
        const peerState = this.state.players.get(peer.sessionId);
        if (peerState && peerState.kromTag.toUpperCase() === tag) {
          peer.send('kromChat', msgPayload);
        }
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

    this.onMessage('emote', (client, payload: { emoji?: string; emoteId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !payload || typeof payload !== 'object') return;

      const now = Date.now();
      const prev = this.lastEmoteAt.get(client.sessionId) ?? 0;
      if (now - prev < EMOTE_COOLDOWN_MS) return;

      const allowedEmoteIds = new Set([
        'sampeah',
        'romvong',
        'apsara_pose',
        'sip_kafe',
        'sit_relax',
        'victory_cheer',
        'naga_spirit_roar',
        'golden_rain_dance',
      ]);
      const emoteId =
        typeof payload.emoteId === 'string' && allowedEmoteIds.has(payload.emoteId)
          ? payload.emoteId
          : undefined;
      const emoji = typeof payload.emoji === 'string' ? payload.emoji.trim().slice(0, 8) : '';
      if (!emoji && !emoteId) return;

      this.lastEmoteAt.set(client.sessionId, now);
      this.broadcast('emote', {
        sessionId: client.sessionId,
        emoji: emoji || '✨',
        emoteId,
      });
    });

    // Update 3.1 — Kun Khmer 1v1 Sparring Ring Duel Challenges
    this.onMessage(
      'duel:challenge',
      (
        client,
        payload: { targetSessionId?: string; targetName?: string; mode?: 'normalized' | 'open' }
      ) => {
        const sender = this.state.players.get(client.sessionId);
        if (!sender) return;
        const mode = payload?.mode === 'open' ? 'open' : 'normalized';
        const duelId = `duel_${client.sessionId.slice(0, 6)}_${Date.now().toString(36)}`;
        const delivered = presenceRegistry.sendToTarget(
          { sessionId: payload?.targetSessionId, username: payload?.targetName },
          'duel:incoming',
          {
            duelId,
            mode,
            fromSessionId: client.sessionId,
            fromName: sender.name,
            timestamp: Date.now(),
          }
        );
        client.send('socialNotice', {
          text: delivered
            ? `🥊 Sent Kun Khmer ${mode === 'normalized' ? 'Normalized 1v1' : 'Open Gear'} Duel Challenge to ${delivered.username}!`
            : `${payload?.targetName || 'Player'} is not currently in the Plaza.`,
        });
      }
    );

    this.onMessage(
      'duel:respond',
      (
        client,
        payload: {
          fromSessionId?: string;
          fromName?: string;
          duelId?: string;
          mode?: 'normalized' | 'open';
          accept?: boolean;
        }
      ) => {
        const responder = this.state.players.get(client.sessionId);
        if (!responder || !payload?.duelId) return;
        const mode = payload.mode === 'open' ? 'open' : 'normalized';
        if (!payload.accept) {
          presenceRegistry.sendToTarget(
            { sessionId: payload.fromSessionId, username: payload.fromName },
            'socialNotice',
            { text: `🥊 ${responder.name} declined the Kun Khmer sparring challenge.` }
          );
          return;
        }
        presenceRegistry.sendToTarget(
          { sessionId: payload.fromSessionId, username: payload.fromName },
          'duel:ready',
          {
            duelId: payload.duelId,
            mode,
            opponentName: responder.name,
          }
        );
      }
    );

    // Update 2.9 — Live Khmer Musical Instrument Jamming & Street Musician Tip Jar
    this.onMessage(
      'music:note',
      (
        client,
        payload: {
          instrumentId?: string;
          skin?: string;
          noteIndex?: number;
          x?: number;
          y?: number;
        }
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player || !payload) return;
        const allowed = new Set(['roneat_aek', 'chapei_dang_veng', 'khim', 'skor_thom', 'chhing']);
        const instrumentId = typeof payload.instrumentId === 'string' && allowed.has(payload.instrumentId)
          ? payload.instrumentId
          : 'roneat_aek';
        const noteIndex = Math.max(0, Math.min(7, Math.floor(Number(payload.noteIndex ?? 0))));
        const skin =
          payload.skin === 'golden_angkor' || payload.skin === 'celestial_apsara'
            ? payload.skin
            : 'classic';
        this.broadcast('music:note', {
          sessionId: client.sessionId,
          name: player.name,
          instrumentId,
          skin,
          noteIndex,
          x: typeof payload.x === 'number' ? payload.x : player.x,
          y: typeof payload.y === 'number' ? payload.y : player.y,
          timestamp: Date.now(),
        });
      }
    );

    this.onMessage(
      'music:tip',
      (client, payload: { targetSessionId?: string; amount?: number }) => {
        const tipper = this.state.players.get(client.sessionId);
        if (!tipper || !payload?.targetSessionId) return;
        const target = this.state.players.get(payload.targetSessionId);
        const amount = payload.amount === 50 ? 50 : 10;
        if (!target || payload.targetSessionId === client.sessionId) return;

        presenceRegistry.sendToTarget({ sessionId: payload.targetSessionId }, 'music:tipReceived', {
          fromSessionId: client.sessionId,
          fromName: tipper.name,
          amount,
          friendlyXp: amount === 50 ? 15 : 6,
          timestamp: Date.now(),
        });
        this.broadcast('chat', {
          sessionId: client.sessionId,
          name: '🎵 Tip Jar',
          text: `${tipper.name} tipped ${amount}c to ${target.name}'s Khmer performance! (+Friendly XP)`,
          timestamp: Date.now(),
        });
      }
    );

    // ==================== PHASE 7 SOCIAL ROUTING (WHISPER / FRIEND / DUNGEON INVITE) ====================

    this.onMessage(
      'whisper',
      (client, payload: { targetName?: string; targetSessionId?: string; text?: string }) => {
        const sender = this.state.players.get(client.sessionId);
        if (!sender || typeof payload?.text !== 'string') return;

        const text = payload.text.replace(/\s+/g, ' ').trim().slice(0, 120);
        if (!text) return;

        const targetRec = presenceRegistry.sendToTarget(
          { sessionId: payload.targetSessionId, username: payload.targetName },
          'whisper',
          {
            fromSessionId: client.sessionId,
            fromName: sender.name,
            toName: payload.targetName || '',
            text,
            timestamp: Date.now(),
          }
        );

        if (!targetRec) {
          client.send('socialNotice', {
            text: `Player "${payload.targetName || 'Unknown'}" is currently offline or in a Dungeon/Farm.`,
          });
        }
      }
    );

    this.onMessage(
      'friendRequest',
      (
        client,
        payload: { targetSessionId?: string; targetPlayerId?: string; targetName?: string; friendshipId?: string }
      ) => {
        const sender = this.state.players.get(client.sessionId);
        if (!sender) return;
        presenceRegistry.sendToTarget(
          {
            sessionId: payload.targetSessionId,
            playerId: payload.targetPlayerId,
            username: payload.targetName,
          },
          'friendRequest',
          {
            friendshipId: payload.friendshipId || '',
            fromSessionId: client.sessionId,
            fromPlayerId: sender.playerId,
            fromName: sender.name,
            timestamp: Date.now(),
          }
        );
      }
    );

    this.onMessage(
      'dungeonInvite',
      (
        client,
        payload: {
          targetSessionId?: string;
          targetPlayerId?: string;
          targetName?: string;
          bossId?: string;
          difficulty?: string;
        }
      ) => {
        const sender = this.state.players.get(client.sessionId);
        if (!sender) return;
        const partyId = `party_${client.sessionId.slice(0, 6)}_${Date.now().toString(36)}`;
        const bossId = payload.bossId === 'yeak_thmor' ? 'yeak_thmor' : 'sdech_kongkaeb';
        const difficulty =
          payload.difficulty === 'expert' || payload.difficulty === 'mythic'
            ? payload.difficulty
            : 'normal';

        const delivered = presenceRegistry.sendToTarget(
          {
            sessionId: payload.targetSessionId,
            playerId: payload.targetPlayerId,
            username: payload.targetName,
          },
          'dungeonInvite',
          {
            inviteId: `inv_${Date.now()}_${client.sessionId.slice(0, 4)}`,
            partyId,
            fromSessionId: client.sessionId,
            fromPlayerId: sender.playerId,
            fromName: sender.name,
            areaId: this.state.areaId,
            bossId,
            difficulty,
            timestamp: Date.now(),
          }
        );

        client.send('socialNotice', {
          text: delivered
            ? `Sent Co-op Dungeon Invite to ${delivered.username}! Once they accept, you will both enter together!`
            : `${payload.targetName || 'Player'} is not currently in the Plaza.`,
        });
      }
    );

    this.onMessage(
      'acceptDungeonInvite',
      (
        client,
        payload: { fromSessionId?: string; fromName?: string; partyId?: string; bossId?: string; difficulty?: string }
      ) => {
        const accepter = this.state.players.get(client.sessionId);
        if (!accepter || !payload?.partyId) return;
        const bossId = payload.bossId === 'yeak_thmor' ? 'yeak_thmor' : 'sdech_kongkaeb';
        const difficulty =
          payload.difficulty === 'expert' || payload.difficulty === 'mythic'
            ? payload.difficulty
            : 'normal';

        // Notify inviter to warp immediately into the exact same Co-op DungeonRoom!
        presenceRegistry.sendToTarget(
          { sessionId: payload.fromSessionId, username: payload.fromName },
          'dungeonPartyReady',
          {
            partyId: payload.partyId,
            bossId,
            difficulty,
            partnerName: accepter.name,
          }
        );
      }
    );

    // ==================== UPDATE 2.7: SECURE 2-STEP LIVE P2P TRADE WINDOW ====================

    const pushTradeStateToBoth = (sess: NonNullable<ReturnType<typeof tradeService.getSession>>) => {
      const snap = tradeService.toPublicSnapshot(sess);
      presenceRegistry.sendToTarget({ sessionId: sess.sideA.sessionId }, 'trade:state', snap);
      presenceRegistry.sendToTarget({ sessionId: sess.sideB.sessionId }, 'trade:state', snap);
    };

    this.onMessage('trade:request', (client, payload: { targetSessionId?: string; enforceDistance?: boolean }) => {
      const sender = this.state.players.get(client.sessionId);
      const targetSid = typeof payload?.targetSessionId === 'string' ? payload.targetSessionId : '';
      const target = targetSid ? this.state.players.get(targetSid) : undefined;
      if (!sender || !target) {
        client.send('socialNotice', { text: 'Target player is no longer in this Area.' });
        return;
      }

      const res = tradeService.createRequest(
        {
          sessionId: client.sessionId,
          playerId: sender.playerId,
          name: sender.name,
          x: sender.x,
          y: sender.y,
        },
        {
          sessionId: target.sessionId,
          playerId: target.playerId,
          name: target.name,
          x: target.x,
          y: target.y,
        },
        payload?.enforceDistance !== false
      );
      if (!res.ok) {
        client.send('socialNotice', { text: `⚠️ ${res.error}` });
        return;
      }

      const snap = tradeService.toPublicSnapshot(res.session);
      client.send('trade:state', snap);
      presenceRegistry.sendToTarget({ sessionId: target.sessionId }, 'trade:incoming', {
        tradeId: res.session.tradeId,
        fromSessionId: client.sessionId,
        fromName: sender.name,
        snapshot: snap,
      });
    });

    this.onMessage('trade:accept', (client, payload: { tradeId?: string }) => {
      if (!payload?.tradeId) return;
      const res = tradeService.acceptRequest(payload.tradeId, client.sessionId);
      if (!res.ok) {
        client.send('socialNotice', { text: `⚠️ ${res.error}` });
        return;
      }
      pushTradeStateToBoth(res.session);
    });

    this.onMessage('trade:cancel', (client, payload: { tradeId?: string; reason?: string }) => {
      const active = payload?.tradeId
        ? tradeService.getSession(payload.tradeId)
        : tradeService.getSessionForClient(client.sessionId);
      if (!active) return;
      const actor = this.state.players.get(client.sessionId);
      const res = tradeService.cancelTrade(active.tradeId, client.sessionId);
      if (!res.ok) return;
      const reason = payload?.reason || `${actor?.name || 'Trader'} cancelled the trade.`;
      presenceRegistry.sendToTarget({ sessionId: res.session.sideA.sessionId }, 'trade:cancelled', {
        tradeId: res.session.tradeId,
        reason,
      });
      presenceRegistry.sendToTarget({ sessionId: res.session.sideB.sessionId }, 'trade:cancelled', {
        tradeId: res.session.tradeId,
        reason,
      });
    });

    this.onMessage(
      'trade:updateOffer',
      (
        client,
        payload: {
          tradeId?: string;
          items?: ServerTradeSlotItem[];
          coins?: number;
          walletCoins?: number;
          inventorySnapshot?: Array<{ itemId: string; quantity: number; quality?: string }>;
        }
      ) => {
        if (!payload?.tradeId) return;
        const res = tradeService.updateOffer(payload.tradeId, client.sessionId, payload);
        if (!res.ok) {
          client.send('socialNotice', { text: `⚠️ ${res.error}` });
          return;
        }
        pushTradeStateToBoth(res.session);
      }
    );

    this.onMessage(
      'trade:toggleLock',
      (
        client,
        payload: {
          tradeId?: string;
          walletCoins?: number;
          inventorySnapshot?: Array<{ itemId: string; quantity: number; quality?: string }>;
        }
      ) => {
        if (!payload?.tradeId) return;
        const res = tradeService.toggleLock(payload.tradeId, client.sessionId, payload);
        if (!res.ok) {
          client.send('socialNotice', { text: `⚠️ ${res.error}` });
          return;
        }
        pushTradeStateToBoth(res.session);
      }
    );

    this.onMessage('trade:confirm', async (client, payload: { tradeId?: string }) => {
      if (!payload?.tradeId) return;
      const res = await tradeService.confirmTrade(payload.tradeId, client.sessionId);
      if (!res.ok) {
        client.send('socialNotice', { text: `⚠️ ${res.error}` });
        return;
      }
      if (res.completed && res.receipts) {
        presenceRegistry.sendToTarget(
          { sessionId: res.session.sideA.sessionId },
          'trade:completed',
          res.receipts.forA
        );
        presenceRegistry.sendToTarget(
          { sessionId: res.session.sideB.sessionId },
          'trade:completed',
          res.receipts.forB
        );
      } else {
        pushTradeStateToBoth(res.session);
      }
    });

    // Update 3.3 — Player-Hosted Village Parties & Synchronized Firework Shows!
    this.onMessage(
      'party:host',
      (
        client,
        payload: {
          kitId?: string;
          mapId?: string;
          mapLabel?: string;
          x?: number;
          y?: number;
          fireworkShells?: number;
          palette?: number[];
        }
      ) => {
        const host = this.state.players.get(client.sessionId);
        if (!host) return;
        const kitId = typeof payload?.kitId === 'string' ? payload.kitId.slice(0, 48) : 'party_lantern_kit';
        const mapId = typeof payload?.mapId === 'string' ? payload.mapId.slice(0, 32) : 'central_plaza';
        const mapLabel = typeof payload?.mapLabel === 'string' ? payload.mapLabel.slice(0, 48) : 'Central Plaza';
        const px = typeof payload?.x === 'number' && Number.isFinite(payload.x) ? clamp(payload.x, 80, 1520) : host.x;
        const py = typeof payload?.y === 'number' && Number.isFinite(payload.y) ? clamp(payload.y, 80, 1120) : host.y;
        const fireworkShells =
          typeof payload?.fireworkShells === 'number' && Number.isFinite(payload.fireworkShells)
            ? Math.max(4, Math.min(24, Math.floor(payload.fireworkShells)))
            : 10;
        const palette =
          Array.isArray(payload?.palette) && payload.palette.length > 0
            ? payload.palette.slice(0, 6).map((c) => Number(c) || 0xfacc15)
            : [0xfacc15, 0x10b981, 0xf43f5e];

        this.broadcast('party:event', {
          partyId: `pty_${Date.now().toString(36)}_${client.sessionId.slice(0, 4)}`,
          hostName: host.name,
          kitId,
          mapId,
          mapLabel,
          x: px,
          y: py,
          fireworkShells,
          palette,
          expiresAt: Date.now() + 5 * 60_000,
        });
      }
    );
  }

  onJoin(
    client: Client,
    options?: {
      playerId?: string;
      name?: string;
      level?: number;
      stylish?: number;
      x?: number;
      y?: number;
      facing?: string;
      appearanceJson?: string;
      areaId?: string;
      kromTag?: string;
    }
  ): void {
    const player = new RemotePlayer();
    player.sessionId = client.sessionId;
    player.playerId = typeof options?.playerId === 'string' ? options.playerId.slice(0, 64) : '';
    player.name = sanitizeName(options?.name, `Villager_${client.sessionId.slice(0, 4)}`);
    player.level = typeof options?.level === 'number' ? Math.max(1, Math.floor(options.level)) : 1;
    player.stylish = typeof options?.stylish === 'number' ? Math.max(0, Math.floor(options.stylish)) : 168;
    player.x = clamp(typeof options?.x === 'number' ? options.x : 480, MAP_MIN_X, MAP_MAX_X);
    player.y = clamp(typeof options?.y === 'number' ? options.y : 405, MAP_MIN_Y, MAP_MAX_Y);
    player.facing =
      typeof options?.facing === 'string' && ALLOWED_FACINGS.has(options.facing)
        ? options.facing
        : 'down';
    player.isMoving = false;
    player.appearanceJson = sanitizeAppearance(options?.appearanceJson);
    player.areaId = this.state.areaId;
    player.kromTag =
      typeof options?.kromTag === 'string'
        ? options.kromTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)
        : '';

    this.state.players.set(client.sessionId, player);
    presenceRegistry.register({
      sessionId: client.sessionId,
      playerId: player.playerId,
      username: player.name,
      areaId: this.state.areaId,
      client,
    });
  }

  onLeave(client: Client): void {
    const cancelledTrade = tradeService.handleDisconnect(client.sessionId);
    if (cancelledTrade) {
      const partnerSid =
        cancelledTrade.sideA.sessionId === client.sessionId
          ? cancelledTrade.sideB.sessionId
          : cancelledTrade.sideA.sessionId;
      presenceRegistry.sendToTarget({ sessionId: partnerSid }, 'trade:cancelled', {
        tradeId: cancelledTrade.tradeId,
        reason: 'Your trading partner disconnected.',
      });
    }
    this.state.players.delete(client.sessionId);
    presenceRegistry.unregister(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
    this.lastEmoteAt.delete(client.sessionId);
  }

  onDispose(): void {
    PlazaRoom.activeRooms.delete(this);
  }
}

export function broadcastTukTukCartsUpdate(carts: unknown[]): void {
  PlazaRoom.activeRooms.forEach((room) => {
    room.broadcast('tukTukCartsUpdated', { carts });
  });
}

export function broadcastGmAnnouncement(payload: { text: string; actor: string; timestamp: number }): void {
  PlazaRoom.activeRooms.forEach((room) => {
    room.broadcast('gmAnnouncement', payload);
  });
}

export function broadcastGmEventTrigger(payload: {
  worldEventId?: string | null;
  festivalId?: string | null;
  actor: string;
  timestamp: number;
}): void {
  PlazaRoom.activeRooms.forEach((room) => {
    room.broadcast('gmEventTrigger', payload);
  });
}

export function broadcastKromWarUpdate(payload: { snapshot: unknown; bannerText?: string }): void {
  PlazaRoom.activeRooms.forEach((room) => {
    room.broadcast('kromWarUpdated', payload);
  });
}
