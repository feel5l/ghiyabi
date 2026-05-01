// Type definitions for Supabase Edge Runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const WHATSAPP_TOKEN  = Deno.env.get("WHATSAPP_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { record, old_record } = await req.json();

    // Only send when status changes to "Absent" (avoid duplicates)
    if (
      record.status !== "Absent" ||
      old_record?.status === "Absent"
    ) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Fetch student info
    const { data: student } = await sb
      .from("students")
      .select("full_name, parent_phone")
      .eq("id", record.student_id)
      .single();

    if (!student?.parent_phone) {
      return new Response(JSON.stringify({ error: "no phone" }), {
        status: 200,
      });
    }

    // Fetch session + class info
    const { data: session } = await sb
      .from("sessions")
      .select("date, period, subject, classes(name)")
      .eq("id", record.session_id)
      .single();

    // Normalize Saudi phone number to E.164 (966…)
    const digits = student.parent_phone.replace(/\D/g, "");
    const phone  = digits.startsWith("966")
      ? digits
      : "966" + digits.replace(/^0/, "");

    // WhatsApp Cloud API template message
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: "absent_notification",
            language: { code: "ar" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: student.full_name },
                  { type: "text", text: String(session.date) },
                  { type: "text", text: session.subject },
                  {
                    type: "text",
                    text: (session.classes as any).name,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 },
    );
  }
});
