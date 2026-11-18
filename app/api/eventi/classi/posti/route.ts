import { NextResponse } from "next/server";
import { postiClassi } from "@/lib/eventi/classi-server";
import { eventoAdminClient } from "@/lib/eventi/evento-server";

/**
 * GET /api/eventi/classi/posti: i posti per le classi, giornata per
 * giornata, per il modulo delle scuole. Solo numeri aggregati
 * (event_group_seats), mai una prenotazione.
 *
 * 200 [{ slug, capienza_max, quota_gruppi, posti_classi, rimanenti, rimanenti_classi }]
 *   - quota_gruppi: i posti che le classi possono occupare (null: nessun limite oltre la capienza);
 *   - rimanenti: i posti liberi per tutti;
 *   - rimanenti_classi: quelli che una classe può ancora prenotare.
 * 503 { error } se i posti non si leggono: il modulo funziona lo stesso, e
 * decide comunque la prenotazione.
 *
 * Mai in cache: i posti cambiano a ogni prenotazione.
 */
export const dynamic = "force-dynamic";

const SENZA_CACHE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const client = eventoAdminClient();
  if (!client) {
    console.error("Posti delle classi: configurazione Supabase mancante (URL o service role).");
    return NextResponse.json({ error: "I posti non sono disponibili in questo momento." }, { status: 503, headers: SENZA_CACHE });
  }
  const posti = await postiClassi(client);
  if (posti.length === 0) {
    return NextResponse.json({ error: "I posti non sono disponibili in questo momento." }, { status: 503, headers: SENZA_CACHE });
  }
  return NextResponse.json(
    posti.map((p) => ({
      slug: p.slug,
      capienza_max: p.capienza_max,
      quota_gruppi: p.quota_gruppi,
      posti_classi: p.posti_classi,
      rimanenti: p.rimanenti,
      rimanenti_classi: p.rimanenti_classi,
    })),
    { headers: SENZA_CACHE },
  );
}
