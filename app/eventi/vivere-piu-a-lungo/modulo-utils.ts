/**
 * Logica e stile del modulo di iscrizione all'evento e della schermata di
 * conferma, separati dal markup per tenerli leggibili.
 *
 * Senza React e senza Supabase: validazione, lettura della risposta della
 * rotta, stato dei posti, testo dell'invito e il CSS (con il prefisso
 * `vpl-`, così non tocca il resto della pagina).
 */

import { refusoEmail } from "@/lib/eventi/email-refusi";
// registration.ts è TypeScript semplice, senza React né Supabase: la regola
// sui nomi è la stessa della rotta, senza portare codice server nel modulo.
import {
  ERRORE_CARATTERI_COGNOME,
  ERRORE_CARATTERI_NOME,
  nomeDiPersonaValido,
  type SessionStatus,
} from "@/lib/eventi/registration";
import {
  CATEGORIE,
  EVENT,
  EVENT_SLUG,
  SESSIONS,
  SITE_URL,
  giornateConArticolo,
  type CategoriaValue,
} from "./content";

/* ── Posti per giornata ─────────────────────────────────────────────── */

/** Una riga di GET /api/eventi/seats. */
export type Posti = { slug: string; capienza_max: number; confermati: number; rimanenti: number };

export type StatoPosti = {
  tipo: "completo" | "ultimi" | "disponibili";
  testo: string;
  icona: string;
};

/**
 * Che cosa dire dei posti di una giornata. Mai il numero quando i posti
 * sono tanti: "Posti disponibili" e basta. Il numero compare solo quando ne
 * restano pochi (10, o il 15% della capienza se è di più). Senza dati sulla
 * giornata, niente: il modulo funziona lo stesso.
 */
export function statoPosti(p: Posti | undefined, capienzaSito: number): StatoPosti | null {
  if (!p || typeof p.rimanenti !== "number" || !Number.isFinite(p.rimanenti)) return null;
  const capienza = p.capienza_max > 0 ? p.capienza_max : capienzaSito;
  const soglia = Math.max(10, Math.ceil(capienza * 0.15));
  if (p.rimanenti <= 0) {
    return { tipo: "completo", testo: "Al completo: puoi iscriverti in lista d'attesa", icona: "fa-user-clock" };
  }
  if (p.rimanenti <= soglia) {
    return {
      tipo: "ultimi",
      testo: p.rimanenti === 1 ? "Ultimo posto disponibile" : `Ultimi ${p.rimanenti} posti`,
      icona: "fa-hourglass-half",
    };
  }
  return { tipo: "disponibili", testo: "Posti disponibili", icona: "fa-circle-check" };
}

/** Legge la risposta di /api/eventi/seats senza fidarsi della forma. */
export function leggiPosti(data: unknown): Record<string, Posti> {
  const righe = data && typeof data === "object" ? (data as { seats?: unknown }).seats : null;
  const mappa: Record<string, Posti> = {};
  if (!Array.isArray(righe)) return mappa;
  for (const r of righe) {
    if (!r || typeof r !== "object") continue;
    const { slug, capienza_max, confermati, rimanenti } = r as Record<string, unknown>;
    if (typeof slug !== "string") continue;
    const n = (v: unknown) => (typeof v === "number" ? v : Number(v));
    if (!Number.isFinite(n(rimanenti))) continue;
    mappa[slug] = {
      slug,
      capienza_max: Number.isFinite(n(capienza_max)) ? n(capienza_max) : 0,
      confermati: Number.isFinite(n(confermati)) ? n(confermati) : 0,
      rimanenti: n(rimanenti),
    };
  }
  return mappa;
}

/* ── Categorie ──────────────────────────────────────────────────────── */

export function isCategoria(v: unknown): v is CategoriaValue {
  return typeof v === "string" && CATEGORIE.some((c) => c.value === v);
}

/** Il valore di ?cat, solo se è una categoria vera. */
export function categoriaDaParametro(v: string | null): CategoriaValue | null {
  const pulito = (v ?? "").trim().toLowerCase();
  return isCategoria(pulito) ? pulito : null;
}

/** Icona Font Awesome di ogni categoria, nelle scelte "Chi sei?". */
export const ICONA_CATEGORIA: Record<CategoriaValue, string> = {
  pubblico: "fa-user",
  studente: "fa-graduation-cap",
  scuola_docente: "fa-school",
  autorita: "fa-landmark",
  startup: "fa-rocket",
  investitore_partner: "fa-handshake",
};

/**
 * Come si chiama il campo "organizzazione" per una categoria, o null se non
 * serve: il pubblico non ce l'ha, e per una startup il suo nome è già nel
 * campo dedicato.
 */
export function etichettaOrganizzazione(categoria: string): string | null {
  switch (categoria) {
    case "studente":
    case "scuola_docente":
      return "Scuola";
    case "autorita":
      return "Ente";
    case "investitore_partner":
      return "Organizzazione";
    default:
      return null;
  }
}

export const mostraClasse = (categoria: string) => categoria === "studente" || categoria === "scuola_docente";

/* ── Validazione ────────────────────────────────────────────────────── */

/** I campi che possono avere un errore, nell'ordine in cui compaiono. */
export const CAMPI = ["sessioni", "nome", "cognome", "email", "categoria", "startup_name", "consenso_privacy"] as const;
export type Campo = (typeof CAMPI)[number];

export const isCampo = (v: unknown): v is Campo => typeof v === "string" && (CAMPI as readonly string[]).includes(v);

export type ErroriModulo = Partial<Record<Campo, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DatiDaValidare = {
  sessioni: readonly string[];
  nome: string;
  cognome: string;
  email: string;
  /** Chi scrive ha detto che un indirizzo "sospetto" è giusto così. */
  emailConfermata: boolean;
  categoria: string;
  startupName: string;
  consensoPrivacy: boolean;
};

/**
 * Gli stessi controlli della rotta, detti in modo che si capisca che cosa
 * fare. In più, un refuso nel dominio dell'email: impossibile blocca sempre,
 * sospetto blocca finché non si sceglie "Usa…" o "È giusto così".
 */
export function validaModulo(d: DatiDaValidare): ErroriModulo {
  const e: ErroriModulo = {};
  if (d.sessioni.length === 0) e.sessioni = "Scegli almeno una giornata.";
  const nome = d.nome.trim();
  if (!nome) e.nome = "Scrivi il tuo nome.";
  else if (!nomeDiPersonaValido(nome)) e.nome = ERRORE_CARATTERI_NOME;
  const cognome = d.cognome.trim();
  if (!cognome) e.cognome = "Scrivi il tuo cognome.";
  else if (!nomeDiPersonaValido(cognome)) e.cognome = ERRORE_CARATTERI_COGNOME;
  const email = d.email.trim();
  if (!email) {
    e.email = "Scrivi il tuo indirizzo email.";
  } else if (!EMAIL_RE.test(email)) {
    e.email = "L'indirizzo email non è completo: deve avere la forma nome@esempio.it.";
  } else {
    // Le stesse parole dell'avviso accanto al campo: "forse intendevi".
    const r = refusoEmail(email);
    if (r?.impossibile) {
      e.email = r.suggerimento
        ? `L'indirizzo email finisce con «${r.dominio}», che non esiste: forse intendevi ${r.suggerimento}?`
        : `L'indirizzo email finisce con «${r.dominio}», che non esiste.`;
    } else if (r && !d.emailConfermata) {
      e.email = `Controlla l'indirizzo email: forse intendevi ${r.suggerimento}?`;
    }
  }
  if (!isCategoria(d.categoria)) e.categoria = "Indica chi sei.";
  if (d.categoria === "startup" && !d.startupName.trim()) e.startup_name = "Scrivi il nome della startup.";
  if (!d.consensoPrivacy) e.consenso_privacy = "Per iscriverti serve il consenso al trattamento dei dati.";
  return e;
}

/* ── Risposta della rotta ───────────────────────────────────────────── */

export type GiornataEsito = { slug: string; status: SessionStatus };

export type EsitoServer = {
  /**
   * Assente nella risposta all'honeypot (lì si ringrazia e basta) e quando
   * l'email era già iscritta e chi scrive non ha fatto l'accesso con quella
   * email (giaIscritto): il codice arriva solo per email.
   */
  codice: string | null;
  /** Tutte le giornate che la persona ha adesso, non solo quelle di oggi. */
  sessions: GiornataEsito[];
  /** Le giornate aggiunte con questo invio. null se la rotta non lo dice. */
  nuove: string[] | null;
  nuovoAccount: boolean;
  /**
   * Il biglietto è partito per email. True anche quando la rotta non lo dice
   * (la risposta all'honeypot): solo un false esplicito cambia il testo.
   */
  emailInviata: boolean;
  /**
   * Con questa email c'era già un'iscrizione e chi scrive non ha fatto
   * l'accesso con lo stesso indirizzo: niente codice né giornate a schermo,
   * il biglietto aggiornato va solo all'indirizzo dell'iscrizione.
   */
  giaIscritto: boolean;
};

export type RispostaIscrizione =
  | { ok: true; esito: EsitoServer }
  | { ok: false; errore: string; campo?: Campo };

export const MESSAGGIO_RETE =
  "Non riusciamo a raggiungere il sito. Controlla la connessione e riprova.";

export const MESSAGGIO_TEMPO =
  "La risposta sta tardando. Riprova: se l'iscrizione era già arrivata non viene duplicata, e il codice resta lo stesso.";

function messaggioPerStato(status: number): string {
  switch (status) {
    case 400:
      return "Alcuni dati non sono validi. Controlla il modulo e riprova.";
    case 403:
      return "Le iscrizioni sono chiuse.";
    case 409:
      return "Questa iscrizione risulta già registrata. Controlla la tua email: lì trovi il biglietto.";
    case 429:
      return "Troppi tentativi in poco tempo. Aspetta un minuto e riprova.";
    case 503:
      return "Il servizio di iscrizione è momentaneamente non disponibile. Riprova tra qualche minuto.";
    default:
      return "Non siamo riusciti a completare l'iscrizione. Riprova tra qualche istante. Se il problema continua, scrivici a info@bioergotech.org.";
  }
}

const isGiornataEsito = (v: unknown): v is GiornataEsito =>
  Boolean(v) &&
  typeof v === "object" &&
  typeof (v as GiornataEsito).slug === "string" &&
  ((v as GiornataEsito).status === "confermato" || (v as GiornataEsito).status === "lista_attesa");

/**
 * La risposta di POST /api/eventi/registrations, letta senza fidarsi della
 * forma: una pagina d'errore HTML (un timeout del server) diventa un
 * messaggio chiaro, mai un'eccezione.
 */
export async function leggiRisposta(res: Response): Promise<RispostaIscrizione> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  if (res.ok && (o.success === true || typeof o.codice === "string")) {
    const sessions = Array.isArray(o.sessions)
      ? o.sessions.filter(isGiornataEsito).map((s) => ({ slug: s.slug, status: s.status }))
      : [];
    const nuove = Array.isArray(o.nuove) ? o.nuove.filter((s): s is string => typeof s === "string") : null;
    const giaIscritto = o.giaIscritto === true;
    // Per un'email già iscritta non si mostra nulla dell'iscrizione, anche se
    // la risposta lo contenesse.
    const codice = !giaIscritto && typeof o.codice === "string" && o.codice.trim() ? o.codice.trim() : null;
    return {
      ok: true,
      esito: {
        codice,
        sessions: giaIscritto ? [] : sessions,
        nuove: giaIscritto ? [] : nuove,
        nuovoAccount: !giaIscritto && o.nuovoAccount === true,
        emailInviata: o.emailInviata !== false,
        giaIscritto,
      },
    };
  }

  const errore = typeof o.error === "string" && o.error.trim() ? o.error.trim() : messaggioPerStato(res.status);
  return { ok: false, errore, campo: isCampo(o.campo) ? o.campo : undefined };
}

/* ── Reinvio del biglietto ──────────────────────────────────────────── */

function messaggioReinvio(status: number): string {
  switch (status) {
    case 429:
      return "Ti abbiamo appena rimandato il biglietto. Controlla la posta, anche nella cartella spam; se non arriva, riprova tra un paio di minuti.";
    case 503:
      return "L'invio delle email non è disponibile in questo momento. Riprova più tardi o scrivi a info@bioergotech.org.";
    default:
      return "Non siamo riusciti a inviare l'email. Riprova tra qualche minuto o scrivi a info@bioergotech.org.";
  }
}

/**
 * Chiede di rimandare il biglietto all'indirizzo dell'iscrizione: l'azione
 * "reinvia" di POST /api/eventi/registrations/gestisci, la stessa del
 * biglietto online (al massimo una volta ogni due minuti per codice). Non
 * lancia mai: torna l'esito e, se non è andata, il messaggio da mostrare.
 */
export async function chiediReinvio(codice: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const controllo = new AbortController();
  const timer = window.setTimeout(() => controllo.abort(), 25_000);
  try {
    const res = await fetch("/api/eventi/registrations/gestisci", {
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
        ? "La risposta sta tardando. Riprova tra qualche minuto, oppure apri il biglietto e salvalo."
        : MESSAGGIO_RETE,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/* ── Invito ─────────────────────────────────────────────────────────── */

/** Il link da condividere: porta dritto al modulo. */
export const URL_INVITO = `${SITE_URL}/eventi/${EVENT_SLUG}#iscrizione`;

/** Il messaggio dell'invito, senza il link. */
export function testoInvito(confermate: readonly string[]): string {
  const tutte = SESSIONS.map((s) => s.slug);
  const io = confermate.length ? `Io ci sarò ${giornateConArticolo(confermate)}: vieni anche tu? ` : "";
  return `${io}«${EVENT.titolo}», ${giornateConArticolo(tutte)} a ${EVENT.citta} con la ${EVENT.organizzatore}. L'ingresso è gratuito, con iscrizione.`;
}

/** Copia negli appunti, anche dove l'API moderna manca. Torna true se è riuscita. */
export async function copiaTesto(testo: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(testo);
      return true;
    }
  } catch {
    /* si prova con il metodo di riserva */
  }
  const prima = document.activeElement as HTMLElement | null;
  try {
    const ta = document.createElement("textarea");
    ta.value = testo;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  } finally {
    prima?.focus?.({ preventScroll: true });
  }
}

/** "aria-describedby" con i soli id presenti. */
export const ids = (...v: (string | false | null | undefined)[]): string | undefined =>
  v.filter(Boolean).join(" ") || undefined;

/** Scorre in modo morbido solo se chi guarda non ha chiesto meno movimento. */
export const comportamentoScroll = (): ScrollBehavior =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/* ── Stile ──────────────────────────────────────────────────────────── */

/**
 * Il teal del sito (#2EC4B6) per icone, bordi e accenti; per il testo piccolo
 * un teal più scuro, che sul bianco si legge (contrasto 4.8:1). I bordi dei
 * controlli usano --text-light, che sul bianco arriva a 3:1.
 */
const CHECK_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export const STILE_MODULO = `
.vpl-wrap { min-width: 0; container-type: inline-size; container-name: vpl; --vpl-teal-testo: #0F7F75; --vpl-bordo: #8896A6; --vpl-errore: #A61E3F; }
/* main.css aggiunge a .card margine, bordo sinistro di 4px trasparente, fondo
   semitrasparente e una striscia teal (::before) al passaggio del mouse: un
   modulo non deve cambiare mentre si compila. */
.vpl-wrap .vpl-card { margin: 0; padding: 24px 20px; background: #fff; border-left: 1px solid var(--border-color); border-top: 4px solid var(--primary); box-shadow: var(--shadow); scroll-margin-top: 90px; }
.vpl-wrap .vpl-card::before { display: none; }
.vpl-wrap .vpl-card, .vpl-wrap .vpl-card:hover { transform: none; }
.vpl-wrap .vpl-card:hover { box-shadow: var(--shadow); border-color: var(--border-color); border-top-color: var(--primary); }
@container vpl (min-width: 520px) { .vpl-wrap .vpl-card { padding: 32px; } }

.vpl-form { display: flex; flex-direction: column; gap: 28px; }
.vpl-intro { display: flex; gap: 14px; align-items: center; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
.vpl-intro .icon-circle { width: 44px; height: 44px; border-radius: 12px; font-size: 18px; }
.vpl-intro-titolo { display: block; font-size: 17px; font-weight: 700; color: var(--text-dark); line-height: 1.3; }

.vpl-fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.vpl-legend { padding: 0; font-size: 17px; font-weight: 700; color: var(--text-dark); line-height: 1.35; }
.vpl-gruppo { display: flex; flex-direction: column; gap: 18px; }
.vpl-griglia2 { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
@container vpl (min-width: 440px) { .vpl-griglia2 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.vpl-griglia-scuola { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
@container vpl (min-width: 440px) { .vpl-griglia-scuola { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); } }
.vpl-campo { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.vpl-label { font-size: 15px; font-weight: 600; color: var(--text-dark); line-height: 1.35; }
.vpl-opz { font-weight: 400; color: var(--text-mid); font-size: 14px; }
.vpl-aiuto { margin: 4px 0 0; font-size: 14px; color: var(--text-mid); line-height: 1.5; }
.vpl-campo .vpl-aiuto { margin: 0; }

.vpl-input { display: block; width: 100%; min-height: 48px; padding: 11px 14px; font-family: inherit; font-size: 16px; line-height: 1.4; color: var(--text-dark); background: #fff; border: 1px solid var(--vpl-bordo); border-radius: 12px; transition: border-color .15s ease, box-shadow .15s ease; -webkit-appearance: none; appearance: none; scroll-margin-top: 120px; scroll-margin-bottom: 24px; }
.vpl-input::placeholder { color: #6B7787; }
.vpl-input:hover { border-color: #5F6B7A; }
.vpl-input:focus { outline: none; border-color: var(--primary-dark); box-shadow: 0 0 0 3px rgba(46, 196, 182, .3); }
.vpl-input[aria-invalid="true"] { border-color: var(--vpl-errore); }
.vpl-input[aria-invalid="true"]:focus { box-shadow: 0 0 0 3px rgba(166, 30, 63, .16); }
textarea.vpl-input { min-height: 96px; resize: vertical; }

.vpl-errore { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 14px; font-weight: 500; line-height: 1.45; color: var(--vpl-errore); }
.vpl-errore i { margin-top: 3px; flex: none; }

/* Giornate */
.vpl-giorni { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; margin-top: 14px; }
@container vpl (min-width: 640px) { .vpl-giorni { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.vpl-giorno { position: relative; display: flex; gap: 14px; align-items: flex-start; padding: 16px; border: 2px solid var(--border-color); border-radius: 14px; background: #fff; cursor: pointer; transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease; -webkit-tap-highlight-color: transparent; }
.vpl-giorno:hover { border-color: #B9C6D4; }
.vpl-giorno[data-scelto="true"] { border-color: var(--primary); background: #F3FBFA; box-shadow: 0 6px 18px rgba(46, 196, 182, .14); }
.vpl-giorno[data-errore="true"] { border-color: #E7A6B6; }
.vpl-giorno:has(.vpl-check:focus-visible) { box-shadow: 0 0 0 3px rgba(46, 196, 182, .35); }
.vpl-giorno-corpo, .vpl-giorno-dettagli { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.vpl-giorno-corpo { flex: 1; }
.vpl-giorno-data { font-size: 17px; font-weight: 700; color: var(--text-dark); line-height: 1.3; }
.vpl-giorno-titolo { font-size: 14px; color: var(--text-mid); line-height: 1.45; }
.vpl-giorno-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 6px; font-size: 14px; color: var(--text-dark); line-height: 1.4; }
.vpl-giorno-meta span { display: inline-flex; align-items: center; gap: 7px; }
.vpl-giorno-meta i { color: var(--primary-dark); width: 14px; text-align: center; font-size: 13px; }
.vpl-posti { display: flex; align-items: flex-start; gap: 7px; min-height: 19px; margin-top: 8px; font-size: 13px; font-weight: 600; line-height: 1.45; }
.vpl-posti i { margin-top: 3px; font-size: 12px; }
.vpl-posti[data-tipo="disponibili"] { color: var(--vpl-teal-testo); }
.vpl-posti[data-tipo="ultimi"], .vpl-posti[data-tipo="completo"] { color: #8A5300; }
.vpl-posti[data-tipo="conclusa"] { color: var(--text-mid); }
/* Una giornata già conclusa: resta in vista, ma non si sceglie più. */
.vpl-giorno[data-conclusa="true"] { cursor: not-allowed; background: var(--bg-light); border-color: var(--border-color); box-shadow: none; }
.vpl-giorno[data-conclusa="true"]:hover { border-color: var(--border-color); }
.vpl-giorno[data-conclusa="true"] .vpl-giorno-data { color: var(--text-mid); }
.vpl-giorno[data-conclusa="true"] .vpl-check { cursor: not-allowed; background-color: var(--border-color); border-color: var(--border-color); }

.vpl-check { flex: none; width: 24px; height: 24px; margin: 1px 0 0; border: 2px solid var(--vpl-bordo); border-radius: 7px; background: #fff center / 15px no-repeat; -webkit-appearance: none; appearance: none; cursor: pointer; transition: background-color .15s ease, border-color .15s ease; scroll-margin-top: 140px; scroll-margin-bottom: 24px; }
.vpl-check:checked { background-color: var(--primary-dark); border-color: var(--primary-dark); background-image: ${CHECK_SVG}; }
.vpl-check:focus-visible { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; }
.vpl-check[aria-invalid="true"]:not(:checked) { border-color: var(--vpl-errore); }

/* Chi sei? */
.vpl-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.vpl-chip { position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 9px 16px 9px 14px; border: 1.5px solid var(--vpl-bordo); border-radius: 999px; background: #fff; color: var(--text-dark); font-size: 15px; font-weight: 500; line-height: 1.2; cursor: pointer; transition: border-color .15s ease, background-color .15s ease; -webkit-tap-highlight-color: transparent; user-select: none; }
.vpl-chip i { color: var(--primary-dark); font-size: 14px; width: 16px; text-align: center; }
.vpl-chip:hover { border-color: var(--primary-dark); }
.vpl-chip[data-scelto="true"] { border-color: var(--primary-dark); background: var(--primary-light); font-weight: 600; }
.vpl-chip input { position: absolute; left: 12px; top: 50%; width: 1px; height: 1px; margin: 0; opacity: 0; pointer-events: none; scroll-margin-top: 160px; scroll-margin-bottom: 40px; }
.vpl-chip:has(input:focus-visible) { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; }
@supports not selector(:has(*)) { .vpl-chip:focus-within { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; } }
.vpl-chips[data-errore="true"] .vpl-chip { border-color: var(--vpl-errore); }

.vpl-pannello { display: flex; flex-direction: column; gap: 18px; padding: 18px; border-radius: 14px; background: var(--bg-light); border: 1px solid var(--border-color); animation: fadeIn .25s ease both; }
.vpl-nota { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 12px; background: #F3FBFA; border: 1px solid #CDEFEA; font-size: 14px; line-height: 1.55; color: var(--text-dark); }
.vpl-nota i { color: var(--primary-dark); margin-top: 3px; flex: none; }
.vpl-nota a, .vpl-consenso a, .vpl-link { color: var(--vpl-teal-testo); font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }

.vpl-link-btn { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; min-height: 44px; padding: 0 4px; margin: 0 -4px; background: none; border: 0; border-radius: 8px; color: var(--vpl-teal-testo); font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; }
.vpl-link-btn:hover { text-decoration: underline; text-underline-offset: 3px; }
.vpl-link-btn:focus-visible, .vpl-nota a:focus-visible, .vpl-consenso a:focus-visible, .vpl-link:focus-visible { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; border-radius: 6px; }

/* Email: refusi */
.vpl-refuso { border-radius: 12px; padding: 12px 14px; font-size: 14px; line-height: 1.55; overflow-wrap: anywhere; }
.vpl-refuso[data-tipo="errore"] { background: #FDF2F4; border: 1px solid #F0B8C5; color: #7E1D35; }
.vpl-refuso[data-tipo="avviso"] { background: #FFF8E6; border: 1px solid #F0D89B; color: #634708; }
.vpl-refuso-azioni { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.vpl-mini-btn { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; max-width: 100%; padding: 8px 14px; border-radius: 10px; border: 1.5px solid var(--primary-dark); background: #fff; color: var(--vpl-teal-testo); font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.3; text-align: left; overflow-wrap: anywhere; cursor: pointer; transition: background-color .15s ease; }
.vpl-mini-btn:hover { background: #F3FBFA; }
.vpl-mini-btn-neutro { border-color: var(--vpl-bordo); color: var(--text-dark); }
.vpl-mini-btn:focus-visible { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; }

/* Consensi */
.vpl-consensi { display: flex; flex-direction: column; gap: 4px; }
.vpl-consenso { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0; font-size: 14px; line-height: 1.55; color: var(--text-mid); cursor: pointer; }
.vpl-consenso .vpl-check { margin-top: 0; }
.vpl-tag { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: var(--bg-light); border: 1px solid var(--border-color); color: var(--text-mid); font-size: 12px; font-weight: 600; vertical-align: 1px; }

/* Riepilogo errori */
.vpl-riepilogo { border: 1.5px solid #E7A6B6; background: #FDF2F4; border-radius: 14px; padding: 14px 16px 8px; scroll-margin-top: 120px; }
.vpl-riepilogo:focus { outline: none; }
.vpl-riepilogo-titolo { display: flex; gap: 10px; align-items: center; margin: 0; font-size: 15px; font-weight: 700; color: #7E1D35; }
.vpl-riepilogo ul { list-style: none; margin: 4px 0 0; padding: 0; }
.vpl-riepilogo li > button { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; padding: 6px 0; background: none; border: 0; text-align: left; color: var(--vpl-errore); font-family: inherit; font-size: 15px; font-weight: 600; line-height: 1.4; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.vpl-riepilogo li > button:focus-visible { outline: 3px solid rgba(166, 30, 63, .35); outline-offset: 2px; border-radius: 6px; }
.vpl-riepilogo li > p { margin: 6px 0 8px; font-size: 15px; line-height: 1.5; color: #7E1D35; }

/* Invio */
.vpl-invio { display: flex; flex-direction: column; }
.vpl-riepilogo-slot > .vpl-riepilogo { margin-bottom: 16px; }
.vpl-invio > .vpl-scelte { margin-bottom: 12px; }
.vpl-invio > .vpl-piede { margin-top: 12px; }
.vpl-scelte { display: flex; gap: 8px; align-items: center; margin: 0; font-size: 14px; color: var(--text-mid); }
.vpl-scelte i { color: var(--primary-dark); }
/* main.css riporta .btn-primary a inline-block: senza flex e gap icona e testo
   restano attaccati. */
.vpl-wrap .vpl-invia { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 54px; font-family: inherit; font-size: 1rem; }
.vpl-wrap .vpl-invia:focus-visible { outline: 3px solid var(--text-dark); outline-offset: 3px; }
.vpl-wrap .vpl-invia[disabled] { opacity: .8; cursor: progress; transform: none; }
.vpl-piede { margin: 0; font-size: 13px; color: var(--text-mid); text-align: center; line-height: 1.5; }
.vpl-avviso-nuova { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 12px; background: var(--bg-light); border: 1px solid var(--border-color); font-size: 14px; line-height: 1.55; color: var(--text-dark); }
.vpl-avviso-nuova i { color: var(--primary-dark); margin-top: 3px; }

/* Conferma */
.vpl-ok { display: flex; flex-direction: column; gap: 22px; scroll-margin-top: 96px; animation: fadeUp .45s ease both; }
.vpl-ok-testa { display: flex; flex-direction: column; gap: 12px; }
.vpl-ok .icon-circle { width: 56px; height: 56px; font-size: 24px; }
.vpl-ok-titolo { margin: 0; font-size: 1.6rem; font-weight: 700; color: var(--text-dark); line-height: 1.2; }
.vpl-ok-titolo:focus { outline: none; }
.vpl-ok-intro { margin: 0; font-size: 16px; color: var(--text-mid); line-height: 1.6; }
.vpl-ok-giornate { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden; }
.vpl-ok-giornate li { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 14px 16px; }
.vpl-ok-giornate li + li { border-top: 1px solid var(--border-color); }
.vpl-ok-giornata strong { display: block; font-size: 16px; color: var(--text-dark); }
.vpl-ok-giornata span { display: block; font-size: 14px; color: var(--text-mid); margin-top: 2px; }
.vpl-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; }
.vpl-pill[data-stato="confermato"] { background: var(--primary-light); color: #0B6159; }
.vpl-pill[data-stato="lista_attesa"] { background: #FFF1D6; color: #6E4600; }
.vpl-codice { text-align: center; padding: 18px 16px; border-radius: 14px; background: linear-gradient(135deg, #F3FBFA, #fff); border: 1px dashed var(--primary); }
.vpl-codice-label { font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--vpl-teal-testo); }
.vpl-codice-valore { margin-top: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 26px; font-size: clamp(22px, 7cqi, 30px); font-weight: 700; letter-spacing: .1em; color: var(--text-dark); overflow-wrap: anywhere; }
.vpl-codice-nota { margin: 6px 0 0; font-size: 14px; color: var(--text-mid); }
.vpl-wrap .vpl-ok .btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 52px; padding-left: 16px; padding-right: 16px; font-size: 1rem; text-align: center; text-decoration: none; }
.vpl-wrap .vpl-ok .btn-primary:focus-visible { outline: 3px solid var(--text-dark); outline-offset: 3px; }
.vpl-sezione-titolo { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--vpl-teal-testo); }
.vpl-azioni { display: flex; flex-wrap: wrap; gap: 8px; }
.vpl-azione { display: inline-flex; align-items: center; gap: 9px; min-height: 44px; padding: 10px 16px; border: 1.5px solid var(--border-color); border-radius: 12px; background: #fff; color: var(--text-dark); font-family: inherit; font-size: 15px; font-weight: 600; line-height: 1.2; text-decoration: none; cursor: pointer; transition: border-color .15s ease, background-color .15s ease; }
.vpl-azione i { color: var(--primary-dark); font-size: 16px; }
.vpl-azione:hover { border-color: var(--primary); background: #F3FBFA; color: var(--text-dark); }
.vpl-azione:focus-visible { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; }
.vpl-copiato { min-height: 21px; margin: 8px 0 0; font-size: 14px; font-weight: 600; color: var(--vpl-teal-testo); }
.vpl-ok-nota { display: flex; gap: 10px; align-items: flex-start; margin: 0; font-size: 14px; line-height: 1.6; color: var(--text-mid); overflow-wrap: anywhere; }
.vpl-ok-nota i { color: var(--primary-dark); margin-top: 4px; flex: none; }
.vpl-ok-nota strong { color: var(--text-dark); }
.vpl-ok-piede { padding-top: 18px; border-top: 1px solid var(--border-color); display: flex; justify-content: center; }
/* L'email del biglietto non è partita: un avviso che non si confonde con le note. */
.vpl-ok-avviso { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #FFF8E6; border: 1px solid #F0D89B; color: #634708; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.vpl-ok-avviso > i { color: #8A5300; margin-top: 4px; flex: none; }
.vpl-ok-avviso-corpo { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; min-width: 0; }
.vpl-ok-avviso-corpo p { margin: 0; }
.vpl-ok-avviso .vpl-azione { border-color: #E3C77E; }
.vpl-ok-avviso .vpl-azione[disabled] { opacity: .7; cursor: progress; }
.vpl-ok-avviso[data-esito="ok"] { background: #F3FBFA; border-color: #CDEFEA; color: var(--text-dark); }
.vpl-ok-avviso[data-esito="ok"] > i { color: var(--primary-dark); }
/* Vuota resta nel DOM (è la regione che annuncia l'esito), ma non occupa spazio. */
.vpl-reinvio-esito:empty { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.vpl-reinvio-esito:focus { outline: none; }
.vpl-reinvio-esito[data-tipo="errore"] { color: var(--vpl-errore); font-weight: 500; }

@media (forced-colors: active) {
  .vpl-check { -webkit-appearance: auto; appearance: auto; }
  .vpl-chip[data-scelto="true"], .vpl-giorno[data-scelto="true"] { outline: 2px solid CanvasText; }
}
@media (prefers-reduced-motion: reduce) {
  .vpl-wrap *, .vpl-wrap *::before, .vpl-wrap *::after { animation: none !important; transition: none !important; }
}
`;
