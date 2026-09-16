/**
 * La bozza e la consegna del progetto di squadra.
 *
 * Due verbi e una differenza sola, che pero decide tutto: la bozza si
 * salva quante volte si vuole e puo essere incompleta, perche e il caso
 * normale di un lavoro in corso; la consegna si fa una volta e chiede
 * tutto, perche quello che si consegna e quello che la Commissione legge, e
 * dopo non si tocca piu.
 *
 * Nessuna delle due si fida dell'id del progetto: la squadra la stabilisce
 * la guardia, il progetto si trova dalla squadra, e le scritture filtrano
 * per entrambi. Con la service role attiva, un id nel corpo della richiesta
 * sarebbe il permesso di riscrivere il lavoro di chiunque.
 */

import { NextResponse } from "next/server";
import {
  requireCandidato,
  universitaAdminClient,
  utenteCorrenteUniversita,
  verificaConsegneAperte,
} from "@/lib/eventi/universita-server";
import {
  validateBozza,
  validateConsegna,
  type ProgettoInput,
} from "@/lib/eventi/universita-squadre";
import { CAMPI_PROGETTO_UNIVERSITA } from "@/app/eventi/vivere-piu-a-lungo/universita/content";

type Client = NonNullable<ReturnType<typeof universitaAdminClient>>;

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Dal corpo della richiesta alle colonne, e niente altro.
 *
 * L'elenco dei campi viene da `CAMPI_PROGETTO_UNIVERSITA`, quindi e lo
 * stesso che la pagina mostra e che la Commissione valuta. Copiare il corpo
 * cosi com'e lascerebbe passare `stato`, `vincitore` o `posizione`, cioe
 * l'esito, scritto da chi partecipa.
 */
function patchDaBody(body: Partial<ProgettoInput>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (body.titolo !== undefined) patch.titolo = testo(body.titolo);
  if (body.ambito !== undefined) patch.ambito = testo(body.ambito) || null;
  for (const c of CAMPI_PROGETTO_UNIVERSITA) {
    if (body[c.campo] !== undefined) patch[c.campo] = testo(body[c.campo]);
  }
  if (body.link_materiali !== undefined) patch.link_materiali = testo(body.link_materiali) || null;
  return patch;
}

/** Il progetto della squadra, con quante persone ci sono dentro. */
async function progettoDellaSquadra(client: Client, squadraId: string) {
  const [{ data: progetto }, { count }] = await Promise.all([
    client.from("universita_progetti").select("*").eq("squadra_id", squadraId).maybeSingle(),
    client
      .from("universita_candidature")
      .select("id", { count: "exact", head: true })
      .eq("squadra_id", squadraId),
  ]);
  if (!progetto) return null;
  return { progetto, componenti: count ?? 0 };
}

/* ═══════════════════════════════════════════════════════════════════════
   PATCH . salva la bozza
   ═══════════════════════════════════════════════════════════════════════ */

/** Ci scrive chiunque sia in squadra: il progetto e di tutti, non del capitano. */
export async function PATCH(request: Request) {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaConsegneAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const squadraId = ctx.candidatura.squadra_id;
  if (!squadraId) {
    return NextResponse.json(
      { error: "Prima di scrivere il progetto devi entrare in una squadra." },
      { status: 409 },
    );
  }

  const dati = await progettoDellaSquadra(client, squadraId);
  if (!dati) {
    // La riga nasce insieme alla squadra, quindi se manca e successo
    // qualcosa che va guardato nei log e non spiegato a chi sta scrivendo.
    console.error("Universita progetto mancante per la squadra:", squadraId);
    return NextResponse.json(
      { error: "Non è stato possibile trovare il progetto della vostra squadra." },
      { status: 500 },
    );
  }

  if (dati.progetto.stato === "consegnato") {
    return NextResponse.json(
      { error: "Il progetto è già stato consegnato e non è più modificabile." },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<ProgettoInput>;
  const errore = validateBozza(body);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  const patch = patchDaBody(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error } = await client
    .from("universita_progetti")
    .update(patch)
    .eq("id", dati.progetto.id)
    .eq("squadra_id", squadraId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Universita progetto update error:", error);
    return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 500 });
  }

  return NextResponse.json({ success: true, progetto: data });
}

/* ═══════════════════════════════════════════════════════════════════════
   POST . consegna
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Consegna chiunque sia in squadra, non il solo capitano.
 *
 * Nel gemello dei licei la conferma finale e del capitano, e li ha senso:
 * la classe si vede tutti i giorni e il capitano e in aula. Qui il gruppo
 * puo stare in tre citta diverse, e all'ora del termine il capitano
 * potrebbe semplicemente non essere davanti a un computer. Far dipendere da
 * una persona sola l'unico atto che non si puo rimandare significherebbe
 * perdere lavori gia finiti per un treno in ritardo.
 *
 * Quello che si consegna e quello che c'e scritto a database, non quello
 * che il client manda insieme al comando: cosi la conferma vale sulla
 * stessa versione che tutti i compagni hanno letto.
 */
export async function POST() {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaConsegneAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const squadraId = ctx.candidatura.squadra_id;
  if (!squadraId) {
    return NextResponse.json(
      { error: "Prima di consegnare devi entrare in una squadra." },
      { status: 409 },
    );
  }

  const dati = await progettoDellaSquadra(client, squadraId);
  if (!dati) {
    console.error("Universita progetto mancante per la squadra:", squadraId);
    return NextResponse.json(
      { error: "Non è stato possibile trovare il progetto della vostra squadra." },
      { status: 500 },
    );
  }

  if (dati.progetto.stato === "consegnato") {
    return NextResponse.json({ error: "Il progetto è già stato consegnato." }, { status: 409 });
  }

  const errore = validateConsegna(dati.progetto, dati.componenti);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  // Il filtro su `stato` e la difesa contro due consegne simultanee: la
  // seconda non trova piu una bozza e non sovrascrive l'ora della prima.
  const { data, error } = await client
    .from("universita_progetti")
    .update({ stato: "consegnato", consegnato_at: new Date().toISOString() })
    .eq("id", dati.progetto.id)
    .eq("squadra_id", squadraId)
    .eq("stato", "bozza")
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error("Universita consegna error:", error);
    return NextResponse.json({ error: "Consegna non riuscita. Riprova." }, { status: 500 });
  }

  return NextResponse.json({ success: true, progetto: data });
}
