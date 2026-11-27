import { matchMaker } from 'colyseus';
import { getStorageMode, getTopTenLeaderboards } from '../db/supabase';
import { listMarketListings } from './marketService';
import { listKroms } from './kromService';
import { listTukTukCarts } from './tukTukCartService';

/**
 * Update 2.0 — Founder / GM Control Panel Service for ភូមិខ្ញុំ (Phum Khnhom).
 * Verifies ADMIN_SECRET or configured owner emails before executing live server
 * broadcasts, World Event / Festival triggers, or live telemetry queries.
 */

const DEFAULT_ADMIN_SECRET = 'PHUM-FOUNDER-2026';
const DEFAULT_OWNER_EMAILS = ['sovann@bluexacedamy.space', 'dev@bluexacedamy.space'];

export interface GmAuthCheckInput {
  adminSecret?: string;
  ownerEmail?: string | null;
}

export function verifyGmAccess(input: GmAuthCheckInput): { ok: true; actor: string } | { ok: false; error: string } {
  const configuredSecret = (process.env.ADMIN_SECRET || DEFAULT_ADMIN_SECRET).trim();
  const configuredEmails = (process.env.ADMIN_OWNER_EMAILS || DEFAULT_OWNER_EMAILS.join(','))
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (input.adminSecret && configuredSecret && input.adminSecret.trim() === configuredSecret) {
    return { ok: true, actor: 'Founder (Secret Key)' };
  }
  if (input.ownerEmail && configuredEmails.includes(input.ownerEmail.trim().toLowerCase())) {
    return { ok: true, actor: `Founder (${input.ownerEmail.trim().toLowerCase()})` };
  }
  return {
    ok: false,
    error: 'Unauthorized — enter valid ADMIN_SECRET or sign in with an authorized Founder email.',
  };
}

export interface LiveGmAnnouncement {
  id: string;
  text: string;
  actor: string;
  timestamp: number;
}

export interface LiveGmEventState {
  worldEventId: 'crimson_eclipse' | 'golden_frog_rain' | 'khmer_night_market' | null;
  festivalId: 'bon_om_touk' | 'chol_chnam_thmey' | 'pchum_ben' | null;
  triggeredBy: string | null;
  triggeredAt: number | null;
}

const recentAnnouncements: LiveGmAnnouncement[] = [];
let currentGmEventState: LiveGmEventState = {
  worldEventId: null,
  festivalId: null,
  triggeredBy: null,
  triggeredAt: null,
};

export function recordGmAnnouncement(text: string, actor: string): LiveGmAnnouncement {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 180);
  const entry: LiveGmAnnouncement = {
    id: `gm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    actor,
    timestamp: Date.now(),
  };
  recentAnnouncements.unshift(entry);
  if (recentAnnouncements.length > 20) {
    recentAnnouncements.length = 20;
  }
  return entry;
}

export function getRecentGmAnnouncements(): LiveGmAnnouncement[] {
  return [...recentAnnouncements];
}

export function setLiveGmEvent(
  payload: {
    worldEventId?: 'crimson_eclipse' | 'golden_frog_rain' | 'khmer_night_market' | null;
    festivalId?: 'bon_om_touk' | 'chol_chnam_thmey' | 'pchum_ben' | null;
  },
  actor: string
): LiveGmEventState {
  currentGmEventState = {
    worldEventId:
      payload.worldEventId !== undefined ? payload.worldEventId : currentGmEventState.worldEventId,
    festivalId:
      payload.festivalId !== undefined ? payload.festivalId : currentGmEventState.festivalId,
    triggeredBy: actor,
    triggeredAt: Date.now(),
  };
  return { ...currentGmEventState };
}

export function getLiveGmEventState(): LiveGmEventState {
  return { ...currentGmEventState };
}

export async function getLiveServerStats(): Promise<{
  plazaPlayers: number;
  clubPlayers: number;
  dungeonPlayers: number;
  totalOnlinePlayers: number;
  activeRooms: { plaza: number; club: number; dungeon: number };
  economy: {
    activeMarketListings: number;
    activeKroms: number;
    activeTukTukCarts: number;
    leaderboardAccounts: number;
  };
  storageMode: string;
  uptimeSec: number;
  liveEventState: LiveGmEventState;
  recentAnnouncements: LiveGmAnnouncement[];
}> {
  const [plazaRooms, clubRooms, dungeonRooms, board, listings] = await Promise.all([
    matchMaker.query({ name: 'plaza' }).catch(() => []),
    matchMaker.query({ name: 'club' }).catch(() => []),
    matchMaker.query({ name: 'dungeon' }).catch(() => []),
    getTopTenLeaderboards().catch(() => ({ farmer: [], stylish: [], slayer: [], tower: [], boss_rush: [] })),
    listMarketListings().catch(() => []),
  ]);

  const sumClients = (rooms: Array<{ clients?: number }>) =>
    rooms.reduce((acc, r) => acc + (typeof r.clients === 'number' ? r.clients : 0), 0);

  const plazaPlayers = sumClients(plazaRooms);
  const clubPlayers = sumClients(clubRooms);
  const dungeonPlayers = sumClients(dungeonRooms);

  const kroms = listKroms();
  const carts = listTukTukCarts();

  return {
    plazaPlayers,
    clubPlayers,
    dungeonPlayers,
    totalOnlinePlayers: plazaPlayers + clubPlayers + dungeonPlayers,
    activeRooms: {
      plaza: plazaRooms.length,
      club: clubRooms.length,
      dungeon: dungeonRooms.length,
    },
    economy: {
      activeMarketListings: listings.length,
      activeKroms: kroms.length,
      activeTukTukCarts: carts.length,
      leaderboardAccounts: board.farmer.length,
    },
    storageMode: getStorageMode(),
    uptimeSec: Math.round(process.uptime()),
    liveEventState: getLiveGmEventState(),
    recentAnnouncements: getRecentGmAnnouncements().slice(0, 5),
  };
}
