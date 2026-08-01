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
  STATO_ISCRIZIONI_DEFAULT,
  adesioniAperte,
  iscrizioniAperte,
  type StatoAdesioni,
  type StatoIscrizioni,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

export type LiceiConfig = {
  stato_adesioni: StatoAdesioni;
  scadenza_adesioni_label: string;
  avviso: string;
  stato_iscrizioni: StatoIscrizioni;
  scadenza_iscrizioni_label: string;
};

const DEFAULT: LiceiConfig = {
  stato_adesioni: STATO_ADESIONI_DEFAULT,
  scadenza_adesioni_label: "",
  avviso: "",
  stato_iscrizioni: STATO_ISCRIZIONI_DEFAULT,
  scadenza_iscrizioni_label: "",
};

const STATI_VALIDI = new Set<StatoAdesioni>([
  "termini_non_comunicati",
  "aperte",
  "chiuse",
]);

const STATI_ISCRIZIONI_VALIDI = new Set<StatoIscrizioni>(["chiuse", "aperte"]);

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

    return {
      stato_adesioni: stato && STATI_VALIDI.has(stato) ? stato : DEFAULT.stato_adesioni,
      scadenza_adesioni_label: mappa.get("scadenza_adesioni_label") ?? "",
      avviso: mappa.get("avviso") ?? "",
      stato_iscrizioni:
        statoIscr && STATI_ISCRIZIONI_VALIDI.has(statoIscr)
          ? statoIscr
          : DEFAULT.stato_iscrizioni,
      scadenza_iscrizioni_label: mappa.get("scadenza_iscrizioni_label") ?? "",
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
