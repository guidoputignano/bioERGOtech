import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { PLACEHOLDERS, TEMPLATE_KEYS, unknownPlaceholders } from "@/lib/research-campaign/templates";

// GET /api/admin/research/templates → the four templates and the placeholder list
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const campaign = await loadCampaign(guard.client);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const { data, error } = await guard.client.from("rc_templates").select("*").eq("campaign_id", campaign.id).order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const order = (k: string) => TEMPLATE_KEYS.indexOf(k as (typeof TEMPLATE_KEYS)[number]);
  return NextResponse.json({ templates: (data || []).sort((a, b) => order(a.key) - order(b.key)), placeholders: PLACEHOLDERS });
}

// PATCH /api/admin/research/templates  { key, subject, body }
// Saves a new version. Messages already drafted or approved keep the text
// they were created with; only new drafts use the new version.
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const b = await request.json();
    if (!TEMPLATE_KEYS.includes(b.key)) return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    if (typeof b.subject !== "string" || !b.subject.trim() || typeof b.body !== "string" || !b.body.trim()) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }
    const unknown = unknownPlaceholders(`${b.subject}\n${b.body}`);
    if (unknown.length) return NextResponse.json({ error: `Unknown placeholders: ${unknown.map((u) => `{{${u}}}`).join(", ")}` }, { status: 400 });
    if (/—/.test(`${b.subject}${b.body}`)) return NextResponse.json({ error: "House style: replace the em dash (—) with a full stop, comma or colon" }, { status: 400 });
    const campaign = await loadCampaign(guard.client);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const { data: cur } = await guard.client.from("rc_templates").select("version").eq("campaign_id", campaign.id).eq("key", b.key).single();
    const { data, error } = await guard.client.from("rc_templates").update({
      subject: b.subject.trim(), body: b.body.replace(/\r\n/g, "\n").trim(), version: (cur?.version ?? 0) + 1,
      updated_by: guard.chiamante.id, updated_at: new Date().toISOString(),
    }).eq("campaign_id", campaign.id).eq("key", b.key).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(guard.client, { campaign_id: campaign.id, actor: guard.chiamante.email || guard.chiamante.id, action: "template.update", detail: { key: b.key, version: data.version } });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
