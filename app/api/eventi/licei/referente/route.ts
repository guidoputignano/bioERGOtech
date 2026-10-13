import { NextResponse } from "next/server";
import { Resend } from "resend";
import { MESSAGGIO_ISTRUZIONI_DA_ACCETTARE, leggiConfigLicei, requireDocente } from "@/lib/eventi/licei-server";
import { rispostaDocenti, type DocentiRisposta } from "@/lib/eventi/licei-docenti";
import {
  accessoEmailHtml,
  accessoEmailSubject,
  confermaEmailHtml,
  confermaEmailSubject,
} from "@/lib/eventi/licei-email";
import { SITE_URL, STATI_ISCRIZIONE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";

const STATI_VALIDI = new Set<string>(STATI_ISCRIZIONE.map((s) => s.value));

/** Le colonne di un'iscrizione che un docente vede. Mai `user_id`. */
const COLONNE_ISCRIZIONE_DOCENTE =
  "id, nome, cognome, email, classe, anno_corso, stato, note_referente, created_at, confermata_at, squadra_id, squadra_ruolo";

/**
 * Le iscrizioni del proprio istituto, e solo quelle. Per il referente
 * principale e per i docenti del progetto, che vedono lo stesso istituto.
 */
export async function GET() {
  // La guardia qui non chiede le istruzioni accettate, e lo fa la rotta
  // subito sotto: cosi il rifiuto porta con se il ruolo e l'istituto, e la
  // console sa che deve mostrare le istruzioni invece di un errore.
  const guard = await requireDocente({ operativo: false });
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  // Cancello delle istruzioni: finche il docente non accetta la versione in
  // vigore, da questa rotta non esce nessun dato di studenti. Esce solo
  // quello che serve a intestare la schermata dell'accettazione.
  if (!ctx.istruzioniAccettate) {
    return NextResponse.json(
      {
        error: MESSAGGIO_ISTRUZIONI_DA_ACCETTARE,
        istruzioni_accettate: false,
        ruolo: ctx.ruolo,
        adesione: ctx.adesione,
      },
      { status: 403 },
    );
  }

  // Le squadre del proprio istituto arrivano insieme all'elenco. Non e un
  // di piu: i docenti dell'istituto sono i soli che possono accorgersi che
  // tre loro studenti confermati sono rimasti senza squadra, e andare a
  // cercarli in corridoio prima che scada la consegna. Il quadro si calcola
  // nella console (`quadroSquadre` in lib/eventi/licei-squadre.ts).
  // L'ultimo accesso arriva da `auth.users`, che PostgREST non espone: passa
  // per una funzione, gia filtrata per istituto. Serve al referente per
  // vedere chi risulta iscritto ma non e mai entrato nel corso, che e il
  // solo fallimento di questo percorso a non lasciare traccia da nessuna
  // altra parte.
  // In parallelo anche i docenti del progetto e le fasi del percorso. I
  // docenti non devono far cadere l'elenco degli studenti: se la lettura
  // fallisce, la console li chiede da sola alla loro rotta, che l'errore lo
  // dice per esteso.
  const [{ data, error }, { data: squadre, error: erroreSquadre }, { data: accessi }, docenti, config] = await Promise.all([
    client
      .from("licei_iscrizioni")
      .select(`${COLONNE_ISCRIZIONE_DOCENTE}, user_id`)
      .eq("adesione_id", ctx.adesione.id)
      .order("cognome", { ascending: true }),
    client
      .from("licei_squadre")
      // Senza `codice`: e la chiave per entrare nella squadra, la gestisce il
      // capitano, e in mano a un docente scavalcherebbe la sua scelta.
      .select("id, nome, created_at, licei_progetti(stato, titolo, consegnato_at, finalista)")
      .eq("adesione_id", ctx.adesione.id)
      .order("created_at", { ascending: true }),
    client.rpc("licei_accessi_istituto", { p_adesione_id: ctx.adesione.id }),
    rispostaDocenti(client, ctx).catch((err): DocentiRisposta | null => {
      console.error("Licei referente: docenti del progetto non letti:", err);
      return null;
    }),
    leggiConfigLicei(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Le squadre non fanno cadere l'elenco, ma il quadro deve saperlo: senza
  // questo segnale direbbe "nessuna squadra" a un istituto che ne ha.
  if (erroreSquadre) console.error("Licei referente: squadre non lette:", erroreSquadre);

  const perIscrizione = new Map<string, { ha_account: boolean; ultimo_accesso: string | null }>(
    ((accessi ?? []) as { iscrizione_id: string; ha_account: boolean; ultimo_accesso: string | null }[])
      .map((a) => [a.iscrizione_id, { ha_account: a.ha_account, ultimo_accesso: a.ultimo_accesso }]),
  );

  // Rete di sicurezza per il quadro delle squadre: un componente di un altro
  // istituto in una squadra di questo. Oggi non puo succedere, lo impedisce
  // il trigger `licei_squadra_capienza`; se un giorno succedesse, la console
  // lo conta come "Studente di altro istituto". Di quella riga si leggono
  // solo squadra e ruolo: nome, classe ed email di uno studente di un'altra
  // scuola non arrivano mai qui.
  const idSquadre = (squadre ?? []).map((s) => s.id as string);
  const componentiAltriIstituti = async () => {
    if (idSquadre.length === 0) return [];
    const { data: altri, error: erroreAltri } = await client
      .from("licei_iscrizioni")
      .select("squadra_id, squadra_ruolo")
      .in("squadra_id", idSquadre)
      .neq("adesione_id", ctx.adesione.id);
    if (erroreAltri) {
      console.error("Licei referente: controllo dei componenti di altri istituti non riuscito:", erroreAltri);
      return [];
    }
    return ((altri ?? []) as { squadra_id: string; squadra_ruolo: string | null }[]).map((r) => ({
      squadra_id: r.squadra_id,
      squadra_ruolo: r.squadra_ruolo,
      altro_istituto: true as const,
    }));
  };

  // Quanto lontano e arrivato ognuno nel corso. Si legge dopo, e non in
  // parallelo con l'elenco, perche serve la lista degli user_id che arriva
  // dalla query qui sopra; insieme, il controllo appena descritto.
  const [progresso, altriIstituti] = await Promise.all([
    progressoPerUtenti(
      client,
      (data ?? []).map((r) => r.user_id).filter((id): id is string => !!id),
    ),
    componentiAltriIstituti(),
  ]);

  // Chi sta guardando, con il nome: per il referente quello dell'adesione,
  // per un docente del progetto quello della sua riga.
  const io =
    docenti?.disponibile && docenti.ruolo === "docente"
      ? docenti.io
      : ctx.ruolo === "referente"
        ? { id: null, nome: ctx.adesione.referente_nome, cognome: ctx.adesione.referente_cognome, classi: ctx.classi }
        : { id: ctx.docenteId, nome: "", cognome: "", classi: ctx.classi };

  return NextResponse.json({
    adesione: ctx.adesione,
    // Chi sta guardando: il referente principale o un docente del progetto,
    // con le classi che segue (un filtro preselezionato, non un confine).
    ruolo: ctx.ruolo,
    classi: ctx.classi,
    io,
    // Al referente l'elenco completo, a un docente del progetto i soli nomi
    // dei colleghi. Null se la lettura e fallita.
    docenti_progetto: docenti,
    // Le fasi aperte o chiuse: il quadro delle squadre dice "non ancora
    // aperta" invece di mostrare un elenco vuoto.
    fasi: { squadre: config.stato_squadre, consegne: config.stato_consegne },
    istruzioni_accettate: true,
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
    // Per il quadro delle squadre: le squadre senza codice, i componenti si
    // ricavano da `squadra_id` e `squadra_ruolo` delle iscrizioni.
    squadre: squadre ?? [],
    squadre_errore: !!erroreSquadre,
    componenti_altri_istituti: altriIstituti,
  });
}

/**
 * Conferma o rifiuta una singola iscrizione del proprio istituto. La puo
 * fare anche un docente del progetto: `confermata_da` registra chi.
 */
export async function PATCH(request: Request) {
  const guard = await requireDocente();
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
  // Le colonne sono quelle della GET, senza `user_id`: la riga torna a un
  // docente, e non porta l'account dello studente, chi l'ha confermata o le
  // dichiarazioni dell'iscrizione.
  const { data, error } = await client
    .from("licei_iscrizioni")
    .update(patch)
    .eq("id", body.id)
    .eq("adesione_id", ctx.adesione.id)
    .select(COLONNE_ISCRIZIONE_DOCENTE)
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
  const guard = await requireDocente();
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
