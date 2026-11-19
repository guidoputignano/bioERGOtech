import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import { iscrittiTalkConContatti } from "@/lib/eventi/talk-iscritti";
import { ruoloTalkLabel, trovaTalk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/**
 * Export CSV degli iscritti a un talk, per lo staff: nome, cognome, email,
 * istituto (o "Università") e ruolo. Serve a mandare il link a chi si e
 * iscritto e a sapere chi c'era.
 *
 * Solo chi e ancora idoneo, con la stessa regola della pagina
 * (`idoneitaTalkPerUtenti`, che applica quella di `idoneitaTalk`): sul sito il
 * link lo vede chi e iscritto e idoneo, e il CSV con cui lo si manda per
 * email elenca le stesse persone. Una riga di chi nel frattempo non partecipa
 * piu al percorso (iscrizione ai licei rifiutata o ritirata, candidatura non
 * confermata, docente revocato, adesione ritirata, percorso licei chiuso)
 * resta nel conteggio del pannello ma non entra nel file, e i suoi dati non
 * si leggono nemmeno. In un talk aperto a tutti (`apertoATutti`) entrano
 * tutti, come sul sito: chi non partecipa piu al percorso resta come ospite.
 *
 * La tabella delle iscrizioni non contiene nomi: lega l'account al talk e
 * basta. I nomi si leggono qui, al momento dell'export, dal posto in cui
 * stanno gia: l'iscrizione ai licei, la candidatura all'universita,
 * l'adesione o la riga del docente, e il profilo come ultimo ripiego.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

/** Cella CSV con escaping RFC 4180. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const ORDINE_RUOLI = ["studente_licei", "studente_universita", "docente", "staff", "ospite"];

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client as Db;

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const talk = trovaTalk(slug);
  if (!talk) return NextResponse.json({ error: "Talk non trovato." }, { status: 404 });

  try {
    // Iscritti e ancora idonei, con nome, email e istituto: la regola sta in
    // lib/eventi/talk-iscritti.ts, la stessa del promemoria del giorno.
    const elenco = await iscrittiTalkConContatti(db, talk);
    if (!elenco.presente) {
      return NextResponse.json(
        { error: "Le iscrizioni ai talk non sono ancora attive: manca la migrazione 20261216000000." },
        { status: 503 },
      );
    }

    const righe = [...elenco.iscritti].sort(
      (a, b) =>
        ORDINE_RUOLI.indexOf(a.ruolo) - ORDINE_RUOLI.indexOf(b.ruolo) ||
        a.istituto.localeCompare(b.istituto, "it") ||
        a.cognome.localeCompare(b.cognome, "it") ||
        a.nome.localeCompare(b.nome, "it"),
    );

    const lines = [["Nome", "Cognome", "Email", "Istituto", "Ruolo"].map(csvCell).join(",")];
    for (const r of righe) {
      lines.push([r.nome, r.cognome, r.email, r.istituto, ruoloTalkLabel(r.ruolo)].map(csvCell).join(","));
    }

    const csv = "﻿" + lines.join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="talk-${talk.slug}-iscritti.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Talk export error:", err);
    return NextResponse.json({ error: "Export non riuscito. Riprova fra poco." }, { status: 500 });
  }
}
