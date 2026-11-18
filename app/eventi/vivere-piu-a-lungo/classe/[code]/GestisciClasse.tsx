"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MAX_ACCOMPAGNATORI, MAX_PERSONE_CLASSE, MIN_ACCOMPAGNATORI, descriviPersone } from "@/lib/eventi/classi";
import type { SessionStatus } from "@/lib/eventi/registration";
import { SESSIONS, giornateConArticolo } from "../../content";
import { Contatore } from "../../classi/campi";
import {
  MESSAGGIO_RETE,
  ROTTA_GESTISCI,
  ROTTA_POSTI,
  erroriNumeri,
  leggiPostiClassi,
  maiuscola,
  numeroDa,
  persone,
} from "../../classi/classi-utils";

/**
 * La prenotazione di una classe gestita dal docente che l'ha fatta: cambiare
 * i numeri, annullare una giornata, aggiungere l'altra, farsi rimandare
 * l'email. Parla con POST /api/eventi/classi/gestisci, con il codice della
 * classe come chiave.
 *
 * Dopo ogni azione la pagina si aggiorna dal server (router.refresh) e
 * l'esito è annunciato in una regione aria-live. Lo stile sta in stile.ts.
 */

/** Una giornata della classe, come la passa la pagina (solo quelle note al sito). */
export type GiornataGestibileClasse = {
  slug: string;
  status: SessionStatus;
  /** L'ingresso della classe è già registrato: da qui non si tocca più. */
  entrata: boolean;
};

type Azione = "aggiorna" | "annulla" | "aggiungi" | "reinvia";

type Annuncio = { tipo: "ok" | "errore"; testo: string } | null;

type RispostaGestisci = {
  success?: boolean;
  error?: string;
  /** Per "aggiorna" respinta: la giornata confermata in cui il numero nuovo non ci sta. */
  giornata?: string | null;
  posti_prima?: number;
  posti_dopo?: number;
  prenotazioneCancellata?: boolean;
  era?: SessionStatus | null;
  status?: SessionStatus;
  /** Se la rotta lo dice: l'email al docente è partita. Senza, non se ne parla. */
  emailInviata?: boolean;
  /** Non c'era niente da cambiare (una pagina rimasta aperta, un'altra scheda). */
  invariato?: boolean;
};

type Dati = { giornata?: string; studenti?: number; accompagnatori?: number };

const TEMPO_MASSIMO_MS = 25_000;

function messaggioPerStato(status: number, azione: Azione): string {
  switch (status) {
    case 400:
      return "Alcuni dati non sono validi. Ricarica la pagina e riprova.";
    case 404:
      return "Non troviamo questa prenotazione. Apri il link dall'email; se il problema continua, scrivi a info@bioergotech.org.";
    case 409:
      return "Questa modifica non si può fare da qui. Per qualsiasi necessità scrivi a info@bioergotech.org.";
    case 410:
      return "Le prenotazioni sono chiuse.";
    case 429:
      return azione === "reinvia"
        ? "Ti abbiamo appena rimandato l'email. Controlla la posta, anche nella cartella spam; se non arriva, riprova tra un paio di minuti."
        : "Troppe richieste in poco tempo. Aspetta un paio di minuti e riprova.";
    case 503:
      return "Il servizio non è disponibile in questo momento. Riprova tra qualche minuto.";
    default:
      return "Non siamo riusciti a completare l'operazione. Riprova tra qualche istante. Se il problema continua, scrivi a info@bioergotech.org.";
  }
}

/**
 * Il testo di successo per ogni azione, in base a quello che la rotta
 * risponde. Si parla dell'email solo se la rotta dice che è partita.
 */
function messaggioSuccesso(
  azione: Azione,
  dati: Dati,
  r: RispostaGestisci,
  era: SessionStatus | undefined,
  haConfermate: boolean,
): string {
  const email = r.emailInviata === true ? " Ti abbiamo mandato l'email aggiornata." : "";
  const conArt = dati.giornata ? giornateConArticolo([dati.giornata]) : "";
  switch (azione) {
    case "reinvia":
      return "Fatto: ti abbiamo rimandato l'email della classe all'indirizzo usato per prenotare. Se non la vedi tra qualche minuto, controlla anche nella cartella spam o Promozioni.";
    case "aggiorna": {
      if (r.invariato) return "I numeri della prenotazione erano già questi: non è cambiato niente.";
      const studenti = dati.studenti ?? 0;
      const accompagnatori = dati.accompagnatori ?? 0;
      const dopo = typeof r.posti_dopo === "number" ? r.posti_dopo : studenti + accompagnatori;
      const meno = typeof r.posti_prima === "number" && dopo < r.posti_prima && haConfermate;
      return `Fatto: la prenotazione ora è per ${descriviPersone(studenti, accompagnatori)}, ${persone(dopo)} in tutto.${meno ? " Grazie: i posti che non servono più passano a chi è in lista d'attesa o tornano disponibili." : ""}${email}`;
    }
    case "annulla":
      if (r.invariato) return `${maiuscola(conArt)} non è più nella prenotazione.`;
      return era === "lista_attesa"
        ? `Fatto: la classe non è più in lista d'attesa per ${conArt}.${email}`
        : `Fatto: ${conArt} non è più nella prenotazione. Grazie: i posti passano a chi è in lista d'attesa o tornano disponibili.${email}`;
    case "aggiungi":
      if (r.invariato) {
        return r.status === "lista_attesa"
          ? `${maiuscola(conArt)} è già nella prenotazione, in lista d'attesa.`
          : `${maiuscola(conArt)} è già nella prenotazione.`;
      }
      return r.status === "lista_attesa"
        ? `La classe è in lista d'attesa per ${conArt}: ora non ci sono abbastanza posti per tutta la classe. Se si liberano, ti scriviamo noi.${email}`
        : `Fatto: ${conArt} è nella prenotazione, con i posti confermati per tutta la classe.${email}`;
  }
}

/**
 * La logica condivisa: chiama la rotta, tiene lo stato "in corso", prepara
 * l'annuncio e aggiorna la pagina. Torna la risposta, o null se è fallita.
 */
function useAzioneClasse(codice: string, haConfermate: boolean) {
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
    async (azione: Azione, dati: Dati = {}, statoNoto?: SessionStatus): Promise<RispostaGestisci | null> => {
      const chiave = `${azione}:${dati.giornata ?? ""}`;
      setInCorso(chiave);
      setAnnuncio(null);
      const controllo = new AbortController();
      const timer = window.setTimeout(() => controllo.abort(), TEMPO_MASSIMO_MS);
      try {
        const res = await fetch(ROTTA_GESTISCI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codice, azione, ...dati }),
          signal: controllo.signal,
        });
        let r: RispostaGestisci = {};
        try {
          r = ((await res.json()) ?? {}) as RispostaGestisci;
        } catch {
          r = {};
        }
        if (!res.ok || r.success !== true) {
          let testo = typeof r.error === "string" && r.error.trim() ? r.error.trim() : messaggioPerStato(res.status, azione);
          // I numeri non ci stanno in una giornata confermata: se la rotta non
          // lo spiega, lo spieghiamo noi.
          if (azione === "aggiorna" && res.status === 409 && !(typeof r.error === "string" && r.error.trim()) && r.giornata) {
            const n = (dati.studenti ?? 0) + (dati.accompagnatori ?? 0);
            testo = `Per ${giornateConArticolo([r.giornata])} non ci sono abbastanza posti per ${persone(n)}: i numeri restano quelli di prima.`;
          }
          setAnnuncio({ tipo: "errore", testo });
          // Lo stato sul server può essere cambiato (un'altra scheda, lo staff): si rilegge.
          if (res.status === 409) router.refresh();
          return null;
        }
        const era = r.era === "confermato" || r.era === "lista_attesa" ? r.era : statoNoto;
        setAnnuncio({ tipo: "ok", testo: messaggioSuccesso(azione, dati, r, era, haConfermate) });
        if (azione === "annulla" && r.prenotazioneCancellata) {
          // La prenotazione non c'è più: la pagina mostra il messaggio di
          // annullamento, senza ringraziare per i posti se era solo in attesa.
          router.replace(`${pathname}?annullata=${era === "lista_attesa" ? "attesa" : "1"}`, { scroll: true });
        } else if (azione !== "reinvia") {
          router.refresh();
        }
        return r;
      } catch {
        setAnnuncio({
          tipo: "errore",
          testo: controllo.signal.aborted
            ? "La risposta sta tardando. Ricarica la pagina per vedere se l'operazione è andata a buon fine."
            : MESSAGGIO_RETE,
        });
        return null;
      } finally {
        window.clearTimeout(timer);
        setInCorso(null);
      }
    },
    [codice, haConfermate, pathname, router],
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
      className={annuncio ? `vcg-annuncio vcg-annuncio-${annuncio.tipo}` : "vcg-annuncio-vuoto"}
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

/** I posti ancora prenotabili da una classe, per giornata: quelli del server, aggiornati dalla rotta dei posti. */
function usePostiClassi(iniziali: Record<string, number>, aggiorna: unknown) {
  const [live, setLive] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let attivo = true;
    fetch(ROTTA_POSTI, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (!attivo || d === null) return;
        const mappa = leggiPostiClassi(d);
        const out: Record<string, number> = {};
        for (const [slug, p] of Object.entries(mappa)) out[slug] = p.rimanenti_classi;
        if (Object.keys(out).length > 0) setLive(out);
      })
      .catch(() => {
        // Si resta con i posti del server: l'etichetta è solo un'indicazione,
        // la rotta decide comunque fra confermata e lista d'attesa.
      });
    return () => {
      attivo = false;
    };
  }, [aggiorna]);
  return { ...iniziali, ...(live ?? {}) };
}

/* ── Quante persone ──────────────────────────────────────────────────── */

function NumeriClasse({
  studenti,
  accompagnatori,
  occupato,
  inCorso,
  onSalva,
}: {
  studenti: number;
  accompagnatori: number;
  occupato: boolean;
  inCorso: boolean;
  onSalva: (studenti: number, accompagnatori: number) => void;
}) {
  const base = useId();
  const [s, setS] = useState(String(studenti));
  const [a, setA] = useState(String(accompagnatori));
  const [tentato, setTentato] = useState(false);
  const [uguali, setUguali] = useState(false);
  const campi = useRef<{ s: HTMLInputElement | null; a: HTMLInputElement | null }>({ s: null, a: null });

  const ns = numeroDa(s);
  const na = numeroDa(a);
  const errori = tentato ? erroriNumeri(ns, na) : {};
  const totale = (Number.isFinite(ns) ? ns : 0) + (Number.isFinite(na) ? na : 0);
  const oltre = totale > MAX_PERSONE_CLASSE;

  const salva = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (occupato) return;
    setTentato(true);
    const errOra = erroriNumeri(ns, na);
    if (errOra.studenti) {
      campi.current.s?.focus();
      return;
    }
    if (errOra.accompagnatori) {
      campi.current.a?.focus();
      return;
    }
    if (ns === studenti && na === accompagnatori) {
      setUguali(true);
      return;
    }
    setUguali(false);
    onSalva(ns, na);
  };

  return (
    <div className="vpl-wrap">
      <form className="vcg-numeri" onSubmit={salva} noValidate aria-label="Cambia il numero di persone">
        <div className="vpc-numeri" style={{ marginTop: 0 }}>
          <Contatore
            id={`${base}-studenti`}
            etichetta="Studenti"
            aiuto="Quanti studenti della classe vengono."
            valore={s}
            onValore={(v) => {
              setS(v);
              setUguali(false);
            }}
            min={1}
            max={MAX_PERSONE_CLASSE - MIN_ACCOMPAGNATORI}
            unoInMeno="Uno studente in meno"
            unoInPiu="Uno studente in più"
            errore={errori.studenti}
            inputRef={(el) => {
              campi.current.s = el;
            }}
            inviaConInvio
          />
          <Contatore
            id={`${base}-accompagnatori`}
            etichetta="Docenti accompagnatori"
            aiuto={`Contando anche te, al massimo ${MAX_ACCOMPAGNATORI}.`}
            valore={a}
            onValore={(v) => {
              setA(v);
              setUguali(false);
            }}
            min={MIN_ACCOMPAGNATORI}
            max={MAX_ACCOMPAGNATORI}
            unoInMeno="Un docente in meno"
            unoInPiu="Un docente in più"
            errore={errori.accompagnatori}
            inputRef={(el) => {
              campi.current.a = el;
            }}
            inviaConInvio
          />
        </div>
        <p className="vpc-totale" data-tipo={oltre ? "oltre" : undefined} aria-live="polite">
          <i className={`fas ${oltre ? "fa-circle-exclamation" : "fa-people-group"}`} aria-hidden="true" />
          <span>
            {oltre
              ? `In tutto ${persone(totale)}: il massimo è ${MAX_PERSONE_CLASSE} per prenotazione.`
              : uguali
                ? "I numeri sono già questi: non c'è niente da salvare."
                : `In tutto ${persone(totale)}, su ${MAX_PERSONE_CLASSE} al massimo.`}
          </span>
        </p>
        <div>
          <button type="submit" className="vcg-btn btn-primary" disabled={occupato} aria-busy={inCorso || undefined}>
            {inCorso ? <Rotella /> : <i className="fas fa-check" aria-hidden="true" />}{" "}
            Salva i numeri
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── La sezione "Gestisci" ───────────────────────────────────────────── */

export function GestisciClasse({
  codice,
  giornate,
  studenti,
  accompagnatori,
  rimanenti,
  iniziate,
  archivio,
}: {
  codice: string;
  /** Le giornate della classe, solo quelle note al sito. */
  giornate: GiornataGestibileClasse[];
  studenti: number;
  accompagnatori: number;
  /** Posti ancora prenotabili da una classe, per giornata, letti dal server al caricamento. */
  rimanenti: Record<string, number>;
  /** Le giornate già iniziate (calcolato sul server). */
  iniziate: string[];
  /** Evento archiviato: niente modifiche, resta il reinvio. */
  archivio: boolean;
}) {
  const haConfermate = giornate.some((g) => g.status === "confermato");
  const { esegui, inCorso, annuncio, annuncioRef } = useAzioneClasse(codice, haConfermate);
  const posti = usePostiClassi(rimanenti, giornate.map((g) => `${g.slug}:${g.status}`).join(","));
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
  const postiClasse = studenti + accompagnatori;
  // I numeri contano finché resta una giornata da vivere.
  const numeriBloccati = giornate.length === 0 || giornate.every((g) => iniziate.includes(g.slug));

  return (
    <div className="vcg">
      {!archivio && (
        <section className="vcg-blocco" aria-labelledby={`${base}-numeri`}>
          <h3 id={`${base}-numeri`} className="vcg-titolo">
            Quante persone vengono
          </h3>
          <p className="vcg-testo">
            Ora: <strong>{descriviPersone(studenti, accompagnatori)}</strong>
            {`, ${persone(postiClasse)} in tutto. Puoi ridurre il numero quando vuoi, prima dell'inizio delle giornate; aumentarlo solo se nelle giornate confermate c'è posto per tutta la classe.`}
          </p>
          {numeriBloccati ? (
            <p className="vcg-motivo">
              <i className="fas fa-lock" aria-hidden="true" />{" "}
              {giornate.length === 0
                ? "Nella prenotazione non c'è nessuna giornata: aggiungine una qui sotto prima di cambiare i numeri."
                : "Le giornate sono iniziate: i numeri non si cambiano più da qui."}
            </p>
          ) : (
            <NumeriClasse
              key={`${studenti}-${accompagnatori}`}
              studenti={studenti}
              accompagnatori={accompagnatori}
              occupato={occupato}
              inCorso={inCorso === "aggiorna:"}
              onSalva={(s, a) => esegui("aggiorna", { studenti: s, accompagnatori: a })}
            />
          )}
        </section>
      )}

      {!archivio && (tenute.length > 0 || mancanti.length > 0) && (
        <section className="vcg-blocco" aria-labelledby={`${base}-giornate`}>
          <h3 id={`${base}-giornate`} className="vcg-titolo">
            Le giornate
          </h3>

          {tenute.length > 0 && (
            <ul className="vcg-elenco" aria-label="Le giornate della prenotazione">
              {tenute.map((s) => {
                const g = giornate.find((x) => x.slug === s.slug)!;
                const attesa = g.status === "lista_attesa";
                const bloccata = g.entrata || iniziate.includes(s.slug);
                const aperta = daConfermare === s.slug;
                const idTesto = `${base}-conferma-${s.slug}`;
                const conArt = giornateConArticolo([s.slug]);
                const testoConferma = unica
                  ? `${maiuscola(conArt)} è l'unica giornata della prenotazione: ${attesa ? "togliendo la classe dalla lista d'attesa" : "annullandola"}, la prenotazione viene cancellata e il QR non vale più.${attesa ? "" : " I posti passano a chi è in lista d'attesa."}`
                  : attesa
                    ? `Vuoi togliere la classe dalla lista d'attesa per ${conArt}? Non riceverai più avvisi per questa giornata. Il resto della prenotazione non cambia.`
                    : `Vuoi annullare la prenotazione della classe per ${conArt}? I posti passano a chi è in lista d'attesa. Il resto della prenotazione non cambia.`;
                return (
                  <li key={s.slug} className="vcg-riga">
                    <div className="vcg-riga-testa">
                      <div className="vcg-info">
                        <span className="vcg-data">{s.giornoLabel}</span>
                        <span className="vcg-sotto">
                          {g.entrata ? "Ingresso registrato" : attesa ? "In lista d'attesa" : "Confermata"}, {s.luogoBreve}
                        </span>
                      </div>
                      {!bloccata && !aperta && (
                        <button
                          type="button"
                          ref={(el) => {
                            triggerRef.current[s.slug] = el;
                          }}
                          className="vcg-btn vcg-btn-tenue"
                          onClick={() => setDaConfermare(s.slug)}
                          disabled={occupato}
                        >
                          <i className="fas fa-xmark" aria-hidden="true" />
                          {attesa ? "Esci dalla lista d'attesa" : "Annulla questa giornata"}
                        </button>
                      )}
                    </div>
                    {bloccata && (
                      <p className="vcg-motivo">
                        <i className="fas fa-lock" aria-hidden="true" />{" "}
                        {g.entrata
                          ? "Ingresso della classe già registrato: questa giornata non si può più modificare."
                          : "La giornata è iniziata: non si può più modificare da qui."}
                      </p>
                    )}
                    {aperta && (
                      <div className="vcg-conferma" role="group" aria-labelledby={idTesto}>
                        <p id={idTesto}>{testoConferma}</p>
                        <div className="vcg-azioni">
                          <button
                            type="button"
                            className="vcg-btn vcg-btn-pericolo"
                            disabled={occupato}
                            aria-busy={inCorso === `annulla:${s.slug}` || undefined}
                            onClick={async () => {
                              const r = await esegui("annulla", { giornata: s.slug }, g.status);
                              if (r) setDaConfermare(null);
                            }}
                          >
                            {inCorso === `annulla:${s.slug}` ? <Rotella /> : <i className="fas fa-check" aria-hidden="true" />}
                            {unica ? "Sì, cancella la prenotazione" : attesa ? "Sì, esci dalla lista" : "Sì, annulla la giornata"}
                          </button>
                          <button
                            type="button"
                            ref={confermaRef}
                            className="vcg-btn vcg-btn-tenue"
                            disabled={occupato}
                            onClick={() => chiudiConferma(s.slug)}
                          >
                            {attesa ? "No, resto in lista" : "No, la tengo"}
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
            <ul className="vcg-elenco" aria-label="Giornate che puoi aggiungere">
              {mancanti.map((s) => {
                const iniziata = iniziate.includes(s.slug);
                const noti = posti[s.slug] !== undefined;
                const nonCiSta = noti && posti[s.slug] < postiClasse;
                const conArt = giornateConArticolo([s.slug]);
                const chiave = `aggiungi:${s.slug}`;
                const disponibilita = iniziata
                  ? " La giornata è iniziata."
                  : nonCiSta
                    ? " Ora non ci sono abbastanza posti per tutta la classe: andrebbe in lista d'attesa."
                    : noti
                      ? " C'è posto per tutta la classe."
                      : "";
                return (
                  <li key={s.slug} className="vcg-riga vcg-riga-aggiungi">
                    <div className="vcg-riga-testa">
                      <div className="vcg-info">
                        <span className="vcg-data">{s.giornoLabel}</span>
                        <span className="vcg-sotto">{`${s.luogoBreve}, ${s.orario}.${disponibilita}`}</span>
                      </div>
                      {!iniziata && (
                        <button
                          type="button"
                          className={nonCiSta ? "vcg-btn btn-outline" : "vcg-btn btn-primary"}
                          disabled={occupato}
                          aria-busy={inCorso === chiave || undefined}
                          onClick={() => esegui("aggiungi", { giornata: s.slug })}
                        >
                          {inCorso === chiave ? (
                            <Rotella />
                          ) : (
                            <i className={`fas ${nonCiSta ? "fa-hourglass-half" : "fa-plus"}`} aria-hidden="true" />
                          )}
                          {nonCiSta ? `Prenota in lista d'attesa per ${conArt}` : `Aggiungi ${conArt}`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="vcg-blocco" aria-labelledby={`${base}-email`}>
        <h3 id={`${base}-email`} className="vcg-titolo">
          L&apos;email con il QR
        </h3>
        <p className="vcg-testo">
          Non trovi l&apos;email della prenotazione? Te la rimandiamo all&apos;indirizzo usato per prenotare.
        </p>
        <button
          type="button"
          className="vcg-btn btn-outline"
          style={{ justifySelf: "start" }}
          disabled={occupato}
          aria-busy={inCorso === "reinvia:" || undefined}
          onClick={() => esegui("reinvia")}
        >
          {inCorso === "reinvia:" ? <Rotella /> : <i className="fas fa-envelope" aria-hidden="true" />}{" "}
          Rimandami l&apos;email
        </button>
      </section>

      <RegioneAnnuncio annuncio={annuncio} annuncioRef={annuncioRef} />
    </div>
  );
}

/* ── Stampa ──────────────────────────────────────────────────────────── */

export function StampaClasse() {
  return (
    <button type="button" className="vcg-btn btn-outline no-print" onClick={() => window.print()}>
      <i className="fas fa-print" aria-hidden="true" />{" "}
      Stampa o salva in PDF
    </button>
  );
}
