/**
 * Research Centres campaign: storing replies, confirming their class, and
 * identifying the responsible contact. Used by the manual "log a message"
 * route and by the daily job, so both behave the same.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyReply } from "./classify";
import { cancelFollowups, logEvent, touchInstitution } from "./server";
import {
  addBusinessDays, detectOptOut, emailDomain, isValidEmail, LABEL_TO_STATUS, NON_STOPPING_LABELS, normaliseEmail,
  parseReturnDate, REPLY_LABEL_ACTION, suggestTemplate4, timezoneForState, type ReplyLabel,
} from "./core";

export type InboundInput = {
  campaign_id: string; institution_id: string; contact_id: string | null; parent_message_id: string | null;
  from_email: string | null; to_email: string | null; subject: string | null; body: string;
  received_at: string; rfc_message_id?: string | null; in_reply_to?: string | null; thread_id?: string | null;
  provider?: string | null; provider_message_id?: string | null; needsReview?: boolean; historical?: boolean; actor: string;
};

const BEFORE_REPLY = new Set(["discovered", "verified", "approved", "contacted", "followup_due", "no_response"]);

/** Moves queued follow-ups to after an out-of-office return date. */
async function postponeFollowups(db: SupabaseClient, institutionId: string, returnDate: string): Promise<void> {
  const resume = addBusinessDays(new Date(returnDate + "T12:00:00Z"), 1);
  const { data } = await db.from("rc_messages").select("id, scheduled_for")
    .eq("institution_id", institutionId).in("step", ["followup1", "followup2"]).in("state", ["approved", "in_review", "draft"]).not("scheduled_for", "is", null);
  for (const m of data || []) {
    if (new Date(m.scheduled_for).getTime() < resume.getTime()) {
      await db.from("rc_messages").update({ scheduled_for: resume.toISOString(), updated_at: new Date().toISOString() }).eq("id", m.id);
    }
  }
}

export async function storeInbound(db: SupabaseClient, input: InboundInput): Promise<{ messageId: string; label: ReplyLabel; duplicate: boolean; template4: boolean }> {
  if (input.provider && input.provider_message_id) {
    const { data: existing } = await db.from("rc_messages").select("id").eq("provider", input.provider).eq("provider_message_id", input.provider_message_id).maybeSingle();
    if (existing) return { messageId: existing.id, label: "unclear", duplicate: true, template4: false };
  }
  const from = normaliseEmail(input.from_email);
  // Link to a known contact by address when the caller did not.
  let contactId = input.contact_id;
  let respondentAppropriate = false;
  if (from) {
    const { data: c } = await db.from("rc_contacts").select("id, role_assessment").eq("campaign_id", input.campaign_id).eq("institution_id", input.institution_id).ilike("email", from).maybeSingle();
    if (c) { contactId = contactId || c.id; respondentAppropriate = c.role_assessment === "appropriate"; }
  }
  const { data: inst } = await db.from("rc_institutions").select("name, status").eq("id", input.institution_id).single();
  const { data: msg, error } = await db.from("rc_messages").insert({
    campaign_id: input.campaign_id, institution_id: input.institution_id, contact_id: contactId,
    direction: "inbound", step: "inbound", parent_message_id: input.parent_message_id, state: "received",
    historical: !!input.historical, from_email: from, to_email: normaliseEmail(input.to_email),
    subject: input.subject, body: input.body, received_at: input.received_at,
    rfc_message_id: input.rfc_message_id ?? null, in_reply_to: input.in_reply_to ?? null, thread_id: input.thread_id ?? null,
    provider: input.provider ?? null, provider_message_id: input.provider_message_id ?? null,
    error_message: input.needsReview ? "Matched by domain only: check it belongs to this conversation" : null,
  }).select("id").single();
  if (error || !msg) throw new Error(error?.message || "Could not store reply");

  const c = await classifyReply(input.body, inst?.name || "the institution");
  const optOut = detectOptOut(input.body);
  const returnDate = c.label === "out_of_office" ? parseReturnDate(input.body, new Date(input.received_at)) : null;
  await db.from("rc_reply_labels").insert({
    message_id: msg.id, label: c.label, source: c.source, confidence: c.confidence, rationale: c.rationale,
    opt_out: optOut, return_date: returnDate,
  });
  const template4 = suggestTemplate4(c.label, respondentAppropriate, input.body);

  if (!input.historical) {
    const patch: Record<string, unknown> = {};
    if (NON_STOPPING_LABELS.has(c.label)) {
      // Automatic messages keep the sequence going; out-of-office pushes it back.
      if (returnDate) await postponeFollowups(db, input.institution_id, returnDate);
      patch.next_action = c.label === "out_of_office" ? `Out of office${returnDate ? ` until ${returnDate}` : ""}: follow-ups wait` : null;
    } else {
      // Any meaningful reply stops follow-ups at once, before anyone reviews it.
      await cancelFollowups(db, input.institution_id, "Reply received");
      if (inst && BEFORE_REPLY.has(inst.status)) patch.status = "responded";
      patch.next_action = `Review reply: ${REPLY_LABEL_ACTION[c.label]}`;
    }
    if (optOut && from) {
      await db.from("rc_suppressions").upsert({ value: from, kind: "email", reason: "no_further_contact", source_message_id: msg.id }, { onConflict: "kind,value", ignoreDuplicates: true });
      await cancelFollowups(db, input.institution_id, "Opt-out requested");
    }
    await touchInstitution(db, input.institution_id, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
  }
  await logEvent(db, { campaign_id: input.campaign_id, institution_id: input.institution_id, actor: input.actor, action: input.historical ? "history.inbound" : "reply.received", detail: { message_id: msg.id, suggested: c.label, source: c.source, optOut, returnDate } });
  return { messageId: msg.id, label: c.label, duplicate: false, template4 };
}

export type ReferralInput = { person_name?: string | null; person_title?: string | null; department?: string | null; email?: string | null };

/**
 * A person confirms or corrects the class. Only now does the pipeline stage
 * change. Optional: mark the respondent's role, record an opt-out, add the
 * person they referred us to (linked to the respondent).
 */
export async function confirmLabel(db: SupabaseClient, args: {
  messageId: string; label: ReplyLabel; userId: string; actor: string;
  optOut?: boolean; respondentRole?: "appropriate" | "not_appropriate" | null; referral?: ReferralInput | null;
}): Promise<{ referredContactId: string | null }> {
  const { data: m } = await db.from("rc_messages").select("id, campaign_id, institution_id, contact_id, from_email, direction, historical").eq("id", args.messageId).single();
  if (!m || m.direction !== "inbound") throw new Error("Not an inbound message");
  const now = new Date().toISOString();
  await db.from("rc_reply_labels").insert({ message_id: m.id, label: args.label, source: "human", opt_out: !!args.optOut, confirmed_by: args.userId, confirmed_at: now });

  // The respondent becomes a contact if they are not one yet.
  let respondentId = m.contact_id as string | null;
  if (!respondentId && m.from_email && isValidEmail(m.from_email)) {
    const { data: inst } = await db.from("rc_institutions").select("state").eq("id", m.institution_id).single();
    const { data: created } = await db.from("rc_contacts").insert({
      campaign_id: m.campaign_id, institution_id: m.institution_id, email: m.from_email, verification: "provided_by_institution",
      source_url: null, notes: "Replied to our enquiry", timezone: timezoneForState(inst?.state), verified_on: now.slice(0, 10),
    }).select("id").maybeSingle();
    respondentId = created?.id ?? null;
    if (respondentId) await db.from("rc_messages").update({ contact_id: respondentId }).eq("id", m.id);
  }
  if (respondentId && args.respondentRole) {
    await db.from("rc_contacts").update({ role_assessment: args.respondentRole, ...(args.respondentRole === "appropriate" ? { is_primary: true } : {}), updated_at: now }).eq("id", respondentId);
  }

  // Referral: the named person, linked to who referred us.
  let referredContactId: string | null = null;
  if (args.referral && (args.referral.email || args.referral.person_name)) {
    const email = normaliseEmail(args.referral.email);
    if (email && !isValidEmail(email)) throw new Error("The referred e-mail address is not valid");
    const { data: inst } = await db.from("rc_institutions").select("state").eq("id", m.institution_id).single();
    const { data: ref, error } = await db.from("rc_contacts").insert({
      campaign_id: m.campaign_id, institution_id: m.institution_id, email, person_name: args.referral.person_name || null,
      person_title: args.referral.person_title || null, department: args.referral.department || null,
      verification: email ? "provided_by_institution" : "unverified", role_assessment: "appropriate",
      referred_by_contact_id: respondentId, referred_in_message_id: m.id, timezone: timezoneForState(inst?.state),
      verified_on: now.slice(0, 10), notes: "Named in the institution's reply",
    }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "That address is already a contact in this campaign" : error.message);
    referredContactId = ref.id;
  }

  const patch: Record<string, unknown> = {};
  const status = LABEL_TO_STATUS[args.label];
  if (status && !m.historical) patch.status = status;
  if (!NON_STOPPING_LABELS.has(args.label)) await cancelFollowups(db, m.institution_id, `Reply: ${args.label}`);
  if (args.optOut && m.from_email) {
    await db.from("rc_suppressions").upsert({ value: m.from_email, kind: "email", reason: "no_further_contact", source_message_id: m.id }, { onConflict: "kind,value", ignoreDuplicates: true });
  }
  if (args.label === "not_eligible") patch.ineligible_reason = "Eligibility restriction stated in their reply";

  const taskFor: Partial<Record<ReplyLabel, { type: string; objective: string }>> = {
    interested: { type: "reply", objective: "Prepare a next-step reply and record the engagement details" },
    more_info: { type: "reply", objective: "Answer their questions in the thread" },
    meeting_requested: { type: "meeting", objective: "Coordinate the meeting (priority)" },
    fee_request: { type: "quote", objective: "Ask for an itemised written quotation; record the cost lines" },
    referred: { type: "referral", objective: "Verify the referred contact, approve it and write to them in the thread" },
    requests_coordinator: { type: "reply", objective: "Review and send Template 4" },
    unclear: { type: "other", objective: "Read the reply and decide the next step" },
  };
  const t = taskFor[args.label];
  if (t && !m.historical) {
    await db.from("rc_tasks").insert({ campaign_id: m.campaign_id, institution_id: m.institution_id, contact_id: referredContactId || respondentId, related_message_id: m.id, task_type: t.type, objective: t.objective });
    patch.next_action = t.objective;
  } else if (status) {
    patch.next_action = null;
  }
  await touchInstitution(db, m.institution_id, patch);
  await logEvent(db, { campaign_id: m.campaign_id, institution_id: m.institution_id, actor: args.actor, action: "reply.label_confirmed", detail: { message_id: m.id, label: args.label, referral: !!referredContactId, sender_domain: emailDomain(m.from_email) } });
  return { referredContactId };
}

/** Logs an outbound message sent before the platform (original NY outreach). Never triggers anything. */
export async function logHistoricalOutbound(db: SupabaseClient, input: {
  campaign_id: string; institution_id: string; contact_id: string | null; from_email: string | null; to_email: string | null;
  subject: string | null; body: string; sent_at: string; actor: string;
}): Promise<string> {
  const { data, error } = await db.from("rc_messages").insert({
    campaign_id: input.campaign_id, institution_id: input.institution_id, contact_id: input.contact_id, direction: "outbound",
    step: "custom", historical: true, state: "sent", from_email: normaliseEmail(input.from_email), to_email: normaliseEmail(input.to_email),
    subject: input.subject, body: input.body, sent_at: input.sent_at, provider: "history",
  }).select("id").single();
  if (error || !data) throw new Error(error?.message || "Could not store the message");
  await touchInstitution(db, input.institution_id);
  await logEvent(db, { campaign_id: input.campaign_id, institution_id: input.institution_id, actor: input.actor, action: "history.outbound", detail: { message_id: data.id } });
  return data.id;
}
