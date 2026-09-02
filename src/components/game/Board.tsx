import { motion } from 'framer-motion';
import type { GameState } from '@/lib/types';
import {
  SAFE_INDICES, ENTRY_BOX, positionToCell, pawnOffset, HOME,
} from '@/lib/gameEngine';
import Pawn3D from './Pawn3D';

interface Props {
  state: GameState;
  movablePawnIds: Set<string>;
  onPawnClick: (pawnId: number) => void;
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

const PLAYER_CORNERS: Record<number, [number, number]> = {
  0: [4, 0],  // P1 bottom-left
  1: [0, 4],  // P2 top-right
  2: [0, 0],  // P3 top-left
  3: [4, 4],  // P4 bottom-right
};

export default function Board({ state, movablePawnIds, onPawnClick }: Props) {
  const cellPawns: Record<string, { pawn: any; player: number; id: number }[]> = {};
  state.players.forEach((ps) => {
    ps.pawns.forEach((p) => {
      if (p.position === -1) return;
      const cell = p.position === HOME ? [2, 2] : positionToCell(p.player, p.position);
      if (!cell) return;
      const key = `${cell[0]}-${cell[1]}`;
      if (!cellPawns[key]) cellPawns[key] = [];
      cellPawns[key].push({ pawn: p, player: p.player, id: p.id });
    });
  });

  const cells: [number, number][] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push([r, c]);
    }
  }

  const flatFor = (r: number, c: number) => r * 5 + c;

  return (
    <div
      className="relative mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/80 to-slate-900/90 p-3 shadow-2xl"
      style={{ width: 'min(92vw, 380px)', aspectRatio: '1' }}
    >
      <div
        className="grid h-full w-full grid-cols-5 grid-rows-5 gap-1.5"
        style={{ transform: 'perspective(700px) rotateX(14deg)', transformStyle: 'preserve-3d' }}
      >
        {cells.map(([r, c]) => {
          const flat = flatFor(r, c);
          const isCenter = flat === 12;
          const isSafe = SAFE_INDICES.includes(flat);
          const key = `${r}-${c}`;
          const pawnsHere = cellPawns[key] || [];

          let entryOwner = -1;
          Object.entries(ENTRY_BOX).forEach(([pi, idx]) => {
            if (idx === flat) entryOwner = parseInt(pi);
          });

          let baseOwner = -1;
          Object.entries(PLAYER_CORNERS).forEach(([pi, [rr, cc]]) => {
            if (rr === r && cc === c) baseOwner = parseInt(pi);
          });

          const isInner = !isCenter &&
            r >= 1 && r <= 3 && c >= 1 && c <= 3;
          const isRing = !isCenter && !isInner &&
            (r === 0 || r === 4 || c === 0 || c === 4);

          const movablePawnHere = pawnsHere.find((pp) => movablePawnIds.has(`${pp.player}-${pp.id}`));

          return (
            <div
              key={key}
              onClick={() => { if (movablePawnHere) onPawnClick(movablePawnHere.id); }}
              onTouchEnd={(e) => { if (movablePawnHere) { e.preventDefault(); onPawnClick(movablePawnHere.id); } }}
              className={`relative rounded-lg border transition ${
                isCenter
                  ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/30 to-amber-600/20'
                  : isSafe
                  ? 'border-rose-400/40 bg-rose-500/10'
                  : isInner
                  ? 'border-white/15 bg-slate-600/40'
                  : isRing
                  ? 'border-white/10 bg-slate-700/50'
                  : baseOwner >= 0
                  ? 'border-white/20'
                  : 'border-white/5 bg-slate-800/30'
              } ${movablePawnHere ? 'cursor-pointer' : ''}`}
              style={
                baseOwner >= 0
                  ? { background: `${COLOR_MAP[state.players[baseOwner]?.color]}25` }
                  : undefined
              }
            >
              {/* Safe mark — always visible on all 4 outer middle boxes. pointer-events-none so taps reach pawns. */}
              {isSafe && (
                <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                  <span className="font-black text-2xl text-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.7)]">✕</span>
                </div>
              )}

              {/* Center home */}
              {isCenter && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xl"
                  >
                    🏆
                  </motion.span>
                </div>
              )}

              {/* Entry indicator — pointer-events-none so it never blocks pawn taps */}
              {entryOwner >= 0 && (
                <div
                  className="pointer-events-none absolute inset-0 z-0 rounded-lg border-2"
                  style={{ borderColor: COLOR_MAP[state.players[entryOwner]?.color] + '60' }}
                />
              )}

              {/* Pawns */}
              {pawnsHere.map((pp, idx) => {
                const [ox, oy] = pawnOffset(idx);
                const movable = movablePawnIds.has(`${pp.player}-${pp.id}`);
                const color = COLOR_MAP[state.players[pp.player]?.color] || '#888';
                const dark = DARK_MAP[state.players[pp.player]?.color] || '#444';
                return (
                  <div
                    key={`${pp.player}-${pp.id}`}
                    className="absolute left-1/2 top-1/2 z-30"
                    style={{ transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))` }}
                  >
                    <Pawn3D
                      color={color}
                      dark={dark}
                      size={26}
                      movable={movable}
                      onClick={() => onPawnClick(pp.id)}
                      onTouchEnd={(e) => { e.preventDefault(); onPawnClick(pp.id); }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
