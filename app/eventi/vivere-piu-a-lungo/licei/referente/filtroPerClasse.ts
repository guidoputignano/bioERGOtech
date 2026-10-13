/**
 * Il filtro per classe della console dei docenti.
 *
 * Un filtro e non un confine: ogni docente vede tutto il proprio istituto,
 * e "Tutte le classi dell'istituto" c'e sempre. Le classi seguite servono
 * solo a partire da quelle. La classe la scrive lo studente a testo libero,
 * quindi il confronto passa da `normalizzaClasse` ("4^ a" e "IV A" sono
 * "4A"); a schermo resta quello che ha scritto lui.
 *
 * Senza React e senza rete: la console tiene lo stato, e ogni sezione che
 * filtra (elenco, quadro delle squadre, riflessioni) riceve un
 * `FiltroClassi` e chiede `corrispondeClasse(filtro, classe)`.
 */

import { normalizzaClasse } from "@/lib/eventi/licei-iscrizioni";

/** Il valore della select per "tutte le classi". */
export const TUTTE_LE_CLASSI = "";
/** Il valore della select per "le classi che seguo". */
export const LE_MIE_CLASSI = "__mie__";

export type OpzioneClasse = {
  /** La classe normalizzata: e il valore della select. */
  valore: string;
  /** Come la si mostra: la forma piu frequente fra quelle scritte. */
  etichetta: string;
  /** Quanti studenti ci sono, in quella classe. */
  n: number;
};

/** Il filtro in uso, nella forma che le sezioni della console ricevono. */
export type FiltroClassi = {
  /** Il valore della select. */
  valore: string;
  /** Detto a parole, per le righe che ricordano a cosa si riferiscono i numeri. */
  etichetta: string;
  /** Le classi normalizzate ammesse, oppure null per tutto l'istituto. */
  chiavi: ReadonlySet<string> | null;
};

/** Il filtro che lascia passare tutto. */
export const FILTRO_TUTTE: FiltroClassi = {
  valore: TUTTE_LE_CLASSI,
  etichetta: "Tutte le classi dell'istituto",
  chiavi: null,
};

/**
 * Le classi presenti, una per classe normalizzata, in ordine di classe. Per
 * etichetta la scrittura piu frequente: se in 4A tre scrivono "4A" e uno
 * "4^a", la select dice "4A". A parita vince la forma piu pulita, quella
 * che coincide con la classe normalizzata, poi la piu corta.
 */
export function opzioniClassi(classi: (string | null | undefined)[]): OpzioneClasse[] {
  const perChiave = new Map<string, { n: number; forme: Map<string, number> }>();
  for (const grezza of classi) {
    const chiave = normalizzaClasse(grezza);
    if (!chiave) continue;
    const voce = perChiave.get(chiave) ?? { n: 0, forme: new Map() };
    voce.n += 1;
    const forma = String(grezza).trim();
    voce.forme.set(forma, (voce.forme.get(forma) ?? 0) + 1);
    perChiave.set(chiave, voce);
  }
  return [...perChiave.entries()]
    .map(([valore, v]) => ({
      valore,
      etichetta: [...v.forme.entries()].sort(
        (a, b) =>
          b[1] - a[1] ||
          Number(b[0].toUpperCase() === valore) - Number(a[0].toUpperCase() === valore) ||
          a[0].length - b[0].length ||
          a[0].localeCompare(b[0]),
      )[0][0],
      n: v.n,
    }))
    .sort((a, b) => a.valore.localeCompare(b.valore, "it", { numeric: true }));
}

/**
 * Da quale filtro parte la console: le classi del docente se ne ha, tutto
 * l'istituto altrimenti. Il referente principale non ha classi sue e parte
 * sempre da tutto.
 */
export function filtroIniziale(classiDocente: string[]): string {
  return classiDocente.some((c) => normalizzaClasse(c)) ? LE_MIE_CLASSI : TUTTE_LE_CLASSI;
}

/**
 * Il valore della select, tradotto nel filtro che le sezioni usano. Le
 * opzioni servono solo a dire la classe come la si legge nella select.
 */
export function costruisciFiltro(
  valore: string,
  classiDocente: string[],
  opzioni: OpzioneClasse[] = [],
): FiltroClassi {
  if (valore === LE_MIE_CLASSI) {
    const chiavi = new Set(classiDocente.map((c) => normalizzaClasse(c)).filter(Boolean));
    if (chiavi.size === 0) return FILTRO_TUTTE;
    return { valore, etichetta: `Le mie classi (${classiDocente.join(", ")})`, chiavi };
  }
  const chiave = normalizzaClasse(valore);
  if (!chiave) return FILTRO_TUTTE;
  const etichetta = opzioni.find((o) => o.valore === chiave)?.etichetta ?? valore;
  return { valore: chiave, etichetta: `Classe ${etichetta}`, chiavi: new Set([chiave]) };
}

/** La classe di uno studente passa il filtro? */
export function corrispondeClasse(filtro: FiltroClassi, classe: string | null | undefined): boolean {
  return filtro.chiavi === null || filtro.chiavi.has(normalizzaClasse(classe));
}
