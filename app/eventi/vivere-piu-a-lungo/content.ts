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
 * true in archivio.ts. I form spariscono, resta il recap, e nessun dato
 * viene cancellato.
 */

// Le prenotazioni per classe: solo costanti, senza codice server (content.ts
// lo importano anche le pagine statiche e il browser).
import { MAX_PERSONE_CLASSE, PAGINA_CLASSI } from "@/lib/eventi/classi";

/**
 * Quando true, nasconde i form di iscrizione e mostra il riepilogo. Vive in
 * archivio.ts, un modulo minimo che legge anche la navbar; qui è riesportata
 * perché gli import esistenti continuino a funzionare.
 */
export { ARCHIVE_MODE } from "./archivio";

/** Slug della rotta pubblica. Usato per costruire URL assoluti e link email. */
export const EVENT_SLUG = "vivere-piu-a-lungo";

/** URL base del sito, per link nelle email e nei dati strutturati. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.bioergotech.org";

export const EVENT = {
  occhiello: "Fondazione bioERGOtech, Taranto",
  titolo: "Vivere più a lungo: sport e intelligenza artificiale",
  sottotitolo:
    "Due giornate di confronto su come lo sport, la robotica e l'intelligenza artificiale possono allungare e migliorare la vita, con scienziati, medici, campioni dello sport e le nuove idee dei ragazzi e delle startup.",
  /**
   * La riga sotto il titolo nell'hero della pagina evento. Una frase sola:
   * sul telefono deve stare nella prima schermata insieme a date, luoghi e
   * pulsante di iscrizione. Il sottotitolo lungo resta per la homepage.
   */
  sottotitoloBreve: "Campioni, medici e ricercatori a confronto, insieme ai progetti dei ragazzi.",
  /**
   * La descrizione per i motori di ricerca e per le anteprime social. Sotto
   * i 160 caratteri, con date, città e gratuità, che sono le tre cose che
   * decidono il clic.
   */
  metaDescrizione:
    "Il 10 e l'11 dicembre 2026 a Taranto: campioni, medici e ricercatori su sport, salute e intelligenza artificiale. Ingresso gratuito, iscrizione obbligatoria.",
  tagline:
    "Due giornate, un unico obiettivo: mettere insieme scienza, sport, giovani e impresa per vivere più a lungo e meglio.",
  organizzatore: "Fondazione bioERGOtech",
  citta: "Taranto",
  /** Etichette pronte per l'uso nei box informativi dell'hero. */
  dataLabel: "10 e 11 dicembre 2026",
  orarioLabel: "10 dicembre dalle 9:00 alle 16:00, 11 dicembre dalle 9:00 alle 13:00",
  luogoLabel: "10 dicembre al PalaMazzola, 11 dicembre al Teatro Fusco, Taranto",
  /** Date ISO per i dati strutturati schema.org Event. */
  startDateISO: "2026-12-10T09:00:00+01:00",
  endDateISO: "2026-12-11T13:00:00+01:00",
  /** Immagine Open Graph: l'illustrazione dell'evento, la stessa dell'hero. */
  ogImage: "/assets/images/eventi/vivere-piu-a-lungo/hero.webp",
  /** Misure reali del file, per le anteprime social (1600x694). */
  ogImageLarghezza: 1600,
  ogImageAltezza: 694,
  /** Testo alternativo dell'illustrazione, nell'hero e nelle anteprime. */
  ogImageAlt:
    "Illustrazione: un'atleta corre sul lungomare di Taranto davanti al Castello Aragonese, affiancata dalla figura luminosa di un corpo umano digitale e da una doppia elica del DNA",
} as const;

export type SessionSlug =
  | "giorno-1"
  | "giorno-2";

export type EventSession = {
  /**
   * Il codice interno della giornata, quello che sta nel database
   * (event_sessions.slug) e nei moduli. Non cambia mai: le persone non lo
   * vedono, vedono la data.
   */
  slug: SessionSlug;
  /**
   * Il nome della giornata per le persone: la data. È l'etichetta da usare
   * ovunque (pagina, modulo, email, biglietto, pannello, export) al posto di
   * "Giorno 1" e "Giorno 2".
   */
  etichetta: string;
  /** Che cosa succede quel giorno, senza la data. */
  titolo: string;
  giorno: 1 | 2;
  /** "Giovedì 10 dicembre". */
  giornoLabel: string;
  /** "10 dicembre 2026". */
  dataLabel: string;
  /** La data in formato ISO, per confrontarla con oggi (fuso di Roma). */
  dataISO: string;
  /** Inizio e fine con il fuso, per il calendario e i dati strutturati. */
  inizioISO: string;
  fineISO: string;
  /** "dalle 9:00 alle 16:00". */
  orario: string;
  /** "PalaMazzola, Taranto". */
  luogo: string;
  /** "PalaMazzola". */
  luogoBreve: string;
  /** Ricerca su Google Maps del luogo: niente indirizzi scritti a mano. */
  mappaUrl: string;
  /** Capienza massima. Modificabile qui, seminata nella migrazione SQL. */
  capienza: number;
  descrizione: string;
};

/** Le "avenue" iscrivibili. Un iscritto può sceglierne una o più. */
export const SESSIONS: EventSession[] = [
  {
    slug: "giorno-1",
    etichetta: "10 dicembre",
    titolo: "Panel, progetti dei ragazzi e concerto",
    giorno: 1,
    giornoLabel: "Giovedì 10 dicembre",
    dataLabel: "10 dicembre 2026",
    dataISO: "2026-12-10",
    inizioISO: "2026-12-10T09:00:00+01:00",
    fineISO: "2026-12-10T16:00:00+01:00",
    orario: "dalle 9:00 alle 16:00",
    luogo: "PalaMazzola, Taranto",
    luogoBreve: "PalaMazzola",
    mappaUrl: "https://www.google.com/maps/search/?api=1&query=PalaMazzola%2C%20Taranto",
    capienza: 3500,
    descrizione:
      "Una giornata al PalaMazzola. Sei panel su sport, salute, robotica e intelligenza artificiale si alternano ai progetti dei ragazzi: dieci gruppi in gara presentano le loro idee davanti a una commissione. In chiusura, il concerto aperto al pubblico.",
  },
  {
    slug: "giorno-2",
    etichetta: "11 dicembre",
    titolo: "Showcase di innovazione e premiazione",
    giorno: 2,
    giornoLabel: "Venerdì 11 dicembre",
    dataLabel: "11 dicembre 2026",
    dataISO: "2026-12-11",
    inizioISO: "2026-12-11T09:00:00+01:00",
    fineISO: "2026-12-11T13:00:00+01:00",
    orario: "dalle 9:00 alle 13:00",
    luogo: "Teatro Fusco, Taranto",
    luogoBreve: "Teatro Fusco",
    mappaUrl: "https://www.google.com/maps/search/?api=1&query=Teatro%20Fusco%2C%20Taranto",
    capienza: 400,
    descrizione:
      "Al Teatro Fusco, uno showcase di innovazione con startup, spin-off universitari, centri di ricerca e progetti del territorio. A seguire la premiazione con tre premi e il concerto di chiusura.",
  },
];

export const sessionBySlug = (slug: string): EventSession | undefined =>
  SESSIONS.find((s) => s.slug === slug);

/**
 * Il nome di una giornata per le persone ("10 dicembre"), dal suo codice.
 * Per un codice che il sito non conosce (una sessione rimasta nel database)
 * torna il codice stesso, così si vede che c'è qualcosa da sistemare.
 */
export const etichettaGiornata = (slug: string | null | undefined): string =>
  (slug && sessionBySlug(slug)?.etichetta) || slug || "giornata sconosciuta";

/** "10 dicembre", "11 dicembre", "10 e 11 dicembre": le giornate in ordine, in una frase. */
export function elencoGiornate(slugs: readonly string[]): string {
  const ordinate = SESSIONS.filter((s) => slugs.includes(s.slug));
  if (ordinate.length === 0) return "";
  if (ordinate.length === 1) return ordinate[0].etichetta;
  // "10 e 11 dicembre" quando il mese è lo stesso, come nel resto del sito.
  const mese = (e: string) => e.split(" ").slice(1).join(" ");
  const stessoMese = ordinate.every((s) => mese(s.etichetta) === mese(ordinate[0].etichetta));
  if (stessoMese) {
    const giorni = ordinate.map((s) => s.etichetta.split(" ")[0]);
    return `${giorni.slice(0, -1).join(", ")} e ${giorni[giorni.length - 1]} ${mese(ordinate[0].etichetta)}`;
  }
  return `${ordinate.slice(0, -1).map((s) => s.etichetta).join(", ")} e ${ordinate[ordinate.length - 1].etichetta}`;
}

/**
 * Le giornate con l'articolo, come si dicono: "il 10 dicembre",
 * "l'11 dicembre", "il 10 e l'11 dicembre".
 */
export function giornateConArticolo(slugs: readonly string[]): string {
  const ordinate = SESSIONS.filter((s) => slugs.includes(s.slug));
  if (ordinate.length === 0) return "";
  // "l'" davanti ai numeri che si leggono con una vocale: 1, 8, 11 (il 18 no: diciotto).
  const art = (giorno: string) => (/^(1|8|11)$/.test(giorno) ? "l'" : "il ");
  const giorni = ordinate.map((s) => s.etichetta.split(" ")[0]);
  const mese = ordinate[0].etichetta.split(" ").slice(1).join(" ");
  const stessoMese = ordinate.every((s) => s.etichetta.split(" ").slice(1).join(" ") === mese);
  if (!stessoMese) return ordinate.map((s) => `${art(s.etichetta.split(" ")[0])}${s.etichetta}`).join(" e ");
  const parti = giorni.map((g) => `${art(g)}${g}`);
  const frase = parti.length === 1 ? parti[0] : `${parti.slice(0, -1).join(", ")} e ${parti[parti.length - 1]}`;
  return `${frase} ${mese}`;
}

/**
 * La giornata di oggi, nel fuso di Roma, se oggi è un giorno dell'evento.
 * Serve all'ingresso: la modalità check-in parte da qui.
 */
export function giornataDiOggi(adesso: Date = new Date()): EventSession | undefined {
  const oggi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(adesso);
  return SESSIONS.find((s) => s.dataISO === oggi);
}

/** Categorie di iscritto. value finisce nel database, label è per la UI. */
export const CATEGORIE = [
  // L'ordine è quello del modulo: prima il pubblico, che è la maggior parte
  // di chi arriva dal QR. Il value resta quello del database.
  { value: "pubblico", label: "Pubblico" },
  { value: "studente", label: "Studente" },
  { value: "scuola_docente", label: "Docente o scuola" },
  { value: "autorita", label: "Istituzione" },
  { value: "startup", label: "Startup" },
  { value: "investitore_partner", label: "Investitore o partner" },
] as const;

export type CategoriaValue = (typeof CATEGORIE)[number]["value"];

export const categoriaLabel = (value: string): string =>
  CATEGORIE.find((c) => c.value === value)?.label ?? value;

/** Testo del consenso marketing, registrato a database con timestamp. */
export const CONSENSO_MARKETING_TESTO =
  "Acconsento a ricevere comunicazioni e materiale informativo della Fondazione bioERGOtech sulle sue iniziative, eventi e attività. Potrò revocare il consenso in qualsiasi momento.";

export const CONSENSO_PRIVACY_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali per la gestione dell'iscrizione e dell'evento.";

/* ── Prenotazioni per classe ── */

/**
 * Il consenso del modulo delle scuole: lo spunta il docente che prenota, per
 * i suoi dati. Degli studenti non si raccoglie niente, solo quanti sono. La
 * rotta lo salva con la prenotazione (consenso_privacy_testo).
 */
export const CONSENSO_PRIVACY_CLASSI_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali per la gestione della prenotazione della classe e dell'evento.";

/**
 * Le sole indicazioni pratiche per le classi: nient'altro su orari di arrivo
 * o documenti, finché l'organizzazione non lo decide.
 */
export const CLASSI_PRIMA_DI_PARTIRE =
  "Porta con te l'elenco della classe, come per ogni uscita didattica, e arrivate con un po' di anticipo.";

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
  /**
   * Chi non interviene più all'evento. Stesso effetto di `daAutorizzare`: la
   * scheda resta qui, pronta nel caso torni, ma la persona non compare da
   * nessuna parte sulla pagina. Per farla ricomparire basta togliere la riga.
   */
  nascosto?: boolean;
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
 * Questo è il registro completo: autorizzati, in attesa e nascosti. Quello che
 * la pagina pubblica è RELATORI_PUBBLICI, qui sotto.
 */
export const RELATORI: Relatore[] = [
  { id: "piovella", nome: "Franco Piovella", ruolo: "Angiologo, malattie tromboemboliche", img: `${SPEAKER_IMG}/franco-piovella.webp` },
  { id: "abbagnale", nome: "Agostino Abbagnale", ruolo: "Campione olimpico di canottaggio", img: `${SPEAKER_IMG}/agostino-abbagnale.webp` },
  // Ruolo ripreso dalla sua scheda giocatrice sul sito del BSL San Lazzaro.
  { id: "botticelli", nome: "Olivia Botticelli", ruolo: "Cestista, cresciuta nel vivaio del BSL San Lazzaro", img: `${SPEAKER_IMG}/olivia-botticelli.webp` },
  // Andrea Mandelli non riesce più a partecipare: il panel 2 resta con
  // Simona Loizzo. La scheda resta qui, nascosta, nel caso torni.
  { id: "mandelli", nome: "Andrea Mandelli", ruolo: "Presidente FOFI, Ordine dei Farmacisti", img: `${SPEAKER_IMG}/andrea-mandelli.webp`, nascosto: true },
  { id: "loizzo", nome: "On. Simona Loizzo", ruolo: "Camera dei Deputati", img: `${SPEAKER_IMG}/simona-loizzo.webp` },
  { id: "montervino", nome: "Francesco Montervino", ruolo: "Ex capitano del Napoli", img: `${SPEAKER_IMG}/francesco-montervino.webp` },
  { id: "siciliano", nome: "Bruno Siciliano", ruolo: "Robotica, Università Federico II", img: `${SPEAKER_IMG}/bruno-siciliano.webp` },
  { id: "tari", nome: "Mariangela Tarì", ruolo: "Scrittrice, presidente de La casa di Sofia", img: `${SPEAKER_IMG}/mariangela-tari.webp` },
  { id: "marotto", nome: "Daniela Marotto", ruolo: "Reumatologa, Collegio Reumatologi Italiani", img: `${SPEAKER_IMG}/daniela-marotto.webp` },
  { id: "franchini", nome: "Mario Franchini", ruolo: "Oncologo", img: `${SPEAKER_IMG}/mario-franchini.webp` },
  { id: "montano", nome: "Aldo Montano", ruolo: "Campione olimpico di scherma", img: `${SPEAKER_IMG}/aldo-montano.webp` },
  { id: "bortuzzo", nome: "Manuel Bortuzzo", ruolo: "Nuotatore paralimpico, bronzo a Parigi 2024", img: `${SPEAKER_IMG}/manuel-bortuzzo.webp` },
  // Vincenzo Schettini non interviene più: il suo posto nel panel 6 è passato
  // ad Alberto Costantini. La scheda resta qui, nascosta, nel caso torni.
  { id: "schettini", nome: "Vincenzo Schettini", ruolo: "Divulgatore, La fisica che ci piace", img: `${SPEAKER_IMG}/vincenzo-schettini.webp`, nascosto: true },
  // Alberto Costantini non riesce più a partecipare: il panel 6 resta con
  // Vezzali e Bianco. La scheda resta qui, nascosta, nel caso torni.
  { id: "costantini", nome: "Alberto Costantini", ruolo: "Dirigente del Servizio Assistenza Farmaceutica, Regione Abruzzo", img: `${SPEAKER_IMG}/alberto-costantini.webp`, nascosto: true },
  // Sofia Raffaeli non è più assegnata a un panel: il suo posto nel panel 6 è
  // passato a Valentina Vezzali. La scheda resta qui, inattiva, nel caso torni.
  { id: "raffaeli", nome: "Sofia Raffaeli", ruolo: "Campionessa mondiale di ginnastica ritmica", img: `${SPEAKER_IMG}/sofia-raffaeli.webp`, daAutorizzare: true },
  { id: "vezzali", nome: "Valentina Vezzali", ruolo: "Campionessa olimpica di scherma", img: `${SPEAKER_IMG}/valentina-vezzali.webp` },
  // Ruolo ripreso dalla sua scheda su altoslabs.com (Institute of Computation).
  { id: "bianco", nome: "Simone Bianco", ruolo: "Biologia computazionale, Altos Labs", img: `${SPEAKER_IMG}/simone-bianco.webp` },
];

/**
 * Il programma del 10 dicembre al PalaMazzola (slug giorno-1), come sequenza:
 * una giornata unica, dalle 9:00 alle 16:00, senza turni separati. Sei panel
 * di dialogo sul tema, senza slide, si alternano ai blocchi di presentazione
 * dei ragazzi, al coffee break, alla chiusura con la squadra della città e
 * alla proclamazione, fino al concerto. I panel durano circa 25 minuti; il 5
 * e il 6 circa 30, con il tempo liberato dal vecchio panel 7. Qui
 * pubblichiamo temi, protagonisti e ritmo, non gli orari puntuali: la fonte
 * di verità resta il piano interno.
 *
 * La pagina dà a ogni panel l'ancora `#panel-<n>`: la striscia "Sul palco"
 * in cima porta lì chi clicca su un volto. Cambiare `n` sposta l'ancora.
 *
 * `tipo` distingue i panel (nodo numerato) dalle voci di raccordo (nodo con
 * icona). `relatori` elenca gli `id` di RELATORI che salgono sul palco in
 * quella voce, `ospiti` i nomi senza foto (gruppi, squadre, istituzioni).
 */
export type ProgrammaVoce = {
  tipo: "apertura" | "panel" | "ragazzi" | "pausa" | "chiusura" | "premiazione" | "lunch" | "concerto";
  n?: number;
  icona?: string;
  titolo: string;
  desc: string;
  relatori?: string[];
  ospiti?: string[];
  /**
   * Gli `id` di PARTNER che salgono sul palco in questa voce. È il posto dove
   * i loghi compaiono: dentro la card del panel, accanto a chi interviene, non
   * in una fascia separata a fondo pagina che non direbbe in che veste ci sono.
   */
  partner?: string[];
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
    titolo: "Allenarsi a stare bene",
    desc: "Come si riconosce e si previene il rischio tromboembolico, e che cosa cambia quando il corpo è quello di chi si allena ogni giorno. Dalla diagnosi precoce alle abitudini che proteggono la circolazione, anche lontano dall'agonismo.",
    relatori: ["piovella", "abbagnale", "botticelli"],
  },
  {
    tipo: "panel",
    n: 2,
    titolo: "Chi costruisce la salute di domani",
    desc: "Chi custodisce i dati sanitari, chi scrive le regole e come sta cambiando il lavoro di chi sta accanto al paziente. Lo sguardo del legislatore su ciò che serve perché innovazione e tutela della persona procedano insieme.",
    relatori: ["loizzo"],
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
    titolo: "Il talento si può misurare?",
    desc: "Che cosa impara un robot osservando un atleta, e che cosa impara un atleta dalla misura del proprio movimento. Equilibrio, coordinazione e tempi di reazione letti dalla robotica, fino ai limiti che la macchina ancora non supera.",
    relatori: ["montervino", "siciliano"],
  },
  {
    tipo: "panel",
    n: 4,
    titolo: "Nessuno resta in panchina",
    desc: "Che cosa succede quando una squadra si apre davvero: autonomia, fiducia e legami che nascono in campo prima che nei percorsi di cura. Le esperienze di chi accompagna ragazzi con disabilità, raccontate da chi le vive ogni giorno.",
    relatori: ["tari"],
    partner: ["giffoni", "diavoli-rossi", "casa-di-sofia"],
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
    titolo: "Cadere e rialzarsi",
    desc: "Il percorso che porta dall'infortunio o dalla diagnosi al ritorno in attività: tempi reali, terapie e la parte meno visibile del recupero, quella mentale. Reumatologia, oncologia e testimonianze sportive a confronto su che cosa significa ricominciare.",
    relatori: ["marotto", "franchini", "montano", "bortuzzo"],
  },
  {
    tipo: "panel",
    n: 6,
    titolo: "La curiosità che non si spegne",
    desc: "Come si accende la curiosità scientifica e come si tiene viva quando lo studio si fa difficile. Dalla scienza che crea nuova materia alla disciplina dello sport di alto livello: che cosa serve davvero ai ragazzi per costruirsi un percorso, dentro e fuori dall'aula.",
    relatori: ["vezzali", "bianco"],
  },
  {
    tipo: "ragazzi",
    icona: "fa-users",
    titolo: "Progetti dei ragazzi, terzo blocco",
    desc: "I gruppi da 8 a 10 chiudono la gara.",
  },
  {
    tipo: "chiusura",
    icona: "fa-futbol",
    titolo: "La squadra della città",
    desc: "L'S.S. Taranto sale sul palco a chiusura dei panel: lo sport come impegno di ogni giorno, per chi gioca e per chi tifa.",
    partner: ["taranto"],
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
  chiusura: "Chiusura",
  premiazione: "Premiazione",
  lunch: "Lunch",
  concerto: "Concerto",
};

/**
 * I relatori che possiamo pubblicare. È l'unica lista che la pagina deve usare:
 * volti nei panel, nomi in riga, contatore delle stats e `performer` nei dati
 * strutturati passano tutti di qui, così un nome non autorizzato o nascosto
 * non può sfuggire da una sola di quelle strade.
 */
export const RELATORI_PUBBLICI = RELATORI.filter((r) => !r.daAutorizzare && !r.nascosto);

// Costruita sui soli pubblicabili: un id in attesa o nascosto non risolve, e
// la voce di programma che lo cita mostra semplicemente gli altri.
const RELATORE_BY_ID = new Map(RELATORI_PUBBLICI.map((r) => [r.id, r]));

/** I relatori con foto di una voce, risolti dagli id. Alimentano i volti nei panel. */
export const relatoriVoce = (v: ProgrammaVoce): Relatore[] =>
  (v.relatori ?? [])
    .map((id) => RELATORE_BY_ID.get(id))
    .filter((r): r is Relatore => Boolean(r));

/** Nomi in riga, per le voci di raccordo che non mostrano i volti. */
export const nomiVoce = (v: ProgrammaVoce): string[] => [
  ...relatoriVoce(v).map((r) => r.nome),
  ...partnerVoce(v).map((p) => p.nome),
  ...(v.ospiti ?? []),
];

/** Moderatrice del 10 dicembre al PalaMazzola. Foto nella stessa cartella dei relatori. */
export const MODERATRICE = {
  nome: "Simona Rolandi",
  ruolo: "Giornalista Rai. Modera la giornata del 10 dicembre al PalaMazzola.",
  img: `${SPEAKER_IMG}/simona-rolandi.webp`,
};

/** Cartella dei loghi delle realtà coinvolte. */
const PARTNER_IMG = "/assets/images/eventi/vivere-piu-a-lungo/partner";

export type Partner = {
  /** Chiave stabile, usata solo come key di render. */
  id: string;
  nome: string;
  /** Che cosa porta alla giornata. Una riga sola, sotto il logo. */
  ruolo?: string;
  img: string;
  /** Sito ufficiale. Se manca, il logo resta senza link. */
  url?: string;
  /**
   * Stesso meccanismo di `daAutorizzare` per i relatori, applicato al file:
   * finché il logo non è in repository la voce resta qui, completa, ma non
   * compare sulla pagina, così non pubblichiamo un'immagine rotta. Quando il
   * file arriva basta togliere questa riga.
   */
  daCaricare?: boolean;
};

/**
 * Le realtà che partecipano alla giornata con i loro ragazzi e con i loro
 * progetti. Il logo è il modo in cui compaiono nella pagina: nessuna gerarchia
 * tra sponsor e ospiti, l'ordine è quello di questo array.
 */
export const PARTNER: Partner[] = [
  // Le righe `ruolo` sono descrizioni minime, da confermare con ciascuna
  // realtà prima della pubblicazione, insieme all'indirizzo del sito da
  // mettere in `url`. Meglio nessuna riga che una riga imprecisa.
  {
    id: "giffoni",
    nome: "Giffoni Experience",
    ruolo: "Il festival di cinema per ragazzi",
    img: `${PARTNER_IMG}/giffoni.webp`,
  },
  {
    id: "diavoli-rossi",
    nome: "Diavoli Rossi",
    // `ruolo` e `url` restano da confermare con la squadra, come per le altre
    // realtà: meglio nessuna riga che una riga imprecisa.
    img: `${PARTNER_IMG}/diavoli-rossi.webp`,
  },
  {
    id: "casa-di-sofia",
    nome: "La casa di Sofia",
    ruolo: "Accoglienza per bambini e famiglie",
    img: `${PARTNER_IMG}/la-casa-di-sofia.webp`,
  },
  {
    id: "taranto",
    nome: "S.S. Taranto",
    ruolo: "La squadra di calcio della città, dal 1927",
    // Chiude la mattinata, prima della proclamazione. `url` resta da confermare con la società.
    img: `${PARTNER_IMG}/taranto.webp`,
  },
];

/** I loghi che la pagina può pubblicare davvero. */
export const PARTNER_PUBBLICI = PARTNER.filter((p) => !p.daCaricare);

// Come RELATORE_BY_ID: un id senza file non risolve, e la voce di programma
// che lo cita mostra semplicemente gli altri.
const PARTNER_BY_ID = new Map(PARTNER_PUBBLICI.map((p) => [p.id, p]));

/** I loghi di una voce di programma, risolti dagli id. */
export const partnerVoce = (v: ProgrammaVoce): Partner[] =>
  (v.partner ?? [])
    .map((id) => PARTNER_BY_ID.get(id))
    .filter((p): p is Partner => Boolean(p));

/** Panel e relatori sono contati dai dati, così non divergono dal programma. */
export const STATS = [
  { num: "2", label: "Giornate" },
  { num: String(PROGRAMMA_GIORNO1.filter((v) => v.tipo === "panel").length), label: "Panel" },
  { num: String(RELATORI_PUBBLICI.length), label: "Relatori e ospiti" },
  { num: "10", label: "Progetti dei ragazzi" },
  { num: "3", label: "Premi" },
];

/**
 * Sei schede, una per chi arriva sulla pagina. Il pubblico è la maggior parte
 * di chi si iscrive dal QR, quindi viene per primo, come nel modulo.
 */
export const PERCHE_PARTECIPARE = [
  {
    icona: "fa-heart-pulse",
    titolo: "Per chi ama sport e salute",
    desc: "Ascolti dal vivo campioni olimpici, medici e ricercatori su come allenamento, prevenzione e tecnologia aiutano a vivere meglio e più a lungo.",
  },
  {
    icona: "fa-graduation-cap",
    titolo: "Per gli studenti",
    desc: "Incontri da vicino campioni e scienziati, e vedi i progetti dei tuoi coetanei in gara davanti a una commissione.",
  },
  {
    icona: "fa-school",
    titolo: "Per le scuole",
    desc: "Porti la classe a contatto con ricerca, robotica e intelligenza artificiale applicate alla vita di tutti i giorni.",
  },
  {
    icona: "fa-flask",
    titolo: "Per gli universitari",
    desc: "Sviluppi un progetto di ricerca con il supporto di mentor, con un accompagnamento verso la sottomissione a una rivista scientifica.",
  },
  {
    icona: "fa-rocket",
    titolo: "Per le startup",
    desc: "Allo Showcase dell'11 dicembre incontri investitori, partner e istituzioni, e conosci le realtà innovative del territorio.",
  },
  {
    icona: "fa-landmark",
    titolo: "Per le istituzioni",
    desc: "Partecipi a un confronto pubblico su salute, sport, giovani e innovazione del territorio.",
  },
];

/**
 * Le due giornate per i testi delle FAQ, prese da SESSIONS così orari e luoghi
 * non divergono. Se una giornata manca la build si ferma qui con un messaggio
 * chiaro: meglio che pubblicare una risposta sbagliata.
 */
function giornataFaq(slug: SessionSlug): EventSession {
  const s = sessionBySlug(slug);
  if (!s) throw new Error(`content.ts: la giornata "${slug}" non è in SESSIONS.`);
  return s;
}
const FAQ_10 = giornataFaq("giorno-1");
const FAQ_11 = giornataFaq("giorno-2");
const faqQuando = (s: EventSession) =>
  `${s.giornoLabel} ${s.dataISO.slice(0, 4)} al ${s.luogoBreve}, ${s.orario}.`;

/**
 * Domande frequenti. Le prime sono quelle pratiche (date, costo, giornate,
 * ingresso, disdetta, biglietto perso, classi), poi chi può partecipare e i
 * percorsi dedicati. `link` aggiunge un collegamento in fondo alla risposta:
 * un percorso interno ("/...") o un indirizzo email ("mailto:...").
 */
export const FAQ: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: "Quando e dove si svolge l'evento?",
    a: `A Taranto, in due giornate. ${faqQuando(FAQ_10)} ${faqQuando(FAQ_11)}`,
  },
  {
    q: "Quanto costa partecipare?",
    a: "Niente: la partecipazione è gratuita. L'iscrizione però è obbligatoria, perché i posti sono limitati.",
  },
  {
    q: "Posso iscrivermi a una sola giornata?",
    a: `Sì. Puoi venire il ${FAQ_10.etichetta}, l'${FAQ_11.etichetta} o tutte e due le giornate: lo scegli nel modulo. Ogni giornata ha i suoi posti; se una è al completo puoi entrare in lista d'attesa, e ti scriviamo se si libera un posto.`,
  },
  {
    q: "Come si entra il giorno dell'evento?",
    a: "Dopo l'iscrizione ti arriva per email il biglietto, con un QR code personale. All'ingresso mostri il QR dal telefono o stampato; in alternativa basta il codice scritto sul biglietto. Il biglietto vale per le giornate che hai scelto.",
  },
  {
    q: "Non posso più venire: come libero il posto?",
    a: "Apri il biglietto online dal link nell'email di conferma e, per la giornata in cui non puoi esserci, usa «Libera il posto» nella sezione Gestisci la tua iscrizione. Il posto passa a chi è in lista d'attesa, oppure torna disponibile per chi si iscrive. Grazie: così può partecipare un'altra persona.",
  },
  {
    q: "Ho perso il biglietto o non trovo l'email: che cosa faccio?",
    a: "Controlla prima nella posta indesiderata o nella scheda Promozioni. Se non c'è, iscriviti di nuovo con la stessa email e lo stesso nome: non si crea un doppione, ti rimandiamo il biglietto con tutte le tue giornate.",
  },
  {
    q: "Sono un docente: come iscrivo la classe?",
    a: `Con la prenotazione per classe: una sola prenotazione per tutta la classe, fino a ${MAX_PERSONE_CLASSE} persone docenti compresi, senza dati degli studenti. Ti mandiamo per email un QR unico: all'ingresso lo mostri e la classe entra insieme. Gli studenti che vengono con la classe non devono iscriversi uno per uno. Per più classi fai una prenotazione per ciascuna; dal link nell'email puoi cambiare il numero di persone o annullare una giornata.`,
    link: { href: PAGINA_CLASSI, label: "Prenota per la classe" },
  },
  {
    q: "Posso iscrivere anche un'altra persona?",
    a: "Sì, con un'iscrizione separata e il suo indirizzo email. Il biglietto è personale: ogni email riceve il proprio, con il proprio QR.",
  },
  {
    q: "A chi è rivolto?",
    a: "A tutte le persone interessate a sport, salute e intelligenza artificiale: famiglie, studenti, docenti e scuole, istituzioni, startup, investitori e partner.",
  },
  {
    q: "Possono partecipare gli studenti universitari?",
    a: "Sì, come pubblico e, in più, con un bando dedicato. Il percorso “Biotecnologie e Intelligenza Artificiale” è gratuito ed è aperto agli studenti iscritti a corsi di laurea triennale, magistrale, a ciclo unico, dottorato di ricerca o altri percorsi post-universitari, presso università italiane o straniere. Ci si candida individualmente e i team di lavoro si costituiscono in un secondo momento.",
    link: { href: `/eventi/${EVENT_SLUG}/universita`, label: "Leggi il bando per gli universitari" },
  },
  {
    q: "Come faccio a presentare la mia startup nello Showcase dell'11 dicembre?",
    a: "Lo Showcase ha un bando di partecipazione dedicato: una selezione pubblica aperta a team di ricerca, spin-off universitari, startup, PMI innovative e imprese, con tre categorie, un premio per ciascuna e fino a 15 progetti sul palco. Termini, requisiti e criteri sono nella pagina del bando. Iscriversi all'evento e candidarsi al bando sono due cose distinte: chi presenta un progetto si iscrive comunque alla giornata dell'11 dicembre.",
    link: { href: `/eventi/${EVENT_SLUG}/bando`, label: "Leggi il bando dello Showcase" },
  },
  {
    q: "Durante l'evento si fanno foto e video?",
    a: "Sì. Fondazione bioERGOtech e SafesPro realizzano foto, video, registrazioni audio e interviste in entrambe le giornate; non sono previste dirette streaming. Per gli studenti che partecipano al convegno valgono le scelte espresse nei moduli raccolti dalla scuola, e non pubblichiamo intenzionalmente immagini riconoscibili di minori presenti nel pubblico senza autorizzazione.",
    link: { href: "/eventi/vivere-piu-a-lungo/informativa-immagini", label: "Leggi l'informativa su foto e video" },
  },
];
