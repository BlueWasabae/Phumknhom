import React, { useState } from 'react';
import type { CombatHitResult, DifficultyMode, EmoteSymbol, PlayerState, ZoneType } from '@shared/types';
import {
  calculateCoopBossHp,
  calculateDamageTaken,
  calculateEffectiveDR,
  calculatePlayerDamage,
} from '@shared/balanceFormulas';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import { ROW_CROP_LIST } from '../data/cropsAndArtisan';
import {
  Backpack,
  Coins,
  FastForward,
  Gamepad2,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  Smile,
  Sparkles,
  Sprout,
  Swords,
  User,
} from 'lucide-react';
import { EventBus, type ClassMeterPayload, type FarmToolMode } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';

interface HUDProps {
  player: PlayerState;
  zone: ZoneType;
  chatOpen: boolean;
  onToggleChat: () => void;
  touchUiEnabled: boolean;
  onToggleTouchUi: () => void;
  lastHit: CombatHitResult | null;
  classMeter: ClassMeterPayload;
  selectedCropId: string;
  farmToolMode: FarmToolMode;
  onSelectFarmSeed: (cropId: string, toolMode: FarmToolMode) => void;
  onOpenProfile: () => void;
  onOpenInventory: () => void;
  onOpenWardrobe: () => void;
  onOpenFarmModal: () => void;
  onFastForwardFarm: () => void;
}

const EMOTES: EmoteSymbol[] = ['👋', '😄', '❤️', '🔥'];
const DIFFICULTIES: DifficultyMode[] = ['normal', 'expert', 'calamity', 'death'];

export const HUD: React.FC<HUDProps> = ({
  player,
  zone,
  chatOpen,
  onToggleChat,
  touchUiEnabled,
  onToggleTouchUi,
  lastHit,
  classMeter,
  selectedCropId,
  farmToolMode,
  onSelectFarmSeed,
  onOpenProfile,
  onOpenInventory,
  onOpenWardrobe,
  onOpenFarmModal,
  onFastForwardFarm,
}) => {
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [unreadMail, setUnreadMail] = useState(true);
  const [previewDiff, setPreviewDiff] = useState<DifficultyMode>('normal');
  const [previewParty, setPreviewParty] = useState(2);

  const hpPct = Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100));
  const activeClassDef = KHMER_CLASSES[player.activeClass];

  const countItem = (itemId: string) =>
    player.inventory.filter((i) => i.itemId === itemId).reduce((acc, i) => acc + i.quantity, 0);

  const sampleHit = calculatePlayerDamage({
    weaponBase: player.weapon.baseDamage,
    upgradeLevel: player.weapon.upgradeLevel,
    flatBonuses: player.level * 2,
    skillPct: player.skillDamagePct,
    armorPct: player.armorDamagePct,
    snackBuffPct: player.snackBuffPct,
    enemyDefense: 8,
    armorPen: player.weapon.armorPen,
    isCritOverride: false,
    rng: () => 0.5,
  });
  const sampleCrit = calculatePlayerDamage({
    weaponBase: player.weapon.baseDamage,
    upgradeLevel: player.weapon.upgradeLevel,
    flatBonuses: player.level * 2,
    skillPct: player.skillDamagePct,
    armorPct: player.armorDamagePct,
    snackBuffPct: player.snackBuffPct,
    enemyDefense: 8,
    armorPen: player.weapon.armorPen,
    isCritOverride: true,
    rng: () => 0.5,
  });
  const sampleEffectiveDr = Math.round(calculateEffectiveDR(0.25) * 1000) / 10;
  const sampleDamageTaken = calculateDamageTaken({
    bossAttack: 24,
    currentDefense: player.defense,
    rawDR: 0.25,
    difficulty: previewDiff,
  });
  const sampleCoopBossHp = calculateCoopBossHp(4500, previewParty, previewDiff);

  const stanceLabel =
    classMeter.lbokatorStance === 3
      ? 'Hanuman Slam'
      : classMeter.lbokatorStance === 2
      ? 'Crocodile Pierce'
      : 'Lion Strike';

  const zonePill = (
    <div className="pointer-events-auto stardew-panel px-2.5 sm:px-3.5 py-1 rounded-2xl flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs max-w-full">
      <span
        className={`font-display font-bold px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap border ${
          zone === 'overworld'
            ? 'bg-emerald-700 text-amber-50 border-emerald-950'
            : zone === 'farm'
            ? 'bg-amber-700 text-amber-50 border-amber-950'
            : 'bg-purple-800 text-amber-100 border-purple-950'
        }`}
      >
        {zone === 'overworld'
          ? `Phum Village • AREA ${player.areaChannel}`
          : zone === 'farm'
          ? `My Homestead • Farm Lv.${player.lifeStats.farmLevel}`
          : 'Ancient Cavern • Dungeon'}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500 shrink-0" />
          <div className="w-16 sm:w-20 h-2.5 rounded-full bg-amber-950/30 border border-amber-950/70 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="font-bold text-amber-950 text-[11px] whitespace-nowrap">
            {player.hp}/{player.maxHp}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 font-display font-bold text-amber-900 whitespace-nowrap">
          <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {player.currencies.coins.toLocaleString()}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 w-full max-w-full box-border px-3 pt-2 flex flex-col gap-1.5">
        <div className="w-full flex items-center justify-between gap-2 min-w-0">
          {/* TOP-LEFT */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => setMenuDropdownOpen((o) => !o)}
              className="stardew-btn px-2.5 sm:px-3 py-1.5 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span>MENU</span>
            </button>

            <button
              type="button"
              onClick={onOpenInventory}
              aria-label="Inventory (I)"
              title="Inventory · Wearing & Container (I / B)"
              className="stardew-btn p-2 rounded-xl shrink-0"
            >
              <Backpack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setUnreadMail(false);
                EventBus.emit('ui:toast', {
                  text: 'Mail: Visit MY KHMER HOME • FARM (top-left) to plant crops, raise livestock & craft Artisan goods!',
                });
              }}
              aria-label="Mail Inbox"
              className="stardew-btn relative p-2 rounded-xl shrink-0"
            >
              <Mail className="w-4 h-4" />
              {unreadMail && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-amber-100">
                  !
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleChat}
              aria-label="Toggle Chat"
              className={`stardew-btn p-2 rounded-xl shrink-0 ${chatOpen ? 'ring-2 ring-amber-500' : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            {menuDropdownOpen && (
              <div className="absolute left-0 top-12 w-56 stardew-panel rounded-2xl p-1.5 z-30 flex flex-col gap-1 text-xs font-display font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center gap-2 text-amber-950"
                >
                  <User className="w-4 h-4 text-amber-800" /> Profile Card (5 Stats)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onOpenInventory();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center gap-2 text-amber-950"
                >
                  <Backpack className="w-4 h-4 text-emerald-800" /> Inventory (I / B)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onOpenFarmModal();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center gap-2 text-amber-950"
                >
                  <Sprout className="w-4 h-4 text-lime-700" /> Farm & Artisan Manager
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onOpenWardrobe();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center gap-2 text-amber-950"
                >
                  <Sparkles className="w-4 h-4 text-pink-700" /> Hair & Look Mirror
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    setBalanceModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center gap-2 text-amber-950"
                >
                  <Swords className="w-4 h-4 text-purple-800" /> Balance Math Test
                </button>
              </div>
            )}
          </div>

          {/* TOP-CENTER */}
          <div className="hidden lg:flex justify-center min-w-0 flex-1 px-2">{zonePill}</div>

          {/* TOP-RIGHT */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => setEmoteOpen((o) => !o)}
              aria-label="Emote Picker"
              className="stardew-btn p-2 rounded-xl shrink-0"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleTouchUi}
              className={`stardew-btn px-2.5 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1 shrink-0 ${
                touchUiEnabled ? 'ring-2 ring-emerald-600' : ''
              }`}
              title="Preview Mobile Touch Controls on Desktop"
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Touch UI</span>
            </button>

            {emoteOpen && (
              <div className="absolute right-0 top-12 stardew-panel p-1.5 rounded-2xl flex gap-1.5 z-30">
                {EMOTES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      EventBus.emit('player:emote', { emoji });
                      setEmoteOpen(false);
                    }}
                    className="w-9 h-9 rounded-xl bg-amber-100 hover:bg-amber-300/70 border border-amber-900/40 flex items-center justify-center text-lg transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex lg:hidden justify-center w-full">{zonePill}</div>

        {/* FARM QUICK SEED, FERTILIZER & FAST-FORWARD BAR */}
        {zone === 'farm' && (
          <div className="flex justify-center w-full">
            <div className="pointer-events-auto stardew-panel px-2.5 py-1.5 rounded-2xl flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-display font-bold max-w-full">
              {ROW_CROP_LIST.map((crop) => {
                const qty = countItem(crop.seedItemId);
                const active = farmToolMode === 'smart' && selectedCropId === crop.id;
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => onSelectFarmSeed(crop.id, 'smart')}
                    className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 transition ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crop.stageColors[3] }} />
                    <span>{crop.name.split(' ')[0]}</span>
                    <span className="opacity-80">×{qty}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  onSelectFarmSeed(selectedCropId, farmToolMode === 'fertilize' ? 'smart' : 'fertilize')
                }
                className={`px-2 py-0.5 rounded-lg border transition ${
                  farmToolMode === 'fertilize'
                    ? 'bg-amber-500 text-amber-950 border-amber-950 ring-2 ring-yellow-300'
                    : 'bg-amber-50 text-amber-950 border-amber-900/35'
                }`}
              >
                ★ Fert ×{countItem('fertilizer')}
              </button>

              <button
                type="button"
                onClick={onOpenFarmModal}
                className="px-2.5 py-0.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-50 border border-amber-950 flex items-center gap-1"
              >
                <Sprout className="w-3 h-3" /> Stall / Artisan
              </button>

              <button
                type="button"
                onClick={onFastForwardFarm}
                className="px-2 py-0.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white border border-sky-950 flex items-center gap-1"
                title="Dev Boost: Fast-forward all farm & artisan timers by 60s"
              >
                <FastForward className="w-3 h-3" /> +60s
              </button>
            </div>
          </div>
        )}

        {/* DUNGEON CLASS & SPECIAL MECHANIC METER */}
        {zone === 'dungeon' && (
          <div className="flex justify-center w-full">
            <div className="pointer-events-auto stardew-panel px-3 py-1 rounded-full flex items-center gap-2.5 text-[11px] font-display font-bold">
              <span
                className="px-2 py-0.5 rounded-full text-amber-50"
                style={{ backgroundColor: activeClassDef.badgeBg }}
              >
                {activeClassDef.khmerName} · {player.weapon.name}
              </span>

              {player.activeClass === 'shadow' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-900">Stealth</span>
                  <div className="w-24 h-2.5 rounded-full bg-purple-950/25 border border-purple-900 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        classMeter.stealthPct >= 100
                          ? 'bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-600 animate-pulse'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${classMeter.stealthPct}%` }}
                    />
                  </div>
                  <span className={classMeter.stealthPct >= 100 ? 'text-purple-700 animate-pulse' : 'text-amber-900'}>
                    {classMeter.stealthPct >= 100 ? 'STRIKE READY!' : `${classMeter.stealthPct}%`}
                  </span>
                </div>
              )}

              {player.activeClass === 'mystic' && (
                <span className="text-amber-800">
                  Yant Sigils: {'✦'.repeat(classMeter.yantStacks)}
                  {'✧'.repeat(Math.max(0, 3 - classMeter.yantStacks))} ({classMeter.yantStacks}/3)
                </span>
              )}

              {player.activeClass === 'lbokator' && (
                <span className="text-orange-800">Next Stance: {stanceLabel}</span>
              )}

              {player.activeClass === 'tamer' && (
                <span className="text-emerald-800">Spirit Pact Active</span>
              )}

              {player.activeClass === 'archer' && (
                <span className="text-emerald-800">Elemental Quiver · Shift = Backflip Shot</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Balance Formula Tester Modal */}
      <NativeDialog
        open={balanceModalOpen}
        onClose={() => setBalanceModalOpen(false)}
        title="@shared/balanceFormulas Live Test"
        subtitle="Exact formulas from docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md"
        maxWidthClass="w-[min(92vw,470px)]"
      >
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPreviewDiff(d)}
                className={`px-2 py-0.5 rounded-lg uppercase text-[10px] font-bold border ${
                  previewDiff === d
                    ? 'bg-amber-800 text-amber-50 border-amber-950'
                    : 'bg-amber-50 text-amber-900 border-amber-900/30'
                }`}
              >
                {d}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-amber-900">Party:</span>
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreviewParty(p)}
                className={`w-6 h-6 rounded-lg font-bold text-[11px] border ${
                  previewParty === p
                    ? 'bg-purple-700 text-white border-purple-950'
                    : 'bg-amber-50 text-amber-900 border-amber-900/30'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-900/25">
              <div className="text-amber-800/80">Expected Swing / Crit</div>
              <div className="font-bold text-amber-950">
                {sampleHit.finalDamage} dmg / <span className="text-orange-700">{sampleCrit.finalDamage} CRIT</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-900/25">
              <div className="text-amber-800/80">Effective DR (25% Raw)</div>
              <div className="font-bold text-emerald-800">{sampleEffectiveDr}% Diminishing</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-900/25">
              <div className="text-amber-800/80">Boss Hit Taken (24 ATK)</div>
              <div className="font-bold text-rose-700">
                -{sampleDamageTaken} HP ({previewDiff})
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-900/25">
              <div className="text-amber-800/80">Co-op Boss HP (4,500 base)</div>
              <div className="font-bold text-purple-800">{sampleCoopBossHp.toLocaleString()} HP</div>
            </div>
          </div>

          {lastHit && (
            <div className="text-[11px] text-amber-950 pt-1.5 border-t border-amber-900/20">
              Last Hit: <strong>{lastHit.finalDamage}</strong>
              {lastHit.isCrit ? ' (CRIT 1.75×)' : ''} · raw {lastHit.rawDamage} · variance ×{lastHit.varianceMultiplier}
            </div>
          )}
        </div>
      </NativeDialog>
    </>
  );
};
