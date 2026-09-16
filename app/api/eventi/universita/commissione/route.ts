/**
 * Area della Commissione del percorso universitario (art. 8).
 *
 * Una rotta sola per le tre cose che un commissario fa: leggere i progetti
 * consegnati, scrivere la propria scheda, chiuderla. La divisione dei verbi
 * non e decorativa. PATCH salva un lavoro in corso e si puo ripetere quante
 * volte si vuole; POST e l'atto che fa entrare quel voto in classifica, e un
 * atto che cambia una graduatoria merita un verbo suo, non un campo booleano
 * dentro un salvataggio qualsiasi.
 *
 * Rispetto al gemello dei licei cambia una cosa sola, ed e voluta: li il
 * commissario riapre da se una scheda chiusa, qui no. La ragione e il premio:
 * l'art. 9 avvia il progetto vincitore a un percorso di pubblicazione, e una
 * classifica che puo cambiare perche qualcuno ha riaperto un voto in silenzio
 * non e una classifica. La riapertura resta possibile, ma e un atto dello
 * staff, che lascia traccia nel pannello.
 */

import { NextResponse } from "next/server";
import {
  leggiConfigUniversita,
  requireCommissarioUniversita,
  utenteCorrenteUniversita,
  verificaValutazioneAperta,
} from "@/lib/eventi/universita-server";
import {
  messaggioErroreDb,
  validateChiusuraScheda,
  validateScheda,
  type ValutazioneInput,
} from "@/lib/eventi/universita-squadre";
import { CAMPI_PUNTEGGIO_UNIVERSITA } from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * I `numeric` di Postgres possono tornare come stringa a seconda di come il
 * driver serializza la colonna, e la scheda si valida confrontando numeri.
 * Senza questa conversione una scheda completa verrebbe rifiutata alla
 * chiusura per un dettaglio di trasporto, che e il genere di errore che chi
 * lo subisce non ha nessun modo di capire.
 */
const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

/**
 * Quello che la Commissione vede di un progetto.
 *
 * Non ci sono i nomi di chi lo ha scritto, e non e una dimenticanza. Nei
 * licei quella scelta nasce dall'eta degli iscritti; qui i candidati sono
 * adulti e la ragione e un'altra, piu vicina al mestiere di chi giudica: i
 * sei criteri dell'art. 7 misurano tutti il lavoro e nessuno gli autori,
 * quindi un nome in schermata puo solo spostare un voto, mai fondarlo.
 *
 * Gli atenei invece restano, e non e una contraddizione: servono in seduta,
 * e servono alla regola dell'art. 8 sul conflitto di interessi, che si
 * dichiara sull'appartenenza e non sulla persona. Un commissario che legge
 * il nome del proprio dipartimento sa di doversi astenere; con i soli nomi
 * dei ragazzi, spesso, non lo saprebbe.
 */
const CAMPI_PROGETTO_COMMISSIONE =
  "id, squadra_id, titolo, ambito, ipotesi, stato_arte, metodo, integrazione, impatto, etica, link_materiali, consegnato_at, universita_squadre(nome)";

type RigaProgetto = {
  id: string;
  squadra_id: string;
  titolo: string;
  ambito: string | null;
  ipotesi: string;
  stato_arte: string;
  metodo: string;
  integrazione: string;
  impatto: string;
  etica: string;
  link_materiali: string | null;
  consegnato_at: string | null;
  universita_squadre: { nome?: string } | null;
};

type RigaScheda = {
  id: string;
  progetto_id: string;
  commissario_id: string;
  p_innovativita: number | string | null;
  p_solidita: number | string | null;
  p_impatto: number | string | null;
  p_integrazione: number | string | null;
  p_etica: number | string | null;
  p_presentazione: number | string | null;
  nota: string | null;
  pubblicabile: string | null;
  chiusa: boolean;
  chiusa_at: string | null;
  totale: number | string | null;
};

/** La scheda in ingresso alla validazione, con i punteggi gia numeri. */
function schedaInput(riga: RigaScheda): ValutazioneInput {
  return {
    p_innovativita: numero(riga.p_innovativita),
    p_solidita: numero(riga.p_solidita),
    p_impatto: numero(riga.p_impatto),
    p_integrazione: numero(riga.p_integrazione),
    p_etica: numero(riga.p_etica),
    p_presentazione: numero(riga.p_presentazione),
    nota: riga.nota ?? "",
    pubblicabile: riga.pubblicabile,
  };
}

/**
 * La scheda come la riceve la console. Una forma sola per tutti e tre i
 * verbi: dopo un salvataggio la console sostituisce la riga che ha in mano
 * con quella che torna da qui, e se le due forme non coincidessero dovrebbe
 * ricaricare tutto per rimettersi in pari.
 *
 * `nota` torna come stringa vuota e non come null perche a valle c'e una
 * textarea, e una textarea con dentro `null` scrive "null".
 */
function schedaPubblica(riga: RigaScheda) {
  return {
    progetto_id: riga.progetto_id,
    ...schedaInput(riga),
    nota: riga.nota ?? "",
    pubblicabile: riga.pubblicabile ?? null,
    chiusa: !!riga.chiusa,
    chiusa_at: riga.chiusa_at ?? null,
    totale: numero(riga.totale) ?? 0,
  };
}

/* ── GET: i progetti consegnati e le proprie schede ───────────────────── */

export async function GET() {
  const guard = await requireCommissarioUniversita();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const [config, { data: progetti, error }, { data: schede }] = await Promise.all([
    leggiConfigUniversita(),
    client
      .from("universita_progetti")
      .select(CAMPI_PROGETTO_COMMISSIONE)
      .eq("stato", "consegnato")
      // In ordine di consegna, che e l'unico ordine neutro che abbiamo: per
      // punteggio non si puo, perche il punteggio degli altri qui non entra,
      // e per titolo si ordinerebbe per l'iniziale di una parola scelta da
      // chi scrive. La data rende l'elenco anche stabile fra due ricariche.
      .order("consegnato_at", { ascending: true }),
    // Solo le proprie, e il filtro e sull'id che la guardia ha ricavato
    // dall'utente autenticato. Il punteggio di un collega non compare da
    // nessuna parte di questa risposta, ne singolo ne in media: un voto letto
    // prima di dare il proprio lo tira verso di se, e la media di cinque
    // giudizi ancorati vale meno di cinque giudizi indipendenti. La policy
    // "Commissari can view own universita valutazioni" dice esattamente
    // questo a database, e qui giriamo con la service role, cioe con la RLS
    // spenta: se questo filtro sparisse, sparirebbe la protezione.
    client
      .from("universita_valutazioni")
      .select("*")
      .eq("commissario_id", ctx.commissario.id),
  ]);

  if (error) {
    console.error("Universita commissione progetti error:", error);
    return NextResponse.json({ error: "Caricamento non riuscito." }, { status: 500 });
  }

  const righe = (progetti ?? []) as unknown as RigaProgetto[];
  const mieSchede = new Map<string, RigaScheda>();
  for (const s of (schede ?? []) as unknown as RigaScheda[]) {
    mieSchede.set(s.progetto_id, s);
  }

  // Le squadre da contare escono dalla query qui sopra, non dalla richiesta:
  // e l'elenco dei progetti consegnati che decide di chi si leggono i
  // componenti, e non il contrario.
  const squadreIds = Array.from(new Set(righe.map((r) => r.squadra_id).filter(Boolean)));

  const composizione = new Map<string, { componenti: number; atenei: string[] }>();
  if (squadreIds.length > 0) {
    // Due colonne e basta: quante persone e da quali atenei. Nessun nome,
    // nessuna email, per la ragione scritta sopra a CAMPI_PROGETTO_COMMISSIONE.
    const { data: membri } = await client
      .from("universita_candidature")
      .select("squadra_id, universita")
      .in("squadra_id", squadreIds);

    for (const m of (membri ?? []) as { squadra_id: string; universita: string | null }[]) {
      const voce = composizione.get(m.squadra_id) ?? { componenti: 0, atenei: [] };
      voce.componenti += 1;
      // Distinti ignorando maiuscole e spazi, come il `count(distinct
      // lower(universita))` della funzione della classifica. Se i due conti
      // divergessero, la stessa squadra risulterebbe interdisciplinare in
      // una schermata e no nell'altra, e nessuno saprebbe quale credere.
      const ateneo = testo(m.universita);
      if (ateneo && !voce.atenei.some((a) => a.toLowerCase() === ateneo.toLowerCase())) {
        voce.atenei.push(ateneo);
      }
      composizione.set(m.squadra_id, voce);
    }
  }

  return NextResponse.json({
    commissario: ctx.commissario,
    progetti: righe.map((p) => {
      const squadra = p.universita_squadre as unknown as { nome?: string } | null;
      const voce = composizione.get(p.squadra_id) ?? { componenti: 0, atenei: [] };
      const mia = mieSchede.get(p.id);
      return {
        id: p.id,
        titolo: p.titolo,
        ambito: p.ambito,
        ipotesi: p.ipotesi,
        stato_arte: p.stato_arte,
        metodo: p.metodo,
        integrazione: p.integrazione,
        impatto: p.impatto,
        etica: p.etica,
        link_materiali: p.link_materiali,
        consegnato_at: p.consegnato_at,
        squadra_nome: squadra?.nome ?? "",
        componenti: voce.componenti,
        atenei: voce.atenei.slice().sort((a, b) => a.localeCompare(b, "it")),
        scheda: mia ? schedaPubblica(mia) : null,
      };
    }),
    config: { stato_valutazione: config.stato_valutazione },
  });
}

/* ── PATCH: salva la propria scheda ───────────────────────────────────── */

export async function PATCH(request: Request) {
  const guard = await requireCommissarioUniversita();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaValutazioneAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json()) as ValutazioneInput & { progetto_id?: string };

  const progettoId = testo(body.progetto_id);
  if (!progettoId) {
    return NextResponse.json({ error: "Progetto non indicato." }, { status: 400 });
  }

  const errore = validateScheda(body);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  // L'osservatore dell'art. 8 siede in Commissione senza diritto di voto.
  // Puo leggere e puo lasciare una nota, che resta agli atti e vale nella
  // discussione, ma un numero da lui non deve nemmeno essere salvato: una
  // scheda con dei punteggi dentro sembra un voto a chiunque la riapra, e
  // fra sei mesi nessuno ricorda chi aveva diritto di voto e chi no.
  const haPunteggi = CAMPI_PUNTEGGIO_UNIVERSITA.some((c) => {
    const v = body[c.campo];
    return v !== undefined && v !== null;
  });
  if (!ctx.commissario.diritto_voto && haPunteggi) {
    return NextResponse.json(
      {
        error:
          "L'art. 8 le assegna funzioni consultive e senza diritto di voto: può lasciare una nota, che resta agli atti, ma non un punteggio.",
      },
      { status: 403 },
    );
  }

  // Si valuta solo quello che e stato consegnato. Una bozza non e un
  // progetto, e giudicare un lavoro in corso sarebbe ingiusto verso chi lo
  // sta ancora scrivendo. Lo stato lo leggiamo qui e non ci fidiamo di quello
  // che arriva nel corpo: con la service role l'id nel corpo non prova nulla.
  const { data: progetto } = await client
    .from("universita_progetti")
    .select("id, stato")
    .eq("id", progettoId)
    .maybeSingle<{ id: string; stato: string }>();

  if (!progetto || progetto.stato !== "consegnato") {
    return NextResponse.json(
      { error: "Progetto non trovato fra quelli consegnati." },
      { status: 404 },
    );
  }

  // La scheda esistente si cerca sulla coppia progetto piu commissario della
  // guardia. E' il filtro che tiene in piedi tutto il modulo: senza, chi
  // conosce l'id di un progetto potrebbe riscrivere la scheda di un altro.
  const { data: esistente } = await client
    .from("universita_valutazioni")
    .select("id, chiusa")
    .eq("progetto_id", progettoId)
    .eq("commissario_id", ctx.commissario.id)
    .maybeSingle<{ id: string; chiusa: boolean }>();

  if (esistente?.chiusa) {
    return NextResponse.json(
      {
        error:
          "Questa scheda è chiusa e non si modifica più. Se deve correggerla, scriva alla segreteria della Commissione: la riapertura è un atto dello staff e resta a verbale.",
      },
      { status: 409 },
    );
  }

  // Dal corpo alle colonne, un campo alla volta e solo quelli previsti: cosi
  // `chiusa`, `chiusa_at` e `commissario_id` non possono arrivare da fuori
  // nemmeno per sbaglio. I campi assenti non si toccano, perche la console
  // salva anche una scheda a meta e un assente non e uno zero.
  const riga: Record<string, unknown> = {
    progetto_id: progettoId,
    commissario_id: ctx.commissario.id,
  };

  for (const c of CAMPI_PUNTEGGIO_UNIVERSITA) {
    if (body[c.campo] !== undefined) riga[c.campo] = numero(body[c.campo]);
  }
  if (body.nota !== undefined) riga.nota = testo(body.nota) || null;
  if (body.pubblicabile !== undefined) riga.pubblicabile = testo(body.pubblicabile) || null;

  const { data, error } = await client
    .from("universita_valutazioni")
    .upsert(riga, { onConflict: "progetto_id,commissario_id" })
    .select()
    .maybeSingle<RigaScheda>();

  if (error || !data) {
    const messaggio = error ? messaggioErroreDb(error.message) : null;
    if (messaggio) return NextResponse.json({ error: messaggio }, { status: 409 });
    console.error("Universita scheda upsert error:", error);
    return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 500 });
  }

  return NextResponse.json({ success: true, scheda: schedaPubblica(data) });
}

/* ── POST: chiude la propria scheda ───────────────────────────────────── */

/**
 * La chiusura e un atto separato dal salvataggio perche e l'unico momento in
 * cui la scheda smette di essere un appunto privato ed entra nella media
 * della classifica. Si chiude quello che e scritto a database, non quello che
 * il client manda insieme al comando: cosi il commissario conferma la stessa
 * versione che ha appena riletto in schermata.
 */
export async function POST(request: Request) {
  const guard = await requireCommissarioUniversita();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrenteUniversita();
  const cancello = await verificaValutazioneAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json()) as { progetto_id?: string };

  const progettoId = testo(body.progetto_id);
  if (!progettoId) {
    return NextResponse.json({ error: "Progetto non indicato." }, { status: 400 });
  }

  // Un osservatore non ha punteggi da consegnare, e senza questo controllo si
  // sentirebbe rispondere che gli manca l'innovativita: vero, ma incomprensibile
  // per chi non deve darla. La sua nota resta salvata e resta agli atti.
  if (!ctx.commissario.diritto_voto) {
    return NextResponse.json(
      {
        error:
          "L'art. 8 le assegna funzioni consultive e senza diritto di voto: non c'è una scheda da chiudere, e la sua nota resta agli atti così com'è.",
      },
      { status: 403 },
    );
  }

  const { data: riga } = await client
    .from("universita_valutazioni")
    .select("*")
    .eq("progetto_id", progettoId)
    .eq("commissario_id", ctx.commissario.id)
    .maybeSingle<RigaScheda>();

  if (!riga) {
    return NextResponse.json(
      { error: "Non c'è ancora una scheda da chiudere su questo progetto." },
      { status: 404 },
    );
  }

  if (riga.chiusa) {
    return NextResponse.json({ error: "Questa scheda è già chiusa." }, { status: 409 });
  }

  const errore = validateChiusuraScheda(schedaInput(riga));
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  // Il filtro su `chiusa` non e ridondante rispetto al controllo qui sopra:
  // due clic ravvicinati sullo stesso bottone arrivano come due richieste, e
  // senza di esso la seconda riscriverebbe `chiusa_at` con un istante in cui
  // il commissario non ha chiuso nulla.
  const { data, error } = await client
    .from("universita_valutazioni")
    .update({ chiusa: true, chiusa_at: new Date().toISOString() })
    .eq("id", riga.id)
    .eq("commissario_id", ctx.commissario.id)
    .eq("chiusa", false)
    .select()
    .maybeSingle<RigaScheda>();

  if (error || !data) {
    const messaggio = error ? messaggioErroreDb(error.message) : null;
    if (messaggio) return NextResponse.json({ error: messaggio }, { status: 409 });
    if (!error) {
      return NextResponse.json({ error: "Questa scheda è già chiusa." }, { status: 409 });
    }
    console.error("Universita chiusura scheda error:", error);
    return NextResponse.json({ error: "Chiusura non riuscita." }, { status: 500 });
  }

  return NextResponse.json({ success: true, scheda: schedaPubblica(data) });
}
