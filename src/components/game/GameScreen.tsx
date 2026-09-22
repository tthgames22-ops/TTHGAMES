import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../lib/i18nContext'
import {
  createInitialState,
  createPlayer,
  rollDice,
  movePawn,
  getMovablePawns,
  aiChoosePawn,
  COLORS,
  COLOR_HEX,
  type
} from '../../lib/gameEngine'
import type { GameState, Player, PlayerColor, PlayerType, GameRoom } from '../../lib/types'
import { playDiceRoll, playMove, playCapture, playWin, playHome, playClick } from '../../lib/sound'
import Board from './Board'
import Dice from './Dice'

interface GameScreenProps {
  mode: 'online' | 'local' | 'ai'
  players: { id: string; name: string; color: PlayerColor; type: PlayerType }[]
  room?: GameRoom | null
  userId?: string
  onBack: () => void
  onGameEnd?: (winnerName: string) => void
}

export default function GameScreen({ mode, players: playerConfigs, room, userId, onBack, onGameEnd }: GameScreenProps) {
  const { t } = useI18n()
  const [state, setState] = useState<GameState>(() => {
    const players = playerConfigs.map(p => createPlayer(p.id, p.name, p.color, p.type))
    return createInitialState(players)
  })
  const [rolling, setRolling] = useState(false)
  const [movablePawns, setMovablePawns] = useState<number[]>([])
  const [showWinner, setShowWinner] = useState(false)
  const [captureMsg, setCaptureMsg] = useState<string | null>(null)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPlayer = state.players[state.currentPlayerIndex]
  const isMyTurn = mode !== 'online' || currentPlayer?.id === userId
  const isAITurn = currentPlayer?.type === 'ai'

  const handleRoll = useCallback(() => {
    if (state.diceRolled || !state.canRoll || state.winner) return
    setRolling(true)
    setMovablePawns([])

    setTimeout(() => {
      const dice = rollDice()
      const player = state.players[state.currentPlayerIndex]
      const movable = getMovablePawns(player, dice)

      setState(prev => ({
        ...prev,
        diceValue: dice,
        diceRolled: true,
        canRoll: false,
        canMove: movable.length > 0,
        lastAction: `${player.name} rolled a ${dice}`,
      }))
      setRolling(false)

      if (movable.length === 0) {
        // No moves - next turn after delay
        setTimeout(() => {
          setState(prev => {
            let nextIdx = (prev.currentPlayerIndex + 1) % prev.players.length
            while (prev.players[nextIdx].finished) {
              nextIdx = (nextIdx + 1) % prev.players.length
            }
            return {
              ...prev,
              currentPlayerIndex: nextIdx,
              diceValue: null,
              diceRolled: false,
              canRoll: true,
              canMove: false,
              consecutiveSixes: 0,
              lastAction: `${prev.players[nextIdx].name}'s turn`,
            }
          })
        }, 1500)
      } else {
        setMovablePawns(movable)
      }
    }, 600)
  }, [state.diceRolled, state.canRoll, state.winner, state.currentPlayerIndex, state.players])

  const handlePawnClick = useCallback((playerIndex: number, pawnIndex: number) => {
    if (state.diceRolled && state.canMove && playerIndex === state.currentPlayerIndex && movablePawns.includes(pawnIndex)) {
      const { newState, capturedColor } = movePawn(state, pawnIndex)

      if (capturedColor) {
        const capturedPlayer = state.players.find(p => p.color === capturedColor)
        setCaptureMsg(t('captured', { name: capturedPlayer?.name ?? '' }))
        playCapture()
        setTimeout(() => setCaptureMsg(null), 2000)
      } else {
        const player = state.players[state.currentPlayerIndex]
        const pos = player.pawns[pawnIndex]
        if (pos === -1) {
          playMove()
        } else if (newState.players[state.currentPlayerIndex].pawns[pawnIndex] >= 100) {
          playHome()
        } else {
          playMove()
        }
      }

      setState(newState)
      setMovablePawns([])

      if (newState.winner) {
        setShowWinner(true)
        playWin()
        onGameEnd?.(newState.winner)
      }
    }
  }, [state, movablePawns, t, onGameEnd])

  // AI turn handler
  useEffect(() => {
    if (isAITurn && !state.winner && !state.diceRolled && state.canRoll) {
      aiTimerRef.current = setTimeout(() => {
        handleRoll()
      }, 800)
    }

    if (isAITurn && state.diceRolled && state.canMove && movablePawns.length > 0) {
      aiTimerRef.current = setTimeout(() => {
        const pawnIdx = aiChoosePawn(state)
        if (pawnIdx >= 0) {
          handlePawnClick(state.currentPlayerIndex, pawnIdx)
        }
      }, 800)
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [isAITurn, state, movablePawns, handleRoll, handlePawnClick])

  // Online: subscribe to room state changes
  useEffect(() => {
    if (mode !== 'online' || !room) return

    const channel = (window as any).__supabase?.channel(`game:${room.id}`)
    // For online mode, we'd sync state through the room
    // This is simplified for the rebuild
    return () => {
      // cleanup
    }
  }, [mode, room])

  const handlePlayAgain = () => {
    const players = playerConfigs.map(p => createPlayer(p.id, p.name, p.color, p.type))
    setState(createInitialState(players))
    setShowWinner(false)
    setMovablePawns([])
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => { playClick(); onBack() }}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-md hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToMenu')}
        </button>
        <div className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-md">
          {state.lastAction}
        </div>
      </div>

      {/* Player indicators */}
      <div className="flex justify-center gap-2 px-4 pb-2">
        {state.players.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
              i === state.currentPlayerIndex && !state.winner
                ? 'bg-white/20 ring-2'
                : 'bg-white/5'
            }`}
            style={i === state.currentPlayerIndex && !state.winner ? { boxShadow: `0 0 12px ${COLOR_HEX[player.color]}` } : {}}
          >
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_HEX[player.color] }} />
            <span className="text-xs font-medium text-white">{player.name}</span>
            {player.finished && <Trophy className="h-3 w-3 text-amber-400" />}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="flex flex-1 items-center justify-center p-4">
        <Board
          players={state.players}
          movablePawns={movablePawns}
          onPawnClick={handlePawnClick}
          currentPlayerColor={currentPlayer?.color ?? 'red'}
        />
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-3 p-4">
        {/* Turn indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_HEX[currentPlayer?.color ?? 'red'] }} />
          {state.winner ? (
            <span className="font-semibold text-amber-400">{t('winner', { name: state.winner })}</span>
          ) : isMyTurn ? (
            <span className="font-medium text-white">{t('yourTurn')}</span>
          ) : (
            <span className="text-slate-400">{t('waitingFor', { name: currentPlayer?.name ?? '' })}</span>
          )}
        </div>

        {/* Dice */}
        <Dice
          value={state.diceValue}
          rolling={rolling}
          onRoll={handleRoll}
          disabled={!isMyTurn || !state.canRoll || state.winner !== null}
          color={COLOR_HEX[currentPlayer?.color ?? 'red']}
        />

        {movablePawns.length > 0 && isMyTurn && !state.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-blue-300"
          >
            Tap a glowing pawn to move
          </motion.div>
        )}
      </div>

      {/* Capture message */}
      <AnimatePresence>
        {captureMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl bg-red-500/90 px-6 py-3 font-semibold text-white shadow-xl backdrop-blur-md"
          >
            {captureMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner modal */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl bg-slate-800 p-8 text-center shadow-2xl ring-1 ring-white/10"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Trophy className="mx-auto mb-4 h-16 w-16 text-amber-400" />
              </motion.div>
              <h2 className="mb-2 font-display text-3xl font-bold text-white">
                {t('winner', { name: state.winner ?? '' })}
              </h2>
              <div className="mb-6 flex justify-center gap-2">
                {state.players.map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_HEX[p.color] }} />
                    <span className="text-xs text-slate-400">{p.finished ? '✓' : '...'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePlayAgain}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 font-semibold text-white transition hover:scale-105"
                >
                  <RotateCcw className="h-5 w-5" />
                  {t('playAgain')}
                </button>
                <button
                  onClick={() => { playClick(); onBack() }}
                  className="flex-1 rounded-xl bg-white/10 py-3 font-medium text-white transition hover:bg-white/20"
                >
                  {t('backToMenu')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
