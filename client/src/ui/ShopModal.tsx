import React, { useEffect, useState } from 'react';
import type {
  EquipSlot,
  EquippedLoadout,
  EyeStyleId,
  HairStyleId,
  ItemRarity,
  PlayerState,
} from '@shared/types';
import { Coins, ChefHat, Crown, Sparkles, UtensilsCrossed } from 'lucide-react';
import { FASHION_SHOP_ITEMS, ITEM_CATALOG } from '../data/items';
import { STREET_SNACK_LIST, countInventoryAnyQuality } from '../data/recipes';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

export type ShopMode = 'snack' | 'fashion';

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
  onEquipFashion: (itemId: string) => void;
  onCustomizeLook: (patch: Partial<EquippedLoadout>) => void;
}

const SKIN_TONES = ['#fde2c4', '#f4c29f', '#e5a97c', '#c68658', '#8d5524'];
const HAIR_COLORS = ['#1e1b24', '#451a03', '#7c2d12', '#1d4ed8', '#db2777', '#eab308', '#10b981'];
const HAIR_STYLES: Array<{ id: HairStyleId; label: string }> = [
  { id: 'hair_short', label: 'Short' },
  { id: 'hair_bob', label: 'Bob' },
  { id: 'hair_spiky', label: 'Spiky' },
  { id: 'hair_long', label: 'Long' },
];
const EYE_STYLES: Array<{ id: EyeStyleId; label: string }> = [
  { id: 'cheerful', label: 'Cheerful' },
  { id: 'classic', label: 'Classic' },
  { id: 'cool', label: 'Cool' },
  { id: 'starry', label: 'Starry' },
];

const RARITY_STYLES: Record<ItemRarity, { border: string; pill: string }> = {
  common: { border: 'border-stone-500/60', pill: 'bg-stone-600 text-white' },
  uncommon: { border: 'border-emerald-600', pill: 'bg-emerald-700 text-white' },
  rare: { border: 'border-sky-600', pill: 'bg-sky-700 text-white' },
  epic: { border: 'border-purple-600', pill: 'bg-purple-700 text-white' },
  legendary: { border: 'border-amber-500', pill: 'bg-amber-600 text-white' },
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
  onEquipFashion,
  onCustomizeLook,
}) => {
  const [tab, setTab] = useState<'primary' | 'secondary'>(initialTab);
  const [fashionFilter, setFashionFilter] = useState<'all' | EquipSlot>('all');
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setPreviewItemId(null);
    }
  }, [open, mode, initialTab]);

  const cookingSkill = player.skills.skills.cooking;

  // Build live preview loadout when hovering/selecting a boutique item
  const previewLoadout: EquippedLoadout = (() => {
    if (!previewItemId) return player.loadout;
    const def = ITEM_CATALOG[previewItemId];
    if (!def) return player.loadout;
    return { ...player.loadout, [def.slot]: def.id };
  })();

  const isOwned = (itemId: string) =>
    player.inventory.some((entry) => entry.itemId === itemId && entry.quantity > 0);

  const isEquipped = (itemId: string) => {
    const def = ITEM_CATALOG[itemId];
    return def ? player.loadout[def.slot] === itemId : false;
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
                ['pants', 'Sampot'],
                ['wings', 'Wings & Auras'],
                ['pet', 'Pets'],
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

      {/* ==================== FASHION BOUTIQUE: WARDROBE MIRROR ==================== */}
      {mode === 'fashion' && tab === 'secondary' && (
        <div className="grid sm:grid-cols-[164px_1fr] gap-4 items-center">
          <div className="flex flex-col items-center gap-2">
            <PaperDollPreview loadout={player.loadout} width={156} height={156} includePet />
            <span className="text-[11px] font-bold text-amber-900">Updates in Village Live!</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-display font-bold text-amber-950 mb-1.5">Skin Tone</div>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onCustomizeLook({ skinColor: color })}
                    style={{ backgroundColor: color }}
                    aria-label={`Skin ${color}`}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      player.loadout.skinColor === color
                        ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                        : 'border-amber-900/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="font-display font-bold text-amber-950 mb-1.5">Hair Style</div>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onCustomizeLook({ hairStyle: h.id, hair: null })}
                    className={`px-3 py-1.5 rounded-xl font-bold border-2 ${
                      player.loadout.hairStyle === h.id && !player.loadout.hair
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/35'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-display font-bold text-amber-950 mb-1.5">Hair Color</div>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onCustomizeLook({ hairColor: color })}
                    style={{ backgroundColor: color }}
                    aria-label={`Hair color ${color}`}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      player.loadout.hairColor === color
                        ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                        : 'border-amber-900/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="font-display font-bold text-amber-950 mb-1.5">Eyes & Expression</div>
              <div className="flex flex-wrap gap-1.5">
                {EYE_STYLES.map((ey) => (
                  <button
                    key={ey.id}
                    type="button"
                    onClick={() => onCustomizeLook({ eyeStyle: ey.id })}
                    className={`px-3 py-1.5 rounded-xl font-bold border-2 ${
                      player.loadout.eyeStyle === ey.id
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/35'
                    }`}
                  >
                    {ey.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
