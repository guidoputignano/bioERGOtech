import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { EDIZIONE_NOTIZIE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { BUCKET_IMMAGINI_NOTIZIE } from "@/lib/social";

/** Il tetto del bucket (migrazione 20261222000000): il pannello carica JPEG da 600 px, ben sotto. */
const MAX_BYTES = 1024 * 1024;

/**
 * Un URL firmato per caricare l'immagine di un post di Instagram nelle
 * notizie agli studenti. Solo staff. Il percorso lo decide la rotta, il
 * formato e uno solo (JPEG, gia ridotto dal pannello), e il bucket stesso
 * rifiuta altri tipi e file oltre 1 MB. Restituisce anche l'URL pubblico,
 * che il pannello mette nel post.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const body = (await request.json().catch(() => ({}))) as { tipo?: unknown; size?: unknown };
  if (body.tipo !== "image/jpeg") {
    return NextResponse.json({ error: "Formato non valido." }, { status: 400 });
  }
  const size = Number(body.size);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return NextResponse.json({ error: "L'immagine supera 1 MB anche ridotta. Prova con un'altra." }, { status: 400 });
  }

  const seme = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `notizie/${EDIZIONE_NOTIZIE}/${seme}.jpg`;

  const { data, error } = await client.storage.from(BUCKET_IMMAGINI_NOTIZIE).createSignedUploadUrl(path);
  if (error || !data) {
    const manca = /not found|does not exist/i.test(error?.message ?? "");
    console.error("Licei notizie: URL di caricamento non creato:", error?.message);
    return NextResponse.json(
      {
        error: manca
          ? "Il caricamento delle immagini non è ancora attivo: applica la migrazione 20261222000000. Intanto i post compaiono come link."
          : "Caricamento non riuscito. Riprova.",
      },
      { status: manca ? 503 : 500 },
    );
  }

  const { data: pubblico } = client.storage.from(BUCKET_IMMAGINI_NOTIZIE).getPublicUrl(path);
  return NextResponse.json({ path, token: data.token, url: pubblico.publicUrl });
}
