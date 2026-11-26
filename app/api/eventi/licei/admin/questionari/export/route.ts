import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { righeCsvQuestionari } from "@/lib/eventi/licei-questionario";
import { isRuoloQuestionario } from "@/app/eventi/vivere-piu-a-lungo/licei/questionario/domande";

/**
 * Le risposte al questionario in CSV, un ruolo alla volta (`?ruolo=studente`
 * o `?ruolo=docente`): una colonna per domanda, una riga per questionario,
 * nessun nome e nessuna data. Solo staff.
 *
 * Le risposte aperte le scrivono gli studenti: una cella che comincia con
 * = + - @ verrebbe letta come formula dal foglio di calcolo, e prende un
 * apostrofo davanti.
 */
function cella(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const ruolo = new URL(request.url).searchParams.get("ruolo");
  if (!isRuoloQuestionario(ruolo)) {
    return NextResponse.json({ error: "Indicare ruolo=studente o ruolo=docente." }, { status: 400 });
  }

  try {
    const righe = await righeCsvQuestionari(client, ruolo);
    if (righe === null) {
      return NextResponse.json({ error: "Il questionario non è ancora disponibile: manca la migrazione." }, { status: 503 });
    }
    const csv = "﻿" + righe.map((r) => r.map(cella).join(",")).join("\r\n");
    const data = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="licei-questionario-${ruolo === "studente" ? "studenti" : "docenti"}-${data}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Questionari licei export:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Esportazione non riuscita." }, { status: 500 });
  }
}
