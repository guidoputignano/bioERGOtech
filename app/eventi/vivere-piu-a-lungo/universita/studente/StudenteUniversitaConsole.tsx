"use client";

/**
 * Area del partecipante al percorso universitario.
 *
 * Quattro cose, nell'ordine in cui servono: la squadra, la bacheca di chi
 * ne cerca una, il progetto e il mentor quando c'e. L'ordine non e
 * decorativo: senza squadra non esiste un progetto da scrivere, e la pagina
 * lo dice invece di mostrare un modulo che non si potrebbe salvare.
 *
 * La differenza vera rispetto al gemello dei licei sta in mezzo, ed e la
 * bacheca. Li la squadra si forma in classe e il codice basta, perche gira
 * fra banchi che si conoscono da anni. Qui la candidatura e individuale e
 * arriva da atenei diversi, quindi il caso normale e arrivare senza
 * conoscere nessuno: la bacheca, la richiesta e l'elenco delle discipline
 * dei compagni sono il modo in cui l'interdisciplinarita dell'art. 2 puo
 * succedere davvero invece di restare un augurio.
 *
 * Il modulo di consegna non e un questionario: e la griglia dell'art. 7
 * girata in domande, e sopra ogni campo c'e scritto quale criterio alimenta
 * e quanto pesa. Chi sa che l'integrazione fra le due discipline vale 15
 * punti su 100 la scrive; chi non lo sa la salta e perde quei punti senza
 * capire perche.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AMBITI_PROGETTO,
  BOARD_NOTA_AIUTO,
  BOARD_NOTA_MAX,
  BOARD_NOTA_PRIVACY,
  CAMPI_PROGETTO_UNIVERSITA,
  CONSENSO_BOARD_TESTO,
  CORSO_PATH,
  CRITERI_UNIVERSITA,
  NOTA_CONSEGNA_UNIVERSITA,
  NOTA_MATERIALI_UNIVERSITA,
  NOTA_RICHIESTE,
  NOTA_SQUADRA_INTERDISCIPLINARE,
  PUNTEGGIO_MASSIMO,
  RICHIESTA_MESSAGGIO_MAX,
  SQUADRA_MAX,
  SQUADRA_MIN,
  SQUADRA_NOME_MAX,
  STUDENTE_INTRO,
  STUDENTE_PATH,
  TITOLO_MAX_UNIVERSITA,
  UNIVERSITA_PATH,
  areaLabel,
  livelloLabel,
  ruoloMentorLabel,
  statoProgettoColoreUniversita,
  statoProgettoLabelUniversita,
  statoRichiestaColore,
  statoRichiestaLabel,
} from "../content";
import { completezzaProgetto, type ProgettoInput } from "@/lib/eventi/universita-squadre";

// Le rotte tornano righe intere delle loro tabelle, e le colonne le decide
// la migrazione: ricopiarne qui l'elenco creerebbe un secondo posto da
// aggiornare a ogni colonna nuova, che e esattamente il posto che nessuno
// aggiorna.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const boxStyle: React.CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
  background: "#fff",
  color: "var(--text-dark)",
  width: "100%",
};

/**
 * I due riquadri di servizio del modulo, verde e ambra. Stanno qui una
 * volta sola perche compaiono in sei punti diversi e devono essere lo
 * stesso riquadro: un avviso che cambia colore da una scheda all'altra
 * sembra un altro tipo di avviso.
 */
const NOTA_OK: React.CSSProperties = {
  background: "#ECFAF6",
  border: "1px solid #B4E3D8",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  color: "#08594A",
};

const NOTA_ATTESA: React.CSSProperties = {
  background: "#FFF8E6",
  border: "1px solid #F0D89B",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 13.5,
  color: "#75570F",
  lineHeight: 1.6,
};

const rigaStyle: React.CSSProperties = {
  padding: "12px 0",
  borderTop: "1px solid var(--border-color)",
};

const etichettaStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  color: "var(--text-dark)",
};

const aiutoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-light)",
  margin: "3px 0 2px",
  lineHeight: 1.55,
};

const VUOTO: ProgettoInput = {
  titolo: "",
  ambito: "",
  ipotesi: "",
  stato_arte: "",
  metodo: "",
  integrazione: "",
  impatto: "",
  etica: "",
  link_materiali: "",
};

/**
 * Dalla riga del progetto ai campi del modulo, uno per uno.
 *
 * Copiare la riga cosi com'e sarebbe piu corto, ma porterebbe dentro anche
 * i `null` delle colonne facoltative, e un `null` in un campo controllato
 * di React e il modo piu breve per ritrovarsi un riquadro che smette di
 * rispondere senza dire perche.
 */
function bozzaDaProgetto(progetto: Qualsiasi): ProgettoInput {
  if (!progetto) return { ...VUOTO };
  const bozza: ProgettoInput = {
    ...VUOTO,
    titolo: progetto.titolo ?? "",
    ambito: progetto.ambito ?? "",
    link_materiali: progetto.link_materiali ?? "",
  };
  for (const c of CAMPI_PROGETTO_UNIVERSITA) {
    bozza[c.campo] = progetto[c.campo] ?? "";
  }
  return bozza;
}

/** La disciplina di una persona, con il campo libero quando ha scelto "altro". */
function disciplina(p: Qualsiasi): string {
  return p?.area === "altro" && p?.area_altro ? p.area_altro : areaLabel(p?.area ?? "");
}

function Pillola({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: "var(--primary-light)",
        color: "var(--primary-dark)",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function BadgeRichiesta({ stato }: { stato: string }) {
  const colore = statoRichiestaColore(stato);
  return (
    <span className="badge" style={{ background: `${colore}1A`, color: colore, fontSize: 11 }}>
      {statoRichiestaLabel(stato)}
    </span>
  );
}

/**
 * La scheda di una persona, uguale in bacheca e sotto una richiesta
 * ricevuta.
 *
 * E' possibile perche la rotta manda `richiedente` con esattamente la
 * stessa forma di una riga di `persone`: chi decide su una richiesta legge
 * le stesse cose che avrebbe letto in bacheca, e non deve fidarsi di un
 * riassunto piu povero proprio nel momento in cui deve dire di si o di no.
 */
function SchedaPersona({ persona, azione }: { persona: Qualsiasi; azione?: ReactNode }) {
  // `richiedente` puo arrivare nullo quando la candidatura dietro la
  // richiesta non c'e piu. Capita di rado, ma un riquadro con due spazi al
  // posto del nome e peggio di una riga che dice che cosa e successo.
  const nominativo = persona?.nome
    ? `${persona.nome} ${persona.cognome ?? ""}`.trim()
    : "Partecipante non più in elenco";
  return (
    <div style={rigaStyle}>
      <div className="flex flex-wrap items-center gap-2">
        <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-dark)" }}>
          {nominativo}
        </span>
        {persona?.area && <Pillola>{disciplina(persona)}</Pillola>}
      </div>
      {persona?.universita && (
        <p style={{ fontSize: 12.5, color: "var(--text-mid)", margin: "4px 0 0" }}>
          {persona.universita} . {persona.corso_studi} . {livelloLabel(persona.livello)}
        </p>
      )}
      {persona?.board_nota && (
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-dark)",
            whiteSpace: "pre-wrap",
            lineHeight: 1.65,
            margin: "8px 0 0",
          }}
        >
          {persona.board_nota}
        </p>
      )}
      {azione}
    </div>
  );
}

/**
 * Quale parte mostrare. La pagina autonoma le mostra tutte; dentro il corso
 * ogni lezione mostra la sua, cosi il partecipante trova la squadra dove gli
 * si chiede di formarla, la bacheca dove gli si dice che esiste e la
 * consegna dove gli si chiede di consegnare.
 */
export type SezioneStudenteUniversita = "tutto" | "squadra" | "board" | "progetto";

export function StudenteUniversitaConsole({
  sezione = "tutto",
  intestazione = true,
}: {
  sezione?: SezioneStudenteUniversita;
  intestazione?: boolean;
} = {}) {
  // Le quattro sezioni diventano tre interruttori qui in cima: "tutto" non
  // e una sezione ma il caso in cui ci sono tutte, e risolverlo una volta
  // sola evita di ripetere il confronto in dieci punti del markup.
  const mostraSquadra = sezione === "tutto" || sezione === "squadra";
  const mostraBoard = sezione === "tutto" || sezione === "board";
  const mostraProgetto = sezione === "tutto" || sezione === "progetto";

  const [dati, setDati] = useState<Qualsiasi>(null);
  const [bacheca, setBacheca] = useState<Qualsiasi>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);

  const [nomeSquadra, setNomeSquadra] = useState("");
  const [codiceEntra, setCodiceEntra] = useState("");
  const [copiato, setCopiato] = useState(false);

  const [cercaSquadra, setCercaSquadra] = useState(false);
  const [consensoBoard, setConsensoBoard] = useState(false);
  const [boardNota, setBoardNota] = useState("");
  const [cercaMembri, setCercaMembri] = useState(false);
  const [cercaNota, setCercaNota] = useState("");

  // Quale scheda della bacheca ha il messaggio aperto. Un riquadro di testo
  // sotto ogni persona renderebbe l'elenco illeggibile proprio mentre serve
  // a scorrere venti nomi: si apre solo quello a cui si sta bussando.
  const [aperto, setAperto] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState("");

  const [bozza, setBozza] = useState<ProgettoInput>(VUOTO);
  const [salvato, setSalvato] = useState(false);

  /**
   * Quale progetto sta dentro il modulo in questo momento.
   *
   * Serve a non riscrivere la bozza sotto le dita di chi sta scrivendo. Su
   * una pagina sola convivono la bacheca e il modulo di consegna: se
   * accettare una richiesta ricaricasse anche i sei campi, una risposta
   * data mentre si scrive il metodo cancellerebbe il metodo. Il modulo si
   * riempie solo quando il progetto cambia davvero, cioe quando si entra in
   * una squadra o se ne esce.
   */
  const progettoCaricato = useRef<string | null>(null);

  /**
   * Un solo posto in cui lo stato entra nella console.
   *
   * La GET e la risposta di ogni mutazione delle squadre hanno la stessa
   * forma, quindi dopo un'azione non si rilegge: si sostituisce. `config`
   * pero arriva solo con la GET, e va tenuto, altrimenti alla prima
   * mutazione la console dimenticherebbe quali fasi sono aperte e si
   * chiuderebbe da sola.
   */
  const applicaStato = useCallback((stato: Qualsiasi) => {
    setDati((p: Qualsiasi) => ({
      candidatura: stato.candidatura ?? p?.candidatura ?? null,
      squadra: stato.squadra ?? null,
      membri: stato.membri ?? [],
      progetto: stato.progetto ?? null,
      richieste: stato.richieste ?? { ricevute: [], inviate: [] },
      mentor: stato.mentor ?? [],
      config: stato.config ?? p?.config ?? null,
    }));
    const progettoId: string | null = stato.progetto?.id ?? null;
    if (progettoId !== progettoCaricato.current) {
      progettoCaricato.current = progettoId;
      setBozza(bozzaDaProgetto(stato.progetto));
    }
    if (stato.candidatura) {
      setCercaSquadra(stato.candidatura.cerca_squadra === true);
      setConsensoBoard(stato.candidatura.consenso_board === true);
      setBoardNota(stato.candidatura.board_nota ?? "");
    }
    setCercaMembri(stato.squadra?.cerca_membri === true);
    setCercaNota(stato.squadra?.cerca_nota ?? "");
  }, []);

  /**
   * `silenzioso` serve dopo le due mutazioni che cambiano la squadra senza
   * dire come: accettare una richiesta o un invito. Rileggere e giusto,
   * far tornare la pagina alla riga "Caricamento" no, perche chi ha appena
   * premuto un bottone vedrebbe sparire tutto per mezzo secondo.
   */
  const carica = useCallback(
    async (silenzioso = false) => {
      if (!silenzioso) setLoading(true);
      setErrore(null);
      try {
        const res = await fetch("/api/eventi/universita/squadre", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
        applicaStato(data);

        // La bacheca e l'unica cosa che non sta in quella risposta, e non e
        // una dimenticanza: a bacheca chiusa non c'e nessun elenco da
        // mostrare e la rotta risponde 403. Lo stato della fase arriva
        // insieme al resto, quindi l'elenco si chiede solo quando c'e, e la
        // chiusura si spiega senza chiedere niente a nessuno.
        if (mostraBoard && data.config?.stato_board === "aperta") {
          const risposta = await fetch("/api/eventi/universita/board", { cache: "no-store" });
          const elenco = await risposta.json();
          // Un intoppo sulla bacheca non deve portarsi via la squadra e il
          // progetto, che sono gia a schermo: l'elenco resta vuoto e il
          // pannello lo dice con parole sue.
          setBacheca(risposta.ok ? elenco : null);
        }
      } catch (err) {
        setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
      } finally {
        if (!silenzioso) setLoading(false);
      }
    },
    [applicaStato, mostraBoard],
  );

  useEffect(() => {
    carica();
  }, [carica]);

  /**
   * Un solo canale per gli errori delle mutazioni. Ogni rotta del modulo
   * risponde `{ error }` con un testo gia scritto per una persona, e
   * riscriverlo qui vorrebbe dire perderlo.
   */
  const chiama = async (url: string, method: string, body?: unknown) => {
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      return data;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return null;
    } finally {
      setOccupato(false);
    }
  };

  const candidatura = dati?.candidatura ?? null;
  const squadra = dati?.squadra ?? null;
  const membri: Qualsiasi[] = dati?.membri ?? [];
  const progetto = dati?.progetto ?? null;
  const mentor: Qualsiasi[] = dati?.mentor ?? [];
  const ricevute: Qualsiasi[] = dati?.richieste?.ricevute ?? [];
  const inviate: Qualsiasi[] = dati?.richieste?.inviate ?? [];

  const sonoCapo = candidatura?.squadra_ruolo === "capo";
  const consegnato = progetto?.stato === "consegnato";
  const squadreAperte = dati?.config?.stato_squadre === "aperte";
  const boardAperta = dati?.config?.stato_board === "aperta";
  const consegneAperte = dati?.config?.stato_consegne === "aperte";
  const scadenza: string = dati?.config?.scadenza_consegna_label ?? "";

  // `inviate` sono tutte le righe legate alla propria candidatura, quindi
  // comprendono anche gli inviti che un capitano ha mandato a noi: e
  // `origine` a dire da che parte e partita la stretta di mano, ed e
  // l'unico dato che poi dice chi deve rispondere.
  const mieRichieste = inviate.filter((r) => r.origine === "candidato");
  const invitiRicevuti = inviate.filter((r) => r.origine === "squadra");
  const bussate = ricevute.filter((r) => r.origine === "candidato");
  const invitiMandati = ricevute.filter((r) => r.origine === "squadra");

  const squadreGiaChieste = new Set(
    mieRichieste.filter((r) => r.stato === "in_attesa").map((r) => r.squadra_id),
  );
  const personeGiaInvitate = new Set(
    invitiMandati.filter((r) => r.stato === "in_attesa").map((r) => r.candidatura_id),
  );

  const avanzamento = useMemo(() => completezzaProgetto(bozza), [bozza]);
  const bloccato = consegnato || !consegneAperte;

  /* ── Squadra ── */

  const creaSquadra = async () => {
    const data = await chiama("/api/eventi/universita/squadre", "POST", { nome: nomeSquadra });
    if (data) {
      applicaStato(data);
      setNomeSquadra("");
      setAvviso(
        "Squadra creata. Il codice qui sotto è la strada breve per chi i compagni li ha già: a chi non conosci si manda una richiesta dalla bacheca.",
      );
    }
  };

  const entraSquadra = async () => {
    const data = await chiama("/api/eventi/universita/squadre", "PATCH", { codice: codiceEntra });
    if (data) {
      applicaStato(data);
      setCodiceEntra("");
      setAvviso("Sei entrato nella squadra.");
    }
  };

  const esciSquadra = async () => {
    if (
      !confirm(
        "Esci dalla squadra? Se sei il capitano il ruolo passa a chi è nel percorso da più tempo fra i rimasti. Se sei l'ultimo componente la squadra viene dichiarata sciolta, e il progetto resta scritto ma nessuno può più toccarlo.",
      )
    )
      return;
    const data = await chiama("/api/eventi/universita/squadre", "DELETE");
    if (data) {
      applicaStato(data);
      setAvviso("Sei uscito dalla squadra. Puoi crearne un'altra o chiedere di entrare in una.");
    }
  };

  /* ── Bacheca ── */

  const salvaPresenza = async () => {
    const data = await chiama("/api/eventi/universita/board", "PATCH", {
      cerca_squadra: cercaSquadra,
      consenso_board: consensoBoard,
      board_nota: boardNota,
    });
    if (data?.candidatura) {
      setDati((p: Qualsiasi) => ({
        ...p,
        candidatura: { ...p.candidatura, ...data.candidatura },
      }));
      setAvviso(
        data.candidatura.cerca_squadra
          ? "Sei in bacheca. Gli altri partecipanti vedono quello che hai scritto, mai la tua email."
          : "Non compari più fra chi cerca una squadra.",
      );
    }
  };

  const salvaAnnuncio = async () => {
    const data = await chiama("/api/eventi/universita/board", "PATCH", {
      cerca_membri: cercaMembri,
      cerca_nota: cercaNota,
    });
    if (data?.squadra) {
      setDati((p: Qualsiasi) => ({ ...p, squadra: { ...p.squadra, ...data.squadra } }));
      setAvviso(
        data.squadra.cerca_membri
          ? "La squadra è in bacheca. Chi vuole entrare manda una richiesta, e decidi tu."
          : "La squadra non compare più fra quelle che cercano qualcuno.",
      );
    }
  };

  const chiediDiEntrare = async (squadraBacheca: Qualsiasi) => {
    const data = await chiama("/api/eventi/universita/board", "POST", {
      squadra_id: squadraBacheca.id,
      messaggio,
    });
    if (data?.richiesta) {
      // Il nome della squadra la rotta non lo rimanda, perche a quel punto
      // lo sa gia chi ha premuto il bottone: lo si riattacca qui, cosi la
      // riga appena nata e leggibile come tutte le altre.
      const riga = { ...data.richiesta, squadra_nome: squadraBacheca.nome };
      setDati((p: Qualsiasi) => ({
        ...p,
        richieste: {
          ...p.richieste,
          inviate: [riga, ...(p.richieste?.inviate ?? []).filter((r: Qualsiasi) => r.id !== riga.id)],
        },
      }));
      setAperto(null);
      setMessaggio("");
      setAvviso(
        `Richiesta mandata a ${squadraBacheca.nome}. Appena il capitano risponde ti arriva una email.`,
      );
    }
  };

  const invita = async (persona: Qualsiasi) => {
    const data = await chiama("/api/eventi/universita/board", "POST", {
      candidatura_id: persona.id,
      messaggio,
    });
    if (data?.richiesta) {
      const riga = { ...data.richiesta, richiedente: persona };
      setDati((p: Qualsiasi) => ({
        ...p,
        richieste: {
          ...p.richieste,
          ricevute: [
            riga,
            ...(p.richieste?.ricevute ?? []).filter((r: Qualsiasi) => r.id !== riga.id),
          ],
        },
      }));
      setAperto(null);
      setMessaggio("");
      setAvviso(
        `Invito mandato a ${persona.nome}. Lo trova nella sua area del percorso e decide lui: nessuno entra in squadra senza dire di sì.`,
      );
    }
  };

  const decidi = async (richiesta: Qualsiasi, decisione: string) => {
    if (
      decisione !== "accettata" &&
      !confirm(
        decisione === "ritirata"
          ? "Ritiri la richiesta? Puoi rimandarla più avanti, se cambia qualcosa."
          : "Rifiuti la richiesta? La persona riceve una email, e potrà riprovare più avanti.",
      )
    )
      return;

    const data = await chiama("/api/eventi/universita/board", "PUT", {
      richiesta_id: richiesta.id,
      decisione,
    });
    if (!data?.richiesta) return;

    // Accettare e l'unica decisione che cambia qualcosa d'altro: chi accetta
    // un invito entra in squadra, chi accetta una richiesta si ritrova un
    // compagno in piu, con il suo recapito e la sua disciplina. La risposta
    // porta solo la riga della richiesta, quindi non c'e niente da
    // rattoppare: si rilegge lo stato, in silenzio.
    if (decisione === "accettata") {
      await carica(true);
      setAvviso("Richiesta accettata. La squadra è aggiornata qui sotto.");
      return;
    }

    const aggiorna = (righe: Qualsiasi[]) =>
      righe.map((r) => (r.id === data.richiesta.id ? { ...r, ...data.richiesta } : r));
    setDati((p: Qualsiasi) => ({
      ...p,
      richieste: {
        ricevute: aggiorna(p.richieste?.ricevute ?? []),
        inviate: aggiorna(p.richieste?.inviate ?? []),
      },
    }));
  };

  /* ── Progetto ── */

  const salvaBozza = async () => {
    const data = await chiama("/api/eventi/universita/progetto", "PATCH", bozza);
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, progetto: data.progetto }));
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    }
  };

  const consegna = async () => {
    if (!confirm(`Consegnate il progetto? ${NOTA_CONSEGNA_UNIVERSITA}`)) return;
    // La rotta consegna quello che c'e a database, non quello che il client
    // manda insieme al comando: si salva prima, cosi la consegna vale sulla
    // versione che si ha davanti agli occhi in questo momento.
    const salvataggio = await chiama("/api/eventi/universita/progetto", "PATCH", bozza);
    if (!salvataggio) return;
    const data = await chiama("/api/eventi/universita/progetto", "POST");
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, progetto: data.progetto }));
      setBozza(bozzaDaProgetto(data.progetto));
      setAvviso("Progetto consegnato. Da adesso è in sola lettura, ed è la versione che la Commissione leggerà.");
    }
  };

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  if (errore && !dati) {
    // Incorporata in una lezione la console non mostra niente: chi non e nel
    // percorso universitario sta leggendo il corso per conto suo, e un
    // riquadro d'errore su un bando che non lo riguarda e solo rumore.
    if (sezione !== "tutto") return null;
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Area non disponibile</h2>
        <p className="text-gray-600 mb-5">{errore}</p>
        <Link href={UNIVERSITA_PATH} className="btn-outline inline-block">
          Torna al bando
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {intestazione && (
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ciao {candidatura?.nome}</h1>
          <p className="text-sm text-gray-600">
            {candidatura?.universita} . {candidatura?.corso_studi}
          </p>
          {/* La stessa console vive anche dentro le lezioni, e chi arriva
              qui dal corso deve capire subito che non sono due aree diverse
              con due stati diversi da tenere allineati. */}
          <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7, margin: "10px 0 0" }}>
            {STUDENTE_INTRO}
          </p>
        </div>
      )}

      {avviso && <div style={NOTA_OK}>{avviso}</div>}
      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {/* ══ Senza squadra ══ */}
      {!squadra && mostraSquadra && (
        <>
          <div className="card" style={{ padding: 22 }}>
            <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
              Prima la squadra
            </h2>
            <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: 0 }}>
              Il progetto si sviluppa in squadra, da {SQUADRA_MIN} a {SQUADRA_MAX} persone.{" "}
              {NOTA_SQUADRA_INTERDISCIPLINARE}
            </p>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-light)",
                lineHeight: 1.7,
                margin: "12px 0 0",
              }}
            >
              {NOTA_RICHIESTE}
            </p>
          </div>

          {!squadreAperte && (
            <div style={NOTA_ATTESA}>
              La formazione delle squadre non è ancora aperta, quindi per ora non si può né crearne
              una né entrarci. Nel frattempo il{" "}
              <Link href={CORSO_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                corso
              </Link>{" "}
              è già disponibile, ed è il posto da cui il percorso comincia davvero. Te lo diciamo
              dentro il corso e per email quando si apre, non serve che torni a controllare.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card" style={{ padding: 20 }}>
              <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
                Crea una squadra
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Ne diventi il capitano: sei tu a decidere chi entra, e il codice lo passi a chi
                conosci già.
              </p>
              <Input
                placeholder="Nome della squadra"
                value={nomeSquadra}
                maxLength={SQUADRA_NOME_MAX}
                onChange={(e) => setNomeSquadra(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <Button
                type="button"
                className="w-full"
                disabled={occupato || !squadreAperte || !nomeSquadra.trim()}
                onClick={creaSquadra}
              >
                Crea la squadra
              </Button>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
                Entra con un codice
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Con il codice che ti ha dato chi ha creato la squadra. È nel formato UST- più sei
                caratteri.
              </p>
              <Input
                placeholder="UST-XXXXXX"
                value={codiceEntra}
                onChange={(e) => setCodiceEntra(e.target.value.toUpperCase())}
                style={{ marginBottom: 10, fontFamily: "monospace", letterSpacing: "0.08em" }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={occupato || !squadreAperte || !codiceEntra.trim()}
                onClick={entraSquadra}
              >
                Entra
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ══ Senza squadra, ma la lezione chiede il progetto ══ */}
      {!squadra && !mostraSquadra && mostraProgetto && (
        <div className="card" style={{ padding: 22 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
            Prima la squadra
          </h2>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: 0 }}>
            Il progetto si consegna in squadra, quindi finché non ne hai una non c&apos;è dove
            scriverlo. La formi dalla{" "}
            <Link href={STUDENTE_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
              tua area
            </Link>
            , con un codice se i compagni li hai già o con una richiesta dalla bacheca se stai
            ancora cercando.
          </p>
        </div>
      )}

      {/* ══ Con squadra ══ */}
      {squadra && mostraSquadra && (
        <div className="card" style={{ padding: 22 }}>
          <div
            className="flex flex-wrap items-start justify-between gap-4"
            style={{ marginBottom: 16 }}
          >
            <div>
              <h2 className="font-bold text-gray-800" style={{ fontSize: 18, margin: 0 }}>
                {squadra.nome}
              </h2>
              <p className="text-sm text-gray-600" style={{ margin: "3px 0 0" }}>
                {membri.length} {membri.length === 1 ? "componente" : "componenti"} su {SQUADRA_MAX}
                {membri.length < SQUADRA_MIN && ` . ne serve almeno ${SQUADRA_MIN} per consegnare`}
              </p>
            </div>
            {progetto && (
              <span
                className="badge"
                style={{
                  background: `${statoProgettoColoreUniversita(progetto.stato)}1A`,
                  color: statoProgettoColoreUniversita(progetto.stato),
                }}
              >
                {statoProgettoLabelUniversita(progetto.stato)}
              </span>
            )}
          </div>

          {!consegnato && (
            <div
              style={{
                background: "var(--primary-light)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-mid)",
                  marginBottom: 6,
                }}
              >
                Codice per far entrare chi conosci
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  fontFamily: "monospace",
                  color: "var(--text-dark)",
                  marginBottom: 10,
                }}
              >
                {squadra.codice}
              </div>
              <Button
                type="button"
                variant="outline"
                style={{ height: 34, fontSize: 13 }}
                onClick={() => {
                  navigator.clipboard.writeText(squadra.codice);
                  setCopiato(true);
                  setTimeout(() => setCopiato(false), 2500);
                }}
              >
                {copiato ? "Copiato" : "Copia il codice"}
              </Button>
            </div>
          )}

          {/* L'ateneo e la disciplina di ciascuno non sono un vezzo
              anagrafico: sono il motivo per cui questa squadra esiste, e
              vederli in elenco e il modo piu breve per accorgersi che manca
              il metodo, o la clinica, o la parte computazionale. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {membri.map((m) => (
              <div key={m.id} style={rigaStyle}>
                <div className="flex flex-wrap items-center gap-2">
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-dark)" }}>
                    {m.cognome} {m.nome}
                  </span>
                  {m.squadra_ruolo === "capo" && (
                    <span
                      className="badge"
                      style={{ background: "#0A7A661A", color: "#0A7A66", fontSize: 11 }}
                    >
                      capitano
                    </span>
                  )}
                  <Pillola>{disciplina(m)}</Pillola>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-mid)", margin: "4px 0 0" }}>
                  {m.universita} . {m.corso_studi} . {livelloLabel(m.livello)}
                </p>
                <a
                  href={`mailto:${m.email}`}
                  style={{ fontSize: 12.5, color: "var(--primary-dark)", fontWeight: 600 }}
                >
                  {m.email}
                </a>
              </div>
            ))}
          </div>

          {!consegnato && (
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={esciSquadra}
                disabled={occupato}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 13,
                  color: "var(--text-light)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Esci dalla squadra
              </button>
            </div>
          )}

          {/* ── Annuncio e richieste, solo per il capitano ── */}
          {sonoCapo ? (
            <>
              <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 18, paddingTop: 18 }}>
                <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
                  La squadra cerca qualcuno?
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: "0 0 10px" }}>
                  {NOTA_RICHIESTE}
                </p>

                {!boardAperta && (
                  <div style={{ ...NOTA_ATTESA, marginBottom: 12 }}>
                    La bacheca non è aperta in questo momento, quindi l&apos;annuncio resta spento e
                    non arrivano richieste. Chi conosci può comunque entrare con il codice qui
                    sopra.
                  </div>
                )}

                <label
                  style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={cercaMembri}
                    disabled={!boardAperta || consegnato}
                    onChange={(e) => setCercaMembri(e.target.checked)}
                    style={{
                      marginTop: 3,
                      width: 17,
                      height: 17,
                      flexShrink: 0,
                      accentColor: "var(--primary)",
                    }}
                  />
                  <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-mid)" }}>
                    Mostra la squadra in bacheca, fra quelle che hanno un posto libero. Compaiono il
                    nome, quante persone siete e le discipline che avete dentro, mai il codice.
                  </span>
                </label>

                <textarea
                  value={cercaNota}
                  rows={3}
                  maxLength={BOARD_NOTA_MAX}
                  disabled={!boardAperta || consegnato}
                  placeholder="Che cosa state costruendo e chi vi manca accanto."
                  onChange={(e) => setCercaNota(e.target.value)}
                  style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6, marginTop: 10 }}
                />
                <div style={{ fontSize: 11, color: "var(--text-light)", textAlign: "right" }}>
                  {cercaNota.length} / {BOARD_NOTA_MAX}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={occupato || !boardAperta || consegnato}
                  onClick={salvaAnnuncio}
                  style={{ marginTop: 8 }}
                >
                  Salva l&apos;annuncio
                </Button>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 18, paddingTop: 18 }}>
                <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
                  Chi ha bussato
                </h3>
                {bussate.length === 0 && invitiMandati.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
                    Per ora nessuna richiesta. Se cercate qualcuno, accendete l&apos;annuncio qui
                    sopra: è così che vi si trova.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {bussate.map((r) => (
                      <SchedaPersona
                        key={r.id}
                        persona={r.richiedente ?? {}}
                        azione={
                          <>
                            {r.messaggio && (
                              <p
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-mid)",
                                  fontStyle: "italic",
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.6,
                                  margin: "8px 0 0",
                                }}
                              >
                                {r.messaggio}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 10 }}>
                              {r.stato === "in_attesa" && boardAperta && !consegnato ? (
                                <>
                                  <Button
                                    type="button"
                                    style={{ height: 32, fontSize: 13 }}
                                    disabled={occupato || membri.length >= SQUADRA_MAX}
                                    onClick={() => decidi(r, "accettata")}
                                  >
                                    Accetta
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    style={{ height: 32, fontSize: 13 }}
                                    disabled={occupato}
                                    onClick={() => decidi(r, "rifiutata")}
                                  >
                                    Rifiuta
                                  </Button>
                                  {membri.length >= SQUADRA_MAX && (
                                    <span style={{ fontSize: 12.5, color: "#8A6100" }}>
                                      Siete già in {SQUADRA_MAX}: per accettare qualcuno dovrebbe
                                      prima uscire qualcun altro.
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <BadgeRichiesta stato={r.stato} />
                                  {/* Una richiesta ferma senza bottoni sembra
                                      un guasto: qui si dice perche non si puo
                                      piu rispondere. */}
                                  {r.stato === "in_attesa" && consegnato && (
                                    <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                                      Il progetto è consegnato, e l&apos;elenco degli autori non si
                                      tocca più.
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        }
                      />
                    ))}

                    {invitiMandati.map((r) => (
                      <SchedaPersona
                        key={r.id}
                        persona={r.richiedente ?? {}}
                        azione={
                          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 10 }}>
                            <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                              Invito mandato da voi
                            </span>
                            <BadgeRichiesta stato={r.stato} />
                            {r.stato === "in_attesa" && boardAperta && (
                              <Button
                                type="button"
                                variant="outline"
                                style={{ height: 30, fontSize: 12.5 }}
                                disabled={occupato}
                                onClick={() => decidi(r, "ritirata")}
                              >
                                Ritira
                              </Button>
                            )}
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-light)",
                lineHeight: 1.7,
                margin: "16px 0 0",
              }}
            >
              Le richieste di ingresso arrivano al capitano, che è l&apos;unico che può accettarle:
              se avete in mente qualcuno, ditelo a chi ha creato la squadra.
            </p>
          )}

          {/* Dentro la lezione che chiede di formare la squadra non c'e il
              modulo di consegna sotto: senza questa riga nessuno saprebbe
              dove sia finito. */}
          {!mostraProgetto && (
            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-light)",
                lineHeight: 1.7,
                margin: "14px 0 0",
              }}
            >
              Il progetto si scrive e si consegna nell&apos;ultima lezione del corso, oppure dalla{" "}
              <Link href={STUDENTE_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                tua area
              </Link>
              . Qui c&apos;è la squadra.
            </p>
          )}
        </div>
      )}

      {/* ══ Bacheca ══ */}
      {mostraBoard && !boardAperta && (
        <div className="card" style={{ padding: 22 }}>
          <h2 className="font-semibold text-gray-800 mb-2" style={{ fontSize: 16 }}>
            La bacheca dei partecipanti
          </h2>
          <div style={NOTA_ATTESA}>
            La bacheca non è aperta in questo momento, quindi non c&apos;è nessun elenco da
            mostrare e non si possono mandare richieste. Apre insieme alle squadre, o poco prima.
            Intanto il{" "}
            <Link href={CORSO_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
              corso
            </Link>{" "}
            è già disponibile, e se i compagni li conosci già potete formare la squadra con il
            codice senza aspettare.
          </div>
        </div>
      )}

      {mostraBoard && boardAperta && (
        <>
          {/* ── La propria presenza ── */}
          <div className="card" style={{ padding: 22 }}>
            <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
              La tua presenza in bacheca
            </h2>
            <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 14px" }}>
              {BOARD_NOTA_PRIVACY}
            </p>

            <label style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consensoBoard}
                onChange={(e) => setConsensoBoard(e.target.checked)}
                style={{
                  marginTop: 3,
                  width: 17,
                  height: 17,
                  flexShrink: 0,
                  accentColor: "var(--primary)",
                }}
              />
              <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-mid)" }}>
                {CONSENSO_BOARD_TESTO}
              </span>
            </label>

            <label
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                cursor: squadra ? "default" : "pointer",
                marginTop: 12,
              }}
            >
              <input
                type="checkbox"
                checked={cercaSquadra}
                disabled={!!squadra}
                onChange={(e) => setCercaSquadra(e.target.checked)}
                style={{
                  marginTop: 3,
                  width: 17,
                  height: 17,
                  flexShrink: 0,
                  accentColor: "var(--primary)",
                }}
              />
              <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-mid)" }}>
                Sto cercando una squadra, mostratemi in elenco.
                {squadra && " Sei già in una squadra, quindi per ora non compari fra chi ne cerca una."}
              </span>
            </label>

            <div style={{ marginTop: 14 }}>
              <label htmlFor="board_nota" style={etichettaStyle}>
                La tua nota
              </label>
              <p style={aiutoStyle}>{BOARD_NOTA_AIUTO}</p>
              <textarea
                id="board_nota"
                value={boardNota}
                rows={4}
                maxLength={BOARD_NOTA_MAX}
                onChange={(e) => setBoardNota(e.target.value)}
                style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              <div style={{ fontSize: 11, color: "var(--text-light)", textAlign: "right" }}>
                {boardNota.length} / {BOARD_NOTA_MAX}
              </div>
            </div>

            <Button type="button" disabled={occupato} onClick={salvaPresenza} style={{ marginTop: 6 }}>
              Salva
            </Button>
          </div>

          {/* ── Chi cerca una squadra ── */}
          <div className="card" style={{ padding: 22 }}>
            <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
              Chi cerca una squadra
            </h2>
            <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 4px" }}>
              Partecipanti confermati che hanno chiesto di comparire qui. Gli inviti li manda il
              capitano di una squadra, e chi li riceve decide.
            </p>

            {!bacheca ? (
              <div style={{ ...NOTA_ATTESA, marginTop: 12 }}>
                L&apos;elenco non è raggiungibile in questo momento. Riprova fra poco: la squadra e
                il progetto qui sopra restano al loro posto.
              </div>
            ) : (bacheca.persone ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7, margin: "10px 0 0" }}>
                Per ora non c&apos;è nessuno in elenco. Mettiti in bacheca qui sopra: chi arriva
                dopo di te ti trova, e le squadre che cercano competenze come le tue anche.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(bacheca.persone ?? []).map((p: Qualsiasi) => (
                  <SchedaPersona
                    key={p.id}
                    persona={p}
                    azione={
                      <div style={{ marginTop: 10 }}>
                        {personeGiaInvitate.has(p.id) ? (
                          <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                            Invito già mandato, in attesa di risposta.
                          </span>
                        ) : sonoCapo && !consegnato ? (
                          aperto === `persona:${p.id}` ? (
                            <>
                              <textarea
                                value={messaggio}
                                rows={3}
                                maxLength={RICHIESTA_MESSAGGIO_MAX}
                                placeholder="Perché la vorresti in squadra, e su che cosa state lavorando."
                                onChange={(e) => setMessaggio(e.target.value)}
                                style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
                              />
                              <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                                <Button
                                  type="button"
                                  style={{ height: 32, fontSize: 13 }}
                                  disabled={occupato || membri.length >= SQUADRA_MAX}
                                  onClick={() => invita(p)}
                                >
                                  Manda l&apos;invito
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  style={{ height: 32, fontSize: 13 }}
                                  onClick={() => {
                                    setAperto(null);
                                    setMessaggio("");
                                  }}
                                >
                                  Annulla
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              style={{ height: 32, fontSize: 13 }}
                              disabled={occupato || membri.length >= SQUADRA_MAX}
                              onClick={() => {
                                setAperto(`persona:${p.id}`);
                                setMessaggio("");
                              }}
                            >
                              Invitalo nella tua squadra
                            </Button>
                          )
                        ) : (
                          <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                            {squadra
                              ? "Gli inviti li manda il capitano della squadra."
                              : "State cercando entrambi: create una squadra in due, e da lì potrete invitare chi vi manca."}
                          </span>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Le squadre con un posto libero ── */}
          <div className="card" style={{ padding: 22 }}>
            <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
              Le squadre con un posto libero
            </h2>
            <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 4px" }}>
              Le discipline già dentro dicono più del nome: cerca quella in cui manchi tu.
            </p>

            {!bacheca ? (
              <div style={{ ...NOTA_ATTESA, marginTop: 12 }}>
                L&apos;elenco non è raggiungibile in questo momento. Riprova fra poco.
              </div>
            ) : (bacheca.squadre ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7, margin: "10px 0 0" }}>
                Nessuna squadra sta cercando in questo momento. Puoi crearne una tu e accendere
                l&apos;annuncio: è il modo più rapido per farsi trovare.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(bacheca.squadre ?? []).map((s: Qualsiasi) => (
                  <div key={s.id} style={rigaStyle}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-dark)" }}>
                        {s.nome}
                      </span>
                      <span style={{ fontSize: 12.5, color: "var(--text-mid)" }}>
                        {s.componenti} su {SQUADRA_MAX}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
                      {(s.aree ?? []).map((a: string) => (
                        <Pillola key={a}>{areaLabel(a)}</Pillola>
                      ))}
                    </div>
                    {s.cerca_nota && (
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "var(--text-dark)",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.65,
                          margin: "8px 0 0",
                        }}
                      >
                        {s.cerca_nota}
                      </p>
                    )}
                    <div style={{ marginTop: 10 }}>
                      {squadra ? (
                        <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                          Sei già in una squadra. Per chiederne un&apos;altra dovresti prima uscire
                          da questa.
                        </span>
                      ) : squadreGiaChieste.has(s.id) ? (
                        <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                          Richiesta già mandata, in attesa di risposta.
                        </span>
                      ) : aperto === `squadra:${s.id}` ? (
                        <>
                          <textarea
                            value={messaggio}
                            rows={3}
                            maxLength={RICHIESTA_MESSAGGIO_MAX}
                            placeholder="Chi sei, che cosa porti, perché proprio questa squadra."
                            onChange={(e) => setMessaggio(e.target.value)}
                            style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
                          />
                          <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                            <Button
                              type="button"
                              style={{ height: 32, fontSize: 13 }}
                              disabled={occupato}
                              onClick={() => chiediDiEntrare(s)}
                            >
                              Manda la richiesta
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              style={{ height: 32, fontSize: 13 }}
                              onClick={() => {
                                setAperto(null);
                                setMessaggio("");
                              }}
                            >
                              Annulla
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          style={{ height: 32, fontSize: 13 }}
                          disabled={occupato}
                          onClick={() => {
                            setAperto(`squadra:${s.id}`);
                            setMessaggio("");
                          }}
                        >
                          Chiedi di entrare
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Le proprie richieste, e gli inviti ricevuti ── */}
          <div className="card" style={{ padding: 22 }}>
            <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
              Le tue richieste
            </h2>
            {mieRichieste.length === 0 && invitiRicevuti.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7, margin: "10px 0 0" }}>
                Non hai richieste in corso. Quando ne mandi una la trovi qui, con la risposta appena
                arriva.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {mieRichieste.map((r) => (
                  <div key={r.id} style={rigaStyle}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                        {r.squadra_nome ?? "Squadra"}
                      </span>
                      <BadgeRichiesta stato={r.stato} />
                    </div>
                    {r.messaggio && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-mid)",
                          fontStyle: "italic",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                          margin: "6px 0 0",
                        }}
                      >
                        {r.messaggio}
                      </p>
                    )}
                    {r.stato === "in_attesa" && (
                      <Button
                        type="button"
                        variant="outline"
                        style={{ height: 30, fontSize: 12.5, marginTop: 8 }}
                        disabled={occupato}
                        onClick={() => decidi(r, "ritirata")}
                      >
                        Ritira la richiesta
                      </Button>
                    )}
                  </div>
                ))}

                {invitiRicevuti.map((r) => (
                  <div key={r.id} style={rigaStyle}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                        Invito da {r.squadra_nome ?? "una squadra"}
                      </span>
                      <BadgeRichiesta stato={r.stato} />
                    </div>
                    {r.messaggio && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-mid)",
                          fontStyle: "italic",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                          margin: "6px 0 0",
                        }}
                      >
                        {r.messaggio}
                      </p>
                    )}
                    {r.stato === "in_attesa" && !squadra && (
                      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                        <Button
                          type="button"
                          style={{ height: 32, fontSize: 13 }}
                          disabled={occupato}
                          onClick={() => decidi(r, "accettata")}
                        >
                          Accetta e entra
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          style={{ height: 32, fontSize: 13 }}
                          disabled={occupato}
                          onClick={() => decidi(r, "rifiutata")}
                        >
                          Rifiuta
                        </Button>
                      </div>
                    )}
                    {r.stato === "in_attesa" && squadra && (
                      <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "8px 0 0" }}>
                        Sei già in una squadra: per accettare questo invito dovresti prima uscire
                        da quella in cui sei.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ Progetto ══ */}
      {squadra && mostraProgetto && (
        <div className="card" style={{ padding: 22 }}>
          <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 6 }}>
            <h2 className="font-semibold text-gray-800" style={{ fontSize: 16, margin: 0 }}>
              Il progetto
            </h2>
            <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
              {avanzamento.fatti} di {avanzamento.totale} campi compilati
            </span>
          </div>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 18 }}>
            Sotto ogni domanda c&apos;è scritto quale criterio dell&apos;art. 7 alimenta, con i suoi
            punti. Non è un dettaglio burocratico: è la griglia con cui la Commissione vi leggerà, e
            sapere quanto pesa ogni risposta vi dice dove spendere il tempo.
          </p>

          {consegnato && (
            <div style={{ ...NOTA_OK, marginBottom: 18 }}>
              Progetto consegnato
              {progetto?.consegnato_at
                ? ` il ${new Date(progetto.consegnato_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : ""}
              . Da questo momento è in sola lettura, ed è la versione che la Commissione legge. Se
              c&apos;è un problema, scrivete a info@bioergotech.org.
            </div>
          )}

          {!consegnato && !consegneAperte && (
            <div style={{ ...NOTA_ATTESA, marginBottom: 18 }}>
              Le consegne non sono aperte in questo momento, quindi il modulo è in sola lettura e
              non si può salvare.
              {scadenza
                ? ` Il termine era il ${scadenza}.`
                : " Nel frattempo potete tenere il testo dove lo state scrivendo, e incollarlo qui appena si apre."}
            </div>
          )}

          {!consegnato && consegneAperte && scadenza && (
            <div style={{ ...NOTA_OK, marginBottom: 18 }}>Termine per la consegna: {scadenza}.</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label htmlFor="titolo" style={etichettaStyle}>
                Titolo del progetto
              </label>
              <Input
                id="titolo"
                value={bozza.titolo}
                maxLength={TITOLO_MAX_UNIVERSITA}
                disabled={bloccato}
                onChange={(e) => setBozza({ ...bozza, titolo: e.target.value })}
                style={{ marginTop: 6 }}
              />
            </div>

            <div>
              <label htmlFor="ambito" style={etichettaStyle}>
                Ambito
              </label>
              <p style={aiutoStyle}>
                Su quale dei quattro ambiti dell&apos;art. 1 interviene il progetto.
              </p>
              <select
                id="ambito"
                value={bozza.ambito}
                disabled={bloccato}
                onChange={(e) => setBozza({ ...bozza, ambito: e.target.value })}
                style={{ ...boxStyle, height: 42 }}
              >
                <option value="">Scegli un ambito</option>
                {AMBITI_PROGETTO.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {CAMPI_PROGETTO_UNIVERSITA.map((c) => {
              const criterio = CRITERI_UNIVERSITA.find((k) => k.nome === c.criterio);
              const valore = bozza[c.campo] ?? "";
              return (
                <div key={c.campo}>
                  <label htmlFor={c.campo} style={etichettaStyle}>
                    {c.label}
                  </label>
                  <p style={aiutoStyle}>{c.aiuto}</p>
                  {criterio && (
                    <p style={{ fontSize: 11.5, color: "#0A7A66", fontWeight: 600, margin: "0 0 6px" }}>
                      Criterio: {criterio.nome} . {criterio.punti} punti su {PUNTEGGIO_MASSIMO}
                    </p>
                  )}
                  <textarea
                    id={c.campo}
                    value={valore}
                    rows={5}
                    maxLength={c.max}
                    disabled={bloccato}
                    onChange={(e) => setBozza({ ...bozza, [c.campo]: e.target.value })}
                    style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: "var(--text-light)", textAlign: "right" }}>
                    {valore.length} / {c.max}
                  </div>
                </div>
              );
            })}

            <div>
              <label htmlFor="link" style={etichettaStyle}>
                Link ai materiali (facoltativo)
              </label>
              <p style={aiutoStyle}>{NOTA_MATERIALI_UNIVERSITA}</p>
              <Input
                id="link"
                placeholder="https://"
                value={bozza.link_materiali ?? ""}
                disabled={bloccato}
                onChange={(e) => setBozza({ ...bozza, link_materiali: e.target.value })}
              />
            </div>
          </div>

          {!consegnato && (
            <>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--text-light)",
                  lineHeight: 1.7,
                  margin: "20px 0 14px",
                }}
              >
                {NOTA_CONSEGNA_UNIVERSITA}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={occupato || !consegneAperte}
                  onClick={salvaBozza}
                >
                  {salvato ? "Salvato" : "Salva la bozza"}
                </Button>
                {/* Consegna chiunque sia in squadra, non il solo capitano: il
                    gruppo puo stare in tre citta diverse, e far dipendere da
                    una persona sola l'unico atto che non si puo rimandare
                    significherebbe perdere lavori finiti per un treno in
                    ritardo. */}
                <Button
                  type="button"
                  disabled={occupato || !consegneAperte || membri.length < SQUADRA_MIN}
                  onClick={consegna}
                >
                  Consegna il progetto
                </Button>
              </div>

              {membri.length < SQUADRA_MIN && (
                <p style={{ fontSize: 12.5, color: "#8A6100", marginTop: 10, marginBottom: 0 }}>
                  Per consegnare servono almeno {SQUADRA_MIN} componenti: l&apos;art. 4 parla di
                  team, e una persona sola non è un team. Usate la bacheca per trovare chi manca.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ Mentor ══ */}
      {squadra && mostraProgetto && mentor.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
            {mentor.length === 1 ? "Il vostro mentor" : "I vostri mentor"}
          </h2>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 4px" }}>
            L&apos;abbinamento lo propone la Fondazione in base all&apos;area del progetto. Il
            progetto resta vostro: un mentor apre una strada, segnala un metodo che non regge,
            indica la letteratura che manca.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mentor.map((m) => (
              <div key={m.id} style={rigaStyle}>
                <div className="flex flex-wrap items-center gap-2">
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-dark)" }}>
                    {m.nome} {m.cognome}
                  </span>
                  <Pillola>{ruoloMentorLabel(m.ruolo)}</Pillola>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-mid)", margin: "4px 0 0" }}>
                  {m.organizzazione}
                </p>
                <a
                  href={`mailto:${m.email}`}
                  style={{ fontSize: 12.5, color: "var(--primary-dark)", fontWeight: 600 }}
                >
                  {m.email}
                </a>
                {m.nota && (
                  <p
                    style={{
                      fontSize: 13.5,
                      color: "var(--text-dark)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.65,
                      margin: "8px 0 0",
                    }}
                  >
                    {m.nota}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
