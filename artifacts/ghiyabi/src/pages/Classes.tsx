import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Class } from '../lib/supabase';
import { SkeletonLine } from '../components/Skeleton';

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClass, setEditClass] = useState<Class | null>(null);
  const [form, setForm] = useState({ name: '', grade_level: '', teacher_email: '' });
  const [saving, setSaving] = useState(false);

  const GRADE_OPTIONS = ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    setLoading(true);
    const { data, error } = await supabase.from('classes').select('*').order('grade_level, name');
    setLoading(false);
    if (error) toast.error('حدث خطأ في تحميل الفصول');
    else setClasses((data as Class[]) || []);
  }

  function openAdd() {
    setEditClass(null);
    setForm({ name: '', grade_level: GRADE_OPTIONS[0], teacher_email: '' });
    setShowForm(true);
  }

  function openEdit(cls: Class) {
    setEditClass(cls);
    setForm({ name: cls.name, grade_level: cls.grade_level, teacher_email: cls.teacher_email || '' });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.grade_level) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      grade_level: form.grade_level,
      teacher_email: form.teacher_email.trim() || null,
    };
    if (editClass) {
      const { error } = await supabase.from('classes').update(payload).eq('id', editClass.id);
      if (error) toast.error('حدث خطأ في التحديث');
      else { toast.success('تم تحديث الفصل'); setShowForm(false); loadClasses(); }
    } else {
      const { error } = await supabase.from('classes').insert(payload);
      if (error) toast.error('حدث خطأ في الإضافة');
      else { toast.success('تم إضافة الفصل'); setShowForm(false); loadClasses(); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع البيانات المرتبطة.')) return;
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) toast.error('لا يمكن حذف الفصل — تأكد من حذف الطلاب والحصص أولاً');
    else { toast.success('تم حذف الفصل'); loadClasses(); }
  }

  // Group by grade
  const grouped = GRADE_OPTIONS.map(grade => ({
    grade,
    classes: classes.filter(c => c.grade_level === grade),
  })).filter(g => g.classes.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="text-primary hover:underline text-sm font-medium">← لوحة الإدارة</Link>
          <h1 className="flex-1 text-lg font-bold">إدارة الفصول</h1>
          <button onClick={openAdd} className="min-h-[40px] px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
            + فصل جديد
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-5">{editClass ? 'تعديل الفصل' : 'إضافة فصل جديد'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">اسم الفصل *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: 3-A"
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">المرحلة *</label>
                  <select
                    value={form.grade_level}
                    onChange={(e) => setForm(f => ({ ...f, grade_level: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">بريد المعلم</label>
                  <input
                    type="email"
                    value={form.teacher_email}
                    onChange={(e) => setForm(f => ({ ...f, teacher_email: e.target.value }))}
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 min-h-[48px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 disabled:opacity-50">
                    {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 min-h-[48px] border border-border rounded-xl font-medium hover:bg-muted">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <SkeletonLine key={i} height="h-12" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ grade, classes: gradeClasses }) => (
              <div key={grade}>
                <h2 className="text-base font-bold mb-2 text-muted-foreground">
                  {grade === 'Grade 3' ? 'الصف الثالث'
                    : grade === 'Grade 4' ? 'الصف الرابع'
                    : grade === 'Grade 5' ? 'الصف الخامس'
                    : 'الصف السادس'}
                </h2>
                <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
                  {gradeClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-semibold">{grade} — {cls.name}</p>
                        {cls.teacher_email && (
                          <p className="text-xs text-muted-foreground mt-0.5">{cls.teacher_email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(cls)} className="text-primary hover:underline text-xs font-medium">تعديل</button>
                        <button onClick={() => handleDelete(cls.id)} className="text-destructive hover:underline text-xs font-medium">حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && classes.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <div className="text-4xl mb-3">🏫</div>
            <h3 className="font-semibold mb-1">لا توجد فصول بعد</h3>
            <p className="text-sm text-muted-foreground">أضف الفصول الدراسية لمدرستك</p>
            <button onClick={openAdd} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">
              + إضافة فصل
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
