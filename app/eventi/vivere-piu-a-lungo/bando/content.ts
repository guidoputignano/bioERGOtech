/**
 * Punto UNICO di configurazione del bando "Showcase di Innovazione".
 *
 * Rispecchia il testo ufficiale del bando indetto da Fondazione bioERGOtech
 * e SafesPro per la seconda giornata dell'evento "Vivere più a lungo: sport
 * e intelligenza artificiale" (11 dicembre 2026, Teatro Fusco, Taranto).
 *
 * Qui vivono categorie, ambiti tematici, calendario, criteri di valutazione,
 * premi e testi delle dichiarazioni. La pagina pubblica, il form, l'API e
 * l'email di conferma leggono tutti da questo file: cambiare una data o un
 * punteggio qui li aggiorna ovunque.
 */

import { ARCHIVE_MODE, EVENT_SLUG, SITE_URL } from "../content";

export { ARCHIVE_MODE, EVENT_SLUG, SITE_URL };

/** Slug della sotto rotta pubblica: /eventi/vivere-piu-a-lungo/bando */
export const BANDO_SLUG = "bando";

/**
 * Bucket privato degli allegati, creato dalla migrazione del bando. Vive qui
 * e non fra gli helper server perché il browser ne ha bisogno: il file va da
 * lui a Supabase Storage senza passare dalle nostre funzioni serverless.
 */
export const BANDO_BUCKET = "bando-candidature";

export const BANDO_PATH = `/eventi/${EVENT_SLUG}/${BANDO_SLUG}`;

export const BANDO = {
  occhiello: "Fondazione bioERGOtech e SafesPro",
  titolo: "Showcase di Innovazione: startup, spin-off e nuove imprese",
  sottotitolo:
    "Selezione pubblica per l'accesso allo Showcase di Innovazione nell'ambito dell'evento \"Vivere più a lungo: sport e intelligenza artificiale\".",
  luogo: "Teatro Fusco, Taranto",
  dataLabel: "Venerdì 11 dicembre 2026",
  orarioLabel: "9:00 . 13:00",
  /** Numero massimo di progetti ammessi alla presentazione dal vivo (art. 6). */
  postiTotali: 15,
  emanato: "Taranto, 31 luglio 2026",
} as const;

/* ── Finestra di candidatura (art. 5) ─────────────────────────────────── */

/**
 * Apertura e chiusura delle candidature, dal calendario ufficiale.
 * Fuso orario esplicito: il 1 settembre l'Italia è in ora legale (+02:00),
 * il 31 ottobre 2026 è già tornata in ora solare (+01:00).
 */
export const CANDIDATURE_APERTURA_ISO = "2026-09-01T00:00:00+02:00";
export const CANDIDATURE_SCADENZA_ISO = "2026-10-31T23:59:59+01:00";

export const CANDIDATURE_APERTURA_LABEL = "1 settembre 2026";
export const CANDIDATURE_SCADENZA_LABEL = "31 ottobre 2026, ore 23:59";

/**
 * Apre il form prima della data ufficiale. Serve solo se gli organizzatori
 * decidono di anticipare la raccolta delle candidature rispetto al calendario
 * pubblicato. Lasciato a false, il sito resta allineato al bando.
 *
 * Lo staff con ruolo admin vede e usa il form anche a finestra chiusa, senza
 * bisogno di questa flag: serve per provare il flusso end to end.
 */
export const FORZA_APERTURA = false;

export type StatoCandidature = "non_aperto" | "aperto" | "chiuso";

/** Stato della finestra di candidatura in un dato istante. */
export function statoCandidature(now: Date = new Date()): StatoCandidature {
  if (ARCHIVE_MODE) return "chiuso";
  if (FORZA_APERTURA) return "aperto";
  const t = now.getTime();
  if (t < new Date(CANDIDATURE_APERTURA_ISO).getTime()) return "non_aperto";
  if (t > new Date(CANDIDATURE_SCADENZA_ISO).getTime()) return "chiuso";
  return "aperto";
}

/* ── Art. 2. Categorie di partecipazione ──────────────────────────────── */

export type CategoriaBandoId = "A" | "B" | "C";

export type CategoriaBando = {
  id: CategoriaBandoId;
  stadio: string;
  /** Etichetta compatta per select ed elenchi. */
  label: string;
  chiPuoCandidarsi: string;
  /** Formato del pitch dal vivo (art. 6). */
  progettiAmmessi: string;
  durataPitch: string;
  domande: string;
};

export const CATEGORIE_BANDO: CategoriaBando[] = [
  {
    id: "A",
    stadio: "Ideazione",
    label: "A . Ideazione",
    chiPuoCandidarsi:
      "Team informali, gruppi di ricerca, spin-off in costituzione e progetti che non hanno ancora costituito una società. Il progetto è a livello di concetto, studio di fattibilità o proof of concept.",
    progettiAmmessi: "fino a 6",
    durataPitch: "3 minuti",
    domande: "2 minuti",
  },
  {
    id: "B",
    stadio: "Creazione d'impresa",
    label: "B . Creazione d'impresa",
    chiPuoCandidarsi:
      "Società costituite da non più di 36 mesi alla data di scadenza delle candidature, con prototipo o MVP realizzato o in avanzato sviluppo, che non hanno chiuso raccolte di capitale superiori a 500.000 euro complessivi.",
    progettiAmmessi: "fino a 5",
    durataPitch: "5 minuti",
    domande: "3 minuti",
  },
  {
    id: "C",
    stadio: "Impresa con raccolta di capitale",
    label: "C . Impresa con raccolta di capitale",
    chiPuoCandidarsi:
      "Società già operative che hanno chiuso una o più raccolte di capitale per un totale pari o superiore a 500.000 euro, oppure che presentano ricavi consolidati, e che sono in cerca di partnership industriali, validazione clinica o di un nuovo round.",
    progettiAmmessi: "fino a 4",
    durataPitch: "7 minuti",
    domande: "3 minuti",
  },
];

export const categoriaBando = (id: string): CategoriaBando | undefined =>
  CATEGORIE_BANDO.find((c) => c.id === id);

export const categoriaBandoLabel = (id: string): string =>
  categoriaBando(id)?.label ?? id;

/** Soglia che separa le realtà seed-stage da quelle in Series A e successive. */
export const SOGLIA_RACCOLTA_EUR = 500_000;

/** Mesi massimi dalla costituzione per la categoria B, alla scadenza del bando. */
export const CATEGORIA_B_MESI_MAX = 36;

/** Strumenti che concorrono al computo della raccolta (art. 2). */
export const STRUMENTI_RACCOLTA = [
  { value: "equity", label: "Equity" },
  { value: "venture_debt", label: "Venture debt" },
  { value: "convertibili", label: "Strumenti convertibili" },
  { value: "grant", label: "Sovvenzioni competitive erogate o deliberate" },
] as const;

/** Che cosa cerca chi si candida in categoria C (art. 2). */
export const OBIETTIVI_CATEGORIA_C = [
  { value: "partnership", label: "Partnership industriali" },
  { value: "validazione_clinica", label: "Validazione clinica" },
  { value: "nuovo_round", label: "Nuovo round di raccolta" },
] as const;

/** Stadio del progetto in categoria A (art. 2). */
export const STADI_CATEGORIA_A = [
  { value: "concetto", label: "Concetto" },
  { value: "fattibilita", label: "Studio di fattibilità" },
  { value: "proof_of_concept", label: "Proof of concept" },
] as const;

/* ── Art. 4. Ambiti tematici ──────────────────────────────────────────── */

export const AMBITI = [
  {
    value: "biotecnologie",
    icona: "fa-dna",
    label: "Biotecnologie per la salute",
    desc: "Biotecnologie applicate alla salute, alla diagnostica e alla medicina rigenerativa.",
  },
  {
    value: "intelligenza_artificiale",
    icona: "fa-brain",
    label: "Intelligenza artificiale",
    desc: "IA per la prevenzione, la diagnosi precoce e la gestione del dato sanitario.",
  },
  {
    value: "robotica_dispositivi",
    icona: "fa-robot",
    label: "Robotica e dispositivi medici",
    desc: "Robotica, dispositivi medici e tecnologie per la riabilitazione e il recupero funzionale.",
  },
  {
    value: "longevita",
    icona: "fa-heart-pulse",
    label: "Longevità e medicina dello sport",
    desc: "Longevità, invecchiamento in salute e medicina dello sport.",
  },
  {
    value: "sport",
    icona: "fa-person-running",
    label: "Sport e prevenzione dell'infortunio",
    desc: "Sport, misura del gesto atletico, prevenzione dell'infortunio e ritorno all'attività.",
  },
  {
    value: "inclusione",
    icona: "fa-universal-access",
    label: "Inclusione e tecnologie assistive",
    desc: "Inclusione, disabilità e tecnologie assistive.",
  },
  {
    value: "automazione_laboratorio",
    icona: "fa-flask",
    label: "Automazione di laboratorio",
    desc: "Automazione di laboratorio, strumenti per la ricerca e infrastrutture abilitanti.",
  },
] as const;

export type AmbitoValue = (typeof AMBITI)[number]["value"];

export const ambitoLabel = (value: string): string =>
  AMBITI.find((a) => a.value === value)?.label ?? value;

/* ── Art. 5. Allegati richiesti ───────────────────────────────────────── */

/** Dimensione massima per allegato, in byte. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_LABEL = "10 MB";

/** Numero massimo di allegati facoltativi. */
export const MAX_FILE_EXTRA = 3;

export type CampoAllegato =
  | "descrizione"
  | "pitch_deck"
  | "documentazione"
  | "prospetto"
  | "extra";

export type Allegato = {
  campo: CampoAllegato;
  titolo: string;
  desc: string;
  /** Categorie per cui l'allegato è obbligatorio. Vuoto: sempre facoltativo. */
  obbligatorioPer: CategoriaBandoId[];
  multiplo?: boolean;
};

export const ALLEGATI: Allegato[] = [
  {
    campo: "descrizione",
    titolo: "Descrizione del progetto",
    desc: "Massimo tre pagine, con problema affrontato, soluzione, stato di avanzamento, impatto atteso e aspetti etici connessi. Le stesse voci sono richieste anche nei campi di testo qui sopra: il PDF le sviluppa.",
    obbligatorioPer: ["A", "B", "C"],
  },
  {
    campo: "pitch_deck",
    titolo: "Pitch deck",
    desc: "Massimo dieci slide, nella versione che sarà utilizzata in caso di ammissione.",
    obbligatorioPer: ["A", "B", "C"],
  },
  {
    campo: "documentazione",
    titolo: "Documentazione societaria",
    desc: "Visura camerale aggiornata e compagine sociale. Richiesta per le categorie B e C.",
    obbligatorioPer: ["B", "C"],
  },
  {
    campo: "prospetto",
    titolo: "Prospetto della raccolta",
    desc: "Sintesi dei round chiusi, importi, tipologia degli strumenti e destinazione dei proventi. Richiesto per la sola categoria C.",
    obbligatorioPer: ["C"],
  },
  {
    campo: "extra",
    titolo: "Materiale facoltativo",
    desc: `Pubblicazioni scientifiche, brevetti depositati o concessi, lettere di intenti. Fino a ${MAX_FILE_EXTRA} file.`,
    obbligatorioPer: [],
    multiplo: true,
  },
];

export const allegatiPerCategoria = (categoria: CategoriaBandoId): Allegato[] =>
  ALLEGATI.filter(
    (a) => a.obbligatorioPer.length === 0 || a.obbligatorioPer.includes(categoria),
  );

export const allegatoObbligatorio = (
  a: Allegato,
  categoria: CategoriaBandoId,
): boolean => a.obbligatorioPer.includes(categoria);

/** Durata massima del video dimostrativo facoltativo (art. 5). */
export const VIDEO_DURATA_MAX = "due minuti";

/* ── Art. 5. Calendario ───────────────────────────────────────────────── */

export const CALENDARIO = [
  { fase: "Apertura delle candidature", data: CANDIDATURE_APERTURA_LABEL },
  { fase: "Termine per la presentazione", data: CANDIDATURE_SCADENZA_LABEL },
  { fase: "Istruttoria di ammissibilità", data: "1 . 10 novembre 2026" },
  { fase: "Comunicazione degli ammessi allo Showcase", data: "entro il 20 novembre 2026" },
  { fase: "Consegna dei materiali definitivi", data: "entro il 4 dicembre 2026" },
  { fase: "Showcase e premiazione", data: "11 dicembre 2026, Teatro Fusco, Taranto" },
] as const;

/* ── Art. 3. Requisiti di ammissibilità ───────────────────────────────── */

export const REQUISITI = [
  "Coerenza del progetto con almeno uno degli ambiti tematici del bando.",
  "Presenza di un referente di progetto maggiorenne, che cura i rapporti con gli organizzatori.",
  "Disponibilità di almeno un componente del team a essere fisicamente presente a Taranto l'11 dicembre 2026 per la presentazione dal vivo.",
  "Per le categorie B e C, regolarità della società e assenza di procedure concorsuali in corso.",
  "Trasmissione della documentazione completa entro i termini previsti.",
] as const;

/* ── Art. 7. Cosa offre il bando ─────────────────────────────────────── */

export const COSA_OFFRE = [
  {
    icona: "fa-microphone-lines",
    titolo: "Un palcoscenico pubblico",
    desc: "Davanti a investitori, partner industriali, clinici e istituzioni, senza alcun costo di partecipazione.",
  },
  {
    icona: "fa-globe",
    titolo: "La rete della Fondazione",
    desc: "Confronto diretto con la rete che opera tra Taranto, Zurigo e Riyadh, e con i relatori delle due giornate.",
  },
  {
    icona: "fa-bullhorn",
    titolo: "Visibilità",
    desc: "Sui materiali dell'evento e sui canali ufficiali di Fondazione bioERGOtech e SafesPro.",
  },
  {
    icona: "fa-flask-vial",
    titolo: "I servizi dell'ecosistema",
    desc: "Laboratorio Distribuito, Startup Hub, rete di advisor e supporto ai bandi regionali NIDI, Mini-PIA e PIA.",
  },
  {
    icona: "fa-arrow-trend-up",
    titolo: "Il flusso di opportunità",
    desc: "Inserimento nel canale della Fondazione verso incubatori, acceleratori e partner clinici.",
  },
] as const;

/* ── Art. 8. Premi ────────────────────────────────────────────────────── */

export const PREMI = [
  {
    categoria: "A" as const,
    stadio: "Ideazione",
    desc: "Percorso di accompagnamento di dodici mesi della Fondazione: mentorship scientifica dedicata, accesso al Laboratorio Distribuito, supporto di grant writing nell'ambito del ciclo Project Genesis per la partecipazione a bandi di ricerca e membership gratuita della Fondazione.",
  },
  {
    categoria: "B" as const,
    stadio: "Creazione d'impresa",
    desc: "Residenza di dodici mesi presso lo Startup Hub bioERGOtech di Taranto, con accesso alle strutture di prototipazione, supporto amministrativo e legale, accompagnamento ai programmi di incentivo regionale NIDI, Mini-PIA e PIA e membership gratuita della Fondazione.",
  },
  {
    categoria: "C" as const,
    stadio: "Raccolta di capitale",
    desc: "Programma di introduzione a investitori e partner industriali della rete della Fondazione, con accesso al percorso di validazione clinica presso le strutture partner e membership della Fondazione per un anno.",
  },
] as const;

/* ── Art. 9. Criteri di valutazione ───────────────────────────────────── */

export type Criterio = { criterio: string; punti: number; desc: string };

export const CRITERI: Record<CategoriaBandoId, Criterio[]> = {
  A: [
    { criterio: "Innovatività e originalità", punti: 30, desc: "Grado di novità della soluzione rispetto allo stato dell'arte scientifico e tecnologico." },
    { criterio: "Solidità scientifica", punti: 25, desc: "Fondatezza dell'ipotesi, qualità delle evidenze preliminari e fattibilità tecnica." },
    { criterio: "Bisogno clinico o di mercato", punti: 20, desc: "Chiarezza del problema affrontato e rilevanza del beneficio atteso." },
    { criterio: "Team e competenze", punti: 15, desc: "Completezza delle competenze rispetto agli obiettivi dichiarati e capacità di lavoro in squadra." },
    { criterio: "Qualità della presentazione", punti: 10, desc: "Chiarezza, efficacia comunicativa e capacità di sintesi nell'esposizione." },
  ],
  B: [
    { criterio: "Grado di validazione", punti: 25, desc: "Stato del prototipo o dell'MVP, dati sperimentali raccolti e riscontri dai primi utilizzatori." },
    { criterio: "Modello di business", punti: 25, desc: "Sostenibilità economica, struttura dei costi e dei ricavi, percorso verso il mercato." },
    { criterio: "Innovatività e difendibilità", punti: 20, desc: "Novità della soluzione e strategia di tutela della proprietà intellettuale." },
    { criterio: "Team e capacità esecutiva", punti: 20, desc: "Solidità della compagine, risultati conseguiti rispetto al piano e capacità di eseguire." },
    { criterio: "Qualità della presentazione", punti: 10, desc: "Chiarezza, efficacia comunicativa e capacità di sintesi nell'esposizione." },
  ],
  C: [
    { criterio: "Trazione dimostrata", punti: 30, desc: "Ricavi, clienti, partnership industriali e risultati di validazione clinica già conseguiti." },
    { criterio: "Scalabilità e go-to-market", punti: 25, desc: "Replicabilità del modello, strategia commerciale e accesso ai mercati di riferimento." },
    { criterio: "Solidità finanziaria", punti: 20, desc: "Coerenza tra raccolta effettuata, impiego dei proventi e piano di sviluppo dichiarato." },
    { criterio: "Impatto e radicamento", punti: 15, desc: "Beneficio atteso su salute, longevità e sport, e ricadute potenziali sul territorio." },
    { criterio: "Qualità della presentazione", punti: 10, desc: "Chiarezza, efficacia comunicativa e capacità di sintesi nell'esposizione." },
  ],
};

/** Criterio che decide a parità di punteggio complessivo (art. 9). */
export const CRITERIO_DIRIMENTE: Record<CategoriaBandoId, string> = {
  A: "Innovatività e originalità",
  B: "Grado di validazione",
  C: "Trazione dimostrata",
};

/** Punteggio minimo sotto il quale il premio di categoria non viene assegnato. */
export const PUNTEGGIO_MINIMO = 60;
export const PUNTEGGIO_MASSIMO = 100;

/* ── Art. 10. Commissione ─────────────────────────────────────────────── */

export const COMMISSIONE = [
  "Un rappresentante della direzione scientifica di Fondazione bioERGOtech, con funzioni di Presidente.",
  "Un rappresentante di SafesPro, in qualità di ente organizzatore.",
  "Uno o più rappresentanti del mondo degli investimenti, da fondi di venture capital, business angel o strumenti di finanza per l'innovazione.",
  "Uno o più rappresentanti del mondo dell'impresa e dei partner industriali della Fondazione.",
  "Uno o più esperti dal mondo della ricerca scientifica e universitaria in biotecnologie, robotica e intelligenza artificiale.",
  "Un rappresentante del mondo clinico, per la rilevanza sanitaria delle soluzioni proposte.",
  "Un rappresentante delle istituzioni locali o del sistema camerale, con funzioni consultive e senza diritto di voto.",
] as const;

/* ── Art. 12. Contatti ────────────────────────────────────────────────── */

export const CONTATTI = {
  fondazione: { ruolo: "Referente Fondazione bioERGOtech", nome: "Guido Putignano", email: "info@bioergotech.org" },
  organizzazione: { ruolo: "Referente Organizzazione (SafesPro)", email: "info@altaformazioneprofessionisti.it" },
  telefono: {
    numero: "347 7320692",
    riferimento:
      "Avv. Domenica Leone, Direttore della Scuola di Alta Formazione e Studi Specializzati per Professionisti (SafesPro) e Vice Presidente di Fondazione bioERGOtech.",
  },
  sede: "Via Ciro Giovinazzi 70, 74123 Taranto",
} as const;

/* ── Dichiarazioni e consensi registrati a database ───────────────────── */

export const DICHIARAZIONE_VERIDICITA_TESTO =
  "Dichiaro che i dati e le informazioni forniti in questa candidatura sono veritieri e completi, e mi impegno a comunicare tempestivamente ogni variazione rilevante.";

export const DICHIARAZIONE_ACCETTAZIONE_TESTO =
  "Ho letto il bando in ogni sua parte e ne accetto integralmente le disposizioni, comprese l'insindacabilità delle valutazioni della Commissione e la facoltà degli organizzatori di modificare il calendario o di non dare corso alla procedura.";

export const DICHIARAZIONE_PUBBLICITA_TESTO =
  "Prendo atto che lo Showcase si svolge in seduta pubblica, può essere oggetto di ripresa audiovisiva e di diffusione, e che gli organizzatori non sottoscrivono accordi di riservatezza per la fase di presentazione. Mi impegno a non divulgare informazioni coperte da segreto industriale o suscettibili di pregiudicare la brevettabilità della mia soluzione.";

export const DICHIARAZIONE_CONCORSUALI_TESTO =
  "Dichiaro che la società è regolarmente costituita e non è sottoposta a procedure concorsuali in corso.";

export const CONSENSO_PRIVACY_BANDO_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali ai sensi del Regolamento (UE) 2016/679, per le sole finalità connesse alla gestione del bando e dell'evento.";

export const CONSENSO_MARKETING_BANDO_TESTO =
  "Acconsento a ricevere comunicazioni e materiale informativo della Fondazione bioERGOtech sulle sue iniziative, eventi e attività. Potrò revocare il consenso in qualsiasi momento.";

/* ── Stati dell'istruttoria (art. 9 e 10) ─────────────────────────────── */

export const STATI_CANDIDATURA = [
  { value: "ricevuta", label: "Ricevuta", colore: "#4A5568" },
  { value: "in_valutazione", label: "In valutazione", colore: "#2B6CB0" },
  { value: "ammessa", label: "Ammessa allo Showcase", colore: "#008F6B" },
  { value: "non_ammessa", label: "Non ammessa", colore: "#B7791F" },
  { value: "area_espositiva", label: "Area espositiva", colore: "#6B46C1" },
  { value: "ritirata", label: "Ritirata", colore: "#8896A6" },
] as const;

export type StatoCandidatura = (typeof STATI_CANDIDATURA)[number]["value"];

export const statoLabel = (value: string): string =>
  STATI_CANDIDATURA.find((s) => s.value === value)?.label ?? value;

export const statoColore = (value: string): string =>
  STATI_CANDIDATURA.find((s) => s.value === value)?.colore ?? "#4A5568";

/* ── FAQ specifiche del bando ─────────────────────────────────────────── */

export const FAQ_BANDO = [
  {
    q: "Quanto costa candidarsi?",
    a: "Nulla. La partecipazione è gratuita e non comporta alcun onere a carico dei proponenti.",
  },
  {
    q: "Posso candidarmi se non ho ancora costituito una società?",
    a: "Sì. La categoria A è pensata proprio per team informali, gruppi di ricerca e spin-off in costituzione, con il progetto a livello di concetto, studio di fattibilità o proof of concept.",
  },
  {
    q: "Come faccio a sapere in quale categoria rientro?",
    a: "Se non hai una società, sei in A. Se la società ha meno di 36 mesi e non ha superato i 500.000 euro di raccolta complessiva, sei in B. Se hai chiuso raccolte pari o superiori a 500.000 euro oppure hai ricavi consolidati, sei in C. Nel computo rientrano equity, venture debt, strumenti convertibili e sovvenzioni competitive già erogate o deliberate. Se la Commissione ritiene che ricorrano i presupposti per una categoria diversa, può riassegnare la candidatura e te lo comunica prima della valutazione.",
  },
  {
    q: "Ci sono limiti geografici?",
    a: "No. Il bando è aperto senza limiti di provenienza geografica. È però richiesto che almeno un componente del team sia fisicamente presente a Taranto l'11 dicembre 2026 per la presentazione dal vivo.",
  },
  {
    q: "Posso modificare la candidatura dopo l'invio?",
    a: "Sì, fino alla scadenza. Accedi al Member Portal con l'email del referente e reinvia il form con lo stesso nome del progetto: la candidatura viene aggiornata.",
  },
  {
    q: "Che cosa succede se non vengo ammesso alla presentazione dal vivo?",
    a: "Ai progetti non ammessi al palco può essere offerta, ove disponibile, la partecipazione all'area espositiva dell'evento.",
  },
  {
    q: "I miei dati e le mie idee sono protetti?",
    a: "La documentazione trasmessa è trattata in via riservata dalla Commissione e usata solo ai fini della valutazione. La partecipazione non comporta alcun trasferimento di proprietà intellettuale. Lo Showcase si svolge però in seduta pubblica e può essere ripreso: non divulgare dal palco informazioni coperte da segreto industriale o che possano pregiudicare la brevettabilità.",
  },
  {
    q: "Firmate un NDA?",
    a: "No. Gli organizzatori non sottoscrivono accordi di riservatezza per la fase di presentazione pubblica.",
  },
] as const;
