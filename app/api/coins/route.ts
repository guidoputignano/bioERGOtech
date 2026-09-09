import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireMember } from "@/lib/auth/admin";

/**
 * Punti di contributo.
 *
 * I punti sono un registro interno: servono a tracciare i contributi, non
 * danno diritto a nulla di convertibile. Restano comunque dati da proteggere:
 * ?all=true restituisce il saldo di ogni utente unito al profilo, quindi
 * l'elenco completo dei membri con nome ed email. Senza guardia era leggibile
 * da chiunque.
 *
 * Regola: l'elenco completo e l'accredito sono solo staff. Un membro legge
 * solo il proprio saldo.
 */

// GET /api/coins?userId=xxx  → saldo e movimenti di un utente
// GET /api/coins?all=true    → saldi di tutti (staff)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  if (all) {
    const { error, status, client } = await requireAdmin();
    if (error || !client) return NextResponse.json({ error }, { status });

    const { data, error: dbError } = await client
      .from("coin_balances")
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          partnership_level
        )
      `)
      .order("lifetime_earned", { ascending: false });

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ balances: data });
  }

  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  const userId = searchParams.get("userId") ?? chiamante.id;

  if (userId !== chiamante.id && !chiamante.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: balance, error: balanceError } = await client
    .from("coin_balances")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (balanceError && balanceError.code !== "PGRST116") {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  const { data: transactions, error: txError } = await client
    .from("coin_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  return NextResponse.json({
    balance: balance || { user_id: userId, balance: 0, lifetime_earned: 0 },
    transactions: transactions || [],
  });
}

// POST /api/coins — accredita o addebita punti
// { userId, amount, reason, type: "earn" | "spend" | "admin" }
export async function POST(request: Request) {
  const { error, status, client, chiamante } = await requireMember();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const { userId, amount, reason, type } = body;

    if (!userId || amount === undefined || !reason || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Un membro puo solo togliere punti dal proprio saldo: e cosi che il
    // portale registra un riscatto o la rimozione di un progetto. Creare
    // punti resta un'azione di staff, altrimenti chiunque potrebbe
    // accreditarsene quanti ne vuole.
    if (!chiamante.isAdmin) {
      const spendingOwn = userId === chiamante.id && Number(amount) < 0 && type === "spend";
      if (!spendingOwn) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: existing } = await client
      .from("coin_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;

    if (type === "spend" && currentBalance + amount < 0) {
      return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    }

    const newBalance = currentBalance + amount;
    const newLifetime = amount > 0 ? currentLifetime + amount : currentLifetime;

    const { data: updatedBalance, error: upsertError } = await client
      .from("coin_balances")
      .upsert({
        user_id: userId,
        balance: newBalance,
        lifetime_earned: newLifetime,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const { error: txError } = await client
      .from("coin_transactions")
      .insert({ user_id: userId, amount, reason, type });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({ balance: updatedBalance });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
