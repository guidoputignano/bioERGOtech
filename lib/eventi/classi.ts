/**
 * Le prenotazioni per classe dell'evento "Vivere più a lungo": i tipi, i
 * limiti e la validazione, condivisi dal modulo delle scuole (browser), dalle
 * rotte, dal pannello e dall'ingresso.
 *
 * Una prenotazione è una classe di una scuola, prenotata da un docente, con
 * un codice (VPC-XXXXXXXX) e un QR per tutta la classe. Nessun dato degli
 * studenti: solo quanti sono. Per ogni giornata la classe è tutta confermata
 * o tutta in lista d'attesa (supabase/migrations/20261231400000_event_prenotazioni_classi.sql).
 *
 * Niente codice solo server qui: lo importa anche il browser.
 */

import { nomeDiPersonaValido, ERRORE_CARATTERI_NOME, ERRORE_CARATTERI_COGNOME } from "@/lib/eventi/registration";
import type { SessionStatus } from "@/lib/eventi/registration";

/** Persone per classe, docenti compresi (vincolo anche nel database). */
export const MAX_PERSONE_CLASSE = 40;
export const MAX_ACCOMPAGNATORI = 10;
export const MIN_ACCOMPAGNATORI = 1;

/** Il codice di una classe: come quello del biglietto, con C al posto di L. */
export const CODICE_CLASSE_RE = /^VPC-[A-Z0-9]{8}$/;
export const isCodiceClasse = (v: string): boolean => CODICE_CLASSE_RE.test(v);

/** La pagina pubblica per prenotare una classe. */
export const PAGINA_CLASSI = "/eventi/vivere-piu-a-lungo/classi";
/** La pagina della prenotazione di una classe (biglietto di gruppo e gestione). */
export const urlClasse = (codice: string): string => `/eventi/vivere-piu-a-lungo/classe/${encodeURIComponent(codice)}`;

/** Una giornata di una classe: la riga di event_group_booking_sessions. */
export type GiornataClasse = {
  /** L'id della riga ponte: serve all'ingresso e al pannello. */
  id: string;
  slug: string;
  status: SessionStatus;
  /** Dove si siede la classe, se lo staff l'ha deciso ("Tribuna B"). */
  settore: string | null;
  /** Quante persone della classe sono entrate (null: nessuna registrata). */
  presenti: number | null;
  checkin_ts: string | null;
  created_at: string | null;
};

export type PrenotazioneClasse = {
  id: string;
  codice: string;
  istituto: string;
  comune: string | null;
  classe: string;
  docente_nome: string;
  docente_cognome: string;
  docente_email: string;
  docente_telefono: string;
  studenti: number;
  accompagnatori: number;
  /** studenti + accompagnatori: i posti che la classe occupa. */
  posti: number;
  note: string | null;
  licei_adesione_id: string | null;
  created_at: string;
  updated_at: string;
  /** Nell'ordine dell'evento. */
  giornate: GiornataClasse[];
};

/** I posti per le classi di una giornata (event_group_seats). */
export type PostiClassi = {
  slug: string;
  capienza_max: number;
  /** I posti che le classi possono occupare; null: nessun limite oltre la capienza. */
  quota_gruppi: number | null;
  posti_classi: number;
  classi_confermate: number;
  classi_in_attesa: number;
  /** Posti liberi nella giornata, per tutti. */
  rimanenti: number;
  /** Posti ancora prenotabili da una classe: il minimo fra capienza e quota. */
  rimanenti_classi: number;
};

/** I campi del modulo delle scuole, per gli errori accanto al campo. */
export type CampoClasse =
  | "istituto"
  | "comune"
  | "classe"
  | "docente_nome"
  | "docente_cognome"
  | "docente_email"
  | "docente_telefono"
  | "studenti"
  | "accompagnatori"
  | "giornate"
  | "note"
  | "consenso_privacy";

export type ErroreClasse = { error: string; campo?: CampoClasse };

export type DatiPrenotazioneClasse = {
  istituto: string;
  comune: string;
  classe: string;
  docente_nome: string;
  docente_cognome: string;
  docente_email: string;
  docente_telefono: string;
  studenti: number;
  accompagnatori: number;
  note: string;
  giornate: string[];
  consenso_privacy: boolean;
};

export const LUNGHEZZE_CLASSE = {
  istituto: 200,
  comune: 100,
  classe: 60,
  docente_nome: 80,
  docente_cognome: 80,
  docente_email: 254,
  docente_telefono: 40,
  note: 1000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO_RE = /^\+?[\d\s().\/-]{5,40}$/;

/**
 * La validazione della prenotazione, uguale nel browser e nella rotta.
 * `giornateValide` sono gli slug del sito (SESSIONS); la rotta controlla in
 * più che esistano nel database e che non siano concluse.
 */
export function validaPrenotazioneClasse(
  d: DatiPrenotazioneClasse,
  giornateValide: readonly string[],
): ErroreClasse | null {
  const t = (v: string) => (v ?? "").trim();

  if (!Array.isArray(d.giornate) || d.giornate.length === 0) {
    return { error: "Scegli almeno una giornata.", campo: "giornate" };
  }
  if (d.giornate.some((g) => !giornateValide.includes(g))) {
    return { error: "Una delle giornate scelte non esiste.", campo: "giornate" };
  }

  const istituto = t(d.istituto);
  if (istituto.length < 2) return { error: "Scrivi il nome della scuola.", campo: "istituto" };
  if (istituto.length > LUNGHEZZE_CLASSE.istituto) return { error: "Il nome della scuola è troppo lungo.", campo: "istituto" };
  if (t(d.comune).length > LUNGHEZZE_CLASSE.comune) return { error: "Il nome del comune è troppo lungo.", campo: "comune" };

  const classe = t(d.classe);
  if (!classe) return { error: "Scrivi la classe, per esempio 4B.", campo: "classe" };
  if (classe.length > LUNGHEZZE_CLASSE.classe) return { error: "La classe è troppo lunga: bastano anno e sezione.", campo: "classe" };

  const nome = t(d.docente_nome);
  if (!nome) return { error: "Scrivi il tuo nome.", campo: "docente_nome" };
  if (nome.length > LUNGHEZZE_CLASSE.docente_nome) return { error: "Il nome è troppo lungo.", campo: "docente_nome" };
  if (!nomeDiPersonaValido(nome)) return { error: ERRORE_CARATTERI_NOME, campo: "docente_nome" };

  const cognome = t(d.docente_cognome);
  if (!cognome) return { error: "Scrivi il tuo cognome.", campo: "docente_cognome" };
  if (cognome.length > LUNGHEZZE_CLASSE.docente_cognome) return { error: "Il cognome è troppo lungo.", campo: "docente_cognome" };
  if (!nomeDiPersonaValido(cognome)) return { error: ERRORE_CARATTERI_COGNOME, campo: "docente_cognome" };

  const email = t(d.docente_email);
  if (!email || email.length > LUNGHEZZE_CLASSE.docente_email || !EMAIL_RE.test(email)) {
    return { error: "L'indirizzo email non è completo: deve avere la forma nome@esempio.it.", campo: "docente_email" };
  }

  const telefono = t(d.docente_telefono);
  if (!TELEFONO_RE.test(telefono) || telefono.replace(/\D/g, "").length < 6) {
    return {
      error: "Scrivi un numero di telefono a cui raggiungerti il giorno dell'evento.",
      campo: "docente_telefono",
    };
  }

  const studenti = Number(d.studenti);
  if (!Number.isInteger(studenti) || studenti < 1) {
    return { error: "Indica quanti studenti vengono.", campo: "studenti" };
  }
  const accompagnatori = Number(d.accompagnatori);
  if (!Number.isInteger(accompagnatori) || accompagnatori < MIN_ACCOMPAGNATORI) {
    return { error: "Indica quanti docenti accompagnano la classe, te compreso.", campo: "accompagnatori" };
  }
  if (accompagnatori > MAX_ACCOMPAGNATORI) {
    return { error: `Al massimo ${MAX_ACCOMPAGNATORI} docenti per classe.`, campo: "accompagnatori" };
  }
  if (studenti + accompagnatori > MAX_PERSONE_CLASSE) {
    return {
      error: `Una prenotazione è per al massimo ${MAX_PERSONE_CLASSE} persone, docenti compresi. Per più classi fai una prenotazione per ciascuna.`,
      campo: "studenti",
    };
  }

  if (t(d.note).length > LUNGHEZZE_CLASSE.note) return { error: "La nota è troppo lunga.", campo: "note" };
  if (d.consenso_privacy !== true) {
    return { error: "Per prenotare serve la presa visione dell'informativa privacy.", campo: "consenso_privacy" };
  }
  return null;
}

/** Un codice di classe nuovo, con il generatore crittografico. */
export function generaCodiceClasse(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const casuali = new Uint32Array(8);
  const cripto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cripto && typeof cripto.getRandomValues === "function") {
    cripto.getRandomValues(casuali);
  } else {
    for (let i = 0; i < casuali.length; i++) casuali[i] = Math.floor(Math.random() * 0x100000000);
  }
  let c = "";
  for (let i = 0; i < 8; i++) c += alfabeto[casuali[i] % alfabeto.length];
  return `VPC-${c}`;
}

/** "4B, Liceo Archita (Taranto)". */
export function nomeClasse(p: Pick<PrenotazioneClasse, "classe" | "istituto" | "comune">): string {
  return `${p.classe}, ${p.istituto}${p.comune ? ` (${p.comune})` : ""}`;
}

/** "28 studenti e 2 docenti". */
export function descriviPersone(studenti: number, accompagnatori: number): string {
  const s = studenti === 1 ? "1 studente" : `${studenti} studenti`;
  const d = accompagnatori === 1 ? "1 docente" : `${accompagnatori} docenti`;
  return `${s} e ${d}`;
}
