/**
 * Le email delle prenotazioni per classe: al docente che prenota (biglietto
 * di gruppo con QR, aggiornamenti, promemoria) e l'invito alle scuole del
 * percorso dei licei. Stessa cornice grafica delle email del biglietto
 * (lib/eventi/email.ts).
 */

import type { PrenotazioneClasse } from "@/lib/eventi/classi";
import type { EmailBiglietto } from "@/lib/eventi/email";

/**
 * Perché parte l'email della classe:
 * - prenotazione: appena prenotata (o giornate aggiunte con un nuovo invio del modulo);
 * - reinvio: chiesta di nuovo dalla pagina della classe o dallo staff;
 * - aggiornamento: numeri cambiati, giornata aggiunta o tolta, settore assegnato;
 * - posto_liberato: la classe era in lista d'attesa ed è stata confermata;
 * - promemoria: qualche giorno prima dell'evento (cron);
 * - annullamento: una giornata tolta o la prenotazione cancellata.
 */
export type MotivoEmailClasse =
  | "prenotazione"
  | "reinvio"
  | "aggiornamento"
  | "posto_liberato"
  | "promemoria"
  | "annullamento";

export type EmailClasseInput = {
  prenotazione: PrenotazioneClasse;
  motivo: MotivoEmailClasse;
  /** Per posto_liberato: la giornata in cui la classe è stata confermata. */
  giornataLiberata?: string;
  /** Per annullamento: la giornata tolta. */
  giornataAnnullata?: string;
  /** Per annullamento: non resta nessuna giornata, la prenotazione è cancellata. */
  prenotazioneCancellata?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function emailClasse(input: EmailClasseInput): EmailBiglietto {
  throw new Error("da implementare");
}

export type EmailInvitoScuolaInput = {
  /** Nome del docente referente del percorso. */
  nome: string;
  istituto: string;
  /** Il codice dell'adesione (LIC-XXXXXXXX): il link riempie il modulo con la scuola. */
  codiceAdesione: string;
};

/** L'invito ai referenti del percorso dei licei: portate le vostre classi il 10 (e l'11) dicembre. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function emailInvitoScuola(input: EmailInvitoScuolaInput): EmailBiglietto {
  throw new Error("da implementare");
}
