import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'teacher' | null;

const TEACHER_STORAGE_KEY = 'ghiyabi_teacher_phone';
const TEACHER_NAME_KEY = 'ghiyabi_teacher_name';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [teacherPhone, setTeacherPhone] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function checkAdmin(email: string): Promise<boolean> {
    const { data } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    return !!data;
  }

  useEffect(() => {
    // First check for a stored teacher session
    const storedPhone = localStorage.getItem(TEACHER_STORAGE_KEY);
    const storedName = localStorage.getItem(TEACHER_NAME_KEY);
    if (storedPhone) {
      setTeacherPhone(storedPhone);
      setTeacherName(storedName);
      setRole('teacher');
      setLoading(false);
      return;
    }

    // Otherwise check Supabase Auth (admin)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.email) {
        const isAdmin = await checkAdmin(u.email);
        setRole(isAdmin ? 'admin' : null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.email) {
        setLoading(true);
        const isAdmin = await checkAdmin(u.email);
        setRole(isAdmin ? 'admin' : null);
        setLoading(false);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInAsTeacher(phone: string): Promise<{ error: string | null }> {
    const normalized = phone.trim();
    const { data, error } = await supabase
      .from('teachers')
      .select('phone, name, is_active')
      .eq('phone', normalized)
      .maybeSingle();

    if (error) return { error: 'حدث خطأ في الاتصال بقاعدة البيانات' };
    if (!data) return { error: 'رقم الهاتف غير مسجل — تواصل مع المدير' };
    if (!data.is_active) return { error: 'هذا الحساب غير مفعّل — تواصل مع المدير' };

    localStorage.setItem(TEACHER_STORAGE_KEY, data.phone);
    localStorage.setItem(TEACHER_NAME_KEY, data.name);
    setTeacherPhone(data.phone);
    setTeacherName(data.name);
    setRole('teacher');
    return { error: null };
  }

  async function signOut() {
    if (role === 'teacher') {
      localStorage.removeItem(TEACHER_STORAGE_KEY);
      localStorage.removeItem(TEACHER_NAME_KEY);
      setTeacherPhone(null);
      setTeacherName(null);
      setRole(null);
    } else {
      await supabase.auth.signOut();
    }
  }

  return { user, role, teacherPhone, teacherName, loading, signOut, signInAsTeacher };
}
