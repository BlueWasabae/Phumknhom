import type { PlayerState } from './types';

export type KhlengEkKiteId =
  | 'kite_classic_bamboo'
  | 'kite_golden_naga'
  | 'kite_celestial_phoenix';

export interface KhlengEkKiteDef {
  id: KhlengEkKiteId;
  name: string;
  khmerName: string;
  icon: string;
  rarity: 'common' | 'epic' | 'legendary';
  costCoins?: number;
  costDiamonds?: number;
  primaryColor: string;
  accentColor: string;
  liftBonus: number;
  scoreMult: number;
  description: string;
}

export const KHLENG_EK_KITES: Record<KhlengEkKiteId, KhlengEkKiteDef> = {
  kite_classic_bamboo: {
    id: 'kite_classic_bamboo',
    name: 'Traditional Khleng Ek',
    khmerName: 'ខ្លែងឯកឫស្សីប្រពៃណី',
    icon: '🪁',
    rarity: 'common',
    costCoins: 250,
    primaryColor: '#f59e0b',
    accentColor: '#dc2626',
    liftBonus: 1.0,
    scoreMult: 1.0,
    description: 'Hand-crafted bamboo & woven Khmer silk singing kite with resonant bamboo reed hummer.',
  },
  kite_golden_naga: {
    id: 'kite_golden_naga',
    name: 'Golden Naga Kite',
    khmerName: 'ខ្លែងនាគមាសទេវតា',
    icon: '🐉',
    rarity: 'epic',
    costDiamonds: 25,
    primaryColor: '#10b981',
    accentColor: '#facc15',
    liftBonus: 1.12,
    scoreMult: 1.25,
    description: 'Prestige animated emerald-and-gold Naga streamer kite that ripples through sunset thermals (+25% Wind Ring bonus)!',
  },
  kite_celestial_phoenix: {
    id: 'kite_celestial_phoenix',
    name: 'Celestial Phoenix Kite',
    khmerName: 'ខ្លែងគ្រុឌភ្លើងសួគ៌',
    icon: '🦅',
    rarity: 'legendary',
    costDiamonds: 40,
    primaryColor: '#f97316',
    accentColor: '#fef08a',
    liftBonus: 1.2,
    scoreMult: 1.4,
    description: 'Radiant gilded Garuda-Phoenix silk kite trailing solar embers across Phnom Kulen skies (+40% Wind Ring bonus)!',
  },
};

export const KHLENG_EK_KITE_LIST: KhlengEkKiteDef[] = Object.values(KHLENG_EK_KITES);

export type PartyKitId = 'party_lantern_kit' | 'party_angkor_fireworks';

export interface PartyKitDef {
  id: PartyKitId;
  name: string;
  khmerName: string;
  icon: string;
  costCoins?: number;
  costDiamonds?: number;
  fireworkShells: number;
  feastDurationMs: number;
  palette: number[];
  description: string;
}

export const VILLAGE_PARTY_KITS: Record<PartyKitId, PartyKitDef> = {
  party_lantern_kit: {
    id: 'party_lantern_kit',
    name: 'Village Lantern Party Kit',
    khmerName: 'ឈុតពិធីជប់លៀងគោមភូមិ',
    icon: '🏮',
    costCoins: 500,
    fireworkShells: 8,
    feastDurationMs: 5 * 60_000,
    palette: [0xfacc15, 0xf97316, 0x34d399],
    description: 'Spawns a 5-min Shared Feast Table (+15% Speed & +15% Luck snacks) + 8 blooming golden village fireworks!',
  },
  party_angkor_fireworks: {
    id: 'party_angkor_fireworks',
    name: 'Angkor Grand Firework Show',
    khmerName: 'ពិធីបាញ់កាំជ្រួចមហាអង្គរ',
    icon: '🎆',
    costDiamonds: 35,
    fireworkShells: 20,
    feastDurationMs: 5 * 60_000,
    palette: [0xfacc15, 0x10b981, 0xf43f5e, 0x38bdf8, 0xc084fc],
    description: 'Launches 20 synchronized blooming golden, emerald & crimson fireworks across the sky + Royal Feast Table for all guests!',
  },
};

export const VILLAGE_PARTY_KIT_LIST: PartyKitDef[] = Object.values(VILLAGE_PARTY_KITS);

export const PARTY_ALLOWED_MAPS = new Set<string>([
  'central_plaza',
  'koh_rong_island',
  'phnom_kulen',
  'farm',
]);

export function craftOrUnlockKite(
  state: PlayerState,
  kiteId: KhlengEkKiteId
): { state: PlayerState; ok: boolean; message: string } {
  const def = KHLENG_EK_KITES[kiteId];
  if (!def) return { state, ok: false, message: 'Unknown kite.' };
  const owned = new Set(state.ownedKites ?? []);
  if (owned.has(kiteId)) {
    return {
      state: { ...state, activeKiteId: kiteId },
      ok: true,
      message: `🪁 Equipped ${def.name} for your next flight!`,
    };
  }
  if (def.costCoins) {
    if (state.currencies.coins < def.costCoins) {
      return { state, ok: false, message: `Need ${def.costCoins.toLocaleString()} Coins to craft ${def.name}.` };
    }
    const nextCoins = state.currencies.coins - def.costCoins;
    owned.add(kiteId);
    return {
      state: {
        ...state,
        coins: nextCoins,
        currencies: { ...state.currencies, coins: nextCoins },
        ownedKites: Array.from(owned),
        activeKiteId: kiteId,
      },
      ok: true,
      message: `🪁 Crafted ${def.name} (${def.khmerName})! Ready to launch into the sunset sky!`,
    };
  }
  if (def.costDiamonds) {
    if (state.currencies.diamonds < def.costDiamonds) {
      return { state, ok: false, message: `Need ${def.costDiamonds} 💎 Diamonds to unlock ${def.name}.` };
    }
    const nextDiamonds = state.currencies.diamonds - def.costDiamonds;
    owned.add(kiteId);
    return {
      state: {
        ...state,
        currencies: { ...state.currencies, diamonds: nextDiamonds },
        ownedKites: Array.from(owned),
        activeKiteId: kiteId,
      },
      ok: true,
      message: `✨ Unlocked prestige ${def.name}! Equipped for sunset flights!`,
    };
  }
  return { state, ok: false, message: 'Cannot unlock kite.' };
}
