/**
 * Linee guida per i mentor del percorso «Biotecnologie e Intelligenza
 * Artificiale», per licei e università.
 *
 * Il testo viene dal documento della Fondazione "Linee guida per mentor"
 * (doc 07). Vive in un posto solo perche lo usano quattro cose diverse: la
 * pagina pubblica, la casella del modulo di candidatura, la colonna
 * `linee_guida_testo` di `universita_mentor` (che registra il testo
 * accettato) e il pannello staff quando registra un'accettazione arrivata
 * fuori dal sito. Se il testo cambiasse in uno solo di quei punti, un
 * mentor accetterebbe una cosa diversa da quella che ha letto.
 *
 * Chi cambia questi testi cambia cio che i mentor accettano da quel
 * momento in poi. Le accettazioni gia registrate restano legate al testo di
 * allora, che e salvato per intero nella riga.
 */

import { EVENT_SLUG } from "../content";
import type { Documento } from "../licei/documenti";

export const LINEE_GUIDA_MENTOR_SLUG = "linee-guida-mentor";
export const LINEE_GUIDA_MENTOR_PATH = `/eventi/${EVENT_SLUG}/${LINEE_GUIDA_MENTOR_SLUG}`;

export const EMAIL_SEGNALAZIONI = "info@bioergotech.org";

/** Come funziona il contatto, in tre frasi. */
export const LINEE_GUIDA_MENTOR_PREMESSA = [
  "Il mentor mette a disposizione un contatto professionale.",
  "Gli studenti lo contattano in autonomia, di propria iniziativa e fuori dalla piattaforma.",
  "La Fondazione non trasmette ai mentor i dati degli studenti e non organizza né registra le comunicazioni tra studenti e mentor.",
] as const;

/** Gli impegni del mentor, uno per voce, nell'ordine del documento. */
export const LINEE_GUIDA_MENTOR = [
  "usare esclusivamente un contatto professionale e mantenere un comportamento rispettoso e adeguato al possibile coinvolgimento di studenti minorenni;",
  "non chiedere dati personali, immagini, documenti o informazioni sensibili non necessari;",
  "non usare email o altri dati ricevuti per pubblicità, profilazione o finalità proprie;",
  "non registrare video call o conversazioni;",
  "evitare comunicazioni improprie, pressioni commerciali o richieste di incontro non coerenti con le finalità formative del percorso;",
  `interrompere il contatto e segnalare a ${EMAIL_SEGNALAZIONI} eventuali situazioni inadeguate o preoccupanti.`,
] as const;

export const LINEE_GUIDA_MENTOR_STRUMENTI =
  "Email, Meet, Zoom o altri strumenti scelti da mentor e studente sono utilizzati autonomamente dalle parti e non sono strumenti gestiti dalla Fondazione.";

/**
 * Il testo che si registra in `linee_guida_testo` quando il mentor accetta.
 * E' la somma delle tre parti qui sopra, in prosa: e la versione che fra un
 * anno deve poter essere letta da sola, senza il sito intorno.
 */
export const LINEE_GUIDA_MENTOR_TESTO = [
  "Linee guida per i mentor del percorso «Biotecnologie e Intelligenza Artificiale».",
  ...LINEE_GUIDA_MENTOR_PREMESSA,
  `Il mentor si impegna a: ${LINEE_GUIDA_MENTOR.join(" ")}`,
  LINEE_GUIDA_MENTOR_STRUMENTI,
].join(" ");

export const LINEE_GUIDA_MENTOR_CONSENSO = "Ho letto e accetto le linee guida per i mentor.";

/**
 * Le regole per lo studente, in forma corta. Compaiono sopra l'elenco dei
 * mentor nelle aree di licei e università, cioe proprio nel punto in cui
 * uno studente sta per scrivere a qualcuno che non conosce.
 */
export const REGOLE_STUDENTI_MENTOR = [
  "Contatta il mentor di tua iniziativa, con un tuo indirizzo. La Fondazione non gli comunica i tuoi dati.",
  "Non inviare dati personali non necessari: per parlare del progetto bastano il tuo nome e la tua domanda.",
  "La Fondazione non organizza, non riceve e non registra le conversazioni tra studenti e mentor.",
  `Se qualcosa non ti sembra adeguato, interrompi il contatto e segnalalo a ${EMAIL_SEGNALAZIONI}.`,
] as const;

/** Il consiglio in piu per chi puo essere minorenne, cioe i licei. */
export const REGOLA_MENTOR_MINORENNI =
  "Se sei minorenne, ti suggeriamo di coinvolgere il docente referente del tuo istituto prima di scrivere o di fissare una call.";

export const DOCUMENTO_LINEE_GUIDA_MENTOR: Documento = {
  titoloPagina: "Linee guida per i mentor | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Gli impegni dei mentor del percorso Biotecnologie e Intelligenza Artificiale della Fondazione bioERGOtech, per licei e università, e come avviene il contatto con gli studenti.",
  occhiello: "Mentor",
  titolo: "Linee guida per i mentor",
  intro:
    "Percorso «Biotecnologie e Intelligenza Artificiale», per gli studenti dei licei e per gli studenti universitari. Queste linee guida valgono per tutti i mentor del percorso e vanno accettate prima che il contatto del mentor sia mostrato agli studenti.",
  sezioni: [
    {
      h: "Come avviene il contatto",
      p: [...LINEE_GUIDA_MENTOR_PREMESSA],
      dopo: [
        "Il contatto professionale indicato dal mentor è visibile solo a chi partecipa al percorso, dopo l'accesso alla propria area. Non compare nella pagina pubblica dei mentor.",
      ],
    },
    {
      h: "Gli impegni del mentor",
      p: ["Il mentor si impegna a:"],
      ul: [...LINEE_GUIDA_MENTOR],
    },
    {
      h: "Strumenti di comunicazione",
      p: [LINEE_GUIDA_MENTOR_STRUMENTI],
    },
    {
      h: "Per gli studenti",
      ul: [...REGOLE_STUDENTI_MENTOR, REGOLA_MENTOR_MINORENNI],
    },
    {
      h: "Segnalazioni",
      p: [
        `Mentor, studenti, famiglie e docenti possono segnalare in qualsiasi momento una situazione inadeguata o preoccupante scrivendo a ${EMAIL_SEGNALAZIONI}. La Fondazione può sospendere la visibilità del contatto di un mentor e, nei casi più seri, la sua partecipazione al percorso.`,
      ],
    },
  ],
};
