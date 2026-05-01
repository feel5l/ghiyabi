import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { teacherLogin } from '../lib/teacherAuth';
import { useAuth } from '../hooks/useAuth';

type Mode = 'teacher' | 'admin';

export default function Login() {
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('teacher');

  // Teacher (phone) form state.
  const [phone, setPhone] = useState('');
  const [submittingTeacher, setSubmittingTeacher] = useState(false);

  // Admin (email + password) form state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  if (!loading && user && role) {
    return <Navigate to={role === 'admin' ? '/admin' : '/teacher'} replace />;
  }

  async function handleTeacherLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('يرجى إدخال رقم الجوال');
      return;
    }
    setSubmittingTeacher(true);
    const result = await teacherLogin(phone);
    setSubmittingTeacher(false);
    if (!result.ok) {
      // Single generic error for both invalid format and unknown phone, so we
      // don't leak which numbers are registered.
      toast.error(
        result.code === 'invalid_phone'
          ? 'الرجاء إدخال رقم جوال سعودي صحيح'
          : result.code === 'network'
            ? 'تعذّر الاتصال بالخادم'
            : 'رقم غير مصرّح له بالدخول. تواصل مع الإدارة.',
      );
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmittingAdmin(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmittingAdmin(false);
    if (error) toast.error('بيانات الدخول غير صحيحة');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-primary tracking-tight">غيابي</h1>
          <p className="text-sm text-muted-foreground mt-1">Ghiyabi</p>
          <p className="text-base text-foreground mt-3 font-medium">
            مدرسة زيد بن ثابت الابتدائية
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">نظام تسجيل الحضور والغياب</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl shadow-lg p-6 space-y-5">
          {mode === 'teacher' ? (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label htmlFor="login-phone" className="block text-sm font-medium mb-1.5 text-foreground">
                  رقم الجوال
                </label>
                <div className="flex items-stretch gap-2" dir="ltr">
                  <span
                    className="inline-flex items-center px-3 rounded-xl border border-input bg-muted text-foreground text-sm font-mono select-none"
                    aria-hidden="true"
                  >
                    +966
                  </span>
                  <input
                    id="login-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5xxxxxxxx"
                    required
                    aria-describedby="login-phone-hint"
                    className="flex-1 h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
                <p id="login-phone-hint" className="text-xs text-muted-foreground mt-1.5" dir="rtl">
                  مثال: 0501234567 أو 501234567
                </p>
              </div>

              <button
                type="submit"
                disabled={submittingTeacher}
                className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submittingTeacher ? 'جارٍ الدخول...' : 'دخول'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode('admin')}
                className="w-full min-h-[44px] text-sm font-medium text-primary hover:underline"
              >
                دخول الإدارة
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium mb-1.5 text-foreground">
                  البريد الإلكتروني
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  required
                  className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium mb-1.5 text-foreground">
                  كلمة المرور
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={submittingAdmin}
                className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submittingAdmin ? 'جارٍ تسجيل الدخول...' : 'دخول الإدارة'}
              </button>

              <button
                type="button"
                onClick={() => setMode('teacher')}
                className="w-full min-h-[44px] text-sm font-medium text-primary hover:underline"
              >
                ← رجوع لدخول المعلم
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          نظام غيابي — مدرسة زيد بن ثابت الابتدائية
        </p>
      </div>
    </div>
  );
}
