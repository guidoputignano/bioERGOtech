import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { STATI_CANDIDATURA } from "@/app/eventi/vivere-piu-a-lungo/bando/content";

const STATI_VALIDI = new Set<string>(STATI_CANDIDATURA.map((s) => s.value));
const CATEGORIE_VALIDE = new Set(["A", "B", "C"]);

/** Elenco completo delle candidature per l'istruttoria, con filtri. */
export async function GET(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const categoria = searchParams.get("categoria") ?? "";
  const stato = searchParams.get("stato") ?? "";

  let query = client
    .from("bando_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (stato && STATI_VALIDI.has(stato)) query = query.eq("stato", stato);

  const { data, error: fetchError } = await query;
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data ?? []) as any[];

  // La categoria effettiva e quella riassegnata dalla Commissione, se c'e.
  if (categoria && CATEGORIE_VALIDE.has(categoria)) {
    rows = rows.filter((r) => (r.categoria_riassegnata ?? r.categoria) === categoria);
  }
  if (q) {
    rows = rows.filter(
      (r) =>
        (r.progetto_nome ?? "").toLowerCase().includes(q) ||
        (r.organizzazione ?? "").toLowerCase().includes(q) ||
        (r.referente_email ?? "").toLowerCase().includes(q) ||
        `${r.referente_nome} ${r.referente_cognome}`.toLowerCase().includes(q) ||
        (r.codice ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ applications: rows, totale: (data ?? []).length });
}

/** Istruttoria: stato, punteggio, note e riassegnazione di categoria (art. 2 e 9). */
export async function PATCH(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as {
    id?: string;
    stato?: string;
    punteggio?: number | null;
    note_commissione?: string | null;
    categoria_riassegnata?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Candidatura non indicata." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.stato !== undefined) {
    if (!STATI_VALIDI.has(body.stato)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    patch.stato = body.stato;
  }

  if (body.punteggio !== undefined) {
    if (body.punteggio === null || body.punteggio === ("" as unknown)) {
      patch.punteggio = null;
    } else {
      const n = Number(body.punteggio);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json({ error: "Il punteggio deve essere fra 0 e 100." }, { status: 400 });
      }
      patch.punteggio = n;
    }
  }

  if (body.note_commissione !== undefined) {
    patch.note_commissione = body.note_commissione?.trim() || null;
  }

  if (body.categoria_riassegnata !== undefined) {
    if (body.categoria_riassegnata && !CATEGORIE_VALIDE.has(body.categoria_riassegnata)) {
      return NextResponse.json({ error: "Categoria non valida." }, { status: 400 });
    }
    patch.categoria_riassegnata = body.categoria_riassegnata || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error: updateError } = await client
    .from("bando_applications")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, application: data });
}
