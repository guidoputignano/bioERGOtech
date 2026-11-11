import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { csvToRecords, planImport, type ImportRow } from "@/lib/research-campaign/core";

const MAX_BYTES = 2_000_000;

// Research fields an import may refresh on an existing institution. Status,
// owner, next action and anything typed in the portal are never overwritten.
const REFRESHABLE = [
  "ref_code", "website", "city", "state", "cluster", "institution_type", "specialisations", "programme_evidence",
  "formats", "eligibility_notes", "fees_published", "august_availability", "key_unknowns", "source_url", "checked_on",
] as const;

// POST /api/admin/research/import  { csv: string, apply: boolean }
// apply=false returns the plan only (dry run). Imported contacts are never approved.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const actor = guard.chiamante.email || guard.chiamante.id;

  try {
    const { csv, apply } = await request.json();
    if (typeof csv !== "string" || !csv.trim()) return NextResponse.json({ error: "Paste or upload a CSV" }, { status: 400 });
    if (csv.length > MAX_BYTES) return NextResponse.json({ error: "CSV larger than 2 MB" }, { status: 413 });
    const campaign = await loadCampaign(db);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const [inst, cont] = await Promise.all([
      db.from("rc_institutions").select("id, name, domain").eq("campaign_id", campaign.id),
      db.from("rc_contacts").select("id, email, institution_id").eq("campaign_id", campaign.id),
    ]);
    if (inst.error || cont.error) throw new Error(inst.error?.message || cont.error?.message);

    const records = csvToRecords(csv);
    const plan = planImport(records, inst.data || [], cont.data || []);
    const summary = {
      rows: records.length,
      institutionsToCreate: plan.creates.length,
      institutionsToUpdate: plan.updates.length,
      contactsToCreate: plan.creates.reduce((n, r) => n + r.contacts.length, 0) + plan.updates.reduce((n, u) => n + u.row.contacts.length, 0),
      duplicateRows: plan.duplicateRows,
      skippedContacts: plan.skippedContacts,
      errors: plan.errors,
      warnings: [...plan.creates, ...plan.updates.map((u) => u.row)].flatMap((r) => r.warnings.map((w) => ({ line: r.line, warning: w }))),
    };
    if (!apply) return NextResponse.json({ dryRun: true, summary });

    const contactRows = (row: ImportRow, institutionId: string) => row.contacts.map((c) => ({
      ...c, campaign_id: campaign.id, institution_id: institutionId, approved_for_contact: false,
    }));

    let created = 0, updated = 0, contactsCreated = 0;
    const failures: { line: number; error: string }[] = [];
    for (const row of plan.creates) {
      const { data, error } = await db.from("rc_institutions").insert({ ...row.institution, campaign_id: campaign.id }).select("id").single();
      if (error || !data) { failures.push({ line: row.line, error: error?.message || "insert failed" }); continue; }
      created++;
      if (row.contacts.length) {
        const r = await db.from("rc_contacts").insert(contactRows(row, data.id)).select("id");
        if (r.error) failures.push({ line: row.line, error: `contacts: ${r.error.message}` }); else contactsCreated += r.data?.length ?? 0;
      }
    }
    for (const { id, row } of plan.updates) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of REFRESHABLE) {
        const v = row.institution[k];
        if (v !== null && v !== undefined && v !== "") patch[k] = v;
      }
      if (row.institution.domain) patch.domain = row.institution.domain;
      const { error } = await db.from("rc_institutions").update(patch).eq("id", id);
      if (error) { failures.push({ line: row.line, error: error.message }); continue; }
      updated++;
      if (row.contacts.length) {
        const r = await db.from("rc_contacts").insert(contactRows(row, id)).select("id");
        if (r.error) failures.push({ line: row.line, error: `contacts: ${r.error.message}` }); else contactsCreated += r.data?.length ?? 0;
      }
    }
    await logEvent(db, { campaign_id: campaign.id, actor, action: "import", detail: { created, updated, contactsCreated, failures: failures.length } });
    return NextResponse.json({ dryRun: false, summary, result: { created, updated, contactsCreated, failures } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }
}
