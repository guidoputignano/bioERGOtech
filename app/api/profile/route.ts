import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";

/**
 * Profilo utente.
 *
 * La tabella profiles contiene dati personali (email, telefono, bio, ORCID,
 * organizzazione) e due flag di consenso, show_email e show_phone. Senza
 * guardia questa rotta li restituiva tutti a chiunque conoscesse un userId,
 * ignorando quei flag, e permetteva a chiunque di modificare il profilo
 * altrui passando un userId nel body.
 *
 * Regola: un membro vede e modifica solo il proprio profilo. Lo staff puo
 * agire su qualunque profilo.
 */

// GET /api/profile?userId=xxx
export async function GET(request: NextRequest) {
  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? chiamante.id;

  if (userId !== chiamante.id && !chiamante.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error: dbError } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

// PATCH /api/profile — update own profile
export async function PATCH(request: Request) {
  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const { userId: requestedId, ...fields } = body;

    // L'identita viene dalla sessione. Un userId nel body vale solo per lo
    // staff, e solo per dire su quale profilo sta agendo.
    const userId = chiamante.isAdmin ? (requestedId || chiamante.id) : chiamante.id;

    if (requestedId && requestedId !== chiamante.id && !chiamante.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = [
      "full_name", "job_title", "phone", "linkedin_url", "orcid_id",
      "department", "years_experience", "bio", "profile_photo_url",
      "organisation_name", "organisation_type", "organisation_website",
      "country", "city", "areas_of_interest", "what_you_bring", "what_you_seek",
      "open_to_collaboration", "open_to_mentoring", "show_email", "show_phone",
    ];

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updatePayload[key] = fields[key];
      }
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error: dbError } = await client
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
