import fs from 'fs';
import path from 'path';
import { creditKromTreasury, getKromById, type KromTerritoryId } from './kromService';

export interface KromTerritoryStanding {
  kromId: string;
  kromTag: string;
  kromName: string;
  points: number;
}

export interface KromTerritoryOwner {
  kromId: string;
  kromTag: string;
  kromName: string;
  claimedAt: string;
}

export interface KromTerritoryState {
  id: KromTerritoryId;
  name: string;
  khmerName: string;
  perkTitle: string;
  perkDescription: string;
  owner: KromTerritoryOwner | null;
  standings: KromTerritoryStanding[];
}

export interface KromWarSnapshot {
  weekId: string;
  endsAt: number;
  territories: KromTerritoryState[];
  lastFinalizedAt: number | null;
}

const DATA_FILE = path.resolve(__dirname, '../../data/krom_wars.json');
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface TerritoryMeta {
  id: KromTerritoryId;
  name: string;
  khmerName: string;
  perkTitle: string;
  perkDescription: string;
}

export const KROM_TERRITORIES: TerritoryMeta[] = [
  {
    id: 'market_street',
    name: 'Market Street',
    khmerName: 'វិថីផ្សារភូមិ',
    perkTitle: '2% Market Volume → Krom Shrine',
    perkDescription:
      '2% of all Village Market sales volume is automatically donated to your Krom Shrine + golden [TAG] banners fly on Market Street lamp posts!',
  },
  {
    id: 'wild_frontier',
    name: 'Wild Frontier & Caverns',
    khmerName: 'ព្រៃធំ និងគុហារ៉ែ',
    perkTitle: '+10% Mining & Foraging Luck',
    perkDescription:
      'All Krom members receive +10% Mining & Foraging Drop Luck across Wild Frontier, Mining Quarry, Bamboo Forest & Caverns + golden [TAG] War Banner!',
  },
  {
    id: 'koh_rong_island',
    name: 'Koh Rong Island',
    khmerName: 'កោះរ៉ុងទេវកថា',
    perkTitle: '+10% Fishing & Pearl Diving Yield',
    perkDescription:
      'All Krom members receive +10% Fishing & Deep-Sea Pearl Diving Coin/Pearl yield on Koh Rong Island + golden [TAG] War Banner on the pier!',
  },
];

interface PersistedWarData {
  weekId: string;
  endsAt: number;
  lastFinalizedAt: number | null;
  owners: Record<KromTerritoryId, KromTerritoryOwner | null>;
  scores: Record<KromTerritoryId, Record<string, KromTerritoryStanding>>;
}

function computeWeekId(now = Date.now()): string {
  const d = new Date(now);
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function seedWarData(): PersistedWarData {
  const now = Date.now();
  const iso = new Date(now).toISOString();
  return {
    weekId: computeWeekId(now),
    endsAt: now + ONE_WEEK_MS,
    lastFinalizedAt: null,
    owners: {
      market_street: {
        kromId: 'krom_angkor_vanguard',
        kromTag: 'ANGK',
        kromName: 'Angkor Vanguard',
        claimedAt: iso,
      },
      wild_frontier: {
        kromId: 'krom_phum_farmers',
        kromTag: 'PHUM',
        kromName: 'Golden Rice Growers',
        claimedAt: iso,
      },
      koh_rong_island: null,
    },
    scores: {
      market_street: {
        ANGK: {
          kromId: 'krom_angkor_vanguard',
          kromTag: 'ANGK',
          kromName: 'Angkor Vanguard',
          points: 420,
        },
        PHUM: {
          kromId: 'krom_phum_farmers',
          kromTag: 'PHUM',
          kromName: 'Golden Rice Growers',
          points: 310,
        },
      },
      wild_frontier: {
        PHUM: {
          kromId: 'krom_phum_farmers',
          kromTag: 'PHUM',
          kromName: 'Golden Rice Growers',
          points: 385,
        },
        ANGK: {
          kromId: 'krom_angkor_vanguard',
          kromTag: 'ANGK',
          kromName: 'Angkor Vanguard',
          points: 270,
        },
      },
      koh_rong_island: {
        ANGK: {
          kromId: 'krom_angkor_vanguard',
          kromTag: 'ANGK',
          kromName: 'Angkor Vanguard',
          points: 295,
        },
        PHUM: {
          kromId: 'krom_phum_farmers',
          kromTag: 'PHUM',
          kromName: 'Golden Rice Growers',
          points: 240,
        },
      },
    },
  };
}

function loadWarData(): PersistedWarData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Partial<PersistedWarData>;
      if (parsed && parsed.scores && parsed.owners) {
        return {
          weekId: parsed.weekId || computeWeekId(),
          endsAt: typeof parsed.endsAt === 'number' ? parsed.endsAt : Date.now() + ONE_WEEK_MS,
          lastFinalizedAt: typeof parsed.lastFinalizedAt === 'number' ? parsed.lastFinalizedAt : null,
          owners: {
            market_street: parsed.owners.market_street ?? null,
            wild_frontier: parsed.owners.wild_frontier ?? null,
            koh_rong_island: parsed.owners.koh_rong_island ?? null,
          },
          scores: {
            market_street: parsed.scores.market_street ?? {},
            wild_frontier: parsed.scores.wild_frontier ?? {},
            koh_rong_island: parsed.scores.koh_rong_island ?? {},
          },
        };
      }
    }
  } catch {
    // fallback to seed
  }
  const seeded = seedWarData();
  saveWarData(seeded);
  return seeded;
}

function saveWarData(data: PersistedWarData): void {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[KromWarService] Failed to persist krom_wars.json:', err);
  }
}

function buildSnapshot(data: PersistedWarData): KromWarSnapshot {
  const territories: KromTerritoryState[] = KROM_TERRITORIES.map((meta) => {
    const map = data.scores[meta.id] ?? {};
    const standings = Object.values(map).sort((a, b) => b.points - a.points);
    return {
      ...meta,
      owner: data.owners[meta.id] ?? null,
      standings,
    };
  });
  return {
    weekId: data.weekId,
    endsAt: data.endsAt,
    territories,
    lastFinalizedAt: data.lastFinalizedAt,
  };
}

export function getKromWarStatus(): KromWarSnapshot {
  const data = loadWarData();
  if (Date.now() >= data.endsAt) {
    return finalizeKromWarWeek().snapshot;
  }
  return buildSnapshot(data);
}

export function recordKromWarPoints(input: {
  kromId: string;
  kromTag?: string;
  kromName?: string;
  territoryId?: KromTerritoryId;
  points: number;
  source?: string;
}): { ok: true; snapshot: KromWarSnapshot; territoryId: KromTerritoryId; pointsAdded: number } | { ok: false; error: string } {
  const points = Math.max(1, Math.min(2000, Math.floor(input.points || 0)));
  if (points <= 0) {
    return { ok: false, error: 'Points must be positive.' };
  }

  const guild = getKromById(input.kromId || input.kromTag || '');
  const kromId = guild?.id ?? input.kromId;
  const kromTag = (guild?.tag ?? input.kromTag ?? '').toUpperCase().slice(0, 4);
  const kromName = guild?.name ?? input.kromName ?? 'Khmer Krom';
  if (!kromTag) {
    return { ok: false, error: 'Valid Krom membership required to earn War Points.' };
  }

  const territoryId: KromTerritoryId =
    input.territoryId === 'wild_frontier' || input.territoryId === 'koh_rong_island' || input.territoryId === 'market_street'
      ? input.territoryId
      : guild?.targetTerritoryId ?? 'market_street';

  const data = loadWarData();
  const board = data.scores[territoryId] ?? {};
  const existing = board[kromTag] ?? {
    kromId,
    kromTag,
    kromName,
    points: 0,
  };
  existing.kromId = kromId;
  existing.kromName = kromName;
  existing.points += points;
  board[kromTag] = existing;
  data.scores[territoryId] = board;
  saveWarData(data);

  return {
    ok: true,
    snapshot: buildSnapshot(data),
    territoryId,
    pointsAdded: points,
  };
}

export function finalizeKromWarWeek(): {
  snapshot: KromWarSnapshot;
  winners: Array<{ territoryId: KromTerritoryId; territoryName: string; owner: KromTerritoryOwner | null }>;
} {
  const data = loadWarData();
  const now = Date.now();
  const iso = new Date(now).toISOString();
  const winners: Array<{ territoryId: KromTerritoryId; territoryName: string; owner: KromTerritoryOwner | null }> = [];

  for (const meta of KROM_TERRITORIES) {
    const standings = Object.values(data.scores[meta.id] ?? {}).sort((a, b) => b.points - a.points);
    const top = standings[0];
    if (top && top.points > 0) {
      const owner: KromTerritoryOwner = {
        kromId: top.kromId,
        kromTag: top.kromTag,
        kromName: top.kromName,
        claimedAt: iso,
      };
      data.owners[meta.id] = owner;
      winners.push({ territoryId: meta.id, territoryName: meta.name, owner });
    } else {
      winners.push({ territoryId: meta.id, territoryName: meta.name, owner: data.owners[meta.id] });
    }
    // Reset weekly scores for the new cycle
    data.scores[meta.id] = {};
  }

  data.lastFinalizedAt = now;
  data.weekId = `${computeWeekId(now)}-${String(Math.floor((now / 1000) % 1000)).padStart(3, '0')}`;
  data.endsAt = now + ONE_WEEK_MS;
  saveWarData(data);

  return { snapshot: buildSnapshot(data), winners };
}

/**
 * Market Street Owner Perk: 2% of village market sales volume is donated directly to the reigning Krom Shrine.
 */
export function awardMarketVolumeToKromOwner(salePriceCoins: number): {
  donatedCoins: number;
  kromTag: string | null;
} {
  const data = loadWarData();
  const owner = data.owners.market_street;
  if (!owner) return { donatedCoins: 0, kromTag: null };
  const donatedCoins = Math.max(1, Math.floor(salePriceCoins * 0.02));
  creditKromTreasury(owner.kromId || owner.kromTag, donatedCoins);
  return { donatedCoins, kromTag: owner.kromTag };
}
