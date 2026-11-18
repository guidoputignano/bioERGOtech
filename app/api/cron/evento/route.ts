import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { eventoAdminClient } from "@/lib/eventi/evento-server";
import { PROMEMORIA_AUTOMATICO, descriviEsito, inviaCampagna, oggiRoma } from "@/lib/eventi/evento-comunicazioni";

/**
 * Il cron dell'evento, ogni mattina alle 7:30 UTC (le 8:30 in Italia
 * d'inverno, vedi vercel.json): manda il promemoria a tutti gli iscritti la
 * mattina di martedì 8 dicembre. Se quel giro non riesce (il database non è
 * a posto, Resend non risponde) ci riprova la mattina dopo, fino al 10
 * dicembre compreso. Fuori da quei giorni non fa niente e dice perché.
 *
 * Una volta sola: la chiave è la stessa del bottone "Invia ora" del
 * pannello, quindi se lo staff l'ha già mandato il cron non lo rimanda, e
 * un nuovo tentativo di Vercel non manda email doppie.
 *
 * Come gli altri cron del sito: senza CRON_SECRET la rotta resta chiusa.
 * Quando l'invio è bloccato o fallisce risponde 500, così il giro risulta
 * fallito anche nel pannello dei cron di Vercel.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET non configurato: cron rifiutato.");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oggi = oggiRoma();
  const finestra = { dal: PROMEMORIA_AUTOMATICO.dal, al: PROMEMORIA_AUTOMATICO.al };
  if (oggi < finestra.dal || oggi > finestra.al) {
    return NextResponse.json({
      promemoria: "saltato",
      motivo: oggi < finestra.dal ? "Troppo presto: il promemoria parte dall'8 dicembre." : "Troppo tardi: l'evento è iniziato.",
      oggi,
      finestra,
    });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Evento promemoria (cron): RESEND_API_KEY mancante, promemoria non inviato.");
    return NextResponse.json({ error: "RESEND_API_KEY mancante" }, { status: 500 });
  }
  const db = eventoAdminClient();
  if (!db) {
    console.error("Evento promemoria (cron): configurazione Supabase mancante, promemoria non inviato.");
    return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
  }

  try {
    const r = await inviaCampagna(db, new Resend(process.env.RESEND_API_KEY), "promemoria", {
      autore: null,
      origine: "cron",
    });
    switch (r.stato) {
      case "gia_inviata":
        return NextResponse.json({ promemoria: "saltato", motivo: "Già inviato.", inviato_at: r.inviato_at, oggi });
      case "inviata":
        console.log(`Evento promemoria (cron): inviato, ${descriviEsito(r.esito)}.`);
        return NextResponse.json({ promemoria: "inviato", inviato_at: r.inviato_at, esito: r.esito, oggi });
      case "bloccata":
        // Il dettaglio è per lo staff: lo vede anche nel pannello. Domani si riprova.
        console.error(`Evento promemoria (cron): bloccato (${r.tipo}). Nuovo tentativo domani mattina, se ancora in tempo.`);
        return NextResponse.json({ promemoria: "bloccato", tipo: r.tipo, motivo: r.messaggio, oggi }, { status: 500 });
      case "prenotazione_fallita":
        return NextResponse.json(
          { promemoria: "non_inviato", motivo: "Prenotazione dell'invio non riuscita: non è partito niente.", oggi },
          { status: 500 },
        );
      case "nessuna_partita":
        return NextResponse.json(
          { promemoria: "non_inviato", motivo: "Nessuna email è partita: si riprova domani mattina.", esito: r.esito, oggi },
          { status: 500 },
        );
    }
  } catch (err) {
    console.error("Evento promemoria (cron): giro non riuscito:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Giro non riuscito: nessuna email è partita." }, { status: 500 });
  }
}
