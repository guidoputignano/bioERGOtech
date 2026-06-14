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
    "Una giornata di confronto su come lo sport, la robotica e l'intelligenza artificiale possono allungare e migliorare la vita, con scienziati, medici e campioni dello sport.",
  tagline:
    "Due giornate, un unico obiettivo: mettere insieme scienza, sport, giovani e impresa per vivere più a lungo e meglio.",
  organizzatore: "Fondazione bioERGOtech",
  citta: "Taranto",
  /** Etichette pronte per l'uso nei box informativi dell'hero. */
  dataLabel: "11 e 12 dicembre 2026",
  orarioLabel: "Giorno 1: 9:00 . 18:00. Giorno 2: 9:30 . 13:30",
  luogoLabel: "Giorno 1: Iacovone, Taranto. Giorno 2: Teatro Fusco, Taranto",
  /** Date ISO per i dati strutturati schema.org Event. */
  startDateISO: "2026-12-11T09:00:00+01:00",
  endDateISO: "2026-12-12T18:00:00+01:00",
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
    titolo: "Giorno 1. Ospiti e progetti dei ragazzi",
    giorno: 1,
    giornoLabel: "Giovedì 11 dicembre",
    dataLabel: "11 dicembre 2026",
    orario: "9:00 . 18:00",
    luogo: "Iacovone, Taranto",
    capienza: 300,
    descrizione:
      "Una sola giornata allo stadio Iacovone. Prima gli ospiti: scienziati, medici e campioni dello sport a confronto su robotica, IA e longevità. Poi i ragazzi presentano i dieci migliori progetti e una giuria proclama il vincitore. In palio un viaggio a New York.",
  },
  {
    slug: "giorno-2",
    titolo: "Giorno 2. Startup e concerto",
    giorno: 2,
    giornoLabel: "Venerdì 12 dicembre",
    dataLabel: "12 dicembre 2026",
    orario: "9:30 . 13:30",
    luogo: "Teatro Fusco, Taranto",
    capienza: 150,
    descrizione:
      "Otto startup presentano i loro progetti a investitori, partner e istituzioni. A seguire, il concerto.",
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

/** Relatori del programma scientifico. */
export const RELATORI = [
  { nome: "Giorgio Ventre", ruolo: "Direttore Scientifico, Apple Developer Academy", img: `${SPEAKER_IMG}/giorgio-ventre.webp` },
  { nome: "Bruno Siciliano", ruolo: "Professore di Robotica, Federico II", img: `${SPEAKER_IMG}/bruno-siciliano.webp` },
  { nome: "Daniele Pucci", ruolo: "Robotica e IA, Istituto Italiano di Tecnologia", img: `${SPEAKER_IMG}/daniele-pucci.webp` },
  { nome: "Daniela Marotto", ruolo: "Reumatologa, Collegio Reumatologi Italiani", img: `${SPEAKER_IMG}/daniela-marotto.webp` },
  { nome: "Franco Piovella", ruolo: "Angiologo, esperto di malattie tromboemboliche", img: `${SPEAKER_IMG}/franco-piovella.webp` },
  { nome: "Agostino Abbagnale", ruolo: "Campione olimpico di canottaggio", img: `${SPEAKER_IMG}/agostino-abbagnale.webp` },
  { nome: "On. Simona Loizzo", ruolo: "Camera dei Deputati", img: `${SPEAKER_IMG}/simona-loizzo.webp` },
  { nome: "Dott. Andrea Mandelli", ruolo: "Presidente FOFI, Ordine dei Farmacisti", img: `${SPEAKER_IMG}/andrea-mandelli.webp` },
];

export const MODERATORE = {
  nome: "Massimo Caputi",
  ruolo: "Giornalista e telecronista sportivo. Modera il confronto con gli ospiti.",
  img: `${SPEAKER_IMG}/massimo-caputi.webp`,
};

export const CONFRONTO = {
  titolo: "Confronto",
  testo:
    "Francesco Montervino, ex capitano del Napoli, in dialogo con il prof. Bruno Siciliano.",
  img: `${SPEAKER_IMG}/francesco-montervino.webp`,
};

export const STATS = [
  { num: "8", label: "Relatori" },
  { num: "10", label: "Progetti in gara" },
  { num: "8", label: "Startup" },
  { num: "2", label: "Giornate" },
];

export const PERCHE_PARTECIPARE = [
  {
    icona: "fa-graduation-cap",
    titolo: "Per gli studenti",
    desc: "Incontri scienziati e campioni, presenti il tuo progetto e puoi vincere un viaggio a New York.",
  },
  {
    icona: "fa-school",
    titolo: "Per le scuole",
    desc: "Porti la tua classe a contatto con ricerca, robotica e IA applicate alla vita reale.",
  },
  {
    icona: "fa-rocket",
    titolo: "Per le startup",
    desc: "Presenti il tuo progetto a investitori, partner e istituzioni in un contesto curato.",
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
    a: "L'evento si tiene l'11 e 12 dicembre 2026 a Taranto. Il giorno 1 allo stadio Iacovone, il giorno 2 al Teatro Fusco.",
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
