import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { isValidEmail, normaliseEmail, timezoneForState, toE164 } from "@/lib/research-campaign/core";

const VERIFICATIONS = ["unverified", "verified_named", "verified_department", "form_only", "provided_by_institution"];
const TEXT = ["department", "person_name", "person_title", "timezone", "contact_form_url", "source_url", "notes"] as const;

function clean(body: Record<string, unknown>): { fields: Record<string, unknown>; error?: string } {
  const fields: Record<string, unknown> = {};
  for (const k of TEXT) if (k in body) fields[k] = typeof body[k] === "string" && (body[k] as string).trim() ? (body[k] as string).trim() : null;
  if ("email" in body) {
    const e = normaliseEmail(body.email);
    if (e && !isValidEmail(e)) return { fields, error: "Invalid e-mail address" };
    fields.email = e;
  }
  if ("phone" in body || "phone_e164" in body) {
    const raw = (body.phone ?? body.phone_e164) as string | null;
    const p = raw ? toE164(raw) : null;
    if (raw && !p) return { fields, error: "Phone must be a US number or in +E.164 form" };
    fields.phone_e164 = p;
  }
  if ("verification" in body) {
    if (!VERIFICATIONS.includes(String(body.verification))) return { fields, error: "Unknown verification value" };
    fields.verification = body.verification;
  }
  if ("verified_on" in body) {
    const v = body.verified_on;
    if (v !== null && !(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))) return { fields, error: "verified_on must be YYYY-MM-DD" };
    fields.verified_on = v;
  }
  if ("is_primary" in body) fields.is_primary = !!body.is_primary;
  if ("followups_paused" in body) fields.followups_paused = !!body.followups_paused;
  if ("role_assessment" in body) {
    if (!["unknown", "appropriate", "not_appropriate"].includes(String(body.role_assessment))) return { fields, error: "Unknown role assessment" };
    fields.role_assessment = body.role_assessment;
  }
  return { fields };
}

// POST /api/admin/research/contacts  { institution_id, email?, phone?, ... }  → never approved on creation
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const body = await request.json();
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!body.institution_id) return NextResponse.json({ error: "Missing institution_id" }, { status: 400 });
    const { data: inst } = await db.from("rc_institutions").select("id, state, campaign_id").eq("id", body.institution_id).maybeSingle();
    if (!inst || inst.campaign_id !== campaign.id) return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    const { fields, error: vErr } = clean(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    if (!fields.email && !fields.phone_e164 && !fields.contact_form_url) return NextResponse.json({ error: "Give an e-mail, phone or contact form" }, { status: 400 });
    if (!fields.timezone) fields.timezone = timezoneForState(inst.state);
    const { data, error } = await db.from("rc_contacts").insert({
      ...fields, campaign_id: campaign.id, institution_id: inst.id, approved_for_contact: false,
    }).select().single();
    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json({ error: dup ? "This e-mail is already a contact in this campaign" : error.message }, { status: dup ? 409 : 500 });
    }
    await logEvent(db, { campaign_id: campaign.id, institution_id: inst.id, actor: guard.chiamante.email || guard.chiamante.id, action: "contact.create" });
    return NextResponse.json({ contact: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/admin/research/contacts  { id, ...fields } or { id, action: "approve" | "unapprove" }
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { data: current } = await db.from("rc_contacts").select("*").eq("id", body.id).maybeSingle();
    if (!current) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    const { fields, error: vErr } = clean(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    if (body.action === "approve") {
      const email = (fields.email as string | undefined) ?? current.email;
      const verification = (fields.verification as string | undefined) ?? current.verification;
      if (!email) return NextResponse.json({ error: "Only a contact with an e-mail can be approved for e-mail" }, { status: 400 });
      if (verification === "unverified") return NextResponse.json({ error: "Verify the address on an official page first (set verification)" }, { status: 400 });
      Object.assign(fields, { approved_for_contact: true, approved_by: guard.chiamante.id, approved_at: new Date().toISOString() });
    } else if (body.action === "unapprove") {
      Object.assign(fields, { approved_for_contact: false, approved_by: null, approved_at: null });
    } else if ("email" in fields && fields.email !== current.email) {
      // A changed address was not the one that was approved.
      Object.assign(fields, { approved_for_contact: false, approved_by: null, approved_at: null });
    }
    const { data, error } = await db.from("rc_contacts").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", body.id).select().single();
    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json({ error: dup ? "This e-mail is already a contact in this campaign" : error.message }, { status: dup ? 409 : 500 });
    }
    await logEvent(db, { campaign_id: data.campaign_id, institution_id: data.institution_id, actor: guard.chiamante.email || guard.chiamante.id, action: body.action ? `contact.${body.action}` : "contact.update" });
    return NextResponse.json({ contact: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/admin/research/contacts  { id }: refused if mail was sent to this contact
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { count } = await db.from("rc_messages").select("id", { count: "exact", head: true }).eq("contact_id", id).in("state", ["sent", "sending", "received"]);
    if ((count ?? 0) > 0) return NextResponse.json({ error: "This contact has correspondence; unapprove it instead of deleting" }, { status: 409 });
    const { error } = await db.from("rc_contacts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
