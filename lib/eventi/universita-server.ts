/**
 * Helper lato server della rotta del bando universitario: client service role
 * e cancello sulla finestra di candidatura. Stessa impostazione di
 * `bando-server.ts`, senza la parte di storage perché qui non si carica nulla.
 */

import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SCADENZA_CANDIDATURE_UNIVERSITARI,
  statoCandidatureUniversita,
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
