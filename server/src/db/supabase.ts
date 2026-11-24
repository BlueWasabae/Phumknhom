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
  bossDefeats?: Record<string, number>;
  pagodaBundles?: Record<string, string[]>;
  luckyWheelPity?: number;
  villagePassUntil?: number | null;
  extraBagSlots?: number;
  ownedMounts?: string[];
  activeMount?: string | null;
  dailyFreeCoinSpinDate?: string | null;
  lastShrinePrayerDate?: string | null;
  cityServer?: string;
  activeBiome?: string;
  discoveredBiomes?: string[];
  unlockedPylons?: string[];
  bankCoins?: number;
  weaponPrefix?: string | null;
  armorPrefix?: string | null;
  shimmerBlessings?: string[];
  npcFriendships?: Record<string, { hearts: number; lastGiftDay: string | null; claimedRewards?: number[] }>;
  houseDecor?: Array<{ uid: string; itemId: string; x: number; y: number; rotation?: number }>;
  ownedFurniture?: Record<string, number>;
  highestTowerFloor?: number;
  unlockedWeaponAuras?: string[];
  museumDonations?: string[];
  kromId?: string | null;
  kromTag?: string | null;
  kromName?: string | null;
  kromLevel?: number;
  pchumBenBlessingUntil?: number | null;
  festivalSplashCount?: number;
  hasCompletedCreation?: boolean;
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
  email?: string | null;
  isNewAccount?: boolean;
  profile: SavedPlayerProfile | null;
  storageMode: 'supabase' | 'local_json';
}

interface LocalPlayerRow {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
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

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

export async function creditPlayerCoins(playerId: string, deltaCoins: number): Promise<void> {
  const gain = Math.max(0, Math.floor(deltaCoins));
  if (gain <= 0) return;

  if (supabaseClient) {
    const { data } = await supabaseClient
      .from('players')
      .select('coins')
      .eq('id', playerId)
      .maybeSingle();
    if (data && typeof data.coins === 'number') {
      await supabaseClient
        .from('players')
        .update({ coins: data.coins + gain, updated_at: new Date().toISOString() })
        .eq('id', playerId);
    }
    return;
  }

  const db = readLocalDb();
  const row = db.players.find((p) => p.id === playerId);
  if (row) {
    row.coins = (row.coins ?? 0) + gain;
    row.updated_at = new Date().toISOString();
    writeLocalDb(db);
  }
}

export async function creditPlayerDiamonds(
  playerId: string,
  deltaDiamonds: number,
  activateVillagePassDays = 0
): Promise<{ ok: boolean; newDiamonds?: number; villagePassUntil?: number | null }> {
  const gain = Math.max(0, Math.floor(deltaDiamonds));
  const now = Date.now();
  const passDurationMs = activateVillagePassDays > 0 ? activateVillagePassDays * 24 * 60 * 60 * 1000 : 0;

  if (supabaseClient) {
    const { data } = await supabaseClient
      .from('players')
      .select('diamonds, meta_json')
      .eq('id', playerId)
      .maybeSingle();
    if (!data) return { ok: false };
    const nextDiamonds = (typeof data.diamonds === 'number' ? data.diamonds : 0) + gain;
    const meta = (data.meta_json && typeof data.meta_json === 'object' ? data.meta_json : {}) as Record<string, unknown>;
    const existingUntil = typeof meta.villagePassUntil === 'number' ? meta.villagePassUntil : 0;
    const nextUntil =
      passDurationMs > 0 ? Math.max(now, existingUntil) + passDurationMs : existingUntil || null;

    await supabaseClient
      .from('players')
      .update({
        diamonds: nextDiamonds,
        meta_json: { ...meta, villagePassUntil: nextUntil },
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    return { ok: true, newDiamonds: nextDiamonds, villagePassUntil: nextUntil };
  }

  const db = readLocalDb();
  const row = db.players.find((p) => p.id === playerId);
  if (!row) return { ok: false };

  row.diamonds = (row.diamonds ?? 0) + gain;
  const meta = row.meta_json && typeof row.meta_json === 'object' ? { ...row.meta_json } : {};
  const existingUntil = typeof meta.villagePassUntil === 'number' ? meta.villagePassUntil : 0;
  const nextUntil =
    passDurationMs > 0 ? Math.max(now, existingUntil) + passDurationMs : existingUntil || null;
  if (passDurationMs > 0) {
    meta.villagePassUntil = nextUntil;
  }
  row.meta_json = meta;
  row.updated_at = new Date().toISOString();
  writeLocalDb(db);
  return { ok: true, newDiamonds: row.diamonds, villagePassUntil: nextUntil };
}

export async function getPlayerBankBalances(
  playerId: string
): Promise<{ walletCoins: number; bankCoins: number } | null> {
  if (supabaseClient) {
    const { data } = await supabaseClient
      .from('players')
      .select('coins, meta_json')
      .eq('id', playerId)
      .maybeSingle();
    if (!data) return null;
    const meta = (data.meta_json && typeof data.meta_json === 'object' ? data.meta_json : {}) as Record<string, unknown>;
    return {
      walletCoins: typeof data.coins === 'number' ? data.coins : 0,
      bankCoins: typeof meta.bankCoins === 'number' ? meta.bankCoins : 0,
    };
  }
  const db = readLocalDb();
  const row = db.players.find((p) => p.id === playerId);
  if (!row) return null;
  return {
    walletCoins: row.coins ?? 0,
    bankCoins: typeof row.meta_json?.bankCoins === 'number' ? (row.meta_json.bankCoins as number) : 0,
  };
}

export async function updatePlayerBankCoins(
  playerId: string,
  walletCoins: number,
  bankCoins: number
): Promise<boolean> {
  const safeWallet = Math.max(0, Math.floor(walletCoins));
  const safeBank = Math.max(0, Math.floor(bankCoins));
  const nowIso = new Date().toISOString();

  if (supabaseClient) {
    const { data } = await supabaseClient
      .from('players')
      .select('meta_json')
      .eq('id', playerId)
      .maybeSingle();
    if (!data) return false;
    const meta = (data.meta_json && typeof data.meta_json === 'object' ? data.meta_json : {}) as Record<string, unknown>;
    await supabaseClient
      .from('players')
      .update({
        coins: safeWallet,
        meta_json: { ...meta, bankCoins: safeBank },
        updated_at: nowIso,
      })
      .eq('id', playerId);
    return true;
  }

  const db = readLocalDb();
  const row = db.players.find((p) => p.id === playerId);
  if (!row) return false;
  row.coins = safeWallet;
  row.meta_json = { ...(row.meta_json || {}), bankCoins: safeBank };
  row.updated_at = nowIso;
  writeLocalDb(db);
  return true;
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
    bossDefeats:
      typeof meta.bossDefeats === 'object' && meta.bossDefeats
        ? (meta.bossDefeats as Record<string, number>)
        : {},
    pagodaBundles:
      typeof meta.pagodaBundles === 'object' && meta.pagodaBundles
        ? (meta.pagodaBundles as Record<string, string[]>)
        : {},
    luckyWheelPity: typeof meta.luckyWheelPity === 'number' ? meta.luckyWheelPity : 0,
    villagePassUntil: typeof meta.villagePassUntil === 'number' ? meta.villagePassUntil : null,
    extraBagSlots: typeof meta.extraBagSlots === 'number' ? meta.extraBagSlots : 0,
    ownedMounts: Array.isArray(meta.ownedMounts) ? (meta.ownedMounts as string[]) : [],
    activeMount: typeof meta.activeMount === 'string' ? meta.activeMount : null,
    dailyFreeCoinSpinDate:
      typeof meta.dailyFreeCoinSpinDate === 'string' ? meta.dailyFreeCoinSpinDate : null,
    lastShrinePrayerDate:
      typeof meta.lastShrinePrayerDate === 'string' ? meta.lastShrinePrayerDate : null,
    cityServer: typeof meta.cityServer === 'string' ? meta.cityServer : 'phnom_penh',
    activeBiome: typeof meta.activeBiome === 'string' ? meta.activeBiome : 'emerald_rice_valley',
    discoveredBiomes: Array.isArray(meta.discoveredBiomes)
      ? (meta.discoveredBiomes as string[])
      : ['emerald_rice_valley'],
    unlockedPylons: Array.isArray(meta.unlockedPylons)
      ? (meta.unlockedPylons as string[])
      : ['emerald_rice_valley'],
    bankCoins: typeof meta.bankCoins === 'number' ? meta.bankCoins : 500,
    weaponPrefix: typeof meta.weaponPrefix === 'string' ? meta.weaponPrefix : 'keen',
    armorPrefix: typeof meta.armorPrefix === 'string' ? meta.armorPrefix : 'armored',
    shimmerBlessings: Array.isArray(meta.shimmerBlessings) ? (meta.shimmerBlessings as string[]) : [],
    npcFriendships:
      typeof meta.npcFriendships === 'object' && meta.npcFriendships
        ? (meta.npcFriendships as Record<string, { hearts: number; lastGiftDay: string | null; claimedRewards?: number[] }>)
        : {},
    houseDecor: Array.isArray(meta.houseDecor)
      ? (meta.houseDecor as Array<{ uid: string; itemId: string; x: number; y: number; rotation?: number }>)
      : undefined,
    ownedFurniture:
      typeof meta.ownedFurniture === 'object' && meta.ownedFurniture
        ? (meta.ownedFurniture as Record<string, number>)
        : undefined,
    highestTowerFloor: typeof meta.highestTowerFloor === 'number' ? meta.highestTowerFloor : 0,
    unlockedWeaponAuras: Array.isArray(meta.unlockedWeaponAuras)
      ? (meta.unlockedWeaponAuras as string[])
      : [],
    museumDonations: Array.isArray(meta.museumDonations)
      ? (meta.museumDonations as string[])
      : [],
    kromId: typeof meta.kromId === 'string' ? meta.kromId : null,
    kromTag: typeof meta.kromTag === 'string' ? meta.kromTag : null,
    kromName: typeof meta.kromName === 'string' ? meta.kromName : null,
    kromLevel: typeof meta.kromLevel === 'number' ? meta.kromLevel : 0,
    pchumBenBlessingUntil: typeof meta.pchumBenBlessingUntil === 'number' ? meta.pchumBenBlessingUntil : null,
    festivalSplashCount: typeof meta.festivalSplashCount === 'number' ? meta.festivalSplashCount : 0,
    hasCompletedCreation: Boolean(
      meta.hasCompletedCreation ??
        (loadout as { hasCompletedCreation?: boolean }).hasCompletedCreation ??
        false
    ),
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
  const loadout: Record<string, unknown> = {
    ...(starterProfile?.loadout ?? {}),
    pet: starterProfile?.loadout?.pet ?? null,
  };
  const skills = starterProfile?.skills ?? {};
  const inventory = starterProfile?.inventory ?? [];
  const farm = starterProfile?.farm ?? { plots: [], trees: [], livestock: [], machines: [] };
  const metaJson = {
    hp: starterProfile?.hp,
    maxHp: starterProfile?.maxHp,
    activeBuffs: starterProfile?.activeBuffs ?? [],
    quickSnackSlots: starterProfile?.quickSnackSlots,
    clearedBosses: starterProfile?.clearedBosses ?? [],
    bossDefeats: starterProfile?.bossDefeats ?? {},
    pagodaBundles: starterProfile?.pagodaBundles ?? {},
    luckyWheelPity: starterProfile?.luckyWheelPity ?? 0,
    villagePassUntil: starterProfile?.villagePassUntil ?? null,
    extraBagSlots: starterProfile?.extraBagSlots ?? 0,
    ownedMounts: starterProfile?.ownedMounts ?? [],
    activeMount: starterProfile?.activeMount ?? null,
    dailyFreeCoinSpinDate: starterProfile?.dailyFreeCoinSpinDate ?? null,
    lastShrinePrayerDate: starterProfile?.lastShrinePrayerDate ?? null,
    cityServer: starterProfile?.cityServer ?? 'phnom_penh',
    activeBiome: starterProfile?.activeBiome ?? 'emerald_rice_valley',
    discoveredBiomes: starterProfile?.discoveredBiomes ?? ['emerald_rice_valley'],
    unlockedPylons: starterProfile?.unlockedPylons ?? ['emerald_rice_valley'],
    bankCoins: starterProfile?.bankCoins ?? 500,
    weaponPrefix: starterProfile?.weaponPrefix ?? 'keen',
    armorPrefix: starterProfile?.armorPrefix ?? 'armored',
    shimmerBlessings: starterProfile?.shimmerBlessings ?? [],
    highestTowerFloor: starterProfile?.highestTowerFloor ?? 0,
    unlockedWeaponAuras: starterProfile?.unlockedWeaponAuras ?? [],
    museumDonations: starterProfile?.museumDonations ?? [],
    kromId: starterProfile?.kromId ?? null,
    kromTag: starterProfile?.kromTag ?? null,
    kromName: starterProfile?.kromName ?? null,
    kromLevel: starterProfile?.kromLevel ?? 0,
    pchumBenBlessingUntil: starterProfile?.pchumBenBlessingUntil ?? null,
    festivalSplashCount: starterProfile?.festivalSplashCount ?? 0,
    hasCompletedCreation: Boolean(starterProfile?.hasCompletedCreation ?? false),
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
    bossDefeats: profile.bossDefeats ?? {},
    pagodaBundles: profile.pagodaBundles ?? {},
    luckyWheelPity: profile.luckyWheelPity ?? 0,
    villagePassUntil: profile.villagePassUntil ?? null,
    extraBagSlots: profile.extraBagSlots ?? 0,
    ownedMounts: profile.ownedMounts ?? [],
    activeMount: profile.activeMount ?? null,
    dailyFreeCoinSpinDate: profile.dailyFreeCoinSpinDate ?? null,
    lastShrinePrayerDate: profile.lastShrinePrayerDate ?? null,
    cityServer: profile.cityServer ?? 'phnom_penh',
    activeBiome: profile.activeBiome ?? 'emerald_rice_valley',
    discoveredBiomes: profile.discoveredBiomes ?? ['emerald_rice_valley'],
    unlockedPylons: profile.unlockedPylons ?? ['emerald_rice_valley'],
    bankCoins: profile.bankCoins ?? 500,
    weaponPrefix: profile.weaponPrefix ?? 'keen',
    armorPrefix: profile.armorPrefix ?? 'armored',
    shimmerBlessings: profile.shimmerBlessings ?? [],
    npcFriendships: profile.npcFriendships ?? {},
    houseDecor: profile.houseDecor,
    ownedFurniture: profile.ownedFurniture,
    highestTowerFloor: typeof profile.highestTowerFloor === 'number' ? profile.highestTowerFloor : 0,
    unlockedWeaponAuras: Array.isArray(profile.unlockedWeaponAuras) ? profile.unlockedWeaponAuras : [],
    museumDonations: Array.isArray(profile.museumDonations) ? profile.museumDonations : [],
    kromId: typeof profile.kromId === 'string' ? profile.kromId : null,
    kromTag: typeof profile.kromTag === 'string' ? profile.kromTag : null,
    kromName: typeof profile.kromName === 'string' ? profile.kromName : null,
    kromLevel: typeof profile.kromLevel === 'number' ? profile.kromLevel : 0,
    pchumBenBlessingUntil:
      typeof profile.pchumBenBlessingUntil === 'number' ? profile.pchumBenBlessingUntil : null,
    festivalSplashCount: typeof profile.festivalSplashCount === 'number' ? profile.festivalSplashCount : 0,
    hasCompletedCreation: Boolean(
      profile.hasCompletedCreation ??
        (profile.loadout as { hasCompletedCreation?: boolean } | undefined)?.hasCompletedCreation ??
        false
    ),
    activeClass: profile.activeClass,
    weapon: profile.weapon,
    defense: profile.defense,
    areaChannel: profile.areaChannel ?? 0,
  };

  if (supabaseClient) {
    const updateFields: Record<string, unknown> = {
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
    };
    const nextName = validateUsername(profile.name);
    if (nextName) {
      const { data: clash } = await supabaseClient
        .from('players')
        .select('id')
        .ilike('username', nextName)
        .neq('id', playerId)
        .maybeSingle();
      if (!clash) {
        updateFields.username = nextName;
      }
    }
    const { error: pErr } = await supabaseClient
      .from('players')
      .update(updateFields)
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
  const nextName = validateUsername(profile.name);
  if (
    nextName &&
    !db.players.some((p) => p.id !== playerId && p.username.toLowerCase() === nextName.toLowerCase())
  ) {
    row.username = nextName;
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

function buildDefaultGoogleUsername(email: string | null, fullName?: unknown): string {
  const rawBase =
    typeof fullName === 'string' && fullName.trim().length >= 3
      ? fullName.trim()
      : email
      ? email.split('@')[0]
      : 'PhumHero';
  const cleaned = rawBase.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_').slice(0, 14);
  return cleaned.length >= 3 ? cleaned : `PhumHero_${Math.floor(100 + Math.random() * 899)}`;
}

/**
 * Verifies a Supabase Google OAuth access token via `supabase.auth.getUser(accessToken)`,
 * looks up the player by `auth_user_id` (or creates a fresh starter profile with
 * `hasCompletedCreation: false` and `pet: null`), and returns a game session + cloud save.
 */
export async function syncGooglePlayer(
  rawAccessToken: unknown,
  starterProfile?: SavedPlayerProfile
): Promise<{ ok: true; data: AuthResponse } | { ok: false; status: number; error: string }> {
  const accessToken = typeof rawAccessToken === 'string' ? rawAccessToken.trim() : '';
  if (!accessToken) {
    return { ok: false, status: 400, error: 'Missing Supabase Google access token.' };
  }

  if (!supabaseClient) {
    return {
      ok: false,
      status: 503,
      error: 'Google OAuth sync requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.',
    };
  }

  const { data: userData, error: userErr } = await supabaseClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return {
      ok: false,
      status: 401,
      error: userErr?.message || 'Invalid or expired Google session token.',
    };
  }

  const authUser = userData.user;
  const authUserId = authUser.id;
  const email = authUser.email ? authUser.email.trim().toLowerCase() : null;

  // 1. Look up existing player by auth_user_id (or matching email)
  let { data: existingPlayer } = await supabaseClient
    .from('players')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!existingPlayer && email) {
    const byEmail = await supabaseClient
      .from('players')
      .select('*')
      .ilike('email', email)
      .maybeSingle();
    if (byEmail.data) {
      existingPlayer = byEmail.data;
      await supabaseClient
        .from('players')
        .update({ auth_user_id: authUserId, email })
        .eq('id', existingPlayer.id);
    }
  }

  if (existingPlayer) {
    const [{ data: invRow }, { data: farmRow }] = await Promise.all([
      supabaseClient.from('player_inventory').select('*').eq('player_id', existingPlayer.id).maybeSingle(),
      supabaseClient.from('player_farm').select('*').eq('player_id', existingPlayer.id).maybeSingle(),
    ]);

    const saved = rowToSavedProfile({
      username: existingPlayer.username,
      coins: existingPlayer.coins,
      gold: existingPlayer.gold,
      diamonds: existingPlayer.diamonds,
      level: existingPlayer.level,
      xp: existingPlayer.xp,
      life_stats: existingPlayer.life_stats ?? {},
      appearance: existingPlayer.appearance ?? {},
      skills: existingPlayer.skills ?? {},
      meta_json: existingPlayer.meta_json ?? {},
      inventory_json: invRow?.inventory_json ?? [],
      equipped_json: invRow?.equipped_json ?? existingPlayer.appearance ?? {},
      plots_json: farmRow?.plots_json ?? [],
      trees_json: farmRow?.trees_json ?? [],
      livestock_json: farmRow?.livestock_json ?? [],
      machines_json: farmRow?.machines_json ?? [],
    });

    const token = createAuthToken(existingPlayer.id, existingPlayer.username);
    return {
      ok: true,
      data: {
        token,
        playerId: existingPlayer.id,
        username: existingPlayer.username,
        email: existingPlayer.email ?? email,
        isNewAccount: false,
        profile: saved,
        storageMode: 'supabase',
      },
    };
  }

  // 2. First-time Gmail player -> generate unique starter username & fresh profile (hasCompletedCreation: false, pet: null)
  const baseName = buildDefaultGoogleUsername(
    email,
    (authUser.user_metadata as Record<string, unknown> | undefined)?.full_name
  );
  let candidateUsername = baseName;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: clash } = await supabaseClient
      .from('players')
      .select('id')
      .ilike('username', candidateUsername)
      .maybeSingle();
    if (!clash) break;
    candidateUsername = `${baseName.slice(0, 14)}_${Math.floor(100 + Math.random() * 899)}`;
  }

  const nowIso = new Date().toISOString();
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(crypto.randomBytes(24).toString('hex'));
  const coins = starterProfile?.currencies?.coins ?? 2500;
  const gold = starterProfile?.currencies?.gold ?? 10;
  const diamonds = starterProfile?.currencies?.diamonds ?? 50;
  const loadout: Record<string, unknown> = {
    ...(starterProfile?.loadout ?? {}),
    pet: null,
    petId: null,
    hasCompletedCreation: false,
  };
  const skills = starterProfile?.skills ?? {};
  const inventory = starterProfile?.inventory ?? [];
  const farm = starterProfile?.farm ?? { plots: [], trees: [], livestock: [], machines: [] };
  const metaJson = {
    hp: starterProfile?.hp ?? 150,
    maxHp: starterProfile?.maxHp ?? 150,
    activeBuffs: [],
    quickSnackSlots: starterProfile?.quickSnackSlots,
    clearedBosses: [],
    bossDefeats: {},
    pagodaBundles: {},
    luckyWheelPity: 0,
    villagePassUntil: null,
    extraBagSlots: 0,
    ownedMounts: [],
    activeMount: null,
    dailyFreeCoinSpinDate: null,
    lastShrinePrayerDate: null,
    cityServer: 'phnom_penh',
    activeBiome: 'emerald_rice_valley',
    discoveredBiomes: ['emerald_rice_valley'],
    unlockedPylons: ['emerald_rice_valley'],
    bankCoins: 500,
    weaponPrefix: 'keen',
    armorPrefix: 'armored',
    shimmerBlessings: [],
    hasCompletedCreation: false,
    activeClass: starterProfile?.activeClass ?? 'lbokator',
    weapon: starterProfile?.weapon,
    defense: starterProfile?.defense ?? 10,
    areaChannel: 0,
  };

  const { error: insertErr } = await supabaseClient.from('players').insert({
    id,
    auth_user_id: authUserId,
    email,
    username: candidateUsername,
    password_hash: passwordHash,
    coins,
    gold,
    diamonds,
    level: 1,
    xp: 0,
    life_stats: starterProfile?.lifeStats ?? {},
    appearance: loadout,
    skills,
    meta_json: metaJson,
    updated_at: nowIso,
  });

  if (insertErr) {
    return { ok: false, status: 500, error: insertErr.message };
  }

  await Promise.all([
    supabaseClient.from('player_inventory').upsert({
      player_id: id,
      inventory_json: inventory,
      equipped_json: loadout,
      updated_at: nowIso,
    }),
    supabaseClient.from('player_farm').upsert({
      player_id: id,
      plots_json: farm.plots,
      trees_json: farm.trees,
      livestock_json: farm.livestock,
      machines_json: farm.machines,
      updated_at: nowIso,
    }),
  ]);

  const createdProfile = rowToSavedProfile({
    username: candidateUsername,
    coins,
    gold,
    diamonds,
    level: 1,
    xp: 0,
    life_stats: starterProfile?.lifeStats ?? {},
    appearance: loadout,
    skills,
    meta_json: metaJson,
    inventory_json: inventory,
    equipped_json: loadout,
    plots_json: farm.plots,
    trees_json: farm.trees,
    livestock_json: farm.livestock,
    machines_json: farm.machines,
  });

  const token = createAuthToken(id, candidateUsername);
  return {
    ok: true,
    data: {
      token,
      playerId: id,
      username: candidateUsername,
      email,
      isNewAccount: true,
      profile: createdProfile,
      storageMode: 'supabase',
    },
  };
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

export interface ServerLeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  detailLabel: string;
  loadout: Record<string, unknown>;
}

export async function getTopTenLeaderboards(): Promise<{
  farmer: ServerLeaderboardEntry[];
  stylish: ServerLeaderboardEntry[];
  slayer: ServerLeaderboardEntry[];
  tower: ServerLeaderboardEntry[];
}> {
  interface RawRecord {
    username: string;
    coins: number;
    life_stats: Record<string, unknown>;
    appearance: Record<string, unknown>;
    meta_json: Record<string, unknown>;
  }

  let rows: RawRecord[] = [];
  if (supabaseClient) {
    const { data } = await supabaseClient
      .from('players')
      .select('username, coins, life_stats, appearance, meta_json')
      .limit(100);
    if (Array.isArray(data)) {
      rows = data.map((d) => ({
        username: String(d.username || 'PhumHero'),
        coins: Number(d.coins) || 0,
        life_stats: (d.life_stats as Record<string, unknown>) || {},
        appearance: (d.appearance as Record<string, unknown>) || {},
        meta_json: (d.meta_json as Record<string, unknown>) || {},
      }));
    }
  } else {
    const db = readLocalDb();
    rows = db.players.map((p) => ({
      username: p.username,
      coins: p.coins,
      life_stats: p.life_stats ?? {},
      appearance: p.appearance ?? {},
      meta_json: p.meta_json ?? {},
    }));
  }

  // Seed iconic Khmer champions if database has fewer than 3 players so Plaza Statues always shine!
  const seedRows: RawRecord[] = [
    {
      username: 'Sovann_Angkor',
      coins: 18500,
      life_stats: { farmLevel: 24, stylish: 485 },
      appearance: {
        hat: 'hat_royal_crown',
        shirt: 'shirt_apsara_gold',
        pants: 'pants_sampot_hol',
        wings: 'wings_garuda',
        weapon: 'weapon_preah_khan',
      },
      meta_json: { highestTowerFloor: 42, bankCoins: 4500, clearedBosses: ['sdech_kongkaeb', 'arp_prey_chrov', 'yeak_thmor', 'neak_reach'], bossDefeats: { sdech_kongkaeb: 8, yeak_thmor: 6, neak_reach: 5 } },
    },
    {
      username: 'Bopha_Lotus',
      coins: 12400,
      life_stats: { farmLevel: 19, stylish: 540 },
      appearance: {
        hairStyle: 'braided_royal',
        hat: 'hat_bopha_lotus_hairpin',
        shirt: 'shirt_royal_silk',
        pants: 'pants_sampot_hol',
        wings: 'wings_yant_halo',
        weapon: 'weapon_sastra',
      },
      meta_json: { highestTowerFloor: 31, bankCoins: 2000, clearedBosses: ['sdech_kongkaeb', 'arp_prey_chrov', 'yeak_thmor'], bossDefeats: { sdech_kongkaeb: 5, yeak_thmor: 4 } },
    },
    {
      username: 'Vireak_Lbokator',
      coins: 9600,
      life_stats: { farmLevel: 14, stylish: 390 },
      appearance: {
        hairStyle: 'silver_spiky',
        hat: 'hat_yaksha_mask',
        shirt: 'shirt_lbokator_gi',
        pants: 'pants_sampot_hol',
        wings: 'wings_ember',
        weapon: 'weapon_stone_club',
      },
      meta_json: { highestTowerFloor: 50, bankCoins: 1500, clearedBosses: ['sdech_kongkaeb', 'arp_prey_chrov', 'yeak_thmor', 'neak_reach'], bossDefeats: { sdech_kongkaeb: 9, yeak_thmor: 10, neak_reach: 7 } },
    },
  ];
  const existingNames = new Set(rows.map((r) => r.username.toLowerCase()));
  for (const s of seedRows) {
    if (!existingNames.has(s.username.toLowerCase())) rows.push(s);
  }

  const parsed = rows.map((r) => {
    const farmLevel = Math.max(1, Number(r.life_stats?.farmLevel) || 1);
    const stylish = Math.max(0, Number(r.life_stats?.stylish) || 100);
    const bankCoins = Math.max(0, Number(r.meta_json?.bankCoins) || 0);
    const totalCoins = Math.max(0, r.coins) + bankCoins;
    const cleared = Array.isArray(r.meta_json?.clearedBosses) ? r.meta_json.clearedBosses.length : 0;
    const defeatsObj = (r.meta_json?.bossDefeats as Record<string, number> | undefined) ?? {};
    const totalKills = Object.values(defeatsObj).reduce((sum, n) => sum + (Number(n) || 0), 0);
    const highestTowerFloor = Math.max(0, Math.min(50, Number(r.meta_json?.highestTowerFloor) || 0));
    return {
      username: r.username,
      farmLevel,
      totalCoins,
      stylish,
      cleared,
      totalKills,
      highestTowerFloor,
      loadout: r.appearance ?? {},
    };
  });

  const farmer = [...parsed]
    .sort((a, b) => b.farmLevel * 1000 + b.totalCoins - (a.farmLevel * 1000 + a.totalCoins))
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      username: p.username,
      score: p.farmLevel * 1000 + p.totalCoins,
      detailLabel: `Farm Lv.${p.farmLevel} · ${p.totalCoins.toLocaleString()} Coins`,
      loadout: p.loadout,
    }));

  const stylish = [...parsed]
    .sort((a, b) => b.stylish - a.stylish)
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      username: p.username,
      score: p.stylish,
      detailLabel: `Stylish Score ${p.stylish} ★`,
      loadout: p.loadout,
    }));

  const slayer = [...parsed]
    .sort((a, b) => b.cleared * 100 + b.totalKills - (a.cleared * 100 + a.totalKills))
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      username: p.username,
      score: p.cleared * 100 + p.totalKills,
      detailLabel: `${p.cleared} Unique Bosses · ${p.totalKills} Total Clears`,
      loadout: p.loadout,
    }));

  const tower = [...parsed]
    .sort((a, b) => b.highestTowerFloor - a.highestTowerFloor || b.totalKills - a.totalKills)
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      username: p.username,
      score: p.highestTowerFloor,
      detailLabel:
        p.highestTowerFloor >= 50
          ? 'Floor 50 / 50 · Celestial Angkor Champion'
          : `Reached Pagoda Floor ${p.highestTowerFloor} / 50`,
      loadout: p.loadout,
    }));

  return { farmer, stylish, slayer, tower };
}
