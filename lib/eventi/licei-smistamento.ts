/**
 * La regola dello smistamento dei progetti alla Commissione dei licei.
 *
 * Funzioni pure, senza database: ricevono progetti, giudici e assegnazioni
 * gia letti, e dicono quali righe aggiungere. Le chiamano il cron
 * (smistamento del 26 novembre, ridistribuzione, copertura con la
 * riserva), l'area dei giudici ("Conosco questa squadra", "me ne dia
 * altri") e i test.
 *
 * La regola, nell'ordine in cui pesa:
 *  1. mai due volte lo stesso giudice sullo stesso progetto, e mai un
 *     giudice che ha gia avuto quel progetto (tolto o in conflitto);
 *  2. carichi uguali: nessuno supera la media arrotondata per eccesso piu
 *     uno, finche c'e qualcun altro;
 *  3. i temi in comune fra progetto e giudice;
 *  4. sullo stesso progetto, ruoli diversi (un esperto di ricerca e uno
 *     d'impresa leggono cose diverse);
 *  5. a parita, un ordine fisso ma sparso (un hash della coppia), cosi lo
 *     stesso input da sempre lo stesso risultato senza favorire nessuno.
 */

export type ProgettoSmistamento = {
  id: string;
  temi: string[] | null;
};

export type GiudiceSmistamento = {
  id: string;
  temi: string[];
  ruolo: string | null;
};

/** Una riga di `licei_assegnazioni`, gia letta. */
export type AssegnazioneLetta = {
  progetto_id: string;
  commissario_id: string;
  conflitto: boolean;
  rimossa_at: string | null;
};

export type NuovaAssegnazione = { progetto_id: string; commissario_id: string };

/** Un'assegnazione conta (il giudice ci lavora) se non e in conflitto e non e stata tolta. */
export const assegnazioneAttiva = (a: Pick<AssegnazioneLetta, "conflitto" | "rimossa_at">): boolean =>
  !a.conflitto && !a.rimossa_at;

/** FNV-1a a 32 bit: l'ordine fisso ma sparso delle parita. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

const temiInComune = (a: readonly string[] | null, b: readonly string[]): number =>
  (a ?? []).filter((t) => b.includes(t)).length;

/**
 * Quanto pesa ogni criterio. Un tema in comune vale poco piu di un progetto
 * di carico: sposta un progetto verso chi conosce il tema, ma il tetto (la
 * media piu uno) impedisce che i giudici con i temi piu richiesti si
 * ritrovino con il doppio del lavoro.
 */
const PESO_CARICO = 5;
const PESO_TEMA = 6;
const PESO_RUOLO = 1;

/**
 * Le assegnazioni da aggiungere perche ogni progetto riceva i giudici che
 * gli mancano.
 *
 * `bisogno`: quanti giudici NUOVI servono a ogni progetto (quelli che non
 * compaiono non ne hanno bisogno). `giudici`: chi puo riceverli, gia
 * filtrato dal chiamante (attivi con diritto di voto, oppure la sola
 * riserva). `esistenti`: tutte le righe di `licei_assegnazioni`, anche
 * tolte o in conflitto, perche nessuna coppia si ripeta e perche il carico
 * di partenza sia quello vero.
 *
 * Se per un progetto non c'e nessun giudice libero, resta scoperto: il
 * chiamante lo vede confrontando il risultato con il bisogno.
 */
export function pianoAssegnazioni(
  progetti: ProgettoSmistamento[],
  giudici: GiudiceSmistamento[],
  esistenti: AssegnazioneLetta[],
  bisogno: Map<string, number>,
  /** Il tetto rigido per giudice: chi ci e arrivato non riceve altro. */
  tettoRigido: number = Infinity,
): NuovaAssegnazione[] {
  if (giudici.length === 0) return [];

  const coppie = new Set(esistenti.map((a) => `${a.progetto_id}:${a.commissario_id}`));
  const carico = new Map<string, number>(giudici.map((g) => [g.id, 0]));
  for (const a of esistenti) {
    if (assegnazioneAttiva(a) && carico.has(a.commissario_id)) {
      carico.set(a.commissario_id, (carico.get(a.commissario_id) ?? 0) + 1);
    }
  }
  const ruoliSul = new Map<string, string[]>();
  const ruoloDi = new Map(giudici.map((g) => [g.id, g.ruolo ?? ""]));
  for (const a of esistenti) {
    if (!assegnazioneAttiva(a)) continue;
    const r = ruoloDi.get(a.commissario_id);
    if (r !== undefined) ruoliSul.set(a.progetto_id, [...(ruoliSul.get(a.progetto_id) ?? []), r]);
  }

  const daCoprire = progetti.filter((p) => (bisogno.get(p.id) ?? 0) > 0);
  const slotTotali = daCoprire.reduce((s, p) => s + (bisogno.get(p.id) ?? 0), 0);
  const caricoIniziale = [...carico.values()].reduce((s, n) => s + n, 0);
  // Il tetto: la media arrotondata per eccesso, piu uno di margine per i temi.
  const tetto = Math.ceil((caricoIniziale + slotTotali) / giudici.length) + 1;

  const liberiPer = (p: ProgettoSmistamento) =>
    giudici.filter((g) => !coppie.has(`${p.id}:${g.id}`) && (carico.get(g.id) ?? 0) < tettoRigido);

  // Prima i progetti con meno giudici possibili e con meno giudici del loro
  // tema: sono quelli che restano scoperti se arrivano per ultimi.
  const ordine = [...daCoprire].sort((a, b) => {
    const la = liberiPer(a);
    const lb = liberiPer(b);
    if (la.length !== lb.length) return la.length - lb.length;
    const ta = la.filter((g) => temiInComune(a.temi, g.temi) > 0).length;
    const tb = lb.filter((g) => temiInComune(b.temi, g.temi) > 0).length;
    if (ta !== tb) return ta - tb;
    return hash(a.id) - hash(b.id);
  });

  const nuove: NuovaAssegnazione[] = [];
  for (const p of ordine) {
    for (let k = 0; k < (bisogno.get(p.id) ?? 0); k++) {
      const candidati = liberiPer(p);
      if (candidati.length === 0) break;
      const sottoTetto = candidati.filter((g) => (carico.get(g.id) ?? 0) < tetto);
      const pool = sottoTetto.length > 0 ? sottoTetto : candidati;
      const ruoli = ruoliSul.get(p.id) ?? [];

      let migliore: GiudiceSmistamento | null = null;
      let punteggioMigliore = Infinity;
      for (const g of pool) {
        const punteggio =
          (carico.get(g.id) ?? 0) * PESO_CARICO -
          temiInComune(p.temi, g.temi) * PESO_TEMA -
          (ruoli.length > 0 && !ruoli.includes(g.ruolo ?? "") ? PESO_RUOLO : 0) +
          hash(`${p.id}:${g.id}`) * 0.5;
        if (punteggio < punteggioMigliore) {
          punteggioMigliore = punteggio;
          migliore = g;
        }
      }
      if (!migliore) break;

      nuove.push({ progetto_id: p.id, commissario_id: migliore.id });
      coppie.add(`${p.id}:${migliore.id}`);
      carico.set(migliore.id, (carico.get(migliore.id) ?? 0) + 1);
      ruoliSul.set(p.id, [...ruoli, migliore.ruolo ?? ""]);
    }
  }
  return nuove;
}

/** Quante assegnazioni attive ha ogni progetto, fra i giudici indicati. */
export function attivePerProgetto(
  esistenti: AssegnazioneLetta[],
  giudiciValidi: ReadonlySet<string>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of esistenti) {
    if (assegnazioneAttiva(a) && giudiciValidi.has(a.commissario_id)) {
      m.set(a.progetto_id, (m.get(a.progetto_id) ?? 0) + 1);
    }
  }
  return m;
}

/**
 * Il bisogno dello smistamento: a ogni progetto mancano i giudici attivi
 * fino a `perProgetto`.
 */
export function bisognoSmistamento(
  progetti: ProgettoSmistamento[],
  esistenti: AssegnazioneLetta[],
  giudiciValidi: ReadonlySet<string>,
  perProgetto: number,
): Map<string, number> {
  const attive = attivePerProgetto(esistenti, giudiciValidi);
  const m = new Map<string, number>();
  for (const p of progetti) {
    const manca = perProgetto - (attive.get(p.id) ?? 0);
    if (manca > 0) m.set(p.id, manca);
  }
  return m;
}

/**
 * I progetti in piu per chi preme "me ne dia altri": fra quelli che non ha
 * mai avuto, prima quelli con meno giudici attivi e meno schede chiuse,
 * poi quelli del suo tema. Non li sceglie lui: cosi nessuno sceglie le
 * squadre.
 */
export function progettiExtra(
  progetti: ProgettoSmistamento[],
  giudice: GiudiceSmistamento,
  esistenti: AssegnazioneLetta[],
  schedeChiuse: Map<string, number>,
  quanti: number,
  /** Un progetto non si legge piu di tante volte: solo quelli sotto. */
  maxLetture: number = Infinity,
): string[] {
  const giaAvuti = new Set(esistenti.filter((a) => a.commissario_id === giudice.id).map((a) => a.progetto_id));
  const attive = new Map<string, number>();
  for (const a of esistenti) {
    if (assegnazioneAttiva(a)) attive.set(a.progetto_id, (attive.get(a.progetto_id) ?? 0) + 1);
  }
  return progetti
    .filter((p) => !giaAvuti.has(p.id) && (attive.get(p.id) ?? 0) < maxLetture)
    .sort(
      (a, b) =>
        (attive.get(a.id) ?? 0) - (attive.get(b.id) ?? 0) ||
        (schedeChiuse.get(a.id) ?? 0) - (schedeChiuse.get(b.id) ?? 0) ||
        temiInComune(b.temi, giudice.temi) - temiInComune(a.temi, giudice.temi) ||
        hash(`${a.id}:${giudice.id}`) - hash(`${b.id}:${giudice.id}`),
    )
    .slice(0, quanti)
    .map((p) => p.id);
}
