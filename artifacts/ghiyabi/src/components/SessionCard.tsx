import { Link } from 'react-router-dom';
import type { Session } from '../lib/supabase';

const PERIOD_LABELS: Record<string, string> = {
  P1: 'الحصة الأولى',
  P2: 'الحصة الثانية',
  P3: 'الحصة الثالثة',
  P4: 'الحصة الرابعة',
  P5: 'الحصة الخامسة',
  P6: 'الحصة السادسة',
};

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const periodLabel = PERIOD_LABELS[session.period] || session.period;
  const className = session.classes?.name || '—';
  const gradeLevel = session.classes?.grade_level || '';

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {session.period}
            </span>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">{session.subject}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {gradeLevel} — فصل {className}
          </p>
        </div>
        <div className="text-left text-xs text-muted-foreground">
          {new Date(session.date).toLocaleDateString('ar-SA', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })}
        </div>
      </div>
      <Link
        to={`/teacher/session/${session.id}`}
        className="flex items-center justify-center gap-2 w-full min-h-[48px] bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        <span>تسجيل الغياب</span>
        <span>←</span>
      </Link>
    </div>
  );
}
