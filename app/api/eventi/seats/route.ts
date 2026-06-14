import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const admin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

// GET — posti rimanenti per sessione (pubblico, per il contatore live).
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ seats: [] });
  }
  const { data, error } = await admin().rpc("event_seats_remaining");
  if (error) {
    console.error("seats error:", error);
    return NextResponse.json({ seats: [] });
  }
  return NextResponse.json({ seats: data });
}
