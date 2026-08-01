import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { statoAdesioneLabel } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/** Cella CSV con escaping RFC 4180. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Export CSV delle adesioni. Serve allo staff per dimensionare il percorso e
 * i posti all'evento, e al referente del consorzio per sapere quali istituti
 * hanno aderito. Non contiene alcun dato di studenti: in questa fase il sito
 * non ne raccoglie.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { data, error } = await client
    .from("licei_adesioni")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "Codice", "Stato", "Istituto", "Codice meccanografico", "Comune", "Provincia",
    "Email istituto", "Sito", "Dirigente",
    "Referente", "Email referente", "Telefono", "Materia",
    "Studenti terza", "Studenti quarta", "Studenti quinta", "Totale studenti",
    "Classi coinvolte", "Studenti attesi all'evento", "Docenti attesi all'evento",
    "Note dell'istituto", "Note staff", "Consenso marketing",
    "Inviata il", "Aggiornata il",
  ];

  const lines = [headers.map(csvCell).join(",")];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    lines.push(
      [
        r.codice,
        statoAdesioneLabel(r.stato),
        r.istituto_denominazione,
        r.codice_meccanografico,
        r.istituto_comune,
        r.istituto_provincia,
        r.istituto_email,
        r.istituto_sito ?? "",
        r.dirigente_nome ?? "",
        `${r.referente_nome} ${r.referente_cognome}`,
        r.referente_email,
        r.referente_telefono,
        r.referente_materia ?? "",
        r.studenti_terza,
        r.studenti_quarta,
        r.studenti_quinta,
        r.studenti_totale,
        r.classi_coinvolte ?? "",
        r.evento_studenti_stimati ?? "",
        r.evento_docenti_stimati ?? "",
        r.note ?? "",
        r.note_staff ?? "",
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
      "Content-Disposition": `attachment; filename="adesioni-licei-${date}.csv"`,
    },
  });
}
