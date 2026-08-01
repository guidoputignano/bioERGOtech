import { NextResponse } from "next/server";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import {
  leggiConfigLicei,
  requireStudente,
  verificaSquadreAperte,
} from "@/lib/eventi/licei-server";
import {
  generateCodiceSquadra,
  normalizzaCodiceSquadra,
  validateCodiceSquadra,
  validateNomeSquadra,
} from "@/lib/eventi/licei-squadre";
import { SQUADRA_MAX } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/** Le colonne dei compagni di squadra. Niente email: fra loro si conoscono. */
const CAMPI_MEMBRO = "id, nome, cognome, classe, anno_corso, squadra_ruolo";

/**
 * Messaggi per gli errori che alza il database.
 *
 * Il tetto di cinque e il vincolo di istituto sono imposti da un trigger, non
 * solo dall'API: se arrivano di li vuol dire che due richieste si sono
 * incrociate, e lo studente merita comunque una frase leggibile invece di un
 * codice di Postgres.
 */
function messaggioErroreDb(messaggio: string): string | null {
  if (messaggio.includes("squadra_piena"))
    return `Questa squadra ha già ${SQUADRA_MAX} componenti, che è il massimo.`;
  if (messaggio.includes("squadra_altro_istituto"))
    return "Questa squadra è di un altro istituto. Una squadra riunisce studenti della stessa scuola.";
  if (messaggio.includes("licei_squadre_nome_per_istituto"))
    return "Nella vostra scuola c'è già una squadra con questo nome. Sceglietene un altro.";
  return null;
}

async function caricaSquadra(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  squadraId: string,
) {
  const [{ data: squadra }, { data: membri }, { data: progetto }] = await Promise.all([
    client.from("licei_squadre").select("*").eq("id", squadraId).maybeSingle(),
    client
      .from("licei_iscrizioni")
      .select(CAMPI_MEMBRO)
      .eq("squadra_id", squadraId)
      .order("squadra_ruolo", { ascending: true })
      .order("cognome", { ascending: true }),
    client.from("licei_progetti").select("*").eq("squadra_id", squadraId).maybeSingle(),
  ]);
  return { squadra: squadra ?? null, membri: membri ?? [], progetto: progetto ?? null };
}

/** La situazione dello studente: la sua iscrizione, la squadra, il progetto. */
export async function GET() {
  const guard = await requireStudente();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const config = await leggiConfigLicei();
  const base = {
    iscrizione: ctx.iscrizione,
    istituto: ctx.istituto,
    fasi: {
      squadre: config.stato_squadre,
      consegne: config.stato_consegne,
      scadenza_consegna: config.scadenza_consegna_label,
    },
  };

  if (!ctx.iscrizione.squadra_id) {
    return NextResponse.json({ ...base, squadra: null, membri: [], progetto: null });
  }

  const dati = await caricaSquadra(client, ctx.iscrizione.squadra_id);
  return NextResponse.json({ ...base, ...dati });
}

/** Crea una squadra. Chi la crea ne diventa il capitano. */
export async function POST(request: Request) {
  const guard = await requireStudente();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrente();
  const cancello = await verificaSquadreAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  if (ctx.iscrizione.squadra_id) {
    return NextResponse.json(
      { error: "Sei già in una squadra. Per crearne un'altra devi prima uscire da questa." },
      { status: 409 },
    );
  }

  const body = (await request.json()) as { nome?: string };
  const errore = validateNomeSquadra(body.nome);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  // Il codice e casuale e unico: al primo scontro se ne prova un altro invece
  // di rimbalzare lo studente, che non c'entra niente con la collisione.
  let squadraId: string | null = null;
  let ultimoErrore = "";

  for (let tentativo = 0; tentativo < 5 && !squadraId; tentativo++) {
    const { data, error } = await client
      .from("licei_squadre")
      .insert({
        adesione_id: ctx.iscrizione.adesione_id,
        codice: generateCodiceSquadra(),
        nome: (body.nome ?? "").trim(),
      })
      .select("id")
      .maybeSingle();

    if (data) {
      squadraId = data.id;
      break;
    }
    ultimoErrore = error?.message ?? "";
    // Nome gia usato nella scuola: riprovare non serve, cambia solo il codice.
    if (ultimoErrore.includes("licei_squadre_nome_per_istituto")) break;
  }

  if (!squadraId) {
    const amichevole = messaggioErroreDb(ultimoErrore);
    if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
    console.error("Licei squadra insert error:", ultimoErrore);
    return NextResponse.json({ error: "Non è stato possibile creare la squadra." }, { status: 500 });
  }

  const { error: erroreMembro } = await client
    .from("licei_iscrizioni")
    .update({ squadra_id: squadraId, squadra_ruolo: "capo" })
    .eq("id", ctx.iscrizione.id);

  if (erroreMembro) {
    // La squadra esiste ma e senza nessuno dentro: si toglie, altrimenti
    // occupa il nome e il codice per sempre.
    await client.from("licei_squadre").delete().eq("id", squadraId);
    console.error("Licei squadra capo error:", erroreMembro);
    return NextResponse.json({ error: "Non è stato possibile creare la squadra." }, { status: 500 });
  }

  // Il progetto nasce vuoto insieme alla squadra: cosi la schermata ha
  // sempre una bozza su cui scrivere, e non c'e un secondo momento in cui
  // qualcosa puo non essere stato creato.
  await client.from("licei_progetti").insert({
    squadra_id: squadraId,
    adesione_id: ctx.iscrizione.adesione_id,
  });

  const dati = await caricaSquadra(client, squadraId);
  return NextResponse.json({ success: true, ...dati });
}

/** Entra, esce, rinomina. */
export async function PATCH(request: Request) {
  const guard = await requireStudente();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrente();
  const cancello = await verificaSquadreAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json()) as {
    azione?: string;
    codice?: string;
    nome?: string;
  };

  /* ── Entra in una squadra esistente ── */
  if (body.azione === "entra") {
    if (ctx.iscrizione.squadra_id) {
      return NextResponse.json(
        { error: "Sei già in una squadra. Esci da questa prima di entrare in un'altra." },
        { status: 409 },
      );
    }

    const errore = validateCodiceSquadra(body.codice);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const codice = normalizzaCodiceSquadra(body.codice ?? "");

    // Il filtro su adesione_id e la difesa vera contro le squadre miste: il
    // codice di una squadra circola in classe come quello dell'istituto, e
    // prima o poi arriva a uno studente di un'altra scuola.
    const { data: squadra } = await client
      .from("licei_squadre")
      .select("id, nome, stato")
      .eq("codice", codice)
      .eq("adesione_id", ctx.iscrizione.adesione_id)
      .maybeSingle();

    if (!squadra) {
      return NextResponse.json(
        {
          error:
            "Codice non riconosciuto fra le squadre del tuo istituto. Controlla di averlo copiato bene: una squadra riunisce studenti della stessa scuola.",
        },
        { status: 404 },
      );
    }

    if (squadra.stato !== "aperta") {
      return NextResponse.json({ error: "Questa squadra non accetta più componenti." }, { status: 409 });
    }

    // Se il progetto e gia stato consegnato la squadra e chiusa di fatto:
    // entrare adesso significherebbe comparire fra gli autori di un lavoro
    // a cui non si e partecipato.
    const { data: progettoEsistente } = await client
      .from("licei_progetti")
      .select("stato")
      .eq("squadra_id", squadra.id)
      .maybeSingle();

    if (progettoEsistente?.stato === "consegnato") {
      return NextResponse.json(
        { error: "Questa squadra ha già consegnato il progetto, quindi non si può più entrare." },
        { status: 409 },
      );
    }

    const { error } = await client
      .from("licei_iscrizioni")
      .update({ squadra_id: squadra.id, squadra_ruolo: "membro" })
      .eq("id", ctx.iscrizione.id);

    if (error) {
      const amichevole = messaggioErroreDb(error.message);
      if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
      console.error("Licei squadra join error:", error);
      return NextResponse.json({ error: "Non è stato possibile entrare nella squadra." }, { status: 500 });
    }

    const dati = await caricaSquadra(client, squadra.id);
    return NextResponse.json({ success: true, ...dati });
  }

  /* ── Esci dalla squadra ── */
  if (body.azione === "esci") {
    const squadraId = ctx.iscrizione.squadra_id;
    if (!squadraId) {
      return NextResponse.json({ error: "Non sei in nessuna squadra." }, { status: 400 });
    }

    const { data: progetto } = await client
      .from("licei_progetti")
      .select("id, stato")
      .eq("squadra_id", squadraId)
      .maybeSingle();

    if (progetto?.stato === "consegnato") {
      return NextResponse.json(
        {
          error:
            "Il progetto è già stato consegnato e l'elenco degli autori non si tocca più. Se c'è un problema, parlane con il docente referente.",
        },
        { status: 409 },
      );
    }

    const { error } = await client
      .from("licei_iscrizioni")
      .update({ squadra_id: null, squadra_ruolo: null })
      .eq("id", ctx.iscrizione.id);

    if (error) {
      console.error("Licei squadra leave error:", error);
      return NextResponse.json({ error: "Non è stato possibile uscire dalla squadra." }, { status: 500 });
    }

    // Chi resta. Se non resta nessuno la squadra si scioglie, altrimenti la
    // capitananza passa al primo iscritto rimasto: una squadra senza
    // capitano non potrebbe piu rinominarsi ne consegnare.
    const { data: rimasti } = await client
      .from("licei_iscrizioni")
      .select("id, squadra_ruolo")
      .eq("squadra_id", squadraId)
      .order("created_at", { ascending: true });

    if (!rimasti || rimasti.length === 0) {
      if (progetto?.id) await client.from("licei_progetti").delete().eq("id", progetto.id);
      await client.from("licei_squadre").delete().eq("id", squadraId);
    } else if (!rimasti.some((r: { squadra_ruolo: string | null }) => r.squadra_ruolo === "capo")) {
      await client
        .from("licei_iscrizioni")
        .update({ squadra_ruolo: "capo" })
        .eq("id", rimasti[0].id);
    }

    return NextResponse.json({ success: true, squadra: null, membri: [], progetto: null });
  }

  /* ── Rinomina ── */
  if (body.azione === "rinomina") {
    if (!ctx.iscrizione.squadra_id) {
      return NextResponse.json({ error: "Non sei in nessuna squadra." }, { status: 400 });
    }
    if (ctx.iscrizione.squadra_ruolo !== "capo") {
      return NextResponse.json(
        { error: "Solo chi ha creato la squadra può cambiarne il nome." },
        { status: 403 },
      );
    }

    const errore = validateNomeSquadra(body.nome);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const { error } = await client
      .from("licei_squadre")
      .update({ nome: (body.nome ?? "").trim() })
      .eq("id", ctx.iscrizione.squadra_id)
      .eq("adesione_id", ctx.iscrizione.adesione_id);

    if (error) {
      const amichevole = messaggioErroreDb(error.message);
      if (amichevole) return NextResponse.json({ error: amichevole }, { status: 409 });
      console.error("Licei squadra rename error:", error);
      return NextResponse.json({ error: "Non è stato possibile rinominare la squadra." }, { status: 500 });
    }

    const dati = await caricaSquadra(client, ctx.iscrizione.squadra_id);
    return NextResponse.json({ success: true, ...dati });
  }

  return NextResponse.json({ error: "Azione non prevista." }, { status: 400 });
}
