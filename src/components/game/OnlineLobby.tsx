import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Wifi, Plus, LogIn, Copy, Check, Users, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sfx } from '@/lib/sound';
import { useI18n } from '@/lib/i18nContext';
import type { UserProfile } from '@/lib/types';
import LanguageSwitcher from '../LanguageSwitcher';

interface Props {
  user: UserProfile;
  onExit: () => void;
  onStartGame: (roomCode: string, playerIndex: number, players: RoomPlayer[]) => void;
}

interface RoomPlayer {
  userId: string;
  name: string;
  color: string;
}

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function OnlineLobby({ user, onExit, onStartGame }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'menu' | 'create' | 'join'>('menu');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [roomStatus, setRoomStatus] = useState('waiting');
  const channelRef = useRef<any>(null);
  const myPlayerRef = useRef<RoomPlayer>({
    userId: user.userId,
    name: user.userId,
    color: COLORS[0],
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const setupRoom = useCallback((roomCode: string, asHost: boolean) => {
    setLoading(true);
    setError('');

    const channel = supabase.channel(`room-${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: user.userId } },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const allPlayers: RoomPlayer[] = Object.values(state).flat() as any;
        // Deduplicate by userId
        const seen = new Set<string>();
        const unique = allPlayers.filter((p) => {
          if (seen.has(p.userId)) return false;
          seen.add(p.userId);
          return true;
        });
        setPlayers(unique);
      })
      .on('broadcast', { event: 'start' }, (payload: any) => {
        const ordered = payload.payload?.players as RoomPlayer[];
        if (ordered) {
          const myIndex = ordered.findIndex((p) => p.userId === user.userId);
          if (myIndex >= 0) {
            sfx.home();
            onStartGame(roomCode, myIndex, ordered);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myPlayerRef.current);
          setLoading(false);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Connection error. Try again.');
          setLoading(false);
        }
      });
  }, [user, onStartGame]);

  const handleCreate = () => {
    sfx.click();
    const c = genCode();
    setCode(c);
    setTab('create');
    setPlayers([{ userId: user.userId, name: user.userId, color: COLORS[0] }]);
    setupRoom(c, true);
  };

  const handleJoin = () => {
    sfx.click();
    if (!/^\d{6}$/.test(joinCode)) {
      setError(t('roomNotFound'));
      sfx.error();
      return;
    }
    setCode(joinCode);
    setTab('create');
    // Assign color based on count
    myPlayerRef.current = {
      userId: user.userId,
      name: user.userId,
      color: COLORS[players.length % 4],
    };
    setupRoom(joinCode, false);
  };

  const handleStart = () => {
    sfx.click();
    if (!channelRef.current) return;
    setRoomStatus('playing');
    channelRef.current.send({
      type: 'broadcast',
      event: 'start',
      payload: { players },
    });
    const myIndex = players.findIndex((p) => p.userId === user.userId);
    if (myIndex >= 0) {
      onStartGame(code, myIndex, players);
    }
  };

  const handleLeave = () => {
    sfx.click();
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setTab('menu');
    setCode('');
    setPlayers([]);
    setError('');
    setRoomStatus('waiting');
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    sfx.click();
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------- MENU ----------
  if (tab === 'menu') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { sfx.click(); onExit(); }} className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-black">{t('onlineFriends')}</h1>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm space-y-3"
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-amber-400 to-orange-600 p-4 text-left shadow-xl shadow-amber-500/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <span className="text-base font-bold text-white">{t('createRoom')}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { sfx.click(); setTab('join'); }}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500 to-blue-600 p-4 text-left shadow-xl shadow-indigo-500/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <LogIn className="h-6 w-6 text-white" />
                </div>
                <span className="text-base font-bold text-white">{t('joinRoom')}</span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- JOIN INPUT ----------
  if (tab === 'join') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => { sfx.click(); setTab('menu'); }} className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black">{t('joinRoom')}</h1>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('roomCode')}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder={t('enterCode')}
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3.5 px-4 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
              {error && <p className="mt-2 text-xs font-medium text-rose-400">{error}</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleJoin}
                disabled={joinCode.length !== 6}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-3.5 font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                {t('join')}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- ROOM (create/join result) ----------
  const isHost = players[0]?.userId === user.userId;
  const canStart = players.length >= 2 && isHost && roomStatus === 'waiting';

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-pink-600/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={handleLeave} className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
              <X className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black">{t('onlineFriends')}</h1>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            {/* Room code */}
            <p className="mb-2 text-center text-xs text-slate-400">{t('shareCode')}</p>
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="rounded-2xl border border-white/20 bg-slate-900/60 px-6 py-3 text-3xl font-black tracking-[0.4em] text-white">
                {code}
              </div>
              <button
                onClick={handleCopy}
                className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
              >
                {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5 text-slate-300" />}
              </button>
            </div>

            {/* Players list */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Users className="h-4 w-4" /> {t('players')} ({players.length}/4)
              </div>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <motion.div
                    key={p.userId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/50 px-3 py-2.5"
                  >
                    <span className="h-4 w-4 rounded-full" style={{ background: COLORS[i % 4] }} />
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    {i === 0 && <span className="text-[10px] text-amber-400">HOST</span>}
                    {p.userId === user.userId && <span className="text-[10px] text-indigo-400">YOU</span>}
                  </motion.div>
                ))}
                {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-3 py-2.5">
                    <div className="h-4 w-4 rounded-full border border-white/20" />
                    <span className="text-sm text-slate-600">{t('waitingForPlayers')}...</span>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="mb-3 text-center text-xs text-rose-400">{error}</p>}

            {/* Actions */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> {t('entering')}
              </div>
            ) : isHost ? (
              <div className="flex gap-3">
                <button
                  onClick={handleLeave}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-sm"
                >
                  {t('leaveRoom')}
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStart}
                  disabled={!canStart}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-3 font-bold text-sm disabled:opacity-50"
                >
                  {t('startNow')}
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('waitingForPlayers')}...
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
