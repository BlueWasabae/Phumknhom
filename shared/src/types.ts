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
  | 'cavern'
  | 'tower'
  | 'festival_race'
  | 'farm'
  | 'club'
  | 'khmer_world'
  | 'house';

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
  mapId: 'central_plaza' | 'market_street' | 'temple_district' | 'green_park' | 'wild_frontier';
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

export type WeaponAuraId = 'golden_lotus' | 'emerald_naga' | 'celestial_angkor';

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

export type DifficultyMode = 'normal' | 'expert' | 'mythic' | 'death';

export type BossId = 'sdech_kongkaeb' | 'arp_prey_chrov' | 'yeak_thmor' | 'neak_reach';

export type BossRigType =
  | 'QuadrupedHopperRig'
  | 'HumanoidRig'
  | 'FloaterRig'
  | 'MultiSegmentWormRig';

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

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

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
  currentMapId?: 'central_plaza' | 'market_street' | 'temple_district' | 'green_park' | 'wild_frontier';
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
    const isStarterTrakuon = index === 0;
    const isStarterRice = index === 1;
    return {
      index,
      unlocked: index < 18,
      tilled: index < 6,
      cropId: isStarterTrakuon ? 'trakuon' : isStarterRice ? 'phka_rumduol' : null,
      plantedAt: isStarterTrakuon ? now - 95_000 : isStarterRice ? now - 120_000 : null,
      effectiveGrowMs: isStarterTrakuon ? 120_000 : isStarterRice ? 900_000 : 0,
      watered: isStarterTrakuon || isStarterRice,
      fertilized: isStarterTrakuon,
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
    livestock: [
      {
        slotIndex: 0,
        animalId: 'village_chicken',
        acquiredAt: now - 1_200_000,
        lastCollectedAt: now - 1_140_000, // Ready in 60s
        fed: true,
      },
    ],
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
  coins: 2500,
  currencies: {
    coins: 2500,
    gold: 10,
    diamonds: 50,
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
  hasCompletedCreation: false,
  skillDamagePct: 0.025,
  armorDamagePct: 0.04,
  snackBuffPct: 0,
};
