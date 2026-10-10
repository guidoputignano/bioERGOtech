import Link from "next/link";
import {
  LICEI,
  STUDENTE_PATH as LICEI_STUDENTE_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  UNIVERSITA,
  STUDENTE_PATH as UNIVERSITA_STUDENTE_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

export type PercorsoArea = "licei" | "universita";

/**
 * Il rimando all'area del percorso, in cima alla pagina del corso.
 *
 * Nasce da una domanda vera: una studentessa cercava i mentor nella pagina
 * del corso, dove non ci sono. Mentor, squadra e progetto stanno nell'area
 * del percorso, che e un'altra pagina, e dal corso nessun link ci portava.
 *
 * Il pulsante principale punta dritto al riquadro dei mentor (`#mentor`,
 * vedi `MentorElenco`), cosi lo studente non deve nemmeno sapere che sta in
 * fondo alla pagina. Come i riquadri nelle lezioni, e in italiano e si
 * presenta per quello che e: il corso e in inglese e aperto a chiunque, e
 * questo pezzo compare solo a chi e confermato in uno dei due percorsi.
 */
export function RiquadroArea({ percorso }: { percorso: PercorsoArea }) {
  const licei = percorso === "licei";
  const area = licei ? LICEI_STUDENTE_PATH : UNIVERSITA_STUDENTE_PATH;
  const occhiello = licei
    ? `Percorso istituti superiori . ${LICEI.titolo}`
    : `Percorso universitario . ${UNIVERSITA.titolo}`;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderTop: "3px solid #00C4B4",
        borderRadius: 14,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#0A7A66",
          marginBottom: 8,
        }}
      >
        {occhiello}
      </div>
      <h2
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "#1A2B4A",
          margin: "0 0 6px",
        }}
      >
        Cerchi i mentor?
      </h2>
      <p style={{ fontSize: 14, color: "#5A6B85", margin: "0 0 18px", lineHeight: 1.6 }}>
        Non sono in questa pagina: li trovi nella tua area, insieme alla squadra e al progetto.
        Il pulsante ti porta direttamente all&apos;elenco, con i contatti e le regole da leggere
        prima di scrivere.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link
          href={`${area}#mentor`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#00C4B4",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          Vai ai mentor
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
        <Link
          href={area}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#fff",
            color: "#0A7A66",
            border: "1px solid #B4E3D8",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          La tua area
        </Link>
      </div>
    </div>
  );
}
