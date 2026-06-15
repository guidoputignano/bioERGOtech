import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
    const { contacts, subject, body, senderName, sentBy, bcc } = await request.json();

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

    // Load intro PDF from public folder (filesystem read — no HTTP call)
    let pdfAttachment: { filename: string; content: string } | null = null;
    try {
      const pdfPath = path.join(process.cwd(), "intro.pdf");
      if (fs.existsSync(pdfPath)) {
        pdfAttachment = {
          filename: "bioERGOtech-Foundation-Introduction.pdf",
          content: fs.readFileSync(pdfPath).toString("base64"),
        };
      }
    } catch { /* PDF is optional */ }

    const db = getDB();

    const results: Array<{ id: string; name: string; email: string; status: "sent" | "failed"; error?: string }> = [];

    for (const contact of contacts) {
      if (!contact.email?.includes("@")) {
        results.push({ id: contact.id, name: contact.name, email: contact.email || "", status: "failed", error: "Invalid email" });
        continue;
      }

      // Merge tags
      const contactName = contact.contact_person
        ? (() => {
          const _raw = (contact.contact_person || "").split(",")[0].trim();
          const _m   = _raw.match(/^((?:Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Dott\.|Pr\.)\s+)?([A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF\-]*(?:\s+[A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF\-]*){0,2})/i);
          return _m ? _m[0].trim() : _raw;
        })()
        : "Sir/Madam";
      // field_of_interest (kept for other templates if needed, not used in cold outreach)
      const fieldRaw = contact.field_of_interest?.trim() || "";

      // Normalise special characters — handle both Unicode and already-corrupted UTF-8 bytes
      const clean = (s: string) => s
        // Fix corrupted UTF-8 sequences — match â€ + ANY following char (incl curly quotes)
        .replace(/â€[“”„‘’‚"'–—]/g, "-")
        .replace(/â€/g, "'")   // corrupted apostrophe
        .replace(/â€/g, "-")          // catch any remaining â€ sequence
        .replace(/Ã©/g, "e")          // corrupted é
        .replace(/Ã¼/g, "u")          // corrupted ü
        .replace(/Ã¶/g, "o")          // corrupted ö
        .replace(/Ã¤/g, "a")          // corrupted ä
        // Proper Unicode replacements
        .replace(/\u2013/g, "-").replace(/\u2014/g, "-")
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u201C|\u201D/g, '"')
        // Accent normalisation
        .normalize("NFKD").replace(/[^\x00-\x7F]/g, (c) => {
          const map: Record<string, string> = {
            "à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a",
            "è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i",
            "ï":"i","ò":"o","ó":"o","ô":"o","ö":"o","ù":"u",
            "ú":"u","ü":"u","ý":"y","ñ":"n","ç":"c","ß":"ss",
            "ø":"o","æ":"ae","þ":"th","Ä":"A","Ö":"O","Ü":"U",
            "É":"E","Á":"A","Í":"I","Ó":"O","Ú":"U","Ñ":"N",
            "ł":"l","Ł":"L","ś":"s","Ś":"S","ż":"z","Ż":"Z",
            "ź":"z","Ź":"Z","ń":"n","Ń":"N","ć":"c","Ć":"C",
          };
          return map[c] || "";
        });

      const instName    = clean(contact.name || "your institution");
      const openingLine = `I am reaching out because ${instName}'s work resonates with the direction we are building at the bioERGOtech Foundation.`;
      const finalSubject = clean(subject
        .replace(/\{\{name\}\}/g, contactName)
        .replace(/\{\{institution\}\}/g, instName)
        .replace(/\{\{country\}\}/g, contact.country || "")
        .replace(/\{\{field of interest\}\}/g, fieldRaw)
        .replace(/\{\{field\}\}/g, fieldRaw)
        .replace(/\{\{opening_line\}\}/g, openingLine));
      const finalBody = clean(body
        .replace(/\{\{name\}\}/g, contactName)
        .replace(/\{\{institution\}\}/g, instName)
        .replace(/\{\{country\}\}/g, contact.country || "")
        .replace(/\{\{field of interest\}\}/g, fieldRaw)
        .replace(/\{\{field\}\}/g, fieldRaw)
        .replace(/\{\{opening_line\}\}/g, openingLine));

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
          ...(bcc ? { bcc: [bcc] } : {}),
          subject: finalSubject,
          text: finalBody,
        };


        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            ...emailPayload,
            ...(pdfAttachment ? { attachments: [pdfAttachment] } : {}),
          }),
        });
        if (!sendRes.ok) {
          const errData = await sendRes.json().catch(() => ({}));
          throw new Error(errData.message || errData.name || `Resend error ${sendRes.status}`);
        }

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
