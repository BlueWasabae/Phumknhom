import type { KhmerClassId, PlayerState } from './types';

export interface AwakeningMaterialDef {
  id: string;
  name: string;
  khmerName: string;
  icon: string;
  zoneId: 'mining_quarry' | 'bamboo_forest' | 'sunken_ruins';
  zoneName: string;
  dropRatePct: number;
  description: string;
}

export const AWAKENING_MATERIALS: Record<string, AwakeningMaterialDef> = {
  mat_golden_laterite_core: {
    id: 'mat_golden_laterite_core',
    name: 'Golden Laterite Core',
    khmerName: 'ស្នូលថ្មបាយក្រៀមមាស',
    icon: '🔶',
    zoneId: 'mining_quarry',
    zoneName: 'Mining Quarry',
    dropRatePct: 8,
    description: 'Crystallized golden sandstone core unearthed rarely from deep ore veins in Mining Quarry.',
  },
  mat_spirit_bamboo_heart: {
    id: 'mat_spirit_bamboo_heart',
    name: 'Spirit Bamboo Heart',
    khmerName: 'បេះដូងឫស្សីទេព',
    icon: '🎋',
    zoneId: 'bamboo_forest',
    zoneName: 'Bamboo Forest',
    dropRatePct: 8,
    description: 'Luminous emerald bamboo pith dropped rarely by ancient spirit stalks in Bamboo Forest.',
  },
  mat_sunken_angkor_relic: {
    id: 'mat_sunken_angkor_relic',
    name: 'Sunken Angkor Relic',
    khmerName: 'វត្ថុបុរាណអង្គរលិចទឹក',
    icon: '🏺',
    zoneId: 'sunken_ruins',
    zoneName: 'Sunken Ruins',
    dropRatePct: 8,
    description: 'Prismatic turquoise temple relic recovered rarely from flooded chests & spirits in Sunken Ruins.',
  },
};

export const AWAKENING_MATERIAL_LIST: AwakeningMaterialDef[] = Object.values(AWAKENING_MATERIALS);

export const AWAKENING_COIN_COST = 5000;
export const AWAKENING_REFORGE_STONE_COST = 5;
export const AWAKENING_REQUIRED_UPGRADE_LEVEL = 10;
export const TEMPER_TO_MAX_COIN_COST = 1200;

export interface AwakenedWeaponDef {
  id: string;
  classId: KhmerClassId;
  className: string;
  name: string;
  khmerName: string;
  icon: string;
  primaryColor: string;
  accentColor: string;
  passiveTitle: string;
  passiveDescription: string;
  attack: number;
  armorPen: number;
  critChance: number;
  attackCooldownMs: number;
  knockbackForce: number;
  stylishScore: number;
}

export const AWAKENED_WEAPONS: Record<KhmerClassId, AwakenedWeaponDef> = {
  lbokator: {
    id: 'weapon_awakened_hanuman_vajra',
    classId: 'lbokator',
    className: 'Lbokator Warrior',
    name: 'Awakened Hanuman Vajra Fist',
    khmerName: 'កណ្តាប់ដៃវជ្រៈហនុមានបុរាណ',
    icon: '⚡🥊',
    primaryColor: '#22d3ee',
    accentColor: '#facc15',
    passiveTitle: 'Vajra Thunderclap (Every 3rd Punch)',
    passiveDescription:
      'Every 3rd Lbokator punch unleashes a blooming prismatic gold-cyan lightning shockwave across the arena (+45% AoE burst).',
    attack: 68,
    armorPen: 14,
    critChance: 0.34,
    attackCooldownMs: 220,
    knockbackForce: 260,
    stylishScore: 220,
  },
  archer: {
    id: 'weapon_awakened_angkor_sunbow',
    classId: 'archer',
    className: 'Divine Archer',
    name: 'Awakened Angkor Sunbow',
    khmerName: 'ធ្នូព្រះអាទិត្យអង្គរបុរាណ',
    icon: '☀️🏹',
    primaryColor: '#facc15',
    accentColor: '#22d3ee',
    passiveTitle: 'Prismatic Solar Comet',
    passiveDescription:
      'Fires piercing prismatic solar arrows leaving a luminous cyan-gold comet trail that slices through all targets.',
    attack: 62,
    armorPen: 15,
    critChance: 0.42,
    attackCooldownMs: 240,
    knockbackForce: 190,
    stylishScore: 220,
  },
  mystic: {
    id: 'weapon_awakened_celestial_yant',
    classId: 'mystic',
    className: 'Achar Mystic',
    name: 'Awakened Celestial Yant Staff',
    khmerName: 'ដំបងយ័ន្តទេពអង្គរបុរាណ',
    icon: '☸️✨',
    primaryColor: '#38bdf8',
    accentColor: '#fde047',
    passiveTitle: 'Homing Lotus Mandala',
    passiveDescription:
      'Casts homing lotus-rune orbs that curve into bosses and detonate into blooming geometric Khmer Yant rings.',
    attack: 66,
    armorPen: 16,
    critChance: 0.36,
    attackCooldownMs: 270,
    knockbackForce: 175,
    stylishScore: 225,
  },
  tamer: {
    id: 'weapon_awakened_naga_scepter',
    classId: 'tamer',
    className: 'Barami Spirit Tamer',
    name: 'Awakened Sovereign Naga Scepter',
    khmerName: 'ដំបងស្តេចនាគរាជបុរាណ',
    icon: '🐉👑',
    primaryColor: '#10b981',
    accentColor: '#facc15',
    passiveTitle: 'Spectral Naga Co-Lash',
    passiveDescription:
      'Every whip strike summons a glowing spectral emerald-gold Naga serpent that lunges and lashes enemies alongside you.',
    attack: 64,
    armorPen: 14,
    critChance: 0.35,
    attackCooldownMs: 260,
    knockbackForce: 210,
    stylishScore: 225,
  },
  shadow: {
    id: 'weapon_awakened_eclipse_blades',
    classId: 'shadow',
    className: 'Shadow Hunter',
    name: 'Awakened Eclipse Twin-Krama Blades',
    khmerName: 'ដាវភ្លោះសូរ្យគ្រាសក្រមាបុរាណ',
    icon: '🌙🗡️',
    primaryColor: '#a855f7',
    accentColor: '#facc15',
    passiveTitle: 'Eclipse Crescent & Afterimage',
    passiveDescription:
      'Sends violet-gold crescent energy waves flying forward while leaving shimmering shadow afterimages on every slash.',
    attack: 65,
    armorPen: 17,
    critChance: 0.45,
    attackCooldownMs: 195,
    knockbackForce: 185,
    stylishScore: 230,
  },
};

export const AWAKENED_WEAPON_LIST: AwakenedWeaponDef[] = Object.values(AWAKENED_WEAPONS);

export function isAwakenedWeaponId(weaponId: string | null | undefined): boolean {
  if (!weaponId) return false;
  return AWAKENED_WEAPON_LIST.some((w) => w.id === weaponId);
}

export function getAwakenedWeaponById(weaponId: string | null | undefined): AwakenedWeaponDef | null {
  if (!weaponId) return null;
  return AWAKENED_WEAPON_LIST.find((w) => w.id === weaponId) ?? null;
}

export function countInventoryItem(player: PlayerState, itemId: string): number {
  return player.inventory
    .filter((i) => i.itemId === itemId)
    .reduce((sum, i) => sum + i.quantity, 0);
}

export interface AwakeningCheckResult {
  alreadyAwakened: boolean;
  weaponMaxed: boolean;
  hasLateriteCore: boolean;
  hasBambooHeart: boolean;
  hasSunkenRelic: boolean;
  hasCoins: boolean;
  hasReforgeStones: boolean;
  canAwaken: boolean;
  reforgeStonesCount: number;
}

export function checkAwakeningRequirements(
  player: PlayerState,
  classId: KhmerClassId
): AwakeningCheckResult {
  const def = AWAKENED_WEAPONS[classId];
  const alreadyAwakened =
    (player.awakenedWeapons ?? []).includes(def.id) ||
    player.inventory.some((i) => i.itemId === def.id && i.quantity > 0);

  // Player's equipped weapon for this class must be maxed (+10), OR player already maxed a weapon
  const weaponMaxed =
    player.weapon.upgradeLevel >= AWAKENING_REQUIRED_UPGRADE_LEVEL ||
    player.inventory.some((i) => i.itemLevel >= AWAKENING_REQUIRED_UPGRADE_LEVEL);

  const hasLateriteCore = countInventoryItem(player, 'mat_golden_laterite_core') >= 1;
  const hasBambooHeart = countInventoryItem(player, 'mat_spirit_bamboo_heart') >= 1;
  const hasSunkenRelic = countInventoryItem(player, 'mat_sunken_angkor_relic') >= 1;
  const hasCoins = player.currencies.coins >= AWAKENING_COIN_COST;
  const reforgeStonesCount = countInventoryItem(player, 'mat_reforge_stone');
  const hasReforgeStones = reforgeStonesCount >= AWAKENING_REFORGE_STONE_COST;

  return {
    alreadyAwakened,
    weaponMaxed,
    hasLateriteCore,
    hasBambooHeart,
    hasSunkenRelic,
    hasCoins,
    hasReforgeStones,
    reforgeStonesCount,
    canAwaken:
      !alreadyAwakened &&
      weaponMaxed &&
      hasLateriteCore &&
      hasBambooHeart &&
      hasSunkenRelic &&
      hasCoins &&
      hasReforgeStones,
  };
}

function consumeItem(
  inv: PlayerState['inventory'],
  itemId: string,
  qty: number
): PlayerState['inventory'] {
  let rem = qty;
  return inv
    .map((entry) => {
      if (entry.itemId !== itemId || rem <= 0) return { ...entry };
      const take = Math.min(entry.quantity, rem);
      rem -= take;
      return { ...entry, quantity: entry.quantity - take };
    })
    .filter((entry) => entry.quantity > 0);
}

/**
 * Blacksmith Temper-to-Max (+10) helper so players who want to prep a class weapon
 * for Ancient Awakening can temper it directly at Grandpa Chann's forge.
 */
export function temperWeaponToMax(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string } {
  if (state.weapon.upgradeLevel >= AWAKENING_REQUIRED_UPGRADE_LEVEL) {
    return { state, ok: false, message: `${state.weapon.name} is already maxed (+10)!` };
  }
  if (state.currencies.coins < TEMPER_TO_MAX_COIN_COST) {
    return {
      state,
      ok: false,
      message: `Need ${TEMPER_TO_MAX_COIN_COST.toLocaleString()} Coins to temper weapon to +10.`,
    };
  }
  const nextCoins = state.currencies.coins - TEMPER_TO_MAX_COIN_COST;
  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      weapon: {
        ...state.weapon,
        upgradeLevel: AWAKENING_REQUIRED_UPGRADE_LEVEL,
      },
    },
    ok: true,
    message: `🔥 Tempered ${state.weapon.name} to MAX +10! Ready for Ancient Weapon Awakening!`,
  };
}

/**
 * Performs Ancient Weapon Awakening at Grandpa Chann's Blacksmith Forge.
 * Consumes 1x Golden Laterite Core, 1x Spirit Bamboo Heart, 1x Sunken Angkor Relic,
 * 5,000 Coins, and 5x Reforge Stones, grants + auto-equips the Ancient weapon, and
 * persists its ID in `awakenedWeapons`.
 */
export function performWeaponAwakening(
  state: PlayerState,
  classId: KhmerClassId
): { state: PlayerState; ok: boolean; message: string; awakenedWeapon?: AwakenedWeaponDef } {
  const def = AWAKENED_WEAPONS[classId];
  const check = checkAwakeningRequirements(state, classId);

  if (check.alreadyAwakened) {
    return { state, ok: false, message: `${def.name} is already Awakened! Equip it anytime.` };
  }
  if (!check.weaponMaxed) {
    return {
      state,
      ok: false,
      message: 'First temper your equipped class weapon to MAX (+10) at Grandpa Chann’s Forge!',
    };
  }
  if (!check.hasLateriteCore) {
    return { state, ok: false, message: 'Missing 1× Golden Laterite Core (Mining Quarry).' };
  }
  if (!check.hasBambooHeart) {
    return { state, ok: false, message: 'Missing 1× Spirit Bamboo Heart (Bamboo Forest).' };
  }
  if (!check.hasSunkenRelic) {
    return { state, ok: false, message: 'Missing 1× Sunken Angkor Relic (Sunken Ruins).' };
  }
  if (!check.hasCoins) {
    return {
      state,
      ok: false,
      message: `Need ${AWAKENING_COIN_COST.toLocaleString()} Coins to awaken an Ancient Weapon.`,
    };
  }
  if (!check.hasReforgeStones) {
    return {
      state,
      ok: false,
      message: `Need ${AWAKENING_REFORGE_STONE_COST}× Reforge Stones (have ${check.reforgeStonesCount}).`,
    };
  }

  let nextInv = consumeItem(state.inventory, 'mat_golden_laterite_core', 1);
  nextInv = consumeItem(nextInv, 'mat_spirit_bamboo_heart', 1);
  nextInv = consumeItem(nextInv, 'mat_sunken_angkor_relic', 1);
  nextInv = consumeItem(nextInv, 'mat_reforge_stone', AWAKENING_REFORGE_STONE_COST);
  nextInv.push({ itemId: def.id, quantity: 1, itemLevel: 10, quality: 'normal' });

  const nextCoins = state.currencies.coins - AWAKENING_COIN_COST;
  const nextAwakened = Array.from(new Set([...(state.awakenedWeapons ?? []), def.id]));

  const nextState: PlayerState = {
    ...state,
    coins: nextCoins,
    currencies: { ...state.currencies, coins: nextCoins },
    activeClass: def.classId,
    weapon: {
      id: def.id,
      name: def.name,
      khmerName: def.khmerName,
      classId: def.classId,
      baseDamage: def.attack,
      upgradeLevel: 10,
      armorPen: def.armorPen,
      critChance: def.critChance,
      attackCooldownMs: def.attackCooldownMs,
      knockbackForce: def.knockbackForce,
    },
    loadout: {
      ...state.loadout,
      weapon: def.id,
    },
    inventory: nextInv,
    awakenedWeapons: nextAwakened,
  };

  return {
    state: nextState,
    ok: true,
    awakenedWeapon: def,
    message: `🌌✨ ANCIENT AWAKENING COMPLETE! Forged & Equipped ${def.name} (${def.khmerName})!`,
  };
}
