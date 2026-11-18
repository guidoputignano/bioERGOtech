"use client";

import { useEffect, useState } from "react";
import { ARCHIVE_MODE, SESSIONS, elencoGiornate } from "./content";

/**
 * La barra "Iscriviti gratis" fissa in fondo allo schermo, solo sul telefono
 * e sul tablet (sotto i 1024px, dove la navbar non mostra il pulsante).
 *
 * Compare quando il pulsante dell'hero è uscito dallo schermo verso l'alto e
 * sparisce in tre casi: mentre la sezione #iscrizione è visibile (il modulo è
 * già lì, la barra coprirebbe i campi e la tastiera), quando si arriva al piè
 * di pagina (non copre i link del footer) e finché il banner dei cookie è
 * aperto o la scelta sui cookie non è ancora fatta (non copre mai i suoi
 * pulsanti). In modalità archivio non esiste.
 *
 * Il pulsante è un'ancora vera (<a href="#iscrizione">): niente JavaScript per
 * lo scorrimento, che rispetta lo scroll-margin della sezione e porta lì anche
 * il punto di partenza della tastiera.
 */

const GIORNATE = elencoGiornate(SESSIONS.map((s) => s.slug)); // "10 e 11 dicembre"

/** La chiave con cui components/cookie-banner.tsx salva la scelta. */
const CHIAVE_CONSENSO = "bioergotech_cookie_consent";

/**
 * Il banner dei cookie quando è a schermo. `data-cookie-banner` è l'aggancio
 * esplicito (se il banner lo espone); l'animazione `slideUpBanner` è il segno
 * che il banner porta oggi nel suo stile in linea.
 */
const SELETTORE_BANNER = '[data-cookie-banner], div.no-print[style*="slideUpBanner"]';

function cookieInSospeso(): boolean {
  if (document.querySelector(SELETTORE_BANNER)) return true;
  try {
    // Nessuna scelta salvata: il banner sta per comparire (parte dopo 800ms).
    return window.localStorage.getItem(CHIAVE_CONSENSO) === null;
  } catch {
    // Storage bloccato: decide solo la presenza del banner, qui sopra.
    return false;
  }
}

const CSS = `
.ev-fisso {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 950;
  background: rgba(255,255,255,0.97);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -6px 24px rgba(16,24,40,0.08);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  transform: translateY(110%); opacity: 0; visibility: hidden;
  transition: transform .25s ease, opacity .25s ease, visibility 0s linear .25s;
}
.ev-fisso.is-visibile {
  transform: none; opacity: 1; visibility: visible;
  transition: transform .25s ease, opacity .25s ease, visibility 0s;
}
@media (prefers-reduced-motion: reduce) {
  .ev-fisso, .ev-fisso.is-visibile { transition: none; }
}
@media (min-width: 1024px) { .ev-fisso { display: none; } }
.ev-fisso-riga {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  max-width: 1200px; margin: 0 auto; padding: 10px 16px;
}
.ev-fisso-testo { margin: 0; min-width: 0; font-size: 13px; line-height: 1.35; color: var(--text-mid); }
.ev-fisso-testo strong { display: block; font-size: 14px; font-weight: 700; color: var(--text-dark); }
.ev-fisso .ev-fisso-cta { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; min-height: 44px; padding: 10px 22px; font-size: 0.9rem; }
`;

export function EventoIscrivitiFisso() {
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    if (ARCHIVE_MODE) return;
    const cta = document.getElementById("evento-cta-hero");
    const iscrizione = document.getElementById("iscrizione");
    // Senza i due punti di riferimento, o senza IntersectionObserver, la barra
    // resta nascosta: meglio nessuna barra che una barra nel posto sbagliato.
    if (!cta || !iscrizione || typeof IntersectionObserver === "undefined") return;
    const footer = document.querySelector("footer");

    const stato = { ctaPassata: false, iscrizioneVisibile: false, footerVisibile: false };
    let frame = 0;
    const aggiorna = () => {
      frame = 0;
      setVisibile(
        stato.ctaPassata && !stato.iscrizioneVisibile && !stato.footerVisibile && !cookieInSospeso(),
      );
    };
    const pianifica = () => {
      if (!frame) frame = window.requestAnimationFrame(aggiorna);
    };

    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const v of voci) {
          if (v.target === cta) {
            // "Passata" solo se è uscita verso l'alto, non se è ancora sotto.
            stato.ctaPassata = !v.isIntersecting && v.boundingClientRect.top < window.innerHeight / 2;
          } else if (v.target === iscrizione) {
            stato.iscrizioneVisibile = v.isIntersecting;
          } else if (v.target === footer) {
            stato.footerVisibile = v.isIntersecting;
          }
        }
        pianifica();
      },
      // I 70px in alto sono la navbar fissa: quello che c'è sotto non si vede.
      { rootMargin: "-70px 0px 0px 0px" },
    );
    osservatore.observe(cta);
    osservatore.observe(iscrizione);
    if (footer) osservatore.observe(footer);

    // Il banner dei cookie compare, si chiude e si riapre dal piè di pagina:
    // ogni cambio nel DOM ricontrolla, al massimo una volta per frame.
    const mutazioni = new MutationObserver(pianifica);
    mutazioni.observe(document.body, { childList: true, subtree: true });

    pianifica();
    return () => {
      osservatore.disconnect();
      mutazioni.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (ARCHIVE_MODE) return null;

  return (
    <div
      className={`ev-fisso no-print${visibile ? " is-visibile" : ""}`}
      // Nascosta: fuori dal tab e dai lettori di schermo, non solo dalla vista.
      inert={!visibile}
      aria-hidden={!visibile}
    >
      <style>{CSS}</style>
      <div className="ev-fisso-riga">
        <p className="ev-fisso-testo">
          <strong>{GIORNATE}</strong>
          <span className="sr-only">, </span>Ingresso gratuito
        </p>
        <a href="#iscrizione" className="btn-primary ev-fisso-cta">
          Iscriviti gratis
        </a>
      </div>
    </div>
  );
}
