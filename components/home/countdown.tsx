"use client";

import { useEffect, useState } from "react";
import s from "@/app/home.module.css";

/**
 * Days, hours and minutes to the event, in Italian like the rest of the
 * event block. Rendered only in the browser: the server does not know the
 * visitor's clock, and a number computed at build time would be stale.
 */
export function Countdown({ inizio, fine }: { inizio: string; fine: string }) {
  const [ora, setOra] = useState<number | null>(null);

  useEffect(() => {
    setOra(Date.now());
    const t = setInterval(() => setOra(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (ora === null) return <div className={s.countdown} aria-hidden="true" style={{ visibility: "hidden" }} />;
  if (ora > Date.parse(fine)) return null;

  const resto = Date.parse(inizio) - ora;
  if (resto <= 0) {
    return (
      <div className={s.countdown}>
        <span className={s.liveDot} aria-hidden="true" /> In corso a Taranto
      </div>
    );
  }

  const giorni = Math.floor(resto / 86_400_000);
  const ore = Math.floor((resto % 86_400_000) / 3_600_000);
  const minuti = Math.floor((resto % 3_600_000) / 60_000);
  const parti: [number, string][] = [
    [giorni, giorni === 1 ? "giorno" : "giorni"],
    [ore, ore === 1 ? "ora" : "ore"],
    [minuti, minuti === 1 ? "minuto" : "minuti"],
  ];

  return (
    <div
      className={s.countdown}
      role="timer"
      aria-label={`Mancano ${parti
        .map(([n, l]) => `${n} ${l}`)
        .join(", ")
        .replace(/, ([^,]*)$/, " e $1")} all'evento`}
    >
      {parti.map(([n, label]) => (
        <div key={label} className={s.countdownCell}>
          <b>{String(n).padStart(2, "0")}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
