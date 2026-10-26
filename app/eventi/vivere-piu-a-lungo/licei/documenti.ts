/**
 * I documenti pubblici del percorso licei: informativa per gli studenti,
 * informativa per scuole e docenti referenti, regolamento di partecipazione,
 * e i due documenti che scuola e docenti sottoscrivono: l'adesione della
 * scuola, che firma il dirigente, e le istruzioni per i docenti, che ogni
 * docente accetta sulla piattaforma al primo accesso.
 *
 * Partono dai documenti privacy preparati per il corso, corretti dove
 * descrivevano una piattaforma diversa da quella reale: qui sono elencati i
 * dati che il sito raccoglie davvero e tutti quelli che li vedono, Commissione,
 * staff e fornitori tecnici compresi. Chi cambia quello che il portale
 * raccoglie o mostra deve aggiornare anche questi testi: un'informativa che
 * descrive un'altra piattaforma non informa nessuno.
 *
 * Ogni documento porta la data dell'ultimo aggiornamento, mostrata sotto il
 * titolo e registrata insieme a ogni accettazione: così si sa sempre quale
 * testo ha letto chi ha aderito o si è iscritto. Chi cambia un testo cambia
 * anche la sua data, nello stesso commit.
 */

import {
  ADESIONE_SCUOLA_PATH,
  INFORMATIVA_SCUOLE_PATH,
  INFORMATIVA_STUDENTI_PATH,
  ISTRUZIONI_DOCENTE_PATH,
  ISTRUZIONI_REFERENTE,
  PRESA_ATTO_ADESIONE,
  REGOLAMENTO_PATH,
} from "./content";
import { INFORMATIVA_IMMAGINI_PATH } from "../informativa-immagini/content";
import {
  DOCUMENTO_LINEE_GUIDA_MENTOR,
  LINEE_GUIDA_MENTOR_PATH,
} from "../linee-guida-mentor/content";

export type SezioneDoc = {
  h: string;
  p?: string[];
  ul?: string[];
  /** Paragrafi dopo l'elenco. */
  dopo?: string[];
};

/**
 * Le parti da compilare a mano di un documento che si firma: compaiono come
 * righe vuote, prima del testo (`campiInizio`) o in fondo (`campiFine`), e
 * servono soprattutto alla versione stampata.
 */
export type ModuloDoc = {
  campiInizio?: string[];
  campiFine: string[];
  /** Avvertenza sotto le righe della firma. */
  nota?: string;
};

export type Documento = {
  titoloPagina: string;
  descrizione: string;
  occhiello: string;
  titolo: string;
  intro: string;
  sezioni: SezioneDoc[];
  /** Data dell'ultimo aggiornamento del testo, AAAA-MM-GG. */
  aggiornato: string;
  modulo?: ModuloDoc;
};

const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

/** "2026-10-13" diventa "13 ottobre 2026". */
export const dataDocumento = (iso: string): string => {
  const [a, m, g] = iso.split("-").map(Number);
  return `${g} ${MESI[m - 1]} ${a}`;
};

const TITOLARE =
  "Fondazione bioERGOtech ETS, Via Ciro Giovinazzi 70, 74123 Taranto, C.F. 90287640735, info@bioergotech.org.";

const FORNITORI = [
  "Supabase, per il database e l'autenticazione degli account;",
  "Vercel, per l'hosting del sito;",
  "Resend, per l'invio delle email automatiche.",
];

const FORNITORI_NOTA =
  "Questi fornitori trattano i dati per conto della Fondazione, come responsabili del trattamento ai sensi dell'art. 28 GDPR, sulla base degli accordi sul trattamento dei dati che fanno parte dei rispettivi contratti. Alcuni trattamenti possono avvenire anche fuori dallo Spazio Economico Europeo, con le garanzie previste da quegli accordi (Data Privacy Framework UE-USA o clausole contrattuali standard).";

const DIRITTI = [
  "Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità quando applicabile, opposizione nei casi previsti e revoca del consenso. Per esercitare i diritti scrivi a info@bioergotech.org.",
  "Puoi anche presentare reclamo al Garante per la protezione dei dati personali: www.garanteprivacy.it.",
];

export const INFORMATIVA_STUDENTI: Documento = {
  titoloPagina: "Informativa privacy per studenti | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Come Fondazione bioERGOtech usa i dati degli studenti che partecipano al percorso online Biotecnologie e Intelligenza Artificiale.",
  occhiello: "Privacy",
  titolo: "Informativa privacy per studenti",
  intro:
    "Percorso online «Biotecnologie e Intelligenza Artificiale». Questa informativa spiega in modo semplice come Fondazione bioERGOtech ETS usa i dati degli studenti che partecipano al corso.",
  aggiornato: "2026-10-26",
  sezioni: [
    {
      h: "Chi usa i dati",
      p: [
        `Il titolare del trattamento è ${TITOLARE}`,
        "SafesPro, che organizza il percorso con la Fondazione, non accede ai dati degli studenti iscritti al corso. Foto e video dell'evento finale hanno un'informativa separata.",
      ],
    },
    {
      h: "Chi può iscriversi",
      p: [
        "Il corso è destinato agli studenti del triennio delle scuole secondarie di secondo grado che hanno almeno 14 anni. Iscrivendoti dichiari di avere compiuto 14 anni.",
        "Se hai meno di 14 anni non puoi completare l'iscrizione da solo: scrivi a info@bioergotech.org insieme a un genitore o tutore.",
      ],
    },
    {
      h: "Quali dati raccogliamo",
      p: ["All'iscrizione:"],
      ul: [
        "il codice del tuo istituto, che ti dà il docente referente;",
        "nome, cognome, email, classe e anno di corso.",
      ],
      dopo: [
        "La password la scegli tu, con il link che ricevi per email: la Fondazione non la vede.",
        "Durante il corso registriamo le lezioni completate, le riflessioni, le domande e i commenti che invii nelle lezioni, la squadra di cui fai parte con il tuo ruolo, il progetto della squadra (titolo, ambito, testi ed eventuale link ai materiali), le tue iscrizioni ai talk con gli esperti e alcuni dati tecnici di accesso, come la data dell'ultimo accesso.",
        "Nei testi del progetto e nelle riflessioni non inserire informazioni sulla salute o altri dati personali tuoi o di persone reali: non servono al percorso.",
      ],
    },
    {
      h: "Perché li usiamo e su quale base",
      p: [
        "Per creare il tuo account, farti seguire le 21 lezioni del corso, gestire squadre e progetti, far valutare i progetti dalla Commissione e selezionare i finalisti, rispondere alle tue domande, darti assistenza e mantenere sicura la piattaforma.",
        "La base giuridica è il consenso che esprimi con l'iscrizione, che a partire dai 14 anni puoi dare da solo per i servizi online (art. 2-quinquies del Codice privacy). Puoi ritirarlo in qualsiasi momento, con la conseguente chiusura dell'account. Per la sicurezza della piattaforma e la gestione degli accessi la base è il legittimo interesse della Fondazione.",
        "Puoi scegliere separatamente di ricevere la newsletter e informazioni su future iniziative: è facoltativo, non è mai preselezionato e non incide sulla partecipazione.",
        "Nessuna decisione che ti riguarda è presa in modo automatico: i progetti sono valutati da persone.",
      ],
    },
    {
      h: "Chi può vedere i dati",
      ul: [
        "Tu, che vedi i dati e i contenuti del tuo account.",
        "Il docente referente del tuo istituto e gli altri docenti dell'istituto da lui indicati, ciascuno con credenziali personali: vedono nome, cognome, email, classe, stato dell'iscrizione, se sei entrato nel corso e quante lezioni hai completato, a quali talk con gli esperti ti sei iscritto, la tua squadra con il tuo ruolo e il progetto della squadra. Vedono anche la riflessione e la domanda che invii nelle lezioni, quando nella lezione te lo segnaliamo. Quelle inviate prima le vedono tre giorni dopo che la piattaforma te lo segnala, a meno che tu scelga che restino solo allo staff. Li usano solo per seguire il percorso formativo e non vedono gli studenti di altri istituti.",
        "I compagni della tua squadra, che vedono nome, cognome e classe. Quando il progetto viene consegnato, un'email di conferma con i nomi dei componenti arriva a tutta la squadra e al docente referente.",
        "La Commissione di valutazione, con account personali: legge i progetti consegnati con il nome della squadra e dell'istituto, senza i nomi degli studenti, ed è tenuta alla riservatezza.",
        "Il personale autorizzato della Fondazione, nei limiti necessari: gestisce iscrizioni, squadre e finalisti, legge e risponde alle riflessioni e alle domande che invii nelle lezioni, dà assistenza e si occupa della sicurezza.",
        "I fornitori tecnici della piattaforma, elencati qui sotto.",
      ],
      dopo: [
        "Se la tua squadra è tra le finaliste, nome, cognome, email e classe vengono registrati tra i partecipanti all'evento del 10 dicembre 2026, che ha una sua informativa, anche per foto e video.",
      ],
    },
    {
      h: "Fornitori tecnici",
      ul: FORNITORI,
      dopo: [FORNITORI_NOTA],
    },
    {
      h: "Messaggi e mentor",
      p: [
        "La piattaforma non ha una chat o messaggi tra utenti. Le domande che invii nelle lezioni le legge e le risponde lo staff della Fondazione. Riflessione e domanda le possono leggere anche i docenti del tuo istituto che seguono il percorso; il commento lo legge solo lo staff.",
        "Nella tua area trovi l'elenco dei mentor del percorso e, per chi lo ha messo a disposizione, un contatto professionale. Il contatto avviene di tua iniziativa e fuori dalla piattaforma, con un tuo indirizzo e sotto la responsabilità di chi partecipa alla comunicazione.",
        "La Fondazione non comunica ai mentor i tuoi dati e non organizza, non riceve e non registra le comunicazioni tra studente e mentor, comprese email e video call. I mentor accettano linee guida che vietano di chiedere dati non necessari, di usarli per altri scopi e di registrare le conversazioni. Se qualcosa non ti sembra adeguato, interrompi il contatto e scrivi a info@bioergotech.org; se sei minorenne, ti suggeriamo di coinvolgere il docente referente.",
      ],
    },
    {
      h: "Per quanto tempo conserviamo i dati",
      p: [
        "Account, iscrizione, squadra, progetto, valutazioni, riflessioni e dati di avanzamento vengono cancellati o resi anonimi entro un mese dalla conclusione del corso.",
        "Se scegli la newsletter conserviamo solo email e prova della scelta per 24 mesi, salvo revoca anticipata. L'iscrizione all'evento dei finalisti segue i tempi dell'evento.",
      ],
    },
    { h: "I tuoi diritti", p: DIRITTI },
  ],
};

export const INFORMATIVA_SCUOLE: Documento = {
  titoloPagina: "Informativa privacy per scuole e docenti referenti | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Come Fondazione bioERGOtech tratta i dati degli istituti e dei docenti referenti che aderiscono al percorso Biotecnologie e Intelligenza Artificiale.",
  occhiello: "Privacy",
  titolo: "Informativa privacy per scuole e docenti referenti",
  intro: `Percorso online «Biotecnologie e Intelligenza Artificiale». Il titolare del trattamento è ${TITOLARE} Tratta i dati delle scuole e dei docenti referenti per gestire l'adesione al percorso.`,
  aggiornato: "2026-10-13",
  sezioni: [
    {
      h: "Dati trattati",
      ul: [
        "dell'istituto: denominazione, codice meccanografico, comune, provincia, email istituzionale e, se indicati, sito e dirigente;",
        "del docente referente: nome, cognome, email, telefono e, se indicata, materia;",
        "degli altri docenti dell'istituto indicati dal referente: nome, cognome, email e, se indicate, classi seguite;",
        "il numero di studenti e classi che l'istituto prevede di coinvolgere;",
        "la registrazione dell'accettazione delle istruzioni per i docenti, con data e versione;",
        "le iscrizioni ai talk con gli esperti, se il docente si iscrive;",
        "le credenziali di accesso e i dati tecnici connessi al login.",
      ],
    },
    {
      h: "Perché li trattiamo",
      p: [
        "Per verificare l'adesione dell'istituto, creare e gestire l'accesso personale del docente, comunicare informazioni organizzative e dare assistenza. La base giuridica è l'esecuzione delle attività richieste con l'adesione dell'istituto e il legittimo interesse della Fondazione a gestire in sicurezza il percorso.",
        "Se il docente sceglie di ricevere comunicazioni sulle iniziative per le scuole, la base è il suo consenso, facoltativo e revocabile.",
      ],
    },
    {
      h: "Accesso alla piattaforma",
      p: [
        "Il docente referente e gli altri docenti dell'istituto che il referente indica dispongono ciascuno di credenziali personali e vedono soltanto gli studenti del proprio istituto, nei limiti indicati nell'informativa per gli studenti. Quando il referente indica un altro docente, l'istituto ne riceve notizia al proprio indirizzo email istituzionale e può chiederne la revoca in qualsiasi momento. Solo il referente può scaricare l'elenco dei confermati, senza email, e l'elenco minimo per foto e video dell'evento. Le credenziali non possono essere condivise e l'accesso viene disattivato al termine del corso.",
        "Istituto e Fondazione restano titolari autonomi per i trattamenti svolti nell'ambito delle rispettive attività: l'istituto non raccoglie per conto della Fondazione dati di iscrizione o consensi degli studenti.",
      ],
    },
    {
      h: "Chi può vedere i dati",
      p: [
        "Il personale autorizzato della Fondazione e i fornitori tecnici della piattaforma. Il docente referente vede nome, cognome, email e classi seguite dei docenti che ha indicato, e i docenti del progetto vedono nome e cognome dei colleghi. Nessuna diffusione.",
      ],
      ul: FORNITORI,
      dopo: [FORNITORI_NOTA],
    },
    {
      h: "Per quanto tempo",
      p: [
        "Dati e credenziali operativi sono cancellati o resi inutilizzabili entro un mese dalla conclusione del corso. Se il docente sceglie di ricevere newsletter e future iniziative, email e prova della scelta sono conservate per 24 mesi, salvo revoca anticipata.",
      ],
    },
    { h: "Diritti e contatti", p: DIRITTI },
  ],
};

export const REGOLAMENTO: Documento = {
  titoloPagina: "Regolamento di partecipazione | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Le regole per partecipare al percorso online gratuito Biotecnologie e Intelligenza Artificiale della Fondazione bioERGOtech.",
  occhiello: "Regolamento",
  titolo: "Regolamento di partecipazione",
  intro: "Percorso online «Biotecnologie e Intelligenza Artificiale».",
  aggiornato: "2026-10-13",
  sezioni: [
    {
      h: "1. Il percorso",
      p: [
        "Il percorso è gratuito, destinato agli studenti del triennio delle scuole secondarie di secondo grado che hanno almeno 14 anni, e comprende 21 lezioni online in 10 settimane su biologia e intelligenza artificiale, attività individuali o di gruppo e un progetto finale di squadra.",
      ],
    },
    {
      h: "2. Account personale",
      p: [
        "L'account è personale. Lo studente non deve condividere password, utilizzare account di altri o permettere a terzi di accedere ai propri contenuti.",
      ],
    },
    {
      h: "3. Uso corretto della piattaforma",
      p: ["Lo studente si impegna a:"],
      ul: [
        "usare un linguaggio rispettoso;",
        "non pubblicare dati personali di altre persone, materiale offensivo, illecito o non pertinente;",
        "non inserire nei testi informazioni sulla salute o altri dati personali propri o di persone reali;",
        "non copiare, diffondere o usare in modo improprio contenuti ed elaborati di altri partecipanti;",
        "chiedere assistenza a info@bioergotech.org in caso di problemi con l'account.",
      ],
      dopo: [
        "La Fondazione può sospendere o chiudere l'account in caso di uso illecito, non sicuro o gravemente contrario a queste regole, informando quando possibile lo studente e il docente referente.",
      ],
    },
    {
      h: "4. Docente referente",
      p: [
        "Il docente referente e gli altri docenti del proprio istituto da lui indicati possono vedere i dati indicati nell'informativa privacy, esclusivamente per seguire il percorso formativo degli studenti del proprio istituto.",
      ],
    },
    {
      h: "5. Mentor",
      p: [
        "Nell'area dello studente sono indicati i mentor del percorso e, per chi lo ha messo a disposizione, un contatto professionale. L'eventuale contatto con un mentor avviene su iniziativa autonoma dello studente e fuori dalla piattaforma. La Fondazione non comunica ai mentor i dati degli studenti e non organizza, non registra e non controlla email, video call o altri scambi tra studente e mentor.",
        "Lo studente non invia ai mentor dati personali non necessari e segnala a info@bioergotech.org eventuali situazioni inadeguate. I mentor sono tenuti a rispettare le linee guida per i mentor pubblicate dalla Fondazione.",
      ],
    },
    {
      h: "6. Elaborati e progetti",
      p: [
        "Elaborati e progetti servono a svolgere e valutare il percorso. I progetti consegnati sono letti dalla Commissione di valutazione, senza i nomi degli studenti, e i dieci migliori vengono presentati sul palco dell'evento del 10 dicembre 2026. La Fondazione non pubblica elaborati e progetti senza una specifica comunicazione e, se necessaria, una scelta separata dell'interessato.",
      ],
    },
    {
      h: "7. Chiusura del corso",
      p: [
        "Account e contenuti del corso sono cancellati o resi anonimi entro un mese dalla conclusione del percorso. Lo studente può chiedere in anticipo la chiusura dell'account scrivendo a info@bioergotech.org.",
      ],
    },
  ],
};

/* ── I due documenti che si sottoscrivono ─────────────────────────────── */

/**
 * «Adesione della scuola e accesso del docente referente». Lo firma il
 * dirigente scolastico. Il testo della presa d'atto è lo stesso che il
 * referente vede e accetta nel modulo online.
 */
export const ADESIONE_SCUOLA: Documento = {
  titoloPagina: "Adesione della scuola e accesso del docente referente | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Il modulo con cui l'istituto aderisce al percorso online Biotecnologie e Intelligenza Artificiale e indica il docente referente. Lo firma il dirigente scolastico.",
  occhiello: "Da firmare",
  titolo: "Adesione della scuola e accesso del docente referente",
  intro: "Percorso online «Biotecnologie e Intelligenza Artificiale».",
  aggiornato: "2026-10-13",
  modulo: {
    campiInizio: [
      "Istituto",
      "Codice istituto",
      "Docente referente",
      "Email istituzionale del docente",
      "Cellulare del docente",
    ],
    campiFine: ["Luogo e data", "Il dirigente scolastico o soggetto autorizzato", "Firma"],
  },
  sezioni: [
    {
      h: "Adesione",
      p: [
        "L'istituto aderisce al percorso gratuito «Biotecnologie e Intelligenza Artificiale» e indica il docente referente sopra riportato.",
      ],
    },
    {
      h: "L'istituto prende atto che",
      ul: [...PRESA_ATTO_ADESIONE],
      dopo: ["L'istituto dichiara di avere letto l'informativa privacy per scuole e docenti referenti."],
    },
  ],
};

/**
 * «Istruzioni per il docente referente e i docenti del progetto». Ogni
 * docente, referente compreso, le accetta sulla piattaforma al primo accesso,
 * prima di vedere i dati degli studenti; chi preferisce può anche firmarle.
 * Gli impegni sono gli stessi che vede nella sua area.
 *
 * `aggiornato` è anche la versione che si accetta (`licei_accettazioni`):
 * cambiarlo vuol dire che ogni docente le accetta di nuovo al prossimo
 * accesso, e finché non lo fa non vede dati. Si cambia quando cambia il
 * testo, come per gli altri documenti, e solo allora.
 */
export const ISTRUZIONI_DOCENTE: Documento = {
  titoloPagina: "Istruzioni per il docente referente e i docenti del progetto | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Gli impegni del docente referente e dei docenti del progetto che seguono sulla piattaforma gli studenti del proprio istituto nel percorso Biotecnologie e Intelligenza Artificiale.",
  occhiello: "Si accetta online",
  titolo: "Istruzioni per il docente referente e i docenti del progetto",
  intro:
    "Percorso online «Biotecnologie e Intelligenza Artificiale». Il docente referente, e ogni altro docente dell'istituto che il referente indica, riceve un accesso personale alla piattaforma per seguire gli studenti del proprio istituto.",
  aggiornato: "2026-10-13",
  modulo: {
    campiFine: ["Nome e cognome", "Istituto", "Data", "Firma"],
    nota: "Il docente accetta queste istruzioni sulla piattaforma al primo accesso, prima di vedere i dati degli studenti. Chi preferisce può anche firmarle e inviarle a info@bioergotech.org.",
  },
  sezioni: [
    {
      h: "Gli impegni del docente",
      p: ["Con l'accettazione delle istruzioni al primo accesso il docente si impegna a:"],
      ul: [...ISTRUZIONI_REFERENTE],
      dopo: [
        "Le credenziali sono personali.",
        "Il docente dichiara di avere letto l'informativa privacy per scuole e docenti referenti.",
      ],
    },
  ],
};

/* ── La pagina che li raccoglie ───────────────────────────────────────── */

export type VoceGuida = {
  titolo: string;
  href: string;
  /** Come si accetta: si legge, si firma su carta, si accetta online. */
  come: "Da leggere" | "Da firmare" | "Si accetta online";
  aggiornato?: string;
  passi: string[];
};

/**
 * Chi deve fare che cosa con ogni documento. Il primo gruppo è la «Guida
 * operativa per scuole e docenti referenti»: le stesse indicazioni, con un
 * solo cambio, il punto 3. La guida chiedeva l'accettazione delle istruzioni
 * prima dell'attivazione dell'account. L'account del referente nasce con
 * l'invio dell'adesione online, e quello di un collega con l'invito del
 * referente, ma la console non mostra alcun dato degli studenti finché il
 * docente non accetta le istruzioni al primo accesso (`requireDocente`):
 * l'accettazione viene prima di qualsiasi dato, e il punto 3 dice proprio
 * questo.
 */
export const GUIDA_DOCUMENTI: { gruppo: string; sommario: string; voci: VoceGuida[] }[] = [
  {
    gruppo: "Per le scuole e i docenti referenti",
    sommario: "I documenti che la scuola e il docente referente devono gestire.",
    voci: [
      {
        titolo: "Informativa privacy per scuole e docenti referenti",
        href: INFORMATIVA_SCUOLE_PATH,
        come: "Da leggere",
        aggiornato: INFORMATIVA_SCUOLE.aggiornato,
        passi: [
          "Leggerla e conservarne una copia: spiega il trattamento dei dati della scuola e del docente referente.",
          "Non richiede una firma separata: la presa visione è richiamata nel modulo di adesione.",
        ],
      },
      {
        titolo: "Adesione della scuola e accesso del docente referente",
        href: ADESIONE_SCUOLA_PATH,
        come: "Da firmare",
        aggiornato: ADESIONE_SCUOLA.aggiornato,
        passi: [
          "Compilare i dati dell'istituto e del docente referente: istituto, codice istituto, nominativo, email istituzionale e cellulare.",
          "Far firmare il modulo al dirigente scolastico o a un soggetto autorizzato dall'istituto.",
          "Inviare la copia firmata a info@bioergotech.org.",
        ],
      },
      {
        titolo: "Istruzioni per il docente referente e i docenti del progetto",
        href: ISTRUZIONI_DOCENTE_PATH,
        come: "Si accetta online",
        aggiornato: ISTRUZIONI_DOCENTE.aggiornato,
        passi: [
          "Il docente legge le regole su credenziali personali, riservatezza e accesso ai soli studenti del proprio istituto.",
          "Il docente le accetta sulla piattaforma al primo accesso: finché non lo fa, non vede i dati degli studenti. Lo stesso vale per gli altri docenti indicati dal referente.",
          "Chi preferisce può anche firmarle e inviarle a info@bioergotech.org.",
        ],
      },
    ],
  },
  {
    gruppo: "Per gli studenti",
    sommario:
      "Lo studente li legge e li accetta da sé, nel modulo di iscrizione. Per il corso non serve la firma dei genitori: dai 14 anni lo studente si iscrive da sé.",
    voci: [
      {
        titolo: "Informativa privacy per studenti",
        href: INFORMATIVA_STUDENTI_PATH,
        come: "Si accetta online",
        aggiornato: INFORMATIVA_STUDENTI.aggiornato,
        passi: ["Lo studente conferma di averla letta quando si iscrive."],
      },
      {
        titolo: "Regolamento di partecipazione",
        href: REGOLAMENTO_PATH,
        come: "Si accetta online",
        aggiornato: REGOLAMENTO.aggiornato,
        passi: ["Lo studente lo accetta quando si iscrive."],
      },
    ],
  },
  {
    gruppo: "Per l'evento e i mentor",
    sommario: "Valgono per tutto il percorso, licei e università.",
    voci: [
      {
        titolo: "Informativa su foto e video dell'evento",
        href: INFORMATIVA_IMMAGINI_PATH,
        come: "Da leggere",
        passi: [
          "Il modulo con le scelte su foto e video si scarica dall'area del docente referente. Lo firmano i genitori, o lo studente se maggiorenne, e resta agli atti della scuola: non va inviato alla Fondazione.",
        ],
      },
      {
        titolo: "Linee guida per i mentor",
        href: LINEE_GUIDA_MENTOR_PATH,
        come: "Si accetta online",
        aggiornato: DOCUMENTO_LINEE_GUIDA_MENTOR.aggiornato,
        passi: ["I mentor le accettano online, prima che il loro contatto sia mostrato agli studenti."],
      },
    ],
  },
];
