import type { PlayerState } from './types';

export type RegionalTradeGoodId =
  | 'trade_kampot_pepper'
  | 'trade_angkor_silk'
  | 'trade_koh_rong_pearl'
  | 'trade_laterite_sculpture';

export type RegionalMarketZoneId =
  | 'green_park'
  | 'market_street'
  | 'koh_rong_island'
  | 'temple_district'
  | 'mining_quarry'
  | 'farm_homestead';

export interface RegionalTradeGoodDef {
  id: RegionalTradeGoodId;
  name: string;
  khmerName: string;
  icon: string;
  basePrice: number;
  surplusZone: RegionalMarketZoneId;
  surplusLabel: string;
  highDemandZone: RegionalMarketZoneId;
  highDemandLabel: string;
  accentColor: string;
  description: string;
}

export const REGIONAL_MARKET_ZONES: Record<
  RegionalMarketZoneId,
  { id: RegionalMarketZoneId; name: string; khmerName: string; icon: string }
> = {
  green_park: {
    id: 'green_park',
    name: 'Floating Mekong Market (Green Park)',
    khmerName: 'ផ្សារបណ្តែតទឹកមេគង្គ',
    icon: '🛶',
  },
  farm_homestead: {
    id: 'farm_homestead',
    name: 'Farm Homestead',
    khmerName: 'ចម្ការផ្ទាល់ខ្លួន',
    icon: '🌾',
  },
  market_street: {
    id: 'market_street',
    name: 'Market Street',
    khmerName: 'វិថីផ្សារភូមិ',
    icon: '🏪',
  },
  koh_rong_island: {
    id: 'koh_rong_island',
    name: 'Koh Rong Mythic Island',
    khmerName: 'កោះរ៉ុងទេពសមុទ្រ',
    icon: '🏝️',
  },
  mining_quarry: {
    id: 'mining_quarry',
    name: 'Laterite Quarry',
    khmerName: 'អណ្តូងរ៉ែថ្មបាយក្រៀម',
    icon: '⛏️',
  },
  temple_district: {
    id: 'temple_district',
    name: 'Temple District',
    khmerName: 'សង្កាត់ប្រាសាទ',
    icon: '🛕',
  },
};

export const REGIONAL_TRADE_GOODS: Record<RegionalTradeGoodId, RegionalTradeGoodDef> = {
  trade_kampot_pepper: {
    id: 'trade_kampot_pepper',
    name: 'Kampot Pepper Crates',
    khmerName: 'កេសម្រេចកំពត',
    icon: '🌶️',
    basePrice: 120,
    surplusZone: 'farm_homestead',
    surplusLabel: 'Farm Homestead',
    highDemandZone: 'koh_rong_island',
    highDemandLabel: 'Koh Rong Island',
    accentColor: '#ef4444',
    description: 'Fragrant sun-dried red Kampot peppercorns — cheap at Farm Homestead, coveted by island chefs at Koh Rong!',
  },
  trade_angkor_silk: {
    id: 'trade_angkor_silk',
    name: 'Angkor Silk Bolts',
    khmerName: 'ដុំសូត្រមាសអង្គរ',
    icon: '🧵',
    basePrice: 180,
    surplusZone: 'market_street',
    surplusLabel: 'Market Street',
    highDemandZone: 'green_park',
    highDemandLabel: 'Floating River Market',
    accentColor: '#ec4899',
    description: 'Hand-loomed golden Hol silk bolts — abundant on Market Street, top sellers at the Floating Mekong Market!',
  },
  trade_koh_rong_pearl: {
    id: 'trade_koh_rong_pearl',
    name: 'Koh Rong Pearl Jars',
    khmerName: 'កែវគុជខ្យងកោះរ៉ុង',
    icon: '🦪',
    basePrice: 240,
    surplusZone: 'koh_rong_island',
    surplusLabel: 'Koh Rong Island',
    highDemandZone: 'market_street',
    highDemandLabel: 'Market Street',
    accentColor: '#06b6d4',
    description: 'Luminous turquoise sea-pearl jars harvested on Koh Rong — prized by boutiques on Market Street!',
  },
  trade_laterite_sculpture: {
    id: 'trade_laterite_sculpture',
    name: 'Laterite Sculptures',
    khmerName: 'ចម្លាក់ថ្មបាយក្រៀម',
    icon: '🗿',
    basePrice: 210,
    surplusZone: 'mining_quarry',
    surplusLabel: 'Laterite Quarry',
    highDemandZone: 'temple_district',
    highDemandLabel: 'Temple District',
    accentColor: '#f59e0b',
    description: 'Hand-carved sandstone & laterite guardian reliefs — plentiful at the Quarry, high demand in Temple District!',
  },
};

export const REGIONAL_TRADE_GOOD_LIST: RegionalTradeGoodDef[] = Object.values(REGIONAL_TRADE_GOODS);

export const PRICE_CYCLE_MS = 15 * 60_000; // Prices refresh every 15 minutes

export interface ZoneGoodQuote {
  good: RegionalTradeGoodDef;
  zoneId: RegionalMarketZoneId;
  buyPrice: number;
  sellPrice: number;
  trend: 'high_demand' | 'surplus' | 'normal';
  pctDelta: number;
}

function deterministicHash(seed: number): number {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

export function getPriceCycleWindow(now = Date.now()): { windowIndex: number; remainingSec: number } {
  const windowIndex = Math.floor(now / PRICE_CYCLE_MS);
  const nextWindowAt = (windowIndex + 1) * PRICE_CYCLE_MS;
  return {
    windowIndex,
    remainingSec: Math.max(0, Math.ceil((nextWindowAt - now) / 1000)),
  };
}

export function resolveRegionalZone(mapId?: string | null, zone?: string): RegionalMarketZoneId {
  if (zone === 'farm') return 'farm_homestead';
  if (
    mapId === 'green_park' ||
    mapId === 'market_street' ||
    mapId === 'koh_rong_island' ||
    mapId === 'temple_district' ||
    mapId === 'mining_quarry'
  ) {
    return mapId;
  }
  return 'green_park';
}

export function getRegionalQuoteForZone(
  goodId: RegionalTradeGoodId,
  zoneId: RegionalMarketZoneId,
  now = Date.now()
): ZoneGoodQuote {
  const good = REGIONAL_TRADE_GOODS[goodId];
  const { windowIndex } = getPriceCycleWindow(now);
  const seed = windowIndex * 97 + goodId.length * 31 + zoneId.length * 17;
  const jitter = (deterministicHash(seed) - 0.5) * 0.14; // -7% .. +7% 15-min wave

  let trend: 'high_demand' | 'surplus' | 'normal' = 'normal';
  let mult = 1.0 + jitter;

  if (zoneId === good.highDemandZone) {
    trend = 'high_demand';
    mult = 1.62 + jitter; // +55% to +69% High Demand!
  } else if (zoneId === good.surplusZone) {
    trend = 'surplus';
    mult = 0.7 + jitter * 0.5; // -26% to -34% Cheap Surplus!
  } else if (zoneId === 'green_park' && goodId === 'trade_kampot_pepper') {
    // Floating Mekong Market always keeps fresh pepper crates available at a modest discount for quick trading!
    trend = 'surplus';
    mult = 0.78 + jitter * 0.4;
  }

  const buyPrice = Math.max(40, Math.round(good.basePrice * mult));
  const sellPrice = Math.max(35, Math.round(buyPrice * (trend === 'high_demand' ? 0.98 : 0.9)));
  const pctDelta = Math.round((mult - 1) * 100);

  return { good, zoneId, buyPrice, sellPrice, trend, pctDelta };
}

export function buyRegionalTradeGood(
  state: PlayerState,
  goodId: RegionalTradeGoodId,
  zoneId: RegionalMarketZoneId,
  quantity = 1,
  now = Date.now()
): { state: PlayerState; ok: boolean; message: string } {
  const qty = Math.max(1, Math.min(10, Math.floor(quantity)));
  const quote = getRegionalQuoteForZone(goodId, zoneId, now);
  const totalCost = quote.buyPrice * qty;
  if (state.currencies.coins < totalCost) {
    return {
      state,
      ok: false,
      message: `Need ${totalCost.toLocaleString()} Coins to buy ${qty}× ${quote.good.name}.`,
    };
  }

  const cargo = { ...(state.regionalCargo ?? {}) };
  const currentTotal = Object.values(cargo).reduce((a, b) => a + (b || 0), 0);
  if (currentTotal + qty > 20) {
    return { state, ok: false, message: 'Trade Pack full (max 20 regional crates). Sell your cargo first!' };
  }
  cargo[goodId] = (cargo[goodId] ?? 0) + qty;
  const nextCoins = state.currencies.coins - totalCost;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      regionalCargo: cargo,
    },
    ok: true,
    message: `🛶 Bought ${qty}× ${quote.good.icon} ${quote.good.name} (-${totalCost.toLocaleString()}c)! Sell at ${quote.good.highDemandLabel} for High Demand profit!`,
  };
}

export function sellRegionalTradeGood(
  state: PlayerState,
  goodId: RegionalTradeGoodId,
  zoneId: RegionalMarketZoneId,
  quantity = 1,
  now = Date.now()
): { state: PlayerState; ok: boolean; message: string; droppedAbacus?: boolean } {
  const cargo = { ...(state.regionalCargo ?? {}) };
  const owned = cargo[goodId] ?? 0;
  if (owned <= 0) {
    return { state, ok: false, message: `You are not carrying any ${REGIONAL_TRADE_GOODS[goodId].name}.` };
  }
  const qty = Math.max(1, Math.min(owned, Math.floor(quantity)));
  const quote = getRegionalQuoteForZone(goodId, zoneId, now);
  const revenue = quote.sellPrice * qty;
  const merchantXpGain = (quote.trend === 'high_demand' ? 35 : 14) * qty;

  cargo[goodId] = owned - qty;
  if (cargo[goodId] <= 0) delete cargo[goodId];

  const nextCoins = state.currencies.coins + revenue;
  const nextMerchantXp = (state.merchantXp ?? 0) + merchantXpGain;
  const nextInv = state.inventory.map((i) => ({ ...i }));

  const alreadyHasAbacus = nextInv.some((i) => i.itemId === 'acc_golden_abacus' && i.quantity > 0);
  let droppedAbacus = false;
  if (
    !alreadyHasAbacus &&
    quote.trend === 'high_demand' &&
    (nextMerchantXp >= 100 || Math.random() < 0.22)
  ) {
    droppedAbacus = true;
    nextInv.push({ itemId: 'acc_golden_abacus', quantity: 1, itemLevel: 1, quality: 'normal' });
  }

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      inventory: nextInv,
      regionalCargo: cargo,
      merchantXp: nextMerchantXp,
    },
    ok: true,
    droppedAbacus,
    message: droppedAbacus
      ? `💰 HIGH DEMAND SALE! Sold ${qty}× ${quote.good.name} (+${revenue.toLocaleString()}c, +${merchantXpGain} Merchant XP) & FOUND 🧮 Golden Abacus Vanity Accessory!`
      : `💰 Sold ${qty}× ${quote.good.icon} ${quote.good.name} (+${revenue.toLocaleString()}c · +${merchantXpGain} Merchant XP${quote.trend === 'high_demand' ? ' · ▲ HIGH DEMAND!' : ''})`,
  };
}
