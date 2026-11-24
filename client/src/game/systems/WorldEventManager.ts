import {
  WORLD_EVENTS,
  type ActiveWorldEventSnapshot,
  type WorldEventId,
} from '@shared/worldEvents';
import { EventBus } from '../EventBus';
import { seasonClock } from './SeasonClock';

type Listener = (snap: ActiveWorldEventSnapshot | null) => void;

const AUTO_EVENT_COOLDOWN_MS = 240_000; // 4 minutes between automatic events

class WorldEventManager {
  private active: ActiveWorldEventSnapshot | null = null;
  private listeners = new Set<Listener>();
  private tickTimer: number | null = null;
  private nextAutoTriggerAt = Date.now() + 95_000;
  private rotationCounter = 1;
  private lastPeriod: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.tickTimer = window.setInterval(() => this.tick(), 1000);
    }
  }

  public getActiveEvent(): ActiveWorldEventSnapshot | null {
    if (!this.active) return null;
    const rem = Math.max(0, this.active.endsAt - Date.now());
    if (rem <= 0) {
      this.endActiveEvent(true);
      return null;
    }
    return { ...this.active, remainingMs: rem };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getActiveEvent());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getActiveEvent();
    for (const l of this.listeners) {
      l(snap);
    }
  }

  public triggerEvent(eventId: WorldEventId, manual = false): ActiveWorldEventSnapshot {
    const def = WORLD_EVENTS[eventId];
    const now = Date.now();
    this.rotationCounter += 1;
    const goal = eventId === 'golden_frog_rain' ? 15 : eventId === 'crimson_eclipse' ? 12 : 3;

    this.active = {
      eventId,
      def,
      startedAt: now,
      endsAt: now + def.durationMs,
      remainingMs: def.durationMs,
      progressCount: 0,
      progressGoal: goal,
      bossSummoned: false,
      bossDefeated: false,
      merchantRotationSeed: this.rotationCounter,
    };
    this.nextAutoTriggerAt = now + def.durationMs + AUTO_EVENT_COOLDOWN_MS;

    EventBus.emit('ticker:push', {
      text: def.bannerText,
      category: 'weather',
    });
    EventBus.emit('ui:toast', {
      text: `${def.icon} World Event Started: ${def.name} (${Math.round(def.durationMs / 60000)} min)!${
        manual ? ' [Test Trigger]' : ''
      }`,
    });
    EventBus.emit('worldEvent:changed', this.getActiveEvent());
    this.notify();
    return this.getActiveEvent()!;
  }

  public clearEvent(): void {
    if (!this.active) return;
    this.endActiveEvent(false);
  }

  public recordProgress(delta = 1): { summonedBossNow: boolean; snap: ActiveWorldEventSnapshot | null } {
    if (!this.active) return { summonedBossNow: false, snap: null };
    this.active.progressCount = Math.min(this.active.progressGoal, this.active.progressCount + delta);

    let summonedBossNow = false;
    if (
      this.active.eventId === 'golden_frog_rain' &&
      !this.active.bossSummoned &&
      this.active.progressCount >= this.active.progressGoal
    ) {
      this.active.bossSummoned = true;
      summonedBossNow = true;
      EventBus.emit('ticker:push', {
        text: '👑 GOLDEN SDECH KONGKAEB has materialized in the Frontier! Defeat it for Coins, Gold & Rain-Caller Umbrella!',
        category: 'boss',
      });
      EventBus.emit('ui:toast', {
        text: '👑 15 Golden Frogs defeated! Empowered Golden Sdech Kongkaeb has appeared!',
      });
    }

    const snap = this.getActiveEvent();
    EventBus.emit('worldEvent:changed', snap);
    this.notify();
    return { summonedBossNow, snap };
  }

  public markBossDefeated(): void {
    if (!this.active) return;
    this.active.bossDefeated = true;
    const snap = this.getActiveEvent();
    EventBus.emit('worldEvent:changed', snap);
    this.notify();
  }

  private endActiveEvent(expired: boolean): void {
    const prev = this.active;
    this.active = null;
    if (prev && expired) {
      EventBus.emit('ui:toast', {
        text: `${prev.def.icon} ${prev.def.name} has concluded across Phum Khnhom.`,
      });
    }
    EventBus.emit('worldEvent:changed', null);
    this.notify();
  }

  private tick(): void {
    const now = Date.now();
    if (this.active) {
      if (now >= this.active.endsAt) {
        this.endActiveEvent(true);
      } else {
        this.notify();
      }
      return;
    }

    // Automatically trigger Khmer Night Market upon entering nightfall
    const clock = seasonClock.getSnapshot(now);
    if (this.lastPeriod && this.lastPeriod !== 'night' && clock.period === 'night') {
      this.lastPeriod = clock.period;
      this.triggerEvent('khmer_night_market', false);
      return;
    }
    this.lastPeriod = clock.period;

    if (now >= this.nextAutoTriggerAt) {
      const pool: WorldEventId[] = ['crimson_eclipse', 'golden_frog_rain', 'khmer_night_market'];
      const chosen = pool[this.rotationCounter % pool.length];
      this.triggerEvent(chosen, false);
    }
  }

  public destroy(): void {
    if (this.tickTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}

export const worldEventManager = new WorldEventManager();
