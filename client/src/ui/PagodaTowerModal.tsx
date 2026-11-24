import React, { useMemo, useState } from 'react';
import type { PlayerState, WeaponAuraId } from '@shared/types';
import { Castle, Flame, Lock, Shield, Sparkles, Swords, Users } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface PagodaTowerModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onStartFloor: (startFloor: number, partyMode: 'solo' | 'coop') => void;
  onEquipWeaponAura: (auraId: WeaponAuraId | null) => void;
}

const AURA_MILESTONES: Array<{
  floor: number;
  auraId: WeaponAuraId;
  name: string;
  khmerName: string;
  colorClass: string;
  dotColor: string;
}> = [
  {
    floor: 10,
    auraId: 'golden_lotus',
    name: 'Golden Lotus Weapon Aura',
    khmerName: 'រស្មីផ្កាឈូកមាស',
    colorClass: 'border-amber-500 bg-amber-50 text-amber-950',
    dotColor: '#facc15',
  },
  {
    floor: 25,
    auraId: 'emerald_naga',
    name: 'Emerald Naga Weapon Aura',
    khmerName: 'រស្មីនាគមរកត',
    colorClass: 'border-emerald-500 bg-emerald-50 text-emerald-950',
    dotColor: '#10b981',
  },
  {
    floor: 50,
    auraId: 'celestial_angkor',
    name: 'Celestial Angkor Weapon Aura',
    khmerName: 'រស្មីអង្គរទេព',
    colorClass: 'border-purple-500 bg-purple-50 text-purple-950',
    dotColor: '#c084fc',
  },
];

const CHECKPOINT_FLOORS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export const PagodaTowerModal: React.FC<PagodaTowerModalProps> = ({
  open,
  player,
  onClose,
  onStartFloor,
  onEquipWeaponAura,
}) => {
  const highestFloor = Math.max(0, Math.min(50, player.highestTowerFloor ?? 0));
  const unlockedAuras = useMemo(() => {
    const set = new Set<WeaponAuraId>(player.unlockedWeaponAuras ?? []);
    if (highestFloor >= 10) set.add('golden_lotus');
    if (highestFloor >= 25) set.add('emerald_naga');
    if (highestFloor >= 50) set.add('celestial_angkor');
    return set;
  }, [highestFloor, player.unlockedWeaponAuras]);

  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [partyMode, setPartyMode] = useState<'solo' | 'coop'>('solo');

  const isCheckpointUnlocked = (floor: number): boolean => {
    if (floor === 1) return true;
    return highestFloor >= floor - 1;
  };

  const bossNameForFloor = (floor: number): string => {
    const cycle = Math.floor((floor - 1) / 5) % 4;
    if (cycle === 0) return 'Sdech Kongkaeb (King Frog)';
    if (cycle === 1) return 'Arp Prey Chrov (Forest Ghost)';
    if (cycle === 2) return 'Yeak Thmor Prasat (Stone Guardian)';
    return 'Neak Reach (Shadow Naga)';
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🗼 Endless 50-Floor Pagoda Tower · ប្រាសាទសាកល្បង ៥០ ជាន់"
      subtitle={`Highest Cleared: Floor ${highestFloor} / 50 · Every 5th Floor is a Mythic Khmer Boss Trial`}
      maxWidthClass="w-[min(96vw,760px)]"
    >
      <div className="space-y-3 text-xs max-h-[72dvh] overflow-y-auto pr-1">
        {/* Progress Banner + Mode Toggle */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-amber-950 text-amber-50 border-2 border-amber-400/70 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-amber-300">
              <Castle className="w-4 h-4" />
              <span>Tower Record: Floor {highestFloor} / 50</span>
            </div>
            <p className="text-[11px] text-amber-100/90 max-w-md">
              Every floor awards <strong>Coins</strong>, <strong>Vitality XP</strong> &amp;{' '}
              <strong>Reforge Stones</strong>. Reach Floors 10, 25, and 50 to unlock glowing Weapon Auras!
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-amber-400/40">
            <button
              type="button"
              onClick={() => setPartyMode('solo')}
              className={`px-3 py-1.5 rounded-lg font-display font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                partyMode === 'solo'
                  ? 'bg-amber-500 text-amber-950 shadow'
                  : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Solo Climb
            </button>
            <button
              type="button"
              onClick={() => setPartyMode('coop')}
              className={`px-3 py-1.5 rounded-lg font-display font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                partyMode === 'coop'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Party Trial
            </button>
          </div>
        </div>

        {/* 5-Floor Checkpoint Warp Grid */}
        <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-amber-950">
              ⚡ Select Starting Floor or Unlocked 5-Floor Checkpoint
            </span>
            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
              Bosses on Floors 5, 10, 15 … 50
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {CHECKPOINT_FLOORS.map((floor) => {
              const unlocked = isCheckpointUnlocked(floor);
              const isBoss = floor % 5 === 0;
              const active = selectedFloor === floor;
              return (
                <button
                  key={floor}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setSelectedFloor(floor)}
                  className={`p-2 rounded-xl border-2 text-center transition flex flex-col items-center gap-0.5 ${
                    active
                      ? 'bg-purple-800 text-amber-50 border-amber-400 shadow ring-2 ring-amber-400/60'
                      : unlocked
                        ? isBoss
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-700/60 cursor-pointer'
                          : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-900/30 cursor-pointer'
                        : 'bg-stone-200/70 text-stone-500 border-stone-300 opacity-65 cursor-not-allowed'
                  }`}
                >
                  <div className="font-display font-bold text-xs flex items-center gap-1">
                    {!unlocked ? <Lock className="w-3 h-3" /> : isBoss ? <Flame className="w-3 h-3 text-rose-500" /> : null}
                    <span>Floor {floor}</span>
                  </div>
                  <span className="text-[9px] font-bold opacity-80">
                    {floor === 1 ? 'Start' : isBoss ? 'Boss CP' : 'Cleared'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-amber-900/20 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-xs text-amber-950">
                Ready for Floor {selectedFloor} / 50{' '}
                {selectedFloor % 5 === 0 ? `— 🔥 Mythic Boss: ${bossNameForFloor(selectedFloor)}` : '— Wave Gauntlet'}
              </div>
              <div className="text-[10px] text-amber-800">
                Reward: +{80 + selectedFloor * 28} Coins · +{35 + selectedFloor * 8} Vitality XP ·{' '}
                {selectedFloor % 5 === 0 ? '2×' : '1×'} Reforge Stone
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartFloor(selectedFloor, partyMode);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-purple-600 to-indigo-800 hover:from-purple-500 hover:to-indigo-700 text-amber-50 border-2 border-amber-400 font-display font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" /> Enter Floor {selectedFloor}
            </button>
          </div>
        </div>

        {/* Milestone Glowing Weapon Auras */}
        <div className="p-3 rounded-xl bg-amber-50/90 border-2 border-amber-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" /> Milestone Weapon Auras (Live Glowing Particles)
            </span>
            {player.loadout.weaponAura && (
              <button
                type="button"
                onClick={() => onEquipWeaponAura(null)}
                className="px-2 py-0.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[10px] cursor-pointer"
              >
                Hide Aura
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            {AURA_MILESTONES.map((m) => {
              const unlocked = unlockedAuras.has(m.auraId);
              const equipped = player.loadout.weaponAura === m.auraId;
              return (
                <div
                  key={m.auraId}
                  className={`p-2.5 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                    unlocked ? m.colorClass : 'border-stone-300 bg-stone-100/80 text-stone-500'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-sm"
                        style={{ backgroundColor: m.dotColor }}
                      />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10">
                        Floor {m.floor}
                      </span>
                    </div>
                    <div className="font-display font-bold text-xs">{m.name}</div>
                    <div className="text-[10px] opacity-80">{m.khmerName}</div>
                  </div>
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => onEquipWeaponAura(equipped ? null : m.auraId)}
                      className={`w-full py-1.5 rounded-lg font-display font-bold text-[11px] transition cursor-pointer ${
                        equipped
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-800 hover:bg-amber-700 text-amber-50'
                      }`}
                    >
                      {equipped ? '✓ Equipped Aura' : 'Equip Weapon Aura'}
                    </button>
                  ) : (
                    <div className="text-center py-1 rounded-lg bg-stone-200 text-stone-600 font-bold text-[10px]">
                      🔒 Clear Floor {m.floor}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
