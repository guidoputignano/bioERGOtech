/**
 * Il calendario automatico della Commissione dei licei: promemoria di
 * consegna, smistamento, promemoria ai giudici, ridistribuzione, copertura
 * con la riserva. Lo esegue ogni mattina il cron
 * (`/api/cron/licei-commissione`); lo staff puo farlo partire anche dal
 * pannello, con lo stesso effetto.
 *
 * Ogni passo e dovuto da una data (`PASSI_AUTOMATICI`) e si fa una volta:
 * la chiave `auto_<passo>` in `licei_config` lo segna come fatto. Ogni
 * invio ha la sua prenotazione (`inviaAvvisoUnaVolta`), quindi un passo
 * rifatto (cron e pannello insieme, o un invio fallito a meta) non manda
 * due volte la stessa email. Le assegnazioni si aggiungono con
 * `ignoreDuplicates`, e la regola guarda quelle che ci sono gia: rifare lo
 * smistamento non cambia niente.
 *
 * Prima della migrazione 20261231100000 i passi che ne hanno bisogno non
 * partono e lo dicono; i promemoria di consegna partono comunque.
 *
 * Solo server: usa il client con service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import {
  STATI_ADESIONE_CHE_ACCETTANO,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  GIUDICI_PER_PROGETTO,
  PASSI_AUTOMATICI,
  PROGETTI_EXTRA,
  PROGETTI_MAX_PER_GIUDICE,
  SCADENZA_GIUDICI,
  SCHEDE_MINIME,
  chiavePasso,
  type IdPasso,
} from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";
import {
  assegnazioneAttiva,
  bisognoSmistamento,
  pianoAssegnazioni,
  progettiExtra,
  type AssegnazioneLetta,
  type NuovaAssegnazione,
} from "@/lib/eventi/licei-smistamento";
import {
  RISPOSTE_AVVISI,
  destinatariUnici,
  inviaAvvisoUnaVolta,
  righeDocentiAvviso,
  righeStudentiAvviso,
  type Destinatario,
} from "@/lib/eventi/licei-avvisi";
import * as E from "@/lib/eventi/licei-commissione-email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, "public", any>;
export type Invio = Pick<Resend, "batch">;

const PAGINA = 1000;
const MIGRAZIONE = "20261231100000_licei_smistamento";

/* ── Letture ──────────────────────────────────────────────────────────── */

type Esito<T> = { presente: boolean; righe: T[] };

/** Tutte le righe, a pagine. Una tabella o colonna mancante torna `presente: false`. */
async function tutte<T>(
  cosa: string,
  query: (da: number, a: number) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
): Promise<Esito<T>> {
  const righe: T[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await query(da, da + PAGINA - 1);
    if (error) {
      if (erroreSchemaMancante(error)) return { presente: false, righe: [] };
      throw new Error(`${cosa}: ${error.message ?? "lettura non riuscita"}`);
    }
    const pagina = (data ?? []) as T[];
    righe.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return { presente: true, righe };
}

export type Giudice = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string | null;
  diritto_voto: boolean;
  attivo: boolean;
  temi: string[];
  riserva: boolean;
};

export type ProgettoConsegnato = {
  id: string;
  titolo: string;
  temi: string[] | null;
  adesione_id: string;
  squadra_id: string;
};

export type Assegnazione = AssegnazioneLetta & { id: string; origine: string };

export type Scheda = { progetto_id: string; commissario_id: string; chiusa: boolean };

export async function leggiGiudici(db: Db): Promise<Giudice[]> {
  const { righe } = await tutte<Record<string, unknown>>("licei_commissari", (da, a) =>
    db.from("licei_commissari").select("*").order("created_at", { ascending: true }).range(da, a),
  );
  return righe.map((r) => ({
    id: String(r.id),
    nome: String(r.nome ?? ""),
    cognome: String(r.cognome ?? ""),
    email: String(r.email ?? ""),
    ruolo: (r.ruolo as string | null) ?? null,
    diritto_voto: r.diritto_voto !== false,
    attivo: r.attivo !== false,
    temi: Array.isArray(r.temi) ? (r.temi as string[]) : [],
    riserva: r.riserva === true,
  }));
}

export async function leggiAssegnazioni(db: Db): Promise<Esito<Assegnazione>> {
  return tutte<Assegnazione>("licei_assegnazioni", (da, a) =>
    db
      .from("licei_assegnazioni")
      .select("id, progetto_id, commissario_id, origine, conflitto, rimossa_at")
      .order("created_at", { ascending: true })
      .range(da, a),
  );
}

export async function leggiProgettiConsegnati(db: Db): Promise<ProgettoConsegnato[]> {
  // `*` e non l'elenco delle colonne: prima della migrazione `temi` non c'e.
  const { righe } = await tutte<Record<string, unknown>>("licei_progetti", (da, a) =>
    db.from("licei_progetti").select("*").eq("stato", "consegnato").order("consegnato_at", { ascending: true }).range(da, a),
  );
  return righe.map((r) => ({
    id: String(r.id),
    titolo: String(r.titolo ?? ""),
    temi: Array.isArray(r.temi) ? (r.temi as string[]) : null,
    adesione_id: String(r.adesione_id),
    squadra_id: String(r.squadra_id),
  }));
}

export async function leggiSchede(db: Db): Promise<Scheda[]> {
  const { righe } = await tutte<Scheda>("licei_valutazioni", (da, a) =>
    db.from("licei_valutazioni").select("progetto_id, commissario_id, chiusa").order("id", { ascending: true }).range(da, a),
  );
  return righe;
}

/** La colonna dei temi c'e? E il segno che la migrazione 20261231100000 e applicata. */
export async function migrazioneApplicata(db: Db): Promise<boolean> {
  const { error } = await db.from("licei_assegnazioni").select("id").limit(1);
  if (!error) return true;
  if (erroreSchemaMancante(error)) return false;
  throw new Error(`licei_assegnazioni: ${error.message}`);
}

/** Tutto quello che serve per decidere, letto una volta. */
export type Quadro = {
  giudici: Giudice[];
  assegnazioni: Esito<Assegnazione>;
  progetti: ProgettoConsegnato[];
  schede: Scheda[];
};

export async function leggiQuadro(db: Db): Promise<Quadro> {
  const [giudici, assegnazioni, progetti, schede] = await Promise.all([
    leggiGiudici(db),
    leggiAssegnazioni(db),
    leggiProgettiConsegnati(db),
    leggiSchede(db),
  ]);
  return { giudici, assegnazioni, progetti, schede };
}

/** I numeri che servono a tutti: chi vota, chi e in riserva, quante schede. */
export function analizza(q: Quadro) {
  const votanti = q.giudici.filter((g) => g.attivo && g.diritto_voto);
  const validi = new Set(votanti.map((g) => g.id));
  const ordinari = votanti.filter((g) => !g.riserva);
  const riserva = votanti.filter((g) => g.riserva);
  const chiusa = new Set(q.schede.filter((s) => s.chiusa).map((s) => `${s.progetto_id}:${s.commissario_id}`));
  const chiusePerProgetto = new Map<string, number>();
  for (const s of q.schede) {
    if (s.chiusa && validi.has(s.commissario_id)) {
      chiusePerProgetto.set(s.progetto_id, (chiusePerProgetto.get(s.progetto_id) ?? 0) + 1);
    }
  }
  const consegnati = new Set(q.progetti.map((p) => p.id));
  const attive = q.assegnazioni.righe.filter((a) => assegnazioneAttiva(a) && consegnati.has(a.progetto_id));
  const perGiudice = new Map<string, { assegnati: number; chiusi: number; schede: number }>();
  for (const g of q.giudici) perGiudice.set(g.id, { assegnati: 0, chiusi: 0, schede: 0 });
  for (const a of attive) {
    const c = perGiudice.get(a.commissario_id);
    if (!c) continue;
    c.assegnati += 1;
    if (chiusa.has(`${a.progetto_id}:${a.commissario_id}`)) c.chiusi += 1;
  }
  for (const s of q.schede) {
    const c = perGiudice.get(s.commissario_id);
    if (c) c.schede += 1;
  }
  return { votanti, validi, ordinari, riserva, chiusa, chiusePerProgetto, attive, perGiudice };
}

/* ── Scritture ────────────────────────────────────────────────────────── */

type Origine = "smistamento" | "richiesta" | "sostituzione" | "ridistribuzione" | "riserva" | "staff";

async function inserisci(db: Db, nuove: NuovaAssegnazione[], origine: Origine): Promise<void> {
  if (nuove.length === 0) return;
  for (let i = 0; i < nuove.length; i += 200) {
    const { error } = await db
      .from("licei_assegnazioni")
      .upsert(
        nuove.slice(i, i + 200).map((n) => ({ ...n, origine })),
        { onConflict: "progetto_id,commissario_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(`licei_assegnazioni: ${error.message}`);
  }
}

/** Quante nuove assegnazioni per giudice. */
const contaPer = (nuove: NuovaAssegnazione[]) => {
  const m = new Map<string, number>();
  for (const n of nuove) m.set(n.commissario_id, (m.get(n.commissario_id) ?? 0) + 1);
  return m;
};

/**
 * Lo smistamento, e la sua manutenzione: a ogni progetto consegnato i
 * giudici attivi che gli mancano fino a `GIUDICI_PER_PROGETTO`, presi fra i
 * giudici ordinari (non la riserva). Rifatto, aggiunge solo quello che
 * manca: un giudice disattivato, un conflitto, un progetto consegnato dopo.
 */
export async function assicuraSmistamento(
  db: Db,
  q: Quadro,
  origine: Origine = "smistamento",
): Promise<NuovaAssegnazione[]> {
  // Chi non vota piu (disattivato, o diventato consultivo) lascia i progetti
  // che non ha chiuso: la riga si toglie, cosi se viene riattivato non si
  // ritrova con progetti che nel frattempo hanno gia un altro giudice.
  const a0 = analizza(q);
  const decadute = a0.attive.filter(
    (r) => !a0.validi.has(r.commissario_id) && !a0.chiusa.has(`${r.progetto_id}:${r.commissario_id}`),
  );
  if (decadute.length > 0) {
    const adesso = new Date().toISOString();
    const ids = new Set(decadute.map((r) => r.id));
    for (let i = 0; i < decadute.length; i += 200) {
      const { error } = await db
        .from("licei_assegnazioni")
        .update({ rimossa_at: adesso })
        .in("id", decadute.slice(i, i + 200).map((r) => r.id));
      if (error) throw new Error(`licei_assegnazioni: ${error.message}`);
    }
    q = { ...q, assegnazioni: { ...q.assegnazioni, righe: q.assegnazioni.righe.map((r) => (ids.has(r.id) ? { ...r, rimossa_at: adesso } : r)) } };
  }
  const a = analizza(q);
  const come = (n: NuovaAssegnazione[]) => n.map((x) => ({ ...x, conflitto: false, rimossa_at: null }));

  // Prima una lettura a ogni progetto, poi la seconda: se il tetto di
  // `PROGETTI_MAX_PER_GIUDICE` non basta per tutte e due, nessun progetto
  // resta senza giudice e quelli con una lettura sola si vedono nel pannello.
  const prima = pianoAssegnazioni(
    q.progetti,
    a.ordinari,
    q.assegnazioni.righe,
    bisognoSmistamento(q.progetti, q.assegnazioni.righe, a.validi, 1),
    PROGETTI_MAX_PER_GIUDICE,
  );
  let righe = [...q.assegnazioni.righe, ...come(prima)];
  // Un progetto che nessun ordinario puo prendere (tetto, conflitti): la riserva.
  const senza = bisognoSmistamento(q.progetti, righe, a.validi, 1);
  const riserva1 = senza.size > 0 && a.riserva.length > 0 ? pianoAssegnazioni(q.progetti, a.riserva, righe, senza) : [];
  righe = [...righe, ...come(riserva1)];
  const seconda = pianoAssegnazioni(
    q.progetti,
    a.ordinari,
    righe,
    bisognoSmistamento(q.progetti, righe, a.validi, GIUDICI_PER_PROGETTO),
    PROGETTI_MAX_PER_GIUDICE,
  );
  const nuove = [...prima, ...riserva1, ...seconda];
  await inserisci(db, nuove, origine);
  return nuove;
}

const contaProgetti = (nuove: NuovaAssegnazione[]) => {
  const m = new Map<string, number>();
  for (const n of nuove) m.set(n.progetto_id, (m.get(n.progetto_id) ?? 0) + 1);
  return m;
};

/** Apre le schede della Commissione, se sono chiuse. */
async function apriValutazione(db: Db): Promise<boolean> {
  const { data } = await db.from("licei_config").select("valore").eq("chiave", "stato_valutazione").maybeSingle();
  if ((data?.valore ?? "") === "aperta") return false;
  const { error } = await db
    .from("licei_config")
    .upsert(
      { chiave: "stato_valutazione", valore: "aperta", aggiornato_at: new Date().toISOString(), aggiornato_by: null },
      { onConflict: "chiave" },
    );
  if (error) throw new Error(`licei_config: ${error.message}`);
  return true;
}

/**
 * Toglie a un giudice le assegnazioni attive senza scheda chiusa, e le
 * affida alla riserva (o, senza riserva, agli altri giudici). Serve alla
 * ridistribuzione del 2 dicembre e al bottone dello staff.
 */
export async function ridistribuisci(
  db: Db,
  q: Quadro,
  daTogliere: string[],
): Promise<{ tolte: Map<string, number>; nuove: NuovaAssegnazione[] }> {
  const a = analizza(q);
  const togli = new Set(daTogliere);
  const tolte = new Map<string, number>();
  const adesso = new Date().toISOString();
  const righeTolte: string[] = [];
  for (const r of a.attive) {
    if (!togli.has(r.commissario_id) || a.chiusa.has(`${r.progetto_id}:${r.commissario_id}`)) continue;
    righeTolte.push(r.id);
    tolte.set(r.commissario_id, (tolte.get(r.commissario_id) ?? 0) + 1);
  }
  for (let i = 0; i < righeTolte.length; i += 200) {
    const { error } = await db
      .from("licei_assegnazioni")
      .update({ rimossa_at: adesso })
      .in("id", righeTolte.slice(i, i + 200));
    if (error) throw new Error(`licei_assegnazioni: ${error.message}`);
  }
  const tolteSet = new Set(righeTolte);
  const esistenti = q.assegnazioni.righe.map((r) => (tolteSet.has(r.id) ? { ...r, rimossa_at: adesso } : r));
  const validi = new Set([...a.validi].filter((id) => !togli.has(id)));
  const conRiserva = a.riserva.length > 0;
  const pool = (conRiserva ? a.riserva : a.ordinari).filter((g) => !togli.has(g.id));
  const bisogno = bisognoSmistamento(q.progetti, esistenti, validi, GIUDICI_PER_PROGETTO);
  // Agli ordinari, solo fino al tetto delle due ore; la riserva non ne ha.
  const nuove = pianoAssegnazioni(q.progetti, pool, esistenti, bisogno, conRiserva ? Infinity : PROGETTI_MAX_PER_GIUDICE);
  await inserisci(db, nuove, "ridistribuzione");
  return { tolte, nuove };
}

/**
 * La copertura dopo la scadenza dei giudici: a ogni progetto con meno di
 * `SCHEDE_MINIME` schede chiuse, i giudici della riserva che mancano. Le
 * assegnazioni della riserva ancora aperte contano gia: la riserva sta
 * lavorando.
 */
export async function copertura(db: Db, q: Quadro): Promise<{ nuove: NuovaAssegnazione[]; scoperti: number }> {
  // Scaduto il termine, le schede non chiuse dei giudici ordinari non contano
  // piu: le assegnazioni si tolgono, cosi il progetto passa alla riserva e
  // nessun progetto e letto piu di due volte.
  const a0 = analizza(q);
  const riservaSet = new Set(a0.riserva.map((g) => g.id));
  const scadute = a0.attive.filter(
    (r) => !riservaSet.has(r.commissario_id) && !a0.chiusa.has(`${r.progetto_id}:${r.commissario_id}`),
  );
  if (scadute.length > 0) {
    const adesso = new Date().toISOString();
    for (let i = 0; i < scadute.length; i += 200) {
      const { error } = await db
        .from("licei_assegnazioni")
        .update({ rimossa_at: adesso })
        .in("id", scadute.slice(i, i + 200).map((r) => r.id));
      if (error) throw new Error(`licei_assegnazioni: ${error.message}`);
    }
    const ids = new Set(scadute.map((r) => r.id));
    q = { ...q, assegnazioni: { ...q.assegnazioni, righe: q.assegnazioni.righe.map((r) => (ids.has(r.id) ? { ...r, rimossa_at: adesso } : r)) } };
  }
  const a = analizza(q);
  const riservaIds = new Set(a.riserva.map((g) => g.id));
  const aperteRiserva = new Map<string, number>();
  for (const r of a.attive) {
    if (riservaIds.has(r.commissario_id) && !a.chiusa.has(`${r.progetto_id}:${r.commissario_id}`)) {
      aperteRiserva.set(r.progetto_id, (aperteRiserva.get(r.progetto_id) ?? 0) + 1);
    }
  }
  const bisogno = new Map<string, number>();
  for (const p of q.progetti) {
    const manca = SCHEDE_MINIME - (a.chiusePerProgetto.get(p.id) ?? 0) - (aperteRiserva.get(p.id) ?? 0);
    if (manca > 0) bisogno.set(p.id, manca);
  }
  const pool = a.riserva.length > 0 ? a.riserva : a.ordinari;
  const nuove = pianoAssegnazioni(q.progetti, pool, q.assegnazioni.righe, bisogno);
  await inserisci(db, nuove, "riserva");
  const coperte = contaProgetti(nuove);
  const scoperti = [...bisogno].filter(([id, n]) => (coperte.get(id) ?? 0) < n).length;
  return { nuove, scoperti };
}

/* ── Azioni del giudice ───────────────────────────────────────────────── */

/**
 * "Conosco questa squadra": l'assegnazione passa in conflitto e il
 * progetto riceve un altro giudice. Torna l'id del sostituto, o null se
 * non ce n'e (lo staff lo vede nel pannello: progetto con un giudice solo).
 */
export async function segnaConflitto(
  db: Db,
  commissarioId: string,
  progettoId: string,
): Promise<{ ok: true; sostituto: Giudice | null } | { ok: false; errore: string }> {
  const q = await leggiQuadro(db);
  const a = analizza(q);
  const riga = a.attive.find((r) => r.commissario_id === commissarioId && r.progetto_id === progettoId);
  if (!riga) return { ok: false, errore: "Questo progetto non è fra i suoi." };
  if (a.chiusa.has(`${progettoId}:${commissarioId}`)) {
    return { ok: false, errore: "Ha già chiuso la scheda di questo progetto: per toglierla, ci scriva." };
  }
  const { error } = await db.from("licei_assegnazioni").update({ conflitto: true }).eq("id", riga.id);
  if (error) throw new Error(`licei_assegnazioni: ${error.message}`);
  const dopo = { ...q, assegnazioni: { ...q.assegnazioni, righe: q.assegnazioni.righe.map((r) => (r.id === riga.id ? { ...r, conflitto: true } : r)) } };
  const solo = { ...dopo, progetti: dopo.progetti.filter((p) => p.id === progettoId) };
  const nuove = await assicuraSmistamento(db, solo, "sostituzione");
  const sostituto = nuove[0] ? q.giudici.find((g) => g.id === nuove[0].commissario_id) ?? null : null;
  return { ok: true, sostituto };
}

/** "Ho tempo, me ne dia altri": `PROGETTI_EXTRA` progetti mai avuti, scelti dalla regola. */
export async function assegnaAltri(db: Db, giudice: Pick<Giudice, "id" | "temi" | "ruolo">): Promise<number> {
  const q = await leggiQuadro(db);
  const a = analizza(q);
  const ids = progettiExtra(
    q.progetti,
    { id: giudice.id, temi: giudice.temi, ruolo: giudice.ruolo },
    q.assegnazioni.righe,
    a.chiusePerProgetto,
    PROGETTI_EXTRA,
    // Mai una terza lettura: solo progetti che ne hanno ancora una sola.
    GIUDICI_PER_PROGETTO,
  );
  await inserisci(db, ids.map((progetto_id) => ({ progetto_id, commissario_id: giudice.id })), "richiesta");
  return ids.length;
}

/* ── Destinatari ──────────────────────────────────────────────────────── */

type Adesione = {
  id: string;
  istituto: string;
  referente: Destinatario;
};

type Studente = {
  id: string;
  nome: string;
  email: string;
  adesione_id: string;
  squadra_id: string | null;
};

/** Le scuole che partecipano, gli studenti confermati, le squadre e i loro progetti. */
async function leggiScuole(db: Db) {
  const adesioniR = await tutte<Record<string, string | null>>("licei_adesioni", (da, a) =>
    db
      .from("licei_adesioni")
      .select("id, istituto_denominazione, referente_nome, referente_cognome, referente_email, stato")
      .in("stato", [...STATI_ADESIONE_CHE_ACCETTANO])
      .order("id", { ascending: true })
      .range(da, a),
  );
  const adesioni = new Map<string, Adesione>(
    adesioniR.righe.map((r) => [
      String(r.id),
      {
        id: String(r.id),
        istituto: r.istituto_denominazione ?? "",
        referente: {
          rif: `adesione ${r.id}`,
          nome: `${r.referente_nome ?? ""} ${r.referente_cognome ?? ""}`.trim(),
          email: r.referente_email ?? "",
        },
      },
    ]),
  );

  const docentiR = await tutte<Record<string, string | null>>("licei_docenti", (da, a) =>
    db
      .from("licei_docenti")
      .select("id, adesione_id, nome, cognome, email")
      .in("stato", ["invitato", "attivo"])
      .order("id", { ascending: true })
      .range(da, a),
  );
  const docentiPer = new Map<string, Destinatario[]>();
  for (const d of docentiR.righe) {
    const id = String(d.adesione_id);
    if (!adesioni.has(id)) continue;
    docentiPer.set(id, [
      ...(docentiPer.get(id) ?? []),
      { rif: `docente ${d.id}`, nome: `${d.nome ?? ""} ${d.cognome ?? ""}`.trim(), email: d.email ?? "" },
    ]);
  }

  const studentiR = await tutte<Studente>("licei_iscrizioni", (da, a) =>
    db
      .from("licei_iscrizioni")
      .select("id, nome, email, adesione_id, squadra_id")
      .eq("stato", "confermata")
      .order("id", { ascending: true })
      .range(da, a),
  );
  const studenti = studentiR.righe.filter((s) => adesioni.has(s.adesione_id));

  const squadreR = await tutte<{ id: string; nome: string; adesione_id: string }>("licei_squadre", (da, a) =>
    db.from("licei_squadre").select("id, nome, adesione_id").order("id", { ascending: true }).range(da, a),
  );
  const squadre = new Map(squadreR.righe.map((s) => [s.id, s]));

  const progettiR = await tutte<{ squadra_id: string; stato: string; titolo: string }>("licei_progetti", (da, a) =>
    db.from("licei_progetti").select("squadra_id, stato, titolo").order("id", { ascending: true }).range(da, a),
  );
  const progettoDi = new Map(progettiR.righe.map((p) => [p.squadra_id, p]));

  /** I docenti di una scuola: prima il referente, poi i docenti del progetto. */
  const docentiDi = (adesioneId: string): Destinatario[] => {
    const a = adesioni.get(adesioneId);
    return a ? [a.referente, ...(docentiPer.get(adesioneId) ?? [])] : [];
  };

  return { adesioni, studenti, squadre, progettoDi, docentiDi };
}

/* ── Invii ────────────────────────────────────────────────────────────── */

type EsitoInvio = { ok: boolean; testo: string };

/**
 * Un invio del calendario, una volta sola. Senza destinatari non c'e
 * niente da fare, ed e un successo. Un invio di cui non parte nessuna email
 * torna da rifare: il cron di domani ci riprova.
 */
async function invia(
  db: Db,
  resend: Invio,
  chiave: string,
  cosa: string,
  righe: Destinatario[],
  subject: string,
  html: (d: Destinatario) => string,
): Promise<EsitoInvio> {
  const { destinatari, scartate } = destinatariUnici(righe, chiave);
  if (destinatari.length === 0 && scartate === 0) return { ok: true, testo: `${cosa}: nessun destinatario` };
  const r = await inviaAvvisoUnaVolta(db, resend, {
    chiave,
    chiaveEsito: `${chiave}_esito`,
    autore: null,
    etichetta: chiave.replace(/_/g, "-"),
    destinatari,
    scartate,
    subject,
    html,
  });
  if (r.stato === "inviato") return { ok: true, testo: `${cosa}: ${r.esito.inviate} inviate${r.esito.fallite ? `, ${r.esito.fallite} non partite` : ""}` };
  if (r.stato === "gia_inviato") return { ok: true, testo: `${cosa}: già inviate` };
  if (r.stato === "nessuna_partita") return { ok: false, testo: `${cosa}: nessuna email partita, si riprova` };
  return { ok: false, testo: `${cosa}: prenotazione non riuscita, si riprova` };
}

const STAFF: Destinatario[] = [{ rif: "staff", nome: "", email: RISPOSTE_AVVISI }];

const nomeGiudice = (g: Giudice) => `${g.nome} ${g.cognome}`.trim();
const destGiudice = (g: Giudice): Destinatario => ({ rif: `commissario ${g.id}`, nome: nomeGiudice(g), email: g.email });

/* ── I passi ──────────────────────────────────────────────────────────── */

type RisultatoPasso = { fatto: boolean; dettagli: string[] };

async function passoAggiornamento(db: Db, resend: Invio): Promise<RisultatoPasso> {
  if (!(await migrazioneApplicata(db))) {
    return { fatto: false, dettagli: [`L'aggiornamento parla dei temi: parte dopo la migrazione ${MIGRAZIONE}.`] };
  }
  // Il prossimo talk, se non e ancora passato: un'email sola invece di due.
  const talk = E.talkDaAnnunciare();
  const s = await invia(db, resend, "auto_aggiornamento_studenti", "Studenti", await righeStudentiAvviso(db),
    E.aggiornamentoStudentiSubject(talk), (d) => E.aggiornamentoStudentiHtml({ nome: d.nome, talk }));
  const d = await invia(db, resend, "auto_aggiornamento_scuole", "Docenti", await righeDocentiAvviso(db),
    E.aggiornamentoScuoleSubject(talk), (x) => E.aggiornamentoScuoleHtml({ nome: x.nome, talk }));
  return { fatto: s.ok && d.ok, dettagli: [s.testo, d.testo] };
}

async function passoConsegna(db: Db, resend: Invio, ultimo: boolean): Promise<RisultatoPasso> {
  const { adesioni, studenti, squadre, progettoDi, docentiDi } = await leggiScuole(db);
  const consegnata = (squadraId: string | null) => !!squadraId && progettoDi.get(squadraId)?.stato === "consegnato";

  const daAvvisare = studenti.filter((s) => (ultimo ? !!s.squadra_id : true) && !consegnata(s.squadra_id));
  const dati = new Map<string, E.PromemoriaStudente>();
  const righe: Destinatario[] = daAvvisare.map((s) => {
    const rif = `iscrizione ${s.id}`;
    dati.set(rif, {
      nome: s.nome,
      squadra: s.squadra_id ? squadre.get(s.squadra_id)?.nome ?? "" : null,
      titolo: s.squadra_id ? progettoDi.get(s.squadra_id)?.titolo ?? "" : "",
      ultimo,
    });
    return { rif, nome: s.nome, email: s.email };
  });
  const id = ultimo ? "consegna_ultimo_giorno" : "consegna_tre_giorni";
  const st = await invia(db, resend, `auto_${id}_studenti`, "Studenti", righe,
    E.promemoriaConsegnaSubject(ultimo), (d) => E.promemoriaConsegnaStudenteHtml(dati.get(d.rif)!));
  if (ultimo) return { fatto: st.ok, dettagli: [st.testo] };

  // Ai docenti, il quadro della propria scuola: solo dove c'e ancora qualcosa da fare.
  const perDocente = new Map<string, E.PromemoriaDocente>();
  const righeDocenti: Destinatario[] = [];
  for (const a of adesioni.values()) {
    const suoi = studenti.filter((s) => s.adesione_id === a.id);
    const squadreSue = [...squadre.values()].filter((s) => s.adesione_id === a.id && suoi.some((x) => x.squadra_id === s.id));
    const inBozza = squadreSue
      .filter((s) => !consegnata(s.id))
      .map((s) => ({ squadra: s.nome, componenti: suoi.filter((x) => x.squadra_id === s.id).length }))
      .sort((x, y) => x.squadra.localeCompare(y.squadra, "it"));
    const senzaSquadra = suoi.filter((s) => !s.squadra_id).length;
    if (inBozza.length === 0 && senzaSquadra === 0) continue;
    const consegnati = squadreSue.filter((s) => consegnata(s.id)).length;
    for (const d of docentiDi(a.id)) {
      const rif = `${d.rif} (${a.id})`;
      perDocente.set(rif, { nome: d.nome, istituto: a.istituto, inBozza, senzaSquadra, consegnati });
      righeDocenti.push({ ...d, rif });
    }
  }
  const dc = await invia(db, resend, `auto_${id}_docenti`, "Docenti", righeDocenti,
    E.promemoriaConsegnaDocenteSubject(), (d) => E.promemoriaConsegnaDocenteHtml(perDocente.get(d.rif)!));
  return { fatto: st.ok && dc.ok, dettagli: [st.testo, dc.testo] };
}

async function passoSmistamento(db: Db, resend: Invio): Promise<RisultatoPasso> {
  if (!(await migrazioneApplicata(db))) {
    return { fatto: false, dettagli: [`Smistamento non fatto: manca la migrazione ${MIGRAZIONE}.`] };
  }
  let q = await leggiQuadro(db);
  const a0 = analizza(q);
  if (a0.ordinari.length === 0) {
    return { fatto: false, dettagli: ["Smistamento non fatto: nessun giudice attivo con diritto di voto fuori dalla riserva."] };
  }
  if (q.progetti.length === 0) {
    return { fatto: false, dettagli: ["Smistamento non fatto: nessun progetto consegnato."] };
  }

  const nuove = await assicuraSmistamento(db, q, "smistamento");
  const aperta = await apriValutazione(db);
  q = await leggiQuadro(db);
  const a = analizza(q);
  const dettagli = [
    `${q.progetti.length} progetti, ${a.ordinari.length} giudici: ${nuove.length} assegnazioni nuove.`,
    aperta ? "Schede della Commissione aperte." : "Schede della Commissione già aperte.",
  ];
  const conGiudici = new Map<string, number>();
  for (const r of a.attive) conGiudici.set(r.progetto_id, (conGiudici.get(r.progetto_id) ?? 0) + 1);
  const scoperti = q.progetti.filter((p) => (conGiudici.get(p.id) ?? 0) < GIUDICI_PER_PROGETTO).length;
  if (scoperti) dettagli.push(`${scoperti} progetti con meno di ${GIUDICI_PER_PROGETTO} giudici: aggiungere giudici.`);

  // Ai giudici ordinari, e alla riserva.
  const conteggio = (g: Giudice) => a.perGiudice.get(g.id)?.assegnati ?? 0;
  const giudici = a.ordinari.filter((g) => conteggio(g) > 0);
  const gi = await invia(db, resend, "auto_smistamento_giudici", "Giudici", giudici.map(destGiudice),
    E.giudiceSmistamentoSubject(false),
    (d) => {
      const g = giudici.find((x) => `commissario ${x.id}` === d.rif)!;
      return E.giudiceSmistamentoHtml({ nome: nomeGiudice(g), assegnati: conteggio(g), riserva: false });
    });
  const ri = await invia(db, resend, "auto_smistamento_riserva", "Riserva", a.riserva.map(destGiudice),
    E.giudiceSmistamentoSubject(true),
    (d) => {
      const g = a.riserva.find((x) => `commissario ${x.id}` === d.rif)!;
      return E.giudiceSmistamentoHtml({ nome: nomeGiudice(g), assegnati: conteggio(g), riserva: true });
    });

  // Alle scuole e agli studenti.
  const { adesioni, studenti, squadre, progettoDi, docentiDi } = await leggiScuole(db);
  const perScuola = new Map<string, E.ScuolaConsegne>();
  const righeScuole: Destinatario[] = [];
  for (const ad of adesioni.values()) {
    const squadreSue = [...squadre.values()].filter((s) => s.adesione_id === ad.id && studenti.some((x) => x.squadra_id === s.id));
    if (squadreSue.length === 0 && !studenti.some((s) => s.adesione_id === ad.id)) continue;
    const consegnati = squadreSue
      .filter((s) => progettoDi.get(s.id)?.stato === "consegnato")
      .map((s) => ({ squadra: s.nome, titolo: progettoDi.get(s.id)?.titolo ?? "" }))
      .sort((x, y) => x.squadra.localeCompare(y.squadra, "it"));
    const nonConsegnati = squadreSue.filter((s) => progettoDi.get(s.id)?.stato !== "consegnato").length;
    for (const d of docentiDi(ad.id)) {
      const rif = `${d.rif} (${ad.id})`;
      perScuola.set(rif, { nome: d.nome, istituto: ad.istituto, consegnati, nonConsegnati });
      righeScuole.push({ ...d, rif });
    }
  }
  const sc = await invia(db, resend, "auto_smistamento_scuole", "Scuole", righeScuole,
    E.scuolaConsegneSubject(), (d) => E.scuolaConsegneHtml(perScuola.get(d.rif)!));

  const perStudente = new Map<string, E.StudenteDopoConsegna>();
  const righeStudenti: Destinatario[] = [];
  for (const s of studenti) {
    if (!s.squadra_id || progettoDi.get(s.squadra_id)?.stato !== "consegnato") continue;
    const rif = `iscrizione ${s.id}`;
    perStudente.set(rif, { nome: s.nome, squadra: squadre.get(s.squadra_id)?.nome ?? "", titolo: progettoDi.get(s.squadra_id)?.titolo ?? "" });
    righeStudenti.push({ rif, nome: s.nome, email: s.email });
  }
  const st = await invia(db, resend, "auto_smistamento_studenti", "Studenti", righeStudenti,
    E.studenteDopoConsegnaSubject(), (d) => E.studenteDopoConsegnaHtml(perStudente.get(d.rif)!));

  const righeStaff = [
    ...dettagli,
    ...a.ordinari.map((g) => `${nomeGiudice(g)}: ${conteggio(g)} progetti`),
    gi.testo, ri.testo, sc.testo, st.testo,
  ];
  const sf = await invia(db, resend, "auto_smistamento_staff", "Staff", STAFF,
    E.staffRiepilogoSubject("Smistamento fatto"), () => E.staffRiepilogoHtml("Smistamento fatto", righeStaff));

  return { fatto: gi.ok && ri.ok && sc.ok && st.ok && sf.ok, dettagli: [...dettagli, gi.testo, ri.testo, sc.testo, st.testo] };
}

async function passoGiudiciMeta(db: Db, resend: Invio): Promise<RisultatoPasso> {
  const q = await leggiQuadro(db);
  if (!q.assegnazioni.presente || q.assegnazioni.righe.length === 0) {
    return { fatto: false, dettagli: ["Nessuna assegnazione: lo smistamento non è ancora stato fatto."] };
  }
  const a = analizza(q);
  const indietro = a.votanti.filter((g) => {
    const c = a.perGiudice.get(g.id)!;
    return c.assegnati > 0 && c.chiusi < c.assegnati;
  });
  const gi = await invia(db, resend, "auto_giudici_meta", "Giudici", indietro.map(destGiudice),
    E.giudiceMetaSubject(),
    (d) => {
      const g = indietro.find((x) => `commissario ${x.id}` === d.rif)!;
      const c = a.perGiudice.get(g.id)!;
      return E.giudiceMetaHtml({ nome: nomeGiudice(g), assegnati: c.assegnati, chiusi: c.chiusi, nonIniziato: c.schede === 0 });
    });
  const righe = a.votanti
    .filter((g) => (a.perGiudice.get(g.id)?.assegnati ?? 0) > 0)
    .map((g) => {
      const c = a.perGiudice.get(g.id)!;
      return `${nomeGiudice(g)}: ${c.chiusi}/${c.assegnati} chiuse${c.schede === 0 ? " (non ha iniziato)" : ""}`;
    });
  const sf = await invia(db, resend, "auto_giudici_meta_staff", "Staff", STAFF,
    E.staffRiepilogoSubject("A metà strada"), () => E.staffRiepilogoHtml("A metà strada", [...righe, gi.testo]));
  return { fatto: gi.ok && sf.ok, dettagli: [gi.testo, `${indietro.length} giudici con schede aperte`] };
}

/** Avvisa chi ha ricevuto progetti nuovi. `chiave` unica per l'occasione. */
async function avvisaNuovi(
  db: Db,
  resend: Invio,
  q: Quadro,
  nuove: NuovaAssegnazione[],
  chiave: string,
  entro: string,
): Promise<EsitoInvio> {
  const per = contaPer(nuove);
  const giudici = q.giudici.filter((g) => per.has(g.id));
  return invia(db, resend, chiave, "Giudici con progetti nuovi", giudici.map(destGiudice),
    E.giudiceNuoviSubject(),
    (d) => {
      const g = giudici.find((x) => `commissario ${x.id}` === d.rif)!;
      return E.giudiceNuoviHtml({ nome: nomeGiudice(g), n: per.get(g.id) ?? 0, entro });
    });
}

async function passoRidistribuzione(db: Db, resend: Invio): Promise<RisultatoPasso> {
  const q = await leggiQuadro(db);
  if (!q.assegnazioni.presente || q.assegnazioni.righe.length === 0) {
    return { fatto: false, dettagli: ["Nessuna assegnazione: lo smistamento non è ancora stato fatto."] };
  }
  const a = analizza(q);
  const fermi = a.votanti.filter((g) => {
    const c = a.perGiudice.get(g.id)!;
    return c.assegnati > 0 && c.schede === 0;
  });
  if (fermi.length === 0) {
    return { fatto: true, dettagli: ["Tutti i giudici hanno iniziato: nessuna ridistribuzione."] };
  }
  const { tolte, nuove } = await ridistribuisci(db, q, fermi.map((g) => g.id));
  const to = await invia(db, resend, "auto_ridistribuzione_tolti", "Giudici fermi", fermi.map(destGiudice),
    E.giudiceTolteSubject(),
    (d) => {
      const g = fermi.find((x) => `commissario ${x.id}` === d.rif)!;
      return E.giudiceTolteHtml({ nome: nomeGiudice(g), n: tolte.get(g.id) ?? 0 });
    });
  const nu = await avvisaNuovi(db, resend, q, nuove, "auto_ridistribuzione_nuovi", E.ENTRO_GIUDICI);
  const righe = [
    ...fermi.map((g) => `${nomeGiudice(g)}: ${tolte.get(g.id) ?? 0} progetti tolti`),
    ...[...contaPer(nuove)].map(([id, n]) => {
      const g = q.giudici.find((x) => x.id === id);
      return `${g ? nomeGiudice(g) : id}: ${n} progetti ricevuti`;
    }),
    to.testo,
    nu.testo,
  ];
  const sf = await invia(db, resend, "auto_ridistribuzione_staff", "Staff", STAFF,
    E.staffRiepilogoSubject("Ridistribuzione"), () => E.staffRiepilogoHtml("Ridistribuzione", righe));
  // Nei dettagli solo numeri: finiscono in `licei_config`, che e leggibile da
  // chiunque. I nomi restano nell'email allo staff.
  const totale = [...tolte.values()].reduce((x, y) => x + y, 0);
  return {
    fatto: to.ok && nu.ok && sf.ok,
    dettagli: [`${fermi.length} giudici senza schede: ${totale} progetti affidati ad altri.`, to.testo, nu.testo],
  };
}

async function passoGiudiciUltimoGiorno(db: Db, resend: Invio): Promise<RisultatoPasso> {
  const q = await leggiQuadro(db);
  const a = analizza(q);
  const aperti = a.votanti.filter((g) => {
    const c = a.perGiudice.get(g.id)!;
    return c.assegnati > c.chiusi;
  });
  const gi = await invia(db, resend, "auto_giudici_ultimo_giorno", "Giudici", aperti.map(destGiudice),
    E.giudiceUltimoGiornoSubject(),
    (d) => {
      const g = aperti.find((x) => `commissario ${x.id}` === d.rif)!;
      const c = a.perGiudice.get(g.id)!;
      return E.giudiceUltimoGiornoHtml({ nome: nomeGiudice(g), mancano: c.assegnati - c.chiusi, assegnati: c.assegnati });
    });
  return { fatto: gi.ok, dettagli: [gi.testo] };
}

async function passoCopertura(db: Db, resend: Invio): Promise<RisultatoPasso> {
  const q = await leggiQuadro(db);
  if (!q.assegnazioni.presente) {
    return { fatto: false, dettagli: [`Copertura non fatta: manca la migrazione ${MIGRAZIONE}.`] };
  }
  const { nuove, scoperti } = await copertura(db, q);
  const nu = await avvisaNuovi(db, resend, q, nuove, "auto_copertura_nuovi", E.ENTRO_RISERVA);
  const a = analizza(q);
  const sotto = q.progetti.filter((p) => (a.chiusePerProgetto.get(p.id) ?? 0) < SCHEDE_MINIME).length;

  // I progetti a cavallo del 10° posto, da rivedere insieme prima dell'annuncio.
  const confine: string[] = [];
  const { data: classifica } = await db.rpc("licei_classifica");
  for (const r of ((classifica ?? []) as { titolo: string; squadra_nome: string; media_totale: number | null; schede: number }[]).slice(7, 13)) {
    confine.push(`${r.titolo} (${r.squadra_nome}): media ${r.media_totale ?? "n.d."}, ${r.schede} schede`);
  }
  const righe = [
    `${sotto} progetti con meno di ${SCHEDE_MINIME} schede chiuse alla scadenza; ${nuove.length} affidati alla riserva.`,
    ...(scoperti ? [`${scoperti} progetti restano senza giudici disponibili: aggiungere persone alla riserva.`] : []),
    nu.testo,
    ...(confine.length ? ["Dall'8° al 13° posto, da rivedere insieme prima dell'annuncio:", ...confine] : []),
  ];
  const sf = await invia(db, resend, "auto_copertura_staff", "Staff", STAFF,
    E.staffRiepilogoSubject("Scadenza dei giudici: copertura"), () => E.staffRiepilogoHtml("Scadenza dei giudici: copertura", righe));
  // Solo numeri nei dettagli, come sopra: titoli e squadre restano nell'email allo staff.
  return { fatto: nu.ok && sf.ok, dettagli: righe.slice(0, scoperti ? 3 : 2) };
}

const ESEGUI: Record<IdPasso, (db: Db, resend: Invio) => Promise<RisultatoPasso>> = {
  aggiornamento: passoAggiornamento,
  consegna_tre_giorni: (db, r) => passoConsegna(db, r, false),
  consegna_ultimo_giorno: (db, r) => passoConsegna(db, r, true),
  smistamento: passoSmistamento,
  giudici_meta: passoGiudiciMeta,
  ridistribuzione: passoRidistribuzione,
  giudici_ultimo_giorno: passoGiudiciUltimoGiorno,
  copertura: passoCopertura,
};

/* ── Il giro del cron ─────────────────────────────────────────────────── */

export type EsitoPasso = {
  id: IdPasso | "manutenzione";
  stato: "eseguito" | "da_rifare" | "gia_fatto" | "futuro" | "scaduto";
  dettagli: string[];
};

const LOCK = "auto_in_corso";
const LOCK_MS = 15 * 60 * 1000;

/** Un giro alla volta: cron e pannello insieme non smistano due volte. */
async function prendiLock(db: Db, adesso: string): Promise<boolean> {
  const riga = { chiave: LOCK, valore: adesso, aggiornato_at: adesso, aggiornato_by: null };
  const { error } = await db.from("licei_config").insert(riga);
  if (!error) return true;
  if (error.code !== "23505") throw new Error(`licei_config: ${error.message}`);
  const { data } = await db.from("licei_config").select("valore").eq("chiave", LOCK).maybeSingle();
  const prima = data?.valore ?? "";
  if (prima && Date.now() - Date.parse(prima) < LOCK_MS) return false;
  const { data: preso } = await db.from("licei_config").update(riga).eq("chiave", LOCK).eq("valore", prima).select("chiave");
  return (preso ?? []).length > 0;
}

async function lasciaLock(db: Db, adesso: string) {
  await db.from("licei_config").delete().eq("chiave", LOCK).eq("valore", adesso);
}

/**
 * `licei_config` e leggibile da chiunque: i dettagli che ci finiscono sono
 * solo numeri ed esiti, mai nomi, titoli o email. I passi li scrivono cosi.
 */
async function segnaFatto(db: Db, id: IdPasso, dettagli: string[]) {
  const ora = new Date().toISOString();
  const { error } = await db.from("licei_config").upsert(
    [
      { chiave: chiavePasso(id), valore: ora, aggiornato_at: ora, aggiornato_by: null },
      { chiave: `${chiavePasso(id)}_esito`, valore: JSON.stringify(dettagli), aggiornato_at: ora, aggiornato_by: null },
    ],
    { onConflict: "chiave" },
  );
  if (error) throw new Error(`licei_config: ${error.message}`);
}

async function segnaTentativo(db: Db, id: IdPasso, dettagli: string[]) {
  const ora = new Date().toISOString();
  await db.from("licei_config").upsert(
    { chiave: `${chiavePasso(id)}_esito`, valore: JSON.stringify(dettagli), aggiornato_at: ora, aggiornato_by: null },
    { onConflict: "chiave" },
  );
}

/**
 * Esegue i passi dovuti e non ancora fatti, in ordine. Dopo lo smistamento
 * e fino alla scadenza dei giudici, ogni giro fa anche la manutenzione:
 * ridà un giudice ai progetti che l'hanno perso (giudice disattivato,
 * conflitto senza sostituto) e avvisa chi riceve progetti nuovi.
 */
export async function eseguiCalendario(
  db: Db,
  resend: Invio,
  adesso: Date = new Date(),
): Promise<{ occupato: boolean; esiti: EsitoPasso[] }> {
  const t = adesso.getTime();
  const marca = adesso.toISOString();
  if (!(await prendiLock(db, marca))) return { occupato: true, esiti: [] };

  const esiti: EsitoPasso[] = [];
  try {
    const { data: config } = await db.from("licei_config").select("chiave, valore").like("chiave", "auto_%");
    const fatto = new Set(((config ?? []) as { chiave: string; valore: string | null }[]).filter((r) => (r.valore ?? "").trim()).map((r) => r.chiave));
    const smistamentoGiaFatto = fatto.has(chiavePasso("smistamento"));

    for (const p of PASSI_AUTOMATICI) {
      if (fatto.has(chiavePasso(p.id))) {
        esiti.push({ id: p.id, stato: "gia_fatto", dettagli: [] });
        continue;
      }
      if (t < Date.parse(p.da)) {
        esiti.push({ id: p.id, stato: "futuro", dettagli: [] });
        continue;
      }
      if (t > Date.parse(p.fino)) {
        esiti.push({ id: p.id, stato: "scaduto", dettagli: ["Non eseguito nella sua finestra."] });
        continue;
      }
      try {
        const r = await ESEGUI[p.id](db, resend);
        if (r.fatto) await segnaFatto(db, p.id, r.dettagli);
        else await segnaTentativo(db, p.id, r.dettagli);
        esiti.push({ id: p.id, stato: r.fatto ? "eseguito" : "da_rifare", dettagli: r.dettagli });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Licei calendario: passo ${p.id} non riuscito:`, msg);
        await segnaTentativo(db, p.id, [`Errore: ${msg}`]);
        esiti.push({ id: p.id, stato: "da_rifare", dettagli: [`Errore: ${msg}`] });
      }
    }

    if (smistamentoGiaFatto && t <= Date.parse(SCADENZA_GIUDICI)) {
      try {
        const q = await leggiQuadro(db);
        const nuove = await assicuraSmistamento(db, q, "smistamento");
        const giorno = adesso.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
        const nu = nuove.length
          ? await avvisaNuovi(db, resend, q, nuove, `auto_manutenzione_${giorno}`, E.ENTRO_GIUDICI)
          : { ok: true, testo: "Nessun progetto da riassegnare." };
        esiti.push({ id: "manutenzione", stato: "eseguito", dettagli: [`${nuove.length} assegnazioni nuove.`, nu.testo] });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Licei calendario: manutenzione non riuscita:", msg);
        esiti.push({ id: "manutenzione", stato: "da_rifare", dettagli: [`Errore: ${msg}`] });
      }
    }
  } finally {
    await lasciaLock(db, marca);
  }
  return { occupato: false, esiti };
}

/* ── Lo stato per il pannello ─────────────────────────────────────────── */

export type StatoPassoPannello = {
  id: IdPasso;
  quando: string;
  titolo: string;
  descrizione: string;
  stato: "fatto" | "in_programma" | "in_attesa" | "scaduto";
  fatto_at: string | null;
  dettagli: string[];
};

/** Il calendario come lo legge il pannello, dalle righe di `licei_config`. */
export function statoCalendario(
  config: { chiave: string; valore: string | null }[],
  adesso: Date = new Date(),
): StatoPassoPannello[] {
  const valore = (k: string) => (config.find((c) => c.chiave === k)?.valore ?? "").trim();
  const t = adesso.getTime();
  return PASSI_AUTOMATICI.map((p) => {
    const fattoAt = valore(chiavePasso(p.id)) || null;
    let dettagli: string[] = [];
    try {
      const grezzo = valore(`${chiavePasso(p.id)}_esito`);
      dettagli = grezzo ? (JSON.parse(grezzo) as string[]) : [];
    } catch {
      dettagli = [];
    }
    const stato: StatoPassoPannello["stato"] = fattoAt
      ? "fatto"
      : t < Date.parse(p.da)
        ? "in_programma"
        : t > Date.parse(p.fino)
          ? "scaduto"
          : "in_attesa";
    return { id: p.id, quando: p.quando, titolo: p.titolo, descrizione: p.descrizione, stato, fatto_at: fattoAt, dettagli };
  });
}
