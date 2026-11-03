"use client";

/**
 * L'avviso del cambio di regola delle squadre, in cima all'area dello
 * studente e alla console dei docenti.
 *
 * Dal 2 novembre 2026 una squadra va da 1 a 6 componenti (prima da 2 a 5),
 * e per i premi conta tutta la squadra. L'avviso lo dice e chiede di
 * segnalare qualunque problema: gli studenti al loro referente o a noi, i
 * docenti a noi. Resta visibile fino a `VISIBILE_FINO_AL`, poi sparisce da
 * solo: dopo un mese non e piu una novita.
 */

import { CONTATTI_LICEI, SQUADRA_MAX } from "./content";

const VISIBILE_FINO_AL = "2026-11-30T23:59:59+01:00";

export function NovitaSquadre({ registro }: { registro: "lei" | "tu" }) {
  if (Date.now() > Date.parse(VISIBILE_FINO_AL)) return null;
  const email = CONTATTI_LICEI.fondazione.email;
  return (
    <div
      role="status"
      style={{
        background: "#ECFAF6",
        border: "1px solid #B4E3D8",
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 13.5,
        color: "#08594A",
        lineHeight: 1.65,
      }}
    >
      <strong>Novità.</strong>{" "}
      {registro === "tu" ? (
        <>
          Ora una squadra può avere fino a {SQUADRA_MAX}{" "}componenti, e il progetto si può fare anche
          da soli. Se la vostra squadra cresce, chi l&apos;ha creata passa il codice ai nuovi compagni. Se
          qualcosa non funziona, dillo al tuo docente referente o scrivi a{" "}
          <a href={`mailto:${email}`} style={{ color: "#08594A", fontWeight: 600 }}>
            {email}
          </a>
          : lo sistemiamo noi.
        </>
      ) : (
        <>
          Ora le squadre possono avere fino a {SQUADRA_MAX} componenti, il progetto si può presentare
          anche da soli e per i premi conta tutta la squadra. Se qualcosa non funziona, per Lei o per i
          suoi studenti, ci scriva a{" "}
          <a href={`mailto:${email}`} style={{ color: "#08594A", fontWeight: 600 }}>
            {email}
          </a>
          : lo sistemiamo noi.
        </>
      )}
    </div>
  );
}
