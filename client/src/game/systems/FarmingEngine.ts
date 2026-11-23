import type {
  ArtisanMachineState,
  FarmPlotState,
  FruitTreeState,
  InventoryItem,
  LivestockPenState,
  PlayerState,
  QualityTier,
  SkillId,
} from '@shared/types';
import { getXpForNextLevel } from '@shared/balanceFormulas';
import { hasTalent } from '@shared/skillTrees';
import { awardSkillXp } from './SkillManager';
import {
  ARTISAN_MACHINES,
  ARTISAN_RECIPES,
  FARM_ITEMS,
  FRUIT_TREES,
  LIVESTOCK,
  PLOT_UNLOCK_COST,
  ROW_CROPS,
} from '../../data/cropsAndArtisan';

export interface TimedProgress {
  pct: number;         // 0..1
  remainingMs: number;
  ready: boolean;
  stage: 0 | 1 | 2 | 3;
}

export interface ActionResult {
  state: PlayerState;
  ok: boolean;
  message: string;
  goldStar?: boolean;
}

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'READY!';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function addFarmXpAndPlayerXp(
  state: PlayerState,
  skillXpGain: number,
  charXpGain = 0,
  skillId: SkillId = 'farming'
): PlayerState {
  const skillRes = awardSkillXp(state, skillId, skillXpGain, true);
  let nextState = skillRes.state;

  let level = nextState.level;
  let xp = nextState.xp + charXpGain;
  let maxHp = nextState.maxHp;
  let hp = nextState.hp;
  while (xp >= getXpForNextLevel(level)) {
    xp -= getXpForNextLevel(level);
    level += 1;
    maxHp += 15;
    hp = maxHp;
  }

  return {
    ...nextState,
    level,
    xp,
    maxHp,
    hp,
  };
}

function addInventory(
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

function consumeInventory(
  inv: InventoryItem[],
  itemId: string,
  qty = 1,
  quality?: QualityTier
): InventoryItem[] | null {
  const idx = inv.findIndex(
    (i) =>
      i.itemId === itemId &&
      i.quantity >= qty &&
      (quality === undefined || (i.quality ?? 'normal') === quality)
  );
  if (idx < 0) return null;
  const next = inv.map((i) => ({ ...i }));
  if (next[idx].quantity === qty) {
    next.splice(idx, 1);
  } else {
    next[idx].quantity -= qty;
  }
  return next;
}

function spendCoins(state: PlayerState, cost: number): PlayerState | null {
  if (state.currencies.coins < cost) return null;
  const nextCoins = state.currencies.coins - cost;
  return {
    ...state,
    coins: nextCoins,
    currencies: { ...state.currencies, coins: nextCoins },
  };
}

function earnCoins(state: PlayerState, gain: number): PlayerState {
  const nextCoins = state.currencies.coins + gain;
  return {
    ...state,
    coins: nextCoins,
    currencies: { ...state.currencies, coins: nextCoins },
  };
}

// ==================== PROGRESS CALCULATORS ====================

export function getPlotProgress(plot: FarmPlotState, now = Date.now()): TimedProgress {
  if (!plot.cropId || !plot.plantedAt || plot.effectiveGrowMs <= 0) {
    return { pct: 0, remainingMs: 0, ready: false, stage: 0 };
  }
  const elapsed = Math.max(0, now - plot.plantedAt);
  const pct = Math.min(1, elapsed / plot.effectiveGrowMs);
  const stage: 0 | 1 | 2 | 3 = pct >= 1 ? 3 : pct >= 0.66 ? 2 : pct >= 0.33 ? 1 : 0;
  return {
    pct,
    remainingMs: Math.max(0, plot.effectiveGrowMs - elapsed),
    ready: pct >= 1,
    stage,
  };
}

export function getTreeProgress(tree: FruitTreeState, now = Date.now()): TimedProgress {
  const def = FRUIT_TREES[tree.treeId];
  if (!def) return { pct: 0, remainingMs: 0, ready: false, stage: 0 };
  const anchor = tree.mature && tree.lastHarvestAt ? tree.lastHarvestAt : tree.plantedAt;
  const durationMs = (tree.mature ? def.cooldownSeconds : def.initialGrowSeconds) * 1000;
  const elapsed = Math.max(0, now - anchor);
  const pct = Math.min(1, elapsed / Math.max(1, durationMs));
  return {
    pct,
    remainingMs: Math.max(0, durationMs - elapsed),
    ready: pct >= 1,
    stage: pct >= 1 ? 3 : pct >= 0.66 ? 2 : pct >= 0.33 ? 1 : 0,
  };
}

export function getLivestockProgress(pen: LivestockPenState, now = Date.now()): TimedProgress {
  const def = LIVESTOCK[pen.animalId];
  if (!def) return { pct: 0, remainingMs: 0, ready: false, stage: 0 };
  const durationMs = def.cooldownSeconds * 1000;
  const elapsed = Math.max(0, now - pen.lastCollectedAt);
  const pct = Math.min(1, elapsed / Math.max(1, durationMs));
  return {
    pct,
    remainingMs: Math.max(0, durationMs - elapsed),
    ready: pct >= 1,
    stage: pct >= 1 ? 3 : 1,
  };
}

export function getMachineProgress(machine: ArtisanMachineState, now = Date.now()): TimedProgress {
  if (!machine.recipeId || !machine.startedAt || machine.durationMs <= 0) {
    return { pct: 0, remainingMs: 0, ready: false, stage: 0 };
  }
  const elapsed = Math.max(0, now - machine.startedAt);
  const pct = Math.min(1, elapsed / machine.durationMs);
  return {
    pct,
    remainingMs: Math.max(0, machine.durationMs - elapsed),
    ready: pct >= 1,
    stage: pct >= 1 ? 3 : 1,
  };
}

// ==================== PLOT ACTIONS ====================

export function unlockPlot(state: PlayerState, index: number): ActionResult {
  const plot = state.farm.plots[index];
  if (!plot || plot.unlocked) return { state, ok: false, message: 'Plot already unlocked.' };
  const paid = spendCoins(state, PLOT_UNLOCK_COST);
  if (!paid) return { state, ok: false, message: `Need ${PLOT_UNLOCK_COST} Coins to unlock this plot.` };

  const plots = paid.farm.plots.map((p) =>
    p.index === index ? { ...p, unlocked: true, tilled: true } : p
  );
  return {
    state: { ...paid, farm: { ...paid.farm, plots } },
    ok: true,
    message: `Unlocked Plot #${index + 1} for ${PLOT_UNLOCK_COST} Coins!`,
  };
}

export function tillPlot(state: PlayerState, index: number): ActionResult {
  const plot = state.farm.plots[index];
  if (!plot || !plot.unlocked) return { state, ok: false, message: 'Unlock this plot first!' };
  if (plot.tilled) return { state, ok: false, message: 'Soil is already tilled.' };

  const plots = state.farm.plots.map((p) => (p.index === index ? { ...p, tilled: true } : p));
  return {
    state: addFarmXpAndPlayerXp({ ...state, farm: { ...state.farm, plots } }, 3),
    ok: true,
    message: 'Tilled soil! Select a seed to plant.',
  };
}

export function plantSeedOnPlot(
  state: PlayerState,
  index: number,
  cropId: string,
  now = Date.now()
): ActionResult {
  const crop = ROW_CROPS[cropId];
  const plot = state.farm.plots[index];
  if (!crop || !plot || !plot.unlocked) return { state, ok: false, message: 'Cannot plant here.' };
  if (!plot.tilled) return { state, ok: false, message: 'Till the soil first!' };
  if (plot.cropId) return { state, ok: false, message: 'Plot already has a growing crop.' };

  const nextInv = consumeInventory(state.inventory, crop.seedItemId, 1);
  if (!nextInv) {
    return { state, ok: false, message: `Out of ${crop.name} Seeds! Buy more at the Farm Stall.` };
  }

  // Harvest Altar Pagoda Restoration unlocks Glass Greenhouse: +20% permanent farm growth speed!
  const greenhouseUnlocked = (state.pagodaBundles?.altar_harvest?.length ?? 0) >= 3;
  const growMs = Math.round(crop.growSeconds * 1000 * (greenhouseUnlocked ? 0.8 : 1));

  const plots = state.farm.plots.map((p) =>
    p.index === index
      ? {
          ...p,
          cropId: crop.id,
          plantedAt: now,
          effectiveGrowMs: growMs,
          watered: false,
          fertilized: false,
        }
      : p
  );

  return {
    state: addFarmXpAndPlayerXp(
      { ...state, inventory: nextInv, farm: { ...state.farm, plots } },
      5
    ),
    ok: true,
    message: `Planted ${crop.name} (${formatRemainingTime(growMs)}${greenhouseUnlocked ? ' · Greenhouse -20%' : ''})!`,
  };
}

/**
 * Watering cuts REMAINING growth time by 20% and awards Farm Level XP (docs/GDD_CONTENT_AND_ECONOMY.md §1).
 */
export function waterPlot(state: PlayerState, index: number, now = Date.now()): ActionResult {
  const plot = state.farm.plots[index];
  if (!plot || !plot.cropId || !plot.plantedAt) {
    return { state, ok: false, message: 'Nothing planted here to water.' };
  }
  if (plot.watered) return { state, ok: false, message: 'Already watered!' };

  const elapsed = Math.max(0, now - plot.plantedAt);
  const remaining = Math.max(0, plot.effectiveGrowMs - elapsed);
  const reducedRemaining = Math.round(remaining * 0.8); // -20% remaining growth time
  const nextEffectiveMs = elapsed + reducedRemaining;

  const plots = state.farm.plots.map((p) =>
    p.index === index ? { ...p, watered: true, effectiveGrowMs: nextEffectiveMs } : p
  );

  return {
    state: addFarmXpAndPlayerXp({ ...state, farm: { ...state.farm, plots } }, 8),
    ok: true,
    message: 'Watered! Remaining grow time -20% (+8 Farm XP)',
  };
}

/**
 * Fertilizer grants a 20% chance for Gold-Star crop (1.5x Coins & +60s buff duration).
 */
export function fertilizePlot(state: PlayerState, index: number): ActionResult {
  const plot = state.farm.plots[index];
  if (!plot || !plot.cropId) return { state, ok: false, message: 'Plant a crop first before fertilizing.' };
  if (plot.fertilized) return { state, ok: false, message: 'Fertilizer already applied!' };

  const nextInv = consumeInventory(state.inventory, 'fertilizer', 1);
  if (!nextInv) return { state, ok: false, message: 'Out of Fertilizer! Buy at Farm Stall (200 Coins).' };

  const plots = state.farm.plots.map((p) =>
    p.index === index ? { ...p, fertilized: true } : p
  );

  return {
    state: { ...state, inventory: nextInv, farm: { ...state.farm, plots } },
    ok: true,
    message: 'Applied Fertilizer! (20% Gold-Star 1.5x Coin chance)',
  };
}

export function harvestPlot(state: PlayerState, index: number, now = Date.now()): ActionResult {
  const plot = state.farm.plots[index];
  if (!plot || !plot.cropId) return { state, ok: false, message: 'Nothing to harvest.' };
  const prog = getPlotProgress(plot, now);
  if (!prog.ready) {
    return { state, ok: false, message: `Still growing (${formatRemainingTime(prog.remainingMs)} left).` };
  }
  const crop = ROW_CROPS[plot.cropId];
  if (!crop) return { state, ok: false, message: 'Unknown crop.' };

  // 20% chance for Gold-Star quality when fertilized (+15% with Farming -> Golden Thumb!)
  const goldenThumbBonus = hasTalent(state.skills, 'farming', 'farm_golden_thumb') ? 0.15 : 0;
  const goldChance = (plot.fertilized ? 0.2 : 0) + goldenThumbBonus;
  const isGoldStar = goldChance > 0 && Math.random() < goldChance;
  const quality: QualityTier = isGoldStar ? 'gold_star' : 'normal';

  const plots = state.farm.plots.map((p) =>
    p.index === index
      ? {
          ...p,
          cropId: null,
          plantedAt: null,
          effectiveGrowMs: 0,
          watered: false,
          fertilized: false,
        }
      : p
  );
  const nextInv = addInventory(state.inventory, crop.harvestItemId, 1, quality);
  const nextState = addFarmXpAndPlayerXp(
    { ...state, inventory: nextInv, farm: { ...state.farm, plots } },
    crop.farmXp,
    Math.round(crop.farmXp * 0.6)
  );

  return {
    state: nextState,
    ok: true,
    goldStar: isGoldStar,
    message: isGoldStar
      ? `★ GOLD-STAR ${crop.name} harvested! (+${crop.farmXp} Farm XP)`
      : `Harvested ${crop.name}! (+${crop.farmXp} Farm XP)`,
  };
}

// ==================== SHOP, TREES, LIVESTOCK & ARTISAN ====================

export function buyFarmSupply(state: PlayerState, itemId: string, qty = 1): ActionResult {
  const meta = FARM_ITEMS[itemId];
  if (!meta?.buyCoins) return { state, ok: false, message: 'Item not purchasable.' };
  const total = meta.buyCoins * qty;
  const paid = spendCoins(state, total);
  if (!paid) return { state, ok: false, message: `Need ${total.toLocaleString()} Coins.` };

  return {
    state: { ...paid, inventory: addInventory(paid.inventory, itemId, qty, 'normal') },
    ok: true,
    message: `Bought ${qty}× ${meta.name} (-${total.toLocaleString()} Coins)`,
  };
}

export function sellFarmProduce(
  state: PlayerState,
  itemId: string,
  quality: QualityTier = 'normal',
  qty = 1
): ActionResult {
  const meta = FARM_ITEMS[itemId];
  if (!meta?.sellCoins) return { state, ok: false, message: 'Item cannot be sold.' };
  const nextInv = consumeInventory(state.inventory, itemId, qty, quality);
  if (!nextInv) return { state, ok: false, message: 'Not enough items to sell.' };

  const unitPrice = quality === 'gold_star' ? Math.round(meta.sellCoins * 1.5) : meta.sellCoins;
  const earned = unitPrice * qty;
  const nextState = earnCoins({ ...state, inventory: nextInv }, earned);

  return {
    state: nextState,
    ok: true,
    message: `Sold ${qty}× ${quality === 'gold_star' ? '★ ' : ''}${meta.name} (+${earned.toLocaleString()} Coins)`,
  };
}

export function buyFruitTree(state: PlayerState, treeId: string, now = Date.now()): ActionResult {
  const def = FRUIT_TREES[treeId];
  if (!def) return { state, ok: false, message: 'Unknown tree.' };
  if (state.farm.trees.length >= 4) return { state, ok: false, message: 'Orchard full (4 trees max).' };
  const paid = spendCoins(state, def.costCoins);
  if (!paid) return { state, ok: false, message: `Need ${def.costCoins.toLocaleString()} Coins.` };

  const nextTree: FruitTreeState = {
    slotIndex: paid.farm.trees.length,
    treeId: def.id,
    plantedAt: now,
    lastHarvestAt: null,
    mature: false,
  };
  return {
    state: { ...paid, farm: { ...paid.farm, trees: [...paid.farm.trees, nextTree] } },
    ok: true,
    message: `Planted ${def.name}!`,
  };
}

export function harvestFruitTree(state: PlayerState, slotIndex: number, now = Date.now()): ActionResult {
  const tree = state.farm.trees[slotIndex];
  if (!tree) return { state, ok: false, message: 'No tree in slot.' };
  const def = FRUIT_TREES[tree.treeId];
  const prog = getTreeProgress(tree, now);
  if (!def || !prog.ready) {
    return { state, ok: false, message: `Fruit ready in ${formatRemainingTime(prog.remainingMs)}.` };
  }

  const trees = state.farm.trees.map((t, idx) =>
    idx === slotIndex ? { ...t, mature: true, lastHarvestAt: now } : t
  );
  const doubleGather = hasTalent(state.skills, 'foraging', 'forage_double') && Math.random() < 0.2;
  const qty = def.outputQuantity * (doubleGather ? 2 : 1);
  const nextInv = addInventory(state.inventory, def.outputItemId, qty, 'normal');
  const withForage = awardSkillXp(
    { ...state, inventory: nextInv, farm: { ...state.farm, trees } },
    'foraging',
    Math.round(def.farmXp * 0.6),
    true
  ).state;
  return {
    state: addFarmXpAndPlayerXp(withForage, def.farmXp, 20, 'farming'),
    ok: true,
    message: `Harvested ${qty}× ${FARM_ITEMS[def.outputItemId]?.name ?? def.outputItemId}${doubleGather ? ' (Double Gather!)' : ''}!`,
  };
}

export function buyLivestock(state: PlayerState, animalId: string, now = Date.now()): ActionResult {
  const def = LIVESTOCK[animalId];
  if (!def) return { state, ok: false, message: 'Unknown livestock.' };
  if (state.farm.livestock.length >= 4) return { state, ok: false, message: 'Livestock pen full (4 animals max).' };
  const paid = spendCoins(state, def.costCoins);
  if (!paid) return { state, ok: false, message: `Need ${def.costCoins.toLocaleString()} Coins.` };

  const nextPen: LivestockPenState = {
    slotIndex: paid.farm.livestock.length,
    animalId: def.id,
    acquiredAt: now,
    lastCollectedAt: now,
    fed: true,
  };
  return {
    state: { ...paid, farm: { ...paid.farm, livestock: [...paid.farm.livestock, nextPen] } },
    ok: true,
    message: `Adopted ${def.name}!`,
  };
}

export function collectLivestock(state: PlayerState, slotIndex: number, now = Date.now()): ActionResult {
  const pen = state.farm.livestock[slotIndex];
  if (!pen) return { state, ok: false, message: 'Empty pen slot.' };
  const def = LIVESTOCK[pen.animalId];
  const prog = getLivestockProgress(pen, now);
  if (!def || !prog.ready) {
    return { state, ok: false, message: `Ready in ${formatRemainingTime(prog.remainingMs)}.` };
  }

  const livestock = state.farm.livestock.map((l, idx) =>
    idx === slotIndex ? { ...l, lastCollectedAt: now } : l
  );
  let nextInv = addInventory(state.inventory, def.outputItemId, 1, 'normal');
  if (def.bonusItemId) {
    nextInv = addInventory(nextInv, def.bonusItemId, 1, 'normal');
  }
  return {
    state: addFarmXpAndPlayerXp(
      { ...state, inventory: nextInv, farm: { ...state.farm, livestock } },
      def.farmXp,
      15
    ),
    ok: true,
    message: `Collected ${FARM_ITEMS[def.outputItemId]?.name}${def.bonusItemId ? ' + Rich Fertilizer' : ''}!`,
  };
}

export function buyArtisanMachine(state: PlayerState, machineId: string): ActionResult {
  const def = ARTISAN_MACHINES[machineId];
  if (!def) return { state, ok: false, message: 'Unknown machine.' };
  if (state.farm.machines.length >= 6) return { state, ok: false, message: 'Artisan yard full (6 machines max).' };
  const paid = spendCoins(state, def.costCoins);
  if (!paid) return { state, ok: false, message: `Need ${def.costCoins.toLocaleString()} Coins.` };

  const nextMachine: ArtisanMachineState = {
    slotIndex: paid.farm.machines.length,
    machineId: def.id,
    recipeId: null,
    inputItemId: null,
    outputItemId: null,
    startedAt: null,
    durationMs: 0,
    quality: 'normal',
  };
  return {
    state: { ...paid, farm: { ...paid.farm, machines: [...paid.farm.machines, nextMachine] } },
    ok: true,
    message: `Built ${def.name} in your Artisan Yard!`,
  };
}

export function startArtisanProcess(
  state: PlayerState,
  slotIndex: number,
  recipeId: string,
  now = Date.now()
): ActionResult {
  const machine = state.farm.machines[slotIndex];
  const recipe = ARTISAN_RECIPES.find((r) => r.id === recipeId && r.machineId === machine?.machineId);
  if (!machine || !recipe) return { state, ok: false, message: 'Invalid machine recipe.' };
  if (machine.recipeId) return { state, ok: false, message: 'Machine is currently processing!' };

  // Prefer gold_star input if present so output inherits gold_star quality!
  let usedQuality: QualityTier = 'gold_star';
  let nextInv = consumeInventory(state.inventory, recipe.inputItemId, 1, 'gold_star');
  if (!nextInv) {
    usedQuality = 'normal';
    nextInv = consumeInventory(state.inventory, recipe.inputItemId, 1, 'normal');
  }
  if (!nextInv) {
    const inputName = FARM_ITEMS[recipe.inputItemId]?.name ?? recipe.inputItemId;
    return { state, ok: false, message: `Need 1× ${inputName} in your Container.` };
  }

  const machines = state.farm.machines.map((m, idx) =>
    idx === slotIndex
      ? {
          ...m,
          recipeId: recipe.id,
          inputItemId: recipe.inputItemId,
          outputItemId: recipe.outputItemId,
          startedAt: now,
          durationMs: recipe.durationSeconds * 1000,
          quality: usedQuality,
        }
      : m
  );

  return {
    state: { ...state, inventory: nextInv, farm: { ...state.farm, machines } },
    ok: true,
    message: `Started ${recipe.label} (${formatRemainingTime(recipe.durationSeconds * 1000)})`,
  };
}

export function collectArtisanOutput(state: PlayerState, slotIndex: number, now = Date.now()): ActionResult {
  const machine = state.farm.machines[slotIndex];
  if (!machine || !machine.recipeId || !machine.outputItemId) {
    return { state, ok: false, message: 'Machine is idle.' };
  }
  const prog = getMachineProgress(machine, now);
  if (!prog.ready) {
    return { state, ok: false, message: `Processing... ${formatRemainingTime(prog.remainingMs)} left.` };
  }
  const recipe = ARTISAN_RECIPES.find((r) => r.id === machine.recipeId);
  const outName = FARM_ITEMS[machine.outputItemId]?.name ?? machine.outputItemId;
  const bonusOut = hasTalent(state.skills, 'crafting', 'craft_alchemist_luck') && Math.random() < 0.2 ? 1 : 0;
  const qty = 1 + bonusOut;
  const nextInv = addInventory(state.inventory, machine.outputItemId, qty, machine.quality);

  const machines = state.farm.machines.map((m, idx) =>
    idx === slotIndex
      ? {
          ...m,
          recipeId: null,
          inputItemId: null,
          outputItemId: null,
          startedAt: null,
          durationMs: 0,
          quality: 'normal' as QualityTier,
        }
      : m
  );

  return {
    state: addFarmXpAndPlayerXp(
      { ...state, inventory: nextInv, farm: { ...state.farm, machines } },
      recipe?.farmXp ?? 30,
      20,
      'crafting'
    ),
    ok: true,
    goldStar: machine.quality === 'gold_star',
    message: `Collected ${qty}× ${machine.quality === 'gold_star' ? '★ ' : ''}${outName}${bonusOut ? ' (Alchemist Luck!)' : ''}! (+${recipe?.farmXp ?? 30} Crafting XP)`,
  };
}

/**
 * Dev Boost / Fast-Forward helper: shifts all active farm, tree, livestock,
 * and artisan machine timestamps backward by `seconds` so testing long timers is instant!
 */
export function fastForwardFarmTimers(state: PlayerState, seconds = 60): ActionResult {
  const shiftMs = seconds * 1000;
  const plots = state.farm.plots.map((p) =>
    p.plantedAt ? { ...p, plantedAt: p.plantedAt - shiftMs } : p
  );
  const trees = state.farm.trees.map((t) => ({
    ...t,
    plantedAt: t.plantedAt - shiftMs,
    lastHarvestAt: t.lastHarvestAt ? t.lastHarvestAt - shiftMs : null,
  }));
  const livestock = state.farm.livestock.map((l) => ({
    ...l,
    lastCollectedAt: l.lastCollectedAt - shiftMs,
  }));
  const machines = state.farm.machines.map((m) =>
    m.startedAt ? { ...m, startedAt: m.startedAt - shiftMs } : m
  );

  return {
    state: {
      ...state,
      farm: { plots, trees, livestock, machines },
    },
    ok: true,
    message: `⏩ Fast-Forwarded all farm timers by +${seconds}s!`,
  };
}
