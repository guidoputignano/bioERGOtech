/**
 * Helper lato server della rotta del bando universitario: client service role
 * e cancello sulla finestra di candidatura. Stessa impostazione di
 * `bando-server.ts`, senza la parte di storage perché qui non si carica nulla.
 */

import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  CONFERMA_AUTOMATICA_DEFAULT,
  SCADENZA_CANDIDATURE_UNIVERSITARI,
  STATO_BOARD_DEFAULT,
  STATO_CONSEGNE_DEFAULT,
  STATO_SQUADRE_DEFAULT,
  STATO_VALUTAZIONE_DEFAULT,
  boardApertaUniversita,
  consegneAperteUniversita,
  squadreAperteUniversita,
  statoCandidatureUniversita,
  valutazioneApertaUniversita,
  type ConfermaAutomatica,
  type StatoBoard,
  type StatoConsegne,
  type StatoSquadre,
  type StatoValutazione,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

/** Client con service role. Bypassa la RLS: usarlo solo dentro le rotte API. */
export function universitaAdminClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Il server decide se la finestra è aperta, non il client: nascondere il
 * modulo in pagina non basta a impedire una POST.
 */
export function verificaFinestraUniversita(): { ok: true } | { ok: false; errore: string } {
  const stato = statoCandidatureUniversita();
  if (stato === "aperte") return { ok: true };
  if (stato === "non_aperte") {
    return {
      ok: false,
      errore:
        "Le candidature non sono ancora aperte. Le modalità saranno comunicate sui canali ufficiali.",
    };
  }
  const quando = SCADENZA_CANDIDATURE_UNIVERSITARI
    ? ` Il termine era il ${SCADENZA_CANDIDATURE_UNIVERSITARI.label}.`
    : "";
  return { ok: false, errore: `Le candidature sono chiuse.${quando}` };
}

/* ═══════════════════════════════════════════════════════════════════════
   Fase 2. Configurazione delle fasi e guardie del percorso
   ═══════════════════════════════════════════════════════════════════════ */

export type UniversitaConfig = {
  conferma_automatica: ConfermaAutomatica;
  stato_squadre: StatoSquadre;
  stato_board: StatoBoard;
  stato_consegne: StatoConsegne;
  scadenza_consegna_label: string;
  stato_valutazione: StatoValutazione;
  avviso: string;
};

const CONFIG_DEFAULT: UniversitaConfig = {
  conferma_automatica: CONFERMA_AUTOMATICA_DEFAULT,
  stato_squadre: STATO_SQUADRE_DEFAULT,
  stato_board: STATO_BOARD_DEFAULT,
  stato_consegne: STATO_CONSEGNE_DEFAULT,
  scadenza_consegna_label: "",
  stato_valutazione: STATO_VALUTAZIONE_DEFAULT,
  avviso: "",
};

const APERTO_CHIUSO = new Set(["chiuse", "aperte"]);
const APERTA_CHIUSA = new Set(["chiusa", "aperta"]);
const SI_NO = new Set(["si", "no"]);

/**
 * Legge `universita_config`. La tabella e pubblicamente leggibile, quindi
 * basta il client dell'utente.
 *
 * Se la migrazione non e ancora stata applicata, o qualcosa va storto, si
 * torna ai default, che sono i piu prudenti possibili: a database
 * irraggiungibile non si apre nessuna fase. Il contrario, aprire per
 * sicurezza, farebbe comparire moduli di consegna in un momento in cui
 * nessuno sa se le consegne sono davvero aperte.
 */
export async function leggiConfigUniversita(): Promise<UniversitaConfig> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("universita_config").select("chiave, valore");
    if (error || !data) return CONFIG_DEFAULT;

    const mappa = new Map(data.map((r) => [r.chiave as string, (r.valore as string) ?? ""]));

    const conferma = mappa.get("conferma_automatica");
    const squadre = mappa.get("stato_squadre");
    const board = mappa.get("stato_board");
    const consegne = mappa.get("stato_consegne");
    const valutazione = mappa.get("stato_valutazione");

    return {
      conferma_automatica:
        conferma && SI_NO.has(conferma)
          ? (conferma as ConfermaAutomatica)
          : CONFIG_DEFAULT.conferma_automatica,
      stato_squadre:
        squadre && APERTO_CHIUSO.has(squadre)
          ? (squadre as StatoSquadre)
          : CONFIG_DEFAULT.stato_squadre,
      stato_board:
        board && APERTA_CHIUSA.has(board) ? (board as StatoBoard) : CONFIG_DEFAULT.stato_board,
      stato_consegne:
        consegne && APERTO_CHIUSO.has(consegne)
          ? (consegne as StatoConsegne)
          : CONFIG_DEFAULT.stato_consegne,
      scadenza_consegna_label: mappa.get("scadenza_consegna_label") ?? "",
      stato_valutazione:
        valutazione && APERTA_CHIUSA.has(valutazione)
          ? (valutazione as StatoValutazione)
          : CONFIG_DEFAULT.stato_valutazione,
      avviso: mappa.get("avviso") ?? "",
    };
  } catch {
    return CONFIG_DEFAULT;
  }
}

/** Chi sta chiamando, e se e staff. Lo staff attraversa ogni fase chiusa. */
export async function utenteCorrenteUniversita(): Promise<{
  id: string | null;
  email: string | null;
  staff: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { id: null, email: null, staff: false };

    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? null,
      staff: profile?.partnership_level === "admin",
    };
  } catch {
    return { id: null, email: null, staff: false };
  }
}

/* ── Cancelli delle fasi ──────────────────────────────────────────────── */

/**
 * Lo staff passa comunque, in tutti e quattro, cosi il percorso si puo
 * provare da capo a fondo a fasi chiuse. E' la stessa scelta del modulo
 * licei, e la ragione e la stessa: un flusso che si puo collaudare solo
 * aprendolo al pubblico non si collauda.
 */
export async function verificaSquadreAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigUniversita();
  if (!squadreAperteUniversita(config.stato_squadre)) {
    return {
      ok: false,
      errore:
        "La formazione delle squadre non è ancora aperta. Te lo diciamo dentro il corso e per email quando lo sarà.",
    };
  }
  return { ok: true };
}

export async function verificaBoardAperta(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigUniversita();
  if (!boardApertaUniversita(config.stato_board)) {
    return {
      ok: false,
      errore: "La bacheca dei partecipanti non è aperta in questo momento.",
    };
  }
  return { ok: true };
}

export async function verificaConsegneAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigUniversita();
  if (!consegneAperteUniversita(config.stato_consegne)) {
    return {
      ok: false,
      errore: config.scadenza_consegna_label
        ? `Le consegne sono chiuse. Il termine era il ${config.scadenza_consegna_label}.`
        : "Le consegne non sono ancora aperte.",
    };
  }
  return { ok: true };
}

export async function verificaValutazioneAperta(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigUniversita();
  if (!valutazioneApertaUniversita(config.stato_valutazione)) {
    return {
      ok: false,
      errore: "Le schede di valutazione non sono aperte in questo momento.",
    };
  }
  return { ok: true };
}

/* ── Guardia del candidato ────────────────────────────────────────────── */

export type CandidatoContext = {
  candidatura: {
    id: string;
    codice: string;
    nome: string;
    cognome: string;
    email: string;
    universita: string;
    corso_studi: string;
    livello: string;
    area: string;
    area_altro: string | null;
    stato: string;
    squadra_id: string | null;
    squadra_ruolo: string | null;
    cerca_squadra: boolean;
    consenso_board: boolean;
    board_nota: string | null;
  };
  userId: string;
};

const CAMPI_CANDIDATURA =
  "id, codice, nome, cognome, email, universita, corso_studi, livello, area, area_altro, stato, squadra_id, squadra_ruolo, cerca_squadra, consenso_board, board_nota";

/**
 * Autorizza il candidato sulla propria candidatura.
 *
 * Passa solo chi risulta `confermata`. Nei licei quel filtro esiste perche
 * il codice dell'istituto gira per tutta la scuola e senza conferma del
 * referente chiunque lo conosca potrebbe agire a nome di quella scuola. Qui
 * la ragione e diversa e altrettanto concreta: il modulo di candidatura e
 * pubblico e senza rate limiting, quindi `confermata` e il punto in cui
 * qualcuno ha guardato quella riga. Finche la chiave `conferma_automatica`
 * resta a `si` quel punto e automatico, ma resta un punto solo, e spegnere
 * l'interruttore basta a richiuderlo senza toccare il codice.
 *
 * Torna un client con service role: l'ambito lo impone questa funzione, e
 * ogni query che la usa filtra per l'id della candidatura o della sua
 * squadra.
 */
export async function requireCandidato(): Promise<
  | {
      error: null;
      status: 200;
      client: NonNullable<ReturnType<typeof universitaAdminClient>>;
      ctx: CandidatoContext;
    }
  | { error: string; status: number }
> {
  const client = universitaAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  const { data: candidatura } = await client
    .from("universita_candidature")
    .select(CAMPI_CANDIDATURA)
    .eq("user_id", user.id)
    .maybeSingle<CandidatoContext["candidatura"]>();

  if (!candidatura) {
    return {
      error: "Nessuna candidatura al percorso risulta associata a questo account.",
      status: 403,
    };
  }

  if (candidatura.stato === "esclusa") {
    return {
      error:
        "Questa candidatura non risulta più attiva nel percorso. Se pensi ci sia un errore, scrivi a info@bioergotech.org.",
      status: 403,
    };
  }

  if (candidatura.stato !== "confermata") {
    return {
      error:
        "La tua candidatura è stata ricevuta ma non è ancora stata confermata. Appena lo sarà, questa area si apre.",
      status: 403,
    };
  }

  return { error: null, status: 200, client, ctx: { candidatura, userId: user.id } };
}

/* ── Guardia del commissario ──────────────────────────────────────────── */

export type CommissarioUniversitaContext = {
  commissario: {
    id: string;
    nome: string;
    cognome: string;
    ruolo: string | null;
    diritto_voto: boolean;
  };
  userId: string;
};

/**
 * Autorizza un membro della Commissione, e non lo staff.
 *
 * Sono due elenchi di persone diversi e restano diversi: un admin che non e
 * in Commissione non vota, un commissario che non e admin non tocca la
 * configurazione del percorso.
 */
export async function requireCommissarioUniversita(): Promise<
  | {
      error: null;
      status: 200;
      client: NonNullable<ReturnType<typeof universitaAdminClient>>;
      ctx: CommissarioUniversitaContext;
    }
  | { error: string; status: number }
> {
  const client = universitaAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  const { data: commissario } = await client
    .from("universita_commissari")
    .select("id, nome, cognome, ruolo, diritto_voto, attivo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!commissario || !commissario.attivo) {
    return { error: "Questa area è riservata ai membri della Commissione.", status: 403 };
  }

  return {
    error: null,
    status: 200,
    client,
    ctx: {
      commissario: {
        id: commissario.id as string,
        nome: commissario.nome as string,
        cognome: commissario.cognome as string,
        ruolo: (commissario.ruolo as string | null) ?? null,
        diritto_voto: commissario.diritto_voto as boolean,
      },
      userId: user.id,
    },
  };
}

/**
 * Chi legge questa pagina e un candidato confermato del percorso
 * universitario?
 *
 * Serve alle lezioni del corso, che in due punti attaccano un riquadro del
 * percorso. La domanda si fa lato server e non nel browser per la stessa
 * ragione del gemello dei licei: il corso lo seguono anche persone che con
 * il bando non c'entrano, e una chiamata che a loro risponde 403 farebbe
 * comparire e sparire un riquadro d'errore su un percorso che non le
 * riguarda.
 *
 * Torna false, e non solleva, se qualcosa non e a posto: un problema di
 * questo modulo non deve impedire a nessuno di leggere una lezione.
 */
export async function candidatoUniversitaConfermato(): Promise<boolean> {
  try {
    const guard = await requireCandidato();
    return guard.error === null;
  } catch {
    return false;
  }
}
