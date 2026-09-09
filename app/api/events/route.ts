import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";

/**
 * Eventi del portale.
 *
 * L'unico chiamante e la dashboard del Member Portal, che e dietro
 * autenticazione: la rotta non ha motivo di essere aperta. Le righe possono
 * contenere riferimenti a persone e organizzazioni non ancora pubblici.
 */
export async function GET() {
  const { error, status, client } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { data, error: dbError } = await client
    .from("events")
    .select("*")
    .eq("is_approved", true)
    .order("created_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ events: data });
}
