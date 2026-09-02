export interface UserProfile {
  userId: string;
  mobile: string;
  coins: number;
  createdAt: number;
  gamesPlayed: number;
  wins: number;
  avatarColor: string;
}

export type PlayerColor = 'red' | 'green' | 'cyan' | 'purple';

export interface Pawn {
  id: number;
  player: number;
  position: number; // -1 = off-board, 0..24 = on path (24 = home/center)
}

export interface PlayerState {
  index: number;
  color: PlayerColor;
  name: string;
  isAI: boolean;
  pawns: Pawn[];
  finished: number; // count of pawns reached home
}

export interface GameState {
  players: PlayerState[];
  currentPlayer: number;
  dice: number | null;
  rolling: boolean;
  phase: 'roll' | 'move' | 'animating' | 'over';
  winner: number | null;
  message: string;
  extraRoll: boolean;
  lastCut: boolean;
  movesLeft: number; // remaining steps for the current player to distribute
  moveSize: number | null; // size of the pending move (dice, or split remainder)
  turnSnapshot: GameState | null; // board state at the start of the current player's turn sequence
}
