import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { NextResponse } from "next/server";
import { categoriaLabel } from "@/app/eventi/vivere-piu-a-lungo/content";

/** Cella CSV con escaping RFC 4180. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Export CSV completo per le campagne post evento: anagrafica, categoria,
 * sessioni con stato di presenza, e flag consenso marketing. Questo e il
 * dato che alimenta le campagne (solo chi ha dato il consenso).
 */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { data, error: fetchError } = await client
    .from("event_registrations")
    .select(
      `nome, cognome, email, telefono, categoria, organizzazione, classe,
       startup_name, startup_url, note, codice_univoco, created_at,
       consenso_marketing, consenso_marketing_ts,
       event_registration_sessions (
         is_waitlist, stato_checkin,
         event_sessions ( titolo )
       )`,
    )
    .order("created_at", { ascending: true });

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const headers = [
    "Nome", "Cognome", "Email", "Telefono", "Categoria", "Organizzazione",
    "Classe", "Startup", "Sito startup", "Sessioni", "Presenze", "Note",
    "Codice", "Consenso marketing", "Data consenso marketing", "Iscritto il",
  ];

  const lines = [headers.map(csvCell).join(",")];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridges = (r.event_registration_sessions ?? []) as any[];
    const sessioni = bridges
      .map((b) => `${b.event_sessions?.titolo ?? ""}${b.is_waitlist ? " (lista attesa)" : ""}`)
      .join(" | ");
    const presenze = bridges
      .map((b) => `${b.event_sessions?.titolo ?? ""}: ${b.stato_checkin}`)
      .join(" | ");

    lines.push(
      [
        r.nome, r.cognome, r.email, r.telefono, categoriaLabel(r.categoria),
        r.organizzazione, r.classe, r.startup_name, r.startup_url,
        sessioni, presenze, r.note, r.codice_univoco,
        r.consenso_marketing ? "SI" : "NO", r.consenso_marketing_ts ?? "", r.created_at,
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
      "Content-Disposition": `attachment; filename="iscritti-evento-${date}.csv"`,
    },
  });
}
