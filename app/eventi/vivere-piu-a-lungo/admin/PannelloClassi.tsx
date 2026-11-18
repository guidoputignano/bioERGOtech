"use client";

/**
 * Classi: le prenotazioni per classe, per lo staff.
 *
 * In alto, per ogni giornata, i posti delle classi: confermate, in lista
 * d'attesa, la quota delle scuole (che si cambia da qui) e i posti ancora
 * prenotabili. Sotto, l'elenco con ricerca e filtri, e per ogni classe i
 * contatti del docente, i numeri (modificabili), il settore di ogni giornata,
 * la conferma dalla lista d'attesa, la rimozione di una giornata, il reinvio
 * dell'email e il link alla pagina della classe.
 *
 * I conti e le regole dei posti sono del database (event_group_seats e le
 * funzioni delle classi), letti da /api/eventi/admin/classi. Ogni azione dice
 * com'è andata, email al docente compresa: nessun esito è muto.
 */

import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { etichettaGiornata, giornateConArticolo, sessionBySlug } from "../content";
import {
  MAX_ACCOMPAGNATORI,
  MAX_PERSONE_CLASSE,
  MIN_ACCOMPAGNATORI,
  descriviPersone,
  nomeClasse,
  urlClasse,
} from "@/lib/eventi/classi";
import {
  FILE_SQL_CLASSI,
  FILTRI_CLASSI_VUOTI,
  GIORNATE,
  STATI_FILTRO_CLASSI,
  confrontaClassiPerData,
  confrontaClassiPerScuola,
  dataOraRoma,
  filtraClassi,
  filtriClassiAttivi,
  inviaJson,
  leggiJson,
  messaggioErrore,
  oraRoma,
  urlExportClassi,
  urlStampaClassi,
  type FiltriClassi,
  type FiltroStatoClasse,
  type GiornataClassi,
  type GiornataRigaClasse,
  type RigaClasse,
  type RispostaClassi,
} from "./PannelloComune";
import { PulsanteScarica } from "./PannelloScarica";

const PASSO = 100;
const API = "/api/eventi/admin/classi";
const numero = (n: number) => n.toLocaleString("it-IT");
const maiuscola = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const plurale = (n: number, uno: string, molti: string) => `${numero(n)} ${n === 1 ? uno : molti}`;
/** "il 10 dicembre", "l'11 dicembre"; per una sessione sconosciuta, il codice. */
const conArticolo = (slug: string) => giornateConArticolo([slug]) || `la sessione ${slug || "senza nome"}`;

type Ordine = "recenti" | "scuola";
type Esito = { tipo: "ok" | "errore" | "attenzione"; testo: string };

/** Le risposte di POST /api/eventi/admin/classi. */
type RispostaAzione = {
  ok?: boolean;
  gia?: boolean;
  messaggio?: string;
  error?: string;
  codice?: string;
  campo?: string;
  eliminata?: boolean;
  attenzione?: boolean;
  email?: { inviata: true; a: string } | { inviata: false; a: string; errore: string } | null;
};

/** L'esito di un'azione, con l'email al docente detta per esteso. */
function esitoDa(dati: RispostaAzione, riserva: string): Esito {
  const base = dati.messaggio ?? riserva;
  const email = dati.email;
  if (email && !email.inviata) return { tipo: "attenzione", testo: `${base} ${email.errore}` };
  const conEmail = email?.inviata ? `${base} Email inviata a ${email.a}.` : base;
  return { tipo: dati.attenzione ? "attenzione" : "ok", testo: conEmail };
}

function IconaEsito({ tipo }: { tipo: Esito["tipo"] }) {
  const icona =
    tipo === "ok" ? "fa-circle-check" : tipo === "attenzione" ? "fa-triangle-exclamation" : "fa-circle-exclamation";
  return <i className={`fas ${icona}`} aria-hidden="true" />;
}

function MessaggioEsito({ esito }: { esito: Esito | null }) {
  return (
    <div role="status" aria-live="polite">
      {esito && (
        <p className={`eva-esito eva-esito-${esito.tipo}`}>
          <IconaEsito tipo={esito.tipo} />
          <span>{esito.testo}</span>
        </p>
      )}
    </div>
  );
}

/** "Avvisa il docente per email": la stessa casella per ogni modifica. */
function CasellaAvvisa({ valore, onCambia }: { valore: boolean; onCambia: (v: boolean) => void }) {
  return (
    <label className="eva-check">
      <input type="checkbox" checked={valore} onChange={(e) => onCambia(e.target.checked)} />
      <span>Manda al docente l&apos;email con la prenotazione aggiornata</span>
    </label>
  );
}

/* ── I numeri di una giornata, con la quota ───────────────────────────── */

function Stat({ n, label, nota, colore }: { n: number; label: string; nota?: string; colore: string }) {
  return (
    <div className="eva-stat">
      <div className="eva-stat-n">{numero(n)}</div>
      <div className="eva-stat-l">
        <span className="eva-dot" style={{ background: colore }} aria-hidden="true" />
        {label}
      </div>
      {nota && <div className="eva-stat-nota">{nota}</div>}
    </div>
  );
}

function SchedaGiornataClassi({
  g,
  onFiltri,
  onCambiato,
}: {
  g: GiornataClassi;
  onFiltri: (f: Partial<FiltriClassi>) => void;
  onCambiato: () => void;
}) {
  const id = useId();
  const [modifica, setModifica] = useState(false);
  const [valore, setValore] = useState("");
  const [senzaLimite, setSenzaLimite] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [erroreFile, setErroreFile] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const titolo = (
    <div>
      <h3 className="eva-giornata-data">{g.giornoLabel}</h3>
      <p className="eva-sub">
        <i className="fas fa-location-dot" aria-hidden="true" style={{ color: "var(--primary)", marginRight: 6 }} />
        {g.luogo}, {g.orario}
      </p>
    </div>
  );

  if (!g.nelDatabase || g.capienza === null) {
    return (
      <article className="eva-box" aria-label={`Classi, ${g.giornoLabel}`}>
        <div className="eva-giornata-testa">
          {titolo}
          <span className="eva-pill eva-pill-errore">Non nel database</span>
        </div>
        <p className="eva-sub" style={{ marginTop: 12 }}>
          Questa giornata non ha una riga in <code>event_sessions</code>: le classi non la possono prenotare.
        </p>
      </article>
    );
  }

  const tetto = g.quota ?? g.capienza;
  const pct = tetto > 0 ? Math.min(100, Math.round((g.postiClassi / tetto) * 100)) : 100;
  const esaurita = (g.rimanentiClassi ?? 0) === 0;
  // Che cosa ferma una classe: la quota o la giornata piena.
  const fermaLaQuota = g.quota !== null && g.quota - g.postiClassi <= (g.rimanenti ?? 0);

  const notaAttesa =
    g.classiAttesa === 0
      ? ""
      : g.minimoAttesa !== null && g.minimoAttesa <= (g.rimanentiClassi ?? 0)
        ? " Almeno una classe in attesa ora ci sta: confermala dall'elenco."
        : fermaLaQuota
          ? " Le classi in attesa non ci stanno nella quota: se la sala lo permette, puoi alzarla."
          : " Le classi in attesa non ci stanno: la giornata è al completo.";
  const testoQuota = `${g.quota === null ? "nessun limite oltre la capienza" : `${numero(g.quota)} posti`}. Posti liberi nella giornata, per tutti: ${numero(g.rimanenti ?? 0)} su ${numero(g.capienza)}.${notaAttesa}`;

  const apri = () => {
    setValore(g.quota === null ? "" : String(g.quota));
    setSenzaLimite(g.quota === null);
    setErroreCampo(null);
    setEsito(null);
    setModifica(true);
    window.setTimeout(() => campo.current?.focus(), 0);
  };

  const salva = async (e: FormEvent) => {
    e.preventDefault();
    let quota: number | null = null;
    if (!senzaLimite) {
      const t = valore.trim();
      if (!/^\d{1,6}$/.test(t)) {
        setErroreCampo("Scrivi un numero intero di posti, da 0 in su, oppure scegli nessun limite.");
        campo.current?.focus();
        return;
      }
      quota = Number(t);
    }
    setErroreCampo(null);
    setInCorso(true);
    const r = await inviaJson<RispostaAzione>(API, { azione: "quota", giornata: g.slug, quota });
    setInCorso(false);
    if (!r.ok || !r.dati) {
      setEsito({ tipo: "errore", testo: `La quota non è stata salvata. ${messaggioErrore(r.status, r.dati)}` });
      return;
    }
    setModifica(false);
    setEsito(esitoDa(r.dati, "Quota salvata."));
    onCambiato();
  };

  return (
    <article className="eva-box" aria-label={`Classi, ${g.giornoLabel}`}>
      <div className="eva-giornata-testa">
        {titolo}
        {esaurita ? (
          <span className="eva-pill eva-pill-attesa">Posti per le classi esauriti</span>
        ) : (
          <span className="eva-pill eva-pill-teal">
            {plurale(g.rimanentiClassi ?? 0, "posto prenotabile", "posti prenotabili")}
          </span>
        )}
      </div>

      <div
        className={`eva-barra${esaurita ? " eva-barra-piena" : ""}`}
        role="progressbar"
        aria-label={`Posti delle classi ${conArticolo(g.slug)}`}
        aria-valuemin={0}
        aria-valuemax={tetto}
        aria-valuenow={Math.min(g.postiClassi, tetto)}
        aria-valuetext={`${numero(g.postiClassi)} posti delle classi su ${numero(tetto)}`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="eva-barra-legenda">
        <span>
          <strong style={{ color: "var(--text-dark)" }}>{numero(g.postiClassi)}</strong> posti delle classi su{" "}
          {g.quota === null ? `${numero(g.capienza)} (capienza)` : `${numero(g.quota)} (quota)`}
        </span>
        <span className="num">{pct}%</span>
      </div>

      <div className="eva-stats eva-stats-4" style={{ marginTop: 16 }}>
        <Stat n={g.classiConfermate} label="Confermate" nota={plurale(g.postiClassi, "persona", "persone")} colore="var(--primary)" />
        <Stat
          n={g.classiAttesa}
          label="In lista d'attesa"
          nota={g.classiAttesa > 0 ? plurale(g.postiAttesa, "persona", "persone") : undefined}
          colore="#D97706"
        />
        <Stat
          n={g.classiEntrate}
          label="Entrate"
          nota={g.classiEntrate > 0 ? plurale(g.presenti, "persona", "persone") : undefined}
          colore="#0F6E56"
        />
        <Stat n={g.rimanentiClassi ?? 0} label="Ancora prenotabili" colore="#CBD5E1" />
      </div>

      <p className="eva-sub" style={{ marginTop: 12 }}>
        <strong>Quota per le classi:</strong> {testoQuota}
      </p>

      {!modifica ? (
        <div className="eva-azioni" style={{ marginTop: 12 }}>
          <button type="button" className="eva-btn" onClick={apri}>
            <i className="fas fa-sliders" aria-hidden="true" />{" "}
            Cambia la quota
          </button>
          <button type="button" className="eva-btn" onClick={() => onFiltri({ giornata: g.slug, stato: "" })}>
            <i className="fas fa-list" aria-hidden="true" />{" "}
            Vedi le classi
          </button>
          {g.classiAttesa > 0 && (
            <button type="button" className="eva-btn" onClick={() => onFiltri({ giornata: g.slug, stato: "attesa" })}>
              <i className="fas fa-hourglass-half" aria-hidden="true" />{" "}
              Lista d&apos;attesa
            </button>
          )}
          <a className="eva-btn" href={urlStampaClassi(g.slug)} target="_blank" rel="noopener noreferrer">
            <i className="fas fa-print" aria-hidden="true" />{" "}
            Lista per la porta<span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
          <PulsanteScarica url={urlExportClassi(FILTRI_CLASSI_VUOTI, g.slug)} onErrore={setErroreFile}>
            Scarica CSV
          </PulsanteScarica>
        </div>
      ) : (
        <form className="eva-modulo" onSubmit={salva} noValidate aria-labelledby={`${id}-quota-titolo`}>
          <p id={`${id}-quota-titolo`} className="eva-h2" style={{ fontSize: 15 }}>
            Quota delle classi per {conArticolo(g.slug)}
          </p>
          <div>
            <label htmlFor={`${id}-quota`} className="eva-label">
              Posti che le classi possono occupare
            </label>
            <input
              ref={campo}
              id={`${id}-quota`}
              className="eva-campo"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={valore}
              disabled={senzaLimite || inCorso}
              onChange={(e) => setValore(e.target.value)}
              aria-invalid={Boolean(erroreCampo)}
              aria-describedby={`${id}-quota-aiuto${erroreCampo ? ` ${id}-quota-errore` : ""}`}
            />
            {erroreCampo && (
              <p id={`${id}-quota-errore`} className="eva-errore-campo">
                {erroreCampo}
              </p>
            )}
          </div>
          <label className="eva-check">
            <input type="checkbox" checked={senzaLimite} onChange={(e) => setSenzaLimite(e.target.checked)} />
            <span>Nessun limite: le classi possono occupare tutta la capienza ({numero(g.capienza)})</span>
          </label>
          <p id={`${id}-quota-aiuto`} className="eva-nota" style={{ margin: 0 }}>
            Ora le classi confermate occupano {numero(g.postiClassi)}{" "}posti. Se alzi la quota, le classi in lista
            d&apos;attesa che ci stanno vengono confermate subito, in ordine di prenotazione, e ricevono l&apos;email.
            Se la abbassi, nessuna classe confermata perde il posto: semplicemente non se ne confermano altre.
          </p>
          <div className="eva-azioni">
            <button type="submit" className="eva-btn eva-btn-primario" disabled={inCorso}>
              <i className={inCorso ? "fas fa-spinner fa-spin" : "fas fa-check"} aria-hidden="true" />{" "}
              Salva la quota
            </button>
            <button type="button" className="eva-btn" disabled={inCorso} onClick={() => setModifica(false)}>
              Annulla
            </button>
          </div>
        </form>
      )}
      <MessaggioEsito esito={esito} />
      {erroreFile && (
        <p className="eva-esito eva-esito-errore" role="alert">
          <i className="fas fa-circle-exclamation" aria-hidden="true" />
          {erroreFile}
        </p>
      )}
    </article>
  );
}

/* ── Una classe ───────────────────────────────────────────────────────── */

type Domanda =
  | { tipo: "conferma"; g: GiornataRigaClasse }
  | { tipo: "forza"; g: GiornataRigaClasse; testo: string }
  | { tipo: "rimuovi"; g: GiornataRigaClasse; ultima: boolean }
  | { tipo: "forza_numeri"; testo: string; studenti: number; accompagnatori: number };

/** Il settore di una classe in una giornata, con la modifica in linea. */
function SettoreGiornata({
  g,
  occupato,
  onSalva,
}: {
  g: GiornataRigaClasse;
  occupato: boolean;
  onSalva: (g: GiornataRigaClasse, settore: string, avvisa: boolean) => Promise<boolean>;
}) {
  const id = useId();
  const [aperto, setAperto] = useState(false);
  const [valore, setValore] = useState(g.settore ?? "");
  const [avvisa, setAvvisa] = useState(true);
  const campo = useRef<HTMLInputElement>(null);

  if (!aperto) {
    return (
      <span className="eva-g-ora" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {g.settore ? (
          <span>
            Settore <strong style={{ color: "var(--text-dark)" }}>{g.settore}</strong>
          </span>
        ) : (
          <span>Settore da assegnare</span>
        )}
        <button
          type="button"
          className="eva-btn-link"
          disabled={occupato}
          onClick={() => {
            setValore(g.settore ?? "");
            setAperto(true);
            window.setTimeout(() => campo.current?.focus(), 0);
          }}
        >
          {g.settore ? "Cambia" : "Assegna"}
          <span className="sr-only"> il settore {etichettaGiornata(g.slug)}</span>
        </button>
      </span>
    );
  }

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    const fatto = await onSalva(g, valore, avvisa);
    if (fatto) setAperto(false);
  };

  return (
    <form className="eva-modulo" onSubmit={invia} noValidate style={{ flex: "1 1 100%" }}>
      <div>
        <label htmlFor={`${id}-settore`} className="eva-label">
          Settore {etichettaGiornata(g.slug)}
        </label>
        <input
          ref={campo}
          id={`${id}-settore`}
          className="eva-campo"
          value={valore}
          maxLength={80}
          placeholder="Es. Tribuna B"
          onChange={(e) => setValore(e.target.value)}
          aria-describedby={`${id}-settore-aiuto`}
        />
        <p id={`${id}-settore-aiuto`} className="eva-nota" style={{ margin: "6px 0 0" }}>
          Compare sulla pagina della classe, nelle email e all&apos;ingresso. Lascia vuoto per toglierlo.
        </p>
      </div>
      <CasellaAvvisa valore={avvisa} onCambia={setAvvisa} />
      <div className="eva-azioni">
        <button type="submit" className="eva-btn eva-btn-primario" disabled={occupato}>
          <i className={occupato ? "fas fa-spinner fa-spin" : "fas fa-check"} aria-hidden="true" />{" "}
          Salva il settore
        </button>
        <button type="button" className="eva-btn" disabled={occupato} onClick={() => setAperto(false)}>
          Annulla
        </button>
      </div>
    </form>
  );
}

/** Il cambio dei numeri: studenti e docenti, con i limiti della prenotazione. */
function ModuloNumeri({
  r,
  occupato,
  onSalva,
  onAnnulla,
}: {
  r: RigaClasse;
  occupato: boolean;
  onSalva: (studenti: number, accompagnatori: number, avvisa: boolean) => void;
  onAnnulla: () => void;
}) {
  const id = useId();
  const [studenti, setStudenti] = useState(String(r.studenti));
  const [docenti, setDocenti] = useState(String(r.accompagnatori));
  const [avvisa, setAvvisa] = useState(true);
  const [errore, setErrore] = useState<{ campo: "studenti" | "docenti"; testo: string } | null>(null);
  const campoStudenti = useRef<HTMLInputElement>(null);
  const campoDocenti = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoStudenti.current?.focus();
  }, []);

  const s = Number(studenti);
  const d = Number(docenti);
  const totale = Number.isInteger(s) && Number.isInteger(d) ? s + d : null;

  const invia = (e: FormEvent) => {
    e.preventDefault();
    let err: typeof errore = null;
    if (!/^\d{1,2}$/.test(studenti.trim()) || s < 1) err = { campo: "studenti", testo: "Almeno 1 studente." };
    else if (!/^\d{1,2}$/.test(docenti.trim()) || d < MIN_ACCOMPAGNATORI || d > MAX_ACCOMPAGNATORI) {
      err = { campo: "docenti", testo: `I docenti vanno da ${MIN_ACCOMPAGNATORI} a ${MAX_ACCOMPAGNATORI}.` };
    } else if (s + d > MAX_PERSONE_CLASSE) {
      err = { campo: "studenti", testo: `Al massimo ${MAX_PERSONE_CLASSE} persone, docenti compresi.` };
    }
    setErrore(err);
    if (err) {
      (err.campo === "studenti" ? campoStudenti : campoDocenti).current?.focus();
      return;
    }
    onSalva(s, d, avvisa);
  };

  return (
    <form className="eva-modulo" onSubmit={invia} noValidate aria-labelledby={`${id}-titolo`}>
      <p id={`${id}-titolo`} className="eva-h2" style={{ fontSize: 15 }}>
        Cambia i numeri
      </p>
      <div className="eva-modulo-righe">
        <div>
          <label htmlFor={`${id}-studenti`} className="eva-label">
            Studenti
          </label>
          <input
            ref={campoStudenti}
            id={`${id}-studenti`}
            className="eva-campo"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PERSONE_CLASSE - MIN_ACCOMPAGNATORI}
            step={1}
            value={studenti}
            onChange={(e) => setStudenti(e.target.value)}
            aria-invalid={errore?.campo === "studenti"}
            aria-describedby={errore?.campo === "studenti" ? `${id}-errore` : undefined}
          />
        </div>
        <div>
          <label htmlFor={`${id}-docenti`} className="eva-label">
            Docenti
          </label>
          <input
            ref={campoDocenti}
            id={`${id}-docenti`}
            className="eva-campo"
            type="number"
            inputMode="numeric"
            min={MIN_ACCOMPAGNATORI}
            max={MAX_ACCOMPAGNATORI}
            step={1}
            value={docenti}
            onChange={(e) => setDocenti(e.target.value)}
            aria-invalid={errore?.campo === "docenti"}
            aria-describedby={errore?.campo === "docenti" ? `${id}-errore` : undefined}
          />
        </div>
      </div>
      {errore ? (
        <p id={`${id}-errore`} className="eva-errore-campo" role="alert">
          {errore.testo}
        </p>
      ) : (
        <p className="eva-nota" style={{ margin: 0 }}>
          {`${totale !== null ? `${numero(totale)} persone in tutto (prima ${numero(r.posti)}). ` : ""}Se aumentano, il sistema controlla che ci stiano in ogni giornata confermata. Se diminuiscono, i posti liberati passano a chi è in lista d'attesa.`}
        </p>
      )}
      <CasellaAvvisa valore={avvisa} onCambia={setAvvisa} />
      <div className="eva-azioni">
        <button type="submit" className="eva-btn eva-btn-primario" disabled={occupato}>
          <i className={occupato ? "fas fa-spinner fa-spin" : "fas fa-check"} aria-hidden="true" />{" "}
          Salva i numeri
        </button>
        <button type="button" className="eva-btn" disabled={occupato} onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </form>
  );
}

const SchedaClasse = memo(function SchedaClasse({
  r,
  onCambiato,
  onEliminata,
}: {
  r: RigaClasse;
  /** Dopo un'azione: la scheda resta in elenco e i dati si rileggono. */
  onCambiato: (id: string) => void;
  onEliminata: (esito: Esito) => void;
}) {
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [domanda, setDomanda] = useState<Domanda | null>(null);
  const [avvisaRimozione, setAvvisaRimozione] = useState(true);
  const [numeriAperti, setNumeriAperti] = useState(false);
  const [esito, setEsito] = useState<Esito | null>(null);
  const boxDomanda = useRef<HTMLDivElement | null>(null);
  // La domanda "salva comunque" ricorda anche se avvisare il docente.
  const avvisaNumeri = useRef(true);
  const occupato = inCorso !== null;
  const titolo = nomeClasse(r);
  const valide = r.giornate.filter((g) => sessionBySlug(g.slug));
  const docente = `${r.docente_nome} ${r.docente_cognome}`.trim();

  useEffect(() => {
    if (domanda) boxDomanda.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [domanda]);

  const chiedi = async (azione: string, corpo: Record<string, unknown>, chiave: string) => {
    setInCorso(chiave);
    setEsito(null);
    const res = await inviaJson<RispostaAzione>(API, { azione, ...corpo });
    setInCorso(null);
    return res;
  };

  const conferma = async (g: GiornataRigaClasse, forza: boolean) => {
    setDomanda(null);
    const res = await chiedi("conferma", { bridge_id: g.id, forza }, `conferma:${g.id}`);
    if (res.status === 409 && res.dati?.codice === "pieno") {
      setDomanda({ tipo: "forza", g, testo: res.dati.error ?? "La giornata è al completo." });
      return;
    }
    if (!res.ok || !res.dati) {
      setEsito({ tipo: "errore", testo: `La classe non è stata confermata. ${messaggioErrore(res.status, res.dati)}` });
      return;
    }
    setEsito(esitoDa(res.dati, "Classe confermata."));
    onCambiato(r.id);
  };

  const rimuovi = async (g: GiornataRigaClasse) => {
    setDomanda(null);
    const res = await chiedi("rimuovi_giornata", { bridge_id: g.id, avvisa: avvisaRimozione }, `rimuovi:${g.id}`);
    if (!res.ok || !res.dati) {
      setEsito({
        tipo: "errore",
        testo: `La giornata non è stata tolta, o non si sa se lo è stata. ${messaggioErrore(res.status, res.dati)}`,
      });
      onCambiato(r.id);
      return;
    }
    const e = esitoDa(res.dati, "Giornata tolta.");
    // Una prenotazione annullata sparisce dall'elenco alla prossima lettura, e
    // con lei la sua scheda: l'esito (anche un'email non partita) va in alto.
    if (res.dati.eliminata) onEliminata({ tipo: e.tipo, testo: `${titolo}: ${e.testo}` });
    else setEsito(e);
    onCambiato(r.id);
  };

  const salvaSettore = async (g: GiornataRigaClasse, settore: string, avvisa: boolean): Promise<boolean> => {
    const res = await chiedi("settore", { bridge_id: g.id, settore, avvisa }, `settore:${g.id}`);
    if (!res.ok || !res.dati) {
      setEsito({ tipo: "errore", testo: `Il settore non è stato salvato. ${messaggioErrore(res.status, res.dati)}` });
      return false;
    }
    setEsito(esitoDa(res.dati, "Settore salvato."));
    onCambiato(r.id);
    return true;
  };

  const salvaNumeri = async (studenti: number, accompagnatori: number, avvisa: boolean, forza = false) => {
    setDomanda(null);
    const res = await chiedi(
      "numeri",
      { booking_id: r.id, studenti, accompagnatori, avvisa, forza },
      "numeri",
    );
    if (res.status === 409 && res.dati?.codice === "pieno") {
      setDomanda({ tipo: "forza_numeri", testo: res.dati.error ?? "Non ci stanno.", studenti, accompagnatori });
      return;
    }
    if (!res.ok || !res.dati) {
      setEsito({ tipo: "errore", testo: `I numeri non sono stati salvati. ${messaggioErrore(res.status, res.dati)}` });
      return;
    }
    setNumeriAperti(false);
    setEsito(esitoDa(res.dati, "Numeri salvati."));
    onCambiato(r.id);
  };
  const reinvia = async () => {
    const res = await chiedi("reinvia", { booking_id: r.id }, "reinvia");
    if (res.ok && res.dati?.ok) setEsito(esitoDa(res.dati, `Email reinviata a ${r.docente_email}.`));
    else setEsito({ tipo: "errore", testo: `L'email non è stata reinviata. ${messaggioErrore(res.status, res.dati)}` });
  };

  const prenotataIl = dataOraRoma(r.created_at).split(" ")[0];
  const prenotataAlle = oraRoma(r.created_at);

  return (
    <article className="eva-persona" aria-labelledby={`eva-c-${r.id}`}>
      <div className="eva-persona-testa">
        <div style={{ minWidth: 0 }}>
          <h3 id={`eva-c-${r.id}`} className="eva-persona-nome">
            {titolo}
          </h3>
        </div>
        {r.licei_adesione_id && <span className="eva-pill eva-pill-teal">Percorso dei licei</span>}
      </div>

      <div className="eva-dettagli">
        <span>
          <i className="fas fa-chalkboard-user" aria-hidden="true" />
          <span>
            <span className="sr-only">Docente: </span>
            {docente}
          </span>
        </span>
        <a href={`tel:${r.docente_telefono.replace(/[^\d+]/g, "")}`}>
          <i className="fas fa-phone" aria-hidden="true" />
          <span>{r.docente_telefono}</span>
        </a>
        <a href={`mailto:${r.docente_email}`}>
          <i className="fas fa-envelope" aria-hidden="true" />
          <span>{r.docente_email}</span>
        </a>
        <span>
          <i className="fas fa-user-group" aria-hidden="true" />
          <span>
            {descriviPersone(r.studenti, r.accompagnatori)}, <strong>{numero(r.posti)}</strong> in tutto
          </span>
        </span>
        <span>
          <i className="fas fa-ticket" aria-hidden="true" />
          <span>
            <span className="sr-only">Codice della classe: </span>
            <span className="eva-codice">{r.codice}</span>
          </span>
        </span>
        <span>
          <i className="fas fa-clock" aria-hidden="true" />
          <span>
            Prenotata il {prenotataIl}
            {prenotataAlle ? ` alle ${prenotataAlle}` : ""}
          </span>
        </span>
      </div>

      {r.note && (
        <p className="eva-note">
          <strong>Note: </strong>
          {r.note}
        </p>
      )}

      <div className="eva-giornate">
        {r.giornate.length === 0 && (
          <div className="eva-avviso eva-avviso-errore">
            <i className="fas fa-calendar-xmark" aria-hidden="true" />
            <div>
              <strong>Nessuna giornata.</strong>{" "}Questa prenotazione non vale per nessuna giornata e all&apos;ingresso
              la classe non risulta.
            </div>
          </div>
        )}
        {r.giornate.map((g) => {
          const conosciuta = Boolean(sessionBySlug(g.slug));
          return (
            <div key={g.id} className="eva-g">
              <div className="eva-g-testa">
                <span className="eva-g-data">{etichettaGiornata(g.slug)}</span>
                {!conosciuta && <span className="eva-pill eva-pill-errore">Sessione non usata dal sito</span>}
                {g.status === "confermato" ? (
                  <span className="eva-pill eva-pill-ok">
                    <i className="fas fa-check" aria-hidden="true" />{" "}
                    Confermata
                  </span>
                ) : (
                  <span className="eva-pill eva-pill-attesa">
                    <i className="fas fa-hourglass-half" aria-hidden="true" />{" "}
                    Lista d&apos;attesa{g.posizione_attesa ? `, n. ${g.posizione_attesa}` : ""}
                  </span>
                )}
                {g.presenti !== null && (
                  <span className="eva-pill eva-pill-neutro">
                    Entrati {numero(g.presenti)} di {numero(r.posti)}
                    {g.checkin_ts ? `, dalle ${oraRoma(g.checkin_ts)}` : ""}
                  </span>
                )}
                <SettoreGiornata g={g} occupato={occupato} onSalva={salvaSettore} />
              </div>
              <div className="eva-g-comandi">
                {g.status === "lista_attesa" && conosciuta && (
                  <button
                    type="button"
                    className="eva-btn eva-btn-primario"
                    disabled={occupato}
                    onClick={() => {
                      setEsito(null);
                      setDomanda({ tipo: "conferma", g });
                    }}
                  >
                    <i
                      className={inCorso === `conferma:${g.id}` ? "fas fa-spinner fa-spin" : "fas fa-user-check"}
                      aria-hidden="true"
                    />{" "}
                    Conferma il posto
                  </button>
                )}
                <button
                  type="button"
                  className="eva-btn eva-btn-pericolo"
                  disabled={occupato}
                  onClick={() => {
                    setEsito(null);
                    setAvvisaRimozione(true);
                    setDomanda({ tipo: "rimuovi", g, ultima: r.giornate.length === 1 });
                  }}
                >
                  <i
                    className={inCorso === `rimuovi:${g.id}` ? "fas fa-spinner fa-spin" : "fas fa-calendar-minus"}
                    aria-hidden="true"
                  />{" "}
                  Togli questa giornata
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {numeriAperti && (
        <ModuloNumeri
          r={r}
          occupato={occupato}
          onSalva={(s, d, avvisa) => {
            avvisaNumeri.current = avvisa;
            void salvaNumeri(s, d, avvisa);
          }}
          onAnnulla={() => setNumeriAperti(false)}
        />
      )}

      {domanda && (
        <div
          ref={boxDomanda}
          role="group"
          aria-label="Conferma l'operazione"
          className={`eva-chiedi ${domanda.tipo === "conferma" ? "eva-chiedi-normale" : "eva-chiedi-pericolo"}`}
        >
          {domanda.tipo === "conferma" && (
            <>
              <p>
                Confermare il posto della <strong>{titolo}</strong> per {conArticolo(domanda.g.slug)}? Sono{" "}
                {numero(r.posti)}{" "}persone. Il docente riceve l&apos;email con la prenotazione confermata.
              </p>
              <div className="eva-azioni">
                <button type="button" className="eva-btn eva-btn-primario" onClick={() => void conferma(domanda.g, false)}>
                  <i className="fas fa-user-check" aria-hidden="true" />{" "}
                  Conferma il posto
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
          {domanda.tipo === "forza" && (
            <>
              <p>
                <strong>{domanda.testo}</strong>{" "}Confermando ora, la classe va oltre i posti disponibili. Procedi solo
                se hai verificato che c&apos;è spazio in sala.
              </p>
              <div className="eva-azioni">
                <button type="button" className="eva-btn eva-btn-pieno-pericolo" onClick={() => void conferma(domanda.g, true)}>
                  Conferma oltre i posti
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
          {domanda.tipo === "forza_numeri" && (
            <>
              <p>
                <strong>{domanda.testo}</strong>{" "}Salvando comunque, la classe occupa più posti di quelli disponibili.
                Procedi solo se hai verificato che c&apos;è spazio in sala.
              </p>
              <div className="eva-azioni">
                <button
                  type="button"
                  className="eva-btn eva-btn-pieno-pericolo"
                  onClick={() => void salvaNumeri(domanda.studenti, domanda.accompagnatori, avvisaNumeri.current, true)}
                >
                  Salva comunque
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
          {domanda.tipo === "rimuovi" && (
            <>
              <p>
                {domanda.ultima ? (
                  <>
                    {maiuscola(conArticolo(domanda.g.slug))} è l&apos;unica giornata della <strong>{titolo}</strong>:
                    toglierla <strong>annulla la prenotazione</strong>, e il codice {r.codice} smette di valere. Non si
                    può annullare.
                  </>
                ) : (
                  <>
                    Togliere {conArticolo(domanda.g.slug)} dalla prenotazione della <strong>{titolo}</strong>?
                  </>
                )}{" "}
                {domanda.g.status === "confermato"
                  ? "I posti passano a chi è in lista d'attesa (prima le classi che ci stanno, poi le persone), che riceve l'email."
                  : "La classe esce dalla lista d'attesa."}{" "}
                {domanda.g.presenti !== null && "La classe risulta già entrata: l'ingresso registrato si perde."}
              </p>
              <CasellaAvvisa valore={avvisaRimozione} onCambia={setAvvisaRimozione} />
              <div className="eva-azioni">
                <button type="button" className="eva-btn eva-btn-pieno-pericolo" onClick={() => void rimuovi(domanda.g)}>
                  <i className={domanda.ultima ? "fas fa-trash" : "fas fa-calendar-minus"} aria-hidden="true" />{" "}
                  {domanda.ultima ? "Annulla la prenotazione" : "Togli la giornata"}
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Lascia com&apos;è
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="eva-persona-piede">
        <div className="eva-azioni">
          {!numeriAperti && (
            <button
              type="button"
              className="eva-btn"
              disabled={occupato}
              onClick={() => {
                setEsito(null);
                setDomanda(null);
                setNumeriAperti(true);
              }}
            >
              <i className="fas fa-user-pen" aria-hidden="true" />{" "}
              Cambia i numeri
            </button>
          )}
          {valide.length > 0 && (
            <button type="button" className="eva-btn" disabled={occupato} onClick={() => void reinvia()}>
              <i className={inCorso === "reinvia" ? "fas fa-spinner fa-spin" : "fas fa-paper-plane"} aria-hidden="true" />
              {inCorso === "reinvia" ? "Invio in corso…" : "Reinvia l'email"}
            </button>
          )}
          <a className="eva-btn-link" href={urlClasse(r.codice)} target="_blank" rel="noopener noreferrer">
            Apri la pagina della classe{" "}
            <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" style={{ fontSize: 12 }} />
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
        </div>
      </div>

      <MessaggioEsito esito={esito} />
    </article>
  );
});

/* ── La scheda ────────────────────────────────────────────────────────── */

export function PannelloClassi({
  attivo,
  filtri,
  onFiltri,
}: {
  attivo: boolean;
  filtri: FiltriClassi;
  onFiltri: (f: FiltriClassi) => void;
}) {
  const [dati, setDati] = useState<RispostaClassi | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [limite, setLimite] = useState(PASSO);
  const [ordine, setOrdine] = useState<Ordine>("recenti");
  const [avviso, setAvviso] = useState<Esito | null>(null);
  const [erroreFile, setErroreFile] = useState<string | null>(null);
  /** Le classi su cui lo staff ha appena agito restano in elenco finché non cambiano i filtri. */
  const [trattenute, setTrattenute] = useState<ReadonlySet<string>>(new Set());
  const numeroRichiesta = useRef(0);
  const ultimaLettura = useRef(0);

  const carica = useCallback(async () => {
    const n = ++numeroRichiesta.current;
    setInCorso(true);
    const r = await leggiJson<RispostaClassi>(API);
    if (n !== numeroRichiesta.current) return;
    setInCorso(false);
    if (r.ok && r.dati && Array.isArray(r.dati.classi)) {
      setDati(r.dati);
      setErrore(null);
      ultimaLettura.current = Date.now();
    } else {
      setErrore(messaggioErrore(r.status, r.dati));
    }
  }, []);

  useEffect(() => {
    if (attivo && Date.now() - ultimaLettura.current > 30_000) void carica();
  }, [attivo, carica]);

  const q = useDeferredValue(filtri.q);
  const { giornata, stato } = filtri;
  const inListaAttesa = stato === "attesa" && Boolean(giornata);

  const filtrate = useMemo(() => {
    if (!dati) return [];
    const corrispondono = filtraClassi(dati.classi, { q, giornata, stato });
    let righe = corrispondono;
    if (trattenute.size > 0) {
      const ids = new Set(corrispondono.map((r) => r.id));
      righe = dati.classi.filter((r) => ids.has(r.id) || trattenute.has(r.id));
    }
    if (inListaAttesa) {
      const pos = (r: RigaClasse) =>
        r.giornate.find((g) => g.slug === giornata)?.posizione_attesa ?? Number.MAX_SAFE_INTEGER;
      return [...righe].sort((a, b) => pos(a) - pos(b) || confrontaClassiPerData(b, a));
    }
    return [...righe].sort(ordine === "scuola" ? confrontaClassiPerScuola : confrontaClassiPerData);
  }, [dati, q, giornata, stato, ordine, inListaAttesa, trattenute]);

  useEffect(() => {
    setLimite(PASSO);
    setTrattenute((prev) => (prev.size === 0 ? prev : new Set()));
  }, [q, giornata, stato, ordine]);

  const cambiato = useCallback(
    (id: string) => {
      setTrattenute((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      void carica();
    },
    [carica],
  );
  const eliminata = useCallback((esito: Esito) => setAvviso(esito), []);
  const boxAvviso = useRef<HTMLDivElement | null>(null);
  // La scheda della classe annullata sparisce: l'esito deve vedersi dov'è.
  useEffect(() => {
    if (avviso) boxAvviso.current?.scrollIntoView({ block: "nearest" });
  }, [avviso]);
  const ricarica = useCallback(() => void carica(), [carica]);

  const cambia = (parziale: Partial<FiltriClassi>) => onFiltri({ ...filtri, ...parziale });
  const daGiornata = useCallback(
    (f: Partial<FiltriClassi>) => {
      onFiltri({ ...FILTRI_CLASSI_VUOTI, ...f });
      document.getElementById("eva-classi-elenco")?.scrollIntoView({ block: "start" });
    },
    [onFiltri],
  );

  const visibili = filtrate.slice(0, limite);
  const totale = dati?.classi.length ?? 0;
  const persone = dati?.classi.reduce((t, c) => t + c.posti, 0) ?? 0;
  const conFiltri = filtriClassiAttivi(filtri);

  return (
    <div className="eva-griglia" style={{ gap: 18 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="eva-h2">Classi</h2>
          <p className="eva-sub" style={{ marginTop: 2 }}>
            {dati
              ? `${plurale(totale, "prenotazione", "prenotazioni")}, ${plurale(persone, "persona", "persone")}, elenco letto alle ${oraRoma(dati.generato_at)}.`
              : "Lettura dell'elenco in corso."}
          </p>
        </div>
        <button type="button" className="eva-btn" onClick={ricarica} disabled={inCorso} aria-busy={inCorso}>
          <i className={`fas fa-rotate${inCorso ? " fa-spin" : ""}`} aria-hidden="true" />
          {inCorso ? "Aggiornamento…" : "Aggiorna"}
        </button>
      </div>

      {dati && !dati.disponibili && (
        <div className="eva-avviso eva-avviso-errore" role="alert">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <strong>Le prenotazioni per classe non sono nel database.</strong>{" "}Le scuole non possono prenotare finché non
            si esegue nell&apos;editor SQL di Supabase il file <code>{FILE_SQL_CLASSI}</code>.
          </div>
        </div>
      )}

      {errore && (
        <div className="eva-avviso eva-avviso-errore" role="alert">
          <i className="fas fa-circle-exclamation" aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <strong>{errore}</strong>
            {dati ? " Quello che vedi qui sotto è stato letto prima." : ""}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="eva-btn" onClick={ricarica}>
                Riprova
              </button>
            </div>
          </div>
        </div>
      )}

      {!dati && !errore && (
        <div className="eva-griglia eva-griglia-2" aria-hidden="true">
          <div className="eva-scheletro" style={{ height: 320 }} />
          <div className="eva-scheletro" style={{ height: 320 }} />
        </div>
      )}

      {dati && dati.disponibili && (
        <div className="eva-griglia eva-griglia-2">
          {dati.giornate.map((g) => (
            <SchedaGiornataClassi key={g.slug} g={g} onFiltri={daGiornata} onCambiato={ricarica} />
          ))}
        </div>
      )}

      {/* Ricerca e filtri */}
      <div id="eva-classi-elenco" className="eva-box" role="search" aria-label="Cerca e filtra le classi" style={{ scrollMarginTop: 150 }}>
        <div className="eva-filtri eva-filtri-classi">
          <div>
            <label htmlFor="eva-cq" className="eva-label">
              Cerca
            </label>
            <div className="eva-cerca">
              <i className="fas fa-magnifying-glass" aria-hidden="true" />
              <input
                id="eva-cq"
                type="search"
                className="eva-campo"
                placeholder="Scuola, classe o docente"
                value={filtri.q}
                onChange={(e) => cambia({ q: e.target.value })}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
              />
              {filtri.q && (
                <button type="button" className="eva-cerca-svuota" aria-label="Svuota la ricerca" onClick={() => cambia({ q: "" })}>
                  <i className="fas fa-xmark" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="eva-cgiornata" className="eva-label">
              Giornata
            </label>
            <select id="eva-cgiornata" className="eva-campo" value={filtri.giornata} onChange={(e) => cambia({ giornata: e.target.value })}>
              <option value="">Tutte le giornate</option>
              {GIORNATE.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.etichetta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="eva-cstato" className="eva-label">
              Stato
            </label>
            <select
              id="eva-cstato"
              className="eva-campo"
              value={filtri.stato}
              onChange={(e) => cambia({ stato: e.target.value as FiltroStatoClasse })}
            >
              {STATI_FILTRO_CLASSI.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="eva-cordine" className="eva-label">
              Ordine
            </label>
            <select
              id="eva-cordine"
              className="eva-campo"
              value={inListaAttesa ? "attesa" : ordine}
              disabled={inListaAttesa}
              onChange={(e) => setOrdine(e.target.value as Ordine)}
            >
              {inListaAttesa && <option value="attesa">Ordine di prenotazione</option>}
              <option value="recenti">Più recenti prima</option>
              <option value="scuola">Per scuola</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginTop: 14 }}>
          <p className="eva-sub" style={{ margin: 0 }} role="status" aria-live="polite">
            {!dati
              ? ""
              : filtrate.length === 0
                ? "Nessuna classe corrisponde."
                : conFiltri
                  ? `${numero(filtrate.length)} su ${numero(totale)} corrispondono${filtrate.length > limite ? `, ne mostro ${numero(limite)}` : ""}.`
                  : filtrate.length > limite
                    ? `Mostro le prime ${numero(limite)} di ${numero(filtrate.length)}.`
                    : plurale(filtrate.length, "classe.", "classi.")}
          </p>
          {conFiltri && (
            <button type="button" className="eva-btn-link" onClick={() => onFiltri(FILTRI_CLASSI_VUOTI)}>
              <i className="fas fa-filter-circle-xmark" aria-hidden="true" />{" "}
              Azzera i filtri
            </button>
          )}
        </div>
      </div>

      {/* Scarica e stampa */}
      <div className="eva-box">
        <h3 className="eva-h2" style={{ fontSize: 15.5 }}>
          Scarica e stampa
        </h3>
        <p className="eva-sub">
          File CSV per Excel, una riga per classe, con i contatti del docente.{" "}
          {filtri.q.trim() || filtri.stato ? "I file tengono conto della ricerca e del filtro di stato." : "Comprendono tutte le classi."}{" "}
          La lista per la porta è in ordine di scuola, con il telefono del docente e il settore.
        </p>
        <div className="eva-azioni" style={{ marginTop: 12 }}>
          <PulsanteScarica url={urlExportClassi(filtri)} onErrore={setErroreFile} className="eva-btn eva-btn-primario">
            Scarica tutte
          </PulsanteScarica>
          {GIORNATE.map((g) => (
            <PulsanteScarica key={g.slug} url={urlExportClassi(filtri, g.slug)} onErrore={setErroreFile}>
              Scarica {g.etichetta}
            </PulsanteScarica>
          ))}
          {GIORNATE.map((g) => (
            <a key={g.slug} className="eva-btn" href={urlStampaClassi(g.slug)} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-print" aria-hidden="true" />{" "}
              Stampa classi {g.etichetta}
              <span className="sr-only"> (si apre in una nuova scheda)</span>
            </a>
          ))}
        </div>
        {erroreFile && (
          <p className="eva-esito eva-esito-errore" role="alert">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <span>{erroreFile}</span>
          </p>
        )}
      </div>

      {avviso && (
        <div
          ref={boxAvviso}
          className={`eva-avviso eva-avviso-${avviso.tipo === "ok" ? "ok" : "attenzione"}`}
          role="status"
          style={{ scrollMarginTop: 150 }}
        >
          <IconaEsito tipo={avviso.tipo} />
          <div style={{ flex: 1 }}>{avviso.testo}</div>
          <button type="button" className="eva-chiudi" aria-label="Chiudi il messaggio" onClick={() => setAvviso(null)}>
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}

      {dati && filtrate.length === 0 && (
        <div className="eva-box" style={{ textAlign: "center", padding: "36px 20px" }}>
          <span className="icon-circle icon-circle-primary" style={{ margin: "0 auto 12px", width: 48, height: 48 }}>
            <i className="fas fa-school" aria-hidden="true" />
          </span>
          <p className="eva-h2" style={{ fontSize: 16 }}>
            {totale === 0 ? "Ancora nessuna classe prenotata." : "Nessuna classe corrisponde a questi filtri."}
          </p>
          {conFiltri && (
            <button type="button" className="eva-btn" style={{ marginTop: 12 }} onClick={() => onFiltri(FILTRI_CLASSI_VUOTI)}>
              Azzera i filtri
            </button>
          )}
        </div>
      )}

      {visibili.length > 0 && (
        <ul className="eva-persone" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {visibili.map((r) => (
            <li key={r.id}>
              <SchedaClasse r={r} onCambiato={cambiato} onEliminata={eliminata} />
            </li>
          ))}
        </ul>
      )}

      {filtrate.length > limite && (
        <div style={{ textAlign: "center" }}>
          <button type="button" className="eva-btn" onClick={() => setLimite((l) => l + PASSO)}>
            <i className="fas fa-chevron-down" aria-hidden="true" />{" "}
            Mostra altre {numero(Math.min(PASSO, filtrate.length - limite))} (ne restano {numero(filtrate.length - limite)})
          </button>
        </div>
      )}
    </div>
  );
}
