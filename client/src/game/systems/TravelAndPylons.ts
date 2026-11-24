import type { BossId, DifficultyMode, PlayerState } from '@shared/types';
import { WORLD_BIOMES, type BiomeId } from '@shared/worldMapData';
import type { KhmerWorldId } from '@shared/khmerWorlds';

export interface ReturnPortalBookmark {
  bossId: BossId;
  difficulty: DifficultyMode;
  partyMode: 'solo' | 'coop';
  createdAt: number;
}

export interface TravelRequestPayload {
  method: 'bus' | 'pylon' | 'mirror' | 'return_portal';
  destinationLabel: string;
  targetZone: 'overworld' | 'farm' | 'club' | 'dungeon' | 'khmer_world';
  worldId?: KhmerWorldId;
  biomeId?: BiomeId;
  bossId?: BossId;
  difficulty?: DifficultyMode;
  spawnX?: number;
  spawnY?: number;
}

/**
 * Travel & Angkor Biome Pylon Network State Manager:
 * - Animated Green Village Bus (25s loop & Bus Stop boarding)
 * - Angkor Biome Pylons (golden teleport flash between unlocked districts & biomes)
 * - Magic Mirror (instant recall straight back to Personal Farm / Home)
 * - Return Portal (bookmark Dungeon boss arena -> visit Village -> jump straight back)
 */
class TravelAndPylonsManager {
  private activeReturnPortal: ReturnPortalBookmark | null = null;
  private listeners = new Set<(portal: ReturnPortalBookmark | null) => void>();

  public getReturnPortal(): ReturnPortalBookmark | null {
    return this.activeReturnPortal ? { ...this.activeReturnPortal } : null;
  }

  public setReturnPortal(bookmark: ReturnPortalBookmark | null): void {
    this.activeReturnPortal = bookmark;
    const snap = this.getReturnPortal();
    this.listeners.forEach((fn) => fn(snap));
  }

  public subscribeReturnPortal(fn: (portal: ReturnPortalBookmark | null) => void): () => void {
    this.listeners.add(fn);
    fn(this.getReturnPortal());
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const travelManager = new TravelAndPylonsManager();

export function unlockBiomeAndPylon(
  state: PlayerState,
  biomeId: BiomeId
): { state: PlayerState; ok: boolean; message: string } {
  const biome = WORLD_BIOMES[biomeId];
  if (!biome) return { state, ok: false, message: 'Unknown biome.' };

  const discovered = new Set(state.discoveredBiomes ?? ['emerald_rice_valley']);
  const pylons = new Set(state.unlockedPylons ?? ['emerald_rice_valley']);
  if (discovered.has(biomeId) && pylons.has(biomeId)) {
    return { state, ok: false, message: `${biome.pylonName} is already unlocked!` };
  }

  if (state.currencies.coins < biome.unlockCostCoins) {
    return {
      state,
      ok: false,
      message: `Need ${biome.unlockCostCoins.toLocaleString()} Coins to clear Fog-of-War & activate ${biome.pylonName}.`,
    };
  }

  discovered.add(biomeId);
  pylons.add(biomeId);
  const nextCoins = state.currencies.coins - biome.unlockCostCoins;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      activeBiome: biomeId,
      discoveredBiomes: Array.from(discovered),
      unlockedPylons: Array.from(pylons),
    },
    ok: true,
    message: `🗺️ Fog-of-War cleared! Activated Angkor ${biome.pylonName}!`,
  };
}

export function payBusFare(
  state: PlayerState,
  fareCoins: number,
  biomeId?: BiomeId
): { state: PlayerState; ok: boolean; message: string } {
  if (fareCoins > 0 && state.currencies.coins < fareCoins) {
    return { state, ok: false, message: `Need ${fareCoins} Coins for the Green Village Bus fare.` };
  }
  const nextCoins = state.currencies.coins - fareCoins;
  const discovered = new Set(state.discoveredBiomes ?? ['emerald_rice_valley']);
  if (biomeId) discovered.add(biomeId);

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      activeBiome: biomeId ?? state.activeBiome ?? 'emerald_rice_valley',
      discoveredBiomes: Array.from(discovered),
    },
    ok: true,
    message:
      fareCoins > 0 ? `🚌 Boarded Green Village Bus (-${fareCoins}c)!` : '🚌 Boarded Free Village Shuttle!',
  };
}
