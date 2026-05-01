import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

function getAuthRedirectUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

const configurationErrorMessage =
  supabaseConfigError || 'إعدادات Supabase غير مكتملة.';

export default function Login() {
  const { user, role, loading, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && role) {
    return <Navigate to={role === 'admin' ? '/admin' : '/teacher'} replace />;
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error(configurationErrorMessage);
      return;
    }
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error('بيانات الدخول غير صحيحة');
    }
  }

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured) {
      toast.error(configurationErrorMessage);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl() },
    });
    if (error) toast.error('حدث خطأ في تسجيل الدخول بـ Google');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-primary tracking-tight">غيابي</h1>
          <p className="text-sm text-muted-foreground mt-1">Ghiyabi</p>
          <p className="text-base text-foreground mt-3 font-medium">
            مدرسة زيد بن ثابت الابتدائية
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">نظام تسجيل الحضور والغياب</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl shadow-lg p-6 space-y-5">
          {!isSupabaseConfigured && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {configurationErrorMessage}
            </div>
          )}

          {authError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {authError === 'missing-email'
                ? 'تعذر قراءة البريد الإلكتروني من حسابك. استخدم حساباً يحتوي على بريد إلكتروني موثق.'
                : 'تعذر التحقق من صلاحياتك حالياً. حاول مرة أخرى لاحقاً.'}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={!isSupabaseConfigured}
            className="w-full min-h-[52px] flex items-center justify-center gap-3 border-2 border-border rounded-xl hover:bg-muted transition-colors font-semibold text-foreground"
            aria-label="تسجيل الدخول باستخدام حساب Google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>تسجيل الدخول بـ Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">أو بالبريد الإلكتروني</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5 text-foreground">
                البريد الإلكتروني
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                required
                className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5 text-foreground">
                كلمة المرور
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !isSupabaseConfigured}
              className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          نظام غيابي — مدرسة زيد بن ثابت الابتدائية
        </p>
      </div>
    </div>
  );
}
