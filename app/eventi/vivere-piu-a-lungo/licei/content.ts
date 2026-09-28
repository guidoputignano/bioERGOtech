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
 * del consorzio degli istituti superiori, quindi arrivano da un terzo con preavviso ignoto:
 * vivono nella tabella `licei_config`, modificabile dal pannello staff senza
 * un rilascio del sito. Qui restano solo le date certe, cioè l'evento.
 */

import { ARCHIVE_MODE, EVENT_SLUG, SITE_URL } from "../content";
import { CONTITOLARE_IMMAGINI, DPO, TITOLARE } from "@/app/legal/privacy/content";

export { ARCHIVE_MODE, EVENT_SLUG, SITE_URL };

/** Slug della sotto rotta pubblica: /eventi/vivere-piu-a-lungo/licei */
export const LICEI_SLUG = "licei";

export const LICEI_PATH = `/eventi/${EVENT_SLUG}/${LICEI_SLUG}`;

export const LICEI = {
  occhiello: "Fondazione bioERGOtech e SafesPro",
  titolo: "Biotecnologie e Intelligenza Artificiale",
  sottotitolo:
    "Percorso formativo gratuito per gli studenti del triennio degli istituti superiori di Taranto e provincia, con mentor dalla ricerca e dall'impresa, che si chiude sul palco del PalaMazzola.",
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
      "L'istituto favorisce la partecipazione delle classi coinvolte all'evento finale del 10 e 11 dicembre 2026 a Taranto, anche nell'ambito dei percorsi di orientamento in uscita.",
  },
  {
    campo: "impegno_consensi",
    titolo: "Autorizzazioni e consensi",
    testo:
      "L'istituto consegna a ogni studente il modulo di autorizzazione nella variante per minorenni o per maggiorenni, secondo l'età dello studente alla data della firma, con l'informativa da trattenere; raccoglie la pagina firmata e la conserva agli atti; prima dell'evento comunica agli organizzatori l'esito delle scelte sulle immagini degli studenti finalisti e, senza ritardo, ogni pagina firmata o revoca ricevuta in seguito; mostra i moduli agli organizzatori che chiedano di verificarli. I moduli firmati non vengono inviati agli organizzatori.",
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

/**
 * I sei criteri dell'art. 7, con la colonna di `licei_valutazioni` su cui
 * ciascuno atterra. Il `campo` non è decorazione: è quello che tiene insieme
 * il bando, la scheda della Commissione e il modulo di consegna, che chiede
 * agli studenti esattamente ciò che verrà valutato.
 */
export const CRITERI_LICEI = [
  { campo: "p_innovativita", criterio: "Innovatività e originalità", punti: 25, desc: "Grado di novità della soluzione proposta rispetto allo stato dell'arte." },
  { campo: "p_fattibilita", criterio: "Fattibilità tecnica", punti: 20, desc: "Solidità e concretezza dell'approccio tecnico e scientifico proposto." },
  { campo: "p_impatto", criterio: "Impatto potenziale", punti: 20, desc: "Rilevanza e beneficio atteso in ambito sanitario, ambientale o industriale." },
  { campo: "p_etica", criterio: "Aspetti etici", punti: 15, desc: "Consapevolezza e gestione delle implicazioni etiche connesse alla soluzione proposta." },
  { campo: "p_squadra", criterio: "Lavoro di squadra e metodo", punti: 10, desc: "Qualità della collaborazione e del metodo di lavoro adottato dal team." },
  { campo: "p_presentazione", criterio: "Qualità della presentazione", punti: 10, desc: "Chiarezza, efficacia comunicativa e capacità di sintesi nell'esposizione finale." },
] as const;

export type CampoPunteggio = (typeof CRITERI_LICEI)[number]["campo"];

/** Criterio che decide a parità di punteggio complessivo (art. 7). */
export const CRITERIO_DIRIMENTE_LICEI = "Innovatività e originalità";

/* ── Art. 8. Commissione ──────────────────────────────────────────────── */

export const COMMISSIONE_LICEI = [
  "Un rappresentante della direzione scientifica di Fondazione bioERGOtech, con funzioni di Presidente.",
  "Un rappresentante di SafesPro, in qualità di ente organizzatore.",
  "Due o più esperti esterni dal mondo della ricerca scientifica e universitaria nei settori delle biotecnologie e dell'intelligenza artificiale.",
  "Uno o più rappresentanti del mondo dell'impresa e dei mentor coinvolti nel percorso formativo.",
  "Il referente del consorzio degli istituti superiori della provincia di Taranto, con funzioni consultive e senza diritto di voto.",
] as const;

/* ── Art. 9. Contatti ─────────────────────────────────────────────────── */

export const CONTATTI_LICEI = {
  consorzio: {
    ruolo: "Referente consorzio istituti superiori",
    nome: "Prof. Gianni Tartaglia",
    dettaglio: "Referente del consorzio degli istituti superiori della provincia di Taranto.",
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
  stato_iscrizioni: "Iscrizione degli studenti: chiuse oppure aperte.",
  scadenza_iscrizioni_label:
    "Scadenza delle iscrizioni degli studenti, in chiaro. Vuota finché non è stata fissata.",
  stato_squadre: "Formazione delle squadre: chiuse oppure aperte.",
  stato_consegne: "Consegna dei progetti: chiuse oppure aperte.",
  scadenza_consegna_label:
    "Termine per la consegna dei progetti, in chiaro. Vuoto finché non è stato fissato.",
  stato_valutazione: "Schede della Commissione: chiusa oppure aperta.",
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

/**
 * Gli stati in cui il codice dell'istituto accetta le iscrizioni degli
 * studenti. Sta qui e non nelle rotte perché due punti lo devono usare, e
 * devono usarlo d'accordo: il cancello vero, nella rotta delle iscrizioni, e
 * l'email che avvisa il referente che può cominciare, nella rotta dello
 * staff. Se i due insiemi divergono, la scuola riceve un invito a partire
 * mentre gli studenti sbattono contro un errore, o il contrario.
 */
export const STATI_ADESIONE_CHE_ACCETTANO: ReadonlySet<string> = new Set([
  "confermata",
  "attiva",
]);

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
  "In questa fase non chiediamo i nomi degli studenti, ma solo quanti prevedete di coinvolgere. I ragazzi si iscriveranno da soli al percorso, con il codice che riceverete via email, e sarete voi a confermare l'elenco. Le autorizzazioni restano cartacee e in custodia all'istituto: il sito non le raccoglie e non le conserva.";

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
    a: "Il bando non fissa un termine: l'art. 10 rimanda i termini agli organizzatori, tramite il referente del consorzio degli istituti superiori. Appena la data sarà comunicata comparirà su questa pagina. Nel frattempo il modulo è aperto e conviene aderire, così ricevete il codice e potete iniziare a raccogliere le candidature.",
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
    a: "Sì, con un solo modulo in tre pagine, che il docente referente scarica già intestato dalla sua area riservata. Le pagine 1 e 2 sono l'informativa e restano alla famiglia o allo studente maggiorenne; la pagina 3 torna firmata al referente e resta agli atti dell'istituto, perché il sito non raccoglie moduli firmati. Per gli studenti minorenni firmano entrambi i genitori, o uno solo con una dichiarazione, e la pagina contiene l'autorizzazione a partecipare, che è necessaria. Per gli studenti maggiorenni c'è una variante che firma lo studente. Le scelte su foto e riprese dell'evento del 10 e 11 dicembre sono facoltative e non condizionano la partecipazione: prima dell'evento ci comunicate il loro esito per gli studenti finalisti.",
  },
  {
    q: "Come verranno usate foto e riprese?",
    a: "Il 10 dicembre al PalaMazzola e l'11 dicembre al Teatro Fusco, fotografi e videomaker incaricati riprendono le presentazioni e la premiazione. Fondazione bioERGOtech e SafesPro, contitolari del trattamento delle immagini, le usano secondo le scelte espresse nel modulo. Con il consenso A documentano l'iniziativa sui siti dei due enti, sui loro profili LinkedIn e Instagram e nei materiali per la stampa. Con il consenso B, che si aggiunge ad A, le immagini compaiono anche in materiali promozionali e commerciali dei due enti. L'autorizzazione è gratuita, esclude usi lesivi del decoro e cessioni a terzi diverse dalla consegna alla stampa, e si può revocare in ogni momento. Le immagini si conservano per 5 anni. Nessuno studente e nessun altro minore presente fra il pubblico viene reso riconoscibile nelle immagini pubblicate dagli organizzatori.",
  },
  {
    q: "Cosa succede a chi non autorizza le riprese?",
    a: "Partecipa come tutti, al percorso e all'evento. Se la sua squadra è finalista sale sul palco come gli altri, e gli organizzatori non pubblicano né usano immagini in cui sia riconoscibile. Fra il pubblico nessuno studente e nessun altro minore viene reso riconoscibile. Se per un consenso non è barrata nessuna casella, o sono barrate entrambe, vale come non autorizzo. Chi cambia idea prima dell'evento può firmare una nuova pagina 3 e riconsegnarla al referente. In ogni momento può revocare il consenso dato scrivendo a info@bioergotech.org o a info@altaformazioneprofessionisti.it. L'evento però è aperto al pubblico: giornalisti e spettatori possono fotografare con mezzi propri, e quelle immagini sfuggono al controllo degli organizzatori.",
  },
  {
    q: "Quanti studenti possiamo iscrivere?",
    a: "Il bando non fissa un tetto per istituto. Indicate nel modulo quanti prevedete di coinvolgere: quei numeri servono agli organizzatori per dimensionare il percorso e i posti all'evento del 10 dicembre.",
  },
  {
    q: "Come si formano le squadre?",
    a: "Dentro il corso, non adesso. Il lavoro in team è uno dei contenuti del percorso: i ragazzi si conoscono durante le prime settimane e formano la squadra quando hanno un'idea da sviluppare. Uno crea la squadra dalla sua area e passa ai compagni il codice per entrare. Si va da 2 a 5 studenti, tutti dello stesso istituto. I dieci progetti migliori salgono sul palco il 10 dicembre.",
  },
  {
    q: "Perché una squadra non può unire studenti di due scuole diverse?",
    a: "Perché è l'istituto che risponde dei suoi studenti: raccoglie le candidature, custodisce le autorizzazioni dei genitori e accompagna i ragazzi all'evento finale. Una squadra a cavallo di due scuole non avrebbe un referente che ne risponde. Il tetto di cinque coincide con la rappresentanza dell'art. 6, così la squadra vincitrice parte al completo.",
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════════
   Fase 2. Iscrizione degli studenti
   ═══════════════════════════════════════════════════════════════════════

   Qui, per la prima volta, il sito raccoglie dati di studenti in larga
   parte minorenni. Non e una scelta di disegno: le lezioni del corso sono
   protette da login, quindi senza un account lo studente non puo seguirlo.

   Il minimo per far funzionare corso e valutazione, e nient'altro: nome,
   cognome, classe, anno di corso, email. Niente data di nascita, niente
   codice fiscale, niente contatti dei genitori. L'anno di corso sostituisce
   l'eta ed e meno identificante. Le autorizzazioni restano cartacee e in
   custodia all'istituto: il sito genera il modulo da far firmare, non
   raccoglie il modulo firmato.
   ═══════════════════════════════════════════════════════════════════════ */

export const ISCRIZIONE_SLUG = "iscrizione";
export const REFERENTE_SLUG = "referente";

export const ISCRIZIONE_PATH = `${LICEI_PATH}/${ISCRIZIONE_SLUG}`;
export const REFERENTE_PATH = `${LICEI_PATH}/${REFERENTE_SLUG}`;

/**
 * La guida che spiega a ciascuno cosa deve fare e su quale link cliccare.
 * Vive sul sito e non altrove perche i docenti la devono ritrovare da soli,
 * e la cercano accanto al bando.
 */
export const GUIDA_SLUG = "guida";
export const GUIDA_PATH = `${LICEI_PATH}/${GUIDA_SLUG}`;

/**
 * Stato delle iscrizioni degli studenti, indipendente da quello delle
 * adesioni. Parte CHIUSO, ed e giusto cosi: aprire le iscrizioni prima che i
 * referenti abbiano ricevuto e diffuso il codice significa una pagina che
 * respinge tutti quelli che ci arrivano.
 */
export type StatoIscrizioni = "chiuse" | "aperte";

export const STATO_ISCRIZIONI_DEFAULT: StatoIscrizioni = "chiuse";

export const iscrizioniAperte = (stato: StatoIscrizioni): boolean =>
  !ARCHIVE_MODE && stato === "aperte";

/**
 * Stati dell'iscrizione di uno studente.
 *
 * Il referente conferma o rifiuta: e lui che sa chi sono davvero i suoi
 * studenti, e l'elenco confermato e esattamente quello che l'art. 4 gli
 * chiede di trasmettere. Senza questo passaggio l'elenco sarebbe
 * autodichiarato da chi conosce il codice.
 */
export const STATI_ISCRIZIONE = [
  { value: "in_attesa", label: "In attesa di conferma", colore: "#8A6100" },
  { value: "confermata", label: "Confermata", colore: "#0A7A66" },
  { value: "rifiutata", label: "Non riconosciuta", colore: "#B44A5E" },
  { value: "ritirata", label: "Ritirata", colore: "#8896A6" },
] as const;

export type StatoIscrizione = (typeof STATI_ISCRIZIONE)[number]["value"];

/**
 * Se uno studente e riuscito a entrare nel corso, oppure no.
 *
 * Due segnali e non uno, e il perche viene da un bug vero: in produzione e
 * comparso uno studente con 2 lezioni su 21 completate e il badge "Mai
 * entrato" addosso. Le due cose non possono stare insieme, perche per
 * consegnare la riflessione che chiude una lezione bisogna essere dentro.
 *
 * `ultimo_accesso` viene da `last_sign_in_at` di `auth.users`, e per quello
 * studente era nullo pur avendo lui una sessione e dei lavori consegnati.
 * Invece di indovinare come GoTrue tratti gli account creati dall'API di
 * amministrazione, si smette di appendere a un solo indizio un'affermazione
 * che un docente legge come un fatto: chi ha consegnato anche una sola
 * lezione e entrato, punto.
 *
 * Sta qui, accanto agli stati, perche la usano la console del referente, il
 * pannello dello staff e i due export. Tenerne quattro copie voleva dire
 * poterle disallineare, che e il modo in cui questo bug tornerebbe.
 */
export const haFattoAccesso = (r: {
  ultimo_accesso?: string | null;
  lezioni_completate?: number | null;
}): boolean => Boolean(r.ultimo_accesso) || (r.lezioni_completate ?? 0) > 0;

/** Gli stati in cui uno studente e ancora in gioco, quindi da seguire. */
export const STATI_ISCRIZIONE_ATTIVI: ReadonlySet<string> = new Set([
  "in_attesa",
  "confermata",
]);

export const statoIscrizioneLabel = (v: string): string =>
  STATI_ISCRIZIONE.find((s) => s.value === v)?.label ?? v;

export const statoIscrizioneColore = (v: string): string =>
  STATI_ISCRIZIONE.find((s) => s.value === v)?.colore ?? "#4A5568";

/* ── Dichiarazioni dello studente ─────────────────────────────────────── */

export const CONSENSO_PRIVACY_STUDENTE_TESTO =
  "Acconsento al trattamento dei miei dati per la partecipazione al percorso formativo e alla selezione dei progetti, ai sensi del Regolamento (UE) 2016/679.";

export const DICHIARAZIONE_AUTORIZZAZIONE_TESTO =
  "Se sono minorenne, ho consegnato o consegnerò alla scuola il modulo di autorizzazione firmato dai miei genitori o da chi esercita la responsabilità genitoriale. Se sono maggiorenne, so che il modulo per le scelte su foto e riprese lo firmo io.";

/**
 * Avviso mostrato allo studente prima dell'invio. Dice due cose che
 * altrimenti scoprirebbe dopo: che la scuola lo deve riconoscere, e che se
 * e minorenne senza il modulo firmato non partecipa.
 */
export const NOTA_ISCRIZIONE_STUDENTE =
  "La tua iscrizione arriva al docente referente del tuo istituto, che la conferma. Lui ha anche il modulo di autorizzazione: se sei minorenne lo firmano i tuoi genitori ed è necessario per partecipare; se sei maggiorenne lo firmi tu, e serve solo per le scelte su foto e riprese dell'evento.";

/* ── Modulo di autorizzazione per le famiglie ─────────────────────────── */

/**
 * Il modulo che il referente stampa e fa firmare, versione 2.
 *
 * La versione 1 era una pagina sola con due caselle, e un consulente privacy
 * l'ha giudicata, con ragione, la sola raccolta di una scelta: non diceva chi
 * tratta i dati, dove finiscono le immagini, per quanto e come si revoca. Un
 * consenso chiesto cosi non e informato, e un consenso non informato non
 * regge. Da qui le tre pagine:
 *
 * - pagine 1 e 2, l'informativa, che resta alla famiglia o allo studente
 *   maggiorenne. E una sola, impersonale, valida per le due varianti;
 * - pagina 3, le firme, che torna al referente e resta agli atti della
 *   scuola. Cambia con la variante: per il minorenne firmano i genitori e
 *   c'e l'autorizzazione a partecipare, per il maggiorenne firma lo studente.
 *
 * I consensi sulle immagini sono due e separati, perche fanno due cose
 * diverse: A documenta l'iniziativa, B porta le stesse immagini nei
 * materiali promozionali e commerciali dei due enti. Chi accetta il primo
 * deve poter rifiutare il secondo. Entrambi sono facoltativi, e chi non
 * autorizza partecipa lo stesso, anche sul palco.
 *
 * Le misure contano: l'informativa deve stare in due pagine A4 e la pagina 3
 * in una. Chi allunga un testo rigeneri il PDF e guardi che non sfori.
 */
export const MODULO_VERSIONE = "v2, settembre 2026";

/*
 * TODO, da decidere con il consulente privacy prima di distribuire il modulo:
 * - il ruolo della scuola per la pagina 3. Se la conserva per conto dei
 *   contitolari e un responsabile (art. 28 GDPR) e serve un atto di nomina
 *   firmato dal dirigente; se e titolare autonomo, la conservazione la fissa
 *   la scuola e ne da la propria informativa. Il punto 3 dell'informativa e
 *   `impegno_consensi` vanno completati di conseguenza, anche con il termine
 *   di conservazione della pagina, che oggi non e scritto perche non e
 *   deciso;
 * - i dati legali di SafesPro e il recapito diretto del DPO, in
 *   `app/legal/privacy/content.ts`.
 */

export type VarianteModulo = "minorenne" | "maggiorenne";

export type SezioneInformativa = { titolo: string; paragrafi: string[] };

export type InformativaModulo = {
  titolo: string;
  sottotitolo: string;
  /** Fascia in cima alla pagina 1, e quella di seguito sulla pagina 2. */
  fascia: string;
  fasciaSeguito: string;
  apertura: string;
  sezioni: SezioneInformativa[];
};

export const INFORMATIVA_MODULO: InformativaModulo = {
  titolo: "Informativa su dati personali, foto e riprese",
  sottotitolo:
    "Artt. 13 e 26 del Regolamento (UE) 2016/679 (GDPR), art. 10 c.c., artt. 96 e 97 L. 633/1941",
  fascia:
    "DA CONSERVARE. Le pagine 1 e 2 restano alla famiglia o allo studente maggiorenne. Alla scuola si riconsegna solo la pagina 3, firmata.",
  fasciaSeguito: "INFORMATIVA, DA CONSERVARE (segue dalla pagina 1)",
  apertura:
    "Questo modulo riguarda il percorso formativo gratuito \"Biotecnologie e Intelligenza Artificiale\", per gli studenti del triennio, e il suo evento finale a Taranto: il 10 dicembre 2026 al PalaMazzola, con i dieci progetti finalisti sul palco, e l'11 dicembre 2026 al Teatro Fusco, con la premiazione. Per lo studente minorenne firmano i genitori o il tutore, il maggiorenne firma per sé: qui \"chi firma\" indica gli uni o l'altro.",
  sezioni: [
    {
      titolo: "1. Chi tratta i dati",
      paragrafi: [
        `${TITOLARE.denominazione}, ${TITOLARE.sede}, C.F. ${TITOLARE.cf}, ${TITOLARE.email}.`,
        `${CONTITOLARE_IMMAGINI.denominazione}, ${CONTITOLARE_IMMAGINI.email}.`,
        "Per le foto e le riprese dell'evento i due enti sono contitolari del trattamento (art. 26 GDPR). Per i dati del percorso online il titolare è la sola Fondazione (punto 4).",
        `Per le foto e le riprese il responsabile della protezione dei dati (DPO) è ${DPO.nome}, ${DPO.contatto}.`,
      ],
    },
    {
      titolo: "2. I due contitolari",
      paragrafi: [
        "La Fondazione e SafesPro usano insieme le immagini dell'evento, solo nei limiti delle scelte espresse nella pagina 3. Ciascun ente cura ciò che pubblica sui propri canali, ma verso lo studente e chi firma ne rispondono entrambi. Il contenuto essenziale dell'accordo tra i contitolari (art. 26, par. 2, GDPR) si può chiedere agli indirizzi del punto 1.",
      ],
    },
    {
      titolo: "3. Il ruolo della scuola",
      paragrafi: [
        "La scuola distribuisce il modulo, raccoglie la pagina 3 firmata e la conserva agli atti, perché i consensi si possano dimostrare. Il modulo non viene inviato agli organizzatori: prima dell'evento la scuola comunica loro solo il nome e l'esito dei consensi A e B degli studenti finalisti, e mostra il modulo se chiedono di verificarlo. Il modulo non autorizza la scuola a usare le immagini degli organizzatori e non riguarda le foto fatte da docenti e accompagnatori con mezzi propri.",
      ],
    },
    {
      titolo: "4. I dati del percorso",
      paragrafi: [
        "Per il percorso online (account, lezioni, squadra, progetto e valutazione) il titolare è la Fondazione e vale l'informativa completa del sito, www.bioergotech.org/legal/informativa-privacy, che lo studente riceve all'iscrizione.",
      ],
    },
    {
      titolo: "5. Foto e riprese",
      paragrafi: [
        "Nelle due giornate si fanno fotografie e video, con l'audio e quindi con la voce (\"immagini\", in questa informativa), delle presentazioni, della premiazione e degli altri momenti dell'evento, comprese le foto di gruppo. Riprendono fotografi e videomaker incaricati dagli organizzatori, secondo le loro istruzioni. Nelle didascalie e nei testi possono comparire il nome della squadra, il titolo del progetto e l'istituto, non il nome e cognome dello studente. Il modulo non autorizza trasmissioni in diretta.",
      ],
    },
    {
      titolo: "6. Dove si pubblicano e per quali usi",
      paragrafi: [
        "Con il consenso A le immagini servono a documentare e comunicare questa edizione dell'iniziativa: sui siti web dei due enti, sui loro profili LinkedIn e Instagram, in comunicati e materiali per la stampa. Con il consenso B, che si aggiunge ad A, le stesse immagini si usano in materiali promozionali e commerciali dei due enti, cioè brochure, presentazioni, pagine e inserzioni che promuovono le loro attività e i loro corsi, comprese le edizioni successive del percorso, senza attribuire allo studente dichiarazioni o giudizi sui corsi promossi.",
      ],
    },
    {
      titolo: "7. Base giuridica e condizioni d'uso",
      paragrafi: [
        "La base giuridica è il consenso di chi firma (art. 6, par. 1, lett. a, GDPR), che vale anche come autorizzazione all'uso del ritratto (art. 10 c.c. e art. 96 L. 633/1941). Sul legittimo interesse degli organizzatori (art. 6, par. 1, lett. f, GDPR) si basano invece le riprese d'insieme, in cui può comparire anche chi non ha dato il consenso (punti 8 e 11), e la conservazione dell'esito delle scelte di chi non autorizza, per rispettarle; quello dei consensi dati si conserva per l'obbligo di poterli dimostrare (art. 7, par. 1, GDPR).",
        "L'autorizzazione è gratuita e non dà diritto ad alcun compenso. Le immagini possono essere ritagliate, adattate nel formato e montate, senza alterarne il significato. Sono esclusi gli usi che ledono la dignità, l'onore, la reputazione o il decoro dello studente (art. 97 L. 633/1941). Le immagini non sono cedute né vendute a terzi, compresi sponsor e partner dell'evento, salvo la consegna alla stampa prevista dal consenso A e la licenza che LinkedIn e Instagram chiedono sui contenuti pubblicati (punto 9).",
      ],
    },
    {
      titolo: "8. Pubblico e stampa",
      paragrafi: [
        "Nelle immagini pubblicate dagli organizzatori nessuno studente e nessun altro minore del pubblico è reso riconoscibile, anche senza questo modulo. L'evento è aperto al pubblico: giornalisti e spettatori possono fotografare e riprendere con mezzi propri, e gli organizzatori non ne rispondono.",
      ],
    },
    {
      titolo: "9. Chi riceve le immagini",
      paragrafi: [
        "Le trattano per conto degli organizzatori, come responsabili del trattamento (art. 28 GDPR), i fotografi e videomaker incaricati e i fornitori tecnici che ospitano siti e archivi. LinkedIn e Instagram le ricevono con la pubblicazione e le trattano anche secondo le proprie condizioni. Con il consenso A le ricevono giornalisti e testate; con il consenso B, i fornitori che realizzano i materiali promozionali. Online le immagini sono visibili a chiunque e possono essere copiate da terzi. Per fornitori tecnici e trasferimenti fuori dallo Spazio Economico Europeo vale l'informativa del sito; per SafesPro si può scrivere a info@altaformazioneprofessionisti.it.",
      ],
    },
    {
      titolo: "10. Per quanto tempo",
      paragrafi: [
        "Le immagini selezionate secondo le scelte sono conservate per 5 anni dall'evento, quindi fino a dicembre 2031, poi cancellate dagli archivi dei due enti e rimosse dai loro siti e profili; le altre sono cancellate al termine della selezione. Né alla scadenza né dopo una revoca si possono ritirare i materiali già distribuiti, stampati o in file, o le immagini già pubblicate dalla stampa o copiate da terzi. L'esito delle scelte e le revoche si conservano per lo stesso periodo, anche dopo una revoca.",
      ],
    },
    {
      titolo: "11. Le scelte sono libere",
      paragrafi: [
        "I consensi A e B sono facoltativi. Chi non autorizza partecipa al percorso e all'evento come gli altri e, se è finalista, sale sul palco con la sua squadra: può comparire nelle riprese del palco e d'insieme, ma le immagini in cui è riconoscibile sono cancellate durante la selezione, senza alcun uso. Per chi assiste dal pubblico vale il punto 8. Se per un consenso non è barrata nessuna casella, o sono barrate entrambe, vale NON AUTORIZZO, e il consenso B vale solo se è autorizzato anche A. Per i minorenni è invece necessaria l'autorizzazione a partecipare, nella pagina 3.",
      ],
    },
    {
      titolo: "12. Revoca e suoi effetti",
      paragrafi: [
        "Il consenso A, il consenso B o entrambi possono essere revocati in ogni momento da ciascun genitore o dal tutore, anche da chi non ha firmato, e dallo studente maggiorenne, scrivendo a info@bioergotech.org o a info@altaformazioneprofessionisti.it, oppure consegnandola per iscritto al docente referente. La revoca vale per il futuro e non rende illecito l'uso fatto prima. Revocare A comporta anche la revoca di B: cessano i nuovi usi, le immagini sono cancellate dagli archivi dei due enti e rimosse dai loro siti e profili senza ingiustificato ritardo e comunque entro un mese, e chi le ha ricevute dagli organizzatori viene avvisato. Revocando solo B, nello stesso termine le immagini sono tolte dai materiali promozionali ancora in uso, e restano gli usi del consenso A. Lo studente che diventa maggiorenne può confermare o revocare di persona le scelte dei genitori, anche firmando, prima dell'evento, la variante per maggiorenni.",
      ],
    },
    {
      titolo: "13. Diritti e reclamo",
      paragrafi: [
        "Si possono chiedere a ciascuno dei due enti, agli indirizzi del punto 1, l'accesso ai dati e alle immagini, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e, per i trattamenti basati sul legittimo interesse, l'opposizione. Per lo studente minorenne lo fanno i genitori o il tutore. Si può proporre reclamo al Garante per la protezione dei dati personali, www.garanteprivacy.it.",
      ],
    },
  ],
};

/** Un consenso sulle immagini, con le due caselle AUTORIZZO e NON AUTORIZZO. */
export type ConsensoModulo = { titolo: string; testo: string };

export type PaginaFirme = {
  /** Come la variante compare nel piè di pagina e nel nome del file. */
  nome: string;
  /** Etichetta del bottone nella console del referente. */
  bottone: string;
  fascia: string;
  titolo: string;
  sottotitolo: string;
  campi: string[];
  presaVisione: string;
  /** Solo per il minorenne: l'autorizzazione a partecipare, senza caselle. */
  partecipazione: { titolo: string; testo: string; nota: string } | null;
  /** Solo per il maggiorenne: una riga al posto del riquadro partecipazione. */
  notaPartecipazione: string | null;
  consensoA: ConsensoModulo;
  consensoB: ConsensoModulo;
  regole: string;
  /** Solo per il minorenne: che cosa dichiara chi firma da solo. */
  firmaSingola: { intestazione: string; opzioni: string[] } | null;
  /** A coppie, sinistra e destra: la prima e sempre "Luogo e data". */
  firme: string[];
};

const CONSENSO_A_CONDIZIONI =
  "e loro pubblicazione sui siti web e sui profili LinkedIn e Instagram di Fondazione bioERGOtech e SafesPro e in comunicati e materiali per la stampa. Vale come consenso al trattamento (art. 6, par. 1, lett. a, GDPR) e come autorizzazione all'uso del ritratto (art. 10 c.c. e art. 96 L. 633/1941), a titolo gratuito e senza alcun compenso. Sono esclusi gli usi lesivi di dignità, onore, reputazione e decoro (art. 97 L. 633/1941) e ogni altra cessione a terzi. Le immagini sono conservate per 5 anni dall'evento. Revocabile in ogni momento per il futuro.";

const CONSENSO_A_TITOLO = "Consenso A. Foto e riprese per documentare e comunicare l'iniziativa";

const CONSENSO_B: ConsensoModulo = {
  titolo: "Consenso B. Materiali promozionali e commerciali",
  testo:
    "Uso delle stesse immagini in materiali promozionali e commerciali di Fondazione bioERGOtech e SafesPro, cioè brochure, presentazioni, pagine e inserzioni che promuovono le loro attività e i loro corsi, alle stesse condizioni del consenso A: a titolo gratuito, senza usi lesivi e senza cessione a terzi, per 5 anni dall'evento, revocabile per il futuro. Allo studente non sono attribuite dichiarazioni o giudizi sui corsi promossi.",
};

const FASCIA_FIRME = "DA RICONSEGNARE FIRMATA AL DOCENTE REFERENTE";

export const PAGINA_FIRME: Record<VarianteModulo, PaginaFirme> = {
  minorenne: {
    nome: "studenti minorenni",
    bottone: "Modulo per studenti minorenni",
    fascia: FASCIA_FIRME,
    titolo: "Autorizzazioni e consensi per lo studente minorenne",
    sottotitolo:
      "Da compilare e firmare a cura dei genitori o del tutore, solo per lo studente che non ha ancora compiuto 18 anni.",
    campi: [
      "Genitore 1 o tutore (nome e cognome)",
      "Genitore 2 (nome e cognome)",
      "Studente (nome e cognome)",
      "Classe e sezione",
    ],
    presaVisione:
      "Chi firma dichiara di aver ricevuto e letto l'informativa delle pagine 1 e 2, che trattiene.",
    partecipazione: {
      titolo: "Partecipazione al percorso formativo",
      testo:
        "Chi firma autorizza lo studente a partecipare al percorso formativo gratuito \"Biotecnologie e Intelligenza Artificiale\", promosso da Fondazione bioERGOtech e SafesPro, che si svolge online, fuori dall'orario scolastico e con un account personale sul sito della Fondazione, al lavoro in squadra e allo sviluppo di un progetto e, se la squadra è finalista, all'evento finale del 10 e 11 dicembre 2026 a Taranto.",
      nota: "Necessaria per partecipare.",
    },
    notaPartecipazione: null,
    consensoA: {
      titolo: CONSENSO_A_TITOLO,
      testo: `Riprese fotografiche e video dello studente, con la voce, il 10 dicembre 2026 al PalaMazzola e l'11 dicembre 2026 al Teatro Fusco di Taranto, ${CONSENSO_A_CONDIZIONI}`,
    },
    consensoB: CONSENSO_B,
    regole:
      "Per ciascun consenso, se non è barrata nessuna casella o sono barrate entrambe, vale NON AUTORIZZO. Il consenso B vale solo se è autorizzato anche il consenso A. Se firma un solo genitore senza barrare una delle due dichiarazioni qui sotto, A e B valgono NON AUTORIZZO. La firma dello studente attesta la presa visione e non è necessaria per la validità delle scelte. La partecipazione al percorso e all'evento non dipende da queste scelte.",
    firmaSingola: {
      intestazione: "Da compilare se firma un solo genitore. Chi firma dichiara che:",
      opzioni: [
        "le scelte di questa pagina sono condivise con l'altro genitore, nel rispetto degli artt. 316, 337-ter e 337-quater c.c.;",
        "esercita da solo la responsabilità genitoriale, anche per le decisioni di maggiore interesse per lo studente.",
      ],
    },
    firme: [
      "Luogo e data",
      "Firma del genitore 1 o del tutore",
      "Firma del genitore 2",
      "Firma dello studente, per presa visione",
    ],
  },
  maggiorenne: {
    nome: "studenti maggiorenni",
    bottone: "Modulo per studenti maggiorenni",
    fascia: FASCIA_FIRME,
    titolo: "Consensi dello studente maggiorenne",
    sottotitolo: "Da compilare e firmare a cura dello studente che ha compiuto 18 anni.",
    campi: ["Studente (nome e cognome)", "Classe e sezione"],
    presaVisione:
      "Dichiaro di essere maggiorenne e di aver ricevuto e letto l'informativa delle pagine 1 e 2, che trattengo.",
    partecipazione: null,
    notaPartecipazione:
      "Per lo studente maggiorenne la partecipazione non richiede autorizzazioni: questa pagina riguarda solo foto e riprese.",
    consensoA: {
      titolo: CONSENSO_A_TITOLO,
      testo: `Riprese fotografiche e video che mi ritraggono, con la voce, il 10 dicembre 2026 al PalaMazzola e l'11 dicembre 2026 al Teatro Fusco di Taranto, ${CONSENSO_A_CONDIZIONI}`,
    },
    consensoB: CONSENSO_B,
    regole:
      "Per ciascun consenso, se non è barrata nessuna casella o sono barrate entrambe, vale NON AUTORIZZO. Il consenso B vale solo se è autorizzato anche il consenso A. Per i consensi A e B questa pagina sostituisce quella firmata in precedenza dai genitori. Se lo studente maggiorenne non riconsegna questa pagina, valgono le scelte firmate dai genitori quando era minorenne oppure, se non ci sono, NON AUTORIZZO. La partecipazione al percorso e all'evento non dipende da queste scelte.",
    firmaSingola: null,
    firme: ["Luogo e data", "Firma dello studente"],
  },
};

export const AUTORIZZAZIONE_NOTA_CUSTODIA =
  "Questa pagina resta agli atti della scuola: non va inviata agli organizzatori né caricata su alcun sito. Prima dell'evento la scuola comunica agli organizzatori solo l'esito dei consensi A e B dei finalisti, e mostra questa pagina se lo chiedono.";

/** Il piè di ogni pagina: chi tratta le immagini, la versione e la variante. */
export const piedeModulo = (variante: VarianteModulo, pagina: number, totale: number): string =>
  `Contitolari per foto e riprese: Fondazione bioERGOtech ETS e SafesPro. Modulo ${MODULO_VERSIONE}, ${PAGINA_FIRME[variante].nome}. Pagina ${pagina} di ${totale}`;

/* ═══════════════════════════════════════════════════════════════════════
   Fase 3. Squadre, progetti, Commissione e finalisti
   ═══════════════════════════════════════════════════════════════════════

   Le prime due fasi portano lo studente dentro. Questa gli fa produrre
   qualcosa e la fa giudicare: la squadra si forma (art. 3), consegna un
   progetto, la Commissione lo valuta sui criteri dell'art. 7 e i primi
   dieci salgono sul palco del 10 dicembre (art. 6).
   ═══════════════════════════════════════════════════════════════════════ */

export const STUDENTE_SLUG = "studente";
export const COMMISSIONE_SLUG = "commissione";

export const STUDENTE_PATH = `${LICEI_PATH}/${STUDENTE_SLUG}`;
export const COMMISSIONE_PATH = `${LICEI_PATH}/${COMMISSIONE_SLUG}`;

/**
 * Quanti studenti in una squadra.
 *
 * Il massimo è cinque, ed è il numero dell'art. 6: la rappresentanza che
 * parte per il premio. Farli coincidere significa che la squadra vincitrice
 * ci va al completo, e nessuno resta a casa a guardare le foto dei compagni.
 *
 * Il minimo è due perché l'art. 3 chiede un lavoro in team, e uno studente
 * da solo non è un team. Vale alla consegna, non alla creazione: una squadra
 * nasce con il suo fondatore e cresce nei giorni successivi.
 */
export const SQUADRA_MIN = 2;
export const SQUADRA_MAX = 5;

/** Una squadra sta dentro un solo istituto. Il perché è nella FAQ e nella migrazione. */
export const SQUADRA_UN_SOLO_ISTITUTO = true;

/* ── Interruttori delle fasi ──────────────────────────────────────────── */

/**
 * Ogni fase ha il suo stato e parte chiusa. Si aprono in ordine e a mano:
 * aprire le consegne prima che esistano le squadre, o la valutazione prima
 * che esistano i progetti, produce schermate senza niente da mostrare.
 */
export type StatoSquadre = "chiuse" | "aperte";
export type StatoConsegne = "chiuse" | "aperte";
export type StatoValutazione = "chiusa" | "aperta";

export const STATO_SQUADRE_DEFAULT: StatoSquadre = "chiuse";
export const STATO_CONSEGNE_DEFAULT: StatoConsegne = "chiuse";
export const STATO_VALUTAZIONE_DEFAULT: StatoValutazione = "chiusa";

export const squadreAperte = (stato: StatoSquadre): boolean =>
  !ARCHIVE_MODE && stato === "aperte";

export const consegneAperte = (stato: StatoConsegne): boolean =>
  !ARCHIVE_MODE && stato === "aperte";

export const valutazioneAperta = (stato: StatoValutazione): boolean =>
  !ARCHIVE_MODE && stato === "aperta";

/* ── Stati del progetto ───────────────────────────────────────────────── */

export const STATI_PROGETTO = [
  { value: "bozza", label: "Bozza", colore: "#8A6100" },
  { value: "consegnato", label: "Consegnato", colore: "#0A7A66" },
  { value: "ritirato", label: "Ritirato", colore: "#8896A6" },
] as const;

export type StatoProgetto = (typeof STATI_PROGETTO)[number]["value"];

export const statoProgettoLabel = (v: string): string =>
  STATI_PROGETTO.find((s) => s.value === v)?.label ?? v;

export const statoProgettoColore = (v: string): string =>
  STATI_PROGETTO.find((s) => s.value === v)?.colore ?? "#4A5568";

/* ── Il modulo di consegna ────────────────────────────────────────────── */

/**
 * Sei domande, una per criterio dell'art. 7.
 *
 * Non è un questionario: è la griglia di valutazione girata in domande. Se
 * la Commissione assegna 15 punti agli aspetti etici, il modulo li deve
 * chiedere, altrimenti valuta qualcosa che a nessuno è stato chiesto e i
 * ragazzi perdono punti su un capitolo che non sapevano di dover scrivere.
 *
 * Il limite di caratteri è basso di proposito. Sintetizzare fa parte del
 * lavoro, e una Commissione che legge trenta progetti legge davvero solo
 * quelli che stanno in una pagina.
 */
export const CAMPI_PROGETTO = [
  {
    campo: "problema",
    label: "Il problema",
    aiuto:
      "Quale problema reale avete scelto, e perché conta. Ambito sanitario, ambientale o industriale.",
    max: 800,
    criterio: "Innovatività e originalità",
  },
  {
    campo: "soluzione",
    label: "La vostra soluzione",
    aiuto:
      "Che cosa proponete, in concreto. Che cosa la rende diversa da quello che già esiste.",
    max: 1200,
    criterio: "Innovatività e originalità",
  },
  {
    campo: "tecnologie",
    label: "Biotecnologie e intelligenza artificiale impiegate",
    aiuto:
      "Quali tecnologie usereste e come. Non serve saperle già usare: serve che il percorso da qui a lì stia in piedi.",
    max: 1000,
    criterio: "Fattibilità tecnica",
  },
  {
    campo: "impatto",
    label: "Impatto atteso",
    aiuto: "Chi ne trae beneficio, quanti sono, e come vi accorgereste che sta funzionando.",
    max: 800,
    criterio: "Impatto potenziale",
  },
  {
    campo: "etica",
    label: "Aspetti etici",
    aiuto:
      "Che cosa potrebbe andare storto, chi potrebbe essere danneggiato, come lo terreste sotto controllo. Vale 15 punti su 100: non è una formalità.",
    max: 800,
    criterio: "Aspetti etici",
  },
  {
    campo: "metodo",
    label: "Come avete lavorato",
    aiuto:
      "Come vi siete divisi il lavoro, come avete deciso quando non eravate d'accordo, che cosa rifareste diversamente.",
    max: 800,
    criterio: "Lavoro di squadra e metodo",
  },
] as const;

export type CampoProgetto = (typeof CAMPI_PROGETTO)[number]["campo"];

export const TITOLO_MAX = 120;
export const SQUADRA_NOME_MAX = 60;

/**
 * Un link, non un caricamento. Il sito non conserva file prodotti da minori
 * se può evitarlo, e una presentazione su Drive o un video su YouTube fanno
 * lo stesso lavoro restando in mano a chi li ha fatti.
 */
export const NOTA_MATERIALI =
  "Se avete una presentazione, un video o un prototipo, incollate qui il link e controllate che sia visibile a chi lo apre senza essere loggato. Non carichiamo file su questo sito.";

export const NOTA_CONSEGNA =
  "Una volta consegnato, il progetto non è più modificabile. Fino ad allora resta una bozza che potete salvare e riprendere quando volete, e che nessuno all'infuori della vostra squadra può leggere.";

/* ── Commissione (art. 8) ─────────────────────────────────────────────── */

/**
 * I ruoli dell'art. 8. L'ultimo è quello che spiega la colonna
 * `diritto_voto`: il referente del consorzio siede in Commissione con
 * funzioni consultive e senza diritto di voto, quindi vede i progetti e
 * scrive note, ma i suoi numeri non entrano nella media.
 */
export const RUOLI_COMMISSIONE = [
  { value: "presidente", label: "Presidente (direzione scientifica)", voto: true },
  { value: "organizzatore", label: "Ente organizzatore (SafesPro)", voto: true },
  { value: "esperto", label: "Esperto esterno (ricerca e università)", voto: true },
  { value: "impresa", label: "Impresa e mentor", voto: true },
  { value: "consorzio", label: "Referente consorzio istituti superiori (senza voto)", voto: false },
] as const;

export type RuoloCommissione = (typeof RUOLI_COMMISSIONE)[number]["value"];

export const ruoloCommissioneLabel = (v: string): string =>
  RUOLI_COMMISSIONE.find((r) => r.value === v)?.label ?? v;

/** Somma dei punti dei criteri: deve fare 100, e il test lo verifica. */
export const PUNTEGGIO_TOTALE_CRITERI = CRITERI_LICEI.reduce((s, c) => s + c.punti, 0);

export const NOTA_VALUTAZIONE_INDIPENDENTE =
  "Vede solo le sue schede. Il punteggio degli altri commissari non le compare, e non è riservatezza fine a se stessa: un voto letto prima di dare il proprio lo tira verso di sé, e la media di cinque giudizi ancorati vale meno di cinque giudizi indipendenti.";

/* ── Finalisti (art. 6) ───────────────────────────────────────────────── */

/**
 * I finalisti non si iscrivono all'evento: ci vengono iscritti. Sono già
 * nel database con nome, cognome ed email, hanno già l'autorizzazione dei
 * genitori in segreteria, e devono salire sul palco. Chiedergli di
 * ricompilare un modulo di iscrizione sarebbe un ostacolo in più fra loro e
 * una sedia che è già la loro.
 */
export const SESSIONE_FINALISTI = "giorno-1";

export const NOTA_ISCRIZIONE_UFFICIO =
  "Iscrive all'evento del 10 dicembre tutti i componenti confermati delle squadre finaliste. L'operazione si può ripetere senza creare doppioni: chi risulta già iscritto viene lasciato dov'è.";

/* ── Podio (art. 6) ───────────────────────────────────────────────────── */

/**
 * Il premio che spetta a una posizione, o null se quella posizione non e sul
 * podio. I dieci che salgono sul palco sono tutti finalisti, ma solo i primi
 * tre ricevono un premio: tenere separate le due cose evita che qualcuno
 * legga "finalista" come "premiato" e lo dica a una famiglia.
 */
export const premioPerPosizione = (posizione: number | null | undefined) =>
  posizione == null ? null : PREMI_LICEI.find((p) => p.posizione === posizione) ?? null;

/**
 * Il podio si decide DOPO le presentazioni dal palco, non prima.
 *
 * L'evento dura due giorni: il 10 dicembre i dieci gruppi presentano, l'11
 * c'e la premiazione. Fra i due momenti la Commissione rivede il criterio
 * "Qualita della presentazione", che sui materiali consegnati si puo solo
 * stimare e dal vivo si vede davvero. Per questo le schede si riaprono: la
 * classifica scritta serve a scegliere i dieci, il podio arriva dopo.
 */
export const NOTA_PODIO =
  "La classifica scritta sceglie i dieci che salgono sul palco. Il podio si assegna dopo le presentazioni del 10 dicembre, quando la Commissione ha rivisto la qualità dell'esposizione: fino ad allora le posizioni 1, 2 e 3 restano una proposta.";

/**
 * Nota mostrata al commissario sul criterio della presentazione. Senza,
 * darebbe un voto definitivo su una cosa che non ha ancora visto.
 */
export const NOTA_CRITERIO_PRESENTAZIONE =
  "Sui materiali consegnati questo criterio si può solo stimare. Lo rivedrà dopo le presentazioni dal palco: le schede si riaprono apposta.";
