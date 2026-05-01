import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';

export default function DebugWhatsApp() {
  const { notify } = useWhatsApp();
  const [studentId, setStudentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleTest() {
    const sid = studentId.trim();
    const sess = sessionId.trim();
    if (!sid || !sess) {
      return;
    }
    setBusy(true);
    try {
      await notify(sid, sess, studentName.trim() || undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-foreground">Debug — WhatsApp</h1>
        <Link to="/teacher" className="text-sm text-primary hover:underline">
          رجوع
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        أداة تطوير فقط — استدعاء دالة notify-whatsapp بمعرفات معروفة.
      </p>
      <div className="space-y-4 bg-card border border-border rounded-xl p-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">studentId (UUID)</span>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm bg-background"
            dir="ltr"
            autoComplete="off"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">sessionId (UUID)</span>
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm bg-background"
            dir="ltr"
            autoComplete="off"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">studentName (اختياري)</span>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm bg-background"
          />
        </label>
        <button
          type="button"
          onClick={handleTest}
          disabled={busy || !studentId.trim() || !sessionId.trim()}
          className="w-full min-h-[48px] rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
        >
          Test WhatsApp
        </button>
      </div>
    </div>
  );
}
