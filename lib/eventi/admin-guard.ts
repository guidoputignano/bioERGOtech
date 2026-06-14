import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cancello d'accesso staff per le API admin dell'evento. Riusa l'auth e il
 * ruolo del sito: verifica che l'utente loggato abbia partnership_level
 * 'admin', poi restituisce un client service role per le operazioni.
 */
export async function getEventAdminClient(): Promise<
  | { error: string; status: number; client: null }
  | { error: null; status: 200; client: SupabaseClient }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, client: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("partnership_level")
    .eq("id", user.id)
    .single();
  if (!profile || profile.partnership_level !== "admin") {
    return { error: "Forbidden: admin access required", status: 403, client: null };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Server misconfiguration: missing service role key", status: 500, client: null };
  }

  const client = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return { error: null, status: 200, client };
}
