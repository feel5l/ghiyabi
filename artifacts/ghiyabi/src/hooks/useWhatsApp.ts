import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

interface NotifyParams {
  studentId: string;
  sessionId: string;
  studentName: string;
}

export function useWhatsApp() {
  const notify = async ({
    studentId,
    sessionId,
    studentName,
  }: NotifyParams) => {
    const toastId = toast.loading(
      `جاري إرسال واتساب لولي أمر ${studentName}...`
    );

    try {
      const { error } = await supabase.functions.invoke(
        "notify-whatsapp",
        {
          body: {
            record: {
              student_id: studentId,
              session_id: sessionId,
              status: "Absent",
            },
            old_record: { status: "Present" },
          },
        }
      );

      if (error) throw error;

      toast.success(
        `✅ تم إرسال الإشعار لولي أمر ${studentName}`,
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(
        "❌ فشل إرسال واتساب، تحقق من إعدادات API",
        { id: toastId }
      );
    }
  };

  return { notify };
}
