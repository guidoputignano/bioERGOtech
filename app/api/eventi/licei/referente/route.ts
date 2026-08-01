import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireReferente } from "@/lib/eventi/licei-server";
import { confermaEmailHtml, confermaEmailSubject } from "@/lib/eventi/licei-email";
import { STATI_ISCRIZIONE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const STATI_VALIDI = new Set<string>(STATI_ISCRIZIONE.map((s) => s.value));

/** Le iscrizioni del proprio istituto, e solo quelle. */
export async function GET() {
  const guard = await requireReferente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  // Le squadre del proprio istituto arrivano insieme all'elenco. Non e un
  // di piu: il referente e l'unico che puo accorgersi che tre suoi studenti
  // confermati sono rimasti senza squadra, e l'unico che puo andare a
  // cercarli in corridoio prima che scada la consegna.
  const [{ data, error }, { data: squadre }] = await Promise.all([
    client
      .from("licei_iscrizioni")
      .select(
        "id, nome, cognome, email, classe, anno_corso, stato, note_referente, created_at, confermata_at, squadra_id, squadra_ruolo",
      )
      .eq("adesione_id", ctx.adesione.id)
      .order("cognome", { ascending: true }),
    client
      .from("licei_squadre")
      .select("id, nome, codice, created_at, licei_progetti(stato, titolo, consegnato_at, finalista)")
      .eq("adesione_id", ctx.adesione.id)
      .order("created_at", { ascending: true }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    adesione: ctx.adesione,
    iscrizioni: data ?? [],
    squadre: squadre ?? [],
  });
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

  // Lo stato di partenza serve a distinguere una conferma vera da una
  // riconferma: senza, riaprire e richiudere la stessa riga manderebbe allo
  // studente la stessa email tutte le volte.
  const { data: prima } = await client
    .from("licei_iscrizioni")
    .select("stato")
    .eq("id", body.id)
    .eq("adesione_id", ctx.adesione.id)
    .maybeSingle();

  const statoPrecedente = prima?.stato ?? null;

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

  // L'email di iscrizione promette allo studente "ti scriviamo appena e
  // fatto". Questo e il momento in cui e fatto: senza questa chiamata la
  // promessa resterebbe scoperta e il ragazzo aspetterebbe un messaggio che
  // nessuno manda, mentre la fase delle squadre gli passa davanti.
  const appenaConfermata = body.stato === "confermata" && statoPrecedente !== "confermata";

  if (appenaConfermata && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: data.email,
        subject: confermaEmailSubject(),
        html: confermaEmailHtml({
          nome: data.nome,
          istituto: ctx.adesione.istituto_denominazione,
        }),
      });
    } catch (mailErr) {
      // La conferma e registrata: un problema email non la annulla.
      console.error("Licei conferma email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, iscrizione: data });
}
