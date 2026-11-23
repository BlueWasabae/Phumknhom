import { Client, Room } from 'colyseus';
import { ClubPlayer, ClubState } from '../schema/ClubState';
import { pushTickerEvent } from '../economy/reforgeService';

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}

/**
 * Synced Indoor Village Club Room:
 * Supports live player movement, chat/emotes, and synchronized Tien Len & Ouk Chaktrang tables.
 */
export class ClubRoom extends Room<ClubState> {
  maxClients = 32;

  onCreate(options: { cityServer?: string }): void {
    const city =
      options?.cityServer === 'siem_reap' || options?.cityServer === 'kampot'
        ? options.cityServer
        : 'phnom_penh';

    const state = new ClubState();
    state.cityServer = city;
    this.setState(state);
    this.setMetadata({ cityServer: city });

    this.onMessage('move', (client, payload: { x?: number; y?: number; facing?: string; isMoving?: boolean }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !payload || typeof payload !== 'object') return;
      if (typeof payload.x === 'number') p.x = Math.round(clamp(payload.x, 40, 760) * 10) / 10;
      if (typeof payload.y === 'number') p.y = Math.round(clamp(payload.y, 110, 520) * 10) / 10;
      if (payload.facing === 'up' || payload.facing === 'down' || payload.facing === 'left' || payload.facing === 'right') {
        p.facing = payload.facing;
      }
      if (typeof payload.isMoving === 'boolean') p.isMoving = payload.isMoving;
    });

    this.onMessage('chat', (client, payload: { text?: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || typeof payload?.text !== 'string') return;
      const text = payload.text.trim().slice(0, 120);
      if (!text) return;
      this.broadcast('chat', {
        sessionId: client.sessionId,
        name: p.name,
        text,
        timestamp: Date.now(),
      });
    });

    this.onMessage('emote', (client, payload: { emoji?: string }) => {
      if (typeof payload?.emoji !== 'string') return;
      this.broadcast('emote', { sessionId: client.sessionId, emoji: payload.emoji.slice(0, 8) });
    });

    this.onMessage('tienLenPlay', (client, payload: { cardLabel?: string; wonRound?: boolean }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const card = String(payload?.cardLabel || '2♠').slice(0, 24);
      this.state.tienLenLastPlay = `${p.name} played ${card}`;
      if (payload?.wonRound) {
        this.state.tienLenWinner = p.name;
        pushTickerEvent(`🃏 ${p.name} won a Tien Len table match in the Village Club!`, 'club');
      }
      this.broadcast('clubTableUpdate', {
        game: 'tien_len',
        summary: this.state.tienLenLastPlay,
        winner: this.state.tienLenWinner,
      });
    });

    this.onMessage('oukMove', (client, payload: { moveNotation?: string; checkmate?: boolean }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const move = String(payload?.moveNotation || 'Neang → D4').slice(0, 32);
      this.state.oukTurnCount += 1;
      this.state.oukLastMove = `${p.name}: ${move}`;
      if (payload?.checkmate) {
        pushTickerEvent(`♟️ ${p.name} scored Checkmate in Ouk Chaktrang (Khmer Chess)!`, 'club');
      }
      this.broadcast('clubTableUpdate', {
        game: 'ouk_chaktrang',
        summary: this.state.oukLastMove,
        turnCount: this.state.oukTurnCount,
      });
    });
  }

  onJoin(
    client: Client,
    options?: { playerId?: string; name?: string; appearanceJson?: string }
  ): void {
    const p = new ClubPlayer();
    p.sessionId = client.sessionId;
    p.playerId = typeof options?.playerId === 'string' ? options.playerId.slice(0, 64) : '';
    p.name =
      typeof options?.name === 'string' && options.name.trim()
        ? options.name.trim().slice(0, 20)
        : `ClubGuest_${client.sessionId.slice(0, 4)}`;
    p.x = 390 + (Math.random() - 0.5) * 60;
    p.y = 430;
    p.appearanceJson =
      typeof options?.appearanceJson === 'string' && options.appearanceJson.length <= 2048
        ? options.appearanceJson
        : '{}';
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
  }
}
