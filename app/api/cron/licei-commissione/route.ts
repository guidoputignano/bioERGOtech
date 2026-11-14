import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { liceiAdminClient } from "@/lib/eventi/licei-server";
import { eseguiCalendario } from "@/lib/eventi/licei-commissione-auto";

/**
 * Il cron del calendario della Commissione dei licei, ogni mattina alle 7
 * UTC (le 8 in Italia d'inverno): promemoria di consegna, smistamento,
 * promemoria ai giudici, ridistribuzione, copertura. Che cosa fa e quando
 * sta in `PASSI_AUTOMATICI`; il lavoro in `eseguiCalendario`. Ogni passo si
 * fa una volta, quindi un giro in piu (dal pannello, o un nuovo tentativo
 * di Vercel) non manda email doppie.
 *
 * Come gli altri cron del sito: senza CRON_SECRET la rotta resta chiusa.
 */
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
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY mancante" }, { status: 500 });
  }
  const db = liceiAdminClient();
  if (!db) return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });

  try {
    const risultato = await eseguiCalendario(db, new Resend(process.env.RESEND_API_KEY));
    // Nei log di Vercel resta una riga per passo, senza dati personali.
    for (const e of risultato.esiti) {
      if (e.stato === "eseguito" || e.stato === "da_rifare") console.log(`Licei calendario: ${e.id}: ${e.stato}: ${e.dettagli.join(" | ")}`);
    }
    return NextResponse.json(risultato);
  } catch (err) {
    console.error("Licei calendario: giro non riuscito:", err);
    return NextResponse.json({ error: "Giro non riuscito." }, { status: 500 });
  }
}
