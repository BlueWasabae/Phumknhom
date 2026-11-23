import type { Client } from 'colyseus';

export interface OnlineSessionRecord {
  sessionId: string;
  playerId: string;
  username: string;
  areaId: string;
  client: Client;
}

/**
 * In-memory live presence registry across all active Colyseus PlazaRoom Areas (AREA 0–2).
 * Powers live Online/Offline friend badges and cross-area direct whispers/invites.
 */
class PresenceRegistry {
  private bySession = new Map<string, OnlineSessionRecord>();
  private byPlayerId = new Map<string, OnlineSessionRecord>();
  private byUsernameLower = new Map<string, OnlineSessionRecord>();

  public register(rec: OnlineSessionRecord): void {
    this.unregister(rec.sessionId);
    this.bySession.set(rec.sessionId, rec);
    if (rec.playerId) {
      this.byPlayerId.set(rec.playerId, rec);
    }
    if (rec.username) {
      this.byUsernameLower.set(rec.username.toLowerCase(), rec);
    }
  }

  public updateName(sessionId: string, username: string): void {
    const rec = this.bySession.get(sessionId);
    if (!rec) return;
    if (rec.username) {
      this.byUsernameLower.delete(rec.username.toLowerCase());
    }
    rec.username = username;
    this.byUsernameLower.set(username.toLowerCase(), rec);
  }

  public unregister(sessionId: string): void {
    const rec = this.bySession.get(sessionId);
    if (!rec) return;
    this.bySession.delete(sessionId);
    if (rec.playerId && this.byPlayerId.get(rec.playerId)?.sessionId === sessionId) {
      this.byPlayerId.delete(rec.playerId);
    }
    if (rec.username && this.byUsernameLower.get(rec.username.toLowerCase())?.sessionId === sessionId) {
      this.byUsernameLower.delete(rec.username.toLowerCase());
    }
  }

  public getByPlayerId(playerId: string): OnlineSessionRecord | undefined {
    return this.byPlayerId.get(playerId);
  }

  public getByUsername(username: string): OnlineSessionRecord | undefined {
    return this.byUsernameLower.get(username.trim().toLowerCase());
  }

  public getBySessionId(sessionId: string): OnlineSessionRecord | undefined {
    return this.bySession.get(sessionId);
  }

  public sendToTarget(
    target: { sessionId?: string; playerId?: string; username?: string },
    type: string,
    payload: unknown
  ): OnlineSessionRecord | null {
    const rec =
      (target.sessionId ? this.bySession.get(target.sessionId) : undefined) ??
      (target.playerId ? this.byPlayerId.get(target.playerId) : undefined) ??
      (target.username ? this.byUsernameLower.get(target.username.trim().toLowerCase()) : undefined);
    if (!rec) return null;
    try {
      rec.client.send(type, payload);
      return rec;
    } catch {
      return null;
    }
  }
}

export const presenceRegistry = new PresenceRegistry();
