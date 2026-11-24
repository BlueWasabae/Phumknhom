import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  createdAt: string;
}

function getNextKromLevelXp(level: number): number {
  return Math.max(1, level) * 600;
}

const KROM_DB_PATH = path.resolve(__dirname, '../../data/kroms.json');

interface KromDbFile {
  kroms: KromGuild[];
}

function defaultSeedKroms(): KromGuild[] {
  const now = new Date().toISOString();
  return [
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
}

function readKromDb(): KromDbFile {
  try {
    if (!fs.existsSync(KROM_DB_PATH)) {
      const seeded: KromDbFile = { kroms: defaultSeedKroms() };
      writeKromDb(seeded);
      return seeded;
    }
    const raw = fs.readFileSync(KROM_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<KromDbFile>;
    if (!Array.isArray(parsed.kroms) || parsed.kroms.length === 0) {
      return { kroms: defaultSeedKroms() };
    }
    return { kroms: parsed.kroms };
  } catch {
    return { kroms: defaultSeedKroms() };
  }
}

function writeKromDb(db: KromDbFile): void {
  const dir = path.dirname(KROM_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(KROM_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export function normalizeKromTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  if (clean.length < 3 || clean.length > 4) return null;
  return clean;
}

export function normalizeKromName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/\s+/g, ' ').trim().slice(0, 28);
  if (clean.length < 3) return null;
  return clean;
}

export function listKroms(): KromGuild[] {
  const db = readKromDb();
  return [...db.kroms].sort((a, b) => b.level - a.level || b.treasuryCoins - a.treasuryCoins);
}

export function getKromById(idOrTag: string): KromGuild | null {
  const clean = (idOrTag || '').trim();
  if (!clean) return null;
  const db = readKromDb();
  return (
    db.kroms.find(
      (k) => k.id === clean || k.tag.toUpperCase() === clean.toUpperCase()
    ) ?? null
  );
}

export function createKrom(params: {
  name: unknown;
  tag: unknown;
  playerId: string;
  username: string;
}): { ok: true; krom: KromGuild } | { ok: false; error: string } {
  const name = normalizeKromName(params.name);
  if (!name) return { ok: false, error: 'Krom name must be 3–28 characters.' };
  const tag = normalizeKromTag(params.tag);
  if (!tag) return { ok: false, error: 'Guild Tag must be 3–4 letters or digits (e.g., ANGK, PHUM).' };

  const db = readKromDb();
  if (db.kroms.some((k) => k.tag.toUpperCase() === tag)) {
    return { ok: false, error: `Guild Tag [${tag}] is already taken.` };
  }

  const now = new Date().toISOString();
  const krom: KromGuild = {
    id: `krom_${crypto.randomBytes(6).toString('hex')}`,
    name,
    tag,
    leaderName: params.username || 'PhumHero',
    level: 1,
    xp: 0,
    treasuryCoins: 0,
    members: [
      {
        playerId: params.playerId || `guest_${Date.now()}`,
        username: params.username || 'PhumHero',
        role: 'leader',
        donatedCoins: 0,
        joinedAt: now,
      },
    ],
    createdAt: now,
  };

  // Remove player from previous Krom if switching
  for (const existing of db.kroms) {
    existing.members = existing.members.filter(
      (m) => m.username.toLowerCase() !== krom.leaderName.toLowerCase()
    );
  }

  db.kroms.push(krom);
  writeKromDb(db);
  return { ok: true, krom };
}

export function joinKrom(params: {
  kromId?: string;
  tag?: string;
  playerId: string;
  username: string;
}): { ok: true; krom: KromGuild } | { ok: false; error: string } {
  const db = readKromDb();
  const target = db.kroms.find(
    (k) =>
      (params.kromId && k.id === params.kromId) ||
      (params.tag && k.tag.toUpperCase() === params.tag.trim().toUpperCase())
  );
  if (!target) {
    return { ok: false, error: 'Krom guild not found.' };
  }

  const uname = (params.username || 'PhumHero').trim();
  for (const k of db.kroms) {
    if (k.id !== target.id) {
      k.members = k.members.filter((m) => m.username.toLowerCase() !== uname.toLowerCase());
    }
  }
  if (!target.members.some((m) => m.username.toLowerCase() === uname.toLowerCase())) {
    target.members.push({
      playerId: params.playerId || `guest_${Date.now()}`,
      username: uname,
      role: 'member',
      donatedCoins: 0,
      joinedAt: new Date().toISOString(),
    });
  }
  writeKromDb(db);
  return { ok: true, krom: target };
}

export function donateToKrom(params: {
  kromId: string;
  playerId: string;
  username: string;
  coins: number;
  cropValue?: number;
}): { ok: true; krom: KromGuild; leveledUp: boolean } | { ok: false; error: string } {
  const db = readKromDb();
  const target = db.kroms.find(
    (k) => k.id === params.kromId || k.tag.toUpperCase() === params.kromId.toUpperCase()
  );
  if (!target) {
    return { ok: false, error: 'Krom guild not found.' };
  }

  const contribution = Math.max(10, Math.floor((params.coins || 0) + (params.cropValue || 0)));
  target.treasuryCoins += contribution;
  target.xp += contribution;

  let leveledUp = false;
  while (target.level < 10) {
    const needed = getNextKromLevelXp(target.level);
    if (target.xp >= needed) {
      target.xp -= needed;
      target.level += 1;
      leveledUp = true;
    } else {
      break;
    }
  }
  if (target.level >= 10) {
    target.level = 10;
    target.xp = 0;
  }

  const uname = (params.username || 'PhumHero').trim();
  const member = target.members.find((m) => m.username.toLowerCase() === uname.toLowerCase());
  if (member) {
    member.donatedCoins += contribution;
  } else {
    target.members.push({
      playerId: params.playerId || `guest_${Date.now()}`,
      username: uname,
      role: 'member',
      donatedCoins: contribution,
      joinedAt: new Date().toISOString(),
    });
  }

  writeKromDb(db);
  return { ok: true, krom: target, leveledUp };
}
