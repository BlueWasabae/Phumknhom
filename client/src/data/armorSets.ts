import type { ItemRarity, PlayerState } from '@shared/types';
import { countItemInInventory } from '@shared/accessoryFusions';

export interface CombatArmorSetDef {
  id: string;
  name: string;
  khmerName: string;
  rarity: ItemRarity;
  sourceLabel: string;
  primaryColor: string;
  accentColor: string;
  pantsColor: string;
  stylishScore: number;
  baseDefense: number;
  baseMaxHp: number;
  setBonusTitle: string;
  setBonusDescription: string;
  craftCoins: number;
  materials: Array<{ itemId: string; label: string; qty: number }>;
  bossDropFrom?: 'yeak_thmor' | 'neak_reach';
}

export const COMBAT_ARMOR_SETS: Record<string, CombatArmorSetDef> = {
  armor_laterite_miner: {
    id: 'armor_laterite_miner',
    name: 'Laterite Miner Set',
    khmerName: 'ឈុតអណ្តូងរ៉ែថ្មបាយក្រៀម',
    rarity: 'rare',
    sourceLabel: 'Crafted from Cavern Ores',
    primaryColor: '#b45309',
    accentColor: '#fbbf24',
    pantsColor: '#57534e',
    stylishScore: 42,
    baseDefense: 8,
    baseMaxHp: 15,
    setBonusTitle: 'Deep Vein Resonance',
    setBonusDescription: '+25% Mining Speed (shatters ore veins in 2 hits!) & +15 Bonus Max HP.',
    craftCoins: 630,
    materials: [
      { itemId: 'ore_laterite', label: 'Laterite Ore', qty: 6 },
      { itemId: 'ore_jade_crystal', label: 'Jade Crystal', qty: 3 },
    ],
  },
  armor_yeak_thmor_stone: {
    id: 'armor_yeak_thmor_stone',
    name: 'Yeak Thmor Stone Set',
    khmerName: 'ឈុតថ្មយក្ស',
    rarity: 'epic',
    sourceLabel: 'Boss #5 (Yeak Thmor) Drop / Forge',
    primaryColor: '#57534e',
    accentColor: '#f59e0b',
    pantsColor: '#292524',
    stylishScore: 68,
    baseDefense: 12,
    baseMaxHp: 25,
    setBonusTitle: 'Yaksha Seismic Plate',
    setBonusDescription: '+12 Bonus Defense & Ground-Slam Shockwave on hard landings in Caverns & Boss Fights.',
    craftCoins: 1680,
    materials: [
      { itemId: 'ore_laterite', label: 'Laterite Ore', qty: 6 },
      { itemId: 'ore_angkor_gold', label: 'Angkor Gold', qty: 3 },
    ],
    bossDropFrom: 'yeak_thmor',
  },
  armor_naga_scale: {
    id: 'armor_naga_scale',
    name: 'Naga Scale Set',
    khmerName: 'ឈុតស្រកានាគរាជ',
    rarity: 'legendary',
    sourceLabel: 'Boss #6 (Neak Reach) Drop / Forge',
    primaryColor: '#0f766e',
    accentColor: '#38bdf8',
    pantsColor: '#312e81',
    stylishScore: 96,
    baseDefense: 14,
    baseMaxHp: 30,
    setBonusTitle: 'Mekong Naga Aegis',
    setBonusDescription: '+15% All Damage & Orbiting Water Shield that blocks 1 hit every 20s!',
    craftCoins: 2520,
    materials: [
      { itemId: 'ore_jade_crystal', label: 'Jade Crystal', qty: 6 },
      { itemId: 'ore_angkor_gold', label: 'Angkor Gold', qty: 5 },
    ],
    bossDropFrom: 'neak_reach',
  },
};

export const COMBAT_ARMOR_SET_LIST: CombatArmorSetDef[] = Object.values(COMBAT_ARMOR_SETS);

export function craftCombatArmorSet(
  state: PlayerState,
  armorId: string
): { state: PlayerState; ok: boolean; message: string } {
  const def = COMBAT_ARMOR_SETS[armorId];
  if (!def) {
    return { state, ok: false, message: 'Unknown combat armor set.' };
  }
  if (state.inventory.some((i) => i.itemId === def.id && i.quantity > 0)) {
    return { state, ok: false, message: `You already own ${def.name}! Equip it in Inventory → Wearing.` };
  }
  if (state.currencies.coins < def.craftCoins) {
    return {
      state,
      ok: false,
      message: `Need ${def.craftCoins.toLocaleString()} Coins to forge ${def.name}.`,
    };
  }
  for (const mat of def.materials) {
    const have = countItemInInventory(state, mat.itemId);
    if (have < mat.qty) {
      return {
        state,
        ok: false,
        message: `Need ${mat.qty}× ${mat.label} (Have ${have}). Mine Cavern Ores or challenge Bosses!`,
      };
    }
  }

  let nextInv = [...state.inventory];
  for (const mat of def.materials) {
    let rem = mat.qty;
    const filtered: PlayerState['inventory'] = [];
    for (const entry of nextInv) {
      if (entry.itemId === mat.itemId && rem > 0) {
        const take = Math.min(entry.quantity, rem);
        rem -= take;
        if (entry.quantity - take > 0) {
          filtered.push({ ...entry, quantity: entry.quantity - take });
        }
      } else {
        filtered.push(entry);
      }
    }
    nextInv = filtered;
  }

  nextInv.push({ itemId: def.id, quantity: 1, itemLevel: 6 });
  const nextCoins = state.currencies.coins - def.craftCoins;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: {
        ...state.currencies,
        coins: nextCoins,
      },
      inventory: nextInv,
    },
    ok: true,
    message: `🛡️ Forged ${def.name}! Equip in Combat Armor slot (Vanity keeps your fashion look!).`,
  };
}
