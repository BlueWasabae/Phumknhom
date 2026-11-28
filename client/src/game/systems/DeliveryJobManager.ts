import type { VillageMapId } from '@shared/worldMapData';

export interface DeliveryOrderStop {
  id: string;
  itemName: string;
  recipientName: string;
  icon: string;
  mapId: VillageMapId;
  mapLabel: string;
  x: number;
  y: number;
  delivered: boolean;
}

export interface ActiveDeliveryRun {
  runId: string;
  startedAt: number;
  expiresAt: number;
  durationSec: number;
  hasCoopPassenger: boolean;
  orders: DeliveryOrderStop[];
  completed: boolean;
  failed: boolean;
}

const ORDER_POOL: Array<Omit<DeliveryOrderStop, 'delivered'>> = [
  {
    id: 'ord_srey_num_pang',
    itemName: "Grandma Srey's Num Pang",
    recipientName: 'Grandma Srey (Central Courtyard)',
    icon: '🥖',
    mapId: 'central_plaza',
    mapLabel: 'Central Plaza',
    x: 1020,
    y: 660,
  },
  {
    id: 'ord_bopha_silk',
    itemName: "Bopha's Silk Dress",
    recipientName: 'Bopha Boutique (Market Street)',
    icon: '👗',
    mapId: 'market_street',
    mapLabel: 'Market Street',
    x: 560,
    y: 520,
  },
  {
    id: 'ord_vuth_lotus_tea',
    itemName: "Achar Vuth's Lotus Tea",
    recipientName: 'Achar Vuth (Temple Terrace)',
    icon: '🍵',
    mapId: 'temple_district',
    mapLabel: 'Temple District',
    x: 800,
    y: 740,
  },
  {
    id: 'ord_rithy_kafe',
    itemName: "Captain Rithy's Iced Kafé",
    recipientName: 'Captain Rithy (Green Park Pier)',
    icon: '🧋',
    mapId: 'green_park',
    mapLabel: 'Green Park & Pier',
    x: 800,
    y: 620,
  },
];

type DeliveryListener = (run: ActiveDeliveryRun | null) => void;

export interface DeliveryCompletionReward {
  coins: number;
  friendlyXp: number;
  remainingSec: number;
  coopBonusApplied: boolean;
}

/**
 * Update 3.2 — Co-op Express Delivery Jobs Engine (90-second 3-Stop Village Delivery Run)
 * Works solo or with a Co-op passenger (+25% Speed Bonus) riding on any 2-seat mount!
 */
class DeliveryJobManagerEngine {
  private activeRun: ActiveDeliveryRun | null = null;
  private listeners = new Set<DeliveryListener>();

  public getActiveRun(): ActiveDeliveryRun | null {
    return this.activeRun;
  }

  public subscribe(fn: DeliveryListener): () => void {
    this.listeners.add(fn);
    fn(this.activeRun);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.activeRun ? { ...this.activeRun, orders: this.activeRun.orders.map((o) => ({ ...o })) } : null));
  }

  public startRun(hasCoopPassenger = false): ActiveDeliveryRun {
    const now = Date.now();
    // Always include a Central Plaza order first + 2 vibrant nearby village stops so runs are lively & completable within 90s!
    const selected = [ORDER_POOL[0], ORDER_POOL[1], ORDER_POOL[2]].map((o) => ({
      ...o,
      delivered: false,
    }));
    // Rotate 3rd stop occasionally to Green Park
    if (Math.random() < 0.45) {
      selected[2] = { ...ORDER_POOL[3], delivered: false };
    }
    this.activeRun = {
      runId: `del_${now.toString(36)}`,
      startedAt: now,
      expiresAt: now + 90_000,
      durationSec: 90,
      hasCoopPassenger,
      orders: selected,
      completed: false,
      failed: false,
    };
    this.notify();
    return this.activeRun;
  }

  public getNextPendingOrder(preferredMapId?: VillageMapId): DeliveryOrderStop | null {
    if (!this.activeRun || this.activeRun.completed || this.activeRun.failed) return null;
    if (preferredMapId) {
      const sameMap = this.activeRun.orders.find((o) => !o.delivered && o.mapId === preferredMapId);
      if (sameMap) return sameMap;
    }
    return this.activeRun.orders.find((o) => !o.delivered) ?? null;
  }

  public deliverOrder(orderId: string): {
    delivered: DeliveryOrderStop | null;
    allDone: boolean;
    reward: DeliveryCompletionReward | null;
  } {
    if (!this.activeRun || this.activeRun.completed || this.activeRun.failed) {
      return { delivered: null, allDone: false, reward: null };
    }
    const target = this.activeRun.orders.find((o) => o.id === orderId && !o.delivered);
    if (!target) return { delivered: null, allDone: false, reward: null };

    target.delivered = true;
    const allDone = this.activeRun.orders.every((o) => o.delivered);

    if (allDone) {
      const remSec = Math.max(0, Math.ceil((this.activeRun.expiresAt - Date.now()) / 1000));
      const baseCoins = 260 + Math.min(220, remSec * 4);
      const finalCoins = this.activeRun.hasCoopPassenger
        ? Math.min(600, Math.round(baseCoins * 1.25))
        : Math.min(520, baseCoins);
      const friendlyXp = this.activeRun.hasCoopPassenger ? 25 : 14;
      const coopBonusApplied = this.activeRun.hasCoopPassenger;
      this.activeRun.completed = true;
      this.notify();
      setTimeout(() => {
        if (this.activeRun?.completed) {
          this.activeRun = null;
          this.notify();
        }
      }, 2800);
      return {
        delivered: target,
        allDone: true,
        reward: {
          coins: finalCoins,
          friendlyXp,
          remainingSec: remSec,
          coopBonusApplied,
        },
      };
    }

    this.notify();
    return { delivered: target, allDone: false, reward: null };
  }

  public tick(now = Date.now()): { expired: boolean } {
    if (!this.activeRun || this.activeRun.completed || this.activeRun.failed) {
      return { expired: false };
    }
    if (now >= this.activeRun.expiresAt) {
      this.activeRun.failed = true;
      this.notify();
      setTimeout(() => {
        if (this.activeRun?.failed) {
          this.activeRun = null;
          this.notify();
        }
      }, 2400);
      return { expired: true };
    }
    return { expired: false };
  }

  public cancelRun(): void {
    this.activeRun = null;
    this.notify();
  }
}

export const deliveryJobManager = new DeliveryJobManagerEngine();
