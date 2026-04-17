import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// Award coins directly via Supabase — no internal HTTP fetch
async function awardCoins(userId: string, amount: number, reason: string) {
  try {
    const client = getClient();

    // Get or create balance
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
  const { data, error } = await getClient()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await getClient()
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
        created_by: body.created_by || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Award +40 coins directly via Supabase
    if (body.created_by) {
      await awardCoins(body.created_by, 40, `Project created: "${body.name?.trim()}"`);
    }

    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
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
    if (fields.created_by !== undefined) updatePayload.created_by = fields.created_by || null;

    const { data, error } = await getClient()
      .from("projects")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  } catch {
