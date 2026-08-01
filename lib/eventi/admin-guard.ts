import { requireAdmin, type Guardia } from "@/lib/auth/admin";
import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cancello d'accesso staff per le API admin dell'evento e del bando.
 *
 * Storicamente implementato qui, oggi e un alias di `requireAdmin` in
 * `lib/auth/admin.ts`, che e la guardia unica di tutto il sito. Resta come
 * nome perche le rotte di eventi e bando lo chiamano cosi, e la forma del
 * valore di ritorno e la stessa.
 */
export async function getEventAdminClient(): Promise<
  | { error: string; status: number; client: null }
  | { error: null; status: 200; client: SupabaseClient }
> {
  const esito: Guardia = await requireAdmin();
  // `!== null` e non la verita: `error` e `string | null`, e la stringa vuota
  // sarebbe falsa senza discriminare l'unione.
  if (esito.error !== null) return { error: esito.error, status: esito.status, client: null };
  return { error: null, status: 200, client: esito.client };
}
