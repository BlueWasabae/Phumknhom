export type ZoneType = 'overworld' | 'dungeon';

export type DifficultyMode = 'normal' | 'expert' | 'calamity' | 'death';

export type EmoteSymbol = '👋' | '😄' | '❤️' | '🔥';

export type KhmerClassId = 'lbokator' | 'archer' | 'mystic' | 'tamer' | 'shadow';

export type EquipSlot =
  | 'hat'
  | 'hair'
  | 'shirt'
  | 'pants'
  | 'wings'
  | 'pet'
  | 'weapon'
  | 'armor';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type HairStyleId = 'hair_short' | 'hair_bob' | 'hair_spiky' | 'hair_long';

export type EyeStyleId = 'cheerful' | 'classic' | 'cool' | 'starry';

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

export interface EquippedLoadout {
  skinColor: string;
  eyeStyle: EyeStyleId;
  hairStyle: HairStyleId;
  hairColor: string;
  hat: string | null;
  hair: string | null;
  shirt: string | null;
  pants: string | null;
  wings: string | null;
  pet: string | null;
  weapon: string | null;
  armor: string | null;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  itemLevel: number;
  durability?: number;
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
  coins: number; // Mirrored with currencies.coins for backward compatibility
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
  skinColor: '#f4c29f',
  eyeStyle: 'cheerful',
  hairStyle: 'hair_short',
  hairColor: '#1e1b24',
  hat: 'hat_doun',
  hair: 'hair_item_short',
  shirt: 'shirt_krama_set',
  pants: 'pants_village_shorts',
  wings: null,
  pet: 'pet_mini_naga',
  weapon: 'weapon_phkak',
  armor: 'armor_rattan_guard',
};

export const INITIAL_PLAYER_STATE: PlayerState = {
  name: 'PhumHero',
  level: 1,
  xp: 0,
  hp: 150,
  maxHp: 150,
  coins: 1250,
  currencies: {
    coins: 1250,
    gold: 10,
    diamonds: 50,
  },
  lifeStats: {
    farmLevel: 1,
    farmXp: 25,
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
    // All 5 Khmer starter class weapons for immediate testing
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
    // Outfits / Shirts
    { itemId: 'shirt_village_tunic', quantity: 1, itemLevel: 1 },
    { itemId: 'shirt_krama_set', quantity: 1, itemLevel: 2 },
    { itemId: 'shirt_lbokator_gi', quantity: 1, itemLevel: 4 },
    { itemId: 'shirt_achar_robe', quantity: 1, itemLevel: 4 },
    { itemId: 'shirt_shadow_cloak', quantity: 1, itemLevel: 4 },
    // Pants
    { itemId: 'pants_village_shorts', quantity: 1, itemLevel: 1 },
    { itemId: 'pants_sampot_hol', quantity: 1, itemLevel: 5 },
    // Armor
    { itemId: 'armor_rattan_guard', quantity: 1, itemLevel: 1 },
    { itemId: 'armor_angkor_bronze', quantity: 1, itemLevel: 5 },
    // Wings / Back
    { itemId: 'wings_bamboo_basket', quantity: 1, itemLevel: 1 },
    { itemId: 'wings_ember', quantity: 1, itemLevel: 6 },
    { itemId: 'wings_garuda', quantity: 1, itemLevel: 10 },
    { itemId: 'wings_yant_halo', quantity: 1, itemLevel: 8 },
    // Pets
    { itemId: 'pet_mini_naga', quantity: 1, itemLevel: 5 },
    { itemId: 'pet_firefly_lantern', quantity: 1, itemLevel: 3 },
    { itemId: 'pet_lucky_kitten', quantity: 1, itemLevel: 4 },
  ],
  skillDamagePct: 0.05,
  armorDamagePct: 0.04,
  snackBuffPct: 0.1,
};
