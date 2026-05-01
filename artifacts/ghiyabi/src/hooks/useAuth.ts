import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'teacher' | null;
export type AuthError = 'missing-email' | 'role-check-failed' | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError>(null);

  async function checkRole(email: string): Promise<UserRole> {
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data ? 'admin' : 'teacher';
  }

  async function applySessionUser(u: User | null) {
    setUser(u);
    setRole(null);
    setAuthError(null);

    if (!u) return;
    if (!u.email) {
      setAuthError('missing-email');
      return;
    }

    try {
      const r = await checkRole(u.email);
      setRole(r);
    } catch (error) {
      console.error('Failed to check user role', error);
      setAuthError('role-check-failed');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await applySessionUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      await applySessionUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, role, loading, authError, signOut };
}
