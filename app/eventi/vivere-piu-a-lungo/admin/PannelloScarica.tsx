"use client";

import { useState, type ReactNode } from "react";
import { scaricaFile } from "./PannelloComune";

/**
 * Un pulsante che scarica un CSV del pannello. Mentre il file si prepara lo
 * dice; se il server risponde con un errore lo passa a `onErrore`, così la
 * scheda lo mostra invece di aprire una pagina con il JSON dell'errore.
 */
export function PulsanteScarica({
  url,
  children,
  onErrore,
  className = "eva-btn",
}: {
  url: string;
  children: ReactNode;
  onErrore: (messaggio: string | null) => void;
  className?: string;
}) {
  const [inCorso, setInCorso] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={inCorso}
      aria-busy={inCorso}
      onClick={async () => {
        setInCorso(true);
        onErrore(null);
        const errore = await scaricaFile(url);
        setInCorso(false);
        if (errore) onErrore(`Il file non è stato scaricato. ${errore}`);
      }}
    >
      <i className={inCorso ? "fas fa-spinner fa-spin" : "fas fa-file-csv"} aria-hidden="true" />
      {children}
    </button>
  );
}
