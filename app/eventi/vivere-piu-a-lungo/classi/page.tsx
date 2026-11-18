import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { MAX_PERSONE_CLASSE, PAGINA_CLASSI } from "@/lib/eventi/classi";
import {
  ARCHIVE_MODE,
  CLASSI_PRIMA_DI_PARTIRE,
  EVENT,
  EVENT_SLUG,
  SESSIONS,
  SITE_URL,
  elencoGiornate,
  giornateConArticolo,
} from "../content";
import { ModuloClassi } from "./ModuloClassi";
import { STILE_PAGINA_CLASSI } from "./stile";

/**
 * La prenotazione per classe: una classe di una scuola, prenotata da un
 * docente, con un QR per tutto il gruppo. Gli studenti che vengono con la
 * classe non si iscrivono uno per uno.
 *
 * La pagina è statica: i posti per le classi, l'ora del server e la scuola
 * del link dell'invito (?scuola=LIC-XXXXXXXX) li legge il modulo nel browser.
 * La pagina della classe, con il codice nell'indirizzo, è un'altra
 * (classe/[code]) e non va indicizzata; questa sì.
 */

const NOME_BREVE = EVENT.titolo.split(":")[0]; // "Vivere più a lungo"
const DATE_EVENTO = elencoGiornate(SESSIONS.map((s) => s.slug)); // "10 e 11 dicembre"
const PAGINA_EVENTO = `/eventi/${EVENT_SLUG}`;
const TITOLO = `Prenotazione per le classi, ${NOME_BREVE}`;
const DESCRIZIONE = `Sei docente? Prenota per tutta la classe ${giornateConArticolo(SESSIONS.map((s) => s.slug))} 2026 a ${EVENT.citta}: fino a ${MAX_PERSONE_CLASSE} persone, un QR per entrare insieme. Ingresso gratuito.`;

export const metadata: Metadata = {
  title: TITOLO,
  description: DESCRIZIONE,
  alternates: { canonical: PAGINA_CLASSI },
  openGraph: {
    title: TITOLO,
    description: DESCRIZIONE,
    url: `${SITE_URL}${PAGINA_CLASSI}`,
    siteName: "Fondazione bioERGOtech",
    locale: "it_IT",
    type: "website",
    images: [{ url: EVENT.ogImage, width: EVENT.ogImageLarghezza, height: EVENT.ogImageAltezza, alt: EVENT.ogImageAlt }],
  },
};

/** Come funziona, in quattro punti: quello che un docente chiede prima di compilare. */
const PUNTI = [
  {
    icona: "fa-users",
    titolo: "Una prenotazione per classe",
    testo: `Fino a ${MAX_PERSONE_CLASSE} persone, docenti compresi. Per più classi, una prenotazione per ciascuna.`,
  },
  {
    icona: "fa-qrcode",
    titolo: "Un QR per tutta la classe",
    testo: "Arriva per email a chi prenota. All'ingresso lo mostri e la classe entra insieme.",
  },
  {
    icona: "fa-user-shield",
    titolo: "Nessun dato degli studenti",
    testo: "Ci basta sapere quanti sono: gli studenti non devono iscriversi uno per uno.",
  },
  {
    icona: "fa-pen-to-square",
    titolo: "Modifiche dal link nell'email",
    testo: "Puoi cambiare il numero di persone, aggiungere o annullare una giornata.",
  },
];

export default function PrenotazioneClassiPage() {
  return (
    <>
      <Navbar />
      <main className="vpc-pagina">
        <style>{STILE_PAGINA_CLASSI}</style>
        <div className="vpc-contenitore">
          <Link href={PAGINA_EVENTO} className="vpc-indietro">
            <i className="fas fa-arrow-left" aria-hidden="true" />{" "}
            {NOME_BREVE}, il programma
          </Link>

          <header>
            <p className="vpc-occhiello">
              {NOME_BREVE}, {DATE_EVENTO} a {EVENT.citta}
            </p>
            <h1 className="vpc-h1">Prenota per la tua classe</h1>
            <p className="vpc-lead">
              Per i docenti che vengono con la classe: una sola prenotazione per tutto il gruppo, con un QR per
              entrare insieme. L&apos;ingresso è gratuito.
            </p>
          </header>

          {ARCHIVE_MODE ? (
            <div className="vpc-chiuse" style={{ marginTop: 28 }}>
              <span className="icon-circle icon-circle-primary" aria-hidden="true">
                <i className="fas fa-flag-checkered" />
              </span>
              <h2>Le prenotazioni sono chiuse</h2>
              <p>L&apos;evento si è concluso. Grazie a tutte le scuole che hanno partecipato.</p>
              <Link href={PAGINA_EVENTO} className="btn-primary vpc-btn">
                <i className="fas fa-calendar-days" aria-hidden="true" />{" "}
                Il programma dell&apos;evento
              </Link>
            </div>
          ) : (
            <>
              <section aria-labelledby="vpc-come-titolo">
                <h2 id="vpc-come-titolo" className="sr-only">
                  Come funziona
                </h2>
                <ul className="vpc-punti">
                  {PUNTI.map((p) => (
                    <li key={p.titolo} className="vpc-punto">
                      <span className="vpc-punto-icona" aria-hidden="true">
                        <i className={`fas ${p.icona}`} />
                      </span>
                      <div>
                        <h3>{p.titolo}</h3>
                        <p>{p.testo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <ModuloClassi />

              <div className="vpc-dopo">
                <section className="vpc-riquadro" aria-labelledby="vpc-giorno-titolo">
                  <h2 id="vpc-giorno-titolo">
                    <i className="fas fa-bus" aria-hidden="true" />{" "}
                    Il giorno dell&apos;evento
                  </h2>
                  <p>{CLASSI_PRIMA_DI_PARTIRE}</p>
                  <p>All&apos;ingresso mostra il QR della classe, dal telefono o stampato: lo trovi nell&apos;email e nella pagina della classe.</p>
                </section>
                <section className="vpc-riquadro" aria-labelledby="vpc-altro-titolo">
                  <h2 id="vpc-altro-titolo">
                    <i className="fas fa-circle-question" aria-hidden="true" />{" "}
                    Non vieni con una classe?
                  </h2>
                  <p>
                    Chi viene da solo, con la famiglia o con gli amici si iscrive dalla{" "}
                    <Link href={`${PAGINA_EVENTO}#iscrizione`}>pagina dell&apos;evento</Link>, con un biglietto
                    personale.
                  </p>
                  <p>
                    Per qualsiasi domanda scrivi a <a href="mailto:info@bioergotech.org">info@bioergotech.org</a>.
                  </p>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
