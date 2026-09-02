import type { GameState, Pawn, PlayerState, PlayerColor } from './types';
import { sfx } from './sound';

// 5x5 board. Flat grid index = row * 5 + col.
// Safe boxes (❌): [2, 10, 14, 22] = (0,2) top, (2,0) left, (2,4) right, (4,2) bottom.
// Center win box (🏆): index 12 = (2,2).

// Outer ring cells in clockwise order (16 cells), as flat grid indices.
const RING_CW: number[] = [
  0, 1, 2, 3, 4,
  9, 14, 19, 24,
  23, 22, 21, 20,
  15, 10, 5,
];

// Inner 8 cells (3×3 minus center), as flat grid indices.
const INNER_CELLS: number[] = [6, 7, 8, 13, 18, 17, 16, 11];

function buildPath(startRingIdx: number, innerEntryFlat: number): number[] {
  const path: number[] = [];
  for (let i = 0; i < 16; i++) {
    path.push(RING_CW[((startRingIdx - i) % 16 + 16) % 16]);
  }
  const innerStart = INNER_CELLS.indexOf(innerEntryFlat);
  for (let i = 0; i < 8; i++) {
    path.push(INNER_CELLS[((innerStart + i) % 8 + 8) % 8]);
  }
  path.push(12);
  return path;
}

const PATHS: number[][] = [
  buildPath(10, 16),
  buildPath(2, 8),
  buildPath(14, 6),
  buildPath(6, 18),
];

export const HOME = 24;
export const SAFE_INDICES = [2, 10, 14, 22];

// Outer safe boxes are at path indices [0, 4, 8, 12] for every player.
const SAFE_PATH_POSITIONS = [0, 4, 8, 12];

export const ENTRY_BOX: Record<number, number> = {
  0: 22,
  1: 2,
  2: 10,
  3: 14,
};

const DICE_VALUES = [1, 2, 3, 4, 8];
export const ENTRY_ROLLS = [4, 8];

export function rollDice(): number {
  return DICE_VALUES[Math.floor(Math.random() * DICE_VALUES.length)];
}

export const PLAYER_COLORS: PlayerColor[] = ['red', 'cyan', 'green', 'purple'];
export const PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export function createGame(numPlayers: number, aiOpponents: boolean): GameState {
  const players: PlayerState[] = [];
  const count = Math.min(4, Math.max(1, numPlayers));
  for (let i = 0; i < count; i++) {
    players.push({
      index: i,
      color: PLAYER_COLORS[i],
      name: PLAYER_NAMES[i],
      isAI: aiOpponents && i > 0,
      pawns: [0, 1, 2, 3].map((n) => ({ id: n, player: i, position: -1 })),
      finished: 0,
    });
  }
  return {
    players,
    currentPlayer: 0,
    dice: null,
    rolling: false,
    phase: 'roll',
    winner: null,
    message: `${players[0].name}'s turn — tap the dice`,
    extraRoll: false,
    lastCut: false,
    movesLeft: 0,
    moveSize: null,
    turnSnapshot: null,
  };
}

export interface MoveResult {
  state: GameState;
  moved: boolean;
  cutPawn: Pawn | null;
  enteredHome: boolean;
  extraRoll: boolean;
}

// Only the 4 outer ❌ safe boxes (path positions 0,4,8,12) and the center
// win box (HOME) are safe. Inner ring cells are NOT safe — captures happen there.
function isSafePathPosition(pos: number): boolean {
  if (pos < 0) return true;
  if (pos === HOME) return true;
  return SAFE_PATH_POSITIONS.includes(pos);
}

// Check if a pawn can move by `steps` from its current position.
export function canMovePawn(pawn: Pawn, steps: number): boolean {
  if (pawn.position === HOME) return false;
  if (pawn.position === -1) {
    // Spawning only allowed with 4 or 8, and only to path index 0 (the safe box).
    return ENTRY_ROLLS.includes(steps);
  }
  return pawn.position + steps <= HOME;
}

// A non-safe cell cannot hold two pawns of the SAME player. Only the 4 outer ❌
// safe boxes and the center win box allow own-pawn stacking.
function isOwnPawnBlocking(state: GameState, player: number, targetPathPos: number): boolean {
  if (isSafePathPosition(targetPathPos)) return false;
  const targetFlat = PATHS[player][targetPathPos];
  for (const p of state.players[player].pawns) {
    if (p.position < 0 || p.position === HOME) continue;
    if (PATHS[player][p.position] === targetFlat) return true;
  }
  return false;
}

// Full legality check: basic reachability + no own-pawn stacking on non-safe cells.
export function isLegalMove(state: GameState, pawn: Pawn, steps: number): boolean {
  if (!canMovePawn(pawn, steps)) return false;
  const target = simulateMove(pawn, steps);
  if (target === null) return false;
  if (pawn.position === -1) return true; // spawning lands on the safe box — always ok
  if (isOwnPawnBlocking(state, pawn.player, target)) return false;
  return true;
}

// Get all pawns for `player` that can legally move by `steps`.
export function getMovablePawns(state: GameState, player: number, steps: number): Pawn[] {
  return state.players[player].pawns.filter((p) => isLegalMove(state, p, steps));
}

// Check if the player has ANY legal move across all split options for the dice.
// For 8, this checks both 8-step moves and 4-step moves.
export function hasAnyLegalMove(state: GameState, player: number, dice: number): boolean {
  for (const size of moveSizeOptions(dice)) {
    if (getMovablePawns(state, player, size).length > 0) return true;
  }
  return false;
}

// Possible move-size splits for a remaining dice total.
export function moveSizeOptions(total: number): number[] {
  if (total === 8) return [8, 4];
  return [total];
}

// Compute target path position for a pawn moving by `steps`, or null if illegal.
export function simulateMove(pawn: Pawn, steps: number): number | null {
  if (pawn.position === -1) {
    if (ENTRY_ROLLS.includes(steps)) return 0;
    return null;
  }
  if (pawn.position === HOME) return null;
  const target = pawn.position + steps;
  if (target > HOME) return null;
  return target;
}

// Find ALL opponent pawns occupying the same flat grid cell as the target.
// On non-safe cells, all of them get cut. On safe cells, none get cut (coexist).
function findCutTargets(state: GameState, player: number, targetPathPos: number): Pawn[] {
  if (isSafePathPosition(targetPathPos)) return [];
  const targetFlat = PATHS[player][targetPathPos];
  const cuts: Pawn[] = [];
  for (const ps of state.players) {
    if (ps.index === player) continue;
    for (const p of ps.pawns) {
      if (p.position < 0 || p.position === HOME) continue;
      const pawnFlat = PATHS[ps.index][p.position];
      if (pawnFlat === targetFlat) cuts.push(p);
    }
  }
  return cuts;
}

// Apply a move of `steps` to `pawnId` for the current player.
// `steps` is the move size for THIS individual move (may be less than the full dice
// when splitting an 8 into e.g. 4+4 or 4+spawn).
export function applyMove(state: GameState, pawnId: number, steps: number): MoveResult {
  if (steps <= 0) {
    return { state, moved: false, cutPawn: null, enteredHome: false, extraRoll: false };
  }
  const player = state.players[state.currentPlayer];
  const pawn = player.pawns.find((p) => p.id === pawnId);
  if (!pawn || !isLegalMove(state, pawn, steps)) {
    return { state, moved: false, cutPawn: null, enteredHome: false, extraRoll: false };
  }

  const target = simulateMove(pawn, steps)!;
  const enteredHome = target === HOME;
  const wasOff = pawn.position === -1;
  const enteredBoard = wasOff;

  // On an 8-roll spawn, spawn a second off-board pawn if one is available.
  const extraSpawnPawn = wasOff && steps === 8
    ? player.pawns.find((p) => p.position === -1 && p.id !== pawn.id)
    : null;

  const cutTargets = findCutTargets(state, state.currentPlayer, target);
  const didCut = cutTargets.length > 0;

  const newPlayers = state.players.map((ps) => ({
    ...ps,
    pawns: ps.pawns.map((p) => {
      if (cutTargets.includes(p)) return { ...p, position: -1 };
      if (p === pawn) return { ...p, position: target };
      if (extraSpawnPawn && p === extraSpawnPawn) return { ...p, position: 0 };
      return p;
    }),
  }));

  newPlayers.forEach((ps) => {
    ps.finished = ps.pawns.filter((p) => p.position === HOME).length;
  });

  const winner = newPlayers[state.currentPlayer].finished === 4 ? state.currentPlayer : null;

  // Determine remaining moves after this one.
  // - Spawning uses up `steps` worth of the dice.
  // - A normal move uses up `steps`.
  // - Cutting grants an extra roll (fresh dice roll later), but does NOT grant
  //   leftover moves beyond the current dice — the bonus roll is a NEW roll.
  // - Entering home grants an extra roll too.
  const remainingAfter = Math.max(0, state.movesLeft - steps);

  // Extra roll is granted for: cutting an opponent, spawning, OR unconditionally
  // when the dice value was 4 or 8. Reaching home does NOT grant an extra roll.
  // If there are still moves left to distribute (e.g. split 8 → 4 remaining),
  // the player keeps moving with the remainder instead of getting a fresh roll.
  const diceWasBonus = state.dice !== null && [4, 8].includes(state.dice);
  const extraRoll = (didCut || enteredBoard || diceWasBonus) && remainingAfter === 0;

  let nextPlayer = state.currentPlayer;
  let phase: GameState['phase'] = 'roll';
  let message = '';
  let newMovesLeft = remainingAfter;
  let newMoveSize: number | null = null;

  if (winner !== null) {
    phase = 'over';
    message = `${newPlayers[winner].name} wins!`;
    sfx.win();
    newMovesLeft = 0;
    newMoveSize = null;
  } else if (remainingAfter > 0) {
    // Player still has steps to distribute — keep them in move phase.
    nextPlayer = state.currentPlayer;
    phase = 'move';
    message = `${player.name} — ${remainingAfter} step${remainingAfter > 1 ? 's' : ''} left`;
    newMoveSize = remainingAfter;
    if (didCut) sfx.cut();
    else if (enteredHome) sfx.home();
    else if (enteredBoard) sfx.enter();
    else sfx.move();
  } else if (extraRoll) {
    // Bonus roll granted — fresh dice roll needed.
    nextPlayer = state.currentPlayer;
    phase = 'roll';
    message = `${player.name} — Bonus roll!`;
    newMovesLeft = 0;
    newMoveSize = null;
    if (didCut) sfx.cut();
    else if (enteredHome) sfx.home();
    else if (enteredBoard) sfx.enter();
    else sfx.move();
  } else {
    // Normal turn end.
    nextPlayer = (state.currentPlayer + 1) % state.players.length;
    phase = 'roll';
    message = `${newPlayers[nextPlayer].name}'s turn`;
    newMovesLeft = 0;
    newMoveSize = null;
    sfx.move();
  }

  const newState: GameState = {
    ...state,
    players: newPlayers,
    currentPlayer: nextPlayer,
    dice: remainingAfter > 0 ? state.dice : null,
    phase,
    winner,
    message,
    extraRoll,
    lastCut: didCut,
    movesLeft: newMovesLeft,
    moveSize: newMoveSize,
    // Preserve the turn snapshot during the player's turn sequence (including bonus rolls).
    // Clear it when the turn passes to the next player.
    turnSnapshot: nextPlayer === state.currentPlayer ? state.turnSnapshot : null,
  };

  return { state: newState, moved: true, cutPawn: cutTargets[0] || null, enteredHome, extraRoll };
}

// Create a deep-cloned snapshot of the board-relevant state for rollback.
export function cloneBoardState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((ps) => ({
      ...ps,
      pawns: ps.pawns.map((p) => ({ ...p })),
    })),
  };
}

// Capture the turn snapshot at the start of a player's turn (before any rolls).
export function captureTurnSnapshot(state: GameState): GameState {
  return { ...state, turnSnapshot: cloneBoardState(state) };
}

// Roll back to the turn snapshot: restore all pawn positions, pass turn to next player.
export function rollbackTurn(state: GameState): GameState {
  const snap = state.turnSnapshot;
  const next = (state.currentPlayer + 1) % state.players.length;
  if (!snap) {
    return {
      ...state,
      currentPlayer: next,
      dice: null,
      phase: 'roll',
      message: `${state.players[next].name}'s turn`,
      extraRoll: false,
      movesLeft: 0,
      moveSize: null,
      turnSnapshot: null,
    };
  }
  return {
    ...snap,
    currentPlayer: next,
    dice: null,
    phase: 'roll',
    message: `${snap.players[next].name}'s turn`,
    extraRoll: false,
    lastCut: false,
    movesLeft: 0,
    moveSize: null,
    turnSnapshot: null,
  };
}

// AI chooses a pawn to move by `steps`.
export function aiChoosePawn(state: GameState, steps: number): number | null {
  const movable = getMovablePawns(state, state.currentPlayer, steps);
  if (movable.length === 0) return null;

  let best = movable[0];
  let bestScore = -1;
  for (const p of movable) {
    const target = simulateMove(p, steps);
    if (target === null) continue;
    let score = 0;
    const cuts = findCutTargets(state, state.currentPlayer, target);
    if (cuts.length > 0) score += 100 * cuts.length;
    if (target === HOME) score += 80;
    if (p.position === -1) score += 50;
    score += target;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best.id;
}

// Convert a path position to [row, col] for rendering.
export function positionToCell(player: number, pos: number): [number, number] | null {
  if (pos < 0) return null;
  const flat = PATHS[player][pos];
  if (flat === undefined) return null;
  return [Math.floor(flat / 5), flat % 5];
}

// Stagger offsets for pawns sharing a cell.
export function pawnOffset(pawnId: number): [number, number] {
  const offsets: [number, number][] = [
    [-6, -6], [6, -6], [-6, 6], [6, 6],
  ];
  return offsets[pawnId % 4];
}
