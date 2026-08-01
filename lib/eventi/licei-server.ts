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
  adesioniAperte,
  type StatoAdesioni,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

export type LiceiConfig = {
  stato_adesioni: StatoAdesioni;
  scadenza_adesioni_label: string;
  avviso: string;
};

const DEFAULT: LiceiConfig = {
  stato_adesioni: STATO_ADESIONI_DEFAULT,
  scadenza_adesioni_label: "",
  avviso: "",
};

const STATI_VALIDI = new Set<StatoAdesioni>([
  "termini_non_comunicati",
  "aperte",
  "chiuse",
]);

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

    return {
      stato_adesioni: stato && STATI_VALIDI.has(stato) ? stato : DEFAULT.stato_adesioni,
      scadenza_adesioni_label: mappa.get("scadenza_adesioni_label") ?? "",
      avviso: mappa.get("avviso") ?? "",
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
