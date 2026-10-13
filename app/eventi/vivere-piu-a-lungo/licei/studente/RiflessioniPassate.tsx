"use client";

/**
 * Le consegne inviate prima dell'avviso: le possono leggere anche i docenti
 * dell'istituto? Lo sceglie lo studente, per se, sulla piattaforma.
 *
 * Tre posti, la stessa domanda e la stessa scelta:
 * - `RiflessioniPassateCard`: la card nell'area dello studente, con la
 *   scelta in vigore e «Cambia scelta». Compare solo a chi ha almeno una
 *   consegna di prima, o ha gia scelto;
 * - `RiflessioniPassatePagina`: la stessa card da sola, nella pagina del
 *   link che i docenti danno agli studenti (`RIFLESSIONI_STUDENTE_PATH`).
 *   Dove l'area non mostrerebbe niente, qui una frase e un link per tornare;
 * - `DomandaRiflessioniPassate` in versione compatta: il box della lezione
 *   la mostra una volta, sopra l'avviso, a chi non ha ancora scelto.
 *
 * Nessuna risposta e segnata in partenza: i due bottoni hanno lo stesso
 * peso, e finche lo studente non ne preme uno vale "restano allo staff".
 * La domanda e le etichette vengono da `content.ts`, le stesse che il
 * server congela con la scelta.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DOMANDA_RIFLESSIONI_PASSATE,
  ETICHETTE_RIFLESSIONI_PASSATE,
  LICEI_PATH,
  NOTA_RIFLESSIONI_PASSATE,
  STUDENTE_PATH,
  TITOLO_RIFLESSIONI_PASSATE,
  type SceltaRiflessioniPassate,
} from "../content";

const ROTTA = "/api/eventi/licei/studente/riflessioni-passate";

/** La scelta in vigore, come la usano i due posti. */
export type StatoSceltaPassate = {
  scelta: SceltaRiflessioniPassate | null;
  scelta_at: string | null;
};

const dataIt = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

/** Registra la scelta. Solleva con il messaggio della rotta. */
async function inviaScelta(scelta: SceltaRiflessioniPassate): Promise<StatoSceltaPassate> {
  const res = await fetch(ROTTA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scelta }),
  });
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corpo.error || "Non è stato possibile registrare la scelta.");
  return { scelta: corpo.scelta, scelta_at: corpo.scelta_at ?? null };
}

/**
 * La domanda, i due bottoni e la scelta fatta. Registra da se e avvisa chi
 * la usa con `onCambio`. Non tocca nient'altro: nel box della lezione la
 * consegna si salva anche mentre questa e in corso, o se fallisce.
 */
export function DomandaRiflessioniPassate({
  stato,
  onCambio,
  compatta = false,
}: {
  stato: StatoSceltaPassate;
  onCambio: (nuovo: StatoSceltaPassate) => void;
  /** Nel box della lezione: piu piccola, con il link all'area. */
  compatta?: boolean;
}) {
  const [cambia, setCambia] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const chiedi = stato.scelta === null || cambia;

  const scegli = async (scelta: SceltaRiflessioniPassate) => {
    setInvio(true);
    setErrore(null);
    try {
      onCambio(await inviaScelta(scelta));
      setCambia(false);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Non è stato possibile registrare la scelta.");
    } finally {
      setInvio(false);
    }
  };

  const piccolo: React.CSSProperties = {
    fontSize: compatta ? 12 : 12.5,
    color: "var(--text-light)",
    lineHeight: 1.6,
    margin: "8px 0 0",
  };
  const linkStile: React.CSSProperties = { color: "var(--primary-dark)", fontWeight: 600 };

  // Nel box il rimando all'area e un link; nell'area basta la frase.
  const nota = compatta ? (
    <>
      Puoi cambiare idea quando vuoi dalla{" "}
      <Link href={STUDENTE_PATH} style={linkStile}>
        tua area
      </Link>
      .
    </>
  ) : (
    NOTA_RIFLESSIONI_PASSATE
  );

  return (
    <div>
      <p style={{ fontSize: compatta ? 13 : 14, color: "var(--text-mid)", lineHeight: 1.65, margin: 0 }}>
        {DOMANDA_RIFLESSIONI_PASSATE}
      </p>

      {chiedi ? (
        <>
          <div className="flex flex-wrap gap-2 items-center" style={{ marginTop: 10 }}>
            {(["si", "no"] as const).map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                disabled={invio}
                onClick={() => scegli(s)}
              >
                {ETICHETTE_RIFLESSIONI_PASSATE[s]}
              </Button>
            ))}
            {cambia && (
              <button
                type="button"
                onClick={() => setCambia(false)}
                disabled={invio}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 13,
                  color: "var(--text-light)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            )}
          </div>
          <p style={piccolo}>{nota}</p>
        </>
      ) : (
        <div className="flex flex-wrap gap-3 items-center" style={{ marginTop: 10 }}>
          <p style={{ fontSize: compatta ? 13 : 14, color: "var(--text-dark)", lineHeight: 1.6, margin: 0 }}>
            Hai scelto: <strong>«{ETICHETTE_RIFLESSIONI_PASSATE[stato.scelta as SceltaRiflessioniPassate]}»</strong>
            {stato.scelta_at ? ` il ${dataIt(stato.scelta_at)}` : ""}.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setCambia(true)}>
            Cambia scelta
          </Button>
          {compatta && <p style={{ ...piccolo, flexBasis: "100%", margin: 0 }}>{nota}</p>}
        </div>
      )}

      {errore && (
        <p role="alert" style={{ color: "#E74C6F", fontSize: 13, margin: "8px 0 0" }}>
          {errore}
        </p>
      )}
    </div>
  );
}

type RispostaArea =
  | { disponibile: false }
  | (StatoSceltaPassate & { disponibile: true; riservate: number });

/**
 * Come ha risposto la rotta. `negata` e un 401 o un 403: chi chiama non e
 * uno studente del percorso (o non piu, a percorso chiuso), e `messaggio`
 * e quello della rotta. Esportato per le prove della pagina.
 */
export type LetturaPassate =
  | { fase: "carico" }
  | { fase: "negata"; messaggio: string }
  | { fase: "errore" }
  | { fase: "pronta"; dati: RispostaArea };

/** Legge la scelta una volta, e la aggiorna quando lo studente la cambia. */
function useLetturaPassate(): [LetturaPassate, (nuovo: StatoSceltaPassate) => void] {
  const [lettura, setLettura] = useState<LetturaPassate>({ fase: "carico" });

  const carica = useCallback(async () => {
    try {
      const res = await fetch(ROTTA, { cache: "no-store" });
      const corpo = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setLettura({ fase: "negata", messaggio: typeof corpo.error === "string" ? corpo.error : "" });
      } else if (!res.ok) {
        setLettura({ fase: "errore" });
      } else {
        setLettura({ fase: "pronta", dati: corpo as RispostaArea });
      }
    } catch {
      setLettura({ fase: "errore" });
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const aggiorna = useCallback((nuovo: StatoSceltaPassate) => {
    setLettura((prima) =>
      prima.fase === "pronta" && prima.dati.disponibile
        ? { fase: "pronta", dati: { ...prima.dati, ...nuovo } }
        : prima,
    );
  }, []);

  return [lettura, aggiorna];
}

/** C'e qualcosa da decidere: consegne di prima, o una scelta gia fatta. */
function daMostrare(lettura: LetturaPassate): (StatoSceltaPassate & { riservate: number }) | null {
  if (lettura.fase !== "pronta" || !lettura.dati.disponibile) return null;
  const dati = lettura.dati;
  return dati.riservate === 0 && dati.scelta === null ? null : dati;
}

/**
 * La card nell'area dello studente. Legge da se, e non mostra niente se la
 * funzione non c'e, se lo studente non e iscritto, o se non ha consegne di
 * prima e non ha mai scelto: in quel caso non c'e niente da decidere.
 * Silenziosa anche sugli errori: e una card in piu, non deve fare rumore.
 */
export function RiflessioniPassateCard() {
  const [lettura, aggiorna] = useLetturaPassate();
  const dati = daMostrare(lettura);
  if (!dati) return null;
  return <CardRiflessioniPassate dati={dati} onCambio={aggiorna} />;
}

/**
 * La pagina del link diretto: la stessa card dell'area, e nient'altro.
 * Dove l'area non mostrerebbe niente, qui lo si dice, con un link per
 * tornare: chi apre un link si aspetta una risposta.
 */
export function RiflessioniPassatePagina() {
  const [lettura, aggiorna] = useLetturaPassate();
  return <VistaRiflessioniPassatePagina lettura={lettura} onCambio={aggiorna} />;
}

/** Quello che la pagina mostra per ogni risposta, esportato per le prove. */
export function VistaRiflessioniPassatePagina({
  lettura,
  onCambio,
}: {
  lettura: LetturaPassate;
  onCambio: (nuovo: StatoSceltaPassate) => void;
}) {
  if (lettura.fase === "carico") return <p className="text-gray-600">Caricamento…</p>;

  const dati = daMostrare(lettura);
  if (dati) return <CardRiflessioniPassate dati={dati} onCambio={onCambio} />;

  // Chi non e uno studente del percorso torna al bando; uno studente torna
  // alla sua area.
  const messaggio =
    lettura.fase === "negata"
      ? lettura.messaggio || "Questa pagina è riservata agli studenti iscritti al percorso."
      : lettura.fase === "errore"
        ? "Non è stato possibile leggere la tua scelta. Riprova fra poco."
        : !lettura.dati.disponibile
          ? "Questa scelta non è ancora disponibile. Le consegne inviate prima dell'avviso restano allo staff."
          : "Non hai riflessioni inviate prima dell'avviso, quindi non c'è niente da scegliere.";
  const [href, etichetta] = lettura.fase === "negata" ? [LICEI_PATH, "Torna al bando"] : [STUDENTE_PATH, "Vai alla tua area"];

  return (
    <div className="card text-center" style={{ padding: 40 }} lang="it">
      <h2 className="text-xl font-bold text-gray-800 mb-2">{TITOLO_RIFLESSIONI_PASSATE}</h2>
      <p className="text-gray-600 mb-5">{messaggio}</p>
      <Link href={href} className="btn-outline inline-block">
        {etichetta}
      </Link>
    </div>
  );
}

/** Quello che la card mostra, esportato per le prove. */
export function CardRiflessioniPassate({
  dati,
  onCambio,
}: {
  dati: StatoSceltaPassate;
  onCambio: (nuovo: StatoSceltaPassate) => void;
}) {
  return (
    <div className="card" style={{ padding: 22 }} lang="it">
      <h2 className="font-semibold text-gray-800 mb-2" style={{ fontSize: 16 }}>
        {TITOLO_RIFLESSIONI_PASSATE}
      </h2>
      <DomandaRiflessioniPassate stato={dati} onCambio={onCambio} />
    </div>
  );
}
