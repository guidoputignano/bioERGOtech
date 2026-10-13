import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { TABELLA_TALK, idoneitaTalkPerUtenti } from "@/lib/eventi/talk-server";
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
 * si leggono nemmeno.
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

/** Spezza un elenco in blocchi: i filtri `in` viaggiano nella URL. */
function blocchi<T>(valori: T[], dimensione = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < valori.length; i += dimensione) out.push(valori.slice(i, i + dimensione));
  return out;
}

/**
 * Le righe di `tabella` con `colonna` fra i valori dati, a blocchi. Una
 * tabella che in questo database non c'e (per esempio `licei_docenti` prima
 * della sua migrazione) torna vuota; un errore vero solleva.
 */
async function righeDove<T>(
  db: Db,
  tabella: string,
  colonne: string,
  colonna: string,
  valori: string[],
): Promise<T[]> {
  const out: T[] = [];
  for (const blocco of blocchi(valori)) {
    const { data, error } = await db.from(tabella).select(colonne).in(colonna, blocco).limit(1000);
    if (error) {
      if (erroreSchemaMancante(error)) return out;
      throw new Error(`${tabella}: ${error.message}`);
    }
    out.push(...((data ?? []) as T[]));
  }
  return out;
}

type Persona = { nome: string; cognome: string; email: string };

const ORDINE_RUOLI = ["studente_licei", "studente_universita", "docente", "staff"];

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client as Db;

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const talk = trovaTalk(slug);
  if (!talk) return NextResponse.json({ error: "Talk non trovato." }, { status: 404 });

  try {
    // 1. Le iscrizioni, a pagine.
    const iscrizioni: { user_id: string; ruolo: string; adesione_id: string | null }[] = [];
    const PAGINA = 1000;
    for (let da = 0; ; da += PAGINA) {
      const { data, error } = await db
        .from(TABELLA_TALK)
        .select("user_id, ruolo, adesione_id")
        .eq("talk_slug", talk.slug)
        .order("id", { ascending: true })
        .range(da, da + PAGINA - 1);
      if (error) {
        if (erroreSchemaMancante(error, "tabella")) {
          return NextResponse.json(
            { error: "Le iscrizioni ai talk non sono ancora attive: manca la migrazione 20261216000000." },
            { status: 503 },
          );
        }
        throw new Error(`${TABELLA_TALK}: ${error.message}`);
      }
      iscrizioni.push(...((data ?? []) as typeof iscrizioni));
      if (!data || data.length < PAGINA) break;
    }

    // 2. Solo chi vedrebbe il link sul sito: iscritto e ancora idoneo.
    const idoneita = await idoneitaTalkPerUtenti(db, iscrizioni.map((r) => r.user_id));
    const idonee = iscrizioni.filter((r) => idoneita.get(r.user_id)?.idoneo === true);

    const ids = [...new Set(idonee.map((r) => r.user_id))];
    const adesioniIds = [
      ...new Set(idonee.map((r) => r.adesione_id).filter((x): x is string => !!x)),
    ];

    // 3. I nomi, dove stanno gia. Le letture sono indipendenti.
    const [studenti, candidati, referenti, docenti, profili, istituti] = await Promise.all([
      righeDove<Persona & { user_id: string; adesione_id: string | null }>(
        db, "licei_iscrizioni", "user_id, nome, cognome, email, adesione_id", "user_id", ids,
      ),
      righeDove<Persona & { user_id: string }>(
        db, "universita_candidature", "user_id, nome, cognome, email", "user_id", ids,
      ),
      righeDove<{ id: string; user_id: string; referente_nome: string; referente_cognome: string; referente_email: string }>(
        db, "licei_adesioni", "id, user_id, referente_nome, referente_cognome, referente_email", "user_id", ids,
      ),
      righeDove<Persona & { user_id: string; adesione_id: string }>(
        db, "licei_docenti", "user_id, nome, cognome, email, adesione_id", "user_id", ids,
      ),
      righeDove<{ id: string; email: string | null; full_name: string | null }>(
        db, "profiles", "id, email, full_name", "id", ids,
      ),
      righeDove<{ id: string; istituto_denominazione: string }>(
        db, "licei_adesioni", "id, istituto_denominazione", "id", adesioniIds,
      ),
    ]);

    const istitutoDi = new Map(istituti.map((a) => [a.id, a.istituto_denominazione]));
    const profiloDi = new Map(profili.map((p) => [p.id, p]));

    /** Chi e, secondo il ruolo con cui si e iscritto e l'istituto registrato. */
    const persona = (r: (typeof iscrizioni)[number]): Persona => {
      const stessoIstituto = <T extends { adesione_id?: string | null }>(xs: T[]) =>
        xs.find((x) => r.adesione_id && x.adesione_id === r.adesione_id) ?? xs[0];
      let p: Persona | undefined;
      if (r.ruolo === "studente_licei") {
        p = stessoIstituto(studenti.filter((s) => s.user_id === r.user_id));
      } else if (r.ruolo === "studente_universita") {
        p = candidati.find((c) => c.user_id === r.user_id);
      } else if (r.ruolo === "docente") {
        const ref =
          referenti.find((a) => a.user_id === r.user_id && a.id === r.adesione_id) ??
          referenti.find((a) => a.user_id === r.user_id);
        p = ref
          ? { nome: ref.referente_nome, cognome: ref.referente_cognome, email: ref.referente_email }
          : stessoIstituto(docenti.filter((d) => d.user_id === r.user_id));
      }
      if (p) return { nome: p.nome, cognome: p.cognome, email: p.email };
      // Ultimo ripiego: il profilo, con il nome intero nella prima colonna.
      const prof = profiloDi.get(r.user_id);
      return { nome: prof?.full_name ?? "", cognome: "", email: prof?.email ?? "" };
    };

    const istituto = (r: (typeof iscrizioni)[number]): string => {
      if (r.ruolo === "studente_universita") return "Università";
      if (r.ruolo === "staff") return "Fondazione bioERGOtech";
      return (r.adesione_id && istitutoDi.get(r.adesione_id)) || "";
    };

    const righe = idonee
      .map((r) => ({ ...persona(r), istituto: istituto(r), ruolo: r.ruolo }))
      .sort(
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
