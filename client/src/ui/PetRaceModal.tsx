import React, { useMemo, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { getPetProgress, PET_STAGE_META } from '@shared/petEvolution';
import { Flag, Sparkles, Trophy, Zap } from 'lucide-react';
import { ITEM_CATALOG } from '../data/items';
import { NativeDialog } from './NativeDialog';

interface PetRaceModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onStartRace: (petId: string) => void;
}

export const PetRaceModal: React.FC<PetRaceModalProps> = ({
  open,
  player,
  onClose,
  onStartRace,
}) => {
  const ownedPets = useMemo(() => {
    const ids = new Set<string>();
    for (const it of player.inventory) {
      if (it.quantity > 0 && ITEM_CATALOG[it.itemId]?.slot === 'pet') ids.add(it.itemId);
    }
    if (player.loadout.pet && ITEM_CATALOG[player.loadout.pet]) ids.add(player.loadout.pet);
    return Array.from(ids).map((id) => ITEM_CATALOG[id]!);
  }, [player.inventory, player.loadout.pet]);

  const [selectedPetId, setSelectedPetId] = useState<string>(
    player.loadout.pet || ownedPets[0]?.id || 'pet_village_puppy'
  );

  if (!open) return null;

  const activePetId =
    ownedPets.some((p) => p.id === selectedPetId)
      ? selectedPetId
      : ownedPets[0]?.id ?? 'pet_village_puppy';
  const activeDef = ITEM_CATALOG[activePetId];
  const prog = getPetProgress(player, activePetId);
  const stageMeta = PET_STAGE_META[prog.stage];

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏁 Village Pet Racing Arena (ការប្រណាំងសត្វចិញ្ចឹមភូមិ)"
      subtitle={`Track Announcer Sophat · Normalized Fair Stats · Wins: ${player.petRaceWins ?? 0}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-3.5 text-xs">
        {/* Track Rules Banner */}
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/90 via-emerald-950/85 to-slate-900 p-3.5 text-amber-50">
          <div className="flex items-center gap-1.5 font-display text-sm font-black text-amber-300">
            <Flag className="h-4 w-4" />
            <span>6-Lane Khmer Village Obstacle Track (Zero P2W!)</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/90">
            Stage 1 Baby, Stage 2 Adult, and Stage 3 Mythic pets race with <b>fair normalized stats</b> (Stage 3
            shows off radiant WebGL Bloom trails, while <b>your timing skill</b> wins!).
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-white/10 p-2">
              <div className="font-bold text-amber-300">📣 [SPACE] / Tap Cheer</div>
              <div className="text-[10px] text-slate-200">Hit the GOLD stamina sweet spot for huge speed surges!</div>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <div className="font-bold text-emerald-300">🦘 [E] / Tap Hurdle Hop</div>
              <div className="text-[10px] text-slate-200">Leap cleanly over Bamboo Hurdles & Mud Puddles!</div>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <div className="font-bold text-pink-300">🪷 Lotus Boost Pads</div>
              <div className="text-[10px] text-slate-200">Run over glowing lotus pads for automatic bursts!</div>
            </div>
          </div>
        </div>

        {/* Pet Racer Selection */}
        <div className="rounded-xl border border-amber-900/25 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-amber-950">🐾 Choose Your Racing Companion</span>
            {ownedPets.length === 0 && (
              <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                Loaner Village Puppy Ready!
              </span>
            )}
          </div>

          {ownedPets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ownedPets.map((pet) => {
                const p = getPetProgress(player, pet.id);
                const selected = pet.id === activePetId;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`rounded-xl border-2 p-2 text-left transition cursor-pointer ${
                      selected
                        ? 'border-amber-600 bg-amber-200/80 text-amber-950'
                        : 'border-amber-900/20 bg-white text-amber-900 hover:bg-amber-100/60'
                    }`}
                  >
                    <div className="font-display font-bold text-xs truncate">{pet.name}</div>
                    <div className="text-[10px] font-semibold text-amber-800">
                      Lv.{p.level} · Stage {p.stage}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-900/20 bg-white p-2.5 text-amber-900">
              Don&apos;t own a pet yet? Track Announcer Sophat lends you a speedy <b>Village Puppy</b> for free so you
              can race immediately!
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-white border border-amber-900/20 px-3 py-2 text-[11px]">
            <span className="font-bold text-amber-950">
              Selected: {activeDef?.name ?? 'Village Puppy'} ({stageMeta.title})
            </span>
            {player.championPetRibbon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
                🎀 Champion Pet Ribbon Equipped
              </span>
            )}
          </div>
        </div>

        {/* Podium Rewards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-amber-400 bg-amber-100/90 p-2">
            <Trophy className="mx-auto h-4 w-4 text-amber-600" />
            <div className="font-display font-black text-amber-950">1st Place</div>
            <div className="text-[10px] font-bold text-amber-800">450c · 3× Pet XP Treats · 🎀 Ribbon</div>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-2">
            <Sparkles className="mx-auto h-4 w-4 text-sky-600" />
            <div className="font-display font-black text-slate-900">2nd / 3rd</div>
            <div className="text-[10px] font-bold text-slate-700">180–280c · 2× Pet XP Treats</div>
          </div>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2">
            <Zap className="mx-auto h-4 w-4 text-emerald-600" />
            <div className="font-display font-black text-emerald-950">All Finishers</div>
            <div className="text-[10px] font-bold text-emerald-800">100c · 1× Pet XP Treat (+450 XP)</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onStartRace(activePetId);
          }}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-3 font-display text-sm font-black text-white shadow-lg hover:brightness-110 cursor-pointer"
        >
          🏁 Enter 6-Lane Village Pet Race Now!
        </button>
      </div>
    </NativeDialog>
  );
};
