import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/check-email?email=xxx
// Returns { exists: true/false }
//
// Deve restare pubblica: la usa il modulo di registrazione per dire subito se
// un indirizzo e gia in uso. Risponde pero solo si o no. Distinguere "membro"
// da "candidatura in corso", come faceva prima con `source` e `status`,
// diceva a chiunque qualcosa sul rapporto di quella persona con la Fondazione
// senza aggiungere nulla al modulo, che legge soltanto `exists`.
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

  if (profile) return NextResponse.json({ exists: true });

  // Check applications table (pending or approved join-us applicants)
  const { data: application } = await client
    .from("applications")
    .select("id")
    .eq("email", email)
    .in("application_status", ["pending", "approved"])
    .maybeSingle();

  if (application) return NextResponse.json({ exists: true });

  return NextResponse.json({ exists: false });
}
