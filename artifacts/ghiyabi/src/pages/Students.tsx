import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Student, Class } from '../lib/supabase';
import { SkeletonLine } from '../components/Skeleton';

interface StudentWithClass extends Student {
  classes?: Class;
}

export default function Students() {
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentWithClass | null>(null);
  const [form, setForm] = useState({ full_name: '', class_id: '', parent_email: '', parent_phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
    loadStudents();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [filterClass]);

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('*').order('grade_level, name');
    setClasses((data as Class[]) || []);
  }

  async function loadStudents() {
    setLoading(true);
    let query = supabase.from('students').select('*, classes(id, name, grade_level, teacher_phone)').order('full_name');
    if (filterClass) query = query.eq('class_id', filterClass);
    const { data, error } = await query;
    setLoading(false);
    if (error) toast.error('حدث خطأ في تحميل الطلاب');
    else setStudents((data as StudentWithClass[]) || []);
  }

  function openAdd() {
    setEditStudent(null);
    setForm({ full_name: '', class_id: classes[0]?.id || '', parent_email: '', parent_phone: '' });
    setShowForm(true);
  }

  function openEdit(s: StudentWithClass) {
    setEditStudent(s);
    setForm({ full_name: s.full_name, class_id: s.class_id || '', parent_email: s.parent_email || '', parent_phone: s.parent_phone || '' });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('يرجى إدخال اسم الطالب'); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      class_id: form.class_id || null,
      parent_email: form.parent_email.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
    };
    if (editStudent) {
      const { error } = await supabase.from('students').update(payload).eq('id', editStudent.id);
      if (error) toast.error('حدث خطأ في التحديث');
      else { toast.success('تم تحديث بيانات الطالب'); setShowForm(false); loadStudents(); }
    } else {
      const { error } = await supabase.from('students').insert(payload);
      if (error) toast.error('حدث خطأ في الإضافة');
      else { toast.success('تم إضافة الطالب'); setShowForm(false); loadStudents(); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) toast.error('حدث خطأ في الحذف');
    else { toast.success('تم حذف الطالب'); loadStudents(); }
  }

  async function toggleActive(s: StudentWithClass) {
    const { error } = await supabase.from('students').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) toast.error('حدث خطأ');
    else loadStudents();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="text-primary hover:underline text-sm font-medium">← لوحة الإدارة</Link>
          <h1 className="flex-1 text-lg font-bold">إدارة الطلاب</h1>
          <button onClick={openAdd} className="min-h-[40px] px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
            + إضافة طالب
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium">تصفية حسب الفصل:</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-9 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">جميع الفصول</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.grade_level} — {cls.name}</option>
            ))}
          </select>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-5">{editStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الفصل</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm(f => ({ ...f, class_id: e.target.value }))}
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— بدون فصل —</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.grade_level} — {cls.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">بريد ولي الأمر</label>
                  <input
                    type="email"
                    value={form.parent_email}
                    onChange={(e) => setForm(f => ({ ...f, parent_email: e.target.value }))}
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">رقم هاتف ولي الأمر</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => setForm(f => ({ ...f, parent_phone: e.target.value }))}
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

        {/* Table */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold hidden sm:table-cell">الفصل</th>
                  <th className="px-4 py-3 text-center font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1,2,3,4,5].map((i) => (
                      <tr key={i} className="border-b border-border">
                        {[1,2,3,4].map((j) => <td key={j} className="px-4 py-3"><SkeletonLine height="h-4" /></td>)}
                      </tr>
                    ))
                  : students.length === 0
                  ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-muted-foreground">
                          لا يوجد طلاب. ابدأ بإضافة طالب جديد.
                        </td>
                      </tr>
                    )
                  : students.map((s) => (
                      <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{s.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {s.classes ? `${s.classes.grade_level} — ${s.classes.name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleActive(s)} className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.is_active ? 'نشط' : 'غير نشط'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEdit(s)} className="text-primary hover:underline text-xs font-medium">تعديل</button>
                            <button onClick={() => handleDelete(s.id)} className="text-destructive hover:underline text-xs font-medium">حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          إجمالي: {students.length} طالب
        </p>
      </main>
    </div>
  );
}
