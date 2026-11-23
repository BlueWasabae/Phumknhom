import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Coins, Sparkles, Star } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

export interface WheelPrize {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  chancePct: number;
  coins?: number;
  itemId?: string;
  quantity?: number;
  isEquipment?: boolean;
  isMythic?: boolean;
}

export const COIN_SPIN_COST = 1500;
export const GOLD_SPIN_COST = 5;
export const GOLD_PITY_MAX = 50;

const COIN_PRIZES: WheelPrize[] = [
  { id: 'c_snacks', label: '3× Kampot Pepper Skewers', shortLabel: 'Skewers ×3', color: '#dc2626', chancePct: 26, itemId: 'snack_pepper_skewer', quantity: 3 },
  { id: 'c_fert', label: '6× Rich Fertilizer', shortLabel: 'Fert ×6', color: '#854d0e', chancePct: 24, itemId: 'fertilizer', quantity: 6 },
  { id: 'c_durian', label: '2× Golden Durian Feast', shortLabel: 'Durian ×2', color: '#eab308', chancePct: 18, itemId: 'snack_durian_feast', quantity: 2 },
  { id: 'c_jackpot', label: 'Coin Jackpot (+3,500 Coins)', shortLabel: '+3,500c', color: '#16a34a', chancePct: 15, coins: 3500 },
  { id: 'c_hat', label: 'Apsara Lotus Tiara (Epic Hat)', shortLabel: 'Tiara', color: '#ec4899', chancePct: 10, itemId: 'hat_apsara_crown', quantity: 1, isEquipment: true },
  { id: 'c_frog', label: 'Golden Lucky Frog Pet', shortLabel: 'Frog Pet', color: '#f59e0b', chancePct: 7, itemId: 'pet_golden_frog', quantity: 1, isEquipment: true },
];

const GOLD_PRIZES: WheelPrize[] = [
  { id: 'g_feast', label: '4× Golden Durian Feast', shortLabel: 'Feast ×4', color: '#d97706', chancePct: 28, itemId: 'snack_durian_feast', quantity: 4 },
  { id: 'g_coins', label: 'Royal Treasury (+6,000 Coins)', shortLabel: '+6,000c', color: '#16a34a', chancePct: 22, coins: 6000 },
  { id: 'g_naga', label: 'Royal Naga Wings (Epic)', shortLabel: 'Naga Wings', color: '#10b981', chancePct: 18, itemId: 'wings_dragon_cape', quantity: 1, isEquipment: true },
  { id: 'g_club', label: 'Heavy Stone Club (Epic Weapon)', shortLabel: 'Stone Club', color: '#78716c', chancePct: 14, itemId: 'weapon_stone_club', quantity: 1, isEquipment: true },
  { id: 'g_elephant', label: 'Baby Angkor Elephant Pet (Mythic)', shortLabel: 'Elephant', color: '#7c3aed', chancePct: 10, itemId: 'pet_baby_elephant', quantity: 1, isEquipment: true, isMythic: true },
  { id: 'g_wings', label: 'Celestial Apsara Wings (Mythic)', shortLabel: 'Apsara Wings', color: '#facc15', chancePct: 8, itemId: 'wings_angel_feather', quantity: 1, isEquipment: true, isMythic: true },
];

interface LuckyWheelModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onSpinResult: (tier: 'coin' | 'gold', prize: WheelPrize) => void;
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  open,
  player,
  onClose,
  onSpinResult,
}) => {
  const [tier, setTier] = useState<'coin' | 'gold'>('coin');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastWon, setLastWon] = useState<WheelPrize | null>(null);

  const prizes = tier === 'coin' ? COIN_PRIZES : GOLD_PRIZES;
  const pity = player.luckyWheelPity ?? 0;
  const canAfford =
    tier === 'coin'
      ? player.currencies.coins >= COIN_SPIN_COST
      : player.currencies.gold >= GOLD_SPIN_COST;

  const triggerSpin = () => {
    if (spinning || !canAfford) return;
    setSpinning(true);
    setLastWon(null);

    // 50-spin Mythic Pity guarantee on Gold Wheel!
    let chosenIdx = 0;
    if (tier === 'gold' && pity + 1 >= GOLD_PITY_MAX) {
      chosenIdx = Math.random() < 0.5 ? 4 : 5;
    } else {
      const roll = Math.random() * 100;
      let acc = 0;
      for (let i = 0; i < prizes.length; i++) {
        acc += prizes[i].chancePct;
        if (roll < acc) {
          chosenIdx = i;
          break;
        }
      }
    }

    const sliceDeg = 360 / prizes.length;
    // Align chosen slice cleanly beneath the top pointer (0 deg)
    const sliceCenter = chosenIdx * sliceDeg + sliceDeg / 2;
    const targetMod = (360 - sliceCenter + 360) % 360;
    const extraSpins = 360 * 5;
    const nextRot = rotation - (rotation % 360) + extraSpins + targetMod;
    setRotation(nextRot);

    const wonPrize = prizes[chosenIdx];
    window.setTimeout(() => {
      setSpinning(false);
      setLastWon(wonPrize);
      onSpinResult(tier, wonPrize);
    }, 2600);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Central Plaza · Royal Lucky Wheel"
      subtitle={`Coins: ${player.currencies.coins.toLocaleString()} · Gold: ★ ${player.currencies.gold} · Mythic Pity: ${pity}/${GOLD_PITY_MAX}`}
      maxWidthClass="w-[min(95vw,660px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Tier Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={spinning}
            onClick={() => {
              setTier('coin');
              setLastWon(null);
            }}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
              tier === 'coin'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" /> Coin Wheel ({COIN_SPIN_COST.toLocaleString()}c)
          </button>
          <button
            type="button"
            disabled={spinning}
            onClick={() => {
              setTier('gold');
              setLastWon(null);
            }}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
              tier === 'gold'
                ? 'bg-purple-800 text-amber-50 border-purple-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
            }`}
          >
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" /> Gold Wheel ({GOLD_SPIN_COST} Gold)
          </button>
        </div>

        <div className="grid sm:grid-cols-[224px_1fr] gap-4 items-center">
          {/* Animated SVG Spinning Wheel */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative w-52 h-52 flex items-center justify-center">
              {/* Top Pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-amber-500 drop-shadow" />

              <svg
                viewBox="0 0 200 200"
                className="w-48 h-48 rounded-full border-4 border-amber-950 shadow-xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 2.55s cubic-bezier(0.12, 0.85, 0.18, 1)' : 'none',
                }}
              >
                {prizes.map((p, idx) => {
                  const n = prizes.length;
                  const a0 = ((idx * 360) / n - 90) * (Math.PI / 180);
                  const a1 = (((idx + 1) * 360) / n - 90) * (Math.PI / 180);
                  const x1 = 100 + 98 * Math.cos(a0);
                  const y1 = 100 + 98 * Math.sin(a0);
                  const x2 = 100 + 98 * Math.cos(a1);
                  const y2 = 100 + 98 * Math.sin(a1);
                  const midDeg = (idx + 0.5) * (360 / n);
                  return (
                    <g key={p.id}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`}
                        fill={p.color}
                        stroke="#451a03"
                        strokeWidth="2"
                      />
                      <text
                        x="100"
                        y="32"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${midDeg} 100 100)`}
                      >
                        {p.shortLabel}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="18" fill="#fef3c7" stroke="#78350f" strokeWidth="3" />
                <text x="100" y="104" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#78350f">
                  SPIN
                </text>
              </svg>
            </div>

            <button
              type="button"
              disabled={spinning || !canAfford}
              onClick={triggerSpin}
              className="w-full stardew-btn py-2.5 rounded-xl font-display font-bold text-sm disabled:opacity-45 shadow"
            >
              {spinning
                ? 'Spinning...'
                : tier === 'coin'
                ? `Spin (${COIN_SPIN_COST.toLocaleString()} Coins)`
                : `Gold Spin (★ ${GOLD_SPIN_COST} Gold)`}
            </button>
          </div>

          {/* Transparent Drop Rates & 50-Spin Pity Tracker */}
          <div className="space-y-2.5">
            {lastWon && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 border-2 border-amber-600 text-amber-950 font-display font-bold text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>WON: {lastWon.label}! Added to Container.</span>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/25 space-y-1.5">
              <div className="flex items-center justify-between font-display font-bold text-[11px] text-amber-950">
                <span>Transparent Drop Rates</span>
                {tier === 'gold' && (
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px]">
                    Pity: {pity} / {GOLD_PITY_MAX}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {prizes.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-lg bg-white/80 border border-amber-900/15"
                  >
                    <span className="flex items-center gap-1.5 font-bold text-amber-950 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.label}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-800 shrink-0">{p.chancePct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {tier === 'gold' && (
              <div className="text-[10px] font-semibold text-purple-900 bg-purple-50 border border-purple-400/40 rounded-lg px-2.5 py-1.5">
                Guaranteed Mythic Cosmetic (Celestial Apsara Wings or Baby Angkor Elephant) within {GOLD_PITY_MAX} Gold spins!
              </div>
            )}
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
