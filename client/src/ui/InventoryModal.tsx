import React, { useState } from 'react';
import type { EquipSlot, ItemRarity, PlayerState } from '@shared/types';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import { ITEM_CATALOG } from '../data/items';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface InventoryModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
}

const WEARING_SLOTS: Array<{ slot: EquipSlot; label: string }> = [
  { slot: 'hat', label: 'Hat / Headgear' },
  { slot: 'hair', label: 'Hair' },
  { slot: 'shirt', label: 'Shirt / Outfit' },
  { slot: 'pants', label: 'Pants / Sampot' },
  { slot: 'wings', label: 'Wings / Back' },
  { slot: 'pet', label: 'Companion Pet' },
  { slot: 'weapon', label: 'Class Weapon' },
  { slot: 'armor', label: 'Armor Guard' },
];

const RARITY_BADGE: Record<ItemRarity, { border: string; pill: string }> = {
  common: { border: 'border-stone-500/70', pill: 'bg-stone-600 text-white' },
  uncommon: { border: 'border-emerald-600', pill: 'bg-emerald-700 text-white' },
  rare: { border: 'border-sky-600', pill: 'bg-sky-700 text-white' },
  epic: { border: 'border-purple-600', pill: 'bg-purple-700 text-white' },
  legendary: { border: 'border-amber-500', pill: 'bg-amber-600 text-white' },
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  open,
  player,
  onClose,
  onEquip,
  onUnequip,
}) => {
  const [tab, setTab] = useState<'wearing' | 'container'>('container');
  const [filterSlot, setFilterSlot] = useState<EquipSlot | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(player.loadout.weapon);

  const isEquipped = (itemId: string): boolean => {
    const def = ITEM_CATALOG[itemId];
    if (!def) return false;
    return player.loadout[def.slot] === itemId;
  };

  const filteredItems = player.inventory.filter((entry) => {
    const def = ITEM_CATALOG[entry.itemId];
    if (!def) return false;
    return filterSlot === 'all' || def.slot === filterSlot;
  });

  const selectedDef = selectedId ? ITEM_CATALOG[selectedId] : null;
  const activeClassDef = KHMER_CLASSES[player.activeClass];

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Inventory · Wearing & Container"
      subtitle={`Active Class: ${activeClassDef.khmerName} (${activeClassDef.englishName}) · Stylish ${player.lifeStats.stylish}`}
      maxWidthClass="w-[min(95vw,760px)]"
    >
      {/* Top Tab Switcher */}
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
            Wearing (8 Slots)
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
            Container ({player.inventory.length} Items)
          </button>
        </div>

        <span className="text-[11px] font-semibold text-amber-900">
          Tip: Equip any of the 5 Khmer Weapons to swap combat classes live!
        </span>
      </div>

      {/* WEARING TAB */}
      {tab === 'wearing' && (
        <div className="grid sm:grid-cols-[164px_1fr] gap-4 items-start">
          <div className="flex flex-col items-center gap-2">
            <PaperDollPreview loadout={player.loadout} width={156} height={156} includePet />
            <div className="text-center text-xs font-display font-bold text-amber-950">
              Stylish Score: {player.lifeStats.stylish}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WEARING_SLOTS.map(({ slot, label }) => {
              const eqId = player.loadout[slot];
              const def = eqId ? ITEM_CATALOG[eqId] : null;
              const style = def ? RARITY_BADGE[def.rarity] : null;
              return (
                <div
                  key={slot}
                  className={`p-2.5 rounded-xl bg-amber-50/95 border-2 ${style?.border ?? 'border-amber-900/25'} flex items-center justify-between gap-2`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg border-2 border-amber-950/40 shrink-0"
                      style={{ backgroundColor: def?.primaryColor || '#e7dcc3' }}
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase text-amber-800/80">{label}</div>
                      <div className="font-display font-bold text-xs text-amber-950 truncate">
                        {def ? def.name : 'Empty'}
                      </div>
                      {def && (
                        <div className="text-[10px] text-amber-800 truncate">
                          Stylish +{def.stylishScore}
                          {def.stats.attack ? ` · ATK +${def.stats.attack}` : ''}
                          {def.stats.defense ? ` · DEF +${def.stats.defense}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  {def && slot !== 'weapon' && (
                    <button
                      type="button"
                      onClick={() => onUnequip(slot)}
                      className="px-2 py-1 rounded-lg bg-amber-900/15 hover:bg-red-600 hover:text-white text-[11px] font-bold text-amber-950 shrink-0 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTAINER TAB */}
      {tab === 'container' && (
        <div className="space-y-3">
          {/* Slot Filter Chips */}
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['all', 'All'],
                ['weapon', '5 Weapons'],
                ['hat', 'Hats'],
                ['shirt', 'Outfits'],
                ['wings', 'Wings'],
                ['pet', 'Pets'],
                ['pants', 'Pants'],
                ['armor', 'Armor'],
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
            {/* Bag Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[46dvh] overflow-y-auto pr-1">
              {filteredItems.map((entry) => {
                const def = ITEM_CATALOG[entry.itemId];
                if (!def) return null;
                const equipped = isEquipped(def.id);
                const selected = selectedId === def.id;
                const rStyle = RARITY_BADGE[def.rarity];

                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => setSelectedId(def.id)}
                    className={`text-left p-2 rounded-xl bg-amber-50/95 border-2 ${rStyle.border} transition flex flex-col gap-1.5 ${
                      selected ? 'ring-2 ring-amber-600 scale-[1.01]' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="w-7 h-7 rounded-lg border-2 border-amber-950/35 shrink-0"
                        style={{ backgroundColor: def.primaryColor }}
                      />
                      {equipped ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold uppercase">
                          Wearing
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${rStyle.pill}`}>
                          {def.rarity}
                        </span>
                      )}
                    </div>
                    <div className="font-display font-bold text-xs text-amber-950 leading-tight line-clamp-1">
                      {def.name}
                    </div>
                    <div className="text-[10px] text-amber-800 truncate">{def.khmerName}</div>
                  </button>
                );
              })}
            </div>

            {/* Item Tooltip / Action Card */}
            <div className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/40 space-y-2.5">
              <div className="flex justify-center">
                <PaperDollPreview loadout={player.loadout} width={116} height={116} includePet />
              </div>

              {selectedDef ? (
                <>
                  <div>
                    <div className="font-display font-bold text-sm text-amber-950">{selectedDef.name}</div>
                    <div className="text-[11px] font-semibold text-amber-800">{selectedDef.khmerName}</div>
                    <p className="text-[11px] text-amber-900/90 mt-1 leading-snug">{selectedDef.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-400/50">
                      Stylish +{selectedDef.stylishScore}
                    </span>
                    {selectedDef.stats.attack && (
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-400/50">
                        ATK +{selectedDef.stats.attack}
                      </span>
                    )}
                    {selectedDef.stats.defense && (
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-400/50">
                        DEF +{selectedDef.stats.defense}
                      </span>
                    )}
                    {selectedDef.stats.maxHp && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-400/50">
                        HP +{selectedDef.stats.maxHp}
                      </span>
                    )}
                    {selectedDef.stats.critChance && (
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-500/50">
                        Crit +{Math.round(selectedDef.stats.critChance * 100)}%
                      </span>
                    )}
                  </div>

                  {isEquipped(selectedDef.id) ? (
                    selectedDef.slot === 'weapon' ? (
                      <div className="text-center py-1.5 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs">
                        Active Class Weapon
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnequip(selectedDef.slot)}
                        className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs"
                      >
                        Unequip
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEquip(selectedDef.id)}
                      className="w-full stardew-btn py-2 rounded-xl font-display font-bold text-xs"
                    >
                      Equip {selectedDef.classId ? `(${KHMER_CLASSES[selectedDef.classId].englishName})` : ''}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-amber-800 text-center">Select an item to inspect or equip.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
