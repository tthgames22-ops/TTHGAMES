import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Language } from './types'
import { translate } from './i18n'
import { loadSettings, saveSettings, type Settings } from './storage'

interface I18nContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const initial = loadSettings()
  const [lang, setLangState] = useState<Language>(initial.language as Language)
  const [soundEnabled, setSoundState] = useState<boolean>(initial.soundEnabled)

  useEffect(() => {
    const settings: Settings = { soundEnabled, language: lang }
    saveSettings(settings)
  }, [lang, soundEnabled])

  const setLang = (l: Language) => setLangState(l)
  const setSoundEnabled = (e: boolean) => setSoundState(e)
  const t = (key: string, params?: Record<string, string>) => translate(lang, key, params)

  return (
    <I18nContext.Provider value={{ lang, setLang, t, soundEnabled, setSoundEnabled }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
