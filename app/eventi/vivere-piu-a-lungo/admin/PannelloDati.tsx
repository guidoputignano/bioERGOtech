/**
 * Il pannello iscrizioni dell'evento: la lettura dal database e i conti.
 *
 * SOLO SERVER. Riceve il client con la service role già controllato dalla
 * guardia admin (requireAdmin) e non va mai importato da una scheda del
 * pannello: le schede ricevono i dati dalle rotte /api/eventi/admin/*.
 *
 * Due regole che qui non si toccano:
 * - si leggono TUTTE le iscrizioni, a pagine con .range(): Supabase ne
 *   restituisce al massimo 1000 per richiesta, e un conteggio tagliato a 1000
 *   sembrerebbe giusto e non lo sarebbe;
 * - una giornata che manca nel database non diventa mai "zero iscritti" né la
 *   capienza di content.ts: si dice che manca. Ogni errore di lettura lancia,
 *   e la rotta risponde con un errore invece che con numeri falsi.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { SELECT_ISCRIZIONE, normalizzaIscrizione } from "@/lib/eventi/evento-server";
import { CATEGORIE, SESSIONS, categoriaLabel, sessionBySlug } from "../content";
import {
  giornateValide,
  giornoRoma,
  normalizza,
  type GiornataRiga,
  type InfoGiornata,
  type RigaIscritto,
  type Riepilogo,
  type SessioneSconosciuta,
} from "./PannelloComune";

const SELECT_PANNELLO = `${SELECT_ISCRIZIONE},
  consenso_marketing, consenso_marketing_ts, startup_name, startup_url`;

/** Righe per richiesta. Se il progetto ne concede meno, il ciclo continua comunque. */
const PAGINA = 1000;
/** Un tetto di sicurezza: 200.000 iscrizioni sono ben oltre qualunque evento. */
const MAX_PAGINE = 200;

/**
 * Tutte le iscrizioni, con le giornate e la posizione in lista d'attesa.
 * Ordinate dalla più vecchia; lancia se il database non risponde.
 */
export async function leggiTuttiGliIscritti(client: SupabaseClient): Promise<RigaIscritto[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grezze: any[] = [];
  const visti = new Set<string>();
  for (let pagina = 0, da = 0; pagina < MAX_PAGINE; pagina++) {
    const { data, error } = await client
      .from("event_registrations")
      .select(SELECT_PANNELLO)
      // Ordine stabile (created_at e id): senza, le pagine possono sovrapporsi.
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) throw new Error(`event_registrations: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const id = String((r as { id: unknown }).id);
      if (visti.has(id)) continue;
      visti.add(id);
      grezze.push(r);
    }
    // Ci si ferma solo su una pagina vuota: se il progetto restituisce meno
    // di PAGINA righe per volta, una pagina corta non vuol dire "finito".
    da += data.length;
  }

  const righe: RigaIscritto[] = grezze.map((r) => {
    const base = normalizzaIscrizione(r);
    return {
      ...base,
      startup_name: r.startup_name ?? null,
      startup_url: r.startup_url ?? null,
      consenso_marketing: Boolean(r.consenso_marketing),
      consenso_marketing_ts: r.consenso_marketing_ts ?? null,
      giornate: base.giornate.map((g) => ({ ...g, posizione_attesa: null })),
    };
  });

  // La posizione in lista d'attesa, giornata per giornata: chi è entrato in
  // lista prima viene prima (la data della riga ponte, poi quella dell'iscrizione).
  const perSlug = new Map<string, { g: GiornataRiga; r: RigaIscritto }[]>();
  for (const r of righe) {
    for (const g of r.giornate) {
      if (g.status !== "lista_attesa") continue;
      const lista = perSlug.get(g.slug) ?? [];
      lista.push({ g, r });
      perSlug.set(g.slug, lista);
    }
  }
  for (const lista of perSlug.values()) {
    lista.sort(
      (a, b) =>
        (a.g.created_at ?? a.r.created_at).localeCompare(b.g.created_at ?? b.r.created_at) ||
        a.r.created_at.localeCompare(b.r.created_at) ||
        a.g.id.localeCompare(b.g.id),
    );
    lista.forEach((x, i) => {
      x.g.posizione_attesa = i + 1;
    });
  }

  return righe;
}

export type SessioneDb = { id: string; slug: string; capienza_max: number };

/** Le righe di event_sessions. Lancia se la lettura fallisce. */
export async function leggiSessioniDb(client: SupabaseClient): Promise<SessioneDb[]> {
  const { data, error } = await client.from("event_sessions").select("id, slug, capienza_max");
  if (error) throw new Error(`event_sessions: ${error.message}`);
  return ((data ?? []) as { id: unknown; slug: unknown; capienza_max: unknown }[]).map((s) => ({
    id: String(s.id),
    slug: String(s.slug),
    capienza_max: Number(s.capienza_max),
  }));
}

/** I numeri di ogni giornata del sito, dai dati appena letti. */
export function infoGiornate(iscritti: readonly RigaIscritto[], sessioni: readonly SessioneDb[]): InfoGiornata[] {
  return SESSIONS.map((s) => {
    const db = sessioni.find((x) => x.slug === s.slug);
    let confermati = 0;
    let attesa = 0;
    let entrati = 0;
    let assenti = 0;
    for (const r of iscritti) {
      for (const g of r.giornate) {
        if (g.slug !== s.slug) continue;
        if (g.status === "confermato") confermati++;
        else attesa++;
        if (g.stato_checkin === "presente") entrati++;
        else if (g.stato_checkin === "assente") assenti++;
      }
    }
    const capienza = db && Number.isFinite(db.capienza_max) ? db.capienza_max : null;
    return {
      slug: s.slug,
      etichetta: s.etichetta,
      giornoLabel: s.giornoLabel,
      luogo: s.luogo,
      orario: s.orario,
      nelDatabase: Boolean(db),
      capienza,
      confermati,
      attesa,
      entrati,
      assenti,
      liberi: capienza === null ? null : Math.max(capienza - confermati, 0),
      oltre: capienza === null ? 0 : Math.max(confermati - capienza, 0),
    };
  });
}

/** Le sessioni del database che il sito non usa più, se qualcuno ci è ancora collegato. */
export function sessioniSconosciute(iscritti: readonly RigaIscritto[]): SessioneSconosciuta[] {
  const conta = new Map<string, number>();
  for (const r of iscritti) {
    for (const slug of new Set(r.giornate.map((g) => g.slug))) {
      if (sessionBySlug(slug)) continue;
      conta.set(slug || "(senza nome)", (conta.get(slug || "(senza nome)") ?? 0) + 1);
    }
  }
  return [...conta.entries()].map(([slug, persone]) => ({ slug, persone })).sort((a, b) => b.persone - a.persone);
}

export type DatiPannello = {
  iscritti: RigaIscritto[];
  sessioni: SessioneDb[];
  giornate: InfoGiornata[];
  mancanti: string[];
};

/** Iscritti e giornate in una volta sola. Lancia se una delle due letture fallisce. */
export async function caricaDatiPannello(client: SupabaseClient): Promise<DatiPannello> {
  const [iscritti, sessioni] = await Promise.all([leggiTuttiGliIscritti(client), leggiSessioniDb(client)]);
  const presenti = new Set(sessioni.map((s) => s.slug));
  return {
    iscritti,
    sessioni,
    giornate: infoGiornate(iscritti, sessioni),
    mancanti: SESSIONS.map((s) => s.slug as string).filter((slug) => !presenti.has(slug)),
  };
}

/* ── Il riepilogo ─────────────────────────────────────────────────────── */

const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** I giorni di calendario (fuso di Roma) dagli ultimi `n`, fino a oggi compreso. */
function ultimiGiorni(adesso: Date, n: number): { giorno: string; etichetta: string }[] {
  const oggi = giornoRoma(adesso);
  const [a, m, g] = oggi.split("-").map(Number);
  const base = Date.UTC(a, m - 1, g);
  const out: { giorno: string; etichetta: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base - i * 86_400_000);
    const giorno = d.toISOString().slice(0, 10);
    out.push({ giorno, etichetta: `${d.getUTCDate()} ${MESI_BREVI[d.getUTCMonth()]}` });
  }
  return out;
}

/** Quante lettere maiuscole: a parità di frequenza vince "Liceo Aristosseno" su "liceo aristosseno". */
const maiuscole = (v: string) => (v.match(/\p{Lu}/gu) ?? []).length;

/** Tutti i conti del riepilogo, fatti sul server sui dati completi. */
export function calcolaRiepilogo(dati: DatiPannello, adesso: Date = new Date()): Riepilogo {
  const { iscritti, giornate, mancanti } = dati;

  // ── Totali ──
  let entrambe = 0;
  let senzaGiornata = 0;
  let marketing = 0;
  for (const r of iscritti) {
    const valide = new Set(giornateValide(r).map((g) => g.slug));
    if (valide.size === 0) senzaGiornata++;
    if (SESSIONS.length > 1 && SESSIONS.every((s) => valide.has(s.slug))) entrambe++;
    if (r.consenso_marketing) marketing++;
  }

  // ── Nuove iscrizioni per giorno (Roma) ──
  const perGiorno = new Map<string, number>();
  for (const r of iscritti) {
    const g = giornoRoma(r.created_at);
    if (g) perGiorno.set(g, (perGiorno.get(g) ?? 0) + 1);
  }
  const serie = ultimiGiorni(adesso, 21).map((d) => ({ ...d, n: perGiorno.get(d.giorno) ?? 0 }));
  const oggi = serie[serie.length - 1]?.n ?? 0;
  const settimana = serie.slice(-7).reduce((t, d) => t + d.n, 0);

  // ── Giornata per categoria ──
  const valoriCategorie: string[] = CATEGORIE.map((c) => c.value);
  for (const r of iscritti) if (!valoriCategorie.includes(r.categoria)) valoriCategorie.push(r.categoria);
  const categorie = valoriCategorie.map((value) => {
    const perGiornata: Record<string, { totale: number; attesa: number }> = {};
    for (const s of SESSIONS) perGiornata[s.slug] = { totale: 0, attesa: 0 };
    let persone = 0;
    for (const r of iscritti) {
      if (r.categoria !== value) continue;
      persone++;
      for (const g of r.giornate) {
        const cella = perGiornata[g.slug];
        if (!cella) continue;
        cella.totale++;
        if (g.status === "lista_attesa") cella.attesa++;
      }
    }
    return { value, label: categoriaLabel(value) || "Non indicata", persone, perGiornata };
  });

  // ── Organizzazioni e scuole: stesso nome a meno di maiuscole e spazi ──
  const organizzazioniMap = new Map<
    string,
    { varianti: Map<string, number>; persone: number; perGiornata: Record<string, number> }
  >();
  for (const r of iscritti) {
    const grezzo = (r.organizzazione ?? "").replace(/\s+/g, " ").trim();
    if (!grezzo) continue;
    const chiave = normalizza(grezzo);
    const voce = organizzazioniMap.get(chiave) ?? {
      varianti: new Map<string, number>(),
      persone: 0,
      perGiornata: {} as Record<string, number>,
    };
    voce.persone++;
    voce.varianti.set(grezzo, (voce.varianti.get(grezzo) ?? 0) + 1);
    for (const g of giornateValide(r)) voce.perGiornata[g.slug] = (voce.perGiornata[g.slug] ?? 0) + 1;
    organizzazioniMap.set(chiave, voce);
  }
  const organizzazioni = [...organizzazioniMap.values()]
    .map((v) => ({
      // Il nome scritto più spesso, così "liceo aristosseno" diventa "Liceo Aristosseno".
      nome: [...v.varianti.entries()].sort(
        (a, b) => b[1] - a[1] || maiuscole(b[0]) - maiuscole(a[0]) || a[0].localeCompare(b[0], "it"),
      )[0][0],
      persone: v.persone,
      perGiornata: v.perGiornata,
    }))
    .sort((a, b) => b.persone - a.persone || a.nome.localeCompare(b.nome, "it"));

  return {
    generato_at: adesso.toISOString(),
    mancanti,
    sconosciute: sessioniSconosciute(iscritti),
    senzaGiornata,
    giornate,
    totali: { persone: iscritti.length, entrambe, marketing },
    nuove: { oggi, settimana, serie },
    categorie,
    organizzazioni: organizzazioni.slice(0, 15),
    organizzazioniDiverse: organizzazioni.length,
  };
}
