import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { clampScores, INSTITUTION_STATUSES, normaliseDomain, totalScore } from "@/lib/research-campaign/core";

// GET /api/admin/research/institutions → institutions with contacts and activity summary
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const [inst, msgs] = await Promise.all([
      db.from("rc_institutions").select("*, rc_contacts(*)").eq("campaign_id", campaign.id).order("name"),
      db.from("rc_messages").select("institution_id, direction, state, step, sent_at, received_at, created_at").eq("campaign_id", campaign.id),
    ]);
    if (inst.error) throw new Error(inst.error.message);
    if (msgs.error) throw new Error(msgs.error.message);
    const summary = new Map<string, { sent: number; inbound: number; drafts: number; lastSent: string | null; lastInbound: string | null }>();
    for (const m of msgs.data || []) {
      const s = summary.get(m.institution_id) || { sent: 0, inbound: 0, drafts: 0, lastSent: null, lastInbound: null };
      if (m.direction === "outbound" && m.state === "sent") { s.sent++; if (!s.lastSent || (m.sent_at && m.sent_at > s.lastSent)) s.lastSent = m.sent_at; }
      if (m.direction === "outbound" && ["draft", "in_review", "approved"].includes(m.state)) s.drafts++;
      if (m.direction === "inbound") { s.inbound++; const t = m.received_at || m.created_at; if (!s.lastInbound || t > s.lastInbound) s.lastInbound = t; }
      summary.set(m.institution_id, s);
    }
    const institutions = (inst.data || []).map((i) => ({
      ...i, score: totalScore(i), activity: summary.get(i.id) || { sent: 0, inbound: 0, drafts: 0, lastSent: null, lastInbound: null },
    }));
    return NextResponse.json({ institutions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

const TEXT_FIELDS = [
  "ref_code", "name", "website", "city", "state", "country", "cluster", "institution_type", "specialisations",
  "programme_evidence", "formats", "eligibility_notes", "fees_published", "august_availability", "key_unknowns",
  "ineligible_reason", "previous_outreach", "owner", "next_action", "source_url", "notes",
  "eng_contact_role", "eng_interest", "eng_duration", "eng_activities", "eng_eligibility", "eng_dates",
  "eng_participants", "eng_supervision_insurance", "eng_fees_conditions", "eng_documents", "eng_meeting",
] as const;
const SCORE_FIELDS = ["score_outreach", "score_international", "score_capacity", "score_relevance", "score_august", "score_cost", "score_contact"] as const;

function cleanFields(body: Record<string, unknown>): { fields: Record<string, unknown>; error?: string } {
  const fields: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) if (k in body) fields[k] = typeof body[k] === "string" && (body[k] as string).trim() ? (body[k] as string).trim() : null;
  if ("website" in fields) fields.domain = normaliseDomain(fields.website);
  if (SCORE_FIELDS.some((k) => k in body)) Object.assign(fields, clampScores(Object.fromEntries(SCORE_FIELDS.filter((k) => k in body).map((k) => [k, body[k]]))));
  for (const k of SCORE_FIELDS) if (!(k in body)) delete fields[k];
  if ("priority" in body) {
    const p = body.priority;
    if (p !== null && p !== "A" && p !== "B" && p !== "C") return { fields, error: "priority must be A, B, C or null" };
    fields.priority = p;
  }
  if ("followups_paused" in body) fields.followups_paused = !!body.followups_paused;
  if ("status" in body) {
    if (!INSTITUTION_STATUSES.includes(body.status as never)) return { fields, error: "Unknown status" };
    fields.status = body.status;
  }
  for (const k of ["next_action_due", "checked_on"] as const) {
    if (k in body) {
      const v = body[k];
      if (v !== null && !(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))) return { fields, error: `${k} must be YYYY-MM-DD` };
      fields[k] = v;
    }
  }
  if (fields.name === null) return { fields, error: "Name is required" };
  return { fields };
}

// POST /api/admin/research/institutions  { name, website, ... }
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const body = await request.json();
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const { fields, error: vErr } = cleanFields(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    if (!fields.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const { data, error } = await db.from("rc_institutions").insert({ ...fields, campaign_id: campaign.id }).select().single();
    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json({ error: dup ? "An institution with this name or website already exists" : error.message }, { status: dup ? 409 : 500 });
    }
    await logEvent(db, { campaign_id: campaign.id, institution_id: data.id, actor: guard.chiamante.email || guard.chiamante.id, action: "institution.create" });
    return NextResponse.json({ institution: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/admin/research/institutions  { id, ...fields }
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { fields, error: vErr } = cleanFields(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    const { data, error } = await db.from("rc_institutions")
      .update({ ...fields, updated_at: new Date().toISOString() }).eq("id", body.id).select().single();
    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json({ error: dup ? "Another institution already has this name or website" : error.message }, { status: dup ? 409 : 500 });
    }
    await logEvent(db, { campaign_id: data.campaign_id, institution_id: data.id, actor: guard.chiamante.email || guard.chiamante.id, action: "institution.update", detail: { fields: Object.keys(fields) } });
    return NextResponse.json({ institution: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/admin/research/institutions  { id }: refused once anything was sent or received
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { count } = await db.from("rc_messages").select("id", { count: "exact", head: true })
      .eq("institution_id", id).or("state.eq.sent,state.eq.sending,direction.eq.inbound");
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "This institution has correspondence. Set its status to closed instead, so the record is kept." }, { status: 409 });
    }
    const { error } = await db.from("rc_institutions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(db, { actor: guard.chiamante.email || guard.chiamante.id, action: "institution.delete", detail: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
