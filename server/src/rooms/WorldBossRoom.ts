import { Client, Room } from 'colyseus';
import { WorldBossPlayer, WorldBossState } from '../schema/WorldBossState';
import { broadcastGmAnnouncement } from './PlazaRoom';

export const WORLD_BOSS_INTERVAL_MS = 2 * 60 * 60 * 1000; // Every 2 hours
export const WORLD_BOSS_DURATION_MS = 15 * 60 * 1000;     // 15-minute raid window
export const WORLD_BOSS_SERVER_MAX_HP = 1_200_000;
export const WORLD_BOSS_ALERT_BANNER =
  '⚠️ WORLD BOSS ALERT: The Ancient Naga Colossus has awakened in the Sunken Ruins! All heroes unite!';

export interface ServerWorldBossSnapshot {
  active: boolean;
  raidId: string;
  hp: number;
  maxHp: number;
  playerCount: number;
  maxPlayers: number;
  exposedHeartActive: boolean;
  exposedHeartRemainingMs: number;
  startedAt: number;
  endsAt: number;
  remainingMs: number;
  nextScheduledAt: number;
  topDamagers: Array<{
    sessionId: string;
    name: string;
    damage: number;
    damagePct: number;
    rank: number;
  }>;
}

interface GlobalRaidRecord {
  active: boolean;
  raidId: string;
  hp: number;
  maxHp: number;
  exposedHeartActive: boolean;
  exposedHeartEndsAt: number;
  triggered50: boolean;
  triggered20: boolean;
  startedAt: number;
  endsAt: number;
  nextScheduledAt: number;
}

const globalRaid: GlobalRaidRecord = {
  active: false,
  raidId: '',
  hp: WORLD_BOSS_SERVER_MAX_HP,
  maxHp: WORLD_BOSS_SERVER_MAX_HP,
  exposedHeartActive: false,
  exposedHeartEndsAt: 0,
  triggered50: false,
  triggered20: false,
  startedAt: 0,
  endsAt: 0,
  nextScheduledAt: Date.now() + WORLD_BOSS_INTERVAL_MS,
};

let activeWorldBossRoom: WorldBossRoom | null = null;
let schedulerStarted = false;

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}

export function startWorldBossScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(() => {
    const now = Date.now();
    if (globalRaid.active && now >= globalRaid.endsAt) {
      globalRaid.active = false;
      globalRaid.nextScheduledAt = now + WORLD_BOSS_INTERVAL_MS;
      if (activeWorldBossRoom) {
        activeWorldBossRoom.state.active = false;
        activeWorldBossRoom.broadcast('raidEnded', { defeated: false });
      }
      return;
    }
    if (!globalRaid.active && now >= globalRaid.nextScheduledAt) {
      spawnWorldBossRaid('Scheduled 2-Hour Cycle');
    }
  }, 5000);
}

export function spawnWorldBossRaid(actor = 'Server'): ServerWorldBossSnapshot {
  const now = Date.now();
  globalRaid.active = true;
  globalRaid.raidId = `colossus_${now.toString(36)}`;
  globalRaid.maxHp = WORLD_BOSS_SERVER_MAX_HP;
  globalRaid.hp = WORLD_BOSS_SERVER_MAX_HP;
  globalRaid.exposedHeartActive = false;
  globalRaid.exposedHeartEndsAt = 0;
  globalRaid.triggered50 = false;
  globalRaid.triggered20 = false;
  globalRaid.startedAt = now;
  globalRaid.endsAt = now + WORLD_BOSS_DURATION_MS;
  globalRaid.nextScheduledAt = now + WORLD_BOSS_INTERVAL_MS;

  if (activeWorldBossRoom) {
    activeWorldBossRoom.resetForNewRaid();
  }

  broadcastGmAnnouncement({ text: WORLD_BOSS_ALERT_BANNER, actor, timestamp: now });
  return getWorldBossSnapshot();
}

export function getWorldBossSnapshot(): ServerWorldBossSnapshot {
  const now = Date.now();
  if (globalRaid.active && now >= globalRaid.endsAt) {
    globalRaid.active = false;
  }
  const topDamagers = activeWorldBossRoom ? activeWorldBossRoom.computeTopDamagers(5) : [];
  return {
    active: globalRaid.active,
    raidId: globalRaid.raidId,
    hp: Math.max(0, globalRaid.hp),
    maxHp: globalRaid.maxHp,
    playerCount: activeWorldBossRoom?.state?.players?.size ?? 0,
    maxPlayers: 20,
    exposedHeartActive: globalRaid.exposedHeartActive && now < globalRaid.exposedHeartEndsAt,
    exposedHeartRemainingMs: Math.max(0, globalRaid.exposedHeartEndsAt - now),
    startedAt: globalRaid.startedAt,
    endsAt: globalRaid.endsAt,
    remainingMs: globalRaid.active ? Math.max(0, globalRaid.endsAt - now) : 0,
    nextScheduledAt: globalRaid.nextScheduledAt,
    topDamagers,
  };
}

/**
 * Colyseus Server-Wide World Boss Raid Room:
 * Supports up to 20 simultaneous players fighting the Ancient Naga Colossus
 * with a shared server HP pool, Tidal Wave Sweep, Emerald Venom Rain,
 * and 50% / 20% Exposed Heart 2x Critical Damage phases!
 */
export class WorldBossRoom extends Room<WorldBossState> {
  maxClients = 20;
  private mechanicTimer?: ReturnType<typeof setInterval>;

  onCreate(): void {
    const now = Date.now();
    if (!globalRaid.active) {
      spawnWorldBossRaid('Auto-Spawn');
    }

    const state = new WorldBossState();
    state.raidId = globalRaid.raidId;
    state.active = globalRaid.active;
    state.startedAt = globalRaid.startedAt || now;
    state.endsAt = globalRaid.endsAt || now + WORLD_BOSS_DURATION_MS;
    state.boss.hp = globalRaid.hp;
    state.boss.maxHp = globalRaid.maxHp;
    state.boss.alive = globalRaid.hp > 0;
    state.boss.exposedHeartActive = globalRaid.exposedHeartActive;
    state.boss.exposedHeartEndsAt = globalRaid.exposedHeartEndsAt;

    this.setState(state);
    activeWorldBossRoom = this;

    // Periodic Raid Mechanics loop (Tidal Wave Sweep & Emerald Venom Rain + Exposed Heart expiry)
    let cycle = 0;
    this.mechanicTimer = setInterval(() => {
      const t = Date.now();
      if (!this.state.boss.alive || !this.state.active) return;

      if (globalRaid.exposedHeartActive && t >= globalRaid.exposedHeartEndsAt) {
        globalRaid.exposedHeartActive = false;
        this.state.boss.exposedHeartActive = false;
        this.state.boss.activeMechanic = 'idle';
      }

      if (!globalRaid.exposedHeartActive && this.state.players.size > 0) {
        cycle += 1;
        const mech = cycle % 2 === 1 ? 'tidal_wave' : 'venom_rain';
        this.state.boss.activeMechanic = mech;
        this.state.boss.mechanicSeed = t;
        this.broadcast('bossMechanic', {
          mechanic: mech,
          seed: t,
          direction: cycle % 4 < 2 ? 1 : -1,
        });
      }
    }, 6500);

    this.onMessage(
      'move',
      (
        client,
        payload: { x?: number; y?: number; facing?: string; pose?: string; hp?: number; maxHp?: number }
      ) => {
        const p = this.state.players.get(client.sessionId);
        if (!p || !payload || typeof payload !== 'object') return;
        if (typeof payload.x === 'number') p.x = Math.round(clamp(payload.x, 30, 1890) * 10) / 10;
        if (typeof payload.y === 'number') p.y = Math.round(clamp(payload.y, 40, 740) * 10) / 10;
        if (payload.facing === 'left' || payload.facing === 'right') p.facing = payload.facing;
        if (
          payload.pose === 'idle' ||
          payload.pose === 'walk1' ||
          payload.pose === 'walk2' ||
          payload.pose === 'jump' ||
          payload.pose === 'attack'
        ) {
          p.pose = payload.pose;
        }
        if (typeof payload.hp === 'number') p.hp = Math.max(0, Math.floor(payload.hp));
        if (typeof payload.maxHp === 'number') p.maxHp = Math.max(1, Math.floor(payload.maxHp));
      }
    );

    this.onMessage('bossHit', (client, payload: { damage?: number; isCrit?: boolean }) => {
      if (!this.state.boss.alive || !this.state.active) return;
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      const raw = typeof payload?.damage === 'number' && Number.isFinite(payload.damage)
        ? Math.max(1, Math.min(25_000, Math.floor(payload.damage)))
        : 0;
      if (raw <= 0) return;

      const nowMs = Date.now();
      const exposed = globalRaid.exposedHeartActive && nowMs < globalRaid.exposedHeartEndsAt;
      const applied = exposed ? raw * 2 : raw;

      globalRaid.hp = Math.max(0, globalRaid.hp - applied);
      this.state.boss.hp = globalRaid.hp;
      p.damageDealt += applied;

      const hpPct = globalRaid.hp / Math.max(1, globalRaid.maxHp);
      // Exposed Heart Phase at 50% & 20% HP: 10 seconds of 2x critical damage!
      if (
        (!globalRaid.triggered50 && hpPct <= 0.5 && hpPct > 0) ||
        (!globalRaid.triggered20 && hpPct <= 0.2 && hpPct > 0)
      ) {
        if (hpPct <= 0.2) globalRaid.triggered20 = true;
        else globalRaid.triggered50 = true;

        globalRaid.exposedHeartActive = true;
        globalRaid.exposedHeartEndsAt = nowMs + 10_000;
        this.state.boss.exposedHeartActive = true;
        this.state.boss.exposedHeartEndsAt = globalRaid.exposedHeartEndsAt;
        this.state.boss.activeMechanic = 'exposed_heart';

        this.broadcast('exposedHeart', {
          durationMs: 10_000,
          endsAt: globalRaid.exposedHeartEndsAt,
          thresholdPct: hpPct <= 0.2 ? 20 : 50,
        });
      }

      if (globalRaid.hp <= 0) {
        this.handleBossDefeated();
      }
    });
  }

  public resetForNewRaid(): void {
    this.state.raidId = globalRaid.raidId;
    this.state.active = true;
    this.state.startedAt = globalRaid.startedAt;
    this.state.endsAt = globalRaid.endsAt;
    this.state.boss.hp = globalRaid.hp;
    this.state.boss.maxHp = globalRaid.maxHp;
    this.state.boss.alive = true;
    this.state.boss.exposedHeartActive = false;
    this.state.boss.exposedHeartEndsAt = 0;
    this.state.boss.activeMechanic = 'idle';
    this.state.players.forEach((p) => {
      p.damageDealt = 0;
      p.joinedAt = Date.now();
    });
  }

  public computeTopDamagers(limit = 3): Array<{
    sessionId: string;
    name: string;
    damage: number;
    damagePct: number;
    rank: number;
  }> {
    const arr: Array<{ sessionId: string; name: string; damage: number }> = [];
    this.state.players.forEach((p, sid) => {
      arr.push({ sessionId: sid, name: p.name, damage: p.damageDealt });
    });
    arr.sort((a, b) => b.damage - a.damage);
    const maxHp = Math.max(1, globalRaid.maxHp);
    return arr.slice(0, limit).map((row, i) => ({
      ...row,
      damagePct: Math.round((row.damage / maxHp) * 10000) / 100,
      rank: i + 1,
    }));
  }

  private handleBossDefeated(): void {
    this.state.boss.alive = false;
    this.state.active = false;
    globalRaid.active = false;
    globalRaid.nextScheduledAt = Date.now() + WORLD_BOSS_INTERVAL_MS;

    const top3 = this.computeTopDamagers(3);
    const topNames = top3.map((r) => `#${r.rank} ${r.name} (${r.damagePct}%)`).join(' · ');
    if (topNames) {
      broadcastGmAnnouncement({
        text: `🏆 ANCIENT NAGA COLOSSUS SLAIN! Top 3 Colossus Slayers: ${topNames}!`,
        actor: 'World Boss Raid',
        timestamp: Date.now(),
      });
    }

    const now = Date.now();
    const rankings = this.computeTopDamagers(20);
    this.broadcast('colossusDefeated', {
      raidId: this.state.raidId,
      bossMaxHp: globalRaid.maxHp,
      top3,
      rankings: rankings.map((r) => {
        const pl = this.state.players.get(r.sessionId);
        return {
          ...r,
          survivedSec: pl ? Math.max(1, Math.floor((now - pl.joinedAt) / 1000)) : 0,
        };
      }),
    });
  }

  onJoin(
    client: Client,
    options: {
      playerId?: string;
      name?: string;
      hp?: number;
      maxHp?: number;
      appearanceJson?: string;
      activeClass?: string;
    }
  ): void {
    const p = new WorldBossPlayer();
    p.sessionId = client.sessionId;
    p.playerId = typeof options?.playerId === 'string' ? options.playerId.slice(0, 64) : '';
    p.name =
      typeof options?.name === 'string' && options.name.trim()
        ? options.name.trim().slice(0, 20)
        : `Hero_${client.sessionId.slice(0, 4)}`;
    p.hp = typeof options?.hp === 'number' ? Math.max(1, Math.floor(options.hp)) : 150;
    p.maxHp = typeof options?.maxHp === 'number' ? Math.max(1, Math.floor(options.maxHp)) : 150;
    p.x = 240 + Math.floor(Math.random() * 240);
    p.y = 580;
    p.appearanceJson =
      typeof options?.appearanceJson === 'string' && options.appearanceJson.length <= 2000
        ? options.appearanceJson
        : '{}';
    p.activeClass = typeof options?.activeClass === 'string' ? options.activeClass : 'lbokator';
    p.joinedAt = Date.now();

    this.state.players.set(client.sessionId, p);
    this.state.playerCount = this.state.players.size;
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.state.playerCount = this.state.players.size;
  }

  onDispose(): void {
    if (this.mechanicTimer) clearInterval(this.mechanicTimer);
    if (activeWorldBossRoom === this) {
      activeWorldBossRoom = null;
    }
  }
}
