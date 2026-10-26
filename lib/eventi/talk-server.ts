/**
 * Helper lato server dei "Talk con gli esperti": chi puo iscriversi, quanti
 * sono iscritti, lo stato da mandare al riquadro della pagina.
 *
 * Stessa impostazione dei moduli licei e universita. Le rotte usano il
 * client con service role, che scavalca la RLS: il cancello e qui. Ogni
 * query filtra per l'utente della sessione e per uno slug gia controllato
 * contro `TALKS`, e nessun id arriva dal browser.
 *
 * Il codice va in produzione prima della migrazione 20261216000000, quindi
 * senza la tabella `talk_iscrizioni` niente si rompe: `contaIscritti` dice
 * "non presente", la pagina mostra "Le iscrizioni aprono a breve." e le
 * scritture rispondono 503. Il riconoscimento dell'errore e quello unico del
 * modulo licei, `erroreSchemaMancante`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  erroreSchemaMancante,
  leggiChiusuraPercorso,
  liceiAdminClient,
  requireDocente,
  type ErroreDb,
} from "@/lib/eventi/licei-server";
import { googleCalendarUrl } from "@/lib/eventi/talk";
import {
  SITE_URL,
  TALKS,
  talkConcluso,
  talkPath,
  type Talk,
} from "@/app/eventi/vivere-piu-a-lungo/talk/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

/** Client con service role, lo stesso dei licei. Solo dentro le rotte API. */
export const talkAdminClient = liceiAdminClient;

export const TABELLA_TALK = "talk_iscrizioni";

/**
 * Il ruolo con cui una persona si iscrive. E anche il valore della colonna
 * `ruolo`, con lo stesso vincolo a database.
 */
export type RuoloTalk = "studente_licei" | "studente_universita" | "docente" | "staff";

export const RUOLI_TALK: readonly RuoloTalk[] = [
  "studente_licei",
  "studente_universita",
  "docente",
  "staff",
];

export type Idoneita =
  | {
      idoneo: true;
      ruolo: RuoloTalk;
      /** L'istituto, per studenti e docenti dei licei. Serve al conteggio per scuola. */
      adesioneId: string | null;
    }
  | { idoneo: false; ruolo: null; adesioneId: null };

const NON_IDONEO: Idoneita = { idoneo: false, ruolo: null, adesioneId: null };

/** Un errore vero, non "tabella o colonna mancante", ferma tutto. */
function controlla(errore: ErroreDb, cosa: string): boolean {
  if (!errore) return true;
  if (erroreSchemaMancante(errore)) return false;
  throw new Error(`${cosa}: ${errore.message ?? "lettura non riuscita"}`);
}

type Embed = { stato?: string | null } | { stato?: string | null }[] | null | undefined;
const statoEmbed = (e: Embed): string | null => {
  const r = Array.isArray(e) ? e[0] : e;
  return r?.stato ?? null;
};

/** Una lettura gia fatta: le righe, o l'errore che il database ha dato. */
type Lettura<T> = { data: T[] | null; error: ErroreDb };

type RigaLicei = { stato: string; adesione_id: string | null };
type RigaUniversita = { stato?: string | null };
type RigaReferente = { id: string; stato: string };
type RigaDocente = { adesione_id: string; stato: string; licei_adesioni: Embed };

/** Le quattro letture da cui dipende l'idoneita di una persona. */
type Letture = {
  licei: Lettura<RigaLicei>;
  universita: Lettura<RigaUniversita>;
  referente: Lettura<RigaReferente>;
  docente: Lettura<RigaDocente>;
};

/**
 * La regola, sulle righe gia lette. Una sola, per la pagina (`idoneitaTalk`)
 * e per l'export dello staff (`idoneitaTalkPerUtenti`): il CSV con cui si
 * manda il link elenca cosi le stesse persone che il link lo vedono sul sito.
 * Ogni stato si ricontrolla qui, quindi le righe possono anche arrivare non
 * filtrate.
 */
function decidiIdoneita(l: Letture, liceiAperti: boolean, staff: boolean): Idoneita {
  // 1. Studente dei licei.
  if (controlla(l.licei.error, "licei_iscrizioni") && liceiAperti) {
    const righe = l.licei.data ?? [];
    const valide = righe.filter((r) => r.stato === "in_attesa" || r.stato === "confermata");
    if (valide.length > 0) {
      const riga = valide.find((r) => r.stato === "confermata") ?? valide[0];
      return { idoneo: true, ruolo: "studente_licei", adesioneId: riga.adesione_id ?? null };
    }
  }

  // 2. Partecipante del percorso universitario.
  if (controlla(l.universita.error, "universita_candidature")) {
    const righe = l.universita.data ?? [];
    if (righe.some((r) => r.stato === "confermata")) {
      return { idoneo: true, ruolo: "studente_universita", adesioneId: null };
    }
  }

  // 3. Docente dei licei.
  if (liceiAperti) {
    if (controlla(l.referente.error, "licei_adesioni")) {
      const righe = l.referente.data ?? [];
      const attiva = righe.find((r) => r.stato !== "ritirata");
      if (attiva) return { idoneo: true, ruolo: "docente", adesioneId: attiva.id };
    }
    if (controlla(l.docente.error, "licei_docenti")) {
      const righe = l.docente.data ?? [];
      const attivo = righe.find(
        (r) => r.stato === "attivo" && statoEmbed(r.licei_adesioni) !== "ritirata",
      );
      if (attivo) return { idoneo: true, ruolo: "docente", adesioneId: attivo.adesione_id };
    }
  }

  // 4. Staff.
  if (staff) return { idoneo: true, ruolo: "staff", adesioneId: null };

  return NON_IDONEO;
}

/**
 * Chi puo iscriversi a un talk, e con quale ruolo.
 *
 * Quattro strade, nell'ordine in cui si provano:
 *
 *  1. studente dei licei con un'iscrizione `in_attesa` o `confermata`, a
 *     percorso licei non chiuso. Anche chi aspetta la conferma del
 *     referente: il talk non tocca squadre ne progetti, ed e un incontro
 *     del corso che sta gia seguendo. Fra due iscrizioni vale la
 *     confermata, come in `requireStudente`;
 *  2. partecipante del percorso universitario con la candidatura
 *     `confermata`, lo stato che in quel modulo vuol dire "nel percorso"
 *     (`requireCandidato`);
 *  3. docente dei licei, a percorso non chiuso: referente di un'adesione
 *     non ritirata, oppure docente del progetto `attivo` di un'adesione non
 *     ritirata;
 *  4. staff della Fondazione, per provare il flusso.
 *
 * L'ordine decide solo il ruolo registrato, che lo staff legge nell'export:
 * uno studente che e anche staff risulta studente, perche e quello che e
 * davvero in quel talk.
 *
 * Una tabella o una colonna che in questo database non c'e ancora vale come
 * "nessuna riga" (un ambiente senza la fase 2 dell'universita, senza
 * `licei_docenti`). Un errore vero solleva: meglio un 500 che dire a un
 * partecipante che non lo e.
 */
export async function idoneitaTalk(db: Db, userId: string, staff: boolean): Promise<Idoneita> {
  if (!userId) return NON_IDONEO;

  const [licei, universita, referente, docente, chiusura] = await Promise.all([
    db
      .from("licei_iscrizioni")
      .select("stato, adesione_id")
      .eq("user_id", userId)
      .in("stato", ["in_attesa", "confermata"])
      .order("created_at", { ascending: true })
      .limit(5),
    db.from("universita_candidature").select("stato").eq("user_id", userId).limit(5),
    db
      .from("licei_adesioni")
      .select("id, stato")
      .eq("user_id", userId)
      .neq("stato", "ritirata")
      .order("created_at", { ascending: true })
      .limit(2),
    db
      .from("licei_docenti")
      .select("adesione_id, stato, licei_adesioni(stato)")
      .eq("user_id", userId)
      .eq("stato", "attivo")
      .limit(2),
    leggiChiusuraPercorso(db),
  ]);

  return decidiIdoneita(
    {
      licei: licei as Lettura<RigaLicei>,
      universita: universita as Lettura<RigaUniversita>,
      referente: referente as Lettura<RigaReferente>,
      docente: docente as Lettura<RigaDocente>,
    },
    chiusura.chiusoAt === null,
    staff,
  );
}

/** Spezza un elenco in blocchi: i filtri `in` viaggiano nella URL. */
function blocchi<T>(valori: T[], dimensione = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < valori.length; i += dimensione) out.push(valori.slice(i, i + dimensione));
  return out;
}

/**
 * Una lettura per molti account, a blocchi. Una tabella o una colonna
 * mancante torna come errore, e `decidiIdoneita` la salta come fa per la
 * pagina; un errore vero solleva subito.
 */
async function leggiABlocchi<T>(
  ids: string[],
  cosa: string,
  query: (blocco: string[]) => PromiseLike<{ data: unknown; error: ErroreDb }>,
): Promise<Lettura<T>> {
  const data: T[] = [];
  for (const blocco of blocchi(ids)) {
    const { data: righe, error } = await query(blocco);
    if (error) {
      if (erroreSchemaMancante(error)) return { data: null, error };
      throw new Error(`${cosa}: ${error.message ?? "lettura non riuscita"}`);
    }
    data.push(...((righe ?? []) as T[]));
  }
  return { data, error: null };
}

type ConUtente = { user_id: string };

/**
 * `idoneitaTalk` per molti account insieme, con le stesse letture fatte a
 * blocchi e la stessa regola. Serve all'export dello staff: chi si e iscritto
 * e poi non partecipa piu al percorso (iscrizione rifiutata, candidatura
 * esclusa, docente revocato, adesione ritirata, percorso licei chiuso) non
 * vede il link sul sito, e non deve riceverlo nemmeno per email.
 *
 * Lo staff e chi ha `partnership_level = 'admin'`, come in `utenteCorrente`.
 */
export async function idoneitaTalkPerUtenti(
  db: Db,
  userIds: string[],
): Promise<Map<string, Idoneita>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const esito = new Map<string, Idoneita>();
  if (ids.length === 0) return esito;

  const [licei, universita, referente, docente, profili, chiusura] = await Promise.all([
    leggiABlocchi<RigaLicei & ConUtente>(ids, "licei_iscrizioni", (b) =>
      db
        .from("licei_iscrizioni")
        .select("user_id, stato, adesione_id")
        .in("user_id", b)
        .in("stato", ["in_attesa", "confermata"])
        .order("created_at", { ascending: true })
        .limit(1000),
    ),
    leggiABlocchi<RigaUniversita & ConUtente>(ids, "universita_candidature", (b) =>
      db.from("universita_candidature").select("user_id, stato").in("user_id", b).limit(1000),
    ),
    leggiABlocchi<RigaReferente & ConUtente>(ids, "licei_adesioni", (b) =>
      db
        .from("licei_adesioni")
        .select("id, user_id, stato")
        .in("user_id", b)
        .neq("stato", "ritirata")
        .order("created_at", { ascending: true })
        .limit(1000),
    ),
    leggiABlocchi<RigaDocente & ConUtente>(ids, "licei_docenti", (b) =>
      db
        .from("licei_docenti")
        .select("user_id, adesione_id, stato, licei_adesioni(stato)")
        .in("user_id", b)
        .eq("stato", "attivo")
        .limit(1000),
    ),
    leggiABlocchi<{ id: string; partnership_level: string | null }>(ids, "profiles", (b) =>
      db.from("profiles").select("id, partnership_level").in("id", b).limit(1000),
    ),
    leggiChiusuraPercorso(db),
  ]);

  const liceiAperti = chiusura.chiusoAt === null;
  const di = <T extends ConUtente>(l: Lettura<T>, id: string): Lettura<T> =>
    l.error ? l : { data: (l.data ?? []).filter((r) => r.user_id === id), error: null };
  // I profili sono indicizzati per `id`: senza la tabella, nessuno e staff.
  const staff = new Set(
    (profili.data ?? []).filter((p) => p.partnership_level === "admin").map((p) => p.id),
  );

  for (const id of ids) {
    esito.set(
      id,
      decidiIdoneita(
        {
          licei: di(licei, id),
          universita: di(universita, id),
          referente: di(referente, id),
          docente: di(docente, id),
        },
        liceiAperti,
        staff.has(id),
      ),
    );
  }
  return esito;
}

/**
 * Quanti sono iscritti a un talk, e se la tabella c'e. `presente: false`
 * prima della migrazione: e il segnale che ogni rotta usa per degradare.
 */
export async function contaIscritti(
  db: Db,
  slug: string,
): Promise<{ presente: boolean; totale: number }> {
  const { count, error } = await db
    .from(TABELLA_TALK)
    .select("id", { count: "exact", head: true })
    .eq("talk_slug", slug);
  if (error) {
    if (erroreSchemaMancante(error, "tabella")) return { presente: false, totale: 0 };
    throw new Error(`${TABELLA_TALK}: ${error.message}`);
  }
  return { presente: true, totale: count ?? 0 };
}

/**
 * I talk a cui si sono iscritti gli studenti dei licei di un istituto, per
 * account: serve alla console dei docenti, che segna ogni studente con i
 * suoi talk. Stesso filtro del numero nella scheda del talk (ruolo e
 * istituto), cosi i badge e il numero tornano. Solo gli slug di `TALKS`.
 *
 * Prima della migrazione la tabella non c'e: nessuno e iscritto, `letti`
 * resta vero. Con un errore vero `letti` e falso, e la console lo dice
 * invece di far credere che nessuno si sia iscritto.
 */
export async function talkPerStudentiIstituto(
  db: Db,
  adesioneId: string,
): Promise<{ letti: boolean; perUtente: Map<string, string[]> }> {
  const perUtente = new Map<string, string[]>();
  const { data, error } = await db
    .from(TABELLA_TALK)
    .select("talk_slug, user_id")
    .eq("ruolo", "studente_licei")
    .eq("adesione_id", adesioneId);
  if (error) {
    if (erroreSchemaMancante(error, "tabella")) return { letti: true, perUtente };
    console.error(`${TABELLA_TALK}: iscrizioni dell'istituto non lette:`, error.message);
    return { letti: false, perUtente };
  }
  const slugValidi = new Set(TALKS.map((t) => t.slug));
  for (const r of (data ?? []) as { talk_slug: string; user_id: string }[]) {
    if (!slugValidi.has(r.talk_slug)) continue;
    perUtente.set(r.user_id, [...(perUtente.get(r.user_id) ?? []), r.talk_slug]);
  }
  return { letti: true, perUtente };
}

/** La persona e gia iscritta a questo talk? */
export async function giaIscritto(db: Db, slug: string, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from(TABELLA_TALK)
    .select("id")
    .eq("talk_slug", slug)
    .eq("user_id", userId)
    .limit(1);
  if (error) throw new Error(`${TABELLA_TALK}: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Lo stato che il riquadro della pagina legge. */
export type StatoTalk = {
  /** Falso prima della migrazione 20261216000000. */
  disponibile: boolean;
  concluso: boolean;
  autenticato: boolean;
  idoneo: boolean;
  ruolo: RuoloTalk | null;
  iscritto: boolean;
  /** Il link della riunione: solo a chi e iscritto e ancora idoneo. */
  link: string | null;
  /**
   * Il link "aggiungi a Google Calendar", costruito qui con il link della
   * riunione dentro (se c'e gia): solo a chi e iscritto e ancora idoneo,
   * come `link`. Il riquadro mostra il calendario solo con questo.
   */
  calendarioGoogle: string | null;
  /** Solo se il talk ha una capienza. */
  posti: { capienza: number; liberi: number } | null;
  /** Solo per lo staff: tutti gli iscritti al talk. */
  iscritti?: number;
  /** Solo per i docenti dei licei: gli studenti del loro istituto iscritti, senza nomi. */
  iscritti_istituto?: number;
};

/** Un link si mostra solo se e un indirizzo web vero: niente `javascript:` per sbaglio. */
export const linkSicuro = (v: string | null): string | null =>
  v && /^https:\/\/\S+$/i.test(v.trim()) ? v.trim() : null;

/** La URL pubblica della pagina del talk, quella che il calendario cita. */
const urlTalk = (talk: Talk): string => `${SITE_URL}${talkPath(talk.slug)}`;

/**
 * Il link della riunione per chi chiama, o null. Le stesse condizioni di
 * `statoTalk` e della rotta dell'iscrizione: link impostato e `https`,
 * accesso fatto, tabella presente, iscrizione a questo talk e idoneita
 * ancora valida. Lo usa il file .ics, che solo cosi contiene il link.
 *
 * Le letture si fanno solo se il link c'e: finche e null il file e quello
 * pubblico per tutti, senza toccare il database.
 */
export async function linkPerIscritto(
  db: Db,
  talk: Talk,
  utente: { id: string | null; staff: boolean },
): Promise<string | null> {
  const link = linkSicuro(talk.link);
  if (!link || !utente.id) return null;
  const conteggio = await contaIscritti(db, talk.slug);
  if (!conteggio.presente) return null;
  if (!(await giaIscritto(db, talk.slug, utente.id))) return null;
  const idoneita = await idoneitaTalk(db, utente.id, utente.staff);
  return idoneita.idoneo ? link : null;
}

/**
 * Lo stato di un talk per chi chiama. `utente` e la sessione gia letta
 * dalla rotta: id nullo per chi non ha fatto l'accesso.
 *
 * Il conteggio per istituto passa dalla guardia dei docenti, quella intera:
 * istruzioni accettate, adesione non ritirata, percorso aperto. E un numero
 * senza nomi, ma resta un dato degli studenti, e la console dei docenti lo
 * mostra solo dopo le istruzioni: la rotta fa lo stesso.
 */
export async function statoTalk(
  db: Db,
  talk: Talk,
  utente: { id: string | null; staff: boolean },
  adesso: Date = new Date(),
): Promise<StatoTalk> {
  const concluso = talkConcluso(talk, adesso);
  const conteggio = await contaIscritti(db, talk.slug);

  const posti =
    conteggio.presente && talk.capienza !== null
      ? { capienza: talk.capienza, liberi: Math.max(0, talk.capienza - conteggio.totale) }
      : null;

  const base: StatoTalk = {
    disponibile: conteggio.presente,
    concluso,
    autenticato: !!utente.id,
    idoneo: false,
    ruolo: null,
    iscritto: false,
    link: null,
    calendarioGoogle: null,
    posti,
  };
  if (!utente.id) return base;

  const idoneita = await idoneitaTalk(db, utente.id, utente.staff);
  const stato: StatoTalk = { ...base, idoneo: idoneita.idoneo, ruolo: idoneita.ruolo };
  if (!conteggio.presente) return stato;

  stato.iscritto = await giaIscritto(db, talk.slug, utente.id);
  if (stato.iscritto && stato.idoneo) {
    stato.link = linkSicuro(talk.link);
    stato.calendarioGoogle = googleCalendarUrl(talk, urlTalk(talk), stato.link);
  }
  if (utente.staff) stato.iscritti = conteggio.totale;

  if (idoneita.ruolo === "docente") {
    const guardia = await requireDocente();
    if (guardia.error === null) {
      const { count, error } = await db
        .from(TABELLA_TALK)
        .select("id", { count: "exact", head: true })
        .eq("talk_slug", talk.slug)
        .eq("ruolo", "studente_licei")
        .eq("adesione_id", guardia.ctx.adesione.id);
      if (error) throw new Error(`${TABELLA_TALK}: ${error.message}`);
      stato.iscritti_istituto = count ?? 0;
    }
  }

  return stato;
}
