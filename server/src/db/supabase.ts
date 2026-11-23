import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SavedPlayerProfile {
  name: string;
  level: number;
  xp: number;
  hp?: number;
  maxHp?: number;
  currencies: {
    coins: number;
    gold: number;
    diamonds: number;
  };
  lifeStats: Record<string, unknown>;
  loadout: Record<string, unknown>;
  skills: Record<string, unknown>;
  inventory: unknown[];
  farm: {
    plots: unknown[];
    trees: unknown[];
    livestock: unknown[];
    machines: unknown[];
  };
  activeBuffs?: unknown[];
  quickSnackSlots?: [string | null, string | null, string | null];
  clearedBosses?: string[];
  activeClass?: string;
  weapon?: Record<string, unknown>;
  defense?: number;
  areaChannel?: number;
}

export interface FriendItem {
  friendshipId: string;
  playerId: string;
  username: string;
  level: number;
  stylish: number;
  status: 'pending' | 'accepted';
  direction: 'accepted' | 'incoming' | 'outgoing';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  playerId: string;
  username: string;
  profile: SavedPlayerProfile | null;
  storageMode: 'supabase' | 'local_json';
}

interface LocalPlayerRow {
  id: string;
  username: string;
  password_hash: string;
  coins: number;
  gold: number;
  diamonds: number;
  level: number;
  xp: number;
  life_stats: Record<string, unknown>;
  appearance: Record<string, unknown>;
  skills: Record<string, unknown>;
  meta_json: Record<string, unknown>;
  inventory_json: unknown[];
  equipped_json: Record<string, unknown>;
  plots_json: unknown[];
  trees_json: unknown[];
  livestock_json: unknown[];
  machines_json: unknown[];
  updated_at: string;
}

interface LocalFriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

interface LocalDbSchema {
  players: LocalPlayerRow[];
  friendships: LocalFriendshipRow[];
}

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const AUTH_SECRET = (process.env.AUTH_SECRET || 'phum-khnhom-local-dev-secret').trim();
const LOCAL_DB_PATH = path.resolve(__dirname, '../../data/local_db.json');

let supabaseClient: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getStorageMode(): 'supabase' | 'local_json' {
  return supabaseClient ? 'supabase' : 'local_json';
}

// ==================== CRYPTO & AUTH TOKENS ====================

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function createAuthToken(playerId: string, username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ playerId, username, iat: Date.now() }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string | undefined): { playerId: string; username: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      playerId?: string;
      username?: string;
    };
    if (!decoded.playerId || !decoded.username) return null;
    return { playerId: decoded.playerId, username: decoded.username };
  } catch {
    return null;
  }
}

export function validateUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length < 3 || clean.length > 20) return null;
  return clean;
}

export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.length < 4 || raw.length > 64) return null;
  return raw;
}

// ==================== LOCAL JSON STORAGE FALLBACK ====================

function readLocalDb(): LocalDbSchema {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      return { players: [], friendships: [] };
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDbSchema>;
    return {
      players: Array.isArray(parsed.players) ? parsed.players : [],
      friendships: Array.isArray(parsed.friendships) ? parsed.friendships : [],
    };
  } catch {
    return { players: [], friendships: [] };
  }
}

function writeLocalDb(db: LocalDbSchema): void {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function rowToSavedProfile(row: {
  username: string;
  coins: number;
  gold: number;
  diamonds: number;
  level: number;
  xp: number;
  life_stats: Record<string, unknown>;
  appearance: Record<string, unknown>;
  skills: Record<string, unknown>;
  meta_json?: Record<string, unknown>;
  inventory_json: unknown[];
  equipped_json: Record<string, unknown>;
  plots_json: unknown[];
  trees_json: unknown[];
  livestock_json: unknown[];
  machines_json: unknown[];
}): SavedPlayerProfile | null {
  const loadout =
    row.equipped_json && Object.keys(row.equipped_json).length > 0
      ? row.equipped_json
      : row.appearance;

  if (!loadout || Object.keys(loadout).length === 0) {
    return null;
  }

  const meta = row.meta_json || {};
  return {
    name: row.username,
    level: row.level ?? 1,
    xp: row.xp ?? 0,
    hp: typeof meta.hp === 'number' ? meta.hp : undefined,
    maxHp: typeof meta.maxHp === 'number' ? meta.maxHp : undefined,
    currencies: {
      coins: row.coins ?? 2500,
      gold: row.gold ?? 10,
      diamonds: row.diamonds ?? 50,
    },
    lifeStats: row.life_stats || {},
    loadout,
    skills: row.skills || {},
    inventory: Array.isArray(row.inventory_json) ? row.inventory_json : [],
    farm: {
      plots: Array.isArray(row.plots_json) ? row.plots_json : [],
      trees: Array.isArray(row.trees_json) ? row.trees_json : [],
      livestock: Array.isArray(row.livestock_json) ? row.livestock_json : [],
      machines: Array.isArray(row.machines_json) ? row.machines_json : [],
    },
    activeBuffs: Array.isArray(meta.activeBuffs) ? meta.activeBuffs : [],
    quickSnackSlots: Array.isArray(meta.quickSnackSlots)
      ? (meta.quickSnackSlots as [string | null, string | null, string | null])
      : undefined,
    clearedBosses: Array.isArray(meta.clearedBosses) ? (meta.clearedBosses as string[]) : [],
    activeClass: typeof meta.activeClass === 'string' ? meta.activeClass : undefined,
    weapon: typeof meta.weapon === 'object' && meta.weapon ? (meta.weapon as Record<string, unknown>) : undefined,
    defense: typeof meta.defense === 'number' ? meta.defense : undefined,
    areaChannel: typeof meta.areaChannel === 'number' ? meta.areaChannel : 0,
  };
}

// ==================== REPOSITORY OPERATIONS ====================

export async function registerPlayer(
  rawUsername: unknown,
  rawPassword: unknown,
  starterProfile?: SavedPlayerProfile
): Promise<{ ok: true; data: AuthResponse } | { ok: false; error: string }> {
  const username = validateUsername(rawUsername);
  if (!username) {
    return { ok: false, error: 'Username must be 3–20 characters.' };
  }
  const password = validatePassword(rawPassword);
  if (!password) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const passwordHash = hashPassword(password);
  const nowIso = new Date().toISOString();
  const coins = starterProfile?.currencies?.coins ?? 2500;
  const gold = starterProfile?.currencies?.gold ?? 10;
  const diamonds = starterProfile?.currencies?.diamonds ?? 50;
  const level = starterProfile?.level ?? 1;
  const xp = starterProfile?.xp ?? 0;
  const lifeStats = starterProfile?.lifeStats ?? {};
  const loadout = starterProfile?.loadout ?? {};
  const skills = starterProfile?.skills ?? {};
  const inventory = starterProfile?.inventory ?? [];
  const farm = starterProfile?.farm ?? { plots: [], trees: [], livestock: [], machines: [] };
  const metaJson = {
    hp: starterProfile?.hp,
    maxHp: starterProfile?.maxHp,
    activeBuffs: starterProfile?.activeBuffs ?? [],
    quickSnackSlots: starterProfile?.quickSnackSlots,
    clearedBosses: starterProfile?.clearedBosses ?? [],
    activeClass: starterProfile?.activeClass,
    weapon: starterProfile?.weapon,
    defense: starterProfile?.defense,
    areaChannel: starterProfile?.areaChannel ?? 0,
  };

  if (supabaseClient) {
    const { data: existing } = await supabaseClient
      .from('players')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: 'That username is already taken.' };
    }

    const id = crypto.randomUUID();
    const { error: pErr } = await supabaseClient.from('players').insert({
      id,
      username,
      password_hash: passwordHash,
      coins,
      gold,
      diamonds,
      level,
      xp,
      life_stats: lifeStats,
      appearance: loadout,
      skills,
      meta_json: metaJson,
      updated_at: nowIso,
    });
    if (pErr) {
      return { ok: false, error: pErr.message };
    }

    await supabaseClient.from('player_inventory').upsert({
      player_id: id,
      inventory_json: inventory,
      equipped_json: loadout,
      updated_at: nowIso,
    });
    await supabaseClient.from('player_farm').upsert({
      player_id: id,
      plots_json: farm.plots,
      trees_json: farm.trees,
      livestock_json: farm.livestock,
      machines_json: farm.machines,
      updated_at: nowIso,
    });

    const token = createAuthToken(id, username);
    return {
      ok: true,
      data: {
        token,
        playerId: id,
        username,
        profile: starterProfile ? { ...starterProfile, name: username } : null,
        storageMode: 'supabase',
      },
    };
  }

  // Local JSON fallback
  const db = readLocalDb();
  if (db.players.some((p) => p.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: 'That username is already taken.' };
  }

  const id = crypto.randomUUID();
  const row: LocalPlayerRow = {
    id,
    username,
    password_hash: passwordHash,
    coins,
    gold,
    diamonds,
    level,
    xp,
    life_stats: lifeStats,
    appearance: loadout,
    skills,
    meta_json: metaJson,
    inventory_json: inventory,
    equipped_json: loadout,
    plots_json: farm.plots,
    trees_json: farm.trees,
    livestock_json: farm.livestock,
    machines_json: farm.machines,
    updated_at: nowIso,
  };
  db.players.push(row);
  writeLocalDb(db);

  const token = createAuthToken(id, username);
  return {
    ok: true,
    data: {
      token,
      playerId: id,
      username,
      profile: rowToSavedProfile(row),
      storageMode: 'local_json',
    },
  };
}

export async function loginPlayer(
  rawUsername: unknown,
  rawPassword: unknown
): Promise<{ ok: true; data: AuthResponse } | { ok: false; error: string }> {
  const username = validateUsername(rawUsername);
  const password = validatePassword(rawPassword);
  if (!username || !password) {
    return { ok: false, error: 'Enter a valid username and password.' };
  }

  if (supabaseClient) {
    const { data: player, error } = await supabaseClient
      .from('players')
      .select('*')
      .ilike('username', username)
      .maybeSingle();
    if (error || !player) {
      return { ok: false, error: 'Account not found. Check username or create an account.' };
    }
    if (!verifyPassword(password, player.password_hash)) {
      return { ok: false, error: 'Incorrect password.' };
    }

    const [{ data: inv }, { data: farm }] = await Promise.all([
      supabaseClient.from('player_inventory').select('*').eq('player_id', player.id).maybeSingle(),
      supabaseClient.from('player_farm').select('*').eq('player_id', player.id).maybeSingle(),
    ]);

    const profile = rowToSavedProfile({
      username: player.username,
      coins: player.coins,
      gold: player.gold,
      diamonds: player.diamonds,
      level: player.level,
      xp: player.xp,
      life_stats: player.life_stats || {},
      appearance: player.appearance || {},
      skills: player.skills || {},
      meta_json: player.meta_json || {},
      inventory_json: inv?.inventory_json || [],
      equipped_json: inv?.equipped_json || player.appearance || {},
      plots_json: farm?.plots_json || [],
      trees_json: farm?.trees_json || [],
      livestock_json: farm?.livestock_json || [],
      machines_json: farm?.machines_json || [],
    });

    const token = createAuthToken(player.id, player.username);
    return {
      ok: true,
      data: {
        token,
        playerId: player.id,
        username: player.username,
        profile,
        storageMode: 'supabase',
      },
    };
  }

  const db = readLocalDb();
  const row = db.players.find((p) => p.username.toLowerCase() === username.toLowerCase());
  if (!row) {
    return { ok: false, error: 'Account not found. Check username or create an account.' };
  }
  if (!verifyPassword(password, row.password_hash)) {
    return { ok: false, error: 'Incorrect password.' };
  }

  const token = createAuthToken(row.id, row.username);
  return {
    ok: true,
    data: {
      token,
      playerId: row.id,
      username: row.username,
      profile: rowToSavedProfile(row),
      storageMode: 'local_json',
    },
  };
}

export async function savePlayerProfile(
  playerId: string,
  profile: SavedPlayerProfile
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const nowIso = new Date().toISOString();
  const coins = Math.max(0, Math.floor(profile.currencies?.coins ?? 0));
  const gold = Math.max(0, Math.floor(profile.currencies?.gold ?? 0));
  const diamonds = Math.max(0, Math.floor(profile.currencies?.diamonds ?? 0));
  const level = Math.max(1, Math.floor(profile.level ?? 1));
  const xp = Math.max(0, Math.floor(profile.xp ?? 0));
  const metaJson = {
    hp: profile.hp,
    maxHp: profile.maxHp,
    activeBuffs: profile.activeBuffs ?? [],
    quickSnackSlots: profile.quickSnackSlots,
    clearedBosses: profile.clearedBosses ?? [],
    activeClass: profile.activeClass,
    weapon: profile.weapon,
    defense: profile.defense,
    areaChannel: profile.areaChannel ?? 0,
  };

  if (supabaseClient) {
    const { error: pErr } = await supabaseClient
      .from('players')
      .update({
        coins,
        gold,
        diamonds,
        level,
        xp,
        life_stats: profile.lifeStats ?? {},
        appearance: profile.loadout ?? {},
        skills: profile.skills ?? {},
        meta_json: metaJson,
        updated_at: nowIso,
      })
      .eq('id', playerId);
    if (pErr) return { ok: false, error: pErr.message };

    await Promise.all([
      supabaseClient.from('player_inventory').upsert({
        player_id: playerId,
        inventory_json: profile.inventory ?? [],
        equipped_json: profile.loadout ?? {},
        updated_at: nowIso,
      }),
      supabaseClient.from('player_farm').upsert({
        player_id: playerId,
        plots_json: profile.farm?.plots ?? [],
        trees_json: profile.farm?.trees ?? [],
        livestock_json: profile.farm?.livestock ?? [],
        machines_json: profile.farm?.machines ?? [],
        updated_at: nowIso,
      }),
    ]);

    return { ok: true, savedAt: nowIso };
  }

  const db = readLocalDb();
  const row = db.players.find((p) => p.id === playerId);
  if (!row) {
    return { ok: false, error: 'Player account not found.' };
  }
  row.coins = coins;
  row.gold = gold;
  row.diamonds = diamonds;
  row.level = level;
  row.xp = xp;
  row.life_stats = profile.lifeStats ?? {};
  row.appearance = profile.loadout ?? {};
  row.skills = profile.skills ?? {};
  row.meta_json = metaJson;
  row.inventory_json = profile.inventory ?? [];
  row.equipped_json = profile.loadout ?? {};
  row.plots_json = profile.farm?.plots ?? [];
  row.trees_json = profile.farm?.trees ?? [];
  row.livestock_json = profile.farm?.livestock ?? [];
  row.machines_json = profile.farm?.machines ?? [];
  row.updated_at = nowIso;
  writeLocalDb(db);

  return { ok: true, savedAt: nowIso };
}

// ==================== FRIENDSHIPS ====================

export async function listFriends(playerId: string): Promise<{
  accepted: FriendItem[];
  incoming: FriendItem[];
  outgoing: FriendItem[];
}> {
  if (supabaseClient) {
    const { data: rows } = await supabaseClient
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${playerId},addressee_id.eq.${playerId}`);

    const list = rows ?? [];
    const otherIds = Array.from(
      new Set(list.map((r) => (r.requester_id === playerId ? r.addressee_id : r.requester_id)))
    );
    const { data: players } = otherIds.length
      ? await supabaseClient.from('players').select('id, username, level, life_stats').in('id', otherIds)
      : { data: [] };

    const pMap = new Map(
      (players ?? []).map((p) => [
        p.id,
        {
          username: p.username as string,
          level: (p.level as number) ?? 1,
          stylish: Number((p.life_stats as { stylish?: number } | null)?.stylish ?? 0),
        },
      ])
    );

    const accepted: FriendItem[] = [];
    const incoming: FriendItem[] = [];
    const outgoing: FriendItem[] = [];

    for (const r of list) {
      const otherId = r.requester_id === playerId ? r.addressee_id : r.requester_id;
      const info = pMap.get(otherId);
      if (!info) continue;
      const item: FriendItem = {
        friendshipId: r.id,
        playerId: otherId,
        username: info.username,
        level: info.level,
        stylish: info.stylish,
        status: r.status,
        direction:
          r.status === 'accepted'
            ? 'accepted'
            : r.addressee_id === playerId
            ? 'incoming'
            : 'outgoing',
        createdAt: r.created_at,
      };
      if (item.direction === 'accepted') accepted.push(item);
      else if (item.direction === 'incoming') incoming.push(item);
      else outgoing.push(item);
    }

    return { accepted, incoming, outgoing };
  }

  const db = readLocalDb();
  const pMap = new Map(db.players.map((p) => [p.id, p]));
  const accepted: FriendItem[] = [];
  const incoming: FriendItem[] = [];
  const outgoing: FriendItem[] = [];

  for (const r of db.friendships) {
    if (r.requester_id !== playerId && r.addressee_id !== playerId) continue;
    const otherId = r.requester_id === playerId ? r.addressee_id : r.requester_id;
    const other = pMap.get(otherId);
    if (!other) continue;
    const item: FriendItem = {
      friendshipId: r.id,
      playerId: otherId,
      username: other.username,
      level: other.level ?? 1,
      stylish: Number((other.life_stats as { stylish?: number } | null)?.stylish ?? 0),
      status: r.status,
      direction:
        r.status === 'accepted'
          ? 'accepted'
          : r.addressee_id === playerId
          ? 'incoming'
          : 'outgoing',
      createdAt: r.created_at,
    };
    if (item.direction === 'accepted') accepted.push(item);
    else if (item.direction === 'incoming') incoming.push(item);
    else outgoing.push(item);
  }

  return { accepted, incoming, outgoing };
}

export async function createFriendRequest(
  requesterId: string,
  target: { targetPlayerId?: string; targetUsername?: string }
): Promise<
  | { ok: true; status: 'pending' | 'accepted'; friendshipId: string; targetPlayerId: string; targetUsername: string }
  | { ok: false; error: string }
> {
  if (supabaseClient) {
    const query = target.targetPlayerId
      ? supabaseClient.from('players').select('id, username').eq('id', target.targetPlayerId).maybeSingle()
      : supabaseClient
          .from('players')
          .select('id, username')
          .ilike('username', (target.targetUsername || '').trim())
          .maybeSingle();

    const { data: targetPlayer } = await query;
    if (!targetPlayer) {
      return { ok: false, error: 'Target player does not have a registered account yet.' };
    }
    if (targetPlayer.id === requesterId) {
      return { ok: false, error: 'You cannot add yourself as a friend.' };
    }

    const { data: existingRows } = await supabaseClient
      .from('friendships')
      .select('*')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${targetPlayer.id}),and(requester_id.eq.${targetPlayer.id},addressee_id.eq.${requesterId})`
      );

    const existing = existingRows?.[0];
    if (existing) {
      if (existing.status === 'accepted') {
        return { ok: false, error: `You are already friends with ${targetPlayer.username}!` };
      }
      if (existing.requester_id === targetPlayer.id) {
        // Reverse pending request exists -> auto-accept!
        await supabaseClient.from('friendships').update({ status: 'accepted' }).eq('id', existing.id);
        return {
          ok: true,
          status: 'accepted',
          friendshipId: existing.id,
          targetPlayerId: targetPlayer.id,
          targetUsername: targetPlayer.username,
        };
      }
      return { ok: false, error: `Friend request already sent to ${targetPlayer.username}.` };
    }

    const id = crypto.randomUUID();
    const { error } = await supabaseClient.from('friendships').insert({
      id,
      requester_id: requesterId,
      addressee_id: targetPlayer.id,
      status: 'pending',
    });
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      status: 'pending',
      friendshipId: id,
      targetPlayerId: targetPlayer.id,
      targetUsername: targetPlayer.username,
    };
  }

  // Local JSON fallback
  const db = readLocalDb();
  const targetPlayer = target.targetPlayerId
    ? db.players.find((p) => p.id === target.targetPlayerId)
    : db.players.find(
        (p) => p.username.toLowerCase() === (target.targetUsername || '').trim().toLowerCase()
      );

  if (!targetPlayer) {
    return { ok: false, error: 'Target player does not have a registered account yet.' };
  }
  if (targetPlayer.id === requesterId) {
    return { ok: false, error: 'You cannot add yourself as a friend.' };
  }

  const existing = db.friendships.find(
    (f) =>
      (f.requester_id === requesterId && f.addressee_id === targetPlayer.id) ||
      (f.requester_id === targetPlayer.id && f.addressee_id === requesterId)
  );
  if (existing) {
    if (existing.status === 'accepted') {
      return { ok: false, error: `You are already friends with ${targetPlayer.username}!` };
    }
    if (existing.requester_id === targetPlayer.id) {
      existing.status = 'accepted';
      writeLocalDb(db);
      return {
        ok: true,
        status: 'accepted',
        friendshipId: existing.id,
        targetPlayerId: targetPlayer.id,
        targetUsername: targetPlayer.username,
      };
    }
    return { ok: false, error: `Friend request already sent to ${targetPlayer.username}.` };
  }

  const id = crypto.randomUUID();
  db.friendships.push({
    id,
    requester_id: requesterId,
    addressee_id: targetPlayer.id,
    status: 'pending',
    created_at: new Date().toISOString(),
  });
  writeLocalDb(db);

  return {
    ok: true,
    status: 'pending',
    friendshipId: id,
    targetPlayerId: targetPlayer.id,
    targetUsername: targetPlayer.username,
  };
}

export async function respondFriendRequest(
  playerId: string,
  friendshipId: string,
  action: 'accept' | 'decline'
): Promise<{ ok: true; requesterId: string } | { ok: false; error: string }> {
  if (supabaseClient) {
    const { data: row } = await supabaseClient
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .maybeSingle();
    if (!row || row.addressee_id !== playerId) {
      return { ok: false, error: 'Friend request not found.' };
    }
    if (action === 'accept') {
      await supabaseClient.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    } else {
      await supabaseClient.from('friendships').delete().eq('id', friendshipId);
    }
    return { ok: true, requesterId: row.requester_id };
  }

  const db = readLocalDb();
  const idx = db.friendships.findIndex((f) => f.id === friendshipId && f.addressee_id === playerId);
  if (idx < 0) return { ok: false, error: 'Friend request not found.' };
  const requesterId = db.friendships[idx].requester_id;
  if (action === 'accept') {
    db.friendships[idx].status = 'accepted';
  } else {
    db.friendships.splice(idx, 1);
  }
  writeLocalDb(db);
  return { ok: true, requesterId };
}
