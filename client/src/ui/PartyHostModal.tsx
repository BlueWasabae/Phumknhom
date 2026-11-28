import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  PARTY_ALLOWED_MAPS,
  VILLAGE_PARTY_KIT_LIST,
  type PartyKitId,
} from '@shared/kitesAndParties';
import { Coins, Gem, PartyPopper, Sparkles, Utensils } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface PartyHostModalProps {
  open: boolean;
  player: PlayerState;
  currentLocationId: string;
  currentLocationLabel: string;
  onHostParty: (kitId: PartyKitId) => void;
  onClose: () => void;
}

export const PartyHostModal: React.FC<PartyHostModalProps> = ({
  open,
  player,
  currentLocationId,
  currentLocationLabel,
  onHostParty,
  onClose,
}) => {
  const canHostHere = PARTY_ALLOWED_MAPS.has(currentLocationId);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🎆 Host a Village Firework Party (ពិធីជប់លៀងភូមិ)"
      subtitle="Invite online players with a Server Ticker Banner, Shared Feast Table & synchronized sky fireworks!"
      maxWidthClass="w-[min(95vw,680px)]"
    >
      <div className="space-y-3 text-xs">
        <div
          className={`p-3 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-2 ${
            canHostHere
              ? 'bg-gradient-to-r from-indigo-950 via-purple-950 to-amber-950 text-amber-50 border-amber-400/80'
              : 'bg-rose-50 text-rose-950 border-rose-400'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-display font-extrabold text-sm flex items-center gap-1.5">
              <PartyPopper className="w-4 h-4 text-yellow-300" />
              Location: {currentLocationLabel}
            </div>
            <div className="text-[11px] opacity-90">
              {canHostHere
                ? 'Ready to host! Guests get free +15% Speed & +15% Luck Feast snacks for 5 min · You earn +50 Friendly XP!'
                : 'Travel to Central Plaza, Koh Rong Island, Phnom Kulen Sanctuary, or your Stilt House Farm Yard to host a party!'}
            </div>
          </div>
          <div className="text-[11px] font-bold flex items-center gap-2">
            <span>🪙 {player.currencies.coins.toLocaleString()}c</span>
            <span>💎 {player.currencies.diamonds}</span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-300/40">
              Parties Hosted: {player.partyHostCount ?? 0}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {VILLAGE_PARTY_KIT_LIST.map((kit) => {
            const canAfford = kit.costCoins
              ? player.currencies.coins >= kit.costCoins
              : kit.costDiamonds
                ? player.currencies.diamonds >= kit.costDiamonds
                : true;

            return (
              <div
                key={kit.id}
                className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                  kit.id === 'party_angkor_fireworks'
                    ? 'bg-gradient-to-b from-amber-50 to-purple-50 border-purple-500/70 shadow-sm'
                    : 'bg-amber-50 border-amber-900/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{kit.icon}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-900 text-amber-100 font-bold text-[10px]">
                      {kit.fireworkShells} Synchronized Fireworks
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-sm text-amber-950 mt-1.5">
                    {kit.name}
                  </div>
                  <div className="text-[10px] font-bold text-amber-700">{kit.khmerName}</div>
                  <p className="text-[11px] text-amber-900/90 mt-1.5 leading-snug">{kit.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-emerald-800">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100">
                      <Utensils className="w-3 h-3" /> 5m Shared Feast (+15% Spd &amp; Luck)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                      <Sparkles className="w-3 h-3" /> +50 Friendly XP
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canHostHere || !canAfford}
                  onClick={() => {
                    onHostParty(kit.id);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 disabled:opacity-45 text-white border-2 border-amber-950 font-display font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {kit.costCoins ? (
                    <>
                      <Coins className="w-3.5 h-3.5 text-yellow-200" /> Host Party ({kit.costCoins}c)
                    </>
                  ) : (
                    <>
                      <Gem className="w-3.5 h-3.5 text-sky-200" /> Launch Grand Show ({kit.costDiamonds} 💎)
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
