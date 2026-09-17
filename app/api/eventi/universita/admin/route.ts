/**
 * Il pannello staff del percorso universitario: una lettura sola e due atti.
 *
 * La GET torna tutto quello che il pannello mostra, e non e una comodita.
 * Candidature, squadre, progetti e classifica sono la stessa schermata, e
 * quattro chiamate separate darebbero quattro momenti in cui il pannello e a
 * meta e nessuno sa quale pezzo sia arrivato. Con una sola, o c'e tutto o
 * c'e l'errore.
 *
 * I due atti sono quelli che nessun altro puo compiere. Il primo e cambiare
 * lo stato di una candidatura, che qui prende il posto della conferma del
 * docente referente dei licei: senza referente, il punto in cui qualcuno
 * guarda quella riga e questo. Il secondo e rimandare il link di accesso,
 * che sta piu in basso e ha il suo perche scritto sopra la POST.
 *
 * Il client ha la service role, quindi qui dentro la RLS non difende niente.
 * La differenza con le rotte del candidato e che li l'id lo dimostra la
 * guardia, qui arriva dalla richiesta: lo staff agisce legittimamente su
 * righe che non sono sue, ed e esattamente quello che `getEventAdminClient`
 * ha appena finito di dimostrare.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { utenteCorrenteUniversita } from "@/lib/eventi/universita-server";
import { messaggioErroreDb } from "@/lib/eventi/universita-squadre";
import {
  universitaAccessoEmailHtml,
  universitaAccessoEmailSubject,
  universitaConfermaEmailHtml,
  universitaConfermaEmailSubject,
} from "@/lib/eventi/universita-email";
import {
  SITE_URL,
  STATI_CANDIDATURA,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";

const STATI_VALIDI = new Set<string>(STATI_CANDIDATURA.map((s) => s.value));

/* ── Le righe che questa rotta legge ──────────────────────────────────── */

type RigaCandidatura = {
  id: string;
  codice: string;
  stato: string;
  nome: string;
  cognome: string;
  email: string;
  universita: string;
  corso_studi: string;
  livello: string;
  area: string;
  area_altro: string | null;
  interessi: string | null;
  user_id: string | null;
  squadra_id: string | null;
  squadra_ruolo: string | null;
  cerca_squadra: boolean;
  consenso_board: boolean;
  board_nota: string | null;
  note_staff: string | null;
  stato_aggiornato_at: string | null;
  created_at: string;
};

const CAMPI_CANDIDATURA =
  "id, codice, stato, nome, cognome, email, universita, corso_studi, livello, area, area_altro, interessi, user_id, squadra_id, squadra_ruolo, cerca_squadra, consenso_board, board_nota, note_staff, stato_aggiornato_at, created_at";

type RigaSquadra = {
  id: string;
  codice: string;
  nome: string;
  stato: string;
  cerca_membri: boolean;
  cerca_nota: string | null;
  created_at: string;
};

const CAMPI_SQUADRA = "id, codice, nome, stato, cerca_membri, cerca_nota, created_at";

type RigaProgetto = {
  id: string;
  squadra_id: string;
  titolo: string;
  ambito: string | null;
  stato: string;
  consegnato_at: string | null;
  vincitore: boolean;
  posizione: number | null;
  link_materiali: string | null;
  note_staff: string | null;
  updated_at: string;
};

const CAMPI_PROGETTO =
  "id, squadra_id, titolo, ambito, stato, consegnato_at, vincitore, posizione, link_materiali, note_staff, updated_at";

/** Quello che si ricava dalle candidature di una squadra, in un passaggio solo. */
type DatiSquadra = {
  componenti: number;
  /** Chiave in minuscolo, valore com'e scritto: serve a contare senza sfigurare. */
  atenei: Map<string, string>;
  capitano: string | null;
};

/**
 * Tutto il quadro del percorso, in una chiamata.
 *
 * Fallisce solo se non si leggono le candidature, che sono il percorso. Le
 * altre quattro letture si perdonano e restano a mano vuota: una RPC che
 * non risponde perche la migrazione non e ancora passata renderebbe
 * altrimenti inutilizzabile un pannello che, senza classifica e senza
 * contatori, e comunque il posto da cui si confermano le candidature.
 */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const [candidatureRes, squadreRes, progettiRes, statsRes, classificaRes] = await Promise.all([
    client
      .from("universita_candidature")
      .select(CAMPI_CANDIDATURA)
      .order("created_at", { ascending: false }),
    client
      .from("universita_squadre")
      .select(CAMPI_SQUADRA)
      .order("created_at", { ascending: false }),
    client.from("universita_progetti").select(CAMPI_PROGETTO),
    client.rpc("universita_stats"),
    client.rpc("universita_classifica"),
  ]);

  if (candidatureRes.error) {
    console.error("Universita admin: lettura candidature fallita:", candidatureRes.error);
    return NextResponse.json(
      { error: "Non è stato possibile leggere le candidature." },
      { status: 500 },
    );
  }

  // Le letture non fatali finiscono comunque nei log: un pannello a cui
  // manca meta schermata senza che da nessuna parte risulti un errore e il
  // modo piu sicuro di far credere allo staff che le squadre siano zero.
  for (const [nome, res] of [
    ["squadre", squadreRes],
    ["progetti", progettiRes],
    ["universita_stats", statsRes],
    ["universita_classifica", classificaRes],
  ] as const) {
    if (res.error) console.error(`Universita admin: lettura ${nome} fallita:`, res.error);
  }

  const candidature = (candidatureRes.data ?? []) as RigaCandidatura[];
  const squadre = (squadreRes.data ?? []) as RigaSquadra[];
  const progetti = (progettiRes.data ?? []) as RigaProgetto[];

  /**
   * Le lezioni consegnate, con lo stesso helper del pannello licei.
   *
   * `progressoPerUtenti` sta in `licei-progresso` per ragioni di anagrafe,
   * non di dominio: conta le righe di `lesson_submissions`, che e la
   * tabella del corso e non dei licei, e il corso e lo stesso per tutti.
   * Riscriverne una copia qui dentro darebbe due conteggi della stessa cosa
   * destinati a divergere.
   *
   * Degrada da sola se `lesson_submissions` non c'e: torna una mappa vuota
   * e il pannello mostra zero. E' un dato accessorio, e farlo cadere sopra
   * le candidature sarebbe sproporzionato.
   */
  const progresso = await progressoPerUtenti(
    client,
    candidature.map((c) => c.user_id).filter((id): id is string => !!id),
  );

  const nomeSquadra = new Map(squadre.map((s) => [s.id, s.nome]));
  const progettoPerSquadra = new Map(progetti.map((p) => [p.squadra_id, p]));

  // Componenti, atenei e capitano si ricavano tutti dalle candidature gia
  // lette: sono l'unica tabella che sa chi sta dove, e tre query in piu
  // direbbero le stesse cose con tre occasioni in piu di dissentire.
  const datiSquadra = new Map<string, DatiSquadra>();
  for (const c of candidature) {
    if (!c.squadra_id) continue;
    const acc = datiSquadra.get(c.squadra_id) ?? {
      componenti: 0,
      atenei: new Map<string, string>(),
      capitano: null,
    };
    acc.componenti += 1;
    const ateneo = (c.universita ?? "").trim();
    // La chiave e in minuscolo perche "Politecnico di Bari" e "politecnico
    // di bari" sono lo stesso ateneo, e l'art. 2 conta gli atenei diversi,
    // non le maiuscole diverse.
    if (ateneo) acc.atenei.set(ateneo.toLowerCase(), ateneo);
    if (c.squadra_ruolo === "capo") acc.capitano = `${c.nome} ${c.cognome}`.trim();
    datiSquadra.set(c.squadra_id, acc);
  }

  return NextResponse.json({
    stats: ((statsRes.data ?? []) as Record<string, number>[])[0] ?? null,
    candidature: candidature.map((c) => ({
      ...c,
      squadra_nome: c.squadra_id ? (nomeSquadra.get(c.squadra_id) ?? null) : null,
      lezioni_completate: c.user_id ? (progresso.get(c.user_id) ?? 0) : 0,
    })),
    squadre: squadre.map((s) => {
      const dati = datiSquadra.get(s.id);
      const progetto = progettoPerSquadra.get(s.id) ?? null;
      return {
        ...s,
        componenti: dati?.componenti ?? 0,
        atenei: dati ? [...dati.atenei.values()].sort((a, b) => a.localeCompare(b, "it")) : [],
        capitano: dati?.capitano ?? null,
        progetto_id: progetto?.id ?? null,
        progetto_stato: progetto?.stato ?? null,
        progetto_titolo: progetto?.titolo ?? null,
        progetto_consegnato_at: progetto?.consegnato_at ?? null,
      };
    }),
    progetti: progetti.map((p) => ({
      ...p,
      squadra_nome: nomeSquadra.get(p.squadra_id) ?? null,
      componenti: datiSquadra.get(p.squadra_id)?.componenti ?? 0,
    })),
    classifica: classificaRes.data ?? [],
    totale_lezioni: TOTALE_LEZIONI,
  });
}

/**
 * Istruttoria di una candidatura: stato e note interne.
 *
 * Lo stato non si cambia mai in silenzio. `stato_aggiornato_at` e
 * `stato_aggiornato_da` si scrivono qui perche fra sei mesi la domanda sara
 * "perche questa persona risulta esclusa", e senza i due campi la risposta
 * sarebbe che non lo sa piu nessuno.
 */
export async function PATCH(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as {
    id?: string;
    stato?: string;
    note_staff?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Candidatura non indicata." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.stato !== undefined) {
    if (!STATI_VALIDI.has(body.stato)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    patch.stato = body.stato;

    // Chi firma la decisione. `getEventAdminClient` torna il client e non il
    // chiamante, e aggiungerglielo significherebbe cambiare la guardia di
    // tutte le rotte staff del sito per una colonna di questa tabella.
    // `utenteCorrenteUniversita` quella persona la sa gia dire, e la guardia
    // ha appena finito di dimostrare che e staff.
    const chiamante = await utenteCorrenteUniversita();
    patch.stato_aggiornato_at = new Date().toISOString();
    patch.stato_aggiornato_da = chiamante.id;
  }

  if (body.note_staff !== undefined) patch.note_staff = body.note_staff?.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  // Lo stato di partenza, letto prima di scrivere. Serve solo a distinguere
  // una transizione da un salvataggio qualsiasi: senza, una nota interna
  // aggiunta a una candidatura gia confermata rimanderebbe l'email ogni
  // volta, e la terza copia della stessa buona notizia sembra un errore.
  let statoPrecedente: string | null = null;
  if (patch.stato !== undefined) {
    const { data: prima } = await client
      .from("universita_candidature")
      .select("stato")
      .eq("id", body.id)
      .maybeSingle<{ stato: string }>();
    statoPrecedente = prima?.stato ?? null;
  }

  const { data, error: erroreUpdate } = await client
    .from("universita_candidature")
    .update(patch)
    .eq("id", body.id)
    .select(CAMPI_CANDIDATURA)
    .maybeSingle<RigaCandidatura>();

  if (erroreUpdate) {
    const messaggio = messaggioErroreDb(erroreUpdate.message);
    if (messaggio) return NextResponse.json({ error: messaggio }, { status: 400 });
    console.error("Universita admin candidatura update error:", erroreUpdate);
    return NextResponse.json(
      { error: "Non è stato possibile aggiornare la candidatura." },
      { status: 500 },
    );
  }

  if (!data) return NextResponse.json({ error: "Candidatura non trovata." }, { status: 404 });

  // ── Avviso al candidato, solo sull'ingresso nel percorso ──
  // Senza `user_id` non c'e un account da usare, quindi non c'e niente da
  // annunciare: quella riga va prima riparata con la POST qui sotto.
  const entraNelPercorso =
    patch.stato === "confermata" && statoPrecedente !== "confermata" && !!data.user_id;

  if (entraNelPercorso && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: data.email,
        subject: universitaConfermaEmailSubject(),
        html: universitaConfermaEmailHtml({ nome: data.nome }),
      });
    } catch (mailErr) {
      // Lo stato e gia salvato: un problema di invio non deve far fallire
      // l'istruttoria dello staff.
      console.error("Universita conferma candidatura email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, candidatura: data });
}

/**
 * Rimanda il link di accesso a un candidato.
 *
 * E' la riparazione di due situazioni che sembrano la stessa e non lo sono.
 * La prima sono le righe che precedono la creazione automatica
 * dell'account: sono state raccolte quando la candidatura era solo un
 * modulo ricevuto, e non hanno `user_id`, quindi quelle persone risultano
 * regolarmente candidate e non possono entrare da nessuna parte. La seconda
 * e chi l'account ce l'ha ma non ha mai scelto la password, perche il link
 * arriva una volta sola e chi rimanda a dopo se lo trova scaduto.
 *
 * In entrambi i casi il rimedio e lo stesso: trovare o creare l'utente,
 * generare un link nuovo, riallineare `user_id` e riscrivere. Il link non
 * torna nella risposta: e la chiave di casa di un'altra persona, e passa
 * dalla sua casella di posta, non dallo schermo di chi lo ha chiesto.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Candidatura non indicata." }, { status: 400 });

  const { data: candidatura, error: erroreLettura } = await client
    .from("universita_candidature")
    .select("id, nome, cognome, email, user_id")
    .eq("id", body.id)
    .maybeSingle<{
      id: string;
      nome: string;
      cognome: string;
      email: string;
      user_id: string | null;
    }>();

  if (erroreLettura) {
    console.error("Universita admin accesso: lettura candidatura fallita:", erroreLettura);
    return NextResponse.json(
      { error: "Non è stato possibile leggere la candidatura." },
      { status: 500 },
    );
  }
  if (!candidatura) {
    return NextResponse.json({ error: "Candidatura non trovata." }, { status: 404 });
  }

  const email = (candidatura.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Questa candidatura non ha un indirizzo email." },
      { status: 400 },
    );
  }

  // Stessa sequenza della rotta pubblica di candidatura: prima si cerca un
  // profilo con quella email, perche chi e gia registrato sul sito per il
  // portale o per un altro bando non deve ritrovarsi un secondo account con
  // lo stesso indirizzo.
  let userId: string | null = candidatura.user_id ?? null;

  if (!userId) {
    const { data: profilo } = await client
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle<{ id: string }>();

    if (profilo?.id) {
      userId = profilo.id;
    } else {
      const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: `${candidatura.nome} ${candidatura.cognome}`.trim() },
      });
      if (erroreCreazione || !creato.user) {
        console.error("Universita admin accesso createUser error:", erroreCreazione);
        return NextResponse.json(
          { error: "Non è stato possibile creare l'account del candidato." },
          { status: 500 },
        );
      }
      userId = creato.user.id;
    }
  }

  // Il link si genera sempre, anche per un account che esisteva gia: e il
  // motivo per cui questa rotta viene chiamata. Per chi una password ce
  // l'ha, un link di recupero e semplicemente il modo previsto di
  // cambiarla, e non gli toglie quella che usa finche non lo apre.
  const { data: link, error: erroreLink } = await client.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/auth/update-password` },
  });

  const setPasswordUrl = link?.properties?.action_link;
  if (erroreLink || !setPasswordUrl) {
    console.error("Universita admin accesso generateLink error:", erroreLink);
    return NextResponse.json(
      { error: "Non è stato possibile generare il link di accesso." },
      { status: 500 },
    );
  }

  if (candidatura.user_id !== userId) {
    const { error: erroreAggancio } = await client
      .from("universita_candidature")
      .update({ user_id: userId })
      .eq("id", candidatura.id);
    if (erroreAggancio) {
      console.error("Universita admin accesso: aggancio user_id fallito:", erroreAggancio);
      return NextResponse.json(
        { error: "Non è stato possibile collegare l'account alla candidatura." },
        { status: 500 },
      );
    }
  }

  // `inviata` dice la verita anche quando Resend non e configurato: senza,
  // il pannello direbbe "fatto" e nessuna email sarebbe partita.
  let inviata = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: email,
        subject: universitaAccessoEmailSubject(),
        html: universitaAccessoEmailHtml({ nome: candidatura.nome, setPasswordUrl }),
      });
      inviata = true;
    } catch (mailErr) {
      console.error("Universita accesso email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, inviata, user_id: userId });
}
