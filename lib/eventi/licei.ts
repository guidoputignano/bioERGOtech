/**
 * Tipi e validazione dell'adesione di un istituto al percorso "Biotecnologie
 * e Intelligenza Artificiale".
 *
 * Nessuna dipendenza da React o da Supabase: lo stesso modulo gira nel form,
 * per il feedback immediato, e nell'API, dove la validazione è quella che
 * conta davvero.
 */

import { IMPEGNI_ISTITUTO } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

export type AdesioneInput = {
  // Istituto
  istituto_denominazione: string;
  codice_meccanografico: string;
  istituto_comune: string;
  istituto_provincia?: string;
  istituto_email: string;
  istituto_sito?: string;
  dirigente_nome?: string;

  // Docente referente (art. 4)
  referente_nome: string;
  referente_cognome: string;
  referente_email: string;
  referente_telefono: string;
  referente_materia?: string;

  // Numeri, non nomi. In questa fase non tocchiamo dati di studenti.
  studenti_terza?: number;
  studenti_quarta?: number;
  studenti_quinta?: number;
  classi_coinvolte?: string;
  evento_studenti_stimati?: number;
  evento_docenti_stimati?: number;

  note?: string;

  // Impegni dell'art. 4, uno per spunta
  impegno_referente: boolean;
  impegno_promozione: boolean;
  impegno_evento: boolean;
  impegno_consensi: boolean;

  // Dichiarazioni
  dichiarazione_poteri: boolean;
  accetta_bando: boolean;
  consenso_privacy: boolean;
  consenso_marketing?: boolean;

  /** Honeypot anti-spam. Deve restare vuoto. */
  website?: string;
};

export type AdesioneResult = {
  codice: string;
  aggiornata: boolean;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Il codice meccanografico di un istituto italiano è di 10 caratteri
 * alfanumerici (per esempio TAPS01000B). Non lo validiamo oltre la forma:
 * un controllo più stretto rischia di respingere un istituto vero, e la
 * conferma dello staff serve anche a questo.
 */
const MECCANOGRAFICO_RE = /^[A-Z0-9]{6,12}$/i;

export const normalizzaMeccanografico = (v: string): string =>
  v.trim().toUpperCase().replace(/\s+/g, "");

/** Totale degli studenti previsti, usato in validazione e nel pannello. */
export const totaleStudenti = (i: Partial<AdesioneInput>): number =>
  (numero(i.studenti_terza) ?? 0) +
  (numero(i.studenti_quarta) ?? 0) +
  (numero(i.studenti_quinta) ?? 0);

/**
 * Valida l'adesione. Ritorna il primo messaggio d'errore in italiano, o null
 * se è tutto a posto.
 */
export function validateAdesione(input: Partial<AdesioneInput>): string | null {
  if (input.website && input.website.trim() !== "") return "Richiesta non valida.";

  // ── Istituto ──
  if (!testo(input.istituto_denominazione)) return "Indica la denominazione dell'istituto.";
  if (testo(input.istituto_denominazione).length > 200)
    return "La denominazione dell'istituto è troppo lunga.";

  const mecc = normalizzaMeccanografico(testo(input.codice_meccanografico));
  if (!mecc) return "Indica il codice meccanografico dell'istituto.";
  if (!MECCANOGRAFICO_RE.test(mecc))
    return "Il codice meccanografico non sembra valido: sono 10 caratteri fra lettere e numeri, per esempio TAPS01000B.";

  if (!testo(input.istituto_comune)) return "Indica il comune dell'istituto.";
  if (!isEmail(testo(input.istituto_email)))
    return "Inserisci un indirizzo email valido dell'istituto.";

  const sito = testo(input.istituto_sito);
  if (sito && !/^https?:\/\/.+\..+/i.test(sito))
    return "Il sito dell'istituto deve iniziare con http:// o https://";

  // ── Referente (art. 4) ──
  if (!testo(input.referente_nome)) return "Indica il nome del docente referente.";
  if (!testo(input.referente_cognome)) return "Indica il cognome del docente referente.";
  if (!isEmail(testo(input.referente_email)))
    return "Inserisci un indirizzo email valido del docente referente.";
  if (!testo(input.referente_telefono))
    return "Indica un recapito telefonico del docente referente.";

  // ── Numeri ──
  for (const [campo, etichetta] of [
    ["studenti_terza", "delle classi terze"],
    ["studenti_quarta", "delle classi quarte"],
    ["studenti_quinta", "delle classi quinte"],
    ["evento_studenti_stimati", "degli studenti all'evento"],
    ["evento_docenti_stimati", "dei docenti all'evento"],
  ] as [keyof AdesioneInput, string][]) {
    const n = numero(input[campo]);
    if (n !== null && (n < 0 || n > 2000))
      return `Il numero ${etichetta} non è valido.`;
  }

  if (totaleStudenti(input) <= 0)
    return "Indica quanti studenti prevedete di coinvolgere, almeno per un anno di corso.";

  // ── Impegni dell'art. 4 ──
  for (const i of IMPEGNI_ISTITUTO) {
    if (!input[i.campo as keyof AdesioneInput]) {
      return `Per aderire devi accettare l'impegno "${i.titolo}".`;
    }
  }

  // ── Dichiarazioni ──
  if (!input.dichiarazione_poteri)
    return "Devi dichiarare di essere legittimato a trasmettere l'adesione per conto dell'istituto.";
  if (!input.accetta_bando) return "Devi accettare le disposizioni del bando.";
  if (!input.consenso_privacy)
    return "Per aderire devi acconsentire al trattamento dei dati del referente e dell'istituto.";

  return null;
}

/**
 * Codice dell'adesione, che il referente mette in circolare e che gli
 * studenti useranno per iscriversi al percorso. Formato LIC-XXXXXXXX, senza
 * caratteri ambigui: deve reggere la lettura ad alta voce in classe.
 */
export function generateCodiceAdesione(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `LIC-${code}`;
}
