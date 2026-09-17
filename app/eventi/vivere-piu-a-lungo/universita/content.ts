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

/**
 * Voci della barra di navigazione della pagina.
 *
 * Gli `id` sono quelli delle sezioni: cambiarne uno qui senza cambiarlo nel
 * markup di `page.tsx` rompe l'ancora, e la barra continua a sembrare sana.
 */
export const SEZIONI_UNIVERSITA = [
  { id: "premessa", label: "Il percorso" },
  { id: "destinatari", label: "Chi partecipa" },
  { id: "svolgimento", label: "Come funziona" },
  { id: "corso", label: "Il corso" },
  { id: "offre", label: "Cosa offre" },
  { id: "mentor", label: "Mentor" },
  { id: "premio", label: "Premio" },
  { id: "criteri", label: "Criteri" },
  { id: "candidatura", label: "Candidati" },
  { id: "team", label: "Squadre" },
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
 * L'informativa del sito, /legal/privacy, copre questo trattamento: la
 * categoria "Partecipanti al percorso universitario" elenca l'account, il
 * progresso sul corso, la squadra, il progetto e la bacheca, e la tabella
 * delle finalità ne indica la base giuridica. Era un TODO aperto da quando
 * il modulo è nato, ed è stato chiuso con la fase 2, che è il momento in
 * cui quei dati hanno iniziato a esistere davvero.
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

/* ═══════════════════════════════════════════════════════════════════════
   Fase 2. Dal modulo ricevuto al percorso vero

   Tutto quello che sta sopra descrive un bando. Quello che segue lo fa
   accadere: l'accesso al corso, le squadre, la bacheca di chi cerca
   compagni, la consegna, le schede della Commissione e il registro dei
   mentor.

   Le differenze di fondo rispetto al modulo gemello dei licei sono tre, e
   ritornano in quasi ogni costante di questo blocco:

     1. non esiste l'istituto, quindi una squadra puo attraversare due
        atenei e due discipline, ed e esattamente cio che l'art. 2 chiede;
     2. non esiste il docente referente, quindi chi apre la porta di una
        squadra e il suo capitano e non un adulto esterno;
     3. i candidati sono maggiorenni, quindi una bacheca fra partecipanti e
        possibile, a consenso esplicito e revocabile.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Percorsi delle pagine del modulo ─────────────────────────────────── */

export const CORSO_PATH = "/courses/agentic-ai";
export const STUDENTE_PATH = `${UNIVERSITA_PATH}/studente`;
export const COMMISSIONE_PATH = `${UNIVERSITA_PATH}/commissione`;
export const ADMIN_PATH = `${UNIVERSITA_PATH}/admin`;
export const MENTOR_PATH = `${UNIVERSITA_PATH}/mentor`;
export const MENTOR_CANDIDATURA_PATH = `${MENTOR_PATH}/candidatura`;
export const GUIDA_PATH = `${UNIVERSITA_PATH}/guida`;

/* ── Stato della candidatura ──────────────────────────────────────────── */

/**
 * Nei licei e il docente referente a dire "questo ragazzo e mio", e senza
 * quella conferma lo studente non fa niente. Qui il referente non c'e, e il
 * suo posto lo prende questo stato, che lo staff controlla dal pannello.
 *
 * Il default a database e `candidata`, ma la rotta di pre-iscrizione scrive
 * `confermata` finche la chiave `conferma_automatica` resta a `si`. Non e
 * una contraddizione: il default protegge le righe scritte a mano o da una
 * futura importazione, l'interruttore decide il caso normale. Lo staff lo
 * spegne solo se l'art. 4 va davvero esercitato, cioe se le candidature
 * superano i posti.
 */
export const STATI_CANDIDATURA = [
  { value: "candidata", label: "Candidata", colore: "#8A6100" },
  { value: "confermata", label: "Nel percorso", colore: "#0A7A66" },
  { value: "esclusa", label: "Esclusa", colore: "#8896A6" },
] as const;

export type StatoCandidatura = (typeof STATI_CANDIDATURA)[number]["value"];

export const statoCandidaturaLabel = (v: string): string =>
  STATI_CANDIDATURA.find((s) => s.value === v)?.label ?? v;

export const statoCandidaturaColore = (v: string): string =>
  STATI_CANDIDATURA.find((s) => s.value === v)?.colore ?? "#4A5568";

/* ── Interruttori delle fasi ──────────────────────────────────────────── */

/**
 * Ogni fase ha il suo stato e parte chiusa. Si aprono in ordine e a mano:
 * aprire le consegne prima che esistano le squadre, o la valutazione prima
 * che esistano i progetti, produce schermate senza niente da mostrare a chi
 * le apre.
 *
 * I valori veri vivono in `universita_config` e si cambiano dal pannello
 * staff. Questi sono i fallback per quando la tabella non risponde, e sono
 * i piu prudenti possibili: a database irraggiungibile non si apre niente.
 */
export type StatoSquadre = "chiuse" | "aperte";
export type StatoBoard = "chiusa" | "aperta";
export type StatoConsegne = "chiuse" | "aperte";
export type StatoValutazione = "chiusa" | "aperta";
export type ConfermaAutomatica = "si" | "no";

export const STATO_SQUADRE_DEFAULT: StatoSquadre = "chiuse";
export const STATO_BOARD_DEFAULT: StatoBoard = "chiusa";
export const STATO_CONSEGNE_DEFAULT: StatoConsegne = "chiuse";
export const STATO_VALUTAZIONE_DEFAULT: StatoValutazione = "chiusa";
export const CONFERMA_AUTOMATICA_DEFAULT: ConfermaAutomatica = "si";

export const squadreAperteUniversita = (stato: StatoSquadre): boolean =>
  !ARCHIVE_MODE && stato === "aperte";

export const boardApertaUniversita = (stato: StatoBoard): boolean =>
  !ARCHIVE_MODE && stato === "aperta";

export const consegneAperteUniversita = (stato: StatoConsegne): boolean =>
  !ARCHIVE_MODE && stato === "aperte";

export const valutazioneApertaUniversita = (stato: StatoValutazione): boolean =>
  !ARCHIVE_MODE && stato === "aperta";

/** Le chiavi previste in `universita_config`, con il loro significato. */
export const CONFIG_CHIAVI_UNIVERSITA = {
  conferma_automatica:
    "Con 'si' una nuova candidatura entra subito nel percorso. Con 'no' resta in attesa che lo staff la confermi, una per una.",
  stato_squadre: "Formazione delle squadre: chiuse oppure aperte.",
  stato_board:
    "Bacheca di chi cerca compagni di squadra: chiusa oppure aperta. Ha senso aprirla insieme alle squadre, o poco prima.",
  stato_consegne: "Consegna dei progetti: chiuse oppure aperte.",
  scadenza_consegna_label:
    "Termine per la consegna dei progetti, in chiaro. Vuoto finché non è stato fissato.",
  stato_valutazione: "Schede della Commissione: chiusa oppure aperta.",
  avviso: "Riga di avviso mostrata in cima alla pagina del bando. Vuota per non mostrarla.",
} as const;

/* ── Squadre (art. 2 e art. 4) ────────────────────────────────────────── */

/**
 * Il massimo è cinque, come nei licei, e per la stessa ragione pratica: è
 * il gruppo che può davvero scrivere un lavoro insieme e presentarlo al
 * completo.
 *
 * Il minimo è due perché l'art. 4 parla di team e una persona sola non è un
 * team. Vale alla consegna, non alla creazione: una squadra nasce con il
 * suo fondatore e cresce nei giorni successivi.
 */
export const SQUADRA_MIN = 2;
export const SQUADRA_MAX = 5;
export const SQUADRA_NOME_MAX = 60;

/**
 * Qui sta la differenza che conta rispetto ai licei, dove una squadra non
 * può uscire dal suo istituto. L'art. 2 incoraggia espressamente i team
 * interdisciplinari, e un team interdisciplinare quasi sempre attraversa
 * due dipartimenti e spesso due atenei. Vietarlo sarebbe il contrario di
 * quello che il bando chiede.
 */
export const SQUADRA_UN_SOLO_ATENEO = false;

export const NOTA_SQUADRA_INTERDISCIPLINARE =
  "La squadra può mettere insieme persone di università diverse e di discipline diverse. L'art. 2 lo incoraggia, e l'art. 4 dice che a parità di tutto il resto sarà favorita la formazione di gruppi con competenze complementari.";

/* ── La bacheca di chi cerca compagni ─────────────────────────────────── */

/**
 * Perché esiste.
 *
 * Nei licei la squadra si forma in classe: il codice gira fra banchi che si
 * conoscono da anni, e chi resta fuori è l'eccezione. Qui la candidatura è
 * individuale e arriva da atenei diversi, quindi il caso normale è arrivare
 * senza conoscere nessuno. Senza una bacheca, "i team si costituiscono in
 * un secondo momento" significherebbe che si costituiscono fra chi si
 * conosceva già, e l'interdisciplinarità dell'art. 2 resterebbe un augurio.
 *
 * Due interruttori e non uno, sulla riga della persona: `consenso_board` è
 * il permesso, che si dà una volta e si può revocare, `cerca_squadra` è lo
 * stato del momento, che si spegne da solo appena si entra in una squadra.
 * Chi torna a cercare compagni non deve ridare un consenso mai ritirato.
 */
export const BOARD_NOTA_MAX = 400;

export const CONSENSO_BOARD_TESTO =
  "Acconsento a comparire nella bacheca dei partecipanti che cercano una squadra, con nome, cognome, università, corso di studi, area disciplinare e la nota che scrivo qui sotto. La bacheca è visibile solo agli altri partecipanti confermati del percorso, non è pubblica e non è indicizzata. Posso togliermi dalla bacheca quando voglio.";

export const BOARD_NOTA_AIUTO =
  "Una riga o due: su che cosa vorresti lavorare, che cosa porti in una squadra, e che competenze ti farebbero comodo accanto. Serve a farsi trovare da chi cerca proprio te.";

export const BOARD_NOTA_PRIVACY =
  "Nella bacheca non compare la tua email. Chi vuole lavorare con te manda una richiesta, e i contatti si scambiano solo quando la richiesta viene accettata.";

/* ── Richieste di ingresso in squadra ─────────────────────────────────── */

export const RICHIESTA_MESSAGGIO_MAX = 500;

export const STATI_RICHIESTA = [
  { value: "in_attesa", label: "In attesa", colore: "#8A6100" },
  { value: "accettata", label: "Accettata", colore: "#0A7A66" },
  { value: "rifiutata", label: "Rifiutata", colore: "#8896A6" },
  { value: "ritirata", label: "Ritirata", colore: "#8896A6" },
] as const;

export type StatoRichiesta = (typeof STATI_RICHIESTA)[number]["value"];

export const statoRichiestaLabel = (v: string): string =>
  STATI_RICHIESTA.find((s) => s.value === v)?.label ?? v;

export const statoRichiestaColore = (v: string): string =>
  STATI_RICHIESTA.find((s) => s.value === v)?.colore ?? "#4A5568";

/**
 * Perché una richiesta e non il solo codice.
 *
 * Il codice resta, per chi i compagni li conosce già: si passa e si entra.
 * Ma la bacheca mette in contatto persone che non si sono mai viste, e se
 * bastasse il codice anche lì una squadra che si dichiara in cerca si
 * troverebbe dentro chiunque passi, e per uscirne dovrebbe sciogliersi.
 * Con la richiesta chi bussa si presenta e chi apre decide.
 */
export const NOTA_RICHIESTE =
  "Chi trovi in bacheca non riceve il codice della squadra: riceve una richiesta, che accetta o rifiuta. Il codice resta la strada breve per chi i compagni li ha già.";

/* ── Ambiti del progetto (art. 1) ─────────────────────────────────────── */

/**
 * Quattro e non tre: l'art. 1 elenca sanitario, ambientale, industriale e
 * sportivo, e lo sportivo c'è qui e non nei licei perché è la tematica
 * dell'evento del 10 dicembre.
 */
export const AMBITI_PROGETTO = [
  { value: "sanitario", label: "Sanitario" },
  { value: "ambientale", label: "Ambientale" },
  { value: "industriale", label: "Industriale" },
  { value: "sportivo", label: "Sportivo e longevità" },
] as const;

export type AmbitoProgetto = (typeof AMBITI_PROGETTO)[number]["value"];

export const ambitoLabel = (v: string): string =>
  AMBITI_PROGETTO.find((a) => a.value === v)?.label ?? v;

/* ── Stati del progetto ───────────────────────────────────────────────── */

export const STATI_PROGETTO_UNIVERSITA = [
  { value: "bozza", label: "Bozza", colore: "#8A6100" },
  { value: "consegnato", label: "Consegnato", colore: "#0A7A66" },
  { value: "ritirato", label: "Ritirato", colore: "#8896A6" },
] as const;

export type StatoProgettoUniversita = (typeof STATI_PROGETTO_UNIVERSITA)[number]["value"];

export const statoProgettoLabelUniversita = (v: string): string =>
  STATI_PROGETTO_UNIVERSITA.find((s) => s.value === v)?.label ?? v;

export const statoProgettoColoreUniversita = (v: string): string =>
  STATI_PROGETTO_UNIVERSITA.find((s) => s.value === v)?.colore ?? "#4A5568";

/* ── Il modulo di consegna ────────────────────────────────────────────── */

/**
 * Sei domande, una per criterio dell'art. 7, tranne la presentazione che si
 * giudica su tutto il resto e non su un campo suo.
 *
 * Non è un questionario: è la griglia di valutazione girata in domande. Se
 * la Commissione assegna 15 punti all'integrazione fra le due discipline, il
 * modulo la deve chiedere, altrimenti valuta qualcosa che a nessuno è stato
 * chiesto e il team perde punti su un capitolo che non sapeva di dover
 * scrivere.
 *
 * I limiti sono più alti di quelli dei licei perché l'esito atteso è
 * diverso: l'art. 9 punta a un manoscritto, e un'ipotesi di ricerca con il
 * suo stato dell'arte non sta in ottocento caratteri. Restano limiti:
 * sintetizzare fa parte del mestiere, e una Commissione che legge trenta
 * progetti legge davvero solo quelli che stanno in poche pagine.
 */
export const CAMPI_PROGETTO_UNIVERSITA = [
  {
    campo: "ipotesi",
    label: "L'ipotesi di ricerca",
    aiuto:
      "Che cosa sostenete, in una forma che si possa verificare o smentire. Non il tema su cui lavorate: l'affermazione che il vostro lavoro mette alla prova.",
    max: 1200,
    criterio: "Innovativita e originalità scientifica",
  },
  {
    campo: "stato_arte",
    label: "Lo stato dell'arte, e che cosa ci aggiungete",
    aiuto:
      "Che cosa esiste già su questo problema, con i riferimenti che avete letto, e dove finisce quello che si sa. Il vostro contributo è la differenza fra le due cose.",
    max: 1500,
    criterio: "Innovativita e originalità scientifica",
  },
  {
    campo: "metodo",
    label: "Metodo e disegno dello studio",
    aiuto:
      "Come mettereste alla prova l'ipotesi: dati, campione, modello sperimentale o computazionale, analisi previste, e come vi accorgereste di esservi sbagliati.",
    max: 1800,
    criterio: "Solidità scientifica e metodologica",
  },
  {
    campo: "integrazione",
    label: "Come biotecnologie e intelligenza artificiale si integrano",
    aiuto:
      "Che cosa fa l'una che l'altra non farebbe. Vale 15 punti su 100, e non basta che le due cose compaiano nello stesso progetto: deve servire che ci siano entrambe.",
    max: 1200,
    criterio: "Integrazione tra biotecnologie e IA",
  },
  {
    campo: "impatto",
    label: "Impatto potenziale",
    aiuto:
      "Chi ne trae beneficio, in che ambito, in che ordine di grandezza, e come si misurerebbe che sta funzionando davvero.",
    max: 1000,
    criterio: "Impatto potenziale",
  },
  {
    campo: "etica",
    label: "Aspetti etici e responsabilità scientifica",
    aiuto:
      "Dati personali, consenso, bias del modello, uso duale, impatto normativo. Che cosa potrebbe andare storto, chi ne pagherebbe il prezzo e come lo terreste sotto controllo.",
    max: 1000,
    criterio: "Aspetti etici e responsabilità scientifica",
  },
] as const;

export type CampoProgettoUniversita = (typeof CAMPI_PROGETTO_UNIVERSITA)[number]["campo"];

export const TITOLO_MAX_UNIVERSITA = 160;

/**
 * Un link, non un caricamento, e qui la ragione non è la stessa dei licei.
 * Lì si evita di conservare file prodotti da minori. Qui è l'art. 9: dati,
 * risultati, software e materiali tutelabili vanno valutati PRIMA di essere
 * divulgati, e un file caricato su un sito è già una divulgazione.
 */
export const NOTA_MATERIALI_UNIVERSITA =
  "Se avete dati, una presentazione, un preprint o un prototipo, incollate qui il link e controllate che si apra senza dover fare l'accesso. Non carichiamo file su questo sito: l'art. 9 chiede che quello che è tutelabile sia valutato prima di essere divulgato, e un caricamento è già una divulgazione.";

export const NOTA_CONSEGNA_UNIVERSITA =
  "Una volta consegnato, il progetto non è più modificabile. Fino ad allora resta una bozza che potete salvare e riprendere quando volete, e che nessuno all'infuori della vostra squadra e del vostro mentor può leggere.";

/* ── Commissione (art. 8) ─────────────────────────────────────────────── */

/**
 * I ruoli dell'art. 8. Diversi da quelli dei licei: qui non esiste il
 * referente del consorzio degli istituti, che è la voce senza diritto di
 * voto di quel bando. La colonna `diritto_voto` resta perché un osservatore
 * senza voto può comunque essere ammesso in seduta, e la regola dell'art. 8
 * sul conflitto di interessi va applicata a qualcuno.
 */
export const RUOLI_COMMISSIONE_UNIVERSITA = [
  { value: "presidente", label: "Presidente (direzione scientifica Fondazione)", voto: true },
  { value: "organizzatore", label: "Ente organizzatore (SafesPro)", voto: true },
  { value: "esperto", label: "Esperto esterno (ricerca e università)", voto: true },
  { value: "ricercatore", label: "Ricercatore o docente universitario", voto: true },
  { value: "impresa", label: "Impresa e innovazione", voto: true },
  { value: "osservatore", label: "Osservatore (senza voto)", voto: false },
] as const;

export type RuoloCommissioneUniversita =
  (typeof RUOLI_COMMISSIONE_UNIVERSITA)[number]["value"];

export const ruoloCommissioneLabelUniversita = (v: string): string =>
  RUOLI_COMMISSIONE_UNIVERSITA.find((r) => r.value === v)?.label ?? v;

/**
 * La corrispondenza fra i criteri dell'art. 7 e le colonne della scheda.
 * Una riga per criterio, nell'ordine dell'articolo, così la scheda non può
 * chiedere un punteggio che non esiste né dimenticarne uno che esiste.
 */
export const CAMPI_PUNTEGGIO_UNIVERSITA = [
  { campo: "p_innovativita", criterio: "Innovativita e originalità scientifica", max: 25 },
  { campo: "p_solidita", criterio: "Solidità scientifica e metodologica", max: 25 },
  { campo: "p_impatto", criterio: "Impatto potenziale", max: 20 },
  { campo: "p_integrazione", criterio: "Integrazione tra biotecnologie e IA", max: 15 },
  { campo: "p_etica", criterio: "Aspetti etici e responsabilità scientifica", max: 10 },
  { campo: "p_presentazione", criterio: "Qualità della presentazione scientifica", max: 5 },
] as const;

export type CampoPunteggioUniversita =
  (typeof CAMPI_PUNTEGGIO_UNIVERSITA)[number]["campo"];

export const NOTA_VALUTAZIONE_INDIPENDENTE_UNIVERSITA =
  "Vede solo le sue schede. Il punteggio degli altri commissari non le compare, e non è riservatezza fine a se stessa: un voto letto prima di dare il proprio lo tira verso di sé, e la media di cinque giudizi ancorati vale meno di cinque giudizi indipendenti.";

/**
 * L'art. 7 chiede alla Commissione di tenere conto anche della possibilità
 * che il progetto diventi un articolo sottoponibile a peer review. Non è un
 * criterio a punti, quindi non è un numero: è un giudizio, e sta nella
 * scheda perché altrimenti resterebbe solo nella testa di chi lo dà.
 */
export const GIUDIZI_PUBBLICABILE = [
  { value: "si", label: "Sì, con il lavoro di revisione previsto dall'art. 9" },
  { value: "forse", label: "Forse, servono altre analisi o validazioni" },
  { value: "no", label: "No, non in questa forma" },
] as const;

export const NOTA_PUBBLICABILE =
  "L'art. 7 chiede di valutare anche se il lavoro possa diventare un articolo sottoponibile a revisione fra pari. Non dà punti: orienta la scelta dell'art. 9, che è il premio vero di questo bando.";

/* ── Il corso (art. 3) ────────────────────────────────────────────────── */

/**
 * Il corso esisteva già e non lo sapeva nessuno.
 *
 * L'art. 3 elenca quattordici contenuti formativi e il sito ne ospita da
 * mesi la parte sugli agenti di intelligenza artificiale, in
 * `/courses/agentic-ai`, dove gli studenti dei licei arrivano dal loro
 * percorso. La pagina di questo bando non ci puntava da nessuna parte, e
 * l'email di conferma nemmeno: un candidato riceveva un codice e poi non
 * aveva niente da fare per settimane.
 *
 * Le lezioni sono in inglese e il bando è in italiano. Non è una svista:
 * il corso è aperto a chiunque nel mondo, il bando riguarda un percorso
 * italiano, e dirlo qui evita la sorpresa al primo clic.
 */
export const ACCESSO_CORSO = {
  titolo: "Il percorso formativo comincia subito",
  intro:
    "Appena la candidatura è registrata ti creiamo un account e ti mandiamo il link per scegliere la password. Da quel momento hai accesso al corso sugli agenti di intelligenza artificiale, che è la parte già disponibile dei contenuti dell'art. 3.",
  lingua:
    "Le lezioni sono in inglese e sono aperte a chiunque abbia un account sul sito. Il bando, i mentor e la Commissione restano in italiano.",
  ritmo:
    "Ogni lezione si chiude con una riflessione da consegnare, ed è quella che sblocca la successiva. Non è un vincolo burocratico: è il modo in cui il percorso sa a che punto sei, e il pannello del percorso lo usa per capire chi ha bisogno di una mano.",
};

export const CORSO_PUNTI = [
  {
    icona: "fa-right-to-bracket",
    titolo: "Accesso immediato",
    desc: "L'account nasce con la candidatura. Nessuna attesa, nessun secondo modulo da compilare.",
  },
  {
    icona: "fa-list-check",
    titolo: "Quattro fasi",
    desc: "Fondamenti, esplorazione, costruzione e chiusura. Le lezioni si aprono una dopo l'altra, al tuo ritmo.",
  },
  {
    icona: "fa-people-group",
    titolo: "La squadra si forma nel corso",
    desc: "Quando la lezione ti chiede di formare la squadra, il modulo è lì dentro. Non devi andare a cercarlo altrove.",
  },
  {
    icona: "fa-paper-plane",
    titolo: "E la consegna anche",
    desc: "L'ultima lezione è il punto in cui il progetto si consegna alla Commissione.",
  },
];

/* ── Mentor (art. 3 e art. 5) ─────────────────────────────────────────── */

/**
 * Perché esiste una pagina dei mentor, e perché i mentor si candidano.
 *
 * L'art. 3 dice che le attività si svolgono "con il supporto di ricercatori,
 * docenti universitari, esperti, professionisti e mentor", e l'art. 5 mette
 * il mentoring fra le cose che il progetto offre. Fino a qui erano due righe
 * di testo: nessun elenco, nessun modo di candidarsi, nessun legame fra un
 * mentor e una squadra.
 *
 * L'elenco è pubblico perché serve a tre persone diverse: a chi sta
 * decidendo se candidarsi e vuole sapere con chi lavorerebbe, a chi è già
 * dentro e cerca la persona giusta per il suo problema, e a un ricercatore
 * che scopre l'iniziativa e vuole darle una mano.
 */
export const MENTOR = {
  occhiello: "Fondazione bioERGOtech e SafesPro . Percorso universitario",
  titolo: "I mentor del percorso",
  sottotitolo:
    "Ricercatori, docenti, clinici e professionisti che accompagnano i team nella progettazione scientifica, dalla prima ipotesi alla proposta di pubblicazione.",
};

export const MENTOR_INTRO = [
  "L'art. 3 del bando prevede che le attività si svolgano con il supporto di ricercatori, docenti universitari, esperti, professionisti e mentor provenienti dal mondo della ricerca, dell'innovazione e dell'impresa. Questa pagina è l'elenco di chi ha accettato.",
  "Ogni team confermato può essere affiancato da un mentor, scelto in base all'area del progetto. L'abbinamento lo propone la Fondazione: nessuno viene assegnato a un team senza saperlo, e nessun team si trova un mentor che non ha mai visto.",
];

/** I ruoli con cui un mentor si descrive. Aperti: l'ultimo lascia scrivere. */
export const RUOLI_MENTOR = [
  { value: "ricercatore", label: "Ricercatore" },
  { value: "docente", label: "Docente universitario" },
  { value: "clinico", label: "Medico o professionista sanitario" },
  { value: "industria", label: "Ricerca e sviluppo in azienda" },
  { value: "imprenditore", label: "Imprenditore o innovatore" },
  { value: "dottorando", label: "Dottorando o assegnista" },
  { value: "altro", label: "Altro profilo" },
] as const;

export type RuoloMentor = (typeof RUOLI_MENTOR)[number]["value"];

export const ruoloMentorLabel = (v: string): string =>
  RUOLI_MENTOR.find((r) => r.value === v)?.label ?? v;

/**
 * Chiedere la disponibilità adesso evita la scoperta tardiva che un mentor
 * assegnato a un team non ha mai un'ora libera. È la domanda che nessuno fa
 * e che poi costa settimane.
 */
export const DISPONIBILITA_MENTOR = [
  { value: "un_incontro", label: "Un incontro, per un parere su un progetto" },
  { value: "mensile", label: "Circa un'ora al mese" },
  { value: "quindicinale", label: "Circa un'ora ogni due settimane" },
  { value: "settimanale", label: "Circa un'ora a settimana" },
  { value: "da_concordare", label: "Da concordare in base al progetto" },
] as const;

export type DisponibilitaMentor = (typeof DISPONIBILITA_MENTOR)[number]["value"];

export const disponibilitaMentorLabel = (v: string): string =>
  DISPONIBILITA_MENTOR.find((d) => d.value === v)?.label ?? v;

export const STATI_MENTOR = [
  { value: "proposta", label: "In valutazione", colore: "#8A6100" },
  { value: "approvata", label: "Mentor del percorso", colore: "#0A7A66" },
  { value: "respinta", label: "Non accolta", colore: "#8896A6" },
  { value: "sospesa", label: "Sospesa", colore: "#8896A6" },
] as const;

export type StatoMentor = (typeof STATI_MENTOR)[number]["value"];

export const statoMentorLabel = (v: string): string =>
  STATI_MENTOR.find((s) => s.value === v)?.label ?? v;

export const statoMentorColore = (v: string): string =>
  STATI_MENTOR.find((s) => s.value === v)?.colore ?? "#4A5568";

export const MENTOR_BIO_MAX = 800;
export const MENTOR_COMPETENZE_MAX = 500;

export const MENTOR_COSA_CHIEDIAMO = [
  {
    icona: "fa-clock",
    titolo: "Il tempo che può dare davvero",
    desc: "Anche un solo incontro è utile. Quello che non funziona è una disponibilità dichiarata e mai trovata, quindi la chiediamo in chiaro fin dall'inizio.",
  },
  {
    icona: "fa-compass",
    titolo: "Orientamento, non esecuzione",
    desc: "Il progetto resta del team. Un mentor apre una strada, segnala un metodo che non regge, indica la letteratura che manca.",
  },
  {
    icona: "fa-scale-balanced",
    titolo: "Trasparenza sui conflitti",
    desc: "Chi segue un team non lo valuta. L'art. 8 chiede ai componenti della Commissione di dichiarare i conflitti di interesse e di astenersi, e vale anche qui.",
  },
  {
    icona: "fa-file-signature",
    titolo: "Attribuzione corretta",
    desc: "Se il lavoro arriva alla pubblicazione, il contributo di ciascuno si riconosce secondo i criteri di integrità scientifica dell'art. 9.",
  },
];

export const CONSENSO_PUBBLICAZIONE_MENTOR_TESTO =
  "Acconsento alla pubblicazione del mio nome, ruolo, organizzazione, aree di interesse e profilo nella pagina pubblica dei mentor del percorso. Posso chiedere la rimozione in qualsiasi momento scrivendo a info@bioergotech.org.";

export const CONSENSO_PRIVACY_MENTOR_TESTO =
  "Ho letto l'informativa e acconsento al trattamento dei miei dati personali ai sensi del Regolamento (UE) 2016/679, per le sole finalità connesse alla gestione del percorso e all'abbinamento con i team.";

export const MENTOR_NOTA_APPROVAZIONE =
  "La candidatura viene letta dalla direzione scientifica della Fondazione. L'approvazione non è automatica e non è un giudizio sul suo curriculum: dipende anche dalle aree che i team stanno effettivamente affrontando.";

export const MENTOR_NOTA_VUOTO =
  "L'elenco dei mentor si sta componendo. Se lavora nella ricerca, in clinica o nell'innovazione e vuole affiancare un team, la sua candidatura è benvenuta.";

export const MENTOR_NOTA_TELEFONO =
  "Il numero serve solo allo staff per organizzare gli incontri. Non compare nella pagina pubblica.";

/* ── Testi della bacheca e del percorso, lato studente ────────────────── */

export const STUDENTE_INTRO =
  "Qui trovi la tua squadra, la bacheca di chi cerca compagni e il progetto da consegnare. Le stesse cose compaiono dentro il corso, nel punto in cui la lezione te le chiede: sono la stessa area, non due.";

export const NOTA_ACCESSO_CORSO_STUDENTE =
  "Se non ricordi la password, chiedi un nuovo link dalla pagina di accesso: l'account è quello con cui ti sei candidato.";

/* ── Domande frequenti della fase 2 ───────────────────────────────────── */

/**
 * Si aggiungono in coda a FAQ_UNIVERSITA invece di sostituirle: le prime
 * sei rispondono a chi deve ancora candidarsi, queste a chi lo ha già
 * fatto, e sono due momenti diversi della stessa pagina.
 */
export const FAQ_PERCORSO = [
  {
    q: "Che cosa succede subito dopo la candidatura?",
    a: "Ti arriva una email con il codice della candidatura e il link per scegliere la password del tuo account. Da quel momento entri nel corso e, quando la fase si apre, nella tua area del percorso.",
  },
  {
    q: "Non conosco nessuno. Come trovo una squadra?",
    a: "Dalla bacheca. Ti metti in elenco con una riga su che cosa vorresti fare, vedi chi altro sta cercando e quali squadre hanno un posto libero, e mandi una richiesta. Il capitano la accetta o la rifiuta, e i contatti si scambiano solo dopo.",
  },
  {
    q: "La squadra può mettere insieme università diverse?",
    a: "Sì, ed è incoraggiato. L'art. 2 chiede team interdisciplinari, e le competenze complementari quasi sempre stanno in dipartimenti diversi e spesso in atenei diversi. Si può essere da due a cinque.",
  },
  {
    q: "Chi vede il progetto mentre lo scriviamo?",
    a: "Solo la vostra squadra e il mentor eventualmente assegnato. La Commissione vede i progetti consegnati, mai le bozze: una bozza a metà non è un progetto e giudicarla sarebbe ingiusto.",
  },
  {
    q: "Come si ottiene un mentor?",
    a: "L'abbinamento lo propone la Fondazione in base all'area del progetto, fra i mentor elencati nella pagina dedicata. Nessun team si trova assegnato un mentor che non ha mai visto, e nessun mentor viene assegnato senza saperlo.",
  },
  {
    q: "Posso candidarmi come mentor?",
    a: "Sì. C'è un modulo nella pagina dei mentor, aperto a ricercatori, docenti, clinici, professionisti e persone che lavorano nell'innovazione. La direzione scientifica della Fondazione legge le candidature e decide.",
  },
];
