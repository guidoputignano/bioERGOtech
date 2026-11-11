/**
 * Research Centres campaign: the one function that sends a message.
 * Used by the Send button and by the daily job, so both apply the same
 * gate, the same atomic claim and the same bookkeeping.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSendable, idempotencyKey, inSendWindow, parseAllowedSenders, sequenceDueDates } from "./core";
import { sendViaGmail, sendViaResend, type SendResult } from "./mailer";
import { loadSuppressions, logEvent, sentTodayCount, touchInstitution, type Campaign } from "./server";

export type DispatchResult =
  | { id: string; status: "sent" }
  | { id: string; status: "queued"; reason: string }
  | { id: string; status: "blocked" | "skipped"; reasons: string[] }
  | { id: string; status: "failed"; error: string };

const PRE_CONTACT = new Set(["discovered", "verified", "approved"]);

export async function dispatchMessage(
  db: SupabaseClient, campaign: Campaign, messageId: string, actor: string,
  opts: { now?: Date; queueOutsideWindow: boolean },
): Promise<DispatchResult> {
  const now = opts.now ?? new Date();
  const { data: message } = await db.from("rc_messages").select("*").eq("id", messageId).maybeSingle();
  if (!message || message.campaign_id !== campaign.id) return { id: messageId, status: "skipped", reasons: ["Message not found"] };
  const [{ data: institution }, { data: contact }, suppress, sentToday] = await Promise.all([
    db.from("rc_institutions").select("id, name, status, ineligible_reason, followups_paused").eq("id", message.institution_id).maybeSingle(),
    message.contact_id
      ? db.from("rc_contacts").select("id, email, approved_for_contact, institution_id, followups_paused, timezone").eq("id", message.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadSuppressions(db),
    sentTodayCount(db, campaign.id),
  ]);

  const reasons = checkSendable({
    campaign, institution, contact, message,
    suppressedEmails: suppress.emails, suppressedDomains: suppress.domains,
    allowedSenders: parseAllowedSenders(process.env.RC_ALLOWED_SENDERS), sentToday: 0,
  });
  if (reasons.length) return { id: messageId, status: "blocked", reasons };

  // Over the daily cap: wait for the next daily run rather than refusing.
  if (sentToday >= campaign.daily_send_cap) {
    if (!message.scheduled_for) {
      await db.from("rc_messages").update({ scheduled_for: now.toISOString(), updated_at: now.toISOString() }).eq("id", message.id).eq("state", "approved");
    }
    return { id: messageId, status: "queued", reason: `Daily limit of ${campaign.daily_send_cap} reached: queued for the next daily run` };
  }

  // Only inside the recipient's business hours. Outside them the message is
  // queued for the next daily run, never sent at night.
  if (!inSendWindow(contact?.timezone ?? null, now, campaign.send_window_start, campaign.send_window_end)) {
    if (opts.queueOutsideWindow && !message.scheduled_for) {
      await db.from("rc_messages").update({ scheduled_for: now.toISOString(), updated_at: now.toISOString() }).eq("id", message.id).eq("state", "approved");
    }
    return { id: messageId, status: "queued", reason: "Outside the recipient's business hours: queued for the next daily run" };
  }

  // Claim: approved → sending, only if still approved.
  const { data: claimed } = await db.from("rc_messages")
    .update({ state: "sending", attempts: (message.attempts ?? 0) + 1, idempotency_key: idempotencyKey(message.id), updated_at: now.toISOString() })
    .eq("id", message.id).eq("state", "approved").select("id").maybeSingle();
  if (!claimed) return { id: messageId, status: "skipped", reasons: ["Already being sent or no longer approved"] };

  // Thread: follow-ups and replies answer the latest message with this institution.
  let inReplyTo: string | null = null, references: string | null = null, gmailThreadId: string | null = null;
  if (message.step !== "initial") {
    const { data: chain } = await db.from("rc_messages").select("rfc_message_id, thread_id")
      .eq("institution_id", message.institution_id).in("state", ["sent", "received"]).not("rfc_message_id", "is", null)
      .order("created_at", { ascending: true });
    const ids = (chain || []).map((c) => c.rfc_message_id as string);
    inReplyTo = ids[ids.length - 1] ?? null;
    references = ids.length > 1 ? ids.slice(-10, -1).join(" ") : null;
    gmailThreadId = [...(chain || [])].reverse().find((c) => c.thread_id)?.thread_id ?? null;
  }

  try {
    const mail = {
      fromName: campaign.sender_name, fromEmail: campaign.sender_email!, replyTo: campaign.reply_to,
      to: contact!.email!, subject: message.subject!, text: message.body!, inReplyTo, references, gmailThreadId,
    };
    let sent: SendResult;
    if (campaign.sender_provider === "gmail") {
      const token = process.env.RC_GMAIL_REFRESH_TOKEN;
      if (!token) throw new Error("RC_GMAIL_REFRESH_TOKEN not configured");
      sent = await sendViaGmail(mail, token, campaign.sender_email!);
    } else {
      const key = process.env.RESEND_API_KEY;
      if (!key) throw new Error("RESEND_API_KEY not configured");
      sent = await sendViaResend(mail, key, idempotencyKey(message.id));
    }
    await db.from("rc_messages").update({
      state: "sent", sent_at: now.toISOString(), scheduled_for: null, provider: sent.provider, provider_message_id: sent.providerMessageId || null,
      rfc_message_id: sent.rfcMessageId, thread_id: sent.threadId, in_reply_to: inReplyTo, from_email: campaign.sender_email,
      error_message: null, updated_at: now.toISOString(),
    }).eq("id", message.id);

    const instPatch: Record<string, unknown> = {};
    if (message.step === "initial") {
      // Schedule the pre-approved follow-ups from the initial send time.
      const due = sequenceDueDates(now, campaign);
      await db.from("rc_messages").update({ scheduled_for: due.followup1.toISOString() })
        .eq("institution_id", message.institution_id).eq("step", "followup1").neq("state", "cancelled").eq("historical", false);
      await db.from("rc_messages").update({ scheduled_for: due.followup2.toISOString() })
        .eq("institution_id", message.institution_id).eq("step", "followup2").neq("state", "cancelled").eq("historical", false);
      if (institution && PRE_CONTACT.has(institution.status)) instPatch.status = "contacted";
      Object.assign(instPatch, { next_action: "Follow-up 1 if no reply", next_action_due: due.followup1.toISOString().slice(0, 10) });
    } else if (message.step === "followup1") {
      instPatch.status = "contacted";
      instPatch.next_action = "Final follow-up if no reply";
    } else if (message.step === "followup2") {
      instPatch.status = "contacted";
      instPatch.next_action = "No reply yet: marked No Response after the grace period";
    }
    await touchInstitution(db, message.institution_id, instPatch);
    await logEvent(db, { campaign_id: campaign.id, institution_id: message.institution_id, actor, action: "message.sent", detail: { message_id: message.id, provider: sent.provider, step: message.step } });
    return { id: messageId, status: "sent" };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Send failed";
    await db.from("rc_messages").update({ state: "failed", error_message: err, updated_at: new Date().toISOString() }).eq("id", message.id);
    await logEvent(db, { campaign_id: campaign.id, institution_id: message.institution_id, actor, action: "message.failed", detail: { message_id: message.id, error: err } });
    return { id: messageId, status: "failed", error: err };
  }
}
