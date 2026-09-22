import { useState } from 'react'
import { X, User, Trophy, Settings as SettingsIcon } from 'lucide-react'
import { useI18n } from '../lib/i18nContext'
import type { UserProfile } from '../lib/types'
import { setSoundEnabled } from '../lib/sound'

interface ProfileModalProps {
  profile: UserProfile
  onClose: () => void
  onLogout: () => void
}

export default function ProfileModal({ profile, onClose, onLogout }: ProfileModalProps) {
  const { t, soundEnabled, setSoundEnabled: setSoundCtx } = useI18n()
  const [soundOn, setSoundOn] = useState(soundEnabled)

  const winRate = profile.gamesPlayed > 0
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
    : 0

  const toggleSound = () => {
    const newVal = !soundOn
    setSoundOn(newVal)
    setSoundCtx(newVal)
    setSoundEnabled(newVal)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-2xl ring-1 ring-white/10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">{t('profile')}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold text-white">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold text-white">{profile.displayName}</h3>
          <p className="text-sm text-slate-400">{profile.email}</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900/50 p-3 text-center">
            <Trophy className="mx-auto mb-1 h-5 w-5 text-amber-400" />
            <div className="text-xl font-bold text-white">{profile.gamesWon}</div>
            <div className="text-xs text-slate-400">{t('gamesWon')}</div>
          </div>
          <div className="rounded-xl bg-slate-900/50 p-3 text-center">
            <User className="mx-auto mb-1 h-5 w-5 text-blue-400" />
            <div className="text-xl font-bold text-white">{profile.gamesPlayed}</div>
            <div className="text-xs text-slate-400">{t('gamesPlayed')}</div>
          </div>
          <div className="rounded-xl bg-slate-900/50 p-3 text-center">
            <div className="mx-auto mb-1 text-lg">📊</div>
            <div className="text-xl font-bold text-white">{winRate}%</div>
            <div className="text-xs text-slate-400">{t('winRate')}</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <SettingsIcon className="h-4 w-4" />
            {t('settings')}
          </div>
          <button
            onClick={toggleSound}
            className="flex w-full items-center justify-between rounded-xl bg-slate-900/50 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900"
          >
            <span>{t('sound')}</span>
            <div className={`relative h-6 w-11 rounded-full transition ${soundOn ? 'bg-blue-500' : 'bg-slate-600'}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${soundOn ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        <button
          onClick={onLogout}
          className="w-full rounded-xl bg-red-500/20 py-3 font-medium text-red-300 transition hover:bg-red-500/30"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
