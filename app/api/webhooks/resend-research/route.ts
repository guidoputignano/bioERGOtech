import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Resend delivery events for the Research Centres campaign.
 *
 * Register this URL as a second webhook in Resend with its own signing
 * secret (RC_RESEND_WEBHOOK_SECRET). It only touches rc_messages and
 * rc_suppressions; the Outreach pipeline keeps /api/webhooks/resend.
 * Events are matched by Resend's e-mail id, never by recipient, so an
 * address shared with the other pipeline cannot be confused.
 *
 * "Opened" and "clicked" are deliberately ignored: privacy proxies open
 * mail automatically, so they are not evidence of interest.
 */
const MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(req: NextRequest) {
  const secret = process.env.RC_RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const raw = await req.text();
  try {
    const { Webhook } = await import("svix");
    new Webhook(secret).verify(raw, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type: string; data: { email_id?: string; to?: string[] } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ received: true, skipped: "parse" }); }
  const status = MAP[event.type];
  if (!status || !event.data?.email_id) return NextResponse.json({ received: true, skipped: true });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: msg } = await db.from("rc_messages").select("id, institution_id, campaign_id, to_email, delivery_status")
    .eq("provider", "resend").eq("provider_message_id", event.data.email_id).maybeSingle();
  if (!msg) return NextResponse.json({ received: true, matched: false });

  // Never downgrade a bounce or complaint to "delivered".
  if (!(msg.delivery_status === "bounced" || msg.delivery_status === "complained") || status === "complained") {
    await db.from("rc_messages").update({ delivery_status: status, updated_at: new Date().toISOString() }).eq("id", msg.id);
  }
  if ((status === "bounced" || status === "complained") && msg.to_email) {
    await db.from("rc_suppressions").upsert(
      { value: msg.to_email.toLowerCase(), kind: "email", reason: status === "bounced" ? "bounce" : "complaint", source_message_id: msg.id },
      { onConflict: "kind,value", ignoreDuplicates: true },
    );
    await db.from("rc_institutions").update({
      next_action: status === "bounced" ? "Address bounced: find and verify another channel" : "Marked as spam: do not e-mail again",
      last_activity_at: new Date().toISOString(),
    }).eq("id", msg.institution_id);
    await db.from("rc_events").insert({ campaign_id: msg.campaign_id, institution_id: msg.institution_id, actor: "resend", action: `delivery.${status}`, detail: { message_id: msg.id } });
  }
  return NextResponse.json({ received: true, status });
}
