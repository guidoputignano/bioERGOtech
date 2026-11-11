import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, loadSuppressions, logEvent } from "@/lib/research-campaign/server";
import { dispatchMessage, type DispatchResult } from "@/lib/research-campaign/dispatch";
import {
  domainMatches, emailDomain, isValidEmail, normaliseEmail, parseAllowedSenders,
  previousOutreachBlocks, renderTemplate, researchConnectionFor, unresolvedMarkers,
} from "@/lib/research-campaign/core";
import { loadTemplates, templateVars, type Template, type TemplateKey } from "@/lib/research-campaign/templates";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One-step sending: tick contacts → the e-mail fills itself in from the
 * institution record → Send. Pressing Send (after the confirmation dialog)
 * is the human approval of the initial e-mail and its two follow-ups.
 * Every safety check still runs: verified address, do-not-contact list,
 * one sequence per institution, recipient office hours, daily limit.
 */

export const maxDuration = 60;

const CLOSED = new Set(["declined", "ineligible", "paused", "closed", "confirmed", "no_response"]);
const MAX_PER_SEND = 10; // the screen sends larger selections in batches of 10

type Row = {
  contact_id: string; institution_id: string; institution: string; cluster: string | null; state: string | null; priority: string | null;
  status: string; email: string | null; person: string | null; department: string | null; verification: string; source_url: string | null;
  reason: string | null; subject: string | null; body: string | null;
};

async function buildRows(db: SupabaseClient, campaignId: string, templates: Record<TemplateKey, Template>) {
  const [{ data: insts }, { data: msgs }, suppress] = await Promise.all([
    db.from("rc_institutions").select("id, name, cluster, state, priority, status, specialisations, previous_outreach, ineligible_reason, source_url, website, rc_contacts(*)").eq("campaign_id", campaignId).order("name"),
    db.from("rc_messages").select("institution_id").eq("campaign_id", campaignId).neq("state", "cancelled"),
    loadSuppressions(db),
  ]);
  const withHistory = new Set((msgs || []).map((m) => m.institution_id));
  const rows: Row[] = [];
  let noEmail = 0;
  for (const inst of insts || []) {
    const contacts = ((inst.rc_contacts as Record<string, unknown>[]) || []).filter((c) => c.email);
    if (!contacts.length) { noEmail++; continue; }
    const connection = researchConnectionFor(inst);
    for (const c of contacts) {
      const email = normaliseEmail(c.email) as string;
      let reason: string | null = null;
      if (!isValidEmail(email)) reason = "Invalid e-mail address";
      else if (withHistory.has(inst.id)) reason = "Already written to (see its Correspondence)";
      else if (CLOSED.has(inst.status) || inst.ineligible_reason) reason = `Institution is ${inst.ineligible_reason ? "marked not eligible" : inst.status}`;
      else if (previousOutreachBlocks(inst.previous_outreach)) reason = "Earlier reply on record: answer that conversation instead";
      else if (suppress.emails.has(email) || [...suppress.domains].some((d) => domainMatches(emailDomain(email), d))) reason = "On the do-not-contact list";
      else if (c.verification === "unverified") reason = "Address not verified yet";
      else if (!connection) reason = "No research area on file (add Specialisations)";
      let subject: string | null = null, body: string | null = null;
      if (connection) {
        const vars = templateVars({
          contact: { person_name: c.person_name as string | null, person_title: c.person_title as string | null, department: c.department as string | null },
          institutionName: inst.name, researchConnection: connection, originalSubject: null,
          campaign: { selection_status: null, age_range: null, chaperone: null },
        });
        subject = renderTemplate(templates.initial.subject, vars).text;
        body = renderTemplate(templates.initial.body, vars).text;
        if (!reason && unresolvedMarkers(`${subject}\n${body}`).length) reason = `Template has unfilled parts: ${unresolvedMarkers(`${subject}\n${body}`).join(", ")}`;
      }
      rows.push({
        contact_id: c.id as string, institution_id: inst.id, institution: inst.name, cluster: inst.cluster, state: inst.state, priority: inst.priority,
        status: inst.status, email, person: (c.person_name as string) || null, department: (c.department as string) || null,
        verification: c.verification as string, source_url: (c.source_url as string) || inst.source_url || null, reason, subject, body,
      });
    }
  }
  return { rows, noEmail };
}

// GET /api/admin/research/compose → every contact with an e-mail, whether it can be sent now, and the filled-in e-mail
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const campaign = await loadCampaign(guard.client);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const templates = await loadTemplates(guard.client, campaign.id);
    const { rows, noEmail } = await buildRows(guard.client, campaign.id, templates);
    const senderOk = parseAllowedSenders(process.env.RC_ALLOWED_SENDERS).has(normaliseEmail(campaign.sender_email) || "");
    return NextResponse.json({ rows, noEmail, senderOk, paused: campaign.status === "paused" || campaign.status === "closed", campaign: { sender_name: campaign.sender_name, sender_email: campaign.sender_email, daily_send_cap: campaign.daily_send_cap } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// POST /api/admin/research/compose  { contact_ids: string[] }
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const actor = guard.chiamante.email || guard.chiamante.id;
  let ids: string[];
  try {
    const b = await request.json();
    ids = Array.isArray(b.contact_ids) ? [...new Set<string>(b.contact_ids.filter((x: unknown) => typeof x === "string"))] : [];
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!ids.length) return NextResponse.json({ error: "Tick at least one contact" }, { status: 400 });
  if (ids.length > MAX_PER_SEND) return NextResponse.json({ error: `At most ${MAX_PER_SEND} at a time` }, { status: 400 });

  let campaign = await loadCampaign(db);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "paused" || campaign.status === "closed") return NextResponse.json({ error: "Sending is paused. Resume it in Settings first." }, { status: 409 });
  if (!parseAllowedSenders(process.env.RC_ALLOWED_SENDERS).has(normaliseEmail(campaign.sender_email) || "")) {
    return NextResponse.json({ error: "The sender address is not in RC_ALLOWED_SENDERS (Vercel settings)" }, { status: 400 });
  }
  const templates = await loadTemplates(db, campaign.id);

  // Pressing Send is the approval: turn the campaign on the first time.
  if (campaign.status !== "active" || !campaign.sending_enabled || !campaign.approved_at) {
    const now = new Date().toISOString();
    await db.from("rc_campaigns").update({
      status: "active", sending_enabled: true, updated_at: now,
      ...(campaign.approved_at ? {} : { approved_at: now, approved_by: guard.chiamante.id }),
    }).eq("id", campaign.id);
    await logEvent(db, { campaign_id: campaign.id, actor, action: "campaign.started_by_send" });
    campaign = (await loadCampaign(db))!;
  }

  const { rows } = await buildRows(db, campaign.id, templates);
  const byId = new Map(rows.map((r) => [r.contact_id, r]));
  const doneInstitutions = new Set<string>();
  const results: (DispatchResult & { institution?: string; email?: string })[] = [];

  for (const id of ids) {
    const r = byId.get(id);
    if (!r) { results.push({ id, status: "skipped", reasons: ["Contact not found or has no e-mail"] }); continue; }
    const tag = { institution: r.institution, email: r.email ?? undefined };
    if (r.reason) { results.push({ id, status: "skipped", reasons: [r.reason], ...tag }); continue; }
    if (doneInstitutions.has(r.institution_id)) { results.push({ id, status: "skipped", reasons: ["Another contact at this institution was ticked: one e-mail per institution"], ...tag }); continue; }
    doneInstitutions.add(r.institution_id);

    const now = new Date().toISOString();
    await db.from("rc_contacts").update({ approved_for_contact: true, approved_by: guard.chiamante.id, approved_at: now, is_primary: true, updated_at: now }).eq("id", id);
    const base = {
      campaign_id: campaign.id, institution_id: r.institution_id, contact_id: id, direction: "outbound",
      from_email: campaign.sender_email, to_email: r.email, state: "approved", approved_by: guard.chiamante.id, approved_at: now, created_by: guard.chiamante.id,
    };
    const { data: initial, error } = await db.from("rc_messages").insert({
      ...base, step: "initial", template_key: "initial", template_version: templates.initial.version,
      personalisation_source: r.source_url, subject: r.subject, body: r.body,
    }).select("id").single();
    if (error || !initial) {
      results.push({ id, status: "skipped", reasons: [error?.code === "23505" ? "Already has an e-mail sequence" : error?.message || "Could not create the e-mail"], ...tag });
      continue;
    }
    const vars = templateVars({
      contact: { person_name: r.person, person_title: null, department: r.department }, institutionName: r.institution,
      researchConnection: null, originalSubject: r.subject, campaign: { selection_status: null, age_range: null, chaperone: null },
    });
    await db.from("rc_messages").insert((["followup1", "followup2"] as const).map((k) => ({
      ...base, step: k, parent_message_id: initial.id, template_key: k, template_version: templates[k].version,
      subject: renderTemplate(templates[k].subject, vars).text, body: renderTemplate(templates[k].body, vars).text,
    })));
    await db.from("rc_institutions").update({ status: "approved", owner: guard.chiamante.email, updated_at: now }).eq("id", r.institution_id).in("status", ["discovered", "verified"]);
    const d = await dispatchMessage(db, campaign, initial.id, actor, { queueOutsideWindow: true });
    results.push({ ...d, ...tag });
    if (d.status === "sent") await new Promise((res) => setTimeout(res, 1200));
  }

  return NextResponse.json({
    results,
    sent: results.filter((r) => r.status === "sent").length,
    queued: results.filter((r) => r.status === "queued").length,
    skipped: results.filter((r) => r.status === "skipped" || r.status === "blocked").length,
    failed: results.filter((r) => r.status === "failed").length,
  });
}
