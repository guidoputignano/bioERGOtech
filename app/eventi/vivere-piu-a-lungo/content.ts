/**
 * Punto UNICO di configurazione del modulo evento.
 *
 * Tutto cio che cambia tra un'edizione e l'altra (date, orari, luoghi,
 * capienze, relatori, modalita archivio) vive qui. Non serve cercare nel
 * markup. Le capienze qui sono la fonte di verita per il display. La
 * migrazione SQL semina le stesse capienze nella tabella event_sessions,
 * che resta la fonte di verita per il conteggio dei posti a runtime.
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
  titolo: "Vivere piu a lungo: sport e intelligenza artificiale",
  sottotitolo:
    "Una mattinata di confronto su come lo sport, la robotica e l'intelligenza artificiale possono allungare e migliorare la vita, con scienziati, medici e campioni dello sport.",
  tagline:
    "Due giornate, un unico obiettivo: mettere insieme scienza, sport, giovani e impresa per vivere piu a lungo e meglio.",
  organizzatore: "Fondazione bioERGOtech",
  citta: "Taranto",
  /** Etichette pronte per l'uso nei box informativi dell'hero. */
  dataLabel: "11 e 12 dicembre 2026",
  orarioLabel: "Giorno 1: 9:00 . 13:00",
  luogoLabel: "Giorno 1: Iacovone, Taranto. Giorno 2: Camera di Commercio, Taranto",
  /** Date ISO per i dati strutturati schema.org Event. */
  startDateISO: "2026-12-11T09:00:00+01:00",
  endDateISO: "2026-12-12T18:00:00+01:00",
  /** Immagine Open Graph dedicata (riusa un asset gia presente nel sito). */
  ogImage: "/assets/images/Home/Automation.webp",
} as const;

export type SessionSlug =
  | "giorno-1-mattina"
  | "giorno-1-pomeriggio"
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

/** Le "avenue" iscrivibili. Un iscritto puo sceglierne una o piu. */
export const SESSIONS: EventSession[] = [
  {
    slug: "giorno-1-mattina",
    titolo: "Giorno 1, mattina. Programma scientifico",
    giorno: 1,
    giornoLabel: "Giovedi 11 dicembre",
    dataLabel: "11 dicembre 2026",
    orario: "9:00 . 13:00",
    luogo: "Iacovone, Taranto",
    capienza: 300,
    descrizione:
      "Scienziati, medici e campioni dello sport a confronto su robotica, intelligenza artificiale e longevita.",
  },
  {
    slug: "giorno-1-pomeriggio",
    titolo: "Giorno 1, pomeriggio. I progetti dei ragazzi",
    giorno: 1,
    giornoLabel: "Giovedi 11 dicembre",
    dataLabel: "11 dicembre 2026",
    orario: "14:30 . 18:00",
    luogo: "Iacovone, Taranto",
    capienza: 200,
    descrizione:
      "Dieci gruppi di ragazzi presentano i dieci migliori progetti. Una giuria proclama il vincitore. In palio un viaggio a New York.",
  },
  {
    slug: "giorno-2",
    titolo: "Giorno 2. Startup, pitch e networking",
    giorno: 2,
    giornoLabel: "Venerdi 12 dicembre",
    dataLabel: "12 dicembre 2026",
    orario: "9:30 . 13:30",
    luogo: "Camera di Commercio, Taranto",
    capienza: 150,
    descrizione:
      "Otto startup presentano i loro progetti a investitori, partner e istituzioni.",
  },
];

export const sessionBySlug = (slug: string): EventSession | undefined =>
  SESSIONS.find((s) => s.slug === slug);

/** Categorie di iscritto. value finisce nel database, label e per la UI. */
export const CATEGORIE = [
  { value: "studente", label: "Studente" },
  { value: "scuola_docente", label: "Scuola / Docente referente" },
  { value: "autorita", label: "Autorita / Istituzione" },
  { value: "startup", label: "Startup" },
  { value: "investitore_partner", label: "Investitore / Partner" },
  { value: "pubblico", label: "Pubblico generale" },
] as const;

export type CategoriaValue = (typeof CATEGORIE)[number]["value"];

export const categoriaLabel = (value: string): string =>
  CATEGORIE.find((c) => c.value === value)?.label ?? value;

/** Testo del consenso marketing, registrato a database con timestamp. */
export const CONSENSO_MARKETING_TESTO =
  "Acconsento a ricevere comunicazioni e materiale informativo della Fondazione bioERGOtech sulle sue iniziative, eventi e attivita. Potro revocare il consenso in qualsiasi momento.";

export const CONSENSO_PRIVACY_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali per la gestione dell'iscrizione e dell'evento.";

/* ── Contenuti di sola presentazione (programma, stats, perche, FAQ) ── */

export const RELATORI = [
  { nome: "Giorgio Ventre", ruolo: "Direttore Scientifico, Apple Developer Academy" },
  { nome: "Bruno Siciliano", ruolo: "Professore di Robotica, Federico II" },
  { nome: "Daniele Pucci", ruolo: "Robotica e IA, Istituto Italiano di Tecnologia" },
  { nome: "Daniela Marotto", ruolo: "Reumatologa, Collegio Reumatologi Italiani" },
  { nome: "Franco Piovella", ruolo: "Angiologo, esperto di malattie tromboemboliche" },
  { nome: "Agostino Abbagnale", ruolo: "Campione olimpico di canottaggio" },
  { nome: "On. Simona Loizzo", ruolo: "Camera dei Deputati" },
  { nome: "Dott. Andrea Mandelli", ruolo: "Presidente FOFI, Ordine dei Farmacisti" },
];

export const MODERATORE = {
  nome: "Massimo Caputi",
  ruolo: "Giornalista e telecronista sportivo. Modera la mattinata.",
};

export const CONFRONTO = {
  titolo: "Confronto",
  testo:
    "Francesco Montervino, ex capitano del Napoli, in dialogo con il prof. Bruno Siciliano.",
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
    a: "L'evento si tiene l'11 e 12 dicembre 2026 a Taranto. Il giorno 1 al Iacovone, il giorno 2 alla Camera di Commercio.",
  },
  {
    q: "Quanto costa partecipare?",
    a: "La partecipazione e gratuita. L'iscrizione e obbligatoria perche i posti sono limitati.",
  },
  {
    q: "A chi e rivolto?",
    a: "A studenti, scuole, autorita, startup, investitori, partner e al pubblico generale interessato a sport, salute e intelligenza artificiale.",
  },
  {
    q: "Posso iscrivermi a una sola giornata?",
    a: "Si. Puoi scegliere una o piu sessioni. Per ciascuna sessione vale la capienza disponibile.",
  },
  {
    q: "Come funziona il check-in in loco?",
    a: "Dopo l'iscrizione ricevi un'email di conferma con un codice e un QR code. Al desk lo mostri allo staff per il check-in della sessione.",
  },
];
