import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logEvent } from "@/lib/research-campaign/server";
import { isValidEmail, normaliseDomain, normaliseEmail } from "@/lib/research-campaign/core";

// GET /api/admin/research/suppressions
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { data, error } = await guard.client.from("rc_suppressions").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suppressions: data });
}

// POST /api/admin/research/suppressions  { value, kind: "email" | "domain", reason? }
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const b = await request.json();
    const kind = b.kind === "domain" ? "domain" : "email";
    const value = kind === "domain" ? normaliseDomain(b.value) : normaliseEmail(b.value);
    if (!value || (kind === "email" && !isValidEmail(value))) return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    const reason = ["bounce", "complaint", "declined", "no_further_contact", "manual"].includes(b.reason) ? b.reason : "manual";
    const { error } = await guard.client.from("rc_suppressions").upsert({ value, kind, reason }, { onConflict: "kind,value" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(guard.client, { actor: guard.chiamante.email || guard.chiamante.id, action: "suppression.add", detail: { kind, reason } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/admin/research/suppressions  { id }
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { id } = await request.json();
    const { error } = await guard.client.from("rc_suppressions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logEvent(guard.client, { actor: guard.chiamante.email || guard.chiamante.id, action: "suppression.remove", detail: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
