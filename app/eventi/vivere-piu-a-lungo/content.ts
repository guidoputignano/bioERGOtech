/**
 * Punto UNICO di configurazione del modulo evento.
 *
 * Tutto ciò che cambia tra un'edizione e l'altra (date, orari, luoghi,
 * capienze, relatori, modalità archivio) vive qui. Non serve cercare nel
 * markup. Le capienze qui sono la fonte di verità per il display. La
 * migrazione SQL semina le stesse capienze nella tabella event_sessions,
 * che resta la fonte di verità per il conteggio dei posti a runtime.
 *
 * Per archiviare l'evento dopo la sua conclusione, imposta ARCHIVE_MODE a
 * true. I form spariscono, resta il recap, e nessun dato viene cancellato.
 */

/** Quando true, nasconde i form di iscrizione e mostra il riepilogo. */
export const ARCHIVE_MODE = false;

/** Slug della rotta pubblica. Usato per costruire URL assoluti e link email. */
export const EVENT_SLUG = "vivere-piu-a-lungo";

/** URL base del sito, per link nelle email e nei dati strutturati. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.bioergotech.org";

export const EVENT = {
  occhiello: "Fondazione bioERGOtech . Taranto",
  titolo: "Vivere più a lungo: sport e intelligenza artificiale",
  sottotitolo:
    "Due giornate di confronto su come lo sport, la robotica e l'intelligenza artificiale possono allungare e migliorare la vita, con scienziati, medici, campioni dello sport e le nuove idee dei ragazzi e delle startup.",
  tagline:
    "Due giornate, un unico obiettivo: mettere insieme scienza, sport, giovani e impresa per vivere più a lungo e meglio.",
  organizzatore: "Fondazione bioERGOtech",
  citta: "Taranto",
  /** Etichette pronte per l'uso nei box informativi dell'hero. */
  dataLabel: "10 e 11 dicembre 2026",
  orarioLabel: "Giorno 1: 9:00 . 16:00. Giorno 2: 9:00 . 13:00",
  luogoLabel: "Giorno 1: PalaMazzola, Taranto. Giorno 2: Teatro Fusco, Taranto",
  /** Date ISO per i dati strutturati schema.org Event. */
  startDateISO: "2026-12-10T09:00:00+01:00",
  endDateISO: "2026-12-11T13:00:00+01:00",
  /** Immagine Open Graph dedicata (riusa un asset già presente nel sito). */
  ogImage: "/assets/images/Home/Automation.webp",
} as const;

export type SessionSlug =
  | "giorno-1"
  | "giorno-2";

export type EventSession = {
  slug: SessionSlug;
  titolo: string;
  giorno: 1 | 2;
  giornoLabel: string;
  dataLabel: string;
  orario: string;
  luogo: string;
  /** Capienza massima. Modificabile qui, seminata nella migrazione SQL. */
  capienza: number;
  descrizione: string;
};

/** Le "avenue" iscrivibili. Un iscritto può sceglierne una o più. */
export const SESSIONS: EventSession[] = [
  {
    slug: "giorno-1",
    titolo: "Giorno 1. Panel, progetti dei ragazzi e concerto",
    giorno: 1,
    giornoLabel: "Giovedì 10 dicembre",
    dataLabel: "10 dicembre 2026",
    orario: "9:00 . 16:00",
    luogo: "PalaMazzola, Taranto",
    capienza: 300,
    descrizione:
      "Una giornata al PalaMazzola. Sette panel su sport, salute, robotica e intelligenza artificiale si alternano ai progetti dei ragazzi: dieci gruppi in gara presentano le loro idee davanti a una commissione. Nel pomeriggio, il concerto aperto al pubblico.",
  },
  {
    slug: "giorno-2",
    titolo: "Giorno 2. Showcase di innovazione e premiazione",
    giorno: 2,
    giornoLabel: "Venerdì 11 dicembre",
    dataLabel: "11 dicembre 2026",
    orario: "9:00 . 13:00",
    luogo: "Teatro Fusco, Taranto",
    capienza: 150,
    descrizione:
      "Al Teatro Fusco, uno showcase di innovazione con startup, spin-off universitari, centri di ricerca e progetti del territorio. A seguire la premiazione con tre premi e il concerto di chiusura.",
  },
];

export const sessionBySlug = (slug: string): EventSession | undefined =>
  SESSIONS.find((s) => s.slug === slug);

/** Categorie di iscritto. value finisce nel database, label è per la UI. */
export const CATEGORIE = [
  { value: "studente", label: "Studente" },
  { value: "scuola_docente", label: "Scuola / Docente referente" },
  { value: "autorita", label: "Autorità / Istituzione" },
  { value: "startup", label: "Startup" },
  { value: "investitore_partner", label: "Investitore / Partner" },
  { value: "pubblico", label: "Pubblico generale" },
] as const;

export type CategoriaValue = (typeof CATEGORIE)[number]["value"];

export const categoriaLabel = (value: string): string =>
  CATEGORIE.find((c) => c.value === value)?.label ?? value;

/** Testo del consenso marketing, registrato a database con timestamp. */
export const CONSENSO_MARKETING_TESTO =
  "Acconsento a ricevere comunicazioni e materiale informativo della Fondazione bioERGOtech sulle sue iniziative, eventi e attività. Potrò revocare il consenso in qualsiasi momento.";

export const CONSENSO_PRIVACY_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali per la gestione dell'iscrizione e dell'evento.";

/* ── Contenuti di sola presentazione (programma, stats, perché, FAQ) ── */

/** Cartella delle foto relatori (già ottimizzate in webp 480x480). */
const SPEAKER_IMG = "/assets/images/eventi/vivere-piu-a-lungo";

export type Relatore = {
  /** Chiave stabile, usata per agganciare il relatore alla voce di programma. */
  id: string;
  nome: string;
  ruolo: string;
  img: string;
  /**
   * Chi non ha ancora autorizzato l'uso di nome e foto. La scheda resta qui,
   * completa, ma la persona non compare da nessuna parte sulla pagina: niente
   * volto nel panel, niente nome in riga, fuori dal contatore e fuori dai dati
   * strutturati. Quando l'autorizzazione arriva basta togliere questa riga.
   */
  daAutorizzare?: boolean;
};

/**
 * Anagrafica dei relatori con foto. È un registro a chiave: l'ordine di questo
 * array non decide nulla a schermo, serve solo a tenerlo leggibile, e infatti
 * lo teniamo nell'ordine in cui salgono sul palco.
 *
 * Chi appare dove lo decide PROGRAMMA_GIORNO1: ogni voce elenca gli `id` dei
 * suoi relatori nel campo `relatori`, e la pagina mostra i volti dentro la card
 * del panel, in quell'ordine. Per spostare qualcuno da un panel a un altro
 * basta spostare il suo `id` là sotto, senza toccare questo array.
 *
 * Questo è il registro completo, autorizzati e non. Quello che la pagina
 * pubblica è RELATORI_PUBBLICI, qui sotto.
 */
export const RELATORI: Relatore[] = [
  { id: "piovella", nome: "Franco Piovella", ruolo: "Angiologo, malattie tromboemboliche", img: `${SPEAKER_IMG}/franco-piovella.webp` },
  { id: "abbagnale", nome: "Agostino Abbagnale", ruolo: "Campione olimpico di canottaggio", img: `${SPEAKER_IMG}/agostino-abbagnale.webp`, daAutorizzare: true },
  { id: "mandelli", nome: "Andrea Mandelli", ruolo: "Presidente FOFI, Ordine dei Farmacisti", img: `${SPEAKER_IMG}/andrea-mandelli.webp` },
  { id: "loizzo", nome: "On. Simona Loizzo", ruolo: "Camera dei Deputati", img: `${SPEAKER_IMG}/simona-loizzo.webp` },
  { id: "montervino", nome: "Francesco Montervino", ruolo: "Ex capitano del Napoli", img: `${SPEAKER_IMG}/francesco-montervino.webp` },
  { id: "siciliano", nome: "Bruno Siciliano", ruolo: "Robotica, Università Federico II", img: `${SPEAKER_IMG}/bruno-siciliano.webp` },
  { id: "tari", nome: "Mariangela Tarì", ruolo: "Scrittrice, presidente de La casa di Sofia", img: `${SPEAKER_IMG}/mariangela-tari.webp` },
  { id: "marotto", nome: "Daniela Marotto", ruolo: "Reumatologa, Collegio Reumatologi Italiani", img: `${SPEAKER_IMG}/daniela-marotto.webp` },
  { id: "montano", nome: "Aldo Montano", ruolo: "Campione olimpico di scherma", img: `${SPEAKER_IMG}/aldo-montano.webp` },
  { id: "bortuzzo", nome: "Manuel Bortuzzo", ruolo: "Nuotatore paralimpico, bronzo a Parigi 2024", img: `${SPEAKER_IMG}/manuel-bortuzzo.webp` },
  { id: "schettini", nome: "Vincenzo Schettini", ruolo: "Divulgatore, La fisica che ci piace", img: `${SPEAKER_IMG}/vincenzo-schettini.webp` },
  { id: "raffaeli", nome: "Sofia Raffaeli", ruolo: "Campionessa mondiale di ginnastica ritmica", img: `${SPEAKER_IMG}/sofia-raffaeli.webp`, daAutorizzare: true },
  { id: "franchini", nome: "Mario Franchini", ruolo: "Oncologo", img: `${SPEAKER_IMG}/mario-franchini.webp` },
  { id: "galante", nome: "Fabio Galante", ruolo: "Ex difensore di Inter e Torino", img: `${SPEAKER_IMG}/fabio-galante.webp` },
];

/**
 * Il programma della mattina del giorno 1, come sequenza. Sette panel da circa
 * 25 minuti (dialogo sul tema, senza slide) si alternano ai blocchi di
 * presentazione dei ragazzi, al coffee break e alla proclamazione, fino al
 * concerto. Qui pubblichiamo temi, protagonisti e ritmo, non gli orari
 * puntuali: la fonte di verità resta il piano interno.
 *
 * `tipo` distingue i panel (nodo numerato) dalle voci di raccordo (nodo con
 * icona). `relatori` elenca gli `id` di RELATORI che salgono sul palco in
 * quella voce, `ospiti` i nomi senza foto (gruppi, squadre, istituzioni).
 */
export type ProgrammaVoce = {
  tipo: "apertura" | "panel" | "ragazzi" | "pausa" | "premiazione" | "lunch" | "concerto";
  n?: number;
  icona?: string;
  titolo: string;
  desc: string;
  relatori?: string[];
  ospiti?: string[];
};

export const PROGRAMMA_GIORNO1: ProgrammaVoce[] = [
  {
    tipo: "apertura",
    icona: "fa-handshake",
    titolo: "Apertura e saluti istituzionali",
    desc: "Benvenuto, presentazione della giornata e della gara dei ragazzi.",
    ospiti: ["Comitato organizzatore", "Istituzioni"],
  },
  {
    tipo: "panel",
    n: 1,
    titolo: "Salute, prevenzione e sport",
    desc: "Come si riconosce e si previene il rischio tromboembolico, e che cosa cambia quando il corpo è quello di chi si allena ogni giorno. Dalla diagnosi precoce alle abitudini che proteggono la circolazione, anche lontano dall'agonismo.",
    relatori: ["piovella", "abbagnale"],
  },
  {
    tipo: "panel",
    n: 2,
    titolo: "Regole, professioni e istituzioni",
    desc: "Chi custodisce i dati sanitari, chi scrive le regole e come sta cambiando il lavoro di chi sta accanto al paziente. Un confronto tra ordine professionale e legislatore su ciò che serve perché innovazione e tutela della persona procedano insieme.",
    relatori: ["mandelli", "loizzo"],
  },
  {
    tipo: "ragazzi",
    icona: "fa-users",
    titolo: "Progetti dei ragazzi, primo blocco",
    desc: "I gruppi da 1 a 4 sul palco: tre minuti a testa, due di pitch e uno di domande.",
  },
  {
    tipo: "panel",
    n: 3,
    titolo: "Il gesto atletico e la macchina",
    desc: "Che cosa impara un robot osservando un atleta, e che cosa impara un atleta dalla misura del proprio movimento. Equilibrio, coordinazione e tempi di reazione letti dalla robotica, fino ai limiti che la macchina ancora non supera.",
    relatori: ["montervino", "siciliano"],
  },
  {
    tipo: "panel",
    n: 4,
    titolo: "Sport, disabilità e inclusione",
    desc: "Che cosa succede quando una squadra si apre davvero: autonomia, fiducia e legami che nascono in campo prima che nei percorsi di cura. Le esperienze di chi accompagna ragazzi con disabilità, raccontate da chi le vive ogni giorno.",
    relatori: ["tari"],
    ospiti: ["Squadra Insuperabili", "Ragazzi de La casa di Sofia"],
  },
  {
    tipo: "pausa",
    icona: "fa-mug-hot",
    titolo: "Coffee break",
    desc: "Pausa e networking per pubblico e partecipanti.",
  },
  {
    tipo: "ragazzi",
    icona: "fa-users",
    titolo: "Progetti dei ragazzi, secondo blocco",
    desc: "I gruppi da 5 a 7, con lo stesso format del primo blocco.",
  },
  {
    tipo: "panel",
    n: 5,
    titolo: "Il corpo che si rigenera",
    desc: "Il percorso che porta dall'infortunio o dalla diagnosi al ritorno in attività: tempi reali, terapie e la parte meno visibile del recupero, quella mentale. Reumatologia e testimonianze sportive a confronto su che cosa significa ricominciare.",
    relatori: ["marotto", "montano", "bortuzzo"],
  },
  {
    tipo: "panel",
    n: 6,
    titolo: "Scienza, tecnologia e nuove generazioni",
    desc: "Come si accende la curiosità scientifica e come si tiene viva quando lo studio si fa difficile. Divulgazione, disciplina e talento: che cosa serve davvero ai ragazzi per costruirsi un percorso, dentro e fuori dall'aula.",
    relatori: ["schettini", "raffaeli"],
  },
  {
    tipo: "ragazzi",
    icona: "fa-users",
    titolo: "Progetti dei ragazzi, terzo blocco",
    desc: "I gruppi da 8 a 10 chiudono la gara.",
  },
  {
    tipo: "panel",
    n: 7,
    titolo: "Vivere più a lungo",
    desc: "Il tema che dà il titolo alla giornata: quanto pesano davvero prevenzione, movimento e diagnosi precoce sugli anni che viviamo e su come li viviamo. Oncologia e sport si incontrano sulle scelte quotidiane che fanno la differenza.",
    relatori: ["franchini", "galante"],
  },
  {
    tipo: "premiazione",
    icona: "fa-trophy",
    titolo: "Proclamazione del gruppo vincitore",
    desc: "La commissione valuta i dieci progetti, premia il gruppo vincitore e si chiude con le foto ufficiali.",
  },
  {
    tipo: "lunch",
    icona: "fa-utensils",
    titolo: "Lunch",
    desc: "Riservato ai soli invitati: relatori, ospiti, partner e sponsor.",
  },
  {
    tipo: "concerto",
    icona: "fa-music",
    titolo: "Concerto al PalaMazzola",
    desc: "Momento musicale aperto al pubblico presente. Artista da definire.",
  },
];

/** Etichetta sopra il titolo per le voci che non sono panel numerati. */
export const ETICHETTA_VOCE: Record<ProgrammaVoce["tipo"], string> = {
  apertura: "Apertura",
  panel: "Panel",
  ragazzi: "Ragazzi",
  pausa: "Pausa",
  premiazione: "Premiazione",
  lunch: "Lunch",
  concerto: "Concerto",
};

/**
 * I relatori che possiamo pubblicare. È l'unica lista che la pagina deve usare:
 * volti nei panel, nomi in riga, contatore delle stats e `performer` nei dati
 * strutturati passano tutti di qui, così un nome non autorizzato non può
 * sfuggire da una sola di quelle strade.
 */
export const RELATORI_PUBBLICI = RELATORI.filter((r) => !r.daAutorizzare);

// Costruita sui soli autorizzati: un id in attesa non risolve, e la voce di
// programma che lo cita mostra semplicemente gli altri.
const RELATORE_BY_ID = new Map(RELATORI_PUBBLICI.map((r) => [r.id, r]));

/** I relatori con foto di una voce, risolti dagli id. Alimentano i volti nei panel. */
export const relatoriVoce = (v: ProgrammaVoce): Relatore[] =>
  (v.relatori ?? [])
    .map((id) => RELATORE_BY_ID.get(id))
    .filter((r): r is Relatore => Boolean(r));

/** Nomi in riga, per le voci di raccordo che non mostrano i volti. */
export const nomiVoce = (v: ProgrammaVoce): string[] => [
  ...relatoriVoce(v).map((r) => r.nome),
  ...(v.ospiti ?? []),
];

/** Moderatrice del giorno 1 al PalaMazzola. Foto nella stessa cartella dei relatori. */
export const MODERATRICE = {
  nome: "Simona Rolandi",
  ruolo: "Giornalista Rai. Modera la prima giornata al PalaMazzola.",
  img: `${SPEAKER_IMG}/simona-rolandi.webp`,
};

/** Panel e relatori sono contati dai dati, così non divergono dal programma. */
export const STATS = [
  { num: "2", label: "Giornate" },
  { num: String(PROGRAMMA_GIORNO1.filter((v) => v.tipo === "panel").length), label: "Panel" },
  { num: String(RELATORI_PUBBLICI.length), label: "Relatori e ospiti" },
  { num: "10", label: "Progetti dei ragazzi" },
  { num: "3", label: "Premi" },
];

export const PERCHE_PARTECIPARE = [
  {
    icona: "fa-graduation-cap",
    titolo: "Per gli studenti",
    desc: "Incontri scienziati e campioni e presenti il tuo progetto davanti a una commissione e al pubblico.",
  },
  {
    icona: "fa-school",
    titolo: "Per le scuole",
    desc: "Porti la tua classe a contatto con ricerca, robotica e IA applicate alla vita reale.",
  },
  {
    icona: "fa-rocket",
    titolo: "Per le startup",
    desc: "Porti la tua startup, spin-off o progetto nello showcase di innovazione, davanti a investitori, partner e istituzioni.",
  },
  {
    icona: "fa-landmark",
    titolo: "Per le istituzioni",
    desc: "Partecipi a un confronto pubblico su salute, sport, giovani e innovazione del territorio.",
  },
];

export const FAQ = [
  {
    q: "Quando e dove si svolge l'evento?",
    a: "L'evento si tiene il 10 e l'11 dicembre 2026 a Taranto. Il giorno 1 al PalaMazzola, il giorno 2 al Teatro Fusco.",
  },
  {
    q: "Quanto costa partecipare?",
    a: "La partecipazione è gratuita. L'iscrizione è obbligatoria perché i posti sono limitati.",
  },
  {
    q: "A chi è rivolto?",
    a: "A studenti, scuole, autorità, startup, investitori, partner e al pubblico generale interessato a sport, salute e intelligenza artificiale.",
  },
  {
    q: "Posso iscrivermi a una sola giornata?",
    a: "Sì. Puoi scegliere una o più sessioni. Per ciascuna sessione vale la capienza disponibile.",
  },
  {
    q: "Come funziona il check-in in loco?",
    a: "Dopo l'iscrizione ricevi un'email di conferma con un codice e un QR code. Al desk lo mostri allo staff per il check-in della sessione.",
  },
];
