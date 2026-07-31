import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import {
  ambitoLabel,
  statoLabel,
  OBIETTIVI_CATEGORIA_C,
  STADI_CATEGORIA_A,
  STRUMENTI_RACCOLTA,
} from "@/app/eventi/vivere-piu-a-lungo/bando/content";

/** Cella CSV con escaping RFC 4180. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const etichetta = (lista: readonly { value: string; label: string }[], v: string) =>
  lista.find((x) => x.value === v)?.label ?? v;

/**
 * Export CSV delle candidature per il lavoro della Commissione: anagrafica,
 * categoria, dati economici, stato dell'istruttoria e nomi degli allegati.
 * I PDF restano nello storage privato e si scaricano dal pannello.
 */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { data, error: fetchError } = await client
    .from("bando_applications")
    .select("*")
    .order("created_at", { ascending: true });

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const headers = [
    "Codice", "Categoria", "Categoria riassegnata", "Stato", "Punteggio",
    "Progetto", "Sintesi", "Ambiti",
    "Organizzazione", "Forma giuridica", "Partita IVA", "Data costituzione",
    "Paese", "Citta", "Sito web",
    "Referente", "Ruolo", "Email", "Telefono", "Componenti team",
    "Stadio (A)", "Ente di ricerca (A)",
    "Raccolta B (EUR)", "Raccolta C (EUR)", "Ricavi C (EUR)", "Strumenti C", "Obiettivi C",
    "Video", "Pubblicazioni", "Brevetti",
    "Presenza Taranto", "Edizioni precedenti", "Allegati",
    "Avvisi di categoria", "Note della Commissione",
    "Consenso marketing", "Inviata il", "Aggiornata il",
  ];

  const lines = [headers.map(csvCell).join(",")];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    const allegati = [
      r.file_descrizione && "Descrizione",
      r.file_pitch_deck && "Pitch deck",
      r.file_documentazione && "Documentazione societaria",
      r.file_prospetto && "Prospetto raccolta",
      (r.file_extra?.length ?? 0) > 0 && `Facoltativi (${r.file_extra.length})`,
    ].filter(Boolean).join(" | ");

    lines.push(
      [
        r.codice,
        r.categoria,
        r.categoria_riassegnata ?? "",
        statoLabel(r.stato),
        r.punteggio ?? "",
        r.progetto_nome,
        r.progetto_sintesi,
        (r.ambiti ?? []).map(ambitoLabel).join(" | "),
        r.organizzazione ?? "",
        r.forma_giuridica ?? "",
        r.partita_iva ?? "",
        r.data_costituzione ?? "",
        r.paese,
        r.citta,
        r.sito_web ?? "",
        `${r.referente_nome} ${r.referente_cognome}`,
        r.referente_ruolo ?? "",
        r.referente_email,
        r.referente_telefono,
        r.team_dimensione ?? "",
        r.a_stadio ? etichetta(STADI_CATEGORIA_A, r.a_stadio) : "",
        r.a_ente_ricerca ?? "",
        r.b_raccolta_totale_eur ?? "",
        r.c_raccolta_totale_eur ?? "",
        r.c_ricavi_ultimo_anno_eur ?? "",
        (r.c_strumenti ?? []).map((s: string) => etichetta(STRUMENTI_RACCOLTA, s)).join(" | "),
        (r.c_obiettivi ?? []).map((o: string) => etichetta(OBIETTIVI_CATEGORIA_C, o)).join(" | "),
        r.video_url ?? "",
        r.pubblicazioni ?? "",
        r.brevetti ?? "",
        r.presenza_taranto ? "SI" : "NO",
        r.edizioni_precedenti ? "SI" : "NO",
        allegati,
        (r.categoria_avvisi ?? []).join(" | "),
        r.note_commissione ?? "",
        r.consenso_marketing ? "SI" : "NO",
        r.created_at,
        r.updated_at,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidature-bando-${date}.csv"`,
    },
  });
}
