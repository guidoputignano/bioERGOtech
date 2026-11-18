"use client";

import { useEffect, useRef, useState } from "react";
import { descriviPersone, urlClasse } from "@/lib/eventi/classi";
import { esitoIscrizione, type EsitoIscrizione } from "@/lib/eventi/registration";
import { CLASSI_PRIMA_DI_PARTIRE, SESSIONS, etichettaGiornata, giornateConArticolo, sessionBySlug } from "../content";
import { comportamentoScroll } from "../modulo-utils";
import {
  chiediReinvioClasse,
  laClasse,
  maiuscola,
  persone,
  type EsitoClasse,
  type GiornataEsitoClasse,
} from "./classi-utils";

/** Quello che la rotta ha risposto, più i dati del modulo per i messaggi. */
export type DatiConfermaClasse = EsitoClasse & {
  email: string;
  nome: string;
  classe: string;
  istituto: string;
  studenti: number;
  accompagnatori: number;
};

const TITOLI: Record<EsitoIscrizione, string> = {
  confermata: "Classe prenotata",
  parziale: "Prenotazione registrata",
  attesa: "La classe è in lista d'attesa",
  nessuna: "Prenotazione ricevuta",
};

/** Le giornate nell'ordine dell'evento, senza doppioni; quelle sconosciute in fondo. */
function ordina(giornate: readonly GiornataEsitoClasse[]): GiornataEsitoClasse[] {
  const posizione = (slug: string) => {
    const i = SESSIONS.findIndex((s) => s.slug === slug);
    return i === -1 ? SESSIONS.length : i;
  };
  const viste = new Set<string>();
  return giornate
    .filter((g) => (viste.has(g.slug) ? false : (viste.add(g.slug), true)))
    .sort((a, b) => posizione(a.slug) - posizione(b.slug));
}

type Reinvio = { stato: "" | "invio" | "ok" | "errore"; testo: string };

const AIUTO = (
  <a className="vpl-link" href="mailto:info@bioergotech.org">
    info@bioergotech.org
  </a>
);

/**
 * La schermata dopo la prenotazione di una classe: com'è andata giornata per
 * giornata, il codice della classe, il link alla sua pagina (con il QR) e
 * che cosa portare. Prende il posto del modulo nella stessa card; all'arrivo
 * scorre in vista e porta il focus sul titolo.
 *
 * Se la stessa classe era già prenotata, la schermata non mostra né codice
 * né giornate: la prenotazione aggiornata arriva solo all'indirizzo salvato.
 */
export function PrenotazioneConfermata({
  dati,
  onAltraClasse,
  onRiprova,
}: {
  dati: DatiConfermaClasse;
  onAltraClasse: () => void;
  /** Torna al modulo con gli stessi dati, per inviarlo di nuovo (classe già prenotata, email non partita). */
  onRiprova: () => void;
}) {
  const radice = useRef<HTMLDivElement>(null);
  const titolo = useRef<HTMLHeadingElement>(null);
  const esitoReinvioRef = useRef<HTMLParagraphElement>(null);
  const [reinvio, setReinvio] = useState<Reinvio>({ stato: "", testo: "" });

  useEffect(() => {
    titolo.current?.focus({ preventScroll: true });
    radice.current?.scrollIntoView({ block: "start", behavior: comportamentoScroll() });
  }, []);

  // Dopo un reinvio riuscito il pulsante sparisce: il focus va sul messaggio.
  useEffect(() => {
    if (reinvio.stato === "ok") esitoReinvioRef.current?.focus({ preventScroll: true });
  }, [reinvio.stato]);

  const altraClasse = (
    <div className="vpl-ok-piede">
      <button type="button" className="vpl-link-btn" onClick={onAltraClasse}>
        <i className="fas fa-plus" aria-hidden="true" />{" "}
        Prenota un&apos;altra classe
      </button>
    </div>
  );

  // Con almeno una giornata confermata: che cosa serve quel giorno. Con
  // tutte in lista d'attesa la classe non ha ancora un posto, quindi niente
  // istruzioni per l'ingresso (come nell'email).
  const primaDiPartire = (conPosto: boolean) => (
    <section aria-labelledby="vpc-ok-partire">
      <h4 id="vpc-ok-partire" className="vpl-sezione-titolo">
        Il giorno dell&apos;evento
      </h4>
      <ul className="vpc-ok-elenco">
        {conPosto ? (
          <>
            <li>{CLASSI_PRIMA_DI_PARTIRE}</li>
            <li>All&apos;ingresso mostri il QR della classe: la classe entra insieme.</li>
          </>
        ) : (
          <li>Il QR vale per l&apos;ingresso solo se la classe viene confermata: in quel caso ti scriviamo noi.</li>
        )}
        <li>Puoi dirlo agli studenti: chi viene con la classe non deve iscriversi uno per uno.</li>
      </ul>
    </section>
  );

  // La stessa classe era già prenotata: nessun dato della prenotazione a
  // schermo. Codice, QR e giornate sono nell'email, all'indirizzo salvato.
  if (dati.giaPrenotata) {
    return (
      <div ref={radice} className="vpl-ok">
        <div className="vpl-ok-testa">
          <div
            className="icon-circle icon-circle-primary"
            aria-hidden="true"
            style={dati.emailInviata ? undefined : { background: "#FFF1D6", color: "#8A5300" }}
          >
            <i className={`fas ${dati.emailInviata ? "fa-envelope-circle-check" : "fa-envelope"}`} />
          </div>
          <h3 ref={titolo} tabIndex={-1} className="vpl-ok-titolo">
            {dati.emailInviata ? "Controlla la tua email" : "Prenotazione ricevuta"}
          </h3>
          {dati.emailInviata ? (
            <p className="vpl-ok-intro">
              La classe risulta già prenotata con questo indirizzo email (vale anche un invio di pochi istanti fa): non
              abbiamo creato un doppione. Le giornate scelte ora fanno parte della prenotazione, e ti abbiamo mandato a{" "}
              <strong>{dati.email}</strong> la prenotazione aggiornata: lì trovi il codice, il QR e il link alla pagina
              della classe.
            </p>
          ) : (
            <p className="vpl-ok-intro">
              La classe risulta già prenotata con questo indirizzo email (vale anche un invio di pochi istanti fa), ma in
              questo momento non siamo riusciti a mandarti la prenotazione aggiornata a <strong>{dati.email}</strong>.
              Riprova tra qualche minuto: il modulo è rimasto com&apos;era, basta inviarlo di nuovo. Oppure scrivi a{" "}
              {AIUTO}.
            </p>
          )}
        </div>

        {!dati.emailInviata && (
          <button type="button" className="vpl-azione" style={{ alignSelf: "flex-start" }} onClick={onRiprova}>
            <i className="fas fa-rotate-right" aria-hidden="true" />{" "}
            Torna al modulo e riprova
          </button>
        )}

        <p className="vpl-ok-nota">
          <i className="fas fa-circle-info" aria-hidden="true" />
          <span>
            Il numero di studenti e docenti resta quello della prima prenotazione. Se è cambiato, aggiornalo dalla
            pagina della classe: il link è nell&apos;email della prenotazione.
          </span>
        </p>

        {dati.emailInviata && (
          <p className="vpl-ok-nota">
            <i className="fas fa-circle-info" aria-hidden="true" />
            <span>Se non trovi l&apos;email entro qualche minuto, guarda nella posta indesiderata o nella scheda Promozioni.</span>
          </p>
        )}

        {altraClasse}
      </div>
    );
  }

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
            Prenotazione ricevuta
          </h3>
          <p className="vpl-ok-intro">
            Abbiamo ricevuto la richiesta. La prenotazione con il QR della classe arriva per email: se non la trovi
            entro qualche minuto, guarda nello spam o scrivici a {AIUTO}.
          </p>
        </div>
        {altraClasse}
      </div>
    );
  }

  const codice = dati.codice;
  const giornate = ordina(dati.giornate);
  const esito = esitoIscrizione(giornate);
  // Solo le giornate che il sito conosce entrano nelle frasi.
  const confermate = giornate.filter((g) => g.status === "confermato" && sessionBySlug(g.slug)).map((g) => g.slug);
  const inAttesa = giornate.filter((g) => g.status === "lista_attesa" && sessionBySlug(g.slug)).map((g) => g.slug);
  const saluto = dati.nome ? `Grazie, ${dati.nome}.` : "Grazie.";
  const laClasseQui = laClasse(dati.classe);
  const totale = dati.studenti + dati.accompagnatori;

  let intro: string;
  switch (esito) {
    case "confermata":
      intro = `${saluto} Aspettiamo la ${laClasseQui} ${giornateConArticolo(confermate)}: ${descriviPersone(dati.studenti, dati.accompagnatori)}.`;
      break;
    case "parziale":
      intro = `${saluto} Per ${giornateConArticolo(confermate)} la ${laClasseQui} è confermata. Per ${giornateConArticolo(inAttesa)} è in lista d'attesa: se si liberano posti per tutta la classe, ti scriviamo.`;
      break;
    case "attesa":
      // Non per forza esauriti: possono restare posti, ma meno delle persone della classe.
      intro = `${saluto} Per ${giornateConArticolo(inAttesa)} ora non c'è posto per tutta la classe: la ${laClasseQui} è in lista d'attesa. Se si liberano abbastanza posti (${persone(totale)}), ti scriviamo.`;
      break;
    default:
      intro =
        "Abbiamo ricevuto la prenotazione, ma non vediamo ancora le giornate scelte. Apri la pagina della classe per controllare, oppure scrivici a info@bioergotech.org.";
  }

  const rimanda = async () => {
    if (reinvio.stato === "invio") return;
    setReinvio({ stato: "invio", testo: "" });
    const r = await chiediReinvioClasse(codice);
    setReinvio(
      r.ok
        ? {
            stato: "ok",
            testo: `Fatto: ti abbiamo mandato la prenotazione a ${dati.email}. Se non la trovi tra qualche minuto, guarda nello spam.`,
          }
        : { stato: "errore", testo: r.errore },
    );
  };

  const iconaTesta = esito === "attesa" ? "fa-hourglass-half" : "fa-check";
  const inviando = reinvio.stato === "invio";

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
      </div>

      {giornate.length > 0 && (
        <ul className="vpl-ok-giornate" aria-label={`Le giornate della ${laClasseQui}`}>
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
                  {g.status === "confermato" ? "Confermata" : "In lista d'attesa"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="vpl-codice">
        <div className="vpl-codice-label">Il codice della classe</div>
        <div className="vpl-codice-valore">{codice}</div>
        <p className="vpl-codice-nota">
          {`${maiuscola(laClasseQui)}, ${dati.istituto}. ${dati.emailInviata ? "Il QR è nella pagina della classe e nell'email." : "Il QR è nella pagina della classe."}`}
        </p>
      </div>

      {/* Un link normale, con caricamento completo: la pagina della classe ha
          il codice nell'indirizzo e lì Analytics non si configura. Un cambio
          di pagina lato client lo registrerebbe con l'indirizzo intero. */}
      <a href={urlClasse(codice)} className="btn-primary">
        <i className="fas fa-qrcode" aria-hidden="true" />{" "}
        Apri la pagina della classe
      </a>

      {/* L'email non è partita: lo diciamo subito sotto il pulsante, con la
          possibilità di riprovare da qui. */}
      {!dati.emailInviata && (
        <div className="vpl-ok-avviso" data-esito={reinvio.stato || undefined}>
          <i
            className={`fas ${reinvio.stato === "ok" ? "fa-envelope-circle-check" : "fa-triangle-exclamation"}`}
            aria-hidden="true"
          />
          <div className="vpl-ok-avviso-corpo">
            {reinvio.stato !== "ok" && (
              <>
                <p>
                  La prenotazione è registrata, ma non siamo riusciti a mandarti l&apos;email in questo momento. Apri la
                  pagina della classe qui sopra e salvala, oppure prova a fartela rimandare.
                </p>
                <button
                  type="button"
                  className="vpl-azione"
                  onClick={rimanda}
                  disabled={inviando}
                  aria-busy={inviando || undefined}
                >
                  <i className={`fas ${inviando ? "fa-circle-notch fa-spin" : "fa-envelope"}`} aria-hidden="true" />{" "}
                  Rimandami l&apos;email
                </button>
              </>
            )}
            <p
              ref={esitoReinvioRef}
              tabIndex={-1}
              className="vpl-reinvio-esito"
              data-tipo={reinvio.stato === "errore" ? "errore" : undefined}
              role="status"
              aria-live="polite"
            >
              {reinvio.testo}
            </p>
          </div>
        </div>
      )}

      <p className="vpl-ok-nota">
        <i className="fas fa-pen-to-square" aria-hidden="true" />
        <span>
          Dalla pagina della classe puoi cambiare il numero di persone, aggiungere o annullare una giornata e stampare il
          QR. Conserva il link: basta quello, senza password.
        </span>
      </p>

      {primaDiPartire(confermate.length > 0)}

      {dati.emailInviata && (
        <p className="vpl-ok-nota">
          <i className="fas fa-envelope" aria-hidden="true" />
          <span>
            Ti abbiamo mandato la prenotazione anche a <strong>{dati.email}</strong>. Se non la trovi, guarda nello spam.
          </span>
        </p>
      )}

      {altraClasse}
    </div>
  );
}
