import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { liceiAdminClient } from "@/lib/eventi/licei-server";
import { eseguiCalendario } from "@/lib/eventi/licei-commissione-auto";

/**
 * Il cron del promemoria del giorno del talk, ogni giorno alle 12 UTC (le 13
 * in Italia d'inverno). Esegue solo il passo `talk_oggi` del calendario dei
 * licei: fuori dalla sua finestra (il 19 novembre, dalle 11 alle 14:30) non
 * fa niente, e il passo si fa una volta sola. Il giro del mattino
 * (`/api/cron/licei-commissione`) resta com'è: questo non lo ripete.
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
    const risultato = await eseguiCalendario(db, new Resend(process.env.RESEND_API_KEY), new Date(), ["talk_oggi"]);
    if (risultato.occupato) {
      console.warn("Licei talk di oggi: un altro giro del calendario è in corso, passo non eseguito. Dal pannello: Esegui ora i passi dovuti, entro le 14:30.");
    }
    for (const e of risultato.esiti) {
      if (e.stato === "eseguito" || e.stato === "da_rifare") console.log(`Licei talk di oggi: ${e.id}: ${e.stato}: ${e.dettagli.join(" | ")}`);
    }
    return NextResponse.json(risultato);
  } catch (err) {
    console.error("Licei talk di oggi: giro non riuscito:", err);
    return NextResponse.json({ error: "Giro non riuscito." }, { status: 500 });
  }
}
