import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eventoAdminClient } from "@/lib/eventi/evento-server";
import {
  PROMEMORIA_AUTOMATICO,
  descriviEsito,
  inviaCampagna,
  oggiRoma,
  type CampagnaId,
} from "@/lib/eventi/evento-comunicazioni";

/**
 * Il cron dell'evento, ogni mattina alle 7:30 UTC (le 8:30 in Italia
 * d'inverno, vedi vercel.json): la mattina di martedì 8 dicembre manda due
 * promemoria, ognuno per conto suo:
 *
 * - alle classi: a ogni docente che ha prenotato una classe, l'email della
 *   classe con il QR, le giornate e il settore;
 * - agli iscritti: a ogni persona iscritta, il biglietto.
 *
 * Se un giro non riesce (il database non è a posto, Resend non risponde) ci
 * riprova la mattina dopo, fino al 10 dicembre compreso. Fuori da quei giorni
 * non fa niente e dice perché.
 *
 * Ognuno ha la sua chiave in licei_config, la stessa del bottone "Invia ora"
 * del pannello: se lo staff l'ha già mandato il cron non lo rimanda, e un
 * nuovo tentativo di Vercel non manda email doppie. Un problema di uno non
 * ferma l'altro: le classi partono prima (sono poche e veloci), poi gli
 * iscritti, ognuno con il suo esito.
 *
 * Come gli altri cron del sito: senza CRON_SECRET la rotta resta chiusa.
 * Quando uno dei due invii è bloccato o fallisce risponde 500, così il giro
 * risulta fallito anche nel pannello dei cron di Vercel.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type EsitoGiro = { fallito: boolean; corpo: Record<string, unknown> };

/** Un promemoria: non lancia mai, l'esito dice com'è andata. */
async function giro(db: SupabaseClient, resend: Resend, campagna: CampagnaId, nome: string): Promise<EsitoGiro> {
  try {
    const r = await inviaCampagna(db, resend, campagna, { autore: null, origine: "cron" });
    switch (r.stato) {
      case "gia_inviata":
        return { fallito: false, corpo: { stato: "saltato", motivo: "Già inviato.", inviato_at: r.inviato_at } };
      case "inviata":
        console.log(`Evento ${nome} (cron): inviato, ${descriviEsito(r.esito)}.`);
        return { fallito: false, corpo: { stato: "inviato", inviato_at: r.inviato_at, esito: r.esito } };
      case "bloccata":
        // Nessuna classe da avvisare non è un guasto: domani si guarda di nuovo.
        if (r.tipo === "nessun_destinatario") {
          return { fallito: false, corpo: { stato: "saltato", motivo: r.messaggio } };
        }
        // Il dettaglio è per lo staff: lo vede anche nel pannello. Domani si riprova.
        console.error(`Evento ${nome} (cron): bloccato (${r.tipo}). Nuovo tentativo domani mattina, se ancora in tempo.`);
        return { fallito: true, corpo: { stato: "bloccato", tipo: r.tipo, motivo: r.messaggio } };
      case "prenotazione_fallita":
        return {
          fallito: true,
          corpo: { stato: "non_inviato", motivo: "Prenotazione dell'invio non riuscita: non è partito niente." },
        };
      case "nessuna_partita":
        return {
          fallito: true,
          corpo: { stato: "non_inviato", motivo: "Nessuna email è partita: si riprova domani mattina.", esito: r.esito },
        };
    }
  } catch (err) {
    console.error(`Evento ${nome} (cron): giro non riuscito:`, err instanceof Error ? err.message : err);
    return { fallito: true, corpo: { stato: "non_inviato", motivo: "Giro non riuscito: nessuna email è partita." } };
  }
}

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
      motivo: oggi < finestra.dal ? "Troppo presto: i promemoria partono dall'8 dicembre." : "Troppo tardi: l'evento è iniziato.",
      oggi,
      finestra,
    });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Evento promemoria (cron): RESEND_API_KEY mancante, promemoria non inviati.");
    return NextResponse.json({ error: "RESEND_API_KEY mancante" }, { status: 500 });
  }
  const db = eventoAdminClient();
  if (!db) {
    console.error("Evento promemoria (cron): configurazione Supabase mancante, promemoria non inviati.");
    return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Uno dopo l'altro, non insieme: i due invii a blocchi resterebbero sotto
  // il limite di Resend ciascuno, ma non insieme.
  const classi = await giro(db, resend, "promemoria_classi", "promemoria classi");
  const iscritti = await giro(db, resend, "promemoria", "promemoria");

  return NextResponse.json(
    { oggi, promemoria: iscritti.corpo, promemoria_classi: classi.corpo },
    { status: classi.fallito || iscritti.fallito ? 500 : 200 },
  );
}
