import type {
  BossId,
  CombatHitResult,
  DifficultyMode,
  EmoteSymbol,
  EquippedLoadout,
  KhmerClassId,
  PlayerState,
  SkillId,
  ZoneType,
} from '@shared/types';

export interface JoystickVector {
  x: number; // -1..1
  y: number; // -1..1
}

export interface PortalProximityPayload {
  nearPortal: boolean;
  label: string;
  targetZone: ZoneType;
}

export interface ClassMeterPayload {
  classId: KhmerClassId;
  stealthPct: number;       // 0..100 (Shadow Hunter)
  yantStacks: number;       // 0..3   (Achar Mystic)
  lbokatorStance: number;   // 1=Lion, 2=Crocodile, 3=Hanuman
}

export type FarmToolMode = 'smart' | 'fertilize';

export interface SkillXpToastPayload {
  skillId: SkillId;
  skillName: string;
  icon: string;
  xp: number;
  level: number;
  leveledUp: boolean;
  talentPointGained: boolean;
}

export interface BossHudPayload {
  active: boolean;
  bossId: BossId;
  khmerName: string;
  englishName: string;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  difficulty: DifficultyMode;
  stageLabel: string;
  focusPct: number;
  focusActive: boolean;
  furyPct: number;
  furyActive: boolean;
  defenseCracked: boolean;
  damageTakenThisFight: number;
}

export interface DungeonOutcomePayload {
  outcome: 'victory' | 'defeat';
  bossId: BossId;
  bossName: string;
  difficulty: DifficultyMode;
  noHit: boolean;
  easterEggUnlocked: boolean;
  coins: number;
  gold: number;
  lootLabels: string[];
}

export interface NetworkStatusPayload {
  online: boolean;
  areaId: string;
  areaChannel: number;
  playerCount: number;
}

export interface RemoteChatPayload {
  sessionId: string;
  name: string;
  text: string;
  timestamp: number;
}

export interface EventMap {
  'scene:ready': { zone: ZoneType };
  'player:state': PlayerState;
  'player:stateSync': PlayerState;
  'player:loadoutChanged': {
    loadout: EquippedLoadout;
    activeClass: KhmerClassId;
    playerState: PlayerState;
  };
  'farm:stateUpdated': PlayerState;
  'farm:selectSeed': { cropId: string; toolMode: FarmToolMode };
  'skill:xpGained': SkillXpToastPayload;
  'player:chat': { text: string };
  'player:emote': { emoji: EmoteSymbol };
  'network:status': NetworkStatusPayload;
  'network:remoteChat': RemoteChatPayload;
  'network:switchArea': { areaId: string };
  'portal:proximity': PortalProximityPayload;
  'combat:hit': { hit: CombatHitResult; dummyHp: number; dummyMaxHp: number };
  'combat:classMeter': ClassMeterPayload;
  'boss:hudUpdate': BossHudPayload;
  'dungeon:enterRequest': { bossId: BossId; difficulty: DifficultyMode };
  'dungeon:outcome': DungeonOutcomePayload | null;
  'mobile:joystick': JoystickVector;
  'input:interact': void;
  'input:jump': void;
  'input:attack': void;
  'input:dash': void;
  'input:focus': void;
  'input:fury': void;
  'input:rematch': void;
  'input:exitDungeon': void;
  'input:exitFarm': void;
  'ui:openModal': {
    modal:
      | 'profile'
      | 'inventory'
      | 'wardrobe'
      | 'farm'
      | 'snackShop'
      | 'fashionShop'
      | 'skills'
      | 'modeSelector'
      | 'areaSwitcher';
    farmTab?: 'seeds' | 'livestock' | 'artisan';
    shopTab?: 'primary' | 'secondary';
  };
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
