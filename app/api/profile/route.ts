import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/profile?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const { data, error } = await getClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

// PATCH /api/profile — update own profile
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...fields } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
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

    const { data, error } = await getClient()
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
