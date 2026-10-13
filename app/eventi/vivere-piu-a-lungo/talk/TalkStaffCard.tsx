"use client";

/**
 * La scheda "Talk" del pannello staff dei licei: per ogni talk, quanti si
 * sono iscritti e con quale ruolo, e l'export CSV con nomi ed email. Il
 * conteggio comprende tutte le righe; il CSV solo chi e ancora idoneo, cioe
 * chi vede il link sulla pagina.
 *
 * Sta nel pannello dei licei perche e li che lo staff lavora sul percorso;
 * i numeri comprendono anche gli studenti universitari, che ai talk
 * partecipano allo stesso modo.
 */

import { useEffect, useState } from "react";
import { RUOLI_TALK_LABEL } from "./testi";
// Solo il tipo: il modulo e del server.
import type { TalkStaffRiga } from "@/app/api/eventi/talk/admin/route";

type Risposta = {
  disponibile: boolean;
  talks: TalkStaffRiga[];
  altri: { slug: string; totale: number }[];
};

export function TalkStaffCard() {
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const res = await fetch("/api/eventi/talk/admin", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lettura non riuscita.");
        if (attivo) setDati(data as Risposta);
      } catch (err) {
        if (attivo) setErrore(err instanceof Error ? err.message : "Lettura non riuscita.");
      }
    })();
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <div className="card" style={{ padding: 18 }}>
      <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
        Talk con gli esperti
      </h2>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 12 }}>
        Iscritti ai talk, studenti dei licei e dell&apos;università, docenti e staff. Il CSV ha nome,
        cognome, email, istituto e ruolo di chi oggi vede il link sulla pagina: è l&apos;elenco a cui
        mandarlo. Chi nel frattempo non partecipa più al percorso resta nel conteggio, non nel file.
      </p>

      {errore && <p style={{ color: "#B44A5E", fontSize: 13.5, margin: 0 }}>{errore}</p>}
      {!dati && !errore && <p className="text-sm text-gray-600">Caricamento…</p>}

      {dati && !dati.disponibile && (
        <p className="text-sm" style={{ color: "#8A6100", lineHeight: 1.7, margin: 0 }}>
          Le iscrizioni ai talk non sono ancora attive: applica la migrazione 20261216000000.
          Fino ad allora la pagina del talk dice &laquo;Le iscrizioni aprono a breve.&raquo;
        </p>
      )}

      {dati?.disponibile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dati.talks.map((t) => (
            <div
              key={t.slug}
              className="card-sm flex flex-wrap items-center justify-between gap-3"
              style={{ padding: 14 }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t.occhiello}
                  {t.concluso ? " . concluso" : ""}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-dark)" }}>
                  {t.titolo} . {t.relatore}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6 }}>
                  {t.dataLabel}, {t.orarioLabel}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--text-dark)" }}>{t.totale} iscritti</strong>
                  {Object.entries(t.per_ruolo)
                    .filter(([, n]) => n > 0)
                    .map(([r, n]) => ` . ${RUOLI_TALK_LABEL[r] ?? r}: ${n}`)
                    .join("")}
                </div>
              </div>
              <a
                href={`/api/eventi/talk/admin/export?slug=${encodeURIComponent(t.slug)}`}
                className="btn-outline"
                style={{ padding: "8px 18px", fontSize: 13 }}
              >
                <i className="fas fa-file-csv" aria-hidden="true" /> Esporta CSV
              </a>
            </div>
          ))}
          {dati.altri.length > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: 0 }}>
              Iscrizioni a talk non più in elenco:{" "}
              {dati.altri.map((a) => `${a.slug} (${a.totale})`).join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
