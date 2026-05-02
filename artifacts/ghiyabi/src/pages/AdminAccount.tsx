import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function AdminAccount() {
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextEmail = email.trim().toLowerCase();
    const currentEmail = user?.email?.trim().toLowerCase() || '';
    const emailChanged = nextEmail && nextEmail !== currentEmail;
    const passwordChanged = password.length > 0;

    if (!emailChanged && !passwordChanged) {
      toast.error('لم يتم إدخال أي تغيير');
      return;
    }

    if (emailChanged && !nextEmail.includes('@')) {
      toast.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    if (passwordChanged && password.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (passwordChanged && password !== confirmPassword) {
      toast.error('تأكيد كلمة المرور غير مطابق');
      return;
    }

    setSubmitting(true);

    if (emailChanged) {
      const { error: adminError } = await supabase
        .from('admins')
        .upsert({ email: nextEmail }, { onConflict: 'email' });

      if (adminError) {
        setSubmitting(false);
        toast.error('تعذر تحديث صلاحية المدير للبريد الجديد');
        return;
      }
    }

    const updates: { email?: string; password?: string } = {};
    if (emailChanged) updates.email = nextEmail;
    if (passwordChanged) updates.password = password;

    const { error } = await supabase.auth.updateUser(updates);
    setSubmitting(false);

    if (error) {
      toast.error('تعذر تحديث بيانات الدخول');
      return;
    }

    setPassword('');
    setConfirmPassword('');
    toast.success(emailChanged ? 'تم إرسال طلب تحديث البريد' : 'تم تحديث كلمة المرور');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-primary">إعدادات حساب المدير</h1>
            <p className="text-xs text-muted-foreground">تحديث بيانات تسجيل الدخول</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-sm text-primary hover:underline font-medium">
              لوحة الإدارة
            </Link>
            <button onClick={signOut} className="text-sm text-destructive hover:underline font-medium">
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-xl shadow-sm p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              بريد المدير
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-2">
              عند تغيير البريد قد يطلب النظام تأكيده من رسالة البريد الإلكتروني قبل اعتماده لتسجيل الدخول.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                كلمة مرور جديدة
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="اتركها فارغة دون تغيير"
                className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full h-12 px-3 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <Link to="/admin" className="min-h-[48px] px-5 flex items-center justify-center border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[48px] px-6 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'جارٍ الحفظ...' : 'حفظ بيانات الدخول'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
