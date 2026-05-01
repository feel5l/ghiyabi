// Supabase Edge Function: notify-absent
// Triggered by Supabase Database Webhooks on attendance_log INSERT/UPDATE events
// Sends Arabic absence notification email via Resend API
//
// SECURITY: Requests must include the header:
//   Authorization: Bearer <NOTIFY_WEBHOOK_SECRET>
// Set NOTIFY_WEBHOOK_SECRET in Supabase Edge Function secrets (Supabase Dashboard →
// Functions → notify-absent → Secrets). Use the same value when configuring the
// Database Webhook in Supabase Dashboard → Database → Webhooks.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_WEBHOOK_SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET')!;

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: AttendanceRecord;
  old_record?: AttendanceRecord;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
  marked_at: string;
  note?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verify shared secret — reject any request without a valid secret
  if (!NOTIFY_WEBHOOK_SECRET) {
    console.error('NOTIFY_WEBHOOK_SECRET is not configured');
    return new Response('Service Misconfigured', { status: 500 });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== NOTIFY_WEBHOOK_SECRET) {
    console.warn('Unauthorized webhook request — invalid or missing secret');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    const { record, old_record, type } = payload;

    // Only process if new status is 'Absent'
    if (record.status !== 'Absent') {
      return new Response(JSON.stringify({ skipped: 'status is not Absent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Skip if old status was already 'Absent' (avoid duplicate emails on re-saves)
    if (type === 'UPDATE' && old_record?.status === 'Absent') {
      return new Response(JSON.stringify({ skipped: 'was already Absent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create service-role Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('full_name, parent_email, class_id')
      .eq('id', record.student_id)
      .single();

    if (studentError || !student) {
      console.error('Student not found:', studentError);
      return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404 });
    }

    // Skip if no parent email
    if (!student.parent_email) {
      return new Response(JSON.stringify({ skipped: 'no parent email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch session info with class info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('date, period, subject, class_id, classes(name)')
      .eq('id', record.session_id)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    const className = (session.classes as { name: string } | null)?.name || '—';
    const dateFormatted = new Date(session.date).toLocaleDateString('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const periodMap: Record<string, string> = {
      P1: 'الأولى',
      P2: 'الثانية',
      P3: 'الثالثة',
      P4: 'الرابعة',
      P5: 'الخامسة',
      P6: 'السادسة',
    };
    const periodLabel = periodMap[session.period] || session.period;

    // Build Arabic HTML email body
    const htmlBody = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo h1 { color: #0d9488; font-size: 28px; margin: 0; }
    .logo p { color: #6b7280; font-size: 14px; margin: 4px 0 0; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .alert-box h2 { color: #dc2626; margin: 0 0 8px; font-size: 18px; }
    .info-row { margin: 12px 0; color: #374151; font-size: 15px; }
    .info-row strong { color: #1f2937; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 13px; }
    .contact-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0; color: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>غيابي</h1>
      <p>مدرسة زيد بن ثابت الابتدائية</p>
    </div>

    <p style="color:#374151; font-size:16px;">عزيزي ولي أمر الطالب/ة،</p>

    <div class="alert-box">
      <h2>&#9888;&#65039; إشعار غياب</h2>
      <p style="margin:0; color:#374151;">نُحيطكم علماً بأن:</p>
    </div>

    <div class="info-row">
      <strong>الطالب/ة:</strong> ${student.full_name}
    </div>
    <div class="info-row">
      <strong>الفصل:</strong> ${className}
    </div>
    <div class="info-row">
      <strong>التاريخ:</strong> ${dateFormatted}
    </div>
    <div class="info-row">
      <strong>الحصة:</strong> الحصة ${periodLabel}
    </div>
    <div class="info-row">
      <strong>المادة:</strong> ${session.subject}
    </div>

    <div class="contact-note">
      &#128222; يُرجى التواصل مع إدارة المدرسة إذا كان الغياب بعذر.
    </div>

    <div class="footer">
      <p>مدرسة زيد بن ثابت الابتدائية — نظام غيابي</p>
      <p style="margin:4px 0 0;">هذه رسالة تلقائية، يُرجى عدم الرد عليها مباشرة.</p>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@ghiyabi.school',
        to: [student.parent_email],
        subject: `إشعار غياب — ${student.full_name}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resendData = await resendRes.json();
    console.log('Email sent:', resendData);

    return new Response(JSON.stringify({ success: true, email_id: resendData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
