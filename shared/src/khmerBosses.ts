import type { BossId, BossRigType, DifficultyMode } from './types';
import { calculateCoopBossHp } from './balanceFormulas';

export interface BossLootEntry {
  itemId: string;
  label: string;
  chanceNormal: number;  // 0..1
  chanceExpert: number;  // 0..1 (Expert/Calamity Treasure Bag boost)
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
  phase1Summary: string;
  phase2Summary: string;
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
 * Boss #1 (King Frog) & Boss #5 (Stone Yaksha) from
 * docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md & docs/GDD_KHMER_LORE_AND_ANIMATION.md
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
};

export const KHMER_BOSS_LIST: KhmerBossDef[] = [
  KHMER_BOSSES.sdech_kongkaeb,
  KHMER_BOSSES.yeak_thmor,
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
  if (difficulty === 'calamity') return 1.32;
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
  const coinMult = difficulty === 'calamity' ? 1.8 : difficulty === 'expert' ? 1.4 : 1;
  const coins = Math.round(def.coinsReward * coinMult);
  const gold = (isFirstClear ? def.firstClearGold : 0) + (difficulty === 'calamity' ? 2 : difficulty === 'expert' ? 1 : 0);

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
