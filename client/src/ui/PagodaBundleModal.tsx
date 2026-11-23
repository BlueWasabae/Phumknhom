import React from 'react';
import type { PlayerState } from '@shared/types';
import { CheckCircle2, Gift, Sparkles } from 'lucide-react';
import {
  PAGODA_ALTARS,
  getCompletedAltarCount,
  isAltarCompleted,
} from '../data/pagodaBundles';
import { countInventoryAnyQuality } from '../data/recipes';
import { NativeDialog } from './NativeDialog';

interface PagodaBundleModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onDonateItem: (altarId: string, itemId: string) => void;
}

export const PagodaBundleModal: React.FC<PagodaBundleModalProps> = ({
  open,
  player,
  onClose,
  onDonateItem,
}) => {
  const completedCount = getCompletedAltarCount(player);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Ancient Pagoda Restoration · 6 Offering Altars"
      subtitle={`Restored ${completedCount} / ${PAGODA_ALTARS.length} Altars · Donate items from Container to unlock permanent village perks!`}
      maxWidthClass="w-[min(96vw,820px)]"
    >
      <div className="grid md:grid-cols-2 gap-2.5 max-h-[64dvh] overflow-y-auto pr-1 text-xs">
        {PAGODA_ALTARS.map((altar) => {
          const donated = player.pagodaBundles?.[altar.id] ?? [];
          const done = isAltarCompleted(player, altar.id);

          return (
            <div
              key={altar.id}
              className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                done
                  ? 'bg-emerald-50/95 border-emerald-700 ring-1 ring-emerald-400'
                  : 'bg-amber-50/95 border-amber-900/35'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-9 h-9 rounded-xl border-2 border-amber-950/25 flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${altar.accentColor}22` }}
                    >
                      {altar.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs text-amber-950 truncate">
                        {altar.name} <span className="font-normal text-amber-800">({altar.khmerName})</span>
                      </div>
                      <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" /> {altar.unlockTitle}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg font-display font-bold text-[10px] shrink-0 ${
                      done ? 'bg-emerald-700 text-white' : 'bg-amber-900/15 text-amber-950'
                    }`}
                  >
                    {done ? 'RESTORED' : `${donated.length}/3`}
                  </span>
                </div>

                <p className="text-[10px] text-amber-900/90 leading-snug">{altar.unlockEffect}</p>

                {/* 3 Offering Slots */}
                <div className="space-y-1 pt-1 border-t border-amber-900/15">
                  {altar.requirements.map((req) => {
                    const isOffered = donated.includes(req.itemId);
                    const ownedQty = countInventoryAnyQuality(player.inventory, req.itemId);

                    return (
                      <div
                        key={req.itemId}
                        className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 ${
                          isOffered
                            ? 'bg-emerald-100/80 border-emerald-600/50 text-emerald-950'
                            : 'bg-white/85 border-amber-900/20 text-amber-950'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-display font-bold text-[11px] truncate">{req.label}</div>
                          {!isOffered && (
                            <div className="text-[9px] font-semibold text-amber-800">
                              In Container: ×{ownedQty}
                            </div>
                          )}
                        </div>

                        {isOffered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Offered
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={ownedQty < 1}
                            onClick={() => onDonateItem(altar.id, req.itemId)}
                            className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-50 font-display font-bold text-[10px] disabled:opacity-40 shrink-0 transition"
                          >
                            Donate 1
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1 pt-0.5">
                <Gift className="w-3.5 h-3.5 text-amber-600" />
                Completion Reward: +{altar.completionCoins} Coins · +{altar.completionGold} Gold
              </div>
            </div>
          );
        })}
      </div>
    </NativeDialog>
  );
};
