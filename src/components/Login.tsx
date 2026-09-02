import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Gamepad2, ShieldCheck, Loader2 } from 'lucide-react';
import { createUser } from '@/lib/storage';
import { sfx } from '@/lib/sound';
import { useI18n } from '@/lib/i18nContext';
import type { UserProfile } from '@/lib/types';
import LanguageSwitcher from './LanguageSwitcher';

interface Props {
  onLogin: (user: UserProfile) => void;
}

export default function Login({ onLogin }: Props) {
  const { t } = useI18n();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.click();
    if (!/^\d{10}$/.test(mobile)) {
      setError(t('invalidMobile'));
      sfx.error();
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = createUser(mobile);
      onLogin(user);
    }, 900);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white flex items-center justify-center p-5">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-pink-600/25 blur-3xl animate-pulse" style={{ animationDelay: '0.6s' }} />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(2,6,23,0.8))]" />
      </div>

      {/* Language switcher */}
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-pink-500 to-amber-400 shadow-2xl shadow-indigo-500/40"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Gamepad2 className="h-10 w-10 text-white" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            {t('appName')}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{t('tagline')}</p>
        </div>

        {/* Glass card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('mobileNumber')}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3.5 pl-12 pr-4 text-lg font-medium tracking-widest text-white placeholder-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-xs font-medium text-rose-400"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/30 transition disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> {t('entering')}</>
                ) : (
                  <><ShieldCheck className="h-5 w-5" /> {t('enterGame')}</>
                )}
              </span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
            </motion.button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('oneTimeLogin')}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          {t('agreeText')}
        </p>
      </motion.div>
    </div>
  );
}
