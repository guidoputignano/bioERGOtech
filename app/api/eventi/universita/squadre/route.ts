/**
 * L'area dello studente universitario: una lettura sola e tre atti.
 *
 * La GET e l'unico punto da cui la console si carica. Non e una comodita:
 * candidatura, squadra, compagni, progetto, richieste e mentor sono la
 * stessa schermata, e sei chiamate separate darebbero sei momenti in cui la
 * pagina e a meta. Con una sola, o c'e tutto o c'e l'errore.
 *
 * La GET non passa dal cancello delle squadre, le mutazioni si. A fase
 * chiusa la console deve comunque aprirsi e spiegare che e chiusa: se anche
 * la lettura rispondesse 403, chi entra troverebbe un errore al posto di una
 * spiegazione, e non saprebbe se il problema e suo o del percorso.
 *
 * Il client ha la service role, quindi qui dentro la RLS non difende niente:
 * ogni query filtra per un id che la guardia ha gia dimostrato essere del
 * chiamante, mai per un id che arriva dal corpo della richiesta.
 */

import { NextResponse } from "next/server";
import {
  leggiConfigUniversita,
  requireCandidato,
  universitaAdminClient,
  utenteCorrenteUniversita,
  verificaSquadreAperte,
  type CandidatoContext,
} from "@/lib/eventi/universita-server";
import {
  generateCodiceSquadraUniversita,
  messaggioErroreDb,
  normalizzaCodiceSquadraUniversita,
  validateCodiceSquadra,
  validateNomeSquadra,
} from "@/lib/eventi/universita-squadre";

type Client = NonNullable<ReturnType<typeof universitaAdminClient>>;
type Candidatura = CandidatoContext["candidatura"];

/**
 * Le colonne dei compagni di squadra, email compresa.
 *
 * L'email c'e qui e non nella bacheca, ed e la stessa regola vista dai due
 * lati: in bacheca si e sconosciuti e ci si scrive solo dopo una richiesta
 * accettata, in squadra si lavora insieme e un recapito serve il primo
 * giorno. La guardia ha gia dimostrato che chi legge sta in questa squadra.
 */
const CAMPI_MEMBRO =
  "id, nome, cognome, universita, corso_studi, livello, area, area_altro, squadra_ruolo, email";

/** Le stesse colonne che `requireCandidato` mette in `ctx`, per rileggerle. */
const CAMPI_CANDIDATURA =
  "id, codice, nome, cognome, email, universita, corso_studi, livello, area, area_altro, stato, squadra_id, squadra_ruolo, cerca_squadra, consenso_board, board_nota";

/**
 * I campi di chi bussa alla squadra: esattamente quelli della bacheca,
 * email esclusa. Una richiesta in attesa non e ancora una presentazione, e
 * il recapito si scambia quando il capitano ha detto di si, non prima.
 */
const CAMPI_RICHIEDENTE =
  "id, nome, cognome, universita, corso_studi, livello, area, area_altro, board_nota";

const CAMPI_RICHIESTA =
  "id, squadra_id, candidatura_id, origine, messaggio, stato, created_at, deciso_at";

/* ── Forme che la console riceve ──────────────────────────────────────── */

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

type RichiestaRicevuta = {
  id: string;
  candidatura_id: string;
  origine: string;
  messaggio: string | null;
  stato: string;
  created_at: string;
  deciso_at: string | null;
  richiedente: PersonaBacheca | null;
};

type RichiestaInviata = {
  id: string;
  squadra_id: string;
  squadra_nome: string | null;
  origine: string;
  messaggio: string | null;
  stato: string;
  created_at: string;
  deciso_at: string | null;
};

type MentorSquadra = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  organizzazione: string;
  email: string;
  nota: string | null;
};

/**
 * Le righe di `universita_squadre` e `universita_progetti` passano cosi come
 * sono: sono tabelle del modulo, le colonne le decide la migrazione, e
 * ricopiarne l'elenco qui dentro creerebbe un secondo posto da aggiornare
 * ogni volta che ne nasce una.
 */
type Riga = Record<string, unknown>;

type StatoStudente = {
  candidatura: Candidatura;
  squadra: Riga | null;
  membri: Riga[];
  progetto: Riga | null;
  richieste: { ricevute: RichiestaRicevuta[]; inviate: RichiestaInviata[] };
  mentor: MentorSquadra[];
};

/**
 * PostgREST restituisce un oggetto per gli innesti "molti a uno", ma la
 * stessa select letta da un'altra versione puo tornare un array di uno.
 * Normalizzare qui costa una riga e toglie di mezzo un'intera classe di
 * schermate vuote senza errore.
 */
function unoSolo<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Rilegge la candidatura dopo una mutazione: `ctx` a quel punto e vecchio. */
async function rileggiCandidatura(client: Client, id: string): Promise<Candidatura | null> {
  const { data } = await client
    .from("universita_candidature")
    .select(CAMPI_CANDIDATURA)
    .eq("id", id)
    .maybeSingle<Candidatura>();
  return data ?? null;
}

/**
 * Tutto quello che la console mostra, in una struttura sola.
 *
 * La stessa funzione serve la GET e la risposta di ogni mutazione: cosi il
 * client non ha due forme da tenere allineate, e dopo un'azione si limita a
 * sostituire lo stato invece di rileggere.
 */
async function statoStudente(client: Client, candidatura: Candidatura): Promise<StatoStudente> {
  const squadraId = candidatura.squadra_id;

  // Le richieste inviate esistono anche per chi non sta in nessuna squadra,
  // ed e anzi il caso normale di chi ha appena bussato e sta aspettando.
  const { data: inviateRaw } = await client
    .from("universita_richieste_squadra")
    .select(`${CAMPI_RICHIESTA}, squadra:universita_squadre(nome)`)
    .eq("candidatura_id", candidatura.id)
    .order("created_at", { ascending: false });

  const inviate: RichiestaInviata[] = (inviateRaw ?? []).map(
    (r: RichiestaInviata & { squadra?: { nome: string } | { nome: string }[] | null }) => ({
      id: r.id,
      squadra_id: r.squadra_id,
      squadra_nome: unoSolo(r.squadra)?.nome ?? null,
      origine: r.origine,
      messaggio: r.messaggio ?? null,
      stato: r.stato,
      created_at: r.created_at,
      deciso_at: r.deciso_at ?? null,
    }),
  );

  if (!squadraId) {
    return {
      candidatura,
      squadra: null,
      membri: [],
      progetto: null,
      richieste: { ricevute: [], inviate },
      mentor: [],
    };
  }

  const [squadraRes, membriRes, progettoRes, ricevuteRes, mentorRes] = await Promise.all([
    client.from("universita_squadre").select("*").eq("id", squadraId).maybeSingle(),
    client
      .from("universita_candidature")
      .select(CAMPI_MEMBRO)
      .eq("squadra_id", squadraId)
      // 'capo' viene prima di 'membro' in ordine alfabetico, e va bene cosi:
      // chi apre la schermata deve sapere subito a chi chiedere.
      .order("squadra_ruolo", { ascending: true })
      .order("cognome", { ascending: true }),
    client.from("universita_progetti").select("*").eq("squadra_id", squadraId).maybeSingle(),
    // Le richieste ricevute le vede il capitano, perche e l'unico che puo
    // rispondere: mostrarle a chi non puo decidere sarebbe solo il nome di
    // uno sconosciuto in una schermata che non ha nessun bottone.
    candidatura.squadra_ruolo === "capo"
      ? client
          .from("universita_richieste_squadra")
          .select(`${CAMPI_RICHIESTA}, candidatura:universita_candidature(${CAMPI_RICHIEDENTE})`)
          .eq("squadra_id", squadraId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    client
      .from("universita_mentor_squadre")
      .select("nota, mentor:universita_mentor(id, nome, cognome, ruolo, organizzazione, email, stato)")
      .eq("squadra_id", squadraId),
  ]);

  const ricevute: RichiestaRicevuta[] = (ricevuteRes.data ?? []).map(
    (r: RichiestaRicevuta & { candidatura?: PersonaBacheca | PersonaBacheca[] | null }) => ({
      id: r.id,
      candidatura_id: r.candidatura_id,
      origine: r.origine,
      messaggio: r.messaggio ?? null,
      stato: r.stato,
      created_at: r.created_at,
      deciso_at: r.deciso_at ?? null,
      richiedente: unoSolo(r.candidatura),
    }),
  );

  // Solo i mentor approvati. Un abbinamento a una candidatura ancora da
  // valutare, o sospesa, non e un recapito da consegnare a una squadra: la
  // pubblicazione di un contatto la decide lo stato del mentor, non il fatto
  // che qualcuno abbia gia scritto la riga di abbinamento.
  const mentor: MentorSquadra[] = (mentorRes.data ?? [])
    .map(
      (r: {
        nota: string | null;
        mentor?: (MentorSquadra & { stato: string }) | (MentorSquadra & { stato: string })[] | null;
      }) => {
        const m = unoSolo(r.mentor);
        if (!m || m.stato !== "approvata") return null;
        return {
          id: m.id,
          nome: m.nome,
          cognome: m.cognome,
          ruolo: m.ruolo,
          organizzazione: m.organizzazione,
          email: m.email,
          nota: r.nota ?? null,
        };
      },
    )
    .filter((m: MentorSquadra | null): m is MentorSquadra => m !== null);

  return {
    candidatura,
    squadra: squadraRes.data ?? null,
    membri: membriRes.data ?? [],
    progetto: progettoRes.data ?? null,
    richieste: { ricevute, inviate },
    mentor,
  };
}

/** Lo stato aggiornato dopo una mutazione, con la candidatura riletta. */
async function statoDopoMutazione(client: Client, candidaturaId: string, fallback: Candidatura) {
  const fresca = await rileggiCandidatura(client, candidaturaId);
  return statoStudente(client, fresca ?? fallback);
}

/* ═══════════════════════════════════════════════════════════════════════
   GET . tutto quello che la console mostra
   ═══════════════════════════════════════════════════════════════════════ */

export async function GET() {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const [stato, config] = await Promise.all([
    statoStudente(client, ctx.candidatura),
    leggiConfigUniversita(),
  ]);

  return NextResponse.json({
    ...stato,
    // Solo le chiavi che riguardano lo studente. `conferma_automatica` e
    // `avviso` sono affari dello staff e non hanno niente da dire qui.
    config: {
      stato_squadre: config.stato_squadre,
      stato_board: config.stato_board,
      stato_consegne: config.stato_consegne,
      scadenza_consegna_label: config.scadenza_consegna_label,
      stato_valutazione: config.stato_valutazione,
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   POST . crea la squadra
   ═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaSquadreAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  if (ctx.candidatura.squadra_id) {
    return NextResponse.json(
      { error: "Sei già in una squadra. Per crearne un'altra devi prima uscire da questa." },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { nome?: string };
  const errore = validateNomeSquadra(body.nome);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  // Il codice e casuale e unico: al primo scontro se ne prova un altro,
  // invece di rimbalzare una persona che con la collisione non c'entra.
  let squadraId: string | null = null;
  let ultimoErrore = "";

  for (let tentativo = 0; tentativo < 5 && !squadraId; tentativo++) {
    const { data, error } = await client
      .from("universita_squadre")
      .insert({ codice: generateCodiceSquadraUniversita(), nome: (body.nome ?? "").trim() })
      .select("id")
      .maybeSingle();

    if (data) {
      squadraId = data.id as string;
      break;
    }
    ultimoErrore = error?.message ?? "";
    // Il nome e gia preso: ritentare cambierebbe solo il codice, e il codice
    // non e il problema.
    if (ultimoErrore.includes("universita_squadre_nome_key")) break;
  }

  if (!squadraId) {
    const amichevole = messaggioErroreDb(ultimoErrore);
    if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
    console.error("Universita squadra insert error:", ultimoErrore);
    return NextResponse.json({ error: "Non è stato possibile creare la squadra." }, { status: 500 });
  }

  // Chi crea la squadra ne e il capitano, e smette di cercarne una: la
  // bacheca descrive lo stato del momento, e il momento e cambiato.
  const { error: erroreMembro } = await client
    .from("universita_candidature")
    .update({ squadra_id: squadraId, squadra_ruolo: "capo", cerca_squadra: false })
    .eq("id", ctx.candidatura.id);

  if (erroreMembro) {
    // La squadra esisterebbe senza nessuno dentro, e terrebbe occupati il
    // nome e il codice per sempre.
    await client.from("universita_squadre").delete().eq("id", squadraId);
    const amichevole = messaggioErroreDb(erroreMembro.message);
    if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
    console.error("Universita squadra capo error:", erroreMembro);
    return NextResponse.json({ error: "Non è stato possibile creare la squadra." }, { status: 500 });
  }

  // Il progetto nasce vuoto insieme alla squadra. Una squadra senza la sua
  // riga di progetto e un vicolo cieco da cui la console non sa uscire: non
  // ha niente da aggiornare e non ha nessun motivo per crearla al posto tuo.
  const { error: erroreProgetto } = await client
    .from("universita_progetti")
    .insert({ squadra_id: squadraId });

  if (erroreProgetto) {
    await client
      .from("universita_candidature")
      .update({ squadra_id: null, squadra_ruolo: null })
      .eq("id", ctx.candidatura.id);
    await client.from("universita_squadre").delete().eq("id", squadraId);
    console.error("Universita progetto insert error:", erroreProgetto);
    return NextResponse.json(
      { error: "Non è stato possibile creare la squadra. Riprova." },
      { status: 500 },
    );
  }

  const stato = await statoDopoMutazione(client, ctx.candidatura.id, ctx.candidatura);
  return NextResponse.json({ success: true, ...stato });
}

/* ═══════════════════════════════════════════════════════════════════════
   PATCH . entra con il codice
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * La strada breve, per chi i compagni li ha gia: il capitano detta il
 * codice e si entra. Chi invece non conosce nessuno passa dalla bacheca e
 * dalla richiesta, che e l'altra rotta.
 */
export async function PATCH(request: Request) {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaSquadreAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  if (ctx.candidatura.squadra_id) {
    return NextResponse.json(
      { error: "Sei già in una squadra. Esci da questa prima di entrare in un'altra." },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { codice?: string };
  const errore = validateCodiceSquadra(body.codice);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  const codice = normalizzaCodiceSquadraUniversita(body.codice ?? "");

  const { data: squadra } = await client
    .from("universita_squadre")
    .select("id, nome, stato")
    .eq("codice", codice)
    .maybeSingle();

  if (!squadra) {
    return NextResponse.json(
      {
        error:
          "Codice non riconosciuto. Controlla di averlo copiato bene e fattelo ridettare da chi ha creato la squadra.",
      },
      { status: 404 },
    );
  }

  if (squadra.stato !== "aperta") {
    return NextResponse.json({ error: "Questa squadra non è più attiva." }, { status: 409 });
  }

  // Dopo la consegna l'elenco dei componenti e l'elenco degli autori di un
  // lavoro che la Commissione sta gia leggendo. Entrarci adesso significa
  // comparire fra gli autori di qualcosa che non si e scritto.
  const { data: progettoEsistente } = await client
    .from("universita_progetti")
    .select("stato")
    .eq("squadra_id", squadra.id)
    .maybeSingle();

  if (progettoEsistente?.stato === "consegnato") {
    return NextResponse.json(
      { error: "Questa squadra ha già consegnato il progetto, quindi non si può più entrare." },
      { status: 409 },
    );
  }

  // La capienza la impone il trigger, non questa riga: fra il conteggio e
  // la scrittura ci sta un'altra richiesta, e a database il conto si fa
  // sotto lock. Qui si traduce l'errore che ne esce.
  const { error } = await client
    .from("universita_candidature")
    .update({ squadra_id: squadra.id, squadra_ruolo: "membro", cerca_squadra: false })
    .eq("id", ctx.candidatura.id);

  if (error) {
    const amichevole = messaggioErroreDb(error.message);
    if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
    console.error("Universita squadra join error:", error);
    return NextResponse.json(
      { error: "Non è stato possibile entrare nella squadra." },
      { status: 500 },
    );
  }

  // Se per la stessa squadra c'era una richiesta in attesa, entrare con il
  // codice l'ha appena esaudita. Lasciarla aperta metterebbe il capitano
  // davanti a una decisione su una persona che ha gia dentro.
  await client
    .from("universita_richieste_squadra")
    .update({ stato: "accettata", deciso_at: new Date().toISOString() })
    .eq("candidatura_id", ctx.candidatura.id)
    .eq("squadra_id", squadra.id)
    .eq("stato", "in_attesa");

  const stato = await statoDopoMutazione(client, ctx.candidatura.id, ctx.candidatura);
  return NextResponse.json({ success: true, ...stato });
}

/* ═══════════════════════════════════════════════════════════════════════
   DELETE . esci dalla squadra
   ═══════════════════════════════════════════════════════════════════════ */

export async function DELETE() {
  const guard = await requireCandidato();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaSquadreAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const squadraId = ctx.candidatura.squadra_id;
  if (!squadraId) {
    return NextResponse.json({ error: "Non sei in nessuna squadra." }, { status: 400 });
  }

  // Simmetrico all'ingresso: a progetto consegnato l'elenco degli autori
  // non si tocca piu, ne per aggiungere ne per togliere.
  const { data: progetto } = await client
    .from("universita_progetti")
    .select("stato")
    .eq("squadra_id", squadraId)
    .maybeSingle();

  if (progetto?.stato === "consegnato") {
    return NextResponse.json(
      {
        error:
          "Il progetto è già stato consegnato e l'elenco degli autori non si tocca più. Se c'è un problema, scrivi a info@bioergotech.org.",
      },
      { status: 409 },
    );
  }

  const eraCapo = ctx.candidatura.squadra_ruolo === "capo";

  const { error } = await client
    .from("universita_candidature")
    .update({ squadra_id: null, squadra_ruolo: null })
    .eq("id", ctx.candidatura.id);

  if (error) {
    console.error("Universita squadra leave error:", error);
    return NextResponse.json(
      { error: "Non è stato possibile uscire dalla squadra." },
      { status: 500 },
    );
  }

  const { data: rimasti } = await client
    .from("universita_candidature")
    .select("id, squadra_ruolo, created_at")
    .eq("squadra_id", squadraId)
    .order("created_at", { ascending: true });

  if (!rimasti || rimasti.length === 0) {
    // Non si cancella la squadra: si dichiara sciolta. Il codice e il nome
    // restano occupati, e va bene cosi, perche restano occupate anche le
    // richieste e il progetto che le puntano, e una riga in meno qui
    // sarebbe una storia in meno da raccontare allo staff fra sei mesi.
    await client
      .from("universita_squadre")
      .update({ stato: "sciolta", cerca_membri: false })
      .eq("id", squadraId);
  } else if (
    eraCapo ||
    !rimasti.some((r: { squadra_ruolo: string | null }) => r.squadra_ruolo === "capo")
  ) {
    // La capitananza passa a chi e nel percorso da piu tempo. Una squadra
    // senza capitano non puo rispondere a nessuna richiesta, e una squadra
    // che non risponde e invisibile in bacheca anche se e in cerca.
    await client
      .from("universita_candidature")
      .update({ squadra_ruolo: "capo" })
      .eq("id", rimasti[0].id);
  }

  const stato = await statoDopoMutazione(client, ctx.candidatura.id, ctx.candidatura);
  return NextResponse.json({ success: true, ...stato });
}
