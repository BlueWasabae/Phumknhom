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
  defenseFlat: number;    // e.g. +4 DEF (Warding!)
  maxHpFlat: number;      // e.g. +15 HP
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
    damagePct: 0.18,
    critBonus: 0.06,
    speedPct: 0.1,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+18% DMG · +6% Crit · +10% Speed',
  },
  mythical: {
    id: 'mythical',
    name: 'Mythical',
    khmerName: 'ទេពនិម្មិត',
    category: 'weapon',
    tier: 'mythic',
    colorHex: '#e879f9',
    weight: 6,
    damagePct: 0.16,
    critBonus: 0.07,
    speedPct: 0.08,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+16% DMG · +7% Crit · +8% Speed',
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
    critBonus: 0.08,
    speedPct: 0.09,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% DMG · +8% Crit · +9% Speed',
  },
  godly: {
    id: 'godly',
    name: 'Godly',
    khmerName: 'ទេវតា',
    category: 'weapon',
    tier: 'epic',
    colorHex: '#fb923c',
    weight: 12,
    damagePct: 0.14,
    critBonus: 0.05,
    speedPct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+14% DMG · +5% Crit',
  },
  demonic: {
    id: 'demonic',
    name: 'Demonic',
    khmerName: 'យក្សកំណាច',
    category: 'weapon',
    tier: 'epic',
    colorHex: '#f43f5e',
    weight: 14,
    damagePct: 0.15,
    critBonus: 0.04,
    speedPct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+15% DMG · +4% Crit',
  },
  ruthless: {
    id: 'ruthless',
    name: 'Ruthless',
    khmerName: 'កាចសាហាវ',
    category: 'weapon',
    tier: 'good',
    colorHex: '#4ade80',
    weight: 16,
    damagePct: 0.17,
    critBonus: 0,
    speedPct: -0.04,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+17% DMG · -4% Speed',
  },
  keen: {
    id: 'keen',
    name: 'Keen',
    khmerName: 'មុតស្រួច',
    category: 'weapon',
    tier: 'good',
    colorHex: '#a3e635',
    weight: 18,
    damagePct: 0.06,
    critBonus: 0.05,
    speedPct: 0.04,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '+6% DMG · +5% Crit · +4% Speed',
  },
  shoddy: {
    id: 'shoddy',
    name: 'Shoddy',
    khmerName: 'ទ្រុឌទ្រោម',
    category: 'weapon',
    tier: 'bad',
    colorHex: '#94a3b8',
    weight: 13,
    damagePct: -0.08,
    critBonus: 0,
    speedPct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '-8% DMG (Reforge again!)',
  },
  broken: {
    id: 'broken',
    name: 'Broken',
    khmerName: 'បែកបាក់',
    category: 'weapon',
    tier: 'bad',
    colorHex: '#64748b',
    weight: 8,
    damagePct: -0.15,
    critBonus: -0.02,
    speedPct: 0,
    defenseFlat: 0,
    maxHpFlat: 0,
    summary: '-15% DMG · -2% Crit (Reforge!)',
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
    defenseFlat: 6,
    maxHpFlat: 20,
    summary: '+6 DEF · +20 Max HP',
  },
  menacing: {
    id: 'menacing',
    name: 'Menacing',
    khmerName: 'គំរាមកំហែង',
    category: 'armor',
    tier: 'mythic',
    colorHex: '#f43f5e',
    weight: 12,
    damagePct: 0.08,
    critBonus: 0.02,
    speedPct: 0,
    defenseFlat: 1,
    maxHpFlat: 0,
    summary: '+8% DMG · +2% Crit · +1 DEF',
  },
  lucky: {
    id: 'lucky',
    name: 'Lucky',
    khmerName: 'សំណាងល្អ',
    category: 'armor',
    tier: 'epic',
    colorHex: '#facc15',
    weight: 15,
    damagePct: 0,
    critBonus: 0.07,
    speedPct: 0,
    defenseFlat: 2,
    maxHpFlat: 0,
    summary: '+7% Crit · +2 DEF',
  },
  quick: {
    id: 'quick',
    name: 'Quick',
    khmerName: 'រហ័សរហួន',
    category: 'armor',
    tier: 'epic',
    colorHex: '#34d399',
    weight: 18,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0.1,
    defenseFlat: 1,
    maxHpFlat: 0,
    summary: '+10% Attack Speed · +1 DEF',
  },
  armored: {
    id: 'armored',
    name: 'Armored',
    khmerName: 'ក្រោះដែក',
    category: 'armor',
    tier: 'good',
    colorHex: '#a3e635',
    weight: 22,
    damagePct: 0,
    critBonus: 0,
    speedPct: 0,
    defenseFlat: 4,
    maxHpFlat: 10,
    summary: '+4 DEF · +10 Max HP',
  },
  arcane: {
    id: 'arcane',
    name: 'Arcane',
    khmerName: 'មន្តអាគម',
    category: 'armor',
    tier: 'good',
    colorHex: '#c084fc',
    weight: 21,
    damagePct: 0.04,
    critBonus: 0.03,
    speedPct: 0.05,
    defenseFlat: 1,
    maxHpFlat: 10,
    summary: '+4% DMG · +3% Crit · +10 HP',
  },
};

export const REFORGE_COST_COINS: Record<ReforgeCategory, number> = {
  weapon: 350,
  armor: 280,
};

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
