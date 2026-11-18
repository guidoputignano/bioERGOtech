"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SessionStatus } from "@/lib/eventi/registration";
import { SESSIONS, giornateConArticolo, sessionBySlug } from "../../content";

/**
 * Il biglietto online gestito da chi lo ha: aggiungere una giornata,
 * liberare un posto, farsi rimandare il biglietto. Parla con
 * POST /api/eventi/registrations/gestisci, usando il codice come chiave.
 *
 * Tre pezzi, nello stesso file perché condividono la stessa logica:
 * - GestisciBiglietto, la sezione "Gestisci" in fondo al biglietto;
 * - InvitoAggiungi, il riquadro in cima quando si arriva dal link
 *   "Aggiungi l'11 dicembre" dell'email (?aggiungi=giorno-2);
 * - StampaBiglietto, il pulsante per stampare o salvare in PDF.
 *
 * Dopo ogni azione la pagina si aggiorna dal server (router.refresh) e
 * l'esito è annunciato in una regione aria-live.
 *
 * Lo stile (classi vpg-) sta in page.tsx: una costante esportata da un
 * modulo client non arriva al server come testo.
 */

/** Una giornata del biglietto, come la passa la pagina (solo quelle note al sito). */
export type GiornataGestibile = {
  slug: string;
  status: SessionStatus;
  /** Ingresso già registrato: da qui non si tocca più. */
  presente: boolean;
};

type Annuncio = { tipo: "ok" | "errore"; testo: string } | null;

type RispostaGestisci = {
  success?: boolean;
  error?: string;
  annullata?: boolean;
  invariato?: boolean;
  status?: SessionStatus;
  emailInviata?: boolean;
  /** Per "annulla": com'era la giornata tolta (posto confermato o lista d'attesa). */
  era?: SessionStatus;
};

const ENDPOINT = "/api/eventi/registrations/gestisci";
const TEMPO_MASSIMO_MS = 25_000;

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function messaggioPerStato(status: number): string {
  switch (status) {
    case 404:
      return "Non troviamo questo biglietto. Apri il link dall'email di conferma; se il problema continua, scrivi a info@bioergotech.org.";
    case 409:
      return "Questa giornata non si può più modificare da qui. Per qualsiasi necessità scrivi a info@bioergotech.org.";
    case 429:
      return "Troppe richieste in poco tempo. Aspetta un paio di minuti e riprova.";
    case 503:
      return "Il servizio non è disponibile in questo momento. Riprova tra qualche minuto.";
    default:
      return "Non siamo riusciti a completare l'operazione. Riprova tra qualche istante. Se il problema continua, scrivi a info@bioergotech.org.";
  }
}

/**
 * Il testo di successo per ogni azione, in base a quello che la rotta
 * risponde. Per "annulla" conta com'era la giornata: chi esce da una lista
 * d'attesa non ha liberato nessun posto, e non lo si ringrazia per questo.
 */
function messaggioSuccesso(
  azione: "annulla" | "aggiungi" | "reinvia",
  slug: string | undefined,
  r: RispostaGestisci,
  era: SessionStatus | undefined,
): string {
  const conArt = slug ? giornateConArticolo([slug]) : "";
  if (azione === "reinvia") {
    return "Fatto: ti abbiamo rimandato il biglietto all'indirizzo usato per l'iscrizione. Se non lo vedi tra qualche minuto, controlla anche nella cartella spam o Promozioni.";
  }
  if (azione === "annulla") {
    if (r.invariato) return `${maiuscola(conArt)} non è più nel tuo biglietto.`;
    const daAttesa = era === "lista_attesa";
    if (r.annullata) {
      return daAttesa
        ? "La tua iscrizione è stata annullata."
        : "Il tuo biglietto è stato annullato. Grazie per aver liberato il posto.";
    }
    return daAttesa
      ? `Fatto: non sei più in lista d'attesa per ${conArt}.`
      : `Fatto: ${conArt} non è più nel tuo biglietto. Grazie: il posto passa a chi è in lista d'attesa.`;
  }
  if (r.invariato) return `${maiuscola(conArt)} è già nel tuo biglietto.`;
  const email = r.emailInviata ? " Ti abbiamo mandato il biglietto aggiornato per email." : "";
  if (r.status === "lista_attesa") {
    return `Sei in lista d'attesa per ${conArt}: i posti sono al momento esauriti. Se si libera un posto ti scriviamo noi.${email}`;
  }
  return `Fatto: ${conArt} è nel tuo biglietto, con il posto confermato.${email}`;
}

/**
 * La logica condivisa: chiama la rotta, tiene lo stato "in corso", prepara
 * l'annuncio e aggiorna la pagina. Torna la risposta, o null se è fallita.
 */
function useAzioneBiglietto(codice: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [annuncio, setAnnuncio] = useState<Annuncio>(null);
  const annuncioRef = useRef<HTMLDivElement>(null);

  // Il focus va sul messaggio: il pulsante premuto può sparire con l'aggiornamento.
  useEffect(() => {
    if (annuncio) annuncioRef.current?.focus({ preventScroll: false });
  }, [annuncio]);

  const esegui = useCallback(
    async (
      azione: "annulla" | "aggiungi" | "reinvia",
      giornata?: string,
      /** Lo stato della giornata come lo mostra la pagina, se la rotta non dice "era". */
      statoNoto?: SessionStatus,
    ): Promise<RispostaGestisci | null> => {
      const chiave = `${azione}:${giornata ?? ""}`;
      setInCorso(chiave);
      setAnnuncio(null);
      const controllo = new AbortController();
      const timer = window.setTimeout(() => controllo.abort(), TEMPO_MASSIMO_MS);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codice, azione, giornata }),
          signal: controllo.signal,
        });
        let data: RispostaGestisci = {};
        try {
          data = ((await res.json()) ?? {}) as RispostaGestisci;
        } catch {
          data = {};
        }
        if (!res.ok || data.success !== true) {
          const testo = typeof data.error === "string" && data.error.trim() ? data.error : messaggioPerStato(res.status);
          setAnnuncio({ tipo: "errore", testo });
          // Lo stato sul server può essere cambiato (un'altra scheda, lo staff): si rilegge.
          if (res.status === 409) router.refresh();
          return null;
        }
        const era =
          data.era === "confermato" || data.era === "lista_attesa" ? data.era : statoNoto;
        setAnnuncio({ tipo: "ok", testo: messaggioSuccesso(azione, giornata, data, era) });
        if (azione === "annulla" && data.annullata) {
          // L'iscrizione non c'è più: la pagina mostra il messaggio di
          // annullamento, senza ringraziare per un posto se era solo in attesa.
          router.replace(`${pathname}?annullato=${era === "lista_attesa" ? "attesa" : "1"}`, { scroll: true });
        } else if (azione !== "reinvia") {
          router.refresh();
        }
        return data;
      } catch {
        setAnnuncio({
          tipo: "errore",
          testo: controllo.signal.aborted
            ? "La risposta sta tardando. Ricarica la pagina per vedere se l'operazione è andata a buon fine."
            : "Non riusciamo a raggiungere il sito. Controlla la connessione e riprova.",
        });
        return null;
      } finally {
        window.clearTimeout(timer);
        setInCorso(null);
      }
    },
    [codice, pathname, router],
  );

  return { esegui, inCorso, annuncio, annuncioRef };
}

/** La regione che annuncia l'esito. Sempre nel DOM, così i lettori di schermo la conoscono già. */
function RegioneAnnuncio({
  annuncio,
  annuncioRef,
}: {
  annuncio: Annuncio;
  annuncioRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    // Il ruolo non cambia mai: una regione che passa da status ad alert
    // dopo il montaggio non viene annunciata da tutti i lettori di schermo.
    <div
      ref={annuncioRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={annuncio ? `vpg-annuncio vpg-annuncio-${annuncio.tipo}` : "vpg-annuncio-vuoto"}
    >
      {annuncio && (
        <>
          <i className={`fas ${annuncio.tipo === "ok" ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden="true" />
          <span>{annuncio.testo}</span>
        </>
      )}
    </div>
  );
}

function Rotella() {
  return <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />;
}

/** I posti rimasti per giornata: quelli del server, aggiornati da /api/eventi/seats. */
function usePosti(iniziali: Record<string, number>, aggiorna: unknown) {
  const [live, setLive] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let attivo = true;
    fetch("/api/eventi/seats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (!attivo || !d || typeof d !== "object") return;
        const seats = (d as { seats?: unknown }).seats;
        if (!Array.isArray(seats)) return;
        const out: Record<string, number> = {};
        for (const p of seats) {
          if (p && typeof p === "object" && typeof (p as { slug?: unknown }).slug === "string") {
            const n = Number((p as { rimanenti?: unknown }).rimanenti);
            if (Number.isFinite(n)) out[(p as { slug: string }).slug] = n;
          }
        }
        if (Object.keys(out).length > 0) setLive(out);
      })
      .catch(() => {
        // Si resta con i posti del server: l'etichetta è solo un'indicazione,
        // la rotta decide comunque fra posto confermato e lista d'attesa.
      });
    return () => {
      attivo = false;
    };
  }, [aggiorna]);
  return { ...iniziali, ...(live ?? {}) };
}

/* ── La sezione "Gestisci" ───────────────────────────────────────────── */

export function GestisciBiglietto({
  codice,
  giornate,
  rimanenti,
  iniziate,
}: {
  codice: string;
  /** Le giornate del biglietto, solo quelle note al sito. */
  giornate: GiornataGestibile[];
  /** Posti rimasti per giornata, letti dal server al caricamento. */
  rimanenti: Record<string, number>;
  /** Le giornate già iniziate (calcolato sul server, nel fuso di Roma). */
  iniziate: string[];
}) {
  const { esegui, inCorso, annuncio, annuncioRef } = useAzioneBiglietto(codice);
  const posti = usePosti(rimanenti, giornate.map((g) => `${g.slug}:${g.status}`).join(","));
  const [daConfermare, setDaConfermare] = useState<string | null>(null);
  const occupato = inCorso !== null;
  const base = useId();
  const triggerRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const confermaRef = useRef<HTMLButtonElement>(null);

  // All'apertura della conferma il focus va sul pulsante sicuro ("No").
  useEffect(() => {
    if (daConfermare) confermaRef.current?.focus();
  }, [daConfermare]);

  const chiudiConferma = (slug: string) => {
    setDaConfermare(null);
    requestAnimationFrame(() => triggerRef.current[slug]?.focus());
  };

  const tenute = SESSIONS.filter((s) => giornate.some((g) => g.slug === s.slug));
  const mancanti = SESSIONS.filter((s) => !giornate.some((g) => g.slug === s.slug));
  const unica = giornate.length === 1;

  return (
    <div className="vpg">
      {tenute.length > 0 && (
        <ul className="vpg-elenco" aria-label="Le giornate del tuo biglietto">
          {tenute.map((s) => {
            const g = giornate.find((x) => x.slug === s.slug)!;
            const attesa = g.status === "lista_attesa";
            const bloccata = g.presente || iniziate.includes(s.slug);
            const aperta = daConfermare === s.slug;
            const idTesto = `${base}-conferma-${s.slug}`;
            const conArt = giornateConArticolo([s.slug]);
            const etichetta = attesa ? "Esci dalla lista d'attesa" : "Libera il posto";
            const testoConferma = unica
              ? `${maiuscola(conArt)} è l'unica giornata del tuo biglietto: ${attesa ? "uscendo dalla lista d'attesa" : "liberando il posto"}, il biglietto viene annullato.${attesa ? "" : " Il posto passa a chi è in lista d'attesa."}`
              : attesa
                ? `Vuoi uscire dalla lista d'attesa per ${conArt}? Non riceverai più avvisi per questa giornata. Il resto del biglietto non cambia.`
                : `Vuoi liberare il tuo posto per ${conArt}? Il posto passa a chi è in lista d'attesa. Il resto del biglietto non cambia.`;
            return (
              <li key={s.slug} className="vpg-riga">
                <div className="vpg-riga-testa">
                  <div className="vpg-info">
                    <span className="vpg-data">{s.giornoLabel}</span>
                    <span className="vpg-sotto">
                      {attesa ? "In lista d'attesa" : "Posto confermato"}, {s.luogoBreve}
                    </span>
                  </div>
                  {!bloccata && !aperta && (
                    <button
                      type="button"
                      ref={(el) => {
                        triggerRef.current[s.slug] = el;
                      }}
                      className="vpg-btn vpg-btn-tenue"
                      onClick={() => setDaConfermare(s.slug)}
                      disabled={occupato}
                    >
                      <i className="fas fa-xmark" aria-hidden="true" />
                      {etichetta}
                    </button>
                  )}
                </div>
                {bloccata && (
                  <p className="vpg-motivo">
                    <i className="fas fa-lock" aria-hidden="true" />{" "}
                    {g.presente
                      ? "Ingresso già registrato: questa giornata non si può più modificare."
                      : "La giornata è iniziata: non si può più modificare da qui."}
                  </p>
                )}
                {aperta && (
                  <div className="vpg-conferma" role="group" aria-labelledby={idTesto}>
                    <p id={idTesto}>{testoConferma}</p>
                    <div className="vpg-azioni">
                      <button
                        type="button"
                        className="vpg-btn vpg-btn-pericolo"
                        disabled={occupato}
                        aria-busy={inCorso === `annulla:${s.slug}` || undefined}
                        onClick={async () => {
                          const r = await esegui("annulla", s.slug, g.status);
                          if (r) setDaConfermare(null);
                        }}
                      >
                        {inCorso === `annulla:${s.slug}` ? <Rotella /> : <i className="fas fa-check" aria-hidden="true" />}
                        {unica ? "Sì, annulla il biglietto" : attesa ? "Sì, esci dalla lista" : "Sì, libera il posto"}
                      </button>
                      <button
                        type="button"
                        ref={confermaRef}
                        className="vpg-btn vpg-btn-tenue"
                        disabled={occupato}
                        onClick={() => chiudiConferma(s.slug)}
                      >
                        {attesa ? "No, resto in lista" : "No, tengo il posto"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {mancanti.length > 0 && (
        <ul className="vpg-elenco" aria-label="Giornate che puoi aggiungere">
          {mancanti.map((s) => {
            const iniziata = iniziate.includes(s.slug);
            const piena = posti[s.slug] !== undefined && posti[s.slug] <= 0;
            const conArt = giornateConArticolo([s.slug]);
            const chiave = `aggiungi:${s.slug}`;
            const disponibilita = iniziata
              ? " La giornata è iniziata."
              : piena
                ? " Al completo: puoi entrare in lista d'attesa."
                : posti[s.slug] !== undefined
                  ? " Ci sono posti liberi."
                  : "";
            return (
              <li key={s.slug} className="vpg-riga vpg-riga-aggiungi">
                <div className="vpg-riga-testa">
                  <div className="vpg-info">
                    <span className="vpg-data">{s.giornoLabel}</span>
                    <span className="vpg-sotto">{`${s.luogoBreve}, ${s.orario}.${disponibilita}`}</span>
                  </div>
                  {!iniziata && (
                    <button
                      type="button"
                      className={piena ? "vpg-btn btn-outline" : "vpg-btn btn-primary"}
                      disabled={occupato}
                      aria-busy={inCorso === chiave || undefined}
                      onClick={() => esegui("aggiungi", s.slug)}
                    >
                      {inCorso === chiave ? <Rotella /> : <i className={`fas ${piena ? "fa-hourglass-half" : "fa-plus"}`} aria-hidden="true" />}
                      {piena ? `Iscriviti in lista d'attesa per ${conArt}` : `Aggiungi ${conArt}`}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="vpg-reinvio">
        <p>
          Non trovi l&apos;email con il biglietto? Te la rimandiamo all&apos;indirizzo usato per l&apos;iscrizione.
        </p>
        <button
          type="button"
          className="vpg-btn btn-outline"
          disabled={occupato}
          aria-busy={inCorso === "reinvia:" || undefined}
          onClick={() => esegui("reinvia")}
        >
          {inCorso === "reinvia:" ? <Rotella /> : <i className="fas fa-envelope" aria-hidden="true" />}{" "}
          Rimandami il biglietto
        </button>
      </div>

      <RegioneAnnuncio annuncio={annuncio} annuncioRef={annuncioRef} />
    </div>
  );
}

/* ── L'invito in cima, dal link dell'email ───────────────────────────── */

export function InvitoAggiungi({
  codice,
  slug,
  giaNelBiglietto,
  iniziata,
  piena,
}: {
  codice: string;
  slug: string;
  giaNelBiglietto: boolean;
  iniziata: boolean;
  /** Al completo secondo il server: il pulsante dice "lista d'attesa". */
  piena: boolean;
}) {
  const { esegui, inCorso, annuncio, annuncioRef } = useAzioneBiglietto(codice);
  const s = sessionBySlug(slug);
  if (!s) return null;
  const conArt = giornateConArticolo([slug]);
  const occupato = inCorso !== null;

  // La regione dell'annuncio resta sempre all'ultimo posto della stessa
  // section: quando la pagina si aggiorna e la giornata risulta aggiunta,
  // il messaggio (e il focus su di esso) non si perde.
  return (
    <section
      className={giaNelBiglietto ? "vpg-invito vpg-invito-fatto no-print" : "vpg-invito no-print"}
      aria-labelledby={giaNelBiglietto ? undefined : "vpg-invito-titolo"}
      aria-label={giaNelBiglietto ? `${maiuscola(conArt)} nel tuo biglietto` : undefined}
    >
      {giaNelBiglietto ? (
        annuncio ? null : (
          <p className="vpg-invito-nota">
            <i className="fas fa-circle-check" aria-hidden="true" /> {maiuscola(conArt)} è già nel tuo biglietto.
          </p>
        )
      ) : (
        <>
          <p className="vpg-invito-occhiello">
            <i className="fas fa-calendar-plus" aria-hidden="true" />{" "}Un&apos;altra giornata
          </p>
          <h2 id="vpg-invito-titolo" className="vpg-invito-titolo">
            Vuoi venire anche {conArt}?
          </h2>
          <p className="vpg-invito-testo">
            {s.giornoLabel}, {s.orario}, {s.luogo}. {s.titolo}.
          </p>
          {iniziata ? (
            <p className="vpg-invito-nota">La giornata è iniziata: non si può più aggiungere da qui.</p>
          ) : (
            <>
              <button
                type="button"
                className="vpg-btn btn-primary vpg-invito-btn"
                disabled={occupato}
                aria-busy={occupato || undefined}
                onClick={() => esegui("aggiungi", slug)}
              >
                {occupato ? <Rotella /> : <i className={`fas ${piena ? "fa-hourglass-half" : "fa-plus"}`} aria-hidden="true" />}
                {piena ? `Iscriviti in lista d'attesa per ${conArt}` : `Aggiungi ${conArt} al biglietto`}
              </button>
              <p className="vpg-invito-piccolo">
                {piena
                  ? "La giornata è al completo: se si libera un posto ti scriviamo noi."
                  : "Il codice resta lo stesso e ti mandiamo il biglietto aggiornato per email."}
              </p>
            </>
          )}
        </>
      )}
      <RegioneAnnuncio annuncio={annuncio} annuncioRef={annuncioRef} />
    </section>
  );
}

/* ── Stampa ──────────────────────────────────────────────────────────── */

export function StampaBiglietto() {
  return (
    <button type="button" className="vpg-btn btn-outline no-print" onClick={() => window.print()}>
      <i className="fas fa-print" aria-hidden="true" />{" "}
      Stampa o salva in PDF
    </button>
  );
}
