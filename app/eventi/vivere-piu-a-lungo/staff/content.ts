/**
 * La mappa dello staff: ogni pagina dei percorsi, con chi la puo aprire e a
 * che cosa serve.
 *
 * Esiste perche i percorsi sono diventati ventuno pagine fra due bandi, un
 * corso e tre livelli di accesso, e chi li gestisce non deve tenerle a mente
 * ne cercarle in una chat. Le rotte vivono in un file solo, qui, cosi la
 * mappa non puo divergere dal sito senza che qualcuno se ne accorga: ogni
 * `href` di questo file e importato dal `content.ts` del suo modulo, non
 * scritto a mano.
 *
 * I percorsi sono elencati nell'ordine in cui una persona li incontra, non
 * in ordine alfabetico: prima quello che vede il pubblico, poi le aree di
 * chi partecipa, poi quelle di chi valuta, poi quelle dello staff.
 */

import { EVENT_SLUG } from "../content";
import {
  GUIDA_PATH,
  ISCRIZIONE_PATH,
  LICEI_PATH,
  REFERENTE_PATH,
  STUDENTE_PATH as LICEI_STUDENTE_PATH,
  COMMISSIONE_PATH as LICEI_COMMISSIONE_PATH,
} from "../licei/content";
import {
  ADMIN_PATH as UNIVERSITA_ADMIN_PATH,
  COMMISSIONE_PATH as UNIVERSITA_COMMISSIONE_PATH,
  CORSO_PATH,
  MENTOR_CANDIDATURA_PATH,
  MENTOR_PATH,
  STUDENTE_PATH as UNIVERSITA_STUDENTE_PATH,
  UNIVERSITA_PATH,
} from "../universita/content";

export const STAFF_PATH = `/eventi/${EVENT_SLUG}/staff`;

export const EVENTO_PATH = `/eventi/${EVENT_SLUG}`;
export const EVENTO_ADMIN_PATH = `/eventi/${EVENT_SLUG}/admin`;
export const BANDO_PATH = `/eventi/${EVENT_SLUG}/bando`;
export const BANDO_ADMIN_PATH = `/eventi/${EVENT_SLUG}/bando/admin`;
export const LICEI_ADMIN_PATH = `/eventi/${EVENT_SLUG}/licei/admin`;

/**
 * Chi puo aprire una pagina. Non e una decorazione: e la prima cosa che
 * qualcuno chiede quando un link "non funziona", e nove volte su dieci la
 * risposta e che sta guardando con l'account sbagliato.
 */
export const ACCESSI = {
  pubblico: { label: "Pubblico", colore: "#0A7A66", desc: "Si apre senza account." },
  partecipante: {
    label: "Partecipante",
    colore: "#2B6CB0",
    desc: "Serve l'account con cui la persona si e iscritta o candidata.",
  },
  commissione: {
    label: "Commissione",
    colore: "#7A5AF8",
    desc: "Solo i membri della Commissione, aggiunti dallo staff dal pannello.",
  },
  staff: {
    label: "Staff",
    colore: "#B4541A",
    desc: "Solo chi ha partnership_level = admin sul proprio profilo.",
  },
} as const;

export type Accesso = keyof typeof ACCESSI;

export type Voce = {
  titolo: string;
  href: string;
  accesso: Accesso;
  desc: string;
  /** Vero quando la pagina non e indicizzata: utile saperlo prima di condividerla. */
  riservata?: boolean;
};

export type Gruppo = {
  id: string;
  titolo: string;
  occhiello: string;
  intro: string;
  voci: Voce[];
};

export const GRUPPI: Gruppo[] = [
  {
    id: "universitari",
    occhiello: "Percorso universitario",
    titolo: "Biotecnologie e Intelligenza Artificiale",
    intro:
      "Il candidato e il singolo studente. Si candida da solo, riceve subito un account, entra nel corso, e la squadra la costruisce dopo, con il codice se conosce gia qualcuno o dalla bacheca se non conosce nessuno.",
    voci: [
      {
        titolo: "Il bando",
        href: UNIVERSITA_PATH,
        accesso: "pubblico",
        desc: "La pagina da diffondere. Contiene il modulo di candidatura, il regolamento articolo per articolo e le domande frequenti.",
      },
      {
        titolo: "I mentor",
        href: MENTOR_PATH,
        accesso: "pubblico",
        desc: "L'elenco dei mentor approvati che hanno acconsentito a comparire. Da mandare a chi chiede con chi lavorerebbe.",
      },
      {
        titolo: "Candidarsi come mentor",
        href: MENTOR_CANDIDATURA_PATH,
        accesso: "pubblico",
        desc: "Il modulo per ricercatori, docenti, clinici e professionisti. Da mandare a chi si offre di dare una mano.",
      },
      {
        titolo: "Area del partecipante",
        href: UNIVERSITA_STUDENTE_PATH,
        accesso: "partecipante",
        desc: "Squadra, bacheca, progetto e stato della candidatura. Le stesse cose compaiono dentro il corso, nel punto in cui la lezione le chiede.",
        riservata: true,
      },
      {
        titolo: "Area della Commissione",
        href: UNIVERSITA_COMMISSIONE_PATH,
        accesso: "commissione",
        desc: "Le schede di valutazione, una per progetto consegnato. Ogni commissario vede solo le proprie.",
        riservata: true,
      },
      {
        titolo: "Pannello staff",
        href: UNIVERSITA_ADMIN_PATH,
        accesso: "staff",
        desc: "Candidature, squadre e progetti, Commissione, mentor. Qui si aprono e si chiudono le fasi e si scaricano i CSV.",
        riservata: true,
      },
    ],
  },
  {
    id: "licei",
    occhiello: "Percorso istituti superiori",
    titolo: "Il bando dei licei",
    intro:
      "Qui aderisce l'istituto, non lo studente. Il docente referente iscrive la scuola, riceve un codice, lo mette in circolare, e poi conferma uno per uno i ragazzi che si sono iscritti con quel codice.",
    voci: [
      {
        titolo: "Il bando",
        href: LICEI_PATH,
        accesso: "pubblico",
        desc: "La pagina da mandare alle scuole. Contiene il modulo di adesione dell'istituto.",
      },
      {
        titolo: "Chi fa cosa nel percorso",
        href: GUIDA_PATH,
        accesso: "pubblico",
        desc: "La guida operativa passo per passo, con il testo della circolare gia pronto da copiare. E' la pagina da mandare a un docente che chiede come funziona.",
      },
      {
        titolo: "Iscrizione dello studente",
        href: ISCRIZIONE_PATH,
        accesso: "pubblico",
        desc: "Dove lo studente si iscrive con il codice della sua scuola. Accetta anche ?codice=LIC-XXXXXXXX, cosi il referente puo mettere in circolare un link gia compilato.",
      },
      {
        titolo: "Area del docente referente",
        href: REFERENTE_PATH,
        accesso: "partecipante",
        desc: "Dove il docente conferma i propri studenti, vede chi non e mai entrato nel corso e genera il modulo di autorizzazione da far firmare.",
        riservata: true,
      },
      {
        titolo: "Area dello studente",
        href: LICEI_STUDENTE_PATH,
        accesso: "partecipante",
        desc: "Squadra e progetto. Come per gli universitari, compare anche dentro le lezioni del corso.",
        riservata: true,
      },
      {
        titolo: "Area della Commissione",
        href: LICEI_COMMISSIONE_PATH,
        accesso: "commissione",
        desc: "Le schede di valutazione dei progetti consegnati dalle squadre delle superiori.",
        riservata: true,
      },
      {
        titolo: "Pannello staff",
        href: LICEI_ADMIN_PATH,
        accesso: "staff",
        desc: "Adesioni e iscrizioni, squadre e progetti, Commissione. Qui si aprono le fasi e si scelgono i dieci finalisti.",
        riservata: true,
      },
    ],
  },
  {
    id: "corso",
    occhiello: "Il corso",
    titolo: "Agentic AI",
    intro:
      "Uno solo, per tutti e due i percorsi. Le lezioni sono in inglese e aperte a chiunque abbia un account sul sito. Due lezioni, la 4.4 e quella di chiusura, mostrano il riquadro del percorso giusto a seconda di chi legge.",
    voci: [
      {
        titolo: "Il corso",
        href: CORSO_PATH,
        accesso: "pubblico",
        desc: "La prima lezione si apre senza account. Dalla seconda in poi serve essere registrati, ed e il motivo per cui la candidatura crea subito un account.",
      },
    ],
  },
  {
    id: "evento",
    occhiello: "La giornata e il bando startup",
    titolo: "Vivere piu a lungo",
    intro:
      "Iscriversi alla giornata del 10 dicembre e candidarsi a un bando restano due cose distinte, e vale per tutti e tre i bandi. Chi si candida deve comunque iscriversi all'evento.",
    voci: [
      {
        titolo: "La pagina dell'evento",
        href: EVENTO_PATH,
        accesso: "pubblico",
        desc: "Programma, relatori, partner e il modulo di iscrizione alla giornata.",
      },
      {
        titolo: "Bando startup",
        href: BANDO_PATH,
        accesso: "pubblico",
        desc: "La selezione aperta a team di ricerca, spin-off, startup, PMI innovative e imprese.",
      },
      {
        titolo: "Pannello iscrizioni all'evento",
        href: EVENTO_ADMIN_PATH,
        accesso: "staff",
        desc: "Chi si e iscritto alla giornata, il check-in e le esportazioni.",
        riservata: true,
      },
      {
        titolo: "Pannello bando startup",
        href: BANDO_ADMIN_PATH,
        accesso: "staff",
        desc: "Le candidature del bando startup e i loro materiali.",
        riservata: true,
      },
    ],
  },
];

/* ── Che cosa va fatto, e in che ordine ───────────────────────────────── */

export type Passo = {
  titolo: string;
  testo: string;
  href?: string;
  etichetta?: string;
};

/**
 * La parte che non si deduce da nessuna pagina, e che quindi qualcuno
 * finirebbe per chiedere ogni volta.
 */
export const PRIMA_DI_TUTTO: Passo[] = [
  {
    titolo: "Le migrazioni si eseguono a mano",
    testo:
      "Nessuna migrazione parte da sola: il deploy porta il codice, non lo schema del database. I file in supabase/migrations si eseguono in ordine di nome dall'editor SQL di Supabase, oppure con supabase db push. Se il codice arriva prima dello schema, il modulo di candidatura smette di funzionare, perche scrive una colonna che ancora non esiste.",
  },
  {
    titolo: "Il pannello si apre solo con partnership_level = admin",
    testo:
      "Se al posto del pannello compare \"Accesso riservato\", l'account con cui sta guardando non e admin. Non e un errore della pagina: e il controllo che la protegge.",
  },
  {
    titolo: "Tutte le fasi partono chiuse, e si aprono in ordine",
    testo:
      "Squadre, bacheca, consegne e valutazione nascono chiuse, di proposito: aprire le consegne prima che esistano le squadre, o la valutazione prima che esistano i progetti, produce schermate che non hanno niente da mostrare a chi le apre. Si aprono una alla volta dal pannello, quando serve.",
  },
  {
    titolo: "La conferma automatica, invece, parte accesa",
    testo:
      "Una nuova candidatura entra subito nel percorso e nel corso. Si spegne solo se le candidature superano i posti e la selezione dell'art. 4 va davvero esercitata: da quel momento ogni candidatura resta in attesa finche qualcuno non la conferma a mano.",
  },
];

/**
 * Gli interruttori, nell'ordine in cui ha senso accenderli. L'ordine e la
 * parte utile: i nomi si leggono anche dal pannello.
 */
export const FASI = [
  {
    chiave: "stato_squadre",
    titolo: "Formazione delle squadre",
    quando: "Quando i partecipanti hanno fatto abbastanza lezioni da sapere con chi vogliono lavorare.",
  },
  {
    chiave: "stato_board",
    titolo: "Bacheca di chi cerca compagni",
    quando:
      "Insieme alle squadre, o poco prima. Aprirla dopo servirebbe a poco: chi conosce qualcuno ha gia fatto squadra, e resta fuori proprio chi la bacheca doveva aiutare.",
  },
  {
    chiave: "stato_consegne",
    titolo: "Consegna dei progetti",
    quando:
      "Quando le squadre sono formate. Chiuderla e il termine vero: da li in poi nessuno puo piu consegnare ne modificare.",
  },
  {
    chiave: "stato_valutazione",
    titolo: "Schede della Commissione",
    quando:
      "Dopo aver chiuso le consegne. Aprirla prima significherebbe far valutare progetti che stanno ancora cambiando.",
  },
] as const;
