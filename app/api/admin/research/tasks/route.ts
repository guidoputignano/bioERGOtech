import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { callingWindow } from "@/lib/research-campaign/core";

const TYPES = ["call", "meeting", "quote", "reply", "referral", "other"];
const CALL_OUTCOMES = ["connected", "voicemail", "referred", "direct_contact", "written_info_requested", "declined", "follow_up_agreed", "no_answer"];

// GET /api/admin/research/tasks?status=open → tasks with what a caller needs on screen
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const status = new URL(request.url).searchParams.get("status") || "open";
  const campaign = await loadCampaign(db);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const { data, error } = await db.from("rc_tasks")
    .select("*, rc_institutions(name, city, state, status), rc_contacts(person_name, department, phone_e164, timezone, email)")
    .eq("campaign_id", campaign.id).eq("status", status).order("due_date", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Last outbound summary per institution, for call sheets.
  const instIds = [...new Set((data || []).map((t) => t.institution_id))];
  const lastMail = new Map<string, string>();
  if (instIds.length) {
    const { data: msgs } = await db.from("rc_messages").select("institution_id, subject, sent_at, step")
      .in("institution_id", instIds).eq("direction", "outbound").eq("state", "sent").order("sent_at", { ascending: false });
    for (const m of msgs || []) if (!lastMail.has(m.institution_id)) lastMail.set(m.institution_id, `${m.step} "${m.subject}" sent ${m.sent_at?.slice(0, 10)}`);
  }
  return NextResponse.json({ tasks: (data || []).map((t) => ({ ...t, last_email: lastMail.get(t.institution_id) || null })) });
}

// POST /api/admin/research/tasks  { institution_id, contact_id?, task_type, due_date?, objective? }
// Calls are manual: the platform shows the number and window, it never dials.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const b = await request.json();
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!b.institution_id || !TYPES.includes(b.task_type)) return NextResponse.json({ error: "institution_id and a valid task_type are required" }, { status: 400 });
    let window: string | null = null;
    if (b.task_type === "call") {
      if (!b.contact_id) return NextResponse.json({ error: "Choose the contact (with a verified phone) to call" }, { status: 400 });
      const { data: c } = await db.from("rc_contacts").select("phone_e164, timezone, institution_id").eq("id", b.contact_id).maybeSingle();
      if (!c || c.institution_id !== b.institution_id) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      if (!c.phone_e164) return NextResponse.json({ error: "This contact has no phone number" }, { status: 400 });
      window = callingWindow(c.timezone);
    }
    const { data, error } = await db.from("rc_tasks").insert({
      campaign_id: campaign.id, institution_id: b.institution_id, contact_id: b.contact_id || null, task_type: b.task_type,
      due_date: typeof b.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.due_date) ? b.due_date : null,
      objective: b.objective || null, calling_window: window, assigned_to: b.assigned_to || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(db, { campaign_id: campaign.id, institution_id: b.institution_id, actor: guard.chiamante.email || guard.chiamante.id, action: "task.create", detail: { type: b.task_type } });
    return NextResponse.json({ task: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/admin/research/tasks  { id, status?, outcome?, due_date?, assigned_to? }
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (b.status) {
      if (!["open", "done", "cancelled"].includes(b.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      update.status = b.status;
    }
    for (const k of ["outcome", "assigned_to", "cancelled_reason"]) if (k in b) update[k] = b[k] || null;
    if ("call_outcome" in b) {
      if (b.call_outcome !== null && !CALL_OUTCOMES.includes(b.call_outcome)) return NextResponse.json({ error: "Unknown call outcome" }, { status: 400 });
      update.call_outcome = b.call_outcome;
    }
    if ("due_date" in b) update.due_date = b.due_date || null;
    const { data, error } = await db.from("rc_tasks").update(update).eq("id", b.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(db, { campaign_id: data.campaign_id, institution_id: data.institution_id, actor: guard.chiamante.email || guard.chiamante.id, action: "task.update", detail: { status: b.status } });
    return NextResponse.json({ task: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
