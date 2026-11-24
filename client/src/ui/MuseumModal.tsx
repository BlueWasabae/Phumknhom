import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  MUSEUM_EXHIBITS,
  MUSEUM_WINGS,
  SCHOLAR_PERK_TIERS,
  getMuseumScholarPerks,
  type MuseumWingId,
} from '@shared/museumCatalog';
import { CheckCircle2, Landmark, Sparkles } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface MuseumModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onDonateItem: (itemId: string) => void;
}

export const MuseumModal: React.FC<MuseumModalProps> = ({
  open,
  player,
  onClose,
  onDonateItem,
}) => {
  const [activeWing, setActiveWing] = useState<MuseumWingId>('ancient_relics');
  const donatedSet = new Set(player.museumDonations ?? []);
  const perks = getMuseumScholarPerks(player.museumDonations);

  const countOwned = (itemId: string) =>
    player.inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);

  const wingExhibits = MUSEUM_EXHIBITS.filter((ex) => ex.wing === activeWing);
  const currentWingDef = MUSEUM_WINGS.find((w) => w.id === activeWing) ?? MUSEUM_WINGS[0];

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏛️ Angkor Relic Museum · សារមន្ទីរវត្ថុបុរាណអង្គរ"
      subtitle={`Curated Exhibits: ${perks.donatedCount} / ${perks.totalExhibits} · Donate 1× from Container to unlock permanent Account-Wide Scholar Perks`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs max-h-[74dvh] overflow-y-auto pr-1">
        {/* Account-Wide Scholar Perks Progress */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950 via-stone-900 to-emerald-950 text-amber-50 border-2 border-amber-400/75 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
              <Landmark className="w-4 h-4" />
              <span>Account-Wide Scholar Perks ({perks.donatedCount} / {perks.totalExhibits} Exhibits)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-200 font-bold text-[10px]">
              +120 Coins per Donation
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            {SCHOLAR_PERK_TIERS.map((tier) => {
              const unlocked = perks.donatedCount >= tier.threshold;
              return (
                <div
                  key={tier.threshold}
                  className={`p-2 rounded-xl border transition ${
                    unlocked
                      ? 'bg-emerald-900/70 border-emerald-400 text-emerald-50'
                      : 'bg-slate-900/65 border-amber-500/30 text-amber-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-display font-bold text-[11px]">
                    <span>
                      {tier.icon} {tier.threshold} Donations
                    </span>
                    {unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                  </div>
                  <div className="text-[10px] font-semibold mt-0.5">{tier.summary}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 Museum Wing Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          {MUSEUM_WINGS.map((wing) => {
            const wingItems = MUSEUM_EXHIBITS.filter((e) => e.wing === wing.id);
            const wingDone = wingItems.filter((e) => donatedSet.has(e.itemId)).length;
            const wingReady = wingItems.some((e) => !donatedSet.has(e.itemId) && countOwned(e.itemId) > 0);
            const active = activeWing === wing.id;
            return (
              <button
                key={wing.id}
                type="button"
                onClick={() => setActiveWing(wing.id)}
                className={`p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                  active
                    ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-900/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display font-bold text-xs truncate">
                    {wing.icon} {wing.title}
                  </span>
                  {wingReady && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold animate-pulse">
                      NEW
                    </span>
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 ${active ? 'text-amber-200' : 'text-amber-800'}`}>
                  {wingDone} / {wingItems.length} Donated
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-semibold text-amber-900 px-1">
          {currentWingDef.icon} <strong>{currentWingDef.title}</strong> ({currentWingDef.khmerTitle}) —{' '}
          {currentWingDef.subtitle}
        </div>

        {/* Glowing Display Cases */}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {wingExhibits.map((ex) => {
            const donated = donatedSet.has(ex.itemId);
            const ownedQty = countOwned(ex.itemId);

            return (
              <div
                key={ex.id}
                className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2 transition ${
                  donated
                    ? 'bg-gradient-to-br from-emerald-50 via-amber-50 to-yellow-50 border-emerald-600 shadow-sm'
                    : ownedQty > 0
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/50'
                      : 'bg-stone-100/90 border-stone-300 text-stone-600'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-2xl shrink-0 ${
                      donated
                        ? 'bg-amber-100 border-emerald-600 shadow-inner'
                        : ownedQty > 0
                          ? 'bg-amber-100 border-amber-500'
                          : 'bg-stone-200 border-stone-400 grayscale opacity-60'
                    }`}
                  >
                    {ex.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-bold text-xs text-amber-950 truncate">
                        {ex.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          donated
                            ? 'bg-emerald-700 text-white'
                            : ownedQty > 0
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-300 text-stone-700'
                        }`}
                      >
                        {donated ? 'On Display' : `Bag ×${ownedQty}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-800 font-semibold">{ex.khmerName}</div>
                    <p className="text-[10px] text-amber-950/85 leading-snug mt-1">
                      {donated ? ex.lore : `Found via: ${ex.sourceHint}`}
                    </p>
                  </div>
                </div>

                {donated ? (
                  <div className="py-1.5 px-2.5 rounded-lg bg-emerald-700/15 border border-emerald-600/40 text-emerald-900 font-display font-bold text-[11px] flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Illuminated in Display Case
                  </div>
                ) : ownedQty > 0 ? (
                  <button
                    type="button"
                    onClick={() => onDonateItem(ex.itemId)}
                    className="w-full phum-btn py-1.5 rounded-xl font-display font-bold text-xs cursor-pointer"
                  >
                    🏛️ Donate 1× to Museum (+120 Coins)
                  </button>
                ) : (
                  <div className="text-center py-1 rounded-lg bg-stone-200/80 text-stone-600 font-bold text-[10px]">
                    Collect in {ex.sourceHint}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
