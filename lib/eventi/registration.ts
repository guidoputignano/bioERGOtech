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
  /**
   * Chi si iscrive ha confermato che un indirizzo "sospetto" (a una lettera
   * da un servizio noto, vedi lib/eventi/email-refusi.ts) è giusto così.
   */
  email_confermata?: boolean;
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
 *
 * Resta per compatibilità: la rotta di iscrizione usa validaIscrizione, che
 * dice anche quale campo correggere.
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
    return "Scegli almeno una giornata.";
  for (const slug of input.sessioni) {
    if (!allowedSlugs.includes(slug)) return "Giornata non valida.";
  }
  if (input.categoria === "startup" && !input.startup_name?.trim())
    return "Indica il nome della startup.";
  if (!input.consenso_privacy)
    return "Per iscriverti devi accettare il trattamento dei dati.";
  return null;
}

/**
 * I campi del modulo a cui un errore può essere agganciato. Il modulo porta
 * il focus sul campo indicato e mostra lì il messaggio.
 */
export type CampoIscrizione =
  | "nome"
  | "cognome"
  | "email"
  | "categoria"
  | "sessioni"
  | "startup_name"
  | "consenso_privacy";

export type ErroreIscrizione = { error: string; campo?: CampoIscrizione };

/**
 * Un nome o un cognome di persona: lettere (accenti compresi), spazi,
 * apostrofi dritti e tipografici, trattini e punti ("J. R."). Niente cifre,
 * simboli o indirizzi web: il nome finisce nell'email del biglietto, e così
 * non ci entra un link.
 * La stessa regola vale nel modulo (modulo-utils.ts) e nella rotta.
 */
export function nomeDiPersonaValido(v: string): boolean {
  const t = v.trim();
  // Un punto seguito da due lettere ("bit.ly", "www.sito.it") è un indirizzo, non un nome.
  return /^[\p{L}\p{M}][\p{L}\p{M}\s'’ʼ.\-]*$/u.test(t) && !/\.\p{L}{2,}/u.test(t);
}

export const ERRORE_CARATTERI_NOME = "Nel nome usa solo lettere, spazi, apostrofi e trattini.";
export const ERRORE_CARATTERI_COGNOME = "Nel cognome usa solo lettere, spazi, apostrofi e trattini.";

/** Lunghezze massime: oltre, un nome o un indirizzo non è plausibile. */
export const LUNGHEZZE_MASSIME = {
  nome: 80,
  cognome: 80,
  email: 254,
  startup_name: 160,
} as const;

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Valida l'input lato server e dice quale campo correggere. Ritorna null se
 * tutto è valido. Regge un corpo qualsiasi (numeri al posto di stringhe,
 * campi mancanti) senza lanciare. Non guarda l'honeypot, che la rotta tratta
 * a parte, e non guarda i refusi nel dominio dell'email, che hanno il loro
 * messaggio.
 */
export function validaIscrizione(
  input: Record<string, unknown>,
  allowedSlugs: readonly string[],
): ErroreIscrizione | null {
  const sessioni = input.sessioni;
  if (!Array.isArray(sessioni) || sessioni.length === 0) {
    return { error: "Scegli almeno una giornata.", campo: "sessioni" };
  }
  if (sessioni.some((s) => typeof s !== "string" || !allowedSlugs.includes(s))) {
    return { error: "Una delle giornate scelte non è valida. Ricarica la pagina e scegli di nuovo.", campo: "sessioni" };
  }

  const nome = testo(input.nome);
  if (!nome) return { error: "Scrivi il tuo nome.", campo: "nome" };
  if (nome.length > LUNGHEZZE_MASSIME.nome) return { error: "Il nome è troppo lungo.", campo: "nome" };
  if (!nomeDiPersonaValido(nome)) return { error: ERRORE_CARATTERI_NOME, campo: "nome" };

  const cognome = testo(input.cognome);
  if (!cognome) return { error: "Scrivi il tuo cognome.", campo: "cognome" };
  if (cognome.length > LUNGHEZZE_MASSIME.cognome) return { error: "Il cognome è troppo lungo.", campo: "cognome" };
  if (!nomeDiPersonaValido(cognome)) return { error: ERRORE_CARATTERI_COGNOME, campo: "cognome" };

  const email = testo(input.email);
  if (!email) return { error: "Scrivi il tuo indirizzo email.", campo: "email" };
  if (email.length > LUNGHEZZE_MASSIME.email || !isEmail(email)) {
    return { error: "L'indirizzo email non è completo: deve avere la forma nome@esempio.it.", campo: "email" };
  }

  const categoria = testo(input.categoria);
  if (!VALID_CATEGORIE.has(categoria)) return { error: "Indica chi sei.", campo: "categoria" };

  if (categoria === "startup") {
    const startup = testo(input.startup_name);
    if (!startup) return { error: "Scrivi il nome della startup.", campo: "startup_name" };
    if (startup.length > LUNGHEZZE_MASSIME.startup_name) {
      return { error: "Il nome della startup è troppo lungo.", campo: "startup_name" };
    }
  }

  if (input.consenso_privacy !== true) {
    return { error: "Per iscriverti serve il consenso al trattamento dei dati.", campo: "consenso_privacy" };
  }
  return null;
}

/**
 * Un nome ridotto alla sua forma confrontabile: minuscolo, senza accenti,
 * senza apostrofi o trattini, con gli spazi compattati. "José  Maria" e
 * "jose maria" sono lo stesso nome; serve a capire se chi si reiscrive con
 * un'email già usata è la stessa persona.
 */
export function normalizzaNome(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Codice univoco leggibile per il biglietto e il check-in. Formato
 * VPL-XXXXXXXX (lettere e numeri senza caratteri ambigui). Non e un dato
 * personale, quindi puo comparire nel QR e negli URL del biglietto.
 *
 * Il codice fa anche da chiave del biglietto online (chi lo ha può gestire
 * l'iscrizione): dove c'è, usa il generatore crittografico.
 */
export function generateCodice(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const casuali = new Uint32Array(8);
  const cripto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cripto && typeof cripto.getRandomValues === "function") {
    cripto.getRandomValues(casuali);
  } else {
    for (let i = 0; i < casuali.length; i++) casuali[i] = Math.floor(Math.random() * 0x100000000);
  }
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[casuali[i] % alphabet.length];
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
