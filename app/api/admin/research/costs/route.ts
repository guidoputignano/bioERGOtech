import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logEvent, touchInstitution } from "@/lib/research-campaign/server";

const CATEGORIES = ["hosting_fee", "lab_access", "insurance_safety", "materials", "administrative", "travel_accommodation", "other"];
const BASES = ["per_student", "per_group", "per_day", "other"];

// GET /api/admin/research/costs?institution_id=…
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const id = new URL(request.url).searchParams.get("institution_id");
  let q = guard.client.from("rc_costs").select("*, rc_institutions(name)").order("created_at");
  if (id) q = q.eq("institution_id", id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ costs: data });
}

// POST /api/admin/research/costs  { institution_id, category, amount?, currency?, basis?, description?, quote_reference? }
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const b = await request.json();
    if (!b.institution_id || !CATEGORIES.includes(b.category)) return NextResponse.json({ error: "institution_id and a valid category are required" }, { status: 400 });
    const amount = b.amount === "" || b.amount === null || b.amount === undefined ? null : Number(b.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    const { data, error } = await guard.client.from("rc_costs").insert({
      institution_id: b.institution_id, category: b.category, amount,
      currency: typeof b.currency === "string" && /^[A-Z]{3}$/.test(b.currency) ? b.currency : "USD",
      basis: BASES.includes(b.basis) ? b.basis : null, description: b.description || null, quote_reference: b.quote_reference || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await touchInstitution(guard.client, b.institution_id);
    await logEvent(guard.client, { institution_id: b.institution_id, actor: guard.chiamante.email || guard.chiamante.id, action: "cost.add", detail: { category: b.category } });
    return NextResponse.json({ cost: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/admin/research/costs  { id }
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { id } = await request.json();
    const { error } = await guard.client.from("rc_costs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
