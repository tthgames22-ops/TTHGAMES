import type { Player, PlayerColor } from '../../lib/types'
import {
  COLOR_HEX,
  START_POSITIONS,
  SAFE_CELLS,
  isInYard,
  isOnTrack,
  isInHomeColumn,
  isHome,
  HOME_LENGTH,
} from '../../lib/gameEngine'
import Pawn3D from './Pawn3D'

interface BoardProps {
  players: Player[]
  movablePawns: number[]
  onPawnClick: (playerIndex: number, pawnIndex: number) => void
  currentPlayerColor: PlayerColor
}


const PATH: { row: number; col: number }[] = (() => {
  const p: { row: number; col: number }[] = []

  // Left column going up (red start at bottom)
  for (let r = 6; r >= 1; r--) p.push({ row: r, col: 6 }) // 0-5: (6,6),(5,6),(4,6),(3,6),(2,6),(1,6)
  p.push({ row: 0, col: 6 }) // 6
  p.push({ row: 0, col: 7 }) // 7
  p.push({ row: 0, col: 8 }) // 8
  for (let r = 1; r <= 5; r++) p.push({ row: r, col: 8 }) // 9-13: (1,8)...(5,8)
  p.push({ row: 6, col: 8 }) // 14
  p.push({ row: 6, col: 9 }) // 15
  p.push({ row: 6, col: 10 }) // 16
  p.push({ row: 6, col: 11 }) // 17
  p.push({ row: 6, col: 12 }) // 18
  p.push({ row: 6, col: 13 }) // 19
  p.push({ row: 6, col: 14 }) // 20
  p.push({ row: 7, col: 14 }) // 21
  p.push({ row: 8, col: 14 }) // 22
  p.push({ row: 8, col: 13 }) // 23
  p.push({ row: 8, col: 12 }) // 24
  p.push({ row: 8, col: 11 }) // 25
  p.push({ row: 8, col: 10 }) // 26
  p.push({ row: 8, col: 9 }) // 27
  p.push({ row: 8, col: 8 }) // 28
  for (let r = 9; r <= 13; r++) p.push({ row: r, col: 8 }) // 29-33: (9,8)...(13,8)
  p.push({ row: 14, col: 8 }) // 34
  p.push({ row: 14, col: 7 }) // 35
  p.push({ row: 14, col: 6 }) // 36
  for (let r = 13; r >= 9; r--) p.push({ row: r, col: 6 }) // 37-41: (13,6)...(9,6)
  p.push({ row: 8, col: 6 }) // 42
  p.push({ row: 8, col: 5 }) // 43
  p.push({ row: 8, col: 4 }) // 44
  p.push({ row: 8, col: 3 }) // 45
  p.push({ row: 8, col: 2 }) // 46
  p.push({ row: 8, col: 1 }) // 47
  p.push({ row: 8, col: 0 }) // 48
  p.push({ row: 7, col: 0 }) // 49
  p.push({ row: 6, col: 0 }) // 50
  p.push({ row: 6, col: 1 }) // 51
  // That's 52 positions

  return p.slice(0, 52)
})()

// Home column positions for each color (the 6 cells leading to center)
const HOME_COLUMNS: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
    { row: 8, col: 7 },
  ],
  green: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
    { row: 7, col: 6 },
  ],
  yellow: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
    { row: 6, col: 7 },
  ],
  blue: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
    { row: 7, col: 8 },
  ],
}

// Yard positions for each color (4 pawns in the 6x6 corner)
const YARD_POSITIONS: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 10, col: 2 },
    { row: 10, col: 4 },
    { row: 12, col: 2 },
    { row: 12, col: 4 },
  ],
  green: [
    { row: 10, col: 10 },
    { row: 10, col: 12 },
    { row: 12, col: 10 },
    { row: 12, col: 12 },
  ],
  yellow: [
    { row: 2, col: 10 },
    { row: 2, col: 12 },
    { row: 4, col: 10 },
    { row: 4, col: 12 },
  ],
  blue: [
    { row: 2, col: 2 },
    { row: 2, col: 4 },
    { row: 4, col: 2 },
    { row: 4, col: 4 },
  ],
}

const GRID_SIZE = 15

export default function Board({ players, movablePawns, onPawnClick, currentPlayerColor }: BoardProps) {
  // Build a map of cell positions to pawns
  const cellPawns: Record<string, { playerIndex: number; pawnIndex: number; color: PlayerColor }[]> = {}

  players.forEach((player, playerIndex) => {
    player.pawns.forEach((pos, pawnIndex) => {
      let gridPos: { row: number; col: number } | null = null

      if (isInYard(pos)) {
        gridPos = YARD_POSITIONS[player.color][pawnIndex]
      } else if (isOnTrack(pos)) {
        gridPos = PATH[pos]
      } else if (isInHomeColumn(pos) || isHome(pos)) {
        const homeIdx = pos - 100
        if (homeIdx >= 0 && homeIdx < HOME_LENGTH) {
          gridPos = HOME_COLUMNS[player.color][homeIdx]
        }
      }

      if (gridPos) {
        const key = `${gridPos.row}-${gridPos.col}`
        if (!cellPawns[key]) cellPawns[key] = []
        cellPawns[key].push({ playerIndex, pawnIndex, color: player.color })
      }
    })
  })

  const isMovable = (playerIndex: number, pawnIndex: number) => {
    return movablePawns.includes(pawnIndex) && players[playerIndex].color === currentPlayerColor
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[480px]">
      <div
        className="grid h-full w-full overflow-hidden rounded-2xl bg-slate-200 shadow-2xl"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {/* Render board cells */}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const row = Math.floor(idx / GRID_SIZE)
          const col = idx % GRID_SIZE
          const key = `${row}-${col}`

          // Determine cell type
          let bgClass = 'bg-white'
          let isSafe = false
          let isStart = false
          let startColor: PlayerColor | null = null

          // Check if it's a yard area
          if (row < 6 && col < 6) {
            bgClass = 'bg-blue-100'
            if (row >= 1 && row <= 4 && col >= 1 && col <= 4) bgClass = ''
          } else if (row < 6 && col > 8) {
            bgClass = 'bg-yellow-100'
            if (row >= 1 && row <= 4 && col >= 10 && col <= 13) bgClass = ''
          } else if (row > 8 && col < 6) {
            bgClass = 'bg-red-100'
            if (row >= 9 && row <= 12 && col >= 1 && col <= 4) bgClass = ''
          } else if (row > 8 && col > 8) {
            bgClass = 'bg-green-100'
            if (row >= 9 && row <= 12 && col >= 10 && col <= 13) bgClass = ''
          }

          // Check if it's a path cell
          const pathIdx = PATH.findIndex(p => p.row === row && p.col === col)
          if (pathIdx >= 0) {
            bgClass = 'bg-white'
            if (SAFE_CELLS.has(pathIdx)) {
              isSafe = true
            }
            // Check start positions
            for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
              if (START_POSITIONS[color] === pathIdx) {
                isStart = true
                startColor = color
              }
            }
          }

          // Check if it's a home column cell
          let isHomeColumn = false
          let homeColColor: PlayerColor | null = null
          for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
            const hc = HOME_COLUMNS[color]
            if (hc.some(h => h.row === row && h.col === col)) {
              isHomeColumn = true
              homeColColor = color
            }
          }

          // Center cell
          const isCenter = row === 7 && col === 7

          // Yard circles
          let isYardCircle = false
          let yardColor: PlayerColor | null = null
          for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
            if (YARD_POSITIONS[color].some(y => y.row === row && y.col === col)) {
              isYardCircle = true
              yardColor = color
            }
          }

          return (
            <div
              key={idx}
              className={`relative flex items-center justify-center ${bgClass}`}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                backgroundColor: isStart && startColor ? COLOR_HEX[startColor] + '40' :
                  isHomeColumn && homeColColor ? COLOR_HEX[homeColColor] + '30' :
                  isCenter ? '#f0f0f0' :
                  isYardCircle && yardColor ? COLOR_HEX[yardColor] + '30' :
                  undefined,
              }}
            >
              {isSafe && !isStart && (
                <div className="h-2 w-2 rounded-full bg-slate-400" />
              )}
              {isStart && startColor && (
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_HEX[startColor] }} />
              )}
              {isCenter && (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2">
                    <div className="bg-red-400" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    <div className="bg-yellow-400" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
                    <div className="bg-blue-400" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
                    <div className="bg-green-400" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                  </div>
                </div>
              )}

              {/* Render pawns on this cell */}
              {cellPawns[key]?.map((pawn, i) => {
                const movable = isMovable(pawn.playerIndex, pawn.pawnIndex)
                const count = cellPawns[key].length
                const offset = count > 1 ? (i - (count - 1) / 2) * 6 : 0
                return (
                  <div
                    key={`${pawn.playerIndex}-${pawn.pawnIndex}`}
                    style={{ transform: `translateX(${offset}px)`, zIndex: 10 + i }}
                    className="absolute"
                  >
                    <Pawn3D
                      color={pawn.color}
                      size={22}
                      active={movable}
                      onClick={movable ? () => onPawnClick(pawn.playerIndex, pawn.pawnIndex) : undefined}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
