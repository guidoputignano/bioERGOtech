"use client";

/**
 * La select del filtro per classe. Lo stato non e suo: lo tiene la console,
 * che lo passa a ogni sezione (vedi `filtroPerClasse.ts`).
 */

import { LE_MIE_CLASSI, TUTTE_LE_CLASSI, type OpzioneClasse } from "./filtroPerClasse";

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  padding: "0 10px",
  background: "#fff",
  color: "var(--text-dark)",
  fontSize: 13,
  maxWidth: "100%",
};

export function FiltroClasse({
  valore,
  onCambia,
  opzioni,
  classiDocente,
}: {
  valore: string;
  onCambia: (valore: string) => void;
  opzioni: OpzioneClasse[];
  /** Le classi seguite dal docente: se ci sono, compare "Le mie classi". */
  classiDocente: string[];
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--text-light)",
        flexWrap: "wrap",
      }}
    >
      Classe
      <select value={valore} onChange={(e) => onCambia(e.target.value)} style={selectStyle}>
        <option value={TUTTE_LE_CLASSI}>Tutte le classi dell&apos;istituto</option>
        {classiDocente.length > 0 && (
          <option value={LE_MIE_CLASSI}>Le mie classi ({classiDocente.join(", ")})</option>
        )}
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.etichetta} ({o.n})
          </option>
        ))}
      </select>
    </label>
  );
}
