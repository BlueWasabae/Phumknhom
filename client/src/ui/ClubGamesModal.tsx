import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { soundManager } from '../game/systems/SoundManager';
import { Crown, RotateCcw, Spade, Trophy } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

export type ClubGameTab = 'tien_len' | 'ouk_chaktrang';

interface ClubGamesModalProps {
  open: boolean;
  initialGame?: ClubGameTab;
  player: PlayerState;
  onClose: () => void;
  onWinClubReward: (coins: number, happyGain: number, label: string) => void;
}

interface CardItem {
  id: string;
  label: string;
  rank: number; // 3..15 (15 = 2, highest in Tien Len!)
  suitWeight: number; // 0=♠, 1=♣, 2=♦, 3=♥ (hearts highest in Khmer Tien Len!)
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

// Mini 5x5 Ouk Chaktrang (Khmer Chess) Tactical Puzzle!
interface OukPuzzle {
  title: string;
  hint: string;
  piecePos: [number, number]; // [row, col]
  targetKing: [number, number];
  validMove: [number, number];
  pieceLabel: string;
  rewardCoins: number;
}

const OUK_PUZZLES: OukPuzzle[] = [
  {
    title: 'Ouk #1: Ses (Khmer Knight) Royal Leap',
    hint: 'Move your Ses (♞ Knight) in an L-shape to check the Enemy Sdach (♔ King) at C2!',
    piecePos: [3, 1],
    targetKing: [1, 2],
    validMove: [1, 2],
    pieceLabel: '♞ Ses',
    rewardCoins: 140,
  },
  {
    title: 'Ouk #2: Tuuk (Khmer Boat/Rook) Rank Strike',
    hint: 'Slide your Tuuk (♜ Boat) straight along Row 2 to capture the Enemy Sdach at E2!',
    piecePos: [1, 0],
    targetKing: [1, 4],
    validMove: [1, 4],
    pieceLabel: '♜ Tuuk',
    rewardCoins: 160,
  },
  {
    title: 'Ouk #3: Khon (Khmer General) Diagonal Check',
    hint: 'Step your Khon (♝ General) diagonally forward-right to C3 to corner the King!',
    piecePos: [3, 1],
    targetKing: [2, 2],
    validMove: [2, 2],
    pieceLabel: '♝ Khon',
    rewardCoins: 180,
  },
];

export const ClubGamesModal: React.FC<ClubGamesModalProps> = ({
  open,
  initialGame = 'tien_len',
  player,
  onClose,
  onWinClubReward,
}) => {
  const [tab, setTab] = useState<ClubGameTab>(initialGame);

  // Tien Len State
  const [hand, setHand] = useState<CardItem[]>([]);
  const [npcHand, setNpcHand] = useState<CardItem[]>([]);
  const [tableCard, setTableCard] = useState<CardItem | null>(null);
  const [tlStatus, setTlStatus] = useState('Beat the table card with a higher card (2♥ is strongest)!');
  const [tlFinished, setTlFinished] = useState(false);

  // Ouk Chaktrang State
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [oukFeedback, setOukFeedback] = useState('Click the glowing target square to deliver Ouk (Checkmate)!');

  const resetTienLen = () => {
    const dealt = dealTienLenRound();
    setHand(dealt.playerHand);
    setNpcHand(dealt.npcHand);
    setTableCard(null);
    setTlFinished(false);
    setTlStatus('Your lead! Play any card from your hand (2♥ beats everything).');
  };

  useEffect(() => {
    if (open) {
      setTab(initialGame);
      if (hand.length === 0) resetTienLen();
    }
  }, [initialGame, open]);

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
      setTlStatus('🎉 TIEN LEN VICTORY! You cleared your hand first (+120 Coins, +8 Happy)!');
      soundManager.playSfx('victory');
      onWinClubReward(120, 8, 'Tien Len Table Victory');
      return;
    }

    // Club NPC responds with lowest beating card or passes
    const beatIdx = npcHand.findIndex((c) => cardPower(c) > cardPower(card));
    if (beatIdx >= 0) {
      const npcCard = npcHand[beatIdx];
      const nextNpc = npcHand.filter((_, i) => i !== beatIdx);
      setNpcHand(nextNpc);
      setTableCard(npcCard);
      if (nextNpc.length === 0) {
        setTlFinished(true);
        setTlStatus(`Club Dealer cleared first with ${npcCard.label}! Deal again for revenge.`);
      } else {
        setTlStatus(`Club Dealer played ${npcCard.label} (${nextNpc.length} left). Beat it or Pass!`);
      }
    } else {
      setTableCard(null);
      setTlStatus(`Club Dealer PASSED! You keep control — play any card!`);
    }
  };

  const passTurn = () => {
    if (tlFinished || !tableCard) return;
    soundManager.playSfx('click');
    const lead = npcHand[0];
    if (!lead) return;
    const nextNpc = npcHand.slice(1);
    setNpcHand(nextNpc);
    setTableCard(lead);
    if (nextNpc.length === 0) {
      setTlFinished(true);
      setTlStatus(`Club Dealer finished with ${lead.label}! Deal a new hand.`);
    } else {
      setTlStatus(`You passed. Club Dealer leads with ${lead.label}.`);
    }
  };

  const puzzle = OUK_PUZZLES[puzzleIdx % OUK_PUZZLES.length];

  const handleOukSquareClick = (r: number, c: number) => {
    if (r === puzzle.validMove[0] && c === puzzle.validMove[1]) {
      soundManager.playSfx('victory');
      setOukFeedback(`🏆 OUK! Brilliant Khmer Chess strike (+${puzzle.rewardCoins} Coins, +10 Happy)!`);
      onWinClubReward(puzzle.rewardCoins, 10, puzzle.title);
      window.setTimeout(() => {
        setPuzzleIdx((i) => (i + 1) % OUK_PUZZLES.length);
        setOukFeedback('Next Khmer Chess challenge ready!');
      }, 1200);
    } else {
      soundManager.playSfx('hit');
      setOukFeedback(`Not quite! Hint: ${puzzle.hint}`);
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🃏 Phum Night Club · Tien Len & Ouk Chaktrang"
      subtitle={`Player: ${player.name} · Happy: ${player.lifeStats.happy}/100 · Coins: ${player.currencies.coins.toLocaleString()}c`}
      maxWidthClass="w-[min(95vw,660px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('tien_len')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 ${
              tab === 'tien_len'
                ? 'bg-emerald-800 text-white border-emerald-950 shadow'
                : 'bg-amber-50 text-amber-950 border-amber-900/30'
            }`}
          >
            <Spade className="w-4 h-4" /> Tien Len (13-Card Poker)
          </button>
          <button
            type="button"
            onClick={() => setTab('ouk_chaktrang')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 ${
              tab === 'ouk_chaktrang'
                ? 'bg-amber-800 text-white border-amber-950 shadow'
                : 'bg-amber-50 text-amber-950 border-amber-900/30'
            }`}
          >
            <Crown className="w-4 h-4" /> Ouk Chaktrang (Khmer Chess)
          </button>
        </div>

        {tab === 'tien_len' && (
          <div className="p-3.5 rounded-2xl bg-emerald-950 text-emerald-50 border-2 border-amber-500/60 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Club Dealer Cards: {npcHand.length} 🂠</span>
              <span className="text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Win Prize: +120c &amp; +8 Happy
              </span>
            </div>

            <div className="h-24 rounded-xl bg-emerald-900/80 border border-emerald-500/40 flex flex-col items-center justify-center gap-1">
              {tableCard ? (
                <div
                  className={`w-14 h-20 rounded-xl bg-white border-2 border-amber-500 flex items-center justify-center font-display font-bold text-xl shadow-lg ${
                    tableCard.red ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {tableCard.label}
                </div>
              ) : (
                <span className="text-emerald-200/80 font-display font-bold text-xs">
                  Open Felt — Lead Any Card!
                </span>
              )}
            </div>

            <div className="text-center font-display font-bold text-xs text-amber-200">{tlStatus}</div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {hand.map((c) => {
                const playable = !tlFinished && (!tableCard || cardPower(c) > cardPower(tableCard));
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!playable}
                    onClick={() => playCard(c)}
                    className={`w-12 h-16 rounded-xl bg-white border-2 font-display font-bold text-sm flex items-center justify-center transition ${
                      c.red ? 'text-rose-600' : 'text-slate-900'
                    } ${
                      playable
                        ? 'border-amber-400 hover:-translate-y-1.5 shadow-md cursor-pointer'
                        : 'border-slate-500 opacity-45'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                disabled={tlFinished || !tableCard}
                onClick={passTurn}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs disabled:opacity-40"
              >
                Pass Turn
              </button>
              <button
                type="button"
                onClick={resetTienLen}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Deal New Hand
              </button>
            </div>
          </div>
        )}

        {tab === 'ouk_chaktrang' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-display font-bold text-sm text-amber-950">{puzzle.title}</div>
                <div className="text-[11px] text-amber-900">{puzzle.hint}</div>
              </div>
              <span className="px-2 py-1 rounded-lg bg-amber-800 text-amber-50 font-bold text-[10px] shrink-0">
                +{puzzle.rewardCoins}c
              </span>
            </div>

            <div className="grid grid-cols-5 w-60 h-60 mx-auto border-4 border-amber-950 rounded-xl overflow-hidden shadow-lg">
              {Array.from({ length: 25 }, (_, i) => {
                const r = Math.floor(i / 5);
                const c = i % 5;
                const isPiece = r === puzzle.piecePos[0] && c === puzzle.piecePos[1];
                const isKing = r === puzzle.targetKing[0] && c === puzzle.targetKing[1];
                const dark = (r + c) % 2 === 1;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleOukSquareClick(r, c)}
                    className={`flex items-center justify-center text-lg font-bold transition hover:brightness-110 ${
                      dark ? 'bg-amber-800 text-amber-50' : 'bg-amber-200 text-amber-950'
                    } ${isKing ? 'ring-2 ring-inset ring-rose-500' : ''}`}
                  >
                    {isPiece ? puzzle.pieceLabel.split(' ')[0] : isKing ? '♔' : ''}
                  </button>
                );
              })}
            </div>

            <div className="text-center font-display font-bold text-xs text-emerald-900">
              {oukFeedback}
            </div>
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
