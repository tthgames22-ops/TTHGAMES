import { useState } from 'react'
import { X, LogIn, UserPlus, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18nContext'
import { playClick } from '../lib/sound'

interface LoginProps {
  onClose: () => void
  onAuthed: (user: { id: string; email: string }) => void
  onGuest: () => void
}

export default function Login({ onClose, onAuthed, onGuest }: LoginProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        })
        if (error) throw error
        if (data.user) {
          onAuthed({ id: data.user.id, email })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) {
          onAuthed({ id: data.user.id, email })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-2xl ring-1 ring-white/10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            {mode === 'login' ? t('login') : t('signUp')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl bg-slate-900/50 p-1">
          <button
            onClick={() => { setMode('login'); setError(''); playClick() }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('login')}
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); playClick() }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('signUp')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">{t('displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full rounded-xl bg-slate-900/50 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-blue-400"
                placeholder="Player1"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-900/50 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">{t('password')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900/50 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold text-white transition hover:from-blue-400 hover:to-blue-500 disabled:opacity-50"
          >
            {mode === 'login' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {loading ? t('connecting') : mode === 'login' ? t('login') : t('signUp')}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-500">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={() => { playClick(); onGuest() }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-medium text-slate-300 transition hover:bg-white/20"
        >
          <User className="h-5 w-5" />
          {t('guest')}
        </button>
      </div>
    </div>
  )
}
