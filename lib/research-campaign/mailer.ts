/**
 * Research Centres campaign: outbound mail.
 *
 * Two providers, chosen per campaign:
 *  - resend: the Foundation's existing Resend account (DKIM-aligned for
 *    bioergotech.org). From = the campaign's approved sender.
 *  - gmail:  the sender's own Google Workspace mailbox through the Gmail API
 *    (scope gmail.send), so the message sits in their Sent folder and
 *    replies thread naturally. Uses RC_GMAIL_REFRESH_TOKEN, separate from the
 *    Outreach pipeline's GMAIL_REFRESH_TOKEN.
 *
 * Resend sends a blind copy to the sender's own mailbox (copyTo), so every
 * portal e-mail also appears in that mailbox, threaded with the conversation.
 * The reply sync skips mail from the sender, so the copy is never read back
 * as a reply. Gmail needs no copy: the message is already in Sent.
 *
 * Both set our own Message-ID so replies can be matched by header, and
 * In-Reply-To/References when continuing a thread. Plain text only, no
 * tracking pixels, no attachments.
 */
import { randomUUID } from "crypto";

export type OutgoingMail = {
  fromName: string | null;
  fromEmail: string;
  replyTo: string | null;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string | null;     // Message-ID of the message being answered
  references?: string | null;
  gmailThreadId?: string | null; // keep the Gmail thread when continuing it
  copyTo?: string | null;        // blind copy for the sender's own mailbox (Resend only)
  cc?: string[] | null;          // people kept in copy (visible to the recipient)
};

export type SendResult = { provider: "resend" | "gmail"; providerMessageId: string; rfcMessageId: string; threadId: string | null };

export function newMessageId(fromEmail: string): string {
  const domain = fromEmail.split("@")[1] || "bioergotech.org";
  return `<rc-${randomUUID()}@${domain}>`;
}

function formatFrom(name: string | null, email: string): string {
  if (!name) return email;
  const safe = name.replace(/["\\\r\n]/g, "");
  return `"${safe}" <${email}>`;
}

/** RFC 2047 for non-ASCII subjects/names, so accents survive (no stripping). */
function encodeHeader(value: string): string {
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function assertNoHeaderInjection(...values: (string | null | undefined)[]) {
  for (const v of values) if (v && /[\r\n]/.test(v)) throw new Error("Header value contains a line break");
}

/** The Resend request body. The recipient never sees the blind copy. */
export function resendPayload(mail: OutgoingMail, rfcMessageId: string): Record<string, unknown> {
  assertNoHeaderInjection(mail.to, mail.subject, mail.fromEmail, mail.replyTo, mail.inReplyTo, mail.references, mail.copyTo, ...(mail.cc || []));
  const headers: Record<string, string> = { "Message-ID": rfcMessageId };
  if (mail.inReplyTo) headers["In-Reply-To"] = mail.inReplyTo;
  if (mail.references || mail.inReplyTo) headers["References"] = [mail.references, mail.inReplyTo].filter(Boolean).join(" ");
  const copy = mail.copyTo?.trim();
  const cc = (mail.cc || []).filter((a) => a.toLowerCase() !== mail.to.trim().toLowerCase());
  const withCopy = !!copy && copy.toLowerCase() !== mail.to.trim().toLowerCase() && !cc.some((a) => a.toLowerCase() === copy.toLowerCase());
  return {
    from: formatFrom(mail.fromName, mail.fromEmail),
    to: [mail.to],
    ...(cc.length ? { cc } : {}),
    ...(withCopy ? { bcc: [copy] } : {}),
    ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    subject: mail.subject,
    text: mail.text,
    headers,
  };
}

export async function sendViaResend(mail: OutgoingMail, apiKey: string, idempotencyKey: string): Promise<SendResult> {
  const rfcMessageId = newMessageId(mail.fromEmail);
  const payload = resendPayload(mail, rfcMessageId);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Resend de-duplicates retries carrying the same key for 24 h.
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || `Resend error ${res.status}`);
  return { provider: "resend", providerMessageId: String((data as { id?: string }).id || ""), rfcMessageId, threadId: null };
}

export async function gmailAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not configured");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Gmail token error: ${data.error}`);
  return data.access_token as string;
}

export function buildMime(mail: OutgoingMail, rfcMessageId: string): string {
  assertNoHeaderInjection(mail.to, mail.subject, mail.fromEmail, mail.replyTo, mail.inReplyTo, mail.references, ...(mail.cc || []));
  const cc = (mail.cc || []).filter((a) => a.toLowerCase() !== mail.to.trim().toLowerCase());
  const lines = [
    `From: ${encodeHeader(formatFrom(mail.fromName, mail.fromEmail))}`,
    `To: ${mail.to}`,
    ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
    ...(mail.replyTo ? [`Reply-To: ${mail.replyTo}`] : []),
    `Subject: ${encodeHeader(mail.subject)}`,
    `Message-ID: ${rfcMessageId}`,
    ...(mail.inReplyTo ? [`In-Reply-To: ${mail.inReplyTo}`] : []),
    ...(mail.references || mail.inReplyTo ? [`References: ${[mail.references, mail.inReplyTo].filter(Boolean).join(" ")}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(mail.text, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
  ];
  return lines.join("\r\n");
}

export async function sendViaGmail(mail: OutgoingMail, refreshToken: string, gmailUser: string): Promise<SendResult> {
  const token = await gmailAccessToken(refreshToken);
  const rfcMessageId = newMessageId(mail.fromEmail);
  const raw = Buffer.from(buildMime(mail, rfcMessageId), "utf8").toString("base64url");
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(gmailUser)}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw, ...(mail.gmailThreadId ? { threadId: mail.gmailThreadId } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message || `Gmail error ${res.status}`);
  const d = data as { id?: string; threadId?: string };
  return { provider: "gmail", providerMessageId: String(d.id || ""), rfcMessageId, threadId: d.threadId ?? null };
}
