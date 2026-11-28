import React, { useEffect, useState } from 'react';
import type {
  KromGuild,
  KromTerritoryId,
  KromWarSnapshot,
  PlayerState,
} from '@shared/types';
import { Crown, Flag, RefreshCw, Shield, Sparkles, Swords, Target, Trophy } from 'lucide-react';
import {
  fetchKromByIdApi,
  fetchKromWarStatusApi,
  finalizeKromWarWeekApi,
  scoreKromWarPointsApi,
  setKromTargetTerritoryApi,
  type AuthSession,
} from '../game/network/ApiClient';
import { EventBus } from '../game/EventBus';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface KromWarModalProps {
  open: boolean;
  playerState: PlayerState;
  authSession: AuthSession | null;
  onClose: () => void;
  onToast: (msg: string) => void;
  onWarpToTerritory?: (mapId: KromTerritoryId) => void;
}

const TERRITORY_VISUALS: Record<
  KromTerritoryId,
  { icon: string; badgeClass: string; borderClass: string }
> = {
  market_street: {
    icon: '🏮',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    borderClass: 'border-amber-500/45',
  },
  wild_frontier: {
    icon: '⛏️',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    borderClass: 'border-emerald-500/45',
  },
  koh_rong_island: {
    icon: '🏝️',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    borderClass: 'border-cyan-500/45',
  },
};

function formatTimeRemaining(endsAt: number): string {
  const diff = Math.max(0, endsAt - Date.now());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hrs = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hrs}h ${mins}m`;
}

export const KromWarModal: React.FC<KromWarModalProps> = ({
  open,
  playerState,
  authSession,
  onClose,
  onToast,
  onWarpToTerritory,
}) => {
  const [war, setWar] = useState<KromWarSnapshot | null>(null);
  const [myGuild, setMyGuild] = useState<KromGuild | null>(null);
  const [busy, setBusy] = useState(false);

  const loadWar = async () => {
    setBusy(true);
    const [snap, guild] = await Promise.all([
      fetchKromWarStatusApi(),
      playerState.kromId ? fetchKromByIdApi(playerState.kromId) : Promise.resolve(null),
    ]);
    setWar(snap);
    setMyGuild(guild);
    setBusy(false);
  };

  useEffect(() => {
    if (!open) return;
    void loadWar();
  }, [open, playerState.kromId]);

  if (!open) return null;

  const targetTerritoryId: KromTerritoryId = myGuild?.targetTerritoryId ?? 'market_street';

  const handleSetTarget = async (territoryId: KromTerritoryId) => {
    if (!playerState.kromId) {
      onToast('Join or create a Krom first to choose a Territory War target!');
      return;
    }
    setBusy(true);
    soundManager.playSfx('click');
    const res = await setKromTargetTerritoryApi(authSession, {
      kromId: playerState.kromId,
      territoryId,
    });
    setBusy(false);
    if (!res.ok) {
      onToast(res.error);
      return;
    }
    setMyGuild(res.krom);
    onToast(`🎯 [${res.krom.tag}] is now contesting ${territoryId.replace(/_/g, ' ').toUpperCase()}!`);
  };

  const handleContributeRally = async (territoryId: KromTerritoryId) => {
    if (!playerState.kromId || !playerState.kromTag) {
      onToast('Join a Krom guild first to earn Territory War Points!');
      return;
    }
    setBusy(true);
    soundManager.playSfx('victory');
    const res = await scoreKromWarPointsApi(authSession, {
      kromId: playerState.kromId,
      kromTag: playerState.kromTag,
      kromName: playerState.kromName ?? myGuild?.name ?? 'Khmer Krom',
      territoryId,
      points: 150,
      source: 'War Table Rally',
    });
    setBusy(false);
    if (!res.ok) {
      onToast(res.error);
      return;
    }
    setWar(res.war);
    EventBus.emit('kromWar:updated', res.war);
    onToast(`⚔️ +150 War Points rallied for [${playerState.kromTag}]!`);
  };

  const handleFinalizeWeek = async () => {
    setBusy(true);
    soundManager.playSfx('victory');
    const res = await finalizeKromWarWeekApi(authSession);
    setBusy(false);
    if (!res.ok) {
      onToast(res.error);
      return;
    }
    setWar(res.war);
    EventBus.emit('kromWar:updated', res.war);
    EventBus.emit('ticker:push', { text: res.bannerText, category: 'boss' });
    onToast(res.bannerText);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="⚔️ Weekly Krom Territory Wars (សង្គ្រាមដែនដីក្រុម)"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Top Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-rose-950/50 p-3.5">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
              <Swords className="h-4 w-4" />
              <span>Cycle {war?.weekId ?? 'Loading...'}</span>
              {war && (
                <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] text-amber-200">
                  Resets in {formatTimeRemaining(war.endsAt)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Defeat <b>Mythic Bosses (+120 pts)</b>, clear <b>Pagoda Tower floors (+45 pts)</b>, harvest{' '}
              <b>Spirit Crops (+35 pts)</b>, or catch <b>Rare+ Fish (+30 pts)</b> to claim 1 of 3 Angkor territories &
              fly your golden <b>[TAG] Banner</b> physically inside that map!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadWar()}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleFinalizeWeek()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow hover:brightness-110 disabled:opacity-50"
            >
              <Trophy className="h-3.5 w-3.5" />
              Finalize War Week
            </button>
          </div>
        </div>

        {/* 3 Contestable Territory Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(war?.territories ?? []).map((terr) => {
            const vis = TERRITORY_VISUALS[terr.id];
            const isTargeted = Boolean(playerState.kromId) && targetTerritoryId === terr.id;
            const isOwnedByUs =
              Boolean(playerState.kromTag) &&
              terr.owner?.kromTag.toUpperCase() === playerState.kromTag?.toUpperCase();

            return (
              <div
                key={terr.id}
                className={`flex flex-col justify-between rounded-xl border ${vis.borderClass} bg-slate-900/90 p-3.5 shadow-lg`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-white">
                        {vis.icon} {terr.name}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-200/80">{terr.khmerName}</div>
                    </div>
                    {isTargeted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                        <Target className="h-3 w-3" /> TARGET
                      </span>
                    )}
                  </div>

                  {/* Owner Banner */}
                  <div className="mt-2.5 rounded-lg border border-slate-700/80 bg-slate-950/75 p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reigning Territory Owner
                    </div>
                    {terr.owner ? (
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                          <Crown className="h-3.5 w-3.5 text-amber-400" />
                          [{terr.owner.kromTag}] {terr.owner.kromName}
                        </span>
                        {isOwnedByUs && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                            YOUR KROM
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs font-semibold text-slate-400">
                        Unclaimed — #1 Krom this week claims it!
                      </div>
                    )}
                  </div>

                  {/* Owner Perk */}
                  <div className={`mt-2.5 rounded-lg border px-2.5 py-2 text-[11px] ${vis.badgeClass}`}>
                    <div className="flex items-center gap-1 font-extrabold">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span>{terr.perkTitle}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug opacity-90">{terr.perkDescription}</p>
                  </div>

                  {/* Live Weekly Standings */}
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>Weekly War Points</span>
                      <span>Top Kroms</span>
                    </div>
                    {terr.standings.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-700 py-2 text-center text-[11px] text-slate-400">
                        No points recorded yet this cycle.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {terr.standings.slice(0, 4).map((row, idx) => (
                          <div
                            key={row.kromTag}
                            className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                              idx === 0
                                ? 'border border-amber-400/50 bg-amber-500/15 font-bold text-amber-200'
                                : 'bg-slate-800/70 text-slate-300'
                            }`}
                          >
                            <span className="truncate">
                              #{idx + 1} [{row.kromTag}] {row.kromName}
                            </span>
                            <span className="font-mono font-black text-amber-300">{row.points} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-3.5 flex flex-col gap-1.5 border-t border-slate-800 pt-3">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busy || !playerState.kromId || isTargeted}
                      onClick={() => void handleSetTarget(terr.id)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-400/50 bg-amber-500/15 px-2 py-1.5 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      <Flag className="h-3 w-3" />
                      {isTargeted ? 'Active Target' : 'Set Target'}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !playerState.kromId}
                      onClick={() => void handleContributeRally(terr.id)}
                      title="Rally War Points for your Krom on this territory"
                      className="flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Shield className="h-3 w-3" /> +150 Rally
                    </button>
                  </div>
                  {onWarpToTerritory && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onWarpToTerritory(terr.id);
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                    >
                      🗺️ Inspect Banner on {terr.name}
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
