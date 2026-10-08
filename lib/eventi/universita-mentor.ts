/**
 * Tipi e validazione della candidatura a mentor del percorso universitario.
 *
 * Come `universita.ts` per le pre-iscrizioni: la stessa funzione valida nel
 * modulo in pagina e nella rotta API, cosi un campo non puo passare dal
 * client senza passare anche dal server.
 */

import {
  AREE_DISCIPLINARI,
  DISPONIBILITA_MENTOR,
  MENTOR_BIO_MAX,
  MENTOR_COMPETENZE_MAX,
  RUOLI_MENTOR,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

export type MentorInput = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: string;
  organizzazione: string;
  aree: string[];
  bio: string;
  competenze: string;
  disponibilita: string;
  sito: string;
  linkedin: string;
  consenso_pubblicazione: boolean;
  consenso_privacy: boolean;
  /**
   * Email professionale o pagina di contatto, facoltativa. La vedono solo i
   * partecipanti del percorso dopo l'accesso, e solo se il mentor ha
   * accettato le linee guida: mai la pagina pubblica.
   */
  contatto_studenti: string;
  /** La casella delle linee guida per i mentor. Obbligatoria. */
  linee_guida_accettate: boolean;
};

const RUOLI = new Set<string>(RUOLI_MENTOR.map((r) => r.value));
const AREE = new Set<string>(AREE_DISCIPLINARI.map((a) => a.value));
const DISPONIBILITA = new Set<string>(DISPONIBILITA_MENTOR.map((d) => d.value));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_CORTO = 160;
const MAX_LINK = 300;

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Campi obbligatori di testo, nell'ordine in cui compaiono nel modulo. */
const CAMPI_OBBLIGATORI: [keyof MentorInput, string][] = [
  ["nome", "il nome"],
  ["cognome", "il cognome"],
  ["email", "l'email"],
  ["organizzazione", "l'università, l'ente o l'azienda"],
];

/**
 * Un link facoltativo che c'e deve essere un link. Lasciar passare
 * "linkedin.com/in/tizio" significa pubblicarlo come testo morto in una
 * pagina che serve proprio a far trovare quella persona.
 */
function validaLink(valore: string, etichetta: string): string | null {
  if (!valore) return null;
  if (valore.length > MAX_LINK) return `L'indirizzo ${etichetta} è troppo lungo.`;
  if (!/^https?:\/\/.+\..+/i.test(valore))
    return `L'indirizzo ${etichetta} deve iniziare con http:// o https://`;
  return null;
}

/**
 * Il contatto per gli studenti: un'email oppure un indirizzo web.
 *
 * Due forme e non una perche le linee guida chiedono un contatto
 * professionale, e per molti quello e la pagina di contatto del laboratorio
 * o dell'ente, non una casella di posta. Un numero di telefono non passa, di
 * proposito: con gli studenti, che possono essere minorenni, un canale
 * personale come il cellulare e esattamente cio che le linee guida chiedono
 * di evitare.
 *
 * La usano il modulo, la rotta della candidatura e quella dello staff.
 */
export function validaContattoStudenti(valore: string): string | null {
  const v = valore.trim();
  if (!v) return null;
  if (v.length > MAX_LINK) return "Il contatto per gli studenti è troppo lungo.";
  if (EMAIL_RE.test(v)) return null;
  if (/^https?:\/\/[^\s]+\.[^\s]+$/i.test(v)) return null;
  return "Il contatto per gli studenti deve essere un indirizzo email oppure un indirizzo web che inizia con http:// o https://";
}

/**
 * La colonna che manca perche la migrazione 20261214000000 non e ancora
 * stata applicata in produzione.
 *
 * Le migrazioni qui si eseguono a mano, quindi il codice puo arrivare prima
 * delle colonne. Postgres risponde 42703 a una SELECT che nomina una colonna
 * che non c'e, PostgREST risponde PGRST204 a una INSERT o UPDATE che la
 * scrive. Si guarda anche il nome della colonna, perche lo stesso codice
 * per un'altra colonna e un errore vero e non deve essere coperto da questo
 * ripiego.
 */
export const COLONNE_LINEE_GUIDA = [
  "contatto_studenti",
  "linee_guida_accettate_at",
  "linee_guida_testo",
] as const;

export function colonneLineeGuidaMancanti(
  errore: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!errore) return false;
  if (errore.code !== "42703" && errore.code !== "PGRST204") return false;
  const messaggio = errore.message ?? "";
  return COLONNE_LINEE_GUIDA.some((c) => messaggio.includes(c));
}

/**
 * Restituisce il primo errore trovato, oppure `null` se va tutto bene.
 * Un solo messaggio per volta, come in tutto il resto del modulo.
 */
export function validateMentor(input: Partial<MentorInput>): string | null {
  for (const [campo, etichetta] of CAMPI_OBBLIGATORI) {
    const v = testo(input[campo]);
    if (!v) return `Manca ${etichetta}.`;
    if (v.length > MAX_CORTO)
      return `Il campo "${etichetta}" è troppo lungo: al massimo ${MAX_CORTO} caratteri.`;
  }

  const email = testo(input.email);
  if (!EMAIL_RE.test(email)) return "L'indirizzo email non sembra valido.";

  if (testo(input.telefono).length > 40) return "Il numero di telefono è troppo lungo.";

  if (!input.ruolo || !RUOLI.has(String(input.ruolo)))
    return "Scegli il profilo che ti descrive meglio.";

  const aree = Array.isArray(input.aree) ? input.aree.map(String) : [];
  if (aree.length === 0)
    return "Indica almeno un'area disciplinare: è quello che permette di abbinarti a un team.";
  if (aree.length > 6)
    return "Scegli al massimo sei aree: un elenco più lungo non aiuta l'abbinamento.";
  for (const a of aree) {
    if (!AREE.has(a)) return "Una delle aree indicate non è valida.";
  }

  const bio = testo(input.bio);
  if (!bio) return "Manca il profilo: bastano due righe su di te.";
  if (bio.length > MENTOR_BIO_MAX)
    return `Il profilo supera i ${MENTOR_BIO_MAX} caratteri.`;

  if (testo(input.competenze).length > MENTOR_COMPETENZE_MAX)
    return `Le competenze superano i ${MENTOR_COMPETENZE_MAX} caratteri.`;

  if (!input.disponibilita || !DISPONIBILITA.has(String(input.disponibilita)))
    return "Indica quanto tempo puoi dare davvero: anche un solo incontro è utile.";

  const sito = validaLink(testo(input.sito), "del sito");
  if (sito) return sito;

  const linkedin = validaLink(testo(input.linkedin), "di LinkedIn");
  if (linkedin) return linkedin;

  const contatto = validaContattoStudenti(testo(input.contatto_studenti));
  if (contatto) return contatto;

  // Obbligatoria per tutti, anche per chi non indica un contatto: le linee
  // guida non riguardano solo il recapito in elenco, ma anche come ci si
  // comporta con uno studente che il mentor incontra in un altro modo, per
  // esempio dentro una squadra abbinata dallo staff.
  if (!input.linee_guida_accettate)
    return "Per candidarsi come mentor deve leggere e accettare le linee guida per i mentor.";

  if (!input.consenso_privacy)
    return "Per candidarti devi prendere visione dell'informativa.";

  // Il consenso alla pubblicazione non e obbligatorio: si puo fare il mentor
  // senza comparire in pagina. Chi non lo da resta invisibile all'elenco
  // pubblico e visibile solo allo staff e ai team che gli vengono assegnati,
  // esattamente come `daAutorizzare` per i relatori dell'evento.

  return null;
}

/** Normalizza le aree: valori validi, senza doppioni, nell'ordine dell'elenco. */
export function normalizzaAree(aree: unknown): string[] {
  const grezze = Array.isArray(aree) ? aree.map(String) : [];
  const scelte = new Set(grezze.filter((a) => AREE.has(a)));
  return AREE_DISCIPLINARI.filter((a) => scelte.has(a.value)).map((a) => a.value);
}
