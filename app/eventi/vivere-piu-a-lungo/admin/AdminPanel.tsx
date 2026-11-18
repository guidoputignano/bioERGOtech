"use client";

/**
 * Il pannello iscrizioni dell'evento, per lo staff.
 *
 * Cinque schede: Riepilogo (i numeri e gli allarmi), Iscritti (l'elenco con
 * le azioni, l'export e la stampa), Classi (le prenotazioni per classe, con
 * la quota delle scuole), Ingresso (il check-in alla porta) e Comunicazioni
 * (le email a tutti). La scheda aperta sta nell'indirizzo (?tab=), così un
 * link porta dritto a quella giusta e il tasto indietro non perde il punto;
 * per Iscritti e Classi ci stanno anche i filtri (non la ricerca, che può
 * contenere un nome).
 *
 * Riepilogo, Iscritti e Classi restano montati dopo la prima visita, così tornarci
 * non ricarica tutto. Ingresso si monta solo quando è aperta: usa la
 * fotocamera, che non deve restare accesa in una scheda nascosta. La sua
 * giornata di oggi arriva dal server (prop `oggi`).
 */

import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { EVENT } from "../content";
import { Comunicazioni } from "./Comunicazioni";
import { Ingresso } from "./Ingresso";
import { PannelloClassi } from "./PannelloClassi";
import { PannelloIscritti } from "./PannelloIscritti";
import { PannelloRiepilogo } from "./PannelloRiepilogo";
import { STILE_PANNELLO } from "./PannelloStile";
import {
  FILTRI_CLASSI_VUOTI,
  FILTRI_VUOTI,
  SCHEDE,
  type Filtri,
  type FiltriClassi,
  type SchedaId,
} from "./PannelloComune";

const NOME_EVENTO = EVENT.titolo.split(":")[0];

// Le schede nascoste non si ridisegnano a ogni lettera scritta nella ricerca.
const Riepilogo = memo(PannelloRiepilogo);
const Iscritti = memo(PannelloIscritti);
const Classi = memo(PannelloClassi);
const ComunicazioniFerma = memo(Comunicazioni);
const CHIAVI_FILTRI = ["giornata", "stato", "categoria"] as const;
/** Le chiavi dei filtri nell'indirizzo, di Iscritti e di Classi: si tolgono uscendo dalla scheda. */
const CHIAVI_DA_TOGLIERE = ["giornata", "stato", "categoria", "session"] as const;

export function AdminPanel({
  schedaIniziale = "riepilogo",
  filtriIniziali = FILTRI_VUOTI,
  filtriClassiIniziali = FILTRI_CLASSI_VUOTI,
  oggi = null,
}: {
  schedaIniziale?: SchedaId;
  filtriIniziali?: Filtri;
  filtriClassiIniziali?: FiltriClassi;
  /** La giornata dell'evento di oggi secondo il server, o null. */
  oggi?: string | null;
}) {
  const [scheda, setScheda] = useState<SchedaId>(schedaIniziale);
  const [visitate, setVisitate] = useState<ReadonlySet<SchedaId>>(() => new Set([schedaIniziale]));
  const [filtri, setFiltri] = useState<Filtri>(filtriIniziali);
  const [filtriClassi, setFiltriClassi] = useState<FiltriClassi>(filtriClassiIniziali);
  const linguette = useRef<Partial<Record<SchedaId, HTMLButtonElement | null>>>({});
  const schedaPrecedente = useRef<SchedaId>(schedaIniziale);

  const apri = useCallback((id: SchedaId, focus = false) => {
    setScheda(id);
    setVisitate((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    if (focus) linguette.current[id]?.focus();
  }, []);

  // La scheda (e i filtri di Iscritti o di Classi) nell'indirizzo, senza
  // aggiungere voci alla cronologia. I filtri si toccano solo entrando o
  // uscendo da quelle due schede: le altre possono avere parametri loro.
  const { giornata, stato, categoria } = filtri;
  const { giornata: giornataClassi, stato: statoClassi } = filtriClassi;
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", scheda);
    const prima = schedaPrecedente.current;
    if (prima !== scheda && (prima === "iscritti" || prima === "classi")) {
      for (const k of CHIAVI_DA_TOGLIERE) url.searchParams.delete(k);
    }
    if (scheda === "iscritti") {
      const valori = { giornata, stato, categoria };
      for (const k of CHIAVI_FILTRI) {
        if (valori[k]) url.searchParams.set(k, valori[k]);
        else url.searchParams.delete(k);
      }
      url.searchParams.delete("session");
    } else if (scheda === "classi") {
      const valori = { giornata: giornataClassi, stato: statoClassi };
      for (const k of ["giornata", "stato"] as const) {
        if (valori[k]) url.searchParams.set(k, valori[k]);
        else url.searchParams.delete(k);
      }
      url.searchParams.delete("categoria");
      url.searchParams.delete("session");
    }
    schedaPrecedente.current = scheda;
    const nuovo = `${url.pathname}${url.search}${url.hash}`;
    const attuale = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nuovo !== attuale) window.history.replaceState(window.history.state, "", nuovo);
  }, [scheda, giornata, stato, categoria, giornataClassi, statoClassi]);

  // Tastiera sulle schede, come da pattern ARIA: frecce, Home e Fine.
  const tasti = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SCHEDE.findIndex((s) => s.id === scheda);
    const n = SCHEDE.length;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % n;
    else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    apri(SCHEDE[j].id, true);
  };

  /** Dal riepilogo all'elenco già filtrato (per esempio: lista d'attesa del 10 dicembre). */
  const apriIscritti = useCallback(
    (f: Partial<Filtri>) => {
      setFiltri({ ...FILTRI_VUOTI, ...f });
      apri("iscritti");
      window.scrollTo({ top: 0 });
    },
    [apri],
  );

  /** Dal riepilogo alle classi già filtrate (per esempio: classi in attesa del 10 dicembre). */
  const apriClassi = useCallback(
    (f: Partial<FiltriClassi>) => {
      setFiltriClassi({ ...FILTRI_CLASSI_VUOTI, ...f });
      apri("classi");
      window.scrollTo({ top: 0 });
    },
    [apri],
  );

  return (
    <div className="eva">
      <style>{STILE_PANNELLO}</style>

      <header style={{ marginBottom: 18 }}>
        <span className="eva-kicker">Area staff</span>
        <h1 className="eva-h1">Iscrizioni evento</h1>
        <p className="eva-intro">
          {NOME_EVENTO}, {EVENT.dataLabel}, {EVENT.citta}
        </p>
      </header>

      <div role="tablist" aria-label="Sezioni del pannello" className="eva-schede" onKeyDown={tasti}>
        {SCHEDE.map((s) => {
          const attiva = s.id === scheda;
          return (
            <button
              key={s.id}
              ref={(el) => {
                linguette.current[s.id] = el;
              }}
              type="button"
              role="tab"
              id={`eva-tab-${s.id}`}
              aria-selected={attiva}
              aria-controls={`eva-pannello-${s.id}`}
              tabIndex={attiva ? 0 : -1}
              className="eva-scheda"
              onClick={() => apri(s.id)}
            >
              <i className={`fas ${s.icona}`} aria-hidden="true" />{" "}
              {s.breve === s.label ? (
                s.label
              ) : (
                <>
                  <span className="eva-scheda-lunga">{s.label}</span>
                  <span className="eva-scheda-breve">{s.breve}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        {SCHEDE.map((s) => {
          const attiva = s.id === scheda;
          let contenuto: ReactNode = null;
          if (s.id === "riepilogo" && visitate.has(s.id)) {
            contenuto = <Riepilogo attivo={attiva} onApriIscritti={apriIscritti} onApriClassi={apriClassi} />;
          } else if (s.id === "iscritti" && visitate.has(s.id)) {
            contenuto = <Iscritti attivo={attiva} filtri={filtri} onFiltri={setFiltri} />;
          } else if (s.id === "classi" && visitate.has(s.id)) {
            contenuto = <Classi attivo={attiva} filtri={filtriClassi} onFiltri={setFiltriClassi} />;
          } else if (s.id === "ingresso" && attiva) {
            contenuto = <Ingresso compatto oggi={oggi} />;
          } else if (s.id === "comunicazioni" && visitate.has(s.id)) {
            contenuto = <ComunicazioniFerma />;
          }
          return (
            <section
              key={s.id}
              role="tabpanel"
              id={`eva-pannello-${s.id}`}
              aria-labelledby={`eva-tab-${s.id}`}
              hidden={!attiva}
            >
              {contenuto}
            </section>
          );
        })}
      </div>
    </div>
  );
}
