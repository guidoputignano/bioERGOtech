import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent, sentTodayCount } from "@/lib/research-campaign/server";
import { dashboardMetrics, isValidEmail, normaliseEmail, parseAllowedSenders } from "@/lib/research-campaign/core";
import { factsUsed, loadTemplates } from "@/lib/research-campaign/templates";

/** Facts the templates use but Settings has not filled in yet. */
async function missingFacts(db: Parameters<typeof loadTemplates>[0], campaign: Record<string, unknown> & { id: string }): Promise<string[]> {
  const templates = await loadTemplates(db, campaign.id);
  return factsUsed(Object.values(templates)).filter((f) => !String(campaign[f] ?? "").trim());
}

// GET /api/admin/research/campaign  → settings, readiness and dashboard metrics
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;

  try {
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found. Has migration 20261230000000 been applied?" }, { status: 404 });

    const [inst, cont, msgs, labels, tasks] = await Promise.all([
      db.from("rc_institutions").select("id, status, priority, next_action_due").eq("campaign_id", campaign.id),
      db.from("rc_contacts").select("verification, approved_for_contact, institution_id, referred_by_contact_id").eq("campaign_id", campaign.id),
      db.from("rc_messages").select("id, direction, state, step, delivery_status, institution_id, historical").eq("campaign_id", campaign.id),
      db.from("rc_reply_labels").select("label, confirmed_at, rc_messages!inner(institution_id, campaign_id)").eq("rc_messages.campaign_id", campaign.id),
      db.from("rc_tasks").select("status, task_type, due_date").eq("campaign_id", campaign.id),
    ]);
    for (const r of [inst, cont, msgs, labels, tasks]) if (r.error) throw new Error(r.error.message);

    const metrics = dashboardMetrics(
      inst.data || [], cont.data || [], msgs.data || [],
      (labels.data || []).map((l) => {
        const m = l.rc_messages as unknown as { institution_id: string };
        return { message_institution_id: m.institution_id, label: l.label, confirmed: !!l.confirmed_at };
      }),
      tasks.data || [], new Date(),
    );

    const allowed = parseAllowedSenders(process.env.RC_ALLOWED_SENDERS);
    const readiness = {
      allowedSenders: [...allowed],
      senderAllowed: !!campaign.sender_email && allowed.has(normaliseEmail(campaign.sender_email) || ""),
      resendConfigured: !!process.env.RESEND_API_KEY,
      gmailSendConfigured: !!process.env.RC_GMAIL_REFRESH_TOKEN && !!process.env.GMAIL_CLIENT_ID && !!process.env.GMAIL_CLIENT_SECRET,
      replyCronConfigured: !!process.env.RC_GMAIL_REFRESH_TOKEN && !!process.env.RC_GMAIL_USER && !!process.env.CRON_SECRET,
      deliveryWebhookConfigured: !!process.env.RC_RESEND_WEBHOOK_SECRET,
      classifierModel: !!process.env.ANTHROPIC_API_KEY,
      sentToday: await sentTodayCount(db, campaign.id),
      missingFacts: await missingFacts(db, campaign),
    };
    return NextResponse.json({ campaign, metrics, readiness });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

const EDITABLE = [
  "name", "description", "sender_name", "sender_email", "reply_to", "sender_provider", "reply_mailbox",
  "daily_send_cap", "schedule_mode", "followup1_days", "followup2_days", "no_response_after_days",
  "send_window_start", "send_window_end", "selection_status", "age_range", "chaperone",
] as const;
const IDENTITY_FIELDS = new Set(["sender_name", "sender_email", "reply_to", "sender_provider"]);

// PATCH /api/admin/research/campaign
// { fields: {...} }                    edit settings (identity edits revoke approval)
// { action: "approve" | "revoke" | "activate" | "pause" | "close" | "enable_sending" | "disable_sending" }
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const actor = guard.chiamante.email || guard.chiamante.id;

  try {
    const body = await request.json();
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.fields && typeof body.fields === "object") {
      let identityChanged = false;
      for (const k of EDITABLE) {
        if (!(k in body.fields)) continue;
        let v = body.fields[k];
        if (k === "sender_email" || k === "reply_to" || k === "reply_mailbox") {
          v = normaliseEmail(v);
          if (v && !isValidEmail(v)) return NextResponse.json({ error: `${k} is not a valid address` }, { status: 400 });
        }
        if (k === "sender_provider" && v !== "resend" && v !== "gmail") return NextResponse.json({ error: "sender_provider must be resend or gmail" }, { status: 400 });
        if (k === "daily_send_cap") v = Math.max(0, Math.min(100, Number(v) || 0));
        if (k === "schedule_mode" && v !== "business" && v !== "calendar") return NextResponse.json({ error: "schedule_mode must be business or calendar" }, { status: 400 });
        if (k === "followup1_days" || k === "followup2_days" || k === "no_response_after_days") v = Math.max(0, Math.min(45, Math.round(Number(v)) || 0));
        if (k === "send_window_start" || k === "send_window_end") v = Math.max(0, Math.min(24, Math.round(Number(v)) || 0));
        if (typeof v === "string") v = v.trim();
        if (IDENTITY_FIELDS.has(k) && v !== (campaign as Record<string, unknown>)[k]) identityChanged = true;
        update[k] = v === "" ? null : v;
      }
      const fu1 = Number(update.followup1_days ?? campaign.followup1_days);
      const fu2 = Number(update.followup2_days ?? campaign.followup2_days);
      if (fu1 < 1 || fu2 <= fu1) return NextResponse.json({ error: "Follow-up 1 must be at least 1 day and before the final follow-up (both counted from the initial e-mail)" }, { status: 400 });
      const ws = Number(update.send_window_start ?? campaign.send_window_start);
      const we = Number(update.send_window_end ?? campaign.send_window_end);
      if (we <= ws) return NextResponse.json({ error: "The sending window must end after it starts" }, { status: 400 });
      // A different sender means the earlier approval no longer covers it.
      if (identityChanged && campaign.approved_at) {
        Object.assign(update, { approved_at: null, approved_by: null, sending_enabled: false, status: "draft" });
      }
    }

    const action = body.action as string | undefined;
    if (action) {
      const allowed = parseAllowedSenders(process.env.RC_ALLOWED_SENDERS);
      const sender = normaliseEmail(campaign.sender_email);
      switch (action) {
        case "approve":
          if (!sender || !allowed.has(sender)) return NextResponse.json({ error: "Set a sender listed in RC_ALLOWED_SENDERS before approving" }, { status: 400 });
          {
            const missing = await missingFacts(db, campaign);
            if (missing.length) return NextResponse.json({ error: `The templates use facts not yet confirmed in Settings: ${missing.join(", ")}` }, { status: 400 });
          }
          Object.assign(update, { status: "approved", approved_by: guard.chiamante.id, approved_at: new Date().toISOString() });
          break;
        case "revoke":
          Object.assign(update, { status: "draft", approved_by: null, approved_at: null, sending_enabled: false });
          break;
        case "activate":
          if (!campaign.approved_at) return NextResponse.json({ error: "Approve the campaign first" }, { status: 400 });
          update.status = "active";
          break;
        case "resume":
          if (!campaign.approved_at) return NextResponse.json({ error: "Nothing to resume yet: sending starts with your first Send" }, { status: 400 });
          if (!sender || !allowed.has(sender)) return NextResponse.json({ error: "Sender is not in RC_ALLOWED_SENDERS" }, { status: 400 });
          Object.assign(update, { status: "active", sending_enabled: true });
          break;
        case "pause":
          Object.assign(update, { status: "paused", sending_enabled: false });
          break;
        case "close":
          Object.assign(update, { status: "closed", sending_enabled: false });
          break;
        case "enable_sending":
          if (campaign.status !== "active" || !campaign.approved_at) return NextResponse.json({ error: "Campaign must be approved and active" }, { status: 400 });
          if (!sender || !allowed.has(sender)) return NextResponse.json({ error: "Sender is not in RC_ALLOWED_SENDERS" }, { status: 400 });
          update.sending_enabled = true;
          break;
        case "disable_sending":
          update.sending_enabled = false;
          break;
        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    }

    const { data, error } = await db.from("rc_campaigns").update(update).eq("id", campaign.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(db, { campaign_id: campaign.id, actor, action: action ? `campaign.${action}` : "campaign.edit", detail: { fields: Object.keys(update) } });
    return NextResponse.json({ campaign: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
