/**
 * Bando "Biotecnologie e Intelligenza Artificiale" per gli studenti
 * universitari, indetto da Fondazione bioERGOtech e SafesPro.
 *
 * Unico punto di configurazione della sottopagina, sullo stesso modello di
 * `licei/content.ts` e `bando/content.ts`. La fonte è il testo del bando del
 * 2 settembre 2026: qui gli articoli sono riportati uno per uno, e i
 * riferimenti nei commenti servono a ritrovare l'originale.
 *
 * Differenza sostanziale rispetto al bando dei licei: li aderisce l'istituto
 * tramite un docente referente, qui si candida il singolo studente. Non esiste
 * quindi un flusso "adesione della scuola", un codice d'istituto o un
 * referente che conferma: il destinatario è sempre e solo lo studente.
 */

import { ARCHIVE_MODE, EVENT_SLUG, SITE_URL } from "../content";

export { ARCHIVE_MODE, EVENT_SLUG, SITE_URL };

// Lo slug e il nome della cartella: senza accento, come l'URL.
export const UNIVERSITA_SLUG = "universita";

export const UNIVERSITA_PATH = `/eventi/${EVENT_SLUG}/${UNIVERSITA_SLUG}`;

/** Intestazione della pagina. Il sottotitolo è la sintesi dell'art. 1. */
export const UNIVERSITA = {
  occhiello: "Fondazione bioERGOtech e SafesPro . Bando per gli studenti universitari",
  titolo: "Biotecnologie e Intelligenza Artificiale",
  sottotitolo:
    "Un percorso formativo e progettuale gratuito per costruire, con il supporto di ricercatori e mentor, una proposta scientifica originale che integri biotecnologie e intelligenza artificiale.",
};

/** Voci della barra di navigazione della pagina. */
export const SEZIONI_UNIVERSITA = [
  { id: "premessa", label: "Il percorso" },
  { id: "destinatari", label: "Chi partecipa" },
  { id: "svolgimento", label: "Come funziona" },
  { id: "offre", label: "Cosa offre" },
  { id: "premio", label: "Premio" },
  { id: "criteri", label: "Criteri" },
  { id: "candidatura", label: "Candidati" },
  { id: "commissione", label: "Commissione" },
  { id: "pubblicazione", label: "Pubblicazione" },
  { id: "faq", label: "Domande" },
  { id: "contatti", label: "Contatti" },
] as const;

/* ── Stato delle candidature ───────────────────────────────────────────── */

/**
 * TODO: da confermare. Con `false` il modulo non compare e al suo posto la
 * pagina mostra il box di attesa con il contatto email.
 */
export const CANDIDATURE_UNIVERSITARI_APERTE = true;

/**
 * TODO: da confermare. L'art. 11 del bando rimanda i termini ai canali
 * ufficiali, quindi finche resta `null` la pagina non annuncia nessuna
 * scadenza e il modulo non si chiude da solo. Quando la data arriva, basta
 * valorizzarla e `candidatureAperte()` inizia a farla rispettare.
 */
export const SCADENZA_CANDIDATURE_UNIVERSITARI: {
  iso: string;
  label: string;
} | null = null;

export type StatoCandidatureUniversita = "aperte" | "chiuse" | "non_aperte";

/**
 * Stato effettivo delle candidature. A evento archiviato sono chiuse in ogni
 * caso; senza scadenza restano aperte finche il flag resta acceso.
 */
export function statoCandidatureUniversita(
  now: Date = new Date(),
): StatoCandidatureUniversita {
  if (ARCHIVE_MODE) return "chiuse";
  if (!CANDIDATURE_UNIVERSITARI_APERTE) return "non_aperte";
  if (
    SCADENZA_CANDIDATURE_UNIVERSITARI &&
    now.getTime() > new Date(SCADENZA_CANDIDATURE_UNIVERSITARI.iso).getTime()
  ) {
    return "chiuse";
  }
  return "aperte";
}

/* ── Art. 1. Premessa e finalità ───────────────────────────────────────── */

export const PREMESSA = [
  "La Fondazione bioERGOtech, con direzione scientifica, e SafesPro, Scuola di Alta Formazione e Studi Specializzati per Professionisti, in qualità di ente organizzatore, indicono il presente bando per la partecipazione degli studenti universitari al percorso formativo e progettuale gratuito “Biotecnologie e Intelligenza Artificiale”.",
  "Il progetto si inserisce nel percorso avviato con i Taranto Biotech Days 2024 e con l'evento tenutosi a Roma il 28 e 29 ottobre 2025 presso la Sala della Regina di Palazzo Montecitorio, e prosegue con l'iniziativa “Vivere più a lungo: sport e intelligenza artificiale”, nell'ottica di favorire, nel lungo periodo, l'insediamento di un centro di ricerca a Taranto.",
  "L'iniziativa nasce con l'obiettivo di creare un ponte tra formazione universitaria, ricerca scientifica, innovazione tecnologica e mondo dell'impresa, offrendo agli studenti la possibilità di approfondire le potenzialità dell'integrazione tra biotecnologie e intelligenza artificiale.",
  "Il percorso intende fornire ai partecipanti conoscenze e strumenti metodologici utili alla progettazione e allo sviluppo di una proposta scientifica originale, concreta e potenzialmente applicabile in ambito sanitario, ambientale, industriale o sportivo.",
  "Particolare attenzione sarà dedicata alla capacità degli studenti di lavorare secondo un approccio scientifico, interdisciplinare e orientato alla ricerca, con il supporto di ricercatori, docenti, professionisti e mentor provenienti dal mondo accademico e imprenditoriale.",
  "Obiettivo finale del percorso sarà l'elaborazione, da parte dei partecipanti, di un progetto scientifico originale, sotto forma di studio, proposta di ricerca, modello sperimentale o altra soluzione innovativa che integri biotecnologie e intelligenza artificiale.",
];

/* ── Art. 2. Destinatari ───────────────────────────────────────────────── */

/** I livelli di studio ammessi. Alimentano anche il menu del modulo. */
export const LIVELLI_STUDIO = [
  { value: "triennale", label: "Laurea triennale" },
  { value: "magistrale", label: "Laurea magistrale" },
  { value: "ciclo_unico", label: "Laurea a ciclo unico" },
  { value: "dottorato", label: "Dottorato di ricerca" },
  { value: "post_laurea", label: "Altro percorso post-universitario" },
] as const;

export type LivelloStudio = (typeof LIVELLI_STUDIO)[number]["value"];

export const livelloLabel = (v: string): string =>
  LIVELLI_STUDIO.find((l) => l.value === v)?.label ?? v;

/**
 * Le aree disciplinari dell'art. 2. L'elenco del bando è esplicitamente "a
 * titolo esemplificativo", quindi l'ultima voce resta aperta e nel modulo
 * apre un campo libero.
 */
export const AREE_DISCIPLINARI = [
  { value: "biotecnologie", label: "Biotecnologie" },
  { value: "scienze_biologiche", label: "Scienze biologiche" },
  { value: "medicina", label: "Medicina e professioni sanitarie" },
  { value: "farmacia", label: "Farmacia e discipline farmaceutiche" },
  { value: "chimica", label: "Chimica" },
  { value: "ingegneria", label: "Ingegneria" },
  { value: "informatica", label: "Informatica" },
  { value: "fisica", label: "Fisica" },
  { value: "scienze_ambientali", label: "Scienze ambientali" },
  { value: "scienze_motorie", label: "Scienze motorie e dello sport" },
  { value: "economia_innovazione", label: "Economia e management dell'innovazione" },
  { value: "altro", label: "Altra disciplina coerente con le finalità del progetto" },
] as const;

export type AreaDisciplinare = (typeof AREE_DISCIPLINARI)[number]["value"];

export const areaLabel = (v: string): string =>
  AREE_DISCIPLINARI.find((a) => a.value === v)?.label ?? v;

export const DESTINATARI_NOTE = [
  "Il percorso è rivolto agli studenti universitari iscritti a corsi di laurea triennale, magistrale, a ciclo unico, dottorato di ricerca o altri percorsi universitari e post-universitari, presso università italiane o straniere.",
  "È espressamente incoraggiata la partecipazione di team interdisciplinari, composti da studenti provenienti da differenti percorsi di studio, al fine di favorire l'integrazione tra competenze scientifiche, tecnologiche, cliniche, progettuali e manageriali.",
];

/**
 * Il punto che distingue questo bando da quello dei licei: ci si candida da
 * soli, i team si formano dopo.
 */
export const CANDIDATURA_INDIVIDUALE_NOTA =
  "La partecipazione è individuale nella fase di candidatura e potrà successivamente prevedere la costituzione di team di lavoro secondo modalità definite dagli organizzatori.";

/* ── Art. 3. Modalità di svolgimento ───────────────────────────────────── */

export const SVOLGIMENTO_NOTE = [
  "Il percorso sarà realizzato secondo le modalità definite dagli organizzatori e potrà prevedere attività formative online e in presenza, al di fuori degli ordinari impegni universitari.",
  "Le attività saranno svolte con il supporto di ricercatori, docenti universitari, esperti, professionisti e mentor provenienti dal mondo della ricerca, dell'innovazione e dell'impresa.",
];

/** I contenuti che il percorso potrà comprendere, art. 3. */
export const CONTENUTI_PERCORSO = [
  "Fondamenti e applicazioni delle biotecnologie",
  "Fondamenti e applicazioni dell'intelligenza artificiale",
  "Machine learning e analisi dei dati applicati alle scienze della vita",
  "Applicazioni dell'IA alla salute, alla longevità e allo sport",
  "Biotecnologie applicate alla medicina, all'ambiente e all'industria",
  "Metodologia della ricerca scientifica",
  "Progettazione di uno studio e definizione delle ipotesi di ricerca",
  "Analisi e interpretazione dei dati",
  "Valutazione della fattibilità tecnica e scientifica",
  "Aspetti etici, regolatori e di responsabilità nell'utilizzo dell'intelligenza artificiale e delle biotecnologie",
  "Metodologia di lavoro interdisciplinare e di team",
  "Elementi di comunicazione e divulgazione scientifica",
  "Struttura e redazione di un articolo scientifico",
  "Criteri di qualità e requisiti per la pubblicazione su riviste scientifiche",
];

/* ── Art. 4. Modalità di adesione ──────────────────────────────────────── */

/**
 * Quello che la candidatura "potrà prevedere" secondo l'art. 4, che lo dice
 * a titolo esemplificativo. Il modulo in pagina raccoglie solo la parte
 * leggera: qui l'elenco resta per trasparenza verso il candidato.
 */
export const CANDIDATURA_CONTENUTI = [
  "Dati anagrafici e universitari del candidato",
  "Corso di laurea o percorso di studi frequentato",
  "Curriculum vitae o breve profilo accademico",
  "Indicazione delle competenze scientifiche e tecnologiche possedute",
  "Breve descrizione degli interessi di ricerca",
  "Proposta preliminare di progetto",
  "Eventuale indicazione di altri studenti con i quali si intende costituire un team",
];

export const ADESIONE_NOTE = [
  "Gli organizzatori potranno procedere alla selezione dei partecipanti sulla base del numero di candidature ricevute e dei requisiti indicati nel bando.",
  "Nel caso di costituzione di team, sarà favorita, ove possibile, la formazione di gruppi caratterizzati da interdisciplinarità e complementarità delle competenze.",
];

/* ── Art. 5. Cosa offre il progetto ────────────────────────────────────── */

export const COSA_OFFRE = [
  {
    icona: "fa-graduation-cap",
    titolo: "Formazione avanzata",
    desc: "Un percorso sulle biotecnologie e sull'intelligenza artificiale, con i fondamenti e le applicazioni alle scienze della vita.",
  },
  {
    icona: "fa-comments",
    titolo: "Confronto con chi fa ricerca",
    desc: "La possibilità di confrontarsi con ricercatori, docenti, esperti e professionisti del settore.",
  },
  {
    icona: "fa-compass",
    titolo: "Mentoring",
    desc: "Attività di mentoring e accompagnamento alla progettazione scientifica lungo tutto il percorso.",
  },
  {
    icona: "fa-users-gear",
    titolo: "Un progetto in team",
    desc: "La possibilità di sviluppare un proprio progetto di ricerca insieme ad altri studenti, anche di altre discipline.",
  },
  {
    icona: "fa-flask",
    titolo: "Metodo della ricerca",
    desc: "L'opportunità di acquisire competenze nella metodologia della ricerca scientifica e nella valutazione della fattibilità.",
  },
  {
    icona: "fa-file-lines",
    titolo: "Scrittura scientifica",
    desc: "Formazione specifica sulla struttura e sulla redazione di un lavoro scientifico.",
  },
  {
    icona: "fa-chalkboard-user",
    titolo: "Presentazione alla commissione",
    desc: "La possibilità di presentare il proprio lavoro davanti a una commissione scientifica.",
  },
  {
    icona: "fa-book-open",
    titolo: "Percorso di valorizzazione",
    desc: "La possibilità di valorizzare il lavoro prodotto attraverso un successivo percorso di sottomissione a una rivista scientifica.",
  },
];

export const PARTECIPAZIONE_GRATUITA_NOTA =
  "La partecipazione al percorso è completamente gratuita.";

/* ── Art. 6. Premio e valorizzazione scientifica ───────────────────────── */

/**
 * TODO: testo premio da confermare.
 *
 * Unico punto in cui è descritto il premio: se la formula cambia, si cambia
 * qui e cambia ovunque, pagina del bando e pagina dell'evento comprese.
 *
 * Il bando originale parla di "rivista di fascia A". La dicitura non e usata
 * qui perché la classificazione in fasce dell'ANVUR riguarda le riviste
 * dell'area umanistica e sociale e non si applica alle scienze della vita,
 * dove il riferimento riconosciuto è l'indicizzazione. La formula sotto dice
 * la stessa cosa in modo verificabile.
 */
export const PREMIO_TESTO =
  "Il miglior progetto, individuato dalla Commissione di valutazione, sarà selezionato per un percorso finalizzato alla preparazione e alla proposta di pubblicazione del lavoro presso una rivista scientifica internazionale peer-reviewed, indicizzata Scopus o Web of Science, coerente con la tematica e la qualità scientifica del lavoro.";

export const PREMIO_SUPPORTO =
  "Il percorso potrà prevedere il supporto di esperti e mentor nella revisione scientifica e nella predisposizione del manoscritto secondo gli standard richiesti dalla rivista individuata.";

/**
 * Le condizioni dell'art. 6. Vanno mostrate con lo stesso rilievo del premio,
 * non in una nota a pie di pagina: la selezione non garantisce nulla.
 */
export const PREMIO_CONDIZIONI = [
  "Alla qualità scientifica effettiva del lavoro",
  "Alla verifica dei requisiti editoriali della rivista",
  "Alla completezza e correttezza metodologica del manoscritto",
  "All'eventuale necessita di ulteriori analisi, validazioni o approfondimenti",
  "Alla valutazione editoriale e al processo di peer review della rivista",
  "All'accettazione definitiva da parte della rivista",
];

export const PREMIO_NON_GARANZIA =
  "La selezione del progetto nell'ambito del presente bando non costituisce garanzia di pubblicazione, ma attribuisce al team vincitore la possibilità di intraprendere, con il supporto degli organizzatori e dei professionisti coinvolti, un percorso finalizzato alla sottomissione del lavoro a una rivista scientifica di rilievo.";

export const PREMIO_ULTERIORI =
  "Gli organizzatori potranno inoltre valutare, in funzione della qualità dei lavori presentati, la possibilità di accompagnare alla pubblicazione anche ulteriori progetti meritevoli.";

/* ── Art. 7. Criteri di valutazione ────────────────────────────────────── */

/** Cento punti in tutto. La somma e verificata nel test in fondo al file. */
export const CRITERI_UNIVERSITA = [
  {
    nome: "Innovativita e originalità scientifica",
    punti: 25,
    desc: "Grado di novità dell'ipotesi, dell'approccio o della soluzione proposta rispetto allo stato dell'arte.",
  },
  {
    nome: "Solidità scientifica e metodologica",
    punti: 25,
    desc: "Qualità dell'impostazione scientifica, metodologia, dati, analisi e coerenza delle conclusioni.",
  },
  {
    nome: "Impatto potenziale",
    punti: 20,
    desc: "Rilevanza e potenziale contributo in ambito sanitario, ambientale, industriale, sportivo o scientifico.",
  },
  {
    nome: "Integrazione tra biotecnologie e IA",
    punti: 15,
    desc: "Qualità e significatività dell'integrazione tra le due aree disciplinari.",
  },
  {
    nome: "Aspetti etici e responsabilità scientifica",
    punti: 10,
    desc: "Consapevolezza delle implicazioni etiche, normative e sociali connesse alla proposta.",
  },
  {
    nome: "Qualità della presentazione scientifica",
    punti: 5,
    desc: "Chiarezza, efficacia e capacità di comunicare il lavoro secondo criteri scientifici.",
  },
] as const;

export const PUNTEGGIO_MASSIMO = CRITERI_UNIVERSITA.reduce((t, c) => t + c.punti, 0);

/** Il criterio che decide a parita di punteggio, art. 7. */
export const CRITERIO_DIRIMENTE = "Innovativita e originalità scientifica";

export const REGOLA_PARITA = `A parita di punteggio complessivo prevale il progetto che ha ottenuto il punteggio più alto nel criterio “${CRITERIO_DIRIMENTE}”. In caso di ulteriore parita decide il voto insindacabile del Presidente della Commissione.`;

export const CRITERI_NOTE = [
  "La Commissione potrà tenere conto, ai fini della valutazione complessiva, anche della potenziale trasformazione del progetto in un articolo scientifico sottoponibile a peer review.",
  "Le valutazioni della Commissione sono insindacabili e non sono ammessi ricorsi.",
];

/* ── Art. 8. Commissione ───────────────────────────────────────────────── */

export const COMMISSIONE_COMPOSIZIONE = [
  "Un rappresentante della direzione scientifica di Fondazione bioERGOtech, con funzioni di Presidente",
  "Un rappresentante di SafesPro, in qualità di ente organizzatore",
  "Esperti esterni provenienti dal mondo della ricerca scientifica e universitaria nei settori delle biotecnologie e dell'intelligenza artificiale",
  "Ricercatori, docenti universitari o professionisti con comprovata esperienza nei settori oggetto del progetto",
  "Eventuali rappresentanti del mondo dell'impresa e dell'innovazione",
];

export const COMMISSIONE_PRINCIPI = [
  "Le sedute sono valide con la presenza della maggioranza dei membri con diritto di voto",
  "Le decisioni sono assunte a maggioranza dei presenti. In caso di parita prevale il voto del Presidente",
  "Ciascun componente è tenuto a dichiarare eventuali situazioni di conflitto di interesse rispetto a singoli progetti o team, astenendosi dalla relativa valutazione",
];

/* ── Art. 9. Presentazione dei lavori e percorso di pubblicazione ───────── */

export const PUBBLICAZIONE_INTRO =
  "Il progetto vincitore potrà essere presentato nell'ambito del convegno internazionale “Vivere più a lungo: sport e intelligenza artificiale”, che si svolgera il 10 dicembre 2026 presso il PalaMazzola di Taranto, e sarà avviato a un percorso di trasformazione in pubblicazione scientifica.";

export const PUBBLICAZIONE_SUPPORTO = [
  "Organizzazione e revisione",
  "Impostazione scientifica dell'articolo",
  "Definizione della struttura del paper",
  "Revisione della metodologia e della presentazione dei risultati",
  "Individuazione della rivista scientifica più appropriata",
  "Preparazione della documentazione necessaria alla sottomissione",
  "Eventuale gestione delle osservazioni ricevute durante il processo di revisione",
];

export const PUBBLICAZIONE_INTEGRITA =
  "Il percorso di pubblicazione sarà condotto nel rispetto dei principi di integrità scientifica, trasparenza, corretta attribuzione dei contributi e tutela della proprietà intellettuale.";

export const PUBBLICAZIONE_PROPRIETA =
  "Eventuali dati, risultati, invenzioni, software, materiali biologici o altri risultati suscettibili di tutela dovranno essere valutati preventivamente prima della divulgazione pubblica o della sottomissione a una rivista.";

/* ── Art. 10. Referenti e contatti ─────────────────────────────────────── */

export const CONTATTI_UNIVERSITA = {
  fondazione: {
    ruolo: "Referente Fondazione bioERGOtech",
    nome: "Guido Putignano",
    email: "info@bioergotech.org",
  },
  organizzazione: {
    ruolo: "Referente organizzazione, SafesPro",
    email: "info@altaformazioneprofessionisti.it",
  },
  telefono: {
    numero: "347 7320692",
    nome: "Avv. Domenica Leone",
    ruolo:
      "Direttore Scuola di Alta Formazione e Studi Specializzati per Professionisti, SafesPro, e Vice Presidente Fondazione bioERGOtech",
  },
};

/** Indirizzo del box di attesa e dei pulsanti di contatto. */
export const MAILTO_INFORMAZIONI =
  "mailto:info@bioergotech.org?subject=Bando%20studenti%20universitari%20-%20richiesta%20informazioni";

/* ── Art. 11. Disposizioni finali ──────────────────────────────────────── */

/**
 * Nel documento originale questo articolo e numerato di nuovo "Art. 10", per
 * un errore di numerazione. Sul sito e "Art. 11", che è la numerazione
 * corretta nella sequenza.
 */
export const DISPOSIZIONI_FINALI =
  "Il presente bando ha finalità esclusivamente informativa e di invito alla partecipazione. Eventuali ulteriori modalità operative, termini di scadenza per la presentazione delle candidature e documentazione di adesione saranno comunicati dagli organizzatori tramite i canali ufficiali di Fondazione bioERGOtech e SafesPro.";

export const BANDO_DATA = "Taranto, 2 settembre 2026";

/* ── Testi del modulo di pre-iscrizione ────────────────────────────────── */

export const ACCETTAZIONE_BANDO_TESTO =
  "Dichiaro di aver letto e di accettare integralmente il bando “Biotecnologie e Intelligenza Artificiale”.";

/**
 * TODO: verificare che l'informativa del sito, /legal/privacy, copra anche
 * questo trattamento: finalità della raccolta delle candidature universitarie
 * e tempi di conservazione dei dati. Il testo sotto ricalca quello già in uso
 * per il bando startup e per le iscrizioni dei licei, che rimandano alla
 * stessa informativa: se quella va integrata, va integrata una volta sola.
 */
export const CONSENSO_PRIVACY_UNIVERSITA_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali ai sensi del Regolamento (UE) 2016/679, per le sole finalità connesse alla gestione del bando.";

export const NOTA_INTERESSI =
  "Una riga basta. Serve solo a farsi un'idea di dove vorresti lavorare, non è una proposta di progetto.";

/**
 * TODO fase 2: se le candidature superano i posti, o quando i team dovranno
 * presentare il progetto, servira un secondo modulo con proposta di progetto
 * ed eventuale CV, sulla falsariga dell'art. 4. Non e costruito adesso di
 * proposito: questa e una raccolta di adesioni, non una selezione.
 */
export const MAX_INTERESSI = 300;

/* ── Domande frequenti ─────────────────────────────────────────────────── */

export const FAQ_UNIVERSITA = [
  {
    q: "Chi può candidarsi?",
    a: "Gli studenti universitari iscritti a corsi di laurea triennale, magistrale, a ciclo unico, dottorato di ricerca o altri percorsi universitari e post-universitari, presso università italiane o straniere. Le aree disciplinari elencate nel bando sono indicate a titolo esemplificativo: chi studia una materia coerente con le finalità del progetto può candidarsi.",
  },
  {
    q: "Mi candido da solo o con un gruppo?",
    a: "Da solo. La candidatura e individuale. I team di lavoro si costituiscono in un secondo momento, secondo modalità definite dagli organizzatori, e la formazione di gruppi interdisciplinari e esplicitamente incoraggiata.",
  },
  {
    q: "Quanto costa?",
    a: "Nulla. La partecipazione al percorso è completamente gratuita.",
  },
  {
    q: "Devo presentare un progetto per candidarmi?",
    a: "No. In questa fase serve solo una pre-iscrizione: chi sei, dove studi e su cosa ti piacerebbe lavorare. Il progetto si costruisce durante il percorso, con il supporto dei mentor.",
  },
  {
    q: "Il premio garantisce la pubblicazione?",
    a: "No. Il miglior progetto viene avviato a un percorso di preparazione e proposta di pubblicazione, ma la pubblicazione resta subordinata alla qualità del lavoro, ai requisiti della rivista, al processo di peer review e all'accettazione definitiva da parte della rivista stessa.",
  },
  {
    q: "Candidarsi al bando vale come iscrizione all'evento del 10 dicembre?",
    a: "No, sono due cose distinte. Chi si candida al bando deve comunque iscriversi separatamente alla giornata dalla pagina dell'evento.",
  },
];
