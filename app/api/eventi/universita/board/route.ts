/**
 * La bacheca dei partecipanti, e la stretta di mano che ne segue.
 *
 * Nei licei la squadra si forma in classe e il codice basta, perche gira
 * fra banchi che si conoscono da anni. Qui la candidatura e individuale e
 * arriva da atenei diversi, quindi il caso normale e arrivare senza
 * conoscere nessuno: senza questa rotta, "i team si costituiscono in un
 * secondo momento" vorrebbe dire che si costituiscono fra chi si conosceva
 * gia, e l'interdisciplinarita dell'art. 2 resterebbe un augurio.
 *
 * La regola che tiene insieme tutto il file: la bacheca e una
 * presentazione, non una rubrica. Nessuna delle sue risposte contiene
 * un'email o il codice di una squadra, perche l'una e l'altro sono il modo
 * di saltare la richiesta, e la richiesta e il punto in cui qualcuno
 * decide. I recapiti si scambiano dopo il si, nella rotta delle squadre.
 *
 * Il client ha la service role: ogni scrittura parte da un id che la
 * guardia ha dimostrato essere del chiamante, e gli id che arrivano dal
 * corpo della richiesta valgono solo se la query che li risolve li trova
 * gia in una condizione che li rende legittimi.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  requireCandidato,
  utenteCorrenteUniversita,
  verificaBoardAperta,
} from "@/lib/eventi/universita-server";
import {
  messaggioErroreDb,
  validateBoard,
  validateMessaggioRichiesta,
} from "@/lib/eventi/universita-squadre";
import {
  universitaEsitoRichiestaEmailHtml,
  universitaEsitoRichiestaEmailSubject,
  universitaRichiestaEmailHtml,
  universitaRichiestaEmailSubject,
} from "@/lib/eventi/universita-email";
import {
  CONSENSO_BOARD_TESTO,
  SQUADRA_MAX,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const MITTENTE = "Fondazione bioERGOtech <noreply@bioergotech.org>";

/**
 * I campi di una persona in bacheca. L'email non c'e, e non e una svista
 * ne una dimenticanza da correggere: e il motivo per cui la richiesta
 * esiste. Chi vuole lavorare con qualcuno bussa, e il recapito arriva
 * quando quel qualcuno ha detto di si.
 */
const CAMPI_PERSONA =
  "id, nome, cognome, universita, corso_studi, livello, area, area_altro, board_nota";

type PersonaBacheca = {
  id: string;
  nome: string;
  cognome: string;
  universita: string;
  corso_studi: string;
  livello: string;
  area: string;
  area_altro: string | null;
  board_nota: string | null;
};

/** Le due righe che la PATCH restituisce, una per lato della bacheca. */
type PresenzaBacheca = {
  id: string;
  cerca_squadra: boolean;
  consenso_board: boolean;
  board_nota: string | null;
};

type AnnuncioSquadra = {
  id: string;
  cerca_membri: boolean;
  cerca_nota: string | null;
};

type SquadraBacheca = {
  id: string;
  nome: string;
  cerca_nota: string | null;
  componenti: number;
  aree: string[];
  created_at: string;
};

/* ═══════════════════════════════════════════════════════════════════════
   GET . chi cerca una squadra, e quali squadre cercano qualcuno
   ═══════════════════════════════════════════════════════════════════════ */

export async function GET() {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaBoardAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  // Le quattro condizioni sono le stesse della policy di lettura scritta
  // nella migrazione, e la ripetizione e voluta: il client ha la service
  // role, quindi qui la policy non gira, e se queste righe non ci fossero
  // finirebbe in bacheca chi non ha mai acconsentito a comparirci.
  const { data: personeRaw } = await client
    .from("universita_candidature")
    .select(CAMPI_PERSONA)
    .eq("cerca_squadra", true)
    .eq("consenso_board", true)
    .eq("stato", "confermata")
    .is("squadra_id", null)
    .neq("id", ctx.candidatura.id)
    .order("updated_at", { ascending: false });

  const persone = (personeRaw ?? []) as PersonaBacheca[];

  /* ── L'altra meta della bacheca: i gruppi con un posto libero ── */
  const { data: squadreRaw } = await client
    .from("universita_squadre")
    // Niente `codice`: passarlo qui vorrebbe dire che chiunque apra la
    // bacheca puo entrare in qualunque squadra senza chiedere, e la
    // richiesta diventerebbe una formalita che si puo aggirare.
    .select("id, nome, cerca_nota, created_at")
    .eq("stato", "aperta")
    .eq("cerca_membri", true)
    .order("created_at", { ascending: false });

  const candidate = (squadreRaw ?? []).filter(
    (s: { id: string }) => s.id !== ctx.candidatura.squadra_id,
  );

  let squadre: SquadraBacheca[] = [];

  if (candidate.length > 0) {
    // Un giro solo per tutti i componenti di tutte le squadre in elenco.
    // Una query per squadra darebbe lo stesso risultato e una schermata che
    // rallenta man mano che il percorso funziona.
    const { data: componentiRaw } = await client
      .from("universita_candidature")
      .select("squadra_id, area")
      .in(
        "squadra_id",
        candidate.map((s: { id: string }) => s.id),
      );

    const conteggio = new Map<string, number>();
    const aree = new Map<string, Set<string>>();

    for (const c of (componentiRaw ?? []) as { squadra_id: string; area: string }[]) {
      conteggio.set(c.squadra_id, (conteggio.get(c.squadra_id) ?? 0) + 1);
      const insieme = aree.get(c.squadra_id) ?? new Set<string>();
      // Solo il valore dell'area, mai `area_altro`: quello e testo libero
      // scritto da una persona, e in un gruppo di due o tre identifica chi
      // lo ha scritto senza che se ne sia accorto.
      if (c.area) insieme.add(c.area);
      aree.set(c.squadra_id, insieme);
    }

    squadre = candidate
      .map((s: { id: string; nome: string; cerca_nota: string | null; created_at: string }) => ({
        id: s.id,
        nome: s.nome,
        cerca_nota: s.cerca_nota ?? null,
        componenti: conteggio.get(s.id) ?? 0,
        aree: Array.from(aree.get(s.id) ?? []),
        created_at: s.created_at,
      }))
      // Una squadra al completo resta in elenco solo il tempo che il
      // capitano impiega a spegnere l'annuncio. Toglierla qui evita a chi
      // guarda di bussare a una porta che il database rifiutera comunque.
      .filter((s: SquadraBacheca) => s.componenti < SQUADRA_MAX);
  }

  return NextResponse.json({ persone, squadre });
}

/* ═══════════════════════════════════════════════════════════════════════
   PATCH . la propria presenza in bacheca, e l'annuncio della propria squadra
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Due cose in una rotta sola perche sono la stessa schermata: "cerco una
 * squadra" e "la mia squadra cerca qualcuno" sono lo stesso interruttore
 * visto dai due lati, e chi passa dall'uno all'altro lo fa nello stesso
 * minuto in cui la squadra nasce.
 */
export async function PATCH(request: Request) {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaBoardAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    cerca_squadra?: boolean;
    consenso_board?: boolean;
    board_nota?: string;
    cerca_membri?: boolean;
    cerca_nota?: string;
  };

  const toccaPersona =
    body.cerca_squadra !== undefined ||
    body.consenso_board !== undefined ||
    body.board_nota !== undefined;
  const toccaSquadra = body.cerca_membri !== undefined || body.cerca_nota !== undefined;

  if (!toccaPersona && !toccaSquadra) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  let candidatura: PresenzaBacheca | null = null;
  let squadra: AnnuncioSquadra | null = null;

  /* ── Lato persona ── */
  if (toccaPersona) {
    // I campi assenti tengono il valore di adesso: la validazione deve
    // vedere lo stato come sara dopo il salvataggio, altrimenti accendere
    // `cerca_squadra` da solo passerebbe anche senza consenso.
    const cerca =
      body.cerca_squadra === undefined ? ctx.candidatura.cerca_squadra : body.cerca_squadra === true;
    const consenso =
      body.consenso_board === undefined
        ? ctx.candidatura.consenso_board
        : body.consenso_board === true;
    const nota =
      body.board_nota === undefined ? (ctx.candidatura.board_nota ?? "") : testo(body.board_nota);

    const errore = validateBoard({
      cerca_squadra: cerca,
      consenso_board: consenso,
      board_nota: nota,
    });
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const patch: Record<string, unknown> = {
      cerca_squadra: cerca,
      consenso_board: consenso,
      board_nota: nota || null,
    };

    // Il testo si registra nel momento in cui il consenso viene dato, come
    // gli altri consensi del modulo: se domani la formula cambia, resta
    // scritto a quale formula questa persona ha detto di si.
    if (consenso && !ctx.candidatura.consenso_board) {
      patch.consenso_board_testo = CONSENSO_BOARD_TESTO;
    }

    const { data, error } = await client
      .from("universita_candidature")
      .update(patch)
      .eq("id", ctx.candidatura.id)
      .select("id, cerca_squadra, consenso_board, board_nota")
      .maybeSingle();

    if (error) {
      console.error("Universita bacheca persona error:", error);
      return NextResponse.json(
        { error: "Non è stato possibile aggiornare la tua presenza in bacheca." },
        { status: 500 },
      );
    }
    candidatura = data ?? null;
  }

  /* ── Lato squadra ── */
  if (toccaSquadra) {
    if (!ctx.candidatura.squadra_id) {
      return NextResponse.json(
        { error: "Non sei in nessuna squadra, quindi non c'è niente da mettere in bacheca." },
        { status: 409 },
      );
    }
    // L'annuncio impegna tutto il gruppo, e chi risponde alle richieste che
    // ne arrivano e una persona sola: la stessa che lo scrive.
    if (ctx.candidatura.squadra_ruolo !== "capo") {
      return NextResponse.json(
        { error: "Solo chi ha creato la squadra può metterla in bacheca." },
        { status: 403 },
      );
    }

    const erroreNota = validateBoard({ board_nota: body.cerca_nota });
    if (erroreNota) return NextResponse.json({ error: erroreNota }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (body.cerca_membri !== undefined) patch.cerca_membri = body.cerca_membri === true;
    if (body.cerca_nota !== undefined) patch.cerca_nota = testo(body.cerca_nota) || null;

    const { data, error } = await client
      .from("universita_squadre")
      .update(patch)
      .eq("id", ctx.candidatura.squadra_id)
      .select("id, cerca_membri, cerca_nota")
      .maybeSingle();

    if (error) {
      console.error("Universita bacheca squadra error:", error);
      return NextResponse.json(
        { error: "Non è stato possibile aggiornare l'annuncio della squadra." },
        { status: 500 },
      );
    }
    squadra = data ?? null;
  }

  return NextResponse.json({ success: true, candidatura, squadra });
}

/* ═══════════════════════════════════════════════════════════════════════
   POST . bussare, o invitare
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Due direzioni, una rotta. `origine` dice chi ha bussato, ed e l'unico
 * dato che poi permette di sapere chi deve rispondere: la simmetria e
 * apparente, perche a decidere e sempre l'altra parte.
 */
export async function POST(request: Request) {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaBoardAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    squadra_id?: string;
    candidatura_id?: string;
    messaggio?: string;
  };

  const erroreMessaggio = validateMessaggioRichiesta(body.messaggio);
  if (erroreMessaggio) return NextResponse.json({ error: erroreMessaggio }, { status: 400 });

  const messaggio = testo(body.messaggio) || null;

  let squadraId = "";
  let candidaturaId = "";
  let origine: "candidato" | "squadra" = "candidato";
  let nomeSquadra = "";

  /* ── Un candidato chiede di entrare ── */
  if (typeof body.squadra_id === "string" && body.squadra_id) {
    if (ctx.candidatura.squadra_id) {
      return NextResponse.json(
        { error: "Sei già in una squadra. Esci da questa prima di chiederne un'altra." },
        { status: 409 },
      );
    }

    // L'id arriva dal corpo della richiesta, quindi non prova niente: prova
    // qualcosa solo il fatto che risolva a una squadra aperta.
    const { data: squadra } = await client
      .from("universita_squadre")
      .select("id, nome, stato")
      .eq("id", body.squadra_id)
      .eq("stato", "aperta")
      .maybeSingle();

    if (!squadra) {
      return NextResponse.json(
        { error: "Questa squadra non risulta più attiva." },
        { status: 404 },
      );
    }

    const { count } = await client
      .from("universita_candidature")
      .select("id", { count: "exact", head: true })
      .eq("squadra_id", squadra.id);

    if ((count ?? 0) >= SQUADRA_MAX) {
      return NextResponse.json(
        { error: `Questa squadra ha già ${SQUADRA_MAX} componenti, che è il massimo.` },
        { status: 409 },
      );
    }

    squadraId = squadra.id as string;
    candidaturaId = ctx.candidatura.id;
    origine = "candidato";
    nomeSquadra = (squadra.nome as string) ?? "";
  } else if (typeof body.candidatura_id === "string" && body.candidatura_id) {
    /* ── Un capitano invita qualcuno visto in bacheca ── */
    if (!ctx.candidatura.squadra_id) {
      return NextResponse.json(
        { error: "Per invitare qualcuno devi prima avere una squadra." },
        { status: 409 },
      );
    }
    if (ctx.candidatura.squadra_ruolo !== "capo") {
      return NextResponse.json(
        { error: "Gli inviti li manda chi ha creato la squadra." },
        { status: 403 },
      );
    }

    // Le condizioni di questa select sono le stesse che mettono una persona
    // in bacheca. Non sono un filtro di comodo: sono il motivo per cui un
    // id preso altrove non serve a niente, perche chi non ha acconsentito a
    // comparire non si puo nemmeno invitare.
    const { data: invitato } = await client
      .from("universita_candidature")
      .select("id, nome")
      .eq("id", body.candidatura_id)
      .eq("stato", "confermata")
      .eq("cerca_squadra", true)
      .eq("consenso_board", true)
      .is("squadra_id", null)
      .maybeSingle();

    if (!invitato) {
      return NextResponse.json(
        {
          error:
            "Questa persona non risulta più in bacheca: può aver trovato una squadra o essersi tolta dall'elenco.",
        },
        { status: 404 },
      );
    }

    const { data: squadra } = await client
      .from("universita_squadre")
      .select("nome")
      .eq("id", ctx.candidatura.squadra_id)
      .maybeSingle();

    squadraId = ctx.candidatura.squadra_id;
    candidaturaId = invitato.id as string;
    origine = "squadra";
    nomeSquadra = (squadra?.nome as string) ?? "";
  } else {
    return NextResponse.json(
      { error: "Indica la squadra a cui vuoi chiedere, o la persona che vuoi invitare." },
      { status: 400 },
    );
  }

  // Upsert sulla coppia e non insert: una richiesta rifiutata resta a
  // database perche e successa, ma non deve impedire un secondo tentativo
  // sei settimane dopo, quando la squadra e cambiata e la risposta puo
  // essere un'altra.
  const { data: richiesta, error } = await client
    .from("universita_richieste_squadra")
    .upsert(
      {
        squadra_id: squadraId,
        candidatura_id: candidaturaId,
        origine,
        messaggio,
        stato: "in_attesa",
        deciso_at: null,
      },
      { onConflict: "squadra_id,candidatura_id" },
    )
    .select("id, squadra_id, candidatura_id, origine, messaggio, stato, created_at, deciso_at")
    .maybeSingle();

  if (error || !richiesta) {
    const amichevole = error ? messaggioErroreDb(error.message) : null;
    if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
    console.error("Universita richiesta upsert error:", error);
    return NextResponse.json(
      { error: "Non è stato possibile inviare la richiesta." },
      { status: 500 },
    );
  }

  /* ── Avviso al capitano ── */
  // Solo quando a bussare e il candidato. Per l'invito il gemello non
  // esiste fra i costruttori del modulo, e mandare al posto suo un testo
  // che dice il contrario di quello che e successo sarebbe peggio che non
  // mandare niente: chi e stato invitato lo trova nella sua area.
  if (process.env.RESEND_API_KEY && origine === "candidato") {
    try {
      const { data: capitano } = await client
        .from("universita_candidature")
        .select("nome, email")
        .eq("squadra_id", squadraId)
        .eq("squadra_ruolo", "capo")
        .maybeSingle();

      if (capitano?.email) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: MITTENTE,
          to: capitano.email as string,
          subject: universitaRichiestaEmailSubject(nomeSquadra),
          html: universitaRichiestaEmailHtml({
            capitano: (capitano.nome as string) ?? "",
            squadra: nomeSquadra,
            richiedente: `${ctx.candidatura.nome} ${ctx.candidatura.cognome}`.trim(),
            universita: ctx.candidatura.universita,
            corso: ctx.candidatura.corso_studi,
            messaggio,
          }),
        });
      }
    } catch (mailErr) {
      // La richiesta e registrata e compare comunque nell'area del
      // capitano: un problema di posta non la annulla.
      console.error("Universita richiesta email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, richiesta });
}

/* ═══════════════════════════════════════════════════════════════════════
   PUT . decidere una richiesta
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Chi decide e sempre la parte che non ha bussato, e chi ritira e sempre
 * quella che ha bussato.
 *
 * Nel caso ordinario, la richiesta di un candidato, questo vuol dire
 * esattamente che accettare e rifiutare sono verbi del capitano e ritirare
 * e verbo del richiedente. Nell'invito le parti si scambiano, e la regola
 * va letta cosi anche li: se accettare restasse del capitano, un capitano
 * potrebbe invitare chiunque veda in bacheca e accettare il proprio invito
 * un istante dopo, cioe mettere una persona in squadra senza chiederglielo.
 * La stretta di mano esiste per impedire proprio questo.
 */
export async function PUT(request: Request) {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaBoardAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    richiesta_id?: string;
    decisione?: string;
  };

  const decisione = testo(body.decisione);
  if (!["accettata", "rifiutata", "ritirata"].includes(decisione)) {
    return NextResponse.json({ error: "Decisione non prevista." }, { status: 400 });
  }
  if (typeof body.richiesta_id !== "string" || !body.richiesta_id) {
    return NextResponse.json({ error: "Richiesta non indicata." }, { status: 400 });
  }

  const { data: richiesta } = await client
    .from("universita_richieste_squadra")
    .select("id, squadra_id, candidatura_id, origine, stato")
    .eq("id", body.richiesta_id)
    .maybeSingle();

  // L'autorizzazione passa dalla riga, non dal corpo della richiesta: si e
  // il capitano di quella squadra, o si e la persona che quella richiesta
  // riguarda, e lo dice la riga letta a database.
  const eCapitano =
    !!richiesta &&
    ctx.candidatura.squadra_ruolo === "capo" &&
    ctx.candidatura.squadra_id === richiesta.squadra_id;
  const eRichiedente = !!richiesta && richiesta.candidatura_id === ctx.candidatura.id;

  // Stessa risposta per una richiesta che non esiste e per una che non ti
  // riguarda: distinguerle direbbe a chiunque provi un id se quell'id e
  // buono, e la bacheca non ha nessun motivo di rispondere a quella domanda.
  if (!richiesta || (!eCapitano && !eRichiedente)) {
    return NextResponse.json({ error: "Richiesta non trovata." }, { status: 404 });
  }

  if (richiesta.stato !== "in_attesa") {
    return NextResponse.json({ error: "Questa richiesta è già stata decisa." }, { status: 409 });
  }

  const decideIlCapitano = richiesta.origine === "candidato";
  const puoDecidere = decideIlCapitano ? eCapitano : eRichiedente;
  const puoRitirare = decideIlCapitano ? eRichiedente : eCapitano;

  if (decisione === "ritirata" && !puoRitirare) {
    return NextResponse.json(
      { error: "Può ritirare la richiesta solo chi l'ha mandata." },
      { status: 403 },
    );
  }
  if (decisione !== "ritirata" && !puoDecidere) {
    return NextResponse.json(
      {
        error: decideIlCapitano
          ? "Solo chi ha creato la squadra può accettare o rifiutare una richiesta."
          : "Solo la persona invitata può accettare o rifiutare l'invito.",
      },
      { status: 403 },
    );
  }

  /* ── L'ingresso, che e l'unica decisione che cambia qualcosa d'altro ── */
  if (decisione === "accettata") {
    const { data: destinatario } = await client
      .from("universita_candidature")
      .select("id, nome, email, squadra_id, stato")
      .eq("id", richiesta.candidatura_id)
      .maybeSingle();

    if (!destinatario || destinatario.stato !== "confermata") {
      return NextResponse.json(
        { error: "Questa persona non risulta più nel percorso." },
        { status: 409 },
      );
    }
    if (destinatario.squadra_id) {
      return NextResponse.json({ error: "Questa persona è già in una squadra." }, { status: 409 });
    }

    const { data: progetto } = await client
      .from("universita_progetti")
      .select("stato")
      .eq("squadra_id", richiesta.squadra_id)
      .maybeSingle();

    if (progetto?.stato === "consegnato") {
      return NextResponse.json(
        {
          error:
            "Questa squadra ha già consegnato il progetto: l'elenco degli autori non si tocca più.",
        },
        { status: 409 },
      );
    }

    // Il filtro `is squadra_id null` ripete il controllo di sopra dentro la
    // scrittura, perche fra i due momenti ci sta l'accettazione di un'altra
    // squadra. La capienza invece la impone il trigger, sotto lock: qui si
    // traduce soltanto l'errore che ne esce.
    const { data: entrato, error: erroreIngresso } = await client
      .from("universita_candidature")
      .update({ squadra_id: richiesta.squadra_id, squadra_ruolo: "membro", cerca_squadra: false })
      .eq("id", richiesta.candidatura_id)
      .is("squadra_id", null)
      .select("id")
      .maybeSingle();

    if (erroreIngresso || !entrato) {
      const amichevole = erroreIngresso ? messaggioErroreDb(erroreIngresso.message) : null;
      if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
      if (!erroreIngresso) {
        return NextResponse.json(
          { error: "Questa persona è già in una squadra." },
          { status: 409 },
        );
      }
      console.error("Universita ingresso da richiesta error:", erroreIngresso);
      return NextResponse.json(
        { error: "Non è stato possibile completare l'ingresso in squadra." },
        { status: 500 },
      );
    }
  }

  const { data: aggiornata, error } = await client
    .from("universita_richieste_squadra")
    .update({ stato: decisione, deciso_at: new Date().toISOString() })
    .eq("id", richiesta.id)
    .eq("stato", "in_attesa")
    .select("id, squadra_id, candidatura_id, origine, messaggio, stato, created_at, deciso_at")
    .maybeSingle();

  if (error || !aggiornata) {
    console.error("Universita decisione richiesta error:", error);
    return NextResponse.json(
      { error: "Non è stato possibile registrare la decisione." },
      { status: 500 },
    );
  }

  /* ── Esito a chi aspettava ── */
  // Solo per le richieste nate dal candidato: il testo del costruttore
  // parla di una richiesta accolta o non accolta da una squadra, e per un
  // invito declinato direbbe a una persona che e stata rifiutata mentre e
  // stata lei a dire di no.
  if (process.env.RESEND_API_KEY && richiesta.origine === "candidato" && decisione !== "ritirata") {
    try {
      const [{ data: destinatario }, { data: squadra }] = await Promise.all([
        client
          .from("universita_candidature")
          .select("nome, email")
          .eq("id", richiesta.candidatura_id)
          .maybeSingle(),
        client.from("universita_squadre").select("nome").eq("id", richiesta.squadra_id).maybeSingle(),
      ]);

      if (destinatario?.email) {
        const accettata = decisione === "accettata";
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: MITTENTE,
          to: destinatario.email as string,
          subject: universitaEsitoRichiestaEmailSubject(accettata),
          html: universitaEsitoRichiestaEmailHtml({
            nome: (destinatario.nome as string) ?? "",
            squadra: (squadra?.nome as string) ?? "",
            accettata,
          }),
        });
      }
    } catch (mailErr) {
      // La decisione e registrata: un problema di posta non la annulla.
      console.error("Universita esito richiesta email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, richiesta: aggiornata });
}
