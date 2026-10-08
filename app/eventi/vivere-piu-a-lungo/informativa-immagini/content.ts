/**
 * Informativa su foto, video, voce e interviste dell'evento.
 *
 * I testi vengono dai documenti privacy dell'evento (informativa, moduli per
 * studenti minorenni e maggiorenni, istruzioni per le scuole) preparati da
 * Fondazione bioERGOtech e SafesPro, contitolari del trattamento per le
 * riprese. Qui ne vive la versione pubblicata, con nome, date e luoghi
 * allineati a quelli del sito.
 *
 * Le due scelte A e B stanno in un posto solo, `SCELTE_IMMAGINI`, perché le
 * usano sia questa pagina sia il modulo PDF che il referente scarica: se il
 * testo di una scelta cambiasse in uno solo dei due, la famiglia firmerebbe
 * una cosa diversa da quella che ha letto.
 */

import { EVENT, EVENT_SLUG } from "../content";

export const INFORMATIVA_IMMAGINI_SLUG = "informativa-immagini";
export const INFORMATIVA_IMMAGINI_PATH = `/eventi/${EVENT_SLUG}/${INFORMATIVA_IMMAGINI_SLUG}`;

/** Come l'evento viene nominato in questi testi, con date e luoghi. */
export const EVENTO_RIPRESE = {
  nome: EVENT.titolo,
  date: "10 e 11 dicembre 2026",
  luoghi: "10 dicembre al PalaMazzola e 11 dicembre al Teatro Fusco, Taranto",
} as const;

export const CONTITOLARI = [
  {
    nome: "Fondazione bioERGOtech ETS",
    indirizzo: "Via Ciro Giovinazzi 70, 74123 Taranto",
    fiscale: "C.F. 90287640735",
    email: "info@bioergotech.org",
  },
  {
    nome: "Associazione Scuola di Alta Formazione e di Studi Specializzati per Professionisti (SafesPro)",
    indirizzo: "Via Ciro Giovinazzi 74, 74123 Taranto",
    fiscale: "C.F. 90249390734, P. IVA 03225610736",
    email: "info@safespro.it",
  },
] as const;

/** Unico punto di contatto per richieste, revoche e segnalazioni. */
export const CONTATTO_PRIVACY = "info@bioergotech.org";

export type SceltaImmagini = {
  id: "A" | "B";
  titolo: string;
  /** Dove possono comparire i contenuti, per la tabella dell'informativa. */
  dove: string;
  base: string;
  durata: string;
  /** Testo dell'autorizzazione, con il soggetto da adattare al modulo. */
  testo: (soggetto: "minorenne" | "maggiorenne") => string;
};

export const SCELTE_IMMAGINI: SceltaImmagini[] = [
  {
    id: "A",
    titolo: "Raccontare l'evento 2026",
    dove: "Siti e profili social dei contitolari, comunicati e materiali per la stampa relativi all'evento.",
    base: "Consenso",
    durata: "5 anni",
    testo: (s) =>
      `Autorizzo Fondazione bioERGOtech ETS e SafesPro a utilizzare foto, video, voce e, se raccolte, interviste che ${
        s === "minorenne" ? "ritraggono lo studente" : "mi ritraggono"
      } per raccontare e comunicare l'evento «${EVENTO_RIPRESE.nome}» del ${EVENTO_RIPRESE.date} sui loro siti, profili social, comunicati e materiali per la stampa. La scelta è valida per 5 anni dall'evento, gratuita e revocabile in ogni momento per il futuro.`,
  },
  {
    id: "B",
    titolo: "Promuovere attività future",
    dove: "Brochure, presentazioni, pagine e campagne dei contitolari; contenuti promozionali su social e YouTube.",
    base: "Consenso distinto",
    durata: "10 anni",
    testo: (s) =>
      `Autorizzo Fondazione bioERGOtech ETS e SafesPro a utilizzare foto, video, voce e, se raccolte, interviste che ${
        s === "minorenne" ? "ritraggono lo studente" : "mi ritraggono"
      } anche per promuovere future attività formative, culturali e istituzionali, compresi brochure, presentazioni, pagine, campagne promozionali, social e YouTube. La scelta è valida per 10 anni dall'evento, gratuita e revocabile in ogni momento per il futuro.`,
  },
];

/** Regola che chiude entrambe le scelte, sul modulo e nella pagina. */
export const SCELTE_NOTA =
  "Le scelte sono facoltative e indipendenti. Se una casella non è selezionata, vale NO. Il rifiuto non impedisce di partecipare all'evento. Gli organizzatori adottano misure ragionevoli per evitare la pubblicazione di immagini riconoscibili non autorizzate.";

export type SezioneInformativa = { h: string; p: string[] };

/** Le sezioni discorsive dell'informativa, in ordine. */
export const INFORMATIVA_IMMAGINI = {
  titoloPagina: "Informativa su foto, video, voce e interviste | Vivere più a lungo",
  descrizionePagina:
    "Come Fondazione bioERGOtech e SafesPro usano foto, video, voce e interviste realizzati durante l'evento Vivere più a lungo del 10 e 11 dicembre 2026 a Taranto.",
  titolo: "Informativa su foto, video, voce e interviste",
  sottotitolo: `Evento «${EVENTO_RIPRESE.nome}». ${EVENTO_RIPRESE.luoghi}.`,
  intro: [
    "Questa informativa riguarda le fotografie, i video, la voce e le eventuali interviste realizzati durante l'evento. È destinata agli studenti che partecipano al convegno, in particolare ai finalisti del percorso «Biotecnologie e Intelligenza Artificiale», alle loro famiglie e agli studenti maggiorenni. Per il pubblico è disponibile anche un avviso breve presso le sedi dell'evento.",
  ],
  chi: {
    h: "Chi usa i dati",
    intro:
      "Le immagini sono trattate congiuntamente da due enti, contitolari del trattamento ai sensi dell'art. 26 del Regolamento (UE) 2016/679 solo per foto, video, voce, interviste e relative pubblicazioni dell'evento.",
    nota: `Il contenuto essenziale del loro accordo è disponibile su richiesta scrivendo a ${CONTATTO_PRIVACY}.`,
  },
  sezioniPrima: [
    {
      h: "Quali contenuti saranno raccolti",
      p: [
        "Durante le due giornate potranno essere realizzati fotografie, video, registrazioni audio e interviste. Non sono previste dirette streaming. Nelle immagini possono comparire la persona, la voce, il nome della squadra, il titolo del progetto e l'istituto di appartenenza. Salvo accordo specifico, non saranno usati tag o didascalie con il nome e cognome dello studente.",
        "La scuola comunica agli organizzatori soltanto l'elenco degli studenti che partecipano al convegno e le scelte sulle immagini, e conserva gli originali dei moduli firmati.",
      ],
    },
  ] as SezioneInformativa[],
  finalita: {
    h: "Per quali finalità e per quanto tempo",
    nota:
      "Le due scelte sono facoltative e indipendenti: la partecipazione all'evento non dipende dal consenso a foto, video, voce o interviste. Alla scadenza, i contenuti controllati dai contitolari sono rimossi, archiviati senza diffusione oppure resi non pubblici. È possibile revocare il consenso in qualsiasi momento per il futuro.",
  },
  sezioniDopo: [
    {
      h: "Chi può ricevere i contenuti",
      p: [
        "Possono trattare immagini e registrazioni, solo per l'incarico ricevuto, il personale dei contitolari e gli eventuali fotografi, videomaker o tecnici incaricati. Le immagini pubblicate sui social o su YouTube diventano visibili al pubblico e sono soggette anche alle condizioni delle rispettive piattaforme, che possono trattare dati al di fuori dello Spazio Economico Europeo secondo le proprie informative.",
        "Le testate giornalistiche possono ricevere contenuti relativi all'evento. Non sono autorizzate dagli organizzatori a utilizzare le immagini per finalità diverse dalla cronaca o dalla propria attività editoriale.",
      ],
    },
    {
      h: "Pubblico e riprese d'insieme",
      p: [
        "L'evento è aperto al pubblico. Possono essere effettuate riprese d'insieme della sala e del palco. Gli organizzatori non pubblicano intenzionalmente immagini riconoscibili di minori presenti nel pubblico che non abbiano dato l'autorizzazione prevista per gli studenti che partecipano al convegno. Chi desidera segnalare una particolare esigenza può rivolgersi al personale presente o scrivere a " +
          CONTATTO_PRIVACY +
          ".",
        "Riprese e fotografie eseguite autonomamente da giornalisti, spettatori o altri terzi restano soggette alla loro responsabilità: i contitolari non controllano né possono rimuovere materiali pubblicati autonomamente da tali soggetti.",
      ],
    },
    {
      h: "Diritti e revoca",
      p: [
        "Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità quando applicabile, opposizione nei casi previsti e revoca del consenso. Per gli studenti minorenni la richiesta può essere presentata dal genitore o dal tutore.",
        `Per richieste, revoche o segnalazioni scrivi a ${CONTATTO_PRIVACY} oppure a info@safespro.it. La revoca non rende illecito quanto fatto prima, ma interrompe i nuovi usi e comporta la rimozione dei contenuti che i contitolari controllano direttamente, nei limiti tecnicamente possibili.`,
        "È sempre possibile proporre reclamo al Garante per la protezione dei dati personali: www.garanteprivacy.it.",
      ],
    },
  ] as SezioneInformativa[],
  moduli: {
    h: "Moduli per le scuole",
    p: "I moduli con le scelte A e B, nella versione per studenti minorenni e per studenti maggiorenni, si scaricano dall'area del docente referente, già intestati all'istituto. La scuola li consegna a famiglie e studenti, conserva agli atti quelli firmati e trasmette agli organizzatori solo l'elenco minimo degli studenti partecipanti con le scelte A e B.",
  },
} as const;

/**
 * Istruzioni per la scuola, stampate nel modulo e mostrate al referente.
 * Riassumono il documento «Istruzioni per le scuole e lista partecipanti».
 */
export const ISTRUZIONI_SCUOLA = [
  "Consegna alle famiglie e agli studenti maggiorenni l'informativa e il modulo corretto.",
  "Conserva agli atti scolastici i moduli firmati.",
  `Prima dell'evento invia a ${CONTATTO_PRIVACY} solo l'elenco minimo: studente, classe e scelte A e B.`,
  "Non invia copie dei moduli, firme, recapiti dei genitori o altri dati non necessari.",
  `Se riceve una revoca prima dell'evento, aggiorna subito la Fondazione a ${CONTATTO_PRIVACY}.`,
];
