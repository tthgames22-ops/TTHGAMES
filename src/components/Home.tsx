import { motion } from 'framer-motion';
import { Coins, User, Lock, Car, Bike, Bus, Layers, HelpCircle, ChevronRight } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { sfx } from '@/lib/sound';
import { useI18n } from '@/lib/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface Props {
  user: UserProfile;
  onOpenProfile: () => void;
  onPlayChoukaBara: () => void;
}

interface GameCard {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: any;
  colors: string;
  glow: string;
  available: boolean;
  onClick?: () => void;
}

export default function Home({ user, onOpenProfile, onPlayChoukaBara }: Props) {
  const { t } = useI18n();

  const games: GameCard[] = [
    {
      id: 'chouka',
      titleKey: 'choukaBara3D',
      subtitleKey: 'traditionalBoard',
      icon: HelpCircle,
      colors: 'from-indigo-500 to-blue-600',
      glow: 'shadow-indigo-500/40',
      available: true,
      onClick: onPlayChoukaBara,
    },
    {
      id: 'riding',
      titleKey: 'ridingGames',
      subtitleKey: 'carBikeBus',
      icon: Car,
      colors: 'from-amber-400 to-orange-600',
      glow: 'shadow-amber-500/40',
      available: false,
    },
    {
      id: 'cards',
      titleKey: 'cardsGame',
      subtitleKey: 'comingSoon',
      icon: Layers,
      colors: 'from-pink-500 to-rose-600',
      glow: 'shadow-pink-500/40',
      available: false,
    },
    {
      id: 'quiz',
      titleKey: 'quizGame',
      subtitleKey: 'comingSoon',
      icon: HelpCircle,
      colors: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/40',
      available: false,
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-72 w-72 rounded-full bg-pink-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { sfx.click(); onOpenProfile(); }}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 pr-4 backdrop-blur-xl"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
            style={{ background: user.avatarColor }}
          >
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold leading-tight">{user.userId}</div>
            <div className="flex items-center gap-1 text-[11px] text-amber-400">
              <Coins className="h-3 w-3" /> {user.coins.toLocaleString()}
            </div>
          </div>
        </motion.button>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 px-5 pt-2 pb-4">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black leading-tight"
        >
          {t('welcomeBack')}, <span className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">{t('gamer')}</span>
        </motion.h1>
        <p className="text-sm text-slate-400">{t('pickArena')}</p>
      </div>

      {/* Game grid */}
      <div className="relative z-10 grid grid-cols-2 gap-4 px-5 pb-8">
        {games.map((g, i) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { sfx.click(); g.onClick?.(); }}
            disabled={!g.available}
            className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${g.colors} p-4 text-left shadow-xl ${g.glow} transition disabled:opacity-70`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* 3D sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-60" />
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />

            <div className="relative z-10">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <g.icon className="h-6 w-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-base font-black leading-tight text-white">{t(g.titleKey)}</h3>
                  <p className="text-xs text-white/70">{t(g.subtitleKey)}</p>
                </div>
                {g.available ? (
                  <ChevronRight className="h-5 w-5 text-white/80" />
                ) : (
                  <Lock className="h-4 w-4 text-white/60" />
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Riding preview strip */}
      <div className="relative z-10 px-5 pb-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{t('ridingGames')}</h3>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">{t('soon')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Car, label: 'Car' },
              { icon: Bike, label: 'Bike' },
              { icon: Bus, label: 'Bus' },
            ].map((v) => (
              <div key={v.label} className="flex flex-col items-center gap-1 rounded-2xl border border-white/5 bg-slate-900/50 p-3">
                <v.icon className="h-6 w-6 text-slate-400" />
                <span className="text-[11px] text-slate-500">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
