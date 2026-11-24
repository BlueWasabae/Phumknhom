import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  getRotatingNightMarketOffers,
  type ActiveWorldEventSnapshot,
  type NightMarketOffer,
} from '@shared/worldEvents';
import { Coins, Clock, Sparkles, Tag } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface NightMarketModalProps {
  open: boolean;
  player: PlayerState;
  activeEvent: ActiveWorldEventSnapshot | null;
  onClose: () => void;
  onBuyOffer: (offer: NightMarketOffer) => void;
}

export const NightMarketModal: React.FC<NightMarketModalProps> = ({
  open,
  player,
  activeEvent,
  onClose,
  onBuyOffer,
}) => {
  const isLive = activeEvent?.eventId === 'khmer_night_market';
  const offers = getRotatingNightMarketOffers(activeEvent?.merchantRotationSeed ?? 1);
  const remSec = Math.max(0, Math.ceil((activeEvent?.remainingMs ?? 0) / 1000));
  const remLabel = `${Math.floor(remSec / 60)}:${remSec % 60 < 10 ? '0' : ''}${remSec % 60}`;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏮 Traveling Tuk-Tuk Merchant · Khmer Night Market"
      subtitle={`Wallet: ${player.currencies.coins.toLocaleString()} Coins · Limited 30–40% Discount Rotating Stock`}
      maxWidthClass="w-[min(95vw,660px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-950 via-amber-900 to-rose-950 text-amber-50 border-2 border-amber-400/80 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {isLive ? 'Khmer Night Market Lanterns Lit!' : 'Night Market Merchant Departing Soon'}
            </div>
            <p className="text-[11px] text-amber-100/90 mt-0.5">
              Grab exotic seeds, Reforge Stones, Eclipse Shards &amp; limited cosmetics before the Tuk-Tuk rolls out!
            </p>
          </div>
          {isLive && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-amber-950 font-display font-bold text-xs inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {remLabel} left
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-2.5">
          {offers.map((offer) => {
            const canAfford = player.currencies.coins >= offer.discountCoins;
            return (
              <div
                key={offer.id}
                className="p-3 rounded-xl bg-amber-50 border-2 border-orange-500/60 flex flex-col justify-between gap-2.5 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <span className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-500/40 flex items-center justify-center text-xl">
                      {offer.icon}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-lg bg-rose-600 text-white font-display font-bold text-[10px] inline-flex items-center gap-0.5">
                      <Tag className="w-2.5 h-2.5" /> -{offer.discountPct}%
                    </span>
                  </div>
                  <div className="font-display font-bold text-xs text-amber-950">{offer.name}</div>
                  <div className="text-[10px] text-amber-800">{offer.khmerName}</div>
                  <p className="text-[10px] text-amber-900/90 leading-snug">{offer.description}</p>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-amber-900/15">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="line-through text-stone-400 font-bold">
                      {offer.originalCoins.toLocaleString()}c
                    </span>
                    <span className="font-display font-bold text-emerald-800 inline-flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-600" />
                      {offer.discountCoins.toLocaleString()}c
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onBuyOffer(offer)}
                    className="w-full phum-btn py-1.5 rounded-xl font-display font-bold text-xs disabled:opacity-45 cursor-pointer"
                  >
                    {canAfford ? 'Buy Discounted' : 'Need More Coins'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
