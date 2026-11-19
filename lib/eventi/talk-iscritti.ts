/**
 * Chi è iscritto a un talk, con nome, email e istituto: l'elenco che lo
 * staff scarica in CSV (`/api/eventi/talk/admin/export`) e a cui va il
 * promemoria del giorno del talk (`lib/eventi/talk-promemoria.ts`).
 *
 * Solo chi è ancora idoneo, con la stessa regola della pagina
 * (`idoneitaTalkPerUtenti`): sul sito il link lo vede chi è iscritto e
 * idoneo, e le email vanno alle stesse persone. Una riga di chi nel
 * frattempo non partecipa più al percorso resta nel conteggio del pannello
 * ma non entra nell'elenco, e i suoi dati non si leggono nemmeno. In un talk
 * aperto a tutti (`apertoATutti`) entrano tutti, come sul sito: chi non
 * partecipa più al percorso resta come ospite.
 *
 * La tabella delle iscrizioni non contiene nomi: lega l'account al talk e
 * basta. I nomi si leggono qui, dal posto in cui stanno già: l'iscrizione
 * ai licei, la candidatura all'università, l'adesione o la riga del
 * docente, e il profilo come ultimo ripiego.
 *
 * Solo server: usa il client con service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { TABELLA_TALK, idoneitaTalkPerUtenti } from "@/lib/eventi/talk-server";
import type { Talk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

/** Spezza un elenco in blocchi: i filtri `in` viaggiano nella URL. */
function blocchi<T>(valori: T[], dimensione = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < valori.length; i += dimensione) out.push(valori.slice(i, i + dimensione));
  return out;
}

/**
 * Le righe di `tabella` con `colonna` fra i valori dati, a blocchi. Una
 * tabella che in questo database non c'è (per esempio `licei_docenti` prima
 * della sua migrazione) torna vuota; un errore vero solleva.
 */
export async function righeDove<T>(
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

export type IscrittoTalk = Persona & {
  user_id: string;
  ruolo: string;
  /** L'istituto, "Università", "Fondazione bioERGOtech" o vuoto. */
  istituto: string;
};

/**
 * Tutti gli account iscritti al talk (anche chi non è più idoneo), e gli
 * iscritti idonei con i loro contatti. `presente: false` prima della
 * migrazione 20261216000000.
 */
export async function iscrittiTalkConContatti(
  db: Db,
  talk: Pick<Talk, "slug" | "apertoATutti">,
): Promise<{ presente: false } | { presente: true; account: string[]; iscritti: IscrittoTalk[] }> {
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
      if (erroreSchemaMancante(error, "tabella")) return { presente: false };
      throw new Error(`${TABELLA_TALK}: ${error.message}`);
    }
    iscrizioni.push(...((data ?? []) as typeof iscrizioni));
    if (!data || data.length < PAGINA) break;
  }

  // 2. Solo chi vedrebbe il link sul sito: iscritto e ancora idoneo.
  const idoneita = await idoneitaTalkPerUtenti(
    db,
    iscrizioni.map((r) => r.user_id),
    !!talk.apertoATutti,
  );
  const idonee = iscrizioni.filter((r) => idoneita.get(r.user_id)?.idoneo === true);

  const ids = [...new Set(idonee.map((r) => r.user_id))];
  const adesioniIds = [
    ...new Set(idonee.map((r) => r.adesione_id).filter((x): x is string => !!x)),
  ];

  // 3. I nomi, dove stanno già. Le letture sono indipendenti.
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

  /** Chi è, secondo il ruolo con cui si è iscritto e l'istituto registrato. */
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
    // Ultimo ripiego, e la strada degli ospiti: il profilo, con il nome
    // intero nella prima colonna.
    const prof = profiloDi.get(r.user_id);
    return { nome: prof?.full_name ?? "", cognome: "", email: prof?.email ?? "" };
  };

  const istituto = (r: (typeof iscrizioni)[number]): string => {
    if (r.ruolo === "studente_universita") return "Università";
    if (r.ruolo === "staff") return "Fondazione bioERGOtech";
    return (r.adesione_id && istitutoDi.get(r.adesione_id)) || "";
  };

  return {
    presente: true,
    account: [...new Set(iscrizioni.map((r) => r.user_id))],
    iscritti: idonee.map((r) => ({ ...persona(r), user_id: r.user_id, ruolo: r.ruolo, istituto: istituto(r) })),
  };
}
