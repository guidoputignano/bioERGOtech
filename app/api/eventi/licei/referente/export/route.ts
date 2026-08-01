import { NextResponse } from "next/server";
import { requireReferente } from "@/lib/eventi/licei-server";
import { statoIscrizioneLabel } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * L'elenco degli studenti del proprio istituto, in CSV.
 *
 * Non e un export di comodo: e l'elenco che l'art. 4 chiede all'istituto di
 * trasmettere. Per questo di default contiene solo le iscrizioni CONFERMATE
 * dal referente, che sono quelle di cui la scuola risponde. Con ?tutte=1 si
 * scarica anche il resto, per lavorarci sopra.
 */
export async function GET(request: Request) {
  const guard = await requireReferente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const tutte = new URL(request.url).searchParams.get("tutte") === "1";

  let query = client
    .from("licei_iscrizioni")
    .select("*")
    .eq("adesione_id", ctx.adesione.id)
    .order("anno_corso", { ascending: true })
    .order("cognome", { ascending: true });

  if (!tutte) query = query.eq("stato", "confermata");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "Cognome", "Nome", "Classe", "Anno di corso", "Email", "Stato",
    "Iscritto il", "Confermato il", "Note",
  ];
  const lines = [headers.map(csvCell).join(",")];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    lines.push(
      [
        r.cognome,
        r.nome,
        r.classe,
        r.anno_corso,
        r.email,
        statoIscrizioneLabel(r.stato),
        r.created_at,
        r.confermata_at ?? "",
        r.note_referente ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const slug = ctx.adesione.codice.toLowerCase();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="studenti-${slug}-${date}.csv"`,
    },
  });
}
