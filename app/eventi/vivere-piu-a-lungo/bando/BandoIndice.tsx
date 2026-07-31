"use client";

import { useEffect, useRef, useState } from "react";
import { SEZIONI_BANDO } from "./content";

/**
 * Barra di navigazione del bando, appiccicata sotto il menu del sito.
 *
 * Il bando è lungo dodici sezioni: senza indice, chi arriva dalla pagina
 * dell'evento per capire in che categoria rientra, o per compilare il modulo,
 * deve scorrere tutto. La barra resta visibile e porta la voce attiva in
 * evidenza mentre si legge.
 *
 * La sezione corrente si calcola a mano invece che con IntersectionObserver:
 * le sezioni sono molto più alte della finestra, quindi "quella che si vede"
 * non è una domanda binaria, ed è più affidabile prendere l'ultima il cui
 * bordo superiore ha già superato la barra.
 */
export function BandoIndice({ ctaLabel }: { ctaLabel: string }) {
  const [attiva, setAttiva] = useState<string>(SEZIONI_BANDO[0].id);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const calcola = () => {
      raf = 0;
      // 150px: altezza del menu (71) più quella dell'indice, con un margine.
      let corrente: string = SEZIONI_BANDO[0].id;
      for (const s of SEZIONI_BANDO) {
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

  // Su schermi stretti la barra scorre in orizzontale e la voce attiva può
  // finirne fuori. La riportiamo in vista senza muovere la pagina.
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
    <nav className="bd-indice" aria-label="Indice del bando">
      <div className="container mx-auto px-6 bd-indice-riga">
        <div className="bd-indice-voci" ref={barra}>
          {SEZIONI_BANDO.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-sezione={s.id}
              className={`bd-voce${attiva === s.id ? " bd-voce-attiva" : ""}`}
              aria-current={attiva === s.id ? "true" : undefined}
            >
              {s.label}
            </a>
          ))}
        </div>
        <a href="#candidatura" className="bd-indice-cta">
          <i className="fas fa-paper-plane" aria-hidden="true" />
          <span>{ctaLabel}</span>
        </a>
      </div>
    </nav>
  );
}
