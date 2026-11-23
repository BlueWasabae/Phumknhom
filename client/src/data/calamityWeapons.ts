import type { KhmerClassId, PlayerState } from '@shared/types';
import { WORLD_BIOMES, type BiomeId } from '@shared/worldMapData';

export type CalamitySpecialKind =
  | 'biome_preah_khan'
  | 'golden_riel_coin_shot'
  | 'parry_reality_rip'
  | 'offscreen_yant_beams'
  | 'evolving_angkor_relic';

export interface CalamityWeaponMeta {
  itemId: string;
  name: string;
  khmerName: string;
  classId: KhmerClassId;
  specialKind: CalamitySpecialKind;
  craftCoins: number;
  requiredMaterialId?: string;
  requiredMaterialQty?: number;
  requiredMaterialLabel?: string;
  tagline: string;
  mechanicSummary: string;
}

export const CALAMITY_WEAPONS: Record<string, CalamityWeaponMeta> = {
  weapon_preah_khan: {
    itemId: 'weapon_preah_khan',
    name: 'Preah Khan (8-Biome Blade)',
    khmerName: 'ព្រះខ័នរាជ ៨ តំបន់',
    classId: 'lbokator',
    specialKind: 'biome_preah_khan',
    craftCoins: 1400,
    requiredMaterialId: 'drop_slime_core',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Slime Core',
    tagline: 'Sacred Angkor sword that shifts element across all 8 Biomes.',
    mechanicSummary: 'Attunes slash VFX & grants +8% to +20% elemental bonus damage based on active World Map Biome.',
  },
  weapon_golden_riel_shot: {
    itemId: 'weapon_golden_riel_shot',
    name: 'Golden Riel Coin-Shot',
    khmerName: 'កាំភ្លើងបាញ់កាក់រៀលមាស',
    classId: 'archer',
    specialKind: 'golden_riel_coin_shot',
    craftCoins: 1600,
    requiredMaterialId: 'drop_spirit_orb',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Spirit Ember Orb',
    tagline: 'Fires spinning Khmer Riel coins that ricochet into bosses!',
    mechanicSummary: 'Each coin ricochets up to 2 times for escalating +30% crit damage per bounce.',
  },
  weapon_reality_rip_blade: {
    itemId: 'weapon_reality_rip_blade',
    name: 'Sovann Reality-Rip Blade',
    khmerName: 'ដាវហែកលំហសុវណ្ណ',
    classId: 'shadow',
    specialKind: 'parry_reality_rip',
    craftCoins: 2400,
    requiredMaterialId: 'drop_stone_core',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Stone Core',
    tagline: 'Calamity stealth blade that tears open dimensional rifts.',
    mechanicSummary: 'Full Stealth Strike unleashes a screen-wide Parry Reality-Rip slash with guaranteed critical hit.',
  },
  weapon_celestial_yant_tome: {
    itemId: 'weapon_celestial_yant_tome',
    name: 'Celestial Yant Grimoire',
    khmerName: 'គម្ពីរយ័ន្តទេពអាកាស',
    classId: 'mystic',
    specialKind: 'offscreen_yant_beams',
    craftCoins: 2600,
    requiredMaterialId: 'drop_naga_scale',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Shadow Naga Scale',
    tagline: 'Summons 3 converging off-screen sacred Khmer Yant sky beams.',
    mechanicSummary: 'Every 3rd cast triggers 3 converging off-screen Yant laser pillars raining down on the boss.',
  },
  weapon_evolving_angkor_relic: {
    itemId: 'weapon_evolving_angkor_relic',
    name: 'Evolving Relic of Angkor',
    khmerName: 'វត្ថុស័ក្តិសិទ្ធិវិវត្តន៍អង្គរ',
    classId: 'tamer',
    specialKind: 'evolving_angkor_relic',
    craftCoins: 1800,
    tagline: 'Ancient relic whip that permanently grows stronger with every Boss defeated!',
    mechanicSummary: '+8% Base Damage per unique Boss cleared in your Bestiary (up to +40%!).',
  },
};

export const CALAMITY_WEAPON_LIST = Object.values(CALAMITY_WEAPONS);

export interface ShimmerTransmuteRecipe {
  id: string;
  name: string;
  khmerName: string;
  inputItemId: string;
  inputLabel: string;
  inputQty: number;
  rewardKind: 'blessing' | 'weapon' | 'gold';
  blessingId?: string;
  weaponItemId?: string;
  goldGain?: number;
  description: string;
}

export const SHIMMER_RECIPES: ShimmerTransmuteRecipe[] = [
  {
    id: 'shimmer_vital_crystal',
    name: 'Apsara Vital Crystal',
    khmerName: 'គ្រីស្តាល់ជីវិតអប្សរា',
    inputItemId: 'drop_slime_core',
    inputLabel: '2× Slime Core',
    inputQty: 2,
    rewardKind: 'blessing',
    blessingId: 'blessing_vital_crystal',
    description: 'Permanent Account Blessing: +25 Max HP in all Dungeons!',
  },
  {
    id: 'shimmer_lotus_dew',
    name: 'Lotus Luck Dew',
    khmerName: 'ទឹកសន្សើមឈូកសំណាង',
    inputItemId: 'crop_phka_rumduol',
    inputLabel: '3× Phka Rumduol Rice',
    inputQty: 3,
    rewardKind: 'blessing',
    blessingId: 'blessing_lotus_luck',
    description: 'Permanent Account Blessing: +5% Critical Hit Chance!',
  },
  {
    id: 'shimmer_sandstone_ward',
    name: 'Angkor Sandstone Ward',
    khmerName: 'បារមីថ្មអង្គរ',
    inputItemId: 'drop_stone_core',
    inputLabel: '2× Stone Core',
    inputQty: 2,
    rewardKind: 'blessing',
    blessingId: 'blessing_sandstone_ward',
    description: 'Permanent Account Blessing: +5 Defense permanently!',
  },
  {
    id: 'shimmer_preah_khan',
    name: 'Transmute → Preah Khan (8-Biome Blade)',
    khmerName: 'ប្រែក្លាយជាព្រះខ័ន ៨ តំបន់',
    inputItemId: 'crop_trakuon',
    inputLabel: '2× Trakuon (Shimmer Miracle)',
    inputQty: 2,
    rewardKind: 'weapon',
    weaponItemId: 'weapon_preah_khan',
    description: 'Dip village produce into the Apsara Shimmer to awaken the 8-Biome Preah Khan!',
  },
  {
    id: 'shimmer_golden_riel',
    name: 'Transmute → Golden Riel Coin-Shot',
    khmerName: 'ប្រែក្លាយជាកាំភ្លើងកាក់រៀលមាស',
    inputItemId: 'crop_slek_krey',
    inputLabel: '2× Slek Krey (Shimmer Miracle)',
    inputQty: 2,
    rewardKind: 'weapon',
    weaponItemId: 'weapon_golden_riel_shot',
    description: 'Awaken the ricocheting Golden Riel Coin-Shot Marksman weapon!',
  },
];

export function getPreahKhanBiomeBonus(activeBiome?: string): {
  elementName: string;
  bonusDmgPct: number;
  colorHex: number;
} {
  const b = WORLD_BIOMES[(activeBiome as BiomeId) || 'phum_plaza'] ?? WORLD_BIOMES.phum_plaza;
  return {
    elementName: b.preahKhanElement,
    bonusDmgPct: b.preahKhanBonusDmgPct,
    colorHex: b.preahKhanColorHex,
  };
}

export function getEvolvingRelicMultiplier(player: PlayerState): number {
  const uniqueClears = Math.max(
    player.clearedBosses?.length ?? 0,
    Object.values(player.bossDefeats ?? {}).filter((c) => c > 0).length
  );
  return 1 + Math.min(0.4, uniqueClears * 0.08);
}

export function applyShimmerTransmute(
  state: PlayerState,
  recipeId: string
): { state: PlayerState; ok: boolean; message: string } {
  const rec = SHIMMER_RECIPES.find((r) => r.id === recipeId);
  if (!rec) return { state, ok: false, message: 'Unknown Apsara Shimmer recipe.' };

  if (rec.rewardKind === 'blessing' && rec.blessingId && (state.shimmerBlessings ?? []).includes(rec.blessingId)) {
    return { state, ok: false, message: `${rec.name} blessing is already active permanently!` };
  }
  if (rec.rewardKind === 'weapon' && rec.weaponItemId && state.inventory.some((i) => i.itemId === rec.weaponItemId)) {
    return { state, ok: false, message: `You already own ${rec.name}! Equip it in Inventory.` };
  }

  const totalOwned = state.inventory
    .filter((i) => i.itemId === rec.inputItemId)
    .reduce((sum, i) => sum + i.quantity, 0);
  if (totalOwned < rec.inputQty) {
    return { state, ok: false, message: `Need ${rec.inputLabel} in your Container to transmute.` };
  }

  let remaining = rec.inputQty;
  const nextInv = state.inventory
    .map((item) => {
      if (item.itemId !== rec.inputItemId || remaining <= 0) return { ...item };
      const take = Math.min(item.quantity, remaining);
      remaining -= take;
      return { ...item, quantity: item.quantity - take };
    })
    .filter((i) => i.quantity > 0);

  const nextBlessings = [...(state.shimmerBlessings ?? [])];
  if (rec.rewardKind === 'blessing' && rec.blessingId) {
    nextBlessings.push(rec.blessingId);
  }
  if (rec.rewardKind === 'weapon' && rec.weaponItemId) {
    nextInv.push({ itemId: rec.weaponItemId, quantity: 1, itemLevel: 5 });
  }

  return {
    state: {
      ...state,
      inventory: nextInv,
      shimmerBlessings: nextBlessings,
    },
    ok: true,
    message: `✨ Apsara Shimmer Transmuted: ${rec.name}!`,
  };
}
