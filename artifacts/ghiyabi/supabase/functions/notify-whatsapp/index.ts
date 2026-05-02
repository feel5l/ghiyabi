import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: AttendanceRecord;
  old_record?: AttendanceRecord;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_WEBHOOK_SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET') || '';
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;
const WHATSAPP_GRAPH_API_VERSION = Deno.env.get('WHATSAPP_GRAPH_API_VERSION') || 'v21.0';

const TEMPLATE_NAME = 'absent_notification';
const TEMPLATE_LANG = 'ar';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function periodLabel(period: string): string {
  const map: Record<string, string> = {
    P1: 'الأولى',
    P2: 'الثانية',
    P3: 'الثالثة',
    P4: 'الرابعة',
    P5: 'الخامسة',
    P6: 'السادسة',
  };
  return map[period] ?? period;
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `966${digits.slice(1)}`;
  return digits;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (NOTIFY_WEBHOOK_SECRET) {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== NOTIFY_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { record, old_record, type } = payload;

    if (record.status !== 'Absent') return jsonResponse({ skipped: 'status is not Absent' });
    if (type === 'UPDATE' && old_record?.status === 'Absent') {
      return jsonResponse({ skipped: 'was already Absent' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('full_name, parent_phone')
      .eq('id', record.student_id)
      .single();
    if (studentError || !student) return jsonResponse({ error: 'Student not found' }, 404);

    const toPhone = normalizePhone(student.parent_phone);
    if (!toPhone) return jsonResponse({ skipped: 'no valid parent phone' });

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('date, period, subject, classes(name)')
      .eq('id', record.session_id)
      .single();
    if (sessionError || !session) return jsonResponse({ error: 'Session not found' }, 404);

    const className = (session.classes as { name: string } | null)?.name || '—';
    const dateFormatted = new Date(session.date).toLocaleDateString('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const lesson = `الحصة ${periodLabel(session.period)}`;

    const graphUrl =
      `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANG },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: student.full_name || '—' },
              { type: 'text', text: className },
              { type: 'text', text: dateFormatted },
              { type: 'text', text: lesson },
            ],
          },
        ],
      },
    };

    const waRes = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload),
    });

    const waBody = await waRes.text();
    if (!waRes.ok) return jsonResponse({ error: 'WhatsApp send failed', details: waBody }, 502);

    return jsonResponse({ success: true, result: JSON.parse(waBody) });
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});
