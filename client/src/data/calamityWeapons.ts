import type { KhmerClassId, PlayerState } from '@shared/types';
import { getEvolvingBladeMultiplier } from '@shared/balanceFormulas';
import { getBiomeOrFallback } from '@shared/worldMapData';

export type CalamitySpecialKind =
  | 'biome_preah_khan'
  | 'golden_riel_coin_shot'
  | 'evolving_angkor_blade'
  | 'fractured_yant_tome'
  | 'frost_fang_singha'
  | 'hanuman_spirit_banner';

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
  secondaryActionLabel?: string;
}

export const CALAMITY_WEAPONS: Record<string, CalamityWeaponMeta> = {
  weapon_preah_khan: {
    itemId: 'weapon_preah_khan',
    name: 'Preah Khan of the 8 Biomes',
    khmerName: 'ព្រះខ័នប្រាំបីទិស',
    classId: 'lbokator',
    specialKind: 'biome_preah_khan',
    craftCoins: 1400,
    requiredMaterialId: 'drop_slime_core',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Slime Core',
    tagline: 'Biome-attuned sacred Angkor blade with a Parry → Reality Rip counter!',
    mechanicSummary:
      'Attunes element & passive to your active Biome (Rice = Healing Wind, Mines/Ruins = Explosive Fire, Marsh = Armor Shred). Right-Click / [R] raises a 0.35s golden Parry guard to charge a screen-tearing Reality Rip!',
    secondaryActionLabel: '🛡️ PARRY',
  },
  weapon_golden_riel_shot: {
    itemId: 'weapon_golden_riel_shot',
    name: 'Crossbow of the Golden Riel',
    khmerName: 'ស្នារៀលមាស',
    classId: 'archer',
    specialKind: 'golden_riel_coin_shot',
    craftCoins: 1600,
    requiredMaterialId: 'drop_spirit_orb',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Spirit Ember Orb',
    tagline: 'Ultrakill-inspired Khmer coin trick-shot crossbow!',
    mechanicSummary:
      'Right-Click / [R] flicks a spinning Gold Coin into the air (chain up to 3!). Shoot any airborne coin to ricochet a blinding golden lightning beam into the boss for a guaranteed 100% Super-Crit!',
    secondaryActionLabel: '🪙 TOSS COIN',
  },
  weapon_evolving_angkor_blade: {
    itemId: 'weapon_evolving_angkor_blade',
    name: 'Evolving Blade of Angkor',
    khmerName: 'ដាវជ័យវរ្ម័ន',
    classId: 'lbokator',
    specialKind: 'evolving_angkor_blade',
    craftCoins: 1800,
    tagline: 'Scaling Legendary sword that evolves with every Bestiary Boss defeated!',
    mechanicSummary:
      'Automatically scales +15% Base Damage, +10% slash size, and launches a golden Yant projectile wave per unique boss defeated in your Bestiary.',
  },
  weapon_fractured_yant_tome: {
    itemId: 'weapon_fractured_yant_tome',
    name: 'Tome of Fractured Yant',
    khmerName: 'សាស្ត្រាពន្លឺយ័ន្ត',
    classId: 'mystic',
    specialKind: 'fractured_yant_tome',
    craftCoins: 2200,
    requiredMaterialId: 'drop_naga_scale',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Shadow Naga Scale',
    tagline: 'Sacred Khmer spellbook slicing enemies from beyond the screen.',
    mechanicSummary:
      'Every magic bolt that hits a boss triggers 3 extra golden light-blades slashing in from off-screen at crisscrossing angles!',
  },
  weapon_frost_fang_singha: {
    itemId: 'weapon_frost_fang_singha',
    name: 'Frost Fang of Singha',
    khmerName: 'ចង្កូមសិង្ហទឹកកក',
    classId: 'shadow',
    specialKind: 'frost_fang_singha',
    craftCoins: 2000,
    requiredMaterialId: 'drop_stone_core',
    requiredMaterialQty: 2,
    requiredMaterialLabel: '2× Stone Core',
    tagline: 'Glacial rogue dagger built for devastating armor-piercing Stealth Strikes.',
    mechanicSummary:
      'Full Stealth Strike slices a flat 3% of the boss’s remaining HP (capped at 450) completely ignoring enemy armor!',
  },
  weapon_hanuman_banner: {
    itemId: 'weapon_hanuman_banner',
    name: 'Hanuman Spirit Banner',
    khmerName: 'កងទ័ពហនុមាន',
    classId: 'tamer',
    specialKind: 'hanuman_spirit_banner',
    craftCoins: 1900,
    tagline: 'Royal war banner summoning golden monkey-warrior spirits!',
    mechanicSummary:
      'Every banner command summons 3 fast golden Hanuman spirits that dash-slash across the boss in synchronized V-formations!',
  },
};

export const CALAMITY_WEAPON_LIST = Object.values(CALAMITY_WEAPONS);

export interface PreahKhanBiomeProfile {
  elementName: string;
  passiveKind: 'healing_wind' | 'explosive_fire' | 'armor_shred' | 'celestial';
  passiveSummary: string;
  bonusDmgPct: number;
  colorHex: number;
}

export function getPreahKhanBiomeBonus(activeBiome?: string): PreahKhanBiomeProfile {
  const b = getBiomeOrFallback(activeBiome);
  if (b.id === 'laterite_mines' || b.id === 'angkor_ruins') {
    return {
      elementName: 'Explosive Fire',
      passiveKind: 'explosive_fire',
      passiveSummary: 'Blazing AoE detonation (+18% Fire burst)',
      bonusDmgPct: Math.max(0.18, b.preahKhanBonusDmgPct),
      colorHex: 0xf97316,
    };
  }
  if (b.id === 'blighted_marsh') {
    return {
      elementName: 'Armor Shred',
      passiveKind: 'armor_shred',
      passiveSummary: '+10 Armor Penetration & Defense Shred',
      bonusDmgPct: Math.max(0.14, b.preahKhanBonusDmgPct),
      colorHex: 0x84cc16,
    };
  }
  if (b.id === 'emerald_rice_valley') {
    return {
      elementName: 'Healing Wind',
      passiveKind: 'healing_wind',
      passiveSummary: 'Emerald wind heals +4 HP on hit',
      bonusDmgPct: Math.max(0.1, b.preahKhanBonusDmgPct),
      colorHex: 0x22c55e,
    };
  }
  return {
    elementName: b.preahKhanElement,
    passiveKind: 'celestial',
    passiveSummary: `+${Math.round(b.preahKhanBonusDmgPct * 100)}% ${b.preahKhanElement} surge`,
    bonusDmgPct: b.preahKhanBonusDmgPct,
    colorHex: b.preahKhanColorHex,
  };
}

export function getUniqueBossClearsCount(player: PlayerState): number {
  const unique = new Set<string>(player.clearedBosses ?? []);
  for (const [id, count] of Object.entries(player.bossDefeats ?? {})) {
    if (count > 0) unique.add(id);
  }
  return unique.size;
}

export function getEvolvingRelicMultiplier(player: PlayerState): number {
  return getEvolvingBladeMultiplier(getUniqueBossClearsCount(player));
}

export function craftCalamityWeapon(
  state: PlayerState,
  itemId: string
): { state: PlayerState; ok: boolean; message: string } {
  const meta = CALAMITY_WEAPONS[itemId];
  if (!meta) return { state, ok: false, message: 'Unknown Calamity weapon blueprint.' };
  if (state.inventory.some((i) => i.itemId === itemId)) {
    return { state, ok: false, message: `You already own ${meta.name}! Equip it in Inventory.` };
  }
  if (state.currencies.coins < meta.craftCoins) {
    return { state, ok: false, message: `Need ${meta.craftCoins.toLocaleString()} Coins to forge ${meta.name}.` };
  }
  if (meta.requiredMaterialId && meta.requiredMaterialQty) {
    const ownedMat = state.inventory
      .filter((i) => i.itemId === meta.requiredMaterialId)
      .reduce((s, i) => s + i.quantity, 0);
    if (ownedMat < meta.requiredMaterialQty) {
      return { state, ok: false, message: `Need ${meta.requiredMaterialLabel} to forge ${meta.name}.` };
    }
  }

  let rem = meta.requiredMaterialQty ?? 0;
  const nextInv = state.inventory
    .map((item) => {
      if (meta.requiredMaterialId && item.itemId === meta.requiredMaterialId && rem > 0) {
        const take = Math.min(item.quantity, rem);
        rem -= take;
        return { ...item, quantity: item.quantity - take };
      }
      return { ...item };
    })
    .filter((i) => i.quantity > 0);
  nextInv.push({ itemId: meta.itemId, quantity: 1, itemLevel: 5 });

  const nextCoins = state.currencies.coins - meta.craftCoins;
  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      inventory: nextInv,
    },
    ok: true,
    message: `⚒️ Forged ${meta.name} (${meta.khmerName})! Equip it in Container!`,
  };
}

/**
 * Starter Test Chest granting all 6 signature Calamity Khmer weapons so players can test every mechanic immediately!
 */
export function claimCalamityStarterChest(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string } {
  const nextInv = state.inventory.map((i) => ({ ...i }));
  let added = 0;
  for (const w of CALAMITY_WEAPON_LIST) {
    if (!nextInv.some((i) => i.itemId === w.itemId)) {
      nextInv.push({ itemId: w.itemId, quantity: 1, itemLevel: 5 });
      added++;
    }
  }
  if (added === 0) {
    return {
      state,
      ok: false,
      message: 'All 6 Calamity Khmer weapons are already in your Container!',
    };
  }
  return {
    state: { ...state, inventory: nextInv },
    ok: true,
    message: `🎁 Opened Calamity Arsenal Test Chest — added ${added} signature Khmer weapon(s) to Container!`,
  };
}

// ==================== SACRED APSARA SHIMMER SPRING ====================

export interface ShimmerTransmuteRecipe {
  id: string;
  name: string;
  khmerName: string;
  inputItemIds: string[]; // Any matching item satisfies the recipe (e.g. raw Durian OR Durian Feast)
  inputLabel: string;
  inputQty: number;
  rewardKind: 'blessing' | 'boss_swap' | 'weapon';
  blessingId?: string;
  outputItemId?: string;
  outputLabel?: string;
  description: string;
}

export const SHIMMER_RECIPES: ShimmerTransmuteRecipe[] = [
  // 1. Permanent Fruit Blessings (1× per character, persisted in cloud save!)
  {
    id: 'shimmer_golden_durian_hp',
    name: 'Golden Durian Vitality Blessing',
    khmerName: 'ពរជ័យធុរេនមាស (+២០ HP)',
    inputItemIds: ['fruit_durian', 'snack_durian_feast'],
    inputLabel: '1× Golden Durian (or Durian Feast)',
    inputQty: 1,
    rewardKind: 'blessing',
    blessingId: 'blessing_durian_hp',
    description: 'Permanent Fruit Blessing (1× per character): +20 Max HP forever across all Dungeons!',
  },
  {
    id: 'shimmer_pink_lotus_luck',
    name: 'Pink Lotus Fortune Blessing',
    khmerName: 'ពរជ័យផ្កាឈូកសំណាង (+៥% Luck)',
    inputItemIds: ['crop_lotus', 'snack_lotus_tea', 'crop_phka_rumduol'],
    inputLabel: '1× Pink Lotus (or Lotus Tea / Phka Rumduol)',
    inputQty: 1,
    rewardKind: 'blessing',
    blessingId: 'blessing_pink_lotus_luck',
    description: 'Permanent Fruit Blessing (1× per character): +5% Luck & Critical Chance forever!',
  },
  {
    id: 'shimmer_sandstone_ward',
    name: 'Angkor Sandstone Ward',
    khmerName: 'បារមីថ្មអង្គរ (+៥ DEF)',
    inputItemIds: ['drop_stone_core'],
    inputLabel: '2× Stone Core',
    inputQty: 2,
    rewardKind: 'blessing',
    blessingId: 'blessing_sandstone_ward',
    description: 'Permanent Blessing: +5 Defense permanently!',
  },
  // 2. Duplicate Boss Drop Cycling (Eliminate bad RNG!)
  {
    id: 'shimmer_swap_frog_to_boots',
    name: 'Cycle Boss Drop: Frog Crown → Dash Boots',
    khmerName: 'ប្តូរមកុដកង្កែប → ស្បែកជើងរហ័ស',
    inputItemIds: ['hat_frog_crown'],
    inputLabel: '1× Frog Prince Crown',
    inputQty: 1,
    rewardKind: 'boss_swap',
    outputItemId: 'armor_dash_boots',
    outputLabel: 'Starter Dash Boots',
    description: 'Transmute a duplicate Sdech Kongkaeb crown into Starter Dash Boots (same boss tier).',
  },
  {
    id: 'shimmer_swap_boots_to_frog',
    name: 'Cycle Boss Drop: Dash Boots → Frog Crown',
    khmerName: 'ប្តូរស្បែកជើងរហ័ស → មកុដកង្កែប',
    inputItemIds: ['armor_dash_boots'],
    inputLabel: '1× Starter Dash Boots',
    inputQty: 1,
    rewardKind: 'boss_swap',
    outputItemId: 'hat_frog_crown',
    outputLabel: 'Frog Prince Crown',
    description: 'Transmute duplicate Starter Dash Boots into the rare Frog Prince Crown!',
  },
  {
    id: 'shimmer_swap_veil_to_aura',
    name: 'Cycle Boss Drop: Spirit Veil → Lantern Halo',
    khmerName: 'ប្តូរស្បៃអាប → ពន្លឺចង្កៀងអាប',
    inputItemIds: ['hat_spirit_veil'],
    inputLabel: '1× Bamboo Spirit Veil',
    inputQty: 1,
    rewardKind: 'boss_swap',
    outputItemId: 'wings_arp_aura',
    outputLabel: 'Ghostly Lantern Halo',
    description: 'Cycle an Arp Prey Chrov duplicate drop into the Ghostly Lantern Halo wings!',
  },
  {
    id: 'shimmer_swap_yaksha_to_club',
    name: 'Cycle Boss Drop: Yaksha Mask → Stone Club',
    khmerName: 'ប្តូរមុខយក្ស → ដំបងថ្មប្រាសាទ',
    inputItemIds: ['hat_yaksha_mask'],
    inputLabel: '1× Yaksha Mask',
    inputQty: 1,
    rewardKind: 'boss_swap',
    outputItemId: 'weapon_stone_club',
    outputLabel: 'Stone Temple Club',
    description: 'Cycle a duplicate Yeak Thmor drop into the Heavy Stone Temple Club!',
  },
  {
    id: 'shimmer_swap_naga_fang_to_crest',
    name: 'Cycle Boss Drop: Naga Fang → Royal Naga Crest',
    khmerName: 'ប្តូរចង្កូមនាគ → មកុដនាគរាជ',
    inputItemIds: ['weapon_naga_fang'],
    inputLabel: '1× Naga Venom Fang',
    inputQty: 1,
    rewardKind: 'boss_swap',
    outputItemId: 'hat_naga_crest',
    outputLabel: 'Royal Naga Crest',
    description: 'Cycle a duplicate Neak Reach fang into the legendary Royal Naga Crest!',
  },
];

export function countShimmerInputs(state: PlayerState, rec: ShimmerTransmuteRecipe): number {
  return state.inventory
    .filter((i) => rec.inputItemIds.includes(i.itemId))
    .reduce((sum, i) => sum + i.quantity, 0);
}

export function applyShimmerTransmute(
  state: PlayerState,
  recipeId: string
): { state: PlayerState; ok: boolean; message: string } {
  const rec = SHIMMER_RECIPES.find((r) => r.id === recipeId);
  if (!rec) return { state, ok: false, message: 'Unknown Apsara Shimmer recipe.' };

  if (rec.rewardKind === 'blessing' && rec.blessingId && (state.shimmerBlessings ?? []).includes(rec.blessingId)) {
    return { state, ok: false, message: `${rec.name} is already active permanently on this character!` };
  }

  const totalOwned = countShimmerInputs(state, rec);
  if (totalOwned < rec.inputQty) {
    return { state, ok: false, message: `Need ${rec.inputLabel} in your Container to transmute.` };
  }

  let remaining = rec.inputQty;
  const nextInv = state.inventory
    .map((item) => {
      if (!rec.inputItemIds.includes(item.itemId) || remaining <= 0) return { ...item };
      const take = Math.min(item.quantity, remaining);
      remaining -= take;
      return { ...item, quantity: item.quantity - take };
    })
    .filter((i) => i.quantity > 0);

  const nextBlessings = [...(state.shimmerBlessings ?? [])];
  if (rec.rewardKind === 'blessing' && rec.blessingId) {
    nextBlessings.push(rec.blessingId);
  }
  if ((rec.rewardKind === 'boss_swap' || rec.rewardKind === 'weapon') && rec.outputItemId) {
    const existing = nextInv.find((i) => i.itemId === rec.outputItemId);
    if (existing) existing.quantity += 1;
    else nextInv.push({ itemId: rec.outputItemId, quantity: 1, itemLevel: 3 });
  }

  return {
    state: {
      ...state,
      inventory: nextInv,
      shimmerBlessings: nextBlessings,
    },
    ok: true,
    message:
      rec.rewardKind === 'boss_swap'
        ? `✨ Apsara Shimmer Cycled Boss Drop → ${rec.outputLabel}!`
        : `✨ Apsara Shimmer Granted: ${rec.name}!`,
  };
}
