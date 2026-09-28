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

/**
 * Chi tratta i dati, scritto una volta sola.
 *
 * Lo usano la pagina dell'informativa e il modulo di autorizzazione dei licei
 * (`licei/referente/generaAutorizzazione.ts`), che lo stampa per le famiglie.
 * Prima il titolare era scritto a mano nel componente della pagina e il
 * modulo non lo nominava affatto: un genitore che firmava non sapeva a chi
 * rivolgersi.
 */
export const TITOLARE = {
  denominazione: "Fondazione bioERGOtech ETS",
  sede: "Via Ciro Giovinazzi 70, 74123 Taranto",
  cf: "90287640735",
  email: "info@bioergotech.org",
} as const;

/**
 * Contitolare con la Fondazione per le sole foto e riprese dell'evento Vivere
 * piu a lungo (art. 26 GDPR). Per tutti gli altri dati il titolare resta la
 * sola Fondazione.
 *
 * TODO: mancano denominazione legale, forma giuridica, sede e codice fiscale
 * o partita IVA di SafesPro. L'art. 13 li chiede per ciascun contitolare, e
 * non vanno inventati: appena arrivano si aggiungono qui.
 */
export const CONTITOLARE_IMMAGINI = {
  denominazione: "SafesPro, Scuola di Alta Formazione e Studi Specializzati per Professionisti",
  email: "info@altaformazioneprofessionisti.it",
} as const;

/**
 * Il responsabile della protezione dei dati per foto e riprese.
 *
 * TODO: il recapito e provvisorio. Passare dalla casella generica della
 * Fondazione si concilia male con la riservatezza che l'art. 38 GDPR chiede
 * al DPO: appena c'e il suo indirizzo diretto va scritto qui, nelle due
 * lingue insieme. Va anche chiarito quale ente lo ha designato.
 */
export const DPO = {
  nome: "Francesco Ruggieri",
  contatto: "contattabile scrivendo a info@bioergotech.org, all'attenzione del DPO",
  contattoEn: "who can be reached by writing to info@bioergotech.org, for the attention of the DPO",
} as const;

export type Informativa = {
  titoloPagina: string;
  descrizionePagina: string;
  titolo: string;
  aggiornamento: string;
  /** Rimando all'altra lingua, in cima alla pagina. */
  altraLingua: { etichetta: string; href: string };

  titolare: { h: string; intro: string; contitolare: string; dpo: string };
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
    contitolare:
      "For the photos and recordings of the Vivere più a lungo event the Foundation is joint controller with SafesPro: details are in section 5.",
    dpo: `For the photos and recordings of the Vivere più a lungo event, the Data Protection Officer (DPO) is ${DPO.nome}, ${DPO.contattoEn}.`,
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
          "The consent and the declaration about the authorisation form, recorded with their wording and timestamp",
        ],
      },
      {
        titolo: "Photos and Recordings at the Vivere più a lungo Event",
        voci: [
          "Photographs and videos, with sound and therefore voice, taken on 10 December 2026 at the PalaMazzola and on 11 December 2026 at the Teatro Fusco in Taranto during the presentations, the award ceremony and the other moments of the event, including group photos, showing the finalist students",
          "The team name, the project title and the institute, when they accompany the images. The student's name and surname are not published in the captions of the images",
          "The outcome of the image choices (consent A and consent B) of the finalist students, which the school sends us before the event, and any withdrawals. The signed form stays with the school",
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
        titolo: "Participants in the University Programme",
        voci: [
          "The account created when the application is submitted, which gives access to the course and to the programme area",
          "Reflections submitted at the end of each lesson, and therefore how far through the course the participant has got",
          "The team they join, the role they hold in it, and the join requests they send or receive",
          "The project the team submits, and the links to material they choose to share",
          "If they choose to appear on the board of participants looking for a team: name, surname, university, degree course, discipline and the note they write. The board is visible only to confirmed participants of the programme, it is not public and it is not indexed. This consent is optional and can be withdrawn at any time, and the email address never appears there",
          "The scores and notes the evaluation committee records on the submitted project",
        ],
      },
      {
        titolo: "Mentor Applications",
        voci: [
          "Name, surname, email and optional telephone number, which stays internal and is never published",
          "Role, university, institution or company, disciplines, profile, expertise and declared availability",
          "Any links to a personal website or a professional profile",
          "The outcome of the application and the teams the mentor is paired with, if any",
          "Consent to publish the profile on the public mentors page, which is optional and separate: one can be a mentor without appearing on the page, and the consent can be withdrawn at any time",
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
      { finalita: "Recording students at the event and publishing the images to document and communicate this edition of the initiative, on the websites and on the LinkedIn and Instagram profiles of the Foundation and SafesPro, and in press materials", base: "Consent A, optional and withdrawable, which also serves as authorisation to use the person's image (art. 96 of Italian Law 633/1941)" },
      { finalita: "Using the same images in promotional and commercial materials of the Foundation and SafesPro, including those promoting later editions of the programme", base: "Consent B, optional, separate and withdrawable, valid only together with consent A" },
      { finalita: "Receiving from schools the outcome of the finalists' image choices, applying it and, where needed, checking it against the form", base: "Obligation to be able to demonstrate consent (art. 7(1) GDPR) and, for those who did not authorise, legitimate interest in ensuring that their images are not published" },
      { finalita: "Recording the event as a whole, including the audience, and selecting the images: those in which a finalist who did not authorise can be recognised are deleted, and those in which a minor in the audience can be recognised are not published", base: "Legitimate interest in documenting a public event, respecting the students' choices and protecting minors" },
      { finalita: "Processing applications to our calls", base: "Consent / Pre-contractual steps" },
      { finalita: "Creating the account that gives access to the course and the programme area", base: "Performance of the programme the applicant asked to join" },
      { finalita: "Showing who is looking for a team on the board, to other participants only", base: "Consent, optional and withdrawable" },
      { finalita: "Running teams, join requests and mentor pairing", base: "Legitimate interest in running the programme" },
      { finalita: "Collecting and assessing mentor applications", base: "Consent / Pre-contractual steps" },
      { finalita: "Publishing a mentor profile on the public page", base: "Consent, optional and withdrawable" },
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
      { categoria: "Photos and recordings of the Vivere più a lungo event", periodo: "Retained for 5 years from the event, that is until December 2031, then deleted from the archives and removed from the websites and the LinkedIn and Instagram profiles of the Foundation and SafesPro. If consent A is withdrawn, without undue delay and in any case within one month of the withdrawal; if only consent B is withdrawn, within the same time limit they are removed from promotional materials still in use." },
      { categoria: "Outcome of the image choices sent by schools, and any withdrawals", periodo: "Retained for 5 years from the event, including after a withdrawal, so that the choices made can be demonstrated." },
      { categoria: "Images discarded during selection", periodo: "Deleted when selection ends, before any publication." },
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
      "Appointed photographers and videographers. Taking and selecting images at our events, on behalf of the Foundation and SafesPro",
      "Suppliers producing promotional materials. Design, printing and publication of materials using images authorised under consent B, on behalf of the Foundation and SafesPro",
    ],
    nota:
      "All third-party processors are bound by Data Processing Agreements and are required to process data only as instructed by us. The members of the assessment panel for our calls and programmes see the submitted projects in order to score them, and are bound to confidentiality. Students' names are not disclosed to them. For the photos and recordings of the Vivere più a lungo event, the Foundation is joint controller with SafesPro, Scuola di Alta Formazione e Studi Specializzati per Professionisti (info@altaformazioneprofessionisti.it), under art. 26 GDPR. The two organisations use the images together and only on the terms of the authorisation form. Each organisation manages what it publishes on its own channels, but both remain responsible towards data subjects, and rights can be exercised with either of them. The essence of the arrangement can be requested at info@bioergotech.org or info@altaformazioneprofessionisti.it. Authorised images are published on the websites and on the LinkedIn and Instagram profiles of the two organisations, and the platforms also process them under their own terms. With consent, they may be given to the press to report on the initiative. They are not passed to any other third party, including sponsors and partners. For all other data in this policy the Foundation remains the sole controller.",
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
      "Some of our educational programmes are addressed to students in the last three years of upper secondary school, most of them minors aged 14 or over and some already adults. Participation always runs through the student's school, which appoints a referring teacher, hands out the authorisation form and keeps the signed page on file: the form is not sent to us. For a student who is a minor, the parents sign, or one parent alone who declares that they act in agreement with the other or that they exercise parental responsibility alone, and the student signs to confirm they have read the information notice; a student who is an adult signs for themselves. For the programme we process only what it needs: name, surname, class, year of study and contact email. We do not collect dates of birth, tax codes, identity documents or parents' contact details. Images in which a finalist student can be recognised are published only with the consent given in the form, which is optional and does not affect participation; before the event the school tells us the outcome of the finalists' choices. In the images published by the Foundation and SafesPro, no minor in the audience is made recognisable. Parents and guardians may exercise the rights described in section 7 on behalf of their child by writing to info@bioergotech.org.",
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
    contitolare:
      "Per le foto e le riprese dell'evento Vivere più a lungo la Fondazione è contitolare del trattamento con SafesPro: i dettagli sono nella sezione 5.",
    dpo: `Per le foto e le riprese dell'evento Vivere più a lungo il responsabile della protezione dei dati (DPO) è ${DPO.nome}, ${DPO.contatto}.`,
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
          "Il consenso e la dichiarazione sul modulo di autorizzazione, registrati con il loro testo e la data",
        ],
      },
      {
        titolo: "Foto e riprese all'evento Vivere più a lungo",
        voci: [
          "Fotografie e video, con l'audio e quindi la voce, ripresi il 10 dicembre 2026 al PalaMazzola e l'11 dicembre 2026 al Teatro Fusco di Taranto durante le presentazioni, la premiazione e gli altri momenti dell'evento, comprese le foto di gruppo, in cui compaiono gli studenti finalisti",
          "Il nome della squadra, il titolo del progetto e l'istituto, quando accompagnano le immagini. Nome e cognome dello studente non compaiono nelle didascalie delle immagini",
          "L'esito delle scelte sulle immagini (consenso A e consenso B) degli studenti finalisti, che la scuola ci comunica prima dell'evento, ed eventuali revoche. Il modulo firmato resta alla scuola",
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
        titolo: "Partecipanti al percorso universitario",
        voci: [
          "L'account creato al momento della candidatura, che dà accesso al corso e all'area del percorso",
          "Le riflessioni consegnate al termine di ogni lezione, e quindi il punto del corso a cui il partecipante è arrivato",
          "La squadra di cui entra a far parte, il ruolo che vi ricopre e le richieste di ingresso inviate o ricevute",
          "Il progetto consegnato dalla squadra e i link ai materiali che sceglie di condividere",
          "Se sceglie di comparire nella bacheca dei partecipanti che cercano una squadra: nome, cognome, università, corso di studi, area disciplinare e la nota che scrive. La bacheca è visibile ai soli partecipanti confermati del percorso, non è pubblica e non è indicizzata. Il consenso è facoltativo e revocabile in qualsiasi momento, e l'indirizzo email non vi compare mai",
          "I punteggi e le note della Commissione di valutazione sul progetto consegnato",
        ],
      },
      {
        titolo: "Candidature a mentor",
        voci: [
          "Nome, cognome, email ed eventuale telefono, che resta a uso interno e non viene pubblicato",
          "Ruolo, università, ente o azienda di appartenenza, aree disciplinari, profilo, competenze e disponibilità dichiarata",
          "Gli eventuali link a un sito personale o a un profilo professionale",
          "L'esito della candidatura e le squadre a cui il mentor viene eventualmente abbinato",
          "Il consenso alla pubblicazione del profilo nella pagina pubblica dei mentor, che è facoltativo e separato: si può essere mentor senza comparire in pagina, e il consenso è revocabile in qualsiasi momento",
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
      { finalita: "Riprendere gli studenti all'evento e pubblicare le immagini per documentare e comunicare questa edizione dell'iniziativa, sui siti e sui profili LinkedIn e Instagram della Fondazione e di SafesPro e nei materiali per la stampa", base: "Consenso A, facoltativo e revocabile, che vale anche come autorizzazione all'uso del ritratto (art. 96 L. 633/1941)" },
      { finalita: "Usare le stesse immagini in materiali promozionali e commerciali della Fondazione e di SafesPro, compresi quelli che promuovono le edizioni successive del percorso", base: "Consenso B, facoltativo, separato e revocabile, valido solo insieme al consenso A" },
      { finalita: "Ricevere dalle scuole l'esito delle scelte sulle immagini dei finalisti, applicarlo e, se serve, verificarlo sul modulo", base: "Obbligo di poter dimostrare il consenso (art. 7, par. 1, GDPR) e, per chi non ha autorizzato, legittimo interesse a garantire che le sue immagini non siano pubblicate" },
      { finalita: "Riprendere l'evento nel suo insieme, compreso il pubblico, e selezionare le immagini: si cancellano quelle in cui è riconoscibile un finalista che non ha autorizzato e non si pubblicano quelle in cui è riconoscibile un minore del pubblico", base: "Legittimo interesse a documentare un evento pubblico, nel rispetto delle scelte degli studenti e della tutela dei minori" },
      { finalita: "Gestire le candidature ai nostri bandi", base: "Consenso e misure precontrattuali" },
      { finalita: "Creare l'account che dà accesso al corso e all'area del percorso", base: "Esecuzione del percorso a cui il candidato ha chiesto di partecipare" },
      { finalita: "Mostrare in bacheca chi cerca una squadra, ai soli altri partecipanti", base: "Consenso, facoltativo e revocabile" },
      { finalita: "Gestire squadre, richieste di ingresso e abbinamento con i mentor", base: "Legittimo interesse a gestire il percorso" },
      { finalita: "Raccogliere e valutare le candidature a mentor", base: "Consenso e misure precontrattuali" },
      { finalita: "Pubblicare il profilo di un mentor nella pagina pubblica", base: "Consenso, facoltativo e revocabile" },
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
      { categoria: "Foto e riprese dell'evento Vivere più a lungo", periodo: "Conservate per 5 anni dall'evento, quindi fino a dicembre 2031, poi cancellate dagli archivi e rimosse dai siti e dai profili LinkedIn e Instagram della Fondazione e di SafesPro. Se il consenso A è revocato, senza ingiustificato ritardo e comunque entro un mese dalla revoca; se è revocato solo il consenso B, entro lo stesso termine sono tolte dai materiali promozionali ancora in uso." },
      { categoria: "Esito delle scelte sulle immagini comunicato dalle scuole, ed eventuali revoche", periodo: "Conservati per 5 anni dall'evento, anche dopo una revoca, per poter dimostrare le scelte espresse." },
      { categoria: "Immagini scartate nella selezione", periodo: "Cancellate al termine della selezione, prima di ogni pubblicazione." },
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
      "Fotografi e videomaker incaricati. Riprese e selezione delle immagini degli eventi, per conto della Fondazione e di SafesPro",
      "Fornitori che realizzano i materiali promozionali. Grafica, stampa e pubblicazione dei materiali che usano le immagini autorizzate con il consenso B, per conto della Fondazione e di SafesPro",
    ],
    nota:
      "Tutti i responsabili esterni sono vincolati da accordi sul trattamento dei dati e possono trattarli solo secondo le nostre istruzioni. I membri delle commissioni di valutazione dei nostri bandi e percorsi vedono i progetti consegnati per poterli valutare, e sono tenuti alla riservatezza. I nomi degli studenti non vengono loro comunicati. Per le foto e le riprese dell'evento Vivere più a lungo la Fondazione è contitolare del trattamento con SafesPro, Scuola di Alta Formazione e Studi Specializzati per Professionisti (info@altaformazioneprofessionisti.it), ai sensi dell'art. 26 GDPR. I due enti usano le immagini insieme e solo alle condizioni del modulo di autorizzazione. Ciascun ente cura ciò che pubblica sui propri canali, ma verso gli interessati ne rispondono entrambi, e i diritti si possono esercitare presso l'uno o l'altro. Il contenuto essenziale dell'accordo si può chiedere a info@bioergotech.org o a info@altaformazioneprofessionisti.it. Le immagini autorizzate sono pubblicate sui siti e sui profili LinkedIn e Instagram dei due enti, e le piattaforme le trattano anche secondo le proprie condizioni. Con il consenso, possono essere consegnate alla stampa per dare notizia dell'iniziativa. Non sono cedute ad altri terzi, compresi sponsor e partner. Per tutti gli altri dati di questa informativa il titolare resta la sola Fondazione.",
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
      "Alcuni dei nostri percorsi formativi si rivolgono agli studenti del triennio delle scuole secondarie di secondo grado, in gran parte minorenni di almeno 14 anni e in parte già maggiorenni. La partecipazione passa sempre dalla scuola dello studente, che nomina un docente referente, distribuisce il modulo di autorizzazione e ne conserva agli atti la pagina firmata: il modulo non viene inviato a noi. Per lo studente minorenne firmano i genitori, oppure uno solo che dichiara di agire d'accordo con l'altro o di esercitare da solo la responsabilità genitoriale, e lo studente firma per presa visione; lo studente maggiorenne firma per sé. Per il percorso trattiamo solo ciò che serve: nome, cognome, classe, anno di corso ed email di contatto. Non raccogliamo date di nascita, codici fiscali, documenti di identità né contatti dei genitori. Le immagini in cui uno studente finalista è riconoscibile si pubblicano solo con il consenso espresso nel modulo, che è facoltativo e non condiziona la partecipazione; prima dell'evento la scuola ci comunica l'esito delle scelte degli studenti finalisti. Nelle immagini pubblicate dalla Fondazione e da SafesPro nessun minore presente fra il pubblico è reso riconoscibile. I genitori e chi esercita la responsabilità genitoriale possono esercitare i diritti descritti nella sezione 7 per conto del minore, scrivendo a info@bioergotech.org.",
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
