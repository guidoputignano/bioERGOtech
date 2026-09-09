import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, requireMember } from "@/lib/auth/admin";

/**
 * Progetti del portale.
 *
 * Ogni metodo passa da requireMember o requireAdmin: la service role key
 * bypassa la RLS, quindi senza guardia queste rotte sarebbero scrivibili e
 * cancellabili da chiunque conosca l'indirizzo. Le righe contengono anche
 * lead_email e lead_phone, che sono dati personali.
 */

// Accredita punti usando il client gia autorizzato dalla guardia.
async function awardCoins(client: SupabaseClient, userId: string, amount: number, reason: string) {
  try {
    const { data: existing } = await client
      .from("coin_balances")
      .select("balance, lifetime_earned")
      .eq("user_id", userId)
      .single();

    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;

    await client.from("coin_balances").upsert({
      user_id: userId,
      balance: currentBalance + amount,
      lifetime_earned: currentLifetime + amount,
    }, { onConflict: "user_id" });

    await client.from("coin_transactions").insert({
      user_id: userId,
      amount,
      reason,
      type: "earn",
    });
  } catch (e) {
    console.error("Failed to award coins:", e);
  }
}

export async function GET() {
  const { error, status, client } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { data, error: dbError } = await client
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ projects: data });
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

    await awardCoins(client, chiamante.id, 40, `Project created: "${body.name?.trim()}"`);

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
