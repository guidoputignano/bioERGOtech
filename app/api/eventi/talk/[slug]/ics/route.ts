import { NextResponse } from "next/server";
import { generaIcs } from "@/lib/eventi/talk";
import { SITE_URL, talkPath, trovaTalk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/**
 * Il file .ics di un talk, per Apple Calendar, Outlook e qualsiasi
 * calendario che non sia Google. Pubblico: c'e solo quello che c'e gia
 * nella pagina, e mai il link della riunione, che resta agli iscritti.
 *
 * Il nome del file e l'UID sono stabili per talk: importarlo due volte
 * aggiorna lo stesso evento invece di duplicarlo.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const talk = trovaTalk(slug);
  if (!talk) return NextResponse.json({ error: "Talk non trovato." }, { status: 404 });

  const ics = generaIcs(talk, `${SITE_URL}${talkPath(talk.slug)}`);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="talk-${talk.slug}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
