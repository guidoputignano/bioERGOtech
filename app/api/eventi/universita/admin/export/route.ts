/**
 * Gli export CSV del percorso universitario.
 *
 * Quattro insiemi di dati e non uno solo: candidature, squadre, progetti e
 * mentor rispondono a quattro domande diverse, e un file unico che le
 * mettesse insieme sarebbe un foglio che nessuno apre due volte. Si sceglie
 * con `?cosa=`, e ogni file ha il suo nome, perche finiscono tutti nella
 * stessa cartella Download.
 *
 * Il BOM in testa e il CRLF non sono un vezzo: senza il primo Excel legge
 * "Università" come "UniversitÃ ", e senza il secondo le celle con un a capo
 * dentro spezzano le righe. Le virgolette raddoppiate sono l'escaping di
 * RFC 4180, che e quello che si aspetta chiunque apra un CSV.
 */

import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { completezzaProgetto } from "@/lib/eventi/universita-squadre";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";
import {
  CAMPI_PROGETTO_UNIVERSITA,
  ambitoLabel,
  areaLabel,
  disponibilitaMentorLabel,
  livelloLabel,
  ruoloMentorLabel,
  statoCandidaturaLabel,
  statoMentorLabel,
  statoProgettoLabelUniversita,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

type Client = SupabaseClient;

/** Cella CSV con escaping RFC 4180. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const riga = (celle: unknown[]): string => celle.map(csvCell).join(",");

/**
 * Il denominatore di "3 campi su 8". Viene dallo stesso helper che li conta,
 * non da un numero scritto a mano qui: se domani l'art. 7 guadagna un
 * criterio, il modulo e l'export cambiano insieme.
 */
const TOTALE_CAMPI_PROGETTO = completezzaProgetto({}).totale;

const siNo = (v: unknown): string => (v ? "sì" : "no");

/* ── Le righe che gli export leggono ──────────────────────────────────── */

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

type RigaSquadra = {
  id: string;
  codice: string;
  nome: string;
  stato: string;
  cerca_membri: boolean;
  cerca_nota: string | null;
  created_at: string;
};

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
  stato: string;
  consegnato_at: string | null;
  vincitore: boolean;
  posizione: number | null;
  note_staff: string | null;
  updated_at: string;
};

type RigaClassifica = {
  progetto_id: string;
  schede: number;
  media_totale: number | null;
  media_innovativita: number | null;
};

type RigaMentor = {
  id: string;
  user_id: string | null;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  ruolo: string;
  organizzazione: string;
  aree: string[] | null;
  bio: string;
  competenze: string;
  disponibilita: string | null;
  sito: string | null;
  linkedin: string | null;
  stato: string;
  origine: string;
  consenso_pubblicazione: boolean;
  consenso_privacy: boolean;
  note_staff: string | null;
  created_at: string;
};

const CAMPI_CANDIDATURA =
  "id, codice, stato, nome, cognome, email, universita, corso_studi, livello, area, area_altro, interessi, user_id, squadra_id, squadra_ruolo, cerca_squadra, consenso_board, board_nota, note_staff, stato_aggiornato_at, created_at";

const CAMPI_SQUADRA = "id, codice, nome, stato, cerca_membri, cerca_nota, created_at";

const CAMPI_PROGETTO =
  "id, squadra_id, titolo, ambito, ipotesi, stato_arte, metodo, integrazione, impatto, etica, link_materiali, stato, consegnato_at, vincitore, posizione, note_staff, updated_at";

/* ── Quello che si ricava dalle candidature ───────────────────────────── */

type DatiSquadra = {
  componenti: string[];
  atenei: Map<string, string>;
  capitano: string | null;
};

/**
 * Componenti, atenei e capitano di ogni squadra, ricavati una volta sola
 * dalle candidature. Gli atenei si contano in minuscolo perche l'art. 2
 * guarda quanti atenei diversi ci sono dentro un team, non quante grafie
 * diverse hanno usato le persone che li hanno scritti a mano.
 */
function datiPerSquadra(candidature: RigaCandidatura[]): Map<string, DatiSquadra> {
  const mappa = new Map<string, DatiSquadra>();
  for (const c of candidature) {
    if (!c.squadra_id) continue;
    const acc = mappa.get(c.squadra_id) ?? {
      componenti: [],
      atenei: new Map<string, string>(),
      capitano: null,
    };
    const persona = `${c.nome} ${c.cognome}`.trim();
    acc.componenti.push(persona);
    const ateneo = (c.universita ?? "").trim();
    if (ateneo) acc.atenei.set(ateneo.toLowerCase(), ateneo);
    if (c.squadra_ruolo === "capo") acc.capitano = persona;
    mappa.set(c.squadra_id, acc);
  }
  return mappa;
}

/* ── I quattro file ───────────────────────────────────────────────────── */

/**
 * Le candidature, una per riga, con le lezioni consegnate accanto.
 *
 * L'avanzamento nel corso e l'unica colonna che non viene da questa tabella
 * ed e quella che serve di piu: dice quali candidati sono entrati davvero e
 * quali hanno un account e non lo hanno mai usato, che e la differenza fra
 * un percorso con trecento iscritti e un percorso con trecento indirizzi.
 */
async function csvCandidature(client: Client): Promise<{ nome: string; righe: string[] }> {
  const [{ data: candidature }, { data: squadre }] = await Promise.all([
    client
      .from("universita_candidature")
      .select(CAMPI_CANDIDATURA)
      .order("created_at", { ascending: true }),
    client.from("universita_squadre").select("id, nome"),
  ]);

  const righeCandidature = (candidature ?? []) as RigaCandidatura[];
  const nomeSquadra = new Map(
    ((squadre ?? []) as { id: string; nome: string }[]).map((s) => [s.id, s.nome]),
  );

  const progresso = await progressoPerUtenti(
    client,
    righeCandidature.map((c) => c.user_id).filter((id): id is string => !!id),
  );

  const righe = [
    riga([
      "Codice", "Stato", "Nome", "Cognome", "Email",
      "Università", "Corso di studi", "Livello", "Area", "Area (altro)",
      "Interessi di ricerca", "Ha un account",
      `Lezioni completate (su ${TOTALE_LEZIONI})`,
      "Squadra", "Ruolo in squadra", "In bacheca", "Consenso bacheca", "Nota di bacheca",
      "Note staff", "Stato aggiornato il", "Candidatura del",
    ]),
  ];

  for (const c of righeCandidature) {
    righe.push(
      riga([
        c.codice,
        statoCandidaturaLabel(c.stato),
        c.nome,
        c.cognome,
        c.email,
        c.universita,
        c.corso_studi,
        livelloLabel(c.livello),
        areaLabel(c.area),
        c.area_altro ?? "",
        c.interessi ?? "",
        siNo(c.user_id),
        c.user_id ? (progresso.get(c.user_id) ?? 0) : 0,
        c.squadra_id ? (nomeSquadra.get(c.squadra_id) ?? "") : "",
        c.squadra_ruolo === "capo" ? "capitano" : c.squadra_ruolo === "membro" ? "membro" : "",
        siNo(c.cerca_squadra),
        siNo(c.consenso_board),
        c.board_nota ?? "",
        c.note_staff ?? "",
        c.stato_aggiornato_at ?? "",
        c.created_at,
      ]),
    );
  }

  return { nome: "candidature-universita", righe };
}

/**
 * Le squadre, con chi c'e dentro e da quanti atenei arrivano.
 *
 * "Atenei diversi" e la colonna che dice se l'art. 2 sta funzionando: un
 * percorso in cui ogni squadra ha un ateneo solo ha raccolto gruppi che si
 * conoscevano gia, e la bacheca non ha fatto il suo lavoro.
 */
async function csvSquadre(client: Client): Promise<{ nome: string; righe: string[] }> {
  const [{ data: squadre }, { data: candidature }, { data: progetti }] = await Promise.all([
    client
      .from("universita_squadre")
      .select(CAMPI_SQUADRA)
      .order("created_at", { ascending: true }),
    client.from("universita_candidature").select(CAMPI_CANDIDATURA),
    client.from("universita_progetti").select("squadra_id, titolo, stato, consegnato_at"),
  ]);

  const dati = datiPerSquadra((candidature ?? []) as RigaCandidatura[]);
  const progettoPerSquadra = new Map(
    ((progetti ?? []) as {
      squadra_id: string;
      titolo: string;
      stato: string;
      consegnato_at: string | null;
    }[]).map((p) => [p.squadra_id, p]),
  );

  const righe = [
    riga([
      "Codice", "Nome", "Stato", "Componenti", "Atenei diversi", "Atenei",
      "Capitano", "Chi c'è dentro", "Cerca componenti", "Nota di ricerca",
      "Progetto", "Stato del progetto", "Consegnato il", "Creata il",
    ]),
  ];

  for (const s of (squadre ?? []) as RigaSquadra[]) {
    const d = dati.get(s.id);
    const atenei = d ? [...d.atenei.values()].sort((a, b) => a.localeCompare(b, "it")) : [];
    const progetto = progettoPerSquadra.get(s.id);
    righe.push(
      riga([
        s.codice,
        s.nome,
        s.stato,
        d?.componenti.length ?? 0,
        atenei.length,
        atenei.join("; "),
        d?.capitano ?? "",
        (d?.componenti ?? []).join("; "),
        siNo(s.cerca_membri),
        s.cerca_nota ?? "",
        progetto?.titolo ?? "",
        progetto ? statoProgettoLabelUniversita(progetto.stato) : "",
        progetto?.consegnato_at ?? "",
        s.created_at,
      ]),
    );
  }

  return { nome: "squadre-universita", righe };
}

/**
 * I progetti, bozze comprese.
 *
 * Le bozze ci sono perche sono la meta del quadro: una squadra ferma a due
 * campi su otto a una settimana dal termine e la sola cosa che il pannello
 * puo vedere in tempo per fare qualcosa. Le medie arrivano dalla classifica
 * e restano vuote per chi non e consegnato, che e esatto: senza consegna
 * non c'e niente da giudicare.
 *
 * Con `?testi=1` si aggiungono i sei campi dell'art. 7 per intero. Non sono
 * nel file di base perche un foglio con sei colonne da millecinquecento
 * caratteri non si legge, ma sono l'unico modo di portare i progetti fuori
 * di qui, e alla Commissione servono.
 */
async function csvProgetti(
  client: Client,
  testi: boolean,
): Promise<{ nome: string; righe: string[] }> {
  const [{ data: progetti }, { data: squadre }, { data: candidature }, { data: classifica }] =
    await Promise.all([
      client
        .from("universita_progetti")
        .select(CAMPI_PROGETTO)
        .order("created_at", { ascending: true }),
      client.from("universita_squadre").select("id, nome, codice"),
      client.from("universita_candidature").select(CAMPI_CANDIDATURA),
      client.rpc("universita_classifica"),
    ]);

  const dati = datiPerSquadra((candidature ?? []) as RigaCandidatura[]);
  const squadraPerId = new Map(
    ((squadre ?? []) as { id: string; nome: string; codice: string }[]).map((s) => [s.id, s]),
  );
  const punteggi = new Map(
    ((classifica ?? []) as RigaClassifica[]).map((r) => [r.progetto_id, r]),
  );

  const intestazioni = [
    "Squadra", "Codice squadra", "Titolo", "Ambito", "Stato",
    "Componenti", "Atenei diversi", `Campi compilati (su ${TOTALE_CAMPI_PROGETTO})`, "Link ai materiali",
    "Schede chiuse", "Media punteggio", "Media innovatività",
    "Vincitore", "Posizione", "Consegnato il", "Note staff", "Aggiornato il",
  ];
  if (testi) intestazioni.push(...CAMPI_PROGETTO_UNIVERSITA.map((c) => c.label));

  const righe = [riga(intestazioni)];

  for (const p of (progetti ?? []) as RigaProgetto[]) {
    const squadra = squadraPerId.get(p.squadra_id);
    const d = dati.get(p.squadra_id);
    const voti = punteggi.get(p.id);
    // Si ricompone l'oggetto invece di passare la riga: a database i campi
    // facoltativi sono `null`, e l'input del validatore parla di stringhe.
    const completezza = completezzaProgetto({
      titolo: p.titolo,
      ambito: p.ambito ?? "",
      ipotesi: p.ipotesi,
      stato_arte: p.stato_arte,
      metodo: p.metodo,
      integrazione: p.integrazione,
      impatto: p.impatto,
      etica: p.etica,
      link_materiali: p.link_materiali ?? "",
    });

    const celle: unknown[] = [
      squadra?.nome ?? "",
      squadra?.codice ?? "",
      p.titolo,
      p.ambito ? ambitoLabel(p.ambito) : "",
      statoProgettoLabelUniversita(p.stato),
      d?.componenti.length ?? 0,
      d?.atenei.size ?? 0,
      completezza.fatti,
      p.link_materiali ?? "",
      voti?.schede ?? "",
      voti?.media_totale ?? "",
      voti?.media_innovativita ?? "",
      siNo(p.vincitore),
      p.posizione ?? "",
      p.consegnato_at ?? "",
      p.note_staff ?? "",
      p.updated_at,
    ];

    if (testi) {
      for (const c of CAMPI_PROGETTO_UNIVERSITA) {
        celle.push(p[c.campo] ?? "");
      }
    }

    righe.push(riga(celle));
  }

  return { nome: "progetti-universita", righe };
}

/**
 * I mentor, con le squadre che seguono.
 *
 * Il telefono c'e e il consenso alla pubblicazione anche, uno accanto
 * all'altro: chi apre questo file deve vedere subito che il recapito serve
 * a organizzare gli incontri e non finisce in nessuna pagina, e che
 * approvato non vuol dire pubblicato.
 */
async function csvMentor(client: Client): Promise<{ nome: string; righe: string[] }> {
  const [{ data: mentor }, { data: assegnazioni }, { data: squadre }] = await Promise.all([
    client.from("universita_mentor").select("*").order("created_at", { ascending: true }),
    client.from("universita_mentor_squadre").select("mentor_id, squadra_id"),
    client.from("universita_squadre").select("id, nome"),
  ]);

  const nomeSquadra = new Map(
    ((squadre ?? []) as { id: string; nome: string }[]).map((s) => [s.id, s.nome]),
  );

  const seguite = new Map<string, string[]>();
  for (const a of (assegnazioni ?? []) as { mentor_id: string; squadra_id: string }[]) {
    const elenco = seguite.get(a.mentor_id) ?? [];
    elenco.push(nomeSquadra.get(a.squadra_id) ?? a.squadra_id);
    seguite.set(a.mentor_id, elenco);
  }

  const righe = [
    riga([
      "Nome", "Cognome", "Email", "Telefono", "Profilo", "Organizzazione",
      "Aree disciplinari", "Presentazione", "Competenze", "Disponibilità",
      "Sito", "LinkedIn", "Stato", "Origine",
      "Consenso alla pubblicazione", "Consenso privacy", "Ha un account",
      "Squadre seguite", "Note staff", "Candidatura del",
    ]),
  ];

  for (const m of (mentor ?? []) as RigaMentor[]) {
    righe.push(
      riga([
        m.nome,
        m.cognome,
        m.email,
        m.telefono ?? "",
        ruoloMentorLabel(m.ruolo),
        m.organizzazione,
        (m.aree ?? []).map((a) => areaLabel(a)).join("; "),
        m.bio,
        m.competenze,
        m.disponibilita ? disponibilitaMentorLabel(m.disponibilita) : "",
        m.sito ?? "",
        m.linkedin ?? "",
        statoMentorLabel(m.stato),
        m.origine === "staff" ? "inserito dallo staff" : "candidatura",
        siNo(m.consenso_pubblicazione),
        siNo(m.consenso_privacy),
        siNo(m.user_id),
        (seguite.get(m.id) ?? []).join("; "),
        m.note_staff ?? "",
        m.created_at,
      ]),
    );
  }

  return { nome: "mentor-universita", righe };
}

/* ── La rotta ─────────────────────────────────────────────────────────── */

const COSE = new Set(["candidature", "squadre", "progetti", "mentor"]);

export async function GET(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const cosa = (searchParams.get("cosa") ?? "candidature").trim();
  const testi = searchParams.get("testi") === "1";

  // Un `cosa` sconosciuto e un 400 e non un ripiego sulle candidature: chi
  // ha sbagliato il parametro sta scaricando un file che crede di aver
  // chiesto, e scoprirlo dal contenuto e il modo peggiore.
  if (!COSE.has(cosa)) {
    return NextResponse.json(
      { error: `Export non previsto: ${cosa}. Sono disponibili: ${[...COSE].join(", ")}.` },
      { status: 400 },
    );
  }

  let esito: { nome: string; righe: string[] };
  try {
    if (cosa === "squadre") esito = await csvSquadre(client);
    else if (cosa === "progetti") esito = await csvProgetti(client, testi);
    else if (cosa === "mentor") esito = await csvMentor(client);
    else esito = await csvCandidature(client);
  } catch (err) {
    console.error("Universita admin export error:", err);
    return NextResponse.json(
      { error: "Non è stato possibile preparare il file." },
      { status: 500 },
    );
  }

  const csv = "﻿" + esito.righe.join("\r\n");
  const data = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${esito.nome}-${data}.csv"`,
    },
  });
}
