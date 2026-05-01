import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Class, Teacher } from '../lib/supabase';
import { formatSaudiPhone, normaliseSaudiPhone } from '../lib/teacherAuth';
import { SkeletonLine } from '../components/Skeleton';

interface TeacherWithClasses extends Teacher {
  classes?: Pick<Class, 'id' | 'name' | 'grade_level'>[];
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<TeacherWithClasses[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', class_ids: [] as string[] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  async function loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('id, name, grade_level, teacher_id')
      .order('grade_level, name');
    setClasses((data as Class[]) || []);
  }

  async function loadTeachers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('teachers')
      .select('id, full_name, phone, is_active, classes:classes(id, name, grade_level)')
      .order('full_name');
    setLoading(false);
    if (error) {
      toast.error('حدث خطأ في تحميل المعلمين');
      return;
    }
    setTeachers((data as TeacherWithClasses[]) || []);
  }

  function openAdd() {
    setForm({ full_name: '', phone: '', class_ids: [] });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const fullName = form.full_name.trim();
    if (!fullName) {
      toast.error('يرجى إدخال اسم المعلم');
      return;
    }
    const e164 = normaliseSaudiPhone(form.phone);
    if (!e164) {
      toast.error('رقم الجوال غير صالح');
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSaving(false);
      toast.error('انتهت الجلسة. سجّل الدخول مجدداً.');
      return;
    }

    let response: Response;
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-teacher`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            phone: e164,
            class_ids: form.class_ids,
          }),
        },
      );
    } catch {
      setSaving(false);
      toast.error('تعذّر الاتصال بالخادم');
      return;
    }

    setSaving(false);

    if (response.status === 409) {
      toast.error('هذا الرقم مسجَّل لمعلم آخر');
      return;
    }
    if (!response.ok) {
      toast.error('حدث خطأ في إضافة المعلم');
      return;
    }
    toast.success('تم إضافة المعلم');
    setShowForm(false);
    loadTeachers();
    loadClasses();
  }

  async function toggleActive(t: TeacherWithClasses) {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: !t.is_active })
      .eq('id', t.id);
    if (error) toast.error('حدث خطأ');
    else loadTeachers();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="text-primary hover:underline text-sm font-medium">
            ← لوحة الإدارة
          </Link>
          <h1 className="flex-1 text-lg font-bold">إدارة المعلمين</h1>
          <button
            onClick={openAdd}
            className="min-h-[40px] px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          >
            + إضافة معلم
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-5">إضافة معلم جديد</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor="t-full-name" className="block text-sm font-medium mb-1.5">
                    الاسم الكامل *
                  </label>
                  <input
                    id="t-full-name"
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="t-phone" className="block text-sm font-medium mb-1.5">
                    رقم الجوال *
                  </label>
                  <input
                    id="t-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    required
                    dir="ltr"
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">رقم سعودي يبدأ بـ 5</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الفصول التي يدرّسها</label>
                  <div className="border border-input rounded-xl p-2 max-h-40 overflow-y-auto space-y-1 bg-background">
                    {classes.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">
                        لا توجد فصول. أضِف الفصول أولاً.
                      </p>
                    ) : (
                      classes.map((cls) => {
                        const checked = form.class_ids.includes(cls.id);
                        return (
                          <label
                            key={cls.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  class_ids: e.target.checked
                                    ? [...f.class_ids, cls.id]
                                    : f.class_ids.filter((id) => id !== cls.id),
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <span>
                              {cls.grade_level} — {cls.name}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
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

        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold">الجوال</th>
                  <th className="px-4 py-3 text-right font-semibold hidden sm:table-cell">
                    الفصول
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-border">
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-4 py-3">
                          <SkeletonLine height="h-4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : teachers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground">
                      لا يوجد معلمون. ابدأ بإضافة معلم جديد.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{t.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {formatSaudiPhone(t.phone)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                        {(t.classes ?? []).length === 0
                          ? '—'
                          : (t.classes ?? [])
                              .map((c) => `${c.grade_level} ${c.name}`)
                              .join('، ')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(t)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                            t.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {t.is_active ? 'نشط' : 'معطّل'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          إجمالي: {teachers.length} معلم
        </p>
      </main>
    </div>
  );
}
