import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Gamepad2, Trophy, Calendar, User } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { sfx } from '@/lib/sound';
import { useI18n } from '@/lib/i18nContext';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const { t } = useI18n();
  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  const stats = [
    { icon: Coins, label: t('coins'), value: user.coins.toLocaleString(), color: 'text-amber-400' },
    { icon: Gamepad2, label: t('gamesPlayed'), value: user.gamesPlayed, color: 'text-indigo-400' },
    { icon: Trophy, label: t('wins'), value: user.wins, color: 'text-emerald-400' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => { sfx.click(); onClose(); }} />
        <motion.div
          initial={{ scale: 0.85, y: 30, rotateX: -15 }}
          animate={{ scale: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.85, y: 30 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Header banner */}
          <div className="relative h-24 bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-400">
            <button
              onClick={() => { sfx.click(); onClose(); }}
              className="absolute right-3 top-3 rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Avatar */}
          <div className="relative -mt-12 flex flex-col items-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-slate-900 shadow-xl"
              style={{ background: user.avatarColor }}
            >
              <User className="h-12 w-12 text-white" strokeWidth={2} />
            </div>
            <h2 className="mt-3 text-xl font-black tracking-wide text-white">{user.userId}</h2>
            <span className="mt-1 rounded-full bg-indigo-500/15 px-3 py-0.5 text-xs font-semibold text-indigo-300">
              {t('proGamer')}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 p-5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <s.icon className={`mx-auto mb-1 h-5 w-5 ${s.color}`} />
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="space-y-2 px-5 pb-5">
            <DetailRow icon={Trophy} label={t('winRate')} value={`${winRate}%`} />
            <DetailRow icon={Calendar} label={t('joined')} value={new Date(user.createdAt).toLocaleDateString()} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
