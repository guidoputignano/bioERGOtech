/**
 * Testi dell'informativa privacy, in inglese e in italiano.
 *
 * Stanno in un modulo solo e non in due pagine perche due informative
 * mantenute a mano divergono, e un'informativa che dice due cose diverse in
 * due lingue e peggio di un'informativa in una lingua sola. Le due pagine
 * (`/legal/privacy` e `/legal/informativa-privacy`) rendono la stessa
 * struttura con testi diversi: se si aggiunge una sezione, il TypeScript
 * obbliga ad aggiungerla in entrambe.
 *
 * La versione italiana esiste perche i moduli che rimandano qui sono in
 * italiano e si rivolgono a scuole, a studenti in larga parte minorenni e
 * alle loro famiglie. Un consenso informato raccolto in italiano che rimanda
 * a un documento in inglese e informato solo a meta.
 */

export type Lingua = "en" | "it";

export type GruppoDati = { titolo: string; voci: string[] };
export type RigaFinalita = { finalita: string; base: string };

/**
 * Una categoria di dati e per quanto la si conserva.
 *
 * `periodo: null` non e una dimenticanza ed e reso in pagina in modo
 * esplicito: significa che il termine non e ancora stato deciso, e al suo
 * posto compare il criterio, che l'art. 13 GDPR accetta in alternativa al
 * periodo. Appena la Fondazione fissa i termini si scrive qui la stringa e
 * la pagina cambia da sola, in tutte e due le lingue.
 *
 * TODO: definire i termini di conservazione delle quattro categorie che oggi
 * hanno `periodo: null`. Sono una decisione della Fondazione, non un
 * dettaglio tecnico, e non vanno inventati.
 */
export type RigaConservazione = { categoria: string; periodo: string | null };

export type Informativa = {
  titoloPagina: string;
  descrizionePagina: string;
  titolo: string;
  aggiornamento: string;
  /** Rimando all'altra lingua, in cima alla pagina. */
  altraLingua: { etichetta: string; href: string };

  titolare: { h: string; intro: string };
  raccolta: { h: string; intro: string; gruppi: GruppoDati[] };
  finalita: { h: string; colFinalita: string; colBase: string; righe: RigaFinalita[]; nota: string };
  conservazione: { h: string; intro: string; righe: RigaConservazione[]; senzaTermine: string };
  condivisione: { h: string; intro: string; voci: string[]; nota: string };
  trasferimenti: { h: string; testo: string };
  diritti: { h: string; intro: string; voci: { diritto: string; desc: string }[]; nota: string };
  sicurezza: { h: string; testo: string };
  minori: { h: string; paragrafi: string[] };
  aggiornamenti: { h: string; testo: string };
  autorita: { h: string; intro: string };
  cookie: string;
};

/* ── Inglese ──────────────────────────────────────────────────────────── */

const EN: Informativa = {
  titoloPagina: "Privacy Policy",
  descrizionePagina: "Privacy Policy for the bioERGOtech Foundation website.",
  titolo: "Privacy Policy",
  aggiornamento: "Last updated: September 2026",
  altraLingua: { etichetta: "Leggi questa informativa in italiano", href: "/legal/informativa-privacy" },

  titolare: {
    h: "1. Data Controller",
    intro: "The data controller responsible for your personal data is:",
  },

  raccolta: {
    h: "2. What Data We Collect",
    intro:
      "We collect the following categories of personal data depending on how you interact with our website:",
    gruppi: [
      {
        titolo: "Membership Applications",
        voci: [
          "Full name and job title",
          "Email address",
          "Organisation name, type, website",
          "Country and city",
          "Scientific areas of interest",
          "Statement of what you bring to and seek from the ecosystem",
        ],
      },
      {
        titolo: "Member Portal Accounts",
        voci: [
          "Email address and encrypted password",
          "Full name and organisation details",
          "Partnership level and access permissions",
          "Login timestamps and session data",
        ],
      },
      {
        titolo: "Schools Joining an Educational Programme",
        voci: [
          "Name of the institute, its ministerial code, town and province",
          "Institute email address and website, and the head teacher's name",
          "Referring teacher: name, surname, email, telephone and subject taught",
          "Number of students the institute expects to involve, by year of study, and the classes concerned",
          "Expected attendance at the closing event, and any notes the institute adds",
          "The commitments and declarations ticked when joining, recorded with their wording and timestamp",
        ],
      },
      {
        titolo: "Students Enrolled in an Educational Programme",
        voci: [
          "Name, surname and contact email",
          "Class and year of study",
          "The institute the student belongs to, and the team they join",
          "Reflections submitted at the end of each lesson, and the project the team submits",
          "The consent and the declaration about the parental authorisation, recorded with their wording and timestamp",
        ],
      },
      {
        titolo: "Applications to Our Calls",
        voci: [
          "Contact person: name, surname, role, email and telephone",
          "The project or organisation described in the application, and any links to material the applicant chooses to share",
          "For the university call: university, degree course, level of study and areas of interest",
          "For the startup call: legal form, VAT number, incorporation date, country and city, and the funding and traction figures the applicant reports",
          "The declarations and consents given, recorded with their wording and timestamp",
        ],
      },
      {
        titolo: "Website Usage",
        voci: [
          "IP address and browser type (anonymised where possible)",
          "Pages visited and time spent",
          "Referring website or search query",
          "Cookie preferences",
        ],
      },
    ],
  },

  finalita: {
    h: "3. How We Use Your Data",
    colFinalita: "Purpose",
    colBase: "Legal Basis",
    righe: [
      { finalita: "Processing membership applications", base: "Legitimate interest / Pre-contractual steps" },
      { finalita: "Providing Member Portal access", base: "Performance of a contract" },
      { finalita: "Sending application status updates", base: "Legitimate interest" },
      { finalita: "Assessing and confirming a school's participation", base: "Legitimate interest / Pre-contractual steps" },
      { finalita: "Enrolling students and giving them access to the course", base: "Consent, and performance of the programme the school has joined" },
      { finalita: "Recording course work, teams and project submissions, and assessing them", base: "Legitimate interest in running and judging the programme" },
      { finalita: "Registering finalists for the closing event", base: "Legitimate interest" },
      { finalita: "Processing applications to our calls", base: "Consent / Pre-contractual steps" },
      { finalita: "Sending platform notifications", base: "Consent / Legitimate interest" },
      { finalita: "Improving website performance", base: "Consent (analytics cookies)" },
      { finalita: "Complying with legal obligations", base: "Legal obligation" },
    ],
    nota:
      "Where processing is based on consent, you may withdraw it at any time, and withdrawal does not affect the lawfulness of processing carried out before it.",
  },

  conservazione: {
    h: "4. Data Retention",
    intro:
      "We retain your personal data only for as long as necessary for the purposes described in this policy:",
    righe: [
      { categoria: "Membership applications", periodo: "Retained for 2 years from the date of submission, or until you request deletion." },
      { categoria: "Member Portal accounts", periodo: "Retained for the duration of your membership plus 1 year after account closure." },
      { categoria: "Website analytics", periodo: "Aggregated data retained for up to 26 months." },
      { categoria: "Email communications", periodo: "Retained for up to 3 years for record-keeping purposes." },
      { categoria: "Records of schools joining a programme", periodo: null },
      { categoria: "Student enrolment records", periodo: null },
      { categoria: "Course work, teams and project submissions", periodo: null },
      { categoria: "Applications to our calls", periodo: null },
    ],
    senzaTermine:
      "A fixed period is being defined. Until it is set, the data is kept only for as long as the purposes described above require, and is deleted on request.",
  },

  condivisione: {
    h: "5. Data Sharing",
    intro:
      "We do not sell your personal data. We share data only with trusted service providers who process it on our behalf:",
    voci: [
      "Supabase Inc. Database and authentication hosting (EU data residency available)",
      "Vercel Inc. Website hosting and deployment",
      "Resend. Delivery of the transactional emails described in this policy",
      "Google LLC. Maps and productivity tools (Google for Nonprofits)",
    ],
    nota:
      "All third-party processors are bound by Data Processing Agreements and are required to process data only as instructed by us. The members of the assessment panel for our calls and programmes see the submitted projects in order to score them, and are bound to confidentiality. Students' names are not disclosed to them.",
  },

  trasferimenti: {
    h: "6. International Transfers",
    testo:
      "Some of our service providers are based outside the European Economic Area (EEA). Where data is transferred outside the EEA, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.",
  },

  diritti: {
    h: "7. Your Rights",
    intro: "Under GDPR and Italian data protection law, you have the following rights:",
    voci: [
      { diritto: "Right of Access", desc: "Request a copy of the personal data we hold about you." },
      { diritto: "Right to Rectification", desc: "Request correction of inaccurate or incomplete data." },
      { diritto: "Right to Erasure", desc: "Request deletion of your personal data ('right to be forgotten')." },
      { diritto: "Right to Restriction", desc: "Request that we limit how we use your data." },
      { diritto: "Right to Portability", desc: "Receive your data in a structured, machine-readable format." },
      { diritto: "Right to Object", desc: "Object to processing based on legitimate interests." },
      { diritto: "Right to Withdraw Consent", desc: "Withdraw consent at any time where processing is consent-based." },
      { diritto: "Right to Complain", desc: "Lodge a complaint with the Italian Data Protection Authority (Garante)." },
    ],
    nota: "To exercise any of these rights, contact us at info@bioergotech.org. We will respond within 30 days.",
  },

  sicurezza: {
    h: "8. Security",
    testo:
      "We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These include encrypted data transmission (HTTPS), password hashing, and role-based access controls within the Member Portal and the programme consoles.",
  },

  minori: {
    h: "9. Minors",
    paragrafi: [
      "Our website and services are not directed at children under the age of 14, and we do not knowingly collect their personal data. If you believe a child under 14 has provided us with personal data, please contact us and we will delete it promptly.",
      "Some of our educational programmes are addressed to secondary school students, who may be minors aged 14 or over. Participation in those programmes always runs through the student's school, which appoints a referring teacher, collects the parental authorisations on our behalf and keeps the signed forms on file. In those cases we process only what the programme needs: name, surname, class, year of study and contact email. We do not collect dates of birth, tax codes, identity documents or parents' contact details. Separate authorisation is always requested before a student appears in photographs or recordings of our events. Parents and guardians may exercise the rights described above on behalf of their child by writing to the address at the end of this policy.",
      "Taking part in the programme also means following an online course, which requires an account. Alongside the data listed above we therefore keep the work the student submits during the course: the reflection that closes each lesson, the team they belong to and the project the team submits. The referring teacher sees how far their own students have got, so that the school can follow them. The assessment panel sees the projects without the names of the students who wrote them.",
    ],
  },

  aggiornamenti: {
    h: "10. Updates to This Policy",
    testo:
      "We may update this Privacy Policy from time to time. The date at the top of this page indicates when it was last revised. We will notify registered members of any significant changes by email.",
  },

  autorita: {
    h: "11. Supervisory Authority",
    intro: "You have the right to lodge a complaint with the Italian Data Protection Authority:",
  },

  cookie: "View our Cookie Policy",
};

/* ── Italiano ─────────────────────────────────────────────────────────── */

const IT: Informativa = {
  titoloPagina: "Informativa sulla privacy",
  descrizionePagina: "Informativa sul trattamento dei dati personali del sito della Fondazione bioERGOtech.",
  titolo: "Informativa sulla privacy",
  aggiornamento: "Ultimo aggiornamento: settembre 2026",
  altraLingua: { etichetta: "Read this policy in English", href: "/legal/privacy" },

  titolare: {
    h: "1. Titolare del trattamento",
    intro: "Il titolare del trattamento dei suoi dati personali è:",
  },

  raccolta: {
    h: "2. Quali dati raccogliamo",
    intro:
      "Raccogliamo le seguenti categorie di dati personali, a seconda di come lei interagisce con il nostro sito:",
    gruppi: [
      {
        titolo: "Domande di adesione alla Fondazione",
        voci: [
          "Nome, cognome e ruolo",
          "Indirizzo email",
          "Nome, tipo e sito dell'organizzazione",
          "Paese e città",
          "Aree scientifiche di interesse",
          "Descrizione di ciò che si porta e si cerca nell'ecosistema",
        ],
      },
      {
        titolo: "Account dell'area riservata",
        voci: [
          "Indirizzo email e password cifrata",
          "Nome, cognome e dati dell'organizzazione",
          "Livello di partnership e permessi di accesso",
          "Data e ora degli accessi e dati di sessione",
        ],
      },
      {
        titolo: "Istituti che aderiscono a un percorso formativo",
        voci: [
          "Denominazione dell'istituto, codice meccanografico, comune e provincia",
          "Email e sito dell'istituto, e nome del dirigente scolastico",
          "Docente referente: nome, cognome, email, telefono e materia insegnata",
          "Numero di studenti che l'istituto prevede di coinvolgere, per anno di corso, e classi interessate",
          "Presenze previste all'evento finale, ed eventuali note dell'istituto",
          "Gli impegni e le dichiarazioni spuntati al momento dell'adesione, registrati con il loro testo e la data",
        ],
      },
      {
        titolo: "Studenti iscritti a un percorso formativo",
        voci: [
          "Nome, cognome ed email di contatto",
          "Classe e anno di corso",
          "L'istituto di appartenenza e la squadra di cui entra a far parte",
          "Le riflessioni consegnate al termine di ogni lezione e il progetto consegnato dalla squadra",
          "Il consenso e la dichiarazione sull'autorizzazione dei genitori, registrati con il loro testo e la data",
        ],
      },
      {
        titolo: "Candidature ai nostri bandi",
        voci: [
          "Referente: nome, cognome, ruolo, email e telefono",
          "Il progetto o l'organizzazione descritti nella candidatura, e gli eventuali link ai materiali che il candidato sceglie di condividere",
          "Per il bando universitario: università, corso di studi, livello e aree di interesse",
          "Per il bando startup: forma giuridica, partita IVA, data di costituzione, paese e città, e i dati su raccolte e ricavi dichiarati dal candidato",
          "Le dichiarazioni e i consensi prestati, registrati con il loro testo e la data",
        ],
      },
      {
        titolo: "Navigazione del sito",
        voci: [
          "Indirizzo IP e tipo di browser (anonimizzati dove possibile)",
          "Pagine visitate e tempo di permanenza",
          "Sito di provenienza o query di ricerca",
          "Preferenze sui cookie",
        ],
      },
    ],
  },

  finalita: {
    h: "3. Come usiamo i suoi dati",
    colFinalita: "Finalità",
    colBase: "Base giuridica",
    righe: [
      { finalita: "Gestire le domande di adesione alla Fondazione", base: "Legittimo interesse e misure precontrattuali" },
      { finalita: "Dare accesso all'area riservata", base: "Esecuzione di un contratto" },
      { finalita: "Comunicare lo stato di una domanda", base: "Legittimo interesse" },
      { finalita: "Verificare e confermare l'adesione di un istituto", base: "Legittimo interesse e misure precontrattuali" },
      { finalita: "Iscrivere gli studenti e dare loro accesso al corso", base: "Consenso, ed esecuzione del percorso a cui la scuola ha aderito" },
      { finalita: "Registrare e valutare lavori, squadre e progetti consegnati", base: "Legittimo interesse a gestire e giudicare il percorso" },
      { finalita: "Iscrivere i finalisti all'evento conclusivo", base: "Legittimo interesse" },
      { finalita: "Gestire le candidature ai nostri bandi", base: "Consenso e misure precontrattuali" },
      { finalita: "Inviare comunicazioni di servizio", base: "Consenso e legittimo interesse" },
      { finalita: "Migliorare le prestazioni del sito", base: "Consenso (cookie analitici)" },
      { finalita: "Adempiere a obblighi di legge", base: "Obbligo legale" },
    ],
    nota:
      "Dove il trattamento si fonda sul consenso, lei può revocarlo in qualsiasi momento, e la revoca non pregiudica la liceità del trattamento svolto prima di essa.",
  },

  conservazione: {
    h: "4. Per quanto tempo conserviamo i dati",
    intro:
      "Conserviamo i suoi dati personali solo per il tempo necessario alle finalità descritte in questa informativa:",
    righe: [
      { categoria: "Domande di adesione alla Fondazione", periodo: "Conservate per 2 anni dalla data di invio, o fino a richiesta di cancellazione." },
      { categoria: "Account dell'area riservata", periodo: "Conservati per la durata dell'adesione più 1 anno dalla chiusura dell'account." },
      { categoria: "Analytics del sito", periodo: "Dati aggregati conservati fino a 26 mesi." },
      { categoria: "Comunicazioni email", periodo: "Conservate fino a 3 anni per finalità di archivio." },
      { categoria: "Adesioni degli istituti a un percorso", periodo: null },
      { categoria: "Iscrizioni degli studenti", periodo: null },
      { categoria: "Lavori del corso, squadre e progetti consegnati", periodo: null },
      { categoria: "Candidature ai nostri bandi", periodo: null },
    ],
    senzaTermine:
      "Il termine è in corso di definizione. Fino ad allora i dati sono conservati per il solo tempo richiesto dalle finalità sopra descritte, e cancellati su richiesta.",
  },

  condivisione: {
    h: "5. Con chi condividiamo i dati",
    intro:
      "Non vendiamo i suoi dati personali. Li condividiamo solo con fornitori di fiducia che li trattano per nostro conto:",
    voci: [
      "Supabase Inc. Database e autenticazione (con possibilità di residenza dei dati nell'Unione Europea)",
      "Vercel Inc. Hosting e pubblicazione del sito",
      "Resend. Invio delle email di servizio descritte in questa informativa",
      "Google LLC. Mappe e strumenti di produttività (Google for Nonprofits)",
    ],
    nota:
      "Tutti i responsabili esterni sono vincolati da accordi sul trattamento dei dati e possono trattarli solo secondo le nostre istruzioni. I membri delle commissioni di valutazione dei nostri bandi e percorsi vedono i progetti consegnati per poterli valutare, e sono tenuti alla riservatezza. I nomi degli studenti non vengono loro comunicati.",
  },

  trasferimenti: {
    h: "6. Trasferimenti fuori dall'Unione Europea",
    testo:
      "Alcuni dei nostri fornitori hanno sede fuori dallo Spazio Economico Europeo. Quando i dati vengono trasferiti fuori dallo Spazio Economico Europeo, adottiamo garanzie adeguate, fra cui le Clausole Contrattuali Standard approvate dalla Commissione Europea.",
  },

  diritti: {
    h: "7. I suoi diritti",
    intro: "Ai sensi del GDPR e della normativa italiana sulla protezione dei dati, lei ha i seguenti diritti:",
    voci: [
      { diritto: "Accesso", desc: "Chiedere una copia dei dati personali che la riguardano." },
      { diritto: "Rettifica", desc: "Chiedere la correzione di dati inesatti o incompleti." },
      { diritto: "Cancellazione", desc: "Chiedere la cancellazione dei suoi dati personali (diritto all'oblio)." },
      { diritto: "Limitazione", desc: "Chiedere che limitiamo l'uso dei suoi dati." },
      { diritto: "Portabilità", desc: "Ricevere i suoi dati in un formato strutturato e leggibile da un dispositivo automatico." },
      { diritto: "Opposizione", desc: "Opporsi ai trattamenti fondati sul legittimo interesse." },
      { diritto: "Revoca del consenso", desc: "Revocare il consenso in qualsiasi momento, dove il trattamento si fonda su di esso." },
      { diritto: "Reclamo", desc: "Presentare un reclamo al Garante per la protezione dei dati personali." },
    ],
    nota:
      "Per esercitare uno di questi diritti ci scriva a info@bioergotech.org. Le risponderemo entro 30 giorni.",
  },

  sicurezza: {
    h: "8. Sicurezza",
    testo:
      "Adottiamo misure tecniche e organizzative adeguate a proteggere i suoi dati personali da accessi non autorizzati, alterazioni, divulgazioni o distruzione. Fra queste: trasmissione cifrata dei dati (HTTPS), hashing delle password e controlli di accesso basati sul ruolo nell'area riservata e nelle console dei percorsi.",
  },

  minori: {
    h: "9. Minori",
    paragrafi: [
      "Il nostro sito e i nostri servizi non si rivolgono a bambini di età inferiore ai 14 anni, e non raccogliamo consapevolmente i loro dati personali. Se ritiene che un minore di 14 anni ci abbia fornito dati personali, ci contatti e li cancelleremo tempestivamente.",
      "Alcuni dei nostri percorsi formativi si rivolgono a studenti delle scuole secondarie di secondo grado, che possono essere minorenni di almeno 14 anni. La partecipazione a quei percorsi passa sempre dalla scuola dello studente, che nomina un docente referente, raccoglie per nostro conto le autorizzazioni dei genitori e conserva agli atti i moduli firmati. In quei casi trattiamo solo ciò che serve al percorso: nome, cognome, classe, anno di corso ed email di contatto. Non raccogliamo date di nascita, codici fiscali, documenti di identità né contatti dei genitori. Prima che uno studente compaia in fotografie o riprese dei nostri eventi viene sempre richiesta un'autorizzazione a parte. I genitori e chi esercita la responsabilità genitoriale possono esercitare i diritti sopra descritti per conto del minore scrivendo all'indirizzo indicato in fondo a questa informativa.",
      "Partecipare al percorso significa anche seguire un corso online, che richiede un account. Accanto ai dati sopra elencati conserviamo quindi il lavoro che lo studente consegna durante il corso: la riflessione che chiude ogni lezione, la squadra di cui fa parte e il progetto consegnato dalla squadra. Il docente referente vede a che punto sono arrivati i propri studenti, così che la scuola possa seguirli. La commissione di valutazione vede i progetti senza i nomi di chi li ha scritti.",
    ],
  },

  aggiornamenti: {
    h: "10. Modifiche a questa informativa",
    testo:
      "Possiamo aggiornare questa informativa di tanto in tanto. La data in cima alla pagina indica l'ultima revisione. Comunicheremo via email agli iscritti ogni modifica significativa.",
  },

  autorita: {
    h: "11. Autorità di controllo",
    intro: "Lei ha il diritto di presentare un reclamo al Garante per la protezione dei dati personali:",
  },

  cookie: "Leggi la nostra Cookie Policy",
};

export const INFORMATIVA: Record<Lingua, Informativa> = { en: EN, it: IT };
