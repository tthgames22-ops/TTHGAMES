import type { UserProfile } from './types'

const PROFILE_KEY = 'ludo_profile'
const SETTINGS_KEY = 'ludo_settings'

export function loadProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY)
}

export interface Settings {
  soundEnabled: boolean
  language: string
}

export function loadSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return { soundEnabled: true, language: 'en' }
  try {
    return JSON.parse(raw) as Settings
  } catch {
    return { soundEnabled: true, language: 'en' }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
