import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';

interface Props {
  value: number | null;
  rolling: boolean;
  onRoll: () => void;
  disabled: boolean;
  color: string;
}

export default function Dice({ value, rolling, onRoll, disabled, color }: Props) {
  const faces: Record<number, string> = {
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    8: '8️⃣',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onRoll}
      disabled={disabled || rolling}
      className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-white/20 bg-slate-900/80 shadow-2xl backdrop-blur-xl transition disabled:opacity-50"
      style={{ boxShadow: `0 8px 30px ${color}40` }}
    >
      {rolling ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
        >
          <Dices className="h-9 w-9" style={{ color }} />
        </motion.div>
      ) : value !== null ? (
        <motion.span
          key={value}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="text-4xl"
        >
          {faces[value] ?? value}
        </motion.span>
      ) : (
        <Dices className="h-9 w-9 text-slate-500" />
      )}
    </motion.button>
  );
}
