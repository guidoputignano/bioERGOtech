import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireMember } from "@/lib/auth/admin";

/**
 * Richieste di riscatto.
 *
 * Le righe contengono user_email e user_name, quindi l'elenco completo e di
 * fatto un elenco di membri. Senza guardia era leggibile da chiunque, e
 * chiunque poteva aprire una richiesta a nome di un altro utente o
 * approvarne una cambiando lo stato.
 *
 * Regola: l'elenco completo e il cambio di stato sono staff. Un membro vede
 * e crea solo le proprie richieste.
 */

// GET /api/redemptions          → tutte le richieste (staff)
// GET /api/redemptions?userId=x → le richieste di un utente
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    const { error, status, client } = await requireAdmin();
    if (error || !client) return NextResponse.json({ error }, { status });

    const { data, error: dbError } = await client
      .from("redemption_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ requests: data });
  }

  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  if (userId !== chiamante.id && !chiamante.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error: dbError } = await client
    .from("redemption_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

// Niente POST.
//
// Il catalogo di riscatto e stato rimosso dal portale: nessuno chiama piu
// questa rotta per aprire una richiesta. La POST che c'era accettava
// coins_spent direttamente dal body, senza controllo e senza toccare
// coin_balances, quindi un membro autenticato poteva registrare una richiesta
// per un numero qualsiasi. Le richieste gia in tabella restano leggibili e
// chiudibili dallo staff con GET e PATCH qui sotto.

// PATCH /api/redemptions → lo staff evade una richiesta
export async function PATCH(request: Request) {
  const { error, status, client } = await requireAdmin();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const { id, status: newStatus, adminNotes } = body;

    if (!id || !newStatus) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const { data, error: dbError } = await client
      .from("redemption_requests")
      .update({
        status: newStatus,
        admin_notes: adminNotes || null,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
