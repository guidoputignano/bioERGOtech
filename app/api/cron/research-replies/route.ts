import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cancelFollowups, loadCampaign, logEvent, type Campaign } from "@/lib/research-campaign/server";
import { storeInbound } from "@/lib/research-campaign/ingest";
import { dispatchMessage } from "@/lib/research-campaign/dispatch";
import { gmailAccessToken } from "@/lib/research-campaign/mailer";
import { callingWindow, followupDecision, matchInbound, normaliseEmail, sequenceDueDates, type ReplyLabel } from "@/lib/research-campaign/core";

/**
 * Research Centres campaign: daily job (weekdays 17:00 UTC, inside office
 * hours in every continental US time zone). In this order:
 *
 *  1. Reply sync: reads the campaign mailbox (read-only) and attaches
 *     replies by thread, headers, address or domain. Done FIRST so that a
 *     reply that arrived overnight stops today's follow-up.
 *  2. Follow-ups that are due and were pre-approved with their initial
 *     e-mail: re-checked against replies and every send gate, then sent in
 *     the same thread, cancelled, or postponed (out of office).
 *  3. Approved messages queued because they were sent outside business hours.
 *  4. No Response: Day 7 + grace passed with no meaningful reply → stage
 *     "No response", e-mail stops, call task for priority A/B with a phone.
 *
 * Re-running the job is harmless: every send claims its message atomically,
 * and the database allows one message per sequence step per institution.
 * Separate from /api/cron/check-replies (Outreach & MoU Pipeline).
 */
export const maxDuration = 300;

function decode(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
function plainText(p: Part): string {
  if (p.mimeType === "text/plain" && p.body?.data) return decode(p.body.data);
  for (const c of p.parts || []) { const t = plainText(c); if (t) return t; }
  if (p.mimeType === "text/html" && p.body?.data) return decode(p.body.data).replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}

async function syncReplies(db: SupabaseClient, campaign: Campaign, report: { repliesStored: number; unmatched: number; errors: string[] }) {
  const token = process.env.RC_GMAIL_REFRESH_TOKEN;
  const mailbox = process.env.RC_GMAIL_USER || campaign.reply_mailbox;
  if (!token || !mailbox) { report.errors.push("reply sync skipped: RC_GMAIL_REFRESH_TOKEN / RC_GMAIL_USER not set"); return false; }
  const [{ data: outbound }, { data: insts }, { data: contacts }] = await Promise.all([
    db.from("rc_messages").select("id, institution_id, contact_id, rfc_message_id, thread_id, to_email").eq("campaign_id", campaign.id).eq("direction", "outbound").eq("state", "sent").order("sent_at"),
    db.from("rc_institutions").select("id, domain").eq("campaign_id", campaign.id),
    db.from("rc_contacts").select("id, institution_id, email").eq("campaign_id", campaign.id),
  ]);
  if (!outbound?.length) return true;
  const access = await gmailAccessToken(token);
  const g = async (path: string) => {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}${path}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!r.ok) throw new Error(`Gmail ${r.status}`);
    return r.json();
  };
  const self = normaliseEmail(campaign.sender_email);
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const list = await g(`/messages?q=${encodeURIComponent("newer_than:21d -from:me -in:chats")}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
    for (const ref of list.messages || []) {
      const { data: seen } = await db.from("rc_messages").select("id").eq("provider", "gmail").eq("provider_message_id", ref.id).maybeSingle();
      if (seen) continue;
      const full = await g(`/messages/${ref.id}?format=full`);
      const headers: { name: string; value: string }[] = full.payload?.headers || [];
      const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n)?.value || null;
      const from = h("from");
      const fromAddr = normaliseEmail(from?.match(/<([^>]+)>/)?.[1] ?? from);
      if (fromAddr === self) continue;
      const match = matchInbound({ from, threadId: full.threadId, inReplyTo: h("in-reply-to"), references: h("references") }, outbound, insts || [], contacts || []);
      if (!match.matched) { report.unmatched++; continue; }
      await storeInbound(db, {
        campaign_id: campaign.id, institution_id: match.institution_id, contact_id: match.contact_id, parent_message_id: match.parent_id,
        from_email: fromAddr, to_email: mailbox, subject: h("subject"), body: plainText(full.payload || {}) || full.snippet || "",
        received_at: full.internalDate ? new Date(Number(full.internalDate)).toISOString() : new Date().toISOString(),
        rfc_message_id: h("message-id"), in_reply_to: h("in-reply-to"), thread_id: full.threadId,
        provider: "gmail", provider_message_id: ref.id, needsReview: match.needsReview, actor: "cron",
      });
      report.repliesStored++;
    }
    pageToken = list.nextPageToken;
    pages++;
  } while (pageToken && pages < 5);
  return true;
}

/** Inbound messages since a date, each with its best class (confirmed first, else latest suggestion). */
async function inboundSince(db: SupabaseClient, institutionId: string, since: string) {
  const { data } = await db.from("rc_messages").select("id, received_at, created_at, rc_reply_labels(label, return_date, confirmed_at, created_at)")
    .eq("institution_id", institutionId).eq("direction", "inbound").eq("historical", false);
  return (data || []).filter((m) => (m.received_at || m.created_at) >= since).map((m) => {
    const labels = ((m.rc_reply_labels as { label: ReplyLabel; return_date: string | null; confirmed_at: string | null; created_at: string }[]) || [])
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const best = labels.find((l) => l.confirmed_at) || labels[0] || null;
    return { label: best?.label ?? null, return_date: best?.return_date ?? null };
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const campaign = await loadCampaign(db);
  if (!campaign || campaign.status === "closed") return NextResponse.json({ skipped: "No open campaign" });
  const now = new Date();
  const report = { repliesStored: 0, unmatched: 0, followupsSent: 0, followupsCancelled: 0, followupsPostponed: 0, followupsHeld: 0, queuedSent: 0, noResponse: 0, callTasks: 0, errors: [] as string[] };

  // 1. Replies first.
  let synced = false;
  try { synced = await syncReplies(db, campaign, report); }
  catch (e) { report.errors.push(`replies: ${e instanceof Error ? e.message : String(e)}`); }

  // 2 + 3. Due messages. Without a successful sync, follow-ups wait: we
  // must not chase someone whose reply we have not read.
  const { data: due } = await db.from("rc_messages").select("id, institution_id, step, parent_message_id, scheduled_for")
    .eq("campaign_id", campaign.id).eq("direction", "outbound").eq("state", "approved").eq("historical", false)
    .not("scheduled_for", "is", null).lte("scheduled_for", now.toISOString()).order("scheduled_for");
  for (const m of due || []) {
    try {
      const isFollowup = m.step === "followup1" || m.step === "followup2";
      if (isFollowup) {
        if (!synced) { report.followupsHeld++; continue; }
        const { data: initial } = await db.from("rc_messages").select("sent_at").eq("id", m.parent_message_id).maybeSingle();
        if (!initial?.sent_at) { report.followupsHeld++; continue; }
        const decision = followupDecision({ inboundSinceInitial: await inboundSince(db, m.institution_id, initial.sent_at), today: now });
        if (decision.action === "cancel") {
          await cancelFollowups(db, m.institution_id, decision.reason);
          report.followupsCancelled++;
          continue;
        }
        if (decision.action === "postpone") {
          await db.from("rc_messages").update({ scheduled_for: new Date(decision.until + "T12:00:00Z").toISOString() }).eq("id", m.id).eq("state", "approved");
          report.followupsPostponed++;
          continue;
        }
      }
      const r = await dispatchMessage(db, campaign, m.id, "cron", { now, queueOutsideWindow: false });
      if (r.status === "sent") { if (isFollowup) report.followupsSent++; else report.queuedSent++; await new Promise((res) => setTimeout(res, 1500)); }
      else if (r.status === "blocked" && isFollowup) {
        // Due but not sendable (cap, pause, switch off…): make it visible.
        await db.from("rc_institutions").update({ status: "followup_due", next_action: `Follow-up due but held: ${r.reasons[0]}`, updated_at: now.toISOString() })
          .eq("id", m.institution_id).eq("status", "contacted");
        report.followupsHeld++;
      } else if (r.status === "failed") report.errors.push(`send ${m.id}: ${r.error}`);
    } catch (e) {
      report.errors.push(`due ${m.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 4. No Response, after the final reply sync.
  if (synced) {
    try {
      const { data: open } = await db.from("rc_institutions").select("id, priority, rc_contacts(id, phone_e164, timezone)")
        .eq("campaign_id", campaign.id).in("status", ["contacted", "followup_due"]);
      for (const inst of open || []) {
        const { data: initial } = await db.from("rc_messages").select("sent_at").eq("institution_id", inst.id).eq("step", "initial").eq("state", "sent").eq("historical", false).maybeSingle();
        if (!initial?.sent_at) continue;
        if (now < sequenceDueDates(initial.sent_at, campaign).noResponse) continue;
        const { count: pending } = await db.from("rc_messages").select("id", { count: "exact", head: true })
          .eq("institution_id", inst.id).in("step", ["followup1", "followup2"]).in("state", ["approved", "sending"]);
        if ((pending ?? 0) > 0) continue; // a postponed follow-up is still to go
        const replies = await inboundSince(db, inst.id, initial.sent_at);
        if (replies.some((r) => r.label && !["out_of_office", "auto_ack"].includes(r.label))) continue;
        await db.from("rc_institutions").update({ status: "no_response", next_action: "No reply after Day 7: consider a phone call", updated_at: now.toISOString() }).eq("id", inst.id);
        await logEvent(db, { campaign_id: campaign.id, institution_id: inst.id, actor: "cron", action: "sequence.no_response" });
        report.noResponse++;
        const phone = (inst.rc_contacts as { id: string; phone_e164: string | null; timezone: string | null }[]).find((c) => c.phone_e164);
        if (phone && (inst.priority === "A" || inst.priority === "B")) {
          await db.from("rc_tasks").insert({
            campaign_id: campaign.id, institution_id: inst.id, contact_id: phone.id, task_type: "call",
            due_date: now.toISOString().slice(0, 10), calling_window: callingWindow(phone.timezone),
            objective: "No reply to e-mail: ask whether the enquiry reached the right office and who coordinates visits",
          });
          report.callTasks++;
        }
      }
    } catch (e) {
      report.errors.push(`no-response: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ...report, timestamp: now.toISOString() }, { status: report.errors.length ? 207 : 200 });
}
