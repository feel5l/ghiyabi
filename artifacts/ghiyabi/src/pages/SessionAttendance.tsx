import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { useWhatsApp } from '../hooks/useWhatsApp';
import type { Session, Student, AttendanceLog } from '../lib/supabase';
import { AttendanceRow } from '../components/AttendanceRow';
import { SkeletonRow } from '../components/Skeleton';

const PERIOD_LABELS: Record<string, string> = {
  P1: 'الحصة الأولى',
  P2: 'الحصة الثانية',
  P3: 'الحصة الثالثة',
  P4: 'الحصة الرابعة',
  P5: 'الحصة الخامسة',
  P6: 'الحصة السادسة',
};

export default function SessionAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [whatsAppSentIds, setWhatsAppSentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const { notify, isSending } = useWhatsApp();

  const handleWhatsApp = useCallback(
    async (studentId: string, sessionId: string, name: string) => {
      const result = await notify(studentId, sessionId, name);
      if (result.ok && !result.skipped) {
        setWhatsAppSentIds((prev) => new Set(prev).add(studentId));
      }
    },
    [notify],
  );

  useEffect(() => {
    if (id) loadSession();
  }, [id]);

  async function loadSession() {
    setLoading(true);
    // Load session with class info
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*, classes(id, name, grade_level, teacher_email)')
      .eq('id', id)
      .single();

    if (sessionError || !sessionData) {
      toast.error('لم يتم العثور على الحصة');
      navigate('/teacher');
      return;
    }

    const sess = sessionData as Session;
    setSession(sess);

    // Load active students in this class
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', sess.class_id)
      .eq('is_active', true)
      .order('full_name');

    const studentList = (studentData as Student[]) || [];
    setStudents(studentList);

    // Load existing attendance logs
    const { data: logData } = await supabase
      .from('attendance_log')
      .select('*')
      .eq('session_id', id);

    const existingLogs = (logData as AttendanceLog[]) || [];

    // Find students who don't have an attendance log yet (handles newly added students)
    const loggedStudentIds = new Set(existingLogs.map((l) => l.student_id));
    const unloggedStudents = studentList.filter((s) => !loggedStudentIds.has(s.id));

    if (unloggedStudents.length > 0) {
      // Initialize only the missing students as Present
      await initializeAttendance(id!, unloggedStudents, existingLogs);
    } else {
      setLogs(existingLogs);
    }

    setLoading(false);
  }

  async function initializeAttendance(
    sessionId: string,
    unloggedStudents: Student[],
    existingLogs: AttendanceLog[],
  ) {
    setInitializing(true);
    const rows = unloggedStudents.map((s) => ({
      student_id: s.id,
      session_id: sessionId,
      status: 'Present' as const,
    }));

    const { data, error } = await supabase
      .from('attendance_log')
      .insert(rows)
      .select();

    setInitializing(false);
    if (error) {
      toast.error('حدث خطأ في تهيئة سجل الحضور');
      setLogs(existingLogs);
    } else {
      const newLogs = (data as AttendanceLog[]) || [];
      setLogs([...existingLogs, ...newLogs]);
      if (existingLogs.length === 0) {
        toast.success('تم تهيئة سجل الحضور — جميع الطلاب حاضرون افتراضياً');
      }
    }
  }

  // Map log by student_id for quick lookup
  const logMap = new Map(logs.map((l) => [l.student_id, l]));

  const presentCount = logs.filter((l) => l.status === 'Present').length;
  const absentCount = logs.filter((l) => l.status === 'Absent').length;
  const lateCount = logs.filter((l) => l.status === 'Late').length;
  const excusedCount = logs.filter((l) => l.status === 'Excused').length;

  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="h-6 w-32 skeleton rounded" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {[1,2,3,4,5].map((i) => <SkeletonRow key={i} />)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/teacher" className="text-primary hover:underline text-sm font-medium">
            ← رجوع
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{session?.subject}</h1>
            <p className="text-xs text-muted-foreground">
              {session?.classes?.grade_level} — فصل {session?.classes?.name} — {PERIOD_LABELS[session?.period || ''] || session?.period}
            </p>
          </div>
          <div className="text-left text-xs text-muted-foreground">
            {session?.date && new Date(session.date).toLocaleDateString('ar-SA', {
              day: 'numeric', month: 'long',
            })}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'حاضر', count: presentCount, cls: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'غائب', count: absentCount, cls: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'متأخر', count: lateCount, cls: 'bg-orange-50 border-orange-200 text-orange-700' },
            { label: 'معذور', count: excusedCount, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
          ].map(({ label, count, cls }) => (
            <div key={label} className={`border rounded-xl p-3 text-center ${cls}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Students list */}
        {students.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-foreground mb-1">لا يوجد طلاب في هذا الفصل</h3>
            <p className="text-sm text-muted-foreground">أضف طلاباً من لوحة الإدارة</p>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl px-4 py-2 shadow-sm">
            {students.map((student, idx) => {
              const log = logMap.get(student.id);
              if (!log) return null;
              const waSending = isSending(student.id);
              const waSent = whatsAppSentIds.has(student.id);
              const waLabel = `إرسال رسالة واتساب لولي أمر ${student.full_name}`;
              return (
                <div
                  key={student.id}
                  className="flex gap-2 sm:items-stretch border-b border-border last:border-b-0"
                >
                  <div className="flex-1 min-w-0 [&>div]:border-b-0">
                    <AttendanceRow
                      log={log}
                      studentName={student.full_name}
                      index={idx}
                    />
                  </div>
                  {log.status === 'Absent' && (
                    <div className="flex flex-col justify-center shrink-0 gap-1 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleWhatsApp(
                            student.id,
                            log.session_id,
                            student.full_name,
                          )
                        }
                        disabled={waSending}
                        title={waLabel}
                        aria-label={waLabel}
                        className="min-h-[44px] min-w-[44px] px-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center transition-colors"
                      >
                        <FaWhatsapp className="w-5 h-5" aria-hidden />
                      </button>
                      {waSent && (
                        <span
                          className="text-emerald-600 text-center text-lg leading-none"
                          title="تم إرسال واتساب في هذه الجلسة"
                          aria-label="تم إرسال واتساب في هذه الجلسة"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Done button */}
        <div className="mt-8 pt-4">
          <button
            onClick={() => navigate('/teacher')}
            className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span>✓</span>
            <span>تم — العودة للرئيسية</span>
          </button>
        </div>
      </main>
    </div>
  );
}
