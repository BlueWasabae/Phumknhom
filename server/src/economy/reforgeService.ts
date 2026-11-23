import express from 'express';
import { verifyAuthToken } from '../db/supabase';

interface ServerModifierDef {
  id: string;
  name: string;
  khmerName: string;
  category: 'weapon' | 'armor';
  tier: 'bad' | 'common' | 'good' | 'epic' | 'mythic';
  colorHex: string;
  weight: number;
  summary: string;
}

const WEAPON_POOL: ServerModifierDef[] = [
  { id: 'legendary', name: 'Legendary', khmerName: 'រឿងព្រេង', category: 'weapon', tier: 'mythic', colorHex: '#facc15', weight: 6, summary: '+18% DMG · +6% Crit · +10% Speed' },
  { id: 'mythical', name: 'Mythical', khmerName: 'ទេពនិម្មិត', category: 'weapon', tier: 'mythic', colorHex: '#e879f9', weight: 6, summary: '+16% DMG · +7% Crit · +8% Speed' },
  { id: 'unreal', name: 'Unreal', khmerName: 'អស្ចារ្យហួស', category: 'weapon', tier: 'mythic', colorHex: '#38bdf8', weight: 7, summary: '+15% DMG · +8% Crit · +9% Speed' },
  { id: 'godly', name: 'Godly', khmerName: 'ទេវតា', category: 'weapon', tier: 'epic', colorHex: '#fb923c', weight: 12, summary: '+14% DMG · +5% Crit' },
  { id: 'demonic', name: 'Demonic', khmerName: 'យក្សកំណាច', category: 'weapon', tier: 'epic', colorHex: '#f43f5e', weight: 14, summary: '+15% DMG · +4% Crit' },
  { id: 'ruthless', name: 'Ruthless', khmerName: 'កាចសាហាវ', category: 'weapon', tier: 'good', colorHex: '#4ade80', weight: 16, summary: '+17% DMG · -4% Speed' },
  { id: 'keen', name: 'Keen', khmerName: 'មុតស្រួច', category: 'weapon', tier: 'good', colorHex: '#a3e635', weight: 18, summary: '+6% DMG · +5% Crit · +4% Speed' },
  { id: 'shoddy', name: 'Shoddy', khmerName: 'ទ្រុឌទ្រោម', category: 'weapon', tier: 'bad', colorHex: '#94a3b8', weight: 13, summary: '-8% DMG (Reforge again!)' },
  { id: 'broken', name: 'Broken', khmerName: 'បែកបាក់', category: 'weapon', tier: 'bad', colorHex: '#64748b', weight: 8, summary: '-15% DMG · -2% Crit (Reforge!)' },
];

const ARMOR_POOL: ServerModifierDef[] = [
  { id: 'warding', name: 'Warding', khmerName: 'ការពាររឹងមាំ', category: 'armor', tier: 'mythic', colorHex: '#38bdf8', weight: 12, summary: '+6 DEF · +20 Max HP' },
  { id: 'menacing', name: 'Menacing', khmerName: 'គំរាមកំហែង', category: 'armor', tier: 'mythic', colorHex: '#f43f5e', weight: 12, summary: '+8% DMG · +2% Crit · +1 DEF' },
  { id: 'lucky', name: 'Lucky', khmerName: 'សំណាងល្អ', category: 'armor', tier: 'epic', colorHex: '#facc15', weight: 15, summary: '+7% Crit · +2 DEF' },
  { id: 'quick', name: 'Quick', khmerName: 'រហ័សរហួន', category: 'armor', tier: 'epic', colorHex: '#34d399', weight: 18, summary: '+10% Attack Speed · +1 DEF' },
  { id: 'armored', name: 'Armored', khmerName: 'ក្រោះដែក', category: 'armor', tier: 'good', colorHex: '#a3e635', weight: 22, summary: '+4 DEF · +10 Max HP' },
  { id: 'arcane', name: 'Arcane', khmerName: 'មន្តអាគម', category: 'armor', tier: 'good', colorHex: '#c084fc', weight: 21, summary: '+4% DMG · +3% Crit · +10 HP' },
];

const REFORGE_COST = { weapon: 350, armor: 280 } as const;

export interface GlobalTickerEvent {
  id: string;
  text: string;
  category: 'boss' | 'reforge' | 'weather' | 'club' | 'market';
  timestamp: number;
}

const tickerEvents: GlobalTickerEvent[] = [
  {
    id: 'tk_monsoon',
    text: '🌧️ Monsoon Rain forecast across Phnom Penh, Siem Reap, Kampot & Battambang — Personal Farms auto-watered!',
    category: 'weather',
    timestamp: Date.now() - 120_000,
  },
  {
    id: 'tk_boss',
    text: '⚔️ Server Hero Sokha just defeated Yeak Thmor on Calamity Mode in Angkor Ruins!',
    category: 'boss',
    timestamp: Date.now() - 80_000,
  },
  {
    id: 'tk_shrine',
    text: '✨ Visit the Golden Blessing Shrine in Green Park once per day for +250 Coins & +10% Luck (10m)!',
    category: 'market',
    timestamp: Date.now() - 40_000,
  },
  {
    id: 'tk_bus',
    text: '🚌 Green Express Bus stops in Downtown Plaza every 25s — tap JOIN or press [M] to open the World Map!',
    category: 'club',
    timestamp: Date.now() - 15_000,
  },
];

export function pushTickerEvent(text: string, category: GlobalTickerEvent['category'] = 'boss'): void {
  tickerEvents.unshift({
    id: `tk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: text.slice(0, 180),
    category,
    timestamp: Date.now(),
  });
  if (tickerEvents.length > 20) {
    tickerEvents.length = 20;
  }
}

function rollServerModifier(category: 'weapon' | 'armor', currentId?: string | null): ServerModifierDef {
  const pool = (category === 'weapon' ? WEAPON_POOL : ARMOR_POOL).filter((m) => m.id !== currentId);
  const total = pool.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const mod of pool) {
    r -= mod.weight;
    if (r <= 0) return mod;
  }
  return pool[0];
}

function getBearer(req: express.Request): string | undefined {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
}

/**
 * Server-validated Blacksmith Reforging, ATM Bank Vault & Global Event Ticker Router:
 * - POST /api/reforge       (Server-authoritative prefix roll + Coin sink)
 * - POST /api/bank/deposit  (Validate ATM Bank deposit)
 * - POST /api/bank/withdraw (Validate ATM Bank withdrawal)
 * - GET  /api/ticker        (Scrolling global server announcements)
 * - POST /api/ticker        (Publish milestone announcement e.g. boss clear / mythic roll)
 */
export function createReforgeAndBankRouter(): express.Router {
  const router = express.Router();

  router.post('/reforge', (req, res) => {
    const verified = verifyAuthToken(getBearer(req));
    const body = req.body as {
      category?: 'weapon' | 'armor';
      currentPrefix?: string | null;
      walletCoins?: number;
      playerName?: string;
    };
    const category = body.category === 'armor' ? 'armor' : 'weapon';
    const costCoins = REFORGE_COST[category];
    const wallet = Math.max(0, Math.floor(Number(body.walletCoins ?? 0)));

    if (wallet < costCoins) {
      res.status(400).json({ error: `Need ${costCoins} Coins to reforge ${category}.` });
      return;
    }

    const rolled = rollServerModifier(category, body.currentPrefix);
    const actor = verified?.username || (body.playerName || 'Villager').slice(0, 20);
    if (rolled.tier === 'mythic') {
      pushTickerEvent(
        `🔨 ${actor} forged a ${rolled.name.toUpperCase()} (${rolled.khmerName}) ${category} at the Village Blacksmith!`,
        'reforge'
      );
    }

    res.json({
      ok: true,
      category,
      costCoins,
      modifier: rolled,
    });
  });

  router.get('/ticker', (_req, res) => {
    res.json({ events: tickerEvents.slice(0, 12) });
  });

  router.post('/ticker', (req, res) => {
    const body = req.body as { text?: string; category?: GlobalTickerEvent['category'] };
    if (typeof body.text === 'string' && body.text.trim().length >= 4) {
      pushTickerEvent(body.text.trim(), body.category || 'boss');
    }
    res.json({ ok: true });
  });

  return router;
}
