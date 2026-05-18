import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// ── Gmail helpers ──────────────────────────────────────────────────────────

async function getGmailAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Gmail token error: ${data.error} — ${data.error_description}`);
  return data.access_token;
}

async function gmailFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res.json();
}

function decodeBase64(str: string): string {
  try {
    return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  } catch { return ""; }
}

function extractEmailBody(payload: Record<string, unknown>): string {
  // Try to get plain text body from the email
  const tryPart = (p: Record<string, unknown>): string => {
    if (p.mimeType === "text/plain" && p.body) {
      const body = p.body as Record<string, unknown>;
      if (body.data) return decodeBase64(body.data as string);
    }
    if (p.parts && Array.isArray(p.parts)) {
      for (const part of p.parts) {
        const result = tryPart(part as Record<string, unknown>);
        if (result) return result;
      }
    }
    return "";
  };
  return tryPart(payload);
}

function getHeader(headers: Array<{name: string; value: string}>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

// ── Claude classifier ──────────────────────────────────────────────────────

async function classifyReply(emailBody: string, institutionName: string): Promise<{
  classification: "Hot" | "Warm" | "Cold" | "Question" | "OOO" | "Redirect";
  reason: string;
  suggestedReply: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { classification: "Warm", reason: "No Claude API key — defaulted to Warm", suggestedReply: "" };
  }

  const prompt = `You are the outreach assistant for bioERGOtech Foundation, a non-profit in Taranto, Italy focused on ergonomics, AI health tools, and Mediterranean research partnerships.

We sent a partnership outreach email to ${institutionName}. They replied. Classify the reply and draft a follow-up.

REPLY TEXT:
"""
${emailBody.slice(0, 2000)}
"""

Respond ONLY with valid JSON in this exact format:
{
  "classification": "Hot|Warm|Cold|Question|OOO|Redirect",
  "reason": "one sentence explanation",
  "suggestedReply": "a professional 3-4 sentence follow-up email from Guido Putignano"
}

Classification guide:
- Hot: clear positive interest, wants to meet/discuss, open to partnership
- Warm: mildly positive, wants more info, not urgent
- Cold: polite decline, no interest, wrong department
- Question: asking for more information before deciding
- OOO: automated out-of-office reply
- Redirect: forwarded/redirected to another person`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("Claude classify error:", e);
    return { classification: "Warm", reason: "Classification failed", suggestedReply: "" };
  }
}

// ── Alert system ───────────────────────────────────────────────────────────

async function sendEmailAlert(contact: Record<string, unknown>, classification: string, emailBody: string, suggestedReply: string) {
  const alertEmail = process.env.ALERT_EMAIL;
  const resendKey  = process.env.RESEND_API_KEY;
  if (!alertEmail || !resendKey) return;

  const statusEmoji = classification === "Hot" ? "🔥" : classification === "Warm" ? "🌤️" : "📬";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: `bioERGOtech Outreach <${process.env.RESEND_FROM_EMAIL || "outreach@bioergotech.org"}>`,
      to: [alertEmail],
      subject: `${statusEmoji} ${classification} lead: ${contact.name} (${contact.country})`,
      text: `
${statusEmoji} NEW ${classification.toUpperCase()} LEAD DETECTED

Institution: ${contact.name}
Country: ${contact.country}
Contact: ${contact.contact_person || "—"}
Email: ${contact.email}
Field: ${contact.field_of_interest || "—"}

━━━ THEIR REPLY ━━━
${emailBody.slice(0, 800)}

━━━ SUGGESTED RESPONSE ━━━
${suggestedReply || "Draft your own response based on the reply above."}

━━━ ACTION REQUIRED ━━━
View in portal: https://bioergotech.org/member-portal
${classification === "Hot" ? "⚡ Reply within 24 hours — this is a hot lead." : "Reply when convenient."}
      `.trim(),
    }),
  });
}

async function sendWhatsAppAlert(contact: Record<string, unknown>, classification: string, reason: string) {
  const phone     = process.env.WHATSAPP_PHONE;
  const apiKey    = process.env.CALLMEBOT_API_KEY;
  if (!phone || !apiKey) return;

  const emoji = classification === "Hot" ? "🔥" : "🌤️";
  const message = `${emoji} *${classification} lead* — ${contact.name} (${contact.country}) replied to your bioERGOtech outreach. ${reason}. Check your email for the full reply and suggested response.`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
  await fetch(url).catch(() => {}); // fire and forget
}

// ── Main cron handler ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Security: only allow Vercel cron or requests with correct secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check all required env vars
  const missing = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_USER"]
    .filter(k => !process.env[k]);
  if (missing.length) {
    return NextResponse.json({ error: "Missing env vars", missing }, { status: 500 });
  }

  const results: Array<Record<string, unknown>> = [];

  try {
    const accessToken = await getGmailAccessToken();
    const db = getDB();

    // Search for unread emails that are replies (subject starts with Re:)
    // Only look at emails received in the last 24 hours to avoid processing old mail
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const searchQuery = `is:unread subject:Re: after:${since}`;

    const listRes = await gmailFetch(
      `/users/${process.env.GMAIL_USER}/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`,
      accessToken
    );

    if (!listRes.messages?.length) {
      return NextResponse.json({ checked: true, newReplies: 0, message: "No new unread replies found" });
    }

    // Load all contact emails from DB for matching
    const { data: allContacts } = await db
      .from("outreach_contacts")
      .select("id, name, email, country, contact_person, field_of_interest, email_status, response_status");

    const contactEmailMap = new Map<string, Record<string, unknown>>();
    (allContacts || []).forEach(c => {
      if (c.email) contactEmailMap.set(c.email.toLowerCase().trim(), c);
    });

    // Process each unread reply
    for (const msg of listRes.messages.slice(0, 10)) {
      try {
        const fullMsg = await gmailFetch(
          `/users/${process.env.GMAIL_USER}/messages/${msg.id}?format=full`,
          accessToken
        );

        const headers = fullMsg.payload?.headers || [];
        const fromHeader = getHeader(headers, "from");
        const subject    = getHeader(headers, "subject");

        // Extract sender email from "Name <email>" format
        const emailMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
        const senderEmail = emailMatch?.[1]?.toLowerCase().trim();
        if (!senderEmail) continue;

        // Match sender to a contact in our database
        const contact = contactEmailMap.get(senderEmail);
        if (!contact) {
          // Not one of our outreach contacts — skip
          continue;
        }

        // Don't reprocess if already classified as Hot/Call/MoU/Signed
        const alreadyAdvanced = ["Hot","Call Scheduled","Call Done","MoU Sent","Signed"].includes(
          contact.email_status as string
        );
        if (alreadyAdvanced) continue;

        // Get email body
        const body = extractEmailBody(fullMsg.payload || {});
        if (!body) continue;

        // Skip obvious out-of-office if not interested in tracking them
        const isOOO = /out of office|absent|vacation|holiday|auto.?reply/i.test(body.slice(0, 200));

        // Classify with Claude
        const { classification, reason, suggestedReply } = await classifyReply(body, contact.name as string);

        // Map classification to email_status
        const newEmailStatus = classification === "Hot"      ? "Replied"
                             : classification === "Warm"     ? "Replied"
                             : classification === "Question" ? "Replied"
                             : classification === "OOO"      ? (contact.email_status as string) // don't change status for OOO
                             : contact.email_status as string;

        // Update contact in Supabase
        await db.from("outreach_contacts").update({
          email_status:    newEmailStatus,
          response_status: classification,
          notes: [
            contact.notes || "",
            `[Auto] ${new Date().toLocaleDateString("en-GB")} — ${classification}: ${reason}`,
            suggestedReply ? `Suggested reply: ${suggestedReply.slice(0, 200)}…` : "",
          ].filter(Boolean).join("\n\n"),
        }).eq("id", contact.id);

        // Send alerts for Hot and Warm leads (not OOO/Cold)
        if (["Hot", "Warm", "Question"].includes(classification)) {
          await sendEmailAlert(contact, classification, body, suggestedReply);
          if (classification === "Hot") {
            await sendWhatsAppAlert(contact, classification, reason);
          }
        }

        // Mark email as read in Gmail
        await gmailFetch(
          `/users/${process.env.GMAIL_USER}/messages/${msg.id}/modify`,
          accessToken,
          { method: "POST", body: JSON.stringify({ removeLabelIds: ["UNREAD"] }) }
        );

        results.push({
          contact: contact.name,
          email:   senderEmail,
          subject,
          classification,
          reason,
          alerted: ["Hot","Warm","Question"].includes(classification),
        });

      } catch (msgError) {
        console.error(`Error processing message ${msg.id}:`, msgError);
      }
    }

    return NextResponse.json({
      checked: true,
      newReplies: results.length,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error("[Check replies cron error]", e);
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Unknown error",
    }, { status: 500 });
  }
}
