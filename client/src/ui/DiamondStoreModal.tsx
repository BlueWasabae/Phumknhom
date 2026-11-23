import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  DIAMOND_PACKS,
  DIAMOND_SHOP_ITEMS,
  MONTHLY_VILLAGE_PASS,
  isVillagePassActive,
} from '../data/diamondStore';
import { CheckCircle2, Crown, Gem, ShieldCheck, Sparkles, ShoppingBag, Zap } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

type StoreTab = 'shop' | 'pass' | 'topup';

interface DiamondStoreModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onBuyShopItem: (shopId: string) => void;
  onToggleMount: (mountId: string) => void;
  onEquipItem: (itemId: string) => void;
  onSandboxTopUp: (sku: string) => Promise<void>;
}

export const DiamondStoreModal: React.FC<DiamondStoreModalProps> = ({
  open,
  player,
  onClose,
  onBuyShopItem,
  onToggleMount,
  onEquipItem,
  onSandboxTopUp,
}) => {
  const [tab, setTab] = useState<StoreTab>('shop');
  const [busySku, setBusySku] = useState<string | null>(null);
  const passActive = isVillagePassActive(player);
  const daysLeft = passActive && player.villagePassUntil
    ? Math.max(1, Math.ceil((player.villagePassUntil - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  const triggerTopUp = async (sku: string) => {
    if (busySku) return;
    setBusySku(sku);
    try {
      await onSandboxTopUp(sku);
    } finally {
      setBusySku(null);
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="💎 Royal Diamond Store & Monthly Village Pass"
      subtitle={`Your Balance: 💎 ${player.currencies.diamonds.toLocaleString()} Diamonds · Extra Bag Slots: +${player.extraBagSlots ?? 0}${passActive ? ` · 👑 VIP Active (${daysLeft}d)` : ''}`}
      maxWidthClass="w-[min(96vw,760px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Fair Non-Pay-to-Win Pledge Banner */}
        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-600/35 text-sky-950 flex items-center gap-2 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
          <span>
            <strong>100% Fair &amp; Non-Pay-to-Win:</strong> Diamonds unlock prestige Khmer fashion, Plaza mounts, Auto-Loot QoL pets, and bag space — never combat power or boss damage!
          </span>
        </div>

        {/* Tab Bar */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['shop', 'Diamond Shop', ShoppingBag],
              ['pass', 'Village Pass ($2.99)', Crown],
              ['topup', 'Top-Up Diamonds', Gem],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-2.5 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
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

        <div className="max-h-[56dvh] overflow-y-auto pr-1">
          {/* TAB 1: DIAMOND SHOP */}
          {tab === 'shop' && (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {DIAMOND_SHOP_ITEMS.map((item) => {
                const ownedEquip = Boolean(
                  item.itemId && player.inventory.some((i) => i.itemId === item.itemId && i.quantity > 0)
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
                          className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 transition ${
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
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs"
                        >
                          Owned · Equip
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onBuyShopItem(item.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white border-2 border-sky-950 font-display font-bold text-xs disabled:opacity-45 active:scale-95 transition"
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
          )}

          {/* TAB 2: MONTHLY VILLAGE PASS */}
          {tab === 'pass' && (
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
                    {MONTHLY_VILLAGE_PASS.priceUsd}
                  </div>
                  {passActive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Active ({daysLeft} days left)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {MONTHLY_VILLAGE_PASS.perks.map((perk) => (
                  <div
                    key={perk}
                    className="p-2.5 rounded-xl bg-white/85 border border-amber-900/20 font-bold text-amber-950 flex items-center gap-2 text-[11px]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busySku !== null}
                  onClick={() => void triggerTopUp(MONTHLY_VILLAGE_PASS.sku)}
                  className="flex-1 min-w-[200px] py-2.5 px-4 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border-2 border-amber-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 transition disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {busySku === MONTHLY_VILLAGE_PASS.sku
                    ? 'Activating...'
                    : passActive
                    ? 'Extend +30 Days (Dev Sandbox)'
                    : 'Activate Village Pass (Dev Sandbox)'}
                </button>
                <span className="text-[10px] font-semibold text-amber-900/80">
                  Live payments ready via Stripe Card &amp; ABA PayWay KHQR webhooks.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: TOP-UP DIAMONDS */}
          {tab === 'topup' && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-2.5">
                {DIAMOND_PACKS.map((pack) => (
                  <div
                    key={pack.sku}
                    className="p-3 rounded-2xl bg-gradient-to-b from-sky-50 to-white border-2 border-sky-700/45 flex flex-col justify-between gap-3 text-center"
                  >
                    <div className="space-y-1">
                      {pack.badge && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500 text-amber-950 font-display font-bold text-[9px] uppercase">
                          {pack.badge}
                        </span>
                      )}
                      <div className="text-3xl pt-1">💎</div>
                      <div className="font-display font-bold text-lg text-sky-950">
                        {pack.diamonds.toLocaleString()} Diamonds
                      </div>
                      <div className="font-display font-bold text-sm text-emerald-700">
                        {pack.priceUsd}
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug">{pack.desc}</p>
                    </div>

                    <button
                      type="button"
                      disabled={busySku !== null}
                      onClick={() => void triggerTopUp(pack.sku)}
                      className="w-full py-2 rounded-xl bg-gradient-to-b from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 text-white border-2 border-sky-950 font-display font-bold text-xs shadow active:scale-95 transition disabled:opacity-50"
                    >
                      {busySku === pack.sku ? 'Processing...' : `Test Top-Up (${pack.priceUsd})`}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/25 text-[10px] text-amber-950 space-y-1">
                <div className="font-display font-bold text-xs">
                  Web Checkout Providers (0% App Store Cut on www.bluexacedamy.space)
                </div>
                <div>
                  • <strong>Stripe Webhook:</strong> <code>POST /api/payments/stripe-webhook</code> (International Visa / Mastercard)
                </div>
                <div>
                  • <strong>ABA PayWay KHQR:</strong> <code>POST /api/payments/aba-payway-webhook</code> (Cambodia KHQR &amp; ABA Mobile)
                </div>
                <div>
                  • <strong>Dev Sandbox Mode:</strong> <code>POST /api/payments/sandbox-topup</code> (auto-disabled when <code>NODE_ENV=production</code>)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
