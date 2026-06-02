import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// Status priority — never downgrade a status
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
  "Follow-up 1":     2,
  "Follow-up 2":     3,
};

// Map Resend last_event → CRM status
function resendEventToStatus(lastEvent: string): string {
  switch (lastEvent) {
    case "delivered":    return "Sent";
    case "opened":       return "Opened";
    case "clicked":      return "Opened";
    case "bounced":      return "Bad email";
    case "complained":   return "Cold";
    default:             return "Sent";
  }
}

// GET /api/admin/outreach/recover-crm
// Fetches all sent emails from Resend and reconstructs contact statuses
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry_run") === "true";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const db = getDB();
  const recovered: Array<Record<string, unknown>> = [];
  const notFound:  Array<Record<string, unknown>> = [];
  let page = 0;
  let allEmails: Array<Record<string, unknown>> = [];

  // ── Fetch ALL sent emails from Resend (paginate) ──────────────────────────
  while (true) {
    const url = `https://api.resend.com/emails?limit=100${page > 0 ? `&offset=${page * 100}` : ""}`;
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Resend API error: ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const emails: Array<Record<string, unknown>> = data.data || [];
    if (!emails.length) break;

    allEmails = [...allEmails, ...emails];
    if (emails.length < 100) break; // last page
    page++;

    // Safety limit — 5000 emails max
    if (allEmails.length >= 5000) break;
  }

  console.log(`[CRM Recovery] Found ${allEmails.length} emails in Resend`);

  // ── Build a map: recipient email → best status ────────────────────────────
  // One contact may have received multiple emails — keep the highest status
  const emailStatusMap = new Map<string, { status: string; sentDate: string; subject: string }>();

  for (const email of allEmails) {
    const toAddresses = (email.to as string[]) || [];
    const lastEvent   = (email.last_event as string) || "delivered";
    const createdAt   = (email.created_at as string) || "";
    const subject     = (email.subject as string) || "";
    const status      = resendEventToStatus(lastEvent);
    const sentDate    = createdAt.split("T")[0];

    for (const to of toAddresses) {
      const recipientEmail = to.toLowerCase().trim();
      const existing = emailStatusMap.get(recipientEmail);
      const newPriority = STATUS_PRIORITY[status] ?? 0;
      const existingPriority = existing ? (STATUS_PRIORITY[existing.status] ?? 0) : -1;

      if (newPriority > existingPriority) {
        emailStatusMap.set(recipientEmail, { status, sentDate, subject });
      }
    }
  }

  console.log(`[CRM Recovery] ${emailStatusMap.size} unique recipients found in Resend logs`);

  // ── Match to contacts in database and update ──────────────────────────────
  for (const [recipientEmail, { status, sentDate, subject }] of emailStatusMap) {
    const { data: matches } = await db
      .from("outreach_contacts")
      .select("id, name, email, email_status")
      .ilike("email", recipientEmail)
      .limit(1);

    if (!matches?.length) {
      notFound.push({ email: recipientEmail, status, sentDate });
      continue;
    }

    const contact = matches[0];
    const currentPriority = STATUS_PRIORITY[contact.email_status as string ?? "Not contacted"] ?? 0;
    const newPriority      = STATUS_PRIORITY[status] ?? 0;

    if (newPriority > currentPriority) {
      if (!dryRun) {
        await db
          .from("outreach_contacts")
          .update({
            email_status: status,
            sent_date:    sentDate,
          })
          .eq("id", contact.id);
      }

      recovered.push({
        name:      contact.name,
        email:     recipientEmail,
        old_status: contact.email_status || "Not contacted",
        new_status: status,
        sent_date:  sentDate,
        subject:    subject.slice(0, 60),
      });
    }
  }

  // ── Log recovered entries to outreach_sends ───────────────────────────────
  if (!dryRun && recovered.length > 0) {
    const sendLogs = recovered.map((r) => ({
      contact_email: r.email,
      contact_name:  r.name,
      subject:       r.subject,
      status:        "sent",
      created_at:    r.sent_date,
    }));

    await db.from("outreach_sends").insert(sendLogs);
  }

  return NextResponse.json({
    dry_run:        dryRun,
    total_resend_emails: allEmails.length,
    unique_recipients:   emailStatusMap.size,
    recovered:      recovered.length,
    not_in_db:      notFound.length,
    recovered_list: recovered,
    not_found_list: notFound.slice(0, 20), // show first 20 unmatched
    message:        dryRun
      ? `DRY RUN — ${recovered.length} contacts would be updated. Run without ?dry_run=true to apply.`
      : `✓ Recovery complete — ${recovered.length} contact statuses restored from Resend logs`,
  });
}
