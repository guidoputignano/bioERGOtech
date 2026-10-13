"use client";

/**
 * Il pulsante per stampare un documento o salvarlo in PDF dal browser. Le
 * regole `@media print` di globals.css tolgono navbar, footer e banner, così
 * sul foglio resta solo il testo.
 */
export function StampaDocumento({ etichetta = "Stampa o salva in PDF" }: { etichetta?: string }) {
  return (
    <button
      type="button"
      className="btn-outline no-print"
      style={{ padding: "8px 18px", fontSize: 14 }}
      onClick={() => window.print()}
    >
      {etichetta}
    </button>
  );
}
