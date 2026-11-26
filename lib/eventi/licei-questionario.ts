/**
 * Il questionario di fine percorso, lato server: i link personali, la
 * lettura di un invito, il salvataggio delle risposte e i numeri per il
 * pannello staff.
 *
 * Il link. Ogni invito ha il suo, firmato con una chiave derivata dalla
 * chiave di servizio (come `firmaMentor` in licei-mentor-giudici.ts): nel
 * database non c'e nessun token da rubare, e il promemoria ricostruisce lo
 * stesso link dall'id dell'invito. Senza la chiave non parte niente.
 *
 * L'anonimato. L'invito dice a chi e stato mandato e se ha risposto, senza
 * la data della risposta. La risposta dice solo il ruolo (studente o
 * docente), la versione delle domande e le risposte: niente nome, account,
 * data o riferimento all'invito. Le due righe si scrivono insieme, in una
 * funzione del database (`licei_questionario_rispondi`), una volta sola per
 * invito; la funzione riscrive ogni volta tutte le risposte in ordine
 * casuale, perche neanche chi legge il database possa accoppiarle. Nei log, mai il token, l'email o il contenuto delle risposte.
 *
 * Solo server: usa il client con service role.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  DOMANDE,
  QUESTIONARIO_PATH,
  VERSIONE_QUESTIONARIO,
  etichettaRisposta,
  isRuoloQuestionario,
  type Domanda,
  type Risposte,
  type RuoloQuestionario,
} from "@/app/eventi/vivere-piu-a-lungo/licei/questionario/domande";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

export const TABELLA_INVITI = "licei_questionario_inviti";
export const TABELLA_RISPOSTE = "licei_questionario_risposte";
export const MIGRAZIONE_QUESTIONARIO = "20261231500000_licei_questionario";

const PAGINA = 1000;

/* ── Il link personale ────────────────────────────────────────────────── */

const chiave = (): Buffer | null => {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) return null;
  // Una chiave solo per questo uso: una firma del questionario non vale per
  // nient'altro, e la chiave di servizio non compare mai.
  return createHash("sha256").update(`licei-questionario:v1:${base}`).digest();
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{22})$/;

/** I primi 16 byte dell'HMAC: abbastanza per una firma, corti nel link. */
const firma = (k: Buffer, id: string) => createHmac("sha256", k).update(id.toLowerCase()).digest().subarray(0, 16);

/** "<id in 16 byte>.<firma>", in base64url: 45 caratteri. */
export function firmaInvito(id: string): string | null {
  const k = chiave();
  if (!k || !UUID.test(id)) return null;
  const byte = Buffer.from(id.replace(/-/g, ""), "hex");
  return `${byte.toString("base64url")}.${firma(k, id).toString("base64url")}`;
}

/** L'id dell'invito, se il token e integro e firmato da noi; altrimenti null. */
export function leggiFirmaInvito(token: string | null | undefined): string | null {
  const k = chiave();
  if (!k || typeof token !== "string" || token.length > 100) return null;
  const m = TOKEN.exec(token.trim());
  if (!m) return null;
  const byte = Buffer.from(m[1], "base64url");
  if (byte.length !== 16) return null;
  const hex = byte.toString("hex");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const data = Buffer.from(m[2], "base64url");
  const attesa = firma(k, id);
  if (data.length !== attesa.length || !timingSafeEqual(data, attesa)) return null;
  return id;
}

export function linkQuestionario(id: string): string | null {
  const t = firmaInvito(id);
  return t ? `${SITE_URL}${QUESTIONARIO_PATH}?t=${t}` : null;
}

/* ── Un invito e la sua risposta ──────────────────────────────────────── */

export type Invito = { id: string; ruolo: RuoloQuestionario; risposto: boolean };

/** `presente: false` prima della migrazione; `invito: null` se non esiste. */
export async function leggiInvito(
  db: Db,
  id: string,
): Promise<{ presente: false } | { presente: true; invito: Invito | null }> {
  const { data, error } = await db.from(TABELLA_INVITI).select("id, ruolo, risposto").eq("id", id).maybeSingle();
  if (error) {
    if (erroreSchemaMancante(error)) return { presente: false };
    throw new Error(`${TABELLA_INVITI}: ${error.message}`);
  }
  if (!data || !isRuoloQuestionario(data.ruolo)) return { presente: true, invito: null };
  return { presente: true, invito: { id: String(data.id), ruolo: data.ruolo, risposto: data.risposto === true } };
}

export type EsitoRisposta = "ok" | "gia_risposto" | "non_trovato" | "assente";

/**
 * Segna l'invito come risposto e salva le risposte, insieme e una volta
 * sola. `assente`: la funzione non c'e ancora (migrazione non applicata).
 */
export async function registraRisposta(db: Db, invitoId: string, risposte: Risposte): Promise<EsitoRisposta> {
  const { data, error } = await db.rpc("licei_questionario_rispondi", {
    p_invito: invitoId,
    p_risposte: risposte,
    p_versione: VERSIONE_QUESTIONARIO,
  });
  if (error) {
    if (erroreSchemaMancante(error) || error.code === "PGRST202" || error.code === "42883") return "assente";
    throw new Error(`licei_questionario_rispondi: ${error.message}`);
  }
  return data === "ok" || data === "gia_risposto" || data === "non_trovato" ? data : "non_trovato";
}

/* ── I numeri per il pannello ─────────────────────────────────────────── */

type RigaRisposta = { id: string; ruolo: string; versione: number; risposte: Record<string, unknown> | null };

/** Tutte le risposte, a pagine (PostgREST tronca oltre il suo tetto senza dirlo). */
export async function tutteLeRisposte(db: Db): Promise<RigaRisposta[] | null> {
  const righe: RigaRisposta[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await db
      .from(TABELLA_RISPOSTE)
      .select("id, ruolo, versione, risposte")
      // L'id e casuale: l'ordine non dice niente su chi ha risposto prima.
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) {
      if (erroreSchemaMancante(error)) return null;
      throw new Error(`${TABELLA_RISPOSTE}: ${error.message}`);
    }
    const pagina = (data ?? []) as RigaRisposta[];
    righe.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return righe;
}

async function conta(db: Db, ruolo: RuoloQuestionario, soloRisposti: boolean): Promise<number | null> {
  let q = db.from(TABELLA_INVITI).select("id", { count: "exact", head: true }).eq("ruolo", ruolo);
  if (soloRisposti) q = q.eq("risposto", true);
  const { count, error } = await q;
  if (error) {
    if (erroreSchemaMancante(error)) return null;
    throw new Error(`${TABELLA_INVITI}: ${error.message}`);
  }
  return count ?? 0;
}

export type Conteggio = { valore: string; etichetta: string; n: number };

export type RiepilogoDomanda = {
  id: string;
  testo: string;
  tipo: Domanda["tipo"];
  /** Quanti hanno risposto a questa domanda. */
  n: number;
  /** Scale e scelte: una voce per valore possibile, anche a zero. */
  conteggi?: Conteggio[];
  /** Scale: la media, con un decimale. */
  media?: number | null;
  /** Scala da 0 a 10: promotori (9 e 10) meno detrattori (da 0 a 6), in punti percentuali. */
  nps?: number | null;
  estremi?: readonly [string, string];
  /** Risposte aperte, nell'ordine (casuale) in cui stanno nel database. */
  testi?: string[];
};

export type RiepilogoRuolo = {
  invitati: number;
  hanno_risposto: number;
  risposte: number;
  domande: RiepilogoDomanda[];
};

export type RiepilogoQuestionari =
  | { disponibile: false }
  | { disponibile: true; studente: RiepilogoRuolo; docente: RiepilogoRuolo };

const unDecimale = (n: number) => Math.round(n * 10) / 10;

export function riepilogaDomanda(d: Domanda, valori: unknown[]): RiepilogoDomanda {
  const base: RiepilogoDomanda = { id: d.id, testo: d.testo, tipo: d.tipo, n: 0 };
  if (d.tipo === "testo") {
    const testi = valori.filter((v): v is string => typeof v === "string" && v.trim() !== "");
    return { ...base, n: testi.length, testi };
  }
  if (d.tipo === "scelta") {
    const scelti = valori.filter((v): v is string => typeof v === "string" && d.opzioni.some((o) => o.valore === v));
    return {
      ...base,
      n: scelti.length,
      conteggi: d.opzioni.map((o) => ({ valore: o.valore, etichetta: o.etichetta, n: scelti.filter((v) => v === o.valore).length })),
    };
  }
  const numeri = valori.filter((v): v is number => typeof v === "number" && Number.isInteger(v) && v >= d.min && v <= d.max);
  const conteggi: Conteggio[] = [];
  for (let v = d.min; v <= d.max; v++) {
    conteggi.push({ valore: String(v), etichetta: String(v), n: numeri.filter((x) => x === v).length });
  }
  const media = numeri.length ? unDecimale(numeri.reduce((a, b) => a + b, 0) / numeri.length) : null;
  const nps =
    d.min === 0 && d.max === 10 && numeri.length
      ? Math.round(((numeri.filter((x) => x >= 9).length - numeri.filter((x) => x <= 6).length) / numeri.length) * 100)
      : undefined;
  return { ...base, n: numeri.length, conteggi, media, nps, estremi: d.estremi };
}

/** Le risposte di un ruolo nella versione corrente delle domande. */
const diRuolo = (righe: RigaRisposta[], ruolo: RuoloQuestionario) =>
  righe.filter((r) => r.ruolo === ruolo && r.versione === VERSIONE_QUESTIONARIO && r.risposte && typeof r.risposte === "object");

export async function riepilogoQuestionari(db: Db): Promise<RiepilogoQuestionari> {
  const righe = await tutteLeRisposte(db);
  if (righe === null) return { disponibile: false };

  const ruolo = async (r: RuoloQuestionario): Promise<RiepilogoRuolo | null> => {
    const [invitati, risposti] = await Promise.all([conta(db, r, false), conta(db, r, true)]);
    if (invitati === null || risposti === null) return null;
    const mie = diRuolo(righe, r);
    return {
      invitati,
      hanno_risposto: risposti,
      risposte: mie.length,
      domande: DOMANDE[r].map((d) => riepilogaDomanda(d, mie.map((x) => (x.risposte as Record<string, unknown>)[d.id]))),
    };
  };

  const [studente, docente] = await Promise.all([ruolo("studente"), ruolo("docente")]);
  if (!studente || !docente) return { disponibile: false };
  return { disponibile: true, studente, docente };
}

/** Le righe del CSV di un ruolo: intestazione con il testo delle domande, poi una riga per questionario. */
export async function righeCsvQuestionari(db: Db, r: RuoloQuestionario): Promise<string[][] | null> {
  const righe = await tutteLeRisposte(db);
  if (righe === null) return null;
  const domande = DOMANDE[r];
  const out: string[][] = [domande.map((d) => d.testo)];
  for (const x of diRuolo(righe, r)) {
    const risposte = x.risposte as Record<string, unknown>;
    out.push(
      domande.map((d) => {
        const v = risposte[d.id];
        if (typeof v !== "string" && typeof v !== "number") return "";
        return etichettaRisposta(d, v);
      }),
    );
  }
  return out;
}
