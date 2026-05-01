// supabase/functions/provision-teacher/index.ts
// Admin-only Edge Function that creates a teacher account.
// Input:  { full_name: string, phone: string, class_ids?: string[] }
// Output: { teacher: { id, full_name, phone } }
//
// Design notes:
// - Teachers log in with phone only (no SMS, no email). To leverage Supabase
//   auth we register them in auth.users with a synthetic local email
//   "<phone>@teachers.ghiyabi.local" and a long random password the teacher
//   never sees. Sign-in uses an admin-generated magic link, see the
//   teacher-login function.
// - Authorisation: caller must be a row in the public.admins table. We trust
//   the JWT in the Authorization header, look up its email, and check.

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

// Normalises Saudi phone input to strict E.164. Accepts "+9665xxxxxxxx",
// "9665xxxxxxxx", "05xxxxxxxx" and "5xxxxxxxx" (9 digits starting with 5).
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

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

async function callerIsAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.email) return false;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: row } = await admin
    .from("admins")
    .select("email")
    .eq("email", userData.user.email)
    .maybeSingle();
  return Boolean(row);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization");
  if (!(await callerIsAdmin(authHeader))) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const fullName = (body?.full_name ?? "").toString().trim();
  const phoneInput = (body?.phone ?? "").toString().trim();
  const classIds: string[] = Array.isArray(body?.class_ids) ? body.class_ids : [];

  if (!fullName) return jsonResponse({ error: "full_name_required" }, 400);
  const phone = normaliseSaudiPhone(phoneInput);
  if (!phone) return jsonResponse({ error: "invalid_phone" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const email = teacherSyntheticEmail(phone);

  const { data: existing } = await admin
    .from("teachers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) {
    return jsonResponse({ error: "phone_already_registered" }, 409);
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "teacher" },
  });
  if (createErr || !created.user) {
    return jsonResponse(
      { error: "auth_create_failed", detail: createErr?.message },
      500,
    );
  }

  const { error: insertErr } = await admin.from("teachers").insert({
    id: created.user.id,
    full_name: fullName,
    phone,
    is_active: true,
  });
  if (insertErr) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return jsonResponse(
      { error: "teacher_insert_failed", detail: insertErr.message },
      500,
    );
  }

  if (classIds.length > 0) {
    await admin
      .from("classes")
      .update({ teacher_id: created.user.id })
      .in("id", classIds);
  }

  return jsonResponse({
    teacher: { id: created.user.id, full_name: fullName, phone },
  });
});
