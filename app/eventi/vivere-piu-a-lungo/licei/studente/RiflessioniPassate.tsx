"use client";

/**
 * Le consegne inviate prima dell'avviso: le leggono anche i docenti
 * dell'istituto, tre giorni dopo che la piattaforma lo segnala allo
 * studente, a meno che lui dica di no. Con «Va bene», subito.
 *
 * Tre posti, lo stesso avviso e la stessa scelta:
 * - `RiflessioniPassateCard`: la card nell'area dello studente, con lo
 *   stato in vigore e «Cambia scelta». Compare solo a chi ha almeno una
 *   consegna di prima, o ha gia scelto;
 * - `RiflessioniPassatePagina`: la stessa card da sola, nella pagina del
 *   link che i docenti danno agli studenti (`RIFLESSIONI_STUDENTE_PATH`).
 *   Dove l'area non mostrerebbe niente, qui una frase e un link per tornare;
 * - `AvvisoRiflessioniPassate` in versione compatta: il box della lezione
 *   lo mostra, in qualsiasi lezione, a chi non ha ancora scelto, finche non
 *   preme uno dei due bottoni. Passati i giorni di preavviso, con il testo
 *   al presente.
 *
 * La prima volta che l'avviso e davvero a schermo (almeno a meta, per un
 * secondo, con la scheda in primo piano), il componente lo dice al server
 * (`{ azione: 'visto' }`): da li si contano i giorni di preavviso. Montato
 * e basta non conta: il box sta in fondo alla lezione e la card in fondo
 * all'area, e chi non ci arriva non l'ha visto. Una volta sola, e senza
 * bloccare niente: se non riesce, l'avviso resta a schermo e lo si segnala
 * alla prossima apertura. Prima di quella risposta la data mostrata e oggi
 * piu i giorni di preavviso.
 *
 * Chi legge adesso le consegne di prima lo dice il server, con la sua ora
 * (`visibili`): il browser non lo rifa con l'orologio del dispositivo, che
 * puo essere indietro.
 *
 * Nessuna risposta e segnata in partenza: i due bottoni hanno lo stesso
 * aspetto. Testi da `content.ts`, gli stessi che il server congela.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ESITO_RIFLESSIONI_PASSATE,
  ETICHETTE_RIFLESSIONI_PASSATE,
  LICEI_PATH,
  NOTA_RIFLESSIONI_PASSATE,
  STUDENTE_PATH,
  TITOLO_RIFLESSIONI_PASSATE,
  testoAvvisoRiflessioniPassate,
  visibiliDalRiflessioniPassate,
  type SceltaRiflessioniPassate,
} from "../content";

const ROTTA = "/api/eventi/licei/studente/riflessioni-passate";

/**
 * Quando l'avviso conta come visto: almeno questa parte a schermo, per
 * almeno questo tempo, con la scheda in primo piano.
 */
const SOGLIA_VISTO = 0.5;
const PERMANENZA_VISTO_MS = 1000;

/** Avviso e scelta in vigore, come li usano i tre posti. */
export type StatoSceltaPassate = {
  scelta: SceltaRiflessioniPassate | null;
  /** Quando l'avviso e stato mostrato la prima volta; null se mai. */
  avvisato_at: string | null;
  /** Da quando, senza una scelta, i docenti leggono; null se mai mostrato. */
  visibili_dal: string | null;
  /**
   * I docenti leggono adesso le consegne di prima? Lo dice il server, con
   * la sua ora; assente solo se la risposta non lo porta.
   */
  visibili?: boolean;
};

/**
 * Il box della lezione mostra l'avviso? Solo finche non c'e una scelta, e
 * solo a chi ha almeno una consegna di prima. `rp` e `riflessioni_passate`
 * della rotta delle consegne: null per chi non e del percorso, o quando la
 * funzione non c'e.
 */
export const avvisoPassateNelBox = (
  rp: { scelta?: unknown; riservate?: unknown } | null | undefined,
): boolean => !!rp && rp.scelta == null && typeof rp.riservate === "number" && rp.riservate > 0;

/** Registra l'avviso visto o una scelta. Solleva con il messaggio della rotta. */
async function invia(
  corpo: { azione: "visto" } | { scelta: SceltaRiflessioniPassate },
): Promise<StatoSceltaPassate> {
  const res = await fetch(ROTTA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const dati = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dati.error || "Non è stato possibile registrare la scelta.");
  return {
    scelta: dati.scelta ?? null,
    avvisato_at: dati.avvisato_at ?? null,
    visibili_dal: dati.visibili_dal ?? null,
    ...(typeof dati.visibili === "boolean" ? { visibili: dati.visibili } : {}),
  };
}

/**
 * L'avviso, i due bottoni e l'esito della scelta. Registra da se e avvisa
 * chi lo usa con `onCambio`, che riceve solo i campi cambiati. Non tocca
 * nient'altro: nel box della lezione la consegna si salva anche mentre una
 * richiesta e in corso, o se fallisce.
 */
export function AvvisoRiflessioniPassate({
  stato,
  onCambio,
  compatta = false,
}: {
  stato: StatoSceltaPassate;
  onCambio: (nuovo: Partial<StatoSceltaPassate>) => void;
  /** Nel box della lezione: piu piccolo, con il link all'area. */
  compatta?: boolean;
}) {
  const [cambia, setCambia] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const segnalato = useRef(false);
  // Il testo dell'avviso e i due bottoni: e questo che deve essere a
  // schermo perche l'avviso conti come visto.
  const avvisoRef = useRef<HTMLDivElement>(null);

  // L'avviso (prima o dopo la data) e a schermo finche non c'e una scelta,
  // o dopo «Cambia scelta».
  const mostraAvviso = stato.scelta === null || cambia;

  // La prima volta che l'avviso e davvero a schermo e il server non lo sa
  // ancora: almeno a meta nel viewport, per PERMANENZA_VISTO_MS di fila,
  // con la scheda in primo piano. Montato fuori dallo schermo, o in una
  // scheda in background, non conta. Senza IntersectionObserver non lo si
  // puo sapere, e non si segnala: conta il clic su un bottone. Della
  // risposta servono solo le date: la scelta, se nel frattempo e arrivata,
  // resta quella del bottone.
  useEffect(() => {
    const el = avvisoRef.current;
    if (!mostraAvviso || stato.avvisato_at || segnalato.current || !el) return;
    if (typeof IntersectionObserver === "undefined") return;

    let aSchermo = false;
    let attesa: ReturnType<typeof setTimeout> | undefined;
    const osservatore = new IntersectionObserver(
      (voci) => {
        const ultima = voci[voci.length - 1];
        aSchermo = !!ultima && ultima.isIntersecting && ultima.intersectionRatio >= SOGLIA_VISTO;
        ricontrolla();
      },
      { threshold: SOGLIA_VISTO },
    );

    function visibile() {
      return aSchermo && document.visibilityState === "visible";
    }
    function ricontrolla() {
      clearTimeout(attesa);
      if (visibile()) attesa = setTimeout(segnala, PERMANENZA_VISTO_MS);
    }
    function smetti() {
      clearTimeout(attesa);
      osservatore.disconnect();
      document.removeEventListener("visibilitychange", ricontrolla);
    }
    function segnala() {
      if (segnalato.current || !visibile()) return;
      segnalato.current = true;
      smetti();
      invia({ azione: "visto" })
        .then((nuovo) => onCambio({ avvisato_at: nuovo.avvisato_at, visibili_dal: nuovo.visibili_dal }))
        .catch(() => {});
    }

    osservatore.observe(el);
    document.addEventListener("visibilitychange", ricontrolla);
    return smetti;
  }, [mostraAvviso, stato.avvisato_at, onCambio]);

  const scegli = async (scelta: SceltaRiflessioniPassate) => {
    setInvio(true);
    setErrore(null);
    try {
      onCambio(await invia({ scelta }));
      setCambia(false);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Non è stato possibile registrare la scelta.");
    } finally {
      setInvio(false);
    }
  };

  const adesso = new Date();
  const visibiliDal = stato.visibili_dal
    ? new Date(stato.visibili_dal)
    : visibiliDalRiflessioniPassate(adesso);
  // Senza una scelta, i docenti leggono se e solo se la data e passata: lo
  // dice il server. Con una scelta (dopo «Cambia scelta») `visibili` segue
  // la scelta, non la data, e si confronta con l'ora del dispositivo.
  const dataPassata = stato.scelta === null && typeof stato.visibili === "boolean" ? stato.visibili : undefined;

  const testo: React.CSSProperties = {
    fontSize: compatta ? 13 : 14,
    color: "var(--text-mid)",
    lineHeight: 1.65,
    margin: 0,
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
      {mostraAvviso ? (
        <>
          <div ref={avvisoRef}>
            <p style={testo}>{testoAvvisoRiflessioniPassate(visibiliDal, adesso, dataPassata)}</p>
            <div className="flex flex-wrap gap-2 items-center" style={{ marginTop: 10 }}>
              {/* "Va bene" in evidenza: i docenti sono gia lo standard, e
                  accettare deve essere facile. "Preferisco di no" resta
                  accanto, visibile e a un clic, senza altri passaggi. */}
              {(["si", "no"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={s === "si" ? "default" : "outline"}
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
          </div>
          <p style={piccolo}>{nota}</p>
        </>
      ) : (
        <>
          <p style={{ ...testo, color: "var(--text-dark)" }}>
            {ESITO_RIFLESSIONI_PASSATE[stato.scelta as SceltaRiflessioniPassate]}
          </p>
          <div className="flex flex-wrap gap-3 items-center" style={{ marginTop: 10 }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setCambia(true)}>
              Cambia scelta
            </Button>
          </div>
          {compatta && <p style={piccolo}>{nota}</p>}
        </>
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
  | (StatoSceltaPassate & { disponibile: true; riservate: number; scelta_at?: string | null });

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

/** Legge avviso e scelta una volta, e li aggiorna quando cambiano. */
function useLetturaPassate(): [LetturaPassate, (nuovo: Partial<StatoSceltaPassate>) => void] {
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

  const aggiorna = useCallback((nuovo: Partial<StatoSceltaPassate>) => {
    setLettura((prima) =>
      prima.fase === "pronta" && prima.dati.disponibile
        ? { fase: "pronta", dati: { ...prima.dati, ...nuovo } }
        : prima,
    );
  }, []);

  return [lettura, aggiorna];
}

/** C'e qualcosa da mostrare: consegne di prima, o una scelta gia fatta. */
function daMostrare(lettura: LetturaPassate): (StatoSceltaPassate & { riservate: number }) | null {
  if (lettura.fase !== "pronta" || !lettura.dati.disponibile) return null;
  const dati = lettura.dati;
  return dati.riservate === 0 && dati.scelta === null ? null : dati;
}

/**
 * La card nell'area dello studente. Legge da se, e non mostra niente se la
 * funzione non c'e, se lo studente non e iscritto, o se non ha consegne di
 * prima e non ha mai scelto: in quel caso non c'e niente da segnalare.
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
  onCambio: (nuovo: Partial<StatoSceltaPassate>) => void;
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
  onCambio: (nuovo: Partial<StatoSceltaPassate>) => void;
}) {
  return (
    <div className="card" style={{ padding: 22 }} lang="it">
      <h2 className="font-semibold text-gray-800 mb-2" style={{ fontSize: 16 }}>
        {TITOLO_RIFLESSIONI_PASSATE}
      </h2>
      <AvvisoRiflessioniPassate stato={dati} onCambio={onCambio} />
    </div>
  );
}
