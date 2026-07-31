import { NextResponse } from "next/server";
import { BANDO_BUCKET, bandoAdminClient, utenteCorrente, verificaFinestra } from "@/lib/eventi/bando-server";
import { isCampoAllegato, isPathAllegatoValido, isUuid, pathAllegato } from "@/lib/eventi/bando";
import { MAX_FILE_BYTES, MAX_FILE_LABEL } from "@/app/eventi/vivere-piu-a-lungo/bando/content";

/**
 * Allegati della candidatura. Il file non transita da qui: la rotta rilascia
 * un URL di upload firmato e il browser carica direttamente su Supabase
 * Storage. Cosi restiamo sotto il limite di corpo delle funzioni serverless
 * anche con un PDF da 10 MB, e il bucket resta privato (nessuna policy di
 * scrittura per anon: senza token firmato non si scrive).
 *
 * Il tipo e la dimensione sono comunque imposti dal bucket stesso
 * (allowed_mime_types = application/pdf, file_size_limit = 10 MB), quindi un
 * client che mentisse qui verrebbe fermato da Storage.
 */

/** Massimo di file per bozza: quattro slot singoli piu il materiale facoltativo. */
const MAX_FILE_PER_BOZZA = 10;

export async function POST(request: Request) {
  try {
    const client = bandoAdminClient();
    if (!client) {
      return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
    }

    const { staff } = await utenteCorrente();
    const finestra = verificaFinestra(staff);
    if (!finestra.ok) return NextResponse.json({ error: finestra.errore }, { status: 403 });

    const body = (await request.json()) as {
      draft?: string;
      campo?: string;
      nome?: string;
      size?: number;
    };

    const draft = (body.draft ?? "").toLowerCase();
    if (!isUuid(draft)) {
      return NextResponse.json({ error: "Sessione di caricamento non valida." }, { status: 400 });
    }
    if (!body.campo || !isCampoAllegato(body.campo)) {
      return NextResponse.json({ error: "Allegato non previsto dal bando." }, { status: 400 });
    }

    const nome = (body.nome ?? "").trim();
    if (!nome.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Gli allegati devono essere in formato PDF." }, { status: 400 });
    }

    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "File non valido." }, { status: 400 });
    }
    if (size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Il file supera i ${MAX_FILE_LABEL}. Comprimi il PDF e riprova.` },
        { status: 400 },
      );
    }

    // Tetto ai file per bozza: l'endpoint e pubblico, non deve diventare
    // spazio di archiviazione gratuito.
    const { data: esistenti } = await client.storage
      .from(BANDO_BUCKET)
      .list(`candidature/${draft}`, { limit: MAX_FILE_PER_BOZZA + 1 });
    if ((esistenti?.length ?? 0) >= MAX_FILE_PER_BOZZA) {
      return NextResponse.json(
        { error: "Hai raggiunto il numero massimo di allegati per questa candidatura." },
        { status: 400 },
      );
    }

    // Nome di storage deciso dal server: il nome originale del file non entra
    // mai nel percorso, resta solo come etichetta nella candidatura.
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
    const path = pathAllegato(draft, body.campo, seed);

    const { data, error } = await client.storage
      .from(BANDO_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("Bando signed upload URL error:", error);
      return NextResponse.json({ error: "Caricamento non riuscito. Riprova." }, { status: 500 });
    }

    return NextResponse.json({ path, token: data.token });
  } catch (err) {
    console.error("Bando upload error:", err);
    return NextResponse.json({ error: "Caricamento non riuscito. Riprova." }, { status: 500 });
  }
}

/** Rimuove un allegato caricato per errore, prima dell'invio. */
export async function DELETE(request: Request) {
  try {
    const client = bandoAdminClient();
    if (!client) {
      return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
    }

    const { staff } = await utenteCorrente();
    const finestra = verificaFinestra(staff);
    if (!finestra.ok) return NextResponse.json({ error: finestra.errore }, { status: 403 });

    const body = (await request.json()) as { draft?: string; path?: string };
    const draft = (body.draft ?? "").toLowerCase();
    const path = body.path ?? "";

    // Si puo cancellare solo dentro la propria cartella di bozza, e solo un
    // percorso nella forma esatta che questa rotta produce.
    if (!isPathAllegatoValido(path, draft)) {
      return NextResponse.json({ error: "Allegato non valido." }, { status: 400 });
    }

    const { error } = await client.storage.from(BANDO_BUCKET).remove([path]);
    if (error) {
      console.error("Bando file remove error:", error);
      return NextResponse.json({ error: "Rimozione non riuscita." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bando delete error:", err);
    return NextResponse.json({ error: "Rimozione non riuscita." }, { status: 500 });
  }
}
