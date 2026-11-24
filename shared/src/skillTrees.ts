import {
  createInitialSkillProfile,
  type KhmerClassId,
  type PlayerState,
  type SkillEntry,
  type SkillId,
  type SkillProfile,
} from './types';
import { computeReforgeDeltas } from './balanceFormulas';
import { aggregateAccessoryBonuses, getCombatArmorSetBonus } from './accessoryFusions';
import { getMuseumScholarPerks } from './museumCatalog';
import { computeKromBuffs } from './festivals';
export { createInitialSkillProfile };

export type SkillCategory = 'life' | 'combat';

export interface SkillTalentDef {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  synergyTag?: string;
}

export interface SkillDefinition {
  id: SkillId;
  category: SkillCategory;
  name: string;
  khmerName: string;
  icon: string;
  accentColor: string;
  howItLevels: string;
  perLevelSummary: string;
  talents: [SkillTalentDef, SkillTalentDef, SkillTalentDef];
}

export const RESPEC_COST_COINS = 500;
export const MAX_SKILL_LEVEL = 100;

export const CLASS_TO_COMBAT_SKILL: Record<KhmerClassId, SkillId> = {
  lbokator: 'melee',
  archer: 'ranged',
  mystic: 'magic',
  tamer: 'summoning',
  shadow: 'rogue',
};

/**
 * All 12 Independent Skills (Lv. 1–100) from docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §3
 */
export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  // ==================== LIFE-SIM & ECONOMY (6) ====================
  farming: {
    id: 'farming',
    category: 'life',
    name: 'Farming',
    khmerName: 'កសិកម្ម',
    icon: '🌾',
    accentColor: '#16a34a',
    howItLevels: 'Planting, watering & harvesting crops, trees & livestock',
    perLevelSummary: '+0.5% Crop Yield & +0.2% Poison Dmg / Lv',
    talents: [
      {
        id: 'farm_golden_thumb',
        name: 'Golden Thumb',
        description: '+15% extra Gold-Star crop harvest chance on all plots.',
        minLevel: 5,
        synergyTag: 'Farm Economy',
      },
      {
        id: 'farm_thorny_skin',
        name: 'Thorny Skin',
        description: 'Reflects thorny damage back to dungeon mobs on contact (+4% Raw DR).',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
      {
        id: 'farm_botanical_venom',
        name: 'Botanical Venom',
        description: '+15% chance on any hit to poison bosses for bonus botanical damage.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
    ],
  },
  mining: {
    id: 'mining',
    category: 'life',
    name: 'Mining',
    khmerName: 'ជីករ៉ែ',
    icon: '⛏️',
    accentColor: '#64748b',
    howItLevels: 'Breaking ore veins & cracked dungeon walls',
    perLevelSummary: '+1 Mining Power / Lv',
    talents: [
      {
        id: 'mine_meticulous',
        name: 'Meticulous Miner',
        description: '+20% bonus ore & stone cores from dungeon nodes.',
        minLevel: 5,
        synergyTag: 'Loot Boost',
      },
      {
        id: 'mine_strength',
        name: "Miner's Strength",
        description: 'Adds 10% of Mining Power (+min 4) directly as Flat Melee Damage.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
      {
        id: 'mine_geode_sense',
        name: 'Geode Sense',
        description: '+15% rare relic & gem discovery chance.',
        minLevel: 5,
        synergyTag: 'Relic Hunt',
      },
    ],
  },
  fishing: {
    id: 'fishing',
    category: 'life',
    name: 'Fishing',
    khmerName: 'ស្ទូចត្រី',
    icon: '🎣',
    accentColor: '#0284c7',
    howItLevels: 'Reeling catches at Riverside Park & Pier',
    perLevelSummary: '+1 Fishing Power / Lv',
    talents: [
      {
        id: 'fish_faster_bite',
        name: 'Faster Bite',
        description: '-25% bobber wait time while fishing.',
        minLevel: 5,
        synergyTag: 'Riverside',
      },
      {
        id: 'fish_trained_aim',
        name: 'Well-Trained Aim',
        description: 'Adds 25% of Fishing Power (+min 4) as Flat Ranged Damage.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
      {
        id: 'fish_studied_patterns',
        name: 'Studied Patterns',
        description: '+8% Dodge / Damage Mitigation reflex in boss rooms.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
    ],
  },
  foraging: {
    id: 'foraging',
    category: 'life',
    name: 'Foraging',
    khmerName: 'បេះផ្លែឈើ',
    icon: '🌿',
    accentColor: '#65a30d',
    howItLevels: 'Harvesting orchard trees & gathering wild herbs',
    perLevelSummary: '+0.3% Move Speed & +0.5% Wood Yield / Lv',
    talents: [
      {
        id: 'forage_double',
        name: 'Double Gather',
        description: '20% chance for 2× wild herbs & orchard tree fruits.',
        minLevel: 5,
        synergyTag: 'Orchard',
      },
      {
        id: 'forage_stride',
        name: 'Forest Stride',
        description: '+10% permanent sprint speed across Village & Dungeons.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
      {
        id: 'forage_tracker',
        name: 'Tracker',
        description: 'Highlights secret cracked dungeon walls & hidden chests.',
        minLevel: 5,
        synergyTag: 'Exploration',
      },
    ],
  },
  cooking: {
    id: 'cooking',
    category: 'life',
    name: 'Cooking',
    khmerName: 'ចម្អិនម្ហូប',
    icon: '🍜',
    accentColor: '#ea580c',
    howItLevels: 'Cooking Khmer street snacks & feasts from farm ingredients',
    perLevelSummary: '+0.4% Food Buff Power / Lv',
    talents: [
      {
        id: 'cook_long_lasting',
        name: 'Long-Lasting Meals',
        description: '+30% longer duration on all Street Snack Dungeon Buffs.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
      {
        id: 'cook_sharing',
        name: 'Sharing Is Caring',
        description: 'Warm meal aroma boosts Village Happy/Healthy gains by +25%.',
        minLevel: 5,
        synergyTag: 'Life Synergy',
      },
      {
        id: 'cook_master_chef',
        name: 'Master Chef',
        description: '20% chance to cook a bonus extra dish at zero ingredient cost.',
        minLevel: 5,
        synergyTag: 'Kitchen',
      },
    ],
  },
  crafting: {
    id: 'crafting',
    category: 'life',
    name: 'Crafting & Alchemy',
    khmerName: 'សិប្បកម្ម',
    icon: '⚗️',
    accentColor: '#9333ea',
    howItLevels: 'Collecting Artisan machines, brewing elixirs & forging gear',
    perLevelSummary: '+0.3% Base Armor / Lv',
    talents: [
      {
        id: 'craft_alchemist_luck',
        name: 'Alchemist Luck',
        description: '+20% chance for bonus output from Artisan machines.',
        minLevel: 5,
        synergyTag: 'Artisan',
      },
      {
        id: 'craft_reforge',
        name: 'Reforge Master',
        description: '+10% upgrade success chance & +5% Artisan sell value.',
        minLevel: 5,
        synergyTag: 'Blacksmith',
      },
      {
        id: 'craft_lingering',
        name: 'Lingering Elixirs',
        description: 'Healing snacks restore +25% bonus HP immediately.',
        minLevel: 5,
        synergyTag: 'Dungeon Synergy',
      },
    ],
  },

  // ==================== COMBAT & ADVENTURE (6) ====================
  melee: {
    id: 'melee',
    category: 'combat',
    name: 'Melee Mastery',
    khmerName: 'ក្បាច់គុនផ្គាក់',
    icon: '⚔️',
    accentColor: '#dc2626',
    howItLevels: 'Landing Lbokator Warrior (Phkak) melee strikes in dungeons',
    perLevelSummary: '+0.5% Melee Damage / Lv',
    talents: [
      {
        id: 'melee_fury',
        name: 'Building Fury',
        description: '+2% Melee Dmg per consecutive hit (stacks up to 10× = +20%).',
        minLevel: 5,
      },
      {
        id: 'melee_seething',
        name: 'Seething Blade',
        description: '10% chance on melee hit to lifesteal 3% Max HP.',
        minLevel: 5,
      },
      {
        id: 'melee_boss_slayer',
        name: 'Boss Slayer',
        description: '+15% Melee Damage directly against Dungeon Bosses.',
        minLevel: 5,
      },
    ],
  },
  ranged: {
    id: 'ranged',
    category: 'combat',
    name: 'Ranged Mastery',
    khmerName: 'ជំនាញធ្នូ',
    icon: '🏹',
    accentColor: '#15803d',
    howItLevels: 'Landing Divine Archer (Thnu) arrow shots in dungeons',
    perLevelSummary: '+0.5% Ranged Damage / Lv',
    talents: [
      {
        id: 'ranged_ammo_saver',
        name: 'Ammo Saver',
        description: '25% chance to fire a rapid twin-spark follow-up arrow.',
        minLevel: 5,
      },
      {
        id: 'ranged_weakness',
        name: 'Weakness Detection',
        description: '+8% Ranged Critical Hit chance on boss targets.',
        minLevel: 5,
      },
      {
        id: 'ranged_precision',
        name: 'Amplified Precision',
        description: '+30% Critical Damage multiplier (1.75× → 2.05×).',
        minLevel: 5,
      },
    ],
  },
  magic: {
    id: 'magic',
    category: 'combat',
    name: 'Magic Mastery',
    khmerName: 'មន្តអាគម',
    icon: '✨',
    accentColor: '#ca8a04',
    howItLevels: 'Landing Achar Mystic (Sastra) spells & Yant detonations',
    perLevelSummary: '+0.5% Magic Damage & +1 Max MP / Lv',
    talents: [
      {
        id: 'magic_channeling',
        name: 'Mana Channeling',
        description: '+10% Magic Damage on every spell & Yant detonation.',
        minLevel: 5,
      },
      {
        id: 'magic_barrier',
        name: 'Mental Barrier',
        description: 'Arcane ward grants +10% Raw Damage Reduction in raids.',
        minLevel: 5,
      },
      {
        id: 'magic_frenzy',
        name: 'Arcane Frenzy',
        description: '+15% faster Sastra cast speed.',
        minLevel: 5,
      },
    ],
  },
  summoning: {
    id: 'summoning',
    category: 'combat',
    name: 'Summoning & Taming',
    khmerName: 'បារមីសត្វចិញ្ចឹម',
    icon: '🐉',
    accentColor: '#059669',
    howItLevels: 'Landing Barami Spirit Tamer (Krama Whip) & Pet Spirit hits',
    perLevelSummary: '+0.5% Minion & Whip Damage / Lv',
    talents: [
      {
        id: 'summon_extra_spirit',
        name: 'Extra Spirit Resonance',
        description: '+25% Spirit Pet bolt damage in boss arenas.',
        minLevel: 5,
      },
      {
        id: 'summon_ferocious',
        name: 'Ferocious Minions',
        description: '+20% Pet companion auto-attack speed.',
        minLevel: 5,
      },
      {
        id: 'summon_tough_gang',
        name: 'Tough Gang',
        description: '+30 Max HP barrier while an active Pet is equipped.',
        minLevel: 5,
      },
    ],
  },
  rogue: {
    id: 'rogue',
    category: 'combat',
    name: 'Rogue & Agility',
    khmerName: 'ស្រមោលរហ័ស',
    icon: '🗡️',
    accentColor: '#7e22ce',
    howItLevels: 'Landing Shadow Hunter (Kambet) strikes & agile dodges',
    perLevelSummary: '+0.4% Rogue Damage & +0.1% Speed / Lv',
    talents: [
      {
        id: 'rogue_stealth',
        name: 'Shadow Stealth',
        description: '+25% faster Shadow Strike Stealth Bar recharge.',
        minLevel: 5,
      },
      {
        id: 'rogue_toes',
        name: 'On Your Toes',
        description: '+12% Dungeon Move Speed & +10% Jump Agility.',
        minLevel: 5,
      },
      {
        id: 'rogue_escape',
        name: 'Escape Artist',
        description: '-20% Dash cooldown across all 5 Khmer classes.',
        minLevel: 5,
      },
    ],
  },
  vitality: {
    id: 'vitality',
    category: 'combat',
    name: 'Vitality',
    khmerName: 'កម្លាំងជីវិត',
    icon: '❤️',
    accentColor: '#e11d48',
    howItLevels: 'Defeating dungeon enemies & vanquishing bosses',
    perLevelSummary: '+2 Max HP / Lv',
    talents: [
      {
        id: 'vit_stayin_alive',
        name: "Stayin' Alive",
        description: '+25 flat Max HP & stronger survival stamina.',
        minLevel: 5,
      },
      {
        id: 'vit_ancients',
        name: 'Protection of the Ancients',
        description: '-12% damage taken from Dungeon Bosses (+12% Raw DR).',
        minLevel: 5,
      },
      {
        id: 'vit_cheat_death',
        name: 'Cheat Death',
        description: 'Once per boss fight, survive a lethal blow at 15% HP.',
        minLevel: 5,
      },
    ],
  },
};

export const SKILL_LIST: SkillDefinition[] = [
  SKILL_DEFINITIONS.farming,
  SKILL_DEFINITIONS.mining,
  SKILL_DEFINITIONS.fishing,
  SKILL_DEFINITIONS.foraging,
  SKILL_DEFINITIONS.cooking,
  SKILL_DEFINITIONS.crafting,
  SKILL_DEFINITIONS.melee,
  SKILL_DEFINITIONS.ranged,
  SKILL_DEFINITIONS.magic,
  SKILL_DEFINITIONS.summoning,
  SKILL_DEFINITIONS.rogue,
  SKILL_DEFINITIONS.vitality,
];

export const ALL_SKILL_IDS: SkillId[] = SKILL_LIST.map((s) => s.id);

/**
 * 1 Talent Point every 5 levels (+5 bonus at Lv. 100 = 25 max per skill).
 */
export function getEarnedTalentPoints(level: number): number {
  const safe = Math.max(1, Math.min(MAX_SKILL_LEVEL, Math.floor(level)));
  return Math.floor(safe / 5) + (safe >= 100 ? 5 : 0);
}

export function getAvailableTalentPoints(entry: SkillEntry): number {
  return Math.max(0, getEarnedTalentPoints(entry.level) - entry.unlockedTalents.length);
}

export function hasTalent(profile: SkillProfile, skillId: SkillId, talentId: string): boolean {
  return profile.skills[skillId]?.unlockedTalents.includes(talentId) ?? false;
}

export interface VillageToDungeonBridgeStats {
  activeClassSkillId: SkillId;
  activeClassSkillLevel: number;
  healthyHpBonusPct: number;      // 0..0.20 (+20% Max HP at 100 Healthy)
  happyCritBonus: number;         // 0..0.15 (+15% Crit at 100 Happy)
  classSkillDamagePct: number;    // From equipped class skill level + combat talents
  flatDamageBonus: number;        // From level + cross-world talents (Mining/Fishing)
  snackAttackPct: number;         // From active street snack buffs (scaled by Cooking Lv)
  snackMaxHpPct: number;          // From Golden Durian Feast etc.
  snackCritBonus: number;         // From Golden Durian Feast etc.
  snackMpRegenPct: number;        // From Lotus Spirit Tea
  moveSpeedBonusPct: number;      // Snack + Foraging/Rogue passives + talents
  jumpPowerBonusPct: number;      // Snack + Rogue agility talent
  poisonImmune: boolean;          // From Coconut Anti-Venom
  effectiveMaxHp: number;
  effectiveCritChance: number;
  critMultiplier: number;         // 1.75 base (2.05 with Amplified Precision)
  rawDRBonus: number;             // From Vitality / Magic / Farming / Fishing talents
  stealthRateBonusPct: number;    // Shadow Stealth talent
  dashCooldownMult: number;       // Escape Artist talent
  petAttackSpeedMult: number;     // Ferocious Minions talent
  petDamageBonusPct: number;      // Extra Spirit Resonance talent
  botanicalVenomChance: number;   // Farming cross-world synergy
  botanicalVenomPowerPct: number; // +0.2% per Farming Lv
  seethingLifestealChance: number;// Melee lifesteal talent
  castSpeedMult: number;          // Arcane Frenzy + Weapon/Accessory Reforge Speed
  effectiveDefense: number;       // Base Defense + Warding/Guarding/Hard + Shimmer Ward + Accessories + Armor Set Bonus
  weaponSizeMult: number;         // 1.0 + Legendary (+10%) / Superior (+5%)
  hasDoubleJump: boolean;         // Lotus Jump Charm / Wind-Walker Boots / Angkor Phantom Stride
  miningSpeedPct: number;         // Laterite Miner Set (+25%) + Accessories
  armorDamagePctBonus: number;    // Naga Scale Set (+15% All Damage)
  hasGroundSlamShockwave: boolean;// Yeak Thmor Stone Set hard-landing shockwave
  hasWaterShield: boolean;        // Naga Scale Set orbiting water shield (blocks 1 hit / 20s)
  activeArmorSetId: string | null;
  museumRareDropLuckPct: number;  // 6+ Museum donations -> +10% Rare Drop Luck
  museumSkillXpBonusPct: number;  // 10+ Museum donations -> +15% All Skill XP
  kromFarmSpeedPct: number;       // Krom Lv.1–10 -> +5%..+20% Farm Speed
  kromBossDamagePct: number;      // Krom Lv.1–10 -> +5%..+20% Boss Damage
  kromCoinDropPct: number;        // Krom Lv.1–10 -> +5%..+20% Coin Drops
  pchumBenActive: boolean;        // Pchum Ben 10-min +20% All Skill XP & +15% Luck
}

/**
 * Single source of truth connecting Village LifeStats, 12-Skill RPG Profile & Street Snack Buffs
 * directly into Dungeon combat physics and @shared/balanceFormulas.ts.
 */
export function computeVillageToDungeonBridge(
  player: PlayerState,
  now = Date.now(),
  consecutiveMeleeHits = 0
): VillageToDungeonBridgeStats {
  const skills = player.skills.skills;
  const activeClassSkillId = CLASS_TO_COMBAT_SKILL[player.activeClass];
  const activeClassSkillLevel = skills[activeClassSkillId]?.level ?? 1;

  // 1. Village Life Stats Bridge (docs/GDD.md §5)
  const healthyClamped = Math.max(0, Math.min(100, player.lifeStats.healthy));
  const happyClamped = Math.max(0, Math.min(100, player.lifeStats.happy));
  const healthyHpBonusPct = (healthyClamped / 100) * 0.2; // up to +20% Max HP
  const happyCritBonus = (happyClamped / 100) * 0.15;     // up to +15% Crit Chance

  // 2. Active Street Snack Buffs (scaled by Cooking passive +0.4% power per level)
  const cookingLv = skills.cooking?.level ?? 1;
  const cookingPowerMult = 1 + (cookingLv - 1) * 0.004;

  let snackAttackPct = 0;
  let snackMaxHpPct = 0;
  let snackCritBonus = 0;
  let snackMoveSpeedPct = 0;
  let snackJumpPowerPct = 0;
  let snackMpRegenPct = 0;
  let poisonImmune = false;

  for (const buff of player.activeBuffs) {
    if (buff.expiresAt <= now) continue;
    if (buff.attackPct) snackAttackPct += buff.attackPct * cookingPowerMult;
    if (buff.maxHpPct) snackMaxHpPct += buff.maxHpPct * cookingPowerMult;
    if (buff.critChanceBonus) snackCritBonus += buff.critChanceBonus * cookingPowerMult;
    if (buff.moveSpeedPct) snackMoveSpeedPct += buff.moveSpeedPct * cookingPowerMult;
    if (buff.jumpPowerPct) snackJumpPowerPct += buff.jumpPowerPct * cookingPowerMult;
    if (buff.mpRegenPct) snackMpRegenPct += buff.mpRegenPct * cookingPowerMult;
    if (buff.poisonImmune) poisonImmune = true;
  }

  // 3. Class Skill Passive % Damage + Combat & Cross-World Talents
  const perLvDmg = activeClassSkillId === 'rogue' ? 0.004 : 0.005;
  let classSkillDamagePct = activeClassSkillLevel * perLvDmg;
  let flatDamageBonus = player.level * 2;
  let critMultiplier = 1.75;
  let talentCritBonus = 0;
  let rawDRBonus = 0;

  if (player.activeClass === 'lbokator') {
    if (hasTalent(player.skills, 'melee', 'melee_boss_slayer')) classSkillDamagePct += 0.15;
    if (hasTalent(player.skills, 'melee', 'melee_fury')) {
      classSkillDamagePct += Math.min(10, consecutiveMeleeHits) * 0.02;
    }
    if (hasTalent(player.skills, 'mining', 'mine_strength')) {
      const miningLv = skills.mining?.level ?? 1;
      flatDamageBonus += Math.max(4, Math.round(miningLv * 0.5));
    }
  } else if (player.activeClass === 'archer') {
    if (hasTalent(player.skills, 'ranged', 'ranged_weakness')) talentCritBonus += 0.08;
    if (hasTalent(player.skills, 'ranged', 'ranged_precision')) critMultiplier += 0.3;
    if (hasTalent(player.skills, 'fishing', 'fish_trained_aim')) {
      const fishingLv = skills.fishing?.level ?? 1;
      flatDamageBonus += Math.max(4, Math.round(fishingLv * 0.6));
    }
  } else if (player.activeClass === 'mystic') {
    if (hasTalent(player.skills, 'magic', 'magic_channeling')) classSkillDamagePct += 0.1;
  }

  // Cross-world defensive & utility talents
  if (hasTalent(player.skills, 'farming', 'farm_thorny_skin')) rawDRBonus += 0.04;
  if (hasTalent(player.skills, 'fishing', 'fish_studied_patterns')) rawDRBonus += 0.08;
  if (hasTalent(player.skills, 'magic', 'magic_barrier')) rawDRBonus += 0.1;
  if (hasTalent(player.skills, 'vitality', 'vit_ancients')) rawDRBonus += 0.12;

  const reforge = computeReforgeDeltas(player.weaponPrefix, player.armorPrefix);
  const acc = aggregateAccessoryBonuses(player.loadout.accessories);
  const armorSet = getCombatArmorSetBonus(player.loadout.armor);
  if (acc.poisonImmune) poisonImmune = true;

  const shimmer = player.shimmerBlessings ?? [];
  const shimmerHpBonus =
    (shimmer.includes('blessing_durian_hp') ? 20 : 0) +
    (shimmer.includes('blessing_vital_crystal') ? 25 : 0);
  const shimmerLuckCrit =
    (shimmer.includes('blessing_pink_lotus_luck') ? 0.05 : 0) +
    (shimmer.includes('blessing_lotus_luck') ? 0.05 : 0);
  const shimmerDefBonus = shimmer.includes('blessing_sandstone_ward') ? 5 : 0;

  const foragingLv = skills.foraging?.level ?? 1;
  const rogueLv = skills.rogue?.level ?? 1;
  const museumPerks = getMuseumScholarPerks(player.museumDonations);
  let moveSpeedBonusPct =
    snackMoveSpeedPct +
    (foragingLv - 1) * 0.003 +
    (rogueLv - 1) * 0.001 +
    reforge.moveSpeedPct +
    acc.moveSpeedPct +
    museumPerks.moveSpeedBonusPct;
  let jumpPowerBonusPct = snackJumpPowerPct;
  if (hasTalent(player.skills, 'foraging', 'forage_stride')) moveSpeedBonusPct += 0.1;
  if (hasTalent(player.skills, 'rogue', 'rogue_toes')) {
    moveSpeedBonusPct += 0.12;
    jumpPowerBonusPct += 0.1;
  }

  // Vitality & Summoning Max HP bonuses + Reforge + Shimmer + Accessories + Armor Set Bonus
  const vitalityLv = skills.vitality?.level ?? 1;
  let flatHpBonus =
    (vitalityLv - 1) * 2 +
    reforge.maxHpFlat +
    shimmerHpBonus +
    acc.maxHpFlat +
    (armorSet?.bonusMaxHpFlat ?? 0);
  if (hasTalent(player.skills, 'vitality', 'vit_stayin_alive')) flatHpBonus += 25;
  if (player.loadout.pet && hasTalent(player.skills, 'summoning', 'summon_tough_gang')) {
    flatHpBonus += 30;
  }

  const effectiveMaxHp = Math.max(
    1,
    Math.round((player.maxHp + flatHpBonus) * (1 + healthyHpBonusPct + snackMaxHpPct))
  );
  const effectiveCritChance = Math.min(
    0.95,
    player.weapon.critChance +
      happyCritBonus +
      snackCritBonus +
      talentCritBonus +
      reforge.critBonus +
      shimmerLuckCrit +
      acc.critChanceBonus
  );
  const effectiveDefense = Math.max(
    0,
    player.defense + reforge.defenseFlat + shimmerDefBonus + acc.defenseFlat + (armorSet?.bonusDefenseFlat ?? 0)
  );
  const baseCastMult =
    player.activeClass === 'mystic' && hasTalent(player.skills, 'magic', 'magic_frenzy') ? 1.15 : 1;

  const baseDashMult = hasTalent(player.skills, 'rogue', 'rogue_escape') ? 0.8 : 1;
  const dashCooldownMult = Math.max(0.35, baseDashMult * (1 - acc.dashCooldownReductionPct));

  const farmingLv = skills.farming?.level ?? 1;
  const kromBuffs = computeKromBuffs(player.kromLevel);
  const pchumBenActive = Boolean(player.pchumBenBlessingUntil && player.pchumBenBlessingUntil > now);
  return {
    activeClassSkillId,
    activeClassSkillLevel,
    healthyHpBonusPct,
    happyCritBonus,
    classSkillDamagePct: classSkillDamagePct + kromBuffs.bossDamagePct,
    flatDamageBonus,
    snackAttackPct,
    snackMaxHpPct,
    snackCritBonus,
    snackMpRegenPct,
    moveSpeedBonusPct,
    jumpPowerBonusPct,
    poisonImmune,
    effectiveMaxHp,
    effectiveCritChance,
    critMultiplier,
    rawDRBonus,
    stealthRateBonusPct: hasTalent(player.skills, 'rogue', 'rogue_stealth') ? 0.25 : 0,
    dashCooldownMult,
    petAttackSpeedMult: hasTalent(player.skills, 'summoning', 'summon_ferocious') ? 1.2 : 1,
    petDamageBonusPct: hasTalent(player.skills, 'summoning', 'summon_extra_spirit') ? 0.25 : 0,
    botanicalVenomChance: hasTalent(player.skills, 'farming', 'farm_botanical_venom') ? 0.15 : 0,
    botanicalVenomPowerPct: 0.22 + farmingLv * 0.002,
    seethingLifestealChance:
      player.activeClass === 'lbokator' && hasTalent(player.skills, 'melee', 'melee_seething') ? 0.1 : 0,
    castSpeedMult: Math.max(0.65, baseCastMult + reforge.attackSpeedPct),
    effectiveDefense,
    weaponSizeMult: 1 + reforge.sizePct,
    hasDoubleJump: acc.hasDoubleJump,
    miningSpeedPct: acc.miningSpeedPct + (armorSet?.miningSpeedPct ?? 0),
    armorDamagePctBonus: armorSet?.bonusAllDamagePct ?? 0,
    hasGroundSlamShockwave: Boolean(armorSet?.groundSlamShockwave),
    hasWaterShield: Boolean(armorSet?.waterShieldEvery20s),
    activeArmorSetId: armorSet?.armorId ?? null,
    museumRareDropLuckPct: museumPerks.rareDropLuckBonusPct + (pchumBenActive ? 0.15 : 0),
    museumSkillXpBonusPct: museumPerks.skillXpBonusPct + (pchumBenActive ? 0.2 : 0),
    kromFarmSpeedPct: kromBuffs.farmSpeedPct,
    kromBossDamagePct: kromBuffs.bossDamagePct,
    kromCoinDropPct: kromBuffs.coinDropPct,
    pchumBenActive,
  };
}
