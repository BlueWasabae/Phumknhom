import React, { useEffect, useState } from 'react';
import { WORLD_EVENT_LIST, type WorldEventId } from '@shared/worldEvents';
import { KHMER_FESTIVAL_LIST, type FestivalId } from '@shared/festivals';
import {
  Activity,
  KeyRound,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  fetchAdminFeedbackApi,
  fetchAdminServerStatsApi,
  finalizeKromWarWeekApi,
  sendAdminBroadcastApi,
  triggerAdminLiveEventApi,
  type AdminServerStats,
  type AuthSession,
  type FeedbackReportClient,
} from '../game/network/ApiClient';
import { soundManager } from '../game/systems/SoundManager';
import { EventBus } from '../game/EventBus';
import { worldEventManager } from '../game/systems/WorldEventManager';
import { worldBossManager } from '../game/systems/WorldBossManager';
import { seasonClock } from '../game/systems/SeasonClock';
import { NativeDialog } from './NativeDialog';

interface AdminPanelModalProps {
  open: boolean;
  authSession: AuthSession | null;
  localOnlineCount: number;
  onClose: () => void;
}

const GM_SECRET_STORAGE = 'phum_khnhom_gm_secret_session';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  open,
  authSession,
  localOnlineCount,
  onClose,
}) => {
  const [adminSecret, setAdminSecret] = useState<string>(() => {
    try {
      return window.sessionStorage.getItem(GM_SECRET_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [verifiedActor, setVerifiedActor] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminServerStats | null>(null);
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReportClient[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState(
    '🎉 Welcome to ភូមិខ្ញុំ 1.0 Public Launch! Redeem code PHUM2026 in MENU → Gift Codes!'
  );

  const loadStats = async (secretOverride?: string) => {
    const key = secretOverride ?? adminSecret;
    setBusy(true);
    setStatusMsg(null);
    const res = await fetchAdminServerStatsApi(key, authSession?.email ?? null);
    setBusy(false);
    if (res.ok) {
      setVerifiedActor(res.actor);
      setStats(res.stats);
      void fetchAdminFeedbackApi(key, authSession?.email ?? null).then(setFeedbackReports);
      try {
        if (key) window.sessionStorage.setItem(GM_SECRET_STORAGE, key);
      } catch {
        // ignore
      }
      return;
    }

    // Offline Founder Preview fallback when running standalone without port 2567
    if (
      res.offline &&
      (key.trim() === 'PHUM-FOUNDER-2026' ||
        authSession?.email?.toLowerCase() === 'sovann@bluexacedamy.space' ||
        authSession?.email?.toLowerCase() === 'dev@bluexacedamy.space')
    ) {
      setVerifiedActor('Founder (Offline Local Preview)');
      setStats({
        plazaPlayers: Math.max(1, localOnlineCount),
        clubPlayers: 0,
        dungeonPlayers: 0,
        totalOnlinePlayers: Math.max(1, localOnlineCount),
        activeRooms: { plaza: 1, club: 0, dungeon: 0 },
        economy: {
          activeMarketListings: 0,
          activeKroms: 1,
          activeTukTukCarts: 0,
          leaderboardAccounts: 10,
        },
        storageMode: 'offline_preview',
        uptimeSec: 0,
      });
      setStatusMsg('Connected in Local Preview Mode (Backend offline — triggers apply locally).');
      return;
    }

    setVerifiedActor(null);
    setStatusMsg(res.error);
  };

  useEffect(() => {
    if (open && (adminSecret || authSession?.email)) {
      void loadStats();
    }
  }, [open]);

  const handleBroadcast = async () => {
    const text = announcement.trim();
    if (!text) return;
    soundManager.playSfx('level_up');
    setBusy(true);
    const res = await sendAdminBroadcastApi(adminSecret, authSession?.email ?? null, text);
    setBusy(false);

    // Always push immediately to local ticker too
    EventBus.emit('ticker:push', { text: `📣 [GM] ${text}`, category: 'boss' });
    EventBus.emit('ui:toast', { text: `📣 [SERVER ANNOUNCEMENT] ${text}` });

    if (res.ok) {
      setStatusMsg(`✓ Broadcast sent live to all online players (${res.announcement.actor})!`);
    } else if (res.offline) {
      setStatusMsg('✓ Broadcast pushed locally (backend server offline).');
    } else {
      setStatusMsg(res.error);
    }
  };

  const handleTriggerWorldEvent = async (eventId: WorldEventId) => {
    soundManager.playSfx('magic');
    worldEventManager.triggerEvent(eventId);
    setBusy(true);
    const res = await triggerAdminLiveEventApi(adminSecret, authSession?.email ?? null, {
      worldEventId: eventId,
    });
    setBusy(false);
    setStatusMsg(
      res.ok
        ? `⚡ Triggered ${eventId.replace(/_/g, ' ').toUpperCase()} for the entire server!`
        : res.offline
          ? `⚡ Triggered ${eventId.replace(/_/g, ' ').toUpperCase()} locally (backend offline).`
          : res.error
    );
  };

  const handleTriggerFestival = async (festivalId: FestivalId) => {
    soundManager.playSfx('victory');
    seasonClock.setFestivalOverride(festivalId);
    setBusy(true);
    const res = await triggerAdminLiveEventApi(adminSecret, authSession?.email ?? null, {
      festivalId,
    });
    setBusy(false);
    setStatusMsg(
      res.ok
        ? `🏮 Activated ${festivalId.replace(/_/g, ' ').toUpperCase()} festival server-wide!`
        : res.offline
          ? `🏮 Activated ${festivalId.replace(/_/g, ' ').toUpperCase()} locally (backend offline).`
          : res.error
    );
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🛡️ Founder / GM Control Panel · ផ្ទាំងគ្រប់គ្រងភូមិ"
      subtitle="Owner-only live broadcast, server-wide events & real-time room telemetry (Shortcut: Ctrl+Shift+G)"
      maxWidthClass="w-[min(96vw,700px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Auth Bar */}
        <div className="p-3 rounded-xl bg-slate-900 text-amber-50 border-2 border-amber-500/60 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display font-bold flex items-center gap-1.5 text-amber-300">
              <ShieldCheck className="w-4 h-4" />
              {verifiedActor ? `Authenticated: ${verifiedActor}` : 'GM Verification Required'}
            </span>
            {verifiedActor && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadStats()}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-950 font-display font-bold text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> Refresh Stats
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <KeyRound className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadStats();
                }}
                placeholder="Enter ADMIN_SECRET (default: PHUM-FOUNDER-2026)"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-amber-500/40 text-amber-100 placeholder:text-slate-400 text-xs"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadStats()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs cursor-pointer"
            >
              Verify GM
            </button>
          </div>

          {statusMsg && (
            <div className="text-[11px] font-bold text-amber-200 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-amber-500/30">
              {statusMsg}
            </div>
          )}
        </div>

        {verifiedActor && (
          <>
            {/* Live Player Count & Economy Stats */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2">
              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-700" />
                Live Online Players &amp; Economy Stats
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded-xl bg-white border border-amber-900/20">
                  <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                    <Users className="w-3 h-3" /> PlazaRoom
                  </div>
                  <div className="font-display font-bold text-base text-emerald-800">
                    {stats?.plazaPlayers ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-900/20">
                  <div className="text-[10px] text-amber-800 font-bold">🎲 ClubRoom</div>
                  <div className="font-display font-bold text-base text-amber-900">
                    {stats?.clubPlayers ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-900/20">
                  <div className="text-[10px] text-amber-800 font-bold">⚔️ DungeonRoom</div>
                  <div className="font-display font-bold text-base text-purple-800">
                    {stats?.dungeonPlayers ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-900/20">
                  <div className="text-[10px] text-amber-800 font-bold">🏪 Market / Carts / Kroms</div>
                  <div className="font-display font-bold text-sm text-sky-900">
                    {stats?.economy.activeMarketListings ?? 0} / {stats?.economy.activeTukTukCarts ?? 0} /{' '}
                    {stats?.economy.activeKroms ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Broadcast Server Banner */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2">
              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-amber-700" />
                Broadcast Live Gold Server Banner
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  maxLength={180}
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="flex-1 min-w-[220px] px-3 py-1.5 rounded-xl bg-white border-2 border-amber-900/30 text-amber-950 text-xs font-semibold"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleBroadcast()}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border border-amber-950 font-display font-bold text-xs shadow cursor-pointer"
                >
                  📣 Broadcast Now
                </button>
              </div>
            </div>

            {/* Trigger Live World Events & Seasonal Festivals */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2.5">
              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-700" />
                Trigger Live World Event (Server-Wide)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {WORLD_EVENT_LIST.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleTriggerWorldEvent(ev.id)}
                    className="p-2 rounded-xl bg-white hover:bg-purple-100 border-2 border-purple-900/25 text-left transition cursor-pointer"
                  >
                    <div className="font-display font-bold text-[11px] text-amber-950">
                      {ev.icon} {ev.name}
                    </div>
                    <div className="text-[9px] text-amber-800">{ev.khmerName}</div>
                  </button>
                ))}
              </div>

              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5 pt-1 border-t border-amber-900/15">
                <Zap className="w-4 h-4 text-cyan-700" />
                Server-Wide World Boss Raid (Ancient Naga Colossus)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    soundManager.playSfx('victory');
                    worldBossManager.spawnNow(true);
                    setStatusMsg(
                      '🐉 WORLD BOSS SPAWNED! Ancient Naga Colossus portal opened in Sunken Ruins + HUD banner live!'
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-amber-600 hover:from-cyan-500 hover:to-amber-500 text-white border-2 border-slate-950 font-display font-bold text-xs shadow cursor-pointer"
                >
                  🐉 Spawn World Boss (Ancient Naga Colossus)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    soundManager.playSfx('magic');
                    const next = !worldEventManager.isBlackMarketActive();
                    worldEventManager.triggerBlackMarket(next);
                    setStatusMsg(
                      next
                        ? '🏮 MONSOON BLACK MARKET SPAWNED in NE Misty Bamboo Forest!'
                        : '🏮 Monsoon Black Market Smuggler vanished into the mist.'
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-900 via-teal-900 to-amber-700 hover:brightness-110 text-amber-100 border-2 border-amber-400 font-display font-bold text-xs shadow cursor-pointer"
                >
                  🏮 Toggle Black Market (Bamboo Forest)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    soundManager.playSfx('victory');
                    const res = await finalizeKromWarWeekApi(authSession);
                    setBusy(false);
                    if (res.ok) {
                      EventBus.emit('kromWar:updated', res.war);
                      EventBus.emit('ticker:push', { text: res.bannerText, category: 'boss' });
                      setStatusMsg(res.bannerText);
                    } else {
                      setStatusMsg(res.error);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:brightness-110 text-slate-950 border-2 border-amber-950 font-display font-bold text-xs shadow cursor-pointer"
                >
                  🏆 Finalize War Week (Krom Territories)
                </button>
              </div>

              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5 pt-1 border-t border-amber-900/15">
                <Sparkles className="w-4 h-4 text-sky-700" />
                Trigger Khmer Seasonal Festival (Server-Wide)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {KHMER_FESTIVAL_LIST.map((fest) => (
                  <button
                    key={fest.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleTriggerFestival(fest.id)}
                    className="p-2 rounded-xl bg-white hover:bg-sky-100 border-2 border-sky-900/25 text-left transition cursor-pointer"
                  >
                    <div className="font-display font-bold text-[11px] text-amber-950">
                      {fest.icon} {fest.name}
                    </div>
                    <div className="text-[9px] text-amber-800">{fest.khmerName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Update 3.0 — Player Bug Reports & Feedback Inbox */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-amber-950">
                  🐛 Player Bug Reports &amp; Feedback ({feedbackReports.length})
                </div>
                <button
                  type="button"
                  onClick={() => void fetchAdminFeedbackApi(adminSecret, authSession?.email ?? null).then(setFeedbackReports)}
                  className="px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] cursor-pointer"
                >
                  Refresh Reports
                </button>
              </div>
              {feedbackReports.length === 0 ? (
                <div className="text-[11px] text-amber-800/80">
                  No player reports submitted yet. Test via MENU → Report Bug / Feedback!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {feedbackReports.slice(0, 15).map((r) => (
                    <div
                      key={r.id}
                      className="p-2 rounded-lg bg-white border border-amber-900/20 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-amber-950">
                          <span className="px-1.5 py-0.5 mr-1 rounded bg-rose-100 text-rose-800 uppercase text-[9px]">
                            {r.category}
                          </span>
                          {r.title}
                        </span>
                        <span className="text-[9px] text-amber-800 shrink-0">
                          {r.username} · {r.mapId ?? 'plaza'}
                        </span>
                      </div>
                      <p className="text-amber-900/90 leading-snug">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </NativeDialog>
  );
};
