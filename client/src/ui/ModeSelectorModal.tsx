import React, { useState } from 'react';
import type { BossId, DifficultyMode, PlayerState } from '@shared/types';
import { calculateDamageTaken } from '@shared/balanceFormulas';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { KHMER_BOSSES, KHMER_BOSS_LIST, getScaledBossMaxHp } from '@shared/khmerBosses';
import { Flame, ShieldAlert, Skull, Sparkles, Swords, Trophy, User, Users } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ModeSelectorModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onEnterDungeon: (
    bossId: BossId,
    difficulty: DifficultyMode,
    partyMode: 'solo' | 'coop',
    partyId?: string
  ) => void;
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
    id: 'calamity',
    label: 'Calamity',
    mult: '1.9× HP',
    badge: 'Focus + Fury + Def Crack',
    color: 'border-purple-700 bg-purple-50 text-purple-950',
    desc: 'Activates Focus [F] (+120% Dmg) & Fury [R] (+40% Atk Spd, +25% Crit) gauges, Defense Damage, and maximum loot rewards!',
  },
];

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  open,
  player,
  onClose,
  onEnterDungeon,
}) => {
  const [selectedBoss, setSelectedBoss] = useState<BossId>('sdech_kongkaeb');
  const [selectedDiff, setSelectedDiff] = useState<DifficultyMode>('normal');
  const [partyMode, setPartyMode] = useState<'solo' | 'coop'>('solo');

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
        {/* 1. BOSS SELECTION */}
        <div className="space-y-1.5">
          <div className="font-display font-bold text-xs uppercase text-amber-900 flex items-center gap-1.5">
            <Skull className="w-4 h-4 text-rose-700" /> 1. Select Khmer Boss
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {KHMER_BOSS_LIST.map((b) => {
              const active = selectedBoss === b.id;
              const cleared = player.clearedBosses.includes(b.id);
              const previewHp = getScaledBossMaxHp(b.id, selectedDiff, 1);

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBoss(b.id)}
                  className={`text-left p-3 rounded-xl border-2 transition flex flex-col gap-1.5 ${
                    active
                      ? 'bg-amber-100 border-amber-900 ring-2 ring-amber-500 shadow-md'
                      : 'bg-amber-50/90 border-amber-900/30 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-amber-950">
                        {b.khmerName}
                      </div>
                      <div className="text-[11px] font-bold text-amber-800">{b.englishName}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 font-display font-bold text-[10px] shrink-0">
                      #{b.rosterNumber}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-400/40">
                      HP: {previewHp.toLocaleString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-400/40">
                      Base ATK: {b.baseAttack}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-400/40">
                      {b.rig}
                    </span>
                    {cleared && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white inline-flex items-center gap-0.5">
                        <Trophy className="w-2.5 h-2.5" /> Cleared
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-amber-950/90 leading-snug space-y-0.5 pt-0.5 border-t border-amber-900/15">
                    <div>
                      <strong>P1:</strong> {b.phase1Summary}
                    </div>
                    <div>
                      <strong>P2 (&lt;50%):</strong> {b.phase2Summary}
                    </div>
                  </div>

                  {b.noHitEasterEggHint && (
                    <div className="text-[10px] font-bold text-amber-800 bg-yellow-100/90 border border-yellow-500/60 rounded-lg px-2 py-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{b.noHitEasterEggHint}</span>
                    </div>
                  )}
                </button>
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
      </div>
    </NativeDialog>
  );
};
