import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  REFORGE_COST_COINS,
  getReforgeModifier,
  type ReforgeCategory,
} from '@shared/reforgeModifiers';
import { SHIMMER_RECIPES } from '../data/calamityWeapons';
import { Hammer, Landmark, Shield, Sparkles, Swords } from 'lucide-react';
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
}

export const ReforgeModal: React.FC<ReforgeModalProps> = ({
  open,
  initialTab = 'reforge',
  player,
  onClose,
  onReforge,
  onShimmerTransmute,
  onBankAction,
}) => {
  const [tab, setTab] = useState<ReforgeTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [bankAmount, setBankAmount] = useState('500');

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [initialTab, open]);

  const wMod = getReforgeModifier('weapon', player.weaponPrefix);
  const aMod = getReforgeModifier('armor', player.armorPrefix);
  const bankCoins = player.bankCoins ?? 0;

  const countOwned = (itemId: string) =>
    player.inventory.filter((i) => i.itemId === itemId).reduce((s, i) => s + i.quantity, 0);

  const runReforge = async (cat: ReforgeCategory) => {
    if (busy) return;
    setBusy(true);
    try {
      await onReforge(cat);
    } finally {
      setBusy(false);
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

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🔨 Blacksmith Reforge, Apsara Shimmer & ATM Bank"
      subtitle={`Wallet: ${player.currencies.coins.toLocaleString()}c · ATM Vault: ${bankCoins.toLocaleString()}c`}
      maxWidthClass="w-[min(96vw,700px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['reforge', 'Blacksmith Reforge', Hammer],
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

        <div className="max-h-[58dvh] overflow-y-auto pr-1">
          {/* TAB 1: SERVER-VALIDATED BLACKSMITH PREFIX REFORGE */}
          {tab === 'reforge' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Weapon Reforge */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-900/35 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-orange-700" />
                    Equipped Weapon
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white space-y-1">
                    <div className="font-display font-bold text-sm" style={{ color: wMod?.colorHex ?? '#fde047' }}>
                      {wMod ? `${wMod.name} ` : ''}
                      {player.weapon.name}
                    </div>
                    <div className="text-[11px] text-amber-200">
                      {wMod ? `${wMod.khmerName} · ${wMod.summary}` : 'No Prefix Yet'}
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-900/85">
                    Possible Mythic rolls: <strong>Legendary (+18% DMG, +6% Crit)</strong>,{' '}
                    <strong>Mythical</strong>, <strong>Unreal</strong>!
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || player.currencies.coins < REFORGE_COST_COINS.weapon}
                  onClick={() => void runReforge('weapon')}
                  className="w-full stardew-btn py-2.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                >
                  {busy ? 'Hammering...' : `🔨 Reforge Weapon (${REFORGE_COST_COINS.weapon} Coins)`}
                </button>
              </div>

              {/* Armor / Accessory Reforge */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-900/35 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-sky-700" />
                    Equipped Armor / Ward
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white space-y-1">
                    <div className="font-display font-bold text-sm" style={{ color: aMod?.colorHex ?? '#7dd3fc' }}>
                      {aMod ? `${aMod.name} ` : ''}
                      Combat Loadout
                    </div>
                    <div className="text-[11px] text-sky-200">
                      {aMod ? `${aMod.khmerName} · ${aMod.summary}` : 'No Prefix Yet'}
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-900/85">
                    Possible Mythic rolls: <strong>Warding (+6 DEF, +20 HP)</strong>,{' '}
                    <strong>Menacing (+8% DMG)</strong>, <strong>Lucky (+7% Crit)</strong>!
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || player.currencies.coins < REFORGE_COST_COINS.armor}
                  onClick={() => void runReforge('armor')}
                  className="w-full stardew-btn py-2.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                >
                  {busy ? 'Enchanting...' : `🛡️ Reforge Armor (${REFORGE_COST_COINS.armor} Coins)`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: APSARA SHIMMER TRANSMUTATION */}
          {tab === 'shimmer' && (
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-purple-950/90 text-purple-100 border border-purple-400/50 text-[11px]">
                ✨ Dip village crops or boss cores into the iridescent <strong>Apsara Shimmer Spring</strong> to awaken permanent account blessings or Calamity Arsenal weapons!
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {SHIMMER_RECIPES.map((rec) => {
                  const ownedQty = countOwned(rec.inputItemId);
                  const blessingDone = Boolean(
                    rec.blessingId && (player.shimmerBlessings ?? []).includes(rec.blessingId)
                  );
                  const weaponDone = Boolean(
                    rec.weaponItemId && player.inventory.some((i) => i.itemId === rec.weaponItemId)
                  );
                  const done = blessingDone || weaponDone;

                  return (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                        done
                          ? 'bg-emerald-50 border-emerald-700/50'
                          : 'bg-purple-50/70 border-purple-800/35'
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
                        {done ? '✓ Transmuted' : '✨ Dip in Shimmer'}
                      </button>
                    </div>
                  );
                })}
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
