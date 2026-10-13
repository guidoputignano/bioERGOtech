"use client";

/**
 * Riflessioni e domande delle lezioni, nella console del referente e dei
 * docenti del progetto.
 *
 * Due letture, tutte e due su un clic e mai all'apertura della pagina:
 * - `RiflessioniStudente`: il pannello sotto la riga di uno studente
 *   confermato, con le sue consegne;
 * - `RiflessioniPerLezione`: «Leggi per lezione», una lezione per tutti gli
 *   studenti dell'istituto, con lo stesso filtro per classe dell'elenco.
 *
 * Sola lettura: niente risposta, niente export, niente notifiche. I testi
 * sono di studenti, spesso minorenni, e si mostrano come testo semplice di
 * React, senza HTML. Che cosa arriva e che cosa no lo decide il server
 * (lib/eventi/licei-riflessioni.ts): solo le consegne salvate dopo l'avviso
 * nel box della lezione, del commento niente, della risposta dello staff
 * solo la data. Qui la nota fissa lo dice al docente, con il numero delle
 * consegne che restano riservate.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SUBMITTABLE_LESSONS } from "@/app/courses/course-data";
// Solo i tipi: il modulo e del server.
import type {
  ConsegnaCondivisa,
  RiflessioniRisposta,
  StudenteRiflessioni,
} from "@/lib/eventi/licei-riflessioni";
import { corrispondeClasse, type FiltroClassi } from "./filtroPerClasse";

const ROTTA = "/api/eventi/licei/referente/riflessioni";

const data = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

const consegneRiservate = (n: number): string =>
  n === 0 ? "nessuna consegna riservata" : n === 1 ? "1 consegna riservata" : `${n} consegne riservate`;

/** Testo di uno studente: a capo dove li ha messi lui, e niente HTML. */
const testoStudente: React.CSSProperties = {
  fontSize: 13.5,
  color: "var(--text-dark)",
  lineHeight: 1.65,
  margin: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

const etichetta: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-light)",
  margin: "10px 0 4px",
};

/** A che punto e una lettura. Esportato per le prove dei due pannelli. */
export type StatoLettura =
  | { fase: "vuoto" }
  | { fase: "carico" }
  | { fase: "errore"; messaggio: string }
  | { fase: "pronto"; risposta: RiflessioniRisposta };

/**
 * Una richiesta alla rotta. Una risposta arrivata tardi, dopo che il
 * docente ha gia chiesto altro, non sovrascrive quella nuova.
 */
function useLettura() {
  const [stato, setStato] = useState<StatoLettura>({ fase: "vuoto" });
  const ultima = useRef(0);

  const leggi = useCallback(async (parametri: Record<string, string>) => {
    const n = ++ultima.current;
    setStato({ fase: "carico" });
    try {
      const res = await fetch(`${ROTTA}?${new URLSearchParams(parametri)}`, { cache: "no-store" });
      const corpo = await res.json();
      if (n !== ultima.current) return;
      if (!res.ok) throw new Error(corpo.error || "Lettura non riuscita.");
      setStato({ fase: "pronto", risposta: corpo as RiflessioniRisposta });
    } catch (err) {
      if (n !== ultima.current) return;
      setStato({ fase: "errore", messaggio: err instanceof Error ? err.message : "Lettura non riuscita." });
    }
  }, []);

  return { stato, leggi };
}

/** La nota fissa: che cosa vede il docente, e che cosa resta allo staff. */
function NotaRiflessioni({ riservate }: { riservate: string | null }) {
  return (
    <div
      style={{
        background: "var(--bg-light)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12.5,
        color: "var(--text-mid)",
        lineHeight: 1.7,
      }}
    >
      Qui legge la riflessione e la domanda che gli studenti confermati hanno inviato nelle lezioni
      dopo aver letto, nel box della lezione, che le leggono anche i docenti del loro istituto. Le
      consegne precedenti restano riservate allo staff della Fondazione: erano state scritte quando
      agli studenti avevamo detto che le leggeva solo lo staff.
      {riservate && <strong style={{ color: "var(--text-dark)" }}> {riservate}</strong>} Il commento
      resta sempre allo staff. Alle domande risponde lo staff della Fondazione: qui vede soltanto se
      ha risposto e quando. I testi servono a seguire il percorso e non vanno proiettati in classe né
      condivisi.
    </div>
  );
}

function NonDisponibile() {
  return (
    <p className="text-sm text-gray-600" style={{ margin: 0, lineHeight: 1.7 }}>
      Funzione in attivazione: la lettura delle riflessioni non è ancora attiva.
    </p>
  );
}

/** Una consegna. `titolo` e la lezione, o lo studente nella lettura per lezione. */
function Consegna({ titolo, c }: { titolo: React.ReactNode; c: ConsegnaCondivisa }) {
  return (
    <li
      style={{
        listStyle: "none",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        padding: "12px 14px",
        minWidth: 0,
      }}
    >
      <div className="flex flex-wrap items-baseline gap-2" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-dark)", minWidth: 0, overflowWrap: "anywhere" }}>
          {titolo}
        </span>
        {c.salvata_at && (
          <span style={{ fontSize: 11.5, color: "var(--text-light)", flexShrink: 0 }}>
            salvata il {data(c.salvata_at)}
          </span>
        )}
      </div>
      <p style={etichetta}>Riflessione</p>
      <p style={testoStudente}>{c.riflessione}</p>
      {c.domanda && (
        <>
          <p style={etichetta}>Domanda</p>
          <p style={testoStudente}>{c.domanda}</p>
        </>
      )}
      {(c.risposta_staff_at || c.domanda) && (
        <p style={{ fontSize: 12, color: "var(--text-light)", margin: "10px 0 0" }}>
          {c.risposta_staff_at
            ? `Lo staff ha risposto il ${data(c.risposta_staff_at)}.`
            : "Lo staff non ha ancora risposto."}
        </p>
      )}
    </li>
  );
}

const elenco: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  margin: 0,
  padding: 0,
};

/**
 * Il pannello di uno studente, sotto la sua riga. Si monta al clic sul
 * bottone «Riflessioni» e legge in quel momento.
 */
export function RiflessioniStudente({ iscrizioneId }: { iscrizioneId: string }) {
  const { stato, leggi } = useLettura();

  useEffect(() => {
    leggi({ iscrizione: iscrizioneId });
  }, [iscrizioneId, leggi]);

  return <PannelloStudente stato={stato} />;
}

/** Quello che il pannello di uno studente mostra, per ogni fase della lettura. */
export function PannelloStudente({ stato }: { stato: StatoLettura }) {
  const studente: StudenteRiflessioni | null =
    stato.fase === "pronto" && stato.risposta.disponibile ? (stato.risposta.studenti[0] ?? null) : null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border-color)",
        borderLeft: "3px solid var(--primary)",
        borderRadius: "0 10px 10px 0",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      {stato.fase === "carico" || stato.fase === "vuoto" ? (
        <p className="text-sm text-gray-600" style={{ margin: 0 }}>
          Caricamento…
        </p>
      ) : stato.fase === "errore" ? (
        <p style={{ color: "#E74C6F", fontSize: 13.5, margin: 0 }}>{stato.messaggio}</p>
      ) : !stato.risposta.disponibile ? (
        <NonDisponibile />
      ) : (
        <>
          <NotaRiflessioni
            riservate={studente ? `Per questo studente: ${consegneRiservate(studente.riservate)}.` : null}
          />
          {!studente || studente.consegne.length === 0 ? (
            <p className="text-sm text-gray-600" style={{ margin: 0 }}>
              Nessuna consegna da leggere, per ora.
            </p>
          ) : (
            <ul style={elenco}>
              {studente.consegne.map((c) => (
                <Consegna
                  key={c.lezione.slug}
                  c={c}
                  titolo={c.lezione.numero ? `Lezione ${c.lezione.numero} . ${c.lezione.titolo}` : c.lezione.titolo}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * «Leggi per lezione»: una lezione, per tutti gli studenti confermati
 * dell'istituto che l'hanno consegnata, con il filtro per classe della
 * console. La lezione si sceglie dalla tendina, e la lettura parte allora.
 */
export function RiflessioniPerLezione({
  filtro,
  selettoreClasse,
}: {
  /** Il filtro per classe della console, lo stesso dell'elenco. */
  filtro: FiltroClassi;
  /** La select del filtro, legata allo stesso stato di quella in alto. */
  selettoreClasse?: React.ReactNode;
}) {
  const [slug, setSlug] = useState("");
  const { stato, leggi } = useLettura();

  const scegli = (v: string) => {
    setSlug(v);
    if (v) leggi({ lezione: v });
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: "0 0 4px" }}>
        Riflessioni e domande delle lezioni
      </h2>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 12 }}>
        Si leggono su richiesta: una lezione per tutti gli studenti qui sotto, oppure uno studente
        con il bottone «Riflessioni» sulla sua riga nell&apos;elenco.
      </p>

      <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-light)",
            flex: "1 1 260px",
            minWidth: 0,
          }}
        >
          Leggi per lezione
          <select
            value={slug}
            onChange={(e) => scegli(e.target.value)}
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              padding: "0 10px",
              background: "#fff",
              color: "var(--text-dark)",
              fontSize: 13,
              width: "100%",
              minWidth: 0,
            }}
          >
            <option value="">Scegli una lezione</option>
            {SUBMITTABLE_LESSONS.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.number} . {l.title}
              </option>
            ))}
          </select>
        </label>
        {slug && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={stato.fase === "carico"}
            onClick={() => leggi({ lezione: slug })}
            style={{ alignSelf: "flex-end" }}
          >
            <i className="fas fa-rotate-right" style={{ marginRight: 4 }} />
            {stato.fase === "carico" ? "Lettura…" : "Aggiorna"}
          </Button>
        )}
      </div>

      {slug && selettoreClasse && (
        <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: 12 }}>
          {selettoreClasse}
          <span style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6 }}>
            {filtro.chiavi === null
              ? "Gli studenti di tutto l'istituto."
              : `Gli studenti di: ${filtro.etichetta}.`}
          </span>
        </div>
      )}

      <RisultatoLezione stato={slug ? stato : { fase: "vuoto" }} filtro={filtro} />
    </div>
  );
}

/**
 * Il risultato della lettura per lezione, con il filtro per classe
 * applicato. Le consegne riservate si contano sugli studenti che il filtro
 * lascia passare, come i testi.
 */
export function RisultatoLezione({ stato, filtro }: { stato: StatoLettura; filtro: FiltroClassi }) {
  const studenti = useMemo(
    () =>
      stato.fase === "pronto" && stato.risposta.disponibile
        ? stato.risposta.studenti.filter((s) => corrispondeClasse(filtro, s.classe))
        : [],
    [stato, filtro],
  );
  const conTesto = studenti.filter((s) => s.consegne.length > 0);
  const riservate = studenti.reduce((n, s) => n + s.riservate, 0);
  const ambito = filtro.chiavi === null ? "In questa lezione" : `In questa lezione, per ${filtro.etichetta}`;

  return (
    <>
      {stato.fase === "vuoto" ? (
        <NotaRiflessioni riservate={null} />
      ) : stato.fase === "carico" ? (
        <p className="text-sm text-gray-600" style={{ margin: 0 }}>
          Caricamento…
        </p>
      ) : stato.fase === "errore" ? (
        <p style={{ color: "#E74C6F", fontSize: 13.5, margin: 0 }}>{stato.messaggio}</p>
      ) : !stato.risposta.disponibile ? (
        <NonDisponibile />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <NotaRiflessioni riservate={`${ambito}: ${consegneRiservate(riservate)}.`} />
          {conTesto.length === 0 ? (
            <p className="text-sm text-gray-600" style={{ margin: 0 }}>
              Nessuna consegna da leggere per questa lezione, per ora.
            </p>
          ) : (
            <ul style={elenco}>
              {conTesto.map((s) =>
                s.consegne.map((c) => (
                  <Consegna
                    key={`${s.iscrizione_id}-${c.lezione.slug}`}
                    c={c}
                    titolo={
                      <>
                        {s.cognome} {s.nome}
                        {s.classe && <span style={{ color: "var(--text-light)", fontWeight: 400 }}> . {s.classe}</span>}
                      </>
                    }
                  />
                )),
              )}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
