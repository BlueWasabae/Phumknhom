import { Client, Room } from 'colyseus';
import { ClubPlayer, ClubState } from '../schema/ClubState';
import { pushTickerEvent } from '../economy/reforgeService';

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}

interface CardObj {
  id: string;
  label: string;
  rank: number;
  suit: '♠' | '♣' | '♦' | '♥';
  suitWeight: number;
  red: boolean;
}

interface SeatedPlayer {
  sessionId: string;
  name: string;
  ready: boolean;
  cardCount: number;
  passed: boolean;
}

interface ServerClubTable {
  tableId: string;
  game: 'tien_len' | 'ouk_chaktrang' | 'bay_khom';
  stakeCoins: number;
  maxSeats: number;
  status: 'waiting' | 'playing' | 'finished';
  seats: SeatedPlayer[];
  turnIndex: number;
  potCoins: number;
  lastSummary: string;
  winnerName: string | null;
  // Tien Len private hands & table state
  hands: Map<string, CardObj[]>;
  tableCards: CardObj[];
  tableComboLabel: string;
  lastPlayBySessionId: string | null;
  mustIncludeThreeSpades: boolean;
  // Ouk Chaktrang shared board JSON
  oukBoardJson: string | null;
  oukTurnSide: 'w' | 'b';
  // Update 3.4 — Bay Khom (Khmer Mancala) 10-hole 42-seed board JSON
  bayKhomJson?: string | null;
}

const TABLE_SPECS: Array<{ tableId: string; game: 'tien_len' | 'ouk_chaktrang' | 'bay_khom'; stakeCoins: number; maxSeats: number }> = [
  { tableId: 'tl_50', game: 'tien_len', stakeCoins: 50, maxSeats: 4 },
  { tableId: 'tl_200', game: 'tien_len', stakeCoins: 200, maxSeats: 4 },
  { tableId: 'tl_1000', game: 'tien_len', stakeCoins: 1000, maxSeats: 4 },
  { tableId: 'ouk_50', game: 'ouk_chaktrang', stakeCoins: 50, maxSeats: 2 },
  { tableId: 'ouk_200', game: 'ouk_chaktrang', stakeCoins: 200, maxSeats: 2 },
  { tableId: 'ouk_1000', game: 'ouk_chaktrang', stakeCoins: 1000, maxSeats: 2 },
  { tableId: 'bk_50', game: 'bay_khom', stakeCoins: 50, maxSeats: 2 },
  { tableId: 'bk_200', game: 'bay_khom', stakeCoins: 200, maxSeats: 2 },
];

const TL_RANKS: Array<[string, number]> = [
  ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8],
  ['9', 9], ['10', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14], ['2', 15],
];
const TL_SUITS: Array<['♠' | '♣' | '♦' | '♥', number, boolean]> = [
  ['♠', 0, false], ['♣', 1, false], ['♦', 2, true], ['♥', 3, true],
];

function cardPower(c: CardObj): number {
  return c.rank * 4 + c.suitWeight;
}

function dealDeck13(count: number): { hands: CardObj[][]; starterIndex: number; requires3S: boolean } {
  const deck: CardObj[] = [];
  for (const [rl, rv] of TL_RANKS) {
    for (const [sl, sw, red] of TL_SUITS) {
      deck.push({ id: `${rl}${sl}`, label: `${rl}${sl}`, rank: rv, suit: sl, suitWeight: sw, red });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const hands: CardObj[][] = [];
  for (let p = 0; p < count; p++) {
    hands.push(deck.slice(p * 13, (p + 1) * 13).sort((a, b) => cardPower(a) - cardPower(b)));
  }
  for (let p = 0; p < count; p++) {
    if (hands[p].some((c) => c.id === '3♠')) {
      return { hands, starterIndex: p, requires3S: true };
    }
  }
  let starterIndex = 0;
  let low = Infinity;
  for (let p = 0; p < count; p++) {
    const pw = cardPower(hands[p][0]);
    if (pw < low) {
      low = pw;
      starterIndex = p;
    }
  }
  return { hands, starterIndex, requires3S: false };
}

/**
 * Synced Indoor Village Club Room (Update 2.2 — Strictly Multiplayer PvP Tables, ZERO AI):
 * - 3 Tien Len 13-Card PvP tables (50 C, 200 C, 1,000 C) with Dealer dealing 13 cards each.
 * - 3 Ouk Chaktrang PvP tables (50 C, 200 C, 1,000 C) enforcing turn-based Khmer Chess.
 * - Kla Klok 3-Dice table preserved.
 */
export class ClubRoom extends Room<ClubState> {
  maxClients = 32;
  private tables = new Map<string, ServerClubTable>();

  onCreate(options: { cityServer?: string }): void {
    const city =
      options?.cityServer === 'siem_reap' || options?.cityServer === 'kampot'
        ? options.cityServer
        : 'phnom_penh';

    const state = new ClubState();
    state.cityServer = city;
    this.setState(state);
    this.setMetadata({ cityServer: city });

    for (const spec of TABLE_SPECS) {
      this.tables.set(spec.tableId, {
        tableId: spec.tableId,
        game: spec.game,
        stakeCoins: spec.stakeCoins,
        maxSeats: spec.maxSeats,
        status: 'waiting',
        seats: [],
        turnIndex: 0,
        potCoins: 0,
        lastSummary: 'Waiting for real players to sit down & Ready (No AI).',
        winnerName: null,
        hands: new Map(),
        tableCards: [],
        tableComboLabel: '',
        lastPlayBySessionId: null,
        mustIncludeThreeSpades: false,
        oukBoardJson: null,
        oukTurnSide: 'w',
      });
    }

    this.onMessage('move', (client, payload: { x?: number; y?: number; facing?: string; isMoving?: boolean }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !payload || typeof payload !== 'object') return;
      if (typeof payload.x === 'number') p.x = Math.round(clamp(payload.x, 40, 760) * 10) / 10;
      if (typeof payload.y === 'number') p.y = Math.round(clamp(payload.y, 110, 520) * 10) / 10;
      if (payload.facing === 'up' || payload.facing === 'down' || payload.facing === 'left' || payload.facing === 'right') {
        p.facing = payload.facing;
      }
      if (typeof payload.isMoving === 'boolean') p.isMoving = payload.isMoving;
    });

    this.onMessage('chat', (client, payload: { text?: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || typeof payload?.text !== 'string') return;
      const text = payload.text.trim().slice(0, 120);
      if (!text) return;
      this.broadcast('chat', {
        sessionId: client.sessionId,
        name: p.name,
        text,
        timestamp: Date.now(),
      });
    });

    this.onMessage('emote', (client, payload: { emoji?: string }) => {
      if (typeof payload?.emoji !== 'string') return;
      this.broadcast('emote', { sessionId: client.sessionId, emoji: payload.emoji.slice(0, 8) });
    });

    // ==================== MULTI-TABLE PVP SEAT / READY / LEAVE ====================
    this.onMessage('requestTables', (client) => {
      client.send('clubTablesSnapshot', { tables: this.serializeTables() });
    });

    this.onMessage('seatTable', (client, payload: { tableId?: string }) => {
      const p = this.state.players.get(client.sessionId);
      const table = payload?.tableId ? this.tables.get(payload.tableId) : undefined;
      if (!p || !table) return;
      // Remove player from any other table first
      this.removePlayerFromAllTables(client.sessionId);
      if (table.status === 'playing' || table.seats.length >= table.maxSeats) return;
      table.seats.push({
        sessionId: client.sessionId,
        name: p.name,
        ready: false,
        cardCount: 0,
        passed: false,
      });
      table.status = 'waiting';
      table.winnerName = null;
      table.lastSummary = `${p.name} sat down (${table.seats.length}/${table.maxSeats}). Click Ready to start!`;
      this.broadcastTables();
    });

    this.onMessage('leaveTable', (client) => {
      this.removePlayerFromAllTables(client.sessionId);
      this.broadcastTables();
    });

    this.onMessage('readyTable', (client, payload: { tableId?: string; ready?: boolean }) => {
      const table = payload?.tableId ? this.tables.get(payload.tableId) : undefined;
      if (!table || table.status === 'playing') return;
      const seat = table.seats.find((s) => s.sessionId === client.sessionId);
      if (!seat) return;
      seat.ready = typeof payload?.ready === 'boolean' ? payload.ready : !seat.ready;

      // Start match automatically once >=2 real players are seated and ALL seated players are Ready!
      if (table.seats.length >= 2 && table.seats.every((s) => s.ready)) {
        this.startTableMatch(table);
      } else {
        table.lastSummary = `${seat.name} is ${seat.ready ? 'READY ✓' : 'not ready'}. Waiting for opponent(s)...`;
        this.broadcastTables();
      }
    });

    // ==================== AUTHENTIC 13-CARD TIEN LEN PVP ACTIONS ====================
    this.onMessage(
      'tienLenAction',
      (client, payload: { tableId?: string; action?: 'play' | 'pass'; cardIds?: string[]; comboLabel?: string }) => {
        const table = payload?.tableId ? this.tables.get(payload.tableId) : undefined;
        if (!table || table.game !== 'tien_len' || table.status !== 'playing') return;
        const seatIdx = table.seats.findIndex((s) => s.sessionId === client.sessionId);
        if (seatIdx < 0 || seatIdx !== table.turnIndex) return;
        const seat = table.seats[seatIdx];

        if (payload.action === 'pass') {
          if (table.tableCards.length === 0) return; // Cannot pass on fresh lead
          seat.passed = true;
          table.lastSummary = `${seat.name} passed.`;
          this.advanceTienLenTurn(table);
          this.broadcastTables();
          return;
        }

        const hand = table.hands.get(client.sessionId) ?? [];
        const chosenIds = Array.isArray(payload.cardIds) ? payload.cardIds : [];
        const playedCards = hand.filter((c) => chosenIds.includes(c.id));
        if (playedCards.length === 0 || playedCards.length !== chosenIds.length) return;

        const remaining = hand.filter((c) => !chosenIds.includes(c.id));
        table.hands.set(client.sessionId, remaining);
        seat.cardCount = remaining.length;
        table.tableCards = playedCards;
        table.tableComboLabel = String(payload.comboLabel || playedCards.map((c) => c.label).join(' ')).slice(0, 48);
        table.lastPlayBySessionId = client.sessionId;
        table.mustIncludeThreeSpades = false;
        table.lastSummary = `${seat.name} played ${table.tableComboLabel}`;
        this.state.tienLenLastPlay = table.lastSummary;

        client.send('clubPrivateHand', { tableId: table.tableId, hand: remaining });

        if (remaining.length === 0) {
          table.status = 'finished';
          table.winnerName = seat.name;
          this.state.tienLenWinner = seat.name;
          table.seats.forEach((s) => {
            s.ready = false;
          });
          table.lastSummary = `🏆 ${seat.name} cleared all 13 cards & won the ${table.potCoins.toLocaleString()} C pot!`;
          pushTickerEvent(
            `🃏 ${seat.name} won a ${table.potCoins.toLocaleString()} C PvP Tien Len table in The Club!`,
            'club'
          );
          this.broadcast('clubTablePayout', {
            tableId: table.tableId,
            game: 'tien_len',
            winnerSessionId: client.sessionId,
            winnerName: seat.name,
            potCoins: table.potCoins,
            stakeCoins: table.stakeCoins,
          });
        } else {
          this.advanceTienLenTurn(table);
        }
        this.broadcastTables();
      }
    );

    // ==================== AUTHENTIC OUK CHAKTRANG PVP MOVES ====================
    this.onMessage(
      'oukAction',
      (
        client,
        payload: {
          tableId?: string;
          boardJson?: string;
          moveNotation?: string;
          nextTurnSide?: 'w' | 'b';
          winnerSide?: 'w' | 'b' | null;
        }
      ) => {
        const table = payload?.tableId ? this.tables.get(payload.tableId) : undefined;
        if (!table || table.game !== 'ouk_chaktrang' || table.status !== 'playing') return;
        const seatIdx = table.seats.findIndex((s) => s.sessionId === client.sessionId);
        if (seatIdx < 0 || seatIdx !== table.turnIndex) return;
        const seat = table.seats[seatIdx];

        if (typeof payload.boardJson === 'string' && payload.boardJson.length < 16000) {
          table.oukBoardJson = payload.boardJson;
        }
        table.oukTurnSide = payload.nextTurnSide === 'b' ? 'b' : 'w';
        this.state.oukTurnCount += 1;
        this.state.oukLastMove = `${seat.name}: ${String(payload.moveNotation || 'Move').slice(0, 36)}`;
        table.lastSummary = this.state.oukLastMove;

        if (payload.winnerSide) {
          table.status = 'finished';
          table.winnerName = seat.name;
          table.seats.forEach((s) => {
            s.ready = false;
          });
          table.lastSummary = `🏆 ${seat.name} won Ouk Chaktrang (+${table.potCoins.toLocaleString()} C pot)!`;
          pushTickerEvent(
            `♟️ ${seat.name} won a ${table.potCoins.toLocaleString()} C PvP Ouk Chaktrang match in The Club!`,
            'club'
          );
          this.broadcast('clubTablePayout', {
            tableId: table.tableId,
            game: 'ouk_chaktrang',
            winnerSessionId: client.sessionId,
            winnerName: seat.name,
            potCoins: table.potCoins,
            stakeCoins: table.stakeCoins,
          });
        } else {
          table.turnIndex = (table.turnIndex + 1) % table.seats.length;
        }
        this.broadcastTables();
      }
    );

    // ==================== KLA KLOK (PRESERVED AS-IS) ====================
    const KLA_KLOK_FACES = ['gourd', 'crab', 'fish', 'rooster', 'shrimp', 'tiger'] as const;
    this.onMessage('klaKlokRoll', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const dice = [
        KLA_KLOK_FACES[Math.floor(Math.random() * 6)],
        KLA_KLOK_FACES[Math.floor(Math.random() * 6)],
        KLA_KLOK_FACES[Math.floor(Math.random() * 6)],
      ];
      const triple = dice[0] === dice[1] && dice[1] === dice[2];
      if (triple) {
        pushTickerEvent(`🎲 ${p.name} rolled a TRIPLE ${dice[0].toUpperCase()} jackpot at Kla Klok in The Club!`, 'club');
      }
      this.broadcast('clubTableUpdate', {
        game: 'kla_klok',
        roller: p.name,
        dice,
        triple,
        summary: `${p.name} rolled ${dice.join(' · ')}`,
      });
    });

    // Update 3.4 — Bay Khom (10-Hole Khmer Mancala, 42 Seeds) Strictly PvP Move Handler
    this.onMessage(
      'bayKhomMove',
      (
        client,
        payload: { tableId?: string; boardJson?: string; winnerIdx?: number | null; summary?: string }
      ) => {
        const table = payload?.tableId ? this.tables.get(payload.tableId) : undefined;
        if (!table || table.game !== 'bay_khom' || table.status !== 'playing') return;
        const seatIdx = table.seats.findIndex((s) => s.sessionId === client.sessionId);
        if (seatIdx !== table.turnIndex) return;
        if (typeof payload.boardJson === 'string' && payload.boardJson.length <= 4096) {
          table.bayKhomJson = payload.boardJson;
        }
        table.lastSummary = typeof payload.summary === 'string' ? payload.summary.slice(0, 140) : 'Bay Khom move played.';
        if (payload.winnerIdx === 0 || payload.winnerIdx === 1) {
          const winner = table.seats[payload.winnerIdx];
          table.status = 'finished';
          table.winnerName = winner?.name ?? 'Player';
          table.lastSummary = `🏆 ${table.winnerName} won Bay Khom (+${table.potCoins} C pot)!`;
          pushTickerEvent(`🥣 ${table.winnerName} won a ${table.potCoins} C Bay Khom match at Phum Club!`, 'club');
          this.broadcast('clubMatchWin', {
            tableId: table.tableId,
            game: 'bay_khom',
            winnerSessionId: winner?.sessionId ?? client.sessionId,
            winnerName: table.winnerName,
            potCoins: table.potCoins,
            stakeCoins: table.stakeCoins,
          });
          table.seats.forEach((s) => {
            s.ready = false;
          });
        } else {
          table.turnIndex = (table.turnIndex + 1) % Math.max(1, table.seats.length);
        }
        this.broadcastTables();
      }
    );
  }

  private startTableMatch(table: ServerClubTable): void {
    table.status = 'playing';
    table.winnerName = null;
    table.potCoins = table.stakeCoins * table.seats.length;

    if (table.game === 'tien_len') {
      const { hands, starterIndex, requires3S } = dealDeck13(table.seats.length);
      table.hands.clear();
      table.tableCards = [];
      table.tableComboLabel = '';
      table.lastPlayBySessionId = null;
      table.mustIncludeThreeSpades = requires3S;
      table.turnIndex = starterIndex;

      table.seats.forEach((seat, idx) => {
        seat.cardCount = 13;
        seat.passed = false;
        table.hands.set(seat.sessionId, hands[idx]);
        const c = this.clients.find((cl) => cl.sessionId === seat.sessionId);
        c?.send('clubPrivateHand', { tableId: table.tableId, hand: hands[idx] });
      });

      table.lastSummary = `🃏 Dealer dealt 13 cards! ${table.seats[starterIndex].name} leads${requires3S ? ' with 3♠' : ''}!`;
    } else if (table.game === 'bay_khom') {
      table.turnIndex = 0;
      table.bayKhomJson = JSON.stringify({
        holes: [5, 4, 4, 4, 4, 5, 4, 4, 4, 4],
        stores: [0, 0],
        turn: 0,
        winner: null,
        lastAction: `🥣 Bay Khom Match Started! ${table.seats[0]?.name ?? 'Player 1'} sows first!`,
      });
      table.lastSummary = `🥣 Bay Khom Started! ${table.seats[0]?.name ?? 'P1'} vs ${table.seats[1]?.name ?? 'P2'} (${table.potCoins} C pot).`;
    } else {
      table.turnIndex = 0; // Seat 0 = White (Gold), Seat 1 = Black (Ebony)
      table.oukBoardJson = null;
      table.oukTurnSide = 'w';
      table.lastSummary = `♟️ Match Started! ${table.seats[0].name} (Gold/White) moves first vs ${table.seats[1].name} (Ebony/Black).`;
    }
    this.broadcastTables();
  }

  private advanceTienLenTurn(table: ServerClubTable): void {
    const n = table.seats.length;
    if (n === 0) return;
    let next = (table.turnIndex + 1) % n;
    for (let step = 0; step < n; step++) {
      const candidate = table.seats[next];
      if (candidate.sessionId === table.lastPlayBySessionId) {
        // Everyone else passed — reset round!
        table.tableCards = [];
        table.tableComboLabel = '';
        table.lastPlayBySessionId = null;
        table.seats.forEach((s) => {
          s.passed = false;
        });
        table.turnIndex = next;
        table.lastSummary = `Everyone passed! ${candidate.name} wins control and leads a fresh round.`;
        return;
      }
      if (!candidate.passed) {
        table.turnIndex = next;
        return;
      }
      next = (next + 1) % n;
    }
  }

  private removePlayerFromAllTables(sessionId: string): void {
    for (const table of this.tables.values()) {
      const idx = table.seats.findIndex((s) => s.sessionId === sessionId);
      if (idx >= 0) {
        const leaver = table.seats[idx];
        table.seats.splice(idx, 1);
        table.hands.delete(sessionId);
        if (table.status === 'playing' && table.seats.length < 2) {
          table.status = 'waiting';
          table.tableCards = [];
          table.oukBoardJson = null;
          table.seats.forEach((s) => {
            s.ready = false;
            s.passed = false;
          });
          table.lastSummary = `${leaver.name} left the table. Waiting for another real player.`;
        } else if (table.seats.length === 0) {
          table.status = 'waiting';
          table.lastSummary = 'Waiting for real players to sit down & Ready (No AI).';
        } else {
          table.turnIndex = table.turnIndex % table.seats.length;
        }
      }
    }
  }

  private serializeTables() {
    return Array.from(this.tables.values()).map((t) => ({
      tableId: t.tableId,
      game: t.game,
      stakeCoins: t.stakeCoins,
      maxSeats: t.maxSeats,
      status: t.status,
      seats: t.seats.map((s) => ({ ...s })),
      turnIndex: t.turnIndex,
      potCoins: t.potCoins,
      lastSummary: t.lastSummary,
      winnerName: t.winnerName,
      tableCards: t.tableCards,
      tableComboLabel: t.tableComboLabel,
      mustIncludeThreeSpades: t.mustIncludeThreeSpades,
      oukBoardJson: t.oukBoardJson,
      oukTurnSide: t.oukTurnSide,
      bayKhomJson: t.bayKhomJson ?? null,
    }));
  }

  private broadcastTables(): void {
    this.broadcast('clubTablesSnapshot', { tables: this.serializeTables() });
  }

  onJoin(
    client: Client,
    options?: { playerId?: string; name?: string; appearanceJson?: string }
  ): void {
    const p = new ClubPlayer();
    p.sessionId = client.sessionId;
    p.playerId = typeof options?.playerId === 'string' ? options.playerId.slice(0, 64) : '';
    p.name =
      typeof options?.name === 'string' && options.name.trim()
        ? options.name.trim().slice(0, 20)
        : `ClubGuest_${client.sessionId.slice(0, 4)}`;
    p.x = 390 + (Math.random() - 0.5) * 60;
    p.y = 430;
    p.appearanceJson =
      typeof options?.appearanceJson === 'string' && options.appearanceJson.length <= 2048
        ? options.appearanceJson
        : '{}';
    this.state.players.set(client.sessionId, p);
    client.send('clubTablesSnapshot', { tables: this.serializeTables() });
  }

  onLeave(client: Client): void {
    this.removePlayerFromAllTables(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.broadcastTables();
  }
}
