import React, { useEffect, useMemo, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  CLUB_PVP_TABLES,
  OUK_PIECE_META,
  applyBayKhomMove,
  applyOukMove,
  canBeatTienLenCombo,
  classifyTienLenCombo,
  createAuthenticOukBoard,
  createInitialBayKhomBoard,
  dealAuthenticTienLen,
  getAuthenticOukLegalMoves,
  hasAnyLegalOukMove,
  isOukKingInCheck,
  type BayKhomBoardState,
  type OukBoard,
  type OukPiece,
  type OukPieceKind,
  type OukSide,
  type TienLenCard,
  type TienLenCombo,
} from '@shared/clubRules';
import { soundManager } from '../game/systems/SoundManager';
import { EventBus } from '../game/EventBus';
import { roomClient } from '../game/network/RoomClient';
import { CheckCircle2, Coins, Crown, Dices, RotateCcw, Spade, Trophy, Users } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

export type ClubGameTab = 'kla_klok' | 'ouk_chaktrang' | 'tien_len' | 'bay_khom';

interface ClubGamesModalProps {
  open: boolean;
  initialGame?: ClubGameTab;
  initialTableId?: string;
  player: PlayerState;
  onClose: () => void;
  onWinClubReward: (coinsDelta: number, happyGain: number, label: string) => void;
}

// ==================== 1. KLA KLOK (KHMER TRADITIONAL 3-DICE — PRESERVED AS-IS) ====================
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

interface LiveClubSeat {
  sessionId: string;
  name: string;
  ready: boolean;
  cardCount: number;
  passed: boolean;
}

interface LiveClubTable {
  tableId: string;
  game: 'tien_len' | 'ouk_chaktrang' | 'bay_khom';
  stakeCoins: number;
  maxSeats: number;
  status: 'waiting' | 'playing' | 'finished';
  seats: LiveClubSeat[];
  turnIndex: number;
  potCoins: number;
  lastSummary: string;
  winnerName: string | null;
  tableCards: TienLenCard[];
  tableComboLabel: string;
  mustIncludeThreeSpades: boolean;
  oukBoardJson: string | null;
  oukTurnSide: OukSide;
  bayKhomJson?: string | null;
}

/**
 * Custom Khmer Pixel-Art SVG Piece Renderer for Authentic Ouk Chaktrang:
 * - Ang (King/Crown), Neang (Queen/Lotus), Koul (General/Mitre),
 * - Ses (War Horse), Tuk (Khmer Longboat), Trey (Mekong Fish), Trey Bork (Promoted Lotus Fish)
 */
const KhmerOukPieceSvg: React.FC<{ piece: OukPiece }> = ({ piece }) => {
  const isWhite = piece.side === 'w';
  const fill = isWhite ? '#fef3c7' : '#291c14';
  const accent = isWhite ? '#d97706' : '#f59e0b';
  const stroke = isWhite ? '#5c3a1e' : '#fde68a';

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm select-none"
      style={{ imageRendering: 'pixelated' }}
      aria-label={`${isWhite ? 'Gold' : 'Ebony'} ${OUK_PIECE_META[piece.kind].khmer}`}
    >
      {/* Carved pedestal base */}
      <rect x="4" y="19" width="16" height="3" rx="1" fill={fill} stroke={stroke} strokeWidth="1.2" />

      {piece.kind === 'K' && (
        <>
          {/* Ang — Spired Angkor Royal Crown */}
          <polygon points="12,2 15,8 19,6 17,18 7,18 5,6 9,8" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <rect x="11" y="2" width="2" height="4" fill={accent} />
          <circle cx="12" cy="12" r="2.2" fill={accent} />
        </>
      )}

      {piece.kind === 'Q' && (
        <>
          {/* Neang — Sacred Blooming Lotus Diadem */}
          <path d="M12 4 C9 8, 7 13, 8 18 L16 18 C17 13, 15 8, 12 4 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <path d="M5 12 C7 11, 9 13, 9 18 L6 18 Z" fill={accent} stroke={stroke} strokeWidth="1" />
          <path d="M19 12 C17 11, 15 13, 15 18 L18 18 Z" fill={accent} stroke={stroke} strokeWidth="1" />
          <circle cx="12" cy="11" r="1.8" fill={accent} />
        </>
      )}

      {piece.kind === 'B' && (
        <>
          {/* Koul — Tall Khmer General Mitre / Pagoda Spire */}
          <polygon points="12,3 17,10 15,18 9,18 7,10" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <line x1="9" y1="11" x2="15" y2="11" stroke={accent} strokeWidth="2" />
          <circle cx="12" cy="6.5" r="1.4" fill={accent} />
        </>
      )}

      {piece.kind === 'N' && (
        <>
          {/* Ses — Carved Khmer War Horse */}
          <path
            d="M8 18 L8 12 L6 10 L10 5 L14 4 L17 7 L16 11 L13 10 L15 14 L16 18 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
          />
          <circle cx="13.5" cy="7.5" r="1.1" fill={accent} />
        </>
      )}

      {piece.kind === 'R' && (
        <>
          {/* Tuk — Traditional Curved Khmer Longboat */}
          <path d="M3 13 Q12 20 21 13 L19 18 L5 18 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <rect x="8" y="9" width="8" height="4" fill={accent} stroke={stroke} strokeWidth="1" />
          <polygon points="12,5 15,9 9,9" fill={fill} stroke={stroke} strokeWidth="1" />
        </>
      )}

      {piece.kind === 'P' && (
        <>
          {/* Trey — Carved Mekong Fish / Shell Pawn */}
          <ellipse cx="12" cy="12" rx="6" ry="4.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <polygon points="12,5 15,8 9,8" fill={accent} />
          <circle cx="10.2" cy="11.5" r="1" fill={accent} />
        </>
      )}

      {piece.kind === 'PB' && (
        <>
          {/* Trey Bork — Promoted Golden Lotus Fish */}
          <ellipse cx="12" cy="13" rx="6.5" ry="4.5" fill={accent} stroke={stroke} strokeWidth="1.3" />
          <polygon points="12,3 15,9 9,9" fill={fill} stroke={stroke} strokeWidth="1.1" />
          <circle cx="12" cy="13" r="1.8" fill={fill} />
        </>
      )}
    </svg>
  );
};

// ==================== LOCAL 2P PASS-AND-PLAY STATE (STRICTLY 2 REAL HUMANS, ZERO AI) ====================
interface LocalTienLenState {
  active: boolean;
  stakeCoins: number;
  hands: [TienLenCard[], TienLenCard[]];
  turnIndex: 0 | 1;
  tableCombo: TienLenCombo | null;
  lastPlayBy: 0 | 1 | null;
  mustIncludeThreeSpades: boolean;
  status: string;
  winnerIndex: 0 | 1 | null;
}

interface LocalOukState {
  active: boolean;
  stakeCoins: number;
  board: OukBoard;
  turnSide: OukSide;
  status: string;
  winnerSide: OukSide | null;
}

export const ClubGamesModal: React.FC<ClubGamesModalProps> = ({
  open,
  initialGame = 'tien_len',
  initialTableId = 'tl_50',
  player,
  onClose,
  onWinClubReward,
}) => {
  const [tab, setTab] = useState<ClubGameTab>(initialGame);
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId);

  // Live Multiplayer Colyseus ClubRoom State
  const [clubOnline, setClubOnline] = useState(false);
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const [liveTables, setLiveTables] = useState<LiveClubTable[]>([]);
  const [privateHand, setPrivateHand] = useState<TienLenCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Local 2-Player Human Pass-and-Play (NO AI!) for playing side-by-side when solo/offline
  const [localTl, setLocalTl] = useState<LocalTienLenState | null>(null);
  const [localOuk, setLocalOuk] = useState<LocalOukState | null>(null);
  const [oukSelectedSq, setOukSelectedSq] = useState<[number, number] | null>(null);
  // Update 3.4 — Bay Khom (10-Hole 42-Seed Khmer Mancala) state
  const [bayKhomBoard, setBayKhomBoard] = useState<BayKhomBoardState>(() => createInitialBayKhomBoard());
  const [localBayKhomActive, setLocalBayKhomActive] = useState(false);

  // ---- Kla Klok state (Preserved As-Is!) ----
  const [chipSize, setChipSize] = useState<number>(50);
  const [bets, setBets] = useState<Partial<Record<KlaKlokSymbolId, number>>>({ gourd: 50 });
  const [dice, setDice] = useState<[KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId]>(['gourd', 'crab', 'fish']);
  const [rolling, setRolling] = useState(false);
  const [kkResultText, setKkResultText] = useState('Place Coins on 1 or more symbols and hit Roll 3 Dice!');

  useEffect(() => {
    if (!open) return;
    setTab(initialGame);
    if (initialTableId) {
      setSelectedTableId(initialTableId);
    } else if (initialGame === 'tien_len') {
      setSelectedTableId('tl_50');
    } else if (initialGame === 'ouk_chaktrang') {
      setSelectedTableId('ouk_50');
    }
    setSelectedCardIds([]);
    setOukSelectedSq(null);
  }, [open, initialGame, initialTableId]);

  // Connect to Multiplayer Colyseus ClubRoom while modal is open
  useEffect(() => {
    if (!open) return;
    let active = true;
    const unsubTables = EventBus.on('club:tablesSync', ({ tables, sessionId, online }) => {
      if (!active) return;
      setClubOnline(online);
      setMySessionId(sessionId);
      setLiveTables(tables as LiveClubTable[]);
    });
    const unsubHand = EventBus.on('club:privateHand', ({ hand }) => {
      if (!active) return;
      setPrivateHand(hand as TienLenCard[]);
      setSelectedCardIds([]);
    });
    const unsubPayout = EventBus.on('club:payout', ({ game, winnerSessionId, winnerName, potCoins, stakeCoins }) => {
      if (!active) return;
      const sid = roomClient.getClubSessionId();
      if (sid && winnerSessionId === sid) {
        soundManager.playSfx('victory');
        onWinClubReward(potCoins - stakeCoins, 14, `🏆 Won PvP ${game === 'tien_len' ? 'Tien Len' : 'Ouk Chaktrang'} (+${potCoins.toLocaleString()} C pot)!`);
      } else if (sid) {
        soundManager.playSfx('hit');
        onWinClubReward(-stakeCoins, 4, `${winnerName} won the PvP table (-${stakeCoins} C stake).`);
      }
    });

    void roomClient
      .connectClub({
        cityServer: player.cityServer ?? 'phnom_penh',
        name: player.name,
      })
      .then((res) => {
        if (!active) return;
        setClubOnline(res.online);
        setMySessionId(res.sessionId);
      });

    return () => {
      active = false;
      unsubTables();
      unsubHand();
      unsubPayout();
    };
  }, [open, player.cityServer, player.name, onWinClubReward]);

  const tablesForCurrentTab = useMemo(() => {
    if (tab === 'kla_klok') return [];
    return CLUB_PVP_TABLES.filter((cfg) => cfg.game === tab).map((cfg) => {
      const live = liveTables.find((lt) => lt.tableId === cfg.tableId);
      return {
        cfg,
        live: live ?? {
          tableId: cfg.tableId,
          game: cfg.game,
          stakeCoins: cfg.stakeCoins,
          maxSeats: cfg.maxSeats,
          status: 'waiting' as const,
          seats: [],
          turnIndex: 0,
          potCoins: 0,
          lastSummary: 'Waiting for real players to sit down & Ready (Multiplayer PvP Only — No AI).',
          winnerName: null,
          tableCards: [],
          tableComboLabel: '',
          mustIncludeThreeSpades: false,
          oukBoardJson: null,
          oukTurnSide: 'w' as OukSide,
        },
      };
    });
  }, [tab, liveTables]);

  const activeEntry =
    tablesForCurrentTab.find((e) => e.cfg.tableId === selectedTableId) ?? tablesForCurrentTab[0];
  const activeLiveTable = activeEntry?.live ?? null;
  const activeCfg = activeEntry?.cfg ?? null;

  const mySeatIndex =
    activeLiveTable && mySessionId
      ? activeLiveTable.seats.findIndex((s) => s.sessionId === mySessionId)
      : -1;
  const isSeatedHere = mySeatIndex >= 0;
  const mySeat = isSeatedHere && activeLiveTable ? activeLiveTable.seats[mySeatIndex] : null;
  const isMyOnlineTurn =
    Boolean(activeLiveTable && activeLiveTable.status === 'playing' && isSeatedHere && activeLiveTable.turnIndex === mySeatIndex);

  // ==================== KLA KLOK HANDLERS ====================
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

  // ==================== TIEN LEN PVP ACTIONS (ONLINE + LOCAL 2P HUMAN PASS-AND-PLAY) ====================
  const startLocal2PTienLen = () => {
    const stake = activeCfg?.stakeCoins ?? 50;
    const dealt = dealAuthenticTienLen(2);
    const starter = dealt.starterIndex === 1 ? 1 : 0;
    soundManager.playSfx('click');
    setSelectedCardIds([]);
    setLocalTl({
      active: true,
      stakeCoins: stake,
      hands: [dealt.hands[0], dealt.hands[1]],
      turnIndex: starter,
      tableCombo: null,
      lastPlayBy: null,
      mustIncludeThreeSpades: dealt.requiresThreeSpades,
      status: `🃏 Dealer dealt 13 cards each! ${starter === 0 ? player.name : 'Player 2'} leads${
        dealt.requiresThreeSpades ? ' with 3♠' : ''
      }.`,
      winnerIndex: null,
    });
  };

  const currentTlHand: TienLenCard[] = localTl?.active
    ? localTl.hands[localTl.turnIndex]
    : privateHand;
  const currentTableCombo: TienLenCombo | null = localTl?.active
    ? localTl.tableCombo
    : activeLiveTable && activeLiveTable.tableCards.length > 0
      ? classifyTienLenCombo(activeLiveTable.tableCards)
      : null;

  const selectedCards = currentTlHand.filter((c) => selectedCardIds.includes(c.id));
  const selectedCombo = classifyTienLenCombo(selectedCards);
  const tlPlayCheck = selectedCombo
    ? canBeatTienLenCombo(
        selectedCombo,
        currentTableCombo,
        localTl?.active ? localTl.mustIncludeThreeSpades : Boolean(activeLiveTable?.mustIncludeThreeSpades)
      )
    : { ok: false, reason: 'Select valid combo: Single, Pair, Triple, Straight (3+, no 2), or Bomb (4-of-a-Kind / 3-4 Consec Pairs).' };

  const toggleSelectCard = (cardId: string) => {
    soundManager.playSfx('click');
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const submitTienLenPlay = () => {
    if (!selectedCombo || !tlPlayCheck.ok) return;
    soundManager.playSfx('coin');
    if (localTl?.active) {
      const idx = localTl.turnIndex;
      const nextHands: [TienLenCard[], TienLenCard[]] = [
        localTl.hands[0].slice(),
        localTl.hands[1].slice(),
      ];
      nextHands[idx] = nextHands[idx].filter((c) => !selectedCardIds.includes(c.id));
      const playerName = idx === 0 ? player.name : 'Player 2';
      setSelectedCardIds([]);
      if (nextHands[idx].length === 0) {
        soundManager.playSfx('victory');
        setLocalTl({
          ...localTl,
          hands: nextHands,
          tableCombo: selectedCombo,
          lastPlayBy: idx,
          mustIncludeThreeSpades: false,
          winnerIndex: idx,
          status: `🏆 ${playerName} cleared all 13 cards & won the ${localTl.stakeCoins * 2} C table pot!`,
        });
        return;
      }
      setLocalTl({
        ...localTl,
        hands: nextHands,
        tableCombo: selectedCombo,
        lastPlayBy: idx,
        turnIndex: idx === 0 ? 1 : 0,
        mustIncludeThreeSpades: false,
        status: `${playerName} played ${selectedCombo.label}! Now ${idx === 0 ? 'Player 2' : player.name}'s turn.`,
      });
      return;
    }

    if (activeLiveTable && isMyOnlineTurn) {
      roomClient.sendClubMessage('tienLenAction', {
        tableId: activeLiveTable.tableId,
        action: 'play',
        cardIds: selectedCardIds,
        comboLabel: selectedCombo.label,
      });
      setSelectedCardIds([]);
    }
  };

  const submitTienLenPass = () => {
    if (!currentTableCombo) return;
    soundManager.playSfx('click');
    if (localTl?.active) {
      const passer = localTl.turnIndex;
      const nextLeader: 0 | 1 = passer === 0 ? 1 : 0;
      const leaderName = nextLeader === 0 ? player.name : 'Player 2';
      setSelectedCardIds([]);
      setLocalTl({
        ...localTl,
        tableCombo: null,
        lastPlayBy: null,
        turnIndex: nextLeader,
        status: `${passer === 0 ? player.name : 'Player 2'} passed! ${leaderName} wins control & leads fresh.`,
      });
      return;
    }
    if (activeLiveTable && isMyOnlineTurn) {
      roomClient.sendClubMessage('tienLenAction', {
        tableId: activeLiveTable.tableId,
        action: 'pass',
      });
      setSelectedCardIds([]);
    }
  };

  // ==================== OUK CHAKTRANG PVP ACTIONS (ONLINE + LOCAL 2P HUMAN PASS-AND-PLAY) ====================
  const startLocal2POuk = () => {
    soundManager.playSfx('click');
    setOukSelectedSq(null);
    setLocalOuk({
      active: true,
      stakeCoins: activeCfg?.stakeCoins ?? 50,
      board: createAuthenticOukBoard(),
      turnSide: 'w',
      status: `♟️ Authentic Ouk Chaktrang (2P PvP): Gold (${player.name}) moves first!`,
      winnerSide: null,
    });
  };

  const activeOukBoard: OukBoard = useMemo(() => {
    if (localOuk?.active) return localOuk.board;
    if (activeLiveTable?.oukBoardJson) {
      try {
        return JSON.parse(activeLiveTable.oukBoardJson) as OukBoard;
      } catch {
        return createAuthenticOukBoard();
      }
    }
    return createAuthenticOukBoard();
  }, [localOuk, activeLiveTable?.oukBoardJson]);

  const activeOukTurnSide: OukSide = localOuk?.active
    ? localOuk.turnSide
    : activeLiveTable?.oukTurnSide ?? 'w';

  const myOnlineOukSide: OukSide | null =
    activeLiveTable && isSeatedHere ? (mySeatIndex === 0 ? 'w' : 'b') : null;

  const canMoveOukNow = localOuk?.active
    ? !localOuk.winnerSide
    : Boolean(activeLiveTable?.status === 'playing' && isMyOnlineTurn && myOnlineOukSide === activeOukTurnSide);

  const oukLegalTargets = useMemo(() => {
    if (!oukSelectedSq || !canMoveOukNow) return [];
    return getAuthenticOukLegalMoves(activeOukBoard, oukSelectedSq[0], oukSelectedSq[1]);
  }, [oukSelectedSq, canMoveOukNow, activeOukBoard]);

  const handleOukSquareClick = (r: number, c: number) => {
    if (!canMoveOukNow) return;
    const clicked = activeOukBoard[r][c];
    const allowedSide: OukSide = localOuk?.active ? localOuk.turnSide : myOnlineOukSide ?? 'w';

    if (oukSelectedSq && oukLegalTargets.some(([mr, mc]) => mr === r && mc === c)) {
      const mover = activeOukBoard[oukSelectedSq[0]][oukSelectedSq[1]]!;
      const { nextBoard, captured, promoted } = applyOukMove(activeOukBoard, oukSelectedSq, [r, c]);
      const nextSide: OukSide = allowedSide === 'w' ? 'b' : 'w';
      const oppInCheck = isOukKingInCheck(nextBoard, nextSide);
      const oppHasMove = hasAnyLegalOukMove(nextBoard, nextSide);
      const winnerSide: OukSide | null =
        captured?.kind === 'K' || (oppInCheck && !oppHasMove) ? allowedSide : null;

      const fileChar = String.fromCharCode(65 + c);
      const rankNum = 8 - r;
      const pieceName = OUK_PIECE_META[mover.kind].khmer.split(' ')[1]?.replace(/[()]/g, '') ?? mover.kind;
      const moveNote = `${pieceName} → ${fileChar}${rankNum}${promoted ? ' ★ Promoted to Trey Bork!' : ''}${
        winnerSide ? ' · CHECKMATE!' : oppInCheck ? ' · OUK (Check!)' : ''
      }`;

      setOukSelectedSq(null);
      soundManager.playSfx(winnerSide ? 'victory' : captured ? 'hit' : 'click');

      if (localOuk?.active) {
        setLocalOuk({
          ...localOuk,
          board: nextBoard,
          turnSide: nextSide,
          winnerSide,
          status: winnerSide
            ? `🏆 ${winnerSide === 'w' ? `Gold (${player.name})` : 'Ebony (Player 2)'} wins by Checkmate (${moveNote})!`
            : `${moveNote} · Now ${nextSide === 'w' ? `Gold (${player.name})` : 'Ebony (Player 2)'}'s turn.`,
        });
        return;
      }

      if (activeLiveTable && isMyOnlineTurn) {
        roomClient.sendClubMessage('oukAction', {
          tableId: activeLiveTable.tableId,
          boardJson: JSON.stringify(nextBoard),
          moveNotation: moveNote,
          nextTurnSide: nextSide,
          winnerSide,
        });
      }
      return;
    }

    if (clicked && clicked.side === allowedSide) {
      soundManager.playSfx('click');
      setOukSelectedSq([r, c]);
    } else {
      setOukSelectedSq(null);
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Phum Night Club · Multiplayer PvP Tables"
      subtitle="Kla Klok (3-Dice) · Authentic 13-Card Tien Len (PvP Only) · Authentic Uncheckered Ouk Chaktrang (PvP Only)"
      maxWidthClass="w-[min(96vw,840px)]"
    >
      {/* Top 3-Game Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            id="tab-club-klaklok"
            type="button"
            onClick={() => {
              soundManager.playSfx('click');
              setTab('kla_klok');
            }}
            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'kla_klok'
                ? 'bg-amber-700 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30'
            }`}
          >
            <Dices className="w-3.5 h-3.5" /> Kla Klok (3-Dice)
          </button>
          <button
            id="tab-club-tienlen"
            type="button"
            onClick={() => {
              soundManager.playSfx('click');
              setTab('tien_len');
              setSelectedTableId('tl_50');
            }}
            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'tien_len'
                ? 'bg-emerald-800 text-amber-50 border-emerald-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30'
            }`}
          >
            <Spade className="w-3.5 h-3.5" /> Tien Len (13-Card PvP)
          </button>
          <button
            id="tab-club-ouk"
            type="button"
            onClick={() => {
              soundManager.playSfx('click');
              setTab('ouk_chaktrang');
              setSelectedTableId('ouk_50');
            }}
            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'ouk_chaktrang'
                ? 'bg-amber-900 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Ouk Chaktrang (Khmer Chess PvP)
          </button>
          <button
            id="tab-club-baykhom"
            type="button"
            onClick={() => {
              soundManager.playSfx('click');
              setTab('bay_khom');
              setSelectedTableId('bk_50');
            }}
            className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'bay_khom'
                ? 'bg-orange-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30'
            }`}
          >
            🥣 Bay Khom (10-Hole Mancala PvP)
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-display font-bold">
          <span
            className={`px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
              clubOnline
                ? 'bg-emerald-100 text-emerald-900 border-emerald-600/40'
                : 'bg-stone-100 text-stone-700 border-stone-400/50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${clubOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
            {clubOnline ? 'PvP Server Live' : 'Offline Lounge'}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-700/40 inline-flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            {player.currencies.coins.toLocaleString()} C
          </span>
        </div>
      </div>

      {/* ==================== TAB 1: KLA KLOK (PRESERVED) ==================== */}
      {tab === 'kla_klok' && (
        <div className="space-y-3 text-xs">
          <div className="p-2.5 rounded-xl bg-amber-100/90 border-2 border-amber-800/40 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-amber-950">
                🎲 Kla Klok (ឃ្លោក ក្ដាម ត្រី មាន់ បង្គា ខ្លា)
              </div>
              <div className="text-[11px] text-amber-900">{kkResultText}</div>
            </div>
            <div className="flex items-center gap-1">
              {WAGER_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    soundManager.playSfx('click');
                    setChipSize(c);
                  }}
                  className={`px-2 py-1 rounded-lg border font-display font-bold text-[10px] cursor-pointer ${
                    chipSize === c
                      ? 'bg-amber-800 text-amber-50 border-amber-950'
                      : 'bg-white text-amber-950 border-amber-900/30'
                  }`}
                >
                  +{c}c
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-2">
            {dice.map((faceId, idx) => {
              const sym = KLA_KLOK_SYMBOLS.find((s) => s.id === faceId)!;
              return (
                <div
                  key={idx}
                  className={`w-16 h-16 rounded-2xl border-2 border-amber-900 bg-amber-50 shadow-md flex flex-col items-center justify-center ${
                    rolling ? 'animate-bounce' : ''
                  }`}
                >
                  <span className="text-2xl">{sym.icon}</span>
                  <span className="text-[9px] font-bold text-amber-950">{sym.name}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KLA_KLOK_SYMBOLS.map((sym) => {
              const staked = bets[sym.id] ?? 0;
              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => addBetOnSymbol(sym.id)}
                  className={`p-2.5 rounded-2xl border-2 text-center transition cursor-pointer hover:scale-[1.02] ${sym.colorClass}`}
                >
                  <div className="text-2xl">{sym.icon}</div>
                  <div className="font-display font-bold text-amber-950 text-xs">{sym.name}</div>
                  <div className="text-[10px] text-amber-800">{sym.khmerName}</div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-950/15 font-bold text-[10px] text-amber-950">
                    {staked > 0 ? `Bet: ${staked} C` : `Tap +${chipSize}c`}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setBets({})}
              className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-display font-bold text-xs cursor-pointer"
            >
              Clear Bets ({totalBet}c)
            </button>
            <button
              type="button"
              disabled={rolling || totalBet <= 0 || totalBet > player.currencies.coins}
              onClick={rollKlaKlok}
              className="phum-btn px-5 py-2 rounded-xl font-display font-bold text-xs disabled:opacity-45 cursor-pointer"
            >
              🎲 Roll 3 Dice (Total Bet: {totalBet} C)
            </button>
          </div>
        </div>
      )}

      {/* ==================== MULTI-TABLE PVP LOBBY SELECTOR (NO AI — TIEN LEN & OUK) ==================== */}
      {tab !== 'kla_klok' && (
        <div className="space-y-3 text-xs max-h-[68dvh] overflow-y-auto pr-1">
          {/* 3 Distinct Stake Tables */}
          <div className="grid grid-cols-3 gap-2">
            {tablesForCurrentTab.map(({ cfg, live }) => {
              const selected = activeCfg?.tableId === cfg.tableId;
              return (
                <button
                  key={cfg.tableId}
                  type="button"
                  onClick={() => {
                    soundManager.playSfx('click');
                    setSelectedTableId(cfg.tableId);
                  }}
                  className={`p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                    selected
                      ? 'bg-slate-900 text-amber-50 border-amber-400 shadow'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display font-bold text-[11px] truncate">{cfg.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        cfg.stakeCoins >= 1000
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {cfg.tierBadge}
                    </span>
                  </div>
                  <div className={`text-[10px] mt-0.5 flex items-center justify-between ${selected ? 'text-amber-200' : 'text-amber-800'}`}>
                    <span>{cfg.khmerLabel}</span>
                    <span className="font-mono font-bold inline-flex items-center gap-0.5">
                      <Users className="w-3 h-3" /> {live.seats.length}/{cfg.maxSeats}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Seated Players Bar + Sit / Ready / Local 2P PvP Controls (STRICTLY NO AI!) */}
          {activeCfg && activeLiveTable && (
            <div className="p-2.5 rounded-xl bg-slate-900/95 text-amber-50 border-2 border-amber-500/50 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-amber-300 flex items-center gap-1.5">
                    <span>{tab === 'tien_len' ? '🃏' : '♟️'}</span>
                    <span>{activeCfg.label} — Strictly Multiplayer PvP (Zero AI)</span>
                  </div>
                  <div className="text-[10px] text-amber-100/90">{activeLiveTable.lastSummary}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {clubOnline && !isSeatedHere && activeLiveTable.status !== 'playing' && (
                    <button
                      type="button"
                      disabled={player.currencies.coins < activeCfg.stakeCoins || activeLiveTable.seats.length >= activeCfg.maxSeats}
                      onClick={() => {
                        soundManager.playSfx('click');
                        setLocalTl(null);
                        setLocalOuk(null);
                        roomClient.sendClubMessage('seatTable', { tableId: activeCfg.tableId });
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-[11px] disabled:opacity-45 cursor-pointer"
                    >
                      Sit Down ({activeCfg.stakeCoins} C)
                    </button>
                  )}
                  {clubOnline && isSeatedHere && activeLiveTable.status !== 'playing' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playSfx('click');
                          roomClient.sendClubMessage('readyTable', {
                            tableId: activeCfg.tableId,
                            ready: !mySeat?.ready,
                          });
                        }}
                        className={`px-3 py-1 rounded-lg font-display font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                          mySeat?.ready
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {mySeat?.ready ? 'Ready ✓' : 'Click Ready'}
                      </button>
                      <button
                        type="button"
                        onClick={() => roomClient.sendClubMessage('leaveTable', {})}
                        className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Leave Seat
                      </button>
                    </>
                  )}
                  <button
                    id={tab === 'tien_len' ? 'btn-start-local-2p-tl' : 'btn-start-local-2p-ouk'}
                    type="button"
                    onClick={tab === 'tien_len' ? startLocal2PTienLen : startLocal2POuk}
                    className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-display font-bold text-[10px] cursor-pointer"
                    title="2 real humans taking turns on the same screen (zero AI bots)"
                  >
                    👥 Local 2P PvP (No AI)
                  </button>
                </div>
              </div>

              {/* Live Seat Badges */}
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: activeCfg.maxSeats }, (_, i) => {
                  const s = activeLiveTable.seats[i];
                  return (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 ${
                        s
                          ? activeLiveTable.status === 'playing' && activeLiveTable.turnIndex === i
                            ? 'bg-amber-400 text-slate-950 border-yellow-200 animate-pulse'
                            : 'bg-slate-800 text-amber-100 border-amber-500/40'
                          : 'bg-slate-950/60 text-slate-400 border-slate-700 border-dashed'
                      }`}
                    >
                      <span>Seat {i + 1}:</span>
                      <span>{s ? s.name : 'Empty (Waiting for Player)'}</span>
                      {s && activeLiveTable.status !== 'playing' && (
                        <span className={s.ready ? 'text-emerald-400' : 'text-amber-300'}>
                          {s.ready ? '✓ READY' : '…'}
                        </span>
                      )}
                      {s && activeLiveTable.status === 'playing' && tab === 'tien_len' && (
                        <span className="px-1 rounded bg-black/25 font-mono">{s.cardCount}🃏</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: AUTHENTIC 13-CARD TIEN LEN PVP TABLE ==================== */}
          {tab === 'tien_len' && (
            <div className="p-3 rounded-2xl bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-amber-500/80 text-amber-50 space-y-3">
              {/* Visible Dealer NPC at the Head of the Table */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-700/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-full bg-amber-950 border-2 border-amber-400 flex flex-col items-center justify-center shrink-0 shadow">
                    <span className="text-lg leading-none">🤵</span>
                    <span className="text-[7px] font-bold text-amber-300 uppercase">DEALER</span>
                  </div>
                  <div>
                    <div className="font-display font-bold text-amber-300 text-xs">
                      Dealer Sokha · Authentic 13-Card Tien Len (52-Card Deck)
                    </div>
                    <div className="text-[10px] text-emerald-100">
                      {localTl?.active
                        ? localTl.status
                        : activeLiveTable?.status === 'playing'
                          ? activeLiveTable.lastSummary
                          : 'Sit at a table with 2–4 real players & click Ready (or launch Local 2P PvP) so the Dealer deals 13 cards!'}
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-amber-200 bg-black/30 px-2 py-1 rounded-lg border border-amber-400/30 leading-tight">
                  <div><strong>Order:</strong> 3 &lt; 4 … &lt; A &lt; 2 · <strong>Suits:</strong> ♠ &lt; ♣ &lt; ♦ &lt; ♥</div>
                  <div><strong>Bombs (Chặt):</strong> Four-of-a-Kind or 3/4 Consecutive Pairs chop 2s!</div>
                </div>
              </div>

              {/* Center Felt Pile */}
              <div className="min-h-[82px] rounded-xl bg-emerald-950/75 border border-emerald-600/50 p-2.5 flex flex-col items-center justify-center gap-1.5">
                {currentTableCombo ? (
                  <>
                    <div className="text-[10px] font-bold uppercase text-amber-300">
                      Current Table Combo: {currentTableCombo.label}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {currentTableCombo.cards.map((c) => (
                        <div
                          key={c.id}
                          className={`w-11 h-14 rounded-lg bg-white border-2 border-amber-400 shadow-md flex flex-col items-center justify-center font-display font-bold text-sm ${
                            c.red ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-emerald-200/80 italic">
                    Fresh Lead — play any valid Single, Pair, Triple, Straight (3+, no 2), or Bomb!
                  </div>
                )}
              </div>

              {/* Active Player's 13-Card Sorted Hand */}
              {(localTl?.active || activeLiveTable?.status === 'playing') && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-display font-bold text-xs text-amber-200">
                      {localTl?.active
                        ? `Active Turn: ${localTl.turnIndex === 0 ? player.name : 'Player 2'} (${currentTlHand.length} cards)`
                        : isMyOnlineTurn
                          ? `🟢 YOUR TURN (${currentTlHand.length} cards)`
                          : `Waiting for ${activeLiveTable?.seats[activeLiveTable.turnIndex]?.name ?? 'opponent'}...`}
                    </div>
                    {selectedCombo ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tlPlayCheck.ok ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white'
                        }`}
                      >
                        {selectedCombo.label} {!tlPlayCheck.ok && tlPlayCheck.reason ? `— ${tlPlayCheck.reason}` : '✓'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-200/85">
                        Click 1+ cards to build a Single, Pair, Triple, Straight, or Bomb
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {currentTlHand.map((card) => {
                      const picked = selectedCardIds.includes(card.id);
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => toggleSelectCard(card.id)}
                          className={`w-11 h-16 rounded-lg bg-white border-2 font-display font-bold text-sm flex flex-col items-center justify-center transition cursor-pointer shadow ${
                            card.red ? 'text-rose-600' : 'text-slate-900'
                          } ${
                            picked
                              ? 'border-amber-400 -translate-y-2.5 ring-2 ring-yellow-300 shadow-lg'
                              : 'border-slate-300 hover:-translate-y-1'
                          }`}
                        >
                          <span>{card.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={
                        !tlPlayCheck.ok ||
                        (localTl?.active ? localTl.winnerIndex !== null : !isMyOnlineTurn)
                      }
                      onClick={submitTienLenPlay}
                      className="phum-btn px-4 py-1.5 rounded-xl font-display font-bold text-xs disabled:opacity-40 cursor-pointer"
                    >
                      Play Selected Combo
                    </button>
                    <button
                      type="button"
                      disabled={
                        !currentTableCombo ||
                        (localTl?.active ? localTl.winnerIndex !== null : !isMyOnlineTurn)
                      }
                      onClick={submitTienLenPass}
                      className="px-4 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-display font-bold text-xs disabled:opacity-40 cursor-pointer"
                    >
                      Pass Turn
                    </button>
                    {localTl?.active && localTl.winnerIndex !== null && (
                      <button
                        type="button"
                        onClick={startLocal2PTienLen}
                        className="px-4 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-display font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Deal New 13-Card Round
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: AUTHENTIC UNCHECKERED OUK CHAKTRANG PVP ==================== */}
          {tab === 'ouk_chaktrang' && (
            <div className="grid md:grid-cols-[auto_1fr] gap-3 items-start">
              {/* Uncheckered Carved Teak-Wood 8x8 Grid (ZERO Black/White Western Checkerboard!) */}
              <div className="p-2.5 rounded-2xl bg-[#6b3f1d] border-4 border-[#45240d] shadow-xl mx-auto">
                <div
                  id="ouk-uncheckered-board"
                  className="grid grid-cols-8 border-2 border-[#4a2b13] bg-[#d8b27c]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(92,58,30,0.06) 0px, rgba(92,58,30,0.06) 3px, transparent 3px, transparent 11px)',
                  }}
                >
                  {activeOukBoard.map((row, r) =>
                    row.map((piece, c) => {
                      const isSel = oukSelectedSq?.[0] === r && oukSelectedSq?.[1] === c;
                      const isTarget = oukLegalTargets.some(([mr, mc]) => mr === r && mc === c);
                      // Subtle traditional promotion-rank wood trim on 3rd (row 5) & 6th (row 2) ranks
                      const isPromoLine = r === 2 || r === 5;
                      return (
                        <button
                          key={`${r}-${c}`}
                          type="button"
                          onClick={() => handleOukSquareClick(r, c)}
                          className={`w-9 h-9 sm:w-11 sm:h-11 border border-[#5c3a1e]/85 flex items-center justify-center relative transition cursor-pointer ${
                            isSel
                              ? 'bg-[#facc15]/60 ring-2 ring-inset ring-amber-950'
                              : isTarget
                                ? 'bg-emerald-500/35 hover:bg-emerald-500/50'
                                : 'bg-[#d8b27c] hover:bg-[#e3c08d]'
                          }`}
                          title={
                            piece
                              ? `${piece.side === 'w' ? 'Gold' : 'Ebony'} ${OUK_PIECE_META[piece.kind].khmer} — ${OUK_PIECE_META[piece.kind].rule}`
                              : `${String.fromCharCode(65 + c)}${8 - r}`
                          }
                        >
                          {isPromoLine && !piece && !isTarget && (
                            <span className="w-1 h-1 rounded-full bg-[#5c3a1e]/25 pointer-events-none" />
                          )}
                          {isTarget && !piece && (
                            <span className="w-3 h-3 rounded-full bg-emerald-700/80 border border-amber-100 pointer-events-none" />
                          )}
                          {isTarget && piece && (
                            <span className="absolute inset-0.5 rounded border-2 border-rose-600 pointer-events-none" />
                          )}
                          {piece && <KhmerOukPieceSvg piece={piece} />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Authentic Rules Reference & Match Status */}
              <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-900/35 space-y-2.5 text-[11px]">
                <div className="font-display font-bold text-sm text-amber-950 flex items-center justify-between gap-2">
                  <span>♟️ អុកចត្រង្គ · Authentic Ouk Chaktrang</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-800 text-amber-50 text-[10px]">
                    Turn: {activeOukTurnSide === 'w' ? 'Gold (White)' : 'Ebony (Black)'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-amber-100/90 border border-amber-900/25 font-bold text-amber-950">
                  {localOuk?.active
                    ? localOuk.status
                    : activeLiveTable?.status === 'playing'
                      ? activeLiveTable.lastSummary
                      : 'Sit down with a real opponent & click Ready (or launch Local 2P PvP) to play Authentic Khmer Chess!'}
                </div>

                {localOuk?.active && localOuk.winnerSide && (
                  <button
                    type="button"
                    onClick={startLocal2POuk}
                    className="w-full phum-btn py-1.5 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Play Rematch (Local 2P PvP)
                  </button>
                )}

                <div className="space-y-1 text-[10px] text-amber-900">
                  <div className="font-display font-bold uppercase text-amber-950">Authentic Khmer Piece Rules:</div>
                  {(['K', 'Q', 'B', 'N', 'R', 'P', 'PB'] as OukPieceKind[]).map((kind) => (
                    <div key={kind} className="flex items-center gap-2 bg-white/75 px-2 py-1 rounded-lg border border-amber-900/15">
                      <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                        <KhmerOukPieceSvg piece={{ side: 'w', kind, hasMoved: false }} />
                      </div>
                      <div className="leading-tight">
                        <strong className="text-amber-950">{OUK_PIECE_META[kind].khmer}:</strong>{' '}
                        {OUK_PIECE_META[kind].rule}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* ==================== TAB 4 (UPDATE 3.4): BAY KHOM (10-HOLE 42-SEED KHMER MANCALA PVP) ==================== */}
          {tab === 'bay_khom' && (
            <div className="space-y-3">
              {(() => {
                const liveBk: BayKhomBoardState | null = activeLiveTable?.bayKhomJson
                  ? (() => {
                      try {
                        return JSON.parse(activeLiveTable.bayKhomJson) as BayKhomBoardState;
                      } catch {
                        return null;
                      }
                    })()
                  : null;
                const board = localBayKhomActive ? bayKhomBoard : (liveBk ?? bayKhomBoard);
                const totalOnBoard = board.holes.reduce((a, b) => a + b, 0);
                const handleSow = (holeIdx: number) => {
                  const next = applyBayKhomMove(board, holeIdx);
                  if (!next) {
                    soundManager.playSfx('hit');
                    return;
                  }
                  soundManager.playSfx('coin');
                  if (localBayKhomActive || !activeLiveTable || activeLiveTable.status !== 'playing') {
                    setLocalBayKhomActive(true);
                    setBayKhomBoard(next);
                    if (next.winner === 0) {
                      soundManager.playSfx('victory');
                      onWinClubReward(activeCfg?.stakeCoins ?? 50, 10, `🥣 Won Bay Khom (+${activeCfg?.stakeCoins ?? 50} C)!`);
                    }
                  } else {
                    setBayKhomBoard(next);
                    roomClient.sendClubMessage('bayKhomMove', {
                      tableId: activeLiveTable.tableId,
                      boardJson: JSON.stringify(next),
                      winnerIdx: next.winner === 0 || next.winner === 1 ? next.winner : null,
                      summary: next.lastAction,
                    });
                  }
                };

                return (
                  <div className="p-4 rounded-2xl bg-[#5c3214] border-4 border-[#3a1d09] shadow-xl space-y-3 text-amber-50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-sm text-yellow-200">
                          🥣 បាយខុម · Authentic 10-Hole Khmer Mancala (42 Seeds · Strictly PvP)
                        </h3>
                        <p className="text-[11px] text-amber-200/90">{board.lastAction}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40">
                          P1 Store: {board.stores[0]} · P2 Store: {board.stores[1]} · Board: {totalOnBoard}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLocalBayKhomActive(true);
                            setBayKhomBoard(createInitialBayKhomBoard());
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-amber-950 hover:bg-amber-400 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> New 2P Table
                        </button>
                      </div>
                    </div>

                    {/* Carved Oval 10-Hole Wooden Board: End-Tip #0 (5 seeds), Top Side #9..#6 (P2), Bottom Side #1..#4 (P1), End-Tip #5 (5 seeds) */}
                    <div
                      id="bay-khom-oval-board"
                      className="rounded-full bg-gradient-to-b from-[#9a5b2b] to-[#6f3e19] border-4 border-[#3d200c] px-4 py-4 grid grid-cols-[64px_1fr_64px] items-center gap-3 shadow-inner"
                    >
                      {/* West End-Tip Hole #0 (5 Seeds) */}
                      <div className="h-24 rounded-full bg-[#3a1e0b] border-2 border-amber-400/70 flex flex-col items-center justify-center shadow-inner">
                        <span className="text-[10px] font-bold text-amber-300">TIP #0</span>
                        <span className="text-xl font-display font-bold text-yellow-300">{board.holes[0]}</span>
                        <span className="text-[9px] text-amber-200/80">seeds</span>
                      </div>

                      {/* 8 Side Holes: Top row (P2: 9,8,7,6) & Bottom row (P1: 1,2,3,4) */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-4 gap-2">
                          {[9, 8, 7, 6].map((hIdx) => {
                            const playable = board.turn === 1 && board.holes[hIdx] > 0 && board.winner === null;
                            return (
                              <button
                                key={hIdx}
                                type="button"
                                disabled={!playable}
                                onClick={() => handleSow(hIdx)}
                                className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition ${
                                  playable
                                    ? 'bg-[#45240e] border-yellow-300 hover:bg-[#5c3114] cursor-pointer shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                                    : 'bg-[#331a09] border-amber-900/60 opacity-85 cursor-not-allowed'
                                }`}
                              >
                                <span className="text-[9px] text-amber-300/80">P2 · #{hIdx}</span>
                                <span className="text-base font-display font-bold text-amber-50">{board.holes[hIdx]}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((hIdx) => {
                            const playable = board.turn === 0 && board.holes[hIdx] > 0 && board.winner === null;
                            return (
                              <button
                                key={hIdx}
                                type="button"
                                disabled={!playable}
                                onClick={() => handleSow(hIdx)}
                                className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition ${
                                  playable
                                    ? 'bg-[#45240e] border-emerald-300 hover:bg-[#5c3114] cursor-pointer shadow-[0_0_10px_rgba(52,211,153,0.35)]'
                                    : 'bg-[#331a09] border-amber-900/60 opacity-85 cursor-not-allowed'
                                }`}
                              >
                                <span className="text-[9px] text-emerald-300/90">P1 · #{hIdx}</span>
                                <span className="text-base font-display font-bold text-amber-50">{board.holes[hIdx]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* East End-Tip Hole #5 (5 Seeds) */}
                      <div className="h-24 rounded-full bg-[#3a1e0b] border-2 border-amber-400/70 flex flex-col items-center justify-center shadow-inner">
                        <span className="text-[10px] font-bold text-amber-300">TIP #5</span>
                        <span className="text-xl font-display font-bold text-yellow-300">{board.holes[5]}</span>
                        <span className="text-[9px] text-amber-200/80">seeds</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </NativeDialog>
  );
};
