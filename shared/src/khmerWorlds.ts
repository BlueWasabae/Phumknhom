import type { BossId } from './types';
import type { BiomeId } from './worldMapData';

export type KhmerWorldId =
  | 'phum_chaktomuk'
  | 'battambang_norry'
  | 'angkor_thom_sanctuary'
  | 'tonle_sap_floating'
  | 'kampot_pepper_coast'
  | 'phnom_kulen_falls';

export type GatewayStyle = 'fence_gate' | 'stone_arch' | 'bamboo_railway' | 'pier_dock';
export type GatewayEdge = 'north' | 'south' | 'east' | 'west';

export interface WorldGatewayDef {
  id: string;
  edge: GatewayEdge;
  style: GatewayStyle;
  x: number;
  y: number;
  targetWorldId: KhmerWorldId;
  targetSpawnX: number;
  targetSpawnY: number;
  signTitle: string;
  signKhmer: string;
  promptText: string;
}

export interface KhmerWorldLandmarkDef {
  id: string;
  x: number;
  y: number;
  texture: string;
  scale: number;
  label: string;
  prompt: string;
  action:
    | 'dungeon'
    | 'fishing'
    | 'snackShop'
    | 'fashionShop'
    | 'reforge'
    | 'shimmer'
    | 'pagoda'
    | 'market'
    | 'worldMap'
    | 'blessing_heal';
  bossId?: BossId;
  shadowW?: number;
  shadowH?: number;
  bodyW?: number;
  bodyH?: number;
  joinArrowOffsetY?: number;
}

export interface KhmerWorldDef {
  id: KhmerWorldId;
  name: string;
  khmerName: string;
  culturalReference: string;
  description: string;
  icon: string;
  accentColor: string;
  biomeAttunement: BiomeId;
  mapX: number; // 0..100% on World Map
  mapY: number;
  groundTheme: 'meadow' | 'rice_paddy' | 'angkor_stone' | 'lake_water' | 'coastal_sand' | 'kulen_mountain';
  ambientTint?: number;
  hasBambooTrain?: boolean;
  hasWaterfalls?: boolean;
  hasFloatingBoats?: boolean;
  gateways: WorldGatewayDef[];
  landmarks: KhmerWorldLandmarkDef[];
}

export const KHMER_WORLDS: Record<KhmerWorldId, KhmerWorldDef> = {
  phum_chaktomuk: {
    id: 'phum_chaktomuk',
    name: 'Phum Chaktomuk',
    khmerName: 'ភូមិចតុមុខ',
    culturalReference: 'Heartland Village Hub · Four-River Crossroads',
    description:
      'Your cozy Cambodian home village with stilt houses, Num Pang cart, Fashion Boutique, Ancient Pagoda, and roads leading to every province.',
    icon: '🏡',
    accentColor: '#16a34a',
    biomeAttunement: 'emerald_rice_valley',
    mapX: 48,
    mapY: 50,
    groundTheme: 'meadow',
    gateways: [
      {
        id: 'hub_to_battambang',
        edge: 'west',
        style: 'fence_gate',
        x: 52,
        y: 372,
        targetWorldId: 'battambang_norry',
        targetSpawnX: 855,
        targetSpawnY: 372,
        signTitle: 'WEST GATE · BATTAMBANG',
        signKhmer: 'ទៅស្រុកបាត់ដំបង',
        promptText: 'Walk through Wooden Fence Gate or [E] → Srok Battambang (Bamboo Railway)',
      },
      {
        id: 'hub_to_angkor',
        edge: 'north',
        style: 'stone_arch',
        x: 480,
        y: 120,
        targetWorldId: 'angkor_thom_sanctuary',
        targetSpawnX: 480,
        targetSpawnY: 585,
        signTitle: 'NORTH ARCH · ANGKOR THOM',
        signKhmer: 'ទៅនគរអង្គរធំ',
        promptText: 'Walk through Angkor Stone Archway or [E] → Nokor Angkor Thom',
      },
      {
        id: 'hub_to_kampot',
        edge: 'east',
        style: 'fence_gate',
        x: 908,
        y: 372,
        targetWorldId: 'kampot_pepper_coast',
        targetSpawnX: 105,
        targetSpawnY: 372,
        signTitle: 'EAST GATE · KAMPOT COAST',
        signKhmer: 'ទៅឆ្នេរម្រេចកំពត',
        promptText: 'Walk through Coastal Road Gate or [E] → Chhner Kampot (Pepper Coast)',
      },
      {
        id: 'hub_to_tonlesap',
        edge: 'south',
        style: 'pier_dock',
        x: 480,
        y: 626,
        targetWorldId: 'tonle_sap_floating',
        targetSpawnX: 480,
        targetSpawnY: 145,
        signTitle: 'SOUTH PIER · TONLÉ SAP',
        signKhmer: 'ទៅទន្លេសាបកំពង់ភ្លុក',
        promptText: 'Walk onto Riverside Pier Gate or [E] → Tonlé Sap Kampong Phluk',
      },
    ],
    landmarks: [],
  },

  battambang_norry: {
    id: 'battambang_norry',
    name: 'Srok Battambang',
    khmerName: 'ស្រុកបាត់ដំបង',
    culturalReference: 'Cambodia’s Rice Bowl & Iconic Norry Bamboo Railway',
    description:
      'Sunlit golden rice paddies crossed by a single historic iron railway where the motorized Bamboo Train (Norry) zips between countryside shrines and Phnom Sampeau.',
    icon: '🚂',
    accentColor: '#eab308',
    biomeAttunement: 'emerald_rice_valley',
    mapX: 18,
    mapY: 50,
    groundTheme: 'rice_paddy',
    hasBambooTrain: true,
    gateways: [
      {
        id: 'bb_to_hub',
        edge: 'east',
        style: 'fence_gate',
        x: 908,
        y: 372,
        targetWorldId: 'phum_chaktomuk',
        targetSpawnX: 112,
        targetSpawnY: 372,
        signTitle: 'EAST FENCE · PHUM CHAKTOMUK',
        signKhmer: 'ត្រឡប់ភូមិចតុមុខ',
        promptText: 'Walk through Wooden Fence Gate or [E] → Return to Phum Chaktomuk',
      },
      {
        id: 'bb_to_kulen',
        edge: 'north',
        style: 'bamboo_railway',
        x: 480,
        y: 122,
        targetWorldId: 'phnom_kulen_falls',
        targetSpawnX: 480,
        targetSpawnY: 585,
        signTitle: 'NORTH RAILWAY · PHNOM KULEN',
        signKhmer: 'ផ្លូវដែកណូរី · ភ្នំគូលែន',
        promptText: 'Follow Bamboo Railway North or [E] → Phnom Kulen Sacred Mountain',
      },
    ],
    landmarks: [
      {
        id: 'bb_norry_station',
        x: 340,
        y: 324,
        texture: 'bus_stop_sign',
        scale: 1.25,
        label: 'NORRY BAMBOO TRAIN DEPOT',
        prompt: 'Press [E] → Board Norry Express & Open Khmer World Map [M]',
        action: 'worldMap',
        shadowW: 30,
        shadowH: 10,
        joinArrowOffsetY: -46,
      },
      {
        id: 'bb_wat_banan',
        x: 640,
        y: 255,
        texture: 'ancient_pagoda',
        scale: 1.38,
        label: 'WAT BANAN HILL SHRINE',
        prompt: 'Press [E] → Pray at Wat Banan Shrine (Full HP Heal & Pagoda Bundles)',
        action: 'pagoda',
        shadowW: 90,
        shadowH: 22,
        bodyW: 64,
        bodyH: 26,
        joinArrowOffsetY: -68,
      },
      {
        id: 'bb_sampeau_cave',
        x: 240,
        y: 245,
        texture: 'angkor_portal',
        scale: 0.64,
        label: 'PHNOM SAMPEAU BAT CAVE',
        prompt: 'Press [E] → Enter Phnom Sampeau Cavern (Sdech Kongkaeb / Arp Prey Chrov)',
        action: 'dungeon',
        bossId: 'sdech_kongkaeb',
        shadowW: 84,
        shadowH: 22,
        bodyW: 54,
        bodyH: 24,
        joinArrowOffsetY: -98,
      },
      {
        id: 'bb_rice_market',
        x: 685,
        y: 472,
        texture: 'market_board',
        scale: 1.25,
        label: 'BATTAMBANG RICE MARKET',
        prompt: 'Press [E] → Trade Harvests at Battambang Market (5% Tax)',
        action: 'market',
        shadowW: 56,
        shadowH: 16,
        bodyW: 42,
        bodyH: 18,
      },
      {
        id: 'bb_art_boutique',
        x: 280,
        y: 482,
        texture: 'fashion_boutique',
        scale: 1.32,
        label: 'HERITAGE ARTS WORKSHOP',
        prompt: 'Press [E] → Browse Khmer Fashion Sets & Hair Salon',
        action: 'fashionShop',
        shadowW: 74,
        shadowH: 20,
        bodyW: 56,
        bodyH: 26,
      },
    ],
  },

  angkor_thom_sanctuary: {
    id: 'angkor_thom_sanctuary',
    name: 'Nokor Angkor Thom',
    khmerName: 'នគរអង្គរធំ',
    culturalReference: 'South Gate Causeway, Singha Guardians & Ta Prohm Ruins',
    description:
      'Monumental sandstone causeways flanked by ancient Singha guardians, vine-draped Ta Prohm ruins, and sacred Yant shrines from King Jayavarman VII’s empire.',
    icon: '🏛️',
    accentColor: '#f59e0b',
    biomeAttunement: 'angkor_ruins',
    mapX: 48,
    mapY: 20,
    groundTheme: 'angkor_stone',
    gateways: [
      {
        id: 'angkor_to_hub',
        edge: 'south',
        style: 'stone_arch',
        x: 480,
        y: 626,
        targetWorldId: 'phum_chaktomuk',
        targetSpawnX: 480,
        targetSpawnY: 168,
        signTitle: 'SOUTH GATE · PHUM CHAKTOMUK',
        signKhmer: 'ត្រឡប់ភូមិចតុមុខ',
        promptText: 'Walk through South Gate Archway or [E] → Return to Phum Chaktomuk',
      },
      {
        id: 'angkor_to_kulen',
        edge: 'west',
        style: 'stone_arch',
        x: 54,
        y: 372,
        targetWorldId: 'phnom_kulen_falls',
        targetSpawnX: 855,
        targetSpawnY: 372,
        signTitle: 'WEST ARCH · PHNOM KULEN',
        signKhmer: 'ទៅភ្នំគូលែន',
        promptText: 'Walk through Jungle Temple Archway or [E] → Phnom Kulen Sacred Falls',
      },
    ],
    landmarks: [
      {
        id: 'angkor_taprohm_raid',
        x: 480,
        y: 222,
        texture: 'angkor_portal',
        scale: 0.72,
        label: 'TA PROHM RELIC SANCTUM',
        prompt: 'Press [E] → Challenge Yeak Thmor & Ancient Temple Bosses',
        action: 'dungeon',
        bossId: 'yeak_thmor',
        shadowW: 94,
        shadowH: 24,
        bodyW: 62,
        bodyH: 26,
        joinArrowOffsetY: -108,
      },
      {
        id: 'angkor_ancient_smithy',
        x: 690,
        y: 350,
        texture: 'blacksmith_anvil',
        scale: 1.22,
        label: 'ROYAL ANGKOR FORGE',
        prompt: 'Press [E] → Reforge Khmer Weapons & Mythic Arsenal',
        action: 'reforge',
        shadowW: 44,
        shadowH: 14,
        bodyW: 34,
        bodyH: 18,
        joinArrowOffsetY: -60,
      },
      {
        id: 'angkor_relic_sanctuary',
        x: 265,
        y: 348,
        texture: 'na_ruin_sanctuary',
        scale: 1.28,
        label: 'BAYON YANT STELE · HEAL',
        prompt: 'Press [E] → Touch Sacred Bayon Stele (Full HP Blessing)',
        action: 'blessing_heal',
        shadowW: 78,
        shadowH: 22,
        bodyW: 58,
        bodyH: 26,
      },
      {
        id: 'angkor_pylon',
        x: 690,
        y: 492,
        texture: 'pylon_shrine',
        scale: 1.3,
        label: 'ANGKOR LEYLINE PYLON',
        prompt: 'Press [E] → Open Khmer World Map & Pylon Network [M]',
        action: 'worldMap',
        shadowW: 44,
        shadowH: 14,
        bodyW: 30,
        bodyH: 16,
      },
    ],
  },

  tonle_sap_floating: {
    id: 'tonle_sap_floating',
    name: 'Tonlé Sap Kampong Phluk',
    khmerName: 'កំពង់ភ្លុកទន្លេសាប',
    culturalReference: 'Floating Stilt Village on Southeast Asia’s Great Lake',
    description:
      'Elevated timber boardwalks and Khmer stilt houses resting above turquoise Tonlé Sap waters, surrounded by bobbing wooden fishing boats and floating noodle vendors.',
    icon: '🛶',
    accentColor: '#0ea5e9',
    biomeAttunement: 'sapphire_coast',
    mapX: 48,
    mapY: 82,
    groundTheme: 'lake_water',
    hasFloatingBoats: true,
    gateways: [
      {
        id: 'ts_to_hub',
        edge: 'north',
        style: 'pier_dock',
        x: 480,
        y: 122,
        targetWorldId: 'phum_chaktomuk',
        targetSpawnX: 480,
        targetSpawnY: 575,
        signTitle: 'NORTH PIER · PHUM CHAKTOMUK',
        signKhmer: 'ត្រឡប់ភូមិចតុមុខ',
        promptText: 'Walk across North Timber Pier or [E] → Return to Phum Chaktomuk',
      },
      {
        id: 'ts_to_kampot',
        edge: 'east',
        style: 'pier_dock',
        x: 904,
        y: 372,
        targetWorldId: 'kampot_pepper_coast',
        targetSpawnX: 480,
        targetSpawnY: 575,
        signTitle: 'EAST DOCK · KAMPOT HARBOR',
        signKhmer: 'ជិះទូកទៅឆ្នេរកំពត',
        promptText: 'Board Mekong Channel Ferry Dock or [E] → Sail to Chhner Kampot',
      },
    ],
    landmarks: [
      {
        id: 'ts_fish_pier',
        x: 305,
        y: 370,
        texture: 'fishing_pier',
        scale: 1.2,
        label: 'GREAT LAKE FISHING DECK',
        prompt: 'Press [E] → Cast Line in Tonlé Sap (Catfish & Golden Koi)',
        action: 'fishing',
        shadowW: 46,
        shadowH: 14,
        joinArrowOffsetY: -62,
      },
      {
        id: 'ts_stilt_home',
        x: 280,
        y: 230,
        texture: 'khmer_stilt_house',
        scale: 0.68,
        label: 'KAMPONG PHLUK STILT HALL',
        prompt: 'Press [E] → Rest at Floating Village Hall (Full HP Heal)',
        action: 'blessing_heal',
        shadowW: 86,
        shadowH: 22,
        bodyW: 62,
        bodyH: 28,
      },
      {
        id: 'ts_noodle_boat',
        x: 670,
        y: 365,
        texture: 'num_pang_cart',
        scale: 0.56,
        label: 'FLOATING NOM BANH CHOK BOAT',
        prompt: 'Press [E] → Buy Hot Floating-Market Snacks & Drinks',
        action: 'snackShop',
        shadowW: 54,
        shadowH: 16,
        bodyW: 40,
        bodyH: 20,
        joinArrowOffsetY: -72,
      },
      {
        id: 'ts_floating_market',
        x: 660,
        y: 505,
        texture: 'market_board',
        scale: 1.25,
        label: 'FLOATING TRADE RAFT',
        prompt: 'Press [E] → Open Player Trading Market Board',
        action: 'market',
        shadowW: 54,
        shadowH: 16,
        bodyW: 42,
        bodyH: 18,
      },
    ],
  },

  kampot_pepper_coast: {
    id: 'kampot_pepper_coast',
    name: 'Chhner Kampot',
    khmerName: 'ឆ្នេរម្រេចកំពត',
    culturalReference: 'World-Famous Kampot Pepper Gardens & Kep Crab Coast',
    description:
      'Breezy southern coastline framed by tropical sugar palms, fragrant Kampot pepper spice stalls, salt-field shrines, and turquoise Kep crabbing piers.',
    icon: '🌶️',
    accentColor: '#f97316',
    biomeAttunement: 'sapphire_coast',
    mapX: 80,
    mapY: 56,
    groundTheme: 'coastal_sand',
    hasFloatingBoats: true,
    gateways: [
      {
        id: 'kp_to_hub',
        edge: 'west',
        style: 'fence_gate',
        x: 54,
        y: 372,
        targetWorldId: 'phum_chaktomuk',
        targetSpawnX: 848,
        targetSpawnY: 372,
        signTitle: 'WEST GATE · PHUM CHAKTOMUK',
        signKhmer: 'ត្រឡប់ភូមិចតុមុខ',
        promptText: 'Walk through Coastal Road Gate or [E] → Return to Phum Chaktomuk',
      },
      {
        id: 'kp_to_tonlesap',
        edge: 'south',
        style: 'pier_dock',
        x: 480,
        y: 626,
        targetWorldId: 'tonle_sap_floating',
        targetSpawnX: 842,
        targetSpawnY: 372,
        signTitle: 'SOUTH HARBOR · TONLÉ SAP',
        signKhmer: 'ទៅកំពង់ភ្លុកទន្លេសាប',
        promptText: 'Board Harbor Ferry Pier or [E] → Sail to Tonlé Sap Kampong Phluk',
      },
    ],
    landmarks: [
      {
        id: 'kp_pepper_stall',
        x: 340,
        y: 280,
        texture: 'na_coastal_stall_a',
        scale: 1.55,
        label: 'KAMPOT PEPPER SPICE MARKET',
        prompt: 'Press [E] → Buy Kampot Pepper Skewers & Street Snacks',
        action: 'snackShop',
        shadowW: 54,
        shadowH: 15,
        bodyW: 42,
        bodyH: 20,
        joinArrowOffsetY: -56,
      },
      {
        id: 'kp_crab_pier',
        x: 680,
        y: 480,
        texture: 'fishing_pier',
        scale: 1.2,
        label: 'KEP CRAB & PEARL PIER',
        prompt: 'Press [E] → Fish & Harvest Crab at Kep Seaside Pier',
        action: 'fishing',
        shadowW: 46,
        shadowH: 14,
        joinArrowOffsetY: -60,
      },
      {
        id: 'kp_salt_shrine',
        x: 650,
        y: 265,
        texture: 'golden_shrine',
        scale: 1.28,
        label: 'SALT-FIELD BLESSING SHRINE',
        prompt: 'Press [E] → Rest & Restore Full HP at Coastal Shrine',
        action: 'blessing_heal',
        shadowW: 54,
        shadowH: 15,
        bodyW: 36,
        bodyH: 16,
      },
      {
        id: 'kp_bokor_gate',
        x: 265,
        y: 485,
        texture: 'angkor_portal',
        scale: 0.62,
        label: 'BOKOR MIST CAVERN',
        prompt: 'Press [E] → Enter Bokor Coastal Boss Cavern (Neak Reach)',
        action: 'dungeon',
        bossId: 'neak_reach',
        shadowW: 82,
        shadowH: 22,
        bodyW: 54,
        bodyH: 24,
        joinArrowOffsetY: -94,
      },
    ],
  },

  phnom_kulen_falls: {
    id: 'phnom_kulen_falls',
    name: 'Phnom Kulen',
    khmerName: 'ភ្នំគូលែន · ក្បាលស្ពាន',
    culturalReference: 'Sacred Birthplace of Angkor & River of 1,000 Lingas',
    description:
      'Misty emerald mountain plateau crowned by cascading waterfalls, ancient Kbal Spean riverbed carvings, and sacred Apsara shimmer pools.',
    icon: '⛰️',
    accentColor: '#10b981',
    biomeAttunement: 'palm_jungle',
    mapX: 22,
    mapY: 20,
    groundTheme: 'kulen_mountain',
    hasWaterfalls: true,
    gateways: [
      {
        id: 'kl_to_battambang',
        edge: 'south',
        style: 'bamboo_railway',
        x: 480,
        y: 626,
        targetWorldId: 'battambang_norry',
        targetSpawnX: 480,
        targetSpawnY: 170,
        signTitle: 'SOUTH RAILWAY · BATTAMBANG',
        signKhmer: 'ផ្លូវដែកណូរី · បាត់ដំបង',
        promptText: 'Walk along Bamboo Railway South or [E] → Srok Battambang',
      },
      {
        id: 'kl_to_angkor',
        edge: 'east',
        style: 'stone_arch',
        x: 906,
        y: 372,
        targetWorldId: 'angkor_thom_sanctuary',
        targetSpawnX: 112,
        targetSpawnY: 372,
        signTitle: 'EAST ARCH · ANGKOR THOM',
        signKhmer: 'ទៅនគរអង្គរធំ',
        promptText: 'Walk through Temple Archway East or [E] → Nokor Angkor Thom',
      },
    ],
    landmarks: [
      {
        id: 'kl_kbal_spean',
        x: 480,
        y: 258,
        texture: 'na_lion_fountain',
        scale: 1.45,
        label: 'KBAL SPEAN · 1,000 LINGAS',
        prompt: 'Press [E] → Drink from Sacred River of 1,000 Lingas (Full HP Heal)',
        action: 'blessing_heal',
        shadowW: 50,
        shadowH: 15,
        bodyW: 36,
        bodyH: 20,
        joinArrowOffsetY: -68,
      },
      {
        id: 'kl_shimmer_altar',
        x: 685,
        y: 320,
        texture: 'pylon_shrine',
        scale: 1.32,
        label: 'KULEN APSARA SHIMMER POOL',
        prompt: 'Press [E] → Open Sacred Apsara Shimmer & Blessing Transmuter',
        action: 'shimmer',
        shadowW: 44,
        shadowH: 14,
        bodyW: 30,
        bodyH: 16,
        joinArrowOffsetY: -54,
      },
      {
        id: 'kl_pagoda_buddha',
        x: 270,
        y: 310,
        texture: 'ancient_pagoda',
        scale: 1.35,
        label: 'PREAH ANG THOM SANCTUARY',
        prompt: 'Press [E] → Visit Hilltop Pagoda Offering Altars',
        action: 'pagoda',
        shadowW: 88,
        shadowH: 22,
        bodyW: 62,
        bodyH: 26,
      },
      {
        id: 'kl_guardian_trial',
        x: 265,
        y: 495,
        texture: 'angkor_portal',
        scale: 0.64,
        label: 'KULEN SPIRIT TRIALS',
        prompt: 'Press [E] → Challenge Arp Prey Chrov & Mountain Bosses',
        action: 'dungeon',
        bossId: 'arp_prey_chrov',
        shadowW: 84,
        shadowH: 22,
        bodyW: 54,
        bodyH: 24,
        joinArrowOffsetY: -96,
      },
    ],
  },
};

export const KHMER_WORLD_LIST: KhmerWorldDef[] = Object.values(KHMER_WORLDS);

export function getKhmerWorldOrDefault(worldId?: string | null): KhmerWorldDef {
  if (worldId && worldId in KHMER_WORLDS) {
    return KHMER_WORLDS[worldId as KhmerWorldId];
  }
  return KHMER_WORLDS.phum_chaktomuk;
}
