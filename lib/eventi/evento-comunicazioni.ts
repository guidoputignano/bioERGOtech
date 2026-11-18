/**
 * Le email a tutti dell'evento, dalla scheda Comunicazioni del pannello e dal
 * cron. Due agli iscritti uno per uno:
 *
 * - il BIGLIETTO AGGIORNATO (a mano): il biglietto con il QR in PNG, che
 *   Gmail mostra, e ogni giornata con data, luogo e stato. Chi ha una
 *   giornata sola e può aggiungere l'altra (ci sono posti) riceve l'invito a
 *   farlo, con un pulsante: è il caso di chi ha l'11 dicembre e forse
 *   voleva anche il 10, che il ripristino del database non può sapere;
 * - il PROMEMORIA (automatico): dove e quando, con il biglietto. Parte dal
 *   cron la mattina di martedì 8 dicembre, oppure prima a mano dal pannello.
 *   Chi è solo in lista d'attesa riceve la variante che glielo dice (la
 *   sceglie il modello in lib/eventi/email.ts).
 *
 * Ognuna parte UNA volta. La chiave in `licei_config` si prenota PRIMA di
 * mandare qualsiasi email: la chiave primaria fa passare un solo invio,
 * anche con due clic, due persone dello staff o il cron e lo staff nello
 * stesso momento. Pannello e cron usano la stessa chiave. `licei_config` è
 * leggibile da chiunque: l'esito contiene solo numeri e date.
 *
 * Prima di mandare si controlla il database: se manca una giornata (il file
 * di ripristino non è stato eseguito) non parte niente e si dice perché.
 * Un'email con le giornate sbagliate non si può ritirare. Dopo il ripristino
 * un'iscrizione rimasta senza giornate non ferma più nessuno: non riceve
 * l'email (non sapremmo che data indicarle), compare fra le non inviabili
 * con il motivo "nessuna giornata" e la campagna parte per tutti gli altri.
 *
 * E due alle scuole:
 *
 * - il PROMEMORIA ALLE CLASSI (automatico, con quello degli iscritti): a
 *   ogni docente che ha prenotato una classe per una giornata che deve
 *   ancora iniziare, l'email della classe con il QR, le giornate e il
 *   settore (lib/eventi/email-classi.ts). Ha una sua chiave: parte e si
 *   riprova per conto suo, e un problema degli iscritti non lo ferma;
 * - l'INVITO ALLE SCUOLE DEL PERCORSO (a mano, una volta): al referente di
 *   ogni scuola del percorso dei licei con l'adesione confermata o attiva
 *   che non ha ancora prenotato una classe, il link al modulo delle classi
 *   con la scuola già scritta. Una email per scuola, anche quando due scuole
 *   hanno lo stesso referente. Legge licei_adesioni e basta: non la cambia.
 *
 * Nei log niente dati personali: le persone sono "iscrizione <id>", le
 * classi "prenotazione <id>", le scuole "adesione <id>".
 *
 * Solo server.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import { SESSIONS, giornateConArticolo, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import {
  EMAIL_MITTENTE,
  EMAIL_RISPOSTE,
  emailBiglietto,
  type EmailBiglietto,
  type GiornataEmail,
  type MotivoEmail,
} from "@/lib/eventi/email";
import { refusoEmail } from "@/lib/eventi/email-refusi";
import {
  SELECT_ISCRIZIONE,
  giornateAggiungibili,
  normalizzaIscrizione,
  postiPerGiornata,
  type IscrizioneEvento,
  type PostiGiornata,
} from "@/lib/eventi/evento-server";
import type { SessionStatus } from "@/lib/eventi/registration";
import type { PrenotazioneClasse } from "@/lib/eventi/classi";
import { elencoClassi } from "@/lib/eventi/classi-server";
import { emailClasse, emailInvitoScuola } from "@/lib/eventi/email-classi";

/* ── Le campagne ──────────────────────────────────────────────────────── */

/** Le campagne agli iscritti uno per uno. */
export const CAMPAGNE_ISCRITTI_ID = ["biglietto_aggiornato", "promemoria"] as const;
/** Le campagne alle scuole: i docenti delle classi prenotate e i referenti del percorso. */
export const CAMPAGNE_SCUOLE_ID = ["promemoria_classi", "invito_scuole"] as const;
export const CAMPAGNE_ID = [...CAMPAGNE_ISCRITTI_ID, ...CAMPAGNE_SCUOLE_ID] as const;
export type CampagnaIscrittiId = (typeof CAMPAGNE_ISCRITTI_ID)[number];
export type CampagnaScuoleId = (typeof CAMPAGNE_SCUOLE_ID)[number];
export type CampagnaId = (typeof CAMPAGNE_ID)[number];

export const campagnaValida = (v: unknown): v is CampagnaId =>
  typeof v === "string" && (CAMPAGNE_ID as readonly string[]).includes(v);

const perIscritti = (id: CampagnaId): id is CampagnaIscrittiId =>
  (CAMPAGNE_ISCRITTI_ID as readonly string[]).includes(id);

type DefinizioneCampagna = {
  nome: string;
  /** La data dell'invio: è anche la prenotazione. */
  chiave: string;
  /** L'esito, in soli numeri. */
  chiaveEsito: string;
  /** Per i log, i tag di Resend e le chiavi di idempotenza. Solo lettere e trattini. */
  etichetta: string;
};

export const CAMPAGNE: Record<CampagnaId, DefinizioneCampagna> = {
  biglietto_aggiornato: {
    nome: "Biglietto aggiornato",
    chiave: "evento_biglietto_aggiornato_inviato_at",
    chiaveEsito: "evento_biglietto_aggiornato_esito",
    etichetta: "biglietto-aggiornato",
  },
  promemoria: {
    nome: "Promemoria prima dell'evento",
    chiave: "evento_promemoria_inviato_at",
    chiaveEsito: "evento_promemoria_esito",
    etichetta: "promemoria",
  },
  promemoria_classi: {
    nome: "Promemoria alle classi",
    chiave: "evento_promemoria_classi_inviato_at",
    chiaveEsito: "evento_promemoria_classi_esito",
    etichetta: "promemoria-classi",
  },
  invito_scuole: {
    nome: "Invita le scuole del percorso",
    chiave: "evento_invito_scuole_inviato_at",
    chiaveEsito: "evento_invito_scuole_esito",
    etichetta: "invito-scuole",
  },
};

/** Il modello dell'email del biglietto per le campagne agli iscritti. */
const MOTIVO: Record<CampagnaIscrittiId, MotivoEmail> = {
  biglietto_aggiornato: "aggiornamento",
  promemoria: "promemoria",
};

/**
 * Il promemoria automatico. Il cron (/api/cron/evento, in vercel.json alle
 * 7:30 UTC, le 8:30 a Roma in inverno) lo manda la prima mattina di questa
 * finestra in cui il database è a posto; se un giro non riesce, ci riprova
 * la mattina dopo, fino al 10 dicembre compreso.
 */
export const PROMEMORIA_AUTOMATICO = {
  dal: "2026-12-08",
  al: "2026-12-10",
  etichetta: "martedì 8 dicembre",
  /** Deve restare allineata alla riga di vercel.json. */
  ora: "8:30",
} as const;

/** L'ultimo giorno dell'evento: dopo, nessuna delle due email ha più senso. */
const ULTIMO_GIORNO = SESSIONS.map((s) => s.dataISO).sort().at(-1) ?? "";

/** Il file che crea le giornate e recupera le scelte perse del 10 dicembre. */
const FILE_RIPRISTINO = "supabase/migrations/20261231300000_event_giorno1_ripristino.sql";

/** "2026-11-18": il giorno di calendario a Roma. */
export function oggiRoma(adesso: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(adesso);
}

/* ── Stato degli invii ────────────────────────────────────────────────── */

export type EsitoCampagna = {
  /** Persone a cui si è provato a scrivere, indirizzi non validi compresi. */
  destinatari: number;
  inviate: number;
  /** Non partite, indirizzi non validi compresi: i dettagli sono nei log. */
  errori: number;
  /** L'ultimo aggiornamento dell'esito. */
  at: string;
  /** False mentre l'invio è in corso (o se si è interrotto a metà). */
  completato: boolean;
};

export type StatoInvio = { inviato_at: string | null; esito: EsitoCampagna | null };

function leggiEsito(grezzo: string | null | undefined): EsitoCampagna | null {
  if (!grezzo || !grezzo.trim()) return null;
  try {
    const e = JSON.parse(grezzo) as Partial<EsitoCampagna>;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    return {
      destinatari: n(e.destinatari),
      inviate: n(e.inviate),
      errori: n(e.errori),
      at: typeof e.at === "string" ? e.at : "",
      completato: e.completato !== false,
    };
  } catch {
    return null;
  }
}

/** Lo stato di tutte le campagne, da `licei_config`. Lancia se la lettura fallisce. */
export async function leggiStatiInvio(client: SupabaseClient): Promise<Record<CampagnaId, StatoInvio>> {
  const chiavi = CAMPAGNE_ID.flatMap((id) => [CAMPAGNE[id].chiave, CAMPAGNE[id].chiaveEsito]);
  const { data, error } = await client.from("licei_config").select("chiave, valore").in("chiave", chiavi);
  if (error) throw new Error(`licei_config: ${error.message}`);
  const righe = (data ?? []) as { chiave: string; valore: string | null }[];
  const valore = (k: string) => (righe.find((r) => r.chiave === k)?.valore ?? "").trim();
  const stati = {} as Record<CampagnaId, StatoInvio>;
  for (const id of CAMPAGNE_ID) {
    const inviato = valore(CAMPAGNE[id].chiave) || null;
    stati[id] = { inviato_at: inviato, esito: inviato ? leggiEsito(valore(CAMPAGNE[id].chiaveEsito)) : null };
  }
  return stati;
}

/* ── Lettura dal database ─────────────────────────────────────────────── */

/** Righe per richiesta: Supabase ne restituisce al massimo 1000. */
const PAGINA = 1000;
/** Un tetto di sicurezza, ben oltre qualunque evento. */
const MAX_PAGINE = 100;

/**
 * Tutte le iscrizioni con le loro giornate, a pagine, dalla più vecchia.
 * Ci si ferma solo su una pagina vuota: se il progetto restituisce meno
 * righe per volta, una pagina corta non vuol dire "finito". Lancia se il
 * database non risponde: meglio nessuna email che metà.
 */
async function leggiTutteLeIscrizioni(client: SupabaseClient): Promise<IscrizioneEvento[]> {
  const iscrizioni: IscrizioneEvento[] = [];
  const visti = new Set<string>();
  for (let pagina = 0, da = 0; ; pagina++) {
    if (pagina >= MAX_PAGINE) throw new Error("event_registrations: troppe pagine, lettura interrotta");
    const { data, error } = await client
      .from("event_registrations")
      .select(SELECT_ISCRIZIONE)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) throw new Error(`event_registrations: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const riga of data) {
      const iscr = normalizzaIscrizione(riga);
      if (visti.has(iscr.id)) continue;
      visti.add(iscr.id);
      iscrizioni.push(iscr);
    }
    da += data.length;
  }
  return iscrizioni;
}

/**
 * Le giornate del sito che mancano in `event_sessions`. Come
 * `giornateMancantiNelDatabase`, ma se la lettura fallisce lancia invece di
 * rispondere "nessuna": qui un errore muto farebbe partire le email.
 */
async function giornateMancanti(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from("event_sessions").select("slug");
  if (error) throw new Error(`event_sessions: ${error.message}`);
  const presenti = new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
  return SESSIONS.map((s) => s.slug as string).filter((slug) => !presenti.has(slug));
}

/** Quello che serve alle campagne agli iscritti, letto una volta. */
export type DatiComunicazioni = {
  iscrizioni: IscrizioneEvento[];
  mancanti: string[];
  posti: PostiGiornata[];
  /** False se i posti liberi non si leggono per tutte le giornate. */
  postiCompleti: boolean;
  stati: Record<CampagnaId, StatoInvio>;
};

export async function leggiDatiComunicazioni(client: SupabaseClient): Promise<DatiComunicazioni> {
  const [iscrizioni, mancanti, posti, stati] = await Promise.all([
    leggiTutteLeIscrizioni(client),
    giornateMancanti(client),
    postiPerGiornata(client),
    leggiStatiInvio(client),
  ]);
  const postiCompleti = SESSIONS.every((s) => posti.some((p) => p.slug === s.slug));
  return { iscrizioni, mancanti, posti, postiCompleti, stati };
}

/* ── Destinatari e controlli ──────────────────────────────────────────── */

export type Destinatario = {
  /** Per i log al posto dell'email: "iscrizione <id>". */
  rif: string;
  email: string;
  nome: string;
  codice: string;
  giornate: GiornataEmail[];
  aggiungibili: string[];
};

/** Una persona che non può ricevere l'email, per il pannello (solo admin). `rif` va nei log. */
export type NonInviabile = { rif: string; nome: string; email: string; motivo: string };

/** Il motivo di chi non ha nessuna giornata: non sapremmo che data scrivergli. */
export const MOTIVO_SENZA_GIORNATA = "nessuna giornata";

/** Perché una campagna non può partire, per scegliere l'aiuto da mostrare. */
export type TipoBlocco =
  | "configurazione"
  | "giornate_mancanti"
  | "posti_illeggibili"
  | "evento_concluso"
  | "nessun_destinatario"
  /** Le prenotazioni per classe non sono nel database. */
  | "classi_assenti"
  /** Il database non ha risposto: non si sa a chi scrivere. */
  | "lettura";

export type Preparazione = {
  destinatari: Destinatario[];
  /** Indirizzi non validi e iscrizioni senza giornate (dopo il ripristino). */
  nonInviabili: NonInviabile[];
  /** Iscrizioni senza nessuna giornata del sito: sono anche in `nonInviabili`, se il ripristino è già stato fatto. */
  senzaGiornata: number;
  /** Chi riceverà l'invito ad aggiungere una giornata. */
  conInvito: number;
  /** Chi ha solo giornate in lista d'attesa. */
  soloAttesa: number;
  blocco: { tipo: TipoBlocco; messaggio: string } | null;
};

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const numero = (n: number) => n.toLocaleString("it-IT");

/** "del 10 dicembre", "dell'11 dicembre", "del 10 e dell'11 dicembre". */
const delleGiornate = (slugs: readonly string[]) =>
  giornateConArticolo(slugs)
    .replace(/(^|\s)il /g, "$1del ")
    .replace(/(^|\s)l'/g, "$1dell'");

/** Le giornate del sito che una persona ha, con il loro stato. */
const giornateNote = (iscr: IscrizioneEvento): GiornataEmail[] =>
  iscr.giornate.filter((g) => sessionBySlug(g.slug)).map((g) => ({ slug: g.slug, status: g.status }));

/**
 * Chi riceve la campagna e se può partire. Senza rete: lavora sui dati già
 * letti, così il pannello mostra esattamente quello che l'invio farebbe.
 */
export function preparaCampagna(
  campagna: CampagnaIscrittiId,
  dati: DatiComunicazioni,
  adesso: Date = new Date(),
): Preparazione {
  const destinatari: Destinatario[] = [];
  const nonInviabili: NonInviabile[] = [];
  const visti = new Set<string>();
  let senzaGiornata = 0;
  let conInvito = 0;
  let soloAttesa = 0;

  for (const iscr of dati.iscrizioni) {
    const giornate = giornateNote(iscr);
    const nome = `${iscr.nome} ${iscr.cognome}`.trim();
    if (giornate.length === 0) {
      senzaGiornata += 1;
      // Prima del ripristino la campagna è comunque ferma (giornate
      // mancanti): il file può ancora restituire il 10 dicembre a queste
      // iscrizioni. Dopo, sono casi singoli da controllare nella scheda
      // Iscritti, e non fermano gli altri.
      if (dati.mancanti.length === 0) {
        nonInviabili.push({ rif: `iscrizione ${iscr.id}`, nome, email: iscr.email, motivo: MOTIVO_SENZA_GIORNATA });
      }
      continue;
    }
    const email = iscr.email.trim().toLowerCase();
    // Un indirizzo, un'email: l'RPC lo impedisce già, ma un doppione non
    // deve ricevere due copie.
    if (visti.has(email)) continue;
    visti.add(email);

    if (!EMAIL_VALIDA.test(email)) {
      nonInviabili.push({ rif: `iscrizione ${iscr.id}`, nome, email: iscr.email, motivo: "indirizzo non valido" });
      continue;
    }
    const refuso = refusoEmail(email);
    if (refuso?.impossibile) {
      nonInviabili.push({
        rif: `iscrizione ${iscr.id}`,
        nome,
        email: iscr.email,
        motivo: refuso.suggerimento
          ? `il dominio «${refuso.dominio}» non esiste, forse è ${refuso.suggerimento}`
          : `il dominio «${refuso.dominio}» non esiste`,
      });
      continue;
    }

    // L'invito ad aggiungere una giornata solo se i posti si leggono per
    // tutte le giornate: con una lettura a metà si inviterebbe a una
    // giornata piena, o non si inviterebbe nessuno senza dirlo.
    const aggiungibili = dati.postiCompleti ? giornateAggiungibili(iscr, dati.posti) : [];
    if (aggiungibili.length > 0) conInvito += 1;
    if (giornate.every((g) => g.status === "lista_attesa")) soloAttesa += 1;

    destinatari.push({
      rif: `iscrizione ${iscr.id}`,
      email,
      nome: iscr.nome.trim(),
      codice: iscr.codice,
      giornate,
      aggiungibili,
    });
  }

  const blocco = ((): Preparazione["blocco"] => {
    if (!process.env.RESEND_API_KEY) {
      return {
        tipo: "configurazione",
        messaggio:
          "L'invio delle email non è configurato su questo ambiente: manca la variabile RESEND_API_KEY. Va aggiunta su Vercel, poi serve un nuovo deploy.",
      };
    }
    if (dati.mancanti.length > 0) {
      // Finché manca una giornata, anche le iscrizioni senza giornate
      // aspettano il file: è lui a restituire loro il 10 dicembre.
      const una = dati.mancanti.length === 1;
      const vuote =
        senzaGiornata > 0
          ? ` Il file restituisce la giornata anche ${
              senzaGiornata === 1 ? "all'iscrizione che ora non ne ha nessuna" : `alle ${numero(senzaGiornata)} iscrizioni che ora non ne hanno nessuna`
            }.`
          : "";
      return {
        tipo: "giornate_mancanti",
        messaggio: `${una ? "La giornata" : "Le giornate"} ${delleGiornate(dati.mancanti)} ${
          una ? "non esiste" : "non esistono"
        } nel database: il file di ripristino ${FILE_RIPRISTINO} non è ancora stato eseguito. Finché manca, le giornate delle persone non sono complete e l'email direbbe cose sbagliate. Esegui il file nell'editor SQL di Supabase una volta sola, poi aggiorna questa pagina.${vuote}`,
      };
    }
    if (oggiRoma(adesso) > ULTIMO_GIORNO) {
      return { tipo: "evento_concluso", messaggio: "L'evento è concluso: questa email non serve più." };
    }
    if (campagna === "biglietto_aggiornato" && !dati.postiCompleti) {
      // Il biglietto aggiornato serve anche a invitare chi ha una giornata
      // sola: senza i posti l'invito sparirebbe in silenzio.
      return {
        tipo: "posti_illeggibili",
        messaggio:
          "Non riesco a leggere i posti liberi per giornata (funzione event_seats_remaining): senza, l'email non potrebbe invitare chi ha una giornata sola ad aggiungere l'altra. Riprova tra poco.",
      };
    }
    if (destinatari.length === 0) {
      return { tipo: "nessun_destinatario", messaggio: "Non c'è ancora nessuna persona iscritta a cui scrivere." };
    }
    return null;
  })();

  return { destinatari, nonInviabili, senzaGiornata, conInvito, soloAttesa, blocco };
}

/* ── Esempi per l'anteprima e la prova ────────────────────────────────── */

export type EsempioId = "solo_11" | "entrambe" | "solo_10" | "attesa";
/** Gli esempi delle campagne alle scuole hanno i loro nomi. */
export type EsempioScuoleId = "classe_confermata" | "classe_solo_primo" | "classe_attesa" | "scuola";

/** Un codice che non può essere vero: "O", "I" e "1" non stanno nell'alfabeto dei codici. */
export const CODICE_ESEMPIO = "VPL-ESEMPIO1";
const NOME_ESEMPIO = "Maria";

/** Le persone di esempio, dalle giornate del sito. Il primo è il caso che conta di più. */
function definizioniEsempi(
  campagna: CampagnaIscrittiId,
): { id: EsempioId; etichetta: string; giornate: GiornataEmail[] }[] {
  const [primo, secondo] = SESSIONS;
  const conferma = (slug: string, status: SessionStatus = "confermato"): GiornataEmail => ({ slug, status });
  const tutti: Record<EsempioId, { etichetta: string; giornate: GiornataEmail[] }> = {
    solo_11: { etichetta: `Solo ${giornateConArticolo([secondo.slug])}`, giornate: [conferma(secondo.slug)] },
    entrambe: { etichetta: "Tutte e due le giornate", giornate: [conferma(primo.slug), conferma(secondo.slug)] },
    solo_10: { etichetta: `Solo ${giornateConArticolo([primo.slug])}`, giornate: [conferma(primo.slug)] },
    attesa: { etichetta: "In lista d'attesa", giornate: [conferma(primo.slug, "lista_attesa")] },
  };
  const ordine: EsempioId[] =
    campagna === "biglietto_aggiornato"
      ? ["solo_11", "entrambe", "solo_10", "attesa"]
      : ["entrambe", "solo_11", "solo_10", "attesa"];
  return ordine.map((id) => ({ id, ...tutti[id] }));
}

/** L'iscrizione finta di un esempio, per calcolare le giornate aggiungibili come per le persone vere. */
function iscrizioneEsempio(giornate: GiornataEmail[]): IscrizioneEvento {
  return {
    id: "esempio",
    nome: NOME_ESEMPIO,
    cognome: "Rossi",
    email: "",
    telefono: null,
    categoria: "pubblico",
    organizzazione: null,
    classe: null,
    note: null,
    codice: CODICE_ESEMPIO,
    created_at: "",
    giornate: giornate.map((g, i) => ({
      id: `esempio-${i}`,
      slug: g.slug,
      status: g.status,
      stato_checkin: "registrato",
      checkin_ts: null,
      created_at: null,
    })),
  };
}

export type EsempioEmail = { id: EsempioId | EsempioScuoleId; etichetta: string } & EmailBiglietto;

/** Gli esempi di una campagna, con i posti liberi di adesso: l'anteprima è quello che partirebbe. */
export function esempiCampagna(
  campagna: CampagnaIscrittiId,
  dati: Pick<DatiComunicazioni, "posti" | "postiCompleti">,
): EsempioEmail[] {
  return definizioniEsempi(campagna).map(({ id, etichetta, giornate }) => {
    const aggiungibili = dati.postiCompleti ? giornateAggiungibili(iscrizioneEsempio(giornate), dati.posti) : [];
    const email = emailBiglietto({
      nome: NOME_ESEMPIO,
      codice: CODICE_ESEMPIO,
      giornate,
      motivo: MOTIVO[campagna],
      aggiungibili,
    });
    return { id, etichetta, ...email };
  });
}

/* ── Le scuole: i docenti delle classi e i referenti del percorso ──── */

type Lettura<T> = { ok: true; valore: T } | { ok: false; errore: string };

/** Il referente di una scuola del percorso dei licei, per l'invito. */
export type AdesioneInvito = {
  id: string;
  codice: string;
  istituto: string;
  nome: string;
  email: string;
};

/** Quello che serve alle campagne alle scuole. Le due letture sono separate: una non ferma l'altra. */
export type DatiScuole = {
  /** Null: le tabelle delle classi non sono nel database. */
  classi: Lettura<PrenotazioneClasse[] | null>;
  adesioni: Lettura<AdesioneInvito[]>;
};

/** Una tabella o una funzione che non c'è (il file delle classi non è stato eseguito). */
const mancaNelDatabase = (e: { code?: string | null } | null | undefined) =>
  Boolean(e && ["PGRST202", "42883", "PGRST205", "42P01"].includes(e.code ?? ""));

const testoErrore = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Tutte le prenotazioni per classe, o null se le tabelle non ci sono. Lancia per ogni altro errore. */
async function leggiClassi(client: SupabaseClient): Promise<PrenotazioneClasse[] | null> {
  // Una GET e non una HEAD: a una HEAD PostgREST risponde senza corpo, e
  // supabase-js trasforma il 404 di una tabella che non c'è in un successo.
  const { error } = await client.from("event_group_bookings").select("id").limit(1);
  if (error) {
    if (mancaNelDatabase(error)) return null;
    throw new Error(`event_group_bookings: ${error.code ?? "?"} ${error.message}`);
  }
  return elencoClassi(client);
}

/** I referenti delle scuole del percorso con l'adesione confermata o attiva. Solo lettura. */
async function leggiAdesioni(client: SupabaseClient): Promise<AdesioneInvito[]> {
  const { data, error } = await client
    .from("licei_adesioni")
    .select("id, codice, istituto_denominazione, referente_nome, referente_email, stato")
    .in("stato", ["confermata", "attiva"])
    .order("codice", { ascending: true })
    .limit(2000);
  if (error) throw new Error(`licei_adesioni: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    codice: String(r.codice ?? ""),
    istituto: String(r.istituto_denominazione ?? "").trim(),
    nome: String(r.referente_nome ?? "").trim(),
    email: String(r.referente_email ?? "").trim(),
  }));
}

/** Le classi e i referenti, ognuno con il suo esito: non lancia mai. */
export async function leggiDatiScuole(client: SupabaseClient): Promise<DatiScuole> {
  const [classi, adesioni] = await Promise.allSettled([leggiClassi(client), leggiAdesioni(client)]);
  return {
    classi: classi.status === "fulfilled" ? { ok: true, valore: classi.value } : { ok: false, errore: testoErrore(classi.reason) },
    adesioni:
      adesioni.status === "fulfilled" ? { ok: true, valore: adesioni.value } : { ok: false, errore: testoErrore(adesioni.reason) },
  };
}

/** Un'email da mandare, già pronta da comporre. */
type DaSpedire = { rif: string; email: string; componi: () => EmailBiglietto };

export type PreparazioneScuole = {
  destinatari: DaSpedire[];
  nonInviabili: NonInviabile[];
  /** I numeri da mostrare accanto ai destinatari. */
  statistiche: { valore: number; etichetta: string }[];
  blocco: { tipo: TipoBlocco; messaggio: string } | null;
};

/** Perché un indirizzo non può ricevere l'email, o null se va bene. */
function indirizzoNonValido(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!EMAIL_VALIDA.test(e)) return "indirizzo non valido";
  const refuso = refusoEmail(e);
  if (refuso?.impossibile) {
    return refuso.suggerimento
      ? `il dominio «${refuso.dominio}» non esiste, forse è ${refuso.suggerimento}`
      : `il dominio «${refuso.dominio}» non esiste`;
  }
  return null;
}

/** "Liceo Archita" e "liceo  archita" sono la stessa scuola. */
const nomeScuola = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const MESSAGGIO_SENZA_RESEND =
  "L'invio delle email non è configurato su questo ambiente: manca la variabile RESEND_API_KEY. Va aggiunta su Vercel, poi serve un nuovo deploy.";
const MESSAGGIO_CLASSI_ASSENTI =
  "Le prenotazioni per classe non sono nel database: va eseguito nell'editor SQL di Supabase il file supabase/migrations/20261231400000_event_prenotazioni_classi.sql.";

/**
 * Il promemoria alle classi: a ogni docente che ha una classe prenotata per
 * una giornata che deve ancora iniziare, una email per classe (ogni classe
 * ha il suo QR). Le giornate già iniziate non compaiono. Una classe solo in
 * lista d'attesa riceve la variante che glielo dice.
 */
export function preparaPromemoriaClassi(dati: DatiScuole, adesso: Date = new Date()): PreparazioneScuole {
  const destinatari: DaSpedire[] = [];
  const nonInviabili: NonInviabile[] = [];
  let confermate = 0;
  let soloAttesa = 0;
  const classi = dati.classi.ok ? dati.classi.valore : null;

  for (const p of classi ?? []) {
    const future = p.giornate.filter((g) => {
      const s = sessionBySlug(g.slug);
      return s && Date.parse(s.inizioISO) > adesso.getTime();
    });
    if (future.length === 0) continue;
    const docente = `${p.docente_nome} ${p.docente_cognome}`.trim();
    const chi = `${docente} (${p.classe}, ${p.istituto})`;
    const motivo = indirizzoNonValido(p.docente_email);
    if (motivo) {
      nonInviabili.push({ rif: `prenotazione ${p.id}`, nome: chi, email: p.docente_email, motivo });
      continue;
    }
    if (future.some((g) => g.status === "confermato")) confermate += 1;
    else soloAttesa += 1;
    const prenotazione: PrenotazioneClasse = { ...p, giornate: future };
    destinatari.push({
      rif: `prenotazione ${p.id}`,
      email: p.docente_email.trim().toLowerCase(),
      componi: () => emailClasse({ prenotazione, motivo: "promemoria" }),
    });
  }

  const blocco = ((): PreparazioneScuole["blocco"] => {
    if (!process.env.RESEND_API_KEY) return { tipo: "configurazione", messaggio: MESSAGGIO_SENZA_RESEND };
    if (!dati.classi.ok) {
      return { tipo: "lettura", messaggio: "Non riesco a leggere le classi dal database: non si sa a chi scrivere. Riprova tra poco." };
    }
    if (dati.classi.valore === null) return { tipo: "classi_assenti", messaggio: MESSAGGIO_CLASSI_ASSENTI };
    if (oggiRoma(adesso) > ULTIMO_GIORNO) {
      return { tipo: "evento_concluso", messaggio: "L'evento è concluso: questa email non serve più." };
    }
    if (destinatari.length === 0) {
      return {
        tipo: "nessun_destinatario",
        messaggio:
          nonInviabili.length > 0
            ? "Le classi prenotate per le prossime giornate hanno tutte l'indirizzo del docente scritto male: nessuna email partirebbe."
            : "Non c'è ancora nessuna classe prenotata per le prossime giornate.",
      };
    }
    return null;
  })();

  return {
    destinatari,
    nonInviabili,
    statistiche: [
      { valore: confermate, etichetta: "con un posto confermato" },
      { valore: soloAttesa, etichetta: "solo in lista d'attesa" },
    ],
    blocco,
  };
}

/**
 * L'invito alle scuole del percorso: al referente di ogni scuola con
 * l'adesione confermata o attiva che non ha ancora prenotato una classe.
 * Una scuola ha già prenotato se una classe è arrivata dal suo link, se una
 * prenotazione ha lo stesso nome della scuola (a meno di maiuscole, accenti e
 * spazi) o se il referente ha prenotato una classe e segue solo quella
 * scuola. Una email per scuola, ognuna con il suo link: chi è referente di
 * due scuole riceve due inviti, con il nome della scuola nell'oggetto.
 */
export function preparaInvitoScuole(dati: DatiScuole, adesso: Date = new Date()): PreparazioneScuole {
  const destinatari: DaSpedire[] = [];
  const nonInviabili: NonInviabile[] = [];
  const classi = dati.classi.ok ? (dati.classi.valore ?? []) : [];
  // La stessa adesione una volta sola; due adesioni sono due scuole, anche con lo stesso referente.
  const adesioni = [...new Map((dati.adesioni.ok ? dati.adesioni.valore : []).map((a) => [a.id, a])).values()];
  const emailDi = (a: AdesioneInvito) => a.email.trim().toLowerCase();
  const conta = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const scuoleDelReferente = new Map<string, number>();
  for (const a of adesioni) conta(scuoleDelReferente, emailDi(a));
  /** Quanti inviti riceve ogni indirizzo, contati dopo il giro. */
  const inviti = new Map<string, number>();
  const perAdesione = new Set(classi.map((c) => c.licei_adesione_id).filter((x): x is string => Boolean(x)));
  const perEmail = new Set(classi.map((c) => c.docente_email.trim().toLowerCase()));
  const perScuola = new Set(classi.map((c) => nomeScuola(c.istituto)).filter(Boolean));
  let giaPrenotate = 0;

  for (const a of adesioni) {
    const email = emailDi(a);
    // Se il referente segue più scuole, la sua prenotazione non dice quale
    // scuola ha prenotato: lì contano solo il link e il nome della scuola.
    const prenotataDalReferente = perEmail.has(email) && scuoleDelReferente.get(email) === 1;
    if (perAdesione.has(a.id) || prenotataDalReferente || (a.istituto && perScuola.has(nomeScuola(a.istituto)))) {
      giaPrenotate += 1;
      continue;
    }
    const chi = `${a.nome || "Referente"} (${a.istituto || "scuola senza nome"})`;
    const motivo = indirizzoNonValido(a.email);
    if (motivo) {
      nonInviabili.push({ rif: `adesione ${a.id}`, nome: chi, email: a.email, motivo });
      continue;
    }
    destinatari.push({
      rif: `adesione ${a.id}`,
      email,
      componi: () => {
        const invito = emailInvitoScuola({ nome: a.nome, istituto: a.istituto, codiceAdesione: a.codice });
        // Due inviti con lo stesso oggetto finirebbero nella stessa conversazione e sembrerebbero un doppione.
        const scuola = a.istituto.replace(/\s+/g, " ");
        return (inviti.get(email) ?? 0) > 1 && scuola ? { ...invito, subject: `${invito.subject} (${scuola})` } : invito;
      },
    });
  }
  for (const d of destinatari) conta(inviti, d.email);

  const blocco = ((): PreparazioneScuole["blocco"] => {
    if (!process.env.RESEND_API_KEY) return { tipo: "configurazione", messaggio: MESSAGGIO_SENZA_RESEND };
    if (!dati.adesioni.ok) {
      return { tipo: "lettura", messaggio: "Non riesco a leggere le scuole del percorso dal database. Riprova tra poco." };
    }
    if (!dati.classi.ok) {
      return {
        tipo: "lettura",
        messaggio: "Non riesco a leggere le classi dal database: non si sa quali scuole hanno già prenotato. Riprova tra poco.",
      };
    }
    // Senza le tabelle delle classi il link porterebbe a un modulo che non funziona.
    if (dati.classi.valore === null) return { tipo: "classi_assenti", messaggio: MESSAGGIO_CLASSI_ASSENTI };
    if (SESSIONS.every((s) => Date.parse(s.inizioISO) <= adesso.getTime())) {
      return { tipo: "evento_concluso", messaggio: "Le giornate dell'evento sono iniziate: l'invito non serve più." };
    }
    if (destinatari.length === 0) {
      return {
        tipo: "nessun_destinatario",
        messaggio:
          adesioni.length === 0
            ? "Non c'è nessuna scuola del percorso con l'adesione confermata o attiva."
            : nonInviabili.length > 0
              ? "Le scuole che non hanno ancora prenotato una classe hanno tutte l'indirizzo del referente scritto male: nessun invito partirebbe."
              : "Tutte le scuole del percorso hanno già prenotato almeno una classe.",
      };
    }
    return null;
  })();

  return {
    destinatari,
    nonInviabili,
    statistiche: [
      { valore: adesioni.length, etichetta: "scuole del percorso, confermate o attive" },
      { valore: giaPrenotate, etichetta: "hanno già prenotato una classe" },
    ],
    blocco,
  };
}

const preparaScuole = (id: CampagnaScuoleId, dati: DatiScuole, adesso?: Date) =>
  id === "promemoria_classi" ? preparaPromemoriaClassi(dati, adesso) : preparaInvitoScuole(dati, adesso);

/** Un codice di classe che non può essere vero, come quello degli esempi del biglietto. */
export const CODICE_CLASSE_ESEMPIO = "VPC-ESEMPIO1";
/** "I", "O" e "1" non stanno nell'alfabeto dei codici del percorso: il link dell'esempio non riempie niente. */
const CODICE_ADESIONE_ESEMPIO = "LIC-ESEMPIO1";

/** La classe finta degli esempi. */
function classeEsempio(giornate: { slug: string; status: SessionStatus; settore?: string }[]): PrenotazioneClasse {
  return {
    id: "esempio",
    codice: CODICE_CLASSE_ESEMPIO,
    istituto: "Liceo di esempio",
    comune: "Taranto",
    classe: "4B",
    docente_nome: NOME_ESEMPIO,
    docente_cognome: "Rossi",
    docente_email: "",
    docente_telefono: "",
    studenti: 26,
    accompagnatori: 2,
    posti: 28,
    note: null,
    licei_adesione_id: null,
    created_at: "",
    updated_at: "",
    giornate: giornate.map((g, i) => ({
      id: `esempio-${i}`,
      slug: g.slug,
      status: g.status,
      settore: g.settore ?? null,
      presenti: null,
      checkin_ts: null,
      created_at: null,
    })),
  };
}

/** Gli esempi delle campagne alle scuole, con dati finti. */
export function esempiScuole(campagna: CampagnaScuoleId): EsempioEmail[] {
  if (campagna === "invito_scuole") {
    const email = emailInvitoScuola({ nome: NOME_ESEMPIO, istituto: "Liceo di esempio", codiceAdesione: CODICE_ADESIONE_ESEMPIO });
    return [{ id: "scuola", etichetta: "Una scuola del percorso", ...email }];
  }
  const [primo, secondo] = SESSIONS;
  const esempi: { id: EsempioScuoleId; etichetta: string; giornate: { slug: string; status: SessionStatus; settore?: string }[] }[] = [
    {
      id: "classe_confermata",
      etichetta: "Confermata, con il settore",
      giornate: [
        { slug: primo.slug, status: "confermato", settore: "Tribuna B" },
        ...(secondo ? [{ slug: secondo.slug, status: "confermato" as SessionStatus }] : []),
      ],
    },
    { id: "classe_solo_primo", etichetta: `Solo ${giornateConArticolo([primo.slug])}`, giornate: [{ slug: primo.slug, status: "confermato" }] },
    { id: "classe_attesa", etichetta: "In lista d'attesa", giornate: [{ slug: primo.slug, status: "lista_attesa" }] },
  ];
  return esempi.map(({ id, etichetta, giornate }) => ({
    id,
    etichetta,
    ...emailClasse({ prenotazione: classeEsempio(giornate), motivo: "promemoria" }),
  }));
}

/* ── La vista per il pannello ─────────────────────────────────────────── */

/** Quanti indirizzi non validi si mostrano per nome nel pannello. */
const MAX_NON_INVIABILI = 50;

export type FaseAutomatico = "prima" | "in_corso" | "dopo";

export type VistaCampagna = {
  id: CampagnaId;
  nome: string;
  /** A chi scrive: le persone iscritte, i docenti delle classi o i referenti delle scuole. */
  pubblico: "iscritti" | "classi" | "scuole";
  inviato_at: string | null;
  esito: EsitoCampagna | null;
  /** A quanti partirebbe adesso: persone, classi o scuole, un'email per destinatario. */
  destinatari: number;
  /** Gli altri numeri da mostrare accanto ai destinatari. */
  statistiche: { valore: number; etichetta: string }[];
  /** Solo per le campagne agli iscritti: chi riceverà l'invito ad aggiungere una giornata. */
  conInvito: number;
  nonInviabili: NonInviabile[];
  nonInviabiliTotale: number;
  /** Quante delle non inviabili sono iscrizioni senza nessuna giornata. */
  senzaGiornata: number;
  /** Perché ora non può partire. Null: può partire. */
  bloccata: string | null;
  tipoBlocco: TipoBlocco | null;
  /** Solo per i promemoria non ancora inviati: "martedì 8 dicembre". */
  programmata: string | null;
  automatico: { dal: string; al: string; etichetta: string; ora: string; fase: FaseAutomatico } | null;
  esempi: EsempioEmail[];
};

export type RispostaComunicazioni = {
  campagne: VistaCampagna[];
  /** Dove arriva la prova: l'indirizzo dell'admin collegato. */
  emailProva: string | null;
  /** Il codice finto degli esempi, per dirlo sotto l'anteprima. */
  codiceEsempio: string;
  /** Il codice finto degli esempi delle classi. */
  codiceClasseEsempio: string;
  generato_at: string;
};

/**
 * La scheda Comunicazioni: stato, destinatari, blocchi e anteprime.
 * Gli iscritti e le scuole si leggono separatamente: se una delle due letture
 * non riesce, le sue campagne risultano bloccate e le altre restano
 * utilizzabili. Lancia solo se non si riesce a sapere che cosa è già partito.
 */
export async function vistaComunicazioni(
  client: SupabaseClient,
  opzioni: { emailProva: string | null; adesso?: Date },
): Promise<RispostaComunicazioni> {
  const adesso = opzioni.adesso ?? new Date();
  const [iscritti, scuole] = await Promise.all([
    leggiDatiComunicazioni(client).then(
      (valore) => ({ ok: true as const, valore }),
      (err: unknown) => ({ ok: false as const, errore: testoErrore(err) }),
    ),
    leggiDatiScuole(client),
  ]);
  if (!iscritti.ok) console.error("[eventi/comunicazioni] iscritti non letti:", iscritti.errore);
  if (!scuole.classi.ok) console.error("[eventi/comunicazioni] classi non lette:", scuole.classi.errore);
  if (!scuole.adesioni.ok) console.error("[eventi/comunicazioni] adesioni non lette:", scuole.adesioni.errore);
  // Lo stato degli invii serve sempre: senza, non si sa che cosa è già partito.
  const stati = iscritti.ok ? iscritti.valore.stati : await leggiStatiInvio(client);
  const oggi = oggiRoma(adesso);
  const fase: FaseAutomatico =
    oggi < PROMEMORIA_AUTOMATICO.dal ? "prima" : oggi > PROMEMORIA_AUTOMATICO.al ? "dopo" : "in_corso";

  const automaticoPer = (id: CampagnaId) =>
    id === "promemoria" || id === "promemoria_classi" ? { ...PROMEMORIA_AUTOMATICO, fase } : null;

  const vista = (
    id: CampagnaId,
    pubblico: VistaCampagna["pubblico"],
    p: { destinatari: number; statistiche: VistaCampagna["statistiche"]; conInvito: number; nonInviabili: NonInviabile[]; blocco: { tipo: TipoBlocco; messaggio: string } | null },
    esempi: EsempioEmail[],
  ): VistaCampagna => {
    const stato = stati[id];
    const automatico = automaticoPer(id);
    return {
      id,
      nome: CAMPAGNE[id].nome,
      pubblico,
      inviato_at: stato.inviato_at,
      esito: stato.esito,
      destinatari: p.destinatari,
      statistiche: p.statistiche,
      conInvito: p.conInvito,
      nonInviabili: p.nonInviabili.slice(0, MAX_NON_INVIABILI),
      nonInviabiliTotale: p.nonInviabili.length,
      senzaGiornata: p.nonInviabili.filter((x) => x.motivo === MOTIVO_SENZA_GIORNATA).length,
      bloccata: stato.inviato_at ? null : (p.blocco?.messaggio ?? null),
      tipoBlocco: stato.inviato_at ? null : (p.blocco?.tipo ?? null),
      programmata: automatico && !stato.inviato_at && fase !== "dopo" ? PROMEMORIA_AUTOMATICO.etichetta : null,
      automatico,
      esempi,
    };
  };

  const campagne: VistaCampagna[] = [];
  for (const id of CAMPAGNE_ISCRITTI_ID) {
    if (iscritti.ok) {
      const p = preparaCampagna(id, iscritti.valore, adesso);
      campagne.push(
        vista(
          id,
          "iscritti",
          {
            destinatari: p.destinatari.length,
            statistiche: [
              { valore: p.conInvito, etichetta: "con l'invito ad aggiungere una giornata" },
              { valore: p.soloAttesa, etichetta: "solo in lista d'attesa" },
            ],
            conInvito: p.conInvito,
            nonInviabili: p.nonInviabili,
            blocco: p.blocco,
          },
          esempiCampagna(id, iscritti.valore),
        ),
      );
    } else {
      campagne.push(
        vista(
          id,
          "iscritti",
          {
            destinatari: 0,
            statistiche: [],
            conInvito: 0,
            nonInviabili: [],
            blocco: { tipo: "lettura", messaggio: "Non riesco a leggere gli iscritti dal database: non si sa a chi scrivere. Riprova tra poco." },
          },
          esempiCampagna(id, { posti: [], postiCompleti: false }),
        ),
      );
    }
  }
  for (const id of CAMPAGNE_SCUOLE_ID) {
    const p = preparaScuole(id, scuole, adesso);
    campagne.push(
      vista(
        id,
        id === "promemoria_classi" ? "classi" : "scuole",
        { destinatari: p.destinatari.length, statistiche: p.statistiche, conInvito: 0, nonInviabili: p.nonInviabili, blocco: p.blocco },
        esempiScuole(id),
      ),
    );
  }

  return {
    campagne,
    emailProva: opzioni.emailProva,
    codiceEsempio: CODICE_ESEMPIO,
    codiceClasseEsempio: CODICE_CLASSE_ESEMPIO,
    generato_at: adesso.toISOString(),
  };
}

/* ── La prova ─────────────────────────────────────────────────────────── */

/**
 * L'email di prova: la campagna con l'esempio scelto, all'indirizzo di chi
 * la chiede. Non tocca la chiave: non conta come invio.
 */
export async function inviaProva(
  client: SupabaseClient,
  resend: Pick<Resend, "emails">,
  campagna: CampagnaId,
  opzioni: { a: string; esempio?: string },
): Promise<{ ok: true; esempio: string } | { ok: false; errore: string }> {
  let esempi: EsempioEmail[];
  if (perIscritti(campagna)) {
    // Solo i posti: l'esempio non ha bisogno degli iscritti.
    const posti = await postiPerGiornata(client);
    const postiCompleti = SESSIONS.every((s) => posti.some((p) => p.slug === s.slug));
    esempi = esempiCampagna(campagna, { posti, postiCompleti });
  } else {
    esempi = esempiScuole(campagna);
  }
  const scelto = esempi.find((e) => e.id === opzioni.esempio) ?? esempi[0];
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_MITTENTE,
      to: opzioni.a,
      replyTo: EMAIL_RISPOSTE,
      subject: `[Prova] ${scelto.subject}`,
      html: scelto.html,
      text: scelto.text,
      tags: [
        { name: "evento", value: "vivere-piu-a-lungo" },
        { name: "campagna", value: `${CAMPAGNE[campagna].etichetta}-prova` },
      ],
    });
    if (error) return { ok: false, errore: senzaEmail(error.message) };
    return { ok: true, esempio: scelto.etichetta };
  } catch (err) {
    return { ok: false, errore: senzaEmail(err instanceof Error ? err.message : String(err)) };
  }
}

/* ── L'invio a tutti ──────────────────────────────────────────────────── */

/** Indirizzi per chiamata all'API di invio a blocchi di Resend (il massimo è 100). */
const BLOCCO = 100;
/** Pausa fra un blocco e il successivo, sotto il limite di richieste al secondo. */
const PAUSA_MS = 600;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Un messaggio d'errore senza indirizzi email dentro, per i log. */
function senzaEmail(testo: string): string {
  return testo.replace(/[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/g, "[email]");
}

/**
 * Prenota l'invio scrivendo la chiave con la data, PRIMA di mandare
 * qualsiasi email. Due richieste insieme: la chiave primaria fa passare solo
 * la prima. Una chiave presente ma vuota (svuotata a mano dal database) si
 * prenota solo se è ancora vuota, con lo stesso effetto.
 */
async function prenota(
  client: SupabaseClient,
  chiave: string,
  adesso: string,
  autore: string | null,
): Promise<"prenotato" | "gia_inviato"> {
  const riga = { chiave, valore: adesso, aggiornato_at: adesso, aggiornato_by: autore };
  const { error } = await client.from("licei_config").insert(riga);
  if (!error) return "prenotato";
  if (error.code !== "23505") throw new Error(`licei_config: ${error.message}`);

  for (const vuota of ["", null] as const) {
    const base = client.from("licei_config").update(riga).eq("chiave", chiave);
    const { data, error: erroreVuota } = await (vuota === null
      ? base.is("valore", null)
      : base.eq("valore", vuota)
    ).select("chiave");
    if (erroreVuota) throw new Error(`licei_config: ${erroreVuota.message}`);
    if ((data ?? []).length > 0) return "prenotato";
  }
  return "gia_inviato";
}

async function scriviEsito(
  client: SupabaseClient,
  chiaveEsito: string,
  esito: EsitoCampagna,
  autore: string | null,
  log: string,
): Promise<void> {
  const { error } = await client.from("licei_config").upsert(
    { chiave: chiaveEsito, valore: JSON.stringify(esito), aggiornato_at: esito.at, aggiornato_by: autore },
    { onConflict: "chiave" },
  );
  if (error) console.error(`${log}: esito non registrato:`, error.message);
}

export type RisultatoCampagna =
  | { stato: "bloccata"; tipo: TipoBlocco; messaggio: string }
  | { stato: "gia_inviata"; inviato_at: string | null }
  | { stato: "prenotazione_fallita" }
  /** Non è partita nessuna email: la prenotazione è stata tolta, si può riprovare. */
  | { stato: "nessuna_partita"; esito: EsitoCampagna }
  | { stato: "inviata"; inviato_at: string; esito: EsitoCampagna };

/**
 * Prepara, prenota e invia una campagna a tutti, a blocchi da 100. Non
 * lancia per gli errori di invio: li conta. Lancia solo se il database non
 * risponde prima della prenotazione (e allora non è partito niente).
 */
export async function inviaCampagna(
  client: SupabaseClient,
  resend: Pick<Resend, "batch">,
  campagna: CampagnaId,
  opzioni: { autore: string | null; origine: "pannello" | "cron" },
): Promise<RisultatoCampagna> {
  const def = CAMPAGNE[campagna];
  const log = `Evento ${def.etichetta.replace(/-/g, " ")} (${opzioni.origine})`;

  // Prima la chiave, che costa una lettura: il cron passa anche nei giorni
  // dopo l'invio, e non serve leggere tutti gli iscritti per saperlo.
  const gia = (await leggiStatiInvio(client))[campagna].inviato_at;
  if (gia) return { stato: "gia_inviata", inviato_at: gia };

  let daSpedire: DaSpedire[];
  let nonInviabili: NonInviabile[];
  if (perIscritti(campagna)) {
    const dati = await leggiDatiComunicazioni(client);
    const prep = preparaCampagna(campagna, dati);
    if (prep.blocco) {
      console.error(`${log}: non inviata, ${prep.blocco.tipo}.`);
      return { stato: "bloccata", tipo: prep.blocco.tipo, messaggio: prep.blocco.messaggio };
    }
    if (!dati.postiCompleti) {
      // Solo il promemoria arriva qui: parte lo stesso, senza l'invito.
      console.warn(`${log}: posti liberi non leggibili, il promemoria parte senza l'invito ad aggiungere una giornata.`);
    }
    const motivo = MOTIVO[campagna];
    daSpedire = prep.destinatari.map((d) => ({
      rif: d.rif,
      email: d.email,
      componi: () =>
        emailBiglietto({ nome: d.nome, codice: d.codice, giornate: d.giornate, motivo, aggiungibili: d.aggiungibili }),
    }));
    nonInviabili = prep.nonInviabili;
  } else {
    const dati = await leggiDatiScuole(client);
    const prep = preparaScuole(campagna, dati);
    if (prep.blocco) {
      console.error(`${log}: non inviata, ${prep.blocco.tipo}.`);
      return { stato: "bloccata", tipo: prep.blocco.tipo, messaggio: prep.blocco.messaggio };
    }
    daSpedire = prep.destinatari;
    nonInviabili = prep.nonInviabili;
  }

  const adesso = new Date().toISOString();
  try {
    if ((await prenota(client, def.chiave, adesso, opzioni.autore)) === "gia_inviato") {
      return { stato: "gia_inviata", inviato_at: null };
    }
  } catch (err) {
    console.error(`${log}: prenotazione non riuscita:`, err instanceof Error ? err.message : err);
    return { stato: "prenotazione_fallita" };
  }

  // Un'iscrizione senza giornate non ha niente da ricevere: non è un
  // destinatario e non è un'email non partita. Un indirizzo scritto male sì.
  const indirizziSbagliati = nonInviabili.filter((x) => x.motivo !== MOTIVO_SENZA_GIORNATA).length;
  for (const x of nonInviabili) {
    // Il motivo per esteso può contenere il dominio dell'indirizzo: nei log solo la categoria.
    const perche = x.motivo === MOTIVO_SENZA_GIORNATA ? "nessuna giornata" : "indirizzo non valido";
    console.warn(`${log}: ${x.rif}: ${perche}, esclusa.`);
  }
  return spedisci(client, resend, def, daSpedire, indirizziSbagliati, adesso, opzioni.autore, log);
}

/**
 * L'invio vero, già prenotato: a blocchi da 100 con l'API batch di Resend,
 * un secondo tentativo per un rifiuto passeggero, l'esito scritto a ogni
 * blocco. Se non parte niente la prenotazione si toglie, così si può
 * riprovare quando il problema è risolto.
 */
async function spedisci(
  client: SupabaseClient,
  resend: Pick<Resend, "batch">,
  def: DefinizioneCampagna,
  destinatari: DaSpedire[],
  scartati: number,
  adesso: string,
  autore: string | null,
  log: string,
): Promise<RisultatoCampagna> {
  const totale = destinatari.length + scartati;
  let inviate = 0;
  let errori = scartati;
  console.log(`${log}: inizio, ${destinatari.length} destinatari in ${Math.ceil(destinatari.length / BLOCCO)} blocchi.`);

  for (let i = 0; i < destinatari.length; i += BLOCCO) {
    const n = i / BLOCCO;
    const blocco = destinatari.slice(i, i + BLOCCO);
    if (i > 0) await pausa(PAUSA_MS);

    // Un'email che non si riesce a comporre non ferma le altre.
    const pronti: { d: DaSpedire; email: EmailBiglietto }[] = [];
    for (const d of blocco) {
      try {
        pronti.push({ d, email: d.componi() });
      } catch (err) {
        errori += 1;
        console.error(`${log}: ${d.rif}: email non composta (${err instanceof Error ? err.message : String(err)}).`);
      }
    }
    if (pronti.length === 0) continue;

    const messaggi = pronti.map(({ d, email }) => ({
      from: EMAIL_MITTENTE,
      to: [d.email],
      replyTo: EMAIL_RISPOSTE,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "evento", value: "vivere-piu-a-lungo" },
        { name: "campagna", value: def.etichetta },
      ],
    }));
    // La chiave di idempotenza è legata a questa prenotazione e a questo
    // blocco: se la rete cade dopo che Resend ha accettato, il secondo
    // tentativo non manda una seconda copia.
    const opzioniInvio = {
      batchValidation: "permissive" as const,
      idempotencyKey: `evento-${def.etichetta}-${adesso}-${n}`,
    };

    let risposta: Awaited<ReturnType<typeof resend.batch.send<typeof opzioniInvio>>> | null = null;
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      try {
        risposta = await resend.batch.send(messaggi, opzioniInvio);
      } catch (err) {
        risposta = {
          data: null,
          error: {
            message: err instanceof Error ? err.message : String(err),
            statusCode: null,
            name: "application_error",
          },
          headers: null,
        } as typeof risposta;
      }
      // Si riprova una volta sola, e solo per un rifiuto passeggero.
      const codice = risposta?.error?.statusCode ?? null;
      if (!risposta?.error || (codice !== null && codice !== 429 && codice < 500) || tentativo > 0) break;
      await pausa(1500);
    }

    if (!risposta || risposta.error) {
      errori += pronti.length;
      const motivo = senzaEmail(risposta?.error?.message ?? "errore sconosciuto");
      console.error(`${log}: blocco ${n + 1} non inviato (${motivo}).`);
      for (const { d } of pronti) console.error(`${log}: ${d.rif}: non inviata.`);
    } else {
      const rifiutate = risposta.data?.errors ?? [];
      for (const e of rifiutate) {
        console.error(`${log}: ${pronti[e.index]?.d.rif ?? "?"}: non inviata (${senzaEmail(e.message)}).`);
      }
      errori += rifiutate.length;
      inviate += pronti.length - rifiutate.length;
    }

    // L'esito si aggiorna a ogni blocco: se la funzione si interrompe a metà,
    // il pannello dice quante ne sono partite.
    if (inviate > 0 && i + BLOCCO < destinatari.length) {
      await scriviEsito(
        client,
        def.chiaveEsito,
        { destinatari: totale, inviate, errori, at: new Date().toISOString(), completato: false },
        autore,
        log,
      );
    }
  }

  const esito: EsitoCampagna = { destinatari: totale, inviate, errori, at: new Date().toISOString(), completato: true };
  console.log(`${log}: fine, ${inviate} partite, ${errori} non partite su ${totale}.`);

  if (inviate === 0) {
    // Non è partito niente: la prenotazione si toglie, così si può riprovare
    // quando il problema è risolto. Solo la propria: il filtro sulla data non
    // tocca un invio partito nel frattempo.
    const { error } = await client.from("licei_config").delete().eq("chiave", def.chiave).eq("valore", adesso);
    if (error) console.error(`${log}: prenotazione non tolta:`, error.message);
    return { stato: "nessuna_partita", esito };
  }

  await scriviEsito(client, def.chiaveEsito, esito, autore, log);
  return { stato: "inviata", inviato_at: adesso, esito };
}

/** "Nessuna email è partita", "342 email partite su 345, 3 non partite": per le risposte delle rotte. */
export function descriviEsito(e: EsitoCampagna): string {
  const base = `${numero(e.inviate)} ${e.inviate === 1 ? "email partita" : "email partite"} su ${numero(e.destinatari)}`;
  return e.errori > 0 ? `${base}, ${numero(e.errori)} non ${e.errori === 1 ? "partita" : "partite"}` : base;
}
