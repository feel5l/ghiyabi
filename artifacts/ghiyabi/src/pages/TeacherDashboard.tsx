import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Session } from '../lib/supabase';
import { SessionCard } from '../components/SessionCard';
import { SkeletonCard } from '../components/Skeleton';

export default function TeacherDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.email) return;
    fetchSessions();
  }, [user]);

  async function fetchSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*, classes(id, name, grade_level, teacher_email)')
      .eq('date', today)
      .eq('teacher_email', user!.email!)
      .order('period');
    setLoading(false);
    if (error) {
      toast.error('حدث خطأ في تحميل الحصص');
    } else {
      setSessions((data as Session[]) || []);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المعلم';
  const todayLabel = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جارٍ التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-primary">غيابي</h1>
            <p className="text-xs text-muted-foreground">Ghiyabi</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">معلم</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-destructive hover:underline font-medium"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Date */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">حصصي اليوم</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد حصص اليوم</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              لم يتم إضافة أي حصص لهذا اليوم بعد. تواصل مع الإدارة للتحقق.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}

        {/* Admin link if applicable */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            مدرسة زيد بن ثابت الابتدائية — نظام غيابي
          </p>
        </div>
      </main>
    </div>
  );
}
