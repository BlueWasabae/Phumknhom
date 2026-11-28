import type {
  ActiveTreasureMap,
  BossId,
  CombatHitResult,
  DifficultyMode,
  EmoteSymbol,
  EquippedLoadout,
  KhmerClassId,
  PlacedHouseDecor,
  PlayerState,
  SkillId,
  TukTukCartListing,
  WeaponAuraId,
  ZoneType,
} from '@shared/types';
import type { KhmerNpcId } from '@shared/npcSchedules';
import type { BountyCategory } from '@shared/bounties';
import type { ActiveWorldEventSnapshot } from '@shared/worldEvents';
import type {
  ColossusRaidChestReward,
  WorldBossLeaderboardRow,
  WorldBossStatusSnapshot,
} from '@shared/worldBossData';
import type { TravelRequestPayload } from './systems/TravelAndPylons';

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

export interface SignatureSkillHudPayload {
  classId: KhmerClassId;
  skillName: string;
  khmerName: string;
  icon: string;
  accentColor: string;
  cooldownMs: number;
  readyAt: number; // Date.now() epoch ms when ready
}

export interface FishingBitePayload {
  fishId: string;
  label: string;
  khmerName: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'ancient';
  color: string;
  fishingXp: number;
  difficulty: number;
}

export interface DiveHudPayload {
  active: boolean;
  oxygenSec: number;
  maxOxygenSec: number;
  nagaScaleBonus: boolean;
  seaPearls: number;
  coralShards: number;
  treasureMaps: number;
  ancientPearls: number;
  depthMeters: number;
  nearSurfaceBuoy: boolean;
}

export interface DiveCompletedPayload {
  surfacedSafely: boolean;
  keptRatio: number;
  seaPearls: number;
  coralShards: number;
  treasureMaps: number;
  ancientPearls: number;
  coinsEarned: number;
  fishingXp: number;
}

export type FarmToolMode = 'smart' | 'fertilize' | 'infuse';

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
  phase: 1 | 2 | 3;
  difficulty: DifficultyMode;
  partySize?: number;
  stageLabel: string;
  focusPct: number;
  focusActive: boolean;
  furyPct: number;
  furyActive: boolean;
  defenseCracked: boolean;
  damageTakenThisFight: number;
  /** Duo Boss (Ream Eyso & Moni Mekhala) dual HP breakdown */
  duoStatus?: {
    eysoHp: number;
    eysoMaxHp: number;
    mekhalaHp: number;
    mekhalaMaxHp: number;
    overdriveName: string | null;
  };
  /** Update 1.8 Mythic Boss Rush live Speedrun Timer & Stage Tracker */
  bossRush?: {
    active: boolean;
    stageIndex: number; // 1..6
    totalStages: number;
    elapsedMs: number;
    breatherSec: number; // >0 during 5s breather + full heal between bosses
  };
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

export interface InspectedRemotePlayer {
  sessionId: string;
  playerId: string;
  name: string;
  level: number;
  stylish: number;
  areaId: string;
  loadout: EquippedLoadout;
}

export interface WhisperPayload {
  fromSessionId: string;
  fromName: string;
  toName: string;
  text: string;
  timestamp: number;
}

export interface IncomingFriendRequestPayload {
  friendshipId: string;
  fromSessionId?: string;
  fromPlayerId: string;
  fromName: string;
  status?: 'pending' | 'accepted';
  timestamp: number;
}

export interface IncomingDungeonInvitePayload {
  inviteId: string;
  partyId: string;
  fromSessionId: string;
  fromPlayerId: string;
  fromName: string;
  areaId: string;
  bossId: BossId;
  difficulty: DifficultyMode;
  timestamp: number;
}

export interface DungeonPartyReadyPayload {
  partyId: string;
  bossId: BossId;
  difficulty: DifficultyMode;
  partnerName: string;
}

export interface MarketSalePayload {
  itemName: string;
  quantity: number;
  buyerName: string;
  payoutCoins: number;
  taxCoins: number;
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
  'auth:identityChanged': { playerId: string; playerState: PlayerState };
  'social:inspectPlayer': InspectedRemotePlayer;
  'social:whisper': WhisperPayload;
  'social:friendRequest': IncomingFriendRequestPayload;
  'social:dungeonInvite': IncomingDungeonInvitePayload;
  'social:dungeonPartyReady': DungeonPartyReadyPayload;
  'social:marketSale': MarketSalePayload;
  'social:notice': { text: string };
  'portal:proximity': PortalProximityPayload;
  'combat:hit': { hit: CombatHitResult; dummyHp: number; dummyMaxHp: number };
  'combat:classMeter': ClassMeterPayload;
  'combat:signatureSkillState': SignatureSkillHudPayload;
  'boss:hudUpdate': BossHudPayload;
  'dungeon:enterRequest': {
    bossId: BossId;
    difficulty: DifficultyMode;
    partyMode?: 'solo' | 'coop';
    partyId?: string;
  };
  'bossRush:enterRequest': {
    difficulty: DifficultyMode;
  };
  'bossRush:completed': {
    elapsedMs: number;
    difficulty: DifficultyMode;
    coins: number;
    gold: number;
    unlockedSovereignTitle: boolean;
    unlockedSovereignWings: boolean;
  };
  'bounty:progress': {
    category: BountyCategory;
    amount?: number;
  };
  'guide:step': {
    stepId: 'customize_hero' | 'plant_crop' | 'greet_npc' | 'explore_or_boss' | 'claim_bounty';
  };
  'gm:liveEventTriggered': {
    worldEventId: string | null;
    festivalId: string | null;
  };
  'dungeon:outcome': DungeonOutcomePayload | null;
  'travel:execute': TravelRequestPayload;
  'frontier:gather': {
    skillId: 'foraging' | 'mining' | 'melee';
    xp: number;
    coins?: number;
    itemId?: string;
    label: string;
  };
  'cavern:enterRequest': {
    returnMapId: 'wild_frontier' | 'temple_district';
  };
  'cavern:reward': {
    skillId?: SkillId;
    xp?: number;
    coins?: number;
    items?: Array<{ itemId: string; quantity: number }>;
    label: string;
  };
  'tower:enterRequest': {
    floor: number;
    partyMode: 'solo' | 'coop';
  };
  'tower:floorCleared': {
    floor: number;
    isBossFloor: boolean;
    coins: number;
    vitalityXp: number;
    reforgeStones: number;
    unlockedAura: WeaponAuraId | null;
  };
  'worldEvent:changed': ActiveWorldEventSnapshot | null;
  'worldBoss:changed': WorldBossStatusSnapshot;
  'worldBoss:enterRequest': void;
  'worldBoss:completed': {
    reward: ColossusRaidChestReward;
    top3: WorldBossLeaderboardRow[];
    colossusSlayerTitle: string | null;
  };
  'dive:enterRequest': void;
  'dive:surfaceRequest': void;
  'dive:hudUpdate': DiveHudPayload | null;
  'dive:completed': DiveCompletedPayload;
  'blackMarket:changed': { active: boolean; manual: boolean; rotationSeed: number };
  'worldEvent:reward': {
    skillId?: SkillId;
    xp?: number;
    coins?: number;
    gold?: number;
    items?: Array<{ itemId: string; quantity: number }>;
    label: string;
  };
  'festival:startRace': void;
  'festival:raceFinished': {
    place: number;
    timeSec: number;
    coins: number;
    gold: number;
    fishingXp: number;
    unlockedPaddle: boolean;
  };
  'festival:waterSplash': { targetName: string };
  'festival:releaseLantern': void;
  'network:kromChat': {
    sessionId: string;
    name: string;
    kromTag: string;
    text: string;
    timestamp: number;
  };
  'dungeon:villageCheer': {
    senderName: string;
    healHp: number;
    attackBonusPct: number;
    durationMs: number;
  };
  'cart:listUpdated': { carts: TukTukCartListing[] };
  'cart:saleNotice': {
    buyerName: string;
    itemName: string;
    quantity: number;
    revenueCoins: number;
    cookingXp: number;
  };
  'treasure:dugChest': {
    spotId: string;
    coins: number;
    gold: number;
    reforgeStones: number;
    cosmeticItemId: string | null;
    cosmeticLabel: string | null;
    nextMap?: ActiveTreasureMap | null;
  };
  'npc:openDialogue': { npcId: KhmerNpcId };
  'house:setDecorateMode': { active: boolean; itemId?: string | null };
  'house:placeQuick': { itemId: string };
  'house:rotateDecor': { uid: string };
  'house:removeDecor': { uid: string };
  'house:decorUpdated': { houseDecor: PlacedHouseDecor[]; toast?: string };
  'house:restHeal': void;
  'ticker:push': { text: string; category?: 'boss' | 'reforge' | 'weather' | 'club' | 'market' };
  'shrine:pray': void;
  'fishing:biteReady': FishingBitePayload;
  'fishing:reelComplete': { success: boolean; bite: FishingBitePayload };
  'mobile:joystick': JoystickVector;
  'input:interact': void;
  'input:jump': void;
  'input:attack': void;
  'input:secondary': void;
  'input:signatureSkill': void;
  'input:dash': void;
  'input:grapple': void;
  'input:toggleMount': void;
  'input:honkMount': void;
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
      | 'areaSwitcher'
      | 'friends'
      | 'auth'
      | 'fishing'
      | 'luckyWheel'
      | 'pagoda'
      | 'market'
      | 'bestiary'
      | 'diamondStore'
      | 'worldMap'
      | 'serverCity'
      | 'reforge'
      | 'clubGames'
      | 'houseDecor'
      | 'leaderboard'
      | 'pagodaTower'
      | 'museum'
      | 'nightMarket'
      | 'festival'
      | 'krom'
      | 'scryingMirror'
      | 'tukTukCart'
      | 'treasureMap'
      | 'runway'
      | 'bond'
      | 'bounties'
      | 'promo'
      | 'admin'
      | 'dailyLogin'
      | 'seasonPass'
      | 'achievements'
      | 'reliquary'
      | 'awakening'
      | 'blackMarket';
    leaderboardCategory?: 'farmer' | 'stylish' | 'slayer' | 'tower' | 'boss_rush';
    farmTab?: 'seeds' | 'livestock' | 'artisan';
    shopTab?: 'primary' | 'secondary';
    friendsTab?: 'friends' | 'inbox';
    reforgeTab?: 'reforge' | 'fusion' | 'shimmer' | 'bank';
    clubGame?: 'kla_klok' | 'ouk_chaktrang' | 'tien_len';
    clubTableId?: string;
    cartId?: string;
    bondPartnerName?: string;
  };
  'club:tablesSync': { tables: unknown[]; sessionId: string | null; online: boolean };
  'club:privateHand': { tableId: string; hand: unknown[] };
  'club:payout': {
    tableId: string;
    game: 'tien_len' | 'ouk_chaktrang';
    winnerSessionId: string;
    winnerName: string;
    potCoins: number;
    stakeCoins: number;
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
