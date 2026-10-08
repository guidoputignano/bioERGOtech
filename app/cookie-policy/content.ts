/**
 * Cookie Policy, in English (/cookie-policy, already indexed) and Italian
 * (/cookie-policy/it). Both pages render the same structure from here, so a
 * cookie added to one list cannot be forgotten in the other language.
 *
 * Keep this file in step with what the site actually sets: the consent
 * banner (components/cookie-banner.tsx) decides when Google Analytics and
 * Google Ads load, Supabase sets the login cookies, and a few preferences
 * live in the browser's local storage. A policy that lists cookies the site
 * does not use, or misses ones it does, informs nobody.
 */

export type VoceCookie = { nome: string; fornitore: string; scopo: string; durata: string };

export type CategoriaCookie = {
  titolo: string;
  stato: string;
  descrizione: string;
  voci: VoceCookie[];
  nota?: string;
};

export type CookiePolicy = {
  titoloPagina: string;
  descrizionePagina: string;
  titolo: string;
  aggiornamento: string;
  altraLingua: { href: string; etichetta: string };
  intro: string[];
  chiSiamo: { h: string; testo: string };
  categorie: { h: string; intro: string; elenco: CategoriaCookie[] };
  terzeParti: { h: string; voci: string[] };
  gestione: { h: string; paragrafi: string[]; pulsante: string; browser: string };
  base: { h: string; testo: string };
  aggiornamenti: { h: string; testo: string };
  contatti: { h: string; testo: string };
  privacy: { href: string; etichetta: string };
  colonne: { nome: string; fornitore: string; scopo: string; durata: string };
};

const GA_ID = "G-GWKKXQ2S7M";

export const COOKIE_POLICY: { en: CookiePolicy; it: CookiePolicy } = {
  en: {
    titoloPagina: "Cookie Policy",
    descrizionePagina: "Which cookies and similar technologies the bioERGOtech Foundation website uses, and how to manage your choices.",
    titolo: "Cookie Policy",
    aggiornamento: "Last updated: October 2026",
    altraLingua: { href: "/cookie-policy/it", etichetta: "Leggi in italiano" },
    intro: [
      "Cookies are small text files that a website stores on your device. Similar technologies, such as the browser's local storage, work in a comparable way. This policy lists those used on bioergotech.org, why, and for how long.",
      "Technical cookies and storage needed for the site to work are always active. Analytics and marketing cookies are set only after you consent in the banner, and you can change your choice at any time.",
    ],
    chiSiamo: {
      h: "1. Who we are",
      testo: "The data controller is Fondazione bioERGOtech ETS, Via Ciro Giovinazzi 70, 74123 Taranto, Italy, C.F. 90287640735, info@bioergotech.org.",
    },
    categorie: {
      h: "2. Cookies and similar technologies we use",
      intro: "They fall into four groups.",
      elenco: [
        {
          titolo: "2.1 Strictly necessary",
          stato: "Always active",
          descrizione: "Needed for the site to work: signing in to the reserved areas (Member Portal, courses, programme areas) and remembering your cookie choice. They do not require consent.",
          voci: [
            { nome: "sb-<project>-auth-token (and .0, .1 chunks)", fornitore: "bioERGOtech (Supabase)", scopo: "Keeps you signed in to the reserved areas", durata: "Until you sign out, at most 400 days" },
            { nome: "bioergotech_cookie_consent (local storage)", fornitore: "bioERGOtech", scopo: "Remembers your cookie choice", durata: "Until you change it or clear the browser data" },
          ],
        },
        {
          titolo: "2.2 Functional local storage",
          stato: "Always active",
          descrizione: "Small preferences saved in your browser, not sent to us, that avoid showing you the same message twice.",
          voci: [
            { nome: "newsletter_popup_shown", fornitore: "bioERGOtech", scopo: "Avoids showing the newsletter pop-up again", durata: "Until you clear the browser data" },
            { nome: "onboarding_dismissed_*, be_outreach_sheetUrl", fornitore: "bioERGOtech", scopo: "Member Portal preferences, for signed-in members only", durata: "Until you clear the browser data" },
          ],
        },
        {
          titolo: "2.3 Analytics",
          stato: "Only with consent",
          descrizione: `We use Google Analytics 4 (property ${GA_ID}) to count visits and understand how the site is used. Data are processed by Google Ireland Ltd and Google LLC and may be transferred to the United States under the EU-US Data Privacy Framework. Google Analytics 4 does not store full IP addresses, but the data are not anonymous: they are linked to a pseudonymous identifier on your device.`,
          voci: [
            { nome: "_ga", fornitore: "Google", scopo: "Distinguishes visitors", durata: "2 years" },
            { nome: `_ga_${GA_ID.replace("G-", "")}`, fornitore: "Google", scopo: "Keeps the session state", durata: "2 years" },
          ],
        },
        {
          titolo: "2.4 Marketing",
          stato: "Only with consent",
          descrizione: "We use the Google Ads tag to measure the results of our campaigns, for example when someone who reached the site from an ad completes a form. It is never loaded on the course pages and the reserved areas, which are also used by students under 18.",
          voci: [
            { nome: "_gcl_au", fornitore: "Google", scopo: "Measures conversions from Google Ads campaigns", durata: "90 days" },
          ],
          nota: "Google may also use its own cookies on its domains, under its own policy: policies.google.com/technologies/cookies.",
        },
      ],
    },
    terzeParti: {
      h: "3. Third-party content",
      voci: [
        "Course videos are embedded from YouTube in privacy-enhanced mode (youtube-nocookie.com): YouTube does not set cookies until you play a video. When you play it, Google may store data on your device under its own policy.",
        "Icons are loaded from the jsDelivr network and the Member Portal map uses OpenStreetMap tiles. They set no cookies, but like any web request they receive your IP address.",
      ],
    },
    gestione: {
      h: "4. Managing your choices",
      paragrafi: [
        "You can change or withdraw your consent at any time with the button below, which reopens the cookie banner. Withdrawing consent does not affect the lawfulness of processing carried out before.",
        "You can also block or delete cookies in your browser settings. Blocking strictly necessary cookies will prevent you from signing in to the reserved areas.",
      ],
      pulsante: "Cookie settings",
      browser: "Browser guides:",
    },
    base: {
      h: "5. Legal basis",
      testo: "Strictly necessary cookies and functional storage are used under Art. 122 of the Italian Data Protection Code (D.Lgs. 196/2003) and our legitimate interest in providing the site. Analytics and marketing cookies are used only with your consent (Art. 6(1)(a) GDPR), as required by the ePrivacy rules and the guidelines of the Italian Data Protection Authority of 10 June 2021.",
    },
    aggiornamenti: {
      h: "6. Updates",
      testo: "We update this policy when the cookies used by the site change. The date at the top shows the latest version.",
    },
    contatti: {
      h: "7. Contact",
      testo: "For any question about this policy, write to info@bioergotech.org. You can also lodge a complaint with the Italian Data Protection Authority (www.garanteprivacy.it).",
    },
    privacy: { href: "/legal/privacy", etichetta: "View our Privacy Policy" },
    colonne: { nome: "Name", fornitore: "Provider", scopo: "Purpose", durata: "Duration" },
  },
  it: {
    titoloPagina: "Cookie policy",
    descrizionePagina: "Quali cookie e tecnologie simili usa il sito della Fondazione bioERGOtech, e come gestire le proprie scelte.",
    titolo: "Cookie policy",
    aggiornamento: "Ultimo aggiornamento: ottobre 2026",
    altraLingua: { href: "/cookie-policy", etichetta: "Read in English" },
    intro: [
      "I cookie sono piccoli file di testo che un sito salva sul tuo dispositivo. Tecnologie simili, come la memoria locale del browser, funzionano in modo analogo. Questa pagina elenca quelli usati su bioergotech.org, a che cosa servono e per quanto tempo restano.",
      "I cookie e la memoria tecnici, necessari al funzionamento del sito, sono sempre attivi. I cookie di analisi e di marketing vengono impostati solo dopo il tuo consenso nel banner, e puoi cambiare la tua scelta in qualsiasi momento.",
    ],
    chiSiamo: {
      h: "1. Chi siamo",
      testo: "Il titolare del trattamento è Fondazione bioERGOtech ETS, Via Ciro Giovinazzi 70, 74123 Taranto, C.F. 90287640735, info@bioergotech.org.",
    },
    categorie: {
      h: "2. Cookie e tecnologie simili che usiamo",
      intro: "Si dividono in quattro gruppi.",
      elenco: [
        {
          titolo: "2.1 Tecnici necessari",
          stato: "Sempre attivi",
          descrizione: "Servono al funzionamento del sito: l'accesso alle aree riservate (Member Portal, corsi, aree dei percorsi) e il ricordo della tua scelta sui cookie. Non richiedono consenso.",
          voci: [
            { nome: "sb-<progetto>-auth-token (e le parti .0, .1)", fornitore: "bioERGOtech (Supabase)", scopo: "Mantiene l'accesso alle aree riservate", durata: "Fino all'uscita, al massimo 400 giorni" },
            { nome: "bioergotech_cookie_consent (memoria locale)", fornitore: "bioERGOtech", scopo: "Ricorda la tua scelta sui cookie", durata: "Finché non la cambi o cancelli i dati del browser" },
          ],
        },
        {
          titolo: "2.2 Memoria locale funzionale",
          stato: "Sempre attiva",
          descrizione: "Piccole preferenze salvate nel tuo browser, che non ci vengono inviate, per non mostrarti due volte lo stesso messaggio.",
          voci: [
            { nome: "newsletter_popup_shown", fornitore: "bioERGOtech", scopo: "Evita di mostrare di nuovo la finestra della newsletter", durata: "Finché non cancelli i dati del browser" },
            { nome: "onboarding_dismissed_*, be_outreach_sheetUrl", fornitore: "bioERGOtech", scopo: "Preferenze del Member Portal, solo per i membri che hanno fatto l'accesso", durata: "Finché non cancelli i dati del browser" },
          ],
        },
        {
          titolo: "2.3 Analisi",
          stato: "Solo con consenso",
          descrizione: `Usiamo Google Analytics 4 (proprietà ${GA_ID}) per contare le visite e capire come viene usato il sito. I dati sono trattati da Google Ireland Ltd e Google LLC e possono essere trasferiti negli Stati Uniti nell'ambito del Data Privacy Framework UE-USA. Google Analytics 4 non conserva l'indirizzo IP completo, ma i dati non sono anonimi: sono collegati a un identificativo pseudonimo sul tuo dispositivo.`,
          voci: [
            { nome: "_ga", fornitore: "Google", scopo: "Distingue i visitatori", durata: "2 anni" },
            { nome: `_ga_${GA_ID.replace("G-", "")}`, fornitore: "Google", scopo: "Mantiene lo stato della sessione", durata: "2 anni" },
          ],
        },
        {
          titolo: "2.4 Marketing",
          stato: "Solo con consenso",
          descrizione: "Usiamo il tag di Google Ads per misurare i risultati delle nostre campagne, ad esempio quando chi arriva sul sito da un annuncio compila un modulo. Non viene mai caricato nelle pagine del corso e nelle aree riservate, usate anche da studenti minorenni.",
          voci: [
            { nome: "_gcl_au", fornitore: "Google", scopo: "Misura le conversioni delle campagne Google Ads", durata: "90 giorni" },
          ],
          nota: "Google può usare anche cookie propri sui suoi domini, secondo la sua informativa: policies.google.com/technologies/cookies.",
        },
      ],
    },
    terzeParti: {
      h: "3. Contenuti di terze parti",
      voci: [
        "I video del corso sono incorporati da YouTube in modalità di privacy avanzata (youtube-nocookie.com): YouTube non imposta cookie finché non avvii un video. Quando lo avvii, Google può salvare dati sul tuo dispositivo secondo la propria informativa.",
        "Le icone vengono caricate dalla rete jsDelivr e la mappa del Member Portal usa le tessere di OpenStreetMap. Non impostano cookie, ma come ogni richiesta web ricevono il tuo indirizzo IP.",
      ],
    },
    gestione: {
      h: "4. Come gestire le tue scelte",
      paragrafi: [
        "Puoi cambiare o revocare il consenso in qualsiasi momento con il pulsante qui sotto, che riapre il banner dei cookie. La revoca non pregiudica la liceità del trattamento svolto prima.",
        "Puoi anche bloccare o cancellare i cookie dalle impostazioni del browser. Bloccando i cookie tecnici non potrai accedere alle aree riservate.",
      ],
      pulsante: "Impostazioni dei cookie",
      browser: "Guide dei browser:",
    },
    base: {
      h: "5. Base giuridica",
      testo: "I cookie tecnici e la memoria funzionale sono usati ai sensi dell'art. 122 del Codice privacy (D.Lgs. 196/2003) e del nostro legittimo interesse a fornire il sito. I cookie di analisi e di marketing sono usati solo con il tuo consenso (art. 6, par. 1, lett. a GDPR), come richiedono la normativa ePrivacy e le linee guida del Garante per la protezione dei dati personali del 10 giugno 2021.",
    },
    aggiornamenti: {
      h: "6. Aggiornamenti",
      testo: "Aggiorniamo questa pagina quando cambiano i cookie usati dal sito. La data in alto indica l'ultima versione.",
    },
    contatti: {
      h: "7. Contatti",
      testo: "Per qualsiasi domanda su questa pagina scrivi a info@bioergotech.org. Puoi anche proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
    },
    privacy: { href: "/legal/informativa-privacy", etichetta: "Leggi l'informativa privacy" },
    colonne: { nome: "Nome", fornitore: "Fornitore", scopo: "Finalità", durata: "Durata" },
  },
};

export const GUIDE_BROWSER = [
  { nome: "Google Chrome", href: "https://support.google.com/chrome/answer/95647" },
  { nome: "Mozilla Firefox", href: "https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" },
  { nome: "Safari", href: "https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" },
  { nome: "Microsoft Edge", href: "https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" },
];

/** Evento che riapre il banner dei cookie, da qualsiasi punto del sito. */
export const EVENTO_APRI_COOKIE = "bioergotech:apri-cookie";
