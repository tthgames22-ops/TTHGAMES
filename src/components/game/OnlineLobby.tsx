import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Copy, Check, Users, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../lib/i18nContext'
import { generateRoomCode, COLORS, COLOR_HEX } from '../../lib/gameEngine'
import type { GameRoom, PlayerColor, RoomPlayer } from '../../lib/types'
import { playClick } from '../../lib/sound'

interface OnlineLobbyProps {
  userId: string
  userName: string
  onBack: () => void
  onGameStart: (room: GameRoom, playerColor: PlayerColor) => void
}

export default function OnlineLobby({ userId, userName, onBack, onGameStart }: OnlineLobbyProps) {
  const { t } = useI18n()
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'room'>('menu')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])

  const updateRoomFromData = useCallback((data: GameRoom) => {
    setRoom(data)
    const state = data.state as any
    if (state?.players) {
      setPlayers(state.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        ready: true,
      })))
    }
  }, [])

  const createRoom = async () => {
    setError('')
    const code = generateRoomCode()
    const color = COLORS[0]
    const roomPlayers: RoomPlayer[] = [
      { id: userId, name: userName, color, ready: true },
    ]

    const state = {
      players: roomPlayers.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        type: 'human',
        pawns: [-1, -1, -1, -1],
        finished: false,
      })),
      currentPlayerIndex: 0,
      diceValue: null,
      diceRolled: false,
      canRoll: true,
      canMove: false,
      winner: null,
      status: 'waiting',
      turnNumber: 0,
      lastAction: 'Room created',
      consecutiveSixes: 0,
    }

    const { data, error } = await supabase
      .from('game_rooms')
      .insert({
        code,
        host_id: userId,
        state,
        status: 'waiting',
        max_players: 4,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setRoomCode(code)
    updateRoomFromData(data as GameRoom)
    setView('room')
  }

  const joinRoom = async () => {
    setError('')
    if (joinCode.length !== 6) {
      setError(t('invalidCode'))
      return
    }

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', joinCode.toUpperCase())
      .eq('status', 'waiting')
      .maybeSingle()

    if (error || !data) {
      setError(t('roomNotFound'))
      return
    }

    const state = data.state as any
    const existingPlayers: RoomPlayer[] = state?.players || []
    if (existingPlayers.length >= 4) {
      setError(t('roomFull'))
      return
    }

    // Assign a color
    const usedColors = new Set(existingPlayers.map(p => p.color))
    const availableColor = COLORS.find(c => !usedColors.has(c))
    if (!availableColor) {
      setError(t('roomFull'))
      return
    }

    const newPlayers = [
      ...existingPlayers,
      { id: userId, name: userName, color: availableColor, ready: true },
    ]

    const newState = {
      ...state,
      players: newPlayers.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        type: 'human',
        pawns: [-1, -1, -1, -1],
        finished: false,
      })),
    }

    const { data: updated, error: updateError } = await supabase
      .from('game_rooms')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setRoomCode(joinCode.toUpperCase())
    updateRoomFromData(updated as GameRoom)
    setView('room')
  }

  // Subscribe to room updates
  useEffect(() => {
    if (!room) return

    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${room.id}` },
        (payload: any) => {
          if (payload.new) {
            updateRoomFromData(payload.new as GameRoom)
            if ((payload.new as GameRoom).status === 'playing') {
              const state = (payload.new as GameRoom).state as any
              const myPlayer = state?.players?.find((p: any) => p.id === userId)
              if (myPlayer) {
                onGameStart(payload.new as GameRoom, myPlayer.color)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.id])

  const startGame = async () => {
    if (!room) return
    const state = room.state as any
    const newState = { ...state, status: 'playing' }
    await supabase
      .from('game_rooms')
      .update({ state: newState, status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', room.id)
  }

  const leaveRoom = async () => {
    if (!room) return
    const state = room.state as any
    const existingPlayers: RoomPlayer[] = state?.players || []
    const newPlayers = existingPlayers.filter(p => p.id !== userId)

    if (newPlayers.length === 0) {
      await supabase.from('game_rooms').delete().eq('id', room.id)
    } else {
      const newState = {
        ...state,
        players: newPlayers.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          type: 'human',
          pawns: [-1, -1, -1, -1],
          finished: false,
        })),
      }
      await supabase
        .from('game_rooms')
        .update({ state: newState, updated_at: new Date().toISOString() })
        .eq('id', room.id)
    }

    setRoom(null)
    setPlayers([])
    setView('menu')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHost = room?.host_id === userId

  if (view === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <button onClick={onBack} className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-md hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" /> {t('backToMenu')}
        </button>
        <div className="w-full max-w-md space-y-3">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { playClick(); createRoom() }}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 p-5 text-left font-semibold text-white shadow-lg transition hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              {t('createRoom')}
            </div>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => { playClick(); setView('join') }}
            className="w-full rounded-2xl bg-white/10 p-5 text-left font-semibold text-white ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/20"
          >
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-6 w-6 rotate-180" />
              {t('joinRoom')}
            </div>
          </motion.button>
        </div>
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <button onClick={() => setView('menu')} className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-md hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" /> {t('backToMenu')}
        </button>
        <div className="w-full max-w-md">
          <h2 className="mb-6 text-center font-display text-2xl font-bold text-white">{t('enterCode')}</h2>
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF"
            className="w-full rounded-2xl bg-slate-900/50 px-6 py-4 text-center font-display text-3xl font-bold tracking-[0.5em] text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-blue-400"
          />
          {error && <div className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-center text-sm text-red-300">{error}</div>}
          <button
            onClick={joinRoom}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 py-4 font-semibold text-white transition hover:scale-[1.02]"
          >
            {t('joinRoom')}
          </button>
        </div>
      </div>
    )
  }

  // Room view
  if (view === 'room' && room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <button onClick={leaveRoom} className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-md hover:bg-white/20">
          <LogOut className="h-4 w-4" /> {t('leaveRoom')}
        </button>

        <div className="w-full max-w-md">
          <h2 className="mb-2 text-center font-display text-xl font-semibold text-white">{t('roomCode')}</h2>
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="rounded-2xl bg-slate-800 px-8 py-4 font-display text-4xl font-bold tracking-[0.3em] text-white ring-1 ring-white/10">
              {roomCode}
            </div>
            <button onClick={copyCode} className="rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/20">
              {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>

          <div className="mb-6 rounded-2xl bg-slate-800/50 p-4 ring-1 ring-white/10">
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
              <Users className="h-4 w-4" />
              {t('waiting')} ({players.length}/4)
            </div>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-900/50 px-4 py-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: p.color ? COLOR_HEX[p.color] : '#666' }} />
                  <span className="font-medium text-white">{p.name}</span>
                  {p.id === room.host_id && <span className="ml-auto text-xs text-amber-400">Host</span>}
                </div>
              ))}
              {Array.from({ length: 4 - players.length }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-900/30 px-4 py-3 opacity-50">
                  <div className="h-4 w-4 rounded-full border-2 border-dashed border-slate-600" />
                  <span className="text-slate-500">Waiting...</span>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={() => { playClick(); startGame() }}
              disabled={players.length < 2}
              className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 py-4 font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50"
            >
              {t('startGame')}
            </button>
          ) : (
            <div className="rounded-2xl bg-slate-800/50 px-4 py-3 text-center text-sm text-slate-400">
              {t('waiting')}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
