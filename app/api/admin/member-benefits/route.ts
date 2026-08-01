import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

// GET — list benefits ordered for display. By default only active cards are
// returned (member-facing). Pass ?all=true for the admin editor.
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  let query = client
    .from("member_benefits")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!all) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ benefits: data });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();

    const payload = {
      name: body.name?.trim(),
      description: body.description?.trim() || null,
      detail: body.detail?.trim() || null,
      icon: body.icon?.trim() || "star",
      color: body.color?.trim() || "#2EC4B6",
      bg: body.bg?.trim() || "#E6FAF8",
      action_type: body.action_type === "active" ? "active" : "request",
      action_label: body.action_label?.trim() || null,
      action_href: body.action_href?.trim() || null,
      action_nav_to: body.action_nav_to?.trim() || null,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      is_active: body.is_active ?? true,
    };

    if (!payload.name) {
      return NextResponse.json({ error: "Benefit name is required" }, { status: 400 });
    }

    const { data, error } = await client
      .from("member_benefits")
      .insert(payload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ benefit: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "Missing benefit id" }, { status: 400 });

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.name !== undefined) updatePayload.name = fields.name?.trim();
    if (fields.description !== undefined) updatePayload.description = fields.description?.trim() || null;
    if (fields.detail !== undefined) updatePayload.detail = fields.detail?.trim() || null;
    if (fields.icon !== undefined) updatePayload.icon = fields.icon?.trim() || "star";
    if (fields.color !== undefined) updatePayload.color = fields.color?.trim() || "#2EC4B6";
    if (fields.bg !== undefined) updatePayload.bg = fields.bg?.trim() || "#E6FAF8";
    if (fields.action_type !== undefined) updatePayload.action_type = fields.action_type === "active" ? "active" : "request";
    if (fields.action_label !== undefined) updatePayload.action_label = fields.action_label?.trim() || null;
    if (fields.action_href !== undefined) updatePayload.action_href = fields.action_href?.trim() || null;
    if (fields.action_nav_to !== undefined) updatePayload.action_nav_to = fields.action_nav_to?.trim() || null;
    if (fields.sort_order !== undefined) updatePayload.sort_order = Number(fields.sort_order) || 0;
    if (fields.is_active !== undefined) updatePayload.is_active = fields.is_active;

    const { data, error } = await client
      .from("member_benefits")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ benefit: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing benefit id" }, { status: 400 });

    const { error } = await client
      .from("member_benefits")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
