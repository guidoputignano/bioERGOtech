/**
 * Guardie di accesso per le rotte API che usano la service role key.
 *
 * La service role key bypassa la RLS: una rotta che la usa senza controllare
 * chi sta chiamando e aperta a chiunque conosca l'indirizzo. Queste due
 * funzioni sono l'unico modo previsto per ottenere quel client dentro una
 * rotta, e restituiscono l'errore gia pronto da rimandare al chiamante.
 *
 *   const { error, status, client } = await requireAdmin();
 *   if (error || !client) return NextResponse.json({ error }, { status });
 *
 * Due livelli, perche il portale non ha solo pagine da staff:
 * - requireAdmin:  solo partnership_level = 'admin'.
 * - requireMember: qualunque utente autenticato. Serve alle rotte che il
 *   Member Portal usa anche per i membri normali (elenco attrezzature,
 *   knowledge base, proposte). Non e un permesso debole: e comunque
 *   infinitamente piu di "chiunque su internet".
 */

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

export type Livello = "member" | "admin";

export type Chiamante = {
  id: string;
  email: string | null;
  livello: string;
  isAdmin: boolean;
};

export type Guardia =
  | { error: string; status: number; client: null; chiamante: null }
  | { error: null; status: 200; client: SupabaseClient; chiamante: Chiamante };

function serviceClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function guardia(minimo: Livello): Promise<Guardia> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401, client: null, chiamante: null };

  // Il livello si legge con il client dell'utente, non con la service role:
  // la policy "Users can view own profile" basta, e non serve fidarsi di
  // nulla che arrivi dalla richiesta.
  const { data: profile } = await supabase
    .from("profiles")
    .select("partnership_level")
    .eq("id", user.id)
    .maybeSingle();

  const livello = profile?.partnership_level ?? "viewer";
  const isAdmin = livello === "admin";

  if (minimo === "admin" && !isAdmin) {
    return { error: "Forbidden: admin access required", status: 403, client: null, chiamante: null };
  }

  const client = serviceClient();
  if (!client) {
    return {
      error: "Server misconfiguration: missing service role key",
      status: 500,
      client: null,
      chiamante: null,
    };
  }

  return {
    error: null,
    status: 200,
    client,
    chiamante: { id: user.id, email: user.email ?? null, livello, isAdmin },
  };
}

/** Solo staff. Da usare per tutto cio che modifica dati altrui o li espone in blocco. */
export const requireAdmin = (): Promise<Guardia> => guardia("admin");

/** Qualunque utente autenticato. Per le rotte che servono anche ai membri del portale. */
export const requireMember = (): Promise<Guardia> => guardia("member");
