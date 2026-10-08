"use client";

import { EVENTO_APRI_COOKIE } from "@/app/cookie-policy/content";

/**
 * Riapre il banner dei cookie. Il Garante chiede che la scelta si possa
 * cambiare in ogni momento, e da un punto sempre raggiungibile: questo
 * pulsante sta nella cookie policy e nel piè di pagina.
 */
export function CookieSettingsButton({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_APRI_COOKIE))}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", ...style }}
    >
      {label}
    </button>
  );
}
