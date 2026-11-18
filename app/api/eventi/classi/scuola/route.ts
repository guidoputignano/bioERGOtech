import { NextResponse } from "next/server";
import { adesioneDaCodice } from "@/lib/eventi/classi-server";
import { eventoAdminClient } from "@/lib/eventi/evento-server";
import { ARCHIVE_MODE } from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * GET /api/eventi/classi/scuola?codice=LIC-XXXXXXXX: la scuola dell'invito,
 * per riempire il modulo delle scuole dal link dell'email
 * (/eventi/vivere-piu-a-lungo/classi?scuola=LIC-XXXXXXXX).
 *
 * 200 { istituto, comune } per un'adesione al percorso dei licei confermata
 * o attiva; 404 { error } per tutto il resto (un codice malformato e uno
 * sconosciuto si rispondono allo stesso modo). Solo il nome e il comune
 * della scuola, che sono pubblici: niente referente, niente email.
 *
 * Limitata per indirizzo: frena chi prova codici a caso.
 */
export const dynamic = "force-dynamic";

const SENZA_CACHE = { "Cache-Control": "no-store, max-age=0" };
const NON_TROVATA =
  "Non troviamo la scuola di questo invito. Scrivi il nome della scuola nel modulo: la prenotazione vale lo stesso.";

/* ── Limiti in memoria (best effort: valgono per istanza del server) ── */

const FINESTRA_MS = 10 * 60 * 1000;
/** Richieste in tutto e codici sbagliati, per indirizzo e per finestra. */
const MAX_RICHIESTE = 120;
const MAX_FALLITE = 20;
const contatori = new Map<string, { n: number; fallite: number; da: number }>();

function indirizzo(request: Request): string {
  const inoltrato = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return inoltrato || request.headers.get("x-real-ip")?.trim() || "sconosciuto";
}

function contatore(ip: string, adesso: number) {
  if (contatori.size > 1000) {
    for (const [k, v] of contatori) if (adesso - v.da >= FINESTRA_MS) contatori.delete(k);
  }
  let c = contatori.get(ip);
  if (!c || adesso - c.da >= FINESTRA_MS) {
    c = { n: 0, fallite: 0, da: adesso };
    contatori.set(ip, c);
  }
  return c;
}

export async function GET(request: Request) {
  if (ARCHIVE_MODE) {
    return NextResponse.json({ error: "L'evento si è concluso: le prenotazioni sono chiuse." }, { status: 410, headers: SENZA_CACHE });
  }

  const c = contatore(indirizzo(request), Date.now());
  c.n += 1;
  if (c.n > MAX_RICHIESTE || c.fallite >= MAX_FALLITE) {
    return NextResponse.json({ error: "Troppi tentativi in poco tempo. Riprova tra qualche minuto." }, { status: 429, headers: SENZA_CACHE });
  }

  const codice = (new URL(request.url).searchParams.get("codice") ?? "").slice(0, 40);
  const client = eventoAdminClient();
  if (!client) {
    console.error("Scuola dell'invito: configurazione Supabase mancante (URL o service role).");
    return NextResponse.json({ error: "Il servizio non è disponibile in questo momento." }, { status: 503, headers: SENZA_CACHE });
  }

  const adesione = codice.trim() ? await adesioneDaCodice(client, codice) : null;
  if (!adesione) {
    c.fallite += 1;
    return NextResponse.json({ error: NON_TROVATA }, { status: 404, headers: SENZA_CACHE });
  }
  return NextResponse.json({ istituto: adesione.istituto, comune: adesione.comune }, { headers: SENZA_CACHE });
}
