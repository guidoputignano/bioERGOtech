"use client";

/**
 * Area riservata del docente referente, e dei docenti del progetto che lui
 * indica.
 *
 * Fa tre cose, e sono le tre che il bando gli chiede: gli mostra il codice
 * da diffondere, gli fa scaricare il modulo di autorizzazione da far firmare
 * alle famiglie, e gli fa confermare le iscrizioni arrivate. L'elenco
 * confermato, esportabile in CSV, e esattamente l'elenco che l'art. 4 chiede
 * all'istituto di trasmettere: il referente non lo compila, lo approva.
 *
 * Prima di tutto, il cancello delle istruzioni: finche il docente non le
 * accetta, la rotta non manda dati di studenti e qui si vede solo
 * `AccettazioneIstruzioni`. Poi due ruoli sullo stesso istituto. Il
 * referente principale ha in piu la scheda dei docenti del progetto e gli
 * export; un docente del progetto vede gli stessi studenti, con le sue
 * classi come filtro di partenza.
 *
 * Il filtro per classe vive qui, in `filtroClassi`: ogni sezione che filtra
 * lo riceve e chiede `corrispondeClasse(filtroClassi, classe)`. Il quadro
 * delle squadre (`QuadroSquadre`) riceve lo stesso filtro e "Aggiorna", che
 * rilegge tutto senza svuotare la pagina.
 *
 * Le riflessioni (`RiflessioniReferente.tsx`) non arrivano con l'elenco: si
 * leggono su un clic, dal bottone sulla riga di uno studente confermato o
 * dalla lettura per lezione, che usa lo stesso filtro per classe. Lo stesso
 * vale per i mentor del percorso (`MentorElenco`, variante "docenti"), che
 * si leggono quando il docente apre la scheda.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ANNI_CORSO,
  ISCRIZIONE_PATH,
  SITE_URL,
  STATI_ISCRIZIONE,
  statoAdesioneColore,
  statoAdesioneLabel,
  GUIDA_PATH,
  STATI_ISCRIZIONE_ATTIVI,
  haFattoAccesso,
  statoIscrizioneColore,
  statoIscrizioneLabel,
  ADESIONE_SCUOLA_PATH,
  INFORMATIVA_SCUOLE_PATH,
  ISTRUZIONI_DOCENTE_PATH,
  ISTRUZIONI_REFERENTE,
  MESSAGGIO_MENTOR_ADESIONE_IN_VERIFICA,
  RIMANDA_TUTTI_MAX,
  RIMANDA_TUTTI_MINUTI,
  RIMANDA_TUTTI_RECENTE_MINUTI,
  STATI_ADESIONE_CHE_ACCETTANO,
} from "../content";
import { generaAutorizzazionePDF } from "./generaAutorizzazione";
import { AccettazioneIstruzioni } from "./AccettazioneIstruzioni";
import { ColleghiDocente, DocentiProgetto } from "./DocentiProgetto";
import { CorreggiEmail } from "./CorreggiEmail";
import { FiltroClasse } from "./FiltroClasse";
import { QuadroSquadre } from "./QuadroSquadre";
import { LinkRiflessioniStudenti, RiflessioniPerLezione, RiflessioniStudente } from "./RiflessioniReferente";
import { MentorElenco } from "../../mentor/MentorElenco";
import type { IscrizioneQuadroInput, SquadraQuadroInput } from "@/lib/eventi/licei-squadre";
import { refusoEmail } from "@/lib/eventi/email-refusi";
import {
  TUTTE_LE_CLASSI,
  corrispondeClasse,
  costruisciFiltro,
  filtroIniziale,
  opzioniClassi,
} from "./filtroPerClasse";
// Solo il tipo: il modulo e del server.
import type { DocentiRisposta } from "@/lib/eventi/licei-docenti";
import {
  INFORMATIVA_IMMAGINI_PATH,
  ISTRUZIONI_SCUOLA,
} from "../../informativa-immagini/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Iscrizione = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Adesione = any;

/** Chi sta guardando: il referente principale o un docente del progetto. */
type Ruolo = "referente" | "docente";
type Io = { id: string | null; nome: string; cognome: string; classi: string[] };
/** Le fasi del percorso, come le legge la rotta: "aperte" o "chiuse". */
type Fasi = { squadre: string; consegne: string };
/** Un talk della serie, con il nome breve dei badge: "Talk del 9 novembre". */
type TalkVoce = { slug: string; etichetta: string };
/** L'esito dell'ultimo rinvio del link a tutti, in soli numeri. */
type EsitoTutti = {
  inviati: number;
  /**
   * Rimasti fuori: oltre il tetto, o con un link di pochi minuti fa (uno
   * nuovo lo annullerebbe). Li raggiunge l'invio successivo.
   */
  saltati: number;
  /** Gia raggiunti da un invio precedente dello stesso ciclo: non restano. */
  giaRaggiunti: number;
  /** Con un indirizzo non valido: nessun invio li raggiunge, va corretto. */
  nonValidi: number;
  errori: number;
  at: string;
  prossimo: string | null;
  nessuno: boolean;
};

const ora = (iso: string): string =>
  new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

const studenti = (n: number): string => `${n} ${n === 1 ? "studente" : "studenti"}`;

export function ReferenteConsole({
  talk = null,
}: {
  /**
   * La scheda del prossimo talk con gli esperti, gia costruita dalla pagina
   * server (`TalkAreaCard`), con il numero degli studenti dell'istituto che
   * si sono iscritti. Compare solo dopo le istruzioni, come il resto.
   */
  talk?: ReactNode;
} = {}) {
  const [adesione, setAdesione] = useState<Adesione | null>(null);
  const [righe, setRighe] = useState<Iscrizione[]>([]);
  const [squadre, setSquadre] = useState<SquadraQuadroInput[]>([]);
  // Il quadro delle squadre: se la rotta non le ha lette, i componenti di
  // un altro istituto (oggi sempre nessuno), e quando sono arrivati i dati.
  const [squadreErrore, setSquadreErrore] = useState(false);
  const [altriIstituti, setAltriIstituti] = useState<IscrizioneQuadroInput[]>([]);
  const [aggiornatoAlle, setAggiornatoAlle] = useState<string | null>(null);
  const [aggiornando, setAggiornando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  // Un insieme, non un id solo: il referente rimanda il link a piu studenti
  // di fila, e con un id solo la conferma sul primo sparirebbe appena tocca
  // il secondo, facendogli credere di non averlo fatto.
  const [rimandati, setRimandati] = useState<Set<string>>(new Set());
  // Vero se la rotta non ha potuto leggere gli accessi: allora nessuno si
  // segna "Mai entrato", perche non lo sappiamo, e la console lo dice.
  const [accessiNonLetti, setAccessiNonLetti] = useState(false);
  // Il link a tutti quelli che non sono mai entrati: da quando si puo
  // ripetere (arriva anche dalla GET, cosi il bottone resta spento dopo un
  // ricaricamento), l'esito dell'ultimo invio, la conferma aperta.
  const [prossimoTutti, setProssimoTutti] = useState<string | null>(null);
  // L'ora dell'ultimo invio a tutti, dalla GET: dopo un ricaricamento, o
  // per un collega, dice perche il bottone e spento.
  const [ultimoTutti, setUltimoTutti] = useState<string | null>(null);
  const [esitoTutti, setEsitoTutti] = useState<EsitoTutti | null>(null);
  const [erroreTutti, setErroreTutti] = useState<string | null>(null);
  const [confermaTutti, setConfermaTutti] = useState(false);
  const [inviandoTutti, setInviandoTutti] = useState(false);
  // Il fuoco segue la conferma, che prende il posto del bottone principale:
  // aperta, va su "Conferma"; chiusa (invio finito o "Annulla"), torna sul
  // bottone principale, o sulla scheda se il bottone e spento, invece di
  // cadere in cima alla pagina.
  const [confermaChiusaTutti, setConfermaChiusaTutti] = useState(0);
  const schedaTuttiRef = useRef<HTMLDivElement>(null);
  const bottoneTuttiRef = useRef<HTMLButtonElement>(null);
  const confermaTuttiRef = useRef<HTMLButtonElement>(null);
  // Il denominatore del "9 su 23" arriva dal server invece di essere scritto
  // qui: le lezioni del corso possono cambiare, e un numero copiato a mano
  // diventerebbe falso senza che nessuno se ne accorga.
  const [totaleLezioni, setTotaleLezioni] = useState(0);
  const [ruolo, setRuolo] = useState<Ruolo>("referente");
  const [io, setIo] = useState<Io>({ id: null, nome: "", cognome: "", classi: [] });
  const [docentiProgetto, setDocentiProgetto] = useState<DocentiRisposta | null>(null);
  const [fasi, setFasi] = useState<Fasi | null>(null);
  // Vero finche il docente non ha accettato la versione in vigore delle
  // istruzioni: allora la rotta non manda studenti e si mostra il cancello.
  const [daAccettare, setDaAccettare] = useState(false);
  // Il valore della select delle classi. Null finche i dati non arrivano:
  // il primo caricamento lo fissa sulle classi del docente, i successivi
  // lasciano la scelta che ha fatto.
  const [valoreFiltro, setValoreFiltro] = useState<string | null>(null);
  // Lo studente di cui sono aperte le riflessioni: uno alla volta, e si
  // leggono solo all'apertura.
  const [riflessioniDi, setRiflessioniDi] = useState<string | null>(null);
  // I talk con gli esperti: quali ci sono, se le iscrizioni si sono lette, e
  // il filtro dell'elenco ("" per tutti, altrimenti lo slug di un talk).
  const [talkElenco, setTalkElenco] = useState<TalkVoce[]>([]);
  const [talkNonLetti, setTalkNonLetti] = useState(false);
  const [filtroTalk, setFiltroTalk] = useState("");
  // La correzione dell'email: di chi e aperta (una alla volta) e l'esito,
  // per riga, che resta finche la pagina non si ricarica.
  const [correggiDi, setCorreggiDi] = useState<string | null>(null);
  const [corrette, setCorrette] = useState<Map<string, string>>(new Map());

  // Con `silenzioso` (il bottone "Aggiorna" del quadro) la pagina resta
  // com'e mentre i dati arrivano: niente "Caricamento" al posto di tutto, e
  // le schede aperte non perdono quello che c'e scritto. Torna il messaggio
  // d'errore, o null.
  const carica = useCallback(async (opzioni?: { silenzioso?: boolean }): Promise<string | null> => {
    const silenzioso = opzioni?.silenzioso === true;
    if (silenzioso) setAggiornando(true);
    else {
      setLoading(true);
      setErrore(null);
    }
    try {
      const res = await fetch("/api/eventi/licei/referente", { cache: "no-store" });
      const data = await res.json();
      // Istruzioni da accettare: arrivano solo istituto e ruolo, quanto
      // basta per intestare la schermata. Nessuno studente.
      if (res.status === 403 && data.istruzioni_accettate === false) {
        setAdesione(data.adesione ?? null);
        setRuolo(data.ruolo === "docente" ? "docente" : "referente");
        setRighe([]);
        setSquadre([]);
        setAltriIstituti([]);
        setDaAccettare(true);
        return null;
      }
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDaAccettare(false);
      setAdesione(data.adesione);
      setRuolo(data.ruolo === "docente" ? "docente" : "referente");
      const ioNuovo: Io = data.io ?? { id: null, nome: "", cognome: "", classi: data.classi ?? [] };
      setIo(ioNuovo);
      setDocentiProgetto(data.docenti_progetto ?? null);
      setFasi(data.fasi ?? null);
      setValoreFiltro((v) => v ?? filtroIniziale(ioNuovo.classi));
      setTotaleLezioni(data.totale_lezioni ?? 0);
      setRighe(data.iscrizioni ?? []);
      setAccessiNonLetti(data.accessi_non_letti === true);
      setTalkElenco(data.talk_elenco ?? []);
      setTalkNonLetti(data.talk_non_letti === true);
      setProssimoTutti(data.rimanda_tutti?.prossimo_invio_at ?? null);
      setUltimoTutti(data.rimanda_tutti?.ultimo_invio_at ?? null);
      setSquadre(data.squadre ?? []);
      setSquadreErrore(data.squadre_errore === true);
      setAltriIstituti(data.componenti_altri_istituti ?? []);
      setAggiornatoAlle(new Date().toISOString());
      return null;
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : "Caricamento non riuscito.";
      if (!silenzioso) setErrore(messaggio);
      return messaggio;
    } finally {
      setLoading(false);
      setAggiornando(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  // Finito il tempo d'attesa, il bottone del rinvio a tutti si riaccende da
  // solo, senza ricaricare la pagina.
  useEffect(() => {
    if (!prossimoTutti) return;
    const t = setTimeout(
      () => setProssimoTutti(null),
      Math.max(0, new Date(prossimoTutti).getTime() - Date.now()) + 500,
    );
    return () => clearTimeout(t);
  }, [prossimoTutti]);

  useEffect(() => {
    if (confermaTutti) confermaTuttiRef.current?.focus();
  }, [confermaTutti]);

  useEffect(() => {
    if (confermaChiusaTutti === 0) return;
    const bottone = bottoneTuttiRef.current;
    if (bottone && !bottone.disabled) bottone.focus();
    else schedaTuttiRef.current?.focus();
  }, [confermaChiusaTutti]);

  const aggiorna = async (id: string, patch: Record<string, unknown>) => {
    setSalvando(id);
    try {
      const res = await fetch("/api/eventi/licei/referente", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      // Si fonde con la riga che c'e: la PATCH torna le colonne della tabella,
      // non account, ultimo accesso e lezioni, che calcola solo la GET.
      setRighe((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.iscrizione } : r)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  const rimandaAccesso = async (id: string) => {
    setSalvando(id);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/referente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, azione: "rimanda_accesso" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invio non riuscito.");
      setRimandati((prev) => new Set(prev).add(id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Invio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  // Il link a tutti quelli che non sono mai entrati. Chi riceve davvero lo
  // decide il server, rileggendo iscrizioni e accessi: qui si manda solo
  // l'azione, e l'esito torna in numeri.
  const rimandaATutti = async () => {
    setInviandoTutti(true);
    setErroreTutti(null);
    // L'esito di prima non vale piu: accanto a un errore nuovo direbbe
    // numeri e un'ora ormai vecchi.
    setEsitoTutti(null);
    try {
      const res = await fetch("/api/eventi/licei/referente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "rimanda_accesso_tutti" }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (!res || !data) {
        // La rete e caduta, o la risposta non e quella della rotta (tempo
        // scaduto, errore della piattaforma): l'invio puo essere partito o
        // no. Si rilegge lo stato, cosi il bottone si spegne se l'invio e
        // stato avviato.
        setErroreTutti(
          "Non sappiamo se l'invio è partito. Ricarichi la pagina fra qualche minuto prima di riprovare.",
        );
        await carica({ silenzioso: true });
        return;
      }
      if (data.prossimo_invio_at !== undefined) setProssimoTutti(data.prossimo_invio_at ?? null);
      // L'ora della GET ormai e vecchia: quella nuova, se c'e, la dice l'esito.
      setUltimoTutti(null);
      if (!res.ok) throw new Error(data.error || "Invio non riuscito.");
      setEsitoTutti({
        inviati: data.inviati ?? 0,
        saltati: data.saltati ?? 0,
        giaRaggiunti: data.gia_raggiunti ?? 0,
        nonValidi: data.non_validi ?? 0,
        errori: data.errori ?? 0,
        at: data.inviato_at ?? new Date().toISOString(),
        prossimo: data.prossimo_invio_at ?? null,
        nessuno: data.nessuno === true,
      });
      // Il server non ha trovato nessuno a cui mandarlo: i numeri a schermo
      // sono vecchi.
      if (data.nessuno === true) carica({ silenzioso: true });
    } catch (err) {
      setErroreTutti(err instanceof Error ? err.message : "Invio non riuscito.");
    } finally {
      setInviandoTutti(false);
      setConfermaTutti(false);
      setConfermaChiusaTutti((n) => n + 1);
    }
  };

  // ── Filtro per classe ──
  // Le classi presenti, normalizzate, e il filtro scelto. Valgono per i
  // numeri e per l'elenco qui sotto; le sezioni che si aggiungono (quadro
  // delle squadre, riflessioni) ricevono lo stesso `filtroClassi`.
  const opzioni = useMemo(() => opzioniClassi(righe.map((r) => r.classe)), [righe]);
  const filtroClassi = useMemo(
    () => costruisciFiltro(valoreFiltro ?? TUTTE_LE_CLASSI, io.classi, opzioni),
    [valoreFiltro, io.classi, opzioni],
  );
  const righeFiltrate = useMemo(
    () => righe.filter((r) => corrispondeClasse(filtroClassi, r.classe)),
    [righe, filtroClassi],
  );

  const visibili = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const perTalk = filtroTalk
      ? righeFiltrate.filter((r) => (r.talk ?? []).includes(filtroTalk))
      : righeFiltrate;
    if (!q) return perTalk;
    return perTalk.filter((r) =>
      [r.nome, r.cognome, r.classe, r.email].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [righeFiltrate, filtro, filtroTalk]);

  // Quanti studenti, nelle classi scelte, si sono iscritti a ciascun talk:
  // il numero accanto a ogni voce del filtro.
  const iscrittiPerTalk = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of righeFiltrate) {
      for (const slug of r.talk ?? []) n.set(slug, (n.get(slug) ?? 0) + 1);
    }
    return n;
  }, [righeFiltrate]);
  // Le righe con un refuso nel dominio dell'email, con l'indirizzo
  // suggerito (o null se non si indovina).
  const refusi = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const r of righe) {
      const refuso = refusoEmail(String(r.email ?? ""));
      if (refuso) m.set(r.id, refuso.suggerimento);
    }
    return m;
  }, [righe]);
  const etichettaDi = useMemo(
    () => new Map(talkElenco.map((t) => [t.slug, t.etichetta])),
    [talkElenco],
  );

  const conteggi = useMemo(() => {
    const c = { attesa: 0, confermate: 0, per_anno: {} as Record<number, number> };
    for (const r of righeFiltrate) {
      if (r.stato === "in_attesa") c.attesa += 1;
      if (r.stato === "confermata") {
        c.confermate += 1;
        c.per_anno[r.anno_corso] = (c.per_anno[r.anno_corso] ?? 0) + 1;
      }
    }
    return c;
  }, [righeFiltrate]);

  // Iscritti che non hanno mai fatto accesso. L'iscrizione crea l'account e
  // manda il link per la password una volta sola: chi non lo apre resta
  // fuori dal corso pur risultando a posto in ogni elenco. Senza questo
  // numero il referente lo scopre a novembre, guardando chi non ha mai
  // consegnato niente.
  const maiEntrati = useMemo(
    () =>
      righeFiltrate.filter(
        (r) => STATI_ISCRIZIONE_ATTIVI.has(r.stato) && !haFattoAccesso(r),
      ).length,
    [righeFiltrate],
  );

  // A chi il bottone sopra l'elenco rimanda il link: tutto l'istituto, non
  // la classe scelta, perche l'invio riguarda tutto l'istituto. In attesa o
  // confermati, con un account, mai entrati. Senza gli accessi, `ultimo_accesso`
  // e nullo per tutti e la regola si ferma alle lezioni: chi e entrato lo
  // scarta il server, account per account, prima di mandare qualcosa.
  const daRimandare = useMemo(
    () =>
      righe.filter(
        (r) =>
          STATI_ISCRIZIONE_ATTIVI.has(r.stato) && r.ha_account && !r.account_altrui && !haFattoAccesso(r),
      )
        .length,
    [righe],
  );
  // Mai entrati senza un account: il contatore "Mai entrati nel corso" li
  // conta, il bottone no, e una nota sotto il bottone lo dice.
  const maiEntratiSenzaAccount = useMemo(
    () =>
      righe.filter((r) => STATI_ISCRIZIONE_ATTIVI.has(r.stato) && !r.ha_account && !haFattoAccesso(r))
        .length,
    [righe],
  );

  // Confermati che non hanno completato nemmeno una lezione. Diverso da "mai
  // entrato": questi la password ce l'hanno e la porta l'hanno aperta, ma il
  // corso non l'hanno iniziato. Il rimedio non e un link, e una parola in
  // classe, e serve saperlo a settembre invece che a novembre.
  const fermiAZero = useMemo(
    () =>
      righeFiltrate.filter(
        (r) => r.stato === "confermata" && haFattoAccesso(r) && !r.lezioni_completate,
      ).length,
    [righeFiltrate],
  );

  const linkIscrizione = `${SITE_URL}${ISCRIZIONE_PATH}`;
  const principale = ruolo === "referente";
  const nomeReferente = `${adesione?.referente_nome ?? ""} ${adesione?.referente_cognome ?? ""}`.trim();
  const area = principale
    ? "Area del docente referente"
    : `Area dei docenti del progetto . Referente: ${nomeReferente}`;

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  // Il cancello: prima delle istruzioni, nient'altro.
  if (daAccettare) {
    return (
      <AccettazioneIstruzioni
        istituto={adesione?.istituto_denominazione ?? ""}
        area={area}
        onAccettate={carica}
      />
    );
  }

  if (errore && !adesione) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Area non disponibile</h2>
        <p className="text-gray-600">{errore}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div className="flex items-center flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{adesione?.istituto_denominazione}</h1>
          {/* Lo stato dell'adesione, detto per esteso. Prima si poteva solo
              dedurre dal banner giallo qui sotto: quando lo staff confermava,
              quel banner spariva e al suo posto non compariva niente, quindi
              la conferma si leggeva da un'assenza. Stessa forma del badge già
              usato per le iscrizioni più in basso. */}
          {adesione?.stato && (
            <span
              className="badge"
              style={{
                background: `${statoAdesioneColore(adesione.stato)}1A`,
                color: statoAdesioneColore(adesione.stato),
                flexShrink: 0,
              }}
            >
              {statoAdesioneLabel(adesione.stato)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {principale ? `${area} . ${nomeReferente}` : area}
          {" . "}
          <a href={GUIDA_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            Chi fa cosa, passo per passo
          </a>
        </p>
      </div>

      {adesione?.stato === "ricevuta" && (
        <div
          style={{
            background: "#FFF8E6",
            border: "1px solid #F0D89B",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13.5,
            color: "#75570F",
            lineHeight: 1.6,
          }}
        >
          L&apos;adesione del vostro istituto è in verifica. Finché non la confermiamo, il codice non
          accetta iscrizioni: le conviene aspettare la nostra email prima di diffonderlo.
        </div>
      )}

      {/* Un docente del progetto: con chi segue il percorso, e le sue
          classi, che sono il filtro da cui parte. */}
      {!principale && docentiProgetto?.disponibile && docentiProgetto.ruolo === "docente" && (
        <ColleghiDocente
          referente={nomeReferente}
          colleghi={docentiProgetto.colleghi}
          io={io}
          onClassiCambiate={(classi) => {
            setIo((prima) => ({ ...prima, classi }));
            setValoreFiltro(filtroIniziale(classi));
          }}
        />
      )}

      {/* ── I due strumenti del referente ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Il codice del vostro istituto
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Lo mette in circolare. Gli studenti lo usano per iscriversi da soli.
          </p>
          <div
            style={{
              background: "var(--primary-light)",
              borderRadius: 10,
              padding: "14px 16px",
              textAlign: "center",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
              color: "var(--text-dark)",
              marginBottom: 12,
            }}
          >
            {adesione?.codice}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(
                `Per iscriverti al percorso "Biotecnologie e Intelligenza Artificiale": ${linkIscrizione}\nCodice del nostro istituto: ${adesione?.codice}`,
              );
              setCopiato(true);
              setTimeout(() => setCopiato(false), 2500);
            }}
          >
            {copiato ? "Copiato" : "Copia il testo per la circolare"}
          </Button>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Moduli su foto e video dell&apos;evento
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Per gli studenti che partecipano all&apos;evento finale. Già intestati al vostro
            istituto, con le scelte A e B. Li stampa, li fa firmare e li conserva agli atti: non
            vanno inviati a noi. Per il corso non servono moduli: gli studenti di almeno 14 anni si
            iscrivono e acconsentono da sé. Prima di firmare, famiglie e studenti leggono l&apos;
            <Link href={INFORMATIVA_IMMAGINI_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
              informativa su foto e video
            </Link>
            .
          </p>
          <div className="flex flex-col gap-2">
            {(
              [
                ["minorenne", "Modulo per studenti minorenni"],
                ["maggiorenne", "Modulo per studenti maggiorenni"],
              ] as const
            ).map(([versione, etichetta]) => (
              <Button
                key={versione}
                type="button"
                variant={versione === "minorenne" ? "default" : "outline"}
                className="w-full"
                onClick={() =>
                  adesione &&
                  generaAutorizzazionePDF({
                    istituto: adesione.istituto_denominazione,
                    comune: adesione.istituto_comune,
                    provincia: adesione.istituto_provincia,
                    referente: `${adesione.referente_nome} ${adesione.referente_cognome}`,
                    versione,
                  })
                }
              >
                <i className="fas fa-file-pdf" style={{ marginRight: 8 }} />
                {etichetta}
              </Button>
            ))}
          </div>
          <details className="mt-3 text-sm text-gray-600">
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-dark)" }}>
              Che cosa fa la scuola con i moduli
            </summary>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              {ISTRUZIONI_SCUOLA.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            <p className="mt-2">
              {principale
                ? "L'elenco minimo si scarica qui sotto, con il pulsante \"Elenco per foto e video\": va completato con le scelte A e B e inviato prima dell'evento."
                : "L'elenco minimo lo scarica il docente referente dalla sua area: va completato con le scelte A e B e inviato prima dell'evento."}
            </p>
          </details>
        </div>
      </div>

      {/* ── Talk con gli esperti ── */}
      {talk}

      {/* ── Filtro per classe ──
          Sopra i numeri, perche vale anche per loro. Un filtro e non un
          confine: "Tutte le classi dell'istituto" c'e sempre. */}
      {righe.length > 0 && (
        <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
          <FiltroClasse
            valore={valoreFiltro ?? TUTTE_LE_CLASSI}
            onCambia={setValoreFiltro}
            opzioni={opzioni}
            classiDocente={io.classi}
          />
          <span style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6 }}>
            {filtroClassi.chiavi === null
              ? "Numeri ed elenco riguardano tutto l'istituto."
              : `Numeri ed elenco riguardano: ${filtroClassi.etichetta}. ${righeFiltrate.length} di ${righe.length} iscrizioni.`}
          </span>
        </div>
      )}

      {/* Gli accessi non si sono potuti leggere: lo si dice, invece di
          segnare tutta la scuola come "Mai entrato". */}
      {accessiNonLetti && righe.length > 0 && (
        <div
          role="status"
          style={{
            background: "#FFF8E6",
            border: "1px solid #F0D89B",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13.5,
            color: "#75570F",
            lineHeight: 1.6,
          }}
        >
          Non riusciamo a leggere gli accessi in questo momento, quindi per ora non indichiamo chi non
          è mai entrato nel corso. Il link si può rimandare lo stesso: prima dell&apos;invio a tutti
          controlliamo noi chi è già entrato.
        </div>
      )}

      {/* ── Conteggi ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{righeFiltrate.length}</div>
          <div className="stat-label">Iscrizioni ricevute</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "#8A6100" }}>{conteggi.attesa}</div>
          <div className="stat-label">Da confermare</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.confermate}</div>
          <div className="stat-label">Confermate</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div
            className="stat-number"
            style={{ fontSize: 26, color: !accessiNonLetti && maiEntrati > 0 ? "#B44A5E" : undefined }}
            title={accessiNonLetti ? "Gli accessi non si sono potuti leggere in questo momento." : undefined}
          >
            {accessiNonLetti ? "n.d." : maiEntrati}
          </div>
          <div className="stat-label">Mai entrati nel corso</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div
            className="stat-number"
            style={{ fontSize: 26, color: !accessiNonLetti && fermiAZero > 0 ? "#8A6100" : undefined }}
            title={accessiNonLetti ? "Gli accessi non si sono potuti leggere in questo momento." : undefined}
          >
            {accessiNonLetti ? "n.d." : fermiAZero}
          </div>
          <div className="stat-label">Entrati ma fermi a zero lezioni</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.7 }}>
            {ANNI_CORSO.map((a) => (
              <div key={a.anno}>
                {a.label}: <strong>{conteggi.per_anno[a.anno] ?? 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Elenco ── */}
      <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
        <Input
          placeholder="Cerca per cognome, classe o email"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        {/* Chi si e iscritto a un talk: la domanda "mi sono iscritta?" di
            una studentessa trova risposta qui, e anche l'elenco intero. */}
        {talkElenco.length > 0 && !talkNonLetti && (
          <select
            aria-label="Filtra per iscrizione ai talk"
            value={filtroTalk}
            onChange={(e) => setFiltroTalk(e.target.value)}
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              padding: "0 10px",
              background: "#fff",
              fontSize: 13,
              flex: "0 1 auto",
              maxWidth: "100%",
            }}
          >
            <option value="">Tutti gli studenti</option>
            {talkElenco.map((t) => (
              <option key={t.slug} value={t.slug}>
                Iscritti al {t.etichetta.replace(/^Talk/, "talk")} ({iscrittiPerTalk.get(t.slug) ?? 0})
              </option>
            ))}
          </select>
        )}
        {/* Gli export restano al referente principale: un file in piu con
            nomi e classi di minorenni e una copia in piu da custodire. */}
        {principale && (
          <>
            <a
              href="/api/eventi/licei/referente/export"
              className="btn-primary"
              style={{ fontSize: 13, whiteSpace: "nowrap" }}
            >
              <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
              Elenco confermati
            </a>
            <a
              href="/api/eventi/licei/referente/export?immagini=1"
              className="btn-outline"
              style={{ fontSize: 13, whiteSpace: "nowrap" }}
              title="Studente e classe dei confermati, con le colonne delle scelte A e B da completare"
            >
              Elenco per foto e video
            </a>
            <a
              href="/api/eventi/licei/referente/export?tutte=1"
              className="btn-outline"
              style={{ fontSize: 13, whiteSpace: "nowrap" }}
            >
              Tutte
            </a>
          </>
        )}
      </div>

      {/* ── Il link a tutti quelli che non sono mai entrati ──
          Per quando il primo link non e arrivato a nessuno, per esempio
          perche la posta della scuola bloccava le email esterne. Un clic,
          una conferma piccola, poi il bottone resta spento per il tempo
          d'attesa. Resta visibile dopo l'invio, con l'esito. */}
      {(daRimandare > 0 || esitoTutti || erroreTutti) && (
        <div
          ref={schedaTuttiRef}
          tabIndex={-1}
          role="group"
          aria-label="Rimanda il link a chi non è mai entrato"
          className="card-sm focus:outline-none"
          style={{ padding: 16 }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {confermaTutti ? (
              <div role="group" aria-label="Conferma dell'invio" className="flex flex-wrap items-center gap-2">
                <span style={{ fontSize: 13.5, color: "var(--text-dark)", lineHeight: 1.6 }}>
                  {accessiNonLetti
                    ? "Parte un link nuovo a chi, in tutto l'istituto, non è mai entrato."
                    : `Parte un link nuovo a ${studenti(daRimandare)} di tutto l'istituto.`}
                  {daRimandare > RIMANDA_TUTTI_MAX &&
                    ` Al massimo ${RIMANDA_TUTTI_MAX} per volta: gli altri con l'invio successivo.`}
                </span>
                <Button
                  ref={confermaTuttiRef}
                  type="button"
                  size="sm"
                  onClick={rimandaATutti}
                  disabled={inviandoTutti}
                >
                  {inviandoTutti ? "Invio in corso…" : "Conferma"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfermaTutti(false);
                    setConfermaChiusaTutti((n) => n + 1);
                  }}
                  disabled={inviandoTutti}
                >
                  Annulla
                </Button>
              </div>
            ) : (
              <Button
                ref={bottoneTuttiRef}
                type="button"
                onClick={() => {
                  setErroreTutti(null);
                  setConfermaTutti(true);
                }}
                disabled={daRimandare === 0 || prossimoTutti !== null}
                style={{ whiteSpace: "normal", height: "auto", minHeight: 36, textAlign: "left" }}
              >
                <i className="fas fa-paper-plane" aria-hidden="true" />
                {accessiNonLetti
                  ? "Rimanda il link a chi non è mai entrato"
                  : `Rimanda il link a chi non è mai entrato (${daRimandare})`}
              </Button>
            )}
            {/* Con un errore no: il messaggio qui sotto dice gia da quando
                riprovare, e due volte la stessa frase confonde. */}
            {prossimoTutti && !confermaTutti && !erroreTutti && (
              <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                {/* Dopo un ricaricamento, o per un collega, l'ora dell'ultimo
                    invio dice perche il bottone e spento. "Avviato" e non
                    "inviato": la prenotazione resta anche se nessuna email
                    e partita. */}
                {!esitoTutti && ultimoTutti && `Ultimo invio a tutti avviato alle ${ora(ultimoTutti)}. `}
                Si può ripetere dalle {ora(prossimoTutti)}.
              </span>
            )}
          </div>

          {/* Il numero sul bottone riguarda tutto l'istituto e solo chi ha un
              account; quello di "Mai entrati nel corso" segue il filtro e
              conta anche chi l'account non ce l'ha. Quando differiscono, lo
              si dice qui. */}
          {!accessiNonLetti &&
            daRimandare > 0 &&
            (filtroClassi.chiavi !== null || maiEntratiSenzaAccount > 0) && (
              <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6, margin: "10px 0 0" }}>
                {filtroClassi.chiavi !== null &&
                  "Il numero sul bottone riguarda tutto l'istituto, non solo le classi scelte. "}
                {maiEntratiSenzaAccount > 0 &&
                  (maiEntratiSenzaAccount === 1
                    ? "Uno studente mai entrato non ha un account e il link non lo raggiunge: ce lo segnali e lo sistemiamo noi."
                    : `${maiEntratiSenzaAccount} studenti mai entrati non hanno un account e il link non li raggiunge: ce lo segnali e lo sistemiamo noi.`)}
              </p>
            )}

          {/* Sempre montato: un'area di stato che c'e gia prima dell'esito
              viene letta dai lettori di schermo quando il testo cambia. */}
          <div role="status">
            {esitoTutti && (
              <p style={{ fontSize: 13.5, color: "var(--text-dark)", lineHeight: 1.6, margin: "10px 0 0" }}>
                {esitoTutti.nessuno ? (
                  esitoTutti.saltati > 0 ? (
                    `Nessun link è partito: a ${studenti(esitoTutti.saltati)} un link è stato mandato pochi minuti fa, e uno nuovo lo annullerebbe. Se non arriva, può ripetere l'invio fra ${RIMANDA_TUTTI_RECENTE_MINUTI} minuti.${esitoTutti.nonValidi > 0 ? ` Per ${studenti(esitoTutti.nonValidi)} l'indirizzo email non è valido: lo corregga con «Correggi email» sulla riga dello studente.` : ""}`
                  ) : esitoTutti.giaRaggiunti > 0 ? (
                    `Nessun link è partito: con gli invii precedenti è già stato mandato a tutti quelli che non sono ancora entrati. Se uno studente le dice che non gli è arrivato, usi il bottone sulla sua riga.${esitoTutti.nonValidi > 0 ? ` Per ${studenti(esitoTutti.nonValidi)} l'indirizzo email non è valido: lo corregga con «Correggi email» sulla riga dello studente.` : ""}`
                  ) : esitoTutti.nonValidi > 0 ? (
                    `Nessun link è partito: per ${studenti(esitoTutti.nonValidi)} l'indirizzo email non è valido. Lo corregga con «Correggi email» sulla riga dello studente.`
                  ) : (
                    "Non c'è nessuno a cui rimandarlo: risultano tutti entrati nel corso."
                  )
                ) : (
                  <>
                    <i className="fas fa-check" style={{ marginRight: 6, color: "var(--primary-dark)" }} aria-hidden="true" />
                    Link inviato a {studenti(esitoTutti.inviati)} alle {ora(esitoTutti.at)}.
                    {esitoTutti.giaRaggiunti > 0 &&
                      ` A ${studenti(esitoTutti.giaRaggiunti)} era già stato mandato con un invio precedente.`}
                    {esitoTutti.saltati > 0 &&
                      ` ${esitoTutti.saltati === 1 ? "Resta" : "Restano"} da raggiungere ${studenti(esitoTutti.saltati)}: può ripetere l'invio ${esitoTutti.prossimo ? `dalle ${ora(esitoTutti.prossimo)}` : `fra ${RIMANDA_TUTTI_MINUTI} minuti`}.`}
                    {esitoTutti.nonValidi > 0 &&
                      ` Per ${studenti(esitoTutti.nonValidi)} l'indirizzo email non è valido: lo corregga con «Correggi email» sulla riga dello studente.`}
                    {/* Non "riprovi con il bottone sulla riga": la risposta ha
                        solo numeri, e cliccare righe a caso annullerebbe i
                        link appena arrivati. Il bottone serve per chi dice
                        che l'email non gli e arrivata. */}
                    {esitoTutti.errori > 0 &&
                      ` Per ${studenti(esitoTutti.errori)} l'invio non è riuscito: se uno studente le dice che l'email non gli è arrivata, usi il bottone sulla sua riga.`}
                  </>
                )}
              </p>
            )}
          </div>
          {erroreTutti && (
            <p role="alert" style={{ color: "#E74C6F", fontSize: 13.5, lineHeight: 1.6, margin: "10px 0 0" }}>
              {erroreTutti}
            </p>
          )}

          <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6, margin: "10px 0 0" }}>
            Se uno studente non trova l&apos;email, controlli Spam. Non serve rifare l&apos;iscrizione.
          </p>
        </div>
      )}

      {errore && <p style={{ color: "#E74C6F", fontSize: 14 }}>{errore}</p>}

      {/* Le iscrizioni ai talk non si sono lette: senza badge l'elenco
          farebbe credere che nessuno si sia iscritto, e lo si dice. */}
      {talkNonLetti && righe.length > 0 && (
        <p role="status" style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6, margin: 0 }}>
          In questo momento non riusciamo a leggere le iscrizioni ai talk: ricarichi la pagina fra
          qualche minuto per vedere chi si è iscritto.
        </p>
      )}

      {visibili.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            {righe.length === 0
              ? "Nessuna iscrizione ancora. Appena diffonde il codice, le trova qui."
              : filtroTalk
                ? "Nessuno studente, fra quelli mostrati, risulta iscritto a questo talk."
                : "Nessuna iscrizione corrisponde alla ricerca o alla classe scelta."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {visibili.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                  {r.cognome} {r.nome}
                </div>
                <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  Classe {r.classe} . {r.email}
                  {/* Un refuso nel dominio ("gmail.cpm"): il link non arriva
                      mai, e da qui non si vedrebbe perche. */}
                  {refusi.has(r.id) && (
                    <span
                      style={{ color: "#B44A5E", fontWeight: 600 }}
                      title={`L'indirizzo sembra contenere un errore${
                        refusi.get(r.id) ? ` (forse ${refusi.get(r.id)})` : ""
                      }. Se lo studente non è mai entrato, lo corregga con «Correggi email».`}
                    >
                      {" "}. Email da controllare
                    </span>
                  )}
                </div>
                {/* Legata all'account di un altro: si e iscritto da un
                    dispositivo su cui era collegato qualcun altro, spesso il
                    docente. "Correggi email" gli da un account suo. */}
                {r.account_altrui && (
                  <div style={{ fontSize: 12.5, color: "#B44A5E", lineHeight: 1.6, marginTop: 4 }}>
                    <strong>Account da ricollegare.</strong>{" "}
                    {r.account_altrui === "mio"
                      ? "Questa iscrizione è collegata al Suo account, non a quello dello studente: si è iscritto da un dispositivo su cui era collegato Lei."
                      : r.account_altrui === "docente"
                        ? "Questa iscrizione è collegata all'account di un docente dell'istituto, non a quello dello studente."
                        : "Questa iscrizione è collegata a un account con un altro indirizzo email."}{" "}
                    Con «Correggi email» gli diamo un account suo e gli mandiamo il link per la password.
                  </div>
                )}
                {/* I talk con gli esperti a cui si e iscritto. */}
                {(r.talk ?? []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {(r.talk as string[]).map((slug) => (
                      <span
                        key={slug}
                        className="badge badge-primary"
                        title="Si è iscritto a questo talk con gli esperti."
                        style={{ fontSize: 11.5 }}
                      >
                        <i className="fas fa-check" aria-hidden="true" style={{ marginRight: 5 }} />
                        {etichettaDi.get(slug) ?? "Talk con gli esperti"}
                      </span>
                    ))}
                  </div>
                )}
                {/* Il punto del corso a cui e arrivato. Una lezione conta
                    quando ha consegnato la riflessione che la chiude, ed e
                    la stessa consegna che gli sblocca la lezione dopo: e il
                    punto in cui e arrivato davvero, non le pagine aperte. */}
                {totaleLezioni > 0 && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}
                    title={`${r.lezioni_completate ?? 0} lezioni completate su ${totaleLezioni}. Una lezione si conta quando lo studente consegna la riflessione che la chiude.`}
                  >
                    <div
                      style={{
                        width: 84,
                        height: 5,
                        borderRadius: 3,
                        background: "var(--border-color)",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(((r.lezioni_completate ?? 0) / totaleLezioni) * 100)}%`,
                          height: "100%",
                          background: "var(--primary-dark)",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>
                      {r.lezioni_completate ?? 0} / {totaleLezioni} lezioni
                    </span>
                  </div>
                )}
              </div>

              <span
                className="badge"
                style={{
                  background: `${statoIscrizioneColore(r.stato)}1A`,
                  color: statoIscrizioneColore(r.stato),
                  flexShrink: 0,
                }}
              >
                {statoIscrizioneLabel(r.stato)}
              </span>

              {/* Iscritto ma senza password: risulta a posto ovunque e nel
                  corso non entra. Il badge lo dice, il bottone lo rimedia, in
                  attesa o confermato che sia. Senza gli accessi il badge non
                  si mostra, perche non lo sappiamo, tranne a chi l'account
                  non ce l'ha proprio; il bottone resta. */}
              {STATI_ISCRIZIONE_ATTIVI.has(r.stato) && !haFattoAccesso(r) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {(!accessiNonLetti || !r.ha_account) && !r.account_altrui && (
                    <span
                      className="badge"
                      style={{ background: "#B44A5E1A", color: "#B44A5E" }}
                      title={
                        r.ha_account
                          ? "Ha un account ma non ha mai impostato la password, quindi non può aprire le lezioni. Il bottone qui accanto gli rimanda il link."
                          : "Questa iscrizione non ha un account collegato, quindi lo studente non può entrare nel corso. Ce lo segnali e lo sistemiamo noi."
                      }
                    >
                      Mai entrato
                    </span>
                  )}
                  {r.ha_account && !r.account_altrui && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => rimandaAccesso(r.id)}
                      disabled={salvando === r.id || rimandati.has(r.id)}
                      style={{ height: 30, fontSize: 12.5 }}
                    >
                      {rimandati.has(r.id) ? "Link inviato" : "Rimanda il link"}
                    </Button>
                  )}
                </div>
              )}

              {/* L'email sbagliata si corregge finche lo studente non e mai
                  entrato: anche da "Non riconosciuta", che spesso e proprio
                  un indirizzo sbagliato. Il server lo ricontrolla. */}
              {r.stato !== "ritirata" && !haFattoAccesso(r) && correggiDi !== r.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCorreggiDi(r.id)}
                  style={{ height: 30, fontSize: 12.5, flexShrink: 0 }}
                >
                  Correggi email
                </Button>
              )}

              {/* Le riflessioni: solo dei confermati, e solo di chi ha
                  consegnato almeno una lezione. Si leggono al clic. */}
              {r.stato === "confermata" && (r.lezioni_completate ?? 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRiflessioniDi(riflessioniDi === r.id ? null : r.id)}
                  aria-expanded={riflessioniDi === r.id}
                  style={{ height: 30, fontSize: 12.5, flexShrink: 0 }}
                >
                  <i
                    className={`fas fa-chevron-${riflessioniDi === r.id ? "up" : "down"}`}
                    style={{ marginRight: 6, fontSize: 11 }}
                    aria-hidden="true"
                  />
                  Riflessioni
                </Button>
              )}

              {r.stato === "in_attesa" ? (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button
                    type="button"
                    onClick={() => aggiorna(r.id, { stato: "confermata" })}
                    disabled={salvando === r.id}
                    style={{ height: 34, fontSize: 13 }}
                  >
                    È mio studente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => aggiorna(r.id, { stato: "rifiutata" })}
                    disabled={salvando === r.id}
                    style={{ height: 34, fontSize: 13 }}
                  >
                    Non lo riconosco
                  </Button>
                </div>
              ) : (
                <select
                  value={r.stato}
                  onChange={(e) => aggiorna(r.id, { stato: e.target.value })}
                  style={{
                    height: 34,
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    padding: "0 10px",
                    background: "#fff",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {STATI_ISCRIZIONE.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}

              {correggiDi === r.id && (
                <CorreggiEmail
                  iscrizione={r}
                  accountAltrui={r.account_altrui ?? null}
                  onChiudi={() => setCorreggiDi(null)}
                  onCorretta={(messaggio) => {
                    setCorreggiDi(null);
                    setCorrette((prima) => new Map(prima).set(r.id, messaggio));
                    // Il bottone "Rimanda il link" torna utilizzabile: il
                    // link di prima era andato all'indirizzo sbagliato.
                    setRimandati((prima) => {
                      const dopo = new Set(prima);
                      dopo.delete(r.id);
                      return dopo;
                    });
                    // Account, accessi, lezioni e talk possono essere
                    // cambiati con l'account: si rilegge tutto.
                    carica({ silenzioso: true });
                  }}
                />
              )}
              {corrette.has(r.id) && correggiDi !== r.id && (
                <p
                  role="status"
                  style={{ flexBasis: "100%", fontSize: 12.5, color: "var(--text-dark)", lineHeight: 1.6, margin: 0 }}
                >
                  <i className="fas fa-check" style={{ marginRight: 6, color: "var(--primary-dark)" }} aria-hidden="true" />
                  {corrette.get(r.id)}
                </p>
              )}

              {riflessioniDi === r.id && r.stato === "confermata" && (
                <div style={{ flexBasis: "100%", minWidth: 0 }}>
                  <RiflessioniStudente iscrizioneId={r.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Quadro delle squadre ──
          Lo vedono il referente e i docenti del progetto, con lo stesso
          filtro per classe dell'elenco. A fase chiusa e senza squadre, una
          riga sola lo dice. */}
      {adesione && (
        <QuadroSquadre
          iscrizioni={righe}
          squadre={squadre}
          componentiAltriIstituti={altriIstituti}
          adesioneId={adesione.id}
          filtro={filtroClassi}
          selettoreClasse={
            righe.length > 0 ? (
              <FiltroClasse
                valore={valoreFiltro ?? TUTTE_LE_CLASSI}
                onCambia={setValoreFiltro}
                opzioni={opzioni}
                classiDocente={io.classi}
              />
            ) : null
          }
          totaleLezioni={totaleLezioni}
          fasi={fasi}
          erroreLettura={squadreErrore}
          aggiornatoAlle={aggiornatoAlle}
          aggiornando={aggiornando}
          onAggiorna={() => carica({ silenzioso: true })}
          accessiNonLetti={accessiNonLetti}
        />
      )}

      {/* ── Riflessioni e domande, per lezione ──
          Solo se c'e almeno un confermato: degli altri non si legge niente.
          Stesso filtro per classe dell'elenco e del quadro. */}
      {righe.some((r) => r.stato === "confermata") && (
        <RiflessioniPerLezione
          filtro={filtroClassi}
          selettoreClasse={
            <FiltroClasse
              valore={valoreFiltro ?? TUTTE_LE_CLASSI}
              onCambia={setValoreFiltro}
              opzioni={opzioni}
              classiDocente={io.classi}
            />
          }
        />
      )}

      {/* ── Il link all'avviso sulle riflessioni di prima, per gli studenti ──
          Sempre, anche senza confermati: l'avviso lo vedono anche gli
          studenti in attesa, e il docente lo puo dare alla classe da subito. */}
      <LinkRiflessioniStudenti />

      {/* ── Docenti del progetto: solo il referente principale li indica ── */}
      {principale && <DocentiProgetto iniziale={docentiProgetto} classiPresenti={opzioni} />}

      {/* ── Mentor del percorso ──
          Lo stesso elenco degli studenti, con i contatti, per referente e
          docenti del progetto. Come il resto, solo dopo le istruzioni, e in
          piu solo con l'adesione confermata dallo staff: la rotta dei mentor
          fa gli stessi controlli. Si legge all'apertura. */}
      {STATI_ADESIONE_CHE_ACCETTANO.has(adesione?.stato) ? (
        <MentorElenco percorso="docenti" />
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Mentor del percorso
          </h2>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: 0 }}>
            {MESSAGGIO_MENTOR_ADESIONE_IN_VERIFICA}
          </p>
        </div>
      )}

      <details className="card-sm" style={{ padding: 16, fontSize: 13, color: "var(--text-mid)", lineHeight: 1.7 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-dark)" }}>
          Le regole del tuo accesso
        </summary>
        <p className="mt-2">
          L&apos;accesso è personale e collegato al solo vostro istituto. Usandolo ti impegni a:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          {ISTRUZIONI_REFERENTE.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-2">
          Dettagli nell&apos;
          <Link href={INFORMATIVA_SCUOLE_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            informativa per scuole e docenti referenti
          </Link>
          . Sono le regole che ogni docente accetta al primo accesso, e le trovi anche, da stampare, nelle{" "}
          <Link href={ISTRUZIONI_DOCENTE_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            istruzioni per il docente referente e i docenti del progetto
          </Link>
          ; il modulo che firma il dirigente è l&apos;
          <Link href={ADESIONE_SCUOLA_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            adesione della scuola
          </Link>
          .
        </p>
      </details>

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
        {principale
          ? "L'elenco dei confermati è quello che l'art. 4 chiede all'istituto di trasmettere: lo scarica da qui invece di compilarlo, e contiene solo i dati necessari, senza email."
          : "L'elenco dei confermati, che l'art. 4 chiede all'istituto di trasmettere, lo scarica il docente referente."}{" "}
        I moduli su foto e video firmati restano in custodia alla scuola, non vanno caricati su
        questo sito.
      </p>
    </div>
  );
}
