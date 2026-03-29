import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — all events including unapproved (admin only)
export async function GET() {
  const { data, error } = await getClient()
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}

// POST — create new event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error, data } = await getClient()
      .from("events")
      .insert({
        title: body.title?.trim(),
        event_date: body.event_date?.trim(),
        event_type: body.event_type,
        location: body.location?.trim(),
        description: body.description?.trim() || null,
        video_link: body.video_link?.trim() || null,
        is_public: body.is_public ?? true,
        is_approved: body.is_approved ?? true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH — update existing event
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

    const { error, data } = await getClient()
      .from("events")
      .update({
        title: fields.title?.trim(),
        event_date: fields.event_date?.trim(),
        event_type: fields.event_type,
        location: fields.location?.trim(),
        description: fields.description?.trim() || null,
        video_link: fields.video_link?.trim() || null,
        is_public: fields.is_public ?? true,
        is_approved: fields.is_approved ?? true,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE — remove event
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

    const { error } = await getClient()
      .from("events")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}