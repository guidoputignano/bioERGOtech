import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { RUOLI_TALK, TABELLA_TALK, type RuoloTalk } from "@/lib/eventi/talk-server";
import { TALKS, occhielloTalk, talkConcluso } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/**
 * I numeri dei talk per il pannello staff: quanti iscritti, per ruolo. Solo
 * numeri: l'elenco nominativo e nell'export CSV, che passa dalla stessa
 * guardia.
 *
 * Prima della migrazione 20261216000000 risponde `disponibile: false`, e il
 * pannello dice che cosa manca invece di mostrare zero iscritti.
 */

export type TalkStaffRiga = {
  slug: string;
  occhiello: string;
  titolo: string;
  relatore: string;
  dataLabel: string;
  orarioLabel: string;
  concluso: boolean;
  totale: number;
  per_ruolo: Record<RuoloTalk, number>;
};

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  // Tutte le righe, a pagine: PostgREST tronca oltre un tetto, e un conteggio
  // sbagliato per difetto qui passerebbe inosservato.
  const righe: { talk_slug: string; ruolo: string }[] = [];
  const PAGINA = 1000;
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from(TABELLA_TALK)
      .select("talk_slug, ruolo")
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) {
      if (erroreSchemaMancante(error, "tabella")) {
        return NextResponse.json({ disponibile: false, talks: [], altri: [] });
      }
      console.error("Talk admin: lettura fallita:", error);
      return NextResponse.json({ error: "Lettura delle iscrizioni non riuscita." }, { status: 500 });
    }
    righe.push(...((data ?? []) as { talk_slug: string; ruolo: string }[]));
    if (!data || data.length < PAGINA) break;
  }

  const vuoto = (): Record<RuoloTalk, number> =>
    Object.fromEntries(RUOLI_TALK.map((r) => [r, 0])) as Record<RuoloTalk, number>;

  const talks: TalkStaffRiga[] = TALKS.map((t) => {
    const mie = righe.filter((r) => r.talk_slug === t.slug);
    const per_ruolo = vuoto();
    for (const r of mie) {
      if ((RUOLI_TALK as readonly string[]).includes(r.ruolo)) per_ruolo[r.ruolo as RuoloTalk] += 1;
    }
    return {
      slug: t.slug,
      occhiello: occhielloTalk(t),
      titolo: t.titolo,
      relatore: t.relatore.nome,
      dataLabel: t.dataLabel,
      orarioLabel: t.orarioLabel,
      concluso: talkConcluso(t),
      totale: mie.length,
      per_ruolo,
    };
  });

  // Righe di un talk tolto da `TALKS`: non spariscono dal conto in silenzio.
  const noti = new Set(TALKS.map((t) => t.slug));
  const altri = new Map<string, number>();
  for (const r of righe) if (!noti.has(r.talk_slug)) altri.set(r.talk_slug, (altri.get(r.talk_slug) ?? 0) + 1);

  return NextResponse.json(
    {
      disponibile: true,
      talks,
      altri: [...altri.entries()].map(([slug, totale]) => ({ slug, totale })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
