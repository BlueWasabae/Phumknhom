import {
  WORLD_BOSS_ALERT_BANNER,
  WORLD_BOSS_DURATION_MS,
  WORLD_BOSS_INTERVAL_MS,
  WORLD_BOSS_MAX_PLAYERS,
  WORLD_BOSS_SOLO_PREVIEW_HP,
  type WorldBossStatusSnapshot,
} from '@shared/worldBossData';
import { EventBus } from '../EventBus';

type Listener = (snap: WorldBossStatusSnapshot) => void;

class WorldBossManager {
  private status: WorldBossStatusSnapshot = {
    active: false,
    raidId: '',
    hp: WORLD_BOSS_SOLO_PREVIEW_HP,
    maxHp: WORLD_BOSS_SOLO_PREVIEW_HP,
    playerCount: 0,
    maxPlayers: WORLD_BOSS_MAX_PLAYERS,
    exposedHeartActive: false,
    exposedHeartRemainingMs: 0,
    startedAt: 0,
    endsAt: 0,
    remainingMs: 0,
    nextScheduledAt: Date.now() + WORLD_BOSS_INTERVAL_MS,
    topDamagers: [],
  };

  private listeners = new Set<Listener>();
  private tickTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.tickTimer = window.setInterval(() => this.tick(), 1000);
    }
  }

  public getStatus(): WorldBossStatusSnapshot {
    const now = Date.now();
    if (this.status.active && now >= this.status.endsAt) {
      this.status = {
        ...this.status,
        active: false,
        remainingMs: 0,
        nextScheduledAt: now + WORLD_BOSS_INTERVAL_MS,
      };
    }
    return {
      ...this.status,
      remainingMs: this.status.active ? Math.max(0, this.status.endsAt - now) : 0,
      exposedHeartRemainingMs: this.status.exposedHeartActive
        ? Math.max(0, this.status.exposedHeartRemainingMs)
        : 0,
    };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getStatus();
    EventBus.emit('worldBoss:changed', snap);
    for (const l of this.listeners) {
      l(snap);
    }
  }

  public syncFromServer(snap: Partial<WorldBossStatusSnapshot>): void {
    const wasActive = this.status.active;
    this.status = {
      ...this.status,
      ...snap,
    };
    if (!wasActive && this.status.active) {
      EventBus.emit('ticker:push', { text: WORLD_BOSS_ALERT_BANNER, category: 'boss' });
    }
    this.notify();
  }

  public spawnNow(manual = true): WorldBossStatusSnapshot {
    const now = Date.now();
    this.status = {
      active: true,
      raidId: `colossus_${now.toString(36)}`,
      hp: WORLD_BOSS_SOLO_PREVIEW_HP,
      maxHp: WORLD_BOSS_SOLO_PREVIEW_HP,
      playerCount: Math.max(1, this.status.playerCount),
      maxPlayers: WORLD_BOSS_MAX_PLAYERS,
      exposedHeartActive: false,
      exposedHeartRemainingMs: 0,
      startedAt: now,
      endsAt: now + WORLD_BOSS_DURATION_MS,
      remainingMs: WORLD_BOSS_DURATION_MS,
      nextScheduledAt: now + WORLD_BOSS_INTERVAL_MS,
      topDamagers: [],
    };

    EventBus.emit('ticker:push', {
      text: WORLD_BOSS_ALERT_BANNER,
      category: 'boss',
    });
    EventBus.emit('ui:toast', {
      text: `🐉 WORLD BOSS AWAKENED! Click "Join World Boss" or enter the Colossus Portal in Sunken Ruins!${
        manual ? ' [Summoned]' : ''
      }`,
    });
    this.notify();
    return this.getStatus();
  }

  public updateLiveRaidProgress(patch: Partial<WorldBossStatusSnapshot>): void {
    this.status = {
      ...this.status,
      ...patch,
    };
    this.notify();
  }

  public markDefeated(): void {
    const now = Date.now();
    this.status = {
      ...this.status,
      active: false,
      hp: 0,
      remainingMs: 0,
      exposedHeartActive: false,
      exposedHeartRemainingMs: 0,
      nextScheduledAt: now + WORLD_BOSS_INTERVAL_MS,
    };
    this.notify();
  }

  private tick(): void {
    const now = Date.now();
    if (this.status.active) {
      if (now >= this.status.endsAt) {
        this.status.active = false;
        this.status.remainingMs = 0;
        this.status.nextScheduledAt = now + WORLD_BOSS_INTERVAL_MS;
        this.notify();
      } else {
        this.notify();
      }
      return;
    }

    if (now >= this.status.nextScheduledAt) {
      this.spawnNow(false);
    }
  }

  public destroy(): void {
    if (this.tickTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}

export const worldBossManager = new WorldBossManager();
