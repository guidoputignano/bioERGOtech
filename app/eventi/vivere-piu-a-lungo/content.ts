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
 * I sette panel del giorno 1. Ogni panel dura circa 25 minuti: gli ospiti
 * dialogano su un tema, senza slide. Qui pubblichiamo solo i temi, la fonte
 * di verità del programma resta il piano organizzativo interno.
 */
export const PANEL = [
  { n: 1, titolo: "Salute, prevenzione e sport", desc: "Prevenzione, trombosi e la vita dell'atleta." },
  { n: 2, titolo: "Regole, professioni e istituzioni", desc: "Normativa, dati sanitari e ruolo delle professioni." },
  { n: 3, titolo: "Il gesto atletico e la macchina", desc: "Sport e robotica a confronto." },
  { n: 4, titolo: "Sport, disabilità e inclusione", desc: "Come lo sport cambia la vita dei ragazzi con disabilità." },
  { n: 5, titolo: "Il corpo che si rigenera", desc: "Reumatologia, recupero e ritorno alla performance." },
  { n: 6, titolo: "Scienza, tecnologia e nuove generazioni", desc: "Divulgazione, talento e formazione dei ragazzi." },
  { n: 7, titolo: "Vivere più a lungo", desc: "Oncologia, longevità e sport." },
];

/** Relatori e ospiti confermati con foto, presenti nei panel del giorno 1. */
export const RELATORI = [
  { nome: "Franco Piovella", ruolo: "Angiologo, malattie tromboemboliche", img: `${SPEAKER_IMG}/franco-piovella.webp` },
  { nome: "Agostino Abbagnale", ruolo: "Campione olimpico di canottaggio", img: `${SPEAKER_IMG}/agostino-abbagnale.webp` },
  { nome: "Andrea Mandelli", ruolo: "Presidente FOFI, Ordine dei Farmacisti", img: `${SPEAKER_IMG}/andrea-mandelli.webp` },
  { nome: "On. Simona Loizzo", ruolo: "Camera dei Deputati", img: `${SPEAKER_IMG}/simona-loizzo.webp` },
  { nome: "Daniela Marotto", ruolo: "Reumatologa, Collegio Reumatologi Italiani", img: `${SPEAKER_IMG}/daniela-marotto.webp` },
  { nome: "Bruno Siciliano", ruolo: "Robotica, Università Federico II", img: `${SPEAKER_IMG}/bruno-siciliano.webp` },
  { nome: "Francesco Montervino", ruolo: "Ex capitano del Napoli", img: `${SPEAKER_IMG}/francesco-montervino.webp` },
];

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
