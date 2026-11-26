import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { MIGRAZIONE_QUESTIONARIO, riepilogoQuestionari } from "@/lib/eventi/licei-questionario";
import { chiavePasso } from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";
import {
  QUESTIONARIO_CHIUDE,
  QUESTIONARIO_INVIO,
  QUESTIONARIO_PROMEMORIA,
} from "@/app/eventi/vivere-piu-a-lungo/licei/questionario/domande";

/**
 * I numeri del questionario di fine percorso, per la scheda «Questionari»:
 * quanti invitati e quanti hanno risposto (mai chi), le risposte chiuse
 * contate e quelle aperte, in ordine casuale. Solo staff.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  try {
    const riepilogo = await riepilogoQuestionari(client);
    const { data: config } = await client
      .from("licei_config")
      .select("chiave, valore")
      .in("chiave", [chiavePasso("questionario"), chiavePasso("questionario_promemoria")]);
    const valore = (k: string) => (config ?? []).find((r) => r.chiave === k)?.valore || null;
    return NextResponse.json(
      {
        ...riepilogo,
        migrazione: MIGRAZIONE_QUESTIONARIO,
        date: { invio: QUESTIONARIO_INVIO, promemoria: QUESTIONARIO_PROMEMORIA, chiude: QUESTIONARIO_CHIUDE },
        inviato_at: valore(chiavePasso("questionario")),
        promemoria_at: valore(chiavePasso("questionario_promemoria")),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("Questionari licei admin:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Lettura dei questionari non riuscita." }, { status: 500 });
  }
}
