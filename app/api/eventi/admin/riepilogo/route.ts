import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { calcolaRiepilogo, caricaDatiPannello } from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloDati";

export const dynamic = "force-dynamic";

/**
 * Il riepilogo del pannello: allarmi, numeri per giornata, andamento delle
 * iscrizioni, categorie e organizzazioni. Tutto calcolato qui, su tutte le
 * iscrizioni (lette a pagine): il telefono dello staff riceve solo i totali.
 *
 * Se una lettura fallisce risponde con un errore, mai con numeri a zero.
 * Solo staff (requireAdmin).
 */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  try {
    const dati = await caricaDatiPannello(client);
    return NextResponse.json(calcolaRiepilogo(dati), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[eventi/admin/riepilogo]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Non riesco a leggere i dati dal database: i numeri non sono disponibili. Riprova tra poco." },
      { status: 500 },
    );
  }
}
