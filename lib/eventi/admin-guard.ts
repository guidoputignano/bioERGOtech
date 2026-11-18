/**
 * Cancelli d'accesso staff per le API admin dell'evento e del bando.
 *
 * ── Come dare l'accesso all'ingresso a un volontario ──────────────────────
 *
 * La modalità ingresso (/eventi/vivere-piu-a-lungo/admin/ingresso) serve
 * anche a chi aiuta alla porta il 10 e l'11 dicembre senza essere admin del
 * sito. Per autorizzare una persona:
 *
 *   1. La persona deve avere un account sul sito con la sua email, già
 *      confermata (lo crea da /auth/sign-up, oppure lo invitate dalla console
 *      di Supabase, Authentication, Users, Invite user).
 *   2. Su Vercel, Project, Settings, Environment Variables, aggiungete la sua
 *      email alla variabile EVENT_CHECKIN_EMAILS (ambiente Production),
 *      separata dalle altre con una virgola:
 *        EVENT_CHECKIN_EMAILS=mario.rossi@example.org, anna.bianchi@example.org
 *      Maiuscole e spazi non contano.
 *   3. Rifate il deploy (Deployments, ultimo deploy, Redeploy): le variabili
 *      d'ambiente si leggono solo al deploy.
 *   4. La persona accede e apre /eventi/vivere-piu-a-lungo/admin/ingresso.
 *
 * Il volontario vede solo la modalità ingresso: il pannello iscrizioni,
 * l'export e le comunicazioni restano agli admin. Dopo l'11 dicembre
 * svuotate EVENT_CHECKIN_EMAILS e rifate il deploy.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { requireAdmin, type Guardia } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

/**
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

/** Chi sta facendo entrare le persone: un admin o un volontario della lista. */
export type StaffIngresso = {
  id: string;
  email: string | null;
  isAdmin: boolean;
  ruolo: "admin" | "volontario";
};

export type GuardiaIngresso =
  | { error: string; status: number; client: null; chiamante: null }
  | { error: null; status: 200; client: SupabaseClient; chiamante: StaffIngresso };

/**
 * Le email autorizzate all'ingresso senza essere admin, da EVENT_CHECKIN_EMAILS:
 * separate da virgole (o punti e virgola, o a capo), senza badare a maiuscole
 * e spazi.
 */
export function emailIngressoAutorizzate(): ReadonlySet<string> {
  const grezzo = process.env.EVENT_CHECKIN_EMAILS ?? "";
  return new Set(
    grezzo
      .split(/[,;\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

function serviceClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Il cancello della modalità ingresso: passa chi passa `requireAdmin`, oppure
 * chi ha fatto l'accesso con un'email confermata che sta in
 * EVENT_CHECKIN_EMAILS. Stessa forma di valore di ritorno delle altre guardie:
 *
 *   const { error, status, client, chiamante } = await requireCheckinStaff();
 *   if (error !== null) return NextResponse.json({ error }, { status });
 *
 * Gli admin seguono la strada di sempre, senza un passaggio in più. Il
 * volontario costa una lettura dell'utente in più, solo quando non è admin.
 */
export async function requireCheckinStaff(): Promise<GuardiaIngresso> {
  const admin = await requireAdmin();
  if (admin.error === null) {
    return {
      error: null,
      status: 200,
      client: admin.client,
      chiamante: { id: admin.chiamante.id, email: admin.chiamante.email, isAdmin: true, ruolo: "admin" },
    };
  }
  // 401 (nessun accesso) e 500 (configurazione) valgono anche per i
  // volontari; solo il 403 (accesso fatto, ma non admin) merita la lista.
  if (admin.status !== 403) {
    return { error: admin.error, status: admin.status, client: null, chiamante: null };
  }

  const autorizzate = emailIngressoAutorizzate();
  if (autorizzate.size === 0) {
    return { error: "Accesso riservato allo staff dell'ingresso.", status: 403, client: null, chiamante: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, client: null, chiamante: null };

  const email = user.email?.trim().toLowerCase() ?? "";
  // L'email deve essere confermata: altrimenti chiunque potrebbe creare un
  // account con l'indirizzo di un volontario che non si è ancora registrato.
  if (!email || !user.email_confirmed_at || !autorizzate.has(email)) {
    return { error: "Accesso riservato allo staff dell'ingresso.", status: 403, client: null, chiamante: null };
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
  return { error: null, status: 200, client, chiamante: { id: user.id, email, isAdmin: false, ruolo: "volontario" } };
}
