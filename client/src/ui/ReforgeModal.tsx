import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  getReforgeModifier,
  getScaledReforgeCost,
  type ReforgeCategory,
} from '@shared/reforgeModifiers';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  KHMER_ARSENAL_LIST,
  SHIMMER_RECIPES,
  countShimmerInputs,
} from '../data/khmerArsenal';
import { Gift, Hammer, Landmark, Shield, Sparkles, Swords } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

export type ReforgeTab = 'reforge' | 'shimmer' | 'bank';

interface ReforgeModalProps {
  open: boolean;
  initialTab?: ReforgeTab;
  player: PlayerState;
  onClose: () => void;
  onReforge: (category: ReforgeCategory) => Promise<void>;
  onShimmerTransmute: (recipeId: string) => void;
  onBankAction: (action: 'deposit' | 'withdraw', amount: number) => Promise<void>;
  onCraftArsenalWeapon: (itemId: string) => void;
  onClaimStarterChest: () => void;
  onEquipWeapon: (itemId: string) => void;
}

export const ReforgeModal: React.FC<ReforgeModalProps> = ({
  open,
  initialTab = 'reforge',
  player,
  onClose,
  onReforge,
  onShimmerTransmute,
  onBankAction,
  onCraftArsenalWeapon,
  onClaimStarterChest,
  onEquipWeapon,
}) => {
  const [tab, setTab] = useState<ReforgeTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [sparkSide, setSparkSide] = useState<'weapon' | 'armor' | null>(null);
  const [bankAmount, setBankAmount] = useState('500');

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [initialTab, open]);

  const wMod = getReforgeModifier('weapon', player.weaponPrefix);
  const aMod = getReforgeModifier('armor', player.armorPrefix);
  const bankCoins = player.bankCoins ?? 0;
  const bridge = computeVillageToDungeonBridge(player);

  const weaponReforgeCost = getScaledReforgeCost('weapon', player.level);
  const armorReforgeCost = getScaledReforgeCost('armor', player.level);

  const runReforge = async (cat: ReforgeCategory) => {
    if (busy) return;
    setBusy(true);
    setSparkSide(cat);
    try {
      await onReforge(cat);
    } finally {
      setBusy(false);
      window.setTimeout(() => setSparkSide(null), 520);
    }
  };

  const runBank = async (action: 'deposit' | 'withdraw') => {
    if (busy) return;
    const amt = Math.max(0, Math.floor(Number(bankAmount)));
    if (!amt) return;
    setBusy(true);
    try {
      await onBankAction(action, amt);
    } finally {
      setBusy(false);
    }
  };

  const permanentRecipes = SHIMMER_RECIPES.filter((r) => r.rewardKind === 'blessing');
  const bossSwapRecipes = SHIMMER_RECIPES.filter((r) => r.rewardKind === 'boss_swap');

  const ownsAllArsenal = KHMER_ARSENAL_LIST.every((w) =>
    player.inventory.some((i) => i.itemId === w.itemId)
  );

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🔨 Master Somnang Blacksmith · Apsara Shimmer · ATM Vault"
      subtitle={`Wallet: ${player.currencies.coins.toLocaleString()}c · Vault: ${bankCoins.toLocaleString()}c · Live DEF ${bridge.effectiveDefense} · Crit ${Math.round(
        bridge.effectiveCritChance * 100
      )}%`}
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['reforge', 'Blacksmith & Arsenal', Hammer],
              ['shimmer', 'Apsara Shimmer', Sparkles],
              ['bank', 'ATM Bank Vault', Landmark],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                tab === id
                  ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                  : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[62dvh] overflow-y-auto pr-1 space-y-3">
          {/* TAB 1: BLACKSMITH PREFIX REFORGING + 6 KHMER MYTHIC ARSENAL WEAPONS */}
          {tab === 'reforge' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Weapon Prefix Reforge */}
                <div className="relative overflow-hidden p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-900/35 flex flex-col justify-between gap-3">
                  {sparkSide === 'weapon' && (
                    <div className="pointer-events-none absolute inset-0 bg-amber-300/45 flex items-center justify-center z-10 animate-ping">
                      <span className="text-3xl">💥✨🔨</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-orange-700" />
                      Weapon Prefix Reforge
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white space-y-1">
                      <div
                        className="font-display font-bold text-sm"
                        style={{ color: wMod?.colorHex ?? '#fde047' }}
                      >
                        {wMod ? `${wMod.name} ` : ''}
                        {player.weapon.name}
                      </div>
                      <div className="text-[11px] text-amber-200">
                        {wMod ? `${wMod.khmerName} · ${wMod.summary}` : 'No Prefix Yet'}
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-900/85">
                      Mythic rolls: <strong>Legendary (+15% Melee, +10% Spd, +5% Crit, +10% Size)</strong>,{' '}
                      <strong>Unreal</strong>, <strong>Mythical</strong>, <strong>Godly</strong>, <strong>Superior</strong>.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy || player.currencies.coins < weaponReforgeCost}
                    onClick={() => void runReforge('weapon')}
                    className="w-full phum-btn py-2.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                  >
                    {busy && sparkSide === 'weapon'
                      ? '💥 Hammering Sparks...'
                      : `🔨 Reforge Weapon (${weaponReforgeCost.toLocaleString()} Coins)`}
                  </button>
                </div>

                {/* Accessory / Armor Prefix Reforge */}
                <div className="relative overflow-hidden p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-900/35 flex flex-col justify-between gap-3">
                  {sparkSide === 'armor' && (
                    <div className="pointer-events-none absolute inset-0 bg-sky-300/45 flex items-center justify-center z-10 animate-ping">
                      <span className="text-3xl">✨🛡️🔨</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-sky-700" />
                      Accessory / Loadout Prefix
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white space-y-1">
                      <div
                        className="font-display font-bold text-sm"
                        style={{ color: aMod?.colorHex ?? '#7dd3fc' }}
                      >
                        {aMod ? `${aMod.name} ` : ''}
                        Combat Accessory Ward
                      </div>
                      <div className="text-[11px] text-sky-200">
                        {aMod ? `${aMod.khmerName} · ${aMod.summary}` : 'No Prefix Yet'}
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-900/85">
                      Rolls: <strong>Warding (+4 Def)</strong>, <strong>Menacing (+4% All Dmg)</strong>,{' '}
                      <strong>Lucky (+4% Crit)</strong>, <strong>Quick (+4% Move Spd)</strong>, Guarding, Hard.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy || player.currencies.coins < armorReforgeCost}
                    onClick={() => void runReforge('armor')}
                    className="w-full phum-btn py-2.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                  >
                    {busy && sparkSide === 'armor'
                      ? '✨ Forging Ward...'
                      : `🛡️ Reforge Accessory (${armorReforgeCost.toLocaleString()} Coins)`}
                  </button>
                </div>
              </div>

              {/* 6 SIGNATURE KHMER MYTHIC ARSENAL WEAPONS FORGE & STARTER TEST CHEST */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/90 to-slate-900 text-amber-50 border-2 border-amber-500/60 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-sm text-amber-300">
                      ⚔️ Khmer Mythic Arsenal (6 Signature Relics)
                    </div>
                    <div className="text-[10px] text-amber-100/80">
                      Right-Click or press <kbd className="px-1 bg-slate-800 rounded">Q</kbd> in Boss Caverns for Preah Khan Parry & Golden Riel Coin Toss!
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={ownsAllArsenal}
                    onClick={onClaimStarterChest}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-display font-bold text-[11px] border-2 border-amber-950 flex items-center gap-1.5 shadow disabled:opacity-45"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    {ownsAllArsenal ? '✓ All 6 Weapons Claimed' : '🎁 Open Test Chest (All 6 Free!)'}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {KHMER_ARSENAL_LIST.map((w) => {
                    const owned = player.inventory.some((i) => i.itemId === w.itemId);
                    const equipped = player.loadout.weapon === w.itemId;
                    return (
                      <div
                        key={w.itemId}
                        className="p-2.5 rounded-xl bg-slate-950/75 border border-amber-400/35 flex flex-col justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display font-bold text-xs text-amber-200">{w.name}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-900/70 text-amber-200 font-bold">
                              {w.classId}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-yellow-400">{w.khmerName}</div>
                          <p className="text-[10px] text-slate-300 leading-snug">{w.mechanicSummary}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          {owned ? (
                            <button
                              type="button"
                              disabled={equipped}
                              onClick={() => onEquipWeapon(w.itemId)}
                              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[11px] disabled:opacity-50"
                            >
                              {equipped ? '✓ Equipped' : '⚔️ Equip Now'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCraftArsenalWeapon(w.itemId)}
                              className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-[11px]"
                            >
                              ⚒️ Forge ({w.craftCoins.toLocaleString()}c
                              {w.requiredMaterialLabel ? ` + ${w.requiredMaterialLabel}` : ''})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SACRED APSARA SHIMMER SPRING */}
          {tab === 'shimmer' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-950 via-indigo-950 to-fuchsia-950 text-purple-100 border border-purple-400/50 text-[11px]">
                ✨ Dip <strong>Golden Durian</strong> or <strong>Pink Lotus</strong> into the iridescent{' '}
                <strong>Apsara Shimmer Spring</strong> for permanent account stats (saved to cloud!), or cycle duplicate rare Boss Drops to eliminate bad RNG!
              </div>

              <div className="space-y-1.5">
                <div className="font-display font-bold text-xs text-purple-950">
                  🌺 Permanent Fruit & Relic Blessings (1× per Character)
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {permanentRecipes.map((rec) => {
                    const ownedQty = countShimmerInputs(player, rec);
                    const done = Boolean(
                      rec.blessingId && (player.shimmerBlessings ?? []).includes(rec.blessingId)
                    );
                    return (
                      <div
                        key={rec.id}
                        className={`p-2.5 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                          done
                            ? 'bg-emerald-50 border-emerald-700/50'
                            : 'bg-purple-50/80 border-purple-800/35'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-display font-bold text-xs text-purple-950">{rec.name}</div>
                          <div className="text-[10px] font-bold text-purple-700">{rec.khmerName}</div>
                          <p className="text-[10px] text-slate-700 leading-snug">{rec.description}</p>
                          <div className="text-[10px] font-bold text-amber-900">
                            Requires: {rec.inputLabel} (Have {ownedQty})
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={done || ownedQty < rec.inputQty}
                          onClick={() => onShimmerTransmute(rec.id)}
                          className="w-full py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-[11px] disabled:opacity-45"
                        >
                          {done ? '✓ Active Forever' : '✨ Dip in Shimmer'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-display font-bold text-xs text-indigo-950">
                  ♻️ Transmute Duplicate Boss Drops (Same Boss Tier)
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {bossSwapRecipes.map((rec) => {
                    const ownedQty = countShimmerInputs(player, rec);
                    return (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-xl border-2 bg-indigo-50/70 border-indigo-800/30 flex flex-col justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="font-display font-bold text-xs text-indigo-950">{rec.name}</div>
                          <div className="text-[10px] font-bold text-indigo-700">{rec.khmerName}</div>
                          <p className="text-[10px] text-slate-700">{rec.description}</p>
                          <div className="text-[10px] font-bold text-amber-900">
                            Requires: {rec.inputLabel} (Have {ownedQty})
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={ownedQty < rec.inputQty}
                          onClick={() => onShimmerTransmute(rec.id)}
                          className="w-full py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-display font-bold text-[11px] disabled:opacity-45"
                        >
                          ♻️ Transmute Drop
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATM BANK VAULT */}
          {tab === 'bank' && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-900/35 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white border border-amber-900/25">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Wallet Coins</div>
                  <div className="font-display font-bold text-lg text-amber-950">
                    {player.currencies.coins.toLocaleString()}c
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-700/35">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">ATM Safe Vault</div>
                  <div className="font-display font-bold text-lg text-emerald-950">
                    {bankCoins.toLocaleString()}c
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border-2 border-amber-900/40 bg-white font-mono font-bold text-sm text-amber-950"
                />
                {[250, 1000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBankAmount(String(preset))}
                    className="px-2.5 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 font-display font-bold text-xs text-amber-950"
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runBank('deposit')}
                  className="py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs"
                >
                  🏧 Deposit to Vault
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runBank('withdraw')}
                  className="py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white border-2 border-sky-950 font-display font-bold text-xs"
                >
                  💸 Withdraw to Wallet
                </button>
              </div>
              <p className="text-[10px] text-amber-900/80">
                Tip: Storing Coins in the Village ATM Vault protects your fortune from the Shadow Tax Collector ambush!
              </p>
            </div>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
