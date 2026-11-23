import type { CombatHitResult, EmoteSymbol, PlayerState, ZoneType } from '@shared/types';

export interface JoystickVector {
  x: number; // -1..1
  y: number; // -1..1
}

export interface PortalProximityPayload {
  nearPortal: boolean;
  label: string;
  targetZone: ZoneType;
}

export interface EventMap {
  'scene:ready': { zone: ZoneType };
  'player:state': PlayerState;
  'player:chat': { text: string };
  'player:emote': { emoji: EmoteSymbol };
  'portal:proximity': PortalProximityPayload;
  'combat:hit': { hit: CombatHitResult; dummyHp: number; dummyMaxHp: number };
  'mobile:joystick': JoystickVector;
  'input:interact': void;
  'input:jump': void;
  'input:attack': void;
  'input:dash': void;
  'input:exitDungeon': void;
  'ui:toast': { text: string };
}

type Listener<T> = (payload: T) => void;

class TypedEventBus {
  private map = new Map<keyof EventMap, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    let set = this.map.get(event);
    if (!set) {
      set = new Set();
      this.map.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => {
      set?.delete(listener as Listener<unknown>);
    };
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    const set = this.map.get(event);
    if (!set) return;
    const payload = args[0];
    set.forEach((fn) => fn(payload));
  }
}

export const EventBus = new TypedEventBus();
