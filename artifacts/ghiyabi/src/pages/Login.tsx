import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user, role, loading, signInAsTeacher } = useAuth();
  const [tab, setTab] = useState<'teacher' | 'admin'>('teacher');

  // Teacher form
  const [phone, setPhone] = useState('');
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);

  // Admin form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  if (!loading && user && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  if (!loading && role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }

  async function handleTeacherLogin(e: React.FormEvent) {
    e.preventDefault();
    const normalized = phone.trim();
    if (!normalized) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }
    setTeacherSubmitting(true);
    const { error } = await signInAsTeacher(normalized);
    setTeacherSubmitting(false);
    if (error) toast.error(error);
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setAdminSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAdminSubmitting(false);
    if (error) toast.error('بيانات الدخول غير صحيحة');
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

        <div className="bg-card border border-card-border rounded-2xl shadow-lg p-6">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-border mb-6">
            <button
              onClick={() => setTab('teacher')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'teacher'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              معلم
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'admin'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              مدير
            </button>
          </div>

          {tab === 'teacher' ? (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  required
                  dir="ltr"
                  className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  أدخل رقم هاتفك المسجّل لدى المدير
                </p>
              </div>
              <button
                type="submit"
                disabled={teacherSubmitting}
                className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {teacherSubmitting ? 'جارٍ التحقق...' : 'دخول'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  required
                  dir="ltr"
                  className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">
                  كلمة المرور
                </label>
                <input
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
                disabled={adminSubmitting}
                className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {adminSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
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
