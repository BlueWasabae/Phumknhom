import React, { useEffect, useState } from 'react';
import type { BossId, DifficultyMode, PlayerState } from '@shared/types';
import { calculateDamageTaken } from '@shared/balanceFormulas';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { KHMER_BOSSES, KHMER_BOSS_LIST, getScaledBossMaxHp } from '@shared/khmerBosses';
import { Crown, Flame, ShieldAlert, Skull, Sparkles, Swords, Timer, Trophy, User, Users, Zap } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ModeSelectorModalProps {
  open: boolean;
  player: PlayerState;
  initialBossId?: BossId;
  onClose: () => void;
  onEnterDungeon: (
    bossId: BossId,
    difficulty: DifficultyMode,
    partyMode: 'solo' | 'coop',
    partyId?: string
  ) => void;
  onEnterBossRush?: (difficulty: DifficultyMode, rushMode?: 'classic' | 'grand_16') => void;
}

const DIFFICULTY_OPTIONS: Array<{
  id: DifficultyMode;
  label: string;
  mult: string;
  badge: string;
  color: string;
  desc: string;
}> = [
  {
    id: 'normal',
    label: 'Normal',
    mult: '1.0× HP',
    badge: 'Cozy Standard',
    color: 'border-emerald-700 bg-emerald-50 text-emerald-950',
    desc: 'Standard boss HP & attack cadence. Great for learning telegraphs and earning starter drops.',
  },
  {
    id: 'expert',
    label: 'Expert',
    mult: '1.5× HP',
    badge: 'Boss Treasure Bag',
    color: 'border-amber-600 bg-amber-50 text-amber-950',
    desc: 'Faster boss telegraphs & hits. Drops an instanced Boss Treasure Bag with boosted rare drop rates + bonus Gold.',
  },
  {
    id: 'mythic',
    label: 'Mythic',
    mult: '1.9× HP',
    badge: 'Focus + Fury + Def Crack',
    color: 'border-purple-700 bg-purple-50 text-purple-950',
    desc: 'Activates Focus [F] (+120% Dmg) & Fury [R] (+40% Atk Spd, +25% Crit) gauges, Defense Damage, and maximum loot rewards!',
  },
];

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  open,
  player,
  initialBossId,
  onClose,
  onEnterDungeon,
  onEnterBossRush,
}) => {
  const [modalTab, setModalTab] = useState<'single' | 'boss_rush'>('single');
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3 | 4>(1);
  const [expandedDropsBossId, setExpandedDropsBossId] = useState<BossId | null>(null);
  const [selectedBoss, setSelectedBoss] = useState<BossId>(initialBossId ?? 'sdech_kongkaeb');
  const [selectedDiff, setSelectedDiff] = useState<DifficultyMode>('normal');
  const [rushDiff, setRushDiff] = useState<DifficultyMode>('mythic');
  const [rushMode, setRushMode] = useState<'classic' | 'grand_16'>('grand_16');
  const [partyMode, setPartyMode] = useState<'solo' | 'coop'>('solo');

  useEffect(() => {
    if (open && initialBossId) {
      setSelectedBoss(initialBossId);
      setSelectedTier(KHMER_BOSSES[initialBossId]?.tier ?? 1);
      setModalTab('single');
    }
  }, [initialBossId, open]);

  const TIER_META: Array<{ tier: 1 | 2 | 3 | 4; label: string; subtitle: string; badge: string }> = [
    { tier: 1, label: 'Tier 1', subtitle: 'Village & Frontier', badge: 'Lv.1–7' },
    { tier: 2, label: 'Tier 2', subtitle: 'Mythic Guardians', badge: 'Lv.8–20' },
    { tier: 3, label: 'Tier 3', subtitle: 'Angkor Sovereigns', badge: 'Lv.24–38' },
    { tier: 4, label: 'Tier 4', subtitle: 'Calamity (Rahu)', badge: 'Lv.45+' },
  ];
  const bossesInTier = KHMER_BOSS_LIST.filter((b) => b.tier === selectedTier);

  const formatBestRush = (ms?: number | null) => {
    if (!ms || ms <= 0) return 'Not cleared yet';
    const sec = ms / 1000;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const d = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
  };

  const bossDef = KHMER_BOSSES[selectedBoss];
  const scaledHp = getScaledBossMaxHp(selectedBoss, selectedDiff, partyMode === 'coop' ? 2 : 1);
  const bridge = computeVillageToDungeonBridge(player);
  const expectedHitTaken = calculateDamageTaken({
    bossAttack: bossDef.baseAttack,
    currentDefense: player.defense,
    rawDR: bridge.rawDRBonus,
    difficulty: selectedDiff,
  });

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Angkorian Dungeon Portal · Choose Trial"
      subtitle={`Effective HP: ${bridge.effectiveMaxHp} · Crit: ${Math.round(bridge.effectiveCritChance * 100)}% · Snack ATK: +${Math.round(bridge.snackAttackPct * 100)}%`}
      maxWidthClass="w-[min(96vw,760px)]"
    >
      <div className="space-y-3.5 max-h-[68dvh] overflow-y-auto pr-1">
        {/* TOP MODE TABS: Single Boss Raid vs Mythic Boss Rush Gauntlet */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setModalTab('single')}
            className={`py-2 px-3 rounded-xl border-2 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              modalTab === 'single'
                ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <Skull className="w-4 h-4" /> 4-Tier Pantheon ({KHMER_BOSS_LIST.length} Bosses)
          </button>
          <button
            type="button"
            onClick={() => setModalTab('boss_rush')}
            className={`py-2 px-3 rounded-xl border-2 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              modalTab === 'boss_rush'
                ? 'bg-gradient-to-r from-rose-700 via-purple-800 to-amber-700 text-amber-50 border-amber-400 shadow'
                : 'bg-purple-50 text-purple-950 border-purple-700/40 hover:bg-purple-100'
            }`}
          >
            <Zap className="w-4 h-4 text-yellow-400" /> ⚡ Boss Rush &amp; Grand 16-Rush
          </button>
        </div>

        {modalTab === 'boss_rush' ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950 via-purple-950 to-amber-950 text-amber-50 border-2 border-amber-400/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-base text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />{' '}
                    {rushMode === 'grand_16'
                      ? 'Grand 16-Boss Pantheon Rush'
                      : 'Classic 6-Boss Speedrun Gauntlet'}
                  </div>
                  <p className="text-[11px] text-amber-100/90 mt-0.5">
                    {rushMode === 'grand_16'
                      ? 'Conquer all 16 Khmer Mythic Bosses back-to-back culminating in Calamity Superboss Rahu!'
                      : 'Battle the classic 6 Khmer Bosses back-to-back with a live Speedrun Timer & 5s breather heals!'}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-amber-400/50 text-right">
                  <div className="text-[9px] uppercase text-amber-300 font-bold flex items-center gap-1 justify-end">
                    <Timer className="w-3 h-3" /> Personal Best
                  </div>
                  <div className="font-mono font-bold text-sm text-yellow-300">
                    {formatBestRush(player.bestBossRushTimeMs)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRushMode('classic')}
                  className={`p-2 rounded-xl border-2 text-left text-xs font-display font-bold transition cursor-pointer ${
                    rushMode === 'classic'
                      ? 'bg-amber-500/25 border-yellow-300 text-yellow-200'
                      : 'bg-white/5 border-white/15 text-amber-100/75 hover:bg-white/10'
                  }`}
                >
                  ⚔️ Classic Boss Rush (6 Bosses)
                </button>
                <button
                  type="button"
                  onClick={() => setRushMode('grand_16')}
                  className={`p-2 rounded-xl border-2 text-left text-xs font-display font-bold transition cursor-pointer ${
                    rushMode === 'grand_16'
                      ? 'bg-fuchsia-600/35 border-yellow-300 text-yellow-200 shadow-[0_0_16px_rgba(250,204,21,0.3)]'
                      : 'bg-white/5 border-white/15 text-amber-100/75 hover:bg-white/10'
                  }`}
                >
                  🌑 Grand 16-Boss Pantheon Rush (+8,000 C!)
                </button>
              </div>

              <div className="grid sm:grid-cols-4 gap-1.5 text-[10px] font-bold max-h-36 overflow-y-auto pr-1">
                {KHMER_BOSS_LIST.map((b, idx) => (
                  <div
                    key={b.id}
                    className="px-2 py-1 rounded-xl bg-white/10 border border-amber-300/30 flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 text-[9px]">
                      {idx + 1}
                    </span>
                    <span className="truncate">{b.khmerName}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-900/30 space-y-2">
              <div className="font-display font-bold text-xs text-amber-950">
                🏆 Boss Rush Clear Jackpot &amp; Speedrun Leaderboard
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                <span className="px-2 py-1 rounded-lg bg-amber-200 text-amber-950">
                  🪙 +{rushMode === 'grand_16' ? '8,000' : '3,000'} Coins &amp; +{rushMode === 'grand_16' ? '35' : '15'} Gold
                </span>
                <span className="px-2 py-1 rounded-lg bg-purple-200 text-purple-950">👑 Title: Sovereign of Angkor</span>
                <span className="px-2 py-1 rounded-lg bg-rose-200 text-rose-950">🪽 Radiant Angkor Sovereign Wings</span>
                <span className="px-2 py-1 rounded-lg bg-sky-200 text-sky-950">⏱️ Boss Rush Speedrun Hall of Fame</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-900/15">
                <div className="flex items-center gap-1.5">
                  {(['normal', 'expert', 'mythic'] as DifficultyMode[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRushDiff(d)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase border cursor-pointer ${
                        rushDiff === d
                          ? 'bg-purple-800 text-amber-100 border-amber-400'
                          : 'bg-white text-amber-950 border-amber-900/25'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEnterBossRush?.(rushDiff, rushMode);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-700 to-amber-600 hover:brightness-110 text-white border-2 border-amber-300 font-display font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-yellow-300" />{' '}
                  {rushMode === 'grand_16' ? 'LAUNCH GRAND 16-BOSS RUSH' : 'LAUNCH CLASSIC BOSS RUSH'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* 1. 4-TIER BOSS PROGRESSION LADDER */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display font-bold text-xs uppercase text-amber-900 flex items-center gap-1.5">
              <Skull className="w-4 h-4 text-rose-700" /> 1. 4-Tier Khmer Boss Progression Ladder
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              Defeated: {player.clearedBosses.length}/{KHMER_BOSS_LIST.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {TIER_META.map((tm) => {
              const tierBosses = KHMER_BOSS_LIST.filter((b) => b.tier === tm.tier);
              const clearedInTier = tierBosses.filter((b) => player.clearedBosses.includes(b.id)).length;
              const isSelected = selectedTier === tm.tier;
              return (
                <button
                  key={tm.tier}
                  type="button"
                  onClick={() => {
                    setSelectedTier(tm.tier);
                    if (tierBosses[0]) setSelectedBoss(tierBosses[0].id);
                  }}
                  className={`px-2.5 py-2 rounded-xl border-2 text-left transition cursor-pointer ${
                    isSelected
                      ? tm.tier === 4
                        ? 'bg-gradient-to-br from-purple-950 to-slate-950 text-yellow-200 border-yellow-400 shadow'
                        : 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                      : 'bg-amber-50 text-amber-950 border-amber-900/25 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-display font-bold">
                    <span>{tm.label}</span>
                    <span className="text-[9px] opacity-85">{tm.badge}</span>
                  </div>
                  <div className="text-[10px] font-bold opacity-90 truncate">{tm.subtitle}</div>
                  <div className="text-[9px] opacity-75">
                    {clearedInTier}/{tierBosses.length} Cleared
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {bossesInTier.map((b) => {
              const active = selectedBoss === b.id;
              const cleared = player.clearedBosses.includes(b.id);
              const previewHp = getScaledBossMaxHp(b.id, selectedDiff, 1);
              const dropsExpanded = expandedDropsBossId === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBoss(b.id)}
                  className={`text-left p-3 rounded-xl border-2 transition flex flex-col gap-1.5 cursor-pointer ${
                    active
                      ? b.isCalamity
                        ? 'bg-purple-950/95 text-amber-50 border-yellow-400 ring-2 ring-purple-500 shadow-lg'
                        : 'bg-amber-100 border-amber-900 ring-2 ring-amber-500 shadow-md'
                      : b.isCalamity
                        ? 'bg-slate-950/90 text-amber-100 border-purple-500/60 hover:border-yellow-400'
                        : 'bg-amber-50/90 border-amber-900/30 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`font-display font-bold text-sm flex items-center gap-1.5 ${b.isCalamity ? 'text-yellow-300' : 'text-amber-950'}`}>
                        <span>{b.trophyIcon}</span>
                        <span>{b.khmerName}</span>
                        {cleared && <span className="text-emerald-500" title="Defeated">✓</span>}
                      </div>
                      <div className={`text-[11px] font-bold ${b.isCalamity ? 'text-purple-200' : 'text-amber-800'}`}>
                        {b.englishName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 font-display font-bold text-[10px] shrink-0">
                      #{b.rosterNumber} · Lv.{b.recommendedLevel}+
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-400/40">
                      HP: {previewHp.toLocaleString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-400/40">
                      ATK: {b.baseAttack}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-400/40">
                      {b.biomeName}
                    </span>
                    {cleared && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white inline-flex items-center gap-0.5">
                        <Trophy className="w-2.5 h-2.5" /> Cleared ✓
                      </span>
                    )}
                  </div>

                  <div className={`text-[10px] leading-snug space-y-0.5 pt-0.5 border-t ${b.isCalamity ? 'border-purple-700/50 text-purple-100' : 'border-amber-900/15 text-amber-950/90'}`}>
                    <div><strong>P1:</strong> {b.phase1Summary}</div>
                    <div><strong>P2:</strong> {b.phase2Summary}</div>
                    {b.phase3Summary && (
                      <div className={b.isCalamity ? 'text-yellow-300' : 'text-rose-900'}>
                        <strong>P3 (&lt;30%):</strong> {b.phase3Summary}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDropsBossId(dropsExpanded ? null : b.id);
                    }}
                    className={`text-[10px] font-bold self-start px-2 py-0.5 rounded-lg border cursor-pointer ${
                      b.isCalamity
                        ? 'bg-purple-900/70 border-yellow-400/50 text-yellow-200'
                        : 'bg-white/80 border-amber-800/30 text-amber-900 hover:bg-amber-200/60'
                    }`}
                  >
                    {dropsExpanded ? '▾ Hide Drop Table (%)' : `▸ Drop Table (${b.drops.length} drops)`}
                  </button>

                  {dropsExpanded && (
                    <div className={`rounded-lg p-2 space-y-1 text-[10px] border ${b.isCalamity ? 'bg-slate-900/90 border-purple-500/40' : 'bg-white/90 border-amber-900/20'}`}>
                      {b.drops.map((d) => {
                        const pct = selectedDiff === 'normal' ? d.chanceNormal : d.chanceExpert;
                        return (
                          <div key={`${b.id}_${d.itemId}_${d.label}`} className="flex items-center justify-between gap-2">
                            <span className="font-bold truncate">{d.label} ×{d.quantity}</span>
                            <span className="font-mono font-bold text-emerald-600 shrink-0">
                              {pct >= 0.01 ? `${(pct * 100).toFixed(pct < 0.1 ? 1 : 0)}%` : `${(pct * 100).toFixed(2)}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {b.noHitEasterEggHint && (
                    <div className="text-[10px] font-bold text-amber-800 bg-yellow-100/90 border border-yellow-500/60 rounded-lg px-2 py-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{b.noHitEasterEggHint}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. DIFFICULTY MODE SELECTION */}
        <div className="space-y-1.5">
          <div className="font-display font-bold text-xs uppercase text-amber-900 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-purple-700" /> 2. Select Difficulty Tier
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = selectedDiff === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedDiff(opt.id)}
                  className={`text-left p-2.5 rounded-xl border-2 transition flex flex-col gap-1 ${
                    active ? `${opt.color} ring-2 ring-amber-500 shadow` : 'bg-amber-50/80 border-amber-900/25 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display font-bold text-xs">{opt.label}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900/10 text-[10px] font-bold">
                      {opt.mult}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase opacity-85">{opt.badge}</div>
                  <p className="text-[10px] leading-snug opacity-90">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. SOLO VS CO-OP PARTY MODE */}
        <div className="space-y-1.5">
          <div className="font-display font-bold text-xs uppercase text-amber-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700" /> 3. Party Mode (1–4 Players)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPartyMode('solo')}
              className={`p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2 ${
                partyMode === 'solo'
                  ? 'bg-emerald-50 border-emerald-700 text-emerald-950 ring-2 ring-amber-400'
                  : 'bg-amber-50/80 border-amber-900/25 text-amber-950 hover:bg-white'
              }`}
            >
              <User className="w-4 h-4 shrink-0 text-emerald-700" />
              <div>
                <div className="font-display font-bold text-xs">Solo Raid (1P)</div>
                <div className="text-[10px] opacity-85">Base solo Boss HP · Ideal for No-Hit challenges</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPartyMode('coop')}
              className={`p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2 ${
                partyMode === 'coop'
                  ? 'bg-purple-50 border-purple-700 text-purple-950 ring-2 ring-amber-400'
                  : 'bg-amber-50/80 border-amber-900/25 text-amber-950 hover:bg-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-purple-700" />
              <div>
                <div className="font-display font-bold text-xs">Co-op Party (Up to 4P)</div>
                <div className="text-[10px] opacity-85">+65% Boss HP per extra ally · Instanced Treasure Bags!</div>
              </div>
            </button>
          </div>
        </div>

        {/* 4. MATCHUP SUMMARY & LAUNCH */}
        <div className="p-3 rounded-xl bg-amber-950/10 border border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-amber-950 space-y-0.5">
            <div className="font-display font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              {bossDef.khmerName} ({selectedDiff.toUpperCase()} · {partyMode === 'coop' ? 'CO-OP 2P Preview' : 'SOLO'}) — {scaledHp.toLocaleString()} HP
            </div>
            <div>
              Estimated Hit Taken: <strong className="text-rose-800">-{expectedHitTaken} HP</strong> · Drops:{' '}
              <strong>{bossDef.drops.map((d) => d.label).join(', ')}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onEnterDungeon(
                selectedBoss,
                selectedDiff,
                partyMode,
                partyMode === 'coop' ? `coop_${selectedBoss}_${selectedDiff}` : undefined
              )
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-amber-50 border-2 border-purple-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shrink-0 active:scale-95 transition"
          >
            <Swords className="w-4 h-4" />
            {partyMode === 'coop' ? 'JOIN CO-OP RAID' : 'ENTER DUNGEON'}
          </button>
        </div>
          </>
        )}
      </div>
    </NativeDialog>
  );
};
