/**
 * Helper lato server del modulo licei: lettura della configurazione e
 * cancello sulla raccolta delle adesioni.
 *
 * La configurazione vive a database e non in `content.ts` perche il bando
 * non fissa termini: l'art. 10 li rimanda al referente del consorzio dei
 * licei. Lo staff li inserisce dal pannello, senza un rilascio del sito.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { bandoAdminClient } from "@/lib/eventi/bando-server";
import {
  STATO_ADESIONI_DEFAULT,
  STATO_CONSEGNE_DEFAULT,
  STATO_ISCRIZIONI_DEFAULT,
  STATO_SQUADRE_DEFAULT,
  STATO_VALUTAZIONE_DEFAULT,
  adesioniAperte,
  consegneAperte,
  iscrizioniAperte,
  squadreAperte,
  valutazioneAperta,
  type StatoAdesioni,
  type StatoConsegne,
  type StatoIscrizioni,
  type StatoSquadre,
  type StatoValutazione,
  CONFERMA_ADESIONI_DEFAULT,
  type ConfermaAdesioni,
  ACCETTAZIONE_ISTRUZIONI_DOCENTE_TESTO,
  DOCUMENTO_ISTRUZIONI_DOCENTE,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { ISTRUZIONI_DOCENTE, type SezioneDoc } from "@/app/eventi/vivere-piu-a-lungo/licei/documenti";

export type LiceiConfig = {
  stato_adesioni: StatoAdesioni;
  scadenza_adesioni_label: string;
  avviso: string;
  stato_iscrizioni: StatoIscrizioni;
  scadenza_iscrizioni_label: string;
  stato_squadre: StatoSquadre;
  stato_consegne: StatoConsegne;
  scadenza_consegna_label: string;
  stato_valutazione: StatoValutazione;
  conferma_adesioni: ConfermaAdesioni;
};

const DEFAULT: LiceiConfig = {
  stato_adesioni: STATO_ADESIONI_DEFAULT,
  scadenza_adesioni_label: "",
  avviso: "",
  stato_iscrizioni: STATO_ISCRIZIONI_DEFAULT,
  scadenza_iscrizioni_label: "",
  stato_squadre: STATO_SQUADRE_DEFAULT,
  stato_consegne: STATO_CONSEGNE_DEFAULT,
  scadenza_consegna_label: "",
  stato_valutazione: STATO_VALUTAZIONE_DEFAULT,
  conferma_adesioni: CONFERMA_ADESIONI_DEFAULT,
};

const STATI_VALIDI = new Set<StatoAdesioni>([
  "termini_non_comunicati",
  "aperte",
  "chiuse",
]);

const STATI_ISCRIZIONI_VALIDI = new Set<StatoIscrizioni>(["chiuse", "aperte"]);
const STATI_APERTO_CHIUSO = new Set(["chiuse", "aperte"]);
const STATI_VALUTAZIONE_VALIDI = new Set(["chiusa", "aperta"]);

/**
 * Legge `licei_config`. La tabella e pubblicamente leggibile, quindi basta
 * il client dell'utente. Se la migrazione non e ancora stata applicata, o
 * qualcosa va storto, si torna ai valori di default: la pagina resta in
 * piedi e il modulo non promette scadenze inventate.
 */
export async function leggiConfigLicei(): Promise<LiceiConfig> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("licei_config").select("chiave, valore");
    if (error || !data) return DEFAULT;

    const mappa = new Map(data.map((r) => [r.chiave as string, (r.valore as string) ?? ""]));
    const stato = mappa.get("stato_adesioni") as StatoAdesioni | undefined;
    const statoIscr = mappa.get("stato_iscrizioni") as StatoIscrizioni | undefined;
    const statoSquadre = mappa.get("stato_squadre") as StatoSquadre | undefined;
    const statoConsegne = mappa.get("stato_consegne") as StatoConsegne | undefined;
    const statoValut = mappa.get("stato_valutazione") as StatoValutazione | undefined;

    return {
      stato_adesioni: stato && STATI_VALIDI.has(stato) ? stato : DEFAULT.stato_adesioni,
      scadenza_adesioni_label: mappa.get("scadenza_adesioni_label") ?? "",
      avviso: mappa.get("avviso") ?? "",
      stato_iscrizioni:
        statoIscr && STATI_ISCRIZIONI_VALIDI.has(statoIscr)
          ? statoIscr
          : DEFAULT.stato_iscrizioni,
      scadenza_iscrizioni_label: mappa.get("scadenza_iscrizioni_label") ?? "",
      stato_squadre:
        statoSquadre && STATI_APERTO_CHIUSO.has(statoSquadre)
          ? statoSquadre
          : DEFAULT.stato_squadre,
      stato_consegne:
        statoConsegne && STATI_APERTO_CHIUSO.has(statoConsegne)
          ? statoConsegne
          : DEFAULT.stato_consegne,
      scadenza_consegna_label: mappa.get("scadenza_consegna_label") ?? "",
      stato_valutazione:
        statoValut && STATI_VALUTAZIONE_VALIDI.has(statoValut)
          ? statoValut
          : DEFAULT.stato_valutazione,
      conferma_adesioni:
        mappa.get("conferma_adesioni") === "manuale" || mappa.get("conferma_adesioni") === "automatica"
          ? (mappa.get("conferma_adesioni") as ConfermaAdesioni)
          : DEFAULT.conferma_adesioni,
    };
  } catch {
    return DEFAULT;
  }
}

/** Client con service role, condiviso con il modulo bando. */
export const liceiAdminClient = bandoAdminClient;

/* ── Chiusura del percorso ────────────────────────────────────────────── */

/**
 * Le chiavi della chiusura vivono in `licei_config` e non in una tabella
 * nuova: la configurazione e gia chiave/valore, e le migrazioni in
 * produzione si applicano a mano. Con una colonna o una tabella dedicate,
 * un rilascio arrivato prima della migrazione avrebbe rotto le guardie di
 * tutti; cosi, se la chiave non c'e, il percorso risulta semplicemente
 * aperto.
 *
 * Non stanno in `CONFIG_CHIAVI` di proposito: la rotta generica della
 * configurazione accetta solo quelle, e una chiusura che si potesse
 * scrivere e cancellare da li salterebbe la conferma e il registro.
 */
export const CHIAVE_PERCORSO_CHIUSO = "percorso_chiuso_at";
export const CHIAVE_DATI_CANCELLATI = "dati_cancellati_at";
export const CHIAVE_ESITO_CANCELLAZIONE = "dati_cancellati_esito";

export const MESSAGGIO_PERCORSO_CHIUSO =
  "Il percorso si è concluso e l'accesso è stato disattivato.";

/**
 * Che cosa e stato cancellato, in soli numeri. `licei_config` e leggibile
 * da chiunque, quindi qui non finiscono mai email, nomi o id: solo i
 * conteggi che il pannello mostra dopo l'operazione.
 */
export type EsitoCancellazione = {
  adesioni: number;
  iscrizioni: number;
  squadre: number;
  progetti: number;
  valutazioni: number;
  commissari: number;
  /** Docenti del progetto. Assente negli esiti registrati prima di averli. */
  docenti?: number;
  riflessioni: number;
  account_cancellati: number;
  account_mantenuti: number;
  mantenuti_per_motivo: Record<string, number>;
};

export type ChiusuraPercorso = {
  chiusoAt: string | null;
  cancellatiAt: string | null;
  esito: EsitoCancellazione | null;
};

/**
 * Legge lo stato della chiusura. Accetta il client gia aperto dalla guardia
 * che la chiama, per non aprirne un secondo a ogni richiesta.
 *
 * Se la lettura fallisce si torna a "aperto": e la stessa scelta di
 * `leggiConfigLicei`, e qui e anche l'unica sensata, perche l'alternativa
 * sarebbe chiudere fuori tutti per un errore di rete.
 */
export async function leggiChiusuraPercorso(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: SupabaseClient<any, "public", any> | null,
): Promise<ChiusuraPercorso> {
  const vuota: ChiusuraPercorso = { chiusoAt: null, cancellatiAt: null, esito: null };
  try {
    const db = client ?? (await createClient());
    const { data, error } = await db
      .from("licei_config")
      .select("chiave, valore")
      .in("chiave", [CHIAVE_PERCORSO_CHIUSO, CHIAVE_DATI_CANCELLATI, CHIAVE_ESITO_CANCELLAZIONE]);
    if (error || !data) return vuota;

    const mappa = new Map(data.map((r) => [r.chiave as string, ((r.valore as string) ?? "").trim()]));
    let esito: EsitoCancellazione | null = null;
    const grezzo = mappa.get(CHIAVE_ESITO_CANCELLAZIONE);
    if (grezzo) {
      try {
        esito = JSON.parse(grezzo) as EsitoCancellazione;
      } catch {
        esito = null;
      }
    }
    return {
      chiusoAt: mappa.get(CHIAVE_PERCORSO_CHIUSO) || null,
      cancellatiAt: mappa.get(CHIAVE_DATI_CANCELLATI) || null,
      esito,
    };
  } catch {
    return vuota;
  }
}

/** Scorciatoia per le guardie: il percorso e stato chiuso dallo staff? */
async function percorsoChiuso(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: SupabaseClient<any, "public", any> | null,
): Promise<boolean> {
  const chiusura = await leggiChiusuraPercorso(client);
  return chiusura.chiusoAt !== null;
}

/**
 * Cancello sulla raccolta delle adesioni. Lo staff passa comunque, cosi il
 * flusso si puo provare end to end anche a raccolta chiusa.
 */
export async function verificaAdesioniAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  // A percorso chiuso non si raccolgono dati nuovi: finirebbero in tabelle
  // che lo staff ha appena svuotato, o sta per svuotare.
  if (await percorsoChiuso()) return { ok: false, errore: MESSAGGIO_PERCORSO_CHIUSO };
  const config = await leggiConfigLicei();
  if (!adesioniAperte(config.stato_adesioni)) {
    return {
      ok: false,
      errore: "La raccolta delle adesioni degli istituti è chiusa. Scrivi a info@bioergotech.org.",
    };
  }
  return { ok: true };
}

/**
 * Cancello sulle iscrizioni degli studenti. Come sopra, lo staff passa
 * comunque per poter provare il flusso a iscrizioni chiuse.
 */
export async function verificaIscrizioniAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  if (await percorsoChiuso()) return { ok: false, errore: MESSAGGIO_PERCORSO_CHIUSO };
  const config = await leggiConfigLicei();
  if (!iscrizioniAperte(config.stato_iscrizioni)) {
    return {
      ok: false,
      errore:
        "Le iscrizioni al percorso non sono ancora aperte. Il tuo docente referente saprà dirti quando lo saranno.",
    };
  }
  return { ok: true };
}

/* ── Tabelle e colonne che possono mancare ───────────────────────────── */

/** La forma minima di un errore di PostgREST, quanto basta per leggerlo. */
export type ErroreDb = { code?: string | null; message?: string | null } | null | undefined;

/**
 * L'errore dice che in questo database manca una tabella o una colonna?
 *
 * Le migrazioni in produzione si applicano a mano, e di solito dopo il
 * rilascio del codice: per un po' il codice nuovo gira su uno schema
 * vecchio. In quella finestra una funzione nuova deve risultare "non ancora
 * disponibile", non rompere quelle che c'erano gia. Questo e l'unico punto
 * che decide se un errore e di quel tipo: un controllo ripetuto a mano in
 * ogni rotta finirebbe per divergere.
 *
 * `cosa` restringe il controllo. Chi aspetta una tabella non deve scambiare
 * per tabella assente una colonna scritta male, che e un errore vero e deve
 * fermare tutto; per questo la colonna si riconosce per prima, anche dal
 * messaggio, che per Postgres contiene a sua volta la parola "relation".
 */
export function erroreSchemaMancante(
  error: ErroreDb,
  cosa: "tabella" | "colonna" | "qualsiasi" = "qualsiasi",
): boolean {
  if (!error) return false;
  const codice = error.code ?? "";
  const testo = error.message ?? "";
  const colonna =
    codice === "42703" ||
    codice === "PGRST204" ||
    /column .* does not exist|could not find the .* column/i.test(testo);
  const tabella =
    !colonna &&
    (codice === "42P01" ||
      codice === "PGRST205" ||
      /relation .* does not exist|could not find the table/i.test(testo));
  if (cosa === "tabella") return tabella;
  if (cosa === "colonna") return colonna;
  return tabella || colonna;
}

/* ── Istruzioni per i docenti: versione e testo da accettare ──────────── */

/**
 * La versione delle istruzioni in vigore: la data di aggiornamento del
 * documento. Quando cambia, ogni docente le accetta di nuovo prima di
 * rivedere i dati degli studenti.
 */
export const VERSIONE_ISTRUZIONI_DOCENTE = ISTRUZIONI_DOCENTE.aggiornato;

/**
 * Il testo che il docente accetta, nella forma in cui si mostra e si
 * congela in `licei_accettazioni.testo`. Viene dal documento pubblico e non
 * da una copia: quello che il docente spunta e quello che chiunque puo
 * leggere nella pagina delle istruzioni.
 */
export type TestoIstruzioniDocente = {
  titolo: string;
  intro: string;
  sezioni: SezioneDoc[];
  /** Gli impegni, in elenco unico. */
  voci: string[];
  /** La frase della casella. */
  dichiarazione: string;
};

export function testoIstruzioniDocente(): TestoIstruzioniDocente {
  return {
    titolo: ISTRUZIONI_DOCENTE.titolo,
    intro: ISTRUZIONI_DOCENTE.intro,
    sezioni: ISTRUZIONI_DOCENTE.sezioni.map((s) => ({ ...s })),
    voci: ISTRUZIONI_DOCENTE.sezioni.flatMap((s) => s.ul ?? []),
    dichiarazione: ACCETTAZIONE_ISTRUZIONI_DOCENTE_TESTO,
  };
}

/* ── Guardia dei docenti: referente principale e docenti del progetto ── */

export const MESSAGGIO_NESSUNA_ADESIONE = "Nessuna adesione risulta associata a questo account.";
export const MESSAGGIO_PIU_ISTITUTI =
  "Questo account risulta collegato a più istituti. Scrivi a info@bioergotech.org e sistemiamo noi.";
export const MESSAGGIO_ADESIONE_RITIRATA =
  "L'adesione del vostro istituto è stata ritirata: l'accesso è disattivato. Per chiarimenti scrivi a info@bioergotech.org.";
export const MESSAGGIO_ISTRUZIONI_DA_ACCETTARE =
  "Prima di vedere i dati degli studenti accetta le istruzioni per i docenti.";
export const MESSAGGIO_SOLO_REFERENTE = "Questa funzione è riservata al docente referente.";
export const MESSAGGIO_ACCOUNT_STUDENTE =
  "Questo account risulta iscritto al percorso come studente, quindi non può avere anche l'accesso da docente. Scrivi a info@bioergotech.org e sistemiamo noi.";

const COLONNE_ADESIONE_DOCENTE =
  "id, codice, stato, istituto_denominazione, istituto_comune, istituto_provincia, referente_nome, referente_cognome";

/** L'adesione vista da un docente: niente email, telefono o note dello staff. */
export type AdesioneDocente = {
  id: string;
  codice: string;
  stato: string;
  istituto_denominazione: string;
  istituto_comune: string;
  istituto_provincia: string;
  referente_nome: string;
  referente_cognome: string;
};

export type DocenteContext = {
  /** L'adesione dell'istituto del chiamante, e nessun'altra. */
  adesione: AdesioneDocente;
  userId: string;
  /**
   * `referente`: il docente referente principale, `licei_adesioni.user_id`.
   * `docente`: un docente del progetto indicato dal referente.
   */
  ruolo: "referente" | "docente";
  /** La riga in `licei_docenti`, solo per i docenti del progetto. */
  docenteId: string | null;
  /** Le classi che segue: un filtro preselezionato, mai un confine. */
  classi: string[];
  /** Ha accettato la versione in vigore delle istruzioni per i docenti? */
  istruzioniAccettate: boolean;
};

/** Il nome di prima, tenuto per chi lo importa ancora. */
export type ReferenteContext = DocenteContext;

/**
 * Autorizza un docente sul proprio istituto, e su nessun altro.
 *
 * I docenti sono di due tipi. Il referente principale e l'account di
 * `licei_adesioni.user_id`, come da sempre. I docenti del progetto sono
 * quelli che il referente indica, in `licei_docenti`, e vedono lo stesso
 * istituto con qualche funzione in meno.
 *
 * Non e la guardia dello staff e non deve diventarlo: un admin che apre
 * queste rotte non passa da qui, passa dal pannello staff.
 *
 * Opzioni:
 * - `operativo` (default true): respinge chi non ha ancora accettato la
 *   versione in vigore delle istruzioni. Tutte le rotte che mostrano o
 *   toccano dati di studenti lo lasciano attivo; lo spengono solo quelle
 *   che servono ad accettarle.
 * - `principale`: riserva la rotta al referente principale (gestione dei
 *   docenti, export).
 *
 * Legge il database a ogni richiesta, quindi una revoca o un ritiro hanno
 * effetto subito. Torna sempre un client con service role: l'ambito lo
 * impone questa funzione, e ogni query che la usa filtra per
 * `ctx.adesione.id`, perche RLS non lo farebbe.
 *
 * Prima che la migrazione 20261215000000 sia applicata, `licei_docenti` e
 * `licei_accettazioni` non esistono: allora nessuno risulta docente del
 * progetto e le istruzioni risultano accettate, cioe il comportamento di
 * prima.
 */
export async function requireDocente(
  opts: { principale?: boolean; operativo?: boolean } = {},
): Promise<
  | { error: null; status: 200; client: NonNullable<ReturnType<typeof liceiAdminClient>>; ctx: DocenteContext }
  | { error: string; status: number }
> {
  const principale = opts.principale === true;
  const operativo = opts.operativo !== false;

  const client = liceiAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  // Chiusura del percorso: l'informativa promette che l'accesso termina a
  // fine corso, e questo e il punto in cui la promessa si mantiene.
  if (await percorsoChiuso(client)) return { error: MESSAGGIO_PERCORSO_CHIUSO, status: 403 };

  // Quattro letture in parallelo, nessuna dipende dalle altre. Il limite a
  // due basta a sapere se i collegamenti sono piu di uno, che e tutto quello
  // che serve: oltre l'uno non si sceglie, si ferma. L'ultima dice se
  // l'account e anche quello di uno studente iscritto.
  const [comeReferente, comeDocente, accettazioni, comeStudente] = await Promise.all([
    client.from("licei_adesioni").select(COLONNE_ADESIONE_DOCENTE).eq("user_id", user.id).limit(2),
    client
      .from("licei_docenti")
      .select(`id, classi, stato, licei_adesioni!inner(${COLONNE_ADESIONE_DOCENTE})`)
      .eq("user_id", user.id)
      .in("stato", ["invitato", "attivo"])
      .limit(2),
    client
      .from("licei_accettazioni")
      .select("id")
      .eq("user_id", user.id)
      .eq("documento", DOCUMENTO_ISTRUZIONI_DOCENTE)
      .eq("versione", VERSIONE_ISTRUZIONI_DOCENTE)
      .limit(1),
    client.from("licei_iscrizioni").select("id").eq("user_id", user.id).limit(1),
  ]);

  // Un errore vero non diventa "nessun accesso": risponderebbe a un docente
  // che non e referente di niente, e lo manderebbe a scriverci per nulla.
  const erroreVero = [
    comeReferente.error,
    comeStudente.error,
    erroreSchemaMancante(comeDocente.error, "tabella") ? null : comeDocente.error,
    erroreSchemaMancante(accettazioni.error, "tabella") ? null : accettazioni.error,
  ].find((e) => e);
  if (erroreVero) {
    console.error("Licei requireDocente: lettura fallita:", erroreVero.message);
    return { error: "Non è stato possibile verificare l'accesso. Riprova fra poco.", status: 500 };
  }

  // Un istituto, un ruolo. Se lo stesso account compare due volte per la
  // stessa scuola (referente e anche docente del progetto, dopo un cambio
  // di referente), vale il ruolo di referente.
  type Collegamento = Omit<DocenteContext, "userId" | "istruzioniAccettate"> & {
    statoDocente: string | null;
  };
  const collegamenti = new Map<string, Collegamento>();
  for (const a of (comeReferente.data ?? []) as unknown as AdesioneDocente[]) {
    collegamenti.set(a.id, { adesione: a, ruolo: "referente", docenteId: null, classi: [], statoDocente: null });
  }
  const righeDocente = (comeDocente.error ? [] : (comeDocente.data ?? [])) as unknown as {
    id: string;
    classi: string[] | null;
    stato: string;
    licei_adesioni: AdesioneDocente | AdesioneDocente[] | null;
  }[];
  for (const d of righeDocente) {
    const a = Array.isArray(d.licei_adesioni) ? d.licei_adesioni[0] : d.licei_adesioni;
    if (!a || collegamenti.has(a.id)) continue;
    collegamenti.set(a.id, {
      adesione: a,
      ruolo: "docente",
      docenteId: d.id,
      classi: d.classi ?? [],
      statoDocente: d.stato,
    });
  }

  if (collegamenti.size === 0) return { error: MESSAGGIO_NESSUNA_ADESIONE, status: 403 };

  // Prima, con `maybeSingle`, un secondo istituto faceva fallire la query in
  // silenzio e il docente leggeva "nessuna adesione". Scegliere uno dei due
  // a caso sarebbe peggio: gli mostrerebbe gli studenti di una scuola che
  // magari non e piu la sua. Si ferma, e lo sistema lo staff.
  if (collegamenti.size > 1) return { error: MESSAGGIO_PIU_ISTITUTI, status: 409 };

  const { statoDocente, ...collegamento } = [...collegamenti.values()][0];

  // Uno studente non deve mai avere la vista sui compagni. L'invito lo
  // controlla, ma non basta: uno studente puo iscriversi dopo, con l'email
  // che il referente aveva indicato per sbaglio, e l'iscrizione lega
  // l'account trovato per email. Qui si ferma comunque, a ogni richiesta.
  if (collegamento.ruolo === "docente" && (comeStudente.data ?? []).length > 0) {
    return { error: MESSAGGIO_ACCOUNT_STUDENTE, status: 403 };
  }

  // Adesione ritirata: i docenti perdono l'accesso subito. Gli studenti no,
  // perche hanno aderito da se e la loro guardia non guarda qui.
  if (collegamento.adesione.stato === "ritirata") {
    return { error: MESSAGGIO_ADESIONE_RITIRATA, status: 403 };
  }

  if (principale && collegamento.ruolo !== "referente") {
    return { error: MESSAGGIO_SOLO_REFERENTE, status: 403 };
  }

  // Tabella non ancora creata: le istruzioni contano come accettate, ed e il
  // comportamento di prima della migrazione. Un docente del progetto deve
  // anche essere 'attivo': chi era stato revocato e viene invitato di nuovo
  // torna 'invitato', e accetta di nuovo anche se la versione e la stessa.
  const istruzioniAccettate = accettazioni.error
    ? true
    : (accettazioni.data ?? []).length > 0 &&
      (collegamento.ruolo === "referente" || statoDocente === "attivo");

  if (operativo && !istruzioniAccettate) {
    return { error: MESSAGGIO_ISTRUZIONI_DA_ACCETTARE, status: 403 };
  }

  return {
    error: null,
    status: 200,
    client,
    ctx: { ...collegamento, userId: user.id, istruzioniAccettate },
  };
}

/**
 * Il nome di prima, tenuto perche chi lo chiama continui a funzionare. Vale
 * come `requireDocente()`: referente e docenti del progetto, istruzioni
 * accettate. Le rotte nuove chiamano `requireDocente` e dicono che cosa
 * vogliono.
 */
export async function requireReferente() {
  return requireDocente();
}

/**
 * Cancello sulla formazione delle squadre. Come gli altri, lo staff passa
 * comunque per poter provare il flusso a fase chiusa.
 */
export async function verificaSquadreAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!squadreAperte(config.stato_squadre)) {
    return {
      ok: false,
      errore:
        "La formazione delle squadre non è ancora aperta. Te lo diciamo dentro il corso quando lo sarà.",
    };
  }
  return { ok: true };
}

/** Cancello sulla consegna dei progetti. */
export async function verificaConsegneAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!consegneAperte(config.stato_consegne)) {
    return {
      ok: false,
      errore: config.scadenza_consegna_label
        ? `Le consegne sono chiuse. Il termine era il ${config.scadenza_consegna_label}.`
        : "Le consegne non sono ancora aperte.",
    };
  }
  return { ok: true };
}

/** Cancello sulle schede della Commissione. */
export async function verificaValutazioneAperta(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!valutazioneAperta(config.stato_valutazione)) {
    return {
      ok: false,
      errore: "Le schede di valutazione non sono aperte in questo momento.",
    };
  }
  return { ok: true };
}

/* ── Guardia dello studente ───────────────────────────────────────────── */

export type StudenteContext = {
  iscrizione: {
    id: string;
    adesione_id: string;
    nome: string;
    cognome: string;
    classe: string;
    anno_corso: number;
    stato: string;
    squadra_id: string | null;
    squadra_ruolo: string | null;
  };
  istituto: string;
  userId: string;
};

/**
 * Autorizza lo studente sulla propria iscrizione.
 *
 * Passa solo chi e stato CONFERMATO dal referente. Non e una formalita: il
 * codice dell'istituto gira in tutta la scuola, quindi senza questo filtro
 * chiunque lo conosca potrebbe creare squadre e consegnare progetti a nome
 * di un istituto che non lo ha mai visto. La conferma del referente e il
 * punto in cui una scuola dice "questo ragazzo e mio", e da li in poi tutto
 * il resto ci si appoggia.
 *
 * Torna un client con service role: l'ambito lo impone questa funzione, e
 * ogni query che la usa filtra per l'id dell'iscrizione o della sua squadra.
 *
 * `ancheInAttesa` fa passare anche chi e ancora in attesa di conferma, con
 * la stessa regola di `iscrizioneLiceiPerAvviso`: contano solo le iscrizioni
 * in attesa o confermate, e fra due vale quella confermata. Serve alle sole
 * scelte che riguardano i dati dello studente stesso (chi legge le sue
 * riflessioni), mai a squadre e progetti, che restano dei confermati.
 */
export async function requireStudente(opts: { ancheInAttesa?: boolean } = {}): Promise<
  | { error: null; status: 200; client: NonNullable<ReturnType<typeof liceiAdminClient>>; ctx: StudenteContext }
  | { error: string; status: number }
> {
  const ancheInAttesa = opts.ancheInAttesa === true;
  const client = liceiAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  // Chiusura del percorso: l'informativa promette che l'accesso termina a
  // fine corso, e questo e il punto in cui la promessa si mantiene.
  if (await percorsoChiuso(client)) return { error: MESSAGGIO_PERCORSO_CHIUSO, status: 403 };

  const { data: righe } = await client
    .from("licei_iscrizioni")
    .select(
      "id, adesione_id, nome, cognome, classe, anno_corso, stato, squadra_id, squadra_ruolo, licei_adesioni(istituto_denominazione)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Con `ancheInAttesa` un'iscrizione rifiutata o ritirata non conta: e
  // come non averla.
  const valide = ancheInAttesa
    ? (righe ?? []).filter((r) => r.stato === "in_attesa" || r.stato === "confermata")
    : (righe ?? []);

  if (valide.length === 0) {
    return {
      error: "Nessuna iscrizione al percorso risulta associata a questo account.",
      status: 403,
    };
  }

  // Se qualcuno risultasse iscritto a due istituti, vale quella confermata:
  // e l'unica di cui una scuola risponde.
  const riga = valide.find((r) => r.stato === "confermata") ?? valide[0];

  if (riga.stato !== "confermata" && !ancheInAttesa) {
    return {
      error:
        "La tua iscrizione non è ancora stata confermata dal docente referente del tuo istituto. Appena lo fa, questa area si apre.",
      status: 403,
    };
  }

  const ades = riga.licei_adesioni as unknown as { istituto_denominazione?: string } | null;

  return {
    error: null,
    status: 200,
    client,
    ctx: {
      iscrizione: {
        id: riga.id,
        adesione_id: riga.adesione_id,
        nome: riga.nome,
        cognome: riga.cognome,
        classe: riga.classe,
        anno_corso: riga.anno_corso,
        stato: riga.stato,
        squadra_id: riga.squadra_id,
        squadra_ruolo: riga.squadra_ruolo,
      },
      istituto: ades?.istituto_denominazione ?? "",
      userId: user.id,
    },
  };
}

/* ── Guardia del commissario (art. 8) ─────────────────────────────────── */

export type CommissarioContext = {
  commissario: {
    id: string;
    nome: string;
    cognome: string;
    ruolo: string | null;
    diritto_voto: boolean;
  };
  userId: string;
};

/**
 * Autorizza un membro della Commissione, e non lo staff.
 *
 * Sono due elenchi di persone diversi e restano diversi: un admin che non e
 * in Commissione non vota, un commissario che non e admin non tocca la
 * configurazione del percorso. Confonderli significherebbe che chi apre e
 * chiude le fasi puo anche assegnare i punteggi.
 */
export async function requireCommissario(): Promise<
  | { error: null; status: 200; client: NonNullable<ReturnType<typeof liceiAdminClient>>; ctx: CommissarioContext }
  | { error: string; status: number }
> {
  const client = liceiAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  // Chiusura del percorso: l'informativa promette che l'accesso termina a
  // fine corso, e questo e il punto in cui la promessa si mantiene.
  if (await percorsoChiuso(client)) return { error: MESSAGGIO_PERCORSO_CHIUSO, status: 403 };

  const { data: commissario } = await client
    .from("licei_commissari")
    .select("id, nome, cognome, ruolo, diritto_voto, attivo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!commissario || !commissario.attivo) {
    return { error: "Questa area è riservata ai membri della Commissione.", status: 403 };
  }

  return {
    error: null,
    status: 200,
    client,
    ctx: {
      commissario: {
        id: commissario.id,
        nome: commissario.nome,
        cognome: commissario.cognome,
        ruolo: commissario.ruolo,
        diritto_voto: commissario.diritto_voto,
      },
      userId: user.id,
    },
  };
}

/**
 * Lo studente che legge questa pagina e un iscritto confermato al percorso
 * licei?
 *
 * Serve alle lezioni del corso, che a due punti attaccano un riquadro del
 * bando. La domanda si fa lato server e non nel browser per una ragione
 * precisa: il corso lo seguono anche persone che con il bando non c'entrano,
 * e una chiamata che a loro risponde 403 farebbe comparire e sparire un
 * riquadro d'errore su un bando che non li riguarda.
 *
 * Torna false, e non solleva, se qualcosa non e a posto: un problema del
 * modulo licei non deve impedire a nessuno di leggere una lezione.
 */
export async function studenteLiceiConfermato(): Promise<boolean> {
  try {
    const guard = await requireStudente();
    return guard.error === null;
  } catch {
    return false;
  }
}

/* ── Riflessioni condivise con i docenti dell'istituto ────────────────── */

/**
 * La colonna di `lesson_submissions` che segna una consegna salvata DOPO
 * che lo studente ha visto l'avviso "la leggono anche i docenti del tuo
 * istituto". Nulla vuol dire "solo staff". La scrive solo il server.
 */
export const COLONNA_RIFLESSIONI_CONDIVISE = "condivisa_referente_at";

/**
 * L'avviso una tantum agli studenti, via email, che da ora i docenti
 * leggono riflessioni e domande. Come le chiavi della chiusura, vive in
 * `licei_config` fuori da `CONFIG_CHIAVI`: la rotta generica della
 * configurazione non lo puo scrivere ne cancellare, quindi non si rimanda
 * per errore. L'esito sono soli numeri, perche la tabella e leggibile da
 * chiunque.
 */
export const CHIAVE_AVVISO_RIFLESSIONI = "avviso_riflessioni_inviato_at";
export const CHIAVE_ESITO_AVVISO_RIFLESSIONI = "avviso_riflessioni_esito";

export type EsitoAvvisoRiflessioni = {
  /** Iscrizioni a cui si e provato a scrivere, un indirizzo per persona. */
  destinatari: number;
  inviate: number;
  /** Non partite, indirizzi non validi compresi: i dettagli sono nei log. */
  fallite: number;
};

/** Lo stato dell'avviso, come lo manda al pannello la rotta dello staff. */
export type StatoAvvisoRiflessioni = {
  /** Quando e partito. Null: non ancora. */
  inviato_at: string | null;
  esito: EsitoAvvisoRiflessioni | null;
  /** `assente` prima della migrazione 20261215000000: il bottone resta spento. */
  colonna: "presente" | "assente" | "errore";
  /** Iscrizioni confermate e in attesa, prima di togliere le email doppie. */
  iscritti: number;
};

/**
 * La colonna `condivisa_referente_at` c'e in questo database?
 *
 * `assente` prima della migrazione 20261215000000, e anche quando manca
 * l'intera `lesson_submissions` (un ambiente nuovo): in tutti e due i casi
 * la funzione non e attiva. `errore` per qualsiasi altro problema, che chi
 * chiama non deve scambiare per "manca la migrazione".
 */
export async function statoColonnaRiflessioni(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, "public", any>,
): Promise<"presente" | "assente" | "errore"> {
  try {
    const { error } = await client
      .from("lesson_submissions")
      .select(COLONNA_RIFLESSIONI_CONDIVISE)
      .limit(1);
    if (!error) return "presente";
    if (erroreSchemaMancante(error)) return "assente";
    console.error("Licei riflessioni: controllo della colonna non riuscito:", error.message);
    return "errore";
  } catch (err) {
    console.error("Licei riflessioni: controllo della colonna non riuscito:", err);
    return "errore";
  }
}

/**
 * Lo studente che salva una consegna e iscritto al percorso licei, in
 * attesa o confermato, a percorso aperto? Allora quello che scrive nella
 * lezione lo leggono anche i docenti del suo istituto, e il box glielo
 * dice prima. Torna il nome dell'istituto, per l'avviso, e l'id della sua
 * adesione, per leggere la scelta sulle riflessioni di prima fatta per
 * quell'istituto. L'id resta al server: al browser va solo il nome.
 *
 * Anche chi e ancora in attesa: quando il referente lo conferma, i docenti
 * vedono quello che ha scritto dopo aver letto l'avviso, ne prima ne altro.
 *
 * Torna null, e non solleva, se qualcosa non e a posto, come
 * `studenteLiceiConfermato`: chi segue il corso senza il bando non deve
 * accorgersi di niente, e un errore qui vuol dire "solo staff", che e la
 * scelta prudente.
 */
export async function iscrizioneLiceiPerAvviso(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, "public", any>,
  userId: string,
): Promise<{ istituto: string; adesioneId: string } | null> {
  try {
    if (!userId) return null;
    // Prima l'iscrizione, poi la chiusura: chi segue il corso senza il
    // bando, cioe quasi tutti, si ferma alla prima lettura.
    const { data, error } = await client
      .from("licei_iscrizioni")
      .select("stato, adesione_id, licei_adesioni(istituto_denominazione)")
      .eq("user_id", userId)
      .in("stato", ["in_attesa", "confermata"])
      .order("created_at", { ascending: true })
      .limit(5);
    if (error || !data || data.length === 0) return null;
    if (await percorsoChiuso(client)) return null;
    // Come in `requireStudente`: se le iscrizioni sono due, vale quella
    // confermata.
    const riga = data.find((r) => r.stato === "confermata") ?? data[0];
    const a = riga.licei_adesioni as unknown as
      | { istituto_denominazione?: string | null }
      | { istituto_denominazione?: string | null }[]
      | null;
    const adesione = Array.isArray(a) ? a[0] : a;
    return { istituto: adesione?.istituto_denominazione ?? "", adesioneId: riga.adesione_id ?? "" };
  } catch {
    return null;
  }
}
