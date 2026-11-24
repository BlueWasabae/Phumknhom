import type {
  ActiveSnackBuff,
  InventoryItem,
  ItemRarity,
  PlayerState,
  QualityTier,
} from '@shared/types';
import { computeVillageToDungeonBridge, hasTalent } from '@shared/skillTrees';
import { awardSkillXp } from '../game/systems/SkillManager';
import { FARM_ITEMS } from './cropsAndArtisan';

export interface SnackIngredientReq {
  itemId: string;
  label: string;
  quantity: number;
}

export interface StreetSnackDef {
  id: string;
  name: string;
  khmerName: string;
  icon: string;
  rarity: ItemRarity;
  primaryColor: string;
  buyCoins: number;
  sellCoins: number;
  cookingXp: number;
  ingredients: SnackIngredientReq[];
  villageHealthy?: number;
  villageHappy?: number;
  villageSummary: string;
  dungeonSummary: string;
  instantHealHp?: number;
  buffDurationSec?: number;
  buffStats?: {
    moveSpeedPct?: number;
    jumpPowerPct?: number;
    attackPct?: number;
    maxHpPct?: number;
    critChanceBonus?: number;
    mpRegenPct?: number;
    poisonImmune?: boolean;
  };
}

export interface SnackActionResult {
  state: PlayerState;
  ok: boolean;
  message: string;
}

/**
 * Exact 6 Khmer Street Snacks from docs/GDD_CONTENT_AND_ECONOMY.md §2
 */
export const STREET_SNACKS: Record<string, StreetSnackDef> = {
  snack_num_pang: {
    id: 'snack_num_pang',
    name: 'Num Pang',
    khmerName: 'នំប៉័ងសាច់ (Crispy Baguette)',
    icon: '🥖',
    rarity: 'common',
    primaryColor: '#d97706',
    buyCoins: 60,
    sellCoins: 30,
    cookingXp: 18,
    ingredients: [
      { itemId: 'crop_phka_rumduol', label: 'Jasmine Rice', quantity: 1 },
      { itemId: 'drop_fresh_egg', label: 'Fresh Egg', quantity: 1 },
    ],
    villageHealthy: 15,
    villageSummary: 'Healthy +15',
    dungeonSummary: 'Instant +60 HP',
    instantHealHp: 60,
  },
  snack_kafe: {
    id: 'snack_kafe',
    name: 'Kafé Tek Dos Ko',
    khmerName: 'កាហ្វេទឹកដោះគោទឹកកក',
    icon: '🧋',
    rarity: 'uncommon',
    primaryColor: '#92400e',
    buyCoins: 90,
    sellCoins: 45,
    cookingXp: 26,
    ingredients: [
      { itemId: 'artisan_palm_sugar', label: 'Palm Sugar', quantity: 1 },
      { itemId: 'drop_fresh_milk', label: 'Fresh Milk', quantity: 1 },
    ],
    villageHappy: 15,
    villageSummary: 'Happy +15',
    dungeonSummary: '+20% Move/Jump Speed (3m)',
    buffDurationSec: 180,
    buffStats: {
      moveSpeedPct: 0.2,
      jumpPowerPct: 0.2,
    },
  },
  snack_coconut_antivenom: {
    id: 'snack_coconut_antivenom',
    name: 'Coconut Anti-Venom',
    khmerName: 'ទឹកដូងបន្សាបពិស',
    icon: '🥥',
    rarity: 'uncommon',
    primaryColor: '#16a34a',
    buyCoins: 110,
    sellCoins: 55,
    cookingXp: 32,
    ingredients: [
      { itemId: 'fruit_coconut', label: 'Fresh Coconut', quantity: 1 },
      { itemId: 'crop_slek_krey', label: 'Lemongrass', quantity: 1 },
    ],
    villageHealthy: 20,
    villageSummary: 'Healthy +20',
    dungeonSummary: '+80 HP + Poison Immunity (2m)',
    instantHealHp: 80,
    buffDurationSec: 120,
    buffStats: {
      poisonImmune: true,
    },
  },
  snack_pepper_skewer: {
    id: 'snack_pepper_skewer',
    name: 'Kampot Pepper Skewers',
    khmerName: 'សាច់អាំងម្រេចកំពត',
    icon: '🍢',
    rarity: 'rare',
    primaryColor: '#dc2626',
    buyCoins: 180,
    sellCoins: 90,
    cookingXp: 48,
    ingredients: [
      { itemId: 'crop_mtes', label: 'Red Chili', quantity: 1 },
      { itemId: 'crop_kampot_pepper', label: 'Kampot Pepper', quantity: 1 },
    ],
    villageHealthy: 25,
    villageSummary: 'Healthy +25',
    dungeonSummary: '+25% ATK (4m)',
    buffDurationSec: 240,
    buffStats: {
      attackPct: 0.25,
    },
  },
  snack_lotus_tea: {
    id: 'snack_lotus_tea',
    name: 'Lotus Spirit Tea',
    khmerName: 'តែផ្កាឈូកបារមី',
    icon: '🍵',
    rarity: 'rare',
    primaryColor: '#ec4899',
    buyCoins: 200,
    sellCoins: 100,
    cookingXp: 55,
    ingredients: [
      { itemId: 'crop_pink_lotus', label: 'Pink Lotus', quantity: 2 },
      { itemId: 'artisan_palm_sugar', label: 'Palm Sugar', quantity: 1 },
    ],
    villageHappy: 25,
    villageSummary: 'Happy +25',
    dungeonSummary: '+50% Energy/MP Regen (4m)',
    buffDurationSec: 240,
    buffStats: {
      mpRegenPct: 0.5,
    },
  },
  snack_royal_fish_amok: {
    id: 'snack_royal_fish_amok',
    name: 'Royal Fish Amok',
    khmerName: 'អាម៉ុកត្រីរាជវាំង (Grandma Srey 6★)',
    icon: '🍲',
    rarity: 'epic',
    primaryColor: '#f59e0b',
    buyCoins: 320,
    sellCoins: 160,
    cookingXp: 95,
    ingredients: [
      { itemId: 'fish_mekong_catfish', label: 'Mekong Catfish', quantity: 1 },
      { itemId: 'crop_slek_krey', label: 'Lemongrass', quantity: 1 },
      { itemId: 'fruit_coconut', label: 'Fresh Coconut', quantity: 1 },
    ],
    villageHealthy: 35,
    villageHappy: 25,
    villageSummary: 'Healthy +35 · Happy +25',
    dungeonSummary: '+28% ATK, +20% Max HP & Poison Immune (5m)',
    instantHealHp: 110,
    buffDurationSec: 300,
    buffStats: {
      attackPct: 0.28,
      maxHpPct: 0.2,
      poisonImmune: true,
    },
  },
  snack_durian_feast: {
    id: 'snack_durian_feast',
    name: 'Golden Durian Feast',
    khmerName: 'ពិធីជប់លៀងធូរេនមាស',
    icon: '👑',
    rarity: 'legendary',
    primaryColor: '#eab308',
    buyCoins: 500,
    sellCoins: 250,
    cookingXp: 120,
    ingredients: [
      { itemId: 'fruit_golden_durian', label: 'Golden Durian', quantity: 1 },
      { itemId: 'fruit_mango', label: 'Sweet Mango', quantity: 1 },
      { itemId: 'drop_fresh_milk', label: 'Fresh Milk', quantity: 1 },
    ],
    villageHealthy: 50,
    villageHappy: 50,
    villageSummary: 'Healthy +50, Happy +50',
    dungeonSummary: '+20% Max HP, +15% ATK, +15% Crit (5m)',
    buffDurationSec: 300,
    buffStats: {
      maxHpPct: 0.2,
      attackPct: 0.15,
      critChanceBonus: 0.15,
    },
  },
};

export const STREET_SNACK_LIST: StreetSnackDef[] = [
  STREET_SNACKS.snack_num_pang,
  STREET_SNACKS.snack_kafe,
  STREET_SNACKS.snack_coconut_antivenom,
  STREET_SNACKS.snack_pepper_skewer,
  STREET_SNACKS.snack_lotus_tea,
  STREET_SNACKS.snack_durian_feast,
];

export function countInventoryAnyQuality(inv: InventoryItem[], itemId: string): number {
  return inv.filter((i) => i.itemId === itemId).reduce((acc, i) => acc + i.quantity, 0);
}

function addSnackInventory(
  inv: InventoryItem[],
  itemId: string,
  qty: number,
  quality: QualityTier = 'normal'
): InventoryItem[] {
  const next = inv.map((i) => ({ ...i }));
  const existing = next.find(
    (i) => i.itemId === itemId && (i.quality ?? 'normal') === quality
  );
  if (existing) {
    existing.quantity += qty;
  } else {
    next.push({ itemId, quantity: qty, itemLevel: 1, quality });
  }
  return next;
}

function consumeAnyQuality(
  inv: InventoryItem[],
  itemId: string,
  qty: number
): { nextInv: InventoryItem[]; usedGoldStar: boolean } | null {
  if (countInventoryAnyQuality(inv, itemId) < qty) return null;
  const next = inv.map((i) => ({ ...i }));
  let remaining = qty;
  let usedGoldStar = false;

  // Prefer normal first when consuming ingredients unless only gold_star exists
  // (Wait: for cooking, if gold_star is present, using it grants +60s Gold-Star dish!)
  const sortedIndices = next
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.itemId === itemId && item.quantity > 0)
    .sort((a, b) => ((b.item.quality === 'gold_star' ? 1 : 0) - (a.item.quality === 'gold_star' ? 1 : 0)));

  for (const { idx } of sortedIndices) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, next[idx].quantity);
    if ((next[idx].quality ?? 'normal') === 'gold_star' && take > 0) {
      usedGoldStar = true;
    }
    next[idx].quantity -= take;
    remaining -= take;
  }

  return {
    nextInv: next.filter((i) => i.quantity > 0),
    usedGoldStar,
  };
}

function autoSlotSnack(
  slots: [string | null, string | null, string | null],
  snackId: string
): [string | null, string | null, string | null] {
  if (slots.includes(snackId)) return slots;
  const next: [string | null, string | null, string | null] = [...slots];
  const emptyIdx = next.findIndex((s) => !s);
  if (emptyIdx >= 0) {
    next[emptyIdx] = snackId;
  }
  return next;
}

export function assignQuickSnackSlot(
  state: PlayerState,
  slotIndex: 0 | 1 | 2,
  snackId: string
): SnackActionResult {
  const def = STREET_SNACKS[snackId];
  if (!def) return { state, ok: false, message: 'Unknown snack.' };
  const nextSlots: [string | null, string | null, string | null] = [...state.quickSnackSlots];
  // Avoid duplicate slot assignment by swapping if already in another slot
  const existingIdx = nextSlots.indexOf(snackId);
  if (existingIdx >= 0 && existingIdx !== slotIndex) {
    nextSlots[existingIdx] = nextSlots[slotIndex];
  }
  nextSlots[slotIndex] = snackId;
  return {
    state: { ...state, quickSnackSlots: nextSlots },
    ok: true,
    message: `Slotted ${def.icon} ${def.name} into Quick-Bar [${slotIndex + 1}]!`,
  };
}

export function buyStreetSnack(state: PlayerState, snackId: string, qty = 1): SnackActionResult {
  const def = STREET_SNACKS[snackId];
  if (!def) return { state, ok: false, message: 'Unknown street snack.' };
  // Kitchen Altar Pagoda Bundle grants permanent 20% Snack Cart discount!
  const kitchenDone = (state.pagodaBundles?.altar_kitchen?.length ?? 0) >= 3;
  const unitPrice = kitchenDone ? Math.round(def.buyCoins * 0.8) : def.buyCoins;
  const totalCost = unitPrice * qty;
  if (state.currencies.coins < totalCost) {
    return {
      state,
      ok: false,
      message: `Need ${totalCost.toLocaleString()} Coins to buy ${qty}× ${def.name}.`,
    };
  }
  const nextCoins = state.currencies.coins - totalCost;
  const nextInv = addSnackInventory(state.inventory, snackId, qty, 'normal');
  const nextSlots = autoSlotSnack(state.quickSnackSlots, snackId);

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      inventory: nextInv,
      quickSnackSlots: nextSlots,
    },
    ok: true,
    message: `Bought ${qty}× ${def.icon} ${def.name} (-${totalCost.toLocaleString()} Coins${kitchenDone ? ' · -20% Pagoda Discount!' : ''})!`,
  };
}

export function cookStreetSnack(state: PlayerState, snackId: string): SnackActionResult {
  const def = STREET_SNACKS[snackId];
  if (!def) return { state, ok: false, message: 'Unknown snack recipe.' };

  let workingInv = state.inventory;
  let anyGoldStar = false;

  for (const req of def.ingredients) {
    const consumed = consumeAnyQuality(workingInv, req.itemId, req.quantity);
    if (!consumed) {
      const name = FARM_ITEMS[req.itemId]?.name ?? req.label;
      return {
        state,
        ok: false,
        message: `Need ${req.quantity}× ${name} in Container to cook ${def.name}.`,
      };
    }
    workingInv = consumed.nextInv;
    if (consumed.usedGoldStar) anyGoldStar = true;
  }

  // Master Chef talent: 20% chance for bonus dish!
  const masterChef = hasTalent(state.skills, 'cooking', 'cook_master_chef');
  const bonusDish = masterChef && Math.random() < 0.2 ? 1 : 0;
  const producedQty = 1 + bonusDish;
  const quality: QualityTier = anyGoldStar ? 'gold_star' : 'normal';

  const finalInv = addSnackInventory(workingInv, snackId, producedQty, quality);
  const nextSlots = autoSlotSnack(state.quickSnackSlots, snackId);

  const cookedBase: PlayerState = {
    ...state,
    inventory: finalInv,
    quickSnackSlots: nextSlots,
  };
  const xpRes = awardSkillXp(cookedBase, 'cooking', def.cookingXp, true);

  return {
    state: xpRes.state,
    ok: true,
    message: `Cooked ${producedQty}× ${quality === 'gold_star' ? '★ ' : ''}${def.icon} ${def.name}! (+${def.cookingXp} Cooking XP${bonusDish ? ' · Master Chef Bonus!' : ''})`,
  };
}

export function consumeStreetSnack(
  state: PlayerState,
  snackId: string,
  now = Date.now()
): SnackActionResult {
  const def = STREET_SNACKS[snackId];
  if (!def) return { state, ok: false, message: 'No snack assigned to this slot.' };

  const consumed = consumeAnyQuality(state.inventory, snackId, 1);
  if (!consumed) {
    return {
      state,
      ok: false,
      message: `Out of ${def.name}! Visit the Num Pang Cart in Village to buy or cook more.`,
    };
  }

  // Village LifeStats gain (boosted +25% by Cooking -> Sharing Is Caring)
  const sharingMult = hasTalent(state.skills, 'cooking', 'cook_sharing') ? 1.25 : 1;
  const healthyGain = Math.round((def.villageHealthy ?? 0) * sharingMult);
  const happyGain = Math.round((def.villageHappy ?? 0) * sharingMult);
  const nextHealthy = Math.min(100, state.lifeStats.healthy + healthyGain);
  const nextHappy = Math.min(100, state.lifeStats.happy + happyGain);

  // Active timed buff (extended +30% by Long-Lasting Meals & +60s for Gold-Star!)
  const activeBuffs: ActiveSnackBuff[] = state.activeBuffs.filter((b) => b.expiresAt > now && b.snackId !== snackId);
  let buffDurationUsed = 0;

  if (def.buffDurationSec && def.buffStats) {
    const longLastingMult = hasTalent(state.skills, 'cooking', 'cook_long_lasting') ? 1.3 : 1;
    const goldBonusSec = consumed.usedGoldStar ? 60 : 0;
    buffDurationUsed = Math.round(def.buffDurationSec * longLastingMult) + goldBonusSec;
    activeBuffs.push({
      id: `${snackId}_${now}`,
      snackId,
      name: def.name,
      khmerName: def.khmerName,
      icon: def.icon,
      color: def.primaryColor,
      startedAt: now,
      expiresAt: now + buffDurationUsed * 1000,
      ...def.buffStats,
    });
  }

  let nextState: PlayerState = {
    ...state,
    inventory: consumed.nextInv,
    lifeStats: {
      ...state.lifeStats,
      healthy: nextHealthy,
      happy: nextHappy,
    },
    activeBuffs,
  };

  // Compute updated bridge Max HP (Healthy + Durian Feast Max HP%) then apply instant heal
  const bridge = computeVillageToDungeonBridge(nextState, now);
  const lingerMult = hasTalent(state.skills, 'crafting', 'craft_lingering') ? 1.25 : 1;
  const healAmt = Math.round((def.instantHealHp ?? 0) * lingerMult);
  const nextHp =
    healAmt > 0
      ? Math.min(bridge.effectiveMaxHp, state.hp + healAmt)
      : Math.min(bridge.effectiveMaxHp, state.hp + (def.buffStats?.maxHpPct ? Math.round(bridge.effectiveMaxHp * 0.15) : 0));

  nextState = {
    ...nextState,
    hp: nextHp,
    skillDamagePct: bridge.classSkillDamagePct,
    snackBuffPct: bridge.snackAttackPct,
  };

  const parts: string[] = [];
  if (healAmt > 0) parts.push(`+${healAmt} HP`);
  if (healthyGain > 0) parts.push(`Healthy +${healthyGain}`);
  if (happyGain > 0) parts.push(`Happy +${happyGain}`);
  if (buffDurationUsed > 0) {
    const mins = Math.floor(buffDurationUsed / 60);
    const secs = buffDurationUsed % 60;
    parts.push(`${def.dungeonSummary.replace(/\(\d+m\)/, '').trim()} (${mins}m${secs ? ` ${secs}s` : ''})`);
  }

  return {
    state: nextState,
    ok: true,
    message: `Ate ${def.icon} ${def.name}: ${parts.join(' · ')}`,
  };
}
