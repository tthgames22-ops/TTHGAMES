import { motion } from 'framer-motion'
import { useState } from 'react'
import { playDiceRoll } from '../../lib/sound'

interface DiceProps {
  value: number | null
  rolling: boolean
  onRoll: () => void
  disabled: boolean
  color?: string
}

const DICE_FACES: Record<number, number[]> = {
  1: [1],
  2: [0, 2],
  3: [0, 1, 2],
  4: [0, 1, 2, 3],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
}

export default function Dice({ value, rolling, onRoll, disabled }: DiceProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(value)

  const handleRoll = () => {
    if (disabled || rolling) return
    playDiceRoll()
    // Animate random faces
    let count = 0
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1)
      count++
      if (count >= 8) {
        clearInterval(interval)
        onRoll()
      }
    }, 80)
  }

  const showValue = rolling ? displayValue : value
  const dots = showValue ? DICE_FACES[showValue] : []

  const dotPositions = [
    { top: '20%', left: '20%' },
    { top: '20%', left: '50%' },
    { top: '20%', left: '80%' },
    { top: '50%', left: '20%' },
    { top: '50%', left: '50%' },
    { top: '50%', left: '80%' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={handleRoll}
        disabled={disabled || rolling}
        whileTap={{ scale: 0.9 }}
        animate={rolling ? { rotate: [0, 360] } : {}}
        transition={rolling ? { duration: 0.6, repeat: Infinity } : {}}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg ring-2 ring-slate-200 disabled:opacity-50 sm:h-20 sm:w-20"
        style={{ cursor: disabled || rolling ? 'not-allowed' : 'pointer' }}
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-2">
          {dotPositions.map((_pos, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ gridColumn: (i % 3) + 1, gridRow: Math.floor(i / 3) + 1 }}
            >
              {dots.includes(i) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-2.5 w-2.5 rounded-full bg-slate-800 sm:h-3 sm:w-3"
                />
              )}
            </div>
          ))}
        </div>
      </motion.button>
      {!disabled && !rolling && (
        <span className="text-sm font-medium text-white/70">Tap to roll</span>
      )}
    </div>
  )
}
