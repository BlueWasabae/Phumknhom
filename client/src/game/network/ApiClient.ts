import {
  DEFAULT_LOADOUT,
  INITIAL_PLAYER_STATE,
  createInitialFarmState,
  createInitialSkillProfile,
  type EquippedLoadout,
  type PlayerState,
  type SkillId,
} from '@shared/types';
import { ALL_SKILL_IDS, computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  buildWeaponStatsFromItem,
  computeLoadoutDefenseAndHp,
  computeStylishScore,
} from '../../data/items';

export interface AuthSession {
  token: string;
  playerId: string;
  username: string;
  storageMode: 'supabase' | 'local_json';
}

export interface FriendRecord {
  friendshipId: string;
  playerId: string;
  username: string;
  level: number;
  stylish: number;
  status: 'pending' | 'accepted';
  direction: 'accepted' | 'incoming' | 'outgoing';
  createdAt: string;
  online: boolean;
  areaId: string | null;
}

export interface FriendsListResponse {
  accepted: FriendRecord[];
  incoming: FriendRecord[];
  outgoing: FriendRecord[];
}

export interface SavedProfilePayload {
  name: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  currencies: PlayerState['currencies'];
  lifeStats: PlayerState['lifeStats'];
  loadout: EquippedLoadout;
  skills: PlayerState['skills'];
  inventory: PlayerState['inventory'];
  farm: PlayerState['farm'];
  activeBuffs: PlayerState['activeBuffs'];
  quickSnackSlots: PlayerState['quickSnackSlots'];
  clearedBosses: PlayerState['clearedBosses'];
  bossDefeats?: Record<string, number>;
  pagodaBundles: PlayerState['pagodaBundles'];
  luckyWheelPity: number;
  activeClass: PlayerState['activeClass'];
  weapon: PlayerState['weapon'];
  defense: number;
  areaChannel: number;
}

function getApiBase(): string {
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
  return `${proto}://${host}:2567/api`;
}

export function serializePlayerStateForSave(state: PlayerState): SavedProfilePayload {
  return {
    name: state.name,
    level: state.level,
    xp: state.xp,
    hp: state.hp,
    maxHp: state.maxHp,
    currencies: { ...state.currencies },
    lifeStats: { ...state.lifeStats },
    loadout: { ...state.loadout },
    skills: state.skills,
    inventory: state.inventory,
    farm: state.farm,
    activeBuffs: state.activeBuffs,
    quickSnackSlots: [...state.quickSnackSlots],
    clearedBosses: [...state.clearedBosses],
    bossDefeats: { ...(state.bossDefeats ?? {}) },
    pagodaBundles: { ...(state.pagodaBundles ?? {}) },
    luckyWheelPity: state.luckyWheelPity ?? 0,
    activeClass: state.activeClass,
    weapon: { ...state.weapon },
    defense: state.defense,
    areaChannel: state.areaChannel,
  };
}

/**
 * Safely merges a saved DB profile with current schema defaults so
 * currencies, equipped paper-doll, 12-skill RPG profile, and real-timestamp
 * farm/artisan plots restore cleanly even after browser refresh.
 */
export function hydratePlayerStateFromSave(
  saved: Partial<SavedProfilePayload> | null | undefined,
  username: string
): PlayerState {
  const baseFarm = createInitialFarmState();
  const baseSkills = createInitialSkillProfile();

  const loadout: EquippedLoadout = {
    ...DEFAULT_LOADOUT,
    ...(saved?.loadout ?? {}),
  };

  const mergedSkills = { ...baseSkills.skills };
  if (saved?.skills?.skills) {
    for (const id of ALL_SKILL_IDS) {
      const incoming = saved.skills.skills[id as SkillId];
      if (incoming && typeof incoming.level === 'number') {
        mergedSkills[id] = {
          level: incoming.level,
          xp: incoming.xp ?? 0,
          unlockedTalents: Array.isArray(incoming.unlockedTalents) ? incoming.unlockedTalents : [],
        };
      }
    }
  }

  const level = typeof saved?.level === 'number' ? Math.max(1, saved.level) : INITIAL_PLAYER_STATE.level;
  const derived = computeLoadoutDefenseAndHp(loadout, level);
  const weaponBase = buildWeaponStatsFromItem(loadout.weapon);
  const stylish = computeStylishScore(loadout);

  const currencies = {
    coins: saved?.currencies?.coins ?? INITIAL_PLAYER_STATE.currencies.coins,
    gold: saved?.currencies?.gold ?? INITIAL_PLAYER_STATE.currencies.gold,
    diamonds: saved?.currencies?.diamonds ?? INITIAL_PLAYER_STATE.currencies.diamonds,
  };

  const savedFarm = saved?.farm;
  const farm =
    savedFarm && Array.isArray(savedFarm.plots) && savedFarm.plots.length > 0
      ? {
          plots: savedFarm.plots,
          trees: Array.isArray(savedFarm.trees) ? savedFarm.trees : baseFarm.trees,
          livestock: Array.isArray(savedFarm.livestock) ? savedFarm.livestock : baseFarm.livestock,
          machines: Array.isArray(savedFarm.machines) ? savedFarm.machines : baseFarm.machines,
        }
      : baseFarm;

  const inventory =
    Array.isArray(saved?.inventory) && saved.inventory.length > 0
      ? saved.inventory
      : INITIAL_PLAYER_STATE.inventory.map((i) => ({ ...i }));

  const provisional: PlayerState = {
    ...INITIAL_PLAYER_STATE,
    name: username,
    level,
    xp: typeof saved?.xp === 'number' ? saved.xp : 0,
    hp: typeof saved?.hp === 'number' ? saved.hp : derived.maxHp,
    maxHp: derived.maxHp,
    coins: currencies.coins,
    currencies,
    lifeStats: {
      ...INITIAL_PLAYER_STATE.lifeStats,
      ...(saved?.lifeStats ?? {}),
      farmLevel: mergedSkills.farming.level,
      farmXp: mergedSkills.farming.xp,
      stylish,
    },
    defense: derived.defense,
    areaChannel: typeof saved?.areaChannel === 'number' ? saved.areaChannel : 0,
    zone: 'overworld',
    activeClass: weaponBase.classId,
    weapon: {
      ...weaponBase,
      baseDamage: weaponBase.baseDamage + derived.bonusFlatAtk,
      critChance: Math.min(0.65, weaponBase.critChance + derived.bonusCrit),
    },
    loadout,
    inventory,
    farm,
    skills: { skills: mergedSkills },
    activeBuffs: Array.isArray(saved?.activeBuffs)
      ? saved.activeBuffs.filter((b) => b.expiresAt > Date.now())
      : [],
    quickSnackSlots:
      Array.isArray(saved?.quickSnackSlots) && saved.quickSnackSlots.length === 3
        ? [saved.quickSnackSlots[0], saved.quickSnackSlots[1], saved.quickSnackSlots[2]]
        : [...INITIAL_PLAYER_STATE.quickSnackSlots],
    clearedBosses: Array.isArray(saved?.clearedBosses) ? saved.clearedBosses : [],
    bossDefeats:
      saved?.bossDefeats && typeof saved.bossDefeats === 'object' ? saved.bossDefeats : {},
    pagodaBundles:
      saved?.pagodaBundles && typeof saved.pagodaBundles === 'object' ? saved.pagodaBundles : {},
    luckyWheelPity: typeof saved?.luckyWheelPity === 'number' ? saved.luckyWheelPity : 0,
  };

  const bridge = computeVillageToDungeonBridge(provisional);
  return {
    ...provisional,
    hp: Math.min(provisional.hp, bridge.effectiveMaxHp),
    skillDamagePct: bridge.classSkillDamagePct,
    snackBuffPct: bridge.snackAttackPct,
  };
}

async function postJson<T>(
  endpoint: string,
  body: Record<string, unknown>,
  token?: string,
  keepalive = false
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${getApiBase()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      keepalive,
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: json.error || `Request failed (${res.status})` };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: 'Cannot reach Phum server on port 2567. You can Play as Guest offline!' };
  }
}

export async function registerAccount(
  username: string,
  password: string,
  starterState: PlayerState
): Promise<
  | { ok: true; session: AuthSession; playerState: PlayerState }
  | { ok: false; error: string }
> {
  const starterProfile = serializePlayerStateForSave({ ...starterState, name: username });
  const res = await postJson<{
    token: string;
    playerId: string;
    username: string;
    profile: SavedProfilePayload | null;
    storageMode: 'supabase' | 'local_json';
  }>('/auth/register', { username, password, starterProfile });

  if (!res.ok) return res;
  const { token, playerId, username: savedUser, profile, storageMode } = res.data;
  return {
    ok: true,
    session: { token, playerId, username: savedUser, storageMode },
    playerState: hydratePlayerStateFromSave(profile ?? starterProfile, savedUser),
  };
}

export async function loginAccount(
  username: string,
  password: string
): Promise<
  | { ok: true; session: AuthSession; playerState: PlayerState }
  | { ok: false; error: string }
> {
  const res = await postJson<{
    token: string;
    playerId: string;
    username: string;
    profile: SavedProfilePayload | null;
    storageMode: 'supabase' | 'local_json';
  }>('/auth/login', { username, password });

  if (!res.ok) return res;
  const { token, playerId, username: savedUser, profile, storageMode } = res.data;
  return {
    ok: true,
    session: { token, playerId, username: savedUser, storageMode },
    playerState: hydratePlayerStateFromSave(profile, savedUser),
  };
}

export async function saveAccountProfile(
  session: AuthSession,
  state: PlayerState,
  keepalive = false
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const res = await postJson<{ ok: true; savedAt: string }>(
    '/save',
    { profile: serializePlayerStateForSave(state) },
    session.token,
    keepalive
  );
  if (!res.ok) return res;
  return { ok: true, savedAt: res.data.savedAt };
}

export async function fetchFriends(playerId: string): Promise<FriendsListResponse> {
  try {
    const res = await fetch(`${getApiBase()}/friends/${encodeURIComponent(playerId)}`);
    if (!res.ok) throw new Error('Failed');
    return (await res.json()) as FriendsListResponse;
  } catch {
    return { accepted: [], incoming: [], outgoing: [] };
  }
}

export async function sendFriendRequestApi(
  session: AuthSession,
  target: { targetPlayerId?: string; targetUsername?: string }
): Promise<
  | { ok: true; status: 'pending' | 'accepted'; friendshipId: string; targetUsername: string }
  | { ok: false; error: string }
> {
  const res = await postJson<{
    status: 'pending' | 'accepted';
    friendshipId: string;
    targetUsername: string;
  }>('/friends/request', target, session.token);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.data.status,
    friendshipId: res.data.friendshipId,
    targetUsername: res.data.targetUsername,
  };
}

export async function acceptFriendRequestApi(
  session: AuthSession,
  friendshipId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await postJson<{ ok: true }>('/friends/accept', { friendshipId }, session.token);
  return res.ok ? { ok: true } : res;
}

export async function declineFriendRequestApi(
  session: AuthSession,
  friendshipId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await postJson<{ ok: true }>('/friends/decline', { friendshipId }, session.token);
  return res.ok ? { ok: true } : res;
}

// ==================== PHASE 8 PLAYER MARKET REST CLIENT ====================

export interface MarketListingClient {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  quality: 'normal' | 'gold_star';
  priceCoins: number;
  createdAt: string;
}

export async function fetchMarketListings(): Promise<MarketListingClient[]> {
  try {
    const res = await fetch(`${getApiBase()}/market`);
    if (!res.ok) throw new Error('Failed');
    const json = (await res.json()) as { listings?: MarketListingClient[] };
    return Array.isArray(json.listings) ? json.listings : [];
  } catch {
    return [];
  }
}

export async function createMarketListingApi(
  session: AuthSession | null,
  payload: {
    sellerName: string;
    itemId: string;
    itemName: string;
    quantity: number;
    quality: 'normal' | 'gold_star';
    priceCoins: number;
  }
): Promise<{ ok: true; listing: MarketListingClient } | { ok: false; error: string }> {
  const res = await postJson<{ listing: MarketListingClient }>(
    '/market/list',
    payload,
    session?.token
  );
  if (!res.ok) return res;
  return { ok: true, listing: res.data.listing };
}

export async function buyMarketListingApi(
  session: AuthSession | null,
  listingId: string,
  buyerName: string
): Promise<
  | { ok: true; listing: MarketListingClient; taxCoins: number; sellerPayout: number }
  | { ok: false; error: string }
> {
  const res = await postJson<{
    listing: MarketListingClient;
    taxCoins: number;
    sellerPayout: number;
  }>('/market/buy', { listingId, buyerName }, session?.token);
  if (!res.ok) return res;
  return {
    ok: true,
    listing: res.data.listing,
    taxCoins: res.data.taxCoins,
    sellerPayout: res.data.sellerPayout,
  };
}

export async function cancelMarketListingApi(
  session: AuthSession | null,
  listingId: string
): Promise<{ ok: true; listing: MarketListingClient } | { ok: false; error: string }> {
  const res = await postJson<{ listing: MarketListingClient }>(
    '/market/cancel',
    { listingId },
    session?.token
  );
  if (!res.ok) return res;
  return { ok: true, listing: res.data.listing };
}
