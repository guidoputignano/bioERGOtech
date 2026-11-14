/**
 * Smistamento dei progetti alla Commissione e calendario automatico, dal
 * 25 novembre all'annuncio dei finalisti.
 *
 * Con circa 80 progetti e 8 giudici non si puo chiedere a tutti di leggere
 * tutto: ogni progetto va a `GIUDICI_PER_PROGETTO` giudici, scelti per tema
 * e con carichi uguali, e ogni giudice vede solo i suoi. Le date e i testi
 * stanno qui perche li leggono il server (il cron e le email), l'area dei
 * giudici, il modulo degli studenti e il pannello dello staff: chi guarda
 * il pannello legge le stesse date che partono nelle email.
 *
 * Nessun segreto: il file si puo importare dai componenti client.
 */

import { LICEI, SCADENZA_CONSEGNA, SCADENZA_CONSEGNA_LABEL } from "./content";

/* ── Temi ─────────────────────────────────────────────────────────────── */

/**
 * I temi fra cui le squadre scelgono alla consegna, e i giudici le loro
 * competenze. Un elenco chiuso e uguale per tutti: con il testo libero
 * "IA" e "intelligenza artificiale" non si abbinerebbero. I valori sono
 * anche il vincolo a database (migrazione 20261231100000): cambiarli vuol
 * dire cambiare anche quello.
 */
export const TEMI_PROGETTO = [
  { value: "diagnosi", label: "Diagnosi e prevenzione" },
  { value: "terapie", label: "Farmaci e terapie" },
  { value: "alimentazione", label: "Alimentazione e nutrizione" },
  { value: "ambiente", label: "Acqua, aria e suolo" },
  { value: "energia", label: "Energia e clima" },
  { value: "agricoltura", label: "Agricoltura e biomasse" },
  { value: "dati_ia", label: "Dati e intelligenza artificiale" },
  { value: "dispositivi", label: "App, sensori e dispositivi" },
] as const;

export type TemaProgetto = (typeof TEMI_PROGETTO)[number]["value"];

export const TEMI_VALIDI: ReadonlySet<string> = new Set(TEMI_PROGETTO.map((t) => t.value));

/** Quanti temi una squadra puo scegliere: uno o due. */
export const TEMI_MIN = 1;
export const TEMI_MAX = 2;

export const temaLabel = (v: string): string => TEMI_PROGETTO.find((t) => t.value === v)?.label ?? v;

/** Solo i temi validi, senza doppioni, nell'ordine dell'elenco. */
export const temiPuliti = (v: unknown): string[] =>
  Array.isArray(v) ? TEMI_PROGETTO.map((t) => t.value).filter((t) => v.includes(t)) : [];

/* ── Regole dello smistamento ─────────────────────────────────────────── */

/**
 * Giudici per progetto. Con 80 progetti e 8 giudici fa 20 progetti a
 * testa, circa cinque ore di lettura in otto giorni. Con 3 sarebbero 30 a
 * testa: troppi per chi lo fa a titolo gratuito. Il secondo parere evita
 * che un progetto dipenda da un giudice solo; i progetti vicini al 10°
 * posto li rivede comunque la Commissione prima dell'annuncio.
 */
export const GIUDICI_PER_PROGETTO = 2;

/** Lo stesso numero in lettere, per i testi: "letto da due giudici". */
export const GIUDICI_PER_PROGETTO_LETTERE = ({ 1: "un", 2: "due", 3: "tre", 4: "quattro" } as Record<number, string>)[GIUDICI_PER_PROGETTO] ?? String(GIUDICI_PER_PROGETTO);

/** Le schede chiuse che servono a un progetto per una media affidabile. */
export const SCHEDE_MINIME = 2;

/** Quanti progetti in piu riceve chi preme "Ho tempo, dammene altri". */
export const PROGETTI_EXTRA = 3;

/** Per chiederne altri, al giudice non devono restare piu di tanti progetti aperti. */
export const APERTI_PER_CHIEDERE_ALTRI = 2;

/** Il tempo che chiediamo per progetto, nelle email: aiuta a bloccare l'agenda. */
export const MINUTI_PER_PROGETTO = 15;

/* ── Date ─────────────────────────────────────────────────────────────── */

/** Il termine per i giudici: tutte le schede assegnate chiuse. */
export const SCADENZA_GIUDICI = "2026-12-03T23:59:59+01:00";
export const SCADENZA_GIUDICI_LABEL = "giovedì 3 dicembre 2026, ore 23:59";
export const SCADENZA_GIUDICI_BREVE = "giovedì 3 dicembre";

/** Il giorno in cui si annunciano i finalisti. L'annuncio resta allo staff. */
export const ANNUNCIO_FINALISTI_LABEL = "venerdì 4 dicembre 2026";

/** La riserva interna, il 4 dicembre, chiude le schede entro quest'ora. */
export const SCADENZA_RISERVA_LABEL = "venerdì 4 dicembre, ore 18:00";

/** Il termine e passato? */
export const scadenzaGiudiciPassata = (adesso: number = Date.now()): boolean =>
  adesso > Date.parse(SCADENZA_GIUDICI);

/* ── Il calendario automatico ─────────────────────────────────────────── */

/**
 * I passi che il cron giornaliero (`/api/cron/licei-commissione`, ogni
 * mattina alle 8 ora italiana) esegue da solo, una volta ciascuno.
 *
 * `da`: dal momento in cui il passo e dovuto. `fino`: oltre, non ha piu
 * senso (un promemoria di consegna dopo la scadenza) e si salta. Il cron
 * gira una volta al giorno: un passo dovuto alle 8 parte alle 8, uno
 * mancato (cron fermo) parte il giorno dopo, se e ancora nella finestra.
 */
export type IdPasso =
  | "aggiornamento"
  | "consegna_tre_giorni"
  | "consegna_ultimo_giorno"
  | "smistamento"
  | "giudici_meta"
  | "ridistribuzione"
  | "giudici_ultimo_giorno"
  | "copertura";

export type Passo = {
  id: IdPasso;
  da: string;
  fino: string;
  quando: string;
  titolo: string;
  descrizione: string;
};

export const PASSI_AUTOMATICI: readonly Passo[] = [
  {
    id: "aggiornamento",
    da: "2026-11-16T08:00:00+01:00",
    fino: "2026-11-22T23:59:59+01:00",
    quando: "Lunedì 16 novembre, ore 8",
    titolo: "Aggiornamento a studenti e scuole",
    descrizione:
      "Le date fino al 10 dicembre, i temi nel modulo di consegna e che cosa chiediamo ai docenti. Parte prima se lo invii dal riquadro qui sotto.",
  },
  {
    id: "consegna_tre_giorni",
    da: "2026-11-23T08:00:00+01:00",
    fino: SCADENZA_CONSEGNA,
    quando: "Lunedì 23 novembre, ore 8",
    titolo: "Promemoria: mancano tre giorni",
    descrizione:
      "Agli studenti delle squadre che non hanno consegnato e a chi non è in una squadra; a ogni docente, l'elenco delle squadre del suo istituto ancora in bozza.",
  },
  {
    id: "consegna_ultimo_giorno",
    da: "2026-11-25T08:00:00+01:00",
    fino: SCADENZA_CONSEGNA,
    quando: "Mercoledì 25 novembre, ore 8",
    titolo: "Promemoria: ultimo giorno per consegnare",
    descrizione: "Agli studenti delle squadre con il progetto ancora in bozza.",
  },
  {
    id: "smistamento",
    da: "2026-11-26T08:00:00+01:00",
    fino: SCADENZA_GIUDICI,
    quando: "Giovedì 26 novembre, ore 8",
    titolo: "Smistamento e apertura delle schede",
    descrizione: `Ogni progetto va a ${GIUDICI_PER_PROGETTO} giudici, per tema e con carichi uguali; si aprono le schede. Email a ogni giudice con i suoi progetti, a ogni scuola con i progetti consegnati, agli studenti con le date.`,
  },
  {
    id: "giudici_meta",
    da: "2026-11-30T08:00:00+01:00",
    fino: SCADENZA_GIUDICI,
    quando: "Lunedì 30 novembre, ore 8",
    titolo: "Promemoria a metà strada",
    descrizione:
      "Ai giudici che non hanno finito, con il punto della situazione. Chi non ha ancora iniziato è avvisato che mercoledì i suoi progetti passano alla riserva.",
  },
  {
    id: "ridistribuzione",
    da: "2026-12-02T08:00:00+01:00",
    fino: SCADENZA_GIUDICI,
    quando: "Mercoledì 2 dicembre, ore 8",
    titolo: "Ridistribuzione di chi non ha iniziato",
    descrizione:
      "I progetti dei giudici che non hanno salvato nemmeno una scheda passano alla riserva interna (o, senza riserva, ai giudici con meno carico).",
  },
  {
    id: "giudici_ultimo_giorno",
    da: "2026-12-03T08:00:00+01:00",
    fino: SCADENZA_GIUDICI,
    quando: "Giovedì 3 dicembre, ore 8",
    titolo: "Promemoria: ultimo giorno per i giudici",
    descrizione: "Ai giudici con schede ancora aperte.",
  },
  {
    id: "copertura",
    da: "2026-12-04T08:00:00+01:00",
    fino: "2026-12-09T23:59:59+01:00",
    quando: "Venerdì 4 dicembre, ore 8",
    titolo: "Copertura con la riserva",
    descrizione: `I progetti con meno di ${SCHEDE_MINIME} schede chiuse vanno alla riserva interna, da chiudere entro le 18. Poi l'annuncio dei finalisti, dal pannello Progetti.`,
  },
];

export const passo = (id: IdPasso): Passo => PASSI_AUTOMATICI.find((p) => p.id === id)!;

/** La chiave in `licei_config` che segna un passo come fatto. */
export const chiavePasso = (id: IdPasso): string => `auto_${id}`;

/* ── Livelli di punteggio ─────────────────────────────────────────────── */

/**
 * Che cosa vuol dire basso, medio e alto per ciascun criterio. Con
 * progetti divisi fra giudici diversi il rischio vero e che ognuno abbia il
 * suo metro: uno da 60 e un altro 85 allo stesso lavoro. Tre fasce scritte
 * avvicinano i metri piu di qualunque correzione statistica, e si spiegano
 * a scuole e famiglie.
 */
export const LIVELLI_CRITERI: Record<string, { da: number; a: number; testo: string }[]> = {
  p_innovativita: [
    { da: 0, a: 8, testo: "idea già diffusa, riproposta senza elementi nuovi" },
    { da: 9, a: 17, testo: "variante utile di soluzioni esistenti, o un'idea nota applicata in un contesto nuovo" },
    { da: 18, a: 25, testo: "approccio nuovo o combinazione originale, motivata rispetto a ciò che esiste" },
  ],
  p_fattibilita: [
    { da: 0, a: 6, testo: "approccio vago o tecnicamente poco plausibile" },
    { da: 7, a: 13, testo: "approccio plausibile, con passaggi poco chiari o da verificare" },
    { da: 14, a: 20, testo: "passaggi tecnici chiari e realistici per le risorse indicate" },
  ],
  p_impatto: [
    { da: 0, a: 6, testo: "beneficio generico o non spiegato" },
    { da: 7, a: 13, testo: "beneficio chiaro per un gruppo di persone ben definito" },
    { da: 14, a: 20, testo: "beneficio rilevante e misurabile, su un problema serio o per molte persone" },
  ],
  p_etica: [
    { da: 0, a: 4, testo: "implicazioni etiche non considerate" },
    { da: 5, a: 10, testo: "rischi individuati, trattati in modo generico" },
    { da: 11, a: 15, testo: "rischi concreti individuati, con misure precise per gestirli" },
  ],
  p_squadra: [
    { da: 0, a: 3, testo: "metodo non descritto" },
    { da: 4, a: 7, testo: "ruoli e passaggi descritti in modo essenziale" },
    { da: 8, a: 10, testo: "metodo chiaro, ruoli e scelte motivate, errori compresi" },
  ],
  p_presentazione: [
    { da: 0, a: 3, testo: "testo confuso, difficile da seguire" },
    { da: 4, a: 7, testo: "chiaro, ma poco sintetico o poco efficace" },
    { da: 8, a: 10, testo: "chiaro, sintetico, convincente" },
  ],
};

/* ── Testi ────────────────────────────────────────────────────────────── */

export const TESTI_SMISTAMENTO = {
  temiStudenti:
    "Scegliete uno o due temi: servono ad affidare il progetto ai giudici che conoscono meglio quel campo.",
  temiGiudice:
    "Scelga i temi in cui si sente più competente: lo smistamento del 26 novembre le affida soprattutto progetti su quei temi.",
  primaDelloSmistamento: `Il 26 novembre, chiuse le consegne, riceve i suoi progetti: ognuno è letto da ${GIUDICI_PER_PROGETTO_LETTERE} giudici, scelti per tema, con carichi uguali. Fino ad allora può leggere i progetti che arrivano.`,
  riserva:
    "Lei fa parte della riserva interna: riceve progetti solo se servono, cioè se un collega non riesce a chiudere le sue schede in tempo.",
  conflitto: "Conosco questa squadra",
  conflittoConferma:
    "Il progetto passa a un altro giudice e lei non lo vede più. Lo conferma?",
  altri: "Ho tempo, me ne dia altri",
  altriNota: `Riceve ${PROGETTI_EXTRA} progetti in più, scelti fra quelli con meno schede: non si scelgono a mano, così nessuno sceglie le squadre.`,
  altriNonAncora: `Potrà chiederne altri quando gliene resteranno al massimo ${APERTI_PER_CHIEDERE_ALTRI} da chiudere.`,
} as const;

/** Le date del percorso, in ordine, come le leggono studenti e scuole. */
export const DATE_PERCORSO = [
  { quando: SCADENZA_CONSEGNA_LABEL.replace(/^m/, "M"), cosa: "termine per consegnare il progetto. Lo consegna il capitano dall'area studenti; dopo, il modulo si chiude da solo." },
  { quando: "Dal 26 novembre", cosa: `la Commissione legge i progetti. Ognuno è letto da almeno ${GIUDICI_PER_PROGETTO_LETTERE} giudici esperti dei temi scelti dalla squadra.` },
  { quando: ANNUNCIO_FINALISTI_LABEL.replace(/^v/, "V"), cosa: `l'elenco dei ${LICEI.progettiSulPalco} progetti finalisti.` },
  { quando: LICEI.dataLabel, cosa: `l'evento finale al ${LICEI.luogo}, con le presentazioni dei finalisti dal palco.` },
] as const;
