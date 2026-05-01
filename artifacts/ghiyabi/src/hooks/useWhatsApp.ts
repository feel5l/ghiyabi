import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

function toastInvokeError(message: string) {
  toast.error(message || 'فشل إرسال رسالة واتساب');
}

export function useWhatsApp() {
  const [sendingStudentIds, setSendingStudentIds] = useState<Set<string>>(
    () => new Set(),
  );

  const notify = useCallback(
    async (studentId: string, sessionId: string, studentName?: string) => {
      const label = studentName?.trim() ? ` — ${studentName.trim()}` : '';
      toast.loading(`جاري إرسال واتساب${label}...`, { id: `wa-${studentId}` });

      setSendingStudentIds((prev) => new Set(prev).add(studentId));

      try {
        const { data, error } = await supabase.functions.invoke(
          'notify-whatsapp',
          {
            body: { student_id: studentId, session_id: sessionId },
          },
        );

        toast.dismiss(`wa-${studentId}`);

        const payload = data as
          | { error?: string; skipped?: string; success?: boolean }
          | null
          | undefined;

        const payloadError =
          payload &&
          typeof payload === 'object' &&
          typeof payload.error === 'string' &&
          payload.error.trim()
            ? payload.error.trim()
            : null;

        if (payloadError) {
          toastInvokeError(payloadError);
          return { ok: false as const, skipped: false as const };
        }

        if (error) {
          const msg =
            typeof error.message === 'string' && error.message.trim()
              ? error.message.trim()
              : 'فشل إرسال رسالة واتساب';
          toastInvokeError(msg);
          return { ok: false as const, skipped: false as const };
        }

        if (payload?.skipped) {
          const skipMsg =
            payload.skipped === 'no parent phone'
              ? 'لا يوجد رقم جوال لولي الأمر'
              : payload.skipped === 'status is not Absent'
                ? 'الطالب غير مسجل كغائب لهذه الحصة'
                : `تم التخطي: ${payload.skipped}`;
          toast(skipMsg, { icon: 'ℹ️' });
          return { ok: true as const, skipped: true as const };
        }

        if (payload?.success) {
          toast.success('تم إرسال رسالة واتساب بنجاح');
          return { ok: true as const, skipped: false as const };
        }

        toast.success('تمت العملية');
        return { ok: true as const, skipped: false as const };
      } finally {
        setSendingStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      }
    },
    [],
  );

  const isSending = useCallback(
    (studentId: string) => sendingStudentIds.has(studentId),
    [sendingStudentIds],
  );

  return { notify, isSending };
}
