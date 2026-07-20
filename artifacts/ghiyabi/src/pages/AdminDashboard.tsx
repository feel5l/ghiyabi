import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { exportAttendanceExcel } from '../lib/exportAttendanceExcel';
import { KpiCard } from '../components/KpiCard';
import { SkeletonKpi, SkeletonLine } from '../components/Skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../components/ui/chart';

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

interface StatusSlice {
  status: string;
  label: string;
  count: number;
  fill: string;
}

interface TrendPoint {
  date: string;
  absent: number;
}

const STATUS_META: Record<string, { label: string; fill: string }> = {
  Present: { label: 'حاضر', fill: 'var(--color-present)' },
  Absent: { label: 'غائب', fill: 'var(--color-absent)' },
  Late: { label: 'متأخر', fill: 'var(--color-late)' },
  Excused: { label: 'معذور', fill: 'var(--color-excused)' },
};

const classChartConfig = {
  pct_absent: { label: 'نسبة الغياب %', color: 'hsl(0 72% 51%)' },
} satisfies ChartConfig;

const statusChartConfig = {
  present: { label: 'حاضر', color: 'hsl(142 71% 45%)' },
  absent: { label: 'غائب', color: 'hsl(0 72% 51%)' },
  late: { label: 'متأخر', color: 'hsl(38 92% 50%)' },
  excused: { label: 'معذور', color: 'hsl(215 16% 47%)' },
} satisfies ChartConfig;

const trendChartConfig = {
  absent: { label: 'غائبون', color: 'hsl(221 83% 53%)' },
} satisfies ChartConfig;

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [notStarted, setNotStarted] = useState<SessionNotStarted[]>([]);
  const [topAbsentees, setTopAbsentees] = useState<TopAbsentee[]>([]);
  const [statusSlices, setStatusSlices] = useState<StatusSlice[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const totalStudents = classStats.reduce((a, c) => a + c.total_students, 0);
  const totalAbsent = classStats.reduce((a, c) => a + c.absent_today, 0);

  const barData = useMemo(
    () =>
      classStats.map((c) => ({
        name: c.name,
        pct_absent: Number(c.pct_absent.toFixed(1)),
      })),
    [classStats],
  );

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchClassStats(),
      fetchNotStarted(),
      fetchTopAbsentees(),
      fetchStatusDistribution(),
      fetchAbsenceTrend(),
    ]);
    setLoading(false);
  }

  async function fetchClassStats() {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, grade_level')
      .order('grade_level, name');

    if (!classes) return;

    const stats = await Promise.all(
      classes.map(async (cls) => {
        const { count: totalStudentsCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('is_active', true);

        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('class_id', cls.id)
          .eq('date', dateFilter);

        const sessionIds = sessions?.map((s) => s.id) || [];
        let absentToday = 0;
        if (sessionIds.length > 0) {
          const { data: absentLogs } = await supabase
            .from('attendance_log')
            .select('student_id')
            .in('session_id', sessionIds)
            .eq('status', 'Absent');
          absentToday = new Set((absentLogs || []).map((l) => l.student_id)).size;
        }

        const total = totalStudentsCount || 0;
        const pct = total > 0 ? (absentToday / total) * 100 : 0;

        return {
          id: cls.id,
          name: cls.name,
          grade_level: cls.grade_level,
          total_students: total,
          absent_today: absentToday,
          pct_absent: pct,
        } as ClassStats;
      }),
    );

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .gte('date', sevenDaysAgo);

    const sessionIds = sessions?.map((s) => s.id) || [];
    if (sessionIds.length === 0) {
      setTopAbsentees([]);
      return;
    }

    const { data: absenceLogs } = await supabase
      .from('attendance_log')
      .select('student_id, students(id, full_name, class_id, classes:class_id(name))')
      .in('session_id', sessionIds)
      .eq('status', 'Absent');

    if (!absenceLogs) return;

    const countMap = new Map<string, { name: string; class_name: string; count: number }>();
    for (const log of absenceLogs) {
      const s = log.students as unknown as { full_name: string; classes?: { name: string } } | null;
      const name = s?.full_name || 'Unknown';
      const className = s?.classes?.name || '—';
      const existing = countMap.get(log.student_id) || { name, class_name: className, count: 0 };
      countMap.set(log.student_id, { ...existing, count: existing.count + 1 });
    }

    setTopAbsentees(
      Array.from(countMap.entries())
        .map(([id, v]) => ({
          student_id: id,
          full_name: v.name,
          class_name: v.class_name,
          absent_count: v.count,
        }))
        .sort((a, b) => b.absent_count - a.absent_count)
        .slice(0, 10),
    );
  }

  async function fetchStatusDistribution() {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', dateFilter);
    const sessionIds = sessions?.map((s) => s.id) || [];
    if (sessionIds.length === 0) {
      setStatusSlices([]);
      return;
    }

    const { data: logs } = await supabase
      .from('attendance_log')
      .select('status')
      .in('session_id', sessionIds);

    const counts: Record<string, number> = {};
    for (const log of logs || []) {
      counts[log.status] = (counts[log.status] || 0) + 1;
    }

    setStatusSlices(
      Object.entries(STATUS_META).map(([status, meta]) => ({
        status,
        label: meta.label,
        count: counts[status] || 0,
        fill: meta.fill,
      })),
    );
  }

  async function fetchAbsenceTrend() {
    const points: TrendPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const date = d.toISOString().split('T')[0];
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('date', date);
      const sessionIds = sessions?.map((s) => s.id) || [];
      let absent = 0;
      if (sessionIds.length > 0) {
        const { data: logs } = await supabase
          .from('attendance_log')
          .select('student_id')
          .in('session_id', sessionIds)
          .eq('status', 'Absent');
        absent = new Set((logs || []).map((l) => l.student_id)).size;
      }
      points.push({ date: date.slice(5), absent });
    }
    setTrend(points);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportAttendanceExcel({
        date: dateFilter,
        classStats: classStats.map((c) => ({
          classLabel: `${c.grade_level} — ${c.name}`,
          totalStudents: c.total_students,
          absentToday: c.absent_today,
          pctAbsent: c.pct_absent,
        })),
        totalStudents,
        totalAbsent,
        sessionsNotStarted: notStarted.length,
      });
      toast.success('تم تنزيل ملف Excel');
    } catch (err) {
      console.error(err);
      toast.error('تعذّر تصدير Excel');
    } finally {
      setExporting(false);
    }
  }

  function rowColor(pct: number) {
    if (pct < 5) return 'bg-green-50';
    if (pct <= 10) return 'bg-yellow-50';
    return 'bg-red-50';
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-primary">غيابي — لوحة الإدارة</h1>
            <p className="text-xs text-muted-foreground">Ghiyabi Admin</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/teachers" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              المعلمون
            </Link>
            <Link to="/admin/students" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الطلاب
            </Link>
            <Link to="/admin/classes" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الفصول
            </Link>
            <Link to="/admin/sessions" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الحصص
            </Link>
            <Link to="/admin/schedule" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              الجدول الأسبوعي
            </Link>
            <Link to="/admin/account" className="text-sm text-primary hover:underline font-medium hidden sm:block">
              حساب المدير
            </Link>
            <button onClick={signOut} className="text-sm text-destructive hover:underline font-medium">
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-date">
              التاريخ:
            </label>
            <input
              id="admin-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="min-h-[40px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {exporting ? 'جاري التصدير…' : 'تصدير Excel عام'}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonKpi />
            <SkeletonKpi />
            <SkeletonKpi />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard title="إجمالي الطلاب" value={totalStudents} icon="👥" />
            <KpiCard title="غائب اليوم" value={totalAbsent} color="red" icon="❌" />
            <KpiCard title="حصص لم تبدأ" value={notStarted.length} color="orange" icon="📋" />
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-bold mb-3">نسب غياب الفصول</h2>
              <ChartContainer config={classChartConfig} className="h-64 w-full">
                <BarChart data={barData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} unit="%" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pct_absent" fill="var(--color-pct_absent)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-3">توزيع حالات الحضور</h2>
              <ChartContainer config={statusChartConfig} className="h-64 w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Pie data={statusSlices} dataKey="count" nameKey="label" innerRadius={50}>
                    {statusSlices.map((s) => (
                      <Cell key={s.status} fill={s.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold mb-3">اتجاه الغياب (14 يوماً)</h2>
              <ChartContainer config={trendChartConfig} className="h-64 w-full">
                <LineChart data={trend} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="var(--color-absent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        )}

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
                    <th
                      className="px-4 py-3 text-center font-semibold text-foreground"
                      title="نسبة الطلاب الغائبين مرة واحدة على الأقل اليوم"
                    >
                      نسبة الغياب *
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="border-b border-border">
                          {[1, 2, 3, 4].map((j) => (
                            <td key={j} className="px-4 py-3">
                              <SkeletonLine height="h-4" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : classStats.map((cls) => (
                        <tr key={cls.id} className={`border-b border-border ${rowColor(cls.pct_absent)}`}>
                          <td className="px-4 py-3 font-medium">
                            {cls.grade_level} — {cls.name}
                          </td>
                          <td className="px-4 py-3 text-center">{cls.total_students}</td>
                          <td className="px-4 py-3 text-center text-red-700 font-semibold">
                            {cls.absent_today}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${
                                cls.pct_absent < 5
                                  ? 'bg-green-100 text-green-700'
                                  : cls.pct_absent <= 10
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {cls.pct_absent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            * نسبة الطلاب الغائبين (مرة واحدة على الأقل) من إجمالي طلاب الفصل
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-bold mb-3">حصص لم تبدأ بعد</h2>
            <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
              {notStarted.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  ✅ جميع الحصص بدأت
                </div>
              ) : (
                notStarted.map((sess) => (
                  <div key={sess.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{sess.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {sess.grade_level} — {sess.class_name} — {sess.period}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      لم تبدأ
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3">أكثر الطلاب غياباً (آخر 7 أيام)</h2>
            <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
              {topAbsentees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  ✅ لا يوجد غياب متكرر
                </div>
              ) : (
                topAbsentees.map((student, idx) => (
                  <div key={student.student_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-muted-foreground text-sm w-5">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.class_name}</p>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      {student.absent_count} مرات
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:hidden pt-4 border-t border-border">
          <Link
            to="/admin/teachers"
            className="min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            👩‍🏫 المعلمون
          </Link>
          <Link
            to="/admin/students"
            className="min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            👥 الطلاب
          </Link>
          <Link
            to="/admin/classes"
            className="min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            🏫 الفصول
          </Link>
          <Link
            to="/admin/sessions"
            className="min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            📋 الحصص
          </Link>
          <Link
            to="/admin/schedule"
            className="min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            🗓️ الجدول الأسبوعي
          </Link>
          <Link
            to="/admin/account"
            className="min-h-[48px] flex items-center justify-center bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            ⚙️ الحساب
          </Link>
        </div>
      </main>
    </div>
  );
}
