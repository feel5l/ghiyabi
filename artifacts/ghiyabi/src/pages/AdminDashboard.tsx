import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { KpiCard } from '../components/KpiCard';
import { SkeletonKpi, SkeletonLine } from '../components/Skeleton';

interface ClassStats {
  id: string;
  name: string;
  grade_level: string;
  total_students: number;
  absent_today: number;
  pct_absent: number;
}

interface SessionNotStarted {
  id: string;
  class_name: string;
  grade_level: string;
  subject: string;
  period: string;
}

interface TopAbsentee {
  student_id: string;
  full_name: string;
  class_name: string;
  absent_count: number;
}

interface AbsentStudent {
  student_id: string;
  session_id: string;
  student_name: string;
  class_name: string;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { notify } = useWhatsApp();
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [notStarted, setNotStarted] = useState<SessionNotStarted[]>([]);
  const [topAbsentees, setTopAbsentees] = useState<TopAbsentee[]>([]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const totalStudents = classStats.reduce((a, c) => a + c.total_students, 0);
  const totalAbsent = classStats.reduce((a, c) => a + c.absent_today, 0);

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchClassStats(), fetchNotStarted(), fetchTopAbsentees(), fetchAbsentStudents()]);
    setLoading(false);
  }

  async function fetchClassStats() {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, grade_level')
      .order('grade_level, name');

    if (!classes) return;

    const stats = await Promise.all(classes.map(async (cls) => {
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id)
        .eq('is_active', true);

      // Absent count for today
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('class_id', cls.id)
        .eq('date', dateFilter);

      const sessionIds = sessions?.map(s => s.id) || [];

      // Count UNIQUE absent students (a student absent in multiple sessions counts once)
      let absentToday = 0;
      if (sessionIds.length > 0) {
        const { data: absentLogs } = await supabase
          .from('attendance_log')
          .select('student_id')
          .in('session_id', sessionIds)
          .eq('status', 'Absent');
        const uniqueAbsent = new Set((absentLogs || []).map(l => l.student_id));
        absentToday = uniqueAbsent.size;
      }

      const total = totalStudents || 0;
      // Percentage of students absent at least once today vs total students in class
      const pct = total > 0 ? (absentToday / total) * 100 : 0;

      return {
        id: cls.id,
        name: cls.name,
        grade_level: cls.grade_level,
        total_students: total,
        absent_today: absentToday,
        pct_absent: pct,
      } as ClassStats;
    }));

    setClassStats(stats);
  }

  async function fetchNotStarted() {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, subject, period, classes(id, name, grade_level)')
      .eq('date', dateFilter);

    if (!sessions) return;

    const notStartedList: SessionNotStarted[] = [];
    for (const sess of sessions) {
      const { count } = await supabase
        .from('attendance_log')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sess.id);
      if ((count || 0) === 0) {
        const cls = sess.classes as unknown as { name: string; grade_level: string } | null;
        notStartedList.push({
          id: sess.id,
          class_name: cls?.name || '—',
          grade_level: cls?.grade_level || '',
          subject: sess.subject,
          period: sess.period,
        });
      }
    }
    setNotStarted(notStartedList);
  }

  async function fetchTopAbsentees() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .gte('date', sevenDaysAgo);

    const sessionIds = sessions?.map(s => s.id) || [];
    if (sessionIds.length === 0) { setTopAbsentees([]); return; }

    const { data: absenceLogs } = await supabase
      .from('attendance_log')
      .select('student_id, students(id, full_name, class_id, classes:class_id(name))')
      .in('session_id', sessionIds)
      .eq('status', 'Absent');

    if (!absenceLogs) return;

    // Count per student
    const countMap = new Map<string, { name: string; class_name: string; count: number }>();
    for (const log of absenceLogs) {
      const s = log.students as unknown as { full_name: string; classes?: { name: string } } | null;
      const name = s?.full_name || 'Unknown';
      const className = s?.classes?.name || '—';
      const existing = countMap.get(log.student_id) || { name, class_name: className, count: 0 };
      countMap.set(log.student_id, { ...existing, count: existing.count + 1 });
    }

    const sorted = Array.from(countMap.entries())
      .map(([id, v]) => ({ student_id: id, full_name: v.name, class_name: v.class_name, absent_count: v.count }))
      .sort((a, b) => b.absent_count - a.absent_count)
      .slice(0, 10);

    setTopAbsentees(sorted);
  }

  async function fetchAbsentStudents() {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', dateFilter);

    const sessionIds = sessions?.map(s => s.id) || [];
    if (sessionIds.length === 0) { setAbsentStudents([]); return; }

    const { data: logs } = await supabase
      .from('attendance_log')
      .select('student_id, session_id, students(full_name, class_id, classes:class_id(name))')
      .in('session_id', sessionIds)
      .eq('status', 'Absent');

    if (!logs) { setAbsentStudents([]); return; }

    const seen = new Set<string>();
    const list: AbsentStudent[] = [];
    for (const log of logs) {
      const key = `${log.student_id}-${log.session_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = log.students as unknown as { full_name: string; classes?: { name: string } } | null;
      list.push({
        student_id: log.student_id,
        session_id: log.session_id,
        student_name: s?.full_name || 'Unknown',
        class_name: s?.classes?.name || '—',
      });
    }
    setAbsentStudents(list);
  }

  const handleSendAllWhatsApp = async () => {
    for (const row of absentStudents) {
      await notify({
        studentId: row.student_id,
        sessionId: row.session_id,
        studentName: row.student_name,
      });
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  function rowColor(pct: number) {
    if (pct < 5) return 'bg-green-50';
    if (pct <= 10) return 'bg-yellow-50';
    return 'bg-red-50';
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-primary">غيابي — لوحة الإدارة</h1>
            <p className="text-xs text-muted-foreground">Ghiyabi Admin</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/students" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الطلاب
            </Link>
            <Link to="/admin/classes" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الفصول
            </Link>
            <Link to="/admin/sessions" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الحصص
            </Link>
            <button onClick={signOut} className="text-sm text-destructive hover:underline font-medium">
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Date filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">التاريخ:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonKpi /><SkeletonKpi /><SkeletonKpi />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard title="إجمالي الطلاب" value={totalStudents} icon="👥" />
            <KpiCard title="غائب اليوم" value={totalAbsent} color="red" icon="❌" />
            <KpiCard title="حصص لم تبدأ" value={notStarted.length} color="orange" icon="📋" />
          </div>
        )}

        {/* Class table */}
        <div>
          <h2 className="text-lg font-bold mb-3">إحصائيات الفصول</h2>
          <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">الفصل</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">الطلاب</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">غائب اليوم</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground" title="نسبة الطلاب الغائبين مرة واحدة على الأقل اليوم">نسبة الغياب *</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [1,2,3,4,5].map((i) => (
                        <tr key={i} className="border-b border-border">
                          {[1,2,3,4].map((j) => (
                            <td key={j} className="px-4 py-3">
                              <SkeletonLine height="h-4" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : classStats.map((cls) => (
                        <tr key={cls.id} className={`border-b border-border ${rowColor(cls.pct_absent)}`}>
                          <td className="px-4 py-3 font-medium">{cls.grade_level} — {cls.name}</td>
                          <td className="px-4 py-3 text-center">{cls.total_students}</td>
                          <td className="px-4 py-3 text-center text-red-700 font-semibold">{cls.absent_today}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${cls.pct_absent < 5 ? 'bg-green-100 text-green-700'
                                : cls.pct_absent <= 10 ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'}`}>
                              {cls.pct_absent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">* نسبة الطلاب الغائبين (مرة واحدة على الأقل) من إجمالي طلاب الفصل</p>
        </div>

        {/* Absent students today */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">الطلاب الغائبون اليوم</h2>
            {absentStudents.length > 0 && (
              <button
                type="button"
                onClick={handleSendAllWhatsApp}
                className="mb-2 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
              >
                إرسال واتساب لجميع الغائبين اليوم
              </button>
            )}
          </div>
          <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
            {absentStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                ✅ لا يوجد غياب اليوم
              </div>
            ) : absentStudents.map((row) => (
              <div key={`${row.student_id}-${row.session_id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{row.student_name}</p>
                  <p className="text-xs text-muted-foreground">{row.class_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    notify({
                      studentId: row.student_id,
                      sessionId: row.session_id,
                      studentName: row.student_name,
                    })
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
                  aria-label={`إرسال واتساب لولي أمر ${row.student_name}`}
                >
                  <span className="text-lg">🟢</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions not started */}
          <div>
            <h2 className="text-lg font-bold mb-3">حصص لم تبدأ بعد</h2>
            <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
              {notStarted.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  ✅ جميع الحصص بدأت
                </div>
              ) : notStarted.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{sess.subject}</p>
                    <p className="text-xs text-muted-foreground">{sess.grade_level} — {sess.class_name} — {sess.period}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">لم تبدأ</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top absentees */}
          <div>
            <h2 className="text-lg font-bold mb-3">أكثر الطلاب غياباً (آخر 7 أيام)</h2>
            <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
              {topAbsentees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  ✅ لا يوجد غياب متكرر
                </div>
              ) : topAbsentees.map((student, idx) => (
                <div key={student.student_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-muted-foreground text-sm w-5">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">{student.class_name}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">{student.absent_count} مرات</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nav links mobile */}
        <div className="flex gap-4 sm:hidden pt-4 border-t border-border">
          <Link to="/admin/students" className="flex-1 min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
            👥 الطلاب
          </Link>
          <Link to="/admin/classes" className="flex-1 min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
            🏫 الفصول
          </Link>
          <Link to="/admin/sessions" className="flex-1 min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
            📋 الحصص
          </Link>
        </div>
      </main>
    </div>
  );
}
