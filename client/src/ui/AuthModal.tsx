import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Cloud, LogIn, Sparkles, UserPlus, Users } from 'lucide-react';
import { loginAccount, registerAccount, type AuthSession } from '../game/network/ApiClient';
import { isSupabaseAuthConfigured, signInWithGoogle } from '../lib/supabaseClient';
import { NativeDialog } from './NativeDialog';

interface AuthModalProps {
  open: boolean;
  starterState: PlayerState;
  onAuthenticated: (session: AuthSession, loadedState: PlayerState) => void;
  onPlayGuest: () => void;
}

const LAST_USER_KEY = 'phum_last_username';

const GoogleGIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.45c-.24 1.25-.96 2.31-2.05 3.02l3.31 2.57c1.93-1.78 3.04-4.4 3.04-7.52 0-.72-.06-1.42-.18-2.09H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.75 0 5.06-.91 6.75-2.46l-3.31-2.57c-.92.62-2.09.99-3.44.99-2.65 0-4.9-1.79-5.7-4.19l-3.42 2.64C4.56 19.74 8.01 22 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.3 13.77A5.99 5.99 0 0 1 5.98 12c0-.61.11-1.2.32-1.77L2.88 7.59A9.97 9.97 0 0 0 2 12c0 1.61.39 3.13 1.08 4.41l3.22-2.64z"
    />
    <path
      fill="#4285F4"
      d="M12 6.04c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 3 14.74 2 12 2 8.01 2 4.56 4.26 2.88 7.59l3.42 2.64c.8-2.4 3.05-4.19 5.7-4.19z"
    />
  </svg>
);

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
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleNotice(null);
    if (!isSupabaseAuthConfigured) {
      setGoogleNotice(
        'Google Sign-In activates once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured in your environment.'
      );
      return;
    }
    setGoogleSubmitting(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setGoogleSubmitting(false);
      setError(res.error);
    }
  };

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
      subtitle="Sign in with Gmail or Username to sync your Coins, Farm timers, 12 Skills, Outfits & Friends"
      maxWidthClass="w-[min(94vw,460px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Cozy Khmer Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-900 via-amber-900 to-purple-900 text-amber-50 border-2 border-amber-500/70 space-y-1 shadow">
          <div className="font-display font-bold text-sm flex items-center gap-1.5 text-amber-200">
            <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
            2D Social Village RPG · Homestead Farm · Boss Caverns
          </div>
          <p className="text-[11px] text-amber-100/90 leading-snug">
            Cloud accounts save your customized Hero, real-timestamp crops, Artisan machines, 5 Khmer classes, and Friends list!
          </p>
        </div>

        {/* Prominent Top CTA: Continue with Google (Gmail) */}
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={googleSubmitting || submitting}
            onClick={() => void handleGoogleSignIn()}
            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-amber-900/40 text-slate-900 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            <GoogleGIcon />
            <span>
              {googleSubmitting ? 'Redirecting to Google...' : 'Continue with Google (Gmail)'}
            </span>
          </button>

          {(!isSupabaseAuthConfigured || googleNotice) && (
            <div className="px-2.5 py-1.5 rounded-xl bg-sky-50 border border-sky-400/50 text-sky-950 text-[10px] font-semibold leading-snug">
              {googleNotice ??
                'Local Dev Notice: Google Sign-In activates automatically once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.'}
            </div>
          )}
        </div>

        <div className="relative flex items-center py-0.5">
          <div className="flex-1 border-t border-amber-900/25" />
          <span className="px-2 text-[10px] font-bold text-amber-800/80 uppercase">
            or use Username
          </span>
          <div className="flex-1 border-t border-amber-900/25" />
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
            disabled={submitting || googleSubmitting}
            className="w-full phum-btn py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
