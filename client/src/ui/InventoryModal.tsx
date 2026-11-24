import React, { useState } from 'react';
import type { EquipSlot, ItemRarity, PlayerState, QualityTier } from '@shared/types';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import {
  ACCESSORY_DEFS,
  ACCESSORY_SLOT_COUNT,
  aggregateAccessoryBonuses,
  normalizeAccessorySlots,
} from '@shared/accessoryFusions';
import { COMBAT_ARMOR_SETS } from '../data/armorSets';
import { ITEM_CATALOG } from '../data/items';
import { FARM_ITEMS } from '../data/cropsAndArtisan';
import { STREET_SNACKS } from '../data/recipes';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface InventoryModalProps {
  open: boolean;
  player: PlayerState;
  inActiveBossFight?: boolean;
  onClose: () => void;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
  onUnequipAccessory: (slotIndex: number) => void;
  onToggleVanityOverride: (showVanity: boolean) => void;
  onSellFarmItem: (itemId: string, quality: QualityTier, qty?: number) => void;
  onEatSnack?: (snackId: string) => void;
  onUseMagicMirror?: () => void;
  onReadTreasureMap?: () => void;
}

const COMBAT_CORE_SLOTS: Array<{ slot: 'weapon' | 'armor'; label: string }> = [
  { slot: 'weapon', label: 'Class Weapon' },
  { slot: 'armor', label: 'Combat Armor Set' },
];

const VANITY_SLOTS: Array<{ slot: 'hat' | 'hair' | 'shirt' | 'pants' | 'wings' | 'pet' | 'mount'; label: string }> = [
  { slot: 'hat', label: 'Vanity Hat' },
  { slot: 'hair', label: 'Hair' },
  { slot: 'shirt', label: 'Vanity Shirt / Outfit' },
  { slot: 'pants', label: 'Vanity Pants / Sampot' },
  { slot: 'wings', label: 'Vanity Wings / Back' },
  { slot: 'pet', label: 'Companion Pet' },
  { slot: 'mount', label: 'Khmer Mount [V]' },
];

const RARITY_BADGE: Record<ItemRarity, { border: string; pill: string }> = {
  common: { border: 'border-stone-500/70', pill: 'bg-stone-600 text-white' },
  uncommon: { border: 'border-emerald-600', pill: 'bg-emerald-700 text-white' },
  rare: { border: 'border-sky-600', pill: 'bg-sky-700 text-white' },
  epic: { border: 'border-purple-600', pill: 'bg-purple-700 text-white' },
  legendary: { border: 'border-amber-500', pill: 'bg-amber-600 text-white' },
};

type ContainerFilter = EquipSlot | 'all' | 'farm_goods' | 'snacks';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  open,
  player,
  inActiveBossFight = false,
  onClose,
  onEquip,
  onUnequip,
  onUnequipAccessory,
  onToggleVanityOverride,
  onSellFarmItem,
  onEatSnack,
  onUseMagicMirror,
  onReadTreasureMap,
}) => {
  const [tab, setTab] = useState<'wearing' | 'container'>('container');
  const [filterSlot, setFilterSlot] = useState<ContainerFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string>(player.loadout.weapon ?? 'weapon_phkak');

  const accessorySlots = normalizeAccessorySlots(player.loadout.accessories);
  const accSummary = aggregateAccessoryBonuses(accessorySlots);
  const vanityOverride = player.loadout.showVanityOverArmor !== false;
  const activeArmorSet = player.loadout.armor ? COMBAT_ARMOR_SETS[player.loadout.armor] : undefined;

  const isEquipped = (itemId: string): boolean => {
    const def = ITEM_CATALOG[itemId];
    if (!def) return false;
    if (def.slot === 'accessory') {
      return accessorySlots.includes(itemId);
    }
    return player.loadout[def.slot] === itemId;
  };

  const filteredItems = player.inventory.filter((entry) => {
    const eq = ITEM_CATALOG[entry.itemId];
    const fm = FARM_ITEMS[entry.itemId];
    const sn = STREET_SNACKS[entry.itemId];
    if (!eq && !fm && !sn) return false;
    if (filterSlot === 'all') return true;
    if (filterSlot === 'farm_goods') return Boolean(fm);
    if (filterSlot === 'snacks') return Boolean(sn);
    return eq?.slot === filterSlot;
  });

  const [selId, selQualityRaw] = selectedKey.split('::');
  const selQuality: QualityTier = selQualityRaw === 'gold_star' ? 'gold_star' : 'normal';
  const selectedEquipDef = ITEM_CATALOG[selId];
  const selectedFarmDef = FARM_ITEMS[selId];
  const selectedSnackDef = STREET_SNACKS[selId];
  const selectedEntry = player.inventory.find(
    (i) => i.itemId === selId && (i.quality ?? 'normal') === selQuality
  );
  const activeClassDef = KHMER_CLASSES[player.activeClass];

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Inventory · Wearing & Container"
      subtitle={`Active Class: ${activeClassDef.khmerName} (${activeClassDef.englishName}) · Stylish ${player.lifeStats.stylish}`}
      maxWidthClass="w-[min(95vw,760px)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('wearing')}
            className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 transition ${
              tab === 'wearing'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/35'
            }`}
          >
            Wearing (Combat + 5 Acc + Vanity)
          </button>
          <button
            type="button"
            onClick={() => setTab('container')}
            className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 transition ${
              tab === 'container'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/35'
            }`}
          >
            Container ({player.inventory.length} Stacks)
          </button>
        </div>

        <span className="text-[11px] font-semibold text-amber-900">
          Equip Khmer Weapons to swap classes, or sell Farm & Artisan goods!
        </span>
      </div>

      {/* WEARING TAB: COMBAT ARMOR + 5 ACCESSORIES + VANITY OVERRIDE */}
      {tab === 'wearing' && (
        <div className="grid sm:grid-cols-[172px_1fr] gap-4 items-start max-h-[60dvh] overflow-y-auto pr-1">
          <div className="flex flex-col items-center gap-2">
            <PaperDollPreview loadout={player.loadout} width={156} height={156} includePet />
            <div className="text-center text-xs font-display font-bold text-amber-950">
              Stylish Score: {player.lifeStats.stylish}
            </div>
            <button
              type="button"
              onClick={() => onToggleVanityOverride(!vanityOverride)}
              className={`w-full px-2.5 py-1.5 rounded-xl text-[11px] font-display font-bold border-2 transition ${
                vanityOverride
                  ? 'bg-pink-600 text-white border-pink-950'
                  : 'bg-slate-800 text-amber-200 border-slate-950'
              }`}
            >
              {vanityOverride ? '🎭 Vanity Look: ON' : '🛡️ Showing Combat Armor'}
            </button>
            <div className="text-[10px] text-center text-amber-900/85 leading-snug">
              {vanityOverride
                ? 'Vanity fashion overrides visual style while Combat Armor grants full stats & set bonuses!'
                : 'Displaying Combat Armor visuals directly on your character.'}
            </div>
          </div>

          <div className="space-y-3">
            {/* COMBAT GEAR: WEAPON + COMBAT ARMOR SET */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-display font-bold uppercase tracking-wide text-amber-950">
                ⚔️ Combat Equipment (Stats & Set Bonuses)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMBAT_CORE_SLOTS.map(({ slot, label }) => {
                  const eqId = player.loadout[slot];
                  const def = eqId ? ITEM_CATALOG[eqId] : null;
                  const style = def ? RARITY_BADGE[def.rarity] : null;
                  return (
                    <div
                      key={slot}
                      className={`p-2 rounded-xl bg-slate-900 text-amber-50 border-2 ${style?.border ?? 'border-amber-600/40'} flex items-center justify-between gap-2`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg border border-amber-300/50 shrink-0"
                          style={{ backgroundColor: def?.primaryColor || '#334155' }}
                        />
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase text-amber-300/90">{label}</div>
                          <div className="font-display font-bold text-xs text-white truncate">
                            {def ? def.name : 'Empty'}
                          </div>
                          {def && (
                            <div className="text-[10px] text-amber-200 truncate">
                              {def.stats.attack ? `ATK +${def.stats.attack} ` : ''}
                              {def.stats.defense ? `DEF +${def.stats.defense} ` : ''}
                              {def.stats.maxHp ? `HP +${def.stats.maxHp}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      {def && slot !== 'weapon' && (
                        <button
                          type="button"
                          onClick={() => onUnequip(slot)}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-red-600 text-[10px] font-bold text-white shrink-0 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {activeArmorSet && (
                <div className="px-2.5 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-200 border border-emerald-500/50 text-[10px] font-semibold">
                  ★ <strong>{activeArmorSet.setBonusTitle}:</strong> {activeArmorSet.setBonusDescription}
                </div>
              )}
            </div>

            {/* 5 DEDICATED ACCESSORY SLOTS */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[11px] font-display font-bold uppercase tracking-wide text-amber-950">
                  💍 Accessories ({accSummary.equippedIds.length}/{ACCESSORY_SLOT_COUNT} Slots)
                </span>
                <span className="text-[10px] font-bold text-emerald-800">
                  {[
                    accSummary.moveSpeedPct > 0 ? `+${Math.round(accSummary.moveSpeedPct * 100)}% Spd` : null,
                    accSummary.hasDoubleJump ? '🌸 Double-Jump' : null,
                    accSummary.dashCooldownReductionPct > 0
                      ? `-${Math.round(accSummary.dashCooldownReductionPct * 100)}% Dash CD`
                      : null,
                    accSummary.defenseFlat > 0 ? `+${accSummary.defenseFlat} DEF` : null,
                    accSummary.poisonImmune ? '🟢 Poison Immune' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Find in Caverns or Fuse at Blacksmith!'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {accessorySlots.map((accId, idx) => {
                  const accDef = accId ? ACCESSORY_DEFS[accId] : null;
                  const style = accDef ? RARITY_BADGE[accDef.rarity] : null;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl bg-amber-50/95 border-2 ${style?.border ?? 'border-dashed border-amber-900/30'} flex items-center justify-between gap-2`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg border border-amber-950/35 shrink-0 flex items-center justify-center text-sm"
                          style={{ backgroundColor: accDef?.primaryColor || '#f5eedc' }}
                        >
                          {accDef ? accDef.icon : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase text-amber-800/80">
                            Accessory Slot {idx + 1}
                          </div>
                          <div className="font-display font-bold text-[11px] text-amber-950 truncate">
                            {accDef ? accDef.name : 'Empty Slot'}
                          </div>
                          {accDef && (
                            <div className="text-[9px] text-emerald-800 font-semibold truncate">{accDef.summary}</div>
                          )}
                        </div>
                      </div>
                      {accDef && (
                        <button
                          type="button"
                          onClick={() => onUnequipAccessory(idx)}
                          className="px-2 py-1 rounded-lg bg-amber-900/15 hover:bg-red-600 hover:text-white text-[10px] font-bold text-amber-950 shrink-0 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COSMETIC VANITY SLOTS */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-display font-bold uppercase tracking-wide text-amber-950">
                🎭 Vanity & Companion Slots (Visual Style Override)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VANITY_SLOTS.map(({ slot, label }) => {
                  const eqId = player.loadout[slot];
                  const def = eqId ? ITEM_CATALOG[eqId] : null;
                  const style = def ? RARITY_BADGE[def.rarity] : null;
                  return (
                    <div
                      key={slot}
                      className={`p-2 rounded-xl bg-amber-50/95 border-2 ${style?.border ?? 'border-amber-900/25'} flex items-center justify-between gap-2`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-amber-950/40 shrink-0"
                          style={{ backgroundColor: def?.primaryColor || '#e7dcc3' }}
                        />
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase text-amber-800/80">{label}</div>
                          <div className="font-display font-bold text-xs text-amber-950 truncate">
                            {def ? def.name : 'Empty'}
                          </div>
                          {def && (
                            <div className="text-[10px] text-amber-800 truncate">Stylish +{def.stylishScore}</div>
                          )}
                        </div>
                      </div>
                      {def && (
                        <button
                          type="button"
                          onClick={() => onUnequip(slot)}
                          className="px-2 py-1 rounded-lg bg-amber-900/15 hover:bg-red-600 hover:text-white text-[10px] font-bold text-amber-950 shrink-0 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTAINER TAB */}
      {tab === 'container' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['all', 'All'],
                ['weapon', 'Weapons'],
                ['armor', 'Combat Armor'],
                ['accessory', 'Accessories'],
                ['snacks', 'Snacks'],
                ['farm_goods', 'Ores & Farm'],
                ['hat', 'Hats'],
                ['shirt', 'Outfits'],
                ['wings', 'Wings'],
                ['pet', 'Pets'],
                ['mount', 'Mounts'],
              ] as const
            ).map(([slotKey, label]) => (
              <button
                key={slotKey}
                type="button"
                onClick={() => setFilterSlot(slotKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  filterSlot === slotKey
                    ? 'bg-amber-800 text-amber-50 border-amber-950'
                    : 'bg-amber-50 text-amber-900 border-amber-900/30 hover:bg-amber-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-[1fr_220px] gap-3 items-start">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[46dvh] overflow-y-auto pr-1">
              {filteredItems.map((entry) => {
                const eq = ITEM_CATALOG[entry.itemId];
                const fm = FARM_ITEMS[entry.itemId];
                const sn = STREET_SNACKS[entry.itemId];
                const qual: QualityTier = entry.quality ?? 'normal';
                const rowKey = `${entry.itemId}::${qual}`;
                const rarity = eq?.rarity ?? fm?.rarity ?? sn?.rarity ?? 'common';
                const color = eq?.primaryColor ?? fm?.primaryColor ?? sn?.primaryColor ?? '#d97706';
                const name = eq?.name ?? fm?.name ?? sn?.name ?? entry.itemId;
                const khmerName = eq?.khmerName ?? fm?.khmerName ?? sn?.khmerName ?? '';
                const equipped = eq ? isEquipped(eq.id) : false;
                const selected = selectedKey === rowKey;
                const rStyle = RARITY_BADGE[rarity];

                return (
                  <button
                    key={rowKey}
                    type="button"
                    onClick={() => setSelectedKey(rowKey)}
                    className={`text-left p-2 rounded-xl bg-amber-50/95 border-2 ${rStyle.border} transition flex flex-col gap-1.5 ${
                      selected ? 'ring-2 ring-amber-600 scale-[1.01]' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="w-7 h-7 rounded-lg border-2 border-amber-950/35 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-950"
                        style={{ backgroundColor: color }}
                      >
                        {entry.quantity > 1 ? `×${entry.quantity}` : ''}
                      </span>
                      {equipped ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold uppercase">
                          Wearing
                        </span>
                      ) : qual === 'gold_star' ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-amber-950 text-[9px] font-bold">
                          ★ GOLD
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${rStyle.pill}`}>
                          {rarity}
                        </span>
                      )}
                    </div>
                    <div className="font-display font-bold text-xs text-amber-950 leading-tight line-clamp-1">
                      {qual === 'gold_star' ? '★ ' : ''}
                      {name}
                    </div>
                    <div className="text-[10px] text-amber-800 truncate">{khmerName}</div>
                  </button>
                );
              })}
            </div>

            {/* Detail & Action Card */}
            <div className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/40 space-y-2.5">
              <div className="flex justify-center">
                <PaperDollPreview loadout={player.loadout} width={116} height={116} includePet />
              </div>

              {selectedEquipDef ? (
                <>
                  <div>
                    <div className="font-display font-bold text-sm text-amber-950">{selectedEquipDef.name}</div>
                    <div className="text-[11px] font-semibold text-amber-800">{selectedEquipDef.khmerName}</div>
                    <p className="text-[11px] text-amber-900/90 mt-1 leading-snug">{selectedEquipDef.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-400/50">
                      Stylish +{selectedEquipDef.stylishScore}
                    </span>
                    {selectedEquipDef.stats.attack && (
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-400/50">
                        ATK +{selectedEquipDef.stats.attack}
                      </span>
                    )}
                    {selectedEquipDef.stats.defense && (
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-400/50">
                        DEF +{selectedEquipDef.stats.defense}
                      </span>
                    )}
                  </div>

                  {isEquipped(selectedEquipDef.id) ? (
                    selectedEquipDef.slot === 'weapon' ? (
                      <div className="text-center py-1.5 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs">
                        Active Class Weapon
                      </div>
                    ) : selectedEquipDef.slot === 'accessory' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = accessorySlots.indexOf(selectedEquipDef.id);
                          if (idx >= 0) onUnequipAccessory(idx);
                        }}
                        className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs"
                      >
                        Unequip Accessory
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnequip(selectedEquipDef.slot)}
                        className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs"
                      >
                        Unequip
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEquip(selectedEquipDef.id)}
                      className="w-full phum-btn py-2 rounded-xl font-display font-bold text-xs"
                    >
                      Equip {selectedEquipDef.classId ? `(${KHMER_CLASSES[selectedEquipDef.classId].englishName})` : ''}
                    </button>
                  )}
                </>
              ) : selectedFarmDef && selectedEntry ? (
                <>
                  <div>
                    <div className="font-display font-bold text-sm text-amber-950">
                      {selQuality === 'gold_star' ? '★ Gold-Star ' : ''}
                      {selectedFarmDef.name} (×{selectedEntry.quantity})
                    </div>
                    <div className="text-[11px] font-semibold text-amber-800">{selectedFarmDef.khmerName}</div>
                    <p className="text-[11px] text-amber-900/90 mt-1 leading-snug">{selectedFarmDef.description}</p>
                  </div>
                  {selectedFarmDef.id === 'item_torn_treasure_map' && onReadTreasureMap ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onReadTreasureMap();
                      }}
                      className="w-full py-2 rounded-xl bg-gradient-to-b from-amber-500 to-orange-700 hover:from-amber-400 hover:to-orange-600 text-white border border-amber-950 font-display font-bold text-xs shadow-sm"
                    >
                      🗺️ Read Map → Reveal Buried X Clue!
                    </button>
                  ) : selectedFarmDef.id === 'tool_magic_mirror' && onUseMagicMirror ? (
                    <button
                      type="button"
                      disabled={inActiveBossFight}
                      onClick={() => {
                        onClose();
                        onUseMagicMirror();
                      }}
                      className="w-full py-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border border-amber-950 font-display font-bold text-xs disabled:opacity-45"
                    >
                      {inActiveBossFight
                        ? '⚔️ Disabled During Boss Fight'
                        : '🪞 Use Magic Mirror → Warp to Farm/Home'}
                    </button>
                  ) : selectedFarmDef.sellCoins ? (
                    <button
                      type="button"
                      onClick={() => onSellFarmItem(selectedFarmDef.id, selQuality, 1)}
                      className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs"
                    >
                      Sell 1 (+
                      {(selQuality === 'gold_star'
                        ? Math.round(selectedFarmDef.sellCoins * 1.5)
                        : selectedFarmDef.sellCoins
                      ).toLocaleString()}
                      c)
                    </button>
                  ) : null}
                </>
              ) : selectedSnackDef && selectedEntry ? (
                <>
                  <div>
                    <div className="font-display font-bold text-sm text-amber-950">
                      {selectedSnackDef.icon} {selQuality === 'gold_star' ? '★ ' : ''}
                      {selectedSnackDef.name} (×{selectedEntry.quantity})
                    </div>
                    <div className="text-[11px] font-semibold text-amber-800">{selectedSnackDef.khmerName}</div>
                    <p className="text-[11px] text-amber-900/90 mt-1 leading-snug">
                      Village: {selectedSnackDef.villageSummary} · Dungeon: {selectedSnackDef.dungeonSummary}
                    </p>
                  </div>
                  {onEatSnack && (
                    <button
                      type="button"
                      onClick={() => onEatSnack(selectedSnackDef.id)}
                      className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs"
                    >
                      Eat 1 {selectedSnackDef.icon} Now
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-amber-800 text-center">Select an item to inspect, equip, or sell.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
