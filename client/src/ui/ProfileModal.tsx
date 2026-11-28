import React from 'react';
import type { PlayerState } from '@shared/types';
import { getXpForNextLevel } from '@shared/balanceFormulas';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import { Coins, Diamond, Download, Gem, Shield, Sparkles, Swords } from 'lucide-react';
import { downloadHeroCardPng } from '../utils/HeroCardGenerator';
import { soundManager } from '../game/systems/SoundManager';
import { EventBus } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface ProfileModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onOpenInventory: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  player,
  onClose,
  onOpenInventory,
}) => {
  const cls = KHMER_CLASSES[player.activeClass];
  const xpNeed = getXpForNextLevel(player.level);
  const xpPct = Math.min(100, Math.round((player.xp / Math.max(1, xpNeed)) * 100));
  const farmNeed = Math.floor(80 * Math.pow(player.lifeStats.farmLevel, 1.35));
  const farmPct = Math.min(100, Math.round((player.lifeStats.farmXp / Math.max(1, farmNeed)) * 100));

  const vipTitle =
    player.lifeStats.stylish >= 220
      ? 'Angkor Royalty'
      : player.lifeStats.stylish >= 140
      ? 'Plaza Icon'
      : player.lifeStats.stylish >= 80
      ? 'Phum Trendsetter'
      : 'Village Explorer';

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={`${player.name} · Profile Card`}
      subtitle={`★ ${vipTitle} · ${cls.khmerName} (${cls.englishName})`}
    >
      <div className="grid sm:grid-cols-[170px_1fr] gap-4">
        {/* Left Column: Live Character + Pet Preview, Level & 3 Currencies */}
        <div className="flex flex-col items-center gap-2.5">
          <PaperDollPreview loadout={player.loadout} width={160} height={160} includePet />

          {/* Level + XP% */}
          <div className="w-full p-2.5 rounded-xl bg-amber-50/90 border-2 border-amber-900/35 text-xs">
            <div className="flex justify-between font-display font-bold text-amber-950 mb-1">
              <span>Lv. {player.level}</span>
              <span>{xpPct}% XP</span>
            </div>
            <div className="h-2.5 rounded-full bg-amber-950/20 border border-amber-900/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                style={{ width: `${Math.max(4, xpPct)}%` }}
              />
            </div>
            <div className="text-[10px] text-amber-800 mt-1 text-right">
              {player.xp} / {xpNeed} XP
            </div>
          </div>

          {/* 3 Currencies: Coins, Gold, Diamonds */}
          <div className="w-full grid grid-cols-3 gap-1.5 text-center text-[11px]">
            <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-900/30">
              <Coins className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" />
              <div className="font-display font-bold text-amber-950">
                {player.currencies.coins.toLocaleString()}
              </div>
              <div className="text-[9px] text-amber-800">Coins</div>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-900/30">
              <Gem className="w-3.5 h-3.5 text-yellow-600 mx-auto mb-0.5" />
              <div className="font-display font-bold text-amber-950">{player.currencies.gold}</div>
              <div className="text-[9px] text-amber-800">Gold</div>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50 border border-sky-800/30">
              <Diamond className="w-3.5 h-3.5 text-sky-600 mx-auto mb-0.5" />
              <div className="font-display font-bold text-sky-900">{player.currencies.diamonds}</div>
              <div className="text-[9px] text-sky-800">Diamonds</div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Class + 5 Life Progress Bars */}
        <div className="space-y-3">
          {/* Active Khmer Class Card */}
          <div
            className="p-3 rounded-xl border-2 text-xs text-amber-50"
            style={{ backgroundColor: cls.badgeBg, borderColor: cls.accentColor }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-display font-bold text-sm">
                {cls.khmerName} · {cls.englishName}
              </div>
              <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-bold uppercase">
                {cls.role}
              </span>
            </div>
            <div className="text-[11px] text-amber-100/90 mt-1">
              <strong>{cls.mechanicTitle}:</strong> {cls.mechanicSummary}
            </div>
          </div>

          {/* 5 Life Progress Bars (GDD Section 3 & 5) */}
          <div className="p-3 rounded-xl bg-amber-50/90 border-2 border-amber-900/35 space-y-2">
            <div className="font-display font-bold text-xs text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>5 Village Life Stats</span>
            </div>

            {[
              {
                label: `Farm Level ${player.lifeStats.farmLevel}`,
                pct: farmPct,
                valueLabel: `${farmPct}%`,
                bonus: 'Unlocks crops & recipes',
                bar: 'from-emerald-600 to-lime-400',
              },
              {
                label: 'Stylish',
                pct: Math.min(100, Math.round((player.lifeStats.stylish / 260) * 100)),
                valueLabel: `${player.lifeStats.stylish} pts`,
                bonus: `${Math.min(20, Math.floor(player.lifeStats.stylish / 25) * 2)}% NPC discount`,
                bar: 'from-pink-600 to-fuchsia-400',
              },
              {
                label: 'Friendly',
                pct: player.lifeStats.friendly,
                valueLabel: `${player.lifeStats.friendly}/100`,
                bonus: '+5% Party Aura / friend',
                bar: 'from-sky-600 to-cyan-400',
              },
              {
                label: 'Happy',
                pct: player.lifeStats.happy,
                valueLabel: `${player.lifeStats.happy}/100`,
                bonus: `+${Math.round((player.lifeStats.happy / 100) * 15)}% Crit Chance`,
                bar: 'from-amber-500 to-yellow-300',
              },
              {
                label: 'Healthy',
                pct: player.lifeStats.healthy,
                valueLabel: `${player.lifeStats.healthy}/100`,
                bonus: `+${Math.round((player.lifeStats.healthy / 100) * 20)}% Max HP`,
                bar: 'from-rose-600 to-red-400',
              },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-bold text-amber-950">{row.label}</span>
                  <span className="text-amber-800">
                    <strong className="text-amber-950">{row.valueLabel}</strong> · {row.bonus}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-amber-950/20 border border-amber-900/35 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${row.bar} transition-all`}
                    style={{ width: `${Math.max(5, row.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Combat Stats & Quick Inventory Link */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-xs font-bold text-amber-950">
              <span className="inline-flex items-center gap-1">
                <Swords className="w-3.5 h-3.5 text-orange-700" /> ATK {player.weapon.baseDamage}
              </span>
              <span className="inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-sky-700" /> DEF {player.defense}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundManager.playSfx('harvest');
                  downloadHeroCardPng(player);
                  EventBus.emit('ui:toast', {
                    text: `🪪 Downloaded 800×450 Hero Share Card PNG for ${player.name}!`,
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-display font-black text-xs inline-flex items-center gap-1 shadow cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Hero Card
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInventory();
                }}
                className="phum-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs cursor-pointer"
              >
                Open Wardrobe / Bag →
              </button>
            </div>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
