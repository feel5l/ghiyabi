// supabase/functions/teacher-login/index.ts
// Public Edge Function that exchanges a phone number for a Supabase session.
// Input:  { phone: string }
// Output: { access_token, refresh_token, user: { id, email, full_name, phone } }
//
// Auth model:
// - Teachers are pre-provisioned by the admin and exist in public.teachers.
//   They never know a password.
// - This function looks up the teacher by phone, then uses the service role
//   to generate a magiclink token for their synthetic email and immediately
//   verifies it server-side, returning the resulting session to the client.
// - is_active=false rejects login.
// - There is no SMS, no email, no OTP: the school explicitly chose phone-only.
//   This is the authoritative single point that must be hardened (rate limit,
//   IP allowlists, etc.) if the threat model later changes.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

function normaliseSaudiPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local: string | null = null;
  if (/^966\d{9}$/.test(digits)) local = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) local = digits;
  if (!local || !local.startsWith("5")) return null;
  return `+966${local}`;
}

function teacherSyntheticEmail(phoneE164: string): string {
  return `${phoneE164.replace(/^\+/, "")}@teachers.ghiyabi.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const phone = normaliseSaudiPhone((body?.phone ?? "").toString().trim());
  if (!phone) return jsonResponse({ error: "invalid_phone" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: teacher } = await admin
    .from("teachers")
    .select("id, is_active, full_name, phone")
    .eq("phone", phone)
    .maybeSingle();

  // Always return a generic error so attackers can't enumerate registered phones.
  const generic = () => jsonResponse({ error: "not_authorised" }, 401);
  if (!teacher) return generic();
  if (!teacher.is_active) return generic();

  const email = teacherSyntheticEmail(phone);

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    return jsonResponse({ error: "link_generation_failed" }, 500);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: sessionData, error: verifyErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyErr || !sessionData.session || !sessionData.user) {
    return jsonResponse({ error: "verify_failed", detail: verifyErr?.message }, 500);
  }

  return jsonResponse({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user: {
      id: sessionData.user.id,
      email: sessionData.user.email,
      full_name: teacher.full_name,
      phone: teacher.phone,
    },
  });
});
