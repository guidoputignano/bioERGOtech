import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import {
  CHIAVE_DATI_CANCELLATI,
  CHIAVE_ESITO_CANCELLAZIONE,
  CHIAVE_PERCORSO_CHIUSO,
  leggiChiusuraPercorso,
  type EsitoCancellazione,
} from "@/lib/eventi/licei-server";

/**
 * Chiusura del percorso licei: il comando che mantiene la promessa
 * dell'informativa. Account, elaborati, progetti e avanzamento si cancellano
 * entro un mese dalla conclusione del corso, e l'accesso di referenti e
 * commissari si spegne a fine corso.
 *
 * Due passi separati, e non uno solo, perche hanno costi diversi. Spegnere
 * gli accessi e reversibile e va fatto il giorno in cui il corso finisce.
 * Cancellare non si annulla, e conviene farlo dopo, quando lo staff ha
 * esportato quello che deve tenere (classifica, attestati) e nessuno scrive
 * piu nelle tabelle. Il secondo passo resta bloccato finche il primo non e
 * stato fatto.
 *
 * Che cosa NON si tocca: `event_registrations` (i finalisti iscritti
 * all'evento seguono la conservazione dell'evento, non del corso) e
 * `newsletter_subscribers` (un consenso a parte, dato a parte).
 */

// Cancellare qualche centinaio di account sono qualche centinaio di
// chiamate all'API di autenticazione: il tempo di default non basta.
export const maxDuration = 300;

const PAROLA_CONFERMA = "CHIUDI";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

type Errore = { code?: string; message?: string } | null;

/**
 * La tabella non esiste in questo database. Non e un caso di scuola:
 * `lesson_submissions` non ha migrazione nel repository, e su un ambiente
 * nuovo alcune tabelle del portale possono mancare. Chi non ha la tabella
 * non puo comparirci, quindi conta come "nessuna riga".
 *
 * Il controllo e stretto di proposito: una colonna sbagliata (42703) non e
 * una tabella assente, ed e un errore vero che deve fermare tutto.
 */
function tabellaAssente(e: Errore): boolean {
  if (!e) return false;
  return (
    e.code === "42P01" ||
    e.code === "PGRST205" ||
    /relation .* does not exist|could not find the table/i.test(e.message ?? "")
  );
}

/** Spezza un elenco in blocchi: i filtri `in` viaggiano nella URL. */
function blocchi<T>(valori: T[], dimensione = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < valori.length; i += dimensione) out.push(valori.slice(i, i + dimensione));
  return out;
}

/**
 * Tutte le righe di una tabella, a pagine. PostgREST tronca in silenzio
 * oltre un tetto di righe, e le iscrizioni possono superarlo: leggere una
 * pagina sola vorrebbe dire lasciare indietro proprio gli ultimi iscritti.
 * L'ordine per id rende le pagine stabili.
 */
async function tutteLeRighe<T>(client: Db, tabella: string, colonne: string): Promise<T[]> {
  const PAGINA = 1000;
  const righe: T[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from(tabella)
      .select(colonne)
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) throw new Error(`${tabella}: ${error.message}`);
    righe.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) break;
  }
  return righe;
}

/**
 * Quali dei valori indicati compaiono in `tabella.colonna`. Serve a sapere
 * se un account e usato anche fuori dal percorso.
 *
 * Se un blocco torna pieno fino al tetto, la risposta potrebbe essere
 * troncata: in quel caso si ricontrolla valore per valore con un conteggio,
 * che non ha tetto. Un account che sfugge qui verrebbe cancellato, quindi
 * l'errore per difetto non e accettabile.
 */
async function presenti(
  client: Db,
  tabella: string,
  colonna: string,
  valori: string[],
): Promise<{ trovati: Set<string>; assente: boolean }> {
  const trovati = new Set<string>();
  const TETTO = 1000;
  for (const blocco of blocchi(valori)) {
    const { data, error } = await client.from(tabella).select(colonna).in(colonna, blocco).limit(TETTO);
    if (tabellaAssente(error)) return { trovati, assente: true };
    if (error) throw new Error(`${tabella}.${colonna}: ${error.message}`);
    const righe = (data ?? []) as unknown as Record<string, unknown>[];
    if (righe.length < TETTO) {
      for (const r of righe) {
        const v = r[colonna];
        if (typeof v === "string") trovati.add(v.toLowerCase());
      }
      continue;
    }
    for (const v of blocco) {
      const { count, error: e2 } = await client
        .from(tabella)
        .select(colonna, { count: "exact", head: true })
        .eq(colonna, v);
      if (e2) throw new Error(`${tabella}.${colonna}: ${e2.message}`);
      if ((count ?? 0) > 0) trovati.add(v.toLowerCase());
    }
  }
  return { trovati, assente: false };
}

/** Conteggio esatto di una tabella intera. */
async function conta(client: Db, tabella: string): Promise<number> {
  const { count, error } = await client.from(tabella).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${tabella}: ${error.message}`);
  return count ?? 0;
}

/* ── Perche un account resta ─────────────────────────────────────────── */

/**
 * I motivi per cui un account del percorso NON si cancella, in ordine di
 * precedenza: un account con piu motivi si conta sotto il primo.
 *
 * Il criterio e prudente per costruzione. Si cancella solo l'account che il
 * database mostra usato dal percorso licei e da nient'altro; basta una
 * traccia in un altro modulo per tenerlo. L'account resta, i suoi dati del
 * percorso no.
 *
 * `corso` dice se quel motivo riguarda anche il corso online: lo staff, i
 * membri del portale e gli studenti universitari seguono lo stesso corso, e
 * le loro riflessioni sulle lezioni non sono solo del percorso licei.
 */
const MOTIVI = {
  staff: { label: "Staff della Fondazione", corso: true },
  portale: { label: "Membro o candidato del portale", corso: true },
  universita: { label: "Percorso universitario", corso: true },
  bando: { label: "Bando startup", corso: false },
  evento: { label: "Iscritto all'evento", corso: false },
} as const;

type Motivo = keyof typeof MOTIVI;
const ORDINE_MOTIVI = Object.keys(MOTIVI) as Motivo[];

/**
 * Dove cercare le tracce di un account fuori dal percorso. Le tabelle sono
 * tutte quelle del sito che legano una riga a un utente, per id o per email
 * (le email nel sito si salvano gia in minuscolo).
 *
 * `coin_balances` manca di proposito: ogni scrittura sul saldo passa con una
 * riga in `coin_transactions`, che e il segnale vero di attivita. Le tabelle
 * da tenere (`event_registrations`, `newsletter_subscribers`) non si
 * toccano; la prima conta comunque come motivo per tenere l'account.
 */
const TRACCE: { tabella: string; colonna: string; tipo: "id" | "email"; motivo: Motivo }[] = [
  { tabella: "applications", colonna: "email", tipo: "email", motivo: "portale" },
  { tabella: "projects", colonna: "created_by", tipo: "id", motivo: "portale" },
  { tabella: "knowledge_documents", colonna: "proposed_by", tipo: "id", motivo: "portale" },
  { tabella: "equipment_proposals", colonna: "proposed_by_email", tipo: "email", motivo: "portale" },
  { tabella: "event_attendees", colonna: "user_id", tipo: "id", motivo: "portale" },
  { tabella: "events", colonna: "created_by", tipo: "id", motivo: "portale" },
  { tabella: "coin_transactions", colonna: "user_id", tipo: "id", motivo: "portale" },
  { tabella: "redemption_requests", colonna: "user_id", tipo: "id", motivo: "portale" },
  { tabella: "universita_candidature", colonna: "user_id", tipo: "id", motivo: "universita" },
  { tabella: "universita_candidature", colonna: "email", tipo: "email", motivo: "universita" },
  { tabella: "universita_commissari", colonna: "user_id", tipo: "id", motivo: "universita" },
  { tabella: "universita_mentor", colonna: "user_id", tipo: "id", motivo: "universita" },
  { tabella: "universita_mentor", colonna: "email", tipo: "email", motivo: "universita" },
  { tabella: "bando_applications", colonna: "user_id", tipo: "id", motivo: "bando" },
  { tabella: "bando_applications", colonna: "referente_email", tipo: "email", motivo: "bando" },
  { tabella: "event_registrations", colonna: "user_id", tipo: "id", motivo: "evento" },
  { tabella: "event_registrations", colonna: "email", tipo: "email", motivo: "evento" },
];

type Persona = { id: string; studente: boolean; emails: Set<string>; motivi: Set<Motivo> };

type Piano = {
  conteggi: {
    adesioni: number;
    iscrizioni: number;
    squadre: number;
    progetti: number;
    valutazioni: number;
    commissari: number;
    riflessioni: number;
  };
  account: {
    totali: number;
    da_cancellare: number;
    mantenuti: number;
    mantenuti_per_motivo: Record<string, number>;
  };
  /** Tabelle che in questo database non esistono: contate come vuote. */
  tabelle_assenti: string[];
  /** Interni, non escono dalla rotta. */
  daCancellare: string[];
  utentiRiflessioni: string[];
};

/**
 * Che cosa farebbe la cancellazione, senza farla. La stessa funzione serve
 * all'anteprima del pannello e all'esecuzione: lo staff conferma esattamente
 * i numeri che ha letto, non una stima fatta da un'altra parte.
 *
 * Se una qualsiasi verifica fallisce si solleva, e la rotta non cancella
 * niente: meglio un comando che si rifiuta di un account cancellato perche
 * una query e andata in errore e sembrava vuota.
 */
async function calcolaPiano(client: Db): Promise<Piano> {
  const [adesioni, iscrizioni, commissari] = await Promise.all([
    tutteLeRighe<{ user_id: string | null; referente_email: string | null }>(
      client,
      "licei_adesioni",
      "id, user_id, referente_email",
    ),
    tutteLeRighe<{ user_id: string | null; email: string | null }>(
      client,
      "licei_iscrizioni",
      "id, user_id, email",
    ),
    tutteLeRighe<{ user_id: string | null; email: string | null }>(
      client,
      "licei_commissari",
      "id, user_id, email",
    ),
  ]);

  const persone = new Map<string, Persona>();
  const aggiungi = (id: string | null, email: string | null, studente: boolean) => {
    if (!id) return;
    const p = persone.get(id) ?? { id, studente: false, emails: new Set(), motivi: new Set() };
    if (studente) p.studente = true;
    if (email) p.emails.add(email.trim().toLowerCase());
    persone.set(id, p);
  };
  for (const a of adesioni) aggiungi(a.user_id, a.referente_email, false);
  for (const i of iscrizioni) aggiungi(i.user_id, i.email, true);
  for (const c of commissari) aggiungi(c.user_id, c.email, false);

  const ids = [...persone.keys()];
  const tabelleAssenti = new Set<string>();

  // Il profilo dice due cose: il livello (staff, membro, partner) e se la
  // persona ha mai chiesto di entrare nel portale. Si legge con `*` perche
  // `application_status` arriva da una migrazione che un ambiente potrebbe
  // non avere, e in quel caso la colonna semplicemente non c'e.
  for (const blocco of blocchi(ids)) {
    const { data, error } = await client.from("profiles").select("*").in("id", blocco);
    if (error) throw new Error(`profiles: ${error.message}`);
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      const p = persone.get(r.id as string);
      if (!p) continue;
      if (typeof r.email === "string" && r.email) p.emails.add(r.email.trim().toLowerCase());
      const livello = r.partnership_level as string | undefined;
      if (livello === "admin") p.motivi.add("staff");
      else if (livello === "member" || livello === "partner") p.motivi.add("portale");
      const domanda = r.application_status as string | undefined;
      if (domanda && domanda !== "none") p.motivi.add("portale");
    }
  }

  const perEmail = new Map<string, Persona[]>();
  for (const p of persone.values()) {
    for (const e of p.emails) perEmail.set(e, [...(perEmail.get(e) ?? []), p]);
  }
  const emails = [...perEmail.keys()];

  for (const t of TRACCE) {
    const valori = t.tipo === "id" ? ids : emails;
    if (valori.length === 0) continue;
    const { trovati, assente } = await presenti(client, t.tabella, t.colonna, valori);
    if (assente) {
      tabelleAssenti.add(t.tabella);
      continue;
    }
    for (const v of trovati) {
      if (t.tipo === "id") persone.get(v)?.motivi.add(t.motivo);
      else for (const p of perEmail.get(v) ?? []) p.motivi.add(t.motivo);
    }
  }

  const daCancellare: string[] = [];
  const perMotivo: Record<string, number> = {};
  const utentiRiflessioni = new Set<string>();
  for (const p of persone.values()) {
    if (p.motivi.size === 0) {
      daCancellare.push(p.id);
      // L'account se ne va: le sue riflessioni con lui, che sia studente,
      // referente o commissario.
      utentiRiflessioni.add(p.id);
      continue;
    }
    const primo = ORDINE_MOTIVI.find((m) => p.motivi.has(m)) as Motivo;
    const label = MOTIVI[primo].label;
    perMotivo[label] = (perMotivo[label] ?? 0) + 1;
    // Lo studente che resta per un motivo estraneo al corso (l'evento, il
    // bando) perde comunque le riflessioni: sono avanzamento del percorso.
    // Chi segue il corso anche per un'altra via le tiene.
    const corsoCondiviso = [...p.motivi].some((m) => MOTIVI[m].corso);
    if (p.studente && !corsoCondiviso) utentiRiflessioni.add(p.id);
  }

  let riflessioni = 0;
  for (const blocco of blocchi([...utentiRiflessioni])) {
    const { count, error } = await client
      .from("lesson_submissions")
      .select("user_id", { count: "exact", head: true })
      .in("user_id", blocco);
    if (tabellaAssente(error)) {
      tabelleAssenti.add("lesson_submissions");
      break;
    }
    if (error) throw new Error(`lesson_submissions: ${error.message}`);
    riflessioni += count ?? 0;
  }

  const [squadre, progetti, valutazioni] = await Promise.all([
    conta(client, "licei_squadre"),
    conta(client, "licei_progetti"),
    conta(client, "licei_valutazioni"),
  ]);

  return {
    conteggi: {
      adesioni: adesioni.length,
      iscrizioni: iscrizioni.length,
      squadre,
      progetti,
      valutazioni,
      commissari: commissari.length,
      riflessioni,
    },
    account: {
      totali: persone.size,
      da_cancellare: daCancellare.length,
      mantenuti: persone.size - daCancellare.length,
      mantenuti_per_motivo: perMotivo,
    },
    tabelle_assenti: [...tabelleAssenti],
    daCancellare,
    utentiRiflessioni: [...utentiRiflessioni],
  };
}

/** Il piano senza gli elenchi interni: al browser vanno solo i numeri. */
function pubblico(piano: Piano) {
  return {
    conteggi: piano.conteggi,
    account: piano.account,
    tabelle_assenti: piano.tabelle_assenti,
  };
}

async function scriviConfig(client: Db, righe: Record<string, string>, autore: string) {
  const adesso = new Date().toISOString();
  const { error } = await client.from("licei_config").upsert(
    Object.entries(righe).map(([chiave, valore]) => ({
      chiave,
      valore,
      aggiornato_at: adesso,
      aggiornato_by: autore,
    })),
    { onConflict: "chiave" },
  );
  if (error) throw new Error(`licei_config: ${error.message}`);
}

/** Stato della chiusura e anteprima di cio che la cancellazione toccherebbe. */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const chiusura = await leggiChiusuraPercorso(client);

  try {
    const piano = await calcolaPiano(client);
    return NextResponse.json({ chiusura, piano: pubblico(piano) });
  } catch (err) {
    // Lo stato si mostra comunque: senza anteprima il pannello non abilita
    // la cancellazione, ma lo staff deve poter vedere a che punto e.
    return NextResponse.json({
      chiusura,
      piano: null,
      errore_piano: err instanceof Error ? err.message : "Verifica non riuscita.",
    });
  }
}

/**
 * Tre azioni, tutte con la parola di conferma ripetuta anche qui e non solo
 * nel browser: una richiesta costruita a mano non deve poter saltare il
 * secondo passo.
 *
 * - `disattiva`: registra la data di chiusura. Da quel momento le guardie
 *   di referente, studente e commissario rispondono 403.
 * - `riattiva`: la toglie, ma solo finche i dati ci sono ancora. Serve per
 *   l'errore di un click, non per riaprire un percorso svuotato.
 * - `cancella`: esegue il piano. Solo a percorso gia chiuso.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const body = (await request.json().catch(() => ({}))) as { azione?: string; conferma?: string };
  if ((body.conferma ?? "").trim() !== PAROLA_CONFERMA) {
    return NextResponse.json(
      { error: `Per confermare scrivi ${PAROLA_CONFERMA} nel campo di conferma.` },
      { status: 400 },
    );
  }

  const chiusura = await leggiChiusuraPercorso(client);

  try {
    if (body.azione === "disattiva") {
      if (chiusura.chiusoAt) {
        return NextResponse.json({ error: "Gli accessi sono già disattivati." }, { status: 409 });
      }
      await scriviConfig(client, { [CHIAVE_PERCORSO_CHIUSO]: new Date().toISOString() }, chiamante.id);
      return NextResponse.json({ success: true, chiusura: await leggiChiusuraPercorso(client) });
    }

    if (body.azione === "riattiva") {
      if (chiusura.cancellatiAt) {
        return NextResponse.json(
          { error: "I dati del percorso sono già stati cancellati: gli accessi non si riattivano." },
          { status: 409 },
        );
      }
      await scriviConfig(client, { [CHIAVE_PERCORSO_CHIUSO]: "" }, chiamante.id);
      return NextResponse.json({ success: true, chiusura: await leggiChiusuraPercorso(client) });
    }

    if (body.azione !== "cancella") {
      return NextResponse.json({ error: "Azione non prevista." }, { status: 400 });
    }

    if (!chiusura.chiusoAt) {
      return NextResponse.json(
        { error: "Prima disattiva gli accessi: la cancellazione si fa a percorso chiuso." },
        { status: 409 },
      );
    }

    const piano = await calcolaPiano(client);

    // 1. Le riflessioni, per prime. Dopo, cancellato l'account, non ci
    //    sarebbe piu modo di sapere di chi erano, e un vincolo verso
    //    `auth.users` che non vediamo (la tabella non ha migrazione) potrebbe
    //    impedire la cancellazione dell'account.
    if (!piano.tabelle_assenti.includes("lesson_submissions")) {
      for (const blocco of blocchi(piano.utentiRiflessioni)) {
        const { error } = await client.from("lesson_submissions").delete().in("user_id", blocco);
        if (error) throw new Error(`lesson_submissions: ${error.message}`);
      }
    }

    // 2. Gli account, prima delle righe del percorso. L'ordine conta: le
    //    righe sono l'unico registro di quali account appartengono al
    //    percorso. Se si cancellassero prima e qualche account fallisse, un
    //    secondo tentativo non li troverebbe piu e resterebbero per sempre.
    //    Cosi invece, se qualcosa va storto, le righe sono ancora li e il
    //    comando si puo ripetere.
    const falliti: string[] = [];
    for (const blocco of blocchi(piano.daCancellare, 8)) {
      const esiti = await Promise.all(
        blocco.map(async (id) => {
          const { error } = await client.auth.admin.deleteUser(id);
          // Gia cancellato da un tentativo precedente: va bene cosi.
          if (error && (error as { status?: number }).status !== 404) {
            console.error("Licei chiusura deleteUser error:", id, error);
            return error.message;
          }
          return null;
        }),
      );
      for (const e of esiti) if (e) falliti.push(e);
    }
    if (falliti.length > 0) {
      return NextResponse.json(
        {
          error: `${falliti.length} account non sono stati cancellati (${falliti[0]}). I dati del percorso sono rimasti al loro posto: ripeti il comando, e se l'errore resta segnalalo allo sviluppo.`,
        },
        { status: 500 },
      );
    }

    // 3. I dati del percorso. Le schede e i commissari prima, poi le
    //    adesioni, che in cascata portano via iscrizioni, squadre, progetti e
    //    le schede rimaste. Le ultime tre cancellazioni a tappeto raccolgono
    //    righe orfane, se mai ce ne fossero: la cascata dovrebbe averle gia
    //    tolte tutte.
    const tabelle = [
      "licei_valutazioni",
      "licei_commissari",
      "licei_adesioni",
      "licei_progetti",
      "licei_squadre",
      "licei_iscrizioni",
    ];
    for (const tabella of tabelle) {
      const { error } = await client.from(tabella).delete().not("id", "is", null);
      if (error) throw new Error(`${tabella}: ${error.message}`);
    }

    // 4. Il registro: quando, e quanto. Solo numeri, perche `licei_config`
    //    e leggibile da chiunque.
    const esito: EsitoCancellazione = {
      ...piano.conteggi,
      account_cancellati: piano.account.da_cancellare,
      account_mantenuti: piano.account.mantenuti,
      mantenuti_per_motivo: piano.account.mantenuti_per_motivo,
    };
    await scriviConfig(
      client,
      {
        [CHIAVE_DATI_CANCELLATI]: new Date().toISOString(),
        [CHIAVE_ESITO_CANCELLAZIONE]: JSON.stringify(esito),
      },
      chiamante.id,
    );

    return NextResponse.json({ success: true, chiusura: await leggiChiusuraPercorso(client) });
  } catch (err) {
    console.error("Licei chiusura error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Operazione non riuscita." },
      { status: 500 },
    );
  }
}
