import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign } from "@/lib/research-campaign/server";
import { toCsv, totalScore } from "@/lib/research-campaign/core";

const INSTITUTION_COLUMNS = [
  "ref_code", "priority", "score", "score_outreach", "score_international", "score_capacity", "score_relevance",
  "score_august", "score_cost", "score_contact", "status", "cluster", "institution", "city", "state", "type", "website",
  "specialisations", "programme_evidence", "format", "eligibility_published", "fee_published", "august", "key_unknowns",
  "ineligible_reason", "previous_outreach", "owner", "last_activity_at", "next_action", "next_action_due", "source_url", "checked_on",
  "eng_contact_role", "eng_interest", "eng_duration", "eng_activities", "eng_eligibility", "eng_dates", "eng_participants",
  "eng_supervision_insurance", "eng_fees_conditions", "eng_documents", "eng_meeting", "contacts",
];
const CONTACT_COLUMNS = [
  "institution", "department", "person_name", "person_title", "email", "verification", "role_assessment", "referred_by", "approved_for_contact",
  "phone_e164", "timezone", "contact_form_url", "source_url", "verified_on",
];
const MESSAGE_COLUMNS = ["institution", "direction", "step", "historical", "state", "from_email", "to_email", "subject", "sent_at", "received_at", "delivery_status", "label", "body"];

// GET /api/admin/research/export?type=institutions|contacts|messages → CSV file
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const type = new URL(request.url).searchParams.get("type") || "institutions";
  const campaign = await loadCampaign(db);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  let csv: string;
  if (type === "contacts") {
    const { data, error } = await db.from("rc_contacts").select("*, rc_institutions(name)").eq("campaign_id", campaign.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const byId = new Map((data || []).map((c) => [c.id, c.person_name || c.email]));
    csv = toCsv((data || []).map((c) => ({ ...c, institution: (c.rc_institutions as { name: string } | null)?.name, referred_by: c.referred_by_contact_id ? byId.get(c.referred_by_contact_id) : "" })), CONTACT_COLUMNS);
  } else if (type === "messages") {
    const { data, error } = await db.from("rc_messages")
      .select("*, rc_institutions(name), rc_reply_labels(label, confirmed_at, created_at)")
      .eq("campaign_id", campaign.id).order("created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    csv = toCsv((data || []).map((m) => {
      const labels = ((m.rc_reply_labels as { label: string; confirmed_at: string | null; created_at: string }[]) || [])
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const best = labels.find((l) => l.confirmed_at) || labels[0];
      return { ...m, institution: (m.rc_institutions as { name: string } | null)?.name, label: best ? `${best.label}${best.confirmed_at ? "" : " (unconfirmed)"}` : "" };
    }), MESSAGE_COLUMNS);
  } else if (type === "summary") {
    // Management summary: institutions in conversation, most advanced first, with fees quoted.
    const ORDER = ["confirmed", "negotiating", "meeting", "qualified", "responded", "followup_due", "contacted", "no_response", "declined", "ineligible"];
    const { data, error } = await db.from("rc_institutions")
      .select("name, cluster, city, state, priority, status, owner, last_activity_at, next_action, next_action_due, eng_contact_role, eng_interest, eng_duration, eng_activities, eng_eligibility, eng_dates, eng_participants, eng_fees_conditions, eng_meeting, rc_costs(category, amount, currency, basis)")
      .eq("campaign_id", campaign.id).in("status", ORDER);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (data || []).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)).map((i) => ({
      ...i, institution: i.name,
      quoted_costs: ((i.rc_costs as { category: string; amount: number | null; currency: string; basis: string | null }[]) || [])
        .map((c) => `${c.category}: ${c.amount ?? "?"} ${c.currency}${c.basis ? ` ${c.basis.replace("_", " ")}` : ""}`).join(" ; "),
    }));
    csv = toCsv(rows, ["institution", "cluster", "city", "state", "priority", "status", "owner", "last_activity_at", "next_action", "next_action_due",
      "eng_contact_role", "eng_interest", "eng_duration", "eng_activities", "eng_eligibility", "eng_dates", "eng_participants", "eng_fees_conditions", "eng_meeting", "quoted_costs"]);
  } else {
    const { data, error } = await db.from("rc_institutions").select("*, rc_contacts(email, phone_e164, verification, approved_for_contact)").eq("campaign_id", campaign.id).order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    csv = toCsv((data || []).map((i) => ({
      ...i, score: totalScore(i), institution: i.name, type: i.institution_type, format: i.formats,
      eligibility_published: i.eligibility_notes, fee_published: i.fees_published, august: i.august_availability,
      contacts: ((i.rc_contacts as { email: string | null; phone_e164: string | null; verification: string; approved_for_contact: boolean }[]) || [])
        .map((c) => [c.email, c.phone_e164, c.verification, c.approved_for_contact ? "approved" : ""].filter(Boolean).join(" ")).join(" ; "),
    })), INSTITUTION_COLUMNS);
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="research-centres-${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
