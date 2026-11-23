import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, Wifi, WifiOff } from 'lucide-react';
import { roomClient, type AreaChannelInfo } from '../game/network/RoomClient';
import type { NetworkStatusPayload } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';

interface AreaSwitcherModalProps {
  open: boolean;
  networkStatus: NetworkStatusPayload;
  playerName: string;
  onClose: () => void;
  onSwitchArea: (areaId: string) => void;
  onRenamePlayer: (name: string) => void;
}

const AREA_DESCRIPTIONS: Record<string, string> = {
  'AREA 0': 'Main bustling Central Plaza — default hangout & showcase square.',
  'AREA 1': 'Cozy neighborhood square — trade snacks & form dungeon parties.',
  'AREA 2': 'Quiet riverside channel — chill farming & fashion photos.',
};

export const AreaSwitcherModal: React.FC<AreaSwitcherModalProps> = ({
  open,
  networkStatus,
  playerName,
  onClose,
  onSwitchArea,
  onRenamePlayer,
}) => {
  const [areas, setAreas] = useState<AreaChannelInfo[]>([
    { areaId: 'AREA 0', channel: 0, players: 1, maxPlayers: 40 },
    { areaId: 'AREA 1', channel: 1, players: 0, maxPlayers: 40 },
    { areaId: 'AREA 2', channel: 2, players: 0, maxPlayers: 40 },
  ]);
  const [serverReachable, setServerReachable] = useState(networkStatus.online);
  const [loading, setLoading] = useState(false);
  const [draftName, setDraftName] = useState(playerName);

  useEffect(() => {
    setDraftName(playerName);
  }, [playerName, open]);

  const refreshAreas = useCallback(async () => {
    setLoading(true);
    const res = await roomClient.fetchAreas();
    setAreas(res.areas);
    setServerReachable(res.online);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      void refreshAreas();
    }
  }, [open, refreshAreas]);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftName.replace(/\s+/g, ' ').trim().slice(0, 18);
    if (!clean) return;
    onRenamePlayer(clean);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Phum Village · Area Channel Switcher"
      subtitle="Switch multiplayer Plaza channels live or customize your display name"
      maxWidthClass="w-[min(94vw,520px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Live Connection Status + Refresh */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-900/25">
          <div className="flex items-center gap-2 font-display font-bold">
            {networkStatus.online || serverReachable ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-4 h-4 text-emerald-700" />
                <span className="text-emerald-900">
                  Colyseus Online · Current: {networkStatus.areaId}
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                <WifiOff className="w-4 h-4 text-stone-600" />
                <span className="text-stone-700">
                  Offline Mode (Server on port 2567 unreachable)
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => void refreshAreas()}
            disabled={loading}
            className="stardew-btn px-2.5 py-1 rounded-lg font-display font-bold text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Display Name Quick-Edit (Handy for 2-tab / Phone Multiplayer Testing!) */}
        <form onSubmit={handleRenameSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            maxLength={18}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Your Village Name..."
            className="flex-1 px-2.5 py-1.5 rounded-xl bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-700"
          />
          <button
            type="submit"
            className="stardew-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs shrink-0"
          >
            Set Name
          </button>
        </form>

        {/* AREA 0 / AREA 1 / AREA 2 Channel Cards */}
        <div className="space-y-2">
          {areas.map((area) => {
            const isCurrent = networkStatus.areaId === area.areaId;
            const fillPct = Math.min(100, Math.round((area.players / Math.max(1, area.maxPlayers)) * 100));
            const full = area.players >= area.maxPlayers;

            return (
              <div
                key={area.areaId}
                className={`p-3 rounded-xl border-2 transition flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-emerald-50 border-emerald-700 ring-1 ring-emerald-400'
                    : 'bg-amber-50/95 border-amber-900/30 hover:bg-white'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-700 text-white font-display font-bold text-[11px]">
                      {area.areaId}
                    </span>
                    <span className="inline-flex items-center gap-1 font-display font-bold text-amber-950">
                      <Users className="w-3.5 h-3.5 text-amber-700" />
                      {area.players} / {area.maxPlayers}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold uppercase">
                        You Are Here
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-900/85 leading-snug">
                    {AREA_DESCRIPTIONS[area.areaId] ?? 'Village Plaza social channel.'}
                  </p>
                  <div className="w-full h-1.5 rounded-full bg-amber-950/15 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        fillPct > 80 ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={full}
                  onClick={() => {
                    onSwitchArea(area.areaId);
                    onClose();
                  }}
                  className={`px-3.5 py-2 rounded-xl font-display font-bold text-xs shrink-0 transition ${
                    isCurrent
                      ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950'
                      : 'stardew-btn disabled:opacity-45'
                  }`}
                >
                  {isCurrent ? (networkStatus.online ? 'Reconnect' : 'Connect') : 'Join'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
