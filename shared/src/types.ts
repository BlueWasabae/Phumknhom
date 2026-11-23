export type ZoneType = 'overworld' | 'dungeon';

export type DifficultyMode = 'normal' | 'expert' | 'calamity' | 'death';

export type EmoteSymbol = '👋' | '😄' | '❤️' | '🔥';

export interface WeaponStats {
  id: string;
  name: string;
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
  coins: number;
  defense: number;
  areaChannel: number;
  zone: ZoneType;
  difficulty: DifficultyMode;
  weapon: WeaponStats;
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
  id: 'khmer_short_sword',
  name: 'Khmer Short Sword',
  baseDamage: 18,
  upgradeLevel: 1,
  armorPen: 2,
  critChance: 0.22,
  attackCooldownMs: 320,
  knockbackForce: 210,
};

export const INITIAL_PLAYER_STATE: PlayerState = {
  name: 'PhumHero',
  level: 1,
  xp: 0,
  hp: 140,
  maxHp: 140,
  coins: 500,
  defense: 8,
  areaChannel: 0,
  zone: 'overworld',
  difficulty: 'normal',
  weapon: { ...DEFAULT_STARTER_WEAPON },
  skillDamagePct: 0.05,
  armorDamagePct: 0.0,
  snackBuffPct: 0.1,
};
