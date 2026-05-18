import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// Status mapping — what each Resend event maps to in our CRM
const EVENT_STATUS_MAP: Record<string, string> = {
  "email.delivered":        "Sent",       // delivered to mail server (keep as Sent)
  "email.opened":           "Opened",     // recipient opened the email
  "email.clicked":          "Opened",     // recipient clicked a link (counts as opened)
  "email.bounced":          "Bad email",  // permanent bounce — bad address
  "email.complained":       "Cold",       // marked as spam
  "email.delivery_delayed": "Sent",       // temporary delay — keep as Sent
};

// Priority order — only upgrade status, never downgrade
// e.g. don't overwrite "Replied" with "Opened"
const STATUS_PRIORITY: Record<string, number> = {
  "Not contacted":   0,
  "Sent":            1,
  "Opened":          2,
  "Replied":         5,
  "Hot":             6,
  "Warm":            4,
  "Call Scheduled":  7,
  "Call Done":       8,
  "MoU Sent":        9,
  "Signed":          10,
  "Bad email":       1,
  "Cold":            1,
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    created_at?: string;
    bounce?: { message: string; subType: string; type: string };
  };
}

// POST /api/webhooks/resend
// Receives real-time events from Resend for every email we send
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Optional signature verification using RESEND_WEBHOOK_SECRET
    // Uncomment and install 'svix' package when you get the signing secret from Resend
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
        const { Webhook } = await import("svix");
        const wh = new Webhook(webhookSecret);
        const svixId        = req.headers.get("svix-id") ?? "";
        const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
        const svixSignature = req.headers.get("svix-signature") ?? "";
         try {
            wh.verify(rawBody, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature });
            } catch {
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
                }
            }

    const event: ResendWebhookEvent = JSON.parse(rawBody);
    const { type, data } = event;

    // Only process email events we care about
    if (!EVENT_STATUS_MAP[type]) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const recipientEmail = data.to?.[0]?.toLowerCase().trim();
    if (!recipientEmail) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const db = getDB();
    const newStatus = EVENT_STATUS_MAP[type];

    // Find the contact by email address
    const { data: contacts, error: fetchError } = await db
      .from("outreach_contacts")
      .select("id, email_status")
      .ilike("email", recipientEmail)
      .limit(1);

    if (fetchError || !contacts?.length) {
      // Contact not found — still return 200 so Resend doesn't retry
      return NextResponse.json({ received: true, contact_found: false });
    }

    const contact = contacts[0];
    const currentPriority = STATUS_PRIORITY[contact.email_status] ?? 0;
    const newPriority      = STATUS_PRIORITY[newStatus] ?? 0;

    // Only update if the new status is a meaningful progression
    // Never overwrite Replied/Hot/Call/MoU/Signed with Opened/Sent/Bad email
    if (newPriority > currentPriority ||
        newStatus === "Bad email" ||
        newStatus === "Cold") {

      await db
        .from("outreach_contacts")
        .update({ email_status: newStatus })
        .eq("id", contact.id);
    }

    // Also update the send log entry if we can match by email
    await db
      .from("outreach_sends")
      .update({ status: type === "email.bounced" ? "failed" : "sent" })
      .eq("contact_email", recipientEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    // Log the event for debugging
    console.log(`[Resend Webhook] ${type} → ${recipientEmail} → ${newStatus}`);

    return NextResponse.json({
      received: true,
      event: type,
      contact_id: contact.id,
      status_updated_to: newStatus,
    });

  } catch (e) {
    console.error("[Resend Webhook Error]", e);
    // Always return 200 to prevent Resend from retrying on parse errors
    return NextResponse.json({ received: true, error: "Parse error" }, { status: 200 });
  }
}

// GET — health check so Resend can verify the endpoint is reachable
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "bioERGOtech Resend webhook",
    events: Object.keys(EVENT_STATUS_MAP),
  });
}
