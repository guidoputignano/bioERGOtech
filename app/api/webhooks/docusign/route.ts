import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// POST /api/webhooks/docusign
// DocuSign Connect webhook — fires when envelope status changes
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Parse the XML webhook payload
    // DocuSign sends XML — extract key fields with regex for simplicity
    const envelopeId = body.match(/<EnvelopeID>(.*?)<\/EnvelopeID>/)?.[1] ||
                       body.match(/"envelopeId"\s*:\s*"([^"]+)"/)?.[1];
    const status     = body.match(/<Status>(.*?)<\/Status>/)?.[1] ||
                       body.match(/"status"\s*:\s*"([^"]+)"/)?.[1];

    if (!envelopeId) {
      return NextResponse.json({ received: true, skipped: "no envelopeId" });
    }

    console.log(`[DocuSign Webhook] Envelope ${envelopeId} → ${status}`);

    const db = getDB();

    // Find the contact by envelope ID stored in notes
    const { data: contacts } = await db
      .from("outreach_contacts")
      .select("id, name, email, notes, mou_status")
      .ilike("notes", `%${envelopeId}%`)
      .limit(1);

    if (!contacts?.length) {
      return NextResponse.json({ received: true, contact_found: false });
    }

    const contact = contacts[0];

    if (status === "completed") {
      // Fully signed by all parties
      await db.from("outreach_contacts").update({
        mou_status:   "Signed",
        email_status: "Signed",
        notes: [contact.notes || "", `[DocuSign] MoU signed ✓ ${new Date().toLocaleDateString("en-GB")}`]
          .filter(Boolean).join("\n"),
      }).eq("id", contact.id);

      // Send alert to Guido
      const resendKey = process.env.RESEND_API_KEY;
      const alertEmail = process.env.ALERT_EMAIL;
      if (resendKey && alertEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: `bioERGOtech Outreach <${process.env.RESEND_FROM_EMAIL || "outreach@bioergotech.org"}>`,
            to: [alertEmail],
            subject: `✅ MoU Signed — ${contact.name}`,
            text: `Great news!\n\n${contact.name} has signed the Memorandum of Understanding.\n\nDocuSign Envelope ID: ${envelopeId}\nDate: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}\n\nThe MoU status has been updated to Signed in the portal.\n\nView in portal: https://bioergotech.org/member-portal\n\nbioERGOtech Outreach System`,
          }),
        });
      }

      console.log(`[DocuSign Webhook] ✅ MoU signed by ${contact.name}`);

    } else if (status === "declined") {
      await db.from("outreach_contacts").update({
        mou_status:   "Not started",
        notes: [contact.notes || "", `[DocuSign] MoU signing declined ${new Date().toLocaleDateString("en-GB")}`]
          .filter(Boolean).join("\n"),
      }).eq("id", contact.id);

    } else if (status === "voided") {
      await db.from("outreach_contacts").update({
        mou_status: "Not started",
        notes: [contact.notes || "", `[DocuSign] Envelope voided ${new Date().toLocaleDateString("en-GB")}`]
          .filter(Boolean).join("\n"),
      }).eq("id", contact.id);
    }

    return NextResponse.json({ received: true, envelopeId, status });

  } catch (e) {
    console.error("[DocuSign Webhook Error]", e);
    // Always 200 — DocuSign retries on non-200
    return NextResponse.json({ received: true, error: "Parse error" }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "bioERGOtech DocuSign webhook" });
}
