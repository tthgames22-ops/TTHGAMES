import type { GameState, Player, PlayerColor, PlayerType } from './types'

export const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue']
export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#EF4444',
  green: '#22C55E',
  yellow: '#F59E0B',
  blue: '#3B82F6',
}

// The main track has 52 cells. Each color has a starting position and a home column of 6.
export const TRACK_LENGTH = 52
export const HOME_LENGTH = 6
export const PAWN_COUNT = 4

// Each color's starting position on the track
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}

// Each color's home entry point (last track cell before home column)
export const HOME_ENTRY: Record<PlayerColor, number> = {
  red: 50,
  green: 11,
  yellow: 24,
  blue: 37,
}

// Safe cells where pawns cannot be captured
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47])

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function createPlayer(id: string, name: string, color: PlayerColor, type: PlayerType): Player {
  return {
    id,
    name,
    color,
    type,
    pawns: Array(PAWN_COUNT).fill(-1), // -1 = in yard
    finished: false,
  }
}

export function createInitialState(players: Player[]): GameState {
  return {
    players,
    currentPlayerIndex: 0,
    diceValue: null,
    diceRolled: false,
    canRoll: true,
    canMove: false,
    winner: null,
    status: 'playing',
    turnNumber: 0,
    lastAction: 'Game started',
    consecutiveSixes: 0,
  }
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1
}

// Convert a pawn's absolute position to display position on the track
export function getAbsolutePosition(color: PlayerColor, trackPos: number): number {
  return (START_POSITIONS[color] + trackPos) % TRACK_LENGTH
}

// Check if a pawn is in the home column (positions 100-105)
export function isInHomeColumn(pos: number): boolean {
  return pos >= 100 && pos < 100 + HOME_LENGTH
}

// Check if a pawn has reached the final home spot
export function isHome(pos: number): boolean {
  return pos === 100 + HOME_LENGTH - 1
}

// Check if a pawn is in the yard
export function isInYard(pos: number): boolean {
  return pos === -1
}

// Check if a pawn is on the main track
export function isOnTrack(pos: number): boolean {
  return pos >= 0 && pos < TRACK_LENGTH
}

// Get the track-relative position for a color from absolute position
export function getRelativePosition(color: PlayerColor, absPos: number): number {
  return (absPos - START_POSITIONS[color] + TRACK_LENGTH) % TRACK_LENGTH
}

// Check if a pawn can move from its current position by the given dice value
export function canMovePawn(player: Player, pawnIndex: number, dice: number): boolean {
  const pos = player.pawns[pawnIndex]

  if (isInYard(pos)) {
    return dice === 6
  }

  if (isInHomeColumn(pos)) {
    const homePos = pos - 100
    return homePos + dice < HOME_LENGTH
  }

  if (isHome(pos)) {
    return false
  }

  // On track - check if move would overshoot home
  const relPos = getRelativePosition(player.color, pos)
  const stepsFromHome = TRACK_LENGTH - relPos

  if (dice > stepsFromHome + HOME_LENGTH) {
    return false
  }

  return true
}

// Get all movable pawn indices for a player given the dice value
export function getMovablePawns(player: Player, dice: number): number[] {
  const movable: number[] = []
  for (let i = 0; i < player.pawns.length; i++) {
    if (canMovePawn(player, i, dice)) {
      movable.push(i)
    }
  }
  return movable
}

// Move a pawn and return the new state + any captures
export function movePawn(state: GameState, pawnIndex: number): { newState: GameState; capturedColor: PlayerColor | null; capturedPawn: number } {
  const dice = state.diceValue!
  const players = state.players.map(p => ({ ...p, pawns: [...p.pawns] }))
  const player = players[state.currentPlayerIndex]
  const pos = player.pawns[pawnIndex]
  let capturedColor: PlayerColor | null = null
  let capturedPawn = -1

  if (isInYard(pos)) {
    if (dice === 6) {
      player.pawns[pawnIndex] = START_POSITIONS[player.color]
    }
  } else if (isInHomeColumn(pos)) {
    player.pawns[pawnIndex] = pos + dice
  } else {
    // On track
    const relPos = getRelativePosition(player.color, pos)
    const newRel = relPos + dice

    if (newRel >= TRACK_LENGTH) {
      // Move into home column
      const homeSteps = newRel - TRACK_LENGTH
      if (homeSteps < HOME_LENGTH) {
        player.pawns[pawnIndex] = 100 + homeSteps
      }
    } else if (newRel === TRACK_LENGTH - 1) {
      // Land exactly at home entry, move to home column
      player.pawns[pawnIndex] = 100
    } else {
      const newAbs = getAbsolutePosition(player.color, newRel)
      player.pawns[pawnIndex] = newAbs

      // Check for captures
      if (!SAFE_CELLS.has(newAbs)) {
        for (const otherPlayer of players) {
          if (otherPlayer.color === player.color) continue
          for (let i = 0; i < otherPlayer.pawns.length; i++) {
            if (otherPlayer.pawns[i] === newAbs) {
              otherPlayer.pawns[i] = -1
              capturedColor = otherPlayer.color
              capturedPawn = i
            }
          }
        }
      }
    }
  }

  // Check if player has all pawns home
  const allHome = player.pawns.every(p => isHome(p) || p >= 100 + HOME_LENGTH - 1)
  if (allHome) {
    player.finished = true
  }

  const wasSix = dice === 6
  const newConsecutiveSixes = wasSix ? state.consecutiveSixes + 1 : 0

  let nextPlayerIndex = state.currentPlayerIndex
  let canRoll = true
  let canMove = false
  let diceValue: number | null = null
  let diceRolled = false
  let lastAction = ''

  if (allHome) {
    lastAction = `${player.name} wins!`
  } else if (wasSix && newConsecutiveSixes < 3) {
    // Same player rolls again
    lastAction = `${player.name} rolled a 6, rolls again`
    diceValue = null
  } else {
    // Next player's turn
    nextPlayerIndex = (state.currentPlayerIndex + 1) % players.length
    while (players[nextPlayerIndex].finished) {
      nextPlayerIndex = (nextPlayerIndex + 1) % players.length
    }
    lastAction = `${players[nextPlayerIndex].name}'s turn`
  }

  const winner = players.find(p => p.finished)?.name ?? null

  const newState: GameState = {
    players,
    currentPlayerIndex: nextPlayerIndex,
    diceValue,
    diceRolled,
    canRoll,
    canMove,
    winner,
    status: winner ? 'finished' : 'playing',
    turnNumber: state.turnNumber + 1,
    lastAction,
    consecutiveSixes: newConsecutiveSixes,
  }

  return { newState, capturedColor, capturedPawn }
}

// Simple AI: pick the best pawn to move
export function aiChoosePawn(state: GameState): number {
  const player = state.players[state.currentPlayerIndex]
  const dice = state.diceValue!
  const movable = getMovablePawns(player, dice)

  if (movable.length === 0) return -1
  if (movable.length === 1) return movable[0]

  // Priority: 1) capture, 2) finish home, 3) get out of yard, 4) furthest along
  let best = movable[0]
  let bestScore = -1

  for (const pawnIdx of movable) {
    const pos = player.pawns[pawnIdx]
    let score = 0

    if (isInYard(pos) && dice === 6) {
      score = 50 // Getting out of yard is good
    } else if (isInHomeColumn(pos)) {
      const homePos = pos - 100
      if (homePos + dice === HOME_LENGTH - 1) score = 100 // Finishing
      else score = 30 + homePos
    } else if (isOnTrack(pos)) {
      const relPos = getRelativePosition(player.color, pos)
      score = relPos // Further along is better

      // Check if this move captures someone
      const newRel = relPos + dice
      if (newRel < TRACK_LENGTH) {
        const newAbs = getAbsolutePosition(player.color, newRel)
        if (!SAFE_CELLS.has(newAbs)) {
          for (const otherPlayer of state.players) {
            if (otherPlayer.color === player.color) continue
            for (const otherPawn of otherPlayer.pawns) {
              if (otherPawn === newAbs) {
                score += 80
              }
            }
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      best = pawnIdx
    }
  }

  return best
}

export function getBoardCellColor(pos: number): PlayerColor | null {
  for (const color of COLORS) {
    if (START_POSITIONS[color] === pos) return color
  }
  return null
}
