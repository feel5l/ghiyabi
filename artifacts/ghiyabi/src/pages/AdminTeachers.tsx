import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Teacher } from '../lib/supabase';
import { SkeletonLine } from '../components/Skeleton';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTeachers(); }, []);

  async function loadTeachers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('name');
    setLoading(false);
    if (error) toast.error('حدث خطأ في تحميل المعلمين');
    else setTeachers((data as Teacher[]) || []);
  }

  function openAdd() {
    setEditTeacher(null);
    setForm({ phone: '', name: '', is_active: true });
    setShowForm(true);
  }

  function openEdit(t: Teacher) {
    setEditTeacher(t);
    setForm({ phone: t.phone, name: t.name, is_active: t.is_active });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const phone = form.phone.trim();
    const name = form.name.trim();
    if (!phone || !name) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    if (editTeacher) {
      const { error } = await supabase
        .from('teachers')
        .update({ name, is_active: form.is_active })
        .eq('phone', editTeacher.phone);
      if (error) toast.error('حدث خطأ في التحديث');
      else { toast.success('تم تحديث بيانات المعلم'); setShowForm(false); loadTeachers(); }
    } else {
      const { error } = await supabase
        .from('teachers')
        .insert({ phone, name, is_active: form.is_active });
      if (error) {
        if (error.code === '23505') toast.error('رقم الهاتف مسجّل مسبقاً');
        else toast.error('حدث خطأ في الإضافة');
      } else {
        toast.success('تم إضافة المعلم');
        setShowForm(false);
        loadTeachers();
      }
    }
    setSaving(false);
  }

  async function handleToggleActive(t: Teacher) {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: !t.is_active })
      .eq('phone', t.phone);
    if (error) toast.error('حدث خطأ في تحديث الحالة');
    else {
      toast.success(t.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
      loadTeachers();
    }
  }

  async function handleDelete(phone: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المعلم؟')) return;
    const { error } = await supabase.from('teachers').delete().eq('phone', phone);
    if (error) toast.error('حدث خطأ في الحذف');
    else { toast.success('تم حذف المعلم'); loadTeachers(); }
  }

  const activeCount = teachers.filter(t => t.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="text-primary hover:underline text-sm font-medium">← لوحة الإدارة</Link>
          <h1 className="flex-1 text-lg font-bold">إدارة المعلمين</h1>
          <button
            onClick={openAdd}
            className="min-h-[40px] px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          >
            + معلم جديد
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm mb-6">
          <span className="text-blue-500 mt-0.5">ℹ️</span>
          <p className="text-blue-800">
            يدخل المعلم إلى النظام بكتابة رقم هاتفه فقط. أضف رقمه هنا وفعّل الحساب ليتمكن من الدخول.
          </p>
        </div>

        {/* Summary */}
        {!loading && teachers.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {activeCount} معلم مفعّل من إجمالي {teachers.length}
          </p>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-5">
                {editTeacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">الاسم *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="اسم المعلم"
                    required
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">رقم الهاتف *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="05XXXXXXXX"
                    required
                    dir="ltr"
                    disabled={!!editTeacher}
                    className="w-full h-11 px-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed tracking-widest"
                  />
                  {editTeacher && (
                    <p className="text-xs text-muted-foreground mt-1">لا يمكن تغيير رقم الهاتف</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    تفعيل الحساب (يسمح للمعلم بالدخول)
                  </label>
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

        {/* Teachers list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <SkeletonLine key={i} height="h-14" />)}
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <div className="text-4xl mb-3">👩‍🏫</div>
            <h3 className="font-semibold mb-1">لا يوجد معلمون بعد</h3>
            <p className="text-sm text-muted-foreground mb-4">أضف أرقام هواتف المعلمين ليتمكنوا من الدخول</p>
            <button
              onClick={openAdd}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
            >
              + إضافة معلم
            </button>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl shadow-sm divide-y divide-border">
            {teachers.map((t) => (
              <div key={t.phone} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{t.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(t)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                      t.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {t.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(t.phone)}
                    className="text-destructive hover:underline text-xs font-medium"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
