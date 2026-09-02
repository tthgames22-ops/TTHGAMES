import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import { LANGS } from '@/lib/i18n';
import { sfx } from '@/lib/sound';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { sfx.click(); setOpen(!open); }}
        className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 backdrop-blur-xl transition hover:bg-white/10"
      >
        <Globe className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-semibold text-white">{current.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { sfx.click(); setLang(l.code); setOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition ${
                  lang === l.code ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{l.flag}</span>
                  {l.label}
                </span>
                {lang === l.code && <Check className="h-4 w-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
