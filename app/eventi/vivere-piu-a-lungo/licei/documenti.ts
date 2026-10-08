/**
 * I tre documenti pubblici del percorso licei: informativa per gli studenti,
 * informativa per scuole e docenti referenti, regolamento di partecipazione.
 *
 * Partono dai documenti privacy preparati per il corso, corretti dove
 * descrivevano una piattaforma diversa da quella reale: qui sono elencati i
 * dati che il sito raccoglie davvero e tutti quelli che li vedono, Commissione,
 * staff e fornitori tecnici compresi. Chi cambia quello che il portale
 * raccoglie o mostra deve aggiornare anche questi testi: un'informativa che
 * descrive un'altra piattaforma non informa nessuno.
 */

export type SezioneDoc = {
  h: string;
  p?: string[];
  ul?: string[];
  /** Paragrafi dopo l'elenco. */
  dopo?: string[];
};

export type Documento = {
  titoloPagina: string;
  descrizione: string;
  occhiello: string;
  titolo: string;
  intro: string;
  sezioni: SezioneDoc[];
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
        "Durante il corso registriamo le lezioni completate, le riflessioni e le domande che invii nelle lezioni, la squadra di cui fai parte con il tuo ruolo, il progetto della squadra (titolo, ambito, testi ed eventuale link ai materiali) e alcuni dati tecnici di accesso, come la data dell'ultimo accesso.",
        "Nei testi del progetto e nelle riflessioni non inserire informazioni sulla salute o altri dati personali tuoi o di persone reali: non servono al percorso.",
      ],
    },
    {
      h: "Perché li usiamo e su quale base",
      p: [
        "Per creare il tuo account, farti seguire le 12 lezioni, gestire squadre e progetti, far valutare i progetti dalla Commissione e selezionare i finalisti, rispondere alle tue domande, darti assistenza e mantenere sicura la piattaforma.",
        "La base giuridica è il consenso che esprimi con l'iscrizione, che a partire dai 14 anni puoi dare da solo per i servizi online (art. 2-quinquies del Codice privacy). Puoi ritirarlo in qualsiasi momento, con la conseguente chiusura dell'account. Per la sicurezza della piattaforma e la gestione degli accessi la base è il legittimo interesse della Fondazione.",
        "Puoi scegliere separatamente di ricevere la newsletter e informazioni su future iniziative: è facoltativo, non è mai preselezionato e non incide sulla partecipazione.",
        "Nessuna decisione che ti riguarda è presa in modo automatico: i progetti sono valutati da persone.",
      ],
    },
    {
      h: "Chi può vedere i dati",
      ul: [
        "Tu, che vedi i dati e i contenuti del tuo account.",
        "Il docente referente del tuo istituto, con credenziali personali: vede nome, cognome, email, classe, stato dell'iscrizione, se sei entrato nel corso e quante lezioni hai completato, la tua squadra e il progetto della squadra. Li usa solo per seguire il percorso formativo e non vede gli studenti di altri istituti.",
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
        "La piattaforma non ha una chat o messaggi tra utenti. Le domande che invii nelle lezioni le legge e le risponde lo staff della Fondazione.",
        "La Fondazione non organizza video call e non comunica a mentor dati degli studenti. Se scegli di contattare autonomamente un mentor, il contatto avviene fuori dalla piattaforma e sotto la responsabilità di chi partecipa alla comunicazione: la Fondazione non riceve, non conserva e non registra messaggi o call tra studente e mentor.",
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
  sezioni: [
    {
      h: "Dati trattati",
      ul: [
        "dell'istituto: denominazione, codice meccanografico, comune, provincia, email istituzionale e, se indicati, sito e dirigente;",
        "del docente referente: nome, cognome, email, telefono e, se indicata, materia;",
        "il numero di studenti e classi che l'istituto prevede di coinvolgere;",
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
        "Il docente referente dispone di credenziali personali e vede soltanto gli studenti del proprio istituto, nei limiti indicati nell'informativa per gli studenti. Può scaricare l'elenco dei confermati, senza email, e l'elenco minimo per foto e video dell'evento. Le credenziali non possono essere condivise e l'accesso viene disattivato al termine del corso.",
        "Istituto e Fondazione restano titolari autonomi per i trattamenti svolti nell'ambito delle rispettive attività: l'istituto non raccoglie per conto della Fondazione dati di iscrizione o consensi degli studenti.",
      ],
    },
    {
      h: "Chi può vedere i dati",
      p: [
        "Il personale autorizzato della Fondazione e i fornitori tecnici della piattaforma. Nessuna diffusione.",
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
  sezioni: [
    {
      h: "1. Il percorso",
      p: [
        "Il percorso è gratuito, destinato agli studenti del triennio delle scuole secondarie di secondo grado che hanno almeno 14 anni, e comprende 12 lezioni su biologia e intelligenza artificiale, attività individuali o di gruppo e un progetto finale di squadra.",
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
        "Il docente referente del proprio istituto può vedere i dati indicati nell'informativa privacy, esclusivamente per seguire il percorso formativo degli studenti del proprio istituto.",
      ],
    },
    {
      h: "5. Mentor",
      p: [
        "L'eventuale contatto con un mentor avviene su iniziativa autonoma dello studente e fuori dalla piattaforma. La Fondazione non organizza, non registra e non controlla email, video call o altri scambi tra studente e mentor.",
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
