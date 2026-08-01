// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

function firstName(contactPerson: string | null): string {
  const raw = (contactPerson || "")
    .split(",")[0].split(" — ")[0].split(" - ")[0].trim();
  if (!raw) return "Sir/Madam";
  const m = raw.match(/^((?:Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Dott\.|Pr\.)\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-]*){0,2})/i);
  return (m ? m[0].trim() : raw) || "Sir/Madam";
}

function daysOutstanding(mouSentAt: string | null): number {
  if (!mouSentAt) return 0;
  const ms = Date.now() - new Date(mouSentAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function emailTemplate(cadenceStep: number, contactName: string, instName: string) {
  const signOff = `\n\nWith warm regards,\n\nGuido Putignano\nPresident, bioERGOtech Foundation\nbioergotech.org`;

  if (cadenceStep === 1) {
    return {
      subject: `Following up on the MoU – bioERGOtech Foundation × ${instName}`,
      text: `Dear ${contactName},

I'm following up on the MoU I sent a week ago. I understand things get busy, so no rush at all, but I wanted to make sure it reached you and to say I'm happy to discuss any questions you or your team may have.

Please let me know if anything in the document needs clarification, or if it would help to schedule a short call.${signOff}`,
    };
  }

  return {
    subject: `Checking in – bioERGOtech Foundation × ${instName}`,
    text: `Dear ${contactName},

I wanted to check in again regarding the Memorandum of Understanding I shared with you. I remain genuinely enthusiastic about the prospect of working together, and I'd welcome the chance to address any questions or adjust the document to better fit your institution's needs.

Whenever it's convenient for you, I'm glad to pick this up.${signOff}`,
  };
}

async function sendAlertEmail(resendKey: string, fromEmail: string, alertEmail: string, contact: Record<string, unknown>, daysOut: number) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: `bioERGOtech Outreach <${fromEmail}>`,
      to: [alertEmail],
      subject: `📋 Manual MoU follow-up needed: ${contact.name}`,
      text: `Manual follow-up is due for this MoU.

Institution: ${contact.name}
Contact: ${contact.contact_person || "—"}
Email: ${contact.email}
Country: ${contact.country || "—"}
Days outstanding: ${daysOut}

This lead is at 45+ days since the MoU was sent with no reply. A personal touch (call, LinkedIn message, or a tailored email) is recommended.

View in portal: https://bioergotech.org/member-portal`,
    }),
  });
}

export async function GET(req: NextRequest) {
  // Fail closed: senza CRON_SECRET configurato la rotta non si apre, si spegne.
  // Prima il controllo era dentro `if (cronSecret)`, quindi un segreto non
  // impostato lasciava l'endpoint raggiungibile da chiunque.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET non configurato: cron rifiutato.");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  {
    // Vercel Cron manda il segreto nell'header. La forma ?secret= resta
    // accettata per l'esecuzione manuale, ma finisce nei log: preferire l'header.
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const valid = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "outreach@bioergotech.org";
  const alertEmail = process.env.ALERT_EMAIL;

  let emailSent = 0;
  let manualDue = 0;
  let errors = 0;

  try {
    const db = getDB();

    const { data: dueFollowups } = await db
      .from("mou_followups")
      .select("id, lead_id, cadence_step, channel, scheduled_for, status")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(100);

    for (const followup of dueFollowups || []) {
      try {
        const { data: contact } = await db
          .from("outreach_contacts")
          .select("id, name, email, country, contact_person, mou_sent_at, funnel_stage")
          .eq("id", followup.lead_id)
          .single();

        if (!contact || contact.funnel_stage !== "mou_sent") continue;

        const daysOut = daysOutstanding(contact.mou_sent_at);

        if (followup.channel === "email") {
          if (!resendKey || !contact.email?.includes("@")) { errors++; continue; }

          const contactName = firstName(contact.contact_person);
          const instName = contact.name || "your institution";
          const { subject, text } = emailTemplate(followup.cadence_step, contactName, instName);

          const sendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: `Guido Putignano · bioERGOtech Foundation <${fromEmail}>`,
              to: [contact.email],
              subject,
              text,
            }),
          });

          if (sendRes.ok) {
            await db.from("mou_followups").update({
              status: "sent",
              sent_at: new Date().toISOString(),
            }).eq("id", followup.id);

            await db.from("mou_followup_log").insert({
              lead_id: contact.id,
              followup_id: followup.id,
              actor: "system",
              message_summary: `Day ${followup.cadence_step === 1 ? 7 : 21} MoU follow-up email sent`,
            });

            emailSent++;
          } else {
            errors++;
          }

          await new Promise((r) => setTimeout(r, 500));
        } else if (followup.channel === "manual") {
          manualDue++;
          if (alertEmail && resendKey) {
            await sendAlertEmail(resendKey, fromEmail, alertEmail, contact, daysOut);
            await new Promise((r) => setTimeout(r, 500));
          }
          // Leave status as 'pending' so it keeps surfacing.
        }
      } catch (e) {
        console.error(`[mou-followup] Error processing followup ${followup.id}:`, e);
        errors++;
      }
    }

    return NextResponse.json({
      checked: true,
      emailSent,
      manualDue,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[mou-followup cron error]", e);
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Unknown error",
    }, { status: 500 });
  }
}
