import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { loadProfile, saveProfile, clearProfile } from './lib/storage'
import { setSoundEnabled } from './lib/sound'
import { I18nProvider, useI18n } from './lib/i18nContext'
import type { UserProfile, PlayerColor, PlayerType } from './lib/types'
import { COLORS } from './lib/gameEngine'
import Home from './components/Home'
import Login from './components/Login'
import ProfileModal from './components/ProfileModal'
import GameScreen from './components/game/GameScreen'
import OnlineLobby from './components/game/OnlineLobby'
import type { GameRoom } from './lib/types'

type GameMode = 'online' | 'local' | 'ai'
type View = 'home' | 'lobby' | 'game' | 'local-setup' | 'ai-setup'

function AppContent() {
  const { t, soundEnabled } = useI18n()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [view, setView] = useState<View>('home')
  const [gameMode, setGameMode] = useState<GameMode>('local')
  const [gamePlayers, setGamePlayers] = useState<{ id: string; name: string; color: PlayerColor; type: PlayerType }[]>([])
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [numPlayers, setNumPlayers] = useState(2)

  useEffect(() => {
    setSoundEnabled(soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    const saved = loadProfile()
    if (saved) setProfile(saved)

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const user = data.session.user
        const p: UserProfile = {
          id: user.id,
          email: user.email ?? '',
          displayName: (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Player',
          avatar: '',
          gamesPlayed: 0,
          gamesWon: 0,
        }
        setProfile(p)
        saveProfile(p)
      }
    })
  }, [])

  const handleAuthed = (user: { id: string; email: string }) => {
    const p: UserProfile = {
      id: user.id,
      email: user.email,
      displayName: user.email.split('@')[0],
      avatar: '',
      gamesPlayed: 0,
      gamesWon: 0,
    }
    setProfile(p)
    saveProfile(p)
    setShowLogin(false)
  }

  const handleGuest = () => {
    const guestId = 'guest-' + Math.random().toString(36).substring(2, 9)
    const p: UserProfile = {
      id: guestId,
      email: 'Guest',
      displayName: 'Guest' + Math.floor(Math.random() * 1000),
      avatar: '',
      gamesPlayed: 0,
      gamesWon: 0,
    }
    setProfile(p)
    saveProfile(p)
    setShowLogin(false)
  }

  const handleLogout = () => {
    supabase.auth.signOut()
    clearProfile()
    setProfile(null)
    setShowProfile(false)
    setView('home')
  }

  const handleSelectMode = (mode: GameMode) => {
    setGameMode(mode)
    if (mode === 'online') {
      if (!profile) {
        setShowLogin(true)
      } else {
        setView('lobby')
      }
    } else if (mode === 'local') {
      setView('local-setup')
    } else if (mode === 'ai') {
      setView('ai-setup')
    }
  }

  const startLocalGame = () => {
    const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4']
    const players = COLORS.slice(0, numPlayers).map((color, i) => ({
      id: `local-${i}`,
      name: playerNames[i],
      color,
      type: 'human' as PlayerType,
    }))
    setGamePlayers(players)
    setView('game')
  }

  const startAIGame = () => {
    const players = COLORS.slice(0, numPlayers).map((color, i) => ({
      id: i === 0 ? 'human-0' : `ai-${i}`,
      name: i === 0 ? (profile?.displayName ?? 'You') : `Computer ${i}`,
      color,
      type: i === 0 ? 'human' as PlayerType : 'ai' as PlayerType,
    }))
    setGamePlayers(players)
    setView('game')
  }

  const handleGameStart = (room: GameRoom, _color: PlayerColor) => {
    const state = room.state as any
    const players = (state?.players || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      color: p.color as PlayerColor,
      type: p.type as PlayerType,
    }))
    setGamePlayers(players)
    setCurrentRoom(room)
    setView('game')
  }

  const handleGameEnd = (winnerName: string) => {
    if (profile) {
      const isWinner = winnerName === profile.displayName
      const updated: UserProfile = {
        ...profile,
        gamesPlayed: profile.gamesPlayed + 1,
        gamesWon: isWinner ? profile.gamesWon + 1 : profile.gamesWon,
      }
      setProfile(updated)
      saveProfile(updated)
    }
  }

  // Setup screens
  if (view === 'local-setup') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <button onClick={() => setView('home')} className="absolute left-4 top-4 text-sm text-slate-400 hover:text-white">
          ← {t('backToMenu')}
        </button>
        <h2 className="mb-6 font-display text-2xl font-bold text-white">{t('selectPlayers')}</h2>
        <div className="flex gap-3">
          {[2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setNumPlayers(n)}
              className={`rounded-2xl px-6 py-4 font-semibold transition ${
                numPlayers === n
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {n === 2 ? t('two') : n === 3 ? t('three') : t('four')}
            </button>
          ))}
        </div>
        <button
          onClick={startLocalGame}
          className="mt-8 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 px-12 py-4 font-semibold text-white transition hover:scale-105"
        >
          {t('startGame')}
        </button>
      </div>
    )
  }

  if (view === 'ai-setup') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <button onClick={() => setView('home')} className="absolute left-4 top-4 text-sm text-slate-400 hover:text-white">
          ← {t('backToMenu')}
        </button>
        <h2 className="mb-6 font-display text-2xl font-bold text-white">{t('selectPlayers')}</h2>
        <div className="flex gap-3">
          {[2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setNumPlayers(n)}
              className={`rounded-2xl px-6 py-4 font-semibold transition ${
                numPlayers === n
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {n === 2 ? t('two') : n === 3 ? t('three') : t('four')}
            </button>
          ))}
        </div>
        <button
          onClick={startAIGame}
          className="mt-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-12 py-4 font-semibold text-white transition hover:scale-105"
        >
          {t('startGame')}
        </button>
      </div>
    )
  }

  if (view === 'lobby') {
    return (
      <OnlineLobby
        userId={profile?.id ?? ''}
        userName={profile?.displayName ?? 'Player'}
        onBack={() => setView('home')}
        onGameStart={handleGameStart}
      />
    )
  }

  if (view === 'game') {
    return (
      <GameScreen
        mode={gameMode}
        players={gamePlayers}
        room={currentRoom}
        userId={profile?.id}
        onBack={() => setView('home')}
        onGameEnd={handleGameEnd}
      />
    )
  }

  return (
    <>
      <Home
        profile={profile}
        onSelectMode={handleSelectMode}
        onShowLogin={() => setShowLogin(true)}
        onShowProfile={() => setShowProfile(true)}
      />
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onAuthed={handleAuthed}
          onGuest={handleGuest}
        />
      )}
      {showProfile && profile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}
