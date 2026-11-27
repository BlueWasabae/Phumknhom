// ==============================================================================
// AUTHENTIC KHMER CLUB RULES ENGINE (UPDATE 2.2 — STRICTLY MULTIPLAYER PVP, ZERO AI)
// 1. Multi-Table Stakes Catalog (50 C / 200 C / 1,000 C High-Roller)
// 2. Authentic 13-Card Tien Len (Rank 3..2, Suit ♠<♣<♦<♥, Singles/Pairs/Triples/Straights/Bombs)
// 3. Authentic Ouk Chaktrang (Uncheckered 8x8, Trey on 3rd/6th ranks, King faces Queen,
//    Ang 1-time Knight Jump, Neang 1-time 2-sq Jump, Koul 4-diag+forward, Trey Bork promotion)
// ==============================================================================

export type ClubPvpGameType = 'tien_len' | 'ouk_chaktrang';

export interface ClubTableConfig {
  tableId: string;
  game: ClubPvpGameType;
  label: string;
  khmerLabel: string;
  stakeCoins: number;
  maxSeats: number;
  minSeatsToStart: number;
  tierBadge: string;
}

export const CLUB_PVP_TABLES: ClubTableConfig[] = [
  {
    tableId: 'tl_50',
    game: 'tien_len',
    label: 'Table 1 · 50 C Stake',
    khmerLabel: 'តុទី១ · ៥០កាក់',
    stakeCoins: 50,
    maxSeats: 4,
    minSeatsToStart: 2,
    tierBadge: 'Casual',
  },
  {
    tableId: 'tl_200',
    game: 'tien_len',
    label: 'Table 2 · 200 C Stake',
    khmerLabel: 'តុទី២ · ២០០កាក់',
    stakeCoins: 200,
    maxSeats: 4,
    minSeatsToStart: 2,
    tierBadge: 'Club Pro',
  },
  {
    tableId: 'tl_1000',
    game: 'tien_len',
    label: 'Table 3 · 1,000 C High-Roller',
    khmerLabel: 'តុVIP · ១,០០០កាក់',
    stakeCoins: 1000,
    maxSeats: 4,
    minSeatsToStart: 2,
    tierBadge: 'High-Roller',
  },
  {
    tableId: 'ouk_50',
    game: 'ouk_chaktrang',
    label: 'Table 1 · 50 C Stake',
    khmerLabel: 'តុអុកទី១ · ៥០កាក់',
    stakeCoins: 50,
    maxSeats: 2,
    minSeatsToStart: 2,
    tierBadge: 'Casual',
  },
  {
    tableId: 'ouk_200',
    game: 'ouk_chaktrang',
    label: 'Table 2 · 200 C Stake',
    khmerLabel: 'តុអុកទី២ · ២០០កាក់',
    stakeCoins: 200,
    maxSeats: 2,
    minSeatsToStart: 2,
    tierBadge: 'Master',
  },
  {
    tableId: 'ouk_1000',
    game: 'ouk_chaktrang',
    label: 'Table 3 · 1,000 C High-Roller',
    khmerLabel: 'តុអុកVIP · ១,០០០កាក់',
    stakeCoins: 1000,
    maxSeats: 2,
    minSeatsToStart: 2,
    tierBadge: 'High-Roller',
  },
];

// ==================== 1. AUTHENTIC 13-CARD TIEN LEN ====================
export interface TienLenCard {
  id: string; // e.g. '3♠', '2♥'
  label: string;
  rank: number; // 3..15 (11=J, 12=Q, 13=K, 14=A, 15=2)
  suit: '♠' | '♣' | '♦' | '♥';
  suitWeight: number; // 0=♠ < 1=♣ < 2=♦ < 3=♥
  red: boolean;
}

export type TienLenComboType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'four_kind'
  | 'consec_pairs';

export interface TienLenCombo {
  type: TienLenComboType;
  cards: TienLenCard[];
  length: number;
  highPower: number;
  highRank: number;
  label: string;
  isBomb: boolean;
}

const TL_RANKS: Array<[string, number]> = [
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
  ['9', 9],
  ['10', 10],
  ['J', 11],
  ['Q', 12],
  ['K', 13],
  ['A', 14],
  ['2', 15],
];

const TL_SUITS: Array<['♠' | '♣' | '♦' | '♥', number, boolean]> = [
  ['♠', 0, false],
  ['♣', 1, false],
  ['♦', 2, true],
  ['♥', 3, true],
];

export function tienLenCardPower(c: TienLenCard): number {
  return c.rank * 4 + c.suitWeight;
}

export function sortTienLenHand(cards: TienLenCard[]): TienLenCard[] {
  return [...cards].sort((a, b) => tienLenCardPower(a) - tienLenCardPower(b));
}

export function createShuffledTienLenDeck(): TienLenCard[] {
  const deck: TienLenCard[] = [];
  for (const [rl, rv] of TL_RANKS) {
    for (const [sl, sw, red] of TL_SUITS) {
      deck.push({ id: `${rl}${sl}`, label: `${rl}${sl}`, rank: rv, suit: sl, suitWeight: sw, red });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deals exactly 13 cards to each seated player (2..4 players) from a 52-card deck.
 * Returns hands + index of player holding 3♠ (or lowest card if 3♠ wasn't dealt in 2-3P).
 */
export function dealAuthenticTienLen(playerCount: number): {
  hands: TienLenCard[][];
  starterIndex: number;
  requiresThreeSpades: boolean;
} {
  const n = Math.max(2, Math.min(4, playerCount));
  const deck = createShuffledTienLenDeck();
  const hands: TienLenCard[][] = [];
  for (let p = 0; p < n; p++) {
    hands.push(sortTienLenHand(deck.slice(p * 13, (p + 1) * 13)));
  }

  // Prefer the player holding 3♠; if <4 players and 3♠ isn't in any hand, lowest card leads
  for (let p = 0; p < n; p++) {
    if (hands[p].some((c) => c.id === '3♠')) {
      return { hands, starterIndex: p, requiresThreeSpades: true };
    }
  }
  let starterIndex = 0;
  let lowest = Infinity;
  for (let p = 0; p < n; p++) {
    const pLow = tienLenCardPower(hands[p][0]);
    if (pLow < lowest) {
      lowest = pLow;
      starterIndex = p;
    }
  }
  return { hands, starterIndex, requiresThreeSpades: false };
}

export function classifyTienLenCombo(rawCards: TienLenCard[]): TienLenCombo | null {
  if (!rawCards || rawCards.length === 0) return null;
  const cards = sortTienLenHand(rawCards);
  const len = cards.length;
  const high = cards[len - 1];
  const highPower = tienLenCardPower(high);
  const allSameRank = cards.every((c) => c.rank === cards[0].rank);

  if (len === 1) {
    return { type: 'single', cards, length: 1, highPower, highRank: high.rank, label: `Single ${high.label}`, isBomb: false };
  }
  if (len === 2 && allSameRank) {
    return { type: 'pair', cards, length: 2, highPower, highRank: high.rank, label: `Pair ${cards.map((c) => c.label).join(' ')}`, isBomb: false };
  }
  if (len === 3 && allSameRank) {
    return { type: 'triple', cards, length: 3, highPower, highRank: high.rank, label: `Triple ${high.label.slice(0, -1)}s`, isBomb: false };
  }
  if (len === 4 && allSameRank) {
    return {
      type: 'four_kind',
      cards,
      length: 4,
      highPower,
      highRank: high.rank,
      label: `💣 BOMB Four-of-a-Kind (${high.label.slice(0, -1)}s)`,
      isBomb: true,
    };
  }

  // Straight (3+ consecutive ranks, NO 2s allowed in straights!)
  if (len >= 3 && !cards.some((c) => c.rank === 15)) {
    let isStraight = true;
    for (let i = 1; i < len; i++) {
      if (cards[i].rank !== cards[i - 1].rank + 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) {
      return {
        type: 'straight',
        cards,
        length: len,
        highPower,
        highRank: high.rank,
        label: `Straight (${cards[0].label.slice(0, -1)}→${high.label})`,
        isBomb: false,
      };
    }
  }

  // 3 or 4 Consecutive Pairs (Bomb / Chặt — NO 2s allowed!)
  if ((len === 6 || len === 8) && !cards.some((c) => c.rank === 15)) {
    let validPairs = true;
    for (let i = 0; i < len; i += 2) {
      if (cards[i].rank !== cards[i + 1].rank) {
        validPairs = false;
        break;
      }
      if (i > 0 && cards[i].rank !== cards[i - 2].rank + 1) {
        validPairs = false;
        break;
      }
    }
    if (validPairs) {
      const pairCount = len / 2;
      return {
        type: 'consec_pairs',
        cards,
        length: len,
        highPower,
        highRank: high.rank,
        label: `💣 BOMB ${pairCount} Consecutive Pairs (to ${high.label})`,
        isBomb: true,
      };
    }
  }

  return null;
}

export function canBeatTienLenCombo(
  play: TienLenCombo,
  tableCombo: TienLenCombo | null,
  mustIncludeThreeSpades = false
): { ok: boolean; reason?: string } {
  if (mustIncludeThreeSpades && !play.cards.some((c) => c.id === '3♠')) {
    return { ok: false, reason: 'Opening lead must include 3♠!' };
  }
  if (!tableCombo) return { ok: true };

  // Authentic Bomb (Chặt) rules:
  // - 3 Consecutive Pairs or Four-of-a-Kind chops a Single 2
  // - Four-of-a-Kind or 4 Consecutive Pairs chops a Pair of 2s
  if (tableCombo.type === 'single' && tableCombo.highRank === 15) {
    if (play.type === 'four_kind' || (play.type === 'consec_pairs' && play.length >= 6)) {
      return { ok: true };
    }
  }
  if (tableCombo.type === 'pair' && tableCombo.highRank === 15) {
    if (play.type === 'four_kind' || (play.type === 'consec_pairs' && play.length >= 8)) {
      return { ok: true };
    }
  }
  // Bomb vs Bomb escalation (4 consec pairs > Four-of-a-Kind > 3 consec pairs)
  if (tableCombo.isBomb && play.isBomb) {
    const bombRank = (c: TienLenCombo) =>
      c.type === 'consec_pairs' && c.length >= 8 ? 3 : c.type === 'four_kind' ? 2 : 1;
    const pr = bombRank(play);
    const tr = bombRank(tableCombo);
    if (pr > tr) return { ok: true };
    if (pr === tr && play.highPower > tableCombo.highPower) return { ok: true };
    return { ok: false, reason: 'Need a higher Bomb to counter-chop!' };
  }

  if (play.type !== tableCombo.type || play.length !== tableCombo.length) {
    return { ok: false, reason: `Must play a higher ${tableCombo.type.replace('_', ' ')} (${tableCombo.length} cards) or Bomb a 2!` };
  }
  if (play.highPower <= tableCombo.highPower) {
    return { ok: false, reason: `Must beat ${tableCombo.label} (♠ < ♣ < ♦ < ♥).` };
  }
  return { ok: true };
}

// ==================== 2. AUTHENTIC OUK CHAKTRANG (KHMER CHESS) ====================
export type OukSide = 'w' | 'b';
/**
 * Ang (K = King), Neang (Q = Queen), Koul (B = General),
 * Ses (N = Horse), Tuk (R = Boat), Trey (P = Fish/Pawn), Trey Bork (PB = Promoted Fish)
 */
export type OukPieceKind = 'K' | 'Q' | 'B' | 'N' | 'R' | 'P' | 'PB';

export interface OukPiece {
  side: OukSide;
  kind: OukPieceKind;
  hasMoved: boolean;
}

export type OukBoard = (OukPiece | null)[][];

export const OUK_PIECE_META: Record<OukPieceKind, { khmer: string; english: string; rule: string }> = {
  K: {
    khmer: 'អង្គ (Ang)',
    english: 'King',
    rule: '1 sq any direction · 1-time Knight Jump on first move (when not in check)',
  },
  Q: {
    khmer: 'នាង (Neang)',
    english: 'Queen',
    rule: '1 sq diagonally · 1-time 2-sq straight forward leap on first move',
  },
  B: {
    khmer: 'គោល (Koul)',
    english: 'General',
    rule: '1 sq diagonally OR 1 sq straight forward',
  },
  N: {
    khmer: 'សេះ (Ses)',
    english: 'Horse',
    rule: 'Knight L-shape jump (2×1)',
  },
  R: {
    khmer: 'ទូក (Tuk)',
    english: 'Boat',
    rule: 'Slides any distance horizontally or vertically',
  },
  P: {
    khmer: 'ត្រី (Trey)',
    english: 'Fish / Pawn',
    rule: '1 sq forward, captures diag forward · Promotes to Trey Bork on 6th/3rd rank!',
  },
  PB: {
    khmer: 'ត្រីបក (Trey Bork)',
    english: 'Promoted Fish',
    rule: 'Moves 1 square in any diagonal direction (like Neang)',
  },
};

/**
 * Authentic Ouk Chaktrang Starting Position:
 * - Trey (Pawns) on 3rd rank for White (row 5) and 6th rank for Black (row 2).
 * - King faces opponent's Queen!
 *   Black row 0: [R, N, B, K, Q, B, N, R] (Ang at col 3, Neang at col 4)
 *   White row 7: [R, N, B, Q, K, B, N, R] (Neang at col 3, Ang at col 4)
 */
export function createAuthenticOukBoard(): OukBoard {
  const b: OukBoard = Array.from({ length: 8 }, () => Array<OukPiece | null>(8).fill(null));
  const blackBack: OukPieceKind[] = ['R', 'N', 'B', 'K', 'Q', 'B', 'N', 'R'];
  const whiteBack: OukPieceKind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

  for (let c = 0; c < 8; c++) {
    b[0][c] = { side: 'b', kind: blackBack[c], hasMoved: false };
    b[2][c] = { side: 'b', kind: 'P', hasMoved: false }; // 6th rank (Black Trey)
    b[5][c] = { side: 'w', kind: 'P', hasMoved: false }; // 3rd rank (White Trey)
    b[7][c] = { side: 'w', kind: whiteBack[c], hasMoved: false };
  }
  return b;
}

function inOukBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPseudoMoves(board: OukBoard, r: number, c: number, allowSpecialFirstMoves: boolean): Array<[number, number]> {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Array<[number, number]> = [];
  const forward = piece.side === 'w' ? -1 : 1;
  const canLand = (rr: number, cc: number) => {
    if (!inOukBounds(rr, cc)) return false;
    const t = board[rr][cc];
    return !t || t.side !== piece.side;
  };

  if (piece.kind === 'P') {
    if (inOukBounds(r + forward, c) && !board[r + forward][c]) {
      moves.push([r + forward, c]);
    }
    for (const dc of [-1, 1]) {
      if (inOukBounds(r + forward, c + dc) && board[r + forward][c + dc]?.side && board[r + forward][c + dc]?.side !== piece.side) {
        moves.push([r + forward, c + dc]);
      }
    }
  } else if (piece.kind === 'PB') {
    // Promoted Trey Bork: 1 square diagonally
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
  } else if (piece.kind === 'Q') {
    // Neang: 1 square diagonally + 1-time 2-square straight jump forward on first move (non-capturing)
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
    if (allowSpecialFirstMoves && !piece.hasMoved) {
      const jr = r + forward * 2;
      if (inOukBounds(jr, c) && !board[jr][c]) {
        moves.push([jr, c]);
      }
    }
  } else if (piece.kind === 'B') {
    // Koul: 1 square diagonally OR 1 square straight forward
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [forward, 0]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
  } else if (piece.kind === 'N') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
  } else if (piece.kind === 'R') {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (let step = 1; step < 8; step++) {
        const rr = r + dr * step;
        const cc = c + dc * step;
        if (!inOukBounds(rr, cc)) break;
        const t = board[rr][cc];
        if (!t) {
          moves.push([rr, cc]);
        } else {
          if (t.side !== piece.side) moves.push([rr, cc]);
          break;
        }
      }
    }
  } else if (piece.kind === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr !== 0 || dc !== 0) && canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
      }
    }
    // Authentic Ang 1-time Knight Jump on first move (non-capturing, cannot be in check!)
    if (allowSpecialFirstMoves && !piece.hasMoved && !isOukKingInCheck(board, piece.side)) {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const rr = r + dr;
        const cc = c + dc;
        if (inOukBounds(rr, cc) && !board[rr][cc]) {
          moves.push([rr, cc]);
        }
      }
    }
  }
  return moves;
}

export function isOukKingInCheck(board: OukBoard, side: OukSide): boolean {
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.side === side && p.kind === 'K') {
        kr = r;
        kc = c;
      }
    }
  }
  if (kr < 0) return true;
  const opp: OukSide = side === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.side !== opp) continue;
      const attacks = getPseudoMoves(board, r, c, false);
      if (attacks.some(([ar, ac]) => ar === kr && ac === kc)) return true;
    }
  }
  return false;
}

export function cloneOukBoard(board: OukBoard): OukBoard {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function applyOukMove(
  board: OukBoard,
  from: [number, number],
  to: [number, number]
): { nextBoard: OukBoard; captured: OukPiece | null; promoted: boolean } {
  const nextBoard = cloneOukBoard(board);
  const moving = nextBoard[from[0]][from[1]];
  const captured = nextBoard[to[0]][to[1]];
  if (!moving) return { nextBoard, captured: null, promoted: false };
  moving.hasMoved = true;

  // Authentic Trey promotion: White promotes on 6th rank (row 2), Black promotes on 3rd rank (row 5)!
  let promoted = false;
  if (moving.kind === 'P') {
    if ((moving.side === 'w' && to[0] <= 2) || (moving.side === 'b' && to[0] >= 5)) {
      moving.kind = 'PB';
      promoted = true;
    }
  }
  nextBoard[to[0]][to[1]] = moving;
  nextBoard[from[0]][from[1]] = null;
  return { nextBoard, captured, promoted };
}

export function getAuthenticOukLegalMoves(board: OukBoard, r: number, c: number): Array<[number, number]> {
  const piece = board[r][c];
  if (!piece) return [];
  const pseudo = getPseudoMoves(board, r, c, true);
  return pseudo.filter(([tr, tc]) => {
    const { nextBoard } = applyOukMove(board, [r, c], [tr, tc]);
    return !isOukKingInCheck(nextBoard, piece.side);
  });
}

export function hasAnyLegalOukMove(board: OukBoard, side: OukSide): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.side === side && getAuthenticOukLegalMoves(board, r, c).length > 0) {
        return true;
      }
    }
  }
  return false;
}
