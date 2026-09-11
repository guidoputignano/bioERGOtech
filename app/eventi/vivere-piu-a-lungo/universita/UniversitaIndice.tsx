"use client";

import { useEffect, useRef, useState } from "react";
import { SEZIONI_UNIVERSITA } from "./content";

/**
 * Barra di navigazione del bando universitario, appiccicata sotto il menu del
 * sito. Stessa impostazione di LiceiIndice: la sezione corrente si calcola a
 * mano, perche le sezioni sono piu alte della finestra e "quella che si vede"
 * non e una domanda binaria.
 */
export function UniversitaIndice({ ctaLabel }: { ctaLabel: string }) {
  const [attiva, setAttiva] = useState<string>(SEZIONI_UNIVERSITA[0].id);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const calcola = () => {
      raf = 0;
      let corrente: string = SEZIONI_UNIVERSITA[0].id;
      for (const s of SEZIONI_UNIVERSITA) {
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

  // La voce attiva puo finire fuori dalla parte visibile su schermi stretti.
  useEffect(() => {
    const voce = barra.current?.querySelector<HTMLElement>(`[data-id="${attiva}"]`);
    voce?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [attiva]);

  return (
    <nav className="un-indice" aria-label="Sezioni del bando">
      <div className="container mx-auto px-6">
        <div className="un-indice-riga">
          <div className="un-indice-voci" ref={barra}>
            {SEZIONI_UNIVERSITA.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                data-id={s.id}
                className={`un-voce${attiva === s.id ? " un-voce-attiva" : ""}`}
                aria-current={attiva === s.id ? "true" : undefined}
              >
                {s.label}
              </a>
            ))}
          </div>
          <a href="#candidatura" className="un-indice-cta">
            {ctaLabel}
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}
