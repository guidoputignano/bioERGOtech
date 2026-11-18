"use client";

/**
 * Riepilogo: tutto quello che serve sapere in un colpo d'occhio, dal
 * telefono. Prima gli allarmi (giornate che mancano nel database, iscrizioni
 * senza giornata), poi una scheda per giornata con posti, lista d'attesa e
 * ingressi, poi l'andamento delle iscrizioni, le categorie e le scuole.
 *
 * I conti li fa il server su tutte le iscrizioni (/api/eventi/admin/riepilogo).
 * Si aggiorna da solo ogni minuto mentre la scheda è aperta e visibile; se
 * una lettura fallisce restano i numeri di prima, con l'ora a cui risalgono.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { categoriaLabel, giornateConArticolo, SESSIONS } from "../content";
import {
  FILE_SQL_GIORNATE,
  FILTRI_VUOTI,
  leggiJson,
  messaggioErrore,
  oraRoma,
  urlExport,
  urlStampa,
  type Filtri,
  type InfoGiornata,
  type Riepilogo,
} from "./PannelloComune";
import { PulsanteScarica } from "./PannelloScarica";

const OGNI_MS = 60_000;
const numero = (n: number) => n.toLocaleString("it-IT");
const maiuscola = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const plurale = (n: number, uno: string, molti: string) => `${numero(n)} ${n === 1 ? uno : molti}`;

/* ── Allarmi ──────────────────────────────────────────────────────────── */

function Allarmi({ dati, onApriIscritti }: { dati: Riepilogo; onApriIscritti: (f: Partial<Filtri>) => void }) {
  const { mancanti, senzaGiornata, sconosciute } = dati;
  if (mancanti.length === 0 && senzaGiornata === 0 && sconosciute.length === 0) return null;
  /** Il file di ripristino non è ancora stato eseguito: solo allora va suggerito. */
  const ripristinoDaFare = mancanti.length > 0;
  const primaGiornata = giornateConArticolo([SESSIONS[0].slug]);
  return (
    <div className="eva-griglia" role="alert">
      {mancanti.length > 0 && (
        <div className="eva-avviso eva-avviso-errore">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <strong>
              {maiuscola(giornateConArticolo(mancanti))} {mancanti.length === 1 ? "non esiste" : "non esistono"} nel
              database.
            </strong>{" "}
            Chi {mancanti.length === 1 ? "sceglie questa giornata" : "sceglie queste giornate"} non viene iscritto e il
            pannello non può contare i posti. Esegui nell&apos;editor SQL di Supabase il file{" "}
            <code>{FILE_SQL_GIORNATE}</code>, come indicato nel README del modulo evento.
          </div>
        </div>
      )}
      {senzaGiornata > 0 && (
        <div className="eva-avviso eva-avviso-errore">
          <i className="fas fa-user-slash" aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <strong>
              {senzaGiornata === 1
                ? "1 iscrizione non ha nessuna giornata."
                : `${numero(senzaGiornata)} iscrizioni non hanno nessuna giornata.`}
            </strong>{" "}
            {senzaGiornata === 1 ? "La persona non ha" : "Queste persone non hanno"} un posto, e all&apos;ingresso il
            biglietto non risulta.{" "}
            {ripristinoDaFare ? (
              <>
                Il file di ripristino, che va ancora eseguito,{" "}
                {senzaGiornata === 1 ? "le restituisce" : "restituisce loro"} {primaGiornata}: per ora{" "}
                {senzaGiornata === 1 ? "non va eliminata" : "non vanno eliminate"}.
              </>
            ) : (
              <>
                {senzaGiornata === 1 ? "Non riceve le email a tutti. Controllala" : "Non ricevono le email a tutti. Controllale una per una"}{" "}
                nella scheda Iscritti: se la persona vuole venire, aggiungi la giornata giusta dal suo biglietto;
                altrimenti elimina l&apos;iscrizione.
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="eva-btn" onClick={() => onApriIscritti({ stato: "senza" })}>
                <i className="fas fa-list" aria-hidden="true" />{" "}
                Vedi le iscrizioni senza giornata
              </button>
            </div>
          </div>
        </div>
      )}
      {sconosciute.length > 0 && (
        <div className="eva-avviso eva-avviso-attenzione">
          <i className="fas fa-circle-question" aria-hidden="true" />
          <div>
            <strong>
              {sconosciute.reduce((t, s) => t + s.persone, 0) === 1
                ? "1 persona è collegata"
                : `${numero(sconosciute.reduce((t, s) => t + s.persone, 0))} persone sono collegate`}{" "}
              a sessioni che il sito non usa più:
            </strong>{" "}
            {sconosciute.map((s) => `${s.slug} (${s.persone})`).join(", ")}. Non compaiono nei conteggi delle giornate.{" "}
            {ripristinoDaFare ? (
              <>
                Se sono le vecchie sessioni del 10 dicembre (giorno-1-mattina, giorno-1-pomeriggio), il file{" "}
                <code>{FILE_SQL_GIORNATE}</code> le riporta sulla giornata giusta.
              </>
            ) : (
              <>Controlla queste persone nella scheda Iscritti.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Lista d'attesa da smaltire ───────────────────────────────────────── */

function Richiami({ giornate, onApriIscritti }: { giornate: InfoGiornata[]; onApriIscritti: (f: Partial<Filtri>) => void }) {
  const daConfermare = giornate.filter((g) => g.nelDatabase && (g.liberi ?? 0) > 0 && g.attesa > 0);
  if (daConfermare.length === 0) return null;
  return (
    <div className="eva-griglia">
      {daConfermare.map((g) => {
        const n = Math.min(g.liberi ?? 0, g.attesa);
        return (
          <div key={g.slug} className="eva-avviso eva-avviso-info">
            <i className="fas fa-user-check" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <strong>
                Puoi confermare {plurale(n, "persona", "persone")} dalla lista d&apos;attesa{" "}
                {giornateConArticolo([g.slug]).startsWith("l'") ? "dell'" : "del "}
                {g.etichetta}.
              </strong>{" "}
              {maiuscola(giornateConArticolo([g.slug]))} {g.liberi === 1 ? "c'è 1 posto libero" : `ci sono ${numero(g.liberi ?? 0)} posti liberi`}{" "}
              e {plurale(g.attesa, "persona aspetta", "persone aspettano")}. L&apos;elenco le mostra in ordine di arrivo.{" "}
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="eva-btn eva-btn-primario"
                  onClick={() => onApriIscritti({ giornata: g.slug, stato: "attesa" })}
                >
                  <i className="fas fa-arrow-right" aria-hidden="true" />{" "}
                  Apri la lista d&apos;attesa
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Una giornata ─────────────────────────────────────────────────────── */

function Stat({ n, label, colore, su }: { n: number | string; label: string; colore: string; su?: number | null }) {
  return (
    <div className="eva-stat">
      <div className="eva-stat-n">
        {typeof n === "number" ? numero(n) : n}
        {su != null && <small> su {numero(su)}</small>}
      </div>
      <div className="eva-stat-l">
        <span className="eva-dot" style={{ background: colore }} aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}

function SchedaGiornata({ g, onApriIscritti }: { g: InfoGiornata; onApriIscritti: (f: Partial<Filtri>) => void }) {
  const [erroreFile, setErroreFile] = useState<string | null>(null);
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
      <article className="eva-box" aria-label={g.giornoLabel}>
        <div className="eva-giornata-testa">
          {titolo}
          <span className="eva-pill eva-pill-errore">Non nel database</span>
        </div>
        <div className="eva-stats eva-stats-4" style={{ marginTop: 16 }}>
          {["Confermati", "Lista d'attesa", "Entrati", "Posti liberi"].map((l) => (
            <div key={l} className="eva-stat">
              <div className="eva-assente-db">non nel database</div>
              <div className="eva-stat-l">{l}</div>
            </div>
          ))}
        </div>
        <p className="eva-sub" style={{ marginTop: 12 }}>
          Questa giornata non ha una riga in <code>event_sessions</code>: i numeri non si possono calcolare e chi la
          sceglie non viene iscritto.
        </p>
      </article>
    );
  }

  const cap = g.capienza;
  const pct = cap > 0 ? Math.min(100, Math.round((g.confermati / cap) * 100)) : 100;
  const pieno = (g.liberi ?? 0) === 0;
  return (
    <article className="eva-box" aria-label={g.giornoLabel}>
      <div className="eva-giornata-testa">
        {titolo}
        {pieno ? (
          <span className="eva-pill eva-pill-attesa">Al completo</span>
        ) : (
          <span className="eva-pill eva-pill-teal">{plurale(g.liberi ?? 0, "posto libero", "posti liberi")}</span>
        )}
      </div>

      <div
        className={`eva-barra${pieno ? " eva-barra-piena" : ""}`}
        role="progressbar"
        aria-label={`Posti confermati ${giornateConArticolo([g.slug])}`}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={Math.min(g.confermati, cap)}
        aria-valuetext={`${numero(g.confermati)} posti confermati su ${numero(cap)}`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="eva-barra-legenda">
        <span>
          <strong style={{ color: "var(--text-dark)" }}>{numero(g.confermati)}</strong> confermati su {numero(cap)}
        </span>
        <span className="num">{pct}%</span>
      </div>
      {g.oltre > 0 && (
        <p className="eva-nota" style={{ color: "#92400E", fontWeight: 600, marginTop: 6 }}>
          <i className="fas fa-circle-exclamation" aria-hidden="true" style={{ marginRight: 6 }} />
          {plurale(g.oltre, "posto confermato", "posti confermati")} oltre la capienza.
        </p>
      )}

      <div className="eva-stats eva-stats-4" style={{ marginTop: 16 }}>
        <Stat n={g.confermati} label="Confermati" colore="var(--primary)" />
        <Stat n={g.attesa} label="Lista d'attesa" colore="#D97706" />
        <Stat n={g.entrati} label="Entrati" colore="#0F6E56" />
        <Stat n={g.liberi ?? 0} su={cap} label="Posti liberi" colore="#CBD5E1" />
      </div>

      <div className="eva-azioni" style={{ marginTop: 16 }}>
        <button type="button" className="eva-btn" onClick={() => onApriIscritti({ giornata: g.slug })}>
          <i className="fas fa-users" aria-hidden="true" />{" "}
          Vedi gli iscritti
        </button>
        <a className="eva-btn" href={urlStampa(g.slug)} target="_blank" rel="noopener noreferrer">
          <i className="fas fa-print" aria-hidden="true" />{" "}
          Lista per la porta
        </a>
        <PulsanteScarica url={urlExport(FILTRI_VUOTI, g.slug)} onErrore={setErroreFile}>
          Scarica CSV
        </PulsanteScarica>
      </div>
      {erroreFile && (
        <p className="eva-esito eva-esito-errore" role="alert">
          <i className="fas fa-circle-exclamation" aria-hidden="true" />
          {erroreFile}
        </p>
      )}
    </article>
  );
}

/* ── Andamento delle iscrizioni ───────────────────────────────────────── */

/** Il tetto dell'asse: un numero tondo appena sopra il massimo. */
function tetto(max: number): number {
  if (max <= 5) return 5;
  const passo = max <= 20 ? 5 : max <= 50 ? 10 : max <= 200 ? 25 : 100;
  return Math.ceil(max / passo) * passo;
}

function Andamento({ serie }: { serie: Riepilogo["nuove"]["serie"] }) {
  const max = Math.max(0, ...serie.map((d) => d.n));
  const alto = tetto(max);
  const iMax = serie.findIndex((d) => d.n === max && max > 0);
  const ultimo = serie.length - 1;
  const totale = serie.reduce((t, d) => t + d.n, 0);
  return (
    <figure className="eva-grafico" style={{ margin: 0 }}>
      <figcaption className="sr-only">
        Nuove iscrizioni al giorno negli ultimi 21 giorni: {numero(totale)} in tutto, al massimo {numero(max)} in un
        giorno.
      </figcaption>
      <div className="eva-grafico-tela" aria-hidden="true">
        <div className="eva-grafico-guida" style={{ top: 20 }}>
          <span className="num">{numero(alto)}</span>
        </div>
        <div className="eva-grafico-area">
          {serie.map((d, i) => {
            const h = d.n === 0 ? 0 : Math.max(3, (d.n / alto) * 100);
            const etichetta = i === ultimo ? `Oggi, ${d.etichetta}` : d.etichetta;
            return (
              <div key={d.giorno} className={`eva-col${i === ultimo ? " eva-col-oggi" : ""}`}>
                <span className="eva-col-tip">
                  {etichetta}: {plurale(d.n, "iscrizione", "iscrizioni")}
                </span>
                {(i === iMax || i === ultimo) && d.n > 0 && <span className="eva-col-v">{numero(d.n)}</span>}
                <span
                  className="eva-col-barra"
                  style={
                    d.n === 0
                      ? { height: 2, background: "#E2E8F0", borderRadius: 1 }
                      : { height: `${h}%` }
                  }
                />
              </div>
            );
          })}
        </div>
        <div className="eva-grafico-asse">
          {serie.map((d, i) => (
            <span key={d.giorno}>{i === ultimo ? "oggi" : i % 7 === 0 ? d.etichetta : ""}</span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Nuove iscrizioni per giorno</caption>
        <thead>
          <tr>
            <th scope="col">Giorno</th>
            <th scope="col">Iscrizioni</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((d) => (
            <tr key={d.giorno}>
              <td>{d.etichetta}</td>
              <td>{d.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ── Il riepilogo ─────────────────────────────────────────────────────── */

function Scheletro() {
  return (
    <div className="eva-griglia" aria-hidden="true">
      <div className="eva-griglia eva-griglia-2">
        <div className="eva-scheletro" style={{ height: 300 }} />
        <div className="eva-scheletro" style={{ height: 300 }} />
      </div>
      <div className="eva-scheletro" style={{ height: 120 }} />
      <div className="eva-scheletro" style={{ height: 260 }} />
    </div>
  );
}

export function PannelloRiepilogo({
  attivo,
  onApriIscritti,
}: {
  attivo: boolean;
  onApriIscritti: (f: Partial<Filtri>) => void;
}) {
  const [dati, setDati] = useState<Riepilogo | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const ultimaLettura = useRef(0);
  const numeroRichiesta = useRef(0);

  const carica = useCallback(async () => {
    const n = ++numeroRichiesta.current;
    setInCorso(true);
    const r = await leggiJson<Riepilogo>("/api/eventi/admin/riepilogo");
    if (n !== numeroRichiesta.current) return; // è già partita una lettura più recente
    setInCorso(false);
    if (r.ok && r.dati && Array.isArray(r.dati.giornate)) {
      setDati(r.dati);
      setErrore(null);
      ultimaLettura.current = Date.now();
    } else {
      setErrore(messaggioErrore(r.status, r.dati));
    }
  }, []);

  // Mentre la scheda è aperta: subito (se i dati sono vecchi), poi ogni
  // minuto, ma solo se la pagina è visibile; al ritorno sulla pagina, subito.
  useEffect(() => {
    if (!attivo) return;
    if (Date.now() - ultimaLettura.current > 15_000) void carica();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void carica();
    }, OGNI_MS);
    const visibile = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimaLettura.current > OGNI_MS) void carica();
    };
    document.addEventListener("visibilitychange", visibile);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibile);
    };
  }, [attivo, carica]);

  const ora = dati ? oraRoma(dati.generato_at) : "";

  return (
    <div className="eva-griglia" style={{ gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="eva-h2">Riepilogo</h2>
          <p className="eva-sub" style={{ marginTop: 2 }}>
            {dati ? `Aggiornato alle ${ora}, si aggiorna da solo ogni minuto.` : "Lettura dei dati in corso."}
          </p>
        </div>
        <button type="button" className="eva-btn" onClick={() => void carica()} disabled={inCorso} aria-busy={inCorso}>
          <i className={`fas fa-rotate${inCorso ? " fa-spin" : ""}`} aria-hidden="true" />
          {inCorso ? "Aggiornamento…" : "Aggiorna"}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {errore && (
          <div className="eva-avviso eva-avviso-errore">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <div>
              <strong>{errore}</strong>
              {dati && <> I numeri qui sotto sono quelli delle {ora}.</>}
            </div>
          </div>
        )}
      </div>

      {!dati && !errore && <Scheletro />}

      {dati && (
        <>
          <Allarmi dati={dati} onApriIscritti={onApriIscritti} />
          <Richiami giornate={dati.giornate} onApriIscritti={onApriIscritti} />

          <div className="eva-griglia eva-griglia-2">
            {dati.giornate.map((g) => (
              <SchedaGiornata key={g.slug} g={g} onApriIscritti={onApriIscritti} />
            ))}
          </div>

          <section className="eva-box" aria-labelledby="eva-tot">
            <h3 id="eva-tot" className="eva-h2">
              Le persone
            </h3>
            <div className="eva-stats eva-stats-4" style={{ marginTop: 14 }}>
              <Stat n={dati.totali.persone} label="Persone iscritte" colore="var(--primary)" />
              <Stat n={dati.totali.entrambe} label="Su entrambe le giornate" colore="var(--primary-dark)" />
              <Stat n={dati.nuove.oggi} label="Nuove oggi" colore="#0F766E" />
              <Stat n={dati.nuove.settimana} label="Negli ultimi 7 giorni" colore="#0F766E" />
            </div>
            <p className="eva-nota" style={{ marginTop: 12 }}>
              {plurale(dati.totali.marketing, "persona ha", "persone hanno")} dato il consenso a ricevere le
              comunicazioni della Fondazione.
            </p>
          </section>

          <section className="eva-box" aria-labelledby="eva-andamento">
            <h3 id="eva-andamento" className="eva-h2">
              Nuove iscrizioni, ultimi 21 giorni
            </h3>
            <p className="eva-sub">Una barra per giorno, ora di Roma. Passa sopra una barra per il numero esatto.</p>
            <Andamento serie={dati.nuove.serie} />
          </section>

          <div className="eva-griglia eva-griglia-2" style={{ alignItems: "start" }}>
            <section className="eva-box" aria-labelledby="eva-categorie">
              <h3 id="eva-categorie" className="eva-h2">
                Chi viene, giornata per giornata
              </h3>
              <p className="eva-sub">Iscritti per categoria, lista d&apos;attesa compresa.</p>
              <div className="eva-scorri" style={{ marginTop: 12 }}>
                <table className="eva-tabella">
                  <thead>
                    <tr>
                      <th scope="col">Categoria</th>
                      {SESSIONS.map((s) => (
                        <th key={s.slug} scope="col" className="num">
                          {s.etichetta}
                        </th>
                      ))}
                      <th scope="col" className="num">
                        Persone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.categorie.map((c) => (
                      <tr key={c.value}>
                        <th scope="row">
                          {c.label || categoriaLabel(c.value)}
                        </th>
                        {SESSIONS.map((s) => {
                          const cella = c.perGiornata[s.slug] ?? { totale: 0, attesa: 0 };
                          return (
                            <td key={s.slug} className="num">
                              {numero(cella.totale)}
                              {cella.attesa > 0 && <span className="sotto">{numero(cella.attesa)} in attesa</span>}
                            </td>
                          );
                        })}
                        <td className="num">{numero(c.persone)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Totale</td>
                      {SESSIONS.map((s) => (
                        <td key={s.slug} className="num">
                          {numero(dati.categorie.reduce((t, c) => t + (c.perGiornata[s.slug]?.totale ?? 0), 0))}
                        </td>
                      ))}
                      <td className="num">{numero(dati.totali.persone)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="eva-box" aria-labelledby="eva-org">
              <h3 id="eva-org" className="eva-h2">
                Scuole e organizzazioni
              </h3>
              <p className="eva-sub">
                {dati.organizzazioniDiverse === 0
                  ? "Nessuna iscrizione indica ancora una scuola o un'organizzazione."
                  : `Le prime ${Math.min(15, dati.organizzazioniDiverse)} di ${numero(dati.organizzazioniDiverse)}, per numero di persone. Nomi uguali a meno di maiuscole e spazi contano insieme.`}
              </p>
              {dati.organizzazioni.length > 0 && (
                <div className="eva-scorri" style={{ marginTop: 12 }}>
                  <table className="eva-tabella">
                    <thead>
                      <tr>
                        <th scope="col">Nome</th>
                        <th scope="col" className="num">
                          Persone
                        </th>
                        {SESSIONS.map((s) => (
                          <th key={s.slug} scope="col" className="num">
                            {s.etichetta}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dati.organizzazioni.map((o) => (
                        <tr key={o.nome}>
                          <td style={{ minWidth: 160 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-dark)" }}>{o.nome}</span>
                            <span
                              className="eva-quota"
                              aria-hidden="true"
                              style={{ width: `${Math.max(4, (o.persone / dati.organizzazioni[0].persone) * 100)}%` }}
                            />
                          </td>
                          <td className="num" style={{ fontWeight: 700 }}>
                            {numero(o.persone)}
                          </td>
                          {SESSIONS.map((s) => (
                            <td key={s.slug} className="num">
                              {numero(o.perGiornata[s.slug] ?? 0)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
