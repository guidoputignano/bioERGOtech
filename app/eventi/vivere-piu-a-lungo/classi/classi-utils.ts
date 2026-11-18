/**
 * La logica del modulo delle scuole e della pagina della classe, separata
 * dal markup: validazione (le stesse regole della rotta, da
 * lib/eventi/classi.ts), lettura delle risposte delle rotte, posti per le
 * classi e reinvio dell'email.
 *
 * Senza React e senza Supabase: lo importano componenti client e pagine
 * server.
 */

import { refusoEmail } from "@/lib/eventi/email-refusi";
import {
  MAX_PERSONE_CLASSE,
  validaPrenotazioneClasse,
  type CampoClasse,
  type DatiPrenotazioneClasse,
} from "@/lib/eventi/classi";
import type { SessionStatus } from "@/lib/eventi/registration";
import { SESSIONS } from "../content";

/* ── Rotte ──────────────────────────────────────────────────────────── */

export const ROTTA_PRENOTA = "/api/eventi/classi";
export const ROTTA_POSTI = "/api/eventi/classi/posti";
export const ROTTA_SCUOLA = "/api/eventi/classi/scuola";
export const ROTTA_GESTISCI = "/api/eventi/classi/gestisci";

export const MESSAGGIO_RETE = "Non riusciamo a raggiungere il sito. Controlla la connessione e riprova.";

export const MESSAGGIO_TEMPO =
  "La risposta sta tardando. Riprova: se la prenotazione era già arrivata non viene duplicata, e il codice della classe resta lo stesso.";

/* ── Campi e validazione ────────────────────────────────────────────── */

/** I campi del modulo, nell'ordine in cui compaiono: decide il primo errore da raggiungere. */
export const CAMPI_CLASSE: readonly CampoClasse[] = [
  "giornate",
  "istituto",
  "comune",
  "classe",
  "studenti",
  "accompagnatori",
  "docente_nome",
  "docente_cognome",
  "docente_email",
  "docente_telefono",
  "note",
  "consenso_privacy",
];

export const isCampoClasse = (v: unknown): v is CampoClasse =>
  typeof v === "string" && (CAMPI_CLASSE as readonly string[]).includes(v);

export type ErroriClasse = Partial<Record<CampoClasse, string>>;

/**
 * Un valore valido per ogni campo. validaPrenotazioneClasse si ferma al primo
 * errore; per mostrarli tutti insieme, come nel modulo delle persone, si
 * rimette a posto il campo sbagliato e si chiede di nuovo. Le regole restano
 * una sola, quella della rotta.
 */
const VALIDO: Record<CampoClasse, Partial<DatiPrenotazioneClasse>> = {
  giornate: { giornate: [SESSIONS[0]?.slug ?? "giorno-1"] },
  istituto: { istituto: "Istituto" },
  comune: { comune: "" },
  classe: { classe: "1A" },
  docente_nome: { docente_nome: "Nome" },
  docente_cognome: { docente_cognome: "Cognome" },
  docente_email: { docente_email: "nome@esempio.it" },
  docente_telefono: { docente_telefono: "099 000000" },
  studenti: { studenti: 1 },
  accompagnatori: { accompagnatori: 1 },
  note: { note: "" },
  consenso_privacy: { consenso_privacy: true },
};

/** Un modulo tutto valido: la base per controllare solo alcuni campi. */
export const DATI_VALIDI: DatiPrenotazioneClasse = {
  istituto: "Istituto",
  comune: "",
  classe: "1A",
  docente_nome: "Nome",
  docente_cognome: "Cognome",
  docente_email: "nome@esempio.it",
  docente_telefono: "099 000000",
  studenti: 1,
  accompagnatori: 1,
  note: "",
  giornate: [SESSIONS[0]?.slug ?? "giorno-1"],
  consenso_privacy: true,
};

/** Il numero scritto in un campo: solo cifre, altrimenti NaN (e la validazione lo segnala). */
export function numeroDa(v: string): number {
  const t = v.trim();
  return /^\d{1,3}$/.test(t) ? Number(t) : Number.NaN;
}

/**
 * Tutti gli errori del modulo, campo per campo, con le parole della rotta. In
 * più un refuso nel dominio dell'email: impossibile blocca sempre, sospetto
 * finché non si sceglie "Usa…" o "È giusto così".
 */
export function erroriClasse(d: DatiPrenotazioneClasse, emailConfermata: boolean): ErroriClasse {
  const giornateValide = SESSIONS.map((s) => s.slug as string);
  const e: ErroriClasse = {};
  let dati: DatiPrenotazioneClasse = { ...d };
  for (let i = 0; i <= CAMPI_CLASSE.length; i++) {
    const errore = validaPrenotazioneClasse(dati, giornateValide);
    if (!errore) break;
    // Senza campo, o con un campo già visto: non si va avanti all'infinito.
    if (!errore.campo || e[errore.campo]) break;
    e[errore.campo] = errore.error;
    dati = { ...dati, ...VALIDO[errore.campo] };
  }
  if (!e.docente_email) {
    // Le stesse parole dell'avviso accanto al campo: "forse intendevi".
    const r = refusoEmail(d.docente_email.trim());
    if (r?.impossibile) {
      e.docente_email = r.suggerimento
        ? `L'indirizzo email finisce con «${r.dominio}», che non esiste: forse intendevi ${r.suggerimento}?`
        : `L'indirizzo email finisce con «${r.dominio}», che non esiste.`;
    } else if (r && !emailConfermata) {
      e.docente_email = `Controlla l'indirizzo email: forse intendevi ${r.suggerimento}?`;
    }
  }
  return e;
}

/** Solo gli errori dei due numeri, per il riquadro "Quante persone" della pagina della classe. */
export function erroriNumeri(studenti: number, accompagnatori: number): ErroriClasse {
  const e = erroriClasse({ ...DATI_VALIDI, studenti, accompagnatori }, true);
  return { studenti: e.studenti, accompagnatori: e.accompagnatori };
}

/* ── Parole ─────────────────────────────────────────────────────────── */

/** "classe 4B", anche se la classe è stata scritta "Classe 4B". Con maiuscola: "Classe 4B". */
export function laClasse(classe: string, maiuscola = false): string {
  const c = classe.trim();
  const frase = /^classe\b/i.test(c) ? c.replace(/^classe/i, "classe") : `classe ${c}`;
  return maiuscola ? frase.charAt(0).toUpperCase() + frase.slice(1) : frase;
}

export const persone = (n: number): string => (n === 1 ? "1 persona" : `${n} persone`);

export const maiuscola = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/* ── Posti per le classi ────────────────────────────────────────────── */

/** Una riga di GET /api/eventi/classi/posti, solo quello che serve al modulo. */
export type PostiClasse = {
  slug: string;
  capienza_max: number;
  quota_gruppi: number | null;
  /** Posti che una classe può ancora prenotare (capienza e quota delle scuole). */
  rimanenti_classi: number;
};

/** Legge la risposta di /api/eventi/classi/posti senza fidarsi della forma. */
export function leggiPostiClassi(data: unknown): Record<string, PostiClasse> {
  const o = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const righe: unknown = Array.isArray(data) ? data : (o?.posti ?? o?.seats ?? null);
  const mappa: Record<string, PostiClasse> = {};
  if (!Array.isArray(righe)) return mappa;
  const n = (v: unknown) => (typeof v === "number" ? v : v === null || v === "" ? Number.NaN : Number(v));
  for (const r of righe) {
    if (!r || typeof r !== "object") continue;
    const { slug, capienza_max, quota_gruppi, rimanenti_classi } = r as Record<string, unknown>;
    if (typeof slug !== "string" || !Number.isFinite(n(rimanenti_classi))) continue;
    mappa[slug] = {
      slug,
      capienza_max: Number.isFinite(n(capienza_max)) ? n(capienza_max) : 0,
      quota_gruppi: Number.isFinite(n(quota_gruppi)) ? n(quota_gruppi) : null,
      rimanenti_classi: Math.max(0, n(rimanenti_classi)),
    };
  }
  return mappa;
}

export type StatoPostiClasse = {
  tipo: "disponibili" | "ultimi" | "attesa";
  testo: string;
  icona: string;
};

/**
 * Che cosa dire dei posti per le classi in una giornata. Una classe entra
 * solo se ci sta tutta: se i posti rimasti sono meno delle persone indicate,
 * lo si dice prima dell'invio. Il numero compare solo quando i posti sono
 * pochi. Decide comunque la rotta.
 */
export function statoPostiClasse(p: PostiClasse | undefined, personeClasse: number): StatoPostiClasse | null {
  if (!p) return null;
  const r = p.rimanenti_classi;
  if (r <= 0) {
    return {
      tipo: "attesa",
      testo: "Posti per le classi esauriti: puoi prenotare in lista d'attesa",
      icona: "fa-user-clock",
    };
  }
  if (personeClasse > 0 && personeClasse > r) {
    return {
      tipo: "attesa",
      testo: `Restano ${r === 1 ? "1 posto" : `${r} posti`} per le classi: con ${persone(personeClasse)} la classe va in lista d'attesa`,
      icona: "fa-user-clock",
    };
  }
  const base = p.quota_gruppi ?? p.capienza_max;
  const soglia = Math.max(MAX_PERSONE_CLASSE * 2, Math.ceil(base * 0.1));
  if (r <= soglia) {
    return { tipo: "ultimi", testo: `Ultimi ${r} posti per le classi`, icona: "fa-hourglass-half" };
  }
  return { tipo: "disponibili", testo: "Posti disponibili per le classi", icona: "fa-circle-check" };
}

/* ── Risposta della prenotazione ────────────────────────────────────── */

export type GiornataEsitoClasse = { slug: string; status: SessionStatus };

export type EsitoClasse = {
  /** Null nella risposta all'honeypot e quando la classe era già prenotata (giaPrenotata). */
  codice: string | null;
  giornate: GiornataEsitoClasse[];
  /** Solo un false esplicito dice che l'email non è partita. */
  emailInviata: boolean;
  /**
   * La stessa classe (stesso docente, scuola e classe) era già prenotata: le
   * giornate sono state aggiunte, ma codice e giornate arrivano solo per
   * email, all'indirizzo della prenotazione.
   */
  giaPrenotata: boolean;
};

export type RispostaClasse = { ok: true; esito: EsitoClasse } | { ok: false; errore: string; campo?: CampoClasse };

function messaggioPerStato(status: number): string {
  switch (status) {
    case 400:
      return "Alcuni dati non sono validi. Controlla il modulo e riprova.";
    case 403:
    case 410:
      return "Le prenotazioni sono chiuse.";
    case 429:
      return "Troppi tentativi in poco tempo. Aspetta qualche minuto e riprova.";
    case 503:
      return "Le prenotazioni non sono disponibili in questo momento. Riprova tra qualche minuto.";
    default:
      return "Non siamo riusciti a completare la prenotazione. Riprova tra qualche istante. Se il problema continua, scrivici a info@bioergotech.org.";
  }
}

const isGiornataEsito = (v: unknown): v is GiornataEsitoClasse =>
  Boolean(v) &&
  typeof v === "object" &&
  typeof (v as GiornataEsitoClasse).slug === "string" &&
  ((v as GiornataEsitoClasse).status === "confermato" || (v as GiornataEsitoClasse).status === "lista_attesa");

/**
 * La risposta di POST /api/eventi/classi, letta senza fidarsi della forma:
 * una pagina d'errore HTML (un timeout del server) diventa un messaggio
 * chiaro, mai un'eccezione.
 */
export async function leggiRispostaClasse(res: Response): Promise<RispostaClasse> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  if (res.ok && o.success === true) {
    const giaPrenotata = o.giaPrenotata === true;
    const giornate = Array.isArray(o.giornate)
      ? o.giornate.filter(isGiornataEsito).map((g) => ({ slug: g.slug, status: g.status }))
      : [];
    // Per una classe già prenotata non si mostra nulla della prenotazione,
    // anche se la risposta lo contenesse.
    const codice = !giaPrenotata && typeof o.codice === "string" && o.codice.trim() ? o.codice.trim() : null;
    return {
      ok: true,
      esito: {
        codice,
        giornate: giaPrenotata ? [] : giornate,
        emailInviata: o.emailInviata !== false,
        giaPrenotata,
      },
    };
  }

  const errore = typeof o.error === "string" && o.error.trim() ? o.error.trim() : messaggioPerStato(res.status);
  return { ok: false, errore, campo: isCampoClasse(o.campo) ? o.campo : undefined };
}

/* ── Reinvio dell'email della classe ────────────────────────────────── */

function messaggioReinvio(status: number): string {
  switch (status) {
    case 404:
      return "Non troviamo questa prenotazione. Apri il link dall'email; se il problema continua, scrivi a info@bioergotech.org.";
    case 429:
      return "Ti abbiamo appena rimandato l'email. Controlla la posta, anche nella cartella spam; se non arriva, riprova tra un paio di minuti.";
    case 503:
      return "L'invio delle email non è disponibile in questo momento. Riprova più tardi o scrivi a info@bioergotech.org.";
    default:
      return "Non siamo riusciti a inviare l'email. Riprova tra qualche minuto o scrivi a info@bioergotech.org.";
  }
}

/**
 * Chiede di rimandare l'email della classe all'indirizzo della prenotazione
 * (azione "reinvia", al massimo una volta ogni due minuti per codice). Non
 * lancia mai: torna l'esito e, se non è andata, il messaggio da mostrare.
 */
export async function chiediReinvioClasse(codice: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const controllo = new AbortController();
  const timer = window.setTimeout(() => controllo.abort(), 25_000);
  try {
    const res = await fetch(ROTTA_GESTISCI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codice, azione: "reinvia" }),
      signal: controllo.signal,
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    if (res.ok && o.success === true) return { ok: true };
    const errore = typeof o.error === "string" && o.error.trim() ? o.error.trim() : messaggioReinvio(res.status);
    return { ok: false, errore };
  } catch {
    return {
      ok: false,
      errore: controllo.signal.aborted
        ? "La risposta sta tardando. Riprova tra qualche minuto, oppure apri la pagina della classe e salvala."
        : MESSAGGIO_RETE,
    };
  } finally {
    window.clearTimeout(timer);
  }
}
