"use client";

/**
 * Le tre schermate dello staff, in una pagina sola.
 *
 * L'ordine non e alfabetico ma cronologico, ed e lo stesso in cui il
 * percorso accade: prima gli istituti aderiscono, poi le squadre lavorano,
 * infine la Commissione valuta. Chi apre il pannello a meta percorso trova
 * per prima la fase in cui e entrato.
 */

import { useState } from "react";
import { LiceiAdminPanel } from "./LiceiAdminPanel";
import { ProgettiPanel } from "./ProgettiPanel";
import { CommissariPanel } from "./CommissariPanel";

const SCHERMATE = [
  { id: "adesioni", label: "Adesioni e iscrizioni" },
  { id: "progetti", label: "Squadre e progetti" },
  { id: "commissione", label: "Commissione" },
] as const;

type Schermata = (typeof SCHERMATE)[number]["id"];

export function LiceiAdminTabs() {
  const [attiva, setAttiva] = useState<Schermata>("adesioni");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div
        className="card-sm flex flex-wrap gap-2 items-center"
        style={{ padding: 10, position: "sticky", top: 78, zIndex: 5 }}
      >
        {SCHERMATE.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setAttiva(s.id)}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              background: attiva === s.id ? "var(--primary-light)" : "transparent",
              color: attiva === s.id ? "var(--text-dark)" : "var(--text-light)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {attiva === "adesioni" && <LiceiAdminPanel />}
      {attiva === "progetti" && <ProgettiPanel />}
      {attiva === "commissione" && <CommissariPanel />}
    </div>
  );
}
