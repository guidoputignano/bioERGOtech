/**
 * Il questionario di fine percorso: le domande, le date e la validazione
 * delle risposte. Le stesse per la pagina (che controlla prima di inviare),
 * per la rotta (che controlla di nuovo, e decide) e per il pannello staff
 * (che conta le risposte con le stesse etichette).
 *
 * Nessun segreto: il modulo lo importa anche il browser.
 *
 * Le risposte sono anonime: nel database stanno senza nome, senza account,
 * senza data e senza legame con l'invito (supabase/migrations/
 * 20261231500000_licei_questionario.sql). Per questo nessuna domanda chiede
 * la scuola, la classe o la squadra: con pochi studenti per istituto
 * basterebbero a riconoscere chi ha risposto.
 *
 * Gli id delle domande e i valori delle opzioni finiscono nel database:
 * non si rinominano. Una domanda nuova o tolta vuol dire una versione nuova
 * (VERSIONE_QUESTIONARIO), cosi le risposte vecchie restano leggibili.
 */

import { LICEI_PATH } from "../content";

export const VERSIONE_QUESTIONARIO = 1;

export const QUESTIONARIO_PATH = `${LICEI_PATH}/questionario`;

/** Quando parte l'email (il passo "questionario" del calendario). */
export const QUESTIONARIO_INVIO = "2026-11-30T08:00:00+01:00";
/** Il promemoria, solo a chi non ha risposto. */
export const QUESTIONARIO_PROMEMORIA = "2026-12-02T08:00:00+01:00";
/**
 * L'ultimo momento per rispondere: prima dell'annuncio dei finalisti, che
 * cambierebbe lo stato d'animo di chi risponde.
 */
export const QUESTIONARIO_CHIUDE = "2026-12-03T23:59:59+01:00";
export const QUESTIONARIO_CHIUDE_LABEL = "giovedì 3 dicembre alle 23:59";

export const questionarioAperto = (adesso: number = Date.now()): boolean => adesso <= Date.parse(QUESTIONARIO_CHIUDE);

export type RuoloQuestionario = "studente" | "docente";

export const isRuoloQuestionario = (v: unknown): v is RuoloQuestionario => v === "studente" || v === "docente";

export type Opzione = { valore: string; etichetta: string };

/** La domanda si mostra solo se un'altra ha una di queste risposte. */
export type Condizione = { domanda: string; valori: readonly string[] };

type Base = { id: string; testo: string; aiuto?: string; mostraSe?: Condizione };

export type Domanda =
  | (Base & { tipo: "scala"; min: number; max: number; estremi: readonly [string, string]; obbligatoria: boolean })
  | (Base & { tipo: "scelta"; opzioni: readonly Opzione[]; obbligatoria: boolean })
  | (Base & { tipo: "testo"; max: number; obbligatoria: false });

const SI_FORSE_NO: readonly Opzione[] = [
  { valore: "si", etichetta: "Sì" },
  { valore: "forse", etichetta: "Forse" },
  { valore: "no", etichetta: "No" },
];

const SI_NONSO_NO: readonly Opzione[] = [
  { valore: "si", etichetta: "Sì" },
  { valore: "non_so", etichetta: "Non lo so ancora" },
  { valore: "no", etichetta: "No" },
];

const DOMANDE_STUDENTI: readonly Domanda[] = [
  {
    id: "squadra",
    tipo: "scelta",
    testo: "Hai lavorato a un progetto con una squadra?",
    obbligatoria: true,
    opzioni: [
      { valore: "consegnato", etichetta: "Sì, e lo abbiamo consegnato" },
      { valore: "non_consegnato", etichetta: "Sì, ma non lo abbiamo consegnato" },
      { valore: "no", etichetta: "No, non ero in una squadra" },
    ],
  },
  {
    id: "gradimento",
    tipo: "scala",
    testo: "Nel complesso, quanto ti è piaciuto il percorso?",
    min: 1,
    max: 5,
    estremi: ["Per niente", "Moltissimo"],
    obbligatoria: true,
  },
  {
    id: "piaciuto",
    tipo: "testo",
    testo: "Che cosa ti è piaciuto di più?",
    aiuto: "Una lezione, un argomento, un momento del lavoro in squadra: quello che ti è rimasto.",
    max: 1000,
    obbligatoria: false,
  },
  {
    id: "cambieresti",
    tipo: "testo",
    testo: "Che cosa cambieresti?",
    aiuto: "Anche piccole cose: tempi, lezioni, piattaforma, progetto.",
    max: 1000,
    obbligatoria: false,
  },
  {
    id: "impegno",
    tipo: "scelta",
    testo: "Com'è stato l'impegno richiesto dal percorso?",
    obbligatoria: true,
    opzioni: [
      { valore: "poco", etichetta: "Troppo poco" },
      { valore: "giusto", etichetta: "Giusto" },
      { valore: "troppo", etichetta: "Troppo" },
    ],
  },
  {
    id: "squadra_utile",
    tipo: "scala",
    testo: "Quanto ti è stato utile lavorare in squadra al progetto?",
    min: 1,
    max: 5,
    estremi: ["Per niente", "Moltissimo"],
    obbligatoria: false,
    mostraSe: { domanda: "squadra", valori: ["consegnato", "non_consegnato"] },
  },
  {
    id: "approfondire",
    tipo: "scelta",
    testo: "Dopo il percorso, pensi di approfondire le biotecnologie o l'intelligenza artificiale?",
    obbligatoria: true,
    opzioni: SI_FORSE_NO,
  },
  {
    id: "evento",
    tipo: "scelta",
    testo: "Verrai all'evento del 10 dicembre?",
    obbligatoria: true,
    opzioni: SI_NONSO_NO,
  },
  {
    id: "aspettative",
    tipo: "testo",
    testo: "Che cosa ti aspetti dall'evento?",
    aiuto: "Chi vorresti ascoltare, che cosa ti piacerebbe vedere o scoprire.",
    max: 600,
    obbligatoria: false,
  },
  {
    id: "consiglio",
    tipo: "scala",
    testo: "Quanto consiglieresti il percorso a un amico o a un'amica?",
    min: 0,
    max: 10,
    estremi: ["Per niente", "Sicuramente"],
    obbligatoria: true,
  },
];

const DOMANDE_DOCENTI: readonly Domanda[] = [
  {
    id: "gradimento",
    tipo: "scala",
    testo: "Nel complesso, quanto è stato utile il percorso per i suoi studenti?",
    min: 1,
    max: 5,
    estremi: ["Per niente", "Moltissimo"],
    obbligatoria: true,
  },
  {
    id: "funzionato",
    tipo: "testo",
    testo: "Che cosa ha funzionato meglio?",
    max: 1000,
    obbligatoria: false,
  },
  {
    id: "migliorare",
    tipo: "testo",
    testo: "Che cosa migliorerebbe?",
    aiuto: "Contenuti, tempi, organizzazione, piattaforma, comunicazioni con le scuole.",
    max: 1000,
    obbligatoria: false,
  },
  {
    id: "riproporre",
    tipo: "scelta",
    testo: "Riproporrebbe il percorso nella sua scuola il prossimo anno?",
    obbligatoria: true,
    opzioni: SI_FORSE_NO,
  },
  {
    id: "evento",
    tipo: "scelta",
    testo: "Parteciperà all'evento di dicembre con i suoi studenti?",
    obbligatoria: true,
    opzioni: SI_NONSO_NO,
  },
  {
    id: "consiglio",
    tipo: "scala",
    testo: "Quanto consiglierebbe il percorso a un collega?",
    min: 0,
    max: 10,
    estremi: ["Per niente", "Sicuramente"],
    obbligatoria: true,
  },
];

export const DOMANDE: Record<RuoloQuestionario, readonly Domanda[]> = {
  studente: DOMANDE_STUDENTI,
  docente: DOMANDE_DOCENTI,
};

/** Il tempo che diciamo nelle email e sulla pagina. */
export const MINUTI_QUESTIONARIO: Record<RuoloQuestionario, number> = { studente: 3, docente: 2 };

/** Nelle risposte aperte, il nome di qualcuno renderebbe il questionario meno anonimo. */
export const AVVISO_TESTI: Record<RuoloQuestionario, string> = {
  studente: "Nelle risposte aperte non scrivere nomi o altri dati personali, tuoi o di altre persone.",
  docente: "Nelle risposte aperte la preghiamo di non indicare nomi di studenti o di colleghi.",
};

/** Le risposte salvate: un numero per le scale, il valore dell'opzione o il testo. */
export type Risposte = Record<string, string | number>;

/** Quello che il modulo tiene mentre si compila: tutto stringhe. */
export type Bozza = Record<string, string>;

export const domandaVisibile = (d: Domanda, valori: Record<string, unknown>): boolean =>
  !d.mostraSe || d.mostraSe.valori.includes(String(valori[d.mostraSe.domanda] ?? ""));

/** Toglie i caratteri di controllo (tranne a capo e tab) e gli spazi in più. */
export function pulisciTesto(v: string): string {
  return v
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type EsitoValidazione =
  | { ok: true; risposte: Risposte }
  | { ok: false; errori: Record<string, string> };

/**
 * Le risposte, controllate domanda per domanda. Le chiavi che non sono
 * domande si ignorano; le domande nascoste (per esempio quella sulla squadra
 * per chi non era in una squadra) non si salvano anche se arrivano.
 */
export function validaRisposte(ruolo: RuoloQuestionario, input: unknown): EsitoValidazione {
  const valori: Record<string, unknown> =
    input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const tu = ruolo === "studente";
  const risposte: Risposte = {};
  const errori: Record<string, string> = {};

  for (const d of DOMANDE[ruolo]) {
    if (!domandaVisibile(d, valori)) continue;
    const grezzo = valori[d.id];
    const vuoto = grezzo === undefined || grezzo === null || (typeof grezzo === "string" && grezzo.trim() === "");
    if (vuoto) {
      if (d.obbligatoria) errori[d.id] = tu ? "Scegli una risposta." : "Scelga una risposta.";
      continue;
    }

    if (d.tipo === "scala") {
      const n = typeof grezzo === "number" ? grezzo : typeof grezzo === "string" ? Number(grezzo) : NaN;
      if (!Number.isInteger(n) || n < d.min || n > d.max) {
        errori[d.id] = tu ? `Scegli un numero da ${d.min} a ${d.max}.` : `Scelga un numero da ${d.min} a ${d.max}.`;
        continue;
      }
      risposte[d.id] = n;
    } else if (d.tipo === "scelta") {
      if (typeof grezzo !== "string" || !d.opzioni.some((o) => o.valore === grezzo)) {
        errori[d.id] = tu ? "Scegli una delle risposte." : "Scelga una delle risposte.";
        continue;
      }
      risposte[d.id] = grezzo;
    } else {
      if (typeof grezzo !== "string") {
        errori[d.id] = "Risposta non valida.";
        continue;
      }
      const testo = pulisciTesto(grezzo);
      if (testo.length > d.max) {
        errori[d.id] = `Al massimo ${d.max} caratteri.`;
        continue;
      }
      if (testo) risposte[d.id] = testo;
    }
  }

  return Object.keys(errori).length > 0 ? { ok: false, errori } : { ok: true, risposte };
}

/** L'etichetta di una risposta chiusa, per il pannello e il CSV. */
export function etichettaRisposta(d: Domanda, valore: string | number): string {
  if (d.tipo === "scelta") return d.opzioni.find((o) => o.valore === valore)?.etichetta ?? String(valore);
  return String(valore);
}
