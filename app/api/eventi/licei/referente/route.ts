import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireReferente } from "@/lib/eventi/licei-server";
import {
  accessoEmailHtml,
  accessoEmailSubject,
  confermaEmailHtml,
  confermaEmailSubject,
} from "@/lib/eventi/licei-email";
import { SITE_URL, STATI_ISCRIZIONE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";

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
  // L'ultimo accesso arriva da `auth.users`, che PostgREST non espone: passa
  // per una funzione, gia filtrata per istituto. Serve al referente per
  // vedere chi risulta iscritto ma non e mai entrato nel corso, che e il
  // solo fallimento di questo percorso a non lasciare traccia da nessuna
  // altra parte.
  const [{ data, error }, { data: squadre }, { data: accessi }] = await Promise.all([
    client
      .from("licei_iscrizioni")
      .select(
        "id, nome, cognome, email, classe, anno_corso, stato, note_referente, created_at, confermata_at, squadra_id, squadra_ruolo, user_id",
      )
      .eq("adesione_id", ctx.adesione.id)
      .order("cognome", { ascending: true }),
    client
      .from("licei_squadre")
      .select("id, nome, codice, created_at, licei_progetti(stato, titolo, consegnato_at, finalista)")
      .eq("adesione_id", ctx.adesione.id)
      .order("created_at", { ascending: true }),
    client.rpc("licei_accessi_istituto", { p_adesione_id: ctx.adesione.id }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const perIscrizione = new Map<string, { ha_account: boolean; ultimo_accesso: string | null }>(
    ((accessi ?? []) as { iscrizione_id: string; ha_account: boolean; ultimo_accesso: string | null }[])
      .map((a) => [a.iscrizione_id, { ha_account: a.ha_account, ultimo_accesso: a.ultimo_accesso }]),
  );

  // Quanto lontano e arrivato ognuno nel corso. Si legge dopo, e non in
  // parallelo, perche serve la lista degli user_id che arriva dalla query
  // qui sopra.
  const progresso = await progressoPerUtenti(
    client,
    (data ?? []).map((r) => r.user_id).filter((id): id is string => !!id),
  );

  return NextResponse.json({
    adesione: ctx.adesione,
    totale_lezioni: TOTALE_LEZIONI,
    // `user_id` serve al server per contare le lezioni e poi esce dalla
    // risposta: e l'identificativo dell'account di un minorenne e la console
    // non ne fa niente. Al suo posto viaggiano `ha_account`, che e la sola
    // cosa che il referente deve sapere, e il conteggio.
    iscrizioni: (data ?? []).map(({ user_id, ...r }) => ({
      ...r,
      ha_account: perIscrizione.get(r.id)?.ha_account ?? false,
      ultimo_accesso: perIscrizione.get(r.id)?.ultimo_accesso ?? null,
      lezioni_completate: user_id ? (progresso.get(user_id) ?? 0) : 0,
    })),
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

/**
 * Rimanda a uno studente il link per impostare la password.
 *
 * L'iscrizione gli crea l'account e gli manda quel link una volta sola,
 * dentro l'email di benvenuto. Se non lo apre, l'account resta senza
 * password: risulta iscritto e confermato ovunque, ma nel corso non entra.
 * Finora l'unico rimedio era scrivere a noi. Adesso il referente, che e
 * l'unico a vedere la classe, se lo risolve da solo.
 *
 * Il link si genera qui e non si conserva: un link di recupero salvato a
 * database vale quanto una password in chiaro.
 */
export async function POST(request: Request) {
  const guard = await requireReferente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const body = (await request.json()) as { id?: string; azione?: string };

  if (body.azione !== "rimanda_accesso") {
    return NextResponse.json({ error: "Azione non riconosciuta." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Iscrizione non indicata." }, { status: 400 });

  // Come per la PATCH, il filtro su adesione_id e la vera guardia: senza,
  // conoscere l'id di un'iscrizione basterebbe a far partire un link di
  // accesso all'account di uno studente di un'altra scuola.
  const { data: iscrizione } = await client
    .from("licei_iscrizioni")
    .select("id, nome, email, user_id, stato")
    .eq("id", body.id)
    .eq("adesione_id", ctx.adesione.id)
    .maybeSingle();

  if (!iscrizione) {
    return NextResponse.json(
      { error: "Iscrizione non trovata fra quelle del tuo istituto." },
      { status: 404 },
    );
  }

  if (!iscrizione.user_id) {
    return NextResponse.json(
      {
        error:
          "Questa iscrizione non ha un account collegato. Ce lo segnali e lo sistemiamo noi.",
      },
      { status: 409 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "L'invio delle email non è configurato. Ce lo segnali." },
      { status: 503 },
    );
  }

  try {
    const { data: link, error: erroreLink } = await client.auth.admin.generateLink({
      type: "recovery",
      email: iscrizione.email,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });

    const url = link?.properties?.action_link;
    if (erroreLink || !url) {
      console.error("Licei rimanda accesso: generateLink failed:", erroreLink);
      return NextResponse.json(
        { error: "Non è stato possibile generare il link. Riprovi fra poco." },
        { status: 500 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
      to: iscrizione.email,
      subject: accessoEmailSubject(),
      html: accessoEmailHtml({
        nome: iscrizione.nome,
        istituto: ctx.adesione.istituto_denominazione,
        setPasswordUrl: url,
      }),
    });
  } catch (err) {
    // Qui l'errore va detto: a differenza della conferma, l'invio e tutto
    // quello che questa chiamata doveva fare. Un successo silenzioso
    // lascerebbe il referente convinto di aver rimediato.
    console.error("Licei rimanda accesso email failed:", err);
    return NextResponse.json(
      { error: "L'email non è partita. Riprovi fra poco." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
