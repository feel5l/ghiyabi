import { supabase } from './supabase';

const SAUDI_PREFIX = '+966';

// Normalise a Saudi mobile number to strict E.164.
// Accepts: "+9665xxxxxxxx", "9665xxxxxxxx", "05xxxxxxxx", "5xxxxxxxx".
// Returns null when the input is not a valid Saudi mobile number.
export function normaliseSaudiPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  let local: string | null = null;
  if (/^966\d{9}$/.test(digits)) local = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) local = digits;
  if (!local || !local.startsWith('5')) return null;
  return `${SAUDI_PREFIX}${local}`;
}

export function formatSaudiPhone(e164: string): string {
  const m = /^\+966(5\d{2})(\d{3})(\d{3})$/.exec(e164);
  if (!m) return e164;
  return `${SAUDI_PREFIX} ${m[1]} ${m[2]} ${m[3]}`;
}

export interface TeacherLoginResult {
  ok: true;
  full_name: string;
  phone: string;
}

export interface TeacherLoginError {
  ok: false;
  code: 'invalid_phone' | 'not_authorised' | 'network' | 'unknown';
}

// Logs a teacher in by phone number through the teacher-login Edge Function
// and installs the resulting session in the supabase-js client. Returns a
// discriminated result so the UI can show a single, generic error message
// for any "not allowed" reason without leaking which phones are registered.
export async function teacherLogin(rawPhone: string): Promise<TeacherLoginResult | TeacherLoginError> {
  const phone = normaliseSaudiPhone(rawPhone);
  if (!phone) return { ok: false, code: 'invalid_phone' };

  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teacher-login`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ phone }),
      },
    );
  } catch {
    return { ok: false, code: 'network' };
  }

  if (response.status === 401) return { ok: false, code: 'not_authorised' };
  if (!response.ok) return { ok: false, code: 'unknown' };

  const data = await response.json();
  if (!data?.access_token || !data?.refresh_token) {
    return { ok: false, code: 'unknown' };
  }

  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) return { ok: false, code: 'unknown' };

  return {
    ok: true,
    full_name: data.user?.full_name ?? '',
    phone: data.user?.phone ?? phone,
  };
}
