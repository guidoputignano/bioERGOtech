"use client";

/**
 * La scheda del prossimo talk nelle aree riservate: studente dei licei,
 * docente dei licei, partecipante universitario.
 *
 * Il talk arriva come props dalla pagina server (`schedaTalk`, senza il link
 * della riunione); lo stato di chi guarda arriva dalla rotta
 * dell'iscrizione, la stessa della pagina del talk. Se la rotta dice che chi
 * guarda non puo iscriversi (per esempio uno studente ancora senza
 * iscrizione che apre l'area), la scheda non compare: proporre un talk a cui
 * non si puo accedere e solo rumore.
 *
 * Per il docente c'e in piu un numero: quanti studenti del suo istituto si
 * sono iscritti; la rotta lo manda solo a chi ha accettato le istruzioni per
 * i docenti. I nomi non passano da qui: li porta l'elenco degli studenti
 * della console, che segna ognuno con i suoi talk, e la scheda lo dice.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { TESTI_TALK as T } from "./testi";
import { VoltoRelatore } from "./Relatore";
// Solo i tipi: i moduli sono del server.
import type { TalkScheda } from "./content";
import type { StatoTalk } from "@/lib/eventi/talk-server";

export function TalkAreaCard({
  talk,
  contesto,
}: {
  talk: TalkScheda;
  contesto: "studente" | "docente";
}) {
  const [stato, setStato] = useState<StatoTalk | null>(null);

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/eventi/talk/${encodeURIComponent(talk.slug)}/iscrizione`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatoTalk;
        if (attivo) setStato(data);
      } catch {
        // Senza stato la scheda resta com'e: il link alla pagina basta.
      }
    })();
    return () => {
      attivo = false;
    };
  }, [talk.slug]);

  if (stato && stato.autenticato && !stato.idoneo) return null;

  const iscritto = stato?.iscritto === true;
  const n = stato?.iscritti_istituto;

  return (
    <div className="card" style={{ padding: 22 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#0A7A66",
          marginBottom: 12,
        }}
      >
        {talk.occhiello}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <VoltoRelatore
          nome={talk.relatore.nome}
          iniziali={talk.relatore.iniziali}
          foto={talk.relatore.foto}
          dimensione={56}
        />
        <div style={{ minWidth: 0 }}>
          <h2 className="font-semibold text-gray-800" style={{ fontSize: 16, margin: "0 0 4px", lineHeight: 1.35 }}>
            {talk.titolo}
          </h2>
          <p className="text-sm text-gray-600" style={{ margin: 0, lineHeight: 1.6 }}>
            Con {talk.relatore.nome}, {talk.relatore.ruolo}.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-dark)", fontWeight: 600, margin: "6px 0 0", lineHeight: 1.6 }}>
            {talk.dataLabel}, {talk.orarioLabel} . {talk.luogo}
          </p>
        </div>
      </div>

      {contesto === "docente" && (
        <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "14px 0 0" }}>
          {typeof n === "number" && (
            <strong style={{ color: "var(--text-dark)" }}>
              {n === 1
                ? "1 studente del vostro istituto si è iscritto. "
                : `${n} studenti del vostro istituto si sono iscritti. `}
            </strong>
          )}
          {typeof n === "number" &&
            n > 0 &&
            `Nell'elenco degli studenti li trova segnati con «${talk.etichetta}», e può filtrarli. `}
          Il talk è aperto agli studenti del percorso e ai loro docenti: potete iscrivervi anche voi.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 16 }}>
        {iscritto ? (
          <>
            <span className="badge badge-primary">
              <i className="fas fa-check" aria-hidden="true" style={{ marginRight: 6 }} />
              {T.iscritto}
            </span>
            <Link href={talk.path} className="btn-outline" style={{ padding: "9px 20px", fontSize: 13 }}>
              {T.vaiAlTalk}
            </Link>
          </>
        ) : (
          <Link href={`${talk.path}#iscrizione`} className="btn-primary" style={{ padding: "11px 24px", fontSize: 13 }}>
            {stato && !stato.disponibile ? T.vaiAlTalk : T.iscriviti}
          </Link>
        )}
      </div>
    </div>
  );
}
