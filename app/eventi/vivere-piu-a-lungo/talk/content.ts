/**
 * Punto UNICO di configurazione dei "Talk con gli esperti".
 *
 * Una serie di incontri brevi, online, fra gli studenti del percorso
 * "Biotecnologie e Intelligenza Artificiale" (licei e università) e chi
 * lavora ogni giorno su energia, ambiente, biotecnologie e salute. Servono a
 * conoscere problemi veri e a trovare idee concrete per i progetti.
 *
 * Aggiungere un talk vuol dire aggiungere una voce a `TALKS`: pagina,
 * calendario, sitemap, schede nelle aree e pannello staff la leggono da qui.
 * Il README della cartella spiega i passi.
 *
 * ATTENZIONE: questo file contiene `link`, il collegamento alla riunione,
 * che arriva ai soli iscritti dalla rotta dell'iscrizione. Non va MAI
 * importato da un componente client (`"use client"`), altrimenti il link
 * finisce nel JavaScript pubblico del sito. I componenti client importano i
 * testi da `testi.ts` e ricevono i dati come props, gia passati da
 * `schedaTalk`, che il link lo toglie.
 */

import { EVENT_SLUG, SITE_URL } from "../content";

export { SITE_URL };
export { TESTI_TALK, RUOLI_TALK_LABEL, ruoloTalkLabel } from "./testi";

/** Slug della sotto rotta pubblica: /eventi/vivere-piu-a-lungo/talk */
export const TALK_SLUG = "talk";

export const TALK_PATH = `/eventi/${EVENT_SLUG}/${TALK_SLUG}`;

/**
 * L'indirizzo breve da mettere su locandine e post: rimanda in modo
 * permanente a `TALK_PATH` (`app/talk/page.tsx`).
 */
export const TALK_ALIAS_PATH = "/talk";

/** La pagina di un talk. */
export const talkPath = (slug: string): string => `${TALK_PATH}/${slug}`;

/** La serie, come la presenta la pagina indice. */
export const TALK_SERIE = {
  titolo: "Talk con gli esperti",
  occhiello: "Percorso «Biotecnologie e Intelligenza Artificiale»",
  intro:
    "Incontri brevi con chi lavora ogni giorno su energia, ambiente, biotecnologie e salute. Servono a conoscere problemi veri e a trovare idee per i progetti del percorso.",
  descrizione:
    "Incontri online con esperti di energia, ambiente, biotecnologie e salute, per gli studenti del percorso Biotecnologie e Intelligenza Artificiale della Fondazione bioERGOtech.",
} as const;

export type TemaTalk = {
  titolo: string;
  testo: string;
  /** Icona Font Awesome della scheda, per esempio "fa-seedling". Facoltativa. */
  icona?: string;
};

export type Talk = {
  /** Parte della URL. Non si cambia dopo la pubblicazione: le iscrizioni la usano come chiave. */
  slug: string;
  /** Il numero nella serie, per l'occhiello "Talk con gli esperti . 1". */
  numero: number;
  titolo: string;
  sottotitolo: string;
  relatore: {
    nome: string;
    ruolo: string;
    /** Percorso della foto in `public/`. Null: al suo posto il monogramma con le iniziali. */
    foto: string | null;
  };
  /** La data per esteso, come si legge in pagina. */
  dataLabel: string;
  /** L'orario per esteso, come si legge in pagina. */
  orarioLabel: string;
  /** Inizio e fine in ISO 8601 con il fuso: sono la fonte di calendario e dati strutturati. */
  inizio: string;
  fine: string;
  modalita: "online" | "presenza";
  /** Il luogo, solo per un talk in presenza. */
  luogo: string | null;
  /**
   * Il link della riunione. Lo vedono SOLO gli iscritti, dalla rotta
   * dell'iscrizione; non compare mai nell'HTML pubblico ne nel calendario.
   * Null finche non c'e: al suo posto gli iscritti leggono che arrivera.
   */
  link: string | null;
  /** Posti disponibili. Null: nessun limite. */
  capienza: number | null;
  intro: string;
  temi: TemaTalk[];
  spunti: string[];
  /** La riga che chiude gli spunti. */
  spuntiNota: string;
  perChi: string;
  /** Immagine Open Graph, 1200x630, in `public/`. */
  immagineOg: string;
};

export const TALKS: Talk[] = [
  {
    slug: "emanuele-memmola",
    numero: 1,
    titolo: "Dalle biomasse al metano sintetico",
    sottotitolo:
      "Energia rinnovabile, territorio e salute: le sfide reali dell'economia circolare raccontate da chi ci lavora.",
    relatore: {
      nome: "Emanuele Memmola",
      ruolo: "Responsabile dell'economia circolare di Eni a Taranto",
      foto: null,
    },
    dataLabel: "Lunedì 9 novembre 2026",
    orarioLabel: "dalle 15:00 alle 16:00",
    inizio: "2026-11-09T15:00:00+01:00",
    fine: "2026-11-09T16:00:00+01:00",
    modalita: "online",
    luogo: null,
    link: null,
    capienza: null,
    intro:
      "Uno degli obiettivi del percorso è aiutarvi a trovare idee concrete da sviluppare nei vostri progetti. Per questo vi mettiamo in contatto con esperti del settore, che raccontano le sfide reali che affrontano nel loro lavoro. Il primo incontro è con Emanuele Memmola, che parlerà di metano sintetico e biomasse e delle loro possibili applicazioni in ambito biotech e salute.",
    temi: [
      {
        titolo: "Idrogeno verde e metano sintetico",
        icona: "fa-atom",
        testo:
          "Come si produce energia rinnovabile combinando idrogeno verde e anidride carbonica, e perché un combustibile pulito conta anche per laboratori, ospedali e filiere della salute.",
      },
      {
        titolo: "Un ettaro di canapa per curare il suolo",
        icona: "fa-seedling",
        testo:
          "La fitodepurazione naturale: piante che assorbono gli inquinanti dal terreno e, a fine ciclo, diventano materiali per l'edilizia, ingredienti per la cosmetica ed energia.",
      },
      {
        titolo: "Macroalghe",
        icona: "fa-water",
        testo:
          "Coltivare alghe come biomassa: una fonte di energia, ma anche di molecole utili per nutraceutica, cosmetica e salute.",
      },
      {
        titolo: "Biomasse e agricoltura",
        icona: "fa-wheat-awn",
        testo:
          "Come gli scarti agricoli tornano risorsa, e come scegliere le biomasse migliori per efficacia e resa nei biocarburanti: un problema in cui dati e intelligenza artificiale possono fare la differenza.",
      },
      {
        titolo: "Chi paga per decarbonizzare",
        icona: "fa-coins",
        testo:
          "La sostenibilità economica della transizione: quanto costa, chi la finanzia e come un'idea diventa un progetto che sta in piedi.",
      },
    ],
    spunti: [
      "un modello che stima la resa di diverse biomasse a partire da dati agricoli e climatici;",
      "uno strumento che segue nel tempo la fitodepurazione di un terreno, con dati e immagini;",
      "una mappa delle biomasse disponibili sul territorio di Taranto e dei loro possibili usi, dall'energia alla salute.",
    ],
    spuntiNota: "Sono solo spunti: le idee migliori nasceranno dalle vostre domande.",
    perChi:
      "Per gli studenti del percorso «Biotecnologie e Intelligenza Artificiale», dei licei e dell'università, e per i loro docenti. La partecipazione è gratuita.",
    immagineOg: "/assets/images/eventi/talk/emanuele-memmola-og.jpg",
  },
];

/* ── Ricerca e ordine ─────────────────────────────────────────────────── */

export const trovaTalk = (slug: string): Talk | null => TALKS.find((t) => t.slug === slug) ?? null;

const ms = (iso: string): number => new Date(iso).getTime();

/** Il talk e finito? Si guarda la fine, non l'inizio: durante il talk e ancora "in corso". */
export const talkConcluso = (t: Pick<Talk, "fine">, adesso: Date = new Date()): boolean =>
  ms(t.fine) <= adesso.getTime();

/**
 * I talk in due gruppi: i prossimi, dal piu vicino, e i passati, dal piu
 * recente. E l'ordine della pagina indice.
 */
export function talkOrdinati(adesso: Date = new Date()): { prossimi: Talk[]; passati: Talk[] } {
  const prossimi = TALKS.filter((t) => !talkConcluso(t, adesso)).sort((a, b) => ms(a.inizio) - ms(b.inizio));
  const passati = TALKS.filter((t) => talkConcluso(t, adesso)).sort((a, b) => ms(b.inizio) - ms(a.inizio));
  return { prossimi, passati };
}

/** Il prossimo talk non ancora finito, o null. Lo mostrano le aree e la pagina dei licei. */
export const prossimoTalk = (adesso: Date = new Date()): Talk | null => talkOrdinati(adesso).prossimi[0] ?? null;

/** "Talk con gli esperti . 1" */
export const occhielloTalk = (t: Pick<Talk, "numero">): string => `${TALK_SERIE.titolo} . ${t.numero}`;

/** Le iniziali del relatore, per il monogramma: "Emanuele Memmola" diventa "EM". */
export function iniziali(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean);
  if (parole.length === 0) return "";
  const prima = parole[0][0] ?? "";
  const ultima = parole.length > 1 ? (parole[parole.length - 1][0] ?? "") : "";
  return (prima + ultima).toUpperCase();
}

/** "Online", oppure il luogo. */
export const luogoTalk = (t: Pick<Talk, "modalita" | "luogo">): string =>
  t.modalita === "online" ? "Online" : (t.luogo ?? "In presenza");

/* ── La vista pubblica, l'unica che arriva ai componenti client ──────── */

/**
 * Quello che di un talk puo stare nell'HTML pubblico e nel JavaScript del
 * browser. Tutto tranne `link`. Le pagine server passano ai componenti
 * client solo questo.
 */
export type TalkScheda = {
  slug: string;
  numero: number;
  occhiello: string;
  titolo: string;
  relatore: { nome: string; ruolo: string; foto: string | null; iniziali: string };
  dataLabel: string;
  orarioLabel: string;
  inizio: string;
  fine: string;
  luogo: string;
  path: string;
};

export function schedaTalk(t: Talk): TalkScheda {
  return {
    slug: t.slug,
    numero: t.numero,
    occhiello: occhielloTalk(t),
    titolo: t.titolo,
    relatore: { ...t.relatore, iniziali: iniziali(t.relatore.nome) },
    dataLabel: t.dataLabel,
    orarioLabel: t.orarioLabel,
    inizio: t.inizio,
    fine: t.fine,
    luogo: luogoTalk(t),
    path: talkPath(t.slug),
  };
}
