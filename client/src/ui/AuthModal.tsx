import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Cloud, LogIn, Sparkles, UserPlus, Users } from 'lucide-react';
import { loginAccount, registerAccount, type AuthSession } from '../game/network/ApiClient';
import { NativeDialog } from './NativeDialog';

interface AuthModalProps {
  open: boolean;
  starterState: PlayerState;
  onAuthenticated: (session: AuthSession, loadedState: PlayerState) => void;
  onPlayGuest: () => void;
}

const LAST_USER_KEY = 'phum_last_username';

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  starterState,
  onAuthenticated,
  onPlayGuest,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(LAST_USER_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);
    const res =
      mode === 'register'
        ? await registerAccount(cleanUser, password, starterState)
        : await loginAccount(cleanUser, password);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    try {
      localStorage.setItem(LAST_USER_KEY, res.session.username);
    } catch {
      // Ignore storage quota issues
    }
    setPassword('');
    onAuthenticated(res.session, res.playerState);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onPlayGuest}
      title="ភូមិខ្ញុំ (Phum Khnhom) · Welcome Home!"
      subtitle="Sign in to sync your Coins, Farm timers, 12 Skills, Outfits & Friends across sessions"
      maxWidthClass="w-[min(94vw,460px)]"
    >
      <div className="space-y-3.5 text-xs">
        {/* Cozy Khmer Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-900 via-amber-900 to-purple-900 text-amber-50 border-2 border-amber-500/70 space-y-1 shadow">
          <div className="font-display font-bold text-sm flex items-center gap-1.5 text-amber-200">
            <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
            Stardew Farm · Social Village Plaza · Calamity Bosses
          </div>
          <p className="text-[11px] text-amber-100/90 leading-snug">
            Cloud accounts save your real-timestamp crops, Artisan machines, street snacks, 5 Khmer classes, and Friends list!
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
              mode === 'login'
                ? 'bg-amber-800 text-amber-50 border-amber-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
              mode === 'register'
                ? 'bg-emerald-800 text-amber-50 border-emerald-950'
                : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2.5">
          <div>
            <label className="block font-display font-bold text-amber-950 mb-1" htmlFor="phum-auth-user">
              Username (3–20 chars)
            </label>
            <input
              id="phum-auth-user"
              type="text"
              autoComplete="username"
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. SovannHero"
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-700"
            />
          </div>

          <div>
            <label className="block font-display font-bold text-amber-950 mb-1" htmlFor="phum-auth-pass">
              Password (4+ chars)
            </label>
            <input
              id="phum-auth-pass"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              maxLength={64}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-700"
            />
          </div>

          {error && (
            <div className="p-2 rounded-xl bg-rose-100 border border-rose-500/60 text-rose-900 font-bold text-[11px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full stardew-btn py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Cloud className="w-4 h-4" />
            {submitting
              ? 'Connecting...'
              : mode === 'register'
              ? 'Create Account & Start Adventure'
              : 'Login & Load Cloud Save'}
          </button>
        </form>

        <div className="relative flex items-center py-0.5">
          <div className="flex-1 border-t border-amber-900/25" />
          <span className="px-2 text-[10px] font-bold text-amber-800/80 uppercase">or</span>
          <div className="flex-1 border-t border-amber-900/25" />
        </div>

        <button
          type="button"
          onClick={onPlayGuest}
          className="w-full py-2 rounded-xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-900/35 text-amber-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Users className="w-3.5 h-3.5" />
          Play as Guest (No Cloud Save)
        </button>
      </div>
    </NativeDialog>
  );
};
