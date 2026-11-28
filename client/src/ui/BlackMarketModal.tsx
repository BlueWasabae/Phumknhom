import React, { useMemo, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { ITEM_CATALOG } from '../data/items';

export type BlackMarketOfferId =
  | 'bm_reliquary_gold'
  | 'bm_reliquary_diamonds'
  | 'bm_shadow_cloak_gold'
  | 'bm_shadow_cloak_ores'
  | 'bm_wave_aura_gold'
  | 'bm_wave_aura_pearls'
  | 'bm_essence_awakening_bundle';

export interface BlackMarketPurchaseResult {
  ok: boolean;
  message: string;
  rolledRewardLabel?: string;
}

interface BlackMarketModalProps {
  isOpen: boolean;
  player: PlayerState;
  rotationSeed: number;
  onClose: () => void;
  onPurchase: (offerId: BlackMarketOfferId, rotationSeed: number) => BlackMarketPurchaseResult;
}

const AWAKENING_CORE_ROTATION = [
  { id: 'mat_golden_laterite_core', name: 'Golden Laterite Core', icon: '🔶' },
  { id: 'mat_spirit_bamboo_heart', name: 'Spirit Bamboo Heart', icon: '🎋' },
  { id: 'mat_sunken_angkor_relic', name: 'Sunken Angkor Relic', icon: '🏛️' },
];

export const BlackMarketModal: React.FC<BlackMarketModalProps> = ({
  isOpen,
  player,
  rotationSeed,
  onClose,
  onPurchase,
}) => {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const countOf = (itemId: string) =>
    player.inventory.reduce((sum, i) => (i.itemId === itemId ? sum + i.quantity : sum), 0);

  const rotatingCore = useMemo(
    () => AWAKENING_CORE_ROTATION[Math.abs(rotationSeed) % AWAKENING_CORE_ROTATION.length],
    [rotationSeed]
  );

  if (!isOpen) return null;

  const ownsShadowCloak = countOf('wings_smuggler_shadow_cloak') > 0;
  const ownsWaveAura =
    Boolean(player.hasBioluminescentWaveAura) || countOf('wings_bioluminescent_wave_aura') > 0;
  const bundleLimitKey = `bm_bundle_visit_${rotationSeed}`;
  const boughtBundleThisVisit = (player.blackMarketPurchasedKeys ?? []).includes(bundleLimitKey);

  const jadeCount = countOf('ore_jade_crystal');
  const angkorGoldCount = countOf('ore_angkor_gold');
  const seaPearlCount = countOf('pearl_sea');

  const triggerBuy = (offerId: BlackMarketOfferId) => {
    const res = onPurchase(offerId, rotationSeed);
    setFeedback({
      ok: res.ok,
      text: res.rolledRewardLabel ? `${res.message} — Rolled: ${res.rolledRewardLabel}` : res.message,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-amber-400/75 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 text-emerald-50 shadow-[0_0_50px_rgba(16,185,129,0.28)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-400/35 bg-black/45 px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏮</span>
              <h2 className="font-serif text-lg font-black tracking-wide text-amber-300">
                Monsoon Night Black Market · ផ្សារងងឹតរដូវវស្សា
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-200/80">
              Hooded Smuggler of Misty Bamboo Forest · Zero Combat P2W · Visit Rotation #{rotationSeed}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-amber-400/50 bg-slate-900/90 px-3 py-1 text-xs font-extrabold text-amber-200 hover:bg-amber-900/40"
          >
            ✕ Close
          </button>
        </div>

        {/* Currency & Material Strip */}
        <div className="flex flex-wrap items-center gap-2 border-b border-emerald-800/60 bg-emerald-950/50 px-5 py-2 text-[11px] font-bold">
          <span className="rounded-lg border border-amber-500/40 bg-black/40 px-2.5 py-1 text-amber-200">
            🪙 {player.currencies.coins.toLocaleString()} Coins
          </span>
          <span className="rounded-lg border border-yellow-400/50 bg-black/40 px-2.5 py-1 text-yellow-200">
            🥇 {player.currencies.gold.toLocaleString()} Gold
          </span>
          <span className="rounded-lg border border-cyan-400/50 bg-black/40 px-2.5 py-1 text-cyan-200">
            💎 {player.currencies.diamonds.toLocaleString()} Diamonds
          </span>
          <span className="rounded-lg border border-emerald-400/40 bg-black/40 px-2.5 py-1 text-emerald-200">
            💚 Jade Crystal: {jadeCount}
          </span>
          <span className="rounded-lg border border-amber-400/40 bg-black/40 px-2.5 py-1 text-amber-100">
            ✨ Angkor Gold Ore: {angkorGoldCount}
          </span>
          <span className="rounded-lg border border-sky-400/40 bg-black/40 px-2.5 py-1 text-sky-200">
            🫧 Sea Pearls: {seaPearlCount}
          </span>
        </div>

        {feedback && (
          <div
            className={`mx-5 mt-3 rounded-xl border px-3.5 py-2 text-xs font-bold ${
              feedback.ok
                ? 'border-emerald-400/70 bg-emerald-900/60 text-emerald-100'
                : 'border-rose-400/70 bg-rose-950/70 text-rose-100'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* 4 Rotating Rare Smuggler Offers */}
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          {/* 1. Ancient Reliquary Box */}
          <div className="flex flex-col justify-between rounded-xl border border-amber-400/50 bg-black/45 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-amber-200">🗝️ Ancient Reliquary Box</span>
                <span className="rounded-full border border-cyan-400/60 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-black text-cyan-200">
                  Common → Ancient
                </span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-100/80">
                Smuggled Angkor Mystery Reliquary sealed in dark jade wax. Rolls our exact 6-tier{' '}
                <strong className="text-amber-200">Common → Ancient</strong> cosmetic pool with full pity tracking!
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => triggerBuy('bm_reliquary_gold')}
                disabled={player.currencies.gold < 10}
                className="flex-1 rounded-lg border border-amber-400/70 bg-amber-700/80 px-3 py-1.5 text-xs font-black text-amber-50 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Buy · 10 🥇 Gold
              </button>
              <button
                type="button"
                onClick={() => triggerBuy('bm_reliquary_diamonds')}
                disabled={player.currencies.diamonds < 40}
                className="flex-1 rounded-lg border border-cyan-400/70 bg-cyan-800/80 px-3 py-1.5 text-xs font-black text-cyan-50 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Buy · 40 💎
              </button>
            </div>
          </div>

          {/* 2. Smuggler's Shadow Cloak */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-400/50 bg-black/45 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-emerald-200">🧥 Smuggler&apos;s Shadow Cloak</span>
                <span className="rounded-full border border-purple-400/60 bg-purple-950/80 px-2 py-0.5 text-[10px] font-black text-purple-200">
                  Vanity Cape · 0 P2W
                </span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-100/80">
                {ITEM_CATALOG.wings_smuggler_shadow_cloak?.description ??
                  'Black Market exclusive dark jade-and-gold shadow cloak (+175 Stylish, 0 combat stats).'}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ownsShadowCloak ? (
                <div className="w-full rounded-lg border border-emerald-400/50 bg-emerald-900/50 py-1.5 text-center text-xs font-black text-emerald-200">
                  ✓ Owned (Equip in Wardrobe / Inventory)
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => triggerBuy('bm_shadow_cloak_gold')}
                    disabled={player.currencies.gold < 8}
                    className="flex-1 rounded-lg border border-amber-400/70 bg-amber-700/80 px-3 py-1.5 text-xs font-black text-amber-50 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    8 🥇 Gold
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerBuy('bm_shadow_cloak_ores')}
                    disabled={jadeCount < 4 || player.currencies.coins < 600}
                    className="flex-1 rounded-lg border border-emerald-400/70 bg-emerald-800/80 px-3 py-1.5 text-xs font-black text-emerald-50 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    4× Jade + 600c
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 3. Bioluminescent Wave Aura */}
          <div className="flex flex-col justify-between rounded-xl border border-cyan-400/60 bg-black/45 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-cyan-200">🌊 Bioluminescent Wave Aura</span>
                <span className="rounded-full border border-cyan-300/70 bg-cyan-950/90 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                  Footstep Ripple FX
                </span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-100/80">
                Renders a glowing animated cyan Koh Rong water-ripple trail around your hero&apos;s feet in the
                Overworld (+190 Stylish, 0 combat stats)!
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ownsWaveAura ? (
                <div className="w-full rounded-lg border border-cyan-400/60 bg-cyan-950/70 py-1.5 text-center text-xs font-black text-cyan-200">
                  ✓ Active — Cyan Water-Ripple Trail Unlocked!
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => triggerBuy('bm_wave_aura_gold')}
                    disabled={player.currencies.gold < 12}
                    className="flex-1 rounded-lg border border-amber-400/70 bg-amber-700/80 px-3 py-1.5 text-xs font-black text-amber-50 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    12 🥇 Gold
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerBuy('bm_wave_aura_pearls')}
                    disabled={seaPearlCount < 2 || player.currencies.coins < 800}
                    className="flex-1 rounded-lg border border-cyan-400/70 bg-cyan-800/80 px-3 py-1.5 text-xs font-black text-cyan-50 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    2× Sea Pearl + 800c
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 4. Rare Boss Essence / Awakening Core Bundle */}
          <div className="flex flex-col justify-between rounded-xl border border-amber-500/60 bg-black/45 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-amber-300">
                  {rotatingCore.icon} Boss Essence &amp; Awakening Bundle
                </span>
                <span className="rounded-full border border-rose-400/60 bg-rose-950/80 px-2 py-0.5 text-[10px] font-black text-rose-200">
                  Limit 1 / Visit
                </span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-100/80">
                Includes <strong className="text-amber-200">1× {rotatingCore.name}</strong> +{' '}
                <strong className="text-purple-200">1× Naga Essence</strong> +{' '}
                <strong className="text-sky-200">1× Stone Essence</strong>. Craftable strictly with mined Cavern Ores +
                Coins!
              </p>
            </div>
            <div className="mt-3">
              {boughtBundleThisVisit ? (
                <div className="w-full rounded-lg border border-amber-400/40 bg-amber-950/50 py-1.5 text-center text-xs font-black text-amber-200">
                  ✓ Claimed for Visit #{rotationSeed} (Wait for next Monsoon Night)
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerBuy('bm_essence_awakening_bundle')}
                  disabled={angkorGoldCount < 3 || player.currencies.coins < 1200}
                  className="w-full rounded-lg border border-amber-400/80 bg-gradient-to-r from-emerald-800 to-amber-700 px-3 py-1.5 text-xs font-black text-amber-50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Trade · 3× Angkor Gold Ore + 1,200 🪙 Coins
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
