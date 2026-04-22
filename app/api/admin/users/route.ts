import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/admin/users — list all users with their profiles
export async function GET() {
  const { data, error } = await getClient()
    .from("profiles")
    .select("id, email, full_name, partnership_level, organisation_id, organisation_name")
    .order("email");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

// PATCH /api/admin/users — update a user's partnership level or organisation
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, partnership_level, organisation_id } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (partnership_level !== undefined) {
      const validLevels = ["viewer", "member", "partner", "admin"];
      if (!validLevels.includes(partnership_level)) {
        return NextResponse.json({ error: "Invalid partnership level" }, { status: 400 });
      }
      updatePayload.partnership_level = partnership_level;
    }

    if (organisation_id !== undefined) {
      updatePayload.organisation_id = organisation_id || null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await getClient()
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/admin/users — delete a profile and auth user by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    const client = getClient();

    // Delete profile first
    const { error: profileError } = await client
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Delete auth user (best-effort)
    try {
      await client.auth.admin.deleteUser(id);
    } catch (e) {
      console.error("Auth user deletion failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}