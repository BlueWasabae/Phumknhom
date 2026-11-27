import type { BossId, BossRigType, DifficultyMode } from './types';
import { calculateCoopBossHp } from './balanceFormulas';

export interface BossLootEntry {
  itemId: string;
  label: string;
  chanceNormal: number;  // 0..1
  chanceExpert: number;  // 0..1 (Expert/Mythic Treasure Bag boost)
  quantity: number;
  isEquipment?: boolean;
}

export interface KhmerBossDef {
  id: BossId;
  rosterNumber: number;
  khmerName: string;
  englishName: string;
  shortTitle: string;
  biomeName: string;
  rig: BossRigType;
  textureKey: string;
  soloNormalHp: number;
  baseAttack: number;
  defense: number;
  bossDR: number;
  coinsReward: number;
  firstClearGold: number;
  vitalityXp: number;
  charXp: number;
  accentColor: string;
  lore: string;
  trophyName: string;
  trophyIcon: string;
  phase1Summary: string;
  phase2Summary: string;
  phase3Summary?: string;
  isEndgame?: boolean;
  drops: BossLootEntry[];
  noHitEasterEggItemId?: string;
  noHitEasterEggHint?: string;
}

export interface RolledBossLoot {
  coins: number;
  gold: number;
  items: Array<{ itemId: string; label: string; quantity: number; isEquipment?: boolean }>;
  isTreasureBag: boolean;
  easterEggUnlocked: boolean;
}

/**
 * All 4 Reusable Khmer Boss Rigs (docs/GDD_KHMER_LORE_AND_ANIMATION.md):
 * - #1 Sdech Kongkaeb (QuadrupedHopperRig)
 * - #2 Arp Prey Chrov (FloaterRig)
 * - #5 Yeak Thmor Prasat (HumanoidRig)
 * - #6 Neak Reach — Shadow Naga (MultiSegmentWormRig)
 */
export const KHMER_BOSSES: Record<BossId, KhmerBossDef> = {
  sdech_kongkaeb: {
    id: 'sdech_kongkaeb',
    rosterNumber: 1,
    khmerName: 'ស្តេចកង្កែបភក់',
    englishName: 'Sdech Kongkaeb Phok (King Frog)',
    shortTitle: 'King Frog · Boss #1',
    biomeName: 'Muddy Rice Hollow',
    rig: 'QuadrupedHopperRig',
    textureKey: 'boss_sdech_kongkaeb',
    soloNormalHp: 4500,
    baseAttack: 18,
    defense: 6,
    bossDR: 0.04,
    coinsReward: 220,
    firstClearGold: 3,
    vitalityXp: 65,
    charXp: 90,
    accentColor: '#22c55e',
    lore: 'Sovereign of the flooded rice paddies who hoards ancient coins beneath a golden lotus crown.',
    trophyName: 'Golden Frog Crown Trophy',
    trophyIcon: '🐸',
    phase1Summary: 'High jump slams toward player + sticky tongue lash telegraph.',
    phase2Summary: 'Inflates bright red throat pouch → double belly-flop shockwaves + 2 bouncing mini tadpoles.',
    drops: [
      {
        itemId: 'drop_slime_core',
        label: 'Slime Core',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'armor_dash_boots',
        label: 'Starter Dash Boots',
        chanceNormal: 0.25,
        chanceExpert: 0.45,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'hat_frog_crown',
        label: 'Frog Prince Crown',
        chanceNormal: 0.08,
        chanceExpert: 0.18,
        quantity: 1,
        isEquipment: true,
      },
    ],
    noHitEasterEggItemId: 'weapon_golden_pan',
    noHitEasterEggHint: 'No-Hit Secret: Defeat King Frog taking 0 damage to unlock The Golden Frying Pan!',
  },
  arp_prey_chrov: {
    id: 'arp_prey_chrov',
    rosterNumber: 2,
    khmerName: 'អាបព្រៃជ្រៅ',
    englishName: 'Arp Prey Chrov (Forest Ghost)',
    shortTitle: 'Arp Ghost · Boss #2',
    biomeName: 'Dark Bamboo Woods',
    rig: 'FloaterRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 9000,
    baseAttack: 26,
    defense: 8,
    bossDR: 0.06,
    coinsReward: 340,
    firstClearGold: 4,
    vitalityXp: 90,
    charXp: 130,
    accentColor: '#10b981',
    lore: 'Nocturnal folklore ghost hunting in pitch-dark bamboo woods; its bioluminescent aura is the sole light in the gloom.',
    trophyName: 'Bioluminescent Arp Lantern',
    trophyIcon: '👻',
    phase1Summary: 'Darkens the cavern with a radial spotlight aura; fast figure-8 swoops & laughing spin-dashes.',
    phase2Summary: 'Crimson spectral overdrive → double spin-dashes & radial bioluminescent orb rings.',
    drops: [
      {
        itemId: 'drop_spirit_orb',
        label: 'Spirit Ember Orb',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'hat_spirit_veil',
        label: 'Bamboo Spirit Veil',
        chanceNormal: 0.16,
        chanceExpert: 0.34,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'wings_arp_aura',
        label: 'Ghostly Lantern Halo',
        chanceNormal: 0.08,
        chanceExpert: 0.2,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  yeak_thmor: {
    id: 'yeak_thmor',
    rosterNumber: 5,
    khmerName: 'យក្សថ្មប្រាសាទ',
    englishName: 'Yeak Thmor Prasat (Stone Yaksha)',
    shortTitle: 'Stone Yaksha · Boss #5',
    biomeName: 'Ancient Stone Ruins',
    rig: 'HumanoidRig',
    textureKey: 'boss_yeak_thmor',
    soloNormalHp: 18000,
    baseAttack: 40,
    defense: 12,
    bossDR: 0.08,
    coinsReward: 480,
    firstClearGold: 5,
    vitalityXp: 120,
    charXp: 180,
    accentColor: '#f59e0b',
    lore: 'Colossal sandstone temple guardian awakened by ancient tremors, wielding a fiery war club (Dambong).',
    trophyName: 'Sandstone Yaksha Horn',
    trophyIcon: '🗿',
    phase1Summary: 'Telegraphed heavy club slam (red zone) + rolling ground shockwave.',
    phase2Summary: 'Roars, drops 3–4 falling ceiling boulders + faster armored dash charge.',
    drops: [
      {
        itemId: 'drop_stone_core',
        label: 'Stone Core',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'seed_spirit_bamboo',
        label: 'Spirit Bamboo Seed',
        chanceNormal: 0.65,
        chanceExpert: 1,
        quantity: 1,
      },
      {
        itemId: 'weapon_stone_club',
        label: 'Heavy Stone Club',
        chanceNormal: 0.14,
        chanceExpert: 0.3,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'hat_yaksha_mask',
        label: 'Yaksha Mask',
        chanceNormal: 0.05,
        chanceExpert: 0.15,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  neak_reach: {
    id: 'neak_reach',
    rosterNumber: 6,
    khmerName: 'នាគរាជ',
    englishName: 'Neak Reach (Shadow Naga)',
    shortTitle: 'Shadow Naga · Boss #6',
    biomeName: 'Sunken Naga Sanctum',
    rig: 'MultiSegmentWormRig',
    textureKey: 'boss_neak_reach_head',
    soloNormalHp: 24000,
    baseAttack: 46,
    defense: 14,
    bossDR: 0.1,
    coinsReward: 620,
    firstClearGold: 6,
    vitalityXp: 165,
    charXp: 240,
    accentColor: '#a855f7',
    lore: 'Sacred 10-segment serpent weaving effortlessly through sunken Angkor ledges. Drink Coconut Water for Anti-Venom!',
    trophyName: 'Royal Shadow Naga Crest',
    trophyIcon: '🐉',
    phase1Summary: '10-segment sinusoidal serpent weaves through platforms & spits green poison pools (Coconut Anti-Venom counters!).',
    phase2Summary: 'Enraged serpent coils → rapid high-speed platform lunges + 3-way venom pool volleys.',
    drops: [
      {
        itemId: 'drop_naga_scale',
        label: 'Shadow Naga Scale',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'weapon_naga_fang',
        label: 'Naga Venom Fang',
        chanceNormal: 0.16,
        chanceExpert: 0.34,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'hat_naga_crest',
        label: 'Royal Naga Crest',
        chanceNormal: 0.07,
        chanceExpert: 0.18,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  ream_eyso_moni_mekhala: {
    id: 'ream_eyso_moni_mekhala',
    rosterNumber: 7,
    khmerName: 'រាមឥសូរ និង មណីមេខលា',
    englishName: 'Ream Eyso & Moni Mekhala (Storm & Crystal Duo)',
    shortTitle: 'Storm & Crystal Duo · Boss #7',
    biomeName: 'Celestial Monsoon Spire',
    rig: 'DuoStormCrystalRig',
    textureKey: 'boss_yeak_thmor',
    soloNormalHp: 32000,
    baseAttack: 52,
    defense: 16,
    bossDR: 0.12,
    coinsReward: 950,
    firstClearGold: 9,
    vitalityXp: 240,
    charXp: 340,
    accentColor: '#38bdf8',
    lore: 'Mythic duo of Cambodian celestial folklore: Moni Mekhala glides overhead casting dazzling crystal light-beams while Ream Eyso hurls his thunder-axe Phkak across the storm!',
    trophyName: 'Moni Mekhala Crystal Orb',
    trophyIcon: '⚡',
    phase1Summary: 'Two simultaneous bosses! Moni Mekhala fires telegraphed cyan crystal beams & healing orbs overhead while Ream Eyso throws a boomeranging golden lightning axe + thunder pillars.',
    phase2Summary: 'STORM OVERDRIVE: When one twin falls to 0 HP, the survivor surges with radiant storm energy and accelerated overdrive combos!',
    isEndgame: true,
    drops: [
      {
        itemId: 'drop_storm_crystal_core',
        label: 'Storm Crystal Core',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'mat_lightning_axe_blueprint',
        label: 'Lightning Axe Blueprint',
        chanceNormal: 0.45,
        chanceExpert: 0.85,
        quantity: 1,
      },
      {
        itemId: 'wings_mekhala_halo',
        label: 'Mekhala Celestial Halo',
        chanceNormal: 0.22,
        chanceExpert: 0.5,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  krong_reap: {
    id: 'krong_reap',
    rosterNumber: 8,
    khmerName: 'ក្រុងរាពណ៍',
    englishName: 'Krong Reap (Ten-Headed Yaksha Sovereign)',
    shortTitle: 'Final Sovereign · Boss #8',
    biomeName: 'Throne of the Crimson Angkor',
    rig: 'SovereignYakshaRig',
    textureKey: 'boss_yeak_thmor',
    soloNormalHp: 45000,
    baseAttack: 60,
    defense: 19,
    bossDR: 0.14,
    coinsReward: 1400,
    firstClearGold: 12,
    vitalityXp: 360,
    charXp: 500,
    accentColor: '#e11d48',
    lore: 'The supreme Ten-Headed Yaksha Sovereign of the Reamker epic, wreathed in crimson-and-gold Angkor flames across a blistering 3-phase endgame trial.',
    trophyName: 'Ten-Headed Sovereign Crown',
    trophyIcon: '👑',
    phase1Summary: '100%–65% HP: Multi-directional blooming golden chakram volleys + telegraphed giant sovereign sword slams.',
    phase2Summary: '65%–30% HP: Summons 3 orbiting spectral Yaksha Masks firing synchronized cross-beams while crimson magma vents erupt along the arena floor.',
    phase3Summary: '<30% HP (Sovereign Wrath): Darkens the cavern with a crimson vignette and unleashes rhythmic bullet-hell lotus rings rewarding Double-Jump, Dash, Grapple & Focus/Fury!',
    isEndgame: true,
    drops: [
      {
        itemId: 'relic_angkor_mythic',
        label: 'Angkor Mythic Relic',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 1,
      },
      {
        itemId: 'hat_sovereign_crown',
        label: 'Sovereign Crown',
        chanceNormal: 0.35,
        chanceExpert: 0.75,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'mat_reforge_stone',
        label: 'Reforge Stone',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 3,
      },
    ],
  },
};

export const KHMER_BOSS_LIST: KhmerBossDef[] = [
  KHMER_BOSSES.sdech_kongkaeb,
  KHMER_BOSSES.arp_prey_chrov,
  KHMER_BOSSES.yeak_thmor,
  KHMER_BOSSES.neak_reach,
  KHMER_BOSSES.ream_eyso_moni_mekhala,
  KHMER_BOSSES.krong_reap,
];

export const BOSS_RUSH_ORDER: BossId[] = [
  'sdech_kongkaeb',
  'arp_prey_chrov',
  'yeak_thmor',
  'neak_reach',
  'ream_eyso_moni_mekhala',
  'krong_reap',
];

export function getScaledBossMaxHp(
  bossId: BossId,
  difficulty: DifficultyMode,
  partySize = 1
): number {
  const def = KHMER_BOSSES[bossId];
  return calculateCoopBossHp(def.soloNormalHp, partySize, difficulty);
}

export function getDifficultySpeedMultiplier(difficulty: DifficultyMode): number {
  if (difficulty === 'death') return 1.5;
  if (difficulty === 'mythic') return 1.32;
  if (difficulty === 'expert') return 1.18;
  return 1.0;
}

export function rollBossLoot(
  bossId: BossId,
  difficulty: DifficultyMode,
  isFirstClear: boolean,
  noHitKill: boolean,
  rng: () => number = Math.random
): RolledBossLoot {
  const def = KHMER_BOSSES[bossId];
  const isTreasureBag = difficulty !== 'normal';
  const coinMult = difficulty === 'mythic' ? 1.8 : difficulty === 'expert' ? 1.4 : 1;
  const coins = Math.round(def.coinsReward * coinMult);
  const gold = (isFirstClear ? def.firstClearGold : 0) + (difficulty === 'mythic' ? 2 : difficulty === 'expert' ? 1 : 0);

  const items: RolledBossLoot['items'] = [];
  for (const drop of def.drops) {
    const chance = isTreasureBag ? drop.chanceExpert : drop.chanceNormal;
    if (rng() < chance) {
      items.push({
        itemId: drop.itemId,
        label: drop.label,
        quantity: drop.quantity,
        isEquipment: drop.isEquipment,
      });
    }
  }

  const easterEggUnlocked = Boolean(noHitKill && def.noHitEasterEggItemId);
  if (easterEggUnlocked && def.noHitEasterEggItemId) {
    items.push({
      itemId: def.noHitEasterEggItemId,
      label: 'The Golden Frying Pan',
      quantity: 1,
      isEquipment: true,
    });
  }

  return {
    coins,
    gold,
    items,
    isTreasureBag,
    easterEggUnlocked,
  };
}
