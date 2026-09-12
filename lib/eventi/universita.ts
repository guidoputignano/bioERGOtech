/**
 * Tipi e validazione della pre-iscrizione al bando universitario.
 *
 * Condiviso tra il modulo in pagina e la rotta API: la stessa funzione
 * valida sui due lati, così un campo non può passare dal client senza
 * passare anche dal server.
 */

import {
  AREE_DISCIPLINARI,
  LIVELLI_STUDIO,
  MAX_INTERESSI,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

export type UniversitaInput = {
  nome: string;
  cognome: string;
  email: string;
  universita: string;
  corso_studi: string;
  livello: string;
  area: string;
  area_altro: string;
  interessi: string;
  accetta_bando: boolean;
  consenso_privacy: boolean;
};

export type UniversitaResult = {
  ok: true;
  codice: string;
  aggiornata: boolean;
};

const LIVELLI = new Set<string>(LIVELLI_STUDIO.map((l) => l.value));
const AREE = new Set<string>(AREE_DISCIPLINARI.map((a) => a.value));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_CORTO = 120;

/** Campi obbligatori di testo, nell'ordine in cui compaiono nel modulo. */
const CAMPI_OBBLIGATORI: [keyof UniversitaInput, string][] = [
  ["nome", "il nome"],
  ["cognome", "il cognome"],
  ["email", "l'email"],
  ["universita", "l'università"],
  ["corso_studi", "il corso di studi"],
];

/**
 * Restituisce il primo errore trovato, oppure `null` se va tutto bene.
 * Un solo messaggio per volta: chiedere di correggere sei cose insieme non
 * aiuta nessuno.
 */
export function validateUniversita(input: Partial<UniversitaInput>): string | null {
  for (const [campo, etichetta] of CAMPI_OBBLIGATORI) {
    const v = typeof input[campo] === "string" ? (input[campo] as string).trim() : "";
    if (!v) return `Manca ${etichetta}.`;
    if (v.length > MAX_CORTO) {
      return `Il campo "${etichetta}" e troppo lungo: al massimo ${MAX_CORTO} caratteri.`;
    }
  }

  const email = String(input.email ?? "").trim();
  if (!EMAIL_RE.test(email)) return "L'indirizzo email non sembra valido.";

  if (!input.livello || !LIVELLI.has(String(input.livello))) {
    return "Scegli il livello del tuo percorso di studi.";
  }

  if (!input.area || !AREE.has(String(input.area))) {
    return "Scegli l'area disciplinare.";
  }

  // L'art. 2 lascia l'elenco aperto: se si sceglie "altro" serve sapere quale.
  if (input.area === "altro") {
    const altro = String(input.area_altro ?? "").trim();
    if (!altro) return "Indica la tua area disciplinare.";
    if (altro.length > MAX_CORTO) {
      return `L'area disciplinare e troppo lunga: al massimo ${MAX_CORTO} caratteri.`;
    }
  }

  const interessi = String(input.interessi ?? "").trim();
  if (interessi.length > MAX_INTERESSI) {
    return `Gli interessi di ricerca superano i ${MAX_INTERESSI} caratteri.`;
  }

  if (!input.accetta_bando) return "Per candidarti devi accettare il bando.";
  if (!input.consenso_privacy) return "Per candidarti devi prendere visione dell'informativa.";

  return null;
}

/** Codice della candidatura, mostrato al candidato e usato dallo staff. */
export function generateCodiceUniversita(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `UNI-${code}`;
}
