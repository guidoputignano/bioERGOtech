/**
 * Punto UNICO di configurazione del bando licei "Biotecnologie e
 * Intelligenza Artificiale".
 *
 * Percorso formativo gratuito per gli studenti del triennio delle scuole
 * secondarie di secondo grado di Taranto e provincia, che si chiude con la
 * presentazione dei dieci progetti migliori il 10 dicembre 2026 al
 * PalaMazzola, nella prima giornata dell'evento "Vivere più a lungo".
 *
 * Differenza di fondo rispetto al bando startup, che vive nella cartella
 * accanto: qui chi aderisce è l'ISTITUTO, tramite un docente referente
 * (art. 4). Lo studente non si candida a un bando, si iscrive a un percorso
 * a cui la sua scuola ha aderito.
 *
 * Le SCADENZE non stanno qui. L'art. 4 e l'art. 10 le rimandano al referente
 * del consorzio dei licei, quindi arrivano da un terzo con preavviso ignoto:
 * vivono nella tabella `licei_config`, modificabile dal pannello staff senza
 * un rilascio del sito. Qui restano solo le date certe, cioè l'evento.
 */

import { ARCHIVE_MODE, EVENT_SLUG, SITE_URL } from "../content";

export { ARCHIVE_MODE, EVENT_SLUG, SITE_URL };

/** Slug della sotto rotta pubblica: /eventi/vivere-piu-a-lungo/licei */
export const LICEI_SLUG = "licei";

export const LICEI_PATH = `/eventi/${EVENT_SLUG}/${LICEI_SLUG}`;

export const LICEI = {
  occhiello: "Fondazione bioERGOtech e SafesPro",
  titolo: "Biotecnologie e Intelligenza Artificiale",
  sottotitolo:
    "Percorso formativo gratuito per gli studenti del triennio dei licei di Taranto e provincia, con mentor dalla ricerca e dall'impresa, che si chiude sul palco del PalaMazzola.",
  /** L'evento finale, art. 6. È la sola data certa del bando. */
  dataLabel: "Giovedì 10 dicembre 2026",
  luogo: "PalaMazzola, Taranto",
  /** Progetti che salgono sul palco (art. 6). */
  progettiSulPalco: 10,
  /** Punteggio massimo complessivo (art. 7). */
  punteggioMassimo: 100,
  emanato: "Taranto, 30 luglio 2026",
} as const;

/**
 * L'indice della pagina, come nel bando startup. Gli `id` sono quelli delle
 * sezioni: cambiarne uno qui senza cambiarlo nel markup rompe l'ancora.
 */
export const SEZIONI_LICEI = [
  { id: "premessa", label: "Il percorso" },
  { id: "destinatari", label: "Chi partecipa" },
  { id: "corso", label: "Come funziona" },
  { id: "scuole", label: "Cosa offre" },
  { id: "premi", label: "Premi" },
  { id: "criteri", label: "Criteri" },
  { id: "adesione", label: "Aderisci" },
  { id: "regole", label: "Commissione" },
  { id: "faq", label: "Domande" },
] as const;

/* ── Art. 2. Destinatari ──────────────────────────────────────────────── */

/**
 * Gli anni ammessi, con la priorità dell'art. 2. Quarte e quinte sono
 * prioritarie per la vicinanza alla scelta universitaria; le terze
 * concorrono ai posti eventualmente residui.
 */
export const ANNI_CORSO = [
  { anno: 4, label: "Classi quarte", priorita: true },
  { anno: 5, label: "Classi quinte", priorita: true },
  { anno: 3, label: "Classi terze", priorita: false },
] as const;

export const PROVINCIA = "Taranto";

/* ── Art. 3. Come si svolge il percorso ───────────────────────────────── */

export const MODALITA = [
  {
    icona: "fa-laptop",
    titolo: "Interamente online",
    desc: "Fuori dall'orario scolastico, con il supporto di mentor dal mondo della ricerca e dell'impresa.",
  },
  {
    icona: "fa-euro-sign",
    titolo: "Completamente gratuito",
    desc: "Nessun costo per gli studenti, per le famiglie e per gli istituti.",
  },
  {
    icona: "fa-flask",
    titolo: "Biotecnologie e IA",
    desc: "Fondamenti, applicazioni alla salute, alla longevità e allo sport, metodo di lavoro in team.",
  },
  {
    icona: "fa-diagram-project",
    titolo: "Un progetto vero",
    desc: "In team, i ragazzi ideano e sviluppano una soluzione a una sfida reale, sanitaria, ambientale o industriale.",
  },
] as const;

/** Gli ambiti su cui i progetti possono intervenire (art. 3). */
export const AMBITI_PROGETTO = [
  { value: "sanitario", label: "Sanitario" },
  { value: "ambientale", label: "Ambientale" },
  { value: "industriale", label: "Industriale" },
] as const;

/* ── Art. 4. Impegni dell'istituto che aderisce ───────────────────────── */

/**
 * I quattro impegni dell'art. 4, che nel modulo diventano quattro spunte
 * separate: firmarli in blocco con una casella sola non è un impegno, è un
 * clic. Il quinto non è nel testo del bando ma discende dall'art. 4 e dalla
 * natura del percorso: gli studenti sono in larga parte minorenni, e le
 * autorizzazioni dei genitori le raccoglie e le custodisce la scuola.
 */
export const IMPEGNI_ISTITUTO = [
  {
    campo: "impegno_referente",
    titolo: "Docente referente",
    testo:
      "L'istituto individua un docente referente interno per il coordinamento con gli organizzatori.",
  },
  {
    campo: "impegno_promozione",
    titolo: "Promozione e raccolta",
    testo:
      "L'istituto promuove il percorso presso gli studenti del triennio, con particolare attenzione alle classi quarte e quinte, e raccoglie le relative candidature.",
  },
  {
    campo: "impegno_evento",
    titolo: "Evento finale",
    testo:
      "L'istituto favorisce la partecipazione delle classi coinvolte all'evento finale del 10 dicembre 2026 a Taranto, anche nell'ambito dei percorsi di orientamento in uscita.",
  },
  {
    campo: "impegno_consensi",
    titolo: "Autorizzazioni delle famiglie",
    testo:
      "L'istituto raccoglie e custodisce le autorizzazioni dei genitori o di chi esercita la responsabilità genitoriale per la partecipazione degli studenti minorenni e per l'eventuale ripresa audiovisiva durante l'evento finale, e le conserva agli atti.",
  },
] as const;

export type CampoImpegno = (typeof IMPEGNI_ISTITUTO)[number]["campo"];

/* ── Art. 5. Cosa offre il progetto agli istituti ─────────────────────── */

export const COSA_OFFRE_SCUOLE = [
  {
    icona: "fa-graduation-cap",
    titolo: "Orientamento di alto profilo",
    desc: "Un percorso di formazione e orientamento senza alcun costo per la scuola e per le famiglie, valorizzabile anche ai fini dell'orientamento in uscita.",
  },
  {
    icona: "fa-certificate",
    titolo: "Visibilità dell'istituto",
    desc: "L'istituto compare come partner del progetto, con il logo sui materiali del corso e dell'evento.",
  },
  {
    icona: "fa-people-arrows",
    titolo: "Contatto diretto",
    desc: "Gli studenti incontrano ricercatori, mentor e realtà imprenditoriali nazionali e internazionali.",
  },
] as const;

/* ── Art. 6. Premi ────────────────────────────────────────────────────── */

export const PREMI_LICEI = [
  {
    posizione: 1,
    titolo: "Primo premio",
    desc: "Esperienza presso un centro di ricerca, con viaggio di una settimana a New York.",
    rappresentanza: "fino a 5 studenti",
    icona: "fa-plane-departure",
  },
  {
    posizione: 2,
    titolo: "Secondo premio",
    desc: "Visita guidata di tre giorni in uno dei più importanti club di calcio di Serie A, con walk about stadio, museo, medical lab e data analyst.",
    rappresentanza: "fino a 5 studenti",
    icona: "fa-futbol",
  },
  {
    posizione: 3,
    titolo: "Terzo premio",
    desc: "Visita guidata presso SS Taranto Calcio, con walk about stadio, museo, medical lab e data analyst.",
    rappresentanza: "fino a 5 studenti",
    icona: "fa-shield-halved",
  },
] as const;

/* ── Art. 7. Criteri di valutazione ───────────────────────────────────── */

export const CRITERI_LICEI = [
  { criterio: "Innovatività e originalità", punti: 25, desc: "Grado di novità della soluzione proposta rispetto allo stato dell'arte." },
  { criterio: "Fattibilità tecnica", punti: 20, desc: "Solidità e concretezza dell'approccio tecnico e scientifico proposto." },
  { criterio: "Impatto potenziale", punti: 20, desc: "Rilevanza e beneficio atteso in ambito sanitario, ambientale o industriale." },
  { criterio: "Aspetti etici", punti: 15, desc: "Consapevolezza e gestione delle implicazioni etiche connesse alla soluzione proposta." },
  { criterio: "Lavoro di squadra e metodo", punti: 10, desc: "Qualità della collaborazione e del metodo di lavoro adottato dal team." },
  { criterio: "Qualità della presentazione", punti: 10, desc: "Chiarezza, efficacia comunicativa e capacità di sintesi nell'esposizione finale." },
] as const;

/** Criterio che decide a parità di punteggio complessivo (art. 7). */
export const CRITERIO_DIRIMENTE_LICEI = "Innovatività e originalità";

/* ── Art. 8. Commissione ──────────────────────────────────────────────── */

export const COMMISSIONE_LICEI = [
  "Un rappresentante della direzione scientifica di Fondazione bioERGOtech, con funzioni di Presidente.",
  "Un rappresentante di SafesPro, in qualità di ente organizzatore.",
  "Due o più esperti esterni dal mondo della ricerca scientifica e universitaria nei settori delle biotecnologie e dell'intelligenza artificiale.",
  "Uno o più rappresentanti del mondo dell'impresa e dei mentor coinvolti nel percorso formativo.",
  "Il referente del consorzio dei licei della provincia di Taranto, con funzioni consultive e senza diritto di voto.",
] as const;

/* ── Art. 9. Contatti ─────────────────────────────────────────────────── */

export const CONTATTI_LICEI = {
  consorzio: {
    ruolo: "Referente consorzio licei",
    nome: "Prof. Gianni Tartaglia",
    dettaglio: "Referente del consorzio dei licei della provincia di Taranto.",
  },
  fondazione: {
    ruolo: "Referente Fondazione bioERGOtech",
    nome: "Guido Putignano",
    email: "info@bioergotech.org",
  },
  organizzazione: {
    ruolo: "Referente Organizzazione (SafesPro)",
    email: "info@altaformazioneprofessionisti.it",
  },
  telefono: {
    numero: "347 7320692",
    riferimento:
      "Avv. Domenica Leone, Direttore della Scuola di Alta Formazione e Studi Specializzati per Professionisti (SafesPro) e Vice Presidente di Fondazione bioERGOtech.",
  },
} as const;

/* ── Stato della raccolta delle adesioni ──────────────────────────────── */

/**
 * Il bando non fissa termini: l'art. 10 li rimanda agli organizzatori
 * tramite il referente del consorzio. Quindi lo stato ha un quarto valore,
 * `termini_non_comunicati`, che è anche il default: il modulo è aperto ma la
 * pagina non promette una scadenza che nessuno ha ancora fissato.
 *
 * Il valore vero vive in `licei_config` e si cambia dal pannello staff.
 * Questo è solo il fallback per quando la tabella non risponde.
 */
export type StatoAdesioni = "termini_non_comunicati" | "aperte" | "chiuse";

export const STATO_ADESIONI_DEFAULT: StatoAdesioni = "termini_non_comunicati";

/** Le chiavi previste in `licei_config`, con il loro significato. */
export const CONFIG_CHIAVI = {
  stato_adesioni: "Stato della raccolta: termini_non_comunicati, aperte, chiuse.",
  scadenza_adesioni_label:
    "Scadenza da mostrare in pagina, in chiaro. Vuota finché il referente del consorzio non la comunica.",
  avviso: "Riga di avviso mostrata in cima alla pagina. Vuota per non mostrarla.",
} as const;

/** Le adesioni si accettano davvero? Lo stato `chiuse` e l'archivio fermano tutto. */
export const adesioniAperte = (stato: StatoAdesioni): boolean =>
  !ARCHIVE_MODE && stato !== "chiuse";

/* ── Stati dell'istruttoria di un'adesione ────────────────────────────── */

/**
 * Un'adesione non è attiva finché lo staff non la conferma. Non è
 * burocrazia: il modulo è pubblico, il codice meccanografico è un dato
 * pubblicamente reperibile e nel sito non c'è rate limiting. La conferma
 * manuale è la vera difesa contro le adesioni finte.
 */
export const STATI_ADESIONE = [
  { value: "ricevuta", label: "Ricevuta", colore: "#4A5568" },
  { value: "confermata", label: "Confermata", colore: "#0A7A66" },
  { value: "attiva", label: "Attiva sul corso", colore: "#2B6CB0" },
  { value: "ritirata", label: "Ritirata", colore: "#8896A6" },
] as const;

export type StatoAdesione = (typeof STATI_ADESIONE)[number]["value"];

export const statoAdesioneLabel = (v: string): string =>
  STATI_ADESIONE.find((s) => s.value === v)?.label ?? v;

export const statoAdesioneColore = (v: string): string =>
  STATI_ADESIONE.find((s) => s.value === v)?.colore ?? "#4A5568";

/* ── Dichiarazioni e consensi registrati a database ───────────────────── */

export const DICHIARAZIONE_POTERI_TESTO =
  "Dichiaro di aver informato la dirigenza dell'istituto e di essere legittimato a trasmettere questa adesione per suo conto.";

export const DICHIARAZIONE_ACCETTAZIONE_LICEI_TESTO =
  "Ho letto il bando in ogni sua parte e ne accetto le disposizioni, comprese l'insindacabilità delle valutazioni della Commissione e la facoltà degli organizzatori di definire i termini e le modalità operative del percorso.";

export const CONSENSO_PRIVACY_LICEI_TESTO =
  "Acconsento al trattamento dei dati del docente referente e dell'istituto, ai sensi del Regolamento (UE) 2016/679, per le sole finalità connesse alla gestione del percorso formativo e dell'evento.";

export const CONSENSO_MARKETING_LICEI_TESTO =
  "Acconsento a ricevere comunicazioni della Fondazione bioERGOtech sulle sue iniziative per le scuole. Potrò revocare il consenso in qualsiasi momento.";

/**
 * Nota sui dati degli studenti, mostrata nel modulo e registrata insieme
 * all'adesione. È la scelta di fondo del modulo: a questo stadio il sito non
 * tocca nessun dato di minori, solo numeri.
 */
export const NOTA_DATI_STUDENTI =
  "In questa fase non chiediamo i nomi degli studenti, ma solo quanti prevedete di coinvolgere. I ragazzi si iscriveranno da soli al percorso, con il codice che riceverete via email, e sarete voi a confermare l'elenco. Le autorizzazioni dei genitori restano cartacee e in custodia all'istituto: il sito non le raccoglie e non le conserva.";

/* ── FAQ ──────────────────────────────────────────────────────────────── */

export const FAQ_LICEI = [
  {
    q: "Chi deve compilare questo modulo?",
    a: "Il docente referente individuato dall'istituto. L'adesione è dell'istituto, non del singolo studente: sono i ragazzi a iscriversi in un secondo momento, con il codice che il referente riceve via email.",
  },
  {
    q: "Quanto costa?",
    a: "Nulla. Il percorso è completamente gratuito per gli studenti, per le famiglie e per gli istituti.",
  },
  {
    q: "Quando scadono le adesioni?",
    a: "Il bando non fissa un termine: l'art. 10 rimanda i termini agli organizzatori, tramite il referente del consorzio dei licei. Appena la data sarà comunicata comparirà su questa pagina. Nel frattempo il modulo è aperto e conviene aderire, così ricevete il codice e potete iniziare a raccogliere le candidature.",
  },
  {
    q: "Possono partecipare le classi terze?",
    a: "Sì. La priorità è delle quarte e delle quinte, per la vicinanza alla scelta universitaria, e le terze concorrono ai posti eventualmente residui. Nel modulo indicate i numeri per ciascun anno.",
  },
  {
    q: "Il corso si svolge in orario scolastico?",
    a: "No. È interamente online e si svolge fuori dall'orario scolastico, quindi non sottrae ore alle lezioni.",
  },
  {
    q: "Dobbiamo raccogliere le autorizzazioni dei genitori?",
    a: "Sì, e restano in custodia all'istituto. Il sito non raccoglie moduli firmati e non conserva dati dei genitori. Servono due autorizzazioni distinte: una per la partecipazione al percorso e una per l'eventuale ripresa audiovisiva durante l'evento finale, che si svolge in seduta pubblica.",
  },
  {
    q: "Quanti studenti possiamo iscrivere?",
    a: "Il bando non fissa un tetto per istituto. Indicate nel modulo quanti prevedete di coinvolgere: quei numeri servono agli organizzatori per dimensionare il percorso e i posti all'evento del 10 dicembre.",
  },
  {
    q: "Come si formano le squadre?",
    a: "Dentro il corso, non adesso. Il lavoro in team è uno dei contenuti del percorso: i ragazzi si conoscono durante le prime settimane e formano la squadra quando hanno un'idea da sviluppare. I dieci progetti migliori salgono sul palco il 10 dicembre.",
  },
] as const;
