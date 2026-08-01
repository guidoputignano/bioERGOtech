import { NextResponse } from "next/server";
import { requireReferente } from "@/lib/eventi/licei-server";
import { STATI_ISCRIZIONE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const STATI_VALIDI = new Set<string>(STATI_ISCRIZIONE.map((s) => s.value));

/** Le iscrizioni del proprio istituto, e solo quelle. */
export async function GET() {
  const guard = await requireReferente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const { data, error } = await client
    .from("licei_iscrizioni")
    .select("id, nome, cognome, email, classe, anno_corso, stato, note_referente, created_at, confermata_at")
    .eq("adesione_id", ctx.adesione.id)
    .order("cognome", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ adesione: ctx.adesione, iscrizioni: data ?? [] });
}

/** Conferma o rifiuta una singola iscrizione del proprio istituto. */
export async function PATCH(request: Request) {
  const guard = await requireReferente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const body = (await request.json()) as {
    id?: string;
    stato?: string;
    note_referente?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Iscrizione non indicata." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.stato !== undefined) {
    if (!STATI_VALIDI.has(body.stato)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    patch.stato = body.stato;
    // Chi ha confermato e quando: serve al referente per ricostruire, e a noi
    // se un domani qualcuno contesta di essere stato messo in elenco.
    patch.confermata_at = body.stato === "confermata" ? new Date().toISOString() : null;
    patch.confermata_da = body.stato === "confermata" ? ctx.userId : null;
  }
  if (body.note_referente !== undefined) {
    patch.note_referente = body.note_referente?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  // Il filtro su adesione_id non e ridondante: senza, conoscere l'id di
  // un'iscrizione basterebbe a un referente per toccare quella di un'altra
  // scuola. Il client ha la service role key, quindi RLS non lo ferma.
  const { data, error } = await client
    .from("licei_iscrizioni")
    .update(patch)
    .eq("id", body.id)
    .eq("adesione_id", ctx.adesione.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: "Iscrizione non trovata fra quelle del tuo istituto." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, iscrizione: data });
}
