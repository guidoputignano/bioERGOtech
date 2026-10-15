/**
 * Il link per impostare la password, rimandato agli studenti di un istituto
 * che non sono mai entrati nel corso.
 *
 * L'iscrizione crea l'account e manda quel link una volta sola. Se la posta
 * della scuola blocca le email esterne (succede con le caselle
 * istituzionali), il link non arriva a nessuno della classe: le iscrizioni
 * ci sono, i ragazzi risultano iscritti ovunque, e nel corso non entra
 * nessuno. Il rimedio non e rifare l'iscrizione, e un link nuovo. Il
 * bottone sulla riga di uno studente lo rimanda a lui; questo modulo lo
 * rimanda a tutti quelli che ne hanno bisogno, con un clic.
 *
 * Lato server soltanto. Tre regole:
 * - chi riceve il link lo decide il server, rileggendo iscrizioni e
 *   accessi: la lista che il browser ha a schermo non entra mai qui;
 * - si legge e si scrive solo l'istituto del chiamante, `adesione_id`
 *   filtra ogni query perche il client ha la service role e RLS non lo
 *   ferma;
 * - nelle risposte e nei log solo numeri e id di iscrizione, mai email.
 *
 * Anche gli accessi si leggono da qui, per la console e per l'invio: cosi
 * le due cose dicono "mai entrato" degli stessi studenti.
 */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RIMANDA_TUTTI_MAX,
  RIMANDA_TUTTI_MINUTI,
  RIMANDA_TUTTI_RECENTE_MINUTI,
  SITE_URL,
  STATI_ISCRIZIONE_ATTIVI,
  haFattoAccesso,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { accessoEmailHtml, accessoEmailSubject } from "@/lib/eventi/licei-email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

const MITTENTE = "Fondazione bioERGOtech <noreply@bioergotech.org>";
const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Righe per pagina nella lettura delle iscrizioni: PostgREST tronca oltre il suo tetto senza dirlo. */
const PAGINA = 1000;
/** Quanti indirizzi per chiamata all'API di invio a blocchi di Resend. */
const BLOCCO = 50;
/** Pausa fra un blocco e il successivo, sotto il limite di richieste al secondo. */
const PAUSA_MS = 600;
/**
 * Link generati in parallelo; account letti in parallelo, tutti i candidati
 * (per il link recente, il ciclo in corso e l'ordine).
 */
const LINK_IN_PARALLELO = 5;
const VERIFICHE_IN_PARALLELO = 20;
/**
 * Tetto agli account letti uno per uno in una chiamata. Si leggono tutti i
 * candidati e non una finestra fissa: chi ha ricevuto un link da pochi
 * minuti resta fuori, e oltre il tetto dell'invio va in testa chi il link
 * non lo riceve da piu tempo; lo si sa solo leggendoli tutti. Con una
 * finestra, chi viene dopo per data di iscrizione non ci entrerebbe mai. Il
 * tetto tiene la chiamata dentro `maxDuration` (cento giri da venti), ed e
 * ben sopra gli iscritti di un istituto.
 */
const VERIFICHE_MAX = 2000;

const pausaVera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ── Accessi ──────────────────────────────────────────────────────────── */

export type AccessiIstituto = {
  /**
   * La lettura e riuscita? Se no, `ultimoAccesso` e vuota, e una mappa
   * vuota qui non vuol dire "nessuno e mai entrato": vuol dire "non lo
   * sappiamo". Chi la usa lo deve dire, non indovinare.
   */
  letti: boolean;
  /** Per id di iscrizione, l'ultimo accesso (`last_sign_in_at`), o null. */
  ultimoAccesso: Map<string, string | null>;
};

/**
 * L'ultimo accesso degli studenti dell'istituto, da `auth.users`, che
 * PostgREST non espone: passa per `licei_accessi_istituto`, gia filtrata per
 * istituto. Se la funzione non risponde l'errore va nei log e torna
 * `letti: false`, invece di una mappa vuota che segnerebbe tutta la scuola
 * come "Mai entrato".
 */
export async function leggiAccessiIstituto(client: Db, adesioneId: string): Promise<AccessiIstituto> {
  try {
    const { data, error } = await client.rpc("licei_accessi_istituto", { p_adesione_id: adesioneId });
    if (error) {
      console.error("Licei accessi: lettura non riuscita:", error.message);
      return { letti: false, ultimoAccesso: new Map() };
    }
    return {
      letti: true,
      ultimoAccesso: new Map(
        ((data ?? []) as { iscrizione_id: string; ultimo_accesso: string | null }[]).map((a) => [
          a.iscrizione_id,
          a.ultimo_accesso ?? null,
        ]),
      ),
    };
  } catch (err) {
    console.error("Licei accessi: lettura non riuscita:", err);
    return { letti: false, ultimoAccesso: new Map() };
  }
}

/* ── Tempo d'attesa fra un invio e l'altro ────────────────────────────── */

/**
 * La chiave in `licei_config` con l'ora dell'ultimo invio a tutti, una per
 * istituto. Come le chiavi della chiusura e dell'avviso sulle riflessioni,
 * sta fuori da `CONFIG_CHIAVI`: la rotta generica della configurazione non
 * la puo scrivere ne cancellare. La tabella e leggibile da chiunque, quindi
 * il valore e solo un'ora (niente conteggi, niente account del docente) e
 * la chiave porta un'impronta dell'adesione, non il suo id: in
 * `licei_config` gli id non vanno (vedi `licei-server.ts`).
 */
export const chiaveRimandaTutti = (adesioneId: string): string =>
  `${PREFISSO_RIMANDA_TUTTI}${createHash("sha256").update(adesioneId).digest("hex").slice(0, 32)}`;

/** Il prefisso comune, per toglierle tutte alla cancellazione dei dati del percorso. */
export const PREFISSO_RIMANDA_TUTTI = "rimanda_tutti:";

/** Da quando si puo ripetere l'invio a tutti, o null se si puo gia. */
export function rimandaTuttiDal(ultimoInvioAt: string | null | undefined, adesso = Date.now()): string | null {
  if (!ultimoInvioAt) return null;
  const dal = new Date(ultimoInvioAt).getTime() + RIMANDA_TUTTI_MINUTI * 60_000;
  return Number.isFinite(dal) && dal > adesso ? new Date(dal).toISOString() : null;
}

/**
 * Oltre il tetto servono piu invii, a dieci minuti l'uno dall'altro: un
 * ciclo. Chi ha ricevuto un link dall'inizio del ciclo (da un invio a
 * tutti, dal bottone sulla riga o con l'iscrizione) e gia raggiunto: resta
 * fuori dagli invii successivi e non si conta fra chi resta da raggiungere.
 * Cosi ogni invio va a chi il link non lo ha ancora avuto, invece di
 * ripartire dagli stessi e annullare il link mandato dieci minuti prima.
 *
 * L'inizio del ciclo sta in `licei_config`, accanto al tempo d'attesa e con
 * lo stesso prefisso, quindi la chiusura del percorso lo toglie: il valore
 * e solo l'ora d'inizio. Il ciclo si apre, e resta aperto, solo finche
 * qualcuno resta fuori per il tetto. Sotto il tetto non c'e: ogni invio va
 * a tutti quelli che non sono ancora entrati, tranne chi ha un link di
 * pochi minuti fa, ed e il modo di rimandare il link a tutti quando la
 * scuola ha sistemato la posta. Chi resta fuori per un link recente o per
 * un errore non lo tiene aperto: l'invio dopo lo raggiunge comunque.
 *
 * Si chiude anche quando un'email non parte dopo che il suo link e stato
 * generato: Supabase ha gia scritto `recovery_sent_at`, e lo studente
 * risulterebbe raggiunto senza esserlo. E si chiude dopo `CICLO_MAX_MS`.
 */
export const chiaveCicloRimandaTutti = (adesioneId: string): string =>
  `${chiaveRimandaTutti(adesioneId)}:ciclo`;

/**
 * Un ciclo aperto da piu di cosi e chiuso: un'ora, quanto vale un link di
 * recupero con la scadenza predefinita di Supabase (quella delle email OTP,
 * che questo repository non imposta). Dopo, il link di chi e stato
 * raggiunto all'inizio del ciclo puo non valere piu, e lo studente torna
 * fra chi lo deve ricevere.
 */
const CICLO_MAX_MS = 60 * 60_000;
/**
 * `recovery_sent_at` lo scrive Supabase con il suo orologio, l'inizio del
 * ciclo questo server con il suo: un minuto di margine, perche chi ha avuto
 * il link dal primo invio non risulti mai fuori dal ciclo.
 */
const MARGINE_OROLOGI_MS = 60_000;

/** L'inizio del ciclo in corso, in millisecondi, o null se non ce n'e uno. */
function cicloInCorso(valore: string | null, adesso: number): number | null {
  if (!valore) return null;
  const dal = Date.parse(valore);
  return Number.isFinite(dal) && dal <= adesso && adesso - dal < CICLO_MAX_MS ? dal : null;
}

/** Apre il ciclo con la sua ora d'inizio, o lo chiude con null. Un errore va solo nei log. */
async function impostaCiclo(client: Db, chiave: string, dal: string | null) {
  const { error } = await (dal
    ? client.from("licei_config").upsert({ chiave, valore: dal, aggiornato_at: new Date().toISOString() })
    : client.from("licei_config").delete().eq("chiave", chiave));
  if (error) console.error("Licei rimanda a tutti: ciclo non aggiornato:", error.message);
}

/** Lo stato dell'invio a tutti, come lo riceve la console. */
export type StatoRimandaTutti = {
  ultimo_invio_at: string | null;
  /** Null: si puo inviare adesso. */
  prossimo_invio_at: string | null;
};

/**
 * Per la console, che spegne il bottone anche dopo un ricaricamento. Se la
 * lettura fallisce il bottone resta acceso: la vera guardia e quella
 * dell'invio, che rilegge la chiave.
 */
export async function statoRimandaTutti(
  client: Db,
  adesioneId: string,
  adesso = Date.now(),
): Promise<StatoRimandaTutti> {
  try {
    const { data, error } = await client
      .from("licei_config")
      .select("valore")
      .eq("chiave", chiaveRimandaTutti(adesioneId))
      .maybeSingle();
    if (error) {
      console.error("Licei rimanda a tutti: stato non letto:", error.message);
      return { ultimo_invio_at: null, prossimo_invio_at: null };
    }
    const valore = ((data?.valore as string | null | undefined) ?? "").trim() || null;
    return { ultimo_invio_at: valore, prossimo_invio_at: rimandaTuttiDal(valore, adesso) };
  } catch (err) {
    console.error("Licei rimanda a tutti: stato non letto:", err);
    return { ultimo_invio_at: null, prossimo_invio_at: null };
  }
}

type Prenotazione =
  | { ok: true; precedente: string | null; esisteva: boolean }
  | { ok: false; prossimo: string | null };

/**
 * Prenota l'invio scrivendo l'ora PRIMA di mandare qualsiasi email. Il
 * referente e un collega che cliccano insieme arrivano qui insieme: la
 * chiave primaria fa passare solo il primo inserimento, e sulla riga che
 * c'e gia l'aggiornamento passa solo se il valore e ancora quello letto,
 * cioe se nessuno ha prenotato nel frattempo.
 *
 * Senza `aggiornato_by`: la tabella e pubblica, e l'account di chi ha
 * cliccato resta nei log, non li.
 */
async function prenota(client: Db, chiave: string, adessoIso: string, adessoMs: number): Promise<Prenotazione> {
  const riga = { chiave, valore: adessoIso, aggiornato_at: adessoIso };
  const { error } = await client.from("licei_config").insert(riga);
  if (!error) return { ok: true, precedente: null, esisteva: false };
  if (error.code !== "23505") throw new Error(`licei_config: ${error.message}`);

  const { data: attuale, error: erroreLettura } = await client
    .from("licei_config")
    .select("valore")
    .eq("chiave", chiave)
    .maybeSingle();
  if (erroreLettura) throw new Error(`licei_config: ${erroreLettura.message}`);
  const precedente = (attuale?.valore as string | null | undefined) ?? null;
  const dal = rimandaTuttiDal(precedente, adessoMs);
  if (dal) return { ok: false, prossimo: dal };

  const base = client.from("licei_config").update(riga).eq("chiave", chiave);
  const { data: aggiornate, error: erroreAggiornamento } = await (precedente === null
    ? base.is("valore", null)
    : base.eq("valore", precedente)
  ).select("chiave");
  if (erroreAggiornamento) throw new Error(`licei_config: ${erroreAggiornamento.message}`);
  if ((aggiornate ?? []).length > 0) return { ok: true, precedente, esisteva: true };

  // Qualcun altro e arrivato prima: si risponde con la sua ora.
  const { data: dopo } = await client.from("licei_config").select("valore").eq("chiave", chiave).maybeSingle();
  return { ok: false, prossimo: rimandaTuttiDal((dopo?.valore as string | null | undefined) ?? null, adessoMs) };
}

/**
 * Se non e partita nessuna email e nessun link e stato generato, la
 * prenotazione si toglie: il docente deve poter riprovare appena il
 * problema e risolto, non fra dieci minuti.
 * Solo la propria: il filtro sull'ora non tocca un invio partito dopo.
 */
async function annullaPrenotazione(
  client: Db,
  chiave: string,
  adessoIso: string,
  p: { precedente: string | null; esisteva: boolean },
) {
  const { error } = await (p.esisteva
    ? client
        .from("licei_config")
        .update({ valore: p.precedente, aggiornato_at: new Date().toISOString() })
        .eq("chiave", chiave)
        .eq("valore", adessoIso)
    : client.from("licei_config").delete().eq("chiave", chiave).eq("valore", adessoIso));
  if (error) console.error("Licei rimanda a tutti: prenotazione non tolta:", error.message);
}

/* ── Chi riceve il link ───────────────────────────────────────────────── */

export type IscrizionePerRinvio = {
  id: string;
  nome: string | null;
  email: string | null;
  stato: string;
  user_id: string | null;
};

export type Candidato = { id: string; nome: string; email: string; userId: string };

/**
 * Chi riceve il link: iscrizione attiva (in attesa o confermata, lo stato
 * non conta: un link lo serve a entrambi), con un account, mai entrato.
 * "Mai entrato" e `haFattoAccesso`, la stessa regola della console: nessun
 * accesso registrato e nessuna lezione completata.
 *
 * `ultimoAccesso` null vuol dire che gli accessi non si sono potuti
 * leggere: allora qui resta il solo criterio delle lezioni, e chi chiama
 * verifica gli altri account per account prima di mandare qualcosa.
 *
 * Un indirizzo per persona. Un indirizzo non valido non parte e si conta a
 * parte, in `nonValidi`: ripetere l'invio non lo raggiunge.
 */
export function selezionaDaRimandare(
  righe: readonly IscrizionePerRinvio[],
  ultimoAccesso: ReadonlyMap<string, string | null> | null,
  lezioni: ReadonlyMap<string, number>,
): { candidati: Candidato[]; nonValidi: number } {
  const visti = new Set<string>();
  const candidati: Candidato[] = [];
  let nonValidi = 0;
  for (const r of righe) {
    if (!STATI_ISCRIZIONE_ATTIVI.has(r.stato) || !r.user_id) continue;
    const entrato = haFattoAccesso({
      ultimo_accesso: ultimoAccesso?.get(r.id) ?? null,
      lezioni_completate: lezioni.get(r.user_id) ?? 0,
    });
    if (entrato) continue;
    const email = (r.email ?? "").trim();
    if (!EMAIL_VALIDA.test(email)) {
      nonValidi += 1;
      console.error(`Licei rimanda a tutti: iscrizione ${r.id}: indirizzo non valido, non inviato.`);
      continue;
    }
    const chiave = email.toLowerCase();
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    candidati.push({ id: r.id, nome: (r.nome ?? "").trim(), email, userId: r.user_id });
  }
  return { candidati, nonValidi };
}

/** In gruppi di `n` alla volta, nell'ordine di partenza. */
async function aGruppi<T, R>(xs: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < xs.length; i += n) out.push(...(await Promise.all(xs.slice(i, i + n).map(fn))));
  return out;
}

/**
 * L'account letto uno per uno: se e mai entrato, e quando ha ricevuto
 * l'ultimo link di recupero. Null se non si e potuto leggere.
 */
async function leggiAccount(
  client: Db,
  c: Candidato,
): Promise<{ entrato: boolean; recoverySentAt: string | null } | null> {
  try {
    const { data, error } = await client.auth.admin.getUserById(c.userId);
    if (error || !data?.user) {
      console.error(`Licei rimanda a tutti: iscrizione ${c.id}: account non letto (${error?.message ?? "assente"}).`);
      return null;
    }
    return { entrato: Boolean(data.user.last_sign_in_at), recoverySentAt: data.user.recovery_sent_at ?? null };
  } catch (err) {
    console.error(`Licei rimanda a tutti: iscrizione ${c.id}: account non letto.`, err);
    return null;
  }
}

/**
 * Un link nuovo per impostare la password: un link di recupero, generato
 * al momento e mai conservato. Null se non e stato possibile; il motivo va
 * nei log con l'id dell'iscrizione.
 */
export async function linkImpostaPassword(client: Db, iscrizioneId: string, email: string): Promise<string | null> {
  try {
    const { data, error } = await client.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });
    const url = data?.properties?.action_link;
    if (error || !url) {
      console.error(
        `Licei link di accesso: iscrizione ${iscrizioneId}: non generato (${error?.message ?? "risposta vuota"}).`,
      );
      return null;
    }
    return url;
  } catch (err) {
    console.error(`Licei link di accesso: iscrizione ${iscrizioneId}: non generato.`, err);
    return null;
  }
}

/* ── L'invio ──────────────────────────────────────────────────────────── */

export type MessaggioAccesso = { from: string; to: string; subject: string; html: string };

/** La forma della risposta di `resend.batch.send` con `batchValidation: "permissive"`. */
export type EsitoBlocco = {
  data?: { errors?: { index: number; message: string }[] } | null;
  error?: { message: string; statusCode?: number | null } | null;
};

export type DipendenzeRimandaTutti = {
  client: Db;
  adesioneId: string;
  /** Il nome dell'istituto, per il testo dell'email. */
  istituto: string;
  /** Chi ha cliccato, per i log: in `licei_config` non va. */
  autore?: string;
  /** Lezioni completate per account (`progressoPerUtenti`). */
  contaLezioni: (userIds: string[]) => Promise<Map<string, number>>;
  /** Un blocco di email, con la chiave di idempotenza del blocco. */
  inviaBlocco: (messaggi: MessaggioAccesso[], idempotencyKey: string) => Promise<EsitoBlocco>;
  /** Per le prove: l'orologio, la pausa fra i blocchi, il tetto per chiamata. */
  adesso?: () => number;
  pausa?: (ms: number) => Promise<void>;
  max?: number;
};

export type EsitoRimandaTutti =
  | {
      esito: "inviato";
      inviati: number;
      /**
       * Rimasti fuori da questo giro: oltre il tetto, o con un link ricevuto
       * negli ultimi `RIMANDA_TUTTI_RECENTE_MINUTI` minuti. Li raggiunge
       * l'invio dopo.
       */
      saltati: number;
      /**
       * Gia raggiunti in questo ciclo, da un invio precedente: fuori da
       * questo giro e non contati in `saltati`, perche non restano da
       * raggiungere.
       */
      gia_raggiunti: number;
      /**
       * Con un indirizzo non valido: nessun invio li raggiunge, finche
       * l'indirizzo non si corregge. Tenuti a parte da `saltati`, che
       * ripetere l'invio invece risolve.
       */
      non_validi: number;
      /** Link non generato, email rifiutata, account non letto. */
      errori: number;
      inviato_at: string;
      prossimo_invio_at: string;
    }
  | { esito: "attesa"; prossimo_invio_at: string | null }
  | { esito: "nessuno"; saltati: number; gia_raggiunti: number; non_validi: number }
  | {
      esito: "non_partito";
      saltati: number;
      non_validi: number;
      errori: number;
      /**
       * Null: si puo riprovare subito. Un'ora se i link erano gia stati
       * generati: valgono come recenti, e un giro adesso li salterebbe.
       */
      prossimo_invio_at: string | null;
    }
  | { esito: "accessi_non_verificabili" }
  | { esito: "errore" };

/** Un blocco, con un secondo tentativo solo per un rifiuto passeggero. */
async function inviaConRiprova(
  invia: DipendenzeRimandaTutti["inviaBlocco"],
  messaggi: MessaggioAccesso[],
  idempotencyKey: string,
  pausa: (ms: number) => Promise<void>,
): Promise<EsitoBlocco> {
  let esito: EsitoBlocco = { error: { message: "nessun tentativo", statusCode: null } };
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    try {
      esito = await invia(messaggi, idempotencyKey);
    } catch (err) {
      esito = { error: { message: err instanceof Error ? err.message : String(err), statusCode: null } };
    }
    const codice = esito.error?.statusCode ?? null;
    if (!esito.error || (codice !== null && codice !== 429 && codice < 500) || tentativo > 0) break;
    await pausa(1500);
  }
  return esito;
}

/**
 * Rimanda il link a tutti gli studenti dell'istituto che non sono mai
 * entrati, al massimo `RIMANDA_TUTTI_MAX` per volta e una volta ogni
 * `RIMANDA_TUTTI_MINUTI` minuti per istituto.
 *
 * In ordine: tempo d'attesa e ciclo in corso, iscrizioni attive
 * dell'istituto con un account, lezioni e accessi, la scelta. Poi ogni
 * candidato si rilegge da `auth.users`, per quattro motivi: sapere se e mai
 * entrato quando gli accessi non si leggono in blocco; lasciare fuori chi
 * un link l'ha ricevuto da pochi minuti (alla registrazione o dal bottone
 * sulla riga), perche un link nuovo annulla il precedente; lasciare fuori
 * chi e gia stato raggiunto in questo ciclo; oltre il tetto, mettere in
 * testa chi un link non lo riceve da piu tempo. Poi la prenotazione, e
 * l'invio a blocchi.
 */
export async function rimandaAccessoATutti(deps: DipendenzeRimandaTutti): Promise<EsitoRimandaTutti> {
  const { client, adesioneId, istituto } = deps;
  const adesso = deps.adesso ?? Date.now;
  const pausa = deps.pausa ?? pausaVera;
  const max = deps.max ?? RIMANDA_TUTTI_MAX;
  const chiave = chiaveRimandaTutti(adesioneId);
  const chiaveCiclo = chiaveCicloRimandaTutti(adesioneId);

  // 1. Il tempo d'attesa, prima delle letture pesanti. La guardia vera e
  //    la prenotazione, qui sotto: questa evita solo il lavoro inutile.
  //    Con la stessa lettura, l'inizio del ciclo in corso.
  const { data: config, error: erroreConfig } = await client
    .from("licei_config")
    .select("chiave, valore")
    .in("chiave", [chiave, chiaveCiclo]);
  if (erroreConfig) {
    console.error("Licei rimanda a tutti: tempo d'attesa non letto:", erroreConfig.message);
    return { esito: "errore" };
  }
  const valoreDi = (k: string): string | null =>
    ((config ?? []) as { chiave: string; valore: string | null }[]).find((r) => r.chiave === k)?.valore ?? null;
  const attesa = rimandaTuttiDal(valoreDi(chiave), adesso());
  if (attesa) return { esito: "attesa", prossimo_invio_at: attesa };
  const cicloInTabella = valoreDi(chiaveCiclo) !== null;
  const cicloDal = cicloInCorso(valoreDi(chiaveCiclo), adesso());

  // 2. Le iscrizioni attive di questo istituto, e di nessun altro.
  const righe: IscrizionePerRinvio[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("licei_iscrizioni")
      .select("id, nome, email, stato, user_id")
      .eq("adesione_id", adesioneId)
      .in("stato", [...STATI_ISCRIZIONE_ATTIVI])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) {
      console.error("Licei rimanda a tutti: iscrizioni non lette:", error.message);
      return { esito: "errore" };
    }
    righe.push(...((data ?? []) as IscrizionePerRinvio[]));
    if ((data ?? []).length < PAGINA) break;
  }
  const userIds = righe.map((r) => r.user_id).filter((id): id is string => !!id);
  if (userIds.length === 0) {
    if (cicloInTabella) await impostaCiclo(client, chiaveCiclo, null);
    return { esito: "nessuno", saltati: 0, gia_raggiunti: 0, non_validi: 0 };
  }

  // 3. Lezioni e accessi.
  const [lezioni, accessi] = await Promise.all([
    deps.contaLezioni(userIds).catch((err): Map<string, number> => {
      console.error("Licei rimanda a tutti: lezioni non lette:", err);
      return new Map();
    }),
    leggiAccessiIstituto(client, adesioneId),
  ]);

  const scelta = selezionaDaRimandare(righe, accessi.letti ? accessi.ultimoAccesso : null, lezioni);
  let candidati = scelta.candidati;
  const nonValidi = scelta.nonValidi;
  let saltati = 0;
  let errori = 0;

  // 4. Account per account, tutti i candidati (fino a `VERIFICHE_MAX`).
  //    Supabase tiene un solo link di recupero per account: uno nuovo
  //    annulla quello di prima, e lo studente che apre l'email di pochi
  //    minuti fa troverebbe un link scaduto, proprio il momento in cui
  //    potrebbe pensare di rifare l'iscrizione. Chi ha ricevuto un link
  //    negli ultimi `RIMANDA_TUTTI_RECENTE_MINUTI` minuti resta fuori e si
  //    conta fra i saltati: l'invio dopo, che non puo partire prima, lo
  //    raggiunge. Chi ha ricevuto un link dall'inizio del ciclo in corso
  //    resta fuori anche lui, e si conta a parte (`gia_raggiunti`).
  const daLeggere = candidati.slice(0, VERIFICHE_MAX);
  // Rimasti fuori per il tetto, qui e all'invio: i soli che tengono aperto
  // il ciclo.
  let oltreTetto = candidati.length - daLeggere.length;
  saltati += oltreTetto;
  const letti = await aGruppi(daLeggere, VERIFICHE_IN_PARALLELO, (c) => leggiAccount(client, c));
  const linkRecenteDal = adesso() - RIMANDA_TUTTI_RECENTE_MINUTI * 60_000;
  const tenuti: { c: Candidato; recovery: string; ordine: number }[] = [];
  let nonLetti = 0;
  let giaRaggiunti = 0;
  letti.forEach((a, i) => {
    if (a === null) {
      // Un account che non si legge non dice se il link e appena partito
      // ne, senza gli accessi in blocco, se e entrato: non si manda niente
      // e si conta come errore. Il suo `recovery_sent_at` non cambia, quindi
      // l'invio dopo ci riprova, con o senza ciclo.
      nonLetti += 1;
      return;
    }
    if (a.entrato) return;
    const ultimoLink = a.recoverySentAt ? Date.parse(a.recoverySentAt) : Number.NaN;
    if (Number.isFinite(ultimoLink)) {
      if (cicloDal !== null && ultimoLink >= cicloDal - MARGINE_OROLOGI_MS) {
        giaRaggiunti += 1;
        return;
      }
      if (ultimoLink > linkRecenteDal) {
        saltati += 1;
        return;
      }
    }
    tenuti.push({ c: daLeggere[i], recovery: a.recoverySentAt ?? "", ordine: i });
  });
  // Prima chi l'ultimo link l'ha ricevuto da piu tempo; a parita, l'ordine
  // di iscrizione. Una data vuota viene prima di tutte.
  tenuti.sort((a, b) => a.recovery.localeCompare(b.recovery) || a.ordine - b.ordine);
  candidati = tenuti.map((t) => t.c);
  errori += nonLetti;
  if (candidati.length === 0 && nonLetti > 0) return { esito: "accessi_non_verificabili" };

  if (candidati.length === 0) {
    // Nessuno da raggiungere adesso. Se nessuno resta fuori per il tetto,
    // il ciclo e finito.
    if (cicloInTabella && oltreTetto === 0) await impostaCiclo(client, chiaveCiclo, null);
    return { esito: "nessuno", saltati, gia_raggiunti: giaRaggiunti, non_validi: nonValidi };
  }

  const daInviare = candidati.slice(0, max);
  const oltreInvio = candidati.length - daInviare.length;
  oltreTetto += oltreInvio;
  saltati += oltreInvio;

  // 5. La prenotazione.
  const inizio = adesso();
  const inviatoAt = new Date(inizio).toISOString();
  let prenotazione: Prenotazione;
  try {
    prenotazione = await prenota(client, chiave, inviatoAt, inizio);
  } catch (err) {
    console.error("Licei rimanda a tutti: prenotazione non riuscita:", err);
    return { esito: "errore" };
  }
  if (!prenotazione.ok) return { esito: "attesa", prossimo_invio_at: prenotazione.prossimo };

  // 6. L'invio, a blocchi. I link si generano blocco per blocco, appena
  //    prima di spedirli: scadono, e non devono aspettare gli altri.
  const subject = accessoEmailSubject();
  let inviati = 0;
  let generati = 0;
  // Link generati ed email non partite: chiudono il ciclo, qui sotto.
  let nonPartiti = 0;
  for (let i = 0; i < daInviare.length; i += BLOCCO) {
    if (i > 0) await pausa(PAUSA_MS);
    const blocco = daInviare.slice(i, i + BLOCCO);
    const link = await aGruppi(blocco, LINK_IN_PARALLELO, (c) => linkImpostaPassword(client, c.id, c.email));
    const pronti = blocco.flatMap((c, j) => (link[j] ? [{ c, url: link[j] as string }] : []));
    errori += blocco.length - pronti.length;
    generati += pronti.length;
    if (pronti.length === 0) continue;

    const messaggi = pronti.map(({ c, url }) => ({
      from: MITTENTE,
      to: c.email,
      subject,
      html: accessoEmailHtml({ nome: c.nome, istituto, setPasswordUrl: url }),
    }));
    // Legata a questa prenotazione e a questo blocco: se la rete cade dopo
    // che Resend ha accettato, il secondo tentativo non manda doppioni.
    const esito = await inviaConRiprova(
      deps.inviaBlocco,
      messaggi,
      `licei-rimanda-tutti-${adesioneId}-${inviatoAt}-${i / BLOCCO}`,
      pausa,
    );
    if (esito.error) {
      errori += pronti.length;
      nonPartiti += pronti.length;
      for (const { c } of pronti) {
        console.error(`Licei rimanda a tutti: iscrizione ${c.id}: non inviato (${esito.error.message}).`);
      }
      continue;
    }
    const rifiutati = esito.data?.errors ?? [];
    for (const e of rifiutati) {
      console.error(
        `Licei rimanda a tutti: iscrizione ${pronti[e.index]?.c.id ?? "?"}: non inviato (${e.message}).`,
      );
    }
    errori += rifiutati.length;
    nonPartiti += rifiutati.length;
    inviati += pronti.length - rifiutati.length;
  }

  if (inviati === 0) {
    // Se un link e stato generato, Supabase lo ha gia registrato e ha
    // annullato quello di prima: un nuovo giro adesso salterebbe questi
    // studenti come appena raggiunti. La prenotazione resta, e la console
    // dice da quando riprovare. Se non e stato generato niente, si toglie.
    // Il ciclo invece si chiude: con un link nuovo e nessuna email, questi
    // studenti risulterebbero raggiunti senza esserlo.
    if (generati > 0) {
      if (cicloInTabella) await impostaCiclo(client, chiaveCiclo, null);
      return {
        esito: "non_partito",
        saltati,
        non_validi: nonValidi,
        errori,
        prossimo_invio_at: new Date(inizio + RIMANDA_TUTTI_MINUTI * 60_000).toISOString(),
      };
    }
    await annullaPrenotazione(client, chiave, inviatoAt, prenotazione);
    return { esito: "non_partito", saltati, non_validi: nonValidi, errori, prossimo_invio_at: null };
  }

  // Il ciclo: se qualcuno e rimasto fuori per il tetto resta aperto, o si
  // apre con l'ora di questo invio. Si chiude se non e rimasto fuori
  // nessuno, o se un'email non e partita dopo che il suo link era stato
  // generato: quello studente risulterebbe raggiunto senza esserlo, e
  // l'invio dopo riparte da chi il link non lo riceve da piu tempo.
  const ciclo = oltreTetto > 0 && nonPartiti === 0;
  if (ciclo && cicloDal === null) await impostaCiclo(client, chiaveCiclo, inviatoAt);
  if (!ciclo && cicloInTabella) await impostaCiclo(client, chiaveCiclo, null);

  console.info(
    `Licei rimanda a tutti: adesione ${adesioneId}, docente ${deps.autore ?? "?"}: ${inviati} inviati, ${saltati} saltati, ${giaRaggiunti} gia raggiunti, ${nonValidi} indirizzi non validi, ${errori} errori.`,
  );
  return {
    esito: "inviato",
    inviati,
    saltati,
    gia_raggiunti: giaRaggiunti,
    non_validi: nonValidi,
    errori,
    inviato_at: inviatoAt,
    prossimo_invio_at: new Date(inizio + RIMANDA_TUTTI_MINUTI * 60_000).toISOString(),
  };
}
