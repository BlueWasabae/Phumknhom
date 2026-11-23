import type { KhmerClassId } from './types';

export interface KhmerClassDefinition {
  id: KhmerClassId;
  khmerName: string;
  englishName: string;
  role: 'Melee' | 'Ranged' | 'Magic' | 'Summoner' | 'Rogue';
  starterWeaponId: string;
  starterWeaponName: string;
  starterWeaponKhmer: string;
  mechanicTitle: string;
  mechanicSummary: string;
  dashDescription: string;
  accentColor: string;
  badgeBg: string;
}

/**
 * The 5 Distinct Khmer Playable Classes from docs/GDD_KHMER_LORE_AND_ANIMATION.md §1
 */
export const KHMER_CLASSES: Record<KhmerClassId, KhmerClassDefinition> = {
  lbokator: {
    id: 'lbokator',
    khmerName: 'អ្នកចម្បាំងល្បុក្កតោ',
    englishName: 'Lbokator Warrior',
    role: 'Melee',
    starterWeaponId: 'weapon_phkak',
    starterWeaponName: 'Phkak',
    starterWeaponKhmer: 'ផ្គាក់',
    mechanicTitle: 'Animal-Stance 3-Hit Combo',
    mechanicSummary:
      'Chains Lion (heavy knockback) → Crocodile (armor pierce) → Hanuman (overhead ground slam with golden dust burst).',
    dashDescription: 'Forward shoulder-roll leaving golden dust sparks.',
    accentColor: '#f59e0b',
    badgeBg: '#78350f',
  },
  archer: {
    id: 'archer',
    khmerName: 'ព្រានធ្នូទេព',
    englishName: 'Divine Archer',
    role: 'Ranged',
    starterWeaponId: 'weapon_thnu',
    starterWeaponName: 'Thnu',
    starterWeaponKhmer: 'ធ្នូ',
    mechanicTitle: 'Elemental Quiver',
    mechanicSummary:
      'Fires fast glowing Reamker arrows with crisp spark impacts across the arena.',
    dashDescription: 'Acrobatic backflip that fires 1 quick arrow mid-air.',
    accentColor: '#22c55e',
    badgeBg: '#14532d',
  },
  mystic: {
    id: 'mystic',
    khmerName: 'គ្រូមន្តអាគម',
    englishName: 'Achar Mystic',
    role: 'Magic',
    starterWeaponId: 'weapon_sastra',
    starterWeaponName: 'Sastra Sleuk Rith',
    starterWeaponKhmer: 'សាស្ត្រាស្លឹករឹត',
    mechanicTitle: 'Yant Sigil Weaving',
    mechanicSummary:
      'Casts glowing arcane orbs & leaves floating golden Khmer Yant sigils — 3 stacked sigils detonate in a massive sacred burst.',
    dashDescription: 'Blink-teleport dissolving into golden lotus petals.',
    accentColor: '#eab308',
    badgeBg: '#713f12',
  },
  tamer: {
    id: 'tamer',
    khmerName: 'អ្នកកាន់បារមី',
    englishName: 'Barami Spirit Tamer',
    role: 'Summoner',
    starterWeaponId: 'weapon_krama_whip',
    starterWeaponName: 'Krama Whip',
    starterWeaponKhmer: 'ក្រមា',
    mechanicTitle: 'Spirit Pact',
    mechanicSummary:
      'Wide checkered red-and-white Krama whip snap marks enemies so your spirit companion (Mini-Naga / Firefly Lantern) auto-attacks them.',
    dashDescription: 'Merges into a spirit silhouette passing smoothly through danger.',
    accentColor: '#10b981',
    badgeBg: '#064e3b',
  },
  shadow: {
    id: 'shadow',
    khmerName: 'អ្នកប្រមាញ់ស្រមោល',
    englishName: 'Shadow Hunter',
    role: 'Rogue',
    starterWeaponId: 'weapon_kambet',
    starterWeaponName: 'Kambet Bantoh',
    starterWeaponKhmer: 'កាំបិតបន្ទោះ',
    mechanicTitle: 'Stealth Strike Bar',
    mechanicSummary:
      'Stealth fills when not attacking (player turns 45% translucent purple mist) → next strike triggers a guaranteed Shadow Strike Crit.',
    dashDescription: 'Instant smoke-puff vanish leaving a shadow afterimage decoy.',
    accentColor: '#a855f7',
    badgeBg: '#4c1d95',
  },
};

export const KHMER_CLASS_LIST: KhmerClassDefinition[] = [
  KHMER_CLASSES.lbokator,
  KHMER_CLASSES.archer,
  KHMER_CLASSES.mystic,
  KHMER_CLASSES.tamer,
  KHMER_CLASSES.shadow,
];
