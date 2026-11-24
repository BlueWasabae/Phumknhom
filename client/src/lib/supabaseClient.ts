import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseAuthConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Initiates Google (Gmail) OAuth via Supabase Auth.
 * Redirects back to `window.location.origin` where `App.tsx`'s `onAuthStateChange` listener
 * exchanges the access token with `POST /api/auth/google-sync`.
 */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase || !isSupabaseAuthConfigured) {
    return {
      ok: false,
      error:
        'Google Sign-In activates once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured in your environment.',
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to start Google Sign-In.',
    };
  }
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors
  }
}
