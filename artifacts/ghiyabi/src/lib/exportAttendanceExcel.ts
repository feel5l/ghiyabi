import ExcelJS from 'exceljs';
import { supabase } from './supabase';

const STATUS_AR: Record<string, string> = {
  Present: 'حاضر',
  Absent: 'غائب',
  Late: 'متأخر',
  Excused: 'معذور',
};

export interface ExportSummaryRow {
  classLabel: string;
  totalStudents: number;
  absentToday: number;
  pctAbsent: number;
}

async function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generic Excel export: Summary + Detailed Attendance worksheets.
 */
export async function exportAttendanceExcel(opts: {
  date: string;
  classStats: ExportSummaryRow[];
  totalStudents: number;
  totalAbsent: number;
  sessionsNotStarted: number;
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ghiyabi';
  wb.created = new Date();

  const summary = wb.addWorksheet('ملخّص', {
    views: [{ rightToLeft: true }],
  });
  summary.columns = [
    { header: 'البند', key: 'label', width: 28 },
    { header: 'القيمة', key: 'value', width: 18 },
  ];
  summary.addRows([
    { label: 'التاريخ', value: opts.date },
    { label: 'إجمالي الطلاب', value: opts.totalStudents },
    { label: 'غائب (فريد)', value: opts.totalAbsent },
    { label: 'حصص لم تبدأ', value: opts.sessionsNotStarted },
  ]);
  summary.addRow({});
  summary.addRow({ label: 'الفصل', value: '—' });
  summary.getRow(summary.rowCount).values = [
    'الفصل',
    'عدد الطلاب',
    'غائب',
    'نسبة الغياب %',
  ];
  for (const row of opts.classStats) {
    summary.addRow([
      row.classLabel,
      row.totalStudents,
      row.absentToday,
      Number(row.pctAbsent.toFixed(1)),
    ]);
  }

  const detail = wb.addWorksheet('حضور تفصيلي', {
    views: [{ rightToLeft: true }],
  });
  detail.columns = [
    { header: 'التاريخ', key: 'date', width: 14 },
    { header: 'الحصة', key: 'period', width: 10 },
    { header: 'المادة', key: 'subject', width: 18 },
    { header: 'الفصل', key: 'class_name', width: 14 },
    { header: 'الطالب', key: 'student', width: 24 },
    { header: 'الحالة', key: 'status', width: 12 },
    { header: 'ملاحظة', key: 'note', width: 24 },
  ];

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date, period, subject, classes(name, grade_level)')
    .eq('date', opts.date);

  const sessionIds = (sessions || []).map((s) => s.id);
  if (sessionIds.length > 0) {
    const { data: logs } = await supabase
      .from('attendance_log')
      .select('status, note, session_id, students(full_name)')
      .in('session_id', sessionIds);

    const sessionMap = new Map(
      (sessions || []).map((s) => {
        const cls = s.classes as unknown as {
          name: string;
          grade_level: string;
        } | null;
        return [
          s.id,
          {
            date: s.date,
            period: s.period,
            subject: s.subject,
            classLabel: cls
              ? `${cls.grade_level} — ${cls.name}`
              : '—',
          },
        ] as const;
      }),
    );

    for (const log of logs || []) {
      const sess = sessionMap.get(log.session_id);
      const student = log.students as unknown as { full_name: string } | null;
      detail.addRow({
        date: sess?.date ?? opts.date,
        period: sess?.period ?? '',
        subject: sess?.subject ?? '',
        class_name: sess?.classLabel ?? '',
        student: student?.full_name ?? '',
        status: STATUS_AR[log.status] || log.status,
        note: log.note || '',
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  await downloadBuffer(
    buffer as ArrayBuffer,
    `ghiyabi-attendance-${opts.date}.xlsx`,
  );
}
