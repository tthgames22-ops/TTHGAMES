import { motion } from 'framer-motion'
import type { PlayerColor } from '../lib/types'
import { COLOR_HEX } from '../lib/gameEngine'

interface Pawn3DProps {
  color: PlayerColor
  size?: number
  active?: boolean
  onClick?: () => void
  delay?: number
}

export default function Pawn3D({ color, size = 28, active = false, onClick, delay = 0 }: Pawn3DProps) {
  const hex = COLOR_HEX[color]
  const darkHex = hex === '#EF4444' ? '#B91C1C' : hex === '#22C55E' ? '#15803D' : hex === '#F59E0B' ? '#B45309' : '#1D4ED8'

  return (
    <motion.div
      initial={{ scale: 0, y: -20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
      whileHover={active ? { scale: 1.15, y: -4 } : undefined}
      whileTap={active ? { scale: 0.9 } : undefined}
      onClick={onClick}
      style={{ width: size, height: size, cursor: active ? 'pointer' : 'default' }}
      className="relative flex items-center justify-center"
    >
      {active && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: hex, filter: 'blur(8px)' }}
        />
      )}
      <svg width={size} height={size} viewBox="0 0 40 40" className="relative z-10">
        <defs>
          <radialGradient id={`grad-${color}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor={hex} />
            <stop offset="100%" stopColor={darkHex} />
          </radialGradient>
        </defs>
        {/* Shadow */}
        <ellipse cx="20" cy="36" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />
        {/* Base */}
        <ellipse cx="20" cy="33" rx="9" ry="4" fill={darkHex} />
        <ellipse cx="20" cy="31" rx="9" ry="4" fill={hex} />
        {/* Body */}
        <path d="M12 30 Q12 18 20 10 Q28 18 28 30 Z" fill={`url(#grad-${color})`} />
        {/* Head */}
        <circle cx="20" cy="11" r="6" fill={`url(#grad-${color})`} />
        {/* Highlight */}
        <ellipse cx="17" cy="9" rx="2" ry="3" fill="rgba(255,255,255,0.4)" />
      </svg>
    </motion.div>
  )
}
