import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();
    const { data, error } = await client
      .from("projects")
      .insert({
        name: body.name?.trim(),
        pillar: body.pillar?.trim(),
        phase: body.phase?.trim(),
        status: body.status || "on-track",
        lead: body.lead?.trim(),
        lead_email: body.lead_email?.trim() || null,
        lead_phone: body.lead_phone?.trim() || null,
        description: body.description?.trim() || null,
        progress: Number(body.progress) || 0,
        color: body.color || "#2EC4B6",
        is_public: body.is_public ?? true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
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
    if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    // Si scrive solo quello che e stato mandato.
    //
    // Prima l'oggetto veniva costruito tutto in una volta, e una PATCH
    // parziale rovinava sei colonne. Le chiavi undefined spariscono da sole
    // quando il payload diventa JSON, quindi name, pillar, phase, status e
    // lead si salvavano per caso; le altre no. `undefined?.trim() || null`
    // vale null, e cosi lead_email, lead_phone e description venivano
    // azzerate; progress tornava a 0, color al teal di default e is_public a
    // true. Stesso schema della PATCH lato membro in app/api/projects.
    const updatePayload: Record<string, unknown> = {};

    if (fields.name !== undefined) updatePayload.name = fields.name?.trim();
    if (fields.pillar !== undefined) updatePayload.pillar = fields.pillar?.trim();
    if (fields.phase !== undefined) updatePayload.phase = fields.phase?.trim();
    if (fields.status !== undefined) updatePayload.status = fields.status;
    if (fields.lead !== undefined) updatePayload.lead = fields.lead?.trim();
    if (fields.lead_email !== undefined) updatePayload.lead_email = fields.lead_email?.trim() || null;
    if (fields.lead_phone !== undefined) updatePayload.lead_phone = fields.lead_phone?.trim() || null;
    if (fields.description !== undefined) updatePayload.description = fields.description?.trim() || null;
    if (fields.progress !== undefined) updatePayload.progress = Number(fields.progress) || 0;
    if (fields.color !== undefined) updatePayload.color = fields.color || "#2EC4B6";
    if (fields.is_public !== undefined) updatePayload.is_public = fields.is_public;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await client
      .from("projects")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
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
    if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    const { error } = await client
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}