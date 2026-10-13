/**
 * Riflessioni e domande delle lezioni, lette dai docenti dell'istituto.
 *
 * Che cosa vede un docente, e soltanto quello:
 * - gli studenti CONFERMATI del proprio istituto, nessun altro;
 * - di ogni consegna, `reflection` e `question`, se la riga e stata
 *   salvata dopo che lo studente ha visto l'avviso nel box della lezione
 *   (`condivisa_referente_at` valorizzata). Le consegne di prima si
 *   leggono solo quando la regola delle consegne di prima lo dice
 *   (`riflessioniPassateVisibili` in content.ts, sulla riga di
 *   `licei_accettazioni` con documento `riflessioni_passate`): subito se lo
 *   studente ha detto «Va bene», tre giorni dopo il primo avviso se non ha
 *   risposto, mai se ha detto «Preferisco di no» o se l'avviso non gli e
 *   mai stato mostrato. Altrimenti restano allo staff: del docente si sa
 *   solo quante sono, mai il testo;
 * - della risposta dello staff, solo se c'e e quando. Il testo di
 *   `admin_reply` e scritto per lo studente e al docente non serve;
 * - il `comment` mai: resta dello staff. Non si seleziona nemmeno.
 *
 * Qui c'e anche la meta dello studente: leggere l'avviso e la scelta con
 * il numero delle sue consegne di prima, e registrare quando l'avviso e
 * stato mostrato e che cosa ha scelto.
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
  ETICHETTE_RIFLESSIONI_PASSATE,
  VERSIONE_RIFLESSIONI_PASSATE,
  riflessioniPassateVisibili,
  sceltaRiflessioniPassateValida,
  testoAvvisoRiflessioniPassate,
  visibiliDalRiflessioniPassate,
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
   * Consegne salvate prima dell'avviso che restano allo staff: se ne dice
   * il numero. Zero per chi le ha rese leggibili, o per chi non ha risposto
   * dopo i giorni di preavviso: le sue sono tutte fra le consegne, e nella
   * risposta non c'e altro che lo dica.
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
 * Prima si leggono, fra quegli studenti, quelli le cui consegne di prima
 * sono leggibili adesso (`utentiConPassateVisibili`, solo per l'istituto
 * `adesioneId`, con l'ora del server). Poi letture a blocchi di utenti,
 * come il progresso (`blocchiPerUtenti`):
 * - per gli altri, una conta le righe riservate e porta il solo `user_id`,
 *   l'altra porta i testi, e solo delle righe condivise. Il testo di una
 *   consegna riservata non lascia mai il database;
 * - per quelli, una sola lettura con i testi di tutte le loro righe, e
 *   nessuna riservata.
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

  const passateVisibili = await utentiConPassateVisibili(client, [...perUtente.keys()], opzioni.adesioneId);
  const soloDopoAvviso = [...perUtente.keys()].filter((u) => !passateVisibili.has(u));

  // Filtrata su una lezione, ogni studente da al piu una riga: blocchi
  // piu grandi, meno richieste.
  const righePerUtente = lezione ? 1 : undefined;
  const blocchi = blocchiPerUtenti(soloDopoAvviso, righePerUtente);
  const blocchiTutte = blocchiPerUtenti([...passateVisibili], righePerUtente);

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
  // Chi ha le consegne di prima leggibili: tutte le sue righe. La colonna
  // si chiede lo stesso, anche se qui non filtra: senza, la funzione non e
  // attiva, e la lettura deve rispondere come le altre.
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

/* ── Le consegne di prima: l'avviso e la scelta dello studente ────────── */

/**
 * Quello che c'e in `testo` per il documento `riflessioni_passate`. Le
 * righe di adesso: `{ avviso, avvisato_at, scelta, scelta_at, etichetta }`.
 * Quelle della prima stesura (scelta esplicita, senza avviso a tempo):
 * `{ domanda, scelta, etichetta }`, con l'ora in `accettato_at`.
 */
type TestoPassate = {
  avviso?: unknown;
  avvisato_at?: unknown;
  scelta?: unknown;
  scelta_at?: unknown;
  etichetta?: unknown;
  domanda?: unknown;
};

type RigaPassate = {
  adesione_id?: string | null;
  testo: TestoPassate | null;
  accettato_at: string | null;
};

/** Una data leggibile, cosi com'e; null per tutto il resto. */
const istante = (v: unknown): string | null =>
  typeof v === "string" && v !== "" && !Number.isNaN(new Date(v).getTime()) ? v : null;

/**
 * La regola dei docenti su un `testo` cosi com'e scritto: solo "si" apre
 * subito, e un valore che non si riconosce non apre niente. La stessa per
 * i docenti e per quello che si dice allo studente.
 */
const visibiliDaTesto = (t: TestoPassate, adesso: Date): boolean =>
  riflessioniPassateVisibili({ scelta: t.scelta ?? null, avvisato_at: istante(t.avvisato_at) }, adesso);

/**
 * Fra gli utenti indicati, quelli le cui consegne di prima i docenti
 * dell'istituto leggono adesso, con l'ora del server
 * (`riflessioniPassateVisibili` in content.ts): «Va bene», oppure nessuna
 * scelta e almeno `GIORNI_PREAVVISO_RIFLESSIONI` giorni dal primo avviso
 * mostrato. «Preferisco di no», un valore che non si riconosce o un avviso
 * mai mostrato: no.
 *
 * Conta solo la riga in vigore (documento e versione di `content.ts`), e
 * solo se registrata per l'istituto `adesioneId`: un avviso visto o una
 * scelta fatta da iscritto a un'altra scuola non apre niente ai docenti di
 * questa. Si leggono le righe e si decide qui, nel codice, senza filtri sul
 * jsonb. A blocchi come il resto: una riga al piu per utente.
 *
 * Senza `licei_accettazioni` (migrazione non applicata) nessuno ha visto
 * l'avviso, e le consegne di prima restano allo staff come prima. Solleva
 * su ogni altro errore, come la lettura che la chiama.
 */
export async function utentiConPassateVisibili(
  client: Db,
  userIds: readonly string[],
  adesioneId: string,
  adesso: Date = new Date(),
): Promise<Set<string>> {
  const visibili = new Set<string>();
  const blocchi = blocchiPerUtenti(userIds, 1);
  if (blocchi.length === 0 || !adesioneId) return visibili;

  const risposte = await Promise.all(
    blocchi.map((blocco) =>
      client
        .from("licei_accettazioni")
        .select("user_id, testo")
        .eq("documento", DOCUMENTO_RIFLESSIONI_PASSATE)
        .eq("versione", VERSIONE_RIFLESSIONI_PASSATE)
        .eq("adesione_id", adesioneId)
        .in("user_id", blocco)
        .limit(LIMITE_RIGHE),
    ),
  );
  const errore = risposte.find((r) => r.error)?.error ?? null;
  if (errore) {
    if (erroreSchemaMancante(errore, "tabella")) return visibili;
    throw new Error(`licei_accettazioni: ${errore.message}`);
  }
  for (const r of risposte) {
    for (const riga of (r.data ?? []) as { user_id: string; testo: TestoPassate | null }[]) {
      if (visibiliDaTesto(riga.testo ?? {}, adesso)) visibili.add(riga.user_id);
    }
  }
  return visibili;
}

/** L'avviso e la scelta di uno studente, come li legge lui. */
export type StatoPassate = {
  scelta: SceltaRiflessioniPassate | null;
  scelta_at: string | null;
  /** Quando la piattaforma gli ha mostrato l'avviso la prima volta. */
  avvisato_at: string | null;
  /**
   * `avvisato_at` piu i giorni di preavviso: da li, se non ha scelto, i
   * docenti leggono le consegne di prima. Null finche l'avviso non e stato
   * mostrato.
   */
  visibili_dal: string | null;
  /**
   * I docenti leggono adesso le sue consegne di prima? La regola dei
   * docenti, con l'ora del server: il browser la mostra cosi com'e, senza
   * rifarla con l'ora del dispositivo.
   */
  visibili: boolean;
};

/** Quello che la rotta dello studente risponde. Nessun `user_id`. */
export type StatoRiflessioniPassate =
  | { disponibile: false }
  | (StatoPassate & {
      disponibile: true;
      /** Le sue consegne salvate prima dell'avviso, leggibili o no. */
      riservate: number;
    });

const NESSUNO_STATO: StatoPassate = {
  scelta: null,
  scelta_at: null,
  avvisato_at: null,
  visibili_dal: null,
  visibili: false,
};

/**
 * Lo stato di una riga. Una scelta che non dice "si" o "no" vale come
 * nessuna scelta, e la si chiede di nuovo; una data illeggibile vale come
 * nessuna data. Una riga della prima stesura non ha `scelta_at`: la scelta
 * vale da `accettato_at`. `visibili` e la regola dei docenti sulla riga
 * cosi com'e, all'ora `adesso` del server.
 */
function statoDaRiga(riga: RigaPassate | null | undefined, adesso: Date = new Date()): StatoPassate {
  if (!riga) return NESSUNO_STATO;
  const t = riga.testo ?? {};
  const scelta = sceltaRiflessioniPassateValida(t.scelta) ? t.scelta : null;
  const avvisato_at = istante(t.avvisato_at);
  return {
    scelta,
    scelta_at: scelta ? (istante(t.scelta_at) ?? istante(riga.accettato_at)) : null,
    avvisato_at,
    visibili_dal: avvisato_at ? visibiliDalRiflessioniPassate(avvisato_at).toISOString() : null,
    visibili: visibiliDaTesto(t, adesso),
  };
}

/**
 * L'avviso, la scelta di uno studente e quante sono le sue consegne di
 * prima.
 *
 * Conta solo la riga registrata per l'istituto dell'iscrizione attuale
 * (`adesioneId`), con la stessa regola dei docenti
 * (`utentiConPassateVisibili`): una riga di quando era iscritto a un'altra
 * scuola non apre niente ai docenti di questa, quindi per lo studente vale
 * come nessun avviso e nessuna scelta, e l'avviso riparte da capo. La
 * prossima scrittura riscrive la riga con l'istituto giusto.
 *
 * Il conto si fa leggendo la sola colonna `lesson_slug`, una riga per
 * lezione al piu, e non con una richiesta HEAD: a una HEAD PostgREST
 * risponde senza corpo, e un errore di tabella o di colonna mancante
 * arriverebbe senza codice, o non arriverebbe affatto.
 *
 * `{ disponibile: false }` se manca `licei_accettazioni`, la colonna
 * `condivisa_referente_at` o `lesson_submissions`: senza una delle tre
 * l'avviso non avrebbe effetto, quindi non si mostra. Solleva su ogni
 * altro errore.
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
    ...statoDaRiga((scelta.data ?? [])[0] as RigaPassate | undefined),
    riservate: (prima.data ?? []).length,
  };
}

/** Che cosa registra lo studente: che ha visto l'avviso, o una scelta. */
export type AzionePassate = "visto" | SceltaRiflessioniPassate;

/** Quante volte si rilegge e si riprova quando la riga cambia sotto i piedi. */
const TENTATIVI_SCRITTURA = 3;

/**
 * Registra, sulla riga dello studente, l'avviso visto o la sua scelta.
 *
 * - `visto`: segna `avvisato_at` se non c'e. Se c'e gia non scrive niente:
 *   la data non si sposta mai in avanti, e la scelta non si tocca;
 * - `si` o `no`: `scelta` e `scelta_at`, e `avvisato_at` se non c'e ancora
 *   (lo studente sta guardando l'avviso).
 *
 * In `testo` il server congela l'avviso come lo studente lo aveva a schermo
 * (prima o dopo la data) e l'etichetta del bottone premuto; `accettato_at`
 * e l'ora dell'ultima scrittura. Una riga registrata per un altro istituto
 * vale come nessuna: si riscrive per quello di oggi, da capo.
 *
 * Si riscrive la riga solo se nessuno l'ha cambiata dopo averla letta
 * (stesso `accettato_at`), e la si crea solo se non c'e: l'avviso visto,
 * che il browser manda da solo quando l'avviso compare, e un clic su un
 * bottone possono arrivare insieme, e nessuno dei due deve cancellare
 * l'altro. Su un conflitto si rilegge e si riprova.
 *
 * `{ disponibile: false }` se la tabella non c'e ancora. Solleva su ogni
 * altro errore.
 */
export async function registraRiflessioniPassate(
  client: Db,
  dati: { userId: string; adesioneId: string; azione: AzionePassate },
): Promise<{ disponibile: false } | (StatoPassate & { disponibile: true })> {
  const riga = () =>
    client
      .from("licei_accettazioni")
      .select("adesione_id, testo, accettato_at")
      .eq("user_id", dati.userId)
      .eq("documento", DOCUMENTO_RIFLESSIONI_PASSATE)
      .eq("versione", VERSIONE_RIFLESSIONI_PASSATE);

  for (let tentativo = 0; tentativo < TENTATIVI_SCRITTURA; tentativo++) {
    const letta = await riga().limit(1);
    if (letta.error) {
      if (erroreSchemaMancante(letta.error, "tabella")) return { disponibile: false };
      throw new Error(`licei_accettazioni: ${letta.error.message}`);
    }
    const esistente = ((letta.data ?? [])[0] ?? null) as RigaPassate | null;
    // La riga di un'altra scuola non conta: si riparte da zero.
    const propria = esistente && esistente.adesione_id === dati.adesioneId ? esistente : null;
    const prima = statoDaRiga(propria);

    if (dati.azione === "visto" && prima.avvisato_at) return { disponibile: true, ...prima };

    const adesso = new Date();
    const ora = adesso.toISOString();
    const avvisato_at = prima.avvisato_at ?? ora;
    const avviso = testoAvvisoRiflessioniPassate(visibiliDalRiflessioniPassate(avvisato_at), adesso);
    const testo: TestoPassate =
      dati.azione === "visto"
        ? {
            // Solo l'avviso: una scelta gia registrata resta com'era, con
            // quello che allora si era congelato.
            ...(prima.scelta ? (propria?.testo ?? {}) : {}),
            avviso,
            avvisato_at,
            scelta: prima.scelta,
            scelta_at: prima.scelta_at,
            etichetta: prima.scelta ? (propria?.testo?.etichetta ?? null) : null,
          }
        : {
            avviso,
            avvisato_at,
            scelta: dati.azione,
            scelta_at: ora,
            etichetta: ETICHETTE_RIFLESSIONI_PASSATE[dati.azione],
          };

    const scritta = esistente
      ? await client
          .from("licei_accettazioni")
          .update({ adesione_id: dati.adesioneId, testo, accettato_at: ora })
          .eq("user_id", dati.userId)
          .eq("documento", DOCUMENTO_RIFLESSIONI_PASSATE)
          .eq("versione", VERSIONE_RIFLESSIONI_PASSATE)
          .eq("accettato_at", esistente.accettato_at)
          .select("user_id")
      : await client
          .from("licei_accettazioni")
          .insert({
            user_id: dati.userId,
            adesione_id: dati.adesioneId,
            documento: DOCUMENTO_RIFLESSIONI_PASSATE,
            versione: VERSIONE_RIFLESSIONI_PASSATE,
            testo,
            accettato_at: ora,
          })
          .select("user_id");

    if (scritta.error) {
      // La riga l'ha appena creata un'altra richiesta: si rilegge.
      if (!esistente && scritta.error.code === "23505") continue;
      if (erroreSchemaMancante(scritta.error, "tabella")) return { disponibile: false };
      throw new Error(`licei_accettazioni: ${scritta.error.message}`);
    }
    // Nessuna riga aggiornata: e cambiata fra la lettura e la scrittura.
    if (esistente && (scritta.data ?? []).length === 0) continue;
    return {
      disponibile: true,
      ...statoDaRiga({ adesione_id: dati.adesioneId, testo, accettato_at: ora }, adesso),
    };
  }
  throw new Error("licei_accettazioni: la riga cambia a ogni tentativo, scrittura non riuscita");
}

/**
 * Per il box della lezione: avviso, scelta, se i docenti le leggono adesso
 * (`visibili`, con l'ora del server) e numero delle consegne di prima, o
 * null. `adesioneId` e l'istituto dell'iscrizione che mostra
 * l'avviso (`iscrizioneLiceiPerAvviso`). Non solleva mai: come l'avviso, un
 * problema qui vuol dire "non mostrare niente", e la lezione si consegna lo
 * stesso.
 */
export async function riflessioniPassatePerBox(
  client: Db,
  userId: string,
  adesioneId: string,
): Promise<
  | (Pick<StatoPassate, "scelta" | "avvisato_at" | "visibili_dal" | "visibili"> & { riservate: number })
  | null
> {
  try {
    const stato = await statoRiflessioniPassate(client, userId, adesioneId);
    return stato.disponibile
      ? {
          scelta: stato.scelta,
          avvisato_at: stato.avvisato_at,
          visibili_dal: stato.visibili_dal,
          visibili: stato.visibili,
          riservate: stato.riservate,
        }
      : null;
  } catch (err) {
    console.error("Licei riflessioni passate: lettura per il box non riuscita:", err);
    return null;
  }
}
