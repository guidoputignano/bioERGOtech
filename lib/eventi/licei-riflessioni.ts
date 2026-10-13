/**
 * Riflessioni e domande delle lezioni, lette dai docenti dell'istituto.
 *
 * Che cosa vede un docente, e soltanto quello:
 * - gli studenti CONFERMATI del proprio istituto, nessun altro;
 * - di ogni consegna, `reflection` e `question`, e solo se la riga e stata
 *   salvata dopo che lo studente ha visto l'avviso nel box della lezione
 *   (`condivisa_referente_at` valorizzata). Le consegne di prima restano
 *   allo staff: del docente si sa solo quante sono, mai il testo. Fa
 *   eccezione lo studente che ha scelto lui, dalla piattaforma, di
 *   condividere anche quelle (`licei_accettazioni`, documento
 *   `riflessioni_passate`, scelta "si"): allora si leggono tutte le sue, e
 *   tornano riservate appena la scelta diventa "no";
 * - della risposta dello staff, solo se c'e e quando. Il testo di
 *   `admin_reply` e scritto per lo studente e al docente non serve;
 * - il `comment` mai: resta dello staff. Non si seleziona nemmeno.
 *
 * Qui c'e anche la meta dello studente di quella scelta: leggerla con il
 * numero delle sue consegne di prima, e registrarla.
 *
 * Lato server soltanto. La console importa da qui i soli tipi.
 *
 * Nessuno `user_id` esce verso i docenti: serve al server per legare le
 * consegne alle iscrizioni, e li si ferma.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { COURSE_LESSONS, SUBMITTABLE_LESSONS } from "@/app/courses/course-data";
import { COLONNA_RIFLESSIONI_CONDIVISE, erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { LIMITE_RIGHE, blocchiPerUtenti } from "@/lib/eventi/licei-progresso";
import {
  DOCUMENTO_RIFLESSIONI_PASSATE,
  DOMANDA_RIFLESSIONI_PASSATE,
  ETICHETTE_RIFLESSIONI_PASSATE,
  VERSIONE_RIFLESSIONI_PASSATE,
  sceltaRiflessioniPassateValida,
  type SceltaRiflessioniPassate,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

/* ── Le forme che escono dalla rotta ──────────────────────────────────── */

export type LezioneRiflessioni = { slug: string; numero: string; titolo: string };

/** Una consegna condivisa con i docenti: niente commento, niente risposta. */
export type ConsegnaCondivisa = {
  lezione: LezioneRiflessioni;
  riflessione: string;
  domanda: string | null;
  /** Quando lo studente l'ha salvata l'ultima volta. */
  salvata_at: string;
  /** Quando lo staff ha risposto, se ha risposto. Il testo resta allo staff. */
  risposta_staff_at: string | null;
};

export type StudenteRiflessioni = {
  iscrizione_id: string;
  nome: string;
  cognome: string;
  classe: string;
  /**
   * Consegne salvate prima dell'avviso: restano allo staff, se ne dice il
   * numero. Zero per chi ha scelto di condividerle: le sue sono tutte fra le
   * consegne, e nella risposta non c'e altro che lo dica.
   */
  riservate: number;
  consegne: ConsegnaCondivisa[];
};

export type RiflessioniRisposta =
  | { disponibile: false }
  | {
      disponibile: true;
      /** La lezione chiesta, per la lettura per lezione; null per uno studente. */
      lezione: LezioneRiflessioni | null;
      /**
       * Per uno studente: lui solo, anche senza consegne. Per una lezione:
       * gli studenti confermati che l'hanno consegnata, condivisa o no.
       */
      studenti: StudenteRiflessioni[];
    };

/* ── Le lezioni ───────────────────────────────────────────────────────── */

/** Le lezioni che si possono consegnare, nell'ordine del corso. */
export const LEZIONI_RIFLESSIONI: LezioneRiflessioni[] = SUBMITTABLE_LESSONS.map((l) => ({
  slug: l.slug,
  numero: l.number,
  titolo: l.title,
}));

const SLUG_VALIDI = new Set(LEZIONI_RIFLESSIONI.map((l) => l.slug));

/** Lo slug e una lezione che si consegna? Il resto non arriva al database. */
export function slugLezioneValido(v: unknown): v is string {
  return typeof v === "string" && SLUG_VALIDI.has(v);
}

const ORDINE = new Map(COURSE_LESSONS.map((l, i) => [l.slug, i]));

/**
 * Numero e titolo di una lezione dai dati del corso. Una lezione tolta dal
 * corso dopo la consegna resta leggibile, con lo slug al posto del titolo.
 */
export function lezioneDaSlug(slug: string): LezioneRiflessioni {
  const l = COURSE_LESSONS.find((x) => x.slug === slug);
  return l ? { slug, numero: l.number, titolo: l.title } : { slug, numero: "", titolo: slug };
}

/* ── La lettura ───────────────────────────────────────────────────────── */

/** Un'iscrizione confermata dell'istituto, come la legge la rotta. */
export type IscrizioneRiflessioni = {
  id: string;
  nome: string;
  cognome: string;
  classe: string | null;
  user_id: string | null;
};

type RigaCondivisa = {
  user_id: string;
  lesson_slug: string;
  reflection: string | null;
  question: string | null;
  updated_at: string | null;
  replied_at: string | null;
};

/**
 * Riflessioni condivise e numero di quelle riservate, per le iscrizioni
 * indicate. Le iscrizioni le sceglie la rotta, gia filtrate per istituto e
 * per stato: qui non si allarga niente.
 *
 * Prima si leggono, fra quegli studenti, quelli che hanno scelto di
 * condividere anche le consegne di prima (`utentiCheCondividonoPassate`,
 * solo per l'istituto `adesioneId`). Poi letture a blocchi di utenti, come
 * il progresso (`blocchiPerUtenti`):
 * - per gli altri, una conta le righe riservate e porta il solo `user_id`,
 *   l'altra porta i testi, e solo delle righe condivise. Il testo di una
 *   consegna riservata non lascia mai il database;
 * - per chi ha scelto di condividerle, una sola lettura con i testi di
 *   tutte le sue righe, e nessuna riservata.
 *
 * Torna `{ disponibile: false }` se manca la colonna, o l'intera tabella:
 * prima della migrazione 20261215000000 non c'e niente di condiviso.
 * Solleva su ogni altro errore.
 */
export async function leggiRiflessioni(
  client: Db,
  iscrizioni: readonly IscrizioneRiflessioni[],
  opzioni: { adesioneId: string; lezione?: string | null },
): Promise<RiflessioniRisposta> {
  const lezione = opzioni.lezione ?? null;
  const perUtente = new Map<string, IscrizioneRiflessioni>();
  for (const i of iscrizioni) if (i.user_id && !perUtente.has(i.user_id)) perUtente.set(i.user_id, i);

  const condividonoPassate = await utentiCheCondividonoPassate(client, [...perUtente.keys()], opzioni.adesioneId);
  const soloDopoAvviso = [...perUtente.keys()].filter((u) => !condividonoPassate.has(u));

  // Filtrata su una lezione, ogni studente da al piu una riga: blocchi
  // piu grandi, meno richieste.
  const righePerUtente = lezione ? 1 : undefined;
  const blocchi = blocchiPerUtenti(soloDopoAvviso, righePerUtente);
  const blocchiTutte = blocchiPerUtenti([...condividonoPassate], righePerUtente);

  const riservate = (blocco: string[]) => {
    let q = client
      .from("lesson_submissions")
      .select("user_id")
      .in("user_id", blocco)
      .is(COLONNA_RIFLESSIONI_CONDIVISE, null);
    if (lezione) q = q.eq("lesson_slug", lezione);
    return q.limit(LIMITE_RIGHE);
  };
  // Mai `comment`, mai `admin_reply`: non si leggono, quindi non possono
  // uscire per sbaglio.
  const condivise = (blocco: string[]) => {
    let q = client
      .from("lesson_submissions")
      .select("user_id, lesson_slug, reflection, question, updated_at, replied_at")
      .in("user_id", blocco)
      .not(COLONNA_RIFLESSIONI_CONDIVISE, "is", null);
    if (lezione) q = q.eq("lesson_slug", lezione);
    return q.limit(LIMITE_RIGHE);
  };
  // Chi ha scelto di condividere anche le consegne di prima: tutte le sue
  // righe. La colonna si chiede lo stesso, anche se qui non filtra: senza,
  // la funzione non e attiva, e la lettura deve rispondere come le altre.
  const tutte = (blocco: string[]) => {
    let q = client
      .from("lesson_submissions")
      .select(`user_id, lesson_slug, reflection, question, updated_at, replied_at, ${COLONNA_RIFLESSIONI_CONDIVISE}`)
      .in("user_id", blocco);
    if (lezione) q = q.eq("lesson_slug", lezione);
    return q.limit(LIMITE_RIGHE);
  };

  // Ogni lettura con il suo tipo: le righe di `riservate` si contano, le
  // altre portano i testi.
  const letture = [
    ...blocchi.flatMap((b) => [
      { conta: true, q: riservate(b) },
      { conta: false, q: condivise(b) },
    ]),
    ...blocchiTutte.map((b) => ({ conta: false, q: tutte(b) })),
  ];

  // Anche senza studenti con un account si chiede alla tabella, con un
  // controllo da una riga: cosi "funzione non attiva" e "nessuna consegna"
  // restano due risposte diverse.
  const risposte = await Promise.all(
    letture.length > 0
      ? letture.map((l) => l.q)
      : [client.from("lesson_submissions").select(COLONNA_RIFLESSIONI_CONDIVISE).limit(1)],
  );

  const errore = risposte.find((r) => r.error)?.error ?? null;
  if (errore) {
    if (erroreSchemaMancante(errore)) return { disponibile: false };
    throw new Error(`lesson_submissions: ${errore.message}`);
  }

  const contoRiservate = new Map<string, number>();
  const consegne = new Map<string, ConsegnaCondivisa[]>();
  letture.forEach((l, i) => {
    const righe = (risposte[i].data ?? []) as unknown as RigaCondivisa[];
    if (l.conta) {
      for (const riga of righe) {
        contoRiservate.set(riga.user_id, (contoRiservate.get(riga.user_id) ?? 0) + 1);
      }
      return;
    }
    for (const riga of righe) {
      // Una riga senza riflessione non dovrebbe esistere (il box la
      // chiede), e senza non c'e niente da leggere.
      const riflessione = (riga.reflection ?? "").trim();
      if (!riflessione) continue;
      const lista = consegne.get(riga.user_id) ?? [];
      lista.push({
        lezione: lezioneDaSlug(riga.lesson_slug),
        riflessione,
        domanda: (riga.question ?? "").trim() || null,
        salvata_at: riga.updated_at ?? "",
        risposta_staff_at: riga.replied_at ?? null,
      });
      consegne.set(riga.user_id, lista);
    }
  });

  const ordineLezione = (c: ConsegnaCondivisa) => ORDINE.get(c.lezione.slug) ?? Number.MAX_SAFE_INTEGER;

  const studenti: StudenteRiflessioni[] = [];
  for (const i of iscrizioni) {
    const uid = i.user_id ?? "";
    const proprie = uid && perUtente.get(uid) === i ? (consegne.get(uid) ?? []) : [];
    const nRiservate = uid && perUtente.get(uid) === i ? (contoRiservate.get(uid) ?? 0) : 0;
    // Per lezione, solo chi l'ha consegnata: gli altri li dice gia il
    // progresso nell'elenco.
    if (lezione && proprie.length === 0 && nRiservate === 0) continue;
    studenti.push({
      iscrizione_id: i.id,
      nome: i.nome,
      cognome: i.cognome,
      classe: i.classe ?? "",
      riservate: nRiservate,
      consegne: [...proprie].sort((a, b) => ordineLezione(a) - ordineLezione(b)),
    });
  }

  return { disponibile: true, lezione: lezione ? lezioneDaSlug(lezione) : null, studenti };
}

/* ── Le consegne di prima: la scelta dello studente ───────────────────── */

/**
 * Fra gli utenti indicati, quelli che hanno scelto di far leggere ai
 * docenti dell'istituto anche le consegne salvate prima dell'avviso.
 *
 * Conta solo la scelta in vigore (documento e versione di `content.ts`),
 * solo "si", e solo se fatta per l'istituto `adesioneId`: una scelta
 * registrata da iscritto a un'altra scuola non apre niente ai docenti di
 * questa. A blocchi come il resto: una riga al piu per utente.
 *
 * Senza `licei_accettazioni` (migrazione non applicata) nessuno ha scelto,
 * e le consegne di prima restano allo staff come prima. Solleva su ogni
 * altro errore, come la lettura che la chiama.
 */
export async function utentiCheCondividonoPassate(
  client: Db,
  userIds: readonly string[],
  adesioneId: string,
): Promise<Set<string>> {
  const si = new Set<string>();
  const blocchi = blocchiPerUtenti(userIds, 1);
  if (blocchi.length === 0 || !adesioneId) return si;

  const risposte = await Promise.all(
    blocchi.map((blocco) =>
      client
        .from("licei_accettazioni")
        .select("user_id")
        .eq("documento", DOCUMENTO_RIFLESSIONI_PASSATE)
        .eq("versione", VERSIONE_RIFLESSIONI_PASSATE)
        .eq("adesione_id", adesioneId)
        .eq("testo->>scelta", "si")
        .in("user_id", blocco)
        .limit(LIMITE_RIGHE),
    ),
  );
  const errore = risposte.find((r) => r.error)?.error ?? null;
  if (errore) {
    if (erroreSchemaMancante(errore, "tabella")) return si;
    throw new Error(`licei_accettazioni: ${errore.message}`);
  }
  for (const r of risposte) {
    for (const riga of (r.data ?? []) as { user_id: string }[]) si.add(riga.user_id);
  }
  return si;
}

/** La scelta in vigore di uno studente, con quando l'ha fatta. */
export type SceltaPassate = {
  scelta: SceltaRiflessioniPassate | null;
  scelta_at: string | null;
};

/** Quello che la rotta dello studente risponde. Nessun `user_id`. */
export type StatoRiflessioniPassate =
  | { disponibile: false }
  | (SceltaPassate & {
      disponibile: true;
      /** Le sue consegne salvate prima dell'avviso, condivise o no. */
      riservate: number;
    });

/**
 * La scelta di uno studente e quante sono le sue consegne di prima.
 *
 * Conta solo la scelta fatta per l'istituto dell'iscrizione attuale
 * (`adesioneId`), con la stessa regola dei docenti
 * (`utentiCheCondividonoPassate`): una riga registrata da iscritto a
 * un'altra scuola non apre niente ai docenti di questa, quindi per lo
 * studente vale come nessuna scelta, e la domanda si fa di nuovo. Il
 * prossimo upsert riscrive la riga con l'istituto giusto.
 *
 * Il conto si fa leggendo la sola colonna `lesson_slug`, una riga per
 * lezione al piu, e non con una richiesta HEAD: a una HEAD PostgREST
 * risponde senza corpo, e un errore di tabella o di colonna mancante
 * arriverebbe senza codice, o non arriverebbe affatto.
 *
 * `{ disponibile: false }` se manca `licei_accettazioni`, la colonna
 * `condivisa_referente_at` o `lesson_submissions`: senza una delle tre la
 * scelta non avrebbe effetto, quindi non si chiede. Solleva su ogni altro
 * errore.
 */
export async function statoRiflessioniPassate(
  client: Db,
  userId: string,
  adesioneId: string,
): Promise<StatoRiflessioniPassate> {
  const [scelta, prima] = await Promise.all([
    client
      .from("licei_accettazioni")
      .select("testo, accettato_at")
      .eq("user_id", userId)
      .eq("documento", DOCUMENTO_RIFLESSIONI_PASSATE)
      .eq("versione", VERSIONE_RIFLESSIONI_PASSATE)
      .eq("adesione_id", adesioneId)
      .limit(1),
    client
      .from("lesson_submissions")
      .select("lesson_slug")
      .eq("user_id", userId)
      .is(COLONNA_RIFLESSIONI_CONDIVISE, null)
      .limit(LIMITE_RIGHE),
  ]);
  const errore = scelta.error ?? prima.error;
  if (errore) {
    if (erroreSchemaMancante(errore)) return { disponibile: false };
    throw new Error(`riflessioni passate: ${errore.message}`);
  }
  return {
    disponibile: true,
    ...sceltaDaRiga((scelta.data ?? [])[0] as RigaScelta | undefined),
    riservate: (prima.data ?? []).length,
  };
}

type RigaScelta = { testo: { scelta?: unknown } | null; accettato_at: string | null };

/** Una riga che non dice "si" o "no" vale come nessuna scelta. */
function sceltaDaRiga(riga: RigaScelta | undefined): SceltaPassate {
  const valore = riga?.testo?.scelta;
  if (!riga || !sceltaRiflessioniPassateValida(valore)) return { scelta: null, scelta_at: null };
  return { scelta: valore, scelta_at: riga.accettato_at ?? null };
}

/**
 * Registra la scelta dello studente: una riga per persona e versione, che
 * a ogni cambio si riscrive, con l'ora nuova. In `testo` la domanda e
 * l'etichetta del bottone premuto, dal server e non dal browser: quello
 * che si congela e quello che lo studente aveva a schermo.
 *
 * `{ disponibile: false }` se la tabella non c'e ancora. Solleva su ogni
 * altro errore.
 */
export async function salvaSceltaRiflessioniPassate(
  client: Db,
  dati: { userId: string; adesioneId: string; scelta: SceltaRiflessioniPassate },
): Promise<{ disponibile: false } | (SceltaPassate & { disponibile: true })> {
  const adesso = new Date().toISOString();
  const { error } = await client.from("licei_accettazioni").upsert(
    {
      user_id: dati.userId,
      adesione_id: dati.adesioneId,
      documento: DOCUMENTO_RIFLESSIONI_PASSATE,
      versione: VERSIONE_RIFLESSIONI_PASSATE,
      testo: {
        domanda: DOMANDA_RIFLESSIONI_PASSATE,
        scelta: dati.scelta,
        etichetta: ETICHETTE_RIFLESSIONI_PASSATE[dati.scelta],
      },
      accettato_at: adesso,
    },
    { onConflict: "user_id,documento,versione" },
  );
  if (error) {
    if (erroreSchemaMancante(error, "tabella")) return { disponibile: false };
    throw new Error(`licei_accettazioni: ${error.message}`);
  }
  return { disponibile: true, scelta: dati.scelta, scelta_at: adesso };
}

/**
 * Per il box della lezione: la scelta e il numero delle consegne di prima,
 * o null. `adesioneId` e l'istituto dell'iscrizione che mostra l'avviso
 * (`iscrizioneLiceiPerAvviso`). Non solleva mai: come l'avviso, un problema
 * qui vuol dire "non chiedere niente", e la lezione si consegna lo stesso.
 */
export async function riflessioniPassatePerBox(
  client: Db,
  userId: string,
  adesioneId: string,
): Promise<{ scelta: SceltaRiflessioniPassate | null; riservate: number } | null> {
  try {
    const stato = await statoRiflessioniPassate(client, userId, adesioneId);
    return stato.disponibile ? { scelta: stato.scelta, riservate: stato.riservate } : null;
  } catch (err) {
    console.error("Licei riflessioni passate: lettura per il box non riuscita:", err);
    return null;
  }
}
