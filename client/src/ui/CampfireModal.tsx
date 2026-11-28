import React, { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  CAMPFIRE_COOKING_RECIPES,
  type CampfireRecipeDef,
  type WildernessCampfireDef,
} from '@shared/artisanCrafts';
import { Flame, Heart, MapPin, UtensilsCrossed, CheckCircle2, Sparkles } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface CampfireModalProps {
  open: boolean;
  campfire: WildernessCampfireDef | null;
  player: PlayerState;
  onClose: () => void;
  onRestComplete: (campfire: WildernessCampfireDef) => void;
  onCookRecipe: (recipe: CampfireRecipeDef, consumedItemId: string) => void;
  onSetRespawn: (campfire: WildernessCampfireDef) => void;
}

export const CampfireModal: React.FC<CampfireModalProps> = ({
  open,
  campfire,
  player,
  onClose,
  onRestComplete,
  onCookRecipe,
  onSetRespawn,
}) => {
  const [resting, setResting] = useState(false);
  const [restPct, setRestPct] = useState(0);
  const onRestCompleteRef = useRef(onRestComplete);
  onRestCompleteRef.current = onRestComplete;
  const campfireRef = useRef(campfire);
  campfireRef.current = campfire;

  useEffect(() => {
    if (!open) {
      setResting(false);
      setRestPct(0);
    }
  }, [open]);

  useEffect(() => {
    if (!resting || !campfireRef.current) return;
    const start = Date.now();
    const duration = 4000;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setRestPct(pct);
      if (elapsed >= duration) {
        window.clearInterval(id);
        setResting(false);
        setRestPct(0);
        if (campfireRef.current) {
          onRestCompleteRef.current(campfireRef.current);
        }
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [resting, campfire?.id]);

  if (!campfire) return null;

  const effectiveMaxHp = computeVillageToDungeonBridge(player).effectiveMaxHp;
  const isRespawnSetHere =
    player.campfireRespawn?.mapId === campfire.mapId &&
    player.campfireRespawn?.label === campfire.label;

  const findMatchingIngredient = (match: CampfireRecipeDef['ingredientMatch']): string | null => {
    if (match === 'egg') {
      const found = player.inventory.find((i) => i.itemId === 'drop_fresh_egg' && i.quantity > 0);
      return found?.itemId ?? null;
    }
    if (match === 'fish') {
      const fish = player.inventory.find((i) => i.itemId.startsWith('fish_') && i.quantity > 0);
      if (fish) return fish.itemId;
      const egg = player.inventory.find((i) => i.itemId === 'drop_fresh_egg' && i.quantity > 0);
      return egg?.itemId ?? null;
    }
    const herb = player.inventory.find(
      (i) =>
        (i.itemId.startsWith('crop_') || i.itemId.includes('orchid') || i.itemId.includes('herb')) &&
        i.quantity > 0
    );
    return herb?.itemId ?? null;
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={`🔥 ${campfire.label}`}
      subtitle={`${campfire.khmerLabel} · Wilderness Campfire Outpost · HP ${player.hp}/${effectiveMaxHp}`}
      maxWidthClass="w-[min(95vw,700px)]"
    >
      {/* Top 2 Action Cards: Rest & Recover (4s) + Set Temporary Respawn */}
      <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-950 via-amber-950 to-slate-950 text-amber-50 border-2 border-amber-500/60 space-y-2">
          <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-400" /> Rest & Recover by the Fire
          </div>
          <p className="text-[11px] text-amber-100/85">
            Sit beside the warm crackling embers for 4 seconds to restore <strong>100% HP & Energy</strong>.
          </p>
          {resting ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-amber-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-pulse" /> Warming by the embers...
                </span>
                <span>{restPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-amber-900 border border-amber-400/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${restPct}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResting(true)}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs border-2 border-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-4 h-4" /> Rest & Restore 100% HP (4s)
            </button>
          )}
        </div>

        <div className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 flex flex-col justify-between gap-2">
          <div>
            <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700" /> Temporary Wilderness Respawn
            </div>
            <p className="text-[11px] text-amber-900/85 mt-0.5">
              Bind this lit Campfire as your safe checkpoint — if defeated by a wild boss, you respawn right here instead of Central Plaza!
            </p>
          </div>
          {isRespawnSetHere ? (
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-950">
              <CheckCircle2 className="w-4 h-4" /> Active Respawn Checkpoint Set Here
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSetRespawn(campfire)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs border-2 border-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-4 h-4" /> Set Temporary Respawn Here
            </button>
          )}
        </div>
      </div>

      {/* Field Cooking Section */}
      <div className="space-y-2">
        <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
          <UtensilsCrossed className="w-4 h-4 text-orange-700" /> Field Cooking — Exploration Buffs
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {CAMPFIRE_COOKING_RECIPES.map((rec) => {
            const matchedId = findMatchingIngredient(rec.ingredientMatch);
            return (
              <div
                key={rec.id}
                className="p-2.5 rounded-xl bg-amber-50 border-2 border-amber-900/30 flex flex-col justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1">
                    <span className="text-base">{rec.icon}</span>
                    <span>{rec.name}</span>
                  </div>
                  <div className="text-[10px] text-amber-800">{rec.khmerName}</div>
                  <p className="text-[10px] text-amber-900/85 leading-snug">{rec.description}</p>
                  <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-950">
                    Needs: {rec.ingredientLabel}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!matchedId}
                  onClick={() => matchedId && onCookRecipe(rec, matchedId)}
                  className={`w-full py-1.5 px-2 rounded-lg font-display font-bold text-[11px] border ${
                    matchedId
                      ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-950 cursor-pointer'
                      : 'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed'
                  }`}
                >
                  {matchedId ? `Cook (+${rec.cookingXp} Cooking XP)` : 'Need Ingredients'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
