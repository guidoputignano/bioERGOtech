"use client";

/**
 * L'elenco dei mentor nelle aree dei partecipanti, licei e università.
 *
 * Uno solo per i due percorsi perche i mentor sono gli stessi e le regole
 * pure: cambia soltanto il consiglio per i minorenni, che ha senso per un
 * liceale e non per uno studente universitario.
 *
 * Le regole stanno SOPRA l'elenco e non in fondo, di proposito: e il punto
 * in cui uno studente sta per scrivere a una persona che non conosce, e le
 * cose da sapere vanno lette prima del primo clic su un indirizzo, non dopo.
 *
 * Questa cartella non e una rotta (non c'e `page.tsx`): ospita solo il
 * componente, a livello dell'evento perche non appartiene a nessuno dei due
 * percorsi piu che all'altro.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MENTOR_PATH,
  areaLabel,
  ruoloMentorLabel,
} from "../universita/content";
import {
  LINEE_GUIDA_MENTOR_PATH,
  REGOLA_MENTOR_MINORENNI,
  REGOLE_STUDENTI_MENTOR,
} from "../linee-guida-mentor/content";
import type { MentorPerPartecipanti } from "@/app/api/eventi/mentor/route";

type Percorso = "licei" | "universita";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Il contatto come link. La rotta lo ha gia validato in ingresso, ma qui
 * si ricontrolla lo schema: un `href` che arriva dal database non deve mai
 * poter diventare `javascript:`, nemmeno per un dato inserito prima delle
 * validazioni di oggi.
 */
function linkContatto(valore: string): { href: string; esterno: boolean } | null {
  const v = valore.trim();
  if (EMAIL_RE.test(v)) return { href: `mailto:${v}`, esterno: false };
  if (/^https?:\/\//i.test(v)) return { href: v, esterno: true };
  return null;
}

const pillolaStyle: React.CSSProperties = {
  background: "var(--bg-light)",
  border: "1px solid var(--border-color)",
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 11.5,
  color: "var(--text-mid)",
  lineHeight: 1.4,
};

export function MentorElenco({ percorso }: { percorso: Percorso }) {
  const [mentor, setMentor] = useState<MentorPerPartecipanti[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Il link "Vai ai mentor" della pagina del corso arriva con `#mentor`. Il
  // browser da solo non ci scorre: quando carica la pagina questo riquadro
  // non esiste ancora, perche la console lo monta solo dopo aver letto i
  // dati dello studente. Lo si fa qui, al montaggio, che e il primo momento
  // in cui c'e qualcosa su cui scorrere.
  useEffect(() => {
    if (window.location.hash === "#mentor") {
      boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const res = await fetch("/api/eventi/mentor", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Elenco non disponibile.");
        if (attivo) setMentor(data.mentor ?? []);
      } catch (err) {
        if (attivo) setErrore(err instanceof Error ? err.message : "Elenco non disponibile.");
      }
    })();
    return () => {
      attivo = false;
    };
  }, []);

  // Il consiglio sul docente referente riguarda chi puo essere minorenne,
  // cioe i licei. All'universita sarebbe una frase fuori posto.
  const regole: readonly string[] =
    percorso === "licei"
      ? [...REGOLE_STUDENTI_MENTOR, REGOLA_MENTOR_MINORENNI]
      : REGOLE_STUDENTI_MENTOR;

  return (
    <div
      id="mentor"
      ref={boxRef}
      className="card"
      style={{ padding: 22, scrollMarginTop: 100 }}
    >
      <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
        Mentor
      </h2>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 14px" }}>
        Ricercatori, docenti e professionisti a disposizione di tutto il percorso, licei e
        università. Per chi lo ha messo a disposizione trovi un contatto professionale: puoi
        scrivere per un parere sul progetto, una fonte, un metodo.
      </p>

      <div
        role="note"
        style={{
          background: "#FFF8E6",
          border: "1px solid #F0D89B",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#75570F",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        <strong>Prima di scrivere</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, listStyle: "disc" }}>
          {regole.map((r) => (
            <li key={r} style={{ marginTop: 3 }}>
              {r}
            </li>
          ))}
        </ul>
        <p style={{ margin: "8px 0 0" }}>
          <Link
            href={LINEE_GUIDA_MENTOR_PATH}
            style={{ color: "#75570F", fontWeight: 600, textDecoration: "underline" }}
          >
            Le linee guida che ogni mentor accetta
          </Link>
        </p>
      </div>

      {errore && (
        <p style={{ fontSize: 13.5, color: "var(--text-light)", margin: 0 }}>{errore}</p>
      )}

      {!errore && mentor === null && (
        <p style={{ fontSize: 13.5, color: "var(--text-light)", margin: 0 }}>Caricamento…</p>
      )}

      {mentor && mentor.length === 0 && (
        <p style={{ fontSize: 13.5, color: "var(--text-light)", margin: 0, lineHeight: 1.7 }}>
          L&apos;elenco dei mentor si sta componendo. Compariranno qui appena saranno
          disponibili.
        </p>
      )}

      {mentor && mentor.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mentor.map((m, i) => {
            const contatto = m.contatto_studenti ? linkContatto(m.contatto_studenti) : null;
            const aree = m.aree ?? [];
            return (
              <div
                key={m.id}
                style={{
                  padding: "14px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-dark)" }}>
                    {m.nome} {m.cognome}
                  </span>
                  <span style={pillolaStyle}>{ruoloMentorLabel(m.ruolo)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-mid)", margin: "4px 0 0" }}>
                  {m.organizzazione}
                  {aree.length > 0 ? ` . ${aree.map(areaLabel).join(", ")}` : ""}
                </p>
                {m.bio && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-mid)",
                      lineHeight: 1.65,
                      margin: "8px 0 0",
                    }}
                  >
                    {m.bio}
                  </p>
                )}
                <div
                  className="flex flex-wrap items-center"
                  style={{ gap: 16, marginTop: 8, fontSize: 12.5 }}
                >
                  {contatto ? (
                    <a
                      href={contatto.href}
                      {...(contatto.esterno
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                    >
                      <i
                        className={`fas ${contatto.esterno ? "fa-link" : "fa-envelope"}`}
                        style={{ marginRight: 6 }}
                        aria-hidden="true"
                      />
                      {m.contatto_studenti}
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-light)" }}>
                      Nessun contatto messo a disposizione
                    </span>
                  )}
                  {m.sito && (
                    <a
                      href={m.sito}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                    >
                      Sito
                    </a>
                  )}
                  {m.linkedin && (
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.7, margin: "14px 0 0" }}>
        L&apos;elenco pubblico, senza contatti, è nella{" "}
        <Link href={MENTOR_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
          pagina dei mentor
        </Link>
        .
      </p>
    </div>
  );
}
