import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireMember } from "@/lib/auth/admin";

// GET /api/admin/users — list all users with their profiles
// Anche i membri normali passano di qui: MembersView del portale usa questo
// elenco per la rubrica dei membri. Serve pero un utente autenticato: prima
// questa rotta rispondeva a chiunque con tutte le email del sito.
export async function GET() {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { data, error } = await client
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
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

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

    const { data, error } = await client
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
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    // Un admin che cancella se stesso perde l'accesso al pannello e non puo
    // piu rientrare a rimediare.
    if (id === chiamante.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account from here" },
        { status: 400 },
      );
    }

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
