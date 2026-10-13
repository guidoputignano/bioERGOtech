/**
 * Riflessioni e domande delle lezioni, lette dai docenti dell'istituto.
 *
 * Che cosa vede un docente, e soltanto quello:
 * - gli studenti CONFERMATI del proprio istituto, nessun altro;
 * - di ogni consegna, `reflection` e `question`, e solo se la riga e stata
 *   salvata dopo che lo studente ha visto l'avviso nel box della lezione
 *   (`condivisa_referente_at` valorizzata). Le consegne di prima restano
 *   allo staff: del docente si sa solo quante sono, mai il testo;
 * - della risposta dello staff, solo se c'e e quando. Il testo di
 *   `admin_reply` e scritto per lo studente e al docente non serve;
 * - il `comment` mai: resta dello staff. Non si seleziona nemmeno.
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
  /** Consegne salvate prima dell'avviso: restano allo staff, se ne dice il numero. */
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
 * Due letture a blocchi di utenti, come il progresso
 * (`blocchiPerUtenti`): una conta le righe riservate e porta il solo
 * `user_id`, l'altra porta i testi, e solo delle righe condivise. Il testo
 * di una consegna riservata non lascia mai il database.
 *
 * Torna `{ disponibile: false }` se manca la colonna, o l'intera tabella:
 * prima della migrazione 20261215000000 non c'e niente di condiviso.
 * Solleva su ogni altro errore.
 */
export async function leggiRiflessioni(
  client: Db,
  iscrizioni: readonly IscrizioneRiflessioni[],
  opzioni: { lezione?: string | null } = {},
): Promise<RiflessioniRisposta> {
  const lezione = opzioni.lezione ?? null;
  const perUtente = new Map<string, IscrizioneRiflessioni>();
  for (const i of iscrizioni) if (i.user_id && !perUtente.has(i.user_id)) perUtente.set(i.user_id, i);

  // Filtrata su una lezione, ogni studente da al piu una riga: blocchi
  // piu grandi, meno richieste.
  const blocchi = blocchiPerUtenti([...perUtente.keys()], lezione ? 1 : undefined);

  const riservate = (blocco: string[]) => {
    let q = client
      .from("lesson_submissions")
      .select("user_id")
      .in("user_id", blocco)
      .is(COLONNA_RIFLESSIONI_CONDIVISE, null);
    if (lezione) q = q.eq("lesson_slug", lezione);
    return q.limit(LIMITE_RIGHE);
  };
  const condivise = (blocco: string[]) => {
    // Mai `comment`, mai `admin_reply`: non si leggono, quindi non possono
    // uscire per sbaglio.
    let q = client
      .from("lesson_submissions")
      .select("user_id, lesson_slug, reflection, question, updated_at, replied_at")
      .in("user_id", blocco)
      .not(COLONNA_RIFLESSIONI_CONDIVISE, "is", null);
    if (lezione) q = q.eq("lesson_slug", lezione);
    return q.limit(LIMITE_RIGHE);
  };

  // Anche senza studenti con un account si chiede alla tabella, con un
  // controllo da una riga: cosi "funzione non attiva" e "nessuna consegna"
  // restano due risposte diverse.
  const risposte = await Promise.all(
    blocchi.length > 0
      ? blocchi.flatMap((b) => [riservate(b), condivise(b)])
      : [client.from("lesson_submissions").select(COLONNA_RIFLESSIONI_CONDIVISE).limit(1)],
  );

  const errore = risposte.find((r) => r.error)?.error ?? null;
  if (errore) {
    if (erroreSchemaMancante(errore)) return { disponibile: false };
    throw new Error(`lesson_submissions: ${errore.message}`);
  }

  const contoRiservate = new Map<string, number>();
  const consegne = new Map<string, ConsegnaCondivisa[]>();
  if (blocchi.length > 0) {
    risposte.forEach((r, i) => {
      const righe = (r.data ?? []) as unknown as RigaCondivisa[];
      if (i % 2 === 0) {
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
  }

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
