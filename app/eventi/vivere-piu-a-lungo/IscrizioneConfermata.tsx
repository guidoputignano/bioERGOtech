"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { esitoIscrizione, type EsitoIscrizione } from "@/lib/eventi/registration";
import { googleCalendarUrl, icsUrl } from "@/lib/eventi/calendario";
import {
  EVENT,
  EVENT_SLUG,
  SESSIONS,
  etichettaGiornata,
  giornateConArticolo,
  sessionBySlug,
} from "./content";
import {
  URL_INVITO,
  comportamentoScroll,
  copiaTesto,
  testoInvito,
  type EsitoServer,
  type GiornataEsito,
} from "./modulo-utils";

/** Quello che la rotta ha risposto, più email e nome per i messaggi. */
export type DatiConferma = EsitoServer & { email: string; nome: string };

const TITOLI: Record<EsitoIscrizione, string> = {
  confermata: "Iscrizione confermata",
  parziale: "Iscrizione registrata",
  attesa: "Sei in lista d'attesa",
  nessuna: "Iscrizione ricevuta",
};

/** Le giornate nell'ordine dell'evento, senza doppioni; quelle sconosciute in fondo. */
function ordina(giornate: readonly GiornataEsito[]): GiornataEsito[] {
  const posizione = (slug: string) => {
    const i = SESSIONS.findIndex((s) => s.slug === slug);
    return i === -1 ? SESSIONS.length : i;
  };
  const viste = new Set<string>();
  return giornate
    .filter((g) => (viste.has(g.slug) ? false : (viste.add(g.slug), true)))
    .sort((a, b) => posizione(a.slug) - posizione(b.slug));
}

const NUOVA_SCHEDA = <span className="sr-only"> (si apre in una nuova scheda)</span>;

/**
 * La schermata dopo l'iscrizione: com'è andata giornata per giornata, il
 * codice, il biglietto, il calendario e l'invito ad altre persone. Prende il
 * posto del modulo nella stessa card; all'arrivo scorre in vista e porta il
 * focus sul titolo, così chi usa un lettore di schermo sente subito l'esito.
 */
export function IscrizioneConfermata({
  dati,
  onAltraPersona,
}: {
  dati: DatiConferma;
  onAltraPersona: () => void;
}) {
  const radice = useRef<HTMLDivElement>(null);
  const titolo = useRef<HTMLHeadingElement>(null);
  const [puoCondividere, setPuoCondividere] = useState(false);
  const [copia, setCopia] = useState<"" | "ok" | "errore">("");

  useEffect(() => {
    titolo.current?.focus({ preventScroll: true });
    radice.current?.scrollIntoView({ block: "start", behavior: comportamentoScroll() });
  }, []);

  // Solo dopo il montaggio: il server non sa se il browser ha la condivisione.
  useEffect(() => {
    setPuoCondividere(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (copia !== "ok") return;
    const t = window.setTimeout(() => setCopia(""), 4000);
    return () => window.clearTimeout(t);
  }, [copia]);

  const altraPersona = (
    <div className="vpl-ok-piede">
      <button type="button" className="vpl-link-btn" onClick={onAltraPersona}>
        <i className="fas fa-user-plus" aria-hidden="true" />
        Iscrivi un&apos;altra persona
      </button>
    </div>
  );

  // Senza codice (la risposta all'honeypot, o una risposta incompleta): un
  // ringraziamento semplice, senza nulla che possa rompersi.
  if (!dati.codice) {
    return (
      <div ref={radice} className="vpl-ok">
        <div className="vpl-ok-testa">
          <div className="icon-circle icon-circle-primary" aria-hidden="true">
            <i className="fas fa-check" />
          </div>
          <h3 ref={titolo} tabIndex={-1} className="vpl-ok-titolo">
            Grazie per l&apos;iscrizione
          </h3>
          <p className="vpl-ok-intro">
            Abbiamo ricevuto la tua richiesta. Il biglietto con il QR code arriva per email: se non lo trovi
            entro qualche minuto, guarda nello spam o scrivici a{" "}
            <a className="vpl-link" href="mailto:info@bioergotech.org">
              info@bioergotech.org
            </a>
            .
          </p>
        </div>
        {altraPersona}
      </div>
    );
  }

  const codice = dati.codice;
  const giornate = ordina(dati.sessions);
  const esito = esitoIscrizione(giornate);
  // Solo le giornate che il sito conosce entrano nelle frasi e nel calendario.
  const confermate = giornate.filter((g) => g.status === "confermato" && sessionBySlug(g.slug)).map((g) => g.slug);
  const inAttesa = giornate.filter((g) => g.status === "lista_attesa" && sessionBySlug(g.slug)).map((g) => g.slug);
  const saluto = dati.nome ? `Grazie per l'iscrizione, ${dati.nome}.` : "Grazie per l'iscrizione.";

  let intro: string;
  switch (esito) {
    case "confermata":
      intro = confermate.length
        ? `${saluto} Ti aspettiamo ${giornateConArticolo(confermate)} a ${EVENT.citta}.`
        : saluto;
      break;
    case "parziale":
      intro = `${saluto} Il tuo posto per ${giornateConArticolo(confermate)} è confermato. Per ${giornateConArticolo(inAttesa)} sei in lista d'attesa: se si libera un posto ti scriviamo subito.`;
      break;
    case "attesa":
      intro = `${saluto} Per ${giornateConArticolo(inAttesa)} i posti sono esauriti: sei in lista d'attesa e, se si libera un posto, ti scriviamo subito.`;
      break;
    default:
      intro =
        "Abbiamo ricevuto la tua iscrizione, ma non vediamo ancora le giornate scelte. Apri il biglietto per controllare, oppure scrivici a info@bioergotech.org.";
  }

  // Ci si può reiscrivere con la stessa email: la rotta dice che cosa è
  // stato aggiunto adesso. Se c'era già qualcosa, lo diciamo con chiarezza.
  let notaEsistente: string | null = null;
  if (dati.nuove) {
    const nuove = dati.nuove;
    const giaPresenti = giornate.filter((g) => !nuove.includes(g.slug));
    if (giaPresenti.length > 0) {
      const aggiunte = nuove.filter((s) => sessionBySlug(s));
      notaEsistente = aggiunte.length
        ? `Con questo indirizzo email c'era già un'iscrizione: abbiamo aggiunto ${giornateConArticolo(aggiunte)}. Il codice resta lo stesso.`
        : "Con questo indirizzo email c'era già un'iscrizione: qui sotto trovi il riepilogo aggiornato. Il codice resta lo stesso.";
    }
  }

  const testo = testoInvito(confermate);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${testo} ${URL_INVITO}`)}`;

  const condividi = async () => {
    try {
      await navigator.share({ title: EVENT.titolo, text: testo, url: URL_INVITO });
    } catch {
      /* condivisione annullata: niente da segnalare */
    }
  };

  const copiaLink = async () => {
    setCopia((await copiaTesto(URL_INVITO)) ? "ok" : "errore");
  };

  const iconaTesta = esito === "attesa" ? "fa-hourglass-half" : "fa-check";

  return (
    <div ref={radice} className="vpl-ok">
      <div className="vpl-ok-testa">
        <div
          className="icon-circle icon-circle-primary"
          aria-hidden="true"
          style={esito === "attesa" ? { background: "#FFF1D6", color: "#8A5300" } : undefined}
        >
          <i className={`fas ${iconaTesta}`} />
        </div>
        <h3 ref={titolo} tabIndex={-1} className="vpl-ok-titolo">
          {TITOLI[esito]}
        </h3>
        <p className="vpl-ok-intro">{intro}</p>
        {notaEsistente && (
          <p className="vpl-ok-nota">
            <i className="fas fa-circle-info" aria-hidden="true" />
            <span>{notaEsistente}</span>
          </p>
        )}
      </div>

      {giornate.length > 0 && (
        <ul className="vpl-ok-giornate" aria-label="Le tue giornate">
          {giornate.map((g) => {
            const s = sessionBySlug(g.slug);
            return (
              <li key={g.slug}>
                <div className="vpl-ok-giornata">
                  <strong>{s?.giornoLabel ?? etichettaGiornata(g.slug)}</strong>
                  {s && (
                    <span>
                      {s.luogoBreve}, {s.orario}
                    </span>
                  )}
                </div>
                <span className="vpl-pill" data-stato={g.status}>
                  <i
                    className={`fas ${g.status === "confermato" ? "fa-check" : "fa-hourglass-half"}`}
                    aria-hidden="true"
                  />
                  {g.status === "confermato" ? "Confermato" : "In lista d'attesa"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="vpl-codice">
        <div className="vpl-codice-label">Il tuo codice</div>
        <div className="vpl-codice-valore">{codice}</div>
        <p className="vpl-codice-nota">Il QR code è nel biglietto: mostralo all&apos;ingresso.</p>
      </div>

      <Link href={`/eventi/${EVENT_SLUG}/biglietto/${encodeURIComponent(codice)}`} className="btn-primary">
        <i className="fas fa-ticket" aria-hidden="true" />
        Apri il biglietto
      </Link>

      {confermate.length > 0 && (
        <section aria-labelledby="vpl-ok-calendario">
          <h4 id="vpl-ok-calendario" className="vpl-sezione-titolo">
            Aggiungi al calendario
          </h4>
          <div className="vpl-azioni">
            {confermate.map((slug) => {
              const s = sessionBySlug(slug)!;
              return (
                <a
                  key={slug}
                  href={googleCalendarUrl(s, codice)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vpl-azione"
                >
                  <i className="fab fa-google" aria-hidden="true" />
                  {confermate.length > 1 ? `Google, ${s.etichetta}` : "Google Calendar"}
                  {NUOVA_SCHEDA}
                </a>
              );
            })}
            <a href={icsUrl(confermate, codice, false)} className="vpl-azione">
              <i className="fas fa-calendar-plus" aria-hidden="true" />
              Apple, Outlook e altri
            </a>
          </div>
        </section>
      )}

      <section aria-labelledby="vpl-ok-invita">
        <h4 id="vpl-ok-invita" className="vpl-sezione-titolo">
          Invita qualcuno
        </h4>
        <div className="vpl-azioni">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="vpl-azione">
            <i className="fab fa-whatsapp" aria-hidden="true" />
            WhatsApp
            {NUOVA_SCHEDA}
          </a>
          {puoCondividere && (
            <button type="button" className="vpl-azione" onClick={condividi}>
              <i className="fas fa-share-nodes" aria-hidden="true" />
              Condividi
            </button>
          )}
          <button type="button" className="vpl-azione" onClick={copiaLink}>
            <i className={`fas ${copia === "ok" ? "fa-check" : "fa-link"}`} aria-hidden="true" />
            {copia === "ok" ? "Link copiato" : "Copia il link"}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {copia === "ok" ? "Link copiato negli appunti." : ""}
        </p>
        {copia === "errore" && (
          <p className="vpl-ok-nota" style={{ marginTop: 10 }}>
            <i className="fas fa-circle-info" aria-hidden="true" />
            <span>
              Non riusciamo a copiare il link in automatico. Eccolo: <strong>{URL_INVITO}</strong>
            </span>
          </p>
        )}
      </section>

      <p className="vpl-ok-nota">
        <i className="fas fa-envelope" aria-hidden="true" />
        <span>
          Ti abbiamo mandato il biglietto anche a <strong>{dati.email}</strong>. Se non lo trovi, guarda nello spam.
        </span>
      </p>

      {dati.nuovoAccount && (
        <p className="vpl-ok-nota">
          <i className="fas fa-user-check" aria-hidden="true" />
          <span>
            Con l&apos;iscrizione abbiamo attivato anche il tuo account gratuito nel Member Portal. Per scegliere la
            password,{" "}
            <Link href="/auth/forgot-password" className="vpl-link">
              apri questa pagina
            </Link>{" "}
            e scrivi il tuo indirizzo email.
          </span>
        </p>
      )}

      {altraPersona}
    </div>
  );
}
