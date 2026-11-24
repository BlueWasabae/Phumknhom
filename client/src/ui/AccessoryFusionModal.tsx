import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  ACCESSORY_DEFS,
  ACCESSORY_FUSION_RECIPES,
  ACCESSORY_LIST,
  countItemInInventory,
  hasAccessoryAvailable,
  normalizeAccessorySlots,
} from '@shared/accessoryFusions';
import { COMBAT_ARMOR_SET_LIST } from '../data/armorSets';
import { NativeDialog } from './NativeDialog';

export interface AccessoryFusionPanelProps {
  player: PlayerState;
  onFuseAccessory: (recipeId: string) => void;
  onBuyBaseAccessory: (accId: string) => void;
  onEquipAccessory: (accId: string) => void;
  onCraftArmorSet: (armorId: string) => void;
  onEquipArmorSet: (armorId: string) => void;
}

export const AccessoryFusionPanel: React.FC<AccessoryFusionPanelProps> = ({
  player,
  onFuseAccessory,
  onBuyBaseAccessory,
  onEquipAccessory,
  onCraftArmorSet,
  onEquipArmorSet,
}) => {
  const equippedAccs = normalizeAccessorySlots(player.loadout.accessories);
  const baseAccessories = ACCESSORY_LIST.filter((a) => a.tier === 'base');

  const oreLaterite = countItemInInventory(player, 'ore_laterite');
  const oreJade = countItemInInventory(player, 'ore_jade_crystal');
  const oreGold = countItemInInventory(player, 'ore_angkor_gold');

  return (
    <div className="space-y-3 text-xs">
      {/* Cavern Ore Pouch Summary */}
      <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-amber-950/90 to-slate-900 text-amber-50 border border-amber-500/50 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold">
          ⛏️ <strong>Cavern Ore Pouch:</strong> Mine veins in <strong>Wild Frontier / Temple Portal Hall → Underground Caverns</strong>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className="px-2 py-0.5 rounded bg-orange-900/80 text-orange-200 border border-orange-500/40">
            🪨 Laterite ×{oreLaterite}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-500/40">
            💎 Jade ×{oreJade}
          </span>
          <span className="px-2 py-0.5 rounded bg-yellow-900/80 text-yellow-200 border border-yellow-500/40">
            🪙 Angkor Gold ×{oreGold}
          </span>
        </div>
      </div>

      {/* SECTION 1: BLACKSMITH ACCESSORY FUSION TREE */}
      <div className="space-y-1.5">
        <div className="font-display font-bold text-xs text-amber-950">
          ⚒️ Blacksmith Accessory Fusion Tree (Combine 2 Relics into 1 Slot!)
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {ACCESSORY_FUSION_RECIPES.map((rec) => {
            const resDef = ACCESSORY_DEFS[rec.resultId];
            const [inA, inB] = rec.inputAccessoryIds;
            const defA = ACCESSORY_DEFS[inA];
            const defB = ACCESSORY_DEFS[inB];
            const hasA = hasAccessoryAvailable(player, inA);
            const hasB = hasAccessoryAvailable(player, inB);
            const oreHave = countItemInInventory(player, rec.oreItemId);
            const canAfford = player.currencies.coins >= rec.coinCost;
            const canFuse = hasA && hasB && oreHave >= rec.oreQty && canAfford;
            const alreadyOwned = hasAccessoryAvailable(player, rec.resultId);
            const isEquipped = equippedAccs.includes(rec.resultId);

            return (
              <div
                key={rec.id}
                className="p-2.5 rounded-xl bg-amber-50/95 border-2 border-amber-900/35 flex flex-col justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display font-bold text-xs text-amber-950">
                      {resDef?.icon} {rec.name}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-700 text-white font-bold">
                      {resDef?.rarity}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-amber-700">{rec.khmerName}</div>
                  <p className="text-[10px] text-amber-950/90 font-semibold leading-snug">{rec.summary}</p>
                  <div className="pt-1 space-y-0.5 text-[10px]">
                    <div className={hasA ? 'text-emerald-700 font-bold' : 'text-rose-700 font-semibold'}>
                      {hasA ? '✓' : '✗'} {defA?.icon} {defA?.name}
                    </div>
                    <div className={hasB ? 'text-emerald-700 font-bold' : 'text-rose-700 font-semibold'}>
                      {hasB ? '✓' : '✗'} {defB?.icon} {defB?.name}
                    </div>
                    <div className={oreHave >= rec.oreQty ? 'text-emerald-700 font-bold' : 'text-amber-900'}>
                      {oreHave >= rec.oreQty ? '✓' : '•'} {rec.oreQty}× {rec.oreLabel} (Have {oreHave})
                    </div>
                    <div className={canAfford ? 'text-emerald-700 font-bold' : 'text-rose-700'}>
                      {canAfford ? '✓' : '•'} {rec.coinCost.toLocaleString()} Coins
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    disabled={!canFuse}
                    onClick={() => onFuseAccessory(rec.id)}
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-display font-bold text-[11px] disabled:opacity-45"
                  >
                    ⚒️ Fuse Relic ({rec.coinCost.toLocaleString()}c)
                  </button>
                  {alreadyOwned && !isEquipped && (
                    <button
                      type="button"
                      onClick={() => onEquipAccessory(rec.resultId)}
                      className="w-full py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[10px]"
                    >
                      ✨ Equip Fused Relic
                    </button>
                  )}
                  {isEquipped && (
                    <div className="text-center text-[10px] font-bold text-emerald-700">✓ Active in Accessory Slot</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: BASE UTILITY ACCESSORIES (Cavern Chests OR Blacksmith Counter) */}
      <div className="space-y-1.5">
        <div className="font-display font-bold text-xs text-amber-950">
          🧭 Base Utility Accessories (Found in Cavern Relic Chests or Purchased Here)
        </div>
        <div className="grid sm:grid-cols-5 gap-1.5">
          {baseAccessories.map((acc) => {
            const owned = hasAccessoryAvailable(player, acc.id);
            const equipped = equippedAccs.includes(acc.id);
            const price = acc.buyCoins ?? 350;
            return (
              <div
                key={acc.id}
                className="p-2 rounded-xl bg-white border border-amber-900/30 flex flex-col justify-between gap-1.5"
              >
                <div>
                  <div className="font-display font-bold text-[11px] text-amber-950 leading-tight">
                    {acc.icon} {acc.name}
                  </div>
                  <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">{acc.summary}</div>
                </div>
                {owned ? (
                  <button
                    type="button"
                    disabled={equipped}
                    onClick={() => onEquipAccessory(acc.id)}
                    className="w-full py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[10px] disabled:opacity-50"
                  >
                    {equipped ? '✓ Worn' : 'Equip'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={player.currencies.coins < price}
                    onClick={() => onBuyBaseAccessory(acc.id)}
                    className="w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-[10px] disabled:opacity-45"
                  >
                    Buy {price}c
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: 3 COMBAT ARMOR SETS (STATS SEPARATE FROM VANITY!) */}
      <div className="space-y-1.5">
        <div className="font-display font-bold text-xs text-amber-950">
          🛡️ Combat Armor Sets (Provide Stats & Set Bonuses — Vanity Keeps Your Fashion Look!)
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {COMBAT_ARMOR_SET_LIST.map((setDef) => {
            const owned = player.inventory.some((i) => i.itemId === setDef.id && i.quantity > 0);
            const equipped = player.loadout.armor === setDef.id;
            const matsOk = setDef.materials.every((m) => countItemInInventory(player, m.itemId) >= m.qty);
            const canForge = !owned && matsOk && player.currencies.coins >= setDef.craftCoins;

            return (
              <div
                key={setDef.id}
                className="p-2.5 rounded-xl bg-slate-900 text-amber-50 border-2 border-amber-500/45 flex flex-col justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display font-bold text-xs text-amber-200">{setDef.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-700 text-white font-bold">
                      DEF +{setDef.baseDefense}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold">{setDef.sourceLabel}</div>
                  <div className="text-[10px] text-emerald-300 font-semibold leading-snug">
                    ★ {setDef.setBonusTitle}: {setDef.setBonusDescription}
                  </div>
                  <div className="pt-0.5 text-[10px] text-slate-300 space-y-0.5">
                    {setDef.materials.map((m) => {
                      const have = countItemInInventory(player, m.itemId);
                      return (
                        <div key={m.itemId} className={have >= m.qty ? 'text-emerald-300' : 'text-amber-200'}>
                          {have >= m.qty ? '✓' : '•'} {m.qty}× {m.label} (Have {have})
                        </div>
                      );
                    })}
                  </div>
                </div>
                {owned ? (
                  <button
                    type="button"
                    disabled={equipped}
                    onClick={() => onEquipArmorSet(setDef.id)}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[11px] disabled:opacity-50"
                  >
                    {equipped ? '✓ Active Combat Armor' : '🛡️ Equip Combat Armor'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canForge}
                    onClick={() => onCraftArmorSet(setDef.id)}
                    className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-[11px] disabled:opacity-45"
                  >
                    ⚒️ Forge Set ({setDef.craftCoins.toLocaleString()}c)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface AccessoryFusionModalProps extends AccessoryFusionPanelProps {
  open: boolean;
  onClose: () => void;
}

export const AccessoryFusionModal: React.FC<AccessoryFusionModalProps> = ({
  open,
  onClose,
  ...panelProps
}) => (
  <NativeDialog
    open={open}
    onClose={onClose}
    title="⚒️ Blacksmith Relic Fusion & Combat Armor Forge"
    subtitle="Combine 5-Slot Utility Accessories into Endgame Relics & Forge Khmer Combat Armor Sets"
    maxWidthClass="w-[min(96vw,780px)]"
  >
    <div className="max-h-[66dvh] overflow-y-auto pr-1">
      <AccessoryFusionPanel {...panelProps} />
    </div>
  </NativeDialog>
);
