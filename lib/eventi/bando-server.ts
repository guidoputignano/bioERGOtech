/**
 * Helper lato server condivisi dalle rotte del bando: client service role,
 * riconoscimento dello staff e cancello sulla finestra di candidatura.
 */

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BANDO_BUCKET,
  CANDIDATURE_APERTURA_LABEL,
  CANDIDATURE_SCADENZA_LABEL,
  statoCandidature,
} from "@/app/eventi/vivere-piu-a-lungo/bando/content";

export { BANDO_BUCKET };

/** Client con service role. Bypassa la RLS: usarlo solo dentro le rotte API. */
export function bandoAdminClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** L'utente della richiesta, se loggato, con il flag di appartenenza allo staff. */
export async function utenteCorrente(): Promise<{ id: string | null; email: string | null; staff: boolean }> {
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
}

/**
 * Cancello sulla finestra di candidatura dell'art. 5. Lo staff passa anche a
 * finestra chiusa, cosi il flusso si puo provare end to end prima
 * dell'apertura ufficiale senza aprire il form al pubblico.
 */
export function verificaFinestra(staff: boolean): { ok: true } | { ok: false; errore: string } {
  if (staff) return { ok: true };
  const stato = statoCandidature();
  if (stato === "non_aperto") {
    return { ok: false, errore: `Le candidature aprono il ${CANDIDATURE_APERTURA_LABEL}.` };
  }
  if (stato === "chiuso") {
    return {
      ok: false,
      errore: `Le candidature si sono chiuse il ${CANDIDATURE_SCADENZA_LABEL}.`,
    };
  }
  return { ok: true };
}
