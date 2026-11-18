/**
 * Il lato server delle prenotazioni per classe: lettura, prenotazione,
 * numeri, annullamento, lista d'attesa e email. Lo usano le rotte pubbliche
 * (/api/eventi/classi/*), la pagina della classe, il pannello, l'ingresso e
 * le comunicazioni.
 *
 * Solo server: usa la service role. Le regole sui posti stanno nel database
 * (event_group_book, event_group_update_numbers, event_group_promote): qui
 * non si contano posti a mano.
 *
 * Nei log niente dati personali: le classi sono "prenotazione <id>".
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import { SESSIONS, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import type { SessionStatus } from "@/lib/eventi/registration";
import { inviaConUnNuovoTentativo, promuoviDaListaAttesa, type EsitoInvio } from "@/lib/eventi/evento-server";
import { EMAIL_MITTENTE, EMAIL_RISPOSTE } from "@/lib/eventi/email";
import {
  generaCodiceClasse,
  isCodiceClasse,
  type DatiPrenotazioneClasse,
  type GiornataClasse,
  type PostiClassi,
  type PrenotazioneClasse,
} from "@/lib/eventi/classi";
import { emailClasse, type MotivoEmailClasse } from "@/lib/eventi/email-classi";
import { CODICE_RE as CODICE_ADESIONE_RE, normalizzaCodice as normalizzaCodiceAdesione } from "@/lib/eventi/licei-iscrizioni";

/** La select di una prenotazione con le sue giornate. */
export const SELECT_CLASSE = `id, codice, istituto, comune, classe, docente_nome, docente_cognome, docente_email,
  docente_telefono, studenti, accompagnatori, posti, note, licei_adesione_id, created_at, updated_at,
  event_group_booking_sessions ( id, is_waitlist, settore, presenti, checkin_ts, created_at, event_sessions ( slug ) )`;

/** Solo codice e messaggio: il dettaglio di Postgres può contenere i valori (l'email). */
const descriviErrore = (e: { code?: string; message?: string } | null | undefined) =>
  e ? `${e.code ?? "?"} ${e.message ?? ""}`.trim() : "sconosciuto";

const ordine = (slug: string) => {
  const s = sessionBySlug(slug);
  return s ? s.giorno : 99;
};

const numero = (v: unknown, riserva = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : riserva;
};

/**
 * Il codice di una classe pulito: maiuscolo, senza spazi e simboli, con il
 * trattino rimesso se manca ("vpc abcd2345" diventa "VPC-ABCD2345"). Stringa
 * vuota se non ha la forma di un codice di classe.
 */
export function pulisciCodiceClasse(v: string | null | undefined): string {
  const pulito = (v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
  const conTrattino = /^VPC[A-Z0-9]{8}$/.test(pulito) ? `VPC-${pulito.slice(3)}` : pulito;
  return isCodiceClasse(conTrattino) ? conTrattino : "";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Da una riga letta con SELECT_CLASSE alla forma comoda (giornate nell'ordine dell'evento). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizzaClasse(r: any): PrenotazioneClasse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const giornate: GiornataClasse[] = ((r.event_group_booking_sessions ?? []) as any[]).map((b) => {
    const sessione = Array.isArray(b.event_sessions) ? b.event_sessions[0] : b.event_sessions;
    return {
      id: String(b.id),
      slug: String(sessione?.slug ?? ""),
      status: (b.is_waitlist ? "lista_attesa" : "confermato") as SessionStatus,
      settore: typeof b.settore === "string" && b.settore.trim() ? b.settore : null,
      presenti: b.presenti === null || b.presenti === undefined ? null : numero(b.presenti),
      checkin_ts: b.checkin_ts ?? null,
      created_at: b.created_at ?? null,
    };
  });
  giornate.sort((a, b) => ordine(a.slug) - ordine(b.slug));
  const studenti = numero(r.studenti);
  const accompagnatori = numero(r.accompagnatori);
  return {
    id: String(r.id),
    codice: r.codice ?? "",
    istituto: r.istituto ?? "",
    comune: r.comune ?? null,
    classe: r.classe ?? "",
    docente_nome: r.docente_nome ?? "",
    docente_cognome: r.docente_cognome ?? "",
    docente_email: r.docente_email ?? "",
    docente_telefono: r.docente_telefono ?? "",
    studenti,
    accompagnatori,
    posti: numero(r.posti, studenti + accompagnatori),
    note: r.note ?? null,
    licei_adesione_id: r.licei_adesione_id ?? null,
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
    giornate,
  };
}

/** Una prenotazione per codice o per id, con le giornate. Null se non c'è. Lancia se la lettura fallisce. */
export async function caricaClasse(
  client: SupabaseClient,
  chiave: { codice: string } | { id: string },
): Promise<PrenotazioneClasse | null> {
  let q = client.from("event_group_bookings").select(SELECT_CLASSE);
  if ("codice" in chiave) {
    const codice = pulisciCodiceClasse(chiave.codice);
    if (!codice) return null;
    q = q.eq("codice", codice);
  } else {
    // Un id che non è un uuid farebbe fallire la query: non c'è, e basta.
    if (!UUID_RE.test(chiave.id)) return null;
    q = q.eq("id", chiave.id);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`event_group_bookings: ${descriviErrore(error)}`);
  return data ? normalizzaClasse(data) : null;
}

/** Tutte le prenotazioni (a pagine da 1000, nessun tetto), le più recenti prima. Lancia se la lettura fallisce. */
export async function elencoClassi(client: SupabaseClient): Promise<PrenotazioneClasse[]> {
  const PAGINA = 1000;
  // Si legge dalla più vecchia: una prenotazione nuova arriva in fondo e non
  // sposta le pagine già lette. L'ordine per le persone si fa alla fine.
  const viste = new Map<string, PrenotazioneClasse>();
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("event_group_bookings")
      .select(SELECT_CLASSE)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) throw new Error(`event_group_bookings: ${descriviErrore(error)}`);
    const righe = (data ?? []) as unknown[];
    for (const r of righe) {
      const p = normalizzaClasse(r);
      viste.set(p.id, p);
    }
    if (righe.length < PAGINA) break;
  }
  return [...viste.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

/** I posti per le classi, giornata per giornata (event_group_seats). Vuoto se la lettura fallisce. */
export async function postiClassi(client: SupabaseClient): Promise<PostiClassi[]> {
  try {
    const { data, error } = await client.rpc("event_group_seats");
    if (error || !Array.isArray(data)) {
      console.error("Posti delle classi non letti:", error ? descriviErrore(error) : "risposta senza righe");
      return [];
    }
    return (data as Record<string, unknown>[])
      .map((p) => ({
        slug: String(p.slug),
        capienza_max: numero(p.capienza_max),
        quota_gruppi: p.quota_gruppi === null || p.quota_gruppi === undefined ? null : numero(p.quota_gruppi),
        posti_classi: numero(p.posti_classi),
        classi_confermate: numero(p.classi_confermate),
        classi_in_attesa: numero(p.classi_in_attesa),
        rimanenti: numero(p.rimanenti),
        rimanenti_classi: numero(p.rimanenti_classi),
      }))
      .sort((a, b) => ordine(a.slug) - ordine(b.slug));
  } catch (err) {
    console.error("Posti delle classi non letti:", err instanceof Error ? err.message : err);
    return [];
  }
}

export type EsitoPrenotazione = {
  prenotazione: PrenotazioneClasse;
  /** False: la stessa classe (docente, scuola, classe) era già prenotata; si sono solo aggiunte giornate. */
  nuova: boolean;
  /** Lo stato di ogni giornata richiesta, e se è stata aggiunta ora. */
  giornate: { slug: string; status: SessionStatus; nuova: boolean }[];
};

type RispostaGroupBook = {
  booking_id?: unknown;
  codice?: unknown;
  nuova?: unknown;
  sessions?: { slug?: unknown; status?: unknown; nuova?: unknown }[];
};

/**
 * Prenota una classe (RPC event_group_book), riprovando una volta con un
 * codice nuovo se il codice generato esiste già. Lancia se l'RPC fallisce:
 * chi chiama risponde 500 senza mandare email.
 *
 * Lancia anche se una giornata richiesta non torna dall'RPC (non deve
 * succedere: l'RPC fallisce tutta su una giornata sconosciuta). Se la
 * rilettura dopo l'RPC non riesce, per una prenotazione nuova si usano i
 * dati appena salvati (il codice va comunque mostrato a chi ha prenotato);
 * per una che c'era già si lancia, perché i dati salvati non si conoscono.
 */
export async function prenotaClasse(
  client: SupabaseClient,
  dati: DatiPrenotazioneClasse & { licei_adesione_id: string | null; privacy_testo: string },
): Promise<EsitoPrenotazione> {
  const richieste = [...new Set(dati.giornate)];
  const testo = (v: string | null | undefined) => (v ?? "").trim();
  const parametri = (codice: string) => ({
    p_istituto: testo(dati.istituto),
    p_comune: testo(dati.comune) || null,
    p_classe: testo(dati.classe),
    p_docente_nome: testo(dati.docente_nome),
    p_docente_cognome: testo(dati.docente_cognome),
    p_docente_email: testo(dati.docente_email).toLowerCase(),
    p_docente_telefono: testo(dati.docente_telefono),
    p_studenti: dati.studenti,
    p_accompagnatori: dati.accompagnatori,
    p_note: testo(dati.note) || null,
    p_licei_adesione_id: dati.licei_adesione_id,
    p_privacy_testo: dati.privacy_testo,
    p_codice: codice,
    p_session_slugs: richieste,
  });

  let risposta: RispostaGroupBook | null = null;
  let codiceUsato = "";
  for (let tentativo = 0; ; tentativo++) {
    codiceUsato = generaCodiceClasse();
    const { data, error } = await client.rpc("event_group_book", parametri(codiceUsato));
    if (!error) {
      risposta = (data ?? null) as RispostaGroupBook | null;
      break;
    }
    // Un codice già usato (raro): si riprova una volta con un codice nuovo.
    // Per una classe già prenotata l'RPC tiene il codice salvato: vale solo per una nuova.
    const codiceDoppio = error.code === "23505" && /codice/i.test(error.message ?? "");
    console.error(`Prenotazione classe: event_group_book non riuscita (tentativo ${tentativo + 1}):`, descriviErrore(error));
    if (!codiceDoppio || tentativo >= 1) throw new Error(`event_group_book: ${descriviErrore(error)}`);
  }

  if (!risposta || typeof risposta.booking_id !== "string" || !Array.isArray(risposta.sessions)) {
    throw new Error("event_group_book: risposta senza booking_id o sessions");
  }
  const bookingId = risposta.booking_id;
  const nuova = risposta.nuova === true;
  const giornate = risposta.sessions.map((s) => ({
    slug: String(s.slug ?? ""),
    status: (s.status === "lista_attesa" ? "lista_attesa" : "confermato") as SessionStatus,
    nuova: s.nuova === true,
  }));

  // Ogni giornata scelta è tornata? Se no, niente email e niente "confermata".
  const tornate = new Set(giornate.map((g) => g.slug));
  const perse = richieste.filter((slug) => !tornate.has(slug));
  if (perse.length > 0) {
    console.error(
      `PRENOTAZIONE CLASSE INCOMPLETA: prenotazione ${bookingId}, richieste [${richieste.join(", ")}], ` +
        `salvate [${[...tornate].join(", ")}], mancanti [${perse.join(", ")}].`,
    );
    throw new Error(`event_group_book: giornate mancanti nella risposta (${perse.join(", ")})`);
  }

  // La prenotazione com'è adesso, con tutte le giornate (anche quelle di prima).
  let prenotazione: PrenotazioneClasse | null = null;
  let ultimoErrore = "";
  for (let tentativo = 0; tentativo < 2 && !prenotazione; tentativo++) {
    try {
      prenotazione = await caricaClasse(client, { id: bookingId });
      if (!prenotazione) ultimoErrore = "non trovata";
    } catch (err) {
      ultimoErrore = err instanceof Error ? err.message : String(err);
    }
  }
  if (!prenotazione) {
    console.error(`Prenotazione classe ${bookingId}: rilettura non riuscita dopo la prenotazione:`, ultimoErrore);
    if (!nuova) throw new Error(`event_group_bookings: rilettura non riuscita (${ultimoErrore})`);
    // Nuova: i dati salvati sono quelli appena passati all'RPC, che li pulisce allo stesso modo.
    const par = parametri(typeof risposta.codice === "string" ? risposta.codice : codiceUsato);
    const adesso = new Date().toISOString();
    prenotazione = {
      id: bookingId,
      codice: par.p_codice,
      istituto: par.p_istituto,
      comune: par.p_comune,
      classe: par.p_classe,
      docente_nome: par.p_docente_nome,
      docente_cognome: par.p_docente_cognome,
      docente_email: par.p_docente_email,
      docente_telefono: par.p_docente_telefono,
      studenti: par.p_studenti,
      accompagnatori: par.p_accompagnatori,
      posti: par.p_studenti + par.p_accompagnatori,
      note: par.p_note,
      licei_adesione_id: par.p_licei_adesione_id,
      created_at: adesso,
      updated_at: adesso,
      giornate: giornate
        .map((g) => ({ id: "", slug: g.slug, status: g.status, settore: null, presenti: null, checkin_ts: null, created_at: null }))
        .sort((a, b) => ordine(a.slug) - ordine(b.slug)),
    };
  }

  return { prenotazione, nuova, giornate };
}

type RispostaNumeri = { ok?: unknown; motivo?: unknown; giornata?: unknown; posti_prima?: unknown; posti_dopo?: unknown };

/**
 * Cambia il numero di studenti e docenti (RPC event_group_update_numbers).
 * Se diminuisce, i posti liberati passano a chi aspetta (promuoviDopoPostiLiberati).
 * `{ ok: false, giornata }`: in quella giornata confermata il numero nuovo non ci sta.
 * `{ ok: false, giornata: null }`: la prenotazione non c'è più.
 * Lancia se l'RPC fallisce (anche per numeri fuori dai limiti: chi chiama li controlla prima).
 * Non manda l'email al docente: lo decide chi chiama.
 *
 * `salta`: le giornate in cui non controllare i posti, perché già iniziate
 * (la pagina della classe: la sera del 10 una classe può crescere per l'11
 * anche se il 10 era pieno). Lo staff non salta niente: vede il problema e
 * può forzare.
 *
 * Con `promuovi: false` non passa i posti a nessuno: lo fa chi chiama, per
 * esempio dopo aver risposto (la pagina della classe non aspetta le email
 * di decine di persone confermate). Le giornate da passare sono tutte
 * quelle della prenotazione (giornateDaRivedereDopoRiduzione): le
 * confermate perché liberano posti, quelle in lista d'attesa perché la
 * classe, più piccola, ora può starci.
 */
export async function aggiornaNumeriClasse(
  client: SupabaseClient,
  resend: Resend | null,
  prenotazione: PrenotazioneClasse,
  numeri: { studenti: number; accompagnatori: number },
  opzioni: { promuovi?: boolean; salta?: readonly string[] } = {},
): Promise<{ ok: true; posti_prima: number; posti_dopo: number } | { ok: false; giornata: string | null }> {
  const { data, error } = await client.rpc("event_group_update_numbers", {
    p_booking_id: prenotazione.id,
    p_studenti: numeri.studenti,
    p_accompagnatori: numeri.accompagnatori,
    p_salta: [...(opzioni.salta ?? [])],
  });
  if (error) throw new Error(`event_group_update_numbers: ${descriviErrore(error)}`);
  const r = (data ?? {}) as RispostaNumeri;
  if (r.ok !== true) {
    if (r.motivo === "non_trovata") return { ok: false, giornata: null };
    return { ok: false, giornata: typeof r.giornata === "string" ? r.giornata : null };
  }
  const prima = numero(r.posti_prima, prenotazione.posti);
  const dopo = numero(r.posti_dopo, numeri.studenti + numeri.accompagnatori);
  console.info(`Prenotazione classe ${prenotazione.id}: numeri cambiati, posti da ${prima} a ${dopo}.`);

  if (dopo < prima && opzioni.promuovi !== false) {
    // Giornata per giornata, a chi aspetta. Quelle concluse si saltano dentro.
    for (const slug of giornateDaRivedereDopoRiduzione(prenotazione)) {
      await promuoviDopoPostiLiberati(client, resend, slug);
    }
  }
  return { ok: true, posti_prima: prima, posti_dopo: dopo };
}

/**
 * Le giornate in cui, dopo che una classe ha ridotto i numeri, qualcuno in
 * attesa può entrare: quelle confermate (si sono liberati posti) e quelle in
 * lista d'attesa (la classe stessa, ora più piccola, può starci; senza una
 * nuova conferma resterebbe in attesa anche con i posti liberi). Solo le
 * giornate del sito, nell'ordine dell'evento.
 */
export function giornateDaRivedereDopoRiduzione(prenotazione: PrenotazioneClasse): string[] {
  return ordineGiornate(prenotazione.giornate.filter((g) => sessionBySlug(g.slug)).map((g) => g.slug));
}

/**
 * Toglie una giornata a una classe. Se era confermata, i posti liberati
 * passano a chi aspetta (promuoviDopoPostiLiberati). Se non resta nessuna
 * giornata, cancella la prenotazione. Torna se la prenotazione è stata
 * cancellata del tutto e se la riga c'era davvero; in più quante giornate
 * restano (0 con prenotazioneCancellata false: la riga vuota non si è
 * cancellata, ma per il docente la prenotazione non c'è più).
 *
 * Non controlla se la giornata è iniziata o se la classe è già entrata: lo
 * fa chi chiama (la pagina della classe non può, lo staff sì). Lancia se la
 * cancellazione della giornata non riesce. Non manda l'email al docente.
 *
 * Con `promuovi: false` non passa i posti a nessuno: lo fa chi chiama
 * (promuoviDopoPostiLiberati per `slug`, se `era` è "confermato").
 */
export async function annullaGiornataClasse(
  client: SupabaseClient,
  resend: Resend | null,
  prenotazione: PrenotazioneClasse,
  slug: string,
  opzioni: { promuovi?: boolean } = {},
): Promise<{ tolta: boolean; prenotazioneCancellata: boolean; era: SessionStatus | null; rimaste: number }> {
  const intatta = { tolta: false, prenotazioneCancellata: false, era: null, rimaste: prenotazione.giornate.length };
  const g = prenotazione.giornate.find((x) => x.slug === slug);
  if (!g) return intatta;

  const { data: tolte, error: delError } = await client
    .from("event_group_booking_sessions")
    .delete()
    .eq("id", g.id)
    .eq("booking_id", prenotazione.id)
    .select("id, is_waitlist");
  if (delError) throw new Error(`event_group_booking_sessions: ${descriviErrore(delError)}`);
  const riga = ((tolte ?? []) as { id: string; is_waitlist: boolean }[])[0];
  if (!riga) {
    // Tolta un attimo fa da un'altra richiesta (un doppio clic, un'altra
    // scheda, lo staff): quella ha già passato i posti.
    return intatta;
  }
  // Lo stato vero al momento della cancellazione: la classe può essere
  // stata confermata dalla lista d'attesa dopo la lettura.
  const era: SessionStatus = riga.is_waitlist ? "lista_attesa" : "confermato";

  // Resta qualche giornata? Si conta nel database, non in memoria: conta
  // anche una giornata che il sito non mostra. Se il conteggio non riesce si
  // usano le giornate lette prima: una prenotazione senza giornate non deve
  // restare (riceverebbe le comunicazioni senza una data).
  let rimaste: number;
  const { count, error: countError } = await client
    .from("event_group_booking_sessions")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", prenotazione.id);
  if (countError) {
    console.error(`Prenotazione classe ${prenotazione.id}: conteggio delle giornate non riuscito:`, descriviErrore(countError));
    rimaste = prenotazione.giornate.filter((x) => x.id !== g.id).length;
  } else {
    rimaste = count ?? 0;
  }

  let prenotazioneCancellata = false;
  if (rimaste === 0) {
    // Nel database, solo se non ha davvero più giornate: una giornata
    // aggiunta nello stesso istante da un'altra scheda non si perde.
    const { data: cancellata, error: bookError } = await client.rpc("event_group_delete_if_empty", {
      p_booking_id: prenotazione.id,
    });
    if (bookError) {
      // I posti sono liberi: è quello che conta. La prenotazione vuota resta, e il pannello la vede.
      console.error(`Prenotazione classe ${prenotazione.id}: prenotazione senza giornate non cancellata:`, descriviErrore(bookError));
    } else if (cancellata === true) {
      prenotazioneCancellata = true;
      console.info(`Prenotazione classe ${prenotazione.id}: annullata (ultima giornata ${slug}, era ${era}).`);
    } else {
      // Un'altra richiesta ha aggiunto una giornata nel frattempo (o ha già
      // cancellato la prenotazione): la prenotazione resta com'è.
      const { count: ancora } = await client
        .from("event_group_booking_sessions")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", prenotazione.id);
      rimaste = ancora ?? 0;
      prenotazioneCancellata = rimaste === 0;
      console.info(`Prenotazione classe ${prenotazione.id}: giornata ${slug} tolta (era ${era}), la prenotazione non era vuota o non c'era più.`);
    }
  } else {
    console.info(`Prenotazione classe ${prenotazione.id}: giornata ${slug} tolta (era ${era}).`);
  }

  if (era === "confermato" && opzioni.promuovi !== false) await promuoviDopoPostiLiberati(client, resend, slug);
  return { tolta: true, prenotazioneCancellata, era, rimaste };
}

/** Al massimo tante persone confermate per chiamata: oltre, ci pensa il pannello. */
const MAX_PERSONE_PER_PROMOZIONE = 50;

/**
 * Dopo che in una giornata si sono liberati posti (una classe annullata o
 * ridotta, una persona che ha liberato il posto): conferma prima le classi in
 * attesa che ci stanno (RPC event_group_promote, con email "posto_liberato"
 * a ciascuna), poi le persone singole in attesa (promuoviDaListaAttesa, finché
 * ce n'è posto, al massimo 50 per chiamata). Solo per giornate non concluse.
 * Non lancia mai: ogni problema finisce nei log.
 * Torna le classi e il numero di persone confermate.
 */
export async function promuoviDopoPostiLiberati(
  client: SupabaseClient,
  resend: Resend | null,
  slug: string,
): Promise<{ classi: { prenotazione: PrenotazioneClasse; email: EsitoInvio | null }[]; persone: number }> {
  const esito: { classi: { prenotazione: PrenotazioneClasse; email: EsitoInvio | null }[]; persone: number } = {
    classi: [],
    persone: 0,
  };
  try {
    const sessione = sessionBySlug(slug);
    if (!sessione) {
      console.error(`Posti liberati ${slug}: giornata sconosciuta al sito, nessuna conferma.`);
      return esito;
    }
    // A giornata conclusa un posto non serve più a nessuno, e un'email
    // "si è liberato un posto" sarebbe solo confusione.
    if (Date.now() > Date.parse(sessione.fineISO)) return esito;

    // ── 1. Le classi in attesa, in ordine di prenotazione, se ci stanno tutte ──
    const { data: sess, error: sessError } = await client.from("event_sessions").select("id").eq("slug", slug).maybeSingle();
    if (sessError || !sess) {
      console.error(`Posti liberati ${slug}: giornata non letta:`, sessError ? descriviErrore(sessError) : "non trovata");
    } else {
      const { data: promosse, error: promError } = await client.rpc("event_group_promote", { p_session_id: sess.id });
      if (promError) {
        console.error(`Posti liberati ${slug}: event_group_promote non riuscita:`, descriviErrore(promError));
      } else {
        // setof uuid: PostgREST torna i valori, o righe con il nome della funzione.
        const ids = ((Array.isArray(promosse) ? promosse : promosse ? [promosse] : []) as unknown[])
          .map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? Object.values(x)[0] : null))
          .filter((x): x is string => typeof x === "string");
        for (const id of ids) {
          console.info(`Lista d'attesa classi ${slug}: confermata la prenotazione ${id} (posti liberati).`);
          let p: PrenotazioneClasse | null = null;
          try {
            p = await caricaClasse(client, { id });
          } catch (err) {
            console.error(
              `PROMOZIONE CLASSE SENZA EMAIL: ${slug}, prenotazione ${id} confermata ma non riletta:`,
              err instanceof Error ? err.message : err,
            );
          }
          if (!p) continue;
          if (!resend) {
            console.error(`PROMOZIONE CLASSE SENZA EMAIL: ${slug}, prenotazione ${id} confermata, RESEND_API_KEY mancante.`);
            esito.classi.push({ prenotazione: p, email: null });
            continue;
          }
          const email = await inviaEmailClasse(resend, p, "posto_liberato", { giornataLiberata: slug });
          if (!email.ok) {
            // Prefisso fisso: la classe ha il posto ma il docente non lo sa. Va avvisato.
            console.error(`PROMOZIONE CLASSE SENZA EMAIL: ${slug}, prenotazione ${id} confermata, email non inviata:`, email.errore);
          }
          esito.classi.push({ prenotazione: p, email });
        }
      }
    }

    // ── 2. Le persone in attesa, una alla volta, finché c'è posto ──
    // promuoviDaListaAttesa conta anche le classi appena confermate e si
    // ferma (null) quando la giornata è piena o nessuno aspetta più.
    while (esito.persone < MAX_PERSONE_PER_PROMOZIONE) {
      const promossa = await promuoviDaListaAttesa(client, resend, slug);
      if (!promossa) break;
      esito.persone += 1;
    }
    if (esito.persone >= MAX_PERSONE_PER_PROMOZIONE) {
      console.warn(
        `Posti liberati ${slug}: confermate ${MAX_PERSONE_PER_PROMOZIONE} persone, il massimo per volta. ` +
          "Se restano posti e persone in attesa, si confermano dal pannello.",
      );
    }
  } catch (err) {
    console.error(`Posti liberati ${slug}: errore inatteso:`, err instanceof Error ? err.message : err);
  }
  return esito;
}

/**
 * Manda al docente l'email della classe (biglietto di gruppo, con QR e
 * link alla pagina della classe). Non lancia: torna l'esito. Riprova una
 * volta sugli errori temporanei (inviaConUnNuovoTentativo).
 */
export async function inviaEmailClasse(
  resend: Resend,
  prenotazione: PrenotazioneClasse,
  motivo: MotivoEmailClasse,
  opzioni?: { giornataLiberata?: string; giornataAnnullata?: string; prenotazioneCancellata?: boolean },
): Promise<EsitoInvio> {
  try {
    const { subject, html, text } = emailClasse({ prenotazione, motivo, ...opzioni });
    const messaggio = {
      from: EMAIL_MITTENTE,
      to: prenotazione.docente_email,
      replyTo: EMAIL_RISPOSTE,
      subject,
      html,
      text,
    };
    return await inviaConUnNuovoTentativo(() => resend.emails.send(messaggio));
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * L'adesione al percorso dei licei da un codice LIC-XXXXXXXX, per riempire
 * il modulo delle scuole dal link dell'invito. Solo adesioni "confermata" o
 * "attiva". Null se non c'è o se la lettura fallisce.
 */
export async function adesioneDaCodice(
  client: SupabaseClient,
  codice: string,
): Promise<{ id: string; istituto: string; comune: string } | null> {
  const c = normalizzaCodiceAdesione(codice ?? "");
  if (!CODICE_ADESIONE_RE.test(c)) return null;
  try {
    const { data, error } = await client
      .from("licei_adesioni")
      .select("id, istituto_denominazione, istituto_comune")
      .eq("codice", c)
      .in("stato", ["confermata", "attiva"])
      .maybeSingle();
    if (error) {
      console.error("Adesione dal codice: lettura non riuscita:", descriviErrore(error));
      return null;
    }
    if (!data) return null;
    const r = data as { id: string; istituto_denominazione: string | null; istituto_comune: string | null };
    return { id: String(r.id), istituto: r.istituto_denominazione ?? "", comune: r.istituto_comune ?? "" };
  } catch (err) {
    console.error("Adesione dal codice: lettura non riuscita:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Le giornate del sito, nell'ordine dell'evento (per le rotte). */
export const ordineGiornate = (slugs: Iterable<string>): string[] => {
  const set = new Set(slugs);
  return SESSIONS.filter((s) => set.has(s.slug)).map((s) => s.slug);
};
