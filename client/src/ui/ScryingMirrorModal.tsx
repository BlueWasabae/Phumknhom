import React, { useEffect, useState } from 'react';
import type { ActiveDungeonFightInfo, PlayerState } from '@shared/types';
import { Eye, HeartHandshake, RefreshCw, Sparkles, Swords } from 'lucide-react';
import { fetchActiveDungeonFightsApi, sendVillageCheerApi, type AuthSession } from '../game/network/ApiClient';
import { NativeDialog } from './NativeDialog';

interface ScryingMirrorModalProps {
  open: boolean;
  player: PlayerState;
  authSession: AuthSession | null;
  onClose: () => void;
  onSendCheerReward: (fight: ActiveDungeonFightInfo) => void;
  onEnterPreviewCheerFight?: (bossId: ActiveDungeonFightInfo['bossId']) => void;
}

const CHEER_COST = 50;

export const ScryingMirrorModal: React.FC<ScryingMirrorModalProps> = ({
  open,
  player,
  authSession,
  onClose,
  onSendCheerReward,
  onEnterPreviewCheerFight,
}) => {
  const [fights, setFights] = useState<ActiveDungeonFightInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});

  const refreshFights = async () => {
    setLoading(true);
    try {
      const list = await fetchActiveDungeonFightsApi();
      setFights(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void refreshFights();
    }
  }, [open]);

  const handleCheer = async (fight: ActiveDungeonFightInfo) => {
    if (player.currencies.coins < CHEER_COST) return;
    if (!fight.isSimulation) {
      await sendVillageCheerApi(authSession, fight.roomId, player.name);
    }
    setSentIds((prev) => ({ ...prev, [fight.roomId]: true }));
    onSendCheerReward(fight);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🔮 Temple Scrying Mirror · កញ្ចក់ទិព្វជួយមិត្តភក្តិ"
      subtitle={`Wallet: ${player.currencies.coins.toLocaleString()} Coins · Friendly: ${player.lifeStats.friendly}/100 · Send Hot Num Pang Care Packages into live Boss Fights!`}
      maxWidthClass="w-[min(95vw,680px)]"
    >
      <div className="space-y-3 text-xs max-h-[72dvh] overflow-y-auto pr-1">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-amber-950 text-amber-50 border-2 border-cyan-400/70 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5 max-w-md">
            <div className="font-display font-bold text-sm text-cyan-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Plaza-to-Dungeon Village Cheer Drops
            </div>
            <p className="text-[11px] text-amber-100/90">
              Drop a parachuting <strong>Golden Num Pang Care Package</strong> (50 Coins) into any active Boss Arena!
              The raider gains <strong>+80 HP &amp; +20% ATK (30s)</strong>, and you earn <strong>+10 Friendly</strong>!
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshFights()}
            className="px-3 py-1.5 rounded-xl bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-300/60 text-cyan-100 font-display font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="space-y-2.5">
          {fights.map((fight) => {
            const hpPct = Math.max(1, Math.min(100, Math.round((fight.bossHp / Math.max(1, fight.bossMaxHp)) * 100)));
            const canAfford = player.currencies.coins >= CHEER_COST;
            const cheered = Boolean(sentIds[fight.roomId]);
            return (
              <div
                key={fight.roomId}
                className="p-3 rounded-xl bg-amber-50 border-2 border-amber-900/35 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-rose-700" />
                      <span>{fight.bossName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-700 text-white text-[9px] uppercase">
                        {fight.difficulty}
                      </span>
                      {fight.isSimulation && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-700 text-white text-[9px]">
                          LIVE SOLO DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-800 font-semibold">
                      Raider: <strong>{fight.playerName}</strong> ({fight.playerCount} player
                      {fight.playerCount === 1 ? '' : 's'} in arena)
                    </div>
                  </div>
                  <div className="text-right font-display font-bold text-rose-800">
                    Boss HP {hpPct}%
                  </div>
                </div>

                {/* Boss HP Bar */}
                <div className="h-2.5 rounded-full bg-stone-900 overflow-hidden border border-amber-900/40">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => void handleCheer(fight)}
                    className="flex-1 phum-btn py-2 px-3 rounded-xl font-display font-bold text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    {cheered
                      ? '🥖 Send Another Hot Num Pang (50 Coins)'
                      : '🥖 Send Hot Num Pang Care Package (50 Coins)'}
                  </button>

                  {fight.isSimulation && onEnterPreviewCheerFight && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEnterPreviewCheerFight(fight.bossId);
                      }}
                      className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-950 font-display font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Watch Drop Live in Boss Arena
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
