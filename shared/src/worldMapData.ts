import type { BossId } from './types';

export type CityServerId = 'phnom_penh' | 'siem_reap' | 'kampot' | 'battambang';

export interface CityServerDef {
  id: CityServerId;
  name: string;
  khmerName: string;
  tagline: string;
  perk: string;
  accentColor: string;
  regionCode: string;
  basePingMs: number;
  areas: string[];
}

export const CITY_SERVERS: CityServerDef[] = [
  {
    id: 'phnom_penh',
    name: 'Phnom Penh',
    khmerName: 'ភ្នំពេញ',
    tagline: 'Royal Capital & Bustling Riverside Trade Hub',
    perk: 'High Market Activity · Express Green Bus Terminal · AREA 0–2',
    accentColor: '#f59e0b',
    regionCode: 'KH-PP',
    basePingMs: 18,
    areas: ['AREA 0', 'AREA 1', 'AREA 2'],
  },
  {
    id: 'siem_reap',
    name: 'Siem Reap',
    khmerName: 'សៀមរាប',
    tagline: 'Angkor Temple Gateway & Boss Raid Sanctuary',
    perk: 'Co-op Dungeon Lobby Hub · Ancient Pagoda Buffs · AREA 0–2',
    accentColor: '#a855f7',
    regionCode: 'KH-SR',
    basePingMs: 24,
    areas: ['AREA 0', 'AREA 1', 'AREA 2'],
  },
  {
    id: 'kampot',
    name: 'Kampot',
    khmerName: 'កំពត',
    tagline: 'Cozy Coastal Spice Farms & Tranquil Fishing Piers',
    perk: 'Chill Farming & Riverside Fishing Community · AREA 0–2',
    accentColor: '#10b981',
    regionCode: 'KH-KP',
    basePingMs: 28,
    areas: ['AREA 0', 'AREA 1', 'AREA 2'],
  },
  {
    id: 'battambang',
    name: 'Battambang',
    khmerName: 'បាត់ដំបង',
    tagline: 'Emerald Rice Bowl & Heritage Arts Township',
    perk: 'Lush Harvest Farms · Bamboo Train & Club Hub · AREA 0–2',
    accentColor: '#0ea5e9',
    regionCode: 'KH-BB',
    basePingMs: 26,
    areas: ['AREA 0', 'AREA 1', 'AREA 2'],
  },
];

export type CityDistrictId =
  | 'downtown_plaza'
  | 'green_park_shrine'
  | 'personal_farm'
  | 'fishing_pier'
  | 'the_club'
  | 'ancient_pagoda';

export interface CityDistrictNode {
  id: CityDistrictId;
  name: string;
  khmerName: string;
  icon: string;
  mapX: number; // 0..100%
  mapY: number; // 0..100%
  targetZone: 'overworld' | 'farm' | 'club';
  spawnX?: number;
  spawnY?: number;
  description: string;
}

export const CITY_DISTRICTS: CityDistrictNode[] = [
  {
    id: 'downtown_plaza',
    name: 'Downtown Plaza',
    khmerName: 'ទីលានកណ្តាល',
    icon: '🏛️',
    mapX: 46,
    mapY: 48,
    targetZone: 'overworld',
    spawnX: 480,
    spawnY: 405,
    description: 'Central campfire courtyard, Num Pang Cart, Fashion Shop, ATM Vault & Lucky Wheel.',
  },
  {
    id: 'green_park_shrine',
    name: 'Green Park & Shrine',
    khmerName: 'សួនបៃតង និងអាស្រមមាស',
    icon: '⛩️',
    mapX: 52,
    mapY: 62,
    targetZone: 'overworld',
    spawnX: 455,
    spawnY: 516,
    description: 'Golden Blessing Shrine (daily +250c & +10% Luck) & Central Biome Pylon.',
  },
  {
    id: 'personal_farm',
    name: 'Personal Farm',
    khmerName: 'ចម្ការផ្ទាល់ខ្លួន',
    icon: '🌱',
    mapX: 34,
    mapY: 42,
    targetZone: 'farm',
    description: 'Your 6×4 Crop Garden, Fruit Tree Orchard, Livestock Pen & Artisan Machines.',
  },
  {
    id: 'fishing_pier',
    name: 'Fishing Pier',
    khmerName: 'ស្ពានស្ទូចត្រីទន្លេ',
    icon: '🎣',
    mapX: 35,
    mapY: 63,
    targetZone: 'overworld',
    spawnX: 295,
    spawnY: 492,
    description: 'Mekong Riverside Pier — catch Catfish, Silver Carp & Golden Lotus Koi.',
  },
  {
    id: 'the_club',
    name: 'The Club',
    khmerName: 'ក្លឹបកម្សាន្តភូមិ',
    icon: '🃏',
    mapX: 60,
    mapY: 50,
    targetZone: 'club',
    description: 'Indoor neon lounge with Tien Len & Ouk Chaktrang tables!',
  },
  {
    id: 'ancient_pagoda',
    name: 'Ancient Pagoda',
    khmerName: 'វត្តបុរាណ',
    icon: '🛕',
    mapX: 48,
    mapY: 32,
    targetZone: 'overworld',
    spawnX: 480,
    spawnY: 230,
    description: 'Restore all 6 Offering Altars for permanent Greenhouse & Chef discounts.',
  },
];

export type BiomeId =
  | 'emerald_rice_valley'
  | 'angkor_ruins'
  | 'laterite_mines'
  | 'palm_jungle'
  | 'sapphire_coast'
  | 'blighted_marsh'
  | 'sky_pagoda';

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
  unlockCostCoins: number; // Cost to scout Fog-of-War & activate Angkor Biome Pylon
  bossId?: BossId;
  targetScene: 'OverworldScene' | 'FarmScene' | 'ClubScene' | 'DungeonBossScene';
  description: string;
  preahKhanElement: string;
  preahKhanBonusDmgPct: number;
  preahKhanColorHex: number;
}

export const WORLD_BIOMES: Record<BiomeId, WorldBiomeDef> = {
  emerald_rice_valley: {
    id: 'emerald_rice_valley',
    name: 'Emerald Rice Valley',
    khmerName: 'ជ្រលងស្រែមរកត',
    act: 1,
    mapX: 16,
    mapY: 58,
    accentColor: '#16a34a',
    icon: '🌾',
    pylonName: 'Rice Valley Pylon',
    busFareCoins: 40,
    unlockCostCoins: 0,
    bossId: 'sdech_kongkaeb',
    targetScene: 'DungeonBossScene',
    description: 'Flooded emerald paddies, frogs, bamboo groves & Muddy Rice Hollow (Boss #1 King Frog).',
    preahKhanElement: 'Verdant Wave',
    preahKhanBonusDmgPct: 0.1,
    preahKhanColorHex: 0x4ade80,
  },
  angkor_ruins: {
    id: 'angkor_ruins',
    name: 'Angkor Ruins',
    khmerName: 'ប្រាសាទបុរាណអង្គរ',
    act: 1,
    mapX: 74,
    mapY: 36,
    accentColor: '#f59e0b',
    icon: '🏛️',
    pylonName: 'Angkor Ruins Pylon',
    busFareCoins: 100,
    unlockCostCoins: 400,
    bossId: 'yeak_thmor',
    targetScene: 'DungeonBossScene',
    description: 'Mossy sandstone temple crypts guarded by Boss #5 Yeak Thmor (Stone Yaksha).',
    preahKhanElement: 'Sandstone Solar',
    preahKhanBonusDmgPct: 0.14,
    preahKhanColorHex: 0xf59e0b,
  },
  laterite_mines: {
    id: 'laterite_mines',
    name: 'Laterite Mines',
    khmerName: 'អណ្តូងរ៉ែថ្មបាយក្រៀម',
    act: 1,
    mapX: 54,
    mapY: 16,
    accentColor: '#ef4444',
    icon: '⛏️',
    pylonName: 'Laterite Mine Pylon',
    busFareCoins: 90,
    unlockCostCoins: 350,
    bossId: 'yeak_thmor',
    targetScene: 'DungeonBossScene',
    description: 'Deep red laterite shafts rich in Copper, Iron, Gold & Obsidian magma cores.',
    preahKhanElement: 'Molten Laterite',
    preahKhanBonusDmgPct: 0.13,
    preahKhanColorHex: 0xf97316,
  },
  palm_jungle: {
    id: 'palm_jungle',
    name: 'Palm Jungle',
    khmerName: 'ព្រៃត្នោតខ្សឹប',
    act: 1,
    mapX: 16,
    mapY: 30,
    accentColor: '#10b981',
    icon: '🌴',
    pylonName: 'Palm Jungle Pylon',
    busFareCoins: 110,
    unlockCostCoins: 450,
    bossId: 'arp_prey_chrov',
    targetScene: 'DungeonBossScene',
    description: 'Whispering sugar palms & dark bamboo canopy haunted by Boss #2 Arp Prey Chrov.',
    preahKhanElement: 'Spirit Jade',
    preahKhanBonusDmgPct: 0.14,
    preahKhanColorHex: 0x34d399,
  },
  sapphire_coast: {
    id: 'sapphire_coast',
    name: 'Sapphire Coast',
    khmerName: 'ឆ្នេរត្បូងកណ្តៀង',
    act: 2,
    mapX: 28,
    mapY: 84,
    accentColor: '#0ea5e9',
    icon: '🌊',
    pylonName: 'Sapphire Coast Pylon',
    busFareCoins: 150,
    unlockCostCoins: 700,
    bossId: 'neak_reach',
    targetScene: 'DungeonBossScene',
    description: 'Deep coral piers, Night Market boats & the Sunken Abyssal Naga Sanctum.',
    preahKhanElement: 'Tidal Sapphire',
    preahKhanBonusDmgPct: 0.16,
    preahKhanColorHex: 0x38bdf8,
  },
  blighted_marsh: {
    id: 'blighted_marsh',
    name: 'Blighted Marsh',
    khmerName: 'បឹងអាប់អួរ',
    act: 2,
    mapX: 82,
    mapY: 68,
    accentColor: '#a855f7',
    icon: '☠️',
    pylonName: 'Blighted Marsh Pylon',
    busFareCoins: 180,
    unlockCostCoins: 950,
    bossId: 'neak_reach',
    targetScene: 'DungeonBossScene',
    description: 'Violet cursed wetlands patrolled by Boss #6 Neak Reach (Shadow Naga). Bring Coconut Anti-Venom!',
    preahKhanElement: 'Venom Amethyst',
    preahKhanBonusDmgPct: 0.18,
    preahKhanColorHex: 0xc084fc,
  },
  sky_pagoda: {
    id: 'sky_pagoda',
    name: 'Sky Pagoda',
    khmerName: 'វត្តលើអាកាស',
    act: 3,
    mapX: 82,
    mapY: 16,
    accentColor: '#eab308',
    icon: '✨',
    pylonName: 'Sky Pagoda Pylon',
    busFareCoins: 260,
    unlockCostCoins: 1600,
    bossId: 'neak_reach',
    targetScene: 'DungeonBossScene',
    description: 'Floating astral pagoda above the clouds for Act III Mythic Trials & celestial relics.',
    preahKhanElement: 'Astral Eclipse',
    preahKhanBonusDmgPct: 0.2,
    preahKhanColorHex: 0xfacc15,
  },
};

export const WORLD_BIOME_LIST: WorldBiomeDef[] = Object.values(WORLD_BIOMES);

export function getBiomeOrFallback(biomeId?: string): WorldBiomeDef {
  if (biomeId && biomeId in WORLD_BIOMES) {
    return WORLD_BIOMES[biomeId as BiomeId];
  }
  return WORLD_BIOMES.emerald_rice_valley;
}
