import { NextResponse } from "next/server";
import { liceiAdminClient } from "@/lib/eventi/licei-server";
import { accettaInvito, statoInvito } from "@/lib/eventi/licei-mentor-giudici";

/**
 * Il mentor che risponde all'invito a fare il giudice. Nessun accesso: vale
 * il link firmato dell'email (`?t=`), che identifica un solo mentor
 * approvato. GET dice a che punto e, POST conferma. Mai in cache.
 */

const NO_CACHE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const db = liceiAdminClient();
  if (!db) return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500, headers: NO_CACHE });
  try {
    const t = new URL(request.url).searchParams.get("t");
    return NextResponse.json(await statoInvito(db, t), { headers: NO_CACHE });
  } catch (err) {
    console.error("Licei invito mentor GET error:", err);
    return NextResponse.json({ error: "Non è stato possibile leggere l'invito. Riprovi fra poco." }, { status: 500, headers: NO_CACHE });
  }
}

export async function POST(request: Request) {
  const db = liceiAdminClient();
  if (!db) return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500, headers: NO_CACHE });
  try {
    const body = (await request.json().catch(() => ({}))) as { t?: string };
    const r = await accettaInvito(db, body.t);
    if (r.stato === "errore") {
      return NextResponse.json({ error: "Non è stato possibile completare l'adesione. Ci scriva a info@bioergotech.org." }, { status: 500, headers: NO_CACHE });
    }
    return NextResponse.json(r, { headers: NO_CACHE });
  } catch (err) {
    console.error("Licei invito mentor POST error:", err);
    return NextResponse.json({ error: "Non è stato possibile completare l'adesione. Riprovi fra poco." }, { status: 500, headers: NO_CACHE });
  }
}
