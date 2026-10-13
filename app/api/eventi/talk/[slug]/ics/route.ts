import { NextResponse } from "next/server";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import { generaIcs } from "@/lib/eventi/talk";
import { linkPerIscritto, linkSicuro, talkAdminClient } from "@/lib/eventi/talk-server";
import { SITE_URL, talkPath, trovaTalk, type Talk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/**
 * Il file .ics di un talk, per Apple Calendar, Outlook e qualsiasi
 * calendario che non sia Google.
 *
 * Due versioni, con lo stesso UID:
 *  - per chi ha fatto l'accesso, e iscritto ed e ancora idoneo (gli stessi
 *    controlli della rotta dell'iscrizione, in `linkPerIscritto`), il link
 *    della riunione in LOCATION e in DESCRIPTION. Mai in cache:
 *    `no-store, private`;
 *  - per tutti gli altri, e per qualsiasi errore nel controllo, il file
 *    pubblico di sempre: solo quello che c'e gia nella pagina, senza link.
 *
 * Tutte e due dipendono dalla sessione, quindi nessuna cache condivisa
 * (`private`, `Vary: Cookie`) e nessuna copia vecchia nel browser
 * (`no-cache`): chi scarica il file subito dopo l'iscrizione deve trovarci
 * il link, non la versione presa prima.
 *
 * Il nome del file e l'UID sono stabili per talk: importarlo due volte
 * aggiorna lo stesso evento invece di duplicarlo.
 */

/** Il link per chi chiama, o null. Un errore non blocca il file: esce quello pubblico. */
async function linkDelChiamante(talk: Talk): Promise<string | null> {
  // Finche il link non c'e, il file e quello pubblico: nessuna sessione da leggere.
  if (!linkSicuro(talk.link)) return null;
  try {
    const db = talkAdminClient();
    if (!db) return null;
    return await linkPerIscritto(db, talk, await utenteCorrente());
  } catch (err) {
    console.error("Talk ics error:", err);
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const talk = trovaTalk(slug);
  if (!talk) return NextResponse.json({ error: "Talk non trovato." }, { status: 404 });

  const link = await linkDelChiamante(talk);
  const ics = generaIcs(talk, `${SITE_URL}${talkPath(talk.slug)}`, new Date(), link);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="talk-${talk.slug}.ics"`,
      "Cache-Control": link ? "no-store, private" : "private, no-cache",
      Vary: "Cookie",
    },
  });
}
