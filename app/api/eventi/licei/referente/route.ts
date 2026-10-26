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
import { STATI_ISCRIZIONE, STATI_ISCRIZIONE_ATTIVI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";
import {
  leggiAccessiIstituto,
  linkImpostaPassword,
  rimandaAccessoATutti,
  statoRimandaTutti,
} from "@/lib/eventi/licei-rimanda-accesso";
import { correggiEmailIscrizione } from "@/lib/eventi/licei-correggi-email";
import { talkPerStudentiIstituto } from "@/lib/eventi/talk-server";
import { TALKS, etichettaTalk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

const STATI_VALIDI = new Set<string>(STATI_ISCRIZIONE.map((s) => s.value));

// Il rinvio del link a tutti gli studenti mai entrati genera fino a cento
// link e li spedisce a blocchi, con una pausa fra l'uno e l'altro: il tempo
// di default potrebbe non bastare.
export const maxDuration = 60;

/** L'ora come la legge un docente in Italia. */
const oraRoma = (iso: string) =>
  new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

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
  // altra parte. Se la funzione non risponde, la console lo dice invece di
  // segnare tutta la scuola come "Mai entrato" (`accessi_non_letti`).
  // Con gli accessi, l'ora dell'ultimo rinvio del link a tutti: il bottone
  // resta spento per il tempo d'attesa anche dopo un ricaricamento.
  // In parallelo anche i docenti del progetto e le fasi del percorso. I
  // docenti non devono far cadere l'elenco degli studenti: se la lettura
  // fallisce, la console li chiede da sola alla loro rotta, che l'errore lo
  // dice per esteso.
  // E i talk con gli esperti a cui si sono iscritti i suoi studenti: alla
  // domanda "mi sono iscritta?" il docente risponde guardando la riga.
  const [{ data, error }, { data: squadre, error: erroreSquadre }, accessi, rimandaTutti, docenti, config, talk] = await Promise.all([
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
    leggiAccessiIstituto(client, ctx.adesione.id),
    statoRimandaTutti(client, ctx.adesione.id),
    rispostaDocenti(client, ctx).catch((err): DocentiRisposta | null => {
      console.error("Licei referente: docenti del progetto non letti:", err);
      return null;
    }),
    leggiConfigLicei(),
    talkPerStudentiIstituto(client, ctx.adesione.id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Le squadre non fanno cadere l'elenco, ma il quadro deve saperlo: senza
  // questo segnale direbbe "nessuna squadra" a un istituto che ne ha.
  if (erroreSquadre) console.error("Licei referente: squadre non lette:", erroreSquadre);

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
    // `ha_account` si legge dall'iscrizione stessa e non dalla funzione degli
    // accessi: prima, se quella non rispondeva, tutti risultavano senza
    // account e il bottone "Rimanda il link" spariva per l'intera scuola.
    iscrizioni: (data ?? []).map(({ user_id, ...r }) => ({
      ...r,
      ha_account: !!user_id,
      ultimo_accesso: accessi.ultimoAccesso.get(r.id) ?? null,
      lezioni_completate: user_id ? (progresso.get(user_id) ?? 0) : 0,
      // Gli slug dei talk a cui si e iscritto. Vuoto anche se i talk non si
      // sono potuti leggere: per quello c'e `talk_non_letti`.
      talk: user_id ? (talk.perUtente.get(user_id) ?? []) : [],
    })),
    // I talk della serie, dal primo, con il nome breve dei badge.
    talk_elenco: [...TALKS]
      .sort((a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime())
      .map((t) => ({ slug: t.slug, etichetta: etichettaTalk(t) })),
    talk_non_letti: !talk.letti,
    // Vero se gli accessi non si sono potuti leggere: allora `ultimo_accesso`
    // e nullo per tutti e non vuol dire "mai entrato".
    accessi_non_letti: !accessi.letti,
    // L'ultimo rinvio del link a tutti e da quando si puo ripetere.
    rimanda_tutti: rimandaTutti,
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
 * Rimanda il link per impostare la password, o corregge l'email.
 *
 * - `{ azione: "rimanda_accesso", id }`: a uno studente.
 * - `{ azione: "rimanda_accesso_tutti" }`: a tutti gli studenti
 *   dell'istituto, in attesa o confermati, che hanno un account e non sono
 *   mai entrati. Chi sono lo decide il server: il corpo non porta elenchi.
 * - `{ azione: "correggi_email", id, email, conferma? }`: l'indirizzo di uno
 *   studente il cui account non e mai entrato, e poi il link al nuovo
 *   indirizzo (`lib/eventi/licei-correggi-email.ts`).
 *
 * L'iscrizione crea l'account e manda quel link una volta sola, dentro
 * l'email di benvenuto. Se non lo apre, o se la posta della scuola blocca
 * le email esterne, l'account resta senza password: lo studente risulta
 * iscritto e confermato ovunque, ma nel corso non entra. L'iscrizione non va
 * rifatta: serve solo un link nuovo, e il referente o un docente del
 * progetto, che vedono la classe, se lo risolvono da soli.
 *
 * Il link si genera qui e non si conserva: un link di recupero salvato a
 * database vale quanto una password in chiaro.
 */
export async function POST(request: Request) {
  const guard = await requireDocente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    azione?: string;
    email?: unknown;
    conferma?: unknown;
  };

  if (body.azione === "rimanda_accesso_tutti") return rimandaATutti(client, ctx);
  if (body.azione === "correggi_email") return correggiEmail(client, ctx, body);

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

  // Come l'invio a tutti: solo a un'iscrizione attiva. Il bottone sulla
  // riga c'e solo per quelle, ma una console aperta da prima che un collega
  // segnasse lo studente come non riconosciuto lo mostra ancora.
  if (!STATI_ISCRIZIONE_ATTIVI.has(iscrizione.stato)) {
    return NextResponse.json(
      { error: "Questa iscrizione non è attiva: il link non si rimanda." },
      { status: 409 },
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

  const url = await linkImpostaPassword(client, iscrizione.id, iscrizione.email);
  if (!url) {
    return NextResponse.json(
      { error: "Non è stato possibile generare il link. Riprovi fra poco." },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Resend non solleva un'eccezione quando rifiuta un'email: lo dice nella
    // risposta. Senza questo controllo un rifiuto passava per un invio.
    const { error: erroreInvio } = await resend.emails.send({
      from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
      to: iscrizione.email,
      subject: accessoEmailSubject(),
      html: accessoEmailHtml({
        nome: iscrizione.nome,
        istituto: ctx.adesione.istituto_denominazione,
        setPasswordUrl: url,
      }),
    });
    if (erroreInvio) throw new Error(erroreInvio.message);
  } catch (err) {
    // Qui l'errore va detto: a differenza della conferma, l'invio e tutto
    // quello che questa chiamata doveva fare. Un successo silenzioso
    // lascerebbe il referente convinto di aver rimediato.
    console.error(`Licei rimanda accesso: iscrizione ${iscrizione.id}: email non partita:`, err);
    return NextResponse.json(
      { error: "L'email non è partita. Riprovi fra poco." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * La correzione dell'email di uno studente mai entrato. I controlli e le
 * scritture sono in `correggiEmailIscrizione`; qui la risposta e il link
 * della password al nuovo indirizzo, se l'iscrizione e attiva e l'account
 * non e gia entrato.
 */
async function correggiEmail(
  client: Parameters<typeof correggiEmailIscrizione>[0]["client"],
  ctx: { adesione: { id: string; istituto_denominazione: string }; userId: string },
  body: { id?: string; email?: unknown; conferma?: unknown },
) {
  if (!body.id) return NextResponse.json({ error: "Iscrizione non indicata." }, { status: 400 });
  if (typeof body.email !== "string" || body.email.trim() === "") {
    return NextResponse.json({ error: "Scriva il nuovo indirizzo email." }, { status: 400 });
  }

  const esito = await correggiEmailIscrizione({
    client,
    adesioneId: ctx.adesione.id,
    iscrizioneId: body.id,
    email: body.email,
    confermata: body.conferma === true,
    colonne: COLONNE_ISCRIZIONE_DOCENTE,
    autore: ctx.userId,
  });

  if (esito.esito === "rifiutata") {
    return NextResponse.json(
      {
        error: esito.errore,
        richiede_conferma: esito.richiedeConferma === true,
        suggerimento: esito.suggerimento ?? null,
      },
      { status: esito.status },
    );
  }

  // Il link al nuovo indirizzo. La correzione e fatta comunque: se l'email
  // non parte lo si dice, e il bottone "Rimanda il link" resta sulla riga.
  let emailInviata: boolean | null = null;
  if (esito.daAvvisare) {
    emailInviata = false;
    if (process.env.RESEND_API_KEY) {
      const url = await linkImpostaPassword(client, esito.daAvvisare.iscrizioneId, esito.daAvvisare.email);
      if (url) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const { error: erroreInvio } = await resend.emails.send({
            from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
            to: esito.daAvvisare.email,
            subject: accessoEmailSubject(),
            html: accessoEmailHtml({
              nome: esito.daAvvisare.nome,
              istituto: ctx.adesione.istituto_denominazione,
              setPasswordUrl: url,
            }),
          });
          if (erroreInvio) throw new Error(erroreInvio.message);
          emailInviata = true;
        } catch (err) {
          console.error(`Licei correggi email: iscrizione ${esito.daAvvisare.iscrizioneId}: email non partita:`, err);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    iscrizione: esito.iscrizione,
    account: esito.account,
    gia_entrato: esito.giaEntrato,
    // null: il link non andava mandato (iscrizione non attiva, o account gia entrato).
    email_inviata: emailInviata,
  });
}

/**
 * Il link a tutti quelli che non sono mai entrati. La scelta, il tempo
 * d'attesa e l'invio a blocchi stanno in `lib/eventi/licei-rimanda-accesso.ts`;
 * qui solo la traduzione in risposte. Messaggi generici e soli numeri:
 * nessuna email esce da questa rotta.
 */
async function rimandaATutti(
  client: Parameters<typeof rimandaAccessoATutti>[0]["client"],
  ctx: { adesione: { id: string; istituto_denominazione: string }; userId: string },
) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "L'invio delle email non è configurato. Ce lo segnali." },
      { status: 503 },
    );
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const esito = await rimandaAccessoATutti({
    client,
    adesioneId: ctx.adesione.id,
    istituto: ctx.adesione.istituto_denominazione,
    autore: ctx.userId,
    contaLezioni: (userIds) => progressoPerUtenti(client, userIds),
    inviaBlocco: (messaggi, idempotencyKey) =>
      resend.batch.send(messaggi, { batchValidation: "permissive", idempotencyKey }),
  });

  switch (esito.esito) {
    case "inviato":
      return NextResponse.json({
        success: true,
        inviati: esito.inviati,
        saltati: esito.saltati,
        gia_raggiunti: esito.gia_raggiunti,
        non_validi: esito.non_validi,
        errori: esito.errori,
        inviato_at: esito.inviato_at,
        prossimo_invio_at: esito.prossimo_invio_at,
      });
    case "nessuno":
      return NextResponse.json({
        success: true,
        nessuno: true,
        inviati: 0,
        saltati: esito.saltati,
        gia_raggiunti: esito.gia_raggiunti,
        non_validi: esito.non_validi,
        errori: 0,
        prossimo_invio_at: null,
      });
    case "attesa":
      return NextResponse.json(
        {
          // Neutro: la prenotazione resta anche quando i link sono stati
          // generati ma nessuna email e partita, e dire "rimandato a tutti"
          // sarebbe falso.
          error: esito.prossimo_invio_at
            ? `Un invio a tutti è stato avviato da poco. Si può ripetere dalle ${oraRoma(esito.prossimo_invio_at)}.`
            : "Un invio a tutti è stato avviato da poco. Riprovi fra qualche minuto.",
          prossimo_invio_at: esito.prossimo_invio_at,
        },
        { status: 429 },
      );
    case "non_partito":
      return NextResponse.json(
        {
          error: esito.prossimo_invio_at
            ? `Nessuna email è partita. Si può riprovare dalle ${oraRoma(esito.prossimo_invio_at)}.`
            : "Nessuna email è partita. Riprovi fra qualche minuto.",
          inviati: 0,
          saltati: esito.saltati,
          non_validi: esito.non_validi,
          errori: esito.errori,
          prossimo_invio_at: esito.prossimo_invio_at,
        },
        { status: 502 },
      );
    case "accessi_non_verificabili":
      return NextResponse.json(
        { error: "Non riusciamo a leggere gli accessi in questo momento. Riprovi fra qualche minuto." },
        { status: 503 },
      );
    default:
      return NextResponse.json(
        { error: "Non è stato possibile completare l'invio. Riprovi fra poco." },
        { status: 500 },
      );
  }
}
