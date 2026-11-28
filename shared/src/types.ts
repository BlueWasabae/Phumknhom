import type {
  EyebrowStyleId,
  EyeStyleId,
  FaceStyleId,
  HairStyleId,
  SkinToneId,
  StarterOutfitId,
} from './characterStyles';

export type {
  EyebrowStyleId,
  EyeStyleId,
  FaceStyleId,
  HairStyleId,
  SkinToneId,
  StarterOutfitId,
} from './characterStyles';

export type ZoneType =
  | 'overworld'
  | 'dungeon'
  | 'world_boss'
  | 'pearl_dive'
  | 'cavern'
  | 'tower'
  | 'festival_race'
  | 'farm'
  | 'club'
  | 'khmer_world'
  | 'house'
  | 'krom_hall'
  | 'pet_race'
  | 'arena';

export type { KhmerEmoteId } from './emotes';

export type KhmerInstrumentId =
  | 'roneat_aek'
  | 'chapei_dang_veng'
  | 'khim'
  | 'skor_thom'
  | 'chhing';

export type InstrumentSkinId = 'classic' | 'golden_angkor' | 'celestial_apsara';

export interface PlacedYardDecor {
  uid: string;
  itemId: string;
  x: number;
  y: number;
}

export type KromTerritoryId = 'market_street' | 'wild_frontier' | 'koh_rong_island';

export interface KromVaultSlot {
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: QualityTier;
  depositedBy: string;
  depositedAt: string;
}

export interface KromTerritoryStanding {
  kromId: string;
  kromTag: string;
  kromName: string;
  points: number;
}

export interface KromTerritoryOwner {
  kromId: string;
  kromTag: string;
  kromName: string;
  claimedAt: string;
}

export interface KromTerritoryState {
  id: KromTerritoryId;
  name: string;
  khmerName: string;
  perkTitle: string;
  perkDescription: string;
  owner: KromTerritoryOwner | null;
  standings: KromTerritoryStanding[];
}

export interface KromWarSnapshot {
  weekId: string;
  endsAt: number;
  territories: KromTerritoryState[];
  lastFinalizedAt: number | null;
}

export type PetEvolutionStage = 1 | 2 | 3;

export interface PetProgressEntry {
  level: number;
  xp: number;
  stage: PetEvolutionStage;
}

export interface KromMember {
  playerId: string;
  username: string;
  role: 'leader' | 'officer' | 'member';
  donatedCoins: number;
  joinedAt: string;
}

export interface KromGuild {
  id: string;
  name: string;
  tag: string; // 3-4 uppercase alphanumeric characters e.g. ANGK, PHUM
  leaderName: string;
  level: number; // 1..10
  xp: number;
  treasuryCoins: number;
  members: KromMember[];
  vault?: Array<KromVaultSlot | null>;
  trophyBosses?: string[];
  targetTerritoryId?: KromTerritoryId;
  createdAt: string;
}

export interface ActiveDungeonFightInfo {
  roomId: string;
  partyId: string;
  bossId: BossId;
  bossName: string;
  difficulty: DifficultyMode;
  playerName: string;
  bossHp: number;
  bossMaxHp: number;
  playerCount: number;
  isSimulation?: boolean;
}

export interface ActiveTreasureMap {
  spotId: string;
  mapId:
    | 'central_plaza'
    | 'market_street'
    | 'temple_district'
    | 'green_park'
    | 'wild_frontier'
    | 'mining_quarry'
    | 'bamboo_forest'
    | 'sunken_ruins'
    | 'koh_rong_island'
    | 'phnom_kulen'
    | 'tonle_sap_marsh'
    | 'cardamom_jungle'
    | 'preah_vihear_cliffs';
  clueTitle: string;
  clueDescription: string;
  x: number;
  y: number;
  discoveredAt: number;
}

export interface TukTukCartItem {
  itemId: string;
  name: string;
  icon: string;
  quantity: number;
  priceCoins: number;
  quality?: QualityTier;
  summary: string;
}

export interface TukTukCartListing {
  cartId: string;
  ownerId: string;
  ownerName: string;
  ownerKromTag?: string;
  signTitle: string;
  mapId: 'central_plaza' | 'temple_district';
  x: number;
  y: number;
  items: TukTukCartItem[];
  totalSalesCoins: number;
  totalItemsSold: number;
  openedAt: number;
  isDemo?: boolean;
}

export interface BondPartnerRecord {
  bondId: string;
  partnerId: string;
  partnerName: string;
  status: 'pending' | 'accepted';
  bondedAt: string;
}

export type WeaponAuraId =
  | 'golden_lotus'
  | 'emerald_naga'
  | 'celestial_angkor'
  | 'krong_reap_ten_head';

export interface BountyProgressState {
  dailyKey: string;
  weeklyKey: string;
  progress: Record<string, number>;
  claimed: string[];
}

export interface NpcFriendshipEntry {
  hearts: number; // 0..10 (supports 0.2 / 0.5 / 1.0 increments)
  lastGiftDay: string | null; // YYYY-MM-DD
  claimedRewards?: number[]; // e.g. [3, 6]
}

export interface PlacedHouseDecor {
  uid: string;
  itemId: string;
  x: number;
  y: number;
  rotation?: number; // 0 | 90 | 180 | 270
}

// ==================== UPDATE 2.7: P2P TRADE, TIMED AUCTION HOUSE & MAILBOX ====================

export interface TradeSlotItem {
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: QualityTier;
  itemLevel?: number;
  rarity: ItemRarity;
  dropRatePct?: number;
}

export interface TradeOfferSide {
  sessionId: string;
  playerId: string;
  name: string;
  items: TradeSlotItem[];
  coins: number;
  locked: boolean;
  confirmed: boolean;
}

export interface TradeSessionSnapshot {
  tradeId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  sideA: TradeOfferSide;
  sideB: TradeOfferSide;
  bothLockedAt: number | null;
  warningText: string | null;
  updatedAt: number;
}

export interface TradeCompletedReceipt {
  tradeId: string;
  partnerName: string;
  gaveItems: TradeSlotItem[];
  receivedItems: TradeSlotItem[];
  gaveCoins: number;
  receivedCoins: number;
  taxCoins: 0;
  timestamp: number;
}

export type AuctionCurrency = 'coins' | 'gold';
export type AuctionCategory = 'weapon' | 'wings' | 'pet' | 'armor' | 'relic' | 'material';

export interface AuctionListingRecord {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerIsVip?: boolean;
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: QualityTier;
  itemLevel?: number;
  rarity: ItemRarity;
  category: AuctionCategory;
  currency: AuctionCurrency;
  startingBid: number;
  currentBid: number;
  buyoutPrice: number | null;
  highestBidderId: string | null;
  highestBidderName: string | null;
  bidCount: number;
  durationHours: 1 | 6 | 24;
  createdAt: number;
  endsAt: number;
  antiSnipeExtensions: number;
  status: 'active' | 'sold' | 'expired' | 'cancelled';
}

export interface PlayerMailItemAttachment {
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: QualityTier;
  itemLevel?: number;
  rarity?: ItemRarity;
}

export interface PlayerMailEntry {
  id: string;
  recipientKey: string;
  recipientName: string;
  kind: 'auction_won' | 'auction_sold' | 'auction_outbid' | 'auction_expired' | 'trade_receipt' | 'system';
  title: string;
  body: string;
  coins: number;
  gold: number;
  items: PlayerMailItemAttachment[];
  createdAt: number;
  claimed: boolean;
}

export interface TradeAuctionHistoryEntry {
  id: string;
  kind: 'p2p_trade' | 'auction_sold' | 'auction_bought' | 'auction_listed';
  summary: string;
  counterParty?: string;
  coinsDelta?: number;
  goldDelta?: number;
  timestamp: number;
}

export type DifficultyMode = 'normal' | 'expert' | 'mythic' | 'death';

export type BossId =
  | 'sdech_kongkaeb'
  | 'arp_prey_chrov'
  | 'khmouch_chheam_prey'
  | 'preay_krola_plerng'
  | 'yeak_thmor'
  | 'neak_reach'
  | 'kropeu_neang_kheng'
  | 'apsara_srong'
  | 'reachsey'
  | 'ream_eyso_moni_mekhala'
  | 'hanuman_shadow_general'
  | 'garuda'
  | 'kala'
  | 'preah_ko_preah_keo'
  | 'krong_reap'
  | 'rahu'
  | 'khmouch_daeum_chek'
  | 'preay_teuk'
  | 'yeak_prey'
  | 'maccha_tep'
  | 'sdech_damrey_sor'
  | 'neak_plerng'
  | 'baksey_meas'
  | 'astral_warden_angkor';

export type BossRigType =
  | 'QuadrupedHopperRig'
  | 'HumanoidRig'
  | 'FloaterRig'
  | 'MultiSegmentWormRig'
  | 'DuoStormCrystalRig'
  | 'SovereignYakshaRig';

export type EmoteSymbol = '👋' | '😄' | '❤️' | '🔥';

export type KhmerClassId = 'lbokator' | 'archer' | 'mystic' | 'tamer' | 'shadow';

export type SkillId =
  | 'farming'
  | 'mining'
  | 'fishing'
  | 'foraging'
  | 'cooking'
  | 'crafting'
  | 'melee'
  | 'ranged'
  | 'magic'
  | 'summoning'
  | 'rogue'
  | 'vitality';

export interface SkillEntry {
  level: number;
  xp: number;
  unlockedTalents: string[];
}

export interface SkillProfile {
  skills: Record<SkillId, SkillEntry>;
}

export interface ActiveSnackBuff {
  id: string;
  snackId: string;
  name: string;
  khmerName: string;
  icon: string;
  color: string;
  startedAt: number;
  expiresAt: number;
  moveSpeedPct?: number;
  jumpPowerPct?: number;
  attackPct?: number;
  maxHpPct?: number;
  critChanceBonus?: number;
  mpRegenPct?: number;
  poisonImmune?: boolean;
  lifestealPct?: number;
}

export type EquipSlot =
  | 'hat'
  | 'hair'
  | 'shirt'
  | 'pants'
  | 'wings'
  | 'pet'
  | 'weapon'
  | 'armor'
  | 'mount'
  | 'accessory';

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'ancient';

export type QualityTier = 'normal' | 'gold_star';

export type PagodaBundleProgress = Record<string, string[]>;

export interface Currencies {
  coins: number;
  gold: number;
  diamonds: number;
}

export interface LifeStats {
  farmLevel: number;
  farmXp: number;
  stylish: number;
  friendly: number; // 0..100
  happy: number;    // 0..100
  healthy: number;  // 0..100
}

export interface PlayerAppearance {
  skinTone: SkinToneId;
  skinColor: string;
  hairStyle: HairStyleId;
  hairColor: string;
  eyeStyle: EyeStyleId;
  eyeColor: string;
  eyebrowStyle: EyebrowStyleId;
  faceStyle: FaceStyleId;
  starterOutfit: StarterOutfitId;
  hat: string | null;
  hair: string | null;
  shirt: string | null;
  pants: string | null;
  wings: string | null;
  pet: string | null;
  petId?: string | null;
  weapon: string | null;
  armor: string | null;
  /** Equipped Rideable Khmer Mount (Village Bicycle, Water Buffalo, Mini Tuk-Tuk) */
  mount?: string | null;
  /** Unlocked Endless Pagoda Tower Weapon Aura (Floor 10 / 25 / 50) */
  weaponAura?: WeaponAuraId | null;
  /** 5 dedicated combat/utility accessory slots (Update 1.3A) */
  accessories?: (string | null)[];
  /** When true (default), Vanity slots (Hat/Shirt/Pants/Wings) override Combat Armor visuals */
  showVanityOverArmor?: boolean;
  /** Update 3.4 — Botanical & Prismatic Outfit/Krama/Wings Dye Studio colors */
  equippedDyes?: Record<string, string>;
  hasCompletedCreation?: boolean;
}

export type EquippedLoadout = PlayerAppearance;

export interface InventoryItem {
  itemId: string;
  quantity: number;
  itemLevel: number;
  durability?: number;
  quality?: QualityTier;
}

export interface FarmPlotState {
  index: number;
  unlocked: boolean;
  tilled: boolean;
  cropId: string | null;
  plantedAt: number | null;     // epoch ms
  effectiveGrowMs: number;      // starts at crop.growSeconds * 1000, cut by 20% remaining when watered
  watered: boolean;
  fertilized: boolean;
  /** Update 1.6 — Spirit-Infused Farming via Boss Essence */
  spiritInfused?: boolean;
  spiritEssenceType?: 'slime' | 'stone' | 'naga';
}

export interface FruitTreeState {
  slotIndex: number;
  treeId: string;
  plantedAt: number;
  lastHarvestAt: number | null;
  mature: boolean;
}

export interface LivestockPenState {
  slotIndex: number;
  animalId: string;
  acquiredAt: number;
  lastCollectedAt: number;
  fed: boolean;
}

export interface ArtisanMachineState {
  slotIndex: number;
  machineId: string;
  recipeId: string | null;
  inputItemId: string | null;
  outputItemId: string | null;
  startedAt: number | null;
  durationMs: number;
  quality: QualityTier;
}

export interface FarmState {
  plots: FarmPlotState[];
  trees: FruitTreeState[];
  livestock: LivestockPenState[];
  machines: ArtisanMachineState[];
}

export interface WeaponStats {
  id: string;
  name: string;
  khmerName?: string;
  classId: KhmerClassId;
  baseDamage: number;
  upgradeLevel: number; // +0 to +10 (+6% base power per upgrade)
  armorPen: number;
  critChance: number; // 0..1
  attackCooldownMs: number;
  knockbackForce: number;
}

export type StarterGuideStepId =
  | 'customize_hero'
  | 'plant_crop'
  | 'greet_npc'
  | 'explore_or_boss'
  | 'claim_bounty';

export interface StarterGuideState {
  completedSteps: StarterGuideStepId[];
  finalRewardClaimed: boolean;
  dismissed: boolean;
}

export interface PlayerState {
  name: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  coins: number; // Mirrored with currencies.coins
  currencies: Currencies;
  lifeStats: LifeStats;
  defense: number;
  areaChannel: number;
  zone: ZoneType;
  difficulty: DifficultyMode;
  activeClass: KhmerClassId;
  weapon: WeaponStats;
  loadout: EquippedLoadout;
  inventory: InventoryItem[];
  farm: FarmState;
  skills: SkillProfile;
  activeBuffs: ActiveSnackBuff[];
  quickSnackSlots: [string | null, string | null, string | null];
  clearedBosses: BossId[];
  bossDefeats: Record<string, number>;
  pagodaBundles: PagodaBundleProgress;
  luckyWheelPity: number;
  villagePassUntil?: number | null;
  extraBagSlots?: number;
  ownedMounts?: string[];
  activeMount?: string | null;
  dailyFreeCoinSpinDate?: string | null;
  cityServer?: 'phnom_penh' | 'siem_reap' | 'kampot' | 'battambang';
  currentMapId?:
    | 'central_plaza'
    | 'market_street'
    | 'temple_district'
    | 'green_park'
    | 'wild_frontier'
    | 'mining_quarry'
    | 'bamboo_forest'
    | 'sunken_ruins'
    | 'koh_rong_island'
    | 'phnom_kulen'
    | 'tonle_sap_marsh'
    | 'cardamom_jungle'
    | 'preah_vihear_cliffs';
  currentWorldId?: string;
  activeBiome?: string;
  discoveredBiomes?: string[];
  unlockedPylons?: string[];
  bankCoins?: number;
  lastShrinePrayerDate?: string | null;
  weaponPrefix?: string | null;
  armorPrefix?: string | null;
  shimmerBlessings?: string[];
  npcFriendships?: Record<string, NpcFriendshipEntry>;
  houseDecor?: PlacedHouseDecor[];
  ownedFurniture?: Record<string, number>;
  /** Update 1.4 — Highest Endless Pagoda Tower floor cleared (0..50) */
  highestTowerFloor?: number;
  /** Update 1.4 — Unlocked Tower Milestone Weapon Auras */
  unlockedWeaponAuras?: WeaponAuraId[];
  /** Update 1.4 — Donated Angkor Relic Museum itemIds */
  museumDonations?: string[];
  /** Update 1.5 — Krom (Guild/Clan) membership & Festival Blessings */
  kromId?: string | null;
  kromTag?: string | null;
  kromName?: string | null;
  kromLevel?: number;
  pchumBenBlessingUntil?: number | null;
  festivalSplashCount?: number;
  /** Update 1.6 — Active Torn Angkor Treasure Map clue coordinates */
  activeTreasureMap?: ActiveTreasureMap | null;
  /** Update 1.7 — Weekly Fashion Runway Icon & Best-Friend/Couple Bond Ring */
  runwayIconBadge?: boolean;
  runwayScore?: number;
  bondPartner?: BondPartnerRecord | null;
  /** Update 1.8 — Endgame Boss Rush Speedrun Record, Titles & Daily/Weekly Bounty Board */
  bestBossRushTimeMs?: number | null;
  unlockedTitles?: string[];
  activeTitle?: string | null;
  bountyProgress?: BountyProgressState;
  /** Update 1.9 — New-Player Welcome Checklist ("Village Starter Guide") */
  starterGuide?: StarterGuideState;
  /** Update 2.0 — Redeemed Launch Gift Codes & Friend Invite Referral */
  redeemedCodes?: string[];
  referredBy?: string | null;
  /** Update 2.1 — 7-Day Login Streak Calendar */
  loginStreak?: number;
  lastLoginDate?: string | null;
  claimedLoginDays?: number[];
  /** Update 2.1 — Angkor Season Pass (Free & Royal 20-Tier Tracks) */
  seasonPassXp?: number;
  hasRoyalPass?: boolean;
  claimedPassTiers?: string[];
  /** Update 2.1 — Account Achievement Badges */
  unlockedAchievements?: string[];
  equippedBadgeId?: string | null;
  /** Update 2.4 — Mystery Reliquary Gacha Pity, Keys, Angkor Shards, Bundles & VIP Daily Key */
  reliquaryPityCount?: number;
  reliquaryMythicPityCount?: number;
  reliquaryKeys?: number;
  angkorShards?: number;
  welcomeBundleClaimed?: boolean;
  purchasedDiamondPacks?: string[];
  lastDailyReliquaryKeyDate?: string | null;
  /** Update 2.5 — Ancient Weapon Awakening Forge & World Boss Colossus Slayer */
  awakenedWeapons?: string[];
  colossusSlayerUntil?: number | null;
  /** Update 2.6 — Koh Rong Deep-Sea Pearl Diving Stats & Monsoon Night Black Market */
  pearlDivingStats?: {
    divesCompleted: number;
    pearlsHarvested: number;
    ancientPearlsFound: number;
    bestHaulCoins: number;
  };
  hasBioluminescentWaveAura?: boolean;
  blackMarketPurchasedKeys?: string[];
  /** Update 2.7 — P2P Trade & Auction History + Offline Mailbox Cache */
  tradeAuctionHistory?: TradeAuctionHistoryEntry[];
  mailbox?: PlayerMailEntry[];
  /** Update 2.8 — 3-Stage Pet Evolution Progress */
  petProgress?: Record<string, PetProgressEntry>;
  /** Update 2.9 — Khmer Instruments, Pet Racing & Custom Stilt House Outdoor Yard */
  ownedInstruments?: KhmerInstrumentId[];
  equippedInstrument?: KhmerInstrumentId | null;
  ownedInstrumentSkins?: InstrumentSkinId[];
  equippedInstrumentSkin?: InstrumentSkinId;
  instrumentTipsReceived?: number;
  petRaceWins?: number;
  championPetRibbon?: boolean;
  yardDecor?: PlacedYardDecor[];
  ownedYardDecor?: Record<string, number>;
  /** Update 3.1 — Kun Khmer 1v1 Sparring Ring ELO, Champion Sash & Live Khmer Emotes */
  pvpElo?: number;
  pvpWins?: number;
  pvpLosses?: number;
  kunKhmerChampionSash?: boolean;
  ownedEmotes?: import('./emotes').KhmerEmoteId[];
  /** Update 3.2 — Floating Mekong Regional Trade, Sbek Thom Reamker Questline & Express Delivery Jobs */
  regionalCargo?: Record<string, number>;
  merchantXp?: number;
  reamkerQuestStep?: number; // 0 = not started, 1..5 = active step, 6 = completed
  reamkerStepProgress?: number;
  deliveryJobsCompleted?: number;
  /** Update 3.3 — Phnom Kulen Blessing, Khleng Ek Singing Kites & Village Firework Parties */
  kulenBlessingUntil?: number;
  ownedKites?: string[];
  activeKiteId?: string;
  partyHostCount?: number;
  partyFeastBuffUntil?: number;
  /** Update 3.4 — Village Folk Games, Bay Khom & Botanical/Prismatic Outfit Dye Studio */
  equippedDyes?: Record<string, string>;
  unlockedDyes?: string[];
  folkGameWins?: number;
  folkBadges?: string[];
  /** Update 3.6 — 24-Boss World Discovery, Exploration Progress & Hardcore Farm/Livestock Economy */
  unlockedCropSlots?: number;
  pastureLandLevel?: number;
  ownedFences?: number;
  discoveredBosses?: string[];
  mapExplorationPct?: Record<string, number>;
  discoveredLandmarks?: string[];
  hasCompletedCreation?: boolean;
  skillDamagePct: number;
  armorDamagePct: number;
  snackBuffPct: number;
}

export interface CombatHitResult {
  rawDamage: number;
  afterDefense: number;
  finalDamage: number;
  isCrit: boolean;
  isFocusBurst: boolean;
  varianceMultiplier: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  channel?: 'area' | 'krom' | 'whisper';
  kromTag?: string;
  isVip?: boolean;
}

export const DEFAULT_STARTER_WEAPON: WeaponStats = {
  id: 'weapon_phkak',
  name: 'Phkak',
  khmerName: 'ផ្គាក់',
  classId: 'lbokator',
  baseDamage: 20,
  upgradeLevel: 1,
  armorPen: 3,
  critChance: 0.22,
  attackCooldownMs: 320,
  knockbackForce: 210,
};

export const DEFAULT_LOADOUT: EquippedLoadout = {
  skinTone: 'golden_khmer',
  skinColor: '#c88858',
  eyeStyle: 'classic_round',
  eyeColor: '#1c1917',
  eyebrowStyle: 'normal',
  faceStyle: 'warm_smile',
  hairStyle: 'short_neat',
  hairColor: '#1e1b24',
  starterOutfit: 'krama_shirt',
  hat: null,
  hair: null,
  shirt: 'shirt_krama_set',
  pants: 'pants_village_shorts',
  wings: null,
  pet: null,
  petId: null,
  weapon: 'weapon_phkak',
  armor: 'armor_rattan_guard',
  mount: null,
  weaponAura: null,
  accessories: [null, null, null, null, null],
  showVanityOverArmor: true,
  hasCompletedCreation: false,
};

export function createInitialFarmState(now = Date.now()): FarmState {
  // Starter 6x4 Farm Plot grid (18 unlocked + bottom row of 6 unlockable with Coins)
  const plots: FarmPlotState[] = Array.from({ length: 24 }, (_, index) => {
    // Update 3.6 — Hardcore Farm Start: only 2 unlocked crop plots (index 0 & 1); extra slots escalate in price!
    const isStarter = index < 2;
    return {
      index,
      unlocked: isStarter,
      tilled: isStarter,
      cropId: index === 0 ? 'trakuon' : null,
      plantedAt: index === 0 ? now - 95_000 : null,
      effectiveGrowMs: index === 0 ? 120_000 : 0,
      watered: index === 0,
      fertilized: false,
      spiritInfused: false,
    };
  });

  return {
    plots,
    trees: [
      {
        slotIndex: 0,
        treeId: 'coconut_palm',
        plantedAt: now - 7_200_000,
        lastHarvestAt: now - 3_540_000, // Ready in 60s (or 1 Fast-Forward click!)
        mature: true,
      },
    ],
    // Update 3.6 — Zero free livestock! Players must buy Pasture Land -> Wooden Fence/Pen -> Chickens, Sheep & Cows!
    livestock: [],
    machines: [
      {
        slotIndex: 0,
        machineId: 'rice_mill',
        recipeId: null,
        inputItemId: null,
        outputItemId: null,
        startedAt: null,
        durationMs: 0,
        quality: 'normal',
      },
      {
        slotIndex: 1,
        machineId: 'ferment_jar',
        recipeId: null,
        inputItemId: null,
        outputItemId: null,
        startedAt: null,
        durationMs: 0,
        quality: 'normal',
      },
    ],
  };
}

export function createInitialSkillProfile(): SkillProfile {
  const mk = (level = 1, xp = 0): SkillEntry => ({ level, xp, unlockedTalents: [] });
  return {
    skills: {
      farming: mk(5, 30),
      mining: mk(1, 0),
      fishing: mk(1, 0),
      foraging: mk(1, 0),
      cooking: mk(5, 10),
      crafting: mk(1, 0),
      melee: mk(5, 20),
      ranged: mk(1, 0),
      magic: mk(1, 0),
      summoning: mk(1, 0),
      rogue: mk(1, 0),
      vitality: mk(1, 0),
    },
  };
}

export const INITIAL_PLAYER_STATE: PlayerState = {
  name: 'PhumHero',
  level: 1,
  xp: 0,
  hp: 150,
  maxHp: 150,
  coins: 150,
  currencies: {
    coins: 150,
    gold: 0,
    diamonds: 0,
  },
  lifeStats: {
    farmLevel: 5,
    farmXp: 30,
    stylish: 168,
    friendly: 40,
    happy: 82,
    healthy: 86,
  },
  defense: 10,
  areaChannel: 0,
  zone: 'overworld',
  difficulty: 'normal',
  activeClass: 'lbokator',
  weapon: { ...DEFAULT_STARTER_WEAPON },
  loadout: { ...DEFAULT_LOADOUT },
  inventory: [
    // All 5 Khmer starter class weapons
    { itemId: 'weapon_phkak', quantity: 1, itemLevel: 1 },
    { itemId: 'weapon_thnu', quantity: 1, itemLevel: 1 },
    { itemId: 'weapon_sastra', quantity: 1, itemLevel: 1 },
    { itemId: 'weapon_krama_whip', quantity: 1, itemLevel: 1 },
    { itemId: 'weapon_kambet', quantity: 1, itemLevel: 1 },
    // Hats
    { itemId: 'hat_doun', quantity: 1, itemLevel: 1 },
    { itemId: 'hat_yaksha_mask', quantity: 1, itemLevel: 5 },
    { itemId: 'hat_frog_crown', quantity: 1, itemLevel: 3 },
    { itemId: 'hat_royal_crown', quantity: 1, itemLevel: 8 },
    // Hair items
    { itemId: 'hair_item_short', quantity: 1, itemLevel: 1 },
    { itemId: 'hair_item_spiky', quantity: 1, itemLevel: 1 },
    { itemId: 'hair_item_long', quantity: 1, itemLevel: 1 },
    // Outfits / Shirts (4 Free Starter Outfits + Starter Class Styles)
    { itemId: 'shirt_village_tunic', quantity: 1, itemLevel: 1 },
    { itemId: 'shirt_casual_tee', quantity: 1, itemLevel: 1 },
    { itemId: 'shirt_krama_set', quantity: 1, itemLevel: 2 },
    { itemId: 'shirt_traveler_vest', quantity: 1, itemLevel: 1 },
    { itemId: 'shirt_lbokator_gi', quantity: 1, itemLevel: 4 },
    { itemId: 'shirt_achar_robe', quantity: 1, itemLevel: 4 },
    { itemId: 'shirt_shadow_cloak', quantity: 1, itemLevel: 4 },
    // Pants
    { itemId: 'pants_village_shorts', quantity: 1, itemLevel: 1 },
    { itemId: 'pants_casual_jeans', quantity: 1, itemLevel: 1 },
    { itemId: 'pants_sampot_hol', quantity: 1, itemLevel: 5 },
    // Armor
    { itemId: 'armor_rattan_guard', quantity: 1, itemLevel: 1 },
    { itemId: 'armor_angkor_bronze', quantity: 1, itemLevel: 5 },
    // Wings / Back
    { itemId: 'wings_bamboo_basket', quantity: 1, itemLevel: 1 },
    { itemId: 'wings_ember', quantity: 1, itemLevel: 6 },
    { itemId: 'wings_garuda', quantity: 1, itemLevel: 10 },
    { itemId: 'wings_yant_halo', quantity: 1, itemLevel: 8 },
    // Phase 3 Starter Seeds, Fertilizer & Sample Crops/Ingredients for Artisan & Cooking
    { itemId: 'seed_trakuon', quantity: 8, itemLevel: 1 },
    { itemId: 'seed_slek_krey', quantity: 4, itemLevel: 1 },
    { itemId: 'seed_phka_rumduol', quantity: 3, itemLevel: 1 },
    { itemId: 'fertilizer', quantity: 6, itemLevel: 1 },
    { itemId: 'crop_phka_rumduol', quantity: 3, itemLevel: 1, quality: 'normal' },
    { itemId: 'crop_trakuon', quantity: 2, itemLevel: 1, quality: 'normal' },
    { itemId: 'crop_slek_krey', quantity: 2, itemLevel: 1, quality: 'normal' },
    { itemId: 'drop_fresh_egg', quantity: 2, itemLevel: 1, quality: 'normal' },
    { itemId: 'fruit_coconut', quantity: 2, itemLevel: 1, quality: 'normal' },
    { itemId: 'artisan_palm_sugar', quantity: 2, itemLevel: 1, quality: 'normal' },
    { itemId: 'drop_fresh_milk', quantity: 2, itemLevel: 1, quality: 'normal' },
    // Phase 4 Starter Street Snacks slotted in Quick-Bar
    { itemId: 'snack_num_pang', quantity: 2, itemLevel: 1, quality: 'normal' },
    { itemId: 'snack_kafe', quantity: 1, itemLevel: 1, quality: 'normal' },
    { itemId: 'snack_pepper_skewer', quantity: 1, itemLevel: 1, quality: 'normal' },
    // Update 1.1A Magic Mirror (Home/Farm Recall Tool)
    { itemId: 'tool_magic_mirror', quantity: 1, itemLevel: 1, quality: 'normal' },
    // Update 1.4 Village Heirloom Relic (Ready for Angkor Relic Museum display!)
    { itemId: 'relic_sandstone_apsara', quantity: 1, itemLevel: 1, quality: 'normal' },
    // Update 1.6 Starter Boss Essences (3) & Torn Angkor Treasure Map (1) for immediate testing!
    { itemId: 'essence_slime', quantity: 1, itemLevel: 1, quality: 'normal' },
    { itemId: 'essence_stone', quantity: 1, itemLevel: 1, quality: 'normal' },
    { itemId: 'essence_naga', quantity: 1, itemLevel: 1, quality: 'normal' },
    { itemId: 'item_torn_treasure_map', quantity: 1, itemLevel: 1, quality: 'normal' },
  ],
  farm: createInitialFarmState(),
  skills: createInitialSkillProfile(),
  activeBuffs: [],
  quickSnackSlots: ['snack_num_pang', 'snack_kafe', 'snack_pepper_skewer'],
  clearedBosses: [],
  bossDefeats: {},
  pagodaBundles: {},
  luckyWheelPity: 0,
  villagePassUntil: null,
  extraBagSlots: 0,
  ownedMounts: [],
  activeMount: null,
  dailyFreeCoinSpinDate: null,
  cityServer: 'phnom_penh',
  activeBiome: 'emerald_rice_valley',
  discoveredBiomes: ['emerald_rice_valley'],
  unlockedPylons: ['emerald_rice_valley'],
  bankCoins: 500,
  lastShrinePrayerDate: null,
  weaponPrefix: 'keen',
  armorPrefix: 'armored',
  shimmerBlessings: [],
  npcFriendships: {},
  houseDecor: [
    { uid: 'starter_mat', itemId: 'furn_reed_mat', x: 400, y: 368, rotation: 0 },
    { uid: 'starter_table', itemId: 'furn_teak_table', x: 400, y: 348, rotation: 0 },
    { uid: 'starter_hammock', itemId: 'furn_hammock', x: 208, y: 248, rotation: 0 },
  ],
  ownedFurniture: {
    furn_reed_mat: 2,
    furn_teak_table: 2,
    furn_lotus_lamp: 2,
    furn_hammock: 1,
    furn_krama_tapestry: 2,
    furn_banana_plant: 2,
  },
  highestTowerFloor: 0,
  unlockedWeaponAuras: [],
  museumDonations: [],
  kromId: null,
  kromTag: null,
  kromName: null,
  kromLevel: 0,
  pchumBenBlessingUntil: null,
  festivalSplashCount: 0,
  activeTreasureMap: {
    spotId: 'spot_plaza_se_palm',
    mapId: 'central_plaza',
    clueTitle: 'Central Plaza — Beneath the Southeast Palm Lantern',
    clueDescription:
      'Walk southeast of the Central Courtyard campfire toward the glowing stone lantern beneath the towering sugar palms.',
    x: 1020,
    y: 780,
    discoveredAt: 1,
  },
  reliquaryPityCount: 0,
  reliquaryMythicPityCount: 0,
  reliquaryKeys: 1,
  angkorShards: 0,
  welcomeBundleClaimed: false,
  purchasedDiamondPacks: [],
  lastDailyReliquaryKeyDate: null,
  awakenedWeapons: [],
  colossusSlayerUntil: null,
  pearlDivingStats: {
    divesCompleted: 0,
    pearlsHarvested: 0,
    ancientPearlsFound: 0,
    bestHaulCoins: 0,
  },
  hasBioluminescentWaveAura: false,
  blackMarketPurchasedKeys: [],
  petProgress: {},
  ownedInstruments: ['roneat_aek', 'chapei_dang_veng'],
  equippedInstrument: 'roneat_aek',
  ownedInstrumentSkins: ['classic'],
  equippedInstrumentSkin: 'classic',
  instrumentTipsReceived: 0,
  petRaceWins: 0,
  championPetRibbon: false,
  yardDecor: [
    { uid: 'starter_yard_lantern', itemId: 'yard_stone_lantern', x: 256, y: 176 },
  ],
  ownedYardDecor: {
    yard_stone_lantern: 2,
    yard_teak_bench: 1,
    yard_lotus_koi_pond: 1,
  },
  pvpElo: 1200,
  pvpWins: 0,
  pvpLosses: 0,
  kunKhmerChampionSash: false,
  ownedEmotes: [],
  regionalCargo: {},
  merchantXp: 0,
  reamkerQuestStep: 0,
  reamkerStepProgress: 0,
  deliveryJobsCompleted: 0,
  kulenBlessingUntil: 0,
  ownedKites: [],
  activeKiteId: 'kite_classic_bamboo',
  partyHostCount: 0,
  partyFeastBuffUntil: 0,
  equippedDyes: {},
  unlockedDyes: ['dye_turmeric_gold', 'dye_indigo_krama'],
  folkGameWins: 0,
  folkBadges: [],
  unlockedCropSlots: 2,
  pastureLandLevel: 0,
  ownedFences: 0,
  discoveredBosses: ['sdech_kongkaeb'],
  mapExplorationPct: {},
  discoveredLandmarks: [],
  hasCompletedCreation: false,
  skillDamagePct: 0.025,
  armorDamagePct: 0.04,
  snackBuffPct: 0,
};
