import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  KHLENG_EK_KITE_LIST,
  type KhlengEkKiteId,
} from '@shared/kitesAndParties';
import { Coins, Gem, Sparkles, Wind } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface KiteWorkshopModalProps {
  open: boolean;
  player: PlayerState;
  onCraftOrSelectKite: (kiteId: KhlengEkKiteId) => void;
  onLaunchFlight: (kiteId: KhlengEkKiteId) => void;
  onClose: () => void;
}

export const KiteWorkshopModal: React.FC<KiteWorkshopModalProps> = ({
  open,
  player,
  onCraftOrSelectKite,
  onLaunchFlight,
  onClose,
}) => {
  const owned = new Set(player.ownedKites ?? []);
  const activeKiteId = (player.activeKiteId as KhlengEkKiteId | undefined) ?? 'kite_classic_bamboo';
  const hasFloatingVanity = player.inventory.some(
    (i) => i.itemId === 'wings_floating_khleng_ek' && i.quantity > 0
  );

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🪁 Khleng Ek Singing Kite Workshop (រោងជាងខ្លែងឯក)"
      subtitle="Craft a traditional Cambodian singing kite & glide through sunset wind thermals!"
      maxWidthClass="w-[min(95vw,740px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950 via-orange-950 to-amber-900 text-amber-50 border-2 border-amber-400/75 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display font-extrabold text-sm text-yellow-200 flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-300" /> Sunset Wind-Gliding Rewards
            </div>
            <div className="text-[11px] text-amber-100/90 mt-0.5">
              Hold <strong>[SPACE]</strong> or Touch to climb wind currents, collect glowing Wind Chime Rings, and hear the bamboo reed hum!
              Earns <strong>Coins</strong>, <strong>Foraging XP</strong> &amp; the equippable{' '}
              <strong>🪁 Floating Khleng Ek</strong> back-slot vanity!
            </div>
          </div>
          {hasFloatingVanity && (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-display font-bold text-[11px]">
              ✨ Floating Khleng Ek Unlocked!
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-2.5">
          {KHLENG_EK_KITE_LIST.map((kite) => {
            const isOwned = owned.has(kite.id);
            const isEquipped = isOwned && activeKiteId === kite.id;
            return (
              <div
                key={kite.id}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-2.5 ${
                  isEquipped
                    ? 'bg-amber-100 border-amber-600 shadow-md'
                    : 'bg-amber-50/95 border-amber-900/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl leading-none">{kite.icon}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        kite.rarity === 'legendary'
                          ? 'bg-orange-500 text-white'
                          : kite.rarity === 'epic'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-200 text-amber-950'
                      }`}
                    >
                      {kite.rarity}
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-sm text-amber-950 mt-1.5">
                    {kite.name}
                  </div>
                  <div className="text-[10px] font-bold text-amber-700">{kite.khmerName}</div>
                  <p className="text-[10px] text-amber-900/85 mt-1 leading-snug">{kite.description}</p>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-amber-900/15">
                  <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Lift {Math.round(kite.liftBonus * 100)}% · Score {kite.scoreMult}×
                  </div>
                  {isOwned ? (
                    <button
                      type="button"
                      onClick={() => {
                        onCraftOrSelectKite(kite.id);
                        onClose();
                        onLaunchFlight(kite.id);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-2 border-amber-950 font-display font-extrabold text-xs cursor-pointer"
                    >
                      🪁 Launch Sunset Flight!
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCraftOrSelectKite(kite.id)}
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 border-2 border-amber-950 font-display font-bold text-xs inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {kite.costCoins ? (
                        <>
                          <Coins className="w-3.5 h-3.5 text-yellow-300" /> Craft ({kite.costCoins}c)
                        </>
                      ) : (
                        <>
                          <Gem className="w-3.5 h-3.5 text-sky-300" /> Unlock ({kite.costDiamonds} 💎)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
