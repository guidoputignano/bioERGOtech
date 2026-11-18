/**
 * Tipi e utility condivise dal modulo evento. Niente dipendenze da React o
 * da Supabase qui, cosi e riutilizzabile sia lato client sia lato server.
 */

export type SessionStatus = "confermato" | "lista_attesa";

export type RegistrationResult = {
  registration_id: string;
  codice: string;
  sessions: { slug: string; status: SessionStatus }[];
};

/** Payload del form di iscrizione, validato lato server. */
export type RegistrationInput = {
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  categoria: string;
  organizzazione?: string;
  classe?: string;
  startup_name?: string;
  startup_url?: string;
  startup_desc?: string;
  referente?: string;
  note?: string;
  consenso_privacy: boolean;
  consenso_marketing: boolean;
  sessioni: string[];
  /** Honeypot anti-spam. Deve restare vuoto. */
  website?: string;
};

const VALID_CATEGORIE = new Set([
  "studente",
  "scuola_docente",
  "autorita",
  "startup",
  "investitore_partner",
  "pubblico",
]);

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Valida l'input lato server. Ritorna un messaggio d'errore (in italiano) o
 * null se tutto è valido. La stessa validazione vale lato client.
 */
export function validateRegistration(
  input: Partial<RegistrationInput>,
  allowedSlugs: string[],
): string | null {
  if (input.website && input.website.trim() !== "") return "Richiesta non valida.";
  if (!input.nome?.trim()) return "Il nome è obbligatorio.";
  if (!input.cognome?.trim()) return "Il cognome è obbligatorio.";
  if (!input.email?.trim() || !isEmail(input.email.trim()))
    return "Inserisci un indirizzo email valido.";
  if (!input.categoria || !VALID_CATEGORIE.has(input.categoria))
    return "Seleziona una categoria valida.";
  if (!Array.isArray(input.sessioni) || input.sessioni.length === 0)
    return "Seleziona almeno una sessione.";
  for (const slug of input.sessioni) {
    if (!allowedSlugs.includes(slug)) return "Sessione non valida.";
  }
  if (input.categoria === "startup" && !input.startup_name?.trim())
    return "Indica il nome della startup.";
  if (!input.consenso_privacy)
    return "Per iscriverti devi accettare il trattamento dei dati.";
  return null;
}

/**
 * Codice univoco leggibile per il biglietto e il check-in. Formato
 * VPL-XXXXXXXX (lettere e numeri senza caratteri ambigui). Non e un dato
 * personale, quindi puo comparire nel QR e negli URL del biglietto.
 */
export function generateCodice(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `VPL-${code}`;
}

/**
 * Com'è andata un'iscrizione, giornata per giornata: tutte confermate, tutte
 * in lista d'attesa, in parte, o nessuna giornata (non deve succedere: è il
 * segno che una giornata non è stata salvata). Decide il titolo della
 * schermata di conferma, l'oggetto dell'email e il biglietto.
 */
export type EsitoIscrizione = "confermata" | "parziale" | "attesa" | "nessuna";

export function esitoIscrizione(sessions: readonly { status: SessionStatus }[]): EsitoIscrizione {
  if (sessions.length === 0) return "nessuna";
  const attesa = sessions.filter((s) => s.status === "lista_attesa").length;
  if (attesa === 0) return "confermata";
  if (attesa === sessions.length) return "attesa";
  return "parziale";
}
