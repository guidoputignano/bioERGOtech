"use client";

/**
 * Comunicazioni: le due email a tutti gli iscritti, il biglietto aggiornato
 * e il promemoria prima dell'evento.
 *
 * Ogni scheda dice che cosa contiene l'email, a quante persone partirebbe
 * adesso, se è già partita (quando e con che esito) o se è programmata.
 * Prima di inviare si guarda l'anteprima, con una persona di esempio per
 * ogni caso, e ci si manda una prova. L'invio chiede conferma, ripetendo a
 * quante persone parte, e si fa una volta sola: la rotta prenota l'invio, e
 * un secondo clic, un collega o il cron ricevono "già inviata".
 *
 * Se il database non è a posto (manca una giornata, ci sono iscrizioni senza
 * giornata) il pulsante resta spento e la scheda dice perché e che cosa
 * fare. Il lavoro vero è in lib/eventi/evento-comunicazioni.ts.
 */

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
// Solo i tipi: il modulo è del server.
import type {
  CampagnaId,
  EsitoCampagna,
  RispostaComunicazioni,
  VistaCampagna,
} from "@/lib/eventi/evento-comunicazioni";
import { PERCORSO_PANNELLO, inviaJson, leggiJson, messaggioErrore } from "./PannelloComune";

/* ── Formati ──────────────────────────────────────────────────────────── */

const numero = (n: number) => n.toLocaleString("it-IT");
const persone = (n: number) => `${numero(n)} ${n === 1 ? "persona" : "persone"}`;

const FMT_QUANDO = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parti(iso: string | null | undefined): Record<string, string> | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p: Record<string, string> = {};
  for (const x of FMT_QUANDO.formatToParts(d)) p[x.type] = x.value;
  return p;
}

/** "il 18 novembre alle 10:32", "l'8 dicembre alle 8:31", nel fuso di Roma. */
function quando(iso: string | null | undefined): string {
  const p = parti(iso);
  if (!p) return "";
  const art = /^(1|8|11|18)$/.test(p.day) ? "l'" : "il ";
  return `${art}${p.day} ${p.month} alle ${Number(p.hour)}:${p.minute}`;
}

/** "10:32", "8:31": l'ora come si scrive nel sito, nel fuso di Roma. */
function ora(iso: string | null | undefined): string {
  const p = parti(iso);
  return p ? `${Number(p.hour)}:${p.minute}` : "";
}

/** "342 email partite su 345, 3 non partite". */
function descriviEsito(e: EsitoCampagna): string {
  const base = `${numero(e.inviate)} ${e.inviate === 1 ? "email partita" : "email partite"} su ${numero(e.destinatari)}`;
  return e.errori > 0 ? `${base}, ${numero(e.errori)} non ${e.errori === 1 ? "partita" : "partite"}` : base;
}

/* ── Testi delle campagne ─────────────────────────────────────────────── */

const TESTI: Record<CampagnaId, { icona: string; descrizione: string; invia: string }> = {
  biglietto_aggiornato: {
    icona: "fa-ticket",
    descrizione:
      "Il biglietto di nuovo a ogni iscritto, con il QR che ora si vede anche in Gmail e, per ogni giornata, la data, il luogo e lo stato del posto. Il codice non cambia. Chi ha una giornata sola e può ancora aggiungere l'altra trova l'invito a farlo, con un pulsante.",
    invia: "Invia a",
  },
  promemoria: {
    icona: "fa-bell",
    descrizione:
      "Pochi giorni prima dell'evento: dove e quando, con il biglietto da mostrare all'ingresso e il link per liberare il posto se non si può più venire. Chi è solo in lista d'attesa riceve una versione che glielo ricorda.",
    invia: "Invia ora a",
  },
};

/* ── Stile proprio della scheda (il resto è in PannelloStile) ─────────── */

const STILE = `
.evc-testa { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; }
.evc-aggiornato { font-size: 12.5px; color: var(--text-mid); }
.evc-campagna { display: grid; gap: 16px; }
.evc-campagna-testa { display: flex; gap: 14px; align-items: flex-start; }
.evc-icona { width: 48px; height: 48px; border-radius: 14px; font-size: 19px; }
.evc-icona i { color: var(--eva-teal-ink); }
.evc-titoli { flex: 1; min-width: 0; }
.evc-titoli-riga { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.evc-titoli-riga h3:focus:not(:focus-visible) { outline: none; }
.evc-descrizione { font-size: 14px; color: var(--text-mid); line-height: 1.6; margin: 6px 0 0; }
@media (max-width: 520px) {
  .evc-campagna-testa { gap: 12px; }
  .evc-icona { width: 40px; height: 40px; border-radius: 12px; font-size: 16px; }
}

.evc-stats > :first-child { grid-column: 1 / -1; }
@media (min-width: 640px) {
  .evc-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .evc-stats > :first-child { grid-column: auto; }
}

.evc-elenco { margin: 8px 0 0; padding-left: 18px; list-style: disc; font-size: 13.5px; line-height: 1.6; overflow-wrap: anywhere; }
.evc-elenco li + li { margin-top: 2px; }
.evc-avviso-azione { margin-top: 10px; }
.evc-avviso-azione .eva-btn { background: #fff; }
.evc-dettagli summary { cursor: pointer; font-weight: 600; min-height: 44px; display: inline-flex; align-items: center; }

.evc-comandi { display: grid; gap: 8px; }
.evc-comandi .eva-azioni { align-items: center; }
@media (max-width: 520px) {
  .evc-comandi .eva-azioni > .eva-btn { flex: 1 1 100%; }
}

.evc-anteprima { display: grid; gap: 14px; border-top: 1px solid var(--eva-linea); padding-top: 16px; }
.evc-anteprima-barra { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: flex-end; justify-content: space-between; }
.evc-scelta { border: 0; padding: 0; margin: 0; min-width: 0; }
.evc-scelta legend { font-size: 12.5px; font-weight: 600; color: var(--text-mid); margin-bottom: 6px; padding: 0; }
.evc-segmenti { display: flex; flex-wrap: wrap; gap: 6px; }
.evc-seg { position: relative; display: inline-flex; }
.evc-seg input { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; pointer-events: none; }
.evc-seg span {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px;
  border-radius: 999px; border: 1.5px solid var(--border-color); background: #fff;
  color: var(--text-mid); font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
  transition: border-color .15s ease, background .15s ease, color .15s ease;
}
.evc-seg span:hover { border-color: var(--primary); color: var(--text-dark); }
.evc-seg input:checked + span { background: var(--primary-light); border-color: var(--primary); color: var(--eva-teal-ink); }
.evc-seg input:focus-visible + span { outline: 3px solid var(--primary); outline-offset: 2px; }
.evc-oggetto {
  margin: 0; font-size: 14.5px; font-weight: 600; color: var(--text-dark); line-height: 1.45;
  background: var(--bg-light); border-radius: 10px; padding: 10px 14px; overflow-wrap: anywhere;
}
.evc-oggetto span {
  display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-mid); margin-bottom: 2px;
}
.evc-cornice { background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px; }
.evc-cornice iframe {
  display: block; width: 100%; margin: 0 auto; border: 0; border-radius: 8px; background: #fff;
}
.evc-cornice[data-vista="telefono"] iframe { max-width: 390px; box-shadow: 0 0 0 1px var(--border-color); }
@media (max-width: 639px) {
  .evc-vista { display: none; }
  .evc-cornice { padding: 6px; }
}
`;

/* ── Una campagna ─────────────────────────────────────────────────────── */

type Messaggio = { tipo: "ok" | "errore" | "attenzione"; testo: string };
type RispostaPost = {
  ok?: boolean;
  error?: string;
  email?: string;
  esempio?: string;
  inviato_at?: string | null;
  esito?: EsitoCampagna;
};

/** Nell'anteprima i link si aprono in una nuova scheda, non dentro la cornice. */
const conLinkEsterni = (html: string) => html.replace("<head>", '<head><base target="_blank">');

function PillStato({ c }: { c: VistaCampagna }) {
  if (c.inviato_at) {
    return c.esito?.completato ? (
      <span className="eva-pill eva-pill-ok">
        <i className="fas fa-check" aria-hidden="true" />
        Inviata
      </span>
    ) : (
      <span className="eva-pill eva-pill-attesa">
        <i className="fas fa-hourglass-half" aria-hidden="true" />
        Invio da verificare
      </span>
    );
  }
  if (c.tipoBlocco === "evento_concluso") return <span className="eva-pill eva-pill-neutro">Non più necessaria</span>;
  if (c.bloccata) {
    return (
      <span className="eva-pill eva-pill-errore">
        <i className="fas fa-lock" aria-hidden="true" />
        Bloccata
      </span>
    );
  }
  if (c.programmata) {
    return (
      <span className="eva-pill eva-pill-teal">
        <i className="fas fa-calendar-check" aria-hidden="true" />
        Programmata
      </span>
    );
  }
  return <span className="eva-pill eva-pill-neutro">Non ancora inviata</span>;
}

function SchedaCampagna({
  c,
  emailProva,
  codiceEsempio,
  onAggiorna,
}: {
  c: VistaCampagna;
  emailProva: string | null;
  codiceEsempio: string;
  onAggiorna: () => Promise<void>;
}) {
  const id = useId();
  const testi = TESTI[c.id];
  const [esempio, setEsempio] = useState(c.esempi[0]?.id ?? "");
  const [anteprima, setAnteprima] = useState(false);
  const [vista, setVista] = useState<"computer" | "telefono">("computer");
  const [altezza, setAltezza] = useState(900);
  const [conferma, setConferma] = useState(false);
  const [inCorso, setInCorso] = useState<"prova" | "invia" | null>(null);
  const [messaggio, setMessaggio] = useState<Messaggio | null>(null);
  const bottoneInvia = useRef<HTMLButtonElement>(null);
  const riquadroConferma = useRef<HTMLDivElement>(null);
  const titolo = useRef<HTMLHeadingElement>(null);

  const corrente = c.esempi.find((e) => e.id === esempio) ?? c.esempi[0];
  const inviata = Boolean(c.inviato_at);
  const completa = Boolean(c.esito?.completato);
  const n = c.destinatari;
  const puoInviare = !inviata && !c.bloccata && n > 0;

  useEffect(() => {
    if (conferma) riquadroConferma.current?.focus();
  }, [conferma]);

  const chiudiConferma = () => {
    setConferma(false);
    bottoneInvia.current?.focus();
  };

  const prova = async () => {
    setInCorso("prova");
    setMessaggio(null);
    const r = await inviaJson<RispostaPost>("/api/eventi/admin/comunicazioni", {
      campagna: c.id,
      azione: "prova",
      esempio,
    });
    setInCorso(null);
    if (r.ok) {
      setMessaggio({
        tipo: "ok",
        testo: `Prova inviata a ${r.dati?.email ?? emailProva ?? "te"} (esempio: ${(r.dati?.esempio ?? corrente?.etichetta ?? "").toLowerCase()}). Arriva in un minuto circa; se non la vedi, guarda nello spam.`,
      });
    } else {
      setMessaggio({ tipo: "errore", testo: messaggioErrore(r.status, r.dati) });
    }
  };

  const invia = async () => {
    setConferma(false);
    setInCorso("invia");
    setMessaggio(null);
    const r = await inviaJson<RispostaPost>("/api/eventi/admin/comunicazioni", { campagna: c.id, azione: "invia" });
    setInCorso(null);
    if (r.ok && r.dati?.esito) {
      const e = r.dati.esito;
      setMessaggio({
        tipo: e.errori > 0 ? "attenzione" : "ok",
        testo: `Inviata: ${descriviEsito(e)}.${e.errori > 0 ? " I dettagli delle email non partite sono nei log di Vercel." : ""}`,
      });
    } else if (r.status === 0 || (r.status >= 500 && !r.dati?.error)) {
      // La risposta non è arrivata (rete, tempo scaduto), ma l'invio può
      // essere partito lo stesso: non si dice "non inviata" senza saperlo.
      setMessaggio({
        tipo: "attenzione",
        testo:
          "La risposta del server non è arrivata: l'invio potrebbe essere partito comunque. Aggiorna fra qualche minuto per vedere lo stato, prima di riprovare.",
      });
    } else {
      setMessaggio({ tipo: "errore", testo: messaggioErrore(r.status, r.dati) });
    }
    await onAggiorna();
    // Il riquadro di conferma non c'è più: il fuoco torna in cima alla scheda.
    titolo.current?.focus();
  };

  const tastiConferma = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      chiudiConferma();
    }
  };

  const idTitolo = `${id}-titolo`;
  const idBlocco = `${id}-blocco`;
  const idAnteprima = `${id}-anteprima`;
  const idDomanda = `${id}-domanda`;
  const idNotaProva = `${id}-nota-prova`;

  const etichettaInvia = `${testi.invia} ${persone(n)}`;
  const automatico = c.automatico;

  return (
    <article className="eva-box evc-campagna" aria-labelledby={idTitolo}>
      <div className="evc-campagna-testa">
        <span className="icon-circle icon-circle-primary evc-icona" aria-hidden="true">
          <i className={`fas ${testi.icona}`} />
        </span>
        <div className="evc-titoli">
          <div className="evc-titoli-riga">
            <h3 id={idTitolo} ref={titolo} tabIndex={-1} className="eva-h2">
              {c.nome}
            </h3>
            <PillStato c={c} />
          </div>
          <p className="evc-descrizione">{testi.descrizione}</p>
        </div>
      </div>

      {/* Lo stato: inviata, bloccata, programmata. */}
      {inviata &&
        (completa && c.esito ? (
          <div className="eva-avviso eva-avviso-ok">
            <i className="fas fa-circle-check" aria-hidden="true" />
            <div>
              <strong>Inviata {quando(c.inviato_at)}.</strong> {descriviEsito(c.esito)}.
              {c.esito.errori > 0 && (
                <>
                  {" "}
                  Le email non partite sono nei log di Vercel, con il riferimento dell&apos;iscrizione: a quelle
                  persone puoi rimandare il biglietto dalla scheda Iscritti.
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="eva-avviso eva-avviso-attenzione">
            <i className="fas fa-hourglass-half" aria-hidden="true" />
            <div>
              <strong>Invio avviato {quando(c.inviato_at)}.</strong>{" "}
              {c.esito ? `Finora: ${descriviEsito(c.esito)}.` : "L'esito non è ancora registrato."} Se l&apos;invio
              è in corso, aggiorna fra qualche minuto. Se resta così, si è interrotto: controlla i log di Vercel prima
              di fare altro. Non si può rimandare a tutti.
            </div>
          </div>
        ))}

      {!inviata && c.bloccata && (
        <div
          id={idBlocco}
          className={`eva-avviso ${c.tipoBlocco === "evento_concluso" ? "eva-avviso-info" : "eva-avviso-errore"}`}
        >
          <i
            className={`fas ${c.tipoBlocco === "evento_concluso" ? "fa-flag-checkered" : "fa-lock"}`}
            aria-hidden="true"
          />
          <div>
            {c.tipoBlocco !== "evento_concluso" && <strong>Per ora non si può inviare. </strong>}
            {c.bloccata}
            {c.tipoBlocco === "senza_giornata" && (
              <div className="evc-avviso-azione">
                <a className="eva-btn" href={`${PERCORSO_PANNELLO}?tab=iscritti&stato=senza`}>
                  <i className="fas fa-list" aria-hidden="true" />
                  Vedi le iscrizioni senza giornata
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!inviata && automatico && automatico.fase === "prima" && (
        <div className="eva-avviso eva-avviso-info">
          <i className="fas fa-calendar-check" aria-hidden="true" />
          <div>
            <strong>
              Programmata per {automatico.etichetta}, verso le {automatico.ora}.
            </strong>{" "}
            Parte da sola, a chi è iscritto quella mattina. Se la invii prima a mano, quel giorno non riparte.
            {c.bloccata && c.tipoBlocco !== "evento_concluso" && (
              <> Il blocco qui sopra va risolto prima: finché c&apos;è, non parte neanche da sola.</>
            )}
          </div>
        </div>
      )}
      {!inviata && automatico && automatico.fase === "in_corso" && (
        <div className="eva-avviso eva-avviso-attenzione">
          <i className="fas fa-clock" aria-hidden="true" />
          <div>
            <strong>Non risulta ancora inviata.</strong> Il sistema prova a mandarla ogni mattina alle {automatico.ora}{" "}
            fino al 10 dicembre. Se il pulsante è attivo, puoi inviarla ora.
          </div>
        </div>
      )}

      {/* Chi la riceve. */}
      {!inviata && c.tipoBlocco !== "evento_concluso" && (
        <div className="eva-stats evc-stats">
          <div className="eva-stat">
            <div className="eva-stat-n">{numero(n)}</div>
            <div className="eva-stat-l">
              <span className="eva-dot" style={{ background: "var(--primary)" }} aria-hidden="true" />
              {n === 1 ? "persona la riceverebbe adesso" : "persone la riceverebbero adesso"}
            </div>
          </div>
          <div className="eva-stat">
            <div className="eva-stat-n">{numero(c.conInvito)}</div>
            <div className="eva-stat-l">con l&apos;invito ad aggiungere una giornata</div>
          </div>
          <div className="eva-stat">
            <div className="eva-stat-n">{numero(c.soloAttesa)}</div>
            <div className="eva-stat-l">solo in lista d&apos;attesa</div>
          </div>
        </div>
      )}

      {!inviata && c.nonInviabiliTotale > 0 && c.tipoBlocco !== "evento_concluso" && (
        <div className="eva-avviso eva-avviso-attenzione">
          <i className="fas fa-at" aria-hidden="true" />
          <div style={{ minWidth: 0 }}>
            <strong>
              {c.nonInviabiliTotale === 1
                ? "1 indirizzo è scritto male e non riceverà l'email."
                : `${numero(c.nonInviabiliTotale)} indirizzi sono scritti male e non riceveranno l'email.`}
            </strong>{" "}
            Contano fra le email non partite. Conviene avvisare queste persone in un altro modo: il telefono, se
            l&apos;hanno lasciato, è nella scheda Iscritti.
            <details className="evc-dettagli">
              <summary>Vedi chi</summary>
              <ul className="evc-elenco">
                {c.nonInviabili.map((x) => (
                  <li key={`${x.email}-${x.nome}`}>
                    <strong>{x.nome || "Senza nome"}</strong>, {x.email}: {x.motivo}.
                  </li>
                ))}
                {c.nonInviabiliTotale > c.nonInviabili.length && (
                  <li>e altri {numero(c.nonInviabiliTotale - c.nonInviabili.length)}.</li>
                )}
              </ul>
            </details>
          </div>
        </div>
      )}

      {/* I comandi. */}
      <div className="evc-comandi">
        <div className="eva-azioni">
          {!inviata && c.tipoBlocco !== "evento_concluso" && (
            <button
              ref={bottoneInvia}
              type="button"
              className="eva-btn eva-btn-primario"
              disabled={!puoInviare || inCorso !== null}
              aria-describedby={c.bloccata ? idBlocco : undefined}
              onClick={() => {
                setMessaggio(null);
                setConferma(true);
              }}
            >
              <i className="fas fa-paper-plane" aria-hidden="true" />
              {etichettaInvia}
            </button>
          )}
          <button
            type="button"
            className="eva-btn"
            disabled={inCorso !== null || !emailProva}
            aria-describedby={idNotaProva}
            onClick={prova}
          >
            <i
              className={`fas ${inCorso === "prova" ? "fa-circle-notch fa-spin" : "fa-envelope-open-text"}`}
              aria-hidden="true"
            />
            {inCorso === "prova" ? "Invio della prova…" : "Mandami una prova"}
          </button>
          <button
            type="button"
            className="eva-btn-link"
            aria-expanded={anteprima}
            aria-controls={idAnteprima}
            onClick={() => setAnteprima((v) => !v)}
          >
            <i className={`fas ${anteprima ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
            {anteprima ? "Nascondi l'anteprima" : "Mostra l'anteprima"}
          </button>
        </div>
        <p id={idNotaProva} className="eva-nota" style={{ margin: 0 }}>
          {emailProva ? (
            <>
              La prova arriva a <strong>{emailProva}</strong> con l&apos;esempio scelto nell&apos;anteprima e un codice
              finto. Non conta come invio.
            </>
          ) : (
            "Il tuo account non ha un indirizzo email: la prova non ha dove arrivare."
          )}
        </p>
      </div>

      {conferma && (
        <div
          ref={riquadroConferma}
          className="eva-chiedi eva-chiedi-normale"
          role="group"
          aria-labelledby={idDomanda}
          tabIndex={-1}
          onKeyDown={tastiConferma}
          style={{ marginTop: 0 }}
        >
          <p id={idDomanda}>
            <strong>
              Inviare «{c.nome}» a {persone(n)}?
            </strong>{" "}
            {n === 1 ? "Riceve il proprio biglietto" : "Ognuna riceve il proprio biglietto al proprio indirizzo"}
            {c.conInvito > 0
              ? n === 1
                ? ", con l'invito ad aggiungere una giornata"
                : `, e ${numero(c.conInvito)} anche l'invito ad aggiungere una giornata`
              : ""}
            .{" "}
            <strong>Si può inviare una volta sola</strong>: dopo, non si potrà rimandare a tutti.
            {automatico?.fase === "prima" &&
              ` ${automatico.etichetta.charAt(0).toUpperCase()}${automatico.etichetta.slice(1)} non ripartirà da sola.`}
          </p>
          <div className="eva-azioni">
            <button type="button" className="eva-btn eva-btn-primario" onClick={invia}>
              <i className="fas fa-paper-plane" aria-hidden="true" />
              Sì, invia a {persone(n)}
            </button>
            <button type="button" className="eva-btn" onClick={chiudiConferma}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lo stato delle azioni, letto anche dagli screen reader. */}
      <div aria-live="polite" aria-atomic="true">
        {inCorso === "invia" && (
          <p className="eva-esito" style={{ margin: 0, color: "var(--text-dark)" }}>
            <i className="fas fa-circle-notch fa-spin" aria-hidden="true" style={{ color: "var(--eva-teal-ink)" }} />
            <span>
              Invio in corso a {persone(n)}. Può richiedere qualche minuto: tieni aperta questa pagina.
            </span>
          </p>
        )}
        {messaggio && (
          <p className={`eva-esito eva-esito-${messaggio.tipo}`} style={{ margin: 0 }}>
            <i
              className={`fas ${
                messaggio.tipo === "ok"
                  ? "fa-circle-check"
                  : messaggio.tipo === "errore"
                    ? "fa-circle-exclamation"
                    : "fa-triangle-exclamation"
              }`}
              aria-hidden="true"
            />
            <span>{messaggio.testo}</span>
          </p>
        )}
      </div>

      {/* L'anteprima: l'email vera, con una persona di esempio. */}
      <div id={idAnteprima} hidden={!anteprima}>
        {anteprima && corrente && (
          <div className="evc-anteprima">
            <div className="evc-anteprima-barra">
              <fieldset className="evc-scelta">
                <legend>Esempio</legend>
                <div className="evc-segmenti">
                  {c.esempi.map((e) => (
                    <label key={e.id} className="evc-seg">
                      <input
                        type="radio"
                        name={`${id}-esempio`}
                        value={e.id}
                        checked={e.id === corrente.id}
                        onChange={() => setEsempio(e.id)}
                      />
                      <span>{e.etichetta}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="evc-scelta evc-vista">
                <legend>Vista</legend>
                <div className="evc-segmenti">
                  {(
                    [
                      ["computer", "Computer", "fa-desktop"],
                      ["telefono", "Telefono", "fa-mobile-screen"],
                    ] as const
                  ).map(([valore, etichetta, icona]) => (
                    <label key={valore} className="evc-seg">
                      <input
                        type="radio"
                        name={`${id}-vista`}
                        value={valore}
                        checked={vista === valore}
                        onChange={() => setVista(valore)}
                      />
                      <span>
                        <i className={`fas ${icona}`} aria-hidden="true" />
                        {etichetta}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <p className="evc-oggetto">
              <span>Oggetto</span>
              {corrente.subject}
            </p>

            <div className="evc-cornice" data-vista={vista}>
              <iframe
                // Ricaricata a ogni cambio, così l'altezza si rimisura.
                key={`${corrente.id}-${vista}`}
                title={`Anteprima dell'email «${c.nome}», esempio: ${corrente.etichetta.toLowerCase()}`}
                srcDoc={conLinkEsterni(corrente.html)}
                // Niente script; lo stesso origine serve solo a misurare l'altezza.
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                style={{ height: altezza }}
                onLoad={(e) => {
                  const corpo = e.currentTarget.contentDocument?.body;
                  if (corpo) setAltezza(Math.min(Math.max(corpo.scrollHeight + 4, 320), 4000));
                }}
              />
            </div>
            <p className="eva-nota" style={{ margin: 0 }}>
              Un esempio con dati finti (Maria, codice {codiceEsempio}): ognuno riceve le proprie giornate e il proprio
              codice. L&apos;invito ad aggiungere una giornata compare solo se ci sono posti liberi, come adesso.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

/* ── La scheda ────────────────────────────────────────────────────────── */

function Scheletro() {
  return (
    <div className="eva-griglia" aria-hidden="true">
      <div className="eva-scheletro" style={{ height: 330 }} />
      <div className="eva-scheletro" style={{ height: 330 }} />
    </div>
  );
}

export function Comunicazioni() {
  const [dati, setDati] = useState<RispostaComunicazioni | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const carica = useCallback(async () => {
    setCaricando(true);
    const r = await leggiJson<RispostaComunicazioni>("/api/eventi/admin/comunicazioni");
    if (r.ok && r.dati && Array.isArray(r.dati.campagne)) {
      setDati(r.dati);
      setErrore(null);
    } else {
      setErrore(messaggioErrore(r.status, r.dati));
    }
    setCaricando(false);
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  return (
    <div className="eva-griglia" aria-busy={caricando}>
      <style>{STILE}</style>

      <div className="evc-testa">
        <div style={{ maxWidth: 680 }}>
          <h2 className="eva-h2">Email a tutti gli iscritti</h2>
          <p className="eva-sub">
            Due comunicazioni, ognuna si invia una volta sola. Prima di inviare guarda l&apos;anteprima e manda una
            prova a te.
          </p>
        </div>
        <div className="eva-azioni" style={{ alignItems: "center" }}>
          {dati && <span className="evc-aggiornato">Aggiornato alle {ora(dati.generato_at)}</span>}
          <button type="button" className="eva-btn" onClick={() => void carica()} disabled={caricando}>
            <i className={`fas fa-rotate${caricando ? " fa-spin" : ""}`} aria-hidden="true" />
            Aggiorna
          </button>
        </div>
      </div>

      {errore && (
        <div className="eva-avviso eva-avviso-errore" role="alert">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <div>
            {dati ? (
              <>
                <strong>Aggiornamento non riuscito.</strong> {errore} Quello che vedi risale alle{" "}
                {ora(dati.generato_at)}.
              </>
            ) : (
              <>
                <strong>Non riesco a caricare le comunicazioni.</strong> {errore}
              </>
            )}
          </div>
        </div>
      )}

      {!dati && caricando && <Scheletro />}

      {dati?.campagne.map((c) => (
        <SchedaCampagna
          key={c.id}
          c={c}
          emailProva={dati.emailProva}
          codiceEsempio={dati.codiceEsempio}
          onAggiorna={carica}
        />
      ))}
    </div>
  );
}
