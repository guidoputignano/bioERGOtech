/**
 * Helper lato server del modulo licei: lettura della configurazione e
 * cancello sulla raccolta delle adesioni.
 *
 * La configurazione vive a database e non in `content.ts` perche il bando
 * non fissa termini: l'art. 10 li rimanda al referente del consorzio dei
 * licei. Lo staff li inserisce dal pannello, senza un rilascio del sito.
 */

import { createClient } from "@/lib/supabase/server";
import { bandoAdminClient } from "@/lib/eventi/bando-server";
import {
  STATO_ADESIONI_DEFAULT,
  STATO_CONSEGNE_DEFAULT,
  STATO_ISCRIZIONI_DEFAULT,
  STATO_SQUADRE_DEFAULT,
  STATO_VALUTAZIONE_DEFAULT,
  adesioniAperte,
  consegneAperte,
  iscrizioniAperte,
  squadreAperte,
  valutazioneAperta,
  type StatoAdesioni,
  type StatoConsegne,
  type StatoIscrizioni,
  type StatoSquadre,
  type StatoValutazione,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

export type LiceiConfig = {
  stato_adesioni: StatoAdesioni;
  scadenza_adesioni_label: string;
  avviso: string;
  stato_iscrizioni: StatoIscrizioni;
  scadenza_iscrizioni_label: string;
  stato_squadre: StatoSquadre;
  stato_consegne: StatoConsegne;
  scadenza_consegna_label: string;
  stato_valutazione: StatoValutazione;
};

const DEFAULT: LiceiConfig = {
  stato_adesioni: STATO_ADESIONI_DEFAULT,
  scadenza_adesioni_label: "",
  avviso: "",
  stato_iscrizioni: STATO_ISCRIZIONI_DEFAULT,
  scadenza_iscrizioni_label: "",
  stato_squadre: STATO_SQUADRE_DEFAULT,
  stato_consegne: STATO_CONSEGNE_DEFAULT,
  scadenza_consegna_label: "",
  stato_valutazione: STATO_VALUTAZIONE_DEFAULT,
};

const STATI_VALIDI = new Set<StatoAdesioni>([
  "termini_non_comunicati",
  "aperte",
  "chiuse",
]);

const STATI_ISCRIZIONI_VALIDI = new Set<StatoIscrizioni>(["chiuse", "aperte"]);
const STATI_APERTO_CHIUSO = new Set(["chiuse", "aperte"]);
const STATI_VALUTAZIONE_VALIDI = new Set(["chiusa", "aperta"]);

/**
 * Legge `licei_config`. La tabella e pubblicamente leggibile, quindi basta
 * il client dell'utente. Se la migrazione non e ancora stata applicata, o
 * qualcosa va storto, si torna ai valori di default: la pagina resta in
 * piedi e il modulo non promette scadenze inventate.
 */
export async function leggiConfigLicei(): Promise<LiceiConfig> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("licei_config").select("chiave, valore");
    if (error || !data) return DEFAULT;

    const mappa = new Map(data.map((r) => [r.chiave as string, (r.valore as string) ?? ""]));
    const stato = mappa.get("stato_adesioni") as StatoAdesioni | undefined;
    const statoIscr = mappa.get("stato_iscrizioni") as StatoIscrizioni | undefined;
    const statoSquadre = mappa.get("stato_squadre") as StatoSquadre | undefined;
    const statoConsegne = mappa.get("stato_consegne") as StatoConsegne | undefined;
    const statoValut = mappa.get("stato_valutazione") as StatoValutazione | undefined;

    return {
      stato_adesioni: stato && STATI_VALIDI.has(stato) ? stato : DEFAULT.stato_adesioni,
      scadenza_adesioni_label: mappa.get("scadenza_adesioni_label") ?? "",
      avviso: mappa.get("avviso") ?? "",
      stato_iscrizioni:
        statoIscr && STATI_ISCRIZIONI_VALIDI.has(statoIscr)
          ? statoIscr
          : DEFAULT.stato_iscrizioni,
      scadenza_iscrizioni_label: mappa.get("scadenza_iscrizioni_label") ?? "",
      stato_squadre:
        statoSquadre && STATI_APERTO_CHIUSO.has(statoSquadre)
          ? statoSquadre
          : DEFAULT.stato_squadre,
      stato_consegne:
        statoConsegne && STATI_APERTO_CHIUSO.has(statoConsegne)
          ? statoConsegne
          : DEFAULT.stato_consegne,
      scadenza_consegna_label: mappa.get("scadenza_consegna_label") ?? "",
      stato_valutazione:
        statoValut && STATI_VALUTAZIONE_VALIDI.has(statoValut)
          ? statoValut
          : DEFAULT.stato_valutazione,
    };
  } catch {
    return DEFAULT;
  }
}

/** Client con service role, condiviso con il modulo bando. */
export const liceiAdminClient = bandoAdminClient;

/**
 * Cancello sulla raccolta delle adesioni. Lo staff passa comunque, cosi il
 * flusso si puo provare end to end anche a raccolta chiusa.
 */
export async function verificaAdesioniAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!adesioniAperte(config.stato_adesioni)) {
    return {
      ok: false,
      errore: "La raccolta delle adesioni degli istituti è chiusa. Scrivi a info@bioergotech.org.",
    };
  }
  return { ok: true };
}

/**
 * Cancello sulle iscrizioni degli studenti. Come sopra, lo staff passa
 * comunque per poter provare il flusso a iscrizioni chiuse.
 */
export async function verificaIscrizioniAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!iscrizioniAperte(config.stato_iscrizioni)) {
    return {
      ok: false,
      errore:
        "Le iscrizioni al percorso non sono ancora aperte. Il tuo docente referente saprà dirti quando lo saranno.",
    };
  }
  return { ok: true };
}

/* ── Guardia del docente referente ────────────────────────────────────── */

export type ReferenteContext = {
  /** L'adesione di cui il chiamante e il referente. */
  adesione: {
    id: string;
    codice: string;
    stato: string;
    istituto_denominazione: string;
    istituto_comune: string;
    istituto_provincia: string;
    referente_nome: string;
    referente_cognome: string;
  };
  userId: string;
};

/**
 * Autorizza il docente referente sulla propria adesione, e su nessun'altra.
 *
 * Non e la guardia dello staff e non deve diventarlo: il referente vede e
 * conferma solo gli studenti del suo istituto. Un admin che apre questa
 * rotta non passa da qui, passa dal pannello staff.
 *
 * Torna sempre un client con service role, perche l'update sulle iscrizioni
 * non ha policy RLS: l'ambito lo impone questa funzione, filtrando per
 * adesione_id in ogni query che la usa.
 */
export async function requireReferente(): Promise<
  | { error: null; status: 200; client: NonNullable<ReturnType<typeof liceiAdminClient>>; ctx: ReferenteContext }
  | { error: string; status: number }
> {
  const client = liceiAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  const { data: adesione } = await client
    .from("licei_adesioni")
    .select(
      "id, codice, stato, istituto_denominazione, istituto_comune, istituto_provincia, referente_nome, referente_cognome",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adesione) {
    return {
      error: "Nessuna adesione risulta associata a questo account.",
      status: 403,
    };
  }

  return { error: null, status: 200, client, ctx: { adesione, userId: user.id } };
}

/**
 * Cancello sulla formazione delle squadre. Come gli altri, lo staff passa
 * comunque per poter provare il flusso a fase chiusa.
 */
export async function verificaSquadreAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!squadreAperte(config.stato_squadre)) {
    return {
      ok: false,
      errore:
        "La formazione delle squadre non è ancora aperta. Te lo diciamo dentro il corso quando lo sarà.",
    };
  }
  return { ok: true };
}

/** Cancello sulla consegna dei progetti. */
export async function verificaConsegneAperte(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!consegneAperte(config.stato_consegne)) {
    return {
      ok: false,
      errore: config.scadenza_consegna_label
        ? `Le consegne sono chiuse. Il termine era il ${config.scadenza_consegna_label}.`
        : "Le consegne non sono ancora aperte.",
    };
  }
  return { ok: true };
}

/** Cancello sulle schede della Commissione. */
export async function verificaValutazioneAperta(
  staff: boolean,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (staff) return { ok: true };
  const config = await leggiConfigLicei();
  if (!valutazioneAperta(config.stato_valutazione)) {
    return {
      ok: false,
      errore: "Le schede di valutazione non sono aperte in questo momento.",
    };
  }
  return { ok: true };
}

/* ── Guardia dello studente ───────────────────────────────────────────── */

export type StudenteContext = {
  iscrizione: {
    id: string;
    adesione_id: string;
    nome: string;
    cognome: string;
    classe: string;
    anno_corso: number;
    stato: string;
    squadra_id: string | null;
    squadra_ruolo: string | null;
  };
  istituto: string;
  userId: string;
};

/**
 * Autorizza lo studente sulla propria iscrizione.
 *
 * Passa solo chi e stato CONFERMATO dal referente. Non e una formalita: il
 * codice dell'istituto gira in tutta la scuola, quindi senza questo filtro
 * chiunque lo conosca potrebbe creare squadre e consegnare progetti a nome
 * di un istituto che non lo ha mai visto. La conferma del referente e il
 * punto in cui una scuola dice "questo ragazzo e mio", e da li in poi tutto
 * il resto ci si appoggia.
 *
 * Torna un client con service role: l'ambito lo impone questa funzione, e
 * ogni query che la usa filtra per l'id dell'iscrizione o della sua squadra.
 */
export async function requireStudente(): Promise<
  | { error: null; status: 200; client: NonNullable<ReturnType<typeof liceiAdminClient>>; ctx: StudenteContext }
  | { error: string; status: number }
> {
  const client = liceiAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  const { data: righe } = await client
    .from("licei_iscrizioni")
    .select(
      "id, adesione_id, nome, cognome, classe, anno_corso, stato, squadra_id, squadra_ruolo, licei_adesioni(istituto_denominazione)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!righe || righe.length === 0) {
    return {
      error: "Nessuna iscrizione al percorso risulta associata a questo account.",
      status: 403,
    };
  }

  // Se qualcuno risultasse iscritto a due istituti, vale quella confermata:
  // e l'unica di cui una scuola risponde.
  const riga = righe.find((r) => r.stato === "confermata") ?? righe[0];

  if (riga.stato !== "confermata") {
    return {
      error:
        "La tua iscrizione non è ancora stata confermata dal docente referente del tuo istituto. Appena lo fa, questa area si apre.",
      status: 403,
    };
  }

  const ades = riga.licei_adesioni as unknown as { istituto_denominazione?: string } | null;

  return {
    error: null,
    status: 200,
    client,
    ctx: {
      iscrizione: {
        id: riga.id,
        adesione_id: riga.adesione_id,
        nome: riga.nome,
        cognome: riga.cognome,
        classe: riga.classe,
        anno_corso: riga.anno_corso,
        stato: riga.stato,
        squadra_id: riga.squadra_id,
        squadra_ruolo: riga.squadra_ruolo,
      },
      istituto: ades?.istituto_denominazione ?? "",
      userId: user.id,
    },
  };
}

/* ── Guardia del commissario (art. 8) ─────────────────────────────────── */

export type CommissarioContext = {
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
 * configurazione del percorso. Confonderli significherebbe che chi apre e
 * chiude le fasi puo anche assegnare i punteggi.
 */
export async function requireCommissario(): Promise<
  | { error: null; status: 200; client: NonNullable<ReturnType<typeof liceiAdminClient>>; ctx: CommissarioContext }
  | { error: string; status: number }
> {
  const client = liceiAdminClient();
  if (!client) return { error: "Configurazione server mancante.", status: 500 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato.", status: 401 };

  const { data: commissario } = await client
    .from("licei_commissari")
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
        id: commissario.id,
        nome: commissario.nome,
        cognome: commissario.cognome,
        ruolo: commissario.ruolo,
        diritto_voto: commissario.diritto_voto,
      },
      userId: user.id,
    },
  };
}

/**
 * Lo studente che legge questa pagina e un iscritto confermato al percorso
 * licei?
 *
 * Serve alle lezioni del corso, che a due punti attaccano un riquadro del
 * bando. La domanda si fa lato server e non nel browser per una ragione
 * precisa: il corso lo seguono anche persone che con il bando non c'entrano,
 * e una chiamata che a loro risponde 403 farebbe comparire e sparire un
 * riquadro d'errore su un bando che non li riguarda.
 *
 * Torna false, e non solleva, se qualcosa non e a posto: un problema del
 * modulo licei non deve impedire a nessuno di leggere una lezione.
 */
export async function studenteLiceiConfermato(): Promise<boolean> {
  try {
    const guard = await requireStudente();
    return guard.error === null;
  } catch {
    return false;
  }
}
