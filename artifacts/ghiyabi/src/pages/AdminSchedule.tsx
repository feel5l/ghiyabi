import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Class, Teacher, WeeklySchedule } from '../lib/supabase';
import { SkeletonLine } from '../components/Skeleton';

const DAY_LABELS: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};

const SCHOOL_DAYS = [0, 1, 2, 3, 4];

const PERIOD_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

const PERIOD_LABELS: Record<string, string> = {
  P1: 'الحصة الأولى',
  P2: 'الحصة الثانية',
  P3: 'الحصة الثالثة',
  P4: 'الحصة الرابعة',
  P5: 'الحصة الخامسة',
  P6: 'الحصة السادسة',
};

interface ScheduleEntry extends WeeklySchedule {
  classes?: Class;
}

interface FormState {
  day_of_week: number;
  period: string;
  class_id: string;
  teacher_phone: string;
  subject: string;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentWeekSunday(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

export default function AdminSchedule() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const [applyWeekDate, setApplyWeekDate] = useState(currentWeekSunday());
  const [applying, setApplying] = useState(false);

  const [form, setForm] = useState<FormState>({
    day_of_week: 0,
    period: 'P1',
    class_id: '',
    teacher_phone: '',
    subject: '',
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadSchedule(), loadClasses(), loadTeachers()]);
    setLoading(false);
  }

  async function loadSchedule() {
    const { data, error } = await supabase
      .from('weekly_schedule')
      .select('*, classes(id, name, grade_level, teacher_phone)')
      .order('day_of_week')
      .order('period');
    if (error) toast.error('حدث خطأ في تحميل الجدول');
    else setSchedule((data as ScheduleEntry[]) || []);
  }

  async function loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .order('grade_level, name');
    setClasses((data as Class[]) || []);
  }

  async function loadTeachers() {
    const { data } = await supabase
      .from('teachers')
      .select('phone, name, is_active')
      .eq('is_active', true)
      .order('name');
    setTeachers((data as Teacher[]) || []);
  }

  function openAdd(day = 0) {
    setEditEntry(null);
    setForm({
      day_of_week: day,
      period: 'P1',
      class_id: classes[0]?.id || '',
      teacher_phone: classes[0]?.teacher_phone || '',
      subject: '',
    });
    setShowForm(true);
  }

  function openEdit(entry: ScheduleEntry) {
    setEditEntry(entry);
    setForm({
      day_of_week: entry.day_of_week,
      period: entry.period,
      class_id: entry.class_id || '',
      teacher_phone: entry.teacher_phone,
      subject: entry.subject,
    });
    setShowForm(true);
  }

  function handleClassChange(classId: string) {
    const cls = classes.find((c) => c.id === classId);
    setForm((f) => ({
      ...f,
      class_id: classId,
      teacher_phone: cls?.teacher_phone || f.teacher_phone,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.class_id || !form.teacher_phone || !form.subject.trim() || !form.period) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    setSaving(true);
    const payload = {
      day_of_week: form.day_of_week,
      period: form.period,
      class_id: form.class_id,
      teacher_phone: form.teacher_phone,
      subject: form.subject.trim(),
    };
    if (editEntry) {
      const { error } = await supabase
        .from('weekly_schedule')
        .update(payload)
        .eq('id', editEntry.id);
      if (error) toast.error('حدث خطأ في التحديث');
      else { toast.success('تم تحديث الحصة'); setShowForm(false); loadSchedule(); }
    } else {
      const { error } = await supabase.from('weekly_schedule').insert(payload);
      if (error) toast.error('حدث خطأ في الإضافة');
      else { toast.success('تم إضافة الحصة للجدول'); setShowForm(false); loadSchedule(); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة من الجدول الأسبوعي؟')) return;
    const { error } = await supabase.from('weekly_schedule').delete().eq('id', id);
    if (error) toast.error('حدث خطأ في الحذف');
    else { toast.success('تم الحذف'); loadSchedule(); }
  }

  async function applyToWeek() {
    if (!applyWeekDate) { toast.error('يرجى اختيار تاريخ'); return; }
    if (schedule.length === 0) { toast.error('الجدول الأسبوعي فارغ — أضف حصصاً أولاً'); return; }

    setApplying(true);

    // Snap to the Sunday of the chosen week
    const pickedDate = parseLocalDate(applyWeekDate);
    const sunday = new Date(pickedDate);
    sunday.setDate(pickedDate.getDate() - pickedDate.getDay());

    // Build the date range for the full school week (Sun–Thu)
    const weekDates = SCHOOL_DAYS.map((d) => {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + d);
      return toDateStr(day);
    });

    // Fetch all existing sessions for this week in one query
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('date, period, class_id')
      .in('date', weekDates);

    const existingSet = new Set(
      (existingSessions || []).map((s) => `${s.date}|${s.period}|${s.class_id}`),
    );

    let inserted = 0;
    let skipped = 0;

    for (const entry of schedule) {
      // Skip template entries without a class
      if (!entry.class_id) { skipped++; continue; }

      const sessionDate = new Date(sunday);
      sessionDate.setDate(sunday.getDate() + entry.day_of_week);
      const dateStr = toDateStr(sessionDate);

      const key = `${dateStr}|${entry.period}|${entry.class_id}`;
      if (existingSet.has(key)) { skipped++; continue; }

      const { error } = await supabase.from('sessions').insert({
        date: dateStr,
        period: entry.period,
        class_id: entry.class_id,
        teacher_phone: entry.teacher_phone,
        subject: entry.subject,
      });
      if (!error) {
        inserted++;
        existingSet.add(key);
      }
    }

    setApplying(false);

    if (inserted > 0) {
      toast.success(
        `تم إنشاء ${inserted} حصة${skipped > 0 ? ` (تجاوز ${skipped} موجودة مسبقاً)` : ''}`,
      );
    } else if (skipped > 0) {
      toast.success('جميع حصص هذا الأسبوع موجودة بالفعل');
    } else {
      toast.error('لم يتم إنشاء أي حصص');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="text-primary hover:underline text-sm font-medium">
            ← لوحة الإدارة
          </Link>
          <h1 className="flex-1 text-lg font-bold">الجدول الأسبوعي الثابت</h1>
          <button
            onClick={() => openAdd()}
            disabled={classes.length === 0}
            title={classes.length === 0 ? 'أضف فصلاً دراسياً أولاً' : undefined}
            className="min-h-[40px] px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + إضافة حصة
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-blue-500 mt-0.5">ℹ️</span>
          <div>
            <p className="font-medium text-blue-800">كيفية الاستخدام</p>
            <p className="text-blue-700 mt-0.5">
              أضف حصص الجدول الدراسي المتكرر هنا مرةً واحدة، ثم اضغط "تطبيق على الأسبوع" لإنشاء
              حصص قاعدة البيانات لأي أسبوع تختاره. يمكنك بعد ذلك تعديل أي حصة فردية من{' '}
              <Link to="/admin/sessions" className="underline font-semibold">إدارة الحصص</Link>.
            </p>
          </div>
        </div>

        {/* No classes warning */}
        {!loading && classes.length === 0 && (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-yellow-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium text-yellow-800">لا توجد فصول دراسية بعد</p>
              <p className="text-yellow-700 mt-0.5">
                يجب إضافة الفصول أولاً.{' '}
                <Link to="/admin/classes" className="underline font-semibold">إدارة الفصول ←</Link>
              </p>
            </div>
          </div>
        )}

        {/* Apply to week card */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-base font-bold mb-3">📅 تطبيق الجدول على أسبوع</h2>
          <p className="text-sm text-muted-foreground mb-4">
            اختر أي يوم من الأسبوع المطلوب وسيتم إنشاء حصص كل أيام الأسبوع (الأحد–الخميس)
            تلقائياً من الجدول الثابت.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">تاريخ (أي يوم من الأسبوع)</label>
              <input
                type="date"
                value={applyWeekDate}
                onChange={(e) => setApplyWeekDate(e.target.value)}
                className="h-9 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={applyToWeek}
              disabled={applying || schedule.length === 0}
              className="min-h-[36px] px-5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {applying ? 'جارٍ الإنشاء...' : '✅ تطبيق على الأسبوع'}
            </button>
            <Link to="/admin/sessions" className="text-sm text-primary hover:underline self-center">
              عرض الحصص اليومية ←
            </Link>
          </div>
        </div>

        {/* Add/Edit form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-5">
                {editEntry ? 'تعديل حصة في الجدول' : 'إضافة حصة للجدول'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Day */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">اليوم *</label>
                  <select
                    value={form.day_of_week}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))
                    }
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SCHOOL_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {DAY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">الحصة *</label>
                  <select
                    value={form.period}
                    onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p} — {PERIOD_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">الفصل *</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- اختر الفصل --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.grade_level} — {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">المعلم *</label>
                  <select
                    value={form.teacher_phone}
                    onChange={(e) => setForm((f) => ({ ...f, teacher_phone: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- اختر المعلم --</option>
                    {teachers.map((t) => (
                      <option key={t.phone} value={t.phone}>
                        {t.name} ({t.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">المادة *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="مثال: رياضيات"
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 min-h-[48px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 min-h-[48px] border border-border rounded-xl font-medium hover:bg-muted"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Schedule grouped by day */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonLine key={i} height="h-12" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-semibold mb-2">الجدول الأسبوعي فارغ</h3>
            <p className="text-sm text-muted-foreground mb-4">
              أضف حصص الجدول المتكرر لتُطبَّق تلقائياً كل أسبوع
            </p>
            <button
              onClick={() => openAdd()}
              disabled={classes.length === 0}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              + إضافة حصة
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {SCHOOL_DAYS.map((day) => {
              const daySessions = schedule.filter((s) => s.day_of_week === day);
              return (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold text-foreground">{DAY_LABELS[day]}</h2>
                    <button
                      onClick={() => openAdd(day)}
                      className="text-primary text-sm hover:underline font-medium"
                    >
                      + إضافة حصة
                    </button>
                  </div>

                  {daySessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1 py-2">
                      لا توجد حصص مجدولة هذا اليوم
                    </p>
                  ) : (
                    <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-3 text-right font-semibold text-foreground">
                                الحصة
                              </th>
                              <th className="px-4 py-3 text-right font-semibold text-foreground">
                                الفصل
                              </th>
                              <th className="px-4 py-3 text-right font-semibold text-foreground">
                                المادة
                              </th>
                              <th className="px-4 py-3 text-right font-semibold text-foreground hidden sm:table-cell">
                                المعلم
                              </th>
                              <th className="px-4 py-3 text-center font-semibold text-foreground">
                                إجراءات
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {daySessions.map((entry) => (
                              <tr
                                key={entry.id}
                                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                                      {entry.period}
                                    </span>
                                    <span className="text-muted-foreground text-xs hidden sm:inline">
                                      {PERIOD_LABELS[entry.period]}
                                    </span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {entry.classes
                                    ? `${entry.classes.grade_level} — ${entry.classes.name}`
                                    : '—'}
                                </td>
                                <td className="px-4 py-3">{entry.subject}</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                                  {teachers.find((t) => t.phone === entry.teacher_phone)?.name ||
                                    entry.teacher_phone}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <button
                                      onClick={() => openEdit(entry)}
                                      className="text-primary hover:underline text-xs font-medium"
                                    >
                                      تعديل
                                    </button>
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      className="text-destructive hover:underline text-xs font-medium"
                                    >
                                      حذف
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
