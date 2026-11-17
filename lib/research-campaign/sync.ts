/**
 * Research Centres campaign: reply sync. Reads the campaign mailbox
 * (read-only) and stores new replies, attached to their institution by
 * thread, headers, address or domain. Used by the daily job (before any
 * follow-up is sent) and by the portal's Refresh, which only reads mail and
 * never sends anything.
 *
 * Light on the mailbox: each message is first read by its headers only
 * (enough to match it); only replies to the campaign are read in full.
 * Gmail's "slow down" answers (429, or 403 with a rate reason) are retried
 * with a pause. Replies keep the people they copied (cc_emails), so the
 * portal can answer everyone.
 *
 * Safe to run at the same time from two places: a Gmail message is stored
 * once (unique provider id), and a second insert is skipped.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign } from "./server";
import { storeInbound } from "./ingest";
import { gmailAccessToken } from "./mailer";
import { emailDomain, matchInbound, normaliseEmail, parseAddressList, replyAllCc } from "./core";

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

const META = ["From", "To", "Cc", "Subject", "Message-ID", "In-Reply-To", "References"].map((h) => `metadataHeaders=${h}`).join("&");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns true when the mailbox was fully read (so follow-ups may go out).
 * newerThan: how far back to look ("21d" for the daily job, a few days for Refresh).
 */
export async function syncReplies(db: SupabaseClient, campaign: Campaign, report: SyncReport, actor = "cron", newerThan = "21d"): Promise<boolean> {
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
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}${path}`, { headers: { Authorization: `Bearer ${access}` } });
      if (r.ok) return r.json();
      const body = await r.json().catch(() => ({}));
      const reason: string = body?.error?.errors?.[0]?.reason || body?.error?.status || "";
      const detail: string = String(body?.error?.message || "").slice(0, 160);
      const slowDown = r.status === 429 || (r.status === 403 && /rate|quota|concurrent|limit/i.test(`${reason} ${detail}`));
      if (slowDown && attempt < 3) { await sleep(1000 * 2 ** attempt); continue; }
      throw new Error(`Gmail ${r.status}${reason ? ` ${reason}` : ""}${detail ? `: ${detail}` : ""}`);
    }
  };
  const self = normaliseEmail(campaign.sender_email);
  const own = normaliseEmail(mailbox);
  const errorsBefore = report.errors.length;
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const list = await g(`/messages?q=${encodeURIComponent(`newer_than:${newerThan} -from:me -in:chats`)}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
    const refs: { id: string }[] = list.messages || [];
    // One lookup per page for the messages already stored.
    const { data: seenRows, error: seenError } = refs.length
      ? await db.from("rc_messages").select("id, provider_message_id, direction, cc_emails").eq("provider", "gmail").in("provider_message_id", refs.map((r) => r.id))
      : { data: [] as { id: string; provider_message_id: string; direction: string; cc_emails: string[] | null }[], error: null };
    // Without this list every message would look new: stop instead.
    if (seenError) throw new Error(`stored messages: ${seenError.message}`);
    const seen = new Map((seenRows || []).map((r) => [r.provider_message_id as string, r]));
    for (const ref of refs) {
      const stored = seen.get(ref.id);
      // Stored already; read again only to record who was in copy (once).
      if (stored && !(stored.direction === "inbound" && stored.cc_emails === null)) continue;
      try {
        const meta = await g(`/messages/${ref.id}?format=metadata&${META}`);
        const headers: { name: string; value: string }[] = meta.payload?.headers || [];
        const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n)?.value || null;
        const from = h("from");
        const fromAddr = normaliseEmail(from?.match(/<([^>]+)>/)?.[1] ?? from);
        const cc = replyAllCc([...parseAddressList(h("to")), ...parseAddressList(h("cc"))], [self, own, fromAddr]);
        if (stored) { await db.from("rc_messages").update({ cc_emails: cc }).eq("id", stored.id); continue; }
        if (fromAddr === self) continue;
        const match = matchInbound({ from, threadId: meta.threadId, inReplyTo: h("in-reply-to"), references: h("references") }, outbound, insts || [], contacts || [], emailDomain(campaign.sender_email));
        if (!match.matched) { report.unmatched++; continue; }
        const full = await g(`/messages/${ref.id}?format=full`);
        const r = await storeInbound(db, {
          campaign_id: campaign.id, institution_id: match.institution_id, contact_id: match.contact_id, parent_message_id: match.parent_id,
          from_email: fromAddr, to_email: mailbox, cc_emails: cc, subject: h("subject"), body: plainText(full.payload || {}) || full.snippet || "",
          received_at: meta.internalDate ? new Date(Number(meta.internalDate)).toISOString() : new Date().toISOString(),
          rfc_message_id: h("message-id"), in_reply_to: h("in-reply-to"), thread_id: meta.threadId,
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
