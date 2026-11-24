import type { ActiveTreasureMap } from './types';
import type { VillageMapId } from './worldMapData';

export interface TreasureMapSpotDef {
  id: string;
  mapId: VillageMapId;
  mapName: string;
  clueTitle: string;
  clueDescription: string;
  x: number;
  y: number;
  /** Normalized 0..1 coordinates for rendering the pulsing red X on the parchment map */
  parchmentPctX: number;
  parchmentPctY: number;
}

/**
 * Update 1.6 — Torn Angkor Treasure Map Dig Spots across all 5 Village & Frontier Maps.
 * All coordinates are verified open walkable ground clear of building colliders.
 */
export const TREASURE_MAP_SPOTS: TreasureMapSpotDef[] = [
  {
    id: 'spot_plaza_se_palm',
    mapId: 'central_plaza',
    mapName: 'Central Plaza',
    clueTitle: 'Central Plaza — Beneath the Southeast Palm Lantern',
    clueDescription:
      'Walk southeast of the Central Courtyard campfire toward the glowing stone lantern beneath the towering sugar palms.',
    x: 1020,
    y: 780,
    parchmentPctX: 0.64,
    parchmentPctY: 0.65,
  },
  {
    id: 'spot_market_silk_lane',
    mapId: 'market_street',
    mapName: 'Market Street',
    clueTitle: 'Market Street — Behind the Eastern Silk Banners',
    clueDescription:
      'Follow the lantern-lit boulevard past the Blacksmith and Village Market toward the quiet cobblestone clearing in the southeast.',
    x: 1185,
    y: 840,
    parchmentPctX: 0.74,
    parchmentPctY: 0.7,
  },
  {
    id: 'spot_temple_east_steps',
    mapId: 'temple_district',
    mapName: 'Temple District',
    clueTitle: 'Temple District — East of the Ancient Offering Steps',
    clueDescription:
      'Ascend into the sacred Temple District and search the mossy flagstones east of the Angkor Dungeon archway.',
    x: 1140,
    y: 785,
    parchmentPctX: 0.71,
    parchmentPctY: 0.65,
  },
  {
    id: 'spot_park_golden_shrine',
    mapId: 'green_park',
    mapName: 'Green Park & Pier',
    clueTitle: 'Green Park — Beside the Golden Shrine',
    clueDescription:
      'Stroll south into Green Park & Pier and search the sunlit grass terrace just beside the Golden Blessing Shrine.',
    x: 1090,
    y: 475,
    parchmentPctX: 0.68,
    parchmentPctY: 0.4,
  },
  {
    id: 'spot_frontier_laterite_rocks',
    mapId: 'wild_frontier',
    mapName: 'Wild Frontier',
    clueTitle: 'Wild Frontier — Near the Eastern Laterite Rocks',
    clueDescription:
      'Venture past Market Street into the untamed Wild Frontier and dig near the reddish laterite outcrops along the eastern ridge.',
    x: 1215,
    y: 715,
    parchmentPctX: 0.76,
    parchmentPctY: 0.6,
  },
];

export function getTreasureSpotById(spotId?: string | null): TreasureMapSpotDef | undefined {
  if (!spotId) return undefined;
  return TREASURE_MAP_SPOTS.find((s) => s.id === spotId);
}

export function createStarterTreasureMap(): ActiveTreasureMap {
  const spot = TREASURE_MAP_SPOTS[0]; // Central Plaza — Beneath the Southeast Palm Lantern
  return {
    spotId: spot.id,
    mapId: spot.mapId,
    clueTitle: spot.clueTitle,
    clueDescription: spot.clueDescription,
    x: spot.x,
    y: spot.y,
    discoveredAt: Date.now(),
  };
}

export function rollRandomTreasureMap(excludeSpotId?: string): ActiveTreasureMap {
  const pool = TREASURE_MAP_SPOTS.filter((s) => s.id !== excludeSpotId);
  const picked = pool[Math.floor(Math.random() * pool.length)] ?? TREASURE_MAP_SPOTS[0];
  return {
    spotId: picked.id,
    mapId: picked.mapId,
    clueTitle: picked.clueTitle,
    clueDescription: picked.clueDescription,
    x: picked.x,
    y: picked.y,
    discoveredAt: Date.now(),
  };
}
