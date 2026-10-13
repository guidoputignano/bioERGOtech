/**
 * Docenti del progetto: gli altri docenti dell'istituto che il referente
 * principale indica, in `licei_docenti`. Qui stanno le letture e l'account,
 * condivisi dalla rotta dei docenti, dalla rotta del referente e dal
 * pannello dello staff, perche tutte e tre dicano le stesse cose nello
 * stesso modo.
 *
 * Lato server soltanto. La console importa da qui i soli tipi.
 *
 * Due regole valgono per ogni funzione:
 * - ogni lettura filtra per l'istituto del chiamante: il client ha la
 *   service role e RLS non lo ferma;
 * - nessuno `user_id` esce verso i docenti. Serve al server per legare
 *   l'accettazione delle istruzioni, e li si ferma.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DOCENTI_PROGETTO_MAX,
  DOCUMENTO_ISTRUZIONI_DOCENTE,
  REFERENTE_PATH,
  RIMANDA_INVITO_MINUTI,
  SITE_URL,
  STATI_ADESIONE_CHE_ACCETTANO,
  type StatoDocenteProgetto,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  VERSIONE_ISTRUZIONI_DOCENTE,
  erroreSchemaMancante,
  type DocenteContext,
} from "@/lib/eventi/licei-server";
import { normalizzaClasse } from "@/lib/eventi/licei-iscrizioni";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

/* ── Le forme che escono dalle rotte ──────────────────────────────────── */

/** Un docente del progetto come lo vedono il referente principale e lo staff. */
export type DocenteProgettoVista = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  classi: string[];
  stato: StatoDocenteProgetto;
  invitato_at: string;
  /**
   * Quando ha accettato la versione in vigore delle istruzioni. Nullo per
   * chi e ancora invitato, e per un attivo che deve accettare una versione
   * nuova.
   */
  istruzioni_accettate_at: string | null;
  revocato_at: string | null;
  /** Da quando si puo rimandare l'invito. Nullo: si puo gia. */
  rimanda_dal: string | null;
};

/** Un collega come lo vede un docente del progetto: il nome, e basta. */
export type CollegaVista = { nome: string; cognome: string };

/**
 * La risposta sui docenti del progetto, uguale nella rotta dei docenti e
 * dentro quella del referente. `disponibile: false` prima che la migrazione
 * 20261215000000 sia applicata: la console mostra "Funzione in attivazione".
 */
export type DocentiRisposta =
  | { disponibile: false }
  | {
      disponibile: true;
      ruolo: "referente";
      max: number;
      /** L'adesione e in uno stato che permette di indicare docenti? */
      puo_invitare: boolean;
      docenti: DocenteProgettoVista[];
    }
  | {
      disponibile: true;
      ruolo: "docente";
      /**
       * Chi sta guardando: la sua riga (per cambiare le proprie classi),
       * nome e classi che segue.
       */
      io: { id: string | null; nome: string; cognome: string; classi: string[] };
      /** Gli altri docenti del progetto non revocati, referente escluso. */
      colleghi: CollegaVista[];
    };

/* ── Letture ─────────────────────────────────────────────────────────── */

export const COLONNE_DOCENTE =
  "id, adesione_id, user_id, nome, cognome, email, classi, stato, invitato_at, revocato_at, invito_inviato_at";

/** Una riga di `licei_docenti` come la legge il server. Non esce cosi. */
export type RigaDocente = {
  id: string;
  adesione_id: string;
  user_id: string | null;
  nome: string;
  cognome: string;
  email: string;
  classi: string[] | null;
  stato: StatoDocenteProgetto;
  invitato_at: string;
  revocato_at: string | null;
  invito_inviato_at: string | null;
};

/**
 * I docenti del progetto di un istituto, revocati compresi, nell'ordine in
 * cui sono stati indicati. Torna null se la tabella non c'e ancora; un
 * errore vero si solleva, perche un elenco vuoto per sbaglio direbbe al
 * referente che nessuno vede i dati dei suoi studenti.
 */
export async function docentiIstituto(client: Db, adesioneId: string): Promise<RigaDocente[] | null> {
  const { data, error } = await client
    .from("licei_docenti")
    .select(COLONNE_DOCENTE)
    .eq("adesione_id", adesioneId)
    .order("invitato_at", { ascending: true });
  if (erroreSchemaMancante(error, "tabella")) return null;
  if (error) throw new Error(`licei_docenti: ${error.message}`);
  return (data ?? []) as unknown as RigaDocente[];
}

/**
 * Chi, fra i docenti di un istituto, ha accettato la versione in vigore
 * delle istruzioni, e quando. Per `user_id`. Se la tabella manca la mappa e
 * vuota: e solo un'informazione a schermo, non un cancello.
 */
export async function accettazioniIstituto(client: Db, adesioneId: string): Promise<Map<string, string>> {
  const { data, error } = await client
    .from("licei_accettazioni")
    .select("user_id, accettato_at")
    .eq("adesione_id", adesioneId)
    .eq("documento", DOCUMENTO_ISTRUZIONI_DOCENTE)
    .eq("versione", VERSIONE_ISTRUZIONI_DOCENTE);
  if (erroreSchemaMancante(error, "tabella")) return new Map();
  if (error) throw new Error(`licei_accettazioni: ${error.message}`);
  return new Map(
    ((data ?? []) as { user_id: string; accettato_at: string }[]).map((a) => [a.user_id, a.accettato_at]),
  );
}

/** Da quando l'invito si puo rimandare, o null se si puo gia. */
export function rimandaDal(invitoInviatoAt: string | null, adesso = Date.now()): string | null {
  if (!invitoInviatoAt) return null;
  const dal = new Date(invitoInviatoAt).getTime() + RIMANDA_INVITO_MINUTI * 60_000;
  return Number.isFinite(dal) && dal > adesso ? new Date(dal).toISOString() : null;
}

/** La riga, senza `user_id`, nella forma del referente e dello staff. */
export function vistaDocente(r: RigaDocente, accettazioni: Map<string, string>): DocenteProgettoVista {
  return {
    id: r.id,
    nome: r.nome,
    cognome: r.cognome,
    email: r.email,
    classi: r.classi ?? [],
    stato: r.stato,
    invitato_at: r.invitato_at,
    // Solo per chi e attivo: un docente revocato e invitato di nuovo ha
    // ancora la riga della vecchia accettazione, ma deve accettare di nuovo.
    istruzioni_accettate_at: r.stato === "attivo" && r.user_id ? (accettazioni.get(r.user_id) ?? null) : null,
    revocato_at: r.revocato_at,
    rimanda_dal: r.stato === "revocato" ? null : rimandaDal(r.invito_inviato_at),
  };
}

/**
 * La risposta sui docenti del progetto per chi sta guardando. Al referente
 * principale l'elenco completo, con email e stato, perche e lui che risponde
 * di chi ha indicato. A un docente del progetto solo i nomi dei colleghi:
 * gli serve sapere con chi segue il percorso, non le loro email.
 */
export async function rispostaDocenti(client: Db, ctx: DocenteContext): Promise<DocentiRisposta> {
  const righe = await docentiIstituto(client, ctx.adesione.id);
  if (righe === null) return { disponibile: false };

  if (ctx.ruolo === "referente") {
    const accettazioni = await accettazioniIstituto(client, ctx.adesione.id);
    return {
      disponibile: true,
      ruolo: "referente",
      max: DOCENTI_PROGETTO_MAX,
      puo_invitare: STATI_ADESIONE_CHE_ACCETTANO.has(ctx.adesione.stato),
      docenti: righe.map((r) => vistaDocente(r, accettazioni)),
    };
  }

  const mia = righe.find((r) => r.id === ctx.docenteId);
  return {
    disponibile: true,
    ruolo: "docente",
    io: {
      id: ctx.docenteId,
      nome: mia?.nome ?? "",
      cognome: mia?.cognome ?? "",
      classi: mia?.classi ?? ctx.classi,
    },
    colleghi: righe
      .filter((r) => r.id !== ctx.docenteId && r.stato !== "revocato")
      .map((r) => ({ nome: r.nome, cognome: r.cognome })),
  };
}

/* ── Classi seguite ──────────────────────────────────────────────────── */

export const CLASSI_DOCENTE_MAX = 15;
const CLASSE_LUNGHEZZA_MAX = 20;

/**
 * Le classi che un docente segue, da quello che arriva dal browser: un
 * elenco o un testo libero ("4A, 5B"). Si tengono come sono state scritte,
 * ripulite degli spazi; i doppioni si riconoscono con `normalizzaClasse`,
 * cosi "4^A" e "4A" contano una volta. Torna null se il dato non e valido.
 */
export function leggiClassi(v: unknown): string[] | null {
  if (v === undefined || v === null) return [];
  const grezze =
    typeof v === "string"
      ? v.split(/[,;\n]/)
      : Array.isArray(v) && v.every((x) => typeof x === "string")
        ? (v as string[])
        : null;
  if (grezze === null) return null;

  const viste = new Set<string>();
  const classi: string[] = [];
  for (const g of grezze) {
    const c = g.trim().replace(/\s+/g, " ");
    if (!c) continue;
    if (c.length > CLASSE_LUNGHEZZA_MAX) return null;
    const chiave = normalizzaClasse(c);
    if (!chiave || viste.has(chiave)) continue;
    viste.add(chiave);
    classi.push(c);
  }
  return classi.length > CLASSI_DOCENTE_MAX ? null : classi;
}

/* ── Account e link di accesso ───────────────────────────────────────── */

/** Dove porta il link di accesso: la pagina di login, che poi apre l'area. */
export const LINK_ACCESSO_DOCENTE = `${SITE_URL}/auth/login?returnTo=${encodeURIComponent(REFERENTE_PATH)}`;

export type AccessoDocente =
  | {
      ok: true;
      userId: string;
      /** Vero se l'account e stato creato adesso. */
      nuovo: boolean;
      /** Link per impostare la password, se l'account non ne ha mai usata una. */
      setPasswordUrl?: string;
    }
  | { ok: false; errore: string };

/**
 * Trova o crea l'account del docente, con lo schema gia usato per referenti
 * e commissari: profilo per email, altrimenti `createUser` con email
 * confermata. Il link per impostare la password si genera qui e non si
 * conserva: un link di recupero salvato vale una password in chiaro.
 *
 * Il link parte anche per un account che esisteva ma non risulta mai
 * entrato: un semplice link di login, a chi una password non l'ha mai
 * impostata, non servirebbe a niente. A chi e gia entrato basta il login.
 *
 * `userId`, se indicato, e l'account gia legato alla riga (il reinvio).
 */
export async function preparaAccessoDocente(
  client: Db,
  persona: { email: string; nome: string; cognome: string; userId?: string | null },
): Promise<AccessoDocente> {
  const { email, nome, cognome } = persona;
  let userId: string | null = null;
  let nuovo = false;
  let maiEntrato = false;

  if (persona.userId) {
    const { data, error } = await client.auth.admin.getUserById(persona.userId);
    if (!error && data?.user) {
      userId = data.user.id;
      maiEntrato = !data.user.last_sign_in_at;
    }
  }

  if (!userId) {
    const { data: profilo, error: erroreProfilo } = await client
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (erroreProfilo) {
      console.error("Licei docente: lettura profilo fallita:", erroreProfilo.message);
      return { ok: false, errore: "Non è stato possibile preparare l'accesso del docente. Riprova fra poco." };
    }
    if (profilo?.id) {
      userId = profilo.id as string;
      const { data } = await client.auth.admin.getUserById(userId);
      maiEntrato = !!data?.user && !data.user.last_sign_in_at;
    }
  }

  if (!userId) {
    const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: `${nome} ${cognome}` },
    });
    if (erroreCreazione || !creato.user) {
      console.error("Licei docente createUser error:", erroreCreazione);
      return {
        ok: false,
        errore:
          "Non è stato possibile creare l'accesso del docente. Riprova fra poco, e se il problema resta scrivi a info@bioergotech.org.",
      };
    }
    userId = creato.user.id;
    nuovo = true;
  }

  let setPasswordUrl: string | undefined;
  if (nuovo || maiEntrato) {
    const { data: link, error: erroreLink } = await client.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });
    if (erroreLink) console.error("Licei docente generateLink error:", erroreLink);
    setPasswordUrl = link?.properties?.action_link;
  }

  return { ok: true, userId, nuovo, setPasswordUrl };
}

/** Per i filtri `ilike`: `%` e `_` dentro un'email sono caratteri, non jolly. */
export function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/* ── Per lo staff ────────────────────────────────────────────────────── */

/**
 * I docenti del progetto di tutti gli istituti, per adesione, nella stessa
 * forma che vede il referente. Per il pannello dello staff, che li mostra
 * sotto il referente di ogni scuola e li puo revocare. Null se la tabella
 * non c'e ancora.
 *
 * A pagine, come le altre letture a tappeto del modulo: cinque per istituto
 * non sono molti, ma PostgREST tronca in silenzio oltre il suo tetto.
 */
export async function docentiPerIstituto(client: Db): Promise<Record<string, DocenteProgettoVista[]> | null> {
  const PAGINA = 1000;
  const righe: RigaDocente[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("licei_docenti")
      .select(COLONNE_DOCENTE)
      .order("invitato_at", { ascending: true })
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (erroreSchemaMancante(error, "tabella")) return null;
    if (error) throw new Error(`licei_docenti: ${error.message}`);
    righe.push(...((data ?? []) as unknown as RigaDocente[]));
    if (!data || data.length < PAGINA) break;
  }

  const accettazioni = new Map<string, string>();
  const utenti = [...new Set(righe.map((r) => r.user_id).filter((id): id is string => !!id))];
  for (let i = 0; i < utenti.length; i += 50) {
    const { data, error } = await client
      .from("licei_accettazioni")
      .select("user_id, accettato_at")
      .eq("documento", DOCUMENTO_ISTRUZIONI_DOCENTE)
      .eq("versione", VERSIONE_ISTRUZIONI_DOCENTE)
      .in("user_id", utenti.slice(i, i + 50));
    if (erroreSchemaMancante(error, "tabella")) break;
    if (error) throw new Error(`licei_accettazioni: ${error.message}`);
    for (const a of (data ?? []) as { user_id: string; accettato_at: string }[]) {
      accettazioni.set(a.user_id, a.accettato_at);
    }
  }

  const perIstituto: Record<string, DocenteProgettoVista[]> = {};
  for (const r of righe) (perIstituto[r.adesione_id] ??= []).push(vistaDocente(r, accettazioni));
  return perIstituto;
}
