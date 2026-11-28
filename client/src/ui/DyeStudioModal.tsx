import React, { useMemo, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { OUTFIT_DYE_LIST, type DyeSlot, type OutfitDyeDef } from '@shared/dyeCatalog';
import { Coins, Gem, Palette, RotateCcw, Sparkles, Check } from 'lucide-react';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface DyeStudioModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onUnlockDye: (dye: OutfitDyeDef) => void;
  onEquipDye: (slot: DyeSlot, dyeId: string | null) => void;
}

const DYE_SLOTS: Array<{ id: DyeSlot; label: string; khmer: string; icon: string }> = [
  { id: 'shirt', label: 'Outfit / Tunic', khmer: 'អាវសំលៀកបំពាក់', icon: '👕' },
  { id: 'krama', label: 'Krama Scarf', khmer: 'ក្រមាខ្មែរ', icon: '🧣' },
  { id: 'pants', label: 'Sampot / Pants', khmer: 'សំពត់ / ខោ', icon: '👖' },
  { id: 'wings', label: 'Wings / Aura', khmer: 'ស្លាបទេព', icon: '🪽' },
];

export const DyeStudioModal: React.FC<DyeStudioModalProps> = ({
  open,
  player,
  onClose,
  onUnlockDye,
  onEquipDye,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<DyeSlot>('shirt');
  const [previewDyeId, setPreviewDyeId] = useState<string | null>(null);

  const unlockedSet = useMemo(() => new Set(player.unlockedDyes ?? []), [player.unlockedDyes]);
  const equippedDyes = player.equippedDyes ?? player.loadout.equippedDyes ?? {};
  const activeSlotDyeId = equippedDyes[selectedSlot] ?? null;

  const previewLoadout = useMemo(() => {
    const nextDyes = { ...equippedDyes };
    if (previewDyeId) nextDyes[selectedSlot] = previewDyeId;
    return { ...player.loadout, equippedDyes: nextDyes };
  }, [equippedDyes, player.loadout, previewDyeId, selectedSlot]);

  const botanicalDyes = OUTFIT_DYE_LIST.filter((d) => d.category === 'botanical');
  const prismaticDyes = OUTFIT_DYE_LIST.filter((d) => d.category === 'prismatic');

  const renderDyeCard = (dye: OutfitDyeDef) => {
    const owned = unlockedSet.has(dye.id);
    const equippedHere = activeSlotDyeId === dye.id;
    const isPrismatic = dye.category === 'prismatic';
    const canAfford = isPrismatic
      ? (player.currencies?.diamonds ?? 0) >= dye.diamondCost
      : player.coins >= dye.coinCost;

    return (
      <div
        key={dye.id}
        onMouseEnter={() => setPreviewDyeId(dye.id)}
        onMouseLeave={() => setPreviewDyeId(null)}
        className={`rounded-xl p-2.5 border-2 transition flex flex-col justify-between gap-2 ${
          equippedHere
            ? 'bg-amber-950/70 border-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.35)]'
            : 'bg-slate-900/85 border-slate-700 hover:border-amber-400/70'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-lg border-2 border-white/60 shrink-0 shadow-inner relative"
            style={{
              background: isPrismatic
                ? `linear-gradient(135deg, ${dye.primaryHex}, ${dye.accentHex}, ${dye.primaryHex})`
                : dye.primaryHex,
            }}
          >
            {isPrismatic && (
              <Sparkles className="w-3.5 h-3.5 text-white absolute -top-1 -right-1 drop-shadow" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-xs text-amber-100 truncate">{dye.name}</p>
            <p className="font-khmer text-[10px] text-amber-300 truncate">{dye.khmerName}</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{dye.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          {owned ? (
            <button
              type="button"
              onClick={() => onEquipDye(selectedSlot, equippedHere ? null : dye.id)}
              className={`w-full py-1.5 rounded-lg font-display font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition ${
                equippedHere
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-amber-950'
              }`}
            >
              {equippedHere ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Applied (Click to Remove)
                </>
              ) : (
                <>Apply to {DYE_SLOTS.find((s) => s.id === selectedSlot)?.label}</>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAfford}
              onClick={() => onUnlockDye(dye)}
              className={`w-full py-1.5 rounded-lg font-display font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                canAfford
                  ? isPrismatic
                    ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white hover:brightness-110 cursor-pointer'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isPrismatic ? (
                <>
                  <Gem className="w-3 h-3" /> Unlock {dye.diamondCost} 💎
                </>
              ) : (
                <>
                  <Coins className="w-3 h-3" /> Craft {dye.coinCost} C
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Bopha's Botanical & Prismatic Dye Studio"
      subtitle="ស្ទូឌីយោជ្រលក់ពណ៌សំលៀកបំពាក់ · Live Multiplayer Color Sync"
      maxWidthClass="w-[min(96vw,840px)]"
    >
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* Live Preview & Slot Selector */}
        <div className="rounded-2xl bg-slate-900/90 border border-amber-600/40 p-3 flex flex-col items-center gap-3">
          <div className="rounded-xl bg-gradient-to-b from-amber-950/70 to-slate-950 p-3 border border-amber-500/30 w-full flex flex-col items-center">
            <PaperDollPreview loadout={previewLoadout} />
            <p className="text-[11px] text-amber-200 font-bold mt-1.5">
              Hover any dye to live-preview!
            </p>
          </div>

          <div className="w-full space-y-1.5">
            {DYE_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              const currentId = equippedDyes[slot.id];
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-yellow-300 text-amber-100'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-amber-500/50'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>{slot.icon}</span> {slot.label}
                  </span>
                  {currentId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-200 font-bold">
                      Dyed
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeSlotDyeId && (
            <button
              type="button"
              onClick={() => onEquipDye(selectedSlot, null)}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Slot Color
            </button>
          )}
        </div>

        {/* Botanical & Prismatic Dye Grids */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                <Palette className="w-4 h-4" /> Botanical Dyes (Coins & Foraged Plants)
              </h3>
              <span className="text-[11px] font-bold text-amber-200">
                💰 {player.coins.toLocaleString()} C
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {botanicalDyes.map(renderDyeCard)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs text-fuchsia-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Prismatic & Metallic Dyes (WebGL Bloom Shimmer)
              </h3>
              <span className="text-[11px] font-bold text-cyan-300">
                💎 {(player.currencies?.diamonds ?? 0).toLocaleString()} Diamonds
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {prismaticDyes.map(renderDyeCard)}
            </div>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
