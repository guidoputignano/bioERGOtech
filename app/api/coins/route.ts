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
 * Regola: l'elenco completo e la registrazione sono solo staff. Un membro
 * legge solo il proprio record.
 *
 * Non si accredita piu niente in automatico. Le cinque chiamate che facevano
 * punti su un'azione (creare un progetto, approvare un documento, approvare
 * un'attrezzatura, un referral, presenza a un evento) sono state tolte: erano
 * metriche di ingaggio, e un contributo non e un click. Resta la
 * registrazione fatta da una persona, con una motivazione scritta.
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
      // Ordinato per nome, non per punteggio: una classifica di persone e
      // esattamente quello che questo registro non deve essere.
      .order("user_id", { ascending: true });

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

// POST /api/coins: registra un contributo (staff)
// { userId, amount, reason, type }
export async function POST(request: Request) {
  // Solo staff. Prima un membro poteva togliersi punti da solo, con
  // type "spend": serviva al catalogo di riscatto, che non esiste piu. Un
  // registro dove il soggetto stesso scrive le righe non e un registro.
  const { error, status, client } = await requireAdmin();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const { userId, amount, reason, type } = body;

    if (!userId || amount === undefined || !reason || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const importo = Number(amount);
    if (!Number.isFinite(importo) || !Number.isInteger(importo) || importo === 0) {
      return NextResponse.json({ error: "Amount must be a non-zero integer" }, { status: 400 });
    }

    const { data: existing } = await client
      .from("coin_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;

    // lifetime segue il totale in entrambe le direzioni. Con il vecchio
    // calcolo una correzione al ribasso lasciava il totale gonfiato, e finche
    // esistevano gli accrediti automatici bastava creare e cancellare un
    // progetto in ciclo per farlo salire senza limite.
    const newBalance = currentBalance + importo;
    const newLifetime = Math.max(0, currentLifetime + importo);

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
      .insert({ user_id: userId, amount: importo, reason, type });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({ balance: updatedBalance });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
