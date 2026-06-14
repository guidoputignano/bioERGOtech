import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";

/**
 * Lista iscritti per il pannello admin, con le sessioni e lo stato di
 * presenza di ciascuno. Supporta ricerca testuale e filtri per sessione e
 * categoria. Restituisce anche i conteggi live per sessione.
 */
export async function GET(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const sessionFilter = searchParams.get("session") ?? "";
  const categoriaFilter = searchParams.get("categoria") ?? "";

  const { data: registrations, error: regError } = await client
    .from("event_registrations")
    .select(
      `id, nome, cognome, email, telefono, categoria, organizzazione, classe,
       startup_name, startup_url, note, consenso_marketing, codice_univoco, created_at,
       event_registration_sessions (
         id, is_waitlist, stato_checkin, checkin_ts,
         event_sessions ( slug, titolo )
       )`,
    )
    .order("created_at", { ascending: false });

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (registrations ?? []) as any[];

  if (q) {
    rows = rows.filter(
      (r) =>
        `${r.nome} ${r.cognome}`.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.codice_univoco ?? "").toLowerCase().includes(q),
    );
  }
  if (categoriaFilter) rows = rows.filter((r) => r.categoria === categoriaFilter);
  if (sessionFilter) {
    rows = rows.filter((r) =>
      (r.event_registration_sessions ?? []).some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.event_sessions?.slug === sessionFilter,
      ),
    );
  }

  // Conteggi live per sessione: registrati, presenti, capienza residua.
  const { data: sessions } = await client
    .from("event_sessions")
    .select("slug, titolo, capienza_max")
    .order("giorno", { ascending: true });

  const { data: seats } = await client.rpc("event_seats_remaining");

  return NextResponse.json({ registrations: rows, sessions, seats });
}
