import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Class, Session, Teacher } from '../lib/supabase';
import { SkeletonLine } from '../components/Skeleton';
import BulkImportModal, { type ImportResult } from '../components/BulkImportModal';

const PERIOD_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

const PERIOD_LABELS: Record<string, string> = {
  P1: 'الحصة الأولى',
  P2: 'الحصة الثانية',
  P3: 'الحصة الثالثة',
  P4: 'الحصة الرابعة',
  P5: 'الحصة الخامسة',
  P6: 'الحصة السادسة',
};

interface SessionWithClass extends Session {
  classes?: Class;
}

interface FormState {
  class_id: string;
  teacher_phone: string;
  subject: string;
  period: string;
  date: string;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionWithClass[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editSession, setEditSession] = useState<SessionWithClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState(today());

  const emptyForm = (): FormState => ({
    class_id: classes[0]?.id || '',
    teacher_phone: '',
    subject: '',
    period: 'P1',
    date: today(),
  });

  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [dateFilter]);

  async function loadClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('grade_level, name');
    if (error) toast.error('حدث خطأ في تحميل الفصول');
    else {
      const list = (data as Class[]) || [];
      setClasses(list);
    }
  }

  async function loadTeachers() {
    const { data } = await supabase
      .from('teachers')
      .select('phone, name, is_active')
      .eq('is_active', true)
      .order('name');
    setTeachers((data as Teacher[]) || []);
  }

  async function loadSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*, classes(id, name, grade_level, teacher_phone)')
      .eq('date', dateFilter)
      .order('period');
    setLoading(false);
    if (error) toast.error('حدث خطأ في تحميل الحصص');
    else setSessions((data as SessionWithClass[]) || []);
  }

  function openAdd() {
    setEditSession(null);
    const defaultClass = classes[0]?.id || '';
    const defaultPhone = classes[0]?.teacher_phone || '';
    setForm({
      class_id: defaultClass,
      teacher_phone: defaultPhone,
      subject: '',
      period: 'P1',
      date: dateFilter,
    });
    setShowForm(true);
  }

  function openEdit(sess: SessionWithClass) {
    setEditSession(sess);
    setForm({
      class_id: sess.class_id || '',
      teacher_phone: sess.teacher_phone,
      subject: sess.subject,
      period: sess.period,
      date: sess.date,
    });
    setShowForm(true);
  }

  function handleClassChange(classId: string) {
    const cls = classes.find(c => c.id === classId);
    setForm(f => ({
      ...f,
      class_id: classId,
      teacher_phone: cls?.teacher_phone || f.teacher_phone,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const teacherPhone = form.teacher_phone.trim();
    if (!form.class_id || !teacherPhone || !form.subject.trim() || !form.period || !form.date) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (!teachers.some(t => t.phone === teacherPhone)) {
      toast.error('يرجى اختيار معلم من القائمة');
      return;
    }
    setSaving(true);
    const payload = {
      class_id: form.class_id,
      teacher_phone: teacherPhone,
      subject: form.subject.trim(),
      period: form.period,
      date: form.date,
    };
    if (editSession) {
      const { error } = await supabase.from('sessions').update(payload).eq('id', editSession.id);
      if (error) toast.error('حدث خطأ في التحديث');
      else { toast.success('تم تحديث الحصة'); setShowForm(false); loadSessions(); }
    } else {
      const { error } = await supabase.from('sessions').insert(payload);
      if (error) toast.error('حدث خطأ في الإضافة');
      else { toast.success('تم إضافة الحصة'); setShowForm(false); loadSessions(); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟ سيتم حذف سجلات الحضور المرتبطة بها.')) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) toast.error('حدث خطأ في الحذف');
    else { toast.success('تم حذف الحصة'); loadSessions(); }
  }

  async function handleBulkImport(rows: string[][]): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const date = row[0]?.trim();
      const classRef = row[1]?.trim() || '';
      const teacher_phone = row[2]?.trim();
      const subject = row[3]?.trim();
      const period = row[4]?.trim().toUpperCase();

      if (!date) { errors.push(`السطر ${i + 1}: التاريخ مطلوب (YYYY-MM-DD)`); continue; }
      if (!teacher_phone) { errors.push(`السطر ${i + 1}: رقم هاتف المعلم مطلوب`); continue; }
      if (!subject) { errors.push(`السطر ${i + 1}: المادة مطلوبة`); continue; }
      if (!period || !PERIOD_OPTIONS.includes(period)) {
        errors.push(`السطر ${i + 1}: الحصة "${row[4]}" غير صحيحة — استخدم P1 .. P6`);
        continue;
      }
      if (!teachers.some(t => t.phone === teacher_phone)) {
        errors.push(`السطر ${i + 1}: المعلم برقم "${teacher_phone}" غير موجود في قائمة المعلمين المفعّلين`);
        continue;
      }

      // Resolve class_id
      let class_id: string | null = null;
      if (classRef) {
        const match = classes.find(
          (c) =>
            c.name.toLowerCase() === classRef.toLowerCase() ||
            `${c.grade_level} — ${c.name}`.toLowerCase() === classRef.toLowerCase() ||
            `${c.grade_level} - ${c.name}`.toLowerCase() === classRef.toLowerCase()
        );
        if (!match) {
          errors.push(`السطر ${i + 1}: الفصل "${classRef}" غير موجود`);
          continue;
        }
        class_id = match.id;
      }

      const { error } = await supabase.from('sessions').insert({
        date,
        class_id,
        teacher_phone,
        subject,
        period,
      });
      if (error) errors.push(`السطر ${i + 1}: ${error.message}`);
      else imported++;
    }

    if (imported > 0) {
      toast.success(`تم استيراد ${imported} حصة`);
      loadSessions();
    }
    return { imported, errors };
  }

  // Group sessions by class for display
  const grouped = classes
    .map(cls => ({
      cls,
      sessions: sessions.filter(s => s.class_id === cls.id),
    }))
    .filter(g => g.sessions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="text-primary hover:underline text-sm font-medium">← لوحة الإدارة</Link>
          <h1 className="flex-1 text-lg font-bold">إدارة الحصص</h1>
          <button
            onClick={() => setShowImport(true)}
            className="min-h-[40px] px-3 border border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary/5"
          >
            📥 استيراد
          </button>
          <button
            onClick={openAdd}
            disabled={classes.length === 0}
            title={classes.length === 0 ? 'أضف فصلاً دراسياً أولاً' : undefined}
            className="min-h-[40px] px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + حصة جديدة
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Bulk Import Modal */}
        {showImport && (
          <BulkImportModal
            title="استيراد حصص دراسية"
            columns={['التاريخ', 'الفصل', 'هاتف المعلم', 'المادة', 'الحصة']}
            example={'2025-09-01,Grade 3 — 3-A,0501000001,رياضيات,P1\n2025-09-01,Grade 4 — 4-B,0501000002,علوم,P2\n2025-09-02,Grade 3 — 3-A,0501000001,لغة عربية,P3'}
            templateFilename="sessions_template.csv"
            onImport={handleBulkImport}
            onClose={() => setShowImport(false)}
          />
        )}

        {/* No classes banner */}
        {!loading && classes.length === 0 && (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-yellow-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium text-yellow-800">لا توجد فصول دراسية بعد</p>
              <p className="text-yellow-700 mt-0.5">
                يجب إضافة الفصول أولاً قبل جدولة الحصص.{' '}
                <Link to="/admin/classes" className="underline font-semibold">إدارة الفصول ←</Link>
              </p>
            </div>
          </div>
        )}

        {/* Date filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">التاريخ:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">({sessions.length} حصة)</span>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-5">
                {editSession ? 'تعديل الحصة' : 'إضافة حصة جديدة'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">التاريخ *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
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
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.grade_level} — {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher phone */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">المعلم *</label>
                  <select
                    value={form.teacher_phone}
                    onChange={(e) => setForm(f => ({ ...f, teacher_phone: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- اختر المعلم --</option>
                    {teachers.map(t => (
                      <option key={t.phone} value={t.phone}>
                        {t.name} ({t.phone})
                      </option>
                    ))}
                  </select>
                  {teachers.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      لا يوجد معلمون مفعّلون — أضف معلمين من{' '}
                      <Link to="/admin/teachers" className="underline font-semibold">إدارة المعلمين</Link>
                    </p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">المادة *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="مثال: رياضيات"
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">الحصة *</label>
                  <select
                    value={form.period}
                    onChange={(e) => setForm(f => ({ ...f, period: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PERIOD_OPTIONS.map(p => (
                      <option key={p} value={p}>{p} — {PERIOD_LABELS[p]}</option>
                    ))}
                  </select>
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

        {/* Sessions list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <SkeletonLine key={i} height="h-12" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-semibold mb-2">لا توجد حصص في هذا اليوم</h3>
            <p className="text-sm text-muted-foreground mb-4">أضف حصصاً لتظهر للمعلمين في لوحة التحكم</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={openAdd}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
              >
                + إضافة حصة
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="px-5 py-2.5 border border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5"
              >
                📥 استيراد من قائمة
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ cls, sessions: classSessions }) => (
              <div key={cls.id}>
                <h2 className="text-base font-bold mb-2 text-muted-foreground">
                  {cls.grade_level} — {cls.name}
                </h2>
                <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">الحصة</th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">المادة</th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground hidden sm:table-cell">المعلم</th>
                          <th className="px-4 py-3 text-center font-semibold text-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classSessions.map(sess => (
                          <tr key={sess.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                                  {sess.period}
                                </span>
                                <span className="text-muted-foreground hidden sm:inline">
                                  {PERIOD_LABELS[sess.period]}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">{sess.subject}</td>
                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                              {teachers.find(t => t.phone === sess.teacher_phone)?.name || sess.teacher_phone}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => openEdit(sess)}
                                  className="text-primary hover:underline text-xs font-medium"
                                >
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleDelete(sess.id)}
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
              </div>
            ))}

            {/* Sessions without a matching class (edge case) */}
            {(() => {
              const classIds = new Set(classes.map(c => c.id));
              const orphaned = sessions.filter(s => !s.class_id || !classIds.has(s.class_id));
              if (orphaned.length === 0) return null;
              return (
                <div>
                  <h2 className="text-base font-bold mb-2 text-muted-foreground">حصص بدون فصل محدد</h2>
                  <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
                    {orphaned.map(sess => (
                      <div key={sess.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold ml-2">
                            {sess.period}
                          </span>
                          <span className="font-medium">{sess.subject}</span>
                          <span className="text-xs text-muted-foreground mr-2">{teachers.find(t => t.phone === sess.teacher_phone)?.name || sess.teacher_phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(sess)} className="text-primary hover:underline text-xs font-medium">تعديل</button>
                          <button onClick={() => handleDelete(sess.id)} className="text-destructive hover:underline text-xs font-medium">حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
