import type { ItemRarity, PlayerState } from './types';

export const ACCESSORY_SLOT_COUNT = 5;

export interface AccessoryEffectStats {
  moveSpeedPct?: number;
  doubleJump?: boolean;
  dashCooldownReductionPct?: number;
  poisonImmune?: boolean;
  defenseFlat?: number;
  maxHpFlat?: number;
  critChanceBonus?: number;
  miningSpeedPct?: number;
}

export interface AccessoryDefinition {
  id: string;
  name: string;
  khmerName: string;
  rarity: ItemRarity;
  tier: 'base' | 'fused_t1' | 'fused_t2';
  icon: string;
  primaryColor: string;
  accentColor: string;
  stylishScore: number;
  summary: string;
  description: string;
  buyCoins?: number;
  effects: AccessoryEffectStats;
}

export interface AccessoryFusionRecipe {
  id: string;
  resultId: string;
  name: string;
  khmerName: string;
  inputAccessoryIds: [string, string];
  oreItemId: string;
  oreLabel: string;
  oreQty: number;
  coinCost: number;
  summary: string;
}

export interface CombatArmorSetBonusDef {
  armorId: string;
  setName: string;
  khmerName: string;
  bonusDefenseFlat: number;
  bonusMaxHpFlat: number;
  bonusAllDamagePct: number;
  miningSpeedPct: number;
  groundSlamShockwave: boolean;
  waterShieldEvery20s: boolean;
  setBonusSummary: string;
}

export const ACCESSORY_DEFS: Record<string, AccessoryDefinition> = {
  // ==================== 5 BASE UTILITY ACCESSORIES ====================
  acc_swift_sandals: {
    id: 'acc_swift_sandals',
    name: 'Swift Sandals',
    khmerName: 'ស្បែកជើងខ្យល់បក់',
    rarity: 'uncommon',
    tier: 'base',
    icon: '👟',
    primaryColor: '#38bdf8',
    accentColor: '#e0f2fe',
    stylishScore: 16,
    summary: '+15% Move Speed',
    description: 'Light woven palm-fiber runner sandals blessed by Mekong river breezes (+15% Move Speed).',
    buyCoins: 300,
    effects: { moveSpeedPct: 0.15 },
  },
  acc_lotus_jump_charm: {
    id: 'acc_lotus_jump_charm',
    name: 'Lotus Jump Charm',
    khmerName: 'បន្តោងផ្កាឈូកលោត',
    rarity: 'rare',
    tier: 'base',
    icon: '🌸',
    primaryColor: '#f472b6',
    accentColor: '#fce7f3',
    stylishScore: 22,
    summary: 'Lotus Double-Jump',
    description: 'Sacred pink lotus amulet granting a crisp mid-air 2nd jump with a blooming petal burst.',
    buyCoins: 350,
    effects: { doubleJump: true },
  },
  acc_naga_dash_ring: {
    id: 'acc_naga_dash_ring',
    name: 'Naga Dash Ring',
    khmerName: 'ចិញ្ចៀននាគលោតផ្លោះ',
    rarity: 'rare',
    tier: 'base',
    icon: '💍',
    primaryColor: '#10b981',
    accentColor: '#a7f3d0',
    stylishScore: 24,
    summary: '-25% Dash Cooldown',
    description: 'Coiled emerald serpent ring that cuts class dash cooldown by 25% in caverns and boss fights.',
    buyCoins: 350,
    effects: { dashCooldownReductionPct: 0.25 },
  },
  acc_jade_poison_ward: {
    id: 'acc_jade_poison_ward',
    name: 'Jade Poison Ward',
    khmerName: 'បន្តោងថ្មមរកតការពារពិស',
    rarity: 'rare',
    tier: 'base',
    icon: '🟢',
    primaryColor: '#22c55e',
    accentColor: '#dcfce7',
    stylishScore: 22,
    summary: 'Poison Immunity',
    description: 'Carved Kampot jade talisman that grants permanent immunity against Naga venom and poison pools.',
    buyCoins: 400,
    effects: { poisonImmune: true },
  },
  acc_yaksha_iron_band: {
    id: 'acc_yaksha_iron_band',
    name: 'Yaksha Iron Band',
    khmerName: 'កងដៃដែកយក្ស',
    rarity: 'uncommon',
    tier: 'base',
    icon: '🛡️',
    primaryColor: '#78716c',
    accentColor: '#fbbf24',
    stylishScore: 20,
    summary: '+4 Defense',
    description: 'Heavy temple guardian iron bracer forged from laterite ore (+4 Defense).',
    buyCoins: 400,
    effects: { defenseFlat: 4 },
  },

  // ==================== 3 FUSED BLACKSMITH RELICS ====================
  acc_wind_walker_boots: {
    id: 'acc_wind_walker_boots',
    name: 'Wind-Walker Boots',
    khmerName: 'ស្បែកជើងដើរលើខ្យល់',
    rarity: 'epic',
    tier: 'fused_t1',
    icon: '🪽',
    primaryColor: '#ec4899',
    accentColor: '#38bdf8',
    stylishScore: 46,
    summary: '+18% Move Speed & Lotus Double-Jump',
    description: 'Fused from Swift Sandals + Lotus Jump Charm. Combines high run speed and Lotus Double-Jump in 1 slot!',
    effects: {
      moveSpeedPct: 0.18,
      doubleJump: true,
    },
  },
  acc_sovereign_aegis_charm: {
    id: 'acc_sovereign_aegis_charm',
    name: 'Sovereign Aegis Charm',
    khmerName: 'គ្រឿងការពាររាជបល្ល័ង្ក',
    rarity: 'epic',
    tier: 'fused_t1',
    icon: '⚜️',
    primaryColor: '#16a34a',
    accentColor: '#facc15',
    stylishScore: 50,
    summary: '+6 Defense & Poison Immunity',
    description: 'Fused from Jade Poison Ward + Yaksha Iron Band. Grants +6 Defense and full Poison Immunity in 1 slot!',
    effects: {
      defenseFlat: 6,
      poisonImmune: true,
    },
  },
  acc_angkor_phantom_stride: {
    id: 'acc_angkor_phantom_stride',
    name: 'Angkor Phantom Stride',
    khmerName: 'ជំហានអាថ៌កំបាំងអង្គរ',
    rarity: 'legendary',
    tier: 'fused_t2',
    icon: '⚡',
    primaryColor: '#a855f7',
    accentColor: '#fde047',
    stylishScore: 88,
    summary: '+22% Speed, Lotus Double-Jump & -30% Dash CD',
    description: 'Apex Blacksmith Fusion combining Wind-Walker Boots + Naga Dash Ring. All 3 mobility relics unified in 1 slot!',
    effects: {
      moveSpeedPct: 0.22,
      doubleJump: true,
      dashCooldownReductionPct: 0.3,
    },
  },
  // ==================== UPDATE 1.6 TREASURE HUNTER ACCESSORY ====================
  acc_angkor_explorer_compass: {
    id: 'acc_angkor_explorer_compass',
    name: 'Angkor Explorer Compass',
    khmerName: 'ត្រីវិស័យអ្នករុករកអង្គរ',
    rarity: 'legendary',
    tier: 'base',
    icon: '🧭',
    primaryColor: '#f59e0b',
    accentColor: '#fef08a',
    stylishScore: 76,
    summary: '+12% Move Speed, +18% Mining Speed & +6% Crit',
    description: 'Gilded brass Angkorian astrolabe unearthed from buried Torn Treasure Map Relic Chests. Boosts speed, mining, and treasure luck!',
    effects: {
      moveSpeedPct: 0.12,
      miningSpeedPct: 0.18,
      critChanceBonus: 0.06,
    },
  },
  // ==================== UPDATE 1.7 BEST-FRIEND / COUPLE BOND RING ====================
  acc_lotus_bond_ring: {
    id: 'acc_lotus_bond_ring',
    name: 'Lotus Bond Ring',
    khmerName: 'ចិញ្ចៀនផ្កាឈូកចំណងមិត្តភាព',
    rarity: 'legendary',
    tier: 'base',
    icon: '💍',
    primaryColor: '#ec4899',
    accentColor: '#fbcfe8',
    stylishScore: 68,
    summary: 'Pink Lotus Aura, Warp to Partner & Shared Co-op Farm',
    description: 'Sacred rose-gold lotus ring sold at the Fashion Boutique (1,000 Coins or 10 Gold). Offer to your best friend or partner to unlock the Pink Lotus Heart Aura & Shared Co-op Farm!',
    buyCoins: 1000,
    effects: {
      maxHpFlat: 15,
      critChanceBonus: 0.03,
    },
  },
  // ==================== UPDATE 2.2 ULTRA-RARE CHASE ACCESSORIES ====================
  acc_mythic_mekong_pearl: {
    id: 'acc_mythic_mekong_pearl',
    name: 'Mythic Mekong Pearl',
    khmerName: 'គុជមេគង្គមហាអស្ចារ្យ',
    rarity: 'mythic',
    tier: 'base',
    icon: '🫧',
    primaryColor: '#ef4444',
    accentColor: '#fde047',
    stylishScore: 165,
    summary: '+18% Crit Chance & +35 Max HP (0.5% Fishing Drop)',
    description:
      'Ultra-rare crimson-luminous river pearl (0.5% drop from Riverside Pier & Sunken Ruins Fishing).',
    effects: {
      maxHpFlat: 35,
      critChanceBonus: 0.18,
    },
  },
  acc_mythic_kampot_ember_ring: {
    id: 'acc_mythic_kampot_ember_ring',
    name: 'Mythic Kampot Ember Ring',
    khmerName: 'ចិញ្ចៀនភ្លើងម្រេចកំពត',
    rarity: 'mythic',
    tier: 'base',
    icon: '💍',
    primaryColor: '#dc2626',
    accentColor: '#fb923c',
    stylishScore: 160,
    summary: '+12% Move Speed, +8% Crit & +6 Defense (0.55% Boss/Forage Drop)',
    description:
      'Ultra-rare ember ring infused with volcanic Kampot fire (0.55% drop from Mythic Bosses & Wild Frontier).',
    effects: {
      moveSpeedPct: 0.12,
      defenseFlat: 6,
      critChanceBonus: 0.08,
    },
  },
  acc_legendary_laterite_core: {
    id: 'acc_legendary_laterite_core',
    name: 'Legendary Golden Laterite Core',
    khmerName: 'ស្នូលថ្មបាយក្រៀមមាស',
    rarity: 'legendary',
    tier: 'base',
    icon: '🪨',
    primaryColor: '#f59e0b',
    accentColor: '#fef08a',
    stylishScore: 120,
    summary: '+10 Defense, +45 Max HP & +20% Mining Speed (1.5% Mining Drop)',
    description:
      'Ultra-rare condensed golden laterite heart (1.5% drop from Laterite Quarry & Deep Caverns).',
    effects: {
      defenseFlat: 10,
      maxHpFlat: 45,
      miningSpeedPct: 0.2,
    },
  },
};

export const ACCESSORY_LIST: AccessoryDefinition[] = Object.values(ACCESSORY_DEFS);

export const ACCESSORY_FUSION_RECIPES: AccessoryFusionRecipe[] = [
  {
    id: 'fuse_wind_walker_boots',
    resultId: 'acc_wind_walker_boots',
    name: 'Wind-Walker Boots',
    khmerName: 'ស្បែកជើងដើរលើខ្យល់',
    inputAccessoryIds: ['acc_swift_sandals', 'acc_lotus_jump_charm'],
    oreItemId: 'ore_laterite',
    oreLabel: 'Laterite Ore',
    oreQty: 4,
    coinCost: 700,
    summary: '+18% Move Speed + Lotus Double-Jump in 1 slot!',
  },
  {
    id: 'fuse_sovereign_aegis_charm',
    resultId: 'acc_sovereign_aegis_charm',
    name: 'Sovereign Aegis Charm',
    khmerName: 'គ្រឿងការពាររាជបល្ល័ង្ក',
    inputAccessoryIds: ['acc_jade_poison_ward', 'acc_yaksha_iron_band'],
    oreItemId: 'ore_jade_crystal',
    oreLabel: 'Jade Crystal',
    oreQty: 4,
    coinCost: 910,
    summary: '+6 Defense + Poison Immunity in 1 slot!',
  },
  {
    id: 'fuse_angkor_phantom_stride',
    resultId: 'acc_angkor_phantom_stride',
    name: 'Angkor Phantom Stride',
    khmerName: 'ជំហានអាថ៌កំបាំងអង្គរ',
    inputAccessoryIds: ['acc_wind_walker_boots', 'acc_naga_dash_ring'],
    oreItemId: 'ore_angkor_gold',
    oreLabel: 'Angkor Gold',
    oreQty: 5,
    coinCost: 1680,
    summary: '+22% Speed + Lotus Double-Jump + -30% Dash CD in 1 slot!',
  },
];

export const COMBAT_ARMOR_SET_BONUSES: Record<string, CombatArmorSetBonusDef> = {
  armor_laterite_miner: {
    armorId: 'armor_laterite_miner',
    setName: 'Laterite Miner Set',
    khmerName: 'ឈុតអណ្តូងរ៉ែថ្មបាយក្រៀម',
    bonusDefenseFlat: 0,
    bonusMaxHpFlat: 15,
    bonusAllDamagePct: 0,
    miningSpeedPct: 0.25,
    groundSlamShockwave: false,
    waterShieldEvery20s: false,
    setBonusSummary: '+25% Mining Speed & +15 Max HP',
  },
  armor_yeak_thmor_stone: {
    armorId: 'armor_yeak_thmor_stone',
    setName: 'Yeak Thmor Stone Set',
    khmerName: 'ឈុតថ្មយក្ស',
    bonusDefenseFlat: 12,
    bonusMaxHpFlat: 0,
    bonusAllDamagePct: 0,
    miningSpeedPct: 0,
    groundSlamShockwave: true,
    waterShieldEvery20s: false,
    setBonusSummary: '+12 Defense & Ground-Slam Shockwave on hard landings',
  },
  armor_naga_scale: {
    armorId: 'armor_naga_scale',
    setName: 'Naga Scale Set',
    khmerName: 'ឈុតស្រកានាគរាជ',
    bonusDefenseFlat: 0,
    bonusMaxHpFlat: 0,
    bonusAllDamagePct: 0.15,
    miningSpeedPct: 0,
    groundSlamShockwave: false,
    waterShieldEvery20s: true,
    setBonusSummary: '+15% All Damage & Orbiting Water Shield (blocks 1 hit / 20s)',
  },
};

export function normalizeAccessorySlots(raw?: (string | null)[] | null): (string | null)[] {
  const out: (string | null)[] = Array(ACCESSORY_SLOT_COUNT).fill(null);
  if (!Array.isArray(raw)) return out;
  const seen = new Set<string>();
  for (let i = 0; i < ACCESSORY_SLOT_COUNT; i++) {
    const id = raw[i];
    if (typeof id === 'string' && ACCESSORY_DEFS[id] && !seen.has(id)) {
      out[i] = id;
      seen.add(id);
    }
  }
  return out;
}

export interface AggregatedAccessoryBonuses {
  moveSpeedPct: number;
  hasDoubleJump: boolean;
  dashCooldownReductionPct: number;
  poisonImmune: boolean;
  defenseFlat: number;
  maxHpFlat: number;
  critChanceBonus: number;
  miningSpeedPct: number;
  equippedIds: string[];
}

export function aggregateAccessoryBonuses(rawSlots?: (string | null)[] | null): AggregatedAccessoryBonuses {
  const slots = normalizeAccessorySlots(rawSlots);
  let moveSpeedPct = 0;
  let hasDoubleJump = false;
  let dashCooldownReductionPct = 0;
  let poisonImmune = false;
  let defenseFlat = 0;
  let maxHpFlat = 0;
  let critChanceBonus = 0;
  let miningSpeedPct = 0;
  const equippedIds: string[] = [];

  for (const id of slots) {
    if (!id) continue;
    const def = ACCESSORY_DEFS[id];
    if (!def) continue;
    equippedIds.push(id);
    moveSpeedPct += def.effects.moveSpeedPct ?? 0;
    if (def.effects.doubleJump) hasDoubleJump = true;
    dashCooldownReductionPct += def.effects.dashCooldownReductionPct ?? 0;
    if (def.effects.poisonImmune) poisonImmune = true;
    defenseFlat += def.effects.defenseFlat ?? 0;
    maxHpFlat += def.effects.maxHpFlat ?? 0;
    critChanceBonus += def.effects.critChanceBonus ?? 0;
    miningSpeedPct += def.effects.miningSpeedPct ?? 0;
  }

  return {
    moveSpeedPct: Math.min(0.65, moveSpeedPct),
    hasDoubleJump,
    dashCooldownReductionPct: Math.min(0.6, dashCooldownReductionPct),
    poisonImmune,
    defenseFlat,
    maxHpFlat,
    critChanceBonus,
    miningSpeedPct,
    equippedIds,
  };
}

export function getCombatArmorSetBonus(armorId: string | null | undefined): CombatArmorSetBonusDef | null {
  if (!armorId) return null;
  return COMBAT_ARMOR_SET_BONUSES[armorId] ?? null;
}

export function countItemInInventory(state: PlayerState, itemId: string): number {
  return state.inventory
    .filter((i) => i.itemId === itemId)
    .reduce((sum, i) => sum + i.quantity, 0);
}

export function hasAccessoryAvailable(state: PlayerState, accId: string): boolean {
  if (countItemInInventory(state, accId) > 0) return true;
  const slots = normalizeAccessorySlots(state.loadout.accessories);
  return slots.includes(accId);
}

function consumeInventoryQty(
  inventory: PlayerState['inventory'],
  itemId: string,
  qty: number
): PlayerState['inventory'] {
  let remaining = qty;
  const next: PlayerState['inventory'] = [];
  for (const entry of inventory) {
    if (entry.itemId === itemId && remaining > 0) {
      const take = Math.min(entry.quantity, remaining);
      remaining -= take;
      const left = entry.quantity - take;
      if (left > 0) {
        next.push({ ...entry, quantity: left });
      }
    } else {
      next.push(entry);
    }
  }
  return next;
}

export function fuseAccessoryRecipe(
  state: PlayerState,
  recipeId: string
): { state: PlayerState; ok: boolean; message: string } {
  const recipe = ACCESSORY_FUSION_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) {
    return { state, ok: false, message: 'Unknown Blacksmith fusion recipe.' };
  }
  const resultDef = ACCESSORY_DEFS[recipe.resultId];
  if (!resultDef) {
    return { state, ok: false, message: 'Result accessory not found.' };
  }

  const [inA, inB] = recipe.inputAccessoryIds;
  if (!hasAccessoryAvailable(state, inA)) {
    return { state, ok: false, message: `Need ${ACCESSORY_DEFS[inA]?.name ?? inA} to fuse ${resultDef.name}.` };
  }
  if (!hasAccessoryAvailable(state, inB)) {
    return { state, ok: false, message: `Need ${ACCESSORY_DEFS[inB]?.name ?? inB} to fuse ${resultDef.name}.` };
  }
  const oreHave = countItemInInventory(state, recipe.oreItemId);
  if (oreHave < recipe.oreQty) {
    return {
      state,
      ok: false,
      message: `Need ${recipe.oreQty}× ${recipe.oreLabel} (Have ${oreHave}). Mine ores in the Underground Cavern!`,
    };
  }
  if (state.currencies.coins < recipe.coinCost) {
    return {
      state,
      ok: false,
      message: `Need ${recipe.coinCost.toLocaleString()} Coins to fuse ${resultDef.name}.`,
    };
  }

  // Consume ingredients (from inventory and unequip if worn)
  let nextInv = [...state.inventory];
  const nextSlots = normalizeAccessorySlots(state.loadout.accessories);
  let replacedSlotIdx = -1;

  for (const ingId of [inA, inB]) {
    const eqIdx = nextSlots.indexOf(ingId);
    if (eqIdx >= 0) {
      nextSlots[eqIdx] = null;
      if (replacedSlotIdx < 0) replacedSlotIdx = eqIdx;
    }
    if (countItemInInventory({ ...state, inventory: nextInv }, ingId) > 0) {
      nextInv = consumeInventoryQty(nextInv, ingId, 1);
    }
  }

  // Consume required ores
  nextInv = consumeInventoryQty(nextInv, recipe.oreItemId, recipe.oreQty);

  // Grant fused relic into inventory
  const existingIdx = nextInv.findIndex((i) => i.itemId === resultDef.id);
  if (existingIdx >= 0) {
    nextInv[existingIdx] = {
      ...nextInv[existingIdx],
      quantity: nextInv[existingIdx].quantity + 1,
    };
  } else {
    nextInv.push({ itemId: resultDef.id, quantity: 1, itemLevel: 5 });
  }

  // If either ingredient was equipped, auto-slot the new fused relic into the freed slot!
  if (replacedSlotIdx >= 0 && !nextSlots.includes(resultDef.id)) {
    nextSlots[replacedSlotIdx] = resultDef.id;
  }

  const nextCoins = state.currencies.coins - recipe.coinCost;
  const nextState: PlayerState = {
    ...state,
    coins: nextCoins,
    currencies: {
      ...state.currencies,
      coins: nextCoins,
    },
    inventory: nextInv,
    loadout: {
      ...state.loadout,
      accessories: nextSlots,
    },
  };

  return {
    state: nextState,
    ok: true,
    message: `⚒️ Fused ${resultDef.icon} ${resultDef.name} (${resultDef.summary})!`,
  };
}
