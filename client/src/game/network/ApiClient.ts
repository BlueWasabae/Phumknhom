import {
  DEFAULT_LOADOUT,
  INITIAL_PLAYER_STATE,
  createInitialFarmState,
  createInitialSkillProfile,
  type ActiveDungeonFightInfo,
  type ActiveTreasureMap,
  type BondPartnerRecord,
  type EquippedLoadout,
  type KromGuild,
  type PlayerState,
  type SkillId,
  type TukTukCartItem,
  type TukTukCartListing,
} from '@shared/types';
import { computeKromBuffs } from '@shared/festivals';
import { ALL_SKILL_IDS, computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  normalizeEyeStyleId,
  normalizeEyebrowStyleId,
  normalizeFaceStyleId,
  normalizeHairStyleId,
  resolveSkinToneDef,
} from '@shared/characterStyles';
import {
  ITEM_CATALOG,
  buildWeaponStatsFromItem,
  computeLoadoutDefenseAndHp,
  computeStylishScore,
} from '../../data/items';

export interface AuthSession {
  token: string;
  playerId: string;
  username: string;
  email?: string | null;
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
  villagePassUntil?: number | null;
  extraBagSlots?: number;
  ownedMounts?: string[];
  activeMount?: string | null;
  dailyFreeCoinSpinDate?: string | null;
  lastShrinePrayerDate?: string | null;
  cityServer?: 'phnom_penh' | 'siem_reap' | 'kampot' | 'battambang';
  activeBiome?: string;
  discoveredBiomes?: string[];
  unlockedPylons?: string[];
  bankCoins?: number;
  weaponPrefix?: string | null;
  armorPrefix?: string | null;
  shimmerBlessings?: string[];
  npcFriendships?: PlayerState['npcFriendships'];
  houseDecor?: PlayerState['houseDecor'];
  ownedFurniture?: PlayerState['ownedFurniture'];
  highestTowerFloor?: number;
  unlockedWeaponAuras?: PlayerState['unlockedWeaponAuras'];
  museumDonations?: string[];
  kromId?: string | null;
  kromTag?: string | null;
  kromName?: string | null;
  kromLevel?: number;
  pchumBenBlessingUntil?: number | null;
  festivalSplashCount?: number;
  activeTreasureMap?: ActiveTreasureMap | null;
  runwayIconBadge?: boolean;
  runwayScore?: number;
  bondPartner?: BondPartnerRecord | null;
  hasCompletedCreation?: boolean;
  activeClass: PlayerState['activeClass'];
  weapon: PlayerState['weapon'];
  defense: number;
  areaChannel: number;
}

export type LeaderboardCategory = 'farmer' | 'stylish' | 'slayer' | 'tower';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  detailLabel: string;
  loadout: EquippedLoadout;
}

export interface LeaderboardResponse {
  farmer: LeaderboardEntry[];
  stylish: LeaderboardEntry[];
  slayer: LeaderboardEntry[];
  tower: LeaderboardEntry[];
}

function buildOfflineFallbackLeaderboard(localPlayer?: PlayerState): LeaderboardResponse {
  const seeds: Array<{
    username: string;
    farmLevel: number;
    coins: number;
    stylish: number;
    uniqueBosses: number;
    totalKills: number;
    highestTowerFloor: number;
    loadout: EquippedLoadout;
  }> = [
    {
      username: 'Sovann_Angkor',
      farmLevel: 24,
      coins: 18500,
      stylish: 485,
      uniqueBosses: 4,
      totalKills: 19,
      highestTowerFloor: 42,
      loadout: {
        ...DEFAULT_LOADOUT,
        hat: 'hat_royal_crown',
        shirt: 'shirt_apsara_gold',
        pants: 'pants_sampot_hol',
        wings: 'wings_garuda',
        weapon: 'weapon_preah_khan',
      },
    },
    {
      username: 'Bopha_Lotus',
      farmLevel: 19,
      coins: 12400,
      stylish: 540,
      uniqueBosses: 3,
      totalKills: 11,
      highestTowerFloor: 31,
      loadout: {
        ...DEFAULT_LOADOUT,
        hairStyle: 'braided_royal',
        hat: 'hat_bopha_lotus_hairpin',
        shirt: 'shirt_royal_silk',
        pants: 'pants_sampot_hol',
        wings: 'wings_yant_halo',
        weapon: 'weapon_sastra',
      },
    },
    {
      username: 'Vireak_Lbokator',
      farmLevel: 14,
      coins: 9600,
      stylish: 390,
      uniqueBosses: 4,
      totalKills: 26,
      highestTowerFloor: 50,
      loadout: {
        ...DEFAULT_LOADOUT,
        hairStyle: 'silver_spiky',
        hat: 'hat_yaksha_mask',
        shirt: 'shirt_lbokator_gi',
        pants: 'pants_sampot_hol',
        wings: 'wings_ember',
        weapon: 'weapon_stone_club',
      },
    },
    {
      username: 'Kampuchea_Farm',
      farmLevel: 21,
      coins: 14900,
      stylish: 295,
      uniqueBosses: 2,
      totalKills: 7,
      highestTowerFloor: 18,
      loadout: { ...DEFAULT_LOADOUT, hat: 'hat_doun', shirt: 'shirt_krama_set', weapon: 'weapon_phkak' },
    },
    {
      username: 'Chann_Shadow',
      farmLevel: 11,
      coins: 6800,
      stylish: 410,
      uniqueBosses: 3,
      totalKills: 15,
      highestTowerFloor: 35,
      loadout: { ...DEFAULT_LOADOUT, shirt: 'shirt_shadow_cloak', weapon: 'weapon_kambet' },
    },
    {
      username: 'Mekong_Archer',
      farmLevel: 13,
      coins: 7200,
      stylish: 325,
      uniqueBosses: 3,
      totalKills: 12,
      highestTowerFloor: 27,
      loadout: { ...DEFAULT_LOADOUT, shirt: 'shirt_traveler_vest', weapon: 'weapon_thnu' },
    },
    {
      username: 'Dara_Kampot',
      farmLevel: 16,
      coins: 10200,
      stylish: 350,
      uniqueBosses: 2,
      totalKills: 8,
      highestTowerFloor: 22,
      loadout: { ...DEFAULT_LOADOUT, shirt: 'shirt_krama_set', weapon: 'weapon_krama_whip' },
    },
    {
      username: 'Nita_PhnomPenh',
      farmLevel: 9,
      coins: 5100,
      stylish: 445,
      uniqueBosses: 2,
      totalKills: 6,
      highestTowerFloor: 15,
      loadout: { ...DEFAULT_LOADOUT, hairStyle: 'high_ponytail', hat: 'hat_frog_crown', shirt: 'shirt_apsara_gold' },
    },
    {
      username: 'Sokha_SiemReap',
      farmLevel: 12,
      coins: 6300,
      stylish: 280,
      uniqueBosses: 2,
      totalKills: 9,
      highestTowerFloor: 12,
      loadout: { ...DEFAULT_LOADOUT, shirt: 'shirt_village_tunic', weapon: 'weapon_phkak' },
    },
  ];

  if (localPlayer) {
    const totalKills = Object.values(localPlayer.bossDefeats ?? {}).reduce((a, b) => a + b, 0);
    seeds.push({
      username: localPlayer.name,
      farmLevel: localPlayer.lifeStats.farmLevel,
      coins: localPlayer.currencies.coins + (localPlayer.bankCoins ?? 0),
      stylish: localPlayer.lifeStats.stylish,
      uniqueBosses: localPlayer.clearedBosses.length,
      totalKills,
      highestTowerFloor: localPlayer.highestTowerFloor ?? 0,
      loadout: { ...localPlayer.loadout },
    });
  }

  const farmer = [...seeds]
    .sort((a, b) => b.farmLevel * 1000 + b.coins - (a.farmLevel * 1000 + a.coins))
    .slice(0, 10)
    .map((p, idx) => ({
      rank: idx + 1,
      username: p.username,
      score: p.farmLevel * 1000 + p.coins,
      detailLabel: `Farm Lv.${p.farmLevel} · ${p.coins.toLocaleString()} Coins`,
      loadout: p.loadout,
    }));

  const stylish = [...seeds]
    .sort((a, b) => b.stylish - a.stylish)
    .slice(0, 10)
    .map((p, idx) => ({
      rank: idx + 1,
      username: p.username,
      score: p.stylish,
      detailLabel: `Stylish Score ${p.stylish} ★`,
      loadout: p.loadout,
    }));

  const slayer = [...seeds]
    .sort((a, b) => b.uniqueBosses * 100 + b.totalKills - (a.uniqueBosses * 100 + a.totalKills))
    .slice(0, 10)
    .map((p, idx) => ({
      rank: idx + 1,
      username: p.username,
      score: p.uniqueBosses * 100 + p.totalKills,
      detailLabel: `${p.uniqueBosses} Unique Bosses · ${p.totalKills} Total Clears`,
      loadout: p.loadout,
    }));

  const tower = [...seeds]
    .sort((a, b) => b.highestTowerFloor - a.highestTowerFloor || b.totalKills - a.totalKills)
    .slice(0, 10)
    .map((p, idx) => ({
      rank: idx + 1,
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

export async function fetchLeaderboard(localPlayer?: PlayerState): Promise<LeaderboardResponse> {
  try {
    const res = await fetch(`${getApiBase()}/leaderboard`);
    if (res.ok) {
      const json = (await res.json()) as Partial<LeaderboardResponse>;
      if (Array.isArray(json.farmer) && json.farmer.length > 0 && Array.isArray(json.stylish) && Array.isArray(json.slayer)) {
        const normalizeRow = (r: LeaderboardEntry): LeaderboardEntry => ({
          ...r,
          loadout: { ...DEFAULT_LOADOUT, ...(r.loadout ?? {}) },
        });
        const fallback = buildOfflineFallbackLeaderboard(localPlayer);
        return {
          farmer: json.farmer.map(normalizeRow),
          stylish: json.stylish.map(normalizeRow),
          slayer: json.slayer.map(normalizeRow),
          tower: Array.isArray(json.tower) && json.tower.length > 0 ? json.tower.map(normalizeRow) : fallback.tower,
        };
      }
    }
  } catch {
    // Offline fallback below
  }
  return buildOfflineFallbackLeaderboard(localPlayer);
}

export function getApiBase(): string {
  const envApi = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (envApi) {
    return envApi.endsWith('/api') ? envApi : `${envApi}/api`;
  }
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
    villagePassUntil: state.villagePassUntil ?? null,
    extraBagSlots: state.extraBagSlots ?? 0,
    ownedMounts: [...(state.ownedMounts ?? [])],
    activeMount: state.activeMount ?? null,
    dailyFreeCoinSpinDate: state.dailyFreeCoinSpinDate ?? null,
    lastShrinePrayerDate: state.lastShrinePrayerDate ?? null,
    cityServer: state.cityServer ?? 'phnom_penh',
    activeBiome: state.activeBiome ?? 'emerald_rice_valley',
    discoveredBiomes: [...(state.discoveredBiomes ?? ['emerald_rice_valley'])],
    unlockedPylons: [...(state.unlockedPylons ?? ['emerald_rice_valley'])],
    bankCoins: state.bankCoins ?? 500,
    weaponPrefix: state.weaponPrefix ?? 'keen',
    armorPrefix: state.armorPrefix ?? 'armored',
    shimmerBlessings: [...(state.shimmerBlessings ?? [])],
    npcFriendships: { ...(state.npcFriendships ?? {}) },
    houseDecor: state.houseDecor ? state.houseDecor.map((d) => ({ ...d })) : undefined,
    ownedFurniture: state.ownedFurniture ? { ...state.ownedFurniture } : undefined,
    highestTowerFloor: state.highestTowerFloor ?? 0,
    unlockedWeaponAuras: [...(state.unlockedWeaponAuras ?? [])],
    museumDonations: [...(state.museumDonations ?? [])],
    kromId: state.kromId ?? null,
    kromTag: state.kromTag ?? null,
    kromName: state.kromName ?? null,
    kromLevel: state.kromLevel ?? 0,
    pchumBenBlessingUntil: state.pchumBenBlessingUntil ?? null,
    festivalSplashCount: state.festivalSplashCount ?? 0,
    activeTreasureMap: state.activeTreasureMap ?? null,
    runwayIconBadge: Boolean(state.runwayIconBadge ?? false),
    runwayScore: state.runwayScore ?? 0,
    bondPartner: state.bondPartner ?? null,
    hasCompletedCreation: Boolean(state.hasCompletedCreation ?? state.loadout.hasCompletedCreation),
    activeClass: state.activeClass,
    weapon: { ...state.weapon },
    defense: state.defense,
    areaChannel: state.areaChannel,
  };
}

const GUEST_CREATION_KEY = 'phum_khnhom_guest_creation_v1';
const GUEST_PROGRESS_KEY = 'phum_khnhom_guest_progress_v1';

export function saveGuestProgressSnapshot(state: PlayerState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload = serializePlayerStateForSave(state);
    window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGuestProgressSnapshot(): SavedProfilePayload | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(GUEST_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProfilePayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface SavedGuestCreation {
  name: string;
  loadout: EquippedLoadout;
  activeClass: PlayerState['activeClass'];
  hasCompletedCreation: boolean;
}

export function loadGuestCreationProfile(): SavedGuestCreation | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(GUEST_CREATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGuestCreation>;
    if (!parsed.hasCompletedCreation || !parsed.loadout) return null;
    const merged = { ...DEFAULT_LOADOUT, ...parsed.loadout };
    const skin = resolveSkinToneDef(merged.skinTone || merged.skinColor);
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'PhumHero',
      loadout: {
        ...merged,
        skinTone: skin.id,
        skinColor: skin.hex,
        hairStyle: normalizeHairStyleId(merged.hairStyle),
        eyeStyle: normalizeEyeStyleId(merged.eyeStyle),
        eyebrowStyle: normalizeEyebrowStyleId(merged.eyebrowStyle),
        faceStyle: normalizeFaceStyleId(merged.faceStyle),
        pet: null,
        petId: null,
        hasCompletedCreation: true,
      },
      activeClass: parsed.activeClass ?? 'lbokator',
      hasCompletedCreation: true,
    };
  } catch {
    return null;
  }
}

export function saveGuestCreationProfile(data: SavedGuestCreation): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(GUEST_CREATION_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues
  }
}

const LEGACY_STARTER_PET_IDS = new Set(['mini_naga', 'pet_mini_naga']);

/**
 * Strips any legacy default starter pet (e.g. 'mini_naga' / 'pet_mini_naga') or unowned pet
 * from existing localStorage saves on boot so pets only appear when explicitly bought & equipped.
 */
export function sanitizeLegacyLocalStoragePets(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !/phum|khnhom|save|player/i.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || !raw.startsWith('{')) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      let mutated = false;
      const inv = Array.isArray(parsed.inventory)
        ? (parsed.inventory as Array<{ itemId?: string; quantity?: number }>)
        : [];
      const loadout = (parsed.loadout ?? parsed.equipped) as Record<string, unknown> | undefined;
      if (loadout && typeof loadout === 'object') {
        const currentPet = (loadout.pet ?? loadout.petId) as string | null | undefined;
        if (currentPet) {
          const owned = inv.some((it) => it.itemId === currentPet && (it.quantity ?? 0) > 0);
          if (LEGACY_STARTER_PET_IDS.has(currentPet) || !owned || !ITEM_CATALOG[currentPet]) {
            if ('pet' in loadout) loadout.pet = null;
            if ('petId' in loadout) loadout.petId = null;
            mutated = true;
          }
        }
      }
      if (mutated) {
        window.localStorage.setItem(key, JSON.stringify(parsed));
      }
    }
  } catch {
    // Ignore malformed non-JSON localStorage entries
  }
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

  const rawInventory =
    Array.isArray(saved?.inventory) && saved.inventory.length > 0
      ? saved.inventory.map((i) => ({ ...i }))
      : INITIAL_PLAYER_STATE.inventory.map((i) => ({ ...i }));
  if (!rawInventory.some((i) => i.itemId === 'tool_magic_mirror')) {
    rawInventory.push({ itemId: 'tool_magic_mirror', quantity: 1, itemLevel: 1, quality: 'normal' });
  }
  // Update 1.6 Starter Migration: ensure returning saves without Update 1.6 items receive starter Boss Essences & Torn Map
  const hasAnyEssenceOrSpirit =
    rawInventory.some(
      (i) =>
        i.itemId === 'essence_slime' ||
        i.itemId === 'essence_stone' ||
        i.itemId === 'essence_naga' ||
        i.itemId === 'crop_spirit_jasmine_rice' ||
        i.itemId === 'crop_celestial_pink_lotus' ||
        i.itemId === 'crop_inferno_kampot_pepper'
    ) || Boolean(saved?.farm?.plots?.some((p) => p.spiritInfused));
  if (!hasAnyEssenceOrSpirit) {
    rawInventory.push(
      { itemId: 'essence_slime', quantity: 1, itemLevel: 1, quality: 'normal' },
      { itemId: 'essence_stone', quantity: 1, itemLevel: 1, quality: 'normal' },
      { itemId: 'essence_naga', quantity: 1, itemLevel: 1, quality: 'normal' }
    );
  }
  const willHaveActiveMap =
    saved?.activeTreasureMap === undefined
      ? Boolean(INITIAL_PLAYER_STATE.activeTreasureMap)
      : Boolean(saved.activeTreasureMap);
  if (willHaveActiveMap && !rawInventory.some((i) => i.itemId === 'item_torn_treasure_map')) {
    rawInventory.push({ itemId: 'item_torn_treasure_map', quantity: 1, itemLevel: 1, quality: 'normal' });
  }
  const inventory = rawInventory;

  const loadout: EquippedLoadout = {
    ...DEFAULT_LOADOUT,
    ...(saved?.loadout ?? {}),
  };
  // Pets are buyable-only: clear legacy default starter pets or any pet not owned in inventory
  if (loadout.pet) {
    const ownsPet = inventory.some((it) => it.itemId === loadout.pet && it.quantity > 0);
    if (!ownsPet || !ITEM_CATALOG[loadout.pet] || loadout.pet === 'mini_naga') {
      loadout.pet = null;
    }
  }

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
    villagePassUntil: typeof saved?.villagePassUntil === 'number' ? saved.villagePassUntil : null,
    extraBagSlots: typeof saved?.extraBagSlots === 'number' ? saved.extraBagSlots : 0,
    ownedMounts: Array.isArray(saved?.ownedMounts) ? saved.ownedMounts : [],
    activeMount: typeof saved?.activeMount === 'string' ? saved.activeMount : null,
    dailyFreeCoinSpinDate:
      typeof saved?.dailyFreeCoinSpinDate === 'string' ? saved.dailyFreeCoinSpinDate : null,
    lastShrinePrayerDate:
      typeof saved?.lastShrinePrayerDate === 'string' ? saved.lastShrinePrayerDate : null,
    cityServer:
      saved?.cityServer === 'siem_reap' ||
      saved?.cityServer === 'kampot' ||
      saved?.cityServer === 'battambang'
        ? saved.cityServer
        : 'phnom_penh',
    activeBiome: typeof saved?.activeBiome === 'string' ? saved.activeBiome : 'emerald_rice_valley',
    discoveredBiomes: Array.isArray(saved?.discoveredBiomes)
      ? saved.discoveredBiomes
      : ['emerald_rice_valley'],
    unlockedPylons: Array.isArray(saved?.unlockedPylons)
      ? saved.unlockedPylons
      : ['emerald_rice_valley'],
    bankCoins: typeof saved?.bankCoins === 'number' ? saved.bankCoins : 500,
    weaponPrefix: typeof saved?.weaponPrefix === 'string' ? saved.weaponPrefix : 'keen',
    armorPrefix: typeof saved?.armorPrefix === 'string' ? saved.armorPrefix : 'armored',
    shimmerBlessings: Array.isArray(saved?.shimmerBlessings) ? saved.shimmerBlessings : [],
    npcFriendships:
      saved?.npcFriendships && typeof saved.npcFriendships === 'object' ? saved.npcFriendships : {},
    houseDecor:
      Array.isArray(saved?.houseDecor)
        ? saved.houseDecor
        : INITIAL_PLAYER_STATE.houseDecor,
    ownedFurniture:
      saved?.ownedFurniture && typeof saved.ownedFurniture === 'object'
        ? saved.ownedFurniture
        : INITIAL_PLAYER_STATE.ownedFurniture,
    highestTowerFloor:
      typeof saved?.highestTowerFloor === 'number' ? Math.max(0, Math.min(50, saved.highestTowerFloor)) : 0,
    unlockedWeaponAuras: Array.isArray(saved?.unlockedWeaponAuras) ? saved.unlockedWeaponAuras : [],
    museumDonations: Array.isArray(saved?.museumDonations) ? saved.museumDonations : [],
    kromId: typeof saved?.kromId === 'string' ? saved.kromId : null,
    kromTag: typeof saved?.kromTag === 'string' ? saved.kromTag : null,
    kromName: typeof saved?.kromName === 'string' ? saved.kromName : null,
    kromLevel: typeof saved?.kromLevel === 'number' ? saved.kromLevel : 0,
    pchumBenBlessingUntil:
      typeof saved?.pchumBenBlessingUntil === 'number' && saved.pchumBenBlessingUntil > Date.now()
        ? saved.pchumBenBlessingUntil
        : null,
    festivalSplashCount: typeof saved?.festivalSplashCount === 'number' ? saved.festivalSplashCount : 0,
    activeTreasureMap:
      saved?.activeTreasureMap && typeof saved.activeTreasureMap === 'object'
        ? saved.activeTreasureMap
        : saved?.activeTreasureMap === null
        ? null
        : INITIAL_PLAYER_STATE.activeTreasureMap,
    runwayIconBadge: Boolean(saved?.runwayIconBadge ?? false),
    runwayScore: typeof saved?.runwayScore === 'number' ? saved.runwayScore : 0,
    bondPartner: saved?.bondPartner && typeof saved.bondPartner === 'object' ? saved.bondPartner : null,
    hasCompletedCreation: Boolean(
      saved?.hasCompletedCreation ?? saved?.loadout?.hasCompletedCreation ?? false
    ),
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

export async function syncGoogleAccount(
  accessToken: string,
  starterState: PlayerState
): Promise<
  | { ok: true; session: AuthSession; playerState: PlayerState; isNewAccount: boolean }
  | { ok: false; error: string }
> {
  const starterProfile = serializePlayerStateForSave({
    ...starterState,
    hasCompletedCreation: false,
    loadout: { ...starterState.loadout, pet: null, petId: null, hasCompletedCreation: false },
  });
  const res = await postJson<{
    token: string;
    playerId: string;
    username: string;
    email?: string | null;
    isNewAccount?: boolean;
    profile: SavedProfilePayload | null;
    storageMode: 'supabase' | 'local_json';
  }>('/auth/google-sync', { accessToken, starterProfile });

  if (!res.ok) return res;
  const { token, playerId, username: savedUser, email, isNewAccount, profile, storageMode } = res.data;
  const hydrated = hydratePlayerStateFromSave(profile ?? starterProfile, savedUser);
  if (isNewAccount) {
    hydrated.hasCompletedCreation = false;
    hydrated.loadout.hasCompletedCreation = false;
  }
  return {
    ok: true,
    session: { token, playerId, username: savedUser, email: email ?? null, storageMode },
    playerState: hydrated,
    isNewAccount: Boolean(isNewAccount),
  };
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

export async function sandboxTopUpApi(
  session: AuthSession | null,
  sku: string
): Promise<
  | { ok: true; diamondsGranted: number; villagePassUntil: number | null; label: string }
  | { ok: false; error: string }
> {
  const res = await postJson<{
    diamondsGranted: number;
    villagePassUntil: number | null;
    label: string;
  }>('/payments/sandbox-topup', { sku }, session?.token);
  if (!res.ok) return res;
  return {
    ok: true,
    diamondsGranted: res.data.diamondsGranted,
    villagePassUntil: res.data.villagePassUntil,
    label: res.data.label,
  };
}

export async function reforgeItemApi(
  session: AuthSession | null,
  payload: {
    category: 'weapon' | 'armor';
    currentPrefix?: string | null;
    walletCoins: number;
    playerName: string;
    itemTierPower?: number;
  }
): Promise<
  | {
      ok: true;
      costCoins: number;
      modifier: { id: string; name: string; khmerName: string; tier: string; summary: string };
    }
  | { ok: false; error: string }
> {
  const res = await postJson<{
    costCoins: number;
    modifier: { id: string; name: string; khmerName: string; tier: string; summary: string };
  }>('/reforge', payload, session?.token);
  if (!res.ok) return res;
  return { ok: true, costCoins: res.data.costCoins, modifier: res.data.modifier };
}

export async function bankActionApi(
  session: AuthSession | null,
  action: 'deposit' | 'withdraw',
  payload: { amount: number; walletCoins: number; bankCoins: number }
): Promise<
  | { ok: true; walletCoins: number; bankCoins: number; message: string }
  | { ok: false; error: string }
> {
  const res = await postJson<{ walletCoins: number; bankCoins: number; message: string }>(
    `/bank/${action}`,
    payload,
    session?.token
  );
  if (!res.ok) return res;
  return {
    ok: true,
    walletCoins: res.data.walletCoins,
    bankCoins: res.data.bankCoins,
    message: res.data.message,
  };
}

export async function fetchTickerEventsApi(): Promise<Array<{ id: string; text: string }>> {
  try {
    const res = await fetch(`${getApiBase()}/ticker`);
    if (!res.ok) return [];
    const json = (await res.json()) as { events?: Array<{ id: string; text: string }> };
    return Array.isArray(json.events) ? json.events : [];
  } catch {
    return [];
  }
}

// ==================== UPDATE 1.5 KROM GUILD & VILLAGE CHEER REST CLIENT ====================

const LOCAL_KROMS_KEY = 'phum_khnhom_local_kroms_v1';

function loadLocalKroms(): KromGuild[] {
  const now = new Date().toISOString();
  const seeds: KromGuild[] = [
    {
      id: 'krom_angkor_vanguard',
      name: 'Angkor Vanguard',
      tag: 'ANGK',
      leaderName: 'Sovann_Angkor',
      level: 4,
      xp: 950,
      treasuryCoins: 3400,
      members: [
        { playerId: 'seed_sovann', username: 'Sovann_Angkor', role: 'leader', donatedCoins: 2400, joinedAt: now },
        { playerId: 'seed_vireak', username: 'Vireak_Lbokator', role: 'member', donatedCoins: 1000, joinedAt: now },
      ],
      createdAt: now,
    },
    {
      id: 'krom_phum_lotus',
      name: 'Phum Lotus Farmers',
      tag: 'PHUM',
      leaderName: 'Bopha_Lotus',
      level: 3,
      xp: 620,
      treasuryCoins: 2150,
      members: [
        { playerId: 'seed_bopha', username: 'Bopha_Lotus', role: 'leader', donatedCoins: 1550, joinedAt: now },
        { playerId: 'seed_kampuchea', username: 'Kampuchea_Farm', role: 'member', donatedCoins: 600, joinedAt: now },
      ],
      createdAt: now,
    },
  ];
  if (typeof window === 'undefined' || !window.localStorage) return seeds;
  try {
    const raw = window.localStorage.getItem(LOCAL_KROMS_KEY);
    if (!raw) return seeds;
    const parsed = JSON.parse(raw) as KromGuild[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seeds;
  } catch {
    return seeds;
  }
}

function saveLocalKroms(kroms: KromGuild[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_KROMS_KEY, JSON.stringify(kroms));
  } catch {
    // Ignore storage quota
  }
}

export async function fetchKromsApi(): Promise<KromGuild[]> {
  try {
    const res = await fetch(`${getApiBase()}/kroms`);
    if (res.ok) {
      const json = (await res.json()) as { kroms?: KromGuild[] };
      if (Array.isArray(json.kroms)) return json.kroms;
    }
  } catch {
    // Offline fallback
  }
  return loadLocalKroms();
}

export async function fetchKromByIdApi(id: string): Promise<KromGuild | null> {
  try {
    const res = await fetch(`${getApiBase()}/krom/${encodeURIComponent(id)}`);
    if (res.ok) {
      const json = (await res.json()) as { krom?: KromGuild };
      if (json.krom) return json.krom;
    }
  } catch {
    // Offline fallback
  }
  return loadLocalKroms().find((k) => k.id === id || k.tag.toUpperCase() === id.toUpperCase()) ?? null;
}

export async function createKromApi(
  session: AuthSession | null,
  payload: { name: string; tag: string; username: string }
): Promise<{ ok: true; krom: KromGuild } | { ok: false; error: string }> {
  const res = await postJson<{ krom: KromGuild }>('/krom/create', payload, session?.token);
  if (res.ok) return { ok: true, krom: res.data.krom };
  // Graceful offline creation when local server isn't running
  const kroms = loadLocalKroms();
  const tag = payload.tag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  if (kroms.some((k) => k.tag.toUpperCase() === tag)) {
    return { ok: false, error: `Guild Tag [${tag}] is already taken.` };
  }
  const now = new Date().toISOString();
  const krom: KromGuild = {
    id: `krom_${Date.now().toString(36)}`,
    name: payload.name.trim(),
    tag,
    leaderName: payload.username,
    level: 1,
    xp: 0,
    treasuryCoins: 0,
    members: [
      {
        playerId: session?.playerId ?? 'guest',
        username: payload.username,
        role: 'leader',
        donatedCoins: 0,
        joinedAt: now,
      },
    ],
    createdAt: now,
  };
  kroms.push(krom);
  saveLocalKroms(kroms);
  return { ok: true, krom };
}

export async function joinKromApi(
  session: AuthSession | null,
  payload: { kromId?: string; tag?: string; username: string }
): Promise<{ ok: true; krom: KromGuild } | { ok: false; error: string }> {
  const res = await postJson<{ krom: KromGuild }>('/krom/join', payload, session?.token);
  if (res.ok) return { ok: true, krom: res.data.krom };
  const kroms = loadLocalKroms();
  const target = kroms.find(
    (k) => (payload.kromId && k.id === payload.kromId) || (payload.tag && k.tag === payload.tag)
  );
  if (!target) return { ok: false, error: 'Krom guild not found.' };
  if (!target.members.some((m) => m.username.toLowerCase() === payload.username.toLowerCase())) {
    target.members.push({
      playerId: session?.playerId ?? 'guest',
      username: payload.username,
      role: 'member',
      donatedCoins: 0,
      joinedAt: new Date().toISOString(),
    });
  }
  saveLocalKroms(kroms);
  return { ok: true, krom: target };
}

export async function donateKromApi(
  session: AuthSession | null,
  payload: { kromId: string; username: string; coins: number; cropValue?: number }
): Promise<{ ok: true; krom: KromGuild; leveledUp: boolean } | { ok: false; error: string }> {
  const res = await postJson<{ krom: KromGuild; leveledUp: boolean }>(
    '/krom/donate',
    payload,
    session?.token
  );
  if (res.ok) return { ok: true, krom: res.data.krom, leveledUp: res.data.leveledUp };
  const kroms = loadLocalKroms();
  const target = kroms.find((k) => k.id === payload.kromId || k.tag === payload.kromId);
  if (!target) return { ok: false, error: 'Krom guild not found.' };
  const add = Math.max(10, Math.floor((payload.coins || 0) + (payload.cropValue || 0)));
  target.treasuryCoins += add;
  target.xp += add;
  let leveledUp = false;
  while (target.level < 10) {
    const need = computeKromBuffs(target.level).nextLevelXp;
    if (target.xp >= need) {
      target.xp -= need;
      target.level += 1;
      leveledUp = true;
    } else {
      break;
    }
  }
  const m = target.members.find((mem) => mem.username.toLowerCase() === payload.username.toLowerCase());
  if (m) m.donatedCoins += add;
  saveLocalKroms(kroms);
  return { ok: true, krom: target, leveledUp };
}

export async function fetchActiveDungeonFightsApi(): Promise<ActiveDungeonFightInfo[]> {
  try {
    const res = await fetch(`${getApiBase()}/dungeon/active`);
    if (res.ok) {
      const json = (await res.json()) as { fights?: ActiveDungeonFightInfo[] };
      if (Array.isArray(json.fights) && json.fights.length > 0) {
        return json.fights;
      }
    }
  } catch {
    // Offline fallback below
  }
  // Always include a live solo/offline simulation fight so players testing alone can drop Village Cheers!
  return [
    {
      roomId: 'sim_yeak_thmor_live',
      partyId: 'sim_party_1',
      bossId: 'yeak_thmor',
      bossName: 'Yeak Thmor Prasat (Stone Guardian)',
      difficulty: 'mythic',
      playerName: 'Vireak_Lbokator',
      bossHp: 11880,
      bossMaxHp: 27000,
      playerCount: 2,
      isSimulation: true,
    },
    {
      roomId: 'sim_sdech_kongkaeb_live',
      partyId: 'sim_party_2',
      bossId: 'sdech_kongkaeb',
      bossName: 'Sdech Kongkaeb (King Frog)',
      difficulty: 'expert',
      playerName: 'Bopha_Lotus',
      bossHp: 3915,
      bossMaxHp: 6750,
      playerCount: 1,
      isSimulation: true,
    },
  ];
}

export async function sendVillageCheerApi(
  session: AuthSession | null,
  roomId: string,
  senderName: string
): Promise<{ ok: boolean; delivered: boolean }> {
  const res = await postJson<{ delivered: boolean }>(
    '/dungeon/cheer',
    { roomId, senderName },
    session?.token
  );
  return res.ok ? { ok: true, delivered: res.data.delivered } : { ok: true, delivered: false };
}

// ==================== UPDATE 1.6 PLAYER-RUN TUK-TUK FOOD CARTS API ====================

const LOCAL_CARTS_KEY = 'phum_khnhom_tuktuk_carts_v1';

function createDefaultOfflineCarts(): TukTukCartListing[] {
  return [
    {
      cartId: 'cart_demo_chef_dara',
      ownerId: 'npc_chef_dara',
      ownerName: 'Chef Dara',
      ownerKromTag: 'PHUM',
      signTitle: "Chef Dara's Hot Snacks",
      mapId: 'temple_district',
      x: 655,
      y: 620,
      items: [
        {
          itemId: 'snack_num_pang',
          name: 'Num Pang',
          icon: '🥖',
          quantity: 12,
          priceCoins: 55,
          quality: 'normal',
          summary: 'Instant +60 HP',
        },
        {
          itemId: 'snack_pepper_skewer',
          name: 'Kampot Pepper Skewers',
          icon: '🍢',
          quantity: 8,
          priceCoins: 175,
          quality: 'gold_star',
          summary: '+25% ATK (4m)',
        },
        {
          itemId: 'elixir_naga',
          name: 'Elixir of the Naga',
          icon: '🧪',
          quantity: 4,
          priceCoins: 650,
          quality: 'normal',
          summary: '+30% Max HP & +10% Lifesteal (5m)',
        },
      ],
      totalSalesCoins: 1420,
      totalItemsSold: 9,
      openedAt: Date.now() - 3600_000,
      isDemo: true,
    },
  ];
}

function loadLocalTukTukCarts(): TukTukCartListing[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_CARTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as TukTukCartListing[];
    }
  } catch {
    // ignore
  }
  const seeded = createDefaultOfflineCarts();
  saveLocalTukTukCarts(seeded);
  return seeded;
}

function saveLocalTukTukCarts(carts: TukTukCartListing[]): void {
  try {
    window.localStorage.setItem(LOCAL_CARTS_KEY, JSON.stringify(carts));
  } catch {
    // ignore
  }
}

export async function fetchTukTukCartsApi(mapId?: string): Promise<TukTukCartListing[]> {
  try {
    const qs = mapId ? `?mapId=${encodeURIComponent(mapId)}` : '';
    const res = await fetch(`${getApiBase()}/cart/list${qs}`);
    if (res.ok) {
      const json = (await res.json()) as { carts?: TukTukCartListing[] };
      if (Array.isArray(json.carts)) {
        saveLocalTukTukCarts(json.carts);
        return json.carts;
      }
    }
  } catch {
    // Offline fallback below
  }
  const local = loadLocalTukTukCarts();
  return mapId ? local.filter((c) => c.mapId === mapId) : local;
}

export async function openTukTukCartApi(
  token: string | undefined,
  payload: {
    ownerId: string;
    ownerName: string;
    ownerKromTag?: string;
    mapId: 'central_plaza' | 'temple_district';
    signTitle: string;
    items: TukTukCartItem[];
  }
): Promise<{ ok: boolean; cart?: TukTukCartListing; carts: TukTukCartListing[]; error?: string }> {
  const res = await postJson<{ ok: boolean; cart: TukTukCartListing; carts: TukTukCartListing[] }>(
    '/cart/open',
    payload,
    token
  );
  if (res.ok) {
    saveLocalTukTukCarts(res.data.carts);
    return { ok: true, cart: res.data.cart, carts: res.data.carts };
  }
  // Offline fallback
  const carts = loadLocalTukTukCarts();
  const spots =
    payload.mapId === 'temple_district'
      ? [
          { x: 945, y: 620 },
          { x: 655, y: 620 },
          { x: 950, y: 710 },
        ]
      : [
          { x: 985, y: 645 },
          { x: 615, y: 645 },
          { x: 995, y: 530 },
        ];
  const existingIdx = carts.findIndex(
    (c) => !c.isDemo && c.ownerId === payload.ownerId && c.ownerName === payload.ownerName
  );
  const spot = spots[carts.filter((c) => c.mapId === payload.mapId).length % spots.length] ?? spots[0];
  const cart: TukTukCartListing = {
    cartId: existingIdx >= 0 ? carts[existingIdx].cartId : `cart_local_${Date.now()}`,
    ownerId: payload.ownerId,
    ownerName: payload.ownerName,
    ownerKromTag: payload.ownerKromTag,
    signTitle: payload.signTitle || `${payload.ownerName}'s Hot Snacks`,
    mapId: payload.mapId,
    x: spot.x,
    y: spot.y,
    items: payload.items,
    totalSalesCoins: existingIdx >= 0 ? carts[existingIdx].totalSalesCoins : 0,
    totalItemsSold: existingIdx >= 0 ? carts[existingIdx].totalItemsSold : 0,
    openedAt: Date.now(),
  };
  if (existingIdx >= 0) carts[existingIdx] = cart;
  else carts.push(cart);
  saveLocalTukTukCarts(carts);
  return { ok: true, cart, carts };
}

export async function buyFromTukTukCartApi(
  token: string | undefined,
  payload: { cartId: string; itemId: string; quantity: number; buyerName: string }
): Promise<{
  ok: boolean;
  carts: TukTukCartListing[];
  purchasedItem?: TukTukCartItem;
  quantityBought?: number;
  totalPrice?: number;
  error?: string;
}> {
  const res = await postJson<{
    ok: boolean;
    carts: TukTukCartListing[];
    purchasedItem: TukTukCartItem;
    quantityBought: number;
    totalPrice: number;
  }>('/cart/buy', payload, token);
  if (res.ok) {
    saveLocalTukTukCarts(res.data.carts);
    return res.data;
  }
  const carts = loadLocalTukTukCarts();
  const cIdx = carts.findIndex((c) => c.cartId === payload.cartId);
  if (cIdx < 0) return { ok: false, carts, error: 'Food cart not found.' };
  const cart = carts[cIdx];
  const iIdx = cart.items.findIndex((i) => i.itemId === payload.itemId && i.quantity > 0);
  if (iIdx < 0) return { ok: false, carts, error: 'Item sold out!' };
  const stack = cart.items[iIdx];
  const qty = Math.max(1, Math.min(stack.quantity, payload.quantity || 1));
  const totalPrice = stack.priceCoins * qty;
  const purchasedItem: TukTukCartItem = { ...stack, quantity: qty };
  if (!cart.isDemo) {
    stack.quantity -= qty;
    if (stack.quantity <= 0) cart.items.splice(iIdx, 1);
  }
  cart.totalSalesCoins += totalPrice;
  cart.totalItemsSold += qty;
  if (!cart.isDemo && cart.items.length === 0) carts.splice(cIdx, 1);
  saveLocalTukTukCarts(carts);
  return { ok: true, carts, purchasedItem, quantityBought: qty, totalPrice };
}

export async function closeTukTukCartApi(
  token: string | undefined,
  payload: { cartId?: string; ownerId: string; ownerName: string }
): Promise<{
  ok: boolean;
  returnedItems: TukTukCartItem[];
  revenueCoins: number;
  carts: TukTukCartListing[];
  error?: string;
}> {
  const res = await postJson<{
    ok: boolean;
    returnedItems: TukTukCartItem[];
    revenueCoins: number;
    carts: TukTukCartListing[];
  }>('/cart/close', payload, token);
  if (res.ok) {
    saveLocalTukTukCarts(res.data.carts);
    return res.data;
  }
  const carts = loadLocalTukTukCarts();
  const idx = carts.findIndex(
    (c) => !c.isDemo && ((payload.cartId && c.cartId === payload.cartId) || c.ownerName === payload.ownerName)
  );
  if (idx < 0) return { ok: false, returnedItems: [], revenueCoins: 0, carts, error: 'No active cart.' };
  const [removed] = carts.splice(idx, 1);
  saveLocalTukTukCarts(carts);
  return {
    ok: true,
    returnedItems: removed.items,
    revenueCoins: removed.totalSalesCoins,
    carts,
  };
}

// ==================== UPDATE 1.7 BEST-FRIEND / COUPLE BOND RING API ====================

const LOCAL_BOND_KEY = 'phum_khnhom_bond_v1';

interface RawServerBond {
  bondId: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt?: string;
}

function toPartnerRecord(raw: RawServerBond, myName: string): BondPartnerRecord {
  const isReq = raw.requesterName.toLowerCase() === myName.toLowerCase();
  return {
    bondId: raw.bondId,
    partnerId: isReq ? raw.targetId : raw.requesterId,
    partnerName: isReq ? raw.targetName : raw.requesterName,
    status: raw.status,
    bondedAt: raw.acceptedAt || raw.createdAt,
  };
}

export async function fetchBondStatusApi(
  token: string | undefined,
  playerId: string,
  username: string
): Promise<{ activeBond: BondPartnerRecord | null; incoming: BondPartnerRecord[] }> {
  try {
    const res = await fetch(
      `${getApiBase()}/bond/status?playerId=${encodeURIComponent(playerId)}&username=${encodeURIComponent(username)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
    if (res.ok) {
      const json = (await res.json()) as {
        activeBond?: RawServerBond | null;
        incoming?: RawServerBond[];
      };
      return {
        activeBond: json.activeBond ? toPartnerRecord(json.activeBond, username) : null,
        incoming: Array.isArray(json.incoming)
          ? json.incoming.map((b) => toPartnerRecord(b, username))
          : [],
      };
    }
  } catch {
    // Offline fallback below
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_BOND_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BondPartnerRecord;
      return { activeBond: parsed.status === 'accepted' ? parsed : null, incoming: [] };
    }
  } catch {
    // ignore
  }
  return { activeBond: null, incoming: [] };
}

export async function requestBondApi(
  token: string | undefined,
  payload: {
    requesterId: string;
    requesterName: string;
    targetId?: string;
    targetName: string;
    instantAcceptDemo?: boolean;
  }
): Promise<{ ok: boolean; bond?: BondPartnerRecord; error?: string }> {
  const res = await postJson<{ ok: boolean; bond: RawServerBond }>('/bond/request', payload, token);
  if (res.ok) {
    const rec = toPartnerRecord(res.data.bond, payload.requesterName);
    try {
      window.localStorage.setItem(LOCAL_BOND_KEY, JSON.stringify(rec));
    } catch {
      // ignore
    }
    return { ok: true, bond: rec };
  }
  // Offline fallback
  const rec: BondPartnerRecord = {
    bondId: `bond_local_${Date.now()}`,
    partnerId: payload.targetId ?? `partner_${payload.targetName.toLowerCase()}`,
    partnerName: payload.targetName,
    status: payload.instantAcceptDemo ? 'accepted' : 'pending',
    bondedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(LOCAL_BOND_KEY, JSON.stringify(rec));
  } catch {
    // ignore
  }
  return { ok: true, bond: rec };
}

export async function acceptBondRequestApi(
  token: string | undefined,
  payload: { bondId: string; accepterId: string; accepterName: string }
): Promise<{ ok: boolean; bond?: BondPartnerRecord; error?: string }> {
  const res = await postJson<{ ok: boolean; bond: RawServerBond }>('/bond/accept', payload, token);
  if (res.ok) {
    const rec = toPartnerRecord(res.data.bond, payload.accepterName);
    try {
      window.localStorage.setItem(LOCAL_BOND_KEY, JSON.stringify(rec));
    } catch {
      // ignore
    }
    return { ok: true, bond: rec };
  }
  return { ok: false, error: res.error };
}
