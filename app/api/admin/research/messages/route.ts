import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { isValidEmail, renderTemplate, unresolvedMarkers } from "@/lib/research-campaign/core";
import { loadTemplates, templateVars } from "@/lib/research-campaign/templates";

const EDITABLE = ["draft", "in_review", "approved", "failed"];

// GET /api/admin/research/messages?institution_id=…  → thread with labels
// GET /api/admin/research/messages?queue=review        → drafts, in review, approved/queued, failed
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const p = new URL(request.url).searchParams;
  const campaign = await loadCampaign(db);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  let q = db.from("rc_messages")
    .select("*, rc_reply_labels(*), rc_institutions(name), rc_contacts(person_name, email, approved_for_contact, timezone)")
    .eq("campaign_id", campaign.id);
  if (p.get("institution_id")) q = q.eq("institution_id", p.get("institution_id")!).order("created_at", { ascending: true });
  else if (p.get("queue") === "review") q = q.eq("direction", "outbound").eq("historical", false).in("state", ["draft", "in_review", "approved", "failed"]).order("created_at", { ascending: true });
  else q = q.order("created_at", { ascending: false }).limit(300);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const messages = (data || []).map((m) => ({ ...m, markers: m.direction === "outbound" && !m.historical ? unresolvedMarkers(`${m.subject ?? ""}\n${m.body ?? ""}`) : [] }));
  return NextResponse.json({ messages });
}

// POST /api/admin/research/messages  create drafts
// { institution_id, contact_id, kind: "sequence", research_connection, personalisation_source, override_previous? }
//     → initial + follow-up 1 + follow-up 2 drafts (Templates 1-3), approved together later
// { institution_id, contact_id, kind: "coordinator" }               → Template 4 in the thread
// { institution_id, contact_id, kind: "reply", subject?, body }     → contextual reply in the thread
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  try {
    const b = await request.json();
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const { data: inst } = await db.from("rc_institutions").select("*").eq("id", b.institution_id).maybeSingle();
    if (!inst || inst.campaign_id !== campaign.id) return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    const { data: contact } = await db.from("rc_contacts").select("*").eq("id", b.contact_id).maybeSingle();
    if (!contact || contact.institution_id !== inst.id) return NextResponse.json({ error: "Choose a contact of this institution" }, { status: 400 });
    if (!contact.email || !isValidEmail(contact.email)) return NextResponse.json({ error: "This contact has no e-mail address" }, { status: 400 });

    const { data: history } = await db.from("rc_messages").select("id, direction, step, state, subject, historical, created_at")
      .eq("institution_id", inst.id).neq("state", "cancelled").order("created_at", { ascending: true });
    const templates = await loadTemplates(db, campaign.id);
    const initialSent = (history || []).find((m) => m.step === "initial" && m.state === "sent");
    const originalSubject = (initialSent?.subject || (history || []).find((m) => m.subject)?.subject || null)?.replace(/^(re:\s*)+/i, "") ?? null;
    const vars = templateVars({
      contact, institutionName: inst.name, researchConnection: b.research_connection ?? null,
      originalSubject, campaign,
    });
    const base = {
      campaign_id: campaign.id, institution_id: inst.id, contact_id: contact.id, direction: "outbound",
      from_email: campaign.sender_email, to_email: contact.email, state: "draft", created_by: guard.chiamante.id,
    };

    if (b.kind === "sequence") {
      // Never start a fresh cold sequence where a conversation already exists.
      if ((history || []).length) {
        return NextResponse.json({ error: "This institution already has correspondence. Write a contextual reply in the thread instead of a new sequence." }, { status: 409 });
      }
      if (inst.previous_outreach && !b.override_previous) {
        return NextResponse.json({ error: `Previous outreach is recorded ("${inst.previous_outreach}"). Log that correspondence first, or confirm that a new sequence is appropriate.`, needsOverride: true }, { status: 409 });
      }
      if (!vars.research_connection) return NextResponse.json({ error: "Write the verified research or programme connection for this institution" }, { status: 400 });
      if (typeof b.personalisation_source !== "string" || !/^https?:\/\//.test(b.personalisation_source)) {
        return NextResponse.json({ error: "Give the official page (URL) that supports the personalisation" }, { status: 400 });
      }
      const initialSubject = renderTemplate(templates.initial.subject, vars).text;
      const fuVars = { ...vars, original_subject: initialSubject };
      const { data: initial, error } = await db.from("rc_messages").insert({
        ...base, step: "initial", template_key: "initial", template_version: templates.initial.version,
        personalisation_source: b.personalisation_source,
        subject: initialSubject, body: renderTemplate(templates.initial.body, vars).text,
      }).select().single();
      if (error) {
        const dup = error.code === "23505";
        return NextResponse.json({ error: dup ? "A sequence already exists for this institution" : error.message }, { status: dup ? 409 : 500 });
      }
      const fus = (["followup1", "followup2"] as const).map((k) => ({
        ...base, step: k, parent_message_id: initial.id, template_key: k, template_version: templates[k].version,
        subject: renderTemplate(templates[k].subject, fuVars).text, body: renderTemplate(templates[k].body, fuVars).text,
      }));
      const { error: fuErr } = await db.from("rc_messages").insert(fus);
      if (fuErr) {
        await db.from("rc_messages").update({ state: "cancelled", error_message: "Sequence creation failed" }).eq("id", initial.id);
        return NextResponse.json({ error: fuErr.message }, { status: 500 });
      }
      await logEvent(db, { campaign_id: campaign.id, institution_id: inst.id, actor: guard.chiamante.email || guard.chiamante.id, action: "sequence.draft", detail: { source: b.personalisation_source } });
      return NextResponse.json({ message: initial, markers: unresolvedMarkers(`${initial.subject}\n${initial.body}`) });
    }

    // Replies (Template 4 or contextual) continue the latest thread.
    const last = [...(history || [])].reverse().find((m) => m.state === "sent" || m.state === "received");
    if (!last) return NextResponse.json({ error: "Nothing to reply to yet" }, { status: 400 });
    let subject: string, body: string, templateKey: string | null = null, templateVersion: number | null = null;
    if (b.kind === "coordinator") {
      subject = renderTemplate(templates.coordinator.subject, vars).text;
      body = renderTemplate(templates.coordinator.body, vars).text;
      templateKey = "coordinator"; templateVersion = templates.coordinator.version;
    } else if (b.kind === "reply") {
      subject = typeof b.subject === "string" && b.subject.trim() ? b.subject : `Re: ${originalSubject ?? ""}`;
      body = typeof b.body === "string" && b.body.trim() ? b.body : `Dear ${vars.greeting},\n\n[Write the reply to their message.]\n\nKind regards,\n\nOlufemi Yusuf\nScientific Projects Lead, bioERGOtech Foundation`;
    } else {
      return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    }
    const { data, error } = await db.from("rc_messages").insert({
      ...base, step: b.kind === "coordinator" ? "coordinator" : "reply", parent_message_id: last.id,
      template_key: templateKey, template_version: templateVersion, subject, body,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(db, { campaign_id: campaign.id, institution_id: inst.id, actor: guard.chiamante.email || guard.chiamante.id, action: `message.draft.${b.kind}` });
    return NextResponse.json({ message: data, markers: unresolvedMarkers(`${data.subject}\n${data.body}`) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/admin/research/messages
// { id, action: "edit", subject, body } | { id, action: "submit" | "approve" | "unapprove" | "cancel" | "retry" }
// Approving an initial e-mail approves its two follow-ups with it (one approval per institution).
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const actor = guard.chiamante.email || guard.chiamante.id;
  try {
    const b = await request.json();
    const { data: m } = await db.from("rc_messages").select("*, rc_contacts(email, approved_for_contact)").eq("id", b.id).maybeSingle();
    if (!m) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (m.direction !== "outbound" || m.historical) return NextResponse.json({ error: "This message is read-only" }, { status: 400 });
    const now = new Date().toISOString();
    const contact = m.rc_contacts as { email: string | null; approved_for_contact: boolean } | null;

    // The set of messages this action applies to.
    let group = [m];
    if (m.step === "initial" && ["approve", "unapprove", "cancel"].includes(b.action)) {
      const { data: fus } = await db.from("rc_messages").select("*").eq("parent_message_id", m.id).in("step", ["followup1", "followup2"]).neq("state", "cancelled");
      group = [m, ...(fus || [])];
    }

    switch (b.action) {
      case "edit": {
        if (!EDITABLE.includes(m.state)) return NextResponse.json({ error: `A ${m.state} message cannot be edited` }, { status: 409 });
        const update: Record<string, unknown> = { state: "draft", approved_at: null, approved_by: null, updated_at: now };
        if (typeof b.subject === "string") update.subject = b.subject;
        if (typeof b.body === "string") update.body = b.body;
        const { data, error } = await db.from("rc_messages").update(update).eq("id", m.id).eq("state", m.state).select().maybeSingle();
        if (error || !data) return NextResponse.json({ error: error?.message || "Changed meanwhile; reload" }, { status: 409 });
        break;
      }
      case "submit":
        if (m.state !== "draft") return NextResponse.json({ error: "Only drafts can be submitted for review" }, { status: 409 });
        await db.from("rc_messages").update({ state: "in_review", updated_at: now }).eq("id", m.id).eq("state", "draft");
        break;
      case "approve": {
        const toApprove = group.filter((x) => ["draft", "in_review"].includes(x.state));
        if (!toApprove.length) return NextResponse.json({ error: `A ${m.state} message cannot be approved` }, { status: 409 });
        if (!contact?.approved_for_contact) return NextResponse.json({ error: "Approve the contact before approving messages to it" }, { status: 400 });
        for (const x of toApprove) {
          const markers = unresolvedMarkers(`${x.subject ?? ""}\n${x.body ?? ""}`);
          if (markers.length) return NextResponse.json({ error: `${x.step === "initial" ? "Initial e-mail" : x.step}: fill ${markers.join(", ")}` }, { status: 400 });
        }
        if ((m.step === "followup1" || m.step === "followup2") && m.parent_message_id) {
          const { data: parent } = await db.from("rc_messages").select("state").eq("id", m.parent_message_id).maybeSingle();
          if (!parent || !["approved", "sending", "sent"].includes(parent.state)) return NextResponse.json({ error: "Approve the initial e-mail first; its follow-ups are approved with it" }, { status: 400 });
        }
        for (const x of toApprove) {
          await db.from("rc_messages").update({ state: "approved", approved_by: guard.chiamante.id, approved_at: now, to_email: contact.email, updated_at: now }).eq("id", x.id).eq("state", x.state);
        }
        break;
      }
      case "unapprove":
        for (const x of group.filter((g) => g.state === "approved")) {
          await db.from("rc_messages").update({ state: "in_review", approved_by: null, approved_at: null, updated_at: now }).eq("id", x.id).eq("state", "approved");
        }
        break;
      case "retry":
        if (m.state !== "failed") return NextResponse.json({ error: "Only failed messages can be retried" }, { status: 409 });
        await db.from("rc_messages").update({ state: "in_review", approved_by: null, approved_at: null, updated_at: now }).eq("id", m.id).eq("state", "failed");
        break;
      case "cancel":
        for (const x of group.filter((g) => EDITABLE.includes(g.state))) {
          await db.from("rc_messages").update({ state: "cancelled", scheduled_for: null, updated_at: now }).eq("id", x.id).eq("state", x.state);
        }
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    await logEvent(db, { campaign_id: m.campaign_id, institution_id: m.institution_id, actor, action: `message.${b.action}`, detail: { message_id: m.id, count: group.length } });
    const { data: fresh } = await db.from("rc_messages").select("*").eq("id", m.id).single();
    return NextResponse.json({ message: fresh, markers: unresolvedMarkers(`${fresh?.subject ?? ""}\n${fresh?.body ?? ""}`) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
