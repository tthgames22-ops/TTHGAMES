import { useState } from 'react'
import { Globe, Dice5, Users, Bot, Info, User as UserIcon, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useI18n } from '../lib/i18nContext'
import LanguageSwitcher from './LanguageSwitcher'
import type { UserProfile } from '../lib/types'
import { playClick } from '../lib/sound'

interface HomeProps {
  profile: UserProfile | null
  onSelectMode: (mode: GameMode) => void
  onShowLogin: () => void
  onShowProfile: () => void
}

type GameMode = 'online' | 'local' | 'ai'

export default function Home({ profile, onSelectMode, onShowLogin, onShowProfile }: HomeProps) {
  const { t } = useI18n()
  const [showHelp, setShowHelp] = useState(false)

  const menuItems: { mode: GameMode; icon: typeof Globe; label: string; desc: string; gradient: string }[] = [
    { mode: 'online', icon: Globe, label: t('playOnline'), desc: t('online'), gradient: 'from-blue-500 to-cyan-500' },
    { mode: 'local', icon: Users, label: t('playLocal'), desc: t('local'), gradient: 'from-green-500 to-emerald-500' },
    { mode: 'ai', icon: Bot, label: t('playAI'), desc: t('vsAI'), gradient: 'from-amber-500 to-orange-500' },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {profile ? (
            <button
              onClick={() => { playClick(); onShowProfile() }}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-md transition hover:bg-white/20"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white">{profile.displayName}</span>
            </button>
          ) : (
            <button
              onClick={() => { playClick(); onShowLogin() }}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <UserIcon className="h-4 w-4" />
              {t('login')}
            </button>
          )}
        </div>
        <LanguageSwitcher />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <Dice5 className="h-12 w-12 text-amber-400" />
            </motion.div>
            <h1 className="font-display text-5xl font-bold text-white sm:text-6xl">{t('title')}</h1>
          </div>
          <p className="text-lg text-slate-400">{t('tagline')}</p>
        </motion.div>

        {/* Menu */}
        <div className="w-full max-w-md space-y-3">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.mode}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              onClick={() => { playClick(); onSelectMode(item.mode) }}
              className="group flex w-full items-center gap-4 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/10 hover:ring-white/20"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg`}>
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg font-semibold text-white">{item.label}</div>
                <div className="text-sm text-slate-400">{item.desc}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
            </motion.button>
          ))}
        </div>

        {/* Help button */}
        <button
          onClick={() => { playClick(); setShowHelp(true) }}
          className="mt-6 flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-400 transition hover:text-white"
        >
          <Info className="h-4 w-4" />
          {t('howToPlay')}
        </button>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">{t('howToPlay')}</h2>
              <button onClick={() => setShowHelp(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                <Info className="h-5 w-5" />
              </button>
            </div>
            <p className="leading-relaxed text-slate-300">{t('instructions')}</p>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full rounded-xl bg-blue-500 py-3 font-medium text-white transition hover:bg-blue-400"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
