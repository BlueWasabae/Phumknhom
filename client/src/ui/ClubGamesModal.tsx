import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { soundManager } from '../game/systems/SoundManager';
import { Crown, Dices, RotateCcw, Spade, Trophy } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

export type ClubGameTab = 'kla_klok' | 'ouk_chaktrang' | 'tien_len';

interface ClubGamesModalProps {
  open: boolean;
  initialGame?: ClubGameTab;
  player: PlayerState;
  onClose: () => void;
  onWinClubReward: (coinsDelta: number, happyGain: number, label: string) => void;
}

// ==================== 1. KLA KLOK (KHMER TRADITIONAL 3-DICE) ====================
type KlaKlokSymbolId = 'gourd' | 'crab' | 'fish' | 'rooster' | 'shrimp' | 'tiger';

const KLA_KLOK_SYMBOLS: Array<{
  id: KlaKlokSymbolId;
  name: string;
  khmerName: string;
  icon: string;
  colorClass: string;
}> = [
  { id: 'gourd', name: 'Gourd', khmerName: 'ឃ្លោក', icon: '🎃', colorClass: 'bg-amber-100 border-amber-600' },
  { id: 'crab', name: 'Crab', khmerName: 'ក្តាម', icon: '🦀', colorClass: 'bg-rose-100 border-rose-600' },
  { id: 'fish', name: 'Fish', khmerName: 'ត្រី', icon: '🐟', colorClass: 'bg-sky-100 border-sky-600' },
  { id: 'rooster', name: 'Rooster', khmerName: 'មាន់', icon: '🐓', colorClass: 'bg-yellow-100 border-yellow-600' },
  { id: 'shrimp', name: 'Shrimp', khmerName: 'បង្គា', icon: '🦐', colorClass: 'bg-pink-100 border-pink-600' },
  { id: 'tiger', name: 'Tiger', khmerName: 'ខ្លា', icon: '🐯', colorClass: 'bg-emerald-100 border-emerald-600' },
];

const WAGER_CHIPS = [10, 50, 100, 250] as const;

// ==================== 2. OUK CHAKTRANG (8x8 FAST-BLITZ KHMER CHESS) ====================
type PieceSide = 'w' | 'b';
type PieceKind = 'K' | 'Q' | 'B' | 'N' | 'R' | 'P';

interface ChessPiece {
  side: PieceSide;
  kind: PieceKind;
}

type Board8x8 = (ChessPiece | null)[][];

const PIECE_GLYPH: Record<PieceSide, Record<PieceKind, string>> = {
  w: { K: '♔', Q: '♕', B: '♗', N: '♘', R: '♖', P: '♙' },
  b: { K: '♚', Q: '♛', B: '♝', N: '♞', R: '♜', P: '♟' },
};

const PIECE_KHMER: Record<PieceKind, string> = {
  K: 'Sdach (King)',
  Q: 'Neang (Queen)',
  B: 'Khon (General)',
  N: 'Ses (Knight)',
  R: 'Tuuk (Boat)',
  P: 'Trey (Fish/Pawn)',
};

function createInitialOukBoard(): Board8x8 {
  const b: Board8x8 = Array.from({ length: 8 }, () => Array<ChessPiece | null>(8).fill(null));
  const backRow: PieceKind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { side: 'b', kind: backRow[c] };
    b[2][c] = { side: 'b', kind: 'P' }; // Authentic Khmer Ouk Chaktrang puts Trey pawns on 3rd & 6th ranks!
    b[5][c] = { side: 'w', kind: 'P' };
    b[7][c] = { side: 'w', kind: backRow[c] };
  }
  return b;
}

function getLegalMoves(board: Board8x8, r: number, c: number): Array<[number, number]> {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Array<[number, number]> = [];
  const inBounds = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const canLand = (rr: number, cc: number) => {
    if (!inBounds(rr, cc)) return false;
    const t = board[rr][cc];
    return !t || t.side !== piece.side;
  };

  if (piece.kind === 'P') {
    const dir = piece.side === 'w' ? -1 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) moves.push([r + dir, c]);
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc) && board[r + dir][c + dc]?.side && board[r + dir][c + dc]?.side !== piece.side) {
        moves.push([r + dir, c + dc]);
      }
    }
  } else if (piece.kind === 'N') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
  } else if (piece.kind === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr !== 0 || dc !== 0) && canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
      }
    }
  } else if (piece.kind === 'Q') {
    // Ouk Neang: 1 square diagonally (plus fast-blitz 1 forward)
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [piece.side === 'w' ? -1 : 1, 0]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
  } else if (piece.kind === 'B') {
    // Ouk Khon: 4 diagonals 1 step + 1 step forward
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [piece.side === 'w' ? -1 : 1, 0]]) {
      if (canLand(r + dr, c + dc)) moves.push([r + dr, c + dc]);
    }
  } else if (piece.kind === 'R') {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (let step = 1; step < 8; step++) {
        const rr = r + dr * step;
        const cc = c + dc * step;
        if (!inBounds(rr, cc)) break;
        const target = board[rr][cc];
        if (!target) {
          moves.push([rr, cc]);
        } else {
          if (target.side !== piece.side) moves.push([rr, cc]);
          break;
        }
      }
    }
  }
  return moves;
}

// ==================== 3. TIEN LEN (13-CARD KHMER POKER) ====================
interface CardItem {
  id: string;
  label: string;
  rank: number;
  suitWeight: number;
  red: boolean;
}

const RANKS: Array<[string, number]> = [
  ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8],
  ['9', 9], ['10', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14], ['2', 15],
];
const SUITS: Array<[string, number, boolean]> = [
  ['♠', 0, false], ['♣', 1, false], ['♦', 2, true], ['♥', 3, true],
];

function cardPower(c: CardItem): number {
  return c.rank * 4 + c.suitWeight;
}

function dealTienLenRound(): { playerHand: CardItem[]; npcHand: CardItem[] } {
  const deck: CardItem[] = [];
  for (const [rl, rv] of RANKS) {
    for (const [sl, sw, red] of SUITS) {
      deck.push({ id: `${rl}${sl}`, label: `${rl}${sl}`, rank: rv, suitWeight: sw, red });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    playerHand: deck.slice(0, 7).sort((a, b) => cardPower(a) - cardPower(b)),
    npcHand: deck.slice(7, 14).sort((a, b) => cardPower(a) - cardPower(b)),
  };
}

export const ClubGamesModal: React.FC<ClubGamesModalProps> = ({
  open,
  initialGame = 'kla_klok',
  player,
  onClose,
  onWinClubReward,
}) => {
  const [tab, setTab] = useState<ClubGameTab>(initialGame);

  // ---- Kla Klok state ----
  const [chipSize, setChipSize] = useState<number>(50);
  const [bets, setBets] = useState<Partial<Record<KlaKlokSymbolId, number>>>({ gourd: 50 });
  const [dice, setDice] = useState<[KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId]>(['gourd', 'crab', 'fish']);
  const [rolling, setRolling] = useState(false);
  const [kkResultText, setKkResultText] = useState('Place Coins on 1 or more symbols and hit Roll 3 Dice!');

  // ---- Ouk Chaktrang 8x8 state ----
  const [board, setBoard] = useState<Board8x8>(() => createInitialOukBoard());
  const [selectedSq, setSelectedSq] = useState<[number, number] | null>(null);
  const [oukStatus, setOukStatus] = useState('Your Turn (Gold/White) — Capture the Black Sdach (♚) or 3 pieces to win +220c & Club Champion badge!');
  const [oukCaptures, setOukCaptures] = useState(0);
  const [oukOver, setOukOver] = useState(false);

  // ---- Tien Len state ----
  const [hand, setHand] = useState<CardItem[]>([]);
  const [npcHand, setNpcHand] = useState<CardItem[]>([]);
  const [tableCard, setTableCard] = useState<CardItem | null>(null);
  const [tlStatus, setTlStatus] = useState('Beat the table card with a higher card (2♥ is strongest)!');
  const [tlFinished, setTlFinished] = useState(false);

  const resetTienLen = () => {
    const dealt = dealTienLenRound();
    setHand(dealt.playerHand);
    setNpcHand(dealt.npcHand);
    setTableCard(null);
    setTlFinished(false);
    setTlStatus('Your lead! Play any card from your hand (2♥ beats everything).');
  };

  const resetOukBoard = () => {
    setBoard(createInitialOukBoard());
    setSelectedSq(null);
    setOukCaptures(0);
    setOukOver(false);
    setOukStatus('New 8×8 Fast-Blitz Ouk Chaktrang match! Click any White piece to move.');
  };

  useEffect(() => {
    if (open) {
      setTab(initialGame);
      if (hand.length === 0) resetTienLen();
    }
  }, [initialGame, open]);

  // ---- Kla Klok handlers ----
  const totalBet = Object.values(bets).reduce((s, v) => s + (v ?? 0), 0);

  const addBetOnSymbol = (sym: KlaKlokSymbolId) => {
    if (rolling) return;
    if (totalBet + chipSize > player.currencies.coins) {
      soundManager.playSfx('hit');
      setKkResultText(`Not enough Coins! Wallet has ${player.currencies.coins.toLocaleString()}c.`);
      return;
    }
    soundManager.playSfx('click');
    setBets((prev) => ({ ...prev, [sym]: (prev[sym] ?? 0) + chipSize }));
  };

  const rollKlaKlok = () => {
    if (rolling || totalBet <= 0 || totalBet > player.currencies.coins) return;
    setRolling(true);
    soundManager.playSfx('swing');
    setKkResultText('🎲 Shaking the Kla Klok bowl...');

    const faceIds = KLA_KLOK_SYMBOLS.map((s) => s.id);
    let ticks = 0;
    const anim = window.setInterval(() => {
      ticks += 1;
      setDice([
        faceIds[Math.floor(Math.random() * 6)],
        faceIds[Math.floor(Math.random() * 6)],
        faceIds[Math.floor(Math.random() * 6)],
      ]);
      if (ticks >= 7) {
        window.clearInterval(anim);
        const finalDice: [KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId] = [
          faceIds[Math.floor(Math.random() * 6)],
          faceIds[Math.floor(Math.random() * 6)],
          faceIds[Math.floor(Math.random() * 6)],
        ];
        setDice(finalDice);

        // Compute payout: each bet pays 1x, 2x, or 3x profit per matching die; losing bets lose their stake
        let netDelta = 0;
        let totalMatches = 0;
        for (const [symKey, stake] of Object.entries(bets) as Array<[KlaKlokSymbolId, number]>) {
          if (!stake) continue;
          const matches = finalDice.filter((d) => d === symKey).length;
          if (matches > 0) {
            netDelta += stake * matches;
            totalMatches += matches;
          } else {
            netDelta -= stake;
          }
        }

        const icons = finalDice.map((id) => KLA_KLOK_SYMBOLS.find((s) => s.id === id)?.icon ?? id).join(' ');
        if (netDelta > 0) {
          soundManager.playSfx('level_up');
          const msg = `🎲 Kla Klok Roll [${icons}]: ${totalMatches}× match! Won +${netDelta} Coins!`;
          setKkResultText(msg);
          onWinClubReward(netDelta, 5, msg);
        } else if (netDelta === 0) {
          soundManager.playSfx('coin');
          setKkResultText(`🎲 Kla Klok Roll [${icons}]: Push (0c net)! Try again!`);
        } else {
          soundManager.playSfx('hit');
          const msg = `🎲 Kla Klok Roll [${icons}]: ${netDelta} Coins. Better luck next bowl!`;
          setKkResultText(msg);
          onWinClubReward(netDelta, 2, msg);
        }
        setRolling(false);
      }
    }, 75);
  };

  // ---- Ouk Chaktrang 8x8 handlers ----
  const legalMovesForSelected = selectedSq ? getLegalMoves(board, selectedSq[0], selectedSq[1]) : [];

  const handleOukSquareClick = (r: number, c: number) => {
    if (oukOver) return;
    const clicked = board[r][c];

    // If a move target is clicked
    if (selectedSq && legalMovesForSelected.some(([mr, mc]) => mr === r && mc === c)) {
      const next = board.map((row) => row.slice());
      const moving = next[selectedSq[0]][selectedSq[1]]!;
      const captured = next[r][c];
      next[r][c] = moving;
      next[selectedSq[0]][selectedSq[1]] = null;
      setSelectedSq(null);
      soundManager.playSfx('click');

      const nextCaps = oukCaptures + (captured ? 1 : 0);
      setOukCaptures(nextCaps);

      if (captured?.kind === 'K' || nextCaps >= 3) {
        setBoard(next);
        setOukOver(true);
        soundManager.playSfx('level_up');
        const reason = captured?.kind === 'K' ? 'CHECKMATE on Enemy Sdach!' : 'Fast-Blitz Victory (3 Captures)!';
        setOukStatus(`🏆 ${reason} Earned +220 Coins & Club Champion Title!`);
        onWinClubReward(220, 8, `♟️ Ouk Chaktrang ${reason} (+220c & 🏆 Club Champion)!`);
        return;
      }

      // Quick Club AI Bot response
      const aiMoves: Array<{ fr: number; fc: number; tr: number; tc: number; score: number }> = [];
      for (let ar = 0; ar < 8; ar++) {
        for (let ac = 0; ac < 8; ac++) {
          if (next[ar][ac]?.side !== 'b') continue;
          for (const [tr, tc] of getLegalMoves(next, ar, ac)) {
            const target = next[tr][tc];
            const score = target ? (target.kind === 'K' ? 50 : 12) : tr * 0.5 + Math.random() * 2;
            aiMoves.push({ fr: ar, fc: ac, tr, tc, score });
          }
        }
      }

      if (aiMoves.length === 0) {
        setBoard(next);
        setOukOver(true);
        onWinClubReward(220, 8, '♟️ Ouk Chaktrang Victory — Bot had no legal moves (+220c)!');
        return;
      }

      aiMoves.sort((a, b) => b.score - a.score);
      const pick = aiMoves[0];
      const aiCaptured = next[pick.tr][pick.tc];
      const aiPiece = next[pick.fr][pick.fc]!;
      next[pick.tr][pick.tc] = aiPiece;
      next[pick.fr][pick.fc] = null;
      setBoard(next);

      if (aiCaptured?.kind === 'K') {
        setOukOver(true);
        soundManager.playSfx('hit');
        setOukStatus('Club Bot captured your Sdach! Hit New Match for a rematch.');
      } else {
        setOukStatus(
          `Bot moved ${PIECE_KHMER[aiPiece.kind]} · Your Captures: ${nextCaps}/3 (or capture ♚ King to win!).`
        );
      }
      return;
    }

    // Select own piece
    if (clicked?.side === 'w') {
      setSelectedSq([r, c]);
      soundManager.playSfx('click');
    } else {
      setSelectedSq(null);
    }
  };

  // ---- Tien Len handlers ----
  const playCard = (card: CardItem) => {
    if (tlFinished) return;
    if (tableCard && cardPower(card) <= cardPower(tableCard)) {
      soundManager.playSfx('hit');
      setTlStatus(`Need a card higher than ${tableCard.label} — or click Pass!`);
      return;
    }
    soundManager.playSfx('click');
    const nextHand = hand.filter((c) => c.id !== card.id);
    setHand(nextHand);
    setTableCard(card);
    if (nextHand.length === 0) {
      setTlFinished(true);
      soundManager.playSfx('level_up');
      setTlStatus('🏆 You cleared your hand! Won +150 Coins & +8 Happy!');
      onWinClubReward(150, 8, '🃏 Won Phum Club Tien Len match (+150c, Happy +8)!');
      return;
    }
    const aiCounter = npcHand.find((c) => cardPower(c) > cardPower(card));
    if (aiCounter) {
      const nextNpc = npcHand.filter((c) => c.id !== aiCounter.id);
      setNpcHand(nextNpc);
      setTableCard(aiCounter);
      if (nextNpc.length === 0) {
        setTlFinished(true);
        setTlStatus('Club Dealer cleared their hand! Deal again for a rematch.');
      } else {
        setTlStatus(`Dealer countered with ${aiCounter.label} (${nextNpc.length} left). Beat it or Pass!`);
      }
    } else {
      setTableCard(null);
      setTlStatus(`Dealer passed against ${card.label}! You keep the lead!`);
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="✨ Phum Night Club · Kla Klok · Ouk Chaktrang · Tien Len"
      subtitle={`Wallet: ${player.currencies.coins.toLocaleString()}c · Happy: ${player.lifeStats.happy}/100 · Coins saved automatically`}
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['kla_klok', '🎲 Kla Klok (3-Dice)', Dices],
              ['ouk_chaktrang', '♟️ Ouk Chaktrang (8×8)', Crown],
              ['tien_len', '🃏 Tien Len (13-Card)', Spade],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                tab === id
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* GAME 1: KLA KLOK (KHMER TRADITIONAL 3-DICE) */}
        {tab === 'kla_klok' && (
          <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-950 via-stone-900 to-amber-950 text-amber-50 border-2 border-amber-500/70 space-y-3">
            {/* 3 Animated Dice Bowl */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {dice.map((faceId, i) => {
                  const sym = KLA_KLOK_SYMBOLS.find((s) => s.id === faceId)!;
                  return (
                    <div
                      key={i}
                      className={`w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-lg flex flex-col items-center justify-center text-slate-900 ${
                        rolling ? 'animate-bounce' : ''
                      }`}
                    >
                      <span className="text-2xl leading-none">{sym.icon}</span>
                      <span className="text-[9px] font-display font-bold">{sym.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-[10px] font-bold text-amber-300">Wager Chip:</div>
                <div className="flex gap-1">
                  {WAGER_CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChipSize(c)}
                      className={`px-2 py-1 rounded-lg font-display font-bold text-[11px] border ${
                        chipSize === c
                          ? 'bg-amber-400 text-amber-950 border-white'
                          : 'bg-slate-800 text-amber-200 border-amber-500/40'
                      }`}
                    >
                      {c}c
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/75 border border-amber-400/35 text-center font-semibold text-amber-200">
              {kkResultText}
            </div>

            {/* 6 Symbol Board */}
            <div className="grid grid-cols-3 gap-2">
              {KLA_KLOK_SYMBOLS.map((sym) => {
                const amt = bets[sym.id] ?? 0;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    disabled={rolling}
                    onClick={() => addBetOnSymbol(sym.id)}
                    className={`p-2.5 rounded-xl border-2 text-slate-950 flex flex-col items-center gap-0.5 transition hover:scale-[1.02] active:scale-95 ${sym.colorClass} ${
                      amt > 0 ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <span className="text-2xl leading-none">{sym.icon}</span>
                    <span className="font-display font-bold text-xs">
                      {sym.name} ({sym.khmerName})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300">
                      {amt > 0 ? `Bet: ${amt}c` : `Click +${chipSize}c`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={rolling}
                onClick={() => setBets({})}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-display font-bold text-xs"
              >
                Clear Bets
              </button>
              <button
                type="button"
                disabled={rolling || totalBet <= 0 || totalBet > player.currencies.coins}
                onClick={rollKlaKlok}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 border-2 border-amber-950 font-display font-bold text-xs shadow disabled:opacity-45"
              >
                {rolling ? '🎲 Rolling...' : `🎲 Roll 3 Dice! (Total Bet: ${totalBet}c · Pays 1× / 2× / 3×)`}
              </button>
            </div>
          </div>
        )}

        {/* GAME 2: OUK CHAKTRANG (PLAYABLE 8x8 FAST-BLITZ KHMER CHESS) */}
        {tab === 'ouk_chaktrang' && (
          <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-900/35 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-600" />
                8×8 Ouk Chaktrang · Fast-Blitz Table (Pot: +220c &amp; Club Champion)
              </div>
              <button
                type="button"
                onClick={resetOukBoard}
                className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> New Match
              </button>
            </div>

            <div className="text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-1.5 rounded-xl border border-amber-800/20">
              {oukStatus}
            </div>

            <div className="flex justify-center">
              <div className="grid grid-cols-8 border-4 border-amber-950 rounded-xl overflow-hidden shadow-md">
                {board.map((row, r) =>
                  row.map((cell, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selectedSq?.[0] === r && selectedSq?.[1] === c;
                    const isLegalTarget = legalMovesForSelected.some(([mr, mc]) => mr === r && mc === c);
                    return (
                      <button
                        key={`${r}_${c}`}
                        type="button"
                        onClick={() => handleOukSquareClick(r, c)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl transition relative ${
                          isSelected
                            ? 'bg-amber-400 ring-2 ring-inset ring-amber-950'
                            : isLegalTarget
                              ? 'bg-emerald-300 ring-2 ring-inset ring-emerald-700'
                              : isDark
                                ? 'bg-amber-800/85'
                                : 'bg-amber-100'
                        }`}
                      >
                        {cell ? (
                          <span className={cell.side === 'w' ? 'text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-slate-950'}>
                            {PIECE_GLYPH[cell.side][cell.kind]}
                          </span>
                        ) : isLegalTarget ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700/80" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* GAME 3: TIEN LEN (13-CARD KHMER POKER) */}
        {tab === 'tien_len' && (
          <div className="p-3 rounded-2xl bg-emerald-950 text-emerald-50 border-2 border-amber-500/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs text-amber-300">
                Dealer Hand: {npcHand.length} cards
              </span>
              <button
                type="button"
                onClick={resetTienLen}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-amber-950 font-bold text-[11px] inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Deal New Round
              </button>
            </div>
            <div className="p-3 rounded-xl bg-emerald-900/80 border border-emerald-700 flex flex-col items-center gap-1">
              <div className="text-[10px] text-emerald-200 uppercase font-bold">Table Card</div>
              <div className="w-16 h-20 rounded-xl bg-white border-2 border-amber-500 flex items-center justify-center font-display font-bold text-xl text-slate-900 shadow">
                {tableCard ? (
                  <span className={tableCard.red ? 'text-rose-600' : 'text-slate-900'}>{tableCard.label}</span>
                ) : (
                  <span className="text-xs text-slate-400">LEAD</span>
                )}
              </div>
              <div className="text-[11px] text-amber-200 text-center">{tlStatus}</div>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {hand.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={tlFinished}
                  onClick={() => playCard(c)}
                  className="w-12 h-16 rounded-xl bg-white hover:-translate-y-1 border-2 border-amber-400 font-display font-bold text-sm shadow transition disabled:opacity-45"
                >
                  <span className={c.red ? 'text-rose-600' : 'text-slate-900'}>{c.label}</span>
                </button>
              ))}
              {tableCard && !tlFinished && (
                <button
                  type="button"
                  onClick={() => {
                    setTableCard(null);
                    setTlStatus('You passed! Dealer plays a fresh lead — your turn to beat it or lead!');
                  }}
                  className="px-3 h-16 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-display font-bold text-xs"
                >
                  Pass
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
