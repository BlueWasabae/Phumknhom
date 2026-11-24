import fs from 'fs';
import path from 'path';

export interface BondRecord {
  bondId: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt?: string;
  sharedFarmJson?: unknown;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bonds.json');

let bondsCache: BondRecord[] | null = null;

function ensureLoaded(): BondRecord[] {
  if (bondsCache) return bondsCache;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        bondsCache = parsed;
        return bondsCache;
      }
    }
  } catch (err) {
    console.warn('[Phum Server] Failed reading bonds.json:', err);
  }
  bondsCache = [];
  return bondsCache;
}

function persist(): void {
  if (!bondsCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(bondsCache, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Phum Server] Failed writing bonds.json:', err);
  }
}

function matchesUser(id: string, name: string, targetId: string, targetName: string): boolean {
  if (id && targetId && id !== 'guest' && targetId !== 'guest' && id === targetId) return true;
  return Boolean(name && targetName && name.toLowerCase() === targetName.toLowerCase());
}

export function getBondStatusForPlayer(playerId: string, username: string): {
  activeBond: BondRecord | null;
  incoming: BondRecord[];
  outgoing: BondRecord[];
} {
  const all = ensureLoaded();
  const activeBond =
    all.find(
      (b) =>
        b.status === 'accepted' &&
        (matchesUser(b.requesterId, b.requesterName, playerId, username) ||
          matchesUser(b.targetId, b.targetName, playerId, username))
    ) ?? null;

  const incoming = all.filter(
    (b) =>
      b.status === 'pending' &&
      matchesUser(b.targetId, b.targetName, playerId, username)
  );
  const outgoing = all.filter(
    (b) =>
      b.status === 'pending' &&
      matchesUser(b.requesterId, b.requesterName, playerId, username)
  );

  return { activeBond, incoming, outgoing };
}

export function createBondRequest(input: {
  requesterId: string;
  requesterName: string;
  targetId?: string;
  targetName: string;
  instantAcceptDemo?: boolean;
}): { ok: boolean; bond?: BondRecord; error?: string } {
  const all = ensureLoaded();
  const cleanTarget = String(input.targetName || '').trim().slice(0, 24);
  const cleanReq = String(input.requesterName || 'PhumHero').trim().slice(0, 24);
  if (!cleanTarget) return { ok: false, error: 'Enter a partner username to offer the Lotus Bond Ring.' };
  if (cleanTarget.toLowerCase() === cleanReq.toLowerCase()) {
    return { ok: false, error: 'You cannot bond with yourself — pick a friend or village partner!' };
  }

  const existing = all.find(
    (b) =>
      b.status === 'accepted' &&
      (matchesUser(b.requesterId, b.requesterName, input.requesterId, cleanReq) ||
        matchesUser(b.targetId, b.targetName, input.requesterId, cleanReq))
  );
  if (existing) {
    return { ok: false, error: 'You already have an active Lotus Bond Ring partner!' };
  }

  const nowIso = new Date().toISOString();
  const bond: BondRecord = {
    bondId: `bond_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    requesterId: input.requesterId || 'guest',
    requesterName: cleanReq,
    targetId: input.targetId || `user_${cleanTarget.toLowerCase()}`,
    targetName: cleanTarget,
    status: input.instantAcceptDemo ? 'accepted' : 'pending',
    createdAt: nowIso,
    acceptedAt: input.instantAcceptDemo ? nowIso : undefined,
  };
  all.push(bond);
  persist();
  return { ok: true, bond };
}

export function acceptBondRequest(input: {
  bondId: string;
  accepterId: string;
  accepterName: string;
}): { ok: boolean; bond?: BondRecord; error?: string } {
  const all = ensureLoaded();
  const bond = all.find((b) => b.bondId === input.bondId);
  if (!bond) return { ok: false, error: 'Bond Ring offer not found.' };
  if (bond.status === 'accepted') return { ok: true, bond };

  bond.status = 'accepted';
  bond.acceptedAt = new Date().toISOString();
  if (input.accepterId && input.accepterId !== 'guest') {
    bond.targetId = input.accepterId;
  }
  if (input.accepterName) {
    bond.targetName = input.accepterName;
  }
  persist();
  return { ok: true, bond };
}

export function syncSharedCoopFarm(bondId: string, farmState: unknown): { ok: boolean; sharedFarmJson?: unknown } {
  const all = ensureLoaded();
  const bond = all.find((b) => b.bondId === bondId && b.status === 'accepted');
  if (!bond) return { ok: false };
  bond.sharedFarmJson = farmState;
  persist();
  return { ok: true, sharedFarmJson: bond.sharedFarmJson };
}

export function getSharedCoopFarm(bondId: string): unknown | null {
  const all = ensureLoaded();
  const bond = all.find((b) => b.bondId === bondId && b.status === 'accepted');
  return bond?.sharedFarmJson ?? null;
}
