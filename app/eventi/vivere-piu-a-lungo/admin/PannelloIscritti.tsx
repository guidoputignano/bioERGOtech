"use client";

/**
 * Iscritti: l'elenco completo con ricerca, filtri e le azioni dello staff.
 *
 * L'elenco arriva intero dal server (/api/eventi/admin/registrations, che
 * legge oltre il limite di 1000 righe) e si filtra qui, con lo stesso filtro
 * dell'export e della stampa: la ricerca risponde a ogni lettera anche sul
 * telefono. Si mostrano 200 schede alla volta.
 *
 * Ogni azione dice com'è andata, nella scheda della persona: presenza,
 * conferma del posto dalla lista d'attesa (con l'email del biglietto),
 * rimozione da una giornata, reinvio del biglietto. Nessun esito è muto.
 */

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIE, categoriaLabel, etichettaGiornata, giornateConArticolo, sessionBySlug } from "../content";
import {
  FILE_SQL_GIORNATE,
  FILTRI_VUOTI,
  GIORNATE,
  STATI_FILTRO,
  confrontaPerCognome,
  confrontaPerData,
  dataOraRoma,
  filtraIscritti,
  filtriAttivi,
  inviaJson,
  leggiJson,
  messaggioErrore,
  oraRoma,
  urlBigliettoRelativo,
  urlExport,
  urlStampa,
  type FiltroStato,
  type Filtri,
  type GiornataRiga,
  type RigaIscritto,
  type RispostaIscritti,
  type StatoCheckin,
} from "./PannelloComune";
import { PulsanteScarica } from "./PannelloScarica";

const PASSO = 200;
const numero = (n: number) => n.toLocaleString("it-IT");
const maiuscola = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
/** "il 10 dicembre", "l'11 dicembre"; per una sessione sconosciuta, il codice. */
const conArticolo = (slug: string) => giornateConArticolo([slug]) || `la sessione ${slug || "senza nome"}`;

type Ordine = "recenti" | "cognome";
type Esito = { tipo: "ok" | "errore" | "attenzione"; testo: string };

const PRESENZE: { stato: StatoCheckin; label: string; icona: string }[] = [
  { stato: "registrato", label: "Registrato", icona: "fa-minus" },
  { stato: "presente", label: "Presente", icona: "fa-check" },
  { stato: "assente", label: "Assente", icona: "fa-xmark" },
];

/** Le risposte di POST /api/eventi/admin/iscritti. */
type RispostaAzione = {
  ok?: boolean;
  gia?: boolean;
  messaggio?: string;
  error?: string;
  codice?: string;
  eliminata?: boolean;
  email?: { inviata: true; a: string } | { inviata: false; a: string; errore: string } | null;
};

function IconaEsito({ tipo }: { tipo: Esito["tipo"] }) {
  const icona =
    tipo === "ok" ? "fa-circle-check" : tipo === "attenzione" ? "fa-triangle-exclamation" : "fa-circle-exclamation";
  return <i className={`fas ${icona}`} aria-hidden="true" />;
}

/* ── Una persona ──────────────────────────────────────────────────────── */

type Domanda =
  | { tipo: "conferma"; g: GiornataRiga }
  | { tipo: "forza"; g: GiornataRiga; testo: string }
  | { tipo: "rimuovi"; g: GiornataRiga; ultima: boolean }
  | { tipo: "elimina" };

const SchedaIscritto = memo(function SchedaIscritto({
  r,
  onGiornata,
  onCambiato,
  onEliminata,
}: {
  r: RigaIscritto;
  onGiornata: (idIscrizione: string, g: Pick<GiornataRiga, "id" | "stato_checkin" | "checkin_ts">) => void;
  /** Dopo un'azione: la scheda resta in elenco (anche se non corrisponde più ai filtri) e i dati si rileggono. */
  onCambiato: (idIscrizione: string, posizione: number | null) => void;
  onEliminata: (testo: string) => void;
}) {
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [domanda, setDomanda] = useState<Domanda | null>(null);
  const [esito, setEsito] = useState<Esito | null>(null);
  const boxDomanda = useRef<HTMLDivElement | null>(null);
  const nomeCompleto = `${r.nome} ${r.cognome}`.trim() || "Questa persona";
  const valide = r.giornate.filter((g) => sessionBySlug(g.slug));
  const occupato = inCorso !== null;

  // La domanda di conferma prende il focus: si risponde anche da tastiera.
  useEffect(() => {
    if (domanda) boxDomanda.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [domanda]);

  const presenza = async (g: GiornataRiga, stato: StatoCheckin) => {
    if (g.stato_checkin === stato || occupato) return;
    setInCorso(`presenza:${g.id}:${stato}`);
    setEsito(null);
    const res = await inviaJson<{ giornata?: { id: string; stato_checkin: StatoCheckin; checkin_ts: string | null } }>(
      "/api/eventi/admin/checkin",
      { registration_session_id: g.id, stato },
    );
    setInCorso(null);
    const nuova = res.dati?.giornata;
    if (res.ok && nuova) {
      onGiornata(r.id, { id: g.id, stato_checkin: nuova.stato_checkin, checkin_ts: nuova.checkin_ts });
      const testo =
        nuova.stato_checkin === "presente"
          ? `Presenza salvata: ${conArticolo(g.slug)}, ingresso alle ${oraRoma(nuova.checkin_ts)}.`
          : nuova.stato_checkin === "assente"
            ? `Segnata come assente ${conArticolo(g.slug)}.`
            : `Presenza azzerata per ${conArticolo(g.slug)}.`;
      setEsito({ tipo: "ok", testo });
    } else {
      setEsito({ tipo: "errore", testo: `La presenza non è stata salvata. ${messaggioErrore(res.status, res.dati)}` });
    }
  };

  const conferma = async (g: GiornataRiga, forza: boolean) => {
    setDomanda(null);
    setInCorso(`conferma:${g.id}`);
    setEsito(null);
    const res = await inviaJson<RispostaAzione>("/api/eventi/admin/iscritti", {
      azione: "conferma",
      bridge_id: g.id,
      forza,
    });
    setInCorso(null);
    if (res.status === 409 && res.dati?.codice === "pieno") {
      setDomanda({ tipo: "forza", g, testo: res.dati.error ?? "La giornata è al completo." });
      return;
    }
    if (!res.ok || !res.dati) {
      setEsito({ tipo: "errore", testo: `Il posto non è stato confermato. ${messaggioErrore(res.status, res.dati)}` });
      return;
    }
    const base = res.dati.messaggio ?? "Posto confermato.";
    const email = res.dati.email;
    if (!email) setEsito({ tipo: "ok", testo: base });
    else if (email.inviata) setEsito({ tipo: "ok", testo: `${base} Biglietto aggiornato inviato a ${email.a}.` });
    else setEsito({ tipo: "attenzione", testo: `${base} ${email.errore}` });
    onCambiato(r.id, g.posizione_attesa);
  };

  const rimuovi = async (g: GiornataRiga, eliminaIscrizione: boolean) => {
    setDomanda(null);
    setInCorso(`rimuovi:${g.id}`);
    setEsito(null);
    const res = await inviaJson<RispostaAzione>("/api/eventi/admin/iscritti", {
      azione: "rimuovi_giornata",
      bridge_id: g.id,
      elimina_iscrizione: eliminaIscrizione,
    });
    setInCorso(null);
    if (!res.ok || !res.dati) {
      setEsito({ tipo: "errore", testo: `Niente è stato rimosso. ${messaggioErrore(res.status, res.dati)}` });
      return;
    }
    if (res.dati.eliminata) onEliminata(`${nomeCompleto}: ${res.dati.messaggio ?? "iscrizione eliminata."}`);
    else setEsito({ tipo: "ok", testo: res.dati.messaggio ?? "Giornata rimossa." });
    onCambiato(r.id, g.posizione_attesa);
  };

  const elimina = async () => {
    setDomanda(null);
    setInCorso("elimina");
    setEsito(null);
    const res = await inviaJson<RispostaAzione>("/api/eventi/admin/iscritti", {
      azione: "elimina_iscrizione",
      registration_id: r.id,
    });
    setInCorso(null);
    if (!res.ok || !res.dati?.ok) {
      setEsito({ tipo: "errore", testo: `L'iscrizione non è stata eliminata. ${messaggioErrore(res.status, res.dati)}` });
      return;
    }
    onEliminata(`${nomeCompleto}: ${res.dati.messaggio ?? "iscrizione eliminata."}`);
  };

  const reinvia = async () => {
    setInCorso("reinvia");
    setEsito(null);
    const res = await inviaJson<RispostaAzione>("/api/eventi/admin/iscritti", {
      azione: "reinvia",
      registration_id: r.id,
    });
    setInCorso(null);
    if (res.ok && res.dati?.ok) setEsito({ tipo: "ok", testo: res.dati.messaggio ?? `Biglietto reinviato a ${r.email}.` });
    else setEsito({ tipo: "errore", testo: `Il biglietto non è stato reinviato. ${messaggioErrore(res.status, res.dati)}` });
  };

  const giornoIscr = dataOraRoma(r.created_at).split(" ")[0];
  const oraIscr = oraRoma(r.created_at);

  return (
    <article className="eva-persona" aria-labelledby={`eva-p-${r.id}`}>
      <div className="eva-persona-testa">
        <div style={{ minWidth: 0 }}>
          <h3 id={`eva-p-${r.id}`} className="eva-persona-nome">
            {nomeCompleto}
          </h3>
        </div>
        <span className="eva-pill eva-pill-neutro">{categoriaLabel(r.categoria) || "Categoria non indicata"}</span>
      </div>

      <div className="eva-dettagli">
        <a href={`mailto:${r.email}`}>
          <i className="fas fa-envelope" aria-hidden="true" />
          <span>{r.email}</span>
        </a>
        {r.telefono && (
          <a href={`tel:${r.telefono.replace(/[^\d+]/g, "")}`}>
            <i className="fas fa-phone" aria-hidden="true" />
            <span>{r.telefono}</span>
          </a>
        )}
        {(r.organizzazione || r.classe) && (
          <span>
            <i className="fas fa-building-columns" aria-hidden="true" />
            <span>
              {[r.organizzazione, r.classe ? `classe ${r.classe}` : null].filter(Boolean).join(", ")}
            </span>
          </span>
        )}
        {r.startup_name && r.startup_name !== r.organizzazione && (
          <span>
            <i className="fas fa-rocket" aria-hidden="true" />
            <span>{r.startup_name}</span>
          </span>
        )}
        <span>
          <i className="fas fa-ticket" aria-hidden="true" />
          <span>
            <span className="sr-only">Codice del biglietto: </span>
            <span className="eva-codice">{r.codice}</span>
          </span>
        </span>
        <span>
          <i className="fas fa-clock" aria-hidden="true" />
          <span>
            Iscrizione del {giornoIscr}
            {oraIscr ? ` alle ${oraIscr}` : ""}
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
            <i className="fas fa-user-slash" aria-hidden="true" />
            <div>
              <strong>Nessuna giornata.</strong> Questa iscrizione non ha un posto in nessuna giornata e
              all&apos;ingresso il biglietto non risulta. Finché resta così, il biglietto aggiornato e il
              promemoria non partono. Se la persona voleva venire, rimetti la giornata con il file SQL di
              ripristino; altrimenti elimina l&apos;iscrizione.
              <div className="eva-azioni" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="eva-btn eva-btn-pericolo"
                  disabled={occupato}
                  onClick={() => setDomanda({ tipo: "elimina" })}
                >
                  <i className={inCorso === "elimina" ? "fas fa-spinner fa-spin" : "fas fa-trash"} aria-hidden="true" />
                  Elimina questa iscrizione
                </button>
              </div>
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
                    <i className="fas fa-check" aria-hidden="true" />
                    Confermato
                  </span>
                ) : (
                  <span className="eva-pill eva-pill-attesa">
                    <i className="fas fa-hourglass-half" aria-hidden="true" />
                    Lista d&apos;attesa{g.posizione_attesa ? `, n. ${g.posizione_attesa}` : ""}
                  </span>
                )}
                {g.stato_checkin === "presente" && g.checkin_ts && (
                  <span className="eva-g-ora">ingresso alle {oraRoma(g.checkin_ts)}</span>
                )}
              </div>
              <div className="eva-g-comandi">
                <div className="eva-seg" role="group" aria-label={`Presenza ${conArticolo(g.slug)}`}>
                  {PRESENZE.map((p) => (
                    <button
                      key={p.stato}
                      type="button"
                      data-stato={p.stato}
                      aria-pressed={g.stato_checkin === p.stato}
                      disabled={occupato}
                      onClick={() => void presenza(g, p.stato)}
                    >
                      <i
                        className={
                          inCorso === `presenza:${g.id}:${p.stato}` ? "fas fa-spinner fa-spin" : `fas ${p.icona}`
                        }
                        aria-hidden="true"
                        style={{ fontSize: 11 }}
                      />
                      {p.label}
                    </button>
                  ))}
                </div>
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
                    />
                    Conferma il posto
                  </button>
                )}
                <button
                  type="button"
                  className="eva-btn eva-btn-pericolo"
                  disabled={occupato}
                  onClick={() => {
                    setEsito(null);
                    setDomanda({ tipo: "rimuovi", g, ultima: r.giornate.length === 1 });
                  }}
                >
                  <i
                    className={inCorso === `rimuovi:${g.id}` ? "fas fa-spinner fa-spin" : "fas fa-user-minus"}
                    aria-hidden="true"
                  />
                  Rimuovi da questa giornata
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
                Confermare il posto di <strong>{nomeCompleto}</strong> per {conArticolo(domanda.g.slug)}? Riceverà
                un&apos;email con il biglietto aggiornato.
              </p>
              <div className="eva-azioni">
                <button type="button" className="eva-btn eva-btn-primario" onClick={() => void conferma(domanda.g, false)}>
                  <i className="fas fa-user-check" aria-hidden="true" />
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
                <strong>{domanda.testo}</strong> Confermando ora, il posto di {nomeCompleto} va oltre la capienza
                della sala. Procedi solo se hai verificato che c&apos;è spazio.
              </p>
              <div className="eva-azioni">
                <button
                  type="button"
                  className="eva-btn eva-btn-pieno-pericolo"
                  onClick={() => void conferma(domanda.g, true)}
                >
                  Conferma oltre la capienza
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
          {domanda.tipo === "rimuovi" && !domanda.ultima && (
            <>
              <p>
                Togliere l&apos;iscrizione di <strong>{nomeCompleto}</strong> per {conArticolo(domanda.g.slug)}?{" "}
                {domanda.g.status === "confermato"
                  ? "Il posto torna libero."
                  : "La persona esce dalla lista d'attesa."}{" "}
                Non parte nessuna email.
              </p>
              <div className="eva-azioni">
                <button
                  type="button"
                  className="eva-btn eva-btn-pieno-pericolo"
                  onClick={() => void rimuovi(domanda.g, false)}
                >
                  Rimuovi da questa giornata
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
          {domanda.tipo === "elimina" && (
            <>
              <p>
                Eliminare l&apos;iscrizione di <strong>{nomeCompleto}</strong>? Non ha nessuna giornata. Non parte
                nessuna email.
              </p>
              <div className="eva-azioni">
                <button type="button" className="eva-btn eva-btn-pieno-pericolo" onClick={() => void elimina()}>
                  <i className="fas fa-trash" aria-hidden="true" />
                  Elimina l&apos;iscrizione
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
          {domanda.tipo === "rimuovi" && domanda.ultima && (
            <>
              <p>
                {maiuscola(conArticolo(domanda.g.slug))} è l&apos;unica giornata di <strong>{nomeCompleto}</strong>.
                Vuoi eliminare l&apos;intera iscrizione, oppure togliere solo la giornata e tenere i dati in elenco?
                Non parte nessuna email.
              </p>
              <div className="eva-azioni">
                <button
                  type="button"
                  className="eva-btn eva-btn-pieno-pericolo"
                  onClick={() => void rimuovi(domanda.g, true)}
                >
                  <i className="fas fa-trash" aria-hidden="true" />
                  Elimina l&apos;iscrizione
                </button>
                <button type="button" className="eva-btn eva-btn-pericolo" onClick={() => void rimuovi(domanda.g, false)}>
                  Togli solo la giornata
                </button>
                <button type="button" className="eva-btn" onClick={() => setDomanda(null)}>
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="eva-persona-piede">
        <div className="eva-azioni">
          {valide.length > 0 && (
            <button type="button" className="eva-btn" disabled={occupato} onClick={() => void reinvia()}>
              <i className={inCorso === "reinvia" ? "fas fa-spinner fa-spin" : "fas fa-paper-plane"} aria-hidden="true" />
              {inCorso === "reinvia" ? "Invio in corso…" : "Reinvia biglietto"}
            </button>
          )}
          <a
            className="eva-btn-link"
            href={urlBigliettoRelativo(r.codice)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apri il biglietto
            <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" style={{ fontSize: 12 }} />
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {esito && (
          <p className={`eva-esito eva-esito-${esito.tipo}`}>
            <IconaEsito tipo={esito.tipo} />
            <span>{esito.testo}</span>
          </p>
        )}
      </div>
    </article>
  );
});

/* ── L'elenco ─────────────────────────────────────────────────────────── */

export function PannelloIscritti({
  attivo,
  filtri,
  onFiltri,
}: {
  attivo: boolean;
  filtri: Filtri;
  onFiltri: (f: Filtri) => void;
}) {
  const [dati, setDati] = useState<RispostaIscritti | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [limite, setLimite] = useState(PASSO);
  const [ordine, setOrdine] = useState<Ordine>("recenti");
  const [avviso, setAvviso] = useState<Esito | null>(null);
  const [erroreFile, setErroreFile] = useState<string | null>(null);
  /**
   * Le schede su cui lo staff ha appena agito restano in elenco finché non
   * cambiano i filtri, anche se non corrispondono più (chi è appena stato
   * confermato non è più "in lista d'attesa"): così l'esito resta sotto gli
   * occhi. Il valore è la posizione in lista che aveva, per non farla saltare.
   */
  const [trattenute, setTrattenute] = useState<ReadonlyMap<string, number | null>>(new Map());
  const numeroRichiesta = useRef(0);
  const ultimaLettura = useRef(0);

  const carica = useCallback(async () => {
    const n = ++numeroRichiesta.current;
    setInCorso(true);
    const r = await leggiJson<RispostaIscritti>("/api/eventi/admin/registrations");
    if (n !== numeroRichiesta.current) return;
    setInCorso(false);
    if (r.ok && r.dati && Array.isArray(r.dati.iscritti)) {
      setDati(r.dati);
      setErrore(null);
      ultimaLettura.current = Date.now();
    } else {
      setErrore(messaggioErrore(r.status, r.dati));
    }
  }, []);

  // All'apertura della scheda, e di nuovo se ci si torna dopo un po'.
  useEffect(() => {
    if (attivo && Date.now() - ultimaLettura.current > 30_000) void carica();
  }, [attivo, carica]);

  const q = useDeferredValue(filtri.q);
  const inListaAttesa = filtri.stato === "attesa" && Boolean(filtri.giornata);

  const { giornata, stato, categoria } = filtri;
  const filtrati = useMemo(() => {
    if (!dati) return [];
    const corrispondono = filtraIscritti(dati.iscritti, { q, giornata, stato, categoria });
    let righe = corrispondono;
    if (trattenute.size > 0) {
      const ids = new Set(corrispondono.map((r) => r.id));
      righe = dati.iscritti.filter((r) => ids.has(r.id) || trattenute.has(r.id));
    }
    if (inListaAttesa) {
      // La lista d'attesa di una giornata, in ordine di arrivo: chi confermare per primo.
      const pos = (r: RigaIscritto) =>
        r.giornate.find((g) => g.slug === giornata)?.posizione_attesa ??
        trattenute.get(r.id) ??
        Number.MAX_SAFE_INTEGER;
      return righe.sort((a, b) => pos(a) - pos(b) || confrontaPerData(b, a));
    }
    return righe.sort(ordine === "cognome" ? confrontaPerCognome : confrontaPerData);
  }, [dati, q, giornata, stato, categoria, ordine, inListaAttesa, trattenute]);

  // Filtri nuovi: si riparte dalle prime 200 schede e si lasciano andare le trattenute.
  useEffect(() => {
    setLimite(PASSO);
    setTrattenute((prev) => (prev.size === 0 ? prev : new Map()));
  }, [q, giornata, stato, categoria, ordine]);

  const trattieni = useCallback((id: string, posizione: number | null) => {
    setTrattenute((prev) => {
      if (prev.has(id)) return prev;
      const nuova = new Map(prev);
      nuova.set(id, posizione);
      return nuova;
    });
  }, []);

  const aggiornaGiornata = useCallback(
    (idIscrizione: string, g: Pick<GiornataRiga, "id" | "stato_checkin" | "checkin_ts">) => {
      trattieni(idIscrizione, null);
      setDati((prev) =>
        prev
          ? {
              ...prev,
              iscritti: prev.iscritti.map((r) =>
                r.id !== idIscrizione
                  ? r
                  : { ...r, giornate: r.giornate.map((x) => (x.id === g.id ? { ...x, ...g } : x)) },
              ),
            }
          : prev,
      );
    },
    [trattieni],
  );

  const ricarica = useCallback(() => void carica(), [carica]);
  const cambiato = useCallback(
    (id: string, posizione: number | null) => {
      trattieni(id, posizione);
      void carica();
    },
    [trattieni, carica],
  );
  const eliminata = useCallback((testo: string) => setAvviso({ tipo: "ok", testo }), []);

  const cambia = (parziale: Partial<Filtri>) => {
    const nuovi = { ...filtri, ...parziale };
    // "Senza giornata" e una giornata insieme darebbero sempre un elenco vuoto.
    if (parziale.stato === "senza") nuovi.giornata = "";
    if (parziale.giornata && nuovi.stato === "senza") nuovi.stato = "";
    onFiltri(nuovi);
  };

  const visibili = filtrati.slice(0, limite);
  const totale = dati?.totale ?? 0;
  const conFiltri = filtriAttivi(filtri);
  const filtriPerFile = filtri.q.trim() || filtri.stato || filtri.categoria;

  return (
    <div className="eva-griglia" style={{ gap: 18 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="eva-h2">Iscritti</h2>
          <p className="eva-sub" style={{ marginTop: 2 }}>
            {dati
              ? `${numero(totale)} ${totale === 1 ? "iscrizione" : "iscrizioni"} in tutto, elenco letto alle ${oraRoma(dati.generato_at)}.`
              : "Lettura dell'elenco in corso."}
          </p>
        </div>
        <button type="button" className="eva-btn" onClick={ricarica} disabled={inCorso} aria-busy={inCorso}>
          <i className={`fas fa-rotate${inCorso ? " fa-spin" : ""}`} aria-hidden="true" />
          {inCorso ? "Aggiornamento…" : "Aggiorna"}
        </button>
      </div>

      {dati && dati.mancanti.length > 0 && (
        <div className="eva-avviso eva-avviso-errore" role="alert">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <strong>
              {maiuscola(giornateConArticolo(dati.mancanti))}{" "}
              {dati.mancanti.length === 1 ? "non esiste" : "non esistono"} nel database.
            </strong>{" "}
            Chi {dati.mancanti.length === 1 ? "la sceglie" : "le sceglie"} non viene iscritto. Va eseguito il file{" "}
            <code>{FILE_SQL_GIORNATE}</code>: i dettagli sono nel Riepilogo.
          </div>
        </div>
      )}

      {/* Ricerca e filtri */}
      <div className="eva-box" role="search" aria-label="Cerca e filtra gli iscritti">
        <div className="eva-filtri">
          <div>
            <label htmlFor="eva-q" className="eva-label">
              Cerca
            </label>
            <div className="eva-cerca">
              <i className="fas fa-magnifying-glass" aria-hidden="true" />
              <input
                id="eva-q"
                type="search"
                className="eva-campo"
                placeholder="Nome, email, codice, scuola, telefono"
                value={filtri.q}
                onChange={(e) => cambia({ q: e.target.value })}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
              />
              {filtri.q && (
                <button
                  type="button"
                  className="eva-cerca-svuota"
                  aria-label="Svuota la ricerca"
                  onClick={() => cambia({ q: "" })}
                >
                  <i className="fas fa-xmark" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="eva-giornata" className="eva-label">
              Giornata
            </label>
            <select
              id="eva-giornata"
              className="eva-campo"
              value={filtri.giornata}
              onChange={(e) => cambia({ giornata: e.target.value })}
            >
              <option value="">Tutte le giornate</option>
              {GIORNATE.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.etichetta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="eva-stato" className="eva-label">
              Stato
            </label>
            <select
              id="eva-stato"
              className="eva-campo"
              value={filtri.stato}
              onChange={(e) => cambia({ stato: e.target.value as FiltroStato })}
            >
              {STATI_FILTRO.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="eva-categoria" className="eva-label">
              Categoria
            </label>
            <select
              id="eva-categoria"
              className="eva-campo"
              value={filtri.categoria}
              onChange={(e) => cambia({ categoria: e.target.value })}
            >
              <option value="">Tutte le categorie</option>
              {CATEGORIE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="eva-ordine" className="eva-label">
              Ordine
            </label>
            <select
              id="eva-ordine"
              className="eva-campo"
              value={inListaAttesa ? "attesa" : ordine}
              disabled={inListaAttesa}
              onChange={(e) => setOrdine(e.target.value as Ordine)}
            >
              {inListaAttesa && <option value="attesa">Ordine di arrivo in lista</option>}
              <option value="recenti">Più recenti prima</option>
              <option value="cognome">Cognome, dalla A alla Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginTop: 14 }}>
          <p className="eva-sub" style={{ margin: 0 }} role="status" aria-live="polite">
            {!dati
              ? ""
              : filtrati.length === 0
                ? "Nessuna iscrizione corrisponde."
                : conFiltri
                  ? `${numero(filtrati.length)} su ${numero(totale)} corrispondono${filtrati.length > limite ? `, ne mostro ${numero(limite)}` : ""}.`
                  : filtrati.length > limite
                    ? `Mostro le prime ${numero(limite)} di ${numero(filtrati.length)}.`
                    : `${numero(filtrati.length)} ${filtrati.length === 1 ? "iscrizione" : "iscrizioni"}.`}
          </p>
          {conFiltri && (
            <button type="button" className="eva-btn-link" onClick={() => onFiltri(FILTRI_VUOTI)}>
              <i className="fas fa-filter-circle-xmark" aria-hidden="true" />
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
          File CSV per Excel, una riga per persona.{" "}
          {filtriPerFile
            ? "I file tengono conto della ricerca e dei filtri di stato e categoria."
            : "Comprendono tutti gli iscritti."}{" "}
          La lista per la porta è in ordine alfabetico, con una casella da spuntare.
        </p>
        <div className="eva-azioni" style={{ marginTop: 12 }}>
          <PulsanteScarica url={urlExport(filtri)} onErrore={setErroreFile} className="eva-btn eva-btn-primario">
            Scarica tutti
          </PulsanteScarica>
          {GIORNATE.map((g) => (
            <PulsanteScarica key={g.slug} url={urlExport(filtri, g.slug)} onErrore={setErroreFile}>
              Scarica {g.etichetta}
            </PulsanteScarica>
          ))}
          {GIORNATE.map((g) => (
            <a key={g.slug} className="eva-btn" href={urlStampa(g.slug)} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-print" aria-hidden="true" />
              Stampa lista {g.etichetta}
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

      {errore && (
        <div className="eva-avviso eva-avviso-errore" role="alert">
          <i className="fas fa-circle-exclamation" aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <strong>{errore}</strong>
            {dati ? " L'elenco qui sotto è quello letto prima." : ""}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="eva-btn" onClick={ricarica}>
                Riprova
              </button>
            </div>
          </div>
        </div>
      )}

      {avviso && (
        <div className={`eva-avviso eva-avviso-${avviso.tipo === "ok" ? "ok" : "errore"}`} role="status">
          <IconaEsito tipo={avviso.tipo} />
          <div style={{ flex: 1 }}>{avviso.testo}</div>
          <button
            type="button"
            className="eva-chiudi"
            aria-label="Chiudi il messaggio"
            onClick={() => setAvviso(null)}
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}

      {!dati && !errore && (
        <div className="eva-persone" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="eva-scheletro" style={{ height: 210 }} />
          ))}
        </div>
      )}

      {dati && filtrati.length === 0 && (
        <div className="eva-box" style={{ textAlign: "center", padding: "36px 20px" }}>
          <span className="icon-circle icon-circle-primary" style={{ margin: "0 auto 12px", width: 48, height: 48 }}>
            <i className="fas fa-user-group" aria-hidden="true" />
          </span>
          <p className="eva-h2" style={{ fontSize: 16 }}>
            {totale === 0 ? "Ancora nessuna iscrizione." : "Nessuna iscrizione corrisponde a questi filtri."}
          </p>
          {conFiltri && (
            <button type="button" className="eva-btn" style={{ marginTop: 12 }} onClick={() => onFiltri(FILTRI_VUOTI)}>
              Azzera i filtri
            </button>
          )}
        </div>
      )}

      {visibili.length > 0 && (
        <ul className="eva-persone" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {visibili.map((r) => (
            <li key={r.id}>
              <SchedaIscritto r={r} onGiornata={aggiornaGiornata} onCambiato={cambiato} onEliminata={eliminata} />
            </li>
          ))}
        </ul>
      )}

      {filtrati.length > limite && (
        <div style={{ textAlign: "center" }}>
          <button type="button" className="eva-btn" onClick={() => setLimite((l) => l + PASSO)}>
            <i className="fas fa-chevron-down" aria-hidden="true" />
            Mostra altri {numero(Math.min(PASSO, filtrati.length - limite))} (ne restano{" "}
            {numero(filtrati.length - limite)})
          </button>
        </div>
      )}
    </div>
  );
}
