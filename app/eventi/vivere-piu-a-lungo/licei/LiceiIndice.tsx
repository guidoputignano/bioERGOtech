"use client";

import { useEffect, useRef, useState } from "react";
import { SEZIONI_LICEI } from "./content";

/**
 * Barra di navigazione del bando licei, appiccicata sotto il menu del sito.
 * Stessa impostazione di BandoIndice: la sezione corrente si calcola a mano,
 * perche le sezioni sono piu alte della finestra e "quella che si vede" non
 * e una domanda binaria.
 */
export function LiceiIndice({ ctaLabel }: { ctaLabel: string }) {
  const [attiva, setAttiva] = useState<string>(SEZIONI_LICEI[0].id);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const calcola = () => {
      raf = 0;
      let corrente: string = SEZIONI_LICEI[0].id;
      for (const s of SEZIONI_LICEI) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 150) corrente = s.id;
      }
      setAttiva(corrente);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(calcola);
    };

    calcola();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Su schermi stretti la voce attiva puo finire fuori dalla barra.
  useEffect(() => {
    const box = barra.current;
    const el = box?.querySelector<HTMLAnchorElement>(`[data-sezione="${attiva}"]`);
    if (!box || !el) return;
    const sinistra = el.offsetLeft;
    const destra = sinistra + el.offsetWidth;
    if (sinistra < box.scrollLeft || destra > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: Math.max(0, sinistra - 24), behavior: "smooth" });
    }
  }, [attiva]);

  return (
    <nav className="lc-indice" aria-label="Indice del bando per i licei">
      <div className="container mx-auto px-6 lc-indice-riga">
        <div className="lc-indice-voci" ref={barra}>
          {SEZIONI_LICEI.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-sezione={s.id}
              className={`lc-voce${attiva === s.id ? " lc-voce-attiva" : ""}`}
              aria-current={attiva === s.id ? "true" : undefined}
            >
              {s.label}
            </a>
          ))}
        </div>
        <a href="#adesione" className="lc-indice-cta">
          <i className="fas fa-school" aria-hidden="true" />
          <span>{ctaLabel}</span>
        </a>
      </div>
    </nav>
  );
}
