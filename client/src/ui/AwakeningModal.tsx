import React, { useState } from 'react';
import type { KhmerClassId, PlayerState } from '@shared/types';
import {
  AWAKENED_WEAPONS,
  AWAKENED_WEAPON_LIST,
  AWAKENING_COIN_COST,
  AWAKENING_MATERIAL_LIST,
  AWAKENING_REFORGE_STONE_COST,
  AWAKENING_REQUIRED_UPGRADE_LEVEL,
  TEMPER_TO_MAX_COIN_COST,
  checkAwakeningRequirements,
  countInventoryItem,
} from '@shared/weaponAwakening';
import { CheckCircle2, Coins, Flame, ShieldAlert, Sparkles, Swords } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface AwakeningModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onAwakenWeapon: (classId: KhmerClassId) => void;
  onTemperToMax: () => void;
  onEquipWeapon: (itemId: string) => void;
}

export const AwakeningModal: React.FC<AwakeningModalProps> = ({
  open,
  player,
  onClose,
  onAwakenWeapon,
  onTemperToMax,
  onEquipWeapon,
}) => {
  const [selectedClass, setSelectedClass] = useState<KhmerClassId>(player.activeClass);
  const [forgingFlash, setForgingFlash] = useState(false);

  const selectedDef = AWAKENED_WEAPONS[selectedClass];
  const check = checkAwakeningRequirements(player, selectedClass);
  const isEquipped = player.loadout.weapon === selectedDef.id || player.weapon.id === selectedDef.id;

  const triggerAwaken = () => {
    if (!check.canAwaken) return;
    setForgingFlash(true);
    onAwakenWeapon(selectedClass);
    window.setTimeout(() => setForgingFlash(false), 750);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🌌 Grandpa Chann's Ancient Weapon Awakening Forge"
      subtitle={`Awakened Weapons: ${(player.awakenedWeapons ?? []).length}/5 · Equipped: ${player.weapon.name} (+${player.weapon.upgradeLevel}) · Coins: ${player.currencies.coins.toLocaleString()}c`}
      maxWidthClass="w-[min(96vw,820px)]"
    >
      <div className="space-y-3 text-xs relative">
        {forgingFlash && (
          <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-gradient-to-br from-cyan-400/50 via-yellow-300/60 to-cyan-400/50 flex items-center justify-center animate-pulse">
            <div className="px-5 py-3 rounded-2xl bg-slate-950/90 border-2 border-cyan-300 text-cyan-200 font-display font-bold text-base shadow-2xl">
              🌌✨ PRISMATIC ANCIENT AWAKENING COMPLETE!
            </div>
          </div>
        )}

        {/* Class Selector Tabs (5 Khmer Classes) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {AWAKENED_WEAPON_LIST.map((def) => {
            const owned =
              (player.awakenedWeapons ?? []).includes(def.id) ||
              player.inventory.some((i) => i.itemId === def.id && i.quantity > 0);
            const active = selectedClass === def.classId;
            return (
              <button
                key={def.classId}
                type="button"
                onClick={() => setSelectedClass(def.classId)}
                className={`p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                  active
                    ? 'bg-gradient-to-b from-cyan-900 to-slate-950 text-cyan-100 border-amber-400 shadow'
                    : 'bg-amber-50 text-amber-950 border-amber-900/25 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">{def.icon}</span>
                  {owned && (
                    <span className="px-1 py-0.2 rounded bg-cyan-400 text-slate-950 text-[8px] font-bold">
                      ANCIENT
                    </span>
                  )}
                </div>
                <div className="font-display font-bold text-[10px] truncate mt-0.5">
                  {def.className}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Awakened Ancient Weapon Showcase */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 text-cyan-50 border-2 border-cyan-400/80 shadow-[0_0_24px_rgba(34,211,238,0.3)] space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-amber-400/30 border-2 border-amber-300 flex items-center justify-center text-2xl shrink-0">
                {selectedDef.icon}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-300 via-yellow-200 to-cyan-300 text-slate-950 font-display font-bold text-[9px] uppercase">
                    🌌 ANCIENT PRISMATIC TIER
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">{selectedDef.className}</span>
                </div>
                <div className="font-display font-bold text-base text-white mt-0.5">
                  {selectedDef.name}
                </div>
                <div className="text-[11px] font-bold text-cyan-300">{selectedDef.khmerName}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-cyan-400/35">
                <div className="text-[9px] text-cyan-200 uppercase">Base ATK</div>
                <div className="font-display font-bold text-sm text-amber-300">{selectedDef.attack}</div>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-cyan-400/35">
                <div className="text-[9px] text-cyan-200 uppercase">Crit</div>
                <div className="font-display font-bold text-sm text-emerald-300">
                  {Math.round(selectedDef.critChance * 100)}%
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-cyan-400/35">
                <div className="text-[9px] text-cyan-200 uppercase">Armor Pen</div>
                <div className="font-display font-bold text-sm text-cyan-300">
                  {selectedDef.armorPen}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-amber-400/45 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <div className="font-display font-bold text-xs text-amber-300">
                Awakened Prismatic Passive: {selectedDef.passiveTitle}
              </div>
              <div className="text-[11px] text-cyan-100/90 leading-snug">
                {selectedDef.passiveDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Forge Requirements Checklist */}
        <div className="p-3 rounded-2xl bg-amber-50/95 border-2 border-amber-900/25 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-600" />
              Grandpa Chann’s Awakening Recipe (3 Adventure Zones + Blacksmith Forge)
            </div>
            {!check.weaponMaxed && (
              <button
                type="button"
                disabled={player.currencies.coins < TEMPER_TO_MAX_COIN_COST}
                onClick={onTemperToMax}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-[10px] border border-amber-950 disabled:opacity-45 cursor-pointer"
              >
                🔥 Temper Equipped Weapon to +10 ({TEMPER_TO_MAX_COIN_COST.toLocaleString()}c)
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* Maxed Weapon Requirement */}
            <div
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                check.weaponMaxed
                  ? 'bg-emerald-50 border-emerald-500/50 text-emerald-950'
                  : 'bg-rose-50 border-rose-400/50 text-rose-950'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-[11px] truncate">
                  ⚔️ Maxed Weapon (+{AWAKENING_REQUIRED_UPGRADE_LEVEL})
                </div>
                <div className="text-[10px] opacity-80">
                  Equipped: +{player.weapon.upgradeLevel} / +{AWAKENING_REQUIRED_UPGRADE_LEVEL}
                </div>
              </div>
              {check.weaponMaxed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              )}
            </div>

            {/* 3 Zone Catalyst Materials */}
            {AWAKENING_MATERIAL_LIST.map((mat) => {
              const qty = countInventoryItem(player, mat.id);
              const ok = qty >= 1;
              return (
                <div
                  key={mat.id}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                    ok
                      ? 'bg-emerald-50 border-emerald-500/50 text-emerald-950'
                      : 'bg-white border-amber-900/25 text-amber-950'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[11px] truncate">
                      {mat.icon} 1× {mat.name}
                    </div>
                    <div className="text-[10px] opacity-80">
                      {mat.zoneName} · Owned: {qty}/1
                    </div>
                  </div>
                  {ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 shrink-0">{qty}/1</span>
                  )}
                </div>
              );
            })}

            {/* Coins */}
            <div
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                check.hasCoins
                  ? 'bg-emerald-50 border-emerald-500/50 text-emerald-950'
                  : 'bg-white border-amber-900/25 text-amber-950'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-[11px] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  {AWAKENING_COIN_COST.toLocaleString()} Coins
                </div>
                <div className="text-[10px] opacity-80">
                  Wallet: {player.currencies.coins.toLocaleString()}c
                </div>
              </div>
              {check.hasCoins ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-rose-700 shrink-0">Need c</span>
              )}
            </div>

            {/* Reforge Stones */}
            <div
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                check.hasReforgeStones
                  ? 'bg-emerald-50 border-emerald-500/50 text-emerald-950'
                  : 'bg-white border-amber-900/25 text-amber-950'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-[11px]">
                  🪨 {AWAKENING_REFORGE_STONE_COST}× Reforge Stones
                </div>
                <div className="text-[10px] opacity-80">
                  Owned: {check.reforgeStonesCount}/{AWAKENING_REFORGE_STONE_COST}
                </div>
              </div>
              {check.hasReforgeStones ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-amber-700 shrink-0">
                  {check.reforgeStonesCount}/{AWAKENING_REFORGE_STONE_COST}
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-amber-900/80">
              Gather rare catalysts by mining in <strong>Mining Quarry</strong>, foraging in{' '}
              <strong>Bamboo Forest</strong>, and hunting relics in <strong>Sunken Ruins</strong>!
            </span>

            {check.alreadyAwakened ? (
              <button
                type="button"
                disabled={isEquipped}
                onClick={() => onEquipWeapon(selectedDef.id)}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
              >
                <Swords className="w-4 h-4" />
                {isEquipped ? '✓ Equipped (Ancient Active)' : `Equip ${selectedDef.name}`}
              </button>
            ) : (
              <button
                type="button"
                disabled={!check.canAwaken}
                onClick={triggerAwaken}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 hover:from-cyan-400 hover:to-amber-300 text-slate-950 border-2 border-slate-950 font-display font-bold text-xs shadow-lg active:scale-95 transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {check.canAwaken
                  ? `🌌 Awaken ${selectedDef.name}`
                  : 'Gather Materials & +10 Weapon to Awaken'}
              </button>
            )}
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
