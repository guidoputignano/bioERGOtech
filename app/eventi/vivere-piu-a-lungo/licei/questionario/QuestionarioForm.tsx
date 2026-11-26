"use client";

/**
 * Il modulo del questionario: una pagina sola, pensata per il telefono.
 * Le domande e la validazione vengono da ./domande, le stesse che usa la
 * rotta; qui si controlla prima di inviare, per dire subito che cosa manca.
 *
 * Nessun salvataggio nel browser: su un computer condiviso le risposte
 * resterebbero a chi viene dopo.
 */

import { useEffect, useRef, useState } from "react";
import { comportamentoScroll, ids } from "../../modulo-utils";
import {
  AVVISO_TESTI,
  DOMANDE,
  MINUTI_QUESTIONARIO,
  QUESTIONARIO_CHIUDE_LABEL,
  domandaVisibile,
  validaRisposte,
  type Bozza,
  type Domanda,
  type RuoloQuestionario,
} from "./domande";

type Esito =
  | { tipo: "inviato" }
  | { tipo: "fine"; titolo: string; testo: string };

const TESTI = {
  studente: {
    titolo: "Com'è andato il percorso?",
    intro: (n: number) =>
      `Sono ${n} domande, circa ${MINUTI_QUESTIONARIO.studente} minuti. Il questionario è anonimo: le risposte non sono collegate al tuo nome e i tuoi docenti non le vedono. È facoltativo e non ha alcun effetto sulla valutazione dei progetti.`,
    entro: `Puoi rispondere fino a ${QUESTIONARIO_CHIUDE_LABEL}.`,
    grazie: "Grazie!",
    grazieTesto: "Le tue risposte sono arrivate. Ci aiutano a migliorare il percorso per chi verrà dopo di te.",
    riepilogo: "Prima di inviare, controlla queste risposte:",
  },
  docente: {
    titolo: "Il suo parere sul percorso",
    intro: (n: number) =>
      `Sono ${n} domande, circa ${MINUTI_QUESTIONARIO.docente} minuti. Il questionario è anonimo e facoltativo: le risposte non sono collegate al suo nome.`,
    entro: `Può rispondere fino a ${QUESTIONARIO_CHIUDE_LABEL}.`,
    grazie: "Grazie",
    grazieTesto: "Le sue risposte sono arrivate e ci aiuteranno a preparare la prossima edizione.",
    riepilogo: "Prima di inviare, controlli queste risposte:",
  },
} as const;

const idCampo = (d: Domanda) => `q-${d.id}`;

export function QuestionarioForm({
  ruolo,
  token,
  anteprima,
}: {
  ruolo: RuoloQuestionario;
  /** Il token firmato del link; null in anteprima. */
  token: string | null;
  anteprima: boolean;
}) {
  const t = TESTI[ruolo];
  const tutte = DOMANDE[ruolo];
  const [bozza, setBozza] = useState<Bozza>({});
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [tentato, setTentato] = useState(false);
  const [invio, setInvio] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [esito, setEsito] = useState<Esito | null>(null);
  const riepilogoRef = useRef<HTMLDivElement>(null);
  const esitoRef = useRef<HTMLHeadingElement>(null);

  const visibili = tutte.filter((d) => domandaVisibile(d, bozza));

  useEffect(() => {
    if (!esito) return;
    window.scrollTo({ top: 0, behavior: comportamentoScroll() });
    esitoRef.current?.focus({ preventScroll: true });
  }, [esito]);

  const cambia = (id: string, valore: string) => {
    const nuova = { ...bozza, [id]: valore };
    setBozza(nuova);
    setMessaggio(null);
    // Dopo il primo tentativo gli errori si aggiornano mentre si corregge.
    if (tentato) {
      const v = validaRisposte(ruolo, nuova);
      setErrori(v.ok ? {} : v.errori);
    }
  };

  const vaiA = (d: Domanda) => {
    const el = document.getElementById(idCampo(d)) ?? document.querySelector<HTMLInputElement>(`input[name="${idCampo(d)}"]`);
    el?.scrollIntoView({ behavior: comportamentoScroll(), block: "center" });
    (el as HTMLElement | null)?.focus({ preventScroll: true });
  };

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invio) return;
    setTentato(true);
    setMessaggio(null);
    const v = validaRisposte(ruolo, bozza);
    if (!v.ok) {
      setErrori(v.errori);
      requestAnimationFrame(() => {
        riepilogoRef.current?.scrollIntoView({ behavior: comportamentoScroll(), block: "center" });
        riepilogoRef.current?.focus({ preventScroll: true });
      });
      return;
    }
    setErrori({});
    if (anteprima || !token) {
      setMessaggio("Anteprima: le risposte sono complete, ma non vengono salvate.");
      return;
    }

    setInvio(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch("/api/eventi/licei/questionario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, risposte: v.risposte }),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; campi?: Record<string, string> };
      if (res.ok) {
        setEsito({ tipo: "inviato" });
        return;
      }
      if (res.status === 409) {
        setEsito({ tipo: "fine", titolo: ruolo === "docente" ? "Ha già risposto" : "Hai già risposto", testo: data.error ?? "" });
        return;
      }
      if (res.status === 410 || res.status === 404) {
        setEsito({ tipo: "fine", titolo: res.status === 410 ? "Il questionario è chiuso" : "Il link non è valido", testo: data.error ?? "" });
        return;
      }
      if (res.status === 400 && data.campi && Object.keys(data.campi).length > 0) {
        setErrori(data.campi);
        requestAnimationFrame(() => riepilogoRef.current?.focus());
        return;
      }
      setMessaggio(data.error ?? "Invio non riuscito. Riprova tra qualche minuto.");
    } catch {
      setMessaggio(
        ctrl.signal.aborted
          ? "La connessione è troppo lenta: le risposte non sono partite. Riprova."
          : "Sembra che non ci sia connessione: le risposte non sono partite. Riprova.",
      );
    } finally {
      clearTimeout(timer);
      setInvio(false);
    }
  };

  if (esito) {
    const titolo = esito.tipo === "inviato" ? t.grazie : esito.titolo;
    const testo = esito.tipo === "inviato" ? t.grazieTesto : esito.testo;
    return (
      <div className="vpq-avviso" role="status">
        <span className="icon-circle icon-circle-primary" aria-hidden="true">
          <i className={`fas ${esito.tipo === "inviato" ? "fa-check" : "fa-circle-info"}`} />
        </span>
        <h1 className="vpq-avviso-titolo" tabIndex={-1} ref={esitoRef}>
          {titolo}
        </h1>
        {testo && <p className="vpq-avviso-testo">{testo}</p>}
      </div>
    );
  }

  const conErrori = visibili.filter((d) => errori[d.id]);

  return (
    <>
      <header className="vpq-testa">
        <p className="vpq-occhiello">Questionario di fine percorso</p>
        <h1 className="vpq-titolo">{t.titolo}</h1>
        <p className="vpq-intro">
          {t.intro(tutte.length)} {t.entro}
        </p>
      </header>

      {anteprima && (
        <p className="vpq-anteprima" role="note">
          <i className="fas fa-eye" aria-hidden="true" />
          <span>
            Anteprima per lo staff ({ruolo === "docente" ? "docenti" : "studenti"}): si può compilare per prova, ma niente viene salvato.
          </span>
        </p>
      )}

      <div className="vpl-wrap">
        <div className="card vpl-card">
          <form className="vpl-form" onSubmit={invia} noValidate>
            <p className="vpl-nota">
              <i className="fas fa-user-shield" aria-hidden="true" />
              <span>{AVVISO_TESTI[ruolo]}</span>
            </p>

            {visibili.map((d, i) => (
              <DomandaCampo
                key={d.id}
                d={d}
                numero={i + 1}
                valore={bozza[d.id] ?? ""}
                errore={errori[d.id] ?? null}
                onChange={(v) => cambia(d.id, v)}
              />
            ))}

            <div className="vpl-invio">
              {conErrori.length > 0 && (
                <div className="vpl-riepilogo-slot">
                  <div className="vpl-riepilogo" ref={riepilogoRef} tabIndex={-1} role="alert">
                    <p className="vpl-riepilogo-titolo">
                      <i className="fas fa-circle-exclamation" aria-hidden="true" />
                      {t.riepilogo}
                    </p>
                    <ul>
                      {conErrori.map((d) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => vaiA(d)}>
                            {visibili.indexOf(d) + 1}. {d.testo}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <button type="submit" className="btn-primary vpl-invia" disabled={invio} aria-busy={invio || undefined}>
                {invio ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
                    Invio in corso
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane" aria-hidden="true" />
                    Invia le risposte
                  </>
                )}
              </button>
              <p className="vpl-piede" role="status" aria-live="polite">
                {messaggio ?? "Le risposte si inviano una volta sola."}
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function DomandaCampo({
  d,
  numero,
  valore,
  errore,
  onChange,
}: {
  d: Domanda;
  numero: number;
  valore: string;
  errore: string | null;
  onChange: (v: string) => void;
}) {
  const id = idCampo(d);
  const idAiuto = d.aiuto ? `${id}-aiuto` : null;
  const idErrore = errore ? `${id}-errore` : null;
  const facoltativa = !d.obbligatoria && <span className="vpl-opz"> (facoltativa)</span>;
  const erroreRiga = errore && (
    <p className="vpl-errore" id={idErrore ?? undefined}>
      <i className="fas fa-circle-exclamation" aria-hidden="true" />
      {errore}
    </p>
  );

  if (d.tipo === "testo") {
    const pieno = valore.length >= d.max;
    return (
      <div className="vpl-campo vpq-domanda">
        <label className="vpl-label" htmlFor={id}>
          <span className="vpq-numero" aria-hidden="true">{numero}</span>
          {d.testo}
          {facoltativa}
        </label>
        {d.aiuto && (
          <p className="vpl-aiuto" id={idAiuto ?? undefined}>
            {d.aiuto}
          </p>
        )}
        <textarea
          id={id}
          className="vpl-input"
          rows={4}
          maxLength={d.max}
          value={valore}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={errore ? true : undefined}
          aria-describedby={ids(idAiuto, idErrore, `${id}-conta`)}
        />
        <p className="vpq-contatore" id={`${id}-conta`} data-pieno={pieno || undefined}>
          {valore.length} / {d.max}
        </p>
        {erroreRiga}
      </div>
    );
  }

  const opzioni =
    d.tipo === "scelta"
      ? d.opzioni.map((o) => ({ valore: o.valore, etichetta: o.etichetta }))
      : Array.from({ length: d.max - d.min + 1 }, (_, k) => {
          const v = String(d.min + k);
          return { valore: v, etichetta: v };
        });
  const classiScala = d.tipo === "scala" ? `vpq-scala${d.max - d.min >= 10 ? " vpq-scala-10" : ""}` : "";

  return (
    <fieldset className="vpl-fieldset vpq-domanda" aria-describedby={ids(idAiuto, idErrore)}>
      <legend className="vpl-label">
        <span className="vpq-numero" aria-hidden="true">{numero}</span>
        {d.testo}
        {facoltativa}
        {d.tipo === "scala" && (
          <span className="sr-only">
            {" "}
            Da {d.min}, {d.estremi[0].toLowerCase()}, a {d.max}, {d.estremi[1].toLowerCase()}.
          </span>
        )}
      </legend>
      {d.aiuto && (
        <p className="vpl-aiuto" id={idAiuto ?? undefined}>
          {d.aiuto}
        </p>
      )}
      <div className={`vpl-chips ${classiScala}`} data-errore={errore ? true : undefined}>
        {opzioni.map((o, k) => {
          const scelto = valore === o.valore;
          return (
            <label key={o.valore} className="vpl-chip" data-scelto={scelto}>
              <input
                type="radio"
                name={id}
                id={k === 0 ? id : undefined}
                value={o.valore}
                checked={scelto}
                onChange={() => onChange(o.valore)}
              />
              {d.tipo === "scelta" && <i className={`fas ${scelto ? "fa-circle-check" : "fa-circle"}`} aria-hidden="true" style={scelto ? undefined : { opacity: 0.25 }} />}
              {o.etichetta}
            </label>
          );
        })}
      </div>
      {d.tipo === "scala" && (
        <p className="vpq-estremi" aria-hidden="true">
          <span>
            {d.min} = {d.estremi[0]}
          </span>
          <span>
            {d.max} = {d.estremi[1]}
          </span>
        </p>
      )}
      {erroreRiga}
    </fieldset>
  );
}
