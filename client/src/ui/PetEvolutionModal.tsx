import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PetEvolutionStage, PlayerState } from '@shared/types';
import {
  MAX_PET_LEVEL,
  MYTHIC_EVOLVE_DIAMOND_COST,
  MYTHIC_EVOLVE_ESSENCE_COST,
  MYTHIC_EVOLVE_PEARL_COST,
  PET_STAGE_2_LEVEL,
  PET_STAGE_3_LEVEL,
  PET_STAGE_META,
  countBossEssences,
  countSeaPearls,
  evolvePetToMythic,
  feedPetWithItem,
  getPetFoodXp,
  getPetProgress,
  xpForNextPetLevel,
} from '@shared/petEvolution';
import { Award, CheckCircle2, Heart, Sparkles, Star, Utensils } from 'lucide-react';
import { ITEM_CATALOG } from '../data/items';
import { drawPetToCanvas } from '../game/entities/Pet';
import { EventBus } from '../game/EventBus';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface PetEvolutionModalProps {
  open: boolean;
  playerState: PlayerState;
  initialPetId?: string | null;
  onClose: () => void;
  onUpdateState: (nextState: PlayerState) => void;
  onEquipPet: (petId: string) => void;
  onToast: (msg: string) => void;
}

const PetStageCanvas: React.FC<{ petId: string; stage: PetEvolutionStage; burstKey: number }> = ({
  petId,
  stage,
  burstKey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const render = (t: number) => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          drawPetToCanvas(ctx, petId, c.width / 2, c.height / 2 + 4, 2.35, t, stage);
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [petId, stage]);

  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-b from-slate-900 via-indigo-950/70 to-slate-950 shadow-inner">
      <canvas ref={canvasRef} width={150} height={150} className="h-36 w-36" />
      {burstKey > 0 && (
        <div
          key={burstKey}
          className="pointer-events-none absolute inset-0 animate-ping rounded-2xl border-2 border-amber-300 bg-amber-300/20"
        />
      )}
    </div>
  );
};

export const PetEvolutionModal: React.FC<PetEvolutionModalProps> = ({
  open,
  playerState,
  initialPetId,
  onClose,
  onUpdateState,
  onEquipPet,
  onToast,
}) => {
  const ownedPets = useMemo(() => {
    const ids = new Set<string>();
    for (const item of playerState.inventory) {
      if (item.quantity > 0 && ITEM_CATALOG[item.itemId]?.slot === 'pet') {
        ids.add(item.itemId);
      }
    }
    if (playerState.loadout.pet && ITEM_CATALOG[playerState.loadout.pet]) {
      ids.add(playerState.loadout.pet);
    }
    return Array.from(ids).map((id) => ITEM_CATALOG[id]!);
  }, [playerState.inventory, playerState.loadout.pet]);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCelebrationMsg(null);
    if (initialPetId && ownedPets.some((p) => p.id === initialPetId)) {
      setSelectedPetId(initialPetId);
    } else if (playerState.loadout.pet && ownedPets.some((p) => p.id === playerState.loadout.pet)) {
      setSelectedPetId(playerState.loadout.pet);
    } else {
      setSelectedPetId(ownedPets[0]?.id ?? null);
    }
  }, [open, initialPetId, ownedPets, playerState.loadout.pet]);

  const feedableItems = useMemo(() => {
    return playerState.inventory
      .filter((item) => item.quantity > 0 && getPetFoodXp(item.itemId) > 0)
      .map((item) => {
        const def = ITEM_CATALOG[item.itemId];
        const baseXp = getPetFoodXp(item.itemId);
        const xp = item.quality === 'gold_star' ? Math.round(baseXp * 1.35) : baseXp;
        return {
          ...item,
          name: def?.name ?? item.itemId,
          xp,
        };
      })
      .sort((a, b) => b.xp - a.xp);
  }, [playerState.inventory]);

  if (!open) return null;

  const activePet = selectedPetId ? ITEM_CATALOG[selectedPetId] : null;
  const progress = getPetProgress(playerState, selectedPetId);
  const stageMeta = PET_STAGE_META[progress.stage];
  const nextNeed = xpForNextPetLevel(progress.level);
  const xpPct =
    progress.level >= MAX_PET_LEVEL
      ? 100
      : Math.min(100, Math.round((progress.xp / Math.max(1, nextNeed)) * 100));

  const essencesOwned = countBossEssences(playerState.inventory);
  const pearlsOwned = countSeaPearls(playerState.inventory);
  const canMythicMaterials =
    progress.level >= PET_STAGE_3_LEVEL &&
    progress.stage < 3 &&
    essencesOwned >= MYTHIC_EVOLVE_ESSENCE_COST &&
    pearlsOwned >= MYTHIC_EVOLVE_PEARL_COST;
  const canMythicDiamonds =
    progress.level >= PET_STAGE_3_LEVEL &&
    progress.stage < 3 &&
    playerState.currencies.diamonds >= MYTHIC_EVOLVE_DIAMOND_COST;

  const handleFeed = (foodItemId: string, qty = 1) => {
    if (!selectedPetId || !activePet) return;
    const res = feedPetWithItem(playerState, selectedPetId, foodItemId, qty);
    if (!res.ok || !res.nextState) {
      onToast(res.error || 'Could not feed pet.');
      return;
    }
    onUpdateState(res.nextState);
    soundManager.playSfx(res.evolvedToStage ? 'victory' : 'click');

    if (res.evolvedToStage === 2) {
      setBurstKey((k) => k + 1);
      setCelebrationMsg(
        `✨ EVOLUTION! ${activePet.name} ascended to Stage 2 · Adult (1.2x Size, Sparkle Trail & +25% Auto-Pickup Radius)!`
      );
      EventBus.emit('pet:evolved', { petId: selectedPetId, newStage: 2 });
      onToast(`🌟 ${activePet.name} evolved to Stage 2 · Adult!`);
    } else if (res.levelsGained > 0) {
      onToast(
        `🐾 ${activePet.name} gained +${res.xpGained} XP → Lv.${res.progress.level}!`
      );
    } else {
      onToast(`🍽️ Fed ${activePet.name} (+${res.xpGained} Pet XP)`);
    }
  };

  const handleMythicEvolve = (method: 'materials' | 'diamonds') => {
    if (!selectedPetId || !activePet) return;
    const res = evolvePetToMythic(playerState, selectedPetId, method);
    if (!res.ok || !res.nextState) {
      onToast(res.error || 'Cannot evolve yet.');
      return;
    }
    onUpdateState(res.nextState);
    soundManager.playSfx('victory');
    setBurstKey((k) => k + 1);
    setCelebrationMsg(
      `👑 MYTHIC ASCENSION! ${activePet.name} evolved to Stage 3 · Mythic (1.35x Size, WebGL Bloom Aura, Orbiting Runes & +10% Overworld Regen)!`
    );
    EventBus.emit('pet:evolved', { petId: selectedPetId, newStage: 3 });
    EventBus.emit('ticker:push', {
      text: `🐾 ${playerState.name}'s ${activePet.name} ascended to Stage 3 MYTHIC Form!`,
      category: 'reforge',
    });
    onToast(`👑 ${activePet.name} ascended to Stage 3 · MYTHIC!`);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🐾 Pet Evolution & Feeding Sanctuary (វិវត្តន៍សត្វចិញ្ចឹម)"
      maxWidthClass="max-w-4xl"
    >
      {ownedPets.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6 text-center">
          <div className="text-3xl">🐶</div>
          <h3 className="mt-2 text-base font-black text-amber-200">No Companion Pets Owned Yet</h3>
          <p className="mt-1 text-xs text-slate-300">
            Adopt a free Coin pet (Village Puppy, Baby Water Buffalo, Golden Frog) at the{' '}
            <b>Fashion Boutique</b> or unlock a prestige pet at the <b>Diamond Store</b> to raise and evolve it
            through all 3 Stages!
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                EventBus.emit('ui:openModal', { modal: 'fashionShop' });
              }}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400"
            >
              🛍️ Visit Fashion Boutique (Coin Pets)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Left: Owned Pets Selector + Preview */}
          <div className="space-y-3 md:col-span-5">
            <div className="flex flex-wrap gap-1.5">
              {ownedPets.map((pet) => {
                const pProg = getPetProgress(playerState, pet.id);
                const selected = pet.id === selectedPetId;
                const equipped = playerState.loadout.pet === pet.id;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => {
                      setSelectedPetId(pet.id);
                      setCelebrationMsg(null);
                    }}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                      selected
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                        : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold">
                      {pet.name} {equipped ? '✓' : ''}
                    </div>
                    <div className="text-[10px] text-amber-300/90">
                      Lv.{pProg.level} · Stage {pProg.stage}
                    </div>
                  </button>
                );
              })}
            </div>

            {activePet && (
              <div className="flex flex-col items-center rounded-2xl border border-amber-500/35 bg-slate-900/90 p-4 text-center">
                <PetStageCanvas petId={activePet.id} stage={progress.stage} burstKey={burstKey} />

                <div className="mt-3 text-base font-black text-white">{activePet.name}</div>
                <div
                  className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black text-slate-950"
                  style={{ backgroundColor: stageMeta.accentHex }}
                >
                  <Sparkles className="h-3 w-3" />
                  {stageMeta.title} ({stageMeta.khmerTitle})
                </div>

                {/* Level & XP Bar */}
                <div className="mt-3 w-full">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-300">Level {progress.level} / {MAX_PET_LEVEL}</span>
                    <span className="text-slate-300">
                      {progress.level >= MAX_PET_LEVEL
                        ? 'MAX LEVEL'
                        : `${progress.xp} / ${nextNeed} XP`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-yellow-300 transition-all duration-300"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>

                {/* Equip Button */}
                <div className="mt-3 flex w-full gap-2">
                  {playerState.loadout.pet === activePet.id ? (
                    <div className="flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-400/50 bg-emerald-500/15 py-1.5 text-xs font-extrabold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Currently Following You
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEquipPet(activePet.id)}
                      className="w-full rounded-lg bg-emerald-500 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-400"
                    >
                      Equip as Active Companion
                    </button>
                  )}
                </div>

                {/* 3-Stage Roadmap */}
                <div className="mt-3 w-full space-y-1.5 text-left">
                  {([1, 2, 3] as PetEvolutionStage[]).map((st) => {
                    const m = PET_STAGE_META[st];
                    const unlocked = progress.stage >= st;
                    return (
                      <div
                        key={st}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                          unlocked
                            ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between font-extrabold">
                          <span>{m.title}</span>
                          <span className="text-[10px]">{m.levelRange}</span>
                        </div>
                        <div className="text-[10px] opacity-90">{m.perkSummary}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Feeding Tray & Stage 3 Mythic Evolution */}
          <div className="space-y-3 md:col-span-7">
            {celebrationMsg && (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-cyan-500/25 p-3 text-xs font-extrabold text-amber-100 shadow-lg">
                {celebrationMsg}
              </div>
            )}

            {/* Feed Pet from Container */}
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3.5">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-black text-amber-200">
                  <Utensils className="h-4 w-4 text-amber-400" />
                  Feed Companion (Crops, Khmer Snacks & Fish)
                </h4>
                <span className="text-[10px] font-bold text-slate-400">
                  Lv.{PET_STAGE_2_LEVEL} → Stage 2 Adult · Zero P2W Combat Damage
                </span>
              </div>

              {feedableItems.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-400">
                  No crops, snacks, or fish in your Container! Harvest rice at your Farm, buy street snacks on
                  Market Street, or fish at Green Park / Koh Rong Island.
                </div>
              ) : (
                <div className="mt-2.5 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {feedableItems.map((food) => (
                    <div
                      key={`${food.itemId}_${food.quality ?? 'normal'}`}
                      className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-white">
                          {food.name}
                          {food.quality === 'gold_star' && (
                            <Star className="ml-1 inline h-3 w-3 text-amber-400" />
                          )}
                        </div>
                        <div className="text-[10px] font-semibold text-sky-300">
                          +{food.xp} XP · Owned: x{food.quantity}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={progress.level >= MAX_PET_LEVEL}
                          onClick={() => handleFeed(food.itemId, 1)}
                          className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40"
                        >
                          Feed 1
                        </button>
                        {food.quantity >= 3 && (
                          <button
                            type="button"
                            disabled={progress.level >= MAX_PET_LEVEL}
                            onClick={() => handleFeed(food.itemId, Math.min(5, food.quantity))}
                            className="rounded-md border border-amber-400/60 bg-amber-500/15 px-1.5 py-1 text-[10px] font-extrabold text-amber-200 hover:bg-amber-500/25 disabled:opacity-40"
                          >
                            x{Math.min(5, food.quantity)}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 3 Mythic Ascension Panel */}
            <div className="rounded-xl border border-amber-500/45 bg-gradient-to-br from-amber-950/50 via-slate-900 to-cyan-950/40 p-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-black text-amber-300">
                  <Award className="h-4 w-4 text-amber-400" />
                  Stage 3 · Mythic Evolution (Lv. {PET_STAGE_3_LEVEL})
                </h4>
                {progress.stage === 3 && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                    ASCENDED ★
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Unlocks <b>1.35x Majestic Size</b>, glowing <b>WebGL Bloom Aura</b>, <b>Orbiting Floating Runes</b>,{' '}
                <b>Wide Auto-Loot Magnet</b>, and <b>+10% Passive Energy/HP Regen</b> in Overworld (100% fair — zero
                combat damage P2W).
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!canMythicMaterials}
                  onClick={() => handleMythicEvolve('materials')}
                  className="flex flex-col items-center justify-center rounded-xl border border-amber-400/60 bg-amber-500/20 px-3 py-2.5 text-center transition hover:bg-amber-500/30 disabled:opacity-45"
                >
                  <span className="text-xs font-black text-amber-200">
                    ✨ Evolve with F2P Materials
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold text-slate-200">
                    Boss Essence: {essencesOwned}/{MYTHIC_EVOLVE_ESSENCE_COST} · Sea Pearl: {pearlsOwned}/
                    {MYTHIC_EVOLVE_PEARL_COST}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!canMythicDiamonds}
                  onClick={() => handleMythicEvolve('diamonds')}
                  className="flex flex-col items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-3 py-2.5 text-center transition hover:bg-cyan-500/30 disabled:opacity-45"
                >
                  <span className="text-xs font-black text-cyan-200">
                    💎 Evolve with {MYTHIC_EVOLVE_DIAMOND_COST} Diamonds
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold text-slate-200">
                    Your Diamonds: {playerState.currencies.diamonds} 💎
                  </span>
                </button>
              </div>
              {progress.level < PET_STAGE_3_LEVEL && (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-200/80">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  Feed {activePet?.name} up to Lv.{PET_STAGE_3_LEVEL} to unlock Mythic Ascension!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
