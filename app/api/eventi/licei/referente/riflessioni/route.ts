import { NextResponse } from "next/server";
import { requireDocente } from "@/lib/eventi/licei-server";
import {
  leggiRiflessioni,
  slugLezioneValido,
  type IscrizioneRiflessioni,
} from "@/lib/eventi/licei-riflessioni";

/**
 * Riflessioni e domande delle lezioni, per i docenti dell'istituto: il
 * referente principale e i docenti del progetto, a istruzioni accettate.
 *
 * Una richiesta alla volta, su un clic del docente:
 * - `?iscrizione=<id>`: le consegne di uno studente;
 * - `?lezione=<slug>`: una lezione, per tutti gli studenti dell'istituto.
 *
 * Solo studenti CONFERMATI del proprio istituto: il client ha la service
 * role e RLS non lo ferma, quindi il filtro su `adesione_id` e su `stato` e
 * la vera guardia. Di ogni consegna solo riflessione e domanda, e solo se
 * salvata dopo l'avviso; di quelle di prima solo il numero. Il commento non
 * si legge, della risposta dello staff solo la data
 * (lib/eventi/licei-riflessioni.ts).
 *
 * Sola lettura, nessun export: i testi si leggono a schermo.
 */

const NESSUNA_CACHE = { "Cache-Control": "no-store" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGGIO_NON_TROVATO = "Studente non trovato fra i confermati del tuo istituto.";

export async function GET(request: Request) {
  const guard = await requireDocente();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status, headers: NESSUNA_CACHE });
  }
  const { client, ctx } = guard;

  const { searchParams } = new URL(request.url);
  const iscrizione = searchParams.get("iscrizione");
  const lezione = searchParams.get("lezione");

  if ((iscrizione === null) === (lezione === null)) {
    return NextResponse.json(
      { error: "Indica uno studente oppure una lezione." },
      { status: 400, headers: NESSUNA_CACHE },
    );
  }
  if (lezione !== null && !slugLezioneValido(lezione)) {
    return NextResponse.json({ error: "Lezione non valida." }, { status: 400, headers: NESSUNA_CACHE });
  }
  // Un id che non e un uuid e un id che non esiste.
  if (iscrizione !== null && !UUID.test(iscrizione)) {
    return NextResponse.json({ error: MESSAGGIO_NON_TROVATO }, { status: 404, headers: NESSUNA_CACHE });
  }

  let query = client
    .from("licei_iscrizioni")
    .select("id, nome, cognome, classe, user_id")
    .eq("adesione_id", ctx.adesione.id)
    .eq("stato", "confermata");
  if (iscrizione !== null) query = query.eq("id", iscrizione);
  const { data, error } = await query
    .order("cognome", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.error("Licei riflessioni: iscrizioni non lette:", error.message);
    return NextResponse.json(
      { error: "Non è stato possibile leggere le riflessioni. Riprova fra poco." },
      { status: 500, headers: NESSUNA_CACHE },
    );
  }
  const iscrizioni = (data ?? []) as IscrizioneRiflessioni[];
  if (iscrizione !== null && iscrizioni.length === 0) {
    return NextResponse.json({ error: MESSAGGIO_NON_TROVATO }, { status: 404, headers: NESSUNA_CACHE });
  }

  try {
    const risposta = await leggiRiflessioni(client, iscrizioni, { lezione });
    return NextResponse.json(risposta, { headers: NESSUNA_CACHE });
  } catch (err) {
    console.error("Licei riflessioni: consegne non lette:", err);
    return NextResponse.json(
      { error: "Non è stato possibile leggere le riflessioni. Riprova fra poco." },
      { status: 500, headers: NESSUNA_CACHE },
    );
  }
}
