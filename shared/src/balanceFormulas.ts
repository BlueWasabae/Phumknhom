import type { CombatHitResult, DifficultyMode } from './types';

export interface PlayerDamageInput {
  weaponBase: number;
  upgradeLevel?: number; // +0 to +10 (+6% base weapon power per upgrade)
  flatBonuses?: number;
  skillPct?: number;     // e.g. 0.10 = +10%
  armorPct?: number;
  snackBuffPct?: number;
  enemyDefense?: number;
  armorPen?: number;
  bossDR?: number;       // 0..0.95
  critChance?: number;   // 0..1
  isCritOverride?: boolean;
  focusActive?: boolean; // Calamity Focus burst = 2.20x
  rng?: () => number;    // Injectable deterministic RNG for testing
}

export interface DamageTakenInput {
  bossAttack: number;
  currentDefense: number;
  rawDR?: number;
  difficulty?: DifficultyMode;
}

const DEFENSE_MODE_MULTIPLIER: Record<DifficultyMode, number> = {
  normal: 0.5,
  expert: 0.75,
  calamity: 1.0,
  death: 1.0,
};

const BOSS_DIFFICULTY_MULTIPLIER: Record<DifficultyMode, number> = {
  normal: 1.0,
  expert: 1.5,
  calamity: 1.9,
  death: 2.3,
};

/**
 * Main Adventurer Level & Skill XP Curve (Lv. 1-100):
 * XP_next(L) = floor(100 * (L ^ 1.65))
 * Reference: docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §4.1
 */
export function getXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(100 * Math.pow(safeLevel, 1.65));
}

/**
 * 4-Step Player Offensive Damage Formula with ±8% variance:
 * 1. RawDmg   = (WeaponBase * (1 + 0.06 * UpgradeLv) + FlatBonuses) * (1 + SkillPct + ArmorPct + SnackBuffPct)
 * 2. AfterDef = max(1, RawDmg - max(0, (EnemyDef - ArmorPen) * 0.5))
 * 3. FinalDmg = AfterDef * (1 - BossDR) * CritMult * FocusMult * Variance(0.92..1.08)
 * Reference: docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §4.2
 */
export function calculatePlayerDamage(input: PlayerDamageInput): CombatHitResult {
  const rng = input.rng ?? Math.random;
  const upgradeLv = Math.max(0, Math.min(10, Math.floor(input.upgradeLevel ?? 0)));
  const flatBonuses = input.flatBonuses ?? 0;
  const skillPct = input.skillPct ?? 0;
  const armorPct = input.armorPct ?? 0;
  const snackBuffPct = input.snackBuffPct ?? 0;
  const enemyDefense = Math.max(0, input.enemyDefense ?? 0);
  const armorPen = Math.max(0, input.armorPen ?? 0);
  const bossDR = Math.max(0, Math.min(0.95, input.bossDR ?? 0));
  const critChance = Math.max(0, Math.min(1, input.critChance ?? 0.05));

  const rawDamage =
    (input.weaponBase * (1 + 0.06 * upgradeLv) + flatBonuses) *
    (1 + skillPct + armorPct + snackBuffPct);

  const defenseMitigation = Math.max(0, (enemyDefense - armorPen) * 0.5);
  const afterDefense = Math.max(1, rawDamage - defenseMitigation);

  const isCrit = input.isCritOverride ?? rng() < critChance;
  const critMult = isCrit ? 1.75 : 1.0;
  const isFocusBurst = Boolean(input.focusActive);
  const focusMult = isFocusBurst ? 2.2 : 1.0;

  // ±8% variance: [0.92, 1.08]
  const varianceMultiplier = 0.92 + rng() * 0.16;

  const finalDamage = Math.max(
    1,
    Math.round(afterDefense * (1 - bossDR) * critMult * focusMult * varianceMultiplier)
  );

  return {
    rawDamage: Math.round(rawDamage * 100) / 100,
    afterDefense: Math.round(afterDefense * 100) / 100,
    finalDamage,
    isCrit,
    isFocusBurst,
    varianceMultiplier: Math.round(varianceMultiplier * 1000) / 1000,
  };
}

/**
 * Calamity Diminishing Damage Reduction (DR):
 * EffectiveDR = 1 - (1 / (1 + RawDR))
 * Reference: docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §4.3
 */
export function calculateEffectiveDR(rawDR: number): number {
  const safeRaw = Math.max(0, rawDR);
  return 1 - 1 / (1 + safeRaw);
}

/**
 * Player Defense & Damage Taken Formula:
 * DamageTaken = max(1, (BossAttack - (CurrentDef * D_mode)) * (1 - EffectiveDR))
 * D_mode: Normal = 0.50, Expert = 0.75, Calamity/Death = 1.00
 * Reference: docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §4.3
 */
export function calculateDamageTaken(input: DamageTakenInput): number {
  const difficulty = input.difficulty ?? 'normal';
  const dMode = DEFENSE_MODE_MULTIPLIER[difficulty];
  const effectiveDR = calculateEffectiveDR(input.rawDR ?? 0);
  const mitigated = (input.bossAttack - input.currentDefense * dMode) * (1 - effectiveDR);
  return Math.max(1, Math.round(mitigated));
}

/**
 * Co-op Boss HP Scaling Formula:
 * BossHP_party = BossHP_solo * (1 + 0.65 * (PartySize - 1)) * M_diff
 * PartySize: 1..4 | M_diff: Normal 1.0, Expert 1.5, Calamity 1.9, Death 2.3
 * Reference: docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §4.4
 */
export function calculateCoopBossHp(
  soloHp: number,
  partySize: number,
  difficulty: DifficultyMode = 'normal'
): number {
  const clampedParty = Math.max(1, Math.min(4, Math.floor(partySize)));
  const mDiff = BOSS_DIFFICULTY_MULTIPLIER[difficulty];
  return Math.round(soloHp * (1 + 0.65 * (clampedParty - 1)) * mDiff);
}
