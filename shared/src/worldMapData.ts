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

export type VillageMapId =
  | 'central_plaza'
  | 'market_street'
  | 'temple_district'
  | 'green_park'
  | 'wild_frontier'
  | 'mining_quarry'
  | 'bamboo_forest'
  | 'sunken_ruins'
  | 'koh_rong_island';

export interface VillageMapPortalDef {
  id: string;
  edge: 'north' | 'south' | 'east' | 'west';
  x: number;
  y: number;
  targetType: 'village_map' | 'farm';
  targetMapId?: VillageMapId;
  targetSpawnX?: number;
  targetSpawnY?: number;
  signLabel: string;
  khmerLabel: string;
  prompt: string;
}

export interface VillageMapDef {
  id: VillageMapId;
  name: string;
  khmerName: string;
  icon: string;
  width: number;
  height: number;
  defaultSpawnX: number;
  defaultSpawnY: number;
  description: string;
  accentColor: string;
  portals: VillageMapPortalDef[];
}

export const VILLAGE_MAPS: Record<VillageMapId, VillageMapDef> = {
  central_plaza: {
    id: 'central_plaza',
    name: 'Central Plaza',
    khmerName: 'ទីលានកណ្តាល',
    icon: '🏛️',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 660,
    description:
      'Spacious village heartland with Campfire Courtyard, AREA 0 sign, Express Bus Stop, ATM Bank Vault & Lucky Wheel.',
    accentColor: '#f59e0b',
    portals: [
      {
        id: 'cp_north_temple',
        edge: 'north',
        x: 800,
        y: 132,
        targetType: 'village_map',
        targetMapId: 'temple_district',
        targetSpawnX: 800,
        targetSpawnY: 1015,
        signLabel: '↑ TEMPLE DISTRICT',
        khmerLabel: 'សង្កាត់ប្រាសាទ',
        prompt: 'Walk through Portal Arch or [E] → Temple District (Pagoda & Boss Portals)',
      },
      {
        id: 'cp_east_market',
        edge: 'east',
        x: 1472,
        y: 600,
        targetType: 'village_map',
        targetMapId: 'market_street',
        targetSpawnX: 190,
        targetSpawnY: 600,
        signLabel: '→ MARKET STREET',
        khmerLabel: 'វិថីផ្សារភូមិ',
        prompt: 'Walk through East Gate or [E] → Market Street (Shops, Blacksmith & Club)',
      },
      {
        id: 'cp_west_farm',
        edge: 'west',
        x: 128,
        y: 600,
        targetType: 'farm',
        signLabel: '← MY FARM',
        khmerLabel: 'ចម្ការផ្ទាល់ខ្លួន',
        prompt: 'Walk through Homestead Gate or [E] → Enter Personal Farm & Stilt House',
      },
      {
        id: 'cp_south_park',
        edge: 'south',
        x: 800,
        y: 1086,
        targetType: 'village_map',
        targetMapId: 'green_park',
        targetSpawnX: 800,
        targetSpawnY: 195,
        signLabel: '↓ GREEN PARK & PIER',
        khmerLabel: 'សួនបៃតង និងស្ពានទន្លេ',
        prompt: 'Walk through South Gate or [E] → Green Park, Blessing Shrine & Fishing Pier',
      },
    ],
  },
  market_street: {
    id: 'market_street',
    name: 'Market Street',
    khmerName: 'វិថីផ្សារភូមិ',
    icon: '🏪',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 600,
    description:
      'Lantern-lit shopping boulevard housing Fashion Boutique, Blacksmith Reforge, Num Pang Cart, Village Market & Phum Club.',
    accentColor: '#ec4899',
    portals: [
      {
        id: 'ms_west_plaza',
        edge: 'west',
        x: 128,
        y: 600,
        targetType: 'village_map',
        targetMapId: 'central_plaza',
        targetSpawnX: 1405,
        targetSpawnY: 600,
        signLabel: '← CENTRAL PLAZA',
        khmerLabel: 'ទីលានកណ្តាល',
        prompt: 'Walk through West Gate or [E] → Return to Central Plaza',
      },
      {
        id: 'ms_east_frontier',
        edge: 'east',
        x: 1472,
        y: 600,
        targetType: 'village_map',
        targetMapId: 'wild_frontier',
        targetSpawnX: 190,
        targetSpawnY: 600,
        signLabel: '→ WILD FRONTIER',
        khmerLabel: 'ព្រៃភ្នំធម្មជាតិ',
        prompt: 'Walk through Frontier Arch or [E] → Wild Frontier (Herbs, Laterite & Mini-Boss)',
      },
    ],
  },
  temple_district: {
    id: 'temple_district',
    name: 'Temple District',
    khmerName: 'សង្កាត់ប្រាសាទ',
    icon: '🛕',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 680,
    description:
      'Sacred hilltop sanctuary with Ancient Pagoda Offering Altars, Angkor Dungeon Portal & the 3-Archway Boss Portal Hall.',
    accentColor: '#a855f7',
    portals: [
      {
        id: 'td_south_plaza',
        edge: 'south',
        x: 800,
        y: 1086,
        targetType: 'village_map',
        targetMapId: 'central_plaza',
        targetSpawnX: 800,
        targetSpawnY: 205,
        signLabel: '↓ CENTRAL PLAZA',
        khmerLabel: 'ទីលានកណ្តាល',
        prompt: 'Walk through South Temple Gate or [E] → Return to Central Plaza',
      },
    ],
  },
  green_park: {
    id: 'green_park',
    name: 'Green Park & Pier',
    khmerName: 'សួនបៃតង និងស្ពានទន្លេ',
    icon: '🌴',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 560,
    description:
      'Breezy riverside park with Golden Blessing Shrine, Duck Pond, Riverside Fishing Pier, Biome Pylon Shrine & Palm Groves.',
    accentColor: '#10b981',
    portals: [
      {
        id: 'gp_north_plaza',
        edge: 'north',
        x: 800,
        y: 132,
        targetType: 'village_map',
        targetMapId: 'central_plaza',
        targetSpawnX: 800,
        targetSpawnY: 1010,
        signLabel: '↑ CENTRAL PLAZA',
        khmerLabel: 'ទីលានកណ្តាល',
        prompt: 'Walk through North Park Gate or [E] → Return to Central Plaza',
      },
    ],
  },
  wild_frontier: {
    id: 'wild_frontier',
    name: 'Wild Frontier',
    khmerName: 'ព្រៃភ្នំធម្មជាតិ',
    icon: '⚔️',
    width: 1600,
    height: 1200,
    defaultSpawnX: 420,
    defaultSpawnY: 600,
    description:
      'Untamed Khmer wilds with forageable herbs, Laterite ore, Shimmer Spring, Mini-Boss & 3 Adventure Zone Gateways!',
    accentColor: '#ef4444',
    portals: [
      {
        id: 'wf_west_market',
        edge: 'west',
        x: 128,
        y: 600,
        targetType: 'village_map',
        targetMapId: 'market_street',
        targetSpawnX: 1405,
        targetSpawnY: 600,
        signLabel: '← MARKET STREET',
        khmerLabel: 'វិថីផ្សារភូមិ',
        prompt: 'Walk through West Frontier Gate or [E] → Return to Market Street',
      },
      {
        id: 'wf_north_quarry',
        edge: 'north',
        x: 800,
        y: 132,
        targetType: 'village_map',
        targetMapId: 'mining_quarry',
        targetSpawnX: 800,
        targetSpawnY: 1010,
        signLabel: '↑ LATERITE QUARRY',
        khmerLabel: 'អណ្តូងរ៉ែថ្មបាយក្រៀម',
        prompt: 'Walk through Quarry Gate or [E] → Laterite Quarry (Copper, Iron, Laterite & Jade Veins)',
      },
      {
        id: 'wf_east_bamboo',
        edge: 'east',
        x: 1472,
        y: 600,
        targetType: 'village_map',
        targetMapId: 'bamboo_forest',
        targetSpawnX: 195,
        targetSpawnY: 600,
        signLabel: '→ MISTY BAMBOO FOREST',
        khmerLabel: 'ព្រៃឫស្សីអ័ព្ទ',
        prompt: 'Walk through Bamboo Gate or [E] → Misty Bamboo Forest (Rare Herbs, Ancient Wood & Spirits)',
      },
      {
        id: 'wf_south_ruins',
        edge: 'south',
        x: 800,
        y: 1086,
        targetType: 'village_map',
        targetMapId: 'sunken_ruins',
        targetSpawnX: 800,
        targetSpawnY: 195,
        signLabel: '↓ SUNKEN ANGKOR RUINS',
        khmerLabel: 'ប្រាសាទលិចទឹកអង្គរ',
        prompt: 'Walk through Sunken Gate or [E] → Sunken Angkor Ruins (Mythic Ore, Relic Chests & Guardians)',
      },
    ],
  },
  mining_quarry: {
    id: 'mining_quarry',
    name: 'Laterite Quarry',
    khmerName: 'អណ្តូងរ៉ែថ្មបាយក្រៀម',
    icon: '⛏️',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 980,
    description:
      'Terraced red-laterite excavation rich with Copper, Iron, Laterite & rare Imperial Jade veins.',
    accentColor: '#ea580c',
    portals: [
      {
        id: 'mq_south_frontier',
        edge: 'south',
        x: 800,
        y: 1086,
        targetType: 'village_map',
        targetMapId: 'wild_frontier',
        targetSpawnX: 800,
        targetSpawnY: 205,
        signLabel: '↓ WILD FRONTIER',
        khmerLabel: 'ព្រៃភ្នំធម្មជាតិ',
        prompt: 'Walk through South Quarry Gate or [E] → Return to Wild Frontier',
      },
    ],
  },
  bamboo_forest: {
    id: 'bamboo_forest',
    name: 'Misty Bamboo Forest',
    khmerName: 'ព្រៃឫស្សីអ័ព្ទ',
    icon: '🎋',
    width: 1600,
    height: 1200,
    defaultSpawnX: 220,
    defaultSpawnY: 600,
    description:
      'Emerald mist-shrouded bamboo grove teeming with Rare Herbs, Ancient Bamboo Wood & wandering forest spirits.',
    accentColor: '#10b981',
    portals: [
      {
        id: 'bf_west_frontier',
        edge: 'west',
        x: 128,
        y: 600,
        targetType: 'village_map',
        targetMapId: 'wild_frontier',
        targetSpawnX: 1395,
        targetSpawnY: 600,
        signLabel: '← WILD FRONTIER',
        khmerLabel: 'ព្រៃភ្នំធម្មជាតិ',
        prompt: 'Walk through West Bamboo Gate or [E] → Return to Wild Frontier',
      },
    ],
  },
  sunken_ruins: {
    id: 'sunken_ruins',
    name: 'Sunken Angkor Ruins',
    khmerName: 'ប្រាសាទលិចទឹកអង្គរ',
    icon: '🏺',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 220,
    description:
      'Flooded ancient sandstone sanctum holding Mythic Angkor Gold veins, Relic Chests & elite temple guardians.',
    accentColor: '#06b6d4',
    portals: [
      {
        id: 'sr_north_frontier',
        edge: 'north',
        x: 800,
        y: 132,
        targetType: 'village_map',
        targetMapId: 'wild_frontier',
        targetSpawnX: 800,
        targetSpawnY: 1005,
        signLabel: '↑ WILD FRONTIER',
        khmerLabel: 'ព្រៃភ្នំធម្មជាតិ',
        prompt: 'Walk through North Sunken Gate or [E] → Return to Wild Frontier',
      },
    ],
  },
  koh_rong_island: {
    id: 'koh_rong_island',
    name: 'Koh Rong Mythic Island',
    khmerName: 'កោះរ៉ុងទេពសមុទ្រ',
    icon: '🏝️',
    width: 1600,
    height: 1200,
    defaultSpawnX: 800,
    defaultSpawnY: 360,
    description:
      'Turquoise tropical island paradise with white sand beach, lounge chairs, Beach Coconut Bar, Deep-Sea Fishing Pier & Coral Reef Pearl Diving!',
    accentColor: '#06b6d4',
    portals: [],
  },
};

export const VILLAGE_MAP_LIST: VillageMapDef[] = Object.values(VILLAGE_MAPS);

export function getVillageMapOrDefault(mapId?: string | null): VillageMapDef {
  if (mapId && mapId in VILLAGE_MAPS) {
    return VILLAGE_MAPS[mapId as VillageMapId];
  }
  return VILLAGE_MAPS.central_plaza;
}

export type CityDistrictId =
  | 'downtown_plaza'
  | 'market_street'
  | 'green_park_shrine'
  | 'personal_farm'
  | 'fishing_pier'
  | 'the_club'
  | 'ancient_pagoda'
  | 'wild_frontier'
  | 'mining_quarry'
  | 'bamboo_forest'
  | 'sunken_ruins'
  | 'koh_rong_island';

export interface CityDistrictNode {
  id: CityDistrictId;
  name: string;
  khmerName: string;
  icon: string;
  mapX: number; // 0..100%
  mapY: number; // 0..100%
  targetZone: 'overworld' | 'farm' | 'club';
  mapId?: VillageMapId;
  spawnX?: number;
  spawnY?: number;
  description: string;
}

export const CITY_DISTRICTS: CityDistrictNode[] = [
  {
    id: 'downtown_plaza',
    name: 'Central Plaza',
    khmerName: 'ទីលានកណ្តាល',
    icon: '🏛️',
    mapX: 46,
    mapY: 48,
    targetZone: 'overworld',
    mapId: 'central_plaza',
    spawnX: 800,
    spawnY: 660,
    description: 'Spacious central campfire courtyard, AREA 0 sign, Express Bus Stop, ATM Vault & Lucky Wheel.',
  },
  {
    id: 'market_street',
    name: 'Market Street',
    khmerName: 'វិថីផ្សារភូមិ',
    icon: '🏪',
    mapX: 60,
    mapY: 48,
    targetZone: 'overworld',
    mapId: 'market_street',
    spawnX: 800,
    spawnY: 600,
    description: 'Fashion Boutique, Blacksmith Reforge, Num Pang Cart, Village Market (5% Tax) & Club Avenue.',
  },
  {
    id: 'ancient_pagoda',
    name: 'Temple District',
    khmerName: 'សង្កាត់ប្រាសាទ',
    icon: '🛕',
    mapX: 46,
    mapY: 32,
    targetZone: 'overworld',
    mapId: 'temple_district',
    spawnX: 800,
    spawnY: 680,
    description: 'Ancient Pagoda (6 Offering Altars), Angkor Dungeon Portal & 3-Archway Boss Portal Hall.',
  },
  {
    id: 'green_park_shrine',
    name: 'Green Park & Pier',
    khmerName: 'សួនបៃតង និងស្ពានទន្លេ',
    icon: '⛩️',
    mapX: 46,
    mapY: 64,
    targetZone: 'overworld',
    mapId: 'green_park',
    spawnX: 800,
    spawnY: 560,
    description: 'Golden Blessing Shrine (+250c & +10% Luck), Duck Pond, Fishing Pier & Biome Pylon Shrine.',
  },
  {
    id: 'wild_frontier',
    name: 'Wild Frontier',
    khmerName: 'ព្រៃភ្នំធម្មជាតិ',
    icon: '⚔️',
    mapX: 74,
    mapY: 48,
    targetZone: 'overworld',
    mapId: 'wild_frontier',
    spawnX: 420,
    spawnY: 600,
    description: 'Forageable Khmer herbs, mineable Laterite rocks, hidden Apsara Shimmer Spring & 3 Adventure Zone Gates!',
  },
  {
    id: 'mining_quarry',
    name: 'Laterite Quarry',
    khmerName: 'អណ្តូងរ៉ែថ្មបាយក្រៀម',
    icon: '⛏️',
    mapX: 74,
    mapY: 30,
    targetZone: 'overworld',
    mapId: 'mining_quarry',
    spawnX: 800,
    spawnY: 980,
    description: 'North of Wild Frontier — rich Copper, Iron, Laterite & rare Imperial Jade veins!',
  },
  {
    id: 'bamboo_forest',
    name: 'Misty Bamboo Forest',
    khmerName: 'ព្រៃឫស្សីអ័ព្ទ',
    icon: '🎋',
    mapX: 88,
    mapY: 48,
    targetZone: 'overworld',
    mapId: 'bamboo_forest',
    spawnX: 220,
    spawnY: 600,
    description: 'East of Wild Frontier — rare Khmer herbs, Ancient Wood & wandering Forest Spirits!',
  },
  {
    id: 'sunken_ruins',
    name: 'Sunken Angkor Ruins',
    khmerName: 'ប្រាសាទលិចទឹកអង្គរ',
    icon: '🏺',
    mapX: 74,
    mapY: 68,
    targetZone: 'overworld',
    mapId: 'sunken_ruins',
    spawnX: 800,
    spawnY: 220,
    description: 'South of Wild Frontier — Mythic Angkor Gold ore, Relic Chests & elite temple guardians!',
  },
  {
    id: 'personal_farm',
    name: 'Personal Farm',
    khmerName: 'ចម្ការផ្ទាល់ខ្លួន',
    icon: '🌱',
    mapX: 32,
    mapY: 48,
    targetZone: 'farm',
    description: 'Your 6×4 Crop Garden, Fruit Tree Orchard, Livestock Pen & Artisan Machines.',
  },
  {
    id: 'fishing_pier',
    name: 'Riverside Pier',
    khmerName: 'ស្ពានស្ទូចត្រីទន្លេ',
    icon: '🎣',
    mapX: 35,
    mapY: 64,
    targetZone: 'overworld',
    mapId: 'green_park',
    spawnX: 520,
    spawnY: 790,
    description: 'Green Park Mekong Pier — catch Catfish, Silver Carp & Golden Lotus Koi.',
  },
  {
    id: 'the_club',
    name: 'The Club',
    khmerName: 'ក្លឹបកម្សាន្តភូមិ',
    icon: '🃏',
    mapX: 62,
    mapY: 60,
    targetZone: 'club',
    description: 'Indoor neon lounge with Tien Len & Ouk Chaktrang tables!',
  },
  {
    id: 'koh_rong_island',
    name: 'Koh Rong Island',
    khmerName: 'កោះរ៉ុងទេពសមុទ្រ',
    icon: '🏝️',
    mapX: 46,
    mapY: 82,
    targetZone: 'overworld',
    mapId: 'koh_rong_island',
    spawnX: 800,
    spawnY: 360,
    description: 'Tropical beach hangout, Beach Coconut Bar, Deep-Sea Fishing Pier & Coral Reef Pearl Diving!',
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
