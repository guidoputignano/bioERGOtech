import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { STATI_ADESIONE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const STATI_VALIDI = new Set<string>(STATI_ADESIONE.map((s) => s.value));

/** Elenco delle adesioni per il pannello staff, con filtri e conteggi. */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const stato = searchParams.get("stato") ?? "";

  let query = client
    .from("licei_adesioni")
    .select("*")
    .order("created_at", { ascending: false });

  if (stato && STATI_VALIDI.has(stato)) query = query.eq("stato", stato);

  // La ricerca la fa il database, non la memoria: con tutti i licei della
  // provincia, filtrare in JS dopo aver scaricato tutto non regge.
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, "")}%`;
    query = query.or(
      [
        `istituto_denominazione.ilike.${like}`,
        `codice_meccanografico.ilike.${like}`,
        `istituto_comune.ilike.${like}`,
        `referente_cognome.ilike.${like}`,
        `referente_email.ilike.${like}`,
        `codice.ilike.${like}`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: stats } = await client.rpc("licei_stats");
  const { data: config } = await client.from("licei_config").select("chiave, valore");

  return NextResponse.json({ adesioni: data ?? [], stats: stats ?? [], config: config ?? [] });
}

/** Istruttoria: stato dell'adesione e note interne. */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const body = (await request.json()) as {
    id?: string;
    stato?: string;
    note_staff?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Adesione non indicata." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.stato !== undefined) {
    if (!STATI_VALIDI.has(body.stato)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    patch.stato = body.stato;
  }
  if (body.note_staff !== undefined) {
    patch.note_staff = body.note_staff?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error } = await client
    .from("licei_adesioni")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, adesione: data });
}
