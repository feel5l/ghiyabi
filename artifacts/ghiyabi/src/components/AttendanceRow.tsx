import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { AttendanceLog, AttendanceStatus } from '../lib/supabase';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  Present: 'حاضر',
  Absent: 'غائب',
  Late: 'متأخر',
  Excused: 'معذور',
};

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  Present: 'status-present',
  Absent: 'status-absent',
  Late: 'status-late',
  Excused: 'status-excused',
};

interface AttendanceRowProps {
  log: AttendanceLog;
  studentName: string;
  index: number;
}

type StatusButton = { status: AttendanceStatus; label: string; emoji: string; cls: string };

const BUTTONS: StatusButton[] = [
  { status: 'Present', label: 'حاضر', emoji: '✅', cls: 'btn-present-outline data-[active=true]:btn-present' },
  { status: 'Absent', label: 'غائب', emoji: '❌', cls: 'btn-absent-outline data-[active=true]:btn-absent' },
  { status: 'Late', label: 'متأخر', emoji: '⏰', cls: 'btn-late-outline data-[active=true]:btn-late' },
  { status: 'Excused', label: 'معذور', emoji: '📋', cls: 'btn-excused-outline data-[active=true]:btn-excused' },
];

export function AttendanceRow({ log, studentName, index }: AttendanceRowProps) {
  const [status, setStatus] = useState<AttendanceStatus>(log.status);
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus: AttendanceStatus) {
    if (newStatus === status || saving) return;
    const prev = status;
    setStatus(newStatus); // optimistic
    setSaving(true);
    const { error } = await supabase
      .from('attendance_log')
      .update({ status: newStatus, marked_at: new Date().toISOString() })
      .eq('id', log.id);
    setSaving(false);
    if (error) {
      setStatus(prev); // revert
      toast.error('حدث خطأ في الحفظ');
    } else {
      toast.success('تم الحفظ');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{studentName}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${STATUS_CLASSES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {BUTTONS.map((btn) => {
          const isActive = status === btn.status;
          return (
            <button
              key={btn.status}
              onClick={() => updateStatus(btn.status)}
              disabled={saving}
              data-active={isActive}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5
                ${isActive
                  ? btn.status === 'Present' ? 'bg-green-500 text-white border-2 border-green-500'
                    : btn.status === 'Absent' ? 'bg-red-500 text-white border-2 border-red-500'
                    : btn.status === 'Late' ? 'bg-orange-500 text-white border-2 border-orange-500'
                    : 'bg-blue-500 text-white border-2 border-blue-500'
                  : btn.status === 'Present' ? 'border-2 border-green-400 text-green-700 hover:bg-green-50'
                    : btn.status === 'Absent' ? 'border-2 border-red-400 text-red-700 hover:bg-red-50'
                    : btn.status === 'Late' ? 'border-2 border-orange-400 text-orange-700 hover:bg-orange-50'
                    : 'border-2 border-blue-400 text-blue-700 hover:bg-blue-50'
                }`}
            >
              <span>{btn.emoji}</span>
              <span>{btn.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
