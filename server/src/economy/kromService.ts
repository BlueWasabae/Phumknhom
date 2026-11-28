import fs from 'fs';
import path from 'path';

export const KROM_VAULT_SLOTS = 12;

export type QualityTier = 'normal' | 'gold_star';
export type KromTerritoryId = 'market_street' | 'wild_frontier' | 'koh_rong_island';

export interface KromVaultSlot {
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: QualityTier;
  depositedBy: string;
  depositedAt: string;
}

export interface KromMember {
  playerId: string;
  username: string;
  role: 'leader' | 'officer' | 'member';
  donatedCoins: number;
  joinedAt: string;
}

export interface KromGuild {
  id: string;
  name: string;
  tag: string;
  leaderName: string;
  level: number;
  xp: number;
  treasuryCoins: number;
  members: KromMember[];
  vault?: Array<KromVaultSlot | null>;
  trophyBosses?: string[];
  targetTerritoryId?: KromTerritoryId;
  createdAt: string;
}

function nextKromLevelXp(level: number): number {
  const safe = Math.max(1, Math.min(10, Math.floor(level)));
  return safe * 1000;
}

const DATA_FILE = path.resolve(__dirname, '../../data/kroms.json');

function createEmptyVault(): Array<KromVaultSlot | null> {
  return Array.from({ length: KROM_VAULT_SLOTS }, () => null);
}

function normalizeVault(vault?: Array<KromVaultSlot | null>): Array<KromVaultSlot | null> {
  const out = createEmptyVault();
  if (Array.isArray(vault)) {
    for (let i = 0; i < Math.min(KROM_VAULT_SLOTS, vault.length); i++) {
      const slot = vault[i];
      if (slot && typeof slot.itemId === 'string' && slot.quantity > 0) {
        out[i] = { ...slot };
      }
    }
  }
  return out;
}

function normalizeGuild(g: KromGuild): KromGuild {
  return {
    ...g,
    vault: normalizeVault(g.vault),
    trophyBosses: Array.isArray(g.trophyBosses) ? Array.from(new Set(g.trophyBosses)) : [],
    targetTerritoryId:
      g.targetTerritoryId === 'wild_frontier' || g.targetTerritoryId === 'koh_rong_island'
        ? g.targetTerritoryId
        : 'market_street',
  };
}

function seedStarterKroms(): KromGuild[] {
  const now = new Date().toISOString();
  const angkorVault = createEmptyVault();
  angkorVault[0] = {
    itemId: 'crop_phka_rumduol',
    itemName: 'Phka Rumduol Jasmine Rice',
    quantity: 5,
    quality: 'gold_star',
    depositedBy: 'Sovann_Angkor',
    depositedAt: now,
  };
  angkorVault[1] = {
    itemId: 'snack_num_pang',
    itemName: 'Num Pang',
    quantity: 4,
    quality: 'normal',
    depositedBy: 'Bopha_Lotus',
    depositedAt: now,
  };
  angkorVault[2] = {
    itemId: 'ore_laterite_iron',
    itemName: 'Laterite Iron Ore',
    quantity: 6,
    quality: 'normal',
    depositedBy: 'Vireak_Lbokator',
    depositedAt: now,
  };

  const phumVault = createEmptyVault();
  phumVault[0] = {
    itemId: 'crop_trakuon',
    itemName: 'Trakuon Morning Glory',
    quantity: 8,
    quality: 'normal',
    depositedBy: 'Kampuchea_Farm',
    depositedAt: now,
  };
  phumVault[1] = {
    itemId: 'snack_kafe',
    itemName: 'Iced Kafe',
    quantity: 3,
    quality: 'normal',
    depositedBy: 'Sokha_SiemReap',
    depositedAt: now,
  };

  return [
    {
      id: 'krom_angkor_vanguard',
      name: 'Angkor Vanguard',
      tag: 'ANGK',
      leaderName: 'Sovann_Angkor',
      level: 4,
      xp: 380,
      treasuryCoins: 5400,
      members: [
        {
          playerId: 'seed_sovann',
          username: 'Sovann_Angkor',
          role: 'leader',
          donatedCoins: 3200,
          joinedAt: now,
        },
        {
          playerId: 'seed_bopha',
          username: 'Bopha_Lotus',
          role: 'officer',
          donatedCoins: 1400,
          joinedAt: now,
        },
        {
          playerId: 'seed_vireak',
          username: 'Vireak_Lbokator',
          role: 'member',
          donatedCoins: 800,
          joinedAt: now,
        },
      ],
      vault: angkorVault,
      trophyBosses: ['sdech_kongkaeb', 'arp_prey_chrov', 'yeak_thmor', 'neak_reach'],
      targetTerritoryId: 'market_street',
      createdAt: now,
    },
    {
      id: 'krom_phum_farmers',
      name: 'Golden Rice Growers',
      tag: 'PHUM',
      leaderName: 'Kampuchea_Farm',
      level: 3,
      xp: 190,
      treasuryCoins: 2950,
      members: [
        {
          playerId: 'seed_kampuchea',
          username: 'Kampuchea_Farm',
          role: 'leader',
          donatedCoins: 2100,
          joinedAt: now,
        },
        {
          playerId: 'seed_sokha',
          username: 'Sokha_SiemReap',
          role: 'member',
          donatedCoins: 850,
          joinedAt: now,
        },
      ],
      vault: phumVault,
      trophyBosses: ['sdech_kongkaeb', 'yeak_thmor'],
      targetTerritoryId: 'wild_frontier',
      createdAt: now,
    },
  ];
}

function loadKroms(): KromGuild[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as KromGuild[]).map(normalizeGuild);
      }
    }
  } catch {
    // fallback to seed
  }
  const seeded = seedStarterKroms();
  saveKroms(seeded);
  return seeded;
}

function saveKroms(kroms: KromGuild[]): void {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(kroms, null, 2), 'utf8');
  } catch (err) {
    console.warn('[KromService] Failed to persist kroms.json:', err);
  }
}

export function listKroms(): KromGuild[] {
  return loadKroms().sort((a, b) => b.level - a.level || b.treasuryCoins - a.treasuryCoins);
}

export function getKromById(idOrTag: string): KromGuild | null {
  const key = idOrTag.trim().toLowerCase();
  return (
    loadKroms().find(
      (k) => k.id.toLowerCase() === key || k.tag.toLowerCase() === key
    ) ?? null
  );
}

export function createKrom(input: {
  name?: string;
  tag?: string;
  playerId: string;
  username: string;
}): { ok: true; krom: KromGuild } | { ok: false; error: string } {
  const name = (input.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 26);
  const tag = (input.tag ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);

  if (name.length < 3) {
    return { ok: false, error: 'Krom name must be at least 3 characters.' };
  }
  if (tag.length < 2) {
    return { ok: false, error: 'Krom tag must be 2–4 letters or numbers (e.g. ANGK).' };
  }

  const kroms = loadKroms();
  if (kroms.some((k) => k.tag.toUpperCase() === tag)) {
    return { ok: false, error: `Krom tag [${tag}] is already taken.` };
  }
  if (kroms.some((k) => k.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `Krom name "${name}" already exists.` };
  }

  // Remove player from any previous Krom cleanly
  for (const k of kroms) {
    k.members = k.members.filter(
      (m) => m.playerId !== input.playerId && m.username.toLowerCase() !== input.username.toLowerCase()
    );
  }

  const now = new Date().toISOString();
  const krom: KromGuild = {
    id: `krom_${tag.toLowerCase()}_${Date.now().toString(36)}`,
    name,
    tag,
    leaderName: input.username,
    level: 1,
    xp: 0,
    treasuryCoins: 0,
    members: [
      {
        playerId: input.playerId,
        username: input.username,
        role: 'leader',
        donatedCoins: 0,
        joinedAt: now,
      },
    ],
    vault: createEmptyVault(),
    trophyBosses: [],
    targetTerritoryId: 'market_street',
    createdAt: now,
  };

  kroms.push(krom);
  saveKroms(kroms);
  return { ok: true, krom };
}

export function joinKrom(input: {
  kromId?: string;
  tag?: string;
  playerId: string;
  username: string;
}): { ok: true; krom: KromGuild } | { ok: false; error: string } {
  const kroms = loadKroms();
  const key = (input.kromId || input.tag || '').trim().toLowerCase();
  const target = kroms.find(
    (k) => k.id.toLowerCase() === key || k.tag.toLowerCase() === key
  );
  if (!target) {
    return { ok: false, error: 'Krom guild not found.' };
  }
  if (target.members.length >= 30) {
    return { ok: false, error: 'This Krom is full (30/30 members).' };
  }

  // Leave other guilds if joining a new one
  for (const k of kroms) {
    if (k.id !== target.id) {
      k.members = k.members.filter(
        (m) => m.playerId !== input.playerId && m.username.toLowerCase() !== input.username.toLowerCase()
      );
    }
  }

  const existing = target.members.find(
    (m) => m.playerId === input.playerId || m.username.toLowerCase() === input.username.toLowerCase()
  );
  if (!existing) {
    target.members.push({
      playerId: input.playerId,
      username: input.username,
      role: 'member',
      donatedCoins: 0,
      joinedAt: new Date().toISOString(),
    });
  }

  saveKroms(kroms);
  return { ok: true, krom: target };
}

export function donateToKrom(input: {
  kromId: string;
  playerId: string;
  username: string;
  coins: number;
  cropValue?: number;
}): { ok: true; krom: KromGuild; leveledUp: boolean } | { ok: false; error: string } {
  const kroms = loadKroms();
  const target = kroms.find(
    (k) => k.id === input.kromId || k.tag.toLowerCase() === input.kromId.toLowerCase()
  );
  if (!target) {
    return { ok: false, error: 'Krom guild not found.' };
  }

  const donationValue = Math.max(0, Math.floor((input.coins || 0) + (input.cropValue || 0)));
  if (donationValue < 10) {
    return { ok: false, error: 'Minimum Shrine donation is 10 Coins worth.' };
  }

  target.treasuryCoins += donationValue;
  target.xp += donationValue;
  let leveledUp = false;
  while (target.level < 10) {
    const need = nextKromLevelXp(target.level);
    if (target.xp >= need) {
      target.xp -= need;
      target.level += 1;
      leveledUp = true;
    } else {
      break;
    }
  }

  let member = target.members.find(
    (m) => m.playerId === input.playerId || m.username.toLowerCase() === input.username.toLowerCase()
  );
  if (!member) {
    member = {
      playerId: input.playerId,
      username: input.username,
      role: 'member',
      donatedCoins: 0,
      joinedAt: new Date().toISOString(),
    };
    target.members.push(member);
  }
  member.donatedCoins += donationValue;

  saveKroms(kroms);
  return { ok: true, krom: target, leveledUp };
}

export function creditKromTreasury(kromIdOrTag: string, coins: number): KromGuild | null {
  const add = Math.max(1, Math.floor(coins));
  const kroms = loadKroms();
  const target = kroms.find(
    (k) => k.id === kromIdOrTag || k.tag.toLowerCase() === kromIdOrTag.toLowerCase()
  );
  if (!target) return null;
  target.treasuryCoins += add;
  target.xp += Math.max(1, Math.floor(add / 2));
  while (target.level < 10) {
    const need = nextKromLevelXp(target.level);
    if (target.xp >= need) {
      target.xp -= need;
      target.level += 1;
    } else {
      break;
    }
  }
  saveKroms(kroms);
  return target;
}

export function depositToKromVault(input: {
  kromId: string;
  username: string;
  itemId: string;
  itemName: string;
  quantity: number;
  quality?: QualityTier;
}): { ok: true; krom: KromGuild; slotIndex: number } | { ok: false; error: string } {
  const qty = Math.max(1, Math.min(99, Math.floor(input.quantity || 1)));
  if (!input.itemId || !input.itemName) {
    return { ok: false, error: 'Missing item details.' };
  }

  const kroms = loadKroms();
  const target = kroms.find(
    (k) => k.id === input.kromId || k.tag.toLowerCase() === input.kromId.toLowerCase()
  );
  if (!target) {
    return { ok: false, error: 'Krom guild not found.' };
  }

  const vault = normalizeVault(target.vault);
  const quality: QualityTier = input.quality === 'gold_star' ? 'gold_star' : 'normal';

  // Stack onto matching item+quality slot first
  const stackIdx = vault.findIndex(
    (s) => s && s.itemId === input.itemId && (s.quality ?? 'normal') === quality
  );
  if (stackIdx >= 0 && vault[stackIdx]) {
    vault[stackIdx] = {
      ...vault[stackIdx]!,
      quantity: vault[stackIdx]!.quantity + qty,
      depositedBy: input.username,
      depositedAt: new Date().toISOString(),
    };
    target.vault = vault;
    saveKroms(kroms);
    return { ok: true, krom: target, slotIndex: stackIdx };
  }

  const emptyIdx = vault.findIndex((s) => s === null);
  if (emptyIdx < 0) {
    return { ok: false, error: 'Krom Shared Vault is full (12/12 slots)!' };
  }

  vault[emptyIdx] = {
    itemId: input.itemId,
    itemName: input.itemName.slice(0, 48),
    quantity: qty,
    quality,
    depositedBy: input.username.slice(0, 24),
    depositedAt: new Date().toISOString(),
  };
  target.vault = vault;
  saveKroms(kroms);
  return { ok: true, krom: target, slotIndex: emptyIdx };
}

export function withdrawFromKromVault(input: {
  kromId: string;
  slotIndex: number;
  quantity?: number;
}):
  | { ok: true; krom: KromGuild; withdrawn: KromVaultSlot }
  | { ok: false; error: string } {
  const idx = Math.floor(input.slotIndex);
  if (idx < 0 || idx >= KROM_VAULT_SLOTS) {
    return { ok: false, error: 'Invalid vault slot.' };
  }

  const kroms = loadKroms();
  const target = kroms.find(
    (k) => k.id === input.kromId || k.tag.toLowerCase() === input.kromId.toLowerCase()
  );
  if (!target) {
    return { ok: false, error: 'Krom guild not found.' };
  }

  const vault = normalizeVault(target.vault);
  const slot = vault[idx];
  if (!slot || slot.quantity <= 0) {
    return { ok: false, error: 'That vault slot is empty.' };
  }

  const take = Math.max(1, Math.min(slot.quantity, Math.floor(input.quantity ?? slot.quantity)));
  const withdrawn: KromVaultSlot = { ...slot, quantity: take };
  if (slot.quantity - take <= 0) {
    vault[idx] = null;
  } else {
    vault[idx] = { ...slot, quantity: slot.quantity - take };
  }

  target.vault = vault;
  saveKroms(kroms);
  return { ok: true, krom: target, withdrawn };
}

export function recordKromBossTrophy(input: {
  kromId: string;
  bossId: string;
}): { ok: true; krom: KromGuild; isNewTrophy: boolean } | { ok: false; error: string } {
  const kroms = loadKroms();
  const target = kroms.find(
    (k) => k.id === input.kromId || k.tag.toLowerCase() === input.kromId.toLowerCase()
  );
  if (!target) return { ok: false, error: 'Krom guild not found.' };

  const current = Array.isArray(target.trophyBosses) ? target.trophyBosses : [];
  const isNewTrophy = !current.includes(input.bossId);
  if (isNewTrophy) {
    target.trophyBosses = [...current, input.bossId];
    saveKroms(kroms);
  }
  return { ok: true, krom: target, isNewTrophy };
}

export function setKromTargetTerritory(input: {
  kromId: string;
  territoryId: KromTerritoryId;
}): { ok: true; krom: KromGuild } | { ok: false; error: string } {
  const kroms = loadKroms();
  const target = kroms.find(
    (k) => k.id === input.kromId || k.tag.toLowerCase() === input.kromId.toLowerCase()
  );
  if (!target) return { ok: false, error: 'Krom guild not found.' };

  target.targetTerritoryId = input.territoryId;
  saveKroms(kroms);
  return { ok: true, krom: target };
}
