import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CONFIG_CHIAVI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const CHIAVI_VALIDE = new Set<string>(Object.keys(CONFIG_CHIAVI));
const STATI_VALIDI = new Set(["termini_non_comunicati", "aperte", "chiuse"]);

/**
 * Configurazione del percorso licei. Vive a database e non nel codice perche
 * i termini del bando arrivano dal referente del consorzio dei licei con
 * preavviso ignoto (art. 4 e art. 10): con le date nel codice, ogni
 * comunicazione richiederebbe un rilascio del sito.
 */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const body = (await request.json()) as Record<string, unknown>;

  const righe: { chiave: string; valore: string; aggiornato_at: string; aggiornato_by: string }[] = [];
  const adesso = new Date().toISOString();

  for (const [chiave, valore] of Object.entries(body)) {
    if (!CHIAVI_VALIDE.has(chiave)) {
      return NextResponse.json({ error: `Chiave non prevista: ${chiave}` }, { status: 400 });
    }
    const v = typeof valore === "string" ? valore.trim() : "";
    if (chiave === "stato_adesioni" && !STATI_VALIDI.has(v)) {
      return NextResponse.json({ error: "Stato delle adesioni non valido." }, { status: 400 });
    }
    if (v.length > 400) {
      return NextResponse.json({ error: `Il valore di ${chiave} è troppo lungo.` }, { status: 400 });
    }
    righe.push({ chiave, valore: v, aggiornato_at: adesso, aggiornato_by: chiamante.id });
  }

  if (righe.length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { error } = await client.from("licei_config").upsert(righe, { onConflict: "chiave" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = await client.from("licei_config").select("chiave, valore");
  return NextResponse.json({ success: true, config: data ?? [] });
}
