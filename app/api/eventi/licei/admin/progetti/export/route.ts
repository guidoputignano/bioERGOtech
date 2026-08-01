import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CRITERI_LICEI, premioPerPosizione } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * La classifica in CSV, con il dettaglio per criterio.
 *
 * E' il documento che la Commissione si porta in seduta e che resta agli
 * atti della decisione: `?schede=1` aggiunge una riga per ogni singolo voto,
 * con il nome del commissario, perche una media senza gli addendi non e
 * verificabile da nessuno.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const dettaglio = new URL(request.url).searchParams.get("schede") === "1";

  const { data: classifica, error } = await client.rpc("licei_classifica");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const righe: string[] = [];

  if (!dettaglio) {
    righe.push(
      [
        "Posizione in classifica", "Squadra", "Istituto", "Titolo", "Ambito",
        "Componenti", "Schede chiuse", "Media punteggio", "Media innovatività",
        "Finalista", "Posizione assegnata", "Premio (art. 6)", "Consegnato il",
      ]
        .map(csvCell)
        .join(","),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (classifica ?? []).forEach((r: any, i: number) => {
      righe.push(
        [
          i + 1,
          r.squadra_nome,
          r.istituto,
          r.titolo,
          r.ambito ?? "",
          r.componenti,
          r.schede,
          r.media_totale ?? "",
          r.media_innovativita ?? "",
          r.finalista ? "sì" : "",
          r.posizione ?? "",
          // Il premio non e una colonna a database: discende dalla posizione,
          // e derivarlo qui evita che le due cose possano dissentire.
          (r.finalista && premioPerPosizione(r.posizione)?.titolo) || "",
          r.consegnato_at ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
    });
  } else {
    const { data: schede } = await client
      .from("licei_valutazioni")
      .select(
        "progetto_id, chiusa, totale, nota, p_innovativita, p_fattibilita, p_impatto, p_etica, p_squadra, p_presentazione, licei_commissari(nome, cognome, ruolo, diritto_voto)",
      )
      .eq("chiusa", true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perProgetto = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (classifica ?? []) as any[]) perProgetto.set(r.progetto_id, r);

    righe.push(
      [
        "Squadra", "Istituto", "Titolo", "Commissario", "Ruolo", "Diritto di voto",
        ...CRITERI_LICEI.map((c) => `${c.criterio} (max ${c.punti})`),
        "Totale", "Nota",
      ]
        .map(csvCell)
        .join(","),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (schede ?? []) as any[]) {
      const p = perProgetto.get(s.progetto_id);
      const c = s.licei_commissari ?? {};
      righe.push(
        [
          p?.squadra_nome ?? "",
          p?.istituto ?? "",
          p?.titolo ?? "",
          `${c.cognome ?? ""} ${c.nome ?? ""}`.trim(),
          c.ruolo ?? "",
          c.diritto_voto ? "sì" : "no",
          ...CRITERI_LICEI.map((cr) => s[cr.campo] ?? ""),
          s.totale ?? "",
          s.nota ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }

  const csv = "﻿" + righe.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  const nome = dettaglio ? "schede" : "classifica";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="licei-${nome}-${date}.csv"`,
    },
  });
}
