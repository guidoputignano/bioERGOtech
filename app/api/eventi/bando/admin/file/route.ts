import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { BANDO_BUCKET } from "@/lib/eventi/bando-server";

/**
 * URL firmato per scaricare un allegato. Il bucket e privato: senza questa
 * rotta, e senza il ruolo admin, i PDF delle candidature non sono
 * raggiungibili. La firma scade dopo cinque minuti.
 */
const SCADENZA_SECONDI = 300;

export async function GET(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const path = new URL(request.url).searchParams.get("path") ?? "";

  // Solo dentro la cartella delle candidature, e niente traversal.
  if (!path.startsWith("candidature/") || path.includes("..")) {
    return NextResponse.json({ error: "Percorso non valido." }, { status: 400 });
  }

  const { data, error: signError } = await client.storage
    .from(BANDO_BUCKET)
    .createSignedUrl(path, SCADENZA_SECONDI, { download: true });

  if (signError || !data) {
    return NextResponse.json({ error: "Allegato non disponibile." }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
