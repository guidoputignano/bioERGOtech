/**
 * Il lato server delle prenotazioni per classe: lettura, prenotazione,
 * numeri, annullamento, lista d'attesa e email. Lo usano le rotte pubbliche
 * (/api/eventi/classi/*), la pagina della classe, il pannello, l'ingresso e
 * le comunicazioni.
 *
 * Solo server: usa la service role. Le regole sui posti stanno nel database
 * (event_group_book, event_group_update_numbers, event_group_promote): qui
 * non si contano posti a mano.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import type { SessionStatus } from "@/lib/eventi/registration";
import type { EsitoInvio } from "@/lib/eventi/evento-server";
import type { DatiPrenotazioneClasse, PostiClassi, PrenotazioneClasse } from "@/lib/eventi/classi";
import type { MotivoEmailClasse } from "@/lib/eventi/email-classi";

/** La select di una prenotazione con le sue giornate. */
export const SELECT_CLASSE = `id, codice, istituto, comune, classe, docente_nome, docente_cognome, docente_email,
  docente_telefono, studenti, accompagnatori, posti, note, licei_adesione_id, created_at, updated_at,
  event_group_booking_sessions ( id, is_waitlist, settore, presenti, checkin_ts, created_at, event_sessions ( slug ) )`;

/** Da una riga letta con SELECT_CLASSE alla forma comoda (giornate nell'ordine dell'evento). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export function normalizzaClasse(r: any): PrenotazioneClasse {
  throw new Error("da implementare");
}

/** Una prenotazione per codice o per id, con le giornate. Null se non c'è. Lancia se la lettura fallisce. */
export async function caricaClasse(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chiave: { codice: string } | { id: string },
): Promise<PrenotazioneClasse | null> {
  throw new Error("da implementare");
}

/** Tutte le prenotazioni (a pagine da 1000, nessun tetto), le più recenti prima. Lancia se la lettura fallisce. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function elencoClassi(client: SupabaseClient): Promise<PrenotazioneClasse[]> {
  throw new Error("da implementare");
}

/** I posti per le classi, giornata per giornata (event_group_seats). Vuoto se la lettura fallisce. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function postiClassi(client: SupabaseClient): Promise<PostiClassi[]> {
  throw new Error("da implementare");
}

export type EsitoPrenotazione = {
  prenotazione: PrenotazioneClasse;
  /** False: la stessa classe (docente, scuola, classe) era già prenotata; si sono solo aggiunte giornate. */
  nuova: boolean;
  /** Lo stato di ogni giornata richiesta, e se è stata aggiunta ora. */
  giornate: { slug: string; status: SessionStatus; nuova: boolean }[];
};

/**
 * Prenota una classe (RPC event_group_book), riprovando una volta con un
 * codice nuovo se il codice generato esiste già. Lancia se l'RPC fallisce:
 * chi chiama risponde 500 senza mandare email.
 */
export async function prenotaClasse(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dati: DatiPrenotazioneClasse & { licei_adesione_id: string | null; privacy_testo: string },
): Promise<EsitoPrenotazione> {
  throw new Error("da implementare");
}

/**
 * Cambia il numero di studenti e docenti (RPC event_group_update_numbers).
 * Se diminuisce, i posti liberati passano a chi aspetta (promuoviDopoPostiLiberati).
 * `{ ok: false, giornata }`: in quella giornata confermata il numero nuovo non ci sta.
 */
export async function aggiornaNumeriClasse(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resend: Resend | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prenotazione: PrenotazioneClasse,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  numeri: { studenti: number; accompagnatori: number },
): Promise<{ ok: true; posti_prima: number; posti_dopo: number } | { ok: false; giornata: string | null }> {
  throw new Error("da implementare");
}

/**
 * Toglie una giornata a una classe. Se era confermata, i posti liberati
 * passano a chi aspetta (promuoviDopoPostiLiberati). Se non resta nessuna
 * giornata, cancella la prenotazione. Torna se la prenotazione è stata
 * cancellata del tutto e se la riga c'era davvero.
 */
export async function annullaGiornataClasse(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resend: Resend | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prenotazione: PrenotazioneClasse,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  slug: string,
): Promise<{ tolta: boolean; prenotazioneCancellata: boolean; era: SessionStatus | null }> {
  throw new Error("da implementare");
}

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resend: Resend | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  slug: string,
): Promise<{ classi: { prenotazione: PrenotazioneClasse; email: EsitoInvio | null }[]; persone: number }> {
  throw new Error("da implementare");
}

/**
 * Manda al docente l'email della classe (biglietto di gruppo, con QR e
 * link alla pagina della classe). Non lancia: torna l'esito. Riprova una
 * volta sugli errori temporanei (inviaConUnNuovoTentativo).
 */
export async function inviaEmailClasse(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resend: Resend,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prenotazione: PrenotazioneClasse,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  motivo: MotivoEmailClasse,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opzioni?: { giornataLiberata?: string; giornataAnnullata?: string; prenotazioneCancellata?: boolean },
): Promise<EsitoInvio> {
  throw new Error("da implementare");
}

/**
 * L'adesione al percorso dei licei da un codice LIC-XXXXXXXX, per riempire
 * il modulo delle scuole dal link dell'invito. Solo adesioni "confermata" o
 * "attiva". Null se non c'è o se la lettura fallisce.
 */
export async function adesioneDaCodice(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  codice: string,
): Promise<{ id: string; istituto: string; comune: string } | null> {
  throw new Error("da implementare");
}
