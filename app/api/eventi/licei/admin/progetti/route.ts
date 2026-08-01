import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { LICEI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Classifica e istruttoria dei progetti, per lo staff.
 *
 * Lo staff vede la classifica ma non la fa: i punteggi arrivano dalle schede
 * della Commissione, e qui si possono solo leggere. Quello che lo staff
 * decide e chi sale sul palco, che e una conseguenza della classifica e non
 * un giudizio nuovo.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const [{ data: classifica, error }, { data: stats }, { data: squadre }, { data: commissari }] =
    await Promise.all([
      client.rpc("licei_classifica"),
      client.rpc("licei_squadre_stats"),
      client
        .from("licei_squadre")
        .select(
          "id, nome, codice, stato, created_at, licei_adesioni(istituto_denominazione), licei_iscrizioni(id, nome, cognome, classe, squadra_ruolo)",
        )
        .order("created_at", { ascending: false }),
      client
        .from("licei_commissari")
        .select("id, nome, cognome, diritto_voto, attivo")
        .eq("attivo", true),
    ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Quanti voti ci si aspetta per progetto: serve al pannello per dire
  // "3 schede su 5" invece di un numero senza denominatore.
  const votanti = (commissari ?? []).filter(
    (c: { diritto_voto: boolean }) => c.diritto_voto,
  ).length;

  return NextResponse.json({
    classifica: classifica ?? [],
    stats: (stats ?? [])[0] ?? null,
    squadre: squadre ?? [],
    votanti,
    sulPalco: LICEI.progettiSulPalco,
  });
}

/** Designa o revoca un finalista, e annota. */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const body = (await request.json()) as {
    id?: string;
    finalista?: boolean;
    posizione?: number | null;
    note_staff?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Progetto non indicato." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.finalista !== undefined) patch.finalista = !!body.finalista;

  if (body.posizione !== undefined) {
    if (body.posizione === null || body.posizione === ("" as unknown)) {
      patch.posizione = null;
    } else {
      const n = Number(body.posizione);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return NextResponse.json({ error: "La posizione deve essere fra 1 e 100." }, { status: 400 });
      }
      patch.posizione = n;
    }
  }

  if (body.note_staff !== undefined) patch.note_staff = body.note_staff?.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error } = await client
    .from("licei_progetti")
    .update(patch)
    .eq("id", body.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 });

  return NextResponse.json({ success: true, progetto: data });
}

/**
 * Designa d'ufficio i primi dieci della classifica (art. 6).
 *
 * Non e un automatismo cieco e non deve diventarlo: propone l'esito che
 * discende dai punteggi, e lo staff resta libero di correggerlo a mano dal
 * pannello prima di iscrivere chiunque all'evento. Serve a evitare che
 * qualcuno ricopi dieci righe a mano da una classifica, che e il modo piu
 * facile di sbagliare l'unica cosa che non si puo sbagliare.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const body = (await request.json()) as { azione?: string; quanti?: number };

  if (body.azione !== "designa_finalisti") {
    return NextResponse.json({ error: "Azione non prevista." }, { status: 400 });
  }

  const quanti = Number.isInteger(body.quanti) && body.quanti! > 0
    ? Math.min(body.quanti!, 100)
    : LICEI.progettiSulPalco;

  const { data: classifica, error } = await client.rpc("licei_classifica");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const righe = (classifica ?? []) as { progetto_id: string; schede: number }[];

  // Un progetto che nessuno ha valutato non e ultimo, e non classificato. Se
  // finisse fra i primi dieci solo perche la classifica e corta, salirebbe
  // sul palco senza che nessuno lo abbia letto.
  const valutati = righe.filter((r) => Number(r.schede) > 0);
  const scelti = valutati.slice(0, quanti);

  if (scelti.length === 0) {
    return NextResponse.json(
      { error: "Nessun progetto ha ancora una scheda chiusa: la classifica è vuota." },
      { status: 409 },
    );
  }

  // Prima si azzera, poi si assegna: senza, una seconda designazione dopo
  // una revisione dei punteggi lascerebbe in elenco i finalisti vecchi.
  const { error: erroreReset } = await client
    .from("licei_progetti")
    .update({ finalista: false, posizione: null })
    .eq("finalista", true);

  if (erroreReset) return NextResponse.json({ error: erroreReset.message }, { status: 500 });

  for (let i = 0; i < scelti.length; i++) {
    const { error: erroreSet } = await client
      .from("licei_progetti")
      .update({ finalista: true, posizione: i + 1 })
      .eq("id", scelti[i].progetto_id);
    if (erroreSet) {
      console.error("Licei designa finalisti error:", erroreSet);
      return NextResponse.json({ error: erroreSet.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    designati: scelti.length,
    non_valutati: righe.length - valutati.length,
  });
}
