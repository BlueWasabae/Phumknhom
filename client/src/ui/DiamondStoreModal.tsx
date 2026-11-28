import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  DIAMOND_PACKS,
  DIAMOND_SHOP_ITEMS,
  MONTHLY_VILLAGE_PASS,
  PHUM_WELCOME_BUNDLE,
  hasFirstTimeBonusForPack,
  hasFreeDailyReliquaryKey,
  isVillagePassActive,
} from '../data/diamondStore';
import {
  RELIQUARY_LEGENDARY_PITY,
  RELIQUARY_MYTHIC_PITY,
  RELIQUARY_OPEN_DIAMOND_COST,
} from '@shared/reliquaryPool';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  Gem,
  Gift,
  KeyRound,
  QrCode,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { NativeDialog } from './NativeDialog';

type StoreTab = 'bundles' | 'vip' | 'cosmetics' | 'reliquary';
type PaymentMethod = 'stripe' | 'aba_khqr' | 'sandbox';
type CosmeticFilter = 'all' | 'wings' | 'pet' | 'cosmetic' | 'salon' | 'mount' | 'account';

interface DiamondStoreModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onBuyShopItem: (shopId: string) => void;
  onToggleMount: (mountId: string) => void;
  onEquipItem: (itemId: string) => void;
  onCheckoutSku: (sku: string, method: PaymentMethod) => Promise<void>;
  onBuyVipWithDiamonds: () => void;
  onClaimDailyVipKey: () => void;
  onOpenReliquaryModal: () => void;
}

export const DiamondStoreModal: React.FC<DiamondStoreModalProps> = ({
  open,
  player,
  onClose,
  onBuyShopItem,
  onToggleMount,
  onEquipItem,
  onCheckoutSku,
  onBuyVipWithDiamonds,
  onClaimDailyVipKey,
  onOpenReliquaryModal,
}) => {
  const [tab, setTab] = useState<StoreTab>('bundles');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('sandbox');
  const [cosmeticFilter, setCosmeticFilter] = useState<CosmeticFilter>('all');
  const [busySku, setBusySku] = useState<string | null>(null);

  const passActive = isVillagePassActive(player);
  const canClaimDailyKey = hasFreeDailyReliquaryKey(player);
  const daysLeft =
    passActive && player.villagePassUntil
      ? Math.max(1, Math.ceil((player.villagePassUntil - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0;

  const triggerCheckout = async (sku: string, overrideMethod?: PaymentMethod) => {
    if (busySku) return;
    setBusySku(sku);
    try {
      await onCheckoutSku(sku, overrideMethod ?? paymentMethod);
    } finally {
      setBusySku(null);
    }
  };

  const filteredItems =
    cosmeticFilter === 'all'
      ? DIAMOND_SHOP_ITEMS
      : DIAMOND_SHOP_ITEMS.filter((i) => i.category === cosmeticFilter);

  const keys = Math.max(0, player.reliquaryKeys ?? 0);
  const shards = Math.max(0, player.angkorShards ?? 0);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="💎 Royal Diamond Store, VIP Pass & Mystery Reliquary"
      subtitle={`💎 ${player.currencies.diamonds.toLocaleString()} Diamonds · 🗝️ ${keys} Keys · 💠 ${shards} Shards${
        passActive ? ` · 👑 VIP Active (${daysLeft}d)` : ''
      }`}
      maxWidthClass="w-[min(96vw,820px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Fair Non-Pay-to-Win Pledge Banner */}
        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-600/35 text-sky-950 flex items-center gap-2 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
          <span>
            <strong>100% Fair · Zero Combat Pay-to-Win:</strong> All paid bundles, VIP Convenience Pass, Wings, Pets &amp; Reliquary drops provide style &amp; QoL only — never boss damage or PvP power!
          </span>
        </div>

        {/* 4-Tab Storefront Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(
            [
              ['bundles', 'Starter & Packs', Gift],
              ['vip', 'VIP Pass ($4.99)', Crown],
              ['cosmetics', 'Wings, Pets & Salon', ShoppingBag],
              ['reliquary', `Reliquary (${keys} 🗝️)`, KeyRound],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-2.5 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                tab === id
                  ? 'bg-sky-700 text-white border-sky-950 shadow'
                  : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[58dvh] overflow-y-auto pr-1">
          {/* ==================== TAB 1: STARTER & VALUE BUNDLES ==================== */}
          {tab === 'bundles' && (
            <div className="space-y-3">
              {/* Checkout Provider Selector */}
              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-900/25 flex flex-wrap items-center justify-between gap-2">
                <span className="font-display font-bold text-[11px] text-amber-950">
                  Checkout Method:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['stripe', '💳 Stripe Card', CreditCard],
                      ['aba_khqr', '🇰🇭 ABA PayWay / KHQR', QrCode],
                      ['sandbox', '🧪 Test Sandbox', Zap],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`px-2.5 py-1 rounded-lg font-display font-bold text-[11px] border transition cursor-pointer ${
                        paymentMethod === id
                          ? 'bg-emerald-700 text-white border-emerald-950 shadow-sm'
                          : 'bg-white text-amber-950 border-amber-900/30 hover:bg-amber-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phum Welcome Bundle ($1.99 — 1-Time Only) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-rose-50 border-2 border-amber-600 shadow-sm space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-rose-600 text-white font-display font-bold text-[9px] uppercase tracking-wide mb-1">
                      {PHUM_WELCOME_BUNDLE.badge}
                    </span>
                    <div className="font-display font-bold text-base text-amber-950">
                      🎁 {PHUM_WELCOME_BUNDLE.name}
                    </div>
                    <div className="text-[11px] font-bold text-amber-800">
                      {PHUM_WELCOME_BUNDLE.khmerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-xl text-emerald-800">
                      {PHUM_WELCOME_BUNDLE.priceUsd}
                    </div>
                    <div className="text-[10px] font-bold text-amber-800">1-Time Account Offer</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PHUM_WELCOME_BUNDLE.contents.map((c) => (
                    <div
                      key={c.label}
                      className="p-2 rounded-xl bg-white/90 border border-amber-700/25 flex items-center gap-1.5 text-[10px] font-bold text-amber-950"
                    >
                      <span className="text-base">{c.icon}</span>
                      <span className="leading-tight">{c.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                  {player.welcomeBundleClaimed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-500/40 font-display font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" /> Welcome Bundle Claimed!
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busySku !== null}
                      onClick={() => void triggerCheckout(PHUM_WELCOME_BUNDLE.sku)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border-2 border-amber-950 font-display font-bold text-xs shadow active:scale-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      {busySku === PHUM_WELCOME_BUNDLE.sku
                        ? 'Processing...'
                        : `Claim Welcome Bundle (${PHUM_WELCOME_BUNDLE.priceUsd} · ${
                            paymentMethod === 'stripe'
                              ? 'Stripe'
                              : paymentMethod === 'aba_khqr'
                              ? 'ABA KHQR'
                              : 'Sandbox'
                          })`}
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Diamond Packs with First-Time 2x Bonus */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {DIAMOND_PACKS.map((pack) => {
                  const firstTime = hasFirstTimeBonusForPack(player, pack.sku);
                  return (
                    <div
                      key={pack.sku}
                      className="p-3 rounded-2xl bg-gradient-to-b from-sky-50 to-white border-2 border-sky-700/45 flex flex-col justify-between gap-2.5 text-center relative"
                    >
                      <div className="space-y-1">
                        {firstTime ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 border border-amber-700/40 font-display font-bold text-[9px] uppercase">
                            ✨ FIRST-TIME 2× BONUS!
                          </span>
                        ) : pack.badge ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-sky-200 text-sky-950 font-display font-bold text-[9px] uppercase">
                            {pack.badge}
                          </span>
                        ) : null}

                        <div className="text-3xl pt-1">💎</div>
                        <div className="font-display font-bold text-base text-sky-950">
                          {pack.diamonds.toLocaleString()} 💎
                        </div>
                        {firstTime && (
                          <div className="text-[10px] font-bold text-emerald-700">
                            → Receive {(pack.diamonds * 2).toLocaleString()} 💎 on 1st Buy!
                          </div>
                        )}
                        <div className="font-display font-bold text-sm text-emerald-800">
                          {pack.priceUsd}
                        </div>
                        <p className="text-[10px] text-slate-600 leading-snug">{pack.desc}</p>
                      </div>

                      <button
                        type="button"
                        disabled={busySku !== null}
                        onClick={() => void triggerCheckout(pack.sku)}
                        className="w-full py-2 rounded-xl bg-gradient-to-b from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 text-white border-2 border-sky-950 font-display font-bold text-[11px] shadow active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        {busySku === pack.sku
                          ? 'Processing...'
                          : `${pack.priceUsd} · ${
                              paymentMethod === 'stripe'
                                ? 'Stripe'
                                : paymentMethod === 'aba_khqr'
                                ? 'ABA KHQR'
                                : 'Sandbox'
                            }`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/20 text-[10px] text-amber-950 space-y-0.5">
                <div className="font-display font-bold text-[11px]">
                  Verified Server-Side Web Checkout (0% App Store Tax on www.bluexacedamy.space)
                </div>
                <div>
                  • <strong>Stripe Card:</strong> <code>POST /api/checkout/stripe</code> + raw-body HMAC webhook <code>/api/webhook/stripe</code>
                </div>
                <div>
                  • <strong>Cambodia ABA PayWay / KHQR:</strong> <code>POST /api/checkout/aba-khqr</code> (falls back cleanly to Sandbox if merchant keys are unset)
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: VIP CONVENIENCE PASS ==================== */}
          {tab === 'vip' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-700 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-lg text-amber-950 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600 fill-yellow-400" />
                    {MONTHLY_VILLAGE_PASS.name}
                  </div>
                  <div className="text-xs font-bold text-amber-800">{MONTHLY_VILLAGE_PASS.khmerName}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lg text-emerald-800">
                    {MONTHLY_VILLAGE_PASS.priceUsd}{' '}
                    <span className="text-xs text-sky-800">or 💎 {MONTHLY_VILLAGE_PASS.diamondPrice}</span>
                  </div>
                  {passActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> VIP Active ({daysLeft} days left)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800">Zero Combat P2W · Pure QoL</span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {MONTHLY_VILLAGE_PASS.perks.map((perk) => (
                  <div
                    key={perk.title}
                    className="p-2.5 rounded-xl bg-white/90 border border-amber-900/20 flex items-start gap-2"
                  >
                    <span className="text-xl leading-none shrink-0">{perk.icon}</span>
                    <div>
                      <div className="font-display font-bold text-xs text-amber-950">{perk.title}</div>
                      <div className="text-[10px] text-amber-900/85 leading-snug">{perk.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Free VIP Reliquary Key Claim Box */}
              {passActive && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border-2 border-emerald-600/40 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-700" />
                    Daily VIP Perk: 1 Free Angkor Reliquary Key Every Day
                  </div>
                  <button
                    type="button"
                    disabled={!canClaimDailyKey}
                    onClick={onClaimDailyVipKey}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs disabled:opacity-45 cursor-pointer"
                  >
                    {canClaimDailyKey ? '🗝️ Claim Free Daily Key' : '✓ Claimed Today'}
                  </button>
                </div>
              )}

              {/* VIP Activation Buttons: Stripe, ABA KHQR, Sandbox, or 350 Diamonds */}
              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={busySku !== null}
                  onClick={() => void triggerCheckout(MONTHLY_VILLAGE_PASS.sku, 'sandbox')}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border-2 border-amber-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  {busySku === MONTHLY_VILLAGE_PASS.sku
                    ? 'Activating...'
                    : passActive
                    ? 'Extend +30 Days ($4.99 Sandbox)'
                    : 'Activate VIP Pass ($4.99 Sandbox)'}
                </button>
                <button
                  type="button"
                  disabled={player.currencies.diamonds < MONTHLY_VILLAGE_PASS.diamondPrice}
                  onClick={onBuyVipWithDiamonds}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-b from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 text-white border-2 border-sky-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition disabled:opacity-45 cursor-pointer"
                >
                  <Gem className="w-4 h-4" />
                  Buy with 💎 {MONTHLY_VILLAGE_PASS.diamondPrice} Diamonds
                </button>
                <button
                  type="button"
                  disabled={busySku !== null}
                  onClick={() => void triggerCheckout(MONTHLY_VILLAGE_PASS.sku, 'stripe')}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 font-display font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Pay $4.99 via Stripe Card
                </button>
                <button
                  type="button"
                  disabled={busySku !== null}
                  onClick={() => void triggerCheckout(MONTHLY_VILLAGE_PASS.sku, 'aba_khqr')}
                  className="py-2 px-3 rounded-xl bg-cyan-900 hover:bg-cyan-800 text-white border border-cyan-950 font-display font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> Pay $4.99 via ABA PayWay / KHQR
                </button>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: PRESTIGE WINGS, PETS & SALON ==================== */}
          {tab === 'cosmetics' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['all', 'All Prestige'],
                    ['wings', '🪽 4-Frame Wings'],
                    ['pet', '🐲 Auto-Loot Pets'],
                    ['cosmetic', '👑 Royal Sets'],
                    ['salon', '👁️ Luxury Salon'],
                    ['mount', '🛺 Mounts'],
                    ['account', '🎒 Bag QoL'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCosmeticFilter(id)}
                    className={`px-2.5 py-1 rounded-lg font-display font-bold text-[11px] border transition cursor-pointer ${
                      cosmeticFilter === id
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/25 hover:bg-amber-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {filteredItems.map((item) => {
                  const ownedEquip = Boolean(
                    item.itemId &&
                      player.inventory.some((i) => i.itemId === item.itemId && i.quantity > 0)
                  );
                  const ownedMount = Boolean(
                    item.mountId && (player.ownedMounts ?? []).includes(item.mountId)
                  );
                  const mountEquipped = Boolean(item.mountId && player.activeMount === item.mountId);
                  const canAfford = player.currencies.diamonds >= item.diamondCost;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-amber-50/90 border-2 border-amber-900/30 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl leading-none">{item.icon}</span>
                            <div>
                              <div className="font-display font-bold text-sm text-amber-950">
                                {item.name}
                              </div>
                              <div className="text-[10px] font-bold text-amber-800">
                                {item.khmerName}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-400/40 font-bold text-[10px] shrink-0">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-950/85 leading-snug">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-amber-900/15">
                        <span className="font-display font-bold text-sm text-sky-800 flex items-center gap-1">
                          💎 {item.diamondCost}
                        </span>

                        {ownedMount && item.mountId ? (
                          <button
                            type="button"
                            onClick={() => onToggleMount(item.mountId!)}
                            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 transition cursor-pointer ${
                              mountEquipped
                                ? 'bg-emerald-700 text-white border-emerald-950'
                                : 'bg-amber-200 text-amber-950 border-amber-900'
                            }`}
                          >
                            {mountEquipped ? '🛺 Riding (Click to Park)' : '🛺 Ride Tuk-Tuk'}
                          </button>
                        ) : ownedEquip && item.itemId ? (
                          <button
                            type="button"
                            onClick={() => onEquipItem(item.itemId!)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs cursor-pointer"
                          >
                            Owned · Equip
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onBuyShopItem(item.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white border-2 border-sky-950 font-display font-bold text-xs disabled:opacity-45 active:scale-95 transition cursor-pointer"
                          >
                            {item.bagSlotsBonus
                              ? `Expand (+${item.bagSlotsBonus})`
                              : canAfford
                              ? 'Unlock'
                              : 'Need Diamonds'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: MYSTERY RELIQUARY GACHA LAUNCHER ==================== */}
          {tab === 'reliquary' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950 to-purple-950 border-2 border-amber-500 text-amber-50 space-y-3 text-center">
              <div className="text-5xl">🏺</div>
              <div>
                <div className="font-display font-bold text-lg text-amber-300">
                  Angkor Mystery Reliquary Gacha
                </div>
                <div className="text-xs text-amber-100/85 max-w-lg mx-auto mt-1">
                  Spend <strong>💎 {RELIQUARY_OPEN_DIAMOND_COST} Diamonds</strong> or{' '}
                  <strong>1 🗝️ Reliquary Key</strong> (earned free from Weekly Bounties, Bosses &amp; Daily VIP) to unseal animated 6-Wing Seraph Wings, Auto-Loot Naga Pets &amp; Ancient Sovereign Sets!
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-[11px]">
                <div className="p-2 rounded-xl bg-white/10 border border-amber-400/30">
                  <div className="text-amber-300 font-bold">Keys</div>
                  <div className="font-display font-bold text-base">🗝️ {keys}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/10 border border-amber-400/30">
                  <div className="text-amber-300 font-bold">Legendary Pity</div>
                  <div className="font-display font-bold text-base">
                    {player.reliquaryPityCount ?? 0} / {RELIQUARY_LEGENDARY_PITY}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white/10 border border-amber-400/30">
                  <div className="text-amber-300 font-bold">Mythic Pity</div>
                  <div className="font-display font-bold text-base">
                    {player.reliquaryMythicPityCount ?? 0} / {RELIQUARY_MYTHIC_PITY}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenReliquaryModal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 border-2 border-amber-950 font-display font-bold text-sm shadow-lg active:scale-95 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Open Mystery Reliquary &amp; Shard Exchange
                </button>
              </div>
              <div className="text-[10px] text-amber-200/75">
                Full exact drop-rate disclosure (55% / 28% / 12% / 4.2% / 0.65% / 0.15%) &amp; duplicate Angkor Shard exchange inside!
              </div>
            </div>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
