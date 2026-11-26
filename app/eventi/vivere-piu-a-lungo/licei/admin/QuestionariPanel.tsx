"use client";

/**
 * La scheda «Questionari»: il questionario di fine percorso, per studenti e
 * docenti. Quanti sono stati invitati e quanti hanno risposto (mai chi),
 * le risposte chiuse contate, quelle aperte in ordine casuale, il CSV e
 * l'anteprima delle domande.
 *
 * Le risposte sono anonime nel database: questa scheda non le divide per
 * scuola e non mostra date, che servirebbero solo a riconoscere qualcuno.
 */

import { useCallback, useEffect, useState } from "react";
import {
  QUESTIONARIO_CHIUDE_LABEL,
  QUESTIONARIO_INVIO_FINO,
  QUESTIONARIO_INVIO_FINO_LABEL,
  QUESTIONARIO_PATH,
  QUESTIONARIO_PROMEMORIA_FINO,
  type RuoloQuestionario,
} from "../questionario/domande";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

type Conteggio = { valore: string; etichetta: string; n: number };
type Domanda = {
  id: string;
  testo: string;
  tipo: "scala" | "scelta" | "testo";
  n: number;
  conteggi?: Conteggio[];
  media?: number | null;
  nps?: number | null;
  estremi?: [string, string];
  testi?: string[];
};
type Ruolo = { invitati: number; hanno_risposto: number; risposte: number; domande: Domanda[] };

const oraRoma = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const quando = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : oraRoma.format(d);
};
const pct = (n: number, tot: number) => (tot > 0 ? Math.round((n / tot) * 100) : 0);

const OK = { background: "#0A7A661A", color: "#0A7A66" };
const ATTESA = { background: "#F1F5F9", color: "var(--text-dark)" };
const MANCATO = { background: "#8A61001A", color: "#8A6100" };

/** Lo stato di un invio: fatto, in programma, o non partito (finestra del calendario chiusa). */
const statoInvio = (fattoAt: string | null, fino: string) =>
  fattoAt
    ? { testo: "Inviato", stile: OK }
    : Date.now() > Date.parse(fino)
      ? { testo: "Non partito", stile: MANCATO }
      : { testo: "In programma", stile: ATTESA };

export function QuestionariPanel() {
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [ruolo, setRuolo] = useState<RuoloQuestionario>("studente");

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/questionari", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDati(data);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  if (loading && !dati) return <p className="text-gray-600">Caricamento…</p>;

  const r: Ruolo | null = dati?.disponibile ? dati[ruolo] : null;
  const inviato = quando(dati?.inviato_at ?? null);
  const promemoria = quando(dati?.promemoria_at ?? null);
  const statoInvito = statoInvio(dati?.inviato_at ?? null, QUESTIONARIO_INVIO_FINO);
  const statoPromemoria = statoInvio(dati?.promemoria_at ?? null, QUESTIONARIO_PROMEMORIA_FINO);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div style={{ maxWidth: 640 }}>
          <h1 className="text-2xl font-bold text-gray-800">Questionari di fine percorso</h1>
          <p className="text-sm text-gray-600">
            Anonimi e facoltativi: qui si vede quanti hanno risposto, mai chi. Le risposte aperte sono in ordine
            casuale e non hanno data. Si risponde fino a {QUESTIONARIO_CHIUDE_LABEL}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/eventi/licei/admin/questionari/export?ruolo=studente" className="btn-primary" style={{ fontSize: 13 }}>
            <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
            Studenti
          </a>
          <a href="/api/eventi/licei/admin/questionari/export?ruolo=docente" className="btn-outline" style={{ fontSize: 13 }}>
            <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
            Docenti
          </a>
          <button type="button" className="btn-outline" style={{ fontSize: 13 }} onClick={carica} disabled={loading}>
            <i className={`fas fa-rotate${loading ? " fa-spin" : ""}`} style={{ marginRight: 8 }} />
            Aggiorna
          </button>
        </div>
      </div>

      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {dati && !dati.disponibile && (
        <div
          role="note"
          style={{ background: "#FFF8E6", border: "1px solid #F0D89B", color: "#75570F", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, lineHeight: 1.6 }}
        >
          Manca la migrazione <code>{dati.migrazione}</code>: finché non viene applicata nell&apos;editor SQL di Supabase,
          il questionario non parte e qui non c&apos;è niente da mostrare. Il calendario riprova ogni mattina fino a{" "}
          {QUESTIONARIO_INVIO_FINO_LABEL}; dopo, il questionario non parte più.
        </div>
      )}

      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Invii automatici
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Partono da soli con il calendario della Commissione: a ognuno il suo link personale. Le email si vedono in
          anteprima e si provano dalla scheda «Commissione», in fondo al calendario.
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <li className="flex flex-wrap items-center gap-2">
            <span className="badge" style={statoInvito.stile}>{statoInvito.testo}</span>
            <span>
              Invito a studenti e docenti: {inviato ? inviato : "lunedì 30 novembre, ore 8"}
            </span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="badge" style={statoPromemoria.stile}>{statoPromemoria.testo}</span>
            <span>
              Promemoria a chi non ha risposto: {promemoria ? promemoria : "mercoledì 2 dicembre, ore 8"}
            </span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="badge" style={ATTESA}>Chiusura</span>
            <span>{QUESTIONARIO_CHIUDE_LABEL}</span>
          </li>
        </ul>
        <p className="text-sm" style={{ margin: "14px 0 0" }}>
          Le domande come le vede chi risponde:{" "}
          <a href={`${QUESTIONARIO_PATH}?anteprima=studente`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            studenti
          </a>{" "}
          e{" "}
          <a href={`${QUESTIONARIO_PATH}?anteprima=docente`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            docenti
          </a>{" "}
          (anteprima: niente viene salvato).
        </p>
      </div>

      {dati?.disponibile && (
        <>
          <div className="card-sm flex flex-wrap gap-2 items-center" style={{ padding: 10 }} role="group" aria-label="Chi ha risposto">
            {(["studente", "docente"] as const).map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={ruolo === x}
                onClick={() => setRuolo(x)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: ruolo === x ? "var(--primary-light)" : "transparent",
                  color: ruolo === x ? "var(--text-dark)" : "var(--text-light)",
                }}
              >
                {x === "studente" ? "Studenti" : "Docenti"}
              </button>
            ))}
          </div>

          {r && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Tessera n={r.invitati} etichetta="Invitati" />
                <Tessera n={r.hanno_risposto} etichetta="Hanno risposto" colore="#0A7A66" />
                <Tessera n={`${pct(r.hanno_risposto, r.invitati)}%`} etichetta="Tasso di risposta" />
              </div>

              {r.risposte === 0 ? (
                <div className="card text-center" style={{ padding: 40 }}>
                  <p className="text-gray-600 m-0">
                    {inviato ? "Ancora nessuna risposta." : "Il questionario non è ancora partito."}
                  </p>
                </div>
              ) : (
                r.domande.map((d, i) => <SchedaDomanda key={d.id} d={d} numero={i + 1} totale={r.risposte} />)
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Tessera({ n, etichetta, colore }: { n: number | string; etichetta: string; colore?: string }) {
  return (
    <div className="card-sm" style={{ padding: 16 }}>
      <div className="stat-number" style={{ fontSize: 26, ...(colore ? { color: colore } : {}) }}>
        {n}
      </div>
      <div className="stat-label">{etichetta}</div>
    </div>
  );
}

function Barra({ etichetta, n, tot }: { etichetta: string; n: number; tot: number }) {
  const p = pct(n, tot);
  return (
    <div>
      <div className="flex justify-between gap-3" style={{ fontSize: 13.5, color: "var(--text-dark)" }}>
        <span>{etichetta}</span>
        <span style={{ color: "var(--text-mid)", fontVariantNumeric: "tabular-nums" }}>
          {n} ({p}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={etichetta}
        aria-valuemin={0}
        aria-valuemax={tot}
        aria-valuenow={n}
        aria-valuetext={`${n} su ${tot}, ${p}%`}
        style={{ height: 10, borderRadius: 999, background: "#EEF2F6", overflow: "hidden", marginTop: 4 }}
      >
        <span style={{ display: "block", height: "100%", borderRadius: 999, background: "var(--primary)", width: `${p}%` }} />
      </div>
    </div>
  );
}

function SchedaDomanda({ d, numero, totale }: { d: Domanda; numero: number; totale: number }) {
  const primo = d.conteggi?.[0]?.valore;
  const ultimo = d.conteggi?.[d.conteggi.length - 1]?.valore;
  // Sulle scale, gli estremi con il loro significato: "1 (Per niente)".
  const etichetta = (c: Conteggio) =>
    d.tipo === "scala" && d.estremi && (c.valore === primo || c.valore === ultimo)
      ? `${c.etichetta} (${c.valore === primo ? d.estremi[0] : d.estremi[1]})`
      : c.etichetta;
  return (
    <div className="card" style={{ padding: 18 }}>
      <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
        {numero}. {d.testo}
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        {d.n} {d.n === 1 ? "risposta" : "risposte"} su {totale}
        {d.tipo === "scala" && d.media != null && <> . Media {String(d.media).replace(".", ",")}</>}
        {d.tipo === "scala" && d.nps != null && (
          <> . Indice di raccomandazione {d.nps > 0 ? `+${d.nps}` : d.nps} (chi dà 9 o 10, meno chi dà da 0 a 6)</>
        )}
      </p>

      {d.conteggi && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {d.conteggi.map((c) => (
            <Barra key={c.valore} etichetta={etichetta(c)} n={c.n} tot={d.n} />
          ))}
        </div>
      )}

      {d.testi &&
        (d.testi.length === 0 ? (
          <p className="text-sm text-gray-600 m-0">Nessuna risposta scritta.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              maxHeight: 420,
              overflowY: "auto",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
            }}
          >
            {d.testi.map((t, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 14px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--text-dark)",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
