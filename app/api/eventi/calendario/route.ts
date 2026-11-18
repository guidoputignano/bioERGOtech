import { NextResponse } from "next/server";
import { SESSIONS } from "@/app/eventi/vivere-piu-a-lungo/content";
import { icsEvento } from "@/lib/eventi/calendario";

/**
 * Il file .ics delle giornate dell'evento, per "Aggiungi al calendario" nel
 * modulo, nel biglietto e nelle email.
 *
 * GET /api/eventi/calendario?giorni=giorno-1,giorno-2&codice=VPL-XXXXXXXX
 *
 * Non legge il database: il codice finisce solo nel link al biglietto
 * dentro l'evento del calendario, quindi un codice inventato non rivela
 * niente. Senza giorni validi, tutte e due le giornate.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validi = SESSIONS.map((s) => s.slug as string);
  const richiesti = (searchParams.get("giorni") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter((g) => validi.includes(g));
  const giorni = richiesti.length > 0 ? richiesti : validi;
  const codice = (searchParams.get("codice") ?? "").replace(/[^A-Z0-9-]/gi, "").slice(0, 32) || undefined;

  const ics = icsEvento(giorni, codice);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="vivere-piu-a-lungo.ics"`,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
