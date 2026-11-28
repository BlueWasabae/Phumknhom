import { Client, Room } from 'colyseus';
import { MapSchema, Schema, type } from '@colyseus/schema';

export type ArenaDuelMode = 'normalized' | 'open';

export class ArenaFighterSchema extends Schema {
  @type('string') sessionId = '';
  @type('string') playerId = '';
  @type('string') name = 'Fighter';
  @type('string') side = 'left'; // 'left' | 'right'
  @type('number') x = 280;
  @type('number') y = 330;
  @type('string') facing = 'right';
  @type('string') pose = 'idle';
  @type('number') hp = 1000;
  @type('number') maxHp = 1000;
  @type('number') atk = 85;
  @type('number') defense = 12;
  @type('number') elo = 1200;
  @type('string') activeClass = 'lbokator';
  @type('string') appearanceJson = '{}';
  @type('number') roundsWon = 0;
  @type('boolean') alive = true;
}

export class ArenaState extends Schema {
  @type('string') duelId = 'public_ring';
  @type('string') mode = 'normalized'; // 'normalized' | 'open'
  @type('string') phase = 'waiting'; // 'waiting' | 'countdown' | 'fighting' | 'round_over' | 'match_over'
  @type('number') roundNumber = 1;
  @type('number') countdownSec = 3;
  @type('string') winnerSessionId = '';
  @type('string') winnerName = '';
  @type('number') spectatorCount = 0;
  @type({ map: ArenaFighterSchema }) fighters = new MapSchema<ArenaFighterSchema>();
}

const NORMALIZED_MAX_HP = 1000;
const NORMALIZED_ATK = 85;
const NORMALIZED_DEF = 12;

/**
 * Update 3.1 — Kun Khmer 1v1 Sparring Ring Colyseus Room (`ArenaRoom`)
 * - Supports Normalized 1v1 Duels (equalized 1000 HP / 85 ATK / 12 DEF — pure skill, 0 P2W!)
 *   and Open Gear Duels (friendly sparring with full Awakened Weapons & gear stats).
 * - Best-of-3 rounds with authoritative round scoring, 3-2-1 countdown, live spectators, and ELO delta broadcast.
 */
export class ArenaRoom extends Room<ArenaState> {
  maxClients = 14; // 2 fighters + up to 12 live spectators
  private spectators = new Set<string>();
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  onCreate(options?: { duelId?: string; mode?: string }): void {
    const state = new ArenaState();
    state.duelId =
      typeof options?.duelId === 'string' && options.duelId.trim()
        ? options.duelId.trim().slice(0, 48)
        : 'public_ring';
    state.mode = options?.mode === 'open' ? 'open' : 'normalized';
    this.setState(state);
    this.setMetadata({ duelId: state.duelId, mode: state.mode });

    this.onMessage(
      'move',
      (
        client,
        payload: { x?: number; y?: number; facing?: string; pose?: string; aimAngle?: number | null }
      ) => {
        const fighter = this.state.fighters.get(client.sessionId);
        if (!fighter || !payload) return;
        if (typeof payload.x === 'number' && Number.isFinite(payload.x)) {
          fighter.x = Math.max(120, Math.min(840, Math.round(payload.x)));
        }
        if (typeof payload.y === 'number' && Number.isFinite(payload.y)) {
          fighter.y = Math.max(175, Math.min(485, Math.round(payload.y)));
        }
        if (
          payload.facing === 'left' ||
          payload.facing === 'right' ||
          payload.facing === 'up' ||
          payload.facing === 'down'
        ) {
          fighter.facing = payload.facing;
        }
        if (typeof payload.pose === 'string') {
          fighter.pose = payload.pose.slice(0, 16);
        }
      }
    );

    this.onMessage(
      'action',
      (
        client,
        payload: {
          kind?: 'attack' | 'dash' | 'grapple' | 'signature';
          aimAngle?: number;
          x?: number;
          y?: number;
        }
      ) => {
        const fighter = this.state.fighters.get(client.sessionId);
        if (!fighter || !payload?.kind) return;
        this.broadcast(
          'arena:action',
          {
            sessionId: client.sessionId,
            kind: payload.kind,
            aimAngle: typeof payload.aimAngle === 'number' ? payload.aimAngle : 0,
            x: typeof payload.x === 'number' ? payload.x : fighter.x,
            y: typeof payload.y === 'number' ? payload.y : fighter.y,
            classId: fighter.activeClass,
          },
          { except: client }
        );
      }
    );

    this.onMessage(
      'hit',
      (client, payload: { targetSessionId?: string; damage?: number; isCrit?: boolean; kind?: string }) => {
        if (this.state.phase !== 'fighting') return;
        const attacker = this.state.fighters.get(client.sessionId);
        const targetSid = typeof payload?.targetSessionId === 'string' ? payload.targetSessionId : '';
        const target = targetSid ? this.state.fighters.get(targetSid) : undefined;
        if (!attacker || !target || attacker.sessionId === target.sessionId || !target.alive) return;

        const maxAllowed =
          this.state.mode === 'normalized'
            ? Math.round(NORMALIZED_ATK * 2.4)
            : Math.max(220, Math.round(attacker.atk * 3.1));
        const raw = Math.max(12, Math.min(maxAllowed, Math.round(Number(payload.damage ?? attacker.atk))));
        const reduced = Math.max(10, Math.round(raw - target.defense * 0.35));
        target.hp = Math.max(0, target.hp - reduced);

        this.broadcast('arena:hit', {
          attackerSessionId: attacker.sessionId,
          targetSessionId: target.sessionId,
          damage: reduced,
          isCrit: Boolean(payload.isCrit),
          kind: payload.kind || 'attack',
          targetHp: target.hp,
          targetMaxHp: target.maxHp,
        });

        if (target.hp <= 0) {
          target.alive = false;
          this.finishRound(attacker);
        }
      }
    );

    this.onMessage('cheer', (client, payload: { emoji?: string }) => {
      const emoji = typeof payload?.emoji === 'string' ? payload.emoji.slice(0, 6) : '🥊';
      this.broadcast('arena:cheer', {
        sessionId: client.sessionId,
        emoji,
      });
    });

    this.onMessage('rematch', () => {
      if (this.state.phase === 'match_over' && this.state.fighters.size >= 2) {
        this.state.roundNumber = 1;
        this.state.winnerSessionId = '';
        this.state.winnerName = '';
        this.state.fighters.forEach((f) => {
          f.roundsWon = 0;
        });
        this.startRoundCountdown();
      }
    });
  }

  onJoin(
    client: Client,
    options?: {
      role?: 'fighter' | 'spectator';
      playerId?: string;
      name?: string;
      activeClass?: string;
      appearanceJson?: string;
      maxHp?: number;
      atk?: number;
      defense?: number;
      elo?: number;
    }
  ): void {
    const wantsSpectate = options?.role === 'spectator' || this.state.fighters.size >= 2;
    if (wantsSpectate) {
      this.spectators.add(client.sessionId);
      this.state.spectatorCount = this.spectators.size;
      client.send('arena:role', { role: 'spectator' });
      return;
    }

    const side = Array.from(this.state.fighters.values()).some((f) => f.side === 'left') ? 'right' : 'left';
    const fighter = new ArenaFighterSchema();
    fighter.sessionId = client.sessionId;
    fighter.playerId = typeof options?.playerId === 'string' ? options.playerId.slice(0, 64) : '';
    fighter.name =
      typeof options?.name === 'string' && options.name.trim()
        ? options.name.trim().slice(0, 20)
        : `Fighter_${client.sessionId.slice(0, 4)}`;
    fighter.side = side;
    fighter.x = side === 'left' ? 280 : 680;
    fighter.y = 330;
    fighter.facing = side === 'left' ? 'right' : 'left';
    fighter.activeClass = typeof options?.activeClass === 'string' ? options.activeClass.slice(0, 20) : 'lbokator';
    fighter.appearanceJson =
      typeof options?.appearanceJson === 'string' && options.appearanceJson.length <= 2048
        ? options.appearanceJson
        : '{}';
    fighter.elo = typeof options?.elo === 'number' && Number.isFinite(options.elo) ? Math.round(options.elo) : 1200;

    if (this.state.mode === 'normalized') {
      fighter.maxHp = NORMALIZED_MAX_HP;
      fighter.hp = NORMALIZED_MAX_HP;
      fighter.atk = NORMALIZED_ATK;
      fighter.defense = NORMALIZED_DEF;
    } else {
      const openHp = Math.max(600, Math.min(4000, Math.round(Number(options?.maxHp ?? 1200))));
      fighter.maxHp = openHp;
      fighter.hp = openHp;
      fighter.atk = Math.max(40, Math.min(450, Math.round(Number(options?.atk ?? 110))));
      fighter.defense = Math.max(5, Math.min(180, Math.round(Number(options?.defense ?? 20))));
    }

    this.state.fighters.set(client.sessionId, fighter);
    client.send('arena:role', { role: 'fighter', side });

    if (this.state.fighters.size === 2 && this.state.phase === 'waiting') {
      this.startRoundCountdown();
    }
  }

  private clearTimers(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startRoundCountdown(): void {
    this.clearTimers();
    this.state.phase = 'countdown';
    this.state.countdownSec = 3;

    this.state.fighters.forEach((f) => {
      f.hp = f.maxHp;
      f.alive = true;
      f.x = f.side === 'left' ? 280 : 680;
      f.y = 330;
      f.facing = f.side === 'left' ? 'right' : 'left';
      f.pose = 'idle';
    });

    this.broadcast('arena:roundCountdown', {
      roundNumber: this.state.roundNumber,
      countdownSec: 3,
    });

    this.countdownInterval = setInterval(() => {
      this.state.countdownSec = Math.max(0, this.state.countdownSec - 1);
      if (this.state.countdownSec <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        this.state.phase = 'fighting';
        this.broadcast('arena:fightStart', { roundNumber: this.state.roundNumber });
      } else {
        this.broadcast('arena:roundCountdown', {
          roundNumber: this.state.roundNumber,
          countdownSec: this.state.countdownSec,
        });
      }
    }, 950);
  }

  private finishRound(winner: ArenaFighterSchema): void {
    this.clearTimers();
    winner.roundsWon += 1;

    if (winner.roundsWon >= 2 || this.state.roundNumber >= 3) {
      this.state.phase = 'match_over';
      this.state.winnerSessionId = winner.sessionId;
      this.state.winnerName = winner.name;

      const list = Array.from(this.state.fighters.values());
      const loser = list.find((f) => f.sessionId !== winner.sessionId);
      const expectedWin = loser ? 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400)) : 0.5;
      const eloDelta = Math.max(12, Math.min(36, Math.round(32 * (1 - expectedWin))));

      this.broadcast('arena:matchOver', {
        winnerSessionId: winner.sessionId,
        winnerName: winner.name,
        loserSessionId: loser?.sessionId ?? '',
        loserName: loser?.name ?? '',
        eloGain: eloDelta,
        eloLoss: Math.max(8, Math.round(eloDelta * 0.75)),
        mode: this.state.mode,
      });
      return;
    }

    this.state.phase = 'round_over';
    this.broadcast('arena:roundOver', {
      roundNumber: this.state.roundNumber,
      winnerSessionId: winner.sessionId,
      winnerName: winner.name,
    });

    this.roundTimer = setTimeout(() => {
      this.state.roundNumber += 1;
      this.startRoundCountdown();
    }, 2200);
  }

  onLeave(client: Client): void {
    if (this.spectators.delete(client.sessionId)) {
      this.state.spectatorCount = this.spectators.size;
      return;
    }
    this.state.fighters.delete(client.sessionId);
    if (this.state.fighters.size < 2 && this.state.phase !== 'match_over') {
      const remaining = Array.from(this.state.fighters.values())[0];
      if (remaining && this.state.phase === 'fighting') {
        remaining.roundsWon = 2;
        this.finishRound(remaining);
      } else {
        this.clearTimers();
        this.state.phase = 'waiting';
      }
    }
  }

  onDispose(): void {
    this.clearTimers();
  }
}
