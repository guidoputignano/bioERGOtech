import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/check-email?email=xxx
// Returns { exists: true/false, source: "auth" | "application" | null }
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase().trim();

  if (!email) return NextResponse.json({ exists: false }, { status: 400 });

  const client = getClient();

  // Check profiles table (covers both sign-up and approved join-us users)
  const { data: profile } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profile) return NextResponse.json({ exists: true, source: "auth" });

  // Check applications table (pending or approved join-us applicants)
  const { data: application } = await client
    .from("applications")
    .select("id, application_status")
    .eq("email", email)
    .in("application_status", ["pending", "approved"])
    .maybeSingle();

  if (application) {
    return NextResponse.json({
      exists: true,
      source: "application",
      status: application.application_status,
    });
  }

  return NextResponse.json({ exists: false, source: null });
}
