"use client";

/**
 * La modalità ingresso: il check-in alla porta del 10 e dell'11 dicembre.
 *
 * Due usi, stesso componente:
 * - nel pannello iscrizioni, scheda Ingresso (`compatto`), per lo staff admin;
 * - a schermo intero in /eventi/vivere-piu-a-lungo/admin/ingresso, sul
 *   telefono degli admin e dei volontari abilitati (EVENT_CHECKIN_EMAILS).
 *
 * Come legge i biglietti:
 * - la fotocamera posteriore resta accesa tra una persona e l'altra e si
 *   spegne quando la scheda o il telefono vanno in secondo piano (e riparte
 *   da sola al ritorno, se era accesa);
 * - BarcodeDetector dove c'è (Chrome su Android), altrimenti jsQR, caricato
 *   solo quando serve, su fotogrammi ridotti a 640 pixel, 6 o 7 al secondo
 *   (Safari su iPhone);
 * - lo stesso codice si ignora finché resta davanti alla fotocamera e per 4
 *   secondi dopo, così chi tiene il telefono fermo non diventa "già entrato";
 * - il campo del codice resta sempre lì, per quando la fotocamera non va o
 *   c'è un lettore USB (sul computer ha il focus da subito).
 *
 * Il <video> è sempre nel DOM (invisibile quando la fotocamera è spenta): lo
 * scanner di prima non partiva perché il video compariva solo dopo l'avvio.
 * Su iPhone serve un tocco per partire (pulsante "Avvia la fotocamera"),
 * playsInline e muted.
 *
 * "Oggi" arriva dal server (prop `oggi`): calcolarlo anche nel browser
 * darebbe un errore di idratazione su un telefono con la data sbagliata.
 *
 * "Annulla l'ingresso" rimette le cose come prima anche dopo un ingresso
 * forzato: la rotta riceve il tipo (`forzato`), che il telefono ricorda per
 * gli ingressi registrati da lui.
 *
 * Le classi hanno un QR solo (VPC-XXXXXXXX): leggerlo apre la scheda della
 * classe (scuola, classe, docente con il telefono, quante persone, settore)
 * e il volontario dice quante persone entrano adesso. Un secondo ingresso
 * aggiunge i ritardatari ("23 di 30 entrati"). La scheda manda alla rotta
 * quante persone mostrava già entrate: se nel frattempo il numero è
 * cambiato, non si scrive niente e la scheda si aggiorna. Mentre la scheda
 * aspetta il numero, la fotocamera non legge altri QR e il campo del codice
 * (anche dal lettore USB) non la sostituisce: lo dice sotto il campo e in
 * cima alla scheda. Un codice letto mentre il fuoco è nel campo del numero
 * della scheda non diventa un numero: lettere e Invio si scartano. I
 * pulsanti della scheda non prendono il fuoco da soli, così un lettore USB
 * non la conferma mai con il suo Invio; sul computer il fuoco resta nel
 * campo del codice e ci torna quando una scheda si chiude (sul telefono va
 * sulla scheda stessa, dove un Invio non fa niente). Se una classe risulta già entrata,
 * "Correggi il numero" abbassa quante persone risultano entrate (0 annulla
 * l'ingresso di tutta la classe), anche dopo che l'esito verde è sparito.
 */

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { SESSIONS, giornateConArticolo, sessionBySlug } from "../content";
import { descriviPersone } from "@/lib/eventi/classi";

/* ── Costanti ─────────────────────────────────────────────────────────── */

const API = "/api/eventi/admin/ingresso";
const PAGINA_INGRESSO = "/eventi/vivere-piu-a-lungo/admin/ingresso";
/** Lo stesso codice si ignora per 4 secondi dall'ultima volta che si è visto. */
const PAUSA_STESSO_CODICE = 4000;
/** Pausa tra due fotogrammi letti: con la lettura, 6 o 7 al secondo. */
const INTERVALLO_LETTURA = 140;
/** Il lato più lungo del fotogramma passato a jsQR. */
const LATO_MAX = 640;
const AGGIORNA_OGNI = 30_000;
/** Quanto resta a schermo l'esito verde prima di tornare alla fotocamera. */
const CHIUSURA_VERDE = 6000;
const CHIAVE_SUONO = "evento-ingresso-suono";
const CHIAVE_FOTOCAMERA = "evento-ingresso-fotocamera";

/* ── Tipi ─────────────────────────────────────────────────────────────── */

type Persona = {
  nome: string;
  cognome: string;
  categoria: string;
  organizzazione: string | null;
  classe: string | null;
  note: string | null;
};

type UltimoPersona = { tipo?: "persona"; bridgeId: string; nome: string; cognome: string; ora: string };
type UltimoClasse = {
  tipo: "classe";
  bridgeId: string;
  classe: string;
  istituto: string;
  presenti: number;
  posti: number;
  ora: string;
};
type Ultimo = UltimoPersona | UltimoClasse;

/** Perché una persona (o una classe) è entrata senza un posto confermato per oggi. */
type Forzato = "lista_attesa" | "altra_giornata";

type NumeriClassi = { confermate: number; in_attesa: number; entrate: number; presenti: number };

type StatoGiornata = {
  giornata: string;
  /** La giornata di oggi secondo il server al momento della lettura. */
  oggi?: string | null;
  /** I posti occupati: persone e classi confermate. */
  confermati: number;
  lista_attesa: number;
  /** Tutti gli ingressi: persone e persone delle classi. */
  entrati: number;
  /** Null se le prenotazioni per classe non sono nel database. */
  classi?: NumeriClassi | null;
  ultimi: Ultimo[];
};

/** Una classe come la vede la porta. */
type SchedaClasse = {
  id: string;
  bridgeId: string | null;
  istituto: string;
  comune: string | null;
  classe: string;
  docente: string;
  telefono: string | null;
  studenti: number;
  accompagnatori: number;
  posti: number;
  note: string | null;
  stato: "confermato" | "lista_attesa" | "altra_giornata";
  settore: string | null;
  /** Le persone della classe già entrate oggi (null: nessuna). */
  presenti: number | null;
  /** L'ora del primo ingresso. */
  ora: string | null;
  altreGiornate: string[];
};

type EsitoIngresso =
  | "entrato"
  | "gia_entrato"
  | "lista_attesa"
  | "altra_giornata"
  | "non_trovato"
  | "classe"
  | "classe_entrata";

type RispostaIngresso = {
  esito: EsitoIngresso;
  persona?: Persona;
  ora?: string | null;
  altreGiornate?: string[];
  bridgeId?: string;
  forzato?: Forzato;
  classe?: SchedaClasse;
  entrati?: number;
  prima?: number | null;
  cambiata?: boolean;
};

type Chiave = { codice: string } | { registrazione: string } | { classe: string };

type Risultato = {
  /** Progressivo: distingue due esiti uguali uno dopo l'altro. */
  n: number;
  tipo: EsitoIngresso | "non_biglietto" | "errore";
  giornata: string;
  chiave?: Chiave;
  forza?: boolean;
  persona?: Persona;
  ora?: string | null;
  altreGiornate?: string[];
  bridgeId?: string;
  forzato?: Forzato;
  /** Quello che si è letto o scritto, per "codice non trovato". */
  letto?: string;
  messaggio?: string;
  /** La nota sulla scheda di una classe è un avviso (per esempio una correzione non riuscita), non un esito. */
  messaggioAttenzione?: boolean;
  accesso?: boolean;
  rete?: boolean;
  /** Per le classi: la scheda, quante persone sono appena entrate e quante ce n'erano prima. */
  classe?: SchedaClasse;
  entrati?: number;
  prima?: number | null;
  /** La scheda è cambiata nel frattempo: niente è stato scritto. */
  cambiata?: boolean;
};

type Trovato = Persona & {
  rif: string;
  oggi: "entrato" | "confermato" | "lista_attesa" | "non_iscritto";
  ora: string | null;
  altreGiornate: string[];
};

type TrovataClasse = {
  rif: string;
  classe: string;
  istituto: string;
  comune: string | null;
  docente: string;
  posti: number;
  settore: string | null;
  oggi: "entrata" | "confermato" | "lista_attesa" | "altra_giornata";
  presenti: number | null;
  ora: string | null;
  altreGiornate: string[];
};

type StatoCamera = "spenta" | "avvio" | "attiva" | "errore";
type Supporto = "si" | "https" | "browser";
type Tono = "ok" | "attenzione" | "errore";
type Lettore = (video: HTMLVideoElement) => Promise<string | null>;

type RilevatoreNativo = { detect(sorgente: CanvasImageSource): Promise<{ rawValue: string }[]> };
type CostruttoreRilevatore = {
  new (opzioni: { formats: string[] }): RilevatoreNativo;
  getSupportedFormats?: () => Promise<string[]>;
};

/* ── Funzioni di servizio ─────────────────────────────────────────────── */

function leggiPreferenza(chiave: string): string | null {
  try {
    return window.localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

function scriviPreferenza(chiave: string, valore: string | null) {
  try {
    if (valore === null) window.localStorage.removeItem(chiave);
    else window.localStorage.setItem(chiave, valore);
  } catch {
    /* navigazione privata: la preferenza vale solo per questa visita */
  }
}

/** "9:12" da "09:12". */
const oraBreve = (ora: string | null | undefined) => (ora ? ora.replace(/^0(\d)/, "$1") : "");

function oraAdesso(): string {
  return new Intl.DateTimeFormat("it-IT", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

/**
 * Se il testo di un QR può essere un biglietto: "VPL-XXXXXXXX" (con o senza
 * trattino, spazi, minuscole), il solo codice di 8 caratteri, o il link al
 * biglietto online. Lo stesso criterio, autorevole, sta nella rotta
 * /api/eventi/admin/ingresso (codiciCandidati).
 */
function sembraBiglietto(testo: string): boolean {
  const t = testo.trim();
  if (!t || t.length > 300) return false;
  if (/(biglietto|classe)\/[A-Za-z0-9-]+/.test(t)) return true;
  const compatto = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^VP[LC][A-Z0-9]{8}$/.test(compatto) || /^[A-Z0-9]{8}$/.test(compatto);
}

async function chiama(
  url: string,
  init?: RequestInit,
  ms = 10_000,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const controllo = new AbortController();
  const timer = window.setTimeout(() => controllo.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: controllo.signal, cache: "no-store", credentials: "same-origin" });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: res.ok, status: res.status, json };
  } finally {
    window.clearTimeout(timer);
  }
}

function messaggioRete(err: unknown): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Il dispositivo è offline. Controlla il Wi-Fi o i dati mobili e riprova.";
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Il server non risponde. Controlla la connessione e riprova.";
  }
  return "Connessione non riuscita. Controlla la rete e riprova.";
}

function erroreDa(json: Record<string, unknown> | null, ripiego: string): string {
  return typeof json?.error === "string" && json.error ? json.error : ripiego;
}

function messaggioFotocamera(err: unknown): string {
  const nome = err instanceof Error || err instanceof DOMException ? err.name : "";
  switch (nome) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Consenti l'uso della fotocamera nelle impostazioni del browser, poi tocca Riprova. Su iPhone: Impostazioni, Safari, Fotocamera, Consenti. Su Android: il lucchetto accanto all'indirizzo, Autorizzazioni, Fotocamera.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "Non trovo una fotocamera su questo dispositivo. Usa il campo del codice qui sotto.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "La fotocamera è usata da un'altra app. Chiudi l'altra app e tocca Riprova.";
    case "LettoreNonCaricato":
      return "Il lettore dei QR non si è caricato. Controlla la connessione e tocca Riprova, oppure usa il campo del codice qui sotto.";
    default:
      return "Non riesco ad avviare la fotocamera. Tocca Riprova, oppure usa il campo del codice qui sotto.";
  }
}

function vincoliVideo(deviceId: string | null): MediaStreamConstraints {
  const dimensioni = { width: { ideal: 1280 }, height: { ideal: 720 } };
  return {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, ...dimensioni }
      : { facingMode: { ideal: "environment" }, ...dimensioni },
  };
}

/** BarcodeDetector se il browser lo ha e legge i QR, altrimenti jsQR. */
async function creaLettore(): Promise<Lettore> {
  const Nativo = (window as unknown as { BarcodeDetector?: CostruttoreRilevatore }).BarcodeDetector;
  if (Nativo) {
    try {
      const formati = Nativo.getSupportedFormats ? await Nativo.getSupportedFormats() : ["qr_code"];
      if (formati.includes("qr_code")) {
        const rilevatore = new Nativo({ formats: ["qr_code"] });
        return async (video) => {
          const trovati = await rilevatore.detect(video);
          return trovati[0]?.rawValue ?? null;
        };
      }
    } catch {
      /* si passa a jsQR */
    }
  }

  let jsQR: typeof import("jsqr").default;
  try {
    jsQR = (await import("jsqr")).default;
  } catch {
    const err = new Error("jsqr");
    err.name = "LettoreNonCaricato";
    throw err;
  }
  const tela = document.createElement("canvas");
  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    const err = new Error("canvas");
    err.name = "LettoreNonCaricato";
    throw err;
  }
  return async (video) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    // Solo la parte del fotogramma che si vede nel riquadro (object-fit:
    // cover): è quella che lo staff inquadra, ed è più piccola da leggere.
    const bw = video.clientWidth || vw;
    const bh = video.clientHeight || vh;
    const scala = Math.max(bw / vw, bh / vh);
    const sw = Math.min(vw, bw / scala);
    const sh = Math.min(vh, bh / scala);
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    const riduzione = Math.min(1, LATO_MAX / Math.max(sw, sh));
    const dw = Math.max(1, Math.round(sw * riduzione));
    const dh = Math.max(1, Math.round(sh * riduzione));
    if (tela.width !== dw) tela.width = dw;
    if (tela.height !== dh) tela.height = dh;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
    const immagine = ctx.getImageData(0, 0, dw, dh);
    return jsQR(immagine.data, dw, dh, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

/** Il giro di lettura: un fotogramma, una pausa, il successivo. Torna la funzione che lo ferma. */
function avviaCiclo(video: HTMLVideoElement, leggi: Lettore, suLettura: (testo: string) => void): () => void {
  let vivo = true;
  let timer: number | null = null;
  const passo = async () => {
    if (!vivo) return;
    if (video.readyState >= 2 && !document.hidden) {
      try {
        const testo = await leggi(video);
        if (vivo && testo) suLettura(testo);
      } catch {
        /* un fotogramma perso non ferma il giro */
      }
    }
    if (vivo) timer = window.setTimeout(passo, INTERVALLO_LETTURA);
  };
  timer = window.setTimeout(passo, INTERVALLO_LETTURA);
  return () => {
    vivo = false;
    if (timer !== null) window.clearTimeout(timer);
  };
}

type ContestoAudio = typeof AudioContext;

/** Un segnale breve: due note in salita (ok), due uguali (attenzione), una grave (errore). */
function suona(ctx: AudioContext, tono: Tono) {
  const note: [number, number, number][] =
    tono === "ok"
      ? [
          [880, 0, 0.09],
          [1320, 0.1, 0.12],
        ]
      : tono === "attenzione"
        ? [
            [523, 0, 0.12],
            [523, 0.2, 0.12],
          ]
        : [[196, 0, 0.32]];
  const t0 = ctx.currentTime + 0.01;
  for (const [frequenza, da, durata] of note) {
    const osc = ctx.createOscillator();
    const volume = ctx.createGain();
    osc.type = tono === "errore" ? "square" : "sine";
    osc.frequency.value = frequenza;
    const picco = tono === "errore" ? 0.07 : 0.2;
    volume.gain.setValueAtTime(0.0001, t0 + da);
    volume.gain.exponentialRampToValueAtTime(picco, t0 + da + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, t0 + da + durata);
    osc.connect(volume).connect(ctx.destination);
    osc.start(t0 + da);
    osc.stop(t0 + da + durata + 0.02);
  }
}

const TONO: Record<Risultato["tipo"], Tono> = {
  entrato: "ok",
  gia_entrato: "attenzione",
  lista_attesa: "attenzione",
  altra_giornata: "attenzione",
  non_trovato: "errore",
  non_biglietto: "errore",
  errore: "errore",
  classe: "ok",
  classe_entrata: "ok",
};

/** La scheda di una classe è in ambra quando c'è qualcosa da decidere. */
function classeDaControllare(r: Risultato): boolean {
  const c = r.classe;
  if (!c) return true;
  return Boolean(r.cambiata) || c.stato !== "confermato" || (c.presenti !== null && c.presenti >= c.posti);
}

/** Il segnale di un esito: per la scheda di una classe dipende da com'è messa. */
function tonoPer(r: Risultato): Tono {
  if (r.tipo === "classe") return classeDaControllare(r) ? "attenzione" : "ok";
  return TONO[r.tipo];
}

/** La chiave degli ingressi forzati di una classe: le righe delle classi sono un'altra tabella. */
const chiaveClasse = (bridgeId: string) => `classe:${bridgeId}`;

/** "Classe 4B", anche se nel modulo è stato scritto "classe 4B". */
const nomeDellaClasse = (classe: string) => {
  const t = classe.trim();
  return /^classe\b/i.test(t) ? `Classe${t.slice(6)}` : `Classe ${t}`;
};

/** "classe 4B", dentro una frase ("l'ingresso della classe 4B"): la sezione resta maiuscola. */
const classeInFrase = (classe: string) => `c${nomeDellaClasse(classe).slice(1)}`;

/** "Liceo Archita, Taranto". */
const scuolaConComune = (c: { istituto: string; comune: string | null }) =>
  `${c.istituto.trim()}${c.comune ? `, ${c.comune.trim()}` : ""}`;

/** Le persone della classe che entrano adesso, se nessuno le cambia. */
function entranoPredefinite(c: SchedaClasse): number {
  if (c.presenti === null) return c.posti;
  return c.presenti < c.posti ? c.posti - c.presenti : 1;
}

/** Quante persone di una classe possono ancora entrare: la tabella ne accetta al massimo 60. */
const MAX_PRESENTI_CLASSE = 60;

/** Un codice arrivato mentre la scheda di una classe aspetta il numero: non la sostituisce. */
const TESTO_SCHEDA_APERTA =
  "Prima completa la scheda della classe, oppure chiudila con Chiudi (o con Esc). Poi leggi di nuovo questo codice.";

/** Un codice finito nel campo del numero della scheda (lettore USB): non registra niente. */
const TESTO_CODICE_NEL_NUMERO =
  "Nel campo del numero è arrivato un codice: non ho registrato niente. Scrivi il numero e conferma, oppure chiudi la scheda e leggi di nuovo il codice.";

const nomeCompleto = (p?: { nome: string; cognome: string }) => (p ? `${p.nome} ${p.cognome}`.trim() : "");

/** "Liceo Archita, classe 4B": organizzazione e classe in una riga. */
function provenienza(p: Persona): string {
  const classe = p.classe ? (/^classe\b/i.test(p.classe) ? p.classe : `classe ${p.classe}`) : null;
  return [p.organizzazione, classe].filter(Boolean).join(", ");
}

/**
 * Una giornata con l'articolo giusto, anche con le preposizioni: "il 10
 * dicembre", "l'11 dicembre"; "del 10", "dell'11"; "al 10", "all'11".
 */
function conArticolo(slug: string, preposizione: "" | "di" | "a" = ""): string {
  const frase = giornateConArticolo([slug]);
  if (!frase || !preposizione) return frase;
  const apostrofo = frase.startsWith("l'");
  const resto = apostrofo ? frase.slice(2) : frase.replace(/^il /, "");
  if (preposizione === "di") return apostrofo ? `dell'${resto}` : `del ${resto}`;
  return apostrofo ? `all'${resto}` : `al ${resto}`;
}

/** "l'11 dicembre" dalle etichette che manda il server. */
function altreConArticolo(etichette: string[] = []): string {
  const slugs = SESSIONS.filter((s) => etichette.includes(s.etichetta)).map((s) => s.slug);
  return slugs.length ? giornateConArticolo(slugs) : etichette.join(", ");
}

function annuncioPer(r: Risultato): string {
  const nome = nomeCompleto(r.persona);
  switch (r.tipo) {
    case "entrato":
      return `Ingresso confermato: ${nome}.`;
    case "gia_entrato":
      return `Ingresso già registrato alle ${oraBreve(r.ora)}: ${nome}.`;
    case "lista_attesa":
      return `${nome}: in lista d'attesa per oggi.`;
    case "altra_giornata":
      return r.altreGiornate?.length
        ? `${nome}: iscrizione solo per ${altreConArticolo(r.altreGiornate)}.`
        : `${nome}: nessuna giornata nell'iscrizione.`;
    case "non_trovato":
      return "Codice non trovato.";
    case "non_biglietto":
      return "Questo QR non è un biglietto dell'evento.";
    case "errore":
      return r.messaggio ?? "Ingresso non registrato.";
    case "classe": {
      const c = r.classe;
      if (!c) return "Classe trovata.";
      // La scheda riaperta dopo "Correggi il numero": prima di tutto, com'è andata.
      if (r.messaggio) return r.messaggio;
      const chi = `${nomeDellaClasse(c.classe)}, ${c.istituto}`;
      if (r.cambiata) return `${chi}: i numeri sono cambiati nel frattempo, controlla e conferma di nuovo.`;
      if (c.stato === "lista_attesa") return `${chi}: in lista d'attesa per oggi.`;
      if (c.stato === "altra_giornata") return `${chi}: nessuna prenotazione per oggi.`;
      if (c.presenti !== null) return `${chi}: già entrate ${c.presenti} persone su ${c.posti}.`;
      return `${chi}: confermata, ${c.posti} persone. Indica quante entrano.`;
    }
    case "classe_entrata": {
      const c = r.classe;
      return c ? `Ingresso registrato: ${nomeDellaClasse(c.classe)}, ${c.presenti ?? 0} di ${c.posti} entrati.` : "Ingresso registrato.";
    }
  }
}

/**
 * Gli ingressi forzati registrati da questo telefono (bridgeId -> perché),
 * per annullarli bene anche dall'elenco degli ultimi ingressi. Sta fuori dal
 * componente: nel pannello la scheda Ingresso si smonta a ogni cambio di
 * scheda, e la mappa deve sopravvivere. Si copia anche in sessionStorage,
 * così resiste a un ricaricamento della pagina.
 */
const FORZATI = (() => {
  const CHIAVE = "vpl-ingressi-forzati";
  const mappa = new Map<string, Forzato>();
  if (typeof window !== "undefined") {
    try {
      const salvati = JSON.parse(window.sessionStorage.getItem(CHIAVE) ?? "[]") as [string, Forzato][];
      for (const [k, v] of salvati) if (v === "lista_attesa" || v === "altra_giornata") mappa.set(k, v);
    } catch {
      /* sessionStorage non disponibile: resta la mappa in memoria */
    }
  }
  const salva = () => {
    try {
      window.sessionStorage.setItem(CHIAVE, JSON.stringify([...mappa].slice(-200)));
    } catch {
      /* niente */
    }
  };
  return {
    get: (k: string) => mappa.get(k),
    set: (k: string, v: Forzato) => {
      mappa.set(k, v);
      salva();
    },
    delete: (k: string) => {
      mappa.delete(k);
      salva();
    },
  };
})();

/* ── Componente ───────────────────────────────────────────────────────── */

export function Ingresso({
  compatto = false,
  oggi: oggiDalServer,
}: {
  compatto?: boolean;
  /** La giornata di oggi secondo il server (fuso di Roma), o null se oggi non c'è evento. */
  oggi: string | null;
}) {
  const idGruppo = useId();
  // Il primo valore viene dalla pagina (stesso valore sul server e nel
  // browser: niente errore di idratazione). Poi lo aggiorna ogni lettura dei
  // numeri: un pannello lasciato aperto dalla sera prima non resta fermo a ieri.
  const [oggiCorrente, setOggiCorrente] = useState<string | null>(oggiDalServer);
  const oggi = oggiCorrente && sessionBySlug(oggiCorrente) ? oggiCorrente : null;
  const [giornata, setGiornata] = useState<string>(() => oggi ?? SESSIONS[0].slug);

  const [stato, setStato] = useState<StatoGiornata | null>(null);
  const [erroreStato, setErroreStato] = useState<string | null>(null);
  const [accessoScaduto, setAccessoScaduto] = useState(false);
  const [aggiornatoAlle, setAggiornatoAlle] = useState<string | null>(null);

  const [supporto, setSupporto] = useState<Supporto | null>(null);
  const [camera, setCamera] = useState<StatoCamera>("spenta");
  const [erroreCamera, setErroreCamera] = useState("");
  const [torcia, setTorcia] = useState({ disponibile: false, accesa: false });
  const [piuFotocamere, setPiuFotocamere] = useState(false);

  const [risultato, setRisultato] = useState<Risultato | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [codice, setCodice] = useState("");
  /** La scheda di classe (il suo `n`) aperta quando un codice è stato fermato: il messaggio vale finché resta lei. */
  const [codiceFermo, setCodiceFermo] = useState<number | null>(null);
  const [annuncio, setAnnuncio] = useState("");
  const [suono, setSuono] = useState(true);
  const [online, setOnline] = useState(true);

  const [daAnnullare, setDaAnnullare] = useState<string | null>(null);
  const [annullando, setAnnullando] = useState<string | null>(null);
  const [esitoUltimi, setEsitoUltimi] = useState<{ tono: "ok" | "errore"; testo: string } | null>(null);

  const [ricerca, setRicerca] = useState("");
  const [trovati, setTrovati] = useState<Trovato[] | null>(null);
  const [trovateClassi, setTrovateClassi] = useState<TrovataClasse[]>([]);
  const [classiNonLette, setClassiNonLette] = useState(false);
  const [troppi, setTroppi] = useState(false);
  const [cercando, setCercando] = useState(false);
  const [erroreRicerca, setErroreRicerca] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const palcoRef = useRef<HTMLElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fermaCicloRef = useRef<(() => void) | null>(null);
  const lettoreRef = useRef<Promise<Lettore> | null>(null);
  const avvioRef = useRef(false);
  const riprendiRef = useRef(false);
  const montatoRef = useRef(false);
  const occupatoRef = useRef(false);
  const giornataRef = useRef(giornata);
  const ultimoLettoRef = useRef<{ testo: string; t: number } | null>(null);
  const progressivoRef = useRef(0);
  const richiestaStatoRef = useRef(0);
  const richiestaRicercaRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const suonoRef = useRef(true);
  const letturaRef = useRef<(testo: string) => void>(() => {});
  /** La scheda di una classe aspetta il numero: intanto la fotocamera non legge altri QR. */
  const schedaApertaRef = useRef(false);

  const sessione = sessionBySlug(giornata) ?? SESSIONS[0];

  /* ── Numeri della giornata ── */

  const aggiornaStato = useCallback(async () => {
    const g = giornataRef.current;
    const n = ++richiestaStatoRef.current;
    try {
      const r = await chiama(`${API}?giornata=${encodeURIComponent(g)}`, undefined, 12_000);
      if (!montatoRef.current || n !== richiestaStatoRef.current || g !== giornataRef.current) return;
      if (!r.ok) {
        setAccessoScaduto(r.status === 401 || r.status === 403);
        setErroreStato(erroreDa(r.json, "Non riesco a leggere i numeri della giornata."));
        return;
      }
      const letto = r.json as unknown as StatoGiornata;
      setStato(letto);
      if (letto.oggi !== undefined) setOggiCorrente(letto.oggi && sessionBySlug(letto.oggi) ? letto.oggi : null);
      setErroreStato(null);
      setAccessoScaduto(false);
      setAggiornatoAlle(oraAdesso());
    } catch (err) {
      if (montatoRef.current && n === richiestaStatoRef.current) setErroreStato(messaggioRete(err));
    }
  }, []);

  /* ── Segnali: suono e vibrazione ── */

  /** iPhone apre l'audio solo dentro un tocco: si chiama dai pulsanti. */
  const sbloccaAudio = useCallback(() => {
    if (!suonoRef.current) return;
    try {
      if (!audioRef.current) {
        const Costruttore =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: ContestoAudio }).webkitAudioContext;
        if (!Costruttore) return;
        audioRef.current = new Costruttore();
      }
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
    } catch {
      /* senza audio si va avanti */
    }
  }, []);

  const segnala = useCallback((tono: Tono) => {
    try {
      navigator.vibrate?.(tono === "ok" ? 70 : tono === "attenzione" ? [90, 70, 90] : 260);
    } catch {
      /* niente vibrazione su iPhone */
    }
    const ctx = audioRef.current;
    if (suonoRef.current && ctx && ctx.state === "running") {
      try {
        suona(ctx, tono);
      } catch {
        /* niente suono */
      }
    }
  }, []);

  const mostra = useCallback(
    (r: Omit<Risultato, "n">) => {
      const completo: Risultato = { ...r, n: ++progressivoRef.current };
      setRisultato(completo);
      setAnnuncio(annuncioPer(completo));
      segnala(tonoPer(completo));
    },
    [segnala],
  );

  // Sul telefono chi ha cercato per nome può avere il palco fuori schermo:
  // l'esito deve vedersi subito. Se è già visibile non si muove niente. Dopo
  // il render, non in mostra(): la carta di una classe è più alta, e lo
  // scorrimento calcolato sul palco di prima la lascerebbe mezza fuori.
  const esitoMostrato = risultato?.n;
  useEffect(() => {
    if (esitoMostrato === undefined) return;
    try {
      const piano = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      palcoRef.current?.scrollIntoView({ block: "nearest", behavior: piano ? "auto" : "smooth" });
    } catch {
      /* browser vecchi: l'esito resta dov'è */
    }
  }, [esitoMostrato]);

  /* ── Ingresso ── */

  const verifica = useCallback(
    async (chiave: Chiave, forza = false, nota?: string, notaAttenzione = false) => {
      if (occupatoRef.current) return;
      occupatoRef.current = true;
      setInCorso(true);
      const g = giornataRef.current;
      const letto = "codice" in chiave ? chiave.codice.trim().slice(0, 48) : undefined;
      try {
        const r = await chiama(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...chiave, giornata: g, forza }),
        });
        if (!montatoRef.current || g !== giornataRef.current) return;
        if (!r.ok) {
          const accesso = r.status === 401 || r.status === 403;
          if (accesso) setAccessoScaduto(true);
          mostra({
            tipo: "errore",
            giornata: g,
            chiave,
            forza,
            letto,
            accesso,
            messaggio: erroreDa(r.json, "L'ingresso non è stato registrato. Riprova."),
          });
          return;
        }
        const j = r.json as unknown as RispostaIngresso;
        if (j.esito === "classe" && j.classe) {
          // La scheda della classe: si scrive solo quando il volontario dice quante persone entrano.
          mostra({
            tipo: "classe",
            giornata: g,
            chiave: { classe: j.classe.id },
            classe: j.classe,
            cambiata: j.cambiata,
            messaggio: nota,
            messaggioAttenzione: notaAttenzione,
          });
          return;
        }
        if (j.esito === "entrato" && j.bridgeId && j.forzato) FORZATI.set(j.bridgeId, j.forzato);
        mostra({
          tipo: j.esito,
          giornata: g,
          chiave,
          forza,
          letto,
          persona: j.persona,
          ora: j.ora ?? null,
          altreGiornate: j.altreGiornate ?? [],
          bridgeId: j.bridgeId,
          forzato: j.forzato,
        });
        if (j.esito === "entrato") void aggiornaStato();
      } catch (err) {
        if (montatoRef.current && g === giornataRef.current) {
          mostra({ tipo: "errore", giornata: g, chiave, forza, letto, rete: true, messaggio: messaggioRete(err) });
        }
      } finally {
        occupatoRef.current = false;
        if (montatoRef.current) setInCorso(false);
      }
    },
    [aggiornaStato, mostra],
  );

  /**
   * Le persone di una classe che entrano adesso. `prima` è quante ne mostrava
   * la scheda: se nel frattempo è cambiato, la rotta non scrive niente e
   * rimanda la scheda aggiornata. Se la risposta si perde, "Riprova" riapre
   * la scheda com'è adesso, invece di registrare di nuovo.
   */
  const entraClasse = useCallback(
    async (c: SchedaClasse, entrano: number, forza: boolean) => {
      if (occupatoRef.current) return;
      occupatoRef.current = true;
      setInCorso(true);
      const g = giornataRef.current;
      const chiave: Chiave = { classe: c.id };
      try {
        const r = await chiama(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classe: c.id, giornata: g, entrano, prima: c.presenti, forza }),
        });
        if (!montatoRef.current || g !== giornataRef.current) return;
        if (!r.ok) {
          const accesso = r.status === 401 || r.status === 403;
          if (accesso) setAccessoScaduto(true);
          mostra({
            tipo: "errore",
            giornata: g,
            chiave,
            accesso,
            messaggio: erroreDa(r.json, "L'ingresso della classe non è stato registrato. Riprova."),
          });
          return;
        }
        const j = r.json as unknown as RispostaIngresso;
        if (j.esito === "classe_entrata" && j.classe) {
          if (j.bridgeId && j.forzato) FORZATI.set(chiaveClasse(j.bridgeId), j.forzato);
          mostra({
            tipo: "classe_entrata",
            giornata: g,
            chiave,
            classe: j.classe,
            entrati: j.entrati ?? entrano,
            prima: j.prima ?? null,
            bridgeId: j.bridgeId ?? j.classe.bridgeId ?? undefined,
            forzato: j.forzato,
          });
          void aggiornaStato();
        } else if (j.esito === "classe" && j.classe) {
          mostra({ tipo: "classe", giornata: g, chiave, classe: j.classe, cambiata: j.cambiata });
        } else {
          mostra({ tipo: j.esito === "non_trovato" ? "non_trovato" : "errore", giornata: g, chiave, messaggio: "La classe non risulta più." });
        }
      } catch (err) {
        if (montatoRef.current && g === giornataRef.current) {
          mostra({
            tipo: "errore",
            giornata: g,
            chiave,
            rete: true,
            messaggio: `${messaggioRete(err)} L'ingresso della classe potrebbe essere stato salvato: tocca Riprova per vedere quante persone risultano entrate, prima di registrarle di nuovo.`,
          });
        }
      } finally {
        occupatoRef.current = false;
        if (montatoRef.current) setInCorso(false);
      }
    },
    [aggiornaStato, mostra],
  );

  // Mentre la scheda di una classe aspetta il numero, la fotocamera non la sostituisce con un altro QR.
  useEffect(() => {
    schedaApertaRef.current = risultato?.tipo === "classe";
  }, [risultato]);

  // Il giro della fotocamera chiama sempre la versione aggiornata.
  useEffect(() => {
    letturaRef.current = (grezzo: string) => {
      const testo = grezzo.trim();
      if (!testo || schedaApertaRef.current) return;
      const adesso = Date.now();
      const ultimo = ultimoLettoRef.current;
      if (ultimo && ultimo.testo === testo && adesso - ultimo.t < PAUSA_STESSO_CODICE) {
        // Sempre lo stesso biglietto davanti alla fotocamera: si allunga la pausa.
        ultimo.t = adesso;
        return;
      }
      if (occupatoRef.current) return;
      ultimoLettoRef.current = { testo, t: adesso };
      if (!sembraBiglietto(testo)) {
        mostra({ tipo: "non_biglietto", giornata: giornataRef.current });
        return;
      }
      void verifica({ codice: testo });
    };
  }, [mostra, verifica]);

  /* ── Fotocamera ── */

  const fermaCamera = useCallback((aggiornaInterfaccia = true) => {
    fermaCicloRef.current?.();
    fermaCicloRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    if (aggiornaInterfaccia && montatoRef.current) {
      setCamera("spenta");
      setTorcia({ disponibile: false, accesa: false });
    }
  }, []);

  const avviaCamera = useCallback(
    async (deviceId?: string | null) => {
      const video = videoRef.current;
      if (!video || avvioRef.current) return;
      if (!window.isSecureContext) {
        setSupporto("https");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setSupporto("browser");
        return;
      }
      avvioRef.current = true;
      fermaCamera(false);
      setCamera("avvio");
      setErroreCamera("");
      const preferita = deviceId === undefined ? leggiPreferenza(CHIAVE_FOTOCAMERA) : deviceId;
      try {
        if (!lettoreRef.current) lettoreRef.current = creaLettore();
        const lettoreInArrivo = lettoreRef.current;

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(vincoliVideo(preferita));
        } catch (err) {
          const nome = err instanceof Error || err instanceof DOMException ? err.name : "";
          if (preferita && ["OverconstrainedError", "NotFoundError", "NotReadableError"].includes(nome)) {
            // La fotocamera scelta l'altra volta non c'è più: si torna a quella posteriore.
            scriviPreferenza(CHIAVE_FOTOCAMERA, null);
            stream = await navigator.mediaDevices.getUserMedia(vincoliVideo(null));
          } else if (nome === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          } else {
            throw err;
          }
        }
        if (!montatoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (document.hidden) {
          // La pagina è andata in secondo piano mentre la fotocamera partiva:
          // si spegne subito e riparte al ritorno.
          stream.getTracks().forEach((t) => t.stop());
          riprendiRef.current = true;
          setCamera("spenta");
          return;
        }
        streamRef.current = stream;
        video.muted = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.srcObject = stream;
        await video.play();

        let lettore: Lettore;
        try {
          lettore = await lettoreInArrivo;
        } catch (err) {
          lettoreRef.current = null;
          throw err;
        }
        if (!montatoRef.current || streamRef.current !== stream) return;

        const traccia = stream.getVideoTracks()[0];
        const capacita = (traccia?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          torch?: boolean;
          focusMode?: string[];
        };
        if (capacita.focusMode?.includes("continuous")) {
          traccia
            .applyConstraints({ advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet] })
            .catch(() => {});
        }
        setTorcia({ disponibile: Boolean(capacita.torch), accesa: false });
        setCamera("attiva");
        fermaCicloRef.current = avviaCiclo(video, lettore, (testo) => letturaRef.current(testo));

        navigator.mediaDevices
          .enumerateDevices()
          .then((d) => {
            if (montatoRef.current) setPiuFotocamere(d.filter((x) => x.kind === "videoinput").length > 1);
          })
          .catch(() => {});
      } catch (err) {
        fermaCamera(false);
        if (montatoRef.current) {
          setCamera("errore");
          setErroreCamera(messaggioFotocamera(err));
        }
      } finally {
        avvioRef.current = false;
      }
    },
    [fermaCamera],
  );

  const avviaDaTocco = () => {
    sbloccaAudio();
    void avviaCamera();
  };

  const cambiaFotocamera = async () => {
    const traccia = streamRef.current?.getVideoTracks()[0];
    try {
      const dispositivi = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      if (dispositivi.length < 2) return;
      const attuale = traccia?.getSettings().deviceId;
      const i = dispositivi.findIndex((d) => d.deviceId === attuale);
      const prossima = dispositivi[(i + 1) % dispositivi.length].deviceId;
      scriviPreferenza(CHIAVE_FOTOCAMERA, prossima);
      await avviaCamera(prossima);
    } catch {
      /* resta la fotocamera di prima */
    }
  };

  const cambiaTorcia = async () => {
    const traccia = streamRef.current?.getVideoTracks()[0];
    if (!traccia) return;
    const accesa = !torcia.accesa;
    try {
      await traccia.applyConstraints({ advanced: [{ torch: accesa } as unknown as MediaTrackConstraintSet] });
      setTorcia((t) => ({ ...t, accesa }));
    } catch {
      setTorcia({ disponibile: false, accesa: false });
    }
  };

  const cambiaSuono = () => {
    const nuovo = !suono;
    setSuono(nuovo);
    suonoRef.current = nuovo;
    scriviPreferenza(CHIAVE_SUONO, nuovo ? "1" : "0");
    if (nuovo) sbloccaAudio();
  };

  /* ── Montaggio, giornata, visibilità ── */

  useEffect(() => {
    montatoRef.current = true;
    const ok = window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
    setSupporto(!window.isSecureContext ? "https" : ok ? "si" : "browser");
    setOnline(navigator.onLine);
    const preferenza = leggiPreferenza(CHIAVE_SUONO);
    if (preferenza === "0") {
      setSuono(false);
      suonoRef.current = false;
    }
    // Sul computer (mouse, magari un lettore USB) il campo del codice è pronto.
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      campoRef.current?.focus({ preventScroll: true });
    }
    // Senza BarcodeDetector serve jsQR: lo si scarica subito, prima del primo biglietto.
    if (!("BarcodeDetector" in window)) void import("jsqr").catch(() => {});

    const suOnline = () => setOnline(true);
    const suOffline = () => setOnline(false);
    window.addEventListener("online", suOnline);
    window.addEventListener("offline", suOffline);
    return () => {
      montatoRef.current = false;
      window.removeEventListener("online", suOnline);
      window.removeEventListener("offline", suOffline);
      fermaCamera(false);
      void audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    };
  }, [fermaCamera]);

  useEffect(() => {
    giornataRef.current = giornata;
    void aggiornaStato();
    const timer = window.setInterval(() => {
      if (!document.hidden) void aggiornaStato();
    }, AGGIORNA_OGNI);
    return () => window.clearInterval(timer);
  }, [giornata, aggiornaStato]);

  useEffect(() => {
    const cambia = () => {
      if (document.hidden) {
        if (streamRef.current) {
          riprendiRef.current = true;
          fermaCamera();
        }
      } else {
        void aggiornaStato();
        if (riprendiRef.current) {
          riprendiRef.current = false;
          void avviaCamera();
        }
      }
    };
    const via = () => fermaCamera();
    document.addEventListener("visibilitychange", cambia);
    window.addEventListener("pagehide", via);
    return () => {
      document.removeEventListener("visibilitychange", cambia);
      window.removeEventListener("pagehide", via);
    };
  }, [aggiornaStato, avviaCamera, fermaCamera]);

  // L'esito verde torna da solo alla fotocamera; gli altri aspettano lo staff.
  useEffect(() => {
    if (risultato?.tipo !== "entrato" && risultato?.tipo !== "classe_entrata") return;
    const n = risultato.n;
    const timer = window.setTimeout(() => {
      setRisultato((r) => (r?.n === n ? null : r));
    }, CHIUSURA_VERDE);
    return () => window.clearTimeout(timer);
  }, [risultato]);

  // Il fuoco dopo ogni esito. Quando una carta cambia o si chiude, il
  // pulsante premuto sparisce con lei e il fuoco finirebbe sulla pagina.
  // Sul computer torna al campo del codice, così il lettore USB legge subito
  // il biglietto dopo (se il fuoco è altrove, per esempio nella ricerca per
  // nome, resta lì). Sul telefono la scheda di una classe prende il fuoco
  // lei, non il suo pulsante: la tastiera si chiude e lo screen reader la
  // legge per prima, ma un Invio non la conferma.
  useEffect(() => {
    const attivo = document.activeElement;
    const perso = !attivo || attivo === document.body;
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      if (perso) campoRef.current?.focus({ preventScroll: true });
    } else if (perso || risultato?.tipo === "classe") {
      palcoRef.current?.querySelector<HTMLElement>(".ing-esito-di-classe")?.focus({ preventScroll: true });
    }
  }, [risultato]);

  useEffect(() => {
    if (!risultato) return;
    const tasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRisultato(null);
    };
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, [risultato]);

  const cambiaGiornata = (slug: string) => {
    if (slug === giornata) return;
    giornataRef.current = slug;
    ultimoLettoRef.current = null;
    setGiornata(slug);
    setStato(null);
    setErroreStato(null);
    setRisultato(null);
    setTrovati(null);
    setTrovateClassi([]);
    setClassiNonLette(false);
    setTroppi(false);
    setErroreRicerca(null);
    setDaAnnullare(null);
    setEsitoUltimi(null);
  };

  /** Chiude l'esito; sul computer il campo del codice torna pronto (lettore USB). */
  const chiudiEsito = useCallback(() => {
    setRisultato(null);
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      campoRef.current?.focus({ preventScroll: true });
    }
  }, []);

  /* ── Codice scritto a mano ── */

  const inviaCodice = (e: FormEvent) => {
    e.preventDefault();
    const testo = codice.trim();
    if (!testo) return;
    // La scheda di una classe aspetta il numero: un codice scritto o letto dal
    // lettore USB non la sostituisce (come per la fotocamera). Il campo si
    // svuota, così il codice dopo non si attacca a questo.
    if (schedaApertaRef.current) {
      sbloccaAudio();
      setCodice("");
      setCodiceFermo(risultato?.n ?? null);
      setAnnuncio(TESTO_SCHEDA_APERTA);
      segnala("attenzione");
      campoRef.current?.focus({ preventScroll: true });
      return;
    }
    if (inCorso) return;
    sbloccaAudio();
    setCodice("");
    // Il codice scritto a mano vale sempre, anche se è lo stesso di prima.
    ultimoLettoRef.current = { testo, t: Date.now() };
    void verifica({ codice: testo });
    campoRef.current?.focus({ preventScroll: true });
  };

  /* ── Annullare un ingresso ── */

  const annullaIngresso = async (bridgeId: string, nome: string, forzato?: Forzato) => {
    setAnnullando(bridgeId);
    setEsitoUltimi(null);
    // Com'era entrata la persona: dall'esito, oppure da quello che questo telefono ricorda.
    const tipo = forzato ?? FORZATI.get(bridgeId);
    try {
      const r = await chiama(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tipo ? { annulla: bridgeId, forzato: tipo } : { annulla: bridgeId }),
      });
      if (!montatoRef.current) return;
      if (!r.ok) {
        const testo = erroreDa(r.json, "L'annullamento non è riuscito. Riprova.");
        setEsitoUltimi({ tono: "errore", testo });
        setAnnuncio(testo);
        return;
      }
      FORZATI.delete(bridgeId);
      const testo = r.json?.giornataTolta
        ? `Ingresso di ${nome} annullato: la giornata aggiunta alla porta è stata tolta.`
        : r.json?.tornaInAttesa
          ? `Ingresso di ${nome} annullato: torna in lista d'attesa.`
          : `Ingresso di ${nome} annullato.`;
      setEsitoUltimi({ tono: "ok", testo });
      setAnnuncio(testo);
      setRisultato((r2) => (r2?.bridgeId === bridgeId ? null : r2));
      // Dopo un annullamento lo stesso biglietto si può leggere subito.
      ultimoLettoRef.current = null;
      void aggiornaStato();
    } catch (err) {
      if (montatoRef.current) setEsitoUltimi({ tono: "errore", testo: messaggioRete(err) });
    } finally {
      if (montatoRef.current) {
        setAnnullando(null);
        setDaAnnullare(null);
      }
    }
  };

  /**
   * Annulla l'ingresso di una classe, o solo gli ultimi entrati: le persone
   * tornano da `da` ad `a` (null: nessuna). Se nel frattempo il numero è
   * cambiato, la rotta non tocca niente e lo dice. Restituisce com'è andata,
   * per la scheda della classe che l'ha chiesto ("Correggi il numero").
   */
  const annullaIngressoClasse = async (
    bridgeId: string,
    nome: string,
    da: number,
    a: number | null,
    forzato?: Forzato,
  ): Promise<{ ok: boolean; testo: string }> => {
    setAnnullando(bridgeId);
    setEsitoUltimi(null);
    const tipo = forzato ?? FORZATI.get(chiaveClasse(bridgeId));
    try {
      const r = await chiama(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annullaClasse: bridgeId, da, a, ...(tipo ? { forzato: tipo } : {}) }),
      });
      if (!montatoRef.current) return { ok: false, testo: "" };
      if (!r.ok) {
        const testo = erroreDa(r.json, "L'annullamento non è riuscito. Riprova.");
        setEsitoUltimi({ tono: "errore", testo });
        setAnnuncio(testo);
        if (r.status === 409) void aggiornaStato();
        return { ok: false, testo };
      }
      if (a === null) FORZATI.delete(chiaveClasse(bridgeId));
      const testo = r.json?.giornataTolta
        ? `Ingresso della ${nome} annullato: la giornata aggiunta alla porta è stata tolta.`
        : r.json?.tornaInAttesa
          ? `Ingresso della ${nome} annullato: torna in lista d'attesa.`
          : a === null
            ? `Ingresso della ${nome} annullato.`
            : `Annullati gli ultimi ${da - a} ingressi della ${nome}: ora ne risultano ${a}.`;
      setEsitoUltimi({ tono: "ok", testo });
      setAnnuncio(testo);
      setRisultato((r2) => (r2?.bridgeId === bridgeId ? null : r2));
      ultimoLettoRef.current = null;
      void aggiornaStato();
      return { ok: true, testo };
    } catch (err) {
      const testo = messaggioRete(err);
      if (montatoRef.current) setEsitoUltimi({ tono: "errore", testo });
      return { ok: false, testo };
    } finally {
      if (montatoRef.current) {
        setAnnullando(null);
        setDaAnnullare(null);
      }
    }
  };

  /* ── Biglietto dimenticato: ricerca per nome ── */

  useEffect(() => {
    const testo = ricerca.trim();
    if (testo.replace(/[^\p{L}]/gu, "").length < 3) {
      richiestaRicercaRef.current++;
      setTrovati(null);
      setTrovateClassi([]);
      setClassiNonLette(false);
      setTroppi(false);
      setErroreRicerca(null);
      setCercando(false);
      return;
    }
    const n = ++richiestaRicercaRef.current;
    setCercando(true);
    const timer = window.setTimeout(async () => {
      try {
        const r = await chiama(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cerca: testo, giornata: giornataRef.current }),
        });
        if (!montatoRef.current || n !== richiestaRicercaRef.current) return;
        if (!r.ok) {
          setErroreRicerca(erroreDa(r.json, "La ricerca non è riuscita. Riprova."));
          setTrovati(null);
          setTrovateClassi([]);
          return;
        }
        setErroreRicerca(null);
        setTrovati((r.json?.risultati as Trovato[]) ?? []);
        setTrovateClassi((r.json?.classi as TrovataClasse[] | undefined) ?? []);
        setClassiNonLette(Boolean(r.json?.classiNonLette));
        setTroppi(Boolean(r.json?.troppi));
      } catch (err) {
        if (montatoRef.current && n === richiestaRicercaRef.current) setErroreRicerca(messaggioRete(err));
      } finally {
        if (montatoRef.current && n === richiestaRicercaRef.current) setCercando(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [ricerca, giornata]);

  const entraDaRicerca = (t: Trovato) => {
    sbloccaAudio();
    void verifica({ registrazione: t.rif }).then(() => {
      // L'elenco mostra lo stato aggiornato al prossimo giro di ricerca.
      setRicerca("");
    });
  };

  /** Una classe trovata per nome: si apre la sua scheda, come leggendo il QR. */
  const apriClasseDaRicerca = (t: TrovataClasse) => {
    sbloccaAudio();
    void verifica({ classe: t.rif }).then(() => setRicerca(""));
  };

  /* ── Disegno ── */

  const percentuale =
    stato && stato.confermati > 0 ? Math.min(100, Math.round((stato.entrati / stato.confermati) * 100)) : 0;
  const classiOggi = stato?.classi ?? null;
  const conClassi = Boolean(classiOggi && classiOggi.confermate + classiOggi.in_attesa > 0);
  const nessunTrovato = Boolean(trovati && trovati.length === 0 && trovateClassi.length === 0);
  const oggiSessione = oggi ? sessionBySlug(oggi) : undefined;
  const radioName = `ing-giornata-${idGruppo}`;

  return (
    <div className={`ing ${compatto ? "ing-compatto" : "ing-pieno"}`}>
      <style>{STILE_INGRESSO}</style>

      {compatto && (
        <div className="ing-testa">
          <div>
            <h2 className="ing-h2">Ingresso alla porta</h2>
            <p className="ing-sub">
              Leggi il QR del biglietto o scrivi il codice: l&apos;ingresso si registra subito, anche da più
              telefoni insieme. Per una classe, il QR apre la sua scheda e indichi quante persone entrano.
            </p>
          </div>
          <a className="ing-link" href={PAGINA_INGRESSO} target="_blank" rel="noopener">
            <i className="fas fa-up-right-from-square" aria-hidden="true" />{" "}
            Apri a schermo intero
          </a>
        </div>
      )}

      <fieldset className="ing-giorni">
        <legend className="ing-sr">Giornata degli ingressi</legend>
        {SESSIONS.map((s) => {
          const attiva = s.slug === giornata;
          return (
            <label key={s.slug} className="ing-giorno" data-attiva={attiva ? "" : undefined}>
              <input
                type="radio"
                name={radioName}
                value={s.slug}
                checked={attiva}
                onChange={() => cambiaGiornata(s.slug)}
              />
              {oggi === s.slug && <span className="ing-oggi">Oggi</span>}
              <span className="ing-giorno-data">{s.etichetta}</span>
              <span className="ing-giorno-sub">
                {s.giornoLabel.split(" ")[0]}, {s.luogoBreve}
              </span>
            </label>
          );
        })}
      </fieldset>

      {oggiSessione && oggi !== giornata && (
        <div className="ing-avviso ing-avviso-attenzione" role="alert">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <strong>Oggi è {conArticolo(oggiSessione.slug)}.</strong> Stai registrando gli ingressi{" "}
            {conArticolo(sessione.slug, "di")}.{" "}
            <button type="button" className="ing-link-inline" onClick={() => cambiaGiornata(oggiSessione.slug)}>
              Passa {conArticolo(oggiSessione.slug, "a")}
            </button>
          </div>
        </div>
      )}
      {!oggiSessione && (
        <div className="ing-avviso ing-avviso-info">
          <i className="fas fa-circle-info" aria-hidden="true" />
          <div>
            Oggi non è una giornata dell&apos;evento. Se fai una prova, annulla poi gli ingressi che registri
            dall&apos;elenco degli ultimi ingressi.
          </div>
        </div>
      )}
      {!online && (
        <div className="ing-avviso ing-avviso-errore" role="alert">
          <i className="fas fa-wifi" aria-hidden="true" />
          <div>
            <strong>Sei offline.</strong> Gli ingressi non si possono registrare finché la connessione non torna.
          </div>
        </div>
      )}
      {accessoScaduto && (
        <div className="ing-avviso ing-avviso-errore" role="alert">
          <i className="fas fa-lock" aria-hidden="true" />
          <div>
            <strong>Accesso scaduto o non abilitato.</strong>{" "}
            <a href={`/auth/login?returnTo=${encodeURIComponent(PAGINA_INGRESSO)}`}>Accedi di nuovo</a> per
            continuare.
          </div>
        </div>
      )}
      {erroreStato && !accessoScaduto && (
        <div className="ing-avviso ing-avviso-errore" role="alert">
          <i className="fas fa-circle-exclamation" aria-hidden="true" />
          <div>
            {erroreStato}
            {stato && <span className="ing-avviso-nota"> I numeri qui sotto potrebbero non essere aggiornati.</span>}
          </div>
        </div>
      )}

      <div className="ing-corpo">
        <div className="ing-sx">
          {/* ── Il palco: fotocamera ed esito ── */}
          <section ref={palcoRef} className="ing-palco-box" aria-label="Lettura dei biglietti">
            <div
              className="ing-palco"
              data-camera={camera}
              data-classe={risultato?.tipo === "classe" || risultato?.tipo === "classe_entrata" ? "" : undefined}
              aria-busy={inCorso}
            >
              <video ref={videoRef} className="ing-video" playsInline muted autoPlay aria-hidden="true" />

              {camera === "attiva" && (
                <>
                  <div className="ing-mirino" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <i className="ing-mirino-linea" />
                  </div>
                  <div className="ing-chip">
                    <span className={`ing-chip-punto${inCorso ? " ing-chip-punto-lavoro" : ""}`} aria-hidden="true" />
                    {inCorso ? "Verifica in corso" : "Inquadra il QR del biglietto o della classe"}
                  </div>
                  <div className="ing-comandi">
                    {torcia.disponibile && (
                      <button
                        type="button"
                        className="ing-tondo"
                        onClick={cambiaTorcia}
                        aria-pressed={torcia.accesa}
                        aria-label={torcia.accesa ? "Spegni la torcia" : "Accendi la torcia"}
                        title={torcia.accesa ? "Spegni la torcia" : "Accendi la torcia"}
                      >
                        <i className="fas fa-bolt" aria-hidden="true" />
                      </button>
                    )}
                    {piuFotocamere && (
                      <button
                        type="button"
                        className="ing-tondo"
                        onClick={cambiaFotocamera}
                        aria-label="Cambia fotocamera"
                        title="Cambia fotocamera"
                      >
                        <i className="fas fa-camera-rotate" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="ing-tondo"
                      onClick={() => fermaCamera()}
                      aria-label="Spegni la fotocamera"
                      title="Spegni la fotocamera"
                    >
                      <i className="fas fa-video-slash" aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}

              {camera !== "attiva" && (
                <div className="ing-attesa">
                  {supporto === "https" ? (
                    <>
                      <span className="ing-attesa-icona">
                        <i className="fas fa-lock" aria-hidden="true" />
                      </span>
                      <p className="ing-attesa-titolo">Fotocamera solo su https</p>
                      <p className="ing-attesa-testo">
                        Il browser permette la fotocamera solo su una pagina sicura (https). Usa il campo del codice
                        qui sotto.
                      </p>
                    </>
                  ) : supporto === "browser" ? (
                    <>
                      <span className="ing-attesa-icona">
                        <i className="fas fa-video-slash" aria-hidden="true" />
                      </span>
                      <p className="ing-attesa-titolo">Fotocamera non disponibile qui</p>
                      <p className="ing-attesa-testo">
                        Questo browser non può usare la fotocamera. Apri la pagina in Safari o in Chrome, oppure usa
                        il campo del codice qui sotto.
                      </p>
                    </>
                  ) : camera === "avvio" ? (
                    <>
                      <span className="ing-rotella" aria-hidden="true" />
                      <p className="ing-attesa-titolo" role="status">
                        Avvio della fotocamera
                      </p>
                      <p className="ing-attesa-testo">Se il browser lo chiede, consenti l&apos;uso della fotocamera.</p>
                    </>
                  ) : camera === "errore" ? (
                    <>
                      <span className="ing-attesa-icona ing-attesa-icona-errore">
                        <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                      </span>
                      <p className="ing-attesa-titolo" role="alert">
                        Fotocamera non disponibile
                      </p>
                      <p className="ing-attesa-testo">{erroreCamera}</p>
                      <button type="button" className="ing-avvia" onClick={avviaDaTocco}>
                        <i className="fas fa-rotate-right" aria-hidden="true" />{" "}
                        Riprova
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ing-attesa-icona">
                        <i className="fas fa-qrcode" aria-hidden="true" />
                      </span>
                      <p className="ing-attesa-titolo">Leggi i biglietti con la fotocamera</p>
                      <p className="ing-attesa-testo">
                        Inquadra il QR: l&apos;ingresso si registra da solo e la fotocamera resta pronta per la
                        persona successiva.
                      </p>
                      <button type="button" className="ing-avvia" onClick={avviaDaTocco} disabled={supporto === null}>
                        <i className="fas fa-camera" aria-hidden="true" />{" "}
                        Avvia la fotocamera
                      </button>
                    </>
                  )}
                </div>
              )}

              {risultato && (risultato.tipo === "classe" || risultato.tipo === "classe_entrata") && risultato.classe && (
                <CartaClasse
                  key={risultato.n}
                  r={risultato}
                  classe={risultato.classe}
                  fermo={codiceFermo !== null && codiceFermo === risultato.n}
                  inCorso={inCorso}
                  annullando={annullando !== null && annullando === (risultato.bridgeId ?? risultato.classe.bridgeId)}
                  onChiudi={chiudiEsito}
                  onEntra={(n, forza) => {
                    sbloccaAudio();
                    if (risultato.classe) void entraClasse(risultato.classe, n, forza);
                  }}
                  onAnnulla={() => {
                    const c = risultato.classe;
                    if (risultato.bridgeId && c && c.presenti !== null) {
                      void annullaIngressoClasse(
                        risultato.bridgeId,
                        classeInFrase(c.classe),
                        c.presenti,
                        risultato.prima ?? null,
                        risultato.forzato,
                      );
                    }
                  }}
                  onCorreggi={async (a) => {
                    // La scheda di una classe già entrata: le persone tornano al numero giusto
                    // (null: nessuna), poi la scheda si riapre com'è adesso, con l'esito.
                    const c = risultato.classe;
                    if (!c?.bridgeId || c.presenti === null) return { ok: false, testo: "" };
                    const esito = await annullaIngressoClasse(c.bridgeId, classeInFrase(c.classe), c.presenti, a);
                    // Anche se non è riuscita: la scheda si ricarica con il numero di adesso
                    // (un altro telefono può averlo cambiato), e il perché resta in vista.
                    if (montatoRef.current && esito.testo) await verifica({ classe: c.id }, false, esito.testo, !esito.ok);
                    else if (esito.ok && montatoRef.current) await verifica({ classe: c.id }, false);
                    return esito;
                  }}
                />
              )}
              {risultato && risultato.tipo !== "classe" && risultato.tipo !== "classe_entrata" && (
                <CartaEsito
                  key={risultato.n}
                  r={risultato}
                  giornoUno={giornata === SESSIONS[0].slug}
                  inCorso={inCorso}
                  annullando={annullando === risultato.bridgeId}
                  onChiudi={() => setRisultato(null)}
                  onForza={() => {
                    sbloccaAudio();
                    if (risultato.chiave) void verifica(risultato.chiave, true);
                  }}
                  onRiprova={() => {
                    sbloccaAudio();
                    if (risultato.chiave) void verifica(risultato.chiave, Boolean(risultato.forza));
                  }}
                  onAnnulla={() => {
                    if (risultato.bridgeId) {
                      void annullaIngresso(risultato.bridgeId, nomeCompleto(risultato.persona), risultato.forzato);
                    }
                  }}
                />
              )}
            </div>
          </section>

          {/* ── Il codice scritto a mano ── */}
          <form className="ing-box ing-codice" onSubmit={inviaCodice} noValidate>
            <label htmlFor={`${radioName}-codice`} className="ing-label">
              Codice del biglietto o della classe
            </label>
            <div className="ing-riga">
              <input
                ref={campoRef}
                id={`${radioName}-codice`}
                className="ing-campo ing-campo-codice"
                value={codice}
                onChange={(e) => setCodice(e.target.value.toUpperCase())}
                placeholder="VPL-XXXXXXXX"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={64}
                aria-describedby={`${radioName}-codice-aiuto`}
              />
              <button type="submit" className="ing-btn ing-btn-primario" disabled={!codice.trim() || inCorso}>
                {inCorso ? (
                  <span className="ing-rotella ing-rotella-piccola" aria-hidden="true" />
                ) : (
                  <i className="fas fa-arrow-right-to-bracket" aria-hidden="true" />
                )}{" "}
                Verifica
              </button>
            </div>
            <p id={`${radioName}-codice-aiuto`} className="ing-aiuto">
              È scritto sotto il QR, nell&apos;email e sul biglietto stampato. Bastano le 8 lettere e cifre dopo VPL-
              (VPC- per le classi).
            </p>
            {codiceFermo !== null && risultato?.tipo === "classe" && risultato.n === codiceFermo && (
              <p className="ing-msg ing-msg-errore">{TESTO_SCHEDA_APERTA}</p>
            )}
          </form>

          {/* ── Biglietto dimenticato ── */}
          <section className="ing-box ing-cerca" aria-labelledby={`${radioName}-cerca-titolo`}>
            <h3 id={`${radioName}-cerca-titolo`} className="ing-h3">
              Biglietto dimenticato?
            </h3>
            <label htmlFor={`${radioName}-cerca`} className="ing-label">
              Cerca per nome o cognome, o la classe per scuola o docente
            </label>
            <div className="ing-cerca-campo">
              <i className="fas fa-magnifying-glass" aria-hidden="true" />
              <input
                id={`${radioName}-cerca`}
                type="search"
                className="ing-campo"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Es. Rossi, o Archita 4B"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                maxLength={80}
              />
            </div>
            <div aria-live="polite" className="ing-cerca-esiti">
              {cercando && <p className="ing-aiuto">Ricerca in corso…</p>}
              {!cercando && erroreRicerca && <p className="ing-msg ing-msg-errore">{erroreRicerca}</p>}
              {!cercando && nessunTrovato && (
                <p className="ing-aiuto">Nessuna persona o classe trovata con questo nome. Controlla l&apos;ortografia.</p>
              )}
              {!cercando && classiNonLette && (
                <p className="ing-msg ing-msg-errore">Le classi non si sono potute cercare: riprova tra poco.</p>
              )}
              {trovateClassi.length > 0 && (
                <ul className="ing-trovati" aria-label="Classi trovate">
                  {trovateClassi.map((t) => (
                    <li key={t.rif} className="ing-trovato ing-trovato-classe">
                      <div className="ing-trovato-testo">
                        <span className="ing-trovato-nome">
                          <i className="fas fa-users" aria-hidden="true" />{" "}
                          {nomeDellaClasse(t.classe)}, {t.istituto}
                        </span>
                        <span className="ing-trovato-dettagli">
                          {[t.comune, `docente ${t.docente}`, `${t.posti} persone`, t.settore ? `settore ${t.settore}` : null]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                        <StatoClasseOggi t={t} giornata={sessione.slug} />
                      </div>
                      <button
                        type="button"
                        className="ing-btn"
                        onClick={() => apriClasseDaRicerca(t)}
                        disabled={inCorso}
                        aria-label={`Apri la scheda della ${classeInFrase(t.classe)}, ${t.istituto}`}
                      >
                        Apri
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {trovati && trovati.length > 0 && (
                <>
                  <ul className="ing-trovati">
                    {trovati.map((t) => (
                      <li key={t.rif} className="ing-trovato">
                        <div className="ing-trovato-testo">
                          <span className="ing-trovato-nome">{nomeCompleto(t)}</span>
                          <span className="ing-trovato-dettagli">
                            {[t.categoria, provenienza(t)].filter(Boolean).join(", ")}
                          </span>
                          <StatoOggi t={t} giornata={sessione.slug} />
                        </div>
                        <button
                          type="button"
                          className="ing-btn"
                          onClick={() => entraDaRicerca(t)}
                          disabled={inCorso}
                          aria-label={`Verifica l'ingresso di ${nomeCompleto(t)}`}
                        >
                          Verifica
                        </button>
                      </li>
                    ))}
                  </ul>
                  {troppi && (
                    <p className="ing-aiuto">Ci sono altri risultati: scrivi anche il nome per restringere.</p>
                  )}
                </>
              )}
            </div>
            <p className="ing-aiuto">
              Prima di far entrare una persona trovata per nome, chiedi un documento o l&apos;email usata per
              l&apos;iscrizione. Per una classe senza QR, chiedi il nome del docente che l&apos;ha prenotata.
            </p>
          </section>
        </div>

        <div className="ing-dx">
          {/* ── I numeri ── */}
          <section className="ing-box ing-numeri" aria-label={`Ingressi ${conArticolo(sessione.slug, "di")}`}>
            <div className="ing-numeri-testa">
              <div className="ing-numeri-valori">
                <span className="ing-kicker">Entrati {conArticolo(sessione.slug)}</span>
                {stato ? (
                  <p className="ing-contatore">
                    <span className="ing-contatore-n">{stato.entrati}</span>
                    <span className="ing-contatore-su"> su {stato.confermati} confermati</span>
                  </p>
                ) : (
                  <div className="ing-scheletro" style={{ height: 44, width: "70%", marginTop: 2 }} aria-hidden="true" />
                )}
              </div>
              <button
                type="button"
                className="ing-tondo ing-tondo-chiaro"
                onClick={cambiaSuono}
                aria-pressed={suono}
                aria-label={suono ? "Disattiva il suono" : "Attiva il suono"}
                title={suono ? "Disattiva il suono" : "Attiva il suono"}
              >
                <i className={`fas ${suono ? "fa-volume-high" : "fa-volume-xmark"}`} aria-hidden="true" />
              </button>
            </div>
            {stato ? (
              <>
                <div
                  className="ing-barra"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={stato.confermati}
                  aria-valuenow={Math.min(stato.entrati, stato.confermati)}
                  aria-label="Entrati sui confermati"
                >
                  <span style={{ width: `${percentuale}%` }} />
                </div>
                <div className="ing-numeri-piede">
                  <span>
                    In lista d&apos;attesa <strong className="ing-num">{stato.lista_attesa}</strong>
                    {classiOggi && classiOggi.in_attesa > 0 && (
                      <>
                        {" "}e <strong className="ing-num">{classiOggi.in_attesa}</strong>{" "}
                        {classiOggi.in_attesa === 1 ? "classe" : "classi"}
                      </>
                    )}
                  </span>
                  {classiOggi && conClassi && (
                    <span>
                      Classi entrate <strong className="ing-num">{classiOggi.entrate}</strong> di {classiOggi.confermate}
                      {classiOggi.presenti > 0 && <>, {classiOggi.presenti} persone</>}
                    </span>
                  )}
                  {aggiornatoAlle && <span>Aggiornato alle {aggiornatoAlle}</span>}
                </div>
              </>
            ) : (
              <div aria-hidden="true">
                <div className="ing-scheletro" style={{ height: 10, marginTop: 10 }} />
                <div className="ing-scheletro" style={{ height: 16, width: "70%", marginTop: 8 }} />
              </div>
            )}
          </section>

          {/* ── Gli ultimi ingressi ── */}
          <section className="ing-box ing-ultimi" aria-labelledby={`${radioName}-ultimi-titolo`}>
            <div className="ing-ultimi-testa">
              <h3 id={`${radioName}-ultimi-titolo`} className="ing-h3">
                Ultimi ingressi
              </h3>
              <button type="button" className="ing-link-inline" onClick={() => void aggiornaStato()}>
                <i className="fas fa-rotate-right" aria-hidden="true" /> Aggiorna
              </button>
            </div>
            {esitoUltimi && (
              <p className={`ing-msg ${esitoUltimi.tono === "ok" ? "ing-msg-ok" : "ing-msg-errore"}`} role="status">
                {esitoUltimi.testo}
              </p>
            )}
            {!stato ? (
              <div aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="ing-scheletro" style={{ height: 44, marginTop: 8 }} />
                ))}
              </div>
            ) : stato.ultimi.length === 0 ? (
              <p className="ing-aiuto">Nessun ingresso registrato per {conArticolo(sessione.slug)}.</p>
            ) : (
              <ul className="ing-lista">
                {stato.ultimi.map((u) => {
                  const classe = u.tipo === "classe" ? u : null;
                  const nome = classe ? `${nomeDellaClasse(classe.classe)}, ${classe.istituto}` : nomeCompleto(u as UltimoPersona);
                  const chiede = daAnnullare === u.bridgeId;
                  const annulla = () =>
                    classe
                      ? void annullaIngressoClasse(classe.bridgeId, classeInFrase(classe.classe), classe.presenti, null)
                      : void annullaIngresso(u.bridgeId, nome);
                  return (
                    <li key={u.bridgeId} className="ing-voce">
                      <span className="ing-voce-ora ing-num">{oraBreve(u.ora)}</span>
                      <span className="ing-voce-nome">
                        {classe && <i className="fas fa-users ing-voce-icona" aria-hidden="true" />}
                        {nome}
                        {classe && (
                          <span className="ing-voce-sotto ing-num">
                            {classe.presenti} di {classe.posti} entrati
                          </span>
                        )}
                      </span>
                      {chiede ? (
                        <span className="ing-voce-conferma">
                          <button
                            type="button"
                            className="ing-btn ing-btn-pericolo"
                            onClick={annulla}
                            disabled={annullando === u.bridgeId}
                            aria-label={
                              classe
                                ? `Conferma: annulla l'ingresso di tutta la classe, ${nome}`
                                : `Conferma: annulla l'ingresso di ${nome}`
                            }
                          >
                            {annullando === u.bridgeId ? "Annullo…" : "Sì, annulla"}
                          </button>
                          <button
                            type="button"
                            className="ing-btn"
                            onClick={() => setDaAnnullare(null)}
                            aria-label="Non annullare"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="ing-btn ing-btn-leggero"
                          onClick={() => setDaAnnullare(u.bridgeId)}
                          aria-label={`Annulla l'ingresso di ${nome}`}
                        >
                          Annulla
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="ing-sr" role="status" aria-live="assertive" aria-atomic="true">
        {annuncio}
      </p>
    </div>
  );
}

/* ── Lo stato di una persona trovata per nome ─────────────────────────── */

function StatoOggi({ t, giornata }: { t: Trovato; giornata: string }) {
  if (t.oggi === "entrato") {
    return <span className="ing-pill ing-pill-attenzione">Ingresso già registrato alle {oraBreve(t.ora)}</span>;
  }
  if (t.oggi === "confermato") return <span className="ing-pill ing-pill-ok">Posto confermato</span>;
  if (t.oggi === "lista_attesa") return <span className="ing-pill ing-pill-attenzione">In lista d&apos;attesa</span>;
  return (
    <span className="ing-pill ing-pill-errore">
      {t.altreGiornate.length ? `Solo per ${altreConArticolo(t.altreGiornate)}` : `Nessuna iscrizione per ${conArticolo(giornata)}`}
    </span>
  );
}

/** Lo stato di una classe trovata per nome. */
function StatoClasseOggi({ t, giornata }: { t: TrovataClasse; giornata: string }) {
  if (t.oggi === "entrata") {
    return (
      <span className="ing-pill ing-pill-attenzione">
        Entrati {t.presenti ?? 0} di {t.posti}
        {t.ora ? `, dalle ${oraBreve(t.ora)}` : ""}
      </span>
    );
  }
  if (t.oggi === "confermato") return <span className="ing-pill ing-pill-ok">Classe confermata</span>;
  if (t.oggi === "lista_attesa") return <span className="ing-pill ing-pill-attenzione">In lista d&apos;attesa</span>;
  return (
    <span className="ing-pill ing-pill-errore">
      {t.altreGiornate.length ? `Solo per ${altreConArticolo(t.altreGiornate)}` : `Nessuna prenotazione per ${conArticolo(giornata)}`}
    </span>
  );
}

/* ── La scheda di una classe, sopra la fotocamera ─────────────────────── */

/**
 * Due momenti: la scheda (chi è la classe, com'è messa oggi, quante persone
 * entrano adesso) e, dopo, l'esito verde ("23 di 30 entrati") con
 * l'annullamento. Il numero parte da quello prenotato, o da quelli che
 * mancano se una parte della classe è già entrata.
 *
 * Il pulsante principale non prende il fuoco da solo: con un lettore USB
 * l'Invio del biglietto dopo registrerebbe la classe senza che nessuno
 * l'abbia deciso. Per una classe già entrata, "Correggi il numero" porta le
 * persone entrate a un numero più basso (0: nessuna).
 */
function CartaClasse({
  r,
  classe: c,
  fermo,
  inCorso,
  annullando,
  onChiudi,
  onEntra,
  onAnnulla,
  onCorreggi,
}: {
  r: Risultato;
  classe: SchedaClasse;
  /** Un codice è stato letto mentre questa scheda aspetta il numero, e non è stato usato. */
  fermo: boolean;
  inCorso: boolean;
  annullando: boolean;
  onChiudi: () => void;
  onEntra: (entrano: number, forza: boolean) => void;
  onAnnulla: () => void;
  /** Le persone entrate tornano ad `a` (null: nessuna). */
  onCorreggi: (a: number | null) => Promise<{ ok: boolean; testo: string }>;
}) {
  const idCampo = useId();
  const idCorrezione = useId();
  const giaDentro = c.presenti ?? 0;
  const massimo = Math.max(1, MAX_PRESENTI_CLASSE - giaDentro);
  const [valore, setValore] = useState(() => String(Math.min(entranoPredefinite(c), massimo)));
  const [correggi, setCorreggi] = useState(false);
  const [corretto, setCorretto] = useState("");
  const [erroreCorrezione, setErroreCorrezione] = useState<string | null>(null);
  const campoCorrezione = useRef<HTMLInputElement>(null);
  const apriCorrezione = useRef<HTMLButtonElement>(null);
  const entrata = r.tipo === "classe_entrata";
  const nomeClasse = nomeDellaClasse(c.classe);
  const tutti = c.presenti !== null && c.presenti >= c.posti;

  // Il lettore USB scrive come una tastiera: se il fuoco è in un campo
  // numerico della scheda, un codice (comincia sempre con lettere) non deve
  // diventare un numero, e il suo Invio non deve registrare niente. Dalla
  // prima lettera, per un attimo, si scartano tasti e Invio.
  const bloccoFino = useRef(0);
  const [codiceNelCampo, setCodiceNelCampo] = useState(false);
  const bloccaCodice = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const adesso = Date.now();
    const stampabile = e.key.length === 1;
    if (adesso < bloccoFino.current) {
      if (stampabile || e.key === "Enter") {
        e.preventDefault();
        bloccoFino.current = adesso + 800;
      }
      return;
    }
    if (stampabile && !/\d/.test(e.key)) {
      e.preventDefault();
      bloccoFino.current = adesso + 800;
      setCodiceNelCampo(true);
    }
  };
  const bloccato = () => Date.now() < bloccoFino.current;
  /** Un valore con lettere (incollato, o scritto senza tasti singoli): è un codice, non un numero. */
  const eUnCodice = (v: string) => {
    if (!/[^\d\s]/.test(v)) return false;
    bloccoFino.current = Date.now() + 800;
    setCodiceNelCampo(true);
    return true;
  };

  const n = /^\d{1,2}$/.test(valore.trim()) ? Number(valore.trim()) : Number.NaN;
  const valido = Number.isInteger(n) && n >= 1 && n <= massimo;
  const cambia = (delta: number) => {
    const base = Number.isInteger(n) ? n : entranoPredefinite(c);
    setValore(String(Math.min(massimo, Math.max(1, base + delta))));
  };
  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (!valido || inCorso || bloccato()) return;
    onEntra(n, c.stato !== "confermato");
  };

  // "Correggi il numero": solo per una classe con un ingresso registrato oggi.
  // Un codice letto qui per errore dal lettore USB si ferma come nel campo
  // del numero (bloccaCodice), e il suo Invio non corregge niente.
  const puoCorreggere = c.presenti !== null && c.presenti >= 1 && Boolean(c.bridgeId);
  const massimoCorretto = giaDentro - 1;
  const m = /^\d{1,2}$/.test(corretto.trim()) ? Number(corretto.trim()) : Number.NaN;
  const correzioneValida = Number.isInteger(m) && m >= 0 && m <= massimoCorretto;
  const occupato = inCorso || annullando;
  const etichettaCorrezione = !correzioneValida
    ? "Correggi il numero"
    : m === 0
      ? "Annulla l'ingresso della classe"
      : `Correggi: ${m} di ${c.posti} entrati`;
  const mostraCorrezione = (si: boolean) => {
    // Subito, dentro il tocco: su iPhone la tastiera si apre solo così.
    flushSync(() => {
      setCorreggi(si);
      setErroreCorrezione(null);
      if (si) setCorretto("");
    });
    if (si) campoCorrezione.current?.focus();
    else apriCorrezione.current?.focus({ preventScroll: true });
  };
  const inviaCorrezione = async (e: FormEvent) => {
    e.preventDefault();
    if (!correzioneValida || occupato || bloccato()) return;
    setErroreCorrezione(null);
    const esito = await onCorreggi(m === 0 ? null : m);
    // Se è andata bene la scheda si riapre aggiornata; altrimenti resta qui, con il perché.
    if (!esito.ok) setErroreCorrezione(esito.testo || "La correzione non è riuscita. Riprova.");
  };

  const persone = `${descriviPersone(c.studenti, c.accompagnatori)}, ${c.posti} in tutto`;
  const scuola = scuolaConComune(c);

  if (entrata) {
    const presenti = c.presenti ?? 0;
    const mancano = c.posti - presenti;
    const stato =
      r.forzato === "lista_attesa"
        ? "Classe entrata, dalla lista d'attesa"
        : r.forzato === "altra_giornata"
          ? "Classe entrata, giornata aggiunta"
          : r.prima !== null && r.prima !== undefined
            ? "Altre persone entrate"
            : "Classe entrata";
    return (
      <div className="ing-esito ing-esito-ok ing-esito-di-classe" data-esito={r.tipo} tabIndex={-1}>
        <div className="ing-esito-scorre">
          <p className="ing-esito-stato">
            <i className="fas fa-circle-check" aria-hidden="true" />
            <span>{stato}</span>
          </p>
          <p className="ing-esito-nome">
            {presenti} di {c.posti} entrati
          </p>
          <p className="ing-esito-dettagli">
            {nomeClasse}, {scuola}
          </p>
          {c.settore && (
            <p className="ing-classe-settore">
              <i className="fas fa-location-dot" aria-hidden="true" /> Settore {c.settore}
            </p>
          )}
          {r.entrati !== undefined && r.prima !== null && r.prima !== undefined && (
            <p className="ing-esito-ora">
              Adesso {r.entrati} {r.entrati === 1 ? "persona" : "persone"}, prima {r.prima}.
            </p>
          )}
          {mancano > 0 && (
            <p className="ing-esito-testo-grande">
              {mancano === 1 ? "Manca 1 persona" : `Mancano ${mancano} persone`}: quando arrivano, leggi di nuovo il QR
              della classe.
            </p>
          )}
          {mancano < 0 && (
            <p className="ing-esito-testo-grande">
              {-mancano === 1 ? "1 persona in più" : `${-mancano} persone in più`} della prenotazione.
            </p>
          )}
        </div>
        <div className="ing-esito-azioni">
          <button type="button" className="ing-esito-btn ing-esito-btn-pieno" onClick={onChiudi}>
            Avanti
          </button>
          {r.bridgeId && (
            <button type="button" className="ing-esito-btn" onClick={onAnnulla} disabled={annullando}>
              {annullando ? "Annullo…" : r.prima ? "Annulla questi ingressi" : "Annulla l'ingresso"}
            </button>
          )}
        </div>
        <span className="ing-esito-tempo" aria-hidden="true" />
      </div>
    );
  }

  const daControllare = classeDaControllare(r);
  let icona = "fa-users";
  let stato: string;
  let spiegazione: ReactNode = null;
  if (c.stato === "lista_attesa") {
    icona = "fa-hourglass-half";
    stato = "In lista d'attesa per oggi";
    spiegazione = "La classe non ha un posto confermato per oggi. Se c'è posto in sala, puoi farla entrare.";
  } else if (c.stato === "altra_giornata") {
    icona = "fa-calendar-xmark";
    stato = c.altreGiornate.length ? `Prenotata solo per ${altreConArticolo(c.altreGiornate)}` : "Nessuna giornata nella prenotazione";
    spiegazione = `La classe non ha una prenotazione per ${conArticolo(r.giornata)}. Se c'è posto in sala, puoi farla entrare.`;
  } else if (tutti) {
    icona = "fa-clock-rotate-left";
    stato = `Già entrati ${c.presenti} di ${c.posti}${c.ora ? `, dalle ${oraBreve(c.ora)}` : ""}`;
    spiegazione = "Tutta la classe risulta già entrata. Se arriva qualcun altro della classe, indica quanti sono.";
  } else if (c.presenti !== null) {
    icona = "fa-user-clock";
    stato = `Già entrati ${c.presenti} di ${c.posti}${c.ora ? `, dalle ${oraBreve(c.ora)}` : ""}`;
  } else {
    stato = "Classe confermata per oggi";
  }
  const etichetta =
    c.stato !== "confermato"
      ? `Fai entrare comunque ${valido ? n : ""}`.trim()
      : c.presenti !== null
        ? `Registra ${valido ? n : ""} in più`.replace("  ", " ")
        : `Fai entrare ${valido ? n : ""}`.trim();

  return (
    <div
      className={`ing-esito ${daControllare ? "ing-esito-attenzione" : "ing-esito-classe"} ing-esito-di-classe`}
      data-esito={r.tipo}
      role="group"
      aria-label={`Scheda della ${classeInFrase(c.classe)}, ${c.istituto}`}
      tabIndex={-1}
    >
      <div className="ing-esito-scorre">
        <p className="ing-esito-stato">
          <i className={`fas ${icona}`} aria-hidden="true" />
          <span>{stato}</span>
        </p>
        {(fermo || codiceNelCampo) && (
          <p className="ing-esito-avviso" role="alert">
            <i className="fas fa-hand" aria-hidden="true" /> {codiceNelCampo ? TESTO_CODICE_NEL_NUMERO : TESTO_SCHEDA_APERTA}
          </p>
        )}
        {r.messaggio &&
          (r.messaggioAttenzione ? (
            <p className="ing-esito-avviso" role="alert">
              <i className="fas fa-triangle-exclamation" aria-hidden="true" /> {r.messaggio}
            </p>
          ) : (
            <p className="ing-esito-avviso ing-esito-avviso-ok">
              <i className="fas fa-circle-check" aria-hidden="true" /> {r.messaggio}
            </p>
          ))}
        {r.cambiata && (
          <p className="ing-esito-avviso">
            Nel frattempo i numeri della classe sono cambiati (un altro telefono, o un ingresso già salvato): controlla
            quante persone risultano entrate e conferma di nuovo.
          </p>
        )}
        <p className="ing-esito-nome">{nomeClasse}</p>
        <p className="ing-esito-dettagli">{scuola}</p>
        {c.settore && (
          <p className="ing-classe-settore">
            <i className="fas fa-location-dot" aria-hidden="true" /> Settore {c.settore}
          </p>
        )}
        {/* La nota (per esempio un posto accessibile) e la spiegazione prima dei
            numeri e del docente: sul telefono la parte bassa della carta
            scorre, e quello che conta deve vedersi senza scorrere. */}
        {c.note && (
          <p className="ing-esito-note">
            <i className="fas fa-note-sticky" aria-hidden="true" /> {c.note}
          </p>
        )}
        {spiegazione && <p className="ing-esito-testo-grande">{spiegazione}</p>}
        <p className="ing-classe-riga">
          <i className="fas fa-user-group" aria-hidden="true" /> {persone}
        </p>
        <p className="ing-classe-riga">
          <i className="fas fa-chalkboard-user" aria-hidden="true" /> {c.docente}
          {c.telefono && (
            <>
              {", "}
              <a className="ing-classe-tel" href={`tel:${c.telefono.replace(/[^\d+]/g, "")}`}>
                {c.telefono}
              </a>
            </>
          )}
        </p>
      </div>
      {correggi ? (
        <form className="ing-esito-azioni" onSubmit={inviaCorrezione} noValidate>
          <div className="ing-passi">
            <label htmlFor={idCorrezione} className="ing-passi-label">
              Quante persone della classe sono entrate davvero?
            </label>
            <div className="ing-passi-riga">
              <input
                ref={campoCorrezione}
                id={idCorrezione}
                className="ing-passi-campo"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={2}
                value={corretto}
                onKeyDown={bloccaCodice}
                onChange={(e) => {
                  if (bloccato() || eUnCodice(e.target.value)) return;
                  setCodiceNelCampo(false);
                  setCorretto(e.target.value);
                  setErroreCorrezione(null);
                }}
                aria-invalid={corretto.trim() !== "" && !correzioneValida}
                aria-describedby={`${idCorrezione}-aiuto`}
              />
            </div>
            <p id={`${idCorrezione}-aiuto`} className="ing-passi-aiuto">
              {!correzioneValida
                ? massimoCorretto > 0
                  ? `Ora ne risultano ${giaDentro}. Scrivi un numero da 0 a ${massimoCorretto}: con 0 si annulla l'ingresso di tutta la classe.`
                  : "Ora ne risulta 1. Scrivi 0 per annullare l'ingresso della classe."
                : m === 0
                  ? "Si annulla l'ingresso di tutta la classe."
                  : `Risulteranno entrate ${m} di ${c.posti} persone, ${giaDentro - m} in meno di adesso.`}
            </p>
            {erroreCorrezione && (
              <p className="ing-esito-avviso" role="alert">
                {erroreCorrezione}
              </p>
            )}
          </div>
          <button type="submit" className="ing-esito-btn ing-esito-btn-pieno" disabled={occupato || !correzioneValida}>
            {occupato ? (
              <span className="ing-rotella ing-rotella-piccola" aria-hidden="true" />
            ) : (
              <i className="fas fa-pen" aria-hidden="true" />
            )}{" "}
            {etichettaCorrezione}
          </button>
          <button type="button" className="ing-esito-btn" onClick={() => mostraCorrezione(false)} disabled={occupato}>
            Lascia com&apos;è
          </button>
        </form>
      ) : (
        <form className="ing-esito-azioni" onSubmit={invia} noValidate>
          <div className="ing-passi">
            <label htmlFor={idCampo} className="ing-passi-label">
              {c.presenti !== null ? "Quante altre persone entrano?" : "Quante persone entrano adesso?"}
            </label>
            <div className="ing-passi-riga">
              <button
                type="button"
                className="ing-passi-btn"
                onClick={() => cambia(-1)}
                disabled={inCorso || (Number.isInteger(n) && n <= 1)}
                aria-label="Una persona in meno"
              >
                <i className="fas fa-minus" aria-hidden="true" />
              </button>
              <input
                id={idCampo}
                className="ing-passi-campo"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={valore}
                onKeyDown={bloccaCodice}
                onChange={(e) => {
                  if (bloccato() || eUnCodice(e.target.value)) return;
                  setCodiceNelCampo(false);
                  setValore(e.target.value.replace(/[^\d]/g, "").slice(0, 2));
                }}
                aria-invalid={!valido}
                aria-describedby={`${idCampo}-aiuto`}
              />
              <button
                type="button"
                className="ing-passi-btn"
                onClick={() => cambia(1)}
                disabled={inCorso || (Number.isInteger(n) && n >= massimo)}
                aria-label="Una persona in più"
              >
                <i className="fas fa-plus" aria-hidden="true" />
              </button>
            </div>
            <p id={`${idCampo}-aiuto`} className="ing-passi-aiuto">
              {!valido
                ? `Scrivi un numero da 1 a ${massimo}.`
                : giaDentro + n > c.posti
                  ? `${giaDentro + n - c.posti} in più della prenotazione (${c.posti}).`
                  : c.presenti !== null
                    ? `In tutto saranno ${giaDentro + n} di ${c.posti}.`
                    : `Prenotate ${c.posti} persone.`}
            </p>
          </div>
          <button type="submit" className="ing-esito-btn ing-esito-btn-pieno" disabled={inCorso || !valido}>
            {inCorso ? (
              <span className="ing-rotella ing-rotella-piccola" aria-hidden="true" />
            ) : (
              <i className="fas fa-door-open" aria-hidden="true" />
            )}{" "}
            {etichetta}
          </button>
          <button type="button" className="ing-esito-btn" onClick={onChiudi}>
            Chiudi
          </button>
          {puoCorreggere && (
            <button
              ref={apriCorrezione}
              type="button"
              className="ing-esito-btn"
              onClick={() => mostraCorrezione(true)}
              disabled={inCorso}
            >
              <i className="fas fa-pen" aria-hidden="true" />{" "}
              Correggi il numero
            </button>
          )}
        </form>
      )}
    </div>
  );
}

/* ── La carta dell'esito, sopra la fotocamera ─────────────────────────── */

function CartaEsito({
  r,
  giornoUno,
  inCorso,
  annullando,
  onChiudi,
  onForza,
  onRiprova,
  onAnnulla,
}: {
  r: Risultato;
  giornoUno: boolean;
  inCorso: boolean;
  annullando: boolean;
  onChiudi: () => void;
  onForza: () => void;
  onRiprova: () => void;
  onAnnulla: () => void;
}) {
  const tono = TONO[r.tipo];
  const p = r.persona;
  const nome = nomeCompleto(p);

  let icona = "fa-circle-check";
  let stato: string;
  let corpo: ReactNode = null;
  let azioni: ReactNode;

  const chiudi = (
    <button type="button" className="ing-esito-btn" onClick={onChiudi}>
      Chiudi
    </button>
  );
  const forza = (
    <button type="button" className="ing-esito-btn ing-esito-btn-pieno" onClick={onForza} disabled={inCorso}>
      {inCorso ? <span className="ing-rotella ing-rotella-piccola" aria-hidden="true" /> : <i className="fas fa-door-open" aria-hidden="true" />}{" "}
      Fai entrare comunque
    </button>
  );

  switch (r.tipo) {
    case "entrato":
      stato =
        r.forzato === "lista_attesa"
          ? "Ingresso confermato, dalla lista d'attesa"
          : r.forzato === "altra_giornata"
            ? "Ingresso confermato, giornata aggiunta"
            : "Ingresso confermato";
      azioni = (
        <>
          <button type="button" className="ing-esito-btn ing-esito-btn-pieno" onClick={onChiudi}>
            Avanti
          </button>
          {r.bridgeId && (
            <button type="button" className="ing-esito-btn" onClick={onAnnulla} disabled={annullando}>
              {annullando ? "Annullo…" : "Annulla l'ingresso"}
            </button>
          )}
        </>
      );
      break;
    case "gia_entrato":
      icona = "fa-clock-rotate-left";
      stato = `Ingresso già registrato alle ${oraBreve(r.ora)}`;
      corpo = (
        <p className="ing-esito-testo-grande">
          Il biglietto è già stato usato oggi. Se la persona era uscita ed è tornata, può rientrare.
        </p>
      );
      azioni = (
        <button type="button" className="ing-esito-btn ing-esito-btn-pieno" onClick={onChiudi}>
          Avanti
        </button>
      );
      break;
    case "lista_attesa":
      icona = "fa-hourglass-half";
      stato = "In lista d'attesa per oggi";
      corpo = (
        <p className="ing-esito-testo-grande">
          Non ha un posto confermato per {conArticolo(r.giornata)}. Se c&apos;è posto in sala, puoi far entrare la
          persona.
        </p>
      );
      azioni = (
        <>
          {forza}
          {chiudi}
        </>
      );
      break;
    case "altra_giornata":
      icona = "fa-calendar-xmark";
      stato = r.altreGiornate?.length
        ? `Iscrizione solo per ${altreConArticolo(r.altreGiornate)}`
        : "Nessuna giornata nell'iscrizione";
      corpo = (
        <p className="ing-esito-testo-grande">
          La persona non risulta iscritta per {conArticolo(r.giornata)}.{" "}
          {giornoUno &&
            `Alcune scelte ${conArticolo(r.giornata, "di")} fatte a novembre non sono state salvate: se la persona dice di aver scelto questa giornata, può entrare.`}
        </p>
      );
      azioni = (
        <>
          {forza}
          {chiudi}
        </>
      );
      break;
    case "non_trovato":
      icona = "fa-circle-xmark";
      stato = "Codice non trovato";
      corpo = (
        <>
          {r.letto && <p className="ing-esito-codice">{r.letto}</p>}
          <p className="ing-esito-testo-grande">
            Controlla che sia il biglietto di questo evento e che il codice sia scritto bene. Puoi anche cercare la
            persona per nome.
          </p>
        </>
      );
      azioni = chiudi;
      break;
    case "non_biglietto":
      icona = "fa-qrcode";
      stato = "Non è un biglietto dell'evento";
      corpo = (
        <p className="ing-esito-testo-grande">
          Il QR letto non è quello del biglietto. Chiedi di aprire l&apos;email di conferma dell&apos;iscrizione, o
          di mostrare il codice che inizia con VPL (VPC per una classe).
        </p>
      );
      azioni = chiudi;
      break;
    case "errore":
    default:
      icona = r.rete ? "fa-wifi" : r.accesso ? "fa-lock" : "fa-triangle-exclamation";
      stato = r.accesso ? "Accesso scaduto" : r.rete ? "Connessione assente" : "Ingresso non registrato";
      corpo = <p className="ing-esito-testo-grande">{r.messaggio}</p>;
      azioni = r.accesso ? (
        <>
          <a
            className="ing-esito-btn ing-esito-btn-pieno"
            href={`/auth/login?returnTo=${encodeURIComponent(PAGINA_INGRESSO)}`}
          >
            Accedi di nuovo
          </a>
          {chiudi}
        </>
      ) : (
        <>
          {r.chiave && (
            <button type="button" className="ing-esito-btn ing-esito-btn-pieno" onClick={onRiprova} disabled={inCorso}>
              <i className="fas fa-rotate-right" aria-hidden="true" />{" "}
              Riprova
            </button>
          )}
          {chiudi}
        </>
      );
      break;
  }
  const dettagli = p ? [p.categoria, provenienza(p)].filter(Boolean).join(", ") : "";

  return (
    <div className={`ing-esito ing-esito-${tono}`} data-esito={r.tipo}>
      <div className="ing-esito-scorre">
        <p className="ing-esito-stato">
          <i className={`fas ${icona}`} aria-hidden="true" />
          <span>{stato}</span>
        </p>
        {nome && <p className="ing-esito-nome">{nome}</p>}
        {dettagli && <p className="ing-esito-dettagli">{dettagli}</p>}
        {p?.note && (
          <p className="ing-esito-note">
            <i className="fas fa-note-sticky" aria-hidden="true" /> {p.note}
          </p>
        )}
        {r.tipo === "entrato" && r.ora && <p className="ing-esito-ora">Alle {oraBreve(r.ora)}</p>}
        {corpo}
      </div>
      <div className="ing-esito-azioni">{azioni}</div>
      {r.tipo === "entrato" && <span className="ing-esito-tempo" aria-hidden="true" />}
    </div>
  );
}

/* ── Stile ────────────────────────────────────────────────────────────── */

/**
 * Prefisso `.ing`, così sta bene sia dentro il pannello (`.eva`) sia da
 * sola a schermo intero. Verde acqua per azioni e accenti; verde, ambra e
 * rosso pieni solo per l'esito, che deve leggersi a un braccio di distanza.
 * Il verde acqua pieno con il testo bianco non ha abbastanza contrasto: i
 * pulsanti pieni usano la sua tinta scura (#0F766E).
 */
const STILE_INGRESSO = `
.ing {
  --ing-ink: #0F766E; --ing-ink-hover: #0B5F58;
  --ing-ok: #0F6E56; --ing-attenzione: #B45309; --ing-errore: #B42318;
  --ing-scuro: #0B1726;
  display: flex; flex-direction: column; gap: 14px;
  color: var(--text-dark); font-size: 15px; line-height: 1.5;
}
.ing *:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.ing-pieno { max-width: 560px; margin: 0 auto; width: 100%; }
.ing-num { font-variant-numeric: tabular-nums; }
.ing-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ── Testa (solo nel pannello) ── */
.ing-testa { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: flex-start; justify-content: space-between; }
.ing-h2 { font-size: 19px; font-weight: 700; margin: 0; line-height: 1.3; color: var(--text-dark); }
.ing-h3 { font-size: 16px; font-weight: 700; margin: 0; line-height: 1.35; color: var(--text-dark); }
.ing-sub { font-size: 14px; color: var(--text-mid); margin: 4px 0 0; max-width: 60ch; }
.ing-link {
  display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px;
  border: 1.5px solid var(--border-color); border-radius: 10px; background: #fff;
  color: var(--ing-ink); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap;
}
.ing-link:hover { border-color: var(--primary); }
.ing-link-inline {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 4px;
  border: 0; background: none; color: var(--ing-ink); font: inherit; font-weight: 600; cursor: pointer;
  text-decoration: underline; text-underline-offset: 3px;
}

/* ── Giornate ── */
.ing-giorni { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 0; margin: 0; padding: 0; min-width: 0; }
.ing-giorno {
  position: relative; display: flex; flex-direction: column; justify-content: center; gap: 2px;
  min-height: 60px; padding: 10px 14px; border-radius: 14px; cursor: pointer;
  background: #fff; border: 1.5px solid var(--border-color);
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.ing-giorno:hover { border-color: var(--primary); }
.ing-giorno input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
.ing-giorno[data-attiva] { border-color: var(--ing-ink); background: var(--primary-light); box-shadow: inset 0 0 0 1px var(--ing-ink); }
.ing-giorno:has(input:focus-visible) { outline: 3px solid var(--primary); outline-offset: 2px; }
.ing-giorno-data { font-size: 17px; font-weight: 700; line-height: 1.2; color: var(--text-dark); }
.ing-giorno-sub { font-size: 12.5px; color: var(--text-mid); line-height: 1.3; }
.ing-oggi {
  position: absolute; top: -9px; right: 10px;
  display: inline-flex; padding: 1px 8px; border-radius: 999px; background: var(--ing-ink); color: #fff;
  font-size: 11px; font-weight: 700; line-height: 1.5; letter-spacing: .04em; text-transform: uppercase;
}

/* ── Avvisi ── */
.ing-avviso {
  display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px;
  border: 1px solid; font-size: 14px; line-height: 1.5;
}
.ing-avviso > i { margin-top: 3px; flex-shrink: 0; }
.ing-avviso a { color: inherit; font-weight: 700; text-decoration: underline; }
.ing-avviso .ing-link-inline { padding: 0; color: inherit; font-weight: 700; }
.ing-avviso-nota { opacity: .85; }
.ing-avviso-errore { background: #FEF0EE; border-color: #F6CBC5; color: #6B1A12; }
.ing-avviso-errore > i { color: var(--ing-errore); }
.ing-avviso-attenzione { background: #FFF8E6; border-color: #F3DDA2; color: #5C3D05; }
.ing-avviso-attenzione > i { color: var(--ing-attenzione); }
.ing-avviso-info { background: #EAF8F6; border-color: #BEE7E1; color: #0B4F49; }
.ing-avviso-info > i { color: var(--ing-ink); }

/* ── Disposizione: una colonna sul telefono, due nel pannello largo ── */
.ing-corpo { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ing-sx, .ing-dx { display: contents; }
.ing-numeri { order: 1; }
.ing-palco-box { order: 2; scroll-margin-top: 76px; scroll-margin-bottom: 16px; }
.ing-compatto .ing-palco-box { scroll-margin-top: 150px; }
.ing-codice { order: 3; }
.ing-cerca { order: 5; }
.ing-ultimi { order: 4; }
@media (min-width: 960px) {
  .ing-compatto .ing-corpo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 360px); gap: 16px; align-items: start; }
  .ing-compatto .ing-sx, .ing-compatto .ing-dx { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
}

/* ── Superfici ── */
.ing-box {
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px; padding: 16px;
  box-shadow: 0 2px 8px rgba(26,35,50,.04); min-width: 0;
}
.ing-kicker { font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ing-ink); }
.ing-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-mid); margin-bottom: 6px; }
.ing-aiuto { font-size: 13px; color: var(--text-mid); margin: 8px 0 0; line-height: 1.5; }
.ing-msg { font-size: 13.5px; margin: 8px 0 0; font-weight: 600; }
.ing-msg-ok { color: var(--ing-ok); }
.ing-msg-errore { color: var(--ing-errore); }

/* ── Numeri ── */
.ing-numeri { padding: 12px 14px 14px; }
@media (min-width: 640px) { .ing-numeri { padding: 16px; } }
.ing-numeri-testa { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.ing-numeri-valori { min-width: 0; flex: 1 1 auto; }
.ing-contatore { margin: 2px 0 0; line-height: 1.05; font-variant-numeric: tabular-nums; }
.ing-contatore-n { font-size: 44px; font-weight: 800; letter-spacing: -.02em; color: var(--text-dark); }
.ing-contatore-su { font-size: 20px; font-weight: 600; color: var(--text-mid); }
.ing-barra { height: 10px; border-radius: 999px; background: #EEF2F6; overflow: hidden; margin: 10px 0 8px; }
.ing-barra > span { display: block; height: 100%; border-radius: 999px; background: var(--primary); transition: width .5s ease; }
.ing-numeri-piede { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; font-size: 13px; color: var(--text-mid); }
.ing-numeri-piede strong { color: var(--text-dark); }

/* ── Il palco ── */
.ing-palco {
  position: relative; overflow: hidden; border-radius: 18px; background: var(--ing-scuro);
  height: clamp(260px, 46vh, 480px); height: clamp(260px, 46svh, 480px);
  box-shadow: 0 6px 24px rgba(10,22,40,.18);
}
.ing-compatto .ing-palco { height: clamp(260px, 50vh, 440px); height: clamp(260px, 50svh, 440px); }
.ing-video {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0;
  transition: opacity .2s ease; background: var(--ing-scuro);
}
.ing-palco[data-camera="attiva"] .ing-video { opacity: 1; }
.ing-mirino {
  position: absolute; left: 50%; top: 50%; width: min(64%, 300px); aspect-ratio: 1; transform: translate(-50%, -50%);
  border-radius: 20px; box-shadow: 0 0 0 9999px rgba(10,22,40,.38); pointer-events: none;
}
.ing-mirino span { position: absolute; width: 34px; height: 34px; border-color: var(--primary); border-style: solid; border-width: 0; }
.ing-mirino span:nth-child(1) { top: -2px; left: -2px; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 20px; }
.ing-mirino span:nth-child(2) { top: -2px; right: -2px; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 20px; }
.ing-mirino span:nth-child(3) { bottom: -2px; left: -2px; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 20px; }
.ing-mirino span:nth-child(4) { bottom: -2px; right: -2px; border-bottom-width: 4px; border-right-width: 4px; border-bottom-right-radius: 20px; }
.ing-mirino-linea {
  position: absolute; left: 8%; right: 8%; height: 2px; top: 10%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  animation: ing-scansione 2.2s ease-in-out infinite alternate;
}
@keyframes ing-scansione { from { top: 10%; } to { top: 88%; } }
.ing-chip {
  position: absolute; left: 12px; top: 12px; right: 12px; width: fit-content; max-width: calc(100% - 24px);
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 999px;
  background: rgba(10,22,40,.72); color: #fff; font-size: 13.5px; font-weight: 600; backdrop-filter: blur(6px);
}
.ing-chip-punto { width: 8px; height: 8px; border-radius: 999px; background: var(--primary); box-shadow: 0 0 0 0 rgba(46,196,182,.6); animation: ing-pulsa 1.8s ease-out infinite; flex-shrink: 0; }
.ing-chip-punto-lavoro { background: #FBBF24; }
@keyframes ing-pulsa { 0% { box-shadow: 0 0 0 0 rgba(46,196,182,.55); } 100% { box-shadow: 0 0 0 10px rgba(46,196,182,0); } }
.ing-comandi { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 10px; }
.ing-tondo {
  width: 48px; height: 48px; border-radius: 999px; border: 0; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.92); color: var(--text-dark); font-size: 17px; cursor: pointer;
  box-shadow: 0 2px 10px rgba(10,22,40,.25); transition: background .15s ease, color .15s ease;
}
.ing-tondo:hover { background: #fff; color: var(--ing-ink); }
.ing-tondo[aria-pressed="true"] { background: #FDE68A; color: #5C3D05; }
.ing-tondo-chiaro { width: 44px; height: 44px; background: var(--bg-light); box-shadow: none; color: var(--text-mid); font-size: 16px; }
.ing-tondo-chiaro[aria-pressed="true"] { background: var(--primary-light); color: var(--ing-ink); }
.ing-attesa {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 22px; text-align: center; color: #E6EDF5;
  background: radial-gradient(120% 90% at 50% 0%, rgba(46,196,182,.16), transparent 60%);
}
.ing-attesa-icona {
  width: 60px; height: 60px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(46,196,182,.16); color: var(--primary); font-size: 26px; margin-bottom: 4px;
}
.ing-attesa-icona-errore { background: rgba(251,191,36,.16); color: #FBBF24; }
.ing-attesa-titolo { font-size: 18px; font-weight: 700; color: #fff; margin: 0; line-height: 1.3; }
.ing-attesa-testo { font-size: 14px; margin: 0; max-width: 36ch; color: #C9D4E0; line-height: 1.5; }
.ing-avvia {
  margin-top: 10px; display: inline-flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 24px;
  border: 0; border-radius: 999px; background: var(--primary); color: var(--ing-scuro);
  font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(46,196,182,.35);
}
.ing-avvia:hover { background: #4FD3C6; }
.ing-avvia[disabled] { opacity: .6; cursor: progress; }
.ing-avvia:focus-visible { outline-color: #fff; }
.ing-rotella {
  width: 34px; height: 34px; border-radius: 999px; border: 3px solid rgba(255,255,255,.25); border-top-color: var(--primary);
  animation: ing-gira .8s linear infinite;
}
.ing-rotella-piccola { width: 16px; height: 16px; border-width: 2px; border-color: rgba(255,255,255,.4); border-top-color: currentColor; }
@keyframes ing-gira { to { transform: rotate(360deg); } }

/* ── L'esito ── */
.ing-esito {
  position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; color: #fff;
  animation: ing-entra .18s ease-out;
}
@keyframes ing-entra { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: none; } }
.ing-esito-ok { background: var(--ing-ok); }
.ing-esito-attenzione { background: var(--ing-attenzione); }
.ing-esito-errore { background: var(--ing-errore); }
.ing-esito-scorre {
  flex: 1 1 auto; overflow-y: auto; padding: 20px 20px 12px; -webkit-overflow-scrolling: touch;
  /* Una sfumatura in fondo: se il testo continua, si capisce che scorre. */
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 14px), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 14px), transparent);
}
.ing-esito-stato { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 19px; font-weight: 700; line-height: 1.25; }
.ing-esito-stato i { font-size: 30px; flex-shrink: 0; }
.ing-esito-nome {
  margin: 10px 0 0; font-size: clamp(28px, 8vw, 38px); font-weight: 800; line-height: 1.12;
  letter-spacing: -.01em; overflow-wrap: anywhere;
}
.ing-esito-dettagli { margin: 6px 0 0; font-size: 17px; font-weight: 500; line-height: 1.4; opacity: .95; overflow-wrap: anywhere; }
.ing-esito-note {
  margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.95); color: #3D2A05;
  font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere;
}
.ing-esito-note i { color: var(--ing-attenzione); margin-right: 4px; }
.ing-esito-ora { margin: 8px 0 0; font-size: 15px; font-weight: 600; opacity: .9; }
.ing-esito-testo-grande { margin: 10px 0 0; font-size: 16px; line-height: 1.5; }
.ing-esito-codice {
  display: inline-block; margin: 12px 0 0; padding: 4px 12px; border-radius: 8px; background: rgba(255,255,255,.18);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; font-weight: 700; letter-spacing: .04em;
  overflow-wrap: anywhere;
}
.ing-esito-azioni { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 20px 18px; }
.ing-esito-btn {
  flex: 1 1 auto; min-height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  padding: 0 14px; border-radius: 12px; border: 2px solid rgba(255,255,255,.85); background: transparent; color: #fff;
  font: inherit; font-size: 15.5px; font-weight: 700; line-height: 1.2; cursor: pointer; text-decoration: none; text-align: center;
}
.ing-esito-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
.ing-esito-btn-pieno { background: #fff; border-color: #fff; color: var(--text-dark); }
.ing-esito-ok .ing-esito-btn-pieno { color: var(--ing-ok); }
.ing-esito-attenzione .ing-esito-btn-pieno { color: #7C2D06; }
.ing-esito-errore .ing-esito-btn-pieno { color: var(--ing-errore); }
.ing-esito-btn-pieno:hover { background: #F1F5F9; }
.ing-esito-btn[disabled] { opacity: .7; cursor: progress; }
.ing-esito .ing-rotella-piccola { border-color: rgba(0,0,0,.15); border-top-color: currentColor; }
.ing-esito *:focus-visible { outline-color: #fff; }
.ing-esito-tempo {
  position: absolute; left: 0; bottom: 0; height: 5px; width: 100%; background: rgba(255,255,255,.75);
  transform-origin: left; animation: ing-tempo ${CHIUSURA_VERDE}ms linear forwards;
}
@keyframes ing-tempo { from { transform: scaleX(1); } to { transform: scaleX(0); } }

/* ── La scheda di una classe ── */
/* Più alta del palco normale: la scheda ha più righe e il numero da scegliere. */
.ing-palco[data-classe] { height: clamp(420px, 78vh, 640px); height: clamp(420px, 78svh, 640px); }
.ing-esito-classe { background: #fff; color: var(--text-dark); }
.ing-esito-classe .ing-esito-stato i { color: var(--ing-ink); }
.ing-esito-classe .ing-esito-note { background: #FFFBEB; border: 1px solid #F6E7B5; }
.ing-esito-classe .ing-esito-btn { border-color: var(--border-color); color: var(--text-dark); }
.ing-esito-classe .ing-esito-btn:hover { background: var(--bg-light); color: var(--text-dark); }
.ing-esito-classe .ing-esito-btn-pieno { background: var(--ing-ink); border-color: var(--ing-ink); color: #fff; }
.ing-esito-classe .ing-esito-btn-pieno:hover { background: var(--ing-ink-hover); color: #fff; }
.ing-esito-classe *:focus-visible { outline-color: var(--primary); }
.ing-esito-classe .ing-rotella-piccola { border-color: rgba(255,255,255,.4); border-top-color: #fff; }
.ing-esito-di-classe .ing-esito-nome { font-size: clamp(26px, 7.5vw, 36px); }
.ing-esito-di-classe .ing-esito-dettagli { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.ing-classe-settore {
  display: inline-flex; align-items: center; gap: 8px; margin: 10px 0 0; padding: 6px 12px; border-radius: 10px;
  background: rgba(255,255,255,.95); color: var(--text-dark); font-size: 18px; font-weight: 800; overflow-wrap: anywhere;
}
.ing-esito-classe .ing-classe-settore { background: var(--primary-light); }
.ing-classe-settore i { color: var(--ing-ink); }
.ing-classe-riga { margin: 8px 0 0; font-size: 16px; line-height: 1.45; overflow-wrap: anywhere; }
.ing-classe-riga i { width: 20px; opacity: .8; }
.ing-classe-tel { color: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
.ing-esito-avviso {
  margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.95); color: #3D2A05;
  font-size: 15px; line-height: 1.45; font-weight: 600;
}
.ing-esito-avviso-ok { color: var(--ing-ok); }
.ing-esito-classe .ing-esito-avviso-ok { background: #ECFDF5; border: 1px solid #B7E4D3; }
/* Sulla scheda bianca di una classe un avviso deve vedersi come avviso. */
.ing-esito-di-classe .ing-esito-avviso:not(.ing-esito-avviso-ok) { background: #FFF7E6; border: 1px solid #F2D49B; color: #6E4600; }
/* La scheda prende il fuoco solo dal codice (tabIndex -1): niente bordo. */
.ing-esito-di-classe:focus { outline: none; }
.ing-passi { flex: 1 1 100%; display: grid; gap: 6px; }
.ing-passi-label { font-size: 14px; font-weight: 700; }
.ing-passi-riga { display: flex; align-items: center; gap: 10px; }
.ing-passi-btn {
  width: 52px; height: 52px; flex-shrink: 0; border-radius: 12px; border: 2px solid rgba(255,255,255,.85);
  background: rgba(255,255,255,.12); color: inherit; font-size: 18px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.ing-esito-classe .ing-passi-btn { border-color: var(--border-color); background: var(--bg-light); color: var(--text-dark); }
.ing-passi-btn[disabled] { opacity: .45; cursor: not-allowed; }
.ing-passi-campo {
  width: 88px; min-width: 0; height: 52px; border-radius: 12px; border: 2px solid var(--border-color); background: #fff;
  color: var(--text-dark); font: inherit; font-size: 26px; font-weight: 800; text-align: center; font-variant-numeric: tabular-nums;
}
.ing-passi-campo:focus { outline: 3px solid var(--primary); outline-offset: 1px; }
.ing-passi-campo[aria-invalid="true"] { border-color: var(--ing-errore); }
.ing-passi-aiuto { margin: 0; font-size: 13.5px; font-weight: 600; opacity: .92; }

/* ── Campi e pulsanti ── */
.ing-riga { display: flex; gap: 8px; }
.ing-campo {
  width: 100%; min-width: 0; min-height: 48px; padding: 0 14px; border-radius: 12px;
  border: 1.5px solid var(--border-color); background: #fff; color: var(--text-dark);
  font: inherit; font-size: 16px;
}
.ing-campo:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(46,196,182,.25); }
.ing-campo-codice {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 20px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; min-height: 56px;
}
.ing-campo-codice::placeholder { color: #B8C2CE; font-weight: 600; }
/* Sul telefono il codice intero (VPL- e 8 caratteri) deve stare nel campo,
   accanto a "Verifica", senza scorrere. */
@media (max-width: 420px) {
  .ing-campo-codice { font-size: 16px; letter-spacing: .02em; padding: 0 10px; }
  .ing-codice .ing-btn-primario { padding: 0 14px; }
}
@media (max-width: 360px) {
  .ing-codice .ing-btn-primario i { display: none; }
}
.ing-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0;
  min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1.5px solid var(--border-color);
  background: #fff; color: var(--text-dark); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: border-color .15s ease, background .15s ease, color .15s ease; white-space: nowrap;
}
.ing-btn:hover { border-color: var(--primary); color: var(--ing-ink); }
.ing-btn[disabled] { opacity: .55; cursor: not-allowed; }
.ing-btn-primario { min-height: 56px; padding: 0 20px; font-size: 16px; background: var(--ing-ink); border-color: var(--ing-ink); color: #fff; }
.ing-btn-primario:hover { background: var(--ing-ink-hover); border-color: var(--ing-ink-hover); color: #fff; }
.ing-btn-pericolo { color: var(--ing-errore); border-color: #F6CBC5; }
.ing-btn-pericolo:hover { background: #FEF0EE; border-color: var(--ing-errore); color: var(--ing-errore); }
.ing-btn-leggero { border-color: transparent; color: var(--text-mid); padding: 0 10px; }
.ing-btn-leggero:hover { border-color: var(--border-color); color: var(--ing-errore); }

/* ── Ricerca ── */
.ing-cerca .ing-h3 { margin-bottom: 10px; }
.ing-cerca-campo { position: relative; }
.ing-cerca-campo i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-light); pointer-events: none; }
.ing-cerca-campo .ing-campo { padding-left: 40px; }
.ing-cerca-esiti:empty { display: none; }
.ing-trovati { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; }
.ing-trovato {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 12px; border-radius: 12px; background: var(--bg-light);
}
.ing-trovato-testo { display: flex; flex-direction: column; gap: 3px; min-width: 0; align-items: flex-start; }
.ing-trovato-nome { font-weight: 700; color: var(--text-dark); overflow-wrap: anywhere; }
.ing-trovato-dettagli { font-size: 13px; color: var(--text-mid); overflow-wrap: anywhere; }
.ing-pill { display: inline-flex; padding: 2px 9px; border-radius: 8px; font-size: 12px; font-weight: 700; line-height: 1.5; }
.ing-pill-ok { background: #E1F5EE; color: var(--ing-ok); }
.ing-pill-attenzione { background: #FEF3C7; color: #92400E; }
.ing-pill-errore { background: #FEF0EE; color: var(--ing-errore); }

/* ── Ultimi ingressi ── */
.ing-ultimi-testa { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: -6px 0 2px; }
.ing-lista { list-style: none; margin: 4px 0 0; padding: 0; }
.ing-voce {
  display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 4px 0;
  border-bottom: 1px solid #F1F4F8;
}
.ing-voce:last-child { border-bottom: 0; }
.ing-voce-ora { width: 44px; flex-shrink: 0; font-size: 14px; font-weight: 700; color: var(--ing-ink); }
.ing-voce-nome { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ing-voce-icona { color: var(--ing-ink); margin-right: 6px; font-size: 13px; }
.ing-voce-sotto { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-mid); }
.ing-trovato-nome i { color: var(--ing-ink); font-size: 13px; }
.ing-voce-conferma { display: inline-flex; gap: 6px; flex-shrink: 0; }

/* ── Scheletri ── */
.ing-scheletro {
  border-radius: 10px; background: linear-gradient(90deg, #EEF2F6 0%, #F7F9FC 50%, #EEF2F6 100%);
  background-size: 200% 100%; animation: ing-luce 1.4s ease-in-out infinite;
}
@keyframes ing-luce { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

@media (max-width: 400px) {
  .ing { gap: 12px; }
  .ing-corpo { gap: 12px; }
  .ing-esito-btn i { display: none; }
  .ing-esito-btn .ing-rotella-piccola { display: inline-block; }
}
@media (max-width: 380px) {
  .ing-giorno { padding: 10px 12px; }
  .ing-giorno-data { font-size: 16px; }
  .ing-contatore-n { font-size: 38px; }
  .ing-esito-scorre { padding: 16px 16px 6px; }
  .ing-esito-azioni { padding: 10px 16px 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .ing-mirino-linea, .ing-chip-punto, .ing-scheletro, .ing-esito { animation: none; }
  .ing-esito-tempo { display: none; }
  .ing-barra > span, .ing-video { transition: none; }
}
`;
