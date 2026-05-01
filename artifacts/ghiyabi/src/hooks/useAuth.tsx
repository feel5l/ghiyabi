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
  try {
    const { data } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    return data ? 'admin' : 'teacher';
  } catch {
    return 'teacher';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      // IMPORTANT: never await inside the onAuthStateChange callback —
      // supabase-js v2 holds an internal auth lock during the callback so any
      // awaited PostgREST/Auth call from here will deadlock until the lock
      // times out (~10s). Defer the role lookup to a separate microtask.
      setTimeout(async () => {
        if (cancelled) return;
        try {
          if (u?.email) {
            const r = await checkRole(u.email);
            if (cancelled) return;
            setRole(r);
          } else {
            setRole(null);
          }
        } finally {
          if (!cancelled) setLoading(false);
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
