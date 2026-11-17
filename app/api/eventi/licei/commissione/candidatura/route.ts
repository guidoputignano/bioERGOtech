import { NextResponse } from "next/server";
import { liceiAdminClient } from "@/lib/eventi/licei-server";
import { candidatureAperte, codiceValido, inviaCandidatura } from "@/lib/eventi/licei-candidature-giudici";

/**
 * La candidatura a giudice dal link di invito (`?c=`): GET dice se il link
 * vale, POST registra la candidatura, che lo staff approva o rifiuta.
 * Nessun accesso richiesto: vale il codice del link. Mai in cache.
 */

const NO_CACHE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const db = liceiAdminClient();
  if (!db) return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500, headers: NO_CACHE });
  const c = new URL(request.url).searchParams.get("c");
  return NextResponse.json({ valido: await codiceValido(db, c), aperto: candidatureAperte() }, { headers: NO_CACHE });
}

export async function POST(request: Request) {
  const db = liceiAdminClient();
  if (!db) return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500, headers: NO_CACHE });
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const r = await inviaCandidatura(db, {
      codice: typeof body.codice === "string" ? body.codice : "",
      nome: body.nome as string,
      cognome: body.cognome as string,
      email: body.email as string,
      ruolo: body.ruolo as string,
      organizzazione: body.organizzazione as string,
    });
    if (r.stato === "errore") return NextResponse.json({ error: r.errore }, { status: r.status, headers: NO_CACHE });
    return NextResponse.json(r, { headers: NO_CACHE });
  } catch (err) {
    console.error("Licei candidatura giudice error:", err);
    return NextResponse.json({ error: "Non è stato possibile registrare la candidatura. Riprovi fra poco." }, { status: 500, headers: NO_CACHE });
  }
}
