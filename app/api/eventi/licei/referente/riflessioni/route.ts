import { NextResponse } from "next/server";
import { requireReferente } from "@/lib/eventi/licei-server";
import { COURSE_LESSONS } from "@/app/courses/course-data";
import { riflessioniAlReferenteDal } from "@/app/eventi/vivere-piu-a-lungo/licei/riflessioni-referente";

/**
 * Le consegne delle lezioni di uno studente del proprio istituto.
 *
 * Una rotta a parte e non un campo in piu nella GET del referente: i testi si
 * chiedono uno studente alla volta, quando il docente apre la sua riga. Cosi
 * l'elenco resta leggero e i testi di un minorenne viaggiano solo quando
 * qualcuno li vuole leggere davvero.
 *
 * Tre condizioni, tutte qui e non nella console:
 * - la funzione e accesa (`RIFLESSIONI_AL_REFERENTE_DAL`), altrimenti 404;
 * - l'iscrizione e dell'istituto del referente ed e confermata;
 * - escono solo le consegne salvate da quella data in poi.
 */
export async function GET(request: Request) {
  const dal = riflessioniAlReferenteDal();
  if (!dal) return NextResponse.json({ error: "Funzione non attiva." }, { status: 404 });

  const guard = await requireReferente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const id = new URL(request.url).searchParams.get("iscrizione");
  if (!id) return NextResponse.json({ error: "Iscrizione non indicata." }, { status: 400 });

  // Il filtro su adesione_id e la vera guardia, come nelle altre rotte del
  // referente: il client ha la service role key e RLS non lo ferma.
  const { data: iscrizione } = await client
    .from("licei_iscrizioni")
    .select("id, user_id, stato")
    .eq("id", id)
    .eq("adesione_id", ctx.adesione.id)
    .maybeSingle();

  if (!iscrizione || iscrizione.stato !== "confermata") {
    return NextResponse.json(
      { error: "Studente non trovato fra i confermati del tuo istituto." },
      { status: 404 },
    );
  }
  if (!iscrizione.user_id) return NextResponse.json({ consegne: [] });

  const { data, error } = await client
    .from("lesson_submissions")
    .select("lesson_slug, lesson_title, reflection, question, comment, updated_at")
    .eq("user_id", iscrizione.user_id)
    .gte("updated_at", dal.toISOString());

  if (error) {
    console.error("Licei riflessioni referente: lettura fallita:", error.message);
    return NextResponse.json({ error: "Non è stato possibile leggere le consegne." }, { status: 500 });
  }

  // Nell'ordine del corso e non in quello di consegna: il docente le legge
  // come le ha scritte lo studente, una lezione dopo l'altra.
  const ordine = new Map(COURSE_LESSONS.map((l, i) => [l.slug, i]));
  const numero = new Map(COURSE_LESSONS.map((l) => [l.slug, l.number]));
  const consegne = [...(data ?? [])]
    .sort(
      (a, b) =>
        (ordine.get(a.lesson_slug) ?? Number.MAX_SAFE_INTEGER) -
        (ordine.get(b.lesson_slug) ?? Number.MAX_SAFE_INTEGER),
    )
    .map((r) => ({
      lezione: numero.get(r.lesson_slug) ?? "",
      titolo: r.lesson_title as string,
      riflessione: (r.reflection as string | null) ?? null,
      domanda: (r.question as string | null) ?? null,
      commento: (r.comment as string | null) ?? null,
      salvata_il: r.updated_at as string,
    }));

  return NextResponse.json({ consegne });
}
