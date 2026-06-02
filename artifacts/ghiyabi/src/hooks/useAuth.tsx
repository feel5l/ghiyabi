import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'teacher' | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function checkRole(email: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('admins')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ? 'admin' : 'teacher';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let authEventId = 0;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const eventId = ++authEventId;
      const u = session?.user ?? null;
      setUser(u);
      setRole(null);
      setLoading(true);
      // IMPORTANT: never await inside the onAuthStateChange callback —
      // supabase-js v2 holds an internal auth lock during the callback so any
      // awaited PostgREST/Auth call from here will deadlock until the lock
      // times out (~10s). Defer the role lookup to a separate microtask.
      setTimeout(async () => {
        if (cancelled || eventId !== authEventId) return;
        try {
          if (u?.email) {
            try {
              const r = await checkRole(u.email);
              if (cancelled || eventId !== authEventId) return;
              setRole(r);
            } catch (error) {
              console.error('Failed to check role:', error);
              if (cancelled || eventId !== authEventId) return;
              setRole('teacher');
            }
          } else {
            if (cancelled || eventId !== authEventId) return;
            setRole(null);
          }
        } finally {
          if (!cancelled && eventId === authEventId) setLoading(false);
        }
      }, 0);
    });

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
