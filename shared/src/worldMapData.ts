import type { BossId } from './types';

export type CityServerId = 'phnom_penh' | 'siem_reap' | 'kampot';

export interface CityServerDef {
  id: CityServerId;
  name: string;
  khmerName: string;
  tagline: string;
  perk: string;
  accentColor: string;
  regionCode: string;
  basePingMs: number;
}

export const CITY_SERVERS: CityServerDef[] = [
  {
    id: 'phnom_penh',
    name: 'Phnom Penh',
    khmerName: 'ភ្នំពេញ',
    tagline: 'Royal Capital & Bustling Riverside Trade Hub',
    perk: 'High Market Activity · Express Golden Bus Terminal',
    accentColor: '#f59e0b',
    regionCode: 'KH-PP',
    basePingMs: 18,
  },
  {
    id: 'siem_reap',
    name: 'Siem Reap',
    khmerName: 'សៀមរាប',
    tagline: 'Angkor Temple Gateway & Boss Raid Sanctuary',
    perk: 'Co-op Dungeon Lobby Hub · Ancient Pagoda Buffs',
    accentColor: '#a855f7',
    regionCode: 'KH-SR',
    basePingMs: 24,
  },
  {
    id: 'kampot',
    name: 'Kampot',
    khmerName: 'កំពត',
    tagline: 'Cozy Coastal Spice Farms & Tranquil Fishing Piers',
    perk: 'Chill Farming & Riverside Fishing Community',
    accentColor: '#10b981',
    regionCode: 'KH-KP',
    basePingMs: 28,
  },
];

export type BiomeId =
  | 'phum_plaza'
  | 'emerald_rice_valley'
  | 'dark_bamboo_woods'
  | 'sunken_temple_ruins'
  | 'sunken_naga_sanctum'
  | 'red_laterite_mines'
  | 'whispering_palm_jungle'
  | 'sky_pagoda_spire';

export interface WorldBiomeDef {
  id: BiomeId;
  name: string;
  khmerName: string;
  act: 1 | 2 | 3;
  mapX: number; // 0..100 percentage on fullscreen map canvas
  mapY: number; // 0..100 percentage on fullscreen map canvas
  accentColor: string;
  icon: string;
  pylonName: string;
  busFareCoins: number;
  unlockCostCoins: number; // Cost to scout/clear Fog-of-War & activate Biome Pylon
  bossId?: BossId;
  targetScene: 'OverworldScene' | 'FarmScene' | 'ClubScene' | 'DungeonBossScene';
  description: string;
  preahKhanElement: string;
  preahKhanBonusDmgPct: number;
  preahKhanColorHex: number;
}

export const WORLD_BIOMES: Record<BiomeId, WorldBiomeDef> = {
  phum_plaza: {
    id: 'phum_plaza',
    name: 'Phum & Central Plaza',
    khmerName: 'ភូមិ និងទីលានកណ្តាល',
    act: 1,
    mapX: 48,
    mapY: 54,
    accentColor: '#22c55e',
    icon: '🏡',
    pylonName: 'Central Plaza Pylon',
    busFareCoins: 0,
    unlockCostCoins: 0,
    targetScene: 'OverworldScene',
    description: 'Safe social hub with Stilt Homes, Num Pang Cart, Market Board, ATM Bank, Club & Bus Stop.',
    preahKhanElement: 'Sunlit Lotus',
    preahKhanBonusDmgPct: 0.08,
    preahKhanColorHex: 0xfacc15,
  },
  emerald_rice_valley: {
    id: 'emerald_rice_valley',
    name: 'Emerald Rice Valley',
    khmerName: 'ជ្រលងស្រែមរកត',
    act: 1,
    mapX: 22,
    mapY: 66,
    accentColor: '#16a34a',
    icon: '🌾',
    pylonName: 'Rice Valley Pylon',
    busFareCoins: 40,
    unlockCostCoins: 0,
    bossId: 'sdech_kongkaeb',
    targetScene: 'DungeonBossScene',
    description: 'Flooded emerald paddies, riverside fishing piers, and the Muddy Rice Hollow (King Frog).',
    preahKhanElement: 'Verdant Wave',
    preahKhanBonusDmgPct: 0.1,
    preahKhanColorHex: 0x4ade80,
  },
  dark_bamboo_woods: {
    id: 'dark_bamboo_woods',
    name: 'Dark Bamboo Woods',
    khmerName: 'ព្រៃឫស្សីងងឹត',
    act: 1,
    mapX: 20,
    mapY: 36,
    accentColor: '#10b981',
    icon: '🎋',
    pylonName: 'Bamboo Grove Pylon',
    busFareCoins: 80,
    unlockCostCoins: 250,
    bossId: 'arp_prey_chrov',
    targetScene: 'DungeonBossScene',
    description: 'Bioluminescent nocturnal bamboo grove haunted by Arp Prey Chrov.',
    preahKhanElement: 'Spirit Jade',
    preahKhanBonusDmgPct: 0.12,
    preahKhanColorHex: 0x34d399,
  },
  sunken_temple_ruins: {
    id: 'sunken_temple_ruins',
    name: 'Sunken Temple Ruins',
    khmerName: 'ប្រាសាទបុរាណលិចទឹក',
    act: 1,
    mapX: 74,
    mapY: 38,
    accentColor: '#f59e0b',
    icon: '🏛️',
    pylonName: 'Angkor Ruins Pylon',
    busFareCoins: 120,
    unlockCostCoins: 500,
    bossId: 'yeak_thmor',
    targetScene: 'DungeonBossScene',
    description: 'Ancient mossy sandstone galleries guarded by Yeak Thmor (Stone Yaksha).',
    preahKhanElement: 'Sandstone Solar',
    preahKhanBonusDmgPct: 0.14,
    preahKhanColorHex: 0xf59e0b,
  },
  sunken_naga_sanctum: {
    id: 'sunken_naga_sanctum',
    name: 'Sunken Naga Sanctum',
    khmerName: 'ល្អាងនាគរាជ',
    act: 2,
    mapX: 80,
    mapY: 66,
    accentColor: '#a855f7',
    icon: '🐉',
    pylonName: 'Naga Sanctum Pylon',
    busFareCoins: 180,
    unlockCostCoins: 900,
    bossId: 'neak_reach',
    targetScene: 'DungeonBossScene',
    description: 'Submerged amethyst sanctum patrolled by the 10-segment Shadow Naga (Neak Reach).',
    preahKhanElement: 'Venom Amethyst',
    preahKhanBonusDmgPct: 0.16,
    preahKhanColorHex: 0xc084fc,
  },
  red_laterite_mines: {
    id: 'red_laterite_mines',
    name: 'Red Laterite Highlands',
    khmerName: 'ភ្នំថ្មបាយក្រៀម',
    act: 1,
    mapX: 52,
    mapY: 26,
    accentColor: '#ef4444',
    icon: '⛏️',
    pylonName: 'Laterite Mine Pylon',
    busFareCoins: 100,
    unlockCostCoins: 400,
    bossId: 'yeak_thmor',
    targetScene: 'DungeonBossScene',
    description: 'Crimson iron & crystal mining ridges feeding the Village Blacksmith forge.',
    preahKhanElement: 'Molten Laterite',
    preahKhanBonusDmgPct: 0.13,
    preahKhanColorHex: 0xf97316,
  },
  whispering_palm_jungle: {
    id: 'whispering_palm_jungle',
    name: 'Whispering Palm Jungle',
    khmerName: 'ព្រៃត្នោតខ្សឹប',
    act: 2,
    mapX: 34,
    mapY: 80,
    accentColor: '#eab308',
    icon: '🌴',
    pylonName: 'Shimmer Jungle Pylon',
    busFareCoins: 150,
    unlockCostCoins: 750,
    targetScene: 'FarmScene',
    description: 'Exotic Sugar Palms, Golden Durian canopies, and hidden Apsara Shimmer springs.',
    preahKhanElement: 'Golden Durian Gale',
    preahKhanBonusDmgPct: 0.15,
    preahKhanColorHex: 0xeab308,
  },
  sky_pagoda_spire: {
    id: 'sky_pagoda_spire',
    name: 'Sky Pagoda & Astral Spire',
    khmerName: 'វត្តលើអាកាស និងកំពូលតារា',
    act: 3,
    mapX: 78,
    mapY: 16,
    accentColor: '#38bdf8',
    icon: '✨',
    pylonName: 'Astral Spire Pylon',
    busFareCoins: 260,
    unlockCostCoins: 1800,
    bossId: 'neak_reach',
    targetScene: 'DungeonBossScene',
    description: 'Floating celestial temples above the clouds for Calamity raids & endgame relics.',
    preahKhanElement: 'Astral Eclipse',
    preahKhanBonusDmgPct: 0.2,
    preahKhanColorHex: 0x38bdf8,
  },
};

export const WORLD_BIOME_LIST: WorldBiomeDef[] = Object.values(WORLD_BIOMES);

export interface DistrictShortcut {
  id: string;
  label: string;
  khmerLabel: string;
  icon: string;
  target: 'overworld' | 'farm' | 'club' | 'dungeon';
  busFareCoins: number;
  desc: string;
}

export const VILLAGE_DISTRICTS: DistrictShortcut[] = [
  {
    id: 'dist_plaza',
    label: 'Central Plaza & Market',
    khmerLabel: 'ទីលានកណ្តាល',
    icon: '🏛️',
    target: 'overworld',
    busFareCoins: 0,
    desc: 'Shops, Num Pang Cart, ATM Bank, Lucky Wheel & Bus Stop.',
  },
  {
    id: 'dist_farm',
    label: 'Homestead Farm District',
    khmerLabel: 'ចម្ការផ្ទាល់ខ្លួន',
    icon: '🌱',
    target: 'farm',
    busFareCoins: 0,
    desc: '6×4 Crops, Fruit Trees, Livestock Pens & Artisan Machines.',
  },
  {
    id: 'dist_club',
    label: 'Phum Night Club & Games',
    khmerLabel: 'ក្លឹបកម្សាន្តភូមិ',
    icon: '🃏',
    target: 'club',
    busFareCoins: 25,
    desc: 'Indoor lounge with synced Tien Len & Ouk Chaktrang tables!',
  },
  {
    id: 'dist_dungeon',
    label: 'Angkor Raid Portal',
    khmerLabel: 'ច្រកប្រាសាទប្រយុទ្ធ',
    icon: '⚔️',
    target: 'dungeon',
    busFareCoins: 50,
    desc: 'Direct express bus to the Boss Raid Sanctuary & Shimmer Spring.',
  },
];
