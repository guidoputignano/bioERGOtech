"use client";

/**
 * Il cancello delle istruzioni per i docenti.
 *
 * Ogni docente, referente principale compreso, le accetta al primo accesso e
 * di nuovo quando cambiano. Fino ad allora la console mostra questo e nient'
 * altro: la rotta del referente non manda dati di studenti, e questa
 * schermata non ne chiede. Il testo arriva dal server, lo stesso che si
 * congela con l'accettazione: quello che il docente spunta e quello che
 * resta registrato.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dataDocumento } from "../documenti";
// Solo il tipo: il modulo e del server e nel browser non arriva.
import type { TestoIstruzioniDocente } from "@/lib/eventi/licei-server";

type RispostaIstruzioni = {
  disponibile: boolean;
  versione: string;
  testo: TestoIstruzioniDocente;
  accettate: boolean;
  documenti: { istruzioni: string; informativa_scuole: string };
};

export function AccettazioneIstruzioni({
  istituto,
  area,
  onAccettate,
}: {
  /** La denominazione dell'istituto, per l'intestazione. */
  istituto: string;
  /** "Area del docente referente", oppure quella dei docenti del progetto. */
  area: string;
  /** Chiamata dopo l'accettazione: la console ricarica i dati. */
  onAccettate: () => void;
}) {
  const [istruzioni, setIstruzioni] = useState<RispostaIstruzioni | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [spuntata, setSpuntata] = useState(false);
  const [invio, setInvio] = useState(false);

  const carica = useCallback(async () => {
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/referente/istruzioni", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setIstruzioni(data);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const accetta = async () => {
    setInvio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/referente/istruzioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accetto: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Non è stato possibile registrare l'accettazione.");
      onAccettate();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Non è stato possibile registrare l'accettazione.");
      setInvio(false);
    }
  };

  const link = { color: "var(--primary-dark)", fontWeight: 600 } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{istituto}</h1>
        <p className="text-sm text-gray-600">{area}</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <span
          className="badge"
          style={{ background: "var(--primary-light)", color: "var(--primary-dark)", marginBottom: 12 }}
        >
          Prima di iniziare
        </span>

        {!istruzioni && !errore && <p className="text-gray-600">Caricamento…</p>}

        {/* Gia accettate (per esempio da un'altra scheda), o funzione non
            ancora attiva: niente da accettare. Si prosegue con un clic e non
            da soli, cosi una risposta incoerente non fa girare la pagina in
            tondo. */}
        {istruzioni && (istruzioni.accettate || !istruzioni.disponibile) && (
          <>
            <p className="text-gray-700" style={{ lineHeight: 1.7, marginBottom: 14 }}>
              Le istruzioni per i docenti risultano già accettate.
            </p>
            <Button type="button" onClick={onAccettate}>
              Continua
            </Button>
          </>
        )}

        {istruzioni && !istruzioni.accettate && istruzioni.disponibile && (
          <>
            <h2 className="text-xl font-bold text-gray-800" style={{ marginBottom: 6 }}>
              {istruzioni.testo.titolo}
            </h2>
            <p className="text-sm text-gray-500" style={{ marginBottom: 14 }}>
              Versione del {dataDocumento(istruzioni.versione)}
            </p>
            <p className="text-gray-700" style={{ lineHeight: 1.7, marginBottom: 14 }}>
              Prima di vedere i dati degli studenti le chiediamo di leggere e accettare le istruzioni
              per i docenti. Si accettano una volta, al primo accesso, e di nuovo solo quando
              cambiano.
            </p>

            <div
              style={{
                background: "var(--bg-light)",
                borderRadius: 12,
                padding: "16px 18px",
                fontSize: 14,
                color: "var(--text-dark)",
                lineHeight: 1.7,
              }}
            >
              <p style={{ margin: "0 0 10px" }}>{istruzioni.testo.intro}</p>
              {istruzioni.testo.sezioni.map((s) => (
                <div key={s.h} style={{ marginTop: 12 }}>
                  <h3 className="font-semibold text-gray-800" style={{ fontSize: 14.5, marginBottom: 6 }}>
                    {s.h}
                  </h3>
                  {s.p?.map((x) => (
                    <p key={x} style={{ margin: "0 0 6px" }}>
                      {x}
                    </p>
                  ))}
                  {s.ul && (
                    <ul className="list-disc pl-5 space-y-1" style={{ margin: "0 0 6px" }}>
                      {s.ul.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  )}
                  {s.dopo?.map((x) => (
                    <p key={x} style={{ margin: "6px 0 0" }}>
                      {x}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "14px 0 18px" }}>
              Lo stesso testo, da stampare, è nella pagina delle{" "}
              <Link href={istruzioni.documenti.istruzioni} target="_blank" style={link}>
                istruzioni per i docenti
              </Link>
              . Il trattamento dei suoi dati e di quelli degli studenti è descritto
              nell&apos;
              <Link href={istruzioni.documenti.informativa_scuole} target="_blank" style={link}>
                informativa privacy per scuole e docenti referenti
              </Link>
              .
            </p>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                fontSize: 14,
                color: "var(--text-dark)",
                lineHeight: 1.6,
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                checked={spuntata}
                onChange={(e) => setSpuntata(e.target.checked)}
                style={{ marginTop: 4, width: 16, height: 16, flexShrink: 0, accentColor: "var(--primary)" }}
              />
              <span>{istruzioni.testo.dichiarazione}</span>
            </label>

            <Button type="button" onClick={accetta} disabled={!spuntata || invio}>
              {invio ? "Registrazione…" : "Accetto"}
            </Button>
            <p className="text-xs text-gray-500" style={{ marginTop: 10, lineHeight: 1.6 }}>
              Registriamo la data, la versione e il testo che ha accettato.
            </p>
          </>
        )}

        {errore && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "#E74C6F", fontSize: 14, margin: "0 0 10px" }}>{errore}</p>
            {!istruzioni && (
              <Button type="button" variant="outline" onClick={carica}>
                Riprova
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
