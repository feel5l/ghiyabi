// Supabase Edge Function: notify-whatsapp
// - Database webhook: JSON body with `record` / `old_record` (attendance_log change).
// - Client invoke: JSON body with `student_id`, `session_id` (JWT; teacher or admin).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type WebhookPayload = {
  record: { status: string; student_id: string; session_id: string };
  old_record?: { status?: string };
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
};

type ClientInvokePayload = {
  student_id: string;
  session_id: string;
};

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

function isWebhookPayload(body: unknown): body is WebhookPayload {
  if (typeof body !== 'object' || body === null) return false;
  const r = (body as WebhookPayload).record;
  return (
    typeof r?.status === 'string' &&
    typeof r?.student_id === 'string' &&
    typeof r?.session_id === 'string'
  );
}

function isClientPayload(body: unknown): body is ClientInvokePayload {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as ClientInvokePayload;
  return typeof b.student_id === 'string' && typeof b.session_id === 'string';
}

/** Normalize Saudi-style numbers to E.164 (+966…). */
function normalizeSaudiPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('966')) {
    const rest = digits.slice(3);
    if (rest.length === 9 && rest.startsWith('5')) return `+966${rest}`;
    return null;
  }
  if (digits.startsWith('0') && digits.length >= 10 && digits[1] === '5') {
    return `+966${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith('5')) {
    return `+966${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('9665')) {
    return `+${digits}`;
  }
  return null;
}

async function sendAbsentTemplate(params: {
  toE164: string;
  studentName: string;
  dateFormatted: string;
  subject: string;
  className: string;
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
}): Promise<{ ok: boolean; status: number; bodyText: string }> {
  const url =
    `https://graph.facebook.com/${params.graphVersion}/${params.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.toE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: 'absent_notification',
        language: { code: 'ar' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: params.studentName },
              { type: 'text', text: params.dateFormatted },
              { type: 'text', text: params.subject },
              { type: 'text', text: params.className },
            ],
          },
        ],
      },
    }),
  });
  const bodyText = await res.text();
  console.log(
    `[notify-whatsapp] WhatsApp API response status=${res.status} body=${bodyText}`,
  );
  return { ok: res.ok, status: res.status, bodyText };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let SUPABASE_URL: string;
  let SUPABASE_SERVICE_ROLE_KEY: string;
  let SUPABASE_ANON_KEY: string;
  let WHATSAPP_ACCESS_TOKEN: string;
  let WHATSAPP_PHONE_NUMBER_ID: string;
  let WHATSAPP_GRAPH_API_VERSION: string;

  try {
    SUPABASE_URL = requireEnv('SUPABASE_URL');
    SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
    WHATSAPP_ACCESS_TOKEN = requireEnv('WHATSAPP_ACCESS_TOKEN');
    WHATSAPP_PHONE_NUMBER_ID = requireEnv('WHATSAPP_PHONE_NUMBER_ID');
    WHATSAPP_GRAPH_API_VERSION =
      Deno.env.get('WHATSAPP_GRAPH_API_VERSION')?.trim() || 'v21.0';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[notify-whatsapp] Configuration error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let studentId: string;
  let sessionId: string;

  if (isWebhookPayload(rawBody)) {
    const NOTIFY_WEBHOOK_SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET')?.trim();
    if (!NOTIFY_WEBHOOK_SECRET) {
      const msg = 'Missing required environment variable: NOTIFY_WEBHOOK_SECRET';
      console.error('[notify-whatsapp]', msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || token !== NOTIFY_WEBHOOK_SECRET) {
      console.warn('[notify-whatsapp] Unauthorized webhook request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { record, old_record, type } = rawBody;

    if (record.status !== 'Absent') {
      console.log(
        `[notify-whatsapp] Skipping: status is "${record.status}", not Absent`,
      );
      return new Response(
        JSON.stringify({ skipped: 'status is not Absent' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (type === 'UPDATE' && old_record?.status === 'Absent') {
      console.log('[notify-whatsapp] Skipping: attendance was already Absent');
      return new Response(JSON.stringify({ skipped: 'was already Absent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    studentId = record.student_id;
    sessionId = record.session_id;
  } else if (isClientPayload(rawBody)) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user?.email) {
      console.warn('[notify-whatsapp] JWT validation failed:', userErr);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: adminRow } = await adminClient
      .from('admins')
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    const isAdmin = !!adminRow;

    studentId = rawBody.student_id;
    sessionId = rawBody.session_id;

    const { data: sessionRow, error: sessErr } = await adminClient
      .from('sessions')
      .select('teacher_email')
      .eq('id', sessionId)
      .single();

    if (sessErr || !sessionRow) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin && sessionRow.teacher_email !== user.email) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    return new Response(
      JSON.stringify({
        error:
          'Invalid body: expected webhook payload with record or client payload with student_id and session_id',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('full_name, parent_phone, class_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      console.error('[notify-whatsapp] Student not found:', studentError);
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const phoneRaw = student.parent_phone?.trim();
    if (!phoneRaw) {
      console.log(
        `[notify-whatsapp] No parent phone for student_id=${studentId}; skipping WhatsApp`,
      );
      return new Response(JSON.stringify({ skipped: 'no parent phone' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toE164 = normalizeSaudiPhone(phoneRaw);
    if (!toE164) {
      console.log(
        `[notify-whatsapp] Could not normalize phone for student_id=${studentId}: "${phoneRaw}"`,
      );
      return new Response(JSON.stringify({ error: 'Invalid parent phone number' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('date, period, subject, class_id, classes(name)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[notify-whatsapp] Session not found:', sessionError);
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (student.class_id !== session.class_id) {
      return new Response(
        JSON.stringify({ error: 'Student is not in this session class' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (isClientPayload(rawBody)) {
      const { data: logRow } = await adminClient
        .from('attendance_log')
        .select('status')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (!logRow || logRow.status !== 'Absent') {
        console.log(
          `[notify-whatsapp] Skipping client invoke: attendance not Absent for student_id=${studentId} session_id=${sessionId}`,
        );
        return new Response(JSON.stringify({ skipped: 'status is not Absent' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const className =
      (session.classes as { name: string } | null)?.name || '—';
    const dateFormatted = new Date(session.date).toLocaleDateString('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const waResult = await sendAbsentTemplate({
      toE164,
      studentName: student.full_name,
      dateFormatted,
      subject: session.subject,
      className,
      accessToken: WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
      graphVersion: WHATSAPP_GRAPH_API_VERSION,
    });

    if (!waResult.ok) {
      console.error(
        `[notify-whatsapp] WhatsApp send failed status=${waResult.status}`,
      );
      return new Response(
        JSON.stringify({
          error: 'WhatsApp API error',
          details: waResult.bodyText,
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-whatsapp] Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
