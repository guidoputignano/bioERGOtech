/**
 * Research Centres campaign: server-side helpers shared by the admin routes
 * and the reply cron. Every caller already holds a service-role client
 * obtained through requireAdmin() (or the cron secret), so nothing here
 * checks permissions itself.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_CAMPAIGN_SLUG = "us-research-2027";

export type Campaign = {
  id: string; slug: string; name: string; description: string | null; status: string;
  sender_name: string | null; sender_email: string | null; reply_to: string | null;
  sender_provider: "resend" | "gmail"; sending_enabled: boolean; daily_send_cap: number; reply_mailbox: string | null;
  selection_status: string | null; age_range: string | null; chaperone: string | null;
  schedule_mode: "business" | "calendar"; followup1_days: number; followup2_days: number; no_response_after_days: number;
  send_window_start: number; send_window_end: number;
  approved_by: string | null; approved_at: string | null;
};

export async function loadCampaign(db: SupabaseClient, slug?: string | null): Promise<Campaign | null> {
  const { data, error } = await db.from("rc_campaigns").select("*").eq("slug", slug || DEFAULT_CAMPAIGN_SLUG).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Campaign) ?? null;
}

export async function logEvent(
  db: SupabaseClient,
  e: { campaign_id?: string | null; institution_id?: string | null; actor: string; action: string; detail?: Record<string, unknown> },
): Promise<void> {
  await db.from("rc_events").insert({
    campaign_id: e.campaign_id ?? null, institution_id: e.institution_id ?? null,
    actor: e.actor, action: e.action, detail: e.detail ?? null,
  });
}

export async function loadSuppressions(db: SupabaseClient): Promise<{ emails: Set<string>; domains: Set<string> }> {
  const { data, error } = await db.from("rc_suppressions").select("value, kind");
  if (error) throw new Error(error.message);
  const emails = new Set<string>();
  const domains = new Set<string>();
  for (const r of data || []) (r.kind === "domain" ? domains : emails).add(String(r.value).toLowerCase());
  return { emails, domains };
}

/** Sends counted against the daily cap: anything that left today (UTC). */
export async function sentTodayCount(db: SupabaseClient, campaignId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db.from("rc_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId).eq("direction", "outbound")
    .in("state", ["sent", "sending"]).gte("sent_at", start.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function touchInstitution(db: SupabaseClient, id: string, fields: Record<string, unknown> = {}): Promise<void> {
  await db.from("rc_institutions").update({ ...fields, last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
}

/** Cancels unsent follow-ups (drafts or queued) after a reply or a stop condition. */
export async function cancelFollowups(db: SupabaseClient, institutionId: string, reason: string): Promise<number> {
  const { data } = await db.from("rc_messages")
    .update({ state: "cancelled", scheduled_for: null, error_message: reason, updated_at: new Date().toISOString() })
    .eq("institution_id", institutionId).eq("direction", "outbound")
    .in("step", ["followup1", "followup2"]).in("state", ["draft", "in_review", "approved", "failed"])
    .select("id");
  return data?.length ?? 0;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
