// Supabase Edge Function: notify-email
//
// Called (fire-and-forget) from DB triggers in
// supabase/migrations/20260820120000_targeted_booking_notifications.sql
// whenever a client/professional needs to be notified by email:
//   1) Se recibe un presupuesto
//   2) Se contesta (acepta) un presupuesto
//   3) Se finaliza un trabajo
//
// If RESEND_API_KEY is configured as a secret, it sends a real email via
// Resend. Otherwise it just logs the notification (simulated email) so the
// rest of the flow keeps working in local/dev environments without an email
// provider configured.
//
// Deploy with: supabase functions deploy notify-email
// Configure the DB trigger to call it by setting, once per environment:
//   ALTER DATABASE postgres SET app.settings.notify_email_url =
//     'https://<project-ref>.supabase.co/functions/v1/notify-email';

import { createClient } from "jsr:@supabase/supabase-js@2";

type Payload = {
  user_id: string;
  type: "quote_received" | "quote_answered" | "job_done";
  title: string;
  body: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("NOTIFY_FROM_EMAIL") ?? "ConfiaAMBA <notificaciones@confiaamba.app>";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase service credentials" }), {
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Resolve the destination email from auth.users via the admin API.
  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(payload.user_id);
  if (userErr || !userRes?.user?.email) {
    return new Response(JSON.stringify({ error: "Could not resolve recipient email" }), {
      status: 404,
    });
  }
  const to = userRes.user.email;

  if (!resendApiKey) {
    // Simulated send: no email provider configured. Log and return success so
    // the calling trigger/flow is not blocked — the in-app notification row
    // already exists regardless of this function's outcome.
    console.log(`[notify-email:SIMULATED] to=${to} type=${payload.type} title="${payload.title}"`);
    return new Response(JSON.stringify({ simulated: true, to }), { status: 200 });
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: payload.title,
      html: `<p>${payload.body}</p><p style="color:#6b7280;font-size:12px">ConfiaAMBA</p>`,
    }),
  });

  if (!emailRes.ok) {
    const text = await emailRes.text();
    return new Response(JSON.stringify({ error: "Resend send failed", detail: text }), {
      status: 502,
    });
  }

  return new Response(JSON.stringify({ sent: true, to }), { status: 200 });
});