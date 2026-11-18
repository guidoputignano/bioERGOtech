"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { refusoEmail } from "@/lib/eventi/email-refusi";
import { CODICE_RE as CODICE_INVITO, normalizzaCodice as normalizzaCodiceInvito } from "@/lib/eventi/licei-iscrizioni";
import {
  LUNGHEZZE_CLASSE,
  MAX_ACCOMPAGNATORI,
  MAX_PERSONE_CLASSE,
  MIN_ACCOMPAGNATORI,
  type CampoClasse,
  type DatiPrenotazioneClasse,
} from "@/lib/eventi/classi";
import { CONSENSO_PRIVACY_CLASSI_TESTO, SESSIONS, giornateConArticolo, type SessionSlug } from "../content";
import { STILE_MODULO, comportamentoScroll, ids } from "../modulo-utils";
import { STILE_MODULO_CLASSI } from "./stile";
import { Contatore, ErroreCampo, avanti } from "./campi";
import {
  CAMPI_CLASSE,
  MESSAGGIO_RETE,
  MESSAGGIO_TEMPO,
  ROTTA_POSTI,
  ROTTA_PRENOTA,
  ROTTA_SCUOLA,
  erroriClasse,
  laClasse,
  leggiPostiClassi,
  leggiRispostaClasse,
  numeroDa,
  persone,
  statoPostiClasse,
  type ErroriClasse,
  type PostiClasse,
} from "./classi-utils";
import { PrenotazioneConfermata, type DatiConfermaClasse } from "./PrenotazioneConfermata";

const INFORMATIVA_HREF = "/legal/informativa-privacy";
/** Oltre questo tempo si smette di aspettare e si propone di riprovare. */
const TEMPO_MASSIMO_MS = 30_000;
/** Studenti al massimo: il totale è di 40 con almeno un docente. */
const MAX_STUDENTI = MAX_PERSONE_CLASSE - MIN_ACCOMPAGNATORI;
/** Dove resta il codice dell'invito se la scheda si ricarica: dall'indirizzo lo togliamo. */
const CHIAVE_INVITO = "vpc-invito";

const NUOVA_SCHEDA = <span className="sr-only"> (si apre in una nuova scheda)</span>;

/**
 * Il codice del link dell'invito alle scuole del percorso
 * (/eventi/vivere-piu-a-lungo/classi?scuola=LIC-XXXXXXXX), letto una volta
 * all'apertura e tolto dalla barra degli indirizzi: è anche il codice con
 * cui gli studenti della scuola si iscrivono al percorso, quindi non deve
 * finire in Analytics né in un link copiato. Resta nella sessione della
 * scheda, così una scheda ricaricata ritrova la scuola. Null se non c'è.
 *
 * Si legge window.location in un effetto, non useSearchParams: la pagina
 * resta statica e la lettura avviene prima che i tag di Google, caricati
 * dopo, leggano l'indirizzo.
 */
function codiceInvitoDaIndirizzo(): string | null {
  try {
    const url = new URL(window.location.href);
    const dalLink = url.searchParams.get("scuola");
    if (dalLink === null) {
      try {
        return window.sessionStorage.getItem(CHIAVE_INVITO);
      } catch {
        return null;
      }
    }
    url.searchParams.delete("scuola");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    const codice = normalizzaCodiceInvito(dalLink);
    try {
      if (CODICE_INVITO.test(codice)) window.sessionStorage.setItem(CHIAVE_INVITO, codice);
    } catch {
      /* senza sessione la scuola si riscrive a mano dopo un ricaricamento */
    }
    return codice || null;
  } catch {
    return null;
  }
}

/** Il testo del consenso, con "l'informativa" che porta all'informativa. */
function TestoConsensoPrivacy() {
  const chiave = "l'informativa";
  const i = CONSENSO_PRIVACY_CLASSI_TESTO.indexOf(chiave);
  const link = (testo: string) => (
    <a href={INFORMATIVA_HREF} target="_blank" rel="noopener noreferrer">
      {testo}
      {NUOVA_SCHEDA}
    </a>
  );
  if (i === -1) {
    return (
      <>
        {CONSENSO_PRIVACY_CLASSI_TESTO} {link("Leggi l'informativa")}
      </>
    );
  }
  return (
    <>
      {CONSENSO_PRIVACY_CLASSI_TESTO.slice(0, i)}
      {link(chiave)}
      {CONSENSO_PRIVACY_CLASSI_TESTO.slice(i + chiave.length)}
    </>
  );
}

type ErroreServer = { campo?: CampoClasse; messaggio: string; valore?: string };

/** La scuola letta dal link dell'invito: si collega alla prenotazione solo se il nome resta quello. */
type Invito = { codice: string; istituto: string; comune: string };

export function ModuloClassi() {
  const [giornate, setGiornate] = useState<SessionSlug[]>([]);
  const [istituto, setIstituto] = useState("");
  const [comune, setComune] = useState("");
  const [classe, setClasse] = useState("");
  const [studenti, setStudenti] = useState("");
  const [accompagnatori, setAccompagnatori] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [emailUscita, setEmailUscita] = useState(false);
  /** L'indirizzo per cui si è scelto "È giusto così". */
  const [emailConfermata, setEmailConfermata] = useState<string | null>(null);
  const [telefono, setTelefono] = useState("");
  const [note, setNote] = useState("");
  const [notaAperta, setNotaAperta] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [invito, setInvito] = useState<Invito | null>(null);
  const [invitoNonValido, setInvitoNonValido] = useState(false);

  const [posti, setPosti] = useState<Record<string, PostiClasse>>({});
  /** Le giornate già concluse, calcolate nel browser con l'orologio del server. */
  const [concluse, setConcluse] = useState<readonly string[]>([]);
  /** Quanto l'orologio del server è avanti o indietro rispetto a quello del telefono. */
  const [scartoOrologio, setScartoOrologio] = useState(0);
  const [invio, setInvio] = useState(false);
  /** Quante volte si è provato a inviare: da 1 in poi gli errori si vedono e si aggiornano dal vivo. */
  const [tentativi, setTentativi] = useState(0);
  const [erroreServer, setErroreServer] = useState<ErroreServer | null>(null);
  const [esito, setEsito] = useState<DatiConfermaClasse | null>(null);
  /** Dopo "Prenota un'altra classe": si dice che cosa è rimasto. */
  const [altraClasse, setAltraClasse] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const inviaRef = useRef<HTMLButtonElement>(null);
  const giorniRef = useRef<HTMLDivElement>(null);
  const riepilogoRef = useRef<HTMLDivElement>(null);
  const campiRef = useRef<Partial<Record<CampoClasse, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const registra = (c: CampoClasse) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    campiRef.current[c] = el;
  };

  // Chi è già entrato nel Member Portal trova nome ed email già scritti.
  // Non sovrascrive quello che il docente ha già digitato.
  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await createClient().auth.getUser();
        if (!attivo || !user) return;
        const indirizzo = user.email;
        if (indirizzo) setEmail((v) => v || indirizzo);
        const completo = String(user.user_metadata?.full_name ?? "").trim();
        if (completo) {
          const [primo, ...resto] = completo.split(/\s+/);
          setNome((v) => v || primo);
          if (resto.length) setCognome((v) => v || resto.join(" "));
        }
      } catch {
        /* senza sessione il modulo resta vuoto */
      }
    })();
    return () => {
      attivo = false;
    };
  }, []);

  // Il link dell'invito porta il codice della scuola: se è valido, scuola e
  // comune si scrivono da soli (senza toccare quello che c'è già). Se la
  // rotta non risponde, il modulo funziona lo stesso.
  const usaInvito = useCallback(async (codice: string) => {
    if (!CODICE_INVITO.test(codice)) {
      setInvitoNonValido(true);
      return;
    }
    try {
      const res = await fetch(`${ROTTA_SCUOLA}?codice=${encodeURIComponent(codice)}`, { cache: "no-store" });
      if (res.status === 404) {
        setInvitoNonValido(true);
        try {
          window.sessionStorage.removeItem(CHIAVE_INVITO);
        } catch {
          /* niente da togliere */
        }
        return;
      }
      if (!res.ok) return;
      const d = (await res.json()) as unknown;
      const o = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
      const scuola = typeof o.istituto === "string" ? o.istituto.trim().slice(0, LUNGHEZZE_CLASSE.istituto) : "";
      const citta = typeof o.comune === "string" ? o.comune.trim().slice(0, LUNGHEZZE_CLASSE.comune) : "";
      if (!scuola) return;
      setInvitoNonValido(false);
      setInvito({ codice, istituto: scuola, comune: citta });
      setIstituto((v) => (v.trim() ? v : scuola));
      if (citta) setComune((v) => (v.trim() ? v : citta));
    } catch {
      /* senza scuola precompilata il docente la scrive */
    }
  }, []);

  useEffect(() => {
    const codice = codiceInvitoDaIndirizzo();
    if (codice) usaInvito(codice);
  }, [usaInvito]);

  // I posti sono un di più: se la rotta non risponde, il modulo funziona lo stesso.
  const caricaPosti = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(ROTTA_POSTI, { cache: "no-store", signal });
      const oraServer = Date.parse(res.headers.get("date") ?? "");
      if (!Number.isNaN(oraServer)) setScartoOrologio(oraServer - Date.now());
      if (!res.ok) return;
      setPosti(leggiPostiClassi(await res.json()));
    } catch {
      /* il contatore non blocca la prenotazione */
    }
  }, []);

  useEffect(() => {
    const controllo = new AbortController();
    caricaPosti(controllo.signal);
    return () => controllo.abort();
  }, [caricaPosti]);

  // Una giornata finita non si sceglie più: dopo il montaggio, e poi ogni
  // minuto per chi tiene la pagina aperta. Se era già scelta, la si toglie.
  useEffect(() => {
    const controlla = () => {
      const adesso = Date.now() + scartoOrologio;
      const finite = SESSIONS.filter((s) => adesso >= Date.parse(s.fineISO)).map((s) => s.slug as string);
      setConcluse((prima) => (prima.join(",") === finite.join(",") ? prima : finite));
      if (finite.length > 0) {
        setGiornate((p) => (p.some((s) => finite.includes(s)) ? p.filter((s) => !finite.includes(s)) : p));
      }
    };
    controlla();
    const timer = window.setInterval(controlla, 60_000);
    return () => window.clearInterval(timer);
  }, [scartoOrologio]);

  /* ── Stato derivato ── */

  const refuso = refusoEmail(email);
  const confermata = emailConfermata !== null && emailConfermata === email.trim();
  const mostraRefuso = refuso !== null && (emailUscita || tentativi > 0) && !(confermata && !refuso.impossibile);
  const giornateScelte = SESSIONS.map((s) => s.slug).filter((s) => giornate.includes(s));
  const nStudenti = numeroDa(studenti);
  const nAccompagnatori = numeroDa(accompagnatori);
  const totale = (Number.isFinite(nStudenti) ? nStudenti : 0) + (Number.isFinite(nAccompagnatori) ? nAccompagnatori : 0);
  // L'invito vale finché la scuola è quella del link: se il docente la
  // cambia, la prenotazione non si collega a un'altra scuola.
  const invitoValido =
    invito !== null && istituto.trim().toLowerCase() === invito.istituto.trim().toLowerCase() ? invito : null;

  const dati: DatiPrenotazioneClasse = {
    istituto,
    comune,
    classe,
    docente_nome: nome,
    docente_cognome: cognome,
    docente_email: email,
    docente_telefono: telefono,
    studenti: nStudenti,
    accompagnatori: nAccompagnatori,
    note,
    giornate: giornateScelte,
    consenso_privacy: consensoPrivacy,
  };
  const erroriClient: ErroriClasse = tentativi > 0 ? erroriClasse(dati, confermata) : {};

  /** Il valore di un campo, per sapere se un errore della rotta vale ancora. */
  const valoreCampo = (c: CampoClasse): string => {
    switch (c) {
      case "giornate":
        return [...giornate].sort().join(",");
      case "istituto":
        return istituto.trim();
      case "comune":
        return comune.trim();
      case "classe":
        return classe.trim();
      case "docente_nome":
        return nome.trim();
      case "docente_cognome":
        return cognome.trim();
      case "docente_email":
        return email.trim();
      case "docente_telefono":
        return telefono.trim();
      case "studenti":
      case "accompagnatori":
        // Il totale dipende da tutti e due: un errore sull'uno si toglie cambiando l'altro.
        return `${studenti}|${accompagnatori}`;
      case "note":
        return note.trim();
      case "consenso_privacy":
        return String(consensoPrivacy);
    }
  };

  // L'errore della rotta su un campo resta finché quel campo non cambia.
  const erroreCampoServer =
    erroreServer?.campo && valoreCampo(erroreServer.campo) === erroreServer.valore ? erroreServer : null;
  const errori: ErroriClasse = {
    ...(erroreCampoServer?.campo ? { [erroreCampoServer.campo]: erroreCampoServer.messaggio } : {}),
    ...erroriClient,
  };
  const erroreGenerale = erroreServer && !erroreServer.campo ? erroreServer.messaggio : null;
  const elencoErrori = CAMPI_CLASSE.filter((c) => errori[c]);
  const mostraRiepilogo = tentativi > 0 && (elencoErrori.length > 0 || Boolean(erroreGenerale));
  const emailNonValida = Boolean(errori.docente_email) || Boolean(mostraRefuso && refuso?.impossibile);

  /* ── Focus ── */

  const elementoCampo = (c: CampoClasse): HTMLElement | null => {
    if (c === "giornate") return giorniRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)") ?? null;
    return campiRef.current[c] ?? null;
  };

  const focalizza = (c: CampoClasse) => {
    if (c === "note" && !notaAperta) {
      setNotaAperta(true);
      requestAnimationFrame(() => campiRef.current.note?.focus());
      return;
    }
    const el = elementoCampo(c);
    if (el) el.focus();
    else riepilogoRef.current?.focus();
  };

  /* ── Azioni ── */

  const alternaGiornata = (slug: SessionSlug) =>
    setGiornate((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));

  const usaSuggerimento = (indirizzo: string) => {
    setEmail(indirizzo);
    setEmailConfermata(null);
    requestAnimationFrame(() => campiRef.current.docente_email?.focus());
  };

  const confermaEmail = () => {
    setEmailConfermata(email.trim());
    requestAnimationFrame(() => campiRef.current.docente_email?.focus());
  };

  const apriNota = () => {
    setNotaAperta(true);
    requestAnimationFrame(() => campiRef.current.note?.focus());
  };

  const invia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invio) return;
    setEmailUscita(true);
    setErroreServer(null);
    setTentativi((n) => n + 1);

    const erroriOra = erroriClasse(dati, confermata);
    const primo = CAMPI_CLASSE.find((c) => erroriOra[c]);
    if (primo) {
      requestAnimationFrame(() => focalizza(primo));
      return;
    }

    const payload = {
      istituto: istituto.trim(),
      comune: comune.trim(),
      classe: classe.trim(),
      docente_nome: nome.trim(),
      docente_cognome: cognome.trim(),
      docente_email: email.trim(),
      docente_telefono: telefono.trim(),
      studenti: nStudenti,
      accompagnatori: nAccompagnatori,
      note: note.trim(),
      giornate: giornateScelte,
      consenso_privacy: true as const,
      ...(invitoValido ? { adesione: invitoValido.codice } : {}),
      website,
      // Come nel modulo delle persone: "È giusto così" su un indirizzo sospetto.
      email_confermata: confermata,
    };

    setInvio(true);
    const controllo = new AbortController();
    const timer = window.setTimeout(() => controllo.abort(), TEMPO_MASSIMO_MS);
    try {
      const res = await fetch(ROTTA_PRENOTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controllo.signal,
      });
      const risposta = await leggiRispostaClasse(res);
      if (!risposta.ok) {
        const { campo, errore } = risposta;
        setErroreServer({ campo, messaggio: errore, valore: campo ? valoreCampo(campo) : undefined });
        requestAnimationFrame(() => (campo ? focalizza(campo) : riepilogoRef.current?.focus()));
        // Una giornata piena o chiusa nel frattempo: i posti si rileggono.
        if (campo === "giornate") caricaPosti();
        return;
      }
      setAltraClasse(false);
      setEsito({
        ...risposta.esito,
        email: payload.docente_email.toLowerCase(),
        nome: payload.docente_nome,
        classe: payload.classe,
        istituto: payload.istituto,
        studenti: payload.studenti,
        accompagnatori: payload.accompagnatori,
      });
      caricaPosti();
    } catch {
      setErroreServer({ messaggio: controllo.signal.aborted ? MESSAGGIO_TEMPO : MESSAGGIO_RETE });
      requestAnimationFrame(() => riepilogoRef.current?.focus());
    } finally {
      window.clearTimeout(timer);
      setInvio(false);
    }
  };

  /**
   * "Prenota un'altra classe": restano la scuola, i dati del docente e le
   * giornate, che per la classe accanto sono quasi sempre gli stessi. Via la
   * classe, i numeri, la nota e il consenso, che vale per ogni prenotazione.
   */
  const nuovaClasse = () => {
    setClasse("");
    setStudenti("");
    setAccompagnatori("");
    setNote("");
    setNotaAperta(false);
    setConsensoPrivacy(false);
    setErroreServer(null);
    setTentativi(0);
    setAltraClasse(true);
    setEsito(null);
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: "start", behavior: comportamentoScroll() });
      campiRef.current.classe?.focus({ preventScroll: true });
    });
  };

  /**
   * La classe era già prenotata ma l'email non è partita: si torna al
   * modulo così com'era, per inviarlo di nuovo con un tocco. La rotta
   * ritrova la stessa prenotazione e riprova l'email; non crea doppioni.
   */
  const riprova = () => {
    setErroreServer(null);
    setTentativi(0);
    setAltraClasse(false);
    setEsito(null);
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: "start", behavior: comportamentoScroll() });
      inviaRef.current?.focus({ preventScroll: true });
    });
  };

  /* ── Markup ── */

  const oltre = totale > MAX_PERSONE_CLASSE;
  const numeriScritti = studenti.trim() !== "" || accompagnatori.trim() !== "";
  const tuttoConcluso = concluse.length === SESSIONS.length;

  return (
    <div className="vpl-wrap">
      <style>{STILE_MODULO}</style>
      <style>{STILE_MODULO_CLASSI}</style>

      <div ref={cardRef} className="card vpl-card">
        {esito ? (
          <PrenotazioneConfermata dati={esito} onAltraClasse={nuovaClasse} onRiprova={riprova} />
        ) : (
          <form
            onSubmit={invia}
            noValidate
            className="vpl-form"
            aria-label="Prenotazione per la classe"
            aria-busy={invio || undefined}
          >
            {/* Honeypot: invisibile agli umani, riempito dai bot. */}
            <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
              <label htmlFor="vpc-website">Sito web</label>
              <input
                id="vpc-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="vpl-intro">
              <span className="icon-circle icon-circle-primary" aria-hidden="true">
                <i className="fas fa-school" />
              </span>
              <p style={{ margin: 0 }}>
                <span className="vpl-intro-titolo">Prenotazione gratuita per la classe</span>
              </p>
            </div>

            {altraClasse && (
              <p className="vpl-avviso-nuova">
                <i className="fas fa-plus" aria-hidden="true" />
                <span>
                  Nuova prenotazione. Abbiamo tenuto le giornate, la scuola e i tuoi dati: scrivi la classe, quante
                  persone vengono e spunta di nuovo la presa visione dell&apos;informativa.
                </span>
              </p>
            )}

            {/* ── Quali giornate? ── */}
            <fieldset
              className="vpl-fieldset"
              aria-describedby={ids("vpc-giorni-aiuto", errori.giornate && "vpc-giorni-errore")}
            >
              <legend className="vpl-legend">Quali giornate?</legend>
              <p id="vpc-giorni-aiuto" className="vpl-aiuto">
                {tuttoConcluso
                  ? "Le giornate si sono concluse: le prenotazioni sono chiuse."
                  : concluse.length > 0
                    ? "Puoi scegliere solo le giornate non ancora concluse. Per ogni giornata la classe è tutta confermata o tutta in lista d'attesa."
                    : "Una o tutte e due. Per ogni giornata la classe è tutta confermata o tutta in lista d'attesa: non si divide mai."}
              </p>
              <div ref={giorniRef} className="vpl-giorni">
                {SESSIONS.map((s) => {
                  const conclusa = concluse.includes(s.slug);
                  const scelto = !conclusa && giornate.includes(s.slug);
                  const stato = conclusa ? null : statoPostiClasse(posti[s.slug], oltre ? 0 : totale);
                  const base = `vpc-g-${s.slug}`;
                  return (
                    <label
                      key={s.slug}
                      className="vpl-giorno"
                      data-scelto={scelto}
                      data-conclusa={conclusa || undefined}
                      data-errore={!conclusa && Boolean(errori.giornate)}
                    >
                      <input
                        type="checkbox"
                        className="vpl-check"
                        name="giornate"
                        value={s.slug}
                        checked={scelto}
                        disabled={conclusa}
                        onChange={() => alternaGiornata(s.slug)}
                        aria-labelledby={`${base}-data`}
                        aria-describedby={ids(`${base}-dettagli`, errori.giornate && "vpc-giorni-errore")}
                        aria-invalid={!conclusa && errori.giornate ? true : undefined}
                      />
                      <span className="vpl-giorno-corpo">
                        <span id={`${base}-data`} className="vpl-giorno-data">
                          {s.giornoLabel}
                        </span>
                        <span id={`${base}-dettagli`} className="vpl-giorno-dettagli">
                          <span className="vpl-giorno-titolo">
                            {s.titolo}
                            <span className="sr-only">.</span>
                          </span>
                          <span className="vpl-giorno-meta">
                            <span>
                              <i className="fas fa-location-dot" aria-hidden="true" />
                              {s.luogoBreve}
                              <span className="sr-only">,</span>
                            </span>
                            <span>
                              <i className="far fa-clock" aria-hidden="true" />
                              {s.orario}
                              <span className="sr-only">.</span>
                            </span>
                          </span>
                          <span
                            className="vpl-posti"
                            data-tipo={conclusa ? "conclusa" : stato?.tipo === "attesa" ? "completo" : stato?.tipo}
                          >
                            {conclusa ? (
                              <>
                                <i className="fas fa-flag-checkered" aria-hidden="true" />
                                <span>Conclusa</span>
                              </>
                            ) : (
                              stato && (
                                <>
                                  <i className={`fas ${stato.icona}`} aria-hidden="true" />
                                  <span>{stato.testo}</span>
                                </>
                              )
                            )}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errori.giornate && (
                <div style={{ marginTop: 10 }}>
                  <ErroreCampo id="vpc-giorni-errore">{errori.giornate}</ErroreCampo>
                </div>
              )}
            </fieldset>

            {/* ── La scuola e la classe ── */}
            <fieldset className="vpl-fieldset">
              <legend className="vpl-legend">La scuola e la classe</legend>
              <div className="vpl-gruppo" style={{ marginTop: 14 }}>
                <div className="vpl-campo">
                  <label htmlFor="vpc-istituto" className="vpl-label">
                    Scuola
                  </label>
                  <p id="vpc-istituto-aiuto" className="vpl-aiuto">
                    Il nome completo dell&apos;istituto.
                  </p>
                  <input
                    ref={registra("istituto")}
                    id="vpc-istituto"
                    name="istituto"
                    type="text"
                    className="vpl-input"
                    autoComplete="organization"
                    enterKeyHint="next"
                    maxLength={LUNGHEZZE_CLASSE.istituto}
                    required
                    value={istituto}
                    onChange={(e) => setIstituto(e.target.value)}
                    onKeyDown={avanti}
                    aria-invalid={errori.istituto ? true : undefined}
                    aria-describedby={ids(
                      "vpc-istituto-aiuto",
                      invitoValido && "vpc-istituto-invito",
                      invitoNonValido && !invitoValido && "vpc-istituto-invito-ko",
                      errori.istituto && "vpc-istituto-errore",
                    )}
                  />
                  {invitoValido && (
                    <p id="vpc-istituto-invito" className="vpc-invito-ok">
                      <i className="fas fa-circle-check" aria-hidden="true" />
                      <span>Compilata dal link dell&apos;invito del percorso per le scuole.</span>
                    </p>
                  )}
                  {invitoNonValido && !invitoValido && (
                    <p id="vpc-istituto-invito-ko" className="vpl-aiuto">
                      Il link dell&apos;invito non è completo o non è più valido: scrivi tu il nome della scuola.
                    </p>
                  )}
                  {errori.istituto && <ErroreCampo id="vpc-istituto-errore">{errori.istituto}</ErroreCampo>}
                </div>

                <div className="vpl-griglia2">
                  <div className="vpl-campo">
                    <label htmlFor="vpc-comune" className="vpl-label">
                      Comune <span className="vpl-opz">(facoltativo)</span>
                    </label>
                    <input
                      ref={registra("comune")}
                      id="vpc-comune"
                      name="comune"
                      type="text"
                      className="vpl-input"
                      autoComplete="address-level2"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      maxLength={LUNGHEZZE_CLASSE.comune}
                      value={comune}
                      onChange={(e) => setComune(e.target.value)}
                      onKeyDown={avanti}
                      aria-invalid={errori.comune ? true : undefined}
                      aria-describedby={errori.comune ? "vpc-comune-errore" : undefined}
                    />
                    {errori.comune && <ErroreCampo id="vpc-comune-errore">{errori.comune}</ErroreCampo>}
                  </div>
                  <div className="vpl-campo">
                    <label htmlFor="vpc-classe" className="vpl-label">
                      Classe
                    </label>
                    <input
                      ref={registra("classe")}
                      id="vpc-classe"
                      name="classe"
                      type="text"
                      className="vpl-input"
                      autoComplete="off"
                      autoCapitalize="characters"
                      enterKeyHint="next"
                      maxLength={LUNGHEZZE_CLASSE.classe}
                      placeholder="Es. 4B"
                      required
                      value={classe}
                      onChange={(e) => setClasse(e.target.value)}
                      onKeyDown={avanti}
                      aria-invalid={errori.classe ? true : undefined}
                      aria-describedby={errori.classe ? "vpc-classe-errore" : undefined}
                    />
                    {errori.classe && <ErroreCampo id="vpc-classe-errore">{errori.classe}</ErroreCampo>}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ── Quante persone ── */}
            <fieldset className="vpl-fieldset" aria-describedby="vpc-persone-aiuto vpc-totale">
              <legend className="vpl-legend">Quante persone vengono?</legend>
              <p id="vpc-persone-aiuto" className="vpl-aiuto">
                Fino a {MAX_PERSONE_CLASSE} in tutto, docenti compresi. Ci servono solo i numeri, nessun dato degli
                studenti.
              </p>
              <div className="vpc-numeri">
                <Contatore
                  id="vpc-studenti"
                  etichetta="Studenti"
                  aiuto="Quanti studenti della classe vengono."
                  valore={studenti}
                  onValore={setStudenti}
                  min={1}
                  max={MAX_STUDENTI}
                  unoInMeno="Uno studente in meno"
                  unoInPiu="Uno studente in più"
                  errore={errori.studenti}
                  inputRef={registra("studenti")}
                />
                <Contatore
                  id="vpc-accompagnatori"
                  etichetta="Docenti accompagnatori"
                  aiuto={`Contando anche te, al massimo ${MAX_ACCOMPAGNATORI}.`}
                  valore={accompagnatori}
                  onValore={setAccompagnatori}
                  min={MIN_ACCOMPAGNATORI}
                  max={MAX_ACCOMPAGNATORI}
                  unoInMeno="Un docente in meno"
                  unoInPiu="Un docente in più"
                  errore={errori.accompagnatori}
                  inputRef={registra("accompagnatori")}
                />
              </div>
              <p id="vpc-totale" className="vpc-totale" data-tipo={oltre ? "oltre" : undefined} aria-live="polite">
                <i className={`fas ${oltre ? "fa-circle-exclamation" : "fa-people-group"}`} aria-hidden="true" />
                <span>
                  {!numeriScritti
                    ? `In tutto, al massimo ${MAX_PERSONE_CLASSE} persone.`
                    : oltre
                      ? `In tutto ${persone(totale)}: il massimo è ${MAX_PERSONE_CLASSE} per prenotazione. Per più classi fai una prenotazione per ciascuna.`
                      : `In tutto ${persone(totale)}, su ${MAX_PERSONE_CLASSE} al massimo.`}
                </span>
              </p>
            </fieldset>

            {/* ── Chi prenota ── */}
            <fieldset className="vpl-fieldset" aria-describedby="vpc-docente-aiuto">
              <legend className="vpl-legend">Chi prenota</legend>
              <p id="vpc-docente-aiuto" className="vpl-aiuto">
                Chi prenota fa da riferimento per la classe: riceve il QR e lo mostra all&apos;ingresso.
              </p>
              <div className="vpl-gruppo" style={{ marginTop: 14 }}>
                <div className="vpl-griglia2">
                  <div className="vpl-campo">
                    <label htmlFor="vpc-nome" className="vpl-label">
                      Nome
                    </label>
                    <input
                      ref={registra("docente_nome")}
                      id="vpc-nome"
                      name="docente_nome"
                      type="text"
                      className="vpl-input"
                      autoComplete="given-name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      maxLength={LUNGHEZZE_CLASSE.docente_nome}
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      onKeyDown={avanti}
                      aria-invalid={errori.docente_nome ? true : undefined}
                      aria-describedby={errori.docente_nome ? "vpc-nome-errore" : undefined}
                    />
                    {errori.docente_nome && <ErroreCampo id="vpc-nome-errore">{errori.docente_nome}</ErroreCampo>}
                  </div>
                  <div className="vpl-campo">
                    <label htmlFor="vpc-cognome" className="vpl-label">
                      Cognome
                    </label>
                    <input
                      ref={registra("docente_cognome")}
                      id="vpc-cognome"
                      name="docente_cognome"
                      type="text"
                      className="vpl-input"
                      autoComplete="family-name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      maxLength={LUNGHEZZE_CLASSE.docente_cognome}
                      required
                      value={cognome}
                      onChange={(e) => setCognome(e.target.value)}
                      onKeyDown={avanti}
                      aria-invalid={errori.docente_cognome ? true : undefined}
                      aria-describedby={errori.docente_cognome ? "vpc-cognome-errore" : undefined}
                    />
                    {errori.docente_cognome && (
                      <ErroreCampo id="vpc-cognome-errore">{errori.docente_cognome}</ErroreCampo>
                    )}
                  </div>
                </div>

                <div className="vpl-campo">
                  <label htmlFor="vpc-email" className="vpl-label">
                    Email
                  </label>
                  <p id="vpc-email-aiuto" className="vpl-aiuto">
                    Ti mandiamo qui il QR della classe e il link per gestire la prenotazione.
                  </p>
                  <input
                    ref={registra("docente_email")}
                    id="vpc-email"
                    name="docente_email"
                    type="email"
                    inputMode="email"
                    className="vpl-input"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    maxLength={LUNGHEZZE_CLASSE.docente_email}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailUscita(true)}
                    onKeyDown={avanti}
                    aria-invalid={emailNonValida || undefined}
                    aria-describedby={ids(
                      "vpc-email-aiuto",
                      mostraRefuso ? "vpc-email-refuso" : errori.docente_email && "vpc-email-errore",
                    )}
                  />
                  {/* Un refuso nel dominio non si nota scrivendo, e l'email
                      con il QR non arriverebbe mai. */}
                  {mostraRefuso && refuso ? (
                    <div
                      id="vpc-email-refuso"
                      className="vpl-refuso"
                      data-tipo={refuso.impossibile || errori.docente_email ? "errore" : "avviso"}
                      role="status"
                    >
                      <p style={{ margin: 0 }}>
                        {refuso.impossibile ? (
                          refuso.suggerimento ? (
                            <>
                              L&apos;indirizzo finisce con «{refuso.dominio}», che non esiste: forse intendevi{" "}
                              <strong>{refuso.suggerimento}</strong>?
                            </>
                          ) : (
                            <>
                              L&apos;indirizzo finisce con «{refuso.dominio}», che non esiste. Correggilo per ricevere il
                              QR della classe.
                            </>
                          )
                        ) : (
                          <>
                            Controlla l&apos;indirizzo: forse intendevi <strong>{refuso.suggerimento}</strong>?
                          </>
                        )}
                      </p>
                      <div className="vpl-refuso-azioni">
                        {refuso.suggerimento && (
                          <button
                            type="button"
                            className="vpl-mini-btn"
                            onClick={() => usaSuggerimento(refuso.suggerimento!)}
                          >
                            <i className="fas fa-check" aria-hidden="true" />{" "}
                            Usa {refuso.suggerimento}
                          </button>
                        )}
                        {!refuso.impossibile && (
                          <button type="button" className="vpl-mini-btn vpl-mini-btn-neutro" onClick={confermaEmail}>
                            È giusto così
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    errori.docente_email && <ErroreCampo id="vpc-email-errore">{errori.docente_email}</ErroreCampo>
                  )}
                </div>

                <div className="vpl-campo">
                  <label htmlFor="vpc-telefono" className="vpl-label">
                    Telefono
                  </label>
                  <p id="vpc-telefono-aiuto" className="vpl-aiuto">
                    Un numero a cui raggiungerti il giorno dell&apos;evento, solo se serve.
                  </p>
                  <input
                    ref={registra("docente_telefono")}
                    id="vpc-telefono"
                    name="docente_telefono"
                    type="tel"
                    inputMode="tel"
                    className="vpl-input"
                    autoComplete="tel"
                    enterKeyHint="next"
                    maxLength={LUNGHEZZE_CLASSE.docente_telefono}
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    onKeyDown={avanti}
                    aria-invalid={errori.docente_telefono ? true : undefined}
                    aria-describedby={ids(
                      "vpc-telefono-aiuto",
                      errori.docente_telefono && "vpc-telefono-errore",
                    )}
                  />
                  {errori.docente_telefono && (
                    <ErroreCampo id="vpc-telefono-errore">{errori.docente_telefono}</ErroreCampo>
                  )}
                </div>
              </div>
            </fieldset>

            {/* ── Nota ── */}
            {notaAperta ? (
              <div className="vpl-campo">
                <label htmlFor="vpc-note" className="vpl-label">
                  Nota <span className="vpl-opz">(facoltativo)</span>
                </label>
                <p id="vpc-note-aiuto" className="vpl-aiuto">
                  Per esempio un&apos;esigenza di accessibilità. Non scrivere nomi o altri dati degli studenti.
                </p>
                <textarea
                  ref={registra("note")}
                  id="vpc-note"
                  name="note"
                  className="vpl-input"
                  rows={3}
                  maxLength={LUNGHEZZE_CLASSE.note}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-invalid={errori.note ? true : undefined}
                  aria-describedby={ids("vpc-note-aiuto", errori.note && "vpc-note-errore")}
                />
                {errori.note && <ErroreCampo id="vpc-note-errore">{errori.note}</ErroreCampo>}
              </div>
            ) : (
              <button type="button" className="vpl-link-btn" onClick={apriNota}>
                <i className="fas fa-plus" aria-hidden="true" />{" "}
                Aggiungi una nota (facoltativo)
              </button>
            )}

            {/* ── Consenso ── */}
            <div className="vpl-consensi">
              <label className="vpl-consenso">
                <input
                  ref={registra("consenso_privacy")}
                  type="checkbox"
                  className="vpl-check"
                  name="consenso_privacy"
                  checked={consensoPrivacy}
                  onChange={(e) => setConsensoPrivacy(e.target.checked)}
                  required
                  aria-invalid={errori.consenso_privacy ? true : undefined}
                  aria-describedby={errori.consenso_privacy ? "vpc-privacy-errore" : undefined}
                />
                <span>
                  <TestoConsensoPrivacy />
                </span>
              </label>
              {errori.consenso_privacy && (
                <ErroreCampo id="vpc-privacy-errore">{errori.consenso_privacy}</ErroreCampo>
              )}
            </div>

            {/* ── Invio ── */}
            <div className="vpl-invio">
              <div role="alert" className="vpl-riepilogo-slot">
                {mostraRiepilogo && (
                  <div key={tentativi} ref={riepilogoRef} tabIndex={-1} className="vpl-riepilogo">
                    <p className="vpl-riepilogo-titolo">
                      <i className="fas fa-circle-exclamation" aria-hidden="true" />
                      {elencoErrori.length > 0 ? "Prima di inviare, completa questi punti:" : "La prenotazione non è partita"}
                    </p>
                    <ul>
                      {elencoErrori.map((c) => (
                        <li key={c}>
                          <button type="button" onClick={() => focalizza(c)}>
                            {errori[c]}
                          </button>
                        </li>
                      ))}
                      {erroreGenerale && (
                        <li>
                          <p>{erroreGenerale}</p>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {giornateScelte.length > 0 && (
                <p className="vpl-scelte">
                  <i className="fas fa-calendar-check" aria-hidden="true" />
                  <span>
                    {classe.trim() ? `Prenoti per la ${laClasse(classe)}` : "Prenoti"}{" "}
                    {giornateConArticolo(giornateScelte)}
                    {numeriScritti && !oltre && totale > 0 ? `: ${persone(totale)}.` : "."}
                  </span>
                </p>
              )}

              <button
                ref={inviaRef}
                type="submit"
                className="btn-primary vpl-invia"
                disabled={invio}
                aria-busy={invio || undefined}
              >
                {invio ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />{" "}
                    Invio in corso…
                  </>
                ) : (
                  <>
                    Prenota per la classe{" "}
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="sr-only" aria-live="polite">
                {invio ? "Invio della prenotazione in corso." : ""}
              </p>

              <p className="vpl-piede">
                Ti mandiamo per email il QR della classe e il link per cambiare i numeri o annullare una giornata.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
