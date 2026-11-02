import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/admin";
import {
  STATI_ADESIONE,
  STATI_ADESIONE_CHE_ACCETTANO,
  STATI_ISCRIZIONE_ATTIVI,
  haFattoAccesso,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  adesioneConfermataEmailHtml,
  adesioneConfermataEmailSubject,
  avvisoRiflessioniEmailHtml,
  avvisoRiflessioniEmailSubject,
  avvisoSquadreEmailHtml,
  avvisoSquadreEmailSubject,
} from "@/lib/eventi/licei-email";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";
import { docentiPerIstituto } from "@/lib/eventi/licei-docenti";
import {
  CHIAVE_AVVISO_RIFLESSIONI,
  CHIAVE_AVVISO_SQUADRE,
  CHIAVE_ESITO_AVVISO_RIFLESSIONI,
  CHIAVE_ESITO_AVVISO_SQUADRE,
  erroreSchemaMancante,
  leggiChiusuraPercorso,
  statoColonnaRiflessioni,
  type StatoAvvisoRiflessioni,
  type StatoAvvisoSquadre,
} from "@/lib/eventi/licei-server";
import {
  MITTENTE_AVVISI,
  RISPOSTE_AVVISI,
  destinatariUnici,
  giaInviato,
  inviaAvvisoUnaVolta,
  righeDocentiAvviso,
  statoAvviso,
  type Destinatario,
  type RisultatoAvviso,
} from "@/lib/eventi/licei-avvisi";

const STATI_VALIDI = new Set<string>(STATI_ADESIONE.map((s) => s.value));

// Gli avvisi una tantum partono a qualche centinaio di persone, a blocchi e
// con una pausa fra un blocco e l'altro: il tempo di default non
// basterebbe.
export const maxDuration = 300;

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

  // `licei_stats` conta le PREVISIONI dichiarate all'adesione.
  // `licei_iscrizioni_stats` conta gli studenti veri. Servono entrambe, e
  // affiancate: lo scarto fra quanti una scuola diceva di portarne e quanti
  // ne ha portati e la sola misura che dice se il percorso sta funzionando
  // in quell'istituto, e finora non era visibile da nessuna parte.
  const [{ data: stats }, { data: iscrizioniStats }, { data: config }] = await Promise.all([
    client.rpc("licei_stats"),
    client.rpc("licei_iscrizioni_stats"),
    client.from("licei_config").select("chiave, valore"),
  ]);

  // Accessi e progresso, aggregati per istituto.
  //
  // "Mai entrato" si calcola qui e non in SQL perche dipende da due segnali
  // che stanno in due posti: la data di accesso in `auth.users`, che una
  // funzione puo leggere, e le lezioni consegnate in `lesson_submissions`,
  // che una funzione non puo leggere senza far fallire le migrazioni su un
  // ambiente nuovo. Questo e l'unico punto in cui i due si incontrano.
  const [{ data: studenti }, { data: accessi }] = await Promise.all([
    client.from("licei_iscrizioni").select("id, adesione_id, user_id, stato"),
    client.rpc("licei_accessi_tutti"),
  ]);

  const righeStudenti = (studenti ?? []) as {
    id: string;
    adesione_id: string;
    user_id: string | null;
    stato: string;
  }[];

  const accessoPerIscrizione = new Map<string, string | null>(
    ((accessi ?? []) as { iscrizione_id: string; ultimo_accesso: string | null }[]).map((a) => [
      a.iscrizione_id,
      a.ultimo_accesso,
    ]),
  );

  // I docenti del progetto, per istituto, con lo stato: lo staff li vede
  // sotto il referente e li puo revocare. Null prima della migrazione; un
  // errore di lettura non fa cadere il pannello, lo dice.
  // E se la colonna delle riflessioni condivise c'e: l'avviso agli
  // studenti non parte prima della migrazione.
  // E a quanti docenti partirebbe l'avviso sulle squadre.
  const [progresso, docenti, colonnaRiflessioni, docentiAvviso] = await Promise.all([
    progressoPerUtenti(
      client,
      righeStudenti.map((r) => r.user_id).filter((id): id is string => !!id),
    ),
    docentiPerIstituto(client).catch((err) => {
      console.error("Licei admin: docenti del progetto non letti:", err);
      return undefined;
    }),
    statoColonnaRiflessioni(client),
    righeDocentiAvviso(client)
      .then((righe) => destinatariUnici(righe, null).destinatari.length)
      .catch((err) => {
        console.error("Licei admin: destinatari dell'avviso ai docenti non letti:", err);
        return null;
      }),
  ]);

  const progressoPerIstituto: Record<
    string,
    { confermati: number; lezioni_totali: number; fermi_a_zero: number; mai_entrati: number }
  > = {};

  for (const r of righeStudenti) {
    // Un ritirato o un non riconosciuto non e un problema da risolvere, e in
    // mezzo agli altri sarebbe rumore.
    if (!STATI_ISCRIZIONE_ATTIVI.has(r.stato)) continue;

    const acc = (progressoPerIstituto[r.adesione_id] ??= {
      confermati: 0,
      lezioni_totali: 0,
      fermi_a_zero: 0,
      mai_entrati: 0,
    });

    const lezioni = r.user_id ? (progresso.get(r.user_id) ?? 0) : 0;
    const ultimo = accessoPerIscrizione.get(r.id) ?? null;

    if (!haFattoAccesso({ ultimo_accesso: ultimo, lezioni_completate: lezioni })) {
      acc.mai_entrati += 1;
    }

    // La media sul corso guarda i soli confermati: e di loro che la scuola
    // risponde, e un'iscrizione ancora da riconoscere non dice niente sul
    // percorso.
    if (r.stato === "confermata") {
      acc.confermati += 1;
      acc.lezioni_totali += lezioni;
      if (lezioni === 0) acc.fermi_a_zero += 1;
    }
  }

  const righeConfig = (config ?? []) as { chiave: string; valore: string | null }[];

  return NextResponse.json({
    adesioni: data ?? [],
    stats: stats ?? [],
    iscrizioni_stats: iscrizioniStats ?? [],
    progresso: progressoPerIstituto,
    totale_lezioni: TOTALE_LEZIONI,
    config: config ?? [],
    // `disponibile`: la tabella c'e ed e stata letta. `errore`: c'e, ma la
    // lettura e fallita, e il pannello lo dice invece di "nessuno indicato".
    docenti: {
      disponibile: docenti !== null && docenti !== undefined,
      errore: docenti === undefined,
      per_adesione: docenti ?? {},
    },
    avviso_riflessioni: {
      ...statoAvviso(righeConfig, CHIAVE_AVVISO_RIFLESSIONI, CHIAVE_ESITO_AVVISO_RIFLESSIONI),
      colonna: colonnaRiflessioni,
      iscritti: righeStudenti.filter((r) => STATI_ISCRIZIONE_ATTIVI.has(r.stato)).length,
    } satisfies StatoAvvisoRiflessioni,
    avviso_squadre: {
      ...statoAvviso(righeConfig, CHIAVE_AVVISO_SQUADRE, CHIAVE_ESITO_AVVISO_SQUADRE),
      docenti: docentiAvviso,
    } satisfies StatoAvvisoSquadre,
  });
}

/* ── Avvisi una tantum ─────────────────────────────────────────────── */

type Client = NonNullable<Awaited<ReturnType<typeof requireAdmin>>["client"]>;

/**
 * I controlli comuni prima di un avviso: percorso aperto, invio email
 * configurato, avviso non ancora partito. Null se si puo procedere.
 */
async function primaDiUnAvviso(client: Client, chiave: string): Promise<NextResponse | null> {
  const chiusura = await leggiChiusuraPercorso(client);
  if (chiusura.chiusoAt) {
    return NextResponse.json({ error: "Il percorso è chiuso: l'avviso non serve più." }, { status: 409 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Invio email non configurato: manca RESEND_API_KEY." }, { status: 503 });
  }
  let inviatoAt: string | null;
  try {
    inviatoAt = await giaInviato(client, chiave);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  if (inviatoAt) {
    return NextResponse.json({ error: "L'avviso è già stato inviato.", inviato_at: inviatoAt }, { status: 409 });
  }
  return null;
}

/** La risposta al pannello per l'esito di `inviaAvvisoUnaVolta`. */
function rispostaAvviso(r: RisultatoAvviso): NextResponse {
  switch (r.stato) {
    case "gia_inviato":
      return NextResponse.json({ error: "L'avviso è già stato inviato." }, { status: 409 });
    case "prenotazione_fallita":
      return NextResponse.json(
        { error: "Non è stato possibile registrare l'invio. Riprova fra poco." },
        { status: 500 },
      );
    case "nessuna_partita":
      return NextResponse.json(
        { error: "Nessuna email è partita. Controlla i log e riprova.", ...r.esito },
        { status: 502 },
      );
    case "inviato":
      return NextResponse.json({ success: true, inviato_at: r.inviato_at, ...r.esito });
  }
}

/**
 * L'avviso agli studenti sulle riflessioni, una volta sola.
 *
 * In ordine: i controlli comuni, la colonna presente (l'avviso annuncia una
 * funzione che senza la migrazione non c'e), almeno un destinatario. Poi
 * prenotazione e invio, in `inviaAvvisoUnaVolta`.
 */
async function inviaAvvisoRiflessioni(client: Client, autore: string) {
  const blocco = await primaDiUnAvviso(client, CHIAVE_AVVISO_RIFLESSIONI);
  if (blocco) return blocco;

  const colonna = await statoColonnaRiflessioni(client);
  if (colonna === "assente") {
    return NextResponse.json(
      {
        error:
          "Manca la colonna condivisa_referente_at: applica prima la migrazione 20261215000000. Senza, l'avviso annuncerebbe una funzione non ancora attiva.",
        colonna,
      },
      { status: 409 },
    );
  }
  if (colonna === "errore") {
    return NextResponse.json(
      { error: "Non è stato possibile verificare la migrazione. Riprova fra poco." },
      { status: 500 },
    );
  }

  // I destinatari: confermati e in attesa, di tutti gli istituti, a pagine
  // (PostgREST tronca oltre il suo tetto senza dirlo).
  const PAGINA = 1000;
  const righe: Destinatario[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("licei_iscrizioni")
      .select("id, nome, email")
      .in("stato", [...STATI_ISCRIZIONE_ATTIVI])
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const pagina = (data ?? []) as { id: string; nome: string | null; email: string | null }[];
    righe.push(...pagina.map((r) => ({ rif: `iscrizione ${r.id}`, nome: r.nome ?? "", email: r.email ?? "" })));
    if (pagina.length < PAGINA) break;
  }

  const { destinatari, scartate } = destinatariUnici(righe, "avviso riflessioni");
  if (destinatari.length === 0) {
    return NextResponse.json({ error: "Nessuno studente iscritto a cui inviarlo." }, { status: 409 });
  }

  return rispostaAvviso(
    await inviaAvvisoUnaVolta(client, new Resend(process.env.RESEND_API_KEY), {
      chiave: CHIAVE_AVVISO_RIFLESSIONI,
      chiaveEsito: CHIAVE_ESITO_AVVISO_RIFLESSIONI,
      autore,
      etichetta: "avviso-riflessioni",
      destinatari,
      scartate,
      subject: avvisoRiflessioniEmailSubject(),
      html: (d) => avvisoRiflessioniEmailHtml({ nome: d.nome }),
    }),
  );
}

/**
 * L'avviso ai docenti sulle squadre, una volta sola: referenti delle
 * adesioni confermate e docenti del progetto (`righeDocentiAvviso`), un
 * indirizzo per persona. Le risposte arrivano a info@.
 */
async function inviaAvvisoSquadre(client: Client, autore: string) {
  const blocco = await primaDiUnAvviso(client, CHIAVE_AVVISO_SQUADRE);
  if (blocco) return blocco;

  let righe: Destinatario[];
  try {
    righe = await righeDocentiAvviso(client);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  const { destinatari, scartate } = destinatariUnici(righe, "avviso squadre");
  if (destinatari.length === 0) {
    return NextResponse.json({ error: "Nessun docente a cui inviarlo." }, { status: 409 });
  }

  return rispostaAvviso(
    await inviaAvvisoUnaVolta(client, new Resend(process.env.RESEND_API_KEY), {
      chiave: CHIAVE_AVVISO_SQUADRE,
      chiaveEsito: CHIAVE_ESITO_AVVISO_SQUADRE,
      autore,
      etichetta: "avviso-squadre",
      destinatari,
      scartate,
      subject: avvisoSquadreEmailSubject(),
      html: (d) => avvisoSquadreEmailHtml({ nome: d.nome }),
    }),
  );
}

/**
 * Una copia di prova dell'avviso ai docenti, solo a chi preme il bottone:
 * per vedere l'email vera prima di mandarla a tutti. Non prenota niente e
 * si puo ripetere.
 */
async function provaAvvisoSquadre(email: string | null) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Invio email non configurato: manca RESEND_API_KEY." }, { status: 503 });
  }
  if (!email) return NextResponse.json({ error: "Il tuo account non ha un'email." }, { status: 400 });
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: MITTENTE_AVVISI,
      to: email,
      replyTo: RISPOSTE_AVVISI,
      subject: `[Prova] ${avvisoSquadreEmailSubject()}`,
      html: avvisoSquadreEmailHtml({ nome: "" }),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("Licei avviso squadre: prova non inviata:", err);
    return NextResponse.json({ error: "La prova non è partita. Riprova fra poco." }, { status: 502 });
  }
  return NextResponse.json({ success: true, email });
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

  // Lo stato di partenza, letto prima di scrivere. Serve solo a distinguere una
  // transizione da un salvataggio qualsiasi: senza, una nota interna aggiunta a
  // un'adesione gia confermata rimanderebbe l'email ogni volta.
  let statoPrecedente: string | null = null;
  if (patch.stato !== undefined) {
    const { data: prima } = await client
      .from("licei_adesioni")
      .select("stato")
      .eq("id", body.id)
      .maybeSingle();
    statoPrecedente = prima?.stato ?? null;
  }

  const { data, error } = await client
    .from("licei_adesioni")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Avviso al referente, solo sulla transizione verso uno stato che accetta
  // iscrizioni. L'email di adesione gli promette alla lettera che gli
  // scriviamo alla conferma, e la sua console gli dice di aspettarla prima di
  // diffondere il codice: finora quella promessa era scoperta.
  const entraInAccettazione =
    statoPrecedente !== null &&
    !STATI_ADESIONE_CHE_ACCETTANO.has(statoPrecedente) &&
    typeof patch.stato === "string" &&
    STATI_ADESIONE_CHE_ACCETTANO.has(patch.stato);

  if (entraInAccettazione && process.env.RESEND_API_KEY && data?.referente_email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: data.referente_email,
        subject: adesioneConfermataEmailSubject(),
        html: adesioneConfermataEmailHtml({
          referente: `${data.referente_nome ?? ""} ${data.referente_cognome ?? ""}`.trim(),
          istituto: data.istituto_denominazione ?? "",
          codice: data.codice ?? "",
          attiva: patch.stato === "attiva",
        }),
      });
    } catch (mailErr) {
      // Lo stato e gia salvato: un problema di invio non deve far fallire
      // l'istruttoria dello staff.
      console.error("Licei conferma adesione email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, adesione: data });
}

/**
 * Azioni dello staff che non sono l'istruttoria di un'adesione.
 *
 * - `revoca_docente` `{ id }`: revoca un docente del progetto, per esempio
 *   quando l'istituto scrive che non e corretto. Ha effetto alla richiesta
 *   successiva del docente, come quella fatta dal referente. La riga
 *   resta, come registro.
 * - `avviso_riflessioni`: l'email una tantum agli studenti iscritti, che
 *   da ora i docenti dell'istituto leggono riflessioni e domande. Parte una
 *   volta sola, e solo dopo la migrazione 20261215000000.
 * - `avviso_squadre`: l'email una tantum ai docenti, che le squadre vanno
 *   da 1 a 6 e che ci scrivano se qualcosa non va. Parte una volta sola.
 * - `avviso_squadre_prova`: la stessa email, solo a chi la chiede.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const body = (await request.json().catch(() => ({}))) as { azione?: unknown; id?: unknown };

  if (body.azione === "avviso_riflessioni") return inviaAvvisoRiflessioni(client, chiamante.id);
  if (body.azione === "avviso_squadre") return inviaAvvisoSquadre(client, chiamante.id);
  if (body.azione === "avviso_squadre_prova") return provaAvvisoSquadre(chiamante.email);

  if (body.azione !== "revoca_docente") {
    return NextResponse.json({ error: "Azione non riconosciuta." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Docente non indicato." }, { status: 400 });

  const { data, error } = await client
    .from("licei_docenti")
    .update({ stato: "revocato", revocato_at: new Date().toISOString(), revocato_da: chiamante.id })
    .eq("id", id)
    .neq("stato", "revocato")
    .select("id")
    .maybeSingle();

  if (erroreSchemaMancante(error, "tabella")) {
    return NextResponse.json(
      { error: "La tabella dei docenti del progetto non esiste ancora: applica la migrazione 20261215000000." },
      { status: 503 },
    );
  }
  if (error) {
    if (error.code === "22P02") return NextResponse.json({ error: "Docente non trovato." }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    // Nessuna riga toccata: o non esiste, o era gia revocato.
    const { data: esiste } = await client.from("licei_docenti").select("id").eq("id", id).maybeSingle();
    if (!esiste) return NextResponse.json({ error: "Docente non trovato." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
