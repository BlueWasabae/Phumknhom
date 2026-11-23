import type { BossId, DifficultyMode, PlayerState } from '@shared/types';
import { WORLD_BIOMES, type BiomeId } from '@shared/worldMapData';

export interface ReturnPortalBookmark {
  bossId: BossId;
  difficulty: DifficultyMode;
  partyMode: 'solo' | 'coop';
  createdAt: number;
}

export interface TravelRequestPayload {
  method: 'bus' | 'pylon' | 'mirror' | 'return_portal';
  destinationLabel: string;
  targetZone: 'overworld' | 'farm' | 'club' | 'dungeon';
  biomeId?: BiomeId;
  bossId?: BossId;
  difficulty?: DifficultyMode;
}

/**
 * Travel & Pylon Network State Manager for ភូមិខ្ញុំ (Phum Khnhom):
 * - Animated Village Bus (board at Plaza Bus Stop -> arrive at District/Biome)
 * - Biome Pylon Teleport Network (instant free warp between unlocked Pylons)
 * - Magic Mirror (instant recall home to Central Plaza)
 * - Return Portal (bookmark Dungeon boss fight -> visit Village -> warp straight back!)
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

  const discovered = new Set(state.discoveredBiomes ?? ['phum_plaza', 'emerald_rice_valley']);
  const pylons = new Set(state.unlockedPylons ?? ['phum_plaza', 'emerald_rice_valley']);
  if (discovered.has(biomeId) && pylons.has(biomeId)) {
    return { state, ok: false, message: `${biome.pylonName} is already unlocked!` };
  }

  if (state.currencies.coins < biome.unlockCostCoins) {
    return {
      state,
      ok: false,
      message: `Need ${biome.unlockCostCoins.toLocaleString()} Coins to scout ${biome.name} & activate its Pylon.`,
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
    message: `🗺️ Cleared Fog-of-War & Activated ${biome.pylonName}!`,
  };
}

export function payBusFare(
  state: PlayerState,
  fareCoins: number,
  biomeId?: BiomeId
): { state: PlayerState; ok: boolean; message: string } {
  if (fareCoins > 0 && state.currencies.coins < fareCoins) {
    return { state, ok: false, message: `Need ${fareCoins} Coins for the Village Bus fare.` };
  }
  const nextCoins = state.currencies.coins - fareCoins;
  const discovered = new Set(state.discoveredBiomes ?? ['phum_plaza', 'emerald_rice_valley']);
  if (biomeId) discovered.add(biomeId);

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      activeBiome: biomeId ?? state.activeBiome ?? 'phum_plaza',
      discoveredBiomes: Array.from(discovered),
    },
    ok: true,
    message: fareCoins > 0 ? `🚌 Boarded Village Express Bus (-${fareCoins}c)!` : '🚌 Boarded Free Village Shuttle!',
  };
}
