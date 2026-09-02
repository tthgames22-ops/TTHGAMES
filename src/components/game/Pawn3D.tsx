import { motion } from 'framer-motion';

interface Pawn3DProps {
  color: string;
  dark: string;
  size?: number;
  movable?: boolean;
  onClick?: () => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

// Traditional 3D board-game pawn: round head, tapered neck, wide base.
// Rendered with layered CSS gradients + drop shadows for a plastic standing look.
export default function Pawn3D({ color, dark, size = 28, movable = false, onClick, onTouchEnd }: Pawn3DProps) {
  const w = size;
  const h = size * 1.25;

  return (
    <motion.button
      whileTap={movable ? { scale: 0.88 } : undefined}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onTouchEnd={onTouchEnd}
      className={`relative flex flex-col items-center justify-end touch-manipulation select-none ${
        movable ? 'cursor-pointer' : 'pointer-events-none cursor-default'
      }`}
      style={{ width: w, height: h, zIndex: 30 }}
      animate={movable ? { y: [0, -4, 0] } : {}}
      transition={{ duration: 0.7, repeat: movable ? Infinity : 0, ease: 'easeInOut' }}
    >
      {/* Glow ring around base when movable */}
      {movable && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: w * 0.95,
            height: w * 0.3,
            background: `radial-gradient(circle, ${color}cc 0%, transparent 70%)`,
            filter: 'blur(3px)',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        />
      )}

      <svg width={w} height={h} viewBox="0 0 28 35" className="relative z-10 drop-shadow-md">
        <defs>
          <radialGradient id={`head-${color}`} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="35%" stopColor={color} />
            <stop offset="100%" stopColor={dark} />
          </radialGradient>
          <linearGradient id={`body-${color}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
          <radialGradient id={`base-${color}`} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={dark} />
          </radialGradient>
        </defs>

        {/* Base ellipse */}
        <ellipse cx="14" cy="31" rx="11" ry="3.5" fill={`url(#base-${color})`} />
        <ellipse cx="14" cy="30" rx="11" ry="3" fill={dark} opacity="0.4" />

        {/* Tapered neck body */}
        <path
          d="M 9 28 Q 9 20 11 16 L 17 16 Q 19 20 19 28 Z"
          fill={`url(#body-${color})`}
        />
        {/* Neck highlight */}
        <path
          d="M 11 26 Q 11 20 12 17 L 13 17 Q 12 20 12 26 Z"
          fill="#ffffff"
          opacity="0.25"
        />

        {/* Head sphere */}
        <circle cx="14" cy="10" r="7" fill={`url(#head-${color})`} />
        {/* Head shine */}
        <ellipse cx="11.5" cy="7.5" rx="2.5" ry="1.8" fill="#ffffff" opacity="0.6" />

        {/* Base shadow on ground */}
        <ellipse cx="14" cy="33.5" rx="9" ry="1.5" fill="#000000" opacity="0.25" />
      </svg>
    </motion.button>
  );
}
