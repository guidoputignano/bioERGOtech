import { NextResponse } from "next/server";
import { requireAdmin, requireMember } from "@/lib/auth/admin";

/**
 * Progetti del portale.
 *
 * Ogni metodo passa da requireMember o requireAdmin: la service role key
 * bypassa la RLS, quindi senza guardia queste rotte sarebbero scrivibili e
 * cancellabili da chiunque conosca l'indirizzo. Le righe contengono anche
 * lead_email e lead_phone, che sono dati personali.
 */

export async function GET() {
  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { data, error: dbError } = await client
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // I recapiti del referente non escono dalla riga di chi non c'entra.
  //
  // requireMember lascia passare qualunque utente autenticato, quindi senza
  // questo filtro l'elenco progetti consegnava email e telefono di ogni
  // referente a ogni iscritto. Il progetto resta visibile a tutti: sono solo
  // i due campi personali a restare allo staff e a chi ha creato la riga.
  const progetti = (data ?? []).map((riga) => {
    if (chiamante.isAdmin || riga.created_by === chiamante.id) return riga;
    const resto = { ...riga };
    delete resto.lead_email;
    delete resto.lead_phone;
    return resto;
  });

  return NextResponse.json({ projects: progetti });
}

export async function POST(request: Request) {
  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();

    const { data, error: dbError } = await client
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
        objectives: Array.isArray(body.objectives) ? body.objectives : [],
        update_notes: body.update_notes?.trim() || null,
        // L'autore viene dalla sessione, mai dal body: altrimenti chiunque
        // potrebbe accreditare punti a un utente qualsiasi.
        created_by: chiamante.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });


    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const { error, status, client } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

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
    if (fields.objectives !== undefined) updatePayload.objectives = Array.isArray(fields.objectives) ? fields.objectives : [];
    if (fields.update_notes !== undefined) updatePayload.update_notes = fields.update_notes?.trim() || null;

    const { data, error: dbError } = await client
      .from("projects")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  // Cancellare un progetto e irreversibile: solo staff.
  const { error, status, client } = await requireAdmin();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    const { error: dbError } = await client
      .from("projects")
      .delete()
      .eq("id", id);

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
