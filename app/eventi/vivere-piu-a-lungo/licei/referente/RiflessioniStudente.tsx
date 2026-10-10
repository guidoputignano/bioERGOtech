"use client";

/**
 * Le consegne delle lezioni di uno studente, dentro la riga del referente.
 *
 * Si caricano quando il docente apre la riga, non con l'elenco: vedi la rotta
 * `api/eventi/licei/referente/riflessioni`. La nota in cima ricorda da quando
 * le vede, perche un elenco vuoto o corto non sembri uno studente che non ha
 * scritto niente quando ha solo scritto prima di quella data.
 */

import { useEffect, useState } from "react";
import { riflessioniAlReferenteDalLabel } from "../riflessioni-referente";

type Consegna = {
  lezione: string;
  titolo: string;
  riflessione: string | null;
  domanda: string | null;
  commento: string | null;
  salvata_il: string;
};

const CAMPI: { chiave: "riflessione" | "domanda" | "commento"; label: string }[] = [
  { chiave: "riflessione", label: "Riflessione" },
  { chiave: "domanda", label: "Domanda" },
  { chiave: "commento", label: "Commento" },
];

export function RiflessioniStudente({ iscrizioneId }: { iscrizioneId: string }) {
  const [consegne, setConsegne] = useState<Consegna[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/eventi/licei/referente/riflessioni?iscrizione=${encodeURIComponent(iscrizioneId)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Consegne non disponibili.");
        if (attivo) setConsegne(data.consegne ?? []);
      } catch (err) {
        if (attivo) setErrore(err instanceof Error ? err.message : "Consegne non disponibili.");
      }
    })();
    return () => {
      attivo = false;
    };
  }, [iscrizioneId]);

  return (
    <div
      style={{
        flexBasis: "100%",
        background: "var(--bg-light)",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <p style={{ fontSize: 12, color: "var(--text-light)", margin: "0 0 10px", lineHeight: 1.6 }}>
        Consegne salvate dal {riflessioniAlReferenteDalLabel()}. Quelle precedenti le legge solo la
        Fondazione, come diceva l&apos;informativa quando lo studente le ha scritte.
      </p>

      {errore && <p style={{ fontSize: 13.5, color: "#B44A5E", margin: 0 }}>{errore}</p>}
      {!errore && consegne === null && (
        <p style={{ fontSize: 13.5, color: "var(--text-light)", margin: 0 }}>Caricamento…</p>
      )}
      {consegne && consegne.length === 0 && (
        <p style={{ fontSize: 13.5, color: "var(--text-mid)", margin: 0 }}>
          Nessuna consegna da questa data.
        </p>
      )}

      {consegne?.map((c, i) => (
        <div
          key={`${c.lezione}-${c.titolo}`}
          style={{
            padding: "12px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)" }}>
            {c.lezione ? `${c.lezione} . ` : ""}
            {c.titolo}
            <span style={{ fontWeight: 400, color: "var(--text-light)", marginLeft: 8, fontSize: 12 }}>
              {new Date(c.salvata_il).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
          {CAMPI.map(({ chiave, label }) =>
            c[chiave] ? (
              <div key={chiave} style={{ marginTop: 6 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--text-light)",
                  }}
                >
                  {label}
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--text-mid)",
                    lineHeight: 1.65,
                    margin: "2px 0 0",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {c[chiave]}
                </p>
              </div>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}
