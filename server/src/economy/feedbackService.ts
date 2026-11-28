import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '../db/supabase';

export type FeedbackCategory = 'bug' | 'idea' | 'balance' | 'other';

export interface FeedbackReportRecord {
  id: string;
  playerId: string;
  username: string;
  category: FeedbackCategory;
  title: string;
  message: string;
  mapId?: string;
  appVersion: string;
  createdAt: string;
}

const DATA_FILE = path.resolve(__dirname, '../../data/player_feedback.json');

function readLocalFeedback(): FeedbackReportRecord[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? (parsed as FeedbackReportRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFeedback(list: FeedbackReportRecord[]): void {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(list.slice(0, 200), null, 2), 'utf8');
  } catch (err) {
    console.warn('[FeedbackService] Failed to persist player_feedback.json:', err);
  }
}

export async function submitFeedbackReport(input: {
  playerId?: string;
  username?: string;
  category?: string;
  title?: string;
  message?: string;
  mapId?: string;
  appVersion?: string;
}): Promise<{ ok: true; report: FeedbackReportRecord } | { ok: false; error: string }> {
  const title = (input.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const message = (input.message ?? '').trim().slice(0, 800);
  if (title.length < 3) {
    return { ok: false, error: 'Please enter a short title (at least 3 characters).' };
  }
  if (message.length < 5) {
    return { ok: false, error: 'Please describe the bug or feedback (at least 5 characters).' };
  }

  const category: FeedbackCategory =
    input.category === 'bug' ||
    input.category === 'idea' ||
    input.category === 'balance'
      ? input.category
      : 'other';

  const report: FeedbackReportRecord = {
    id: crypto.randomUUID(),
    playerId: (input.playerId || 'guest').slice(0, 64),
    username: (input.username || 'PhumVillager').replace(/\s+/g, ' ').trim().slice(0, 28),
    category,
    title,
    message,
    mapId: typeof input.mapId === 'string' ? input.mapId.slice(0, 40) : undefined,
    appVersion: (input.appVersion || '3.0.0').slice(0, 20),
    createdAt: new Date().toISOString(),
  };

  // Best-effort write to Supabase table if configured; always persist locally too
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from('player_feedback').insert({
        id: report.id,
        player_id: report.playerId,
        username: report.username,
        category: report.category,
        title: report.title,
        message: report.message,
        map_id: report.mapId ?? null,
        app_version: report.appVersion,
        created_at: report.createdAt,
      });
    } catch {
      // Fallback to local JSON log seamlessly
    }
  }

  const list = readLocalFeedback();
  list.unshift(report);
  writeLocalFeedback(list);
  return { ok: true, report };
}

export async function listFeedbackReports(limit = 50): Promise<FeedbackReportRecord[]> {
  const max = Math.max(1, Math.min(100, Math.floor(limit)));
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('player_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(max);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          playerId: r.player_id,
          username: r.username,
          category: r.category,
          title: r.title,
          message: r.message,
          mapId: r.map_id ?? undefined,
          appVersion: r.app_version ?? '3.0.0',
          createdAt: r.created_at,
        }));
      }
    } catch {
      // fallback below
    }
  }
  return readLocalFeedback().slice(0, max);
}
