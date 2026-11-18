/**
 * Il pannello iscrizioni dell'evento: tipi, filtri e formati condivisi.
 *
 * Senza React, senza rete e senza la service role: lo usano sia le schede
 * del pannello (lato client) sia le rotte /api/eventi/admin/* e la pagina di
 * stampa (lato server). Il filtro è uno solo, così quello che lo staff vede
 * nell'elenco è esattamente quello che scarica e che stampa.
 */

import { CATEGORIE, EVENT_SLUG, SESSIONS, sessionBySlug } from "../content";
import type { GiornataClasse, PrenotazioneClasse } from "@/lib/eventi/classi";

/* ── Tipi ─────────────────────────────────────────────────────────────── */

export type StatoCheckin = "registrato" | "presente" | "assente";
export type StatoGiornata = "confermato" | "lista_attesa";

/** Una giornata di un iscritto, come la vede il pannello. */
export type GiornataRiga = {
  /** L'id della riga ponte (event_registration_sessions). */
  id: string;
  slug: string;
  status: StatoGiornata;
  stato_checkin: StatoCheckin;
  checkin_ts: string | null;
  created_at: string | null;
  /** La posizione in lista d'attesa per quella giornata (1 = la prima). Null se confermato. */
  posizione_attesa: number | null;
};

/** Un iscritto con tutto quello che serve a elenco, export e stampa. */
export type RigaIscritto = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  categoria: string;
  organizzazione: string | null;
  classe: string | null;
  note: string | null;
  startup_name: string | null;
  startup_url: string | null;
  codice: string;
  created_at: string;
  consenso_marketing: boolean;
  consenso_marketing_ts: string | null;
  /** Nell'ordine dell'evento; le sessioni che il sito non conosce in fondo. */
  giornate: GiornataRiga[];
};

/** Una giornata di una classe, come la vede il pannello. */
export type GiornataRigaClasse = GiornataClasse & {
  /** La posizione fra le classi in lista d'attesa per quella giornata (1 = la prima). Null se confermata. */
  posizione_attesa: number | null;
};

/** Una prenotazione di classe con tutto quello che serve a elenco, export e stampa. */
export type RigaClasse = Omit<PrenotazioneClasse, "giornate"> & { giornate: GiornataRigaClasse[] };

/**
 * Le classi di una giornata: i posti vengono da event_group_seats (la regola
 * del database), gli ingressi dalle righe delle classi.
 */
export type GiornataClassi = {
  slug: string;
  etichetta: string;
  giornoLabel: string;
  luogo: string;
  orario: string;
  /** False se la riga di event_sessions manca. */
  nelDatabase: boolean;
  capienza: number | null;
  /** I posti che le classi possono occupare; null: nessun limite oltre la capienza. */
  quota: number | null;
  /** I posti delle classi confermate. */
  postiClassi: number;
  classiConfermate: number;
  classiAttesa: number;
  /** Le persone delle classi in lista d'attesa. */
  postiAttesa: number;
  /** La classe più piccola in lista d'attesa (persone), o null se non aspetta nessuna. */
  minimoAttesa: number | null;
  /** Posti liberi nella giornata, per tutti. */
  rimanenti: number | null;
  /** Posti ancora prenotabili da una classe: il minimo fra capienza e quota. */
  rimanentiClassi: number | null;
  /** Classi con almeno un ingresso registrato. */
  classiEntrate: number;
  /** Le persone delle classi entrate. */
  presenti: number;
};

/** Una giornata dell'evento con i suoi numeri, letti dal database. */
export type InfoGiornata = {
  slug: string;
  etichetta: string;
  giornoLabel: string;
  luogo: string;
  orario: string;
  /** False se la riga di event_sessions manca: i numeri allora non significano niente. */
  nelDatabase: boolean;
  /** La capienza del database (mai quella di content.ts). Null se la giornata non c'è. */
  capienza: number | null;
  /** I posti occupati: le persone confermate più i posti delle classi confermate. */
  confermati: number;
  /** Le sole persone iscritte una per una, confermate. */
  persone: number;
  /** Le persone iscritte una per una in lista d'attesa. */
  attesa: number;
  /** Tutti gli ingressi: le persone più le persone delle classi. */
  entrati: number;
  /** Gli ingressi delle sole persone iscritte una per una. */
  entratiPersone: number;
  assenti: number;
  /** Posti liberi: capienza meno posti occupati, mai sotto zero. Null se la giornata non c'è. */
  liberi: number | null;
  /** Posti occupati oltre la capienza (conferme forzate dallo staff). */
  oltre: number;
  /** Le classi della giornata. Null se le prenotazioni per classe non sono nel database. */
  classi: GiornataClassi | null;
};

/** Le classi nel riepilogo. */
export type RiepilogoClassi = {
  /** False: le tabelle delle classi non sono nel database. */
  disponibili: boolean;
  prenotazioni: number;
  /** Le persone di tutte le prenotazioni (studenti e docenti). */
  persone: number;
  /** Scuole diverse, a meno di maiuscole e spazi. */
  scuole: number;
  /** Prenotazioni arrivate dal link del percorso dei licei. */
  dalPercorso: number;
};

/** Una sessione del database che il sito non usa più, con quante persone ci sono sopra. */
export type SessioneSconosciuta = { slug: string; persone: number };

export type Riepilogo = {
  generato_at: string;
  /** Le giornate del sito che mancano in event_sessions. Deve essere vuoto. */
  mancanti: string[];
  sconosciute: SessioneSconosciuta[];
  /** Iscrizioni senza nessuna giornata del sito. Deve essere zero. */
  senzaGiornata: number;
  giornate: InfoGiornata[];
  totali: { persone: number; entrambe: number; marketing: number };
  nuove: {
    oggi: number;
    settimana: number;
    /** Gli ultimi 21 giorni (fuso di Roma), dal più vecchio a oggi. */
    serie: { giorno: string; etichetta: string; n: number }[];
  };
  categorie: {
    value: string;
    label: string;
    persone: number;
    perGiornata: Record<string, { totale: number; attesa: number }>;
  }[];
  organizzazioni: { nome: string; persone: number; perGiornata: Record<string, number> }[];
  /** Quante organizzazioni o scuole diverse in tutto. */
  organizzazioniDiverse: number;
  classi: RiepilogoClassi;
};

/** La risposta di GET /api/eventi/admin/classi. */
export type RispostaClassi = {
  /** False: le tabelle delle classi non sono nel database (il file non è stato eseguito). */
  disponibili: boolean;
  classi: RigaClasse[];
  giornate: GiornataClassi[];
  generato_at: string;
};

/** Il file SQL che crea le prenotazioni per classe, citato negli allarmi. */
export const FILE_SQL_CLASSI = "supabase/migrations/20261231400000_event_prenotazioni_classi.sql";

/** La risposta di GET /api/eventi/admin/registrations. */
export type RispostaIscritti = {
  iscritti: RigaIscritto[];
  /** Quante iscrizioni ci sono in tutto, prima dei filtri. */
  totale: number;
  giornate: InfoGiornata[];
  mancanti: string[];
  generato_at: string;
};

/* ── Schede del pannello ──────────────────────────────────────────────── */

/** `breve` è l'etichetta sul telefono, dove le cinque schede stanno in una riga. */
export const SCHEDE = [
  { id: "riepilogo", label: "Riepilogo", breve: "Riepilogo", icona: "fa-chart-simple" },
  { id: "iscritti", label: "Iscritti", breve: "Iscritti", icona: "fa-users" },
  { id: "classi", label: "Classi", breve: "Classi", icona: "fa-school" },
  { id: "ingresso", label: "Ingresso", breve: "Ingresso", icona: "fa-qrcode" },
  { id: "comunicazioni", label: "Comunicazioni", breve: "Email", icona: "fa-envelope" },
] as const;

export type SchedaId = (typeof SCHEDE)[number]["id"];

export const schedaValida = (v: string | null | undefined): SchedaId =>
  (SCHEDE.find((s) => s.id === v)?.id ?? "riepilogo") as SchedaId;

export const PERCORSO_PANNELLO = `/eventi/${EVENT_SLUG}/admin`;
export const PERCORSO_STAMPA = `/eventi/${EVENT_SLUG}/admin/stampa`;
export const PERCORSO_BIGLIETTO = `/eventi/${EVENT_SLUG}/biglietto`;

/** Il file SQL che crea le giornate mancanti, citato negli allarmi. */
export const FILE_SQL_GIORNATE = "supabase/migrations/20261231300000_event_giorno1_ripristino.sql";

/* ── Filtri ───────────────────────────────────────────────────────────── */

export type FiltroStato = "" | "confermato" | "attesa" | "presente" | "senza";

export type Filtri = {
  /** Testo libero: nome, cognome, email, codice, organizzazione, telefono. */
  q: string;
  /** Lo slug di una giornata, o vuoto per tutte. */
  giornata: string;
  stato: FiltroStato;
  /** Il value di una categoria, o vuoto per tutte. */
  categoria: string;
};

export const FILTRI_VUOTI: Filtri = { q: "", giornata: "", stato: "", categoria: "" };

export const STATI_FILTRO: { value: FiltroStato; label: string }[] = [
  { value: "", label: "Tutti gli stati" },
  { value: "confermato", label: "Confermato" },
  { value: "attesa", label: "Lista d'attesa" },
  { value: "presente", label: "Presente" },
  { value: "senza", label: "Senza giornata" },
];

type Parametri = URLSearchParams | Record<string, string | string[] | undefined>;

function leggi(p: Parametri, chiave: string): string {
  if (p instanceof URLSearchParams) return p.get(chiave) ?? "";
  const v = p[chiave];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * I filtri da una query string, con i valori ripuliti: una giornata o una
 * categoria che non esistono diventano "tutte", non un elenco vuoto.
 * `session` è il nome vecchio del filtro giornata, accettato ancora.
 */
export function leggiFiltri(p: Parametri): Filtri {
  const giornata = leggi(p, "giornata") || leggi(p, "session");
  const stato = leggi(p, "stato");
  const categoria = leggi(p, "categoria");
  return {
    q: leggi(p, "q").slice(0, 120),
    giornata: sessionBySlug(giornata) ? giornata : "",
    stato: (STATI_FILTRO.some((s) => s.value === stato) ? stato : "") as FiltroStato,
    categoria: CATEGORIE.some((c) => c.value === categoria) ? categoria : "",
  };
}

export const filtriAttivi = (f: Filtri): boolean => Boolean(f.q.trim() || f.giornata || f.stato || f.categoria);

/**
 * Minuscole e senza accenti: "Nicolò" si trova anche scrivendo "nicolo".
 * Gli apostrofi tipografici (’ di iPhone, ‘, ʼ, `, ´) diventano quello
 * dritto: "D’Amico" si trova anche scrivendo "d'amico", e viceversa.
 */
export function normalizza(v: string | null | undefined): string {
  return (v ?? "")
    .replace(/[‘’ʼ`´]/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const soloCifre = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** Le giornate del sito che una persona ha (le sessioni sconosciute non contano). */
export const giornateValide = (r: RigaIscritto): GiornataRiga[] =>
  r.giornate.filter((g) => Boolean(sessionBySlug(g.slug)));

function corrispondeTesto(r: RigaIscritto, q: string): boolean {
  const ago = normalizza(q);
  if (!ago) return true;
  const pagliaio = [
    `${r.nome} ${r.cognome}`,
    `${r.cognome} ${r.nome}`,
    r.email,
    r.codice,
    r.organizzazione,
    r.startup_name,
    r.telefono,
  ]
    .map(normalizza)
    .join(" | ");
  if (pagliaio.includes(ago)) return true;
  // Il telefono si scrive in mille modi: "333 12 34", "+39 3331234". Con
  // almeno quattro cifre si confrontano solo le cifre.
  const cifre = soloCifre(q);
  if (cifre.length >= 4 && cifre.length === q.replace(/[\s+().-]/g, "").length) {
    return soloCifre(r.telefono).includes(cifre);
  }
  return false;
}

function corrispondeStato(r: RigaIscritto, f: Filtri): boolean {
  if (!f.stato) return true;
  const valide = giornateValide(r);
  if (f.stato === "senza") return valide.length === 0;
  const considerate = f.giornata ? valide.filter((g) => g.slug === f.giornata) : valide;
  if (f.stato === "confermato") return considerate.some((g) => g.status === "confermato");
  if (f.stato === "attesa") return considerate.some((g) => g.status === "lista_attesa");
  if (f.stato === "presente") return considerate.some((g) => g.stato_checkin === "presente");
  return true;
}

/**
 * Il filtro unico di elenco, export e stampa. "Senza giornata" ignora il
 * filtro per giornata: chi non ha giornate non ne ha nessuna.
 */
export function filtraIscritti(righe: readonly RigaIscritto[], f: Filtri): RigaIscritto[] {
  return righe.filter((r) => {
    if (f.categoria && r.categoria !== f.categoria) return false;
    if (f.giornata && f.stato !== "senza" && !r.giornate.some((g) => g.slug === f.giornata)) return false;
    if (!corrispondeStato(r, f)) return false;
    return corrispondeTesto(r, f.q);
  });
}

/** Cognome, poi nome, come in un registro: senza badare a maiuscole e accenti. */
export function confrontaPerCognome(a: RigaIscritto, b: RigaIscritto): number {
  const opz: Intl.CollatorOptions = { sensitivity: "base" };
  return (
    a.cognome.trim().localeCompare(b.cognome.trim(), "it", opz) ||
    a.nome.trim().localeCompare(b.nome.trim(), "it", opz) ||
    a.codice.localeCompare(b.codice)
  );
}

/** I più recenti in cima. */
export function confrontaPerData(a: RigaIscritto, b: RigaIscritto): number {
  return b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id);
}

/* ── Filtri delle classi ──────────────────────────────────────────────── */

export type FiltroStatoClasse = "" | "confermato" | "attesa" | "entrata" | "senza_settore";

export type FiltriClassi = {
  /** Testo libero: scuola, comune, classe, docente, email, telefono, codice. */
  q: string;
  giornata: string;
  stato: FiltroStatoClasse;
};

export const FILTRI_CLASSI_VUOTI: FiltriClassi = { q: "", giornata: "", stato: "" };

export const STATI_FILTRO_CLASSI: { value: FiltroStatoClasse; label: string }[] = [
  { value: "", label: "Tutti gli stati" },
  { value: "confermato", label: "Confermata" },
  { value: "attesa", label: "Lista d'attesa" },
  { value: "entrata", label: "Entrata" },
  { value: "senza_settore", label: "Confermata, senza settore" },
];

/** I filtri delle classi da una query string, con i valori ripuliti. */
export function leggiFiltriClassi(p: Parametri): FiltriClassi {
  const giornata = leggi(p, "giornata");
  const stato = leggi(p, "stato");
  return {
    q: leggi(p, "q").slice(0, 120),
    giornata: sessionBySlug(giornata) ? giornata : "",
    stato: (STATI_FILTRO_CLASSI.some((s) => s.value === stato) ? stato : "") as FiltroStatoClasse,
  };
}

export const filtriClassiAttivi = (f: FiltriClassi): boolean => Boolean(f.q.trim() || f.giornata || f.stato);

/** Le giornate del sito che una classe ha. */
export const giornateValideClasse = (r: RigaClasse): GiornataRigaClasse[] =>
  r.giornate.filter((g) => Boolean(sessionBySlug(g.slug)));

function classeCorrispondeTesto(r: RigaClasse, q: string): boolean {
  const ago = normalizza(q);
  if (!ago) return true;
  const pagliaio = [
    r.istituto,
    r.comune,
    `classe ${r.classe}`,
    `${r.docente_nome} ${r.docente_cognome}`,
    `${r.docente_cognome} ${r.docente_nome}`,
    r.docente_email,
    r.codice,
    r.docente_telefono,
  ]
    .map(normalizza)
    .join(" | ");
  // Ogni parola deve esserci, in qualunque ordine: "archita 4b" trova la 4B del Liceo Archita.
  const parole = ago.split(" ").filter(Boolean);
  if (parole.every((p) => pagliaio.includes(p))) return true;
  const cifre = soloCifre(q);
  if (cifre.length >= 4 && cifre.length === q.replace(/[\s+().-]/g, "").length) {
    return soloCifre(r.docente_telefono).includes(cifre);
  }
  return false;
}

function classeCorrispondeStato(r: RigaClasse, f: FiltriClassi): boolean {
  if (!f.stato) return true;
  const valide = giornateValideClasse(r);
  const considerate = f.giornata ? valide.filter((g) => g.slug === f.giornata) : valide;
  if (f.stato === "confermato") return considerate.some((g) => g.status === "confermato");
  if (f.stato === "attesa") return considerate.some((g) => g.status === "lista_attesa");
  if (f.stato === "entrata") return considerate.some((g) => g.presenti !== null);
  if (f.stato === "senza_settore") return considerate.some((g) => g.status === "confermato" && !g.settore);
  return true;
}

/** Il filtro unico delle classi: scheda, export e stampa. */
export function filtraClassi(righe: readonly RigaClasse[], f: FiltriClassi): RigaClasse[] {
  return righe.filter((r) => {
    if (f.giornata && !r.giornate.some((g) => g.slug === f.giornata)) return false;
    if (!classeCorrispondeStato(r, f)) return false;
    return classeCorrispondeTesto(r, f.q);
  });
}

/** Per scuola, poi per classe, come in un registro. */
export function confrontaClassiPerScuola(a: RigaClasse, b: RigaClasse): number {
  const opz: Intl.CollatorOptions = { sensitivity: "base", numeric: true };
  return (
    a.istituto.trim().localeCompare(b.istituto.trim(), "it", opz) ||
    a.classe.trim().localeCompare(b.classe.trim(), "it", opz) ||
    a.codice.localeCompare(b.codice)
  );
}

/** Le più recenti in cima. */
export function confrontaClassiPerData(a: RigaClasse, b: RigaClasse): number {
  return b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id);
}

/* ── Link del pannello ────────────────────────────────────────────────── */

/**
 * L'export CSV con i filtri dell'elenco. Con `giornata` è la lista di quel
 * giorno (una riga per persona, con presenza e ora d'ingresso); senza è
 * l'elenco completo con una colonna per giornata.
 */
export function urlExport(f: Filtri, giornata?: string): string {
  const p = new URLSearchParams();
  if (giornata) p.set("giornata", giornata);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.categoria) p.set("categoria", f.categoria);
  // "Senza giornata" non ha senso nella lista di un giorno.
  if (f.stato && !(giornata && f.stato === "senza")) p.set("stato", f.stato);
  const qs = p.toString();
  return `/api/eventi/admin/export${qs ? `?${qs}` : ""}`;
}

export const urlStampa = (giornata: string): string =>
  `${PERCORSO_STAMPA}?giornata=${encodeURIComponent(giornata)}`;

/** La lista per la porta delle sole classi di una giornata. */
export const urlStampaClassi = (giornata: string): string => `${urlStampa(giornata)}&parte=classi`;

/**
 * L'export CSV delle classi con i filtri della scheda. Con `giornata` è
 * l'elenco di quel giorno (stato, settore, ingressi); senza, tutte le
 * prenotazioni con una colonna per giornata.
 */
export function urlExportClassi(f: FiltriClassi, giornata?: string): string {
  const p = new URLSearchParams({ tipo: "classi" });
  if (giornata) p.set("giornata", giornata);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.stato) p.set("stato", f.stato);
  return `/api/eventi/admin/export?${p.toString()}`;
}

export const urlBigliettoRelativo = (codice: string): string =>
  `${PERCORSO_BIGLIETTO}/${encodeURIComponent(codice)}`;

/* ── Date e ore, sempre nel fuso di Roma ──────────────────────────────── */

const FUSO = "Europe/Rome";

const FMT_PARTI = new Intl.DateTimeFormat("it-IT", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parti(ts: string | Date): Record<string, string> | null {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return null;
  const out: Record<string, string> = {};
  for (const p of FMT_PARTI.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** "18/11/2026 10:32", nel fuso di Roma. Vuoto se la data manca. */
export function dataOraRoma(ts: string | Date | null | undefined): string {
  if (!ts) return "";
  const p = parti(ts);
  return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}` : "";
}

/** "9:05", "10:32": l'ora come si scrive nel sito ("dalle 9:00"), nel fuso di Roma. */
export function oraRoma(ts: string | Date | null | undefined): string {
  if (!ts) return "";
  const p = parti(ts);
  return p ? `${Number(p.hour)}:${p.minute}` : "";
}

/** "2026-11-18": il giorno di calendario a Roma, per raggruppare e per i nomi dei file. */
export function giornoRoma(ts: string | Date): string {
  const p = parti(ts);
  return p ? `${p.year}-${p.month}-${p.day}` : "";
}

/* ── Messaggi d'errore delle chiamate del pannello ────────────────────── */

/** Il messaggio da mostrare quando una chiamata al server non va a buon fine. */
export function messaggioErrore(status: number, dati: unknown): string {
  if (status === 401) return "La sessione è scaduta. Ricarica la pagina e accedi di nuovo.";
  if (status === 403) return "Questo account non ha l'accesso staff.";
  const testo =
    dati && typeof dati === "object" && "error" in dati && typeof (dati as { error: unknown }).error === "string"
      ? (dati as { error: string }).error
      : "";
  if (testo) return testo;
  if (status === 0) return "Connessione assente o instabile: l'operazione non è stata eseguita. Riprova.";
  return `Il server ha risposto con un errore (${status}). Riprova tra poco.`;
}

/** POST JSON che non lancia mai: torna lo stato HTTP (0 se la rete manca) e il corpo. */
export async function inviaJson<T = unknown>(
  url: string,
  corpo: unknown,
): Promise<{ ok: boolean; status: number; dati: T | null }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });
    let dati: T | null = null;
    try {
      dati = (await res.json()) as T;
    } catch {
      dati = null;
    }
    return { ok: res.ok, status: res.status, dati };
  } catch {
    return { ok: false, status: 0, dati: null };
  }
}

/** GET JSON che non lancia mai. */
export async function leggiJson<T = unknown>(url: string): Promise<{ ok: boolean; status: number; dati: T | null }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    let dati: T | null = null;
    try {
      dati = (await res.json()) as T;
    } catch {
      dati = null;
    }
    return { ok: res.ok, status: res.status, dati };
  } catch {
    return { ok: false, status: 0, dati: null };
  }
}

/** Le giornate del sito, in ordine: comode per i menu e le colonne. */
export const GIORNATE = SESSIONS.map((s) => ({ slug: s.slug as string, etichetta: s.etichetta }));

/**
 * Scarica un file dal pannello (il CSV) controllando la risposta: se il
 * server risponde con un errore lo restituisce come testo, invece di aprire
 * una pagina con il JSON dell'errore. Null se il file è partito.
 * Solo nel browser.
 */
export async function scaricaFile(url: string, nomeDiRiserva = "iscritti.csv"): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return messaggioErrore(0, null);
  }
  if (!res.ok) {
    let dati: unknown = null;
    try {
      dati = await res.json();
    } catch {
      dati = null;
    }
    return messaggioErrore(res.status, dati);
  }
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition") ?? "";
  const nome = /filename="?([^";]+)"?/i.exec(disp)?.[1] ?? nomeDiRiserva;
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari ha bisogno che l'indirizzo resti valido un attimo dopo il clic.
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  return null;
}
