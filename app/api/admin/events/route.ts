import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

// GET — all events including unapproved (admin only)
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { data, error } = await client
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}

// POST — create new event
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();
    const { error, data } = await client
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
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

    const { error, data } = await client
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
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

    const { error } = await client
      .from("events")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}