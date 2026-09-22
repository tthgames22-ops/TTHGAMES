export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue'

export type PlayerType = 'human' | 'ai'

export interface Player {
  id: string
  name: string
  color: PlayerColor
  type: PlayerType
  pawns: number[] // positions: -1 = home/yard, 0-51 = track, 100-105 = home column
  finished: boolean
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  diceValue: number | null
  diceRolled: boolean
  canRoll: boolean
  canMove: boolean
  winner: string | null
  status: 'waiting' | 'playing' | 'finished'
  turnNumber: number
  lastAction: string
  consecutiveSixes: number
}

export interface RoomPlayer {
  id: string
  name: string
  color: PlayerColor | null
  ready: boolean
}

export interface GameRoom {
  id: string
  code: string
  host_id: string
  state: GameState
  status: 'waiting' | 'playing' | 'finished'
  max_players: number
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatar: string
  gamesPlayed: number
  gamesWon: number
}

export type Language = 'en' | 'es' | 'fr' | 'hi'
