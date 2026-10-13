import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COURSE_LESSONS } from "@/app/courses/course-data";
import { siteOrigin } from "@/lib/github/client";
import { escapeHtml } from "./html";

/**
 * Emails the course team when a student asks a question or leaves a
 * comment, so it can be answered promptly instead of waiting for someone
 * to open the Course Monitor.
 *
 * Recipients come from COURSE_NOTIFY_EMAILS (comma separated). Unset means
 * off: nothing is sent and nothing fails.
 *
 * Only new or changed text triggers an email. Editing a reflection, or
 * saving the same question again, does not.
 */

export interface SubmissionText {
  question: string | null;
  comment: string | null;
  admin_reply?: string | null;
}

export function notifyRecipients(): string[] {
  return (process.env.COURSE_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    .slice(0, 50); // Resend's per-message limit
}

/** What changed between the saved row and the new one, if anything worth an email. */
export function submissionChanges(
  before: SubmissionText | null,
  after: SubmissionText,
): { question: boolean; comment: boolean } {
  const norm = (s: string | null | undefined) => (s ?? "").trim();
  return {
    question: !!norm(after.question) && norm(after.question) !== norm(before?.question),
    comment: !!norm(after.comment) && norm(after.comment) !== norm(before?.comment),
  };
}

// Student text goes into an HTML email: escape it, so nobody can put links
// or markup in front of the team.
const esc = escapeHtml;

const block = (label: string, color: string, text: string, isNew: boolean) => `
  <tr><td style="padding:0 32px 16px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color};">
      ${label}${isNew ? "" : " (unchanged)"}
    </p>
    <div style="border-left:4px solid ${color};background:#F7F9FC;padding:12px 16px;border-radius:0 8px 8px 0;font-size:15px;line-height:1.6;color:#1A2332;white-space:pre-wrap;">${esc(text)}</div>
  </td></tr>`;

export async function notifyStaffOfSubmission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, "public", any>,
  input: {
    userId: string;
    lessonSlug: string;
    lessonTitle: string;
    reflection: string;
    before: SubmissionText | null;
    after: SubmissionText;
  },
): Promise<void> {
  const to = notifyRecipients();
  if (to.length === 0 || !process.env.RESEND_API_KEY) return;

  const changed = submissionChanges(input.before, input.after);
  if (!changed.question && !changed.comment) return;

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, email")
    .eq("id", input.userId)
    .maybeSingle();
  // Single line: it also goes in the subject.
  const who = (profile?.full_name || profile?.email || "A student").replace(/\s+/g, " ").trim();
  const lesson = COURSE_LESSONS.find((l) => l.slug === input.lessonSlug);
  const lessonLabel = lesson ? `${lesson.number} ${lesson.title}` : input.lessonTitle;
  const kind = changed.question ? (changed.comment ? "question and comment" : "question") : "comment";
  const alreadyAnswered = !!input.before?.admin_reply;
  const reflection = input.reflection.length > 600 ? `${input.reflection.slice(0, 600)}…` : input.reflection;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F8F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F8F6;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#0A1628;padding:18px 32px;">
    <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#00C896;font-weight:700;">Agentic AI course · New student ${kind}</p>
  </td></tr>
  <tr><td style="padding:24px 32px 12px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0A1628;">${esc(who)}</p>
    <p style="margin:0;font-size:13px;color:#6B7B8D;">${profile?.email ? `${esc(profile.email)} · ` : ""}Lesson ${esc(lessonLabel)}</p>
  </td></tr>
  ${alreadyAnswered ? `<tr><td style="padding:0 32px 16px;"><p style="margin:0;padding:10px 14px;background:#FFF8E6;border-radius:8px;font-size:13px;color:#7D5A00;">This lesson already has a reply from the team. The student changed their text after it, so it is listed under <strong>Answered</strong> in the Course Monitor.</p></td></tr>` : ""}
  ${input.after.question ? block("Question", "#4A7DFF", input.after.question, changed.question) : ""}
  ${input.after.comment ? block("Comment", "#9B59B6", input.after.comment, changed.comment) : ""}
  ${block("Reflection (for context)", "#00A87D", reflection, true)}
  <tr><td style="padding:8px 32px 28px;">
    <a href="${siteOrigin()}/member-portal" style="display:inline-block;background:#00C896;color:#0A1628;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;">Reply in the Course Monitor</a>
    <p style="margin:12px 0 0;font-size:12px;color:#6B7B8D;line-height:1.6;">Admin Panel, Course Monitor, Questions. "Draft with Claude" suggests a reply. Answer there, not by replying to this email: the student sees replies on their lesson page.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const subject = `Course ${kind}: ${lesson ? `Lesson ${lesson.number}` : input.lessonTitle}, ${who}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "bioERGOtech Course <noreply@bioergotech.org>",
    to,
    subject: subject.length > 140 ? `${subject.slice(0, 137)}…` : subject,
    html,
  });
  if (error) console.error("Course notification email failed:", error);
}
