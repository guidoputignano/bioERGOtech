import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCheckinStaff } from "@/lib/eventi/admin-guard";
import { SELECT_ISCRIZIONE, normalizzaIscrizione, pulisciCodice, type IscrizioneEvento } from "@/lib/eventi/evento-server";
import {
  categoriaLabel,
  etichettaGiornata,
  giornataDiOggi,
  giornateConArticolo,
  sessionBySlug,
} from "@/app/eventi/vivere-piu-a-lungo/content";

export const dynamic = "force-dynamic";

/**
 * La modalità ingresso: il check-in alla porta del 10 e dell'11 dicembre.
 *
 * Aperta agli admin e ai volontari in EVENT_CHECKIN_EMAILS (vedi
 * lib/eventi/admin-guard.ts). Risponde solo con quello che serve alla porta:
 * nome, categoria, organizzazione o classe, note. Mai email né telefono.
 *
 * GET  ?giornata=giorno-1
 *      { giornata, confermati, lista_attesa, entrati, ultimi: [{ bridgeId, nome, cognome, ora }] }
 *
 * POST { codice, giornata, forza? }        il QR o il codice scritto a mano
 * POST { registrazione, giornata, forza? } una persona trovata per nome
 *      { esito, persona?, ora?, altreGiornate?, bridgeId?, forzato?: "lista_attesa" | "altra_giornata" }
 *      esito: entrato | gia_entrato | lista_attesa | altra_giornata | non_trovato
 *
 * POST { annulla: bridgeId, forzato? }     l'ingresso torna com'era prima:
 *      "registrato"; con forzato "lista_attesa" anche di nuovo in lista
 *      d'attesa; una giornata aggiunta alla porta (riga nata nello stesso
 *      istante dell'ingresso) si toglie
 *      { annullato, giaAnnullato?, tornaInAttesa?, giornataTolta? }
 * POST { cerca, giornata }                 biglietto dimenticato: per nome o cognome
 *
 * L'ora d'ingresso è la prima: l'aggiornamento è condizionato a
 * stato_checkin diverso da "presente", quindi se due telefoni leggono lo
 * stesso biglietto nello stesso istante uno solo vince, l'altro vede
 * "già entrato" con l'ora del primo.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NESSUNA_CACHE = { "Cache-Control": "no-store" };

const FORMATO_ORA = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "09:12", nel fuso di Roma. */
function ora(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : FORMATO_ORA.format(d);
}

function risposta(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: NESSUNA_CACHE });
}

function errore(messaggio: string, status: number) {
  return risposta({ error: messaggio }, status);
}

/** Gli errori della guardia, in parole che lo staff alla porta capisce. */
function erroreAccesso(status: number) {
  if (status === 401) return errore("La sessione è scaduta: accedi di nuovo per continuare.", 401);
  if (status === 403) return errore("Questo account non è abilitato all'ingresso.", 403);
  return errore("Il server non è configurato per l'ingresso. Avvisa l'amministratore del sito.", status);
}

type Sessione = { id: string; slug: string };

/**
 * La riga di event_sessions della giornata. Se manca non si fa finta di
 * niente: l'ingresso si ferma con un messaggio che dice che cosa fare.
 */
async function sessioneDelGiorno(
  client: SupabaseClient,
  slug: string,
): Promise<{ sessione: Sessione } | { risposta: NextResponse }> {
  const { data, error } = await client.from("event_sessions").select("id, slug").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("[eventi/admin/ingresso] lettura giornata:", error.message);
    return { risposta: errore("Non riesco a leggere la giornata dal database. Riprova tra qualche secondo.", 500) };
  }
  if (!data) {
    console.error(`[eventi/admin/ingresso] giornata assente nel database: ${slug}`);
    return {
      risposta: errore(
        `Nel database manca la giornata in programma ${giornateConArticolo([slug])} ("${slug}" in event_sessions): gli ingressi non si possono registrare. Avvisa subito l'amministratore del sito.`,
        500,
      ),
    };
  }
  return { sessione: { id: String(data.id), slug: String(data.slug) } };
}

/** La giornata richiesta, solo se è una del sito. */
function giornataValida(v: unknown): string | null {
  return typeof v === "string" && sessionBySlug(v) ? v : null;
}

/**
 * I codici da cercare per quello che la fotocamera o lo staff hanno letto:
 * con o senza "VPL-", maiuscole o minuscole, con spazi, oppure il link al
 * biglietto online (che contiene il codice dopo /biglietto/).
 *
 * Lo stesso criterio, più largo, sta in Ingresso.tsx (sembraBiglietto), che
 * scarta prima di chiamare qui i QR che non sono biglietti.
 */
function codiciCandidati(grezzo: string): string[] {
  let testo = grezzo.trim().slice(0, 300);
  const link = testo.match(/biglietto\/([^/?#\s]+)/i);
  if (link) {
    try {
      testo = decodeURIComponent(link[1]);
    } catch {
      testo = link[1];
    }
  }
  const compatto = testo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const candidati = new Set<string>();
  if (/^VPL[A-Z0-9]{8}$/.test(compatto)) candidati.add(`VPL-${compatto.slice(3)}`);
  else if (/^[A-Z0-9]{8}$/.test(compatto)) candidati.add(`VPL-${compatto}`);
  const pulito = pulisciCodice(testo);
  if (pulito) candidati.add(pulito);
  return [...candidati].slice(0, 3);
}

function testoONull(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

/** Quello che la porta vede di una persona. */
function persona(iscr: IscrizioneEvento) {
  return {
    nome: iscr.nome,
    cognome: iscr.cognome,
    categoria: categoriaLabel(iscr.categoria),
    organizzazione: testoONull(iscr.organizzazione),
    classe: testoONull(iscr.classe),
    note: testoONull(iscr.note),
  };
}

/* ── GET: i numeri della giornata e gli ultimi ingressi ─────────────────── */

export async function GET(request: Request) {
  const guardia = await requireCheckinStaff();
  if (guardia.error !== null) return erroreAccesso(guardia.status);
  const { client } = guardia;

  const giornata = giornataValida(new URL(request.url).searchParams.get("giornata"));
  if (!giornata) return errore("Giornata non valida.", 400);

  const trovata = await sessioneDelGiorno(client, giornata);
  if ("risposta" in trovata) return trovata.risposta;
  const { sessione } = trovata;

  // I conteggi con head: true non leggono le righe, quindi non hanno il
  // limite delle 1000 righe di una select normale.
  const conta = () =>
    client
      .from("event_registration_sessions")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessione.id);

  const [confermati, attesa, entrati, ultimi] = await Promise.all([
    conta().eq("is_waitlist", false),
    conta().eq("is_waitlist", true),
    conta().eq("stato_checkin", "presente"),
    client
      .from("event_registration_sessions")
      .select("id, checkin_ts, event_registrations ( nome, cognome )")
      .eq("session_id", sessione.id)
      .eq("stato_checkin", "presente")
      .not("checkin_ts", "is", null)
      .order("checkin_ts", { ascending: false })
      .limit(10),
  ]);

  const fallita = [confermati, attesa, entrati, ultimi].find((r) => r.error);
  if (fallita?.error) {
    console.error("[eventi/admin/ingresso] conteggi:", fallita.error.message);
    return errore("Non riesco a leggere i numeri della giornata. Riprova tra qualche secondo.", 500);
  }

  type RigaUltimo = {
    id: string;
    checkin_ts: string | null;
    event_registrations: { nome: string | null; cognome: string | null } | { nome: string | null; cognome: string | null }[] | null;
  };

  return risposta({
    giornata,
    // La giornata di oggi secondo il server, a ogni aggiornamento: una pagina
    // aperta da ieri passa da sola al giorno giusto (bollino e avviso).
    oggi: giornataDiOggi()?.slug ?? null,
    confermati: confermati.count ?? 0,
    lista_attesa: attesa.count ?? 0,
    entrati: entrati.count ?? 0,
    ultimi: ((ultimi.data ?? []) as RigaUltimo[]).map((r) => {
      const reg = Array.isArray(r.event_registrations) ? r.event_registrations[0] : r.event_registrations;
      return {
        bridgeId: String(r.id),
        nome: reg?.nome ?? "",
        cognome: reg?.cognome ?? "",
        ora: ora(r.checkin_ts) ?? "",
      };
    }),
  });
}

/* ── POST: ingresso, annullamento, ricerca ──────────────────────────────── */

type RigaPonte = { id: string; is_waitlist: boolean; stato_checkin: string; checkin_ts: string | null };

type EsitoPresenza =
  | { tipo: "entrato"; bridgeId: string; checkin_ts: string | null }
  | { tipo: "gia_entrato"; bridgeId: string; checkin_ts: string | null }
  | { tipo: "lista_attesa"; bridgeId: string }
  | { tipo: "cambiata" }
  | { tipo: "errore"; messaggio: string };

/**
 * Segna "presente" una riga ponte, solo se non lo è già: è il punto che
 * rende sicuri due telefoni che leggono lo stesso biglietto insieme. Con
 * `ancheAttesa` la persona in lista d'attesa entra e la riga diventa
 * confermata; senza, una riga in attesa non si tocca.
 */
async function segnaPresente(client: SupabaseClient, bridgeId: string, ancheAttesa: boolean): Promise<EsitoPresenza> {
  const adesso = new Date().toISOString();
  let aggiorna = client
    .from("event_registration_sessions")
    .update(
      ancheAttesa
        ? { stato_checkin: "presente", checkin_ts: adesso, is_waitlist: false }
        : { stato_checkin: "presente", checkin_ts: adesso },
    )
    .eq("id", bridgeId)
    .neq("stato_checkin", "presente");
  if (!ancheAttesa) aggiorna = aggiorna.eq("is_waitlist", false);

  const { data, error } = await aggiorna.select("id, checkin_ts").maybeSingle();
  if (error) {
    console.error("[eventi/admin/ingresso] aggiornamento presenza:", error.message);
    return { tipo: "errore", messaggio: "L'ingresso non è stato salvato. Riprova." };
  }
  if (data) return { tipo: "entrato", bridgeId: String(data.id), checkin_ts: data.checkin_ts ?? adesso };

  // Nessuna riga aggiornata: qualcuno è arrivato prima, oppure la riga è
  // cambiata tra la lettura e la scrittura. Si rilegge e si dice com'è.
  const { data: riletta, error: erroreLettura } = await client
    .from("event_registration_sessions")
    .select("id, is_waitlist, stato_checkin, checkin_ts")
    .eq("id", bridgeId)
    .maybeSingle();
  if (erroreLettura) {
    console.error("[eventi/admin/ingresso] rilettura presenza:", erroreLettura.message);
    return { tipo: "errore", messaggio: "Non riesco a verificare l'ingresso. Riprova." };
  }
  const riga = riletta as RigaPonte | null;
  if (!riga) return { tipo: "cambiata" };
  if (riga.stato_checkin === "presente") return { tipo: "gia_entrato", bridgeId: riga.id, checkin_ts: riga.checkin_ts };
  if (riga.is_waitlist && !ancheAttesa) return { tipo: "lista_attesa", bridgeId: riga.id };
  return { tipo: "cambiata" };
}

/**
 * Fa entrare una persona che non ha questa giornata: la decisione è della
 * porta, quindi la capienza non conta. Se nel frattempo la riga è comparsa
 * (un altro telefono, o la persona che si è appena iscritta) si usa quella.
 */
async function aggiungiGiornataEdEntra(
  client: SupabaseClient,
  registrationId: string,
  sessionId: string,
): Promise<EsitoPresenza> {
  const adesso = new Date().toISOString();
  const { data, error } = await client
    .from("event_registration_sessions")
    .insert({
      registration_id: registrationId,
      session_id: sessionId,
      is_waitlist: false,
      stato_checkin: "presente",
      checkin_ts: adesso,
      // Lo stesso istante dell'ingresso: così l'annullamento riconosce con
      // certezza una riga nata alla porta (vedi nataAllaPorta).
      created_at: adesso,
    })
    .select("id, checkin_ts")
    .single();
  if (!error && data) return { tipo: "entrato", bridgeId: String(data.id), checkin_ts: data.checkin_ts ?? adesso };

  if (error?.code === "23505") {
    const { data: esistente, error: erroreLettura } = await client
      .from("event_registration_sessions")
      .select("id")
      .eq("registration_id", registrationId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (erroreLettura || !esistente) return { tipo: "cambiata" };
    return segnaPresente(client, String(esistente.id), true);
  }
  console.error("[eventi/admin/ingresso] giornata aggiunta alla porta:", error?.message ?? "nessuna riga");
  return { tipo: "errore", messaggio: "L'ingresso non è stato salvato. Riprova." };
}

async function caricaPerCodice(client: SupabaseClient, grezzo: string): Promise<IscrizioneEvento | null> {
  const candidati = codiciCandidati(grezzo);
  if (candidati.length === 0) return null;
  const { data, error } = await client
    .from("event_registrations")
    .select(SELECT_ISCRIZIONE)
    .in("codice_univoco", candidati)
    .limit(1);
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? normalizzaIscrizione(data[0]) : null;
}

async function caricaPerId(client: SupabaseClient, id: string): Promise<IscrizioneEvento | null> {
  const { data, error } = await client.from("event_registrations").select(SELECT_ISCRIZIONE).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizzaIscrizione(data) : null;
}

/** Tutto il giro dell'ingresso per una persona già trovata. */
async function ingresso(
  client: SupabaseClient,
  iscr: IscrizioneEvento,
  sessione: Sessione,
  forza: boolean,
) {
  const chi = persona(iscr);
  const altreGiornate = iscr.giornate
    .filter((g) => g.slug !== sessione.slug && sessionBySlug(g.slug))
    .map((g) => etichettaGiornata(g.slug));
  const ponte = iscr.giornate.find((g) => g.slug === sessione.slug);

  // Perché la persona è entrata senza un posto confermato per oggi, se è così.
  let forzato: Forzato | undefined;
  let esito: EsitoPresenza;
  if (ponte) {
    if (ponte.stato_checkin === "presente") {
      return risposta({ esito: "gia_entrato", persona: chi, ora: ora(ponte.checkin_ts), bridgeId: ponte.id, altreGiornate });
    }
    if (ponte.status === "lista_attesa" && !forza) {
      return risposta({ esito: "lista_attesa", persona: chi, bridgeId: ponte.id, altreGiornate });
    }
    if (ponte.status === "lista_attesa") forzato = "lista_attesa";
    esito = await segnaPresente(client, ponte.id, forzato === "lista_attesa");
  } else {
    if (!forza) return risposta({ esito: "altra_giornata", persona: chi, altreGiornate });
    forzato = "altra_giornata";
    esito = await aggiungiGiornataEdEntra(client, iscr.id, sessione.id);
  }

  switch (esito.tipo) {
    case "entrato":
      return risposta({ esito: "entrato", persona: chi, ora: ora(esito.checkin_ts), bridgeId: esito.bridgeId, altreGiornate, forzato });
    case "gia_entrato":
      return risposta({ esito: "gia_entrato", persona: chi, ora: ora(esito.checkin_ts), bridgeId: esito.bridgeId, altreGiornate });
    case "lista_attesa":
      return risposta({ esito: "lista_attesa", persona: chi, bridgeId: esito.bridgeId, altreGiornate });
    case "cambiata":
      return errore("L'iscrizione è cambiata proprio in questo momento. Leggi di nuovo il biglietto.", 409);
    case "errore":
      return errore(esito.messaggio, 500);
  }
}

type Forzato = "lista_attesa" | "altra_giornata";

/**
 * Entro quanto la riga ponte e l'ingresso nascono insieme, se la giornata è
 * stata aggiunta alla porta. aggiungiGiornataEdEntra scrive lo stesso
 * istante nei due campi; il margine copre le righe scritte prima che lo
 * facesse. Stretto apposta: chi si iscrive dal modulo alla porta e viene
 * letto subito dopo ha una riga sua, che l'annullamento non deve cancellare.
 */
const NATA_ALLA_PORTA_MS = 2_000;

/**
 * La riga è nata alla porta (aggiungiGiornataEdEntra): creata e segnata
 * presente nello stesso istante. È la rete di sicurezza per un telefono che
 * non sa più com'era entrata la persona (per esempio dopo un ricaricamento).
 */
function nataAllaPorta(createdAt: string | null, checkinTs: string | null): boolean {
  if (!createdAt || !checkinTs) return false;
  const creata = Date.parse(createdAt);
  const entrata = Date.parse(checkinTs);
  if (Number.isNaN(creata) || Number.isNaN(entrata)) return false;
  return Math.abs(entrata - creata) <= NATA_ALLA_PORTA_MS;
}

/**
 * Annulla un ingresso e rimette le cose come prima. Un ingresso normale
 * torna "registrato". Un ingresso forzato aveva cambiato anche altro, e si
 * disfa anche quello: chi era in lista d'attesa ci torna, e una giornata
 * aggiunta alla porta si toglie. Tutto solo se la riga è ancora "presente".
 */
async function annulla(client: SupabaseClient, bridgeId: string, forzato: Forzato | null) {
  const { data: riga, error: erroreLettura } = await client
    .from("event_registration_sessions")
    .select("id, stato_checkin, checkin_ts, created_at")
    .eq("id", bridgeId)
    .maybeSingle();
  if (erroreLettura) {
    console.error("[eventi/admin/ingresso] lettura per annullamento:", erroreLettura.message);
    return errore("L'annullamento non è stato salvato. Riprova.", 500);
  }
  if (!riga) return errore("Questo ingresso non esiste più: aggiorna l'elenco.", 404);
  // Già annullato, magari da un altro telefono: va bene così.
  if (riga.stato_checkin !== "presente") return risposta({ annullato: true, giaAnnullato: true });

  // Si cancella solo una riga nata davvero alla porta: aggiungiGiornataEdEntra
  // scrive lo stesso istante in created_at e checkin_ts. Il "forzato" che
  // manda il telefono non basta da solo: non deve poter togliere una giornata
  // che la persona aveva già (per esempio nella rara gara 23505, in cui la
  // riga esisteva già e l'ingresso è stato registrato su quella).
  const nata = nataAllaPorta(riga.created_at ?? null, riga.checkin_ts ?? null);
  if (forzato === "altra_giornata" && !nata) {
    console.warn(`[eventi/admin/ingresso] annullamento ${bridgeId}: giornata non nata alla porta, torna solo "registrato".`);
  }
  if (nata) {
    const { data: tolte, error } = await client
      .from("event_registration_sessions")
      .delete()
      .eq("id", bridgeId)
      .eq("stato_checkin", "presente")
      .select("id");
    if (error) {
      console.error("[eventi/admin/ingresso] annullamento (giornata aggiunta alla porta):", error.message);
      return errore("L'annullamento non è stato salvato. Riprova.", 500);
    }
    if (!tolte || tolte.length === 0) return risposta({ annullato: true, giaAnnullato: true });
    return risposta({ annullato: true, giornataTolta: true });
  }

  const tornaInAttesa = forzato === "lista_attesa";
  const { data, error } = await client
    .from("event_registration_sessions")
    .update(
      tornaInAttesa
        ? { stato_checkin: "registrato", checkin_ts: null, is_waitlist: true }
        : { stato_checkin: "registrato", checkin_ts: null },
    )
    .eq("id", bridgeId)
    .eq("stato_checkin", "presente")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[eventi/admin/ingresso] annullamento:", error.message);
    return errore("L'annullamento non è stato salvato. Riprova.", 500);
  }
  if (!data) return risposta({ annullato: true, giaAnnullato: true });
  return risposta({ annullato: true, ...(tornaInAttesa ? { tornaInAttesa: true } : {}) });
}

/**
 * Normalizza per confrontare i nomi: minuscole, senza accenti, e un solo
 * apostrofo. L'iPhone scrive ’ (tipografico): "D’Amico" salvato così deve
 * trovarsi anche scrivendo "d'amico" da un telefono Android, e viceversa.
 */
function piano(v: string): string {
  return v
    .replace(/[‘’ʼ`´]/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Biglietto dimenticato: le persone il cui nome o cognome contiene quello
 * che si è scritto. Almeno tre lettere, al massimo otto risultati, e solo
 * quello che serve a riconoscere la persona.
 */
async function cerca(client: SupabaseClient, testo: string, sessione: Sessione) {
  const parole = piano(testo)
    .replace(/[^a-z' -]/g, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  const lunghezza = parole.join("").length;
  if (parole.length === 0 || lunghezza < 3) return errore("Scrivi almeno tre lettere del nome o del cognome.", 400);

  // Il database cerca la parola più lunga, il resto lo filtra qui: così
  // "rossi mario" trova Mario Rossi. Vocali e apostrofi diventano il jolly
  // "_" di ilike, perché il database distingue gli accenti e qui no:
  // "nicolo" deve trovare anche Nicolò.
  const chiave = [...parole].sort((a, b) => b.length - a.length)[0].replace(/[aeiou']/g, "_");
  const { data, error } = await client
    .from("event_registrations")
    .select(SELECT_ISCRIZIONE)
    .or(`cognome.ilike.%${chiave}%,nome.ilike.%${chiave}%`)
    .order("cognome", { ascending: true })
    .limit(60);
  if (error) {
    console.error("[eventi/admin/ingresso] ricerca:", error.message);
    return errore("La ricerca non è riuscita. Riprova.", 500);
  }

  const righe = data ?? [];
  const risultati = righe
    .map(normalizzaIscrizione)
    .filter((i) => {
      const nome = piano(`${i.nome} ${i.cognome}`);
      return parole.every((p) => nome.includes(p));
    })
    .slice(0, 8)
    .map((i) => {
      const qui = i.giornate.find((g) => g.slug === sessione.slug);
      return {
        rif: i.id,
        ...persona(i),
        oggi: qui ? (qui.stato_checkin === "presente" ? "entrato" : qui.status) : "non_iscritto",
        ora: qui?.stato_checkin === "presente" ? ora(qui.checkin_ts) : null,
        altreGiornate: i.giornate
          .filter((g) => g.slug !== sessione.slug && sessionBySlug(g.slug))
          .map((g) => etichettaGiornata(g.slug)),
      };
    });

  // Con 60 righe lette la lista può essere incompleta: si chiede di scrivere di più.
  return risposta({ risultati, troppi: righe.length >= 60 || risultati.length >= 8 });
}

export async function POST(request: Request) {
  const guardia = await requireCheckinStaff();
  if (guardia.error !== null) return erroreAccesso(guardia.status);
  const { client } = guardia;

  let body: Record<string, unknown>;
  try {
    const letto = await request.json();
    if (!letto || typeof letto !== "object") throw new Error("corpo");
    body = letto as Record<string, unknown>;
  } catch {
    return errore("Richiesta non valida.", 400);
  }

  if ("annulla" in body) {
    const id = typeof body.annulla === "string" ? body.annulla : "";
    if (!UUID.test(id)) return errore("Ingresso da annullare non valido.", 400);
    const forzato: Forzato | null =
      body.forzato === "lista_attesa" || body.forzato === "altra_giornata" ? body.forzato : null;
    return annulla(client, id, forzato);
  }

  const giornata = giornataValida(body.giornata);
  if (!giornata) return errore("Giornata non valida.", 400);
  const trovata = await sessioneDelGiorno(client, giornata);
  if ("risposta" in trovata) return trovata.risposta;
  const { sessione } = trovata;

  if (typeof body.cerca === "string") return cerca(client, body.cerca.slice(0, 80), sessione);

  const forza = body.forza === true;
  let iscr: IscrizioneEvento | null;
  try {
    if (typeof body.registrazione === "string") {
      if (!UUID.test(body.registrazione)) return errore("Persona non valida.", 400);
      iscr = await caricaPerId(client, body.registrazione);
    } else if (typeof body.codice === "string" && body.codice.trim()) {
      iscr = await caricaPerCodice(client, body.codice);
    } else {
      return errore("Manca il codice del biglietto.", 400);
    }
  } catch (err) {
    console.error("[eventi/admin/ingresso] lettura iscrizione:", err instanceof Error ? err.message : err);
    return errore("Non riesco a leggere l'iscrizione dal database. Riprova.", 500);
  }

  if (!iscr) return risposta({ esito: "non_trovato" });
  return ingresso(client, iscr, sessione, forza);
}
