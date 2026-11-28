import { Client, Room } from 'colyseus';
import { pushTickerEvent } from '../economy/reforgeService';

export type FolkTeam = 'red' | 'gold';

interface TugParticipant {
  sessionId: string;
  name: string;
  team: FolkTeam;
  pulls: number;
  lastPullAt: number;
}

/**
 * Update 3.4 — Khmer Village Folk Games Live Multiplayer Room:
 * - Syncs Teanh Prot (Khmer Tug of War, up to 4v4) with real-time rope position (-100..+100),
 *   rhythm pull power, Coin pot payouts, and Tug-of-War Champion victory broadcasts.
 * - Also relays Bos Angkunh 1v1 turn toss results between courtyard challengers.
 */
export class FolkGamesRoom extends Room {
  maxClients = 16;
  private tugPlayers = new Map<string, TugParticipant>();
  private ropePos = 0; // -100 = Red wins, +100 = Gold wins
  private tugStatus: 'waiting' | 'active' | 'finished' = 'waiting';
  private winnerTeam: FolkTeam | null = null;
  private lastWinnerSummary = 'Join Team Red or Team Gold & tap Space in rhythm to pull!';

  onCreate(): void {
    this.setMetadata({ kind: 'folk_games' });

    this.onMessage('tug:join', (client, payload: { name?: string; team?: FolkTeam }) => {
      const redCount = Array.from(this.tugPlayers.values()).filter((p) => p.team === 'red').length;
      const goldCount = Array.from(this.tugPlayers.values()).filter((p) => p.team === 'gold').length;
      const chosen: FolkTeam =
        payload?.team === 'red' || payload?.team === 'gold'
          ? payload.team
          : redCount <= goldCount
            ? 'red'
            : 'gold';

      const teamCount = chosen === 'red' ? redCount : goldCount;
      const finalTeam: FolkTeam = teamCount >= 4 ? (chosen === 'red' ? 'gold' : 'red') : chosen;

      this.tugPlayers.set(client.sessionId, {
        sessionId: client.sessionId,
        name: (payload?.name || 'Villager').slice(0, 22),
        team: finalTeam,
        pulls: 0,
        lastPullAt: 0,
      });

      if (this.tugStatus !== 'active') {
        this.ropePos = 0;
        this.tugStatus = 'active';
        this.winnerTeam = null;
      }
      this.broadcastTugSnapshot();
    });

    this.onMessage('tug:pull', (client) => {
      const p = this.tugPlayers.get(client.sessionId);
      if (!p || this.tugStatus !== 'active') return;
      const now = Date.now();
      // Anti-macro rate guard (~11 taps/sec max)
      if (now - p.lastPullAt < 85) return;
      p.lastPullAt = now;
      p.pulls += 1;

      const delta = p.team === 'red' ? -4.8 : 4.8;
      this.ropePos = Math.max(-100, Math.min(100, this.ropePos + delta));

      if (this.ropePos <= -100 || this.ropePos >= 100) {
        this.tugStatus = 'finished';
        this.winnerTeam = this.ropePos <= -100 ? 'red' : 'gold';
        const teamLabel = this.winnerTeam === 'red' ? 'Red Krama Team' : 'Golden Lotus Team';
        const winners = Array.from(this.tugPlayers.values())
          .filter((x) => x.team === this.winnerTeam)
          .map((x) => x.name);
        this.lastWinnerSummary = `🏆 ${teamLabel} won Teanh Prot Tug of War! (${winners.join(', ') || 'Champions'})`;
        pushTickerEvent(`🪢 ${this.lastWinnerSummary}`, 'club');
        this.broadcast('tug:finished', {
          winnerTeam: this.winnerTeam,
          potCoins: 180 + this.tugPlayers.size * 40,
          summary: this.lastWinnerSummary,
        });
        this.clock.setTimeout(() => {
          this.ropePos = 0;
          this.winnerTeam = null;
          this.tugStatus = this.tugPlayers.size > 0 ? 'active' : 'waiting';
          for (const pl of this.tugPlayers.values()) pl.pulls = 0;
          this.broadcastTugSnapshot();
        }, 4000);
      }

      this.broadcastTugSnapshot();
    });

    this.onMessage('angkunh:toss', (client, payload: { name?: string; knockedCount?: number; forfeited?: boolean }) => {
      this.broadcast(
        'angkunh:tossResult',
        {
          sessionId: client.sessionId,
          name: (payload?.name || 'Villager').slice(0, 22),
          knockedCount: Number(payload?.knockedCount ?? 0),
          forfeited: Boolean(payload?.forfeited),
        },
        { except: client }
      );
    });
  }

  onJoin(client: Client): void {
    client.send('tug:snapshot', this.buildSnapshot());
  }

  onLeave(client: Client): void {
    this.tugPlayers.delete(client.sessionId);
    if (this.tugPlayers.size === 0) {
      this.ropePos = 0;
      this.tugStatus = 'waiting';
      this.winnerTeam = null;
    }
    this.broadcastTugSnapshot();
  }

  private buildSnapshot() {
    const players = Array.from(this.tugPlayers.values());
    return {
      ropePos: Math.round(this.ropePos * 10) / 10,
      status: this.tugStatus,
      winnerTeam: this.winnerTeam,
      summary: this.lastWinnerSummary,
      redTeam: players.filter((p) => p.team === 'red').map((p) => ({ name: p.name, pulls: p.pulls })),
      goldTeam: players.filter((p) => p.team === 'gold').map((p) => ({ name: p.name, pulls: p.pulls })),
    };
  }

  private broadcastTugSnapshot(): void {
    this.broadcast('tug:snapshot', this.buildSnapshot());
  }
}
