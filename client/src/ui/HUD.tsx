import React, { useEffect, useState } from 'react';
import type { CombatHitResult, DifficultyMode, EmoteSymbol, PlayerState, ZoneType } from '@shared/types';
import {
  calculateCoopBossHp,
  calculateDamageTaken,
  calculateEffectiveDR,
  calculatePlayerDamage,
} from '@shared/balanceFormulas';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import {
  ALL_SKILL_IDS,
  SKILL_DEFINITIONS,
  computeVillageToDungeonBridge,
  getAvailableTalentPoints,
} from '@shared/skillTrees';
import { ROW_CROP_LIST } from '../data/cropsAndArtisan';
import { STREET_SNACKS, countInventoryAnyQuality } from '../data/recipes';
import {
  Award,
  Backpack,
  Cloud,
  Coins,
  FastForward,
  Gamepad2,
  Heart,
  LogIn,
  Mail,
  Menu,
  MessageCircle,
  Smile,
  Sparkles,
  Sprout,
  Store,
  Swords,
  User,
  Users,
} from 'lucide-react';
import {
  EventBus,
  type BossHudPayload,
  type ClassMeterPayload,
  type FarmToolMode,
  type NetworkStatusPayload,
} from '../game/EventBus';
import { NativeDialog } from './NativeDialog';

interface HUDProps {
  player: PlayerState;
  zone: ZoneType;
  networkStatus: NetworkStatusPayload;
  authUsername: string | null;
  saveStatus: 'guest' | 'saving' | 'saved';
  inboxCount: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  touchUiEnabled: boolean;
  onToggleTouchUi: () => void;
  lastHit: CombatHitResult | null;
  classMeter: ClassMeterPayload;
  bossHud: BossHudPayload | null;
  selectedCropId: string;
  farmToolMode: FarmToolMode;
  onSelectFarmSeed: (cropId: string, toolMode: FarmToolMode) => void;
  onEatQuickSlot: (slotIndex: 0 | 1 | 2) => void;
  onOpenProfile: () => void;
  onOpenInventory: () => void;
  onOpenWardrobe: () => void;
  onOpenFarmModal: () => void;
  onOpenSkills: () => void;
  onOpenAreaSwitcher: () => void;
  onOpenFriends: () => void;
  onOpenInbox: () => void;
  onOpenAuth: () => void;
  onOpenMarket: () => void;
  onFastForwardFarm: () => void;
}

const EMOTES: EmoteSymbol[] = ['👋', '😄', '❤️', '🔥'];
const DIFFICULTIES: DifficultyMode[] = ['normal', 'expert', 'calamity', 'death'];

export const HUD: React.FC<HUDProps> = ({
  player,
  zone,
  networkStatus,
  authUsername,
  saveStatus,
  inboxCount,
  chatOpen,
  onToggleChat,
  touchUiEnabled,
  onToggleTouchUi,
  lastHit,
  classMeter,
  bossHud,
  selectedCropId,
  farmToolMode,
  onSelectFarmSeed,
  onEatQuickSlot,
  onOpenProfile,
  onOpenInventory,
  onOpenWardrobe,
  onOpenFarmModal,
  onOpenSkills,
  onOpenAreaSwitcher,
  onOpenFriends,
  onOpenInbox,
  onOpenAuth,
  onOpenMarket,
  onFastForwardFarm,
}) => {
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [previewDiff, setPreviewDiff] = useState<DifficultyMode>('normal');
  const [previewParty, setPreviewParty] = useState(2);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const bridge = computeVillageToDungeonBridge(player, now);
  const activeBuffs = player.activeBuffs.filter((b) => b.expiresAt > now);
  const unspentSkillPoints = ALL_SKILL_IDS.reduce(
    (sum, id) => sum + getAvailableTalentPoints(player.skills.skills[id]),
    0
  );
  const effectiveMaxHp = bridge.effectiveMaxHp;
  const hpPct = Math.max(0, Math.min(100, (player.hp / Math.max(1, effectiveMaxHp)) * 100));
  const activeClassDef = KHMER_CLASSES[player.activeClass];

  const countItem = (itemId: string) =>
    player.inventory.filter((i) => i.itemId === itemId).reduce((acc, i) => acc + i.quantity, 0);

  const formatCountdown = (ms: number) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const sampleHit = calculatePlayerDamage({
    weaponBase: player.weapon.baseDamage,
    upgradeLevel: player.weapon.upgradeLevel,
    flatBonuses: bridge.flatDamageBonus,
    skillPct: bridge.classSkillDamagePct,
    armorPct: player.armorDamagePct,
    snackBuffPct: bridge.snackAttackPct,
    enemyDefense: 8,
    armorPen: player.weapon.armorPen,
    critChance: bridge.effectiveCritChance,
    critMultiplier: bridge.critMultiplier,
    isCritOverride: false,
    rng: () => 0.5,
  });
  const sampleCrit = calculatePlayerDamage({
    weaponBase: player.weapon.baseDamage,
    upgradeLevel: player.weapon.upgradeLevel,
    flatBonuses: bridge.flatDamageBonus,
    skillPct: bridge.classSkillDamagePct,
    armorPct: player.armorDamagePct,
    snackBuffPct: bridge.snackAttackPct,
    enemyDefense: 8,
    armorPen: player.weapon.armorPen,
    critChance: bridge.effectiveCritChance,
    critMultiplier: bridge.critMultiplier,
    isCritOverride: true,
    rng: () => 0.5,
  });
  const sampleEffectiveDr = Math.round(calculateEffectiveDR(0.25 + bridge.rawDRBonus) * 1000) / 10;
  const sampleDamageTaken = calculateDamageTaken({
    bossAttack: 24,
    currentDefense: player.defense,
    rawDR: 0.25 + bridge.rawDRBonus,
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
    <div className="pointer-events-auto stardew-panel px-2.5 sm:px-3.5 py-1 rounded-2xl flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs max-w-full">
      {zone === 'overworld' ? (
        <button
          type="button"
          onClick={onOpenAreaSwitcher}
          title="Click to switch Multiplayer Plaza Area (AREA 0 / AREA 1 / AREA 2)"
          className="font-display font-bold px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap border bg-emerald-700 hover:bg-emerald-600 text-amber-50 border-emerald-950 transition cursor-pointer"
        >
          Phum Village • {networkStatus.areaId} ▾
        </button>
      ) : (
        <span
          className={`font-display font-bold px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap border ${
            zone === 'farm'
              ? 'bg-amber-700 text-amber-50 border-amber-950'
              : 'bg-purple-800 text-amber-100 border-purple-950'
          }`}
        >
          {zone === 'farm'
            ? `My Homestead • Farm Lv.${player.lifeStats.farmLevel}`
            : 'Ancient Cavern • Dungeon'}
        </span>
      )}

      {/* Tiny Green/Gray Connection Status Dot */}
      <button
        type="button"
        onClick={onOpenAreaSwitcher}
        title={
          networkStatus.online
            ? `Connected to ${networkStatus.areaId} (${networkStatus.playerCount} online)`
            : 'Colyseus server unreachable — playing in Offline Mode'
        }
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-950/10 hover:bg-amber-950/20 text-[10px] font-display font-bold text-amber-950 whitespace-nowrap transition"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            networkStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
          }`}
        />
        <span>
          {networkStatus.online
            ? `Online • ${networkStatus.playerCount} ${networkStatus.playerCount === 1 ? 'player' : 'players'}`
            : 'Offline Mode'}
        </span>
      </button>

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
            {Math.min(player.hp, effectiveMaxHp)}/{effectiveMaxHp}
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
              onClick={onOpenInbox}
              aria-label="Mail Inbox"
              title="Mail Inbox · Friend Requests & Dungeon Invites"
              className="stardew-btn relative p-2 rounded-xl shrink-0"
            >
              <Mail className="w-4 h-4" />
              {inboxCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-amber-100 animate-bounce">
                  {inboxCount > 9 ? '!' : inboxCount}
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
                    onOpenSkills();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center justify-between gap-2 text-amber-950"
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-orange-700" /> Skills (K)
                  </span>
                  {unspentSkillPoints > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-700 text-white text-[9px] font-bold">
                      {unspentSkillPoints} PT
                    </span>
                  )}
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
                    onOpenMarket();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center gap-2 text-amber-950"
                >
                  <Store className="w-4 h-4 text-amber-700" /> Village Market (5% Tax)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onOpenFriends();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center justify-between gap-2 text-amber-950"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-700" /> Friends & Inbox
                  </span>
                  {inboxCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold">
                      {inboxCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onOpenAuth();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-amber-200/80 text-left flex items-center justify-between gap-2 text-amber-950"
                >
                  <span className="flex items-center gap-2">
                    {authUsername ? (
                      <Cloud className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <LogIn className="w-4 h-4 text-amber-800" />
                    )}
                    {authUsername ? `Account (${authUsername})` : 'Login / Cloud Save'}
                  </span>
                  {authUsername && (
                    <span className="text-[9px] font-bold text-emerald-800">
                      {saveStatus === 'saving' ? 'Saving...' : '☁ Saved'}
                    </span>
                  )}
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

        {/* DUNGEON BOSS HEALTH BAR, CLASS METER & CALAMITY FOCUS/FURY GAUGES */}
        {zone === 'dungeon' && (
          <div className="flex flex-col items-center gap-1.5 w-full">
            {/* Sleek Top-Center Boss Health Bar */}
            {bossHud && bossHud.active && (
              <div className="pointer-events-auto w-[min(94vw,520px)] bg-slate-950/90 border-2 border-amber-500/80 rounded-2xl px-3 py-1.5 shadow-xl">
                <div className="flex items-center justify-between gap-2 text-[11px] font-display font-bold mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-amber-300 truncate">
                      {bossHud.khmerName} · {bossHud.englishName}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] uppercase shrink-0 ${
                        bossHud.phase === 2
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-amber-700 text-amber-100'
                      }`}
                    >
                      {bossHud.phase === 2 ? 'P2 ENRAGED' : 'P1'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-800 text-purple-100 text-[9px] uppercase shrink-0">
                      {bossHud.difficulty}
                    </span>
                    {(bossHud.partySize ?? 1) > 1 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-700 text-white text-[9px] uppercase shrink-0">
                        CO-OP {bossHud.partySize}/4
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-amber-100">
                    {bossHud.bossId === 'sdech_kongkaeb' && bossHud.damageTakenThisFight === 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-yellow-400 text-amber-950 text-[9px] font-bold">
                        ★ NO-HIT
                      </span>
                    )}
                    <span className="font-mono text-[10px]">
                      {bossHud.hp.toLocaleString()} / {bossHud.maxHp.toLocaleString()} (
                      {Math.ceil((bossHud.hp / Math.max(1, bossHud.maxHp)) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 border border-amber-500/40 overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-150 ${
                      bossHud.phase === 2
                        ? 'bg-gradient-to-r from-red-700 via-orange-500 to-yellow-400'
                        : 'bg-gradient-to-r from-rose-700 via-red-500 to-amber-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (bossHud.hp / Math.max(1, bossHud.maxHp)) * 100))}%`,
                    }}
                  />
                  {/* 50% Phase 2 Threshold Marker */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-200/70" />
                </div>
              </div>
            )}

            {/* Class Meter + Calamity Focus / Fury Gauges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
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
                    <div className="w-20 h-2.5 rounded-full bg-purple-950/25 border border-purple-900 overflow-hidden">
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
                      {classMeter.stealthPct >= 100 ? 'READY!' : `${classMeter.stealthPct}%`}
                    </span>
                  </div>
                )}

                {player.activeClass === 'mystic' && (
                  <span className="text-amber-800">
                    Yant: {'✦'.repeat(classMeter.yantStacks)}
                    {'✧'.repeat(Math.max(0, 3 - classMeter.yantStacks))}
                  </span>
                )}

                {player.activeClass === 'lbokator' && (
                  <span className="text-orange-800">Stance: {stanceLabel}</span>
                )}

                {player.activeClass === 'tamer' && (
                  <span className="text-emerald-800">Spirit Pact</span>
                )}

                {player.activeClass === 'archer' && (
                  <span className="text-emerald-800">Quiver · Shift = Backflip</span>
                )}
              </div>

              {/* Calamity Focus (Adrenaline) & Fury (Rage) Gauges */}
              {bossHud && bossHud.difficulty === 'calamity' && (
                <div className="pointer-events-auto bg-slate-950/90 border-2 border-purple-500/80 rounded-full px-2.5 py-1 flex items-center gap-2 text-[10px] font-display font-bold text-white shadow">
                  <button
                    type="button"
                    disabled={!bossHud.focusActive && bossHud.focusPct < 100}
                    onClick={() => EventBus.emit('input:focus')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition ${
                      bossHud.focusActive
                        ? 'bg-cyan-400 text-slate-950 border-white animate-pulse'
                        : bossHud.focusPct >= 100
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-200 animate-pulse cursor-pointer'
                        : 'bg-slate-800 text-cyan-200 border-cyan-700/50'
                    }`}
                    title="Focus (Adrenaline) [F]: +120% Damage for 5s! Resets on taking a hit."
                  >
                    <span>FOCUS [F]</span>
                    <span className="font-mono">{bossHud.focusActive ? 'ACTIVE!' : `${bossHud.focusPct}%`}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!bossHud.furyActive && bossHud.furyPct < 100}
                    onClick={() => EventBus.emit('input:fury')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition ${
                      bossHud.furyActive
                        ? 'bg-red-500 text-white border-yellow-300 animate-pulse'
                        : bossHud.furyPct >= 100
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-200 animate-pulse cursor-pointer'
                        : 'bg-slate-800 text-rose-200 border-rose-700/50'
                    }`}
                    title="Fury (Rage) [R]: +40% Attack Speed & +25% Crit for 7s!"
                  >
                    <span>FURY [R]</span>
                    <span className="font-mono">{bossHud.furyActive ? 'ACTIVE!' : `${bossHud.furyPct}%`}</span>
                  </button>

                  {bossHud.defenseCracked && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[9px] animate-pulse">
                      DEF CRACKED
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3-SLOT QUICK-SNACK BAR & LIVE TIMED BUFF TIMERS */}
      <div
        className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 max-w-[96vw] ${
          touchUiEnabled ? 'bottom-36 sm:bottom-5' : 'bottom-3'
        }`}
      >
        {/* Active Timed Buff Pills with Live Countdown */}
        {activeBuffs.length > 0 && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1">
            {activeBuffs.map((buff) => {
              const tags: string[] = [];
              if (buff.moveSpeedPct) tags.push(`+${Math.round(buff.moveSpeedPct * 100)}% SPD`);
              if (buff.attackPct) tags.push(`+${Math.round(buff.attackPct * 100)}% ATK`);
              if (buff.maxHpPct) tags.push(`+${Math.round(buff.maxHpPct * 100)}% HP`);
              if (buff.critChanceBonus) tags.push(`+${Math.round(buff.critChanceBonus * 100)}% CRIT`);
              if (buff.mpRegenPct) tags.push(`+${Math.round(buff.mpRegenPct * 100)}% MP`);
              if (buff.poisonImmune) tags.push('No Poison');
              return (
                <div
                  key={buff.id}
                  className="stardew-panel px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-display font-bold text-amber-950 shadow"
                >
                  <span>{buff.icon}</span>
                  <span className="text-purple-900">{tags.join(' ')}</span>
                  <span className="px-1 rounded bg-amber-900/15 text-amber-950 font-mono text-[9px]">
                    {formatCountdown(buff.expiresAt - now)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 3-Slot Quick-Snack Bar ([1], [2], [3] on PC or Tap on Mobile) */}
        <div className="pointer-events-auto stardew-panel px-2 py-1 rounded-2xl flex items-center gap-1.5 shadow-lg">
          {([0, 1, 2] as const).map((slotIdx) => {
            const snackId = player.quickSnackSlots[slotIdx];
            const snack = snackId ? STREET_SNACKS[snackId] : null;
            const qty = snackId ? countInventoryAnyQuality(player.inventory, snackId) : 0;
            return (
              <button
                key={slotIdx}
                type="button"
                onClick={() => onEatQuickSlot(slotIdx)}
                title={
                  snack
                    ? `[${slotIdx + 1}] ${snack.name} — ${snack.villageSummary} | ${snack.dungeonSummary}`
                    : `Quick-Snack Slot [${slotIdx + 1}] (Assign at Num Pang Cart)`
                }
                className={`relative px-2 py-1 rounded-xl border-2 flex items-center gap-1.5 text-left transition active:scale-95 ${
                  snack && qty > 0
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-900/50 text-amber-950'
                    : 'bg-amber-950/10 border-amber-900/25 text-amber-900/55'
                }`}
              >
                <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-md bg-amber-900 text-amber-50 font-mono text-[9px] font-bold flex items-center justify-center border border-amber-200">
                  {slotIdx + 1}
                </span>
                <span className="text-base leading-none">{snack ? snack.icon : '🍽️'}</span>
                <div className="leading-tight hidden sm:block">
                  <div className="font-display font-bold text-[10px] max-w-[74px] truncate">
                    {snack ? snack.name.split(' ')[0] : 'Empty'}
                  </div>
                  <div className="text-[9px] font-bold opacity-80">×{qty}</div>
                </div>
                <span className="sm:hidden font-display font-bold text-[10px]">×{qty}</span>
              </button>
            );
          })}
        </div>
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

          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-700/30 text-[10px] text-emerald-950 space-y-0.5">
            <div className="font-display font-bold uppercase text-emerald-900">
              Live Village → Dungeon Stat Bridge
            </div>
            <div>
              Healthy ({player.lifeStats.healthy}) → <strong>+{Math.round(bridge.healthyHpBonusPct * 100)}% Max HP</strong> (Effective {effectiveMaxHp} HP) · Happy ({player.lifeStats.happy}) → <strong>+{Math.round(bridge.happyCritBonus * 100)}% Crit</strong>
            </div>
            <div>
              {SKILL_DEFINITIONS[bridge.activeClassSkillId].name} Lv.{bridge.activeClassSkillLevel} →{' '}
              <strong>+{Math.round(bridge.classSkillDamagePct * 1000) / 10}% Dmg</strong> · Snack ATK:{' '}
              <strong>+{Math.round(bridge.snackAttackPct * 100)}%</strong> · Speed:{' '}
              <strong>+{Math.round(bridge.moveSpeedBonusPct * 100)}%</strong> · Crit:{' '}
              <strong>{Math.round(bridge.effectiveCritChance * 100)}%</strong> ({bridge.critMultiplier}×)
            </div>
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
