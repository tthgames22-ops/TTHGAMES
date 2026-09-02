import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { loadUser, saveUser, updateUser } from '@/lib/storage';
import type { UserProfile } from '@/lib/types';
import { I18nProvider } from '@/lib/i18nContext';
import Home from '@/components/Home';
import ProfileModal from '@/components/ProfileModal';
import GameScreen from '@/components/game/GameScreen';
import OnlineLobby from '@/components/game/OnlineLobby';

type Screen = 'home' | 'chouka' | 'online';

const AVATAR_COLORS = [
  '#f43f5e', '#22c55e', '#3b82f6', '#f59e0b',
  '#ec4899', '#14b8a6', '#a855f7', '#84cc16',
];

function createGuestUser(): UserProfile {
  const user: UserProfile = {
    userId: 'TTHGUEST',
    mobile: '0000000000',
    coins: 1000,
    createdAt: Date.now(),
    gamesPlayed: 0,
    wins: 0,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
  saveUser(user);
  return user;
}

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = loadUser();
    if (u) {
      setUser(u);
    } else {
      setUser(createGuestUser());
    }
    setReady(true);
  }, []);

  const handleWin = () => {
    if (user) {
      const updated = updateUser({ wins: user.wins + 1, gamesPlayed: user.gamesPlayed + 1 });
      if (updated) setUser(updated);
    }
  };

  if (!ready || !user) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Home
              user={user}
              onOpenProfile={() => setShowProfile(true)}
              onPlayChoukaBara={() => setScreen('chouka')}
            />
          </motion.div>
        )}

        {screen === 'chouka' && (
          <motion.div key="chouka" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <GameScreen
              onExit={() => setScreen('home')}
              onWin={handleWin}
              onOpenOnline={() => setScreen('online')}
            />
          </motion.div>
        )}

        {screen === 'online' && (
          <motion.div key="online" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <OnlineLobby
              user={user}
              onExit={() => setScreen('chouka')}
              onStartGame={(_code, _index, _players) => {
                setScreen('chouka');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showProfile && user && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
