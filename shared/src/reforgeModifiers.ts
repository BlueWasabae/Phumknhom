export type ReforgeCategory = 'weapon' | 'armor';

export interface ReforgeModifierDef {
  id: string;
  name: string;
  khmerName: string;
  category: ReforgeCategory;
  tier: 'bad' | 'common' | 'good' | 'epic' | 'mythic';
  colorHex: string;
  weight: number;
  damagePct: number;      // e.g. +0.15 = +15% weapon damage
  critBonus: number;      // e.g. +0.05 = +5% crit
  speedPct: number;       // e.g. +0.10 = +10% attack/cast speed
  moveSpeedPct: number;   // e.g. +0.04 = +4% movement speed (Quick!)
  sizePct: number;        // e.g. +0.10 = +10% melee slash size (Legendary!)
  defenseFlat: number;    // e.g. +4 DEF (Warding!)
  maxHpFlat: number;      // e.g. +10 HP
  summary: string;
}

export const WEAPON_REFORGES: Record<string, ReforgeModifierDef> = {
  legendary: {
    id: 'legendary',
    name: 'Legendary',
    khmerName: 'រឿងព្រេង',
    category: 'weapon',
    tier: 'mythic',
    colorHex: '#facc15',
    weight: 6,
    damagePct: 0.15,
    critBonus: 0.05,
    speedPct: 0.1,
    moveSpeedPct: 0,
    sizePct: 0.1,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% Melee Dmg · +10% Speed · +5% Crit · +10% Size',
  },
  mythical: {
    id: 'mythical',
    name: 'Mythical',
    khmerName: 'ទេពនិម្មិត',
    category: 'weapon',
    tier: 'mythic',
    colorHex: '#e879f9',
    weight: 6,
    damagePct: 0.15,
    critBonus: 0.05,
    speedPct: 0.1,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% Magic Dmg · +10% Speed · +5% Crit',
  },
  unreal: {
    id: 'unreal',
    name: 'Unreal',
    khmerName: 'អស្ចារ្យហួស',
    category: 'weapon',
    tier: 'mythic',
    colorHex: '#38bdf8',
    weight: 7,
    damagePct: 0.15,
    critBonus: 0.05,
    speedPct: 0.1,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% Ranged Dmg · +10% Speed · +5% Crit',
  },
  godly: {
    id: 'godly',
    name: 'Godly',
    khmerName: 'ទេវតា',
    category: 'weapon',
    tier: 'epic',
    colorHex: '#fb923c',
    weight: 11,
    damagePct: 0.15,
    critBonus: 0.05,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% Dmg · +5% Crit',
  },
  demonic: {
    id: 'demonic',
    name: 'Demonic',
    khmerName: 'យក្សកំណាច',
    category: 'weapon',
    tier: 'epic',
    colorHex: '#f43f5e',
    weight: 12,
    damagePct: 0.15,
    critBonus: 0.04,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% Dmg · +4% Crit',
  },
  superior: {
    id: 'superior',
    name: 'Superior',
    khmerName: 'ឆ្នើមឧត្តម',
    category: 'weapon',
    tier: 'good',
    colorHex: '#4ade80',
    weight: 15,
    damagePct: 0.1,
    critBonus: 0.03,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0.05,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+10% Dmg · +3% Crit',
  },
  ruthless: {
    id: 'ruthless',
    name: 'Ruthless',
    khmerName: 'កាចសាហាវ',
    category: 'weapon',
    tier: 'good',
    colorHex: '#22c55e',
    weight: 13,
    damagePct: 0.17,
    critBonus: 0,
    speedPct: -0.04,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+17% Dmg · -4% Speed',
  },
  keen: {
    id: 'keen',
    name: 'Keen',
    khmerName: 'មុតស្រួច',
    category: 'weapon',
    tier: 'common',
    colorHex: '#a3e635',
    weight: 16,
    damagePct: 0,
    critBonus: 0.05,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+5% Crit',
  },
  shoddy: {
    id: 'shoddy',
    name: 'Shoddy',
    khmerName: 'ទ្រុឌទ្រោម',
    category: 'weapon',
    tier: 'bad',
    colorHex: '#94a3b8',
    weight: 8,
    damagePct: -0.08,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '-8% Dmg (Reforge!)',
  },
  broken: {
    id: 'broken',
    name: 'Broken',
    khmerName: 'បែកបាក់',
    category: 'weapon',
    tier: 'bad',
    colorHex: '#64748b',
    weight: 6,
    damagePct: -0.15,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '-15% Dmg (Reforge!)',
  },
};

export const ARMOR_REFORGES: Record<string, ReforgeModifierDef> = {
  warding: {
    id: 'warding',
    name: 'Warding',
    khmerName: 'ការពាររឹងមាំ',
    category: 'armor',
    tier: 'mythic',
    colorHex: '#38bdf8',
    weight: 12,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 4,
    maxHpFlat: 0,
    summary: '+4 Def',
  },
  menacing: {
    id: 'menacing',
    name: 'Menacing',
    khmerName: 'គំរាមកំហែង',
    category: 'armor',
    tier: 'mythic',
    colorHex: '#f43f5e',
    weight: 12,
    damagePct: 0.04,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+4% All Damage',
  },
  lucky: {
    id: 'lucky',
    name: 'Lucky',
    khmerName: 'សំណាងល្អ',
    category: 'armor',
    tier: 'epic',
    colorHex: '#facc15',
    weight: 14,
    damagePct: 0,
    critBonus: 0.04,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+4% Crit',
  },
  quick: {
    id: 'quick',
    name: 'Quick',
    khmerName: 'រហ័សរហួន',
    category: 'armor',
    tier: 'epic',
    colorHex: '#34d399',
    weight: 16,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0.04,
    moveSpeedPct: 0.04,
    sizePct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+4% Move Speed',
  },
  armored: {
    id: 'armored',
    name: 'Armored',
    khmerName: 'ក្រោះដែក',
    category: 'armor',
    tier: 'good',
    colorHex: '#a3e635',
    weight: 15,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 3,
    maxHpFlat: 0,
    summary: '+3 Def',
  },
  guarding: {
    id: 'guarding',
    name: 'Guarding',
    khmerName: 'ការពារខ្លួន',
    category: 'armor',
    tier: 'good',
    colorHex: '#86efac',
    weight: 16,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 2,
    maxHpFlat: 0,
    summary: '+2 Def',
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    khmerName: 'រឹងមាំ',
    category: 'armor',
    tier: 'common',
    colorHex: '#cbd5e1',
    weight: 15,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0,
    moveSpeedPct: 0,
    sizePct: 0,
    defenseFlat: 1,
    maxHpFlat: 0,
    summary: '+1 Def',
  },
};

export const REFORGE_COST_COINS: Record<ReforgeCategory, number> = {
  weapon: 350,
  armor: 280,
};

/**
 * Scaling Blacksmith Coin Sink fee based on gear tier/level.
 */
export function getScaledReforgeCost(category: ReforgeCategory, itemTierPower = 1): number {
  const base = REFORGE_COST_COINS[category];
  const scale = 1 + Math.max(0, Math.min(20, Math.floor(itemTierPower) - 1)) * 0.08;
  return Math.round((base * scale) / 10) * 10;
}

export function getReforgeModifier(
  category: ReforgeCategory,
  id: string | null | undefined
): ReforgeModifierDef | null {
  if (!id) return null;
  return category === 'weapon' ? WEAPON_REFORGES[id] ?? null : ARMOR_REFORGES[id] ?? null;
}

export function rollReforgeModifier(
  category: ReforgeCategory,
  currentId?: string | null,
  rng: () => number = Math.random
): ReforgeModifierDef {
  const pool = Object.values(category === 'weapon' ? WEAPON_REFORGES : ARMOR_REFORGES).filter(
    (m) => m.id !== currentId
  );
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let r = rng() * totalWeight;
  for (const mod of pool) {
    r -= mod.weight;
    if (r <= 0) return mod;
  }
  return pool[0];
}
