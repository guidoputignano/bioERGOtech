import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  STATI_ISCRIZIONE_ATTIVI,
  haFattoAccesso,
  statoAdesioneLabel,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";

/** Cella CSV con escaping RFC 4180. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Export CSV delle adesioni. Serve allo staff per dimensionare il percorso e
 * i posti all'evento, e al referente del consorzio per sapere quali istituti
 * hanno aderito.
 *
 * Accanto ai numeri previsti all'adesione ci sono ora quelli veri: quanti
 * studenti si sono iscritti, quanti il referente ne ha confermati, quanti
 * non sono mai entrati nel corso. Restano aggregati per istituto. Nomi ed
 * email degli studenti non entrano in questo file: chi lo apre sta
 * dimensionando un percorso, e per l'elenco nominativo c'e l'export del
 * referente, che risponde dei propri studenti e non di quelli altrui.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const [{ data, error }, { data: iscrizioniStats }] = await Promise.all([
    client.from("licei_adesioni").select("*").order("created_at", { ascending: true }),
    client.rpc("licei_iscrizioni_stats"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const perAdesione = new Map<string, { iscritti: number; in_attesa: number; confermate: number }>(
    ((iscrizioniStats ?? []) as {
      adesione_id: string;
      iscritti: number;
      in_attesa: number;
      confermate: number;
    }[]).map((r) => [r.adesione_id, r]),
  );

  // Avanzamento sul corso e chi non e mai entrato, per istituto. Stesso
  // calcolo della rotta del pannello, e per la stessa ragione: "mai entrato"
  // dipende sia dalla data di accesso sia dalle lezioni consegnate, e i due
  // segnali si incontrano solo qui.
  const [{ data: studenti }, { data: accessi }] = await Promise.all([
    client.from("licei_iscrizioni").select("id, adesione_id, user_id, stato"),
    client.rpc("licei_accessi_tutti"),
  ]);

  const righeStudenti = (studenti ?? []) as {
    id: string;
    adesione_id: string;
    user_id: string | null;
    stato: string;
  }[];

  const ultimoAccesso = new Map<string, string | null>(
    ((accessi ?? []) as { iscrizione_id: string; ultimo_accesso: string | null }[]).map((a) => [
      a.iscrizione_id,
      a.ultimo_accesso,
    ]),
  );

  const progresso = await progressoPerUtenti(
    client,
    righeStudenti.map((r) => r.user_id).filter((id): id is string => !!id),
  );

  const perIstituto: Record<
    string,
    { confermati: number; lezioni: number; zero: number; mai_entrati: number }
  > = {};
  for (const r of righeStudenti) {
    if (!STATI_ISCRIZIONE_ATTIVI.has(r.stato)) continue;
    const acc = (perIstituto[r.adesione_id] ??= {
      confermati: 0,
      lezioni: 0,
      zero: 0,
      mai_entrati: 0,
    });
    const fatte = r.user_id ? (progresso.get(r.user_id) ?? 0) : 0;
    if (!haFattoAccesso({ ultimo_accesso: ultimoAccesso.get(r.id) ?? null, lezioni_completate: fatte })) {
      acc.mai_entrati += 1;
    }
    if (r.stato === "confermata") {
      acc.confermati += 1;
      acc.lezioni += fatte;
      if (fatte === 0) acc.zero += 1;
    }
  }

  const headers = [
    "Codice", "Stato", "Istituto", "Codice meccanografico", "Comune", "Provincia",
    "Email istituto", "Sito", "Dirigente",
    "Referente", "Email referente", "Telefono", "Materia",
    "Studenti terza", "Studenti quarta", "Studenti quinta", "Totale studenti previsti",
    "Iscritti davvero", "Confermati dal referente", "Da confermare", "Mai entrati nel corso",
    `Lezioni completate in media (su ${TOTALE_LEZIONI})`, "Confermati fermi a zero lezioni",
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
        perAdesione.get(r.id)?.iscritti ?? 0,
        perAdesione.get(r.id)?.confermate ?? 0,
        perAdesione.get(r.id)?.in_attesa ?? 0,
        perIstituto[r.id]?.mai_entrati ?? 0,
        perIstituto[r.id] && perIstituto[r.id].confermati > 0
          ? (perIstituto[r.id].lezioni / perIstituto[r.id].confermati).toFixed(1)
          : "",
        perIstituto[r.id]?.zero ?? 0,
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
