"use client";

import { useEffect, useRef, useState } from "react";

const formato = new Intl.NumberFormat("en-GB");

const NASCOSTO: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * A number that counts up when it scrolls into view. The server renders the
 * real value, so without JavaScript (search engines, screenshots, reduced
 * motion) the number is simply there.
 */
export function CountUp({ valore, prefisso = "", suffisso = "" }: { valore: number; prefisso?: string; suffisso?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [mostrato, setMostrato] = useState(valore);

  useEffect(() => {
    const el = ref.current;
    if (!el || valore <= 0) return;
    const stampa = () => setMostrato(valore);
    window.addEventListener("beforeprint", stampa);
    const fine = () => window.removeEventListener("beforeprint", stampa);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return fine;
    if (!("IntersectionObserver" in window)) return fine;
    let raf = 0;
    let partito = false;
    const durata = Math.min(1800, 700 + valore * 4);
    const avvia = () => {
      partito = true;
      const t0 = performance.now();
      const passo = (t: number) => {
        const k = Math.min(1, (t - t0) / durata);
        const e = 1 - Math.pow(1 - k, 3);
        setMostrato(Math.round(valore * e));
        if (k < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    };
    const io = new IntersectionObserver(
      (voci) => {
        if (!partito && voci.some((v) => v.isIntersecting)) {
          io.disconnect();
          avvia();
        }
      },
      { threshold: 0.4 },
    );
    // Start from zero only if the number is not on screen yet.
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight) setMostrato(0);
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      fine();
    };
  }, [valore]);

  const finale = `${prefisso}${formato.format(valore)}${suffisso}`;
  return (
    <>
      {/* Screen readers get the real value, never the animation's 0. */}
      <span style={NASCOSTO}>{finale}</span>
      <span ref={ref} aria-hidden="true" style={{ fontVariantNumeric: "tabular-nums" }}>
        {prefisso}
        {formato.format(mostrato)}
        {suffisso}
      </span>
    </>
  );
}
