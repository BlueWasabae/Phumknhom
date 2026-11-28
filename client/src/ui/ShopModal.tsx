import React, { useEffect, useState } from 'react';
import type {
  EquipSlot,
  EquippedLoadout,
  ItemRarity,
  PlayerState,
} from '@shared/types';
import {
  ALL_EYE_STYLES,
  ALL_FACE_STYLES,
  ALL_HAIR_STYLES,
  EYE_COLORS,
  EYEBROW_STYLES,
  HAIR_COLORS,
  SKIN_TONES,
} from '@shared/characterStyles';
import { Armchair, Coins, ChefHat, Crown, Gem, RotateCcw, Sparkles, UtensilsCrossed } from 'lucide-react';
import { HOUSE_FURNITURE_LIST, getOwnedFurnitureCount } from '@shared/houseDecor';
import { getNpcPerkFlags } from '@shared/npcSchedules';
import { RARITY_TIERS } from '@shared/raritySystem';
import { FASHION_SHOP_ITEMS, ITEM_CATALOG } from '../data/items';
import { STREET_SNACK_LIST, countInventoryAnyQuality } from '../data/recipes';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';
import { EventBus } from '../game/EventBus';

export type ShopMode = 'snack' | 'fashion';

export interface SalonPurchaseCost {
  coins: number;
  diamonds: number;
  unlockItemIds?: string[];
  summary?: string;
}

interface ShopModalProps {
  open: boolean;
  mode: ShopMode;
  initialTab?: 'primary' | 'secondary';
  player: PlayerState;
  onClose: () => void;
  onBuySnack: (snackId: string, qty?: number) => void;
  onCookSnack: (snackId: string) => void;
  onEatSnack: (snackId: string) => void;
  onAssignQuickSlot: (slotIndex: 0 | 1 | 2, snackId: string) => void;
  onBuyFashion: (itemId: string) => void;
  onBuyFurniture?: (itemId: string) => void;
  onEquipFashion: (itemId: string) => void;
  onCustomizeLook: (patch: Partial<EquippedLoadout>, cost?: SalonPurchaseCost) => void;
}

const RARITY_STYLES: Record<ItemRarity, { border: string; pill: string }> = {
  common: { border: RARITY_TIERS.common.borderClass, pill: RARITY_TIERS.common.pillClass },
  uncommon: { border: RARITY_TIERS.uncommon.borderClass, pill: RARITY_TIERS.uncommon.pillClass },
  rare: { border: RARITY_TIERS.rare.borderClass, pill: RARITY_TIERS.rare.pillClass },
  epic: { border: RARITY_TIERS.epic.borderClass, pill: RARITY_TIERS.epic.pillClass },
  legendary: { border: RARITY_TIERS.legendary.borderClass, pill: RARITY_TIERS.legendary.pillClass },
  mythic: { border: RARITY_TIERS.mythic.borderClass, pill: RARITY_TIERS.mythic.pillClass },
  ancient: { border: RARITY_TIERS.ancient.borderClass, pill: RARITY_TIERS.ancient.pillClass },
};

const SALON_PRICES = {
  skinCoins: 200,
  normalHairCoins: 300,
  hairColorCoins: 150,
  normalEyeCoins: 250,
  eyeColorCoins: 150,
  eyebrowCoins: 150,
  normalFaceCoins: 200,
  premiumHairDiamonds: {
    silver_spiky: 120,
    braided_royal: 180,
    royal_braided_crown: 220,
    flowing_apsara_waves: 200,
  } as Record<string, number>,
  premiumEyeDiamonds: {
    glowing_gold: 150,
    starry_glow: 160,
    dragon_slit: 170,
    mystic_heterochromia: 210,
  } as Record<string, number>,
  premiumFaceDiamonds: {
    fierce_scar: 80,
    floating_lotus_petals: 190,
    lightning_eyes: 220,
    sacred_third_eye: 240,
  } as Record<string, number>,
};

export const ShopModal: React.FC<ShopModalProps> = ({
  open,
  mode,
  initialTab = 'primary',
  player,
  onClose,
  onBuySnack,
  onCookSnack,
  onEatSnack,
  onAssignQuickSlot,
  onBuyFashion,
  onBuyFurniture,
  onEquipFashion,
  onCustomizeLook,
}) => {
  const [tab, setTab] = useState<'primary' | 'secondary' | 'furniture'>(initialTab);
  const [fashionFilter, setFashionFilter] = useState<'all' | EquipSlot>('all');
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [salonDraft, setSalonDraft] = useState<EquippedLoadout>(() => ({ ...player.loadout }));
  const npcPerks = getNpcPerkFlags(player);
  const starterFurniture = HOUSE_FURNITURE_LIST.filter((f) => f.category === 'starter');

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setPreviewItemId(null);
      setSalonDraft({ ...player.loadout });
    }
  }, [open, mode, initialTab, player.loadout]);

  const cookingSkill = player.skills.skills.cooking;

  // Build live preview loadout when hovering/selecting a boutique item
  const previewLoadout: EquippedLoadout = (() => {
    if (!previewItemId) return player.loadout;
    const def = ITEM_CATALOG[previewItemId];
    if (!def) return player.loadout;
    const next: EquippedLoadout = { ...player.loadout };
    if (def.eyeStyleOverride) {
      next.eyeStyle = def.eyeStyleOverride;
    } else if (def.faceStyleOverride) {
      next.faceStyle = def.faceStyleOverride;
    } else if (def.slot !== 'accessory') {
      next[def.slot] = def.id;
      if (def.hairStyleOverride) next.hairStyle = def.hairStyleOverride;
    }
    return next;
  })();

  const isOwned = (itemId: string) =>
    player.inventory.some((entry) => entry.itemId === itemId && entry.quantity > 0);

  const isEquipped = (itemId: string) => {
    const def = ITEM_CATALOG[itemId];
    if (!def) return false;
    if (def.eyeStyleOverride) return player.loadout.eyeStyle === def.eyeStyleOverride;
    if (def.faceStyleOverride) return player.loadout.faceStyle === def.faceStyleOverride;
    if (def.slot === 'accessory') return (player.loadout.accessories ?? []).includes(itemId);
    return player.loadout[def.slot] === itemId;
  };

  const filteredFashion = FASHION_SHOP_ITEMS.filter(
    (item) => fashionFilter === 'all' || item.slot === fashionFilter
  );

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={
        mode === 'snack'
          ? 'Num Pang Street Snack Cart & Kitchen'
          : 'Phum Fashion Boutique & Mirror'
      }
      subtitle={
        mode === 'snack'
          ? `Coins: ${player.currencies.coins.toLocaleString()} · Cooking Lv.${cookingSkill.level} · Healthy ${player.lifeStats.healthy}/100 · Happy ${player.lifeStats.happy}/100`
          : `Coins: ${player.currencies.coins.toLocaleString()} · Gold: ${player.currencies.gold} · Stylish Score: ${player.lifeStats.stylish}`
      }
      maxWidthClass="w-[min(96vw,780px)]"
    >
      {/* Mode Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('primary')}
            className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
              tab === 'primary'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
            }`}
          >
            {mode === 'snack' ? (
              <>
                <UtensilsCrossed className="w-3.5 h-3.5" /> Buy Snacks
              </>
            ) : (
              <>
                <Crown className="w-3.5 h-3.5" /> Buy Fashion ({FASHION_SHOP_ITEMS.length})
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('secondary')}
            className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
              tab === 'secondary'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
            }`}
          >
            {mode === 'snack' ? (
              <>
                <ChefHat className="w-3.5 h-3.5" /> Cook From Farm (+Cooking XP)
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Wardrobe Mirror
              </>
            )}
          </button>

          {mode === 'fashion' && (
            <button
              type="button"
              onClick={() => setTab('furniture')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
                tab === 'furniture'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Armchair className="w-3.5 h-3.5" /> Home Furniture ({starterFurniture.length})
            </button>
          )}
          {mode === 'fashion' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                EventBus.emit('ui:openModal', { modal: 'dyeStudio' });
              }}
              className="px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition bg-gradient-to-r from-fuchsia-600 to-amber-500 text-white border-amber-950 hover:brightness-110 cursor-pointer"
            >
              🎨 Dye Studio
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-display font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-900/30 text-amber-950 inline-flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            {player.currencies.coins.toLocaleString()}
          </span>
          {mode === 'fashion' && (
            <span className="px-2.5 py-1 rounded-lg bg-yellow-100 border border-yellow-700/40 text-yellow-950">
              ★ {player.currencies.gold} Gold
            </span>
          )}
        </div>
      </div>

      {/* ==================== STREET SNACK CART ==================== */}
      {mode === 'snack' && (
        <div className="space-y-3 max-h-[60dvh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {STREET_SNACK_LIST.map((snack) => {
              const owned = countInventoryAnyQuality(player.inventory, snack.id);
              const rStyle = RARITY_STYLES[snack.rarity];
              const canCook = snack.ingredients.every(
                (req) => countInventoryAnyQuality(player.inventory, req.itemId) >= req.quantity
              );
              const canBuy = player.currencies.coins >= snack.buyCoins;
              const slotIdx = player.quickSnackSlots.indexOf(snack.id);

              return (
                <div
                  key={snack.id}
                  className={`p-3 rounded-xl bg-amber-50/95 border-2 ${rStyle.border} flex flex-col justify-between gap-2`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-900/30 flex items-center justify-center text-xl shrink-0">
                          {snack.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="font-display font-bold text-xs text-amber-950 truncate">
                            {snack.name}
                          </div>
                          <div className="text-[10px] text-amber-800 truncate">{snack.khmerName}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-900/10 text-amber-950 font-bold text-[10px] whitespace-nowrap">
                        Owned ×{owned}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-500/40">
                        Village: {snack.villageSummary}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-500/40">
                        Dungeon: {snack.dungeonSummary}
                      </span>
                    </div>

                    {tab === 'secondary' && (
                      <div className="pt-1 border-t border-amber-900/15 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-amber-800/80 flex items-center justify-between">
                          <span>Farm Ingredients</span>
                          <span className="text-orange-700">+{snack.cookingXp} Cooking XP</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {snack.ingredients.map((req) => {
                            const have = countInventoryAnyQuality(player.inventory, req.itemId);
                            const enough = have >= req.quantity;
                            return (
                              <span
                                key={req.itemId}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  enough
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-600/40'
                                    : 'bg-rose-50 text-rose-800 border-rose-400/50'
                                }`}
                              >
                                {req.label}: {have}/{req.quantity}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1.5 pt-1">
                    {tab === 'primary' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => onBuySnack(snack.id, 1)}
                          className="flex-1 phum-btn py-1.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                        >
                          Buy 1 ({snack.buyCoins}c)
                        </button>
                        <button
                          type="button"
                          disabled={player.currencies.coins < snack.buyCoins * 3}
                          onClick={() => onBuySnack(snack.id, 3)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 border border-amber-950 font-display font-bold text-xs disabled:opacity-45"
                        >
                          ×3
                        </button>
                        {owned > 0 && (
                          <button
                            type="button"
                            onClick={() => onEatSnack(snack.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs"
                          >
                            Eat
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canCook}
                          onClick={() => onCookSnack(snack.id)}
                          className="flex-1 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white border-2 border-orange-950 font-display font-bold text-xs disabled:opacity-45"
                        >
                          {canCook ? `🍳 Cook (+${snack.cookingXp} XP)` : 'Need Farm Ingredients'}
                        </button>
                        {owned > 0 && (
                          <button
                            type="button"
                            onClick={() => onEatSnack(snack.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs"
                          >
                            Eat
                          </button>
                        )}
                      </div>
                    )}

                    {/* Quick-Bar Slot Picker */}
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-amber-800 font-semibold">
                        {slotIdx >= 0 ? `Quick-Bar Slot [${slotIdx + 1}]` : 'Assign to Quick-Bar:'}
                      </span>
                      <div className="flex gap-1">
                        {([0, 1, 2] as const).map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onAssignQuickSlot(idx, snack.id)}
                            className={`px-1.5 py-0.5 rounded font-bold border ${
                              slotIdx === idx
                                ? 'bg-amber-800 text-amber-50 border-amber-950'
                                : 'bg-amber-100 text-amber-900 border-amber-900/30 hover:bg-amber-200'
                            }`}
                          >
                            [{idx + 1}]
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== FASHION BOUTIQUE: BUY FASHION ==================== */}
      {mode === 'fashion' && tab === 'primary' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['all', 'All Boutique'],
                ['hat', 'Hats'],
                ['shirt', 'Outfits'],
                ['pants', 'Sampot & Bottoms'],
                ['hair', 'Premium Salon'],
                ['wings', 'Wings & Auras'],
                ['pet', 'Pets'],
                ['mount', '🚲 Mounts'],
              ] as const
            ).map(([slotKey, label]) => (
              <button
                key={slotKey}
                type="button"
                onClick={() => setFashionFilter(slotKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  fashionFilter === slotKey
                    ? 'bg-amber-800 text-amber-50 border-amber-950'
                    : 'bg-amber-50 text-amber-900 border-amber-900/30 hover:bg-amber-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-[172px_1fr] gap-3 items-start">
            {/* Live Try-On Preview */}
            <div className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-amber-50/90 border-2 border-amber-900/35">
              <PaperDollPreview loadout={previewLoadout} width={148} height={148} includePet />
              <div className="text-center">
                <div className="text-[11px] font-display font-bold text-amber-950">
                  {previewItemId ? `Trying: ${ITEM_CATALOG[previewItemId]?.name}` : 'Live Try-On Mirror'}
                </div>
                <div className="text-[10px] text-amber-800">
                  Current Stylish: <strong>{player.lifeStats.stylish}</strong>
                </div>
              </div>
            </div>

            {/* Boutique Catalog */}
            <div className="grid sm:grid-cols-2 gap-2 max-h-[52dvh] overflow-y-auto pr-1">
              {filteredFashion.map((item) => {
                const owned = isOwned(item.id);
                const equipped = isEquipped(item.id);
                const rStyle = RARITY_STYLES[item.rarity];
                const coinCost = item.shopPrice?.coins ?? 0;
                const goldCost = item.shopPrice?.gold ?? 0;
                const canAfford =
                  (coinCost === 0 || player.currencies.coins >= coinCost) &&
                  (goldCost === 0 || player.currencies.gold >= goldCost);

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setPreviewItemId(item.id)}
                    onClick={() => setPreviewItemId(item.id)}
                    className={`p-2.5 rounded-xl bg-amber-50/95 border-2 ${rStyle.border} flex flex-col justify-between gap-2 cursor-pointer transition hover:bg-white`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-7 h-7 rounded-lg border-2 border-amber-950/35 shrink-0"
                            style={{ backgroundColor: item.primaryColor }}
                          />
                          <div className="min-w-0">
                            <div className="font-display font-bold text-xs text-amber-950 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-amber-800 truncate">{item.khmerName}</div>
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${rStyle.pill}`}>
                          {item.rarity}
                        </span>
                      </div>

                      <p className="text-[10px] text-amber-900/90 leading-snug line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-400/40">
                          Stylish +{item.stylishScore}
                        </span>
                        {item.stats.attack && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-900">
                            ATK +{item.stats.attack}
                          </span>
                        )}
                        {item.stats.defense && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                            DEF +{item.stats.defense}
                          </span>
                        )}
                        {item.stats.maxHp && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900">
                            HP +{item.stats.maxHp}
                          </span>
                        )}
                        {item.stats.critChance && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            Crit +{Math.round(item.stats.critChance * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {owned ? (
                      equipped ? (
                        <div className="text-center py-1.5 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs">
                          ✓ Owned & Wearing
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEquipFashion(item.id);
                          }}
                          className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs"
                        >
                          Owned · Equip Now
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyFashion(item.id);
                        }}
                        className="w-full phum-btn py-1.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                      >
                        Buy · {goldCost > 0 ? `★ ${goldCost} Gold` : `${coinCost.toLocaleString()} Coins`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== FASHION BOUTIQUE: PAID SALON & WARDROBE MIRROR (UPDATE 2.2) ==================== */}
      {mode === 'fashion' && tab === 'secondary' && (() => {
        // Compute itemized Paid Salon bill for every option changed relative to current player.loadout
        let totalCoins = 0;
        let totalDiamonds = 0;
        const changes: string[] = [];
        const unlockItemIds: string[] = [];
        const patch: Partial<EquippedLoadout> = {};

        if (salonDraft.skinTone !== player.loadout.skinTone || salonDraft.skinColor !== player.loadout.skinColor) {
          totalCoins += SALON_PRICES.skinCoins;
          changes.push(`Skin Tone (${SALON_PRICES.skinCoins} C)`);
          patch.skinTone = salonDraft.skinTone;
          patch.skinColor = salonDraft.skinColor;
        }
        if (salonDraft.hairStyle !== player.loadout.hairStyle) {
          const hDef = ALL_HAIR_STYLES.find((h) => h.id === salonDraft.hairStyle);
          const premDia = SALON_PRICES.premiumHairDiamonds[salonDraft.hairStyle];
          if (premDia && hDef?.premiumItemId && !isOwned(hDef.premiumItemId)) {
            totalDiamonds += premDia;
            unlockItemIds.push(hDef.premiumItemId);
            changes.push(`${hDef.label} (${premDia} 💎)`);
          } else {
            totalCoins += SALON_PRICES.normalHairCoins;
            changes.push(`${hDef?.label ?? salonDraft.hairStyle} (${SALON_PRICES.normalHairCoins} C)`);
          }
          patch.hairStyle = salonDraft.hairStyle;
          patch.hair = hDef?.premiumItemId ?? null;
        }
        if (salonDraft.hairColor !== player.loadout.hairColor) {
          totalCoins += SALON_PRICES.hairColorCoins;
          changes.push(`Hair Color (${SALON_PRICES.hairColorCoins} C)`);
          patch.hairColor = salonDraft.hairColor;
        }
        if (salonDraft.eyeStyle !== player.loadout.eyeStyle) {
          const eDef = ALL_EYE_STYLES.find((e) => e.id === salonDraft.eyeStyle);
          const premDia = SALON_PRICES.premiumEyeDiamonds[salonDraft.eyeStyle];
          if (premDia && eDef?.premiumItemId && !isOwned(eDef.premiumItemId)) {
            totalDiamonds += premDia;
            unlockItemIds.push(eDef.premiumItemId);
            changes.push(`${eDef.label} (${premDia} 💎)`);
          } else {
            totalCoins += SALON_PRICES.normalEyeCoins;
            changes.push(`${eDef?.label ?? salonDraft.eyeStyle} (${SALON_PRICES.normalEyeCoins} C)`);
          }
          patch.eyeStyle = salonDraft.eyeStyle;
        }
        if (salonDraft.eyeColor !== player.loadout.eyeColor) {
          totalCoins += SALON_PRICES.eyeColorCoins;
          changes.push(`Eye Color (${SALON_PRICES.eyeColorCoins} C)`);
          patch.eyeColor = salonDraft.eyeColor;
        }
        if (salonDraft.eyebrowStyle !== player.loadout.eyebrowStyle) {
          totalCoins += SALON_PRICES.eyebrowCoins;
          changes.push(`Eyebrows (${SALON_PRICES.eyebrowCoins} C)`);
          patch.eyebrowStyle = salonDraft.eyebrowStyle;
        }
        if (salonDraft.faceStyle !== player.loadout.faceStyle) {
          const fDef = ALL_FACE_STYLES.find((f) => f.id === salonDraft.faceStyle);
          const premDia = SALON_PRICES.premiumFaceDiamonds[salonDraft.faceStyle];
          if (premDia && fDef?.premiumItemId && !isOwned(fDef.premiumItemId)) {
            totalDiamonds += premDia;
            unlockItemIds.push(fDef.premiumItemId);
            changes.push(`${fDef.label} (${premDia} 💎)`);
          } else {
            totalCoins += SALON_PRICES.normalFaceCoins;
            changes.push(`${fDef?.label ?? salonDraft.faceStyle} (${SALON_PRICES.normalFaceCoins} C)`);
          }
          patch.faceStyle = salonDraft.faceStyle;
        }

        const discountedCoins =
          npcPerks.boutiqueDiscountPct > 0
            ? Math.max(0, Math.round(totalCoins * (1 - npcPerks.boutiqueDiscountPct)))
            : totalCoins;
        const hasChanges = changes.length > 0;
        const canAffordCoins = player.currencies.coins >= discountedCoins;
        const canAffordDia = player.currencies.diamonds >= totalDiamonds;
        const canConfirm = hasChanges && canAffordCoins && canAffordDia;

        return (
          <div className="grid sm:grid-cols-[188px_1fr] gap-4 items-start">
            <div className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-amber-50/95 border-2 border-amber-900/30">
              <PaperDollPreview loadout={salonDraft} width={156} height={156} includePet />
              <div className="w-full text-center space-y-1 text-[10px]">
                <div className="font-display font-bold text-amber-950">
                  Bopha&apos;s Paid Salon Preview
                </div>
                <div className="flex items-center justify-center gap-2 font-bold">
                  <span className="inline-flex items-center gap-0.5 text-amber-900">
                    <Coins className="w-3 h-3 text-amber-600" />
                    {player.currencies.coins.toLocaleString()} C
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-sky-800">
                    <Gem className="w-3 h-3 text-sky-600" />
                    {player.currencies.diamonds.toLocaleString()} 💎
                  </span>
                </div>
              </div>

              {hasChanges ? (
                <div className="w-full p-2 rounded-xl bg-amber-100/90 border border-amber-900/25 text-[10px] space-y-1">
                  <div className="font-display font-bold text-amber-950 uppercase">
                    Salon Bill ({changes.length} changes)
                  </div>
                  <ul className="space-y-0.5 text-amber-900 leading-tight">
                    {changes.map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                  <div className="pt-1 border-t border-amber-900/20 font-display font-bold text-amber-950">
                    Total:{' '}
                    {discountedCoins > 0 ? `${discountedCoins.toLocaleString()} C` : ''}
                    {discountedCoins > 0 && totalDiamonds > 0 ? ' + ' : ''}
                    {totalDiamonds > 0 ? `${totalDiamonds} 💎` : ''}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-amber-800 text-center px-1">
                  Select options on the right to preview. Initial registration was free; Salon updates charge per option.
                </div>
              )}

              <button
                id="btn-confirm-salon-look"
                type="button"
                disabled={!canConfirm}
                onClick={() => {
                  onCustomizeLook(patch, {
                    coins: discountedCoins,
                    diamonds: totalDiamonds,
                    unlockItemIds,
                    summary: changes.join(', '),
                  });
                }}
                className="w-full phum-btn py-2 px-2 rounded-xl font-display font-bold text-[11px] disabled:opacity-45 cursor-pointer"
              >
                {!hasChanges
                  ? 'Select Changes to Apply'
                  : !canAffordCoins
                    ? `Need ${discountedCoins.toLocaleString()} C`
                    : !canAffordDia
                      ? `Need ${totalDiamonds} 💎`
                      : `Confirm Look · ${discountedCoins > 0 ? `${discountedCoins} C` : ''}${
                          discountedCoins > 0 && totalDiamonds > 0 ? ' + ' : ''
                        }${totalDiamonds > 0 ? `${totalDiamonds} 💎` : ''}`}
              </button>

              {hasChanges && (
                <button
                  type="button"
                  onClick={() => setSalonDraft({ ...player.loadout })}
                  className="w-full py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Preview
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs max-h-[54dvh] overflow-y-auto pr-1">
              <div className="px-2.5 py-1.5 rounded-xl bg-sky-50 border border-sky-600/35 text-[10px] text-sky-950 font-semibold">
                💈 <strong>Paid Salon Pricing:</strong> Normal styles cost <strong>150 C – 300 C</strong> per change. Cool / Premium styles (Glowing Golden Eyes, Silver Spiky, Braided Royal, Fierce Scar) cost <strong>80 – 180 💎 Diamonds</strong>!
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-amber-950">Skin Tone</span>
                  <span className="text-[10px] font-bold text-amber-800">{SALON_PRICES.skinCoins} C</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SKIN_TONES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      title={`${s.label} (${SALON_PRICES.skinCoins} C)`}
                      onClick={() => setSalonDraft((p) => ({ ...p, skinTone: s.id, skinColor: s.hex }))}
                      style={{ backgroundColor: s.hex }}
                      aria-label={`Skin ${s.label}`}
                      className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                        salonDraft.skinColor === s.hex || salonDraft.skinTone === s.id
                          ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                          : 'border-amber-900/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-amber-950">Hair Style &amp; Color</span>
                  <span className="text-[10px] font-bold text-amber-800">
                    Normal: {SALON_PRICES.normalHairCoins} C · Color: {SALON_PRICES.hairColorCoins} C
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALL_HAIR_STYLES.map((h) => {
                    const premDia = SALON_PRICES.premiumHairDiamonds[h.id];
                    const alreadyOwned = Boolean(h.premiumItemId && isOwned(h.premiumItemId));
                    const isCurrent = player.loadout.hairStyle === h.id;
                    const priceTag = isCurrent
                      ? 'Equipped'
                      : premDia && !alreadyOwned
                        ? `${premDia} 💎`
                        : `${SALON_PRICES.normalHairCoins} C`;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() =>
                          setSalonDraft((p) => ({ ...p, hairStyle: h.id, hair: h.premiumItemId ?? null }))
                        }
                        className={`px-2 py-1 rounded-xl font-bold border-2 text-[10px] cursor-pointer flex items-center gap-1 ${
                          salonDraft.hairStyle === h.id
                            ? 'bg-amber-800 text-amber-50 border-amber-950'
                            : premDia
                              ? 'bg-sky-50 text-sky-950 border-sky-500/60 hover:bg-sky-100'
                              : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
                        }`}
                      >
                        <span>{premDia ? `★ ${h.label}` : h.label}</span>
                        <span
                          className={`px-1 rounded text-[9px] ${
                            premDia && !alreadyOwned && !isCurrent
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-950/15'
                          }`}
                        >
                          {priceTag}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={`${c.label} (${SALON_PRICES.hairColorCoins} C)`}
                      onClick={() => setSalonDraft((p) => ({ ...p, hairColor: c.hex }))}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`Hair color ${c.label}`}
                      className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                        salonDraft.hairColor === c.hex
                          ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                          : 'border-amber-900/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-amber-950">Eyes &amp; Color</span>
                  <span className="text-[10px] font-bold text-amber-800">
                    Normal: {SALON_PRICES.normalEyeCoins} C · Color: {SALON_PRICES.eyeColorCoins} C
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALL_EYE_STYLES.map((ey) => {
                    const premDia = SALON_PRICES.premiumEyeDiamonds[ey.id];
                    const alreadyOwned = Boolean(ey.premiumItemId && isOwned(ey.premiumItemId));
                    const isCurrent = player.loadout.eyeStyle === ey.id;
                    const priceTag = isCurrent
                      ? 'Equipped'
                      : premDia && !alreadyOwned
                        ? `${premDia} 💎`
                        : `${SALON_PRICES.normalEyeCoins} C`;
                    return (
                      <button
                        key={ey.id}
                        type="button"
                        onClick={() => setSalonDraft((p) => ({ ...p, eyeStyle: ey.id }))}
                        className={`px-2 py-1 rounded-xl font-bold border-2 text-[10px] cursor-pointer flex items-center gap-1 ${
                          salonDraft.eyeStyle === ey.id
                            ? 'bg-amber-800 text-amber-50 border-amber-950'
                            : premDia
                              ? 'bg-sky-50 text-sky-950 border-sky-500/60 hover:bg-sky-100'
                              : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
                        }`}
                      >
                        <span>{premDia ? `★ ${ey.label}` : ey.label}</span>
                        <span
                          className={`px-1 rounded text-[9px] ${
                            premDia && !alreadyOwned && !isCurrent
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-950/15'
                          }`}
                        >
                          {priceTag}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {EYE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={`${c.label} (${SALON_PRICES.eyeColorCoins} C)`}
                      onClick={() => setSalonDraft((p) => ({ ...p, eyeColor: c.hex }))}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`Eye color ${c.label}`}
                      className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                        salonDraft.eyeColor === c.hex
                          ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                          : 'border-amber-900/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-amber-950">Eyebrows</span>
                  <span className="text-[10px] font-bold text-amber-800">{SALON_PRICES.eyebrowCoins} C</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {EYEBROW_STYLES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSalonDraft((p) => ({ ...p, eyebrowStyle: b.id }))}
                      className={`px-2 py-1 rounded-xl font-bold border-2 text-[10px] cursor-pointer flex items-center gap-1 ${
                        salonDraft.eyebrowStyle === b.id
                          ? 'bg-amber-800 text-amber-50 border-amber-950'
                          : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
                      }`}
                    >
                      <span>{b.label}</span>
                      <span className="px-1 rounded text-[9px] bg-amber-950/15">
                        {player.loadout.eyebrowStyle === b.id ? 'Equipped' : `${SALON_PRICES.eyebrowCoins} C`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-amber-950">Face &amp; Expression</span>
                  <span className="text-[10px] font-bold text-amber-800">Normal: {SALON_PRICES.normalFaceCoins} C</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALL_FACE_STYLES.map((f) => {
                    const premDia = SALON_PRICES.premiumFaceDiamonds[f.id];
                    const alreadyOwned = Boolean(f.premiumItemId && isOwned(f.premiumItemId));
                    const isCurrent = player.loadout.faceStyle === f.id;
                    const priceTag = isCurrent
                      ? 'Equipped'
                      : premDia && !alreadyOwned
                        ? `${premDia} 💎`
                        : `${SALON_PRICES.normalFaceCoins} C`;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSalonDraft((p) => ({ ...p, faceStyle: f.id }))}
                        className={`px-2 py-1 rounded-xl font-bold border-2 text-[10px] cursor-pointer flex items-center gap-1 ${
                          salonDraft.faceStyle === f.id
                            ? 'bg-amber-800 text-amber-50 border-amber-950'
                            : premDia
                              ? 'bg-sky-50 text-sky-950 border-sky-500/60 hover:bg-sky-100'
                              : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
                        }`}
                      >
                        <span>{premDia ? `★ ${f.label}` : f.label}</span>
                        <span
                          className={`px-1 rounded text-[9px] ${
                            premDia && !alreadyOwned && !isCurrent
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-950/15'
                          }`}
                        >
                          {priceTag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* FASHION TAB 3: KHMER STILT HOUSE FURNITURE SHOP */}
      {mode === 'fashion' && tab === 'furniture' && (
        <div className="space-y-2.5 text-xs">
          {npcPerks.boutiqueDiscountPct > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-600/40 text-emerald-950 font-bold text-[11px]">
              ❤️ Bopha 3-Heart Friendship Active: 15% Boutique &amp; Furniture Discount applied!
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-2 max-h-[52dvh] overflow-y-auto pr-1">
            {starterFurniture.map((furn) => {
              const owned = getOwnedFurnitureCount(player, furn.id);
              const rawPrice = furn.buyCoins ?? 200;
              const finalPrice = Math.max(1, Math.round(rawPrice * (1 - npcPerks.boutiqueDiscountPct)));
              return (
                <div
                  key={furn.id}
                  className="p-3 rounded-xl bg-amber-50/95 border-2 border-amber-900/30 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-bold text-xs text-amber-950">
                        {furn.icon} {furn.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-bold">
                        Owned ×{owned}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-amber-700">{furn.khmerName}</div>
                    <p className="text-[10px] text-amber-900/90 mt-1 leading-snug">{furn.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!onBuyFurniture || player.currencies.coins < finalPrice}
                    onClick={() => onBuyFurniture?.(furn.id)}
                    className="w-full phum-btn py-1.5 rounded-xl font-display font-bold text-xs disabled:opacity-45"
                  >
                    Buy for {finalPrice.toLocaleString()} Coins
                    {npcPerks.boutiqueDiscountPct > 0 ? ' (-15% ❤️)' : ''}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
