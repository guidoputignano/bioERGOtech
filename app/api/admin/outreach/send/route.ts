import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// POST /api/admin/outreach/send
// Body: { contacts: Contact[], subject: string, body: string, senderName: string, sentBy: string }
export async function POST(request: Request) {
  try {
    const { contacts, subject, body, senderName, sentBy } = await request.json();

    if (!contacts?.length) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }
    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "outreach@bioergotech.org";
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured in environment variables" }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const db = getDB();

    // Fetch the bioERGOtech intro PDF for attachment
    let pdfAttachment: { filename: string; content: string } | null = null;
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bioergotech.org";
      const pdfRes = await fetch(`${siteUrl}/assets/docs/bioergotech-intro.pdf`);
      if (pdfRes.ok) {
        const pdfBuffer = await pdfRes.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
        pdfAttachment = {
          filename: "bioERGOtech-Foundation-Introduction.pdf",
          content: pdfBase64,
        };
      }
    } catch (e) {
      console.warn("Could not load PDF attachment:", e);
    }

    const results: Array<{ id: string; name: string; email: string; status: "sent" | "failed"; error?: string }> = [];

    for (const contact of contacts) {
      if (!contact.email?.includes("@")) {
        results.push({ id: contact.id, name: contact.name, email: contact.email || "", status: "failed", error: "Invalid email" });
        continue;
      }

      // Merge tags
      const contactName = contact.contact_person
        ? contact.contact_person.split(",")[0].trim().split(" ").slice(-1)[0]
        : "Sir/Madam";
      const finalSubject = subject
        .replace(/\{\{name\}\}/g, contactName)
        .replace(/\{\{institution\}\}/g, contact.name || "your institution")
        .replace(/\{\{country\}\}/g, contact.country || "");
      const finalBody = body
        .replace(/\{\{name\}\}/g, contactName)
        .replace(/\{\{institution\}\}/g, contact.name || "your institution")
        .replace(/\{\{country\}\}/g, contact.country || "");

      try {
        const emailPayload: {
          from: string;
          to: string[];
          subject: string;
          text: string;
          attachments?: Array<{ filename: string; content: string }>;
        } = {
          from: `${senderName || "bioERGOtech Foundation"} <${fromEmail}>`,
          to: [contact.email],
          subject: finalSubject,
          text: finalBody,
        };

        // Attach the bioERGOtech intro PDF if loaded successfully
        if (pdfAttachment) {
          emailPayload.attachments = [pdfAttachment];
        }

        const { error: sendError } = await resend.emails.send(emailPayload);

        if (sendError) throw new Error(sendError.message);

        // Update contact status in DB
        await db
          .from("outreach_contacts")
          .update({
            email_status: "Sent",
            sent_date: new Date().toISOString().split("T")[0],
          })
          .eq("id", contact.id);

        // Log the send
        await db.from("outreach_sends").insert({
          contact_id:    contact.id,
          contact_name:  contact.name,
          contact_email: contact.email,
          country:       contact.country || null,
          subject:       finalSubject,
          body_preview:  finalBody.slice(0, 200),
          status:        "sent",
          sent_by:       sentBy || null,
        });

        results.push({ id: contact.id, name: contact.name, email: contact.email, status: "sent" });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Send failed";

        // Log the failure
        await db.from("outreach_sends").insert({
          contact_id:    contact.id,
          contact_name:  contact.name,
          contact_email: contact.email,
          country:       contact.country || null,
          subject:       finalSubject,
          status:        "failed",
          error_message: errMsg,
          sent_by:       sentBy || null,
        });

        results.push({ id: contact.id, name: contact.name, email: contact.email, status: "failed", error: errMsg });
      }

      // Rate limiting — 600ms between sends to stay within Resend limits
      await new Promise((r) => setTimeout(r, 600));
    }

    const sent   = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({ results, sent, failed, total: results.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// GET /api/admin/outreach/send — fetch send log
export async function GET() {
  const { data, error } = await getDB()
    .from("outreach_sends")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data });
}
