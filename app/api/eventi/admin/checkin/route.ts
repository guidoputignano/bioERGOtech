import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";

const STATI = new Set(["registrato", "presente", "assente"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Segna la presenza (registrato, presente, assente) di un iscritto in una
 * giornata. Lo stato è per giornata: si può venire il 10 e non l'11.
 *
 * L'ora d'ingresso è la prima: segnare "presente" chi è già presente non la
 * sposta (due persone dello staff che scansionano lo stesso biglietto non
 * cambiano l'ora). "Registrato" e "assente" la cancellano.
 *
 * Risponde con la riga aggiornata, così il pannello non deve ricaricare tutto.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  let body: { registration_session_id?: unknown; stato?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const id = typeof body.registration_session_id === "string" ? body.registration_session_id : "";
  const stato = typeof body.stato === "string" ? body.stato : "";
  if (!UUID.test(id) || !STATI.has(stato)) {
    return NextResponse.json({ error: "Parametri non validi." }, { status: 400 });
  }

  const { data: attuale, error: readError } = await client
    .from("event_registration_sessions")
    .select("id, stato_checkin, checkin_ts")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[eventi/admin/checkin] lettura:", readError.message);
    return NextResponse.json({ error: "Non riesco a leggere la presenza dal database. Riprova." }, { status: 500 });
  }
  if (!attuale) {
    return NextResponse.json(
      { error: "Questa giornata non risulta più nell'iscrizione: aggiorna l'elenco." },
      { status: 404 },
    );
  }

  const checkin_ts =
    stato === "presente"
      ? attuale.stato_checkin === "presente" && attuale.checkin_ts
        ? attuale.checkin_ts
        : new Date().toISOString()
      : null;

  const { data: aggiornata, error: updateError } = await client
    .from("event_registration_sessions")
    .update({ stato_checkin: stato, checkin_ts })
    .eq("id", id)
    .select("id, stato_checkin, checkin_ts")
    .maybeSingle();

  if (updateError) {
    console.error("[eventi/admin/checkin] aggiornamento:", updateError.message);
    return NextResponse.json({ error: "La presenza non è stata salvata. Riprova." }, { status: 500 });
  }
  if (!aggiornata) {
    return NextResponse.json(
      { error: "Questa giornata non risulta più nell'iscrizione: aggiorna l'elenco." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, giornata: aggiornata });
}
