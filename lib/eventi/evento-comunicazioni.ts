/**
 * Le due email a tutti gli iscritti all'evento, dalla scheda Comunicazioni
 * del pannello e dal cron:
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
 * Nei log niente dati personali: le persone sono "iscrizione <id>".
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

/* ── Le campagne ──────────────────────────────────────────────────────── */

export const CAMPAGNE_ID = ["biglietto_aggiornato", "promemoria"] as const;
export type CampagnaId = (typeof CAMPAGNE_ID)[number];

export const campagnaValida = (v: unknown): v is CampagnaId =>
  typeof v === "string" && (CAMPAGNE_ID as readonly string[]).includes(v);

type DefinizioneCampagna = {
  nome: string;
  motivo: MotivoEmail;
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
    motivo: "aggiornamento",
    chiave: "evento_biglietto_aggiornato_inviato_at",
    chiaveEsito: "evento_biglietto_aggiornato_esito",
    etichetta: "biglietto-aggiornato",
  },
  promemoria: {
    nome: "Promemoria prima dell'evento",
    motivo: "promemoria",
    chiave: "evento_promemoria_inviato_at",
    chiaveEsito: "evento_promemoria_esito",
    etichetta: "promemoria",
  },
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

/** Lo stato di tutte e due le campagne, da `licei_config`. Lancia se la lettura fallisce. */
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

/** Quello che serve a tutte e due le campagne, letto una volta. */
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
  | "nessun_destinatario";

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
  campagna: CampagnaId,
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

/** Un codice che non può essere vero: "O", "I" e "1" non stanno nell'alfabeto dei codici. */
export const CODICE_ESEMPIO = "VPL-ESEMPIO1";
const NOME_ESEMPIO = "Maria";

/** Le persone di esempio, dalle giornate del sito. Il primo è il caso che conta di più. */
function definizioniEsempi(campagna: CampagnaId): { id: EsempioId; etichetta: string; giornate: GiornataEmail[] }[] {
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

export type EsempioEmail = { id: EsempioId; etichetta: string } & EmailBiglietto;

/** Gli esempi di una campagna, con i posti liberi di adesso: l'anteprima è quello che partirebbe. */
export function esempiCampagna(campagna: CampagnaId, dati: Pick<DatiComunicazioni, "posti" | "postiCompleti">): EsempioEmail[] {
  return definizioniEsempi(campagna).map(({ id, etichetta, giornate }) => {
    const aggiungibili = dati.postiCompleti ? giornateAggiungibili(iscrizioneEsempio(giornate), dati.posti) : [];
    const email = emailBiglietto({
      nome: NOME_ESEMPIO,
      codice: CODICE_ESEMPIO,
      giornate,
      motivo: CAMPAGNE[campagna].motivo,
      aggiungibili,
    });
    return { id, etichetta, ...email };
  });
}

/* ── La vista per il pannello ─────────────────────────────────────────── */

/** Quanti indirizzi non validi si mostrano per nome nel pannello. */
const MAX_NON_INVIABILI = 50;

export type FaseAutomatico = "prima" | "in_corso" | "dopo";

export type VistaCampagna = {
  id: CampagnaId;
  nome: string;
  inviato_at: string | null;
  esito: EsitoCampagna | null;
  /** A quante persone partirebbe adesso, un'email per indirizzo. */
  destinatari: number;
  conInvito: number;
  soloAttesa: number;
  nonInviabili: NonInviabile[];
  nonInviabiliTotale: number;
  /** Quante delle non inviabili sono iscrizioni senza nessuna giornata. */
  senzaGiornata: number;
  /** Perché ora non può partire. Null: può partire. */
  bloccata: string | null;
  tipoBlocco: TipoBlocco | null;
  /** Solo per il promemoria non ancora inviato: "martedì 8 dicembre". */
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
  generato_at: string;
};

/** La scheda Comunicazioni: stato, destinatari, blocchi e anteprime. Lancia se il database non risponde. */
export async function vistaComunicazioni(
  client: SupabaseClient,
  opzioni: { emailProva: string | null; adesso?: Date },
): Promise<RispostaComunicazioni> {
  const adesso = opzioni.adesso ?? new Date();
  const dati = await leggiDatiComunicazioni(client);
  const oggi = oggiRoma(adesso);

  const campagne = CAMPAGNE_ID.map((id): VistaCampagna => {
    const p = preparaCampagna(id, dati, adesso);
    const stato = dati.stati[id];
    const fase: FaseAutomatico =
      oggi < PROMEMORIA_AUTOMATICO.dal ? "prima" : oggi > PROMEMORIA_AUTOMATICO.al ? "dopo" : "in_corso";
    const automatico = id === "promemoria" ? { ...PROMEMORIA_AUTOMATICO, fase } : null;
    return {
      id,
      nome: CAMPAGNE[id].nome,
      inviato_at: stato.inviato_at,
      esito: stato.esito,
      destinatari: p.destinatari.length,
      conInvito: p.conInvito,
      soloAttesa: p.soloAttesa,
      nonInviabili: p.nonInviabili.slice(0, MAX_NON_INVIABILI),
      nonInviabiliTotale: p.nonInviabili.length,
      senzaGiornata: p.nonInviabili.filter((x) => x.motivo === MOTIVO_SENZA_GIORNATA).length,
      bloccata: stato.inviato_at ? null : (p.blocco?.messaggio ?? null),
      tipoBlocco: stato.inviato_at ? null : (p.blocco?.tipo ?? null),
      programmata: automatico && !stato.inviato_at && fase !== "dopo" ? PROMEMORIA_AUTOMATICO.etichetta : null,
      automatico,
      esempi: esempiCampagna(id, dati),
    };
  });

  return { campagne, emailProva: opzioni.emailProva, codiceEsempio: CODICE_ESEMPIO, generato_at: adesso.toISOString() };
}

/* ── La prova ─────────────────────────────────────────────────────────── */

/**
 * L'email di prova: la campagna con la persona di esempio, all'indirizzo
 * di chi la chiede. Non tocca la chiave: non conta come invio.
 */
export async function inviaProva(
  client: SupabaseClient,
  resend: Pick<Resend, "emails">,
  campagna: CampagnaId,
  opzioni: { a: string; esempio?: string },
): Promise<{ ok: true; esempio: string } | { ok: false; errore: string }> {
  // Solo i posti: l'esempio non ha bisogno degli iscritti.
  const posti = await postiPerGiornata(client);
  const postiCompleti = SESSIONS.every((s) => posti.some((p) => p.slug === s.slug));
  const esempi = esempiCampagna(campagna, { posti, postiCompleti });
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

  const adesso = new Date().toISOString();
  try {
    if ((await prenota(client, def.chiave, adesso, opzioni.autore)) === "gia_inviato") {
      return { stato: "gia_inviata", inviato_at: null };
    }
  } catch (err) {
    console.error(`${log}: prenotazione non riuscita:`, err instanceof Error ? err.message : err);
    return { stato: "prenotazione_fallita" };
  }

  const { destinatari, nonInviabili } = prep;
  // Un'iscrizione senza giornate non ha niente da ricevere: non è un
  // destinatario e non è un'email non partita. Un indirizzo scritto male sì.
  const indirizziSbagliati = nonInviabili.filter((x) => x.motivo !== MOTIVO_SENZA_GIORNATA).length;
  const totale = destinatari.length + indirizziSbagliati;
  let inviate = 0;
  let errori = indirizziSbagliati;
  for (const x of nonInviabili) {
    // Il motivo per esteso può contenere il dominio dell'indirizzo: nei log solo la categoria.
    const perche = x.motivo === MOTIVO_SENZA_GIORNATA ? "nessuna giornata" : "indirizzo non valido";
    console.warn(`${log}: ${x.rif}: ${perche}, esclusa.`);
  }
  console.log(`${log}: inizio, ${destinatari.length} destinatari in ${Math.ceil(destinatari.length / BLOCCO)} blocchi.`);

  for (let i = 0; i < destinatari.length; i += BLOCCO) {
    const n = i / BLOCCO;
    const blocco = destinatari.slice(i, i + BLOCCO);
    if (i > 0) await pausa(PAUSA_MS);

    // Un'email che non si riesce a comporre non ferma le altre.
    const pronti: { d: Destinatario; email: EmailBiglietto }[] = [];
    for (const d of blocco) {
      try {
        pronti.push({
          d,
          email: emailBiglietto({
            nome: d.nome,
            codice: d.codice,
            giornate: d.giornate,
            motivo: def.motivo,
            aggiungibili: d.aggiungibili,
          }),
        });
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
        opzioni.autore,
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

  await scriviEsito(client, def.chiaveEsito, esito, opzioni.autore, log);
  return { stato: "inviata", inviato_at: adesso, esito };
}

/** "Nessuna email è partita", "342 email partite su 345, 3 non partite": per le risposte delle rotte. */
export function descriviEsito(e: EsitoCampagna): string {
  const base = `${numero(e.inviate)} ${e.inviate === 1 ? "email partita" : "email partite"} su ${numero(e.destinatari)}`;
  return e.errori > 0 ? `${base}, ${numero(e.errori)} non ${e.errori === 1 ? "partita" : "partite"}` : base;
}
