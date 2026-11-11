import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign } from "@/lib/research-campaign/server";
import { confirmLabel, logHistoricalOutbound, storeInbound } from "@/lib/research-campaign/ingest";
import { REPLY_LABELS, type ReplyLabel } from "@/lib/research-campaign/core";

// POST /api/admin/research/replies  log a message received or sent outside the platform
// { institution_id, contact_id?, direction: "inbound" | "outbound", historical?: boolean,
//   from_email, to_email?, subject?, body, date? }
// Historical messages (the original New York outreach) are recorded and
// classified but never change the pipeline or trigger follow-ups.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const actor = guard.chiamante.email || guard.chiamante.id;
  try {
    const b = await request.json();
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!b.institution_id || typeof b.body !== "string" || !b.body.trim()) return NextResponse.json({ error: "Institution and message text are required" }, { status: 400 });
    const { data: inst } = await db.from("rc_institutions").select("id, campaign_id").eq("id", b.institution_id).maybeSingle();
    if (!inst || inst.campaign_id !== campaign.id) return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    const at = typeof b.date === "string" && !isNaN(Date.parse(b.date)) ? new Date(b.date).toISOString() : new Date().toISOString();

    if (b.direction === "outbound") {
      if (!b.historical) return NextResponse.json({ error: "Only past outbound messages can be logged by hand" }, { status: 400 });
      const id = await logHistoricalOutbound(db, {
        campaign_id: campaign.id, institution_id: inst.id, contact_id: b.contact_id || null,
        from_email: b.from_email || null, to_email: b.to_email || null, subject: b.subject || null, body: b.body.trim(), sent_at: at, actor,
      });
      return NextResponse.json({ messageId: id });
    }
    const { data: last } = await db.from("rc_messages").select("id").eq("institution_id", inst.id).eq("direction", "outbound")
      .eq("state", "sent").order("sent_at", { ascending: false }).limit(1).maybeSingle();
    const r = await storeInbound(db, {
      campaign_id: campaign.id, institution_id: inst.id, contact_id: b.contact_id || null, parent_message_id: last?.id ?? null,
      from_email: b.from_email || null, to_email: campaign.sender_email, subject: b.subject || null, body: b.body.trim(),
      received_at: at, provider: "manual", historical: !!b.historical, actor,
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/admin/research/replies
// { message_id, label, opt_out?, respondent_role?: "appropriate" | "not_appropriate",
//   referral?: { person_name, person_title, department, email } }
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const b = await request.json();
    if (!b.message_id || !REPLY_LABELS.includes(b.label)) return NextResponse.json({ error: "message_id and a valid class are required" }, { status: 400 });
    const role = b.respondent_role === "appropriate" || b.respondent_role === "not_appropriate" ? b.respondent_role : null;
    const r = await confirmLabel(guard.client, {
      messageId: b.message_id, label: b.label as ReplyLabel, userId: guard.chiamante.id, actor: guard.chiamante.email || guard.chiamante.id,
      optOut: !!b.opt_out, respondentRole: role, referral: b.referral && typeof b.referral === "object" ? b.referral : null,
    });
    return NextResponse.json({ success: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }
}
