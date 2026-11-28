import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  REGIONAL_MARKET_ZONES,
  REGIONAL_TRADE_GOOD_LIST,
  getPriceCycleWindow,
  getRegionalQuoteForZone,
  resolveRegionalZone,
  type RegionalMarketZoneId,
  type RegionalTradeGoodId,
} from '@shared/regionalTrade';
import { ArrowDownRight, ArrowUpRight, Coins, Compass, Package, Sparkles, Timer } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface FloatingMarketModalProps {
  open: boolean;
  player: PlayerState;
  currentZoneId?: RegionalMarketZoneId;
  onBuyGood: (goodId: RegionalTradeGoodId, zoneId: RegionalMarketZoneId, qty: number) => void;
  onSellGood: (goodId: RegionalTradeGoodId, zoneId: RegionalMarketZoneId, qty: number) => void;
  onTravelToZone?: (zoneId: RegionalMarketZoneId) => void;
  onClose: () => void;
}

export const FloatingMarketModal: React.FC<FloatingMarketModalProps> = ({
  open,
  player,
  currentZoneId,
  onBuyGood,
  onSellGood,
  onTravelToZone,
  onClose,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const zoneId: RegionalMarketZoneId =
    currentZoneId ?? resolveRegionalZone(player.currentMapId, player.zone);

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const { remainingSec } = getPriceCycleWindow(now);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const zoneMeta = REGIONAL_MARKET_ZONES[zoneId];
  const cargo = player.regionalCargo ?? {};
  const totalCargo = Object.values(cargo).reduce((a, b) => a + (b || 0), 0);
  const merchantXp = player.merchantXp ?? 0;
  const merchantLevel = Math.floor(merchantXp / 100) + 1;
  const hasAbacus = player.inventory.some((i) => i.itemId === 'acc_golden_abacus' && i.quantity > 0);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={`${zoneMeta.icon} ${zoneMeta.name}`}
      subtitle={`${zoneMeta.khmerName} · Regional Supply & Demand Trade Broker (Prices shift every 15m)`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Top Merchant Status & 15-Minute Cycle Strip */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-950 via-emerald-950 to-amber-950 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center justify-between gap-2.5 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-300" />
              <span className="font-display font-bold text-sm text-yellow-200">
                {player.currencies.coins.toLocaleString()}c
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-900/80 border border-emerald-400/40">
              <Package className="w-3.5 h-3.5 text-emerald-300" />
              <span className="font-bold">Cargo: {totalCargo} / 20 Crates</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-900/70 border border-amber-400/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-bold">
                Merchant Lv.{merchantLevel} ({merchantXp} XP)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-sky-400/40 text-sky-200">
              <Timer className="w-3.5 h-3.5" /> Next Price Shift: {mins}:{secs < 10 ? '0' : ''}
              {secs}
            </span>
            {hasAbacus ? (
              <span className="px-2 py-0.5 rounded-lg bg-yellow-400 text-amber-950 font-extrabold">
                🧮 Golden Abacus Owned!
              </span>
            ) : (
              <span className="text-[10px] text-amber-200/85">
                Sell High Demand for 🧮 Golden Abacus!
              </span>
            )}
          </div>
        </div>

        {/* 4 Regional Trade Goods Cards */}
        <div className="grid sm:grid-cols-2 gap-2.5 max-h-[54dvh] overflow-y-auto pr-1">
          {REGIONAL_TRADE_GOOD_LIST.map((good) => {
            const quote = getRegionalQuoteForZone(good.id, zoneId, now);
            const owned = cargo[good.id] ?? 0;
            const isHigh = quote.trend === 'high_demand';
            const isSurplus = quote.trend === 'surplus';

            return (
              <div
                key={good.id}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-2.5 ${
                  isHigh
                    ? 'bg-emerald-50 border-emerald-600 shadow-sm'
                    : isSurplus
                      ? 'bg-rose-50/90 border-rose-500/75 shadow-sm'
                      : 'bg-amber-50/95 border-amber-900/25'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                        <span className="text-lg leading-none">{good.icon}</span>
                        <span>{good.name}</span>
                      </div>
                      <div className="text-[10px] font-bold text-amber-700">{good.khmerName}</div>
                    </div>

                    {isHigh ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-display font-extrabold text-[10px] shrink-0">
                        <ArrowUpRight className="w-3 h-3" /> ▲ High Demand (+{Math.max(1, quote.pctDelta)}%)
                      </span>
                    ) : isSurplus ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-600 text-white font-display font-extrabold text-[10px] shrink-0">
                        <ArrowDownRight className="w-3 h-3" /> ▼ Surplus ({quote.pctDelta}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold text-[10px] shrink-0">
                        • Standard Rate
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-amber-900/85 mt-1 leading-snug">{good.description}</p>

                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="px-2 py-1 rounded-lg bg-white/80 border border-amber-900/15">
                      <span className="text-amber-800 block">Local Buy Price</span>
                      <strong className="text-xs text-amber-950">{quote.buyPrice}c</strong>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-white/80 border border-amber-900/15">
                      <span className="text-amber-800 block">Local Sell Price</span>
                      <strong className={`text-xs ${isHigh ? 'text-emerald-700' : 'text-amber-950'}`}>
                        {quote.sellPrice}c
                      </strong>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-rose-700">Cheap: {good.surplusLabel}</span>
                    <span className="text-emerald-700">Best Sell: {good.highDemandLabel}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-amber-900/15">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-950">
                    <span>In Your Cargo: {owned} crate(s)</span>
                    {onTravelToZone && zoneId !== good.highDemandZone && owned > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onTravelToZone(good.highDemandZone);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
                      >
                        <Compass className="w-3 h-3" /> Go Sell at {good.highDemandLabel}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={player.currencies.coins < quote.buyPrice || totalCargo >= 20}
                      onClick={() => onBuyGood(good.id, zoneId, 1)}
                      className="py-1.5 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-45 text-white font-display font-bold text-xs cursor-pointer"
                    >
                      Buy 1× ({quote.buyPrice}c)
                    </button>
                    <button
                      type="button"
                      disabled={owned <= 0}
                      onClick={() => onSellGood(good.id, zoneId, owned > 1 ? owned : 1)}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white font-display font-bold text-xs cursor-pointer"
                    >
                      {owned > 1
                        ? `Sell All ${owned}× (+${(quote.sellPrice * owned).toLocaleString()}c)`
                        : `Sell 1× (+${quote.sellPrice}c)`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Regional Broker Travel Switcher */}
        {onTravelToZone && (
          <div className="p-2 rounded-xl bg-amber-100/90 border border-amber-900/20 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
            <span className="font-bold text-amber-950">🛶 Quick Regional Trade Route Destinations:</span>
            <div className="flex flex-wrap gap-1">
              {(['green_park', 'market_street', 'temple_district', 'koh_rong_island', 'mining_quarry', 'farm_homestead'] as RegionalMarketZoneId[]).map(
                (zid) => (
                  <button
                    key={zid}
                    type="button"
                    disabled={zid === zoneId}
                    onClick={() => {
                      onClose();
                      onTravelToZone(zid);
                    }}
                    className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                      zid === zoneId
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white hover:bg-amber-200 text-amber-950 border border-amber-900/25'
                    }`}
                  >
                    {REGIONAL_MARKET_ZONES[zid].icon} {REGIONAL_MARKET_ZONES[zid].name.split(' (')[0]}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
