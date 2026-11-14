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
    /**
     * Percorso della foto in `public/`: un ritratto quadrato su fondo grigio
     * da studio, come i relatori dell'evento (README, "Foto del relatore").
     * Con la foto la pagina del talk mostra un ritratto grande e la scheda
     * dell'indice uno medio; null: al loro posto il monogramma con le
     * iniziali.
     */
    foto: string | null;
  };
  /** La data per esteso, come si legge in pagina. */
  dataLabel: string;
  /** L'orario per esteso, come si legge in pagina. */
  orarioLabel: string;
  /**
   * Inizio e fine in ISO 8601 con il fuso: sono la fonte di calendario e
   * dati strutturati. Sempre l'ora italiana (`+01:00` d'inverno, `+02:00`
   * con l'ora legale): ogni calendario la converte nell'ora locale di chi lo
   * apre, quindi chi vive in un altro fuso vede un orario diverso, ed e
   * giusto.
   */
  inizio: string;
  fine: string;
  modalita: "online" | "presenza";
  /** Il luogo, solo per un talk in presenza. */
  luogo: string | null;
  /**
   * Il link della riunione. Lo vedono SOLO gli iscritti ancora idonei: dalla
   * rotta dell'iscrizione, nel riquadro e nel link per Google Calendar, e
   * nel file .ics scaricato con l'accesso. Non compare mai nell'HTML
   * pubblico, nel JavaScript del browser ne nel calendario pubblico.
   * Null finche non c'e: al suo posto gli iscritti leggono che arrivera.
   */
  link: string | null;
  /** Posti disponibili. Null: nessun limite. */
  capienza: number | null;
  /**
   * Aperto a tutti, non solo a chi partecipa al percorso. Chiunque abbia un
   * account sul sito (anche creato apposta, gratis) si iscrive con un clic
   * e riceve il link, con il ruolo `ospite`; chi partecipa al percorso si
   * iscrive con il suo ruolo di sempre, e il docente continua a vedere i
   * suoi studenti iscritti. Il link resta fuori dall'HTML pubblico come per
   * gli altri talk: serve un account, quindi chi entra nella riunione ha un
   * nome e un'email. Serve la migrazione 20261231000000 (il ruolo `ospite`).
   */
  apertoATutti?: boolean;
  intro: string;
  temi: TemaTalk[];
  spunti: string[];
  /** La riga che chiude gli spunti. */
  spuntiNota: string;
  /**
   * I titoli della sezione degli spunti, se diversi da quelli di un talk
   * tematico ("Spunti per i vostri progetti", con esempi di progetti). Un
   * talk su come presentare un'idea ha piuttosto cose da preparare.
   */
  spuntiSezione?: { kicker: string; titolo: string; intro: string };
  perChi: string;
  /** Immagine Open Graph, 1200x630, in `public/`. */
  immagineOg: string;
};

export const TALKS: Talk[] = [
  {
    slug: "emanuele-memmola",
    numero: 1,
    // Il titolo e il ruolo sono quelli indicati dal relatore il 19 ottobre.
    titolo: "Dalle biomasse all'idrogeno verde, sino agli e-fuel",
    sottotitolo:
      "Energia rinnovabile, territorio e salute: le sfide reali dell'economia circolare raccontate da chi ci lavora.",
    relatore: {
      nome: "Emanuele Memmola",
      ruolo: "Presidente della Sezione Chimica Energia Ambiente di Confindustria Taranto",
      foto: "/assets/images/eventi/talk/emanuele-memmola.webp",
    },
    dataLabel: "Lunedì 9 novembre 2026",
    // Ora italiana, dalle 15 alle 16. Il calendario dell'organizzatore mostra
    // dalle 16 alle 17 perche e impostato sul suo fuso, un'ora avanti
    // rispetto all'Italia a novembre: l'orario giusto e questo.
    orarioLabel: "dalle 15:00 alle 16:00",
    inizio: "2026-11-09T15:00:00+01:00",
    fine: "2026-11-09T16:00:00+01:00",
    modalita: "online",
    luogo: null,
    link: "https://meet.google.com/qoy-qvkw-ced",
    capienza: null,
    intro:
      "Uno degli obiettivi del percorso è aiutarvi a trovare idee concrete da sviluppare nei vostri progetti. Per questo vi mettiamo in contatto con esperti del settore, che raccontano le sfide reali che affrontano nel loro lavoro. Il primo incontro è con Emanuele Memmola, che parlerà del percorso dalle biomasse all'idrogeno verde fino agli e-fuel, e delle loro possibili applicazioni in ambito biotech e salute.",
    temi: [
      {
        titolo: "Idrogeno verde ed e-fuel",
        icona: "fa-atom",
        testo:
          "Come idrogeno verde e anidride carbonica diventano combustibili sintetici, gli e-fuel, e perché un combustibile pulito conta anche per laboratori, ospedali e filiere della salute.",
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
    // "?v=2": l'immagine e stata rifatta con il titolo e il ruolo nuovi, e
    // WhatsApp, LinkedIn e Facebook rileggono un'anteprima solo se cambia
    // l'indirizzo.
    immagineOg: "/assets/images/eventi/talk/emanuele-memmola-og.jpg?v=2",
  },
  {
    slug: "roberta-gilardi",
    numero: 2,
    // Il tema concordato con la relatrice l'11 novembre: come presentare
    // un'idea e il proprio progetto, per studenti delle superiori. I temi
    // sotto sono una prima stesura da far rivedere a lei.
    titolo: "Dall'idea al pitch: come presentare il vostro progetto",
    sottotitolo:
      "Chiarezza nella testa, chiarezza nel discorso: le domande giuste per capire un problema e il modo migliore per raccontarlo.",
    relatore: {
      nome: "Roberta Gilardi",
      ruolo: "CEO di G-Gravity, hub di innovazione con sede a Milano",
      // La foto l'ha mandata la relatrice il 14 novembre: tagliata come i
      // ritratti degli altri relatori, con il suo sfondo chiaro.
      foto: "/assets/images/eventi/talk/roberta-gilardi.webp",
    },
    dataLabel: "Giovedì 19 novembre 2026",
    // Ora italiana, dalle 15 alle 16. L'invito del calendario mostra dalle
    // 17 alle 18 perche e impostato sul fuso di Riyadh, due ore avanti
    // rispetto all'Italia a novembre: l'orario giusto e questo.
    orarioLabel: "dalle 15:00 alle 16:00",
    inizio: "2026-11-19T15:00:00+01:00",
    fine: "2026-11-19T16:00:00+01:00",
    modalita: "online",
    luogo: null,
    link: "https://meet.google.com/dpz-xbdd-aar",
    capienza: null,
    // Deciso il 14 novembre: come presentare un'idea serve a tutti, non
    // solo a chi segue il percorso.
    apertoATutti: true,
    intro:
      "I vostri progetti stanno prendendo forma, e presto andranno raccontati: nella consegna del 25 novembre, davanti alla Commissione e, per i finalisti, sul palco del 10 dicembre. In questo incontro Roberta Gilardi, CEO di G-Gravity, hub di innovazione che con sedi a Milano, Roma e Helsinki accompagna startup e aziende nei loro percorsi di innovazione, spiega come si presenta un'idea: quali domande porsi per capire davvero un problema, e come trasformare quella chiarezza in un discorso che convince.",
    temi: [
      {
        titolo: "Le domande giuste",
        icona: "fa-circle-question",
        testo:
          "Chi ha il problema, quanto spesso lo incontra, che cosa succede se nessuno lo risolve: le domande che un innovatore si pone prima di cercare una soluzione.",
      },
      {
        titolo: "Presentare un problema",
        icona: "fa-bullseye",
        testo:
          "Come far capire in pochi secondi perché un problema è importante, partendo da una persona reale e da un dato.",
      },
      {
        titolo: "La struttura di un pitch",
        icona: "fa-list-ol",
        testo:
          "Problema, soluzione, chi la usa, perché adesso, che cosa serve per andare avanti: l'ordine che aiuta chi ascolta a seguirvi.",
      },
      {
        titolo: "Chiarezza in testa, chiarezza nel discorso",
        icona: "fa-lightbulb",
        testo:
          "Se un'idea è chiara a chi la presenta, lo diventa anche per chi ascolta: come semplificare senza banalizzare.",
      },
      {
        titolo: "Come lavora un hub di innovazione",
        icona: "fa-rocket",
        testo:
          "Che cosa cerca chi deve scegliere un progetto, e come un'idea diventa un percorso con persone, partner e risorse.",
      },
    ],
    spuntiSezione: {
      kicker: "Prima del talk",
      titolo: "Che cosa preparare",
      intro: "Tre cose da preparare con la vostra squadra, per seguire l'incontro pensando già al vostro progetto:",
    },
    spunti: [
      "la frase con cui oggi descrivereste il vostro progetto a chi non lo conosce;",
      "il problema che volete risolvere, scritto in una riga, con la persona che lo vive;",
      "una domanda su come presentare il vostro lavoro alla Commissione e sul palco.",
    ],
    spuntiNota: "Non serve consegnarle: servono a voi, per ricavare il massimo dall'incontro.",
    perChi:
      "Il talk è aperto a tutti: agli studenti e ai docenti del percorso «Biotecnologie e Intelligenza Artificiale», dei licei e dell'università, e a chiunque voglia imparare a presentare un'idea o un progetto. Per iscriversi e ricevere il link basta un account sul sito, che si crea gratis in un minuto. La partecipazione è gratuita.",
    immagineOg: "/assets/images/eventi/talk/roberta-gilardi-og.jpg",
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

/**
 * "Talk del 9 novembre": il nome breve con cui i docenti lo ritrovano
 * nell'elenco dei loro studenti. Dalla data di inizio, in ora italiana,
 * cosi non va tenuto allineato a mano come `dataLabel`.
 */
export const etichettaTalk = (t: Pick<Talk, "inizio">): string =>
  `Talk del ${new Date(t.inizio).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  })}`;

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
  /** "Talk del 9 novembre", come lo segna l'elenco degli studenti dei docenti. */
  etichetta: string;
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
    etichetta: etichettaTalk(t),
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
