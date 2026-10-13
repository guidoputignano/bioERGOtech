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
} from "@/lib/eventi/licei-email";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";
import { docentiPerIstituto } from "@/lib/eventi/licei-docenti";
import {
  CHIAVE_AVVISO_RIFLESSIONI,
  CHIAVE_ESITO_AVVISO_RIFLESSIONI,
  erroreSchemaMancante,
  leggiChiusuraPercorso,
  statoColonnaRiflessioni,
  type EsitoAvvisoRiflessioni,
  type StatoAvvisoRiflessioni,
} from "@/lib/eventi/licei-server";

const STATI_VALIDI = new Set<string>(STATI_ADESIONE.map((s) => s.value));

// L'avviso sulle riflessioni parte a qualche centinaio di studenti, a
// blocchi e con una pausa fra un blocco e l'altro: il tempo di default non
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
  const [progresso, docenti, colonnaRiflessioni] = await Promise.all([
    progressoPerUtenti(
      client,
      righeStudenti.map((r) => r.user_id).filter((id): id is string => !!id),
    ),
    docentiPerIstituto(client).catch((err) => {
      console.error("Licei admin: docenti del progetto non letti:", err);
      return undefined;
    }),
    statoColonnaRiflessioni(client),
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
    avviso_riflessioni: statoAvvisoRiflessioni(
      (config ?? []) as { chiave: string; valore: string | null }[],
      colonnaRiflessioni,
      righeStudenti.filter((r) => STATI_ISCRIZIONE_ATTIVI.has(r.stato)).length,
    ),
  });
}

/* ── Avviso agli studenti sulle riflessioni ──────────────────────────── */

function statoAvvisoRiflessioni(
  config: { chiave: string; valore: string | null }[],
  colonna: StatoAvvisoRiflessioni["colonna"],
  iscritti: number,
): StatoAvvisoRiflessioni {
  const valore = (chiave: string) => (config.find((c) => c.chiave === chiave)?.valore ?? "").trim();
  let esito: EsitoAvvisoRiflessioni | null = null;
  const grezzo = valore(CHIAVE_ESITO_AVVISO_RIFLESSIONI);
  if (grezzo) {
    try {
      esito = JSON.parse(grezzo) as EsitoAvvisoRiflessioni;
    } catch {
      esito = null;
    }
  }
  return { inviato_at: valore(CHIAVE_AVVISO_RIFLESSIONI) || null, esito, colonna, iscritti };
}

/** Quanti indirizzi per chiamata all'API di invio a blocchi di Resend. */
const AVVISO_BLOCCO = 50;
/** Pausa fra un blocco e il successivo, sotto il limite di richieste al secondo. */
const AVVISO_PAUSA_MS = 600;
const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Prenota l'invio scrivendo la chiave con la data, PRIMA di mandare
 * qualsiasi email. Due clic, o due persone dello staff nello stesso
 * momento, arrivano qui insieme: la chiave primaria di `licei_config` fa
 * passare solo il primo. Una chiave gia presente ma vuota (svuotata a mano
 * dal database) si prenota solo se e ancora vuota, con lo stesso effetto.
 */
async function prenotaAvviso(
  client: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["client"]>,
  adesso: string,
  autore: string,
): Promise<"prenotato" | "gia_inviato"> {
  const riga = { chiave: CHIAVE_AVVISO_RIFLESSIONI, valore: adesso, aggiornato_at: adesso, aggiornato_by: autore };
  const { error } = await client.from("licei_config").insert(riga);
  if (!error) return "prenotato";
  if (error.code !== "23505") throw new Error(`licei_config: ${error.message}`);

  for (const vuota of ["", null] as const) {
    const base = client.from("licei_config").update(riga).eq("chiave", CHIAVE_AVVISO_RIFLESSIONI);
    const { data, error: erroreVuota } = await (vuota === null
      ? base.is("valore", null)
      : base.eq("valore", vuota)
    ).select("chiave");
    if (erroreVuota) throw new Error(`licei_config: ${erroreVuota.message}`);
    if ((data ?? []).length > 0) return "prenotato";
  }
  return "gia_inviato";
}

/**
 * Invia l'avviso, una volta sola.
 *
 * In ordine: percorso aperto, invio email configurato, colonna presente
 * (l'avviso annuncia una funzione che senza la migrazione non c'e), avviso
 * non ancora inviato, almeno un destinatario. Poi la prenotazione e l'invio
 * a blocchi. Un indirizzo che non parte si registra nei log con l'id
 * dell'iscrizione, non con l'email; i conteggi tornano al pannello e
 * restano in `licei_config`, in soli numeri. Se non parte nessuna email, la
 * prenotazione si toglie e si puo riprovare.
 */
async function inviaAvvisoRiflessioni(
  client: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["client"]>,
  autore: string,
) {
  const chiusura = await leggiChiusuraPercorso(client);
  if (chiusura.chiusoAt) {
    return NextResponse.json({ error: "Il percorso è chiuso: l'avviso non serve più." }, { status: 409 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Invio email non configurato: manca RESEND_API_KEY." }, { status: 503 });
  }

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

  const { data: gia, error: erroreGia } = await client
    .from("licei_config")
    .select("valore")
    .eq("chiave", CHIAVE_AVVISO_RIFLESSIONI)
    .maybeSingle();
  if (erroreGia) return NextResponse.json({ error: erroreGia.message }, { status: 500 });
  if ((gia?.valore ?? "").trim()) {
    return NextResponse.json(
      { error: "L'avviso è già stato inviato.", inviato_at: gia?.valore ?? null },
      { status: 409 },
    );
  }

  // I destinatari: confermati e in attesa, di tutti gli istituti, a pagine
  // (PostgREST tronca oltre il suo tetto senza dirlo). Un indirizzo per
  // persona: chi risultasse iscritto due volte riceve un'email sola.
  const PAGINA = 1000;
  const righe: { id: string; nome: string | null; email: string | null }[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("licei_iscrizioni")
      .select("id, nome, email")
      .in("stato", [...STATI_ISCRIZIONE_ATTIVI])
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    righe.push(...((data ?? []) as typeof righe));
    if ((data ?? []).length < PAGINA) break;
  }

  const visti = new Set<string>();
  const destinatari: { id: string; nome: string; email: string }[] = [];
  let scartate = 0;
  for (const r of righe) {
    const email = (r.email ?? "").trim();
    const chiave = email.toLowerCase();
    if (!EMAIL_VALIDA.test(email)) {
      scartate += 1;
      console.error(`Licei avviso riflessioni: iscrizione ${r.id}: indirizzo non valido, non inviato.`);
      continue;
    }
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    destinatari.push({ id: r.id, nome: r.nome ?? "", email });
  }
  if (destinatari.length === 0) {
    return NextResponse.json({ error: "Nessuno studente iscritto a cui inviarlo." }, { status: 409 });
  }

  const adesso = new Date().toISOString();
  try {
    if ((await prenotaAvviso(client, adesso, autore)) === "gia_inviato") {
      return NextResponse.json({ error: "L'avviso è già stato inviato." }, { status: 409 });
    }
  } catch (err) {
    console.error("Licei avviso riflessioni: prenotazione non riuscita:", err);
    return NextResponse.json({ error: "Non è stato possibile registrare l'invio. Riprova fra poco." }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = avvisoRiflessioniEmailSubject();
  let inviate = 0;
  let fallite = scartate;

  for (let i = 0; i < destinatari.length; i += AVVISO_BLOCCO) {
    const blocco = destinatari.slice(i, i + AVVISO_BLOCCO);
    if (i > 0) await pausa(AVVISO_PAUSA_MS);
    const messaggi = blocco.map((d) => ({
      from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
      to: d.email,
      replyTo: "info@bioergotech.org",
      subject,
      html: avvisoRiflessioniEmailHtml({ nome: d.nome }),
    }));
    // La chiave di idempotenza e legata a questa prenotazione e a questo
    // blocco: se la rete cade dopo che Resend ha accettato, il secondo
    // tentativo non manda una seconda copia.
    const opzioni = {
      batchValidation: "permissive" as const,
      idempotencyKey: `licei-avviso-riflessioni-${adesso}-${i / AVVISO_BLOCCO}`,
    };

    let esito: Awaited<ReturnType<typeof resend.batch.send<typeof opzioni>>> | null = null;
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      try {
        esito = await resend.batch.send(messaggi, opzioni);
      } catch (err) {
        esito = {
          data: null,
          error: { message: err instanceof Error ? err.message : String(err), statusCode: null, name: "application_error" },
          headers: null,
        } as typeof esito;
      }
      // Si riprova una volta sola, e solo per un rifiuto passeggero.
      const codice = esito?.error?.statusCode ?? null;
      if (!esito?.error || (codice !== null && codice !== 429 && codice < 500) || tentativo > 0) break;
      await pausa(1500);
    }

    if (!esito || esito.error) {
      fallite += blocco.length;
      for (const d of blocco) {
        console.error(
          `Licei avviso riflessioni: iscrizione ${d.id}: non inviato (${esito?.error?.message ?? "errore sconosciuto"}).`,
        );
      }
      continue;
    }
    const errori = esito.data?.errors ?? [];
    for (const e of errori) {
      const d = blocco[e.index];
      console.error(`Licei avviso riflessioni: iscrizione ${d?.id ?? "?"}: non inviato (${e.message}).`);
    }
    fallite += errori.length;
    inviate += blocco.length - errori.length;
  }

  const esito: EsitoAvvisoRiflessioni = { destinatari: destinatari.length + scartate, inviate, fallite };

  if (inviate === 0) {
    // Non e partito niente: la prenotazione si toglie, cosi lo staff puo
    // riprovare quando il problema e risolto. Solo la propria: il filtro
    // sulla data non tocca un invio partito nel frattempo.
    const { error } = await client
      .from("licei_config")
      .delete()
      .eq("chiave", CHIAVE_AVVISO_RIFLESSIONI)
      .eq("valore", adesso);
    if (error) console.error("Licei avviso riflessioni: prenotazione non tolta:", error.message);
    return NextResponse.json(
      { error: "Nessuna email è partita. Controlla i log e riprova.", ...esito },
      { status: 502 },
    );
  }

  const { error: erroreEsito } = await client.from("licei_config").upsert(
    {
      chiave: CHIAVE_ESITO_AVVISO_RIFLESSIONI,
      valore: JSON.stringify(esito),
      aggiornato_at: new Date().toISOString(),
      aggiornato_by: autore,
    },
    { onConflict: "chiave" },
  );
  if (erroreEsito) console.error("Licei avviso riflessioni: esito non registrato:", erroreEsito.message);

  return NextResponse.json({ success: true, inviato_at: adesso, ...esito });
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
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const body = (await request.json().catch(() => ({}))) as { azione?: unknown; id?: unknown };

  if (body.azione === "avviso_riflessioni") return inviaAvvisoRiflessioni(client, chiamante.id);

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
