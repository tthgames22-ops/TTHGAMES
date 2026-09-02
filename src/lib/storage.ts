import type { UserProfile } from './types';

const KEY = 'tthgames_user';

const AVATAR_COLORS = [
  '#f43f5e', '#22c55e', '#3b82f6', '#f59e0b',
  '#ec4899', '#14b8a6', '#a855f7', '#84cc16',
];

export function generateUserId(): string {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `TTH${n}`;
}

export function loadUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveUser(user: UserProfile): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(KEY);
}

export function createUser(mobile: string): UserProfile {
  const user: UserProfile = {
    userId: generateUserId(),
    mobile,
    coins: 1000,
    createdAt: Date.now(),
    gamesPlayed: 0,
    wins: 0,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
  saveUser(user);
  return user;
}

export function updateUser(patch: Partial<UserProfile>): UserProfile | null {
  const u = loadUser();
  if (!u) return null;
  const next = { ...u, ...patch };
  saveUser(next);
  return next;
}
