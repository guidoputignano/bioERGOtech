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

/** Cartella delle foto relatori (già ottimizzate in webp). */
const SPEAKER_IMG = "/assets/images/eventi/vivere-piu-a-lungo";

/**
 * Anagrafica di relatori e ospiti, indicizzata per id. Qui non c'è ordine: la
 * sequenza con cui compaiono in pagina la decide il programma, così l'elenco
 * pubblicato non può divergere dalla scaletta.
 *
 * `img` è una foto quadrata 480x480 in webp. Quando l'ospite è un gruppo e non
 * una persona, al posto della foto usiamo `icona` (Font Awesome).
 */
const ANAGRAFICA = {
  "franco-piovella": {
    nome: "Franco Piovella",
    ruolo: "Angiologo, malattie tromboemboliche",
    img: `${SPEAKER_IMG}/franco-piovella.webp`,
  },
  "agostino-abbagnale": {
    nome: "Agostino Abbagnale",
    ruolo: "Tre volte campione olimpico di canottaggio",
    img: `${SPEAKER_IMG}/agostino-abbagnale.webp`,
  },
  "andrea-mandelli": {
    nome: "Andrea Mandelli",
    ruolo: "Presidente FOFI, Federazione degli Ordini dei Farmacisti",
    img: `${SPEAKER_IMG}/andrea-mandelli.webp`,
  },
  "simona-loizzo": {
    nome: "On. Simona Loizzo",
    ruolo: "Camera dei Deputati, Commissione Affari sociali",
    img: `${SPEAKER_IMG}/simona-loizzo.webp`,
  },
  "francesco-montervino": {
    nome: "Francesco Montervino",
    ruolo: "Ex capitano del Napoli",
    img: `${SPEAKER_IMG}/francesco-montervino.webp`,
  },
  "bruno-siciliano": {
    nome: "Bruno Siciliano",
    ruolo: "Robotica, Università Federico II",
    img: `${SPEAKER_IMG}/bruno-siciliano.webp`,
  },
  "mariangela-tari": {
    nome: "Mariangela Tarì",
    ruolo: "Scrittrice, presidente de La casa di Sofia",
    img: `${SPEAKER_IMG}/mariangela-tari.webp`,
  },
  insuperabili: {
    nome: "Squadra Insuperabili",
    ruolo: "Scuola di calcio per ragazzi con disabilità",
    icona: "fa-futbol",
  },
  "daniela-marotto": {
    nome: "Daniela Marotto",
    ruolo: "Reumatologa, Collegio Reumatologi Italiani",
    img: `${SPEAKER_IMG}/daniela-marotto.webp`,
  },
  "aldo-montano": {
    nome: "Aldo Montano",
    ruolo: "Campione olimpico di sciabola",
    img: `${SPEAKER_IMG}/aldo-montano.webp`,
  },
  "manuel-bortuzzo": {
    nome: "Manuel Bortuzzo",
    ruolo: "Nuotatore paralimpico, bronzo a Parigi 2024",
    img: `${SPEAKER_IMG}/manuel-bortuzzo.webp`,
  },
  "vincenzo-schettini": {
    nome: "Vincenzo Schettini",
    ruolo: "Divulgatore scientifico, La fisica che ci piace",
    img: `${SPEAKER_IMG}/vincenzo-schettini.webp`,
  },
  "sofia-raffaeli": {
    nome: "Sofia Raffaeli",
    ruolo: "Campionessa mondiale di ginnastica ritmica",
    img: `${SPEAKER_IMG}/sofia-raffaeli.webp`,
  },
  "mario-franchini": {
    nome: "Mario Franchini",
    ruolo: "Oncologo medico",
    img: `${SPEAKER_IMG}/mario-franchini.webp`,
  },
  "fabio-galante": {
    nome: "Fabio Galante",
    ruolo: "Ex difensore di Inter, Torino e Livorno",
    img: `${SPEAKER_IMG}/fabio-galante.webp`,
  },
} as const satisfies Record<string, { nome: string; ruolo: string; img?: string; icona?: string }>;

/** Chiavi valide per collegare una persona a una voce del programma. */
export type RelatoreId = keyof typeof ANAGRAFICA;

/**
 * Il programma del giorno 1, come sequenza. Sette panel da circa 25 minuti
 * (dialogo sul tema, senza slide) si alternano ai blocchi di presentazione dei
 * ragazzi, al coffee break e alla premiazione, fino al lunch e al concerto.
 * Qui pubblichiamo temi, persone e ritmo, non gli orari puntuali: la fonte di
 * verità sugli orari resta il piano interno.
 *
 * `tipo` distingue i panel (nodo numerato in tinta) dalle voci di raccordo
 * (nodo con icona ed etichetta `kicker`). `relatori` elenca chi è sul palco;
 * `con` copre i casi in cui a partecipare non è una persona con foto.
 */
export type ProgrammaVoce = {
  tipo: "panel" | "raccordo";
  /** Numero del panel. Solo per `tipo: "panel"`. */
  n?: number;
  /** Icona del nodo. Solo per `tipo: "raccordo"`. */
  icona?: string;
  /** Etichetta sopra il titolo. Solo per `tipo: "raccordo"`. */
  kicker?: string;
  titolo: string;
  desc: string;
  relatori?: RelatoreId[];
  con?: string;
};

export const PROGRAMMA_GIORNO1: ProgrammaVoce[] = [
  {
    tipo: "raccordo",
    icona: "fa-flag",
    kicker: "Apertura",
    titolo: "Apertura e saluti istituzionali",
    desc: "Benvenuto, presentazione della giornata e della gara dei ragazzi.",
    con: "Comitato organizzatore e istituzioni",
  },
  {
    tipo: "panel",
    n: 1,
    titolo: "Salute, prevenzione e sport",
    desc: "Trombosi, prevenzione e vita dell'atleta.",
    relatori: ["franco-piovella", "agostino-abbagnale"],
  },
  {
    tipo: "panel",
    n: 2,
    titolo: "Regole, professioni e istituzioni",
    desc: "Normativa, dati sanitari e ruolo delle professioni.",
    relatori: ["andrea-mandelli", "simona-loizzo"],
  },
  {
    tipo: "raccordo",
    icona: "fa-users",
    kicker: "Ragazzi, primo blocco",
    titolo: "Progetti dei gruppi 1-4",
    desc: "Quattro presentazioni da tre minuti: due di pitch e uno di domande.",
    con: "Gruppi 1-4 e commissione",
  },
  {
    tipo: "panel",
    n: 3,
    titolo: "Il gesto atletico e la macchina",
    desc: "Confronto tra sport e robotica.",
    relatori: ["francesco-montervino", "bruno-siciliano"],
  },
  {
    tipo: "panel",
    n: 4,
    titolo: "Sport, disabilità e inclusione",
    desc: "Come lo sport aiuta i ragazzi con disabilità.",
    relatori: ["mariangela-tari", "insuperabili"],
  },
  {
    tipo: "raccordo",
    icona: "fa-mug-hot",
    kicker: "Pausa",
    titolo: "Coffee break",
    desc: "Stacco e networking per pubblico e partecipanti.",
    con: "Tutti",
  },
  {
    tipo: "raccordo",
    icona: "fa-users",
    kicker: "Ragazzi, secondo blocco",
    titolo: "Progetti dei gruppi 5-7",
    desc: "Tre presentazioni da tre minuti, stesso format del primo blocco.",
    con: "Gruppi 5-7 e commissione",
  },
  {
    tipo: "panel",
    n: 5,
    titolo: "Il corpo che si rigenera",
    desc: "Reumatologia, recupero e ritorno alla performance.",
    relatori: ["daniela-marotto", "aldo-montano", "manuel-bortuzzo"],
  },
  {
    tipo: "panel",
    n: 6,
    titolo: "Scienza, tecnologia e nuove generazioni",
    desc: "Divulgazione, talento e formazione dei ragazzi.",
    relatori: ["vincenzo-schettini", "sofia-raffaeli"],
  },
  {
    tipo: "raccordo",
    icona: "fa-users",
    kicker: "Ragazzi, terzo blocco",
    titolo: "Progetti dei gruppi 8-10",
    desc: "Ultime tre presentazioni da tre minuti.",
    con: "Gruppi 8-10 e commissione",
  },
  {
    tipo: "panel",
    n: 7,
    titolo: "Vivere più a lungo",
    desc: "Oncologia, longevità e sport.",
    relatori: ["mario-franchini", "fabio-galante"],
  },
  {
    tipo: "raccordo",
    icona: "fa-trophy",
    kicker: "Premiazione",
    titolo: "Deliberazione e proclamazione del gruppo vincitore",
    desc: "Verdetto della commissione sui dieci gruppi, premiazione e foto ufficiali.",
    con: "Commissione, i dieci gruppi e il Comitato",
  },
  {
    tipo: "raccordo",
    icona: "fa-person-walking",
    kicker: "Trasferimento",
    titolo: "Deflusso verso il lunch",
    desc: "Spazio di recupero sui tempi e spostamento verso il lunch.",
    con: "Tutti",
  },
  {
    tipo: "raccordo",
    icona: "fa-utensils",
    kicker: "Lunch",
    titolo: "Lunch su invito",
    desc: "Riservato ai soli invitati.",
    con: "Relatori, ospiti, partner e sponsor",
  },
  {
    tipo: "raccordo",
    icona: "fa-music",
    kicker: "Concerto",
    titolo: "Concerto al PalaMazzola",
    desc: "Momento musicale aperto al pubblico presente.",
    con: "Artista da definire",
  },
];

export type Relatore = {
  id: RelatoreId;
  nome: string;
  ruolo: string;
  img?: string;
  icona?: string;
  /** Numero del panel in cui interviene, quando è un panel. */
  panel?: number;
};

/**
 * Relatori e ospiti nell'ordine in cui salgono sul palco. Derivato dal
 * programma: aggiungere una persona a un panel la fa comparire anche qui, al
 * punto giusto, senza toccare due elenchi.
 */
export const RELATORI: Relatore[] = PROGRAMMA_GIORNO1.flatMap((voce) =>
  (voce.relatori ?? []).map((id) => ({ id, panel: voce.n, ...ANAGRAFICA[id] })),
);

export const relatoreById = (id: RelatoreId): Relatore | undefined =>
  RELATORI.find((r) => r.id === id);

/** Moderatrice del giorno 1 al PalaMazzola. */
export const MODERATRICE = {
  nome: "Simona Rolandi",
  ruolo: "Giornalista Rai. Modera la prima giornata al PalaMazzola.",
};

export const STATS = [
  { num: "2", label: "Giornate" },
  { num: "7", label: "Panel" },
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
