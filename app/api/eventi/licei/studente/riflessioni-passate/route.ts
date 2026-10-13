import { NextResponse } from "next/server";
import { requireStudente, statoColonnaRiflessioni } from "@/lib/eventi/licei-server";
import {
  registraRiflessioniPassate,
  statoRiflessioniPassate,
  type AzionePassate,
} from "@/lib/eventi/licei-riflessioni";
import { sceltaRiflessioniPassateValida } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Le consegne inviate prima dell'avviso: le leggono anche i docenti
 * dell'istituto, tre giorni dopo che la piattaforma lo ha segnalato allo
 * studente, a meno che lui dica di no. Oppure subito, se dice «Va bene».
 * Lo decide lo studente, per se e da solo, sulla piattaforma.
 *
 * - `GET`: `{ disponibile, scelta: 'si' | 'no' | null, scelta_at,
 *   avvisato_at, visibili_dal, visibili, riservate }`, dove `riservate` e
 *   quante sono le sue consegne salvate prima dell'avviso, `visibili_dal`
 *   il momento da cui, senza una scelta, i docenti le leggono, e `visibili`
 *   se le leggono adesso, con l'ora del server. `{ disponibile: false }`
 *   prima della migrazione.
 * - `POST { azione: 'visto' }`: l'avviso e a schermo. Segna `avvisato_at`
 *   se non c'e; se c'e gia non cambia niente, e la scelta non la tocca.
 * - `POST { scelta: 'si' | 'no' }`: registra la scelta, o la cambia (e
 *   segna `avvisato_at`, se ancora non c'era).
 *
 * Vale per chi e iscritto in attesa o confermato, a percorso aperto: le
 * stesse persone a cui il box della lezione mostra l'avviso. La riga e
 * sempre quella dell'account che chiama, mai di un altro: nessun parametro
 * dice di chi.
 */

const NESSUNA_CACHE = { "Cache-Control": "no-store" };

const MESSAGGIO_NON_DISPONIBILE =
  "Questa scelta non è ancora disponibile. Le consegne inviate prima dell'avviso restano allo staff.";
const MESSAGGIO_ERRORE = "Non è stato possibile registrare la scelta. Riprova fra poco.";

export async function GET() {
  const guard = await requireStudente({ ancheInAttesa: true });
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status, headers: NESSUNA_CACHE });
  }
  try {
    // L'avviso e la scelta contano solo per l'istituto dell'iscrizione
    // attuale, come per i docenti: una riga di un'altra scuola qui vale
    // come nessuna.
    const stato = await statoRiflessioniPassate(
      guard.client,
      guard.ctx.userId,
      guard.ctx.iscrizione.adesione_id,
    );
    return NextResponse.json(stato, { headers: NESSUNA_CACHE });
  } catch (err) {
    console.error("Licei riflessioni passate GET:", err);
    return NextResponse.json(
      { error: "Non è stato possibile leggere la tua scelta. Riprova fra poco." },
      { status: 500, headers: NESSUNA_CACHE },
    );
  }
}

/**
 * Che cosa chiede il corpo: `{ azione: 'visto' }` oppure `{ scelta: 'si' |
 * 'no' }`, e nient'altro. Le due insieme, o qualsiasi altra cosa, sono una
 * richiesta non valida: nessuna scelta di default.
 */
function azioneDalCorpo(corpo: unknown): AzionePassate | null {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return null;
  const { azione, scelta } = corpo as { azione?: unknown; scelta?: unknown };
  if (azione === "visto" && scelta === undefined) return "visto";
  if (azione === undefined && sceltaRiflessioniPassateValida(scelta)) return scelta;
  return null;
}

export async function POST(request: Request) {
  const guard = await requireStudente({ ancheInAttesa: true });
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status, headers: NESSUNA_CACHE });
  }
  const { client, ctx } = guard;

  // Di chi sia la riga lo dice la guardia, non la richiesta.
  let corpo: unknown = null;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }
  const azione = azioneDalCorpo(corpo);
  if (!azione) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers: NESSUNA_CACHE });
  }

  // Senza la colonna nessuna consegna e condivisa, e i docenti non leggono
  // niente: un avviso o una scelta registrati ora non avrebbero effetto, e
  // lo studente crederebbe il contrario.
  const colonna = await statoColonnaRiflessioni(client);
  if (colonna === "assente") {
    return NextResponse.json(
      { error: MESSAGGIO_NON_DISPONIBILE, disponibile: false },
      { status: 503, headers: NESSUNA_CACHE },
    );
  }
  if (colonna === "errore") {
    return NextResponse.json({ error: MESSAGGIO_ERRORE }, { status: 500, headers: NESSUNA_CACHE });
  }

  try {
    const esito = await registraRiflessioniPassate(client, {
      userId: ctx.userId,
      adesioneId: ctx.iscrizione.adesione_id,
      azione,
    });
    if (!esito.disponibile) {
      return NextResponse.json(
        { error: MESSAGGIO_NON_DISPONIBILE, disponibile: false },
        { status: 503, headers: NESSUNA_CACHE },
      );
    }
    return NextResponse.json(
      {
        success: true,
        scelta: esito.scelta,
        scelta_at: esito.scelta_at,
        avvisato_at: esito.avvisato_at,
        visibili_dal: esito.visibili_dal,
        visibili: esito.visibili,
      },
      { headers: NESSUNA_CACHE },
    );
  } catch (err) {
    console.error("Licei riflessioni passate POST:", err);
    return NextResponse.json({ error: MESSAGGIO_ERRORE }, { status: 500, headers: NESSUNA_CACHE });
  }
}
