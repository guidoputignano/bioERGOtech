"use client";

/** Il pulsante "Stampa" della lista per la porta. Sulla carta non compare. */
export function PannelloStampaPulsante() {
  return (
    <button type="button" className="eva-btn eva-btn-primario" onClick={() => window.print()}>
      <i className="fas fa-print" aria-hidden="true" />
      Stampa
    </button>
  );
}
