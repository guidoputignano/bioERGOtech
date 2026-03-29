import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    const { data, error } = await getClient()
      .from("projects")
      .update({
        name: fields.name?.trim(),
        pillar: fields.pillar?.trim(),
        phase: fields.phase?.trim(),
        status: fields.status,
        lead: fields.lead?.trim(),
        description: fields.description?.trim() || null,
        progress: Number(fields.progress) || 0,
        color: fields.color || "#2EC4B6",
        is_public: fields.is_public ?? true,
      })
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
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    const { error } = await getClient()
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}