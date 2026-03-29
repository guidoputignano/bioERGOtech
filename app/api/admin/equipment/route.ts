import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — all proposals
export async function GET() {
  const { data, error } = await getClient()
    .from("equipment_proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposals: data });
}

// POST — submit a new proposal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await getClient()
      .from("equipment_proposals")
      .insert({
        name: body.name?.trim(),
        category: body.category?.trim() || null,
        location: body.location?.trim(),
        description: body.description?.trim() || null,
        proposed_by_email: body.proposed_by_email?.trim() || null,
        proposed_by_name: body.proposed_by_name?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ proposal: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH — approve or reject a proposal
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, admin_notes } = body;
    if (!id || !status) return NextResponse.json({ error: "Missing id or status" }, { status: 400 });

    const { data, error } = await getClient()
      .from("equipment_proposals")
      .update({
        status,
        admin_notes: admin_notes?.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ proposal: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE — remove a proposal
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await getClient()
      .from("equipment_proposals")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}