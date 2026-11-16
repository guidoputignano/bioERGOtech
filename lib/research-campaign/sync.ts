/**
 * Research Centres campaign: reply sync. Reads the campaign mailbox
 * (read-only) and stores new replies, attached to their institution by
 * thread, headers, address or domain. Used by the daily job (before any
 * follow-up is sent) and by the portal's Refresh, which only reads mail and
 * never sends anything.
 *
 * Safe to run at the same time from two places: a Gmail message is stored
 * once (unique provider id), and a second insert is skipped.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign } from "./server";
import { storeInbound } from "./ingest";
import { gmailAccessToken } from "./mailer";
import { emailDomain, matchInbound, normaliseEmail } from "./core";

export type SyncReport = { repliesStored: number; unmatched: number; errors: string[] };

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

/** Returns true when the mailbox was read (so follow-ups may go out). */
export async function syncReplies(db: SupabaseClient, campaign: Campaign, report: SyncReport, actor = "cron"): Promise<boolean> {
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
  const errorsBefore = report.errors.length;
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const list = await g(`/messages?q=${encodeURIComponent("newer_than:21d -from:me -in:chats")}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
    const refs: { id: string }[] = list.messages || [];
    // One lookup per page for the messages already stored.
    const { data: seenRows } = refs.length
      ? await db.from("rc_messages").select("provider_message_id").eq("provider", "gmail").in("provider_message_id", refs.map((r) => r.id))
      : { data: [] as { provider_message_id: string }[] };
    const seen = new Set((seenRows || []).map((r) => r.provider_message_id));
    for (const ref of refs) {
      if (seen.has(ref.id)) continue;
      try {
        const full = await g(`/messages/${ref.id}?format=full`);
        const headers: { name: string; value: string }[] = full.payload?.headers || [];
        const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n)?.value || null;
        const from = h("from");
        const fromAddr = normaliseEmail(from?.match(/<([^>]+)>/)?.[1] ?? from);
        if (fromAddr === self) continue;
        const match = matchInbound({ from, threadId: full.threadId, inReplyTo: h("in-reply-to"), references: h("references") }, outbound, insts || [], contacts || [], emailDomain(campaign.sender_email));
        if (!match.matched) { report.unmatched++; continue; }
        const r = await storeInbound(db, {
          campaign_id: campaign.id, institution_id: match.institution_id, contact_id: match.contact_id, parent_message_id: match.parent_id,
          from_email: fromAddr, to_email: mailbox, subject: h("subject"), body: plainText(full.payload || {}) || full.snippet || "",
          received_at: full.internalDate ? new Date(Number(full.internalDate)).toISOString() : new Date().toISOString(),
          rfc_message_id: h("message-id"), in_reply_to: h("in-reply-to"), thread_id: full.threadId,
          provider: "gmail", provider_message_id: ref.id, needsReview: match.needsReview, actor,
        });
        if (!r.duplicate) report.repliesStored++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Stored a moment ago by a sync running at the same time.
        if (/duplicate key|rc_messages_provider_id/i.test(msg)) continue;
        report.errors.push(`message ${ref.id}: ${msg}`);
      }
    }
    pageToken = list.nextPageToken;
    pages++;
  } while (pageToken && pages < 5);
  // A message we could not read may be a reply: report the mailbox as not
  // fully read, so the daily job holds follow-ups.
  return report.errors.length === errorsBefore;
}
