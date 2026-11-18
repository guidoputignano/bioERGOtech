import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { caricaDatiPannello } from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloDati";
import {
  confrontaPerData,
  filtraIscritti,
  leggiFiltri,
  type RispostaIscritti,
} from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloComune";

export const dynamic = "force-dynamic";

/**
 * L'elenco iscritti del pannello: tutte le iscrizioni (lette a pagine, oltre
 * il limite di 1000 righe di Supabase), con le giornate, la presenza e la
 * posizione in lista d'attesa, più i numeri di ogni giornata.
 *
 * Filtri facoltativi, gli stessi dell'elenco e dell'export: q, giornata
 * (anche col nome vecchio `session`), stato, categoria. Il pannello li
 * applica anche sul telefono, per non rifare la richiesta a ogni lettera.
 *
 * Solo staff (requireAdmin): espone dati personali in blocco.
 */
export async function GET(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const filtri = leggiFiltri(new URL(request.url).searchParams);

  try {
    const dati = await caricaDatiPannello(client);
    const iscritti = filtraIscritti(dati.iscritti, filtri).sort(confrontaPerData);
    const corpo: RispostaIscritti = {
      iscritti,
      totale: dati.iscritti.length,
      giornate: dati.giornate,
      mancanti: dati.mancanti,
      generato_at: new Date().toISOString(),
    };
    return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[eventi/admin/registrations]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Non riesco a leggere le iscrizioni dal database. Riprova tra poco." },
      { status: 500 },
    );
  }
}
