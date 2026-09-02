import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Bot, User, Trophy, RotateCcw, Wifi, Monitor, Globe } from 'lucide-react';
import type { GameState } from '@/lib/types';
import {
  createGame, rollDice, getMovablePawns, applyMove, aiChoosePawn,
  hasAnyLegalMove, moveSizeOptions, captureTurnSnapshot, rollbackTurn,
} from '@/lib/gameEngine';
import { sfx } from '@/lib/sound';
import { useI18n } from '@/lib/i18nContext';
import Board from './Board';
import Dice from './Dice';
import Pawn3D from './Pawn3D';
import LanguageSwitcher from '../LanguageSwitcher';

export type GameMode = 'ai' | 'passplay' | 'online';

interface Props {
  onExit: () => void;
  onWin: () => void;
  onOpenOnline: () => void;
}

const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',     // P1: Glossy Red
  cyan: '#FACC15',   // P2: Glossy Yellow
  green: '#22C55E',  // P3: Glossy Green
  purple: '#3B82F6', // P4: Glossy Blue
};

const DARK_MAP: Record<string, string> = {
  red: '#991B1B',
  cyan: '#CA8A04',
  green: '#15803D',
  purple: '#1D4ED8',
};

// All ways a dice value can be split into individual move sizes.
// 4 → [4] (spawn 1 or move 4)
// 8 → [8] (move 8), [4,4] (spawn up to 2, or move 4 twice), [4, spawn+4, ...]
// We let the player pick the move size, then tap a pawn. The remainder stays available.
function splitOptions(dice: number): number[] {
  return moveSizeOptions(dice);
}

export default function GameScreen({ onExit, onWin, onOpenOnline }: Props) {
  const { t } = useI18n();
  const [screen, setScreen] = useState<'modes' | 'select' | 'play'>('modes');
  const [mode, setMode] = useState<GameMode>('ai');
  const [numPlayers, setNumPlayers] = useState(2);
  const [vsAI, setVsAI] = useState(true);
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const aiTimer = useRef<number | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const startGame = useCallback(() => {
    sfx.click();
    const ai = mode === 'ai' ? true : vsAI;
    const g = createGame(numPlayers, ai);
    const withSnapshot = captureTurnSnapshot(g);
    setState(withSnapshot);
    setScreen('play');
  }, [mode, numPlayers, vsAI]);

  const handleRoll = useCallback(() => {
    const cur = stateRef.current;
    if (!cur || cur.phase !== 'roll' || cur.rolling) return;
    // Capture snapshot at the start of a fresh turn sequence (before any rolls).
    if (!cur.turnSnapshot) {
      setState((s) => s ? captureTurnSnapshot(s) : s);
    }
    sfx.roll();
    setState((s) => s ? { ...s, rolling: true } : s);
    setTimeout(() => {
      const dice = rollDice();
      const cur2 = stateRef.current;
      if (!cur2) return;
      const anyLegal = hasAnyLegalMove(cur2, cur2.currentPlayer, dice);
      const hasExtra = [4, 8].includes(dice);
      // No legal moves at all.
      if (!anyLegal) {
        // Check if the player already made moves this turn sequence (snapshot differs).
        const snap = cur2.turnSnapshot;
        const hadMoves = snap !== null && snap.players.some((ps, pi) =>
          ps.pawns.some((p, pj) => p.position !== cur2.players[pi].pawns[pj].position)
        );
        if (hadMoves) {
          // Roll back ALL movements made this turn sequence and pass to next player.
          setState((s) => {
            if (!s) return s;
            return {
              ...s,
              dice,
              rolling: false,
              phase: 'roll',
              message: `${s.players[s.currentPlayer].name}: ${t('turnReset')}`,
              extraRoll: false,
              movesLeft: 0,
              moveSize: null,
            };
          });
          setTimeout(() => {
            setState((s) => s ? rollbackTurn(s) : s);
          }, 1200);
        } else {
          // First roll with no moves — just pass, no rollback needed.
          setState((s) => {
            if (!s) return s;
            return {
              ...s,
              dice,
              rolling: false,
              phase: 'roll',
              message: `${s.players[s.currentPlayer].name}: ${t('noMoves')}`,
              extraRoll: false,
              movesLeft: 0,
              moveSize: null,
            };
          });
          setTimeout(() => {
            setState((s) => {
              if (!s) return s;
              const next = (s.currentPlayer + 1) % s.players.length;
              return { ...s, currentPlayer: next, dice: null, phase: 'roll', message: `${s.players[next].name}${t('yourTurn')}`, movesLeft: 0, moveSize: null, turnSnapshot: null };
            });
          }, 1200);
        }
        return;
      }
      // There is at least one legal move. Default move size = dice (or 8 for an 8-roll).
      const movable = getMovablePawns(cur2, cur2.currentPlayer, dice);
      setState((s) => {
        if (!s) return s;
        const message = hasExtra && movable.length === 0
          ? `${s.players[s.currentPlayer].name}: ${t('rollAgain')}`
          : `${s.players[s.currentPlayer].name}: ${t('tapPawn')}`;
        return {
          ...s,
          dice,
          rolling: false,
          phase: 'move',
          message,
          extraRoll: hasExtra,
          movesLeft: dice,
          moveSize: dice,
        };
      });
    }, 700);
  }, [t]);

  // Human taps a pawn. Uses state.moveSize as the step count for this move.
  const handlePawnClick = useCallback((pawnId: number) => {
    const cur = stateRef.current;
    if (!cur || cur.phase !== 'move' || cur.moveSize === null) return;
    const result = applyMove(cur, pawnId, cur.moveSize);
    if (!result.moved) {
      sfx.error();
      return;
    }
    setState(result.state);
    if (result.state.phase === 'over') {
      onWin();
    }
  }, [onWin]);

  // Human selects a different move size (e.g. switch from 8 to 4 to split).
  const handleSelectMoveSize = useCallback((size: number) => {
    sfx.click();
    setState((s) => s ? { ...s, moveSize: size } : s);
  }, []);

  // AI turn
  useEffect(() => {
    if (!state || screen !== 'play' || state.phase === 'over') return;
    const player = state.players[state.currentPlayer];
    if (!player.isAI) return;

    if (state.phase === 'roll' && !state.rolling && state.dice === null) {
      aiTimer.current = window.setTimeout(() => handleRoll(), 800);
    } else if (state.phase === 'move' && state.moveSize !== null) {
      aiTimer.current = window.setTimeout(() => {
        const choice = aiChoosePawn(state, state.moveSize!);
        if (choice !== null) {
          handlePawnClick(choice);
        } else {
          // No movable pawn for current move size. If movesLeft > 0 and we can
          // switch to a smaller split, try that; otherwise end turn.
          const cur = stateRef.current;
          if (!cur) return;
          const opts = splitOptions(cur.movesLeft).filter((o) => o !== cur.moveSize);
          let switched = false;
          for (const opt of opts) {
            const movable = getMovablePawns(cur, cur.currentPlayer, opt);
            if (movable.length > 0) {
              setState((s) => s ? { ...s, moveSize: opt } : s);
              switched = true;
              break;
            }
          }
          if (!switched) {
            // Check if the AI already made moves this turn (snapshot differs).
            const snap = cur.turnSnapshot;
            const hadMoves = snap !== null && snap.players.some((ps, pi) =>
              ps.pawns.some((p, pj) => p.position !== cur.players[pi].pawns[pj].position)
            );
            if (hadMoves) {
              setState((s) => {
                if (!s) return s;
                return { ...s, message: `${s.players[s.currentPlayer].name}: ${t('turnReset')}` };
              });
              setTimeout(() => {
                setState((s) => s ? rollbackTurn(s) : s);
              }, 1200);
            } else {
              setState((s) => {
                if (!s) return s;
                const next = (s.currentPlayer + 1) % s.players.length;
                return { ...s, currentPlayer: next, dice: null, phase: 'roll', message: `${s.players[next].name}${t('yourTurn')}`, movesLeft: 0, moveSize: null, turnSnapshot: null };
              });
            }
          }
        }
      }, 900);
    }
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [state, screen, handleRoll, handlePawnClick, t]);

  // Compute movable pawn IDs based on the CURRENT move size.
  const movableIds = new Set<string>();
  if (state && state.phase === 'move' && state.moveSize !== null) {
    const movable = getMovablePawns(state, state.currentPlayer, state.moveSize);
    movable.forEach((p) => movableIds.add(`${p.player}-${p.id}`));
  }

  const currentPlayerColor = state ? COLOR_MAP[state.players[state.currentPlayer].color] : '#6366f1';
  const isPassPlay = !!(mode === 'passplay' && state && state.players.length === 2 && !state.players.some((p) => p.isAI));

  // ---------- MODE SELECTION ----------
  if (screen === 'modes') {
    const modes = [
      { id: 'ai' as GameMode, icon: Bot, title: t('vsAIOffline'), colors: 'from-indigo-500 to-blue-600', glow: 'shadow-indigo-500/40' },
      { id: 'passplay' as GameMode, icon: Users, title: t('passAndPlay'), colors: 'from-pink-500 to-rose-600', glow: 'shadow-pink-500/40' },
      { id: 'online' as GameMode, icon: Wifi, title: t('onlineFriends'), colors: 'from-amber-400 to-orange-600', glow: 'shadow-amber-500/40' },
    ];

    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-pink-600/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { sfx.click(); onExit(); }} className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-black">{t('choukaBara3D')}</h1>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm"
            >
              <h2 className="mb-5 text-center text-lg font-bold">{t('gameModes')}</h2>
              <div className="space-y-3">
                {modes.map((m, i) => (
                  <motion.button
                    key={m.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      sfx.click();
                      if (m.id === 'online') { onOpenOnline(); return; }
                      setMode(m.id);
                      setVsAI(m.id === 'ai');
                      setNumPlayers(m.id === 'ai' ? 2 : 2);
                      setScreen('select');
                    }}
                    className={`group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r ${m.colors} p-4 text-left shadow-xl ${m.glow}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <m.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-base font-bold text-white">{m.title}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PLAYER SELECT ----------
  if (screen === 'select' || !state) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-pink-600/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => { sfx.click(); setScreen('modes'); }} className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black">{t('choukaBara3D')}</h1>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <h2 className="mb-1 text-center text-lg font-bold">{t('selectPlayers')}</h2>
              <p className="mb-5 text-center text-xs text-slate-400">{t('howManyPlay')}</p>

              <div className="mb-5 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => { sfx.click(); setNumPlayers(n); }}
                    className={`flex flex-col items-center gap-1 rounded-2xl border py-3 transition ${
                      numPlayers === n
                        ? 'border-indigo-400 bg-indigo-500/20 text-white'
                        : 'border-white/10 bg-slate-900/50 text-slate-400'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-bold">{n}</span>
                  </button>
                ))}
              </div>

              {mode === 'passplay' && (
                <button
                  onClick={() => { sfx.click(); setVsAI(!vsAI); }}
                  className={`mb-5 flex w-full items-center justify-between rounded-2xl border p-3 transition ${
                    vsAI ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-slate-900/50'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {vsAI ? <Bot className="h-5 w-5 text-emerald-400" /> : <User className="h-5 w-5 text-slate-400" />}
                    {vsAI ? t('vsAI') : t('allHuman')}
                  </span>
                  <span className={`relative h-6 w-11 rounded-full transition ${vsAI ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${vsAI ? 'left-5' : 'left-0.5'}`} />
                  </span>
                </button>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startGame}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-3.5 font-bold shadow-lg shadow-indigo-500/30"
              >
                {t('startGame')}
              </motion.button>

              <div className="mt-5 space-y-1.5 text-[11px] text-slate-500">
                <p>• {t('rule1')}</p>
                <p>• {t('rule2')}</p>
                <p>• {t('rule3')}</p>
                <p>• {t('rule4')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PLAY SCREEN ----------
  const isCurrentAI = state.players[state.currentPlayer].isAI;
  const showMoveSizeToggle = state.phase === 'move' && state.dice === 8 && splitOptions(state.dice).length > 1 && !isCurrentAI;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full blur-3xl" style={{ background: currentPlayerColor + '20' }} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <button onClick={() => { sfx.click(); onExit(); }} className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-black">{t('choukaBara3D')}</h1>
          <button
            onClick={() => { sfx.click(); startGame(); }}
            className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        {/* Player panels */}
        <div className="flex flex-wrap justify-center gap-2 px-3 pb-2">
          {state.players.map((p) => {
            const isCurrent = p.index === state.currentPlayer;
            const color = COLOR_MAP[p.color];
            const homeCount = p.pawns.filter((pn) => pn.position === 30).length;
            return (
              <div
                key={p.index}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${
                  isCurrent ? 'border-white/40 bg-white/10' : 'border-white/5 bg-slate-900/50'
                }`}
                style={isCurrent ? { boxShadow: `0 0 12px ${color}50` } : undefined}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                <span className="text-[11px] font-semibold">{p.name}</span>
                {p.isAI && <Bot className="h-3 w-3 text-slate-500" />}
                <span className="text-[10px] text-amber-400">{homeCount}/4</span>
                {isCurrent && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="h-1.5 w-1.5 rounded-full bg-white"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* TOP dice (Player 2 in pass&play, flipped) */}
        {isPassPlay && (
          <div className="flex justify-center pb-2">
            <div className="flex flex-col items-center gap-1" style={{ transform: 'rotate(180deg)' }}>
              <span className="text-[10px] text-slate-500">{t('roll')}</span>
              <Dice
                value={state.dice}
                rolling={state.rolling}
                onRoll={handleRoll}
                disabled={state.phase !== 'roll' || isCurrentAI || state.currentPlayer !== 1}
                color={COLOR_MAP[state.players[1].color]}
              />
            </div>
          </div>
        )}

        {/* Board */}
        <div className="flex flex-1 items-center justify-center py-2">
          <Board state={state} movablePawnIds={movableIds} onPawnClick={handlePawnClick} />
        </div>

        {/* Move-size toggle (for 8-roll split) */}
        {showMoveSizeToggle && (
          <div className="flex justify-center gap-2 pb-2">
            {splitOptions(8).map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelectMoveSize(opt)}
                className={`rounded-xl border px-4 py-1.5 text-sm font-bold transition ${
                  state.moveSize === opt
                    ? 'border-white/60 bg-white/20 text-white'
                    : 'border-white/10 bg-slate-900/60 text-slate-400'
                }`}
              >
                Move {opt}
              </button>
            ))}
            <span className="flex items-center px-2 text-[10px] text-slate-500">
              {state.movesLeft} left
            </span>
          </div>
        )}

        {/* Message + BOTTOM dice */}
        <div className="flex flex-col items-center gap-3 px-4 pb-6 pt-2">
          <motion.div
            key={state.message}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-center text-xs font-semibold backdrop-blur-xl"
          >
            {state.message}
          </motion.div>

          <div className="flex items-center gap-6">
            {/* All players' off-board pawns */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500">{t('out')}</span>
              <div className="flex flex-col gap-1.5">
                {state.players.map((ps) => {
                  const offBoard = ps.pawns.filter((p) => p.position === -1);
                  if (offBoard.length === 0) return null;
                  const color = COLOR_MAP[ps.color];
                  const isCurrent = ps.index === state.currentPlayer;
                  return (
                    <div key={ps.index} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <div className="flex gap-1">
                        {offBoard.map((p) => {
                          const canSpawn = isCurrent && state.phase === 'move' && state.moveSize !== null && [4, 8].includes(state.moveSize);
                          const movable = movableIds.has(`${ps.index}-${p.id}`);
                          const clickable = canSpawn && movable;
                          return (
                            <Pawn3D
                              key={p.id}
                              color={color}
                              dark={DARK_MAP[ps.color] || '#444'}
                              size={20}
                              movable={clickable}
                              onClick={() => clickable && handlePawnClick(p.id)}
                              onTouchEnd={(e) => { if (clickable) { e.preventDefault(); handlePawnClick(p.id); } }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {state.players.every((ps) => ps.pawns.every((p) => p.position !== -1)) && (
                  <span className="text-[10px] text-slate-600">—</span>
                )}
              </div>
            </div>

            <Dice
              value={state.dice}
              rolling={state.rolling}
              onRoll={handleRoll}
              disabled={state.phase !== 'roll' || isCurrentAI || (isPassPlay && state.currentPlayer !== 0)}
              color={currentPlayerColor}
            />

            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500">{t('home')}</span>
              <div className="flex flex-col gap-1.5">
                {state.players.map((ps) => {
                  const homePawns = ps.pawns.filter((p) => p.position === 30);
                  if (homePawns.length === 0) return null;
                  const color = COLOR_MAP[ps.color];
                  return (
                    <div key={ps.index} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <div className="flex gap-0.5">
                        {homePawns.map((p) => (
                          <Trophy key={p.id} className="h-4 w-4" style={{ color }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {state.players.every((ps) => ps.pawns.every((p) => p.position !== 30)) && (
                  <span className="text-[10px] text-slate-600">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Win overlay */}
        <AnimatePresence>
          {state.phase === 'over' && state.winner !== null && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                initial={{ scale: 0.7, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="w-full max-w-xs rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center shadow-2xl"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/40"
                >
                  <Trophy className="h-8 w-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-black text-white">{state.players[state.winner].name} {t('winsMsg')}</h2>
                <p className="mt-1 text-sm text-slate-400">{t('allPawnsHome')}</p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => { sfx.click(); onExit(); }}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-sm"
                  >
                    {t('back')}
                  </button>
                  <button
                    onClick={() => { sfx.click(); startGame(); }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-3 font-bold text-sm"
                  >
                    {t('playAgain')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
