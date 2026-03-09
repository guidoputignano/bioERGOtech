import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const VALID_LEVELS = ["viewer", "member", "partner", "admin"] as const;
type PartnershipLevel = typeof VALID_LEVELS[number];

// POST /api/admin/set-partnership
// Body: { userId: string, partnershipLevel: PartnershipLevel }
// Requires the requesting user to be an admin.
export async function POST(request: NextRequest) {
  // 1. Verify the requesting user is authenticated and is an admin
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("partnership_level")
    .eq("id", claimsData.claims.sub)
    .single();

  if (!requesterProfile || requesterProfile.partnership_level !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  // 2. Parse and validate the request body
  let body: { userId?: string; partnershipLevel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, partnershipLevel } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing or invalid userId" }, { status: 400 });
  }

  if (!partnershipLevel || !VALID_LEVELS.includes(partnershipLevel as PartnershipLevel)) {
    return NextResponse.json(
      { error: `Invalid partnershipLevel. Must be one of: ${VALID_LEVELS.join(", ")}` },
      { status: 400 }
    );
  }

  // 3. Use the service role client to update the profile (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Server misconfiguration: missing service role key" }, { status: 500 });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await adminClient
    .from("profiles")
    .update({
      partnership_level: partnershipLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId, partnershipLevel });
}
